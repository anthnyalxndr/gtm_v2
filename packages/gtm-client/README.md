# @anthnyalxndr/gtm-client

An authenticated, throttled client for the Google Tag Manager API v2, built on Google's per-API `@googleapis/tagmanager` package. Use it from any project that needs to call Tag Manager from TypeScript or Node.

```bash
pnpm add @anthnyalxndr/gtm-client
```

## What it does

- **OAuth once, everywhere.** Client secrets and the token live in `~/.config/gtm-apply/` (override with `GTM_APPLY_CONFIG_DIR`, or pass paths to the constructor). First run opens a browser and stores the token; every later run on the machine reuses it. A revoked token produces an error that names the file to delete.
- **Throttle and retry.** `client.call(fn)` serializes requests with a minimum gap and retries 429 and 5xx with backoff. Every helper goes through it.
- **The raw service.** `client.service` is the generated `tagmanager_v2.Tagmanager` instance for anything not wrapped.
- **Typed helpers.** `listAccounts`, `listContainers` (every container of one account), `resolveContainer` (find a container by its `GTM-XXXXXXX` public id across every account you can see), `createContainer`.
- **A fake for tests.** `@anthnyalxndr/gtm-client/testing` exports `createFakeService`, an in-memory implementation of the API surface with workspace, version, and fingerprint semantics, so code built on the client can be tested without credentials.

## Usage

```ts
import { GtmClient, listAccounts, resolveContainer } from "@anthnyalxndr/gtm-client";

const client = new GtmClient();
await client.init();

for (const account of await listAccounts(client)) {
  console.log(account.accountId, account.name);
}

const ref = await resolveContainer(client, "GTM-XXXXXXX");
const tags = await client.call(() =>
  client.service.accounts.containers.workspaces.tags.list({
    parent: `${ref.path}/workspaces/1`,
  })
);
```

## Testing with the fake

```ts
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";

const { service, state } = createFakeService();
const client = new GtmClient({ service, minIntervalMs: 0 });
// state.calls records every method invoked; state.versions holds snapshots.
```

## Credentials file

Create an OAuth client of type "Desktop app" in Google Cloud, download the JSON, and save it as `~/.config/gtm-apply/client_secrets.json`. The token is written next to it on first run.

## License

Apache-2.0
