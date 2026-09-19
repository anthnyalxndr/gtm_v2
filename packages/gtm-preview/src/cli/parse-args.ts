export type Command = { kind: 'run'; scenario: string; out?: string } | { kind: 'help' }

const USAGE = `gtm-preview <command>

Commands:
  run <scenario.json> [--out report.json]   Run a scenario and write a SessionReport
  help                                       Show this message
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
    for (let i = 0; i < flags.length; i += 1) {
      const flag = flags[i]
      if (flag === '--out') {
        out = flags[i + 1]
        if (out === undefined) throw new Error('--out requires a path')
        i += 1
      } else {
        throw new Error(`unknown flag: ${flag}`)
      }
    }
    return { kind: 'run', scenario, out }
  }
  throw new Error(`unknown command: ${command}`)
}
