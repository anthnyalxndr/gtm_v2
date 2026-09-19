# AGENTS.md

> Single source of truth for this repo. `CLAUDE.md` and `.cursor/rules/agents.mdc`
> both point here. Keep this file current; it is read by every coding agent.

## Project

**GTM Preview** runs a Google Tag Manager (GTM) preview session with no human in the loop.
Given a container and a target site, it loads pages, performs interactions, and reports which
dataLayer events occurred, which tags fired or should have fired, and what each tag sent over
the network.

## The core decision: build it, do not drive Tag Assistant

The product is a from-scratch reimplementation over Playwright. It does not depend on
tagassistant.google.com at runtime. Two reasons, both decided on 2026-09-18:

1. Owning the pipeline means every layer is extensible. Custom reporters, CI gates, diffing two
   container versions, and consent-state matrices are all additions to code we control.
2. If Google deprecates or redesigns Tag Assistant, the product keeps working. A scraper of the
   debug pane would break on any UI change and die with the product.

Driving the real Tag Assistant still has one job: it is the **oracle**. A separate, optional
harness under `oracle/` opens Tag Assistant through Playwright, runs the same scenario, and
scrapes GTM's own verdict so we can measure how often our inferred "tag fired" matches the real
one. It is allowed to be brittle, is never imported by `src/`, and runs on demand, not in CI.

## How the reimplementation works

- **Load the draft container without a login.** The container's environment parameters select a
  version: `gtm_auth=<token>&gtm_preview=env-<n>&gtm_cookies_win=x`. The tokens come from the
  Environments page or the Tag Manager API. The `gtm_cookies_win=x` part sets a cookie so the
  selection survives navigation.
- **Instrument before any page script runs.** `page.addInitScript` wraps `dataLayer.push` and
  records every event with a timestamp and page URL. At runtime, read
  `google_tag_manager[<containerId>].dataLayer.get(...)` for resolved variable values.
- **Capture hits on the wire.** `page.on('request')` matches outbound tag hits by URL pattern
  (GA4 `/g/collect`, Google Ads conversion, Floodlight, Meta, and whatever the container uses)
  and parses their payloads. These are facts.
- **Predict what should have fired.** Pull the workspace's tags, triggers, and variables from the
  Tag Manager API v2 and evaluate trigger conditions against the captured events. This is an
  inference. Custom JavaScript variables, lookup tables with side effects, and consent state can
  make GTM's real decision differ, so reports must label predicted firings as predicted and keep
  them in a separate column from observed hits.
- **Reconcile.** For each event, the report shows predicted tags, observed hits, and the
  mismatch set. A mismatch is the finding a user cares about.

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

- **Scenarios are data, not test files.** A scenario names the start URL, the container and
  environment, an optional consent state, and a list of steps (navigate, click, fill, wait for
  event). Playwright executes steps. Scenario files live under `scenarios/` and the same file
  must run under both the product and the oracle harness.
- **One `SessionReport` shape.** Ordered events, each with predicted tags, observed hits, page
  URL, and timestamp. JSON is the primary output. Any HTML or terminal view is a renderer over
  that JSON, and the oracle harness emits the same shape so the two can be diffed.
- **Container config comes from the API, never a hand-copied export.** The Tag Manager API v2
  (`tagmanager.googleapis.com`, scope `tagmanager.readonly`) supplies tags, triggers, variables,
  and environment tokens. Cache it per workspace fingerprint so a run is reproducible.
- **Trigger evaluation is a pure function.** `(containerConfig, event, variableValues) =>
predictedTags`. No browser, no network. Most unit tests belong here, and fixtures captured
  from real containers should accumulate here.
- **Browser work is thin.** Code that touches a `Page` only collects raw events and requests
  into plain objects. Everything after that is testable without a browser.
- **Secrets stay out of scenario files.** The `gtm_auth` token and any Google OAuth credentials
  live in `.env` (untracked). Scenario files reference them by environment variable name.

## GTM mechanics worth knowing

- Environment preview parameters select which container version loads. They do not turn on the
  debug pane. Environment selection and debug mode are independent.
- Tag Assistant's debug connection works by opening the target URL with `gtm_debug=<ms
timestamp>` and `__TAG_ASSISTANT=<token>` and talking to the page through `window.opener`. This
  matters only for the oracle harness, and it is why that harness is brittle: a full navigation
  that drops the parameters or the opener loses the connection.
- GTM preview sets `debug_mode` on GA4 hits automatically. When diffing product output against
  oracle output, strip the parameters preview mode injects before comparing payloads.
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
