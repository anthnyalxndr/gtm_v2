# Scenarios

A scenario is a JSON file that names a start URL, a GTM container and environment, an optional
consent state, and an ordered list of steps. The runner executes the steps with Playwright and
writes a `SessionReport`. The same file must run under the product and under the oracle
harness in `oracle/`, so scenario files never reference either implementation.

Secrets such as the `gtm_auth` token are referenced by environment variable name, never
inlined. See `.env.example` for the names.

The schema lives in `src/scenario/schema.ts` once that lands. Until then this directory is a
placeholder.
