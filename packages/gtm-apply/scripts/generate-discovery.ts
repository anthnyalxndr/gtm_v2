/**
 * Generate src/spec/generated/tagmanager-v2.ts from the committed, trimmed
 * Tag Manager v2 Discovery document (scripts/discovery/tagmanager-v2.schemas.json).
 *
 *   pnpm gen:discovery            # regenerate from the committed schemas
 *   pnpm gen:discovery --fetch    # refresh the schemas from Google first
 *
 * The output carries the entity interfaces with their API docs, string-literal
 * unions for every enum field, and a schema table the run-time validator walks.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import prettier from "prettier";

const DISCOVERY_URL = "https://tagmanager.googleapis.com/$discovery/rest?version=v2";
/** Every schema reachable from these is kept. */
export const ROOTS = [
  "Tag",
  "Trigger",
  "Variable",
  "Folder",
  "BuiltInVariable",
  "Container",
  "Workspace",
  "Environment",
  "Destination",
  "ContainerVersionHeader",
  "Client",
  "Transformation",
  "Zone",
  "CustomTemplate",
  "GtagConfig",
];

interface DiscoveryProperty {
  type?: string;
  $ref?: string;
  items?: { type?: string; $ref?: string; enum?: string[] };
  enum?: string[];
  enumDescriptions?: string[];
  description?: string;
  readOnly?: boolean;
}
interface DiscoverySchema {
  id: string;
  description?: string;
  properties?: Record<string, DiscoveryProperty>;
}
export interface TrimmedDiscovery {
  revision: string;
  version: string;
  discoveryUrl: string;
  schemas: Record<string, DiscoverySchema>;
}

/** Keep only the schemas reachable from ROOTS, so the committed file stays small. */
export function trimDiscovery(doc: {
  revision: string;
  version: string;
  schemas: Record<string, DiscoverySchema>;
}): TrimmedDiscovery {
  const keep: Record<string, DiscoverySchema> = {};
  const todo = [...ROOTS];
  while (todo.length) {
    const name = todo.shift()!;
    if (keep[name]) continue;
    const schema = doc.schemas[name];
    if (!schema) throw new Error(`Discovery document has no schema ${name}`);
    keep[name] = schema;
    for (const p of Object.values(schema.properties ?? {})) {
      for (const ref of [p.$ref, p.items?.$ref]) if (ref && !keep[ref]) todo.push(ref);
    }
  }
  const schemas = Object.fromEntries(
    Object.keys(keep)
      .sort()
      .map((k) => [k, keep[k]])
  );
  return { revision: doc.revision, version: doc.version, discoveryUrl: DISCOVERY_URL, schemas };
}

const pascal = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const screaming = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

/** Parameter.type -> ParameterType, Tag.tagFiringOption -> TagFiringOption. */
export function enumTypeName(schema: string, property: string): string {
  return property === "type" ? `${schema}Type` : pascal(property);
}
/** TriggerType -> TRIGGER_TYPES, ConsentStatus -> CONSENT_STATUSES. */
export function enumConstName(typeName: string): string {
  const base = screaming(typeName);
  return base.endsWith("S") ? `${base}ES` : `${base}S`;
}

const isSentinel = (v: string): boolean => /Unspecified$/.test(v);

