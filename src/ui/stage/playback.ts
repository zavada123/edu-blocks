import type { Frame } from "../../core/program.ts"
import { type Cell, type Direction, type Enemy, type GameEvent, isAlive, type World } from "../../core/world.ts"

/**
 * What the field shows at a moment of a run. Pure: the same run and the same moment always give the same picture,
 * so the timeline can jump anywhere, play backwards or stop between two actions.
 *
 * Time `t` counts actions: at a whole `t = k` the world is as after `k` actions (0 is the start); between `k` and
 * `k + 1` frame `k` plays. In a frame the hero acts first (`HERO_PART`), then the enemies (`ENEMY_PART`); the two
 * overlap a little so the run flows.
 */

export const HERO_PART: readonly [number, number] = [0, 0.6]
export const ENEMY_PART: readonly [number, number] = [0.45, 1]

/** What the hero is doing: picks the sheet row and the effects. */
export type HeroAct = "idle" | "walk" | "attack" | "bump" | "fall" | "take" | "hurt"

export interface HeroPose {
  readonly x: number
  readonly y: number
  readonly dir: Direction
  readonly act: HeroAct
  /** Progress of the act, 0…1: the walking frame, the fall, the flash. */
  readonly progress: number
  /** The hero walked into something and stays stunned: drawn with a red glow. */
  readonly crashed: boolean
  /** Fell into a trap: drawn small and faint. */
  readonly fallen: number
}

export interface EnemyPose {
  readonly id: number
  readonly enemy: Enemy
  readonly x: number
  readonly y: number
  readonly face: Direction
  /** 1 while it is up; fades to 0 as it is beaten. */
  readonly opacity: number
  /** Just struck: drawn bright for a moment. */
  readonly flash: number
  /** Lunges toward the hero when it hits: 0…1. */
  readonly lunge: number
}

export type EffectKind = "slash" | "smoke" | "lift" | "question" | "tired"

export interface Effect {
  readonly kind: EffectKind
  readonly x: number
  readonly y: number
  /** 0…1 through the effect. */
  readonly progress: number
}

