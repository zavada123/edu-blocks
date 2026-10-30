import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ScratchBlocks, { type WorkspaceSvg } from "scratch-blocks/dist/vertical.js"
import type VirtualMachine from "scratch-vm"
import { serializeBlocks } from "scratch-vm/src/serialization/sb3.js"
import { HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID } from "../core/blocks.ts"
import { buildProgram } from "../core/build.ts"
import { describeGoal, goalMet, type Level } from "../core/level.ts"
import { judgeProgram } from "../core/judge.ts"
import type { FailReason, Program, RunResult } from "../core/program.ts"
import { createVm, projectFor, settle, withVmLock } from "../core/run.ts"
import { parseMap, type World } from "../core/world.ts"
import { Field, type Skin } from "./Field.tsx"
import { toolboxXml } from "./toolbox.ts"
import "./blocks.css"

/** What the trainer gives the app after each run. The server runs `program` again before it trusts `passed`. */
export interface BlocksReport {
  readonly levelId: string
  readonly passed: boolean
  readonly stars: 0 | 1 | 2 | 3
  readonly blocks: number
  readonly reason: FailReason | null
  readonly program: Program
}

export interface EduBlocksProps {
  readonly level: Level
  readonly skin?: Skin
  /** Bigger blocks and field for grade 3. */
  readonly large?: boolean
  /** A saved program to open the level with. */
  readonly program?: Program
  /** Folder with the scratch-blocks icons (`scratch-blocks/media`), ending with a slash. */
  readonly media?: string
  /** Milliseconds per hero action in the animation. */
  readonly speed?: number
  readonly onComplete?: (report: BlocksReport) => void
  /** After each change of the blocks, with the program as it is now. An app that has its own check button sends it. */
  readonly onProgramChange?: (program: Program) => void
}

// Hero blocks drawn as Scratch extension blocks. The VM runs them by the same opcodes.
for (const b of HERO_BLOCKS) {
  const json = {
    type: `${HERO_EXTENSION_ID}_${b.name}`,
    message0: b.text,
    category: "pen",
    colour: HERO_COLOR,
    colourSecondary: "#0DA57A",
    colourTertiary: "#0B8E69",
    extensions: [b.boolean ? "output_boolean" : "shape_statement"]
  }
  ScratchBlocks.Blocks[json.type] = {
    init() {
      this.jsonInit(json)
    }
  }
}

const FAIL_TEXT: Readonly<Record<FailReason, string>> = {
  crashed: "Герой урізався в перешкоду.",
  goalsNotMet: "Програма закінчилась, а завдання ще не виконане.",
  tooLong: "Програма працює задовго. Можливо, цикл ніколи не закінчується.",
  noStart: "Поклади нагору програми блок «коли натиснуто прапорець».",
  badProgram: "Програму не вдалося запустити."
}

/** Workspace events that change the program: a block is added, removed, moved or gets a new field value. */
const PROGRAM_EVENTS: ReadonlySet<string> = new Set(["create", "delete", "change", "move"])

/** Editor width (px) below which the palette turns compact. */
const COMPACT_WIDTH = 560

type Phase = { readonly kind: "edit" } | { readonly kind: "running" } | { readonly kind: "done"; readonly result: RunResult }

/** The program as in project.json, with the block ids of the editor (vm.toJSON() would shorten them). */
const heroProgram = (vm: VirtualMachine): Program => {
  const target = vm.editingTarget
  return target === null ? {} : serializeBlocks(target.blocks._blocks)[0]
}

const Stars = ({ count }: { readonly count: number }) => (
  <span className="eb-stars" aria-label={`Зірок: ${count} з 3`}>
    {[1, 2, 3].map((i) => (
      <span key={i} className={i <= count ? "eb-star eb-star-on" : "eb-star"}>
        ★
      </span>
    ))}
  </span>
)

