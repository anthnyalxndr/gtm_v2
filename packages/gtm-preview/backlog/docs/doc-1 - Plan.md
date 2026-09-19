---
id: doc-1
title: Plan
type: guide
created_date: '2026-09-19 19:03'
updated_date: '2026-09-19 20:02'
---

Last planning pass: 2026-09-19 (second pass, after tasks 15, 9, and 11 merged).

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

None.

## Next up (in order)

Nothing is ready. Every To Do task has been delivered and merged to `main`; tasks 10 and 12 are deferred by decision (ADR 0003). The next pass needs new tasks, and the candidates below are ordered by how much each moves the goal of a fully automated session.

1. **Consent automation** (no task yet). The spike in `docs/spikes/consent/` proved both routes: DuckDuckGo autoconsent clicking the real banner, and the option of injecting Consent Mode signals directly. A `consent` scenario field with `none`, `inject`, `accept`, and `reject` modes plus a wait for the consent update would let EU client sessions show consent-gated tags. Decision on the default mode is with the user.
2. **Google tag fixtures** (no task yet). The parser and exporter handle protocol version 3 (`containerProduct: "OGT"`) but only version 2 has a captured fixture. A gtag.js site would give the second fixture and shake out field differences.
3. **A gtag.js site path without a code** (no task yet). Google tags serve their debug build to anyone with `gtm_debug=x`; the runner currently rewrites only `gtm.js` requests. Extending the rewrite to `gtag/js` opens every gtag.js site with no credentials.

## Human tasks that unblock High-priority work

- Decide the consent default (inject vs. click the banner) and say so; a task follows.
- Confirm `--hits debug` in GA4 DebugView once, which nobody has done yet.

## Blocked High tasks

None.

## Deliberately not next

- task-10 and task-12 stay deferred.
- gtm_v2 task-33 (lookup by tag id) lives in the other repo; the code cache makes it a one-time cost here.

## Housekeeping to resolve at the next pass

- `--version-from-workspace` is tested against the fake service only; a live run is a deliberate write to a container and was not exercised.
- The `record` command's pause has not been exercised interactively in this session.
