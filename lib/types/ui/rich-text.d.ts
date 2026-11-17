/**
 * Markup for task and hint texts. The same file is in every eduprostir trainer (edu-* repositories and
 * mriya-study). Keep the copies the same; the convention is in mriya-study docs/trainer-text-markup.md.
 *
 *   **Створити**        name of a button, menu, field, tab or window: bold, in the accent color
 *   [k]Ctrl+C[/k]       keys: each key is a keyboard key, «+» between them
 *   `=SUM(A1:A3)`       text to type exactly: formula, code, name
 *   [red]червоний[/red] a term in its color: red, green, blue, yellow, orange, purple
 *
 * The parser makes plain parts. It never makes HTML from the text, so a text cannot add tags or scripts.
 * Markup does not nest. A mark without its end stays as plain text.
 */
export declare const RichColors: {
    readonly Red: "red";
    readonly Green: "green";
    readonly Blue: "blue";
    readonly Yellow: "yellow";
    readonly Orange: "orange";
    readonly Purple: "purple";
};
export type RichColor = (typeof RichColors)[keyof typeof RichColors];
export type RichPart = {
    readonly kind: "text";
    readonly text: string;
} | {
    readonly kind: "ui";
    readonly text: string;
} | {
    readonly kind: "keys";
    readonly keys: ReadonlyArray<string>;
} | {
    readonly kind: "code";
    readonly text: string;
} | {
    readonly kind: "color";
    readonly color: RichColor;
    readonly text: string;
};
/** «Ctrl+Shift+S» → ["Ctrl", "Shift", "S"]; «Ctrl++» → ["Ctrl", "+"]. */
export declare const splitKeys: (keys: string) => ReadonlyArray<string>;
/** Splits a text with markup into parts. Text without markup gives one "text" part. */
export declare const parseRich: (source: string) => ReadonlyArray<RichPart>;
/** The text without markup: for aria-label, title, alt, comparisons and logs. */
export declare const plainText: (source: string) => string;
