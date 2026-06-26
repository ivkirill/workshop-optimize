/**
 * MCP Proxy — compact middleware between the agent and bloated MCP servers.
 *
 * SCAFFOLD for workshop Run 3. Participants extend the compactors to apply
 * truncation, field filtering, structured summary, dedup, and pagination.
 *
 * Usage:
 *   npm start              # starts on port 9100
 *   # Then point .mcp.json to http://localhost:9100/mcp?target=jira (etc.)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// ── Compactors (SCAFFOLD — extend in Run 3) ──────────────────────────

function compactJson(data: unknown, maxChars = 2000): string {
  const str = JSON.stringify(data);
  if (str.length <= maxChars) return str;
  return str.substring(0, maxChars) + `\n... [${str.length - maxChars} more chars]`;
}

function compactJiraResponse(raw: unknown): string {
  const data = raw as Record<string, unknown>;
  if (data?.fields) {
    const f = data.fields as Record<string, unknown>;
    return JSON.stringify({
      summary: f.summary,
      description: f.description,
      definitionOfDone: f.definitionOfDone,
      relatedResources: f.relatedResources,
    });
  }
  return compactJson(data, 3000);
}

function compactConfluenceResponse(raw: unknown): string {
  const data = raw as Record<string, unknown>;
  if (data?.body) {
    return JSON.stringify({
      title: data.title,
      body: String(data.body).substring(0, 2000),
      space: data.space,
    });
  }
  return compactJson(data, 3000);
}

function compactSentryResponse(raw: unknown): string {
  const data = raw as Record<string, unknown>;
  return JSON.stringify({
    title: data.title,
    culprit: data.culprit,
    message: data.message,
    frames: (data.entries as Array<Record<string, unknown>>)?.[0]?.data?.values?.[0]?.stacktrace?.frames?.slice(0, 3),
  });
}

function compactGeneric(data: unknown): string {
  return compactJson(data, 4000);
}

// ── Proxy server ─────────────────────────────────────────────────────

async function main() {
  // Always use stdio transport — Claude Code/Codex connect via stdio
  const server = new McpServer({
    name: "compact-proxy",
    version: "1.0.0",
  });

  // SCAFFOLD: register compact versions of each upstream tool
  // In a full implementation, the proxy connects to upstream MCP servers,
  // lists their tools, and re-exports them with compact response handlers.
  // For the workshop, participants wire this to actual upstream servers.

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Compact MCP Proxy running on stdio");
}

main().catch(console.error);
