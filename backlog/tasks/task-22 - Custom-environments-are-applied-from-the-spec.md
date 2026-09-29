---
id: TASK-22
title: Custom environments are applied from the spec
status: Done
assignee:
  - '@claude'
created_date: '2026-09-17 15:57'
updated_date: '2026-09-29 00:25'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Snapshots list environments but apply never writes them. Custom environments give preview URLs and staged rollouts, both needed by the CI workflow. Environments are container level, not workspace level, so they are applied outside the workspace and are not versioned; the plan should say so. Live and Latest are built in and never in the spec. The spec carries name, description, url and enableDebug; the authorization code is server-generated and never in the spec. Environments are not a Tag Manager 360 feature.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A spec environment section creates a custom environment by name, and a second apply reports it unchanged
- [x] #2 A changed description, url or enableDebug plans and applies an update
- [x] #3 A spec that names an environment called Live or Latest is a validation error
- [x] #4 The plan output shows environment operations under a heading that states they are container level and not versioned
- [x] #5 export emits the environment section without Live, Latest or authorization codes
- [x] #6 Unit tests cover create, update, unchanged, and the reserved-name error
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. gtm-model: EnvironmentSpec (name, description, url, enableDebug) and an environment section on ContainerSpec and the typed members; every container type may hold it.
2. validateSpec: Live and Latest are reserved names; any field besides name, description, url, enableDebug and type is set by Tag Manager and rejected; type must be user when present.
3. normalize keeps custom (type user) environments with only the spec fields, so snapshotToSpec and export carry them without Live, Latest, ids or authorization codes; export lists the container's environments for every source.
4. planContainerSpec reads the container's custom environments and plans create, update or unchanged by name; environment ops never make the plan create a version. formatPlan prints them under 'Environments (container level, not versioned):'.
5. executePlan creates or updates environments through the container's environments API, outside the workspace, before the no-version return.
6. gtm-client fake: environments create and update. Tests for create, unchanged, update keeping the id, no version on environment-only changes, the plan heading, validation, and snapshot and export output.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Acceptance criteria unchanged by the plan. The old validation test used environment as its example of an unknown section; it now uses zone (a Tag Manager 360 feature). pnpm verify: 19 + 23 + 154 + 23.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Custom environments are managed from the spec: an environment section (name, description, url, enableDebug) is validated (Live and Latest reserved, Tag Manager-owned fields rejected), planned by name under a container-level heading, and written through the container's environments API outside the workspace, never triggering a version. Snapshots and export carry custom environments without the built-in ones or authorization codes.
<!-- SECTION:FINAL_SUMMARY:END -->
