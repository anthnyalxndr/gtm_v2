---
id: doc-4
title: gtm-preview backlog history
type: other
created_date: '2026-10-06 21:56'
updated_date: '2026-10-06 21:56'
---
gtm-preview tracked its work in its own Backlog.md from 2026-09-19 until it joined this workspace on 2026-10-06 (TASK-50, decision-13). That backlog's ids clash with this one's, and ids are never renumbered, so it was retired rather than merged. This document is the record: every task it held, the status it ended with, and the id it has here where work remains. The task files themselves are in the gtm-preview history before the import (commit 6418f0a of the standalone repo, directory backlog/).

Read the old id with the prefix. 'gtm-preview TASK-19' is the row below; 'TASK-19' alone means this workspace's task 19.

## Open work carried over

| gtm-preview id | Title | Status there | Here |
|---|---|---|---|
| TASK-16 | Consent handling in sessions: decide the approach after recording accept and deny flows | To Do | TASK-51 |
| TASK-17 | Verify the three paths that need a person or a real write (check 3, GA4 DebugView, still open) | In Progress | TASK-52 |

## Deferred there, not recreated

Recreate one of these if it is picked up, and link it to this document.

| gtm-preview id | Title | Why deferred |
|---|---|---|
| TASK-10 | Trigger evaluator as a pure function | Superseded by reading GTM's own debug feed (gtm-preview ADR 0003); prediction is no longer the design |
| TASK-12 | Oracle harness that drives Tag Assistant | Low value once the debug feed was captured headless; packages/gtm-preview/oracle/README.md keeps the notes |
| TASK-21 | Run against a Google tag with no GTM container and no credentials | Deferred by the user on 2026-09-25 while the export fidelity work was in flight |

## Done

| gtm-preview id | Title |
|---|---|
| TASK-1 | Local fixture site for browser tests |
| TASK-2 | Scenario schema and loader |
| TASK-3 | SessionReport type and JSON writer |
| TASK-4 | Capture dataLayer pushes from before first script |
| TASK-5 | Capture tag hits on the wire |
| TASK-6 | Build preview URL from environment parameters |
| TASK-7 | Execute scenario steps against a page |
| TASK-8 | End-to-end run command writes a report |
| TASK-9 | Resolve environment authorization codes through @anthnyalxndr/gtm-client with a local cache |
| TASK-11 | Flag mismatches between GTM's tag verdicts and observed hits |
| TASK-13 | Headless debug-feed capture behind the run command |
| TASK-14 | Export a session in Tag Assistant's import format |
| TASK-15 | Record sessions with Playwright's recorder and replay them as scenario drivers |
| TASK-18 | Load the debug build of every Google tag on the page, not only the GTM container |
| TASK-19 | Preview a workspace directly instead of creating a version |
| TASK-20 | Instrument GTM containers on the page that the scenario does not name |
| TASK-22 | Bring the generated export in line with a native preview session export, field by field |
| TASK-22.1 | Render gtag commands and non-event dataLayer pushes as messages |
| TASK-22.2 | Carry Tag Assistant's template definitions so parameters split and display as a native export does |
| TASK-22.3 | Report the full consent state on every message |
| TASK-22.4 | Match hit parameter descriptors to a native export |
| TASK-22.5 | Order messages by arrival, and match the abstractModel that follows |
| TASK-22.6 | Normalise group ids used as object keys in the comparator |
| TASK-23 | Name tags and variables the way Tag Assistant's code does |
| TASK-24 | Name the container, the environment and the page referrer as a native export does |

## Its Plan document

The last planning pass there (2026-09-25) found nothing an agent could finish alone. It listed three things a person could do: settle check 3 of TASK-17 (now TASK-52), record the deny half of the consent flows for TASK-16 (now TASK-51), and capture a native Tag Assistant export from the same page load as a headless session, using packages/gtm-preview/docs/runbooks/capture-a-native-tag-assistant-export.md. It also noted housekeeping: the saved raw sessions under reports/ predate the environment name and type fields, and the captured dictionaries packages/gtm-preview/src/export/fixtures/vendor-templates.json and hit-parameter-descriptors.json (both 2026-09-25) have no staleness check. Those items belong in this workspace's Plan at its next pass.
