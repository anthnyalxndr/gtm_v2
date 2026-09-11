// The client is its own package; re-exported here so one import serves most scripts.
export * from "@anthnyalxndr/gtm-client";
export { ensureWorkspace, isDefaultWorkspaceName } from "./resources/workspaces.js";
export type { WorkspaceRef } from "./resources/workspaces.js";
export {
  ensureFolder,
  ensureVariable,
  ensureTrigger,
  ensureTag,
  ensureClient,
  ensureTransformation,
  ensureTemplate,
  matches,
  SERVER_FIELDS,
} from "./resources/entities.js";
export type { EnsureResult, EnsureAction } from "./resources/entities.js";
export { ensureBuiltIns, listEnabledBuiltIns } from "./resources/builtins.js";
export { Gtm } from "./gtm.js";
export type { SnapshotCallOptions } from "./gtm.js";
export { defineContainer } from "./spec/types.js";
export {
  CVT_SENTINEL,
  cvtSentinel,
  templateNameOf,
  sourceCvtType,
  targetCvtType,
  cleanGalleryReference,
} from "./spec/cvt.js";
export { SECTIONS_BY_CONTAINER_TYPE, ALL_SECTIONS, sectionsFor } from "./spec/kinds.js";
export {
  DEFAULT_CONVENTIONS,
  mergeConventions,
  checkNames,
  externalName,
} from "./spec/conventions.js";
export type { NamingConventions, ConventionOverrides } from "./spec/conventions.js";
export type { SpecSection } from "./spec/kinds.js";
export type {
  ContainerSpec,
  FolderSpec,
  VariableSpec,
  TriggerSpec,
  TagSpec,
  ClientSpec,
  TransformationSpec,
  CustomTemplateSpec,
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
export { GtmSnapshot, indexRecipes, DEFAULT_DESTINATION_FAMILIES } from "./library/gtm-snapshot.js";
export type {
  Recipe,
  GtmSnapshotData,
  GtmSnapshotInput,
  RecipeNameOf,
  ConstantNameOf,
  PlaceholderConstantNameOf,
  RequiredConstantNameOf,
  GtmSnapshotOptions,
  SelectOptions,
} from "./library/gtm-snapshot.js";
export { notesEncoding, registerEncoding, resolveEncoding } from "./library/encoding.js";
export type { EncodingFactory } from "./library/encoding.js";
export { classifyLiteral, findLiterals, describeLiteral } from "./library/literals.js";
export type {
  LiteralKind,
  LiteralRules,
  LiteralHit,
  LiteralFinding,
  LiteralBearer,
} from "./library/literals.js";
export {
  NOTES_DELIMITER,
  NOTES_MAX_LENGTH,
  NOTED_KINDS,
  parseNotes,
  formatNotes,
  parseRecipeList,
  readMetadata,
} from "./library/metadata.js";
export type {
  EntityMetadata,
  PlaceholderMetadata,
  ParsedNotes,
  MetadataEncoding,
  MetadataIndex,
  MetadataError,
  NotedEntity,
  NotedKind,
} from "./library/metadata.js";
export {
  MANIFEST_VARIABLE_NAME,
  readManifest,
  manifestVariable,
  findManifestVariable,
} from "./library/manifest.js";
export type {
  LibraryManifest,
  RecipeManifestEntry,
  ExternalDependency,
} from "./library/manifest.js";
export { closure, referencesOf, refKey } from "./library/closure.js";
export { computeChanges, computeSpecChanges, attributeRecipes } from "./report/change-report.js";
export type {
  ChangeReport,
  ChangeKind,
  EntityChange,
  FieldDiff,
  ChangeReportCounts,
  ComputeChangesOptions,
} from "./report/change-report.js";
export { renderMarkdownReport, renderHtmlReport, renderReport } from "./report/render.js";
export type { EntityRef, RefKind } from "./library/closure.js";
export type { ApiSnapshotData, ContainerType, SnapshotSource } from "./snapshot/types.js";
export { mergeSpecs } from "./spec/merge.js";
export {
  BUILT_IN_VARIABLES,
  builtInTypeForName,
  upperSnakeToCamel,
  referencedVariableNames,
} from "./spec/catalog.js";
export { normalizeExport, NormalizeError, ENUM_KEYS } from "./spec/normalize.js";
export {
  emptyState,
  toApiVariable,
  toApiTrigger,
  toApiTag,
  toApiClient,
  toApiTransformation,
} from "./spec/convert.js";
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
export { parseCliArgs, runCli, USAGE } from "./cli.js";
export type { CliArgs, CliCommand } from "./cli.js";
export {
  defineTrackingPlan,
  compilePlan,
  applyPlan,
  libraryModuleSource,
  TrackingPlanError,
  DEFAULT_PLACEHOLDER_PATTERN,
} from "./plan/tracking-plan.js";
export type {
  TrackingPlan,
  TrackingPlanFor,
  CompiledPlan,
  ApplyPlanOptions,
  ApplyPlanOutcome,
} from "./plan/tracking-plan.js";
