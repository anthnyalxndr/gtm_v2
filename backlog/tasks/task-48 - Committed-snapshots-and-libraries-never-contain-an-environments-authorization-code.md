---
id: TASK-48
title: >-
  Committed snapshots and libraries never contain an environment's authorization
  code
status: Done
assignee:
  - '@claude'
created_date: '2026-09-29 00:15'
updated_date: '2026-09-29 00:16'
labels:
  - security
  - snapshot
dependencies: []
priority: high
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A commit security review on 2026-09-29 flagged the pulled recipe libraries: packages/gtm-recipes/src/web/library.ts and src/server/library.ts include each environment's authorizationCode (the gtm_auth token that lets anyone preview that environment's container version). The repo is public, and web codes have been in history since the first real pulls (commits 5d3bfcc and f11d84a). For these template containers the exposure is placeholder-only, but a customer account repo (TASK-35 writes snapshot.json per container) would leak real preview access the same way. Strip the code wherever a snapshot is written for committing; the pull itself can keep reading everything. Rotating the exposed codes and any history rewrite are the owner's calls, not this task's.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GtmSnapshot.toJSON and libraryModuleSource output contain no authorizationCode for any environment, including the serving environment field
- [x] #2 gtm-apply exports the redaction so other writers (TASK-35's container directories) apply the same rule
- [x] #3 The web and server libraries are re-pulled and contain no authorization code
- [x] #4 A unit test seeds environments with authorization codes through the gtm-client fake and asserts none reach the committed output
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Acceptance criteria unchanged by the plan. redactSnapshotSecrets (gtm-apply snapshot/redact.ts, exported) drops authorizationCode from every environment and from the serving environment; GtmSnapshot.toJSON and libraryModuleSource both apply it, so a library written either way is clean, while the in-memory pull still reads everything. Both libraries were re-pulled; the only authorizationCode matches left under packages/ are the Discovery schema's field definitions. Not done here, and the owner's call: rotating the exposed Live and Latest codes of Template - Web and Template - Server (environments.reauthorize), and any history rewrite (the repo is public; force pushes are off limits). pnpm verify green.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Committed recipe libraries no longer carry environment authorization codes: gtm-apply redacts them at write time (redactSnapshotSecrets, used by GtmSnapshot.toJSON and libraryModuleSource) and exports the redaction for other writers such as TASK-35's directories. Both libraries were re-pulled clean. Rotation of the codes already in public history is left to the owner.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
