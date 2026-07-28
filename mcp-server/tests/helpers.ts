import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { TestContext } from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** The shape every tool handler in this repo returns. Never thrown, always returned. */
export type ToolResult = {
  readonly isError?: boolean;
  readonly content: readonly { readonly type: string; readonly text?: string }[];
};

export type ToolHandler = (args?: Record<string, unknown>) => Promise<ToolResult>;

export type RegisteredTool = {
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly handler: ToolHandler;
};

/**
 * Stands in for an McpServer. The register*Tool functions hand their handler to
 * the server rather than exporting it, so capturing the registration is the only
 * way to reach the handler — and it keeps the SDK out of the test at runtime.
 */
export const captureRegistrations = (): {
  readonly server: McpServer;
  readonly tools: Map<string, RegisteredTool>;
} => {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    registerTool: (name: string, config: Record<string, unknown>, handler: ToolHandler): void => {
      tools.set(name, { name, config, handler });
    },
  };
  return { server: server as unknown as McpServer, tools };
};

/** Fetches a registered tool, failing loudly rather than returning undefined. */
export const toolNamed = (tools: Map<string, RegisteredTool>, name: string): RegisteredTool => {
  const tool = tools.get(name);
  if (tool === undefined) throw new Error(`no tool named "${name}" was registered`);
  return tool;
};

export const textOf = (result: ToolResult): string =>
  result.content.map((part) => part.text ?? "").join("\n");

/**
 * A temp directory, realpath-resolved so comparisons against `process.cwd()`
 * hold on platforms where the temp root is itself a symlink.
 */
export const makeTempDir = async (prefix: string): Promise<string> =>
  realpath(await mkdtemp(join(tmpdir(), `${prefix}-`)));

/** Writes a fixture tree from a map of repo-relative path to contents. */
export const writeFiles = async (
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<string> => {
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(root, relPath);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
  }
  return root;
};

export const removeDir = (dir: string): Promise<void> => rm(dir, { recursive: true, force: true });

/** Sets an environment variable for one test, restoring it afterwards. */
export const setEnv = (t: TestContext, name: string, value: string | undefined): void => {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  });
};

/** Changes the working directory for one test, restoring it afterwards. */
export const useCwd = (t: TestContext, dir: string): void => {
  const previous = process.cwd();
  process.chdir(dir);
  t.after(() => process.chdir(previous));
};
