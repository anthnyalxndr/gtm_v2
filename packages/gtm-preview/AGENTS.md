# AGENTS.md

> Single source of truth for this repo. `CLAUDE.md` and `.cursor/rules/agents.mdc`
> both point here. Keep this file current; it is read by every coding agent.

## Project

**GTM Preview** runs a Google Tag Manager (GTM) preview session with no human in the loop.
Given a container and a target site, it loads pages, performs interactions, and reports which
dataLayer events occurred, which tags fired or should have fired, and what each tag sent over
the network.

## The core decision: read GTM's own debug feed, headless

The product loads the container's **debug build** in Playwright and reads the records it
pushes. That build is what Tag Assistant displays; we skip Tag Assistant and own the queue
ourselves. Full findings with reproduction scripts: `docs/research/2026-09-19-gtm-debug-feed.md`
and `docs/spikes/debug-queue/`. Decision record: ADR 0003.

How it works, in order:

1. The site's snippet requests `gtm.js?id=<container>`. A Playwright route rewrites that
   request to add `gtm_auth=<environment code>&gtm_preview=env-<n>&gtm_debug=x`. Google
   returns the debug build. Without the code it returns 403.
2. An init script defines `window["google.tagmanager.debugui2.queue"]` before any page
   script runs, so every record the build pushes lands in our recorder.
3. The build runs immediately and emits, because the debug signal is only on the container
   request, not the page. If a page does carry a signal (a stale `__TAG_ASSISTANT` cookie),
   the build pushes `CONTAINER_STARTING` with a `data.resume` function and waits; the
   recorder calls it. Routes abort Google's `debug/bootstrap` and `debug/badge` scripts so
   nothing contacts Tag Assistant.
4. Records arrive per event: `EVENT_STARTED`, `MACRO_RESOLVED` (every trigger with its
   predicate results and pass/fail), `TAG_STARTED` (execute, blocked, suppressed) with
   resolved parameters, `TAG_STATUS` (succeeded, failed, exception), `TAG_BLOCKED`,
   `GTAG_HIT`, `CONSENT_STATE`, and more. GTM web containers use protocol `version: "2"`,
   Google tags `"3"`.
5. A request listener records every vendor hit that left, or would have left, the browser.

Hits are governed by a per-run policy. `dry` (default) aborts every vendor hit inside the
browser; the debug stream is unchanged because GTM reports success when tag code finishes,
not when the network call lands. `debug` lets hits out and appends `_dbg=1` to GA4 collect
requests so they show in DebugView. `live` lets hits out untouched. Only GA4 has a debug
flag: in `debug` and `live` modes, Ads, Floodlight, and Meta hits are real conversions.

Environment authorization codes come from the Tag Manager API (`environments.list`) through
`@anthnyalxndr/gtm-client` (`src/auth/environment-codes.ts`), requested with the readonly
scope only and cached owner-only under `~/.config/gtm-preview/`. The client's OAuth token in
`~/.config/gtm-apply/` is shared with gtm-apply. Every container has Live (env 1) and Latest
(env 2); a scenario names one. A 403 from the container with a cached code means the
environment was reauthorized: the CLI refetches once and retries. Codes do not expire and
unlock the unpublished container with full instrumentation, so they are secrets and never
appear in logs, reports, or the repo. Google tags (`G-`, `GT-`) serve their debug build to
anyone.

Two reasons this replaced the earlier plan to predict firing from the API (ADR 0002):
prediction was an inference and this is GTM's verdict, and the dependency is a versioned
data protocol rather than a UI to scrape.

## Tag Assistant import files

`buildTagAssistantExport` in `src/export/tag-assistant.ts` writes the document Tag Assistant's
"Export session" produces, so a headless run opens through its "Import session" menu (no login
needed, read-only). Verified on 2026-09-19: events, built-in trigger badges, container details,
tag cards with parameters, firing triggers with evaluated filters, and variables all render.
The shape is pinned by `src/export/fixtures/tag-assistant-export-shape.json`, a key-and-type
signature taken from a real export (no data). Display names and thumbnails for templates come
from `src/export/templates.ts`; unknown template ids fall back to the id. The authorization
code is left out of the file unless `--include-auth` is passed on `run`.

## Tech stack

- TypeScript (strict), Node 22, pnpm
- `playwright` (library, not `@playwright/test`) drives Chromium. `pnpm browsers` downloads it.
- `zod` validates scenario files and Tag Manager API responses at the boundary
- Vitest for unit tests. tsx runs the CLI in dev, tsup bundles it.
- No HTTP server. The entry point is a CLI (`src/index.ts`, bin name `gtm-preview`).

## Commands

| Task                           | Command                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| Install                        | `pnpm install` then `pnpm browsers` (one-time Chromium download) |
| Run the CLI in dev             | `pnpm dev run scenarios/<name>.json --out report.json`           |
| Build                          | `pnpm build`                                                     |
| Run built CLI                  | `pnpm start run scenarios/<name>.json`                           |
| All checks (the pre-push gate) | `pnpm verify`                                                    |
| Tests                          | `pnpm test`                                                      |
| One test file                  | `pnpm vitest run src/cli/parse-args.test.ts`                     |
| One test by name               | `pnpm vitest run -t "parses run with --out"`                     |
| Watch tests                    | `pnpm test:watch`                                                |
| Lint                           | `pnpm lint`                                                      |
| Typecheck                      | `pnpm typecheck`                                                 |

