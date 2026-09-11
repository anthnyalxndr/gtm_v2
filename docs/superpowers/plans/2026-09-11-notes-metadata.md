# Notes-trailer metadata and the snapshot metadata index (TASK-12)

**Decision:** `backlog/decisions/decision-10`. **Task:** TASK-12.

**Goal:** One medium for library metadata. Every entity kind with a notes field may end its notes with a `---` line followed by a JSON object. The prose above is the customer's note; the JSON below is library metadata. `GtmSnapshot` parses every trailer once into a `metadata` index that the committed snapshot carries beside `recipes`; recipe roots, lint, `select()` and `compilePlan` read the index. Variables declare placeholders in that JSON and lint reconciles the entry with the value.

## Steps

1. `packages/gtm-apply/src/library/metadata.ts` (new): `NOTES_DELIMITER`, `EntityMetadata`, `PlaceholderMetadata`, `parseNotes`, `formatNotes`, `parseRecipeList`, `NOTED_KINDS`, `readMetadata(spec, encoding)` returning `{ index, errors }`. Tests in `test/metadata.test.ts`.
2. `packages/gtm-apply/src/library/encoding.ts`: `MetadataEncoding { name, read(entity), forCustomer(entity) }`; `notesEncoding()` over `parseNotes`; registry keeps `notes` only. Delete `metadataEncoding` and the `recipes:` line parser. `DEFAULT_PLACEHOLDER_PATTERN` moves to `manifest.ts`.
3. `packages/gtm-apply/src/library/gtm-snapshot.ts`: `GtmSnapshotData.metadata`; `#reindex()` reads metadata then recipes; `metadata` and `metadataOf(ref)` getters; `placeholderPattern` getter; `select()` runs `forCustomer` over every kind; `lint()` adds trailer errors, recipes on non-root kinds, placeholder entry vs value; `toJSON()` writes the index; `indexRecipes(spec, metadata, manifest)`.
4. `packages/gtm-apply/src/plan/tracking-plan.ts`: use `library.placeholderPattern`; enrich the needs-a-value message from the placeholder entry; check the entry's `pattern` on supplied values.
5. `packages/gtm-apply/src/index.ts` and `cli.ts`: exports and the snapshot-shape message.
6. Tests: rewrite the fixtures in `test/library.test.ts` and `test/tracking-plan.test.ts` to notes trailers; add lint and select assertions.
7. `packages/gtm-web-recipes`: `scripts/sample-template.ts` uses `formatNotes` with customer text, recipes and placeholder entries; `pnpm sample` regenerates `src/library.ts`; tests assert customer notes land without the trailer.
8. READMEs for both packages. `pnpm verify`. Commit, draft PR.

## Not in scope

Typed-required constants (placeholder constants as required plan keys), the heuristic literal lint for inline URLs and paths, and the GTM note-length cap. Each is a follow-up task.
