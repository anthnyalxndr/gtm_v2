import { describe, expect, it } from 'vitest'
import { compareExports, formatDifferences, normaliseUrl, EXPORT_ALIGNMENT } from './compare'

describe('normaliseUrl', () => {
  it('drops the per-session parameters and the www prefix', () => {
    expect(normaliseUrl('https://www.sjpools.com/?gtm_debug=1790198206590')).toBe(
      'https://sjpools.com/',
    )
    expect(normaliseUrl('https://a.test/x?gtm_auth=c&gtm_preview=env-8&keep=1')).toBe(
      'https://a.test/x?keep=1',
    )
  })
  it('leaves a non-url unchanged', () => {
    expect(normaliseUrl('Preview Environment 3')).toBe('Preview Environment 3')
  })
})

describe('compareExports', () => {
  it('reports a key only one side has, and its direction', () => {
    const d = compareExports({ a: 1, b: 2 }, { a: 1, c: 3 })
    expect(d).toEqual([
      { path: '$.b', kind: 'missing', native: 'number' },
      { path: '$.c', kind: 'extra', ours: 'number' },
    ])
  })

  it('reports differing types and array lengths', () => {
    expect(compareExports({ a: [1, 2] }, { a: 'x' })[0]).toMatchObject({
      path: '$.a',
      kind: 'type',
    })
    expect(compareExports({ a: [1, 2] }, { a: [1] })[0]).toMatchObject({
      path: '$.a',
      kind: 'length',
      native: 2,
      ours: 1,
    })
  })

  it('compares shape only unless asked for values', () => {
    expect(compareExports({ a: 'one' }, { a: 'two' })).toEqual([])
    expect(compareExports({ a: 'one' }, { a: 'two' }, { compareValues: true })).toEqual([
      { path: '$.a', kind: 'value', native: 'one', ours: 'two' },
    ])
  })

  it('ignores values that cannot match between two sessions', () => {
    const left = { timestamp: 1, groupId: 'a', nonce: 'n', auth: 'code', keep: 'x' }
    const right = { timestamp: 2, groupId: 'b', nonce: 'm', auth: 'other', keep: 'x' }
    expect(compareExports(left, right, { compareValues: true })).toEqual([])
  })

  it('normalises urls before comparing them', () => {
    const left = { url: 'https://www.sjpools.com/?gtm_debug=1' }
    const right = { url: 'https://sjpools.com/' }
    expect(compareExports(left, right, { compareValues: true })).toEqual([])
  })

  it('aligns arrays by identity so unequal lengths do not misreport every element', () => {
    const native = {
      data: {
        containers: [
          {
            publicId: 'GTM-1',
            messages: [{ eventName: 'gtm.js', a: 1 }, { eventName: 'gtag.set' }],
          },
        ],
      },
    }
    const ours = {
      data: { containers: [{ publicId: 'GTM-1', messages: [{ eventName: 'gtm.js', a: 1 }] }] },
    }
    const diffs = compareExports(native, ours, { alignBy: EXPORT_ALIGNMENT })
    expect(diffs).toEqual([
      { path: '$.data.containers[GTM-1].messages', kind: 'length', native: 2, ours: 1 },
      { path: '$.data.containers[GTM-1].messages[gtag.set]', kind: 'missing', native: 'gtag.set' },
    ])
  })

  it('skips ignored paths', () => {
    expect(compareExports({ a: { b: 1 } }, { a: {} }, { ignore: ['$.a'] })).toEqual([])
  })
})

describe('formatDifferences', () => {
  it('writes one readable line per difference', () => {
    const text = formatDifferences(compareExports({ a: 1 }, { b: 2 }))
    expect(text).toContain('missing   $.a')
    expect(text).toContain('extra     $.b')
  })
})
