---
id: doc-1
title: GTM as code plan
type: specification
created_date: '2026-09-17 15:55'
updated_date: '2026-09-17 16:10'
tags:
  - gtm-as-code
  - plan
---
# GTM as code plan

Written 2026-09-17 after snapshotting the Vaco account with `gtm-apply`. The goal is that a git repo is the source of truth for one or more GTM containers: every change is a pull request, CI plans and publishes, and edits made in the GTM UI are detected and either reverted or imported.

## What exists today

`gtm-apply` already covers most of the write path: a normalized spec in the container export shape (decision-2), plan then execute with an exact dry run (decision-3), name identity, folders, variables, triggers, tags, clients, transformations, enabling built-in variables, versioning and publishing, and snapshots of everything the API exposes (TASK-4). `gtm-client` authenticates with a user OAuth token obtained in a browser.

## What is missing, and why each piece matters

Each row is a task in the "GTM as code" milestone (m-0). Dependencies point at the task that must finish first.

| Task | Why | Depends on |
| --- | --- | --- |
| TASK-10 Custom and community templates round-trip through snapshots, libraries and apply | Templates are carried in snapshots but not written, and `cvt_*` tags are rejected at normalize. Any container that uses a gallery or custom template cannot be fully managed from git. | none |
| TASK-21 Google tag configs are applied from the spec | Same gap for `gtagConfig`. These carry the GA4 and Ads tag settings. | none |
| TASK-22 Custom environments are applied from the spec | Environments are container level, not workspace level, and are needed for preview URLs and staged rollouts. Live and Latest are built in and excluded. | none |
| TASK-23 Decision: how an entity is renamed or mutated in place | Names are identity today, so a rename plans as delete plus create and breaks references. The tool needs an identity that survives a rename without a state file, or a deliberate choice to add one. | none |
| TASK-24 Entities can be renamed in place from the spec | Implements the decision. | the decision |
| TASK-25 Apply can prune entities that are not in the spec | Without prune, a deletion in git never reaches GTM, so git is a mirror, not the source of truth. Also disables built-in variables not in the spec. Must know every entity type first, and must not mistake a rename for a delete plus create. | TASK-10 templates, gtag configs, environments, rename |
| TASK-26 Apply can write a workspace and stop before versioning | Apply always creates a version, which deletes the workspace, so a reviewer cannot open a PR in the GTM UI. | none |
| TASK-27 gtm-client authenticates headlessly for CI | The browser OAuth flow cannot run in CI. A service account added as a GTM user, or a refresh token from an env var, is needed. | none |
| TASK-28 A plan can be produced against the live version as machine-readable output | Drift detection and PR comments need a plan as JSON with a stable exit code, computed against what is published rather than a workspace. Extras in the container are part of drift, which is the prune planner. | prune |
| TASK-29 Policy rules are evaluated on a plan | Flags the changes that matter: new custom HTML or image tags, changed conversion or measurement ids, new external domains, triggers widened to All Pages, removals. Same rules serve PR review and drift alerts. | machine-readable plan |
| TASK-30 A repo config file maps environments to containers | CI needs to know which container is staging and which is prod without flags on every command. | none |
| TASK-31 Publish can be followed by a verification step | Publishing does not prove tags fire. A post-publish check closes the loop. | none |
| TASK-32 The repo ships the GTM as code workflow | Docs and CI templates that tie the pieces together: permission model, PR plan comment and preview workspace, publish on merge with the commit as version name, scheduled drift check and reconcile PR, rollback and break-glass. | headless auth, preview workspace, prune, plan output, policy rules, repo config, post-publish verification |

## Left out on purpose

Zones are a Tag Manager 360 feature, so they are not applied. Enabling built-in variables already works; only disabling is missing and belongs to prune. Server containers already follow the same flow (TASK-6). Multi-container and account snapshots are TASK-19 and the serving-environment fix is TASK-18; both help the drift job but nothing here depends on them.

## Suggested order

1. Headless auth, preview workspace, and repo config have no dependencies and unblock a first CI pipeline that plans on PRs and publishes on merge, even before prune exists.
2. The identity decision, then rename, in parallel with templates, gtag configs, and environments.
3. Prune, then machine-readable plan, then policy rules.
4. Post-publish verification at any point.
5. The workflow task last, once every piece it documents exists.

## The workflow the last task documents

Permissions: humans hold Read on managed containers, the deploy identity alone holds Publish, and account admins accept that they can bypass this and rely on drift detection instead. On pull request: plan against the live version, post the plan and policy hits as a PR comment, and write the change to a workspace named after the PR so a reviewer can preview it in the UI. On merge to main: apply and publish with the commit subject as the version name, inside a concurrency group so two merges cannot race. On a schedule: plan against live for every managed container; on drift, either open a reconcile PR from `export --live` or re-apply main, per repo config. Rollback is a git revert and redeploy, with GTM version history as the safety net. Break-glass edits in the UI are imported by the reconcile PR.
