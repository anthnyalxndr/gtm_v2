import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { GtmClient } from "./client.js";

export interface ContainerRef {
  accountId: string;
  containerId: string;
  path: string;
  name: string;
  publicId: string;
  /** Container.usageContext, e.g. ["web"] or ["server"]. */
  usageContext: string[];
}

type Container = tagmanager_v2.Schema$Container;

function toRef(c: Container, publicId: string): ContainerRef | null {
  if (!c.accountId || !c.containerId) return null;
  return {
    accountId: c.accountId,
    containerId: c.containerId,
    path: c.path ?? `accounts/${c.accountId}/containers/${c.containerId}`,
    name: c.name ?? "",
    publicId,
    usageContext: c.usageContext ?? [],
  };
}

/** Find a container by its public id (GTM-XXXXXXX) across every account the user can see. */
export async function resolveContainer(client: GtmClient, publicId: string): Promise<ContainerRef> {
  const service = client.service;
  const accountsRes = await client.call(() => service.accounts.list());
  for (const account of accountsRes.data.account ?? []) {
    const parent = account.path ?? `accounts/${account.accountId}`;
    const containersRes = await client.call(() => service.accounts.containers.list({ parent }));
    for (const c of containersRes.data.container ?? []) {
      if (c.publicId === publicId && c.accountId && c.containerId) {
        return {
          accountId: c.accountId,
          containerId: c.containerId,
          path: c.path ?? `accounts/${c.accountId}/containers/${c.containerId}`,
          name: c.name ?? "",
          publicId,
          usageContext: c.usageContext ?? [],
        };
      }
    }
  }
  throw new Error(`No accessible container with public id ${publicId}`);
}

/** Every container in one account, in the API's listing order. */
export async function listContainers(
  client: GtmClient,
  accountId: string
): Promise<ContainerRef[]> {
  const res = await client.call(() =>
    client.service.accounts.containers.list({ parent: `accounts/${accountId}` })
  );
  const refs: ContainerRef[] = [];
  for (const c of res.data.container ?? []) {
    if (!c.publicId) continue;
    const ref = toRef(c, c.publicId);
    if (ref) refs.push(ref);
  }
  return refs;
}

/**
 * Create a container. Explicit by design: the spec engine never creates
 * containers implicitly.
 */
export async function createContainer(
  client: GtmClient,
  accountId: string,
  name: string,
  usageContext: string[] = ["web"]
): Promise<ContainerRef> {
  const service = client.service;
  const res = await client.call(() =>
    service.accounts.containers.create({
      parent: `accounts/${accountId}`,
      requestBody: { name, usageContext },
    })
  );
  const c = res.data;
  if (!c.accountId || !c.containerId || !c.publicId) {
    throw new Error(`Container create returned an incomplete container for "${name}"`);
  }
  return {
    accountId: c.accountId,
    containerId: c.containerId,
    path: c.path ?? `accounts/${c.accountId}/containers/${c.containerId}`,
    name: c.name ?? name,
    publicId: c.publicId,
    usageContext: c.usageContext ?? usageContext,
  };
}
