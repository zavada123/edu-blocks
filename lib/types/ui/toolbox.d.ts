import type { BlockName } from "../core/level.ts";
/**
 * Toolbox XML with only the blocks of the level. `flat` drops the category column: on a phone
 * the palette is one short scrolling list, and the program gets the width.
 */
export declare const toolboxXml: (palette: ReadonlyArray<BlockName>, flat?: boolean, procedure?: string) => string;
