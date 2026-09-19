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

`example.json` runs against the fixture site in `test/fixtures/site`. Serve it with
`pnpm fixture` and put the test container's Latest code in `GTM_AUTH_WNX8FFXW`.
