import { GtmSnapshot, type ConstantNameOf, type RecipeNameOf } from "@anthnyalxndr/gtm-apply";
import { data } from "./library.js";

export { data };

/** The library, ready for defineTrackingPlan and applyPlan. */
export const library = GtmSnapshot.fromData(data);

/** Names a plan may put in `recipes`. */
export type RecipeName = RecipeNameOf<typeof data>;
/** Names a plan may put in `constants`. */
export type ConstantName = ConstantNameOf<typeof data>;