export const EduBlocks = ({ level, skin = "ninja", large = false, program, media = "./blocks-media/", speed = 350, onComplete, onProgramChange }: EduBlocksProps) => {
  const start = useMemo(() => parseMap(level.map, level.dir), [level])
  const [world, setWorld] = useState<World>(start)
  const [phase, setPhase] = useState<Phase>({ kind: "edit" })
  // On a phone the result covers the blocks until the student closes it.
  const [verdictOpen, setVerdictOpen] = useState(true)
  const editorRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<WorkspaceSvg | null>(null)
  const vmRef = useRef<VirtualMachine | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const glowRef = useRef<string | null>(null)
  // The first program only: a new `program` prop for the same level does not reset the student's work.
  const initialProgram = useRef(program)
  // The latest callback, so a new function from the app does not rebuild the editor.
  const onProgramChangeRef = useRef(onProgramChange)
  onProgramChangeRef.current = onProgramChange

  const setGlow = useCallback((id: string | null) => {
    const ws = workspaceRef.current
    if (ws === null) return
    if (glowRef.current !== null) ws.glowBlock(glowRef.current, false)
    glowRef.current = id
    if (id !== null) ws.glowBlock(id, true)
  }, [])

  useEffect(() => {
    const el = editorRef.current
    if (el === null) return
    let disposed = false
    setWorld(start)
    setPhase({ kind: "edit" })

    // A narrow editor (a phone) gets a flat palette, a thinner flyout and smaller blocks.
    const compact = el.clientWidth < COMPACT_WIDTH
    ScratchBlocks.VerticalFlyout.prototype.DEFAULT_WIDTH = compact ? 150 : 250
    ScratchBlocks.ScratchMsgs.setLocale("uk")
    const ws = ScratchBlocks.inject(el, {
      toolbox: toolboxXml(level.blocks, compact),
      media,
      sounds: false,
      comments: false,
      collapse: false,
      scrollbars: true,
      trashcan: false,
      grid: { spacing: 40, length: 2, colour: "#ddd" },
      zoom: { controls: true, wheel: true, startScale: (large ? 0.9 : 0.75) * (compact ? 0.75 : 1) }
    })
    workspaceRef.current = ws

    void withVmLock(async () => {
      const vm = createVm(null, null)
      const onUpdate = ({ xml }: { readonly xml: string }) => {
        ws.removeChangeListener(vm.blockListener)
        ScratchBlocks.Xml.clearWorkspaceAndLoadFromXml(ScratchBlocks.Xml.textToDom(xml), ws)
        ws.addChangeListener(vm.blockListener)
      }
      vm.on("workspaceUpdate", onUpdate)
      await vm.loadProject(projectFor(initialProgram.current ?? buildProgram([])))
      await settle()
      if (disposed) return
      ws.getFlyout()?.getWorkspace().addChangeListener(vm.flyoutBlockListener)
      // The VM updates its blocks in its own listener, which runs first.
      ws.addChangeListener((event: unknown) => {
        if (typeof event === "object" && event !== null && "type" in event && PROGRAM_EVENTS.has(String(event.type))) {
          onProgramChangeRef.current?.(heroProgram(vm))
        }
      })
      vmRef.current = vm
    })

    const resize = () => ScratchBlocks.svgResize(ws)
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    return () => {
      disposed = true
      observer.disconnect()
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      vmRef.current = null
      glowRef.current = null
      workspaceRef.current = null
      ws.dispose()
    }
  }, [level, start, media, large])

  const reset = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setGlow(null)
    setWorld(start)
    setPhase({ kind: "edit" })
  }, [setGlow, start])

  const run = useCallback(() => {
    const vm = vmRef.current
    if (vm === null) return
    reset()
    setPhase({ kind: "running" })
    const prog = heroProgram(vm)
    const result = judgeProgram(level, prog)
    const finish = () => {
      setGlow(null)
      setWorld(result.world)
      setPhase({ kind: "done", result })
      setVerdictOpen(true)
      onComplete?.({ levelId: level.id, passed: result.passed, stars: result.stars, blocks: result.blocks, reason: result.reason, program: prog })
    }
    const play = (i: number) => {
      const frame = result.frames[i]
      if (frame === undefined) return finish()
      setWorld(frame.world)
      setGlow(frame.blockId)
      timerRef.current = setTimeout(() => play(i + 1), speed)
    }
    play(0)
  }, [level, onComplete, reset, setGlow, speed])

  const running = phase.kind === "running"
  return (
    <div className={large ? "eb-root eb-large" : "eb-root"}>
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
          <Field world={world} skin={skin} scene={level.scene} />
        </div>
        <div className="eb-controls">
          <button type="button" className="eb-run" onClick={run} disabled={running}>
            <span aria-hidden="true">▶</span> Запустити
          </button>
          <button type="button" className="eb-reset" onClick={reset} disabled={phase.kind === "edit"}>
            <span aria-hidden="true">↺</span> Спочатку
          </button>
        </div>
        {phase.kind === "done" && verdictOpen && <Verdict level={level} result={phase.result} onClose={() => setVerdictOpen(false)} />}
      </section>
      <div className="eb-editor" ref={editorRef} />
    </div>
  )
}

const CloseButton = ({ onClose }: { readonly onClose: () => void }) => (
  <button type="button" className="eb-verdict-close" onClick={onClose}>
    Зрозуміло
  </button>
)

const Verdict = ({ level, result, onClose }: { readonly level: Level; readonly result: RunResult; readonly onClose: () => void }) => {
  if (result.passed) {
    const better = level.stars !== undefined && result.stars < 3 ? ` Для трьох зірок вистачить ${level.stars.three} блоків.` : ""
    return (
      <div className="eb-verdict eb-verdict-ok" role="status">
        <Stars count={result.stars} />
        <p>
          Рівень пройдено! Блоків: {result.blocks}.{better}
        </p>
        <CloseButton onClose={onClose} />
      </div>
    )
  }
  const reason = result.reason ?? "goalsNotMet"
  return (
    <div className="eb-verdict eb-verdict-fail" role="status">
      <p>{reason === "badProgram" && result.detail !== undefined ? result.detail : FAIL_TEXT[reason]}</p>
      {level.hint !== undefined && (reason === "crashed" || reason === "goalsNotMet") && <p className="eb-hint">Підказка: {level.hint}</p>}
      <CloseButton onClose={onClose} />
    </div>
  )
}
