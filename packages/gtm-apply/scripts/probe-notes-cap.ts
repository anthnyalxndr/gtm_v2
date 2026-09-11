/**
 * Measure the longest notes value Tag Manager accepts, to keep
 * NOTES_MAX_LENGTH (src/library/metadata.ts) honest. Creates a scratch
 * workspace in the container, writes ever longer notes to one constant, and
 * deletes the workspace when done. Never touches the default workspace.
 *
 *   GTM_PROBE_CONTAINER=GTM-XXXXXXX pnpm --filter @anthnyalxndr/gtm-apply exec tsx scripts/probe-notes-cap.ts
 *
 * Result on 2026-09-11 against the web test container GTM-WNX8FFXW: every
 * length up to 512,000 characters was accepted and stored in full; nothing
 * larger was tried.
 */
import { GtmClient, resolveContainer } from "@anthnyalxndr/gtm-client";
import { ensureWorkspace } from "../src/resources/workspaces.js";

const CONTAINER = process.env.GTM_PROBE_CONTAINER ?? "GTM-WNX8FFXW";
const WORKSPACE = "notes-cap-probe";
const STEPS = [500, 2000, 8000, 32000, 128000, 512000];

const client = new GtmClient();
await client.init();
const container = await resolveContainer(client, CONTAINER);
console.log("container", container.path, container.name);
const ws = await ensureWorkspace(client, container.path, WORKSPACE);
console.log("workspace", ws.path, ws.created ? "(created)" : "(reused)");
const api = client.service.accounts.containers.workspaces;
const vars = api.variables;

const body = {
  name: "Probe - notes cap",
  type: "c",
  parameter: [{ type: "template", key: "value", value: "x" }],
};

try {
  const created = await client.call(() =>
    vars.create({ parent: ws.path, requestBody: { ...body, notes: "a" } })
  );
  const path = created.data.path as string;
  let fingerprint = created.data.fingerprint as string;

  const attempt = async (n: number): Promise<boolean> => {
    try {
      const res = await client.call(() =>
        vars.update({ path, fingerprint, requestBody: { ...body, notes: "a".repeat(n) } })
      );
      fingerprint = res.data.fingerprint as string;
      const got = res.data.notes?.length ?? 0;
      console.log(`${n}: accepted, stored ${got}`);
      return got === n;
    } catch (err) {
      const e = err as { message?: string; code?: number };
      console.log(`${n}: rejected (${e.code ?? "?"}) ${(e.message ?? "").slice(0, 160)}`);
      return false;
    }
  };

  let lo = 1;
  let hi = 0;
  for (const n of STEPS) {
    if (await attempt(n)) lo = n;
    else {
      hi = n;
      break;
    }
  }
  if (hi === 0) {
    console.log(`RESULT: no cap found; ${lo} characters accepted and stored in full`);
  } else {
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (await attempt(mid)) lo = mid;
      else hi = mid;
    }
    console.log(`RESULT: max accepted notes length = ${lo} (first rejected = ${hi})`);
  }
} finally {
  await client.call(() => api.delete({ path: ws.path }));
  console.log("deleted workspace", ws.path);
}
