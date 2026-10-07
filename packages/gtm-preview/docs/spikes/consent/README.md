# Spike: automate the cookie banner so a session reflects a consenting visitor (2026-09-19)

`autoconsent-optin.ts` loads a site with the container's debug build, injects DuckDuckGo's
autoconsent content script after navigation commits, answers its `init` message with
`autoAction: "optIn"` and the full rule set, and prints GTM's `CONSENT_STATE` records and the
consent flags on every event. Run from the repo root:

```bash
CONSENT=optIn SITE=https://example.com/ GTM_ID=GTM-XXXXXXX GTM_AUTH=<live code> pnpm tsx docs/spikes/consent/autoconsent-optin.ts
```

Omit `CONSENT` to see the same page without automation. Hits are aborted in both modes.

Result on www.drsamanthamunson.com (Squarespace banner wired to Consent Mode): autoconsent
reported `cmpDetected`, `popupFound`, `optInResult=true`, and `autoconsentDone` for the
`squarespace-cookie-banner` rule. GTM then recorded the accept click as a `gtm.click` event
and a `CONSENT_STATE` record with `command: "update"` granting analytics, ad storage, and ad
user data. Not production code.
