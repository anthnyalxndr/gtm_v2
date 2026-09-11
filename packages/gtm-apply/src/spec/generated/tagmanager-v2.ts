// GENERATED FILE. Do not edit by hand.
// Source: Tag Manager API v2 Discovery document, see scripts/generate-discovery.ts.

export const DISCOVERY_REVISION = "20260909";

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

/** Values of Container.usageContext. */
export const USAGE_CONTEXTS = [
  "web",
  "android",
  "ios",
  "androidSdk5",
  "iosSdk5",
  "amp",
  "server",
] as const;
export type UsageContext = (typeof USAGE_CONTEXTS)[number];

/** Values of Environment.type. */
export const ENVIRONMENT_TYPES = [
  /** Points to a user defined environment. */ "user",
  /** Points to the current live container version. */ "live",
  /** Points to the latest container version. */ "latest",
  /** Automatically managed environment that points to a workspace preview or version created by a workspace. */ "workspace",
] as const;
export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[number];

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

/** Values of VariableFormatValue.caseConversionType. */
export const CASE_CONVERSION_TYPES = [
  "none",
  /** The option to convert a variable value to lowercase. */ "lowercase",
  /** The option to convert a variable value to uppercase. */ "uppercase",
] as const;
export type CaseConversionType = (typeof CASE_CONVERSION_TYPES)[number];

/** Values of VariableFormatValue.convertToNumber. */
export const CONVERT_TO_NUMBERS = [
  /** The option to convert a variable value to a number with a period as the decimal separator. */ "period",
  /** The option to convert a variable value to a number with a comma as the decimal separator. */ "comma",
  /** The option to convert a variable value to a number with automatic decimal separator detection. */ "automatic",
] as const;
export type ConvertToNumber = (typeof CONVERT_TO_NUMBERS)[number];

/** Built-in variables are a special category of variables that are pre-created and non-customizable. They provide common functionality like accessing properties of the gtm data layer, monitoring clicks, or accessing elements of a page URL. */
export interface BuiltInVariable {
  /** GTM BuiltInVariable's API relative path. */
  path?: string;
  /** Name of the built-in variable to be used to refer to the built-in variable. */
  name?: string;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** Type of built-in variable. */
  type?: BuiltInVariableType;
  /** GTM Container ID. */
  containerId?: string;
  /** GTM Account ID. */
  accountId?: string;
}

export interface Client {
  /** GTM Container ID. */
  containerId?: string;
  /** Client display name. */
  name?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** Parent folder id. */
  parentFolderId?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The client's parameters. */
  parameter?: Parameter[];
  /** GTM client's API relative path. */
  path?: string;
  /** Priority determines relative firing order. */
  priority?: number;
  /** The Client ID uniquely identifies the GTM client. */
  clientId?: string;
  /** Client type. */
  type?: string;
  /** The fingerprint of the GTM Client as computed at storage time. This value is recomputed whenever the client is modified. */
  fingerprint?: string;
  /** User notes on how to apply this tag in the container. */
  notes?: string;
}

/** Represents a predicate. */
export interface Condition {
  /** The type of operator for this condition. */
  type?: ConditionType;
  /** A list of named parameters (key/value), depending on the condition's type. Notes: - For binary operators, include parameters named arg0 and arg1 for specifying the left and right operands, respectively. - At this time, the left operand (arg0) must be a reference to a variable. - For case-insensitive Regex matching, include a boolean parameter named ignore_case that is set to true. If not specified or set to any other value, the matching will be case sensitive. - To negate an operator, include a boolean parameter named negate boolean parameter that is set to true. */
  parameter?: Parameter[];
}

/** Represents a Google Tag Manager Container, which specifies the platform tags will run on, manages workspaces, and retains container versions. */
export interface Container {
  /** GTM Account ID. */
  accountId?: string;
  /** Container Notes. */
  notes?: string;
  /** The fingerprint of the GTM Container as computed at storage time. This value is recomputed whenever the account is modified. */
  fingerprint?: string;
  /** Container display name. */
  name?: string;
  /** Read-only Container feature set. */
  features?: ContainerFeatures;
  /** List of domain names associated with the Container. */
  domainName?: string[];
  /** List of Usage Contexts for the Container. Valid values include: web, android, or ios. */
  usageContext?: UsageContext[];
  /** The Container ID uniquely identifies the GTM Container. */
  containerId?: string;
  /** All Tag IDs that refer to this Container. */
  tagIds?: string[];
  /** List of server-side container URLs for the Container. If multiple URLs are provided, all URL paths must match. */
  taggingServerUrls?: string[];
  /** Container Public ID. */
  publicId?: string;
  /** GTM Container's API relative path. */
  path?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
}

