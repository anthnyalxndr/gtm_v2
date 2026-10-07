# Spike: read GTM's own preview stream headless (2026-09-19)

Loading `gtm.js` with an environment authorization code plus `gtm_debug=x` returns a debug
build of the container. That build pushes structured records into the global array
`window["google.tagmanager.debugui2.queue"]`: `EVENT_STARTED`, `MACRO_RESOLVED` (every
trigger with predicate results and pass/fail), `TAG_STARTED` (execute status and resolved
parameters), `TAG_STATUS`, `TAG_BLOCKED`, `GTAG_HIT`, `CONSENT_STATE`, and others. This is the
feed Tag Assistant renders. No Google login is involved.

When the page carries a debug signal the build pauses at `CONTAINER_STARTING` until
something calls `data.resume()`; without one it runs straight through. The proof of concept
replaces the queue with a recorder that calls `resume()` if it ever arrives and blocks the
`debug/bootstrap` script so no Tag Assistant handshake is attempted.

Run from the repo root so `playwright` resolves:

```bash
GTM_ID=GTM-XXXXXXX GTM_AUTH=<environment authorizationCode> node docs/spikes/debug-queue/run.mjs
```

`shapes.json` holds captured examples of the record shapes. Not production code.
