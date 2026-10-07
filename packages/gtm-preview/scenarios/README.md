# Scenarios

A scenario is a JSON file the `run` command executes. Fields:

- `name`: used for the default report filename.
- `startUrl`: the page to open first.
- `container.id`: the GTM container the page loads (`GTM-XXXXXXX`).
- `container.environment`: an environment name (`Live`, `Latest`, or a custom environment's
  name) or number. Every container has 1 (Live) and 2 (Latest).
- `container.authCodeEnv`: optional. When set, the named environment variable must hold the
  authorization code and `environment` must be a number. When omitted, the code is fetched
  through the Tag Manager API with `@anthnyalxndr/gtm-client` (credentials in
  `~/.config/gtm-apply/`, shared with gtm-apply; the first run opens a browser once) and cached
  owner-only in `~/.config/gtm-preview/environment-codes.json`. A 403 from the container with
  a cached code triggers one refetch and retry. `--refresh` forces a refetch. The code itself
  never goes in a scenario file.
- `--workspace <name>` (flag, not a field): run against that workspace's unsaved changes
  instead of a saved version. The CLI previews the workspace through the Tag Manager API,
  which creates or refreshes a reusable environment of type `workspace` and creates **no**
  version, then runs against that environment. It overrides the scenario's `environment`.
  The preview is a snapshot taken at that moment, so the CLI refreshes it on every run.
  Needs the `tagmanager.edit.containers` scope, because previewing writes an environment.
- `hits`: `dry` (default, abort every vendor hit in the browser), `debug` (send hits, mark
  GA4 ones with `_dbg=1` for DebugView), or `live` (send untouched).
- `settleMs`: how long to wait after the last step before collecting (default 1500).
- `steps`: ordered list of `navigate`, `click`, `fill`, `scroll`, `wait`, `waitForEvent`,
  and `push` steps. See `src/scenario/schema.ts` for each step's fields.
- `driver`: instead of `steps`, the path (relative to the scenario file) of a module whose
  default export is `async (page, ctx) => {}`. `page` is the Playwright page with the
  container already instrumented; `ctx.waitForEvent(name)` resolves when GTM reports that
  event. A driver is code the CLI executes with your permissions. A scenario may not have both
  `steps` and a `driver`.

## Recording a driver

1. Write a scenario with the start URL and container but no steps.
2. Run `pnpm dev record scenarios/<name>.json`. The page opens headed with the container's
   debug build loaded, Playwright's recorder is on, and the Inspector shows the generated
   code as you go.
3. Click through the site. Press Resume in the Inspector or close the browser window when
   done. The run writes the report (and `--raw` or `--tag-assistant` files if asked) for what
   you did, and writes the recording as a driver to `scenarios/flows/<name>.recorded.mjs`
   (or `--driver-out <path>`). The initial `goto` to the start URL is dropped because the
   runner performs it.
4. Add `await ctx.waitForEvent('...')` after actions that push events so replay waits for GTM
   instead of racing it, then add `"driver": "./flows/<name>.recorded.mjs"` to the scenario.
5. Replay headless with `pnpm dev run scenarios/<name>.json`.

`test/fixtures/drivers/codegen-like.mjs` is a driver made this way against the fixture site.

`example.json` runs against the fixture site in `test/fixtures/site`. Serve it with
`pnpm fixture` and put the test container's Latest code in `GTM_AUTH_WNX8FFXW`.
