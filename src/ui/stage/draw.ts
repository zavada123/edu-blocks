import type { ItemKind, Npc, Scene } from "../../core/level.ts"
import { cellKey, type Direction, type World } from "../../core/world.ts"
import { ENEMIES, FLOORS, ITEM_TILES, NPCS, PROPS, type Season, waterTile } from "../look.ts"
import { cellHash, type Scenery } from "../scenery.ts"
import beeSheet from "../sprites/bee.png"
import fireStrip from "../sprites/fire.png"
import flagStrip from "../sprites/flag.png"
import grandmaSheet from "../sprites/grandma.png"
import heartSheet from "../sprites/heart.png"
import ninjaSheet from "../sprites/ninja.png"
import robotSheet from "../sprites/robot.png"
import roverSheet from "../sprites/rover.png"
import slashStrip from "../sprites/slash.png"
import smokeStrip from "../sprites/smoke.png"
import wellTile from "../sprites/well.png"
import { meadowTile, PATH_SHEET_COLUMNS, pathPiece } from "../terrain.ts"
import { image } from "./images.ts"
import type { Effect, EnemyPose, HeroPose, StagePose } from "./playback.ts"
import type { HeroId } from "../../core/heroes.ts"

/**
 * Drawing the field on a canvas. Pixel art from the Ninja Adventure pack (CC0), see sprites/CREDITS.md.
 * One cell is one 16×16 tile; the canvas is scaled so that a picture pixel is a whole number of screen pixels.
 * The ground, trees and props do not move, so they are drawn once (`drawGround`); everything else is drawn
 * each animation frame (`drawActors`) in layers: villagers, traps, the goal, items, enemies, the hero, effects,
 * weather and the counters on top.
 */

export const CELL = 16

/** Hero looks: the heroes of `HEROES`. */
export type Skin = HeroId

/** A sheet has a column per direction and a row per frame: rows 0–3 walk, 4 attack, 6 special poses. */
const SHEETS: Readonly<Record<Skin, { readonly href: string; readonly rows: number }>> = {
  ninja: { href: ninjaSheet, rows: 7 },
  robot: { href: robotSheet, rows: 7 },
  rover: { href: roverSheet, rows: 7 },
  bee: { href: beeSheet, rows: 4 }
}

/** The sheet of a hero look: its first frame is the hero facing down, for a portrait. */
export const heroSheetOf = (skin: Skin): string => SHEETS[skin].href

const COLUMN: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 }
const ATTACK_ROW = 4
const POSE_ROW = 6
/** Row 6, column 1: the hero holds a thing over the head. */
const HOLD_COLUMN = 1

const PATH_SHEET_ROWS = 6
/** A weather picture (320×240) drawn at half size, so the drops match the 16-pixel tiles. */
const WEATHER_W = 160
const WEATHER_H = 120
const BOSS_SCALE = 1.5
const FX = 32
const HEART = 9
const HEART_FULL = 0
const HEART_EMPTY = 4
const HUD_BACK = "rgba(30, 20, 30, 0.45)"
const DANGER = "#ff3355"

type Ctx = CanvasRenderingContext2D

/** Part of a sheet, `w`×`h` from (`sx`, `sy`), drawn at `x`, `y`. Skipped until the picture has loaded. */
const blit = (ctx: Ctx, href: string, sx: number, sy: number, w: number, h: number, x: number, y: number, dw = w, dh = h) => {
  const img = image(href)
  if (img !== null) ctx.drawImage(img, sx, sy, w, h, x, y, dw, dh)
}

/** A whole picture at `x`, `y`, at its own size or the given one. */
const picture = (ctx: Ctx, href: string, x: number, y: number, w?: number, h?: number) => {
  const img = image(href)
  if (img !== null) ctx.drawImage(img, x, y, w ?? img.naturalWidth, h ?? img.naturalHeight)
}

/** A 16×16 piece of a sheet with its top-left corner at x, y. */
const piece = (ctx: Ctx, href: string, col: number, row: number, x: number, y: number) =>
  blit(ctx, href, col * CELL, row * CELL, CELL, CELL, x, y)

/** The frame of a looping strip at time `now` (ms), each place starting at its own frame. */
const loopFrame = (now: number, seconds: number, frames: number, offset = 0) =>
  Math.floor((((now / 1000 + offset) / seconds) % 1) * frames) % frames

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

const shadow = (ctx: Ctx, cx: number, cy: number, scale = 1) => ellipse(ctx, cx, cy + 7, 5 * scale, 1.5 * scale, "rgba(0, 0, 0, 0.25)")

