---
id: TASK-46
title: >-
  Paired web and server containers are checked against each other before
  publishing
status: To Do
assignee: []
created_date: '2026-09-28 20:53'
labels:
  - recipes
  - verification
  - server
dependencies:
  - TASK-30
  - TASK-11
  - TASK-40
priority: medium
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Server recipes only work when the customer's web container sends to the tagging server: a Google tag whose server_container_url is the server container's tagging URL. The web recipe google_tag_server (TASK-40) in turn needs a server container with a GA4 client. Nothing checks either side today, so a server container can be published while no traffic reaches it. Recipes already declare external dependencies in the Library - Manifest (Google Ads conversion actions), and TASK-11 is the framework that verifies them. Add a dependency kind for a paired container and a verifier for it. The repo config file (TASK-30) pairs a server container with its web container; the verifier pulls the web container and finds its Google tags itself, and asks for a Google tag id in the config only when more than one tag could match. The server's tagging URL comes from the API (taggingServerUrls).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A recipe can declare a dependency on its paired container in the manifest, for example the web Google tag sending to this server's tagging URL, or a GA4 client in the server container
- [ ] #2 The repo config can name a server container's paired web container, and a Google tag id only when needed to disambiguate
- [ ] #3 Before publish, the verifier pulls the paired container and reports each unmet dependency with the entity it looked for and what it found
- [ ] #4 The check runs in both directions: server recipes check the web Google tag, and google_tag_server checks the server GA4 client
- [ ] #5 Unit tests with the gtm-client fake cover a met pair, a web tag without server_container_url, a URL that points at another server, and a server without a GA4 client
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Once the implementation plan exists, the acceptance criteria were reviewed against it and updated where the plan changed them
<!-- DOD:END -->
