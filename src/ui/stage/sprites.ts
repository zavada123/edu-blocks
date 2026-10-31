import { type AssetPack, frameAt, type FrameRect, iconFrame, restClip, type SpriteAsset } from "../../core/assets.ts"
import type { PlacedSprite } from "../../core/level.ts"
import { cellKey, type Direction } from "../../core/world.ts"
import { image } from "./images.ts"
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

const drawRect = (ctx: Ctx, pack: AssetPack, rect: FrameRect, x: number, y: number, w: number, h: number): boolean => {
  const img = image(packFile(pack.id, rect.file))
  if (img === null) return false
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

/** The frame of a clip at `now`, or the sprite's icon when it has no such clip. */
const frameOf = (sprite: SpriteAsset, clip: string | null, dir: Direction, now: number): FrameRect => {
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
}

/** A figure standing at (`cx`, `bottom`). Returns the top edge it was drawn to, or null when not drawn yet. */
export const drawFigure = (ctx: Ctx, found: Resolved, o: FigureOptions): number | null => {
  const { pack, sprite } = found
  const clip = o.clip === undefined ? restClip(sprite) : o.clip
  const rect = frameOf(sprite, clip, o.dir ?? "down", o.now)
  const k = scaleOf(pack) * (o.scale ?? 1)
  const w = rect.w * k
  const h = rect.h * k
  const flipped = o.flip === true ? { ...rect, flip: !rect.flip } : rect
  return drawRect(ctx, pack, flipped, o.cx - w / 2, o.bottom - h, w, h) ? o.bottom - h : null
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
  if (placed.tiles !== undefined) return false
  const clip = placed.clip ?? restClip(found.sprite)
  const frames = clip === null ? undefined : found.sprite.clips?.[clip]?.frames
  if (frames === undefined) return false
  return Array.isArray(frames) ? frames.length > 1 : Object.values(frames).some((f) => (f?.length ?? 0) > 1)
}

/** The size of one cell of a tileset, in its pixels. */
const tileSize = (found: Resolved): readonly [number, number] => found.sprite.frame ?? [found.pack.cell, found.pack.cell]

/** A placed sprite. Tiles lie from the cell's top-left corner; anything else stands on the cell. */
export const drawPlaced = (ctx: Ctx, placed: PlacedSprite, now: number) => {
  const found = spriteOf(placed.asset)
  if (found === null) return
  if (placed.tiles !== undefined) {
    const [col, row, w, h] = placed.tiles
    const [tw, th] = tileSize(found)
    const rect: FrameRect = { file: found.sprite.file, sx: col * tw, sy: row * th, w: w * tw, h: h * th, flip: placed.flip === true }
    drawRect(ctx, found.pack, rect, placed.x * CELL, placed.y * CELL, w * CELL, h * CELL)
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
