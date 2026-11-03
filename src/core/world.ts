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
 * the hero can step on it, and the run ends there), `H` storehouse (floor where «віднести на склад» puts down what the
 * hero carries).
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
  /** The storehouse cell (`H`), or null when the map has none. */
  readonly storehouse: Cell | null
  /** Things the hero took and carries now. */
  readonly carrying: number
  /** How many things the hero can carry at once, or null when the level has no limit. */
  readonly capacity: number | null
  /** Things put down in the storehouse. */
  readonly stored: number
}

/** Monsters from the pack. Which one only changes the picture. */
export type EnemyKind = "slime" | "spirit" | "goblin" | "skull" | "flame" | "bear" | "toad"

/**
 * How an enemy moves while it does not come for the hero: stands, walks left and right, walks up and down, or
 * walks its `route` round and round.
 */
export type EnemyWalk = "stand" | "across" | "updown" | "patrol"

/**
 * When an enemy notices the hero. `near`: the hero is `sight` steps away or closer, walls or not. `line`: the enemy
 * sees the hero in its row or column, `sight` cells away or closer, with no wall between; once it has seen the hero
 * it keeps coming for them.
 */
export type EnemySees = "near" | "line"

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
  /** The cells a patrolling enemy walks to, one after another, then again from the first. */
  readonly route?: ReadonlyArray<Cell>
  /** When it notices the hero: `near` by default. */
  readonly sees?: EnemySees
  /** A boss is drawn bigger and shows its hp. */
  readonly boss?: boolean
  /** A picture from an asset pack (`"<pack>:<sprite id>"`) instead of the kind's own. Only looks. */
  readonly look?: string
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
  /** The patrol route, empty for an enemy that does not patrol. */
  readonly route: ReadonlyArray<Cell>
  /** The cell of `route` it walks to now. */
  readonly target: number
  readonly sees: EnemySees
  /** Set once a `line` enemy has seen the hero: from then on it comes for them. */
  readonly alerted: boolean
  readonly boss: boolean
  /** The picture from an asset pack, when the level gave one. */
  readonly look?: string
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
    route: (spec.route ?? []).map((c) => ({ x: c.x, y: c.y })),
    target: 0,
    sees: spec.sees ?? "near",
    alerted: false,
    boss,
    ...(spec.look === undefined ? {} : { look: spec.look })
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
  let storehouse: Cell | null = null
  const width = Math.max(0, ...rows.map((r) => r.length))
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? " "
      if (ch === "#" || ch === " ") walls.add(cellKey(x, y))
      else if (ch === "c") crystals.add(cellKey(x, y))
      else if (ch === "x") traps.add(cellKey(x, y))
      else if (ch === "S") start = { x, y }
      else if (ch === "F") finish = { x, y }
      else if (ch === "H") storehouse = { x, y }
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
    maxHearts: DEFAULT_HEARTS,
    storehouse,
    carrying: 0,
    capacity: null,
    stored: 0
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

/** The hero stands on the storehouse. */
export const atStorehouse = (world: World): boolean =>
  world.storehouse !== null && world.hero.x === world.storehouse.x && world.hero.y === world.storehouse.y

/** The hero carries as much as it can: «взяти» would take nothing now. Never true on a level without a limit. */
export const handsFull = (world: World): boolean => world.capacity !== null && world.carrying >= world.capacity

export type Action = "move" | "turnLeft" | "turnRight" | "collect" | "attack" | "store" | "wait"

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
  /** «взяти» with full hands: the thing stays where it lies. */
  | "handsFull"
  /** «віднести на склад» on the storehouse: what the hero carried is in the storehouse now. */
  | "stored"
  /** «віднести на склад» away from the storehouse. */
  | "notStorehouse"
  /** «віднести на склад» on the storehouse with empty hands. */
  | "nothingToStore"
  /** «зачекати»: the hero stands, the enemies take their turn. */
  | "waited"

