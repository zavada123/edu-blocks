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

  export interface WorkspaceSvg {
    /** The zoom: screen pixels per workspace unit. */
    scale: number
    addChangeListener(listener: (event: unknown) => void): void
    removeChangeListener(listener: (event: unknown) => void): void
    getFlyout(): Flyout | null
    getToolbox(): Toolbox | null
    glowBlock(id: string, glowing: boolean): void
    glowStack(id: string, glowing: boolean): void
    updateToolbox(toolbox: string): void
    scrollCenter(): void
    setScale(scale: number): void
    dispose(): void
  }

  interface ScratchBlocksStatic {
    inject(container: Element, options: Record<string, unknown>): WorkspaceSvg
    Blocks: Record<string, { init(this: { jsonInit(json: object): void }): void }>
    ScratchMsgs: { setLocale(locale: string): void }
    Xml: {
      textToDom(text: string): Element
      clearWorkspaceAndLoadFromXml(xml: Element, workspace: WorkspaceSvg): void
    }
    svgResize(workspace: WorkspaceSvg): void
    VerticalFlyout: { prototype: { DEFAULT_WIDTH: number } }
    Colours: Record<string, unknown>
  }

  const ScratchBlocks: ScratchBlocksStatic
  export default ScratchBlocks
}
