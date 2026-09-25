---
id: TASK-34
title: >-
  Specs serialize canonically, so pulling an unchanged container produces no git
  diff
status: Review
assignee:
  - '@claude'
created_date: '2026-09-23 21:28'
updated_date: '2026-09-25 10:02'
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
- [x] #1 stringifySpec returns identical text for two specs that differ only in entity order, top-level parameter or map order, object key order, or trigger-name order, and preserves the order of items inside a list parameter
- [x] #2 gtm-apply normalize and gtm-apply export print canonical output; normalize on its own output prints the same bytes; normalizeExport and GtmSnapshot keep the order the API returned
- [ ] #3 A canonical spec applied to a container whose stored parameters are in a different order plans every entity as unchanged: matches compares arrays of uniquely keyed items by key and every other array positionally, and a live probe against a test container records in the notes whether Tag Manager preserves parameter order
- [x] #4 gtm-apply snapshot prints a canonical snapshot: entity collections sorted by name (destinations by id, gtag configs by id), keys in a stable order, so two snapshots of an unchanged container differ only in pulledAt
- [x] #5 Unit tests cover each sort rule, idempotence, the list-parameter exception and the by-key comparison; the gtm-apply README documents canonical form
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Follow docs/superpowers/plans/2026-09-23-gtm-as-code-foundations.md tasks 1 to 4 and the TASK-34 parts of task 11: 1. matches() compares uniquely keyed arrays by key (entities.ts, entities.test.ts). 2. spec/canonical.ts: compareStrings, canonicalValue, canonicalSpec, stringifySpec with tests. 3. snapshot/canonical.ts: canonicalSnapshot, stringifySnapshot with tests. 4. CLI normalize, export and snapshot print canonical text. 5. README section on canonical form; live probe of parameter order recorded in notes. 6. pnpm verify, draft PR based on main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-25: canonicalSpec/stringifySpec (spec/canonical.ts) and canonicalSnapshot/stringifySnapshot (snapshot/canonical.ts); normalize, export and snapshot print canonical text; matches() compares uniquely keyed arrays by key. 144 gtm-apply tests green. AC #3 code half is done and tested; the live probe of whether Tag Manager preserves parameter order could not run: the OAuth token at ~/.config/gtm-apply/token.json was rejected (invalid_grant). The probe script is packages/gtm-apply/scripts/probe-parameter-order.ts (untracked); after re-authorizing, run pnpm --filter @anthnyalxndr/gtm-apply exec tsx scripts/probe-parameter-order.ts and record the sent/stored lines here.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added spec/canonical.ts (compareStrings, canonicalValue, canonicalSpec, stringifySpec) and snapshot/canonical.ts (canonicalSnapshot, stringifySnapshot), applied at the CLI's normalize, export and snapshot print sites; normalizeExport and GtmSnapshot keep API order. matches() now compares arrays of uniquely keyed items by key so a canonical spec never plans a spurious update. README documents canonical form. Verified with pnpm verify: 19 + 144 + 6 tests green. Left open: the live probe of Tag Manager's parameter order (AC #3 second half) needs a fresh OAuth token; script and command are in the notes.
<!-- SECTION:FINAL_SUMMARY:END -->
