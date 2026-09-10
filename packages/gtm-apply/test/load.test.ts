import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { loadSpecFile } from "../src/spec/load.js";

async function dir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "gtm-apply-load-"));
}

describe("loadSpecFile", () => {
  it("parses JSON", async () => {
    const p = join(await dir(), "spec.json");
    await writeFile(p, JSON.stringify({ trigger: [{ name: "PV", type: "pageview" }] }));
    expect(await loadSpecFile(p)).toEqual({ trigger: [{ name: "PV", type: "pageview" }] });
  });

  it("imports the default export of a JavaScript module", async () => {
    const p = join(await dir(), "spec.mjs");
    await writeFile(p, `export default { trigger: [{ name: "PV", type: "pageview" }] };\n`);
    expect(await loadSpecFile(p)).toEqual({ trigger: [{ name: "PV", type: "pageview" }] });
  });

  it("falls back to a named `spec` export", async () => {
    const p = join(await dir(), "spec.mjs");
    await writeFile(p, `export const spec = { tag: [] };\n`);
    expect(await loadSpecFile(p)).toEqual({ tag: [] });
  });

  it("imports a TypeScript module", async () => {
    const p = join(await dir(), "spec.ts");
    await writeFile(
      p,
      `const name: string = "PV";\nexport default { trigger: [{ name, type: "pageview" as const }] };\n`
    );
    expect(await loadSpecFile(p)).toEqual({ trigger: [{ name: "PV", type: "pageview" }] });
  });

  it("rejects modules without a spec and unsupported extensions", async () => {
    const d = await dir();
    const p = join(d, "empty.mjs");
    await writeFile(p, `export const other = 1;\n`);
    await expect(loadSpecFile(p)).rejects.toThrow(/default export/);
    await expect(loadSpecFile(join(d, "spec.yaml"))).rejects.toThrow(/Unsupported spec file type/);
  });
});
