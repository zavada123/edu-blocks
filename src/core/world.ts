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
 * Map rows, top to bottom. `#` wall, `.` floor, `S` start, `c` crystal, `F` finish, `x` trap (thin ice or a pit:
 * the hero can step on it, and the run ends there).
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
  /** Trap cells: floor that ends the run when the hero steps on it. */
  readonly traps: ReadonlySet<string>
  /** Set once the hero stepped on a trap. The run stops there. */
  readonly fell: boolean
  /** Steps the hero may still take, or null when the level has no limit. */
  readonly energy: number | null
  /** Enemies of the level, beaten ones too (with no hp left), in the order they act. */
  readonly enemies: ReadonlyArray<Enemy>
  /** Hearts the hero has left. At 0 the run stops. */
  readonly hearts: number
  readonly maxHearts: number
}

/** Monsters from the pack. Which one only changes the picture. */
export type EnemyKind = "slime" | "spirit" | "goblin" | "skull" | "flame" | "bear" | "toad"

/** How an enemy moves while the hero is far: stands, walks left and right, or walks up and down. */
export type EnemyWalk = "stand" | "across" | "updown"

/** An enemy as a level puts it on the map. */
export interface EnemySpec {
  readonly kind: EnemyKind
  readonly x: number
  readonly y: number
  /** Hits it takes. 1 by default, 3 for a boss. */
  readonly hp?: number
  /** It comes for the hero once the hero is this many steps away or closer. 2 by default; 0 never comes. */
  readonly sight?: number
  readonly walk?: EnemyWalk
  /** A boss is drawn bigger and shows its hp. */
  readonly boss?: boolean
}

export interface Enemy {
  readonly id: number
  readonly kind: EnemyKind
  readonly x: number
  readonly y: number
  readonly hp: number
  readonly maxHp: number
  readonly sight: number
  readonly walk: EnemyWalk
  /** Where a walking enemy goes now: +1 right or down, -1 left or up. */
  readonly heading: 1 | -1
  /** Set when the enemy stands next to the hero and swings: it hits on its next turn if the hero is still there. */
  readonly swinging: boolean
  readonly boss: boolean
}

export const DEFAULT_HEARTS = 3
export const DEFAULT_SIGHT = 2
export const BOSS_HP = 3

export const enemyOf = (spec: EnemySpec, id: number): Enemy => {
  const boss = spec.boss === true
  const hp = Math.max(1, Math.round(spec.hp ?? (boss ? BOSS_HP : 1)))
  return {
    id,
    kind: spec.kind,
    x: spec.x,
    y: spec.y,
    hp,
    maxHp: hp,
    sight: Math.max(0, Math.round(spec.sight ?? DEFAULT_SIGHT)),
    walk: spec.walk ?? "stand",
    heading: 1,
    swinging: false,
    boss
  }
}

export const isAlive = (enemy: Enemy): boolean => enemy.hp > 0

export const enemiesLeft = (world: World): number => world.enemies.filter(isAlive).length

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
  const traps = new Set<string>()
  let start: Cell | null = null
  let finish: Cell | null = null
  const width = Math.max(0, ...rows.map((r) => r.length))
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? " "
      if (ch === "#" || ch === " ") walls.add(cellKey(x, y))
      else if (ch === "c") crystals.add(cellKey(x, y))
      else if (ch === "x") traps.add(cellKey(x, y))
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
    crashed: false,
    traps,
    fell: false,
    energy: null,
    enemies: [],
    hearts: DEFAULT_HEARTS,
    maxHearts: DEFAULT_HEARTS
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

export const enemyAt = (world: World, x: number, y: number): Enemy | undefined =>
  world.enemies.find((e) => isAlive(e) && e.x === x && e.y === y)

export const enemyAhead = (world: World): boolean => {
  const next = cellAhead(world)
  return enemyAt(world, next.x, next.y) !== undefined
}

export const trapAhead = (world: World): boolean => {
  const next = cellAhead(world)
  return world.traps.has(cellKey(next.x, next.y))
}

export const onCrystal = (world: World): boolean => world.crystals.has(cellKey(world.hero.x, world.hero.y))

export const atFinish = (world: World): boolean =>
  world.finish !== null && world.hero.x === world.finish.x && world.hero.y === world.finish.y

export type Action = "move" | "turnLeft" | "turnRight" | "collect" | "attack"

/** What one action did, for the animation and the error message. */
export type Outcome =
  | "moved"
  | "crashed"
  | "fell"
  | "tired"
  | "turned"
  | "collected"
  | "nothingToCollect"
  | "enemyHit"
  | "enemyDown"
  | "swingMissed"

