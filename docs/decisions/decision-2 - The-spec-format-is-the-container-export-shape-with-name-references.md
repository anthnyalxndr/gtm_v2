---
id: decision-2
title: The spec format is the container export shape with name references
date: '2026-09-10 17:06'
status: accepted
---

## Context

A tool that applies configuration needs an input format. Options were a hand-designed schema, an imperative list of API operations, or the shape the GTM UI already exports. The UI export is the API's `ContainerVersion` resource serialized, so its `tag`, `trigger`, `variable`, `folder`, and `builtInVariable` arrays are what the API accepts on write. An imperative operations list would make every consumer learn GTM's resource shapes and push validation to runtime.

## Decision

The input type `ContainerSpec` is the export shape with three normalizations: server fields removed (`*Id`, `fingerprint`, `path`, `tagManagerUrl`), id references replaced by name references (`firingTriggerName`, `blockingTriggerName`, `parentFolderName`), and enum values in lower camel case. `normalizeExport` performs the conversion and is idempotent. Names are entity identity. Customer-specific values live in GTM constant variables referenced by name, not in a second templating layer. Custom template tags (`cvt_*`) and trigger groups are rejected until supported.

## Consequences

Types come from the generated client. Any entity built once in the GTM UI and exported is a correct fragment with the exact parameter keys the API wants, which removes the biggest source of guesswork. The format interoperates with GTM import and community tools. Verified live on 2026-09-09: lower-camel enums and normalized bodies are accepted on write. The planner compares only fields the spec provides, so stripped fields such as `monitoringMetadata` are not corrected if changed in the UI.
