import type { ContainerSpec } from "../spec/types.js";
import { triggerName, triggerRecipeToSpec } from "./triggers.js";
import type { GoogleAdsRecipe } from "./types.js";

export const ADS_CONVERSION_ID_VARIABLE = "Const - Google Ads Conversion ID";

/**
 * Google Ads conversion tracking tag (template type "awct"), its trigger,
 * and a constant variable holding the conversion id so the tag fragment
 * stays customer-agnostic.
 */
export function googleAdsConversion(recipe: GoogleAdsRecipe): ContainerSpec {
  return {
    variable: [
      {
        name: ADS_CONVERSION_ID_VARIABLE,
        type: "c",
        parameter: [{ type: "template", key: "value", value: recipe.conversionId }],
      },
    ],
    trigger: [triggerRecipeToSpec(recipe.trigger)],
    tag: [
      {
        name: recipe.name,
        type: "awct",
        firingTriggerName: [triggerName(recipe.trigger)],
        parameter: [
          { type: "template", key: "conversionId", value: `{{${ADS_CONVERSION_ID_VARIABLE}}}` },
          { type: "template", key: "conversionLabel", value: recipe.label },
          { type: "boolean", key: "enableConversionLinker", value: "true" },
        ],
      },
    ],
  };
}
