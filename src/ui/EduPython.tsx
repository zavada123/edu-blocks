import { useCallback, useMemo, useRef, useState } from "react"
import { COUNTER_NAME, procedureName } from "../core/blocks.ts"
import type { BlockName, Level } from "../core/level.ts"
import { startWorld } from "../core/level.ts"
import type { FailReason, RunResult } from "../core/program.ts"
import { HERO_NAME, type PythonMethod, pythonMethodsOf } from "../core/python/api.ts"
import { judgePython } from "../core/python/judge.ts"
import { CodeEditor, type CodeEditorApi } from "./code/CodeEditor.tsx"
import { useFullScreen } from "./fullscreen.ts"
import { GameStage } from "./GameStage.tsx"
import { frameIndexAt } from "./stage/playback.ts"
import type { Skin } from "./stage/Stage.tsx"
import { usePlayer } from "./Timeline.tsx"
import { type HeroXp, type Reward, rewardOf, Verdict } from "./Verdict.tsx"
import "./blocks.css"
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
  readonly source: string
  readonly firstTry: boolean
  readonly xp: number
}

export interface EduPythonProps {
  readonly level: Level
  readonly skin?: Skin
  /** Bigger text for the youngest. */
  readonly large?: boolean
  /** A saved program to open the level with. */
  readonly source?: string
  /** Milliseconds per hero action in the animation at the normal speed (×1). */
  readonly speed?: number
  readonly xp?: HeroXp
  readonly onComplete?: (report: PythonReport) => void
  /** After each change of the code. */
  readonly onSourceChange?: (source: string) => void
}

/** The code a level opens with when there is no saved program. */
export const starterSource = (): string => `# Напиши команди для героя, кожну з нового рядка.\n${HERO_NAME}.move()\n`

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
  return all.filter((s) => level.blocks.includes(s.block))
}

type Phase =
  | { readonly kind: "edit" }
  | { readonly kind: "running" }
  | { readonly kind: "done"; readonly result: RunResult; readonly reward: Reward }

export const EduPython = ({ level, skin = "ninja", large = false, source, speed = 400, xp, onComplete, onSourceChange }: EduPythonProps) => {
  const start = useMemo(() => startWorld(level), [level])
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
  const initial = useRef(source ?? starterSource())

  const { seek, restart } = player
  const reset = useCallback(() => {
    onEndRef.current = null
    seek(0)
    setResult(null)
    setPhase({ kind: "edit" })
  }, [seek])

  const run = useCallback(() => {
    const editor = editorRef.current
    if (editor === null) return
    reset()
    setPhase({ kind: "running" })
    const code = editor.read()
    const result = judgePython(level, code)
    const firstTry = failedRef.current === 0
    if (!result.passed) failedRef.current += 1
    const { runXp, reward } = rewardOf(level, result, firstTry, xp)
    onEndRef.current = () => {
      setPhase({ kind: "done", result, reward })
      setVerdictOpen(true)
      onComplete?.({ levelId: level.id, passed: result.passed, stars: result.stars, size: result.blocks, reason: result.reason, source: code, firstTry, xp: runXp })
    }
    setResult(result)
    restart(result.frames.length)
  }, [level, onComplete, reset, restart, xp])

  // The line the hero acts on lights up while the run plays; a mistake's line once the run reaches it.
  const atEnd = result !== null && player.time >= result.frames.length
  const runLine = result === null || atEnd ? null : (result.frames[frameIndexAt(result.frames, player.time)]?.line ?? null)
  const errorLine = atEnd && result?.reason === "badProgram" ? (result.line ?? null) : null
  const output = phase.kind === "done" ? (phase.result.output ?? []) : []

  const onReady = useCallback((api: CodeEditorApi, read: () => string) => {
    editorRef.current = { api, read }
  }, [])
  const onChange = useCallback((code: string) => onSourceChange?.(code), [onSourceChange])

  return (
    <div ref={rootRef} className={["eb-root", "eb-python", large ? "eb-large" : "", full ? "eb-full" : ""].filter(Boolean).join(" ")}>
      <GameStage
        level={level}
        start={start}
        result={result}
        player={player}
        skin={skin}
        running={phase.kind === "running"}
        editing={phase.kind === "edit"}
        full={full}
        onRun={run}
        onReset={reset}
        onFull={toggleFull}
      >
        {phase.kind === "done" && verdictOpen && (
          <Verdict level={level} result={phase.result} reward={phase.reward} advice={[]} language="python" onClose={() => setVerdictOpen(false)} />
        )}
      </GameStage>
      <div className="eb-editor eb-code-pane">
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
        <CodeEditor initial={initial.current} methods={methods} large={large} runLine={runLine} errorLine={errorLine} onChange={onChange} onReady={onReady} />
        {output.length > 0 && (
          <pre className="eb-output" aria-label="Що надрукувала програма">
            {output.join("\n")}
          </pre>
        )}
      </div>
    </div>
  )
}
