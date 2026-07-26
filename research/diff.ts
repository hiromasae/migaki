/**
 * Turns a weekly summary into proposed taste-layer changes.
 *
 * This script proposes. It does not apply. Every judgement call was already made
 * in `summarize.ts`; this step is deterministic shaping — it templates entry
 * markdown from the research fields, decides what clears the evidence bar, and
 * emits the result for a workflow to open a pull request from.
 *
 * `taste/` is read here and never written. `assertWritableTarget` enforces that
 * in code: the only paths this process can write to are inside the research
 * cache. The human review on the pull request is the gate, and it stays.
 *
 *   MIGAKI_ROOT            optional — repo root override
 *   MIGAKI_RUN_DATE        optional — YYYY-MM-DD, the week ending date
 *   MIGAKI_MIN_DAYS_SEEN   optional — days a pattern must recur to qualify, default 2
 *
 * Usage: node dist/diff.js [path/to/summary.json]
 *   The markdown report goes to stdout; logs go to stderr.
 */

import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertWritableTarget,
  cacheDir,
  describeError,
  describeSchemaError,
  loadTasteFiles,
  normalizeName,
  readPositiveIntEnv,
  renderTasteEntry,
  resolveRepoRoot,
  resolveRunDate,
  summaryPath,
  weeklySummarySchema,
} from "./shared.js";
import type {
  EdgeCluster,
  Lane,
  Level,
  SlopCluster,
  Source,
  TasteEntry,
  TasteFile,
  WeeklySummary,
} from "./shared.js";

const SLOP_FILE = "taste/slop.md";
const EDGE_FILE = "taste/edge.md";
const WATCH_SECTION = "Retirement Watch";

type Action = "add" | "revise" | "watch" | "promote" | "confirm-retirement";

/** Reviewer-facing order: things that change existing content lead. */
const ACTION_ORDER: Record<Action, number> = {
  promote: 0,
  "confirm-retirement": 1,
  watch: 2,
  add: 3,
  revise: 4,
};

type Removal = {
  readonly file: string;
  readonly what: string;
  /** 1-indexed line in the file as it stands today. Re-verify before applying. */
  readonly line: number;
  readonly markdown: string;
};

type Evidence = {
  readonly lane: Lane;
  readonly cluster_id: string;
  readonly days_seen: number;
  readonly dates: readonly string[];
  readonly level: Level;
  readonly finding_ids: readonly string[];
  readonly sources: readonly Source[];
};

type Proposal = {
  readonly id: string;
  readonly action: Action;
  readonly file: string;
  readonly section: string;
  /** False when the finding's category is not a `##` heading in the file today. */
  readonly section_exists: boolean;
  readonly entry_name: string;
  /** Markdown to insert. Empty for a pure removal. */
  readonly markdown: string;
  /** The entry as it reads today, for a revision. Empty otherwise. */
  readonly current_markdown: string;
  /** Best-effort anchor: the last line of the section's final entry today. */
  readonly insert_after_line: number | null;
  readonly removes: Removal | null;
  readonly rationale: string;
  readonly note: string;
  readonly evidence: Evidence;
};

type Deferred = {
  readonly lane: Lane;
  readonly cluster_id: string;
  readonly name: string;
  readonly reason: string;
  readonly days_seen: number;
  readonly level: Level;
};

type Covered = {
  readonly lane: Lane;
  readonly cluster_id: string;
  readonly name: string;
  readonly matched_entry: string;
  readonly rationale: string;
};

/* -------------------------------------------------------------------------- */
/* Rendering                                                                   */
/* -------------------------------------------------------------------------- */

const renderSlopEntry = (cluster: SlopCluster): string => {
  const finding = cluster.representative;
  return [
    `**${cluster.canonical_name}**`,
    `- ${finding.what_it_is}`,
    `- ${finding.why_it_reads_as_slop}`,
    `- ${finding.what_to_do_instead}`,
  ].join("\n");
};

