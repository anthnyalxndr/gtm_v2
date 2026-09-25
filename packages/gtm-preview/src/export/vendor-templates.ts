import captured from './fixtures/vendor-templates.json'

/**
 * Tag Assistant does not read template definitions from the debug feed. It fetches them from
 * `https://www.googletagmanager.com/debug/api/<publicId>/vtinfo`, with the templates a session
 * used, `request_mode` 2 for a GTM container and 1 otherwise, the environment code and the
 * environment id. That endpoint authorizes the signed-in Google account rather than the
 * container: called with a valid environment code and no session cookie it answers
 * `errorCode: 7, Permission Denied`. A headless run cannot reach it.
 *
 * So the definitions here are a capture, taken from two native exports of GTM-5KNSPW9K on
 * 2026-09-19 and 2026-09-23. They go stale when Google revises a template: a parameter added
 * since the capture is treated as internal, and a template not captured at all declares
 * nothing, which is the same as the behaviour before this file existed. Refresh it by exporting
 * a native session and copying the container's `vendorTemplates` entry's `vendorTemplateTypes`.
 */
export const VTINFO_ENDPOINT = 'https://www.googletagmanager.com/debug/api/{publicId}/vtinfo'

/** GTM's internationalised string: the English text sits at `text[0].value`. */
export interface DisplayName {
  text: { value: string; [k: string]: unknown }[]
}

export interface TemplateParam {
  name: string
  type: number
  displayName: DisplayName
}

export interface TemplateDefinition {
  publicId: string
  displayName: DisplayName
  param: TemplateParam[]
  type: number
  thumbnail: string
}

const DEFINITIONS = captured as unknown as Record<string, TemplateDefinition>

export function displayText(name: DisplayName | undefined): string {
  return name?.text?.[0]?.value ?? ''
}

/**
 * The template definitions one container used, and the parameter split that follows from them.
 * A Google tag container has none, so every one of its parameters is internal, which is what a
 * native export writes.
 */
export class TemplateSet {
  private readonly defs: Record<string, TemplateDefinition> = {}

  constructor(usedIds: Iterable<string>) {
    for (const id of usedIds) {
      const def = DEFINITIONS[id]
      if (def) this.defs[id] = def
    }
  }

  /** Empty for a container with no captured definitions. */
  get vendorTemplateTypes(): Record<string, TemplateDefinition> {
    return this.defs
  }

  /** Each template's parameters keyed by name, which is how a native export derives it. */
  get paramMaps(): Record<string, Record<string, TemplateParam>> {
    const out: Record<string, Record<string, TemplateParam>> = {}
    for (const [id, def] of Object.entries(this.defs)) {
      const map: Record<string, TemplateParam> = {}
      for (const p of def.param) map[p.name] = p
      out[id] = map
    }
    return out
  }

  /** The template's own display name, e.g. "Google Analytics: GA4 Event". */
  displayName(templateId: string): string | undefined {
    const def = this.defs[templateId]
    return def ? displayText(def.displayName) : undefined
  }

  thumbnail(templateId: string): string | undefined {
    return this.defs[templateId]?.thumbnail
  }

  /**
   * The display name for a parameter key, or undefined when the template does not declare it.
   * Undefined is the signal to write the parameter as internal. Keys arrive with a `vtp_`
   * prefix; the declared names do not carry it.
   */
  paramName(templateId: string, key: string): string | undefined {
    const def = this.defs[templateId]
    if (!def) return undefined
    const wanted = key.replace(/^vtp_/, '')
    const param = def.param.find((p) => p.name === wanted)
    return param ? displayText(param.displayName) : undefined
  }
}

/** Every template id the capture holds, for tests and for a staleness check. */
export const capturedTemplateIds = Object.keys(DEFINITIONS)
