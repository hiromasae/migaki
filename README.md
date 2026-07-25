# migaki

**磨き — "to polish."** An MCP server that gives any AI coding agent a maintained sense of visual taste.

Agents connect once. Every interface they generate gets checked against a taste layer: three markdown files describing what good UI is, what currently reads as machine-generated, and where the bar sits right now.

---

## The problem

Coding agents write competent UI and generic UI at the same rate. They have no way to know that the near-black surface with an acid-green accent, the violet-to-orange gradient, and the scroll-triggered fade-up on every section were distinctive two years ago and are now the visual signature of unconsidered output.

Taste is not a fixed rule set. Half of it is timeless perception and half of it expires. A model's weights are frozen at training time; the expiring half goes stale immediately and there is no mechanism to refresh it.

migaki separates the two and keeps the perishable half current.

## The taste layer

Three files in [`taste/`](taste/). This is the project; everything else is delivery.

| File | What it holds | Lifecycle |
| --- | --- | --- |
| [`core.md`](taste/core.md) | Timeless perceptual principles — hierarchy, structure, attention as the scarce resource. Grounded in how vision and cognition work. | Invariant. Hand-edited only, and rarely. |
| [`slop.md`](taste/slop.md) | What currently reads as AI-generated, low-effort, or dated. Named patterns, recognizable in code. | Expires. Updated weekly by review. |
| [`edge.md`](taste/edge.md) | What currently reads as considered and well-executed, with the reasoning that makes it so. Carries a Retirement Watch for patterns about to become slop. | Expires. Updated weekly by review. |

`core.md` takes precedence. When an entry in `edge.md` appears to conflict with a principle in `core.md`, the principle is right and the entry is wrong.

Entries in the expiring files are written to be recognized in code, not admired in the abstract — each names a pattern, describes what it looks like concretely, explains why it works or fails, and separates good execution from imitation.

## Tools

### `context`

Returns all three taste files, labeled by filename, in precedence order. No parameters, no API call, pure file reads. Call it before generating or editing any UI.

### `review`

Takes a snippet of UI code and returns a structured critique against the taste layer.

| Parameter | Type | Required | Notes |
| --- | --- | --- | --- |
| `code` | string | yes | The UI code to review. |
| `stack` | string | no | e.g. `"Next.js + Tailwind"`, `"SwiftUI"`. Makes the critique framework-aware. |

The critique comes back in a fixed shape: **Flags** (each slop pattern named exactly, where it appears, and a specific fix), **What's working** (referenced against `edge.md`), and **Elevations** (only when something good could be pushed further by a small change). Not an essay.

`review` calls the Claude API internally with the taste layer as a cached system prefix, so it needs `ANTHROPIC_API_KEY`. `context` does not.

### `analyze`

Reads a repository and reports what is already there — framework and language, styling approach, component library, design tokens, and established conventions — so generated UI matches the project instead of the model's defaults.

| Parameter | Type | Required | Notes |
| --- | --- | --- | --- |
| `tree` | string[] | one of the two | The repo's file paths, e.g. `git ls-files`. Use against a deployed migaki. |
| `path` | string | one of the two | Repository root on the machine running migaki. Local runs only. |

A deployed migaki reads its own container's filesystem, not yours, so `path` only works when the server runs alongside the repo. `tree` is how a remote server sees a project: the calling agent supplies the paths. When both are given, `tree` wins.

The two modes do not reach equally far, and the response says which one produced it. With `path`, file contents are readable, so dependencies, CSS custom properties, and theme config all count as evidence. With `tree` there are only filenames, so detection falls back to config-file markers — `next.config.ts`, `tailwind.config.ts`, `components.json` — and design tokens cannot be read at all.

Anything it cannot infer is reported as not detected rather than guessed, along with what was checked, so a genuine absence is distinguishable from a mode limitation. It also returns a ready-made `stack` value to hand to `review`, which is the intended pairing: analyze once per project, then pass the result into every review. No API call, with bounded depth and file count so a large tree cannot stall the server.

