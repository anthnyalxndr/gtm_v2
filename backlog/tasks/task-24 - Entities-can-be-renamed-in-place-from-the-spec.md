---
id: TASK-24
title: Entities can be renamed in place from the spec
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-23
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implements the identity decision so that changing an entity's name in the spec plans as an update that keeps the GTM id, and references by the old name in other spec entities are updated in the same apply. Changing a tag's type in place is an update, not delete plus create.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Renaming a tag, trigger, variable or folder in the spec plans as [~] update, keeps the entity id, and applies
- [ ] #2 Spec entities that referenced the old name (firingTriggerName, blockingTriggerName, parentFolderName, {{Name}} references) resolve to the renamed entity in the same apply without an error
- [ ] #3 Changing a tag's type in place plans as an update that keeps the tag id
- [ ] #4 A dry run shows the rename as old name to new name so a reviewer can tell it from a delete plus create
- [ ] #5 Unit tests cover rename of each entity type the decision supports, reference updates, and the type change
- [ ] #6 README documents how identity works and what a rename looks like in the spec
<!-- AC:END -->
