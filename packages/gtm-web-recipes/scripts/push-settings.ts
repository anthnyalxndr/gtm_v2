/** What `pnpm push` targets, read from the environment and the command line. */
export interface PushSettings {
  /** Public id of the template container. */
  container: string;
  /** Workspace to reconcile; an existing one (such as Default Workspace) keeps its unversioned edits. */
  workspace: string;
  /** Name of the version the push creates, whatever the workspace is called. */
  versionName: string;
  dryRun: boolean;
}

/**
 *   GTM_LIBRARY            template container (default GTM-TPLKC7QP)
 *   GTM_LIBRARY_WORKSPACE  workspace to push into (default recipes-<date>)
 *   GTM_LIBRARY_VERSION    version name (default recipes-<date>)
 *   --dry-run              plan only
 */
export function pushSettings(
  env: Readonly<Record<string, string | undefined>>,
  argv: readonly string[],
  now: Date = new Date()
): PushSettings {
  const dated = `recipes-${now.toISOString().slice(0, 10)}`;
  return {
    container: env.GTM_LIBRARY ?? "GTM-TPLKC7QP",
    workspace: env.GTM_LIBRARY_WORKSPACE ?? dated,
    versionName: env.GTM_LIBRARY_VERSION ?? dated,
    dryRun: argv.includes("--dry-run"),
  };
}
