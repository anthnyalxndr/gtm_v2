---
id: TASK-11
title: Reconcile predicted tags with observed hits in the report
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 04:21'
labels:
  - predict
dependencies:
  - TASK-3
  - TASK-8
  - TASK-10
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The mismatch set is the finding a user cares about. For each event the report shows predicted tags, observed hits, and which predictions had no hit and which hits had no prediction.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Each report event lists predicted tags and observed hits in separate fields plus a mismatches field
- [ ] #2 A predicted tag with no matching hit and a hit with no predicting tag both appear in mismatches
- [ ] #3 The run command exits non-zero when --fail-on-mismatch is set and mismatches exist

<!-- AC:END -->
