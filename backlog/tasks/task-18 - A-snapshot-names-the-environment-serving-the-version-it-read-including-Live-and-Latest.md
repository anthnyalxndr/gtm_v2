---
id: TASK-18
title: >-
  A snapshot names the environment serving the version it read, including Live
  and Latest
status: Review
assignee:
  - '@claude'
created_date: '2026-09-17 15:30'
updated_date: '2026-09-25 10:14'
labels:
  - gtm-apply
  - bug
dependencies: []
priority: medium
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
pullSnapshot sets environment by matching environments[].containerVersionId to the version read (packages/gtm-apply/src/snapshot/pull.ts, line 138). Verified against the live API on 2026-09-17 with the Vaco containers GTM-KK24CHH and GTM-PLNNMF3: neither environments.list nor environments.get returns containerVersionId for the built-in Live and Latest environments, so environment is null even with --live and even when latest equals live. The environments list in the snapshot file also carries no version ids, so a reader cannot tell which version is published. The serving environment should be resolved by environment type instead: Live when the version read is the live version, Latest when it is the latest version header, and by containerVersionId only for custom environments that carry one. A reader of a snapshot should be able to answer 'is this the published version' from the file alone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A snapshot pulled with --live has environment set to the container's Live environment
- [x] #2 A snapshot pulled without a version flag has environment set to the Latest environment, and to Live as well when the latest version is the published one (the snapshot exposes both facts)
- [x] #3 A snapshot pulled with --version <id> resolves environment for a custom environment whose containerVersionId matches, and to Live or Latest when the id matches those
- [x] #4 A workspace source still yields environment null
- [x] #5 Unit tests cover the live, latest, custom-environment, and workspace cases with fixtures that omit containerVersionId on built-in environments, as the API does
- [x] #6 The README snapshot section and the ApiSnapshotData doc comment describe how environment is resolved
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-25: pullSnapshot now also reads versions.live once, records liveVersionId (null when live is version 0) and published, and resolves environment by type: Live for a live source, Latest for the default source, and for a version id a custom environment by containerVersionId, else Live or Latest when the id is theirs. Fixtures no longer put containerVersionId on built-in environments. canonicalSnapshot writes the two new fields; container.json gains published. The gtm-web-recipes sample library was regenerated (pnpm sample) for the new fields. Branch cut from feat/task-35-pull-dirs; merge after PRs #19, #20, #21.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Snapshots name the serving environment by type (Live, Latest, or a custom environment by version id) and carry liveVersionId and published, so a reader knows from the file whether the version read is live. Workspace sources stay environment null and unpublished. README and the ApiSnapshotData doc comment describe the rule. pnpm verify green: 21 + 169 + 6 tests.
<!-- SECTION:FINAL_SUMMARY:END -->
