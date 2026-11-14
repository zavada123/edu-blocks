import { checkLevel } from "../../core/kit.ts"
import type { Level } from "../../core/level.ts"
import type { Chapter } from "../../levels/chapters.ts"

/**
 * The world map of the editor, as LDtk shows every level of a world on one canvas: the chapters of the course side by
 * side, each level a small picture of its map with its problems. Levels move within a chapter and between chapters;
 * the new order goes back into `src/levels/chapters.ts` as code, until levels live on the server.
 */

/** Where a level goes: a chapter and the place in it. */
export interface Spot {
  readonly chapter: string
  readonly index: number
}

/** The chapters with a level moved to a spot. A level that is not in any chapter is put there. Unknown chapters change nothing. */
export const moveLevel = (chapters: ReadonlyArray<Chapter>, levelId: string, to: Spot): ReadonlyArray<Chapter> => {
  if (!chapters.some((c) => c.id === to.chapter)) return chapters
  const from = chapters.find((c) => c.levels.includes(levelId))
  const before = from?.id === to.chapter ? from.levels.indexOf(levelId) : -1
  // Taking the level out first shifts the places after it by one.
  const index = before >= 0 && before < to.index ? to.index - 1 : to.index
  return chapters.map((c) => {
    const kept = c.levels.filter((id) => id !== levelId)
    if (c.id !== to.chapter) return kept.length === c.levels.length ? c : { ...c, levels: kept }
    const at = Math.max(0, Math.min(kept.length, index))
    return { ...c, levels: [...kept.slice(0, at), levelId, ...kept.slice(at)] }
  })
}

/** Whether two courses list the same levels in the same chapters and order. */
export const sameOrder = (a: ReadonlyArray<Chapter>, b: ReadonlyArray<Chapter>): boolean =>
  a.length === b.length && a.every((c, i) => c.id === b[i]?.id && c.levels.join() === b[i]?.levels.join())

/** The `levels` lines of `src/levels/chapters.ts` for the chapters whose order changed, ready to paste. */
export const orderSource = (chapters: ReadonlyArray<Chapter>, before: ReadonlyArray<Chapter>): string =>
  chapters
    .filter((c) => before.find((b) => b.id === c.id)?.levels.join() !== c.levels.join())
    .map((c) => `// ${c.title}\nlevels: [${c.levels.map((id) => JSON.stringify(id)).join(", ")}]`)
    .join("\n\n")

/** How a level reads on the map: its errors and warnings counted. */
export const levelHealth = (level: Level): { readonly errors: number; readonly warnings: number } => {
  const issues = checkLevel(level)
  return { errors: issues.filter((i) => i.level === "error").length, warnings: issues.filter((i) => i.level === "warning").length }
}
