/**
 * Display names and thumbnails Tag Assistant shows for GTM's built-in templates, keyed by
 * the template id the debug feed reports (`metadata.type` for tags, `type` for variables).
 * Anything not listed falls back to the id itself.
 *
 * These are a fallback. The export prefers the captured template definitions in
 * `vendor-templates.ts`, which carry the same names plus the declared parameter list, and
 * reaches this table only for a template the capture does not hold.
 */
export interface TemplateInfo {
  name: string
  thumbnail: string
}

export const TAG_TEMPLATES: Record<string, TemplateInfo> = {
  googtag: { name: 'Google Tag', thumbnail: 'gtag-solid-icon.svg' },
  gaawe: { name: 'Google Analytics: GA4 Event', thumbnail: 'thumbnail-ga.svg' },
  gaawc: { name: 'Google Analytics: GA4 Configuration', thumbnail: 'thumbnail-ga.svg' },
  ua: { name: 'Google Analytics: Universal Analytics', thumbnail: 'thumbnail-ga.svg' },
  awct: { name: 'Google Ads Conversion Tracking', thumbnail: 'thumbnail-adwords.svg' },
  sp: { name: 'Google Ads Remarketing', thumbnail: 'thumbnail-adwords.svg' },
  gclidw: { name: 'Conversion Linker', thumbnail: 'thumbnail-adwords.svg' },
  awcc: { name: 'Google Ads Calls from Website Conversion', thumbnail: 'thumbnail-adwords.svg' },
  flc: { name: 'Floodlight Counter', thumbnail: 'thumbnail-floodlight.svg' },
  fls: { name: 'Floodlight Sales', thumbnail: 'thumbnail-floodlight.svg' },
  html: { name: 'Custom HTML', thumbnail: 'thumbnail-custom-html.svg' },
  img: { name: 'Custom Image', thumbnail: 'thumbnail-custom-image.svg' },
  cl: { name: 'Click Listener', thumbnail: '' },
  lcl: { name: 'Link Click Listener', thumbnail: '' },
  fsl: { name: 'Form Submit Listener', thumbnail: '' },
  sdl: { name: 'Scroll Depth Listener', thumbnail: '' },
  evl: { name: 'Element Visibility Listener', thumbnail: '' },
  ytl: { name: 'YouTube Video Listener', thumbnail: '' },
  tl: { name: 'Timer Listener', thumbnail: '' },
  hl: { name: 'History Listener', thumbnail: '' },
  jel: { name: 'JavaScript Error Listener', thumbnail: '' },
}

export const VARIABLE_TEMPLATES: Record<string, TemplateInfo> = {
  e: { name: 'Custom Event', thumbnail: '' },
  u: { name: 'URL', thumbnail: '' },
  f: { name: 'HTTP Referrer', thumbnail: '' },
  v: { name: 'Data Layer Variable', thumbnail: '' },
  aev: { name: 'Auto-Event Variable', thumbnail: '' },
  jsm: { name: 'Custom JavaScript', thumbnail: '' },
  j: { name: 'JavaScript Variable', thumbnail: '' },
  k: { name: '1st Party Cookie', thumbnail: '' },
  c: { name: 'Constant', thumbnail: '' },
  smm: { name: 'Lookup Table', thumbnail: '' },
  remm: { name: 'RegEx Table', thumbnail: '' },
  r: { name: 'Random Number', thumbnail: '' },
  ctv: { name: 'Container Version Number', thumbnail: '' },
  cid: { name: 'Container ID', thumbnail: '' },
  dbg: { name: 'Debug Mode', thumbnail: '' },
  d: { name: 'DOM Element', thumbnail: '' },
  vis: { name: 'Element Visibility', thumbnail: '' },
  gas: { name: 'Google Analytics Settings', thumbnail: '' },
  uv: { name: 'Undefined Value', thumbnail: '' },
  awec: { name: 'User-Provided Data', thumbnail: '' },
}

/** Titles Tag Assistant gives GTM's built-in events; other events show their own name. */
export const EVENT_TITLES: Record<string, string> = {
  'gtm.init_consent': 'Consent Initialization',
  'gtm.init': 'Initialization',
  'gtm.js': 'Container Loaded',
  'gtm.dom': 'DOM Ready',
  'gtm.load': 'Window Loaded',
  'gtm.click': 'Click',
  'gtm.linkClick': 'Link Click',
  'gtm.formSubmit': 'Form Submission',
  'gtm.historyChange': 'History Change',
  'gtm.scrollDepth': 'Scroll Depth',
  'gtm.elementVisibility': 'Element Visibility',
  'gtm.timer': 'Timer',
  'gtm.video': 'YouTube Video',
  'gtm.triggerGroup': 'Trigger Group',
  'gtm.pageError': 'JavaScript Error',
}

export function tagTemplate(id: string | undefined): TemplateInfo {
  if (!id) return { name: '', thumbnail: '' }
  if (id.startsWith('cvt_')) return { name: 'Custom Template', thumbnail: '' }
  return TAG_TEMPLATES[id] ?? { name: id, thumbnail: '' }
}

export function variableTemplate(id: string | undefined): TemplateInfo {
  if (!id) return { name: '', thumbnail: '' }
  if (id.startsWith('cvt_')) return { name: 'Custom Template', thumbnail: '' }
  return VARIABLE_TEMPLATES[id] ?? { name: id, thumbnail: '' }
}

export function eventTitle(eventName: string): string {
  return EVENT_TITLES[eventName] ?? eventName
}
