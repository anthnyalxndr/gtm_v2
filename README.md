# gtm workspace

Packages for automating Google Tag Manager, published under the `@anthnyalxndr` scope.

| Package | What it is | Docs |
|---|---|---|
| `@anthnyalxndr/gtm-model` | The shared Tag Manager model: container types, the container spec types and `defineContainer`, the Tag Manager API v2 Discovery types and schema table, and the catalog of built-in variables and triggers. Types and plain data only; nothing in it calls an API. Put anything here that more than one package needs to describe a container. | [packages/gtm-model](packages/gtm-model/README.md) |
| `@anthnyalxndr/gtm-client` | Authenticated, throttled Tag Manager API v2 client. OAuth with a shared credential directory, retry with backoff, typed helpers for accounts and containers, and a `testing` entry with an in-memory fake of the API. Import it into any project that talks to Tag Manager programmatically. | [packages/gtm-client](packages/gtm-client/README.md) |
| `@anthnyalxndr/gtm-apply` | Declarative apply tool and `gtm-apply` CLI. Describe a container in the shape of a GTM export, plan, and reconcile by name. Snapshots, recipe libraries (`GtmSnapshot`), and tracking plans. Depends on `gtm-client` and `gtm-model`, and re-exports the model so existing imports keep working. | [packages/gtm-apply](packages/gtm-apply/README.md) |
| `@anthnyalxndr/gtm-recipes` | Recipe libraries keyed by container type (`recipes.web`, with server to follow): committed snapshots of the template containers as `const` modules, typed for tracking plans. Private. | [packages/gtm-recipes](packages/gtm-recipes/README.md) |
| `@anthnyalxndr/gtm-preview` | Headless GTM preview sessions and `gtm-preview` CLI. Playwright loads a container's debug build against a site, runs a scenario, and reports which dataLayer events happened, which tags GTM says fired, what each sent, and where the two disagree. Exports a file Tag Assistant can import. Depends on `gtm-client` for environment authorization codes. Private. | [packages/gtm-preview](packages/gtm-preview/README.md) |

For ad hoc, one-off work from the terminal, use owntag's [gtm-cli](https://github.com/owntag/gtm-cli) instead of either package. The reasoning behind that and every other structural choice is recorded in [docs/decisions](docs/decisions/).

## Development

```bash
pnpm install
pnpm verify        # build every package in dependency order, typecheck, lint, test
pnpm dev           # runs packages/gtm-apply/example.ts (dry run)
```

Node 22 or later. Pre-commit hooks run prettier, gtm-preview's ESLint on its staged files, and `pnpm verify`; a commit-msg hook enforces Conventional Commits. GitHub Actions runs a secret scan and `pnpm verify` on every pull request. gtm-preview's integration test and its CLI need Chromium (`pnpm --filter @anthnyalxndr/gtm-preview browsers`); nothing in `pnpm verify` does. Work is tracked as GitHub issues through the `gh task` extension (`gh task ready`). The original design record is in `docs/superpowers/plans/2026-09-09-gtm-sdk.md`.

## Publishing

The public packages publish only `dist` and are configured for public npm. From the repo root:

```bash
pnpm -r publish --dry-run
pnpm -r publish
```

Bump versions in each package's `package.json` first. `gtm-apply` depends on `gtm-client` and `gtm-model` with `workspace:^`, which pnpm rewrites to the real version range at publish time, so `gtm-model` must be on npm before a `gtm-apply` release that needs it. `pnpm -r publish` publishes in dependency order.

## License

Apache-2.0
