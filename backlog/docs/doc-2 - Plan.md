---
id: doc-2
title: Plan
type: guide
created_date: '2026-09-24 18:22'
updated_date: '2026-09-29 00:33'
---
Last planning pass: 2026-09-29.

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

The agent works the list in order: implement, open a PR and merge it, then re-plan with this skill when the list is done. Work already sitting in the owner's draft PRs (#19 to #25) and decisions stay with the owner. The previous list (TASK-26, TASK-22, TASK-21, TASK-31, and a decision draft for TASK-47) is finished.

## Next up (in order)

Nothing is ready for the agent. Every task in the ready set waits on the owner (below). The first action that frees agent work is the owner's review of the draft chain; after it merges, TASK-36 (High) becomes ready, then TASK-37 and TASK-46.

## Human tasks that unblock High-priority work

- Review and merge the draft chain #19 to #25 (TASK-34, TASK-19, TASK-35, TASK-18, TASK-30, TASK-23, TASK-27), in that order. The chain predates TASK-41 to TASK-48 and will conflict with main; the agent can bring each branch up to date once the owner has reviewed it. TASK-35's branch must apply redactSnapshotSecrets when it writes snapshot.json (its notes say so). Merging TASK-35 and TASK-30 unblocks TASK-36 (High).
- Decide TASK-47 from the proposal in doc-3 (per-recipe data in a recipe root's notes trailer, recommended over three alternatives).
- Decide TASK-23 (rename identity), drafted in PR #24.
- Consent to the analytics.readonly OAuth scope for TASK-11, or say not to add it yet. Adding a scope means every machine and CI job re-authorizes.
- Rotate the Live and Latest authorization codes of Template - Web and Template - Server that are in public history (TASK-48), or accept them as placeholder-only.
- Decide whether PR #14 (TASK-10, custom templates) is rebased and merged, and whether TASK-16 closes.

## Blocked High tasks

- TASK-36 waits on TASK-35 and TASK-30, both in the draft chain.

## Deliberately not next

- TASK-11 code without the scope: the verifier could be written against a fake, but its point is the live GA4 check, and adding the scope to the shared credentials affects every user of the client.
- Updating the draft chain's branches before the owner reviews them: it would rewrite work the owner has not seen.

## Housekeeping to resolve at the next pass

- TASK-18, TASK-19, TASK-27, TASK-30 and TASK-34 read To Do on main because their Review status lives on their unmerged PR branches.
- PRs #13, #14 and #16 conflict with main. PR #17 adds the same toRef helper as PR #20.
- Template - Server's latest version is recipes-2026-09-29-copy (version 4, same entities as version 3), left by a probe that Tag Manager would not let us remove.
- gtm-model 0.1.0 is not on npm yet; the next gtm-apply release needs it published first.
