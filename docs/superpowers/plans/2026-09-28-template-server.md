# Template - Server implementation plan (TASK-40)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Template - Server" container holds server-side counterparts of the Template - Web recipes, and the repo ships both libraries from one recipes package keyed by container type.

**Architecture:** The web container keeps sending GA4 events. With server tagging on, a Google tag carrying `server_container_url` sends them to the customer's tagging server. There a GA4 client claims each request, one GA4 tag forwards every claimed event, and one Google Ads conversion tag per recipe fires on the recipe's event name. The server template is a `ContainerSpec` in code, pushed to the container and pulled back into a committed `const` module, exactly as the web template is.

**Tech stack:** TypeScript, pnpm workspace, vitest, `@anthnyalxndr/gtm-apply` (specs, `GtmSnapshot`, `defineTrackingPlan`), `@anthnyalxndr/gtm-client` (API client and its in-memory fake), the Tag Manager MCP tools for one-time container creation.

**Spec:** TASK-40 (`backlog task view TASK-40 --plain`). Background: decision-10 (notes-trailer metadata), TASK-6 (server containers in apply and the library), TASK-17 (the web template and its package).

## What the reference containers contain

Read on 2026-09-28 from the MindScience Collective account (6314397568), Default Workspace of each. Patterns only; no value from them goes into the template.

**Server, GTM-P23F82XZ (workspace 17).**