## Connect an agent

The server speaks streamable HTTP at `/mcp`. Point any MCP-compatible client at it:

```json
{
  "mcpServers": {
    "migaki": {
      "url": "https://migaki-production-d7cb.up.railway.app/mcp"
    }
  }
}
```

Claude Code, from the CLI:

```bash
claude mcp add --transport http migaki https://migaki-production-d7cb.up.railway.app/mcp
```

There is no per-user state and no session id — each request gets a fresh server instance, so the same URL works for everyone and scales horizontally.

## Run it locally

Requires Node 20+.

```bash
git clone git@github.com:hiromasae/migaki.git
cd migaki
npm run build          # installs and compiles mcp-server/
export ANTHROPIC_API_KEY=sk-...   # only needed for `review`
npm start
```

Serves `http://localhost:3000/mcp`, with a health check at `/health`.

Point a local agent at it the same way:

```bash
claude mcp add --transport http migaki http://localhost:3000/mcp
```

### Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | for `review` | — | Calls the Claude API. `context` works without it. |
| `MIGAKI_ROOT` | when deployed | auto-detected | Absolute path to the directory containing `taste/`. Set it to `/app` on Railway. Locally, the root is found by walking up from the working directory. |
| `PORT` | no | `3000` | |
| `HOST` | no | `0.0.0.0` | |

## Deploy

[`railway.toml`](railway.toml) is committed and deploys the whole repo, not just the server — `taste/` is read from disk at runtime, so it has to ship alongside. `watchPatterns` includes `taste/**`, which means a merged taste update redeploys the running service.

Set `MIGAKI_ROOT=/app` and `ANTHROPIC_API_KEY` on the service. They are deliberately not in `railway.toml`.

## Repo structure

```
migaki/
├── taste/
│   ├── core.md            # Timeless principles — never auto-updated
│   ├── slop.md            # What currently reads as AI-generated
│   ├── edge.md            # What currently reads as excellent
│   └── CHANGELOG.md       # Log of taste updates
├── mcp-server/
│   ├── index.ts           # HTTP entry point, stateless streamable transport
│   └── tools/
│       ├── context.ts     # Returns the taste layer
│       ├── review.ts      # Critiques UI code against it
│       └── analyze.ts     # Infers a project's stack and conventions
├── research/
│   ├── daily.ts           # Daily research pass — writes to research/cache/
│   └── cache/             # Structured daily findings — gitignored
├── railway.toml
└── CLAUDE.md              # Handbook for agents working on this repo
```

## Status

Early. What works today:

- [x] `context` — returns the taste layer
- [x] `review` — structured critique against it
- [x] `analyze` — infers a project's stack and conventions
- [x] Railway deployment over streamable HTTP
- [x] `research/daily.ts` — daily research pass, Claude searching the open web itself
- [ ] `research/summarize.ts` and `research/diff.ts` — weekly summarizer that proposes taste updates
- [ ] GitHub Actions workflows that run the passes and open the weekly taste PR

The three tools are usable now. The taste files are populated, but the weekly loop that refreshes them is only half built: the daily pass gathers findings into `research/cache/`, and nothing yet turns a week of those into a pull request. Until that lands, `slop.md` and `edge.md` are maintained by hand.

## Updating the taste layer

The expiring files are meant to change, but never silently. Once the pipeline exists it will open a pull request; it will not write to `taste/` directly. **The human review gate is intentional and load-bearing** — an automated system that can edit its own standard of taste has no standard.

If you want to propose a change now, open a PR against `slop.md` or `edge.md`. Useful proposals:

- Name a pattern precisely enough to recognize in code, and say why it works or why it has stopped working.
- Move an `edge.md` entry to `slop.md` when imitation has outpaced execution, and note it under Retirement Watch first.
- Argue against an existing entry. An entry that no longer earns its place should be deleted, not softened.

`core.md` is a different matter. It changes when something fundamental about perception changes, which is to say almost never.
