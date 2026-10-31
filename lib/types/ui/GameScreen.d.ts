import { type ReactNode, type Ref } from "react";
import type { Level } from "../core/level.ts";
import type { RunResult } from "../core/program.ts";
import type { World } from "../core/world.ts";
import { type Progress } from "./Hud.tsx";
import { type Skin } from "./stage/Stage.tsx";
import { type usePlayer } from "./Timeline.tsx";
import "./theme.css";
import "./blocks.css";
/** What the app can add around a level: the way to the map, the next level and the stars of passed levels. */
export interface GameNavigation {
    /** «← Мапа» over the game: back to the course. */
    readonly onMap?: () => void;
    /** «Далі» in the result of a passed run. */
    readonly onNext?: () => void;
    /** Stars of the levels the student has passed, by level id, for the chapter's levels in the bar. */
    readonly progress?: Progress;
    /**
     * The student chose another hero. With it the hero's portrait in the bar opens the choice of the heroes that the
     * hero level has opened; the app keeps the choice and gives it back as `skin`.
     */
    readonly onSkinChange?: (skin: Skin) => void;
}
/**
 * The game screen, the same for blocks and for Python: the bar of the chapter and the hero, the field with its time
 * line and buttons, the task, and the editor that the caller gives. The result of a run shows over the field.
 */
export declare const GameScreen: ({ rootRef, className, level, start, result, player, skin, running, editing, full, xpTotal, navigation, editorTitle, onRun, onReset, onFull, verdict, children }: {
    readonly rootRef: Ref<HTMLDivElement>;
    readonly className: string;
    readonly level: Level;
    readonly start: World;
    readonly result: RunResult | null;
    readonly player: ReturnType<typeof usePlayer>;
    readonly skin: Skin;
    readonly running: boolean;
    /** No run to play: «Спочатку» has nothing to do. */
    readonly editing: boolean;
    readonly full: boolean;
    readonly xpTotal: number | undefined;
    readonly navigation: {
        readonly onMap: (() => void) | undefined;
        readonly progress: Progress | undefined;
        readonly onSkinChange: ((skin: Skin) => void) | undefined;
    };
    readonly editorTitle: string;
    readonly onRun: () => void;
    readonly onReset: () => void;
    readonly onFull: () => void;
    /** The result of the last run, when it is open. */
    readonly verdict: ReactNode;
    /** The editor. */
    readonly children: ReactNode;
}) => import("react").JSX.Element;