const renderEdgeEntry = (cluster: EdgeCluster, addedMonth: string): string => {
  const finding = cluster.representative;
  return [
    `**${cluster.canonical_name}** (added ${addedMonth})`,
    `- Looks like: ${finding.looks_like}`,
    `- Why it works: ${finding.why_it_works}`,
    `- Execute it well: ${finding.execute_it_well}`,
  ].join("\n");
};

const renderWatchLine = (name: string, note: string): string =>
  note === "" ? `- ${name}` : `- ${name}: ${note}`;

/**
 * The last line of the last entry in a section, which is where an appended entry
 * belongs. Null when the section does not exist, which the proposal reports
 * rather than papering over.
 */
const sectionAnchor = (file: TasteFile, section: string): number | null => {
  const entries = file.entries.filter((entry) => entry.section === section);
  const last = entries[entries.length - 1];
  if (last === undefined) return null;
  return last.line + last.bullets.length;
};

const watchAnchor = (file: TasteFile): number | null => {
  const last = file.retirementWatch[file.retirementWatch.length - 1];
  return last?.line ?? null;
};

const findEntry = (file: TasteFile, name: string): TasteEntry | undefined => {
  if (name === "") return undefined;
  const key = normalizeName(name);
  return file.entries.find((entry) => normalizeName(entry.name) === key);
};

const alreadyOnWatch = (file: TasteFile, name: string): boolean => {
  const key = normalizeName(name);
  return file.retirementWatch.some(
    (item) => normalizeName(item.label) === key || normalizeName(item.text).startsWith(key),
  );
};

/* -------------------------------------------------------------------------- */
/* Proposal construction                                                       */
/* -------------------------------------------------------------------------- */

const evidenceOf = (cluster: SlopCluster | EdgeCluster): Evidence => ({
  lane: cluster.lane,
  cluster_id: cluster.id,
  days_seen: cluster.days_seen,
  dates: cluster.dates,
  level: cluster.lane === "slop" ? cluster.confidence : cluster.retirement_risk,
  finding_ids: cluster.member_ids,
  sources: cluster.sources,
});

/**
 * A pattern qualifies by recurring across days or by arriving with high
 * confidence. One low-confidence sighting on one day is a lead, not a finding,
 * and gets reported as deferred rather than proposed.
 */
const qualifies = (cluster: SlopCluster | EdgeCluster, minDaysSeen: number): boolean => {
  const level = cluster.lane === "slop" ? cluster.confidence : cluster.retirement_risk;
  return cluster.days_seen >= minDaysSeen || level === "high";
};

const deferralReason = (cluster: SlopCluster | EdgeCluster, minDaysSeen: number): string => {
  const level = cluster.lane === "slop" ? cluster.confidence : cluster.retirement_risk;
  return `seen on ${cluster.days_seen} of the week's days at ${level} ${
    cluster.lane === "slop" ? "confidence" : "retirement risk"
  }; the bar is ${minDaysSeen} days or high.`;
};

type Built = {
  readonly proposals: readonly Proposal[];
  readonly deferred: readonly Deferred[];
  readonly covered: readonly Covered[];
  readonly warnings: readonly string[];
};

