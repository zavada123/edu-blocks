import type { TileInfo } from "./assets.ts"
import type { Level, TerrainPaint } from "./level.ts"
import type { PlacedTile } from "./tilemap.ts"

/**
 * Autotiles, as LDtk and Tiled paint them: a level says which ground lies on which cell (`Scene.terrain`), and the
 * tile of each cell is picked from its neighbours, so a path gets its edges and its corners by itself. Pure: the field
 * draws the tiles, the editor paints the letters, the tests read both.
 */

/** Sides where a cell's ground ends: north 1, east 2, south 4, west 8, as `TileInfo.mask`. */
const N = 1
const E = 2
const S = 4
const W = 8
/** Inner corners, where both sides go on and the diagonal does not: NE 1, SE 2, SW 4, NW 8, as `TileInfo.cornerMask`. */
const NE = 1
const SE = 2
const SW = 4
const NW = 8

/** One cell in this many shows a variant of a whole tile (grass with tufts) in place of the plain one. */
const VARIANT_EVERY = 4

/** The letter of `TerrainPaint.rows` that leaves a cell to the base. */
export const EMPTY = "."

export interface CellShape {
  readonly mask: number
  readonly corners: number
}

/** A ground of a described tileset: `"ninja-adventure:tileset/floor#path"` is the sprite and the terrain in it. */
export const parseTerrainRef = (ref: string): { readonly sprite: string; readonly terrain: string } | null => {
  const at = ref.lastIndexOf("#")
  if (at <= 0 || at === ref.length - 1) return null
  return { sprite: ref.slice(0, at), terrain: ref.slice(at + 1) }
}

export const terrainRef = (sprite: string, terrain: string): string => `${sprite}#${terrain}`

/** Where a cell's ground ends and which of its inner corners are open, given which cells have the same ground. */
export const shapeAt = (same: (x: number, y: number) => boolean, x: number, y: number): CellShape => {
  const n = same(x, y - 1)
  const e = same(x + 1, y)
  const s = same(x, y + 1)
  const w = same(x - 1, y)
  const mask = (n ? 0 : N) | (e ? 0 : E) | (s ? 0 : S) | (w ? 0 : W)
  const corners =
    (n && e && !same(x + 1, y - 1) ? NE : 0) |
    (s && e && !same(x + 1, y + 1) ? SE : 0) |
    (s && w && !same(x - 1, y + 1) ? SW : 0) |
    (n && w && !same(x - 1, y - 1) ? NW : 0)
  return { mask, corners }
}

const bitCount = (n: number): number => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1) + ((n >> 3) & 1)

/** A stable number for a cell, so variants do not change from one drawing to the next. */
const hashOf = (x: number, y: number): number => {
  let h = Math.imul(x + 7, 73856093) ^ Math.imul(y + 13, 19349663)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

/** The whole tile of a cell: mostly the first (plain) one, now and then a variant. */
const variantOf = (tiles: ReadonlyArray<number>, x: number, y: number): number | null => {
  if (tiles.length <= 1) return tiles[0] ?? null
  const h = hashOf(x, y)
  return h % VARIANT_EVERY === 0 ? (tiles[1 + ((h >>> 8) % (tiles.length - 1))] ?? null) : (tiles[0] ?? null)
}

/**
 * The tile (numbered from 1) of `terrain` for a cell of this shape, or null when the tileset has nothing near it.
 * Without a tile for every open inner corner, the one with the most of them (and no others) stands in; the edges
 * must match. A whole cell now and then shows a `variant` tile: grass with a tuft.
 */
export const pickTile = (tiles: ReadonlyArray<TileInfo>, terrain: string, shape: CellShape, x = 0, y = 0): number | null => {
  if (shape.mask === 0 && shape.corners === 0) {
    const whole = tiles.filter((t) => t.terrain === terrain && (t.mask ?? 0) === 0 && (t.cornerMask ?? 0) === 0)
    const plain = whole.filter((t) => t.role === "fill").map((t) => t.index)
    if (plain.length > 0) return variantOf([...plain.slice(0, 1), ...whole.filter((t) => t.role === "variant").map((t) => t.index)], x, y)
  }
  const own = tiles.filter((t) => t.terrain === terrain && (t.role === "fill" || t.role === "edge") && (t.mask ?? 0) === shape.mask)
  let best: Array<number> = []
  let bestBits = -1
  for (const t of own) {
    const corners = t.cornerMask ?? 0
    if ((corners & ~shape.corners) !== 0) continue
    const bits = bitCount(corners)
    if (bits > bestBits) {
      best = [t.index]
      bestBits = bits
    } else if (bits === bestBits) best.push(t.index)
  }
  return variantOf(best, x, y)
}

/** The letter of a cell; outside the rows it is empty. */
const letterAt = (paint: TerrainPaint, x: number, y: number): string => paint.rows[y]?.[x] ?? EMPTY

/** The level cell of the first cell of `rows`. */
const originOf = (paint: TerrainPaint): { readonly x: number; readonly y: number } => ({ x: paint.x ?? 0, y: paint.y ?? 0 })

/**
 * The tiles of one ground of a painting, in level coordinates. `tilesOf` gives the described tiles of a tileset by its
 * sprite reference (null while it loads). A cell with no fitting tile is left out.
 */
export const paintTiles = (
  paint: TerrainPaint,
  letter: string,
  tilesOf: (sprite: string) => ReadonlyArray<TileInfo> | null
): ReadonlyArray<PlacedTile> => {
  const ref = paint.kinds[letter]
  const parsed = ref === undefined ? null : parseTerrainRef(ref)
  const tiles = parsed === null ? null : tilesOf(parsed.sprite)
  if (parsed === null || tiles === null) return []
  const { x: ox, y: oy } = originOf(paint)
  const same = (x: number, y: number) => letterAt(paint, x, y) === letter
  const out: Array<PlacedTile> = []
  paint.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== letter) continue
      const tile = pickTile(tiles, parsed.terrain, shapeAt(same, x, y), ox + x, oy + y)
      if (tile !== null) out.push({ x: ox + x, y: oy + y, tile })
    }
  })
  return out
}

