/** What the screen needs to show the fields of a level: see `FieldTabs`. */
export interface FieldChoice {
    /** Fields of the level, its own map included. */
    readonly count: number;
    /** The field on the screen, from 0. */
    readonly index: number;
    /** Whether the last run passed each field, or null before the first run. */
    readonly passed: ReadonlyArray<boolean> | null;
    /** While the first run plays, the student watches it to the end. */
    readonly disabled: boolean;
    readonly onPick: (index: number) => void;
}
/**
 * The fields of a level over the field: «Поле 1 · Поле 2 · Поле 3». Before a run a tab shows its map; after a run
 * each tab has a mark, and a tab plays the run on its field.
 */
export declare const FieldTabs: ({ count, index, passed, disabled, onPick }: FieldChoice) => import("react").JSX.Element;
