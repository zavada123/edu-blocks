import type { Step } from "./build.ts"
import { allGoalsMet, type BlockName, type Level, startWorld } from "./level.ts"
import {
  type Action,
  applyAction,
  atFinish,
  type Cell,
  cellKey,
  type Direction,
  enemyAhead,
  isAlive,
  isFatal,
  type MapRows,
  parseMap,
  type World
} from "./world.ts"

/**
 * Level kit: what a level editor (or a script) needs to make a level from the map signs and the scene pictures.
 * Change a map cell by cell, check that the level can be played, find a plain route for the hero and write the
 * level as code for `src/levels/index.ts`.
 *
 * Map signs: `#` wall (trees, bushes or water under a bridge), `.` floor, `S` start, `c` item, `F` finish, `x` trap.
 */

export type MapTile = "wall" | "floor" | "start" | "item" | "finish" | "trap"

const SIGN: Readonly<Record<MapTile, string>> = { wall: "#", floor: ".", start: "S", item: "c", finish: "F", trap: "x" }

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

/** Floor cells the hero can walk to from the start without stepping on a trap. */
const reachable = (map: MapRows): ReadonlySet<string> => {
  const world = parseMap(map)
  const seen = new Set([cellKey(world.hero.x, world.hero.y)])
  const queue: Array<Cell> = [world.hero]
  for (let c = queue.shift(); c !== undefined; c = queue.shift()) {
    for (const [dx, dy] of STEPS_AROUND) {
      const x = c.x + dx
      const y = c.y + dy
      const key = cellKey(x, y)
      if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || world.traps.has(key) || seen.has(key)) continue
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
  const wants = (type: "crystals" | "finish" | "enemies") => level.goals.some((g) => g.type === type)
  const has = (b: BlockName) => level.blocks.includes(b)

  if (level.title.trim() === "") error("Немає назви рівня")
  if (level.goals.length === 0) error("Немає мети: збери предмети, дійди до мети або обидва")
  if (wants("crystals") && world.totalCrystals === 0) error("Мета — зібрати предмети, а на мапі немає жодного c")
  if (wants("finish") && world.finish === null) error("Мета — дійти до F, а на мапі немає F")
  if (!has("move")) error("У палітрі немає «крок уперед»: герой не зрушить")
  if (wants("crystals") && !has("collect")) error("Предмети треба брати, а в палітрі немає «взяти»")
  const enemies = level.enemies ?? []
  if (wants("enemies") && enemies.length === 0) error("Мета — перемогти ворогів, а ворогів на мапі немає")
  if (enemies.length > 0 && !has("attack"))
    (wants("enemies") ? error : warning)("На мапі є вороги, а в палітрі немає «вдарити»: їх можна лише обійти")
  const taken = new Set<string>()
  for (const e of enemies) {
    const key = cellKey(e.x, e.y)
    if (world.walls.has(key) || e.x < 0 || e.y < 0 || e.x >= world.width || e.y >= world.height)
      error(`Ворог на (${e.x}, ${e.y}) стоїть на стіні або поза мапою`)
    else if (e.x === world.hero.x && e.y === world.hero.y) error("Ворог стоїть на старті героя")
    else if (taken.has(key)) error(`Два вороги на одній клітинці (${e.x}, ${e.y})`)
    taken.add(key)
  }

  const open = reachable(level.map)
  const lost = [...world.crystals].filter((key) => !open.has(key)).length
  if (lost > 0) error(`Герой не дійде до ${lost} предмет${lost === 1 ? "а" : "ів"}: їх відрізають стіни або пастки`)
  if (world.finish !== null && !open.has(cellKey(world.finish.x, world.finish.y)))
    error("Герой не дійде до мети F: її відрізають стіни або пастки")
  for (const e of enemies) if (world.traps.has(cellKey(e.x, e.y))) error(`Ворог на (${e.x}, ${e.y}) стоїть на пастці`)
  if (level.maxSteps !== undefined && !(level.maxSteps >= 1)) error("Кроків має бути щонайменше 1")
  if (!wants("crystals") && world.totalCrystals > 0) warning("На мапі є предмети, але мета їх не просить")
  if (!wants("finish") && world.finish !== null) warning("На мапі є F, але мета не просить до неї дійти")
  const lostEnemies = enemies.filter((e) => !open.has(cellKey(e.x, e.y))).length
  if (wants("enemies") && lostEnemies > 0) error(`Герой не дійде до ${lostEnemies} ворог${lostEnemies === 1 ? "а" : "ів"}: їх відрізають стіни`)

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
      if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || world.traps.has(key) || back.has(key)) continue
      back.set(key, c)
      queue.push({ x, y })
    }
  }
  return null
}

