# Workshop Charter — Token Optimization for Advanced AI Users

**Owner:** PlataCard / Nebius
**Branch:** `workshop-charter`
**Status:** draft — all 8 sections elaborated, adjusted for 2.5 h duration

The single source of truth for what this workshop is. Curriculum detail lives in
[`optimization-catalog.md`](./optimization-catalog.md); the facilitator run-sheet in
[`agenda.md`](./agenda.md).

**Fixed parameters:** audience = PlataCard engineers (advanced AI users) · domain = web
(Angular primary, but techniques are framework-agnostic) · language = **TypeScript** ·
provider = **Anthropic** · tracker = **ccusage** · duration = **2.5 h**.

---

## 1. Target audience

### 1.1 Who this workshop is for

Engineers at PlataCard who **already actively use AI tools** in their daily work and want
to move from "using" to "engineering" — understanding and controlling the cost of
AI-assisted coding at the token level.

**Characteristics of the target participant:**

- Has used Cursor, Claude Code, Copilot, or a similar coding agent for at least several
  weeks of real work — not just a trial.
- Has encountered the practical pain point: **token limits and restricted access to
  stronger models**. This is a stated concern from the web team.
- Is comfortable reading TypeScript, running `npm`/`npx` commands, and reviewing a
  `git diff`.
- Wants **in-house solutions** over third-party SaaS products — consistent with
  PlataCard's engineering culture.
- May have experimented with custom workflows, skills, MCP servers, or agents, but
  hasn't yet systematically measured or optimized the token cost of those interactions.

### 1.2 Who this workshop is NOT for

- **AI beginners.** Engineers who tried AI tools briefly and stopped, or who haven't
  formed a daily AI habit, need the **basic track** first — AI literacy, prompting
  fundamentals, practical workflows. This workshop assumes those foundations.
- **Engineers who don't write code.** The workshop uses a real frontend product with a
  real bug; participants fix it with an agent and measure the cost.
- **Teams looking for a "which AI tool to use" decision guide.** This workshop is about
  optimization technique, not tool evaluation.

### 1.3 The PlataCard context

The workshop is designed against the specific reality of PlataCard:

| Reality | How the workshop addresses it |
|---|---|
| **Uneven AI adoption** — some engineers deeply integrated AI, others tried and dropped it | The workshop is for the "enthusiast" cohort. It assumes existing AI fluency and doesn't re-teach basics. A separate basic track serves the rest. |
| **In-house culture** — teams prefer building own AI tooling over buying third-party products | Run 3 (tool layer) is the direct embodiment of PlataCard's in-house ethos: participants build their own optimization layer — proxy-MCP or local hooks — over internal AI tooling. No dependence on SaaS AI products beyond the foundation model API. |
| **No centralized AI guidance** — no common best practices, knowledge shared ad-hoc between colleagues | The workshop produces a shared vocabulary (input/output/cache tokens, cost attribution) and a repeatable measure→optimize→verify loop that teams can take back to their own workflows. |
| **Token limits as a practical problem** — web team specifically flagged restricted token/model access | The workshop's core thesis — "minimum cost of a correct result" — directly addresses this. Participants measure real costs and prove reductions. |
| **Standardized tech stack, varied processes** — Go/gRPC/Postgres/Kafka are common, but team workflows differ | The workshop is process-agnostic. The techniques apply regardless of whether a team uses Scrum, Kanban, or a hybrid. The only requirement is "uses an AI coding agent." |
| **Web: React + Angular** | The primary product example is Angular (reflecting the existing codebase), but every optimization technique taught is framework-agnostic. A React engineer loses nothing. |

### 1.4 Two tracks, one workshop

This advanced workshop exists alongside (but is separate from) a basic AI track:

| | Basic track | **Advanced track (this workshop)** |
|---|---|---|
| **Audience** | AI newcomers, low adoption | Active AI users, "enthusiasts" |
| **Goal** | AI literacy, prompting, practical workflows | Measure, optimize, and prove token cost reduction |
| **Depth** | "What button do I press?" | "How does the agent loop work and how do I control its cost?" |
| **Output** | Confident daily AI use | Before/after cost deltas with quality gate still green |
| **Duration** | ~2 hours | ~2.5 hours |

### 1.5 Domain: web (Angular-primary, course-agnostic)

