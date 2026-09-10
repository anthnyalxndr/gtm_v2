import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { ensureBuiltIns, listEnabledBuiltIns } from "../src/resources/builtins.js";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";

const ws = "accounts/1/containers/10/workspace/100";

describe("ensureBuiltIns", () => {
  it("enables only the missing built-ins", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    expect(await ensureBuiltIns(client, ws, ["formId"])).toEqual(["formId"]);
    expect(await ensureBuiltIns(client, ws, ["formId", "pagePath"])).toEqual(["pagePath"]);
    expect(await ensureBuiltIns(client, ws, ["formId", "pagePath"])).toEqual([]);
    expect(state.calls.filter((c) => c === "built_in_variables.create")).toHaveLength(2);
    expect(await listEnabledBuiltIns(client, ws)).toEqual(new Set(["formId", "pagePath"]));
  });

  it("does nothing for an empty list", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    expect(await ensureBuiltIns(client, ws, [])).toEqual([]);
    expect(state.calls).toEqual([]);
  });
});
