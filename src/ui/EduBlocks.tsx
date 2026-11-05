import { useCallback, useEffect, useRef, useState } from "react"
import ScratchBlocks, { type WorkspaceSvg } from "scratch-blocks/dist/vertical.js"
import type VirtualMachine from "scratch-vm"
import { serializeBlocks } from "scratch-vm/src/serialization/sb3.js"
import { HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID, heroBlockText, ITEM_FIELD, ITEM_NAMES, itemMenu, procedureName } from "../core/blocks.ts"
import { brokenProgram } from "../core/broken.ts"
import { buildProgram } from "../core/build.ts"
import { combineFields } from "../core/fields.ts"
import type { Level, Scene } from "../core/level.ts"
import { adviseRun } from "../core/advice.ts"
import { estateHarvest, type Harvest } from "../core/estate.ts"
import { judgeFields } from "../core/judge.ts"
import { isPiece, joinPrograms, pieceBlockId, scriptCount } from "../core/pieces.ts"
import type { FailReason, Program, RunResult } from "../core/program.ts"
import { programSource } from "../core/python/convert.ts"
import { createVm, projectFor, settle, withVmLock } from "../core/run.ts"
import { useFields } from "./fields.ts"
import { useFullScreen } from "./fullscreen.ts"
import { loadPeek, loadZoom, savePeek, saveZoom } from "./prefs.ts"
import { type GameNavigation, GameScreen } from "./GameScreen.tsx"
import { PythonPeek } from "./PythonPeek.tsx"
import { frameIndexAt } from "./stage/playback.ts"
import type { Skin } from "./stage/Stage.tsx"
import { gradePieces, JOIN_TIP, PiecesBar, usePieces } from "./pieces.tsx"
import { usePlayer } from "./Timeline.tsx"
import { toolboxXml } from "./toolbox.ts"
import { type EstateRun, harvestRewardOf, type HeroXp, type Reward, rewardOf, Verdict } from "./Verdict.tsx"

/** What the trainer gives the app after each run. The server runs `program` again before it trusts `passed`. */
export interface BlocksReport {
  readonly levelId: string
  readonly passed: boolean
  readonly stars: 0 | 1 | 2 | 3
  readonly blocks: number
  readonly reason: FailReason | null
  /** The whole program: with «Продовжити звідси», all the pieces joined in one (`joinPrograms`). */
  readonly program: Program
  /** How many pieces the student wrote the program in: 1 without «Продовжити звідси». */
  readonly pieces: number
  /** No run of the level failed before this one since the editor opened. */
  readonly firstTry: boolean
  /** XP of this run (`xpFor`). The hero gets only the part above the best earlier run. */
  readonly xp: number
  /** Coins of this run (`coinsFor`, or the harvest on a day of the estate). Like XP, the student gets only the part above the best earlier run. */
  readonly coins: number
  /** On a day of the estate: what the run gathered (`estateHarvest`). */
  readonly harvest: Harvest | null
}

export type { HeroXp } from "./Verdict.tsx"

export interface EduBlocksProps extends GameNavigation {
  readonly level: Level
  readonly skin?: Skin
  /** Bigger blocks and field for the youngest: the first chapter of the course. */
  readonly large?: boolean
  /** A saved program to open the level with. Without it a «Зламаний робот» level opens with its broken program. */
  readonly program?: Program
  /** Folder with the scratch-blocks icons (`scratch-blocks/media`), ending with a slash. */
  readonly media?: string
  /** Milliseconds per hero action in the animation at the normal speed (×1). */
  readonly speed?: number
  readonly xp?: HeroXp
  /** A day of the estate: `level` is its level, and the result shows the harvest instead of stars and XP. */
  readonly estate?: EstateRun
  readonly onComplete?: (report: BlocksReport) => void
  /** After each change of the blocks, with the program as it is now. An app that has its own check button sends it. */
  readonly onProgramChange?: (program: Program) => void
}

/**
 * The scene of the level the editor shows: «взяти» reads «розпалити» where the items are campfires. scratch-blocks
 * keeps one definition per block type, so the words are taken when a block is made, after the editor set this.
 */
let editorScene: Scene | undefined

