import type { ReactNode } from "react"
import { describeGoal, goalMet, type Level } from "../core/level.ts"
import type { RunResult } from "../core/program.ts"
import type { World } from "../core/world.ts"
import { type Skin, Stage } from "./stage/Stage.tsx"
import { Timeline, type usePlayer } from "./Timeline.tsx"

/**
 * The game half of the screen, the same for blocks and for Python: the task and its goals, the field, the time line
 * and the buttons. The result of a run shows over it.
 */
export const GameStage = ({
  level,
  start,
  result,
  player,
  skin,
  running,
  editing,
  full,
  onRun,
  onReset,
  onFull,
  children
}: {
  readonly level: Level
  readonly start: World
  readonly result: RunResult | null
  readonly player: ReturnType<typeof usePlayer>
  readonly skin: Skin
  readonly running: boolean
  /** No run to play: «Спочатку» has nothing to do. */
  readonly editing: boolean
  readonly full: boolean
  readonly onRun: () => void
  readonly onReset: () => void
  readonly onFull: () => void
  /** The verdict, when there is one. */
  readonly children?: ReactNode
}) => {
  // The goals tick as the hero meets them.
  const world = result === null ? start : (result.frames[Math.floor(player.time) - 1]?.world ?? start)
  return (
    <section className="eb-stage">
      <header className="eb-task">
        {level.title !== "" && <h2>{level.title}</h2>}
        {level.task.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <ul className="eb-goals">
          {level.goals.map((g) => (
            <li key={g.type} className={goalMet(world, g) ? "eb-goal-ok" : ""}>
              {describeGoal(g, start, level.scene)}
            </li>
          ))}
        </ul>
      </header>
      <div className="eb-field-wrap">
        <Stage start={start} frames={result?.frames} time={player.time} skin={skin} scene={level.scene} />
      </div>
      {result !== null && <Timeline player={player} length={result.frames.length} />}
      <div className="eb-controls">
        <button type="button" className="eb-run" onClick={onRun} disabled={running && player.playing}>
          <span aria-hidden="true">▶</span> Запустити
        </button>
        <button type="button" className="eb-reset" onClick={onReset} disabled={editing}>
          <span aria-hidden="true">↺</span> Спочатку
        </button>
        <button
          type="button"
          className="eb-fullscreen"
          onClick={onFull}
          aria-pressed={full}
          aria-label={full ? "Вийти з повного екрана" : "На весь екран"}
          title={full ? "Вийти з повного екрана (Esc)" : "На весь екран"}
        >
          <span aria-hidden="true">{full ? "⤡" : "⛶"}</span>
        </button>
      </div>
      {children}
    </section>
  )
}
