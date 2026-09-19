---
id: TASK-8
title: End-to-end run command writes a report
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 04:21'
labels:
  - cli
dependencies:
  - TASK-2
  - TASK-3
  - TASK-4
  - TASK-5
  - TASK-6
  - TASK-7
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Wire the CLI run command: load the scenario, launch Chromium, install capture, execute steps, and write a SessionReport. This is the first usable milestone even before any prediction exists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 pnpm dev run with a scenario pointing at the fixture site writes a report whose events and hits match what the fixture produces
- [ ] #2 Exit code is 0 on success and non-zero with a one-line reason on failure
- [ ] #3 The --out flag controls the report path and defaults to reports/<scenario-name>.json
- [ ] #4 The run works headless with no Google login

<!-- AC:END -->
