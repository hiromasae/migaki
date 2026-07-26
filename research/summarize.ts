/**
 * Weekly summarizer for the migaki taste layer.
 *
 * Reads the week's daily cache files, collapses the findings into one cluster
 * per distinct pattern, and classifies each cluster against the taste files as
 * new, already covered, or a sharpening of an existing entry. The result is
 * written to `research/cache/summary-YYYY-MM-DD.json` for `diff.ts` to shape
 * into proposals.
 *
 * This step reads `taste/` and never writes to it. Its only output is the
 * summary file in the research cache.
 *
 *   ANTHROPIC_API_KEY    required
 *   MIGAKI_ROOT          optional — repo root override
 *   MIGAKI_RUN_DATE      optional — YYYY-MM-DD, the last day of the window
 *   MIGAKI_WINDOW_DAYS   optional — days in the window, default 7
 */

import { mkdir, rename, writeFile } from "node:fs/promises";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  LANES,
  assertWritableTarget,
  cacheDir,
  describeError as describeBaseError,
  describeSchemaError,
  loadDay,
  loadTasteFiles,
  normalizeName,
  readPositiveIntEnv,
  renderTasteEntry,
  resolveRepoRoot,
  resolveRunDate,
  summaryPath,
  weeklySummarySchema,
  windowDates,
  SUMMARY_KIND,
  SUMMARY_VERSION,
} from "./shared.js";
import type {
  DailyFile,
  EdgeCluster,
  EdgeFinding,
  Lane,
  Level,
  SlopCluster,
  SlopFinding,
  Source,
  TasteFile,
  WeeklySummary,
} from "./shared.js";

const MODEL = "claude-opus-5";

/**
 * This runs once a week over a bounded amount of text, so the ceilings are set
 * to not be the binding constraint on a judgement call that matters.
 */
const EFFORT = "high" as const;
const MAX_TOKENS = 32000;
const MAX_TURNS = 3;

/** Sources carried onto a proposal, per cluster. Enough to check the claim. */
const MAX_SOURCES_PER_CLUSTER = 8;

const LEVEL_RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };

const describeError = (error: unknown): string => {
  if (error instanceof APIError) {
    return `Anthropic API error (${error.status ?? "unknown status"}): ${error.message}`;
  }
  return describeBaseError(error);
};

/** `z.toJSONSchema` emits a `$schema` key the Messages API has no use for. */
const toToolSchema = (schema: z.ZodType): Record<string, unknown> => {
  const generated: Record<string, unknown> = z.toJSONSchema(schema);
  const { $schema: _ignored, ...rest } = generated;
  return rest;
};

/* -------------------------------------------------------------------------- */
/* Local pre-pass                                                              */
/* -------------------------------------------------------------------------- */

type Finding = SlopFinding | EdgeFinding;

type Record_<F extends Finding> = {
  readonly id: string;
  readonly date: string;
  readonly finding: F;
};

/**
 * A group of findings that restate the same pattern under the same name. This
 * is the free half of deduplication; everything subtler goes to the model.
 */
type PreCluster<F extends Finding> = {
  readonly id: string;
  readonly records: readonly Record_<F>[];
};

const preCluster = <F extends Finding>(records: readonly Record_<F>[]): PreCluster<F>[] => {
  const groups = new Map<string, Record_<F>[]>();
  for (const record of records) {
    const key = normalizeName(record.finding.pattern);
    const existing = groups.get(key);
    if (existing === undefined) groups.set(key, [record]);
    else existing.push(record);
  }
  return [...groups.values()].flatMap((group) => {
    const first = group[0];
    return first === undefined ? [] : [{ id: first.id, records: group }];
  });
};

const levelOf = (finding: Finding): Level =>
  "confidence" in finding ? finding.confidence : finding.retirement_risk;

const strongestLevel = (records: readonly Record_<Finding>[]): Level =>
  records.reduce<Level>((best, record) => {
    const level = levelOf(record.finding);
    return LEVEL_RANK[level] > LEVEL_RANK[best] ? level : best;
  }, "low");

/**
 * The freshest description of the pattern. Symmetric across lanes so a cluster's
 * prose is never chosen by a different rule depending on which file it lands in.
 */
const representativeOf = <F extends Finding>(records: readonly Record_<F>[]): Record_<F> => {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const first = sorted[0];
  if (first === undefined) throw new Error("cluster has no members");
  return first;
};

