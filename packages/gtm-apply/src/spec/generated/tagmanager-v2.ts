// GENERATED FILE. Do not edit by hand.
// Source: Tag Manager API v2 Discovery document, see scripts/generate-discovery.ts.

export const DISCOVERY_REVISION = "20260902";

/** Values of BuiltInVariable.type. */
export const BUILT_IN_VARIABLE_TYPES = [
  "pageUrl",
  "pageHostname",
  "pagePath",
  "referrer",
  /** For web or mobile. */ "event",
  "clickElement",
  "clickClasses",
  "clickId",
  "clickTarget",
  "clickUrl",
  "clickText",
  "firstPartyServingUrl",
  "formElement",
  "formClasses",
  "formId",
  "formTarget",
  "formUrl",
  "formText",
  "errorMessage",
  "errorUrl",
  "errorLine",
  "newHistoryUrl",
  "oldHistoryUrl",
  "newHistoryFragment",
  "oldHistoryFragment",
  "newHistoryState",
  "oldHistoryState",
  "historySource",
  /** For web or mobile. */ "containerVersion",
  "debugMode",
  /** For web or mobile. */ "randomNumber",
  /** For web or mobile. */ "containerId",
  "appId",
  "appName",
  "appVersionCode",
  "appVersionName",
  "language",
  "osVersion",
  "platform",
  "sdkVersion",
  "deviceName",
  "resolution",
  "advertiserId",
  "advertisingTrackingEnabled",
  "htmlId",
  "environmentName",
  "ampBrowserLanguage",
  "ampCanonicalPath",
  "ampCanonicalUrl",
  "ampCanonicalHost",
  "ampReferrer",
  "ampTitle",
  "ampClientId",
  "ampClientTimezone",
  "ampClientTimestamp",
  "ampClientScreenWidth",
  "ampClientScreenHeight",
  "ampClientScrollX",
  "ampClientScrollY",
  "ampClientMaxScrollX",
  "ampClientMaxScrollY",
  "ampTotalEngagedTime",
  "ampPageViewId",
  "ampPageLoadTime",
  "ampPageDownloadTime",
  "ampGtmEvent",
  "eventName",
  "firebaseEventParameterCampaign",
  "firebaseEventParameterCampaignAclid",
  "firebaseEventParameterCampaignAnid",
  "firebaseEventParameterCampaignClickTimestamp",
  "firebaseEventParameterCampaignContent",
  "firebaseEventParameterCampaignCp1",
  "firebaseEventParameterCampaignGclid",
  "firebaseEventParameterCampaignSource",
  "firebaseEventParameterCampaignTerm",
  "firebaseEventParameterCurrency",
  "firebaseEventParameterDynamicLinkAcceptTime",
  "firebaseEventParameterDynamicLinkLinkid",
  "firebaseEventParameterNotificationMessageDeviceTime",
  "firebaseEventParameterNotificationMessageId",
  "firebaseEventParameterNotificationMessageName",
  "firebaseEventParameterNotificationMessageTime",
  "firebaseEventParameterNotificationTopic",
  "firebaseEventParameterPreviousAppVersion",
  "firebaseEventParameterPreviousOsVersion",
  "firebaseEventParameterPrice",
  "firebaseEventParameterProductId",
  "firebaseEventParameterQuantity",
  "firebaseEventParameterValue",
  "videoProvider",
  "videoUrl",
  "videoTitle",
  "videoDuration",
  "videoPercent",
  "videoVisible",
  "videoStatus",
  "videoCurrentTime",
  "scrollDepthThreshold",
  "scrollDepthUnits",
  "scrollDepthDirection",
  "elementVisibilityRatio",
  "elementVisibilityTime",
  "elementVisibilityFirstTime",
  "elementVisibilityRecentTime",
  "requestPath",
  "requestMethod",
  "clientName",
  "queryString",
  "serverPageLocationUrl",
  "serverPageLocationPath",
  "serverPageLocationHostname",
  "visitorRegion",
  "analyticsClientId",
  "analyticsSessionId",
  "analyticsSessionNumber",
] as const;
export type BuiltInVariableType = (typeof BUILT_IN_VARIABLE_TYPES)[number];

/** Values of Condition.type. */
export const CONDITION_TYPES = [
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "matchRegex",
  "greater",
  "greaterOrEquals",
  "less",
  "lessOrEquals",
  "cssSelector",
  "urlMatches",
] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

