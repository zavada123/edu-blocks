import { type MapTile, tileAt } from "../../core/kit.ts"
import type { GateLink, ItemKind, Level, Npc, PlacedSprite, Prop } from "../../core/level.ts"
import type { Cell, EnemySpec } from "../../core/world.ts"
import { PROPS } from "../../ui/look.ts"

/**
 * The tool «Вибір»: what a click on the map picks, and the changes the inspector makes to it. Pure functions of the
 * level, as the brushes in `edit.ts`, so they are easy to test and every change is one step to undo.
 */

/** The map signs that are things with settings of their own: the inspector opens for them. */
export const THING_TILES: ReadonlyArray<MapTile> = ["item", "lever", "leverOn", "gate", "start", "finish", "trap", "storehouse"]

/** What the inspector shows: a figure by its place in its list, or a cell of the map with a thing on it. */
export type Selection =
  | { readonly kind: "enemy"; readonly index: number }
  | { readonly kind: "npc"; readonly index: number }
  | { readonly kind: "sprite"; readonly index: number }
  | { readonly kind: "prop"; readonly index: number }
  | { readonly kind: "cell"; readonly x: number; readonly y: number }

const inside = (level: Level, x: number, y: number) => y >= 0 && x >= 0 && y < level.map.length && x < (level.map[y]?.length ?? 0)

const covers = (sprite: PlacedSprite, x: number, y: number): boolean => {
  const [, , w, h] = sprite.tiles ?? [0, 0, 1, 1]
  return x >= Math.floor(sprite.x) && x < Math.ceil(sprite.x + w) && y >= Math.floor(sprite.y) && y < Math.ceil(sprite.y + h)
}

const propCovers = (p: Prop, x: number, y: number) => {
  const { width, height } = PROPS[p.kind]
  return x >= Math.floor(p.x) && x < Math.ceil(p.x + width) && y >= Math.floor(p.y) && y < Math.ceil(p.y + height)
}

/** The topmost thing on a cell, in the order the right button erases: enemy, villager, picture, house, map sign. */
export const pick = (level: Level, x: number, y: number): Selection | null => {
  const enemy = (level.enemies ?? []).findIndex((e) => e.x === x && e.y === y)
  if (enemy >= 0) return { kind: "enemy", index: enemy }
  const npc = (level.scene?.npcs ?? []).findIndex((n) => n.x === x && n.y === y)
  if (npc >= 0) return { kind: "npc", index: npc }
  const sprite = (level.scene?.sprites ?? []).findLastIndex((s) => covers(s, x, y))
  if (sprite >= 0) return { kind: "sprite", index: sprite }
  const prop = (level.scene?.props ?? []).findLastIndex((p) => propCovers(p, x, y))
  if (prop >= 0) return { kind: "prop", index: prop }
  if (inside(level, x, y) && THING_TILES.includes(tileAt(level.map, x, y))) return { kind: "cell", x, y }
  return null
}

/** The same selection, or null once its thing is gone (erased, undone, the map changed under it). */
export const stillThere = (level: Level, sel: Selection | null): Selection | null => {
  if (sel === null) return null
  switch (sel.kind) {
    case "enemy":
      return (level.enemies ?? [])[sel.index] === undefined ? null : sel
    case "npc":
      return (level.scene?.npcs ?? [])[sel.index] === undefined ? null : sel
    case "sprite":
      return (level.scene?.sprites ?? [])[sel.index] === undefined ? null : sel
    case "prop":
      return (level.scene?.props ?? [])[sel.index] === undefined ? null : sel
    case "cell":
      return inside(level, sel.x, sel.y) && THING_TILES.includes(tileAt(level.map, sel.x, sel.y)) ? sel : null
  }
}

/** The cell a selection stands on, for the frame on the map. */
export const cellOfSelection = (level: Level, sel: Selection): Cell | null => {
  switch (sel.kind) {
    case "enemy":
      return (level.enemies ?? [])[sel.index] ?? null
    case "npc":
      return (level.scene?.npcs ?? [])[sel.index] ?? null
    case "sprite": {
      const s = (level.scene?.sprites ?? [])[sel.index]
      return s === undefined ? null : { x: Math.floor(s.x), y: Math.floor(s.y) }
    }
    case "prop": {
      const p = (level.scene?.props ?? [])[sel.index]
      return p === undefined ? null : { x: Math.floor(p.x), y: Math.floor(p.y) }
    }
    case "cell":
      return { x: sel.x, y: sel.y }
  }
}

