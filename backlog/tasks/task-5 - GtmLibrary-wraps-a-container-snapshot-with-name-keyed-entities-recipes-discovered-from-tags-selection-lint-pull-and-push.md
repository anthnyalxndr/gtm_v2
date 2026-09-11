---
id: TASK-5
title: >-
  GtmLibrary wraps a container snapshot with name-keyed entities, recipes
  discovered from tags, selection, lint, pull and push
status: Done
assignee:
  - '@claude'
created_date: '2026-09-11 06:29'
updated_date: '2026-09-11 06:47'
labels:
  - sdk
  - library
dependencies:
  - TASK-4
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The library is a template container that a content package pulls into a committed snapshot. GtmLibrary is the class over that snapshot: constructed with a GtmClient and the ids that locate the library (container public id, optional workspace or version), init() pulls the snapshot through pullSnapshot; fromSnapshot(data) builds the same object from the committed file without a client. The instance exposes ReadonlyMap members per entity kind keyed by name (tags, triggers, variables, folders, clients, transformations, templates, gtagConfigs, zones) plus builtIns, and recipes. Recipes are declared only on tags through a pluggable RecipeEncoding (recipesOf(tag), optional strip(tag)) with two built-ins: notes (a 'recipes: a, b' line) and metadata (a key in monitoringMetadata). Each recipe's entity set is the reference closure from its tags: firing and blocking triggers, setup and teardown tags, {{Name}} variable references recursively through parameters and format values, parent folders, built-ins by catalog lookup. A manifest lives in the container as a Constant variable named 'Library - Manifest' holding JSON: the encoding name and options, recipe descriptions, and per-recipe external dependencies (platform, resource, constant, name template). select(recipes, {destinations}) returns a ContainerSpec of the union of closures, filtering destination tags by tag type family; lint() reports tags naming recipes absent from the manifest, manifest recipes with no tags or no reachable trigger, and dependencies naming constants outside the closure; push(client, target) applies the snapshot back to the template container. The generic parameter carries literal recipe and entity names when the snapshot module is emitted as const. Supersedes the folder and token parts of decision 7.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 new GtmLibrary(client, { container, workspace? }) then await init() yields the same instance shape as GtmLibrary.fromSnapshot(snapshot), and fromSnapshot needs no client
- [x] #2 Per-kind ReadonlyMap members are keyed by name and recipes maps each recipe name to its description, root tags, and entity references (kind plus name) computed by reference closure with a visited set
- [x] #3 The notes and metadata encodings both parse 'a, b' lists; the metadata encoding's strip removes its key from monitoringMetadata and is applied to tags in select() but never in push()
- [x] #4 The manifest constant is read from the snapshot, drives the encoding choice, and is excluded from select() output; a snapshot without a manifest falls back to the notes encoding with no descriptions
- [x] #5 lint() reports unknown recipe names, recipes without tags or a reachable trigger, and dependencies whose constant is not in the recipe's closure, each with entity name and path
- [x] #6 select() output passes validateSpec and applies through applySpec against the fake; a destinations filter keeps only tags whose type maps to an enabled family (gaawe to ga4, awct to googleAds, googtag to googleTag) plus everything they reach
- [x] #7 A snapshot module emitted as const gives literal types for recipe names so a typo in select() is a compile error (covered by a type-level test)
- [x] #8 README documents the encoding interface, the manifest shape, and the pull-to-push round trip
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Renamed per the owner's request during implementation: the class is GtmSnapshot (src/library/gtm-snapshot.ts), the raw pull result is ApiSnapshotData, and the committed file shape is GtmSnapshotData. The pulled data are own members of the instance (container, containerType, workspace, environment, environments, destinations, containerVersionHeader, gtagConfig, customTemplate, client, transformation, zone, and the entity arrays); JSON.stringify(instance) writes the file, and toJSON() returns the data only. Constructor: new GtmSnapshot(client, source) then init(); GtmSnapshot.fromData(data) needs no client and infers literal recipe names with a const type parameter. Recipes live in a recipes array (serializable); recipe(name) and recipeNames read the index. The RecipeEncoding object is exposed as recipeEncoding because the data field encoding holds the manifest's {name, options}. Declarations are accepted on tags, clients and transformations (server containers have no tag that references a client); server triggers reach clients through a {{Client Name}} equals X condition edge in the closure. Decision-9 records the amendments to decision-7. pnpm verify: 19 + 104 tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added GtmSnapshot with pull/init, fromData, name-keyed maps, a recipe index by declaration plus reference closure, two encodings (notes, metadata with strip), the Library - Manifest constant, select with destination families, lint, push, and literal recipe-name typing. README documents encodings, the manifest, and the round trip. Verified with pnpm verify (123 tests) including a server-container library.
<!-- SECTION:FINAL_SUMMARY:END -->
