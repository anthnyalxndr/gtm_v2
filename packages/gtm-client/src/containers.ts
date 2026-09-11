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
