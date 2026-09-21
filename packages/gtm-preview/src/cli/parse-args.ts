export type HitsOverride = 'dry' | 'debug' | 'live'

export interface RunCommand {
  kind: 'run' | 'record'
  scenario: string
  out?: string
  hits?: HitsOverride
  headed: boolean
  raw?: string
  tagAssistant?: string
  /** record only: where to write the driver module generated from the recording. */
  driverOut?: string
  includeAuth: boolean
  /** Ignore cached environment codes and fetch them again. */
  refresh: boolean
  /** Create a version from this workspace (no publish) before running against Latest. */
  versionFromWorkspace?: string
  /** Exit non-zero when the report has mismatches. */
  failOnMismatch: boolean
}

export type Command =
  | RunCommand
  | { kind: 'export'; raw: string; out?: string; includeAuth: boolean }
  | { kind: 'help' }

const USAGE = `gtm-preview <command>

Commands:
  run <scenario.json> [options]     Run a scenario and write a SessionReport
  record <scenario.json> [options]  Open the page headed and paused so you can record a driver
  export <raw.json> [options]       Write a Tag Assistant import file from a saved raw session
  help                              Show this message

Options for run and record:
  --out <path>            Report path (default: reports/<scenario name>.json)
  --hits <policy>         Override the scenario's hit policy: dry | debug | live
  --headed                Show the browser (record always does)
  --raw <path>            Also save the raw captured session (records, hits, dataLayer)
  --tag-assistant <path>  Also write a Tag Assistant import file
  --driver-out <path>     record only: driver module to write from the recording
                          (default: scenarios/flows/<scenario name>.recorded.mjs)
  --include-auth          Put the environment authorization code in the Tag Assistant file
  --refresh               Fetch environment codes from the API even if cached
  --fail-on-mismatch      Exit 3 when GTM's verdicts and the observed hits disagree
  --version-from-workspace <name>
                          Create a version from that workspace (no publish) first, so
                          environment Latest points at unpublished work

Options for export:
  --out <path>            Tag Assistant file path (default: next to the raw file)
  --include-auth          Put the environment authorization code in the file
`

export function usage(): string {
  return USAGE
}

export function parseArgs(argv: readonly string[]): Command {
  const [command, ...rest] = argv
  if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
    return { kind: 'help' }
  }
  if (command === 'run' || command === 'record') {
    const [scenario, ...flags] = rest
    if (scenario === undefined || scenario.startsWith('--')) {
      throw new Error(`${command} requires a scenario path`)
    }
    let out: string | undefined
    let hits: HitsOverride | undefined
    let headed = false
    let raw: string | undefined
    let tagAssistant: string | undefined
    let driverOut: string | undefined
    let includeAuth = false
    let refresh = false
    let failOnMismatch = false
    let versionFromWorkspace: string | undefined
    for (let i = 0; i < flags.length; i += 1) {
      const flag = flags[i]
      if (
        flag === '--out' ||
        flag === '--raw' ||
        flag === '--tag-assistant' ||
        flag === '--version-from-workspace' ||
        flag === '--driver-out'
      ) {
        const v = flags[i + 1]
        if (v === undefined || v.startsWith('--')) throw new Error(`${flag} requires a value`)
        if (flag === '--out') out = v
        else if (flag === '--raw') raw = v
        else if (flag === '--tag-assistant') tagAssistant = v
        else if (flag === '--driver-out') driverOut = v
        else versionFromWorkspace = v
        i += 1
      } else if (flag === '--include-auth') {
        includeAuth = true
      } else if (flag === '--refresh') {
        refresh = true
      } else if (flag === '--fail-on-mismatch') {
        failOnMismatch = true
      } else if (flag === '--hits') {
        const v = flags[i + 1]
        if (v !== 'dry' && v !== 'debug' && v !== 'live')
          throw new Error('--hits must be dry, debug, or live')
        hits = v
        i += 1
      } else if (flag === '--headed') {
        headed = true
      } else {
        throw new Error(`unknown flag: ${flag}`)
      }
    }
    return {
      kind: command,
      scenario,
      out,
      hits,
      headed: headed || command === 'record',
      raw,
      tagAssistant,
      driverOut,
      includeAuth,
      refresh,
      versionFromWorkspace,
      failOnMismatch,
    }
  }
  if (command === 'export') {
    const [raw, ...flags] = rest
    if (raw === undefined || raw.startsWith('--'))
      throw new Error('export requires a raw session path')
    let out: string | undefined
    let includeAuth = false
    for (let i = 0; i < flags.length; i += 1) {
      const flag = flags[i]
      if (flag === '--out') {
        out = flags[i + 1]
        if (out === undefined) throw new Error('--out requires a path')
        i += 1
      } else if (flag === '--include-auth') includeAuth = true
      else throw new Error(`unknown flag: ${flag}`)
    }
    return { kind: 'export', raw, out, includeAuth }
  }
  throw new Error(`unknown command: ${command}`)
}