const mergeSources = (records: readonly Record_<Finding>[]): Source[] => {
  const seen = new Set<string>();
  const merged: Source[] = [];
  for (const record of records) {
    for (const source of record.finding.sources) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      merged.push(source);
      if (merged.length >= MAX_SOURCES_PER_CLUSTER) return merged;
    }
  }
  return merged;
};

/* -------------------------------------------------------------------------- */
/* Clustering call                                                             */
/* -------------------------------------------------------------------------- */

const slopClusterOutput = z.object({
  canonical_name: z
    .string()
    .describe("Short noun phrase naming the pattern, in the style of an existing slop.md entry."),
  member_ids: z
    .array(z.string())
    .describe("Every finding id belonging to this cluster. Each id appears in exactly one cluster."),
  coverage: z
    .enum(["new", "covered", "sharpens"])
    .describe(
      "`covered` if an existing slop.md entry already says this. `sharpens` if an entry covers it but this week adds a materially new specific. `new` only if no entry covers it.",
    ),
  matched_entry: z
    .string()
    .describe("Exact name of the matched slop.md entry for `covered` or `sharpens`. Empty for `new`."),
  rationale: z
    .string()
    .describe("One or two sentences justifying the coverage call. Name what is or is not already said."),
  retires_edge_entry: z
    .string()
    .describe(
      "Exact name of an edge.md entry this week's evidence contradicts — the pattern has crossed from excellent to generated. Empty when none. Be conservative.",
    ),
  confirms_retirement_watch: z
    .string()
    .describe(
      "Exact leading label of a Retirement Watch line this confirms has crossed over. Empty when none.",
    ),
  retirement_note: z
    .string()
    .describe(
      "One sentence for the Retirement Watch or slop.md line, only when `retires_edge_entry` or `confirms_retirement_watch` is set. Otherwise empty.",
    ),
});

const edgeClusterOutput = z.object({
  canonical_name: z
    .string()
    .describe("Short noun phrase naming the pattern, in the style of an existing edge.md entry."),
  member_ids: z
    .array(z.string())
    .describe("Every finding id belonging to this cluster. Each id appears in exactly one cluster."),
  coverage: z
    .enum(["new", "covered", "sharpens"])
    .describe(
      "`covered` if an existing edge.md entry already says this. `sharpens` if an entry covers it but this week adds a materially new specific. `new` only if no entry covers it.",
    ),
  matched_entry: z
    .string()
    .describe("Exact name of the matched edge.md entry for `covered` or `sharpens`. Empty for `new`."),
  rationale: z
    .string()
    .describe(
      "One or two sentences justifying the coverage call. Note here if the pattern is already listed in slop.md or on Retirement Watch, which would be a contradiction worth a human deciding.",
    ),
  retirement_note: z
    .string()
    .describe(
      "One sentence for a Retirement Watch line, only when the cluster's retirement risk is high. Otherwise empty.",
    ),
});

const slopReportSchema = z.object({ clusters: z.array(slopClusterOutput) });
const edgeReportSchema = z.object({ clusters: z.array(edgeClusterOutput) });

type ModelCluster = {
  readonly canonical_name: string;
  readonly member_ids: readonly string[];
  readonly coverage: "new" | "covered" | "sharpens";
  readonly matched_entry: string;
  readonly rationale: string;
  readonly retirement_note: string;
  readonly retires_edge_entry?: string;
  readonly confirms_retirement_watch?: string;
};

const SYSTEM_PROMPT = [
  "You maintain the taste layer for migaki, an open source project that keeps AI coding agents from",
  "producing median UI. A daily research pass has run all week. Your job is the weekly consolidation:",
  "decide which findings are the same pattern restated, and which of those patterns the taste files",
  "already cover.",
  "",
  "You are not writing taste file entries and you are not editing anything. You are classifying.",
  "",
  "Rules:",
  "- Cluster by pattern identity, not by wording. Two findings naming the same underlying pattern",
  "  belong together even if the names share no words. Two findings that merely sit in the same",
  "  category are not the same pattern.",
  "- Every finding id you are given must appear in exactly one cluster. Do not invent ids.",
  "- Judge coverage against what the existing entry actually says, not against its title. An entry",
  "  whose name sounds related but whose body describes something else does not cover the finding.",
  "- `sharpens` is for a real addition to an existing entry — a newly named construct, a newly",
  "  identified failure mode, a scope the entry does not currently reach. Not a rephrasing.",
  "- Be conservative about `new`. The cost of a false `new` is a duplicate entry in a file whose",
  "  whole value is that every line earns its place.",
  "- Be conservative about retirement. Retiring an entry is a claim that a pattern has crossed from",
  "  considered to generated, and it needs this week's evidence to actually say so.",
  "- Call `report_clusters` exactly once. Do not write a prose summary.",
].join("\n");

