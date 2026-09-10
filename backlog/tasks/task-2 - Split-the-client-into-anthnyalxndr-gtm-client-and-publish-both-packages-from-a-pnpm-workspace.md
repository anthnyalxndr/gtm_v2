---
id: TASK-2
title: >-
  Split the client into @anthnyalxndr/gtm-client and publish both packages from
  a pnpm workspace
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-10 17:16'
updated_date: '2026-09-10 17:16'
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
- [ ] #1 pnpm-workspace.yaml lists packages/*; root package.json is private and runs build, typecheck, test, and verify across packages in dependency order
- [ ] #2 packages/gtm-client exports GtmClient, TAG_MANAGER_SCOPES, resolveConfigPaths, withRetry/createLimiter/isRetryable, listAccounts, resolveContainer, createContainer, and the tagmanager_v2 types; listAccounts is a function, not a class method; the client has no imports from gtm-apply
- [ ] #3 packages/gtm-client exposes a ./testing subpath export with createFakeService and latestSnapshot, and gtm-apply's tests import it from there
- [ ] #4 packages/gtm-apply depends on @anthnyalxndr/gtm-client (workspace:^), re-exports the client API, and contains the spec engine, workspace/entity/built-in helpers, recipes, and the gtm-apply CLI; all existing tests pass after the move
- [ ] #5 Both packages publish only dist, declare publishConfig.access=public, and pnpm -r publish --dry-run succeeds; tarballs from pnpm pack install into a scratch project and both @anthnyalxndr/gtm-client and @anthnyalxndr/gtm-apply import and run
- [ ] #6 READMEs describe registry installation for each package; the git-tag install and onlyBuiltDependencies instructions are removed; decision-8 records the reversal of decision-6's keep-internal choice
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
