# protocol — how the research loop runs

Operating contract for the scheduled agent that maintains `edge.md` and
`slop.md`. The agent proposes; the owner disposes. Nothing here authorizes a
write to `main`.

This directory is repo tooling and is **not** part of the shipped plugin.
Nothing under `research/` may be moved into `plugins/migaki/`.

## Scope

| File | Loop may touch |
|---|---|
| `edge.md` | yes — add, sharpen, retire |
| `slop.md` | yes — add, sharpen |
| `core.md` | **never** |

`core.md` is grounded in named perceptual laws, not in trends. It is not a
research target and no run may open it for editing.

## The run

1. **Reconcile.** Read `research/REJECTED.md`. Then check for research PRs
   closed since the last run: anything proposed but absent from `main` was
   rejected — append it to `REJECTED.md` with the date and move on. Never
   re-propose a logged rejection.
2. **Re-check.** Take the six entries in `edge.md` with the oldest stamps.
   For each, confirm against Tier 1–2 sources that it still holds. Stamp the
   survivors; propose retirement for the rest.
3. **Research.** Read `research/SOURCES.md` and gather candidates. Sources
   outside that file are out of bounds.
4. **Diff against the corpus.** Classify every candidate (below). Discard
   anything already covered.
5. **Commit** surviving proposals to the standing branch `research-queue`,
   one commit per proposal, rationale and evidence in the commit body.
6. **Threshold.** If the branch carries **8 or more** pending proposals,
   open a PR. Otherwise stop and leave it accumulating.

## Classifying a candidate

- **Already present** — discard silently. No commit, no note.
- **Sharpens an existing entry** — propose an edit, not a new entry. This is
  the preferred outcome; the corpus improves without growing.
- **Genuinely new** — propose an addition, subject to the entry spec.
- **Saturated** — the pattern is in `edge.md` but now appears everywhere.
  Propose a move to Retirement watch, or to `slop.md` if it is fully spent.

Prefer sharpening over adding. A run that proposes six edits and no additions
is a good run.

## Entry spec

Every proposed entry must pass all four. This is a hard gate: an entry that
fails is not proposed, even if the underlying observation is correct.

1. **No unbounded interpretable word.** Any adjective an implementer has to
   fill in — *slight, subtle, barely visible, quiet, tight, large, low* —
   carries a number or a range. `edge.md` #3 is the model: "`~8–12%`
   foreground opacity", never "low contrast".
2. **A named fallback for every precondition.** If the entry depends on
   something that may be unavailable — a webfont, a browser API, real data
   density — state what to do when it is not. `edge.md` #11 is the model.
3. **Standalone.** Comprehensible without reading a neighbouring entry.
4. **Falsifiable.** Names the hex, pixel value, duration, weight, CSS
   property, or year. A reader can check whether output complies.

**Self-check, stated in the commit body:** for each proposed entry, name the
word an implementer could get wrong, and the bound that stops them. If no
such word exists, say so. An entry whose self-check cannot be written is not
ready.

This gate exists because of a measured failure: on 2026-08-11 two entries
that were correct and current both degraded on contact, in the same way —
each had an interpretable word and no stated bound. Freshness would not have
prevented it.

## Evidence

Every proposal cites a named shipped surface — product, URL, and what was
observed there. "Widely seen" and "increasingly common" are not evidence and
a proposal resting on either is dropped.

Saturation claims need the opposite evidence: a pattern is over when it
appears across a Tier 4 archive, not when it appears on one product.

## Stamps

`edge.md` entries carry `*(added YYYY-MM)*`. When a run verifies an entry
still holds, it becomes `*(added YYYY-MM, re-checked YYYY-MM)*`.

`added` is never rewritten — it is the age signal that retirement judgments
depend on. An entry with no `re-checked` has not been verified since it was
written, and the absence is informative. Do not backfill stamps.

## Hard rules

- Never commit to `main`. Never force-push. Never merge your own PR.
- Never edit `core.md`.
- Never rewrite an `added` stamp.
- Never re-propose anything in `REJECTED.md`.
- Hard-wrap at 79 characters, matching every other file in the repo.
- Renumber the whole file when inserting mid-list; both taste files number
  continuously across section headings.
- If a run finds nothing that passes the gate, commit nothing and say so.
  An empty run is a valid result and is preferable to padding.
