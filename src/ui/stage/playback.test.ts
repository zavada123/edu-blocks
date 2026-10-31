import { describe, expect, test } from "vitest"
import { buildProgram, type Step } from "../../core/build.ts"
import { judgeProgram } from "../../core/judge.ts"
import { type Level, startWorld } from "../../core/level.ts"
import { cellKey } from "../../core/world.ts"
import { ENEMY_PART, frameIndexAt, HERO_PART, poseAt } from "./playback.ts"

const level = (map: Level["map"], extra: Partial<Level> = {}): Level => ({
  id: "t",
  title: "t",
  task: [],
  map,
  blocks: ["move", "turnLeft", "turnRight", "collect", "attack", "repeat"],
  goals: [{ type: "crystals" }],
  ...extra
})

const runOf = (lvl: Level, steps: ReadonlyArray<Step>) => {
  const result = judgeProgram(lvl, buildProgram(steps))
  return { start: startWorld(lvl), frames: result.frames, result }
}

/** A moment inside frame `i`: `share` of the way through the hero's or the enemies' part. */
const heroAt = (i: number, share: number) => i + HERO_PART[0] + (HERO_PART[1] - HERO_PART[0]) * share
const enemyAt = (i: number, share: number) => i + ENEMY_PART[0] + (ENEMY_PART[1] - ENEMY_PART[0]) * share

describe("poseAt", () => {
  const lvl = level(["######", "#S.c.#", "######"])
  const { start, frames } = runOf(lvl, ["move", "move", "collect"])

  test("at a whole time the world is as after that many actions", () => {
    expect(poseAt(start, frames, 0).world).toBe(start)
    expect(poseAt(start, frames, 0).frame).toBeNull()
    expect(poseAt(start, frames, 2).world).toBe(frames[1]?.world)
    expect(poseAt(start, frames, 2).hero).toMatchObject({ x: 3, y: 1, act: "idle" })
    // Past the end and before the start the time is clamped.
    expect(poseAt(start, frames, 99).world).toBe(frames[2]?.world)
    expect(poseAt(start, frames, -5).world).toBe(start)
  })

  test("a step slides the hero from one cell to the next and walks", () => {
    const half = poseAt(start, frames, heroAt(0, 0.5)).hero
    expect(half.act).toBe("walk")
    expect(half.x).toBeGreaterThan(1)
    expect(half.x).toBeLessThan(2)
    expect(half.y).toBe(1)
    expect(poseAt(start, frames, heroAt(0, 1)).hero.x).toBe(2)
  })

  test("a taken item goes away halfway and rises over the hero", () => {
    const key = cellKey(3, 1)
    expect(poseAt(start, frames, heroAt(2, 0.2)).world.crystals.has(key)).toBe(true)
    const late = poseAt(start, frames, heroAt(2, 0.7))
    expect(late.world.crystals.has(key)).toBe(false)
    expect(late.hero.act).toBe("take")
    expect(late.effects.map((e) => e.kind)).toEqual(["lift"])
  })

  test("a turn shows the new direction from the middle of the turn", () => {
    const turn = runOf(lvl, ["turnLeft"])
    expect(poseAt(turn.start, turn.frames, heroAt(0, 0.3)).hero.dir).toBe("right")
    expect(poseAt(turn.start, turn.frames, heroAt(0, 0.7)).hero.dir).toBe("up")
  })

  test("walking into a wall pushes the hero a little and back, and leaves them stunned", () => {
    const bump = runOf(level(["###", "#S#", "###"]), ["move"])
    const mid = poseAt(bump.start, bump.frames, heroAt(0, 0.3)).hero
    expect(mid.act).toBe("bump")
    expect(mid.x).toBeGreaterThan(1)
    expect(poseAt(bump.start, bump.frames, 1).hero).toMatchObject({ x: 1, crashed: true })
  })

  test("a trap: the hero walks onto it, then falls", () => {
    const fall = runOf(level(["####", "#Sx#", "####"]), ["move"])
    expect(poseAt(fall.start, fall.frames, heroAt(0, 0.25)).hero.fallen).toBe(0)
    const sinking = poseAt(fall.start, fall.frames, heroAt(0, 0.75)).hero
    expect(sinking.act).toBe("fall")
    expect(sinking.fallen).toBeGreaterThan(0)
    expect(poseAt(fall.start, fall.frames, 1).hero.fallen).toBe(1)
  })

  test("a blow: the slash, the smoke, the enemy fades away", () => {
    const fight = level(["#####", "#S..#", "#####"], { goals: [{ type: "enemies" }], enemies: [{ kind: "slime", x: 2, y: 1, sight: 0 }] })
    const run = runOf(fight, ["attack"])
    expect(run.result.passed).toBe(true)
    expect(poseAt(run.start, run.frames, heroAt(0, 0.1)).hero.act).toBe("attack")
    const slash = poseAt(run.start, run.frames, heroAt(0, 0.5))
    expect(slash.effects.map((e) => e.kind)).toContain("slash")
    const smoke = poseAt(run.start, run.frames, heroAt(0, 0.8))
    expect(smoke.effects.map((e) => e.kind)).toContain("smoke")
    expect(smoke.enemies[0]?.opacity).toBeLessThan(1)
    expect(poseAt(run.start, run.frames, 1).enemies[0]?.opacity).toBe(0)
  })

  test("an enemy walks up in its own part of the frame, and its hit takes a heart late", () => {
    const fight = level(["#######", "#S....#", "#######"], { goals: [{ type: "enemies" }], enemies: [{ kind: "slime", x: 4, y: 1, sight: 3 }] })
    const run = runOf(fight, ["turnLeft", "turnRight", "turnLeft", "turnRight"])
    // Turn 1: the enemy comes from 4 to 3 while the hero turns.
    expect(poseAt(run.start, run.frames, heroAt(0, 0.1)).enemies[0]?.x).toBe(4)
    const coming = poseAt(run.start, run.frames, enemyAt(0, 0.5)).enemies[0]?.x ?? 0
    expect(coming).toBeGreaterThan(2)
    expect(coming).toBeLessThan(4)
    // It comes up, raises its weapon, then hits. The heart goes in the second half of its part, and it lunges at the hero.
    const hitFrame = run.frames.findIndex((f) => f.events.some((e) => e.type === "heroHurt"))
    expect(hitFrame).toBeGreaterThan(0)
    expect(poseAt(run.start, run.frames, enemyAt(hitFrame, 0.2)).world.hearts).toBe(3)
    const late = poseAt(run.start, run.frames, enemyAt(hitFrame, 0.6))
    expect(late.world.hearts).toBe(2)
    expect(late.hero.act).toBe("hurt")
    expect(late.enemies[0]?.lunge).toBeGreaterThan(0)
  })

  test("frameIndexAt: the action playing, or the last one played", () => {
    expect(frameIndexAt(frames, 0)).toBe(-1)
    expect(frameIndexAt(frames, 0.4)).toBe(0)
    expect(frameIndexAt(frames, 1)).toBe(0)
    expect(frameIndexAt(frames, 2.5)).toBe(2)
    expect(frameIndexAt(frames, 3)).toBe(2)
    expect(frameIndexAt(frames, 10)).toBe(2)
    expect(frameIndexAt([], 1)).toBe(-1)
  })
})
