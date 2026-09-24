---
id: doc-1
title: Plan
type: guide
created_date: '2026-09-19 19:03'
updated_date: '2026-09-24 21:12'
---

Last planning pass: 2026-09-24 (fourth pass, after the export comparison produced six subtasks).

Ordering and rationale only; every line points at a task id; rewritten whole at each planning pass via `backlog doc update`, never appended; pick the top item unless it is blocked or in progress; the guidance below stays in force until the user changes it.

## Guidance

None.

## Next up (in order)

1. **task-22.1, render gtag commands and non-event dataLayer pushes as messages.** The most visible thing wrong with the export: a person reading the timeline of the captured contact flow is missing ten of the thirty-three entries a native export shows. It is also the best specified task in the backlog, because every missing message was traced to a record already in our raw session, with the mapping written out. It unblocks task-22.5 and shares the exporter with task-22.2, so doing it first avoids reworking ordering twice.

2. **task-21, run against a Google tag with no GTM container and no credentials.** This is the largest capability gain available and the only ready task that opens a new class of site. A Google tag serves its debug build to anyone, so this mode needs no OAuth, no account access and no environment code, which makes it the easiest possible first run for someone new and lets the tool be pointed at a site before anyone has access to its container. Everything hard is already built and verified; what blocks it is that a scenario must name a GTM container and the runner waits for a request a gtag-only site never makes. It ranks above the remaining export work because that work polishes an artifact that already imports and renders correctly.

3. **task-22.3, report the full consent state on every message.** The largest remaining fidelity root cause after the template definitions. A native export lists seven consent types where this tool lists four and carries `default` and `quiet` flags we omit, and because `tagsFired` embeds a copy of the message a tag fired on, that one difference repeats across hundreds of comparator lines. Its first criterion is to establish where the extra types and flags come from in the feed, which is the honest shape for it: the records may already carry them under a field we ignore.

4. **task-22.6 then task-22.4, the comparator fix and hit descriptors.** One sitting, two commits. The comparator reports every `pageSummaries` and `containerLoadInfoByGroupId` entry as missing on one side because those maps are keyed by group id, which differs between sessions; that is noise in every comparison and it hides real differences in those maps. Fixing it first makes the hit-descriptor work, and everything after, easier to read.

## Human tasks that unblock High-priority work

- **task-17, check 3.** Skipped at the user's request and still open. Everything it needs is in place; it wants someone watching GA4 DebugView for the `GA4 - dev` property during one run.
- **task-16, the consent decision.** Needs recorded accept and deny sessions on a client banner, then a choice of default mode. Nothing else waits on it, but it is the last open design question in the capture path.
- **Capturing native exports.** Each round of task-22 needs one, which needs a signed-in Google session. The runbook in `docs/runbooks/capture-a-native-tag-assistant-export.md` makes it a paste-and-go job for an agent with a real browser. Each capture of the contact flow also costs two real Google Ads conversions in the client's account, so they are not free.

## Blocked High tasks

- **task-22.2, carry Tag Assistant's template definitions.** The biggest single root cause behind the remaining differences, and blocked only by an edge on task-22.1 that looks wrong. That edge was added in the same sitting that created these subtasks, for sequencing rather than because task-22.2 consumes anything task-22.1 produces; none of its criteria do. It should probably be removed so the task is ready, which is the user's call.
- **task-22.5, message ordering.** Depends on task-22.1, and that edge is real: ordering has to place the new message kinds, so fixing ordering first would mean doing it twice.

## Deliberately not next

- **task-20, GTM containers the scenario does not name.** Real but narrow, and never reproduced against a live site; the first step is still finding one.
- **task-10 and task-12** stay deferred by ADR 0003.
- **task-22 itself** stays in progress as the parent. Its remaining criteria are now the subtasks' work plus the two provisional rules to settle.

## Housekeeping to resolve at the next pass

- task-17 is in progress with one criterion open that was skipped rather than failed; it may be worth closing as partially done rather than leaving it in flight.
- task-22's own criteria overlap its subtasks now, particularly its phase-two criterion, which the subtasks will satisfy. Worth trimming so it is not checked twice.
- Two provisional export rules are waiting on more native exports to settle: which tags a GTM container omits (`_implicit_` prefix against listener template types) and whether a Google tag container ever carries tags, where an older export of another container disagrees with the two recent ones.
