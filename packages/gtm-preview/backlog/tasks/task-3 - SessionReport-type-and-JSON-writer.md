---
id: TASK-3
title: SessionReport type and JSON writer
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
labels:
  - core
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Every runner, including the future oracle harness, emits one report shape so outputs can be diffed. Predicted tags and observed hits stay in separate fields.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A SessionReport type and matching zod schema are exported with ordered events, each holding page URL, timestamp, predictedTags, and observedHits
- [ ] #2 The writer serialises a report to JSON with stable key order so two identical runs produce byte-identical files
- [ ] #3 A report that has predictions merged into observations cannot be expressed by the type

<!-- AC:END -->
