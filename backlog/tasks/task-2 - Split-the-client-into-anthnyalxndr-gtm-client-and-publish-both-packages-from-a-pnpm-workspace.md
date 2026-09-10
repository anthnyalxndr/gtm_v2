---
id: TASK-2
title: >-
  Split the client into @anthnyalxndr/gtm-client and publish both packages from
  a pnpm workspace
status: Review
assignee:
  - '@claude'
created_date: '2026-09-10 17:16'
updated_date: '2026-09-10 17:20'
labels:
  - packaging
  - client
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The GtmClient (OAuth, shared credential directory, throttle and retry, raw tagmanager_v2 service) lives in src/gtm_v2.ts inside gtm-apply and can only be imported through the apply package. Other projects need it on its own, and the idiomatic way to make a Node module importable is a separately published package installed by version range. Convert the repo into a pnpm workspace with packages/gtm-client (auth, config, throttle, listAccounts, resolveContainer, createContainer, and a testing subpath exporting the in-memory fake service) and packages/gtm-apply (workspace/entity/built-in helpers, spec engine, recipes, CLI) depending on gtm-client with workspace:^. Both packages configured for public npm under the @anthnyalxndr scope with publishConfig.access=public; actual publishing is left to the owner. This supersedes the keep-internal part of decision-6 (see decision-8).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm-workspace.yaml lists packages/*; root package.json is private and runs build, typecheck, test, and verify across packages in dependency order
- [x] #2 packages/gtm-client exports GtmClient, TAG_MANAGER_SCOPES, resolveConfigPaths, withRetry/createLimiter/isRetryable, listAccounts, resolveContainer, createContainer, and the tagmanager_v2 types; listAccounts is a function, not a class method; the client has no imports from gtm-apply
- [x] #3 packages/gtm-client exposes a ./testing subpath export with createFakeService and latestSnapshot, and gtm-apply's tests import it from there
- [x] #4 packages/gtm-apply depends on @anthnyalxndr/gtm-client (workspace:^), re-exports the client API, and contains the spec engine, workspace/entity/built-in helpers, recipes, and the gtm-apply CLI; all existing tests pass after the move
- [ ] #5 Both packages publish only dist, declare publishConfig.access=public, and pnpm -r publish --dry-run succeeds; tarballs from pnpm pack install into a scratch project and both @anthnyalxndr/gtm-client and @anthnyalxndr/gtm-apply import and run
- [x] #6 READMEs describe registry installation for each package; the git-tag install and onlyBuiltDependencies instructions are removed; decision-8 records the reversal of decision-6's keep-internal choice
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Scaffold the workspace: pnpm-workspace.yaml, private root package.json with shared devDeps and -r scripts, tsconfig.base.json, root husky hook running pnpm verify.
2. git mv client files into packages/gtm-client/src (gtm_v2.ts -> client.ts, config.ts, throttle.ts, resources/containers.ts -> containers.ts, test/helpers/fakeService.ts -> testing.ts); add accounts.ts with listAccounts(client); remove the class method; write index.ts, package.json with . and ./testing exports, tsconfig, tests.
3. git mv the rest into packages/gtm-apply/src and test; rewrite relative imports of the client to @anthnyalxndr/gtm-client; tests import the fake from @anthnyalxndr/gtm-client/testing; package.json depends on gtm-client workspace:^; re-export client API from index.
4. Build in dependency order, typecheck, run all tests; fix fallout.
5. pnpm -r publish --dry-run; pnpm pack both; install tarballs into a scratch consumer and import both packages.
6. READMEs (root overview, per-package), example.ts relocation, decision-8, commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Workspace: pnpm-workspace.yaml (packages/*), private root package.json with -r scripts; tsconfig.base.json shared; per-package tsconfig, tsconfig.test.json, vitest config. git mv preserved history. gtm-client: client.ts (from gtm_v2.ts, listAccounts removed), config.ts, throttle.ts, accounts.ts (listAccounts fn), containers.ts, testing.ts (fake service) with ./testing subpath export. gtm-apply: everything else, imports the client from @anthnyalxndr/gtm-client, re-exports it from its index. Tests: gtm-client 19, gtm-apply 59, all passing. pnpm -r publish --dry-run succeeds for both; packed gtm-apply manifest has @anthnyalxndr/gtm-client ^1.0.0 (workspace:^ rewritten). Tarball install into a scratch project outside the repo was declined by the user in-session (AC 5 second half left unchecked); tarballs are in the session scratchpad. Root README plus per-package READMEs written; git-tag install and onlyBuiltDependencies notes removed; decision-8 supersedes the keep-internal part of decision-6; plan doc carries a note that File Structure predates the split. Commit 382f9e3.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the repo into a pnpm workspace with @anthnyalxndr/gtm-client (auth, config dir, throttle, listAccounts, resolveContainer, createContainer, testing fake) and @anthnyalxndr/gtm-apply (workspace/entity/built-in helpers, spec engine, recipes, CLI) depending on gtm-client with workspace:^. Both publish dist only with public access. Verified with pnpm verify (build in dependency order, typecheck, 78 tests) and pnpm -r publish --dry-run. Remaining before publish: install the packed tarballs into a scratch project and run the client, testing subpath, apply, and CLI (AC 5, second half), then bump versions and pnpm -r publish from an npm-authenticated shell.
<!-- SECTION:FINAL_SUMMARY:END -->
