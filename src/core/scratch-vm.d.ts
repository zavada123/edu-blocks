// The parts of the TurboWarp VM (github.com/TurboWarp/scratch-vm) this package uses. The VM ships no types.
declare module "scratch-vm" {
  export interface VmThread {
    peekStack(): string | undefined
  }

  export interface BlockUtility {
    readonly thread: VmThread
  }

  export interface VmBlock {
    readonly opcode: string
    readonly shadow: boolean
    readonly topLevel: boolean
    readonly next: string | null
    readonly parent: string | null
  }

  export interface VmTarget {
    readonly id: string
    readonly isStage: boolean
    readonly blocks: { readonly _blocks: Readonly<Record<string, VmBlock>> }
  }

  export interface Runtime {
    currentStepTime: number
    readonly sequencer: { timer: { start(): void; timeElapsed(): number } }
    readonly threads: ReadonlyArray<unknown>
    readonly targets: ReadonlyArray<VmTarget>
    _step(): void
    stopAll(): void
  }

  export interface ExtensionManager {
    addBuiltinExtension(id: string, extensionClass: new (runtime: Runtime) => object): void
  }

  export interface ExtensionCategory {
    readonly id: string
    readonly blocks: ReadonlyArray<{ readonly json?: Record<string, unknown> }>
  }

  export default class VirtualMachine {
    readonly runtime: Runtime
    readonly extensionManager: ExtensionManager
    readonly editingTarget: VmTarget | null
    readonly blockListener: (event: unknown) => void
    readonly flyoutBlockListener: (event: unknown) => void
    loadProject(project: string | object): Promise<void>
    setCompilerOptions(options: { readonly enabled: boolean }): void
    greenFlag(): void
    stopAll(): void
    toJSON(targetId?: string): string
    on(event: "EXTENSION_ADDED", listener: (info: ExtensionCategory) => void): void
    on(event: "workspaceUpdate", listener: (data: { readonly xml: string }) => void): void
    off(event: string, listener: (...args: never[]) => void): void
  }
}

declare module "scratch-vm/src/serialization/sb3.js" {
  import type { VmTarget } from "scratch-vm"
  /** Blocks of a target in the project.json format: [blocks, extension ids]. */
  export function serializeBlocks(blocks: VmTarget["blocks"]["_blocks"]): [Readonly<Record<string, unknown>>, ReadonlyArray<string>]
}

declare module "scratch-vm/src/util/log.js" {
  type LogFn = (...args: ReadonlyArray<unknown>) => void
  const log: { warn: LogFn; info: LogFn; debug: LogFn; error: LogFn }
  export default log
}
