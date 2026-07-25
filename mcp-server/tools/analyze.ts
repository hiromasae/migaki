import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Bounds on the walk, so a huge or hostile tree cannot stall the server. */
const MAX_DEPTH = 6;
const MAX_FILES = 20_000;
const MAX_CONFIG_BYTES = 256 * 1024;
const MAX_STYLESHEETS = 12;
const MAX_MANIFESTS = 10;
const MAX_TOKENS_LISTED = 24;

/** Never descended into: build output, dependencies, and caches say nothing about intent. */
const SKIP_DIRS: ReadonlySet<string> = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", ".next", ".nuxt",
  ".svelte-kit", ".output", "coverage", "vendor", "__pycache__", ".venv", "venv",
  "target", ".turbo", ".cache", "Pods", ".gradle", ".idea", ".vscode", "tmp",
]);

const COMPONENT_EXTENSIONS: readonly string[] = [".tsx", ".jsx", ".vue", ".svelte"];
const STYLESHEET_EXTENSIONS: readonly string[] = [".css", ".scss", ".sass", ".less"];

/** Stylesheets most likely to hold the design tokens, tried in this order. */
const TOKEN_FILE_HINTS: readonly string[] = [
  "globals", "global", "index", "app", "theme", "tokens", "variables", "styles", "main",
];

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const describeFsError = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };
    if (code === "ENOENT") return "path does not exist";
    if (code === "EACCES" || code === "EPERM") return "permission denied";
    if (code === "ENOTDIR") return "path is not a directory";
    if (typeof code === "string") return `could not read path (${code})`;
  }
  return "could not read path";
};

type FileTree = {
  readonly files: readonly string[];
  readonly truncated: boolean;
};

/** Breadth-first, bounded, and never follows into ignored directories. */
const walk = async (root: string): Promise<FileTree> => {
  const files: string[] = [];
  const queue: Array<{ readonly dir: string; readonly depth: number }> = [{ dir: root, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (current.depth > MAX_DEPTH) continue;

    let entries;
    try {
      entries = await readdir(current.dir, { withFileTypes: true });
    } catch {
      continue; // An unreadable subdirectory should not fail the whole analysis.
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) return { files, truncated: true };
      const full = join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        queue.push({ dir: full, depth: current.depth + 1 });
      } else if (entry.isFile()) {
        files.push(relative(root, full));
      }
    }
  }

  return { files, truncated: false };
};

/** Reads a known config or style file. Size-capped; never reads anything not asked for by name. */
const readTextFile = async (root: string, relPath: string): Promise<string | undefined> => {
  try {
    const full = join(root, relPath);
    const info = await stat(full);
    if (!info.isFile() || info.size > MAX_CONFIG_BYTES) return undefined;
    return await readFile(full, "utf8");
  } catch {
    return undefined;
  }
};

const parseJson = (raw: string | undefined): unknown => {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
};

/** Collects dependency names from every dependency section, without trusting the shape. */
const dependencyNames = (pkg: unknown): ReadonlySet<string> => {
  const names = new Set<string>();
  if (typeof pkg !== "object" || pkg === null) return names;
  const record = pkg as Record<string, unknown>;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const section = record[field];
    if (typeof section === "object" && section !== null) {
      for (const name of Object.keys(section as Record<string, unknown>)) names.add(name);
    }
  }
  return names;
};

type Match = readonly [dependency: string, label: string];

const LANGUAGES: readonly Match[] = [["typescript", "TypeScript"]];

const FRAMEWORKS: readonly Match[] = [
  ["next", "Next.js"], ["nuxt", "Nuxt"], ["@remix-run/react", "Remix"], ["gatsby", "Gatsby"],
  ["astro", "Astro"], ["@angular/core", "Angular"], ["expo", "Expo"], ["react-native", "React Native"],
  ["electron", "Electron"], ["@sveltejs/kit", "SvelteKit"], ["svelte", "Svelte"],
  ["vue", "Vue"], ["solid-js", "Solid"], ["react", "React"],
];

/**
 * Framework signals that are visible in filenames alone. These carry the whole
 * detection in tree mode, where dependency manifests cannot be read.
 */
