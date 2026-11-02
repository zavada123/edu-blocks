import { checkLevel, type Issue } from "./kit.ts"
import type { AssetRef, BlockName, Goal, Level, PlacedSprite, TileLayer, TileLayerKind } from "./level.ts"
import type { Direction } from "./world.ts"

/**
 * A map drawn in Tiled (https://www.mapeditor.org/) as a level: its tile layers become `scene.tilemap`, a layer of
 * the cells the hero can walk becomes the `map`, and point objects become the start, the goal, the items and the
 * pictures of the scene. `scripts/tiled-to-level.ts` runs it on a `.tmj` file. See «Карта з Tiled» in the README.
 */

/** The size of a tile in pixels: Tiled maps for the field use 16 × 16 tiles, like the field's cells. */
export const TILED_TILE = 16

/** Names of the layer of walkable cells. A layer with the property `role` set to `walk` is one too. */
const WALK_NAMES: ReadonlySet<string> = new Set(["walk", "прохідність"])

/** Tiled keeps flips and rotation in the top bits of a tile number; the field does not flip tiles. */
const FLIP_BITS = 0xf0000000

const DEFAULT_BLOCKS: ReadonlyArray<BlockName> = ["move", "turnLeft", "turnRight", "repeat"]
const DIRECTIONS: ReadonlyArray<Direction> = ["up", "right", "down", "left"]
const KINDS: ReadonlyArray<TileLayerKind> = ["ground", "objects", "above"]

export interface TiledOptions {
  /**
   * The pack sprite of a tileset of the map, from its `source` (`.tsx` file) or `image`, as `"sunnyside:tileset/16px"`;
   * null when it is not a tileset of a pack, which is an error: the field draws only pictures of the packs.
   */
  readonly tileset: (source: string) => AssetRef | null
}

export interface TiledResult {
  /** The level, or null when the map has errors that keep it from being one. */
  readonly level: Level | null
  /** Errors and warnings of the import, then those of `checkLevel` for the level. */
  readonly issues: ReadonlyArray<Issue>
}

type Json = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value)
const listOf = (value: unknown): ReadonlyArray<unknown> => (Array.isArray(value) ? value : [])
const numberOf = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined)
const textOf = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined)

/** The custom properties of a Tiled map, layer or object, by name. */
const propertiesOf = (item: Json): ReadonlyMap<string, unknown> =>
  new Map(
    listOf(item.properties)
      .filter(isRecord)
      .flatMap((p) => (typeof p.name === "string" ? [[p.name, p.value] as const] : []))
  )

/** Tile layers and object groups in drawing order; the layers of a group come in its place. */
const flatLayers = (layers: ReadonlyArray<unknown>): ReadonlyArray<Json> =>
  layers.filter(isRecord).flatMap((l) => (l.type === "group" ? flatLayers(listOf(l.layers)) : [l]))

const isWalkLayer = (layer: Json): boolean => WALK_NAMES.has(String(layer.name ?? "").toLowerCase()) || propertiesOf(layer).get("role") === "walk"

/** How a tile layer is drawn: its `kind` property, or its name (`objects`, `above`), or ground. */
const kindOf = (layer: Json): TileLayerKind => {
  const named = propertiesOf(layer).get("kind") ?? layer.name
  return KINDS.find((k) => k === named) ?? "ground"
}

/** The cell a point object stands in. */
const cellOf = (object: Json): { readonly x: number; readonly y: number } => ({
  x: Math.floor((numberOf(object.x) ?? 0) / TILED_TILE),
  y: Math.floor((numberOf(object.y) ?? 0) / TILED_TILE)
})

/** A picture of the scene from a point object with the property `sprite`: frame, clip, flip and layer are optional. */
const spriteOf = (object: Json, asset: string): PlacedSprite => {
  const props = propertiesOf(object)
  const frame = numberOf(props.get("frame"))
  const clip = textOf(props.get("clip"))
  const layer = props.get("layer")
  return {
    asset,
    ...cellOf(object),
    ...(frame === undefined ? {} : { frame }),
    ...(clip === undefined ? {} : { clip }),
    ...(props.get("flip") === true ? { flip: true } : {}),
    ...(layer === "ground" || layer === "object" ? { layer } : {})
  }
}

/** The text fields of the level from the map's properties `id`, `title`, `task` (lines), `blocks` and `goals` (lists). */
const levelFields = (props: ReadonlyMap<string, unknown>, hasFinish: boolean, hasItems: boolean) => {
  const list = (name: string): ReadonlyArray<string> | undefined =>
    textOf(props.get(name))
      ?.split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
  const goals: ReadonlyArray<Goal> = (list("goals") ?? [...(hasFinish ? ["finish"] : []), ...(hasItems ? ["crystals"] : [])]).map(
    (type) => ({ type }) as Goal
  )
  return {
    id: textOf(props.get("id")) ?? "tiled",
    title: textOf(props.get("title")) ?? "Карта з Tiled",
    task: textOf(props.get("task"))?.split("\n") ?? ["Дійди до прапорця."],
    blocks: (list("blocks") as ReadonlyArray<BlockName> | undefined) ?? DEFAULT_BLOCKS,
    goals
  }
}

