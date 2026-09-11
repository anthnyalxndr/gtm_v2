import { GtmClient, type GtmClientOptions } from "@anthnyalxndr/gtm-client";
import {
  GtmSnapshot,
  type ConstantNameOf,
  type GtmSnapshotInput,
  type GtmSnapshotOptions,
  type RecipeNameOf,
} from "./library/gtm-snapshot.js";
import { applyPlan, type ApplyPlanOptions, type ApplyPlanOutcome } from "./plan/tracking-plan.js";
import { snapshotToSpec } from "./snapshot/pull.js";
import type { SnapshotSource } from "./snapshot/types.js";
import { applySpec, type ApplySpecOptions, type ApplySpecOutcome } from "./spec/execute.js";
import { planContainerSpec, type Plan, type PlanOptions, type PlanTarget } from "./spec/plan.js";
import type { ContainerSpec } from "./spec/types.js";

export interface SnapshotCallOptions extends GtmSnapshotOptions {
  /** Pull again even if this source was pulled before. */
  refresh?: boolean;
}

/**
 * The entry point. Holds the client and nothing else, so one instance serves
 * every container a script touches. Snapshots are memoized per source.
 *
 *   const gtm = await Gtm.fromConfig().init();
 *   const library = await gtm.snapshot({ container: "GTM-TPLXXXX" });
 *   await gtm.applyPlan({ library, plan, container: "GTM-XXXXXXX", workspace: "onboarding" });
 */
export class Gtm {
  readonly #cache = new Map<string, GtmSnapshot>();

  constructor(public readonly client: GtmClient) {}

  /** Build the client from the shared credential directory (see GtmClientOptions). */
  static fromConfig(options: GtmClientOptions = {}): Gtm {
    return new Gtm(new GtmClient(options));
  }

  /** Authenticate. Safe to call more than once. */
  async init(): Promise<this> {
    await this.client.init();
    return this;
  }

  /** Pull a container. The same source returns the same instance until `refresh` is set. */
  async snapshot(source: SnapshotSource, options: SnapshotCallOptions = {}): Promise<GtmSnapshot> {
    const { refresh, ...snapshotOptions } = options;
    const key = `${source.container}|${source.workspace ?? ""}|${source.version ?? "latest"}`;
    const cached = this.#cache.get(key);
    if (cached && !refresh) return cached;
    const snapshot = await new GtmSnapshot(this.client, source, snapshotOptions).init();
    this.#cache.set(key, snapshot);
    return snapshot;
  }

  /** Load a committed snapshot. Recipe and constant names are literal types for a const literal. */
  snapshotFrom<const S extends GtmSnapshotInput>(
    data: S,
    options: GtmSnapshotOptions = {}
  ): GtmSnapshot<RecipeNameOf<S>, ConstantNameOf<S>> {
    return GtmSnapshot.fromData(data, options);
  }

  /** The apply-able part of a container as a normalized spec. */
  async export(source: SnapshotSource): Promise<ContainerSpec> {
    return snapshotToSpec((await this.snapshot(source)).data);
  }

  /** Resolve every reference and build a plan without writing. */
  plan(target: PlanTarget, spec: ContainerSpec, options?: PlanOptions): Promise<Plan> {
    return planContainerSpec(this.client, target, spec, options);
  }

  /** Reconcile a container against a spec. */
  apply(options: ApplySpecOptions): Promise<ApplySpecOutcome> {
    return applySpec(this.client, options);
  }

  /** Compile a tracking plan against a library and apply it. */
  applyPlan<R extends string, C extends string>(
    options: ApplyPlanOptions<R, C>
  ): Promise<ApplyPlanOutcome> {
    return applyPlan(this.client, options);
  }
}
