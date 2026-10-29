/**
 * The game field: a grid map, the hero and the crystals. Pure functions, no VM and no DOM,
 * so the browser and the server move the hero the same way.
 */

export type Direction = "up" | "right" | "down" | "left"

export interface Cell {
  readonly x: number
  readonly y: number
}

/**
 * Map rows, top to bottom. `#` wall, `.` floor, `S` start, `c` crystal, `F` finish.
 * A space or a cell outside the rows is a wall too.
 */
export type MapRows = ReadonlyArray<string>

export interface World {
  readonly width: number
  readonly height: number
  readonly walls: ReadonlySet<string>
  readonly finish: Cell | null
  /** Crystals still on the map. */
  readonly crystals: ReadonlySet<string>
  readonly totalCrystals: number
  readonly hero: Cell & { readonly dir: Direction }
  /** Set once the hero walked into a wall. The run stops there. */
  readonly crashed: boolean
}

export const cellKey = (x: number, y: number): string => `${x},${y}`

const DELTA: Readonly<Record<Direction, Cell>> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
}

const CLOCKWISE: ReadonlyArray<Direction> = ["up", "right", "down", "left"]

export const parseMap = (rows: MapRows, dir: Direction = "right"): World => {
  const walls = new Set<string>()
  const crystals = new Set<string>()
  let start: Cell | null = null
  let finish: Cell | null = null
  const width = Math.max(0, ...rows.map((r) => r.length))
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? " "
      if (ch === "#" || ch === " ") walls.add(cellKey(x, y))
      else if (ch === "c") crystals.add(cellKey(x, y))
      else if (ch === "S") start = { x, y }
      else if (ch === "F") finish = { x, y }
      else if (ch !== ".") throw new Error(`Невідомий знак «${ch}» на мапі, рядок ${y + 1}`)
    }
  })
  if (start === null) throw new Error("На мапі немає старту S")
  const s: Cell = start
  return {
    width,
    height: rows.length,
    walls,
    finish,
    crystals,
    totalCrystals: crystals.size,
    hero: { x: s.x, y: s.y, dir },
    crashed: false
  }
}

export const isWall = (world: World, x: number, y: number): boolean =>
  x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(cellKey(x, y))

export const cellAhead = (world: World): Cell => {
  const d = DELTA[world.hero.dir]
  return { x: world.hero.x + d.x, y: world.hero.y + d.y }
}

export const wallAhead = (world: World): boolean => {
  const next = cellAhead(world)
  return isWall(world, next.x, next.y)
}

export const onCrystal = (world: World): boolean => world.crystals.has(cellKey(world.hero.x, world.hero.y))

export const atFinish = (world: World): boolean =>
  world.finish !== null && world.hero.x === world.finish.x && world.hero.y === world.finish.y

export type Action = "move" | "turnLeft" | "turnRight" | "collect"

/** What one action did, for the animation and the error message. */
export type Outcome = "moved" | "crashed" | "turned" | "collected" | "nothingToCollect"

export const applyAction = (world: World, action: Action): { readonly world: World; readonly outcome: Outcome } => {
  if (action === "move") {
    const next = cellAhead(world)
    if (isWall(world, next.x, next.y)) return { world: { ...world, crashed: true }, outcome: "crashed" }
    return { world: { ...world, hero: { ...world.hero, x: next.x, y: next.y } }, outcome: "moved" }
  }
  if (action === "turnLeft" || action === "turnRight") {
    const i = CLOCKWISE.indexOf(world.hero.dir)
    const dir = CLOCKWISE[(i + (action === "turnRight" ? 1 : 3)) % 4] ?? world.hero.dir
    return { world: { ...world, hero: { ...world.hero, dir } }, outcome: "turned" }
  }
  const key = cellKey(world.hero.x, world.hero.y)
  if (!world.crystals.has(key)) return { world, outcome: "nothingToCollect" }
  const crystals = new Set(world.crystals)
  crystals.delete(key)
  return { world: { ...world, crystals }, outcome: "collected" }
}
