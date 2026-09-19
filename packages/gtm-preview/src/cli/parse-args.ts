export type HitsOverride = 'dry' | 'debug' | 'live'

export type Command =
  | { kind: 'run'; scenario: string; out?: string; hits?: HitsOverride; headed: boolean }
  | { kind: 'help' }

const USAGE = `gtm-preview <command>

Commands:
  run <scenario.json> [options]   Run a scenario and write a SessionReport
  help                            Show this message

Options for run:
  --out <path>         Report path (default: reports/<scenario name>.json)
  --hits <policy>      Override the scenario's hit policy: dry | debug | live
  --headed             Show the browser
`

export function usage(): string {
  return USAGE
}

export function parseArgs(argv: readonly string[]): Command {
  const [command, ...rest] = argv
  if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
    return { kind: 'help' }
  }
  if (command === 'run') {
    const [scenario, ...flags] = rest
    if (scenario === undefined || scenario.startsWith('--')) {
      throw new Error('run requires a scenario path')
    }
    let out: string | undefined
    let hits: HitsOverride | undefined
    let headed = false
    for (let i = 0; i < flags.length; i += 1) {
      const flag = flags[i]
      if (flag === '--out') {
        out = flags[i + 1]
        if (out === undefined) throw new Error('--out requires a path')
        i += 1
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
    return { kind: 'run', scenario, out, hits, headed }
  }
  throw new Error(`unknown command: ${command}`)
}
