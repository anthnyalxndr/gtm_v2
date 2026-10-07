import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";
import { formatIssue, validateSpec } from "../src/spec/validate.js";
import { normalizeExport } from "../src/spec/normalize.js";

const tpl = (key: string, value: string) => ({ type: "template" as const, key, value });

const ga4Config = (sendPageView: string) =>
  defineContainer({
    variable: [
      { name: "Const - GA4 Measurement ID", type: "c", parameter: [tpl("value", "G-ABC1234567")] },
    ],
    gtagConfig: [
      {
        type: "googtag",
        parameter: [tpl("tagId", "G-ABC1234567"), tpl("send_page_view", sendPageView)],
      },
    ],
  });

function fake() {
  const { service, state } = createFakeService();
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

const target = { container: "GTM-ABC123", workspace: "gtag", version: true };

describe("Google tag configs", () => {
  it("creates a config keyed by its tagId, and a second apply reports it unchanged", async () => {
    const { client, state } = fake();
    const first = await applySpec(client, { ...target, spec: ga4Config("true") });
    expect(first.plan.ops.find((o) => o.kind === "gtagConfig")).toMatchObject({
      name: "G-ABC1234567",
      action: "create",
    });
    expect(latestSnapshot(state).gtagConfig).toHaveLength(1);
    const again = await applySpec(client, { ...target, spec: ga4Config("true") });
    expect(again.plan.ops.find((o) => o.kind === "gtagConfig")?.action).toBe("unchanged");
  });

  it("updates a changed parameter in place, keeping the gtagConfigId", async () => {
    const { client, state } = fake();
    await applySpec(client, { ...target, spec: ga4Config("true") });
    const id = latestSnapshot(state).gtagConfig[0].gtagConfigId;
    const changed = await applySpec(client, { ...target, spec: ga4Config("false") });
    expect(changed.plan.ops.find((o) => o.kind === "gtagConfig")?.action).toBe("update");
    const [config] = latestSnapshot(state).gtagConfig;
    expect(config.gtagConfigId).toBe(id);
    expect(config.parameter).toContainEqual(tpl("send_page_view", "false"));
  });

  it("rejects two configs with the same tagId, and a config without one", () => {
    const issues = validateSpec({
      gtagConfig: [
        { type: "googtag", parameter: [tpl("tagId", "G-1")] },
        { type: "googtag", parameter: [tpl("tagId", "G-1")] },
        { type: "googtag", parameter: [tpl("send_page_view", "true")] },
      ],
    }).map(formatIssue);
    expect(issues).toEqual([
      "gtagConfig[2]: parameter needs a tagId entry, which identifies the config",
      'gtagConfig "G-1": tagId appears in more than one config',
    ]);
  });

  it("normalizes gtag configs from an export, without their ids", () => {
    const spec = normalizeExport({
      containerVersion: {
        gtagConfig: [
          {
            accountId: "1",
            containerId: "10",
            gtagConfigId: "5",
            fingerprint: "9",
            path: "accounts/1/containers/10/versions/2/gtag_config/5",
            type: "googtag",
            parameter: [tpl("tagId", "G-1")],
          },
        ],
      },
    });
    expect(spec.gtagConfig).toEqual([{ type: "googtag", parameter: [tpl("tagId", "G-1")] }]);
  });
});
