import type { FinishKind, WaterPaint } from "../core/level.ts"
import { type Cell, cellKey, type World } from "../core/world.ts"

/**
 * Water on the field, as on the islands of Tiny Swords: water lies lowest, white foam laps at every shore, and the
 * grass or the sand of the path ends in a soft edge over it. Water only ever lies on cells the hero cannot enter, so
 * it changes how a level looks and never how it plays.
 *
 * A level paints its own ponds and rivers with `scene.water`. A level whose goal is a spring gets a pond of its own
 * next to the goal, so the hero comes out of the path onto its shore.
 */

type Shape = Pick<World, "width" | "height" | "walls" | "finish">

/** What of the scene says where water lies. */
export interface WaterScene {
  readonly water?: WaterPaint | undefined
  readonly finish?: FinishKind | undefined
  readonly finishLook?: string | undefined
  readonly tilemap?: unknown
}

/** The letter of a water cell in `scene.water.rows`. */
export const WATER_LETTER = "~"

/**
 * Pond shapes to try for a spring, biggest first: the first that fits next to the goal without covering the path.
 * Cut corners make a pond look round, not like a box.
 */
const POND_SHAPES: ReadonlyArray<ReadonlyArray<string>> = [
  [".~~.", "~~~~", "~~~.", ".~.."],
  [".~~.", "~~~~", ".~~."],
  [".~.", "~~~", "~~~", ".~."],
  ["~~~", ".~~"],
  [".~", "~~", "~."],
  ["~~", "~~"],
  ["~~"],
  ["~", "~"],
  ["~"]
]

const shapeCells = (shape: ReadonlyArray<string>, x: number, y: number): Array<Cell> =>
  shape.flatMap((row, j) => [...row].flatMap((ch, i) => (ch === "~" ? [{ x: x + i, y: y + j }] : [])))

const inside = (w: Shape, x: number, y: number) => x >= 0 && y >= 0 && x < w.width && y < w.height
/** Where the hero can stand: water never goes there. */
const open = (w: Shape, x: number, y: number) => inside(w, x, y) && !w.walls.has(cellKey(x, y))

/** The cells a level paints with water, without those the hero walks on. */
const painted = (world: Shape, scene: WaterScene): ReadonlyArray<Cell> => {
  const paint = scene.water
  if (paint === undefined) return []
  const ox = paint.x ?? 0
  const oy = paint.y ?? 0
  return paint.rows.flatMap((row, dy) =>
    [...row].flatMap((ch, dx) => (ch === WATER_LETTER && !open(world, ox + dx, oy + dy) ? [{ x: ox + dx, y: oy + dy }] : []))
  )
}

/**
 * The pond of a spring: the biggest block of cells next to the goal that are not the path, the house or a villager,
 * and the one that lies most straight ahead of the hero who comes to the goal along the path. Null when the goal
 * stands in a corner with no room.
 */
export const springPond = (world: Shape, reserved: ReadonlySet<string> = new Set()): ReadonlyArray<Cell> | null => {
  const goal = world.finish
  if (goal === null) return null
  const steps = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ] as const
  // Straight ahead: away from where the path comes in.
  let ax = 0
  let ay = 0
  for (const [dx, dy] of steps) {
    if (open(world, goal.x + dx, goal.y + dy)) {
      ax -= dx
      ay -= dy
    }
  }
  const aheadX = goal.x + 0.5 + ax * 2
  const aheadY = goal.y + 0.5 + ay * 2
  for (const shape of POND_SHAPES) {
    const w = Math.max(...shape.map((r) => r.length))
    const h = shape.length
    let best: { cells: ReadonlyArray<Cell>; score: number } | null = null
    for (let y = goal.y - h; y <= goal.y + 1; y++) {
      for (let x = goal.x - w; x <= goal.x + 1; x++) {
        const cells = shapeCells(shape, x, y)
        if (cells.some((c) => open(world, c.x, c.y) || reserved.has(cellKey(c.x, c.y)))) continue
        if (!cells.some((c) => Math.abs(c.x - goal.x) + Math.abs(c.y - goal.y) === 1)) continue
        const score = Math.hypot(x + w / 2 - aheadX, y + h / 2 - aheadY)
        if (best === null || score < best.score) best = { cells, score }
      }
    }
    if (best !== null) return best.cells
  }
  return null
}

/** Every water cell of the field, as keys: what the level paints, and the pond of a spring. */
export const waterCells = (world: Shape, scene: WaterScene, reserved: ReadonlySet<string> = new Set()): ReadonlySet<string> => {
  const cells = new Set(painted(world, scene).map((c) => cellKey(c.x, c.y)))
  const spring = scene.finish === "well" && scene.finishLook === undefined && scene.tilemap === undefined
  if (spring) for (const c of springPond(world, reserved) ?? []) cells.add(cellKey(c.x, c.y))
  return cells
}
