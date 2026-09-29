import { describe, it, expect } from "vitest";
import { recipes } from "../src/index.js";
import { library as web } from "../src/web/index.js";
import { validateSpec, formatIssue } from "@anthnyalxndr/gtm-apply";
import { LIBRARIES, libraryFromArgv } from "../scripts/libraries.js";
import { template as serverTemplate } from "../scripts/server/template.js";
import { template as webTemplate } from "../scripts/web/template.js";

describe("gtm-recipes", () => {
  it("keys each recipe library by its container type", () => {
    expect(recipes.web).toBe(web);
    expect(recipes.web.containerType).toBe("web");
    expect(recipes.server.containerType).toBe("server");
  });

  it("knows each library's template container and committed module", () => {
    expect(LIBRARIES.web.publicId).toBe("GTM-TPLKC7QP");
    expect(LIBRARIES.web.libraryPath).toMatch(/src\/web\/library\.ts$/);
    expect(LIBRARIES.server.publicId).toBe("GTM-WMGVDZ5H");
    expect(LIBRARIES.server.libraryPath).toMatch(/src\/server\/library\.ts$/);
  });

  it("reads the library type from the command line", () => {
    expect(libraryFromArgv(["web"])).toBe("web");
    expect(libraryFromArgv(["--dry-run", "web"])).toBe("web");
    expect(libraryFromArgv(["server"])).toBe("server");
    expect(() => libraryFromArgv([])).toThrow(/Usage: .*<web\|server>/);
    expect(() => libraryFromArgv(["amp"])).toThrow(/Usage/);
  });

  it("keeps every template valid for the API, manifest length included", () => {
    expect(validateSpec(webTemplate).map(formatIssue)).toEqual([]);
    expect(validateSpec(serverTemplate).map(formatIssue)).toEqual([]);
  });
});
