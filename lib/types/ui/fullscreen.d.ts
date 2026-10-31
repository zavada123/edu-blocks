/**
 * Full screen for the game. The browser's full screen where it works; elsewhere (an iPhone) the game covers the
 * page. Esc or the button leaves it.
 */
export declare const useFullScreen: () => {
    rootRef: import("react").RefObject<HTMLDivElement | null>;
    full: boolean;
    toggleFull: () => void;
};
