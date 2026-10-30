import type { Step } from "./build.ts"
import type { BlockName, Level } from "./level.ts"
import { type Cell, cellKey, type Direction, type MapRows, parseMap } from "./world.ts"

/**
 * Level kit: what a level editor (or a script) needs to make a level from the map signs and the scene pictures.
 * Change a map cell by cell, check that the level can be played, find a plain route for the hero and write the
 * level as code for `src/levels/index.ts`.
 *
 * Map signs: `#` wall (trees, bushes or water under a bridge), `.` floor, `S` start, `c` item, `F` finish.
 */

export type MapTile = "wall" | "floor" | "start" | "item" | "finish"

const SIGN: Readonly<Record<MapTile, string>> = { wall: "#", floor: ".", start: "S", item: "c", finish: "F" }

/** The smallest and the largest map a level can have, walls around it included. */
export const MAP_LIMITS = { min: 3, max: 16 } as const

const clampSize = (n: number) => Math.min(MAP_LIMITS.max, Math.max(MAP_LIMITS.min, Math.round(n)))

/** A map of walls with the start in the top-left corner inside. */
export const emptyMap = (width: number, height: number): MapRows => {
  const w = clampSize(width)
  const h = clampSize(height)
  return Array.from({ length: h }, (_, y) => (y === 1 ? `#S${"#".repeat(w - 2)}` : "#".repeat(w)))
}

export const tileAt = (map: MapRows, x: number, y: number): MapTile => {
  const sign = map[y]?.[x] ?? "#"
  const found = (Object.keys(SIGN) as ReadonlyArray<MapTile>).find((t) => SIGN[t] === sign)
  return found ?? "wall"
}

/**
 * The map with one cell changed. A map has one start and at most one finish: putting one moves it, and the old
 * place becomes floor. The start is never painted over, so a map always keeps it.
 */
export const setTile = (map: MapRows, x: number, y: number, tile: MapTile): MapRows => {
  if (y < 0 || y >= map.length || x < 0 || x >= (map[y]?.length ?? 0)) return map
  if (tileAt(map, x, y) === "start") return map
  const unique = tile === "start" || tile === "finish"
  return map.map((row, ry) =>
    [...row]
      .map((sign, rx) => {
        if (rx === x && ry === y) return SIGN[tile]
        return unique && sign === SIGN[tile] ? SIGN.floor : sign
      })
      .join("")
  )
}

/** The map cut or grown to a new size; new cells are walls, and the start stays. */
export const resizeMap = (map: MapRows, width: number, height: number): MapRows => {
  const w = clampSize(width)
  const h = clampSize(height)
  const rows = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => map[y]?.[x] ?? "#").join(""))
  return rows.some((r) => r.includes("S")) ? rows : setStartAnywhere(rows)
}

const setStartAnywhere = (rows: MapRows): MapRows => {
  const y = Math.min(1, rows.length - 1)
  return rows.map((row, ry) => (ry === y ? `${row.slice(0, 1)}S${row.slice(2)}` : row))
}

export type IssueLevel = "error" | "warning"

export interface Issue {
  readonly level: IssueLevel
  readonly text: string
}

const STEPS_AROUND: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
]

/** Floor cells the hero can walk to from the start. */
const reachable = (map: MapRows): ReadonlySet<string> => {
  const world = parseMap(map)
  const seen = new Set([cellKey(world.hero.x, world.hero.y)])
  const queue: Array<Cell> = [world.hero]
  for (let c = queue.shift(); c !== undefined; c = queue.shift()) {
    for (const [dx, dy] of STEPS_AROUND) {
      const x = c.x + dx
      const y = c.y + dy
      const key = cellKey(x, y)
      if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || seen.has(key)) continue
      seen.add(key)
      queue.push({ x, y })
    }
  }
  return seen
}

