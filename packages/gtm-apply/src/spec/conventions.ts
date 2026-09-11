import type { ContainerSpec, EntityKind } from "./types.js";
import type { SpecIssue } from "./validate.js";

/**
 * Naming rules for GTM entities. Prefixes are keyed by entity type so a rule
 * can say "gaawe tags start with GA4 - " without touching html tags. Patterns
 * are regular-expression sources (strings) so conventions can live in JSON,
 * including a library manifest.
 */
export interface NamingConventions {
  /** Required name prefix by tag type. */
  tagPrefixes: Record<string, string>;
  /** Required name prefix by variable type. */
  variablePrefixes: Record<string, string>;
  /** Required name prefix by trigger type. */
  triggerPrefixes: Record<string, string>;
  /** A regular expression every entity of the kind must match. */
  patterns: Partial<Record<EntityKind, string>>;
  /** Characters no name may contain. Tag Manager rejects ":". */
  forbidden: string;
  /** The constant that carries a library manifest; exempt from variable rules. */
  manifestName: string;
  /** Expected names of resources on other platforms, keyed "platform.resource", with ${recipe}. */
  externalNames: Record<string, string>;
}

export const DEFAULT_CONVENTIONS: NamingConventions = {
  tagPrefixes: {
    gaawe: "GA4 - ",
    sgtmgaaw: "GA4 - ",
    awct: "Ads - ",
    sgtmadsct: "Ads - ",
    sp: "Ads Remarketing - ",
    gclidw: "Conversion Linker",
    googtag: "Google Tag",
    flc: "Floodlight - ",
    fls: "Floodlight - ",
  },
  variablePrefixes: {
    c: "Const - ",
    v: "DLV - ",
    jsm: "JS - ",
    u: "URL - ",
    k: "Cookie - ",
    smm: "Lookup - ",
    remm: "Regex Lookup - ",
  },
  triggerPrefixes: {
    customEvent: "Custom Event - ",
    pageview: "Pageview - ",
    domReady: "DOM Ready - ",
    windowLoaded: "Window Loaded - ",
    click: "Click - ",
    linkClick: "Click - ",
    formSubmission: "Form Submit - ",
    historyChange: "History - ",
    scrollDepth: "Scroll - ",
    elementVisibility: "Visible - ",
    timer: "Timer - ",
    youTubeVideo: "Video - ",
  },
  patterns: {},
  forbidden: "[:]",
  manifestName: "Library - Manifest",
  externalNames: {
    "googleAds.conversionAction": "GTM - ${recipe}",
    "ga4.keyEvent": "${recipe}",
  },
};

export type ConventionOverrides = {
  [K in keyof NamingConventions]?: NamingConventions[K] extends Record<string, string>
    ? Partial<NamingConventions[K]>
    : NamingConventions[K];
};

/** Layer overrides over the defaults; record fields merge key by key, scalars replace. */
export function mergeConventions(
  ...layers: (ConventionOverrides | undefined)[]
): NamingConventions {
  const out: NamingConventions = {
    ...DEFAULT_CONVENTIONS,
    tagPrefixes: { ...DEFAULT_CONVENTIONS.tagPrefixes },
    variablePrefixes: { ...DEFAULT_CONVENTIONS.variablePrefixes },
    triggerPrefixes: { ...DEFAULT_CONVENTIONS.triggerPrefixes },
    patterns: { ...DEFAULT_CONVENTIONS.patterns },
    externalNames: { ...DEFAULT_CONVENTIONS.externalNames },
  };
  for (const layer of layers) {
    if (!layer) continue;
    for (const key of [
      "tagPrefixes",
      "variablePrefixes",
      "triggerPrefixes",
      "externalNames",
    ] as const) {
      Object.assign(out[key], layer[key] ?? {});
    }
    Object.assign(out.patterns, layer.patterns ?? {});
    if (layer.forbidden !== undefined) out.forbidden = layer.forbidden;
    if (layer.manifestName !== undefined) out.manifestName = layer.manifestName;
  }
  return out;
}

/** Fill a "platform.resource" name template for a recipe; undefined when no template applies. */
export function externalName(
  conventions: NamingConventions,
  platform: string,
  resource: string,
  recipe: string,
  template?: string
): string | undefined {
  const t = template ?? conventions.externalNames[`${platform}.${resource}`];
  return t?.replace(/\$\{recipe\}/g, recipe);
}

const KINDS: readonly EntityKind[] = [
  "folder",
  "variable",
  "trigger",
  "tag",
  "client",
  "transformation",
];

/** Every entity whose name breaks a convention, with the rule it breaks. */
export function checkNames(
  spec: ContainerSpec,
  conventions: NamingConventions = DEFAULT_CONVENTIONS
): SpecIssue[] {
  const issues: SpecIssue[] = [];
  const forbidden = new RegExp(conventions.forbidden);
  for (const kind of KINDS) {
    const pattern = conventions.patterns[kind] ? new RegExp(conventions.patterns[kind]!) : null;
    const prefixes =
      kind === "tag"
        ? conventions.tagPrefixes
        : kind === "variable"
          ? conventions.variablePrefixes
          : kind === "trigger"
            ? conventions.triggerPrefixes
            : null;
    for (const entity of spec[kind] ?? []) {
      const name = entity.name;
      if (!name) continue;
      if (kind === "variable" && name === conventions.manifestName) continue;
      const push = (message: string) =>
        issues.push({ entity: `${kind} "${name}"`, path: "name", message });
      if (forbidden.test(name)) push(`contains a character matching /${conventions.forbidden}/`);
      if (pattern && !pattern.test(name)) push(`must match /${conventions.patterns[kind]}/`);
      const type = "type" in entity ? entity.type : undefined;
      const prefix = type && prefixes ? prefixes[type] : undefined;
      if (prefix && !name.startsWith(prefix))
        push(`must start with "${prefix}" (${type} ${kind}s)`);
    }
  }
  return issues;
}
