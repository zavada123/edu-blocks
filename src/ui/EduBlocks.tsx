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
import { type FarmReport, farmReport } from "../core/farm.ts"
import { judgeFields } from "../core/judge.ts"
import { isPiece, joinPrograms, pieceBlockId, scriptCount } from "../core/pieces.ts"
import type { FailReason, Program, RunResult } from "../core/program.ts"
import { librarySource, programSource } from "../core/python/convert.ts"
import { BOOK_ID_PREFIX, type BookPage, calledBlocks, definedBlocks, pageInfo, pageOf, tearPage, writePage } from "../core/book.ts"
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
import { bookCallMutation, type Made, NEW_BLOCK, NEW_VARIABLE, OPEN_BOOK, toolboxXml } from "./toolbox.ts"
import { type Ask, WorkshopDialog } from "./Workshop.tsx"
import { draftOf, idsOf, mutationOf } from "./make-block.ts"
import { Boxes } from "./Boxes.tsx"
import { counterBoxes } from "../core/python/boxes.ts"
import { type EstateRun, type FarmRun, farmRewardOf, harvestRewardOf, type HeroXp, type Reward, rewardOf, Verdict } from "./Verdict.tsx"

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
  /** On a working day of the farm: the report of the day (`farmReport`). The app adds it to the barn on «Завершити день». */
  readonly farm: FarmReport | null
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
  /** A working day of the farm: `level` is its level (`farmDay`), and the result shows the report of the day. */
  readonly farm?: FarmRun
  /**
   * «Книга команд» of the farm, once the student has it: its pages take the place of `level.library` in the runs, the
   * palette offers them, and «Записати в Книгу команд» on a «визначити» writes a page.
   */
  readonly book?: BookRun
  readonly onComplete?: (report: BlocksReport) => void
  /** After each change of the blocks, with the program as it is now. An app that has its own check button sends it. */
  readonly onProgramChange?: (program: Program) => void
}

/** «Книга команд» from the app: the pages, how many the book has, and the book after the student changes it. */
export interface BookRun {
  readonly pages: ReadonlyArray<BookPage>
  readonly size: number
  readonly onChange: (pages: ReadonlyArray<BookPage>) => void
}

/** What the context menus of own blocks do with «Книга команд» in the editor open now: null without a book. */
let bookMenu: { readonly write: (proccode: string) => void; readonly open: () => void } | null = null

interface MenuOption {
  readonly text: string
  readonly enabled: boolean
  readonly callback: () => void
}

/** The parts of a «визначити» or a call the context menus read. */
interface ProcedureBlock {
  readonly isInFlyout?: boolean
  readonly workspace: WorkspaceSvg & { readonly isFlyout?: boolean; readonly targetWorkspace?: WorkspaceSvg }
  getInput(name: string): { readonly connection: { targetBlock(): { getProcCode(): string } | null } | null } | null
  getProcCode(): string
}

type ContextMenu = { customContextMenu(this: ProcedureBlock, options: Array<MenuOption>): void }

