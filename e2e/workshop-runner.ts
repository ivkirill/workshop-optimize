/**
 * Workshop runner — measurement harness for Claude Code / Codex.
 *
 * All agents: interactive (participant opens agent, works, closes) → measure.
 * Claude: parse the pinned --session-id transcript (~/.claude/projects/.../<id>.jsonl) — isolated
 * Codex:  parse newest ~/.codex/sessions rollout since run start (time-window isolated)
 * Cursor: gate-only (no token source interactively)
 *
 * Usage:
 *   npm run workshop:run1   # Bloated baseline
 *   npm run workshop:run2   # Hygiene (after optimizing AGENTS.md)
 *   npm run workshop:run3   # Tool layer (after building proxy/hooks)
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { resetScenario, verify, printDelta, fmt, parseCodexSession, parseClaudeSession, type Snapshot } from "./_lib.js";
import { sendWorkshopMetric } from "./grafana.js";

const REPO_ROOT = join(import.meta.dirname, "..");
const APP_DIR = join(REPO_ROOT, "apps", "angular-demo");
const RUN = process.argv[2];

if (!RUN || !["run1", "run2", "run3"].includes(RUN)) {
  console.error("Usage: npm run workshop:run1   (or :run2, :run3)");
  process.exit(1);
}

const RUN_NUM = RUN.slice(-1);

// ── agent detection ────────────────────────────────────────────────────

function detectAgent(): string {
  // Explicit choice wins over auto-detect — otherwise claude (usually installed) is always picked.
  const forced = process.env.WORKSHOP_AGENT?.trim().toLowerCase();
  if (forced) {
    if (["claude", "codex", "cursor"].includes(forced)) return forced;
    console.warn(`  ⚠️  WORKSHOP_AGENT="${forced}" not one of claude|codex|cursor — auto-detecting.`);
  }
  try { execFileSync("claude", ["--version"], { stdio: "ignore" }); return "claude"; } catch {}
  try { execFileSync("codex", ["--version"], { stdio: "ignore" }); return "codex"; } catch {}
  try { execFileSync("cursor-agent", ["--version"], { stdio: "ignore" }); return "cursor"; } catch {}
  return "claude";
}

function getGitUser(): string {
  try { return execFileSync("git", ["config", "user.name"], { encoding: "utf8" }).trim() || "unknown"; } catch { return "unknown"; }
}

function activeScenario(): string {
  try {
    const name = readFileSync(join(REPO_ROOT, ".workshop", "active-scenario"), "utf8").trim();
    if (name) return name;
  } catch {}
  return "catalog-pagination";
}

/** Which lever this run exercises — labels the Grafana metric (esp. Run 3: proxy vs hooks). */
function detectLever(): string {
  if (RUN_NUM === "1") return "baseline";
  if (RUN_NUM === "2") return "hygiene";
  // Run 3 — detect the active tool layer
  try {
    if (readFileSync(join(APP_DIR, ".mcp.json"), "utf8").includes("9100")) return "proxy";
  } catch { /* no .mcp.json */ }
  if (existsSync(join(APP_DIR, ".claude", "hooks", "post-tool-use.ts"))) return "hooks";
  return "tool-layer";
}

// ── saved deltas ───────────────────────────────────────────────────────

const SAVE_DIR = join(REPO_ROOT, ".workshop");
const SAVE_FILE = join(SAVE_DIR, `run-run${RUN_NUM}.json`);

function saveDelta(d: Snapshot) {
  if (!existsSync(SAVE_DIR)) mkdirSync(SAVE_DIR, { recursive: true });
  writeFileSync(SAVE_FILE, JSON.stringify({ run: RUN, ...d, timestamp: new Date().toISOString() }, null, 2));
}

