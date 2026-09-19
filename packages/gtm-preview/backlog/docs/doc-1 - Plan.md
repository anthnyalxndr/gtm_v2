---
id: doc-1
title: Plan
type: guide
created_date: '2026-09-19 19:03'
updated_date: '2026-09-19 19:03'
---

Last planning pass: 2026-09-19.

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

None.

## Next up (in order)

Everything below becomes ready only after the human gate in the next section: the branch `feat/debug-feed-capture` holds task-1, task-13, and task-14 in Review, and all three To Do tasks depend on task-13.

1. **task-15, Record sessions with Playwright's recorder and replay them as scenario drivers.** This is the largest remaining step toward the project goal of driving a whole session without a person. JSON steps cover the fixture site; real client sites need locators a person finds by clicking, and the recorder produces those. The user asked for this by name and confirmed the design (driver module plus a `record` command built on `page.pause()`). It touches the scenario schema, the session runner, and the CLI, and it has five testable criteria including an integration test that pasted codegen output runs unchanged, so it is ready to start.

2. **task-9, Resolve environment authorization codes through gtm-client with a local cache.** Every run against a client container currently needs someone to fetch the code by hand and put it in an environment variable. This task removes that step by name (`environment: "Latest"`), which is what makes the tool usable across all ten GTM accounts without pasting secrets. It is specified down to scope, cache location, permissions, and the 403 retry, and it tests against the client's fake service with no credentials. It goes second rather than first because the escape hatch (`authCodeEnv`) already works, so it removes friction rather than adding capability. Performance of `resolveContainer` depends on task-33 in the gtm_v2 repo (lookup by tag id), but the code cache makes that a one-time cost per container, so task-33 is not a blocker.

3. **task-11, Flag mismatches between GTM's tag verdicts and observed hits.** This is the finding a user reads the report for: GTM says a tag succeeded but nothing left the browser, or a hit left with no tag behind it. It is small and pure (report parser plus CLI summary and an exit code) and builds directly on the report shape task-13 landed. It goes third because it changes how results are read, not what can be captured, and tasks 15 and 9 widen what can be captured.

## Human tasks that unblock High-priority work

- **Review and merge `feat/debug-feed-capture` into `main`.** The branch is 4 commits ahead and 0 behind. It carries task-1 (fixture site), task-13 (debug-feed capture behind `run`), and task-14 (Tag Assistant export), all in Review. Merging closes all three and makes task-9, task-11, and task-15 ready. There is no remote, so this is a local merge.
- **Decide whether consent automation becomes a task.** The spike in `docs/spikes/consent/` proved DuckDuckGo autoconsent accepts a Squarespace banner headless and that GTM records the resulting consent update. There is no task for it yet; the shape proposed was a `consent` scenario field (`none`, `accept`, `reject`, `seeded`) plus a wait for the consent update. Client sites in the EU will need it before their sessions show consent-gated tags.

## Blocked High tasks

None. The High tasks (1, 13, 14) are complete and awaiting review, not blocked.

## Deliberately not next

- **task-10, Trigger evaluator as a pure function.** Deferred: GTM's own trigger verdicts are in the debug feed (ADR 0003), so predicting them adds nothing.
- **task-12, Oracle harness that drives Tag Assistant.** Deferred: the product reads the same record stream Tag Assistant displays.
- **Consent automation.** Not a task yet; listed under human decisions above.
- **Google tag (gtag.js, protocol version 3) fixtures.** The parser handles version 3 but only version 2 has a captured fixture. Worth a task once a gtag.js site is in scope; not created here.

## Housekeeping to resolve at the next pass

- task-1, task-13, and task-14 sit in Review on an unmerged branch; they move to Done when the branch merges.
- No task exists for consent automation despite a finished spike and an installed dependency (`@duckduckgo/autoconsent`).
- The `debug` hit policy is proven on the wire but has not been confirmed in GA4 DebugView; a one-line note in task-13's final summary or a follow-up check would close that.
- gtm_v2 task-33 (lookup by tag id) lives in another repo and is uncommitted there; it only speeds task-9 and is not tracked here.
