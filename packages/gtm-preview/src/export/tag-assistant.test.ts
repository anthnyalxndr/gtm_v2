import { describe, expect, it } from 'vitest'
import raw from '../report/fixtures/test-container-session.json'
import type { RawSession } from '../report/parse-records'
import type { RawRecord } from '../session/debug-queue'
import shape from './fixtures/tag-assistant-export-shape.json'
import { buildTagAssistantExport, LISTENER_TAG_TYPES } from './tag-assistant'

type Shape = Record<string, string>
const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'object' ? 'object' : typeof v

function expectShape(actual: unknown, expected: Shape, optional: string[] = []) {
  const a = actual as Record<string, unknown>
  for (const [key, type] of Object.entries(expected)) {
    if (optional.includes(key) && !(key in a)) continue
    expect(a, `missing key ${key}`).toHaveProperty(key)
    expect(typeOf(a[key]), `type of ${key}`).toBe(type)
  }
  const extra = Object.keys(a).filter((k) => !(k in expected))
  expect(extra, 'unexpected keys').toEqual([])
}

const opts = {
  containerId: 'GTM-WNX8FFXW',
  environment: 2,
  authCode: 'secret-code',
  startUrl: 'http://127.0.0.1:4173/',
  now: new Date('2026-09-19T12:00:00Z'),
}
const doc = buildTagAssistantExport(raw as unknown as RawSession, opts) as unknown as Record<
  string,
  unknown
>
const data = doc.data as Record<string, unknown>
const container = (data.containers as Record<string, unknown>[])[0]!
const messages = container.messages as Record<string, unknown>[]
const fired = messages.find((m) => m.eventName === 'form_submit')!

