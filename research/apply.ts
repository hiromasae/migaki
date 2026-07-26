/**
 * Applies a weekly proposal to the taste files, on a branch, for review.
 *
 * This is the one script in the pipeline that writes to `taste/`, and the rules
 * it works under are narrow on purpose:
 *
 *   - It refuses to run on the default branch. Its output is a branch that
 *     becomes a pull request; a human merging that pull request is still the
 *     only way a taste change reaches `main`.
 *   - It may write to `slop.md`, `edge.md` and `CHANGELOG.md` and nothing else.
 *     `core.md` is timeless and hand-authored, and is not reachable from here.
 *   - It relocates every edit by content at apply time. The line numbers in the
 *     proposal are hints. If the text it means to remove is not where it expects
 *     or no longer matches, it refuses that one edit and reports it rather than
 *     guessing, because a wrong guess corrupts a file whose whole value is that
 *     every line was deliberate.
 *   - It never applies a `revise`. Those have no finished text by design and go
 *     to a human as an issue.
 *
 * A refused edit is not a crash. Everything else still applies, and the refusals
 * are reported so the pull request can say what it could not do.
 *
 *   MIGAKI_ROOT          optional — repo root override
 *   MIGAKI_RUN_DATE      optional — YYYY-MM-DD, the week ending date
 *   MIGAKI_ALLOW_BRANCH  optional — branch name to permit besides the default guard
 *
 * Usage: node dist/apply.js [path/to/proposal.json]
 */

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  APPLICABLE_FILES,
  CHANGELOG_FILE,
  WATCH_SECTION,
  describeError,
  describeSchemaError,
  normalizeName,
  parseTasteFile,
  proposalFileSchema,
  proposalPath,
  renderTasteEntry,
  resolveRepoRoot,
  resolveRunDate,
} from "./shared.js";
import type { Proposal, ProposalFile, TasteFile } from "./shared.js";

/** Branches this must never edit taste files on. */
const PROTECTED_BRANCHES = new Set(["main", "master"]);

type Outcome =
  | { readonly status: "applied"; readonly proposal: Proposal; readonly detail: string }
  | { readonly status: "skipped"; readonly proposal: Proposal; readonly detail: string }
  | { readonly status: "refused"; readonly proposal: Proposal; readonly detail: string };

/* -------------------------------------------------------------------------- */
/* Guards                                                                      */
/* -------------------------------------------------------------------------- */

const currentBranch = (root: string): string => {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch (error: unknown) {
    throw new Error(`Could not determine the current git branch — ${describeError(error)}`);
  }
};

/**
 * Refusing on the default branch is the structural half of the review gate. The
 * escape hatch names a specific branch rather than being a boolean, so it cannot
 * be flipped on globally and forgotten.
 */
const assertSafeBranch = (root: string): string => {
  const branch = currentBranch(root);
  const allowed = process.env["MIGAKI_ALLOW_BRANCH"];
  if (allowed !== undefined && allowed !== "" && allowed === branch) return branch;

  if (PROTECTED_BRANCHES.has(branch)) {
    throw new Error(
      `Refusing to edit taste files on "${branch}". Check out a branch first — this script's output is a pull request, not a commit to the default branch.`,
    );
  }
  if (branch === "HEAD") {
    throw new Error(
      "Refusing to edit taste files in detached HEAD state: there is no branch for a pull request to come from.",
    );
  }
  return branch;
};

const assertApplicable = (relPath: string): void => {
  if (!(APPLICABLE_FILES as readonly string[]).includes(relPath)) {
    throw new Error(
      `Refusing to write ${relPath}. This script may only edit ${APPLICABLE_FILES.join(", ")}.`,
    );
  }
};

/* -------------------------------------------------------------------------- */
/* Editing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One file's text, re-parsed before every edit. Edits shift line numbers, and
 * re-parsing is cheaper than reasoning about offsets — these files are a few
 * hundred lines and a week produces a handful of edits.
 */
type Doc = { readonly relPath: string; text: string; dirty: boolean };

const makeDoc = (relPath: string, text: string): Doc => ({ relPath, text, dirty: false });

const docParse = (doc: Doc): TasteFile => parseTasteFile(doc.relPath, doc.text);

