// A container spec written in TypeScript. Every enum-valued field (trigger
// type, condition type, parameter type, tagFiringOption, consentStatus,
// builtInVariable) is a string-literal union, so your editor completes the
// values and `tsc` rejects a typo before anything is sent to Tag Manager.
//
//   gtm-apply apply --container GTM-XXXXXXX --workspace onboarding --spec spec.example.ts --dry-run
import { defineContainer } from "./src/index.js";

const ADS_ID = "Const - Google Ads Conversion ID";

export default defineContainer({
  folder: [{ name: "Conversions" }],
  variable: [
    {
      name: ADS_ID,
      type: "c",
      parentFolderName: "Conversions",
      parameter: [{ type: "template", key: "value", value: "AW-123" }],
    },
  ],
  trigger: [
    {
      name: "Custom Event - lead",
      type: "customEvent",
      parentFolderName: "Conversions",
      customEventFilter: [
        {
          type: "equals",
          parameter: [
            { type: "template", key: "arg0", value: "{{_event}}" },
            { type: "template", key: "arg1", value: "lead" },
          ],
        },
      ],
    },
  ],
  tag: [
    {
      name: "Ads - Lead",
      type: "awct",
      parentFolderName: "Conversions",
      firingTriggerName: ["Custom Event - lead"],
      tagFiringOption: "oncePerEvent",
      consentSettings: { consentStatus: "notSet" },
      parameter: [
        { type: "template", key: "conversionId", value: `{{${ADS_ID}}}` },
        { type: "template", key: "conversionLabel", value: "xyz" },
        { type: "boolean", key: "enableConversionLinker", value: "true" },
      ],
    },
  ],
});
