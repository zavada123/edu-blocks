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
 * hero carries), `L` a lever that is off, `l` a lever that is on, `G` a gate (shut like a wall until every lever is on),
 * `b` an empty bed (floor where «посіяти» sows), `B` a sown bed (the crop grows there), `R` a bed with a ripe crop,
 * `t` the trough of a sheep pen (floor where «нагодувати» gives the sheep a pumpkin; meat lies there later).
 * A space or a cell outside the rows is a wall too.
 */
export type MapRows = ReadonlyArray<string>

/** What lies on the `c` cells and what `collect` takes. A campfire is not taken but lit. */
export type ItemKind = "crystal" | "wood" | "apple" | "fish" | "key" | "campfire" | "carrot" | "egg" | "meat" | "gold"

/** What the sheep eat: the pumpkin of the beds. */
export const FEED_ITEM: ItemKind = "carrot"
/** Too heavy to carry with anything else: taken only with empty hands, and it fills them. */
export const HEAVY_ITEM: ItemKind = "gold"

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
  /** Lever cells (`L`, `l`): floor where «потягнути важіль» switches the lever. */
  readonly levers: ReadonlySet<string>
  /** The levers that are on now. */
  readonly leversOn: ReadonlySet<string>
  /** Gate cells (`G`): a wall while any of its levers is off, floor once all of them are on. */
  readonly gates: ReadonlySet<string>
  /**
   * The levers of a gate that has its own (`Level.links`): the gate opens once these are on. A gate missing here
   * waits for every lever of the map.
   */
  readonly gateLevers: ReadonlyMap<string, ReadonlySet<string>>
  /** What lies on each `c` cell, taken or not: the level's items (`startWorld`). A crystal where it is left out. */
  readonly itemKinds: ReadonlyMap<string, ItemKind>
  /** Bed cells (`b`, `B`, `R`): «посіяти» sows there, and a crop taken there leaves an empty bed. */
  readonly beds: ReadonlySet<string>
  /** Cells where a thing grows now, and the turns until it lies there ripe: sown beds and trees that grow again. */
  readonly growing: ReadonlyMap<string, number>
  /** Turns a sown bed grows until its crop is ripe. */
  readonly growTurns: number
  /** Turns until a thing taken off a cell that is not a bed grows there again (a tree), or null when it never does. */
  readonly regrowTurns: number | null
  /** Cells that grow their thing again after their own number of turns, not `regrowTurns`: the gold mine. */
  readonly regrowAt: ReadonlyMap<string, number>
  /** What the hero carries, in the order it was taken: `carrying` is its length. */
  readonly load: ReadonlyArray<ItemKind>
  /** Trough cells (`t`) of a sheep pen: «нагодувати» there, and meat lies there after `feedTurns`. */
  readonly troughs: ReadonlySet<string>
  /** Turns the sheep eat a pumpkin until the meat lies on the trough. */
  readonly feedTurns: number
  /** Watch towers: after the enemies' turn each shoots one enemy within its range. */
  readonly towers: ReadonlyArray<Tower>
  /** Every storehouse cell (`H`): a farm has a second barn by its beds. `storehouse` is the first of them. */
  readonly storehouses: ReadonlySet<string>
  /** What lies in the barn now, by kind: what it held in the morning and what was put there since (`Level.barn`). */
  readonly barn: ReadonlyMap<StockKind, number>
  /** The build site, or null when the map has none. */
  readonly site: Site | null
  /**
   * The mill: «віднести на склад» there puts the pumpkins the hero carries into the millstones, as flour. It is no
   * storehouse: «тут склад?» says no there, so a program that stores at every storehouse keeps its pumpkins.
   */
  readonly mill: Cell | null
}

/** What the barn keeps: the things of the map, and the flour the mill makes of pumpkins. */
export type StockKind = ItemKind | "flour"

/** Flour: never lies on the map, the mill makes it of pumpkins and puts it in the barn. */
export const FLOUR: StockKind = "flour"

