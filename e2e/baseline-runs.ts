/**
 * Baseline runs — plain agent work, no optimization.
 *
 * For each agent (claude, codex, cursor) sequentially, solves variants 3 → 2 → 1
 * using the repo's current AGENTS.md + each variant's own TASK.md. After every run
 * it measures token usage and pushes a baseline metric (run=1) to Grafana.
 *
 * Not an A/B test — this is the raw baseline the workshop optimizes against.
 *
 * Usage:
 *   npx tsx e2e/baseline-runs.ts                 # all three agents
 *   npx tsx e2e/baseline-runs.ts claude          # one agent
 *   npx tsx e2e/baseline-runs.ts codex,cursor    # a subset
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { resetScenario, runClaude, runCodex, runCursor, printDelta, activeScenario, gitUser, type RunResult } from "./_lib.js";
import { sendWorkshopMetric } from "./grafana.js";

const REPO_ROOT = join(import.meta.dirname, "..");

const AGENT = { CLAUDE: "claude", CODEX: "codex", CURSOR: "cursor" } as const;
type AgentName = (typeof AGENT)[keyof typeof AGENT];

const RUNNERS: Record<AgentName, (prompt: string) => Promise<RunResult>> = {
  [AGENT.CLAUDE]: runClaude,
  [AGENT.CODEX]: runCodex,
  [AGENT.CURSOR]: runCursor,
};

/** Variant order the user asked for: hardest (edit-card) first. */
const VARIANTS = ["3", "2", "1"] as const;

/** scenario → which single feature the agent is allowed to touch. */
const SCOPE: Record<string, { dir: string; feature: string }> = {
  "editcard-validation": { dir: "src/app/edit-card", feature: "edit-card (validation & XSS)" },
  "orders-search": { dir: "src/app/orders", feature: "orders search" },
  "catalog-pagination": { dir: "src/app/catalog", feature: "catalog pagination" },
};
const DEFAULT_SCOPE = { dir: "src/app/catalog", feature: "catalog pagination" };

function promptFor(scenario: string): string {
  const scope = SCOPE[scenario] ?? DEFAULT_SCOPE;
  return [
    `Read TASK.md and pull the full ticket from the jira MCP server.`,
    `Fix ONLY the ${scope.feature} feature in ${scope.dir} to satisfy the ticket's Definition of Done.`,
    `Do not modify any other feature, change the public API contract, or add runtime dependencies.`,
    `Report done when the fix is complete.`,
  ].join(" ");
}

function selectVariant(n: string): void {
  // writes apps/angular-demo/TASK.md + .workshop/active-scenario
  execFileSync("npx", ["tsx", "workshop/cli/variant.ts", n], { cwd: REPO_ROOT, stdio: "inherit" });
}

/**
 * Discard ALL agent edits across the app so every run starts from the same buggy baseline.
 * resetScenario() only restores the active feature dir; this undoes fixes a previous run left
 * in the OTHER feature dirs (and any stray untracked files an agent created under src).
 */
function cleanApp(): void {
  execFileSync("git", ["checkout", "--", "apps/angular-demo/src"], { cwd: REPO_ROOT, stdio: "inherit" });
  execFileSync("git", ["clean", "-fdq", "apps/angular-demo/src"], { cwd: REPO_ROOT, stdio: "inherit" });
}

function parseAgents(arg: string | undefined): AgentName[] {
  const valid = new Set<string>(Object.values(AGENT));
  const requested = (arg ?? Object.values(AGENT).join(",")).split(",").map((s) => s.trim()).filter(Boolean);
  const agents = requested.filter((a): a is AgentName => valid.has(a));
  if (agents.length === 0) {
    console.error(`No valid agents in "${arg}". Use: ${Object.values(AGENT).join(", ")}`);
    process.exit(1);
  }
  return agents;
}

async function runOne(agent: AgentName, variant: string): Promise<boolean> {
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  Baseline — ${agent} — variant ${variant}`);
  console.log(`═══════════════════════════════════════════`);

  cleanApp();             // identical full buggy baseline for every run
  selectVariant(variant); // writes TASK.md + active scenario
  resetScenario();        // active feature dir restored from its baseline

  const scenario = activeScenario();
  const result = await RUNNERS[agent](promptFor(scenario));

  printDelta(`${agent} / ${scenario}`, result.usage);

  sendWorkshopMetric({
    run: 1, // baseline — no optimization
    agent,
    user: gitUser(),
    task: scenario,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cacheReadTokens: result.usage.cacheReadTokens,
    cacheWriteTokens: result.usage.cacheCreationTokens,
    totalTokens: result.usage.totalTokens,
    totalCost: result.usage.totalCost,
    gatePassed: result.gatePassed,
  });

  console.log(`  Gate: ${result.gatePassed ? "✅ PASS" : "❌ FAIL"}`);
  return result.gatePassed;
}

async function main(): Promise<void> {
  const agents = parseAgents(process.argv[2]);
  console.log(`\nBaseline runs — agents: ${agents.join(", ")} | variants: ${VARIANTS.join(", ")} | user: ${gitUser()}`);

  const summary: Array<{ agent: string; variant: string; scenario: string; gate: boolean }> = [];
  for (const agent of agents) {
    for (const variant of VARIANTS) {
      const gate = await runOne(agent, variant);
      summary.push({ agent, variant, scenario: activeScenario(), gate });
    }
  }

  console.log(`\n━━━ SUMMARY ━━━`);
  for (const s of summary) {
    console.log(`  ${s.agent.padEnd(7)} variant ${s.variant} (${s.scenario.padEnd(20)}) → ${s.gate ? "✅" : "❌"}`);
  }
  const failed = summary.filter((s) => !s.gate).length;
  console.log(`\n  ${summary.length - failed}/${summary.length} gates passed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
