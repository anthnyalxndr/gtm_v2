import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { applySpec } from "../src/spec/execute.js";
import { normalizeExport } from "../src/spec/normalize.js";
import { defineContainer } from "../src/spec/types.js";

const linker = (firingTriggerId: string[]) => ({
  name: "Conversion Linker",
  type: "sgtmadscl",
  firingTriggerId,
  parameter: [{ type: "boolean", key: "enableLinkerParams", value: "false" }],
});

describe("built-in triggers by container type", () => {
  it("names a server tag's built-in trigger when normalizing a server export", () => {
    const spec = normalizeExport({
      containerVersion: {
        container: { usageContext: ["server"] },
        tag: [linker(["2147479574"])],
      },
    });
    expect(spec.containerType).toBe("server");
    expect(spec.tag?.[0].firingTriggerName).toEqual(["All Pages"]);
  });

  it("reports a web-only built-in trigger id in a server export as unknown", () => {
    expect(() =>
      normalizeExport({
        containerVersion: {
          container: { usageContext: ["server"] },
          tag: [linker(["2147479572"])],
        },
      })
    ).toThrow(/Unknown trigger id 2147479572/);
  });

  it("keeps resolving web built-in triggers in a web export", () => {
    const spec = normalizeExport({
      containerVersion: {
        container: { usageContext: ["web"] },
        tag: [{ name: "HTML", type: "html", firingTriggerId: ["2147479553"] }],
      },
    });
    expect(spec.tag?.[0].firingTriggerName).toEqual(["All Pages"]);
  });

  it("applies a server tag on All Pages with the server's built-in trigger id", async () => {
    const { service, state } = createFakeService({
      containers: [
        {
          accountId: "1",
          containerId: "11",
          publicId: "GTM-SRV",
          name: "server",
          usageContext: ["server"],
        },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const spec = defineContainer({
      containerType: "server",
      tag: [
        {
          name: "Conversion Linker",
          type: "sgtmadscl",
          firingTriggerName: ["All Pages"],
          parameter: [{ type: "boolean", key: "enableLinkerParams", value: "false" }],
        },
      ],
    });
    const outcome = await applySpec(client, {
      container: "GTM-SRV",
      workspace: "ws",
      spec,
      version: true,
    });
    expect(outcome.plan.errors).toEqual([]);
    const tag = latestSnapshot(state).tag.find((t) => t.name === "Conversion Linker");
    expect(tag?.firingTriggerId).toEqual(["2147479574"]);
  });
});