- The hands-on task uses an **Angular** product with **multiple deliberately buggy
  features, optimization points, and vulnerabilities** — enough variety for different
  teams to work on different tasks simultaneously.
- However, **every technique taught is framework-agnostic**: debounce, cancellation,
  context scoping, compact tool results, subagent routing — these are software
  engineering patterns, not Angular patterns.
- The base language is **TypeScript**. A React engineer reading TS components and
  services will have zero friction.
- Backend examples (Go) are **not** part of this workshop, though the infrastructure
  topics (MCP, agent loop design) apply equally to backend teams.

---

## 2. Goal

Participants can **prove they reduced the cost of a correct, verified result** — not
just "shortened a prompt." By the end they can:

1. Measure an agent's token/cost spend locally and attribute it: input, output, cache, cost.
2. Apply two layers of optimization — **AGENTS.md hygiene** (Run 2) and **tool-layer
   control** (Run 3, proxy-MCP or local hooks) — and measure each.
3. Produce a **3-row comparison table** (baseline → hygiene → tool-layer) with both
   deltas proven and the quality gate still green on all three runs.
4. Explain the trade-offs — including where the real ceiling is (hint: it's between Run
   2 and Run 3) and one thing that **didn't** help and why.

> **Guiding principle:** the target is **minimum cost of a correct, verified result**,
> not minimum tokens. A token cut that breaks the solution does not count.

---

## 3. Means (tools / artifacts)

### 3.1 Local infrastructure

- **Docker** — runs the 5 MCP mock servers locally.
- **Node ≥ 20.11** + npm — the Angular product and all CLI tooling.
- **Claude Code** — the coding agent; each participant brings their own `ANTHROPIC_API_KEY`.

### 3.2 Artifacts

| Artifact | Role | Status |
|---|---|---|
| **Angular design-system app** | The product. Contains **multiple bugs, optimization points, and vulnerabilities** across different components — enough variety to assign different tasks to different teams. | **to build** (expand from single-bug baseline) |
| **Quality gate** | Mandatory tests + typecheck + lint → decides "correct," run automatically inside `workshop:run*`. Agent cannot weaken it. One gate per task variant. | **to build** (per-task gates) |
| **5 MCP mock servers** | `taskTracker` (issue tracker), `github` (source control), `testenv` / TestRail (test runner), `confluence` / docs (documentation), `sentry` (error monitoring). Each has an **intentionally bloated tool schema** (verbose descriptions, oversized response formats) — this is the token trap. | **to build** |
| **`AGENTS.md`** | Deliberately **unoptimized** — verbose, broad instructions, no context scoping. Serves as the baseline anchor for Run 1. Participants optimize it in Run 2. | **to build** (bloated version) |
| **Agent-SDK (TS) harness** | Lightweight loop runner. Participants verify it locally. Writes per-run usage to a local report file. | **to build** |
| **`ccusage`** + `tokens:measure` / `tokens:compare` | Local token/cost tracker that reads Claude Code logs. Produces before/after deltas. | exists |
| **Proxy-MCP scaffold** | A skeleton MCP proxy that participants complete in Run 3 (Option A) — transforms bloated MCP responses into compact ones. | **to build** |
| **Hooks scaffold** | A skeleton `.claude/hooks/` script that participants complete in Run 3 (Option B) — same transformations (truncation, field filtering) via Claude Code PostToolUse/PreToolUse hooks, without a separate service. | **to build** |

### 3.3 Pre-build validation gate

Before building the full workshop, a **minimal spike** must prove the core hypothesis:
controlling the tool layer produces a measurable, significant token reduction.

**Protocol:**

1. Set up 2 of the 5 MCP mocks (`confluence` + `testenv`) with bloated schemas.
2. Run the agent through them on one task; measure tokens.
3. Build a minimal proxy (~50 lines) that applies only compact results.
4. Re-run the same agent through the proxy; measure tokens.
5. **Gate:** tool-result input tokens must drop ≥40% between the two runs.

If the gate fails, the workshop concept is invalid regardless of implementation quality —
the hypothesis is wrong and needs revisiting before any further building.

---

## 4. Methods (what is taught)

The workshop is structured as **three sequential runs** of the same engineering workflow.
Each run produces a token measurement. The deltas between runs are the learning.

