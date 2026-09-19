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
      raw: undefined,
      tagAssistant: undefined,
      includeAuth: false,
      refresh: false,
      versionFromWorkspace: undefined,
    })
  })

  it('parses run with --out', () => {
    expect(parseArgs(['run', 's.json', '--out', 'report.json'])).toEqual({
      kind: 'run',
      scenario: 's.json',
      out: 'report.json',
      hits: undefined,
      headed: false,
      raw: undefined,
      tagAssistant: undefined,
      includeAuth: false,
      refresh: false,
      versionFromWorkspace: undefined,
    })
  })

  it('parses --refresh and --version-from-workspace', () => {
    expect(
      parseArgs(['run', 's.json', '--refresh', '--version-from-workspace', 'Default Workspace']),
    ).toMatchObject({ refresh: true, versionFromWorkspace: 'Default Workspace' })
    expect(() => parseArgs(['run', 's.json', '--version-from-workspace'])).toThrow(
      '--version-from-workspace requires a value',
    )
  })

  it('parses run with --raw, --tag-assistant, and --include-auth', () => {
    expect(
      parseArgs([
        'run',
        's.json',
        '--raw',
        'r.json',
        '--tag-assistant',
        'ta.json',
        '--include-auth',
      ]),
    ).toMatchObject({
      raw: 'r.json',
      tagAssistant: 'ta.json',
      includeAuth: true,
    })
    expect(() => parseArgs(['run', 's.json', '--raw'])).toThrow('--raw requires a value')
  })

  it('parses record as a headed run that pauses', () => {
    expect(parseArgs(['record', 's.json', '--out', 'r.json'])).toMatchObject({
      kind: 'record',
      scenario: 's.json',
      out: 'r.json',
      headed: true,
    })
    expect(() => parseArgs(['record'])).toThrow('record requires a scenario path')
  })

  it('parses export', () => {
    expect(parseArgs(['export', 'r.json'])).toEqual({
      kind: 'export',
      raw: 'r.json',
      out: undefined,
      includeAuth: false,
    })
    expect(parseArgs(['export', 'r.json', '--out', 'x.json', '--include-auth'])).toEqual({
      kind: 'export',
      raw: 'r.json',
      out: 'x.json',
      includeAuth: true,
    })
    expect(() => parseArgs(['export'])).toThrow('export requires a raw session path')
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
    expect(() => parseArgs(['run', 's.json', '--out'])).toThrow('--out requires a value')
  })

  it('rejects unknown flags and commands', () => {
    expect(() => parseArgs(['run', 's.json', '--bogus'])).toThrow('unknown flag: --bogus')
    expect(() => parseArgs(['frobnicate'])).toThrow('unknown command: frobnicate')
  })
})
