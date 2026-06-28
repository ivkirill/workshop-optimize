# Token-Efficient Coding Agents — Workshop

A **runnable Angular product** (Plata Burrito CRM) with deliberately buggy features, a **dockerized
backend + five mock MCP servers** that feed your agent the task, and **per-run token measurement**
read from each run's own session transcript / logs (and pushed to Grafana). You fix a feature with
the agent, measure what it cost, apply the optimizations we teach, re-run, and **prove you spent
fewer tokens for the same correct result.**

> A token reduction that breaks the solution does not count. Correctness is decided by a quality
> gate (tests + typecheck + lint) that `workshop:run*` runs automatically after your agent finishes.

## Prerequisites

- Node ≥ 20.11, npm, and **Docker**.
- **One coding agent** installed and authenticated:
  - **Claude Code** (`ANTHROPIC_API_KEY`) — launch with the `--session-id <id>` printed by
    `workshop:run*`; usage is read from that one session's transcript (isolated from other windows).
  - **Codex** — usage parsed from its session rollout (`~/.codex/sessions/`). Just launch `codex`
    from `apps/angular-demo/`; the harness picks up the newest session automatically.
  - **cursor-agent** — quality gate auto; record tokens yourself from
    [cursor.com/dashboard/usage](https://cursor.com/dashboard/usage) (match the `runStart` timestamp
    the runner prints). Facilitator smoke: `npm run workshop:verify-cursor`.

## Quick start

```bash
npm install
npm run setup                 # Docker + MCP
npm run workshop:doctor       # Verify everything is ready
```

## Workshop flow (two terminals)

A measured run is a **bracket**: `workshop:run*` resets the baseline, waits while you work in your
agent, then reads **only your run's** tokens. So you start the agent **after** the run begins — use
two terminals.

**Terminal A — prep & measure:**

```bash
npm run variant -- 1|2|3                  # pick your bug vector (writes TASK.md, sets the scenario)
npm run workshop:run1                     # Claude (auto-detected) — resets, prints the launch cmd, waits
# Codex or Cursor (when Claude is also installed):
WORKSHOP_AGENT=codex npm run workshop:run1
WORKSHOP_AGENT=cursor npm run workshop:run1
```

The runner auto-detects Claude if installed; set `WORKSHOP_AGENT=codex|cursor` to pick another. It prints the
exact command to run in Terminal B.

**Terminal B — the agent** (only once Run 1 is already waiting) — use the command Run 1 printed:

```bash
cd apps/angular-demo
claude --session-id <id>                  # Claude — <id> printed by workshop:run1
codex                                     # Codex  — usage parsed from its session rollout
cursor-agent --approve-mcps               # Cursor — tokens from dashboard; gate auto
```

Start it **fresh** here — config + MCP warm-up must happen *inside* the measured window. The agent
reads `TASK.md` (ticket number), pulls the task from the **jira** MCP server (→ confluence, sentry,
testrail), fixes the feature, then you **close** the agent.

**Back in Terminal A:** press Enter → gate runs (+ auto token measure for Claude/Codex; Cursor: note
tokens from dashboard).

Then optimize **in place on the same branch** (no branch switching) and re-measure:

```bash
npm run agents:solution                   # Run 2 prep — optimized AGENTS.md (not measured)
npm run workshop:run2                     # Run 2 — AGENTS.md hygiene
#   → build proxy or hooks (not measured)
npm run workshop:run3                     # Run 3 — tool layer

# Cursor (set WORKSHOP_AGENT on each measured run):
npm run proxy:direct-cursor && npm run hooks:reset-cursor   # baseline
WORKSHOP_AGENT=cursor npm run workshop:run1
npm run agents:solution && WORKSHOP_AGENT=cursor npm run workshop:run2
npm run proxy:solution-cursor && WORKSHOP_AGENT=cursor npm run workshop:run3   # or hooks:solution-cursor
npm run workshop:verify-cursor          # facilitator: smoke-check config scripts
```

Each run prints your delta vs earlier runs. Measurement is **per-session** (Claude via the pinned
`--session-id` transcript; Codex via its cleared log dir), so other agent windows don't pollute it.
`workshop:run*` resets the baseline itself — you never switch branches.

## Three bug variants

| Variant | Page | Ticket | Type |
|---|---|---|---|
| 1 | `/catalog` | JIRA-0321 | Data grid: URL sync, cache, SWR, cancellation |
| 2 | `/orders` | JIRA-0410 | Data grid: URL sync, debounce, cache, SWR |
| 3 | `/edit/:id` | JIRA-0455 | Forms: validation, 400-mapping, XSS, dirty state |

## Commands

```bash
npm run setup                 # Docker + MCP + variant-1
npm run cleanup               # Stop everything
npm run setup:docker          # Start containers only
npm run setup:mcp             # Register MCP for Codex/Cursor
npm run variant -- 1|2|3      # Pick task
npm run workshop:doctor       # Preflight check
npm run workshop:run1|2|3     # Measured runs (gate runs automatically inside)
# WORKSHOP_AGENT=codex|cursor npm run workshop:run1   # when Claude is also installed
npm run agents:solution       # Apply optimized AGENTS.md (Run 2 prep)
npm run agents:reset          # Restore bloated AGENTS.md
npm run proxy:direct-cursor   # Cursor MCP baseline
npm run proxy:solution-cursor # Cursor Run 3 proxy эталон
npm run hooks:solution-cursor # Cursor Run 3 hooks эталон
npm run workshop:verify-cursor
```

## Agent working directory

The participant agent runs from **`apps/angular-demo/`**. It sees:
- `AGENTS.md` — project instructions (bloated — you'll optimize it in Run 2)
- `TASK.md` — ticket number (generated by `npm run variant`)
- `.mcp.json` — MCP server config (Claude: jira, confluence, sentry, testrail, github)
- `.cursor/mcp.json` — MCP config for cursor-agent (workshop: `npm run proxy:direct-cursor`)
- `.cursor/cli.json` — CLI allowlist (`Mcp(...)`, `Shell(...)`) for `cursor-agent`
- `.cursor/permissions.json` — IDE allowlist (`mcpAllowlist`, `terminalAllowlist` incl. hook command)
- `.claude/settings.json` — Claude Code permissions + model

Its working directory is `apps/angular-demo/`. **Information-hiding** keeps the agent in scope:
nothing in its config or prompts (`AGENTS.md`, `TASK.md`) mentions the workshop infrastructure
(`workshop/` grader + answers, `e2e/`, `servers/`) that lives above it, and the agent never runs or
sees the quality gate — the facilitator grades each run out-of-band. So the agent has no pointer or
reason to leave. This is not a hard sandbox: an agent with shell access could still traverse up, but
nothing in what it reads leads it there.

## Docs

- [`docs/charter.md`](./docs/charter.md) — Workshop charter
- [`docs/agenda.md`](./docs/agenda.md) — Facilitator run-sheet
- [`docs/hygiene-methods.md`](./docs/hygiene-methods.md) — 10 optimization levers
- [`docs/mcp-proxy-methods.md`](./docs/mcp-proxy-methods.md) — 8 proxy methods
- [`docs/workshop-protocol.md`](./docs/workshop-protocol.md) — Measurement protocol

## Cleanup

```bash
npm run cleanup               # Stop Docker + remove MCP configs
```
