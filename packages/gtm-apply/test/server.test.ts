import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { applySpec } from "../src/spec/execute.js";
import { planContainerSpec } from "../src/spec/plan.js";
import { normalizeExport } from "../src/spec/normalize.js";
import { validateSpec, formatIssue } from "../src/spec/validate.js";
import { pullSnapshot, snapshotToSpec } from "../src/snapshot/pull.js";
import { defineContainer } from "../src/spec/types.js";

function fake() {
  const { service, state } = createFakeService({
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-WEB", name: "web" },
      {
        accountId: "1",
        containerId: "11",
        publicId: "GTM-SRV",
        name: "server",
        usageContext: ["server"],
      },
    ],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

const serverSpec = defineContainer({
  containerType: "server",
  variable: [
    {
      name: "Const - Measurement ID",
      type: "c",
      parameter: [{ type: "template", key: "value", value: "G-123" }],
    },
  ],
  client: [
    {
      name: "GA4 Client",
      type: "gaaw_client",
      parentFolderName: "Server",
      parameter: [{ type: "boolean", key: "activateGtagSupport", value: "true" }],
    },
  ],
  transformation: [
    {
      name: "Drop PII",
      type: "exclude_parameters",
      parentFolderName: "Server",
      parameter: [{ type: "template", key: "measurementId", value: "{{Const - Measurement ID}}" }],
    },
  ],
  trigger: [
    {
      name: "GA4 Client - all events",
      type: "always",
      filter: [
        {
          type: "equals",
          parameter: [
            { type: "template", key: "arg0", value: "{{Client Name}}" },
            { type: "template", key: "arg1", value: "GA4 Client" },
          ],
        },
      ],
    },
  ],
  tag: [
    {
      name: "GA4",
      type: "sgtmgaaw",
      firingTriggerName: ["GA4 Client - all events"],
      parameter: [{ type: "template", key: "measurementId", value: "{{Const - Measurement ID}}" }],
    },
  ],
});

describe("server containers", () => {
  it("validates client and transformation entities and container type", () => {
    expect(validateSpec(serverSpec)).toEqual([]);
    const issues = validateSpec({
      containerType: "web",
      client: [{ name: "C", type: "gaaw_client", bogus: 1 }],
    });
    expect(issues.map(formatIssue)).toEqual(["spec: client is not supported by a web container"]);
    expect(validateSpec({ containerType: "moon" }).map(formatIssue)).toEqual([
      expect.stringMatching(/^spec: containerType must be one of web, server/),
    ]);
    expect(validateSpec({ client: [{ name: "C", type: "x", clientId: "1" }] })[0].path).toBe(
      "clientId"
    );
  });

  it("applies clients and transformations in order, then is unchanged on a second run", async () => {
    const { client, state } = fake();
    const first = await applySpec(client, {
      container: "GTM-SRV",
      workspace: "ws",
      spec: serverSpec,
    });
    const kinds = first.plan.ops.filter((o) => o.action === "create").map((o) => o.kind);
    expect(kinds).toEqual([
      "workspace",
      "folder",
      "builtIn",
      "variable",
      "client",
      "transformation",
      "trigger",
      "tag",
      "version",
    ]);
    expect(first.plan.ops.find((o) => o.kind === "builtIn")?.name).toBe("clientName");
    const snap = latestSnapshot(state);
    expect(snap.client[0].parentFolderId).toBe(snap.folder[0].folderId);
    expect(snap.transformation[0].name).toBe("Drop PII");

    const second = await applySpec(client, {
      container: "GTM-SRV",
      workspace: "ws2",
      spec: serverSpec,
    });
    expect(
      second.plan.ops.filter((o) => o.kind !== "workspace").every((o) => o.action === "unchanged")
    ).toBe(true);
    expect(second.result?.versionPath).toBeUndefined();
  });

  it("round-trips through a snapshot", async () => {
    const { client } = fake();
    await applySpec(client, { container: "GTM-SRV", workspace: "ws", spec: serverSpec });
    const snap = await pullSnapshot(client, { container: "GTM-SRV" });
    const spec = snapshotToSpec(snap);
    expect(spec.containerType).toBe("server");
    expect(spec.client?.[0]).toMatchObject({ name: "GA4 Client", parentFolderName: "Server" });
    expect(spec.transformation?.[0]?.name).toBe("Drop PII");
    expect(validateSpec(spec)).toEqual([]);
    const plan = await planContainerSpec(
      client,
      { container: "GTM-SRV", workspace: "again" },
      spec
    );
    expect(plan.errors).toEqual([]);
    expect(plan.ops.filter((o) => o.action !== "unchanged").map((o) => o.kind)).toEqual([
      "workspace",
    ]);
  });

  it("refuses a spec for the wrong container type before any write", async () => {
    const { client, state } = fake();
    const plan = await planContainerSpec(
      client,
      { container: "GTM-WEB", workspace: "ws" },
      serverSpec
    );
    expect(plan.errors).toEqual([
      "spec is for a server container but GTM-WEB is a web container",
      "client entities are not supported by a web container",
      "transformation entities are not supported by a web container",
    ]);
    expect(state.calls.filter((c) => c.endsWith(".create"))).toEqual([]);
    await expect(
      applySpec(client, { container: "GTM-WEB", workspace: "ws", spec: serverSpec })
    ).rejects.toThrow(/Plan has 3 error/);
  });

  it("normalizes a UI export of a server container", () => {
    const spec = normalizeExport({
      containerVersion: {
        container: { usageContext: ["SERVER"] },
        folder: [{ folderId: "5", name: "Server" }],
        client: [
          { clientId: "1", name: "C", type: "gaaw_client", parentFolderId: "5", fingerprint: "1" },
        ],
        transformation: [{ transformationId: "2", name: "T", type: "exclude_parameters" }],
      },
    });
    expect(spec).toEqual({
      containerType: "server",
      folder: [{ name: "Server" }],
      client: [{ name: "C", type: "gaaw_client", parentFolderName: "Server" }],
      transformation: [{ name: "T", type: "exclude_parameters" }],
    });
  });
});
