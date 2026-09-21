import type { RawSession } from '../report/parse-records'
import type { RawRecord } from '../session/debug-queue'
import { toJsLiteral } from './js-literal'
import { eventTitle, tagTemplate, variableTemplate } from './templates'

export interface TagAssistantExportOptions {
  /** Container public id, such as GTM-XXXXXXX. */
  containerId: string
  environment: number
  /** Written into containerDetails.container.auth only when includeAuth is true. */
  authCode?: string
  includeAuth?: boolean
  /** Shown as the container name in Tag Assistant. */
  containerName?: string
  startUrl: string
  now?: Date
}

type AnyRecord = Record<string, unknown>
const obj = (v: unknown): AnyRecord =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)

interface ParamPair {
  key: string
  name: string
  value: [string, string]
}

/** Template parameters arrive as [template, resolved] pairs; render both as literals. */
function paramPairs(data: unknown, skip: Set<string>): ParamPair[] {
  const out: ParamPair[] = []
  for (const [key, v] of Object.entries(obj(data))) {
    if (skip.has(key)) continue
    const pair = Array.isArray(v) && v.length === 2 ? v : [v, v]
    out.push({
      key,
      name: key.replace(/^vtp_/, ''),
      value: [toJsLiteral(pair[0], true), toJsLiteral(pair[1], true)],
    })
  }
  return out
}

const INTERNAL_TAG_KEYS = new Set([
  'function',
  'tag_id',
  'metadata',
  'once_per_event',
  'once_per_load',
  'setup_tags',
  'teardown_tags',
  'unlimited',
  'live_only',
  'vtp_gtmTagId',
  'priority',
  'consent',
])

function consentData(record: RawRecord | undefined): AnyRecord {
  const cd = obj(record?.consentData)
  const full = obj(cd.fullConsentList)
  const consentList = Object.entries(full).map(([type, v]) => ({
    type,
    status: obj(v).isConsentGranted === false ? 'denied' : 'granted',
  }))
  return {
    consentList,
    consentStatus: {
      default: cd.defaultConsent === true,
      update: cd.updateConsent === true,
      tcf: cd.tcf === true,
      wasSetLate: cd.wasSetLate === true,
      usedContainerConsent: cd.usedContainerConsent === true,
    },
    fullConsentList: full,
  }
}

function buildTagInfo(started: RawRecord, recs: RawRecord[]): AnyRecord[] {
  const startedByName = new Map<string, RawRecord>()
  const statusByName = new Map<string, string>()
  for (const r of recs) {
    const name = str(r.key?.tagName) || str(obj(arr(r.tagInfo)[0]).name)
    if (r.messageType === 'TAG_STARTED' || r.messageType === 'TAG_BLOCKED')
      startedByName.set(name, r)
    if (r.messageType === 'TAG_STATUS') {
      const s = str(obj(arr(r.tagInfo)[0]).execute)
      if (s) statusByName.set(name, s)
    }
  }
  return arr(started.tagInfo).map((t, index) => {
    const info = obj(t)
    const name = str(info.name, `tag ${index}`)
    const templateId = str(obj(info.metadata).type) || str(obj(info.tagData).function)
    const template = tagTemplate(templateId)
    const tagData = obj(info.tagData)
    const entry: AnyRecord = {
      index,
      name,
      displayName: name,
      publicId: templateId,
      type: template.name,
      vtType: 1,
      params: paramPairs(tagData, INTERNAL_TAG_KEYS),
      internalParams: paramPairs(
        Object.fromEntries(
          Object.entries(tagData).filter(([k]) => INTERNAL_TAG_KEYS.has(k) && k !== 'function'),
        ),
        new Set(),
      ),
      nominatedTags: [] as number[],
      setupTags: [],
      teardownTags: [],
      consentData: { consentList: [] },
      isHidden: false,
      thumbnail: template.thumbnail,
      disabledInGoogleMode: false,
    }
    const fired = startedByName.get(name)
    if (fired) {
      entry.nominatedTags = [index]
      entry.consentData = consentData(fired)
      const decision = str(obj(arr(fired.tagInfo)[0]).execute)
      entry.execute = statusByName.get(name) ?? decision
      entry.seenEventIdPriorityIds = [`${num(started.key?.eventId) ?? ''}_`]
    }
    return entry
  })
}