/**
 * What happened in the world, in the order it happened: the hero's action first, then each enemy's turn.
 * A frame keeps the events, so an animation shows what was done, not only where everybody stands now.
 */
export type GameEvent =
  | { readonly type: "heroMoved"; readonly from: Cell; readonly to: Cell }
  | { readonly type: "heroTurned"; readonly from: Direction; readonly to: Direction }
  /** The hero walked into a wall or an enemy. */
  | { readonly type: "heroBumped"; readonly into: Cell }
  | { readonly type: "heroFell"; readonly at: Cell }
  /** No steps left: the hero could not move. */
  | { readonly type: "heroTired" }
  | { readonly type: "itemTaken"; readonly at: Cell }
  | { readonly type: "nothingToTake"; readonly at: Cell }
  /** «взяти» with full hands. */
  | { readonly type: "handsFull"; readonly at: Cell }
  /** The hero put down what it carried in the storehouse. */
  | { readonly type: "itemsStored"; readonly at: Cell; readonly count: number }
  /** «віднести на склад» where there is no storehouse, or with empty hands. */
  | { readonly type: "nothingToStore"; readonly at: Cell }
  /** The hero swung at the cell ahead, with or without an enemy there. */
  | { readonly type: "heroSwung"; readonly at: Cell }
  | { readonly type: "enemyHit"; readonly id: number; readonly hp: number }
  | { readonly type: "enemyDown"; readonly id: number }
  | { readonly type: "enemyMoved"; readonly id: number; readonly from: Cell; readonly to: Cell }
  /** The enemy raised its weapon: it hits on its next turn if the hero is still next to it. */
  | { readonly type: "enemyWindUp"; readonly id: number }
  | { readonly type: "heroHurt"; readonly by: number; readonly hearts: number }
  /** The enemy saw the hero and comes for them now. */
  | { readonly type: "enemyAlerted"; readonly id: number }
  /** The hero stood one turn. */
  | { readonly type: "heroWaited" }

export interface ActionResult {
  readonly world: World
  readonly outcome: Outcome
  readonly events: ReadonlyArray<GameEvent>
}

const at = (c: Cell): Cell => ({ x: c.x, y: c.y })

const heroAction = (world: World, action: Action): ActionResult => {
  const here = at(world.hero)
  if (action === "move") {
    const next = cellAhead(world)
    if (world.energy === 0) return { world, outcome: "tired", events: [{ type: "heroTired" }] }
    if (isWall(world, next.x, next.y) || enemyAt(world, next.x, next.y) !== undefined)
      return { world: { ...world, crashed: true }, outcome: "crashed", events: [{ type: "heroBumped", into: next }] }
    const energy = world.energy === null ? null : world.energy - 1
    const moved = { ...world, energy, hero: { ...world.hero, x: next.x, y: next.y } }
    const step: GameEvent = { type: "heroMoved", from: here, to: next }
    return world.traps.has(cellKey(next.x, next.y))
      ? { world: { ...moved, fell: true }, outcome: "fell", events: [step, { type: "heroFell", at: next }] }
      : { world: moved, outcome: "moved", events: [step] }
  }
  if (action === "turnLeft" || action === "turnRight") {
    const i = CLOCKWISE.indexOf(world.hero.dir)
    const dir = CLOCKWISE[(i + (action === "turnRight" ? 1 : 3)) % 4] ?? world.hero.dir
    return { world: { ...world, hero: { ...world.hero, dir } }, outcome: "turned", events: [{ type: "heroTurned", from: world.hero.dir, to: dir }] }
  }
  if (action === "attack") {
    const next = cellAhead(world)
    const swing: GameEvent = { type: "heroSwung", at: next }
    const target = enemyAt(world, next.x, next.y)
    if (target === undefined) return { world, outcome: "swingMissed", events: [swing] }
    // A blow stops an enemy's swing, but not a boss's: a boss hits back while it is struck.
    const enemies = world.enemies.map((e) => (e.id === target.id ? { ...e, hp: e.hp - 1, swinging: e.swinging && e.boss } : e))
    const down = target.hp <= 1
    return {
      world: { ...world, enemies },
      outcome: down ? "enemyDown" : "enemyHit",
      events: [swing, down ? { type: "enemyDown", id: target.id } : { type: "enemyHit", id: target.id, hp: target.hp - 1 }]
    }
  }
  if (action === "store") return store(world)
  if (action === "wait") return { world, outcome: "waited", events: [{ type: "heroWaited" }] }
  const key = cellKey(world.hero.x, world.hero.y)
  if (!world.crystals.has(key)) return { world, outcome: "nothingToCollect", events: [{ type: "nothingToTake", at: here }] }
  if (handsFull(world)) return { world, outcome: "handsFull", events: [{ type: "handsFull", at: here }] }
  const crystals = new Set(world.crystals)
  crystals.delete(key)
  return { world: { ...world, crystals, carrying: world.carrying + 1 }, outcome: "collected", events: [{ type: "itemTaken", at: here }] }
}

