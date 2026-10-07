import { describe, expect, it } from 'vitest'
import {
  compareExports,
  formatDifferences,
  normaliseUrl,
  EXPORT_ALIGNMENT,
  EXPORT_KEYLESS_MAPS,
  VOLATILE_HIT_PARAMS,
} from './compare'

describe('normaliseUrl', () => {
  it('normalises a URL that arrives as a JavaScript string literal', () => {
    expect(normaliseUrl('"https://www.sjpools.com/?gtm_debug=1790198206590"')).toBe(
      '"https://sjpools.com/"',
    )
    expect(normaliseUrl('"not a url"')).toBe('"not a url"')
  })

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

describe('maps keyed by a per-session identifier (task-22.6)', () => {
  /** Two exports of the same flow, differing only in the group ids that key their maps. */
  const doc = (groupId: string, href: string) => ({
    data: {
      containers: [
        {
          publicId: 'GTM-X',
          pageSummaries: { [groupId]: { href, groupId, readyState: 'complete' } },
          containerLoadInfoByGroupId: { [groupId]: { targetId: 'GTM-X', containerLoadSource: 0 } },
          vendorTemplates: { [`env-${groupId}`]: { vendorTemplateTypes: {}, paramMaps: {} } },
        },
      ],
    },
  })
  const opts = {
    alignBy: EXPORT_ALIGNMENT,
    alignKeyless: EXPORT_KEYLESS_MAPS,
    compareValues: true,
  }

  it('reports nothing when only the keys differ', () => {
    expect(compareExports(doc('111', '/a'), doc('222', '/a'), opts)).toEqual([])
  })

  it('still reports a real difference inside an entry', () => {
    const diffs = compareExports(doc('111', '/a'), doc('222', '/b'), opts)
    expect(diffs).toEqual([
      {
        path: '$.data.containers[GTM-X].pageSummaries[0].href',
        kind: 'value',
        native: '/a',
        ours: '/b',
      },
    ])
  })

  it('reports a map with a different number of entries', () => {
    const two = doc('111', '/a')
    two.data.containers[0]!.pageSummaries['999'] = {
      href: '/b',
      groupId: '999',
      readyState: 'complete',
    }
    const diffs = compareExports(two, doc('222', '/a'), opts)
    expect(diffs).toEqual([
      { path: '$.data.containers[GTM-X].pageSummaries', kind: 'length', native: 2, ours: 1 },
    ])
  })

  it('compares keys literally for a map that is not listed', () => {
    const a = { data: { other: { '111': 1 } } }
    const b = { data: { other: { '222': 1 } } }
    expect(compareExports(a, b, opts).map((d) => d.kind)).toEqual(['missing', 'extra'])
  })
})

describe('hit parameters (task-22.4)', () => {
  const doc = (cid: string, en: string) => ({
    data: {
      containers: [
        {
          publicId: 'GTM-X',
          messages: [
            {
              eventName: 'page_view',
              data: [
                {
                  hitInfo: [
                    {
                      title: 'Page View',
                      baseUrl: 'https://a.test/g/collect',
                      parameters: [
                        { name: 'cid', value: cid },
                        { name: 'en', value: en },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  })
  const opts = {
    alignBy: EXPORT_ALIGNMENT,
    alignKeyless: EXPORT_KEYLESS_MAPS,
    compareValues: true,
  }

  it('ignores the value of a parameter that belongs to one visit', () => {
    expect(compareExports(doc('111', 'page_view'), doc('222', 'page_view'), opts)).toEqual([])
    expect(VOLATILE_HIT_PARAMS.has('cid')).toBe(true)
  })

  it('still reports a parameter whose value means something', () => {
    const diffs = compareExports(doc('111', 'page_view'), doc('111', 'scroll'), opts)
    expect(diffs).toEqual([
      {
        path: '$.data.containers[GTM-X].messages[page_view].data[0].hitInfo[Page View https://a.test/g/collect].parameters[en].value',
        kind: 'value',
        native: 'page_view',
        ours: 'scroll',
      },
    ])
  })

  it('lines parameters up by name, so one extra does not shift the rest', () => {
    const extra = doc('111', 'page_view')
    extra.data.containers[0]!.messages[0]!.data[0]!.hitInfo[0]!.parameters.unshift({
      name: 'v',
      value: '2',
    })
    const diffs = compareExports(extra, doc('111', 'page_view'), opts)
    expect(diffs.map((d) => [d.kind, d.path.split('.').pop()])).toEqual([
      ['length', 'parameters'],
      ['missing', 'parameters[v]'],
    ])
  })
})
