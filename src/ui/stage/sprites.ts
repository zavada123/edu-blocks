import { type AssetPack, clipFrames, frameAt, type FrameRect, frameRect, iconFrame, parseAssetRef, restClip, type SpriteAsset } from "../../core/assets.ts"
import type { PlacedSprite } from "../../core/level.ts"
import { cellKey, type Direction } from "../../core/world.ts"
import { image } from "./images.ts"
import { ART_PACK, art } from "../art.ts"
import { packFile, spriteOf } from "./packs.ts"

/**
 * Drawing pictures of the asset packs on the field: placed sprites (`scene.sprites`) and the pack looks of villagers,
 * enemies, items and the goal. A pack picture is scaled so that one cell of the pack is one cell of the field.
 */

/** One cell of the field, in canvas units: the same as `CELL` in draw.ts. */
const CELL = 16

type Ctx = CanvasRenderingContext2D

export interface Resolved {
  readonly pack: AssetPack
  readonly sprite: SpriteAsset
}

/** Canvas units per picture pixel of a pack. */
const scaleOf = (pack: AssetPack): number => CELL / (pack.cell > 0 ? pack.cell : CELL)

const drawRect = (ctx: Ctx, pack: AssetPack, rect: FrameRect, x: number, y: number, w: number, h: number, smooth = false): boolean => {
  const img = image(packFile(pack.id, rect.file))
  if (img === null) return false
  if (smooth) {
    // Big pictures drawn smaller than their pixels look better smoothed than with every other pixel dropped.
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    drawRect(ctx, pack, rect, x, y, w, h)
    ctx.restore()
    return true
  }
  if (!rect.flip) {
    ctx.drawImage(img, rect.sx, rect.sy, rect.w, rect.h, x, y, w, h)
    return true
  }
  ctx.save()
  ctx.translate(x + w, y)
  ctx.scale(-1, 1)
  ctx.drawImage(img, rect.sx, rect.sy, rect.w, rect.h, 0, 0, w, h)
  ctx.restore()
  return true
}

/** The frame of a clip `progress` of the way through it (0…1), for an act that takes its own time. */
const frameThrough = (sprite: SpriteAsset, clip: string, dir: Direction, progress: number): FrameRect | null => {
  const found = sprite.clips?.[clip]
  if (found === undefined) return null
  const { frames, flip } = clipFrames(found, dir)
  const index = frames[Math.min(frames.length - 1, Math.max(0, Math.floor(progress * frames.length)))]
  return index === undefined ? null : frameRect(sprite, index, found, flip)
}

/** The frame of a clip at `now`, or the sprite's icon when it has no such clip. */
const frameOf = (sprite: SpriteAsset, clip: string | null, dir: Direction, now: number, progress?: number): FrameRect => {
  if (clip !== null && progress !== undefined) {
    const frame = frameThrough(sprite, clip, dir, progress)
    if (frame !== null) return frame
  }
  if (clip !== null) {
    const frame = frameAt(sprite, clip, dir, now)
    if (frame !== null) return frame
    // A clip without this direction: try the one facing down.
    const down = frameAt(sprite, clip, "down", now)
    if (down !== null) return down
  }
  return iconFrame(sprite)
}

export interface FigureOptions {
  /** The middle of the bottom edge, where the figure stands. */
  readonly cx: number
  readonly bottom: number
  readonly clip?: string | null | undefined
  readonly dir?: Direction
  readonly now: number
  /** Mirrored left to right, on top of the clip's own mirroring. */
  readonly flip?: boolean
  /** Grows the figure, as a boss. */
  readonly scale?: number
  /** Plays the clip by the progress of an act (0…1) instead of the clock. */
  readonly progress?: number
}

/** Where a frame stands, in its pixels: the sprite's `anchor` when the frame has the sprite's size, else the middle of the bottom. */
const anchorOf = (sprite: SpriteAsset, rect: FrameRect): readonly [number, number] => {
  const [fw, fh] = sprite.frame ?? sprite.size
  const anchor = sprite.anchor
  if (anchor === undefined || fw !== rect.w || fh !== rect.h) return [rect.w / 2, rect.h]
  return rect.flip ? [rect.w - anchor[0], anchor[1]] : anchor
}

/** A figure standing at (`cx`, `bottom`). Returns the top edge it was drawn to, or null when not drawn yet. */
export const drawFigure = (ctx: Ctx, found: Resolved, o: FigureOptions): number | null => {
  const { pack, sprite } = found
  const clip = o.clip === undefined ? restClip(sprite) : o.clip
  const rect = frameOf(sprite, clip, o.dir ?? "down", o.now, o.progress)
  const k = scaleOf(pack) * (o.scale ?? 1)
  const w = rect.w * k
  const h = rect.h * k
  const flipped = o.flip === true ? { ...rect, flip: !rect.flip } : rect
  const [ax, ay] = anchorOf(sprite, flipped)
  const x = o.cx - ax * k
  const y = o.bottom - ay * k
  // The top of what is drawn, for a bar over the head: the sprite's bounds when it knows them.
  const top = y + (sprite.bounds?.[1] ?? 0) * k
  return drawRect(ctx, pack, flipped, x, y, w, h, k < 1) ? top : null
}

