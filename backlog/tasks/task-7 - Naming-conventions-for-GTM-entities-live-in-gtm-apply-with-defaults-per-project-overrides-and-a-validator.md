---
id: TASK-7
title: >-
  Naming conventions for GTM entities live in gtm-apply with defaults,
  per-project overrides, and a validator
status: Done
assignee:
  - '@claude'
created_date: '2026-09-11 06:29'
updated_date: '2026-09-11 06:51'
labels:
  - sdk
  - conventions
dependencies:
  - TASK-5
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Recipes, the compile step and audits all depend on naming rules: constants are 'Const - <what>', destination tags carry a family prefix such as 'GA4 - ' or 'Ads - ', triggers are '<kind> - <detail>', the library manifest is 'Library - Manifest', and cross-platform resources follow name templates like 'GTM - ${recipe}'. These rules have to be shared by the library (select, lint) and by gtm_audit (a separate repo that consumes gtm-apply from npm and audits customer containers against a per-container YAML config), so the defaults belong in gtm-apply as data plus a validator, and overrides are supplied by the consumer. Provide a conventions module with a typed default set, a merge for overrides, and a checkNames(spec, conventions) that reports every entity whose name violates its kind's rule.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A NamingConventions type and DEFAULT_CONVENTIONS export cover constants, destination tag prefixes by family, trigger and folder patterns, the manifest name, and external resource name templates
- [x] #2 checkNames(spec, conventions) returns issues with entity kind, name, and the rule violated; it passes on the fixture and on select() output
- [x] #3 GtmLibrary.lint() and the compile step use the conventions in effect; a consumer can pass overrides that merge over the defaults
- [x] #4 README documents the defaults and how gtm_audit or a customer plan overrides them
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add src/spec/conventions.ts: NamingConventions type (constant prefix, destination tag prefixes by family, trigger and folder patterns, manifest name, external resource name templates), DEFAULT_CONVENTIONS, mergeConventions(overrides), and checkNames(spec, conventions) returning SpecIssue[] with kind, name and rule.
2. Wire GtmSnapshot.lint(conventions?) to include naming issues, and let select() accept conventions for future compile use; export from index.ts.
3. Tests against the fixture, the library test template, and violations; README section; commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prefixes are keyed by entity type rather than by kind so html tags and pageview-less triggers such as 'All Pages' can be exempted or renamed per project. Naming lint is opt-in: it runs when the manifest carries a conventions key (even empty) or the constructor passes overrides, so a bare export without a manifest lints clean. The compile step's use of conventions lands with TASK-1's plan compiler, which will run checkNames on its output; select() itself does not rename anything. pnpm verify: 19 + 109 tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added src/spec/conventions.ts (NamingConventions, DEFAULT_CONVENTIONS, mergeConventions, checkNames, externalName), manifest.conventions overrides, GtmSnapshot.conventions/lint/externalNameOf, README section, and tests on the fixture, the library template and violations.
<!-- SECTION:FINAL_SUMMARY:END -->
