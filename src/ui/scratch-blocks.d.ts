// The parts of scratch-blocks 1.x (Apache-2.0) the editor uses. The package ships no types.
// `dist/vertical.js` is the prebuilt bundle; the package entry needs webpack loaders.
declare module "scratch-blocks/dist/vertical.js" {
  export interface Flyout {
    getWorkspace(): WorkspaceSvg
    /** The flyout's width in screen pixels; set on one flyout, it overrides the prototype's. */
    DEFAULT_WIDTH: number
  }

  export interface Toolbox {
    /** The categories and the flyout together, in screen pixels. */
    width: number
    refreshSelection(): void
  }

  export interface TopBlock {
    readonly id: string
    getRelativeToSurfaceXY(): { readonly x: number; readonly y: number }
    getHeightWidth(): { readonly height: number; readonly width: number }
    moveBy(dx: number, dy: number): void
  }

  export interface WorkspaceSvg {
    /** The zoom: screen pixels per workspace unit. */
    scale: number
    /** Where the program is on the screen, in screen pixels. */
    scrollX: number
    scrollY: number
    translate(x: number, y: number): void
    addChangeListener(listener: (event: unknown) => void): void
    removeChangeListener(listener: (event: unknown) => void): void
    getFlyout(): Flyout | null
    /** No toolbox (undefined) for a flat palette. */
    getToolbox(): Toolbox | null | undefined
    getBlockById(id: string): Block | null
    glowBlock(id: string, glowing: boolean): void
    glowStack(id: string, glowing: boolean): void
    updateToolbox(toolbox: string): void
    scrollCenter(): void
    setScale(scale: number): void
    dispose(): void
    /** A toolbox `<button callbackKey="…">` runs this callback. */
    registerButtonCallback(key: string, callback: () => void): void
    /** The scripts: the blocks without a parent. */
    getTopBlocks(ordered: boolean): ReadonlyArray<TopBlock>
    /** The variables of a type: `""` for the plain variables. */
    getVariablesOfType(type: string): ReadonlyArray<{ readonly name: string; getId(): string }>
  }

  interface ScratchBlocksStatic {
    inject(container: Element, options: Record<string, unknown>): WorkspaceSvg
    Blocks: Record<string, { init(this: { jsonInit(json: object): void }): void }>
    ScratchMsgs: { setLocale(locale: string): void }
    Xml: {
      textToDom(text: string): Element
      domToText(dom: Element): string
      clearWorkspaceAndLoadFromXml(xml: Element, workspace: WorkspaceSvg): void
    }
    /** Asks for a text: the name of a new variable or a new name for one. Replaced so the editor shows its own window. */
    prompt: (message: string, defaultValue: string, callback: (text: string | null) => void, ...rest: ReadonlyArray<unknown>) => void
    alert: (message: string, callback?: () => void) => void
    confirm: (message: string, callback: (ok: boolean) => void) => void
    Variables: { createVariable(workspace: WorkspaceSvg, callback: ((id?: string) => void) | null, type: string): void }
    Procedures: {
      /** Opens the window that makes a custom block (`externalProcedureDefCallback`) and puts its «визначити» in. */
      createProcedureDefCallback_(workspace: WorkspaceSvg): void
      /** The window that makes or edits a custom block: it calls back with the new mutation, or null. */
      externalProcedureDefCallback: (mutation: Element, callback: (mutation: Element | null) => void) => void
      /** The mutations of every custom block's prototype in the workspace. */
      allProcedureMutations(workspace: WorkspaceSvg): ReadonlyArray<Element>
      /** The prototype of a custom block in the workspace, or null when its «визначити» is not there. */
      getPrototypeBlock(proccode: string, workspace: WorkspaceSvg): object | null
      /** The «визначити» of a custom block in the workspace, or null. */
      getDefineBlock(proccode: string, workspace: WorkspaceSvg): { dispose(healStack: boolean): void } | null
    }
    utils: { genUid(): string }
    svgResize(workspace: WorkspaceSvg): void
    VerticalFlyout: { prototype: { DEFAULT_WIDTH: number } }
    Colours: Record<string, unknown>
  }

  const ScratchBlocks: ScratchBlocksStatic
  export default ScratchBlocks
}
