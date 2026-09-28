import { library as server } from "./server/index.js";
import { library as web } from "./web/index.js";

/** Every recipe library in this package, keyed by container type. */
export const recipes = { web, server } as const;

export type { RecipeName as WebRecipeName, ConstantName as WebConstantName } from "./web/index.js";
export type {
  RecipeName as ServerRecipeName,
  ConstantName as ServerConstantName,
} from "./server/index.js";
