import { type ReactNode, type Ref, useState } from "react"
import type { HeroId } from "../core/heroes.ts"
import type { Level } from "../core/level.ts"
import type { RunResult } from "../core/program.ts"
import type { World } from "../core/world.ts"
import { heroLevelOf } from "../core/xp.ts"
import { type FieldChoice, FieldTabs } from "./FieldTabs.tsx"
import { HeroPicker } from "./HeroPicker.tsx"
import { Hud, type Progress } from "./Hud.tsx"
import { Quest } from "./Quest.tsx"
import { type Skin, Stage } from "./stage/Stage.tsx"
import { Timeline, type usePlayer } from "./Timeline.tsx"
import type { HeroCoins } from "./Verdict.tsx"
import "./theme.css"
import "./blocks.css"

/** What the app can add around a level: the way to the map, the next level, the stars of passed levels, the coins and the shop. */
export interface GameNavigation {
  /** «← Мапа» over the game: back to the course. */
  readonly onMap?: () => void
  /** «Далі» in the result of a passed run. */
  readonly onNext?: () => void
  /**
   * The student clicked another level of the chapter in the bar. With it the squares of the levels are buttons; the
   * app opens that level (or not, when it keeps the level locked).
   */
  readonly onLevel?: (levelId: string) => void
  /** Stars of the levels the student has passed, by level id, for the chapter's levels in the bar. */
  readonly progress?: Progress
  /**
   * The student chose another hero. With it the hero's portrait in the bar opens the choice of the heroes that the
   * hero level has opened; the app keeps the choice and gives it back as `skin`.
   */
  readonly onSkinChange?: (skin: Skin) => void
  /** The student's coins: the bar shows them and a passed run shows what it added. The app counts them (`walletOf`). */
  readonly coins?: HeroCoins
  /** The heroes the student bought. Heroes with a price open only when bought. */
  readonly ownedHeroes?: ReadonlyArray<HeroId>
  /**
   * The student buys a hero for its price. With it the choice of the hero is also a shop; the app keeps the purchase
   * and gives back fewer `coins` and more `ownedHeroes`. Without it heroes with a price are not offered.
   */
  readonly onBuyHero?: (hero: HeroId) => void
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
  coinsTotal,
  navigation,
  editorTitle,
  fields,
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
  /** The student's coins; without them the bar shows none. */
  readonly coinsTotal: number | undefined
  readonly navigation: {
    readonly onMap: (() => void) | undefined
    readonly onLevel: ((levelId: string) => void) | undefined
    readonly progress: Progress | undefined
    readonly onSkinChange: ((skin: Skin) => void) | undefined
    readonly ownedHeroes: ReadonlyArray<HeroId> | undefined
    readonly onBuyHero: ((hero: HeroId) => void) | undefined
  }
  readonly editorTitle: string
  /** The tabs of a level with several fields; null for one field. */
  readonly fields: FieldChoice | null
  readonly onRun: () => void
  readonly onReset: () => void
  readonly onFull: () => void
  /** The result of the last run, when it is open. */
  readonly verdict: ReactNode
  /** The editor. */
  readonly children: ReactNode
}) => {
  const [picking, setPicking] = useState(false)
  // On a phone the field and the program take turns on the screen; a wider screen shows both and hides the tabs.
  const [tab, setTab] = useState<"field" | "code">("field")
  const runFromCode = () => {
    setTab("field")
    onRun()
  }
  const { onSkinChange, onMap, onLevel, ownedHeroes, onBuyHero } = navigation
  // The map is on the page: the game leaves full screen first.
  const toMap =
    onMap === undefined
      ? undefined
      : () => {
          if (full) onFull()
          onMap()
        }
  // The goals tick as the hero meets them.
  const world = result === null ? start : (result.frames[Math.floor(player.time) - 1]?.world ?? start)
  return (
    <div ref={rootRef} className={`${className} eb-tab-${tab}`}>
      <Hud
        level={level}
        skin={skin}
        xpTotal={xpTotal}
        coinsTotal={coinsTotal}
        progress={navigation.progress ?? {}}
        onMap={toMap}
        onLevel={onLevel}
        onPickHero={onSkinChange === undefined ? undefined : () => setPicking(true)}
      />
      <div className="eb-tabs" role="group" aria-label="Що показати">
        <button type="button" className="eb-btn eb-tab" aria-pressed={tab === "field"} onClick={() => setTab("field")}>
          Гра
        </button>
        <button type="button" className="eb-btn eb-tab" aria-pressed={tab === "code"} onClick={() => setTab("code")}>
          Програма
        </button>
        {tab === "code" && (
          <button type="button" className="eb-btn eb-btn-go eb-tab-run" onClick={runFromCode} disabled={running && player.playing}>
            <span aria-hidden="true">▶</span> Запустити
          </button>
        )}
      </div>
      <div className={fields === null ? "eb-stage" : "eb-stage eb-stage-fields"} role="group" aria-label="Поле">
        <div className="eb-field-frame eb-frame eb-wood">
          <Stage start={start} frames={result?.frames} time={player.time} skin={skin} scene={level.scene} />
        </div>
        <div className="eb-stage-bottom">
          {fields !== null && <FieldTabs {...fields} />}
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
      </div>
      <Quest level={level} start={start} world={world} />
      <div className="eb-editor-pane eb-frame eb-slate" role="group" aria-label={editorTitle}>
        <h2 className="eb-editor-head">{editorTitle}</h2>
        {children}
      </div>
      {picking && onSkinChange !== undefined && (
        <HeroPicker
          skin={skin}
          heroLevel={heroLevelOf(xpTotal ?? 0).level}
          owned={ownedHeroes ?? []}
          shop={onBuyHero === undefined ? null : { coins: coinsTotal ?? 0, onBuy: onBuyHero }}
          onPick={onSkinChange}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
