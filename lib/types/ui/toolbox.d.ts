import type { BlockName } from "../core/level.ts";
/** What the student made in the editor: variables («Створити змінну») and own blocks («Створити блок»). */
export interface Made {
    readonly variables: ReadonlyArray<{
        readonly id: string;
        readonly name: string;
    }>;
    /** The mutation of each own block's prototype, as XML text: the palette offers a call of each. */
    readonly blocks: ReadonlyArray<string>;
}
export declare const NOTHING_MADE: Made;
/** The callback keys of the palette buttons. */
export declare const NEW_VARIABLE = "eb-new-variable";
export declare const NEW_BLOCK = "eb-new-block";
/**
 * Toolbox XML with only the blocks of the level. `flat` drops the category column: on a phone
 * the palette is one short scrolling list, and the program gets the width.
 */
export declare const toolboxXml: (palette: ReadonlyArray<BlockName>, flat?: boolean, procedure?: string, made?: Made) => string;
