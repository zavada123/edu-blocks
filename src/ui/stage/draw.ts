import type { HeroId } from "../../core/heroes.ts"
import type { ItemKind, Npc, Prop, Scene, TerrainPaint, TileMap } from "../../core/level.ts"
import { baseTiles, paintLetters, paintTiles, parseTerrainRef } from "../../core/terrain.ts"
import { tilesOfKind } from "../../core/tilemap.ts"
import { type Cell, cellKey, gateOpen, type World } from "../../core/world.ts"
import {
  type Art,
  art,
  ART_PACK_FREE,
  attackClips,
  baseArt,
  BRIDGE_ART,
  DEAD_ART,
  ENEMY_ART,
  fighterOf,
  FINISH_ART,
  FOAM_ART,
  FIRE_ART,
  GROUND_ART,
  HERO_ART,
  ITEM_ART,
  type Look,
  NPC_ART,
  OBSTACLE_ART,
  pickClip,
  POINTER_ART,
  PROP_ART,
  SPRING_ROCKS_ART,
  TAKE_CLIPS,
  TREE_ART,
  TREES,
  AUTUMN_BIRCH,
  SWAYING_BUSHES,
  WATER_ART
} from "../art.ts"
import { PROPS, type Season } from "../look.ts"
import { cellHash, type Obstacle, type Scenery } from "../scenery.ts"
import { spriteOf } from "./packs.ts"
import { drawFigure, drawPlaced, drawTile, isAnimated, layerOf, placedDepth } from "./sprites.ts"
import { walkClip } from "../../core/assets.ts"
import type { Effect, EnemyPose, HeroPose, StagePose } from "./playback.ts"
import { groundTile, tileByRole } from "./tiles.ts"
import { drawWeather } from "./weather.ts"

/**
 * Drawing the field on a canvas, all from the Tiny Swords packs (see art.ts). One cell is 16 canvas units; a pack
 * picture is scaled so that one cell of the pack (64 pixels) is one cell of the field. The ground and the bushes do
 * not move, so they are drawn once (`drawGround`); everything else is drawn each animation frame (`drawActors`):
 * villagers, traps, the goal, items, trees, enemies and the hero by depth, effects, weather and the counters on top.
 */

export const CELL = 16

/** Hero looks: the heroes of `HEROES`. */
export type Skin = HeroId

/** Figures stand a little above the bottom of their cell, so their feet are on it. */
const FEET = 3
const BOSS_SCALE = 1.5
/** A tree of the scenery takes 2×2 cells: smaller than the pack draws it, so its crown does not hide the path. */
const TREE_SCALE = 0.8
/** A bush of the Free Pack is drawn for two cells; one cell of the field holds it at this size. */
const BUSH_SCALE = 0.85
/** How tall a figure of the pack stands, in canvas units: where a bar over its head goes. */
const HEAD = 20
const HEART = 9
const HUD_BACK = "rgba(30, 20, 30, 0.45)"
const DANGER = "#ff3355"
const ICE = "rgba(225, 242, 255, 0.62)"

type Ctx = CanvasRenderingContext2D