/** «віднести на склад»: on the storehouse the hero puts down everything it carries. */
const store = (world: World): ActionResult => {
  const here = at(world.hero)
  if (!atStorehouse(world)) return { world, outcome: "notStorehouse", events: [{ type: "nothingToStore", at: here }] }
  if (world.carrying === 0) return { world, outcome: "nothingToStore", events: [{ type: "nothingToStore", at: here }] }
  return {
    world: { ...world, stored: world.stored + world.carrying, carrying: 0 },
    outcome: "stored",
    events: [{ type: "itemsStored", at: here, count: world.carrying }]
  }
}

const distance = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

/** Cells an enemy may step on: floor with no hero and no other enemy. */
const freeFor = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy, x: number, y: number): boolean =>
  !isWall(world, x, y) &&
  !(world.hero.x === x && world.hero.y === y) &&
  !enemies.some((e) => e.id !== self.id && isAlive(e) && e.x === x && e.y === y)

/**
 * The first step of a shortest way from the enemy to a cell where `arrived` is true, or null when there is none
 * within `depth` steps.
 */
const firstStep = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy, arrived: (c: Cell) => boolean, depth: number): Cell | null => {
  const first = new Map<string, Cell>()
  const seen = new Set([cellKey(self.x, self.y)])
  let wave: ReadonlyArray<Cell> = [self]
  for (let d = 0; wave.length > 0 && d <= depth; d++) {
    const next: Array<Cell> = []
    for (const c of wave) {
      if (arrived(c)) return first.get(cellKey(c.x, c.y)) ?? null
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

/** The first step of a shortest way to a cell next to the hero. Searched as far as the enemy sees, and a little more. */
const stepToward = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy): Cell | null =>
  firstStep(world, enemies, self, (c) => distance(c, world.hero) === 1, self.sight * 2 + 2)

/** The patrol searches its next cell this far: a route goes round a few walls at most. */
const PATROL_DEPTH = 32

/** The enemy sees the hero in its row or column, `sight` cells away or closer, with no wall between. */
export const seesInLine = (world: World, self: Enemy): boolean => {
  const { hero } = world
  if (hero.x !== self.x && hero.y !== self.y) return false
  const far = distance(self, hero)
  if (far > self.sight) return false
  const dx = Math.sign(hero.x - self.x)
  const dy = Math.sign(hero.y - self.y)
  for (let i = 1; i < far; i++) if (isWall(world, self.x + dx * i, self.y + dy * i)) return false
  return true
}

/** Whether the enemy comes for the hero this turn, and whether it has just noticed them. */
const noticing = (world: World, self: Enemy): { readonly comes: boolean; readonly alerted: boolean } => {
  if (self.sight === 0) return { comes: false, alerted: self.alerted }
  if (self.sees === "near") return { comes: distance(self, world.hero) <= self.sight, alerted: false }
  const alerted = self.alerted || seesInLine(world, self)
  return { comes: alerted, alerted }
}

/** A patrolling enemy's step along its route: to the cell it walks to, then on to the next one. */
const patrolStep = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy): Enemy => {
  if (self.route.length === 0) return self
  let target = self.target % self.route.length
  const goal = self.route[target] as Cell
  if (goal.x === self.x && goal.y === self.y) target = (target + 1) % self.route.length
  const to = self.route[target] as Cell
  const step = firstStep(world, enemies, self, (c) => c.x === to.x && c.y === to.y, PATROL_DEPTH)
  return step === null ? { ...self, target } : { ...self, target, x: step.x, y: step.y }
}

/** One enemy's turn: swing or hit when next to the hero, come closer when it sees the hero, walk its way otherwise. */
const enemyTurn = (world: World, enemies: ReadonlyArray<Enemy>, self: Enemy): { readonly enemy: Enemy; readonly hit: boolean } => {
  const near = distance(self, world.hero)
  const { comes, alerted } = noticing(world, self)
  const me = { ...self, alerted }
  if (near === 1) return self.swinging ? { enemy: { ...me, swinging: false }, hit: true } : { enemy: { ...me, swinging: true }, hit: false }
  const calm = { ...me, swinging: false }
  if (comes) {
    const step = stepToward(world, enemies, self)
    if (step !== null) return { enemy: { ...calm, x: step.x, y: step.y }, hit: false }
  }
  if (self.walk === "stand") return { enemy: calm, hit: false }
  if (self.walk === "patrol") return { enemy: patrolStep(world, enemies, calm), hit: false }
  const along = (heading: 1 | -1): Cell =>
    self.walk === "across" ? { x: self.x + heading, y: self.y } : { x: self.x, y: self.y + heading }
  for (const heading of [self.heading, self.heading === 1 ? -1 : 1] as const) {
    const to = along(heading)
    if (freeFor(world, enemies, self, to.x, to.y)) return { enemy: { ...calm, x: to.x, y: to.y, heading }, hit: false }
  }
  return { enemy: calm, hit: false }
}

/** The events of one enemy's turn, from the enemy before and after it. */
const enemyEvents = (before: Enemy, after: Enemy, hit: boolean, hearts: number): ReadonlyArray<GameEvent> => {
  if (after.alerted && !before.alerted) return [{ type: "enemyAlerted", id: after.id }, ...enemyEvents({ ...before, alerted: true }, after, hit, hearts)]
  if (hit) return [{ type: "heroHurt", by: after.id, hearts }]
  if (after.swinging && !before.swinging) return [{ type: "enemyWindUp", id: after.id }]
  if (after.x !== before.x || after.y !== before.y) return [{ type: "enemyMoved", id: after.id, from: at(before), to: at(after) }]
  return []
}

/** After each hero action every enemy that is still up takes its turn, in order. */
const enemiesTurn = (world: World): { readonly world: World; readonly events: ReadonlyArray<GameEvent> } => {
  if (!world.enemies.some(isAlive)) return { world, events: [] }
  let enemies = world.enemies
  let hearts = world.hearts
  const events: Array<GameEvent> = []
  for (const self of world.enemies) {
    if (!isAlive(self)) continue
    const { enemy, hit } = enemyTurn(world, enemies, self)
    enemies = enemies.map((e) => (e.id === enemy.id ? enemy : e))
    if (hit) hearts = Math.max(0, hearts - 1)
    events.push(...enemyEvents(self, enemy, hit, hearts))
  }
  return { world: { ...world, enemies, hearts }, events }
}

/** Outcomes that end the run at once: the enemies do not move after them. */
export const isFatal = (outcome: Outcome): boolean => outcome === "crashed" || outcome === "fell" || outcome === "tired"

/** One hero action, then the enemies' turn. A crash, a trap or the end of the steps ends the run at once. */
export const applyAction = (world: World, action: Action): ActionResult => {
  const done = heroAction(world, action)
  if (isFatal(done.outcome)) return done
  const turn = enemiesTurn(done.world)
  return { world: turn.world, outcome: done.outcome, events: [...done.events, ...turn.events] }
}