/** Values of Parameter.type. */
export const PARAMETER_TYPES = [
  /** May include variable references. */ "template",
  "integer",
  "boolean",
  "list",
  "map",
  "triggerReference",
  "tagReference",
] as const;
export type ParameterType = (typeof PARAMETER_TYPES)[number];

/** Values of Tag.tagFiringOption. */
export const TAG_FIRING_OPTIONS = [
  /** Tag can be fired multiple times per event. */ "unlimited",
  /** Tag can only be fired per event but can be fired multiple times per load (e.g., app load or page load). */ "oncePerEvent",
  /** Tag can only be fired per load (e.g., app load or page load). */ "oncePerLoad",
] as const;
export type TagFiringOption = (typeof TAG_FIRING_OPTIONS)[number];

/** Values of TagConsentSetting.consentStatus. */
export const CONSENT_STATUSES = [
  /** Default value where user has not specified any setting on it. */ "notSet",
  /** Tag doesn't require any additional consent settings. */ "notNeeded",
  /** Tag requires additional consent settings. */ "needed",
] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

/** Values of Trigger.type. */
export const TRIGGER_TYPES = [
  "pageview",
  "domReady",
  "windowLoaded",
  "customEvent",
  "triggerGroup",
  "init",
  "consentInit",
  "serverPageview",
  "always",
  "firebaseAppException",
  "firebaseAppUpdate",
  "firebaseCampaign",
  "firebaseFirstOpen",
  "firebaseInAppPurchase",
  "firebaseNotificationDismiss",
  "firebaseNotificationForeground",
  "firebaseNotificationOpen",
  "firebaseNotificationReceive",
  "firebaseOsUpdate",
  "firebaseSessionStart",
  "firebaseUserEngagement",
  "formSubmission",
  "click",
  "linkClick",
  "jsError",
  "historyChange",
  "timer",
  "ampClick",
  "ampTimer",
  "ampScroll",
  "ampVisibility",
  "youTubeVideo",
  "scrollDepth",
  "elementVisibility",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

/** Values of VariableFormatValue.convertToNumber. */
export const CONVERT_TO_NUMBERS = [
  /** The option to convert a variable value to a number with a period as the decimal separator. */ "period",
  /** The option to convert a variable value to a number with a comma as the decimal separator. */ "comma",
  /** The option to convert a variable value to a number with automatic decimal separator detection. */ "automatic",
] as const;
export type ConvertToNumber = (typeof CONVERT_TO_NUMBERS)[number];

/** Values of VariableFormatValue.caseConversionType. */
export const CASE_CONVERSION_TYPES = [
  "none",
  /** The option to convert a variable value to lowercase. */ "lowercase",
  /** The option to convert a variable value to uppercase. */ "uppercase",
] as const;
export type CaseConversionType = (typeof CASE_CONVERSION_TYPES)[number];

/** Built-in variables are a special category of variables that are pre-created and non-customizable. They provide common functionality like accessing properties of the gtm data layer, monitoring clicks, or accessing elements of a page URL. */
export interface BuiltInVariable {
  /** GTM Account ID. */
  accountId?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** Name of the built-in variable to be used to refer to the built-in variable. */
  name?: string;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** GTM BuiltInVariable's API relative path. */
  path?: string;
  /** Type of built-in variable. */
  type?: BuiltInVariableType;
}

/** Represents a predicate. */
export interface Condition {
  /** A list of named parameters (key/value), depending on the condition's type. Notes: - For binary operators, include parameters named arg0 and arg1 for specifying the left and right operands, respectively. - At this time, the left operand (arg0) must be a reference to a variable. - For case-insensitive Regex matching, include a boolean parameter named ignore_case that is set to true. If not specified or set to any other value, the matching will be case sensitive. - To negate an operator, include a boolean parameter named negate boolean parameter that is set to true. */
  parameter?: Parameter[];
  /** The type of operator for this condition. */
  type?: ConditionType;
}

/** Represents a Google Tag Manager Folder. */
export interface Folder {
  /** The Folder ID uniquely identifies the GTM Folder. */
  folderId?: string;
  /** User notes on how to apply this folder in the container. */
  notes?: string;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** The fingerprint of the GTM Folder as computed at storage time. This value is recomputed whenever the folder is modified. */
  fingerprint?: string;
  /** Folder display name. */
  name?: string;
  /** GTM Folder's API relative path. */
  path?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
}

/** Represents a Google Tag Manager Parameter. */
export interface Parameter {
  /** The named key that uniquely identifies a parameter. Required for top-level parameters, as well as map values. Ignored for list values. */
  key?: string;
  /** The parameter type. Valid values are: - boolean: The value represents a boolean, represented as 'true' or 'false' - integer: The value represents a 64-bit signed integer value, in base 10 - list: A list of parameters should be specified - map: A map of parameters should be specified - template: The value represents any text; this can include variable references (even variable references that might return non-string types) - trigger_reference: The value represents a trigger, represented as the trigger id - tag_reference: The value represents a tag, represented as the tag name */
  type?: ParameterType;
  /** Whether or not a reference type parameter is strongly or weakly referenced. Only used by Transformations. */
  isWeakReference?: boolean;
  /** A parameter's value (may contain variable references). as appropriate to the specified type. */
  value?: string;
  /** This list parameter's parameters (keys will be ignored). */
  list?: Parameter[];
  /** This map parameter's parameters (must have keys; keys must be unique). */
  map?: Parameter[];
}

/** Represents a reference to atag that fires before another tag in order to set up dependencies. */
export interface SetupTag {
  /** The name of the setup tag. */
  tagName?: string;
  /** If true, fire the main tag if and only if the setup tag fires successfully. If false, fire the main tag regardless of setup tag firing status. */
  stopOnSetupFailure?: boolean;
}

/** Represents a Google Tag Manager Tag. */
export interface Tag {
  /** User notes on how to apply this tag in the container. */
  notes?: string;
  /** User defined numeric priority of the tag. Tags are fired asynchronously in order of priority. Tags with higher numeric value fire first. A tag's priority can be a positive or negative value. The default value is 0. */
  priority?: Parameter;
  /** Blocking trigger IDs. If any of the listed triggers evaluate to true, the tag will not fire. */
  blockingTriggerId?: string[];
  /** The start timestamp in milliseconds to schedule a tag. */
  scheduleStartMs?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** Parent folder id. */
  parentFolderId?: string;
  /** The tag's parameters. */
  parameter?: Parameter[];
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** The fingerprint of the GTM Tag as computed at storage time. This value is recomputed whenever the tag is modified. */
  fingerprint?: string;
  /** The list of setup tags. Currently we only allow one. */
  setupTag?: SetupTag[];
  /** Consent settings of a tag. */
  consentSettings?: TagConsentSetting;
  /** GTM Tag's API relative path. */
  path?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** If set to true, this tag will only fire in the live environment (e.g. not in preview or debug mode). */
  liveOnly?: boolean;
  /** The Tag ID uniquely identifies the GTM Tag. */
  tagId?: string;
  /** Option to fire this tag. */
  tagFiringOption?: TagFiringOption;
  /** GTM Tag Type. */
  type?: string;
  /** If non-empty, then the tag display name will be included in the monitoring metadata map using the key specified. */
  monitoringMetadataTagNameKey?: string;
  /** Tag display name. */
  name?: string;
  /** A map of key-value pairs of tag metadata to be included in the event data for tag monitoring. Notes: - This parameter must be type MAP. - Each parameter in the map are type TEMPLATE, however cannot contain variable references. */
  monitoringMetadata?: Parameter;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** Indicates whether the tag is paused, which prevents the tag from firing. */
  paused?: boolean;
  /** Firing trigger IDs. A tag will fire when any of the listed triggers are true and all of its blockingTriggerIds (if any specified) are false. */
  firingTriggerId?: string[];
  /** The end timestamp in milliseconds to schedule a tag. */
  scheduleEndMs?: string;
  /** The list of teardown tags. Currently we only allow one. */
  teardownTag?: TeardownTag[];
}

export interface TagConsentSetting {
  /** The type of consents to check for during tag firing if in the consent NEEDED state. This parameter must be of type LIST where each list item is of type STRING. */
  consentType?: Parameter;
  /** The tag's consent status. If set to NEEDED, the runtime will check that the consent types specified by the consent_type field have been granted. */
  consentStatus?: ConsentStatus;
}

/** Represents a tag that fires after another tag in order to tear down dependencies. */
export interface TeardownTag {
  /** If true, fire the teardown tag if and only if the main tag fires successfully. If false, fire the teardown tag regardless of main tag firing status. */
  stopTeardownOnFailure?: boolean;
  /** The name of the teardown tag. */
  tagName?: string;
}

/** Represents a Google Tag Manager Trigger */
export interface Trigger {
  /** The fingerprint of the GTM Trigger as computed at storage time. This value is recomputed whenever the trigger is modified. */
  fingerprint?: string;
  /** Globally unique id of the trigger that auto-generates this (a Form Submit, Link Click or Timer listener) if any. Used to make incompatible auto-events work together with trigger filtering based on trigger ids. This value is populated during output generation since the tags implied by triggers don't exist until then. Only valid for Form Submit, Link Click and Timer triggers. */
  uniqueTriggerId?: Parameter;
  /** Time between Timer Events to fire (in seconds). Only valid for AMP Timer trigger. */
  intervalSeconds?: Parameter;
  /** A visibility trigger minimum continuous visible time (in milliseconds). Only valid for AMP Visibility trigger. */
  continuousTimeMinMilliseconds?: Parameter;
  /** Defines the data layer event that causes this trigger. */
  type?: TriggerType;
  /** Max time to fire Timer Events (in seconds). Only valid for AMP Timer trigger. */
  maxTimerLengthSeconds?: Parameter;
  /** Used in the case of custom event, which is fired iff all Conditions are true. */
  customEventFilter?: Condition[];
  /** Trigger display name. */
  name?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** List of integer percentage values for scroll triggers. The trigger will fire when each percentage is reached when the view is scrolled horizontally. Only valid for AMP scroll triggers. */
  horizontalScrollPercentageList?: Parameter;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** Additional parameters. */
  parameter?: Parameter[];
  /** Limit of the number of GTM events this Timer Trigger will fire. If no limit is set, we will continue to fire GTM events until the user leaves the page. Only valid for Timer triggers. */
  limit?: Parameter;
  /** A visibility trigger minimum percent visibility. Only valid for AMP Visibility trigger. */
  visiblePercentageMin?: Parameter;
  /** Whether or not we should delay the form submissions or link opening until all of the tags have fired (by preventing the default action and later simulating the default action). Only valid for Form Submission and Link Click triggers. */
  waitForTags?: Parameter;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** Whether or not we should only fire tags if the form submit or link click event is not cancelled by some other event handler (e.g. because of validation). Only valid for Form Submission and Link Click triggers. */
  checkValidation?: Parameter;
  /** The trigger will only fire iff all Conditions are true. */
  filter?: Condition[];
  /** A visibility trigger maximum percent visibility. Only valid for AMP Visibility trigger. */
  visiblePercentageMax?: Parameter;
  /** How long to wait (in milliseconds) for tags to fire when 'waits_for_tags' above evaluates to true. Only valid for Form Submission and Link Click triggers. */
  waitForTagsTimeout?: Parameter;
  /** A visibility trigger minimum total visible time (in milliseconds). Only valid for AMP Visibility trigger. */
  totalTimeMinMilliseconds?: Parameter;
  /** A click trigger CSS selector (i.e. "a", "button" etc.). Only valid for AMP Click trigger. */
  selector?: Parameter;
  /** A visibility trigger CSS selector (i.e. "#id"). Only valid for AMP Visibility trigger. */
  visibilitySelector?: Parameter;
  /** Parent folder id. */
  parentFolderId?: string;
  /** Name of the GTM event that is fired. Only valid for Timer triggers. */
  eventName?: Parameter;
  /** List of integer percentage values for scroll triggers. The trigger will fire when each percentage is reached when the view is scrolled vertically. Only valid for AMP scroll triggers. */
  verticalScrollPercentageList?: Parameter;
  /** GTM Trigger's API relative path. */
  path?: string;
  /** User notes on how to apply this trigger in the container. */
  notes?: string;
  /** Used in the case of auto event tracking. */
  autoEventFilter?: Condition[];
  /** The Trigger ID uniquely identifies the GTM Trigger. */
  triggerId?: string;
  /** Time between triggering recurring Timer Events (in milliseconds). Only valid for Timer triggers. */
  interval?: Parameter;
}

/** Represents a Google Tag Manager Variable. */
export interface Variable {
  /** GTM Container ID. */
  containerId?: string;
  /** Parent folder id. */
  parentFolderId?: string;
  /** For mobile containers only: A list of trigger IDs for enabling conditional variables; the variable is enabled if one of the enabling triggers is true while all the disabling triggers are false. Treated as an unordered set. */
  enablingTriggerId?: string[];
  /** GTM Variable's API relative path. */
  path?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** User notes on how to apply this variable in the container. */
  notes?: string;
  /** The end timestamp in milliseconds to schedule a variable. */
  scheduleEndMs?: string;
  /** The Variable ID uniquely identifies the GTM Variable. */
  variableId?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The variable's parameters. */
  parameter?: Parameter[];
  /** For mobile containers only: A list of trigger IDs for disabling conditional variables; the variable is enabled if one of the enabling trigger is true while all the disabling trigger are false. Treated as an unordered set. */
  disablingTriggerId?: string[];
  /** The fingerprint of the GTM Variable as computed at storage time. This value is recomputed whenever the variable is modified. */
  fingerprint?: string;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** Variable display name. */
  name?: string;
  /** Option to convert a variable value to other value. */
  formatValue?: VariableFormatValue;
  /** GTM Variable Type. */
  type?: string;
  /** The start timestamp in milliseconds to schedule a variable. */
  scheduleStartMs?: string;
}

export interface VariableFormatValue {
  /** The option to convert a variable value to a boolean. */
  convertToBoolean?: boolean;
  /** The option to convert a variable value to a number. */
  convertToNumber?: ConvertToNumber;
  /** The option to convert a string-type variable value to either lowercase or uppercase. */
  caseConversionType?: CaseConversionType;
  /** The value to convert if a variable value is null. */
  convertNullToValue?: Parameter;
  /** The value to convert if a variable value is false. */
  convertFalseToValue?: Parameter;
  /** The value to convert if a variable value is true. */
  convertTrueToValue?: Parameter;
  /** The value to convert if a variable value is undefined. */
  convertUndefinedToValue?: Parameter;
}

export type SchemaName =
  | "BuiltInVariable"
  | "Condition"
  | "Folder"
  | "Parameter"
  | "SetupTag"
  | "Tag"
  | "TagConsentSetting"
  | "TeardownTag"
  | "Trigger"
  | "Variable"
  | "VariableFormatValue";

export interface PropertyDef {
  kind: "string" | "boolean" | "number" | "ref" | "string[]" | "ref[]" | "unknown";
  ref?: SchemaName;
  enum?: readonly string[];
}

/** Property shapes per schema, for run-time validation of a spec. */
export const SCHEMAS: Record<SchemaName, Record<string, PropertyDef>> = {
  BuiltInVariable: {
    accountId: { kind: "string" },
    containerId: { kind: "string" },
    name: { kind: "string" },
    workspaceId: { kind: "string" },
    path: { kind: "string" },
    type: { kind: "string", enum: BUILT_IN_VARIABLE_TYPES },
  },
  Condition: {
    parameter: { kind: "ref[]", ref: "Parameter" },
    type: { kind: "string", enum: CONDITION_TYPES },
  },
  Folder: {
    folderId: { kind: "string" },
    notes: { kind: "string" },
    workspaceId: { kind: "string" },
    accountId: { kind: "string" },
    containerId: { kind: "string" },
    fingerprint: { kind: "string" },
    name: { kind: "string" },
    path: { kind: "string" },
    tagManagerUrl: { kind: "string" },
  },
  Parameter: {
    key: { kind: "string" },
    type: { kind: "string", enum: PARAMETER_TYPES },
    isWeakReference: { kind: "boolean" },
    value: { kind: "string" },
    list: { kind: "ref[]", ref: "Parameter" },
    map: { kind: "ref[]", ref: "Parameter" },
  },
  SetupTag: {
    tagName: { kind: "string" },
    stopOnSetupFailure: { kind: "boolean" },
  },
  Tag: {
    notes: { kind: "string" },
    priority: { kind: "ref", ref: "Parameter" },
    blockingTriggerId: { kind: "string[]" },
    scheduleStartMs: { kind: "string" },
    accountId: { kind: "string" },
    parentFolderId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    workspaceId: { kind: "string" },
    fingerprint: { kind: "string" },
    setupTag: { kind: "ref[]", ref: "SetupTag" },
    consentSettings: { kind: "ref", ref: "TagConsentSetting" },
    path: { kind: "string" },
    containerId: { kind: "string" },
    liveOnly: { kind: "boolean" },
    tagId: { kind: "string" },
    tagFiringOption: { kind: "string", enum: TAG_FIRING_OPTIONS },
    type: { kind: "string" },
    monitoringMetadataTagNameKey: { kind: "string" },
    name: { kind: "string" },
    monitoringMetadata: { kind: "ref", ref: "Parameter" },
    tagManagerUrl: { kind: "string" },
    paused: { kind: "boolean" },
    firingTriggerId: { kind: "string[]" },
    scheduleEndMs: { kind: "string" },
    teardownTag: { kind: "ref[]", ref: "TeardownTag" },
  },
  TagConsentSetting: {
    consentType: { kind: "ref", ref: "Parameter" },
    consentStatus: { kind: "string", enum: CONSENT_STATUSES },
  },
  TeardownTag: {
    stopTeardownOnFailure: { kind: "boolean" },
    tagName: { kind: "string" },
  },
  Trigger: {
    fingerprint: { kind: "string" },
    uniqueTriggerId: { kind: "ref", ref: "Parameter" },
    intervalSeconds: { kind: "ref", ref: "Parameter" },
    continuousTimeMinMilliseconds: { kind: "ref", ref: "Parameter" },
    type: { kind: "string", enum: TRIGGER_TYPES },
    maxTimerLengthSeconds: { kind: "ref", ref: "Parameter" },
    customEventFilter: { kind: "ref[]", ref: "Condition" },
    name: { kind: "string" },
    accountId: { kind: "string" },
    horizontalScrollPercentageList: { kind: "ref", ref: "Parameter" },
    tagManagerUrl: { kind: "string" },
    containerId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    limit: { kind: "ref", ref: "Parameter" },
    visiblePercentageMin: { kind: "ref", ref: "Parameter" },
    waitForTags: { kind: "ref", ref: "Parameter" },
    workspaceId: { kind: "string" },
    checkValidation: { kind: "ref", ref: "Parameter" },
    filter: { kind: "ref[]", ref: "Condition" },
    visiblePercentageMax: { kind: "ref", ref: "Parameter" },
    waitForTagsTimeout: { kind: "ref", ref: "Parameter" },
    totalTimeMinMilliseconds: { kind: "ref", ref: "Parameter" },
    selector: { kind: "ref", ref: "Parameter" },
    visibilitySelector: { kind: "ref", ref: "Parameter" },
    parentFolderId: { kind: "string" },
    eventName: { kind: "ref", ref: "Parameter" },
    verticalScrollPercentageList: { kind: "ref", ref: "Parameter" },
    path: { kind: "string" },
    notes: { kind: "string" },
    autoEventFilter: { kind: "ref[]", ref: "Condition" },
    triggerId: { kind: "string" },
    interval: { kind: "ref", ref: "Parameter" },
  },
  Variable: {
    containerId: { kind: "string" },
    parentFolderId: { kind: "string" },
    enablingTriggerId: { kind: "string[]" },
    path: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    notes: { kind: "string" },
    scheduleEndMs: { kind: "string" },
    variableId: { kind: "string" },
    accountId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    disablingTriggerId: { kind: "string[]" },
    fingerprint: { kind: "string" },
    workspaceId: { kind: "string" },
    name: { kind: "string" },
    formatValue: { kind: "ref", ref: "VariableFormatValue" },
    type: { kind: "string" },
    scheduleStartMs: { kind: "string" },
  },
  VariableFormatValue: {
    convertToBoolean: { kind: "boolean" },
    convertToNumber: { kind: "string", enum: CONVERT_TO_NUMBERS },
    caseConversionType: { kind: "string", enum: CASE_CONVERSION_TYPES },
    convertNullToValue: { kind: "ref", ref: "Parameter" },
    convertFalseToValue: { kind: "ref", ref: "Parameter" },
    convertTrueToValue: { kind: "ref", ref: "Parameter" },
    convertUndefinedToValue: { kind: "ref", ref: "Parameter" },
  },
};
