---
id: TASK-9
title: >-
  Apply produces a change report that describes and visualizes every change to a
  container
status: To Do
assignee: []
created_date: '2026-09-11 08:48'
labels:
  - sdk
  - report
dependencies:
  - TASK-8
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners and customers need to see what an apply will do or did, per entity, before and after, not just the [+]/[~]/[=] op list the plan prints. GtmSnapshot now separates the pull (data) from a staged state, which is the natural before/after pair; a plan against a target container gives the same pair for a customer run. Build a ChangeReport model computed from an existing state and a desired spec (entity added, removed or changed, with a field-level diff of changed entities, the references that link them, and which recipe each change came from when a plan is the source), a renderer to Markdown and to a standalone HTML page (grouped by recipe and entity kind, diff highlighting, reference links between entities, summary counts), and hooks so gtm-apply apply --report <file>, applyPlan({ reportTo }), and GtmSnapshot (staged versus pulled) can all emit one. gtm_audit TASK-4 (customer change report with rationale) should consume this rather than build its own.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A ChangeReport is computed from an ExistingState and a ContainerSpec: per entity kind, lists of added, removed (when a removal mode is requested) and changed entities, and for changed entities a field-level diff that ignores server fields
- [ ] #2 When the source is a tracking plan, each change is attributed to the recipe(s) whose closure includes the entity, and constants show the value being set
- [ ] #3 GtmSnapshot.changes() reports the staged state against the pull with the same model
- [ ] #4 Renderers produce Markdown and a self-contained HTML page with summary counts, grouping by recipe and kind, and highlighted before/after values; the HTML renders with no external resources
- [ ] #5 gtm-apply apply accepts --report <file.md|file.html> for both --spec and --plan runs, and applyPlan accepts reportTo; dry runs produce the same report as real runs
- [ ] #6 Tests cover the diff model, recipe attribution, the snapshot staged-versus-pull case, and a snapshot test of both renderers
<!-- AC:END -->
