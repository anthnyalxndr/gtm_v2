---
id: TASK-22.6
title: Normalise group ids used as object keys in the comparator
status: To Do
assignee: []
created_date: '2026-09-24 21:10'
labels:
  - export
dependencies: []
parent_task_id: TASK-22
priority: low
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

pageSummaries and containerLoadInfoByGroupId are keyed by group id, which differs between any two sessions. The comparator ignores a group id as a value but not as a key, so it reports every entry as missing on one side and extra on the other. That is noise in every comparison and hides real differences in those maps.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Object keys that are group ids are aligned positionally or by the page they belong to rather than compared literally, and the comparator reports no false difference for pageSummaries or containerLoadInfoByGroupId between two sessions of the same flow
- [ ] #2 A unit test covers it with two documents that differ only in their group ids

<!-- AC:END -->
