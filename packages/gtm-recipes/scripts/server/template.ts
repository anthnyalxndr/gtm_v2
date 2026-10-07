import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { applySpec, GtmSnapshot, manifestVariable } from "@anthnyalxndr/gtm-apply";
import {
  defineContainer,
  type ClientSpec,
  type TagSpec,
  type TriggerSpec,
} from "@anthnyalxndr/gtm-model";
import {
  adsConversionId,
  bool,
  condition,
  declares,
  dependencies,
  input,
  label,
  labelConstant,
  tpl,
} from "../shared.js";

/**
 * The Server Template container ("Template - Server", GTM-WMGVDZ5H) as a
 * ContainerSpec: server-side counterparts of the web lead-gen recipes. Push it
 * with `pnpm push server`, then `pnpm pull server` writes the real container
 * back into src/server/library.ts.
 *
 * The web container's google_tag_server recipe sends GA4 hits to the
 * customer's tagging server. There the GA4 client claims them, one GA4 tag
 * forwards every claimed event to GA4, and each conversion recipe fires a
 * server Google Ads conversion tag on its event name. The web plan leaves the
 * googleAds destination out, so each conversion counts once.
 */

const CONVERSIONS = ["contact_form_submit", "call_click", "email_click", "maps_click"] as const;

const claimedByGa4 = condition("equals", "{{Client Name}}", "GA4");

/** Fires when the GA4 client claims the recipe's event from the web container. */
const serverEvent = (recipe: string): TriggerSpec => ({
  name: `Custom Event - ${recipe}`,
  type: "customEvent",
  notes: `Fires when the GA4 client claims the ${recipe} event sent by the web container.`,
  customEventFilter: [condition("equals", "{{_event}}", recipe)],
  filter: [claimedByGa4],
});

const serverConversion = (recipe: string): TagSpec => ({
  name: `Ads - ${recipe}`,
  type: "sgtmadsct",
  firingTriggerName: [`Custom Event - ${recipe}`],
  notes: declares(
    `Records the ${recipe} conversion in Google Ads from the tagging server.`,
    recipe
  ),
  parameter: [
    tpl("conversionId", "{{Const - Google Ads Conversion ID}}"),
    tpl("conversionLabel", `{{${labelConstant(recipe)}}}`),
    bool("enableConversionLinker", true),
    bool("enableProductReporting", false),
    bool("enableNewCustomerReporting", false),
    bool("rdp", false),
  ],
});

/**
 * The GA4 client a new server container ships with, as Tag Manager creates it
 * (read from Template - Server version 2), plus the recipe declaration.
 */
const ga4Client: ClientSpec = {
  name: "GA4",
  type: "gaaw_client",
  notes: declares(
    "Claims the GA4 hits the web container's Google tag sends to this tagging server and keeps the client id in a server-set FPID cookie.",
    "ga4_client"
  ),
  parameter: [
    bool("activateDefaultPaths", true),
    tpl("cookieManagement", "server"),
    tpl("cookieName", "FPID"),
    tpl("cookieDomain", "auto"),
    tpl("cookiePath", "/"),
    tpl("cookieMaxAgeInSec", "63072000"),
  ],
};

const gtmClient: ClientSpec = {
  name: "GTM",
  type: "gtm_client",
  notes: declares(
    "Serves the web container's gtm.js from the tagging server's first-party domain.",
    "web_container_client"
  ),
  parameter: [
    {
      type: "list",
      key: "allowedContainerIds",
      list: [{ type: "map", map: [tpl("containerId", "{{Const - Web Container ID}}")] }],
    },
    bool("activateResponseCompression", true),
    bool("activateDependencyServing", true),
    bool("activateGeoResolution", false),
  ],
};

export const template = defineContainer({
  containerType: "server",
  variable: [
    manifestVariable({
      conventions: {},
      recipes: {
        ga4_client: {
          description: "GA4 client, GA4 forwarding, Conversion Linker; base for every recipe.",
        },
        contact_form_submit: {
          description: "Contact form submitted.",
          dependencies: dependencies("contact_form_submit"),
        },
        call_click: {
          description: "tel: link clicked.",
          dependencies: dependencies("call_click"),
        },
        email_click: {
          description: "mailto: link clicked.",
          dependencies: dependencies("email_click"),
        },
        maps_click: {
          description: "Google Maps link clicked.",
          dependencies: dependencies("maps_click"),
        },
        web_container_client: {
          description: "Serves the web container's gtm.js first-party.",
        },
      },
    }),
    adsConversionId(),
    ...CONVERSIONS.map(label),
    input(
      "Const - Web Container ID",
      "<GTM-XXXXXXX>",
      "Public id of the web container this tagging server serves.",
      { kind: "gtmPublicId", example: "GTM-ABC1234", pattern: "^GTM-[A-Z0-9]+$" }
    ),
  ],
  trigger: [
    {
      name: "Client - GA4",
      type: "always",
      notes: "Fires for every event the GA4 client claims.",
      filter: [claimedByGa4],
    },
    ...CONVERSIONS.map(serverEvent),
  ],
  client: [ga4Client, gtmClient],
  tag: [
    {
      name: "GA4 - All Events",
      type: "sgtmgaaw",
      firingTriggerName: ["Client - GA4"],
      notes: declares(
        "Forwards every event the GA4 client claims to GA4. Its fields stay at their defaults, so it inherits the measurement id and parameters from each event (https://developers.google.com/tag-platform/learn/sst-fundamentals/5-sst-setup-analytics).",
        "ga4_client"
      ),
      parameter: [
        tpl("epToIncludeDropdown", "all"),
        tpl("upToIncludeDropdown", "all"),
        bool("redactVisitorIp", false),
      ],
    },
    {
      name: "Conversion Linker",
      type: "sgtmadscl",
      firingTriggerName: ["All Pages"],
      notes: declares("Sets the Google Ads click cookies from the tagging server.", "ga4_client"),
      parameter: [bool("enableLinkerParams", false), bool("enableCookieOverrides", false)],
    },
    ...CONVERSIONS.map(serverConversion),
  ],
});

/**
 * The template applied to an in-memory server container and pulled back as a
 * GtmSnapshot, so it can be linted and pushed exactly as a pull would see it.
 */
export async function templateSnapshot(): Promise<GtmSnapshot> {
  const { service } = createFakeService({
    containers: [
      {
        accountId: "1",
        containerId: "20",
        publicId: "GTM-SAMPLE",
        name: "Server Template (sample)",
        usageContext: ["server"],
      },
    ],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, {
    container: "GTM-SAMPLE",
    workspace: "sample",
    spec: template,
    version: true,
  });
  return new GtmSnapshot(client, { container: "GTM-SAMPLE" }).init();
}
