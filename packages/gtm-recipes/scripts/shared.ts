import { formatNotes, type PlaceholderMetadata } from "@anthnyalxndr/gtm-apply";
import type { VariableSpec } from "@anthnyalxndr/gtm-model";

/** Building blocks both template containers use. */

export const tpl = (key: string, value: string) => ({ type: "template" as const, key, value });
export const bool = (key: string, value: boolean) => ({
  type: "boolean" as const,
  key,
  value: String(value),
});
export const notNeeded = { consentStatus: "notNeeded" as const };

/** Notes for a recipe root: customer text, then the library's `recipes` trailer. */
export const declares = (text: string, recipe: string): string =>
  formatNotes(text, { recipes: [recipe] });

/** A customer input: a constant holding a placeholder, documented in its notes. */
export const input = (
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

export const labelConstant = (recipe: string) => `Const - Google Ads - ${recipe} Conversion Label`;
export const label = (recipe: string): VariableSpec =>
  input(
    labelConstant(recipe),
    "<label>",
    `Conversion label of the Google Ads conversion action for ${recipe}.`,
    { kind: "adsConversionLabel", example: "AbCdEfGhIjKlMnOp", pattern: "^[A-Za-z0-9_-]{5,}$" }
  );

/** The account-wide Google Ads conversion id; a bare number, as GTM stores it. */
export const adsConversionId = (): VariableSpec =>
  input(
    "Const - Google Ads Conversion ID",
    "<XXXXXXXXX>",
    "The bare numeric conversion id (the digits after AW- in Google Ads). GTM stores it without the prefix; the conversion tag builds AW-<id>/<label> itself.",
    { kind: "adsConversionId", example: "123456789", pattern: "^[0-9]+$" }
  );

export const condition = (
  type: "equals" | "contains" | "matchRegex",
  arg0: string,
  arg1: string
) => ({
  type,
  parameter: [tpl("arg0", arg0), tpl("arg1", arg1)],
});

/**
 * The recipe's Google Ads conversion action, carried by its label constant.
 * The one external resource that is genuinely per recipe: each recipe hits a
 * distinct conversion action. The conversion id and measurement id are
 * account-wide config, documented on their own constants, not repeated here;
 * a GTM constant value is capped at 1024 characters, so the manifest stays
 * lean. The action is named "GTM - <recipe>" on Google Ads (externalNames).
 */
export const dependencies = (recipe: string) => [
  {
    constant: labelConstant(recipe),
    platform: "googleAds",
    resource: "conversionAction",
  },
];
