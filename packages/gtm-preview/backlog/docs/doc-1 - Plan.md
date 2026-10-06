---
id: doc-1
title: Plan
type: guide
created_date: '2026-09-19 19:03'
updated_date: '2026-09-25 10:02'
---

Last planning pass: 2026-09-25 (fifth pass, after the export fidelity work and multiple-container support landed).

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

Hold off on the Google-tag-without-GTM mode. The user deferred task-21 on 2026-09-25 while the export fidelity work was in flight, so it stays out of the ready set until they say otherwise.

## Next up (in order)

Nothing is ready to pick up. Every task that an agent can finish alone is done, and the two that remain are waiting on a person.

## Human tasks that unblock High-priority work

- **task-17, check 3.** The last open criterion on the last in-progress task. Everything it needs is in place: the test container's workspace 8 serves measurement ID G-GVG5MC89MH for the GA4 property "GA4 - dev", and `run --hits debug` marks GA4 collect requests with `_dbg=1`. It wants someone watching that property's DebugView for the length of one run. The user set it aside deliberately on 2026-09-25.
- **task-16, the consent decision.** Needs recorded accept and deny sessions against a real banner, then a choice between propagating consent signals directly and clicking the banner. The contact-flow driver already clicks Accept All on a Usercentrics banner, so half the recording exists; the deny half and the decision do not.
- **A native Tag Assistant export taken from the same page load as one of ours.** This is what the remaining export differences need, and it is the single most valuable thing a person could contribute. Six classes of difference are left, all of them consequences of comparing two recordings of a live site days apart rather than two renderings of one session. The runbook in `docs/runbooks/capture-a-native-tag-assistant-export.md` makes the capture a paste-and-go job for an agent with a signed-in browser; what it cannot do is run at the same moment as a headless session. Each contact-flow capture also costs two real Google Ads conversions in the client's account.

## Blocked High tasks

None.

## Deliberately not next

- **task-21, a Google tag with no GTM container.** Deferred by the user on 2026-09-25, per the guidance above. Nothing else waits on it.

## Housekeeping to resolve at the next pass

- **task-17 is still In Progress** with three of four criteria met. It stays open only for check 3, so it is the one status a person should settle.
- **The captured raw sessions predate two fields.** `reports/sjpools-contact.raw.json` and `reports/sjpools-pageview.raw.json` were saved before a raw session recorded the environment name and type, so a document rebuilt from either still names the environment `env-8`. Re-recording those sessions would remove one accepted difference and refresh the comparison.
- **The captured template and parameter dictionaries go stale.** `src/export/fixtures/vendor-templates.json` came from two native exports and `src/export/fixtures/hit-parameter-descriptors.json` from Tag Assistant's bundle, both on 2026-09-25. Both are refreshed by hand, and neither has a check that notices when Google changes them.
