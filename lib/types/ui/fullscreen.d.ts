/**
 * How long a game that closes in full screen keeps it for the next game. «Далі» makes the app open the next level as
 * a new game; the new game opens in full screen when it comes within this time.
 */
export declare const FULL_SCREEN_HANDOFF_MS = 4000;
/** A game closes: in full screen, it hands it to the next game. */
export declare const handOffFullScreen: (full: boolean, now: number) => void;
/** A game opens: true when it takes the full screen of the game before it. A handoff is taken once. */
export declare const takeFullScreen: (now: number) => boolean;
/**
 * Full screen for the game. The browser's full screen where it works; elsewhere (an iPhone) the game covers the
 * page. Esc or the button leaves it. The next level opens in full screen too (`handOffFullScreen`).
 */
export declare const useFullScreen: () => {
    rootRef: import("react").RefObject<HTMLDivElement | null>;
    full: boolean;
    toggleFull: () => void;
};