const FRAMEWORK_MARKERS: readonly (readonly [pattern: RegExp, label: string])[] = [
  [/(^|\/)next\.config\.(ts|js|mjs|cjs)$/, "Next.js"],
  [/(^|\/)nuxt\.config\.(ts|js|mjs)$/, "Nuxt"],
  [/(^|\/)angular\.json$/, "Angular"],
  [/(^|\/)svelte\.config\.(ts|js|mjs)$/, "Svelte / SvelteKit"],
  [/(^|\/)astro\.config\.(ts|js|mjs)$/, "Astro"],
  [/(^|\/)remix\.config\.(ts|js)$/, "Remix"],
  [/(^|\/)gatsby-config\.(ts|js)$/, "Gatsby"],
  [/(^|\/)app\.config\.(ts|js)$/, "Expo"],
  [/(^|\/)metro\.config\.(ts|js)$/, "React Native"],
  [/(^|\/)pubspec\.yaml$/, "Flutter"],
  [/(^|\/)vite\.config\.(ts|js|mjs)$/, "Vite"],
];

const STYLING: readonly Match[] = [
  ["tailwindcss", "Tailwind CSS"], ["styled-components", "styled-components"],
  ["@emotion/react", "Emotion"], ["@vanilla-extract/css", "vanilla-extract"],
  ["@stitches/react", "Stitches"], ["@pandacss/dev", "Panda CSS"], ["unocss", "UnoCSS"],
  ["sass", "Sass"], ["less", "Less"], ["@linaria/core", "Linaria"],
];

const COMPONENT_LIBRARIES: readonly Match[] = [
  ["@subframe/core", "Subframe"], ["@mui/material", "MUI"], ["antd", "Ant Design"],
  ["@chakra-ui/react", "Chakra UI"], ["@mantine/core", "Mantine"], ["@nextui-org/react", "NextUI"],
  ["@heroui/react", "HeroUI"], ["daisyui", "daisyUI"], ["react-bootstrap", "React Bootstrap"],
  ["bootstrap", "Bootstrap"], ["primereact", "PrimeReact"], ["vuetify", "Vuetify"],
  ["quasar", "Quasar"], ["@headlessui/react", "Headless UI"], ["@ark-ui/react", "Ark UI"],
  ["@base-ui-components/react", "Base UI"],
];

const matched = (deps: ReadonlySet<string>, table: readonly Match[]): readonly string[] =>
  table.filter(([dependency]) => deps.has(dependency)).map(([, label]) => label);

/**
 * Cleans a caller-supplied tree so it behaves like the output of the internal walk:
 * forward slashes, no leading `./`, ignored directories dropped, and any shared
 * absolute prefix removed so `src/components/...` checks still match.
 */
