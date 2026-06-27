/**
 * MCP compact proxy — sits between the agent and the 5 bloated MCP servers.
 *
 * One Express process on :9100. Each upstream is reached via `POST /mcp?target=<server>`,
 * so server/tool NAMES are preserved (the agent still sees `jira`, `confluence`, … and tools
 * like `jira_get_issue`) — `.mcp-proxy.json` just points each of the 5 entries at this port.
 *
 * Default: passthrough (forward list/call to the upstream unchanged).
 * `COMPACT=1`: strip known bloat fields from tool results before they reach the agent
 *   (the Run 3 "solution" — field filtering; extend with truncation / summary / dedup).
 *
 *   npm start              # passthrough on :9100
 *   COMPACT=1 npm start    # compacting proxy
 */
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createHash } from "node:crypto";

const UPSTREAM: Record<string, number> = { jira: 9001, github: 9002, confluence: 9003, sentry: 9004, testrail: 9005 };
const PORT = Number(process.env.PORT ?? 9100);
const COMPACT = process.env.COMPACT === "1";
// In docker-compose each MCP service is reachable by its name (jira:9001, …); on the host it's localhost.
const IN_DOCKER = process.env.IN_DOCKER === "1";

// Dedup/Cache (STATEFUL — a proxy can do this, a stateless per-call hook can't): identical
// (target, tool, args) seen this session → skip the upstream payload, return a tiny marker.
const seen = new Set<string>();

// ── Compaction (the Run 3 "solution"; passthrough leaves it off) ────────
// Field filtering: drop the metadataBloat fields + bloat arrays the agent never uses.
const STRIP_KEYS = new Set([
  "metadata", "createdBy", "createdAt", "lastReviewedBy", "lastReviewedAt", "reviewIntervalDays",
  "ownerTeam", "stakeholderTeams", "correlationId", "auditTrailUrl", "viewCount", "uniqueViewers",
]);
const STRIP_ARRAYS = new Set(["contributors", "watchers", "searchMetadata"]);

function stripBloat(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripBloat);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (STRIP_KEYS.has(k) || STRIP_ARRAYS.has(k)) continue;
    out[k] = stripBloat(v);
  }
  return out;
}

/** Compact a tool result: strip bloat from each text block's JSON payload. Generic identity keeps
 * the SDK's CallToolResult union type intact for the request handler. */
function compactResult<T>(result: T): T {
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) return result;
  const compacted = content.map((block) => {
    const b = block as { type?: unknown; text?: unknown };
    if (b.type !== "text" || typeof b.text !== "string") return block;
    try {
      return { ...(block as object), text: JSON.stringify(stripBloat(JSON.parse(b.text))) };
    } catch {
      return block;
    }
  });
  return { ...result, content: compacted } as T;
}

/** Schema compaction (STATEFUL-side win): drop the FILLER tail from each tool description so the
 * tool schema — re-sent to the model every turn — shrinks. Hooks never see tool schemas. */
function compactToolList<T extends { tools?: unknown }>(list: T): T {
  if (!Array.isArray(list.tools)) return list;
  const tools = list.tools.map((t) => {
    if (!t || typeof t !== "object") return t;
    const tool = t as { description?: unknown };
    if (typeof tool.description === "string") {
      return { ...tool, description: tool.description.slice(0, 160).replace(/\s+\S*$/, "") };
    }
    return t;
  });
  return { ...list, tools };
}

// ── Upstream clients (lazy, cached per target across requests) ──────────
const clients = new Map<string, Promise<Client>>();
function upstream(target: string): Promise<Client> {
  let c = clients.get(target);
  if (!c) {
    const client = new Client({ name: "compact-proxy", version: "1.0.0" });
    const host = IN_DOCKER ? target : "localhost";
    const transport = new StreamableHTTPClientTransport(new URL(`http://${host}:${UPSTREAM[target]}/mcp`));
    c = client.connect(transport).then(() => client);
    clients.set(target, c);
  }
  return c;
}

// ── Agent-facing HTTP (stateless server per request, like the mocks) ────
const app = express();
app.use(express.json({ limit: "8mb" }));
app.get("/health", (_req, res) => res.json({ status: "ok", mode: COMPACT ? "compact" : "passthrough" }));

app.post("/mcp", async (req, res) => {
  const target = String(req.query.target ?? "");
  if (!UPSTREAM[target]) {
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32602, message: `unknown target: ${target}` }, id: null });
    return;
  }

  const server = new Server({ name: `proxy:${target}`, version: "1.0.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const list = await (await upstream(target)).listTools();
    return COMPACT ? compactToolList(list) : list; // schema compaction
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (!COMPACT) return (await upstream(target)).callTool(request.params);
    // Dedup: identical call already made this session → don't re-send the payload.
    const key = createHash("sha256").update(`${target}|${JSON.stringify(request.params)}`).digest("hex");
    if (seen.has(key)) {
      return { content: [{ type: "text", text: JSON.stringify({ _unchanged: true, _note: "identical to an earlier call this session — result omitted to save tokens" }) }] };
    }
    seen.add(key);
    return compactResult(await (await upstream(target)).callTool(request.params)); // field-filter (+ dedup + schema above)
  });

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { void transport.close(); void server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "proxy error" }, id: null });
    }
  }
});

app.get("/mcp", (_req, res) => res.status(405).json({ error: "method_not_allowed" }));

app.listen(PORT, () => console.log(`[proxy] streamable-http on :${PORT} (${COMPACT ? "COMPACT" : "passthrough"}) → ${Object.keys(UPSTREAM).join(", ")}`));