const heroAction = (world: World, action: Action): { readonly world: World; readonly outcome: Outcome } => {
  if (action === "move") {
    const next = cellAhead(world)
    if (world.energy === 0) return { world, outcome: "tired" }
    if (isWall(world, next.x, next.y) || enemyAt(world, next.x, next.y) !== undefined)
      return { world: { ...world, crashed: true }, outcome: "crashed" }
    const energy = world.energy === null ? null : world.energy - 1
    const moved = { ...world, energy, hero: { ...world.hero, x: next.x, y: next.y } }
    return world.traps.has(cellKey(next.x, next.y)) ? { world: { ...moved, fell: true }, outcome: "fell" } : { world: moved, outcome: "moved" }
  }
  if (action === "turnLeft" || action === "turnRight") {
    const i = CLOCKWISE.indexOf(world.hero.dir)
    const dir = CLOCKWISE[(i + (action === "turnRight" ? 1 : 3)) % 4] ?? world.hero.dir
    return { world: { ...world, hero: { ...world.hero, dir } }, outcome: "turned" }
  }
  if (action === "attack") {
    const next = cellAhead(world)
    const target = enemyAt(world, next.x, next.y)
    if (target === undefined) return { world, outcome: "swingMissed" }
    // A blow stops an enemy's swing, but not a boss's: a boss hits back while it is struck.
    const enemies = world.enemies.map((e) => (e.id === target.id ? { ...e, hp: e.hp - 1, swinging: e.swinging && e.boss } : e))
    return { world: { ...world, enemies }, outcome: target.hp > 1 ? "enemyHit" : "enemyDown" }
  }
  const key = cellKey(world.hero.x, world.hero.y)
  if (!world.crystals.has(key)) return { world, outcome: "nothingToCollect" }
  const crystals = new Set(world.crystals)
  crystals.delete(key)
  return { world: { ...world, crystals }, outcome: "collected" }
}

const distance = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

/** Cells an enemy may step on: floor with no hero and no other enemy. */
const freeFor = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy, x: number, y: number): boolean =>
  !isWall(world, x, y) &&
  !(world.hero.x === x && world.hero.y === y) &&
  !enemies.some((e) => e.id !== self.id && isAlive(e) && e.x === x && e.y === y)

/** The first step of a shortest way from the enemy to a cell next to the hero, or null when there is none. */
const stepToward = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy): Cell | null => {
  const first = new Map<string, Cell>()
  const seen = new Set([cellKey(self.x, self.y)])
  let wave: ReadonlyArray<Cell> = [self]
  // The way is searched only as far as the enemy sees, and a little more to go around a tree.
  for (let d = 0; wave.length > 0 && d <= self.sight * 2 + 2; d++) {
    const next: Array<Cell> = []
    for (const c of wave) {
      if (distance(c, world.hero) === 1) return first.get(cellKey(c.x, c.y)) ?? null
      for (const dir of CLOCKWISE) {
        const x = c.x + DELTA[dir].x
        const y = c.y + DELTA[dir].y
        const key = cellKey(x, y)
        if (seen.has(key) || !freeFor(world, enemies, self, x, y)) continue
        seen.add(key)
        first.set(key, first.get(cellKey(c.x, c.y)) ?? { x, y })
        next.push({ x, y })
      }
    }
    wave = next
  }
  return null
}

/** One enemy's turn: swing or hit when next to the hero, come closer when it sees the hero, walk its way otherwise. */
const enemyTurn = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy): { readonly enemy: Enemy; readonly hit: boolean } => {
  const near = distance(self, world.hero)
  if (near === 1) return self.swinging ? { enemy: { ...self, swinging: false }, hit: true } : { enemy: { ...self, swinging: true }, hit: false }
  const calm = { ...self, swinging: false }
  if (self.sight > 0 && near <= self.sight) {
    const step = stepToward(world, enemies, self)
    if (step !== null) return { enemy: { ...calm, x: step.x, y: step.y }, hit: false }
  }
  if (self.walk === "stand") return { enemy: calm, hit: false }
  const along = (heading: 1 | -1): Cell =>
    self.walk === "across" ? { x: self.x + heading, y: self.y } : { x: self.x, y: self.y + heading }
  for (const heading of [self.heading, self.heading === 1 ? -1 : 1] as const) {
    const to = along(heading)
    if (freeFor(world, enemies, self, to.x, to.y)) return { enemy: { ...calm, x: to.x, y: to.y, heading }, hit: false }
  }
  return { enemy: calm, hit: false }
}

/** After each hero action every enemy that is still up takes its turn, in order. */
const enemiesTurn = (world: World): World => {
  if (!world.enemies.some(isAlive)) return world
  let enemies = world.enemies
  let hearts = world.hearts
  for (const self of world.enemies) {
    if (!isAlive(self)) continue
    const { enemy, hit } = enemyTurn(world, enemies, self)
    enemies = enemies.map((e) => (e.id === enemy.id ? enemy : e))
    if (hit) hearts = Math.max(0, hearts - 1)
  }
  return { ...world, enemies, hearts }
}

/** Outcomes that end the run at once: the enemies do not move after them. */
export const isFatal = (outcome: Outcome): boolean => outcome === "crashed" || outcome === "fell" || outcome === "tired"

/** One hero action, then the enemies' turn. A crash, a trap or the end of the steps ends the run at once. */
export const applyAction = (world: World, action: Action): { readonly world: World; readonly outcome: Outcome } => {
  const done = heroAction(world, action)
  return isFatal(done.outcome) ? done : { world: enemiesTurn(done.world), outcome: done.outcome }
}
