import type { RawSession } from '../report/parse-records'
import type { RawRecord } from '../session/debug-queue'
import { toJsLiteral } from './js-literal'
import { buildHitInfo, dedupeTransportDuplicates, type HitContext } from './hits'
import { eventTitle } from './templates'

/**
 * What Tag Assistant writes when the container holds no definition for a template id. It keeps
 * no table of its own, so neither does this: a name invented here would differ from a native
 * export in exactly the cases where the capture in vendor-templates.ts falls short.
 */
const UNKNOWN_TAG_TYPE = 'Unknown Tag Type'
const UNKNOWN_VARIABLE_TYPE = 'Unknown Variable Type'

/** A tag's template id. A paused tag reports `paused` and carries the real one in its data. */
function tagTemplateId(info: AnyRecord): string {
  const declared = str(obj(info.metadata).type) || str(obj(info.tagData).function)
  if (declared !== 'paused') return declared
  return str(arr(obj(info.tagData).vtp_originalTagType)[0], declared)
}

/** A variable's template id. A synthesised macro names the template it came from. */
function variableTemplateId(info: AnyRecord): string {
  return str(obj(info.metadata).originalType) || str(info.type) || str(obj(info.macroData).function)
}
import { TemplateSet } from './vendor-templates'

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

/**
 * Split a tag's or a variable's parameters the way a native export does. A key the template
 * declares goes in `params` under the template's display name for it; every other key goes in
 * `internalParams` with an empty name. `function` and `original_vendor_template_id` name the
 * template rather than configure it, and appear in neither. Values arrive as
 * [template, resolved] pairs; both are rendered as literals.
 */
function splitParams(
  data: unknown,
  templates: TemplateSet,
  templateId: string,
): { params: ParamPair[]; internalParams: ParamPair[] } {
  const params: ParamPair[] = []
  const internalParams: ParamPair[] = []
  for (const [key, v] of Object.entries(obj(data))) {
    if (key === 'function' || key === 'original_vendor_template_id') continue
    const pair = Array.isArray(v) && v.length === 2 ? v : [v, v]
    // Not inline: a native export breaks a parameter holding a table across lines, and only
    // the map rows inside it stay on one line.
    const value: [string, string] = [toJsLiteral(pair[0]), toJsLiteral(pair[1])]
    const declared = templates.paramName(templateId, key)
    if (declared === undefined) internalParams.push({ key, name: '', value })
    else params.push({ key, name: declared, value })
  }
  return { params, internalParams }
}

/**
 * The consent state a message was evaluated under. `fullConsentList` is the feed's own, passed
 * through: GTM reports whichever consent types it knows about, four with only an `implicit`
 * flag until a consent command has been seen and seven with `default` and `quiet` after.
 *
 * `consentStatus.default` and `.update` are derived from those entries rather than read from a
 * field, which is how a native export produces them. Checked both ways: the derived `default`
 * agrees with the feed's own `defaultConsent` on all 412 records of the captured contact
 * session, and matches the native export on all 67 of its messages. There is no `update` field
 * in the feed at all, so deriving it is the only way to report it. The feed never reports TCF,
 * so `tcf` is always false.
 */
function consentData(record: RawRecord | undefined): AnyRecord {
  const cd = obj(record?.consentData)
  const full = obj(cd.fullConsentList)
  const entries = Object.values(full).map((v) => obj(obj(v).consentEntry))
  const consentList = Object.entries(full).map(([type, v]) => ({
    type,
    status: obj(v).isConsentGranted === false ? 'denied' : 'granted',
  }))
  return {
    consentList,
    consentStatus: {
      default: entries.some((e) => e.default === true),
      update: entries.some((e) => e.update === true),
      tcf: false,
      wasSetLate: cd.wasSetLate === true,
      usedContainerConsent: cd.usedContainerConsent === true,
    },
    fullConsentList: full,
  }
}

/**
 * GTM auto-creates listener tags named `_implicit_<listener> <trigger>` for click, link click,
 * form, scroll and similar triggers, and a native export leaves them out of a GTM container's
 * `tagInfo` while leaving `ruleInfo.firingTags` pointing at their indices, which then dangle.
 *
 * Settled on 2026-09-25 by reading Tag Assistant's own bundle. Its console tab enumerates
 * exactly these as implicit: the six names "_implicit_Form Submit Listener", "_implicit_Click
 * Listener", "_implicit_Link Click Listener", "_implicit_JavaScript Error Listener",
 * "_implicit_Timer Listener" and "_implicit_History Change Listener", matched with startsWith,
 * plus the patterns `^_implicit_Auto Event Listener \(gtm.+?\)` and `^_implicit_Trigger Group
 * Firing Tag \(gtm.+?\)`. Every one carries this prefix, so the prefix is the same rule and
 * covers a listener type the enumeration might not list yet.
 *
 * Corroborated by the captures: the contact-flow feed reports 111 `_implicit_` tag entries and
 * neither native export contains the string at all.
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

function buildTagInfo(started: RawRecord, recs: RawRecord[], templates: TemplateSet): AnyRecord[] {
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
    const tagData = obj(info.tagData)
    const templateId = tagTemplateId(info)
    // A generated tag displays under the name after its `_gen_<kind>_` prefix.
    const generated = /^_gen_[^_]+_(.*)$/.exec(name)
    const { params, internalParams } = splitParams(tagData, templates, templateId)
    const entry: AnyRecord = {
      index,
      name,
      displayName: generated?.[1] ?? name,
      publicId: templateId,
      type: templates.displayName(templateId) ?? UNKNOWN_TAG_TYPE,
      vtType: 1,
      params,
      internalParams,
      nominatedTags: [] as number[],
      setupTags: [],
      teardownTags: [],
      consentData: { consentList: [] },
      isHidden: false,
      thumbnail: templates.thumbnail(templateId) ?? '',
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

function buildMacroInfo(dataLayer: RawRecord | undefined, templates: TemplateSet): AnyRecord[] {
  return arr(dataLayer?.macroInfo).map((m) => {
    const info = obj(m)
    const templateId = variableTemplateId(info)
    const resolved = info.resolvedValue
    const { params, internalParams } = splitParams(info.macroData, templates, templateId)
    return {
      name: str(info.name),
      variablePublicId: templateId,
      variableType: templates.displayName(templateId) ?? UNKNOWN_VARIABLE_TYPE,
      returnType: resolved === null ? 'null' : typeof resolved,
      params,
      internalParams,
      rawResolvedValue: resolved,
      resolvedValue: toJsLiteral(resolved, true),
      debugMetadata: {},
      isHidden: false,
    }
  })
}

/**
 * The developer ids a container declares, which a native export lists on a Google tag's load
 * info. They arrive as `developer_id.<id>: true` keys of a gtag `set` command; the same keys
 * also reach the dataLayer, and a native export does not list the ones that only appear there.
 */
