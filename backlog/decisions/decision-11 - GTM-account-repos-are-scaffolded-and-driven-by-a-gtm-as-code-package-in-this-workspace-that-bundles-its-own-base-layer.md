---
id: decision-11
title: >-
  GTM account repos are scaffolded and driven by a gtm-as-code package in this
  workspace that bundles its own base layer
date: '2026-09-23 21:29'
status: accepted
---
## Context

The GTM as code plan (doc-1, 2026-09-17) makes a git repo the source of truth for one or more containers: every change is a pull request, CI plans and publishes, and UI edits are detected. It lists what gtm-apply still lacks (prune, headless auth, a plan against live with a drift exit code, a repo config file, CI templates) but does not say how such a repo comes into being or how it stays current as standards change.

On 2026-09-23 the owner asked how a repo representing a GTM account would be initialized and maintained. Three shapes were weighed:

1. A copier type in `anthnyalxndr/copier-templates` for the shell, then a gtm-apply command for the import. Copier cannot call the API, so the repo is not usable until a second tool runs, and `copier update` would re-run on a repo whose content must never be re-imported. It also puts `uvx` on the path of anyone running the init, which a client engineer with only Node will not have.
2. A TypeScript CLI that shells out to copier for the shell and then imports. One source of truth for the base layer, but the same `uvx` requirement.
3. A TypeScript package that owns the whole account-repo workflow: init (shell plus import in one command), pull, diff, plan, apply, publish, and update. The base layer (hooks, prettier, scripts, CI workflows) is bundled inside the package.

The owner chose the third and asked whether it should live in this workspace or a separate repo.

## Decision

- A fourth workspace package, `packages/gtm-as-code` (`@anthnyalxndr/gtm-as-code`, bin `gtm`), owns the multi-container repo workflow. gtm-apply stays the single-container engine (spec, plan, apply, snapshot, pull); gtm-as-code loops it over a repo config file and owns the scaffold. gtm-apply never imports gtm-as-code.
- It lives in this workspace, not a separate repo. Its first tasks change gtm-apply and gtm-as-code together (canonical serialization, a directory-writing pull, the unmanaged-entity report), which is one branch under `workspace:^` linking and would be a publish-bump-PR cycle per change across two repos. The workspace already has the hooks, verify, and publish flow. A move out later is mechanical; a move in after divergence is not.
- The base layer is bundled under the package's `templates/` directory as plain files, not fetched from or delegated to copier-templates. `gtm init` writes it; `gtm update` rewrites it from the installed package. A test in the package pins copies of the copier base's equivalent files and fails when the bundled ones diverge, so standard changes propagate by hand and visibly.
- An account repo holds one directory per container under `gtm/containers/<publicId>/`: `spec.json` (canonical, the apply-able part, the authority for what it declares), `snapshot.json` (everything the API exposes, an audit record, never the authority), `container.json` (identity and the version read), and optionally `plan.ts` (a tracking plan against the recipe library) and `custom.ts` (bespoke entities), merged with `mergeSpecs` into the desired state. The repo config file is the one TASK-30 defines.
- Init is a CLI command run through `pnpm dlx @anthnyalxndr/gtm-as-code init`, not a `create-*` package. pnpm's `create` shorthand resolves a package named `create-<name>`, not a bin, so a `pnpm create` entry point would need a second package; that is a later shim if wanted.
- Two loops keep the repo and GTM aligned. Forward: a merged PR becomes a GTM version through apply; publish is a separate, gated step. Reverse: a scheduled pull diffs against the committed specs and opens a drift PR, so UI edits are either accepted into the spec or reverted by re-applying.

## Consequences

The workspace gains a package whose tests write temp directories and run git; verify gets slower. Canonical serialization changes what `normalize` and `export` print (order only) and requires `matches()` to compare keyed parameter arrays by key, which is a behavior change in the planner that a test must pin. TASK-30's config file is now written by init and read by the loop commands, so its shape is shared by two packages. TASK-32's CI templates become files the package bundles. The design record is `docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md`; the tasks are TASK-34 through TASK-38 in milestone m-0.
