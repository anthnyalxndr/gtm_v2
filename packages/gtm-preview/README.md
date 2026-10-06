# GTM Preview

Automated Google Tag Manager preview sessions over Playwright: capture dataLayer events and tag hits, predict what should have fired, and report mismatches.

## Quickstart

```bash
pnpm install
pnpm browsers          # one-time Chromium download
pnpm dev help
pnpm dev run scenarios/<name>.json --out report.json
```

The product reimplements GTM preview over Playwright rather than driving Tag Assistant. See
[docs/decisions/0002](./docs/decisions/0002-reimplement-preview-over-playwright.md) for why,
and [AGENTS.md](./AGENTS.md) for how the pieces fit.

## Commands

See [AGENTS.md](./AGENTS.md#commands) for the full command cheat-sheet, the SDLC
working agreements, and the suggested agent workflow loop.

## Conventions

- **Conventional Commits** (no `Co-Authored-By`), trunk-based branching.
- Tests ship with every change. Local hooks run at `standard` strictness.

## Template

Scaffolded from [`anthnyalxndr/copier-templates`](https://github.com/anthnyalxndr/copier-templates).
Pull future template improvements into this repo with:

```bash
uvx copier update
```
