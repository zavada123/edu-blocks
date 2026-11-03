import type { PlacedSprite, TileLayer, TileMap } from "./level.ts"
import { grassOver, groundTileOf, SAND_DETAIL, TINY_SWORDS_GROUND, TINY_SWORDS_WATER } from "./tiny-swords.ts"

/**
 * How a day of the estate looks: a Tiny Swords farm drawn as a tile map around the ring of paths of `estateDay`.
 * Sand lies under the whole farm and grass over it, with soft edges toward the paths and the pond; the farmhouse
 * stands over the door, the orchard over the top path, the bed under the bottom path and the hen house beside the
 * nests; a meadow with trees lies around. Only looks: the map of the day stays the rules.
 */

/** The pictures of the farm, all from the public Tiny Swords pack. */
const ART = (id: string): string => `tiny-swords:${id}`
export const FARMHOUSE_ART = ART("prop/house-blue")
export const HEN_HOUSE_ART = ART("prop/house-yellow")
/** Timber for the hen house not built yet. */
export const HEN_HOUSE_PLOT_ART = ART("prop/house-construction")
export const ORCHARD_TREE_ART = ART("decor/tree")
/** A scarecrow stands where the bed will be, until the seeds are bought. */
export const BED_PLOT_ART = ART("decor/scarecrow")
/** The hens of the hen house: the pack has sheep. */
export const HEN_ART = ART("animal/sheep")
/** The stages of a carrot in the bed, from just sown (1) to ripe (4): the pack grows pumpkins. */
export const CARROT_STAGES: ReadonlyArray<string> = [ART("decor/grass-small"), ART("decor/grass-large"), ART("decor/pumpkin-small"), ART("decor/pumpkin-large")]
const SHRUBS: ReadonlyArray<string> = [ART("decor/bush-small"), ART("decor/bush-medium"), ART("decor/bush-large"), ART("decor/rock-medium")]
const FLOWERS: ReadonlyArray<string> = [ART("decor/mushroom-small"), ART("decor/grass-small"), ART("decor/mushroom-medium")]

/** Dug ground: a bed or a plot for a tree, a piece of the ground tileset with pebbles. */
export const soilAt = (x: number, y: number): PlacedSprite => ({ asset: TINY_SWORDS_GROUND, x, y, tiles: [(SAND_DETAIL - 1) % 10, Math.floor((SAND_DETAIL - 1) / 10), 1, 1], layer: "ground" })

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
  /** The frame of the carrot of each tree column today, from 1 (just sown) to 4 (ripe). */
  readonly carrotFrames: ReadonlyArray<number>
  /** The size of the map of the biggest estate: the farm is drawn for it, so nothing moves when the yard grows. */
  readonly frame: { readonly width: number; readonly height: number }
  /** How many trees the orchard can have: the places of the trees not bought yet are dug. */
  readonly maxTrees: number
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
  const { rows, trees, right, bottom, carrots, coop, nests, carrotFrames, frame, maxTrees } = layout
  const { width, height } = frame
  const area = areaOf(width, height)
  const size = { width: area.width, height: area.height }
  // The pond in the meadow under the yard; its corners cut.
  const pondX = width - 6
  const pondY = height
  const pondCells = [0, 1, 2, 3, 4]
    .flatMap((i) => [0, 1, 2].map((j) => ({ x: pondX + i, y: pondY + j, corner: (i === 0 || i === 4) && (j === 0 || j === 2) })))
    .filter((c) => !c.corner)
  const pondSet = new Set(pondCells.map(({ x, y }) => `${x},${y}`))
  const pond = new Set(pondCells.flatMap(({ x, y }) => [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => `${x + dx},${y + dy}`))))
  // Cells kept free of meadow things: the yard with its plots, the house, the place of the hen house and the pond.
  const busy = (x: number, y: number) =>
    (x >= -1 && x <= width && y >= -ABOVE && y <= bottom + 1) || (x >= -SIDE && x < 0 && y >= 1 && y <= 6) || pond.has(`${x},${y}`)

  const ring = new Set<string>()
  rows.forEach((row, y) => [...row].forEach((c, x) => c !== "#" && ring.add(`${x},${y}`)))
  const low = (x: number, y: number) => ring.has(`${x},${y}`) || pondSet.has(`${x},${y}`)
  const sand = Array.from({ length: size.width * size.height }, () => groundTileOf("sand", 0))
  const tileLayers: ReadonlyArray<TileLayer> = [
    { name: "ground", kind: "ground", data: sand },
    { name: "grass", kind: "ground", data: grassOver(low, area) }
  ]

  const sprites: Array<PlacedSprite> = pondCells.map(({ x, y }) => ({ asset: TINY_SWORDS_WATER, x, y, tiles: [0, 0, 1, 1], layer: "ground" }))
  // The farmhouse over the door, the hen house beside the nests.
  sprites.push({ asset: FARMHOUSE_ART, x: 1, y: 0 })
  if (coop) sprites.push({ asset: HEN_HOUSE_ART, x: -2, y: 4 })
  else sprites.push({ asset: HEN_HOUSE_PLOT_ART, x: -2, y: 4 })
  for (let i = 0; i < trees; i++) sprites.push({ asset: ORCHARD_TREE_ART, x: 3 + i, y: 0, frame: 0 })

  // The far end of the yard, snowed in or overgrown today: shrubs where the path does not go.
  const yardEnd = trees + 6
  for (let y = 1; y <= bottom; y++) for (let x = right + 1; x < yardEnd; x++) sprites.push({ asset: SHRUBS[(x + y * 3) % SHRUBS.length] ?? "", x, y })

  // The bed grows a stage a day; the ripe ones lie on the path for the hero.
  if (carrots) {
    for (let i = 0; i < trees; i++) {
      const x = 3 + i
      const y = bottom + 1
      sprites.push(soilAt(x, y))
      sprites.push({ asset: CARROT_STAGES[(carrotFrames[i] ?? 1) - 1] ?? CARROT_STAGES[0] ?? "", x, y })
    }
  } else {
    sprites.push(soilAt(3, bottom + 1))
    sprites.push({ asset: BED_PLOT_ART, x: 4, y: bottom + 1 })
  }
  if (coop) {
    for (let n = 0; n < nests; n += 2) sprites.push({ asset: HEN_ART, x: 0, y: 2 + n, frame: n % 4, ...(n % 4 === 0 ? {} : { flip: true }) })
  }
  // The plots of the trees the shop sells: dug places in the orchard row.
  for (let x = 3 + trees; x < 3 + maxTrees; x++) sprites.push(soilAt(x, 0))

  // The meadow: trees along the edge of the field, shrubs and flowers between.
  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      if (busy(x, y)) continue
      const edge = x === area.x || y === area.y || x === area.x + area.width - 1 || y === area.y + area.height - 1
      const r = hashOf(x, y, 2)
      if (edge && r < 0.45) sprites.push({ asset: ORCHARD_TREE_ART, x, y, frame: 0 })
      else if (!edge && r < 0.05) sprites.push({ asset: SHRUBS[Math.floor(r * 1000) % SHRUBS.length] ?? "", x, y })
      else if (!edge && r < 0.11) sprites.push({ asset: FLOWERS[Math.floor(r * 1000) % FLOWERS.length] ?? "", x, y })
    }
  }
  sprites.push({ asset: HEN_ART, x: pondX - 1, y: pondY + 1, frame: 0 })

  return { tilemap: { tileset: TINY_SWORDS_GROUND, x: area.x, y: area.y, ...size, layers: tileLayers }, sprites }
}