function buildMacroInfo(dataLayer: RawRecord | undefined): AnyRecord[] {
  return arr(dataLayer?.macroInfo).map((m) => {
    const info = obj(m)
    const templateId = str(info.type) || str(obj(info.macroData).function)
    const resolved = info.resolvedValue
    return {
      name: str(info.name),
      variablePublicId: templateId,
      variableType: variableTemplate(templateId).name,
      returnType: resolved === null ? 'null' : typeof resolved,
      params: paramPairs(info.macroData, new Set(['function'])),
      internalParams: [],
      rawResolvedValue: resolved,
      resolvedValue: toJsLiteral(resolved, true),
      debugMetadata: {},
      isHidden: false,
    }
  })
}

/** One entry of `data.containers`: everything one container (GTM or a Google tag) reported. */
function buildContainer(
  records: RawRecord[],
  publicId: string,
  opts: TagAssistantExportOptions,
  now: Date,
): AnyRecord {
  const init = records.find((r) => r.messageType === 'INIT')
  const first = records.find((r) => r.messageType === 'EVENT_STARTED')
  const targetRef = obj(first?.key?.targetRef ?? init?.key?.targetRef)
  const canonicalId = str(targetRef.canonicalId)
  const product = str(first?.containerProduct ?? init?.containerProduct, 'GTM')
  const isGtm = product === 'GTM'
  const environmentName = `env-${opts.environment}`

  // Event ids restart on every container load; key by groupId as well and order by time.
  const byEvent = new Map<string, RawRecord[]>()
  for (const r of records) {
    const id = num(r.key?.eventId)
    if (id === undefined) continue
    const key = `${str(r.key?.groupId)}:${id}:${str(r.key?.eventName)}`
    if (!byEvent.has(key)) byEvent.set(key, [])
    byEvent.get(key)!.push(r)
  }
  const eventKeys = [...byEvent.entries()]
    .map(([key, recs]) => ({ key, started: recs.find((r) => r.messageType === 'EVENT_STARTED') }))
    .filter((e) => e.started !== undefined)
    .sort(
      (a, b) =>
        a.started!.capturedAt - b.started!.capturedAt ||
        (num(a.started!.key?.eventId) ?? 0) - (num(b.started!.key?.eventId) ?? 0),
    )
    .map((e) => e.key)

  // Groups are container loads (page loads); the runtime stamps each record with a groupId.
  const groupOrder: string[] = []
  const groupInfo = new Map<
    string,
    {
      url: string
      title: string
      messageCount: number
      memoCount: number
      consent: RawRecord | undefined
    }
  >()
  for (const r of records) {
    const g = str(r.key?.groupId)
    if (!g) continue
    if (!groupInfo.has(g)) {
      groupOrder.push(g)
      groupInfo.set(g, {
        url: str(r.pageUrl, opts.startUrl),
        title: str(r.pageTitle),
        messageCount: 0,
        memoCount: 0,
        consent: undefined,
      })
    }
    const gi = groupInfo.get(g)!
    gi.memoCount += 1
    if (r.messageType === 'EVENT_STARTED') {
      gi.messageCount += 1
      gi.consent = r
    }
  }

  const messages: AnyRecord[] = []
  const tagsFired: Record<string, AnyRecord[]> = {}
  let index = 0
  for (const key of eventKeys) {
    const recs = byEvent.get(key)!
    const started = recs.find((r) => r.messageType === 'EVENT_STARTED')!
    const eventId = num(started.key?.eventId) ?? 0
    index += 1
    const eventName = str(started.key?.eventName)
    const rules = recs.find((r) => r.messageType === 'MACRO_RESOLVED')
    const dataLayer = recs.find((r) => r.messageType === 'DATA_LAYER')
    const tagInfo = buildTagInfo(started, recs)
    const message = dataLayer?.message ?? { event: eventName, 'gtm.uniqueEventId': eventId }
    const abstractModel = dataLayer?.abstractModel ?? {
      event: eventName,
      gtm: { uniqueEventId: eventId },
    }
    const entry: AnyRecord = {
      index,
      eventNameKey: eventName,
      navType: 'MESSAGE',
      consentData: consentData(started),
      title: eventTitle(eventName),
      eventName,
      data: [{ eventId, ruleInfo: arr(rules?.ruleInfo) }],
      tagInfo,
      groupId: str(started.key?.groupId),
      eventId,
      message,
      messageString: toJsLiteral(message),
      abstractModelString: toJsLiteral(abstractModel),
      macroInfo: buildMacroInfo(dataLayer),
      abstractModel,
    }
    messages.push(entry)
    for (const t of tagInfo) {
      if (typeof t.execute !== 'string') continue
      const name = str(t.name)
      ;(tagsFired[name] ??= []).push(entry)
    }
  }
  messages.reverse()
  for (const list of Object.values(tagsFired)) list.reverse()

  const groups = groupOrder.map((groupId) => {
    const gi = groupInfo.get(groupId)!
    return {
      navType: 'GROUP',
      messageCount: gi.messageCount,
      memoCount: gi.memoCount,
      logInfo: [],
      consentData: consentData(gi.consent),
      groupId,
      title: gi.title || gi.url,
      navTitle: gi.title || gi.url,
      emoji: '🔷',
      url: gi.url,
      snippetType: 'NON_DESTINATION',
      consentKey: { eventId: num(gi.consent?.key?.eventId) ?? 0 },
    }
  })
  const pageSummaries: Record<string, AnyRecord> = {}
  const containerLoadInfoByGroupId: Record<string, AnyRecord> = {}
  for (const groupId of groupOrder) {
    const gi = groupInfo.get(groupId)!
    pageSummaries[groupId] = {
      href: gi.url,
      title: gi.title,
      referrer: '',
      readyState: 'complete',
      groupId,
      emoji: '🔷',
    }
    containerLoadInfoByGroupId[groupId] = {
      targetId: publicId,
      containerLoadSource: num(init?.containerLoadSource) ?? 0,
      gtg: obj(init?.gtg),
    }
  }

  const logs = records.filter((r) => r.messageType === 'LOG')
  const errors = records.filter((r) => r.messageType === 'ERROR')
  const containerName = opts.containerName ?? new URL(opts.startUrl).host

  return {
    type: 0,
    publicId,
    canonicalId,
    aliases: arr(init?.aliases).length ? arr(init?.aliases) : [publicId],
    destinations: arr(init?.destinations),
    version: environmentName,
    product,
    containerDetails: {
      publicId,
      container: isGtm
        ? {
            type: 'TAG_MANAGER',
            canonicalId,
            auth: opts.includeAuth && opts.authCode ? opts.authCode : '',
            preview: environmentName,
            id: publicId,
          }
        : { type: 'GTE', preview: 'env-1', auth: '' },
      createdTime: now.getTime(),
    },
    messages,
    tagsFired,
    isNonDebuggable: false,
    summaryLogInfos: logs.map((r) => ({
      source: 'CONTAINER',
      groupId: str(r.key?.groupId),
      message: str(r.message),
      level: 'INFO',
      timestamp: r.capturedAt,
      rand: 0,
    })),
    numTaggedPages: groups.length,
    numPages: groups.length,
    errorCount: errors.length,
    logCount: logs.length,
    groups,
    vendorTemplates: {
      [environmentName]: {
        containerName,
        environmentName,
        environmentLinkType: 4,
        vendorTemplateTypes: {},
        paramMaps: {},
      },
    },
    pageSummaries,
    containerLoadInfoByGroupId,
    tagName: containerName,
    environmentName,
    environmentLinkType: 4,
  }
}

