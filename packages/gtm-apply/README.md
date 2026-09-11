# @anthnyalxndr/gtm-apply

Declarative apply tool and CLI for Google Tag Manager. Describe a container in the same JSON shape the GTM UI exports, and apply it to any container you can access. The engine plans every change first, reports every problem at once, and only then writes, in dependency order, into a named workspace.

## Install

```bash
pnpm add @anthnyalxndr/gtm-apply
```

Auth, throttling, and the raw API service come from [`@anthnyalxndr/gtm-client`](../gtm-client/README.md), which this package depends on and re-exports, so one import covers most scripts. Both build on `@googleapis/tagmanager`, the per-API client, not the monolithic `googleapis` bundle.

## Credentials

Place your OAuth client file at `~/.config/gtm-apply/client_secrets.json` (see `client_secrets.json.example`). On first run gtm-apply opens a browser, receives the callback on a random localhost port, and stores the token at `~/.config/gtm-apply/token.json`. That one token serves every repo on the machine. Set `GTM_APPLY_CONFIG_DIR` to use another directory, or pass `clientSecretsPath` and `tokenPath` to the client.

## Getting started

`Gtm` is the entry point. It holds the client and nothing else, so one instance serves every container a script touches; everything it does is also available as a function that takes the client first.

```ts
import { Gtm } from "@anthnyalxndr/gtm-apply";
import { library } from "@anthnyalxndr/gtm-web-recipes";

const gtm = await Gtm.fromConfig().init();               // OAuth from ~/.config/gtm-apply
const spec = await gtm.export({ container: "GTM-XXXXXXX" });          // normalized spec
const snap = await gtm.snapshot({ container: "GTM-TPLXXXX" });        // GtmSnapshot, memoized per source
await gtm.apply({ container: "GTM-XXXXXXX", workspace: "fix", spec, dryRun: true });
await gtm.applyPlan({ library, plan, container: "GTM-XXXXXXX", workspace: "onboarding" });
```

## The spec

A spec is a GTM container export with three changes: server fields (`accountId`, `*Id`, `fingerprint`, `path`) are removed, id references become name references (`firingTriggerName`, `blockingTriggerName`, `parentFolderName`), and enum values are lower camel case (`customEvent`, `template`, `equals`). Everything else is exactly what the Tag Manager API accepts.

```json
{
  "variable": [
    { "name": "Const - Google Ads Conversion ID", "type": "c",
      "parameter": [{ "type": "template", "key": "value", "value": "AW-123" }] }
  ],
  "trigger": [
    { "name": "Custom Event - lead", "type": "customEvent",
      "customEventFilter": [{ "type": "equals", "parameter": [
        { "type": "template", "key": "arg0", "value": "{{_event}}" },
        { "type": "template", "key": "arg1", "value": "lead" } ] }] }
  ],
  "tag": [
    { "name": "Ads - Lead", "type": "awct", "firingTriggerName": ["Custom Event - lead"],
      "parameter": [
        { "type": "template", "key": "conversionId", "value": "{{Const - Google Ads Conversion ID}}" },
        { "type": "template", "key": "conversionLabel", "value": "xyz" } ] }
  ]
}
```

The fastest way to write a spec is to build the entities once in the GTM UI, export the container, and run `gtm-apply normalize export.json`. Or capture a container with `gtm-apply export --container GTM-XXXXXXX`, which reads the latest version by default (published or not), `--live` for the published one, or `--workspace <name>` for work in progress. Keep customer-specific values in constant variables so the rest of the spec is reusable.

### Writing a spec in TypeScript

A spec file can also be a `.ts`, `.js`, or `.mjs` module whose default export is the spec. Wrap it in `defineContainer()` and every enum-valued field is a string-literal union, so your editor completes `type: "customEvent"` and `tsc` rejects `"custom_event"` before anything reaches Tag Manager. See [`spec.example.ts`](spec.example.ts).

```ts
import { defineContainer } from "@anthnyalxndr/gtm-apply";

export default defineContainer({
  trigger: [{ name: "Custom Event - lead", type: "customEvent", customEventFilter: [/* ... */] }],
  tag: [{ name: "Ads - Lead", type: "awct", firingTriggerName: ["Custom Event - lead"],
          tagFiringOption: "oncePerEvent", parameter: [/* ... */] }],
});
```