export interface ContainerFeatures {
  /** Whether this Container supports transformations. */
  supportTransformations?: boolean;
  /** Whether this Container supports Container versions. */
  supportVersions?: boolean;
  /** Whether this Container supports templates. */
  supportTemplates?: boolean;
  /** Whether this Container supports tags. */
  supportTags?: boolean;
  /** Whether this Container supports environments. */
  supportEnvironments?: boolean;
  /** Whether this Container supports clients. */
  supportClients?: boolean;
  /** Whether this Container supports folders. */
  supportFolders?: boolean;
  /** Whether this Container supports Google tag config. */
  supportGtagConfigs?: boolean;
  /** Whether this Container supports variables. */
  supportVariables?: boolean;
  /** Whether this Container supports built-in variables */
  supportBuiltInVariables?: boolean;
  /** Whether this Container supports zones. */
  supportZones?: boolean;
  /** Whether this Container supports triggers. */
  supportTriggers?: boolean;
  /** Whether this Container supports workspaces. */
  supportWorkspaces?: boolean;
  /** Whether this Container supports user permissions managed by GTM. */
  supportUserPermissions?: boolean;
}

/** Represents a Google Tag Manager Container Version Header. */
export interface ContainerVersionHeader {
  /** A value of true indicates this container version has been deleted. */
  deleted?: boolean;
  /** Number of zones in the container version. */
  numZones?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** The Container Version ID uniquely identifies the GTM Container Version. */
  containerVersionId?: string;
  /** Number of custom templates in the container version. */
  numCustomTemplates?: string;
  /** Number of tags in the container version. */
  numTags?: string;
  /** Container version display name. */
  name?: string;
  /** Number of transformations in the container version. */
  numTransformations?: string;
  /** Number of variables in the container version. */
  numVariables?: string;
  /** Number of Google tag configs in the container version. */
  numGtagConfigs?: string;
  /** Number of clients in the container version. */
  numClients?: string;
  /** GTM Container Version's API relative path. */
  path?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** Number of triggers in the container version. */
  numTriggers?: string;
}

/** Represents a Google Tag Manager Custom Template's contents. */
export interface CustomTemplate {
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** The fingerprint of the GTM Custom Template as computed at storage time. This value is recomputed whenever the template is modified. */
  fingerprint?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** The custom template in text format. */
  templateData?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The Custom Template ID uniquely identifies the GTM custom template. */
  templateId?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** A reference to the Community Template Gallery entry. */
  galleryReference?: GalleryReference;
  /** GTM Custom Template's API relative path. */
  path?: string;
  /** Custom Template display name. */
  name?: string;
}

/** Represents a Google Tag Destination. */
export interface Destination {
  /** GTM Container ID. */
  containerId?: string;
  /** Destination's API relative path. */
  path?: string;
  /** Destination display name. */
  name?: string;
  /** Auto generated link to the tag manager UI. */
  tagManagerUrl?: string;
  /** Destination ID. */
  destinationId?: string;
  /** The fingerprint of the Google Tag Destination as computed at storage time. This value is recomputed whenever the destination is modified. */
  fingerprint?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The Destination link ID uniquely identifies the Destination. */
  destinationLinkId?: string;
}

/** Represents a Google Tag Manager Environment. Note that a user can create, delete and update environments of type USER, but can only update the enable_debug and url fields of environments of other types. */
export interface Environment {
  /** The fingerprint of the GTM environment as computed at storage time. This value is recomputed whenever the environment is modified. */
  fingerprint?: string;
  /** Whether or not to enable debug by default for the environment. */
  enableDebug?: boolean;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** The environment description. Can be set or changed only on USER type environments. */
  description?: string;
  /** The last update time-stamp for the authorization code. */
  authorizationTimestamp?: string;
  /** GTM Environment ID uniquely identifies the GTM Environment. */
  environmentId?: string;
  /** The environment display name. Can be set or changed only on USER type environments. */
  name?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The environment authorization code. */
  authorizationCode?: string;
  /** Represents a link to a quick preview of a workspace. */
  workspaceId?: string;
  /** The type of this environment. */
  type?: EnvironmentType;
  /** Default preview page url for the environment. */
  url?: string;
  /** Represents a link to a container version. */
  containerVersionId?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** GTM Environment's API relative path. */
  path?: string;
}

/** Represents a Google Tag Manager Folder. */
export interface Folder {
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** The fingerprint of the GTM Folder as computed at storage time. This value is recomputed whenever the folder is modified. */
  fingerprint?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** GTM Folder's API relative path. */
  path?: string;
  /** Folder display name. */
  name?: string;
  /** The Folder ID uniquely identifies the GTM Folder. */
  folderId?: string;
  /** User notes on how to apply this folder in the container. */
  notes?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
}