const replaceAt = <T,>(list: ReadonlyArray<T>, index: number, value: T): ReadonlyArray<T> => list.map((v, i) => (i === index ? value : v))
const withScene = (level: Level, patch: Partial<NonNullable<Level["scene"]>>): Level => ({ ...level, scene: { ...level.scene, ...patch } })

export const setEnemy = (level: Level, index: number, enemy: EnemySpec): Level => ({
  ...level,
  enemies: replaceAt(level.enemies ?? [], index, enemy)
})
export const setNpc = (level: Level, index: number, npc: Npc): Level => withScene(level, { npcs: replaceAt(level.scene?.npcs ?? [], index, npc) })
export const setProp = (level: Level, index: number, prop: Prop): Level => withScene(level, { props: replaceAt(level.scene?.props ?? [], index, prop) })
export const setSprite = (level: Level, index: number, sprite: PlacedSprite): Level =>
  withScene(level, { sprites: replaceAt(level.scene?.sprites ?? [], index, sprite) })

/** Takes the selected thing away. A map sign turns into path, and its links and item go with it. */
export const removeSelected = (level: Level, sel: Selection): Level => {
  const index = sel.kind === "cell" ? -1 : sel.index
  const drop = <T,>(list: ReadonlyArray<T>) => list.filter((_, i) => i !== index)
  switch (sel.kind) {
    case "enemy":
      return { ...level, enemies: drop(level.enemies ?? []) }
    case "npc":
      return withScene(level, { npcs: drop(level.scene?.npcs ?? []) })
    case "sprite":
      return withScene(level, { sprites: drop(level.scene?.sprites ?? []) })
    case "prop":
      return withScene(level, { props: drop(level.scene?.props ?? []) })
    case "cell": {
      const row = level.map[sel.y] ?? ""
      const map = level.map.map((r, y) => (y === sel.y ? `${row.slice(0, sel.x)}.${row.slice(sel.x + 1)}` : r))
      return tidyLinks(setItemAt({ ...level, map }, sel.x, sel.y, null))
    }
  }
}

/** Moves a figure (enemy, villager, picture, house) to another cell; a house keeps its door on the cell. */
export const moveSelected = (level: Level, sel: Selection, to: Cell, from: Cell): Level => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) return level
  switch (sel.kind) {
    case "enemy": {
      const e = (level.enemies ?? [])[sel.index]
      if (e === undefined || !inside(level, e.x + dx, e.y + dy)) return level
      if ((level.enemies ?? []).some((o, i) => i !== sel.index && o.x === e.x + dx && o.y === e.y + dy)) return level
      return setEnemy(level, sel.index, { ...e, x: e.x + dx, y: e.y + dy })
    }
    case "npc": {
      const n = (level.scene?.npcs ?? [])[sel.index]
      return n === undefined ? level : setNpc(level, sel.index, { ...n, x: n.x + dx, y: n.y + dy })
    }
    case "sprite": {
      const s = (level.scene?.sprites ?? [])[sel.index]
      return s === undefined ? level : setSprite(level, sel.index, { ...s, x: s.x + dx, y: s.y + dy })
    }
    case "prop": {
      const p = (level.scene?.props ?? [])[sel.index]
      return p === undefined ? level : setProp(level, sel.index, { ...p, x: p.x + dx, y: p.y + dy })
    }
    case "cell":
      return level
  }
}

/* Enemy routes. */

/** Adds a cell to the end of a patrolling enemy's route; the enemy starts to patrol. */
export const addRoutePoint = (level: Level, index: number, cell: Cell): Level => {
  const e = (level.enemies ?? [])[index]
  if (e === undefined || !inside(level, cell.x, cell.y)) return level
  const route = e.route ?? []
  const last = route[route.length - 1]
  if (last !== undefined && last.x === cell.x && last.y === cell.y) return level
  return setEnemy(level, index, { ...e, walk: "patrol", route: [...route, { x: cell.x, y: cell.y }] })
}