// ── Ground: drawn once ───────────────────────────────────────────────────────────────────────────────────────────

export interface GroundInput {
  readonly world: World
  readonly scene: Scene
  readonly season: Season
  readonly scenery: Scenery
}

/** Grass, meadow, the path or the ice, flowers, bushes that do not sway, trees and props. */
export const drawGround = (ctx: Ctx, { world, scene, season, scenery }: GroundInput) => {
  const { view } = scenery
  const ground = scene.ground ?? "path"
  const grass = image(season.grass)
  if (grass !== null) {
    for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) ctx.drawImage(grass, x * CELL, y * CELL, CELL, CELL)
  }
  if (season.meadow !== null) {
    for (let y = view.y; y < view.y + view.height; y++) {
      for (let x = view.x; x < view.x + view.width; x++) {
        const look = meadowTile(x, y)
        if (look !== 0) blit(ctx, season.meadow, look * CELL, 0, CELL, CELL, x * CELL, y * CELL)
      }
    }
  }
  const { width, height, walls } = world
  const isPath = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && !walls.has(cellKey(x, y))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wall = walls.has(cellKey(x, y))
      if (wall && ground !== "bridge") continue
      if (ground === "path") {
        const { col, row } = pathPiece(isPath, x, y)
        if (col < PATH_SHEET_COLUMNS && row < PATH_SHEET_ROWS) piece(ctx, season.path, col, row, x * CELL, y * CELL)
      } else picture(ctx, wall ? waterTile : FLOORS[ground], x * CELL, y * CELL, CELL, CELL)
    }
  }
  for (const { x, y, kind } of scenery.decor) {
    // The path has its own texture: flowers and grass grow only in the meadow.
    const href = x < 0 || y < 0 || x >= width || y >= height ? season.decor[kind] : null
    if (href !== null) picture(ctx, href, x * CELL, y * CELL, CELL, CELL)
  }
  for (const { x, y, kind } of scenery.obstacles) {
    if (season.swaying[kind] === undefined) picture(ctx, season.obstacles[kind], x * CELL, y * CELL, CELL, CELL)
  }
  for (const { x, y } of scenery.trees) picture(ctx, season.tree, x * CELL, y * CELL, CELL * 2, CELL * 2)
  for (const p of scene.props ?? []) {
    const look = PROPS[p.kind]
    picture(ctx, look.href, p.x * CELL, p.y * CELL, look.width * CELL, look.height * CELL)
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
  /** Milliseconds, for the looping animations: flags, flames, bushes in the wind, weather. */
  readonly now: number
  /** The viewer asked for less motion: nothing loops and no weather falls. */
  readonly still: boolean
  /** The counter of the program, when the level has one. */
  readonly counter?: string | undefined
}

const swayingBushes = (ctx: Ctx, { season, scenery, now, still }: ActorsInput) => {
  for (const { x, y, kind } of scenery.obstacles) {
    const look = season.swaying[kind]
    if (look === undefined) continue
    const frame = still ? 0 : loopFrame(now, 0.8, look.frames, (cellHash(x, y, 9) % 8) * 0.1)
    blit(ctx, look.href, frame * CELL, 0, CELL, CELL, x * CELL, y * CELL)
  }
}

/** Villagers look down and shift from foot to foot, each at their own pace. */
const NPC_STEPS: ReadonlyArray<number> = [0, 0, 0, 1, 0, 0, 2, 0]

