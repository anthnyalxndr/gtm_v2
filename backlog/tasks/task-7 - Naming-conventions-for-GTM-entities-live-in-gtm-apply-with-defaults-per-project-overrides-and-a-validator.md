---
id: TASK-7
title: >-
  Naming conventions for GTM entities live in gtm-apply with defaults,
  per-project overrides, and a validator
status: To Do
assignee: []
created_date: '2026-09-11 06:29'
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
- [ ] #1 A NamingConventions type and DEFAULT_CONVENTIONS export cover constants, destination tag prefixes by family, trigger and folder patterns, the manifest name, and external resource name templates
- [ ] #2 checkNames(spec, conventions) returns issues with entity kind, name, and the rule violated; it passes on the fixture and on select() output
- [ ] #3 GtmLibrary.lint() and the compile step use the conventions in effect; a consumer can pass overrides that merge over the defaults
- [ ] #4 README documents the defaults and how gtm_audit or a customer plan overrides them
<!-- AC:END -->