/** A picture of the public Tiny Swords pack comes from the Free Pack when that has it (see art.ts). */
const placedLook = (ref: string): Resolved | null => {
  const parsed = parseAssetRef(ref)
  if (parsed?.pack !== ART_PACK) return spriteOf(ref)
  return art(parsed.id) ?? spriteOf(ref)
}

/** A sprite looks this way unless it says otherwise: tiles and animated ground lie flat, the rest stands up. */
export const layerOf = (placed: PlacedSprite, found: Resolved | null): "ground" | "object" => {
  if (placed.layer !== undefined) return placed.layer
  if (placed.tiles !== undefined) return "ground"
  const category = found?.sprite.category
  return category === "tileset" || category === "terrain" ? "ground" : "object"
}

/** Whether the placed sprite plays an animation of more than one frame: then it is drawn every animation frame. */
export const isAnimated = (placed: PlacedSprite, found: Resolved): boolean => {
  if (placed.tiles !== undefined || placed.frame !== undefined) return false
  const clip = placed.clip ?? restClip(found.sprite)
  const frames = clip === null ? undefined : found.sprite.clips?.[clip]?.frames
  if (frames === undefined) return false
  return Array.isArray(frames) ? frames.length > 1 : Object.values(frames).some((f) => (f?.length ?? 0) > 1)
}

/** The size of one cell of a tileset, in its pixels. */
const tileSize = (found: Resolved): readonly [number, number] => found.sprite.frame ?? [found.pack.cell, found.pack.cell]

/** A placed sprite. Tiles lie from the cell's top-left corner; anything else stands on the cell. */
export const drawPlaced = (ctx: Ctx, placed: PlacedSprite, now: number) => {
  const found = placed.tiles === undefined ? placedLook(placed.asset) : spriteOf(placed.asset)
  if (found === null) return
  if (placed.tiles !== undefined) {
    const [col, row, w, h] = placed.tiles
    const [tw, th] = tileSize(found)
    const rect: FrameRect = { file: found.sprite.file, sx: col * tw, sy: row * th, w: w * tw, h: h * th, flip: placed.flip === true }
    drawRect(ctx, found.pack, rect, placed.x * CELL, placed.y * CELL, w * CELL, h * CELL)
    return
  }
  if (placed.frame !== undefined) {
    // One still frame, as a stage of a crop: it stands on the cell like any figure.
    const rect = frameRect(found.sprite, placed.frame, undefined, placed.flip === true)
    const k = scaleOf(found.pack)
    const [ax, ay] = anchorOf(found.sprite, rect)
    drawRect(ctx, found.pack, rect, (placed.x + 0.5) * CELL - ax * k, (placed.y + 1) * CELL - ay * k, rect.w * k, rect.h * k, k < 1)
    return
  }
  drawFigure(ctx, found, {
    cx: (placed.x + 0.5) * CELL,
    bottom: (placed.y + 1) * CELL,
    clip: placed.clip,
    dir: placed.dir ?? "down",
    now,
    flip: placed.flip === true
  })
}

/**
 * Tile `tile` of a tileset sprite (numbered from 1, as in `TileLayer`) with its top-left corner at cell `x`, `y`.
 * False until the pack and its picture have loaded.
 */
export const drawTile = (ctx: Ctx, tileset: Resolved, tile: number, x: number, y: number): boolean => {
  const [tw, th] = tileSize(tileset)
  const columns = Math.max(1, Math.floor(tileset.sprite.size[0] / tw))
  const index = tile - 1
  const rect: FrameRect = { file: tileset.sprite.file, sx: (index % columns) * tw, sy: Math.floor(index / columns) * th, w: tw, h: th, flip: false }
  return drawRect(ctx, tileset.pack, rect, x * CELL, y * CELL, CELL, CELL)
}

/** The cells a placed sprite covers on the field, so no bush or tree grows under it. */
export const placedCells = (placed: PlacedSprite): ReadonlyArray<string> => {
  const [, , w, h] = placed.tiles ?? [0, 0, 1, 1]
  const cells: Array<string> = []
  for (let y = Math.floor(placed.y); y < Math.ceil(placed.y + h); y++) {
    for (let x = Math.floor(placed.x); x < Math.ceil(placed.x + w); x++) cells.push(cellKey(x, y))
  }
  return cells
}

/** Where the bottom edge of a placed sprite is, to draw what stands lower later. */
export const placedDepth = (placed: PlacedSprite): number => placed.y + (placed.tiles?.[3] ?? 1) - 1
