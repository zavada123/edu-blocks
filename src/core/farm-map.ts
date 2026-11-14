import { FARMHOUSE_ART, ORCHARD_TREE_ART, soilAt } from "./estate-map.ts"
import type { PlacedSprite, TileLayer, TileMap } from "./level.ts"
import { grassOver, groundTileOf, TINY_SWORDS_GROUND } from "./tiny-swords.ts"

/**
 * How a working day of the farm looks, all from the Tiny Swords pack: sand under the ring of paths and grass over the
 * rest, the farmhouse with the barn at the top-left corner, a fir over each cell of the forest path, dug beds on the
 * bottom path, the goblins' hut beyond the far corner and the watch tower over their path once it is built. A narrow
 * meadow lies around, so the farm fills the field. Only looks: the map of the day stays the rules.
 */

const ART = (id: string): string => `tiny-swords:${id}`
export const GOBLIN_HUT_ART = ART("prop/goblin-house")
export const WATCH_TOWER_ART = ART("prop/tower-blue")
const SHRUBS: ReadonlyArray<string> = [ART("decor/bush-small"), ART("decor/bush-medium"), ART("decor/rock-small"), ART("decor/grass-large")]

export interface FarmLayout {
  /** The map of the day: `#` walls and the ring of paths. */
  readonly rows: ReadonlyArray<string>
  /** The first column of the forest and the beds. */
  readonly first: number
  readonly trees: number
  /** The column of the right side of the ring, and the rows of the top and bottom paths. */
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly beds: boolean
  /** The goblins come this day: their hut stands beyond the far corner. */
  readonly goblins: boolean
  /** The watch tower, when it is built: the wall cell it stands on. */
  readonly tower: { readonly x: number; readonly y: number } | null
}

/** Cells of meadow around the ring. */
const MARGIN = 1

/** The same numbers on any computer: the meadow stays where it is from day to day. */
const hashOf = (x: number, y: number): number => {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1103515245) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** The cells the field shows: the map with a meadow around, square like the fields of the course. */
const areaOf = (width: number, height: number) => {
  const side = Math.max(width, height) + 2 * MARGIN
  return { x: -Math.floor((side - width) / 2), y: -Math.floor((side - height) / 2), width: side, height: side }
}

export const farmLook = (layout: FarmLayout): { readonly tilemap: TileMap; readonly sprites: ReadonlyArray<PlacedSprite> } => {
  const { rows, first, trees, right, top, bottom, beds, goblins, tower } = layout
  const width = Math.max(...rows.map((r) => r.length))
  const area = areaOf(width, rows.length)
  const ring = new Set<string>()
  rows.forEach((row, y) => [...row].forEach((c, x) => c !== "#" && ring.add(`${x},${y}`)))
  const low = (x: number, y: number) => ring.has(`${x},${y}`)
  const layers: ReadonlyArray<TileLayer> = [
    { name: "ground", kind: "ground", data: Array.from({ length: area.width * area.height }, () => groundTileOf("sand", 0)) },
    { name: "grass", kind: "ground", data: grassOver(low, area) }
  ]

  const sprites: Array<PlacedSprite> = []
  // The farmhouse over the barn door, a fir over each cell of the forest path.
  sprites.push({ asset: FARMHOUSE_ART, x: 1, y: top - 1 })
  for (let i = 0; i < trees; i++) sprites.push({ asset: ORCHARD_TREE_ART, x: first + i, y: top - 1, frame: 0 })
  // Dug ground under each bed of the bottom path: a pumpkin lies or grows there.
  if (beds) for (let i = 0; i < trees; i++) sprites.push(soilAt(first + i, bottom))
  if (tower !== null) sprites.push({ asset: WATCH_TOWER_ART, x: tower.x, y: tower.y })
  if (goblins) sprites.push({ asset: GOBLIN_HUT_ART, x: right + 1, y: bottom + 1 })

  // Cells kept free: the ring and what stands on it, the house, the tower and the hut.
  const busy = (x: number, y: number) =>
    (x >= 0 && x <= right + 1 && y >= top - 1 && y <= bottom + 1) || (tower !== null && Math.abs(x - tower.x) <= 1 && y >= tower.y - 2 && y <= tower.y)
  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      if (busy(x, y)) continue
      const edge = x === area.x || y === area.y || x === area.x + area.width - 1 || y === area.y + area.height - 1
      const r = hashOf(x, y)
      if (edge && r < 0.5) sprites.push({ asset: ORCHARD_TREE_ART, x, y, frame: 0 })
      else if (!edge && r < 0.12) sprites.push({ asset: SHRUBS[Math.floor(r * 1000) % SHRUBS.length] ?? "", x, y })
    }
  }
  return { tilemap: { tileset: TINY_SWORDS_GROUND, x: area.x, y: area.y, width: area.width, height: area.height, layers }, sprites }
}
