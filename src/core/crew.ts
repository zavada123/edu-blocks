import { type ActionSource, newSession, type ProgramSteps, type Stage } from "./hero.ts"
import { goalStatus, type Level, startWorld } from "./level.ts"
import { type CrewStep, fatalReason, type Frame, type RunResult, type Session } from "./program.ts"
import { type Action, asWorker, type GameEvent, heroAction, worldTurn, type World } from "./world.ts"

/**
 * A crew: the hero and the helpers of the level (`Level.helpers`), each with its own program, on one map. A turn of
 * the day asks every worker for one action, the hero first, then the enemies, the towers and the crops take their
 * turn once. The programs run side by side as `ProgramSteps`: each gives the turn away after its action.
 *
 * The workers do not stand in each other's way. A worker who walks into a fence stops for the rest of the day and
 * the others go on; the day ends when its turns are spent, when every program has stopped, or when the enemies took
 * the hero's hearts.
 */

/** A worker's program on its stage, ready to run: `blocksRun` or `pythonRun` with the program given. */
export type CrewProgram = (stage: Stage) => ProgramSteps

/** What a turn's frame keeps of a worker's action. */
interface Done {
  readonly action: Action
  readonly outcome: CrewStep["outcome"]
  readonly events: ReadonlyArray<GameEvent>
  readonly source: ActionSource
}

const stepOf = (d: Done): CrewStep => ({
  action: d.action,
  outcome: d.outcome,
  events: d.events,
  blockId: d.source.blockId,
  ...(d.source.line === undefined ? {} : { line: d.source.line })
})

/**
 * Runs the day of a crew: `programs[0]` is the hero's, the next ones the helpers', in the order of `level.helpers`.
 * The result is the hero's run with a frame for each turn (`Frame.crew` has the helpers' actions) and every
 * worker's own run in `workers`.
 */
export const runCrew = (level: Level, programs: ReadonlyArray<CrewProgram>): RunResult => {
  const turns = level.turns ?? 0
  let world: World = startWorld(level)
  const count = Math.min(programs.length, world.crew.length + 1)
  const sessions: Array<Session> = Array.from({ length: count }, () => ({ ...newSession(level), world }))
  let turn = 0
  let done: Array<Done | null> = []

  const stageOf = (k: number): Stage => {
    const session = sessions[k] as Session
    const act = (action: Action, source: ActionSource): boolean => {
      const before = asWorker(world, k)
      const result = heroAction(before, action)
      const fatal = fatalReason(result.outcome)
      // A worker who walked into a fence stays where it stood; the others go on.
      const after = fatal === null ? result.world : before
      world = asWorker(after, k)
      session.world = after
      session.frames.push({
        action,
        outcome: result.outcome,
        blockId: source.blockId,
        events: result.events,
        goals: goalStatus(level, result.world),
        world: result.world,
        ...(source.line === undefined ? {} : { line: source.line }),
        ...(source.counter === undefined ? {} : { counter: source.counter }),
        ...(source.boxes === undefined ? {} : { boxes: source.boxes })
      })
      done[k] = { action, outcome: result.outcome, events: result.events, source }
      if (fatal !== null || turn >= turns - 1) {
        session.done = true
        session.reason = fatal
        return true
      }
      return false
    }
    return { session, act }
  }

  const runs = programs.slice(0, count).map((program, k) => program(stageOf(k)))
  const results: Array<RunResult | null> = runs.map(() => null)
  const frames: Array<Frame> = []

  /** Lets a worker's program go on to its next action, or to its end. */
  const resume = (k: number, over: boolean) => {
    const run = runs[k]
    if (run === undefined || results[k] !== null) return
    const session = sessions[k] as Session
    if (!over) session.world = asWorker(world, k)
    const step = run.next(over)
    if (step.done === true) results[k] = step.value
  }

  for (; turn < turns && results.some((r) => r === null); turn++) {
    done = runs.map(() => null)
    for (let k = 0; k < runs.length; k++) resume(k, false)
    if (done.every((d) => d === null)) break
    const after = worldTurn(world)
    world = after.world
    const hero = done[0] ?? null
    frames.push({
      action: hero?.action ?? "wait",
      outcome: hero?.outcome ?? "waited",
      blockId: hero?.source.blockId ?? null,
      events: [...(hero?.events ?? []), ...after.events],
      goals: goalStatus(level, world),
      world,
      ...(hero?.source.line === undefined ? {} : { line: hero.source.line }),
      crew: done.slice(1).map((d) => (d === null ? null : stepOf(d)))
    })
    if (world.hearts === 0) {
      const hero0 = sessions[0]
      if (hero0 !== undefined && results[0] === null) {
        hero0.done = true
        hero0.reason = "defeated"
      }
      break
    }
  }
  // The day is over: the programs still running stop where they are and give their results.
  for (let k = 0; k < runs.length; k++) {
    const session = sessions[k] as Session
    if (results[k] === null && !session.done) session.done = true
    resume(k, true)
  }
  const workers = results.map((r, k) => r ?? emptyResult(level, sessions[k] as Session))
  const first = workers[0] ?? emptyResult(level, newSession(level))
  return { ...first, frames, world, workers }
}

/** A run that gave no result: it cannot happen with `blocksRun` and `pythonRun`, which always return one. */
const emptyResult = (level: Level, session: Session): RunResult => ({
  levelId: level.id,
  passed: false,
  stars: 0,
  blocks: 0,
  collected: 0,
  totalCrystals: session.world.totalCrystals,
  reason: session.reason,
  frames: session.frames,
  world: session.world
})