/** Takes the last cell off the route. */
export const dropRoutePoint = (level: Level, index: number): Level => {
  const e = (level.enemies ?? [])[index]
  if (e === undefined || (e.route ?? []).length === 0) return level
  const route = (e.route ?? []).slice(0, -1)
  if (route.length > 0) return setEnemy(level, index, { ...e, route })
  const { route: _, ...rest } = e
  return setEnemy(level, index, rest)
}

/** Clears the route; a patrolling enemy stands again. */
export const clearRoute = (level: Level, index: number): Level => {
  const e = (level.enemies ?? [])[index]
  if (e === undefined) return level
  const { route: _, walk, ...rest } = e
  return setEnemy(level, index, walk === "patrol" || walk === undefined ? rest : { ...rest, walk })
}

/* Gates and levers. */

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y
const isLever = (level: Level, c: Cell) => inside(level, c.x, c.y) && ["lever", "leverOn"].includes(tileAt(level.map, c.x, c.y))
const isGate = (level: Level, c: Cell) => inside(level, c.x, c.y) && tileAt(level.map, c.x, c.y) === "gate"

/** The link of a gate, if it has its own levers. */
export const linkOf = (level: Level, gate: Cell): GateLink | undefined => (level.links ?? []).find((l) => same(l.gate, gate))

/** The gates a lever is linked to. */
export const gatesOfLever = (level: Level, lever: Cell): ReadonlyArray<Cell> =>
  (level.links ?? []).filter((l) => l.levers.some((c) => same(c, lever))).map((l) => l.gate)

const withLinks = (level: Level, links: ReadonlyArray<GateLink>): Level => {
  if (links.length > 0) return { ...level, links }
  const { links: _, ...rest } = level
  return rest
}

/** Links a lever to a gate, or unlinks it when it was linked. A gate left with no lever waits for every lever again. */
export const toggleLink = (level: Level, gate: Cell, lever: Cell): Level => {
  if (!isGate(level, gate) || !isLever(level, lever)) return level
  const links = level.links ?? []
  const own = linkOf(level, gate)
  if (own === undefined) return withLinks(level, [...links, { gate: { x: gate.x, y: gate.y }, levers: [{ x: lever.x, y: lever.y }] }])
  const levers = own.levers.some((c) => same(c, lever)) ? own.levers.filter((c) => !same(c, lever)) : [...own.levers, { x: lever.x, y: lever.y }]
  const rest = links.filter((l) => l !== own)
  return withLinks(level, levers.length === 0 ? rest : [...rest, { gate: own.gate, levers }])
}

/** The gate waits for every lever again. */
export const unlinkGate = (level: Level, gate: Cell): Level => withLinks(level, (level.links ?? []).filter((l) => !same(l.gate, gate)))

/** Drops the links to cells that are no gate or no lever any more: the editor calls it after every change of the map. */
export const tidyLinks = (level: Level): Level => {
  if (level.links === undefined) return level
  const links = level.links
    .filter((l) => isGate(level, l.gate))
    .map((l) => ({ gate: l.gate, levers: l.levers.filter((c) => isLever(level, c)) }))
    .filter((l) => l.levers.length > 0)
  const unchanged = links.length === level.links.length && links.every((l, i) => l.levers.length === level.links?.[i]?.levers.length)
  return unchanged ? level : withLinks(level, links)
}

/* Items. */

/** The item of one `c` cell (`Scene.itemsAt`), or the level's own item (`null`). */
export const setItemAt = (level: Level, x: number, y: number, item: ItemKind | null): Level => {
  const kept = (level.scene?.itemsAt ?? []).filter((i) => i.x !== x || i.y !== y)
  const itemsAt = item === null || !inside(level, x, y) || tileAt(level.map, x, y) !== "item" ? kept : [...kept, { x, y, item }]
  if (itemsAt.length > 0) return withScene(level, { itemsAt })
  if (level.scene?.itemsAt === undefined) return level
  const { itemsAt: _, ...scene } = level.scene
  return { ...level, scene }
}

export const itemAtCell = (level: Level, x: number, y: number): ItemKind | null =>
  (level.scene?.itemsAt ?? []).find((i) => i.x === x && i.y === y)?.item ?? null