/** Represents the link between a custom template and an entry on the Community Template Gallery site. */
export interface GalleryReference {
  /** The name of the repository for the community gallery template. */
  repository?: string;
  /** If a user has manually edited the community gallery template. */
  isModified?: boolean;
  /** The signature of the community gallery template as computed at import time. This value is recomputed whenever the template is updated from the gallery. */
  signature?: string;
  /** ID for the gallery template that is generated once during first sync and travels with the template redirects. */
  galleryTemplateId?: string;
  /** The name of the owner for the community gallery template. */
  owner?: string;
  /** The name of the host for the community gallery template. */
  host?: string;
  /** The version of the community gallery template. */
  version?: string;
  /** The developer id of the community gallery template. This value is set whenever the template is created from the gallery. */
  templateDeveloperId?: string;
}

/** Represents a Google tag configuration. */
export interface GtagConfig {
  /** Google tag account ID. */
  accountId?: string;
  /** The Google tag config's parameters. */
  parameter?: Parameter[];
  /** Google tag container ID. */
  containerId?: string;
  /** Google tag config's API relative path. */
  path?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** Google tag config type. */
  type?: string;
  /** Google tag workspace ID. Only used by GTM containers. Set to 0 otherwise. */
  workspaceId?: string;
  /** The fingerprint of the Google tag config as computed at storage time. This value is recomputed whenever the config is modified. */
  fingerprint?: string;
  /** The ID uniquely identifies the Google tag config. */
  gtagConfigId?: string;
}

/** Represents a Google Tag Manager Parameter. */
export interface Parameter {
  /** Whether or not a reference type parameter is strongly or weakly referenced. Only used by Transformations. */
  isWeakReference?: boolean;
  /** This list parameter's parameters (keys will be ignored). */
  list?: Parameter[];
  /** This map parameter's parameters (must have keys; keys must be unique). */
  map?: Parameter[];
  /** The named key that uniquely identifies a parameter. Required for top-level parameters, as well as map values. Ignored for list values. */
  key?: string;
  /** The parameter type. Valid values are: - boolean: The value represents a boolean, represented as 'true' or 'false' - integer: The value represents a 64-bit signed integer value, in base 10 - list: A list of parameters should be specified - map: A map of parameters should be specified - template: The value represents any text; this can include variable references (even variable references that might return non-string types) - trigger_reference: The value represents a trigger, represented as the trigger id - tag_reference: The value represents a tag, represented as the tag name */
  type?: ParameterType;
  /** A parameter's value (may contain variable references). as appropriate to the specified type. */
  value?: string;
}

/** Represents a reference to atag that fires before another tag in order to set up dependencies. */
export interface SetupTag {
  /** If true, fire the main tag if and only if the setup tag fires successfully. If false, fire the main tag regardless of setup tag firing status. */
  stopOnSetupFailure?: boolean;
  /** The name of the setup tag. */
  tagName?: string;
}

/** Represents a Google Tag Manager Tag. */
export interface Tag {
  /** GTM Tag's API relative path. */
  path?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The tag's parameters. */
  parameter?: Parameter[];
  /** The start timestamp in milliseconds to schedule a tag. */
  scheduleStartMs?: string;
  /** If set to true, this tag will only fire in the live environment (e.g. not in preview or debug mode). */
  liveOnly?: boolean;
  /** User notes on how to apply this tag in the container. */
  notes?: string;
  /** The end timestamp in milliseconds to schedule a tag. */
  scheduleEndMs?: string;
  /** The list of setup tags. Currently we only allow one. */
  setupTag?: SetupTag[];
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** A map of key-value pairs of tag metadata to be included in the event data for tag monitoring. Notes: - This parameter must be type MAP. - Each parameter in the map are type TEMPLATE, however cannot contain variable references. */
  monitoringMetadata?: Parameter;
  /** GTM Tag Type. */
  type?: string;
  /** Firing trigger IDs. A tag will fire when any of the listed triggers are true and all of its blockingTriggerIds (if any specified) are false. */
  firingTriggerId?: string[];
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** Parent folder id. */
  parentFolderId?: string;
  /** Blocking trigger IDs. If any of the listed triggers evaluate to true, the tag will not fire. */
  blockingTriggerId?: string[];
  /** If non-empty, then the tag display name will be included in the monitoring metadata map using the key specified. */
  monitoringMetadataTagNameKey?: string;
  /** The fingerprint of the GTM Tag as computed at storage time. This value is recomputed whenever the tag is modified. */
  fingerprint?: string;
  /** User defined numeric priority of the tag. Tags are fired asynchronously in order of priority. Tags with higher numeric value fire first. A tag's priority can be a positive or negative value. The default value is 0. */
  priority?: Parameter;
  /** The Tag ID uniquely identifies the GTM Tag. */
  tagId?: string;
  /** Tag display name. */
  name?: string;
  /** Indicates whether the tag is paused, which prevents the tag from firing. */
  paused?: boolean;
  /** Consent settings of a tag. */
  consentSettings?: TagConsentSetting;
  /** GTM Container ID. */
  containerId?: string;
  /** Option to fire this tag. */
  tagFiringOption?: TagFiringOption;
  /** The list of teardown tags. Currently we only allow one. */
  teardownTag?: TeardownTag[];
}

