import { describe, expect, it } from "vitest"
import { loadRate, loadZoom, type PrefsStore, RATE_KEY, saveRate, saveZoom, ZOOM_KEY } from "./prefs.ts"

const memory = (): PrefsStore & { readonly data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

const broken: PrefsStore = {
  getItem: () => {
    throw new Error("blocked")
  },
  setItem: () => {
    throw new Error("blocked")
  }
}

const RATES = [0.5, 1, 2, 4]

describe("speed", () => {
  it("returns the saved speed after a reload", () => {
    const store = memory()
    saveRate(2, store)
    expect(loadRate(RATES, 1, store)).toBe(2)
  })

  it("falls back when nothing or a strange value is saved", () => {
    const store = memory()
    expect(loadRate(RATES, 1, store)).toBe(1)
    store.data.set(RATE_KEY, "3")
    expect(loadRate(RATES, 1, store)).toBe(1)
    store.data.set(RATE_KEY, "fast")
    expect(loadRate(RATES, 1, store)).toBe(1)
  })

  it("works without storage", () => {
    expect(loadRate(RATES, 1, null)).toBe(1)
    expect(loadRate(RATES, 1, broken)).toBe(1)
    expect(() => saveRate(2, broken)).not.toThrow()
  })
})

describe("zoom", () => {
  it("returns the saved zoom after a reload", () => {
    const store = memory()
    saveZoom(1.44, store)
    expect(loadZoom(store)).toBe(1.44)
  })

  it("keeps the zoom in its limits", () => {
    const store = memory()
    saveZoom(100, store)
    expect(loadZoom(store)).toBe(4)
    store.data.set(ZOOM_KEY, "0")
    expect(loadZoom(store)).toBe(1)
    saveZoom(Number.NaN, store)
    expect(store.data.get(ZOOM_KEY)).toBe("0")
  })

  it("is 1 without storage", () => {
    expect(loadZoom(null)).toBe(1)
    expect(loadZoom(broken)).toBe(1)
    expect(() => saveZoom(2, broken)).not.toThrow()
  })
})
