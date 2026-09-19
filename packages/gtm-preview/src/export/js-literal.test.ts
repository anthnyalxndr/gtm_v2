import { describe, expect, it } from 'vitest'
import { toJsLiteral } from './js-literal'

describe('toJsLiteral', () => {
  it('prints primitives like Tag Assistant does', () => {
    expect(toJsLiteral('G-1')).toBe('"G-1"')
    expect(toJsLiteral(true)).toBe('true')
    expect(toJsLiteral(6)).toBe('6')
    expect(toJsLiteral(null)).toBe('null')
    expect(toJsLiteral(undefined)).toBe('undefined')
  })
  it('prints inline objects and arrays with unquoted keys', () => {
    expect(toJsLiteral([{ name: 'Measurement ID', value: '' }], true)).toBe(
      '[{name: "Measurement ID", value: ""}]',
    )
    expect(toJsLiteral({}, true)).toBe('{}')
    expect(toJsLiteral([], true)).toBe('[]')
  })
  it('renders a variable reference the way GTM templates write it', () => {
    expect(toJsLiteral({ type: 'macro', name: 'Const - GA4 Measurement ID' }, true)).toBe(
      '"{{Const - GA4 Measurement ID}}"',
    )
    expect(toJsLiteral({ type: 'macro', name: 'x', extra: 1 }, true)).toBe(
      '{type: "macro", name: "x", extra: 1}',
    )
  })
  it('prints multi-line objects with two-space indentation and dotted keys unquoted', () => {
    expect(toJsLiteral({ event: 'gtm.js', 'gtm.uniqueEventId': 3, gtm: { start: 1 } })).toBe(
      '{\n  event: "gtm.js",\n  gtm.uniqueEventId: 3,\n  gtm: {\n    start: 1\n  }\n}',
    )
  })
})
