---
id: decision-5
title: 'Name the tool gtm-apply; it is an apply tool, not an SDK'
date: '2026-09-10 17:06'
status: accepted
---

## Context

The package was named `@anthnyalxndr/gtm-sdk`. Google's generated client is the SDK for Tag Manager. What this package adds is a thin wrapper (typed refs, path building, throttle, unwrapping) plus a declarative apply engine. "SDK" put it in the wrong category; "client library wrapper" undersold the engine, which is the product.

## Decision

Name the package and binary `gtm-apply`, after the verb users type. Keep "spec" as the name of the file format. Credentials live in `~/.config/gtm-apply`, override `GTM_APPLY_CONFIG_DIR`. Verbs signal semantics: passthroughs keep API verbs (`list`, `get`, `create`, `publish`); anything that changes semantics uses a different verb (`resolve`, `ensure`, `apply`, `plan`).

## Consequences

Renamed before any tag or publish, so nothing was ever installed under the old name. The plan document keeps its original filename because the backlog references it by path.
