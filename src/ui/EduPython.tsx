import { useCallback, useMemo, useRef, useState } from "react"
import { COUNTER_NAME, procedureName } from "../core/blocks.ts"
import { brokenSource } from "../core/broken.ts"
import { estateHarvest, type Harvest } from "../core/estate.ts"
import { combineFields } from "../core/fields.ts"
import { joinSources, linesBefore } from "../core/pieces.ts"
import type { BlockName, Level } from "../core/level.ts"
import type { FailReason, RunResult } from "../core/program.ts"
import { HERO_NAME, type PythonMethod, pythonMethodsOf } from "../core/python/api.ts"
import { judgePythonFields } from "../core/python/judge.ts"
import { CodeEditor, type CodeEditorApi } from "./code/CodeEditor.tsx"
import { Lesson } from "./Lesson.tsx"
import { useFields } from "./fields.ts"
import { useFullScreen } from "./fullscreen.ts"
import { type GameNavigation, GameScreen } from "./GameScreen.tsx"
import { frameIndexAt } from "./stage/playback.ts"
import type { Skin } from "./stage/Stage.tsx"
import { gradePieces, JOIN_TIP, PiecesBar, usePieces } from "./pieces.tsx"
import { usePlayer } from "./Timeline.tsx"
import { type EstateRun, harvestRewardOf, type HeroXp, type Reward, rewardOf, Verdict } from "./Verdict.tsx"
import "./python.css"

/**
 * The game with Python code instead of blocks, as in Tynker or CodeCombat: the field on one side, the code on the
 * other, the methods of the level above the code. The same levels, the same hero and the same grading rules.
 */

/** What the trainer gives the app after each run. The server runs `source` again with `judgePython`. */
export interface PythonReport {
  readonly levelId: string
  readonly passed: boolean
  readonly stars: 0 | 1 | 2 | 3
  /** The size of the program, counted as blocks (`programSize`). */
  readonly size: number
  readonly reason: FailReason | null
  /** The whole program: with «Продовжити звідси», all the pieces joined in one (`joinSources`). */
  readonly source: string
  /** How many pieces the student wrote the program in: 1 without «Продовжити звідси». */
  readonly pieces: number
  readonly firstTry: boolean
  readonly xp: number
  /** Coins of this run (`coinsFor`, or the harvest on a day of the estate). Like XP, the student gets only the part above the best earlier run. */
  readonly coins: number
  /** On a day of the estate: what the run gathered (`estateHarvest`). */
  readonly harvest: Harvest | null
}

export interface EduPythonProps extends GameNavigation {
  readonly level: Level
  readonly skin?: Skin
  /** Bigger text for the youngest. */
  readonly large?: boolean
  /** A saved program to open the level with. Without it a «Зламаний робот» level opens with its broken code. */
  readonly source?: string
  /** Milliseconds per hero action in the animation at the normal speed (×1). */
  readonly speed?: number
  readonly xp?: HeroXp
  /** A day of the estate: `level` is its level, and the result shows the harvest instead of stars and XP. */
  readonly estate?: EstateRun
  readonly onComplete?: (report: PythonReport) => void
  /** After each change of the code. */
  readonly onSourceChange?: (source: string) => void
}

/** The code a level opens with when there is no saved program. */
export const starterSource = (): string => `# Напиши команди для героя, кожну з нового рядка.\n${HERO_NAME}.move()\n`

/** What the editor holds after «Продовжити звідси»: the next piece starts empty. */
const NEXT_PIECE = "# Продовжуй звідси\n"

/** A line of the joined program as a line of the piece in the editor, or null when it is in an earlier piece. */
const pieceLine = (line: number | null | undefined, before: number): number | null =>
  line === null || line === undefined || line <= before ? null : line - before

/** A Python name for the custom block of the level: «мій блок» becomes мій_блок. */
const functionName = (level: Level): string => procedureName(level).replace(/[^\p{L}\p{N}_]+/gu, "_")

