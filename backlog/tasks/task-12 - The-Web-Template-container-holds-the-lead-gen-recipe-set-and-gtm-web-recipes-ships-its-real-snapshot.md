---
id: TASK-12
title: >-
  The Web Template container holds the lead-gen recipe set and gtm-web-recipes
  ships its real snapshot
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-11 16:12'
updated_date: '2026-09-11 22:53'
labels:
  - recipes
  - library
dependencies:
  - TASK-1
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The library behind @anthnyalxndr/gtm-web-recipes is still the in-code sample. Discovery across client work (Grow True Psychology, SJ Pools, Vaco, DeepScribe, gtm_audit, ga4-audit) found one recurring lead-gen set: a Google tag, contact form submit, call click, email click and maps click, each as GA4 event plus Google Ads conversion on one trigger with Const variables for customer values. This task writes that set as a ContainerSpec, pushes it to the Web Template container (GTM-TPLKC7QP) as a workspace and version without publishing, and pulls it so src/library.ts is the real library. The Google tag fires on the built-in Initialization trigger, which the engine cannot name yet, so built-in triggers become resolvable by name.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 scripts/template.ts defines recipes google_tag, contact_form_submit, call_click, email_click and maps_click with the metadata encoding, a Library - Manifest with descriptions and Google Ads dependencies, and DEFAULT_CONVENTIONS names
- [x] #2 The spec has no Conversion Linker; the Google tag's notes say why and link to Google's documentation
- [x] #3 Tags can fire on the built-in triggers All Pages, Initialization - All Pages and Consent Initialization - All Pages by name; pull, push, closure and lint handle them without a spec trigger
- [x] #4 The template is pushed to GTM-TPLKC7QP as a new workspace and version, nothing is published, and pnpm pull writes src/library.ts from the real container with no lint findings
- [x] #5 plan.example.ts, README and tests reflect the real recipe and constant names; pnpm verify passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. gtm-apply: BUILT_IN_TRIGGERS (All Pages 2147479553, Initialization - All Pages 2857720, Consent Initialization - All Pages 2857719) in spec/catalog.ts; normalizeExport maps those ids to names; planContainerSpec seeds existing triggers with them so a tag can name one without a spec trigger; tests for normalize, plan+execute round trip, and lint; README note under The spec.
2. gtm-web-recipes: scripts/template.ts replaces sample-template.ts with recipes google_tag (googtag on Initialization - All Pages, notes citing Google's Conversion linker help), contact_form_submit (Custom Event - contact_form_submit with form_* DLV params), call_click (Click - call, Click URL contains tel:), email_click (Click - email, mailto:), maps_click (Click - maps); each conversion as GA4 - <recipe> gaawe plus Ads - <recipe> awct with enableConversionLinker; constants Const - GA4 Measurement ID, Const - Google Ads Conversion ID (bare numeric, pattern-checked), Const - Google Ads - <recipe> Conversion Label; manifest with descriptions, googleAds conversionAction and conversionTrackingId dependencies, ga4 keyEvent dependencies. scripts/sample.ts reads template.ts; new scripts/push.ts stages the template onto a pull of GTM-TPLKC7QP and calls GtmSnapshot.push (workspace + version, no publish, --dry-run supported). plan.example.ts, README, tests updated.
3. pnpm verify, commit on the feature branch.
4. With the owner's go-ahead: pnpm push, pnpm pull, commit src/library.ts, open a PR (no merge).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Commit 1ad3fce on claude/gtm-web-template-recipes-67d901: scripts/template.ts, scripts/push.ts, built-in trigger mapping in gtm-apply (catalog, normalize, emptyState), tests, READMEs. pnpm verify: 19 + 125 + 5 tests. pnpm push --dry-run against GTM-TPLKC7QP plans 10 variables, 4 triggers, 9 tags, 3 built-ins, one version; awaiting the owner's go-ahead for the real push.

Live push to GTM-TPLKC7QP surfaced three API facts now encoded: (1) a constant value is capped at 1024 chars, so the manifest carries one dependency per recipe (its Google Ads conversion action) and short descriptions, 934 chars; the bare conversion-id note lives on the constant itself. (2) built-in trigger ids are All Pages 2147479553, Consent Initialization 2147479572, Initialization 2147479573 (verified against a real export; my first guesses were wrong). (3) Tag Manager allows 30 writes/min/user, so push throttles at 2.5s/request. Pushed version 2 (unpublished); pnpm pull wrote src/library.ts from the real container; pnpm verify green (19+125+5).
<!-- SECTION:NOTES:END -->
