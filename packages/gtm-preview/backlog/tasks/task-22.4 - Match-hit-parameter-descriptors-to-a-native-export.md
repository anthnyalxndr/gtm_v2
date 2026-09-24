---
id: TASK-22.4
title: Match hit parameter descriptors to a native export
status: To Do
assignee: []
created_date: '2026-09-24 21:10'
labels:
  - export
dependencies: []
parent_task_id: TASK-22
priority: medium
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Hits now render in Tag Assistant, but their parameter descriptors differ in two ways. A native export omits the descriptor entirely on some parameters where this tool always writes one, and it carries a shortNameRegExp field on others that this tool never writes. There is also a parameter count difference of one, which is the dr referrer a native preview has and a headless run does not, and that is already recorded as an accepted difference.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Which parameters a native export gives a descriptor, and which it leaves bare, is established from the captured exports and applied
- [ ] #2 shortNameRegExp is written where a native export writes it
- [ ] #3 Hit parameters match the native export for every hit in the captured contact flow, apart from the accepted dr difference

<!-- AC:END -->