/** A build site: «будувати» there adds one part of the building and takes the price of a part from the barn. */
export interface Site extends Cell {
  /** The price of one part. */
  readonly part: ReadonlyMap<StockKind, number>
  /** Parts the building still needs: 0 when there is nothing to build. */
  readonly left: number
}

/** A watch tower with an archer: it stands on a wall cell and shoots an enemy `range` steps away or closer. */
export interface Tower {
  readonly x: number
  readonly y: number
  readonly range: number
}

/** Turns a bed grows from sowing to a ripe crop, when the level does not say. */
export const DEFAULT_GROW_TURNS = 20
/** Turns the sheep eat until the meat is there, when the level does not say. */
export const DEFAULT_FEED_TURNS = 12

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
  const levers = new Set<string>()
  const leversOn = new Set<string>()
  const gates = new Set<string>()
  const beds = new Set<string>()
  const sown = new Set<string>()
  const troughs = new Set<string>()
  let start: Cell | null = null
  let finish: Cell | null = null
  let storehouse: Cell | null = null
  const storehouses = new Set<string>()
  const width = Math.max(0, ...rows.map((r) => r.length))
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? " "
      if (ch === "#" || ch === " ") walls.add(cellKey(x, y))
      else if (ch === "c") crystals.add(cellKey(x, y))
      else if (ch === "x") traps.add(cellKey(x, y))
      else if (ch === "S") start = { x, y }
      else if (ch === "F") finish = { x, y }
      else if (ch === "H") {
        storehouse ??= { x, y }
        storehouses.add(cellKey(x, y))
      }
      else if (ch === "L" || ch === "l") {
        levers.add(cellKey(x, y))
        if (ch === "l") leversOn.add(cellKey(x, y))
      } else if (ch === "G") gates.add(cellKey(x, y))
      else if (ch === "b" || ch === "B" || ch === "R") {
        beds.add(cellKey(x, y))
        if (ch === "B") sown.add(cellKey(x, y))
        if (ch === "R") crystals.add(cellKey(x, y))
      }
      else if (ch === "t") troughs.add(cellKey(x, y))
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
    stored: 0,
    levers,
    leversOn,
    gates,
    gateLevers: new Map(),
    itemKinds: new Map(),
    beds,
    growing: new Map([...sown].map((key) => [key, DEFAULT_GROW_TURNS])),
    growTurns: DEFAULT_GROW_TURNS,
    regrowTurns: null,
    regrowAt: new Map(),
    load: [],
    troughs,
    feedTurns: DEFAULT_FEED_TURNS,
    towers: [],
    storehouses,
    barn: new Map(),
    site: null,
    mill: null
  }
}

/** What lies or lay on a cell. */
export const kindAt = (world: World, key: string): ItemKind => world.itemKinds.get(key) ?? "crystal"

/** «тут ‹морква›?»: a thing of this kind lies under the hero. */
export const itemIs = (world: World, kind: ItemKind): boolean => {
  const key = cellKey(world.hero.x, world.hero.y)
  return world.crystals.has(key) && kindAt(world, key) === kind
}

/** Things of this kind on the map at the start, and the ones still lying there. */
export const itemCount = (world: World, kind: ItemKind): { readonly total: number; readonly left: number } => {
  const keys = [...world.crystals]
  const all = new Set([...world.itemKinds.keys(), ...keys])
  return {
    total: [...all].filter((k) => kindAt(world, k) === kind).length,
    left: keys.filter((k) => kindAt(world, k) === kind).length
  }
}

/** The levers that open a gate: its own ones, or every lever of the map. */
export const leversOf = (world: World, gate: string): ReadonlySet<string> => world.gateLevers.get(gate) ?? world.levers

/** A gate stands open once all of its levers are on. */
export const gateOpen = (world: World, gate: string): boolean => [...leversOf(world, gate)].every((key) => world.leversOn.has(key))

/** Every gate stands open. True on a map without gates. */
export const gatesOpen = (world: World): boolean => [...world.gates].every((gate) => gateOpen(world, gate))

/** How many gates stand open now. */
const openGates = (world: World): number => [...world.gates].filter((gate) => gateOpen(world, gate)).length

