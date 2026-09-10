---
id: decision-8
title: >-
  Publish gtm-client as its own package from a pnpm workspace (supersedes the
  keep-internal part of decision-6)
date: '2026-09-10 17:16'
status: accepted
---

## Context

Decision-6 kept `GtmClient` as an internal module of gtm-apply and deferred a separate package until a project needed programmatic TypeScript access. The owner then asked for the client to be easily importable into other projects. The idiomatic way to make a Node module importable is a separately published package installed by version range; subpath exports or git-tag installs of a monorepo subdirectory both work but are not what another project expects to `pnpm add`.

## Decision

Convert the repo to a pnpm workspace with two packages. `@anthnyalxndr/gtm-client` holds auth, the shared credential directory, throttle and retry, the raw service, `listAccounts` (a function, no longer a class method), `resolveContainer`, `createContainer`, and a `./testing` subpath exporting the in-memory fake service. `@anthnyalxndr/gtm-apply` depends on it with `workspace:^` and re-exports it; it keeps the workspace, entity, and built-in helpers (idempotency by name is an engine concept), the spec engine, recipes, and the CLI. Both publish only `dist` with `publishConfig.access: public` under the owner's npm scope; publishing itself is done by the owner. GitHub Packages remains a one-line `publishConfig.registry` change if privacy is wanted later. The git-tag install path is dropped since it cannot address a package inside a workspace.

This supersedes the "keep the client internal" part of decision-6. The rest of decision-6 stands: gtm-cli for ad hoc work, no typed-ref wrapper layer, no picker, never shell out to gtm-cli from the engine.

## Consequences

Any project can `pnpm add @anthnyalxndr/gtm-client` and get auth, throttling, typed helpers, and a test fake without the apply engine. Releases now require version bumps in two package.json files and a registry publish; `pnpm -r publish --dry-run` and tarball installs into a scratch project are the pre-publish checks. Checked 2026-09-10: `pnpm -r publish --dry-run` succeeds for both packages, tarballs contain only `dist` and `package.json`, and `workspace:^` is rewritten to `^1.0.0` in the packed manifest. Installing the tarballs into a scratch project was not run in that session and remains the pre-publish check to perform.