const docLines = (doc: Doc): string[] => doc.text.split("\n");

const docSetLines = (doc: Doc, lines: readonly string[]): void => {
  doc.text = lines.join("\n");
  doc.dirty = true;
};

const docPrepend = (doc: Doc, block: string): void => {
  doc.text = `${block.trimEnd()}\n\n${doc.text.replace(/^\n+/, "")}`;
  doc.dirty = true;
};

/** Inserts a block after the last entry of a section, separated by a blank line. */
const insertIntoSection = (doc: Doc, section: string, markdown: string): string => {
  const parsed = docParse(doc);
  const entries = parsed.entries.filter((entry) => entry.section === section);
  const last = entries[entries.length - 1];
  if (last === undefined) {
    throw new Error(
      `section "${section}" has no entries in ${doc.relPath}, so there is nowhere to append`,
    );
  }

  const afterLine = last.line + last.bullets.length;
  const lines = docLines(doc);
  lines.splice(afterLine, 0, "", ...markdown.split("\n"));
  docSetLines(doc, lines);
  return `appended after "${last.name}" (line ${afterLine})`;
};

/** Appends a bullet to the Retirement Watch list, which is a plain list. */
const appendWatchLine = (doc: Doc, markdown: string): string => {
  const parsed = docParse(doc);
  const last = parsed.retirementWatch[parsed.retirementWatch.length - 1];
  if (last === undefined) {
    throw new Error(`${doc.relPath} has no ${WATCH_SECTION} items to append after`);
  }
  const lines = docLines(doc);
  lines.splice(last.line, 0, markdown);
  docSetLines(doc, lines);
  return `appended to ${WATCH_SECTION} (line ${last.line + 1})`;
};

/**
 * Removes an entry block, or a Retirement Watch line, located by content. The
 * recorded markdown must still match what is in the file — a taste file edited
 * by hand since diff.ts ran is exactly the case that must not be steamrolled.
 */
const removeBlock = (doc: Doc, what: string, expected: string): string => {
  const parsed = docParse(doc);

  const watchItem = parsed.retirementWatch.find(
    (item) => item.text === expected.replace(/^-\s*/, "") || `- ${item.text}` === expected,
  );
  if (watchItem !== undefined) {
    const lines = docLines(doc);
    lines.splice(watchItem.line - 1, 1);
    docSetLines(doc, lines);
    return `removed ${WATCH_SECTION} line "${watchItem.label}" (was line ${watchItem.line})`;
  }

  const key = normalizeName(what.replace(new RegExp(`^${WATCH_SECTION}:\\s*`), ""));
  const entry = parsed.entries.find((candidate) => normalizeName(candidate.name) === key);
  if (entry === undefined) {
    throw new Error(`could not find "${what}" in ${doc.relPath}; it may already have been removed`);
  }

  const current = renderTasteEntry(entry);
  if (current.trim() !== expected.trim()) {
    throw new Error(
      `"${entry.name}" in ${doc.relPath} no longer matches what the proposal recorded, so it has been edited since. Reconcile by hand.`,
    );
  }

  const lines = docLines(doc);
  const start = entry.line - 1;
  let count = 1 + entry.bullets.length;
  // Take the blank line that followed the block so two blank lines are not left.
  if ((lines[start + count] ?? "x").trim() === "") count += 1;
  lines.splice(start, count);
  docSetLines(doc, lines);
  return `removed "${entry.name}" (was line ${entry.line})`;
};

/* -------------------------------------------------------------------------- */
/* Apply                                                                       */
/* -------------------------------------------------------------------------- */

