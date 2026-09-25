---
id: TASK-35
title: >-
  gtm-apply pull writes a container directory with a canonical spec, a snapshot
  and a container record
status: Review
assignee:
  - '@claude'
created_date: '2026-09-23 21:28'
updated_date: '2026-09-25 10:11'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-34
  - TASK-19
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
An account repo (decision-11, docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md) holds one directory per container: spec.json (the apply-able part, canonical per TASK-34), snapshot.json (everything the API exposes, per TASK-4, canonical), and container.json (public id, name, container type, account id, container id, the source read, the version id and name read, and the environment serving it; no timestamp, so an unchanged container rewrites it byte for byte). export and snapshot print to stdout; pull writes those three files. --account uses TASK-19's account listing to pull every container into <out>/<publicId>/, concurrently through the client's throttle.

A container whose spec cannot be normalized (custom-template tags until TASK-10 lands, trigger groups) still gets snapshot.json and container.json; the error names the container and the command exits nonzero once every container has been attempted, so one odd container does not block an account import. This is the import primitive that gtm init and gtm pull (TASK-36, TASK-37) build on.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 gtm-apply pull --container GTM-X --out <dir> writes <dir>/spec.json, <dir>/snapshot.json and <dir>/container.json; a second pull of an unchanged container rewrites spec.json and container.json byte-identical and snapshot.json differs only in pulledAt
- [x] #2 --live, --version and --workspace select what is read exactly as they do for snapshot, and container.json records which source was read
- [x] #3 A container whose spec cannot be normalized still yields snapshot.json and container.json, an existing spec.json is left untouched, the error names the container, and the exit code is nonzero after every container was attempted
- [x] #4 pullContainer(client, source, dir) and pullAccount(client, accountId, outDir) are exported; unit tests with the fake service cover the file set, the byte-identical re-pull, the account fan-out and the partial-failure path; the README documents pull
- [x] #5 gtm-apply pull --account <id> --out <dir> writes one subdirectory per container named by containerSlug(name, publicId): the name lowercased with runs of non-alphanumerics collapsed to one dash, the lowercased public id when the name yields nothing, and the public id appended on a collision; pullAccount takes a dirFor(ref) option to override the naming; containers are pulled concurrently within the client's throttle
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Foundations plan tasks 8 to 11 (docs/superpowers/plans/2026-09-23-gtm-as-code-foundations.md): 1. snapshot/dir.ts: containerSlug, ContainerRecord, containerRecord, writeContainerDir, pullContainer with tests (file set, byte-identical re-pull, workspace source, earlier spec kept on normalize error). 2. pullAccount with slug directories, dirFor and filter options, partial failures, slug collision suffix. 3. CLI pull command (--container or --account, --out) with exit codes. 4. README pull section. Branch cut from feat/task-19-account-snapshots; PR base main; merge after #19 and the TASK-19 PR.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-25: snapshot/dir.ts with containerSlug, containerRecord, writeContainerDir, pullContainer, pullAccount (slug directories de-duplicated by public id, filter and dirFor options, partial failures reported); pull CLI command with exit 1 after every container was attempted. 14 new tests. Branch cut from feat/task-19-account-snapshots; merge after PRs #19 and #20.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
gtm-apply pull --container X --out <dir> writes spec.json (canonical), snapshot.json (canonical) and container.json (identity and what was read, no timestamp); --account <id> --out <dir> writes one <slug>/ per container concurrently, keeps going when one container fails, and exits 1 at the end. Exported: containerSlug, containerRecord, writeContainerDir, pullContainer, pullAccount. README documents pull. pnpm verify green: 21 + 168 + 6 tests.
<!-- SECTION:FINAL_SUMMARY:END -->