const renderEntries = (file: TasteFile, withBodies: boolean): string => {
  const lines = file.entries.map((entry) =>
    withBodies
      ? `### [${entry.section}] ${renderTasteEntry(entry)}`
      : `- [${entry.section}] ${entry.name}`,
  );
  return lines.length === 0 ? "(none)" : lines.join("\n\n");
};

const renderWatch = (file: TasteFile): string =>
  file.retirementWatch.length === 0
    ? "(none)"
    : file.retirementWatch.map((item) => `- ${item.text}`).join("\n");

const renderSlopPreClusters = (clusters: readonly PreCluster<SlopFinding>[]): string =>
  clusters
    .map((cluster) => {
      const representative = representativeOf(cluster.records).finding;
      const dates = [...new Set(cluster.records.map((record) => record.date))].sort();
      return [
        `[${cluster.id}] ${representative.pattern}`,
        `  category: ${representative.category}`,
        `  seen on: ${dates.join(", ")} (${dates.length} day${dates.length === 1 ? "" : "s"})`,
        `  strongest confidence: ${strongestLevel(cluster.records)}`,
        `  what it is: ${representative.what_it_is}`,
        `  why it reads as slop: ${representative.why_it_reads_as_slop}`,
        `  what to do instead: ${representative.what_to_do_instead}`,
      ].join("\n");
    })
    .join("\n\n");

const renderEdgePreClusters = (clusters: readonly PreCluster<EdgeFinding>[]): string =>
  clusters
    .map((cluster) => {
      const representative = representativeOf(cluster.records).finding;
      const dates = [...new Set(cluster.records.map((record) => record.date))].sort();
      return [
        `[${cluster.id}] ${representative.pattern}`,
        `  category: ${representative.category}`,
        `  seen on: ${dates.join(", ")} (${dates.length} day${dates.length === 1 ? "" : "s"})`,
        `  highest retirement risk: ${strongestLevel(cluster.records)}`,
        `  looks like: ${representative.looks_like}`,
        `  why it works: ${representative.why_it_works}`,
        `  execute it well: ${representative.execute_it_well}`,
      ].join("\n");
    })
    .join("\n\n");

const buildPrompt = (
  lane: Lane,
  preClusters: string,
  taste: { slop: TasteFile; edge: TasteFile },
): string => {
  if (lane === "slop") {
    return [
      "## This week's slop findings",
      "",
      "Findings that share a name have already been collapsed. Ids are the finding's date and index.",
      "",
      preClusters,
      "",
      "## Current taste/slop.md entries",
      "",
      renderEntries(taste.slop, true),
      "",
      "## Current taste/edge.md entries",
      "",
      "Check whether any finding above contradicts one of these — that is a retirement candidate.",
      "",
      renderEntries(taste.edge, true),
      "",
      "## Current edge.md Retirement Watch",
      "",
      "A finding that confirms one of these has crossed over should say so.",
      "",
      renderWatch(taste.edge),
    ].join("\n");
  }

  return [
    "## This week's edge findings",
    "",
    "Findings that share a name have already been collapsed. Ids are the finding's date and index.",
    "",
    preClusters,
    "",
    "## Current taste/edge.md entries",
    "",
    renderEntries(taste.edge, true),
    "",
    "## Current edge.md Retirement Watch",
    "",
    renderWatch(taste.edge),
    "",
    "## Current taste/slop.md entry names",
    "",
    "A finding matching one of these is a contradiction — say so in the rationale rather than",
    "silently proposing it as excellent.",
    "",
    renderEntries(taste.slop, false),
  ].join("\n");
};

type ClusterOutcome =
  | { readonly ok: true; readonly clusters: readonly ModelCluster[] }
  | { readonly ok: false; readonly error: string };

