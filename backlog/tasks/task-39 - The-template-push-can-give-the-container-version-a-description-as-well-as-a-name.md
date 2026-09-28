---
id: TASK-39
title: >-
  The template push can give the container version a description as well as a
  name
status: Done
assignee:
  - '@claude'
created_date: '2026-09-27 23:22'
updated_date: '2026-09-28 23:47'
labels:
  - recipes
  - apply
dependencies: []
priority: low
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
pnpm push in packages/gtm-web-recipes names the version it creates (GTM_LIBRARY_WORKSPACE, default recipes-<date>) but cannot describe it, so every pushed version has a blank description in Tag Manager. Version 4 of GTM-TPLKC7QP (2026-09-27) is an example. The Tag Manager API takes a description only when the version is created, or later through a full-replace versions.update, which is risky for a whole container. The gap is in gtm-apply: spec/execute.ts sends requestBody { name } to workspaces.create_version, and GtmSnapshot.push, execute options and the tracking-plan options carry versionName only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm push accepts a version description (for example a GTM_LIBRARY_VERSION_DESCRIPTION variable or a --description flag) and the version it creates carries that description in Tag Manager
- [x] #2 GtmSnapshot.push and the execute options accept an optional versionDescription that is sent to workspaces.create_version alongside the name
- [x] #3 Leaving the description out creates a version exactly as today, with no description field sent
- [x] #4 A unit test asserts the create_version request body includes the description when given and omits it when not
- [x] #5 The push script's header comment and the gtm-web-recipes README document the new option
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-28: TASK-44 changes the same push script (workspace and version name as separate settings); do them together or TASK-44 first.

Acceptance criteria unchanged by the plan. versionDescription threads through executePlan, applySpec, applyPlan, GtmSnapshot.push and a new --version-description CLI flag (parity with --version-name, a pass-through), and pnpm push reads GTM_LIBRARY_VERSION_DESCRIPTION. The gtm-client fake now records a version's description only when create_version sends one, which is how the tests show the field is omitted by default. AC #1 is verified against the fake and the API's documented ContainerVersion.description field; the first live push that uses it is TASK-40's. pnpm verify: 19 + 18 + 131 + 13.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pushes and applies can describe the version they create: versionDescription goes to workspaces.create_version beside the name, from pnpm push (GTM_LIBRARY_VERSION_DESCRIPTION), GtmSnapshot.push, applySpec, applyPlan or gtm-apply --version-description. Without it the request carries no description field, as before. Tested with the gtm-client fake.
<!-- SECTION:FINAL_SUMMARY:END -->
