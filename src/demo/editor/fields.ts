import type { Issue } from "../../core/kit.ts"
import { type Level, MAX_SAY, type Npc, type NpcKind, type PlacedSprite, type Prop, type PropKind } from "../../core/level.ts"
import { BOSS_HP, DEFAULT_SIGHT, type Direction, type EnemyKind, type EnemySees, type EnemySpec, type EnemyWalk } from "../../core/world.ts"

/**
 * The fields of every kind of thing on the map, in one place, as LDtk keeps the fields of an entity: the inspector
 * builds its form from them and the checks of the level read their limits. A new setting of an enemy or a villager
 * is a new line here, not a new form.
 */

export interface Choice<V extends string> {
  readonly id: V
  readonly name: string
}

interface FieldBase<T> {
  readonly key: string
  readonly label: string
  /** A longer explanation, shown on hover. */
  readonly hint?: string
  /** The field is shown only when this holds, as the route only for a patrolling enemy. */
  readonly when?: (thing: T) => boolean
}

export type Field<T> =
  | (FieldBase<T> & {
      readonly type: "number"
      readonly min: number
      readonly max: number
      readonly get: (thing: T) => number
      readonly set: (thing: T, value: number) => T
    })
  | (FieldBase<T> & {
      readonly type: "choice"
      readonly choices: ReadonlyArray<Choice<string>>
      readonly get: (thing: T) => string
      readonly set: (thing: T, value: string) => T
    })
  | (FieldBase<T> & {
      readonly type: "check"
      readonly get: (thing: T) => boolean
      readonly set: (thing: T, value: boolean) => T
    })
  | (FieldBase<T> & {
      readonly type: "text"
      readonly maxLength: number
      readonly get: (thing: T) => string
      readonly set: (thing: T, value: string) => T
    })

/** The most hit points, sight and hearts the editor offers. */
export const MAX_HP = 9
export const MAX_SIGHT = 12

export const MONSTERS: ReadonlyArray<Choice<EnemyKind>> = [
  { id: "slime", name: "Гоблін у бочці" },
  { id: "spirit", name: "Гоблін-підривник" },
  { id: "goblin", name: "Гоблін" },
  { id: "skull", name: "Фіолетовий гоблін" },
  { id: "flame", name: "Червоний підривник" },
  { id: "bear", name: "Ватажок гоблінів" },
  { id: "toad", name: "Фіолетова бочка" }
]

export const WALKS: ReadonlyArray<Choice<EnemyWalk>> = [
  { id: "stand", name: "стоїть" },
  { id: "across", name: "ходить ліворуч-праворуч" },
  { id: "updown", name: "ходить вгору-вниз" },
  { id: "patrol", name: "обходить маршрут" }
]

export const SEES: ReadonlyArray<Choice<EnemySees>> = [
  { id: "near", name: "чує поруч, крізь стіни" },
  { id: "line", name: "бачить у своєму ряду чи стовпці" }
]

export const PEOPLE: ReadonlyArray<Choice<NpcKind>> = [
  { id: "grandpa", name: "Дід" },
  { id: "boy", name: "Хлопчик" },
  { id: "girl", name: "Дівчинка" },
  { id: "kid", name: "Малий" },
  { id: "villager", name: "Сусід" },
  { id: "hunter", name: "Мисливець" }
]

export const PROP_KINDS: ReadonlyArray<Choice<PropKind>> = [
  { id: "house", name: "Хата" },
  { id: "woodshed", name: "Дровітня" },
  { id: "appleTree", name: "Ялинка" }
]

export const LOOKS: ReadonlyArray<Choice<Direction>> = [
  { id: "down", name: "вниз" },
  { id: "up", name: "вгору" },
  { id: "left", name: "ліворуч" },
  { id: "right", name: "праворуч" }
]

const LAYERS: ReadonlyArray<Choice<string>> = [
  { id: "", name: "сам вибере" },
  { id: "ground", name: "земля (під усім)" },
  { id: "object", name: "предмет (стоїть)" }
]

/** Rounds into the limits; anything that is no number becomes the least. */
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))

/** A copy without the key, so an optional field left at its default disappears from the level's code. */
const without = <T extends object, K extends keyof T>(thing: T, key: K): Omit<T, K> => {
  const { [key]: _, ...rest } = thing
  return rest
}

const isOne = <T extends string>(choices: ReadonlyArray<Choice<T>>, value: string): value is T => choices.some((c) => c.id === value)

