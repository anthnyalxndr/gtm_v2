/**
 * The shared Google Tag Manager model: what a container is, the shape of a
 * container spec, the Tag Manager API v2 Discovery types, and the catalog of
 * built-in variables and triggers. Types and plain data only; nothing here
 * calls an API.
 */
export type { ContainerType } from "./container-type.js";
export * from "./spec/types.js";
export * from "./spec/kinds.js";
export * from "./spec/catalog.js";
export * from "./spec/generated/tagmanager-v2.js";
