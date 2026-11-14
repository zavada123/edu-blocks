import { describe, expect, test } from "vitest"
import type { Level } from "../../core/level.ts"
import {
  addRoutePoint,
  clearRoute,
  dropRoutePoint,
  gatesOfLever,
  itemAtCell,
  linkOf,
  moveSelected,
  pick,
  removeSelected,
  setItemAt,
  stillThere,
  tidyLinks,
  toggleLink,
  unlinkGate
} from "./select.ts"

const level: Level = {
  id: "t",
  title: "Рівень",
  task: ["Дійди до мети."],
  map: ["########", "#S.cLGF#", "#..L.G.#", "########"],
  blocks: ["move", "pull", "collect"],
  goals: [{ type: "finish" }],
  enemies: [{ kind: "slime", x: 2, y: 2 }],
  scene: { npcs: [{ who: "grandpa", x: 0, y: 1 }], sprites: [{ asset: "p:prop/rock", x: 6, y: 2 }] }
}

describe("pick", () => {
  test("picks the topmost thing: enemy, villager, picture, then a map sign with settings", () => {
    expect(pick(level, 2, 2)).toEqual({ kind: "enemy", index: 0 })
    expect(pick(level, 0, 1)).toEqual({ kind: "npc", index: 0 })
    expect(pick(level, 6, 2)).toEqual({ kind: "sprite", index: 0 })
    expect(pick(level, 4, 1)).toEqual({ kind: "cell", x: 4, y: 1 })
    expect(pick(level, 3, 1)).toEqual({ kind: "cell", x: 3, y: 1 })
  })

  test("plain path, walls and the meadow pick nothing", () => {
    expect(pick(level, 2, 1)).toBeNull()
    expect(pick(level, 0, 0)).toBeNull()
    expect(pick(level, -3, -3)).toBeNull()
  })

  test("a selection is gone once its thing is", () => {
    const sel = pick(level, 2, 2)
    expect(stillThere(level, sel)).toEqual(sel)
    expect(stillThere({ ...level, enemies: [] }, sel)).toBeNull()
    expect(stillThere({ ...level, map: ["########", "#S.c.GF#", "#..L.G.#", "########"] }, { kind: "cell", x: 4, y: 1 })).toBeNull()
  })
})

describe("move and remove", () => {
  test("an enemy moves by the drag, but not off the map or onto another enemy", () => {
    const sel = { kind: "enemy", index: 0 } as const
    expect(moveSelected(level, sel, { x: 3, y: 2 }, { x: 2, y: 2 }).enemies?.[0]).toEqual({ kind: "slime", x: 3, y: 2 })
    expect(moveSelected(level, sel, { x: 20, y: 2 }, { x: 2, y: 2 })).toBe(level)
    const two = { ...level, enemies: [...(level.enemies ?? []), { kind: "goblin" as const, x: 1, y: 2 }] }
    expect(moveSelected(two, sel, { x: 1, y: 2 }, { x: 2, y: 2 })).toBe(two)
  })

  test("pictures and villagers move anywhere, the meadow too", () => {
    expect(moveSelected(level, { kind: "sprite", index: 0 }, { x: 9, y: 0 }, { x: 6, y: 2 }).scene?.sprites?.[0]).toMatchObject({ x: 9, y: 0 })
    expect(moveSelected(level, { kind: "npc", index: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }).scene?.npcs?.[0]).toMatchObject({ x: -1, y: 1 })
  })

  test("removing a map sign leaves path and takes its link and item with it", () => {
    const linked = toggleLink(setItemAt(level, 3, 1, "egg"), { x: 5, y: 1 }, { x: 4, y: 1 })
    const noLever = removeSelected(linked, { kind: "cell", x: 4, y: 1 })
    expect(noLever.map[1]).toBe("#S.c.GF#")
    expect(noLever.links).toBeUndefined()
    const noItem = removeSelected(linked, { kind: "cell", x: 3, y: 1 })
    expect(noItem.scene?.itemsAt).toBeUndefined()
  })
})

describe("routes", () => {
  test("clicked cells become the route and the enemy patrols", () => {
    const one = addRoutePoint(level, 0, { x: 2, y: 1 })
    const two = addRoutePoint(one, 0, { x: 1, y: 1 })
    expect(two.enemies?.[0]).toEqual({ kind: "slime", x: 2, y: 2, walk: "patrol", route: [{ x: 2, y: 1 }, { x: 1, y: 1 }] })
    expect(addRoutePoint(two, 0, { x: 1, y: 1 })).toBe(two)
    expect(dropRoutePoint(two, 0).enemies?.[0]?.route).toEqual([{ x: 2, y: 1 }])
    expect(dropRoutePoint(dropRoutePoint(two, 0), 0).enemies?.[0]?.route).toBeUndefined()
    expect(clearRoute(two, 0).enemies?.[0]).toEqual({ kind: "slime", x: 2, y: 2 })
  })
})

describe("links of gates and levers", () => {
  test("a click links a lever to the gate, another click unlinks it", () => {
    const one = toggleLink(level, { x: 5, y: 1 }, { x: 4, y: 1 })
    expect(linkOf(one, { x: 5, y: 1 })?.levers).toEqual([{ x: 4, y: 1 }])
    const two = toggleLink(one, { x: 5, y: 1 }, { x: 3, y: 2 })
    expect(gatesOfLever(two, { x: 3, y: 2 })).toEqual([{ x: 5, y: 1 }])
    expect(toggleLink(toggleLink(two, { x: 5, y: 1 }, { x: 4, y: 1 }), { x: 5, y: 1 }, { x: 3, y: 2 }).links).toBeUndefined()
    expect(unlinkGate(two, { x: 5, y: 1 }).links).toBeUndefined()
  })

  test("only a gate links, and only to a lever", () => {
    expect(toggleLink(level, { x: 4, y: 1 }, { x: 4, y: 1 })).toBe(level)
    expect(toggleLink(level, { x: 5, y: 1 }, { x: 2, y: 1 })).toBe(level)
  })

  test("links to a lever painted over are dropped", () => {
    const linked = toggleLink(level, { x: 5, y: 1 }, { x: 4, y: 1 })
    expect(tidyLinks(linked)).toBe(linked)
    expect(tidyLinks({ ...linked, map: ["########", "#S.c.GF#", "#..L.G.#", "########"] }).links).toBeUndefined()
  })
})

describe("items", () => {
  test("a cell keeps its own item, and «як у рівні» takes it off", () => {
    const egg = setItemAt(level, 3, 1, "egg")
    expect(itemAtCell(egg, 3, 1)).toBe("egg")
    expect(setItemAt(egg, 3, 1, null).scene?.itemsAt).toBeUndefined()
    expect(setItemAt(level, 2, 1, "egg")).toBe(level)
  })
})
