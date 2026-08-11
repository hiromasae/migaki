# migaki — Claude Code Handbook

## What this project is

migaki (磨き — "to polish") is a **Claude Code plugin**, distributed through a
single-plugin marketplace in this same repo. It carries one skill, also named
`migaki`, whose entire job is to route an agent to the right taste reference at
the right moment.

There is no server, no build step, no runtime, and no dependencies. The
deliverable is markdown. An agent installs the plugin, and the skill's
description pulls it into context when the work turns to UI, visual design,
layout, typography, or front-end components.

**This repo has been restarted from an empty tree twice.** Earlier eras built
a TypeScript MCP server and then a JS rewrite; both are abandoned. They
survive on `origin/worktree-daily-prompt-caching` (TS MCP server) and
`origin/js-rewrite` (JS plugin), which share no ancestor with `main`. Do not
port code or ideas from them without being asked — the current design is
deliberately smaller.

## Repo structure

```
migaki/
├── CLAUDE.md
├── .claude-plugin/
│   └── marketplace.json      # points at ./plugins/migaki
└── plugins/
    └── migaki/
        ├── .claude-plugin/
        │   └── plugin.json   # plugin manifest
        └── skills/
            └── migaki/
                ├── SKILL.md  # router; frontmatter drives invocation
                ├── core.md   # timeless perceptual principles
                ├── slop.md   # what reads as AI-generated or dated
                └── edge.md   # what reads as excellent right now
```

Six tracked files, ~500 lines total. Keep it that way unless there's a reason.

## The taste layer

The three reference files are the product. `SKILL.md` is a router, not a
container — it tells the agent which single file to open and how to apply what
it finds. Everything else is packaging.

- **`core.md`** — timeless perceptual principles, grounded in cognitive
  science and named laws (Fitts, Hick, Jakob, Miller, Nielsen, Norman,
  Tufte). Organized into four tiers with an explicit conflict rule: lower
  tier wins. Opens with a meta-principle (minimize cognitive load) and closes
  with a three-question operational test. Should change rarely — only when
  something foundational does.
- **`slop.md`** — patterns that read as AI-generated, low-effort, or dated.
- **`edge.md`** — what reads as excellent right now. Every entry is dated so
  staleness is visible. Ends with a **Retirement watch** section: patterns
  drifting toward slop, still defensible but due for re-evaluation.

### Precedence

Stated across the files and load-bearing — preserve it in any edit:

1. An explicit user instruction beats everything. Note the conflict once, then
   move on.
2. `core.md` beats `edge.md` (`edge.md` says so in its header).
3. Within `core.md`, the lower-numbered tier wins.

### Entry formats

Match these exactly when adding or editing entries.

`slop.md` — every entry is a flag, not a ban. Three parts: the pattern in bold,
what it signals, and the case where it's still correct.

```markdown
15. **Gradient text on headlines.** `background-clip: text` over the brand
    gradient — the single strongest 2023-AI tell. Also breaks on selection and
    in forced-colors mode. *Still right:* at most one hero moment, on a brand
    that owns the gradient elsewhere.
```

`edge.md` — bold pattern, then a parenthesized italic date stamp, then the
description.

```markdown
3. **Hairline borders over shadows.** *(added 2026-08)* 1px borders at low
   contrast (`~8–12%` foreground opacity) separate surfaces; shadows are
   reserved for true elevation (popovers, modals). Flat + hairline is the
   current mark of confidence.
```

Both files number continuously across their section headings — section breaks
do not restart the count. Renumber the whole file when inserting mid-list.

Entries are independent by design; an agent pulls the one it needs. Never write
an entry that only makes sense after reading a neighbor.

## Writing conventions

The prose style is as much the product as the content. Match it.

- **Hard-wrap markdown at 79 characters.** Every reference file does this. The
  one exception is `SKILL.md`'s frontmatter `description`, which must stay on
  a single line.
- **Be specific and falsifiable.** Name the hex, the pixel value, the font, the
  CSS property, the year a pattern peaked. `#6366F1 → #A855F7` beats "a purple
  gradient." Specificity is what makes the reference usable mid-task.
- **State the exception.** A flag without its "still right" case is a ban, and
  bans get ignored.
- **No hedging and no lecturing.** The files assert. They do not explain design
  theory or justify themselves at length.
- Sentence case for headings. Em dashes are used freely — a house style that
  happens to overlap with a slop entry; that entry is about marketing copy,
  not about these files.

## What you can do autonomously

- Edit `SKILL.md` routing and application guidance
- Fix typos, formatting, wrapping, and numbering in any file
- Restructure sections within a taste file
- Edit `marketplace.json` and `plugin.json`

## What requires approval before proceeding

- **Adding, removing, or rewriting a taste entry in `core.md`, `slop.md`, or
  `edge.md`.** Propose the diff in your response; do not write it. These files
  are the product and every entry is a judgment call the owner should make.
- Moving an entry between `slop.md` and `edge.md`, or into Retirement watch
- Adding a fourth reference file, or any new skill to the plugin
- Adding a build step, dependency, or any non-markdown/JSON artifact
- Changing the plugin or marketplace name, or the directory layout

## Git

- Commit messages are **plain imperative, sentence case, no prefix** —
  "Fill in slop.md and edge.md taste catalogs", "Say sense and taste, not just
  taste". The old `feat(scope):` convention belongs to an abandoned era; do not
  reintroduce it.
- `main` is the working branch and is currently the only live history.
- Commit only when asked.

## Handling uncertainty

If a task is ambiguous or you hit a decision point not covered here, stop and
surface the question with your recommendation. Do not guess and implement.
