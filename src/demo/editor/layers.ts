import type { Scene } from "../../core/level.ts"
import { type Brush, type LayerId, spriteLayer } from "./edit.ts"
import type { Selection } from "./select.ts"

/**
 * The layers of the editor, as in LDtk: what the hero may do (the map signs), the painted ground, the flat decor,
 * the things that stand up, and the roofs over the hero. A hidden layer is left off the field, a locked one keeps
 * its things from the brushes, the eraser and the tool «Вибір».
 */

export type { LayerId } from "./edit.ts"

export interface LayerInfo {
  readonly id: LayerId
  readonly name: string
  readonly hint: string
}

export const LAYERS: ReadonlyArray<LayerInfo> = [
  { id: "logic", name: "Логіка", hint: "Стіни, стежка, старт, мета, предмети, важелі: де герой може ходити і що робити" },
  { id: "terrain", name: "Місцевість", hint: "Земля, вода, пісок пензлями з картки «Земля»: краї підбираються самі" },
  { id: "decor", name: "Декор", hint: "Пласкі плитки й картинки під усім: квіти, каміння, доріжки" },
  { id: "objects", name: "Об'єкти", hint: "Те, що стоїть: будинки, люди, вороги, картинки-предмети" },
  { id: "above", name: "Над героєм", hint: "Дахи й крони з карти плиток Tiled: герой ходить під ними" }
]

/** The state of the layer panel: hidden and locked layers, and the map signs over the field. */
export interface LayerState {
  readonly hidden: ReadonlySet<LayerId>
  readonly locked: ReadonlySet<LayerId>
  /** Show the map signs over the field: where the hero can really go, whatever the decor hides. */
  readonly logicOnTop: boolean
}

export const NO_LAYERS: LayerState = { hidden: new Set(), locked: new Set(), logicOnTop: false }

/** The layer a brush paints on; null for the eraser and «Вибір», which work on whatever lies on top. */
export const layerOfBrush = (brush: Brush): LayerId | null => {
  switch (brush.kind) {
    case "tile":
      return "logic"
    case "ground":
      return "terrain"
    case "sprite":
      return spriteLayer({ asset: brush.asset, x: 0, y: 0, ...(brush.tiles === undefined ? {} : { tiles: brush.tiles }), ...(brush.layer === undefined ? {} : { layer: brush.layer }) })
    case "prop":
    case "npc":
    case "enemy":
      return "objects"
    case "erase":
    case "select":
      return null
  }
}

/** The layer of a thing picked by «Вибір». */
export const layerOfSelection = (selection: Selection, sprites: Scene["sprites"]): LayerId => {
  if (selection.kind === "cell") return "logic"
  if (selection.kind === "sprite") {
    const s = (sprites ?? [])[selection.index]
    return s === undefined ? "objects" : spriteLayer(s)
  }
  return "objects"
}

export const toggled = <T,>(set: ReadonlySet<T>, value: T): ReadonlySet<T> => {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

/** The scene with the hidden layers left out, for the field of the editor. The level itself never changes. */
export const visibleScene = (scene: Scene, hidden: ReadonlySet<LayerId>): Scene => {
  if (hidden.size === 0) return scene
  const { terrain, sprites, props, npcs, tilemap, ...rest } = scene
  const keptSprites = (sprites ?? []).filter((s) => !hidden.has(spriteLayer(s)))
  const keptLayers = (tilemap?.layers ?? []).filter((l) =>
    l.kind === "ground" ? !hidden.has("decor") : l.kind === "objects" ? !hidden.has("objects") : !hidden.has("above")
  )
  return {
    ...rest,
    ...(terrain === undefined || hidden.has("terrain") ? {} : { terrain }),
    ...(sprites === undefined ? {} : { sprites: keptSprites }),
    ...(props === undefined || hidden.has("objects") ? {} : { props }),
    ...(npcs === undefined || hidden.has("objects") ? {} : { npcs }),
    ...(tilemap === undefined ? {} : { tilemap: { ...tilemap, layers: keptLayers } })
  }
}
