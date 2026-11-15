import { cellKey, type World } from "../core/world.ts"

/**
 * Where the field puts trees, bushes and flowers. Each cell picks its look from a hash of its place,
 * so a level always looks the same and the scenery never moves while the hero walks.
 *
 * Around the level lies a meadow about as wide as the level itself, so the map has twice the cells.
 * The meadow is only scenery: the hero never gets there, since every level is walled in.
 */

export type Obstacle = "bush" | "bushRound" | "fern" | "rock" | "stump" | "sunflower"
export type Decor = "petals" | "flower" | "tuft" | "clover" | "sprout"

type At = { readonly x: number; readonly y: number }

export interface Scenery {
  /** The cells to draw, in level coordinates: the meadow cells have negative or too big x and y. */
  readonly view: At & { readonly width: number; readonly height: number }
  /** Top-left cells of big trees; a tree takes 2×2 blocked cells. */
  readonly trees: ReadonlyArray<At>
  /** One per wall cell without a tree, and some in the meadow. */
  readonly obstacles: ReadonlyArray<At & { readonly kind: Obstacle }>
  /** Small things that do not block the way. On the path only petals: a flower there would look like a wall. */
  readonly decor: ReadonlyArray<At & { readonly kind: Decor }>
  /** Cells of water: ponds and the sea, with nothing growing there (see water.ts). */
  readonly water: ReadonlySet<string>
  /**
   * Raised ground in the meadow, as the plateaus of Tiny Swords: the grass on top, by keys. Under the bottom row of
   * each plateau a cliff wall stands in the cell below (`cliffs`).
   */
  readonly plateau: ReadonlySet<string>
  readonly cliffs: ReadonlySet<string>
  /** Where sheep graze in the meadow: each walks between its cell and the cell to the right of it. */
  readonly sheep: ReadonlyArray<At>
}

// Bushes come up most often, so a wall still reads as a hedge.
const OBSTACLES: ReadonlyArray<Obstacle> = [
  "bush",
  "bush",
  "bush",
  "bushRound",
  "bushRound",
  "fern",
  "rock",
  "stump",
  "sunflower"
]
const MEADOW: ReadonlyArray<Decor> = ["flower", "tuft", "tuft", "clover", "sprout", "petals"]
/** Meadow cells around the longest side of the level, at least. */
const MIN_MARGIN = 3
/** Plateau sizes to try in the meadow, biggest first: width and rows of grass on top. */
const PLATEAUS: ReadonlyArray<readonly [number, number]> = [
  [5, 2],
  [4, 2],
  [3, 2],
  [4, 1],
  [3, 1]
]
const MAX_PLATEAUS = 3
const TREE_CHANCE = 3
const MEADOW_TREE_CHANCE = 5
const PATH_DECOR_CHANCE = 4
/** Out of 10 meadow cells: 2 get a bush or a stone, 3 a flower or grass, the rest stay plain. */
const MEADOW_OBSTACLES = 2
const MEADOW_DECOR = 5
/** Sheep in the meadow: one for this many meadow cells, at most `MAX_SHEEP`. */
const CELLS_PER_SHEEP = 60
const MAX_SHEEP = 4

