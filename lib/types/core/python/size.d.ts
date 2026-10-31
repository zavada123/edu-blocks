import type { Body } from "./ast.ts";
/**
 * The size of a Python program for the stars of a level, counted like the blocks of the same program in Scratch:
 * a statement is one block, and so are a call, a variable read, `and`, `or`, `not` and an operator in an
 * expression. Numbers and texts are free, as the number fields of blocks are. `while not …:` counts as one
 * «повторити до», and `range(…)` in a `for` as part of «повторити».
 */
export declare const programSize: (body: Body) => number;
