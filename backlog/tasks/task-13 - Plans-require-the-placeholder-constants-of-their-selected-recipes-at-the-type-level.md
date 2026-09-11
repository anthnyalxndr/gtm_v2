---
id: TASK-13
title: >-
  Plans require the placeholder constants of their selected recipes at the type
  level
status: Review
assignee: []
created_date: '2026-09-11 21:45'
updated_date: '2026-09-11 21:49'
labels:
  - sdk
  - library
dependencies:
  - TASK-12
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
compilePlan reports a missing placeholder value at runtime only. The committed library is a const literal, and TASK-12 put every placeholder entry into the snapshot's metadata index keyed by variable:<name>, so the set of constants a plan must fill is computable from the types: constants with a placeholder entry that are entities of the selected recipes. defineTrackingPlan should make those keys required in constants so tsc fails, with editor completion listing the missing names, before anything runs. When a plan filters destinations, tags and their constants may be dropped at runtime, so required keys apply only to plans that select every destination; a plan with destinations keeps optional constants and relies on compilePlan. Non-literal libraries (pulled at runtime) keep the current optional constants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GtmSnapshot carries the literal snapshot type as a third type parameter, set by fromData and Gtm.snapshotFrom, and exported helper types give PlaceholderConstantNameOf<S> and RequiredConstantNameOf<S, recipes>
- [x] #2 defineTrackingPlan rejects, at compile time, a plan without destinations that omits a required constant of its selected recipes, and accepts one that supplies them; a plan with destinations, or a plan against a non-literal library, keeps optional constants (covered by @ts-expect-error tests in gtm-apply and gtm-web-recipes)
- [x] #3 The gtm-web-recipes example plan and README show the required constants; pnpm verify passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch feat/task-13-typed-required-constants, stacked on task-12. pnpm verify green (154 tests). Draft PR opened; owner merges.
<!-- SECTION:NOTES:END -->
