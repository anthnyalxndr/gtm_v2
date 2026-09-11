---
id: TASK-8
title: >-
  Gtm is the entry point: a client-holding facade with memoized snapshot(),
  apply() and applyPlan(); GtmSnapshot keeps the pulled data under a data
  property and stages entity edits separately
status: Done
assignee:
  - '@claude'
created_date: '2026-09-11 08:45'
updated_date: '2026-09-11 08:48'
labels:
  - sdk
  - facade
dependencies: []
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
gtm-apply exposes a dozen loose functions plus GtmSnapshot, each taking the client first; a new user has no obvious place to start. Add a Gtm class that holds only the client (and a per-source cache): init(), snapshot(source, { refresh }) returning a GtmSnapshot memoized by container and workspace, snapshotFrom(data), apply(options), applyPlan(options), export(source). Functions stay exported and the class delegates. GtmSnapshot changes shape so the raw pull is a single data property of type ApiSnapshotData instead of own members; the committed file becomes { data, manifest, encoding, recipes }, the live RecipeEncoding is exposed as encoding, and RecipeNameOf/ConstantNameOf read recipes and data.variable. Entity views (tags, triggers, variables, folders, clients, transformations) become a staged working copy: assignable without mutating data, with recipes re-indexed, spec reflecting the staged state, push applying it, reset() discarding it, and toJSON writing the pristine pull. gtm.library is not added; a snapshot is a value from one container at one moment, and the facade serves many.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 new Gtm(client) exposes init, snapshot, snapshotFrom, apply, applyPlan and export; snapshot(source) returns the same GtmSnapshot instance for the same container and workspace until refresh is requested
- [x] #2 GtmSnapshot.data is the ApiSnapshotData of the pull; toJSON returns { data, manifest, encoding, recipes }; fromData accepts that shape and infers literal recipe and constant names from recipes and data.variable
- [x] #3 Assigning snapshot.tags (and the other entity maps) changes spec, select and push output and re-indexes recipes, while data and toJSON are unchanged; reset() restores the pulled state
- [x] #4 The content package's pull script, library module and index use the new shape; README and example.ts lead with Gtm
- [x] #5 Tests cover facade delegation and memoization, the data property round trip, staged edits, and reset
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rewrite src/library/gtm-snapshot.ts: data property, staged #spec with entity-map getters and setters, reset(), encoding as the live object, toJSON { data, manifest, encoding, recipes }, RecipeNameOf/ConstantNameOf over the new shape.
2. Add src/gtm.ts with the Gtm facade (init, snapshot memoized by container+workspace, snapshotFrom, apply, applyPlan, export); export from index.
3. Update tracking-plan.ts, cli.ts loadLibrary, tests (library, tracking-plan, cli), README, example.ts.
4. Update gtm-web-recipes: sample script, index (typeof data shape), tests; regenerate library.ts. pnpm verify, commit, PR.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Gtm lives in src/gtm.ts and holds only the client plus a Map cache keyed container|workspace|version. GtmSnapshot keeps a private staged spec derived from data at load; every entity view getter reads it and every setter replaces one section (Map or array accepted) and re-indexes recipes; toJSON recomputes the recipe index from the pristine data so staged edits never leak into the committed file. The data/encoding name clash is gone: the file's encoding field is the descriptor, the class's encoding is the live RecipeEncoding. gtm.library was not added (decision in conversation: a snapshot is a value from one container at one moment). pnpm verify: 19 + 122 + 3 tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the Gtm facade with memoized snapshot(), snapshotFrom, export, plan, apply and applyPlan; reshaped GtmSnapshot around a data property with staged, assignable entity views, isDirty and reset(); updated the content package, README and example. Verified with pnpm verify (144 tests).
<!-- SECTION:FINAL_SUMMARY:END -->
