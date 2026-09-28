---
id: TASK-43
title: >-
  A container spec's type decides which entities and trigger names it can hold,
  at compile time
status: To Do
assignee: []
created_date: '2026-09-28 20:52'
labels:
  - gtm-model
  - types
dependencies:
  - TASK-42
priority: medium
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ContainerSpec is one interface whose containerType is optional, so a web spec can hold clients and a server tag can name a web-only built-in trigger such as Consent Initialization - All Pages; the mistake shows up at runtime, if at all. Make ContainerSpec a union discriminated by containerType (WebContainerSpec, ServerContainerSpec, and the other types as needed), with clients and transformations only on server specs, and firingTriggerName typed so built-in trigger names come from that type's catalog. defineContainer infers the right member from containerType.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ContainerSpec is a union discriminated by containerType, exported from gtm-model with a named member per container type
- [ ] #2 A web spec that declares a client or transformation fails to type-check
- [ ] #3 A tag in a server spec that names a web-only built-in trigger fails to type-check, while spec-defined trigger names still type-check
- [ ] #4 Specs without a containerType keep working as web specs, and the existing recipes and tests compile unchanged or with mechanical edits
- [ ] #5 Type tests (ts-expect-error cases) cover each rule above; pnpm verify passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
