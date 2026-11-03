import type { Prop, PropKind, Scene } from "../core/level.ts"
import { cellKey } from "../core/world.ts"
import { DECOR_ART, type Look } from "./art.ts"
import type { Decor } from "./scenery.ts"

/**
 * How a season changes the field. Tiny Swords has one summer: the other seasons lay a colour over the ground, turn
 * the trees with a filter and let something fall from the sky.
 */

/** What falls over the whole field, drawn by the stage itself. */
export type Weather = "snow" | "rain" | "leaves"

export interface Season {
  readonly weather: Weather | null
  /** Traps are thin ice in this season, pits in the ground otherwise. */
  readonly icy: boolean
  /** A colour laid over the ground: snow in winter, a warm haze in autumn. */
  readonly tint?: string
  /** A canvas filter for trees and bushes, where the browser has one: bare in winter, yellow in autumn. */
  readonly plants?: string
  /** The small things of the meadow; a decor without a look is left out (no mushrooms in the snow). */
  readonly decor: Readonly<Record<Decor, Look | null>>
}

const SUMMER: Season = { weather: null, icy: false, decor: DECOR_ART }

const WINTER: Season = {
  weather: "snow",
  icy: true,
  tint: "rgba(236, 244, 255, 0.6)",
  plants: "saturate(0.25) brightness(1.35)",
  decor: { petals: null, flower: null, tuft: DECOR_ART.clover, clover: DECOR_ART.clover, sprout: null }
}

const SPRING: Season = { weather: "rain", icy: false, tint: "rgba(120, 220, 120, 0.08)", decor: DECOR_ART }

const AUTUMN: Season = {
  weather: "leaves",
  icy: false,
  tint: "rgba(214, 140, 40, 0.18)",
  plants: "hue-rotate(-50deg) saturate(1.3)",
  decor: { ...DECOR_ART, sprout: DECOR_ART.petals }
}

const SEASONS: Readonly<Record<NonNullable<Scene["theme"]>, Season>> = { spring: SPRING, summer: SUMMER, autumn: AUTUMN, winter: WINTER }

export const seasonOf = (scene: Scene): Season => SEASONS[scene.theme ?? "summer"]

/** The cells a prop takes on the map, from its top-left cell: what the level and the editor count with. */
export const PROPS: Readonly<Record<PropKind, { readonly width: number; readonly height: number }>> = {
  house: { width: 4, height: 3 },
  woodshed: { width: 3, height: 2 },
  appleTree: { width: 1.5, height: 1.5 }
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
