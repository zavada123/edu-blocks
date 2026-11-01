/**
 * The settings that the student chooses once and expects to stay: the speed of the playback and the zoom of the
 * blocks. They stay in this browser across levels and page loads. Without storage (a private window, blocked
 * site data) the game uses the defaults and forgets.
 */
/** A part of the browser storage: only what the settings use. */
export interface PrefsStore {
    readonly getItem: (key: string) => string | null;
    readonly setItem: (key: string, value: string) => void;
}
export declare const RATE_KEY = "edu-blocks:rate";
export declare const ZOOM_KEY = "edu-blocks:zoom";
/** The zoom is kept as a share of the start scale of the editor, so a phone and a computer each keep their size. */
export declare const MIN_ZOOM = 0.3;
export declare const MAX_ZOOM = 4;
/** The saved speed if it is one of `rates`, else `fallback`. */
export declare const loadRate: (rates: ReadonlyArray<number>, fallback: number, store?: PrefsStore | null) => number;
export declare const saveRate: (rate: number, store?: PrefsStore | null) => void;
/** The saved zoom (a share of the start scale), 1 when nothing valid is saved. */
export declare const loadZoom: (store?: PrefsStore | null) => number;
export declare const saveZoom: (zoom: number, store?: PrefsStore | null) => void;