const buildProposals = (
  summary: WeeklySummary,
  taste: { slop: TasteFile; edge: TasteFile },
  minDaysSeen: number,
): Built => {
  const proposals: Proposal[] = [];
  const deferred: Deferred[] = [];
  const covered: Covered[] = [];
  const warnings: string[] = [];
  const addedMonth = summary.week_end.slice(0, 7);

  /** Watch lines proposed this run, so two clusters cannot each add the same one. */
  const proposedWatch = new Set<string>();
  let counter = 0;
  const nextId = (action: Action): string => {
    counter += 1;
    return `${action}-${counter}`;
  };

  for (const cluster of summary.lanes.slop.clusters) {
    const entryMarkdown = renderSlopEntry(cluster);
    const anchor = sectionAnchor(taste.slop, cluster.category);
    const qualified = qualifies(cluster, minDaysSeen);

    // A pattern that contradicts an edge.md entry is the strongest signal the
    // week can produce: it moves a pattern from excellent to generated.
    const retires = findEntry(taste.edge, cluster.retires_edge_entry);
    if (cluster.retires_edge_entry !== "" && retires === undefined) {
      warnings.push(
        `slop cluster "${cluster.canonical_name}" claims it retires edge entry "${cluster.retires_edge_entry}", which is not in ${EDGE_FILE}. The removal was dropped; the addition was kept.`,
      );
    }

    if (qualified && retires !== undefined) {
      // Already covered on the slop side means the removal is the whole change.
      // Adding the entry too would duplicate a line that is already in the file.
      const alreadySaid = cluster.coverage === "covered";
      proposals.push({
        id: nextId("promote"),
        action: "promote",
        file: SLOP_FILE,
        section: alreadySaid ? cluster.matched_entry_section : cluster.category,
        section_exists: alreadySaid ? true : cluster.section_exists,
        entry_name: alreadySaid ? cluster.matched_entry : cluster.canonical_name,
        markdown: alreadySaid ? "" : entryMarkdown,
        current_markdown: "",
        insert_after_line: alreadySaid ? null : anchor,
        removes: {
          file: EDGE_FILE,
          what: retires.name,
          line: retires.line,
          markdown: renderTasteEntry(retires),
        },
        rationale: cluster.rationale,
        note: [
          cluster.retirement_note === ""
            ? `This week's slop evidence contradicts the ${EDGE_FILE} entry "${retires.name}".`
            : cluster.retirement_note,
          alreadySaid
            ? `${SLOP_FILE} already says this under "${cluster.matched_entry}", so only the removal is proposed.`
            : "",
          // edge.md's own maintenance note routes a removal to Retirement Watch,
          // but that section is for patterns still approaching the crossing. This
          // one is claimed to have crossed already, so it goes straight across.
          // Worth a reviewer's eye rather than a silent choice either way.
          `This bypasses Retirement Watch, which is for patterns still approaching the crossing. If the claim is that this one is close rather than across, move it to Retirement Watch and leave the ${EDGE_FILE} entry in place.`,
        ]
          .filter((line) => line !== "")
          .join(" "),
        evidence: evidenceOf(cluster),
      });
      continue;
    }

    const watchItem =
      cluster.confirms_retirement_watch === ""
        ? undefined
        : taste.edge.retirementWatch.find(
            (item) =>
              normalizeName(item.label) === normalizeName(cluster.confirms_retirement_watch),
          );
    if (cluster.confirms_retirement_watch !== "" && watchItem === undefined) {
      warnings.push(
        `slop cluster "${cluster.canonical_name}" claims it confirms the Retirement Watch line "${cluster.confirms_retirement_watch}", which does not match any line in ${EDGE_FILE}.`,
      );
    }

    if (qualified && watchItem !== undefined) {
      const alreadySaid = cluster.coverage === "covered";
      // A confirmed watch line may also have a live edge.md entry behind it, which
      // has to go at the same time or the two files end up contradicting.
      const strandedEntry = findEntry(taste.edge, watchItem.label);
      proposals.push({
        id: nextId("confirm-retirement"),
        action: "confirm-retirement",
        file: SLOP_FILE,
        section: alreadySaid ? cluster.matched_entry_section : cluster.category,
        section_exists: alreadySaid ? true : cluster.section_exists,
        entry_name: alreadySaid ? cluster.matched_entry : cluster.canonical_name,
        markdown: alreadySaid ? "" : entryMarkdown,
        current_markdown: "",
        insert_after_line: alreadySaid ? null : anchor,
        removes: {
          file: EDGE_FILE,
          what: `${WATCH_SECTION}: ${watchItem.label}`,
          line: watchItem.line,
          markdown: `- ${watchItem.text}`,
        },
        rationale: cluster.rationale,
        note: [
          cluster.retirement_note === ""
            ? `A Retirement Watch line has been confirmed by this week's evidence and moves into ${SLOP_FILE}.`
            : cluster.retirement_note,
          alreadySaid
            ? `${SLOP_FILE} already says this under "${cluster.matched_entry}", so only the removal is proposed.`
            : "",
          strandedEntry === undefined
            ? ""
            : `${EDGE_FILE} still carries a matching entry, "${strandedEntry.name}" at line ${strandedEntry.line}. Remove it in the same change, or the two files will disagree.`,
        ]
          .filter((line) => line !== "")
          .join(" "),
        evidence: evidenceOf(cluster),
      });
      continue;
    }

    if (cluster.coverage === "covered") {
      covered.push({
        lane: "slop",
        cluster_id: cluster.id,
        name: cluster.canonical_name,
        matched_entry: cluster.matched_entry,
        rationale: cluster.rationale,
      });
      continue;
    }

    if (!qualified) {
      deferred.push({
        lane: "slop",
        cluster_id: cluster.id,
        name: cluster.canonical_name,
        reason: deferralReason(cluster, minDaysSeen),
        days_seen: cluster.days_seen,
        level: cluster.confidence,
      });
      continue;
    }

    if (cluster.coverage === "sharpens") {
      const existing = findEntry(taste.slop, cluster.matched_entry);
      if (existing === undefined) {
        warnings.push(
          `slop cluster "${cluster.canonical_name}" sharpens "${cluster.matched_entry}", which is not in ${SLOP_FILE}. Proposed as an addition instead.`,
        );
      } else {
        proposals.push({
          id: nextId("revise"),
          action: "revise",
          file: SLOP_FILE,
          section: existing.section,
          section_exists: true,
          entry_name: existing.name,
          markdown: "",
          current_markdown: renderTasteEntry(existing),
          insert_after_line: existing.line + existing.bullets.length,
          removes: null,
          rationale: cluster.rationale,
          // Deliberately not a rewritten entry: the existing prose was written by
          // hand, and replacing it wholesale to add one specific loses more than
          // it gains. The reviewer folds this in.
          note: [
            "New this week, to fold into the entry above:",
            `- What it is: ${cluster.representative.what_it_is}`,
            `- Why it reads as slop: ${cluster.representative.why_it_reads_as_slop}`,
            `- What to do instead: ${cluster.representative.what_to_do_instead}`,
          ].join("\n"),
          evidence: evidenceOf(cluster),
        });
        continue;
      }
    }

    proposals.push({
      id: nextId("add"),
      action: "add",
      file: SLOP_FILE,
      section: cluster.category,
      section_exists: cluster.section_exists,
      entry_name: cluster.canonical_name,
      markdown: entryMarkdown,
      current_markdown: "",
      insert_after_line: anchor,
      removes: null,
      rationale: cluster.rationale,
      note: "",
      evidence: evidenceOf(cluster),
    });
  }

  for (const cluster of summary.lanes.edge.clusters) {
    const qualified = qualifies(cluster, minDaysSeen);

    if (!qualified && cluster.coverage !== "covered") {
      deferred.push({
        lane: "edge",
        cluster_id: cluster.id,
        name: cluster.canonical_name,
        reason: deferralReason(cluster, minDaysSeen),
        days_seen: cluster.days_seen,
        level: cluster.retirement_risk,
      });
      continue;
    }

    // A pattern already burning out does not get added as fresh edge. Whether it
    // is new or already an entry, the honest proposal is a Retirement Watch line.
    if (cluster.retirement_risk === "high") {
      const target = findEntry(taste.edge, cluster.matched_entry);
      const name = target?.name ?? cluster.canonical_name;
      const key = normalizeName(name);

      if (alreadyOnWatch(taste.edge, name) || proposedWatch.has(key)) {
        covered.push({
          lane: "edge",
          cluster_id: cluster.id,
          name: cluster.canonical_name,
          matched_entry: `${WATCH_SECTION}: ${name}`,
          rationale: "Already on Retirement Watch; no change proposed.",
        });
        continue;
      }
      proposedWatch.add(key);

      proposals.push({
        id: nextId("watch"),
        action: "watch",
        file: EDGE_FILE,
        section: WATCH_SECTION,
        section_exists: taste.edge.sections.includes(WATCH_SECTION),
        entry_name: name,
        markdown: renderWatchLine(
          name,
          cluster.retirement_note === ""
            ? `reported at high retirement risk on ${cluster.days_seen} day${cluster.days_seen === 1 ? "" : "s"} this week`
            : cluster.retirement_note,
        ),
        current_markdown: target === undefined ? "" : renderTasteEntry(target),
        insert_after_line: watchAnchor(taste.edge),
        removes: null,
        rationale: cluster.rationale,
        note:
          target === undefined
            ? "Reported as excellent but already at high retirement risk, so it is proposed as a Retirement Watch line rather than as a new entry."
            : `The existing entry "${target.name}" is at high retirement risk. Watch first; remove it only once slop evidence confirms the crossing.`,
        evidence: evidenceOf(cluster),
      });
      continue;
    }

    if (cluster.coverage === "covered") {
      covered.push({
        lane: "edge",
        cluster_id: cluster.id,
        name: cluster.canonical_name,
        matched_entry: cluster.matched_entry,
        rationale: cluster.rationale,
      });
      continue;
    }

    if (cluster.coverage === "sharpens") {
      const existing = findEntry(taste.edge, cluster.matched_entry);
      if (existing === undefined) {
        warnings.push(
          `edge cluster "${cluster.canonical_name}" sharpens "${cluster.matched_entry}", which is not in ${EDGE_FILE}. Proposed as an addition instead.`,
        );
      } else {
        proposals.push({
          id: nextId("revise"),
          action: "revise",
          file: EDGE_FILE,
          section: existing.section,
          section_exists: true,
          entry_name: existing.name,
          markdown: "",
          current_markdown: renderTasteEntry(existing),
          insert_after_line: existing.line + existing.bullets.length,
          removes: null,
          rationale: cluster.rationale,
          note: [
            "New this week, to fold into the entry above:",
            `- Looks like: ${cluster.representative.looks_like}`,
            `- Why it works: ${cluster.representative.why_it_works}`,
            `- Execute it well: ${cluster.representative.execute_it_well}`,
          ].join("\n"),
          evidence: evidenceOf(cluster),
        });
        continue;
      }
    }

    proposals.push({
      id: nextId("add"),
      action: "add",
      file: EDGE_FILE,
      section: cluster.category,
      section_exists: cluster.section_exists,
      entry_name: cluster.canonical_name,
      markdown: renderEdgeEntry(cluster, addedMonth),
      current_markdown: "",
      insert_after_line: sectionAnchor(taste.edge, cluster.category),
      removes: null,
      rationale: cluster.rationale,
      note: "",
      evidence: evidenceOf(cluster),
    });
  }

  for (const proposal of proposals) {
    if (!proposal.section_exists) {
      warnings.push(
        `proposal ${proposal.id} targets section "${proposal.section}" in ${proposal.file}, which is not a heading in that file today. Place it by hand.`,
      );
    }
  }

  proposals.sort((a, b) => ACTION_ORDER[a.action] - ACTION_ORDER[b.action]);
  return { proposals, deferred, covered, warnings };
};

