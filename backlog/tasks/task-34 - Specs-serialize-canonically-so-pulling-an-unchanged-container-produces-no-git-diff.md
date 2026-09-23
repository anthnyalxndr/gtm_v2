---
id: TASK-34
title: >-
  Specs serialize canonically, so pulling an unchanged container produces no git
  diff
status: To Do
assignee: []
created_date: '2026-09-23 21:28'
updated_date: '2026-09-23 21:33'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
normalizeExport and snapshotToSpec keep the entity order, key order and parameter order the API returns, so two exports of the same container can differ in order alone. An account repo (backlog/docs/doc-1, decision-11, docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md) commits one spec per container and diffs it on every pull and in the scheduled drift job, so what is written must be a pure function of content.

Add canonicalSpec(spec) and stringifySpec(spec) in gtm-apply: entities sorted by kind then name, firingTriggerName, blockingTriggerName and builtInVariable sorted and deduplicated, top-level parameter and map arrays sorted by key (a list parameter's items keep their order, since order is meaning there), object keys written name, type, parentFolderName, notes first and the rest alphabetically, 2-space JSON with a trailing newline. Canonical form applies where a spec is written (the normalize, export and pull commands, and the pull directory of TASK-35), not inside normalizeExport: a GtmSnapshot keeps the API's order because select() documents library order and recipe order follows tag order. Add canonicalSnapshot and stringifySnapshot for ApiSnapshotData with the same rules per collection.

matches() in resources/entities.ts compares arrays positionally, so a canonical spec applied to a container whose parameters are stored in another order would plan [~] forever. It must compare arrays of keyed parameters by key. Whether Tag Manager preserves the order parameters were sent in is unverified; record what a live probe shows in the task notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 stringifySpec returns identical text for two specs that differ only in entity order, top-level parameter or map order, object key order, or trigger-name order, and preserves the order of items inside a list parameter
- [ ] #2 gtm-apply normalize and gtm-apply export print canonical output; normalize on its own output prints the same bytes; normalizeExport and GtmSnapshot keep the order the API returned
- [ ] #3 A canonical spec applied to a container whose stored parameters are in a different order plans every entity as unchanged: matches compares arrays of uniquely keyed items by key and every other array positionally, and a live probe against a test container records in the notes whether Tag Manager preserves parameter order
- [ ] #4 gtm-apply snapshot prints a canonical snapshot: entity collections sorted by name (destinations by id, gtag configs by id), keys in a stable order, so two snapshots of an unchanged container differ only in pulledAt
- [ ] #5 Unit tests cover each sort rule, idempotence, the list-parameter exception and the by-key comparison; the gtm-apply README documents canonical form
<!-- AC:END -->
