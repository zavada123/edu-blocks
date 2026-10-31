import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ScratchBlocks, { type WorkspaceSvg } from "scratch-blocks/dist/vertical.js"
import type VirtualMachine from "scratch-vm"
import { serializeBlocks } from "scratch-vm/src/serialization/sb3.js"
import { HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID, procedureName } from "../core/blocks.ts"
import { buildProgram } from "../core/build.ts"
import { type Level, startWorld } from "../core/level.ts"
import { adviseRun } from "../core/advice.ts"
import { judgeProgram } from "../core/judge.ts"
import type { FailReason, Program, RunResult } from "../core/program.ts"
import { createVm, projectFor, settle, withVmLock } from "../core/run.ts"
import { useFullScreen } from "./fullscreen.ts"
import { type GameNavigation, GameScreen } from "./GameScreen.tsx"
import { frameIndexAt } from "./stage/playback.ts"
import type { Skin } from "./stage/Stage.tsx"
import { usePlayer } from "./Timeline.tsx"
import { toolboxXml } from "./toolbox.ts"
import { type HeroXp, type Reward, rewardOf, Verdict } from "./Verdict.tsx"

/** What the trainer gives the app after each run. The server runs `program` again before it trusts `passed`. */
export interface BlocksReport {
  readonly levelId: string
  readonly passed: boolean
  readonly stars: 0 | 1 | 2 | 3
  readonly blocks: number
  readonly reason: FailReason | null
  readonly program: Program
  /** No run of the level failed before this one since the editor opened. */
  readonly firstTry: boolean
  /** XP of this run (`xpFor`). The hero gets only the part above the best earlier run. */
  readonly xp: number
}

export type { HeroXp } from "./Verdict.tsx"

export interface EduBlocksProps extends GameNavigation {
  readonly level: Level
  readonly skin?: Skin
  /** Bigger blocks and field for the youngest: the first chapter of the course. */
  readonly large?: boolean
  /** A saved program to open the level with. */
  readonly program?: Program
  /** Folder with the scratch-blocks icons (`scratch-blocks/media`), ending with a slash. */
  readonly media?: string
  /** Milliseconds per hero action in the animation at the normal speed (×1). */
  readonly speed?: number
  readonly xp?: HeroXp
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

/** Workspace events that change the program: a block is added, removed, moved or gets a new field value. */
const PROGRAM_EVENTS: ReadonlySet<string> = new Set(["create", "delete", "change", "move"])

/** Editor width (px) below which the palette turns compact. */
const COMPACT_WIDTH = 560

type Phase =
  | { readonly kind: "edit" }
  | { readonly kind: "running" }
  | { readonly kind: "done"; readonly result: RunResult; readonly reward: Reward; readonly advice: ReadonlyArray<string> }

/** The program as in project.json, with the block ids of the editor (vm.toJSON() would shorten them). */
const heroProgram = (vm: VirtualMachine): Program => {
  const target = vm.editingTarget
  return target === null ? {} : serializeBlocks(target.blocks._blocks)[0]
}

export const EduBlocks = ({
  level,
  skin = "ninja",
  large = false,
  program,
  media = "./blocks-media/",
  speed = 400,
  xp,
  onComplete,
  onProgramChange,
  onMap,
  onNext,
  progress
}: EduBlocksProps) => {
  const start = useMemo(() => startWorld(level), [level])
  const [result, setResult] = useState<RunResult | null>(null)
  // What to do when the playback first reaches the end of the run: the verdict and the report.
  const onEndRef = useRef<(() => void) | null>(null)
  const player = usePlayer(speed, () => onEndRef.current?.())
  const [phase, setPhase] = useState<Phase>({ kind: "edit" })
  // On a phone the result covers the blocks until the student closes it.
  const [verdictOpen, setVerdictOpen] = useState(true)
  const editorRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<WorkspaceSvg | null>(null)
  const vmRef = useRef<VirtualMachine | null>(null)
  const glowRef = useRef<string | null>(null)
  const { rootRef, full, toggleFull } = useFullScreen()
  // Failed runs of this level since the editor opened: the first try bonus needs none.
  const failedRef = useRef(0)
  useEffect(() => {
    failedRef.current = 0
  }, [level])
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
    onEndRef.current = null
    setResult(null)
    setPhase({ kind: "edit" })

    // A narrow editor (a phone) gets a flat palette, a thinner flyout and smaller blocks.
    const compact = el.clientWidth < COMPACT_WIDTH
    ScratchBlocks.VerticalFlyout.prototype.DEFAULT_WIDTH = compact ? 150 : 250
    ScratchBlocks.ScratchMsgs.setLocale("uk")
    const ws = ScratchBlocks.inject(el, {
      toolbox: toolboxXml(level.blocks, compact, procedureName(level)),
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
      vmRef.current = null
      glowRef.current = null
      workspaceRef.current = null
      ws.dispose()
    }
  }, [level, start, media, large])

  const { seek, restart } = player
  const reset = useCallback(() => {
    onEndRef.current = null
    seek(0)
    setGlow(null)
    setResult(null)
    setPhase({ kind: "edit" })
  }, [seek, setGlow])

  // The block of the action on the field lights up, also when the student steps or drags the timeline.
  const frameIndex = result === null ? -1 : frameIndexAt(result.frames, player.time)
  const atEnd = result !== null && player.time >= result.frames.length
  const glowId = result === null || atEnd ? null : (result.frames[frameIndex]?.blockId ?? null)
  useEffect(() => setGlow(glowId), [glowId, setGlow])

  const run = useCallback(() => {
    const vm = vmRef.current
    if (vm === null) return
    reset()
    setPhase({ kind: "running" })
    const prog = heroProgram(vm)
    const result = judgeProgram(level, prog)
    const firstTry = failedRef.current === 0
    if (!result.passed) failedRef.current += 1
    const { runXp, reward } = rewardOf(level, result, firstTry, xp)
    const finish = () => {
      setPhase({ kind: "done", result, reward, advice: adviseRun(level, prog, result) })
      setVerdictOpen(true)
      onComplete?.({
        levelId: level.id,
        passed: result.passed,
        stars: result.stars,
        blocks: result.blocks,
        reason: result.reason,
        program: prog,
        firstTry,
        xp: runXp
      })
    }
    onEndRef.current = finish
    setResult(result)
    restart(result.frames.length)
  }, [level, onComplete, reset, restart, xp])

  const running = phase.kind === "running"
  const navigation = { onMap, progress }
  const xpTotal = phase.kind === "done" && phase.reward.total !== null ? phase.reward.total : xp?.total
  return (
    <GameScreen
      rootRef={rootRef}
      className={["eb-root", large ? "eb-large" : "", full ? "eb-full" : ""].filter(Boolean).join(" ")}
      level={level}
      start={start}
      result={result}
      player={player}
      skin={skin}
      running={running}
      editing={phase.kind === "edit"}
      full={full}
      xpTotal={xpTotal}
      navigation={navigation}
      editorTitle="Блоки героя"
      onRun={run}
      onReset={reset}
      onFull={toggleFull}
      verdict={
        phase.kind === "done" &&
        verdictOpen && (
          <Verdict level={level} result={phase.result} reward={phase.reward} advice={phase.advice} language="blocks" onClose={() => setVerdictOpen(false)} onNext={onNext} />
        )
      }
    >
      <div className="eb-editor" ref={editorRef} />
    </GameScreen>
  )
}