const ellipse = (ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string) => {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

const shadow = (ctx: Ctx, cx: number, cy: number, scale = 1) => ellipse(ctx, cx, cy + 5, 4.5 * scale, 1.4 * scale, "rgba(0, 0, 0, 0.22)")

/** Draws with a filter where the browser can filter a canvas; elsewhere just the picture. */
const withFilter = (ctx: Ctx, filter: string | undefined, draw: () => void) => {
  if (filter === undefined) {
    draw()
    return
  }
  ctx.save()
  if ("filter" in ctx) ctx.filter = filter
  draw()
  ctx.restore()
}

/** A look standing on cell (x, y), or at (`cx`, `bottom`). */
const stand = (ctx: Ctx, look: Look, cx: number, bottom: number, now: number, extra: { readonly flip?: boolean; readonly scale?: number } = {}) => {
  const found = art(look.id)
  if (found === null) return null
  return drawFigure(ctx, found, {
    cx,
    bottom,
    now,
    ...(look.clip === undefined ? {} : { clip: look.clip }),
    scale: (look.scale ?? 1) * (extra.scale ?? 1),
    ...(extra.flip === undefined ? {} : { flip: extra.flip })
  })
}

const cellBottom = (y: number) => (y + 1) * CELL - FEET

// ── Ground: drawn once ───────────────────────────────────────────────────────────────────────────────────────────

export interface GroundInput {
  readonly world: World
  readonly scene: Scene
  readonly season: Season
  readonly scenery: Scenery
}

/** The flat layers of a hand-drawn tile map, in place of the field's own ground. */
const tilemapGround = (ctx: Ctx, map: TileMap) => {
  const tileset = spriteOf(map.tileset)
  if (tileset === null) return
  for (const t of tilesOfKind(map, "ground")) drawTile(ctx, tileset, t.tile, t.x, t.y)
}

const describedTiles = (sprite: string) => spriteOf(sprite)?.sprite.tiles ?? null

/** The tileset of a ground of a painting: null while its pack loads. */
const tilesetOf = (ref: string | undefined) => {
  const parsed = ref === undefined ? null : parseTerrainRef(ref)
  return parsed === null ? null : spriteOf(parsed.sprite)
}

/** The base of a painted ground under the whole view. False while it loads or when the painting has none. */
const paintedBase = (ctx: Ctx, paint: TerrainPaint, view: Scenery["view"]): boolean => {
  const tileset = tilesetOf(paint.base)
  if (tileset === null || paint.base === undefined) return false
  for (const t of baseTiles(paint.base, view, describedTiles)) drawTile(ctx, tileset, t.tile, t.x, t.y)
  return true
}

/** Paths, water and sand painted by cells, each tile fitted to its neighbours. */
const paintedGround = (ctx: Ctx, paint: TerrainPaint) => {
  for (const letter of paintLetters(paint)) {
    const tileset = tilesetOf(paint.kinds[letter])
    if (tileset === null) continue
    for (const t of paintTiles(paint, letter, describedTiles)) drawTile(ctx, tileset, t.tile, t.x, t.y)
  }
}

/** A bush of the Free Pack that sways, for a bush of the scenery; null for other obstacles or without the Free Pack. */
const swayingBush = (kind: Obstacle, x: number, y: number): Art | null => {
  if (kind !== "bush" && kind !== "bushRound") return null
  const id = SWAYING_BUSHES[cellHash(x, y, 7) % SWAYING_BUSHES.length] ?? ""
  return spriteOf(`${ART_PACK_FREE}:${id}`)
}

/** The tree that grows at a place: a fir or a birch, the same each time; the public fir without the Free Pack. */
const treeAt = (x: number, y: number, theme: Scene["theme"]): { readonly art: Art; readonly autumnal: boolean } | null => {
  const id = TREES[cellHash(x, y, 8) % TREES.length] ?? TREE_ART
  const look = id === "decor/tree-3" && theme === "autumn" ? AUTUMN_BIRCH : id
  const free = spriteOf(`${ART_PACK_FREE}:${look}`)
  if (free !== null) return { art: free, autumnal: look === AUTUMN_BIRCH }
  const fir = art(TREE_ART)
  return fir === null ? null : { art: fir, autumnal: false }
}

const SHEEP_ART = "animal/sheep"
/** One round of a sheep, in seconds: it grazes, walks a cell to the right, grazes, walks back. */
const SHEEP_ROUND = 14
const SHEEP_GRAZE = 5.5
const SHEEP_WALK = 1.5

interface SheepPose {
  readonly x: number
  readonly y: number
  readonly walking: boolean
  readonly left: boolean
}

/** Where a sheep of the meadow is now: each starts its round at its own moment. */
const sheepAt = (home: { readonly x: number; readonly y: number }, now: number): SheepPose => {
  const t = (now / 1000 + (cellHash(home.x, home.y, 15) % SHEEP_ROUND)) % SHEEP_ROUND
  const there = SHEEP_GRAZE + SHEEP_WALK
  if (t < SHEEP_GRAZE) return { x: home.x, y: home.y, walking: false, left: false }
  if (t < there) return { x: home.x + (t - SHEEP_GRAZE) / SHEEP_WALK, y: home.y, walking: true, left: false }
  if (t < there + SHEEP_GRAZE) return { x: home.x + 1, y: home.y, walking: false, left: true }
  return { x: home.x + 1 - (t - there - SHEEP_GRAZE) / SHEEP_WALK, y: home.y, walking: true, left: true }
}

const sheepFigure = (ctx: Ctx, pose: SheepPose, now: number) => {
  const sheep = art(SHEEP_ART)
  if (sheep === null) return
  const clip = pose.walking ? pickClip(sheep.sprite, ["run", "walk", "idle"]) : pickClip(sheep.sprite, ["graze", "idle"])
  const cx = (pose.x + 0.5) * CELL
  shadow(ctx, cx, (pose.y + 0.5) * CELL, 0.8)
  drawFigure(ctx, sheep, { cx, bottom: cellBottom(pose.y), now, flip: pose.left, ...(clip === null ? {} : { clip }), scale: 0.85 })
}

/** Cliff walls by their neighbours in the row: a lone cell, the left end, the right end or the middle. */
const PLATEAU_ART = "tileset/ground-3"
const CLIFF_ROLES = { single: 3, left: 0, right: 2, middle: 1 } as const

/**
 * Plateaus in the meadow, as the Tiny Swords guide lays them: the shadow one cell down, the grass on top with its
 * edges, and a stone wall under the bottom row. Only with the Free Pack, whose ground has plateaus and cliffs.
 */
const raisedGround = (ctx: Ctx, scenery: Scenery) => {
  if (scenery.plateau.size === 0) return
  // The plateau grass is greener than the meadow, as the pack advises, so the heights read apart.
  const ground = spriteOf(`${ART_PACK_FREE}:${PLATEAU_ART}`) ?? spriteOf(`${ART_PACK_FREE}:${GROUND_ART}`)
  if (ground === null || groundTile(ground.sprite, "plateau", 0) === null) return
  const cells = (keys: ReadonlySet<string>) => [...keys].map((key) => key.split(",").map(Number) as [number, number])
  const top = (x: number, y: number) => scenery.plateau.has(cellKey(x, y))
  const shade = spriteOf(`${ART_PACK_FREE}:terrain/shadow`)
  if (shade !== null) {
    const { anchor } = shade.sprite
    const drop = anchor === undefined ? 0 : ((anchor[1] - (shade.sprite.size[1] ?? 0) / 2) * CELL) / shade.pack.cell
    for (const [x, y] of cells(scenery.plateau)) drawFigure(ctx, shade, { cx: (x + 0.5) * CELL, bottom: (y + 1.5) * CELL + drop, now: 0 })
  }
  for (const [x, y] of cells(scenery.plateau)) {
    const mask = (top(x, y - 1) ? 0 : 1) | (top(x + 1, y) ? 0 : 2) | (top(x, y + 1) ? 0 : 4) | (top(x - 1, y) ? 0 : 8)
    const tile = groundTile(ground.sprite, "plateau", mask)
    if (tile !== null) drawTile(ctx, ground, tile, x, y)
  }
  const walls = (ground.sprite.tiles ?? []).filter((t) => t.terrain === "cliff" && t.role === "wall").sort((a, b) => a.col - b.col)
  for (const [x, y] of cells(scenery.cliffs)) {
    const left = scenery.cliffs.has(cellKey(x - 1, y))
    const right = scenery.cliffs.has(cellKey(x + 1, y))
    const role = !left && !right ? "single" : !left ? "left" : !right ? "right" : "middle"
    const tile = walls[CLIFF_ROLES[role]]
    if (tile !== undefined) drawTile(ctx, ground, tile.index, x, y)
  }
}

/** Grass, the ground or the ice under the path, flowers, bushes and stones; or the flat layers of a tile map. */
export const drawGround = (ctx: Ctx, { world, scene, season, scenery }: GroundInput) => {
  if (scene.tilemap !== undefined) tilemapGround(ctx, scene.tilemap)
  else if (scene.terrain === undefined || !paintedBase(ctx, scene.terrain, scenery.view)) naturalGround(ctx, { world, scene, season, scenery })
  if (scene.terrain !== undefined) paintedGround(ctx, scene.terrain)
  if (season.tint !== undefined) {
    const { view } = scenery
    ctx.fillStyle = season.tint
    ctx.fillRect(view.x * CELL, view.y * CELL, view.width * CELL, view.height * CELL)
  }
  // Pictures of the packs that lie flat and still: tiles, water, a rug.
  for (const placed of scene.sprites ?? []) {
    const found = spriteOf(placed.asset)
    if (found !== null && layerOf(placed, found) === "ground" && !isAnimated(placed, found)) drawPlaced(ctx, placed, 0)
  }
  const { width, height } = world
  withFilter(ctx, season.plants, () => {
    for (const { x, y, kind } of scenery.decor) {
      // Flowers and grass grow only in the meadow: on the path they would look like a wall.
      const look = x < 0 || y < 0 || x >= width || y >= height ? season.decor[kind] : null
      if (look !== null) stand(ctx, look, (x + 0.5) * CELL, cellBottom(y), 0)
    }
    for (const { x, y, kind } of scenery.obstacles) {
      if (swayingBush(kind, x, y) === null) stand(ctx, OBSTACLE_ART[kind], (x + 0.5) * CELL, cellBottom(y) + 1, 0)
    }
  })
}

/**
 * The field's own ground. Under everything lies sand (or water for ice and a bridge); grass covers every cell where
 * the hero does not walk, with soft edges toward the path, as the islands of Tiny Swords lie on the sand.
 */
/**
 * The grass of the meadow: the newer grass of the Free Pack when it is served, whose edges end in a light shore over
 * water as in the pack's own maps; else the grass of the public pack.
 */
const meadowArt = (ground: Art): { readonly art: Art; readonly terrain: "grass" | "ground" } => {
  const free = spriteOf(`${ART_PACK_FREE}:${GROUND_ART}`)
  return free !== null && groundTile(free.sprite, "ground", 0) !== null ? { art: free, terrain: "ground" } : { art: ground, terrain: "grass" }
}

const naturalGround = (ctx: Ctx, { world, scene, scenery }: GroundInput) => {
  const ground = baseArt(GROUND_ART)
  const water = baseArt(WATER_ART)
  if (ground === null || water === null) return
  const { view } = scenery
  const kind = scene.ground ?? "path"
  const meadow = meadowArt(ground)
  const { width, height, walls } = world
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height
  const open = (x: number, y: number) => inside(x, y) && !walls.has(cellKey(x, y))
  // Where there is no grass: the path or the ice, or the whole lake under a bridge.
  // Ponds stay empty here: `drawWater` puts the water and its foam under this layer each frame.
  const pond = (x: number, y: number) => scenery.water.has(cellKey(x, y))
  const low = kind === "bridge" ? inside : (x: number, y: number) => open(x, y) || pond(x, y)
  for (let y = view.y; y < view.y + view.height; y++) {
    for (let x = view.x; x < view.x + view.width; x++) {
      if (pond(x, y)) continue
      // Sand ends at the water in a beach, as the grass does.
      const shore = (pond(x, y - 1) ? 1 : 0) | (pond(x + 1, y) ? 2 : 0) | (pond(x, y + 1) ? 4 : 0) | (pond(x - 1, y) ? 8 : 0)
      const sand = groundTile(ground.sprite, "sand", shore)
      if (kind === "path" && sand !== null) drawTile(ctx, ground, sand, x, y)
      else drawTile(ctx, water, 1, x, y)
    }
  }
  if (kind === "ice") {
    ctx.fillStyle = ICE
    ctx.fillRect(view.x * CELL, view.y * CELL, view.width * CELL, view.height * CELL)
  }
  for (let y = view.y; y < view.y + view.height; y++) {
    for (let x = view.x; x < view.x + view.width; x++) {
      if (low(x, y) || pond(x, y)) continue
      const mask = (low(x, y - 1) ? 1 : 0) | (low(x + 1, y) ? 2 : 0) | (low(x, y + 1) ? 4 : 0) | (low(x - 1, y) ? 8 : 0)
      const tile = groundTile(meadow.art.sprite, meadow.terrain, mask)
      if (tile !== null) drawTile(ctx, meadow.art, tile, x, y)
    }
  }
  raisedGround(ctx, scenery)
  if (kind === "path") {
    // Now and then a few pebbles on the path.
    const pebbles = ground.sprite.tiles?.find((t) => t.terrain === "sand" && t.role === "detail")?.index
    for (const { x, y, kind: decor } of scenery.decor) if (decor === "petals" && open(x, y) && pebbles !== undefined) drawTile(ctx, ground, pebbles, x, y)
  }
  if (kind === "bridge") bridge(ctx, open, width, height)
}

/** Planks over the water: along a row where the path runs sideways, along a column where it runs up and down. */
const bridge = (ctx: Ctx, open: (x: number, y: number) => boolean, width: number, height: number) => {
  const planks = baseArt(BRIDGE_ART)
  if (planks === null) return
  const sideways = tileByRole(planks.sprite, "horizontal-middle")
  const upright = tileByRole(planks.sprite, "vertical-middle")
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!open(x, y)) continue
      const across = open(x - 1, y) || open(x + 1, y)
      const along = open(x, y - 1) || open(x, y + 1)
      const tile = across || !along ? sideways : upright
      if (tile !== null) drawTile(ctx, planks, tile, x, y)
      // A crossing gets both, so the planks meet.
      if (across && along && upright !== null) drawTile(ctx, planks, upright, x, y)
    }
  }
}

