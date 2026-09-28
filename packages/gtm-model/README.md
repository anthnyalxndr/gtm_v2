# @anthnyalxndr/gtm-model

The shared Google Tag Manager model for the packages in this workspace. It holds types and plain data only; nothing here calls an API.

| Export | What it is |
|---|---|
| `ContainerType` | `"web" \| "server" \| "amp" \| "android" \| "ios"`, derived from a container's usage context. |
| `ContainerSpec`, `TagSpec`, `TriggerSpec`, `VariableSpec`, `FolderSpec`, `ClientSpec`, `TransformationSpec`, `defineContainer` | The container spec: a container export's shape with server-owned fields removed and id references replaced by names. `defineContainer` is an identity helper that checks a spec written in TypeScript. |
| `SpecSection`, `sectionsFor`, `SECTIONS_BY_CONTAINER_TYPE` | Which spec sections a container of each type can hold. Clients and transformations exist only in server containers. |
| `BUILT_IN_VARIABLES`, `BUILT_IN_TRIGGERS` and their lookups | The catalog: built-in variable display names to API types, built-in trigger display names to their fixed ids. |
| Discovery types and `SCHEMAS` | Entity interfaces, string-literal unions for every enum field, and the schema table the validator in gtm-apply walks, generated from the Tag Manager API v2 Discovery document. |

```ts
import { defineContainer, type ContainerSpec } from "@anthnyalxndr/gtm-model";

export const spec: ContainerSpec = defineContainer({
  containerType: "web",
  tag: [{ name: "Custom HTML", type: "html", firingTriggerName: ["All Pages"] }],
});
```

## Regenerating the Discovery types

Google publishes no OpenAPI spec for Tag Manager, so the types come from the [Discovery document](https://tagmanager.googleapis.com/$discovery/rest?version=v2). A trimmed copy is committed under `scripts/discovery/`.

```bash
pnpm --filter @anthnyalxndr/gtm-model gen:discovery          # regenerate from the committed copy
pnpm --filter @anthnyalxndr/gtm-model gen:discovery --fetch  # refresh the copy from Google first
```

A test fails if the committed copy and `src/spec/generated/tagmanager-v2.ts` drift apart.

## What belongs here

Anything more than one package needs in order to describe a container. Code that reads or writes Tag Manager belongs in `gtm-client` or `gtm-apply`. `ApiSnapshotData` stays in gtm-apply because it is built on the `@googleapis/tagmanager` response types.
