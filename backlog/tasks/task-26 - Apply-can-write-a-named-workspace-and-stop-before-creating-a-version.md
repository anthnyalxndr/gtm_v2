---
id: TASK-26
title: Apply can write a named workspace and stop before creating a version
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
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
- [ ] #1 apply --no-version (name to be chosen) reconciles the named workspace and leaves it in place with no version created
- [ ] #2 The command prints the workspace's Tag Manager URL on success
- [ ] #3 Running the same command again against a changed spec updates the same workspace rather than creating another
- [ ] #4 A command or flag deletes a named workspace, refusing the Default Workspace
- [ ] #5 Unit tests cover the no-version path, re-run, and workspace deletion
- [ ] #6 README documents the preview flow and the caveat that a preview workspace branches from the latest version, not the live one
<!-- AC:END -->
