---
id: TASK-26
title: Apply can write a named workspace and stop before creating a version
status: Done
assignee:
  - '@claude'
created_date: '2026-09-17 15:57'
updated_date: '2026-09-29 00:21'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply always creates a version when something changed, which deletes the workspace (decision-4), so a reviewer cannot open a pull request's changes in the GTM UI. Add a mode that reconciles a named workspace and stops before versioning, so the workspace survives for preview. Re-running against the same workspace reconciles it again. Print the workspace URL so a PR comment can link it. Provide a way to delete the workspace when the PR closes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 apply --no-version (name to be chosen) reconciles the named workspace and leaves it in place with no version created
- [x] #2 The command prints the workspace's Tag Manager URL on success
- [x] #3 Running the same command again against a changed spec updates the same workspace rather than creating another
- [x] #4 A command or flag deletes a named workspace, refusing the Default Workspace
- [x] #5 Unit tests cover the no-version path, re-run, and workspace deletion
- [x] #6 README documents the preview flow and the caveat that a preview workspace branches from the latest version, not the live one
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. resources/workspaces.ts: workspaceUrl(path) for the Tag Manager page, deleteWorkspace(client, containerPath, name) that refuses the Default Workspace and returns false when the workspace is already gone.
2. PlanOptions.noVersion drops the version op; noVersion with publish throws. ExecuteOptions.noVersion returns after the entity writes with workspaceUrl; applySpec and applyPlan pass it through.
3. CLI: apply --no-version prints 'Workspace kept for review, no version created: <url>'; new command delete-workspace --container --workspace.
4. The gtm-client fake names workspace paths accounts/.../workspaces/<id>, as the API does, so printed URLs match real ones.
5. Tests: no-version path, re-run updating the same workspace, publish refusal, delete (twice, and the Default Workspace refusal), CLI parse and run. README section on reviewing in a workspace.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Acceptance criteria unchanged by the plan; the option is --no-version. Also fixed: the gtm-client fake used accounts/.../workspace/<id> paths while the API uses workspaces/, which only mattered once paths became user-visible URLs. pnpm verify: 19 + 23 + 147 + 23.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
gtm-apply apply --no-version reconciles a named workspace and keeps it for review in Tag Manager, printing its page; running it again updates the same workspace, and gtm-apply delete-workspace removes it afterwards (idempotent, never the Default Workspace). The option threads through applySpec and applyPlan, refuses to combine with publish, and the README documents the review flow and the latest-version caveat.
<!-- SECTION:FINAL_SUMMARY:END -->
