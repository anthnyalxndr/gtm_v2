import { describe, expect, it } from 'vitest'
import { serialiseReport } from './write'
import type { SessionReport } from './types'

const base: SessionReport = {
  version: 1,
  generatedAt: 'now',
  scenario: { name: 'n', startUrl: 'u' },
  container: { id: 'GTM-1', environment: 1, debugBuildLoaded: true },
  hitPolicy: 'dry',
  tags: [],
  triggers: [],
  events: [],
  hits: [],
  unattributedHits: [],
  dataLayerPushes: [],
  errors: [],
  summary: {
    events: 0,
    tagsExecuted: 0,
    tagsBlocked: 0,
    tagsFailed: 0,
    hitsAttempted: 0,
    hitsSent: 0,
    mismatches: 0,
  },
}

describe('serialiseReport', () => {
  it('is byte-identical regardless of key insertion order', () => {
    const shuffled = {
      ...base,
      summary: {
        hitsSent: 0,
        events: 0,
        tagsBlocked: 0,
        tagsFailed: 0,
        hitsAttempted: 0,
        tagsExecuted: 0,
        mismatches: 0,
      },
    }
    expect(serialiseReport(shuffled)).toBe(serialiseReport(base))
  })
  it('ends with a newline and is valid JSON', () => {
    const s = serialiseReport(base)
    expect(s.endsWith('\n')).toBe(true)
    expect(JSON.parse(s).version).toBe(1)
  })
})
