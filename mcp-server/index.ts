import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerContextTool } from "./tools/context.js";
import { primeTasteLayer, registerReviewTool } from "./tools/review.js";

const SERVER_INFO = {
  name: "migaki",
  version: "0.1.0",
  title: "migaki — taste layer for AI coding agents",
} as const;

const MCP_PATH = "/mcp";
const HEALTH_PATH = "/health";
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";

/**
 * Builds a fresh MCP server instance.
 *
 * `analyze` lands in a later build step and will be wired in here alongside
 * `context` and `review`.
 */
const createMigakiServer = (): McpServer => {
  const server = new McpServer(SERVER_INFO);
  registerContextTool(server);
  registerReviewTool(server);
  return server;
};

const readPort = (value: string | undefined): number => {
  if (value === undefined || value === "") return DEFAULT_PORT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT environment variable: ${value}`);
  }
  return parsed;
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  if (res.headersSent) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
};

/** JSON-RPC error envelope, so failures never reach the client as raw HTML or a hang. */
const sendRpcError = (res: ServerResponse, status: number, code: number, message: string): void => {
  sendJson(res, status, { jsonrpc: "2.0", error: { code, message }, id: null });
};

const pathnameOf = (req: IncomingMessage): string => {
  const host = req.headers.host ?? "localhost";
  try {
    return new URL(req.url ?? "/", `http://${host}`).pathname;
  } catch {
    return "/";
  }
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Handles one MCP request in stateless mode: a fresh server and transport per
 * request, with no session id. Nothing is shared between clients, so the
 * service can run on multiple Railway instances without sticky routing.
 */
const handleMcpRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const server = createMigakiServer();
  // Omitting `sessionIdGenerator` selects stateless mode.
  const transport = new StreamableHTTPServerTransport({});

  res.on("close", () => {
    void transport.close().catch(() => undefined);
    void server.close().catch(() => undefined);
  });

  await server.connect(transport);
  await transport.handleRequest(req, res);
};

const requestListener = (req: IncomingMessage, res: ServerResponse): void => {
  const pathname = pathnameOf(req);

  if (pathname === HEALTH_PATH) {
    sendJson(res, 200, { status: "ok", server: SERVER_INFO.name, version: SERVER_INFO.version });
    return;
  }

  if (pathname !== MCP_PATH) {
    sendJson(res, 404, { error: "not_found", message: `No handler for ${pathname}` });
    return;
  }

  handleMcpRequest(req, res).catch((error: unknown) => {
    console.error(`[migaki] MCP request failed: ${describeError(error)}`);
    sendRpcError(res, 500, -32603, "Internal server error");
  });
};

const port = readPort(process.env["PORT"]);
const host = process.env["HOST"] ?? DEFAULT_HOST;
const httpServer = createServer(requestListener);

httpServer.on("error", (error: Error) => {
  console.error(`[migaki] HTTP server error: ${error.message}`);
  process.exitCode = 1;
});

httpServer.listen(port, host, () => {
  console.error(`[migaki] listening on http://${host}:${port}${MCP_PATH}`);
});

// Read the taste layer once at boot so `review` does not pay for it per request,
// and so an unreadable taste/ directory shows up in the logs immediately. A
// failure here is not fatal: the first `review` call retries and reports it.
primeTasteLayer().then(
  () => console.error("[migaki] taste layer loaded"),
  (error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[migaki] taste layer preload failed: ${detail}`);
  },
);

const shutdown = (signal: NodeJS.Signals): void => {
  console.error(`[migaki] received ${signal}, shutting down`);
  httpServer.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