/** A gate that is shut now. */
export const isClosedGate = (world: World, x: number, y: number): boolean => {
  const key = cellKey(x, y)
  return world.gates.has(key) && !gateOpen(world, key)
}

/** A wall, the edge of the map or a shut gate: nobody walks there now. */
export const isWall = (world: World, x: number, y: number): boolean =>
  x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(cellKey(x, y)) || isClosedGate(world, x, y)

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
export const atStorehouse = (world: World): boolean => world.storehouses.has(cellKey(world.hero.x, world.hero.y))

/** The hero stands on the mill. */
const atMill = (world: World): boolean => world.mill !== null && world.hero.x === world.mill.x && world.hero.y === world.mill.y

/** «тут будмайданчик?»: the hero stands on the build site. */
export const atSite = (world: World): boolean => world.site !== null && world.hero.x === world.site.x && world.hero.y === world.site.y

/** «скільки ‹колод› у коморі»: what lies in the barn now, with what was put there today. */
export const stockOf = (world: World, kind: StockKind): number => world.barn.get(kind) ?? 0

/** The hero carries as much as it can: «взяти» would take nothing now. Never true on a level without a limit. */
export const handsFull = (world: World): boolean =>
  (world.capacity !== null && world.carrying >= world.capacity) || world.load.includes(HEAVY_ITEM)

/** The hero stands on a lever. */
export const onLever = (world: World): boolean => world.levers.has(cellKey(world.hero.x, world.hero.y))

/** The hero stands on a lever that is on. */
export const leverOn = (world: World): boolean => world.leversOn.has(cellKey(world.hero.x, world.hero.y))

/** The hero stands on a bed where nothing grows: «посіяти» would sow there. */
export const bedEmpty = (world: World): boolean => {
  const key = cellKey(world.hero.x, world.hero.y)
  return world.beds.has(key) && !world.growing.has(key) && !world.crystals.has(key)
}

/** The hero stands on a trough where the sheep neither eat nor left meat: «нагодувати» would feed them there. */
export const sheepHungry = (world: World): boolean => {
  const key = cellKey(world.hero.x, world.hero.y)
  return world.troughs.has(key) && !world.growing.has(key) && !world.crystals.has(key)
}

/** How far «у трубу видно річ?» looks along the way ahead, in cells. */
export const SPYGLASS_RANGE = 3

/** The cell ahead holds this kind of thing ready to take. */
const readyAhead = (world: World, ready: (key: string) => boolean): boolean => {
  const next = cellAhead(world)
  const key = cellKey(next.x, next.y)
  return !isWall(world, next.x, next.y) && world.crystals.has(key) && ready(key)
}

/** «попереду дерево з колодою?»: the cell ahead is a tree (not a bed, a trough or the mine) with a log on it. */
export const woodAhead = (world: World): boolean =>
  readyAhead(world, (key) => kindAt(world, key) === "wood" && !world.beds.has(key) && !world.regrowAt.has(key))

/** «попереду стиглий гарбуз?»: the cell ahead is a bed with a ripe crop. */
export const ripeAhead = (world: World): boolean => readyAhead(world, (key) => world.beds.has(key))

/** «у трубу видно річ?»: something to take lies on one of the next `SPYGLASS_RANGE` cells, before any wall. */
export const itemAhead = (world: World): boolean => {
  const d = DELTA[world.hero.dir]
  for (let i = 1; i <= SPYGLASS_RANGE; i++) {
    const x = world.hero.x + d.x * i
    const y = world.hero.y + d.y * i
    if (isWall(world, x, y)) return false
    if (world.crystals.has(cellKey(x, y))) return true
  }
  return false
}

/** The hero stands on a bed where a crop grows and «полити» would make it ripe sooner. */
const canWater = (world: World): boolean => {
  const key = cellKey(world.hero.x, world.hero.y)
  const left = world.growing.get(key)
  return world.beds.has(key) && left !== undefined && left > wateredTurns(world)
}

/** A watered crop is ripe in at most half of its growing time. */
const wateredTurns = (world: World): number => Math.ceil(world.growTurns / 2)

