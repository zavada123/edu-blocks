import { type Sensor } from "./hero.ts";
import { type Program } from "./program.ts";
import type { Action, ItemKind } from "./world.ts";
/**
 * Reads a program of the editor back into steps, as `build.ts` writes them: for the Python view under the blocks.
 * Unlike a `Step`, a condition slot can be empty (`null`, which Scratch reads as false), a call names its custom
 * block, and a number slot can hold the counter. Blocks that do not run (outside every script) are left out.
 */
export type Condition = Sensor | {
    readonly itemIs: ItemKind;
} | {
    readonly not: Slot;
} | {
    readonly and: readonly [Slot, Slot];
} | {
    readonly or: readonly [Slot, Slot];
};
/** A condition slot: empty when the student has not put a question into it. */
export type Slot = Condition | null;
/** A number slot: a number, or the counter. */
export type Amount = number | "counter";
export type ReadStep = Action | {
    readonly call: string;
} | {
    readonly repeat: Amount;
    readonly body: ReadonlyArray<ReadStep>;
} | {
    readonly set: Amount;
} | {
    readonly change: Amount;
} | {
    readonly forever: ReadonlyArray<ReadStep>;
} | {
    readonly until: Slot;
    readonly body: ReadonlyArray<ReadStep>;
} | {
    readonly if: Slot;
    readonly then: ReadonlyArray<ReadStep>;
    readonly else?: ReadonlyArray<ReadStep>;
};
export interface ReadDefinition {
    readonly name: string;
    readonly body: ReadonlyArray<ReadStep>;
}
export interface ReadProgram {
    /** Each «коли прапорець натиснуто» script, in the order of the program. */
    readonly scripts: ReadonlyArray<ReadonlyArray<ReadStep>>;
    /** Each «визначити» with its name, the first one of a name only (the VM runs that one). */
    readonly definitions: ReadonlyArray<ReadDefinition>;
}
export declare const readProgram: (program: Program) => ReadProgram;