```bash
gtm-apply apply --container GTM-XXXXXXX --workspace onboarding --spec spec.ts --dry-run
```

TypeScript files are imported through Node's own type stripping, which is on by default from Node 22.18 and 23.6. On Node 22.6 to 22.17 run `node --experimental-strip-types $(which gtm-apply) …` or go through `tsx`. Type stripping handles types only: a spec module can't use enums or parameter properties.

The types come from Google's [Discovery document](https://tagmanager.googleapis.com/$discovery/rest?version=v2) for the Tag Manager API v2 (Google publishes no OpenAPI spec). `pnpm gen:discovery --fetch` refreshes the committed copy under `scripts/discovery/` and regenerates `src/spec/generated/tagmanager-v2.ts`; a test fails if the two drift. Two things the document does not carry: which parameter keys a given tag or variable template (`awct`, `gaawe`, `c`) accepts, and which trigger fields belong to which trigger type. Those are still checked by the API at apply time.

### Validation

Before any API call, `gtm-apply apply` checks the spec against the same schemas: unknown fields, wrong primitive types, `null` values, leftover id fields, and enum values the API would reject are all reported at once with the entity name and field path, and the command exits 1. From code, `validateSpec(spec)` returns the issues and `planContainerSpec` throws a `SpecValidationError` listing them.

```
Spec spec.json has 2 problem(s):
[!] trigger "Custom Event - lead": type must be one of pageview, domReady, … (got "custom_event")
[!] tag "Ads - Lead": tagFiringOption must be one of unlimited, oncePerEvent, oncePerLoad (got "once")
```

### Snapshots

A spec is the apply-able part of a container. A snapshot is everything the API exposes for it, as the API returns it: the container and its type (from `usageContext`), the workspace or version read, the container's environments and the one serving that version, linked Google tag destinations, version headers, and every entity collection including gtag configs, custom templates, clients and transformations. It's the input for a library, an audit, or anything that needs more than tags, triggers and variables.

```bash
gtm-apply snapshot --container GTM-XXXXXXX                  # latest version
gtm-apply snapshot --container GTM-XXXXXXX --live           # published version
gtm-apply snapshot --container GTM-XXXXXXX --version 42
gtm-apply snapshot --container GTM-XXXXXXX --workspace wip  # work in progress
```

From code, `pullSnapshot(client, source)` returns an `ApiSnapshotData` and `snapshotToSpec(snapshot)` normalizes the apply-able part, tagged with its `containerType`. `GtmSnapshot` (below) adds the recipe index on top of it.

### Container types

A spec may carry `containerType` (`web`, `server`, `amp`, `android`, `ios`); `normalize` sets it from an export's `usageContext`. Applying a spec to a container of another type is a plan error before any write. Server containers add two sections, `client` and `transformation`, with the same rules as other entities: name is identity, `parentFolderName` names the folder, `{{Name}}` references are resolved, and the engine applies them after variables and before triggers. A `web` spec that declares clients is rejected by validation. Custom templates are first-class: a spec carries a `customTemplate` section (name, `templateData`, optional `galleryReference`), a tag or variable built on one has a portable `cvt:<template name>` type, and the engine creates or updates templates before the entities that use them, rewriting the type to the target container's `cvt_…` id (gallery-backed templates install through `import_from_gallery`). gtag configs are carried in snapshots but not yet applied.

## Applying a spec

```bash
gtm-apply apply --container GTM-XXXXXXX --workspace conversions-2026-09 --spec spec.json --dry-run
gtm-apply apply --container GTM-XXXXXXX --workspace conversions-2026-09 --spec spec.json
gtm-apply apply --container GTM-XXXXXXX --workspace conversions-2026-09 --spec spec.json --publish
```

Or from code:

```ts
import { GtmClient, applySpec, normalizeExport, formatPlan } from "@anthnyalxndr/gtm-apply";

const client = new GtmClient();
await client.init();

const spec = normalizeExport(JSON.parse(await readFile("spec.json", "utf-8")));
const { plan, result } = await applySpec(client, {
  container: "GTM-XXXXXXX",
  workspace: "conversions-2026-09",
  spec,
  dryRun: true,
});
console.log(formatPlan(plan));
```