export interface WaterInput {
  readonly scenery: Scenery
  readonly now: number
  readonly still: boolean
}

/** Each shore cell starts its waves at its own moment, as the pack advises: up to this many ms apart. */
const FOAM_SPREAD_MS = 1600

/**
 * The water of ponds and the sea, under the ground layer: water tiles, then white foam centred on every cell of land
 * that touches the water. The ground drawn over it covers the inner part of the foam, so only the surf shows.
 */
export const drawWater = (ctx: Ctx, { scenery, now, still }: WaterInput) => {
  if (scenery.water.size === 0) return
  const water = baseArt(WATER_ART)
  const foam = art(FOAM_ART)
  const cells = [...scenery.water].map((key) => key.split(",").map(Number) as [number, number])
  if (water !== null) for (const [x, y] of cells) drawTile(ctx, water, 1, x, y)
  if (foam === null) return
  const shores = new Set<string>()
  for (const [x, y] of cells) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = cellKey(x + dx, y + dy)
        if (!scenery.water.has(key)) shores.add(key)
      }
    }
  }
  // The foam frame is centred on its cell: from the middle of the frame down to the point it stands by.
  const { frame, anchor } = foam.sprite
  const drop = frame === undefined || anchor === undefined ? 0 : ((anchor[1] - frame[1] / 2) * CELL) / foam.pack.cell
  for (const key of shores) {
    const [x = 0, y = 0] = key.split(",").map(Number)
    const phase = cellHash(x, y, 9) % FOAM_SPREAD_MS
    drawFigure(ctx, foam, { cx: (x + 0.5) * CELL, bottom: (y + 0.5) * CELL + drop, clip: "play", now: still ? phase : now + phase })
  }
}

