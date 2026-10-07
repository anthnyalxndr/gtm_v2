import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { GtmClient } from "./client.js";
import { httpStatus } from "./throttle.js";

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

/**
 * Find a container by its public id (GTM-XXXXXXX).
 *
 * Fast path: one accounts.containers.lookup call with tagId. When that answers
 * 404 or 403, or names a container with a different public id, fall back to
 * listing every account and its containers. Any other lookup error propagates.
 */
export async function resolveContainer(client: GtmClient, publicId: string): Promise<ContainerRef> {
  const service = client.service;
  const found = await lookupByTagId(client, publicId);
  if (found) return found;

  const accountsRes = await client.call(() => service.accounts.list());
  for (const account of accountsRes.data.account ?? []) {
    const parent = account.path ?? `accounts/${account.accountId}`;
    const containersRes = await client.call(() => service.accounts.containers.list({ parent }));
    for (const c of containersRes.data.container ?? []) {
      if (c.publicId !== publicId) continue;
      const ref = toRef(c, publicId);
      if (ref) return ref;
    }
  }
  throw new Error(`No accessible container with public id ${publicId}`);
}

async function lookupByTagId(client: GtmClient, publicId: string): Promise<ContainerRef | null> {
  let container: Container;
  try {
    const res = await client.call(() =>
      client.service.accounts.containers.lookup({ tagId: publicId })
    );
    container = res.data;
  } catch (err) {
    const status = httpStatus(err);
    if (status === 404 || status === 403) return null;
    throw err;
  }
  return container.publicId === publicId ? toRef(container, publicId) : null;
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
