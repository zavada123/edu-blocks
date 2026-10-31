/**
 * Loaded pictures for the canvas. Each picture loads once per page; `whenLoaded` tells the field to draw again
 * when a picture it asked for arrives.
 */
/** The picture, ready to draw, or null while it loads. */
export declare const image: (href: string) => HTMLImageElement | null;
/** Calls back each time a picture arrives, until the returned function is called. */
export declare const whenLoaded: (callback: () => void) => (() => void);
