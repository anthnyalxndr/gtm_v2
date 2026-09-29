---
id: TASK-47
title: >-
  A recipe library can grow past a handful of recipes without hitting Tag
  Manager's 1024-character constant limit
status: To Do
assignee: []
created_date: '2026-09-28 23:59'
labels:
  - recipes
  - library
dependencies:
  - TASK-40
priority: medium
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Each library keeps per-recipe data (description, Google Ads dependencies, conflicts) in one Library - Manifest constant, and Tag Manager rejects a constant value longer than 1024 characters. On 2026-09-28 the first Template - Server push failed on it (server manifest 1146 characters, web 1069 after adding google_tag_server); TASK-40 trimmed descriptions to fit (990 and 1011). Each conversion recipe costs about 150 characters, mostly its dependency entry, so a seventh or eighth recipe will not fit. decision-10 already moved recipe membership and placeholders into entity notes trailers (512000-character cap, TASK-15); per-recipe manifest data could move into the root entity's notes the same way, leaving the manifest for library-wide settings (conventions, destinations, placeholder pattern, encoding). This changes decision-10's split, so it needs a decision record first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A decision record says where per-recipe data (description, dependencies, conflicts) lives and why, amending decision-10
- [ ] #2 A library with at least twelve conversion recipes lints and pushes without any constant exceeding 1024 characters
- [ ] #3 Libraries pulled before the change still load, or the pull migrates them, and the web and server libraries are re-pulled in the new shape
- [ ] #4 Lint reports per-recipe data that is declared in two places or on an entity that is not a recipe root
- [ ] #5 Unit tests cover the new location, the old-shape library and the lint rules; pnpm verify passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