export interface TagConsentSetting {
  /** The tag's consent status. If set to NEEDED, the runtime will check that the consent types specified by the consent_type field have been granted. */
  consentStatus?: ConsentStatus;
  /** The type of consents to check for during tag firing if in the consent NEEDED state. This parameter must be of type LIST where each list item is of type STRING. */
  consentType?: Parameter;
}

/** Represents a tag that fires after another tag in order to tear down dependencies. */
export interface TeardownTag {
  /** The name of the teardown tag. */
  tagName?: string;
  /** If true, fire the teardown tag if and only if the main tag fires successfully. If false, fire the teardown tag regardless of main tag firing status. */
  stopTeardownOnFailure?: boolean;
}

/** Represents a Google Tag Manager Transformation. */
export interface Transformation {
  /** GTM transformation's API relative path. */
  path?: string;
  /** Transformation display name. */
  name?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** User notes on how to apply this transformation in the container. */
  notes?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The transformation's parameters. */
  parameter?: Parameter[];
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** The fingerprint of the GTM Transformation as computed at storage time. This value is recomputed whenever the transformation is modified. */
  fingerprint?: string;
  /** Transformation type. */
  type?: string;
  /** Parent folder id. */
  parentFolderId?: string;
  /** The Transformation ID uniquely identifies the GTM transformation. */
  transformationId?: string;
}

/** Represents a Google Tag Manager Trigger */
export interface Trigger {
  /** How long to wait (in milliseconds) for tags to fire when 'waits_for_tags' above evaluates to true. Only valid for Form Submission and Link Click triggers. */
  waitForTagsTimeout?: Parameter;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** Whether or not we should delay the form submissions or link opening until all of the tags have fired (by preventing the default action and later simulating the default action). Only valid for Form Submission and Link Click triggers. */
  waitForTags?: Parameter;
  /** A visibility trigger minimum percent visibility. Only valid for AMP Visibility trigger. */
  visiblePercentageMin?: Parameter;
  /** Used in the case of auto event tracking. */
  autoEventFilter?: Condition[];
  /** A visibility trigger minimum continuous visible time (in milliseconds). Only valid for AMP Visibility trigger. */
  continuousTimeMinMilliseconds?: Parameter;
  /** Time between Timer Events to fire (in seconds). Only valid for AMP Timer trigger. */
  intervalSeconds?: Parameter;
  /** Whether or not we should only fire tags if the form submit or link click event is not cancelled by some other event handler (e.g. because of validation). Only valid for Form Submission and Link Click triggers. */
  checkValidation?: Parameter;
  /** Max time to fire Timer Events (in seconds). Only valid for AMP Timer trigger. */
  maxTimerLengthSeconds?: Parameter;
  /** Trigger display name. */
  name?: string;
  /** A visibility trigger minimum total visible time (in milliseconds). Only valid for AMP Visibility trigger. */
  totalTimeMinMilliseconds?: Parameter;
  /** The Trigger ID uniquely identifies the GTM Trigger. */
  triggerId?: string;
  /** Limit of the number of GTM events this Timer Trigger will fire. If no limit is set, we will continue to fire GTM events until the user leaves the page. Only valid for Timer triggers. */
  limit?: Parameter;
  /** User notes on how to apply this trigger in the container. */
  notes?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** Additional parameters. */
  parameter?: Parameter[];
  /** Parent folder id. */
  parentFolderId?: string;
  /** The trigger will only fire iff all Conditions are true. */
  filter?: Condition[];
  /** A click trigger CSS selector (i.e. "a", "button" etc.). Only valid for AMP Click trigger. */
  selector?: Parameter;
  /** Used in the case of custom event, which is fired iff all Conditions are true. */
  customEventFilter?: Condition[];
  /** List of integer percentage values for scroll triggers. The trigger will fire when each percentage is reached when the view is scrolled vertically. Only valid for AMP scroll triggers. */
  verticalScrollPercentageList?: Parameter;
  /** GTM Trigger's API relative path. */
  path?: string;
  /** Name of the GTM event that is fired. Only valid for Timer triggers. */
  eventName?: Parameter;
  /** Globally unique id of the trigger that auto-generates this (a Form Submit, Link Click or Timer listener) if any. Used to make incompatible auto-events work together with trigger filtering based on trigger ids. This value is populated during output generation since the tags implied by triggers don't exist until then. Only valid for Form Submit, Link Click and Timer triggers. */
  uniqueTriggerId?: Parameter;
  /** List of integer percentage values for scroll triggers. The trigger will fire when each percentage is reached when the view is scrolled horizontally. Only valid for AMP scroll triggers. */
  horizontalScrollPercentageList?: Parameter;
  /** Time between triggering recurring Timer Events (in milliseconds). Only valid for Timer triggers. */
  interval?: Parameter;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** Defines the data layer event that causes this trigger. */
  type?: TriggerType;
  /** The fingerprint of the GTM Trigger as computed at storage time. This value is recomputed whenever the trigger is modified. */
  fingerprint?: string;
  /** A visibility trigger maximum percent visibility. Only valid for AMP Visibility trigger. */
  visiblePercentageMax?: Parameter;
  /** A visibility trigger CSS selector (i.e. "#id"). Only valid for AMP Visibility trigger. */
  visibilitySelector?: Parameter;
}

