---
id: TASK-42
title: >-
  The catalog describes each container type separately, with its own built-in
  triggers, trigger types and built-in variables
status: Done
assignee:
  - '@claude'
created_date: '2026-09-28 20:52'
updated_date: '2026-09-28 21:05'
labels:
  - gtm-model
  - server
dependencies:
  - TASK-41
priority: high
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
spec/catalog.ts keeps one flat map of built-in triggers (web only) and one flat map of built-in variables that mixes web and server entries. A server container fires on built-in trigger id 2147479574, which the map does not know, so pulling a server container that uses it fails with 'Unknown trigger id 2147479574' (found in TASK-40 research). The owner chose composition over inheritance: plain as-const catalog objects per container type (WEB, SERVER) that satisfy one ContainerCatalog interface, each with a triggers member (builtIn names to ids, trigger types) and its built-in variables, with the few shared pieces spread in from small shared objects. normalize, emptyState and anything else that reads the catalog pick the catalog of the spec's container type. Discover the server built-in trigger names from our own container Template - Server (GTM-WMGVDZ5H, containerId 265489931, account 6004731770), never from a client's, per the owned-account rule.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 gtm-model exports a ContainerCatalog interface and one catalog per container type, at least web and server, each with triggers.builtIn, triggers.types and builtInVariables
- [x] #2 The server catalog maps the display name of every server built-in trigger to its id, including 2147479574, with names read from Template - Server
- [x] #3 Normalizing a server export names a tag's built-in server trigger instead of failing, and a web-only built-in trigger id in a server export is reported as unknown
- [x] #4 A spec trigger name resolves against the built-in triggers of its own container type only
- [x] #5 Unit tests cover web and server lookups, the server normalize case and the cross-type rejection; pnpm verify passes
- [x] #6 BUILT_IN_TRIGGERS stays exported as the web built-in triggers and BUILT_IN_VARIABLES as every known built-in variable name, so existing imports behave as before
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. gtm-model catalog.ts: a ContainerCatalog interface (type, triggers.builtIn, triggers.types, builtInVariables) and one as-const catalog per container type, composed from small shared objects (the four utility variables every container has). Web and server are curated from our own templates: built-in variables from the containers where the owner enabled every built-in (GTM-TPLKC7QP: 47, GTM-WMGVDZ5H: 10), trigger types from each container's new-trigger picker, and the server built-in trigger read in Template - Server's tag editor and confirmed with a paused scratch tag (deleted). amp, android and ios are not curated: no built-in triggers, every trigger type, every known variable name.
2. catalogFor(type), and lookups that take an optional container type: builtInTypeForName (no type searches every catalog, as the flat map did), builtInTriggerIdForName and builtInTriggerNameForId (no type means web, since names collide: web and server both call their built-in All Pages).
3. BUILT_IN_TRIGGERS stays the web map. BUILT_IN_VARIABLES stays the flat map of every known name, which is what existing importers get today.
4. gtm-apply: normalizeExport resolves built-in trigger ids against the export's container type; emptyState, loadExistingFromLatestVersion and the plan's error path seed built-in triggers for the target's container type; plan.ts and closure.ts infer built-in variables for the spec's container type.
5. Tests: catalog lookups per type in gtm-model; in gtm-apply, normalize of a server export on 2147479574, rejection of a web-only id in a server export, and applying a server spec whose tag fires on All Pages through the fake.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery, all from containers we own (2026-09-28): server built-in variables are the 10 enabled in Template - Server with every built-in on (Page Location/serverPageLocationUrl is not among them, so it left the catalog); web built-ins are the 47 in Template - Web, which added Analytics Client ID, Session ID and Session Number and moved On-Screen Duration to web. Trigger types come from each container's new-trigger picker: server offers Custom (always), Custom Event and Page View (serverPageview); web offers 16. The server's one built-in trigger is named All Pages in the tag editor's trigger picker, and a paused scratch tag on id 2147479574 (created then deleted) showed as firing on All Pages. AC #5 was replaced: BUILT_IN_VARIABLES keeps every known name rather than only web ones, which is what importers had. Real-data check: snapshotToSpec on the saved reference server snapshot, which failed with Unknown trigger id 2147479574 during TASK-40 research, now names the Conversion Linker's trigger All Pages. pnpm verify: 19 + 18 + 129 + 6.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
gtm-model now describes each container type with its own catalog (ContainerCatalog: triggers.builtIn, triggers.types, builtInVariables), composed from a shared utility-variable piece. Web and server are curated from Template - Web and Template - Server; the server's built-in All Pages (2147479574) is new. gtm-apply resolves built-in triggers and infers built-in variables for the spec's container type in normalize, planning, execution and recipe closures. Verified with unit tests and a real server snapshot that previously failed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
