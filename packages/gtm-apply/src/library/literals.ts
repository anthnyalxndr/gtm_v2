import type { Condition, Parameter } from "../spec/generated/tagmanager-v2.js";

/**
 * A heuristic backstop to the placeholder rules: literals typed straight into
 * a trigger condition or a parameter that look like they belong to one site
 * (a path, a URL, a hostname, a CSS selector, a platform id, an email
 * address) transfer to every customer untouched. Lint reports them so the
 * author hoists the value into a Const with a placeholder entry.
 */
export type LiteralKind =
  "url" | "email" | "hostname" | "path" | "selector" | "platformId" | "siteHost";

/** What the manifest's `literals` entry may say. */
export interface LiteralRules {
  /** Literals that are generic despite their looks, compared exactly after trimming. */
  allow?: readonly string[];
  /** The template site's own hostnames; any literal containing one is reported. */
  hosts?: readonly string[];
}

export interface LiteralHit {
  kind: LiteralKind;
  value: string;
}

const REFERENCE = /\{\{[^}]*\}\}/g;
/** Tag Manager's own event names (gtm.js, gtm.dom, gtm.click, …) look like hostnames and are not. */
const GTM_EVENT = /^gtm\.[a-z]+$/i;

const HEURISTICS: readonly (readonly [LiteralKind, RegExp])[] = [
  ["url", /^https?:\/\//i],
  ["email", /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i],
  ["hostname", /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i],
  ["path", /^\/[a-z0-9._~%-]/i],
  ["selector", /^[#.][a-z_][\w-]*/i],
  ["platformId", /^(?:G|AW|GTM|GT|UA|DC)-[A-Z0-9]+$/],
];

/** Why a literal looks site-specific, or undefined when it does not. Variable references inside the value are ignored. */
export function classifyLiteral(raw: string, rules: LiteralRules = {}): LiteralHit | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (rules.allow?.some((a) => a.trim() === value)) return undefined;
  const lower = value.toLowerCase();
  for (const host of rules.hosts ?? []) {
    if (host && lower.includes(host.toLowerCase())) return { kind: "siteHost", value };
  }
  const text = value.replace(REFERENCE, "").trim();
  if (!text || GTM_EVENT.test(text)) return undefined;
  for (const [kind, pattern] of HEURISTICS) {
    if (pattern.test(text)) return { kind, value };
  }
  return undefined;
}

export interface LiteralFinding {
  /** Where the literal sits, e.g. `parameter.eventName`, `filter[0].arg1`, `parameter.map[2].value`. */
  path: string;
  hit: LiteralHit;
}

/** The parts of an entity that can hold literals. */
export interface LiteralBearer {
  parameter?: Parameter[] | null;
  filter?: Condition[] | null;
  customEventFilter?: Condition[] | null;
  autoEventFilter?: Condition[] | null;
}

function walk(
  params: readonly Parameter[] | null | undefined,
  prefix: string,
  keyed: boolean,
  rules: LiteralRules,
  skip: (value: string) => boolean,
  out: LiteralFinding[]
): void {
  (params ?? []).forEach((p, i) => {
    const path = keyed && p.key ? `${prefix}.${p.key}` : `${prefix}[${i}]`;
    if (typeof p.value === "string" && !skip(p.value)) {
      const hit = classifyLiteral(p.value, rules);
      if (hit) out.push({ path, hit });
    }
    if (p.list) walk(p.list, `${path}.list`, false, rules, skip, out);
    if (p.map) walk(p.map, `${path}.map`, true, rules, skip, out);
  });
}

/** Every site-specific looking literal in an entity's parameters and conditions. `skip` exempts values (placeholders, for instance). */
export function findLiterals(
  entity: LiteralBearer,
  rules: LiteralRules = {},
  skip: (value: string) => boolean = () => false
): LiteralFinding[] {
  const out: LiteralFinding[] = [];
  walk(entity.parameter, "parameter", true, rules, skip, out);
  for (const field of ["filter", "customEventFilter", "autoEventFilter"] as const) {
    (entity[field] ?? []).forEach((condition, i) => {
      walk(condition.parameter, `${field}[${i}]`, true, rules, skip, out);
    });
  }
  return out;
}

/** How to phrase a hit for a lint message. */
export function describeLiteral(hit: LiteralHit): string {
  switch (hit.kind) {
    case "siteHost":
      return "names the template site";
    case "platformId":
      return "looks like a platform id";
    case "url":
    case "email":
    case "hostname":
    case "path":
    case "selector":
      return `looks like a${hit.kind === "url" ? " URL" : hit.kind === "email" ? "n email address" : hit.kind === "selector" ? " CSS selector" : ` ${hit.kind}`}`;
  }
}