function loadDelta(n: string) {
  const f = join(SAVE_DIR, `run-run${n}.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, "utf8"));
}

function waitForEnter(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("\n  Press Enter when done…", () => { rl.close(); resolve(); });
  });
}

function compareRuns() {
  const r1 = loadDelta("1");
  const r2 = loadDelta("2");
  const r3 = loadDelta("3");

  if (!r1) { console.log("  Run 1 not yet measured."); return; }

  console.log(`\n  Run 1 (baseline):  ${fmt(r1.totalTokens)} total | $${Number(r1.totalCost).toFixed(4)}`);
  if (r2) {
    const pct2 = ((1 - r2.totalTokens / r1.totalTokens) * 100).toFixed(1);
    console.log(`  Run 2 (hygiene):   ${fmt(r2.totalTokens)} total | $${Number(r2.totalCost).toFixed(4)} (↓${pct2}%)`);
  }
  if (r3) {
    const prev = r2 || r1;
    const pct3 = ((1 - r3.totalTokens / prev.totalTokens) * 100).toFixed(1);
    console.log(`  Run 3 (tool layer): ${fmt(r3.totalTokens)} total | $${Number(r3.totalCost).toFixed(4)} (↓${pct3}%)`);
  }
  if (r2) {
    const pctAll = ((1 - (r3 || r2).totalTokens / r1.totalTokens) * 100).toFixed(1);
    console.log(`\n  📉 Total workshop savings: ↓${pctAll}% from baseline`);
  }
}

// ── main ───────────────────────────────────────────────────────────────

async function main() {
  const agent = detectAgent();
  const gitUser = getGitUser();

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  Workshop Run ${RUN_NUM} — Measurement`);
  console.log(`  Agent: ${agent} | User: ${gitUser}`);
  console.log(`═══════════════════════════════════════════\n`);

  resetScenario();

  // Claude: pin a session id so we read EXACTLY this run's transcript — isolated from any other
  // concurrent claude sessions (no global ccusage).
  const sessionId = randomUUID();

  // Participant works in their agent — started FRESH and AFTER this screen, so config load +
  // MCP warmup land INSIDE the measured window.
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ⚠️  Your agent must NOT be running yet.");
  console.log("  Start it FRESH now — config + MCP load only on");
  console.log("  startup, and must happen INSIDE this window.");
  console.log("");
  console.log("  In a SECOND terminal:");
  console.log("    cd apps/angular-demo");
  if (agent === "claude") {
    console.log(`    claude --session-id ${sessionId}`);
  } else if (agent === "codex") {
    console.log(`    codex`);
  } else {
    console.log("    cursor-agent");
  }
  console.log("");
  console.log("  Read TASK.md, write your prompt, let the agent");
  console.log("  solve the task and report done, then CLOSE it.");
  console.log("  (the agent does NOT run the gate — you grade it");
  console.log("   here after Enter; it never sees the result.)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const runStart = Date.now();
  await waitForEnter();

  // Capture usage — per-agent, isolated (no global ccusage):
  let d: Snapshot;
  if (agent === "codex") {
    d = parseCodexSession(runStart);
    console.log(`\n  📊 Codex usage (session): ${fmt(d.inputTokens)} in + ${fmt(d.outputTokens)} out + cache r=${fmt(d.cacheReadTokens)} = ${fmt(d.totalTokens)} total`);
  } else if (agent === "claude") {
    d = parseClaudeSession(APP_DIR, sessionId, runStart);
    console.log(`\n  📊 Claude usage (session ${sessionId.slice(0, 8)}…): ${fmt(d.inputTokens)} in + ${fmt(d.outputTokens)} out + cache r=${fmt(d.cacheReadTokens)} w=${fmt(d.cacheCreationTokens)} = ${fmt(d.totalTokens)} total`);
  } else {
    d = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, totalTokens: 0, totalCost: 0 };
  }

  printDelta(`Run ${RUN_NUM}`, d);

  if (agent !== "claude" && agent !== "codex") {
    console.log(`\n  ℹ️  Token measurement only available for Claude Code & Codex (cursor = gate-only).`);
  }

  // Step 4: verify
  console.log("\n🔍 Verifying quality gate…");
  const gatePassed = verify();

  // Step 5: save & send
  saveDelta(d);

  sendWorkshopMetric({
    run: Number(RUN_NUM), agent, user: gitUser, task: activeScenario(), lever: detectLever(),
    inputTokens: d.inputTokens, outputTokens: d.outputTokens,
    cacheReadTokens: d.cacheReadTokens, cacheWriteTokens: d.cacheCreationTokens,
    totalTokens: d.totalTokens, totalCost: d.totalCost, gatePassed,
  });

  console.log("\n━━━ WORKSHOP PROGRESS ━━━");
  compareRuns();
  console.log(`\n  Gate: ${gatePassed ? "✅ PASS" : "❌ FAIL"}`);

  if (!gatePassed) {
    console.error(`\n  ⚠️  Quality gate FAILED. Re-run: npm run workshop:run${RUN_NUM}`);
    process.exit(1);
  }

  console.log(`\n  ✅ Run ${RUN_NUM} measured.`);

  const nextHint = RUN === "run1" ? "optimize AGENTS.md → npm run workshop:run2"
    : RUN === "run2" ? "build proxy or hooks → npm run workshop:run3"
    : "wrap up — compare your three runs!";

  console.log(`  Next: ${nextHint}`);
  resetScenario();
}

main();