/**
 * Lines of Python that the palette of a level adds besides the hero's methods: its loops, branches and the rest.
 * A condition is a question the level has, the finish first.
 */
const snippetsOf = (level: Level, methods: ReadonlyArray<PythonMethod>): ReadonlyArray<{ readonly code: string; readonly doc: string }> => {
  const sensors = methods.filter((m) => m.sensor !== undefined)
  const ask = (preferred: string) => `${HERO_NAME}.${(sensors.find((m) => m.name === preferred) ?? sensors[0])?.name ?? "wall_ahead"}()`
  const name = functionName(level)
  const all: ReadonlyArray<{ readonly block: BlockName; readonly code: string; readonly doc: string }> = [
    { block: "repeat", code: "for i in range(3):", doc: "Повторити 3 рази те, що зсунуто нижче." },
    { block: "repeatUntil", code: `while not ${ask("at_finish")}:`, doc: "Повторювати, поки умова не стане правдою." },
    { block: "forever", code: "while True:", doc: "Повторювати завжди." },
    { block: "if", code: `if ${ask("wall_ahead")}:`, doc: "Якщо умова правда, зробити те, що зсунуто нижче." },
    { block: "ifElse", code: "else:", doc: "Інакше: що робити, коли умова не правда." },
    { block: "counter", code: `${COUNTER_NAME} = 0`, doc: "Змінна-лічильник." },
    { block: "procedure", code: `def ${name}():`, doc: `Своя функція: її команди зсунуті нижче, виклик — ${name}().` }
  ]
  const ideas = level.uses ?? []
  const pythonOnly: ReadonlyArray<{ readonly shown: boolean; readonly code: string; readonly doc: string }> = [
    { shown: ideas.includes("print") || level.prints !== undefined, code: 'print("Привіт!")', doc: "Надрукувати текст під кодом." },
    { shown: ideas.includes("input") && !ideas.includes("float"), code: 'int(input("Скільки?"))', doc: "Спитати й зробити з відповіді ціле число." },
    { shown: ideas.includes("float"), code: 'float(input("Скільки?"))', doc: "Спитати й зробити з відповіді дробове число." }
  ]
  return [...all.filter((s) => level.blocks.includes(s.block)), ...pythonOnly.filter((s) => s.shown)]
}

type Phase =
  | { readonly kind: "edit" }
  | { readonly kind: "running" }
  | {
      readonly kind: "done"
      /** The run as the screen shows it: after earlier pieces, only the new frames. */
      readonly result: RunResult
      readonly reward: Reward
      readonly advice: ReadonlyArray<string>
      /** The run of the whole program and the piece the student just ran, for «Продовжити звідси». */
      readonly full: RunResult
      readonly piece: string
      readonly canGoOn: boolean
    }

