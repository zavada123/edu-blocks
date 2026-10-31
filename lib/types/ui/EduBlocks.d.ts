import { type Level } from "../core/level.ts";
import type { FailReason, Program } from "../core/program.ts";
import type { Skin } from "./stage/Stage.tsx";
import { type HeroXp } from "./Verdict.tsx";
import "./blocks.css";
/** What the trainer gives the app after each run. The server runs `program` again before it trusts `passed`. */
export interface BlocksReport {
    readonly levelId: string;
    readonly passed: boolean;
    readonly stars: 0 | 1 | 2 | 3;
    readonly blocks: number;
    readonly reason: FailReason | null;
    readonly program: Program;
    /** No run of the level failed before this one since the editor opened. */
    readonly firstTry: boolean;
    /** XP of this run (`xpFor`). The hero gets only the part above the best earlier run. */
    readonly xp: number;
}
export type { HeroXp } from "./Verdict.tsx";
export interface EduBlocksProps {
    readonly level: Level;
    readonly skin?: Skin;
    /** Bigger blocks and field for the youngest: the first chapter of the course. */
    readonly large?: boolean;
    /** A saved program to open the level with. */
    readonly program?: Program;
    /** Folder with the scratch-blocks icons (`scratch-blocks/media`), ending with a slash. */
    readonly media?: string;
    /** Milliseconds per hero action in the animation at the normal speed (×1). */
    readonly speed?: number;
    readonly xp?: HeroXp;
    readonly onComplete?: (report: BlocksReport) => void;
    /** After each change of the blocks, with the program as it is now. An app that has its own check button sends it. */
    readonly onProgramChange?: (program: Program) => void;
}
export declare const EduBlocks: ({ level, skin, large, program, media, speed, xp, onComplete, onProgramChange }: EduBlocksProps) => import("react").JSX.Element;