The workflow in each run: agent pulls a task from `taskTracker` MCP → reads requirements
from `confluence` MCP → writes code → runs tests via `testenv` MCP → commits via
`github` MCP → monitors for errors via `sentry` MCP. Every MCP interaction costs tokens.

### Run 1 — Bloated Baseline (~40 min)

**What:** the agent solves the task with everything at its worst.

- `AGENTS.md` is intentionally verbose and unscoped — broad instructions, no file hints,
  no output constraints.
- All 5 MCP servers expose **bloated tool schemas** — oversized descriptions, raw
  response formats, no pagination or truncation.
- The agent must interact with all 5 MCPs to complete the task.

**Measure:** `tokens:measure` → agent run → `tokens:measure`. This is the expensive
anchor — the number all subsequent runs compete against.

**Learning:** participants **see** the cost of a naive setup. They experience the token
trap firsthand — tool schema bloat × every turn, verbose AGENTS.md re-sent every message,
raw MCP responses piling up in context.

### Run 2 — Hygiene: optimize AGENTS.md (~30 min)

**What:** participants edit `AGENTS.md` to apply black-box hygiene levers.

Levers they control:
- **Context scoping**: name the exact files; remove broad exploration hints.
- **Output discipline**: "minimal changes, no preamble."
- **Model choice**: set cheapest model that still works in `.claude/settings.json`.
- **Cache discipline**: no unnecessary re-reads or model switching.

**Measure:** `tokens:measure` → agent run (same task, **different
branch**) → `tokens:measure` → `tokens:compare run1-baseline run2-hygiene`.

**Learning:** participants see a modest but real gain (10–30% depending on the
bloat). Discussion: **which edit moved which number?** And — critically — **the
ceiling**: AGENTS.md hygiene alone can't fix bloated MCP tool schemas or oversized
tool responses. That requires controlling the tool layer itself. This is the bridge
to Run 3.

### Run 3 — Tool layer: choose your approach (~50 min)

**What:** participants apply a tool-layer optimization to reduce the token cost of MCP
interactions. The facilitator presents two approaches (10 min). Teams **choose one** and
implement it (40 min). Different teams picking different approaches creates a richer wrap
discussion — they compare results across strategies.

#### Option A — Proxy-MCP

Build a thin proxy service that sits between the agent and the 5 bloated MCP servers.

The proxy implements:
1. **Compact tool results**: structured summary instead of raw response (exit code,
   parsed fields, `truncated` flag, artifact path for full output).
2. **Lazy / minimal tool schemas**: the proxy exposes compact tool descriptions; the
   bloated upstream schemas never reach the agent.
3. **Re-read dedup**: if a resource hasn't changed, return `unchanged` instead of the
   full body.

**Best for:** scenarios where MCP servers are external / third-party and you can't
modify them. Adds a network hop. Good fit for PlataCard's reality (TestRail, Sentry,
Confluence — services you don't rewrite).

#### Option B — Local hooks

Add a `PostToolUse` hook in `.claude/hooks/` that transforms tool results **before**
they enter the agent's context. Same transformations as Option A — truncation, field
filtering, structured summary — but without a separate service. The hook is a shell or
JS script that Claude Code invokes on every tool response.

The hook implements:
1. **Compact tool results**: parse JSON response → keep only essential fields → return
   compact JSON with `_truncated` flag.
2. **Selective field filtering**: drop verbose metadata from upstream API responses.
3. **Pagination enforcement**: limit large list responses to first N items.

**Best for:** quick local optimization when you can't or don't want to deploy a separate
service. Works entirely within Claude Code config — no Docker, no network hops.
Limitation: no cross-call state (dedup, caching require memory between calls — that's
what the proxy is for).

#### Comparison (given to participants before they choose)

| | Option A: Proxy-MCP | Option B: Local hooks |
|---|---|---|
| **Where it lives** | Separate service | `.claude/hooks/` directory |
| **Infra overhead** | Extra process + network hop | Zero — invoked by Claude Code |
| **State across calls** | Yes — can cache, dedup | No — stateless per invocation |
| **Reuse across agents** | Yes — any MCP client | No — Claude Code only |
| **Best when** | You need caching/dedup/state | You want a quick local-only fix |
| **PlataCard relevance** | High — wrap TestRail/Sentry/Confluence | High — quick optimization without deploy |
| **Expected token saving** | 40–90% on tool-result input | 40–70% on tool-result input |

