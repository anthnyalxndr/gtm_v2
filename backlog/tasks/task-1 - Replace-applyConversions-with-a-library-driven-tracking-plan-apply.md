---
id: TASK-1
title: Replace applyConversions with a library-driven tracking-plan apply
status: To Do
assignee: []
created_date: '2026-09-09 19:27'
labels:
  - sdk
  - recipes
  - library
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
applyConversions is the leftover of the first plan: destination-centric recipes (ga4-event, google-ads) with hand-written tag bodies, each carrying its own trigger. The design has moved to event-centric recipes sourced from a library exported from the template container (GTM-TPLKC7QP). Replace it with one function that takes a tracking-plan config (constants plus events, each naming a trigger fragment and a list of destination fragments), selects fragments from the library file by folder plus reference closure, substitutes ${event}-style instance tokens and customer constants, merges with mergeSpecs, and applies through applySpec. Delete the hand-written ga4Event and googleAdsConversion generators in the same change so there is one entry point. Keep triggerName/mergeSpecs tests where they carry over. See docs/superpowers/plans/2026-09-09-gtm-sdk.md and the Design notes on library fragments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A tracking-plan config with constants and events (each with a trigger fragment name and destination fragment names) compiles to a ContainerSpec using fragments loaded from a library.json file, selected by folder name plus reference closure (firingTriggerName, {{ }} references, parentFolderName)
- [ ] #2 ${event} tokens in fragment entity names and parameter values are replaced per event, and destination tags are rebound to the event's trigger by name
- [ ] #3 Customer-wide values are supplied as GTM constant variables (Const - ...) from the config's constants map; a constant still holding its placeholder value produces a plan warning
- [ ] #4 Shared entities used by several events (e.g. a Conversion Linker tag, constants) appear once in the compiled spec via mergeSpecs; conflicting definitions of the same name fail with an error
- [ ] #5 applyConversions, ga4Event, and googleAdsConversion are removed from the public exports and source; README and example.ts use the new function
- [ ] #6 Unit tests cover fragment selection, token substitution, trigger rebinding, constant placeholder warning, and an end-to-end apply against the fake service with form_submit, email_click, and call_click events
<!-- AC:END -->
