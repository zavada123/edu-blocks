import type { Sensor } from "./hero.ts";
import type { Program } from "./program.ts";
import type { Action, ItemKind } from "./world.ts";
/**
 * A short way to write a program in code: reference solutions of the levels and tests.
 * `buildProgram(["move", { repeat: 3, body: ["move", "collect"] }])` gives the same blocks the editor makes.
 */
export type Question = Sensor
/** «тут ‹морква›?» */
 | {
    readonly itemIs: ItemKind;
} | {
    readonly not: Question;
} | {
    readonly and: readonly [Question, Question];
} | {
    readonly or: readonly [Question, Question];
};
/**
 * A number slot: a number, the counter, a variable the student made («Створити змінну») or a parameter of the custom
 * block it is in.
 */
export type Amount = number | "counter" | {
    readonly variable: string;
} | {
    readonly param: string;
};
export type Step = Action
/** «повторити (лічильник)» with `repeat: "counter"`. */
 | {
    readonly repeat: Amount;
    readonly body: ReadonlyArray<Step>;
}
/** «задати лічильник N» and «змінити лічильник на N»; with `variable`, a variable the student made. */
 | {
    readonly set: number;
    readonly variable?: string;
} | {
    readonly change: Amount;
    readonly variable?: string;
}
/** The custom block of the level. */
 | "call"
/** A custom block by name, with a value for each of its parameters. */
 | {
    readonly call: string;
    readonly args: ReadonlyArray<Amount>;
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
/** The custom block «визначити»: its name and what it does. */
export interface Definition {
    readonly name?: string;
    /** Number parameters: «пройти (кроки)» has `["кроки"]`. */
    readonly params?: ReadonlyArray<string>;
    readonly body: ReadonlyArray<Step>;
}
/** The words of a custom block with a slot for each parameter, as Scratch keeps them: «пройти %s». */
export declare const proccodeOf: (name: string, params?: ReadonlyArray<string>) => string;
/** The id of a variable the student made, as the tests and solutions write it. */
export declare const variableId: (name: string) => string;
/** The program of `steps`, with one custom block or several (`definition`). */
export declare const buildProgram: (steps: ReadonlyArray<Step>, definition?: Definition | ReadonlyArray<Definition>) => Program;
