import { type EstateDay, type Harvest } from "../core/estate.ts";
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
    /** The coins the run added and the coins after it, when the app keeps coins. */
    readonly coins: {
        readonly gain: number;
        readonly total: number;
    } | null;
    /** On a day of the estate: what the run gathered. The result then shows it instead of stars and XP. */
    readonly harvest: Harvest | null;
}
/** A day of the estate, from the app: the day (`estateDay`) and the coins of its best run so far. */
export interface EstateRun {
    readonly day: EstateDay;
    /** The coins of the best run of this day: a run pays only the part above them, like a replayed level. */
    readonly best: number;
}
/** The hero's XP before the run, from the app: the result then shows the gain and the hero level. */
export interface HeroXp {
    /** All XP of the hero. */
    readonly total: number;
    /** The best XP of this level so far. */
    readonly best: number;
}
/** The student's coins before the run, from the app: the result then shows the coins the run added. */
export interface HeroCoins {
    /** The coins the student has now. */
    readonly total: number;
    /** The coins of the best run of this level so far (`coinsFor` of its stars). */
    readonly best: number;
}
/** The XP and coins of a run and what the hero gets of them. */
export declare const rewardOf: (level: Level, result: RunResult, firstTry: boolean, xp: HeroXp | undefined, coins?: HeroCoins) => {
    readonly runXp: number;
    readonly runCoins: number;
    readonly reward: Reward;
};
/** The reward of a run on a day of the estate: no XP, the coins of the harvest above the best run of the day. */
export declare const harvestRewardOf: (harvest: Harvest, estate: EstateRun, firstTry: boolean, xp: HeroXp | undefined, coins: HeroCoins | undefined) => {
    readonly runXp: number;
    readonly runCoins: number;
    readonly reward: Reward;
};
/** What the hero gathered, as a sentence part: «3 яблука, 2 морквини і 1 яйце». */
export declare const harvestText: (harvest: Harvest) => string;
/** «монета», «монети» or «монет» for a number, as Ukrainian says it. */
export declare const coinWord: (n: number) => string;
/** The result over the field: stars and XP for a pass, what went wrong and a hint for a fail. */
export declare const Verdict: ({ level, result, reward, advice, language, onClose, onNext }: {
    readonly level: Level;
    readonly result: RunResult;
    readonly reward: Reward;
    readonly advice: ReadonlyArray<string>;
    readonly language: Language;
    readonly onClose: () => void;
    /** «Далі»: the app opens the next level. */
    readonly onNext: (() => void) | undefined;
}) => import("react").JSX.Element;
