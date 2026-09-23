---
id: TASK-35
title: >-
  gtm-apply pull writes a container directory with a canonical spec, a snapshot
  and a container record
status: To Do
assignee: []
created_date: '2026-09-23 21:28'
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
- [ ] #1 gtm-apply pull --container GTM-X --out <dir> writes <dir>/spec.json, <dir>/snapshot.json and <dir>/container.json; a second pull of an unchanged container rewrites spec.json and container.json byte-identical and snapshot.json differs only in pulledAt
- [ ] #2 gtm-apply pull --account <id> --out <dir> writes one subdirectory per container named by its public id, pulling containers concurrently within the client's throttle
- [ ] #3 --live, --version and --workspace select what is read exactly as they do for snapshot, and container.json records which source was read
- [ ] #4 A container whose spec cannot be normalized still yields snapshot.json and container.json, an existing spec.json is left untouched, the error names the container, and the exit code is nonzero after every container was attempted
- [ ] #5 pullContainer(client, source, dir) and pullAccount(client, accountId, outDir) are exported; unit tests with the fake service cover the file set, the byte-identical re-pull, the account fan-out and the partial-failure path; the README documents pull
<!-- AC:END -->
