---
id: TASK-14
title: >-
  Lint flags inline site-specific literals in recipe entities and asks for a
  placeholder constant
status: Done
assignee: []
created_date: '2026-09-11 21:45'
updated_date: '2026-09-11 22:51'
labels:
  - sdk
  - library
dependencies:
  - TASK-12
priority: medium
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A site-specific value that an author types straight into a trigger condition or tag parameter (a page path such as /contact, a URL, a hostname, a CSS selector, a G-/AW-/GTM- id, an email address) transfers to every customer untouched, because only Const variables with placeholder entries are checked. Lint should walk the parameters and conditions of every variable, trigger, tag, client and transformation in the library and report literals that look site-specific, naming the heuristic that matched, so the author hoists the value into a Const with a placeholder entry. Variable references inside a value are ignored; values that match the placeholder pattern, constants that already declare a placeholder entry, and literals listed in the manifest's literals.allow are skipped; literals containing any of the manifest's literals.hosts (the template site's own hostnames) are always reported. This is a heuristic backstop to the structural placeholder rules of TASK-12.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A literal classifier reports url, hostname, path, selector, platformId, email and siteHost matches with unit tests for hits and misses (mailto:, tel:, event names, {{refs}}, placeholders are misses)
- [x] #2 lint() reports each matching literal with the entity, the parameter or condition path, the value and the heuristic, and skips allowlisted literals and constants with a placeholder entry
- [x] #3 The manifest accepts literals.allow and literals.hosts; both READMEs document the rule; pnpm verify passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch feat/task-14-literal-lint, stacked on task-13. pnpm verify green (160 tests). Draft PR opened; owner merges.
<!-- SECTION:NOTES:END -->
