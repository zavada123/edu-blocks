import { type HeroBlock } from "./blocks.ts";
import type { Program } from "./run.ts";
/**
 * A short way to write a program in code: reference solutions of the levels and tests.
 * `buildProgram(["move", { repeat: 3, body: ["move", "collect"] }])` gives the same blocks the editor makes.
 */
export type Question = "wallAhead" | "onCrystal" | "atFinish" | {
    readonly not: Question;
} | {
    readonly and: readonly [Question, Question];
} | {
    readonly or: readonly [Question, Question];
};
export type Step = Exclude<HeroBlock, "wallAhead" | "onCrystal" | "atFinish"> | {
    readonly repeat: number;
    readonly body: ReadonlyArray<Step>;
} | {
    readonly forever: ReadonlyArray<Step>;
} | {
    readonly until: Question;
    readonly body: ReadonlyArray<Step>;
} | {
    readonly if: Question;
    readonly then: ReadonlyArray<Step>;
    readonly else?: ReadonlyArray<Step>;
};
export declare const buildProgram: (steps: ReadonlyArray<Step>) => Program;
