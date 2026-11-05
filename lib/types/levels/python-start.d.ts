import type { Level } from "../core/level.ts";
/** The levels of «Python: перші кроки» in six small chapters, in the order of play. See `pythonStartChapters`. */
export declare const pythonLevelGroups: {
    readonly pyHero: readonly Level[];
    readonly pyBoxes: readonly Level[];
    readonly pyMath: readonly Level[];
    readonly pyTypes: readonly Level[];
    readonly pyAsk: readonly Level[];
    readonly pyConvert: readonly Level[];
};
export declare const pythonLevels: ReadonlyArray<Level>;
/** The reference solution of each level of `pythonLevels`, as Python code. Keys are level ids. */
export declare const pythonSolutions: Readonly<Record<string, string>>;
