---
id: TASK-44
title: >-
  The template push can write into an existing workspace, so changes made in the
  UI and not yet versioned are kept
status: Done
assignee:
  - '@claude'
created_date: '2026-09-28 20:53'
updated_date: '2026-09-28 23:45'
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
- [x] #1 The push script takes the target workspace and the version name as separate settings, with the version name defaulting to recipes-<date> whatever the workspace is
- [x] #2 A dry run against an existing workspace plans against that workspace's contents, not the latest version's
- [x] #3 A test with the gtm-client fake shows unversioned workspace entities surviving a push into that workspace
- [x] #4 The push script's header comment and the package README document both settings
- [x] #5 Pushing into an existing named workspace reconciles the template there, and the version it creates includes the workspace's earlier unversioned changes
- [x] #6 A push aimed at the Default Workspace is refused, as decision-4 requires, with a message that says to make interface edits in a named workspace and push into it
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-28, owner decision: publishing always goes through a version (the API has no publish-a-workspace call; the UI's Submit creates one too), and decision-4 forbids writing to the Default Workspace. The owner chose to make interface edits in a named workspace and push into it, instead of amending decision-4 or auto-versioning Default Workspace edits. AC #2 (push into Default Workspace) was replaced accordingly. Template - Server's existing Default Workspace edits get saved as a version once, by hand.

Implemented: scripts/push-settings.ts (GTM_LIBRARY, GTM_LIBRARY_WORKSPACE, GTM_LIBRARY_VERSION, --dry-run) used by push.ts; the version name no longer follows the workspace name. Apply already reused an existing workspace and planned against its contents; the tests prove it for the template push. gtm-apply's Default Workspace refusal now names decision-4 and says to use a named workspace. One-time: Template - Server version 2 saves the owner's Default Workspace built-ins. pnpm verify green.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The template push takes its workspace and version name as separate settings, so it can push into an existing named workspace and keep that workspace's unversioned interface edits in the version it creates. The Default Workspace stays off limits (decision-4) with a message that explains the named-workspace route. Tests use the gtm-client fake; README and script header document the settings.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
