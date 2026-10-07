---
id: decision-10
title: >-
  Library metadata is a JSON trailer in entity notes, read once into the
  snapshot's metadata index, and placeholders are declared on variables (amends
  decision-9)
date: '2026-09-11 16:06'
status: accepted
---
## Context

Decision-9 let a library choose between two recipe encodings: a `recipes` key in a tag's Additional Tag Metadata (used by gtm-web-recipes) or a `recipes: a, b` line in notes. Only tags carry metadata, so when the owner asked on 2026-09-11 how to mark a constant such as `Const - Contact Page Path` as a site-specific placeholder, there was no field to put it in. The reason for keeping tag metadata (it ships in the container) only matters if a template container is deployed, which never happens. The owner also proposed that the committed snapshot expose the parsed metadata directly, so recipe code reads a document instead of re-parsing entities, and that the notes an author writes for a customer travel with the entity.

## Decision

- One medium: every entity kind whose spec carries notes (tag, trigger, variable, client, transformation; a folder spec is a name only) may end its notes with a line that is exactly `---` followed by a JSON object. The text above the line is the customer-facing note; the JSON below it is library metadata. A trailer that starts with `{` and does not parse is a lint finding; notes with no trailer are ordinary notes.
- Known keys: `recipes` (array of recipe names; only tags, clients and transformations may declare them) and `placeholder` (`kind`, `description`, `example`, `pattern`) on variables. Unknown keys round-trip untouched.
- `GtmSnapshot` parses every trailer once at pull time into a `metadata` index keyed by `kind:name`, written into the committed snapshot beside `recipes`. Recipe roots, lint and the customer transform read the index; staged entity edits re-read it.
- `select()` hands every entity to the customer with its trailer removed and the prose kept as notes, for all kinds, not only recipe roots. `push()` never strips.
- Placeholders stay a property of the value (`<…>` per `placeholderPattern`); the `placeholder` entry documents it. Lint reconciles the two: an entry with a concrete value, or a placeholder value without an entry, is a finding. compilePlan uses the entry's description and example in its message and checks its pattern.
- The tag-metadata encoding and the line-based notes encoding are removed. The encoding registry stays, with the JSON-trailer `notes` encoding as its only built-in and the default, so a manifest may still name an encoding and a package may register another.

## Consequences

Decision-9's choice of encoding per library and its `metadata` encoding are withdrawn; its recipe roots, closure, manifest constant and `GtmSnapshot` stand. The snapshot shape changes (`metadata` added), which is a major version of gtm-apply. The template container becomes readable in the GTM UI, since the customer text comes first and the JSON sits below a delimiter. GTM caps note length at a figure not yet verified; lint should check it once known. A typed-required-constants plan type (constants holding placeholders become required keys) is a natural follow-up.
