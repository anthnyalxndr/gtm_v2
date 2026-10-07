---
id: TASK-33
title: resolveContainer looks a container up by tag id in one call
status: Done
assignee:
  - '@claude'
created_date: '2026-09-19 19:00'
updated_date: '2026-09-19 19:06'
labels:
  - gtm-client
dependencies: []
priority: medium
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
resolveContainer(client, 'GTM-XXXXXXX') lists every account and then every container in each account until it finds the public id. For a user with many accounts that is dozens of throttled requests per call, and a consumer (gtm-preview, which resolves a container before every browser launch) has to cache the result to keep it acceptable. The Tag Manager API v2 accounts.containers.lookup endpoint accepts tagId ("Tag ID for a GTM Container, e.g. GTM-123456789") as an alternative to destinationId and returns the Container directly, and the pinned @googleapis/tagmanager 16 types expose it (Params$Resource$Accounts$Containers$Lookup.tagId). Use it as the fast path and keep the account scan only as a fallback, so existing callers get one request instead of many with no signature change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 resolveContainer calls accounts.containers.lookup with tagId first and returns the same ContainerRef shape (accountId, containerId, path, name, publicId, usageContext) built from the response
- [x] #2 When lookup fails with 404 or 403, or returns a container whose publicId does not match, resolveContainer falls back to the existing account and container scan and the fallback is covered by a test
- [x] #3 createFakeService supports accounts.containers.lookup by tagId and destinationId, records the call in state.calls, and returns 404 for unknown ids so consumers can test both paths
- [x] #4 A test asserts that resolving a container the user can see makes exactly one API call on the fast path
- [x] #5 The README's typed helpers section documents the lookup-first behaviour and the fallback
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Cut feat/task-33-container-lookup from origin/main.
2. TDD the fake: accounts.containers.lookup by tagId or destinationId, recorded as containers.lookup in state.calls, 404 for unknown ids.
3. TDD resolveContainer: lookup({ tagId }) first, same ContainerRef shape; on 404, 403 or a publicId mismatch fall back to the account and container scan; other errors propagate. Tests for one call on the fast path, each fallback trigger, and a propagated 401.
4. README typed-helpers bullet documents lookup first and the fallback.
5. pnpm verify at the root, commit, push, PR, merge, delete the branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added accounts.containers.lookup to createFakeService (tagId or destinationId, 400 when not exactly one, 404 for unknown ids, recorded as containers.lookup). resolveContainer now calls lookup({ tagId }) first via a new httpStatus helper in throttle.ts (shared with isRetryable) and falls back to the account and container scan on 404, 403 or a publicId mismatch; other errors propagate. Tests: one call on the fast path, each fallback trigger, propagated 401, fake lookup behaviour. README typed-helpers bullet and fake section updated. pnpm verify: 168 tests pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
resolveContainer now asks accounts.containers.lookup for the tagId first, so a container the user can see costs one request instead of an accounts.list plus a containers.list per account. It falls back to the old scan on 404, 403 or a mismatched publicId and rethrows anything else. The fake supports lookup by tagId and destinationId with 404 for unknown ids. Verified with pnpm verify (168 tests) on branch feat/task-33-container-lookup.
<!-- SECTION:FINAL_SUMMARY:END -->
