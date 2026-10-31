import type { BlockName } from "./level.ts";
/** ID of the VM extension with the hero blocks. Opcodes in a program read `hero_move`. */
export declare const HERO_EXTENSION_ID = "hero";
export declare const HERO_COLOR = "#0FBD8C";
export type HeroBlock = Extract<BlockName, "move" | "turnLeft" | "turnRight" | "collect" | "attack" | "wallAhead" | "onCrystal" | "atFinish" | "enemyAhead" | "trapAhead">;
/** Hero blocks in palette order. `boolean` blocks are the questions for «якщо» and «повторити до». */
export declare const HERO_BLOCKS: ReadonlyArray<{
    readonly name: HeroBlock;
    readonly text: string;
    readonly boolean: boolean;
}>;
export declare const START_OPCODE = "event_whenflagclicked";
export declare const opcodeOf: (name: BlockName) => string;
/** Opcodes a program for this palette may contain: the palette, the start hat and number shadows. */
export declare const allowedOpcodes: (palette: ReadonlyArray<BlockName>) => ReadonlySet<string>;
export declare const isNumberShadow: (opcode: string) => boolean;
