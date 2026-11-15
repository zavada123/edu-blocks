import type { BlockName } from "./level.ts"

/**
 * Ремесла of the farm (analysis/hutir/plan.md, 5.1 and 5.2). A craft grows from what the student's programs put in
 * the barn, never from work by hand: each level gives something the program can use. Level 2 gives a question, level
 * 3 makes the farm grow faster, level 4 gives a tool with a new block and level 5 a title.
 *
 * Pure, as the rest of the core: the farm keeps only the yield of its programs (`FarmState.produced`).
 */

export type CraftId = "woodcutter" | "gardener"

/** What a craft counts: logs or pumpkins the programs put in the barn. */
export type CraftResource = "wood" | "pumpkin"

export interface CraftStep {
  /** The yield from which this level is reached. */
  readonly from: number
  /** What the level gives, in the words of the craft card. */
  readonly gives: string
  /** The block the level brings into the palette. */
  readonly block?: BlockName
  /** The tool the level gives. */
  readonly tool?: string
}

export interface Craft {
  readonly id: CraftId
  readonly name: string
  readonly resource: CraftResource
  /** The title of the last level. */
  readonly title: string
  /** Levels 1 to 5: the first from the start. */
  readonly steps: ReadonlyArray<CraftStep>
}

export const MAX_CRAFT_LEVEL = 5
/** The level from which a craft makes the farm grow faster, and the one that gives its tool. */
export const FASTER_LEVEL = 3
export const TOOL_LEVEL = 4

export const CRAFTS: ReadonlyArray<Craft> = [
  {
    id: "woodcutter",
    name: "Лісоруб",
    resource: "wood",
    title: "Лісник",
    steps: [
      { from: 0, gives: "Базова команда «взяти» колоду" },
      { from: 30, gives: "Датчик «попереду дерево з колодою?»", block: "woodAhead" },
      { from: 80, gives: "Дерева відростають швидше: за 12 ходів замість 16" },
      { from: 150, gives: "Сокира: блок «рубати сокирою»", block: "chop", tool: "Сокира" },
      { from: 300, gives: "Звання «Лісник» і знак на хаті" }
    ]
  },
  {
    id: "gardener",
    name: "Городник",
    resource: "pumpkin",
    title: "Господар городу",
    steps: [
      { from: 0, gives: "«посіяти» і «тут порожня грядка?»" },
      { from: 25, gives: "Датчик «попереду стиглий гарбуз?»", block: "ripeAhead" },
      { from: 60, gives: "Гарбузи достигають швидше: за 18 ходів замість 24" },
      { from: 120, gives: "Лійка: блок «полити»", block: "water", tool: "Лійка" },
      { from: 250, gives: "Звання «Господар городу» і знак на хаті" }
    ]
  }
]

/** The level a yield gives, from 1 to 5. */
export const craftLevel = (craft: Craft, made: number): number => craft.steps.filter((s) => made >= s.from).length || 1

export interface CraftProgress {
  readonly craft: Craft
  readonly level: number
  /** What the programs made of the craft's resource so far. */
  readonly made: number
  /** The yield of the next level, or null at the last one. */
  readonly next: number | null
}

export const craftProgress = (craft: Craft, made: number): CraftProgress => {
  const level = craftLevel(craft, made)
  return { craft, level, made, next: craft.steps[level]?.from ?? null }
}

/** The blocks the crafts gave by this yield. */
export const craftBlocks = (made: Readonly<Record<CraftResource, number>>): ReadonlyArray<BlockName> =>
  CRAFTS.flatMap((c) => c.steps.slice(0, craftLevel(c, made[c.resource])).flatMap((s) => (s.block === undefined ? [] : [s.block])))

/** A craft that reached a new level: for the message after the day. */
export interface CraftUp {
  readonly craft: Craft
  readonly level: number
  readonly step: CraftStep
}

/** The levels the crafts reached between two yields, lowest first. */
export const craftUps = (before: Readonly<Record<CraftResource, number>>, after: Readonly<Record<CraftResource, number>>): ReadonlyArray<CraftUp> =>
  CRAFTS.flatMap((craft) => {
    const from = craftLevel(craft, before[craft.resource])
    const to = craftLevel(craft, after[craft.resource])
    return craft.steps.slice(from, to).map((step, i) => ({ craft, level: from + i + 1, step }))
  })
