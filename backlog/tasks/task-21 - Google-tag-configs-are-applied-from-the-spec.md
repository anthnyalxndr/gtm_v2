---
id: TASK-21
title: Google tag configs are applied from the spec
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
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Snapshots carry gtagConfig but apply never writes it. Google tag configs hold the GA4 and Ads tag settings, so a container with one is only partly managed from git. Gtag configs have no name; the API keys them by the tagId parameter. Identity in the spec should be tagId, applied after variables (parameters can reference variables) through workspaces.gtag_config.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A spec gtagConfig section creates a config keyed by its tagId parameter, and a second apply reports it unchanged
- [ ] #2 A changed parameter on an existing tagId plans and applies an update that keeps the gtagConfigId
- [ ] #3 Two spec entries with the same tagId are a validation error
- [ ] #4 export and normalize emit the gtagConfig section from a snapshot or UI export
- [ ] #5 Unit tests cover create, update, unchanged, and the duplicate tagId error
<!-- AC:END -->
