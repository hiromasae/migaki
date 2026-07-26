/**
 * Shared contract for the weekly research pipeline.
 *
 * `summarize.ts` writes the weekly summary and `diff.ts` reads it, so the schema
 * lives here once rather than as two copies that can drift apart. This module
 * also holds the taste-file parser both scripts use, and the write guard that
 * keeps either of them from touching `taste/`.
 *
 * `daily.ts` is deliberately not imported: it runs `main()` on import, so
 * pulling anything out of it would fire a research pass.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export type Lane = "slop" | "edge";

export const LANES = ["slop", "edge"] as const;

/* -------------------------------------------------------------------------- */
/* Paths and dates                                                             */
/* -------------------------------------------------------------------------- */

const hasTasteDir = (dir: string): boolean => existsSync(join(dir, "taste"));

/**
 * Resolves the repo root so every path is addressed from the root rather than
 * from wherever the compiled script happens to run. Mirrors `daily.ts`.
 */
export const resolveRepoRoot = (): string => {
  const override = process.env["MIGAKI_ROOT"];
  if (override !== undefined && override !== "") {
    const root = resolve(override);
    if (!hasTasteDir(root)) {
      throw new Error(`MIGAKI_ROOT is set to ${root}, but it contains no taste/ directory`);
    }
    return root;
  }

  const start = dirname(fileURLToPath(import.meta.url));
  let current = start;
  for (;;) {
    if (hasTasteDir(current)) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    `Could not locate the migaki repo root: no ancestor of ${start} contains a taste/ directory. Set MIGAKI_ROOT.`,
  );
};

/** UTC, so a run near midnight lands on the same date regardless of runner locale. */
export const resolveRunDate = (): string => {
  const override = process.env["MIGAKI_RUN_DATE"];
  if (override !== undefined && override !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      throw new Error(`MIGAKI_RUN_DATE must be YYYY-MM-DD, got ${override}`);
    }
    return override;
  }
  return new Date().toISOString().slice(0, 10);
};

export const readPositiveIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer, got ${raw}`);
  }
  return value;
};

/** The `windowDays` dates ending on `endDate` inclusive, oldest first. */
export const windowDates = (endDate: string, windowDays: number): string[] => {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(end)) throw new Error(`Not a valid date: ${endDate}`);

  const dayMs = 86_400_000;
  const dates: string[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    dates.push(new Date(end - offset * dayMs).toISOString().slice(0, 10));
  }
  return dates;
};

export const cacheDir = (root: string): string => join(root, "research", "cache");

/**
 * The load-bearing constraint of this whole step, enforced in code rather than
 * by convention: nothing in the weekly pipeline may write outside the research
 * cache. `taste/` changes go through human PR review, never through a script.
 */
export const assertWritableTarget = (root: string, target: string): void => {
  const allowed = cacheDir(root);
  const resolved = resolve(target);
  if (resolved !== allowed && !resolved.startsWith(`${allowed}${sep}`)) {
    throw new Error(
      `Refusing to write to ${resolved}: the weekly pipeline may only write inside ${allowed}.`,
    );
  }
};

export const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** `ZodError.message` is a full JSON dump; one line per bad field is enough. */
export const describeSchemaError = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");

/**
 * Collapses a pattern name to a comparison key. Used only for the free
 * pre-pass — anything subtler than an exact restatement is the model's job.
 */
export const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[`"'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* -------------------------------------------------------------------------- */
/* Daily cache files — the contract produced by daily.ts                        */
/* -------------------------------------------------------------------------- */

export const sourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;

const levelSchema = z.enum(["low", "medium", "high"]);
export type Level = z.infer<typeof levelSchema>;

/**
 * `category` is read as a free string rather than as the enum `daily.ts`
 * constrains it to. A taste-file section rename should surface as a placement
 * warning on one finding, not as a hard parse failure on the whole day.
 */
export const slopFindingSchema = z.object({
  pattern: z.string(),
  category: z.string(),
  what_it_is: z.string(),
  why_it_reads_as_slop: z.string(),
  what_to_do_instead: z.string(),
  confidence: levelSchema,
  sources: z.array(sourceSchema),
});
export type SlopFinding = z.infer<typeof slopFindingSchema>;

export const edgeFindingSchema = z.object({
  pattern: z.string(),
  category: z.string(),
  looks_like: z.string(),
  why_it_works: z.string(),
  execute_it_well: z.string(),
  retirement_risk: levelSchema,
  sources: z.array(sourceSchema),
});
export type EdgeFinding = z.infer<typeof edgeFindingSchema>;

