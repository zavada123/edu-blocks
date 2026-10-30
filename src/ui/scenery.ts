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
const MIN_MARGIN = 2
const TREE_CHANCE = 3
const MEADOW_TREE_CHANCE = 5
const PATH_DECOR_CHANCE = 4
/** Out of 10 meadow cells: 2 get a bush or a stone, 3 a flower or grass, the rest stay plain. */
const MEADOW_OBSTACLES = 2
const MEADOW_DECOR = 5

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
}

export const buildScenery = (
  world: Pick<World, "width" | "height" | "walls" | "finish">,
  { reserved = new Set(), bareWalls = false }: SceneryOptions = {}
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

  const taken = new Set<string>(reserved)
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
  return { view, trees, obstacles, decor }
}
