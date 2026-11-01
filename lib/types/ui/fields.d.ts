import { type Level } from "../core/level.ts";
import type { RunResult } from "../core/program.ts";
/**
 * The fields of a level on the screen: which one is shown and the runs of the last check on each. Blocks and Python
 * share it. A new level starts on its first field with no runs.
 */
export declare const useFields: (level: Level) => {
    fields: readonly Level[];
    index: number;
    setIndex: import("react").Dispatch<import("react").SetStateAction<number>>;
    runs: readonly RunResult[] | null;
    setRuns: import("react").Dispatch<import("react").SetStateAction<readonly RunResult[] | null>>;
    field: Level;
    start: import("../core.ts").World;
};
