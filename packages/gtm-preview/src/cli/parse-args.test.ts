import { describe, expect, it } from 'vitest'
import { parseArgs } from './parse-args'

describe('parseArgs', () => {
  it('returns help when no command is given', () => {
    expect(parseArgs([])).toEqual({ kind: 'help' })
  })

  it('treats -h and --help as help', () => {
    expect(parseArgs(['-h'])).toEqual({ kind: 'help' })
    expect(parseArgs(['--help'])).toEqual({ kind: 'help' })
  })

  it('parses run with a scenario path', () => {
    expect(parseArgs(['run', 'scenarios/home.json'])).toEqual({
      kind: 'run',
      scenario: 'scenarios/home.json',
      out: undefined,
      hits: undefined,
      headed: false,
    })
  })

  it('parses run with --out', () => {
    expect(parseArgs(['run', 's.json', '--out', 'report.json'])).toEqual({
      kind: 'run',
      scenario: 's.json',
      out: 'report.json',
      hits: undefined,
      headed: false,
    })
  })

  it('parses --hits and --headed', () => {
    expect(parseArgs(['run', 's.json', '--hits', 'debug', '--headed'])).toMatchObject({
      hits: 'debug',
      headed: true,
    })
    expect(() => parseArgs(['run', 's.json', '--hits', 'maybe'])).toThrow(
      '--hits must be dry, debug, or live',
    )
  })

  it('rejects run without a scenario', () => {
    expect(() => parseArgs(['run'])).toThrow('run requires a scenario path')
    expect(() => parseArgs(['run', '--out', 'x'])).toThrow('run requires a scenario path')
  })

  it('rejects --out without a value', () => {
    expect(() => parseArgs(['run', 's.json', '--out'])).toThrow('--out requires a path')
  })

  it('rejects unknown flags and commands', () => {
    expect(() => parseArgs(['run', 's.json', '--bogus'])).toThrow('unknown flag: --bogus')
    expect(() => parseArgs(['frobnicate'])).toThrow('unknown command: frobnicate')
  })
})