const runClustering = async (
  client: Anthropic,
  lane: Lane,
  prompt: string,
): Promise<ClusterOutcome> => {
  const reportSchema = lane === "slop" ? slopReportSchema : edgeReportSchema;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let nudged = false;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn += 1) {
      // Streamed for the same reason daily.ts streams: a high-effort request over
      // this much text can outlive a non-streaming HTTP timeout.
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: EFFORT },
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: "report_clusters",
            description: `Report the ${lane} clusters and their coverage. Call exactly once.`,
            strict: true,
            input_schema: toToolSchema(reportSchema) as Anthropic.Tool["input_schema"],
          },
        ],
        messages,
      });

      const message = await stream.finalMessage();

      if (message.stop_reason === "refusal") {
        throw new Error(`the model declined the ${lane} clustering pass`);
      }

      for (const block of message.content) {
        if (block.type === "tool_use" && block.name === "report_clusters") {
          const parsed = reportSchema.safeParse(block.input);
          if (!parsed.success) {
            throw new Error(
              `report_clusters did not match the ${lane} schema — ${describeSchemaError(parsed.error)}`,
            );
          }
          return { ok: true, clusters: parsed.data.clusters };
        }
      }

      messages.push({ role: "assistant", content: message.content });

      if (message.stop_reason === "pause_turn") continue;

      if (message.stop_reason === "max_tokens") {
        throw new Error(
          `the ${lane} clustering pass hit the ${MAX_TOKENS}-token output limit before reporting`,
        );
      }

      if (nudged) {
        throw new Error(`the ${lane} clustering pass ended without calling report_clusters`);
      }
      nudged = true;
      messages.push({ role: "user", content: "Call `report_clusters` now." });
    }

    throw new Error(`the ${lane} clustering pass did not finish within ${MAX_TURNS} turns`);
  } catch (error: unknown) {
    return { ok: false, error: describeError(error) };
  }
};

/* -------------------------------------------------------------------------- */
/* Merge                                                                       */
/* -------------------------------------------------------------------------- */

type Assignment<F extends Finding> = {
  readonly model: ModelCluster | null;
  readonly preClusters: readonly PreCluster<F>[];
};

/**
 * Maps the model's clusters back onto the pre-clusters, then sweeps up anything
 * it left out. A finding the model forgot becomes its own cluster rather than
 * disappearing — a silently dropped finding is indistinguishable from a quiet
 * week, and those need to look different in the report.
 */
const assign = <F extends Finding>(
  preClusters: readonly PreCluster<F>[],
  modelClusters: readonly ModelCluster[],
  warn: (message: string) => void,
): Assignment<F>[] => {
  const byId = new Map(preClusters.map((cluster) => [cluster.id, cluster]));
  const claimed = new Set<string>();
  const assignments: Assignment<F>[] = [];

  for (const model of modelClusters) {
    const members: PreCluster<F>[] = [];
    for (const id of model.member_ids) {
      const found = byId.get(id);
      if (found === undefined) {
        warn(`cluster "${model.canonical_name}" referenced unknown finding id ${id}`);
        continue;
      }
      if (claimed.has(id)) {
        warn(`finding ${id} was claimed by more than one cluster; kept the first`);
        continue;
      }
      claimed.add(id);
      members.push(found);
    }
    if (members.length === 0) {
      warn(`cluster "${model.canonical_name}" resolved to no findings and was dropped`);
      continue;
    }
    assignments.push({ model, preClusters: members });
  }

  for (const cluster of preClusters) {
    if (claimed.has(cluster.id)) continue;
    warn(`finding ${cluster.id} was not classified; carried through as new`);
    assignments.push({ model: null, preClusters: [cluster] });
  }

  return assignments;
};

const matchEntrySection = (file: TasteFile, name: string): string => {
  if (name === "") return "";
  const key = normalizeName(name);
  const entry = file.entries.find((candidate) => normalizeName(candidate.name) === key);
  return entry?.section ?? "";
};

