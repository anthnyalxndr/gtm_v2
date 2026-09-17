---
id: TASK-28
title: >-
  A plan against the live version is available as machine-readable output with a
  drift exit code
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-25
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Drift detection and PR comments need a plan computed against what is published, not against a workspace, with stable structured output and an exit code CI can branch on. Today dry run plans against a workspace or the latest version and prints text only. Add a plan command (or flags on apply --dry-run) that reads the live version, emits JSON with every operation including extras from the prune planner, and exits 0 on no changes and a distinct code on drift. A text renderer for PR comments builds on the same JSON.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 gtm-apply plan --container X --live --json prints a JSON document listing create, update, delete and unchanged operations with entity type, name, and changed fields
- [ ] #2 Exit code is 0 when the plan has no changes, a distinct documented code when it has changes, and 1 on errors
- [ ] #3 Extras present in the container but absent from the spec appear in the plan output whether or not prune is enabled
- [ ] #4 A markdown renderer produces the same plan as a PR comment body
- [ ] #5 Unit tests cover the JSON shape, exit codes, and the markdown renderer
<!-- AC:END -->
