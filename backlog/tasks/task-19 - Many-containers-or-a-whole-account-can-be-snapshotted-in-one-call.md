---
id: TASK-19
title: 'Many containers, or a whole account, can be snapshotted in one call'
status: Review
assignee:
  - '@claude'
created_date: '2026-09-17 15:30'
updated_date: '2026-09-25 10:08'
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
- [x] #1 A function accepts several container sources and returns one snapshot per container, keyed or ordered so the caller can tell which is which
- [x] #2 A function accepts an account id (or account name) and snapshots every container in that account
- [x] #3 Pulls for different containers run concurrently within the client's existing throttle
- [x] #4 The CLI exposes the same: snapshot accepts repeated --container flags or an --account flag, and writes one file per container to an output directory instead of a single stdout stream
- [x] #5 Gtm.snapshot memoization applies per container, so a container snapshotted as part of an account is not pulled again for a later single-container call with the same source
- [x] #6 Unit tests cover the multi-container and account paths with a mocked client
- [x] #7 README documents the multi-container and account forms with examples
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Foundations plan tasks 5 to 7 (docs/superpowers/plans/2026-09-23-gtm-as-code-foundations.md): 1. listContainers(client, accountId) in gtm-client with tests. 2. pullSnapshots and snapshotAccount in gtm-apply snapshot/account.ts, Gtm.snapshotAccount memoized per container, tests. 3. CLI: repeated --container, --account and --out; snapshot writes one canonical <publicId>.json per container into --out. 4. README for both packages. Branch cut from feat/task-34-canonical-specs (needs stringifySnapshot); PR base main; merge after PR #19.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-23: TASK-35 (gtm-apply pull --account --out) consumes the account listing and multi-container pull this task adds and writes one directory per container instead of one file. The implementation plan docs/superpowers/plans/2026-09-23-gtm-as-code-foundations.md covers this task's library and CLI parts together with TASK-34 and TASK-35.

2026-09-25: listContainers in gtm-client (with a toRef helper matching PR #17's, so that merge is a trivial conflict); pullSnapshots and snapshotAccount in gtm-apply snapshot/account.ts; Gtm.snapshotAccount memoized per container; CLI snapshot takes repeated --container or --account with --out and writes one canonical <publicId>.json per container. Branch cut from feat/task-34-canonical-specs because the file writer uses stringifySnapshot; merge after PR #19.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Account-level snapshots: listContainers(client, accountId) in gtm-client; pullSnapshots(client, sources) and snapshotAccount(client, accountId) in gtm-apply, plus Gtm.snapshotAccount(accountId) memoized per container; gtm-apply snapshot --account <id> --out <dir> or repeated --container with --out writes one canonical file per container, refusing without --out. READMEs updated. pnpm verify green: 21 + 154 + 6 tests.
<!-- SECTION:FINAL_SUMMARY:END -->
