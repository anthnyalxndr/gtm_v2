---
id: doc-3
title: Proposal - where per-recipe library data lives (TASK-47)
type: specification
created_date: '2026-09-29 00:31'
updated_date: '2026-09-29 00:31'
---
Status: proposed, waiting for the owner's decision. Once accepted, it becomes a decision record that amends decision-10, and TASK-47 is implemented from it.

## Context

A recipe library keeps each recipe's description, Google Ads dependencies and conflicts in one `Library - Manifest` constant. Tag Manager rejects a constant value longer than 1024 characters. On 2026-09-29 the first Template - Server push failed on it: the server manifest was 1146 characters, and the web manifest had grown to 1069 after adding `google_tag_server`. TASK-40 trimmed descriptions to fit (990 and 1011). A conversion recipe costs about 150 characters, mostly its dependency entry, so the next one or two recipes will not fit. Decision-10 already put recipe membership and placeholders in entity notes, whose limit is 512000 characters (TASK-15).

## Options

1. **Per-recipe data in a recipe root's notes trailer (recommended).** A root that declares a recipe also carries that recipe's data, keyed by recipe name: `{"recipes": ["call_click"], "recipeData": {"call_click": {"description": "...", "dependencies": [...], "conflicts": [...]}}}`. The manifest keeps only library-wide settings: encoding, conventions, destinations and the placeholder pattern. It is the same medium decision-10 chose, the data sits beside the entities it describes, and each recipe has room to grow.
2. **One constant per recipe,** named `Library - Recipe - <name>`. Each recipe gets its own 1024 characters. The template container gains a variable per recipe that no tag references, which clutters the interface, and a large recipe can still hit the limit.
3. **Several manifest constants,** `Library - Manifest 1` to `n`, read as one JSON document. Unlimited size, but the split points are arbitrary and a hand edit in the interface can break the JSON across two variables.
4. **Shorter JSON,** with short keys or dependency defaults. It postpones the limit by a few recipes and makes the manifest harder to read.

## Proposed rules for option 1

- `recipeData` may appear only on a tag, client or transformation that declares the same recipe in `recipes`. Data for a recipe the entity does not declare is a lint finding.
- A recipe's data lives on exactly one of its roots. The same recipe's data on two roots is a lint finding, so there is never a merge rule to learn.
- A recipe with no `recipeData` has no description, dependencies or conflicts. That is valid, as it is today when the manifest has no entry.
- Libraries pulled before the change still load: `GtmSnapshot` reads per-recipe entries from the manifest when no root carries `recipeData`, and lint reports a recipe described in both places. The web and server templates move their data to their roots and are re-pulled.
- `select()` already strips trailers, so customers never receive `recipeData`.

## Consequences

The manifest stops growing with the number of recipes, and the web and server libraries can take the descriptions TASK-40 trimmed back. The committed snapshot's `recipes` index keeps its shape, so tracking plans and recipe code do not change. Reading the data from roots is one more pass over the metadata index `GtmSnapshot` already builds.
