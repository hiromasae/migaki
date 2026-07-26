import assert from "node:assert/strict";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { registerAnalyzeTool } from "../tools/analyze.ts";
import {
  captureRegistrations,
  makeTempDir,
  removeDir,
  textOf,
  toolNamed,
  writeFiles,
} from "./helpers.ts";
import type { ToolHandler, ToolResult } from "./helpers.ts";

/** analyze has no module state, so one registration serves the whole file. */
const analyze = (): ToolHandler => {
  const { server, tools } = captureRegistrations();
  registerAnalyzeTool(server);
  return toolNamed(tools, "analyze").handler;
};

const run = async (args: Record<string, unknown>): Promise<string> => {
  const result = await analyze()(args);
  assert.notEqual(result.isError, true, `expected success, got: ${textOf(result)}`);
  return textOf(result);
};

const runExpectingError = async (args: Record<string, unknown>): Promise<string> => {
  const result: ToolResult = await analyze()(args);
  assert.equal(result.isError, true, `expected an error, got: ${textOf(result)}`);
  return textOf(result);
};

/** Reads back one `- Label: value` line from the report. */
const findingFor = (report: string, label: string): string => {
  const line = report.split("\n").find((candidate) => candidate.startsWith(`- ${label}:`));
  if (line === undefined) throw new Error(`no finding labelled "${label}" in:\n${report}`);
  return line.slice(`- ${label}:`.length).trim();
};

/**
 * A caller-supplied tree, as `git ls-files` on an absolute checkout would give it:
 * a shared prefix to strip, and a node_modules entry that must be dropped.
 */
const NEXT_TREE: readonly string[] = [
  "/Users/dev/acme/package.json",
  "/Users/dev/acme/tsconfig.json",
  "/Users/dev/acme/next.config.ts",
  "/Users/dev/acme/tailwind.config.ts",
  "/Users/dev/acme/components.json",
  "/Users/dev/acme/app/globals.css",
  "/Users/dev/acme/src/components/Button.tsx",
  "/Users/dev/acme/src/components/Header.tsx",
  "/Users/dev/acme/src/components/ui/card.tsx",
  "/Users/dev/acme/node_modules/left-pad/index.js",
];

/** A different stack entirely, for proving which input won. */
const NUXT_TREE: readonly string[] = ["nuxt.config.ts", "package.json", "app/app.vue"];

let fixtures: string;
/** The same project as NEXT_TREE, on disk, where contents are readable. */
let nextRepo: string;
let emptyRepo: string;

before(async () => {
  fixtures = await makeTempDir("migaki-analyze");

  nextRepo = join(fixtures, "acme");
  await writeFiles(nextRepo, {
    "package.json": JSON.stringify({
      name: "acme",
      dependencies: { next: "15.0.0", react: "19.0.0", "@radix-ui/react-dialog": "1.1.2" },
      devDependencies: { typescript: "5.9.3", tailwindcss: "4.0.0" },
    }),
    "tsconfig.json": "{}\n",
    "next.config.ts": "export default {};\n",
    "tailwind.config.ts": "export default { theme: { extend: { colors: {} } } };\n",
    "components.json": '{ "style": "new-york" }\n',
    "app/globals.css": '@import "tailwindcss";\n\n@theme {\n  --color-brand: #0af;\n}\n\n:root {\n  --space-1: 4px;\n}\n',
    "src/components/Button.tsx": "export const Button = () => null;\n",
    "src/components/Header.tsx": "export const Header = () => null;\n",
    "src/components/ui/card.tsx": "export const Card = () => null;\n",
    // Neither of these may reach the report: both directories are skipped.
    "node_modules/left-pad/index.js": "module.exports = () => {};\n",
    "dist/bundle.js": "console.log(1);\n",
  });

  emptyRepo = join(fixtures, "empty");
  await writeFiles(emptyRepo, { "node_modules/left-pad/index.js": "module.exports = 1;\n" });
});

after(async () => {
  await removeDir(fixtures);
});

