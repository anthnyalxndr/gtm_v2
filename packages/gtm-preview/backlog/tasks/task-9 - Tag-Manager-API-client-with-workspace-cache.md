---
id: TASK-9
title: Tag Manager API client with workspace cache
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
labels:
  - predict
dependencies: []
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Prediction needs the container's tags, triggers, and variables. Fetch them from Tag Manager API v2 with the readonly scope and cache by workspace fingerprint so a run is reproducible and offline-repeatable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Given credentials and a workspace path, the client returns typed tags, triggers, variables, and environments
- [ ] #2 Responses are validated with zod and a shape change fails loudly
- [ ] #3 A second call with the same workspace fingerprint is served from cache with no network request
- [ ] #4 Tests run against recorded fixtures, not the live API

<!-- AC:END -->
