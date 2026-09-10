---
id: TASK-3
title: >-
  Container specs are typed and validated against the Tag Manager Discovery
  document
status: Done
assignee:
  - '@claude'
created_date: '2026-09-10 20:48'
updated_date: '2026-09-10 20:56'
labels:
  - sdk
  - spec
  - types
dependencies: []
references:
  - 'https://tagmanager.googleapis.com/$discovery/rest?version=v2'
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
gtm-apply specs are currently untyped at run time and only loosely typed at compile time: normalizeExport casts parsed JSON, and every enum in the generated @googleapis/tagmanager types is 'string | null', so a typo like type: 'custom_event' or tagFiringOption: 'once' is only caught when the API rejects a create call partway through execution. Google publishes no OpenAPI spec but does publish a Discovery document (https://tagmanager.googleapis.com/$discovery/rest?version=v2) that carries every enum. The outcome: enum values are string-literal unions so a spec authored in TypeScript gets IntelliSense, invalid field values are reported at plan time alongside reference errors before any API call, and the CLI accepts a TypeScript or JavaScript spec file. Overlaps TASK-1: a tracking plan is easier to author with typed specs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A ContainerSpec authored in a .ts file gets completion and compile errors for enum-valued fields (trigger type, condition type, parameter type, tagFiringOption, consentStatus, caseConversionType, built-in variable type) from a committed generated types module
- [x] #2 Running gtm-apply apply on a spec with an invalid enum value or an unknown field reports every problem in the plan output with an entity name and field path, exits non-zero, and makes no API call
- [x] #3 gtm-apply apply --spec accepts .json, .js, .mjs, and .ts files; TypeScript files import through Node's type stripping and a clear error explains how to enable it on older Node
- [x] #4 A defineContainer() helper is exported so a spec file gets inference without annotations, and README documents the TypeScript spec workflow
- [x] #5 The generator is re-runnable from a committed script against a pinned Discovery revision, and its output is checked into the repo
- [x] #6 Unit tests cover the generated unions, the validator's error paths, and loading each spec file kind
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Commit a trimmed copy of the Discovery document (schemas reachable from Tag, Trigger, Variable, Folder, BuiltInVariable plus the revision) under scripts/discovery and a tsx generator that emits src/spec/generated/tagmanager-v2.ts: JSDoc'd interfaces without server nulls, string-literal enum unions with const arrays, and a schema table for the validator. A test regenerates from the committed input and asserts the checked-in output is in sync.
2. Rebase spec/types.ts on the generated interfaces (server fields removed, id refs to name refs) so trigger type, condition type, parameter type, tagFiringOption, consentStatus, caseConversionType and builtInVariable entries are unions. Fix any recipe or test fallout.
3. Add spec/validate.ts: walk a normalized spec against the schema table, reporting unknown fields, wrong primitive types, and bad enum values with an entity name and field path. Wire it into the CLI apply path before client.init() and into applySpec.
4. Add spec/load.ts with loadSpecFile (.json parse; .js/.mjs/.cjs/.ts/.mts dynamic import of the default export) and a defineContainer identity helper; CLI apply and normalize use it; a clear error covers Node without type stripping.
5. Export the new API from index.ts, add a spec.example.ts typechecked by tsconfig.test.json, document the TypeScript workflow in README, run pnpm verify, commit on the worktree branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Generator: scripts/generate-discovery.ts reads the committed scripts/discovery/tagmanager-v2.schemas.json (revision 20260902, schemas reachable from Tag/Trigger/Variable/Folder/BuiltInVariable) and writes src/spec/generated/tagmanager-v2.ts through prettier; --fetch refreshes the JSON from Google. Unspecified sentinels are dropped from the unions. test/generate-discovery.test.ts regenerates and asserts the checked-in file matches.
Types: spec/types.ts now derives VariableSpec/TriggerSpec/TagSpec from the generated interfaces (no server nulls); BUILT_IN_VARIABLES in catalog.ts is typed against BuiltInVariableType so the catalog is checked too. No discrimination of trigger fields by trigger type: the Discovery document does not carry that, so it stays a run-time API check (documented in README Limits).
Validation: validateSpec (spec/validate.ts) walks the schema table; the CLI validates before client.init() and planContainerSpec calls assertValidSpec before its first API call. Enum lists over 12 values are cut short in messages. The planner's own missing-name check is now unreachable from the CLI but kept for library callers of the raw engine.
Loading: spec/load.ts imports .js/.mjs/.cjs/.ts/.mts modules (default export, then a named spec export) and maps ERR_UNKNOWN_FILE_EXTENSION / ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING to a message naming Node 22.18+, --experimental-strip-types, or tsx. Verified by hand with the built dist on Node 22.16: normalize spec.ts works under the flag, fails with the guidance message without it, and apply on a bad .ts spec lists both problems and exits 1 with no network call.
Validation: pnpm verify from the repo root (build, typecheck, 19 client tests, 79 apply tests) passes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Specs are now typed and validated from Google's Tag Manager v2 Discovery document. A committed generator emits entity interfaces, enum unions and a schema table; spec types derive from them so .ts specs get IntelliSense; validateSpec reports unknown fields, bad types and bad enum values with entity name and path before any API call (CLI exits 1, planContainerSpec throws); --spec accepts .json/.js/.mjs/.ts with defineContainer() for inference; README documents the workflow and spec.example.ts shows it. Verified with pnpm verify (98 tests) and a manual run of the built CLI on Node 22.16.
<!-- SECTION:FINAL_SUMMARY:END -->
