---
id: TASK-32
title: 'The repo ships the GTM as code workflow: docs, CI templates and runbook'
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
updated_date: '2026-09-23 21:29'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-27
  - TASK-26
  - TASK-25
  - TASK-28
  - TASK-29
  - TASK-30
  - TASK-31
  - TASK-36
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ties the pieces into a workflow a customer repo can adopt. Permission model: humans hold Read on managed containers, only the deploy identity holds Publish, and the docs state that account admins can bypass this so drift detection is the real control. CI templates for GitHub Actions: on pull request, plan against live, evaluate policy, post the plan and rule hits as a PR comment, and write a preview workspace named after the PR, deleted on close; on merge to main, apply with --prune and --publish, version name from the commit subject, inside a concurrency group; on a schedule, plan against live for every container in the repo config and on drift either open a reconcile PR from export --live or re-apply main, per config. Runbook covers rollback by git revert and redeploy, break-glass UI edits imported by the reconcile PR, and onboarding an existing container by export. The plan in backlog/docs/doc-1 has the full description.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docs/ contains a guide that describes the permission model, the three CI jobs, rollback, and break-glass, and it matches what the CLI does
- [ ] #2 A reusable GitHub Actions workflow (or templates) exists for the PR job, the merge job and the scheduled drift job, using the repo config file and headless auth
- [ ] #3 The PR job posts one comment with the plan, policy hits and the preview workspace link, updating the same comment on new pushes
- [ ] #4 The merge job runs inside a concurrency group and uses the commit subject as the version name
- [ ] #5 The drift job opens a reconcile pull request from export --live when configured to import, and re-applies main when configured to enforce
- [ ] #6 The templates are exercised against a test container (anthny.xyz - test account) and the run links are recorded in the task notes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-23: the CI workflow templates this task defines are what gtm init (TASK-36) bundles into a new account repo and gtm update (TASK-38) refreshes; the jobs call the gtm loop commands from TASK-37. See docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md.
<!-- SECTION:NOTES:END -->
