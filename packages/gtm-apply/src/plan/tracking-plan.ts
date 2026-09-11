import { writeFile } from "node:fs/promises";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import type { GtmSnapshot, GtmSnapshotData } from "../library/gtm-snapshot.js";
import { checkNames } from "../spec/conventions.js";
import { applySpec, type ApplySpecOutcome } from "../spec/execute.js";
import type { ContainerSpec, VariableSpec } from "../spec/types.js";
import { formatIssue, type SpecIssue } from "../spec/validate.js";

/**
 * What a customer declares: which recipes to install, which destination
 * families to keep, and the values of the constants those recipes need.
 */
export interface TrackingPlan<R extends string = string, C extends string = string> {
  recipes: readonly R[];
  /** Keep only destination tags in these families; omit for all. */
  destinations?: readonly string[];
  /** Values for `Const - …` variables in the selected recipes. */
  constants?: Partial<Record<C, string>>;
}

/** Identity helper: recipe and constant names are checked against the library's literal types. */
export function defineTrackingPlan<R extends string, C extends string>(
  library: GtmSnapshot<R, C>,
  plan: TrackingPlan<NoInfer<R>, NoInfer<C>>
): TrackingPlan<R, C> {
  void library;
  return plan;
}

/** Library values that mean "fill me in": `<AW-XXXXXXXXX>` and the like. Override in the manifest. */
export const DEFAULT_PLACEHOLDER_PATTERN = "^<[^>]*>$";

export interface CompiledPlan {
  spec: ContainerSpec;
  /** Problems that stop the apply. */
  issues: SpecIssue[];
  warnings: string[];
}

export class TrackingPlanError extends Error {
  constructor(public readonly issues: SpecIssue[]) {
    super(`Plan has ${issues.length} problem(s):\n${issues.map(formatIssue).join("\n")}`);
  }
}

const constantValue = (v: VariableSpec): string | undefined =>
  v.parameter?.find((p) => p.key === "value")?.value;

const withValue = (v: VariableSpec, value: string): VariableSpec => ({
  ...v,
  parameter: [
    ...(v.parameter ?? []).filter((p) => p.key !== "value"),
    { type: "template", key: "value", value },
  ],
});

/**
 * Turn a plan into the spec to apply: select the recipes, fill in constants,
 * and check placeholders, dependency patterns and names. Pure; no API calls.
 */
export function compilePlan<R extends string, C extends string>(
  library: GtmSnapshot<R, C>,
  plan: TrackingPlan<R, C>
): CompiledPlan {
  const issues: SpecIssue[] = [];
  const warnings: string[] = [];
  const placeholder = new RegExp(
    library.manifest?.placeholderPattern ?? DEFAULT_PLACEHOLDER_PATTERN
  );
  const supplied = (plan.constants ?? {}) as Record<string, string | undefined>;

  const spec = library.select(plan.recipes, { destinations: plan.destinations });
  const constants = new Map<string, string>();
  spec.variable = (spec.variable ?? []).map((v) => {
    if (v.type !== "c" || !v.name) return v;
    const value = supplied[v.name];
    if (value !== undefined) {
      if (placeholder.test(value)) {
        warnings.push(
          `constant "${v.name}" still holds the placeholder value ${JSON.stringify(value)}`
        );
      }
      constants.set(v.name, value);
      return withValue(v, value);
    }
    const libraryValue = constantValue(v) ?? "";
    if (placeholder.test(libraryValue)) {
      issues.push({
        entity: `variable "${v.name}"`,
        path: "value",
        message: `needs a value in the plan's constants (library holds ${JSON.stringify(libraryValue)})`,
      });
    }
    constants.set(v.name, libraryValue);
    return v;
  });
  if (spec.variable.length === 0) delete spec.variable;

  for (const name of Object.keys(supplied)) {
    if (constants.has(name)) continue;
    if (library.variables.has(name)) {
      warnings.push(`constant "${name}" is not used by the selected recipes`);
    } else {
      issues.push({
        entity: `plan`,
        path: `constants.${name}`,
        message: "is not a constant in the library",
      });
    }
  }

  for (const name of plan.recipes) {
    const recipe = library.recipe(name);
    if (!recipe) continue;
    recipe.dependencies.forEach((dep, i) => {
      if (!dep.pattern || !constants.has(dep.constant)) return;
      const value = constants.get(dep.constant)!;
      if (!new RegExp(dep.pattern).test(value)) {
        issues.push({
          entity: `recipe "${name}"`,
          path: `dependencies[${i}]`,
          message: `${dep.platform} ${dep.resource} in "${dep.constant}" must match /${dep.pattern}/ (got ${JSON.stringify(value)})`,
        });
      }
    });
  }

  const conventions = library.conventions;
  if (conventions) issues.push(...checkNames(spec, conventions));
  return { spec, issues, warnings };
}

export interface ApplyPlanOptions<R extends string, C extends string> {
  library: GtmSnapshot<R, C>;
  plan: TrackingPlan<R, C>;
  container: string;
  workspace: string;
  dryRun?: boolean;
  publish?: boolean;
  versionName?: string;
  /** Also write the compiled spec here as JSON, for review or a later `gtm-apply apply --spec`. */
  writeSpecTo?: string;
}

export interface ApplyPlanOutcome extends ApplySpecOutcome {
  spec: ContainerSpec;
  warnings: string[];
}

/** Compile a plan and apply it through the spec engine. Throws TrackingPlanError before any API call when the plan has problems. */
export async function applyPlan<R extends string, C extends string>(
  client: GtmClient,
  options: ApplyPlanOptions<R, C>
): Promise<ApplyPlanOutcome> {
  const { library, plan, writeSpecTo, ...rest } = options;
  const compiled = compilePlan(library, plan);
  if (compiled.issues.length > 0) throw new TrackingPlanError(compiled.issues);
  if (writeSpecTo) await writeFile(writeSpecTo, JSON.stringify(compiled.spec, null, 2) + "\n");
  const outcome = await applySpec(client, { ...rest, spec: compiled.spec });
  return { ...outcome, spec: compiled.spec, warnings: compiled.warnings };
}

/** Source of a TypeScript module exporting the snapshot as a const literal, for a content package to commit. */
export function libraryModuleSource(data: GtmSnapshotData, exportName = "data"): string {
  return [
    "// GENERATED by gtm-apply from a Tag Manager container. Do not edit; run the package's pull script.",
    `export const ${exportName} = ${JSON.stringify(data, null, 2)} as const;`,
    "",
  ].join("\n");
}
