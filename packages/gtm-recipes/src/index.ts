import { library as web } from "./web/index.js";

/** Every recipe library in this package, keyed by container type. */
export const recipes = { web } as const;

export type { RecipeName as WebRecipeName, ConstantName as WebConstantName } from "./web/index.js";
