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
  /** What the animation shows, in Ukrainian. */
  readonly about?: string
}

/** What a picture can be in a level: the roles a level builder (a person or an AI) may give it. */
export type AssetRole =
  | "hero"
  | "npc"
  | "enemy"
  | "animal"
  | "collectible"
  | "obstacle"
  | "goal"
  | "building"
  | "decor"
  | "ground"
  | "path"
  | "water"
  | "cliff"
  | "bridge"
  | "shadow"
  | "weather"
  | "effect"
  | "projectile"
  | "ui-panel"
  | "ui-button"
  | "ui-icon"
  | "ui-bar"
  | "cursor"
  | "portrait"

/** One tile of a tileset, described: which ground it is and on which sides that ground ends. */
export interface TileInfo {
  /** The tile number, counted from 1 as tile layers count them. */
  readonly index: number
  readonly col: number
  readonly row: number
  /** The ground: `grass`, `sand`, `plateau`, `cliff`, `water`, `bridge`… */
  readonly terrain: string
  /** `fill`, `edge`, `wall`, `stairs`, or a name of its own (`horizontal-left`, `slope-left-top`…). */
  readonly role: string
  readonly about: string
  /** Sides where the ground ends (its neighbour there is another ground), from `N`, `E`, `S`, `W`. */
  readonly edges?: string
  /** The same as bits, N 1, E 2, S 4, W 8: the tile for a cell is the one whose mask matches its neighbours. */
  readonly mask?: number
  readonly verify?: boolean
}

/** A piece of a UI picture, for 3- and 9-slice scaling: `top-left`, `center`, `left`, `r0c2`… */
export interface UiPart {
  readonly name: string
  /** x, y, width, height in the picture. */
  readonly rect: readonly [number, number, number, number]
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
  // Descriptions for people and for AI (packs made by scripts/assets/tiny_swords.py have them all).
  /** The name in Ukrainian. */
  readonly title?: string
  /** What the picture shows and how a level can use it, in Ukrainian. */
  readonly about?: string
  /** English keywords to search by. */
  readonly tags?: ReadonlyArray<string>
  readonly roles?: ReadonlyArray<AssetRole>
  /** The team colour of a unit or a building: `blue`, `red`, `yellow`, `purple`, `black`. */
  readonly color?: string
  /** The way a side-view figure looks in the picture. */
  readonly faces?: Direction
  /** Drawn cells of the main picture. */
  readonly frameCount?: number
  /** The point in a frame where the figure touches the ground (pixels of the frame): put it on the cell. */
  readonly anchor?: readonly [number, number]
  /** The visible part of a frame over all its clips: x, y, width, height in pixels of the frame. */
  readonly bounds?: readonly [number, number, number, number]
  /** Cells of the field the thing stands on, width × height. */
  readonly footprint?: readonly [number, number]
  /** The tiles of a tileset, described. */
  readonly tiles?: ReadonlyArray<TileInfo>
  /** The pieces of a UI picture. */
  readonly parts?: ReadonlyArray<UiPart>
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
  /** How the pack draws the world, in words. */
  readonly view?: string
  /** The team colours of its units and buildings. */
  readonly colors?: ReadonlyArray<string>
  /** Another pack whose sprite ids and clip names this one uses for the same things. */
  readonly sameIdsAs?: string
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

// ── Pictures of a level ─────────────────────────────────────────────────────────────────────────────────────────

/** The pack and the sprite of an asset reference `"<pack>:<sprite id>"`, or null when it is not one. */
export const parseAssetRef = (ref: string): { readonly pack: string; readonly id: string } | null => {
  const at = ref.indexOf(":")
  if (at <= 0 || at === ref.length - 1) return null
  return { pack: ref.slice(0, at), id: ref.slice(at + 1) }
}

export const assetRef = (pack: string, id: string): string => `${pack}:${id}`

/** Every asset reference of a level: its sprites, the looks of its items, goal, villagers and enemies. */
export const assetRefsOf = (level: {
  readonly scene?: {
    readonly sprites?: ReadonlyArray<{ readonly asset: string }>
    readonly npcs?: ReadonlyArray<{ readonly look?: string }>
    readonly itemLook?: string
    readonly finishLook?: string
  }
  readonly enemies?: ReadonlyArray<{ readonly look?: string }>
}): ReadonlyArray<string> => {
  const scene = level.scene ?? {}
  const refs = [
    ...(scene.sprites ?? []).map((s) => s.asset),
    ...(scene.npcs ?? []).map((n) => n.look),
    ...(level.enemies ?? []).map((e) => e.look),
    scene.itemLook,
    scene.finishLook
  ]
  return [...new Set(refs.filter((r): r is string => r !== undefined))]
}

/** The packs a level needs. */
export const packsOf = (level: Parameters<typeof assetRefsOf>[0]): ReadonlyArray<string> => [
  ...new Set(assetRefsOf(level).flatMap((ref) => parseAssetRef(ref)?.pack ?? []))
]

/** Clips a figure plays when nothing else is asked, best first. */
const IDLE_CLIPS: ReadonlyArray<string> = ["idle", "play", "walk", "grow"]

/**
 * The clip a sprite plays standing on the field: its `idle` (or the like) or the first one that loops; null when it
 * has none. A clip played once (a gold bag that appears in a flash) is not how the thing stands.
 */
export const restClip = (sprite: SpriteAsset): string | null => {
  const clips = sprite.clips ?? {}
  const names = Object.keys(clips)
  return IDLE_CLIPS.find((n) => names.includes(n)) ?? names.find((n) => clips[n]?.loop !== false) ?? null
}

/** The clip of a walking figure: `walk` or `run`, else what it plays at rest. */
export const walkClip = (sprite: SpriteAsset): string | null =>
  sprite.clips?.walk !== undefined ? "walk" : sprite.clips?.run !== undefined ? "run" : restClip(sprite)

/**
 * One still frame that shows what the sprite is, for an icon: the `icon` clip of a crop, the ripe last stage of a
 * growing crop, the first frame of the rest clip facing down, or the whole picture.
 */
export const iconFrame = (sprite: SpriteAsset): FrameRect => {
  const clips = sprite.clips ?? {}
  const icon = clips.icon
  if (icon !== undefined) {
    const { frames, flip } = clipFrames(icon)
    if (frames[0] !== undefined) return frameRect(sprite, frames[0], icon, flip)
  }
  const grow = clips.grow
  if (grow !== undefined) {
    const { frames } = clipFrames(grow)
    const last = frames[frames.length - 1]
    if (last !== undefined) return frameRect(sprite, last, grow)
  }
  const rest = restClip(sprite)
  if (rest !== null) {
    const frame = frameAt(sprite, rest, "down", 0)
    if (frame !== null) return frame
  }
  return frameRect(sprite, 0)
}
