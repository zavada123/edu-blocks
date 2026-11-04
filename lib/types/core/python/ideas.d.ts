import type { Level } from "../level.ts";
import type { Body } from "./ast.ts";
/** What the program still has to use, as a message for the student, or null when it uses every idea of the level. */
export declare const missingIdea: (level: Level, program: Body) => string | null;
/** What is wrong with the printed lines, or null when the program printed the line the level asks for. */
export declare const missingPrint: (level: Level, output: ReadonlyArray<string>) => string | null;
