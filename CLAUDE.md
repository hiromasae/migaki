# migaki — Claude Code Handbook

## What this project is

migaki (磨き — "to polish") is an open source MCP server that gives any AI coding agent a living, actively maintained sense of visual taste. Agents connect to it once via their MCP config and every UI they generate gets checked against a three-file taste layer.

It is a **tool server**, not an agent. It sits passively and responds to requests from agents (Claude Code, Cursor, Windsurf, or any MCP-compatible runtime). It does not initiate anything on its own. The only autonomous behavior is the GitHub Actions scraper pipeline that proposes weekly updates to the taste layer.

## Repo structure

```
migaki/
├── CLAUDE.md
├── README.md
├── taste/
│   ├── core.md           # Timeless perceptual principles — never auto-updated
│   ├── slop.md           # What currently reads as AI-generated UI — updated weekly
│   ├── edge.md           # What currently reads as excellent modern UI — updated weekly
│   └── CHANGELOG.md      # Log of taste updates
├── mcp-server/
│   ├── index.ts          # MCP server entry point
│   ├── tools/
│   │   ├── context.ts    # Returns the full taste layer to the calling agent
│   │   ├── review.ts     # Reviews UI code against the taste layer
│   │   └── analyze.ts    # Reads a repo and infers stack and conventions
│   ├── package.json
│   └── tsconfig.json
├── research/
│   ├── daily.ts          # Daily research pass via Claude web search
│   ├── summarize.ts      # Weekly summarizer — diffs against taste files
│   ├── diff.ts           # Proposes updates to slop.md and edge.md
│   └── cache/            # Daily JSON output — gitignored
└── .github/
    └── workflows/
        ├── daily-research.yml
        └── weekly-summary.yml
```

## Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js
- **Package manager:** npm
- **MCP SDK:** `@modelcontextprotocol/sdk` — the official Anthropic-maintained SDK
- **Deployment:** Railway (HTTP transport so any agent can connect without running locally)
- **Research pipeline:** Claude API with web search enabled, runs on GitHub Actions

## The taste layer

The three files in `/taste` are the core of the project. Everything else is infrastructure around them.

- `core.md` — timeless perceptual principles grounded in cognitive science. Never touched by the scraper. Edit by hand only when something fundamental changes.
- `slop.md` — what currently reads as AI-generated, low-effort, or dated UI. Updated weekly by the scraper pipeline via PR.
- `edge.md` — what currently reads as excellent and considered modern UI. Updated weekly by the scraper pipeline via PR. Contains a Retirement Watch section for patterns approaching slop.

**Never modify taste files programmatically without going through the PR review gate.** The human review step is intentional and load-bearing.

## MCP tools

### `context`
Returns the full content of all three taste files — `core.md`, `slop.md`, and `edge.md` — clearly labeled by filename, to the calling agent. No input parameters. Pure file reads, no Claude API call. This is the most important tool; build it first.

### `review`
Takes a snippet of UI code and returns a structured critique against the taste layer. Calls the Claude API internally with the taste layer as context. Parameters: `code` (string, required), `stack` (string, optional — e.g. "Next.js + Tailwind").

The critique should: flag specific patterns from `slop.md` by name, reference relevant `edge.md` entries as positive direction, note what is working, and return as structured text with clear sections. Do not return a generic essay.

### `analyze`
Takes a repo path or file tree and returns inferred stack, conventions, and existing design patterns. Used during setup so agents understand a project before generating anything — this context feeds into the `review` tool so critiques are project-aware. Parameters: `path` (string, optional), `tree` (array of strings, optional). One of the two is required; if neither is given, return a clear error saying so.

`tree` is a list of the repository's file paths, supplied by the calling agent — e.g. the output of `git ls-files`. It exists because a deployed migaki reads its own container's filesystem, not the caller's: `path` only works when the server runs on the same machine as the repo. When both are given, `tree` wins.

The two modes do not have equal reach, and the difference must be stated in the output rather than hidden. With `path`, file contents are readable, so dependencies, CSS custom properties, and theme config are all available. With `tree` there are only filenames, so detection falls back to config-file markers (`next.config.ts`, `tailwind.config.ts`, `components.json`) and design tokens cannot be read at all. Every response states which source was used.

Should return: framework and language, styling approach, component library if any, existing design tokens or spacing conventions, and any patterns already established in the codebase. If something cannot be inferred, say so explicitly rather than guessing — and say what was checked, so the caller can tell a genuine absence from a mode limitation.

## Code conventions

- Strict TypeScript throughout — no `any`, use `unknown` and narrow explicitly
- Functional style — no classes except where the SDK requires them
- One file per tool in `mcp-server/tools/`
- All file paths resolved relative to the repo root, not relative to the executing file
- Environment variables for the Anthropic API key — never hardcode
- Error handling: all tool handlers must catch and return structured errors, never throw to the MCP layer

## What you can do autonomously

- Build and iterate on the MCP server and its three tools
- Write tests for tool handlers
- Scaffold the research pipeline scripts
- Update dependencies and configuration
- Fix bugs including self-correction after test failures

## What requires approval before proceeding

- Any change to files in `/taste/` — propose as a diff in your response, never write directly
- Changing the deployment target or hosting provider
- Adding a new npm dependency (ask first, explain why)
- Changing the MCP transport from HTTP to stdio or vice versa
- Any change to the GitHub Actions workflow files

## Build order

Build in this order. Do not skip ahead.

1. `mcp-server/` scaffolding — `package.json`, `tsconfig.json`, entry point
2. `context` tool — reads the three taste files and returns them
3. Deploy to Railway and verify an agent can connect and call `context`
4. `review` tool — calls Claude API with taste layer as context
5. `analyze` tool — reads a repo and infers conventions
6. `research/daily.ts` — Claude API **with web search enabled** (not a scraper; Claude sources autonomously across the open internet), writes structured JSON to `research/cache/`. Two passes per run: slop and edge. No PR opened from this step.
7. `research/summarize.ts` and `research/diff.ts` — weekly summarizer
8. GitHub Actions workflows

## How agents connect

```json
{
  "mcpServers": {
    "migaki": {
      "url": "https://migaki-production-d7cb.up.railway.app/mcp"
    }
  }
}
```

## Handling uncertainty

If a task is ambiguous or you hit a decision point not covered here, stop and surface the question with your recommendation. Do not guess and implement.
