---
id: TASK-17
title: >-
  The Web Template container holds the lead-gen recipe set and gtm-web-recipes
  ships its real snapshot
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-11 23:11'
updated_date: '2026-09-11 23:11'
labels:
  - recipes
  - library
dependencies:
  - TASK-1
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The library behind @anthnyalxndr/gtm-web-recipes was still the in-code sample. Discovery across client work (Grow True Psychology, SJ Pools, Vaco, DeepScribe, gtm_audit, ga4-audit) found one recurring lead-gen set: a Google tag, contact form submit, call click, email click and maps click, each as a GA4 event plus a Google Ads conversion on one trigger with Const variables for customer values. This task writes that set as a ContainerSpec, pushes it to the Web Template container (GTM-TPLKC7QP) as a workspace and version without publishing, and pulls it so src/library.ts is the real library. The Google tag fires on the built-in Initialization trigger, so built-in triggers become resolvable by name. Renumbered from a colliding task-12 after decision-10 (notes-trailer metadata) landed on main.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 scripts/template.ts defines recipes google_tag, contact_form_submit, call_click, email_click and maps_click, declaring membership in notes trailers (decision-10) with a Library - Manifest of descriptions and per-recipe Google Ads conversion-action dependencies, placeholder metadata on constants, and DEFAULT_CONVENTIONS names
- [x] #2 The spec has no Conversion Linker; the Google tag's notes say why and link to Google's documentation
- [x] #3 Tags can fire on the built-in triggers All Pages, Initialization - All Pages and Consent Initialization - All Pages by name; pull, push, closure and lint handle them without a spec trigger
- [ ] #4 The template is pushed to GTM-TPLKC7QP as a new workspace and version, nothing is published, and pnpm pull writes src/library.ts from the real container with no lint findings
- [x] #5 plan.example.ts, README and tests reflect the real recipe and constant names; pnpm verify passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. gtm-apply: BUILT_IN_TRIGGERS in spec/catalog.ts (All Pages 2147479553, Consent Initialization 2147479572, Initialization 2147479573); normalize maps ids to names; emptyState seeds them so a tag names one without a spec trigger. 2. gtm-web-recipes scripts/template.ts: the five recipes, membership + placeholders in notes trailers (decision-10), lean Library - Manifest, no Conversion Linker. scripts/push.ts throttled (30/min). 3. Push GTM-TPLKC7QP (workspace+version, no publish), pnpm pull writes src/library.ts. 4. Open PR (no merge). 5. Merge main (decision-10): converted the recipe encoding from Additional Tag Metadata to notes trailers; re-push + re-pull to restore the real library under the new encoding.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Merged origin/main (PR #9, decision-10) into the branch. decision-10 removed the Additional Tag Metadata encoding this task used and made the JSON-trailer-in-notes encoding the only built-in and default. Converted scripts/template.ts to declare recipes via formatNotes(text,{recipes}) and placeholders via {placeholder} on constants (this restores the bare-conversion-id format check off the manifest's 1024-char budget). Rewrote the package test and README, deleted the old sample-template.ts, fixed the built-in-trigger test in gtm-apply to use notes. pnpm verify green: 19 + 133 + 6. Pending (AC #4): the pushed container is still version 2 under the old encoding and src/library.ts is currently the offline sample; a re-push under the notes encoding + re-pull will restore the real library. Renumbered from task-12 to avoid the id collision with main's task-12.
<!-- SECTION:NOTES:END -->
