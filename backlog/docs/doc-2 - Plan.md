---
id: doc-2
title: Plan
type: guide
created_date: '2026-09-24 18:22'
updated_date: '2026-09-24 18:22'
---
Last planning pass: 2026-09-24.

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

None.

## Next up (in order)

1. **TASK-34, then TASK-19, then TASK-35** (one branch chain, one implementation plan). These three are the import primitive of the GTM as code goal: a canonical spec that diffs only when the container changed, account listing and multi-container pulls, and a `pull` command that writes `spec.json`, `snapshot.json` and `container.json` per container. TASK-34 and TASK-19 are ready with no dependencies; TASK-35 becomes ready when both land. They share plumbing (the CLI's `--account`, `--out` and repeated `--container` flags, the `snapshot/` module, the fake service seeds), so they are one chain of three PRs rather than three unrelated pieces. Every step is written out with tests in `docs/superpowers/plans/2026-09-23-gtm-as-code-foundations.md`, which is why this item is startable today and the others below are not yet at that level. TASK-34 also carries a live probe (does Tag Manager preserve parameter order) whose answer settles a planner behavior.

2. **TASK-18**. A bug reproduced against the live API on 2026-09-17: the built-in Live and Latest environments carry no version id, so a snapshot never knows whether the version it read is the published one. It is small, has no dependencies, and its output is the `environment` field of `container.json` that TASK-35 writes, so landing it before or alongside item 1 keeps that record honest instead of always null. Medium priority in the field, higher in effect.

3. **TASK-30**. The repo config file is the one thing standing between the foundations and TASK-36 (the account-repo init, High). It has no dependencies and the design spec now pins the shape it needs: entries keyed by a slug, each with `publicId`, optional `env` and `dir`, plus defaults for workspace naming and prune. Doing it right after item 1 means TASK-36 is ready the moment TASK-35 merges.

4. **TASK-23**. The identity decision (how a rename is told from a delete plus create) heads the longest chain in the milestone: TASK-24 rename, then TASK-25 prune, then TASK-28 plan against live, then TASK-29 policy, then TASK-32. It is a human decision, not code, so the agent's work is to draft the decision record with the options and trade-offs and hand it to the owner; starting it now means the owner can decide while items 1 to 3 are being built, and nothing in the chain waits on a decision that could have been made earlier.

5. **TASK-27**. Headless authentication is what lets any of this run in CI. It is independent of everything else, High priority, and specified with clear acceptance criteria (service account, Application Default Credentials, a refresh token from the environment, and a non-interactive failure that names the options). It ranks last of the five only because nothing in items 1 to 4 needs CI to be exercised, and its main consumer, TASK-32, is many steps away.

## Human tasks that unblock High-priority work

- Merge the open pull requests, oldest first: #13 (lands TASK-13, 14 and 15 on main), #14 (TASK-10, custom templates, which TASK-25 prune depends on), #16 (TASK-9 change report), #17 (TASK-33, already used by this plan's pull code). #13, #14 and #16 are five commits behind main and may need main merged in first.
- Merge or rebase the branch `chore/gtm-as-code-backlog` onto main. It holds the whole milestone (tasks 18 to 38, decision-11, this Plan) and is seven commits behind main; until it lands, `main` does not know these tasks exist. The agent's allowlist excludes `git merge`, so this is the owner's step.
- Accept or amend decision-11 (the gtm-as-code package, bundled base layer, slug-named directories). Items 1 and 3 above build on it.
- Decide TASK-23 once its decision record is drafted. It gates TASK-24, and through it TASK-25, TASK-28, TASK-29 and TASK-32.
- TASK-17 acceptance criterion 4: push the lead-gen template to the Web Template container GTM-TPLKC7QP as a workspace and version, then run `pnpm pull` so gtm-web-recipes ships the real library. It writes to the owner's template container, so it waits for the owner's go-ahead.

## Blocked High tasks

- TASK-35 waits on TASK-34 and TASK-19 (item 1).
- TASK-36 waits on TASK-35 and TASK-30 (items 1 and 3).
- TASK-24 waits on the TASK-23 decision (item 4).
- TASK-25 waits on TASK-10 (open PR #14), TASK-21, TASK-22 and TASK-24.
- TASK-32 waits on TASK-25, TASK-26, TASK-27, TASK-28, TASK-29, TASK-30, TASK-31 and TASK-36; it is the last task of the milestone by design.

## Deliberately not next

- TASK-10 is ready and High, but its implementation is already on PR #14 awaiting merge; the work left is review, not a fresh task.
- TASK-16 (built-in trigger ids in the normalizer) was fixed in substance by PR #15 on 2026-09-11; its task file only exists on the TASK-9 and TASK-10 branches. Verify against GTM-KK24CHH and close it rather than work it.
- TASK-26 (preview workspace), TASK-21 (gtag configs) and TASK-22 (environments) are ready and medium. They matter for prune and for the PR preview flow, but nothing in items 1 to 5 needs them yet and TASK-25 cannot start until TASK-24 lands anyway.
- TASK-11 and TASK-31 are low priority and gate nothing.

## Housekeeping to resolve at the next pass

- `chore/gtm-as-code-backlog` is seven commits behind main; the task files for TASK-12 and TASK-17 differ between the two, so the merge will need a look at those two files.
- TASK-9 and TASK-10 are `To Do` on this branch while their PRs (#16, #14) are open; they should read `Review`.
- TASK-33 is `Done` on its own branch while PR #17 is still open.
- TASK-17 is `In Progress` on main with only criterion 4 unchecked (see the human tasks above).
- TASK-16 looks done in substance (see above); confirm and mark it, or fold its remaining live-container check into TASK-35's testing.