/* -------------------------------------------------------------------------- */
/* Reports                                                                     */
/* -------------------------------------------------------------------------- */

const ACTION_TITLE: Record<Action, string> = {
  promote: "Move from edge.md to slop.md",
  "confirm-retirement": "Confirm a Retirement Watch line into slop.md",
  watch: "Add to Retirement Watch",
  add: "Add a new entry",
  revise: "Sharpen an existing entry",
};

const renderSources = (sources: readonly Source[]): string[] =>
  sources.length === 0
    ? ["  - (no sources recorded)"]
    : sources.map((source) => `  - [${source.title}](${source.url})`);

const renderProposal = (proposal: Proposal): string => {
  const lines: string[] = [
    `### ${proposal.id} — ${ACTION_TITLE[proposal.action]}`,
    "",
    `**${proposal.entry_name}** → \`${proposal.file}\` › ${proposal.section}${
      proposal.section_exists ? "" : "  ⚠️ section not found in the file today"
    }`,
    "",
    `Seen on ${proposal.evidence.days_seen} day${proposal.evidence.days_seen === 1 ? "" : "s"} (${proposal.evidence.dates.join(", ")}) at ${proposal.evidence.level} ${proposal.evidence.lane === "slop" ? "confidence" : "retirement risk"}.`,
    "",
    proposal.rationale,
  ];

  if (proposal.removes !== null) {
    lines.push(
      "",
      `**Removes** from \`${proposal.removes.file}\` (line ${proposal.removes.line} today):`,
      "",
      "```markdown",
      proposal.removes.markdown,
      "```",
    );
  }

  if (proposal.current_markdown !== "") {
    lines.push("", "**Entry as it reads today:**", "", "```markdown", proposal.current_markdown, "```");
  }

  if (proposal.markdown !== "") {
    lines.push(
      "",
      proposal.action === "watch" ? "**Proposed Retirement Watch line:**" : "**Proposed entry:**",
      "",
      "```markdown",
      proposal.markdown,
      "```",
    );
  }

  if (proposal.note !== "") lines.push("", proposal.note);

  lines.push("", "Sources:", ...renderSources(proposal.evidence.sources));
  return lines.join("\n");
};