const normalizeTree = (entries: readonly string[]): FileTree => {
  const cleaned = entries
    .map((entry) => entry.trim().replace(/\\/g, "/").replace(/^\.\//, ""))
    .filter((entry) => entry !== "" && !entry.endsWith("/"))
    .filter((entry) => !entry.split("/").some((segment) => SKIP_DIRS.has(segment)));

  const truncated = cleaned.length > MAX_FILES;
  const bounded = truncated ? cleaned.slice(0, MAX_FILES) : cleaned;

  // Strip the deepest directory prefix shared by every entry, so absolute paths
  // from the caller's machine collapse to repo-relative ones.
  const split = bounded.map((entry) => entry.split("/"));
  const first = split[0];
  let shared = 0;
  if (first !== undefined && split.length > 0) {
    while (shared < first.length - 1) {
      const segment = first[shared];
      if (segment === undefined) break;
      if (!split.every((parts) => parts.length > shared + 1 && parts[shared] === segment)) break;
      shared += 1;
    }
  }

  const files = split.map((parts) => parts.slice(shared).join("/")).filter((entry) => entry !== "");
  return { files, truncated };
};

/** One line of the report: either a finding with its evidence, or an explicit miss. */
type Finding = {
  readonly label: string;
  readonly value: string | undefined;
  readonly evidence: readonly string[];
  readonly checked: string;
};

const renderFinding = (finding: Finding): string => {
  if (finding.value === undefined) {
    return `${finding.label}: not detected (checked ${finding.checked})`;
  }
  const evidence = finding.evidence.length > 0 ? ` [evidence: ${finding.evidence.join(", ")}]` : "";
  return `${finding.label}: ${finding.value}${evidence}`;
};

const filesWithExtension = (files: readonly string[], extensions: readonly string[]): readonly string[] =>
  files.filter((file) => extensions.some((extension) => file.endsWith(extension)));

/** Ranks stylesheets so the ones that usually hold tokens are read first. */
const rankStylesheets = (stylesheets: readonly string[]): readonly string[] =>
  [...stylesheets]
    .sort((a, b) => {
      const score = (file: string): number => {
        const name = basename(file).replace(/\.[^.]+$/, "").toLowerCase();
        const hint = TOKEN_FILE_HINTS.indexOf(name);
        return hint === -1 ? TOKEN_FILE_HINTS.length : hint;
      };
      return score(a) - score(b) || a.length - b.length;
    })
    .slice(0, MAX_STYLESHEETS);

const CASE_PATTERNS: readonly (readonly [name: string, test: RegExp])[] = [
  ["PascalCase", /^[A-Z][A-Za-z0-9]*$/],
  ["kebab-case", /^[a-z0-9]+(-[a-z0-9]+)+$/],
  ["camelCase", /^[a-z][A-Za-z0-9]*$/],
  ["snake_case", /^[a-z0-9]+(_[a-z0-9]+)+$/],
];

/** Reports the dominant filename casing for component files, with the counts behind it. */
const namingConvention = (componentFiles: readonly string[]): Finding => {
  const counts = new Map<string, number>();
  for (const file of componentFiles) {
    const stem = basename(file).replace(/\.[^.]+$/, "").replace(/\.(module|test|spec|stories)$/, "");
    const pattern = CASE_PATTERNS.find(([, test]) => test.test(stem));
    if (pattern !== undefined) counts.set(pattern[0], (counts.get(pattern[0]) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  if (top === undefined) {
    return {
      label: "Component file naming",
      value: undefined,
      evidence: [],
      checked: "filenames of .tsx/.jsx/.vue/.svelte files",
    };
  }
  return {
    label: "Component file naming",
    value: top[0],
    evidence: ranked.map(([name, count]) => `${name} ×${count}`),
    checked: "",
  };
};

/** Extracts declared CSS custom properties — the most reliable token signal there is. */
const extractCustomProperties = (css: string): readonly string[] => {
  const names = new Set<string>();
  for (const match of css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  return [...names];
};

type Mode = "filesystem" | "tree";

/** Returns a file's text, or undefined when contents are unavailable (tree mode). */
type TextReader = (relPath: string) => Promise<string | undefined>;

type Analysis = {
  readonly mode: Mode;
  readonly findings: readonly Finding[];
  readonly notes: readonly string[];
  readonly stackLine: string | undefined;
};

const analyzeProject = async (
  tree: FileTree,
  readText: TextReader,
  mode: Mode,
): Promise<Analysis> => {
  const { files, truncated } = tree;
  const notes: string[] = [];
  if (truncated) notes.push(`Stopped at ${MAX_FILES} files; analysis may be partial.`);
  if (files.length === 0) {
    notes.push(
      mode === "tree"
        ? "The supplied tree contained no usable file paths (after dropping build and dependency directories)."
        : "No files found below the given path (after skipping build and dependency directories).",
    );
  }
  if (mode === "tree") {
    notes.push(
      "Source: caller-supplied file tree. Only paths were available, not file contents — " +
        "so dependency-based detection and design tokens are inferred from filenames alone, " +
        "or reported as not detected. Call with `path` instead when migaki runs on the same " +
        "machine as the repo for a fuller analysis.",
    );
  }

  // Dependencies are unioned across every manifest in the tree (root first), so a
  // monorepo whose UI package sits in apps/web is still detected.
  const manifests = files
    .filter((file) => basename(file) === "package.json")
    .sort((a, b) => a.split("/").length - b.split("/").length)
    .slice(0, MAX_MANIFESTS);

  const deps = new Set<string>();
  const manifestSources: string[] = [];
  for (const manifest of manifests) {
    const parsed = parseJson(await readText(manifest));
    const names = dependencyNames(parsed);
    if (names.size > 0) manifestSources.push(manifest);
    for (const name of names) deps.add(name);
  }
  const depsAvailable = manifestSources.length > 0;

  const findings: Finding[] = [];

  // --- Language -----------------------------------------------------------
  // tsconfig.json and package.json are matched anywhere in the tree, not just at
  // the root: in a monorepo the manifests sit one level down.
  const tsconfigs = files.filter((file) => basename(file) === "tsconfig.json");
  const typescriptSources = filesWithExtension(files, [".ts", ".tsx", ".mts", ".cts"]);
  const javascriptSources = filesWithExtension(files, [".js", ".jsx", ".mjs", ".cjs"]);

  const languageHits: string[] = [];
  const languageEvidence: string[] = [];
  if (matched(deps, LANGUAGES).length > 0 || tsconfigs.length > 0 || typescriptSources.length > 0) {
    languageHits.push("TypeScript");
    if (tsconfigs[0] !== undefined) languageEvidence.push(tsconfigs[0]);
    if (typescriptSources.length > 0) languageEvidence.push(`${typescriptSources.length} .ts/.tsx file(s)`);
  }
  if (javascriptSources.length > 0) {
    languageHits.push("JavaScript");
    languageEvidence.push(`${javascriptSources.length} .js/.jsx file(s)`);
  }
  if (filesWithExtension(files, [".py"]).length > 0) languageHits.push("Python");
  if (files.some((file) => basename(file) === "go.mod")) languageHits.push("Go");
  if (files.some((file) => basename(file) === "Cargo.toml")) languageHits.push("Rust");
  if (filesWithExtension(files, [".swift"]).length > 0) languageHits.push("Swift");

  findings.push({
    label: "Language",
    value: languageHits.length > 0 ? languageHits.join(", ") : undefined,
    evidence: languageEvidence,
    checked: "tsconfig.json anywhere in the tree, package.json, and source file extensions",
  });

  // --- Framework ----------------------------------------------------------
  // Config-file markers are checked alongside dependencies, so this still works
  // when only paths are available.
  const markerHits: string[] = [];
  const markerFiles: string[] = [];
  for (const [pattern, label] of FRAMEWORK_MARKERS) {
    const hit = files.find((file) => pattern.test(file));
    if (hit !== undefined && !markerHits.includes(label)) {
      markerHits.push(label);
      markerFiles.push(hit);
    }
  }
  if (filesWithExtension(files, [".vue"]).length > 0 && !markerHits.includes("Vue")) markerHits.push("Vue");
  if (filesWithExtension(files, [".svelte"]).length > 0 && !markerHits.some((h) => h.startsWith("Svelte"))) {
    markerHits.push("Svelte");
  }

  const frameworks = [...new Set([...matched(deps, FRAMEWORKS), ...markerHits])];
  findings.push({
    label: "Framework",
    value: frameworks.length > 0 ? frameworks.join(" + ") : undefined,
    evidence: [...manifestSources, ...markerFiles],
    checked: depsAvailable
      ? `dependencies in ${manifests.length} manifest(s), framework config files, and .vue/.svelte files`
      : "framework config files and .vue/.svelte files (no readable dependency manifest)",
  });

  // --- Styling ------------------------------------------------------------
  const stylesheets = filesWithExtension(files, STYLESHEET_EXTENSIONS);
  const stylingHits: string[] = [...matched(deps, STYLING)];
  const tailwindConfig = files.find((file) => /(^|\/)tailwind\.config\.(ts|js|mjs|cjs)$/.test(file));
  // A tailwind config is proof of Tailwind on its own — the dependency may not be
  // readable (tree mode), and without this a Tailwind project reads as plain CSS.
  if (tailwindConfig !== undefined && !stylingHits.includes("Tailwind CSS")) {
    stylingHits.unshift("Tailwind CSS");
  }
  const cssModules = files.filter((file) => file.includes(".module.")).length;
  if (cssModules > 0) stylingHits.push(`CSS Modules (${cssModules} files)`);
  if (stylingHits.length === 0 && stylesheets.length > 0) stylingHits.push("plain CSS");
  findings.push({
    label: "Styling",
    value: stylingHits.length > 0 ? stylingHits.join(", ") : undefined,
    evidence: [
      tailwindConfig ?? "",
      stylesheets.length > 0 ? `${stylesheets.length} stylesheet(s)` : "",
      ...manifestSources,
    ].filter((e) => e !== ""),
    checked: depsAvailable
      ? "package.json dependencies, tailwind config, .module.* files, stylesheet extensions"
      : "tailwind config, .module.* files, stylesheet extensions (no readable dependency manifest)",
  });

  // --- Component library --------------------------------------------------
  const libraries: string[] = [...matched(deps, COMPONENT_LIBRARIES)];
  const shadcnConfig = files.some((file) => basename(file) === "components.json");
  if (shadcnConfig) libraries.push("shadcn/ui");
  if (deps.has("@radix-ui/react-dialog") || [...deps].some((d) => d.startsWith("@radix-ui/"))) {
    libraries.push("Radix UI primitives");
  }
  findings.push({
    label: "Component library",
    value: libraries.length > 0 ? libraries.join(", ") : undefined,
    evidence: shadcnConfig ? ["components.json"] : [],
    checked: depsAvailable
      ? "package.json dependencies and components.json"
      : "components.json (no readable dependency manifest)",
  });

  // --- Design tokens ------------------------------------------------------
  const tokenNames = new Set<string>();
  const tokenSources: string[] = [];
  let tailwindV4Theme = false;
  for (const sheet of rankStylesheets(stylesheets)) {
    const css = await readText(sheet);
    if (css === undefined) continue;
    if (css.includes("@theme")) tailwindV4Theme = true;
    const properties = extractCustomProperties(css);
    if (properties.length > 0) {
      tokenSources.push(sheet);
      for (const property of properties) tokenNames.add(property);
    }
  }
  const tailwindExtends = tailwindConfig !== undefined
    ? (await readText(tailwindConfig))?.includes("extend") === true
    : false;

  const tokenSummary: string[] = [];
  if (tokenNames.size > 0) {
    const listed = [...tokenNames].slice(0, MAX_TOKENS_LISTED);
    const overflow = tokenNames.size - listed.length;
    tokenSummary.push(`${tokenNames.size} CSS custom properties (${listed.join(", ")}${overflow > 0 ? `, +${overflow} more` : ""})`);
  }
  if (tailwindV4Theme) tokenSummary.push("Tailwind v4 @theme block");
  if (tailwindExtends) tokenSummary.push(`theme.extend in ${tailwindConfig ?? "tailwind config"}`);
  findings.push({
    label: "Design tokens / spacing",
    value: tokenSummary.length > 0 ? tokenSummary.join("; ") : undefined,
    evidence: tokenSources,
    checked: mode === "tree"
      ? "nothing — design tokens live inside files, which a path-only tree cannot supply"
      : "CSS custom properties in stylesheets, tailwind theme config, @theme blocks",
  });

  // --- Established patterns ----------------------------------------------
  const componentFiles = filesWithExtension(files, COMPONENT_EXTENSIONS);
  const componentDirs = ["src/components", "components", "app/components", "src/app/components", "lib/components"]
    .filter((dir) => files.some((file) => file.startsWith(`${dir}/`)));
  const hasUiDir = files.some((file) => file.includes("components/ui/"));
  const hasStorybook = files.some((file) => file.includes(".stories.")) || files.some((f) => f.startsWith(".storybook/"));
  const hasTests = files.some((file) => /\.(test|spec)\./.test(file));

  findings.push({
    label: "Component layout",
    value: componentDirs.length > 0 || hasUiDir
      ? [...componentDirs, hasUiDir ? "components/ui/ (primitive layer)" : ""].filter((d) => d !== "").join(", ")
      : undefined,
    evidence: [`${componentFiles.length} component file(s)`],
    checked: "conventional component directory paths",
  });
  findings.push(namingConvention(componentFiles));
  findings.push({
    label: "Tooling",
    value: [hasStorybook ? "Storybook" : "", hasTests ? "tests present" : ""].filter((t) => t !== "").join(", ") || undefined,
    evidence: [],
    checked: "*.stories.*, .storybook/, *.test.*, *.spec.*",
  });

  // A ready-made value for the `review` tool's `stack` parameter.
  const stackParts = [frameworks[0], stylingHits[0], libraries[0]].filter((part): part is string => part !== undefined);
  const stackLine = stackParts.length > 0 ? stackParts.join(" + ") : undefined;

  return { mode, findings, notes, stackLine };
};

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderAnalysis = (analysis: Analysis, subject: string): string => {
  const lines = analysis.findings.map(renderFinding).map((line) => `- ${line}`);
  const notes = analysis.notes.length > 0 ? `\n\nNotes:\n${analysis.notes.map((n) => `- ${n}`).join("\n")}` : "";
  const stack = analysis.stackLine === undefined
    ? "\n\nSuggested `stack` value for the review tool: none — too little detected to summarise."
    : `\n\nSuggested \`stack\` value for the review tool: "${analysis.stackLine}"`;

  const attribute = analysis.mode === "tree"
    ? `source="tree" files="${escapeAttribute(subject)}"`
    : `source="filesystem" path="${escapeAttribute(subject)}"`;

  return `<project-analysis ${attribute}>\n${lines.join("\n")}${notes}${stack}\n</project-analysis>`;
};

export const registerAnalyzeTool = (server: McpServer): void => {
  server.registerTool(
    "analyze",
    {
      title: "Analyze a project's stack and conventions",
      description:
        "Reports a project's inferred stack, styling approach, component library, design tokens, " +
        "and established conventions — so UI generated for it matches what is already there. " +
        "Supply `tree` (a list of file paths) when migaki runs remotely and cannot see the repo; " +
        "supply `path` when it runs on the same machine, which also lets it read file contents for " +
        "a fuller analysis. Anything that cannot be inferred is reported as not detected rather " +
        "than guessed. Returns a suggested value for the review tool's `stack` parameter.",
      inputSchema: {
        path: z
          .string()
          .min(1, "path must not be empty")
          .optional()
          .describe(
            "Path to the repository root, read from the machine running migaki. " +
              "Use only when the server is local to the repo. Ignored if `tree` is given.",
          ),
        tree: z
          .array(z.string())
          .min(1, "tree must contain at least one path")
          .optional()
          .describe(
            "The repository's file paths, e.g. the output of `git ls-files`. Use this when " +
              "migaki runs remotely. Paths may be absolute or relative; a shared prefix is stripped.",
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path, tree }) => {
      try {
        // `tree` wins: the caller can see their own repo, the server may not.
        if (tree !== undefined) {
          const normalized = normalizeTree(tree);
          const analysis = await analyzeProject(normalized, async () => undefined, "tree");
          const subject = `${normalized.files.length} path(s)`;
          return { content: [{ type: "text" as const, text: renderAnalysis(analysis, subject) }] };
        }

        if (path === undefined) {
          return {
            isError: true,
            content: [{
              type: "text" as const,
              text:
                "analyze failed: supply either `tree` (a list of the repository's file paths — use " +
                "this when migaki runs remotely) or `path` (a directory on the machine running " +
                "migaki). Neither was provided.",
            }],
          };
        }

        const root = resolve(path);

        let info;
        try {
          info = await stat(root);
        } catch (error: unknown) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `analyze failed: ${describeFsError(error)}: ${path}. If migaki is running remotely it cannot see your filesystem — pass \`tree\` instead.` }],
          };
        }
        if (!info.isDirectory()) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `analyze failed: ${path} is not a directory. Pass the repository root.` }],
          };
        }

        const walked = await walk(root);
        const analysis = await analyzeProject(walked, (relPath) => readTextFile(root, relPath), "filesystem");
        return { content: [{ type: "text" as const, text: renderAnalysis(analysis, path) }] };
      } catch (error: unknown) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `analyze failed: ${describeError(error)}` }],
        };
      }
    },
  );
};