## Architecture to keep as the code grows

- **Scenarios are data, plus an optional driver.** A scenario names the start URL, the
  container and environment, and either JSON steps or a `driver` module (default export
  `async (page, ctx) => {}`, usually pasted from the Playwright recorder). Drivers are executed
  code. Scenario files live under `scenarios/`.
- **Records stream to Node as they happen.** The init script calls an exposed binding for
  every debug record and dataLayer push, so nothing is lost on navigation. The in-page arrays
  exist only for `waitForFunction` polling within one page.
- **One `SessionReport` shape.** Ordered events, each with GTM's tag verdicts, observed hits,
  page URL, and timestamp. JSON is the primary output. Any HTML or terminal view, and any
  export to another tool's format, is a renderer over that JSON.
- **Environment codes come from the API or the operator, never from scenario files.**
  Scenarios name an environment; the resolver fetches and caches its code. `authCodeEnv` is
  the escape hatch for a code handed over without API access.
- **Record parsing is a pure function.** Raw queue records in, `SessionReport` out. No
  browser, no network. Most unit tests belong here, and captured record fixtures from real
  containers accumulate under `src/**/fixtures/`.
- **Browser work is thin.** Code that touches a `Page` only collects raw events and requests
  into plain objects. Everything after that is testable without a browser.
- **Secrets stay out of scenario files.** The `gtm_auth` token and any Google OAuth credentials
  live in `.env` (untracked). Scenario files reference them by environment variable name.

## GTM mechanics worth knowing

- Environment preview parameters select which container version loads. They do not turn on the
  debug pane. Environment selection and debug mode are independent.
- Tag Assistant's own connection works by opening the target URL with `gtm_debug=<ms
timestamp>` and `__TAG_ASSISTANT=<token>` and talking to the page through `window.opener`.
  We never use it. If the product ever needs to talk to Tag Assistant, that is the protocol.
- The debug build does not mark GA4 hits with `_dbg=1` by itself. In a real preview session
  Tag Assistant supplies `debug_mode` over its connection. The `debug` hit policy appends
  `_dbg=1` at the network layer instead.
- Consent Mode changes which tags fire. A scenario that sets no consent state tests the
  container's default, and the report should name which default applied.
- Server-side tagging containers add a hop: the browser hit goes to the tagging server, which
  fans out. Browser network capture sees only the first hop. Treat server containers as out of
  scope until the web container path is solid.

## SDLC working agreements

These are non-negotiable for all agents and humans:

- **Conventional Commits** — `<type>(<scope>): <desc>` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`). **No `Co-Authored-By` trailer.**
- **Trunk-based** — work on a short-lived branch `<type>/<short-desc>`; **never commit directly to `main`**. Merge within 1–2 days.
- **Tests with every change** — production changes ship with test changes. Don't commit if tests fail.
- **Never** use `git push --force` or bypass hooks with `--no-verify`.
- **Security** — never commit secrets; `.env*`, `*.pem`, `*.key`, `*_rsa`, `*.p12` are gitignored. Check `git diff --cached` before committing. Never read/print `.env` files.
- **Hook strictness:** `standard` (see `.husky/` or `.pre-commit-config.yaml`).
- **What is next** lives in the Backlog.md document titled `Plan` (`backlog doc view` or `backlog/docs/`), an ordered list with rationale rewritten at each planning pass; `backlog-next` reads it first.

## Suggested workflow loop

For any non-trivial change, follow this loop (skills are Claude Code superpowers skills):

1. **Brainstorm** the design — `superpowers:brainstorming` (→ spec in `docs/superpowers/specs/`).
2. **Plan** — `superpowers:writing-plans` (→ plan in `docs/superpowers/plans/`).
3. **Implement test-first** — `superpowers:test-driven-development`.
4. **Debug systematically** when something breaks — `superpowers:systematic-debugging`.
5. **Self-review** before claiming done — `superpowers:verification-before-completion` (run the actual commands).
6. **Request review** — `superpowers:requesting-code-review` and/or `/code-review`.
7. **Commit & PR** — `commit-commands:commit-push-pr` (Conventional Commits).
8. **Record decisions** worth keeping in `docs/decisions/` (ADRs).

## Tooling (skills / plugins to reach for)

- `context7` for current Playwright and Tag Manager API docs. Playwright's request
  interception and `addInitScript` APIs change between versions, so check before relying on
  memory.
- The `Google_Tag_Manager` MCP tools (`gtm_tag`, `gtm_trigger`, `gtm_variable`,
  `gtm_environment`, `gtm_workspace`) reach the same Tag Manager API the product uses. Inspect a
  real container with them before writing code against its shape.
- The Playwright and Chrome DevTools MCP servers let you open a target page, watch dataLayer
  pushes, and inspect hits by hand. Prototype a flow there, then write it as code with a test.
  Do not leave a flow living only in a conversation.
- `systematic-debugging` for runtime issues.
- Always available: `superpowers:*`, `commit-commands:*`, `code-review`, `pr-review-toolkit:*`.

## Learned User Preferences

_Append durable preferences the user expresses (one bullet each, with the why).
These persist across sessions and apply to how you work in this repo._

<!-- e.g. - Prefer X over Y because … -->

## Learned Workspace Facts

_Append durable, non-obvious facts about this codebase (architecture, gotchas,
env quirks) as you discover them. Verify a fact still holds before relying on it._

<!-- e.g. - The build fails if DB is unreachable because … -->
