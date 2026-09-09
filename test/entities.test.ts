import { describe, it, expect } from "vitest";
import { GtmClient } from "../src/gtm_v2.js";
import {
  ensureFolder,
  ensureTrigger,
  ensureTag,
  ensureVariable,
  matches,
} from "../src/resources/entities.js";
import { createFakeService } from "./helpers/fakeService.js";

const ws = "accounts/1/containers/10/workspace/100";

describe("matches", () => {
  it("compares only keys present in desired and ignores server fields", () => {
    const existing = { name: "x", type: "pageview", fingerprint: "9", path: "a/b", extra: 1 };
    expect(matches(existing, { name: "x", type: "pageview" })).toBe(true);
    expect(matches(existing, { name: "x", type: "click" })).toBe(false);
    expect(matches(existing, { name: "x", fingerprint: "1" })).toBe(true);
  });

  it("compares arrays positionally and deeply", () => {
    expect(matches({ p: [{ k: "a", v: 1 }] }, { p: [{ k: "a" }] })).toBe(true);
    expect(matches({ p: [{ k: "a" }] }, { p: [{ k: "a" }, { k: "b" }] })).toBe(false);
  });
});

describe("ensure entities", () => {
  it("creates a trigger when absent", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const res = await ensureTrigger(client, ws, { name: "PV - thank you", type: "pageview" });
    expect(res.action).toBe("created");
    expect(res.entity.triggerId).toBeDefined();
    expect(state.calls).toEqual(["trigger.list", "trigger.create"]);
  });

  it("is unchanged when the same body is applied twice", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await ensureTrigger(client, ws, { name: "PV - thank you", type: "pageview" });
    const res = await ensureTrigger(client, ws, { name: "PV - thank you", type: "pageview" });
    expect(res.action).toBe("unchanged");
    expect(state.calls.filter((c) => c.endsWith("update"))).toHaveLength(0);
  });

  it("updates with the current fingerprint when the body differs", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await ensureTag(client, ws, { name: "GA4 - lead", type: "gaawe", firingTriggerId: ["1"] });
    const res = await ensureTag(client, ws, {
      name: "GA4 - lead",
      type: "gaawe",
      firingTriggerId: ["2"],
    });
    expect(res.action).toBe("updated");
    expect(res.entity.firingTriggerId).toEqual(["2"]);
    expect(res.entity.fingerprint).toBe("2");
    expect(state.calls).toContain("tag.update");
  });

  it("supports variables and folders", async () => {
    const { service } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const v = await ensureVariable(client, ws, {
      name: "Const - Ads ID",
      type: "c",
      parameter: [{ type: "template", key: "value", value: "AW-123" }],
    });
    expect(v.action).toBe("created");
    const f = await ensureFolder(client, ws, { name: "Conversions" });
    expect(f.action).toBe("created");
    expect(f.entity.folderId).toBeDefined();
  });

  it("rejects a body without a name", async () => {
    const { service } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await expect(ensureTrigger(client, ws, { type: "pageview" })).rejects.toThrow(/name/);
  });
});
