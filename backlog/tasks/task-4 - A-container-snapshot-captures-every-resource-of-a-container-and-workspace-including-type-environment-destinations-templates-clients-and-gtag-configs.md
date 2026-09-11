---
id: TASK-4
title: >-
  A container snapshot captures every resource of a container and workspace,
  including type, environment, destinations, templates, clients, and gtag
  configs
status: Done
assignee:
  - '@claude'
created_date: '2026-09-11 06:29'
updated_date: '2026-09-11 06:34'
labels:
  - sdk
  - library
  - snapshot
dependencies: []
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Today export reads only folders, variables, triggers, tags and built-ins. A library, an audit, and a server-container apply all need the rest of what the Tag Manager API exposes for a container: the container itself (usageContext gives the container type), the workspace, the container's environments and which one points at the pulled version, version headers, destinations (linked Google tags), gtag configs, custom templates, clients, transformations and zones. Add a typed ContainerSnapshot and a pullSnapshot(client, source) function that reads each of these through its REST resource (accounts.containers.get, accounts.containers.environments, accounts.containers.destinations, accounts.containers.version_headers, accounts.containers.workspaces.{clients,transformations,templates,zones,gtag_config,...}). Extend the Discovery generator to cover those schemas and the test fake to serve them, so the snapshot is typed from Google's schema like the spec is. The snapshot is the data GtmLibrary wraps (see the task that adds the class).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pullSnapshot returns a ContainerSnapshot with container (including usageContext-derived containerType), workspace, environments plus the environment whose containerVersionId matches the pulled version (null for a workspace source), versionHeader, destinations, gtagConfig, templates, clients, transformations, zones, folders, variables, triggers, tags and builtInVariables
- [x] #2 The Discovery generator emits interfaces and enums for Container, Workspace, Environment, Destination, ContainerVersionHeader, Client, Transformation, Zone, CustomTemplate and GtagConfig, and the sync test still passes
- [x] #3 The gtm-client test fake serves list/get for environments, destinations, version headers, clients, transformations, templates, zones and gtag configs, and containers carry usageContext
- [x] #4 A snapshot pulled from a workspace source and one pulled from the latest version agree on every workspace-scoped collection when the workspace has no changes
- [x] #5 Unit tests cover each resource, the environment resolution rule, and a server container (usageContext server) that has clients and transformations
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend scripts/generate-discovery.ts ROOTS with Container, Workspace, Environment, Destination, ContainerVersionHeader, Client, Transformation, Zone, CustomTemplate, GtagConfig; regenerate; keep the sync test green.
2. Add src/snapshot/types.ts (ContainerSnapshot, SnapshotSource, ContainerType from the UsageContext union) and src/snapshot/pull.ts: resolve the container, containers.get for usageContext, environments.list, destinations.list, version_headers.latest; for a workspace source list every workspace collection, for a version source read versions.get; resolve environment by containerVersionId; snapshotToSpec() normalizes the entity collections.
3. Extend the gtm-client fake: usageContext on containers, containers.get, environments and destinations stores, workspace collections for clients, transformations, templates, zones, gtag_config, version snapshots carrying them, version_headers.list.
4. Tests: web and server containers, workspace vs latest agreement, environment resolution; export the API from index.ts; README section; commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Snapshot keeps raw API entities (ids included); snapshotToSpec normalizes the apply-able part. Environment resolution matches containerVersionId, so Live resolves for --live and Latest for the default; a workspace source has no environment. versionHeader for a workspace source is the header of the version the workspace branched from (version_headers.latest). Discovery revision bumped to 20260909 by --fetch. The fake's versions.live now returns containerVersionId, which the export test relied on implicitly. pnpm verify: 19 client + 86 apply tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added ContainerSnapshot, pullSnapshot, snapshotToSpec, containerTypeOf and the snapshot CLI command; extended the Discovery generator to ten more schemas and the gtm-client fake to every container-level resource and workspace collection. Verified with pnpm verify (105 tests) including a server container carrying clients and transformations.
<!-- SECTION:FINAL_SUMMARY:END -->
