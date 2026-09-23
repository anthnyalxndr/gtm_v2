---
id: TASK-37
title: >-
  gtm runs the repo loop over every managed container: pull, diff, plan, apply
  and publish
status: To Do
assignee: []
created_date: '2026-09-23 21:28'
labels:
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-36
  - TASK-28
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Once an account repo exists (TASK-36), the day-to-day commands read the repo config file (TASK-30) and loop over its containers. gtm pull re-pulls each container directory through gtm-apply pull (TASK-35), so an unchanged container leaves no diff. gtm diff pulls to a temporary directory and compares the canonical spec.json to the committed one: exit 0 when every container matches, exit 2 on drift with the container id and the entity names that differ. This is git-side drift, what changed in GTM since the last pull; TASK-28's plan against the live version is the other direction and gtm plan reuses it. gtm plan builds each container's desired spec by compiling gtm/containers/<id>/plan.ts against the recipe library when the file exists and merging custom.ts with mergeSpecs, then prints gtm-apply's plan. gtm apply applies the desired spec into a workspace named from --workspace or the current commit. gtm publish publishes the version recorded by the last apply or the one named with --version. --changed <git ref> restricts apply and plan to containers whose directory differs from that ref, which is how CI applies only what a merge touched. Design: docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 gtm pull rewrites every managed container's directory; on an unchanged container git reports no change apart from snapshot.json's pulledAt
- [ ] #2 gtm diff exits 0 when every committed spec.json equals a fresh pull and 2 when any differs, printing each drifted container's id and the names of the entities that differ
- [ ] #3 gtm plan compiles plan.ts and custom.ts into one spec per container, fails naming the container on a merge conflict or a tracking-plan issue, and prints gtm-apply's plan for each container
- [ ] #4 gtm apply --changed origin/main applies only containers whose directory differs from that ref and names the workspace after the current commit unless --workspace is given
- [ ] #5 gtm publish publishes the version from --version or the one container.json recorded on the last apply, and refuses with a message when neither exists
- [ ] #6 Every command accepts a container public id to act on one container; unit tests with the fake service cover each command and both exit codes; the README documents the loop and how the CI jobs call it
<!-- AC:END -->
