# @anthnyalxndr/gtm-sdk

Spec-driven SDK and CLI for Google Tag Manager. Describe a container in the same JSON shape the GTM UI exports, and apply it to any container you can access. The engine plans every change first, reports every problem at once, and only then writes, in dependency order, into a named workspace.

## Install

```bash
pnpm add github:anthnyalxndr/gtm_v2#v2.0.0
```

The package builds itself on install through its `prepare` script. pnpm 10 blocks dependency build scripts by default, so approve this one in the consuming repo's `pnpm-workspace.yaml` before installing:

```yaml
onlyBuiltDependencies:
  - "@anthnyalxndr/gtm-sdk"
```

It depends on `@googleapis/tagmanager` (the per-API client, not the monolithic `googleapis` bundle) and re-exports its `tagmanager_v2` types.

## Credentials

Place your OAuth client file at `~/.config/gtm-sdk/client_secrets.json` (see `client_secrets.json.example`). On first run the SDK opens a browser, receives the callback on a random localhost port, and stores the token at `~/.config/gtm-sdk/token.json`. That one token serves every repo on the machine. Set `GTM_SDK_CONFIG_DIR` to use another directory, or pass `clientSecretsPath` and `tokenPath` to the client.

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

The fastest way to write a spec is to build the entities once in the GTM UI, export the container, and run `gtm-sdk normalize export.json`. Or capture a live container with `gtm-sdk export --container GTM-XXXXXXX`. Keep customer-specific values in constant variables so the rest of the spec is reusable.

## Applying a spec

```bash
gtm-sdk apply --container GTM-XXXXXXX --workspace conversions-2026-09 --spec spec.json --dry-run
gtm-sdk apply --container GTM-XXXXXXX --workspace conversions-2026-09 --spec spec.json
gtm-sdk apply --container GTM-XXXXXXX --workspace conversions-2026-09 --spec spec.json --publish
```

Or from code:

```ts
import { GtmClient, applySpec, normalizeExport, formatPlan } from "@anthnyalxndr/gtm-sdk";

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
5. Checks the workspace for merge conflicts, creates a version, and publishes only with `--publish`.

`--dry-run` prints the plan and makes no write calls. What the dry run shows is exactly what apply does.

### What gets created implicitly

If an entity needs no information beyond its name, the engine creates it and marks the operation `(implicit)` in the plan. That covers the workspace, folders named in `parentFolderName`, and built-in variables referenced as `{{Page Path}}` or `{{Form ID}}`. Everything that needs a type or a value must be in the spec, and a reference to something that is neither in the spec nor in the container is an error. Containers are never created implicitly; use `createContainer()`.

The default workspace is never written to.

### Limits

- Tags built on custom or community templates (`cvt_*` types) are rejected by the normalizer. Import the template into the target container first; direct support is a backlog item.
- Trigger groups (`triggerReference` parameters) are rejected.
- The planner compares only the fields the spec provides. Fields stripped from an export, such as `monitoringMetadata`, are not corrected if someone changes them in the UI.
- The Tag Manager API has tight per-minute quotas. Every call is throttled and retried with backoff; large specs take a while.

## Conversion recipes

For the common onboarding case, recipes compile to spec fragments and go through the same engine:

```ts
import { GtmClient, applyConversions, formatPlan } from "@anthnyalxndr/gtm-sdk";

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

## Development

```bash
pnpm install
pnpm verify        # typecheck + tests
pnpm dev           # runs example.ts (dry run)
```

Pre-commit hooks run prettier, the typecheck, and the tests. The implementation plan and design notes are in `docs/superpowers/plans/2026-09-09-gtm-sdk.md`.

## License

Apache-2.0
