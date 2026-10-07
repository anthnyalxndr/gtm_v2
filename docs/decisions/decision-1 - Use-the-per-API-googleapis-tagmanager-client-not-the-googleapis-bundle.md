---
id: decision-1
title: 'Use the per-API @googleapis/tagmanager client, not the googleapis bundle'
date: '2026-09-10 17:06'
status: accepted
---

## Context

The repo originally depended on `googleapis`, Google's monolithic bundle of every API. Installed it is 110 MB and it slows type checking. Google publishes the same generated code per API as `@googleapis/tagmanager`, exporting the identical `tagmanager_v2` namespace and `Schema$*` types. Two copies of `google-auth-library` were present because our pinned major differed from the one `googleapis-common` requires.

## Decision

Depend on `@googleapis/tagmanager` as a direct dependency (not a peer dependency, since consumers never call the Tag Manager API themselves) and re-export its `tagmanager_v2` type namespace. Pin `google-auth-library` to the major that `googleapis-common` requires so one copy exists. Keep the generated client as the source of entity types; never hand-write a REST client.

## Consequences

Install size and typecheck time drop. The spec engine gets its types for free. Per-API packages bump majors on regeneration, so a caret on the major plus the test suite is the guard before each release tag. Consumers on pnpm 10 must approve the package's `prepare` build.
