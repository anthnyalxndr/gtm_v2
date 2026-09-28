---
id: TASK-41
title: >-
  A gtm-model package holds the shared Tag Manager model that every package
  imports
status: To Do
assignee: []
created_date: '2026-09-28 20:52'
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
- [ ] #1 packages/gtm-model exists in the pnpm workspace with build, typecheck and test scripts and no dependency on gtm-client or gtm-apply
- [ ] #2 ContainerType, the spec types, the generated Discovery types and the built-in catalog live in gtm-model and are exported from it
- [ ] #3 gtm-apply imports them from gtm-model and re-exports every moved name, so existing imports from @anthnyalxndr/gtm-apply still compile
- [ ] #4 The recipes package and gtm-client import model types from gtm-model where they use them
- [ ] #5 pnpm verify passes and the root README lists the new package and what belongs in it
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
