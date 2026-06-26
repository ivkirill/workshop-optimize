/**
 * hooks:setup — opt into the Run 3 "hooks" lever (Claude). Installs the passthrough scaffold into
 * the app's .claude/hooks/ and registers it in .claude/settings.json. Mirrors `proxy:setup`.
 *
 * After this: edit apps/angular-demo/.claude/hooks/post-tool-use.ts to add compaction, then re-run
 * claude (it reads the hook live — no rebuild). Reference answer: workshop/hooks/post-tool-use.solution.ts.
 * Undo with `npm run hooks:reset`.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const SCAFFOLD = join(REPO_ROOT, "workshop", "hooks", "post-tool-use.ts");
const HOOK_DIR = join(REPO_ROOT, "apps", "angular-demo", ".claude", "hooks");
const HOOK_DST = join(HOOK_DIR, "post-tool-use.ts");
const SETTINGS = join(REPO_ROOT, "apps", "angular-demo", ".claude", "settings.json");

mkdirSync(HOOK_DIR, { recursive: true });
copyFileSync(SCAFFOLD, HOOK_DST);

const settings = JSON.parse(readFileSync(SETTINGS, "utf8")) as Record<string, unknown>;
settings.hooks = {
  PostToolUse: [
    {
      matcher: "mcp__.*",
      hooks: [{ type: "command", command: "npx tsx ${CLAUDE_PROJECT_DIR}/.claude/hooks/post-tool-use.ts", timeout: 30 }],
    },
  ],
};
writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");

console.log("✅ Hooks installed: apps/angular-demo/.claude/hooks/post-tool-use.ts (passthrough) + registered in settings.json.");
console.log("   Edit that file to compact MCP results (reference: workshop/hooks/post-tool-use.solution.ts), then re-run claude.");
console.log("   Undo: npm run hooks:reset");
