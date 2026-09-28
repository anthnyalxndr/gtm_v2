import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { GtmSnapshot } from "@anthnyalxndr/gtm-apply";
import { templateSnapshot as webTemplate } from "./web/template.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

interface LibraryEntry {
  /** Public id of the template container the library is pulled from. */
  publicId: string;
  /** The committed module `pnpm pull` writes. */
  libraryPath: string;
  /** The in-code template, applied to an in-memory container. */
  template: () => Promise<GtmSnapshot>;
}

/** Each recipe library by container type: where it comes from and where it is written. */
export const LIBRARIES = {
  web: {
    publicId: "GTM-TPLKC7QP",
    libraryPath: join(root, "src", "web", "library.ts"),
    template: webTemplate,
  },
} as const satisfies Record<string, LibraryEntry>;

export type LibraryType = keyof typeof LIBRARIES;

/** The library type named on the command line (the first argument that is not a flag). */
export function libraryFromArgv(argv: readonly string[]): LibraryType {
  const type = argv.find((a) => !a.startsWith("-"));
  if (type && Object.hasOwn(LIBRARIES, type)) return type as LibraryType;
  throw new Error(
    `Usage: pnpm <pull|push|sample> <${Object.keys(LIBRARIES).join("|")}> [--dry-run]`
  );
}