/**
 * Build a document in the shape Tag Assistant's "Export session" produces, so a headless run
 * can be opened through "Import session". One container entry per container that reported
 * records: the GTM container first, then each Google tag the page loaded.
 */
export function buildTagAssistantExport(
  raw: RawSession,
  opts: TagAssistantExportOptions,
): AnyRecord {
  const now = opts.now ?? new Date()
  const byContainer = new Map<string, RawRecord[]>()
  for (const r of raw.records) {
    const id = str(r.key?.publicId)
    if (!id) continue
    if (!byContainer.has(id)) byContainer.set(id, [])
    byContainer.get(id)!.push(r)
  }
  if (!byContainer.has(opts.containerId)) byContainer.set(opts.containerId, [])
  const ids = [...byContainer.keys()].sort((a, b) =>
    a === opts.containerId ? -1 : b === opts.containerId ? 1 : 0,
  )
  const containers = ids.map((id) => buildContainer(byContainer.get(id)!, id, opts, now))

  const domain = new URL(opts.startUrl).hostname.replace(/^www\./, '')
  return {
    name: domain,
    version: 2,
    timestamp: now.getTime(),
    data: {
      debugContext: 'WEB',
      domainDetails: {
        enabled: false,
        startUrl: opts.startUrl,
        includeDebugParam: true,
        domainName: domain,
        containers: ids,
        createdTime: now.getTime(),
        lastUpdatedTime: now.getTime(),
      },
      containers,
    },
  }
}
