import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  captureRegistrations,
  makeTempDir,
  removeDir,
  setEnv,
  textOf,
  toolNamed,
  useCwd,
  writeFiles,
} from "./helpers.ts";

/** The reported state of one taste file. Mirrors context.ts's internal TasteFile. */
type TasteFileResult = {
  readonly name: string;
  readonly ok: boolean;
  readonly content?: string;
  readonly error?: string;
};

type ContextModule = {
  readonly resolveRepoRoot: () => string;
  readonly readTasteLayer: () => Promise<readonly TasteFileResult[]>;
  readonly renderTasteLayer: (files: readonly TasteFileResult[]) => string;
  readonly registerContextTool: (server: McpServer) => void;
};

/**
 * context.ts memoises the repo root in module scope, so every test that touches
 * root resolution needs its own instance of the module. A unique query string
 * defeats the ESM cache; the loader still strips types off the underlying file.
 */
let instance = 0;
const loadContext = async (): Promise<ContextModule> =>
  (await import(`../tools/context.ts?instance=${(instance += 1)}`)) as ContextModule;

const fileNamed = (files: readonly TasteFileResult[], name: string): TasteFileResult => {
  const file = files.find((candidate) => candidate.name === name);
  if (file === undefined) throw new Error(`readTasteLayer did not report ${name}`);
  return file;
};

let fixtures: string;
/** All three taste files present, plus a nested directory to walk up from. */
let complete: string;
/** slop.md absent entirely; edge.md present but blank. */
let partial: string;
/** A taste/ directory that exists but holds none of the three files. */
let bare: string;
/** A plausible repo root with no taste/ directory at all. */
let noTaste: string;

before(async () => {
  fixtures = await makeTempDir("migaki-context");

  complete = join(fixtures, "complete");
  await writeFiles(complete, {
    "taste/core.md": "# core\n\nContrast carries hierarchy.\n",
    "taste/slop.md": "# slop\n\nPurple-to-blue gradient heroes.\n",
    "taste/edge.md": "# edge\n\nRestrained, physical motion.\n",
    "packages/app/src/placeholder.txt": "",
  });

  partial = join(fixtures, "partial");
  await writeFiles(partial, {
    "taste/core.md": "# core\n\nContrast carries hierarchy.\n",
    "taste/edge.md": "   \n\n",
  });

  bare = join(fixtures, "bare");
  await writeFiles(bare, { "taste/.keep": "" });

  noTaste = join(fixtures, "no-taste");
  await writeFiles(noTaste, { "README.md": "nothing to see here\n" });
});

after(async () => {
  await removeDir(fixtures);
});

describe("resolveRepoRoot", () => {
  test("MIGAKI_ROOT overrides the search and is resolved to an absolute path", async (t) => {
    setEnv(t, "MIGAKI_ROOT", complete);
    useCwd(t, fixtures);

    const { resolveRepoRoot } = await loadContext();

    assert.equal(resolveRepoRoot(), resolve(complete));
  });

  test("a relative MIGAKI_ROOT is resolved against the working directory", async (t) => {
    setEnv(t, "MIGAKI_ROOT", "complete");
    useCwd(t, fixtures);

    const { resolveRepoRoot } = await loadContext();

    assert.equal(resolveRepoRoot(), complete);
  });

  test("MIGAKI_ROOT pointing at a directory with no taste/ throws, naming the variable", async (t) => {
    setEnv(t, "MIGAKI_ROOT", noTaste);
    // Sitting inside a directory that *would* resolve proves the override is not
    // quietly falling back to the ancestor walk when it fails.
    useCwd(t, complete);

    const { resolveRepoRoot } = await loadContext();

    assert.throws(resolveRepoRoot, (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /MIGAKI_ROOT is set to /);
      assert.match(error.message, /contains no taste\/ directory/);
      assert.ok(error.message.includes(noTaste), "the error should name the offending path");
      return true;
    });
  });

  test("an empty MIGAKI_ROOT is treated as unset", async (t) => {
    setEnv(t, "MIGAKI_ROOT", "");
    useCwd(t, complete);

    const { resolveRepoRoot } = await loadContext();

    assert.equal(resolveRepoRoot(), complete);
  });

  test("without an override it walks up from the working directory", async (t) => {
    setEnv(t, "MIGAKI_ROOT", undefined);
    useCwd(t, join(complete, "packages", "app", "src"));

    const { resolveRepoRoot } = await loadContext();

    assert.equal(resolveRepoRoot(), complete);
  });

  test("the ancestor walk stops at the nearest root, not the outermost", async (t) => {
    // A taste/ directory nested inside another repo: the closer one must win.
    const inner = join(complete, "packages", "app");
    await writeFiles(inner, { "taste/core.md": "# inner core\n" });
    t.after(() => removeDir(join(inner, "taste")));

    setEnv(t, "MIGAKI_ROOT", undefined);
    useCwd(t, join(inner, "src"));

    const { resolveRepoRoot } = await loadContext();

    assert.equal(resolveRepoRoot(), inner);
  });

  test("the resolved root is cached after the first call", async (t) => {
    setEnv(t, "MIGAKI_ROOT", complete);
    useCwd(t, fixtures);

    const { resolveRepoRoot } = await loadContext();
    const first = resolveRepoRoot();

    // A later change to the environment must not re-open the question.
    process.env["MIGAKI_ROOT"] = noTaste;

    assert.equal(resolveRepoRoot(), first);
  });
});

