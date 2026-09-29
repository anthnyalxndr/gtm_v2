---
id: TASK-43
title: >-
  A container spec's type decides which entities and trigger names it can hold,
  at compile time
status: Done
assignee:
  - '@claude'
created_date: '2026-09-28 20:52'
updated_date: '2026-09-29 00:13'
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
- [x] #1 A web spec that declares a client or transformation fails to type-check
- [x] #2 A tag in a server spec that names a web-only built-in trigger fails to type-check, while spec-defined trigger names still type-check
- [x] #3 Specs without a containerType keep working as web specs, and the existing recipes and tests compile unchanged or with mechanical edits
- [x] #4 Type tests (ts-expect-error cases) cover each rule above; pnpm verify passes
- [x] #5 defineContainer checks a spec against a union discriminated by containerType (WebContainerSpec, ServerContainerSpec and the AMP and mobile members), exported from gtm-model; ContainerSpec stays the engine's shape, so normalize and pull output keeps flowing into apply unchanged
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. gtm-model spec/types.ts: typed members WebContainerSpec, ServerContainerSpec, AmpContainerSpec, MobileContainerSpec (android, ios), selected by containerType. Clients and transformations exist only on ServerContainerSpec (never elsewhere). TypedContainerSpec<T> picks the member.
2. Built-in trigger names per type come from WEB_CATALOG and SERVER_CATALOG literal keys; a foreign built-in is a name another type has and this one does not (a server spec may not name Consent Initialization - All Pages or Initialization - All Pages; both types have All Pages).
3. defineContainer<T, N> infers T from containerType (default web) and N from every tag's firingTriggerName and blockingTriggerName; an intersection turns any foreign built-in in N into a compile error that names it. It returns TypedContainerSpec<T>, which is assignable to ContainerSpec.
4. ContainerSpec stays the engine's loose shape, so normalize and pull output keeps flowing into apply, and gtm-apply, where draft PRs #19-#25 still touch many files, gets no type churn.
5. Type tests with ts-expect-error in gtm-model; every existing defineContainer call compiles unchanged.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #1 (ContainerSpec as the union) was replaced by AC #5 per the plan: the union types what authors write through defineContainer, and ContainerSpec stays the engine's shape, so normalize and pull output keeps flowing into apply and gtm-apply (with draft PRs #19-#25 open on it) needs no type changes. defineContainer infers the container type from containerType (web when absent) and every trigger name tags use; a name that only another container type has as a built-in becomes a compile error naming it. Every existing defineContainer call compiled unchanged, the web and server templates included. pnpm verify: 19 + 23 + 138 + 23.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
defineContainer now checks a spec against its container type: WebContainerSpec, ServerContainerSpec, AmpContainerSpec and MobileContainerSpec, chosen by containerType (web when absent). Clients and transformations fail to type-check outside a server spec, and a tag naming a built-in trigger only another container type has (Consent Initialization - All Pages in a server spec) fails too, while spec-defined names pass. The result is assignable to ContainerSpec, which stays the engine's shape. Covered by ts-expect-error type tests.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
