---
id: TASK-41
title: >-
  A gtm-model package holds the shared Tag Manager model that every package
  imports
status: Done
assignee:
  - '@claude'
created_date: '2026-09-28 20:52'
updated_date: '2026-09-28 20:58'
labels:
  - gtm-model
  - architecture
dependencies: []
priority: high
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Tag Manager model lives inside gtm-apply today: ContainerType (snapshot/types.ts), the spec types (spec/types.ts, ContainerSpec, TagSpec and the rest), the generated Discovery types (spec/generated) and the catalog of built-in variables and triggers (spec/catalog.ts). gtm-client, the recipes package and the planned gtm-as-code package all need that model, but can only get it by depending on gtm-apply. A packages/gtm-model package (@anthnyalxndr/gtm-model) with types and plain data only, no API calls, becomes the one place the model lives. gtm-apply keeps re-exporting the moved names so current imports keep working. This comes before TASK-40 so the per-container catalog is built once, in its final home.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 packages/gtm-model exists in the pnpm workspace with build, typecheck and test scripts and no dependency on gtm-client or gtm-apply
- [x] #2 ContainerType, the spec types, the generated Discovery types and the built-in catalog live in gtm-model and are exported from it
- [x] #3 gtm-apply imports them from gtm-model and re-exports every moved name, so existing imports from @anthnyalxndr/gtm-apply still compile
- [x] #4 The recipes package and gtm-client import model types from gtm-model where they use them
- [x] #5 pnpm verify passes and the root README lists the new package and what belongs in it
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create packages/gtm-model (@anthnyalxndr/gtm-model 0.1.0, public, ESM) with build, typecheck, test and gen:discovery scripts, set up like gtm-client.
2. git mv the model from gtm-apply, keeping relative paths so internal imports hold: src/spec/types.ts, src/spec/catalog.ts, src/spec/kinds.ts, src/spec/generated/, scripts/generate-discovery.ts and scripts/discovery/. ContainerType moves from snapshot/types.ts to gtm-model src/container-type.ts. src/index.ts exports all of it.
3. Move the two tests that cover only the model (catalog.test.ts, generate-discovery.test.ts) to gtm-model and add an index test for the public surface.
4. In gtm-apply, leave re-export files at the old paths (spec/types.ts, catalog.ts, kinds.ts, generated/tagmanager-v2.ts), so no internal import changes, and change snapshot/types.ts only on the ContainerType line. This keeps the draft chain #19-#25 easy to rebase. Depend on gtm-model with workspace:^ and drop gen:discovery there.
5. gtm-web-recipes imports spec types and defineContainer from gtm-model. gtm-client uses no model types, so it gets no change.
6. Root README: package table row and publish order (gtm-model before gtm-apply). pnpm verify.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Acceptance criteria reviewed against the plan: unchanged. AC #4: gtm-client uses no model types, so only gtm-web-recipes changed its imports (spec types and defineContainer). ApiSnapshotData stays in gtm-apply because it is built on the @googleapis/tagmanager response types. gtm-apply keeps re-export files at the old paths (spec/types.ts, catalog.ts, kinds.ts, generated/tagmanager-v2.ts) and changed snapshot/types.ts only on the ContainerType line, so the draft chain #19-#25 rebases with little conflict. Release note: gtm-apply now depends on gtm-model, so gtm-model 0.1.0 must be published before the next gtm-apply release. Found while checking: a web push dry run against GTM-TPLKC7QP reports the 8 conversion tags as modified on main too; that is the parameter-order comparison TASK-34 (PR #19) fixes, not this change. pnpm verify: 19 + 12 + 125 + 6.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added packages/gtm-model (@anthnyalxndr/gtm-model) holding ContainerType, the container spec types and defineContainer, the generated Discovery types with their generator, the built-in catalog and the spec sections per container type. gtm-apply depends on it and re-exports every moved name from the old paths; gtm-web-recipes imports spec types from it. Verified with pnpm verify and a dry run showing no new drift.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
