import { describe, expect, test } from "vitest"
import { goalMet, type Level, startWorld } from "./level.ts"
import { type Action, applyAction, atFinish, cellKey, enemiesLeft, type EnemySpec, enemyAhead, onCrystal, parseMap, trapAhead, wallAhead, type World } from "./world.ts"

describe("parseMap", () => {
  test("reads walls, crystals, start and finish", () => {
    const world = parseMap(["#####", "#Sc F", "#####"])
    expect(world.hero).toEqual({ x: 1, y: 1, dir: "right" })
    expect([...world.crystals]).toEqual([cellKey(2, 1)])
    expect(world.finish).toEqual({ x: 4, y: 1 })
    // A space is a wall.
    expect(world.walls.has(cellKey(3, 1))).toBe(true)
  })

  test("throws on a map without the start", () => {
    expect(() => parseMap(["#..#"])).toThrow("старту")
  })

  test("throws on an unknown sign", () => {
    expect(() => parseMap(["#S?#"])).toThrow("«?»")
  })
})

describe("applyAction", () => {
  const world = parseMap(["#####", "#Sc.#", "#..F#", "#####"])

  test("a step moves the hero where it looks", () => {
    const { world: next, outcome } = applyAction(world, "move")
    expect(outcome).toBe("moved")
    expect(next.hero).toEqual({ x: 2, y: 1, dir: "right" })
    expect(world.hero.x).toBe(1)
  })

  test("a step into a wall crashes and leaves the hero in place", () => {
    const facingUp = applyAction(world, "turnLeft").world
    const { world: next, outcome } = applyAction(facingUp, "move")
    expect(outcome).toBe("crashed")
    expect(next.crashed).toBe(true)
    expect(next.hero.y).toBe(1)
  })

  test("turns go round the four directions", () => {
    const dirs: Array<string> = []
    let current = world
    for (let i = 0; i < 4; i++) {
      current = applyAction(current, "turnRight").world
      dirs.push(current.hero.dir)
    }
    expect(dirs).toEqual(["down", "left", "up", "right"])
    expect(applyAction(world, "turnLeft").world.hero.dir).toBe("up")
  })

  test("collecting removes the crystal only where it lies", () => {
    expect(applyAction(world, "collect").outcome).toBe("nothingToCollect")
    const there = applyAction(world, "move").world
    expect(onCrystal(there)).toBe(true)
    const { world: after, outcome } = applyAction(there, "collect")
    expect(outcome).toBe("collected")
    expect(after.crystals.size).toBe(0)
    expect(there.crystals.size).toBe(1)
  })

  test("questions about the cell ahead and the finish", () => {
    expect(wallAhead(world)).toBe(false)
    expect(wallAhead(applyAction(world, "turnLeft").world)).toBe(true)
    const atF = { ...world, hero: { x: 3, y: 2, dir: "right" as const } }
    expect(atFinish(atF)).toBe(true)
    expect(atFinish(world)).toBe(false)
  })
})

