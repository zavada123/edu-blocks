import type { Definition, Step } from "../build.ts";
import type { Level } from "../level.ts";
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