/** A small integer hash of a cell: the same cell always gets the same number. */
export const cellHash = (x: number, y: number, salt = 0): number => {
  let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(salt + 1, 83492791)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

const pick = <T>(list: ReadonlyArray<T>, hash: number): T => list[hash % list.length] as T

export interface SceneryOptions {
  /** Cells under props (a house, a woodshed): nothing else grows there. */
  readonly reserved?: ReadonlySet<string>
  /** Walls of the level stay bare, as the water under a bridge. The meadow still gets its scenery. */
  readonly bareWalls?: boolean
  /** Cells of water: no tree, bush or flower there. */
  readonly water?: ReadonlySet<string>
}

export const buildScenery = (
  world: Pick<World, "width" | "height" | "walls" | "finish">,
  { reserved = new Set(), bareWalls = false, water = new Set() }: SceneryOptions = {}
): Scenery => {
  // A square view: every level shows on a field of the same shape, the level in its middle.
  const longest = Math.max(world.width, world.height)
  const side = longest + 2 * Math.max(MIN_MARGIN, Math.ceil(longest / 6))
  const view = {
    x: -Math.floor((side - world.width) / 2),
    y: -Math.floor((side - world.height) / 2),
    width: side,
    height: side
  }
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < world.width && y < world.height
  const blocked = (x: number, y: number) => !inside(x, y) || (!bareWalls && world.walls.has(cellKey(x, y)))

  // Plateaus first: a cliff needs room in the meadow, away from the level and the water, with a cell between them.
  const plateau = new Set<string>()
  const cliffs = new Set<string>()
  const near = (x: number, y: number, keys: ReadonlySet<string>) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (keys.has(cellKey(x + dx, y + dy))) return true
    return false
  }
  const roomy = (x: number, y: number) =>
    x >= view.x && y >= view.y && x < view.x + view.width && y < view.y + view.height &&
    !(x >= -1 && y >= -1 && x <= world.width && y <= world.height) &&
    !near(x, y, water) && !near(x, y, plateau) && !near(x, y, cliffs) && !reserved.has(cellKey(x, y))
  const spots: Array<{ x: number; y: number; w: number; h: number; hash: number }> = []
  for (const [w, h] of PLATEAUS) {
    for (let y = view.y; y + h < view.y + view.height; y++) {
      for (let x = view.x; x + w <= view.x + view.width; x++) spots.push({ x, y, w, h, hash: cellHash(x, y, 16 + w * 3 + h) })
    }
  }
  // Bigger plateaus first; among the same size, the hash picks.
  spots.sort((a, b) => b.w * b.h - a.w * a.h || a.hash - b.hash)
  let raised = 0
  for (const spot of spots) {
    if (raised >= MAX_PLATEAUS) break
    const cells: Array<At> = []
    for (let j = 0; j <= spot.h; j++) for (let i = 0; i < spot.w; i++) cells.push({ x: spot.x + i, y: spot.y + j })
    if (!cells.every((c) => roomy(c.x, c.y))) continue
    for (const c of cells) (c.y === spot.y + spot.h ? cliffs : plateau).add(cellKey(c.x, c.y))
    raised++
  }

  // No tree on a plateau: its crown would hang over the cliff. Bushes and flowers grow there.
  const taken = new Set<string>([...reserved, ...water, ...cliffs, ...plateau])
  const trees: Array<At> = []
  for (let y = view.y; y < view.y + view.height - 1; y++) {
    for (let x = view.x; x < view.x + view.width - 1; x++) {
      const block: ReadonlyArray<At> = [
        { x, y },
        { x: x + 1, y },
        { x, y: y + 1 },
        { x: x + 1, y: y + 1 }
      ]
      if (!block.every((c) => blocked(c.x, c.y) && !taken.has(cellKey(c.x, c.y)))) continue
      const chance = block.some((c) => inside(c.x, c.y)) ? TREE_CHANCE : MEADOW_TREE_CHANCE
      if (cellHash(x, y, 1) % chance !== 0) continue
      trees.push({ x, y })
      for (const c of block) taken.add(cellKey(c.x, c.y))
    }
  }

  for (const key of plateau) taken.delete(key)
  const obstacles: Array<At & { kind: Obstacle }> = []
  const decor: Array<At & { kind: Decor }> = []
  for (let y = view.y; y < view.y + view.height; y++) {
    for (let x = view.x; x < view.x + view.width; x++) {
      if (taken.has(cellKey(x, y))) continue
      if (!inside(x, y)) {
        const roll = cellHash(x, y, 5) % 10
        if (roll < MEADOW_OBSTACLES) obstacles.push({ x, y, kind: pick(OBSTACLES, cellHash(x, y, 2)) })
        else if (roll < MEADOW_DECOR) decor.push({ x, y, kind: pick(MEADOW, cellHash(x, y, 4)) })
      } else if (world.walls.has(cellKey(x, y))) {
        if (!bareWalls) obstacles.push({ x, y, kind: pick(OBSTACLES, cellHash(x, y, 2)) })
      } else {
        const isFinish = world.finish !== null && world.finish.x === x && world.finish.y === y
        if (!isFinish && cellHash(x, y, 3) % PATH_DECOR_CHANCE === 0) decor.push({ x, y, kind: "petals" })
      }
    }
  }
  // Sheep graze where nothing grows, with room to step to the right, and not right next to each other.
  const blockedByThings = new Set([...taken, ...plateau, ...obstacles.map((o) => cellKey(o.x, o.y))])
  const free = (x: number, y: number) =>
    !inside(x, y) && x >= view.x && x < view.x + view.width && y >= view.y && y < view.y + view.height && !blockedByThings.has(cellKey(x, y))
  const pastures: Array<At> = []
  for (let y = view.y; y < view.y + view.height; y++) {
    for (let x = view.x; x < view.x + view.width - 1; x++) if (free(x, y) && free(x + 1, y)) pastures.push({ x, y })
  }
  const meadowCells = view.width * view.height - world.width * world.height
  const count = Math.min(MAX_SHEEP, Math.floor(meadowCells / CELLS_PER_SHEEP))
  const sheep: Array<At> = []
  for (const p of [...pastures].sort((a, b) => cellHash(a.x, a.y, 14) - cellHash(b.x, b.y, 14))) {
    if (sheep.length >= count) break
    if (sheep.some((o) => Math.abs(o.x - p.x) < 4 && Math.abs(o.y - p.y) < 3)) continue
    sheep.push(p)
  }
  return { view, trees, obstacles, decor, water, plateau, cliffs, sheep }
}
