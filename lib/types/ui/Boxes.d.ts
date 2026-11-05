import type { Box } from "../core/python/boxes.ts";
/**
 * «Скриньки» under the code: the variables of the program at the moment the run shows, as boxes with a name. The kind
 * gives each box its look, so 5 and "5" differ at once. A new value pops in, so the student sees the old one go.
 */
export declare const Boxes: ({ boxes }: {
    readonly boxes: ReadonlyArray<Box>;
}) => import("react").JSX.Element | null;
