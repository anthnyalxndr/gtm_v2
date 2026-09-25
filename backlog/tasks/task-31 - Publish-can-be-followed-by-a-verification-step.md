---
id: TASK-31
title: Publish can be followed by a verification step
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
priority: low
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Publishing proves that a version is live, not that tags fire. Add a post-publish step: the tool confirms the live version id equals the version it just created, and can run a user-supplied command (for example a gtm_audit run against the site) whose nonzero exit fails the job. Keep the built-in check small; the runtime check belongs to the audit tool.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After --publish the tool reads the live version and fails if its id differs from the version just created
- [ ] #2 A --verify <command> option runs the command after a successful publish and propagates its exit code
- [ ] #3 Unit tests cover the id check and the command exit propagation
- [ ] #4 README shows an example wiring gtm_audit as the verify command
<!-- AC:END -->