export interface StagePose {
  /** The world for the things that only switch: items, hearts, steps, broken ice. */
  readonly world: World
  readonly hero: HeroPose
  readonly enemies: ReadonlyArray<EnemyPose>
  readonly effects: ReadonlyArray<Effect>
  /** The frame being played or the last one played, or null at the start. */
  readonly frame: Frame | null
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
/** Progress inside a part of the frame. */
const within = (p: number, [from, to]: readonly [number, number]) => clamp01((p - from) / (to - from))
const ease = (p: number) => p * p * (3 - 2 * p)
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

/** Where an enemy looks: at the hero when it comes for them, along its way when it walks. */
export const faceOf = (enemy: Enemy, hero: Cell): Direction => {
  const dx = hero.x - enemy.x
  const dy = hero.y - enemy.y
  const near = Math.abs(dx) + Math.abs(dy) <= Math.max(1, enemy.sight)
  if (near) return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up"
  if (enemy.walk === "across") return enemy.heading === 1 ? "right" : "left"
  if (enemy.walk === "updown") return enemy.heading === 1 ? "down" : "up"
  return "down"
}

const restingHero = (world: World): HeroPose => ({
  x: world.hero.x,
  y: world.hero.y,
  dir: world.hero.dir,
  act: "idle",
  progress: 0,
  crashed: world.crashed,
  fallen: world.fell ? 1 : 0
})

const restingEnemies = (world: World): ReadonlyArray<EnemyPose> =>
  world.enemies.map((e) => ({
    id: e.id,
    enemy: e,
    x: e.x,
    y: e.y,
    face: faceOf(e, world.hero),
    opacity: isAlive(e) ? 1 : 0,
    flash: 0,
    lunge: 0
  }))

/** The world before frame `i`: the start, or the world after the frame before. */
const worldBefore = (start: World, frames: ReadonlyArray<Frame>, i: number): World => (i === 0 ? start : (frames[i - 1]?.world ?? start))

const has = (events: ReadonlyArray<GameEvent>, type: GameEvent["type"]) => events.some((e) => e.type === type)

/** The hero's own action, then a flash when an enemy hits them in the enemies' part of the frame. */
const heroPose = (before: World, after: World, events: ReadonlyArray<GameEvent>, p: number): HeroPose => {
  const pose = heroActionPose(before, after, events, p)
  const ep = within(p, ENEMY_PART)
  return has(events, "heroHurt") && ep > 0.35 && ep < 1 ? { ...pose, act: "hurt", progress: ep } : pose
}

const heroActionPose = (before: World, after: World, events: ReadonlyArray<GameEvent>, p: number): HeroPose => {
  const hp = within(p, HERO_PART)
  const base = { ...restingHero(before), crashed: false, fallen: 0 }
  const moved = events.find((e) => e.type === "heroMoved")
  const fell = has(events, "heroFell")
  if (moved?.type === "heroMoved") {
    // With a fall the walk takes the first half, the fall the second.
    const walk = fell ? clamp01(hp * 2) : hp
    const pos = ease(walk)
    const fallen = fell ? clamp01(hp * 2 - 1) : 0
    return {
      ...base,
      x: lerp(moved.from.x, moved.to.x, pos),
      y: lerp(moved.from.y, moved.to.y, pos),
      act: fallen > 0 ? "fall" : walk < 1 ? "walk" : "idle",
      progress: fallen > 0 ? fallen : walk,
      fallen
    }
  }
  const turned = events.find((e) => e.type === "heroTurned")
  if (turned?.type === "heroTurned") return { ...base, dir: hp < 0.5 ? turned.from : turned.to }
  const bumped = events.find((e) => e.type === "heroBumped")
  if (bumped?.type === "heroBumped") {
    const push = 0.3 * Math.sin(Math.PI * Math.min(1, hp * 1.4))
    return {
      ...base,
      x: base.x + (bumped.into.x - base.x) * push,
      y: base.y + (bumped.into.y - base.y) * push,
      act: "bump",
      progress: hp,
      crashed: hp > 0.35
    }
  }
  if (has(events, "heroSwung")) return { ...base, act: hp > 0 && hp < 1 ? "attack" : "idle", progress: hp }
  if (has(events, "itemTaken")) return { ...base, act: hp > 0.15 && hp < 0.95 ? "take" : "idle", progress: hp }
  return { ...base, crashed: after.crashed && hp > 0.35 }
}

const enemyPoses = (before: World, after: World, events: ReadonlyArray<GameEvent>, p: number, hero: HeroPose): ReadonlyArray<EnemyPose> => {
  const hp = within(p, HERO_PART)
  const ep = within(p, ENEMY_PART)
  return after.enemies.map((e) => {
    const old = before.enemies.find((b) => b.id === e.id) ?? e
    const moved = events.find((ev) => ev.type === "enemyMoved" && ev.id === e.id)
    const down = events.some((ev) => ev.type === "enemyDown" && ev.id === e.id)
    const hit = events.some((ev) => ev.type === "enemyHit" && ev.id === e.id)
    const hits = events.some((ev) => ev.type === "heroHurt" && ev.by === e.id)
    const pos = moved?.type === "enemyMoved" ? ease(ep) : 1
    const x = moved?.type === "enemyMoved" ? lerp(moved.from.x, moved.to.x, pos) : e.x
    const y = moved?.type === "enemyMoved" ? lerp(moved.from.y, moved.to.y, pos) : e.y
    // A blow shows on the hit points as the slash lands; a raised weapon changes in the enemy's own turn.
    const struckNow = (down || hit) && hp > 0.4
    const shownHp = struckNow ? e.hp : old.hp
    const swinging = ep > 0 || struckNow ? e.swinging : old.swinging
    const opacity = down ? 1 - clamp01((hp - 0.4) / 0.4) : isAlive(old) ? 1 : 0
    const struck = down || hit ? clamp01((hp - 0.35) / 0.3) : 0
    return {
      id: e.id,
      enemy: { ...e, x, y, hp: shownHp, swinging },
      x,
      y,
      face: faceOf({ ...e, x: Math.round(x), y: Math.round(y) }, { x: Math.round(hero.x), y: Math.round(hero.y) }),
      opacity,
      flash: struck > 0 && struck < 1 ? 1 - struck : 0,
      lunge: hits ? Math.sin(Math.PI * clamp01((ep - 0.2) / 0.6)) : 0
    }
  })
}

const effectsOf = (before: World, events: ReadonlyArray<GameEvent>, p: number): ReadonlyArray<Effect> => {
  const hp = within(p, HERO_PART)
  const out: Array<Effect> = []
  const after = (start: number, length: number) => clamp01((hp - start) / length)
  for (const ev of events) {
    if (ev.type === "enemyHit" || ev.type === "enemyDown") {
      const enemy = before.enemies.find((e) => e.id === ev.id)
      if (enemy === undefined) continue
      const slash = after(0.3, 0.5)
      if (slash > 0 && slash < 1) out.push({ kind: "slash", x: enemy.x, y: enemy.y, progress: slash })
      const smoke = after(0.55, 0.45)
      if (ev.type === "enemyDown" && smoke > 0 && smoke < 1) out.push({ kind: "smoke", x: enemy.x, y: enemy.y, progress: smoke })
    }
    if (ev.type === "itemTaken") {
      const lift = after(0.1, 0.9)
      if (lift > 0 && lift < 1) out.push({ kind: "lift", x: ev.at.x, y: ev.at.y, progress: lift })
    }
    if (ev.type === "nothingToTake") {
      const q = after(0.1, 0.9)
      if (q > 0 && q < 1) out.push({ kind: "question", x: ev.at.x, y: ev.at.y, progress: q })
    }
    if (ev.type === "heroTired") {
      const z = after(0.1, 0.9)
      if (z > 0 && z < 1) out.push({ kind: "tired", x: before.hero.x, y: before.hero.y, progress: z })
    }
  }
  return out
}

/** The picture of a run at time `t` (see the top of the file). */
export const poseAt = (start: World, frames: ReadonlyArray<Frame>, t: number): StagePose => {
  const end = frames.length
  const time = Math.min(end, Math.max(0, Number.isFinite(t) ? t : 0))
  const i = Math.floor(time)
  const p = time - i
  if (p === 0) {
    const world = worldBefore(start, frames, i)
    return { world, hero: restingHero(world), enemies: restingEnemies(world), effects: [], frame: frames[i - 1] ?? null }
  }
  const frame = frames[i] as Frame
  const before = worldBefore(start, frames, i)
  const after = frame.world
  const hero = heroPose(before, after, frame.events, p)
  const enemies = enemyPoses(before, after, frame.events, p, hero)
  // Items, hearts and steps switch when their event happens: a heart is lost in the enemies' part.
  const hpart = within(p, HERO_PART)
  const epart = within(p, ENEMY_PART)
  const world: World = {
    ...before,
    crystals: hpart > 0.5 ? after.crystals : before.crystals,
    energy: hpart > 0.3 ? after.energy : before.energy,
    hearts: epart > 0.5 ? after.hearts : before.hearts,
    fell: hero.fallen > 0.5 ? after.fell : before.fell
  }
  return { world, hero, enemies, effects: effectsOf(before, frame.events, p), frame }
}

/** The frame whose block lights up at time `t`: the one playing, or the last one played. */
export const frameIndexAt = (frames: ReadonlyArray<Frame>, t: number): number => {
  if (frames.length === 0 || t <= 0) return -1
  return Math.min(frames.length - 1, Math.ceil(t) - 1)
}