### What apply does

1. Resolves the container by public id and reads the target workspace if it exists.
2. Resolves every reference in the spec and builds a plan. Names are identity: an entity that exists by name is compared and updated only if it differs. The plan output uses `[+]` create, `[~]` update, `[=]` unchanged, `[!]` error.
3. Refuses to write while the plan has errors. All errors are reported together.
4. Applies folders, then variables (ordered by their `{{ }}` references), then triggers, then tags, resolving names to ids as it goes. Updates send the current fingerprint.
5. Checks the workspace for merge conflicts, creates a version when something changed, and publishes only with `--publish`.

`--dry-run` prints the plan and makes no write calls. What the dry run shows is exactly what apply does.

### Versions and workspaces

Two Tag Manager behaviors shape the apply flow, both verified against the live API:

- **Creating a version deletes the workspace it came from.** After an apply that changed something, the named workspace is gone and the changes live in the new version. Open a fresh workspace in the UI to preview.
- **A new workspace branches from the latest version, not the live one.** So the next apply sees everything earlier applies created, whether or not it was published, and reports it `[=]`. The planner reads the latest version when the target workspace does not exist yet.

When nothing changed, no version is created and the workspace is left in place.

### Naming

Tag Manager rejects `:` in entity names. The planner reports it before writing. Notes accept any text, so conventions like `#recipe:ga4-event` belong in an entity's notes field, not its name.

### What gets created implicitly

If an entity needs no information beyond its name, the engine creates it and marks the operation `(implicit)` in the plan. That covers the workspace, folders named in `parentFolderName`, and built-in variables referenced as `{{Page Path}}` or `{{Form ID}}`. Everything that needs a type or a value must be in the spec, and a reference to something that is neither in the spec nor in the container is an error. Containers are never created implicitly; use `createContainer()`.

The default workspace is never written to.

### Limits

- Trigger groups (`triggerReference` parameters) are rejected.
- Validation covers field names, primitive types, and enum values, not which parameter keys a tag template accepts or which fields a trigger type uses. Those errors still come back from the API during apply.
- The planner compares only the fields the spec provides. Fields stripped from an export, such as `monitoringMetadata`, are not corrected if someone changes them in the UI.
- The Tag Manager API has tight per-minute quotas. Every call is throttled and retried with backoff; large specs take a while.

## Libraries and recipes

A library is a GTM container you build in the UI and pull into a committed snapshot. Recipes are declared on the entities that fire, tags (and clients and transformations in a server container), in a metadata trailer of their notes; everything else a recipe needs, triggers, variables, setup tags, folders and built-ins, is discovered by following references. `GtmSnapshot` is a container pulled at one moment. `data` is the pull exactly as the API returned it (`ApiSnapshotData`: container, environments, destinations, version header, every entity collection) and never changes. On top of it sit name-keyed views per entity kind (`tags`, `triggers`, `variables`, `clients`, …), a `metadata` index with `metadataOf(ref)`, a `recipes` index with `recipe(name)`, and `select`, `lint`, `push`.

```ts
const lib = await gtm.snapshot({ container: "GTM-TPLXXXX" });   // or new GtmSnapshot(client, source).init()
lib.data.destinations;                          // raw pull
lib.recipe("form_submit");                      // roots, entities, description, dependencies
lib.tags.get("Ads - lead");
const spec = lib.select(["form_submit"], { destinations: ["ga4", "googleAds"] });
await gtm.apply({ container: "GTM-CUST", workspace: "onboarding", spec });

await writeFile("library.json", JSON.stringify(lib, null, 2));            // { data, manifest, encoding, metadata, recipes }
const same = gtm.snapshotFrom(JSON.parse(await readFile("library.json", "utf-8")));
```

The views are a working copy. Assign one to stage an edit: `lib.tags = tags` (a Map or an array) replaces the tags, re-indexes recipes, and changes what `spec`, `select` and `push` produce, while `data` and `toJSON()` still describe the pull. `isDirty` says whether anything is staged and `reset()` discards it. This is the seam a change report hangs off: the pull is the before, the staged state is the after.

