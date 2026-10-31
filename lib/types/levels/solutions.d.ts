import { type Definition, type Step } from "../core/build.ts";
import type { Program } from "../core/program.ts";
/** The shortest known solution of each level, for tests and for checking new levels. Keys are level ids. */
export declare const solutions: Readonly<Record<string, ReadonlyArray<Step>>>;
/** The custom block of the solutions that call one, by level id. */
export declare const definitions: Readonly<Record<string, Definition>>;
/** The solution of a level as a program, with its custom block when it has one. Empty for an unknown level. */
export declare const solutionProgram: (levelId: string) => Program;
