import { type Value } from "./values.ts";
/**
 * «Скриньки»: the variables of a Python program as the student sees them under the field. Each box has a name, what
 * lies in it, and its kind, so «5» and «"5"» look different before they cause a mistake.
 */
export interface Box {
    readonly name: string;
    /** What lies in the box, as Python writes it: `5`, `2.5`, `"Іван"`, `True`, `[1, 2]`. */
    readonly value: string;
    readonly kind: "int" | "float" | "str" | "bool" | "list";
}
/** The boxes of a program now: its variables that hold data, in the order they were made. The hero is not a box. */
export declare const boxesOf: (globals: ReadonlyMap<string, Value>) => ReadonlyArray<Box>;
/**
 * «Скриньки» of a block program: its one variable, «лічильник», as Scratch keeps it (`Frame.counter`). A number is a
 * whole number or a number with a dot; anything else the student typed into «задати лічильник» is words.
 */
export declare const counterBoxes: (counter: string | undefined) => ReadonlyArray<Box>;
