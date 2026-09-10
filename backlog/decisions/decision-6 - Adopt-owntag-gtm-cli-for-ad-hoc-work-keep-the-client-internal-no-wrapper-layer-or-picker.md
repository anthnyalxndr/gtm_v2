---
id: decision-6
title: >-
  Adopt owntag gtm-cli for ad hoc work; keep the client internal; no wrapper
  layer or picker
date: '2026-09-10 17:06'
status: accepted
---

## Context

A proposal to split `GtmClient` into its own package (`gtm-client`) so other projects could import it, plus a typed-ref `list*` wrapper layer and an interactive `init` picker, was weighed against adopting owntag's `gtm-cli` (MIT, npm `@owntag/gtm-cli`, Deno-built, 54 stars). Checked 2026-09-10: it is a CLI only with no importable library; it has create/update/delete/revert for tags, triggers, variables, plus workspaces, versions, publish, and container management, with JSON output and OAuth or service-account auth. It has no name-based references, no declarative apply, and no documented retry or throttling.

## Decision

Adopt `gtm-cli` as the ad hoc and agent-driven path (discovery, inspection, one-off edits) and reference it in the README. Do not build the typed-ref wrapper layer or the `init` picker; `gtm accounts list` and `gtm containers list` cover discovery. Keep `GtmClient` as an internal module of gtm-apply, not a separate package; it is roughly 300 lines of auth and throttle over the generated client, so there is little to own. Revisit a client package only when a project needs programmatic TypeScript access rather than shell commands. Never shell out to `gtm-cli` from inside gtm-apply; that trades typed responses for JSON parsing and loses retry control.

## Consequences

Less code to maintain. The longevity risk of `gtm-cli` is bounded (MIT, forkable) and confined to the ad hoc path; the repeatable path depends only on Google's generated client. gtm-apply stays focused on reconciliation: idempotency by name, cross-container references, version semantics, throttling.
