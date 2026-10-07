import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";

const spec = defineContainer({
  variable: [
    { name: "Const - X", type: "c", parameter: [{ type: "template", key: "value", value: "x" }] },
  ],
});

function fake() {
  const { service, state } = createFakeService();
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

describe("version description", () => {
  it("sends the notes to create_version alongside the name", async () => {
    const { client, state } = fake();
    await applySpec(client, {
      container: "GTM-ABC123",
      workspace: "ws",
      spec,
      version: { name: "v1", notes: "Adds Const - X." },
    });
    const v = state.versions.at(-1)!;
    expect(v.name).toBe("v1");
    expect(v.description).toBe("Adds Const - X.");
  });

  it("sends no description field when no notes are given", async () => {
    const { client, state } = fake();
    await applySpec(client, {
      container: "GTM-ABC123",
      workspace: "ws",
      spec,
      version: { name: "v1" },
    });
    expect(Object.hasOwn(state.versions.at(-1)!, "description")).toBe(false);
  });
});

describe("version description in the request", () => {
  it("sends the notes as notes, the only field create_version reads for it", async () => {
    const { service } = createFakeService();
    const bodies: unknown[] = [];
    const createVersion = service.accounts.containers.workspaces.create_version;
    service.accounts.containers.workspaces.create_version = (async (args: {
      path: string;
      requestBody: unknown;
    }) => {
      bodies.push(args.requestBody);
      return createVersion(args as never);
    }) as typeof createVersion;
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await applySpec(client, {
      container: "GTM-ABC123",
      workspace: "ws",
      spec,
      version: { name: "v1", notes: "Adds Const - X." },
    });
    expect(bodies).toEqual([{ name: "v1", notes: "Adds Const - X." }]);
  });
});
