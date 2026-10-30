import type { Level } from "./level.ts";
import type { Program, RunResult } from "./program.ts";
/**
 * Advice after a run, made from what the hero did with this very program: what is missing («взяти», a turn,
 * more repeats) and what is extra (a «взяти» on an empty cell, turns that cancel out). The level `hint` stays
 * the general idea; the advice points at this program.
 *
 * Pure, so the browser and a server give the same advice.
 */
/** At most this many tips: more would be a lecture. */
export declare const MAX_ADVICE = 3;
export declare const adviseRun: (level: Level, program: Program, result: RunResult) => ReadonlyArray<string>;
