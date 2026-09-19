# Scenarios

A scenario is a JSON file the `run` command executes. Fields:

- `name`: used for the default report filename.
- `startUrl`: the page to open first.
- `container.id`: the GTM container the page loads (`GTM-XXXXXXX`).
- `container.environment`: the environment number. Every container has 1 (Live) and 2 (Latest).
- `container.authCodeEnv`: the name of the environment variable holding that environment's
  authorization code. The code itself never goes in the file.
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
   debug build loaded and pauses in the Playwright Inspector.
3. Press Record in the Inspector, click through the site, then press Resume. The run writes
   the report (and `--raw` or `--tag-assistant` files if asked) for what you just did.
4. Copy the generated code from the Inspector into `scenarios/flows/<name>.mjs` as the body
   of `export default async function (page, ctx) { ... }`, and add `"driver":
"./flows/<name>.mjs"` to the scenario. Add `await ctx.waitForEvent('...')` after actions
   that push events so replay waits for GTM instead of racing it.
5. Replay headless with `pnpm dev run scenarios/<name>.json`.

`test/fixtures/drivers/codegen-like.mjs` is a driver made this way against the fixture site.

`example.json` runs against the fixture site in `test/fixtures/site`. Serve it with
`pnpm fixture` and put the test container's Latest code in `GTM_AUTH_WNX8FFXW`.
