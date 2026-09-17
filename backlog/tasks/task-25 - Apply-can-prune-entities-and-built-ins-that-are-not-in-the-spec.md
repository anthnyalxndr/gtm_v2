---
id: TASK-25
title: Apply can prune entities and built-ins that are not in the spec
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
updated_date: '2026-09-17 16:10'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-10
  - TASK-21
  - TASK-22
  - TASK-24
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply creates and updates but never deletes, so an entity removed from the spec stays in GTM and git stops being the source of truth on the first deletion. Add a prune mode that plans [-] for every entity in the container that the spec does not declare: tags, triggers, variables, folders, clients, transformations, templates, gtag configs and custom environments, and disables built-in variables the spec does not list. Prune is off by default. It depends on every entity type being applied (otherwise a managed container would lose entities the tool cannot write back) and on rename support (otherwise a rename prunes the old entity and recreates the new one). Deletion order is the reverse of creation: tags, then triggers, variables, folders.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apply --prune plans [-] for each entity in the container that is absent from the spec, across every applied entity type, and applies the deletions in reverse dependency order
- [ ] #2 Without --prune the plan lists extras under a separate heading as informational and deletes nothing
- [ ] #3 Built-in variables enabled in the container but absent from the spec are disabled under --prune
- [ ] #4 A rename is never planned as a prune plus create
- [ ] #5 Deleting an entity that a remaining entity references is a plan error that names both
- [ ] #6 Unit tests cover prune of each entity type, the built-in case, the rename case, and the reference error
- [ ] #7 README documents prune, its default, and the recommendation to require it in CI
<!-- AC:END -->
