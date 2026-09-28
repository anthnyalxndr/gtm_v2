---
id: TASK-45
title: One gtm-recipes package ships the recipe libraries keyed by container type
status: To Do
assignee: []
created_date: '2026-09-28 20:53'
labels:
  - recipes
  - architecture
dependencies:
  - TASK-41
priority: high
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/gtm-web-recipes (@anthnyalxndr/gtm-web-recipes, private, unpublished) ships the Template - Web library. TASK-40 adds a server library. The owner chose one package with libraries keyed by container type over a sibling gtm-server-recipes package. Rename it to packages/gtm-recipes (@anthnyalxndr/gtm-recipes): the root export is recipes keyed by container type (recipes.web, later recipes.server), each library also has a subpath export (./web, ./server), and the pull, push and sample scripts take the library type as an argument. Only this repo references the package, so the rename touches the root README, the gtm-apply README, the gtm-as-code design spec (docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md) and the lockfile; dated plans under docs/superpowers/plans stay as history. This task moves the web library only; TASK-40 adds the server one.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 packages/gtm-recipes replaces packages/gtm-web-recipes, named @anthnyalxndr/gtm-recipes, with the web library under src/web and a root export recipes keyed by container type
- [ ] #2 The package exports each library from a subpath (./web now; ./server added by TASK-40)
- [ ] #3 pnpm pull, push and sample take the library type (web now) as an argument and read that type's template container, module path and in-code template from one table
- [ ] #4 A push dry run of the web library after the move reports no changes to GTM-TPLKC7QP
- [ ] #5 Every reference to gtm-web-recipes outside dated plans is updated, and pnpm verify passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
