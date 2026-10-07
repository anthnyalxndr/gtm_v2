---
id: decision-3
title: >-
  Plan then execute; implicit creation only for name-only entities; no
  autoCreate
date: '2026-09-10 17:06'
status: accepted
---

## Context

Applying a spec involves references (tags to triggers, entities to folders, `{{ }}` to variables and built-ins) that may or may not exist. An `autoCreate` option was considered. Analysis showed it would gate two things that cannot be created from a reference alone (triggers, variables need types and values), two that should always be created (workspace, folders), and one that should never be implicit (containers).

## Decision

Two phases: `planContainerSpec` reads the target, resolves every reference, and produces operations plus a complete error list; `executePlan` refuses to run while errors exist. No `autoCreate` option. One rule instead: an entity that needs nothing beyond its name (workspace, folder, built-in variable) is created implicitly and marked `(implicit)` in the plan; anything needing a type or value must be in the spec; a reference satisfied by neither the spec nor the container is an error. Containers are only created through the explicit `createContainer()`. The engine owns ordering (folders, variables sorted by reference, triggers, tags); authors never order entities. Names containing `:` are rejected at plan time because the API rejects them.

## Consequences

Dry run is an exact contract: what the plan shows is what apply does. Failures are reported together before any write. Hand-edited exports work regardless of entity order. The option surface stays small.
