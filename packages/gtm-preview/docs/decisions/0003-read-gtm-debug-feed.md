# 3. Read GTM's own debug feed instead of predicting tag firing

- **Status:** accepted, amends ADR 0002
- **Date:** 2026-09-19

## Context

ADR 0002 planned to predict which tags should fire by evaluating trigger conditions from
the Tag Manager API against captured dataLayer events, and to keep a brittle Tag Assistant
scraper as an oracle for measuring prediction accuracy.

Research on 2026-09-19 (`docs/research/2026-09-19-gtm-debug-feed.md`) showed that the
container's debug build pushes GTM's real verdict into a global array that we can own from a
Playwright init script. It loads with an environment authorization code and needs no login,
extension, or Tag Assistant tab.

## Decision

The product loads the debug build by rewriting the container request, owns the debug queue,
resumes the container itself, and records the stream. Trigger verdicts, tag execution status,
resolved parameters, and consent state come from those records. Network capture stays as the
independent record of what left the browser.

Prediction from the Tag Manager API and the Tag Assistant scraping oracle are dropped.

Hits are governed by a per-run policy: `dry` aborts every vendor hit in the browser (the
default), `debug` lets hits out with `_dbg=1` appended to GA4 collect requests, `live` lets
them out untouched.

## Consequences

- The verdict column is GTM's, not an inference. The mismatch that matters becomes "GTM says
  this tag succeeded but no hit left the browser" and its inverse.
- The dependency is a versioned data protocol (`version: "2"` for GTM, `"3"` for Google
  tags), not a UI. If Google changes it, the parser changes. If the feed disappears, the
  product degrades to network capture.
- Every run needs an environment authorization code for GTM containers. Google tags need
  none.
- Dry run is the default because the debug build fires real tags into real accounts.