describe("registerAnalyzeTool", () => {
  test("registers a read-only tool named analyze taking optional path and tree", () => {
    const { server, tools } = captureRegistrations();
    registerAnalyzeTool(server);

    const tool = toolNamed(tools, "analyze");
    assert.deepEqual(tool.config["annotations"], { readOnlyHint: true, openWorldHint: false });
    assert.deepEqual(Object.keys(tool.config["inputSchema"] as object), ["path", "tree"]);
  });

  test("errors when neither path nor tree is supplied, naming both", async () => {
    const text = await runExpectingError({});

    assert.match(text, /^analyze failed:/);
    assert.match(text, /`tree`/);
    assert.match(text, /`path`/);
    assert.match(text, /Neither was provided\./);
  });

  test("an unreadable path is an error that points at tree as the remedy", async () => {
    const text = await runExpectingError({ path: join(fixtures, "no-such-repo") });

    assert.match(text, /analyze failed: path does not exist/);
    assert.match(text, /pass `tree` instead/);
  });

  test("a path to a file rather than a directory is rejected", async () => {
    const text = await runExpectingError({ path: join(nextRepo, "package.json") });

    assert.match(text, /is not a directory/);
    assert.match(text, /Pass the repository root\./);
  });
});

describe("source labelling", () => {
  test("tree mode is labelled source=tree and counts the usable paths", async () => {
    const report = await run({ tree: [...NEXT_TREE] });

    // Ten paths in, one under node_modules dropped.
    assert.match(report, /^<project-analysis source="tree" files="9 path\(s\)">/m);
    assert.ok(!report.includes('source="filesystem"'));
  });

  test("path mode is labelled source=filesystem and echoes the path given", async () => {
    const report = await run({ path: nextRepo });

    assert.ok(report.includes(`<project-analysis source="filesystem" path="${nextRepo}">`));
    assert.ok(!report.includes('source="tree"'));
  });

  test("tree wins when both are supplied", async () => {
    const report = await run({ path: nextRepo, tree: [...NUXT_TREE] });

    assert.match(report, /source="tree"/);
    assert.match(findingFor(report, "Framework"), /Nuxt/);
    // The on-disk project at `path` is Next.js; none of it may leak in.
    assert.ok(!report.includes("Next.js"));
  });

  test("tree is used without the path ever being touched", async () => {
    // A path that cannot be read at all still succeeds, because it is never read.
    const report = await run({ path: join(fixtures, "no-such-repo"), tree: [...NEXT_TREE] });

    assert.match(report, /source="tree"/);
    assert.match(findingFor(report, "Framework"), /Next\.js/);
  });
});

describe("tree mode", () => {
  test("detects the stack from config-file markers alone", async () => {
    const report = await run({ tree: [...NEXT_TREE] });

    assert.equal(findingFor(report, "Framework"), "Next.js [evidence: next.config.ts]");
    assert.match(findingFor(report, "Styling"), /^Tailwind CSS/);
    assert.equal(findingFor(report, "Component library"), "shadcn/ui [evidence: components.json]");
    assert.match(findingFor(report, "Language"), /^TypeScript/);
  });

  test("strips the shared absolute prefix so directory conventions still match", async () => {
    const report = await run({ tree: [...NEXT_TREE] });

    assert.match(findingFor(report, "Component layout"), /src\/components/);
    assert.match(findingFor(report, "Component layout"), /components\/ui\/ \(primitive layer\)/);
    assert.match(findingFor(report, "Component layout"), /3 component file\(s\)/);
    assert.ok(!report.includes("/Users/dev/acme"), "the caller's absolute prefix should be gone");
  });

  test("drops dependency directories from the supplied tree", async () => {
    const report = await run({ tree: [...NEXT_TREE] });

    // left-pad/index.js is the only .js file in the tree; counting it would both
    // inflate the file count and report JavaScript alongside TypeScript.
    assert.equal(
      findingFor(report, "Language"),
      "TypeScript [evidence: tsconfig.json, 5 .ts/.tsx file(s)]",
    );
    assert.ok(!report.includes("JavaScript"));
  });

  test("states that design tokens cannot be read rather than omitting them", async () => {
    const report = await run({ tree: [...NEXT_TREE] });

    const tokens = findingFor(report, "Design tokens / spacing");
    assert.equal(
      tokens,
      "not detected (checked nothing — design tokens live inside files, which a path-only tree cannot supply)",
    );
    // A genuine absence and a mode limitation must not read the same.
    assert.ok(!tokens.includes("CSS custom properties"));
  });

  test("discloses in the notes that only paths were available", async () => {
    const report = await run({ tree: [...NEXT_TREE] });

    assert.match(report, /Source: caller-supplied file tree/);
    assert.match(report, /Only paths were available, not file contents/);
    assert.match(report, /Call with `path` instead/);
  });

  test("says which checks were limited by the absence of a manifest", async () => {
    // The `checked` text only surfaces on a miss, so this needs a tree with no
    // framework or component-library signal in it at all.
    const bare = await run({ tree: ["src/main.ts", "package.json"] });
    assert.equal(
      findingFor(bare, "Component library"),
      "not detected (checked components.json (no readable dependency manifest))",
    );
    assert.equal(
      findingFor(bare, "Framework"),
      "not detected (checked framework config files and .vue/.svelte files (no readable dependency manifest))",
    );
  });

  test("an empty tree is reported as such", async () => {
    const report = await run({ tree: ["node_modules/left-pad/index.js"] });

    assert.match(report, /The supplied tree contained no usable file paths/);
  });
});

