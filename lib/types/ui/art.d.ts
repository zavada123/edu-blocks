import type { AssetPack, SpriteAsset } from "../core/assets.ts";
import type { HeroId } from "../core/heroes.ts";
import type { FinishKind, ItemKind, NpcKind, PropKind } from "../core/level.ts";
import type { Direction, EnemyKind } from "../core/world.ts";
import type { Decor, Obstacle } from "./scenery.ts";
/**
 * What the game draws, by sprite id of the Tiny Swords packs. The public pack `tiny-swords` (Update 010, CC0) is
 * always there; when the build also serves the private Free Pack `tiny-swords-free`, a sprite it has under the same
 * id is taken from it instead. Tilesets come from the public pack only: the Free Pack numbers its tiles differently
 * and has no sand.
 *
 * Another pack can join the same way later: give it the same sprite ids, or point an entry here at its own id.
 */
export declare const ART_PACK = "tiny-swords";
export declare const ART_PACK_FREE = "tiny-swords-free";
export interface Art {
    readonly pack: AssetPack;
    readonly sprite: SpriteAsset;
}
/**
 * A sprite of the game's art: from the Free Pack when it is served and has this id, else from the public pack. Null
 * while a pack loads (the field draws again when it arrives) or when neither pack has the sprite.
 */
export declare const art: (id: string) => Art | null;
/** A sprite of the public pack only: tilesets, whose tile numbers the code knows. */
export declare const baseArt: (id: string) => Art | null;
/** The first of the clips that the sprite has, or null: the packs name some clips differently. */
export declare const pickClip: (sprite: SpriteAsset, names: ReadonlyArray<string>) => string | null;
/** What a hero does with the action «атакувати»: swings a sword, shoots a bow or swings an axe. */
export type Fighter = "warrior" | "archer" | "pawn";
/** The look of each hero. The ids stay those the app keeps for the student. */
export declare const HERO_ART: Readonly<Record<HeroId, string>>;
export declare const fighterOf: (spriteId: string) => Fighter;
/** The clip of a hero's attack toward `dir`. */
export declare const attackClips: (fighter: Fighter, dir: Direction) => ReadonlyArray<string>;
/** A hero holding up what it took: a pawn carries it, the others just stand. */
export declare const TAKE_CLIPS: ReadonlyArray<string>;
/** Monsters of the course: goblins of the old pack in colours. */
export declare const ENEMY_ART: Readonly<Record<EnemyKind, string>>;
/** A look and its size against the others: a kid is smaller. */
export interface Look {
    readonly id: string;
    readonly scale?: number;
    readonly clip?: string;
}
export declare const NPC_ART: Readonly<Record<NpcKind, Look>>;
/** What lies on a cell to take. The ids are the old ones; the texts call them gold, mushrooms, meat, arrows, pumpkins and lambs. */
export declare const ITEM_ART: Readonly<Record<ItemKind, Look>>;
/** The goal of a level: a signpost, a spring (water with stones), grandma, or home, where the cell gets the corners of a pointer. */
export declare const FINISH_ART: Readonly<Record<FinishKind, Look | null>>;
export declare const POINTER_ART = "ui/pointer-select";
export declare const WATER_ART = "tileset/water";
export declare const SPRING_ROCKS_ART = "terrain/water-rocks-2";
export declare const FIRE_ART = "effect/fire";
export declare const DEAD_ART = "effect/dead";
export declare const TREE_ART = "decor/tree";
export declare const GROUND_ART = "tileset/ground";
export declare const BRIDGE_ART = "tileset/bridge";
export declare const COIN_ART = "item/gold";
/** Buildings and big things, fitted to the cells the level gives them. */
export declare const PROP_ART: Readonly<Record<PropKind, Look>>;
/** What grows on a wall cell. A stump is the last frame of the tree. */
export declare const OBSTACLE_ART: Readonly<Record<Obstacle, Look>>;
/** Small things in the meadow that do not block the way. */
export declare const DECOR_ART: Readonly<Record<Decor, Look>>;