const renderReport = (summary: WeeklySummary, built: Built, minDaysSeen: number): string => {
  const { proposals, deferred, covered, warnings } = built;
  const counts = proposals.reduce<Record<string, number>>((acc, proposal) => {
    acc[proposal.action] = (acc[proposal.action] ?? 0) + 1;
    return acc;
  }, {});

  const lines: string[] = [
    `# Proposed taste layer updates — week ending ${summary.week_end}`,
    "",
    "Generated by `research/diff.ts`. Nothing here has been applied. Every line below is a proposal",
    "for a human to accept, edit, or reject; `taste/` is only ever changed by merging this review.",
    "",
    "## Summary",
    "",
    `- Window: ${summary.week_start} to ${summary.week_end} (${summary.inputs.window_days} days, ${summary.inputs.days_present.length} present)`,
    `- Findings: ${summary.lanes.slop.findings_total} slop, ${summary.lanes.edge.findings_total} edge`,
    `- Clusters: ${summary.lanes.slop.clusters.length} slop, ${summary.lanes.edge.clusters.length} edge`,
    `- Proposals: ${proposals.length}` +
      (proposals.length === 0
        ? ""
        : ` (${Object.entries(counts)
            .map(([action, count]) => `${count} ${action}`)
            .join(", ")})`),
    `- Already covered: ${covered.length} · Below the evidence bar: ${deferred.length}`,
    `- Evidence bar: recurring on ${minDaysSeen}+ days, or a single high-confidence sighting`,
  ];

  const health: string[] = [];
  if (summary.inputs.days_missing.length > 0) {
    health.push(`- No daily cache file for: ${summary.inputs.days_missing.join(", ")}`);
  }
  for (const day of summary.inputs.days_unreadable) {
    health.push(`- \`${day.date}.json\` could not be read: ${day.error}`);
  }
  for (const failure of summary.inputs.pass_errors) {
    health.push(`- ${failure.date} ${failure.lane} pass failed: ${failure.error}`);
  }
  if (summary.lanes.slop.error !== "") {
    health.push(`- Slop clustering failed: ${summary.lanes.slop.error}`);
  }
  if (summary.lanes.edge.error !== "") {
    health.push(`- Edge clustering failed: ${summary.lanes.edge.error}`);
  }
  for (const warning of warnings) health.push(`- ${warning}`);

  if (health.length > 0) {
    lines.push(
      "",
      "## Run health",
      "",
      "Read these before trusting the coverage below — a gap here means the week was sampled unevenly.",
      "",
      ...health,
    );
  }

  if (proposals.length === 0) {
    lines.push(
      "",
      "## Proposals",
      "",
      "None. Everything the week turned up is either already covered by the taste layer or below the",
      "evidence bar. A quiet week is a legitimate outcome; do not lower the bar to produce a diff.",
    );
  } else {
    lines.push("", "## Proposals", "", ...proposals.map((proposal) => `${renderProposal(proposal)}\n`));
  }

  if (deferred.length > 0) {
    lines.push(
      "",
      "## Below the evidence bar",
      "",
      "Not proposed, recorded so they are not lost. A pattern here that recurs next week will clear the bar.",
      "",
      ...deferred.map((item) => `- **${item.name}** (${item.lane}) — ${item.reason}`),
    );
  }

  if (covered.length > 0) {
    lines.push(
      "",
      "## Already covered",
      "",
      ...covered.map(
        (item) =>
          `- **${item.name}** (${item.lane}) → ${item.matched_entry === "" ? "an existing entry" : `"${item.matched_entry}"`}${item.rationale === "" ? "" : ` — ${item.rationale}`}`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
};

/** A CHANGELOG.md block for whoever merges this, matching what the PR would do. */
const renderChangelog = (summary: WeeklySummary, proposals: readonly Proposal[]): string => {
  if (proposals.length === 0) return "";
  const lines = [
    `## ${summary.week_end}`,
    "",
    `Weekly research pass, ${summary.week_start} to ${summary.week_end}.`,
    "",
    ...proposals.map(
      (proposal) =>
        `- ${ACTION_TITLE[proposal.action]}: **${proposal.entry_name}** (\`${proposal.file}\` › ${proposal.section})`,
    ),
  ];
  return `${lines.join("\n")}\n`;
};

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

const writeGuarded = async (root: string, target: string, body: string): Promise<void> => {
  assertWritableTarget(root, target);
  await mkdir(cacheDir(root), { recursive: true });
  const temp = `${target}.tmp`;
  await writeFile(temp, body, "utf8");
  await rename(temp, target);
};

const main = async (): Promise<number> => {
  const root = resolveRepoRoot();
  const weekEnd = resolveRunDate();
  const minDaysSeen = readPositiveIntEnv("MIGAKI_MIN_DAYS_SEEN", 2);
  const inputPath = process.argv[2] ?? summaryPath(root, weekEnd);

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(inputPath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`Could not read the summary at ${inputPath} — ${describeError(error)}`);
  }

  const parsed = weeklySummarySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `${inputPath} is not a weekly summary this version understands — ${describeSchemaError(parsed.error)}`,
    );
  }
  const summary = parsed.data;

  // Parsed fresh rather than trusted from the summary: the taste files may have
  // been hand-edited since summarize.ts ran, and every line anchor below refers
  // to the files as they stand right now.
  const taste = await loadTasteFiles(root);
  const built = buildProposals(summary, taste, minDaysSeen);

  const report = renderReport(summary, built, minDaysSeen);
  const changelog = renderChangelog(summary, built.proposals);

  const proposal = {
    kind: "migaki-weekly-proposal",
    version: 1,
    week_start: summary.week_start,
    week_end: summary.week_end,
    generated_at: new Date().toISOString(),
    summary_source: inputPath,
    min_days_seen: minDaysSeen,
    /** Nothing here is applied. A workflow opens a pull request; a human merges it. */
    applied: false,
    counts: {
      proposals: built.proposals.length,
      deferred: built.deferred.length,
      covered: built.covered.length,
      warnings: built.warnings.length,
    },
    proposals: built.proposals,
    deferred: built.deferred,
    covered: built.covered,
    warnings: built.warnings,
    changelog_markdown: changelog,
    report_markdown: report,
  };

  const jsonTarget = join(cacheDir(root), `proposal-${weekEnd}.json`);
  const mdTarget = join(cacheDir(root), `proposal-${weekEnd}.md`);
  await writeGuarded(root, jsonTarget, `${JSON.stringify(proposal, null, 2)}\n`);
  await writeGuarded(root, mdTarget, report);

  process.stdout.write(report);

  console.error(`[migaki:diff] read ${inputPath}`);
  for (const warning of built.warnings) console.error(`[migaki:diff] warning: ${warning}`);
  console.error(
    `[migaki:diff] ${built.proposals.length} proposals, ${built.deferred.length} below bar, ${built.covered.length} already covered`,
  );
  console.error(`[migaki:diff] wrote ${jsonTarget}`);
  console.error(`[migaki:diff] wrote ${mdTarget}`);
  return 0;
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`[migaki:diff] fatal: ${describeError(error)}`);
    process.exitCode = 1;
  },
);