/** Represents a Google Tag Manager Variable. */
export interface Variable {
  /** GTM Variable's API relative path. */
  path?: string;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** The Variable ID uniquely identifies the GTM Variable. */
  variableId?: string;
  /** Parent folder id. */
  parentFolderId?: string;
  /** For mobile containers only: A list of trigger IDs for disabling conditional variables; the variable is enabled if one of the enabling trigger is true while all the disabling trigger are false. Treated as an unordered set. */
  disablingTriggerId?: string[];
  /** GTM Variable Type. */
  type?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The variable's parameters. */
  parameter?: Parameter[];
  /** GTM Container ID. */
  containerId?: string;
  /** Variable display name. */
  name?: string;
  /** For mobile containers only: A list of trigger IDs for enabling conditional variables; the variable is enabled if one of the enabling triggers is true while all the disabling triggers are false. Treated as an unordered set. */
  enablingTriggerId?: string[];
  /** The start timestamp in milliseconds to schedule a variable. */
  scheduleStartMs?: string;
  /** The fingerprint of the GTM Variable as computed at storage time. This value is recomputed whenever the variable is modified. */
  fingerprint?: string;
  /** The end timestamp in milliseconds to schedule a variable. */
  scheduleEndMs?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** User notes on how to apply this variable in the container. */
  notes?: string;
  /** Option to convert a variable value to other value. */
  formatValue?: VariableFormatValue;
}

export interface VariableFormatValue {
  /** The option to convert a variable value to a boolean. */
  convertToBoolean?: boolean;
  /** The option to convert a string-type variable value to either lowercase or uppercase. */
  caseConversionType?: CaseConversionType;
  /** The value to convert if a variable value is null. */
  convertNullToValue?: Parameter;
  /** The value to convert if a variable value is true. */
  convertTrueToValue?: Parameter;
  /** The option to convert a variable value to a number. */
  convertToNumber?: ConvertToNumber;
  /** The value to convert if a variable value is false. */
  convertFalseToValue?: Parameter;
  /** The value to convert if a variable value is undefined. */
  convertUndefinedToValue?: Parameter;
}

/** Represents a Google Tag Manager Container Workspace. */
export interface Workspace {
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** GTM Workspace's API relative path. */
  path?: string;
  /** Workspace display name. */
  name?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The Workspace ID uniquely identifies the GTM Workspace. */
  workspaceId?: string;
  /** The fingerprint of the GTM Workspace as computed at storage time. This value is recomputed whenever the workspace is modified. */
  fingerprint?: string;
  /** GTM Container ID. */
  containerId?: string;
  /** Workspace description. */
  description?: string;
}

/** Represents a Google Tag Manager Zone's contents. */
export interface Zone {
  /** This Zone's type restrictions. */
  typeRestriction?: ZoneTypeRestriction;
  /** GTM Zone's API relative path. */
  path?: string;
  /** Zone display name. */
  name?: string;
  /** User notes on how to apply this zone in the container. */
  notes?: string;
  /** Containers that are children of this Zone. */
  childContainer?: ZoneChildContainer[];
  /** This Zone's boundary. */
  boundary?: ZoneBoundary;
  /** GTM Workspace ID. */
  workspaceId?: string;
  /** The fingerprint of the GTM Zone as computed at storage time. This value is recomputed whenever the zone is modified. */
  fingerprint?: string;
  /** Auto generated link to the tag manager UI */
  tagManagerUrl?: string;
  /** GTM Account ID. */
  accountId?: string;
  /** The Zone ID uniquely identifies the GTM Zone. */
  zoneId?: string;
  /** GTM Container ID. */
  containerId?: string;
}

