/**
 * The settings that the student chooses once and expects to stay: the speed of the playback and the zoom of the
 * blocks. They stay in this browser across levels and page loads. Without storage (a private window, blocked
 * site data) the game uses the defaults and forgets.
 */

/** A part of the browser storage: only what the settings use. */
export interface PrefsStore {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

export const RATE_KEY = "edu-blocks:rate"
export const ZOOM_KEY = "edu-blocks:zoom"

/** The zoom is kept as a share of the start scale of the editor, so a phone and a computer each keep their size. */
export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 4

const browserStore = (): PrefsStore | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage
  } catch {
    return null
  }
}

const readNumber = (store: PrefsStore | null, key: string): number | null => {
  if (store === null) return null
  try {
    const raw = store.getItem(key)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

const writeNumber = (store: PrefsStore | null, key: string, value: number) => {
  if (store === null) return
  try {
    store.setItem(key, String(value))
  } catch {
    // Full or blocked storage: the setting stays for this page only.
  }
}

/** The saved speed if it is one of `rates`, else `fallback`. */
export const loadRate = (rates: ReadonlyArray<number>, fallback: number, store: PrefsStore | null = browserStore()): number => {
  const saved = readNumber(store, RATE_KEY)
  return saved !== null && rates.includes(saved) ? saved : fallback
}

export const saveRate = (rate: number, store: PrefsStore | null = browserStore()) => writeNumber(store, RATE_KEY, rate)

/** The saved zoom (a share of the start scale), 1 when nothing valid is saved. */
export const loadZoom = (store: PrefsStore | null = browserStore()): number => {
  const saved = readNumber(store, ZOOM_KEY)
  return saved !== null && saved >= MIN_ZOOM && saved <= MAX_ZOOM ? saved : 1
}

export const saveZoom = (zoom: number, store: PrefsStore | null = browserStore()) => {
  if (!Number.isFinite(zoom)) return
  writeNumber(store, ZOOM_KEY, Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 1000) / 1000)))
}