describe("path mode", () => {
  test("reads dependencies out of the manifest", async () => {
    const report = await run({ path: nextRepo });

    assert.match(findingFor(report, "Framework"), /^Next\.js/);
    assert.match(findingFor(report, "Framework"), /evidence: package\.json/);
    assert.match(findingFor(report, "Styling"), /^Tailwind CSS/);
    assert.match(findingFor(report, "Component library"), /shadcn\/ui/);
    // Radix is only visible through the manifest — tree mode cannot see it.
    assert.match(findingFor(report, "Component library"), /Radix UI primitives/);
  });

  test("reads design tokens out of file contents", async () => {
    const report = await run({ path: nextRepo });

    const tokens = findingFor(report, "Design tokens / spacing");
    assert.match(tokens, /2 CSS custom properties/);
    assert.match(tokens, /--color-brand/);
    assert.match(tokens, /--space-1/);
    assert.match(tokens, /Tailwind v4 @theme block/);
    assert.match(tokens, /theme\.extend in tailwind\.config\.ts/);
    assert.match(tokens, /evidence: app\/globals\.css/);
  });

  test("does not descend into dependency or build directories", async () => {
    const report = await run({ path: nextRepo });

    // node_modules/left-pad/index.js and dist/bundle.js are the only .js files.
    assert.equal(
      findingFor(report, "Language"),
      "TypeScript [evidence: tsconfig.json, 5 .ts/.tsx file(s)]",
    );
    assert.ok(!report.includes("JavaScript"));
    assert.match(findingFor(report, "Component layout"), /3 component file\(s\)/);
  });

  test("reports the dominant component filename casing with its counts", async () => {
    const report = await run({ path: nextRepo });

    // Button.tsx and Header.tsx against ui/card.tsx.
    assert.equal(
      findingFor(report, "Component file naming"),
      "PascalCase [evidence: PascalCase ×2, camelCase ×1]",
    );
  });

  test("a directory with nothing readable in it is reported, not guessed at", async () => {
    const report = await run({ path: emptyRepo });

    assert.match(report, /No files found below the given path/);
    assert.equal(findingFor(report, "Framework"), "not detected (checked framework config files and .vue/.svelte files (no readable dependency manifest))");
    assert.match(report, /Suggested `stack` value for the review tool: none/);
  });
});

describe("the suggested stack line", () => {
  test("summarises framework, styling, and component library", async () => {
    const fromPath = await run({ path: nextRepo });
    const fromTree = await run({ tree: [...NEXT_TREE] });

    const expected = 'Suggested `stack` value for the review tool: "Next.js + Tailwind CSS + shadcn/ui"';
    assert.ok(fromPath.includes(expected));
    // The same project reached either way agrees on the headline stack, even
    // though the two modes see very different amounts of it.
    assert.ok(fromTree.includes(expected));
  });
});