function developerIds(records: RawRecord[]): string[] {
  const ids = new Set<string>()
  for (const r of records) {
    if (r.messageType !== 'GTAG_COMMAND') continue
    for (const [key, value] of Object.entries(obj(r.commandData))) {
      const [prefix, id] = key.split('.')
      if (prefix === 'developer_id' && id && value === true) ids.add(id)
    }
  }
  return [...ids]
}

/** Every tag and variable template id a container's records refer to. */
function usedTemplateIds(records: RawRecord[]): Set<string> {
  const ids = new Set<string>()
  for (const r of records) {
    for (const t of arr(r.tagInfo)) {
      const id = tagTemplateId(obj(t))
      if (id) ids.add(id)
    }
    for (const m of arr(r.macroInfo)) {
      const id = variableTemplateId(obj(m))
      if (id) ids.add(id)
    }
  }
  return ids
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
  // Only the GTM container carries template definitions. A native export gives a Google tag
  // container an empty set, so every one of its parameters is internal.
  const templates = new TemplateSet(isGtm ? usedTemplateIds(records) : [])
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

  /**
   * One message to be written, with what decides where it sits. Tag Assistant numbers messages
   * in the order it received them, so the first key is the time the record arrived. Records
   * arriving in the same millisecond keep the order the feed pushed them in, which `seq`
   * carries. An event id cannot break the tie: a command and the event it raises do not share
   * one, and ids restart on every page load.
   */
  interface Candidate {
    at: number
    seq: number
    build: (index: number) => { entry: AnyRecord; firedTagNames: string[] }
  }
  const candidates: Candidate[] = []
  const arrival = new Map<RawRecord, number>(records.map((r, i) => [r, i]))

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
    const tagInfo = isGtm ? buildTagInfo(started, recs, templates) : []
    const message = dataLayer?.message ?? { event: eventName, 'gtm.uniqueEventId': eventId }
    const abstractModel = dataLayer?.abstractModel ?? {
      event: eventName,
      gtm: { uniqueEventId: eventId },
    }
    candidates.push({
      at: started.capturedAt,
      seq: arrival.get(started) ?? 0,
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
          macroInfo: buildMacroInfo(dataLayer, templates),
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
      seq: arrival.get(r) ?? 0,
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
                macroInfo: buildMacroInfo(push, templates),
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
      seq: arrival.get(r) ?? 0,
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
          macroInfo: buildMacroInfo(r, templates),
          abstractModel: r.abstractModel,
        },
        firedTagNames: [],
      }),
    })
  }

  candidates.sort((a, b) => a.at - b.at || a.seq - b.seq)
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
  for (const [position, groupId] of groupOrder.entries()) {
    const gi = groupInfo.get(groupId)!
    // Where the visitor came from, which within a session is the previous page. The first page
    // has none; a native session shows Tag Assistant's own launcher there.
    const previous = position > 0 ? groupInfo.get(groupOrder[position - 1]!)?.url : undefined
    pageSummaries[groupId] = {
      href: gi.url,
      title: gi.title,
      referrer: previous ?? '',
      readyState: 'complete',
      groupId,
      emoji: '🔷',
    }
    // Tag Assistant's Source line reads sourceId: without it a Google tag loaded by a
    // container shows "Undefined parameter - CONTAINER_ID" instead of naming the container.
    const parent = str(obj(init?.parentTargetReference).ctid)
    const devIds = isGtm ? [] : developerIds(records)
    containerLoadInfoByGroupId[groupId] = {
      targetId: publicId,
      containerLoadSource: num(init?.containerLoadSource) ?? 0,
      ...(parent ? { sourceId: parent } : {}),
      gtg: obj(init?.gtg),
      ...(devIds.length ? { developerIds: devIds } : {}),
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
        ...(isGtm ? { environmentLinkType: 4 } : {}),
        vendorTemplateTypes: templates.vendorTemplateTypes,
        paramMaps: templates.paramMaps,
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
