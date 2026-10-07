import { describe, it, expect } from "vitest";
import {
  BUILT_IN_TRIGGERS,
  BUILT_IN_VARIABLES,
  builtInTriggerIdForName,
  builtInTriggerNameForId,
  builtInTypeForName,
  CATALOGS,
  catalogFor,
  TRIGGER_TYPES,
  type ContainerType,
} from "../src/index.js";

const TYPES: ContainerType[] = ["web", "server", "amp", "android", "ios"];

describe("container catalogs", () => {
  it("has one catalog per container type, each naming its own type", () => {
    for (const type of TYPES) expect(CATALOGS[type].type).toBe(type);
    expect(catalogFor()).toBe(CATALOGS.web);
  });

  it("gives the server its own All Pages, and none of the web built-in triggers", () => {
    expect(catalogFor("server").triggers.builtIn).toEqual({ "All Pages": "2147479574" });
    expect(catalogFor("web").triggers.builtIn).toEqual(BUILT_IN_TRIGGERS);
    expect(catalogFor("web").triggers.builtIn["All Pages"]).toBe("2147479553");
  });

  it("lists the trigger types each container's trigger picker offers", () => {
    expect([...catalogFor("server").triggers.types].sort()).toEqual([
      "always",
      "customEvent",
      "serverPageview",
    ]);
    const web = catalogFor("web").triggers.types;
    expect(web).toHaveLength(16);
    expect(web).toContain("consentInit");
    expect(web).toContain("linkClick");
    expect(web).not.toContain("serverPageview");
    expect(web).not.toContain("always");
    for (const type of TYPES) {
      for (const t of catalogFor(type).triggers.types) expect(TRIGGER_TYPES).toContain(t);
    }
  });

  it("splits built-in variables by container type, sharing the utility ones", () => {
    const web = catalogFor("web").builtInVariables;
    const server = catalogFor("server").builtInVariables;
    expect(Object.keys(web)).toHaveLength(47);
    expect(Object.keys(server)).toHaveLength(10);
    expect(web["Analytics Client ID"]).toBe("analyticsClientId");
    expect(web["On-Screen Duration"]).toBe("elementVisibilityTime");
    expect(web["Client Name"]).toBeUndefined();
    expect(server["Client Name"]).toBe("clientName");
    expect(server["Page URL"]).toBeUndefined();
    for (const shared of ["Container ID", "Container Version", "Debug Mode", "Random Number"]) {
      expect(web[shared]).toBe(server[shared]);
    }
  });

  it("looks built-in variables up by container type, or across all types without one", () => {
    expect(builtInTypeForName("Client Name")).toBe("clientName");
    expect(builtInTypeForName("Client Name", "server")).toBe("clientName");
    expect(builtInTypeForName("Client Name", "web")).toBeUndefined();
    expect(builtInTypeForName("Page URL", "web")).toBe("pageUrl");
    expect(BUILT_IN_VARIABLES["Client Name"]).toBe("clientName");
    expect(BUILT_IN_VARIABLES["Page URL"]).toBe("pageUrl");
  });

  it("looks built-in triggers up by container type, defaulting to web", () => {
    expect(builtInTriggerIdForName("All Pages", "server")).toBe("2147479574");
    expect(builtInTriggerIdForName("All Pages")).toBe("2147479553");
    expect(builtInTriggerIdForName("Consent Initialization - All Pages", "server")).toBeUndefined();
    expect(builtInTriggerNameForId("2147479574", "server")).toBe("All Pages");
    expect(builtInTriggerNameForId("2147479574")).toBeUndefined();
  });
});
