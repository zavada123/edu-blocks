/**
 * The game field: a grid map, the hero and the crystals. Pure functions, no VM and no DOM,
 * so the browser and the server move the hero the same way.
 */
export type Direction = "up" | "right" | "down" | "left";
export interface Cell {
    readonly x: number;
    readonly y: number;
}
/**
 * Map rows, top to bottom. `#` wall, `.` floor, `S` start, `c` crystal, `F` finish, `x` trap (thin ice or a pit:
 * the hero can step on it, and the run ends there).
 * A space or a cell outside the rows is a wall too.
 */
export type MapRows = ReadonlyArray<string>;
export interface World {
    readonly width: number;
    readonly height: number;
    readonly walls: ReadonlySet<string>;
    readonly finish: Cell | null;
    /** Crystals still on the map. */
    readonly crystals: ReadonlySet<string>;
    readonly totalCrystals: number;
    readonly hero: Cell & {
        readonly dir: Direction;
    };
    /** Set once the hero walked into a wall. The run stops there. */
    readonly crashed: boolean;
    /** Trap cells: floor that ends the run when the hero steps on it. */
    readonly traps: ReadonlySet<string>;
    /** Set once the hero stepped on a trap. The run stops there. */
    readonly fell: boolean;
    /** Steps the hero may still take, or null when the level has no limit. */
    readonly energy: number | null;
    /** Enemies of the level, beaten ones too (with no hp left), in the order they act. */
    readonly enemies: ReadonlyArray<Enemy>;
    /** Hearts the hero has left. At 0 the run stops. */
    readonly hearts: number;
    readonly maxHearts: number;
}
/** Monsters from the pack. Which one only changes the picture. */
export type EnemyKind = "slime" | "spirit" | "goblin" | "skull" | "flame" | "bear" | "toad";
/** How an enemy moves while the hero is far: stands, walks left and right, or walks up and down. */
export type EnemyWalk = "stand" | "across" | "updown";
/** An enemy as a level puts it on the map. */
export interface EnemySpec {
    readonly kind: EnemyKind;
    readonly x: number;
    readonly y: number;
    /** Hits it takes. 1 by default, 3 for a boss. */
    readonly hp?: number;
    /** It comes for the hero once the hero is this many steps away or closer. 2 by default; 0 never comes. */
    readonly sight?: number;
    readonly walk?: EnemyWalk;
    /** A boss is drawn bigger and shows its hp. */
    readonly boss?: boolean;
    /** A picture from an asset pack (`"<pack>:<sprite id>"`) instead of the kind's own. Only looks. */
    readonly look?: string;
}
export interface Enemy {
    readonly id: number;
    readonly kind: EnemyKind;
    readonly x: number;
    readonly y: number;
    readonly hp: number;
    readonly maxHp: number;
    readonly sight: number;
    readonly walk: EnemyWalk;
    /** Where a walking enemy goes now: +1 right or down, -1 left or up. */
    readonly heading: 1 | -1;
    /** Set when the enemy stands next to the hero and swings: it hits on its next turn if the hero is still there. */
    readonly swinging: boolean;
    readonly boss: boolean;
    /** The picture from an asset pack, when the level gave one. */
    readonly look?: string;
}
export declare const DEFAULT_HEARTS = 3;
export declare const DEFAULT_SIGHT = 2;
export declare const BOSS_HP = 3;
export declare const enemyOf: (spec: EnemySpec, id: number) => Enemy;
export declare const isAlive: (enemy: Enemy) => boolean;
export declare const enemiesLeft: (world: World) => number;
export declare const cellKey: (x: number, y: number) => string;
export declare const parseMap: (rows: MapRows, dir?: Direction) => World;
export declare const isWall: (world: World, x: number, y: number) => boolean;
export declare const cellAhead: (world: World) => Cell;
export declare const wallAhead: (world: World) => boolean;
export declare const enemyAt: (world: World, x: number, y: number) => Enemy | undefined;
export declare const enemyAhead: (world: World) => boolean;
export declare const trapAhead: (world: World) => boolean;
export declare const onCrystal: (world: World) => boolean;
export declare const atFinish: (world: World) => boolean;
export type Action = "move" | "turnLeft" | "turnRight" | "collect" | "attack";
/** What one action did, for the animation and the error message. */
export type Outcome = "moved" | "crashed" | "fell" | "tired" | "turned" | "collected" | "nothingToCollect" | "enemyHit" | "enemyDown" | "swingMissed";
/**
 * What happened in the world, in the order it happened: the hero's action first, then each enemy's turn.
 * A frame keeps the events, so an animation shows what was done, not only where everybody stands now.
 */
export type GameEvent = {
    readonly type: "heroMoved";
    readonly from: Cell;
    readonly to: Cell;
} | {
    readonly type: "heroTurned";
    readonly from: Direction;
    readonly to: Direction;
}
/** The hero walked into a wall or an enemy. */
 | {
    readonly type: "heroBumped";
    readonly into: Cell;
} | {
    readonly type: "heroFell";
    readonly at: Cell;
}
/** No steps left: the hero could not move. */
 | {
    readonly type: "heroTired";
} | {
    readonly type: "itemTaken";
    readonly at: Cell;
} | {
    readonly type: "nothingToTake";
    readonly at: Cell;
}
/** The hero swung at the cell ahead, with or without an enemy there. */
 | {
    readonly type: "heroSwung";
    readonly at: Cell;
} | {
    readonly type: "enemyHit";
    readonly id: number;
    readonly hp: number;
} | {
    readonly type: "enemyDown";
    readonly id: number;
} | {
    readonly type: "enemyMoved";
    readonly id: number;
    readonly from: Cell;
    readonly to: Cell;
}
/** The enemy raised its weapon: it hits on its next turn if the hero is still next to it. */
 | {
    readonly type: "enemyWindUp";
    readonly id: number;
} | {
    readonly type: "heroHurt";
    readonly by: number;
    readonly hearts: number;
};
export interface ActionResult {
    readonly world: World;
    readonly outcome: Outcome;
    readonly events: ReadonlyArray<GameEvent>;
}
/** Outcomes that end the run at once: the enemies do not move after them. */
export declare const isFatal: (outcome: Outcome) => boolean;
/** One hero action, then the enemies' turn. A crash, a trap or the end of the steps ends the run at once. */
export declare const applyAction: (world: World, action: Action) => ActionResult;