/** Reads a Tiled map (the JSON of a `.tmj` file) as a level. */
export const levelFromTiled = (json: unknown, options: TiledOptions): TiledResult => {
  const issues: Array<Issue> = []
  const error = (text: string) => issues.push({ level: "error", text })
  const warning = (text: string) => issues.push({ level: "warning", text })
  const failed = (): TiledResult => ({ level: null, issues })
  if (!isRecord(json)) return (error("Це не карта Tiled: очікую JSON-об'єкт з файлу .tmj"), failed())

  const width = numberOf(json.width) ?? 0
  const height = numberOf(json.height) ?? 0
  if (json.infinite === true) error("Нескінченна карта не підходить: вимкни Infinite у властивостях карти")
  if (json.orientation !== undefined && json.orientation !== "orthogonal") error("Карта має бути прямокутною (Orthogonal)")
  if (json.tilewidth !== TILED_TILE || json.tileheight !== TILED_TILE) error(`Плитки карти мають бути ${TILED_TILE}×${TILED_TILE} пікселів`)
  if (!(Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1)) error("Розмір карти має бути цілим і не меншим за 1")

  const tilesets = listOf(json.tilesets).filter(isRecord)
  const tileset = tilesets[0]
  if (tileset === undefined || tilesets.length > 1) error("Карта має брати плитки з одного тайлсету")
  const source = tileset === undefined ? "" : (textOf(tileset.source) ?? textOf(tileset.image) ?? textOf(tileset.name) ?? "")
  const asset = tileset === undefined ? null : options.tileset(source)
  if (tileset !== undefined && asset === null) error(`Тайлсет «${source}» не з паків: візьми тайлсет пака, наприклад sunnyside-16px.tsx`)
  if (issues.some((i) => i.level === "error")) return failed()
  const firstgid = numberOf(tileset?.firstgid) ?? 1

  const cells = width * height
  const layers = flatLayers(listOf(json.layers)).filter((l) => l.visible !== false)
  const walk = layers.filter((l) => l.type === "tilelayer" && isWalkLayer(l))
  if (walk.length === 0) error("Немає шару «walk» (або «прохідність»): намалюй на ньому клітинки, якими ходить герой")

  let flipped = 0
  const tileNumbers = (layer: Json): ReadonlyArray<number> => {
    const data = listOf(layer.data).map((v) => numberOf(v) ?? 0)
    if (data.length !== cells) error(`Шар «${String(layer.name)}» має ${data.length} плиток, а карта ${width}×${height}`)
    return data.map((gid) => {
      if ((gid & FLIP_BITS) !== 0) flipped++
      const plain = gid & ~FLIP_BITS
      return plain === 0 ? 0 : plain - firstgid + 1
    })
  }

  const rows = Array.from({ length: height }, () => Array.from({ length: width }, () => "#"))
  for (const layer of walk) tileNumbers(layer).forEach((t, i) => t > 0 && ((rows[Math.floor(i / width)] as Array<string>)[i % width] = "."))

  const tileLayers: Array<TileLayer> = layers
    .filter((l) => l.type === "tilelayer" && !isWalkLayer(l))
    .map((l) => {
      const when = textOf(propertiesOf(l).get("upgrade"))
      return { name: String(l.name ?? ""), kind: kindOf(l), data: tileNumbers(l), ...(when === undefined ? {} : { when }) }
    })
  if (flipped > 0) warning(`Перевернутих плиток: ${flipped}. Поле не перевертає плитки, тож вони стоять як у тайлсеті`)

  let dir: Direction | undefined
  let starts = 0
  let finishes = 0
  let items = 0
  const sprites: Array<PlacedSprite> = []
  const mark = (object: Json, tile: string, what: string) => {
    const { x, y } = cellOf(object)
    const row = rows[y]
    if (row === undefined || x < 0 || x >= width) return error(`${what} поза картою (${x}, ${y})`)
    if (row[x] !== ".") return error(`${what} на ${x}, ${y} стоїть не на клітинці шару walk`)
    row[x] = tile
  }
  for (const object of layers.filter((l) => l.type === "objectgroup").flatMap((l) => listOf(l.objects).filter(isRecord))) {
    const role = String(object.type ?? object.class ?? object.name ?? "").toLowerCase()
    const sprite = textOf(propertiesOf(object).get("sprite"))
    if (role === "start") {
      starts++
      mark(object, "S", "Старт")
      const d = propertiesOf(object).get("dir")
      dir = DIRECTIONS.find((v) => v === d) ?? dir
    } else if (role === "finish") {
      finishes++
      mark(object, "F", "Мета")
    } else if (role === "item") {
      items++
      mark(object, "c", "Предмет")
    } else if (sprite !== undefined) sprites.push(spriteOf(object, sprite))
    else warning(`Об'єкт «${String(object.name ?? "")}» без ролі (start, finish, item) і без властивості sprite: пропускаю`)
  }
  if (starts !== 1) error(`На карті має бути один об'єкт start, а є ${starts}`)
  if (issues.some((i) => i.level === "error")) return failed()

  const level: Level = {
    ...levelFields(propertiesOf(json), finishes > 0, items > 0),
    map: rows.map((r) => r.join("")),
    ...(dir === undefined ? {} : { dir }),
    scene: {
      tilemap: { tileset: asset as AssetRef, width, height, layers: tileLayers },
      ...(sprites.length === 0 ? {} : { sprites })
    }
  }
  return { level, issues: [...issues, ...checkLevel(level)] }
}
