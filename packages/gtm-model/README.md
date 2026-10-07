# @anthnyalxndr/gtm-model

The shared Google Tag Manager model for the packages in this workspace. It holds types and plain data only; nothing here calls an API.

| Export | What it is |
|---|---|
| `ContainerType` | `"web" \| "server" \| "amp" \| "android" \| "ios"`, derived from a container's usage context. |
| `ContainerSpec`, `TagSpec`, `TriggerSpec`, `VariableSpec`, `FolderSpec`, `ClientSpec`, `TransformationSpec` | The container spec: a container export's shape with server-owned fields removed and id references replaced by names. This is the shape normalize and pull produce and apply takes. |
| `defineContainer`, `WebContainerSpec`, `ServerContainerSpec`, `AmpContainerSpec`, `MobileContainerSpec`, `TypedContainerSpec` | Authoring checks, chosen by `containerType` (web when absent). `defineContainer` rejects clients and transformations outside a server spec, and a tag that names a built-in trigger only another container type has, such as `Consent Initialization - All Pages` in a server spec. Its result is assignable to `ContainerSpec`. |
| `SpecSection`, `sectionsFor`, `SECTIONS_BY_CONTAINER_TYPE` | Which spec sections a container of each type can hold. Clients and transformations exist only in server containers. |
| `ContainerCatalog`, `CATALOGS`, `catalogFor`, `WEB_CATALOG`, `SERVER_CATALOG` | What Tag Manager offers each container type but the API does not list: `triggers.builtIn` (built-in trigger display name to fixed id), `triggers.types` (the trigger types it accepts) and `builtInVariables` (display name to API type). Web and server are read from our own template containers; AMP and mobile are not curated yet. |
| `builtInTypeForName`, `builtInTriggerIdForName`, `builtInTriggerNameForId` | Lookups that take an optional container type. A variable lookup without one searches every type, since names don't collide. A trigger lookup without one means web, since web and server both call their built-in trigger "All Pages". |
| `BUILT_IN_VARIABLES`, `BUILT_IN_TRIGGERS` | Kept for existing imports: every known built-in variable name, and the web built-in triggers. |
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
