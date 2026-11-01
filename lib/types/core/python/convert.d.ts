import type { Definition, Step } from "../build.ts";
import type { Level } from "../level.ts";
import type { Program } from "../program.ts";
/**
 * The program in Python, and how many lines it has that the blocks do not (a start value of the counter). The code
 * plays as the blocks do: `parity.test.ts` checks it on every level.
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
