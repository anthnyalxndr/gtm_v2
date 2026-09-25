import type { RawSession } from '../report/parse-records'
import type { RawRecord } from '../session/debug-queue'
import { toJsLiteral } from './js-literal'
import { buildHitInfo, dedupeTransportDuplicates, type HitContext } from './hits'
import { eventTitle, tagTemplate, variableTemplate } from './templates'

/**
 * What a native export calls an in-page gtag command. `set` becomes `gtag.set` titled Set,
 * and a consent command becomes `gtag.consent.<subcommand>` titled Consent Default or Consent
 * Update. Anything else produces no message.
 */
function commandMessageName(record: RawRecord): { eventName: string; title: string } | undefined {
  const type = typeof record.commandType === 'string' ? record.commandType : ''
  if (type === 'set') return { eventName: 'gtag.set', title: 'Set' }
  if (type !== 'consent') return undefined
  const data = record.commandData
  const sub =
    data &&
    typeof data === 'object' &&
    typeof (data as { subcommand?: unknown }).subcommand === 'string'
      ? (data as { subcommand: string }).subcommand
      : ''
  if (sub !== 'default' && sub !== 'update') return undefined
  const title = sub === 'default' ? 'Consent Default' : 'Consent Update'
  return { eventName: `gtag.consent.${sub}`, title }
}

/** A `data` entry per hit the runtime reported for this message, or nothing when there are none. */
function hitEntries(records: RawRecord[], ctx: HitContext): AnyRecord[] {
  const hitInfo = dedupeTransportDuplicates(records as unknown as AnyRecord[])
    .map((r) => buildHitInfo(r, ctx))
    .filter((h): h is AnyRecord => h !== undefined)
  return hitInfo.length ? [{ eventId: ctx.eventId, priorityId: 1, hitInfo }] : []
}