function doc(text: string | undefined, indent: string): string {
  if (!text) return "";
  const safe = text.replace(/\*\//g, "*\\/").trim();
  return `${indent}/** ${safe} */\n`;
}

interface EnumDef {
  schema: string;
  property: string;
  typeName: string;
  constName: string;
  values: string[];
  descriptions: Map<string, string>;
}

function collectEnums(schemas: Record<string, DiscoverySchema>): EnumDef[] {
  const out: EnumDef[] = [];
  for (const [schema, def] of Object.entries(schemas)) {
    for (const [property, p] of Object.entries(def.properties ?? {})) {
      const values = p.enum ?? p.items?.enum;
      if (!values) continue;
      const typeName = enumTypeName(schema, property);
      const descriptions = new Map<string, string>();
      (p.enumDescriptions ?? []).forEach((d, i) => {
        if (d) descriptions.set(values[i], d);
      });
      out.push({
        schema,
        property,
        typeName,
        constName: enumConstName(typeName),
        values: values.filter((v) => !isSentinel(v)),
        descriptions,
      });
    }
  }
  return out;
}

function tsType(p: DiscoveryProperty, enumName: string | undefined): string {
  if (enumName) return enumName;
  if (p.$ref) return p.$ref;
  if (p.type === "array") {
    const item = p.items ?? {};
    return `${item.$ref ?? primitive(item.type)}[]`;
  }
  return primitive(p.type);
}
function primitive(t: string | undefined): string {
  switch (t) {
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "integer":
    case "number":
      return "number";
    default:
      return "unknown";
  }
}

export async function generate(input: TrimmedDiscovery): Promise<string> {
  const { schemas } = input;
  const enums = collectEnums(schemas);
  const enumFor = (schema: string, property: string): EnumDef | undefined =>
    enums.find((e) => e.schema === schema && e.property === property);
  const lines: string[] = [];
  lines.push(
    "// GENERATED FILE. Do not edit by hand.",
    "// Source: Tag Manager API v2 Discovery document, see scripts/generate-discovery.ts.",
    "",
    `export const DISCOVERY_REVISION = ${JSON.stringify(input.revision)};`,
    ""
  );
  for (const e of enums) {
    lines.push(`/** Values of ${e.schema}.${e.property}. */`);
    lines.push(`export const ${e.constName} = [`);
    for (const v of e.values) {
      const d = e.descriptions.get(v);
      lines.push(`  ${d ? `/** ${d.replace(/\*\//g, "*\\/")} */ ` : ""}${JSON.stringify(v)},`);
    }
    lines.push("] as const;");
    lines.push(`export type ${e.typeName} = (typeof ${e.constName})[number];`, "");
  }
  for (const [name, def] of Object.entries(schemas)) {
    lines.push(doc(def.description, "") + `export interface ${name} {`);
    for (const [prop, p] of Object.entries(def.properties ?? {})) {
      const en = enumFor(name, prop);
      const t = tsType(p, en && p.type !== "array" ? en.typeName : undefined);
      const arrayEnum = en && p.type === "array" ? `${en.typeName}[]` : t;
      lines.push(doc(p.description, "  ") + `  ${prop}?: ${arrayEnum};`);
    }
    lines.push("}", "");
  }
  lines.push(
    `export type SchemaName = ${Object.keys(schemas)
      .map((n) => JSON.stringify(n))
      .join(" | ")};`,
    "",
    "export interface PropertyDef {",
    '  kind: "string" | "boolean" | "number" | "ref" | "string[]" | "ref[]" | "unknown";',
    "  ref?: SchemaName;",
    "  enum?: readonly string[];",
    "}",
    "",
    "/** Property shapes per schema, for run-time validation of a spec. */",
    "export const SCHEMAS: Record<SchemaName, Record<string, PropertyDef>> = {"
  );
  for (const [name, def] of Object.entries(schemas)) {
    lines.push(`  ${name}: {`);
    for (const [prop, p] of Object.entries(def.properties ?? {})) {
      const en = enumFor(name, prop);
      const parts: string[] = [];
      if (p.$ref) parts.push(`kind: "ref", ref: ${JSON.stringify(p.$ref)}`);
      else if (p.type === "array") {
        if (p.items?.$ref) parts.push(`kind: "ref[]", ref: ${JSON.stringify(p.items.$ref)}`);
        else parts.push(`kind: ${JSON.stringify(`${primitive(p.items?.type)}[]`)}`);
      } else parts.push(`kind: ${JSON.stringify(primitive(p.type))}`);
      if (en) parts.push(`enum: ${en.constName}`);
      lines.push(`    ${prop}: { ${parts.join(", ")} },`);
    }
    lines.push("  },");
  }
  lines.push("};", "");
  const config = (await prettier.resolveConfig(fileURLToPath(import.meta.url))) ?? {};
  return prettier.format(lines.join("\n"), { ...config, parser: "typescript" });
}

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMAS_PATH = join(here, "discovery", "tagmanager-v2.schemas.json");
export const OUTPUT_PATH = join(here, "..", "src", "spec", "generated", "tagmanager-v2.ts");

async function main(): Promise<void> {
  if (process.argv.includes("--fetch")) {
    const res = await fetch(DISCOVERY_URL);
    if (!res.ok) throw new Error(`Fetching ${DISCOVERY_URL} failed: ${res.status}`);
    const trimmed = trimDiscovery((await res.json()) as Parameters<typeof trimDiscovery>[0]);
    await writeFile(SCHEMAS_PATH, JSON.stringify(trimmed, null, 2) + "\n");
    console.log(`Wrote ${SCHEMAS_PATH} (revision ${trimmed.revision})`);
  }
  const input = JSON.parse(await readFile(SCHEMAS_PATH, "utf-8")) as TrimmedDiscovery;
  await writeFile(OUTPUT_PATH, await generate(input));
  console.log(`Wrote ${OUTPUT_PATH} (revision ${input.revision})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
