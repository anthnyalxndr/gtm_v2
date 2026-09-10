import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { applySpec, type ApplySpecOutcome } from "../spec/execute.js";
import { compileConversions } from "./compile.js";
import type { ApplyConversionsOptions } from "./types.js";

/** Compile conversion recipes to a ContainerSpec and apply it through the spec engine. */
export function applyConversions(
  client: GtmClient,
  options: ApplyConversionsOptions
): Promise<ApplySpecOutcome> {
  const { conversions, ...rest } = options;
  return applySpec(client, { ...rest, spec: compileConversions(conversions) });
}