const buildSlopClusters = (
  assignments: readonly Assignment<SlopFinding>[],
  taste: { slop: TasteFile; edge: TasteFile },
): SlopCluster[] =>
  assignments.map((assignment, index) => {
    const records = assignment.preClusters.flatMap((cluster) => [...cluster.records]);
    const representative = representativeOf(records).finding;
    const dates = [...new Set(records.map((record) => record.date))].sort();
    const model = assignment.model;

    return {
      lane: "slop",
      id: `slop-${index + 1}`,
      canonical_name: model?.canonical_name ?? representative.pattern,
      coverage: model?.coverage ?? "new",
      matched_entry: model?.matched_entry ?? "",
      matched_entry_section: matchEntrySection(taste.slop, model?.matched_entry ?? ""),
      rationale:
        model?.rationale ??
        "Not classified by the clustering pass. Carried through as new so it is not silently dropped; verify coverage by hand.",
      retirement_note: model?.retirement_note ?? "",
      retires_edge_entry: model?.retires_edge_entry ?? "",
      confirms_retirement_watch: model?.confirms_retirement_watch ?? "",
      member_ids: records.map((record) => record.id),
      dates,
      days_seen: dates.length,
      confidence: strongestLevel(records),
      category: representative.category,
      section_exists: taste.slop.sections.includes(representative.category),
      sources: mergeSources(records),
      representative,
    };
  });

const buildEdgeClusters = (
  assignments: readonly Assignment<EdgeFinding>[],
  taste: { slop: TasteFile; edge: TasteFile },
): EdgeCluster[] =>
  assignments.map((assignment, index) => {
    const records = assignment.preClusters.flatMap((cluster) => [...cluster.records]);
    const representative = representativeOf(records).finding;
    const dates = [...new Set(records.map((record) => record.date))].sort();
    const model = assignment.model;

    return {
      lane: "edge",
      id: `edge-${index + 1}`,
      canonical_name: model?.canonical_name ?? representative.pattern,
      coverage: model?.coverage ?? "new",
      matched_entry: model?.matched_entry ?? "",
      matched_entry_section: matchEntrySection(taste.edge, model?.matched_entry ?? ""),
      rationale:
        model?.rationale ??
        "Not classified by the clustering pass. Carried through as new so it is not silently dropped; verify coverage by hand.",
      retirement_note: model?.retirement_note ?? "",
      member_ids: records.map((record) => record.id),
      dates,
      days_seen: dates.length,
      retirement_risk: strongestLevel(records),
      category: representative.category,
      section_exists: taste.edge.sections.includes(representative.category),
      sources: mergeSources(records),
      representative,
    };
  });

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

const collect = <F extends Finding>(
  days: readonly { date: string; file: DailyFile }[],
  pick: (file: DailyFile) => readonly F[],
): Record_<F>[] =>
  days.flatMap(({ date, file }) =>
    pick(file).map((finding, index) => ({ id: `${date}#${index}`, date, finding })),
  );