export interface TagAssistantExportOptions {
  /** Container public id, such as GTM-XXXXXXX. */
  containerId: string
  environment: number
  /** Written into containerDetails.container.auth only when includeAuth is true. */
  authCode?: string
  includeAuth?: boolean
  /** Shown as the container name in Tag Assistant. */
  containerName?: string
  /** The environment's name in Tag Manager, e.g. "Preview Environment 3 2026-06-13 153837". */
  environmentName?: string
  /** The environment's type; a workspace preview is labelled QUICK_PREVIEW in the export. */
  environmentType?: string
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

/**
 * PROVISIONAL, pending task-22. GTM auto-creates listener tags named
 * `_implicit_<listener> <trigger>` for click, link click, form, scroll and similar triggers,
 * and Tag Assistant's own export leaves them out of a GTM container's `tagInfo` while leaving
 * `ruleInfo.firingTags` pointing at their indices, which then dangle.
 *
 * The evidence is one genuine export of one container (GTM-52ZLPX7, 2026-09-23): 8 tags, no
 * underscore-prefixed names, while its Google tag container kept all five `_Product-Owned
 * Activity Tag` entries. So the rule is this prefix rather than a leading underscore.
 *
 * What that evidence cannot settle, and what task-22 should decide against more exports:
 * whether Tag Assistant filters on the name at all or on a flag the debug feed does not
 * expose (no record carries one; entries give only `name` and `metadata.type`); whether
 * filtering on the listener template types instead (`lcl`, `cl`, `fsl`, `sdl`, `evl`, `ytl`,
 * `tl`, `hl`, `jel`) is more robust, which agrees with the prefix on every session captured
 * so far; whether other generated names are dropped from GTM containers; and whether an
 * implicit tag can appear anywhere but last, which would matter because indices are kept.
 */
const IMPLICIT_TAG_PREFIX = '_implicit_'

/** Listener template types, the second candidate rule task-22 should weigh against the name. */
export const LISTENER_TAG_TYPES: ReadonlySet<string> = new Set([
  'lcl',
  'cl',
  'fsl',
  'sdl',
  'evl',
  'ytl',
  'tl',
  'hl',
  'jel',
])

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
  const entries = arr(started.tagInfo).map((t, index) => {
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
  // Filter by name and keep each surviving entry's original index rather than renumbering,
  // which is what a real export does. The rule itself is provisional; see above.
  return entries.filter((e) => !str(e.name, '').startsWith(IMPLICIT_TAG_PREFIX))
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
  // The feed says OGT for a Google tag; a native export writes GTAG (checked against a real
  // page-view export of GTM-5KNSPW9K, 2026-09-23).
  const rawProduct = str(first?.containerProduct ?? init?.containerProduct, 'GTM')
  const product = rawProduct === 'OGT' ? 'GTAG' : rawProduct
  const isGtm = product === 'GTM'
  // A native export names the environment as Tag Manager does and labels a workspace preview
  // QUICK_PREVIEW rather than an environment number. Only the GTM container belongs to the environment being previewed. A Google tag carries
  // its own protocol version and an empty environment name, and it has no link type at all
  // (checked against a native page-view export of GTM-5KNSPW9K, 2026-09-23).
  const environmentName = isGtm ? (opts.environmentName ?? `env-${opts.environment}`) : ''
  const version = isGtm
    ? opts.environmentType === 'workspace'
      ? 'QUICK_PREVIEW'
      : environmentName
    : str(first?.version ?? init?.version, '')

  // Event ids restart on every container load; key by groupId as well and order by time.
  const byEvent = new Map<string, RawRecord[]>()
  // Hit records carry the event id and group but no event name, so they are collected
  // separately and attached to whichever message has that id in that container load.
  const hitsByEvent = new Map<string, RawRecord[]>()
  // A native export also writes a message per in-page gtag command and per dataLayer push
  // that carries no event. Commands with inPageCommand false are the container's own config
  // and event calls, which a native export does not show.
  const commandRecords = records.filter(
    (r) => r.messageType === 'GTAG_COMMAND' && r.inPageCommand === true,
  )
  const pushRecords = records.filter(
    (r) => r.messageType === 'DATA_LAYER' && num(r.key?.eventId) === undefined,
  )
  const dataLayerByEvent = new Map<string, RawRecord>()
  for (const r of records) {
    const id = num(r.key?.eventId)
    if (id === undefined) continue
    if (r.messageType === 'GTAG_HIT') {
      const hk = `${str(r.key?.groupId)}:${id}`
      if (!hitsByEvent.has(hk)) hitsByEvent.set(hk, [])
      hitsByEvent.get(hk)!.push(r)
      continue
    }
    if (r.messageType === 'DATA_LAYER') dataLayerByEvent.set(`${str(r.key?.groupId)}:${id}`, r)
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

  /** One message to be written, with the arrival time that decides where it sits. */
  interface Candidate {
    at: number
    eventId: number
    build: (index: number) => { entry: AnyRecord; firedTagNames: string[] }
  }
  const candidates: Candidate[] = []

  for (const key of eventKeys) {
    const recs = byEvent.get(key)!
    const started = recs.find((r) => r.messageType === 'EVENT_STARTED')!
    const eventId = num(started.key?.eventId) ?? 0
    const eventName = str(started.key?.eventName)
    const rules = recs.find((r) => r.messageType === 'MACRO_RESOLVED')
    const dataLayer = recs.find((r) => r.messageType === 'DATA_LAYER')
    // A native export gives a Google tag container an empty tagInfo on every message and an
    // empty tagsFired, even though its runtime reports plenty of generated activity tags.
    // Both sjpools exports agree (page view and contact flow, 2026-09-24).
    //
    // PROVISIONAL, task-22: an older export of a different container (GTM-52ZLPX7, taken
    // 2026-08-26) does list five `_Product-Owned Activity Tag` entries for its Google tag, so
    // this either changed in Tag Assistant or depends on something not yet identified. The
    // two recent exports win for now because the aim is to match Tag Assistant as it is.
    const tagInfo = isGtm ? buildTagInfo(started, recs) : []
    const message = dataLayer?.message ?? { event: eventName, 'gtm.uniqueEventId': eventId }
    const abstractModel = dataLayer?.abstractModel ?? {
      event: eventName,
      gtm: { uniqueEventId: eventId },
    }
    candidates.push({
      at: started.capturedAt,
      eventId,
      build: (index) => ({
        entry: {
          index,
          eventNameKey: eventName,
          navType: 'MESSAGE',
          consentData: consentData(started),
          title: eventTitle(eventName),
          eventName,
          data: [
            { eventId, ruleInfo: arr(rules?.ruleInfo) },
            ...hitEntries(hitsByEvent.get(`${str(started.key?.groupId)}:${eventId}`) ?? [], {
              messageIndex: index,
              eventId,
              groupId: str(started.key?.groupId) ?? '',
            }),
          ],
          tagInfo,
          groupId: str(started.key?.groupId),
          eventId,
          message,
          messageString: toJsLiteral(message),
          abstractModelString: toJsLiteral(abstractModel),
          macroInfo: buildMacroInfo(dataLayer),
          abstractModel,
        },
        firedTagNames: tagInfo
          .filter((t) => typeof t.execute === 'string')
          .map((t) => str(t.name) ?? ''),
      }),
    })
  }

  for (const r of commandRecords) {
    const named = commandMessageName(r)
    if (!named) continue
    const eventId = num(r.key?.eventId) ?? 0
    const groupId = str(r.key?.groupId) ?? ''
    // A `set` command is also a dataLayer push, so it carries the body and model a push has.
    // A consent command is not, and a native export writes the reduced form for it.
    const push =
      named.eventName === 'gtag.set' ? dataLayerByEvent.get(`${groupId}:${eventId}`) : undefined
    candidates.push({
      at: r.capturedAt,
      eventId,
      build: (index) => ({
        entry: {
          index,
          navType: 'MESSAGE',
          consentData: consentData(r),
          title: named.title,
          eventName: named.eventName,
          data: [],
          tagInfo: [],
          groupId,
          eventId,
          gtagCommandModel: {
            inPageCommand: true,
            commandType: str(r.commandType) ?? '',
            commandData: r.commandData ?? {},
          },
          ...(push
            ? {
                message: push.message,
                messageString: toJsLiteral(push.message),
                abstractModelString: toJsLiteral(push.abstractModel),
                macroInfo: buildMacroInfo(push),
                abstractModel: push.abstractModel,
              }
            : {}),
        },
        firedTagNames: [],
      }),
    })
  }

  for (const r of pushRecords) {
    candidates.push({
      at: r.capturedAt,
      eventId: 0,
      build: (index) => ({
        entry: {
          index,
          navType: 'MESSAGE',
          consentData: consentData(r),
          title: 'Message',
          data: [],
          tagInfo: [],
          groupId: str(r.key?.groupId),
          message: r.message,
          messageString: toJsLiteral(r.message),
          abstractModelString: toJsLiteral(r.abstractModel),
          macroInfo: buildMacroInfo(r),
          abstractModel: r.abstractModel,
        },
        firedTagNames: [],
      }),
    })
  }

  candidates.sort((a, b) => a.at - b.at || a.eventId - b.eventId)
  candidates.forEach((c, i) => {
    const { entry, firedTagNames } = c.build(i + 1)
    messages.push(entry)
    for (const name of firedTagNames) (tagsFired[name] ??= []).push(entry)
  })
  messages.reverse()
  for (const list of Object.values(tagsFired)) list.reverse()

  const emptyTrailingGroup: AnyRecord = {
    navType: 'GROUP',
    title: '',
    navTitle: '',
    logInfo: [],
    messageCount: 0,
    memoCount: 0,
  }
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
    version,
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
    groups: [...groups, emptyTrailingGroup],
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
    ...(isGtm ? { environmentLinkType: 4 } : {}),
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
