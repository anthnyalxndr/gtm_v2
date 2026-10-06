---
id: TASK-22.6
title: Normalise group ids used as object keys in the comparator
status: Done
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-25 09:29'
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

- [x] #1 Object keys that are group ids are aligned positionally or by the page they belong to rather than compared literally, and the comparator reports no false difference for pageSummaries or containerLoadInfoByGroupId between two sessions of the same flow
- [x] #2 A unit test covers it with two documents that differ only in their group ids

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

compareExports takes an alignKeyless option listing paths whose object keys are per-session identifiers; their entries are compared in order instead of by key. EXPORT_KEYLESS_MAPS covers pageSummaries, containerLoadInfoByGroupId and vendorTemplates, the last keyed by environment name, which differs between sessions for the same reason. The contact flow drops from 633 shape differences to 615, and what those maps report now is real: containerName carrying the scenario name instead of the site host, environmentName reading env-8 because the raw session does not save the resolved name, and an empty pageSummaries referrer. Those three are task-24.
<!-- SECTION:FINAL_SUMMARY:END -->
