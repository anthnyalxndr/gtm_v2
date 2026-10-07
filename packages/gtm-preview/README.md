# GTM Preview

Automated Google Tag Manager preview sessions over Playwright: capture dataLayer events and tag hits, read GTM's own verdict on which tags fired, and report mismatches.

Part of the [gtm workspace](../../README.md). Private; not published to npm.

## Quickstart

From the workspace root:

```bash
pnpm install
pnpm --filter @anthnyalxndr/gtm-preview browsers   # one-time Chromium download
cd packages/gtm-preview
pnpm dev help
pnpm dev run scenarios/<name>.json --out report.json
```

The product reimplements GTM preview over Playwright rather than driving Tag Assistant. See
[docs/decisions/0002](./docs/decisions/0002-reimplement-preview-over-playwright.md) for why,
[docs/decisions/0003](./docs/decisions/0003-read-gtm-debug-feed.md) for how the debug feed is
read, and [AGENTS.md](./AGENTS.md) for how the pieces fit.

## Commands

See [AGENTS.md](./AGENTS.md#commands). Hooks, CI, tasks and the decision log for the move into
the workspace are at the repository root.
