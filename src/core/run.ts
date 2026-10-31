import VirtualMachine, { type BlockUtility, type Runtime } from "scratch-vm"
import vmLog from "scratch-vm/src/util/log.js"
import { HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID } from "./blocks.ts"
import { HERO_ACTIONS, HERO_SENSORS, heroAct, heroSense, newSession, type Sensor } from "./hero.ts"
import type { Level } from "./level.ts"
import { checkProgram, MAX_FRAMES, PASSES_PER_FRAME, type Program, resultOf, type RunResult, type Session } from "./program.ts"
import type { Action } from "./world.ts"

/**
 * The program in the TurboWarp VM. The editor uses the VM to keep the program in project.json form; the run
 * itself is `judgeProgram`. `runProgram` stays as the reference: the tests check that both give the same result.
 */

// Each run creates a VM, and the VM warns about missing costume files and replaced services every time.
// Errors stay; the rest would fill the log.
vmLog.warn = vmLog.info = vmLog.debug = () => undefined

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

/** A block function of the extension: the VM calls it with the block's arguments and the running thread. */
type BlockFunction = (args: unknown, util: BlockUtility) => unknown

/**
 * The VM extension class: block info for the palette and a block function for each action and question of the
 * hero API (see `hero.ts`), so the VM and `judgeProgram` drive the hero the same way.
 */
const heroExtension = (level: Level | null, session: Session | null) =>
  class HeroExtension {
    readonly [opcode: string]: unknown

    constructor(private readonly runtime: Runtime) {
      const self = this as unknown as Record<string, BlockFunction>
      for (const action of HERO_ACTIONS) self[action] = (_args, util) => this.act(action, util)
      for (const sensor of Object.keys(HERO_SENSORS) as ReadonlyArray<Sensor>) self[sensor] = () => session !== null && heroSense(session, sensor)
    }

    getInfo() {
      return {
        id: HERO_EXTENSION_ID,
        name: "Герой",
        color1: HERO_COLOR,
        color2: "#0DA57A",
        color3: "#0B8E69",
        blocks: HERO_BLOCKS.map((b) => ({ opcode: b.name, blockType: b.boolean ? "Boolean" : "command", text: b.text }))
      }
    }

    private act(action: Action, util: BlockUtility): void {
      if (session === null || level === null || session.done) return
      if (heroAct(level, session, action, { blockId: util.thread.peekStack() ?? null })) this.runtime.stopAll()
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

/** Runs the program on the level from the start hat «коли натиснуто прапорець» and checks the goals. */
export const runProgram = (level: Level, program: Program): Promise<RunResult> =>
  withVmLock(async () => {
    const session = newSession(level)
    const checked = checkProgram(level, program)
    if ("error" in checked) return resultOf(level, { ...session, reason: "badProgram" }, 0, { detail: checked.error })
    if (!checked.hasStart) return resultOf(level, { ...session, reason: "noStart" }, checked.blocks)

    const vm = createVm(level, session)
    try {
      await vm.loadProject(projectFor(program))
    } catch {
      return resultOf(level, { ...session, reason: "badProgram" }, checked.blocks, { detail: "Програму не вдалося прочитати" })
    }
    await settle()
    countPasses(vm)
    vm.greenFlag()
    for (let frame = 0; frame < MAX_FRAMES && !session.done && vm.runtime.threads.length > 0; frame++) {
      vm.runtime._step()
    }
    if (!session.done && vm.runtime.threads.length > 0) session.reason = "tooLong"
    vm.stopAll()
    return resultOf(level, session, checked.blocks)
  })
