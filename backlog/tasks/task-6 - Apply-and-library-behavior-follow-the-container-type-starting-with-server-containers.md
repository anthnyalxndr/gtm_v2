---
id: TASK-6
title: >-
  Apply and library behavior follow the container type, starting with server
  containers
status: Done
assignee:
  - '@claude'
created_date: '2026-09-11 06:29'
updated_date: '2026-09-11 06:47'
labels:
  - sdk
  - server
dependencies:
  - TASK-4
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web, server, AMP and mobile containers expose different entity kinds: a server container has clients and transformations, no built-in web triggers, and different built-in variables; web has zones and gtag configs. Today the engine assumes web. Make the set of entity kinds a function of the container's usageContext (one class with a kind registry rather than a subclass per type, so shared behavior is written once), teach the normalizer, planner and executor about clients and transformations (name identity, folder membership, reference closure through their parameters), and refuse to apply a spec to a container of a different type than the one it was pulled from. Start with server containers because they are the ones missing entity kinds today.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A kind registry maps each usageContext to the entity kinds a snapshot pulls and a spec may contain; pullSnapshot and validateSpec use it
- [x] #2 Specs may declare client and transformation entities; normalizeExport converts their parentFolderId to parentFolderName, the planner orders and diffs them by name, and executePlan creates and updates them through workspaces.clients and workspaces.transformations
- [x] #3 Applying a spec that carries a containerType to a container with a different usageContext is a plan error before any write
- [x] #4 GtmLibrary.select() on a server-container snapshot includes clients and transformations reached from recipe tags
- [x] #5 Tests cover a server container end to end against the fake: pull, select, apply, and a second unchanged apply
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Kind registry: src/spec/kinds.ts (SECTIONS_BY_CONTAINER_TYPE). One class of behavior keyed by container type rather than subclasses. Clients and transformations are applied after variables and before triggers; server triggers reference clients through the {{Client Name}} built-in, which the catalog now knows along with Event Name, Request Path, Request Method, Query String, Page Location and Visitor Region (display names to be confirmed by the live smoke test). loadExisting lists clients and transformations only for server containers so web containers never call those endpoints. AC 4 (GtmLibrary.select on a server snapshot) is delivered with TASK-5, since select does not exist yet. pnpm verify: 19 + 91 tests.

AC 4 delivered with TASK-5: GtmSnapshot.select() on a server library includes clients reached through {{Client Name}} conditions and transformations that declare the recipe (test/library.test.ts).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Specs carry containerType and may declare client and transformation sections; validation, planning and execution honor the container type and refuse mismatches before any write. Server container round trip (apply, pull, snapshotToSpec, re-plan unchanged) is covered by tests against the fake.
<!-- SECTION:FINAL_SUMMARY:END -->
