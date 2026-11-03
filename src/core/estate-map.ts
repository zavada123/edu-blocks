import type { PlacedSprite, TileLayer, TileMap } from "./level.ts"
import {
  emptyLayer,
  FARMHOUSE,
  FLOWERS,
  GRASS,
  GRASS_VARIANTS,
  HEN_HOUSE,
  SHRUBS,
  SUNNYSIDE_TILESET,
  terrainTiles
} from "./sunnyside.ts"

/**
 * How a day of the estate looks: a Sunnyside farm drawn as a tile map around the ring of paths of `estateDay`. The
 * paths get grass edges, the farmhouse stands over the door, the orchard over the top path, the carrot bed under
 * the bottom path and the hen house beside the nests; a meadow with trees and a pond lies around. Only looks: the
 * map of the day stays the rules.
 */

export interface EstateLayout {
  /** The map of the day: `#` walls, the ring of paths and its `S`, `F` and `c` cells. */
  readonly rows: ReadonlyArray<string>
  readonly trees: number
  /** The column of the far end of the yard on this day. */
  readonly right: number
  /** The row of the bottom path. */
  readonly bottom: number
  readonly carrots: boolean
  readonly coop: boolean
  /** The nests: rows of the left path from 2. */
  readonly nests: number
  /** Which carrots are ripe today, one per tree column. */
  readonly ready: ReadonlyArray<boolean>
  readonly day: number
}

/** Cells of meadow around the yard; the hen house needs four on the left. */
const SIDE = 4
/** Rows above the yard: the farmhouse is four tiles tall. */
const ABOVE = 4
const BELOW = 3

/** The same numbers for the same estate on any computer: the meadow stays where it is from day to day. */
const hashOf = (x: number, y: number, salt: number): number => {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 2147483647, 1274126177) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1103515245) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

interface Area {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The cells the field shows: the yard with meadow around, square like the fields of the course. */
const areaOf = (width: number, height: number): Area => {
  const side = Math.max(width + 2 * SIDE, height + ABOVE + BELOW)
  const extra = side - (height + ABOVE + BELOW)
  return { x: -Math.floor((side - width) / 2), y: -ABOVE - Math.floor(extra / 2), width: side, height: side }
}

/** The look of a day: its tile map and the pictures that stand on it. */
export const estateLook = (layout: EstateLayout): { readonly tilemap: TileMap; readonly sprites: ReadonlyArray<PlacedSprite> } => {
  const { rows, trees, right, bottom, carrots, coop, nests, ready, day } = layout
  const width = rows[0]?.length ?? 0
  const height = rows.length
  const area = areaOf(width, height)
  const size = { width: area.width, height: area.height }
  const inside = (x: number, y: number) => x >= area.x && y >= area.y && x < area.x + area.width && y < area.y + area.height
  const index = (x: number, y: number) => (y - area.y) * area.width + (x - area.x)
  const layers = {
    ground: emptyLayer(size),
    flowers: emptyLayer(size),
    objects: emptyLayer(size),
    above: emptyLayer(size)
  }
  const put = (layer: Array<number>, x: number, y: number, tile: number) => {
    if (inside(x, y)) layer[index(x, y)] = tile
  }
  // The pond in the meadow under the yard; its corners cut, so the brush bevels them.
  const pondX = width - 6
  const pondY = height
  const pondCells = [0, 1, 2, 3, 4]
    .flatMap((i) => [0, 1, 2].map((j) => ({ x: pondX + i, y: pondY + j, corner: (i === 0 || i === 4) && (j === 0 || j === 2) })))
    .filter((c) => !c.corner)
  const pond = new Set(pondCells.flatMap(({ x, y }) => [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => `${x + dx},${y + dy}`))))
  // Cells kept free of meadow things: the yard, the house, the hen house and the pond.
  const busy = (x: number, y: number) =>
    (x >= -1 && x <= width && y >= -ABOVE && y <= height) || (coop && x >= -SIDE && x < 0 && y >= 1 && y <= 6) || pond.has(`${x},${y}`)

