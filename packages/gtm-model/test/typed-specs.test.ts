import { describe, it, expect } from "vitest";
import {
  defineContainer,
  type ContainerSpec,
  type ServerContainerSpec,
  type WebContainerSpec,
} from "../src/index.js";

const tpl = (key: string, value: string) => ({ type: "template" as const, key, value });

describe("defineContainer checks a spec against its container type", () => {
  it("infers the web member when containerType is left out", () => {
    const spec = defineContainer({
      tag: [
        { name: "HTML", type: "html", firingTriggerName: ["Consent Initialization - All Pages"] },
      ],
    });
    const web: WebContainerSpec = spec;
    const engine: ContainerSpec = spec;
    expect(web.tag?.[0].name).toBe(engine.tag?.[0].name);
  });

  it("infers the server member, with clients, and returns a spec apply accepts", () => {
    const spec = defineContainer({
      containerType: "server",
      client: [{ name: "GA4", type: "gaaw_client", parameter: [tpl("cookieName", "FPID")] }],
      trigger: [{ name: "Client - GA4", type: "always" }],
      tag: [
        { name: "Conversion Linker", type: "sgtmadscl", firingTriggerName: ["All Pages"] },
        { name: "GA4 - All Events", type: "sgtmgaaw", firingTriggerName: ["Client - GA4"] },
      ],
    });
    const server: ServerContainerSpec = spec;
    const engine: ContainerSpec = spec;
    expect(server.client?.[0].name).toBe("GA4");
    expect(engine.containerType).toBe("server");
  });

  it("rejects clients and transformations outside a server spec", () => {
    // @ts-expect-error a web spec cannot hold a client
    defineContainer({ client: [{ name: "GA4", type: "gaaw_client" }] });
    const transformation = [{ name: "T", type: "tf_allow_params" }];
    // @ts-expect-error a web spec cannot hold a transformation
    defineContainer({ containerType: "web", transformation });
    // @ts-expect-error an AMP spec cannot hold a client
    defineContainer({ containerType: "amp", client: [{ name: "GA4", type: "gaaw_client" }] });
    expect(true).toBe(true);
  });

  it("rejects a server tag that names a web-only built-in trigger", () => {
    // @ts-expect-error Consent Initialization - All Pages exists only in web containers
    defineContainer({
      containerType: "server",
      tag: [
        { name: "T", type: "sgtmgaaw", firingTriggerName: ["Consent Initialization - All Pages"] },
      ],
    });
    // @ts-expect-error Initialization - All Pages exists only in web containers
    defineContainer({
      containerType: "server",
      tag: [{ name: "T", type: "sgtmgaaw", blockingTriggerName: ["Initialization - All Pages"] }],
    });
    expect(true).toBe(true);
  });

  it("still accepts any trigger name the spec defines", () => {
    const spec = defineContainer({
      containerType: "server",
      trigger: [{ name: "Custom Event - lead", type: "customEvent" }],
      tag: [{ name: "Ads - lead", type: "sgtmadsct", firingTriggerName: ["Custom Event - lead"] }],
    });
    expect(spec.tag?.[0].firingTriggerName).toEqual(["Custom Event - lead"]);
  });
});
