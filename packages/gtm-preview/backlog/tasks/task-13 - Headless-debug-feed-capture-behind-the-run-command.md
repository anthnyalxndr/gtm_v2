---
id: TASK-13
title: Headless debug-feed capture behind the run command
status: Done
assignee: []
created_date: '2026-09-19 16:53'
updated_date: '2026-09-19 19:49'
labels:
  - core
dependencies:
  - TASK-1
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Make the run command do what the spike proved: load a scenario, launch Chromium, rewrite the container request to the debug build using an environment authorization code from an environment variable, own the debug queue and resume the container, apply the hit policy, execute the scenario steps, and write a SessionReport with GTM's own per-event tag verdicts alongside the network hits. This is the first usable version of the product and supersedes the capture-only milestone (tasks 2 to 8), whose acceptance criteria it should satisfy where they still apply. Findings and reproduction scripts: docs/research/2026-09-19-gtm-debug-feed.md, docs/spikes/debug-queue.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A scenario file names startUrl, container id, an environment number, the environment variable holding the authorization code, a hit policy (dry, debug, live; default dry), and ordered steps (navigate, click, fill, scroll, wait, waitForEvent); invalid files are rejected with the offending path
- [x] #2 The container request is rewritten in flight to the debug build; every record the build pushes is captured; CONTAINER_STARTING is resumed by the recorder; debug/bootstrap and debug/badge are aborted
- [x] #3 Hit policy dry aborts vendor hits inside the browser; debug lets them out with _dbg=1 appended to GA4 collect requests; live lets them out untouched; the report records which policy applied and every attempted hit with its outcome
- [x] #4 Raw records are parsed by a pure function into a SessionReport: ordered events, each with the triggers that passed, every tag's execute decision and final status, resolved tag parameters, consent state, and the hits attributed to that event; unit tests use captured record fixtures with the environment code redacted
- [x] #5 pnpm dev run scenarios/example.json --out report.json writes the report and exits 0; a failing step or a 403 on the container request exits non-zero with a one-line reason that never includes the authorization code
- [x] #6 An integration test runs the whole path against a local fixture page loading the test container and is skipped, not failed, when the code environment variable is absent

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Scenario schema and loader (zod), auth code from env var.
2. Pure helpers: container URL rewrite, vendor hit matcher and policy, debug-queue init script source.
3. Playwright session runner: routes, init script, steps, collection, redaction.
4. Pure record parser to SessionReport; JSON writer.
5. CLI run wiring with exit codes.
6. Fixture site and integration test gated on GTM_TEST_AUTH.

<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Implemented on branch feat/debug-feed-capture. src/scenario/schema.ts (zod scenario, code from env var), src/session/preview-url.ts (container request rewrite, redaction), src/session/hit-policy.ts (vendor matcher, dry/debug/live decision, hit parsing), src/session/debug-queue.ts (init script owning the debug queue and wrapping dataLayer.push), src/session/steps.ts, src/session/run-session.ts (Playwright orchestration, 403 detection), src/report/{types,parse-records,write}.ts, CLI in src/index.ts. 42 unit tests plus 2 integration tests gated on GTM_AUTH_WNX8FFXW, all passing. Finding during implementation: the debug build only pauses on CONTAINER_STARTING when the page carries a debug signal; with the signal only on the container request it runs immediately and still emits, so debugBuildLoaded is detected from EVENT_STARTED records. Docs corrected.
<!-- SECTION:FINAL_SUMMARY:END -->
