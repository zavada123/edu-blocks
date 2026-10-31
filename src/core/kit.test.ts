import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { buildProgram } from "./build.ts"
import { judgeProgram } from "./judge.ts"
import { checkLevel, emptyMap, levelSource, plainRoute, resizeMap, setTile, tileAt } from "./kit.ts"
import type { Level } from "./level.ts"

const base: Level = {
  id: "my-1",
  title: "Мій рівень",
  task: ["Візьми дрова."],
  map: ["#####", "#S.c#", "#####"],
  blocks: ["move", "collect"],
  goals: [{ type: "crystals" }],
  stars: { three: 3, two: 5 },
  hint: "Рахуй клітинки."
}

describe("level kit", () => {
  test("an empty map is walls with the start inside", () => {
    expect(emptyMap(4, 3)).toEqual(["####", "#S##", "####"])
    expect(emptyMap(100, 1).length).toBe(3)
  })

  test("painting keeps one start and one finish", () => {
    let map = setTile(emptyMap(5, 3), 2, 1, "finish")
    map = setTile(map, 3, 1, "finish")
    expect(map).toEqual(["#####", "#S.F#", "#####"])
    map = setTile(map, 2, 1, "start")
    expect(map[1]).toBe("#.SF#")
    expect(setTile(map, 2, 1, "wall")).toBe(map)
    expect(tileAt(map, 3, 1)).toBe("finish")
  })

  test("a resized map keeps the start", () => {
    expect(resizeMap(["#####", "#...S", "#####"], 3, 3)).toEqual(["###", "#S.", "###"])
  })

  test("a good level has no errors, only warnings when something is missing", () => {
    expect(checkLevel(base)).toEqual([])
    const { hint: _hint, ...noHint } = base
    expect(checkLevel(noHint).map((i) => i.level)).toEqual(["warning"])
  })

  test("finds what keeps a level from being played", () => {
    const texts = (l: Level) =>
      checkLevel(l)
        .filter((i) => i.level === "error")
        .map((i) => i.text)
    expect(texts({ ...base, map: ["#####", "#S#c#", "#####"] })).toEqual(["Герой не дійде до 1 предмета: їх відрізають стіни або пастки"])
    expect(texts({ ...base, blocks: ["move"] })).toEqual(["Предмети треба брати, а в палітрі немає «взяти»"])
    expect(texts({ ...base, goals: [{ type: "finish" }] })).toEqual(["Мета — дійти до F, а на мапі немає F"])
    expect(texts({ ...base, map: ["#####", "#..c#", "#####"] })).toEqual(["На мапі немає старту S"])
  })

  test("warns about a villager on the path", () => {
    expect(checkLevel({ ...base, scene: { npcs: [{ who: "boy", x: 2, y: 1 }] } }).map((i) => i.text)).toEqual([
      "Людина стоїть на стежці: герой пройде крізь неї. Краще постав її на стіну поруч"
    ])
    expect(checkLevel({ ...base, scene: { npcs: [{ who: "boy", x: 2, y: 2 }] } })).toEqual([])
  })

  test("every library level passes the check", () => {
    for (const level of levels) expect(checkLevel(level).filter((i) => i.level === "error")).toEqual([])
  })

  test("the plain route of every library level passes it", () => {
    for (const level of levels) {
      const route = plainRoute(level)
      expect(route).not.toBeNull()
      expect(judgeProgram(level, buildProgram(route ?? [])).passed).toBe(true)
    }
  })

  test("the source is a level object without quoted keys", () => {
    const source = levelSource(base)
    expect(source).toContain('id: "my-1"')
    expect(source).toContain('map: [\n    "#####"')
  })

  test("enemies: on a wall, on the start, a goal without enemies, no «вдарити»", () => {
    const lvl: Level = { ...base, map: ["######", "#S..c#", "######"], goals: [{ type: "enemies" }], enemies: [] }
    expect(checkLevel(lvl).map((i) => i.text).join(" ")).toContain("ворогів на мапі немає")
    const bad: Level = { ...lvl, enemies: [{ kind: "slime", x: 0, y: 0 }, { kind: "slime", x: 1, y: 1 }] }
    const texts = checkLevel(bad).map((i) => i.text).join(" ")
    expect(texts).toContain("на стіні")
    expect(texts).toContain("на старті")
    expect(texts).toContain("немає «вдарити»")
  })

  test("the plain route strikes the enemies in the way and wins", () => {
    const lvl: Level = {
      ...base,
      map: ["#######", "#S...F#", "#######"],
      blocks: ["move", "attack"],
      goals: [{ type: "enemies" }, { type: "finish" }],
      enemies: [{ kind: "goblin", x: 3, y: 1, hp: 2, walk: "across" }]
    }
    const route = plainRoute(lvl)
    expect(route).toContain("attack")
    expect(judgeProgram(lvl, buildProgram(route ?? []))).toMatchObject({ passed: true })
  })
})
