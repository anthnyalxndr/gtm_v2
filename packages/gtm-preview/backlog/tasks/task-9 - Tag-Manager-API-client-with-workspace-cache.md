---
id: TASK-9
title: Tag Manager API client that resolves environment authorization codes
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 16:53'
labels:
  - predict
dependencies: []
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Loading a container's debug build needs the environment authorization code. Fetch environments for a container from Tag Manager API v2 with the readonly scope so a scenario can name a container and an environment instead of the operator pasting codes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Given credentials and a container path, the client returns environments with id, type, name, and authorizationCode
- [ ] #2 Responses are validated with zod and a shape change fails loudly
- [ ] #3 Codes are never written to logs or reports
- [ ] #4 Tests run against recorded fixtures, not the live API

<!-- AC:END -->
