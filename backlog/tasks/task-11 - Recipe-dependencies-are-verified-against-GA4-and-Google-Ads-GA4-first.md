---
id: TASK-11
title: 'Recipe dependencies are verified against GA4 and Google Ads, GA4 first'
status: To Do
assignee: []
created_date: '2026-09-11 15:27'
labels:
  - sdk
  - verify
dependencies:
  - TASK-8
priority: low
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Manifests record each recipe's external dependencies (constant, platform, resource, name template, pattern). compilePlan checks presence and pattern only. Add opt-in verifiers that check existence on the other platform: GA4 first, because the Admin API uses the same OAuth flow and google-auth-library as the Tag Manager client with one extra scope (key events and custom dimensions for a property found from the measurement id); Google Ads later, because it needs a developer token with basic access, a customer id and its own client library. A verifier takes a dependency and the resolved constant value plus the expected external name and returns found, missing, or unknown; applyPlan reports the results as warnings or errors per an option. Deferred by the owner on 2026-09-11 until a Google Ads client exists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A Verifier interface and a registry keyed by platform exist; compilePlan/applyPlan accept verifiers and report each dependency as found, missing or unverified
- [ ] #2 A GA4 verifier confirms a key event by expected name and a measurement id by property, using the shared credentials with the analytics.readonly scope, and is covered by tests against a fake
- [ ] #3 Google Ads verification is stubbed behind the interface with a clear unverified result and a note on what it needs
<!-- AC:END -->