// Hero blocks drawn as Scratch extension blocks. The VM runs them by the same opcodes.
for (const b of HERO_BLOCKS) {
  const json = {
    type: `${HERO_EXTENSION_ID}_${b.name}`,
    category: "pen",
    colour: HERO_COLOR,
    colourSecondary: "#0DA57A",
    colourTertiary: "#0B8E69",
    extensions: [b.boolean ? "output_boolean" : "shape_statement"]
  }
  ScratchBlocks.Blocks[json.type] = {
    init() {
      if (b.name === "itemIs") {
        // «тут ‹…›?»: the drop-down offers the kinds that lie on this level.
        const options = itemMenu(editorScene).map((k) => [ITEM_NAMES[k], k])
        this.jsonInit({ ...json, message0: "тут %1?", args0: [{ type: "field_dropdown", name: ITEM_FIELD, options }] })
        return
      }
      this.jsonInit({ ...json, message0: heroBlockText(b.name, editorScene) })
    }
  }
}

/** Workspace events that change the program: a block is added, removed, moved or gets a new field value. */
const PROGRAM_EVENTS: ReadonlySet<string> = new Set(["create", "delete", "change", "move"])

/** Editor width (px) below which the palette turns compact. */
const COMPACT_WIDTH = 560
/** The flyout grows with the zoom, up to this part of the editor's width. */
const MAX_FLYOUT_SHARE = 0.45

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
      readonly piece: Program
      readonly canGoOn: boolean
    }

/** «Продовжити звідси» with a second script: it would run side by side with the pieces before. */
const TWO_SCRIPTS = "Продовжуй однією програмою: залиш один блок «коли натиснуто прапорець»."

/** The program as in project.json, with the block ids of the editor (vm.toJSON() would shorten them). */
const heroProgram = (vm: VirtualMachine): Program => {
  const target = vm.editingTarget
  return target === null ? {} : serializeBlocks(target.blocks._blocks)[0]
}

/**
 * The zoom buttons and the mouse wheel zoom the blocks of the flyout too, not only the program: the student sees
 * the blocks to choose at the same size. The flyout grows with them. `onZoom` gets each new zoom as a share of the
 * start scale.
 */
const followZoomInFlyout = (ws: WorkspaceSvg, el: HTMLElement, toolboxXml: string, onZoom: (zoom: number) => void) => {
  const startScale = ws.scale
  const baseWidth = ScratchBlocks.VerticalFlyout.prototype.DEFAULT_WIDTH
  const setScale = ws.setScale.bind(ws)
  ws.setScale = (scale: number) => {
    setScale(scale)
    onZoom(ws.scale / startScale)
    const flyout = ws.getFlyout()
    if (flyout === null || flyout.getWorkspace().scale === ws.scale) return
    flyout.getWorkspace().scale = ws.scale
    const width = Math.round(Math.min((baseWidth * ws.scale) / startScale, el.clientWidth * MAX_FLYOUT_SHARE))
    // A flat palette (a narrow editor) has no toolbox: then the flyout is all.
    const toolbox = ws.getToolbox() ?? null
    if (toolbox === null) {
      // This flyout lies over the program: the program moves by what the flyout grows, so it stays in sight.
      ws.scrollX += width - flyout.DEFAULT_WIDTH
      flyout.DEFAULT_WIDTH = width
      ws.updateToolbox(toolboxXml)
      ws.translate(ws.scrollX, ws.scrollY)
    } else {
      // The toolbox is the categories and the flyout: it grows by what the flyout grows.
      toolbox.width += width - flyout.DEFAULT_WIDTH
      flyout.DEFAULT_WIDTH = width
      toolbox.refreshSelection()
    }
    ScratchBlocks.svgResize(ws)
  }
}

