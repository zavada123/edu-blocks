/** Speeds of the playback, as a share of the normal pace. */
export declare const RATES: ReadonlyArray<number>;
export interface Player {
    /** Actions played so far, fractions included: see `poseAt`. */
    readonly time: number;
    readonly playing: boolean;
    readonly rate: number;
    readonly play: () => void;
    readonly pause: () => void;
    /** Jumps to a moment; the playback pauses. */
    readonly seek: (time: number) => void;
    /** One whole action forward or back; the playback pauses. */
    readonly step: (by: 1 | -1) => void;
    readonly setRate: (rate: number) => void;
    /** Back to the start of a new run of `length` actions, playing. */
    readonly restart: (length: number) => void;
}
/**
 * Plays a run: moves the time on each animation frame while playing. `onEnd` runs the first time a run reaches
 * its last action; a later jump to the end does not run it again.
 */
export declare const usePlayer: (msPerAction: number, onEnd: () => void) => Player;
/** The controls under the field: play or pause, a step back and forward, the time slider and the speed. */
export declare const Timeline: ({ player, length }: {
    readonly player: Player;
    readonly length: number;
}) => import("react").JSX.Element;