export const ENEMY_FIELDS: ReadonlyArray<Field<EnemySpec>> = [
  {
    key: "kind",
    type: "choice",
    label: "Хто",
    choices: MONSTERS,
    get: (e) => e.kind,
    set: (e, v) => (isOne(MONSTERS, v) ? { ...e, kind: v } : e)
  },
  {
    key: "walk",
    type: "choice",
    label: "Поки героя не бачить",
    choices: WALKS,
    get: (e) => e.walk ?? "stand",
    set: (e, v) => (!isOne(WALKS, v) ? e : v === "stand" ? without(e, "walk") : { ...e, walk: v })
  },
  {
    key: "sees",
    type: "choice",
    label: "Помічає героя",
    choices: SEES,
    get: (e) => e.sees ?? "near",
    set: (e, v) => (!isOne(SEES, v) ? e : v === "near" ? without(e, "sees") : { ...e, sees: v })
  },
  {
    key: "sight",
    type: "number",
    label: "Бачить за X клітинок",
    hint: "За скільки клітинок ворог помічає героя й іде до нього. 0 — не йде, б'є лише впритул.",
    min: 0,
    max: MAX_SIGHT,
    get: (e) => e.sight ?? DEFAULT_SIGHT,
    set: (e, v) => ({ ...e, sight: v })
  },
  {
    key: "hp",
    type: "number",
    label: "Ударів витримує",
    min: 1,
    max: MAX_HP,
    get: (e) => e.hp ?? (e.boss === true ? BOSS_HP : 1),
    set: (e, v) => ({ ...e, hp: v })
  },
  {
    key: "boss",
    type: "check",
    label: "Бос",
    hint: "Бос більший, показує свої удари й б'є навіть під ударами.",
    get: (e) => e.boss === true,
    set: (e, v) => (v ? { ...e, boss: true } : without(e, "boss"))
  }
]

export const NPC_FIELDS: ReadonlyArray<Field<Npc>> = [
  {
    key: "who",
    type: "choice",
    label: "Хто",
    choices: PEOPLE,
    when: (n) => n.look === undefined,
    get: (n) => n.who,
    set: (n, v) => (isOne(PEOPLE, v) ? { ...n, who: v } : n)
  },
  {
    key: "say",
    type: "text",
    label: "Каже, коли герой поруч",
    hint: "Підказка чи слова з історії. Видно в бульбашці, коли герой стоїть на сусідній клітинці.",
    maxLength: MAX_SAY,
    get: (n) => n.say ?? "",
    set: (n, v) => (v === "" ? without(n, "say") : { ...n, say: v })
  }
]

export const PROP_FIELDS: ReadonlyArray<Field<Prop>> = [
  {
    key: "kind",
    type: "choice",
    label: "Що",
    choices: PROP_KINDS,
    get: (p) => p.kind,
    set: (p, v) => (isOne(PROP_KINDS, v) ? { ...p, kind: v } : p)
  }
]

/** The sprite's own clips and whether it has directions: the fields that depend on the picture. */
export interface SpriteInfo {
  readonly clips: ReadonlyArray<string>
  readonly directional: boolean
}

export const spriteFields = (info: SpriteInfo): ReadonlyArray<Field<PlacedSprite>> => [
  ...(info.clips.length === 0
    ? []
    : [
        {
          key: "clip",
          type: "choice",
          label: "Анімація",
          choices: [{ id: "", name: "звичайна" }, ...info.clips.map((c) => ({ id: c, name: c }))],
          get: (s) => s.clip ?? "",
          set: (s, v) => (v === "" ? without(s, "clip") : { ...s, clip: v })
        } satisfies Field<PlacedSprite>
      ]),
  ...(info.directional
    ? [
        {
          key: "dir",
          type: "choice",
          label: "Дивиться",
          choices: LOOKS,
          get: (s) => s.dir ?? "down",
          set: (s, v) => (!isOne(LOOKS, v) ? s : v === "down" ? without(s, "dir") : { ...s, dir: v })
        } satisfies Field<PlacedSprite>
      ]
    : []),
  {
    key: "layer",
    type: "choice",
    label: "Шар",
    choices: LAYERS,
    get: (s) => s.layer ?? "",
    set: (s, v) => (v === "ground" || v === "object" ? { ...s, layer: v } : without(s, "layer"))
  },
  {
    key: "flip",
    type: "check",
    label: "Дзеркально",
    get: (s) => s.flip === true,
    set: (s, v) => (v ? { ...s, flip: true } : without(s, "flip"))
  }
]

/** What is wrong with one thing by its fields: a number outside its limits, a text too long. */
export const fieldProblems = <T>(fields: ReadonlyArray<Field<T>>, thing: T): ReadonlyArray<string> =>
  fields.flatMap((f) => {
    if (f.when !== undefined && !f.when(thing)) return []
    if (f.type === "number") {
      const v = f.get(thing)
      return v < f.min || v > f.max || !Number.isInteger(v) ? [`«${f.label}» має бути від ${f.min} до ${f.max}, а тут ${v}`] : []
    }
    if (f.type === "text") return f.get(thing).length > f.maxLength ? [`«${f.label}» довше за ${f.maxLength} знаків`] : []
    if (f.type === "choice") return f.choices.some((c) => c.id === f.get(thing)) ? [] : [`«${f.label}»: невідоме значення «${f.get(thing)}»`]
    return []
  })

/**
 * The checks of the editor by the fields of every enemy, for the list of the level's problems. A villager's line
 * too long is told by `checkLevel` itself.
 */
export const fieldIssues = (level: Level): ReadonlyArray<Issue> =>
  (level.enemies ?? []).flatMap((e) =>
    fieldProblems(ENEMY_FIELDS, e).map((text): Issue => ({ level: "warning", text: `Ворог на (${e.x}, ${e.y}): ${text}` }))
  )
