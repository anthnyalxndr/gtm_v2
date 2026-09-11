import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import {
  applySpec,
  defineContainer,
  GtmSnapshot,
  manifestVariable,
  type TagSpec,
  type TriggerSpec,
  type VariableSpec,
} from "@anthnyalxndr/gtm-apply";

/**
 * The Web Template container (GTM-TPLKC7QP) as a ContainerSpec: the lead-gen
 * recipe set that recurs across client work. Push it with `pnpm push`, then
 * `pnpm pull` writes the real container back into src/library.ts.
 *
 * Recipes are event-centric: one trigger, a GA4 event tag and a Google Ads
 * conversion tag, sharing the Google tag and the customer's constants. A
 * site emits the dataLayer events; this container only listens.
 */

const CONVERSION_LABEL_PATTERN = "^[A-Za-z0-9_-]{5,}$";
/** GTM stores the Google Ads conversion id bare; "AW-" is a label the UI adds. */
const CONVERSION_TRACKING_ID_PATTERN = "^[0-9]{9,11}$";
const MEASUREMENT_ID_PATTERN = "^G-[A-Z0-9]{8,12}$";

const tpl = (key: string, value: string) => ({ type: "template" as const, key, value });
const bool = (key: string, value: boolean) => ({
  type: "boolean" as const,
  key,
  value: String(value),
});
const meta = (recipe: string) => ({
  type: "map" as const,
  map: [tpl("recipes", recipe)],
});
const notNeeded = { consentStatus: "notNeeded" as const };

const constant = (name: string, value: string, notes?: string): VariableSpec => ({
  name,
  type: "c",
  parameter: [tpl("value", value)],
  ...(notes ? { notes } : {}),
});
const dataLayer = (name: string, key: string): VariableSpec => ({
  name,
  type: "v",
  parameter: [tpl("name", key)],
});
const labelConstant = (recipe: string) => `Const - Google Ads - ${recipe} Conversion Label`;

const condition = (type: "equals" | "contains" | "matchRegex", arg0: string, arg1: string) => ({
  type,
  parameter: [tpl("arg0", arg0), tpl("arg1", arg1)],
});

const customEvent = (recipe: string): TriggerSpec => ({
  name: `Custom Event - ${recipe}`,
  type: "customEvent",
  customEventFilter: [condition("equals", "{{_event}}", recipe)],
});

/** A link click trigger that waits up to two seconds for tags, as the UI configures one. */
const linkClick = (name: string, filter: ReturnType<typeof condition>): TriggerSpec => ({
  name,
  type: "linkClick",
  filter: [filter],
  waitForTags: { type: "boolean", value: "true" },
  waitForTagsTimeout: { type: "template", value: "2000" },
  checkValidation: { type: "boolean", value: "false" },
  autoEventFilter: [condition("matchRegex", "{{Page URL}}", ".*")],
});

const eventParameter = (parameter: string, parameterValue: string) => ({
  type: "map" as const,
  map: [tpl("parameter", parameter), tpl("parameterValue", parameterValue)],
});

/** A GA4 event tag and a Google Ads conversion tag for one recipe, on one trigger. */
const conversion = (
  recipe: string,
  trigger: string,
  parameters: ReturnType<typeof eventParameter>[]
): TagSpec[] => [
  {
    name: `GA4 - ${recipe}`,
    type: "gaawe",
    firingTriggerName: [trigger],
    monitoringMetadata: meta(recipe),
    consentSettings: notNeeded,
    parameter: [
      tpl("eventName", recipe),
      tpl("measurementIdOverride", "{{Const - GA4 Measurement ID}}"),
      ...(parameters.length
        ? [{ type: "list" as const, key: "eventSettingsTable", list: parameters }]
        : []),
    ],
  },
  {
    name: `Ads - ${recipe}`,
    type: "awct",
    firingTriggerName: [trigger],
    monitoringMetadata: meta(recipe),
    consentSettings: notNeeded,
    parameter: [
      tpl("conversionId", "{{Const - Google Ads Conversion ID}}"),
      tpl("conversionLabel", `{{${labelConstant(recipe)}}}`),
      bool("enableConversionLinker", true),
    ],
  },
];

const dependencies = (recipe: string) => [
  {
    constant: labelConstant(recipe),
    platform: "googleAds",
    resource: "conversionAction",
    pattern: CONVERSION_LABEL_PATTERN,
  },
  {
    constant: "Const - Google Ads Conversion ID",
    platform: "googleAds",
    resource: "conversionTrackingId",
    pattern: CONVERSION_TRACKING_ID_PATTERN,
  },
  {
    constant: "Const - GA4 Measurement ID",
    platform: "ga4",
    resource: "keyEvent",
    pattern: MEASUREMENT_ID_PATTERN,
  },
];