`select` returns the union of the recipes' closures in library order (a tag or variable built on a custom template brings that template along), hands every entity over as the customer should receive it (trailer removed, customer text kept), leaves the manifest out, and filters destination tags by family (`gaawe` is `ga4`, `awct` and `gclidw` are `googleAds`, `googtag` is `googleTag`; tags of no family are always kept). `push(client, { workspace })` applies the staged state, trailers intact, back to its own container. `lint()` reports trailers that do not parse, recipes declared on entities that cannot fire, recipes the manifest doesn't declare, recipes that reach no trigger, dependencies naming constants outside the recipe, placeholder entries that disagree with their value, inline literals that look site-specific (below), and notes longer than Tag Manager saves (`NOTES_MAX_LENGTH`, 512,000 characters as measured by `scripts/probe-notes-cap.ts`; the manifest's `notesMaxLength` tightens it).

### Metadata in notes

Every entity with a notes field (variables, triggers, tags, clients, transformations) may end its notes with a line that is exactly `---` followed by a JSON object. The text above the line is the customer-facing note; the JSON is library metadata and never reaches a customer container. A trailer counts only when it starts with `{`, so prose containing a rule is left alone; one that starts with `{` and does not parse is a lint finding.

```
Sends the form_submit event to GA4.
---
{"recipes": ["form_submit"]}
```

Known keys, both optional; unknown keys round-trip untouched:

- `recipes`: the recipe names a tag, client or transformation declares (an array, or a comma separated string).
- `placeholder`: on a constant whose library value is a placeholder (`<G-XXXXXXX>`, per the manifest's `placeholderPattern`), what a plan must supply: `kind`, `description`, `example`, and a `pattern` the supplied value must match. Lint reconciles the entry with the value both ways, so a constant an author forgot to blank never ships to a customer, and `compilePlan` puts the description and example in its error message.

The placeholder rules are structural and catch values routed through constants. As a heuristic backstop, lint also walks every parameter and condition of every variable, trigger, tag, client and transformation and reports literals that look site-specific: a URL, an email address, a hostname, a leading-slash path, a CSS selector, a `G-`/`AW-`/`GTM-` id, or anything containing one of the template site's own hostnames. The fix is to hoist the value into a `Const - …` with a placeholder entry and reference it from the condition. Variable references inside a value are ignored, placeholder values and constants that already declare a placeholder entry are skipped, and the manifest's `literals` entry tunes the rest: `allow` lists literals that are generic despite their looks (compared exactly), `hosts` lists the template site's hostnames.

`GtmSnapshot` parses every trailer once into `metadata`, a record keyed by `kind:name` that the committed snapshot carries beside `recipes`; `metadataOf({ kind, name })` reads one entry. `parseNotes` and `formatNotes` are the reader and writer, for scripts that stage edits. An encoding is the object that reads a trailer and returns an entity as the customer should get it (`read`, `forCustomer`); `notes` is the built-in and the default. Register another with `registerEncoding(name, factory)`; a manifest refers to encodings by name, so the code stays in your package and never in the container.

### The manifest

A Constant variable named `Library - Manifest` whose value is JSON. It is never referenced by a tag, so it is never selected. A snapshot literal typed `as const` (or passed to `fromData`, which infers `const`) gives literal recipe names, so `select(["form_submti"])` is a compile error.

```json
{
  "literals": { "allow": ["/"], "hosts": ["template.example.com"] },
  "recipes": {
    "form_submit": {
      "description": "Lead form submitted",
      "dependencies": [
        { "constant": "Const - Ads Label - lead", "platform": "googleAds",
          "resource": "conversionAction", "nameTemplate": "GTM - ${recipe}" }
      ]
    }
  },
  "destinations": { "cvt_123_45": "googleAds" }
}
```

Dependencies name the constant that carries an identifier from another platform and how the resource is expected to be named there. Nothing verifies them against Google Ads or GA4 yet; `lint` only checks that the constant is in the recipe.

## Naming conventions

Recipes, `select`, and audits all lean on names, so the rules live in one place: `DEFAULT_CONVENTIONS` in gtm-apply. Prefixes are keyed by entity type (`gaawe` tags start with `GA4 - `, `awct` with `Ads - `, `c` variables with `Const - `, `v` with `DLV - `, `customEvent` triggers with `Custom Event - `, and so on), `patterns` add a regular expression per entity kind, `forbidden` bans characters Tag Manager rejects, and `externalNames` says what a recipe's resources are called on other platforms (`googleAds.conversionAction` is `GTM - ${recipe}`).

`checkNames(spec, conventions)` reports every violating entity with the rule it breaks. Overrides layer over the defaults with `mergeConventions`, and a library carries its own under `conventions` in the manifest; a consumer such as gtm_audit passes its per-container overrides the same way. `GtmSnapshot.lint()` includes naming issues whenever the manifest or the constructor options declare conventions, and stays quiet otherwise.

```ts
const lib = await new GtmSnapshot(client, { container }, {
  conventions: { tagPrefixes: { gaawe: "GA4 Event - " }, patterns: { folder: "^[A-Z]" } },
}).init();
lib.lint();                                        // naming issues included
lib.externalNameOf("form_submit", dependency);     // "GTM - form_submit"
```

## Tracking plans

A customer's onboarding is a plan: which recipes to install, which destination families to keep, and the values of the constants those recipes need. `defineTrackingPlan(library, plan)` checks recipe and constant names against the library's literal types, so a typo is a compile error, and makes the placeholder constants the selected recipes reach required keys of `constants` (computed from the snapshot's `metadata` and `recipes`), so a missing value is a compile error too and the editor lists what to fill in. A plan with a `destinations` filter keeps `constants` optional, because dropped tags may take constants with them; `compilePlan` reports what is missing at run time. `RequiredConstantNameOf<typeof data, ["form_submit"]>` names the set. `compilePlan` selects the recipes, fills in the constants, and reports problems before any API call: a constant whose library value is a placeholder (`<AW-XXXXXXXXX>`) with no value in the plan, a value that fails a dependency's pattern, a constant that isn't in the library, and naming violations when the library declares conventions. A supplied value that still looks like a placeholder is a warning. `applyPlan` compiles, optionally writes the spec to a file, and applies it through the same engine.

```ts
import { applyPlan, defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "@anthnyalxndr/gtm-web-recipes";

const plan = defineTrackingPlan(library, {
  recipes: ["form_submit", "call_click"],
  destinations: ["ga4", "googleAds"],
  constants: {
    "Const - GA4 Measurement ID": "G-XXXXXXX",
    "Const - Ads Conversion ID": "AW-123456789",
    "Const - Ads Label - form_submit": "AbC-dEf",
  },
});

const { plan: ops, warnings } = await gtm.applyPlan({
  library, plan, container: "GTM-XXXXXXX", workspace: "onboarding-2026-09", dryRun: true,
  writeSpecTo: "compiled.json",
});
```

Or from the CLI, with a plan module and a library file or module:

```bash
gtm-apply apply --container GTM-XXXXXXX --workspace onboarding --plan plan.ts --library library.json --dry-run
```

A content package holds the library: its pull script reads the template container with `GtmSnapshot`, lints it, and writes the snapshot as a `const` TypeScript module with `libraryModuleSource`, so recipe and constant names are literal types wherever the package is imported. See `packages/gtm-web-recipes`.

## Ad hoc work: use gtm-cli

For discovery, inspection, and one-off edits, use owntag's [gtm-cli](https://github.com/owntag/gtm-cli) (`npm i -g @owntag/gtm-cli`). It covers per-resource commands with JSON output and needs no spec. gtm-apply is for the repeatable path: reconciling a container against a spec by name, with dry run and version handling. The reasoning is recorded in `backlog/decisions/`.

## Development

```bash
pnpm install
pnpm verify        # typecheck + tests
pnpm dev           # runs example.ts (dry run)
```

Run these from the repo root. Pre-commit hooks run prettier, the build, the typecheck, and the tests for both packages. Design notes are in `docs/superpowers/plans/2026-09-09-gtm-sdk.md` and `backlog/decisions/`.

## License

Apache-2.0
