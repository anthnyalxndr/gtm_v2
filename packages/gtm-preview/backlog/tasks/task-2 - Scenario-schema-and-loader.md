---
id: TASK-2
title: Scenario schema and loader
status: Done
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 17:01'
labels:
  - core
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Scenarios are data files, not test files. The loader validates a JSON scenario with zod and resolves secret references to environment variable values so the token never lives in the file.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A valid scenario fixture parses into a typed Scenario object with startUrl, container id, environment, optional consent state, and an ordered steps array
- [ ] #2 A scenario missing startUrl is rejected with an error that names the missing path
- [ ] #3 The environment block references gtm_auth by environment variable name and the loader resolves it, failing with a clear message when the variable is unset
- [ ] #4 Step kinds navigate, click, fill, and waitForEvent are accepted; an unknown step kind is rejected

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Delivered by task-13 (feat/debug-feed-capture) on 2026-09-19; the acceptance criteria that still applied are met there.
<!-- SECTION:NOTES:END -->
