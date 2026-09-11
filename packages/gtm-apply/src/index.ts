// The client is its own package; re-exported here so one import serves most scripts.
export * from "@anthnyalxndr/gtm-client";
export { ensureWorkspace, isDefaultWorkspaceName } from "./resources/workspaces.js";
export type { WorkspaceRef } from "./resources/workspaces.js";
export {
  ensureFolder,
  ensureVariable,
  ensureTrigger,
  ensureTag,
  matches,
  SERVER_FIELDS,
} from "./resources/entities.js";
export type { EnsureResult, EnsureAction } from "./resources/entities.js";
export { ensureBuiltIns, listEnabledBuiltIns } from "./resources/builtins.js";
export { defineContainer } from "./spec/types.js";
export type {
  ContainerSpec,
  FolderSpec,
  VariableSpec,
  TriggerSpec,
  TagSpec,
  EntityKind,
} from "./spec/types.js";
export {
  DISCOVERY_REVISION,
  TRIGGER_TYPES,
  CONDITION_TYPES,
  PARAMETER_TYPES,
  TAG_FIRING_OPTIONS,
  CONSENT_STATUSES,
  CASE_CONVERSION_TYPES,
  CONVERT_TO_NUMBERS,
  BUILT_IN_VARIABLE_TYPES,
} from "./spec/generated/tagmanager-v2.js";
export type {
  TriggerType,
  ConditionType,
  ParameterType,
  TagFiringOption,
  ConsentStatus,
  CaseConversionType,
  ConvertToNumber,
  BuiltInVariableType,
  Parameter,
  Condition,
  VariableFormatValue,
  TagConsentSetting,
  SetupTag,
  TeardownTag,
} from "./spec/generated/tagmanager-v2.js";
export {
  validateSpec,
  assertValidSpec,
  formatIssue,
  SpecValidationError,
} from "./spec/validate.js";
export type { SpecIssue } from "./spec/validate.js";
export { loadSpecFile } from "./spec/load.js";
export { pullSnapshot, snapshotToSpec, containerTypeOf } from "./snapshot/pull.js";
export type { ContainerSnapshot, ContainerType, SnapshotSource } from "./snapshot/types.js";
export {
  BUILT_IN_VARIABLES,
  builtInTypeForName,
  upperSnakeToCamel,
  referencedVariableNames,
} from "./spec/catalog.js";
export { normalizeExport, NormalizeError, ENUM_KEYS } from "./spec/normalize.js";
export { emptyState, toApiVariable, toApiTrigger, toApiTag } from "./spec/convert.js";
export type { ExistingState, Unresolved, Converted } from "./spec/convert.js";
export {
  planContainerSpec,
  loadExisting,
  sortVariablesByReference,
  formatPlan,
} from "./spec/plan.js";
export type { Plan, PlannedOp, PlanTarget, PlanOptions, OpKind, OpAction } from "./spec/plan.js";
export { executePlan, applySpec } from "./spec/execute.js";
export type {
  ExecuteOptions,
  ApplyResult,
  ApplySpecOptions,
  ApplySpecOutcome,
} from "./spec/execute.js";
export type {
  TriggerRecipe,
  Ga4EventRecipe,
  GoogleAdsRecipe,
  ConversionRecipe,
  ApplyConversionsOptions,
} from "./recipes/types.js";
export { triggerName, triggerRecipeToSpec } from "./recipes/triggers.js";
export { ga4Event } from "./recipes/ga4.js";
export { googleAdsConversion, ADS_CONVERSION_ID_VARIABLE } from "./recipes/googleAds.js";
export { mergeSpecs, compileConversion, compileConversions } from "./recipes/compile.js";
export { applyConversions } from "./recipes/apply.js";
export { parseCliArgs, runCli, USAGE } from "./cli.js";
export type { CliArgs, CliCommand } from "./cli.js";
