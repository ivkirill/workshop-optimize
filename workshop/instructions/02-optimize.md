# 02 — Optimize, then prove it

Two layers of optimization, each its own measured run. After every run `scenario:verify` **must
still PASS** — a cheaper run that breaks the solution does not count.

You stay on the **same git branch** throughout — there is **no branch switching**. Edit `AGENTS.md` /
build the proxy **in place**; `workshop:run*` resets the buggy baseline itself before each run. Each
run uses the same launch pattern as Run 1 (fresh agent in a second terminal, the printed
`--session-id` for Claude).

## Run 2 — AGENTS.md hygiene

Edit `AGENTS.md` / `CLAUDE.md` (and `.claude/settings.json`) **between** runs — this editing is not
measured. Then:

```bash
npm run workshop:run2     # resets baseline, waits while you run the agent fresh, measures, compares to Run 1
```

| Lever | What to try | What it targets |
|---|---|---|
| **Scope the context** | Name the exact feature dir for your variant instead of letting the agent explore. | Fewer / smaller file reads. |
| **Tighten the config** | Trim `AGENTS.md`/`CLAUDE.md` to essentials. | The instruction prefix is sent every turn. |
| **One clear prompt** | Give the full task + constraints up front instead of discovering them over many turns. | Fewer turns → less re-sent history. |
| **Model choice** | Set a cheaper model in `.claude/settings.json` for this mechanical fix. | Per-token price. |
| **Keep the cache warm** | Don't reorder/rewrite the stable prefix mid-task. | Shifts input → cache-read. |

**The ceiling:** AGENTS.md hygiene can't shrink the **bloated MCP responses** (jira/confluence/
sentry/testrail) — those raw payloads still fill the context every turn. That's what Run 3 fixes.

## Run 3 — tool layer (proxy or hooks)

Build a thin layer that compacts the bloated MCP responses **before** they reach the agent. Pick one
(this build is not measured):

- **Option A — Proxy-MCP**: a small service between the agent and the 5 MCP servers that truncates,
  field-filters, and summarizes responses (and can dedup across calls). Register it via
  `.mcp-proxy.json`.
- **Option B — Local hooks**: a `PostToolUse` hook in `.claude/hooks/` that transforms each tool
  result inline — same idea, no separate service, but stateless.

Then:

```bash
npm run workshop:run3     # resets baseline, waits while you run the agent fresh, measures, compares to Run 2 (and Run 1)
```

This is the biggest delta of the workshop — you're now controlling not just the prompt but the data
that enters context.

## What good looks like

- `quality gate: PASS` on every counted run.
- Lower **total cost** for each optimized run, *and* you can explain **which lever moved which
  number** (e.g. "scoping cut input 40%"; "the proxy cut tool-result input 60%").
- One optimization that **didn't** help — and why. The goal is the **minimum cost of a correct,
  verified result**, not the minimum tokens.

Raw per-session detail any time: `npx ccusage session` (or `npx ccusage blocks` for live).
