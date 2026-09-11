import type { ContainerType } from "../snapshot/types.js";

/** A section of a ContainerSpec that holds entities. */
export type SpecSection =
  | "folder"
  | "variable"
  | "trigger"
  | "tag"
  | "client"
  | "transformation"
  | "customTemplate"
  | "builtInVariable";

/** Which spec sections a container of each type can hold. */
export const SECTIONS_BY_CONTAINER_TYPE: Readonly<Record<ContainerType, readonly SpecSection[]>> = {
  web: ["folder", "variable", "trigger", "tag", "customTemplate", "builtInVariable"],
  server: [
    "folder",
    "variable",
    "trigger",
    "tag",
    "client",
    "transformation",
    "customTemplate",
    "builtInVariable",
  ],
  amp: ["folder", "variable", "trigger", "tag", "builtInVariable"],
  android: ["folder", "variable", "trigger", "tag", "builtInVariable"],
  ios: ["folder", "variable", "trigger", "tag", "builtInVariable"],
};

export const ALL_SECTIONS: readonly SpecSection[] = [
  "folder",
  "variable",
  "trigger",
  "tag",
  "client",
  "transformation",
  "customTemplate",
  "builtInVariable",
];

export function sectionsFor(containerType: ContainerType | undefined): readonly SpecSection[] {
  return containerType ? SECTIONS_BY_CONTAINER_TYPE[containerType] : ALL_SECTIONS;
}
