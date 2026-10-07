import { z } from 'zod'

export const HitOutcomeSchema = z.enum(['aborted', 'sent', 'sent_marked_debug'])

export const HitSchema = z.object({
  at: z.number(),
  vendor: z.string(),
  host: z.string(),
  path: z.string(),
  params: z.record(z.string()),
  eventName: z.string().optional(),
  outcome: HitOutcomeSchema,
  /** GTM event id this hit was attributed to, when known. Ids restart on every page load. */
  eventId: z.number().optional(),
  /** Container load (page load) the attributed event belongs to. */
  groupId: z.string().optional(),
  /** Container (GTM or Google tag public id) of the attributed event. */
  container: z.string().optional(),
  /** runtime: the tag runtime reported this hit itself; time: nearest earlier GTM event. */
  attributedBy: z.enum(['runtime', 'time']).optional(),
})
export type Hit = z.infer<typeof HitSchema>

export const PredicateSchema = z.object({
  function: z.string(),
  left: z.unknown(),
  right: z.unknown(),
  pass: z.boolean().optional(),
  ignored: z.boolean().optional(),
})

export const TriggerResultSchema = z.object({
  name: z.string(),
  pass: z.boolean().nullable(),
  predicates: z.array(PredicateSchema),
  firingTags: z.array(z.number()),
  blockingTags: z.array(z.number()),
})

export const TagDecisionSchema = z.enum(['execute', 'blocked', 'suppressed', 'malware', 'unknown'])

export const TagResultSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  /** What GTM decided when the tag was nominated. */
  decision: TagDecisionSchema,
  /** Final status reported by GTM, such as execute_succeeded or execute_failed. */
  status: z.string().optional(),
  /** Tag parameters with their resolved values for this event. */
  params: z.record(z.unknown()),
})

export const MismatchSchema = z.discriminatedUnion('kind', [
  /** GTM reports the tag executed, but no hit left (or tried to leave) the browser for this event. */
  z.object({ kind: z.literal('tag_without_hit'), tag: z.string(), tagType: z.string().optional() }),
  /** A vendor hit was attributed to this event, but no executed tag could have sent it. */
  z.object({
    kind: z.literal('hit_without_tag'),
    vendor: z.string(),
    host: z.string(),
    eventName: z.string().optional(),
  }),
])
export type Mismatch = z.infer<typeof MismatchSchema>

export const EventReportSchema = z.object({
  /** Per container load; restarts at 1 on every page load. */
  eventId: z.number(),
  /** Public id of the container that reported the event (GTM-… or a Google tag G-…/AW-…). */
  container: z.string(),
  /** The container load (page load) this event belongs to. */
  groupId: z.string(),
  pageUrl: z.string().optional(),
  eventName: z.string(),
  at: z.number(),
  /** The dataLayer message that started the event, when the build reported it. */
  message: z.unknown().optional(),
  triggers: z.array(TriggerResultSchema),
  tags: z.array(TagResultSchema),
  /** Consent type to granted flag, as GTM saw it at this event. */
  consent: z.record(z.boolean()),
  hits: z.array(HitSchema),
  mismatches: z.array(MismatchSchema),
})
export type EventReport = z.infer<typeof EventReportSchema>

export const SessionReportSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  scenario: z.object({ name: z.string(), startUrl: z.string() }),
  container: z.object({
    id: z.string(),
    environment: z.number(),
    product: z.string().optional(),
    protocolVersion: z.string().optional(),
    debugBuildLoaded: z.boolean(),
  }),
  /** Every container that reported events, the GTM container first. */
  containers: z.array(
    z.object({
      id: z.string(),
      product: z.string().optional(),
      protocolVersion: z.string().optional(),
    }),
  ),
  hitPolicy: z.enum(['dry', 'debug', 'live']),
  /** Every tag in the container, by index, from the first event record. */
  tags: z.array(z.object({ index: z.number(), name: z.string(), type: z.string().optional() })),
  /** Every trigger in the container with the tag indexes it fires or blocks. */
  triggers: z.array(
    z.object({
      name: z.string(),
      firingTags: z.array(z.number()),
      blockingTags: z.array(z.number()),
    }),
  ),
  events: z.array(EventReportSchema),
  /** Every vendor hit attempted during the session, in order. */
  hits: z.array(HitSchema),
  /** Hits that left before GTM reported any event, so no tag can explain them. */
  unattributedHits: z.array(HitSchema),
  dataLayerPushes: z.array(z.object({ at: z.number(), pageUrl: z.string(), value: z.unknown() })),
  errors: z.array(z.string()),
  summary: z.object({
    events: z.number(),
    tagsExecuted: z.number(),
    tagsBlocked: z.number(),
    tagsFailed: z.number(),
    hitsAttempted: z.number(),
    hitsSent: z.number(),
    mismatches: z.number(),
  }),
})
export type SessionReport = z.infer<typeof SessionReportSchema>
