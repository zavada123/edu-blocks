import VirtualMachine, { type BlockUtility, type Runtime } from "scratch-vm"
import vmLog from "scratch-vm/src/util/log.js"
import { allowedOpcodes, HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID, isNumberShadow, START_OPCODE } from "./blocks.ts"
import { allGoalsMet, type Level, starsFor } from "./level.ts"
import { type Action, applyAction, atFinish, onCrystal, type Outcome, parseMap, wallAhead, type World } from "./world.ts"

/**
 * A program is the `blocks` object of the hero sprite in a Scratch 3 project (project.json):
 * block id → block. The browser sends it; the server runs it again with `runProgram` and trusts only that result.
 */
export type Program = Readonly<Record<string, unknown>>

// Each run creates a VM, and the VM warns about missing costume files and replaced services every time.
// Errors stay; the rest would fill the server log.
vmLog.warn = vmLog.info = vmLog.debug = () => undefined

export const MAX_PROGRAM_BLOCKS = 300
/** Hero actions in one run. A textbook level needs fewer than 100. */
export const MAX_ACTIONS = 1_000
/** VM frames in one run. A «завжди» loop without actions ends here. */
export const MAX_FRAMES = 2_000
/**
 * Passes over the threads in one VM frame. The VM measures a frame in milliseconds; this package counts passes
 * instead, so a run gives the same result on a slow phone and on the server.
 */
const PASSES_PER_FRAME = 20

export type FailReason = "badProgram" | "noStart" | "crashed" | "goalsNotMet" | "tooLong"

export interface Frame {
  readonly action: Action
  readonly outcome: Outcome
  /** The block that made the move, to highlight it in the editor. */
  readonly blockId: string | null
  readonly world: World
}

export interface RunResult {
  readonly levelId: string
  readonly passed: boolean
  /** 0 when not passed. */
  readonly stars: 0 | 1 | 2 | 3
  /** Blocks in the program, the start hat and number fields not counted. */
  readonly blocks: number
  readonly collected: number
  readonly totalCrystals: number
  readonly reason: FailReason | null
  /** For `badProgram`: what is wrong. */
  readonly detail?: string
  readonly frames: ReadonlyArray<Frame>
  readonly world: World
}

interface ProgramBlock {
  readonly opcode: string
  readonly shadow?: boolean
  readonly topLevel?: boolean
}

const isProgramBlock = (value: unknown): value is ProgramBlock =>
  typeof value === "object" && value !== null && !Array.isArray(value) && typeof (value as ProgramBlock).opcode === "string"

/** Checks the program shape and palette before the VM sees it. Returns the error text or the block count. */
export const checkProgram = (level: Level, program: Program): { readonly error: string } | { readonly blocks: number; readonly hasStart: boolean } => {
  const entries = Object.entries(program)
  if (entries.length > MAX_PROGRAM_BLOCKS) return { error: `Програма довша за ${MAX_PROGRAM_BLOCKS} блоків` }
  const allowed = allowedOpcodes(level.blocks)
  let blocks = 0
  let hasStart = false
  for (const [, block] of entries) {
    if (!isProgramBlock(block)) return { error: "Блок без опкоду або змінна: цей рівень їх не має" }
    if (!allowed.has(block.opcode)) return { error: `Блок ${block.opcode} не з цього рівня` }
    if (block.opcode === START_OPCODE) hasStart = true
    else if (block.shadow !== true && !isNumberShadow(block.opcode)) blocks++
  }
  return { blocks, hasStart }
}

// Assets are not loaded (no storage attached), so any costume id works.
const COSTUME = { name: "hero", dataFormat: "svg", assetId: "00000000000000000000000000000000", md5ext: "00000000000000000000000000000000.svg", rotationCenterX: 0, rotationCenterY: 0 }

/** A project with the stage and one sprite whose blocks are the program. */
export const projectFor = (program: Program): object => ({
  targets: [
    {
      isStage: true,
      name: "Stage",
      variables: {},
      lists: {},
      broadcasts: {},
      blocks: {},
      comments: {},
      currentCostume: 0,
      costumes: [{ ...COSTUME, name: "backdrop" }],
      sounds: [],
      volume: 100,
      layerOrder: 0
    },
    {
      isStage: false,
      name: "Hero",
      variables: {},
      lists: {},
      broadcasts: {},
      blocks: program,
      comments: {},
      currentCostume: 0,
      costumes: [COSTUME],
      sounds: [],
      volume: 100,
      layerOrder: 1,
      visible: true,
      x: 0,
      y: 0,
      size: 100,
      direction: 90,
      draggable: false,
      rotationStyle: "all around"
    }
  ],
  monitors: [],
  extensions: [HERO_EXTENSION_ID],
  meta: { semver: "3.0.0", vm: "0.2.0", agent: "edu-blocks" }
})

/** What the hero blocks do in one run. */
interface Session {
  world: World
  readonly frames: Array<Frame>
  done: boolean
  reason: FailReason | null
}

