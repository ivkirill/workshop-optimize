# Agent Instructions — Plata Burrito CRM

Angular 19 app (catalog / orders / edit-card / finance). REST backend at `/api`; task context in
5 MCP servers: jira, confluence, sentry, testrail, github.

## Task
Read `TASK.md` → ticket number. Pull the ticket from the **jira** MCP (`jira_get_issue`): description,
Definition of Done, links to confluence / sentry / testrail. The ticket + MCP context fully define
the fix — you don't need anything else.

## Scope
- Edit ONLY the feature dir named in the ticket (`src/app/<feature>/`). Don't explore the rest of the repo.
- The bug is in `*.controller.ts`. Don't change `*.types.ts`. Tests are `*.controller.spec.ts`.
- Keep API contracts (`GET /api/products`, `GET /api/orders`, `PUT /api/products/:id`) and the
  public controller surface (`state$`, `init`, `setQuery`, …). No new dependencies.

## Output
Apply minimal changes. No preamble, no essays. When the fix meets the Definition of Done, report
what changed in 1–2 lines and stop.

## Commands
`npm run start` · `npm run test` · `npm run lint`
