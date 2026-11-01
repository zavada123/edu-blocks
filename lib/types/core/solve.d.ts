import type { Step } from "./build.ts";
import type { Issue } from "./kit.ts";
import { type Level } from "./level.ts";
import { type Action } from "./world.ts";
/** States of the world the search looks at before it gives up. Big enough for any map of the editor. */
export declare const SOLVE_LIMIT = 400000;
export type SolveResult = {
    readonly kind: "solved";
    readonly actions: ReadonlyArray<Extract<Step, Action>>;
} | {
    readonly kind: "impossible";
}
/** The search looked at SOLVE_LIMIT states and stopped: the level is too big to be sure. */
 | {
    readonly kind: "unknown";
};
/** The hero actions of the palette. */
export declare const paletteActions: (level: Level) => ReadonlyArray<Action>;
/** The shortest list of hero actions from the palette that passes the level, or why there is none. */
export declare const solveLevel: (level: Level, limit?: number) => SolveResult;
/** Whether the blocks of the palette fit together and are enough to pass the level. */
export declare const paletteIssues: (level: Level) => ReadonlyArray<Issue>;
