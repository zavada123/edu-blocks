import type { ReactNode, Ref } from "react"
import type { Level } from "../core/level.ts"
import type { RunResult } from "../core/program.ts"
import type { World } from "../core/world.ts"
import { Hud, type Progress } from "./Hud.tsx"
import { Quest } from "./Quest.tsx"
import { type Skin, Stage } from "./stage/Stage.tsx"
import { Timeline, type usePlayer } from "./Timeline.tsx"
import "./theme.css"
import "./blocks.css"

/** What the app can add around a level: the way to the map, the next level and the stars of passed levels. */
export interface GameNavigation {
  /** «← Мапа» over the game: back to the course. */
  readonly onMap?: () => void
  /** «Далі» in the result of a passed run. */
  readonly onNext?: () => void
  /** Stars of the levels the student has passed, by level id, for the chapter's levels in the bar. */
  readonly progress?: Progress
}

/**
 * The game screen, the same for blocks and for Python: the bar of the chapter and the hero, the field with its time
 * line and buttons, the task, and the editor that the caller gives. The result of a run shows over the field.
 */
export const GameScreen = ({
  rootRef,
  className,
  level,
  start,
  result,
  player,
  skin,
  running,
  editing,
  full,
  xpTotal,
  navigation,
  editorTitle,
  onRun,
  onReset,
  onFull,
  verdict,
  children
}: {
  readonly rootRef: Ref<HTMLDivElement>
  readonly className: string
  readonly level: Level
  readonly start: World
  readonly result: RunResult | null
  readonly player: ReturnType<typeof usePlayer>
  readonly skin: Skin
  readonly running: boolean
  /** No run to play: «Спочатку» has nothing to do. */
  readonly editing: boolean
  readonly full: boolean
  readonly xpTotal: number | undefined
  readonly navigation: { readonly onMap: (() => void) | undefined; readonly progress: Progress | undefined }
  readonly editorTitle: string
  readonly onRun: () => void
  readonly onReset: () => void
  readonly onFull: () => void
  /** The result of the last run, when it is open. */
  readonly verdict: ReactNode
  /** The editor. */
  readonly children: ReactNode
}) => {
  // The goals tick as the hero meets them.
  const world = result === null ? start : (result.frames[Math.floor(player.time) - 1]?.world ?? start)
  return (
    <div ref={rootRef} className={className}>
      <Hud level={level} skin={skin} xpTotal={xpTotal} progress={navigation.progress ?? {}} onMap={navigation.onMap} />
      <section className="eb-stage" aria-label="Поле">
        <div className="eb-field-frame eb-frame eb-wood">
          <Stage start={start} frames={result?.frames} time={player.time} skin={skin} scene={level.scene} />
        </div>
        <div className="eb-stage-bottom">
          {result !== null && <Timeline player={player} length={result.frames.length} />}
          <div className="eb-controls">
            <button type="button" className="eb-btn eb-btn-go eb-run" onClick={onRun} disabled={running && player.playing}>
              <span aria-hidden="true">▶</span> Запустити
            </button>
            <button type="button" className="eb-btn" onClick={onReset} disabled={editing}>
              <span aria-hidden="true">↺</span> Спочатку
            </button>
            <button
              type="button"
              className="eb-btn eb-btn-icon"
              onClick={onFull}
              aria-pressed={full}
              aria-label={full ? "Вийти з повного екрана" : "На весь екран"}
              title={full ? "Вийти з повного екрана (Esc)" : "На весь екран"}
            >
              <span aria-hidden="true">{full ? "⤡" : "⛶"}</span>
            </button>
          </div>
        </div>
        {verdict}
      </section>
      <Quest level={level} start={start} world={world} />
      <section className="eb-editor-pane eb-frame eb-slate" aria-label={editorTitle}>
        <h2 className="eb-editor-head">{editorTitle}</h2>
        {children}
      </section>
    </div>
  )
}