- Clients: `GA4` (`gaaw_client`: server-managed `FPID` cookie, default paths on), `GTM` (`gtm_client`: serves the web container's `gtm.js` first-party, `allowedContainerIds` holds the web container id, geo resolution on), `GA4 - Measurement Protocol` (`mpaw_client` on `/mp/collect`).
- Tags: `GA4` (`sgtmgaaw`, measurement id from a constant, fires on trigger `GA4 Client`); `Conversion Linker` (`sgtmadscl`, fires on built-in trigger id `2147479574`); four `Google Ads - … (sGTM)` conversion tags (`sgtmadsct`, conversion id and label, conversion value and currency from event data on purchase).
- Triggers: `GA4 Client` (type `always`, Client Name equals GA4); `purchase` (custom event `_event` equals purchase, Client Name equals GA4); three page-view triggers that match `page_location` from event data.
- Variables: event data (`ed`) for value, currency, transaction id, page location; a request header; constants for the measurement id, web container id, cookie lifetime, currency and default value.
- One gallery template, Cookie Monster, used by nothing in the recipes.

**Web, GTM-MXK8K5KJ (workspace 30).**

- Two Google tags on Consent Initialization: `Google Tag - GTM` (direct to Google) and `Google Tag - sGTM`, whose `configSettingsTable` sets `server_container_url` to a constant holding the tagging server URL.
- Every GA4 event is sent twice: a `… - GTM` tag with the direct property's measurement id and a `… - sGTM` tag with the server property's measurement id. Google Ads conversions for course views fire on both sides.
- A Consent Mode gallery template (`cvt_…`), which the normalizer cannot convert yet (TASK-10, open PR #14).

**What this means for the template.** The client runs two GA4 properties and duplicates every event. A template should not. It routes one Google tag through the tagging server and lets the server forward GA4 and fire Google Ads, so each conversion is counted once.

## Recipe mapping

| Template - Web recipe | Web side with server tagging | Template - Server counterpart |
|---|---|---|
| `google_tag` | New web recipe `google_tag_server`, used instead of `google_tag`: the same Google tag plus `server_container_url` | `ga4_client`: GA4 client, `Client - GA4` trigger, `GA4` forwarding tag, `Conversion Linker` |
| `contact_form_submit` | Unchanged `GA4 - contact_form_submit`; plan omits the `googleAds` destination | `Event - contact_form_submit` trigger and `Ads - contact_form_submit` (`sgtmadsct`) |
| `call_click` | Unchanged `GA4 - call_click`; plan omits `googleAds` | `Event - call_click` and `Ads - call_click` |
| `email_click` | Unchanged `GA4 - email_click`; plan omits `googleAds` | `Event - email_click` and `Ads - email_click` |
| `maps_click` | Unchanged `GA4 - maps_click`; plan omits `googleAds` | `Event - maps_click` and `Ads - maps_click` |
| (none) | (none) | `web_container_client`: `GTM` client serving the web container first-party |

There is no server-side GA4 tag per recipe. The `GA4` tag forwards every event the GA4 client claims, so a per-recipe GA4 tag would double-count. The Measurement Protocol client and Cookie Monster are left out: neither has a web-template counterpart, and the lead-gen recipes don't use them.

**How one conversion flows.** The site pushes `contact_form_submit`. The web trigger `Custom Event - contact_form_submit` fires `GA4 - contact_form_submit`. Because the Google tag has `server_container_url`, the GA4 request goes to the tagging server. The `GA4` client claims it, which sets Client Name to `GA4` and Event Name to `contact_form_submit`. `Client - GA4` fires the `GA4` tag, which forwards the event to the same GA4 property. `Event - contact_form_submit` matches the event name and fires `Ads - contact_form_submit`. The web plan leaves out the `googleAds` destination, so the web `Ads - …` tag is never installed and the conversion counts once.

## Decisions the owner approves with this plan

1. **One package, keyed by container type.** Rename `packages/gtm-web-recipes` (`@anthnyalxndr/gtm-web-recipes`, private, unpublished) to `packages/gtm-recipes` (`@anthnyalxndr/gtm-recipes`). It exports `recipes = { web, server }` from the root and each library from subpaths `./web` and `./server`. Nothing outside this repo imports the package, so the rename costs only the in-repo references listed in Task 3. The alternative, a sibling `gtm-server-recipes`, duplicates the scripts and README for no gain.
2. **Server tagging on the web side is a separate web recipe, `google_tag_server`.** It adds tag `Google Tag - Server` and constant `Const - Server Container URL`. A plan picks `google_tag` or `google_tag_server`, never both; both would load the same Google tag twice. `compilePlan` reports a plan that names both (Task 5).
3. **The server `GA4` tag leaves its measurement id empty,** so it uses the id on the incoming event. This keeps the server template free of a second measurement-id constant. Task 4 verifies the behaviour against the Tag Manager tag template before the push; if it doesn't hold, the tag gets `measurementId` = `{{Const - GA4 Measurement ID}}` instead.
4. **Include `web_container_client` as an optional server recipe.** The reference serves `gtm.js` first-party; it's cheap and customers can skip it.
5. **Publishing.** Each push creates an unpublished version. The owner decides whether to publish after reviewing it, as with Template - Web version 4.

## Global constraints

- Account for both templates: anthnyalxndr.com, accountId `6004731770`. Template - Web is `GTM-TPLKC7QP`.
- Nothing is written to account `6314397568` (MindScience Collective), and no id, domain or value from it appears in any committed file.
- Tag Manager allows 30 write requests per user per minute; pushes run with `minIntervalMs` 2500. Reads also have a per-minute quota; scripts that read many entities use the same throttle.
- Library metadata uses the notes-trailer encoding (decision-10); every customer value is a `Const - …` placeholder with `kind`, `example` and `pattern`.
- Agent commands: `pnpm exec` is denied; run package binaries with `pnpm --filter <pkg> exec …` from the repo root.
- Every production change comes with tests; `pnpm verify` passes before each commit.
- Test snippets read `compilePlan(...).issues[i].message`. Check the issue type exported by gtm-apply (`formatIssue` formats it) and adapt the accessor, not the assertion.

## Review focus

1. A plan that selects both `google_tag` and `google_tag_server`: the owner expects an error from `compilePlan`, not two Google tags. Test in Task 5.
2. A web spec that names a server-only built-in trigger, or a server spec that names `Consent Initialization - All Pages`: expect an unresolved-trigger error, not a silent id. Test in Task 2.
3. Pulling a server container whose tag fires on `2147479574`: expect the built-in name in the spec, not "Unknown trigger id". Test in Task 2.
4. A server plan with `web_container_client` whose `Const - Web Container ID` is left at `<GTM-XXXXXXX>`: expect the unfilled-placeholder issue, like the web constants. Test in Task 4.
5. The web template after `google_tag_server` is added: existing plans that select `google_tag` must apply exactly as before. Test in Task 5 (the existing apply test stays unchanged and passes).

---

### Task 1: The Template - Server container exists

**Files:** none in the repo; task notes only.

- [ ] **Step 1: Create the container** with the Tag Manager MCP: `gtm_container` action `create`, accountId `6004731770`, `createOrUpdateConfig: { name: "Template - Server", usageContext: ["server"] }`. No tagging server URL: a template never serves traffic.
- [ ] **Step 2: Record the result**: `backlog task edit TASK-40 --append-notes "Template - Server created: GTM-…, containerId …"` and check AC #5 with `--check-ac 5`.
- [ ] **Step 3: Confirm it's readable** with `gtm_container get` and that `usageContext` is `["server"]`.

### Task 2: Built-in triggers are keyed by container type

**Files:**
- Modify: `packages/gtm-apply/src/spec/catalog.ts` (the `BUILT_IN_TRIGGERS` block)
- Modify: `packages/gtm-apply/src/spec/convert.ts` (`emptyState`)
- Modify: `packages/gtm-apply/src/spec/normalize.ts` (trigger name map; compute `containerType` before it)
- Modify: callers of `emptyState()` found with `grep -rn "emptyState(" packages/gtm-apply/src`
- Modify: `packages/gtm-apply/src/index.ts` (export `builtInTriggersFor`)
- Test: `packages/gtm-apply/test/built-in-triggers.test.ts`

**Interfaces:**
- Produces: `BUILT_IN_TRIGGERS_BY_TYPE: Readonly<Record<ContainerType, Readonly<Record<string, string>>>>`, `builtInTriggersFor(type: ContainerType = "web"): Readonly<Record<string, string>>`, `emptyState(containerType: ContainerType = "web"): ExistingState`. `BUILT_IN_TRIGGERS` stays exported as the web map so existing imports keep working.

- [ ] **Step 1: Discover the server built-in trigger's display name from our own container.** Task 1 created Template - Server. Open `https://tagmanager.google.com/#/container/accounts/6004731770/containers/<new containerId>/workspaces` in Claude in Chrome, start a new tag, open the trigger picker and record the name of each built-in trigger listed. Cancel the tag without saving. The reference's Conversion Linker fires on id `2147479574`; if the picker shows more than one built-in, find each id by saving a paused scratch tag on it, reading `firingTriggerId` with `gtm_tag get`, then deleting the tag. Write the names and ids into the task notes with `backlog task edit TASK-40 --append-notes "…"`. The code below uses `SERVER_ALL_PAGES_NAME` for the name found.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  BUILT_IN_TRIGGERS,
  builtInTriggersFor,
  normalizeExport,
} from "../src/index.js";

// The display name recorded in Step 1.
const SERVER_ALL_PAGES_NAME = "<name from Step 1>";

describe("built-in triggers by container type", () => {
  it("keeps the web map as the default export", () => {
    expect(builtInTriggersFor("web")).toEqual(BUILT_IN_TRIGGERS);
    expect(builtInTriggersFor()).toEqual(BUILT_IN_TRIGGERS);
  });

  it("maps the server built-in trigger and none of the web ones", () => {
    const server = builtInTriggersFor("server");
    expect(server[SERVER_ALL_PAGES_NAME]).toBe("2147479574");
    expect(server["Consent Initialization - All Pages"]).toBeUndefined();
  });

  it("names a server tag's built-in trigger when normalizing a server export", () => {
    const spec = normalizeExport({
      containerVersion: {
        container: { usageContext: ["server"] },
        tag: [{ name: "Conversion Linker", type: "sgtmadscl", firingTriggerId: ["2147479574"] }],
      },
    });
    expect(spec.tag?.[0].firingTriggerName).toEqual([SERVER_ALL_PAGES_NAME]);
  });

  it("rejects a web-only built-in trigger in a server export", () => {
    expect(() =>
      normalizeExport({
        containerVersion: {
          container: { usageContext: ["server"] },
          tag: [{ name: "T", type: "sgtmgaaw", firingTriggerId: ["2147479572"] }],
        },
      })
    ).toThrow(/Unknown trigger id 2147479572/);
  });
});
```

Check the real `normalizeExport` signature and export name in `packages/gtm-apply/src/index.ts` before running; adjust the call, not the assertions.

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/built-in-triggers.test.ts`
Expected: FAIL, `builtInTriggersFor` is not exported.

- [ ] **Step 4: Implement**

In `catalog.ts`, replace the `BUILT_IN_TRIGGERS` block:

```ts
/**
 * GTM built-in triggers by container type: the display name to the fixed
 * trigger id. They exist in every container of that type but are never
 * listed as trigger resources, so a spec names them like any trigger and the
 * engine maps the name to the id. Verified against containers we own.
 */
export const BUILT_IN_TRIGGERS_BY_TYPE: Readonly<
  Record<ContainerType, Readonly<Record<string, string>>>
> = {
  web: {
    "All Pages": "2147479553",
    "Consent Initialization - All Pages": "2147479572",
    "Initialization - All Pages": "2147479573",
  },
  server: {
    [SERVER_ALL_PAGES_NAME]: "2147479574", // replace the key with the literal name from Step 1
  },
  amp: {},
  android: {},
  ios: {},
};

/** The web map, kept for existing imports. */
export const BUILT_IN_TRIGGERS = BUILT_IN_TRIGGERS_BY_TYPE.web;

export function builtInTriggersFor(type: ContainerType = "web"): Readonly<Record<string, string>> {
  return BUILT_IN_TRIGGERS_BY_TYPE[type];
}
```

Import `ContainerType` from `../snapshot/types.js`. Give `builtInTriggerIdForName` and `builtInTriggerNameForId` an optional `type: ContainerType = "web"` argument that reads `builtInTriggersFor(type)`. In `convert.ts`, change `emptyState()` to `emptyState(containerType: ContainerType = "web")` and seed `triggers` from `builtInTriggersFor(containerType)`; pass `spec.containerType` at each caller. In `normalize.ts`, move the `containerTypeFrom(cv, input)` call above the `triggerNames` map and build the map from `builtInTriggersFor(containerType ?? "web")`.

- [ ] **Step 5: Run the test and the package suite**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run`
Expected: PASS, including the existing built-in trigger tests for web.

- [ ] **Step 6: Commit**

```bash
git add packages/gtm-apply
git commit -m "feat(spec): key built-in triggers by container type and add the server trigger (TASK-40)"
```

### Task 3: One recipes package keyed by container type

**Files:**
- Move: `packages/gtm-web-recipes/` to `packages/gtm-recipes/` (`git mv`)
- Move: `scripts/template.ts` to `scripts/web/template.ts`; `src/library.ts` to `src/web/library.ts`; `src/index.ts` to `src/web/index.ts`; `plan.example.ts` to `examples/web.plan.ts`; `test/library.test.ts` to `test/web.test.ts`
- Create: `src/index.ts`, `scripts/containers.ts`
- Modify: `package.json`, `scripts/pull.ts`, `scripts/push.ts`, `scripts/sample.ts`, `scripts/write-library.ts`, `README.md`, `tsconfig.json`, `tsconfig.test.json`
- Modify references: root `README.md`, `packages/gtm-apply/README.md`, `docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md`, `pnpm-lock.yaml` (via `pnpm install`). Leave dated plans under `docs/superpowers/plans/` as history.
- Test: `test/web.test.ts` (moved, imports updated), `test/containers.test.ts`

**Interfaces:**
- Produces: `CONTAINERS: Record<"web" | "server", { publicId: string; libraryPath: string; template: () => Promise<GtmSnapshot> }>` in `scripts/containers.ts`; `recipes: { web: GtmSnapshot<…>; server: GtmSnapshot<…> }` from `src/index.ts`; subpath exports `@anthnyalxndr/gtm-recipes/web` and `/server`, each exporting `data`, `library`, `RecipeName`, `ConstantName`.

- [ ] **Step 1: Move the files** with `git mv` as listed, rename the package in `package.json` to `@anthnyalxndr/gtm-recipes`, and set `exports`:

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "default": "./dist/index.js" },
  "./web": { "types": "./dist/web/index.d.ts", "import": "./dist/web/index.js", "default": "./dist/web/index.js" },
  "./server": { "types": "./dist/server/index.d.ts", "import": "./dist/server/index.js", "default": "./dist/server/index.js" }
}
```

- [ ] **Step 2: Write the failing test** `test/containers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { recipes } from "../src/index.js";
import { library as web } from "../src/web/index.js";

describe("gtm-recipes", () => {
  it("keys each library by container type", () => {
    expect(recipes.web).toBe(web);
    expect(recipes.web.containerType).toBe("web");
  });
});
```

Update `test/web.test.ts` imports to `../src/web/index.js` and `../examples/web.plan.js`, and its `describe` title to `gtm-recipes web`.

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm --filter @anthnyalxndr/gtm-recipes exec vitest run`
Expected: FAIL, `../src/index.js` has no `recipes`.

- [ ] **Step 4: Implement** `src/index.ts` (server is added in Task 4):

```ts
import { library as web } from "./web/index.js";

/** Every recipe library in this package, keyed by container type. */
export const recipes = { web } as const;
export type { RecipeName as WebRecipeName, ConstantName as WebConstantName } from "./web/index.js";
```

`scripts/containers.ts`:

```ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { GtmSnapshot } from "@anthnyalxndr/gtm-apply";
import { templateSnapshot as webTemplate } from "./web/template.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export type LibraryType = "web";

/** The template container, committed module and in-code template for each library. */
export const CONTAINERS: Record<
  LibraryType,
  { publicId: string; libraryPath: string; template: () => Promise<GtmSnapshot> }
> = {
  web: {
    publicId: process.env.GTM_LIBRARY_WEB ?? "GTM-TPLKC7QP",
    libraryPath: join(root, "src", "web", "library.ts"),
    template: webTemplate,
  },
};

/** The library named by the first CLI argument; exits with usage on anything else. */
export function libraryFromArgv(argv: readonly string[]): LibraryType {
  const type = argv.find((a) => !a.startsWith("-"));
  if (type && type in CONTAINERS) return type as LibraryType;
  console.error(`Usage: <script> <${Object.keys(CONTAINERS).join("|")}> [--dry-run]`);
  process.exit(2);
}
```

Change `write-library.ts` to take the path: `writeLibrary(library: GtmSnapshot, path: string)`. Change `pull.ts`, `push.ts` and `sample.ts` to call `libraryFromArgv(process.argv.slice(2))` and read `publicId`, `libraryPath` and `template` from `CONTAINERS[type]`. Keep `GTM_LIBRARY_WORKSPACE`. Scripts become `pnpm pull web`, `pnpm push web --dry-run`, `pnpm sample web`.

- [ ] **Step 5: Run the checks**

Run: `pnpm install && pnpm verify`
Expected: PASS. Then `pnpm --filter @anthnyalxndr/gtm-recipes push web --dry-run` lists only `[=]` lines for GTM-TPLKC7QP (no changes), proving the move changed nothing in the web template.

- [ ] **Step 6: Update references and commit.** Replace `gtm-web-recipes` with `gtm-recipes` (and `pnpm pull` with `pnpm pull web`) in the files listed above. Re-run `pnpm verify`.

```bash
git add -A packages/gtm-recipes packages/gtm-web-recipes README.md packages/gtm-apply/README.md docs/superpowers/specs pnpm-lock.yaml
git commit -m "refactor(recipes): one gtm-recipes package with libraries keyed by container type (TASK-40)"
```

### Task 4: The server template and its library

**Files:**
- Create: `packages/gtm-recipes/scripts/server/template.ts`, `src/server/index.ts`, `src/server/library.ts` (generated), `examples/server.plan.ts`, `test/server.test.ts`
- Modify: `scripts/containers.ts` (add `server`), `src/index.ts` (add `server`)

**Interfaces:**
- Consumes: `builtInTriggersFor("server")` from Task 2 (the name recorded there as `SERVER_ALL_PAGES_NAME`, used below as `SERVER_ALL_PAGES`); `CONTAINERS`, `libraryFromArgv` from Task 3.
- Produces: server recipes `ga4_client`, `contact_form_submit`, `call_click`, `email_click`, `maps_click`, `web_container_client`; constants `Const - Google Ads Conversion ID`, `Const - Google Ads - <recipe> Conversion Label` (four), `Const - Web Container ID`.

- [ ] **Step 1: Verify decision 3.** Read the GA4 server tag's fields with the MCP (`gtm_tag get` on the reference server's `GA4` tag gives only its values), and read Google's "Server-side tagging: GA4 tag" help page. Confirm that an empty Measurement ID makes the tag use the id on the event. Record the finding and link in the task notes. If it doesn't hold, add `Const - GA4 Measurement ID` (same placeholder entry as the web template) and set `measurementId` on the `GA4` tag.

- [ ] **Step 2: Write the failing test** `test/server.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { applyPlan, compilePlan, defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "../src/server/index.js";
import { recipes } from "../src/index.js";
import plan from "../examples/server.plan.js";

const CONVERSIONS = ["contact_form_submit", "call_click", "email_click", "maps_click"] as const;

describe("gtm-recipes server", () => {
  it("is a server library keyed under recipes.server with a clean lint", () => {
    expect(recipes.server).toBe(library);
    expect(library.containerType).toBe("server");
    expect(library.recipeNames).toEqual(["ga4_client", ...CONVERSIONS, "web_container_client"]);
    expect(library.lint()).toEqual([]);
  });

  it("forwards GA4 once from the GA4 client and links conversions", () => {
    const base = library.recipe("ga4_client")!;
    expect(base.roots.map((r) => r.name).sort()).toEqual(["Conversion Linker", "GA4", "GA4"]);
    expect(library.tags.get("GA4")?.type).toBe("sgtmgaaw");
    expect(library.tags.get("GA4")?.firingTriggerName).toEqual(["Client - GA4"]);
    expect(library.tags.get("Conversion Linker")?.type).toBe("sgtmadscl");
    expect([...library.tags.values()].filter((t) => t.type === "sgtmgaaw")).toHaveLength(1);
  });

  it("gives each conversion recipe one event trigger and one server Ads tag", () => {
    for (const name of CONVERSIONS) {
      const recipe = library.recipe(name)!;
      expect(recipe.roots.map((r) => r.name)).toEqual([`Ads - ${name}`]);
      expect(library.tags.get(`Ads - ${name}`)?.type).toBe("sgtmadsct");
      expect(library.tags.get(`Ads - ${name}`)?.firingTriggerName).toEqual([`Event - ${name}`]);
      expect(recipe.dependencies[0].constant).toBe(`Const - Google Ads - ${name} Conversion Label`);
    }
  });

  it("reports an unfilled web container id", () => {
    const unfilled = compilePlan(
      library,
      defineTrackingPlan(library, { recipes: ["web_container_client"] })
    );
    expect(unfilled.issues.map((i) => i.message).join("\n")).toContain("Const - Web Container ID");
  });

  it("applies the example plan to a server container", async () => {
    const { service, state } = createFakeService({
      containers: [
        {
          accountId: "1",
          containerId: "12",
          publicId: "GTM-SRV",
          name: "customer.com - Server",
          usageContext: ["server"],
        },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const outcome = await applyPlan(client, { library, plan, container: "GTM-SRV", workspace: "onboarding" });
    expect(outcome.plan.errors).toEqual([]);
    const snap = latestSnapshot(state);
    expect(snap.client.map((c) => c.name)).toEqual(["GA4"]);
    expect(snap.tag.map((t) => t.name).sort()).toEqual([
      "Ads - call_click",
      "Ads - contact_form_submit",
      "Conversion Linker",
      "GA4",
    ]);
    expect(snap.tag.find((t) => t.name === "Conversion Linker")?.firingTriggerId).toEqual([
      "2147479574",
    ]);
  });
});
```

The `ga4_client` roots are the `GA4` client, the `GA4` tag and the `Conversion Linker` tag, so the expected sorted names are `["Conversion Linker", "GA4", "GA4"]`. Check `createFakeService`'s container fields in `packages/gtm-client/src/testing.ts` for `usageContext`; add it there, with a test, if the fake doesn't take it yet.

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm --filter @anthnyalxndr/gtm-recipes exec vitest run test/server.test.ts`
Expected: FAIL, `../src/server/index.js` does not exist.

- [ ] **Step 4: Write the template** `scripts/server/template.ts`. Reuse the helper shapes from `scripts/web/template.ts` (`tpl`, `bool`, `declares`, `input`, `label`, `condition`, `dependencies`); move the shared ones into `scripts/shared.ts` and import them from both templates.

```ts
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import {
  applySpec,
  defineContainer,
  GtmSnapshot,
  manifestVariable,
  type ClientSpec,
  type TagSpec,
  type TriggerSpec,
} from "@anthnyalxndr/gtm-apply";
import { bool, condition, declares, dependencies, input, label, labelConstant, tpl } from "../shared.js";

/**
 * The Server Template container ("Template - Server") as a ContainerSpec:
 * server-side counterparts of the web lead-gen recipes. The web container
 * sends GA4 events through a Google tag with server_container_url; here the
 * GA4 client claims them, one GA4 tag forwards every event, and each
 * conversion recipe fires a server Google Ads conversion tag on its event name.
 */

const SERVER_ALL_PAGES = "<name from Task 2 Step 1>";

const serverEvent = (recipe: string): TriggerSpec => ({
  name: `Event - ${recipe}`,
  type: "customEvent",
  notes: `Fires when the GA4 client claims the ${recipe} event from the web container.`,
  customEventFilter: [condition("equals", "{{_event}}", recipe)],
  filter: [condition("equals", "{{Client Name}}", "GA4")],
});

const serverConversion = (recipe: string): TagSpec => ({
  name: `Ads - ${recipe}`,
  type: "sgtmadsct",
  firingTriggerName: [`Event - ${recipe}`],
  notes: declares(`Records the ${recipe} conversion in Google Ads from the tagging server.`, recipe),
  parameter: [
    tpl("conversionId", "{{Const - Google Ads Conversion ID}}"),
    tpl("conversionLabel", `{{${labelConstant(recipe)}}}`),
    bool("enableConversionLinker", true),
    bool("enableProductReporting", false),
    bool("enableNewCustomerReporting", false),
    bool("rdp", false),
  ],
});

const ga4Client: ClientSpec = {
  name: "GA4",
  type: "gaaw_client",
  notes: declares(
    "Claims GA4 requests sent by the web container's Google tag and keeps the client id in a server-set FPID cookie.",
    "ga4_client"
  ),
  parameter: [
    bool("activateDefaultPaths", true),
    tpl("cookieManagement", "server"),
    tpl("cookieName", "FPID"),
    tpl("cookieDomain", "auto"),
    tpl("cookiePath", "/"),
    tpl("cookieMaxAgeInSec", "34560000"),
    bool("migrateFromJsClientId", false),
  ],
};

const gtmClient: ClientSpec = {
  name: "GTM",
  type: "gtm_client",
  notes: declares(
    "Serves the web container's gtm.js from the tagging server's first-party domain.",
    "web_container_client"
  ),
  parameter: [
    {
      type: "list",
      key: "allowedContainerIds",
      list: [{ type: "map", map: [tpl("containerId", "{{Const - Web Container ID}}")] }],
    },
    bool("activateResponseCompression", true),
    bool("activateDependencyServing", true),
    bool("activateGeoResolution", false),
  ],
};

export const template = defineContainer({
  containerType: "server",
  variable: [
    manifestVariable({
      conventions: {},
      recipes: {
        ga4_client: { description: "GA4 client, GA4 forwarding tag and Conversion Linker; base for every recipe." },
        contact_form_submit: { description: "Google Ads conversion on the contact_form_submit event.", dependencies: dependencies("contact_form_submit") },
        call_click: { description: "Google Ads conversion on the call_click event.", dependencies: dependencies("call_click") },
        email_click: { description: "Google Ads conversion on the email_click event.", dependencies: dependencies("email_click") },
        maps_click: { description: "Google Ads conversion on the maps_click event.", dependencies: dependencies("maps_click") },
        web_container_client: { description: "Serves the web container first-party from the tagging server." },
      },
    }),
    input(
      "Const - Google Ads Conversion ID",
      "<XXXXXXXXX>",
      "The bare numeric conversion id (the digits after AW- in Google Ads).",
      { kind: "adsConversionId", example: "123456789", pattern: "^[0-9]+$" }
    ),
    label("contact_form_submit"),
    label("call_click"),
    label("email_click"),
    label("maps_click"),
    input(
      "Const - Web Container ID",
      "<GTM-XXXXXXX>",
      "Public id of the web container this tagging server serves.",
      { kind: "gtmPublicId", example: "GTM-ABC1234", pattern: "^GTM-[A-Z0-9]+$" }
    ),
  ],
  trigger: [
    {
      name: "Client - GA4",
      type: "always",
      notes: "Fires for every event the GA4 client claims.",
      filter: [condition("equals", "{{Client Name}}", "GA4")],
    },
    serverEvent("contact_form_submit"),
    serverEvent("call_click"),
    serverEvent("email_click"),
    serverEvent("maps_click"),
  ],
  client: [ga4Client, gtmClient],
  tag: [
    {
      name: "GA4",
      type: "sgtmgaaw",
      firingTriggerName: ["Client - GA4"],
      notes: declares(
        "Forwards every event the GA4 client claims to GA4, using the measurement id on the event.",
        "ga4_client"
      ),
      parameter: [
        tpl("epToIncludeDropdown", "all"),
        tpl("upToIncludeDropdown", "all"),
        bool("redactVisitorIp", false),
      ],
    },
    {
      name: "Conversion Linker",
      type: "sgtmadscl",
      firingTriggerName: [SERVER_ALL_PAGES],
      notes: declares("Sets the Google Ads click cookies from the tagging server.", "ga4_client"),
      parameter: [bool("enableLinkerParams", false), bool("enableCookieOverrides", false)],
    },
    ...(["contact_form_submit", "call_click", "email_click", "maps_click"] as const).map(serverConversion),
  ],
});

export async function templateSnapshot(): Promise<GtmSnapshot> {
  const { service } = createFakeService({
    containers: [
      { accountId: "1", containerId: "20", publicId: "GTM-SAMPLE", name: "Server Template (sample)", usageContext: ["server"] },
    ],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, { container: "GTM-SAMPLE", workspace: "sample", spec: template });
  return new GtmSnapshot(client, { container: "GTM-SAMPLE" }).init();
}
```

Confirm `ClientSpec` and the spec's `client` field names against `packages/gtm-apply/src/spec/types.ts`, and that `gtm_client`'s `allowedContainerIds` list-item key matches the reference export (read `jq '.client[] | select(.type=="gtm_client") | .parameter' ref-server.snapshot.json` from the session scratchpad, or re-pull the reference read-only). Fix the key, not the test.

- [ ] **Step 5: Wire it in.** Add `server` to `CONTAINERS` (`publicId: process.env.GTM_LIBRARY_SERVER ?? "<GTM id from Task 1>"`, `libraryPath: src/server/library.ts`, `template: serverTemplate`) and widen `LibraryType` to `"web" | "server"`. Create `src/server/index.ts` exactly like `src/web/index.ts` with `./library.js`. Add `server` to `recipes` in `src/index.ts` and export `ServerRecipeName`, `ServerConstantName`. Add `./server` in `package.json` exports. Write `examples/server.plan.ts`:

```ts
import { defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "../src/server/index.js";

export default defineTrackingPlan(library, {
  recipes: ["ga4_client", "contact_form_submit", "call_click"],
  constants: {
    "Const - Google Ads Conversion ID": "123456789",
    "Const - Google Ads - contact_form_submit Conversion Label": "AbCdEfGhIj",
    "Const - Google Ads - call_click Conversion Label": "KlMnOpQrSt",
  },
});
```

- [ ] **Step 6: Generate the offline library and run the tests**

Run: `pnpm --filter @anthnyalxndr/gtm-recipes sample server && pnpm verify`
Expected: `src/server/library.ts` written with six recipes; all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/gtm-recipes
git commit -m "feat(recipes): server template with GA4 client, forwarding and server Google Ads conversions (TASK-40)"
```

### Task 5: The web template can route through a tagging server

**Files:**
- Modify: `packages/gtm-recipes/scripts/web/template.ts`, `test/web.test.ts`
- Modify: `packages/gtm-apply/src/plan/…` (the file that builds `compilePlan` issues; find with `grep -rn "export function compilePlan" packages/gtm-apply/src`)
- Test: `packages/gtm-apply/test/compile-plan-conflicts.test.ts`

**Interfaces:**
- Produces: web recipe `google_tag_server`; web constant `Const - Server Container URL` (`kind: serverContainerUrl`, `example: https://sgtm.example.com`, `pattern: ^https://[^/]+$`); manifest field `conflicts?: string[]` on a recipe entry, read by `compilePlan`.

- [ ] **Step 1: Write the failing tests.** In `packages/gtm-apply/test/compile-plan-conflicts.test.ts`, build a two-recipe library with the fake (copy the setup from an existing `compilePlan` test in that folder), declare `conflicts: ["a"]` on recipe `b` in its manifest, and assert:

```ts
expect(compilePlan(lib, defineTrackingPlan(lib, { recipes: ["a", "b"] })).issues).toContainEqual(
  expect.objectContaining({ message: expect.stringContaining('"b" conflicts with "a"') })
);
expect(compilePlan(lib, defineTrackingPlan(lib, { recipes: ["b"] })).issues).toEqual([]);
```

In `test/web.test.ts`, add:

```ts
it("offers google_tag_server, which sends to a tagging server and excludes google_tag", () => {
  const tag = library.tags.get("Google Tag - Server")!;
  expect(tag.type).toBe("googtag");
  expect(JSON.stringify(tag.parameter)).toContain("server_container_url");
  expect(JSON.stringify(tag.parameter)).toContain("{{Const - Server Container URL}}");
  expect(library.recipe("google_tag_server")?.conflicts).toEqual(["google_tag"]);
  const both = compilePlan(library, defineTrackingPlan(library, { recipes: ["google_tag", "google_tag_server"] }));
  expect(both.issues.some((i) => i.message.includes("conflicts"))).toBe(true);
});
```

Add `"google_tag_server"` after `"google_tag"` in the file's `RECIPES` array only where the test lists all recipe names, and add `"Const - Server Container URL"` to the expected `constantNames`. The existing apply test stays as it is (review focus 5).

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/compile-plan-conflicts.test.ts` and `pnpm --filter @anthnyalxndr/gtm-recipes exec vitest run test/web.test.ts`
Expected: FAIL on the missing `conflicts` support and the missing recipe.

- [ ] **Step 3: Implement.** Add `conflicts?: string[]` to the manifest recipe entry type and to the parsed recipe; in `compilePlan`, for each selected recipe, report `Recipe "<r>" conflicts with "<other>"; pick one` for every selected name in its `conflicts`. In `scripts/web/template.ts` add the constant and:

```ts
{
  name: "Google Tag - Server",
  type: "googtag",
  firingTriggerName: ["Initialization - All Pages"],
  consentSettings: notNeeded,
  parameter: [
    tpl("tagId", "{{Const - GA4 Measurement ID}}"),
    {
      type: "list",
      key: "configSettingsTable",
      list: [
        {
          type: "map",
          map: [tpl("parameter", "server_container_url"), tpl("parameterValue", "{{Const - Server Container URL}}")],
        },
      ],
    },
  ],
  notes: declares(
    "Loads the Google tag on every page and sends its hits to the customer's tagging server. Use instead of the Google Tag, never with it. Leave the googleAds destination out of the web plan; the server template fires Google Ads.",
    "google_tag_server"
  ),
},
```

with manifest entry `google_tag_server: { description: "Google tag on Initialization, sent through a tagging server; use instead of google_tag.", conflicts: ["google_tag"] }`.

- [ ] **Step 4: Run the suite**

Run: `pnpm --filter @anthnyalxndr/gtm-recipes sample web && pnpm verify`
Expected: PASS. `pnpm sample web` rewrites the web library offline for the tests; Task 6 replaces it with the real pull.

- [ ] **Step 5: Commit**

```bash
git add packages/gtm-apply packages/gtm-recipes
git commit -m "feat(recipes): google_tag_server sends web hits to a tagging server; plans reject conflicting recipes (TASK-40)"
```

### Task 6: Push both templates and pull the real libraries

**Files:** `packages/gtm-recipes/src/web/library.ts`, `packages/gtm-recipes/src/server/library.ts` (generated)

- [ ] **Step 1: Dry runs.** `pnpm --filter @anthnyalxndr/gtm-recipes push server --dry-run` lists only additions on the new container. `push web --dry-run` lists `Google Tag - Server`, `Const - Server Container URL` and the manifest change, and no removals.
- [ ] **Step 2: Push.** `push server`, then `push web`. Each creates an unpublished version named `recipes-<date>`. Ask the owner whether to publish (decision 5).
- [ ] **Step 3: Pull.** `pull server` and `pull web` write both libraries with no lint findings. Check AC #6 and #7.
- [ ] **Step 4: Check for client values.** Run `git grep -niE "6314397568|240645963|230742313|GTM-P23F82XZ|GTM-MXK8K5KJ|mindscience" -- packages` and expect no matches. Then take the reference containers' measurement ids, Google Ads conversion id and labels, and tagging server domain from the read-only dump (never write them into a file in the repo), and `git grep -F` each one over `packages docs backlog`; expect no matches. Check AC #8.
- [ ] **Step 5: Verify and commit.** `pnpm verify`, then:

```bash
git add packages/gtm-recipes/src
git commit -m "feat(recipes): pull the real Template - Server and Template - Web libraries (TASK-40)"
```

### Task 7: Docs and hand-off

**Files:** `packages/gtm-recipes/README.md`

- [ ] **Step 1: Rewrite the README** around both libraries: a section per container type with its recipe table, the "How one conversion flows" paragraph from this plan, the `google_tag` versus `google_tag_server` rule, the web plan's `googleAds` destination rule with server tagging, and the script usage (`pnpm pull web|server`, `pnpm push web|server`, `pnpm sample web|server`).
- [ ] **Step 2:** `pnpm verify`, check AC #9, append notes, and move TASK-40 to Review with a final summary (`backlog instructions task-finalization`).
- [ ] **Step 3: Commit and open a PR** against `main`; the owner merges.
