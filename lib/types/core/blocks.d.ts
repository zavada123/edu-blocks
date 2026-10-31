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
/** The one variable of the game. Its id is fixed, so the editor, the project and the judge agree on it. */
export declare const COUNTER_ID = "eb-counter";
export declare const COUNTER_NAME = "\u043B\u0456\u0447\u0438\u043B\u044C\u043D\u0438\u043A";
export declare const SET_OPCODE = "data_setvariableto";
export declare const CHANGE_OPCODE = "data_changevariableby";
export declare const VARIABLE_OPCODE = "data_variable";
/** A variable reporter that the editor keeps not as a block but as `[12, name, id]`. */
export declare const VARIABLE_PRIMITIVE = 12;
export declare const DEFINITION_OPCODE = "procedures_definition";
export declare const PROTOTYPE_OPCODE = "procedures_prototype";
export declare const CALL_OPCODE = "procedures_call";
export declare const DEFAULT_PROCEDURE = "\u043C\u0456\u0439 \u0431\u043B\u043E\u043A";
/** Blocks a palette name brings. Most names are one block; the counter and the custom block are several. */
export declare const opcodesOf: (name: BlockName) => ReadonlyArray<string>;
/** The block of a palette name. For the counter it is «змінити», for the custom block the call. */
export declare const opcodeOf: (name: BlockName) => string;
/** Opcodes a program for this palette may contain: the palette, the start hat and number shadows. */
export declare const allowedOpcodes: (palette: ReadonlyArray<BlockName>) => ReadonlySet<string>;
export declare const isNumberShadow: (opcode: string) => boolean;
/** The name of the custom block on this level. */
export declare const procedureName: (level: {
    readonly procedure?: string;
}) => string;
