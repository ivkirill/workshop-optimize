/**
 * hooks:reset — undo `hooks:setup`. Removes the installed hook and its registration (back to direct MCP).
 */
import { existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const HOOK_DST = join(REPO_ROOT, "apps", "angular-demo", ".claude", "hooks", "post-tool-use.ts");
const SETTINGS = join(REPO_ROOT, "apps", "angular-demo", ".claude", "settings.json");

if (existsSync(HOOK_DST)) rmSync(HOOK_DST);

const settings = JSON.parse(readFileSync(SETTINGS, "utf8")) as Record<string, unknown>;
delete settings.hooks;
writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");

console.log("✅ Hooks removed + unregistered (back to direct MCP).");
