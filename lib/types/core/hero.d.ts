import { type Level } from "./level.ts";
import { type Session } from "./program.ts";
import { type Action, type World } from "./world.ts";
/**
 * The hero API: what a program may tell the hero to do and ask the hero about. Every way of programming calls
 * only this: the Scratch blocks today (`judge.ts`, and the VM in `run.ts`), Python blocks and Python code later.
 * So a new language needs no change of the game, and a new action or question needs no change of a language.
 */
/** The questions a program may ask, for «якщо» and «повторити до». */
export type Sensor = "wallAhead" | "onCrystal" | "atFinish" | "enemyAhead" | "trapAhead";
/** The hero's actions, in palette order. */
export declare const HERO_ACTIONS: ReadonlyArray<Action>;
/** Each question and how the world answers it. */
export declare const HERO_SENSORS: Readonly<Record<Sensor, (world: World) => boolean>>;
/** The action of a hero block, such as `hero_move`, or undefined for any other block. */
export declare const actionOfOpcode: (opcode: string) => Action | undefined;
/** The question of a hero block, such as `hero_wallAhead`, or undefined for any other block. */
export declare const sensorOfOpcode: (opcode: string) => Sensor | undefined;
/** A new run of the level: the hero at the start, nothing done yet. */
export declare const newSession: (level: Level) => Session;
/** Where in the program an action came from, to show it while the run plays. */
export interface ActionSource {
    /** The block, for block programs. */
    readonly blockId: string | null;
    /** The line, for Python programs. */
    readonly line?: number;
    /** The counter at this moment, on a level with «лічильник». */
    readonly counter?: string;
}
/**
 * The hero does one action, the enemies take their turn, and the frame is written down. Returns true when the run
 * is over after it: the goals are met, the hero crashed, fell, ran out of steps or hearts, or did too many actions.
 * The caller then stops the program.
 */
export declare const heroAct: (level: Level, session: Session, action: Action, source: ActionSource) => boolean;
/** The answer to a question about the world as it is now. */
export declare const heroSense: (session: Session, sensor: Sensor) => boolean;