/** Represents a Zone's boundaries. */
export interface ZoneBoundary {
  /** The conditions that, when conjoined, make up the boundary. */
  condition?: Condition[];
  /** Custom evaluation trigger IDs. A zone will evaluate its boundary conditions when any of the listed triggers are true. */
  customEvaluationTriggerId?: string[];
}

/** Represents a child container of a Zone. */
export interface ZoneChildContainer {
  /** The child container's public id. */
  publicId?: string;
  /** The zone's nickname for the child container. */
  nickname?: string;
}

/** Represents a Zone's type restrictions. */
export interface ZoneTypeRestriction {
  /** List of type public ids that have been whitelisted for use in this Zone. */
  whitelistedTypeId?: string[];
  /** True if type restrictions have been enabled for this Zone. */
  enable?: boolean;
}

export type SchemaName =
  | "BuiltInVariable"
  | "Client"
  | "Condition"
  | "Container"
  | "ContainerFeatures"
  | "ContainerVersionHeader"
  | "CustomTemplate"
  | "Destination"
  | "Environment"
  | "Folder"
  | "GalleryReference"
  | "GtagConfig"
  | "Parameter"
  | "SetupTag"
  | "Tag"
  | "TagConsentSetting"
  | "TeardownTag"
  | "Transformation"
  | "Trigger"
  | "Variable"
  | "VariableFormatValue"
  | "Workspace"
  | "Zone"
  | "ZoneBoundary"
  | "ZoneChildContainer"
  | "ZoneTypeRestriction";

export interface PropertyDef {
  kind: "string" | "boolean" | "number" | "ref" | "string[]" | "ref[]" | "unknown";
  ref?: SchemaName;
  enum?: readonly string[];
}

