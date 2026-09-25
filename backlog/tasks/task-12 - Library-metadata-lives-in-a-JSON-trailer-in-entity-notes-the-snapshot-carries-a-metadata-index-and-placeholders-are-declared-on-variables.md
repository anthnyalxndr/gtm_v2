---
id: TASK-12
title: >-
  Library metadata lives in a JSON trailer in entity notes, the snapshot carries
  a metadata index, and placeholders are declared on variables
status: In Progress
assignee: []
created_date: '2026-09-11 16:06'
updated_date: '2026-09-11 16:16'
labels:
  - sdk
  - library
dependencies:
  - TASK-8
references:
  - backlog/decisions/decision-10
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision-9 split library metadata across two media: recipe membership in a tag's Additional Tag Metadata (web) or a notes line, and nothing at all for variables, which is why there was no place to mark a constant as a placeholder. Decision-10 consolidates on one medium. Every entity kind whose spec carries notes (tag, trigger, variable, client, transformation) may end its notes with a line containing only --- followed by a JSON object; the text above the line is what the customer receives, the JSON below it is library metadata and never reaches a customer container. GtmSnapshot reads every trailer once at pull time into a metadata index keyed by kind:name and writes it into the committed snapshot next to recipes; recipe roots, lint and the customer transform in select() all read from that index instead of re-parsing entities. Variables declare customer inputs with a placeholder entry (kind, description, example, pattern) and lint reconciles it against the value: a placeholder entry with a concrete value, or a placeholder value with no entry, is a finding. The old metadata and line-based notes encodings go away; the registry keeps a single notes encoding as the default so a manifest may still name one. Outcome: one parser, one lint pass, a self-describing template container, and no site-specific value leaking to a customer because an author forgot to blank it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 parseNotes splits an entity's notes into customer text and a metadata object: the trailer is the text after the last line that is exactly ---; a trailer starting with { must parse as a JSON object and is reported when it does not; notes without a trailer yield no metadata. formatNotes is the inverse. Unit tests cover all three cases.
- [x] #2 GtmSnapshotData has a metadata field, a record keyed by kind:name holding every parsed trailer; indexRecipes takes that record; fromData and toJSON round-trip it; staged entity edits re-read it.
- [x] #3 select() returns every entity of every kind with its trailer removed and the customer text (or no notes) in place, and a plan applied to a customer container leaves no --- trailer behind.
- [x] #4 lint() reports an unparsable trailer, a recipes key on a kind that is not a recipe root, a variable with a placeholder entry whose value does not match the placeholder pattern, and a constant whose value matches the placeholder pattern but has no placeholder entry.
- [x] #5 compilePlan includes the placeholder description and example in the needs-a-value message and rejects a supplied value that fails the placeholder's pattern.
- [x] #6 metadataEncoding and the recipes-line notes encoding are removed; notesEncoding reads the JSON trailer; the registry, registerEncoding and resolveEncoding remain with notes as the default.
- [x] #7 gtm-web-recipes' sample template declares recipes and placeholders through notes trailers, src/library.ts is regenerated, and its tests check customer notes reach a customer container without the trailer.
- [x] #8 Both READMEs describe the trailer format, the metadata index and placeholders; pnpm verify passes.
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
See docs/superpowers/plans/2026-09-11-notes-metadata.md: metadata.ts (parseNotes/formatNotes/readMetadata) → encoding.ts (MetadataEncoding, notes only) → GtmSnapshot metadata index, select forCustomer, lint rules → compilePlan placeholder messages and patterns → exports/CLI → test fixtures → gtm-web-recipes sample + regenerate → READMEs → pnpm verify → draft PR.
<!-- SECTION:PLAN:END -->
