import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { GtmClient } from "./client.js";

/** Every Tag Manager account the authenticated user can see. */
export async function listAccounts(client: GtmClient): Promise<tagmanager_v2.Schema$Account[]> {
  const response = await client.call(() => client.service.accounts.list());
  return response.data.account ?? [];
}
