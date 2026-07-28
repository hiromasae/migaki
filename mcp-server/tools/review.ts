import Anthropic, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readTasteLayer } from "./context.js";

const MODEL = "claude-sonnet-4-6";

/**
 * Generous enough that a long critique plus adaptive thinking never truncates,
 * and low enough to stay well inside the SDK's non-streaming HTTP timeout.
 */
const MAX_TOKENS = 16000;

/** The role and rules. Prefixes the taste layer; both are stable across requests. */
const REVIEWER_PREAMBLE = [
  "You are a UI code reviewer with access to the migaki taste layer. Your job is to review the",
  "submitted code and return a critique in exactly the format below. Be direct and technical.",
  "This is a code review, not a coaching session. Every flag must be specific enough that the",
  "developer can fix it without asking a follow-up question.",
].join(" ");

/** The output contract. Sent after the code, so the format is the last thing read. */
const CRITIQUE_FORMAT = `Return your critique in exactly this format and no other:

## Flags
For each pattern from slop.md you identify in the code, write one block:
**[Exact pattern name from slop.md]**
Where: [one sentence describing exactly where in the code this appears, with line reference if possible]
Fix: [specific, actionable alternative — not general advice]

If no slop.md patterns are present, write: "No flags."

## What's working
One to three things the code does well, referenced against edge.md entries where relevant. If nothing is notable, write one sentence saying so — do not pad.

## Elevations
Only include this section if the code is already doing something well that could be pushed further with a small, specific change — not a structural rethink. If that condition is not met, omit this section entirely. When included: name the edge.md pattern, describe the gap, give the specific change.`;

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Maps SDK error classes to messages an agent can act on. Ordered most specific
 * first — every concrete class below also satisfies `instanceof APIError`.
 */
const describeApiError = (error: unknown): string => {
  if (error instanceof AuthenticationError) {
    return "the Anthropic API rejected the credentials (401). Check ANTHROPIC_API_KEY.";
  }
  if (error instanceof PermissionDeniedError) {
    return `the API key is not permitted to use ${MODEL} (403).`;
  }
  if (error instanceof NotFoundError) {
    return `the model ${MODEL} was not found (404). The API key may not have access to it.`;
  }
  if (error instanceof RateLimitError) {
    return "the Anthropic API rate limit was exceeded (429). Retry in a few seconds.";
  }
  if (error instanceof BadRequestError) {
    return `the Anthropic API rejected the request (400): ${error.message}`;
  }
  if (error instanceof APIConnectionError) {
    return `could not reach the Anthropic API: ${error.message}`;
  }
  if (error instanceof APIError) {
    return `the Anthropic API returned an error (${error.status ?? "unknown status"}): ${error.message}`;
  }
  return describeError(error);
};

/** Minimal XML attribute escaping so an odd `stack` value cannot break the tag. */
const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Reads the three taste files and renders them into a single `<taste_layer>`
 * block. All three are required: the critique format names slop.md and edge.md
 * directly, so a partial layer would silently produce a partial review.
 */
const loadTasteLayer = async (): Promise<string> => {
  const files = await readTasteLayer();

  const unreadable = files.filter((file) => !file.ok);
  if (unreadable.length > 0) {
    const detail = unreadable
      .map((file) => (file.ok ? "" : `taste/${file.name}: ${file.error}`))
      .join("; ");
    throw new Error(`the taste layer is incomplete (${detail})`);
  }

  const empty = files.filter((file) => file.ok && file.content.trim() === "");
  if (empty.length > 0) {
    const names = empty.map((file) => `taste/${file.name}`).join(", ");
    throw new Error(`the taste layer is empty (${names})`);
  }

  const body = files
    .map((file) => (file.ok ? file.content.trimEnd() : ""))
    .join("\n\n");

  return `<taste_layer>\n${body}\n</taste_layer>`;
};

let tasteLayerPromise: Promise<string> | undefined;

/**
 * Loads the taste layer once and reuses it for every request. A failed load is
 * not cached, so a transient filesystem error at boot does not disable the tool
 * for the life of the process.
 */
const getTasteLayer = (): Promise<string> => {
  if (tasteLayerPromise === undefined) {
    tasteLayerPromise = loadTasteLayer().catch((error: unknown) => {
      tasteLayerPromise = undefined;
      throw error;
    });
  }
  return tasteLayerPromise;
};

/** Called at startup so the disk read happens before the first request. */
export const primeTasteLayer = (): Promise<string> => getTasteLayer();

let client: Anthropic | undefined;

const getClient = (): Anthropic => {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    throw new Error("ANTHROPIC_API_KEY is not set, so review cannot call the Claude API.");
  }
  if (client === undefined) {
    client = new Anthropic({ apiKey });
  }
  return client;
};

/** The `stack` attribute is omitted entirely when the caller did not supply one. */
const renderSubmittedCode = (code: string, stack: string | undefined): string => {
  const openingTag =
    stack === undefined || stack.trim() === ""
      ? "<submitted_code>"
      : `<submitted_code stack="${escapeAttribute(stack.trim())}">`;
  return `${openingTag}\n${code}\n</submitted_code>`;
};

const requestCritique = async (code: string, stack: string | undefined): Promise<string> => {
  const tasteLayer = await getTasteLayer();

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    // Effort defaults to `high`, which spent ~4,200 thinking tokens per review to
    // produce a critique no longer or sharper than `medium` returns with almost
    // none: 92s versus 19s, 8 flags versus 7. Reviews run inside an agent's tool
    // call, and many MCP clients time out at 60s, so the latency is the binding
    // constraint here rather than the marginal flag.
    output_config: { effort: "medium" },
    system: [
      {
        type: "text",
        text: `${REVIEWER_PREAMBLE}\n\n${tasteLayer}`,
        // The preamble and taste layer are byte-identical on every request, so
        // this prefix is read from cache rather than reprocessed each time.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `${renderSubmittedCode(code, stack)}\n\n${CRITIQUE_FORMAT}`,
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    throw new Error("the model declined to review this code.");
  }

  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") parts.push(block.text);
  }
  const critique = parts.join("\n").trim();

  if (critique === "") {
    throw new Error("the model returned an empty critique.");
  }

  if (message.stop_reason === "max_tokens") {
    return `${critique}\n\n[truncated: the critique hit the ${MAX_TOKENS}-token output limit]`;
  }

  return critique;
};

export const registerReviewTool = (server: McpServer): void => {
  server.registerTool(
    "review",
    {
      title: "Review UI code against the migaki taste layer",
      description:
        "Reviews a snippet of UI code against the migaki taste layer and returns a structured " +
        "critique: patterns from slop.md flagged by name with a specific fix, what the code does " +
        "well referenced against edge.md, and optional elevations. Pass the stack (e.g. " +
        "\"Next.js + Tailwind\") when known so the critique is framework-aware.",
      inputSchema: {
        code: z.string().min(1, "code must not be empty").describe("The UI code to review."),
        stack: z
          .string()
          .optional()
          .describe('Optional stack, e.g. "Next.js + Tailwind" or "SwiftUI".'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ code, stack }) => {
      try {
        const critique = await requestCritique(code, stack);
        return { content: [{ type: "text" as const, text: critique }] };
      } catch (error: unknown) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `review failed: ${describeApiError(error)}` }],
        };
      }
    },
  );
};