// ── Actors: drawn every animation frame ─────────────────────────────────────────────────────────────────────────

export interface ActorsInput {
  readonly pose: StagePose
  readonly scene: Scene
  readonly season: Season
  readonly scenery: Scenery
  readonly skin: Skin
  /** Every item cell of the level, also the taken ones: a lit campfire stays where it was. */
  readonly items: ReadonlyArray<{ readonly x: number; readonly y: number }>
  /** Milliseconds, for the looping animations: flags, flames, trees in the wind, weather. */
  readonly now: number
  /** The viewer asked for less motion: nothing loops and no weather falls. */
  readonly still: boolean
  /** The counter of the program, when the level has one. */
  readonly counter?: string | undefined
}

/** Villagers stand and breathe, each at their own pace, some facing left. */
const villager = (ctx: Ctx, npc: Npc, now: number, still: boolean) => {
  const cx = npc.x * CELL + CELL / 2
  const bottom = cellBottom(npc.y)
  shadow(ctx, cx, npc.y * CELL + CELL / 2)
  const t = still ? 0 : now + (cellHash(npc.x, npc.y, 11) % 8) * 300
  const own = npc.look === undefined ? null : spriteOf(npc.look)
  if (own !== null) {
    drawFigure(ctx, own, { cx, bottom: (npc.y + 1) * CELL, now: t })
    return
  }
  stand(ctx, NPC_ART[npc.who], cx, bottom, t, { flip: cellHash(npc.x, npc.y, 12) % 2 === 0 })
}

/** A trap: thin ice with cracks in winter, a pit in the ground otherwise. Once the hero fell in, the ice is broken. */
const trap = (ctx: Ctx, cx: number, cy: number, icy: boolean, broken: boolean) => {
  if (!icy) {
    ellipse(ctx, cx, cy + 1, 6.5, 5, "#7a4a26")
    ellipse(ctx, cx, cy + 1.5, 5, 3.6, "#2b1a10")
    return
  }
  ctx.beginPath()
  ctx.roundRect(cx - 7, cy - 6, 14, 12, 5)
  ctx.fillStyle = "#cfe8ff"
  ctx.fill()
  ctx.lineWidth = 0.6
  ctx.strokeStyle = "#8fc3ef"
  ctx.stroke()
  if (broken) {
    ellipse(ctx, cx, cy + 0.5, 5.5, 4, "#1d4f7c")
    return
  }
  ctx.beginPath()
  ctx.moveTo(cx - 5, cy - 3)
  ctx.lineTo(cx - 1, cy)
  ctx.lineTo(cx - 3, cy + 4)
  ctx.moveTo(cx - 1, cy)
  ctx.lineTo(cx + 3, cy - 1)
  ctx.lineTo(cx + 5, cy + 3)
  ctx.moveTo(cx + 3, cy - 1)
  ctx.lineTo(cx + 4, cy - 4)
  ctx.lineWidth = 0.7
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = "#3d74a8"
  ctx.stroke()
}

const flame = (ctx: Ctx, cx: number, bottom: number, now: number, still: boolean) =>
  stand(ctx, { id: FIRE_ART, scale: 0.55 }, cx, bottom, still ? 0 : now)

/** The water cells next to the goal and joined to it: the pond of a spring. */
const pondBy = (water: ReadonlySet<string>, goal: Cell): ReadonlyArray<Cell> => {
  const seen = new Set<string>()
  const queue: Array<Cell> = [goal]
  const found: Array<Cell> = []
  while (queue.length > 0) {
    const c = queue.shift() as Cell
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { x: c.x + dx, y: c.y + dy }
      const key = cellKey(n.x, n.y)
      if (!water.has(key) || seen.has(key)) continue
      seen.add(key)
      found.push(n)
      queue.push(n)
    }
  }
  return found
}