/** The whole tiles of the base ground over a rectangle of level cells: grass with a tuft here and there. */
export const baseTiles = (
  ref: string,
  view: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  tilesOf: (sprite: string) => ReadonlyArray<TileInfo> | null
): ReadonlyArray<PlacedTile> => {
  const parsed = parseTerrainRef(ref)
  const tiles = parsed === null ? null : tilesOf(parsed.sprite)
  if (parsed === null || tiles === null) return []
  const out: Array<PlacedTile> = []
  for (let y = view.y; y < view.y + view.height; y++) {
    for (let x = view.x; x < view.x + view.width; x++) {
      const tile = pickTile(tiles, parsed.terrain, { mask: 0, corners: 0 }, x, y)
      if (tile !== null) out.push({ x, y, tile })
    }
  }
  return out
}

/** The grounds of a painting in drawing order: the letters as `kinds` lists them. */
export const paintLetters = (paint: TerrainPaint): ReadonlyArray<string> => Object.keys(paint.kinds).filter((k) => k !== EMPTY)

/** The sprites a painting draws from, for loading their packs. */
export const paintSprites = (paint: TerrainPaint): ReadonlyArray<string> => [
  ...new Set(
    [paint.base, ...Object.values(paint.kinds)].flatMap((ref) => {
      const parsed = ref === undefined ? null : parseTerrainRef(ref)
      return parsed === null ? [] : [parsed.sprite]
    })
  )
]

/** A painting with one cell changed; the rows grow to reach it. Cells left of or above row 0 are not painted. */
export const paintCell = (paint: TerrainPaint, x: number, y: number, letter: string): TerrainPaint => {
  const { x: ox, y: oy } = originOf(paint)
  const cx = x - ox
  const cy = y - oy
  if (cx < 0 || cy < 0 || letter.length !== 1) return paint
  const rows = [...paint.rows]
  while (rows.length <= cy) rows.push("")
  const row = (rows[cy] ?? "").padEnd(cx + 1, EMPTY)
  if (row[cx] === letter) return paint
  rows[cy] = (row.slice(0, cx) + letter + row.slice(cx + 1)).replace(/\.+$/, "")
  while (rows.length > 0 && rows[rows.length - 1] === "") rows.pop()
  return { ...paint, rows }
}

/** What is wrong with the painted ground of a level, for `checkLevel`. Empty for a level without one. */
export const terrainIssues = (level: Level): ReadonlyArray<{ readonly level: "error" | "warning"; readonly text: string }> => {
  const paint = level.scene?.terrain
  if (paint === undefined) return []
  const issues: Array<{ level: "error" | "warning"; text: string }> = []
  for (const [letter, ref] of Object.entries(paint.kinds)) {
    if (letter.length !== 1 || letter === EMPTY) issues.push({ level: "error", text: `Земля: «${letter}» не може позначати ґрунт, потрібна одна літера, не «.».` })
    if (parseTerrainRef(ref) === null) issues.push({ level: "error", text: `Земля: «${ref}» не схоже на ґрунт тайлсету (пак:спрайт#ґрунт).` })
  }
  if (paint.base !== undefined && parseTerrainRef(paint.base) === null) issues.push({ level: "error", text: `Земля: основа «${paint.base}» не схожа на ґрунт тайлсету.` })
  const unknown = new Set(paint.rows.join("").split("").filter((c) => c !== EMPTY && paint.kinds[c] === undefined))
  if (unknown.size > 0) issues.push({ level: "warning", text: `Земля: літери ${[...unknown].map((c) => `«${c}»`).join(", ")} нічого не малюють.` })
  return issues
}
