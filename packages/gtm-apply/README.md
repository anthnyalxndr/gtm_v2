# @anthnyalxndr/gtm-apply

Declarative apply tool and CLI for Google Tag Manager. Describe a container in the same JSON shape the GTM UI exports, and apply it to any container you can access. The engine plans every change first, reports every problem at once, and only then writes, in dependency order, into a named workspace.

## Install

```bash
pnpm add @anthnyalxndr/gtm-apply
```

Auth, throttling, and the raw API service come from [`@anthnyalxndr/gtm-client`](../gtm-client/README.md), which this package depends on and re-exports, so one import covers most scripts. Both build on `@googleapis/tagmanager`, the per-API client, not the monolithic `googleapis` bundle.

## Credentials

Place your OAuth client file at `~/.config/gtm-apply/client_secrets.json` (see `client_secrets.json.example`). On first run gtm-apply opens a browser, receives the callback on a random localhost port, and stores the token at `~/.config/gtm-apply/token.json`. That one token serves every repo on the machine. Set `GTM_APPLY_CONFIG_DIR` to use another directory, or pass `clientSecretsPath` and `tokenPath` to the client.

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

- Tags built on custom or community templates (`cvt_*` types) are rejected by the normalizer. Import the template into the target container first; direct support is a backlog item.
- Trigger groups (`triggerReference` parameters) are rejected.
- Validation covers field names, primitive types, and enum values, not which parameter keys a tag template accepts or which fields a trigger type uses. Those errors still come back from the API during apply.
- The planner compares only the fields the spec provides. Fields stripped from an export, such as `monitoringMetadata`, are not corrected if someone changes them in the UI.
- The Tag Manager API has tight per-minute quotas. Every call is throttled and retried with backoff; large specs take a while.

## Conversion recipes

For the common onboarding case, recipes compile to spec fragments and go through the same engine:

```ts
import { GtmClient, applyConversions, formatPlan } from "@anthnyalxndr/gtm-apply";

const client = new GtmClient();
await client.init();

const { plan } = await applyConversions(client, {
  container: "GTM-XXXXXXX",
  workspace: "conversions-2026-09",
  conversions: [
    { kind: "ga4-event", name: "GA4 - generate_lead", event: "generate_lead",
      measurementId: "G-XXXXXXX", trigger: { type: "formSubmit", formId: "contact" } },
    { kind: "google-ads", name: "Ads - Lead", conversionId: "AW-123", label: "xyz",
      trigger: { type: "pageview", pathEquals: "/thank-you" } },
  ],
  dryRun: true,
});
console.log(formatPlan(plan));
```

Trigger recipes: `pageview` (with `pathEquals` or `pathContains`), `formSubmit` (by form id), `customEvent`. The Google Ads recipe stores the conversion id in a `Const - Google Ads Conversion ID` variable that the tag references.

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
