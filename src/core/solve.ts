import type { Step } from "./build.ts"
import type { Issue } from "./kit.ts"
import { allGoalsMet, type BlockName, type Level, startWorld } from "./level.ts"
import { type Action, applyAction, isAlive, isFatal, type World } from "./world.ts"

/**
 * Whether a level can be passed with the blocks of its palette, and the shortest way to do it. The search tries
 * every order of the hero actions the palette has (a breadth-first search over the states of the world, enemies
 * and the steps left included), so it finds a way when one exists. Loops and questions only make a program
 * shorter, so a level that the actions cannot pass cannot be passed at all; a level they can pass is also
 * passable as a plain list of these actions.
 *
 * Also checks that the palette makes sense: a question needs a block to put it in, «якщо» needs a question.
 */

const ACTIONS: ReadonlyArray<Action> = ["move", "turnLeft", "turnRight", "collect", "attack"]

/** States of the world the search looks at before it gives up. Big enough for any map of the editor. */
export const SOLVE_LIMIT = 400_000

/** Everything that decides what happens next, as one string. */
const stateKey = (w: World): string =>
  [
    w.hero.x,
    w.hero.y,
    w.hero.dir,
    w.energy ?? "-",
    w.hearts,
    [...w.crystals].sort().join(";"),
    w.enemies.map((e) => `${e.x},${e.y},${e.hp},${e.heading},${e.swinging ? 1 : 0}`).join(";")
  ].join("|")

export type SolveResult =
  | { readonly kind: "solved"; readonly actions: ReadonlyArray<Extract<Step, Action>> }
  | { readonly kind: "impossible" }
  /** The search looked at SOLVE_LIMIT states and stopped: the level is too big to be sure. */
  | { readonly kind: "unknown" }

interface Node {
  readonly world: World
  readonly action: Action | null
  readonly parent: Node | null
}

const pathOf = (node: Node): ReadonlyArray<Action> => {
  const actions: Array<Action> = []
  for (let n: Node | null = node; n !== null && n.action !== null; n = n.parent) actions.unshift(n.action)
  return actions
}

/** The hero actions of the palette. */
export const paletteActions = (level: Level): ReadonlyArray<Action> => ACTIONS.filter((a) => level.blocks.includes(a))

/** The shortest list of hero actions from the palette that passes the level, or why there is none. */
export const solveLevel = (level: Level, limit = SOLVE_LIMIT): SolveResult => {
  let start: World
  try {
    start = startWorld(level)
  } catch {
    return { kind: "impossible" }
  }
  if (level.goals.length === 0) return { kind: "impossible" }
  const actions = paletteActions(level)
  const root: Node = { world: start, action: null, parent: null }
  if (allGoalsMet(level, start)) return { kind: "solved", actions: [] }
  const seen = new Set([stateKey(start)])
  let wave: ReadonlyArray<Node> = [root]
  while (wave.length > 0) {
    const next: Array<Node> = []
    for (const node of wave) {
      for (const action of actions) {
        // A swing at nothing or a take on an empty cell only lets the enemies move: no use without enemies.
        if ((action === "attack" || action === "collect") && !node.world.enemies.some(isAlive) && wastes(node.world, action)) continue
        const done = applyAction(node.world, action)
        if (isFatal(done.outcome) || done.world.hearts <= 0) continue
        const child: Node = { world: done.world, action, parent: node }
        if (allGoalsMet(level, done.world)) return { kind: "solved", actions: pathOf(child) }
        const key = stateKey(done.world)
        if (seen.has(key)) continue
        seen.add(key)
        if (seen.size > limit) return { kind: "unknown" }
        next.push(child)
      }
    }
    wave = next
  }
  return { kind: "impossible" }
}

const wastes = (world: World, action: Action): boolean =>
  action === "attack" || !world.crystals.has(`${world.hero.x},${world.hero.y}`)

const QUESTIONS: ReadonlyArray<BlockName> = ["wallAhead", "onCrystal", "atFinish", "enemyAhead", "trapAhead"]
const ASKING: ReadonlyArray<BlockName> = ["if", "ifElse", "repeatUntil"]
const LOGIC: ReadonlyArray<BlockName> = ["not", "and", "or"]

/** Whether the blocks of the palette fit together and are enough to pass the level. */
export const paletteIssues = (level: Level): ReadonlyArray<Issue> => {
  const has = (b: BlockName) => level.blocks.includes(b)
  const issues: Array<Issue> = []
  const questions = QUESTIONS.filter(has)
  if (ASKING.some(has) && questions.length === 0)
    issues.push({ level: "error", text: "У палітрі є «якщо» або «повторити до», але немає жодного питання (блока з «?»)" })
  if (questions.length > 0 && !ASKING.some(has))
    issues.push({ level: "warning", text: "Питання з «?» нікуди вставити: додай «якщо» або «повторити до»" })
  if (LOGIC.some(has) && questions.length === 0) issues.push({ level: "warning", text: "«не», «і», «або» без питань нічого не роблять" })
  if (has("procedure") && !level.blocks.some((b) => ACTIONS.includes(b as Action)))
    issues.push({ level: "error", text: "Свій блок нема з чого скласти: у палітрі немає дій героя" })

  const solved = solveLevel(level)
  if (solved.kind === "impossible") {
    const steps = level.maxSteps === undefined ? "" : ` (кроків дозволено: ${level.maxSteps})`
    issues.push({ level: "error", text: `Рівень не пройти блоками палітри${steps}: перевір блоки, мапу й ворогів` })
  }
  return issues
}
