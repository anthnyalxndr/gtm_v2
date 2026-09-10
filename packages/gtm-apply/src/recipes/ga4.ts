import type { ContainerSpec } from "../spec/types.js";
import { triggerName, triggerRecipeToSpec } from "./triggers.js";
import type { Ga4EventRecipe } from "./types.js";

/**
 * GA4 event tag (template type "gaawe") plus its trigger. Parameter keys
 * follow a GA4 event tag exported from the GTM UI; the live smoke test in
 * the plan is where a mismatch would surface.
 */
export function ga4Event(recipe: Ga4EventRecipe): ContainerSpec {
  return {
    trigger: [triggerRecipeToSpec(recipe.trigger)],
    tag: [
      {
        name: recipe.name,
        type: "gaawe",
        firingTriggerName: [triggerName(recipe.trigger)],
        parameter: [
          { type: "template", key: "eventName", value: recipe.event },
          { type: "template", key: "measurementIdOverride", value: recipe.measurementId },
        ],
      },
    ],
  };
}
