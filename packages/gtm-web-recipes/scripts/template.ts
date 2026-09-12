import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import {
  applySpec,
  defineContainer,
  formatNotes,
  GtmSnapshot,
  manifestVariable,
  type PlaceholderMetadata,
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
 *
 * Metadata lives in entity notes: the text above a `---` line reaches the
 * customer, the JSON below it is the library's and is stripped before a tag
 * reaches a customer container.
 */

const tpl = (key: string, value: string) => ({ type: "template" as const, key, value });
const bool = (key: string, value: boolean) => ({
  type: "boolean" as const,
  key,
  value: String(value),
});
const notNeeded = { consentStatus: "notNeeded" as const };

/** Notes for a recipe root: customer text, then the library's `recipes` trailer. */
const declares = (text: string, recipe: string): string => formatNotes(text, { recipes: [recipe] });

/** A customer input: a constant holding a placeholder, documented in its notes. */
const input = (
  name: string,
  value: string,
  text: string,
  placeholder: PlaceholderMetadata
): VariableSpec => ({
  name,
  type: "c",
  notes: formatNotes(text, { placeholder }),
  parameter: [tpl("value", value)],
});
const dataLayer = (name: string, key: string, text: string): VariableSpec => ({
  name,
  type: "v",
  notes: text,
  parameter: [tpl("name", key)],
});
const labelConstant = (recipe: string) => `Const - Google Ads - ${recipe} Conversion Label`;
const label = (recipe: string): VariableSpec =>
  input(
    labelConstant(recipe),
    "<label>",
    `Conversion label of the Google Ads conversion action for ${recipe}.`,
    { kind: "adsConversionLabel", example: "AbCdEfGhIjKlMnOp", pattern: "^[A-Za-z0-9_-]{5,}$" }
  );

const condition = (type: "equals" | "contains" | "matchRegex", arg0: string, arg1: string) => ({
  type,
  parameter: [tpl("arg0", arg0), tpl("arg1", arg1)],
});

const customEvent = (recipe: string, notes: string): TriggerSpec => ({
  name: `Custom Event - ${recipe}`,
  type: "customEvent",
  notes,
  customEventFilter: [condition("equals", "{{_event}}", recipe)],
});

/** A link click trigger that waits up to two seconds for tags, as the UI configures one. */
const linkClick = (
  name: string,
  notes: string,
  filter: ReturnType<typeof condition>
): TriggerSpec => ({
  name,
  type: "linkClick",
  notes,
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
    notes: declares(`Sends the ${recipe} event to GA4.`, recipe),
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
    notes: declares(`Records the ${recipe} conversion in Google Ads.`, recipe),
    consentSettings: notNeeded,
    parameter: [
      tpl("conversionId", "{{Const - Google Ads Conversion ID}}"),
      tpl("conversionLabel", `{{${labelConstant(recipe)}}}`),
      bool("enableConversionLinker", true),
    ],
  },
];

/**
 * The recipe's Google Ads conversion action, carried by its label constant.
 * The one external resource that is genuinely per recipe: each recipe hits a
 * distinct conversion action. The conversion id and measurement id are
 * account-wide config, documented on their own constants, not repeated here;
 * a GTM constant value is capped at 1024 characters, so the manifest stays
 * lean. The action is named "GTM - <recipe>" on Google Ads (externalNames).
 */
const dependencies = (recipe: string) => [
  {
    constant: labelConstant(recipe),
    platform: "googleAds",
    resource: "conversionAction",
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
      conventions: {},
      recipes: {
        google_tag: {
          description: "Google tag on Initialization; base for every recipe.",
        },
        contact_form_submit: {
          description: "Contact form submitted (dataLayer event).",
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
      },
    }),
    input(
      "Const - GA4 Measurement ID",
      "<G-XXXXXXXXXX>",
      "Measurement ID of the site's GA4 web data stream (Admin > Data streams).",
      { kind: "ga4MeasurementId", example: "G-ABC123DEF4", pattern: "^G-[A-Z0-9]+$" }
    ),
    input(
      "Const - Google Ads Conversion ID",
      "<XXXXXXXXX>",
      "The bare numeric conversion id (the digits after AW- in Google Ads). GTM stores it without the prefix; the conversion tag builds AW-<id>/<label> itself.",
      { kind: "adsConversionId", example: "123456789", pattern: "^[0-9]+$" }
    ),
    label("contact_form_submit"),
    label("call_click"),
    label("email_click"),
    label("maps_click"),
    dataLayer("DLV - form_id", "form_id", "The submitted form's id, read from the dataLayer."),
    dataLayer(
      "DLV - form_name",
      "form_name",
      "The submitted form's name, read from the dataLayer."
    ),
    dataLayer(
      "DLV - form_destination",
      "form_destination",
      "The submitted form's destination URL, read from the dataLayer."
    ),
    dataLayer(
      "DLV - form_submit_text",
      "form_submit_text",
      "The submit button's text, read from the dataLayer."
    ),
  ],
  trigger: [
    customEvent(
      "contact_form_submit",
      "Fires on the dataLayer event contact_form_submit that the site's form handler pushes on a successful submit."
    ),
    linkClick(
      "Click - call",
      "Fires on a click of a tel: link. Contains, not starts-with, so a swapped forwarding number still matches.",
      condition("contains", "{{Click URL}}", "tel:")
    ),
    linkClick(
      "Click - email",
      "Fires on a click of a mailto: link.",
      condition("contains", "{{Click URL}}", "mailto:")
    ),
    linkClick(
      "Click - maps",
      "Fires on a click of a Google Maps link (a directions request).",
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
      consentSettings: notNeeded,
      parameter: [tpl("tagId", "{{Const - GA4 Measurement ID}}")],
      notes: declares(
        'Loads the Google tag on every page. No Conversion Linker tag: a Google tag on every page sets the same first-party click cookies. Google\'s Conversion linker help says "If a container loads a Google tag on every page, it does not also need a conversion linker tag." https://support.google.com/tagmanager/answer/7549390. Add the Google Ads account as a destination of this Google tag in Google Ads or GA4 admin.',
        "google_tag"
      ),
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