  // Grass, a little different here and there, and the pond in it.
  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      const r = hashOf(x, y, 1)
      put(layers.ground, x, y, r < 0.82 ? GRASS : (GRASS_VARIANTS[Math.floor(r * 97) % GRASS_VARIANTS.length] ?? GRASS))
    }
  }
  terrainTiles("water", pondCells, area).forEach((t, i) => t > 0 && (layers.ground[i] = t))

  const ring: Array<{ x: number; y: number }> = []
  rows.forEach((row, y) => [...row].forEach((c, x) => c !== "#" && ring.push({ x, y })))
  const bed = carrots ? Array.from({ length: trees }, (_, i) => ({ x: 3 + i, y: bottom + 1 })) : []
  const soil = terrainTiles("soil", bed, area)
  const path = terrainTiles("path", ring, area)
  // A yard one cell across has paths on both sides, and the corner brush would fill it: grass goes back over it.
  const yard = emptyLayer(size)
  if (bottom - 1 < 2 + 1) for (let x = 2; x < right; x++) for (let y = 2; y < bottom; y++) yard[index(x, y)] = GRASS

  // The farmhouse over the door, the hen house beside the nests: their roofs over the hero.
  const building = (at: { readonly col: number; readonly row: number }, x: number, y: number) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) put(j < 2 ? layers.above : layers.objects, x + i, y + j, (at.row + j) * 64 + at.col + i + 1)
  }
  building(FARMHOUSE, 0, -3)
  if (coop) building(HEN_HOUSE, -SIDE + 1, 2)

  // The far end of the yard, snowed in or overgrown today: shrubs where the path does not go.
  for (let y = 1; y <= bottom; y++) for (let x = right + 1; x < width - 1; x++) put(layers.objects, x, y, SHRUBS[(x + y * 3) % SHRUBS.length] ?? SHRUBS[0] ?? 0)

  const sprites: Array<PlacedSprite> = []
  for (let i = 0; i < trees; i++) sprites.push({ asset: "sunnyside:decor/tree-01", x: 3 + i, y: 0, frame: 0 })
  sprites.push({ asset: "sunnyside:effect/chimneysmoke-01", x: 1, y: -3 })
  // The carrot bed grows a stage a day; the ripe ones lie on the path for the hero.
  bed.forEach(({ x, y }, i) => {
    sprites.push({ asset: "sunnyside:crop/soil", x, y, frame: 0, layer: "ground" })
    sprites.push({ asset: "sunnyside:crop/carrot", x, y, frame: ready[i] === true ? 4 : 1 + ((day + i) % 3) })
  })
  if (coop) {
    for (let n = 0; n < nests; n += 2) sprites.push({ asset: "sunnyside:animal/chicken-01", x: 0, y: 2 + n, frame: n % 4, ...(n % 4 === 0 ? {} : { flip: true }) })
  }

  // The meadow: trees along the edge of the field, shrubs and flowers between.
  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      if (busy(x, y)) continue
      const edge = x === area.x || y === area.y || x === area.x + area.width - 1 || y === area.y + area.height - 1
      const r = hashOf(x, y, 2)
      if (edge && r < 0.45) sprites.push({ asset: "sunnyside:decor/tree-02", x, y, frame: 0 })
      else if (!edge && r < 0.05) put(layers.objects, x, y, SHRUBS[Math.floor(r * 1000) % SHRUBS.length] ?? 0)
      else if (!edge && r < 0.11) put(layers.flowers, x, y, FLOWERS[Math.floor(r * 1000) % FLOWERS.length] ?? 0)
    }
  }
  sprites.push({ asset: "sunnyside:animal/duck-01", x: pondX + 1, y: pondY + 1, frame: 0 })

  const tileLayers: ReadonlyArray<TileLayer> = [
    { name: "ground", kind: "ground", data: layers.ground },
    { name: "flowers", kind: "ground", data: layers.flowers },
    { name: "soil", kind: "ground", data: soil },
    { name: "path", kind: "ground", data: path },
    { name: "yard", kind: "ground", data: yard },
    { name: "objects", kind: "objects", data: layers.objects },
    { name: "above", kind: "above", data: layers.above }
  ]
  return { tilemap: { tileset: SUNNYSIDE_TILESET, x: area.x, y: area.y, ...size, layers: tileLayers }, sprites }
}
