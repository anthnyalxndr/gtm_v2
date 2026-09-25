---
id: TASK-29
title: Policy rules are evaluated on a plan and fail CI on violations
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-28
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A diff alone does not say which changes matter. Policy rules evaluated on the machine-readable plan flag the risky ones for PR review and for drift alerts. Initial rules: a new custom HTML or custom image tag; a changed conversion id, conversion label or measurement id; a new external domain in any tag URL or parameter; a trigger widened to All Pages or its filters removed; any entity removed. Rules have a severity, can be enabled and configured per repo, and produce output that fits in the PR comment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each listed rule fires on a plan that contains its condition and stays silent otherwise, with unit tests per rule
- [ ] #2 Rules are configured per repo with severity error or warn, and unknown rule names are a configuration error
- [ ] #3 The command exits nonzero when any error-severity rule fires
- [ ] #4 Rule hits render into the markdown plan comment with the entity name and the field that triggered the rule
- [ ] #5 README documents each rule and how to configure severity
<!-- AC:END -->