export type Action = "move" | "turnLeft" | "turnRight" | "collect" | "attack" | "store" | "wait" | "pull" | "sow" | "feed" | "chop" | "water" | "build"

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
  /** «потягнути важіль» on a lever: it is switched. */
  | "pulled"
  /** «потягнути важіль» where there is no lever. */
  | "noLever"
  /** «посіяти» on an empty bed: the crop grows there now. */
  | "sown"
  /** «посіяти» off a bed, or on a bed where something grows or lies. */
  | "cannotSow"
  /** «нагодувати» on a hungry trough with a pumpkin in the hands: the sheep eat, and meat lies there later. */
  | "fed"
  /** «нагодувати» off a trough, where the sheep are not hungry, or without a pumpkin. */
  | "cannotFeed"
  /** «полити» on a bed where a crop grows: it is ripe in half of its time at most. */
  | "watered"
  /** «полити» off a bed, where nothing grows, or where watering gives nothing any more. */
  | "cannotWater"
  /** «віднести на склад» on the mill with pumpkins: they are flour in the barn now. */
  | "milled"
  /** «будувати» on the build site with the price in the barn: one more part stands. */
  | "built"
  /** «будувати» off the site, with nothing left to build, or with too little in the barn. */
  | "cannotBuild"

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
  /** The hero switched the lever: on or off now. */
  | { readonly type: "leverPulled"; readonly at: Cell; readonly on: boolean }
  /** «потягнути важіль» where there is no lever. */
  | { readonly type: "noLever"; readonly at: Cell }
  /** The last lever went on: the gates are open. */
  | { readonly type: "gatesOpened" }
  /** A lever went off: the gates shut. */
  | { readonly type: "gatesClosed" }
  /** The hero sowed the bed under it. */
  | { readonly type: "seedSown"; readonly at: Cell }
  /** «посіяти» where the hero could not sow. */
  | { readonly type: "cannotSow"; readonly at: Cell }
  /** The hero gave the sheep a pumpkin at the trough. */
  | { readonly type: "sheepFed"; readonly at: Cell }
  /** «нагодувати» where the hero could not feed. */
  | { readonly type: "cannotFeed"; readonly at: Cell }
  /** The hero watered the bed under it. */
  | { readonly type: "bedWatered"; readonly at: Cell }
  /** «полити» where watering gave nothing. */
  | { readonly type: "cannotWater"; readonly at: Cell }
  /** The mill ground the pumpkins the hero brought: `count` of flour in the barn. */
  | { readonly type: "flourMilled"; readonly at: Cell; readonly count: number }
  /** One more part of the building stands on the site: `left` parts to go. */
  | { readonly type: "partBuilt"; readonly at: Cell; readonly left: number }
  /** «будувати» where nothing could be built. */
  | { readonly type: "cannotBuild"; readonly at: Cell }
  /** A crop got ripe or a tree grew a thing again: it lies on the cell now. */
  | { readonly type: "itemGrew"; readonly at: Cell }
  /** The archer of a tower shot an enemy: `hp` left, 0 when it is down. */
  | { readonly type: "towerShot"; readonly from: Cell; readonly id: number; readonly hp: number }

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
  if (action === "pull") return pull(world)
  if (action === "sow") return sow(world)
  if (action === "feed") return feed(world)
  if (action === "water") return water(world)
  if (action === "build") return build(world)
  const key = cellKey(world.hero.x, world.hero.y)
  if (!world.crystals.has(key)) return { world, outcome: "nothingToCollect", events: [{ type: "nothingToTake", at: here }] }
  const kind = kindAt(world, key)
  // «рубати сокирою» takes only a log off a tree: the tree grows it again in half the time.
  const onTree = kind === "wood" && !world.beds.has(key) && !world.troughs.has(key) && !world.regrowAt.has(key)
  if (action === "chop" && !onTree) return { world, outcome: "nothingToCollect", events: [{ type: "nothingToTake", at: here }] }
  if (handsFull(world) || (kind === HEAVY_ITEM && world.carrying > 0)) return { world, outcome: "handsFull", events: [{ type: "handsFull", at: here }] }
  const crystals = new Set(world.crystals)
  crystals.delete(key)
  // A tree grows its thing again after a while, the mine after its own; a bed and a trough stay empty until worked.
  const regrow = action === "chop" && world.regrowTurns !== null ? Math.ceil(world.regrowTurns / 2) : world.regrowTurns
  const again = world.regrowAt.get(key) ?? (world.beds.has(key) || world.troughs.has(key) ? null : regrow)
  const growing = again === null ? world.growing : new Map([...world.growing, [key, again]])
  const load = [...world.load, kind]
  return { world: { ...world, crystals, growing, load, carrying: load.length }, outcome: "collected", events: [{ type: "itemTaken", at: here }] }
}

