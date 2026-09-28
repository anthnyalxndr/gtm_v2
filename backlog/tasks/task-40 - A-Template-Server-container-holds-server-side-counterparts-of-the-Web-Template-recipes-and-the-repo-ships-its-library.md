---
id: TASK-40
title: >-
  A Template - Server container holds server-side counterparts of the Web
  Template recipes and the repo ships its library
status: To Do
assignee: []
created_date: '2026-09-28 17:47'
labels:
  - recipes
  - server
dependencies:
  - TASK-17
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
- [ ] #1 Before any code or container changes, an implementation plan is recorded on this task and the owner approves it
- [ ] #2 The plan maps each Template - Web recipe to its server-side counterpart, or says why a recipe has none, based on what GTM-P23F82XZ and GTM-MXK8K5KJ actually contain
- [ ] #3 The plan shows how each web recipe and its server recipe fit together: what the web container sends to the tagging server, which server client claims it, and which server tags and triggers fire
- [ ] #4 The plan decides the package layout, evaluating one combined recipes package keyed by container type against a separate server package, and states any change the web package or its consumers need
- [ ] #5 A server container named Template - Server exists in the anthnyalxndr.com account (6004731770) beside Template - Web
- [ ] #6 The server recipes are defined in code with notes-trailer metadata (decision-10), a Library - Manifest, placeholder constants for every customer value, and server naming conventions, and lint reports no findings
- [ ] #7 The template is pushed to Template - Server as a workspace and version, and the pull writes the committed server library from it with no lint findings
- [ ] #8 No id, domain or value from the MindScience Collective containers appears in the template or the committed library
- [ ] #9 pnpm verify passes, and the README and example plan cover the server recipes
<!-- AC:END -->
