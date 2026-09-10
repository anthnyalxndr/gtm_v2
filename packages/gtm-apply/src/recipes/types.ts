export type TriggerRecipe =
  | { type: "pageview"; pathEquals?: string; pathContains?: string }
  | { type: "formSubmit"; formId: string }
  | { type: "customEvent"; eventName: string };

export interface Ga4EventRecipe {
  kind: "ga4-event";
  /** Tag name. Names are identity in GTM, so keep them stable. */
  name: string;
  event: string;
  measurementId: string;
  trigger: TriggerRecipe;
}

export interface GoogleAdsRecipe {
  kind: "google-ads";
  name: string;
  conversionId: string;
  label: string;
  trigger: TriggerRecipe;
}

export type ConversionRecipe = Ga4EventRecipe | GoogleAdsRecipe;

export interface ApplyConversionsOptions {
  container: string;
  workspace: string;
  conversions: ConversionRecipe[];
  dryRun?: boolean;
  publish?: boolean;
  versionName?: string;
}
