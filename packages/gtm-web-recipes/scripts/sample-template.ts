import { defineContainer, manifestVariable } from "@anthnyalxndr/gtm-apply";

const meta = (recipes: string) => ({
  type: "map" as const,
  map: [{ type: "template" as const, key: "recipes", value: recipes }],
});
const constant = (name: string, value: string) => ({
  name,
  type: "c",
  parameter: [{ type: "template" as const, key: "value", value }],
});
const conversion = (recipe: string, trigger: string) => [
  {
    name: `GA4 - ${recipe}`,
    type: "gaawe",
    firingTriggerName: [trigger],
    monitoringMetadata: meta(recipe),
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
    monitoringMetadata: meta(recipe),
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
 * Linker and customer constants.
 */
export const sampleTemplate = defineContainer({
  containerType: "web",
  variable: [
    manifestVariable({
      encoding: { name: "metadata" },
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
    constant("Const - GA4 Measurement ID", "<G-XXXXXXX>"),
    constant("Const - Ads Conversion ID", "<AW-XXXXXXXXX>"),
    constant("Const - Ads Label - form_submit", "<label>"),
    constant("Const - Ads Label - email_click", "<label>"),
    constant("Const - Ads Label - call_click", "<label>"),
  ],
  trigger: [
    {
      name: "Custom Event - form_submit",
      type: "customEvent",
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
      monitoringMetadata: meta("form_submit, email_click, call_click"),
    },
  ],
});
