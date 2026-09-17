---
id: TASK-22
title: Custom environments are applied from the spec
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
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Snapshots list environments but apply never writes them. Custom environments give preview URLs and staged rollouts, both needed by the CI workflow. Environments are container level, not workspace level, so they are applied outside the workspace and are not versioned; the plan should say so. Live and Latest are built in and never in the spec. The spec carries name, description, url and enableDebug; the authorization code is server-generated and never in the spec. Environments are not a Tag Manager 360 feature.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A spec environment section creates a custom environment by name, and a second apply reports it unchanged
- [ ] #2 A changed description, url or enableDebug plans and applies an update
- [ ] #3 A spec that names an environment called Live or Latest is a validation error
- [ ] #4 The plan output shows environment operations under a heading that states they are container level and not versioned
- [ ] #5 export emits the environment section without Live, Latest or authorization codes
- [ ] #6 Unit tests cover create, update, unchanged, and the reserved-name error
<!-- AC:END -->
