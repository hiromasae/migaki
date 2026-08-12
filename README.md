# migaki

migaki (磨き — "to polish") is a Claude Code plugin carrying one skill: a set
of sense and taste references that push generated work toward reading as
excellent rather than generic. Sense is grounded in fact, taste in preference.

No server, no build step, no dependencies. The deliverable is markdown.

## Install

```
/plugin marketplace add hiromasae/migaki
/plugin install migaki@migaki
```

## What it does

The skill loads when work turns to UI, visual design, layout, typography, or
front-end components. It opens **one** of three reference files — the one the
task needs, not all three — and applies what it finds.

- **`core.md`** — timeless perceptual principles, grounded in named laws
  (Fitts, Hick, Jakob, Miller, Nielsen, Norman, Tufte). Organized into four
  tiers under one meta-principle: minimize cognitive load.
- **`slop.md`** — patterns that read as AI-generated, low-effort, or dated.
  Every entry is a flag, not a ban, and names the case where the pattern is
  still the right call.
- **`edge.md`** — what reads as excellent right now. Every entry carries a
  date stamp so staleness is visible, and a Retirement watch section tracks
  patterns drifting toward slop.

Taste is contested, so the skill proposes rather than imposes. It builds what
you asked for, then surfaces the taste decisions as a short list you can
accept or reject one at a time.

## Precedence

1. An explicit instruction from you beats everything.
2. `core.md` beats `edge.md`.
3. Within `core.md`, the lower-numbered tier wins.

## Layout

```
.claude-plugin/marketplace.json
plugins/migaki/
├── .claude-plugin/plugin.json
└── skills/migaki/
    ├── SKILL.md
    ├── core.md
    ├── slop.md
    └── edge.md
```

## License

MIT. See [LICENSE](LICENSE).
