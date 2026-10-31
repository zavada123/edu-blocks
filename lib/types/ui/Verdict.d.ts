import type { Level } from "../core/level.ts";
import type { RunResult } from "../core/program.ts";
/** The result of a run for the student: stars, XP, what went wrong and what to try. Shared by blocks and Python. */
/** How the student programs the level: the words of the result depend on it. */
export type Language = "blocks" | "python";
/** The text of a failed run. A mistake in Python code names its line. */
export declare const failText: (result: RunResult, language: Language) => string;
/** What a passed run gave the hero, as it stood when the run ended. */
export interface Reward {
    readonly gain: number;
    readonly firstTry: boolean;
    /** The hero's XP after the run, when the app told it. */
    readonly total: number | null;
}
/** The hero's XP before the run, from the app: the result then shows the gain and the hero level. */
export interface HeroXp {
    /** All XP of the hero. */
    readonly total: number;
    /** The best XP of this level so far. */
    readonly best: number;
}
/** The XP of a run and what the hero gets of it. */
export declare const rewardOf: (level: Level, result: RunResult, firstTry: boolean, xp: HeroXp | undefined) => {
    readonly runXp: number;
    readonly reward: Reward;
};
export declare const Verdict: ({ level, result, reward, advice, language, onClose }: {
    readonly level: Level;
    readonly result: RunResult;
    readonly reward: Reward;
    readonly advice: ReadonlyArray<string>;
    readonly language: Language;
    readonly onClose: () => void;
}) => import("react").JSX.Element;
