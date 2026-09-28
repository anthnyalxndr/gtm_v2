import { writeFile } from "node:fs/promises";
import { formatIssue, libraryModuleSource, type GtmSnapshot } from "@anthnyalxndr/gtm-apply";

/** Lint, then write the library module to `path`. Exits non-zero on lint findings so a bad library never lands. */
export async function writeLibrary(library: GtmSnapshot, path: string): Promise<void> {
  const issues = library.lint();
  if (issues.length > 0) {
    console.error(`Library has ${issues.length} problem(s):`);
    for (const issue of issues) console.error(`[!] ${formatIssue(issue)}`);
    process.exit(1);
  }
  await writeFile(path, libraryModuleSource(library.toJSON()));
  console.log(
    `Wrote ${path}: ${library.containerType} container ${library.data.container.publicId}, recipes ${library.recipeNames.join(", ")}`
  );
}
