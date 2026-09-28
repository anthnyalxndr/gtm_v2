---
id: TASK-44
title: >-
  The template push can write into an existing workspace, so changes made in the
  UI and not yet versioned are kept
status: To Do
assignee: []
created_date: '2026-09-28 20:53'
labels:
  - recipes
  - apply
dependencies: []
priority: high
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
pnpm push in the recipes package names a workspace recipes-<date> and names the version after that workspace. Apply reuses a workspace that already exists by name, but a new workspace branches from the latest version, so edits sitting in the Default Workspace without a version are left out. Template - Server (GTM-WMGVDZ5H) has exactly that: the owner enabled every built-in variable in its Default Workspace on 2026-09-28 and there is no version yet. Pushing into the Default Workspace keeps those edits, but then the version would be called 'Default Workspace'. Separate the workspace choice from the version name so a push can target an existing workspace and still name its version. Related: TASK-39 adds a version description to the same script, and TASK-26 adds a no-version mode to apply.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The push script takes the target workspace and the version name as separate settings, with the version name defaulting to recipes-<date> whatever the workspace is
- [ ] #2 Pushing into an existing workspace such as Default Workspace reconciles the template there and the version it creates includes the workspace's earlier unversioned changes
- [ ] #3 A dry run against an existing workspace plans against that workspace's contents, not the latest version's
- [ ] #4 A test with the gtm-client fake shows unversioned workspace entities surviving a push into that workspace
- [ ] #5 The push script's header comment and the package README document both settings
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
