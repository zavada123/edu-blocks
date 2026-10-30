import { cellKey, type World } from "../core/world.ts"

/**
 * Where the field puts trees, bushes and flowers. Each cell picks its look from a hash of its place,
 * so a level always looks the same and the scenery never moves while the hero walks.
 */

export type Obstacle = "bush" | "bushRound" | "fern" | "rock" | "stump" | "sunflower"
export type Decor = "petals"

export interface Scenery {
  /** Top-left cells of big trees; a tree takes 2×2 wall cells. */
  readonly trees: ReadonlyArray<{ readonly x: number; readonly y: number }>
  /** One per wall cell that has no tree. */
  readonly obstacles: ReadonlyArray<{ readonly x: number; readonly y: number; readonly kind: Obstacle }>
  /** Tiny petals on some floor cells. Only petals: a stone or a flower on the path would look like a wall. */
  readonly decor: ReadonlyArray<{ readonly x: number; readonly y: number; readonly kind: Decor }>
}

// Bushes come up most often, so a wall still reads as a hedge.
const OBSTACLES: ReadonlyArray<Obstacle> = ["bush", "bush", "bush", "bushRound", "bushRound", "fern", "rock", "stump", "sunflower"]
const TREE_CHANCE = 3
const DECOR_CHANCE = 4

/** A small integer hash of a cell: the same cell always gets the same number. */
export const cellHash = (x: number, y: number, salt = 0): number => {
  let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(salt + 1, 83492791)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

const pick = <T>(list: ReadonlyArray<T>, hash: number): T => list[hash % list.length] as T

export const buildScenery = (world: Pick<World, "width" | "height" | "walls" | "finish">): Scenery => {
  const wall = (x: number, y: number) => world.walls.has(cellKey(x, y))
  const taken = new Set<string>()
  const trees: Array<{ x: number; y: number }> = []
  for (let y = 0; y < world.height - 1; y++) {
    for (let x = 0; x < world.width - 1; x++) {
      const block = [cellKey(x, y), cellKey(x + 1, y), cellKey(x, y + 1), cellKey(x + 1, y + 1)]
      const fits = block.every((key) => world.walls.has(key) && !taken.has(key))
      if (!fits || cellHash(x, y, 1) % TREE_CHANCE !== 0) continue
      trees.push({ x, y })
      for (const key of block) taken.add(key)
    }
  }
  const obstacles: Array<{ x: number; y: number; kind: Obstacle }> = []
  const decor: Array<{ x: number; y: number; kind: Decor }> = []
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (wall(x, y)) {
        if (!taken.has(cellKey(x, y))) obstacles.push({ x, y, kind: pick(OBSTACLES, cellHash(x, y, 2)) })
        continue
      }
      const isFinish = world.finish !== null && world.finish.x === x && world.finish.y === y
      if (!isFinish && cellHash(x, y, 3) % DECOR_CHANCE === 0) decor.push({ x, y, kind: "petals" })
    }
  }
  return { trees, obstacles, decor }
}