/** Property shapes per schema, for run-time validation of a spec. */
export const SCHEMAS: Record<SchemaName, Record<string, PropertyDef>> = {
  BuiltInVariable: {
    path: { kind: "string" },
    name: { kind: "string" },
    workspaceId: { kind: "string" },
    type: { kind: "string", enum: BUILT_IN_VARIABLE_TYPES },
    containerId: { kind: "string" },
    accountId: { kind: "string" },
  },
  Client: {
    containerId: { kind: "string" },
    name: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    workspaceId: { kind: "string" },
    parentFolderId: { kind: "string" },
    accountId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    path: { kind: "string" },
    priority: { kind: "number" },
    clientId: { kind: "string" },
    type: { kind: "string" },
    fingerprint: { kind: "string" },
    notes: { kind: "string" },
  },
  Condition: {
    type: { kind: "string", enum: CONDITION_TYPES },
    parameter: { kind: "ref[]", ref: "Parameter" },
  },
  Container: {
    accountId: { kind: "string" },
    notes: { kind: "string" },
    fingerprint: { kind: "string" },
    name: { kind: "string" },
    features: { kind: "ref", ref: "ContainerFeatures" },
    domainName: { kind: "string[]" },
    usageContext: { kind: "string[]", enum: USAGE_CONTEXTS },
    containerId: { kind: "string" },
    tagIds: { kind: "string[]" },
    taggingServerUrls: { kind: "string[]" },
    publicId: { kind: "string" },
    path: { kind: "string" },
    tagManagerUrl: { kind: "string" },
  },
  ContainerFeatures: {
    supportTransformations: { kind: "boolean" },
    supportVersions: { kind: "boolean" },
    supportTemplates: { kind: "boolean" },
    supportTags: { kind: "boolean" },
    supportEnvironments: { kind: "boolean" },
    supportClients: { kind: "boolean" },
    supportFolders: { kind: "boolean" },
    supportGtagConfigs: { kind: "boolean" },
    supportVariables: { kind: "boolean" },
    supportBuiltInVariables: { kind: "boolean" },
    supportZones: { kind: "boolean" },
    supportTriggers: { kind: "boolean" },
    supportWorkspaces: { kind: "boolean" },
    supportUserPermissions: { kind: "boolean" },
  },
  ContainerVersionHeader: {
    deleted: { kind: "boolean" },
    numZones: { kind: "string" },
    containerId: { kind: "string" },
    containerVersionId: { kind: "string" },
    numCustomTemplates: { kind: "string" },
    numTags: { kind: "string" },
    name: { kind: "string" },
    numTransformations: { kind: "string" },
    numVariables: { kind: "string" },
    numGtagConfigs: { kind: "string" },
    numClients: { kind: "string" },
    path: { kind: "string" },
    accountId: { kind: "string" },
    numTriggers: { kind: "string" },
  },
  CustomTemplate: {
    workspaceId: { kind: "string" },
    fingerprint: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    templateData: { kind: "string" },
    accountId: { kind: "string" },
    templateId: { kind: "string" },
    containerId: { kind: "string" },
    galleryReference: { kind: "ref", ref: "GalleryReference" },
    path: { kind: "string" },
    name: { kind: "string" },
  },
  Destination: {
    containerId: { kind: "string" },
    path: { kind: "string" },
    name: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    destinationId: { kind: "string" },
    fingerprint: { kind: "string" },
    accountId: { kind: "string" },
    destinationLinkId: { kind: "string" },
  },
  Environment: {
    fingerprint: { kind: "string" },
    enableDebug: { kind: "boolean" },
    tagManagerUrl: { kind: "string" },
    description: { kind: "string" },
    authorizationTimestamp: { kind: "string" },
    environmentId: { kind: "string" },
    name: { kind: "string" },
    accountId: { kind: "string" },
    authorizationCode: { kind: "string" },
    workspaceId: { kind: "string" },
    type: { kind: "string", enum: ENVIRONMENT_TYPES },
    url: { kind: "string" },
    containerVersionId: { kind: "string" },
    containerId: { kind: "string" },
    path: { kind: "string" },
  },
  Folder: {
    workspaceId: { kind: "string" },
    fingerprint: { kind: "string" },
    accountId: { kind: "string" },
    path: { kind: "string" },
    name: { kind: "string" },
    folderId: { kind: "string" },
    notes: { kind: "string" },
    containerId: { kind: "string" },
    tagManagerUrl: { kind: "string" },
  },
  GalleryReference: {
    repository: { kind: "string" },
    isModified: { kind: "boolean" },
    signature: { kind: "string" },
    galleryTemplateId: { kind: "string" },
    owner: { kind: "string" },
    host: { kind: "string" },
    version: { kind: "string" },
    templateDeveloperId: { kind: "string" },
  },
  GtagConfig: {
    accountId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    containerId: { kind: "string" },
    path: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    type: { kind: "string" },
    workspaceId: { kind: "string" },
    fingerprint: { kind: "string" },
    gtagConfigId: { kind: "string" },
  },
  Parameter: {
    isWeakReference: { kind: "boolean" },
    list: { kind: "ref[]", ref: "Parameter" },
    map: { kind: "ref[]", ref: "Parameter" },
    key: { kind: "string" },
    type: { kind: "string", enum: PARAMETER_TYPES },
    value: { kind: "string" },
  },
  SetupTag: {
    stopOnSetupFailure: { kind: "boolean" },
    tagName: { kind: "string" },
  },
  Tag: {
    path: { kind: "string" },
    accountId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    scheduleStartMs: { kind: "string" },
    liveOnly: { kind: "boolean" },
    notes: { kind: "string" },
    scheduleEndMs: { kind: "string" },
    setupTag: { kind: "ref[]", ref: "SetupTag" },
    tagManagerUrl: { kind: "string" },
    monitoringMetadata: { kind: "ref", ref: "Parameter" },
    type: { kind: "string" },
    firingTriggerId: { kind: "string[]" },
    workspaceId: { kind: "string" },
    parentFolderId: { kind: "string" },
    blockingTriggerId: { kind: "string[]" },
    monitoringMetadataTagNameKey: { kind: "string" },
    fingerprint: { kind: "string" },
    priority: { kind: "ref", ref: "Parameter" },
    tagId: { kind: "string" },
    name: { kind: "string" },
    paused: { kind: "boolean" },
    consentSettings: { kind: "ref", ref: "TagConsentSetting" },
    containerId: { kind: "string" },
    tagFiringOption: { kind: "string", enum: TAG_FIRING_OPTIONS },
    teardownTag: { kind: "ref[]", ref: "TeardownTag" },
  },
  TagConsentSetting: {
    consentStatus: { kind: "string", enum: CONSENT_STATUSES },
    consentType: { kind: "ref", ref: "Parameter" },
  },
  TeardownTag: {
    tagName: { kind: "string" },
    stopTeardownOnFailure: { kind: "boolean" },
  },
  Transformation: {
    path: { kind: "string" },
    name: { kind: "string" },
    containerId: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    notes: { kind: "string" },
    accountId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    workspaceId: { kind: "string" },
    fingerprint: { kind: "string" },
    type: { kind: "string" },
    parentFolderId: { kind: "string" },
    transformationId: { kind: "string" },
  },
  Trigger: {
    waitForTagsTimeout: { kind: "ref", ref: "Parameter" },
    workspaceId: { kind: "string" },
    waitForTags: { kind: "ref", ref: "Parameter" },
    visiblePercentageMin: { kind: "ref", ref: "Parameter" },
    autoEventFilter: { kind: "ref[]", ref: "Condition" },
    continuousTimeMinMilliseconds: { kind: "ref", ref: "Parameter" },
    intervalSeconds: { kind: "ref", ref: "Parameter" },
    checkValidation: { kind: "ref", ref: "Parameter" },
    maxTimerLengthSeconds: { kind: "ref", ref: "Parameter" },
    name: { kind: "string" },
    totalTimeMinMilliseconds: { kind: "ref", ref: "Parameter" },
    triggerId: { kind: "string" },
    limit: { kind: "ref", ref: "Parameter" },
    notes: { kind: "string" },
    accountId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    parentFolderId: { kind: "string" },
    filter: { kind: "ref[]", ref: "Condition" },
    selector: { kind: "ref", ref: "Parameter" },
    customEventFilter: { kind: "ref[]", ref: "Condition" },
    verticalScrollPercentageList: { kind: "ref", ref: "Parameter" },
    path: { kind: "string" },
    eventName: { kind: "ref", ref: "Parameter" },
    uniqueTriggerId: { kind: "ref", ref: "Parameter" },
    horizontalScrollPercentageList: { kind: "ref", ref: "Parameter" },
    interval: { kind: "ref", ref: "Parameter" },
    tagManagerUrl: { kind: "string" },
    containerId: { kind: "string" },
    type: { kind: "string", enum: TRIGGER_TYPES },
    fingerprint: { kind: "string" },
    visiblePercentageMax: { kind: "ref", ref: "Parameter" },
    visibilitySelector: { kind: "ref", ref: "Parameter" },
  },
  Variable: {
    path: { kind: "string" },
    workspaceId: { kind: "string" },
    variableId: { kind: "string" },
    parentFolderId: { kind: "string" },
    disablingTriggerId: { kind: "string[]" },
    type: { kind: "string" },
    accountId: { kind: "string" },
    parameter: { kind: "ref[]", ref: "Parameter" },
    containerId: { kind: "string" },
    name: { kind: "string" },
    enablingTriggerId: { kind: "string[]" },
    scheduleStartMs: { kind: "string" },
    fingerprint: { kind: "string" },
    scheduleEndMs: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    notes: { kind: "string" },
    formatValue: { kind: "ref", ref: "VariableFormatValue" },
  },
  VariableFormatValue: {
    convertToBoolean: { kind: "boolean" },
    caseConversionType: { kind: "string", enum: CASE_CONVERSION_TYPES },
    convertNullToValue: { kind: "ref", ref: "Parameter" },
    convertTrueToValue: { kind: "ref", ref: "Parameter" },
    convertToNumber: { kind: "string", enum: CONVERT_TO_NUMBERS },
    convertFalseToValue: { kind: "ref", ref: "Parameter" },
    convertUndefinedToValue: { kind: "ref", ref: "Parameter" },
  },
  Workspace: {
    tagManagerUrl: { kind: "string" },
    path: { kind: "string" },
    name: { kind: "string" },
    accountId: { kind: "string" },
    workspaceId: { kind: "string" },
    fingerprint: { kind: "string" },
    containerId: { kind: "string" },
    description: { kind: "string" },
  },
  Zone: {
    typeRestriction: { kind: "ref", ref: "ZoneTypeRestriction" },
    path: { kind: "string" },
    name: { kind: "string" },
    notes: { kind: "string" },
    childContainer: { kind: "ref[]", ref: "ZoneChildContainer" },
    boundary: { kind: "ref", ref: "ZoneBoundary" },
    workspaceId: { kind: "string" },
    fingerprint: { kind: "string" },
    tagManagerUrl: { kind: "string" },
    accountId: { kind: "string" },
    zoneId: { kind: "string" },
    containerId: { kind: "string" },
  },
  ZoneBoundary: {
    condition: { kind: "ref[]", ref: "Condition" },
    customEvaluationTriggerId: { kind: "string[]" },
  },
  ZoneChildContainer: {
    publicId: { kind: "string" },
    nickname: { kind: "string" },
  },
  ZoneTypeRestriction: {
    whitelistedTypeId: { kind: "string[]" },
    enable: { kind: "boolean" },
  },
};
