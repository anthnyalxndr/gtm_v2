import type { ContainerRef, GtmClient } from "@anthnyalxndr/gtm-client";

/** Whether the caller may publish a container, as far as the API lets us tell. */
export type PublishPermission =
  | { outcome: "held"; email: string }
  | { outcome: "missing"; email: string; holders: string[] }
  /** The check could not run; the reason says what was missing. */
  | { outcome: "unknown"; reason: string };

const describe = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Email addresses with the Publish permission on the container, from the account's users. */
export async function listPublishers(
  client: GtmClient,
  container: ContainerRef
): Promise<string[]> {
  const api = client.service.accounts.user_permissions;
  const parent = `accounts/${container.accountId}`;
  const holders: string[] = [];
  let pageToken: string | undefined;
  do {
    const token = pageToken;
    const res = await client.call(() => api.list({ parent, pageToken: token }));
    for (const user of res.data.userPermission ?? []) {
      const access = user.containerAccess?.find((c) => c.containerId === container.containerId);
      if (access?.permission === "publish" && user.emailAddress) holders.push(user.emailAddress);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return holders;
}

/**
 * Does the caller hold Publish on the container? Needs the caller's email (from the
 * token) and the account's user list (account admins only); when either is out of
 * reach the outcome is unknown rather than a refusal.
 */
export async function checkPublishPermission(
  client: GtmClient,
  container: ContainerRef
): Promise<PublishPermission> {
  let email: string | undefined;
  try {
    email = await client.email();
  } catch (err) {
    return { outcome: "unknown", reason: `the caller's email could not be read: ${describe(err)}` };
  }
  if (!email) {
    return {
      outcome: "unknown",
      reason:
        "the credentials carry no email address; re-authorize so the token includes the userinfo.email scope",
    };
  }
  let holders: string[];
  try {
    holders = await listPublishers(client, container);
  } catch (err) {
    return {
      outcome: "unknown",
      reason: `the account's users could not be listed: ${describe(err)}`,
    };
  }
  const mine = email.toLowerCase();
  return holders.some((h) => h.toLowerCase() === mine)
    ? { outcome: "held", email }
    : { outcome: "missing", email, holders };
}
