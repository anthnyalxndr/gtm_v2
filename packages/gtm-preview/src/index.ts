#!/usr/bin/env node
import { parseArgs, usage } from './cli/parse-args'

function main(argv: readonly string[]): number {
  let command
  try {
    command = parseArgs(argv)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    console.error(usage())
    return 2
  }
  switch (command.kind) {
    case 'help':
      console.log(usage())
      return 0
    case 'run':
      console.error(`run is not implemented yet (scenario: ${command.scenario})`)
      return 1
  }
}

process.exitCode = main(process.argv.slice(2))
