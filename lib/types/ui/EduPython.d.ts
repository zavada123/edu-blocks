import { type Harvest } from "../core/estate.ts";
import type { Level } from "../core/level.ts";
import type { FailReason } from "../core/program.ts";
import { type GameNavigation } from "./GameScreen.tsx";
import type { Skin } from "./stage/Stage.tsx";
import { type EstateRun, type HeroXp } from "./Verdict.tsx";
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
    /** The whole program: with «Продовжити звідси», all the pieces joined in one (`joinSources`). */
    readonly source: string;
    /** How many pieces the student wrote the program in: 1 without «Продовжити звідси». */
    readonly pieces: number;
    readonly firstTry: boolean;
    readonly xp: number;
    /** Coins of this run (`coinsFor`, or the harvest on a day of the estate). Like XP, the student gets only the part above the best earlier run. */
    readonly coins: number;
    /** On a day of the estate: what the run gathered (`estateHarvest`). */
    readonly harvest: Harvest | null;
}
export interface EduPythonProps extends GameNavigation {
    readonly level: Level;
    readonly skin?: Skin;
    /** Bigger text for the youngest. */
    readonly large?: boolean;
    /** A saved program to open the level with. Without it a «Зламаний робот» level opens with its broken code. */
    readonly source?: string;
    /** Milliseconds per hero action in the animation at the normal speed (×1). */
    readonly speed?: number;
    readonly xp?: HeroXp;
    /** A day of the estate: `level` is its level, and the result shows the harvest instead of stars and XP. */
    readonly estate?: EstateRun;
    readonly onComplete?: (report: PythonReport) => void;
    /** After each change of the code. */
    readonly onSourceChange?: (source: string) => void;
}
/** The code a level opens with when there is no saved program. */
export declare const starterSource: () => string;
export declare const EduPython: ({ level, skin, large, source, speed, xp, estate, onComplete, onSourceChange, onMap, onNext, progress, onSkinChange, coins, ownedHeroes, onBuyHero }: EduPythonProps) => import("react").JSX.Element;
