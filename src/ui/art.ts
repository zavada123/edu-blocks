import type { AssetPack, SpriteAsset } from "../core/assets.ts"
import type { HeroId } from "../core/heroes.ts"
import type { FinishKind, ItemKind, NpcKind, PropKind } from "../core/level.ts"
import type { Direction, EnemyKind } from "../core/world.ts"
import type { Decor, Obstacle } from "./scenery.ts"
import { packStatus, spriteOf } from "./stage/packs.ts"

/**
 * What the game draws, by sprite id of the Tiny Swords packs. The public pack `tiny-swords` (Update 010, CC0) is
 * always there; when the build also serves the private Free Pack `tiny-swords-free`, a sprite it has under the same
 * id is taken from it instead. Tilesets come from the public pack only: the Free Pack numbers its tiles differently
 * and has no sand.
 *
 * Another pack can join the same way later: give it the same sprite ids, or point an entry here at its own id.
 */

export const ART_PACK = "tiny-swords"
export const ART_PACK_FREE = "tiny-swords-free"

export interface Art {
  readonly pack: AssetPack
  readonly sprite: SpriteAsset
}

/**
 * A sprite of the game's art: from the Free Pack when it is served and has this id, else from the public pack. Null
 * while a pack loads (the field draws again when it arrives) or when neither pack has the sprite.
 */
export const art = (id: string): Art | null => {
  const free = packStatus(ART_PACK_FREE)
  if (free === "loading") return null
  if (free === "ready") {
    const found = spriteOf(`${ART_PACK_FREE}:${id}`)
    if (found !== null) return found
  }
  return spriteOf(`${ART_PACK}:${id}`)
}

/** A sprite of the public pack only: tilesets, whose tile numbers the code knows. */
export const baseArt = (id: string): Art | null => spriteOf(`${ART_PACK}:${id}`)

/** The first of the clips that the sprite has, or null: the packs name some clips differently. */
export const pickClip = (sprite: SpriteAsset, names: ReadonlyArray<string>): string | null =>
  names.find((n) => sprite.clips?.[n] !== undefined) ?? null

// ── Heroes ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What a hero does with the action «атакувати»: swings a sword, shoots a bow or swings an axe. */
export type Fighter = "warrior" | "archer" | "pawn"

/** The look of each hero. The ids stay those the app keeps for the student. */
export const HERO_ART: Readonly<Record<HeroId, string>> = {
  ninja: "character/warrior-blue",
  robot: "character/pawn-blue",
  rover: "character/archer-blue",
  bee: "character/warrior-purple",
  knight: "character/warrior-red",
  eskimo: "character/archer-purple",
  cavegirl: "character/pawn-red",
  woman: "character/archer-red",
  samurai: "character/archer-yellow",
  "knight-gold": "character/warrior-yellow"
}

export const fighterOf = (spriteId: string): Fighter =>
  spriteId.includes("archer") ? "archer" : spriteId.includes("pawn") ? "pawn" : "warrior"

const ATTACK_CLIPS: Readonly<Record<Fighter, Readonly<Record<"up" | "down" | "side", ReadonlyArray<string>>>>> = {
  warrior: { up: ["attack-up", "attack"], down: ["attack-down", "attack"], side: ["attack"] },
  archer: { up: ["shoot-up", "shoot"], down: ["shoot-down", "shoot"], side: ["shoot"] },
  pawn: { up: ["chop"], down: ["chop"], side: ["chop"] }
}

/** The clip of a hero's attack toward `dir`. */
export const attackClips = (fighter: Fighter, dir: Direction): ReadonlyArray<string> =>
  ATTACK_CLIPS[fighter][dir === "up" ? "up" : dir === "down" ? "down" : "side"]

/** A hero holding up what it took: a pawn carries it, the others just stand. */
export const TAKE_CLIPS: ReadonlyArray<string> = ["carry-idle", "idle-wood", "idle"]

// ── The world ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Monsters of the course: goblins of the old pack in colours. */
export const ENEMY_ART: Readonly<Record<EnemyKind, string>> = {
  goblin: "enemy/goblin-torch-red",
  slime: "enemy/goblin-barrel-blue",
  skull: "enemy/goblin-torch-purple",
  flame: "enemy/goblin-tnt-red",
  bear: "enemy/goblin-torch-yellow",
  toad: "enemy/goblin-barrel-purple",
  spirit: "enemy/goblin-tnt-purple"
}

/** A look and its size against the others: a kid is smaller. */
export interface Look {
  readonly id: string
  readonly scale?: number
  readonly clip?: string
}

export const NPC_ART: Readonly<Record<NpcKind, Look>> = {
  grandpa: { id: "character/pawn-purple" },
  boy: { id: "character/pawn-blue", scale: 0.85 },
  girl: { id: "character/pawn-red", scale: 0.85 },
  villager: { id: "character/pawn-yellow" },
  hunter: { id: "character/archer-yellow" },
  kid: { id: "character/pawn-blue", scale: 0.7 }
}

/** What lies on a cell to take. The ids are the old ones; the texts call them gold, mushrooms, meat, arrows, pumpkins and lambs. */
export const ITEM_ART: Readonly<Record<ItemKind, Look>> = {
  crystal: { id: "item/gold" },
  wood: { id: "item/wood" },
  apple: { id: "decor/mushroom-medium" },
  fish: { id: "item/meat" },
  key: { id: "weapon/arrow", scale: 0.8 },
  campfire: { id: "item/wood" },
  carrot: { id: "decor/pumpkin-small", scale: 0.7 },
  egg: { id: "animal/sheep", scale: 0.6 }
}

/** The goal of a level: a signpost, a spring (water with stones), grandma, or home, where the cell gets the corners of a pointer. */
export const FINISH_ART: Readonly<Record<FinishKind, Look | null>> = {
  flag: { id: "decor/sign-arrow", scale: 0.8 },
  well: null,
  grandma: { id: "character/pawn-yellow" },
  home: null
}

export const POINTER_ART = "ui/pointer-select"
export const WATER_ART = "tileset/water"
export const SPRING_ROCKS_ART = "terrain/water-rocks-2"
export const FIRE_ART = "effect/fire"
export const DEAD_ART = "effect/dead"
export const TREE_ART = "decor/tree"
export const GROUND_ART = "tileset/ground"
export const BRIDGE_ART = "tileset/bridge"
export const COIN_ART = "item/gold"

/** Buildings and big things, fitted to the cells the level gives them. */
export const PROP_ART: Readonly<Record<PropKind, Look>> = {
  house: { id: "prop/house-blue" },
  woodshed: { id: "prop/wood-tower-yellow", scale: 0.8 },
  appleTree: { id: "decor/tree", scale: 0.75 }
}

/** What grows on a wall cell. A stump is the last frame of the tree. */
export const OBSTACLE_ART: Readonly<Record<Obstacle, Look>> = {
  bush: { id: "decor/bush-large" },
  bushRound: { id: "decor/bush-medium" },
  fern: { id: "decor/mushroom-large" },
  rock: { id: "decor/rock-large" },
  stump: { id: "decor/tree", clip: "stump", scale: 0.8 },
  sunflower: { id: "decor/pumpkin-large" }
}

/** Small things in the meadow that do not block the way. */
export const DECOR_ART: Readonly<Record<Decor, Look>> = {
  petals: { id: "decor/grass-small" },
  flower: { id: "decor/mushroom-small" },
  tuft: { id: "decor/grass-large" },
  clover: { id: "decor/rock-small" },
  sprout: { id: "decor/mushroom-medium" }
}