export const EduBlocks = ({
  level,
  skin = "ninja",
  large = false,
  program,
  media = "./blocks-media/",
  speed = 400,
  xp,
  estate,
  onComplete,
  onProgramChange,
  onMap,
  onNext,
  onLevel,
  progress,
  onSkinChange,
  coins,
  ownedHeroes,
  onBuyHero
}: EduBlocksProps) => {
  // The field on the screen and the runs of the last check on each field.
  const { fields, index: fieldIndex, setIndex: setFieldIndex, runs, setRuns, field, start } = useFields(level)
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
  // «Як це в Python» under the blocks: open or closed stays across levels, the code follows each change of the blocks.
  const [peek, setPeek] = useState(loadPeek)
  const peekRef = useRef(peek)
  const [peekSource, setPeekSource] = useState("")
  // «Продовжити звідси»: the pieces run so far. While there are any, the editor holds only the new piece.
  const { done, ref: doneRef, setDone } = usePieces<Program>(level)

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

    // A narrow editor (a phone) gets a flat palette and a thinner flyout. The blocks stay big enough for a finger.
    const compact = el.clientWidth < COMPACT_WIDTH
    ScratchBlocks.VerticalFlyout.prototype.DEFAULT_WIDTH = compact ? 190 : 250
    ScratchBlocks.ScratchMsgs.setLocale("uk")
    editorScene = level.scene
    const toolbox = toolboxXml(level.blocks, compact, procedureName(level))
    const ws = ScratchBlocks.inject(el, {
      toolbox,
      media,
      sounds: false,
      comments: false,
      collapse: false,
      scrollbars: true,
      trashcan: false,
      grid: { spacing: 40, length: 2, colour: "#ddd" },
      zoom: { controls: true, wheel: true, startScale: (large ? 0.9 : 0.75) * (compact ? 0.95 : 1) }
    })
    workspaceRef.current = ws
    // The zoom the student chose last time, also on another level or after a reload.
    const savedZoom = loadZoom()
    followZoomInFlyout(ws, el, toolbox, saveZoom)
    if (savedZoom !== 1) ws.setScale(ws.scale * savedZoom)

    void withVmLock(async () => {
      const vm = createVm(null, null)
      const onUpdate = ({ xml }: { readonly xml: string }) => {
        ws.removeChangeListener(vm.blockListener)
        ScratchBlocks.Xml.clearWorkspaceAndLoadFromXml(ScratchBlocks.Xml.textToDom(xml), ws)
        ws.addChangeListener(vm.blockListener)
      }
      vm.on("workspaceUpdate", onUpdate)
      await vm.loadProject(projectFor(initialProgram.current ?? brokenProgram(level) ?? buildProgram([])))
      await settle()
      if (disposed) return
      ws.getFlyout()?.getWorkspace().addChangeListener(vm.flyoutBlockListener)
      const updatePeek = () => {
        if (peekRef.current) setPeekSource(programSource(level, heroProgram(vm)))
      }
      // The VM updates its blocks in its own listener, which runs first.
      ws.addChangeListener((event: unknown) => {
        if (typeof event === "object" && event !== null && "type" in event && PROGRAM_EVENTS.has(String(event.type))) {
          // A piece is not the program: the app keeps the program the student had before the pieces.
          if (doneRef.current === null) onProgramChangeRef.current?.(heroProgram(vm))
          updatePeek()
        }
      })
      vmRef.current = vm
      updatePeek()
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
  }, [level, media, large, doneRef])

  const { seek, restart } = player
  const reset = useCallback(() => {
    onEndRef.current = null
    seek(0)
    setGlow(null)
    setResult(null)
    setRuns(null)
    setPhase({ kind: "edit" })
  }, [seek, setGlow, setRuns])

  // The block of the action on the field lights up, also when the student steps or drags the timeline.
  const frameIndex = result === null ? -1 : frameIndexAt(result.frames, player.time)
  const atEnd = result !== null && player.time >= result.frames.length
  // After «Продовжити звідси» the frames name the blocks of the joined program: only the new piece is in the editor.
  const frameBlock = result === null || atEnd ? null : (result.frames[frameIndex]?.blockId ?? null)
  const glowId = done === null ? frameBlock : pieceBlockId(frameBlock, done.pieces.length)
  useEffect(() => setGlow(glowId), [glowId, setGlow])

  const run = useCallback(() => {
    const vm = vmRef.current
    if (vm === null) return
    reset()
    setPhase({ kind: "running" })
    const piece = heroProgram(vm)
    const before = doneRef.current
    // After «Продовжити звідси» the pieces run as one program from the start; the screen plays only the new frames.
    const joined = before === null ? piece : isPiece(piece) ? joinPrograms([...before.pieces, piece]) : null
    const prog = joined ?? piece
    // The program runs on every field; the screen plays the first field it failed on, or the first field.
    const fieldRuns =
      before !== null && scriptCount(piece) > 1
        ? [{ ...combineFields(judgeFields(level, {})), reason: "badProgram" as const, detail: TWO_SCRIPTS }]
        : judgeFields(level, prog)
    const graded = gradePieces(level, combineFields(fieldRuns), before, large, "blocks")
    const result = graded.full
    const shown = result.field ?? 0
    const firstTry = failedRef.current === 0 && graded.pieces === 1
    if (!result.passed) failedRef.current += 1
    const harvest = estate === undefined ? null : estateHarvest(estate.day, result, graded.pieces)
    const { runXp, runCoins, reward } =
      harvest === null || estate === undefined ? rewardOf(level, result, firstTry, xp, coins) : harvestRewardOf(harvest, estate, firstTry, xp, coins)
    const advice = adviseRun(fields[shown] ?? level, prog, result)
    const finish = () => {
      setPhase({
        kind: "done",
        result: graded.shown,
        reward,
        advice: graded.capped ? [...advice, JOIN_TIP] : advice,
        full: result,
        piece,
        canGoOn: graded.canGoOn
      })
      setVerdictOpen(true)
      onComplete?.({
        levelId: level.id,
        passed: result.passed,
        stars: result.stars,
        blocks: result.blocks,
        reason: result.reason,
        program: prog,
        pieces: graded.pieces,
        firstTry,
        xp: runXp,
        coins: runCoins,
        harvest
      })
    }
    onEndRef.current = finish
    setRuns(fieldRuns)
    setFieldIndex(shown)
    setResult(graded.shown)
    restart(graded.shown.frames.length)
  }, [level, fields, large, onComplete, reset, restart, setFieldIndex, setRuns, xp, coins, estate, doneRef])

  /** Puts a program into the editor, as the student would have built it. */
  const loadProgram = useCallback(
    (next: Program) =>
      withVmLock(async () => {
        const vm = vmRef.current
        if (vm === null) return
        await vm.loadProject(projectFor(next))
        await settle()
      }),
    []
  )

  // «Продовжити звідси»: the hero stays where the run ended, the editor gets an empty piece.
  const goOn = useCallback(() => {
    if (phase.kind !== "done" || !phase.canGoOn) return
    const before = done?.pieces ?? []
    setDone({ pieces: [...before, phase.piece], frames: phase.full.frames.length, world: phase.full.world, blocks: phase.full.blocks })
    reset()
    void loadProgram(buildProgram([]))
  }, [phase, done, setDone, reset, loadProgram])

  // The pieces become one program in the editor, and the hero goes back to the start to run it.
  const joinPieces = useCallback(() => {
    const vm = vmRef.current
    if (done === null || vm === null) return
    const joined = joinPrograms([...done.pieces, heroProgram(vm)]) ?? joinPrograms(done.pieces) ?? {}
    setDone(null)
    reset()
    void loadProgram(joined)
  }, [done, setDone, reset, loadProgram])

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

  const togglePeek = useCallback(() => {
    const open = !peekRef.current
    peekRef.current = open
    setPeek(open)
    savePeek(open)
    const vm = vmRef.current
    if (open && vm !== null) setPeekSource(programSource(level, heroProgram(vm)))
  }, [level])

  const running = phase.kind === "running"
  const navigation = { onMap, onLevel, progress, onSkinChange, ownedHeroes, onBuyHero }
  const xpTotal = phase.kind === "done" && phase.reward.total !== null ? phase.reward.total : xp?.total
  // The app counts the coins: after a run it adds the gain, after a purchase it takes the price.
  const coinsTotal = coins?.total
  return (
    <GameScreen
      rootRef={rootRef}
      className={["eb-root", large ? "eb-large" : "", full ? "eb-full" : ""].filter(Boolean).join(" ")}
      level={field}
      start={done?.world ?? start}
      result={result}
      player={player}
      skin={skin}
      running={running}
      editing={phase.kind === "edit"}
      full={full}
      xpTotal={xpTotal}
      coinsTotal={coinsTotal}
      navigation={navigation}
      editorTitle="Блоки героя"
      fields={
        fields.length > 1
          ? { count: fields.length, index: fieldIndex, passed: runs?.map((r) => r.passed) ?? null, disabled: running, onPick: pickField }
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
            language="blocks"
            onClose={() => setVerdictOpen(false)}
            onNext={onNext}
            onContinue={phase.canGoOn ? goOn : undefined}
          />
        )
      }
    >
      <PiecesBar done={done} unit={["блок", "блоки", "блоків"]} onJoin={joinPieces} onRestart={dropPieces} />
      <div className="eb-editor" ref={editorRef} />
      <PythonPeek open={peek} source={peekSource} onToggle={togglePeek} />
    </GameScreen>
  )
}