// The menu of a «визначити» gets «Записати в Книгу команд». A call of a block whose «визначити» is only in the book has
// nothing to edit: «Правка» gives way to «Відкрити книгу». scratch-blocks copies these menus into each new block.
const menus = (ScratchBlocks as unknown as { ScratchBlocks?: { VerticalExtensions?: Record<string, ContextMenu | undefined> } }).ScratchBlocks?.VerticalExtensions
const defineMenu = menus?.PROCEDURE_DEF_CONTEXTMENU
const callMenu = menus?.PROCEDURE_CALL_CONTEXTMENU
if (defineMenu !== undefined) {
  const base = defineMenu.customContextMenu
  defineMenu.customContextMenu = function (options) {
    base.call(this, options)
    const proccode = this.getInput("custom_block")?.connection?.targetBlock()?.getProcCode()
    if (bookMenu === null || proccode === undefined || this.isInFlyout === true) return
    options.push({ text: "Записати в Книгу команд", enabled: true, callback: () => bookMenu?.write(proccode) })
  }
}
if (callMenu !== undefined) {
  const base = callMenu.customContextMenu
  callMenu.customContextMenu = function (options) {
    base.call(this, options)
    const ws = this.workspace.isFlyout === true ? this.workspace.targetWorkspace : this.workspace
    if (ws === undefined || ScratchBlocks.Procedures.getPrototypeBlock(this.getProcCode(), ws) !== null) return
    options.pop()
    if (bookMenu !== null) options.push({ text: "Відкрити книгу", enabled: true, callback: () => bookMenu?.open() })
  }
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
/** Workspace events after which the palette may need the student's new variable or own block. */
const MADE_EVENTS: ReadonlySet<string> = new Set(["create", "delete", "change", "var_create", "var_delete", "var_rename"])

/** Workspace units between the program and a new «визначити» put under it. */
const NEW_BLOCK_GAP = 48

/** What the student made in the editor: its variables and the prototypes of its own blocks. */
const madeIn = (ws: WorkspaceSvg): Made => ({
  variables: ws.getVariablesOfType("").map((v) => ({ id: v.getId(), name: v.name })),
  blocks: ScratchBlocks.Procedures.allProcedureMutations(ws).map((m) => ScratchBlocks.Xml.domToText(m))
})

/**
 * scratch-blocks asks for names and shows its messages with `prompt`, `alert` and `confirm` of the browser, and for a
 * new block with a window it does not have. The editor shows its own windows instead (`WorkshopDialog`).
 */
const askInEditor = (ws: WorkspaceSvg, setAsk: (ask: Ask | null) => void, bookBlocks: () => ReadonlyArray<string>) => {
  ScratchBlocks.prompt = (message, value, done) => setAsk({ kind: "text", message: message.replace(/:\s*$/, ""), value, done })
  ScratchBlocks.alert = (message, done) => setAsk({ kind: "alert", message, done: () => done?.() })
  ScratchBlocks.confirm = (message, done) => setAsk({ kind: "confirm", message, done })
  ScratchBlocks.Procedures.externalProcedureDefCallback = (mutation, done) => {
    const proccodes = ScratchBlocks.Procedures.allProcedureMutations(ws).map((m) => m.getAttribute("proccode") ?? "")
    const own = mutation.getAttribute("proccode") ?? ""
    // A new block comes with a made-up name: the window starts empty.
    const draft = proccodes.includes(own) ? draftOf(mutation) : { name: "", params: [] }
    setAsk({
      kind: "block",
      draft,
      taken: [...proccodes, ...bookBlocks()].filter((p) => p !== own),
      done: (made) => {
        if (made === null) {
          done(null)
          return
        }
        const next = mutation.cloneNode(true) as Element
        for (const [key, value] of Object.entries(mutationOf(made, idsOf(mutation), () => ScratchBlocks.utils.genUid()))) next.setAttribute(key, value)
        const before = new Set(ws.getTopBlocks(false).map((b) => b.id))
        done(next)
        // scratch-blocks puts a new «визначити» at the top left, often over the program: it goes under the scripts.
        const added = ws.getTopBlocks(false).filter((b) => !before.has(b.id))
        const others = ws.getTopBlocks(false).filter((b) => before.has(b.id))
        for (const block of added) {
          if (others.length === 0) continue
          const at = block.getRelativeToSurfaceXY()
          const left = Math.min(...others.map((b) => b.getRelativeToSurfaceXY().x))
          const bottom = Math.max(...others.map((b) => b.getRelativeToSurfaceXY().y + b.getHeightWidth().height))
          block.moveBy(left - at.x, bottom + NEW_BLOCK_GAP - at.y)
        }
      }
    })
  }
  ws.registerButtonCallback(NEW_VARIABLE, () => ScratchBlocks.Variables.createVariable(ws, null, ""))
  ws.registerButtonCallback(NEW_BLOCK, () => ScratchBlocks.Procedures.createProcedureDefCallback_(ws))
}

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
const followZoomInFlyout = (ws: WorkspaceSvg, el: HTMLElement, toolboxXml: () => string, onZoom: (zoom: number) => void) => {
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
      ws.updateToolbox(toolboxXml())
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
  farm,
  book,
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
  // A window of «Майстерня» over the editor: a new variable, a new block, or a message of the editor.
  const [ask, setAsk] = useState<Ask | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<WorkspaceSvg | null>(null)
  const vmRef = useRef<VirtualMachine | null>(null)
  const glowRef = useRef<string | null>(null)
  const { rootRef, full, toggleFull } = useFullScreen()
  // Failed runs of this level since the editor opened: the first try bonus needs none.
  const failedRef = useRef(0)
  /** How many steps of the level's ladder of hints the student has opened. */
  const [hintStep, setHintStep] = useState(0)
  useEffect(() => {
    failedRef.current = 0
    setHintStep(0)
  }, [level])
  // The first program only: a new `program` prop for the same level does not reset the student's work.
  const initialProgram = useRef(program)
  // The latest callback, so a new function from the app does not rebuild the editor.
  const onProgramChangeRef = useRef(onProgramChange)
  onProgramChangeRef.current = onProgramChange
  // The book as the app has it now: a new book does not rebuild the editor, it changes the palette (`refreshRef`).
  const bookRef = useRef(book)
  bookRef.current = book
  const refreshRef = useRef<(() => void) | null>(null)
  /** The level with the pages of the book the student has now, for the runs and the Python view. */
  const withBook = useCallback((l: Level): Level => (bookRef.current === undefined ? l : { ...l, library: bookRef.current.pages }), [])
  // «Як це в Python» under the blocks: open or closed stays across levels, the code follows each change of the blocks.
  const [peek, setPeek] = useState(loadPeek)
  const peekRef = useRef(peek)
  const [peekSource, setPeekSource] = useState("")
  // «Продовжити звідси»: the pieces run so far. While there are any, the editor holds only the new piece.
  const { done, ref: doneRef, setDone } = usePieces<Program>(level)

  const setGlow = useCallback((id: string | null) => {
    const ws = workspaceRef.current
    if (ws === null) return
    // scratch-blocks throws on a block it does not have: one gone from the editor, or a block of «Книга команд», which
    // runs but is not in the editor. Nothing lights up for those.
    const inEditor = (blockId: string | null): blockId is string => blockId !== null && ws.getBlockById(blockId) !== null
    if (inEditor(glowRef.current)) ws.glowBlock(glowRef.current, false)
    const shown = id !== null && !id.startsWith(BOOK_ID_PREFIX) && inEditor(id) ? id : null
    glowRef.current = shown
    if (shown !== null) ws.glowBlock(shown, true)
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
    let toolbox = toolboxXml(level.blocks, compact, procedureName(level))
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
    setAsk(null)
    // «Створити змінну» and «Створити блок»: the palette lists what the student made, and changes when it does.
    const workshop = level.blocks.includes("variables") || level.blocks.includes("myBlocks")
    /** The pages of the book, with what each holds. */
    const bookPages = () => (bookRef.current?.pages ?? []).flatMap((page) => {
      const info = pageInfo(page)
      return info === null ? [] : [{ page, info }]
    })
    /** What the student made, and the pages of the book the program does not define: the palette offers those. */
    const madeNow = (): Made => {
      const made = madeIn(ws)
      if (bookRef.current === undefined) return made
      const own = new Set(ScratchBlocks.Procedures.allProcedureMutations(ws).map((m) => m.getAttribute("proccode") ?? ""))
      return { ...made, book: bookPages().filter((p) => !own.has(p.info.proccode)).map((p) => bookCallMutation(p.info.proccode, p.info.ids)) }
    }
    const refreshToolbox = () => {
      if (!workshop) return
      const next = toolboxXml(level.blocks, compact, procedureName(level), madeNow())
      if (next === toolbox) return
      toolbox = next
      ws.updateToolbox(next)
    }
    refreshRef.current = refreshToolbox
    if (workshop)
      askInEditor(ws, setAsk, () => bookPages().map((p) => p.info.proccode))
    // «Записати в Книгу команд»: the «визначити» goes from the program to a page, and the calls stay.
    const writeToBook = (proccode: string) => {
      const vm = vmRef.current
      const current = bookRef.current
      if (vm === null || current === undefined) return
      const page = pageOf(heroProgram(vm), proccode)
      const info = page === null ? null : pageInfo(page)
      if (page === null || info === null) return
      const next = writePage(current.pages, page, current.size)
      if (next === null) {
        setAsk({ kind: "alert", message: `Усі сторінки книги (${current.size}) зайняті. Відкрий книгу й вирви сторінку, якою не користуєшся.`, done: () => {} })
        return
      }
      const at = current.pages.findIndex((p) => pageInfo(p)?.proccode === proccode)
      setAsk({
        kind: "bookWrite",
        name: info.name,
        params: info.params,
        page: at >= 0 ? at + 1 : current.pages.length + 1,
        size: current.size,
        again: at >= 0,
        done: (ok) => {
          if (!ok) return
          bookRef.current?.onChange(next)
          ScratchBlocks.Procedures.getDefineBlock(proccode, ws)?.dispose(false)
        }
      })
    }
    // «Взяти на правку»: a copy of the page's «визначити» goes into the program, and wins over the page while it is there.
    const takeFromBook = (proccode: string) => {
      const page = bookPages().find((p) => p.info.proccode === proccode)?.page
      if (page === undefined) return
      void withVmLock(async () => {
        const vm = vmRef.current
        if (vm === null) return
        const next = { ...page, ...heroProgram(vm) }
        await vm.loadProject(projectFor(next))
        await settle()
        if (doneRef.current === null) onProgramChangeRef.current?.(next)
      })
    }
    const openBook = () => {
      const vm = vmRef.current
      const current = bookRef.current
      if (vm === null || current === undefined) return
      const program = heroProgram(vm)
      const defined = new Set(definedBlocks(program))
      const called = new Set(calledBlocks(program))
      const pages = bookPages().map(({ page, info }) => {
        const source = librarySource({ ...level, library: [page] }).source
        return {
          proccode: info.proccode,
          name: info.name,
          params: info.params,
          python: source.slice(Math.max(0, source.indexOf("def "))),
          called: called.has(info.proccode) && !defined.has(info.proccode),
          defined: defined.has(info.proccode)
        }
      })
      setAsk({
        kind: "book",
        pages,
        size: current.size,
        take: takeFromBook,
        tear: (proccode) => bookRef.current?.onChange(tearPage(bookRef.current.pages, proccode)),
        done: () => {}
      })
    }
    const menu = level.blocks.includes("myBlocks") ? { write: writeToBook, open: openBook } : null
    bookMenu = menu
    if (menu !== null) ws.registerButtonCallback(OPEN_BOOK, openBook)
    ws.addChangeListener((event: unknown) => {
      if (typeof event === "object" && event !== null && "type" in event && MADE_EVENTS.has(String(event.type))) refreshToolbox()
    })
    // The zoom the student chose last time, also on another level or after a reload.
    const savedZoom = loadZoom()
    followZoomInFlyout(ws, el, () => toolbox, saveZoom)
    if (savedZoom !== 1) ws.setScale(ws.scale * savedZoom)

    void withVmLock(async () => {
      const vm = createVm(null, null)
      const onUpdate = ({ xml }: { readonly xml: string }) => {
        ws.removeChangeListener(vm.blockListener)
        ScratchBlocks.Xml.clearWorkspaceAndLoadFromXml(ScratchBlocks.Xml.textToDom(xml), ws)
        ws.addChangeListener(vm.blockListener)
        refreshToolbox()
      }
      vm.on("workspaceUpdate", onUpdate)
      await vm.loadProject(projectFor(initialProgram.current ?? brokenProgram(level) ?? buildProgram([])))
      await settle()
      if (disposed) return
      ws.getFlyout()?.getWorkspace().addChangeListener(vm.flyoutBlockListener)
      const updatePeek = () => {
        if (peekRef.current) setPeekSource(programSource(withBook(level), heroProgram(vm)))
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
      if (bookMenu === menu) bookMenu = null
      refreshRef.current = null
      observer.disconnect()
      vmRef.current = null
      glowRef.current = null
      workspaceRef.current = null
      ws.dispose()
    }
  }, [level, media, large, doneRef, withBook])

  // A page written or torn: the palette lists the book as it is now.
  const pages = book?.pages
  useEffect(() => refreshRef.current?.(), [pages])

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
  // «Змінні» on a level with «лічильник» or the student's variables: after the frame on screen, and after the last one at the end.
  const shownFrame = result === null ? undefined : atEnd ? result.frames.at(-1) : result.frames[frameIndex]
  const boxes =
    result === null
      ? []
      : level.blocks.includes("variables")
        ? (shownFrame?.boxes ?? [])
        : level.blocks.includes("counter")
          ? counterBoxes(shownFrame?.counter)
          : []
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
        : judgeFields(withBook(level), prog)
    const graded = gradePieces(level, combineFields(fieldRuns), before, large, "blocks")
    const result = graded.full
    const shown = result.field ?? 0
    const firstTry = failedRef.current === 0 && graded.pieces === 1
    if (!result.passed) failedRef.current += 1
    const harvest = estate === undefined ? null : estateHarvest(estate.day, result, graded.pieces)
    const firstRun = fieldRuns[0]
    const dayReport = farm === undefined || firstRun === undefined ? null : farmReport(level, firstRun, farm.day)
    const { runXp, runCoins, reward } =
      dayReport !== null
        ? farmRewardOf(dayReport, firstTry, xp)
        : harvest === null || estate === undefined
          ? rewardOf(level, result, firstTry, xp, coins)
          : harvestRewardOf(harvest, estate, firstTry, xp, coins)
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
        harvest,
        farm: dayReport
      })
    }
    onEndRef.current = finish
    setRuns(fieldRuns)
    setFieldIndex(shown)
    setResult(graded.shown)
    restart(graded.shown.frames.length)
  }, [level, fields, large, onComplete, reset, restart, setFieldIndex, setRuns, xp, coins, estate, farm, doneRef, withBook])

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
    if (open && vm !== null) setPeekSource(programSource(withBook(level), heroProgram(vm)))
  }, [level, withBook])

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
            hintStep={hintStep}
            onHint={() => setHintStep((n) => n + 1)}
            farmCapacity={farm?.capacity ?? 0}
          />
        )
      }
    >
      <PiecesBar done={done} unit={["блок", "блоки", "блоків"]} onJoin={joinPieces} onRestart={dropPieces} />
      <div className="eb-editor" ref={editorRef} />
      <Boxes boxes={boxes} />
      <PythonPeek open={peek} source={peekSource} onToggle={togglePeek} />
      {ask !== null && <WorkshopDialog ask={ask} onClose={() => setAsk(null)} />}
    </GameScreen>
  )
}
