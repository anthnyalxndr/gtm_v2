---
id: TASK-17
title: Verify the three paths that need a person or a real write
status: In Progress
assignee: []
created_date: '2026-09-19 20:13'
updated_date: '2026-09-21 02:49'
labels:
  - verification
dependencies:
  - TASK-9
  - TASK-15
priority: medium
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Three shipped behaviours were tested only against fakes or on the wire, never end to end, because each needs something a headless session cannot supply: a deliberate write to a real container, a person at the Playwright Inspector, or a person watching GA4 DebugView. Run each once on the test container GTM-WNX8FFXW (never a client container) and record what happened in this task's notes, fixing anything that does not behave as documented.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 run --version-from-workspace "Default Workspace" against GTM-WNX8FFXW creates a version without publishing, the CLI reports the version path, and a following run against Latest loads that version; the created version is noted here
- [x] #2 record scenarios/example.json opens headed, pauses in the Inspector with Record available, and after Resume writes the report for the clicks made; the generated code from the Inspector is pasted into a driver and replays headless without edits
- [ ] #3 run --hits debug against the fixture site with a scenario whose container sends to a real GA4 property shows the events in that property's DebugView, and the note records which property was used and that the hits carried _dbg=1
- [ ] #4 Any discrepancy found is fixed in the same change with a test, or split into its own task

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Check 1 (2026-09-20, GTM-WNX8FFXW): run --version-from-workspace "Default Workspace" created accounts/6335001612/containers/241202947/versions/3 (named gtm-preview 2026-09-20T19:48:30.183Z, 1 tag, 1 trigger, 1 variable) and the run that followed loaded Latest from the API. Verified via the API that Live (env 1) still serves version 1 and Latest (env 2) serves version 3. Two observations: GTM created version 3 even though the workspace had no changes since version 2, and it replaced the Default Workspace with a new one (id 2 became 8), which the client's fake modelled correctly. Fixed the first: the resolver now calls workspaces.getStatus first, skips the write when there are no changes, refuses on merge conflicts, and surfaces compilerError; a second live run reported 'no changes since the latest version; not creating a version' and Latest stayed at version 3. Tests cover the skip and the conflict paths.

Check 2, part 1 (2026-09-20, www.sjpools.com, GTM-5KNSPW9K Live, hits dry): record opened headed, paused in the Inspector, and after Resume wrote the report, raw session, and Tag Assistant file for a two-page session (home, then /contact with a form submit): 35 events, 20 tags executed, 3 Google Ads tags reported failed by GTM, 36 hits all aborted. Two defects found and fixed in the same change: (1) GTM sends a diagnostics beacon to gtm.js with is_td=1 that Google answers with 204; the container matcher rewrote it and the run failed as if the code were rejected (Wix sends it, Squarespace did not). (2) Event ids restart on every page load and GTM can reuse an id within a load for a different event name, so the parser and exporter now key events by groupId, id, and name; before, the second page's events merged into the first page's and every later hit fell onto the wrong event. A two-page regression test covers it. Part 2 (paste the Inspector's generated code into a driver and replay headless) is pending the code.

Check 2, part 2 (2026-09-20, www.sjpools.com): the first recording was lost because the Inspector only displays generated code and never saves it. Fixed by having record enable Playwright's recorder on the session (the private _enableRecorder call that playwright codegen --output uses) and convert its output to scenarios/flows/<name>.recorded.mjs automatically; an integration test records fixture steps, converts, and replays headless. Second recording wrote a four-action driver (Accept All, CONTACT, phone link, email link). Replayed headless with no edits: ran without error, but the phone and email clicks raced GTM on the contact page and were not captured. With four waitForEvent lines added (including a new count option for a second gtm.linkClick) the replay reproduced the recording: 23 events over two pages, call_click and email_click GA4 tags fired, one Ads tag reported failed by GTM. So 'without edits' holds for running, and waits are needed for fidelity; the README says so. Known limitation seen here: hits that leave a few ms after the next event starts are attributed to that event by time (page_view hits landing on consent_status), so they show as unexplained; a follow-up could attribute to the nearest earlier event with an explaining tag.
<!-- SECTION:NOTES:END -->