const cellOf = (key: string): Cell => {
  const [x = 0, y = 0] = key.split(",").map(Number)
  return { x, y }
}

/** Items up to this many are taken in the order with the fewest steps; more are taken nearest first. */
const ORDER_LIMIT = 7

/**
 * The order of the items with the fewest steps from the start (and on to the finish when the level asks for it):
 * on a level with few steps the nearest item first can be the wrong way. Empty when there are too many items.
 */
const itemOrder = (level: Level, world: World): ReadonlyArray<Cell> => {
  const items = [...world.crystals].map(cellOf)
  if (items.length === 0 || items.length > ORDER_LIMIT) return []
  const finish = level.goals.some((g) => g.type === "finish") ? world.finish : null
  const length = (a: Cell, b: Cell) => walk(level.map, a, b)?.length ?? Infinity
  let best: { readonly cost: number; readonly order: ReadonlyArray<Cell> } = { cost: Infinity, order: [] }
  const visit = (at: Cell, order: ReadonlyArray<Cell>, cost: number) => {
    if (cost >= best.cost) return
    const rest = items.filter((c) => !order.includes(c))
    if (rest.length === 0) {
      const total = finish === null ? cost : cost + length(at, finish)
      if (total < best.cost) best = { cost: total, order }
      return
    }
    for (const next of rest) visit(next, [...order, next], cost + length(at, next))
  }
  visit(world.hero, [], 0)
  return best.order
}

/** Hero actions a plain route may take before it gives up. */
const ROUTE_LIMIT = 500

/**
 * A plain route without loops: to the nearest item each time, then to the nearest enemy (struck until it falls)
 * when the goal asks for it, then to the finish. An enemy in the way is struck too. The route is played on the
 * real rules, so walking enemies are followed. Good to check that a level can be done and to see how long a program
 * without «повторити» is. Null when the level cannot be done this way.
 */
export const plainRoute = (level: Level): ReadonlyArray<Step> | null => {
  if (checkLevel(level).some((i) => i.level === "error")) return null
  let world: World = startWorld(level)
  const steps: Array<Step> = []
  /** False when the run is lost or too long. */
  const act = (action: Extract<Action, Step>): boolean => {
    steps.push(action)
    const done = applyAction(world, action)
    world = done.world
    return allGoalsMet(level, world) || (!isFatal(done.outcome) && world.hearts > 0 && steps.length < ROUTE_LIMIT)
  }
  const face = (want: Direction): boolean => {
    const dir = world.hero.dir
    if (TURN_RIGHT[TURN_RIGHT[dir]] === want) return act("turnRight") && act("turnRight")
    if (TURN_RIGHT[dir] === want) return act("turnRight")
    if (TURN_RIGHT[want] === dir) return act("turnLeft")
    return true
  }
  /** One step toward a cell (striking an enemy in the way); false when there is no way or the run is lost. */
  const advance = (target: Cell): boolean => {
    const next = walk(level.map, world.hero, target)?.[0]
    if (next === undefined) return false
    if (!face(directionTo(world.hero, next))) return false
    return act(enemyAhead(world) ? "attack" : "move")
  }
  const nearest = <T extends Cell>(cells: ReadonlyArray<T>): T | undefined =>
    cells
      .map((cell) => ({ cell, length: walk(level.map, world.hero, cell)?.length ?? Infinity }))
      .filter((c) => c.length < Infinity)
      .sort((a, b) => a.length - b.length)[0]?.cell
  const done = () => allGoalsMet(level, world)
  const wants = (type: "crystals" | "finish" | "enemies") => level.goals.some((g) => g.type === type)

  const order = itemOrder(level, world)
  while (wants("crystals") && world.crystals.size > 0 && !done()) {
    const left = order.filter((c) => world.crystals.has(cellKey(c.x, c.y)))
    const item = left.length > 0 ? left[0] : nearest([...world.crystals].map(cellOf))
    if (item === undefined) return null
    if (world.hero.x === item.x && world.hero.y === item.y) {
      if (!act("collect")) return null
    } else if (!advance(item)) return null
  }
  while (wants("enemies") && world.enemies.some(isAlive) && !done()) {
    const enemy = nearest(world.enemies.filter(isAlive))
    if (enemy === undefined || !advance(enemy)) return done() ? steps : null
  }
  while (wants("finish") && world.finish !== null && !atFinish(world) && !done()) {
    if (!advance(world.finish)) return null
  }
  return done() ? steps : null
}

/** The level as a TypeScript object for `src/levels/index.ts`. */
export const levelSource = (level: Level): string => {
  const text = JSON.stringify(level, null, 2)
  // Keys without quotes, as the other levels are written.
  return text.replace(/^(\s*)"([a-zA-Z]\w*)":/gm, "$1$2:")
}
