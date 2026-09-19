---
id: TASK-7
title: Execute scenario steps against a page
status: Done
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 17:01'
labels:
  - core
dependencies:
  - TASK-1
  - TASK-2
  - TASK-4
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The step executor turns the scenario's steps array into Playwright actions. It is the only place that maps step kinds to browser calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 navigate, click, and fill steps run against the fixture site and the resulting page state matches
- [ ] #2 waitForEvent resolves when a dataLayer event with the named event value is captured
- [ ] #3 waitForEvent fails with an error naming the event and the timeout when it never arrives
- [ ] #4 A failing step reports its index and kind in the error

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Delivered by task-13 (feat/debug-feed-capture) on 2026-09-19; the acceptance criteria that still applied are met there.
<!-- SECTION:NOTES:END -->
