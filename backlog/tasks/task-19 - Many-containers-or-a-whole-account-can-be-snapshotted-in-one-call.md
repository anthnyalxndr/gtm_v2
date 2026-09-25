---
id: TASK-19
title: 'Many containers, or a whole account, can be snapshotted in one call'
status: To Do
assignee: []
created_date: '2026-09-17 15:30'
updated_date: '2026-09-23 21:29'
labels:
  - gtm-apply
  - feature
dependencies: []
priority: medium
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
gtm-apply snapshot and Gtm.snapshot take one container. Snapshotting an account today means listing accounts and containers by hand through GtmClient, then running the CLI once per container (done for the Vaco account on 2026-09-17, which holds two containers). Add a way to snapshot several containers in one call, and an account-level convenience that lists the account's containers and snapshots each of them. Either a snapshotContainers function that takes multiple sources or a snapshotAccount function that takes an account id satisfies the need; the account form can be built on the multi-container form. Results should stay one snapshot per container so existing consumers of ApiSnapshotData and GtmSnapshot keep working.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A function accepts several container sources and returns one snapshot per container, keyed or ordered so the caller can tell which is which
- [ ] #2 A function accepts an account id (or account name) and snapshots every container in that account
- [ ] #3 Pulls for different containers run concurrently within the client's existing throttle
- [ ] #4 The CLI exposes the same: snapshot accepts repeated --container flags or an --account flag, and writes one file per container to an output directory instead of a single stdout stream
- [ ] #5 Gtm.snapshot memoization applies per container, so a container snapshotted as part of an account is not pulled again for a later single-container call with the same source
- [ ] #6 Unit tests cover the multi-container and account paths with a mocked client
- [ ] #7 README documents the multi-container and account forms with examples
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-23: TASK-35 (gtm-apply pull --account --out) consumes the account listing and multi-container pull this task adds and writes one directory per container instead of one file. The implementation plan docs/superpowers/plans/2026-09-23-gtm-as-code-foundations.md covers this task's library and CLI parts together with TASK-34 and TASK-35.
<!-- SECTION:NOTES:END -->
