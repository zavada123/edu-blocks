import type { Sensor } from "../hero.ts";
import type { Action } from "../world.ts";
import { type PythonMethod } from "./api.ts";
import type { Body } from "./ast.ts";
import { type Value } from "./values.ts";
/**
 * Runs the tree of a program. Synchronous and pure apart from the host, so the browser and the server get the same
 * run. Every statement and expression is a step; a program that takes too many stops, so an endless loop cannot
 * hang a tab or the server.
 */
/** Steps of the interpreter in one run. A course program needs a few thousand. */
export declare const MAX_PY_STEPS = 200000;
/** Functions running inside each other. */
export declare const MAX_PY_DEPTH = 100;
/** What the program can reach outside itself: the hero, and the output of `print`. */
export interface PyHost {
    /** The hero acts. Throws `Halt` when the run is over. `globals` are the program's variables at this moment. */
    readonly act: (action: Action, line: number, globals: ReadonlyMap<string, Value>) => void;
    readonly sense: (sensor: Sensor) => boolean;
    /** Whether the level opens this method. */
    readonly allows: (method: PythonMethod) => boolean;
    readonly print: (text: string) => void;
}
/** The run stops with no error: the hero is done, or the program ran too long. */
export declare class Halt {
    readonly tooLong: boolean;
    constructor(tooLong: boolean);
}
export declare const execute: (program: Body, host: PyHost) => void;