describe('buildTagAssistantExport', () => {
  it('matches the key and type shape of a real Tag Assistant export at every level', () => {
    expectShape(doc, shape.root)
    expectShape(data, shape.data)
    expectShape(data.domainDetails, shape.domainDetails)
    expectShape(container, shape.container)
    expectShape(container.containerDetails, shape.containerDetails)
    expectShape(
      (container.containerDetails as Record<string, unknown>).container,
      shape.containerDetailsContainer,
    )
    for (const m of messages) {
      expectShape(m, shape.message)
      expectShape(m.consentData, shape.messageConsentData)
      expectShape((m.consentData as Record<string, unknown>).consentStatus, shape.consentStatus)
      for (const t of m.tagInfo as unknown[])
        expectShape(t, 'execute' in (t as object) ? shape.tagInfoFired : shape.tagInfoIdle)
      for (const v of m.macroInfo as unknown[]) expectShape(v, shape.macroInfo)
    }
    const rule = (fired.data as { ruleInfo: unknown[] }[])[0]!.ruleInfo[0]
    expectShape(rule, shape.ruleInfo)
    expectShape((rule as { predicates: unknown[] }).predicates[0], shape.predicate)
    expectShape((fired.tagInfo as { params: unknown[] }[])[0]!.params[0], shape.param)
    // The trailing group a native export ends with is a reduced form: no consent, no page.
    const groups = container.groups as Record<string, unknown>[]
    for (const g of groups.slice(0, -1)) expectShape(g, shape.group)
    expect(groups.at(-1)).toEqual({
      navType: 'GROUP',
      title: '',
      navTitle: '',
      logInfo: [],
      messageCount: 0,
      memoCount: 0,
    })
    for (const p of Object.values(container.pageSummaries as object))
      expectShape(p, shape.pageSummary)
    for (const l of Object.values(container.containerLoadInfoByGroupId as object))
      expectShape(l, shape.containerLoadInfo)
    for (const v of Object.values(container.vendorTemplates as object))
      expectShape(v, shape.vendorTemplatesEntry)
  })

  it('numbers messages from the latest down to 1, like Tag Assistant', () => {
    expect(messages.map((m) => m.index)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
    expect(messages[messages.length - 1]!.eventName).toBe('gtm.init_consent')
  })

  it('uses Tag Assistant titles for built-in events and the raw name otherwise', () => {
    const titles = Object.fromEntries(messages.map((m) => [m.eventName, m.title]))
    expect(titles['gtm.js']).toBe('Container Loaded')
    expect(titles['gtm.init_consent']).toBe('Consent Initialization')
    expect(titles['cta_click']).toBe('cta_click')
  })

  it('marks the fired tag with its status, display type, and literal param pairs', () => {
    const tag = (fired.tagInfo as Record<string, unknown>[])[0]!
    expect(tag).toMatchObject({
      index: 0,
      name: 'GA4 - form_submit',
      publicId: 'gaawe',
      type: 'Google Analytics: GA4 Event',
      thumbnail: 'thumbnail-ga.svg',
      execute: 'execute_succeeded',
      nominatedTags: [0],
      seenEventIdPriorityIds: ['8_'],
    })
    const params = tag.params as { key: string; value: [string, string] }[]
    expect(params.find((p) => p.key === 'vtp_eventName')?.value).toEqual([
      '"form_submit"',
      '"form_submit"',
    ])
    expect(params.find((p) => p.key === 'vtp_measurementIdOverride')?.value).toEqual([
      '"{{Const - GA4 Measurement ID}}"',
      '"G-PLACEHOLDER"',
    ])
    const idle = (
      messages.find((m) => m.eventName === 'cta_click')!.tagInfo as Record<string, unknown>[]
    )[0]!
    expect(idle).not.toHaveProperty('execute')
    expect(idle.consentData).toEqual({ consentList: [] })
  })

  it('collects fired messages under tagsFired by tag name', () => {
    const tf = container.tagsFired as Record<string, { eventName: string }[]>
    expect(Object.keys(tf)).toEqual(['GA4 - form_submit'])
    expect(tf['GA4 - form_submit']!.map((m) => m.eventName)).toEqual(['form_submit'])
  })

  it('renders variables with Tag Assistant type names and literal values', () => {
    const vars = fired.macroInfo as Record<string, unknown>[]
    const ev = vars.find((v) => v.name === '_event')!
    expect(ev).toMatchObject({
      variablePublicId: 'e',
      variableType: 'Custom Event',
      returnType: 'string',
      resolvedValue: '"form_submit"',
      rawResolvedValue: 'form_submit',
    })
  })

  it('pretty-prints the message the way Tag Assistant does', () => {
    expect(String(fired.messageString).startsWith('{\n  event: "form_submit",\n')).toBe(true)
  })

  it('leaves the authorization code out unless asked', () => {
    const details = (container.containerDetails as { container: { auth: string } }).container
    expect(details.auth).toBe('')
    expect(JSON.stringify(doc)).not.toContain('secret-code')
    const withAuth = buildTagAssistantExport(raw as unknown as RawSession, {
      ...opts,
      includeAuth: true,
    }) as never
    expect(JSON.stringify(withAuth)).toContain('secret-code')
  })

  it('describes the domain and one group per container load', () => {
    expect(data.domainDetails).toMatchObject({
      domainName: '127.0.0.1',
      containers: ['GTM-WNX8FFXW'],
      startUrl: opts.startUrl,
    })
    expect((container.groups as unknown[]).length).toBe(2)
    expect(container.numPages).toBe(1)
  })
})

describe('implicit listener tags', () => {
  /** The fixture container has one real tag; add the listener tags GTM auto-creates. */
  function withImplicitTags(): RawSession {
    const base = raw as unknown as RawSession
    const implicit = (name: string, fn: string) => ({
      name,
      metadata: { type: fn, isVendorTemplate: true },
      tagData: { function: fn },
    })
    return {
      ...base,
      records: base.records.map((r) =>
        r.messageType === 'EVENT_STARTED'
          ? {
              ...r,
              tagInfo: [
                ...(r.tagInfo as unknown[]),
                implicit('_implicit_Link Click Listener LC — call_click', 'lcl'),
                implicit('_implicit_Click Listener Click - Contact Form', 'cl'),
              ],
            }
          : r,
      ),
    }
  }

  const doc = buildTagAssistantExport(withImplicitTags(), opts) as unknown as Record<
    string,
    unknown
  >
  const container = (
    (doc.data as Record<string, unknown>).containers as Record<string, unknown>[]
  )[0]!
  const messages = container.messages as Record<string, unknown>[]

  it('leaves them out of every message, the way a real export does', () => {
    const names = messages.flatMap((m) => (m.tagInfo as { name: string }[]).map((t) => t.name))
    expect(names.some((n) => n.startsWith('_implicit_'))).toBe(false)
    expect(names).toContain('GA4 - form_submit')
    expect(Object.keys(container.tagsFired as object).some((n) => n.startsWith('_implicit_'))).toBe(
      false,
    )
  })

  it('keeps the surviving tags at their original indices and leaves the rules untouched', () => {
    const fired = messages.find((m) => m.eventName === 'form_submit')!
    expect(fired.tagInfo as { index: number; name: string }[]).toEqual([
      expect.objectContaining({ index: 0, name: 'GA4 - form_submit' }),
    ])
    const rules = (fired.data as { ruleInfo: { firingTags: number[] }[] }[])[0]!.ruleInfo
    expect(rules[0]?.firingTags).toEqual([0])
  })

  it('gives a Google tag container no tags at all, as a native export does', () => {
    const withOgt = withImplicitTags()
    const gtm = withOgt.records.find((r) => r.messageType === 'EVENT_STARTED')!
    const ogt: RawRecord = {
      ...gtm,
      containerProduct: 'OGT',
      key: { ...gtm.key, publicId: 'G-TEST1' },
      tagInfo: [
        {
          name: '_Product-Owned Activity Tag 118',
          metadata: { type: 'ogt_auto_events' },
          tagData: { function: 'ogt_auto_events' },
        },
      ],
    }
    const multi = buildTagAssistantExport(
      { ...withOgt, records: [...withOgt.records, ogt] },
      opts,
    ) as unknown as {
      data: { containers: { publicId: string; messages: { tagInfo: { name: string }[] }[] }[] }
    }
    const google = multi.data.containers.find((c) => c.publicId === 'G-TEST1')!
    expect(google.messages.flatMap((m) => m.tagInfo.map((t) => t.name))).toEqual([])
  })
})

describe('the provisional implicit-tag rule (task-22)', () => {
  /**
   * The name prefix and the listener template types are two candidate rules that agree on
   * every session captured so far. If a real container ever disagrees, this fails and the
   * choice has to be made on evidence rather than assumption.
   */
  it('agrees with the listener-type rule on the captured fixture', () => {
    const tagInfo = (raw as unknown as RawSession).records
      .filter((r) => r.messageType === 'EVENT_STARTED')
      .flatMap((r) => (r.tagInfo ?? []) as { name?: string; metadata?: { type?: string } }[])
    for (const t of tagInfo) {
      const byName = (t.name ?? '').startsWith('_implicit_')
      const byType = LISTENER_TAG_TYPES.has(t.metadata?.type ?? '')
      expect(byName, `"${t.name}" (${t.metadata?.type}) matched one rule but not the other`).toBe(
        byType,
      )
    }
  })
})

describe('container identity fields (task-22)', () => {
  /** A Google tag alongside the GTM container, as a real page has. */
  function withGoogleTag(): RawSession {
    const base = raw as unknown as RawSession
    const gtm = base.records.find((r) => r.messageType === 'EVENT_STARTED')!
    const ogt: RawRecord = {
      ...gtm,
      containerProduct: 'OGT',
      version: '2',
      key: { ...gtm.key, publicId: 'G-TEST1' },
      tagInfo: [],
    }
    return { ...base, records: [...base.records, ogt] }
  }
  const build = (o: Partial<Parameters<typeof buildTagAssistantExport>[1]> = {}) =>
    buildTagAssistantExport(withGoogleTag(), { ...opts, ...o }) as unknown as {
      data: { containers: Record<string, unknown>[] }
    }

  it('labels a workspace preview QUICK_PREVIEW and names the environment as Tag Manager does', () => {
    const c = build({
      environmentName: 'Preview Environment 3 2026-06-13 153837',
      environmentType: 'workspace',
    }).data.containers[0]!
    expect(c).toMatchObject({
      product: 'GTM',
      version: 'QUICK_PREVIEW',
      environmentName: 'Preview Environment 3 2026-06-13 153837',
      environmentLinkType: 4,
    })
  })

  it('uses the environment name as the version when it is not a workspace preview', () => {
    const c = build({ environmentName: 'Live', environmentType: 'live' }).data.containers[0]!
    expect(c).toMatchObject({ version: 'Live', environmentName: 'Live' })
  })

  it('writes a Google tag as GTAG with its own protocol version and no environment', () => {
    const c = build({
      environmentName: 'Preview Environment 3',
      environmentType: 'workspace',
    }).data.containers.find((x) => x.publicId === 'G-TEST1')!
    expect(c).toMatchObject({ product: 'GTAG', version: '2', environmentName: '' })
    expect(c).not.toHaveProperty('environmentLinkType')
  })
})

describe('gtag commands and non-event pushes as messages (task-22.1)', () => {
  const base = raw as unknown as RawSession
  const ev = base.records.find((r) => r.messageType === 'EVENT_STARTED')!
  const at = ev.capturedAt
  const key = { ...ev.key, eventId: 40 }
  const extra: RawRecord[] = [
    {
      capturedAt: at + 1,
      messageType: 'GTAG_COMMAND',
      containerProduct: 'GTM',
      key,
      inPageCommand: true,
      commandType: 'set',
      commandData: { 'developer_id.x': true },
    },
    {
      capturedAt: at + 2,
      messageType: 'GTAG_COMMAND',
      containerProduct: 'GTM',
      key,
      inPageCommand: true,
      commandType: 'consent',
      commandData: { subcommand: 'default', ad_storage: 'denied' },
    },
    {
      capturedAt: at + 3,
      messageType: 'GTAG_COMMAND',
      containerProduct: 'GTM',
      key,
      inPageCommand: true,
      commandType: 'consent',
      commandData: { subcommand: 'update', ad_storage: 'granted' },
    },
    // Not shown by a native export: the container's own internal calls.
    {
      capturedAt: at + 4,
      messageType: 'GTAG_COMMAND',
      containerProduct: 'GTM',
      key,
      inPageCommand: false,
      commandType: 'config',
      commandData: {},
    },
    {
      capturedAt: at + 5,
      messageType: 'GTAG_COMMAND',
      containerProduct: 'GTM',
      key,
      inPageCommand: true,
      commandType: 'get',
      commandData: {},
    },
    // A dataLayer push with no event: no eventId on the record.
    {
      capturedAt: at + 6,
      messageType: 'DATA_LAYER',
      containerProduct: 'GTM',
      key: { ...ev.key, eventId: undefined },
      message: { ecommerce: null },
      abstractModel: { a: 1 },
      macroInfo: [],
    },
  ]
  const doc = buildTagAssistantExport(
    { ...base, records: [...base.records, ...extra] },
    opts,
  ) as unknown as {
    data: { containers: { messages: Record<string, unknown>[] }[] }
  }
  const messages = doc.data.containers[0]!.messages
  const byName = (n: string) => messages.find((m) => m.eventName === n)

  it('writes a set command as gtag.set titled Set, with the command model', () => {
    expect(byName('gtag.set')).toMatchObject({
      navType: 'MESSAGE',
      title: 'Set',
      eventName: 'gtag.set',
      eventId: 40,
      tagInfo: [],
      data: [],
      gtagCommandModel: {
        inPageCommand: true,
        commandType: 'set',
        commandData: { 'developer_id.x': true },
      },
    })
  })

  it('writes consent commands as gtag.consent.default and gtag.consent.update', () => {
    expect(byName('gtag.consent.default')).toMatchObject({ title: 'Consent Default' })
    expect(byName('gtag.consent.update')).toMatchObject({ title: 'Consent Update' })
    // The reduced form a native export uses: no body, no model, no variables.
    expect(byName('gtag.consent.default')).not.toHaveProperty('message')
    expect(byName('gtag.consent.default')).not.toHaveProperty('abstractModel')
    expect(byName('gtag.consent.default')).not.toHaveProperty('macroInfo')
  })

  it('writes no message for a command a native export does not show', () => {
    expect(
      messages.filter(
        (m) => (m.gtagCommandModel as { commandType?: string })?.commandType === 'config',
      ),
    ).toEqual([])
    expect(
      messages.filter(
        (m) => (m.gtagCommandModel as { commandType?: string })?.commandType === 'get',
      ),
    ).toEqual([])
  })

  it('writes a push with no event as a Message with no event name or id', () => {
    const plain = messages.find((m) => m.title === 'Message')!
    expect(plain).toMatchObject({
      navType: 'MESSAGE',
      title: 'Message',
      message: { ecommerce: null },
      tagInfo: [],
      data: [],
    })
    expect(plain).not.toHaveProperty('eventName')
    expect(plain).not.toHaveProperty('eventId')
  })

  it('numbers every message contiguously and lists them newest first', () => {
    expect(messages.map((m) => m.index)).toEqual(
      Array.from({ length: messages.length }, (_, i) => messages.length - i),
    )
    // Eight events, plus the two consent commands, the set command and the plain push.
    expect(messages).toHaveLength(8 + 4)
  })
})
