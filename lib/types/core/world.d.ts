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
 * the hero can step on it, and the run ends there), `H` storehouse (floor where «віднести на склад» puts down what the
 * hero carries), `L` a lever that is off, `l` a lever that is on, `G` a gate (shut like a wall until every lever is on).
 * A space or a cell outside the rows is a wall too.
 */
export type MapRows = ReadonlyArray<string>;
/** What lies on the `c` cells and what `collect` takes. A campfire is not taken but lit. */
export type ItemKind = "crystal" | "wood" | "apple" | "fish" | "key" | "campfire" | "carrot" | "egg";
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
    /** The storehouse cell (`H`), or null when the map has none. */
    readonly storehouse: Cell | null;
    /** Things the hero took and carries now. */
    readonly carrying: number;
    /** How many things the hero can carry at once, or null when the level has no limit. */
    readonly capacity: number | null;
    /** Things put down in the storehouse. */
    readonly stored: number;
    /** Lever cells (`L`, `l`): floor where «потягнути важіль» switches the lever. */
    readonly levers: ReadonlySet<string>;
    /** The levers that are on now. */
    readonly leversOn: ReadonlySet<string>;
    /** Gate cells (`G`): a wall while any lever is off, floor once all of them are on. */
    readonly gates: ReadonlySet<string>;
    /** What lies on each `c` cell, taken or not: the level's items (`startWorld`). A crystal where it is left out. */
    readonly itemKinds: ReadonlyMap<string, ItemKind>;
}
/** Monsters from the pack. Which one only changes the picture. */
export type EnemyKind = "slime" | "spirit" | "goblin" | "skull" | "flame" | "bear" | "toad";
/**
 * How an enemy moves while it does not come for the hero: stands, walks left and right, walks up and down, or
 * walks its `route` round and round.
 */
export type EnemyWalk = "stand" | "across" | "updown" | "patrol";
/**
 * When an enemy notices the hero. `near`: the hero is `sight` steps away or closer, walls or not. `line`: the enemy
 * sees the hero in its row or column, `sight` cells away or closer, with no wall between; once it has seen the hero
 * it keeps coming for them.
 */
export type EnemySees = "near" | "line";
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
    /** The cells a patrolling enemy walks to, one after another, then again from the first. */
    readonly route?: ReadonlyArray<Cell>;
    /** When it notices the hero: `near` by default. */
    readonly sees?: EnemySees;
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
    /** The patrol route, empty for an enemy that does not patrol. */
    readonly route: ReadonlyArray<Cell>;
    /** The cell of `route` it walks to now. */
    readonly target: number;
    readonly sees: EnemySees;
    /** Set once a `line` enemy has seen the hero: from then on it comes for them. */
    readonly alerted: boolean;
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
/** What lies or lay on a cell. */
export declare const kindAt: (world: World, key: string) => ItemKind;
/** «тут ‹морква›?»: a thing of this kind lies under the hero. */
export declare const itemIs: (world: World, kind: ItemKind) => boolean;
/** Things of this kind on the map at the start, and the ones still lying there. */
export declare const itemCount: (world: World, kind: ItemKind) => {
    readonly total: number;
    readonly left: number;
};
/** Every lever is on, so the gates stand open. True on a map without levers. */
export declare const gatesOpen: (world: World) => boolean;
/** A gate that is shut now. */
export declare const isClosedGate: (world: World, x: number, y: number) => boolean;
/** A wall, the edge of the map or a shut gate: nobody walks there now. */
export declare const isWall: (world: World, x: number, y: number) => boolean;
export declare const cellAhead: (world: World) => Cell;
export declare const wallAhead: (world: World) => boolean;
export declare const enemyAt: (world: World, x: number, y: number) => Enemy | undefined;
export declare const enemyAhead: (world: World) => boolean;
export declare const trapAhead: (world: World) => boolean;
export declare const onCrystal: (world: World) => boolean;
export declare const atFinish: (world: World) => boolean;
/** The hero stands on the storehouse. */
export declare const atStorehouse: (world: World) => boolean;
/** The hero carries as much as it can: «взяти» would take nothing now. Never true on a level without a limit. */
export declare const handsFull: (world: World) => boolean;
/** The hero stands on a lever. */
export declare const onLever: (world: World) => boolean;
/** The hero stands on a lever that is on. */
export declare const leverOn: (world: World) => boolean;
export type Action = "move" | "turnLeft" | "turnRight" | "collect" | "attack" | "store" | "wait" | "pull";
/** What one action did, for the animation and the error message. */
export type Outcome = "moved" | "crashed" | "fell" | "tired" | "turned" | "collected" | "nothingToCollect" | "enemyHit" | "enemyDown" | "swingMissed"
/** «взяти» with full hands: the thing stays where it lies. */
 | "handsFull"
/** «віднести на склад» on the storehouse: what the hero carried is in the storehouse now. */
 | "stored"
/** «віднести на склад» away from the storehouse. */
 | "notStorehouse"
/** «віднести на склад» on the storehouse with empty hands. */
 | "nothingToStore"
/** «зачекати»: the hero stands, the enemies take their turn. */
 | "waited"
/** «потягнути важіль» on a lever: it is switched. */
 | "pulled"
/** «потягнути важіль» where there is no lever. */
 | "noLever";
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
/** «взяти» with full hands. */
 | {
    readonly type: "handsFull";
    readonly at: Cell;
}
/** The hero put down what it carried in the storehouse. */
 | {
    readonly type: "itemsStored";
    readonly at: Cell;
    readonly count: number;
}
/** «віднести на склад» where there is no storehouse, or with empty hands. */
 | {
    readonly type: "nothingToStore";
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
}
/** The enemy saw the hero and comes for them now. */
 | {
    readonly type: "enemyAlerted";
    readonly id: number;
}
/** The hero stood one turn. */
 | {
    readonly type: "heroWaited";
}
/** The hero switched the lever: on or off now. */
 | {
    readonly type: "leverPulled";
    readonly at: Cell;
    readonly on: boolean;
}
/** «потягнути важіль» where there is no lever. */
 | {
    readonly type: "noLever";
    readonly at: Cell;
}
/** The last lever went on: the gates are open. */
 | {
    readonly type: "gatesOpened";
}
/** A lever went off: the gates shut. */
 | {
    readonly type: "gatesClosed";
};
export interface ActionResult {
    readonly world: World;
    readonly outcome: Outcome;
    readonly events: ReadonlyArray<GameEvent>;
}
/** The enemy sees the hero in its row or column, `sight` cells away or closer, with no wall between. */
export declare const seesInLine: (world: World, self: Enemy) => boolean;
/** Outcomes that end the run at once: the enemies do not move after them. */
export declare const isFatal: (outcome: Outcome) => boolean;
/** One hero action, then the enemies' turn. A crash, a trap or the end of the steps ends the run at once. */
export declare const applyAction: (world: World, action: Action) => ActionResult;
