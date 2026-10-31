import type { ReactNode } from "react";
import { type Level } from "../core/level.ts";
import type { RunResult } from "../core/program.ts";
import type { World } from "../core/world.ts";
import { type Skin } from "./stage/Stage.tsx";
import { type usePlayer } from "./Timeline.tsx";
/**
 * The game half of the screen, the same for blocks and for Python: the task and its goals, the field, the time line
 * and the buttons. The result of a run shows over it.
 */
export declare const GameStage: ({ level, start, result, player, skin, running, editing, full, onRun, onReset, onFull, children }: {
    readonly level: Level;
    readonly start: World;
    readonly result: RunResult | null;
    readonly player: ReturnType<typeof usePlayer>;
    readonly skin: Skin;
    readonly running: boolean;
    /** No run to play: «Спочатку» has nothing to do. */
    readonly editing: boolean;
    readonly full: boolean;
    readonly onRun: () => void;
    readonly onReset: () => void;
    readonly onFull: () => void;
    /** The verdict, when there is one. */
    readonly children?: ReactNode;
}) => import("react").JSX.Element;
