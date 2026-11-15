import { type EstateDay, type Harvest } from "../core/estate.ts";
import { type FarmReport } from "../core/farm.ts";
import { type Level } from "../core/level.ts";
import type { Program, RunResult } from "../core/program.ts";
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
    /** On a working day of the farm: its report. The result then shows it instead of stars and XP. */
    readonly farm: FarmReport | null;
}
/** A working day of the farm, from the app: which day it is (`farmDay`) and how much the worker carries. */
export interface FarmRun {
    readonly day: number;
    readonly capacity: number;
    /** Once «Хата помічника» stands: the helper's program, kept by the app like the worker's. */
    readonly helper?: FarmHelperRun;
}
/** The helper of a farm day: its name and its program, in the language of the worker's. */
export interface FarmHelperRun {
    readonly name: string;
    /** The helper's Python code, or none for a starter. */
    readonly source?: string;
    /** The helper's blocks, or none for an empty program. */
    readonly program?: Program;
    readonly onSourceChange?: (source: string) => void;
    readonly onProgramChange?: (program: Program) => void;
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
/** The reward of a working day of the farm: no XP and no coins, its yield goes to the barn when the app ends the day. */
export declare const farmRewardOf: (report: FarmReport, firstTry: boolean, xp: HeroXp | undefined) => {
    readonly runXp: number;
    readonly runCoins: number;
    readonly reward: Reward;
};
/** What the hero gathered, as a sentence part: «3 гриби, 2 гарбузи і 1 ягня». */
export declare const harvestText: (harvest: Harvest) => string;
/** «монета», «монети» or «монет» for a number, as Ukrainian says it. */
export declare const coinWord: (n: number) => string;
/** The result over the field: stars and XP for a pass, what went wrong and a hint for a fail. */
export declare const Verdict: ({ level, result, reward, advice, language, onClose, onNext, onContinue, hintStep, onHint, farmCapacity }: {
    readonly level: Level;
    readonly result: RunResult;
    readonly reward: Reward;
    readonly advice: ReadonlyArray<string>;
    readonly language: Language;
    readonly onClose: () => void;
    /** «Далі»: the app opens the next level. */
    readonly onNext: (() => void) | undefined;
    /** «Продовжити звідси»: the hero stays, and the student writes the next piece (`canContinue`). */
    readonly onContinue?: (() => void) | undefined;
    /** How many steps of `level.hints` are open. */
    readonly hintStep?: number;
    /** Opens one more step of `level.hints`; without it the level's single `hint` is shown. */
    readonly onHint?: (() => void) | undefined;
    /** On a working day of the farm: what the worker carries at once, for the tips of the report. */
    readonly farmCapacity?: number;
}) => import("react").JSX.Element;
