---
id: doc-1
title: Plan
type: guide
created_date: '2026-09-19 19:03'
updated_date: '2026-09-19 20:15'
---

Last planning pass: 2026-09-19 (third pass, after tasks 16 and 17 were created).

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

None.

## Next up (in order)

1. **task-17, Verify the three paths that need a person or a real write, starting with the `record` check.** Everything shipped this week was verified headless except three paths, and one of them, the `record` command's pause in the Playwright Inspector, is the exact mechanism task-16 proposes to use for its accept and deny recordings. Doing the `record` check first makes task-16 cheaper: the same sitting that proves Record and Resume work can produce the first consent snippet. The other two checks (`--version-from-workspace` against the test container, `--hits debug` in DebugView) are independent one-off runs and can follow in any order. All three run against `GTM-WNX8FFXW` only. This is the top item because it retires the last unverified claims before more code is stacked on them, and because it needs no decision, only time at a browser.

2. **task-16, Consent handling: decide after recording accept and deny flows.** The decision is open and stays open until the recordings exist, which is the point of the task. It goes second because its method (record a consent click as a driver snippet, then compose it with a tag-test flow) depends on the recorder working interactively, which task-17 establishes first. Once the two snippets are recorded, the composition mechanism and the consent-path label in the report are ordinary code with tests, and the ADR closes the question. The trade-off between injecting Consent Mode signals and clicking the banner is written in the task; no default is chosen here, per the task's own terms.

The two share the recorder, so treat them as one sitting where practical: verify `record` (task-17), then immediately record the accept and deny flows on a client site (task-16's first criterion), then finish task-17's remaining checks and task-16's code separately.

## Human tasks that unblock High-priority work

No High tasks remain. Both ready tasks need a person:

- task-17: someone at the Inspector for the `record` check, and someone watching GA4 DebugView for the `--hits debug` check. The `--version-from-workspace` run is a deliberate write to the test container and should be run by hand once.
- task-16: the choice of default consent mode, made after the recordings and written as an ADR.

## Blocked High tasks

None.

## Deliberately not next

- task-10 and task-12 stay deferred (ADR 0003).
- Google tag (protocol version 3) fixtures and a `gtag/js` rewrite path have no task yet; both are worth creating once a gtag.js site is in scope, and neither blocks the two tasks above.

## Housekeeping to resolve at the next pass

- task-16's implementation note about the open decision appears twice in the task file; the CLI appended it twice. One copy should be removed with `--notes`.
- `@duckduckgo/autoconsent` is a dependency with no product code using it; keep it while task-16 is open, drop it if injection wins.
- gtm_v2 task-33 (lookup by tag id) is uncommitted in the other repo.
