# 2. Reimplement GTM preview over Playwright instead of driving Tag Assistant

- **Status:** accepted
- **Date:** 2026-09-18

## Context

The goal is a fully automated GTM preview session: load pages, perform interactions, and
report which dataLayer events happened, which tags fired, and what they sent. Two ways to get
there were on the table.

Driving the real Tag Assistant through Playwright yields GTM's own verdict on tag firing, but
it needs a logged-in Google session, two coordinated tabs joined through `window.opener`, and
scraping a debug pane whose DOM has no stable contract.

Reimplementing the observable parts means loading the draft container through environment
preview parameters, wrapping `dataLayer.push` before page scripts run, capturing tag hits on
the wire, and predicting firings by evaluating the workspace's triggers (from the Tag Manager
API) against the captured events.

## Decision

Build the reimplementation as the product. Keep a Tag Assistant driver only as an optional
oracle harness under `oracle/`, used on demand to measure how often predicted firings match
GTM's real ones. The product never imports the oracle.

## Consequences

- Every layer is ours to extend: reporters, CI gates, container-version diffing, consent
  matrices.
- The product survives a Tag Assistant redesign or shutdown.
- Predicted firings are inferences. Custom JavaScript variables, consent state, and lookup
  tables with side effects can make GTM decide differently. Reports keep predictions and
  observed hits in separate columns and never merge them.
- The oracle harness is the only way to quantify prediction accuracy, so it must be kept
  runnable even though it is allowed to be brittle.