/** What keeps a level from being played (errors) and what would make it better (warnings). */
export const checkLevel = (level: Level): ReadonlyArray<Issue> => {
  let world
  try {
    world = parseMap(level.map, level.dir)
  } catch (e) {
    return [{ level: "error", text: e instanceof Error ? e.message : String(e) }]
  }
  const issues: Array<Issue> = []
  const error = (text: string) => issues.push({ level: "error", text })
  const warning = (text: string) => issues.push({ level: "warning", text })
  const wants = (type: "crystals" | "finish") => level.goals.some((g) => g.type === type)
  const has = (b: BlockName) => level.blocks.includes(b)

  if (level.title.trim() === "") error("Немає назви рівня")
  if (level.goals.length === 0) error("Немає мети: збери предмети, дійди до мети або обидва")
  if (wants("crystals") && world.totalCrystals === 0) error("Мета — зібрати предмети, а на мапі немає жодного c")
  if (wants("finish") && world.finish === null) error("Мета — дійти до F, а на мапі немає F")
  if (!has("move")) error("У палітрі немає «крок уперед»: герой не зрушить")
  if (wants("crystals") && !has("collect")) error("Предмети треба брати, а в палітрі немає «взяти»")

  const open = reachable(level.map)
  const lost = [...world.crystals].filter((key) => !open.has(key)).length
  if (lost > 0) error(`Герой не дійде до ${lost} предмет${lost === 1 ? "а" : "ів"}: їх відрізають стіни`)
  if (world.finish !== null && !open.has(cellKey(world.finish.x, world.finish.y)))
    error("Герой не дійде до мети F: її відрізають стіни")
  if (!wants("crystals") && world.totalCrystals > 0) warning("На мапі є предмети, але мета їх не просить")
  if (!wants("finish") && world.finish !== null) warning("На мапі є F, але мета не просить до неї дійти")

  const onPath = (level.scene?.npcs ?? []).filter((n) => !world.walls.has(cellKey(n.x, n.y)) && n.x >= 0 && n.y >= 0 && n.x < world.width && n.y < world.height)
  if (onPath.length > 0) warning("Людина стоїть на стежці: герой пройде крізь неї. Краще постав її на стіну поруч")
  if (level.stars !== undefined && level.stars.two < level.stars.three)
    error("Для двох зірок блоків має бути не менше, ніж для трьох")
  if (level.stars === undefined) warning("Без меж для зірок будь-який розв'язок отримає три зірки")
  if (level.task.every((line) => line.trim() === "")) warning("Немає тексту завдання для учня")
  if (level.hint === undefined || level.hint.trim() === "") warning("Немає підказки після невдалої спроби")
  return issues
}

const TURN_RIGHT: Readonly<Record<Direction, Direction>> = { up: "right", right: "down", down: "left", left: "up" }

const directionTo = (from: Cell, to: Cell): Direction =>
  to.x > from.x ? "right" : to.x < from.x ? "left" : to.y > from.y ? "down" : "up"

/** Shortest walk between two cells, without the first cell. */
const walk = (map: MapRows, from: Cell, to: Cell): ReadonlyArray<Cell> | null => {
  const world = parseMap(map)
  const back = new Map<string, Cell | null>([[cellKey(from.x, from.y), null]])
  const queue: Array<Cell> = [from]
  for (let c = queue.shift(); c !== undefined; c = queue.shift()) {
    if (c.x === to.x && c.y === to.y) {
      const path: Array<Cell> = []
      for (let p: Cell | null | undefined = c; p !== null && p !== undefined; p = back.get(cellKey(p.x, p.y))) path.unshift(p)
      return path.slice(1)
    }
    for (const [dx, dy] of STEPS_AROUND) {
      const x = c.x + dx
      const y = c.y + dy
      const key = cellKey(x, y)
      if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || back.has(key)) continue
      back.set(key, c)
      queue.push({ x, y })
    }
  }
  return null
}

/**
 * A plain route without loops: to the nearest item each time, then to the finish. Good to check that a level can be
 * done and to see how long a program without «повторити» is. Null when the level cannot be done.
 */
export const plainRoute = (level: Level): ReadonlyArray<Step> | null => {
  if (checkLevel(level).some((i) => i.level === "error")) return null
  const world = parseMap(level.map, level.dir)
  const steps: Array<Step> = []
  let at: Cell = world.hero
  let dir: Direction = world.hero.dir
  const goTo = (target: Cell): boolean => {
    const path = walk(level.map, at, target)
    if (path === null) return false
    for (const cell of path) {
      const want = directionTo(at, cell)
      if (TURN_RIGHT[TURN_RIGHT[dir]] === want) steps.push("turnRight", "turnRight")
      else if (TURN_RIGHT[dir] === want) steps.push("turnRight")
      else if (TURN_RIGHT[want] === dir) steps.push("turnLeft")
      dir = want
      steps.push("move")
      at = cell
    }
    return true
  }
  const left = new Set(level.goals.some((g) => g.type === "crystals") ? world.crystals : [])
  while (left.size > 0) {
    const nearest = [...left]
      .map((key) => {
        const [x = 0, y = 0] = key.split(",").map(Number)
        return { key, cell: { x, y }, length: walk(level.map, at, { x, y })?.length ?? Infinity }
      })
      .sort((a, b) => a.length - b.length)[0]
    if (nearest === undefined || !goTo(nearest.cell)) return null
    steps.push("collect")
    left.delete(nearest.key)
  }
  if (level.goals.some((g) => g.type === "finish") && world.finish !== null && !goTo(world.finish)) return null
  return steps
}

/** The level as a TypeScript object for `src/levels/index.ts`. */
export const levelSource = (level: Level): string => {
  const text = JSON.stringify(level, null, 2)
  // Keys without quotes, as the other levels are written.
  return text.replace(/^(\s*)"([a-zA-Z]\w*)":/gm, "$1$2:")
}