/** The goal. A well is a spring in the grass: water with stones. At home the house is the goal: the cell is marked. */
const finishLook = (ctx: Ctx, scene: Scene, x: number, y: number, now: number, still: boolean, pond: ReadonlyArray<Cell>) => {
  const kind = scene.finish ?? "flag"
  const cx = x * CELL + CELL / 2
  const own = scene.finishLook === undefined ? null : spriteOf(scene.finishLook)
  if (own !== null && drawFigure(ctx, own, { cx, bottom: (y + 1) * CELL, now: still ? 0 : now }) !== null) return
  const look = FINISH_ART[kind]
  if (look !== null) {
    shadow(ctx, cx, y * CELL + CELL / 2)
    stand(ctx, look, cx, cellBottom(y), still ? 0 : now)
    return
  }
  if (kind === "well" && pond.length > 0) {
    // The spring is the pond by the goal: a few stones with foam in its far corner.
    const far = pond.reduce((a, b) => (Math.abs(b.x - x) + Math.abs(b.y - y) > Math.abs(a.x - x) + Math.abs(a.y - y) ? b : a))
    stand(ctx, { id: SPRING_ROCKS_ART, clip: "play" }, (far.x + 0.5) * CELL, (far.y + 1) * CELL - 3, still ? 0 : now)
    return
  }
  if (kind === "well") {
    const water = baseArt(WATER_ART)
    if (water !== null) drawTile(ctx, water, 1, x, y)
    stand(ctx, { id: SPRING_ROCKS_ART }, cx, (y + 1) * CELL - 1, still ? 0 : now)
    return
  }
  const pointer = art(POINTER_ART)
  if (pointer === null) return
  ctx.save()
  ctx.globalAlpha = still ? 0.9 : 0.65 + 0.35 * Math.sin(now / 300)
  drawFigure(ctx, pointer, { cx, bottom: (y + 1) * CELL, now: 0 })
  ctx.restore()
}

/** Things a storehouse shows at most: a pile, not every log. */
const STOREHOUSE_PILE = 3

/** The storehouse: a marked cell with a pile of what was put down there. */
const storehouseLook = (ctx: Ctx, scene: Scene, x: number, y: number, stored: number) => {
  const cx = x * CELL + CELL / 2
  const pointer = art(POINTER_ART)
  if (pointer !== null) {
    ctx.save()
    ctx.globalAlpha = 0.8
    drawFigure(ctx, pointer, { cx, bottom: (y + 1) * CELL, now: 0 })
    ctx.restore()
  }
  const look = ITEM_ART[scene.item ?? "crystal"]
  for (let i = 0; i < Math.min(stored, STOREHOUSE_PILE); i++) {
    stand(ctx, look, cx + (i - 1) * 4, cellBottom(y) - (i % 2) * 2, 0, { scale: 0.75 })
  }
}

const LEVER_ON = "#3ccf6e"
const LEVER_OFF = "#e0483c"
const WOOD = "#8a5a2b"
const WOOD_DARK = "#5c3a1a"

/** A lever on a stone base: the handle leans right with a green knob when on, left with a red knob when off. */
const leverLook = (ctx: Ctx, x: number, y: number, on: boolean) => {
  const cx = x * CELL + CELL / 2
  const base = cellBottom(y)
  shadow(ctx, cx, base - 4)
  roundRect(ctx, cx - 4, base - 3, 8, 3, 1, "#6d6f78")
  const tipX = cx + (on ? 4 : -4)
  const tipY = base - 10
  ctx.save()
  ctx.strokeStyle = WOOD_DARK
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, base - 2)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()
  ctx.restore()
  ellipse(ctx, tipX, tipY, 1.8, 1.8, on ? LEVER_ON : LEVER_OFF)
}

/** A wooden gate: planks across the cell while it is shut, only the two posts once it is open. */
const gateLook = (ctx: Ctx, x: number, y: number, open: boolean) => {
  const left = x * CELL
  const top = y * CELL
  roundRect(ctx, left, top + 2, 2, CELL - 2, 0.5, WOOD_DARK)
  roundRect(ctx, left + CELL - 2, top + 2, 2, CELL - 2, 0.5, WOOD_DARK)
  if (open) return
  for (let i = 0; i < 4; i++) roundRect(ctx, left + 2.5 + i * 2.8, top + 3, 2.2, CELL - 4, 0.6, WOOD)
  roundRect(ctx, left + 2, top + 6, CELL - 4, 1.5, 0.5, WOOD_DARK)
  roundRect(ctx, left + 2, top + CELL - 5, CELL - 4, 1.5, 0.5, WOOD_DARK)
}

/** What lies on a cell: its own item from `itemsAt`, or the level's item. */
const itemAt = (scene: Scene, x: number, y: number): { readonly kind: ItemKind; readonly own: boolean } => {
  const at = scene.itemsAt?.find((i) => i.x === Math.round(x) && i.y === Math.round(y))
  return at === undefined ? { kind: scene.item ?? "crystal", own: scene.itemLook !== undefined } : { kind: at.item, own: false }
}

const ownItem = (scene: Scene, own: boolean) => (!own || scene.itemLook === undefined ? null : spriteOf(scene.itemLook))

const itemLook = (ctx: Ctx, scene: Scene, x: number, y: number, lit: boolean, now: number, still: boolean) => {
  const cx = x * CELL + CELL / 2
  const bottom = cellBottom(y)
  const { kind, own: hasOwn } = itemAt(scene, x, y)
  const own = ownItem(scene, hasOwn)
  // Gold bobs up and down.
  const bob = kind === "crystal" && !still ? -1.2 * (0.5 - 0.5 * Math.cos(Math.PI * ((now / 1200) % 2))) : 0
  if (own !== null) drawFigure(ctx, own, { cx, bottom: (y + 1) * CELL, clip: null, now })
  else stand(ctx, ITEM_ART[kind], cx, bottom + 1 + bob, now)
  if (lit) flame(ctx, cx, bottom, now, still)
}

/** Hit points over a boss or a strong enemy. */
const hpBar = (ctx: Ctx, cx: number, top: number, hp: number, maxHp: number) => {
  const w = Math.min(14, maxHp * 3 + 1)
  roundRect(ctx, cx - w / 2, top, w, 3, 1, "rgba(30, 20, 30, 0.75)")
  roundRect(ctx, cx - w / 2 + 0.5, top + 0.5, ((w - 1) * hp) / maxHp, 2, 0.5, "#e8434f")
}

