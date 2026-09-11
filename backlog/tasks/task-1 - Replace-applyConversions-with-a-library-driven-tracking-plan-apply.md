---
id: TASK-1
title: >-
  The content package ships a committed library snapshot and generated types,
  and customers apply recipes from a typed plan
status: To Do
assignee: []
created_date: '2026-09-09 19:27'
updated_date: '2026-09-11 06:30'
labels:
  - sdk
  - recipes
  - library
dependencies:
  - TASK-5
  - TASK-7
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Superseded design: applyConversions is the leftover of the first plan, with hand-written GA4 and Google Ads generators each carrying its own trigger. The library is a template container (Web Template, GTM-TPLKC7QP) owned separately from the engine. This task is the content package and the customer-facing plan on top of GtmLibrary (TASK-5): a package such as gtm-web-recipes that holds the library source ids, the encoding choice, a pull script that calls GtmLibrary.init() and writes the snapshot as a const TypeScript module plus generated types, and a customer plan file (defineTrackingPlan) listing recipes, enabled destinations and constant values, applied through gtm-apply. Membership is declared on tags through the encoding, entities come by reference closure, customer values are GTM constants, and there are no folder or ${event} token conventions. Delete ga4Event, googleAdsConversion, applyConversions and the trigger recipe compiler in the same change so there is one entry point.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A content package exports its library snapshot as a const module and the GtmLibrary instance built from it; a pull script refreshes both from the template container and fails lint on unknown recipe names
- [ ] #2 A plan file typed by defineTrackingPlan lists recipes, enabled destination families and constant values; a recipe name or constant name not in the library is a compile error, and a missing constant value is a plan error
- [ ] #3 applyPlan(client, { plan, library, container, workspace }) compiles the selected recipes to a ContainerSpec, writes it to a file when asked, and applies it through applySpec; a constant still holding its placeholder value is a plan warning
- [ ] #4 Shared entities reached by several recipes appear once; conflicting definitions of one name fail with an error
- [ ] #5 applyConversions, ga4Event, googleAdsConversion and triggerRecipeToSpec are removed from the source and exports; README and example.ts use the plan
- [ ] #6 Tests cover selection across recipes, destination filtering, constant checks, and an end-to-end apply against the fake with form_submit, email_click and call_click recipes
<!-- AC:END -->
