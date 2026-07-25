import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const TASTE_DIR = "taste";

/** Order is meaningful: principles first, then what to avoid, then where to aim. */
const TASTE_FILES = ["core.md", "slop.md", "edge.md"] as const;

type TasteFileName = (typeof TASTE_FILES)[number];

type TasteFile =
  | { readonly name: TasteFileName; readonly ok: true; readonly content: string }
  | { readonly name: TasteFileName; readonly ok: false; readonly error: string };

const PREAMBLE = [
  "The migaki taste layer. Apply it to any UI you generate or edit.",
  "core.md is invariant and always wins. slop.md is what to avoid. edge.md is current direction and expires.",
].join("\n");

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Summarises a filesystem failure without echoing the absolute path back to
 * the caller — the agent already knows which file it asked for.
 */
const describeFileError = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };
    if (code === "ENOENT") return "file not found";
    if (code === "EACCES" || code === "EPERM") return "permission denied";
    if (code === "EISDIR") return "path is a directory, not a file";
    if (typeof code === "string") return `read failed (${code})`;
  }
  return "read failed";
};

const hasTasteDir = (dir: string): boolean => existsSync(join(dir, TASTE_DIR));

const searchUpward = (start: string): string | undefined => {
  let current = resolve(start);
  for (;;) {
    if (hasTasteDir(current)) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
};

let cachedRoot: string | undefined;

/**
 * Resolves the repo root, so taste files are always addressed from the root
 * rather than relative to wherever this module happens to be executing from.
 *
 * `MIGAKI_ROOT` wins when set — the deployed image may not carry a full repo.
 */
export const resolveRepoRoot = (): string => {
  if (cachedRoot !== undefined) return cachedRoot;

  const override = process.env["MIGAKI_ROOT"];
  if (override !== undefined && override !== "") {
    const root = resolve(override);
    if (!hasTasteDir(root)) {
      throw new Error(`MIGAKI_ROOT is set to ${root}, but it contains no ${TASTE_DIR}/ directory`);
    }
    cachedRoot = root;
    return root;
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const found = searchUpward(process.cwd()) ?? searchUpward(moduleDir);
  if (found === undefined) {
    throw new Error(
      `Could not locate the migaki repo root: no ancestor of ${process.cwd()} or ${moduleDir} contains a ${TASTE_DIR}/ directory. Set MIGAKI_ROOT to the repo root.`,
    );
  }

  cachedRoot = found;
  return found;
};

/**
 * Reads all three taste files. A file that cannot be read is reported in place
 * rather than failing the whole read — a partial taste layer still beats none.
 */
export const readTasteLayer = async (): Promise<readonly TasteFile[]> => {
  const tasteDir = join(resolveRepoRoot(), TASTE_DIR);

  return Promise.all(
    TASTE_FILES.map(async (name): Promise<TasteFile> => {
      try {
        const content = await readFile(join(tasteDir, name), "utf8");
        return { name, ok: true, content };
      } catch (error: unknown) {
        return { name, ok: false, error: describeFileError(error) };
      }
    }),
  );
};

const renderFile = (file: TasteFile): string => {
  const path = `${TASTE_DIR}/${file.name}`;
  if (!file.ok) {
    return `<file name="${file.name}" path="${path}" status="unavailable">\n${file.error}\n</file>`;
  }
  const body = file.content.trim() === "" ? "(this file is currently empty)" : file.content.trimEnd();
  return `<file name="${file.name}" path="${path}" status="ok">\n${body}\n</file>`;
};

/** Delimited by filename so the calling agent can tell the three files apart. */
export const renderTasteLayer = (files: readonly TasteFile[]): string =>
  `${PREAMBLE}\n\n<taste-layer>\n${files.map(renderFile).join("\n\n")}\n</taste-layer>`;

export const registerContextTool = (server: McpServer): void => {
  server.registerTool(
    "context",
    {
      title: "Get the migaki taste layer",
      description:
        "Returns the full migaki taste layer: core.md (timeless perceptual principles), " +
        "slop.md (patterns that currently read as AI-generated), and edge.md (what currently " +
        "reads as excellent). Call this before generating or editing any UI.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const files = await readTasteLayer();
        const unreadable = files.filter((file) => !file.ok);

        if (unreadable.length === files.length) {
          const detail = unreadable
            .map((file) => (file.ok ? "" : `${TASTE_DIR}/${file.name}: ${file.error}`))
            .join("\n");
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Could not read the taste layer.\n${detail}` }],
          };
        }

        return { content: [{ type: "text" as const, text: renderTasteLayer(files) }] };
      } catch (error: unknown) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `context failed: ${describeError(error)}` }],
        };
      }
    },
  );
};
