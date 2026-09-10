/**
 * GTM built-in variables: display name (as written inside {{ }}) to the API
 * enum type used by built_in_variables.create. Extend as needed; the live
 * smoke test in the plan verifies entries against a real container.
 */
export const BUILT_IN_VARIABLES: Readonly<Record<string, string>> = {
  "Page URL": "pageUrl",
  "Page Hostname": "pageHostname",
  "Page Path": "pagePath",
  Referrer: "referrer",
  Event: "event",
  "Container ID": "containerId",
  "Container Version": "containerVersion",
  "Debug Mode": "debugMode",
  "Random Number": "randomNumber",
  "HTML ID": "htmlId",
  "Environment Name": "environmentName",
  "Click Element": "clickElement",
  "Click Classes": "clickClasses",
  "Click ID": "clickId",
  "Click Target": "clickTarget",
  "Click URL": "clickUrl",
  "Click Text": "clickText",
  "Form Element": "formElement",
  "Form Classes": "formClasses",
  "Form ID": "formId",
  "Form Target": "formTarget",
  "Form URL": "formUrl",
  "Form Text": "formText",
  "Error Message": "errorMessage",
  "Error URL": "errorUrl",
  "Error Line": "errorLine",
  "New History Fragment": "newHistoryFragment",
  "Old History Fragment": "oldHistoryFragment",
  "New History State": "newHistoryState",
  "Old History State": "oldHistoryState",
  "History Source": "historySource",
  "Scroll Depth Threshold": "scrollDepthThreshold",
  "Scroll Depth Units": "scrollDepthUnits",
  "Scroll Direction": "scrollDepthDirection",
  "Video Provider": "videoProvider",
  "Video URL": "videoUrl",
  "Video Title": "videoTitle",
  "Video Duration": "videoDuration",
  "Video Percent": "videoPercent",
  "Video Visible": "videoVisible",
  "Video Status": "videoStatus",
  "Video Current Time": "videoCurrentTime",
  "Percent Visible": "elementVisibilityRatio",
  "On-Screen Duration": "elementVisibilityTime",
};

export function builtInTypeForName(name: string): string | undefined {
  return BUILT_IN_VARIABLES[name];
}

/** "CUSTOM_EVENT" -> "customEvent", "TEMPLATE" -> "template", "PAGE_PATH" -> "pagePath". */
export function upperSnakeToCamel(value: string): string {
  return value.toLowerCase().replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

const REFERENCE = /\{\{([^{}]+)\}\}/g;

/** Collect every {{Name}} reference found in any string nested inside `value`. */
export function referencedVariableNames(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    for (const m of value.matchAll(REFERENCE)) out.add(m[1].trim());
  } else if (Array.isArray(value)) {
    for (const v of value) referencedVariableNames(v, out);
  } else if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) referencedVariableNames(v, out);
  }
  return out;
}
