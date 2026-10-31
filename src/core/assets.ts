/**
 * Asset manifests: what each picture of a pack is (a tile, a character, an enemy, an item, an effect…), how it is cut
 * into frames and which animations it plays. The manifests live in `assets/<pack>/manifest.json` and are made by
 * `scripts/assets/build.py`; see `assets/README.md`.
 *
 * Frames are numbered across the sprite's grid row by row: index = row × columns + column, where
 * columns = picture width / frame width. A clip may use its own picture (`file`, `frame`, `size`), as when a pack
 * keeps each action in a file of its own. A directional clip lists frames per direction; a direction it lacks may be
 * drawn as another one mirrored (`mirror: { right: "left" }`).
 *
 * Pure data and arithmetic, no DOM, so the editor and the server can read manifests too.
 */

import type { Direction } from "./world.ts"

export type AssetCategory =
  | "tileset"
  | "terrain"
  | "decor"
  | "prop"
  | "character"
  | "enemy"
  | "boss"
  | "animal"
  | "crop"
  | "item"
  | "weapon"
  | "effect"
  | "particle"
  | "portrait"
  | "ui"
  | "font"

/** Whether the files of a pack may be published: yes, only in educational material with a link, or not at all. */
export type Redistribute = "yes" | "educational-with-link" | "no"

export type Size = readonly [width: number, height: number]

export interface AssetClip {
  readonly frames: ReadonlyArray<number> | Readonly<Partial<Record<Direction, ReadonlyArray<number>>>>
  /** Frames per second. */
  readonly fps: number
  readonly loop: boolean
  /** The clip's own picture, relative to the manifest; the sprite's picture when absent. */
  readonly file?: string
  readonly frame?: Size
  readonly size?: Size
  /** Directions drawn as another direction flipped horizontally. */
  readonly mirror?: Readonly<Partial<Record<Direction, Direction>>>
  /** The frame count was guessed from the picture and is worth a look. */
  readonly verify?: boolean
}

export interface SpriteAsset {
  readonly id: string
  readonly file: string
  readonly category: AssetCategory
  readonly name: string
  readonly size: Size
  /** One cell of the grid; the whole picture is one frame when absent. */
  readonly frame?: Size
  /**
   * How the grid reads: `directions` (a column per direction: down, up, left, right), `side` (a side view facing one
   * way, flip it for the other), `rows` (a row per direction), `grid` (a tileset or a set of pictures).
   */
  readonly layout?: "directions" | "side" | "rows" | "grid"
  readonly group?: string
  /** For layered characters: which layer this is (`body`, `hair`, `tool`). */
  readonly layer?: string
  readonly clips?: Readonly<Record<string, AssetClip>>
  /** Id of the sprite's portrait (a `portrait` sprite in the same pack). */
  readonly portrait?: string
  /** Other looks of the same picture, as files: `{ night: "…" }`. */
  readonly variants?: Readonly<Record<string, string>>
  readonly verify?: boolean
}

export interface SoundAsset {
  readonly id: string
  readonly file: string
  readonly group: string
  readonly name: string
}

export interface AssetPack {
  readonly id: string
  readonly title: string
  readonly author: string
  readonly source: string
  readonly license: {
    readonly name: string
    readonly url: string
    readonly redistribute: Redistribute
    readonly terms?: string
  }
  /** Size of one field cell in the pack's pictures. */
  readonly cell: number
  readonly sprites: ReadonlyArray<SpriteAsset>
  readonly sounds?: ReadonlyArray<SoundAsset>
}

/** Part of a picture to draw: `w`×`h` from (`sx`, `sy`) of `file`, flipped horizontally when `flip`. */
export interface FrameRect {
  readonly file: string
  readonly sx: number
  readonly sy: number
  readonly w: number
  readonly h: number
  readonly flip: boolean
}