/** «нагодувати»: on a hungry trough the hero gives the sheep one pumpkin it carries; the meat lies there later. */
const feed = (world: World): ActionResult => {
  const here = at(world.hero)
  const i = world.load.indexOf(FEED_ITEM)
  if (!sheepHungry(world) || i < 0) return { world, outcome: "cannotFeed", events: [{ type: "cannotFeed", at: here }] }
  const load = world.load.filter((_, j) => j !== i)
  const growing = new Map([...world.growing, [cellKey(here.x, here.y), world.feedTurns]])
  return { world: { ...world, growing, load, carrying: load.length }, outcome: "fed", events: [{ type: "sheepFed", at: here }] }
}

/** «полити»: the crop on the bed under the hero is ripe in half of its growing time at most. */
const water = (world: World): ActionResult => {
  const here = at(world.hero)
  if (!canWater(world)) return { world, outcome: "cannotWater", events: [{ type: "cannotWater", at: here }] }
  const growing = new Map([...world.growing, [cellKey(here.x, here.y), wateredTurns(world)]])
  return { world: { ...world, growing }, outcome: "watered", events: [{ type: "bedWatered", at: here }] }
}

/** «посіяти»: on an empty bed the crop starts to grow. */
const sow = (world: World): ActionResult => {
  const here = at(world.hero)
  if (!bedEmpty(world)) return { world, outcome: "cannotSow", events: [{ type: "cannotSow", at: here }] }
  const growing = new Map([...world.growing, [cellKey(here.x, here.y), world.growTurns]])
  return { world: { ...world, growing }, outcome: "sown", events: [{ type: "seedSown", at: here }] }
}

/** One turn passes for what grows: a crop or a thing that is ready lies on its cell now. */
const growTurn = (world: World): { readonly world: World; readonly events: ReadonlyArray<GameEvent> } => {
  if (world.growing.size === 0) return { world, events: [] }
  const growing = new Map<string, number>()
  const crystals = new Set(world.crystals)
  const events: Array<GameEvent> = []
  for (const [key, left] of world.growing) {
    if (left > 1) {
      growing.set(key, left - 1)
      continue
    }
    crystals.add(key)
    const [x, y] = key.split(",").map(Number)
    events.push({ type: "itemGrew", at: { x: x ?? 0, y: y ?? 0 } })
  }
  return { world: { ...world, growing, crystals }, events }
}

/** The barn with `n` more of a kind. */
const addTo = (barn: ReadonlyMap<StockKind, number>, kind: StockKind, n: number): ReadonlyMap<StockKind, number> =>
  new Map([...barn, [kind, (barn.get(kind) ?? 0) + n]])

/**
 * «віднести на склад»: on the storehouse the hero puts down everything it carries. On the mill it puts down only the
 * pumpkins: the millstones grind them, and the flour lies in the barn.
 */
