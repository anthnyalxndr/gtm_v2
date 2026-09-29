---
id: doc-2
title: Plan
type: guide
created_date: '2026-09-24 18:22'
updated_date: '2026-09-29 00:18'
---
Last planning pass: 2026-09-29.

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

The agent works the list in order: implement, open a PR and merge it, then re-plan with this skill when the list is done. Work already sitting in the owner's draft PRs (#19 to #25) and decisions stay with the owner. The previous pass's focus (gtm-model and Template - Server) is finished: TASK-41, 42, 44, 39, 45, 40 and 43 landed, plus TASK-48 from a security finding.

## Next up (in order)

1. **TASK-26.** Apply can reconcile a named workspace and stop before creating a version. The owner chose on 2026-09-28 to make interface edits in named workspaces and push into them (TASK-44), and this is the same idea for any spec: a workspace that survives for review in the Tag Manager interface. It also gives the gtm-as-code loop (TASK-37) its preview step. The acceptance criteria are specific and need no outside access.

2. **TASK-22.** Custom environments are applied from the spec. The CI workflow (TASK-32) needs preview environments, and snapshots already list them. It pairs with TASK-48: its export criterion (no Live, Latest or authorization codes) now has redactSnapshotSecrets to build on.

3. **TASK-21.** Google tag configs are applied from the spec. Snapshots carry gtagConfig but apply never writes it, so a container with one is only partly managed. It shares the plan, execute and normalize plumbing with TASK-22, so it follows it.

4. **TASK-31.** Publish can be followed by a verification step: the live version id check and a user-supplied command such as a gtm_audit run. Low priority, but small and fully specified.

5. **TASK-47, the decision record only.** The manifest's 1024-character limit capped the template libraries during TASK-40. The fix moves per-recipe data out of the manifest, which amends decision-10, so the agent drafts the decision with options and hands it to the owner before any code.

## Human tasks that unblock High-priority work

- The owner reviews and merges the draft chain #19 to #25 (TASK-34, TASK-19, TASK-35, TASK-18, TASK-30, TASK-23, TASK-27), in that order. TASK-35 and TASK-30 unblock TASK-36 (High); TASK-30 also blocks TASK-46. The engine tasks above touch the same files (cli.ts, plan, execute), so the chain will need a rebase; the agent can do it once the owner has reviewed it. TASK-35's rebase must apply redactSnapshotSecrets (see its notes).
- The owner decides TASK-23 (rename identity), drafted in PR #24, and later TASK-47's decision.
- TASK-11 needs the analytics.readonly OAuth scope, which means a new consent in the browser.
- Rotating the exposed Live and Latest authorization codes of Template - Web and Template - Server (TASK-48 notes) changes account settings, so it is the owner's call.

## Blocked High tasks

- TASK-36 waits on TASK-35 and TASK-30, both in draft PRs.
- TASK-46 (Medium) waits on TASK-30 and TASK-11.

## Deliberately not next

- TASK-10 (High): PR #14 implements it but conflicts with main; the owner decides whether it is rebased and merged. No current recipe uses a custom template.
- TASK-16 (High): fixed in substance by PR #15 for web and by TASK-42 for server; a close candidate, not work.
- TASK-11 (Low): needs the owner's OAuth consent for a new scope.

## Housekeeping to resolve at the next pass

- TASK-18, TASK-19, TASK-27, TASK-30 and TASK-34 read To Do on main because their Review status lives on their unmerged PR branches.
- PRs #13, #14 and #16 conflict with main. PR #17 adds the same toRef helper as PR #20.
- TASK-16 can move to Done once the owner agrees.
- Template - Server's latest version is recipes-2026-09-29-copy (version 4, same entities as version 3), left by a probe that Tag Manager would not let us remove.
