# Oracle harness

Drives the real Tag Assistant (tagassistant.google.com) through Playwright, runs a scenario,
and scrapes GTM's own verdict on which tags fired. Its output uses the same `SessionReport`
shape as the product so the two can be diffed.

Rules:

- Nothing under `src/` may import from here. The product must keep working if this directory
  is deleted.
- This harness is allowed to be brittle. Tag Assistant's debug pane has no stable DOM contract.
- Run it on demand to measure how often the product's predicted firings match the real ones.
  Do not run it in CI.
- It needs a logged-in Google session. Use a persistent browser profile outside the repo.
