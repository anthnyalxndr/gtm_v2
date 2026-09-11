import {
  defineContainer,
  formatNotes,
  manifestVariable,
  type PlaceholderMetadata,
} from "@anthnyalxndr/gtm-apply";

/** Notes for a recipe root: customer text, then the library's `recipes` trailer. */
const declares = (text: string, ...recipes: string[]) => formatNotes(text, { recipes });

/** A customer input: a constant holding a placeholder, documented in its notes. */
const input = (name: string, value: string, text: string, placeholder: PlaceholderMetadata) => ({
  name,
  type: "c",
  notes: formatNotes(text, { placeholder }),
  parameter: [{ type: "template" as const, key: "value", value }],
});

const conversion = (recipe: string, trigger: string) => [
  {
    name: `GA4 - ${recipe}`,
    type: "gaawe",
    firingTriggerName: [trigger],
    notes: declares(`Sends the ${recipe} event to GA4.`, recipe),
    parameter: [
      { type: "template" as const, key: "eventName", value: recipe },
      {
        type: "template" as const,
        key: "measurementIdOverride",
        value: "{{Const - GA4 Measurement ID}}",
      },
    ],
  },
  {
    name: `Ads - ${recipe}`,
    type: "awct",
    firingTriggerName: [trigger],
    notes: declares(`Records the ${recipe} conversion in Google Ads.`, recipe),
    setupTag: [{ tagName: "Conversion Linker" }],
    parameter: [
      { type: "template" as const, key: "conversionId", value: "{{Const - Ads Conversion ID}}" },
      {
        type: "template" as const,
        key: "conversionLabel",
        value: `{{Const - Ads Label - ${recipe}}}`,
      },
    ],
  },
];
const label = (recipe: string) =>
  input(
    `Const - Ads Label - ${recipe}`,
    "<label>",
    `Conversion label of the Google Ads conversion action for ${recipe}.`,
    { kind: "adsConversionLabel", example: "AbCdEfGhIjKlMnOp" }
  );
const linkClick = (name: string, prefix: string) => ({
  name,
  type: "linkClick" as const,
  filter: [
    {
      type: "startsWith" as const,
      parameter: [
        { type: "template" as const, key: "arg0", value: "{{Click URL}}" },
        { type: "template" as const, key: "arg1", value: prefix },
      ],
    },
  ],
});

/**
 * A stand-in for the Web Template container until the first real pull: three
 * event recipes with GA4 and Google Ads destinations sharing a Conversion
 * Linker and customer constants. Recipes and placeholders are declared in
 * notes trailers; the text above each trailer reaches the customer.
 */
export const sampleTemplate = defineContainer({
  containerType: "web",
  variable: [
    manifestVariable({
      conventions: {},
      recipes: {
        form_submit: {
          description: "A lead form was submitted (dataLayer event form_submit)",
          dependencies: [
            {
              constant: "Const - Ads Label - form_submit",
              platform: "googleAds",
              resource: "conversionAction",
              pattern: "^[A-Za-z0-9_-]{5,}$",
            },
          ],
        },
        email_click: {
          description: "A mailto: link was clicked",
          dependencies: [
            {
              constant: "Const - Ads Label - email_click",
              platform: "googleAds",
              resource: "conversionAction",
              pattern: "^[A-Za-z0-9_-]{5,}$",
            },
          ],
        },
        call_click: {
          description: "A tel: link was clicked",
          dependencies: [
            {
              constant: "Const - Ads Label - call_click",
              platform: "googleAds",
              resource: "conversionAction",
              pattern: "^[A-Za-z0-9_-]{5,}$",
            },
          ],
        },
      },
    }),
    input(
      "Const - GA4 Measurement ID",
      "<G-XXXXXXX>",
      "Measurement ID of the site's GA4 web data stream (Admin > Data streams).",
      { kind: "ga4MeasurementId", example: "G-ABC123DEF4", pattern: "^G-[A-Z0-9]+$" }
    ),
    input(
      "Const - Ads Conversion ID",
      "<AW-XXXXXXXXX>",
      "Conversion ID shared by every conversion action of the Google Ads account.",
      { kind: "adsConversionId", example: "AW-123456789", pattern: "^AW-\\d+$" }
    ),
    label("form_submit"),
    label("email_click"),
    label("call_click"),
  ],
  trigger: [
    {
      name: "Custom Event - form_submit",
      type: "customEvent",
      notes: "Fires on the dataLayer event form_submit that the site's form handler pushes.",
      customEventFilter: [
        {
          type: "equals",
          parameter: [
            { type: "template", key: "arg0", value: "{{_event}}" },
            { type: "template", key: "arg1", value: "form_submit" },
          ],
        },
      ],
    },
    linkClick("Click - email", "mailto:"),
    linkClick("Click - call", "tel:"),
  ],
  tag: [
    ...conversion("form_submit", "Custom Event - form_submit"),
    ...conversion("email_click", "Click - email"),
    ...conversion("call_click", "Click - call"),
    {
      name: "Conversion Linker",
      type: "gclidw",
      notes: declares(
        "Stores Google Ads click information so conversion tags can attribute.",
        "form_submit",
        "email_click",
        "call_click"
      ),
    },
  ],
});