const applyOne = (docs: Map<string, Doc>, proposal: Proposal): Outcome => {
  // Revisions carry no finished text on purpose; they go to a human as an issue.
  if (proposal.action === "revise") {
    return { status: "skipped", proposal, detail: "revision — needs prose written by hand" };
  }

  const details: string[] = [];

  try {
    if (proposal.removes !== null) {
      assertApplicable(proposal.removes.file);
      const doc = docs.get(proposal.removes.file);
      if (doc === undefined) throw new Error(`${proposal.removes.file} was not loaded`);
      details.push(removeBlock(doc, proposal.removes.what, proposal.removes.markdown));
    }

    if (proposal.markdown !== "") {
      assertApplicable(proposal.file);
      const doc = docs.get(proposal.file);
      if (doc === undefined) throw new Error(`${proposal.file} was not loaded`);

      if (!proposal.section_exists) {
        throw new Error(
          `section "${proposal.section}" does not exist in ${proposal.file}; the entry needs placing by hand`,
        );
      }

      details.push(
        proposal.action === "watch"
          ? appendWatchLine(doc, proposal.markdown)
          : insertIntoSection(doc, proposal.section, proposal.markdown),
      );
    }
  } catch (error: unknown) {
    return { status: "refused", proposal, detail: describeError(error) };
  }

  if (details.length === 0) {
    return { status: "skipped", proposal, detail: "nothing to apply" };
  }
  return { status: "applied", proposal, detail: details.join("; ") };
};

const renderOutcomeReport = (outcomes: readonly Outcome[], branch: string): string => {
  const by = (status: Outcome["status"]): Outcome[] => outcomes.filter((o) => o.status === status);
  const lines: string[] = [`Applied on branch \`${branch}\`.`, ""];

  const applied = by("applied");
  lines.push(`- Applied: ${applied.length}`);
  for (const outcome of applied) {
    lines.push(`  - ${outcome.proposal.id} **${outcome.proposal.entry_name}** — ${outcome.detail}`);
  }

  const refused = by("refused");
  if (refused.length > 0) {
    lines.push("", `- Refused, needs a human: ${refused.length}`);
    for (const outcome of refused) {
      lines.push(
        `  - ${outcome.proposal.id} **${outcome.proposal.entry_name}** — ${outcome.detail}`,
      );
    }
  }

  const skipped = by("skipped");
  if (skipped.length > 0) {
    lines.push("", `- Not applied here: ${skipped.length}`);
    for (const outcome of skipped) {
      lines.push(
        `  - ${outcome.proposal.id} **${outcome.proposal.entry_name}** — ${outcome.detail}`,
      );
    }
  }

  return lines.join("\n");
};

const main = async (): Promise<number> => {
  const root = resolveRepoRoot();
  const branch = assertSafeBranch(root);
  const weekEnd = resolveRunDate();
  const inputPath = process.argv[2] ?? proposalPath(root, weekEnd);

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(inputPath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`Could not read the proposal at ${inputPath} — ${describeError(error)}`);
  }

  const parsed = proposalFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `${inputPath} is not a weekly proposal this version understands — ${describeSchemaError(parsed.error)}`,
    );
  }
  const proposal: ProposalFile = parsed.data;

  console.error(`[migaki:apply] branch ${branch}, ${proposal.proposals.length} proposals`);

  const docs = new Map<string, Doc>();
  for (const relPath of APPLICABLE_FILES) {
    if (relPath === CHANGELOG_FILE) continue;
    docs.set(relPath, makeDoc(relPath, await readFile(join(root, relPath), "utf8")));
  }

  const outcomes = proposal.proposals.map((item) => applyOne(docs, item));

  const applied = outcomes.filter((outcome) => outcome.status === "applied").length;
  if (applied > 0 && proposal.changelog_markdown !== "") {
    const changelog = makeDoc(
      CHANGELOG_FILE,
      await readFile(join(root, CHANGELOG_FILE), "utf8"),
    );
    docPrepend(changelog, proposal.changelog_markdown);
    docs.set(CHANGELOG_FILE, changelog);
  }

  for (const [relPath, doc] of docs) {
    if (!doc.dirty) continue;
    assertApplicable(relPath);
    await writeFile(join(root, relPath), doc.text, "utf8");
    console.error(`[migaki:apply] wrote ${relPath}`);
  }

  const report = renderOutcomeReport(outcomes, branch);
  process.stdout.write(`${report}\n`);

  const refused = outcomes.filter((outcome) => outcome.status === "refused").length;
  const skipped = outcomes.filter((outcome) => outcome.status === "skipped").length;
  console.error(`[migaki:apply] ${applied} applied, ${refused} refused, ${skipped} skipped`);

  // A refusal is a reportable outcome, not a failure: the rest still applied and
  // the pull request should say what it could not do.
  return 0;
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`[migaki:apply] fatal: ${describeError(error)}`);
    process.exitCode = 1;
  },
);
