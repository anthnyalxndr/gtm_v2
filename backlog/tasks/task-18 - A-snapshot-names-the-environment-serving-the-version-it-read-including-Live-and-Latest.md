---
id: TASK-18
title: >-
  A snapshot names the environment serving the version it read, including Live
  and Latest
status: To Do
assignee: []
created_date: '2026-09-17 15:30'
labels:
  - gtm-apply
  - bug
dependencies: []
priority: medium
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
pullSnapshot sets environment by matching environments[].containerVersionId to the version read (packages/gtm-apply/src/snapshot/pull.ts, line 138). Verified against the live API on 2026-09-17 with the Vaco containers GTM-KK24CHH and GTM-PLNNMF3: neither environments.list nor environments.get returns containerVersionId for the built-in Live and Latest environments, so environment is null even with --live and even when latest equals live. The environments list in the snapshot file also carries no version ids, so a reader cannot tell which version is published. The serving environment should be resolved by environment type instead: Live when the version read is the live version, Latest when it is the latest version header, and by containerVersionId only for custom environments that carry one. A reader of a snapshot should be able to answer 'is this the published version' from the file alone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A snapshot pulled with --live has environment set to the container's Live environment
- [ ] #2 A snapshot pulled without a version flag has environment set to the Latest environment, and to Live as well when the latest version is the published one (the snapshot exposes both facts)
- [ ] #3 A snapshot pulled with --version <id> resolves environment for a custom environment whose containerVersionId matches, and to Live or Latest when the id matches those
- [ ] #4 A workspace source still yields environment null
- [ ] #5 Unit tests cover the live, latest, custom-environment, and workspace cases with fixtures that omit containerVersionId on built-in environments, as the API does
- [ ] #6 The README snapshot section and the ApiSnapshotData doc comment describe how environment is resolved
<!-- AC:END -->
