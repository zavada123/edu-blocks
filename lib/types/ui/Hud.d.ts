import type { Level } from "../core/level.ts";
import { type Skin } from "./stage/draw.ts";
/** Stars of the levels the student has passed, by level id. The app knows them; the bar shows the chapter's. */
export type Progress = Readonly<Record<string, number>>;
/**
 * The bar over the game: the way back to the map, the chapter with its levels, and the hero with the XP. A level
 * outside the course (a teacher's task) shows its title instead of the chapter.
 */
export declare const Hud: ({ level, skin, xpTotal, progress, onMap }: {
    readonly level: Level;
    readonly skin: Skin;
    /** The hero's XP; without it the hero part is not shown. */
    readonly xpTotal: number | undefined;
    readonly progress: Progress;
    readonly onMap: (() => void) | undefined;
}) => import("react").JSX.Element;