/** The VM extension class: block info for the palette and the block functions. */
const heroExtension = (level: Level | null, session: Session | null) =>
  class HeroExtension {
    constructor(private readonly runtime: Runtime) {}

    getInfo() {
      return {
        id: HERO_EXTENSION_ID,
        name: "Робот",
        color1: HERO_COLOR,
        color2: "#0DA57A",
        color3: "#0B8E69",
        blocks: HERO_BLOCKS.map((b) => ({ opcode: b.name, blockType: b.boolean ? "Boolean" : "command", text: b.text }))
      }
    }

    private act(action: Action, util: BlockUtility): void {
      if (session === null || level === null || session.done) return
      const { world, outcome } = applyAction(session.world, action)
      session.world = world
      session.frames.push({ action, outcome, blockId: util.thread.peekStack() ?? null, world })
      if (outcome === "crashed") this.finish("crashed")
      else if (allGoalsMet(level, world)) this.finish(null)
      else if (session.frames.length >= MAX_ACTIONS) this.finish("tooLong")
    }

    private finish(reason: FailReason | null): void {
      if (session === null) return
      session.done = true
      session.reason = reason
      this.runtime.stopAll()
    }

    move(_args: unknown, util: BlockUtility) {
      this.act("move", util)
    }
    turnLeft(_args: unknown, util: BlockUtility) {
      this.act("turnLeft", util)
    }
    turnRight(_args: unknown, util: BlockUtility) {
      this.act("turnRight", util)
    }
    collect(_args: unknown, util: BlockUtility) {
      this.act("collect", util)
    }
    wallAhead() {
      return session !== null && wallAhead(session.world)
    }
    onCrystal() {
      return session !== null && onCrystal(session.world)
    }
    atFinish() {
      return session !== null && atFinish(session.world)
    }
  }

/**
 * The VM keeps the current runtime and extension manager in a module-wide dispatcher, so two VMs must not
 * load at the same time. Every VM in this package is created and loaded inside this lock.
 */
let lock: Promise<unknown> = Promise.resolve()
export const withVmLock = <T>(work: () => Promise<T>): Promise<T> => {
  const next = lock.then(work, work)
  lock = next.catch(() => undefined)
  return next
}

/** Replaces the frame clock of the VM with a pass counter (see PASSES_PER_FRAME). */
const countPasses = (vm: VirtualMachine): void => {
  let passes = 0
  vm.runtime.sequencer.timer = {
    start: () => {
      passes = 0
    },
    timeElapsed: () => passes++
  }
  // The sequencer works while timeElapsed() < 0.75 × currentStepTime.
  vm.runtime.currentStepTime = PASSES_PER_FRAME / 0.75
}

/** Lets the VM finish registering extension blocks (it does this in a promise). */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

export const createVm = (level: Level | null, session: Session | null): VirtualMachine => {
  const vm = new VirtualMachine()
  // The interpreter, not the JavaScript compiler: the same behaviour in the browser and on the server.
  vm.setCompilerOptions({ enabled: false })
  vm.extensionManager.addBuiltinExtension(HERO_EXTENSION_ID, heroExtension(level, session))
  return vm
}

const result = (level: Level, session: Session, blocks: number, extra: Partial<RunResult> = {}): RunResult => {
  const passed = session.reason === null && allGoalsMet(level, session.world)
  return {
    levelId: level.id,
    passed,
    stars: passed ? starsFor(level, blocks) : 0,
    blocks,
    collected: session.world.totalCrystals - session.world.crystals.size,
    totalCrystals: session.world.totalCrystals,
    reason: passed ? null : (session.reason ?? "goalsNotMet"),
    frames: session.frames,
    world: session.world,
    ...extra
  }
}

/** Runs the program on the level from the start hat «коли натиснуто прапорець» and checks the goals. */
export const runProgram = (level: Level, program: Program): Promise<RunResult> =>
  withVmLock(async () => {
    const session: Session = { world: parseMap(level.map, level.dir), frames: [], done: false, reason: null }
    const checked = checkProgram(level, program)
    if ("error" in checked) return result(level, { ...session, reason: "badProgram" }, 0, { detail: checked.error })
    if (!checked.hasStart) return result(level, { ...session, reason: "noStart" }, checked.blocks)

    const vm = createVm(level, session)
    try {
      await vm.loadProject(projectFor(program))
    } catch {
      return result(level, { ...session, reason: "badProgram" }, checked.blocks, { detail: "Програму не вдалося прочитати" })
    }
    await settle()
    countPasses(vm)
    vm.greenFlag()
    for (let frame = 0; frame < MAX_FRAMES && !session.done && vm.runtime.threads.length > 0; frame++) {
      vm.runtime._step()
    }
    if (!session.done && vm.runtime.threads.length > 0) session.reason = "tooLong"
    vm.stopAll()
    return result(level, session, checked.blocks)
  })