describe("readTasteLayer", () => {
  test("returns the three files in principles-then-avoid-then-aim order", async (t) => {
    setEnv(t, "MIGAKI_ROOT", complete);

    const { readTasteLayer } = await loadContext();
    const files = await readTasteLayer();

    assert.deepEqual(
      files.map((file) => file.name),
      ["core.md", "slop.md", "edge.md"],
    );
    assert.ok(files.every((file) => file.ok));
    assert.match(fileNamed(files, "slop.md").content ?? "", /gradient heroes/);
  });

  test("reports a missing file per-file instead of throwing", async (t) => {
    setEnv(t, "MIGAKI_ROOT", partial);

    const { readTasteLayer } = await loadContext();
    const files = await readTasteLayer();

    const slop = fileNamed(files, "slop.md");
    assert.equal(slop.ok, false);
    assert.equal(slop.error, "file not found");

    // The partial layer still comes back — one absent file must not sink the rest.
    assert.equal(fileNamed(files, "core.md").ok, true);
    assert.equal(fileNamed(files, "edge.md").ok, true);
  });

  test("an empty file reads successfully rather than as an error", async (t) => {
    setEnv(t, "MIGAKI_ROOT", partial);

    const { readTasteLayer } = await loadContext();
    const edge = fileNamed(await readTasteLayer(), "edge.md");

    assert.equal(edge.ok, true);
    assert.equal((edge.content ?? "x").trim(), "");
  });

  test("every file is reported unavailable when the taste directory is empty", async (t) => {
    setEnv(t, "MIGAKI_ROOT", bare);

    const { readTasteLayer } = await loadContext();
    const files = await readTasteLayer();

    assert.equal(files.length, 3);
    assert.deepEqual(
      files.map((file) => file.error),
      ["file not found", "file not found", "file not found"],
    );
  });
});

describe("renderTasteLayer", () => {
  test("labels each file by name and path, and states the precedence rule", async (t) => {
    setEnv(t, "MIGAKI_ROOT", complete);

    const { readTasteLayer, renderTasteLayer } = await loadContext();
    const rendered = renderTasteLayer(await readTasteLayer());

    assert.match(rendered, /core\.md is invariant and always wins/);
    for (const name of ["core.md", "slop.md", "edge.md"]) {
      assert.ok(
        rendered.includes(`<file name="${name}" path="taste/${name}" status="ok">`),
        `${name} should be delimited with its own name and path`,
      );
    }
    assert.ok(
      rendered.indexOf("core.md") < rendered.indexOf("slop.md"),
      "core.md should be rendered before slop.md",
    );
  });

  test("an unavailable file is marked as such and carries its reason", async (t) => {
    setEnv(t, "MIGAKI_ROOT", partial);

    const { readTasteLayer, renderTasteLayer } = await loadContext();
    const rendered = renderTasteLayer(await readTasteLayer());

    assert.ok(rendered.includes('<file name="slop.md" path="taste/slop.md" status="unavailable">'));
    assert.match(rendered, /status="unavailable">\nfile not found\n<\/file>/);
    // The other two are still delivered.
    assert.ok(rendered.includes('name="core.md" path="taste/core.md" status="ok"'));
  });

  test("an empty file is called out rather than rendered as a blank block", async (t) => {
    setEnv(t, "MIGAKI_ROOT", partial);

    const { readTasteLayer, renderTasteLayer } = await loadContext();
    const rendered = renderTasteLayer(await readTasteLayer());

    assert.match(rendered, /status="ok">\n\(this file is currently empty\)\n<\/file>/);
  });
});

describe("registerContextTool", () => {
  test("registers a read-only tool named context that takes no input", async (t) => {
    setEnv(t, "MIGAKI_ROOT", complete);

    const { registerContextTool } = await loadContext();
    const { server, tools } = captureRegistrations();
    registerContextTool(server);

    const tool = toolNamed(tools, "context");
    assert.deepEqual(tool.config["annotations"], { readOnlyHint: true, openWorldHint: false });
    assert.equal(tool.config["inputSchema"], undefined);
  });

  test("returns the rendered taste layer", async (t) => {
    setEnv(t, "MIGAKI_ROOT", complete);

    const { registerContextTool } = await loadContext();
    const { server, tools } = captureRegistrations();
    registerContextTool(server);

    const result = await toolNamed(tools, "context").handler();

    assert.notEqual(result.isError, true);
    assert.match(textOf(result), /<taste-layer>/);
    assert.match(textOf(result), /Restrained, physical motion\./);
  });

  test("a partial layer is still a success", async (t) => {
    setEnv(t, "MIGAKI_ROOT", partial);

    const { registerContextTool } = await loadContext();
    const { server, tools } = captureRegistrations();
    registerContextTool(server);

    const result = await toolNamed(tools, "context").handler();

    assert.notEqual(result.isError, true);
    assert.match(textOf(result), /status="unavailable"/);
  });

  test("errors structurally when no taste file can be read", async (t) => {
    setEnv(t, "MIGAKI_ROOT", bare);

    const { registerContextTool } = await loadContext();
    const { server, tools } = captureRegistrations();
    registerContextTool(server);

    const result = await toolNamed(tools, "context").handler();

    assert.equal(result.isError, true);
    const text = textOf(result);
    assert.match(text, /Could not read the taste layer\./);
    assert.match(text, /taste\/core\.md: file not found/);
    assert.match(text, /taste\/edge\.md: file not found/);
  });

  test("a root that cannot be resolved is returned as an error, never thrown", async (t) => {
    setEnv(t, "MIGAKI_ROOT", noTaste);

    const { registerContextTool } = await loadContext();
    const { server, tools } = captureRegistrations();
    registerContextTool(server);

    const result = await toolNamed(tools, "context").handler();

    assert.equal(result.isError, true);
    assert.match(textOf(result), /^context failed: MIGAKI_ROOT is set to /);
  });
});