const villager = (ctx: Ctx, npc: Npc, now: number, still: boolean) => {
  const cx = npc.x * CELL + CELL / 2
  const cy = npc.y * CELL + CELL / 2
  shadow(ctx, cx, cy)
  const row = still ? 0 : (NPC_STEPS[loopFrame(now, 2.4, 8, (cellHash(npc.x, npc.y, 11) % 8) * 0.3)] ?? 0)
  piece(ctx, NPCS[npc.who], 0, row, cx - CELL / 2, cy - CELL / 2)
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

const flame = (ctx: Ctx, cx: number, cy: number, now: number, still: boolean) => {
  const frame = 1 + (still ? 0 : loopFrame(now, 0.6, 6))
  blit(ctx, fireStrip, frame * 8, 0, 8, 12, cx - 4, cy - 10)
}

const finishLook = (ctx: Ctx, kind: NonNullable<Scene["finish"]>, cx: number, cy: number, now: number, still: boolean) => {
  const x = cx - CELL / 2
  const y = cy - CELL / 2
  if (kind === "flag") blit(ctx, flagStrip, (still ? 0 : loopFrame(now, 0.6, 4)) * CELL, 0, CELL, CELL, x, y)
  else if (kind === "well") picture(ctx, wellTile, x, y, CELL, CELL)
  else if (kind === "grandma") piece(ctx, grandmaSheet, 0, 0, x, y)
  else {
    // At home the house above is the goal; a doormat marks the cell.
    roundRect(ctx, cx - 6, cy - 4, 12, 8, 2, "#9b5b34")
    ctx.lineWidth = 1
    ctx.strokeStyle = "#5e3216"
    ctx.stroke()
  }
}

const itemLook = (ctx: Ctx, kind: ItemKind, cx: number, cy: number, lit: boolean, now: number, still: boolean) => {
  if (kind === "fish") ellipse(ctx, cx, cy + 1, 7, 5, "#1d4f6e")
  // Crystals bob up and down.
  const bob = kind === "crystal" && !still ? -1.5 * (0.5 - 0.5 * Math.cos(Math.PI * ((now / 1200) % 2))) : 0
  if (kind === "key") picture(ctx, ITEM_TILES.key, cx - 6, cy - 4, 12, 8)
  else picture(ctx, ITEM_TILES[kind], cx - CELL / 2, cy - CELL / 2 + bob, CELL, CELL)
  if (lit) flame(ctx, cx, cy, now, still)
}

/** Hit points over a boss or a strong enemy. */
const hpBar = (ctx: Ctx, cx: number, top: number, hp: number, maxHp: number) => {
  const w = Math.min(14, maxHp * 3 + 1)
  roundRect(ctx, cx - w / 2, top, w, 3, 1, "rgba(30, 20, 30, 0.75)")
  roundRect(ctx, cx - w / 2 + 0.5, top + 0.5, ((w - 1) * hp) / maxHp, 2, 0.5, "#e8434f")
}

/** Draws with a glow or a flash where the browser can filter a canvas; elsewhere just the picture. */
const withFilter = (ctx: Ctx, filter: string, draw: () => void) => {
  ctx.save()
  if ("filter" in ctx) ctx.filter = filter
  draw()
  ctx.restore()
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
  const row = still ? 0 : loopFrame(now, enemy.boss ? 0.9 : 0.6, 4, (enemy.id % 4) * 0.15)
  // A raised weapon: the enemy rises and falls and glows red. It hits on its next turn.
  const swing = enemy.swinging && !still ? -1.5 * Math.abs(Math.sin((now / 350) * Math.PI)) : 0
  const size = CELL * scale
  // A boss stands on the same ground line: it grows upwards.
  const x = cx - size / 2
  const y = cy + (1 - scale) * 6 - size / 2 + swing
  const draw = () => blit(ctx, ENEMIES[enemy.kind], COLUMN[pose.face] * CELL, row * CELL, CELL, CELL, x, y, size, size)
  if (pose.flash > 0) withFilter(ctx, `brightness(${1 + 1.5 * pose.flash})`, draw)
  else if (enemy.swinging) withFilter(ctx, `drop-shadow(0 0 1.2px ${DANGER})`, draw)
  else draw()
  if (enemy.boss || enemy.maxHp > 1) hpBar(ctx, cx, cy - CELL / 2 - 4 - (scale - 1) * 12, Math.max(0, enemy.hp), enemy.maxHp)
  ctx.restore()
}

const heroFigure = (ctx: Ctx, hero: HeroPose, skin: Skin, now: number) => {
  const sheet = SHEETS[skin]
  const cx = hero.x * CELL + CELL / 2
  const cy = hero.y * CELL + CELL / 2
  let col = COLUMN[hero.dir]
  let row = 0
  if (hero.act === "walk" || hero.act === "bump") row = Math.floor(hero.progress * 4) % 4
  if (hero.act === "attack" && sheet.rows > ATTACK_ROW) row = ATTACK_ROW
  if (hero.act === "take" && sheet.rows > POSE_ROW) {
    row = POSE_ROW
    col = HOLD_COLUMN
  }
  const scale = 1 - 0.4 * hero.fallen
  ctx.save()
  ctx.globalAlpha = 1 - 0.65 * hero.fallen
  shadow(ctx, cx, cy, scale)
  // A crash shakes the hero; an attack leans into the blow.
  const shake = hero.crashed ? Math.sin(now / 40) * 1.2 : 0
  const lean = hero.act === "attack" ? Math.sin(Math.PI * hero.progress) * 2 : 0
  const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[hero.dir]
  const size = CELL * scale
  const x = cx - size / 2 + shake + (d[0] ?? 0) * lean
  const y = cy - size / 2 + 3 * hero.fallen + (d[1] ?? 0) * lean
  const draw = () => blit(ctx, sheet.href, col * CELL, row * CELL, CELL, CELL, x, y, size, size)
  if (hero.act === "hurt") withFilter(ctx, `brightness(${1 + 1.2 * Math.sin(Math.PI * hero.progress)}) drop-shadow(0 0 1.5px ${DANGER})`, draw)
  else if (hero.crashed) withFilter(ctx, `drop-shadow(0 0 1.5px ${DANGER})`, draw)
  else draw()
  ctx.restore()
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

const effect = (ctx: Ctx, fx: Effect, item: ItemKind) => {
  const cx = fx.x * CELL + CELL / 2
  const cy = fx.y * CELL + CELL / 2
  if (fx.kind === "slash" || fx.kind === "smoke") {
    const frames = fx.kind === "slash" ? 4 : 6
    const frame = Math.min(frames - 1, Math.floor(fx.progress * frames))
    blit(ctx, fx.kind === "slash" ? slashStrip : smokeStrip, frame * FX, 0, FX, FX, cx - FX / 2, cy - FX / 2)
    return
  }
  if (fx.kind === "lift") {
    // The taken thing rises over the hero's head and fades. A campfire is lit instead.
    if (item === "campfire") return
    ctx.save()
    ctx.globalAlpha = 1 - Math.max(0, fx.progress - 0.6) / 0.4
    picture(ctx, ITEM_TILES[item], cx - 6, cy - CELL / 2 - 9 * Math.min(1, fx.progress * 2), 12, item === "key" ? 8 : 12)
    ctx.restore()
    return
  }
  bubble(ctx, fx.kind === "question" ? "?" : "z", cx, cy, fx.progress)
}

const weather = (ctx: Ctx, { season, scenery, now }: ActorsInput) => {
  const w = season.weather
  const img = w === null ? null : image(w.href)
  if (w === null || img === null) return
  const { view } = scenery
  const phase = (now / 1000 / w.seconds) % 1
  const ox = (WEATHER_W * w.drift * phase) % WEATHER_W
  const oy = (WEATHER_H * phase) % WEATHER_H
  const left = view.x * CELL
  const top = view.y * CELL
  for (let y = top - WEATHER_H + oy; y < top + view.height * CELL; y += WEATHER_H) {
    for (let x = left - WEATHER_W + ox; x < left + view.width * CELL; x += WEATHER_W) ctx.drawImage(img, x, y, WEATHER_W, WEATHER_H)
  }
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
    for (let i = 0; i < world.maxHearts; i++) {
      blit(ctx, heartSheet, (i < world.hearts ? HEART_FULL : HEART_EMPTY) * CELL, 0, CELL, CELL, x + i * (HEART + 1), y, HEART, HEART)
    }
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
  const { pose, scene, season, now, still, skin } = input
  const { world } = pose
  const item = scene.item ?? "crystal"
  swayingBushes(ctx, input)
  for (const npc of scene.npcs ?? []) villager(ctx, npc, now, still)
  for (const key of world.traps) {
    const [tx = 0, ty = 0] = key.split(",").map(Number)
    trap(ctx, tx * CELL + CELL / 2, ty * CELL + CELL / 2, season.icy, world.fell && Math.round(pose.hero.x) === tx && Math.round(pose.hero.y) === ty)
  }
  if (world.finish !== null) finishLook(ctx, scene.finish ?? "flag", world.finish.x * CELL + CELL / 2, world.finish.y * CELL + CELL / 2, now, still)
  for (const { x, y } of input.items) {
    const taken = !world.crystals.has(cellKey(x, y))
    if (taken && item !== "campfire") continue
    itemLook(ctx, item, x * CELL + CELL / 2, y * CELL + CELL / 2, taken, now, still)
  }
  // Who stands lower on the field is drawn later, so a figure in front covers the one behind.
  const figures = [...pose.enemies.map((e) => ({ y: e.y, draw: () => enemyFigure(ctx, e, pose.hero, now, still) })), { y: pose.hero.y + 0.01, draw: () => heroFigure(ctx, pose.hero, skin, now) }]
  for (const f of figures.sort((a, b) => a.y - b.y)) f.draw()
  for (const fx of pose.effects) effect(ctx, fx, item)
  // With less motion the weather stays as a still picture.
  weather(ctx, still ? { ...input, now: 0 } : input)
  hud(ctx, input)
}
