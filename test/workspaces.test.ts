import { describe, it, expect } from "vitest";
import { GtmClient } from "../src/gtm_v2.js";
import { ensureWorkspace } from "../src/resources/workspaces.js";
import { createFakeService } from "./helpers/fakeService.js";

const container = "accounts/1/containers/10";

describe("ensureWorkspace", () => {
  it("creates the workspace when absent", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ws = await ensureWorkspace(client, container, "conv-2026-09");
    expect(ws.created).toBe(true);
    expect(ws.path).toMatch(/^accounts\/1\/containers\/10\/workspace\/\d+$/);
    expect(state.calls).toContain("workspace.create");
  });

  it("reuses an existing workspace with the same name", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const first = await ensureWorkspace(client, container, "conv-2026-09");
    const second = await ensureWorkspace(client, container, "conv-2026-09");
    expect(second.created).toBe(false);
    expect(second.path).toBe(first.path);
    expect(state.calls.filter((c) => c === "workspace.create")).toHaveLength(1);
  });

  it("refuses the default workspace", async () => {
    const { service } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await expect(ensureWorkspace(client, container, "Default Workspace")).rejects.toThrow(
      /default workspace/i
    );
  });
});
