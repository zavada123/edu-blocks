import { type AssetPack, parseAssetRef, type SpriteAsset } from "../../core/assets.ts"
import { notifyLoaded } from "./images.ts"

/**
 * Asset packs for the field, loaded when a level needs them. A pack lives in `<base><pack id>/manifest.json`, next to
 * its pictures; the demo and the editor serve them from `./packs/` (see `assetPacks` in vite.shared.ts). A page that
 * keeps them elsewhere calls `setAssetBase` once. Until a pack has loaded, its pictures are just not drawn.
 */

/** A pack in the list the build writes to `<base>index.json`. */
export interface PackInfo {
  readonly id: string
  readonly title: string
  readonly author: string
  readonly source: string
  readonly license: AssetPack["license"]
  /** Served only from a private folder at build time: never published with the public demo. */
  readonly private?: boolean
}

let base = "./packs/"
const packs = new Map<string, AssetPack>()
const pending = new Map<string, Promise<AssetPack | null>>()

/** Where the pack folders are, ending with a slash. */
export const setAssetBase = (url: string) => {
  const next = url.endsWith("/") ? url : `${url}/`
  if (next === base) return
  base = next
  packs.clear()
  pending.clear()
}

export const assetBase = (): string => base

/** The URL of a file of a pack, as the manifest names it. */
export const packFile = (pack: string, file: string): string => `${base}${pack}/${file}`

/** Loads a pack once; resolves to null when there is no such pack. */
export const loadPack = (id: string): Promise<AssetPack | null> => {
  const known = pending.get(id)
  if (known !== undefined) return known
  const promise = fetch(`${base}${id}/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<AssetPack>) : null))
    .then((pack) => {
      if (pack !== null) {
        packs.set(id, pack)
        notifyLoaded()
      }
      return pack
    })
    .catch(() => null)
  pending.set(id, promise)
  return promise
}

/** The packs the build serves, from `<base>index.json`; empty when there is no list. */
export const loadPackList = (): Promise<ReadonlyArray<PackInfo>> =>
  fetch(`${base}index.json`)
    .then((r) => (r.ok ? (r.json() as Promise<ReadonlyArray<PackInfo>>) : []))
    .catch(() => [])

export const loadedPack = (id: string): AssetPack | null => packs.get(id) ?? null

/** A sprite and its pack, by reference: null while the pack loads or when there is no such sprite. */
export const spriteOf = (ref: string): { readonly pack: AssetPack; readonly sprite: SpriteAsset } | null => {
  const parsed = parseAssetRef(ref)
  if (parsed === null) return null
  const pack = packs.get(parsed.pack)
  if (pack === undefined) {
    void loadPack(parsed.pack)
    return null
  }
  const sprite = pack.sprites.find((s) => s.id === parsed.id)
  return sprite === undefined ? null : { pack, sprite }
}
