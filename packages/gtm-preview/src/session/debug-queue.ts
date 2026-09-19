/** Names of the globals the container's debug build and our recorder use. */
export const DEBUG_QUEUE_GLOBAL = 'google.tagmanager.debugui2.queue'
export const RECORDS_GLOBAL = '__gtmPreviewRecords'
export const DATALAYER_GLOBAL = '__gtmPreviewDataLayer'

/** A record as pushed by the debug build, with our capture timestamp added. */
export interface RawRecord {
  capturedAt: number
  messageType: string
  containerProduct?: string
  version?: string
  key?: {
    publicId?: string
    eventId?: number
    eventName?: string
    tagName?: string
    groupId?: string
    targetRef?: { ctid?: string; isDestination?: boolean; canonicalId?: string }
  }
  consentData?: unknown
  [k: string]: unknown
}

export interface RawDataLayerPush {
  capturedAt: number
  pageUrl: string
  /** The pushed value after JSON round-trip. Arrays (gtag command form) are kept as arrays. */
  value: unknown
}

/**
 * Source of the script installed before any page script runs. It owns the debug queue so
 * every record the container's debug build pushes lands in our array, resumes the paused
 * container itself, and wraps dataLayer.push so pushes are recorded even before GTM loads.
 */
export function debugQueueInitScript(): string {
  return `(() => {
  const QUEUE = ${JSON.stringify(DEBUG_QUEUE_GLOBAL)};
  const RECORDS = ${JSON.stringify(RECORDS_GLOBAL)};
  const DL = ${JSON.stringify(DATALAYER_GLOBAL)};
  const strip = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'function' ? '[fn]' : x)));
  const records = [];
  const pushes = [];
  window[RECORDS] = records;
  window[DL] = pushes;
  const sink = {
    length: 0,
    push: (...msgs) => {
      for (const m of msgs) {
        let copy;
        try { copy = strip(m); } catch { copy = { messageType: String(m && m.messageType), unserialisable: true }; }
        copy.capturedAt = Date.now();
        records.push(copy);
        if (m && m.messageType === 'CONTAINER_STARTING' && m.data && typeof m.data.resume === 'function') {
          setTimeout(() => { try { m.data.resume(); } catch (e) { records.push({ messageType: '__RESUME_FAILED', error: String(e), capturedAt: Date.now() }); } }, 0);
        }
      }
      return 0;
    },
  };
  Object.defineProperty(window, QUEUE, { get: () => sink, set: () => {}, configurable: false });

  const wrap = (arr) => {
    if (!arr || arr.__gtmPreviewWrapped) return arr;
    const orig = arr.push;
    arr.push = function (...items) {
      for (const it of items) { try { pushes.push({ capturedAt: Date.now(), pageUrl: location.href, value: strip(it) }); } catch {} }
      return orig.apply(this, items);
    };
    Object.defineProperty(arr, '__gtmPreviewWrapped', { value: true });
    for (const it of arr) { try { pushes.push({ capturedAt: Date.now(), pageUrl: location.href, value: strip(it), preexisting: true }); } catch {} }
    return arr;
  };
  let current = wrap(window.dataLayer);
  Object.defineProperty(window, 'dataLayer', {
    get: () => current,
    set: (v) => { current = wrap(v); },
    configurable: true,
  });
})();`
}