const linkParameters = [
  eventParameter("link_url", "{{Click URL}}"),
  eventParameter("link_text", "{{Click Text}}"),
];

export const template = defineContainer({
  containerType: "web",
  variable: [
    manifestVariable({
      encoding: { name: "metadata" },
      conventions: {},
      recipes: {
        google_tag: {
          description:
            "The Google tag on Initialization - All Pages, loading GA4 and any Google Ads destination configured on it. Every other recipe assumes it. Replaces a Conversion Linker tag.",
          dependencies: [
            {
              constant: "Const - GA4 Measurement ID",
              platform: "ga4",
              resource: "dataStream",
              pattern: MEASUREMENT_ID_PATTERN,
            },
          ],
        },
        contact_form_submit: {
          description:
            "The contact form was submitted successfully: the site pushes dataLayer event contact_form_submit with form_id, form_name, form_destination and form_submit_text. Never GTM's Form Submission trigger, which misses AJAX forms and fires on failed validation.",
          dependencies: dependencies("contact_form_submit"),
        },
        call_click: {
          description:
            "A tel: link was clicked (Click URL contains tel:, so a swapped forwarding number still matches).",
          dependencies: dependencies("call_click"),
        },
        email_click: {
          description: "A mailto: link was clicked.",
          dependencies: dependencies("email_click"),
        },
        maps_click: {
          description: "A Google Maps link was clicked (directions).",
          dependencies: dependencies("maps_click"),
        },
      },
    }),
    constant("Const - GA4 Measurement ID", "<G-XXXXXXXXXX>"),
    constant(
      "Const - Google Ads Conversion ID",
      "<XXXXXXXXX>",
      "The bare numeric conversion id (the digits after AW- in Google Ads). GTM stores it without the prefix; the conversion tag builds AW-<id>/<label> itself."
    ),
    constant(labelConstant("contact_form_submit"), "<label>"),
    constant(labelConstant("call_click"), "<label>"),
    constant(labelConstant("email_click"), "<label>"),
    constant(labelConstant("maps_click"), "<label>"),
    dataLayer("DLV - form_id", "form_id"),
    dataLayer("DLV - form_name", "form_name"),
    dataLayer("DLV - form_destination", "form_destination"),
    dataLayer("DLV - form_submit_text", "form_submit_text"),
  ],
  trigger: [
    customEvent("contact_form_submit"),
    linkClick("Click - call", condition("contains", "{{Click URL}}", "tel:")),
    linkClick("Click - email", condition("contains", "{{Click URL}}", "mailto:")),
    linkClick(
      "Click - maps",
      condition(
        "matchRegex",
        "{{Click URL}}",
        "maps\\.google\\.|google\\.[a-z.]+/maps|maps\\.app\\.goo\\.gl"
      )
    ),
  ],
  tag: [
    {
      name: "Google Tag",
      type: "googtag",
      firingTriggerName: ["Initialization - All Pages"],
      monitoringMetadata: meta("google_tag"),
      consentSettings: notNeeded,
      parameter: [tpl("tagId", "{{Const - GA4 Measurement ID}}")],
      notes:
        'No Conversion Linker tag: a Google tag on every page sets the same first-party click cookies. Google\'s Conversion linker help says "If a container loads a Google tag on every page, it does not also need a conversion linker tag." https://support.google.com/tagmanager/answer/7549390. Add the Google Ads account as a destination of this Google tag in Google Ads or GA4 admin.',
    },
    ...conversion("contact_form_submit", "Custom Event - contact_form_submit", [
      eventParameter("form_id", "{{DLV - form_id}}"),
      eventParameter("form_name", "{{DLV - form_name}}"),
      eventParameter("form_destination", "{{DLV - form_destination}}"),
      eventParameter("form_submit_text", "{{DLV - form_submit_text}}"),
    ]),
    ...conversion("call_click", "Click - call", linkParameters),
    ...conversion("email_click", "Click - email", linkParameters),
    ...conversion("maps_click", "Click - maps", linkParameters),
  ],
});

/**
 * The template applied to an in-memory container and pulled back as a
 * GtmSnapshot, so it can be linted and pushed exactly as a pull would see it.
 */
export async function templateSnapshot(): Promise<GtmSnapshot> {
  const { service } = createFakeService({
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-SAMPLE", name: "Web Template (sample)" },
    ],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, { container: "GTM-SAMPLE", workspace: "sample", spec: template });
  return new GtmSnapshot(client, { container: "GTM-SAMPLE" }).init();
}