export const EduPython = ({ level, skin = "ninja", large = false, source, speed = 400, xp, estate, onComplete, onSourceChange, onMap, onNext, progress, onSkinChange, coins, ownedHeroes, onBuyHero }: EduPythonProps) => {
  const { fields, index: fieldIndex, setIndex: setFieldIndex, runs, setRuns, field, start } = useFields(level)
  const methods = useMemo(() => pythonMethodsOf(level.blocks), [level])
  const snippets = useMemo(() => snippetsOf(level, methods), [level, methods])
  const [result, setResult] = useState<RunResult | null>(null)
  const onEndRef = useRef<(() => void) | null>(null)
  const player = usePlayer(speed, () => onEndRef.current?.())
  const [phase, setPhase] = useState<Phase>({ kind: "edit" })
  const [verdictOpen, setVerdictOpen] = useState(true)
  const { rootRef, full, toggleFull } = useFullScreen()
  const failedRef = useRef(0)
  const editorRef = useRef<{ readonly api: CodeEditorApi; readonly read: () => string } | null>(null)
  const initial = useRef(source ?? level.starter ?? brokenSource(level) ?? starterSource())
  const [lessonOpen, setLessonOpen] = useState(true)
  // «Продовжити звідси»: the pieces run so far. While there are any, the editor holds only the new piece.
  const { done, ref: doneRef, setDone } = usePieces<string>(level)
  const offset = done === null ? 0 : linesBefore(done.pieces)

  const { seek, restart } = player
  const reset = useCallback(() => {
    onEndRef.current = null
    seek(0)
    setResult(null)
    setRuns(null)
    setPhase({ kind: "edit" })
  }, [seek, setRuns])

  const run = useCallback(() => {
    const editor = editorRef.current
    if (editor === null) return
    reset()
    setPhase({ kind: "running" })
    setLessonOpen(false)
    const piece = editor.read()
    const before = doneRef.current
    // After «Продовжити звідси» the pieces run as one program from the start; the screen plays only the new frames.
    const code = before === null ? piece : joinSources([...before.pieces, piece])
    const lines = before === null ? 0 : linesBefore(before.pieces)
    // The code runs on every field; the screen plays the first field it failed on, or the first field.
    const fieldRuns = judgePythonFields(level, code)
    const graded = gradePieces(level, combineFields(fieldRuns), before, large, "python")
    const result = graded.full
    // A mistake names its line in the editor, not in the joined program.
    const errorAt = pieceLine(graded.shown.line, lines)
    const { line: _line, ...rest } = graded.shown
    const shown: RunResult = errorAt === null ? rest : { ...rest, line: errorAt }
    const firstTry = failedRef.current === 0 && graded.pieces === 1
    if (!result.passed) failedRef.current += 1
    const harvest = estate === undefined ? null : estateHarvest(estate.day, result, graded.pieces)
    const { runXp, runCoins, reward } =
      harvest === null || estate === undefined ? rewardOf(level, result, firstTry, xp, coins) : harvestRewardOf(harvest, estate, firstTry, xp, coins)
    onEndRef.current = () => {
      setPhase({ kind: "done", result: shown, reward, advice: graded.capped ? [JOIN_TIP] : [], full: result, piece, canGoOn: graded.canGoOn })
      setVerdictOpen(true)
      onComplete?.({
        levelId: level.id,
        passed: result.passed,
        stars: result.stars,
        size: result.blocks,
        reason: result.reason,
        source: code,
        pieces: graded.pieces,
        firstTry,
        xp: runXp,
        coins: runCoins,
        harvest
      })
    }
    setRuns(fieldRuns)
    setFieldIndex(result.field ?? 0)
    setResult(shown)
    restart(shown.frames.length)
  }, [level, large, onComplete, reset, restart, setFieldIndex, setRuns, xp, coins, estate, doneRef])

  // «Продовжити звідси»: the hero stays where the run ended, the editor gets an empty piece.
  const goOn = useCallback(() => {
    if (phase.kind !== "done" || !phase.canGoOn) return
    setDone({ pieces: [...(done?.pieces ?? []), phase.piece], frames: phase.full.frames.length, world: phase.full.world, blocks: phase.full.blocks })
    reset()
    editorRef.current?.api.replace(NEXT_PIECE)
  }, [phase, done, setDone, reset])

  // The pieces become one program in the editor, and the hero goes back to the start to run it.
  const joinPieces = useCallback(() => {
    const editor = editorRef.current
    if (done === null || editor === null) return
    const joined = joinSources([...done.pieces, editor.read()])
    setDone(null)
    reset()
    editor.api.replace(joined)
  }, [done, setDone, reset])

  // Leave the pieces: the hero goes back to the start, the editor keeps the piece it has.
  const dropPieces = useCallback(() => {
    setDone(null)
    reset()
  }, [setDone, reset])

  // A field tab: before a run it shows the field, after a run it plays the run on that field.
  const pickField = useCallback(
    (i: number) => {
      setFieldIndex(i)
      const run = runs?.[i]
      if (run === undefined) return
      onEndRef.current = null
      setVerdictOpen(false)
      setResult(run)
      restart(run.frames.length)
    },
    [restart, runs, setFieldIndex]
  )

  // The line the hero acts on lights up while the run plays; a mistake's line once the run reaches it.
  const atEnd = result !== null && player.time >= result.frames.length
  const runLine = result === null || atEnd ? null : pieceLine(result.frames[frameIndexAt(result.frames, player.time)]?.line, offset)
  const errorLine = atEnd && result?.reason === "badProgram" ? (result.line ?? null) : null
  const output = phase.kind === "done" ? (phase.result.output ?? []) : []

  const onReady = useCallback((api: CodeEditorApi, read: () => string) => {
    editorRef.current = { api, read }
  }, [])
  // A piece is not the program: the app keeps the code the student had before the pieces.
  const onChange = useCallback(
    (code: string) => {
      if (doneRef.current === null) onSourceChange?.(code)
    },
    [onSourceChange, doneRef]
  )

  const navigation = { onMap, progress, onSkinChange, ownedHeroes, onBuyHero }
  const xpTotal = phase.kind === "done" && phase.reward.total !== null ? phase.reward.total : xp?.total
  // The app counts the coins: after a run it adds the gain, after a purchase it takes the price.
  const coinsTotal = coins?.total
  return (
    <GameScreen
      rootRef={rootRef}
      className={["eb-root", "eb-python", large ? "eb-large" : "", full ? "eb-full" : ""].filter(Boolean).join(" ")}
      level={field}
      start={done?.world ?? start}
      result={result}
      player={player}
      skin={skin}
      running={phase.kind === "running"}
      editing={phase.kind === "edit"}
      full={full}
      xpTotal={xpTotal}
      coinsTotal={coinsTotal}
      navigation={navigation}
      editorTitle="Код героя"
      fields={
        fields.length > 1
          ? { count: fields.length, index: fieldIndex, passed: runs?.map((r) => r.passed) ?? null, disabled: phase.kind === "running", onPick: pickField }
          : null
      }
      onRun={run}
      onReset={reset}
      onFull={toggleFull}
      verdict={
        phase.kind === "done" &&
        verdictOpen && (
          <Verdict
            level={level}
            result={phase.result}
            reward={phase.reward}
            advice={phase.advice}
            language="python"
            onClose={() => setVerdictOpen(false)}
            onNext={onNext}
            onContinue={phase.canGoOn ? goOn : undefined}
          />
        )
      }
    >
      {level.lesson !== undefined && <Lesson lesson={level.lesson} open={lessonOpen} onToggle={setLessonOpen} />}
      <div className="eb-palette" role="toolbar" aria-label="Команди рівня: натисни, щоб додати в код">
        {methods.map((m) => (
          <button key={m.name} type="button" className={m.sensor === undefined ? "eb-chip eb-chip-hero" : "eb-chip eb-chip-sense"} title={m.doc} onClick={() => editorRef.current?.api.insert(`${HERO_NAME}.${m.name}()`)}>
            {HERO_NAME}.{m.signature}
          </button>
        ))}
        {snippets.map((s) => (
          <button key={s.code} type="button" className="eb-chip eb-chip-code" title={s.doc} onClick={() => editorRef.current?.api.insert(s.code)}>
            {s.code}
          </button>
        ))}
      </div>
      <PiecesBar done={done} unit={["команда", "команди", "команд"]} onJoin={joinPieces} onRestart={dropPieces} />
      <CodeEditor initial={initial.current} methods={methods} large={large} runLine={runLine} errorLine={errorLine} onChange={onChange} onReady={onReady} />
      {output.length > 0 && (
        <pre className="eb-output" aria-label="Що надрукувала програма">
          {output.join("\n")}
        </pre>
      )}
    </GameScreen>
  )
}
