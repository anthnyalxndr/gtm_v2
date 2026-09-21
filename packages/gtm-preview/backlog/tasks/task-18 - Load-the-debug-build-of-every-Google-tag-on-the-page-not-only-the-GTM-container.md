---
id: TASK-18
title: >-
  Load the debug build of every Google tag on the page, not only the GTM
  container
status: Done
assignee: []
created_date: '2026-09-21 03:56'
updated_date: '2026-09-21 04:05'
labels:
  - capture
  - report
dependencies:
  - TASK-13
priority: high
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The GTM container's debug feed records hits only for endpoints its own runtime owns (the conversion-linker call); GA4 and Ads hits are sent by the Google tag runtime, which the page loads as its own script (gtag/js?id=G-... or gtag/destination?id=...). With that script on its production build the runtime registers the Google tag as a second container with debug false and emits nothing for it, so hits can only be attributed to events by time and show as unexplained. Google tags serve their debug build to anyone with gtm_debug=x (no code needed, verified 2026-09-19), and Tag Assistant loads it, which is why its export shows a second container with its own messages and hit records. The runner must rewrite those requests as well, and the report and export must handle records from more than one container.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Requests for gtag/js and gtag/destination on googletagmanager.com are rewritten to add gtm_debug=x, with GTM's diagnostics beacons left alone, and a unit test covers the matcher
- [x] #2 On www.sjpools.com the session records OGT-product records for G-9ECPFL5LDC including GTAG_HIT records for the GA4 collect hits, and network hits are attributed to the runtime's own hit records by URL before falling back to time
- [x] #3 Events from different containers never collide: the report keys events by container, load, id, and name, each event names its container, and the CLI shows which container an event belongs to when more than one is present
- [x] #4 A hit the runtime itself reported is never flagged as a hit without a tag; mismatches for GTM's own tags keep the per-event time attribution
- [x] #5 The Tag Assistant export writes one container entry per container observed (GTM and each Google tag), listed in domainDetails.containers, and the multi-container document still matches the real export's shape signature

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Requests for gtag/js and gtag/destination are rewritten with gtm_debug=x (no code needed). On www.sjpools.com the Google tag G-9ECPFL5LDC now reports as an OGT container in the same queue, and its GTAG_HIT records tie the GA4 collect and Ads consent-mode hits to their events: 27 of 37 hits attributed by the runtime, the sjpools replay went from 22 mismatches to 0. Along the way: events keyed by container as well as load, id, and name; hit matching by identifying parameters (the wire request gains tfd and gaf and GA4 dual-sends to www.google.com); GTAG_HIT records carry the event id but not its name, resolved through an id index; time fallback prefers a recent earlier event with an explaining tag; window hits for tag judgement include runtime-attributed hits; awcc (call conversion) added as hit-sending, gclidw (Conversion Linker) as explaining; /ccm/ and /rmkt/ Ads endpoints recognised; live mode strips the _dbg=1 the Google tag's debug build adds; summary counts scoped to the GTM container; the Tag Assistant export writes one container entry per container and still matches the shape signature. Multi-container and signature tests added.
<!-- SECTION:FINAL_SUMMARY:END -->
