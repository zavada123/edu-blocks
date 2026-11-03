import type { HeroId } from "../../core/heroes.ts"
import type { ItemKind, Npc, Prop, Scene, TileMap } from "../../core/level.ts"
import { tilesOfKind } from "../../core/tilemap.ts"
import { cellKey, type World } from "../../core/world.ts"
import {
  type Art,
  art,
  attackClips,
  baseArt,
  BRIDGE_ART,
  DEAD_ART,
  ENEMY_ART,
  fighterOf,
  FINISH_ART,
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
  WATER_ART
} from "../art.ts"
import { PROPS, type Season } from "../look.ts"
import { cellHash, type Scenery } from "../scenery.ts"
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

/** Grass, the ground or the ice under the path, flowers, bushes and stones; or the flat layers of a tile map. */
export const drawGround = (ctx: Ctx, { world, scene, season, scenery }: GroundInput) => {
  if (scene.tilemap !== undefined) tilemapGround(ctx, scene.tilemap)
  else naturalGround(ctx, { world, scene, season, scenery })
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
    for (const { x, y, kind } of scenery.obstacles) stand(ctx, OBSTACLE_ART[kind], (x + 0.5) * CELL, cellBottom(y) + 1, 0)
  })
}

/**
 * The field's own ground. Under everything lies sand (or water for ice and a bridge); grass covers every cell where
 * the hero does not walk, with soft edges toward the path, as the islands of Tiny Swords lie on the sand.
 */
const naturalGround = (ctx: Ctx, { world, scene, scenery }: GroundInput) => {
  const ground = baseArt(GROUND_ART)
  const water = baseArt(WATER_ART)
  if (ground === null || water === null) return
  const { view } = scenery
  const kind = scene.ground ?? "path"
  const { width, height, walls } = world
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height
  const open = (x: number, y: number) => inside(x, y) && !walls.has(cellKey(x, y))
  // Where there is no grass: the path or the ice, or the whole lake under a bridge.
  const low = kind === "bridge" ? inside : open
  const sand = groundTile(ground.sprite, "sand", 0)
  for (let y = view.y; y < view.y + view.height; y++) {
    for (let x = view.x; x < view.x + view.width; x++) {
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
      if (low(x, y)) continue
      const mask = (low(x, y - 1) ? 1 : 0) | (low(x + 1, y) ? 2 : 0) | (low(x, y + 1) ? 4 : 0) | (low(x - 1, y) ? 8 : 0)
      const tile = groundTile(ground.sprite, "grass", mask)
      if (tile !== null) drawTile(ctx, ground, tile, x, y)
    }
  }
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

/** The goal. A well is a spring in the grass: water with stones. At home the house is the goal: the cell is marked. */
const finishLook = (ctx: Ctx, scene: Scene, x: number, y: number, now: number, still: boolean) => {
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

const effect = (ctx: Ctx, fx: Effect, scene: Scene, now: number) => {
  const { kind: item, own: hasOwn } = itemAt(scene, fx.x, fx.y)
  const cx = fx.x * CELL + CELL / 2
  const cy = fx.y * CELL + CELL / 2
  if (fx.kind === "slash") {
    slash(ctx, cx, cy, fx.progress)
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
  bubble(ctx, fx.kind === "question" ? "?" : "z", cx, cy, fx.progress)
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

const hud = (ctx: Ctx, { pose, scenery, counter }: ActorsInput) => {
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
  if (world.finish !== null) finishLook(ctx, scene, world.finish.x, world.finish.y, now, still)
  for (const { x, y } of input.items) {
    const taken = !world.crystals.has(cellKey(x, y))
    if (taken && itemAt(scene, x, y).kind !== "campfire") continue
    itemLook(ctx, scene, x, y, taken, now, still)
  }
  const map = scene.tilemap
  const tileset = map === undefined ? null : spriteOf(map.tileset)
  const tree = art(TREE_ART)
  // Who stands lower on the field is drawn later, so a figure in front covers the one behind. A house or a tree
  // stands by its bottom row: the hero above it walks behind it, the hero below it in front.
  const figures = [
    ...(scene.props ?? []).map((p) => ({ y: p.y + PROPS[p.kind].height - 1 - 0.02, draw: () => propFigure(ctx, p, still ? 0 : now) })),
    ...(tree === null
      ? []
      : scenery.trees.map((t) => ({
          y: t.y + 1 - 0.02,
          draw: () =>
            withFilter(ctx, season.plants, () =>
              drawFigure(ctx, tree, { cx: (t.x + 1) * CELL, bottom: (t.y + 2) * CELL - FEET, now: still ? 0 : now + (cellHash(t.x, t.y, 6) % 1000), scale: TREE_SCALE })
            )
        }))),
    ...(map === undefined || tileset === null
      ? []
      : tilesOfKind(map, "objects").map((t) => ({ y: t.y - 0.02, draw: () => drawTile(ctx, tileset, t.tile, t.x, t.y) }))),
    ...sprites
      .filter(({ placed, found }) => found !== null && layerOf(placed, found) === "object")
      .map(({ placed }) => ({ y: placedDepth(placed) - 0.01, draw: () => drawPlaced(ctx, placed, still ? 0 : now) })),
    ...pose.enemies.map((e) => ({ y: e.y, draw: () => enemyFigure(ctx, e, pose.hero, now, still) })),
    { y: pose.hero.y + 0.01, draw: () => heroFigure(ctx, pose.hero, skin, now, still) }
  ]
  for (const f of figures.sort((a, b) => a.y - b.y)) f.draw()
  // Roofs and crowns of the tile map cover the hero who walks under them.
  if (map !== undefined && tileset !== null) for (const t of tilesOfKind(map, "above")) drawTile(ctx, tileset, t.tile, t.x, t.y)
  for (const fx of pose.effects) effect(ctx, fx, scene, now)
  if (!still && season.weather !== null) drawWeather(ctx, season.weather, scenery.view, CELL, now)
  hud(ctx, input)
}
