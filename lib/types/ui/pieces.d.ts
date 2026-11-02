import type { Level } from "../core/level.ts";
import type { RunResult } from "../core/program.ts";
import type { World } from "../core/world.ts";
/**
 * The pieces of «Продовжити звідси» on the screen, the same for blocks and for Python. `T` is a piece: a block program
 * or a Python source. See `core/pieces.ts` for the rules.
 */
/** The pieces the student has run, and where the hero stood after them. */
export interface Done<T> {
    readonly pieces: ReadonlyArray<T>;
    /** Frames of the joined run of these pieces: the screen plays only the frames after them. */
    readonly frames: number;
    /** The world after these pieces: the field starts from it. */
    readonly world: World;
    /** Blocks (or the size of the code) of these pieces together. */
    readonly blocks: number;
}
/** Shown under a pass in more than one piece, when the pieces cost a star. */
export declare const JOIN_TIP = "\u0421\u043A\u043B\u0430\u0434\u0438 \u0432\u0441\u0435 \u0432 \u043E\u0434\u043D\u0443 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0443, \u0456 \u0431\u0443\u0434\u0435 3 \u0437\u0456\u0440\u043A\u0438.";
/**
 * The done pieces of this try. `ref` changes at once, before React draws, so an editor that loads a new piece can
 * tell that it is a piece. A new level starts with none.
 */
export declare const usePieces: <T>(level: Level) => {
    done: Done<T> | null;
    ref: import("react").RefObject<Done<T> | null>;
    setDone: (next: Done<T> | null) => void;
};
/** How a run of the joined program shows and pays: the frames after the done pieces, the stars of all the pieces. */
export declare const gradePieces: <T>(level: Level, full: RunResult, done: Done<T> | null, large: boolean, language: "blocks" | "python") => {
    readonly full: RunResult;
    readonly shown: RunResult;
    readonly pieces: number;
    readonly canGoOn: boolean;
    readonly capped: boolean;
};
/** The pieces done, over the editor: what is behind the hero, and the ways back to one program. */
export declare const PiecesBar: ({ done, unit, onJoin, onRestart }: {
    readonly done: Done<unknown> | null;
    /** The word for what `blocks` counts, for 1, 2 and 5: «блок», «блоки», «блоків». */
    readonly unit: readonly [string, string, string];
    /** Puts all the pieces into the editor as one program. */
    readonly onJoin: () => void;
    /** Leaves the pieces and puts the hero back at the start. */
    readonly onRestart: () => void;
}) => import("react").JSX.Element | null;
