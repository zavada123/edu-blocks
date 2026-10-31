import type { Sensor } from "./hero.ts";
import type { Program } from "./program.ts";
import type { Action } from "./world.ts";
/**
 * A short way to write a program in code: reference solutions of the levels and tests.
 * `buildProgram(["move", { repeat: 3, body: ["move", "collect"] }])` gives the same blocks the editor makes.
 */
export type Question = Sensor | {
    readonly not: Question;
} | {
    readonly and: readonly [Question, Question];
} | {
    readonly or: readonly [Question, Question];
};
export type Step = Action | {
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