const enemyFigure = (ctx: Ctx, pose: EnemyPose, hero: HeroPose, now: number, still: boolean) => {
  if (pose.opacity <= 0) return
  const { enemy } = pose
  const scale = enemy.boss ? BOSS_SCALE : 1
  // A hit: the enemy lunges a little toward the hero.
  const lx = (hero.x - pose.x) * 0.3 * pose.lunge
  const ly = (hero.y - pose.y) * 0.3 * pose.lunge
  const cx = (pose.x + lx) * CELL + CELL / 2
  const cy = (pose.y + ly) * CELL + CELL / 2
  ctx.save()
  ctx.globalAlpha = pose.opacity
  shadow(ctx, cx, cy, scale)
  // A raised weapon: the enemy rises and falls and glows red. It hits on its next turn.
  const swing = enemy.swinging && !still ? -1.2 * Math.abs(Math.sin((now / 350) * Math.PI)) : 0
  const look = (enemy.look === undefined ? null : spriteOf(enemy.look)) ?? art(ENEMY_ART[enemy.kind])
  let top = cy - CELL / 2 - (scale - 1) * 12
  const draw = () => {
    if (look === null) return
    // A goblin drawn from the side turns to the hero; one with a raised weapon swings it.
    const side = look.sprite.layout === "side" && (hero.x === pose.x ? pose.face === "left" : hero.x < pose.x)
    const clip = still ? undefined : enemy.swinging ? (pickClip(look.sprite, ["attack", "throw", "explode"]) ?? walkClip(look.sprite)) : walkClip(look.sprite)
    const own = enemy.look !== undefined
    const drawn = drawFigure(ctx, look, {
      cx,
      bottom: (own ? cy + CELL / 2 : cellBottom(pose.y + ly)) + swing,
      clip,
      dir: pose.face,
      now: still ? 0 : now + enemy.id * 150,
      flip: side,
      scale
    })
    // The bar floats over the head, not over the torch it may raise.
    if (drawn !== null) top = cellBottom(pose.y + ly) - HEAD * scale
  }
  if (pose.flash > 0) withFilter(ctx, `brightness(${1 + 1.5 * pose.flash})`, draw)
  else if (enemy.swinging) withFilter(ctx, `drop-shadow(0 0 1.2px ${DANGER})`, draw)
  else draw()
  if (enemy.boss || enemy.maxHp > 1) hpBar(ctx, cx, top - 4, Math.max(0, enemy.hp), enemy.maxHp)
  ctx.restore()
}

/** The clip and its frame for what the hero does now. */
const heroClip = (found: Art, spriteId: string, hero: HeroPose): { readonly clip: string | null; readonly progress?: number } => {
  const { sprite } = found
  if (hero.act === "walk" || hero.act === "bump") return { clip: walkClip(sprite) }
  if (hero.act === "attack") return { clip: pickClip(sprite, [...attackClips(fighterOf(spriteId), hero.dir), "attack", "idle"]), progress: hero.progress }
  if (hero.act === "take") return { clip: pickClip(sprite, TAKE_CLIPS) }
  return { clip: pickClip(sprite, ["idle"]) }
}

const heroFigure = (ctx: Ctx, hero: HeroPose, skin: Skin, now: number, still: boolean) => {
  const spriteId = HERO_ART[skin]
  const found = art(spriteId)
  const cx = hero.x * CELL + CELL / 2
  const cy = hero.y * CELL + CELL / 2
  const scale = 1 - 0.4 * hero.fallen
  ctx.save()
  ctx.globalAlpha = 1 - 0.65 * hero.fallen
  shadow(ctx, cx, cy, scale)
  // A crash shakes the hero.
  const shake = hero.crashed ? Math.sin(now / 40) * 1.2 : 0
  const draw = () => {
    if (found === null) return
    const { clip, progress } = heroClip(found, spriteId, hero)
    drawFigure(ctx, found, {
      cx: cx + shake,
      bottom: cellBottom(hero.y) + 3 * hero.fallen,
      clip,
      // The pictures face right: a hero going left is mirrored.
      flip: hero.dir === "left",
      now: still ? 0 : now,
      scale,
      ...(progress === undefined ? {} : { progress })
    })
  }
  if (hero.act === "hurt") withFilter(ctx, `brightness(${1 + 1.2 * Math.sin(Math.PI * hero.progress)}) drop-shadow(0 0 1.5px ${DANGER})`, draw)
  else if (hero.crashed) withFilter(ctx, `drop-shadow(0 0 1.5px ${DANGER})`, draw)
  else draw()
  ctx.restore()
}

/** A building or a big tree, standing on the middle of the bottom row of its cells. */
const propFigure = (ctx: Ctx, prop: Prop, now: number) => {
  const { width, height } = PROPS[prop.kind]
  stand(ctx, PROP_ART[prop.kind], (prop.x + width / 2) * CELL, (prop.y + height) * CELL - 1, now)
}

const bubble = (ctx: Ctx, text: string, cx: number, cy: number, progress: number) => {
  ctx.save()
  ctx.globalAlpha = Math.min(1, 4 * (1 - progress))
  const y = cy - CELL / 2 - 3 - 4 * progress
  roundRect(ctx, cx - 4.5, y - 7, 9, 8, 3, "rgba(255, 255, 255, 0.92)")
  ctx.fillStyle = "#3a2a3a"
  ctx.font = "700 6.5px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(text, cx, y - 0.8)
  ctx.restore()
}

/** A blow: a white arc over the enemy, thinning as it goes. */
const slash = (ctx: Ctx, cx: number, cy: number, progress: number) => {
  ctx.save()
  ctx.globalAlpha = 1 - progress
  ctx.beginPath()
  const start = -Math.PI * 0.9 + progress * 1.2
  ctx.arc(cx, cy - 2, 6, start, start + Math.PI * 0.7)
  ctx.lineWidth = 1.6 * (1 - progress) + 0.4
  ctx.lineCap = "round"
  ctx.strokeStyle = "#ffffff"
  ctx.stroke()
  ctx.restore()
}

