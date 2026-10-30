import type { ItemKind, NpcKind, Prop, PropKind, Scene } from "../core/level.ts"
import { cellKey } from "../core/world.ts"
import type { Decor, Obstacle } from "./scenery.ts"
import appleTile from "./sprites/apple.png"
import bloomOrangeStrip from "./sprites/bloom-orange.png"
import bloomWhiteStrip from "./sprites/bloom-white.png"
import bridgeTile from "./sprites/bridge.png"
import bushRoundTile from "./sprites/bush-round.png"
import bushTile from "./sprites/bush.png"
import cloverTile from "./sprites/clover.png"
import crystalTile from "./sprites/crystal.png"
import fernTile from "./sprites/fern.png"
import fishTile from "./sprites/fish.png"
import flowerTile from "./sprites/flower.png"
import grassTile from "./sprites/grass.png"
import houseImage from "./sprites/house.png"
import iceTile from "./sprites/ice.png"
import keyImage from "./sprites/key.png"
import meadowSheet from "./sprites/meadow.png"
import npcBoySheet from "./sprites/npc-boy.png"
import npcGirlSheet from "./sprites/npc-girl.png"
import npcGrandpaSheet from "./sprites/npc-grandpa.png"
import npcHunterSheet from "./sprites/npc-hunter.png"
import npcKidSheet from "./sprites/npc-kid.png"
import npcVillagerSheet from "./sprites/npc-villager.png"
import pathSummerSheet from "./sprites/path-summer.png"
import pathWinterSheet from "./sprites/path-winter.png"
import pathTile from "./sprites/path.png"
import petalsTile from "./sprites/petals.png"
import rockTile from "./sprites/rock.png"
import snowBallTile from "./sprites/snow-ball.png"
import snowPineSmallTile from "./sprites/snow-pine-small.png"
import snowRockTile from "./sprites/snow-rock.png"
import snowShrubTile from "./sprites/snow-shrub.png"
import snowTreeImage from "./sprites/snow-tree.png"
import snowTile from "./sprites/snow.png"
import snowMeadowSheet from "./sprites/snow-meadow.png"
import snowfallImage from "./sprites/snowfall.png"
import sproutTile from "./sprites/sprout.png"
import stumpTile from "./sprites/stump.png"
import sunflowerTile from "./sprites/sunflower.png"
import treeImage from "./sprites/tree.png"
import tuftTile from "./sprites/tuft.png"
import twigTile from "./sprites/twig.png"
import twigsTile from "./sprites/twigs.png"
import waterTile from "./sprites/water.png"
import woodTile from "./sprites/wood.png"
import woodshedImage from "./sprites/woodshed.png"

/** A bush that sways: a strip of 16×16 frames played in a loop. */
export interface Swaying {
  readonly href: string
  readonly frames: number
}

/** The pictures of one season. A decor without a picture is left out (no flowers in the snow). */
export interface Season {
  /** One ground tile, or a sheet of 7 meadow tiles (see `meadowTile`). */
  readonly grass: string
  readonly meadow: string | null
  /** The 11×6 sheet of path pieces (see terrain.ts). */
  readonly path: string
  /** Snow falling over the whole field. */
  readonly snowfall: string | null
  readonly tree: string
  readonly obstacles: Readonly<Record<Obstacle, string>>
  /** Obstacles drawn as swaying bushes instead of the still picture. */
  readonly swaying: Partial<Readonly<Record<Obstacle, Swaying>>>
  readonly decor: Readonly<Record<Decor, string | null>>
}

const SUMMER: Season = {
  grass: grassTile,
  meadow: meadowSheet,
  path: pathSummerSheet,
  snowfall: null,
  tree: treeImage,
  obstacles: { bush: bushTile, bushRound: bushRoundTile, fern: fernTile, rock: rockTile, stump: stumpTile, sunflower: sunflowerTile },
  swaying: { sunflower: { href: bloomWhiteStrip, frames: 4 }, fern: { href: bloomOrangeStrip, frames: 4 } },
  decor: { petals: petalsTile, flower: flowerTile, tuft: tuftTile, clover: cloverTile, sprout: sproutTile }
}

const WINTER: Season = {
  grass: snowTile,
  meadow: snowMeadowSheet,
  path: pathWinterSheet,
  snowfall: snowfallImage,
  tree: snowTreeImage,
  obstacles: {
    bush: snowShrubTile,
    bushRound: snowBallTile,
    fern: snowPineSmallTile,
    rock: snowRockTile,
    stump: stumpTile,
    sunflower: snowPineSmallTile
  },
  swaying: {},
  decor: { petals: null, flower: twigTile, tuft: twigsTile, clover: null, sprout: twigTile }
}

export const seasonOf = (scene: Scene): Season => (scene.theme === "winter" ? WINTER : SUMMER)

export const FLOORS: Readonly<Record<NonNullable<Scene["ground"]>, string>> = { path: pathTile, ice: iceTile, bridge: bridgeTile }
export { waterTile }

/** Items as 16×16 tiles; a campfire draws its flame on top once lit. */
export const ITEM_TILES: Readonly<Record<ItemKind, string>> = {
  crystal: crystalTile,
  wood: woodTile,
  apple: appleTile,
  fish: fishTile,
  key: keyImage,
  campfire: woodTile
}

export const PROPS: Readonly<Record<PropKind, { readonly href: string; readonly width: number; readonly height: number }>> = {
  house: { href: houseImage, width: 4, height: 3 },
  woodshed: { href: woodshedImage, width: 3, height: 2 }
}

/** Character sheets of the villagers: 64×112, a column per direction, as the hero sheets. */
export const NPCS: Readonly<Record<NpcKind, string>> = {
  grandpa: npcGrandpaSheet,
  boy: npcBoySheet,
  girl: npcGirlSheet,
  villager: npcVillagerSheet,
  hunter: npcHunterSheet,
  kid: npcKidSheet
}

/** The cells a prop covers, so the scenery leaves them free. */
export const propCells = (props: ReadonlyArray<Prop>): ReadonlySet<string> => {
  const cells = new Set<string>()
  for (const p of props) {
    const { width, height } = PROPS[p.kind]
    for (let y = Math.floor(p.y); y < Math.ceil(p.y + height); y++) {
      for (let x = Math.floor(p.x); x < Math.ceil(p.x + width); x++) cells.add(cellKey(x, y))
    }
  }
  return cells
}
