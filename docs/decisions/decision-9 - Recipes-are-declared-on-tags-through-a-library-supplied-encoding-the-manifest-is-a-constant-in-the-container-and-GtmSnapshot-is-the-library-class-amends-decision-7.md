---
id: decision-9
title: >-
  Recipes are declared on tags through a library-supplied encoding, the manifest
  is a constant in the container, and GtmSnapshot is the library class (amends
  decision-7)
date: '2026-09-11 06:47'
status: accepted
---
## Context

Decision-7 made the template container the library and encoded recipe membership three ways at once: folders for primary membership, `#recipe` and `#role` tags in notes for cross-cutting metadata, and `${event}` tokens in names for instantiation. Working through it with the owner (2026-09-10 and 2026-09-11) showed that folders are exclusive and flat, so a shared root such as a Conversion Linker tag cannot belong to two recipes; that tokens are a second templating layer on top of GTM's own constants; and that the encoding choice depends on whether a template container is ever deployed (Additional Tag Metadata ships in the container, notes do not). The owner also wants the whole library state, including which encoding is in use, reflected inside the template container, with the committed file as the source of truth.

## Decision

- Recipe membership is declared only on the entities that fire: tags in every container, plus clients and transformations in server containers. Everything else a recipe needs comes by reference closure (firing and blocking triggers, setup and teardown tags, `{{Name}}` variables recursively, folders, built-ins, and clients bound by a `{{Client Name}} equals X` condition). Folders carry no meaning and `${event}` tokens are dropped; customer values are GTM constants.
- The declaration is read through a `RecipeEncoding` supplied by the library: `recipesOf(entity)` and an optional `strip(entity)`. Two ship in gtm-apply, `notes` (a `recipes: a, b` line) and `metadata` (a key in Additional Tag Metadata, stripped before a tag reaches a customer). Others register by name. No code is ever read out of a container.
- The library declares its encoding, recipe descriptions, tag-type-to-destination overrides and external dependencies in a manifest stored as the Constant variable `Library - Manifest`. It is never referenced by a tag, so it is never selected, and it round-trips through pull and push like any entity.
- `GtmSnapshot` (packages/gtm-apply/src/library/gtm-snapshot.ts) is the class: constructed with a client and a source and pulled with `init()`, or built from committed data with `fromData()`, which gives literal recipe names. The pulled data (`ApiSnapshotData`, every resource the API exposes for a container) are the instance's own members; the recipe index is computed at pull time and written into the file. Apply reads the committed file, never the account; live reads are for `pull` and draft work.
- External dependencies (a Google Ads conversion action, a GA4 key event) are recorded per recipe in the manifest as the constant that carries the identifier plus the platform, resource kind and expected name template. Lint checks the constant is in the recipe. Existence checks against the other platform are deferred until a Google Ads client exists; GA4 can come first since it shares the OAuth flow.

## Consequences

Decision-7's folder and token conventions are withdrawn; its choice of the template container as the library, one committed file per library, and event-centric recipes stands. TASK-1 becomes the content package on top of GtmSnapshot. gtm-apply never imports a content package; the content package depends on gtm-apply and gtm-client. Custom templates remain the first blocker for a real template container.
