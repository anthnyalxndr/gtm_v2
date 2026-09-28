---
id: TASK-45
title: One gtm-recipes package ships the recipe libraries keyed by container type
status: Done
assignee:
  - '@claude'
created_date: '2026-09-28 20:53'
updated_date: '2026-09-28 23:50'
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
- [x] #1 packages/gtm-recipes replaces packages/gtm-web-recipes, named @anthnyalxndr/gtm-recipes, with the web library under src/web and a root export recipes keyed by container type
- [x] #2 The package exports each library from a subpath (./web now; ./server added by TASK-40)
- [x] #3 pnpm pull, push and sample take the library type (web now) as an argument and read that type's template container, module path and in-code template from one table
- [x] #4 Every reference to gtm-web-recipes outside dated plans is updated, and pnpm verify passes
- [x] #5 A web push dry run after the move plans exactly what it planned before the move against GTM-TPLKC7QP (the 8 conversion tags already planned as modified on main, the parameter-order comparison PR #19 fixes)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. git mv packages/gtm-web-recipes to packages/gtm-recipes, then src/library.ts and src/index.ts to src/web/, scripts/template.ts to scripts/web/template.ts, plan.example.ts to examples/web.plan.ts, test/library.test.ts to test/web.test.ts.
2. scripts/libraries.ts: one table keyed by library type (web now) with the template container, the committed module path and the in-code template; libraryFromArgv reads the type from the command line. pull, push, sample and write-library take the type. push-settings takes the type's default container.
3. package.json: name @anthnyalxndr/gtm-recipes, exports . (recipes keyed by container type) and ./web.
4. Update references in the root README, the gtm-apply README and the gtm-as-code design spec; pnpm install for the lockfile.
5. Check: the web push dry run gives the same plan as before the move (the 8 conversion tags already plan as modified on main, the parameter-order comparison PR #19 fixes, so 'no changes' in AC #4 becomes 'the same plan as before the move').
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #4 replaced as the plan anticipated: on main the dry run already reports the 8 conversion tags as modified (parameter order, fixed by PR #19), so the check is that the move changes nothing, not that the plan is empty. Confirmed: same 10 lines before and after. pnpm push/pull/sample now take the library type; without one they print 'Usage: pnpm <pull|push|sample> <web> [--dry-run]'. References updated in the root README, the gtm-apply README and the gtm-as-code design spec; backlog task history and dated plans keep the old name. pnpm verify: 19 + 18 + 131 + 16.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
packages/gtm-web-recipes is now packages/gtm-recipes (@anthnyalxndr/gtm-recipes): the web library lives under src/web, the root export is recipes keyed by container type, ./web is a subpath export, and scripts/libraries.ts maps each type to its template container, module and in-code template, which pull, push and sample take as an argument. Verified with pnpm verify and a web push dry run identical to the one before the move.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
