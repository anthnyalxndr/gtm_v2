---
id: TASK-23
title: >-
  Decision: how an entity is renamed or mutated in place without delete plus
  create
status: Review
assignee:
  - '@claude'
created_date: '2026-09-17 15:57'
updated_date: '2026-09-25 10:20'
labels:
  - gtm-apply
  - gtm-as-code
  - decision
milestone: m-0
dependencies: []
references:
  - >-
    backlog/decisions/decision-2 -
    The-spec-format-is-the-container-export-shape-with-name-references.md
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Names are identity (decision-2), which is what lets the planner run without a state file. The cost is that renaming a tag in the spec plans as delete plus create, and a trigger or tag that referenced the old name errors. That does not match an author's intent: editing the name field should be an update. Record a decision that chooses how the tool tells a rename from a delete plus create. Options to weigh, with trade-offs: a stable key per entity stored in the entity's notes field (tags, triggers and variables have notes; folders, templates, environments and gtag configs do not); a one-shot renameFrom field in the spec; a committed per-container state file mapping spec keys to GTM ids; GTM's own ids in the spec, which are not portable between staging and prod containers. Also cover changes of type in place (a tag changing type keeps its id through update) and state which entity types, if any, still need a documented two-step rename.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A decision record exists in backlog/decisions with context, the options above and their trade-offs, the chosen approach, and consequences, marked as amending decision-2
- [x] #2 The chosen approach names how each entity type (folder, variable, trigger, tag, client, transformation, template, gtag config, environment) is identified across a rename, or states that the type falls back to a two-step
- [x] #3 The decision states whether a state file is introduced and, if not, why the chosen identity survives a rename without one
- [x] #4 The decision is linked from the rename implementation task
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Draft decision-12 (amends decision-2) with context, the four options and trade-offs, a recommended approach (a one-shot renameFrom field in the spec, no state file), per-kind identity table, and consequences for TASK-24 and TASK-25. 2. Link it from TASK-24 with --ref. 3. Leave the decision as proposed for the owner to accept; set the task to Review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-25: drafted decision-12 (status proposed) recommending a one-shot renameFrom field: names stay identity, no state file, planner rules for the four existence cases, old-name references resolve with a warning, prune treats the renamed entity as owner of the old name, per-kind table with gtag configs as the only two-step kind. Linked from TASK-24. The owner accepts or amends the decision; TASK-24 starts after that.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
decision-12 drafted and linked from TASK-24: renames are declared in the spec with a one-shot renameFrom field, names stay identity and no state file is introduced (amends decision-2). Awaiting the owner's acceptance.
<!-- SECTION:FINAL_SUMMARY:END -->
