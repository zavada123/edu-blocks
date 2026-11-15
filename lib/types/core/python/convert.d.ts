import type { Definition, Step } from "../build.ts";
import type { Level } from "../level.ts";
import type { Program } from "../program.ts";
/**
 * The program in Python, and how many lines it has that the blocks do not (the start values of the variables). The
 * code plays as the blocks do: `parity.test.ts` checks it on every level.
 */
export declare const toPython: (level: Level, steps: ReadonlyArray<Step>, definition?: Definition) => {
    source: string;
    extra: number;
};
/** The solution of a library level in Python. Empty for an unknown level. */
export declare const solutionSource: (level: Level) => string;
/**
 * A program of the blocks editor in Python, for the view under the blocks. It writes the code as `toPython` does;
 * an empty condition is `False`, as in Scratch. Python has no scripts that run side by side, so only the first
 * «коли прапорець натиснуто» script is shown, with a note about the others.
 */
export declare const programSource: (level: Level, program: Program) => string;
/** The functions of «Книга команд» as Python calls them: «пройти(кроки)». */
export declare const bookSignatures: (level: Level) => ReadonlyArray<string>;
/**
 * «Книга команд» in Python: the start values of the variables its functions use, and a `def` for each page. A Python
 * program runs after this code, so it calls them as built-in functions, and its own `def` of a name takes their place.
 */
export declare const librarySource: (level: Level) => {
    readonly source: string;
    readonly names: ReadonlyArray<string>;
};
