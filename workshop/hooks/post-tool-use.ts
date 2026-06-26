/**
 * PostToolUse hook scaffold — participants fill in the compact* functions.
 * Claude Code passes a JSON event on stdin: { tool_name, tool_input, response }.
 * Hook returns (possibly modified) event on stdout.
 * Pass-through by default — all compactors just return the response unchanged.
 */

interface HookEvent {
  tool_name: string;
  tool_input: Record<string, unknown>;
  response: string;
}

// ── Compactors — TODO: implement truncation / field filtering / dedup ─

function compactJira(response: string): string {
  return response;
}

function compactConfluence(response: string): string {
  return response;
}

function compactGeneric(response: string): string {
  return response;
}

// ── Dispatch ──────────────────────────────────────────────────────────

let input = "";
process.stdin.on("data", (chunk: Buffer) => { input += chunk.toString(); });
process.stdin.on("end", () => {
  try {
    const event: HookEvent = JSON.parse(input);
    const name = event.tool_name || "";

    if (name.startsWith("mcp__jira")) {
      event.response = compactJira(event.response);
    } else if (name.startsWith("mcp__confluence")) {
      event.response = compactConfluence(event.response);
    } else if (name.startsWith("mcp__")) {
      event.response = compactGeneric(event.response);
    }

    process.stdout.write(JSON.stringify(event));
  } catch {
    process.stdout.write(input);
  }
});