**Measure:** `tokens:measure` → agent run (same task, another branch) → `tokens:measure`
→ `tokens:compare run2-hygiene run3-tool-layer`.

**Learning:** regardless of the approach chosen, this is the biggest delta of the
workshop. The wrap discussion compares results across teams that picked different options —
did both work? Was the delta similar? What trade-offs emerged?

### Landscape: all approaches to tool-layer optimization

The two options above are the ones practiced hands-on. The facilitator briefly names
the full landscape so participants leave with a mental map:

| Approach | How it works | Best when | Not covered hands-on because |
|---|---|---|---|
| **Well-designed MCP from the start** | Write compact schemas, pagination, `truncated` flags in the MCP server itself | You own the MCP server code | Requires MCP server source access (not always the case at PlataCard) |
| **Proxy-MCP** (Option A) | Separate service transforms responses | MCP servers are external / third-party | — hands-on ✅ |
| **Local hooks** (Option B) | `PostToolUse` hook in `.claude/hooks/` transforms responses before context | Quick local optimization, no deploy | — hands-on ✅ |
| **Lazy tool loading** | Only load tool schemas for the current phase (discovery / fix / verify) | Many tools across many phases | Requires agent loop changes orthogonal to the task; reference material provided |

### Comparison & Wrap

At the end, each team has a three-row table:

| Run | What changed | Input tokens | Output tokens | Cache | Cost | Gate |
|---|---|---|---|---|---|---|
| 1 — Baseline | (none) | — | — | — | — | PASS |
| 2 — Hygiene | AGENTS.md optimized | — | — | — | — | PASS |
| 3 — Tool layer | proxy-MCP **or** local hooks | — | — | — | — | PASS |

They discuss: which lever moved which metric, the ceiling after Run 2, why Run 3 is an
order-of-magnitude larger win, and one thing that **didn't** help (and why). If teams
picked different Run 3 approaches, they compare results across strategies.

---

## 5. Measurement technology

### 5.1 The tracker: ccusage

`ccusage` is the unified tracker — both Claude Code and the Agent SDK write the same
`~/.claude/projects/*.jsonl` logs (input / output / **cache** tokens + cost).

> **Superseded by the shipped harness.** The actual runner is `npm run workshop:run1|2|3`: each run
> resets the buggy baseline itself and reads **only your run's** tokens — Claude via a pinned
> `claude --session-id <id>` transcript, Codex via its `~/.codex/sessions/` rollout. **No git branches**, no
> `tokens:measure`/`tokens:compare`. The branch-based scheme below is the original design, kept for context.

The workshop wraps it with two commands that use **git branch name** as the measurement
label — no `--label` flags to type or mistype:

```
git checkout run1-baseline
tokens:measure           # snapshot BEFORE (label = run1-baseline)
#   → run the agent
tokens:measure           # snapshot AFTER  (label = run1-baseline)

git checkout run2-hygiene
tokens:measure           # BEFORE (label = run2-hygiene)
#   → optimize AGENTS.md → run the agent
tokens:measure           # AFTER  (label = run2-hygiene)

tokens:compare run1-baseline run2-hygiene   # delta: input / output / cache / cost
```

The harness also prints the SDK's own per-run `usage` / `total_cost_usd` as a cross-check.

### 5.2 The quality gate

The quality gate (run automatically inside `workshop:run*`) — mandatory tests + typecheck + lint.
The agent cannot edit these tests (they live outside its working dir). This prevents the agent from
"passing" by writing weak tests.

### 5.3 Honesty about non-determinism

The agent varies run to run. For a 2.5 h session: compare the **direction** of change,
not exact numbers; run a config 2–3× when time allows; and anchor expectations to the
**facilitator reference deltas** (in `agenda.md`).

---

## 6. Assumed flow (2.5 h)

