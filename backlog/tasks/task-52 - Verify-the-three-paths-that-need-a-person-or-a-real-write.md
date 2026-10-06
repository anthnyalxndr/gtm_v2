---
id: TASK-52
title: Verify the three paths that need a person or a real write
status: In Progress
assignee: []
created_date: '2026-10-06 21:55'
updated_date: '2026-10-06 21:55'
labels:
  - gtm-preview
  - verification
dependencies: []
priority: medium
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three shipped gtm-preview behaviours were tested only against fakes or on the wire, never end to end, because each needs something a headless session cannot supply: a deliberate write to a real container, a person at the Playwright Inspector, or a person watching GA4 DebugView. Run each once on the test container GTM-WNX8FFXW (never a client container) and record what happened in this task's notes, fixing anything that does not behave as documented. Carried over from the gtm-preview backlog (its TASK-17, created 2026-09-19, in progress since 2026-09-20) when the package joined this workspace (TASK-50). Checks 1 and 2 are done there; only check 3 remains and it needs a person.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 run --version-from-workspace "Default Workspace" against GTM-WNX8FFXW creates a version without publishing, the CLI reports the version path, and a following run against Latest loads that version; the created version is noted here
- [x] #2 record scenarios/example.json opens headed, pauses in the Inspector with Record available, and after Resume writes the report for the clicks made; the generated code from the Inspector is pasted into a driver and replays headless without edits
- [ ] #3 run --hits debug against the fixture site with a scenario whose container sends to a real GA4 property shows the events in that property's DebugView, and the note records which property was used and that the hits carried _dbg=1
- [x] #4 Any discrepancy found is fixed in the same change with a test, or split into its own task
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Check 1 (2026-09-20, GTM-WNX8FFXW): run --version-from-workspace "Default Workspace" created accounts/6335001612/containers/241202947/versions/3 (named gtm-preview 2026-09-20T19:48:30.183Z, 1 tag, 1 trigger, 1 variable) and the run that followed loaded Latest from the API. Verified via the API that Live (env 1) still serves version 1 and Latest (env 2) serves version 3. GTM created version 3 even though the workspace had no changes since version 2, and it replaced the Default Workspace with a new one (id 2 became 8). Fixed the first: the resolver calls workspaces.getStatus first, skips the write when there are no changes, refuses on merge conflicts, and surfaces compilerError. Tests cover the skip and the conflict paths.

Check 2 (2026-09-20, www.sjpools.com, GTM-5KNSPW9K Live, hits dry): record opened headed, paused in the Inspector, and after Resume wrote the report, raw session, and Tag Assistant file for a two-page session: 35 events, 20 tags executed, 3 Google Ads tags reported failed by GTM, 36 hits all aborted. Defects found and fixed in the same change: the is_td=1 diagnostics beacon to gtm.js was rewritten as the container load and the run failed as if the code were rejected; event ids restart on every page load and GTM can reuse an id within a load, so the parser and exporter key events by groupId, id and name. The Inspector only displays generated code and never saves it, so record now enables Playwright's recorder on the session and converts its output to scenarios/flows/<name>.recorded.mjs; an integration test records fixture steps, converts, and replays headless. A four-action recording replayed headless with no edits but needed four waitForEvent lines to reproduce the recording's 23 events over two pages; the README says so. Commits in the gtm-preview history: 6eb01e5, bd5a730, 215ea55. Two documentation defects fixed 2026-09-23: the debug protocol version claim (GTM has reported 2 and 16, Google tags 2 and 3, identical record shapes, nothing branches on it) and the claim that the debug build does not mark GA4 hits with _dbg=1 (true of the GTM container's build, false of the Google tag's).

Check 3 setup (2026-09-23): GA4 property 'GA4 - dev' (properties/519543836, account anthny.xyz 380295431), web stream 'dev.anthny.xyz - web', measurement ID G-GVG5MC89MH. The test container's 'Const - GA4 Measurement ID' variable in workspace 8 holds that ID; no version was created, so Live and Latest still serve G-PLACEHOLDER. Since gtm-preview task-19 the run is: run <scenario> --workspace "Default Workspace" --hits debug. Check 3 was skipped on 2026-09-23 at the user's request and left unchecked. It needs someone watching DebugView for the GA4 - dev property while the run happens.
<!-- SECTION:NOTES:END -->