/** An arrow on its way from (x0, y0) to (x1, y1), `progress` of the way: a shaft with a head along an arc. */
const arrowFlight = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, progress: number) => {
  const at = (t: number) => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * CELL * 0.6 })
  const head = at(progress)
  const tail = at(Math.max(0, progress - 0.12))
  ctx.save()
  ctx.lineCap = "round"
  ctx.strokeStyle = "#5b3a1e"
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(tail.x, tail.y)
  ctx.lineTo(head.x, head.y)
  ctx.stroke()
  ctx.fillStyle = "#e9e2cf"
  ctx.beginPath()
  ctx.arc(head.x, head.y, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const effect = (ctx: Ctx, fx: Effect, scene: Scene, now: number) => {
  const { kind: item, own: hasOwn } = itemAt(scene, fx.x, fx.y)
  const cx = fx.x * CELL + CELL / 2
  const cy = fx.y * CELL + CELL / 2
  if (fx.kind === "slash") {
    slash(ctx, cx, cy, fx.progress)
    return
  }
  if (fx.kind === "arrow" && fx.from !== undefined) {
    arrowFlight(ctx, fx.from.x * CELL + CELL / 2, fx.from.y * CELL - CELL / 2, cx, cy - 4, fx.progress)
    return
  }
  if (fx.kind === "smoke") {
    // A beaten enemy turns into a skull and a puff.
    const dead = art(DEAD_ART)
    if (dead !== null) drawFigure(ctx, dead, { cx, bottom: cellBottom(fx.y), clip: "die", now, progress: fx.progress, scale: 0.8 })
    return
  }
  if (fx.kind === "lift") {
    // The taken thing rises over the hero's head and fades. A campfire is lit instead.
    if (item === "campfire") return
    ctx.save()
    ctx.globalAlpha = 1 - Math.max(0, fx.progress - 0.6) / 0.4
    const rise = 11 * Math.min(1, fx.progress * 2)
    const own = ownItem(scene, hasOwn)
    if (own !== null) drawFigure(ctx, own, { cx, bottom: cy + 4 - rise, clip: null, now, scale: 0.75 })
    else stand(ctx, ITEM_ART[item], cx, cy - 2 - rise, now, { scale: 0.8 })
    ctx.restore()
    return
  }
  bubble(ctx, fx.kind === "question" ? "?" : fx.kind === "alert" ? "!" : "z", cx, cy, fx.progress)
}

/** A heart of the HUD, full or empty. */
const heart = (ctx: Ctx, x: number, y: number, full: boolean) => {
  const s = HEART / 9
  ctx.beginPath()
  ctx.moveTo(x + 4.5 * s, y + 8 * s)
  ctx.bezierCurveTo(x - 1 * s, y + 4 * s, x + 0.5 * s, y - 0.5 * s, x + 4.5 * s, y + 2.2 * s)
  ctx.bezierCurveTo(x + 8.5 * s, y - 0.5 * s, x + 10 * s, y + 4 * s, x + 4.5 * s, y + 8 * s)
  ctx.closePath()
  ctx.fillStyle = full ? "#e8434f" : "rgba(255, 255, 255, 0.18)"
  ctx.fill()
  ctx.lineWidth = 0.8
  ctx.strokeStyle = full ? "#7d1a24" : "rgba(255, 255, 255, 0.6)"
  ctx.stroke()
  if (full) ellipse(ctx, x + 2.6 * s, y + 3 * s, 0.9 * s, 0.7 * s, "rgba(255, 255, 255, 0.7)")
}

/** A dark plate with a line of white text, for the steps and the counter. */
const plate = (ctx: Ctx, text: string, x: number, y: number) => {
  ctx.font = "700 6.5px system-ui, sans-serif"
  const w = Math.ceil(ctx.measureText(text).width) + 4
  roundRect(ctx, x - 1.5, y - 1.5, w, HEART + 3, 3, HUD_BACK)
  ctx.fillStyle = "#fff"
  ctx.textAlign = "left"
  ctx.fillText(text, x + 1, y + HEART - 1.5)
}

/** The hero stands on a cell next to the villager, sideways or across a corner. */
const nextTo = (npc: Cell, hero: Cell): boolean => Math.abs(Math.round(hero.x) - npc.x) <= 1 && Math.abs(Math.round(hero.y) - npc.y) <= 1

/** The widest line of a speech bubble, in field pixels. */
const SPEECH_WIDTH = CELL * 5
const SPEECH_LINE = 7

/** Splits a line into lines no wider than the bubble. */
const wrapText = (ctx: Ctx, text: string, width: number): ReadonlyArray<string> => {
  const lines: Array<string> = []
  let line = ""
  for (const word of text.trim().split(/\s+/)) {
    const next = line === "" ? word : `${line} ${word}`
    if (line !== "" && ctx.measureText(next).width > width) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line !== "") lines.push(line)
  return lines
}

/** What a villager says, in a bubble over their head. */
const speech = (ctx: Ctx, npc: Cell, text: string) => {
  ctx.font = "600 6px system-ui, sans-serif"
  const lines = wrapText(ctx, text, SPEECH_WIDTH)
  const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 6
  const h = lines.length * SPEECH_LINE + 4
  const cx = npc.x * CELL + CELL / 2
  const bottom = npc.y * CELL - CELL * 0.6
  const left = Math.max(1, cx - w / 2)
  roundRect(ctx, left, bottom - h, w, h, 3, "rgba(255, 255, 255, 0.95)")
  ctx.beginPath()
  ctx.moveTo(cx - 2.5, bottom)
  ctx.lineTo(cx + 2.5, bottom)
  ctx.lineTo(cx, bottom + 3)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#2b2118"
  ctx.textAlign = "left"
  lines.forEach((line, i) => ctx.fillText(line, left + 3, bottom - h + 2 + (i + 1) * SPEECH_LINE - 1.5))
}

const hud = (ctx: Ctx, { pose, scene, scenery, counter }: ActorsInput) => {
  const { world } = pose
  const x = scenery.view.x * CELL + 3
  let y = scenery.view.y * CELL + 3
  if (world.enemies.length > 0) {
    roundRect(ctx, x - 1.5, y - 1.5, world.maxHearts * (HEART + 1) + 2, HEART + 3, 3, HUD_BACK)
    for (let i = 0; i < world.maxHearts; i++) heart(ctx, x + i * (HEART + 1), y, i < world.hearts)
    y += HEART + 4
  }
  if (world.energy !== null) {
    plate(ctx, `кроків: ${world.energy}`, x, y)
    y += HEART + 4
  }
  if (world.capacity !== null) {
    plate(ctx, `у руках: ${world.carrying}/${world.capacity}`, x, y)
    y += HEART + 4
  }
  if (world.storehouse !== null) {
    plate(ctx, `${scene.storehouseName ?? "на складі"}: ${world.stored}`, x, y)
    y += HEART + 4
  }
  if (world.gates.size > 0) {
    plate(ctx, `важелі: ${world.leversOn.size}/${world.levers.size}`, x, y)
    y += HEART + 4
  }
  if (counter !== undefined) plate(ctx, `лічильник: ${counter}`, x, y)
}

/** Everything that moves or changes, over the ground. */
export const drawActors = (ctx: Ctx, input: ActorsInput) => {
  const { pose, scene, season, scenery, now, still, skin } = input
  const { world } = pose
  const sprites = (scene.sprites ?? []).map((placed) => ({ placed, found: spriteOf(placed.asset) }))
  // Pictures of the packs that lie flat and move: water, flowers in the wind.
  for (const { placed, found } of sprites) {
    if (found !== null && layerOf(placed, found) === "ground" && isAnimated(placed, found)) drawPlaced(ctx, placed, still ? 0 : now)
  }
  for (const npc of scene.npcs ?? []) villager(ctx, npc, now, still)
  for (const key of world.traps) {
    const [tx = 0, ty = 0] = key.split(",").map(Number)
    trap(ctx, tx * CELL + CELL / 2, ty * CELL + CELL / 2, season.icy, world.fell && Math.round(pose.hero.x) === tx && Math.round(pose.hero.y) === ty)
  }
  if (world.finish !== null) finishLook(ctx, scene, world.finish.x, world.finish.y, now, still, pondBy(scenery.water, world.finish))
  if (world.storehouse !== null) storehouseLook(ctx, scene, world.storehouse.x, world.storehouse.y, world.stored)
  for (const key of world.gates) {
    const [gx = 0, gy = 0] = key.split(",").map(Number)
    gateLook(ctx, gx, gy, gateOpen(world, key))
  }
  for (const key of world.levers) {
    const [lx = 0, ly = 0] = key.split(",").map(Number)
    leverLook(ctx, lx, ly, world.leversOn.has(key))
  }
  for (const { x, y } of input.items) {
    const taken = !world.crystals.has(cellKey(x, y))
    if (taken && itemAt(scene, x, y).kind !== "campfire") continue
    itemLook(ctx, scene, x, y, taken, now, still)
  }
  const map = scene.tilemap
  const tileset = map === undefined ? null : spriteOf(map.tileset)
  // Who stands lower on the field is drawn later, so a figure in front covers the one behind. A house or a tree
  // stands by its bottom row: the hero above it walks behind it, the hero below it in front.
  const figures = [
    ...(scene.props ?? []).map((p) => ({ y: p.y + PROPS[p.kind].height - 1 - 0.02, draw: () => propFigure(ctx, p, still ? 0 : now) })),
    ...scenery.trees.flatMap((t) => {
      const tree = treeAt(t.x, t.y, scene.theme)
      if (tree === null) return []
      return [{
        y: t.y + 1 - 0.02,
        draw: () =>
          // A birch already yellow for autumn keeps its own colours.
          withFilter(ctx, tree.autumnal ? undefined : season.plants, () =>
            drawFigure(ctx, tree.art, { cx: (t.x + 1) * CELL, bottom: (t.y + 2) * CELL - FEET, now: still ? 0 : now + (cellHash(t.x, t.y, 6) % 1000), scale: TREE_SCALE })
          )
      }]
    }),
    ...scenery.obstacles.flatMap(({ x, y, kind }) => {
      const bush = swayingBush(kind, x, y)
      if (bush === null) return []
      return [{
        y: y - 0.03,
        draw: () =>
          withFilter(ctx, season.plants, () =>
            drawFigure(ctx, bush, { cx: (x + 0.5) * CELL, bottom: cellBottom(y) + 1, now: still ? 0 : now + (cellHash(x, y, 13) % 1000), scale: BUSH_SCALE })
          )
      }]
    }),
    ...(map === undefined || tileset === null
      ? []
      : tilesOfKind(map, "objects").map((t) => ({ y: t.y - 0.02, draw: () => drawTile(ctx, tileset, t.tile, t.x, t.y) }))),
    ...sprites
      .filter(({ placed, found }) => found !== null && layerOf(placed, found) === "object")
      .map(({ placed }) => ({ y: placedDepth(placed) - 0.01, draw: () => drawPlaced(ctx, placed, still ? 0 : now) })),
    ...scenery.sheep.map((home) => {
      const at = sheepAt(home, still ? 0 : now)
      return { y: home.y, draw: () => sheepFigure(ctx, at, still ? 0 : now) }
    }),
    ...pose.enemies.map((e) => ({ y: e.y, draw: () => enemyFigure(ctx, e, pose.hero, now, still) })),
    { y: pose.hero.y + 0.01, draw: () => heroFigure(ctx, pose.hero, skin, now, still) }
  ]
  for (const f of figures.sort((a, b) => a.y - b.y)) f.draw()
  // Roofs and crowns of the tile map cover the hero who walks under them.
  if (map !== undefined && tileset !== null) for (const t of tilesOfKind(map, "above")) drawTile(ctx, tileset, t.tile, t.x, t.y)
  for (const npc of scene.npcs ?? []) if (npc.say !== undefined && npc.say.trim() !== "" && nextTo(npc, pose.hero)) speech(ctx, npc, npc.say)
  for (const fx of pose.effects) effect(ctx, fx, scene, now)
  if (!still && season.weather !== null) drawWeather(ctx, season.weather, scenery.view, CELL, now)
  hud(ctx, input)
}