| Time | Segment |
|---|---|
| 0:00–0:15 | **Intro + setup check.** Docker up (5 MCP mocks running), `npm start` (product visible), `npx ccusage` (tracker working), Agent-SDK harness verified locally. Frame the thesis: "minimum cost of a correct result." Explain the 5 MCP services and the end-to-end workflow. Split into teams; each team gets a different task variant from the Angular app. |
| 0:15–0:55 | **Run 1 — Bloated Baseline.** `tokens:measure` → agent solves the task with bloated AGENTS.md + all 5 MCPs → `tokens:measure`. Quality gate must PASS. This is the expensive anchor. |
| 0:55–1:25 | **Run 2 — Hygiene.** Facilitator explains the AGENTS.md levers (5 min). Teams edit their `AGENTS.md`: scope context, tighten output, pick model. `tokens:measure` → agent solves same task (different branch) → `tokens:measure`. `tokens:compare run1-baseline run2-hygiene`. |
| 1:25–2:15 | **Run 3 — Tool layer (choose A or B).** Facilitator explains both approaches + trade-offs (10 min). Teams pick **Option A (proxy-MCP)** or **Option B (local hooks)** and implement (40 min). `tokens:measure` → agent runs through optimized tool layer → `tokens:measure`. `tokens:compare run2-hygiene run3-tool-layer`. This is the biggest delta. |
| 2:15–2:30 | **Wrap.** Discuss: Run 1→2 — what moved, what didn't, the ceiling. Run 2→3 — compare approaches across teams (A vs B). Complete comparison table (3 rows × 3 runs), trade-offs, the thing that didn't help, rubric. Bridge to PlataCard's in-house MCP strategy. |

Minute-level detail: [`agenda.md`](./agenda.md).

---

## 7. Prerequisites

### 7.1 Pre-flight (participant does before the session)

- **Docker** installed and running (for the 5 MCP mock servers).
- Node ≥ 20.11, npm, git; `npx` available.
- **Claude Code installed + own `ANTHROPIC_API_KEY`** (each participant pays their own
  usage — this is part of the learning: seeing real costs and controlling them).
- Clone the workshop repo, `npm install`, `docker compose up -d` (all 5 MCP mocks
  healthy), `npm start` works (the Angular app is visible).

### 7.2 Skills

- Read TypeScript and a `git diff`.
- Basic understanding of HTTP APIs and asynchronous programming (enough to work with
  the Angular codebase and understand the bugs).
- **Prior experience using an AI coding agent** (Cursor, Claude Code, Copilot) for at
  least several weeks of real work. This is the defining prerequisite separating the
  advanced track from the basic track.

---

## 8. Final metrics (success + rubric)

### 8.1 Success criteria

A participant succeeds when, by the end of the workshop, they have:

1. The **quality gate PASS** on all three runs (no regression — each optimization must
   preserve correctness).
2. A **3-row comparison table** (Run 1 baseline → Run 2 hygiene → Run 3 tool layer)
   with measurable deltas in input, output, cache, and cost.
3. The ability to say **which change moved which metric**: "AGENTS.md scoping cut input
   20%"; "tool-layer optimization cut tool-response input 60%."
4. One named optimization that **didn't help**, with the reason (e.g. "model choice alone
   — the tool schema bloat dominated, so a cheaper model saved cost but not tokens").

### 8.2 Rubric

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| **Measurement** | no measurements | one run measured | all 3 runs measured + deltas |
| **Correctness** | gate fails on any run | gate passes on 2 runs | gate passes on all 3 runs |
| **Optimizations** | no delta proven | one delta (e.g. Run 1→2 only) | both deltas (1→2 AND 2→3) |
| **Trade-off explanation** | "fewer tokens" | a delta with attribution | trade-offs + a limit named |

**Pass:** no zero in Measurement or Correctness, and both deltas (Run 1→2 and Run 2→3)
with proven improvements.

### 8.3 Long-term value for PlataCard

Beyond the rubric, the workshop delivers:

- A **shared vocabulary** across teams: input/output/cache tokens, cost attribution,
  tool-schema bloat, tool-result share.
- A **repeatable three-run loop** (`baseline → hygiene → tool-layer`) that teams can apply
  independently to their own MCP-enabled workflows.
- **Hands-on tool-layer patterns**: participants leave with working code for either
  proxy-MCP or local hooks — two concrete patterns for wrapping existing
  infrastructure (TestRail, Sentry, Confluence, etc.) without replacing it.
- **Awareness of the real ceiling**: AGENTS.md hygiene helps (Run 2), but the order-of-magnitude
  savings are in controlling the tool layer (Run 3). This directly informs build-vs-buy
  decisions for internal AI infrastructure.