describe("enemies", () => {
  const level = (enemies: ReadonlyArray<EnemySpec>, map: Level["map"] = ["#########", "#S......#", "#########"]): Level => ({
    id: "t",
    title: "t",
    task: [],
    map,
    blocks: ["move", "attack"],
    goals: [{ type: "enemies" }],
    enemies
  })
  const play = (world: World, actions: ReadonlyArray<Action>) => actions.reduce((w, a) => applyAction(w, a).world, world)

  test("a standing enemy waits until the hero comes within sight, then walks up to them", () => {
    const start = startWorld(level([{ kind: "slime", x: 6, y: 1, sight: 2 }]))
    const far = play(start, ["turnLeft", "turnRight"])
    expect(far.enemies[0]).toMatchObject({ x: 6, y: 1 })
    // At 3 the hero is three steps away: the enemy stays. At 4 it is two steps away: the enemy comes up close.
    expect(play(start, ["move", "move"]).enemies[0]).toMatchObject({ x: 6, y: 1 })
    const near = play(start, ["move", "move", "move"])
    expect(near.enemies[0]).toMatchObject({ x: 5, y: 1 })
    expect(enemyAhead(near)).toBe(true)
  })

  test("an enemy next to the hero swings first and hits on its next turn", () => {
    const start = startWorld(level([{ kind: "slime", x: 3, y: 1, sight: 0 }]))
    const swing = play(start, ["move"])
    expect(swing.enemies[0]?.swinging).toBe(true)
    expect(swing.hearts).toBe(3)
    const hit = play(swing, ["turnLeft"])
    expect(hit.hearts).toBe(2)
    expect(hit.enemies[0]?.swinging).toBe(false)
  })

  test("a blow takes a hit point, and an enemy with none left is gone", () => {
    const start = startWorld(level([{ kind: "goblin", x: 3, y: 1, hp: 2, sight: 0 }]))
    const first = applyAction(play(start, ["move"]), "attack")
    expect(first.outcome).toBe("enemyHit")
    // A blow stops the swing of a plain enemy.
    expect(first.world.hearts).toBe(3)
    const second = applyAction(first.world, "attack")
    expect(second.outcome).toBe("enemyDown")
    expect(enemiesLeft(second.world)).toBe(0)
    expect(enemyAhead(second.world)).toBe(false)
    expect(applyAction(second.world, "attack").outcome).toBe("swingMissed")
  })

  test("a boss has three hit points and hits back while struck", () => {
    const start = startWorld(level([{ kind: "bear", x: 3, y: 1, boss: true, sight: 0 }]))
    expect(start.enemies[0]).toMatchObject({ hp: 3, maxHp: 3, boss: true })
    const end = play(start, ["move", "attack", "attack", "attack"])
    expect(enemiesLeft(end)).toBe(0)
    expect(end.hearts).toBe(2)
  })

  test("walking into an enemy is a crash", () => {
    const start = startWorld(level([{ kind: "slime", x: 2, y: 1, sight: 0 }]))
    expect(applyAction(start, "move").outcome).toBe("crashed")
  })

  test("a walking enemy goes along its line and turns back at a wall", () => {
    const start = startWorld(level([{ kind: "slime", x: 5, y: 1, walk: "across", sight: 0 }]))
    const xs = [1, 2, 3, 4].map((n) => play(start, Array.from({ length: n }, (): Action => "turnLeft")).enemies[0]?.x)
    expect(xs).toEqual([6, 7, 6, 5])
  })

  test("an enemy that sees the hero goes around a wall", () => {
    const map = ["#######", "#S.#..#", "#.....#", "#######"]
    const start = startWorld(level([{ kind: "skull", x: 4, y: 1, sight: 4 }], map))
    const next = play(start, ["turnRight"])
    expect(next.enemies[0]).toMatchObject({ x: 4, y: 2 })
  })

  test("the hearts of a level and the goal to beat every enemy", () => {
    const lvl = { ...level([{ kind: "slime", x: 3, y: 1, sight: 0 }]), hearts: 5 }
    const start = startWorld(lvl)
    expect(start.hearts).toBe(5)
    expect(goalMet(start, { type: "enemies" })).toBe(false)
    expect(goalMet(play(start, ["move", "attack"]), { type: "enemies" })).toBe(true)
  })
})

describe("traps and steps", () => {
  test("a trap is floor the hero can step on, and the run ends there", () => {
    const world = parseMap(["#####", "#Sx.#", "#####"])
    expect(world.traps.has(cellKey(2, 1))).toBe(true)
    expect(trapAhead(world)).toBe(true)
    const { world: next, outcome } = applyAction(world, "move")
    expect(outcome).toBe("fell")
    expect(next.fell).toBe(true)
    expect(next.hero).toMatchObject({ x: 2, y: 1 })
  })

  test("a level with a step limit counts the steps, and the hero cannot step with none left", () => {
    const level: Level = {
      id: "t",
      title: "t",
      task: ["t"],
      map: ["#####", "#S..#", "#####"],
      blocks: ["move", "turnLeft"],
      goals: [{ type: "finish" }],
      maxSteps: 1
    }
    const start = startWorld(level)
    expect(start.energy).toBe(1)
    const once = applyAction(start, "move").world
    expect(once.energy).toBe(0)
    expect(applyAction(once, "turnLeft").outcome).toBe("turned")
    const tired = applyAction(once, "move")
    expect(tired.outcome).toBe("tired")
    expect(tired.world.hero).toEqual(once.hero)
    expect(parseMap(level.map).energy).toBeNull()
  })
})
