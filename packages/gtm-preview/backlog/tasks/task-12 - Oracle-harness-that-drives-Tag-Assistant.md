---
id: TASK-12
title: Oracle harness that drives Tag Assistant
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 04:21'
labels:
  - oracle
dependencies:
  - TASK-3
  - TASK-8
priority: low
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Measure how often predicted firings match GTM's own verdict. A separate harness under oracle/ opens Tag Assistant with Playwright and a persistent browser profile, runs the same scenario, scrapes the debug pane, and emits a SessionReport. It is allowed to be brittle and never runs in CI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 The harness runs an existing scenario file unchanged and writes a SessionReport
- [ ] #2 Nothing under src/ imports from oracle/, enforced by a lint rule or test
- [ ] #3 A diff command compares a product report with an oracle report and prints per-event agreement
- [ ] #4 The harness reads its browser profile path from an environment variable outside the repo

<!-- AC:END -->
