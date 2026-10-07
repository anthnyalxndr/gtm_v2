import type { ContainerType } from "../container-type.js";
import {
  TRIGGER_TYPES,
  type BuiltInVariableType,
  type TriggerType,
} from "./generated/tagmanager-v2.js";

/**
 * What Tag Manager offers a container of one type, which the API does not
 * list: its built-in triggers, the trigger types it accepts and its built-in
 * variables. Catalogs are plain data, one per container type, composed from
 * small shared pieces rather than inherited, because the types share little.
 */
export interface ContainerCatalog<T extends ContainerType = ContainerType> {
  readonly type: T;
  readonly triggers: {
    /**
     * Built-in trigger display name to its fixed id. They exist in every
     * container of this type but are never listed as trigger resources, so a
     * spec names them like any trigger and the engine maps the name to the id.
     */
    readonly builtIn: Readonly<Record<string, string>>;
    /** Trigger types a container of this type accepts. */
    readonly types: readonly TriggerType[];
  };
  /** Built-in variable display name (as written inside {{ }}) to its API type. */
  readonly builtInVariables: Readonly<Record<string, BuiltInVariableType>>;
}

/** Utility variables every container type has. */
const UTILITY_VARIABLES = {
  "Container ID": "containerId",
  "Container Version": "containerVersion",
  "Debug Mode": "debugMode",
  "Random Number": "randomNumber",
} as const satisfies Record<string, BuiltInVariableType>;

/**
 * Web containers. Built-in variables are the 47 enabled in Template - Web
 * (GTM-TPLKC7QP) with every built-in turned on; trigger types are its
 * new-trigger picker (2026-09-28).
 */
export const WEB_CATALOG = {
  type: "web",
  triggers: {
    builtIn: {
      "All Pages": "2147479553",
      "Consent Initialization - All Pages": "2147479572",
      "Initialization - All Pages": "2147479573",
    },
    types: [
      "consentInit",
      "init",
      "pageview",
      "domReady",
      "windowLoaded",
      "click",
      "linkClick",
      "elementVisibility",
      "formSubmission",
      "scrollDepth",
      "youTubeVideo",
      "customEvent",
      "historyChange",
      "jsError",
      "timer",
      "triggerGroup",
    ],
  },
  builtInVariables: {
    "Page URL": "pageUrl",
    "Page Hostname": "pageHostname",
    "Page Path": "pagePath",
    Referrer: "referrer",
    Event: "event",
    ...UTILITY_VARIABLES,
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
    "Analytics Client ID": "analyticsClientId",
    "Analytics Session ID": "analyticsSessionId",
    "Analytics Session Number": "analyticsSessionNumber",
  },
} as const satisfies ContainerCatalog<"web">;

/**
 * Server containers. Built-in variables are the 10 enabled in Template -
 * Server (GTM-WMGVDZ5H) with every built-in turned on; trigger types are its
 * new-trigger picker; the built-in trigger was read in its tag editor and
 * confirmed with a scratch tag on the id (2026-09-28). Web and server both
 * call their built-in trigger "All Pages", with different ids.
 */
export const SERVER_CATALOG = {
  type: "server",
  triggers: {
    builtIn: { "All Pages": "2147479574" },
    types: ["always", "customEvent", "serverPageview"],
  },
  builtInVariables: {
    "Event Name": "eventName",
    ...UTILITY_VARIABLES,
    "Request Path": "requestPath",
    "Request Method": "requestMethod",
    "Client Name": "clientName",
    "Query String": "queryString",
    "Visitor Region": "visitorRegion",
  },
} as const satisfies ContainerCatalog<"server">;

/** Every built-in variable name any catalog knows, as the flat catalog had it. */
const ALL_BUILT_IN_VARIABLES: Readonly<Record<string, BuiltInVariableType>> = {
  ...WEB_CATALOG.builtInVariables,
  ...SERVER_CATALOG.builtInVariables,
};

/**
 * AMP and mobile containers are not curated yet: no built-in triggers, every
 * trigger type, and every known built-in variable name.
 */
const uncurated = <T extends ContainerType>(type: T): ContainerCatalog<T> => ({
  type,
  triggers: { builtIn: {}, types: TRIGGER_TYPES },
  builtInVariables: ALL_BUILT_IN_VARIABLES,
});

/** The catalog of every container type. */
export const CATALOGS: { readonly [T in ContainerType]: ContainerCatalog<T> } = {
  web: WEB_CATALOG,
  server: SERVER_CATALOG,
  amp: uncurated("amp"),
  android: uncurated("android"),
  ios: uncurated("ios"),
};

/** The catalog for a container type; a spec without a type is a web spec. */
export function catalogFor<T extends ContainerType = "web">(
  type: T = "web" as T
): ContainerCatalog<T> {
  return CATALOGS[type];
}

/**
 * Every built-in variable display name any container type knows, to its API
 * type. Kept for existing imports; prefer catalogFor(type).builtInVariables.
 */
export const BUILT_IN_VARIABLES: Readonly<Record<string, BuiltInVariableType>> =
  ALL_BUILT_IN_VARIABLES;

/**
 * The API type of a built-in variable display name, for one container type,
 * or across every type when none is given (names do not collide).
 */
export function builtInTypeForName(
  name: string,
  type?: ContainerType
): BuiltInVariableType | undefined {
  return (type ? CATALOGS[type].builtInVariables : ALL_BUILT_IN_VARIABLES)[name];
}

/** The web built-in triggers. Kept for existing imports; prefer catalogFor(type).triggers.builtIn. */
export const BUILT_IN_TRIGGERS: Readonly<Record<string, string>> = WEB_CATALOG.triggers.builtIn;

/** A built-in trigger's id by display name. Names collide across types, so no type means web. */
export function builtInTriggerIdForName(name: string, type?: ContainerType): string | undefined {
  return catalogFor(type).triggers.builtIn[name];
}

/** A built-in trigger's display name by id, for one container type (web when none is given). */
export function builtInTriggerNameForId(id: string, type?: ContainerType): string | undefined {
  const builtIn = catalogFor(type).triggers.builtIn;
  return Object.keys(builtIn).find((name) => builtIn[name] === id);
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