const writeSummary = async (root: string, weekEnd: string, summary: WeeklySummary): Promise<string> => {
  const target = summaryPath(root, weekEnd);
  assertWritableTarget(root, target);
  await mkdir(cacheDir(root), { recursive: true });

  const temp = `${target}.tmp`;
  await writeFile(temp, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await rename(temp, target);
  return target;
};

const main = async (): Promise<number> => {
  const root = resolveRepoRoot();
  const weekEnd = resolveRunDate();
  const windowDays = readPositiveIntEnv("MIGAKI_WINDOW_DAYS", 7);
  const dates = windowDates(weekEnd, windowDays);
  const weekStart = dates[0] ?? weekEnd;

  console.error(`[migaki:summarize] window ${weekStart} to ${weekEnd} (${windowDays} days)`);

  const taste = await loadTasteFiles(root);
  const loads = await Promise.all(dates.map((date) => loadDay(root, date)));

  const present: { date: string; file: DailyFile }[] = [];
  const daysMissing: string[] = [];
  const daysUnreadable: { date: string; error: string }[] = [];
  const passErrors: { date: string; lane: Lane; error: string }[] = [];

  for (const load of loads) {
    if (load.status === "ok") {
      present.push({ date: load.date, file: load.file });
      for (const lane of LANES) {
        const error = load.file.passes[lane].error;
        if (error !== undefined && error !== "") {
          passErrors.push({ date: load.date, lane, error });
        }
      }
    } else if (load.status === "missing") {
      daysMissing.push(load.date);
    } else {
      daysUnreadable.push({ date: load.date, error: load.error });
    }
  }

  console.error(
    `[migaki:summarize] ${present.length} of ${dates.length} days present` +
      (daysMissing.length > 0 ? `, missing ${daysMissing.join(", ")}` : "") +
      (daysUnreadable.length > 0 ? `, unreadable ${daysUnreadable.length}` : ""),
  );
  for (const unreadable of daysUnreadable) {
    console.error(`[migaki:summarize] ${unreadable.date} unreadable: ${unreadable.error}`);
  }
  for (const failure of passErrors) {
    console.error(`[migaki:summarize] ${failure.date} ${failure.lane} pass failed: ${failure.error}`);
  }

  const slopRecords = collect(present, (file) => file.passes.slop.findings);
  const edgeRecords = collect(present, (file) => file.passes.edge.findings);
  const slopPre = preCluster(slopRecords);
  const edgePre = preCluster(edgeRecords);

  console.error(
    `[migaki:summarize] slop: ${slopRecords.length} findings -> ${slopPre.length} after name collapse`,
  );
  console.error(
    `[migaki:summarize] edge: ${edgeRecords.length} findings -> ${edgePre.length} after name collapse`,
  );

  const warn = (message: string): void => console.error(`[migaki:summarize] warning: ${message}`);

  // Created on first use, not up front: a window with no findings at all needs no
  // API key, and should still write an empty summary rather than fail.
  let client: Anthropic | null = null;
  const clientOnce = (): Anthropic => (client ??= getClient());

  let slopClusters: SlopCluster[] = [];
  let edgeClusters: EdgeCluster[] = [];
  let slopError = "";
  let edgeError = "";

  // Sequential, matching daily.ts: two large concurrent requests on one API key
  // is the easy way to trip a rate limit on a schedule nobody is watching.
  if (slopPre.length > 0) {
    const outcome = await runClustering(
      clientOnce(),
      "slop",
      buildPrompt("slop", renderSlopPreClusters(slopPre), taste),
    );
    if (outcome.ok) {
      slopClusters = buildSlopClusters(assign(slopPre, outcome.clusters, warn), taste);
    } else {
      slopError = outcome.error;
      console.error(`[migaki:summarize] slop clustering failed: ${outcome.error}`);
    }
  }

  if (edgePre.length > 0) {
    const outcome = await runClustering(
      clientOnce(),
      "edge",
      buildPrompt("edge", renderEdgePreClusters(edgePre), taste),
    );
    if (outcome.ok) {
      edgeClusters = buildEdgeClusters(assign(edgePre, outcome.clusters, warn), taste);
    } else {
      edgeError = outcome.error;
      console.error(`[migaki:summarize] edge clustering failed: ${outcome.error}`);
    }
  }

  const candidate = {
    kind: SUMMARY_KIND,
    version: SUMMARY_VERSION,
    week_start: weekStart,
    week_end: weekEnd,
    generated_at: new Date().toISOString(),
    model: MODEL,
    inputs: {
      window_days: windowDays,
      days_present: present.map((day) => day.date),
      days_missing: daysMissing,
      days_unreadable: daysUnreadable,
      pass_errors: passErrors,
    },
    taste: {
      slop_sections: [...taste.slop.sections],
      edge_sections: [...taste.edge.sections],
      slop_entries: taste.slop.entries.length,
      edge_entries: taste.edge.entries.length,
      retirement_watch: taste.edge.retirementWatch.map((item) => ({
        label: item.label,
        text: item.text,
      })),
    },
    lanes: {
      slop: { findings_total: slopRecords.length, error: slopError, clusters: slopClusters },
      edge: { findings_total: edgeRecords.length, error: edgeError, clusters: edgeClusters },
    },
  };

  // Self-check before writing: diff.ts validates this file on read, and a shape
  // failure is much cheaper to diagnose here than one step downstream.
  const parsed = weeklySummarySchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`built an invalid summary — ${describeSchemaError(parsed.error)}`);
  }

  const target = await writeSummary(root, weekEnd, parsed.data);
  console.error(
    `[migaki:summarize] ${slopClusters.length} slop clusters, ${edgeClusters.length} edge clusters`,
  );
  console.error(`[migaki:summarize] wrote ${target}`);

  if (present.length === 0) {
    console.error("[migaki:summarize] no daily cache files in the window");
    return 1;
  }
  if (slopError !== "" || edgeError !== "") return 1;
  return 0;
};

const getClient = (): Anthropic => {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  return new Anthropic({ apiKey });
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`[migaki:summarize] fatal: ${describeError(error)}`);
    process.exitCode = 1;
  },
);