const store = (world: World): ActionResult => {
  const here = at(world.hero)
  if (atMill(world)) {
    const ground = world.load.filter((k) => k === FEED_ITEM).length
    if (ground === 0) return { world, outcome: "nothingToStore", events: [{ type: "nothingToStore", at: here }] }
    const load = world.load.filter((k) => k !== FEED_ITEM)
    return {
      world: { ...world, load, carrying: load.length, barn: addTo(world.barn, FLOUR, ground) },
      outcome: "milled",
      events: [{ type: "flourMilled", at: here, count: ground }]
    }
  }
  if (!atStorehouse(world)) return { world, outcome: "notStorehouse", events: [{ type: "nothingToStore", at: here }] }
  if (world.carrying === 0) return { world, outcome: "nothingToStore", events: [{ type: "nothingToStore", at: here }] }
  return {
    world: { ...world, stored: world.stored + world.carrying, carrying: 0, load: [], barn: world.load.reduce((b, k) => addTo(b, k, 1), world.barn) },
    outcome: "stored",
    events: [{ type: "itemsStored", at: here, count: world.carrying }]
  }
}

/** «будувати»: on the site, with the price of a part in the barn, one more part stands and the price leaves the barn. */
const build = (world: World): ActionResult => {
  const here = at(world.hero)
  const site = world.site
  const cannot: ActionResult = { world, outcome: "cannotBuild", events: [{ type: "cannotBuild", at: here }] }
  if (site === null || !atSite(world) || site.left <= 0) return cannot
  if ([...site.part].some(([kind, n]) => stockOf(world, kind) < n)) return cannot
  const barn = [...site.part].reduce((b, [kind, n]) => addTo(b, kind, -n), world.barn)
  const left = site.left - 1
  return { world: { ...world, barn, site: { ...site, left } }, outcome: "built", events: [{ type: "partBuilt", at: here, left }] }
}

/** «потягнути важіль»: switches the lever under the hero. The gates follow: open when every lever is on. */
const pull = (world: World): ActionResult => {
  const here = at(world.hero)
  const key = cellKey(here.x, here.y)
  if (!world.levers.has(key)) return { world, outcome: "noLever", events: [{ type: "noLever", at: here }] }
  const leversOn = new Set(world.leversOn)
  const on = !leversOn.has(key)
  if (on) leversOn.add(key)
  else leversOn.delete(key)
  const after = { ...world, leversOn }
  const wasOpen = openGates(world)
  const isOpen = openGates(after)
  const gate: ReadonlyArray<GameEvent> = wasOpen === isOpen ? [] : [isOpen > wasOpen ? { type: "gatesOpened" } : { type: "gatesClosed" }]
  return { world: after, outcome: "pulled", events: [{ type: "leverPulled", at: here, on }, ...gate] }
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

/**
 * After the enemies, each tower shoots the nearest enemy that is up and within its range, the first of them on a tie.
 * The towers shoot in order, so two towers can take the same enemy down in one turn.
 */
const towersTurn = (world: World): { readonly world: World; readonly events: ReadonlyArray<GameEvent> } => {
  if (world.towers.length === 0 || !world.enemies.some(isAlive)) return { world, events: [] }
  let enemies = world.enemies
  const events: Array<GameEvent> = []
  for (const tower of world.towers) {
    const target = enemies
      .filter((e) => isAlive(e) && distance(e, tower) <= tower.range)
      .reduce<Enemy | null>((best, e) => (best === null || distance(e, tower) < distance(best, tower) ? e : best), null)
    if (target === null) continue
    const hp = target.hp - 1
    enemies = enemies.map((e) => (e.id === target.id ? { ...e, hp, swinging: false } : e))
    events.push({ type: "towerShot", from: at(tower), id: target.id, hp })
    if (hp <= 0) events.push({ type: "enemyDown", id: target.id })
  }
  return { world: { ...world, enemies }, events }
}

/** Outcomes that end the run at once: the enemies do not move after them. */
export const isFatal = (outcome: Outcome): boolean => outcome === "crashed" || outcome === "fell" || outcome === "tired"

/** One hero action, then the enemies' turn. A crash, a trap or the end of the steps ends the run at once. */
export const applyAction = (world: World, action: Action): ActionResult => {
  const done = heroAction(world, action)
  if (isFatal(done.outcome)) return done
  const turn = enemiesTurn(done.world)
  const shot = towersTurn(turn.world)
  const grown = growTurn(shot.world)
  return { world: grown.world, outcome: done.outcome, events: [...done.events, ...turn.events, ...shot.events, ...grown.events] }
}
