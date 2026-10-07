---
id: decision-7
title: The template container is the library; one library.json; event-centric recipes
date: '2026-09-10 17:06'
status: proposed
---

## Context

Recipes were first written as TypeScript generators with hand-written tag bodies and guessed parameter keys, one recipe per destination with the trigger repeated inside each. A tracking plan is naturally events by destinations. GTM has no labels; it has one flat folder per entity, a free-text notes field on tags, triggers, and variables, and names. Live check on 2026-09-09: folder membership is readable via `parentFolderId`, notes accept `#` and `:`, names reject `:`.

## Decision

The library is a dedicated template container (`Web Template`, GTM-TPLKC7QP) edited in the UI, pulled with `gtm-apply export` into a single committed `library.json` (the normalized export plus a source header), and vendored into the package at release time; customer runs never read the template live. Fragments are selections over the library: folder membership plus reference closure. Folders express primary recipe membership; notes carry cross-cutting metadata such as `#recipe:name #role:destination`; names carry `${event}` instance tokens. The recipe unit is the event: one trigger fragment plus a list of destination fragments; customer-wide values are GTM constants supplied by the config. The hand-written generators are deleted when the loader lands (task-1). Manual edits to `library.json` are allowed; `push` (apply to the template) and `pull` reconcile, and the rule is to run one before merging.

## Consequences

Parameter keys come from real exported entities, removing guesswork. Non-technical users can copy the same source through the GTM UI. Package versions pin a library snapshot, so customer behavior changes only on release. Custom template support becomes the first blocker, since a template container will accumulate community templates. Status is proposed until task-1 ships.
