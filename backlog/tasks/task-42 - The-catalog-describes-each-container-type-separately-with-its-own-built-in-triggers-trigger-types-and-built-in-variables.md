---
id: TASK-42
title: >-
  The catalog describes each container type separately, with its own built-in
  triggers, trigger types and built-in variables
status: To Do
assignee: []
created_date: '2026-09-28 20:52'
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
- [ ] #1 gtm-model exports a ContainerCatalog interface and one catalog per container type, at least web and server, each with triggers.builtIn, triggers.types and builtInVariables
- [ ] #2 The server catalog maps the display name of every server built-in trigger to its id, including 2147479574, with names read from Template - Server
- [ ] #3 Normalizing a server export names a tag's built-in server trigger instead of failing, and a web-only built-in trigger id in a server export is reported as unknown
- [ ] #4 A spec trigger name resolves against the built-in triggers of its own container type only
- [ ] #5 BUILT_IN_TRIGGERS and BUILT_IN_VARIABLES stay exported as the web entries so existing imports keep working
- [ ] #6 Unit tests cover web and server lookups, the server normalize case and the cross-type rejection; pnpm verify passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
