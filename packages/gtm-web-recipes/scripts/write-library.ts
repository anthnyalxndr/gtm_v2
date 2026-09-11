import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { formatIssue, libraryModuleSource, type GtmSnapshot } from "@anthnyalxndr/gtm-apply";

export const LIBRARY_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "library.ts"
);

/** Lint, then write src/library.ts. Exits non-zero on lint findings so a bad library never lands. */
export async function writeLibrary(library: GtmSnapshot): Promise<void> {
  const issues = library.lint();
  if (issues.length > 0) {
    console.error(`Library has ${issues.length} problem(s):`);
    for (const issue of issues) console.error(`[!] ${formatIssue(issue)}`);
    process.exit(1);
  }
  await writeFile(LIBRARY_PATH, libraryModuleSource(library.toJSON()));
  console.log(
    `Wrote ${LIBRARY_PATH}: ${library.containerType} container ${library.container.publicId}, recipes ${library.recipeNames.join(", ")}`
  );
}
