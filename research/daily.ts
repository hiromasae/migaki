/**
 * Daily research pass for the migaki taste layer.
 *
 * Claude searches the open web itself — this is not a scraper and has no source
 * list. Two passes run per invocation, `slop` and `edge`, and the structured
 * result is written to `research/cache/YYYY-MM-DD.json`.
 *
 * This step only gathers. It never reads or writes `taste/`, and it opens no
 * pull request; `summarize.ts` and `diff.ts` do the diffing against the taste
 * files on a weekly cadence.
 *
 *   ANTHROPIC_API_KEY   required
 *   MIGAKI_ROOT         optional — repo root override
 *   MIGAKI_RUN_DATE     optional — YYYY-MM-DD, for reproducible re-runs
 */

import { existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = "claude-opus-5";

/**
 * Tunables. Effort and the search cap are the two cost knobs — this runs daily
 * and unattended, so both are deliberately bounded rather than left open.
 */
const EFFORT = "high" as const;
const MAX_TOKENS = 32000;
const MAX_WEB_SEARCHES = 12;
/** Turns per pass, counting `pause_turn` resumptions and the one nudge. */
const MAX_TURNS = 8;
const MIN_FINDINGS = 3;
const MAX_FINDINGS = 8;

/**
 * Section headings as they appear in the taste files today. Constraining the
 * model to these lets `diff.ts` place an entry without guessing. If a taste
 * file gains or renames a section, update the matching list here.
 */
const SLOP_CATEGORIES = [
  "Visual treatment",
  "Layout and composition",
  "Typography",
  "Iconography",
  "Motion and animation",
  "Component patterns",
  "Copy and language",
  "Structural tells",
] as const;

const EDGE_CATEGORIES = [
  "Visual Treatment",
  "Layout and Composition",
  "Typography",
  "Motion and Interaction",
  "Component Patterns",
  "Copy and Voice",
  "What Restraint Looks Like in Practice Right Now",
  "AI-Native Interfaces",
  "Data Visualization and Dense Surfaces",
] as const;

const sourceSchema = z.object({
  title: z.string().describe("Title of the page or artifact."),
  url: z.string().describe("URL you actually visited during this run."),
});

const slopFindingSchema = z.object({
  pattern: z
    .string()
    .describe("Short noun phrase naming the pattern, in the style of an existing slop.md entry."),
  category: z.enum(SLOP_CATEGORIES).describe("The slop.md section this belongs under."),
  what_it_is: z
    .string()
    .describe(
      "Concrete description of the pattern, naming the CSS, Tailwind, or framework construct where one exists.",
    ),
  why_it_reads_as_slop: z
    .string()
    .describe("Why this now reads as generated or default rather than chosen. Cite what changed."),
  what_to_do_instead: z.string().describe("The specific alternative a developer can act on."),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How well the sources support this being widespread right now."),
  sources: z.array(sourceSchema).describe("At least one source found during this run."),
});

const edgeFindingSchema = z.object({
  pattern: z
    .string()
    .describe("Short noun phrase naming the pattern, in the style of an existing edge.md entry."),
  category: z.enum(EDGE_CATEGORIES).describe("The edge.md section this belongs under."),
  looks_like: z
    .string()
    .describe("Concrete description of the implementation, naming specific constructs and values."),
  why_it_works: z
    .string()
    .describe("The perceptual or practical reason it works, grounded in how people read interfaces."),
  execute_it_well: z
    .string()
    .describe("How to do it properly, including the failure mode that makes it go wrong."),
  retirement_risk: z
    .enum(["low", "medium", "high"])
    .describe("How close this is to being imitated widely enough to become slop."),
  sources: z.array(sourceSchema).describe("At least one source found during this run."),
});

const slopReportSchema = z.object({ findings: z.array(slopFindingSchema) });
const edgeReportSchema = z.object({ findings: z.array(edgeFindingSchema) });

type PassName = "slop" | "edge";

type UsageTotals = {
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
};

/** What lands in the cache file for one pass. `error` is absent on success. */
type PassResult = {
  readonly findings: readonly unknown[];
  readonly usage: UsageTotals;
  readonly error?: string;
};

type PassOutcome =
  | { readonly ok: true; readonly findings: readonly unknown[]; readonly usage: UsageTotals }
  | { readonly ok: false; readonly error: string; readonly usage: UsageTotals };

const describeError = (error: unknown): string => {
  if (error instanceof APIError) {
    return `Anthropic API error (${error.status ?? "unknown status"}): ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
};

/** `ZodError.message` is a full JSON dump; one line per bad field is enough. */
const describeSchemaError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

/** `z.toJSONSchema` emits a `$schema` key the Messages API has no use for. */
const toToolSchema = (schema: z.ZodType): Record<string, unknown> => {
  const generated: Record<string, unknown> = z.toJSONSchema(schema);
  const { $schema: _ignored, ...rest } = generated;
  return rest;
};

const hasTasteDir = (dir: string): boolean => existsSync(join(dir, "taste"));

/**
 * Resolves the repo root so the cache is always addressed from the root rather
 * than from wherever the compiled script happens to run.
 */
const resolveRepoRoot = (): string => {
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

/** UTC so a run near midnight lands on the same date regardless of runner locale. */
const resolveRunDate = (): string => {
  const override = process.env["MIGAKI_RUN_DATE"];
  if (override !== undefined && override !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      throw new Error(`MIGAKI_RUN_DATE must be YYYY-MM-DD, got ${override}`);
    }
    return override;
  }
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
};

const getClient = (): Anthropic => {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  return new Anthropic({ apiKey });
};

const SYSTEM_PROMPT = [
  "You are a design researcher for migaki, an open source taste layer that keeps AI coding agents",
  "from producing median UI. You search the open web yourself and report what is actually shipping",
  "right now — not what design commentary says should ship.",
  "",
  "Rules:",
  "- Search before you report. Every finding must rest on something you found during this run.",
  "- Ground findings in observable evidence: shipped product interfaces, design system and framework",
  "  releases, changelogs, component library defaults, and credible practitioner discussion.",
  "- Prefer the last 30 days. Skip anything you could have written six months ago.",
  "- Be specific enough to implement. Name the CSS property, Tailwind class, or framework construct",
  "  where one exists. A finding a developer cannot act on is not a finding.",
  "- Report between " + MIN_FINDINGS + " and " + MAX_FINDINGS + " findings. Fewer well-evidenced",
  "  findings beat more weak ones. If the week was quiet, report fewer.",
  "- No speculation, no trend forecasting, no filler, no restating design fundamentals.",
  "- When you are done, call `report_findings` exactly once. Do not write a prose summary.",
].join("\n");

const buildPassPrompt = (pass: PassName, runDate: string): string => {
  const today = `Today is ${runDate}.`;

  if (pass === "slop") {
    return [
      today,
      "",
      "Research pass: SLOP.",
      "",
      "Find UI patterns that have crossed — or are visibly crossing right now — into reading as",
      "AI-generated, low-effort, or template default. A pattern qualifies when it shows up in",
      "generated output regardless of context, subject matter, or product identity, so that its",
      "presence signals nobody made a decision there.",
      "",
      "Look for:",
      "- Patterns newly absorbed into the training-data median: what LLM UI output now produces",
      "  unprompted that it did not six months ago.",
      "- Defaults newly shipped by popular starter templates, component libraries, and framework",
      "  scaffolds, which become the median shortly after.",
      "- Patterns that were fresh recently and have since been imitated past the point of signal.",
      "- Practitioner discussion identifying a specific pattern as a tell.",
      "",
      "Prioritise what is newly true. Do not report the long-established tells (indigo-to-purple",
      "gradients, glassmorphism on content surfaces, `transition-all`, three equal cards in a row)",
      "unless something specific has changed about how they appear.",
    ].join("\n");
  }

  return [
    today,
    "",
    "Research pass: EDGE.",
    "",
    "Find UI patterns that currently read as excellent, considered, and well executed — work where",
    "a decision is legible. These are patterns a good team is shipping deliberately, not patterns a",
    "generator produces by default.",
    "",
    "Look for:",
    "- Interface work shipped recently by teams with a strong execution record.",
    "- Newly practical platform and browser capabilities that enable something previously fussy,",
    "  and how careful teams are actually applying them.",
    "- Craft details that separate a considered implementation from a superficial copy of it.",
    "",
    "For each finding, set `retirement_risk` honestly: high means the pattern is already being",
    "imitated widely enough that it is heading for slop.md, and the entry will expire soon.",
  ].join("\n");
};

/**
 * Returns rather than throws so that a failed pass still reports the tokens and
 * searches it spent — a run that burned budget and produced nothing is exactly
 * the case worth seeing in the cache file.
 */
const runPass = async (
  client: Anthropic,
  pass: PassName,
  runDate: string,
): Promise<PassOutcome> => {
  const reportSchema = pass === "slop" ? slopReportSchema : edgeReportSchema;

  const usage: UsageTotals = { input_tokens: 0, output_tokens: 0, web_search_requests: 0 };

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildPassPrompt(pass, runDate) },
  ];

  let nudged = false;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn += 1) {
      // Streamed because a search-heavy pass with adaptive thinking can run for
      // minutes; a non-streaming request that long risks an HTTP timeout.
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: EFFORT },
        system: SYSTEM_PROMPT,
        tools: [
          // Dynamic filtering is built into this version — do not also declare
          // the code execution tool, which would create a second sandbox.
          { type: "web_search_20260209", name: "web_search", max_uses: MAX_WEB_SEARCHES },
          {
            name: "report_findings",
            description: `Report the findings for the ${pass} research pass. Call exactly once, when research is complete.`,
            strict: true,
            input_schema: toToolSchema(reportSchema) as Anthropic.Tool["input_schema"],
          },
        ],
        messages,
      });

      const message = await stream.finalMessage();

      usage.input_tokens += message.usage.input_tokens;
      usage.output_tokens += message.usage.output_tokens;
      usage.web_search_requests += message.usage.server_tool_use?.web_search_requests ?? 0;

      if (message.stop_reason === "refusal") {
        throw new Error(`the model declined the ${pass} pass`);
      }

      for (const block of message.content) {
        if (block.type === "tool_use" && block.name === "report_findings") {
          const parsed = reportSchema.safeParse(block.input);
          if (!parsed.success) {
            throw new Error(
              `report_findings did not match the ${pass} schema — ${describeSchemaError(parsed.error)}`,
            );
          }
          if (parsed.data.findings.length === 0) {
            throw new Error(`the ${pass} pass reported no findings`);
          }
          return { ok: true, findings: parsed.data.findings, usage };
        }
      }

      messages.push({ role: "assistant", content: message.content });

      // A server-side tool hit its iteration limit — re-send to let it continue.
      if (message.stop_reason === "pause_turn") continue;

      if (message.stop_reason === "max_tokens") {
        throw new Error(
          `the ${pass} pass hit the ${MAX_TOKENS}-token output limit before reporting`,
        );
      }

      // Ended its turn without reporting. Ask once, then give up.
      if (nudged) {
        throw new Error(`the ${pass} pass ended without calling report_findings`);
      }
      nudged = true;
      messages.push({
        role: "user",
        content: "Call `report_findings` now with what your research supports.",
      });
    }

    throw new Error(`the ${pass} pass did not finish within ${MAX_TURNS} turns`);
  } catch (error: unknown) {
    return { ok: false, error: describeError(error), usage };
  }
};

const writeCache = async (root: string, runDate: string, body: unknown): Promise<string> => {
  const cacheDir = join(root, "research", "cache");
  await mkdir(cacheDir, { recursive: true });

  const target = join(cacheDir, `${runDate}.json`);
  const temp = `${target}.tmp`;

  // Write-then-rename so a crash mid-write cannot leave a half-parsed file for
  // the weekly summarizer to trip over.
  await writeFile(temp, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  await rename(temp, target);

  return target;
};

const main = async (): Promise<number> => {
  const root = resolveRepoRoot();
  const runDate = resolveRunDate();
  const client = getClient();

  console.error(`[migaki:daily] ${runDate} — model ${MODEL}, effort ${EFFORT}`);

  const passes: Record<PassName, PassResult> = {
    slop: { findings: [], usage: { input_tokens: 0, output_tokens: 0, web_search_requests: 0 } },
    edge: { findings: [], usage: { input_tokens: 0, output_tokens: 0, web_search_requests: 0 } },
  };

  const failures: string[] = [];

  // Sequential, not parallel: two concurrent search-heavy passes on one API key
  // is the easy way to trip a rate limit on a schedule nobody is watching.
  for (const pass of ["slop", "edge"] as const) {
    const outcome = await runPass(client, pass, runDate);
    const spend = `${outcome.usage.web_search_requests} searches, ${outcome.usage.output_tokens} output tokens`;

    if (outcome.ok) {
      passes[pass] = { findings: outcome.findings, usage: outcome.usage };
      console.error(`[migaki:daily] ${pass}: ${outcome.findings.length} findings, ${spend}`);
    } else {
      passes[pass] = { findings: [], usage: outcome.usage, error: outcome.error };
      failures.push(`${pass}: ${outcome.error}`);
      console.error(`[migaki:daily] ${pass} failed after ${spend}: ${outcome.error}`);
    }
  }

  // A failed pass still writes, with `findings: []` and an `error` string, so a
  // partial run is visible to the summarizer rather than silently missing.
  const target = await writeCache(root, runDate, {
    date: runDate,
    model: MODEL,
    generated_at: new Date().toISOString(),
    passes,
  });

  console.error(`[migaki:daily] wrote ${target}`);

  if (failures.length > 0) {
    console.error(`[migaki:daily] ${failures.length} of 2 passes failed`);
    return 1;
  }
  return 0;
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`[migaki:daily] fatal: ${describeError(error)}`);
    process.exitCode = 1;
  },
);
