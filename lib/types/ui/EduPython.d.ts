import type { Level } from "../core/level.ts";
import type { FailReason } from "../core/program.ts";
import type { Skin } from "./stage/Stage.tsx";
import { type HeroXp } from "./Verdict.tsx";
import "./blocks.css";
import "./python.css";
/**
 * The game with Python code instead of blocks, as in Tynker or CodeCombat: the field on one side, the code on the
 * other, the methods of the level above the code. The same levels, the same hero and the same grading rules.
 */
/** What the trainer gives the app after each run. The server runs `source` again with `judgePython`. */
export interface PythonReport {
    readonly levelId: string;
    readonly passed: boolean;
    readonly stars: 0 | 1 | 2 | 3;
    /** The size of the program, counted as blocks (`programSize`). */
    readonly size: number;
    readonly reason: FailReason | null;
    readonly source: string;
    readonly firstTry: boolean;
    readonly xp: number;
}
export interface EduPythonProps {
    readonly level: Level;
    readonly skin?: Skin;
    /** Bigger text for the youngest. */
    readonly large?: boolean;
    /** A saved program to open the level with. */
    readonly source?: string;
    /** Milliseconds per hero action in the animation at the normal speed (×1). */
    readonly speed?: number;
    readonly xp?: HeroXp;
    readonly onComplete?: (report: PythonReport) => void;
    /** After each change of the code. */
    readonly onSourceChange?: (source: string) => void;
}
/** The code a level opens with when there is no saved program. */
export declare const starterSource: () => string;
export declare const EduPython: ({ level, skin, large, source, speed, xp, onComplete, onSourceChange }: EduPythonProps) => import("react").JSX.Element;
