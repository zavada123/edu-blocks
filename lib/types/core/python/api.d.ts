import type { Sensor } from "../hero.ts";
import type { BlockName } from "../level.ts";
import type { Action } from "../world.ts";
/**
 * The hero in Python: `hero.move()`, `hero.wall_ahead()` and the rest. Each method is a hero action or question of
 * the hero API, under the block that brings it into a level, so a level opens the same methods as blocks.
 * The editor shows this list as its palette.
 */
export interface PythonMethod {
    /** As the student writes it after `hero.`. */
    readonly name: string;
    /** How it is called, for the palette: `move(кроки=1)`. */
    readonly signature: string;
    /** What it does, for the palette. */
    readonly doc: string;
    /** The block that opens it on a level. */
    readonly block: BlockName;
    readonly action?: Action;
    readonly sensor?: Sensor;
}
export declare const PYTHON_METHODS: ReadonlyArray<PythonMethod>;
/** The methods a level opens, in palette order. */
export declare const pythonMethodsOf: (blocks: ReadonlyArray<BlockName>) => ReadonlyArray<PythonMethod>;
/** The name the hero has in a program. */
export declare const HERO_NAME = "hero";
/** Steps one `hero.move(n)` may ask for. */
export declare const MAX_MOVE_STEPS = 100;
