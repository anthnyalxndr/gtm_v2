---
id: TASK-21
title: Google tag configs are applied from the spec
status: Done
assignee:
  - '@claude'
created_date: '2026-09-17 15:57'
updated_date: '2026-09-29 00:28'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Snapshots carry gtagConfig but apply never writes it. Google tag configs hold the GA4 and Ads tag settings, so a container with one is only partly managed from git. Gtag configs have no name; the API keys them by the tagId parameter. Identity in the spec should be tagId, applied after variables (parameters can reference variables) through workspaces.gtag_config.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A spec gtagConfig section creates a config keyed by its tagId parameter, and a second apply reports it unchanged
- [x] #2 A changed parameter on an existing tagId plans and applies an update that keeps the gtagConfigId
- [x] #3 Two spec entries with the same tagId are a validation error
- [x] #4 export and normalize emit the gtagConfig section from a snapshot or UI export
- [x] #5 Unit tests cover create, update, unchanged, and the duplicate tagId error
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. gtm-model: GtagConfigSpec (a GtagConfig without ids and server fields) and a gtagConfig section on ContainerSpec and WebContainerSpec; only web containers hold it.
2. gtagConfigTagId(config) reads the tagId parameter, the config's identity.
3. validateSpec labels a config by its tagId, requires one, and reports a tagId used by two configs.
4. normalize and snapshotToSpec carry gtag configs without gtagConfigId, fingerprint, path and the other server fields.
5. The planner reads gtag configs only when the spec has some (from the workspace, or the latest version for a new workspace) and plans create, update or unchanged by tagId with matches().
6. executePlan lists the workspace's configs (a new workspace holds the latest version's) and creates or updates by tagId after variables, keeping the gtagConfigId.
7. Tests for create, unchanged, update keeping the id, the validation errors and normalize.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Acceptance criteria unchanged by the plan. Gtag configs are read only when the spec has any, because ContainerRef carries no feature flags and a container without Google tag config support may reject the list call; such a container then fails with the API's own error. No live check: our template containers report supportGtagConfigs false. pnpm verify green.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Google tag configs are managed from the spec: a gtagConfig section, identified by each config's tagId parameter, is validated (tagId required and unique), planned and applied by tagId after variables, and updated in place keeping its id. Exports and snapshots carry configs without their ids. Tested with the gtm-client fake; no live container here supports gtag configs.
<!-- SECTION:FINAL_SUMMARY:END -->