const usageSchema = z
  .object({
    input_tokens: z.number(),
    output_tokens: z.number(),
    web_search_requests: z.number(),
  })
  .partial();

const passSchema = <T extends z.ZodType>(finding: T) =>
  z.object({
    findings: z.array(finding),
    usage: usageSchema.optional(),
    error: z.string().optional(),
  });

export const dailyFileSchema = z.object({
  date: z.string(),
  model: z.string().optional(),
  generated_at: z.string().optional(),
  passes: z.object({
    slop: passSchema(slopFindingSchema),
    edge: passSchema(edgeFindingSchema),
  }),
});
export type DailyFile = z.infer<typeof dailyFileSchema>;

export type DayLoad =
  | { readonly status: "ok"; readonly date: string; readonly file: DailyFile }
  | { readonly status: "missing"; readonly date: string }
  | { readonly status: "unreadable"; readonly date: string; readonly error: string };

export const loadDay = async (root: string, date: string): Promise<DayLoad> => {
  const path = join(cacheDir(root), `${date}.json`);
  if (!existsSync(path)) return { status: "missing", date };

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, "utf8"));
  } catch (error: unknown) {
    return { status: "unreadable", date, error: `could not parse JSON — ${describeError(error)}` };
  }

  const parsed = dailyFileSchema.safeParse(raw);
  if (parsed.success) return { status: "ok", date, file: parsed.data };

  // The single most likely cause of a shape mismatch is daily.ts moving the
  // lanes, so name it rather than leaving a bare list of Zod paths.
  const flattened =
    typeof raw === "object" && raw !== null && !("passes" in raw) && "slop" in raw
      ? "the lanes are at the top level rather than under `passes` — daily.ts and summarize.ts have diverged"
      : describeSchemaError(parsed.error);

  return { status: "unreadable", date, error: flattened };
};

/* -------------------------------------------------------------------------- */
/* Taste files — read only, always                                             */
/* -------------------------------------------------------------------------- */

export type TasteEntry = {
  readonly section: string;
  readonly name: string;
  /** `2026-07` from the `(added YYYY-MM)` suffix. Absent in slop.md. */
  readonly added: string | null;
  readonly bullets: readonly string[];
  /** 1-indexed line of the `**Name**` heading, for anchoring a proposal. */
  readonly line: number;
};

export type RetirementWatchItem = {
  /** Text before the first colon, which is how these lines are named today. */
  readonly label: string;
  readonly text: string;
  readonly line: number;
};

export type TasteFile = {
  readonly relPath: string;
  readonly sections: readonly string[];
  readonly entries: readonly TasteEntry[];
  readonly retirementWatch: readonly RetirementWatchItem[];
};

const ENTRY_HEADING = /^\*\*(.+?)\*\*(?:\s*\(added (\d{4}-\d{2})\))?\s*$/;

export const parseTasteFile = (relPath: string, text: string): TasteFile => {
  const lines = text.split("\n");
  const sections: string[] = [];
  const entries: TasteEntry[] = [];
  const retirementWatch: RetirementWatchItem[] = [];

  let section = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading !== null) {
      section = heading[1] ?? "";
      sections.push(section);
      continue;
    }

    const entry = ENTRY_HEADING.exec(line);
    if (entry !== null) {
      // Bullets run contiguously from the heading to the first non-bullet line.
      const bullets: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && (lines[cursor] ?? "").startsWith("- ")) {
        bullets.push((lines[cursor] ?? "").slice(2));
        cursor += 1;
      }
      const headingLine = index + 1;
      index = cursor - 1;

      // Both files open with bold lines in their preamble — `**Entry format:**`
      // in edge.md — that are formatting, not entries. A real entry always sits
      // under a section heading and always carries bullets.
      if (section === "" || bullets.length === 0) continue;

      entries.push({
        section,
        name: entry[1] ?? "",
        added: entry[2] ?? null,
        bullets,
        line: headingLine,
      });
      continue;
    }

    // Retirement Watch holds bare bullets with no `**Name**` heading above them,
    // so they are only reachable here, after the entry branch has passed.
    if (section === "Retirement Watch" && line.startsWith("- ")) {
      const text = line.slice(2).trim();
      const colon = text.indexOf(":");
      retirementWatch.push({
        label: colon > 0 && colon <= 90 ? text.slice(0, colon).trim() : text,
        text,
        line: index + 1,
      });
    }
  }

  return { relPath, sections, entries, retirementWatch };
};

