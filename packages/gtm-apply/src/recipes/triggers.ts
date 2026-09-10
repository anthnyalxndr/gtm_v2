import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { TriggerSpec } from "../spec/types.js";
import type { TriggerRecipe } from "./types.js";

type Condition = tagmanager_v2.Schema$Condition;

function condition(type: "equals" | "contains", left: string, right: string): Condition {
  return {
    type,
    parameter: [
      { type: "template", key: "arg0", value: left },
      { type: "template", key: "arg1", value: right },
    ],
  };
}

export function triggerName(recipe: TriggerRecipe): string {
  switch (recipe.type) {
    case "pageview":
      return `Pageview - ${recipe.pathEquals ?? recipe.pathContains ?? "all"}`;
    case "formSubmit":
      return `Form Submit - ${recipe.formId}`;
    case "customEvent":
      return `Custom Event - ${recipe.eventName}`;
  }
}

/**
 * Compile a trigger recipe to a TriggerSpec. Built-in variables referenced
 * here ({{Page Path}}, {{Form ID}}) are enabled by the planner.
 */
export function triggerRecipeToSpec(recipe: TriggerRecipe): TriggerSpec {
  const name = triggerName(recipe);
  switch (recipe.type) {
    case "pageview": {
      const filter: Condition[] = [];
      if (recipe.pathEquals) filter.push(condition("equals", "{{Page Path}}", recipe.pathEquals));
      if (recipe.pathContains) {
        filter.push(condition("contains", "{{Page Path}}", recipe.pathContains));
      }
      return { name, type: "pageview", ...(filter.length ? { filter } : {}) };
    }
    case "formSubmit":
      return {
        name,
        type: "formSubmission",
        filter: [condition("equals", "{{Form ID}}", recipe.formId)],
        waitForTags: { type: "boolean", value: "false" },
        checkValidation: { type: "boolean", value: "false" },
      };
    case "customEvent":
      return {
        name,
        type: "customEvent",
        customEventFilter: [condition("equals", "{{_event}}", recipe.eventName)],
      };
  }
}
