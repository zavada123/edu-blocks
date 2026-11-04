import { type PyBuiltin } from "./values.ts";
/** The built-in functions a program may call: `range`, `len`, `print`, `input`, `type` and a few for numbers. */
/** What the built-in functions reach outside the program. */
export interface BuiltinIo {
    readonly print: (text: string) => void;
    /** The next answer to `input()`; throws a `PyError` when the level has no more answers. */
    readonly input: (prompt: string, line: number) => string;
}
export declare const makeBuiltins: ({ print, input }: BuiltinIo) => ReadonlyMap<string, PyBuiltin>;
