/**
 * «Створити блок»: the words of the window that makes or edits an own block, and the mutation it gives back. A block
 * is its name and its number parameters, the parameters after the name: «пройти (кроки)» is «пройти %s».
 */
export interface BlockDraft {
    readonly name: string;
    readonly params: ReadonlyArray<string>;
}
/** Parameters one block can have: more would not fit on a line of the palette. */
export declare const MAX_PARAMS = 3;
/** Letters in a block's name or a parameter's name. */
export declare const MAX_NAME = 30;
/** The block a prototype's mutation describes. A new block has an empty name. */
export declare const draftOf: (mutation: {
    getAttribute(name: string): string | null;
}) => BlockDraft;
/** The words of a block as Scratch keeps them: its name with a slot for each parameter. */
export declare const proccodeOfDraft: (draft: BlockDraft) => string;
/**
 * What is wrong with the block, in the words of the window, or null. `taken` are the words of the other blocks: two
 * blocks with the same words would be one block twice.
 */
export declare const draftError: (draft: BlockDraft, taken: ReadonlyArray<string>) => string | null;
/**
 * The attributes of the new mutation. A parameter keeps its id when it stays at its place, so the calls already in
 * the program keep their values; a new one gets `newId()`.
 */
export declare const mutationOf: (draft: BlockDraft, oldIds: ReadonlyArray<string>, newId: () => string) => Readonly<Record<"proccode" | "argumentids" | "argumentnames" | "argumentdefaults" | "warp", string>>;
export declare const idsOf: (mutation: {
    getAttribute(name: string): string | null;
}) => ReadonlyArray<string>;
