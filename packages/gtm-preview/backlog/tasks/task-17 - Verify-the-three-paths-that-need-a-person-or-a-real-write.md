---
id: TASK-17
title: Verify the three paths that need a person or a real write
status: To Do
assignee: []
created_date: '2026-09-19 20:13'
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

- [ ] #1 run --version-from-workspace "Default Workspace" against GTM-WNX8FFXW creates a version without publishing, the CLI reports the version path, and a following run against Latest loads that version; the created version is noted here
- [ ] #2 record scenarios/example.json opens headed, pauses in the Inspector with Record available, and after Resume writes the report for the clicks made; the generated code from the Inspector is pasted into a driver and replays headless without edits
- [ ] #3 run --hits debug against the fixture site with a scenario whose container sends to a real GA4 property shows the events in that property's DebugView, and the note records which property was used and that the hits carried _dbg=1
- [ ] #4 Any discrepancy found is fixed in the same change with a test, or split into its own task

<!-- AC:END -->
