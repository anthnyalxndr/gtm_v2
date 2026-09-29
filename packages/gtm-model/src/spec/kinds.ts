import type { ContainerType } from "../container-type.js";

/** A section of a ContainerSpec that holds entities. */
export type SpecSection =
  | "folder"
  | "variable"
  | "trigger"
  | "tag"
  | "client"
  | "transformation"
  | "builtInVariable"
  | "environment";

/** Which spec sections a container of each type can hold. */
export const SECTIONS_BY_CONTAINER_TYPE: Readonly<Record<ContainerType, readonly SpecSection[]>> = {
  web: ["folder", "variable", "trigger", "tag", "builtInVariable", "environment"],
  server: [
    "folder",
    "variable",
    "trigger",
    "tag",
    "client",
    "transformation",
    "builtInVariable",
    "environment",
  ],
  amp: ["folder", "variable", "trigger", "tag", "builtInVariable", "environment"],
  android: ["folder", "variable", "trigger", "tag", "builtInVariable", "environment"],
  ios: ["folder", "variable", "trigger", "tag", "builtInVariable", "environment"],
};

export const ALL_SECTIONS: readonly SpecSection[] = [
  "folder",
  "variable",
  "trigger",
  "tag",
  "client",
  "transformation",
  "builtInVariable",
  "environment",
];

export function sectionsFor(containerType: ContainerType | undefined): readonly SpecSection[] {
  return containerType ? SECTIONS_BY_CONTAINER_TYPE[containerType] : ALL_SECTIONS;
}