const isDirectional = (frames: AssetClip["frames"]): frames is Readonly<Partial<Record<Direction, ReadonlyArray<number>>>> =>
  !Array.isArray(frames)

/** The frames a clip plays facing `direction`, and whether to flip them. Empty when the clip has no such direction. */
export const clipFrames = (clip: AssetClip, direction: Direction = "down"): { readonly frames: ReadonlyArray<number>; readonly flip: boolean } => {
  const { frames } = clip
  if (!isDirectional(frames)) return { frames, flip: false }
  const own = frames[direction]
  if (own !== undefined) return { frames: own, flip: false }
  const mirrored = clip.mirror?.[direction]
  const other = mirrored === undefined ? undefined : frames[mirrored]
  return other === undefined ? { frames: [], flip: false } : { frames: other, flip: true }
}

/** Where frame `index` of the sprite's grid (or the clip's own picture) is. */
export const frameRect = (sprite: SpriteAsset, index: number, clip?: AssetClip, flip = false): FrameRect => {
  const file = clip?.file ?? sprite.file
  const size = clip?.size ?? sprite.size
  const [w, h] = clip?.frame ?? sprite.frame ?? size
  const columns = Math.max(1, Math.floor(size[0] / w))
  return { file, sx: (index % columns) * w, sy: Math.floor(index / columns) * h, w, h, flip }
}

/** Which of `count` frames shows `ms` milliseconds into a clip: looping, or holding the last frame. */
export const frameIndexAt = (count: number, fps: number, loop: boolean, ms: number): number => {
  if (count <= 0) return 0
  const step = Math.floor((Math.max(0, ms) * fps) / 1000)
  return loop ? step % count : Math.min(step, count - 1)
}

/** The frame to draw `ms` milliseconds into a clip, or null when the sprite has no such clip or direction. */
export const frameAt = (sprite: SpriteAsset, clipName: string, direction: Direction, ms: number): FrameRect | null => {
  const clip = sprite.clips?.[clipName]
  if (clip === undefined) return null
  const { frames, flip } = clipFrames(clip, direction)
  const index = frames[frameIndexAt(frames.length, clip.fps, clip.loop, ms)]
  return index === undefined ? null : frameRect(sprite, index, clip, flip)
}

/** How long a clip plays once, in milliseconds. */
export const clipDuration = (clip: AssetClip, direction: Direction = "down"): number =>
  (clipFrames(clip, direction).frames.length * 1000) / clip.fps

/** Every frame index a clip uses, over all directions. */
export const clipIndices = (clip: AssetClip): ReadonlyArray<number> =>
  isDirectional(clip.frames) ? Object.values(clip.frames).flatMap((f) => f ?? []) : clip.frames

/** Mistakes in a manifest that would draw the wrong part of a picture or nothing. Picture sizes are checked by the caller. */
export const packProblems = (pack: AssetPack): ReadonlyArray<string> => {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const sprite of pack.sprites) {
    if (ids.has(sprite.id)) problems.push(`${sprite.id}: the id is used twice`)
    ids.add(sprite.id)
  }
  for (const sprite of pack.sprites) {
    if (sprite.portrait !== undefined && !ids.has(sprite.portrait)) problems.push(`${sprite.id}: no portrait ${sprite.portrait}`)
    for (const [name, clip] of Object.entries(sprite.clips ?? {})) {
      const size = clip.size ?? sprite.size
      const [w, h] = clip.frame ?? sprite.frame ?? size
      const cells = Math.floor(size[0] / w) * Math.floor(size[1] / h)
      if (clip.fps <= 0) problems.push(`${sprite.id} ${name}: fps must be positive`)
      const indices = clipIndices(clip)
      if (indices.length === 0) problems.push(`${sprite.id} ${name}: no frames`)
      for (const i of indices) if (!Number.isInteger(i) || i < 0 || i >= cells) problems.push(`${sprite.id} ${name}: frame ${i} is outside the ${cells} cells`)
    }
  }
  return problems
}