export const loadTasteFiles = async (
  root: string,
): Promise<{ slop: TasteFile; edge: TasteFile }> => {
  const read = async (name: string): Promise<TasteFile> => {
    const relPath = `taste/${name}`;
    return parseTasteFile(relPath, await readFile(join(root, "taste", name), "utf8"));
  };
  return { slop: await read("slop.md"), edge: await read("edge.md") };
};

export const renderTasteEntry = (entry: TasteEntry): string =>
  [
    entry.added === null ? `**${entry.name}**` : `**${entry.name}** (added ${entry.added})`,
    ...entry.bullets.map((bullet) => `- ${bullet}`),
  ].join("\n");

/* -------------------------------------------------------------------------- */
/* Weekly summary — written by summarize.ts, read by diff.ts                    */
/* -------------------------------------------------------------------------- */

export const SUMMARY_KIND = "migaki-weekly-summary";
export const SUMMARY_VERSION = 1;

const coverageSchema = z.enum(["new", "covered", "sharpens"]);
export type Coverage = z.infer<typeof coverageSchema>;

/**
 * Fields carrying "no value" use an empty string rather than null, because the
 * clustering call declares its tool schema `strict` and a plain required string
 * is the shape least likely to be rejected.
 */
const clusterBase = {
  id: z.string(),
  canonical_name: z.string(),
  coverage: coverageSchema,
  /** Name of the existing taste entry this matches. Empty when `coverage` is `new`. */
  matched_entry: z.string(),
  matched_entry_section: z.string(),
  rationale: z.string(),
  /** One sentence for a Retirement Watch line, when retirement is in play. Otherwise empty. */
  retirement_note: z.string(),
  member_ids: z.array(z.string()),
  dates: z.array(z.string()),
  days_seen: z.number().int(),
  /** The category the representative finding claims. */
  category: z.string(),
  /** Whether `category` is an actual `##` heading in the target file today. */
  section_exists: z.boolean(),
  sources: z.array(sourceSchema),
};

export const slopClusterSchema = z.object({
  ...clusterBase,
  lane: z.literal("slop"),
  /** Strongest confidence across members. */
  confidence: levelSchema,
  /** An edge.md entry this week's slop evidence contradicts. Empty when none. */
  retires_edge_entry: z.string(),
  /** A Retirement Watch line this confirms as having crossed over. Empty when none. */
  confirms_retirement_watch: z.string(),
  representative: slopFindingSchema,
});
export type SlopCluster = z.infer<typeof slopClusterSchema>;

export const edgeClusterSchema = z.object({
  ...clusterBase,
  lane: z.literal("edge"),
  /** Highest risk across members — the most cautious reading. */
  retirement_risk: levelSchema,
  representative: edgeFindingSchema,
});
export type EdgeCluster = z.infer<typeof edgeClusterSchema>;

export const weeklySummarySchema = z.object({
  kind: z.literal(SUMMARY_KIND),
  version: z.literal(SUMMARY_VERSION),
  week_start: z.string(),
  week_end: z.string(),
  generated_at: z.string(),
  model: z.string(),
  inputs: z.object({
    window_days: z.number().int(),
    days_present: z.array(z.string()),
    days_missing: z.array(z.string()),
    days_unreadable: z.array(z.object({ date: z.string(), error: z.string() })),
    pass_errors: z.array(
      z.object({ date: z.string(), lane: z.enum(LANES), error: z.string() }),
    ),
  }),
  taste: z.object({
    slop_sections: z.array(z.string()),
    edge_sections: z.array(z.string()),
    slop_entries: z.number().int(),
    edge_entries: z.number().int(),
    retirement_watch: z.array(z.object({ label: z.string(), text: z.string() })),
  }),
  lanes: z.object({
    slop: z.object({
      findings_total: z.number().int(),
      error: z.string(),
      clusters: z.array(slopClusterSchema),
    }),
    edge: z.object({
      findings_total: z.number().int(),
      error: z.string(),
      clusters: z.array(edgeClusterSchema),
    }),
  }),
});
export type WeeklySummary = z.infer<typeof weeklySummarySchema>;

export const summaryPath = (root: string, weekEnd: string): string =>
  join(cacheDir(root), `summary-${weekEnd}.json`);
