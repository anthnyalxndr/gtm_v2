---
id: TASK-49
title: apply leaves changes in the workspace; creating a version is opt-in
status: To Do
assignee: []
created_date: '2026-09-29 03:16'
labels: []
dependencies: []
priority: high
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
executePlan (packages/gtm-apply/src/spec/execute.ts) creates a container version whenever the plan changed anything, and Tag Manager deletes the workspace the moment a version is cut. So every follow-up edit after an apply needs a new workspace, a new version, and a delete of the superseded version. On the Highpass container (GTM-PRMWX52P, 2026-09-28) four naming nits produced versions 7 to 12, all deleted. The engine should write into the named workspace and stop there by default, leaving the workspace open for review in the UI and for further applies; versioning (and publishing) is a separate, explicit step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 applySpec / executePlan with default options write to the workspace and create no version; the result carries workspacePath and its Tag Manager URL and versionPath is absent
- [ ] #2 A new option (version: true, or a version: { name, notes } object) creates a version after a successful apply; publish: true implies it, as today
- [ ] #3 The CLI apply command creates no version without --version or --publish, and prints the workspace URL on every run
- [ ] #4 Before creating a version with --publish, the caller's container permission is checked and the command stops with the workspace intact when the caller lacks Publish, naming the users who hold it
- [ ] #5 Re-running apply against the same workspace with the same spec is a no-op that reports every entity as unchanged
- [ ] #6 README's 'What apply does' and 'Versions and workspaces' sections describe the workspace-first default and the opt-in version step
<!-- AC:END -->
