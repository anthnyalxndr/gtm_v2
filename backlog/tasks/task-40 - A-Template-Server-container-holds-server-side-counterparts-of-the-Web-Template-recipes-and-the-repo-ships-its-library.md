---
id: TASK-40
title: >-
  A Template - Server container holds server-side counterparts of the Web
  Template recipes and the repo ships its library
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-28 17:47'
updated_date: '2026-09-28 23:51'
labels:
  - recipes
  - server
dependencies:
  - TASK-42
  - TASK-44
  - TASK-45
priority: high
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Template - Web (GTM-TPLKC7QP, account anthnyalxndr.com 6004731770) holds the lead-gen recipe set (google_tag, contact_form_submit, call_click, email_click, maps_click), and packages/gtm-web-recipes ships it as a committed library (TASK-17). There is no server-side equivalent. This task adds a Template - Server container that mirrors those recipes with server-side tagging conventions and idioms: a client that claims the incoming requests, server tags for GA4 and Google Ads, and server naming conventions.

Start with a plan, not code. The reference setup is a client's paired containers in the MindScience Collective account (6314397568). Server: www.mindsciencecollective.com - Server, GTM-P23F82XZ, container 240645963, workspace 17, https://tagmanager.google.com/#/container/accounts/6314397568/containers/240645963/workspaces/17 (tagging server https://sst.mindsciencecollective.com). Web: www.mindsciencecollective.com - Web, GTM-MXK8K5KJ, container 230742313, workspace 30, https://tagmanager.google.com/#/container/accounts/6314397568/containers/230742313/workspaces/30. Read both, because the server recipes only make sense next to what the web container sends. These are a client's containers: learn patterns from them, copy no client ids, domains or values into the template, and write nothing to that account.

The owner wants the plan to consider merging the recipe packages into one package with recipes keyed by container type (web, server) instead of adding a separate gtm-server-recipes package. Build on decision-10 (notes-trailer metadata) and TASK-6 (server container support in apply and the library). Tag Manager allows 30 write requests per minute, so pushes must stay throttled.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Before any code or container changes, an implementation plan is recorded on this task and the owner approves it
- [x] #2 The plan maps each Template - Web recipe to its server-side counterpart, or says why a recipe has none, based on what GTM-P23F82XZ and GTM-MXK8K5KJ actually contain
- [x] #3 The plan shows how each web recipe and its server recipe fit together: what the web container sends to the tagging server, which server client claims it, and which server tags and triggers fire
- [x] #4 The plan decides the package layout, evaluating one combined recipes package keyed by container type against a separate server package, and states any change the web package or its consumers need
- [x] #5 A server container named Template - Server exists in the anthnyalxndr.com account (6004731770) beside Template - Web
- [ ] #6 The server recipes are defined in code with notes-trailer metadata (decision-10), a Library - Manifest, placeholder constants for every customer value, and server naming conventions, and lint reports no findings
- [ ] #7 The template is pushed to Template - Server as a workspace and version, and the pull writes the committed server library from it with no lint findings
- [ ] #8 No id, domain or value from the MindScience Collective containers appears in the template or the committed library
- [ ] #9 pnpm verify passes, and the README and example plan cover the server recipes
- [ ] #10 The web template offers google_tag_server (the Google tag with server_container_url set from a Const - Server Container URL placeholder), its manifest entry declares a conflict with google_tag, and compilePlan reports a plan that selects both
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Full plan: docs/superpowers/plans/2026-09-28-template-server.md. Awaiting owner approval (AC #1) before any code or container change.
1. Create Template - Server (server container) in account 6004731770 with the Tag Manager MCP.
2. Key built-in triggers by container type in gtm-apply and add the server built-in trigger 2147479574, its display name read from our own container's UI.
3. Rename packages/gtm-web-recipes to packages/gtm-recipes: libraries keyed by container type (recipes.web, recipes.server; subpaths ./web and ./server), scripts take web|server.
4. Server template: ga4_client (GA4 client, one GA4 forwarding tag, Conversion Linker), one server Google Ads conversion tag and event trigger per conversion recipe, optional web_container_client; placeholders for every customer value.
5. Web template gains google_tag_server (Google tag with server_container_url); the manifest declares it conflicts with google_tag and compilePlan reports a plan that selects both.
6. Push both templates as unpublished versions, pull both libraries lint-clean, confirm no MindScience value is committed.
7. README for both libraries; pnpm verify; move to Review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-28: Read the reference Default Workspaces read-only (server GTM-P23F82XZ ws 17, web GTM-MXK8K5KJ ws 30). Found two repo gaps: snapshotToSpec fails on the server's built-in trigger id 2147479574 (unknown to BUILT_IN_TRIGGERS), and on the web container's gallery Consent Mode template (custom templates wait on TASK-10). The recipes don't need custom templates, so only the first gap is in scope.

2026-09-28: The owner created Template - Server (GTM-WMGVDZ5H, containerId 265489931) in account 6004731770 and enabled every built-in variable in its Default Workspace; no version yet. AC #5 is met. Decisions from the plan review: the per-container catalog moves to TASK-42 (built on the new gtm-model package, TASK-41), the package rename moves to TASK-45, pushing into the Default Workspace without a prior version is TASK-44, and the cross-container check is TASK-46. The plan in docs/superpowers/plans/2026-09-28-template-server.md predates this split: rewrite it for what is left (the server template, google_tag_server, push, pull, docs) and update these acceptance criteria to match before implementing.

2026-09-28: Template - Server version 2 "built-in-variables-2026-09-28" (unpublished) saves the owner's 9 built-in additions; the Default Workspace moved to workspace 3. A new server container ships with a default client named GA4 (gaaw_client, FPID cookie, cookieMaxAgeInSec 63072000), so the server template's GA4 client reconciles with it by name (an update, not a second client). Push the template into a new workspace or a named one, never the Default Workspace (decision-4, reaffirmed by the owner in TASK-44).

2026-09-28: The owner approved the plan's direction and decisions ('go with your rec'), which checks AC #1; the plan doc covers AC #2-#4, and TASK-45 carried out the package decision. AC #10 added from plan decision 2 (google_tag_server). Decision 3 verified: Google's server-side tagging fundamentals say the GA4 server tag, left at its defaults, inherits all relevant fields and parameters from the client's event data (https://developers.google.com/tag-platform/learn/sst-fundamentals/5-sst-setup-analytics), so the server template has no measurement-id constant.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
