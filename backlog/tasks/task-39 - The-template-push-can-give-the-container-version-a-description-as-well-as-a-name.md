---
id: TASK-39
title: >-
  The template push can give the container version a description as well as a
  name
status: To Do
assignee: []
created_date: '2026-09-27 23:22'
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
- [ ] #1 pnpm push accepts a version description (for example a GTM_LIBRARY_VERSION_DESCRIPTION variable or a --description flag) and the version it creates carries that description in Tag Manager
- [ ] #2 GtmSnapshot.push and the execute options accept an optional versionDescription that is sent to workspaces.create_version alongside the name
- [ ] #3 Leaving the description out creates a version exactly as today, with no description field sent
- [ ] #4 A unit test asserts the create_version request body includes the description when given and omits it when not
- [ ] #5 The push script's header comment and the gtm-web-recipes README document the new option
<!-- AC:END -->
