import type { Amount, Compare } from "./build.ts";
import { type Sensor } from "./hero.ts";
import { type Program } from "./program.ts";
import type { Action, ItemKind } from "./world.ts";
/**
 * Reads a program of the editor back into steps, as `build.ts` writes them: for the Python view under the blocks.
 * Unlike a `Step`, a condition slot can be empty (`null`, which Scratch reads as false), and a call always names its
 * custom block. Blocks that do not run (outside every script) are left out.
 */
export type Condition = Sensor | {
    readonly itemIs: ItemKind;
} | Compare | {
    readonly not: Slot;
} | {
    readonly and: readonly [Slot, Slot];
} | {
    readonly or: readonly [Slot, Slot];
};
/** A condition slot: empty when the student has not put a question into it. */
export type Slot = Condition | null;
export type ReadStep = Action
/** A custom block by its words without the slots («пройти»), with a value for each parameter. */
 | {
    readonly call: string;
    readonly args: ReadonlyArray<Amount>;
} | {
    readonly repeat: Amount;
    readonly body: ReadonlyArray<ReadStep>;
}
/** `variable` names a variable the student made; without it, the counter. */
 | {
    readonly set: Amount;
    readonly variable?: string;
} | {
    readonly change: Amount;
    readonly variable?: string;
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
    /** The words of the block without its slots: «пройти». */
    readonly name: string;
    /** The names of its number parameters. */
    readonly params: ReadonlyArray<string>;
    readonly body: ReadonlyArray<ReadStep>;
}
export interface ReadProgram {
    /** Each «коли прапорець натиснуто» script, in the order of the program. */
    readonly scripts: ReadonlyArray<ReadonlyArray<ReadStep>>;
    /** Each «визначити» with its name, the first one of a name only (the VM runs that one). */
    readonly definitions: ReadonlyArray<ReadDefinition>;
}
export declare const readProgram: (program: Program) => ReadProgram;
