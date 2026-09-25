---
id: TASK-38
title: >-
  gtm update refreshes an account repo's scaffold, and the bundled base layer is
  checked against the copier base
status: To Do
assignee: []
created_date: '2026-09-23 21:29'
labels:
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-36
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The files gtm init writes (hooks, prettier config, scripts, CI workflows, README) change as standards change. gtm update rewrites them from the installed package's templates without touching gtm/containers, the repo config file, plan.ts or custom.ts, shows a unified diff first, and writes only on confirmation or --yes. The set of files the scaffold owns is a manifest inside the package, so a file the user added is never overwritten.

Because the base layer is bundled rather than pulled from anthnyalxndr/copier-templates (decision-11), a test pins copies of the copier base's equivalent files and fails when the bundled ones diverge, with a message saying which file to update and where the copier copy lives. Standards then propagate by hand and visibly, never silently. Design: docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 gtm update rewrites only the files named in the package's scaffold manifest and never touches gtm/containers, the repo config file, plan.ts or custom.ts
- [ ] #2 gtm update prints a unified diff of every file it would change and asks before writing; --yes writes without asking; a non-interactive terminal without --yes exits 1 and changes nothing
- [ ] #3 A test compares the bundled hook, prettier and gitignore templates against pinned copies of the copier-templates base files and fails on divergence with a message naming the file and the pinned source
- [ ] #4 The package README documents update and lists the files the scaffold owns
<!-- AC:END -->
