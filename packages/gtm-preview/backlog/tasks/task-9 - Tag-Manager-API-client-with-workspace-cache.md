---
id: TASK-9
title: >-
  Resolve environment authorization codes through @anthnyalxndr/gtm-client with
  a local cache
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 18:55'
labels:
  - predict
dependencies:
  - TASK-13
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Loading a container's debug build needs the environment authorization code. Use the published @anthnyalxndr/gtm-client (OAuth token shared in ~/.config/gtm-apply, throttling, retry, resolveContainer for GTM-XXXXXXX to account and container ids, and a fake service with environments for tests) rather than a new client. Resolve the code before the browser launches, cache it per container and environment under the user config directory with owner-only permissions, and treat a 403 on the container request as the cache invalidation signal: refetch once and retry. Scenarios name an environment (Live, Latest, or a custom name); authCodeEnv stays as the escape hatch when the API is not available. Request only tagmanager.readonly, and edit.containerversions only for an explicit --version-from-workspace flag that creates a version from a workspace so Latest points at unpublished work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A scenario may give container.environment as a name (Live, Latest, or a custom environment name) and omit authCodeEnv; the CLI resolves the code through gtm-client before launching the browser
- [ ] #2 The client is constructed with the tagmanager.readonly scope only; the docs state that the token file is shared with gtm-apply
- [ ] #3 Codes are cached in the user config directory with 0600 permissions, keyed by container public id and environment id, with the environment fingerprint and fetch time; the repo never contains them and they never appear in logs or reports
- [ ] #4 A 403 on the container request with a cached code triggers one refetch and retry, then a clear failure naming the environment; --refresh forces a refetch
- [ ] #5 --version-from-workspace <name> creates a version from that workspace (no publish) and uses Latest; it is never done implicitly
- [ ] #6 Unit tests use createFakeService from @anthnyalxndr/gtm-client/testing; no test needs credentials

<!-- AC:END -->
