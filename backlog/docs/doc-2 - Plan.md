---
id: doc-2
title: Plan
type: guide
created_date: '2026-09-24 18:22'
updated_date: '2026-09-28 20:54'
---
Last planning pass: 2026-09-28.

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

Focus on the shared model and the server template the owner approved on 2026-09-28. Build the gtm-model package first, then the per-container catalog, then the push into an existing workspace, then the combined gtm-recipes package, then Template - Server. Fit TASK-43 (typed specs per container type) and TASK-39 (version description) in where they share code. TASK-46 (paired-container check) waits on TASK-30 and TASK-11. The agent implements, opens a PR and merges each task in turn. Horizon: the next seven or eight PRs.

## Next up (in order)

1. **TASK-41**, per guidance. Every later item imports from the new gtm-model package, so it goes first. The draft chain #19 to #25 still waits on the owner and changes `snapshot/types.ts`, one of the files the model comes from. Keep TASK-41's edits there to the `ContainerType` line and leave re-export files at the old paths in gtm-apply, so the chain rebases with little conflict.

2. **TASK-42**, per guidance. It builds the per-container catalog in gtm-model and adds the server built-in trigger 2147479574. That fixes a reproduced failure: pulling the reference server container fails with "Unknown trigger id 2147479574". TASK-40 needs it for the Conversion Linker. Read the server trigger names from Template - Server (GTM-WMGVDZ5H), which the owner created for this.

3. **TASK-44, then TASK-39.** They share plumbing: both change the recipes push script. Do them as two PRs back to back. TASK-44 first, because Template - Server's Default Workspace holds unversioned built-in variables that a push into a new workspace would leave out. TASK-39 then adds the version description to the same settings. Both land before TASK-45 moves the script, so the move carries the finished version.

4. **TASK-45**, per guidance. It renames gtm-web-recipes to gtm-recipes, with libraries keyed by container type, so TASK-40 has a place for the server library. A push dry run against GTM-TPLKC7QP that reports no changes proves the move changed nothing.

5. **TASK-40**, per guidance. This is the goal of this pass: the server template, the web recipe google_tag_server, the push and pull of both libraries, and the README. Rewrite docs/superpowers/plans/2026-09-28-template-server.md for what is left, and update the task's acceptance criteria to match, before starting.

6. **TASK-43.** It makes a container spec's type decide, at compile time, which entities and built-in trigger names it can hold. It builds on the TASK-42 catalog. It comes after TASK-40 so that the server template is one more real spec its type tests must accept.

## Human tasks that unblock High-priority work

- The owner reviews and merges the draft chain #19 to #25 (TASK-34, TASK-19, TASK-35, TASK-18, TASK-30, TASK-23, TASK-27), in that order. TASK-35 and TASK-30 unblock TASK-36 (High). TASK-30 is also a blocker of TASK-46.
- The owner decides TASK-23 (how a rename is told from a delete plus create), drafted in PR #24. It heads the chain TASK-24, TASK-25, TASK-28, TASK-29.

## Blocked High tasks

- TASK-36 waits on TASK-35 and TASK-30, both in draft PRs.
- TASK-42 and TASK-45 wait on TASK-41, and TASK-40 waits on TASK-42, TASK-44 and TASK-45. These are items 1 to 5 above.

## Deliberately not next

- TASK-16 (High): PR #15 fixed it in substance for web containers, and TASK-42 covers the server trigger. It is a close candidate, not work.
- TASK-10 (High): PR #14 implements it but conflicts with main. The owner decides whether to rebase it. None of this pass's recipes use a custom template.
- TASK-46: blocked on TASK-30, TASK-11 and TASK-40.
- TASK-11, TASK-21, TASK-22, TASK-26, TASK-31: outside this pass's focus.

## Housekeeping to resolve at the next pass

- TASK-18, TASK-19, TASK-27, TASK-30 and TASK-34 read To Do on main because their Review status lives on their unmerged PR branches.
- PRs #13, #14 and #16 conflict with main. PR #17 adds the same toRef helper as PR #20.
- TASK-16 can move to Done once the owner agrees PR #15 fixed it.
