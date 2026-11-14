import { tileAt } from "../../core/kit.ts"
import type { ItemKind, Level } from "../../core/level.ts"
import type { Direction } from "../../core/world.ts"
import { ITEM_NAMES } from "../../core/blocks.ts"
import { clamp, ENEMY_FIELDS, type Field, LOOKS, NPC_FIELDS, PROP_FIELDS, spriteFields } from "./fields.ts"
import {
  clearRoute,
  dropRoutePoint,
  gatesOfLever,
  itemAtCell,
  linkOf,
  removeSelected,
  type Selection,
  setEnemy,
  setItemAt,
  setNpc,
  setProp,
  setSprite,
  unlinkGate
} from "./select.ts"
import { findSprite, useLevelPacks } from "./SpritesCard.tsx"
import { Thumb } from "./AssetBrowser.tsx"

/**
 * The inspector of the tool «Вибір», as the entity panel of LDtk: the fields of the thing picked on the map, built
 * from their description in `fields.ts`, and the settings that need the map itself: the route of an enemy (cells
 * clicked one after another) and the levers of a gate.
 */

/** What clicks on the map do while the inspector waits for cells: add route points or link levers. */
export type Aim = "route" | "link" | null

export interface InspectorProps {
  readonly level: Level
  readonly selection: Selection
  readonly aim: Aim
  readonly onAim: (aim: Aim) => void
  readonly onChange: (change: (level: Level) => Level) => void
  readonly onSelect: (selection: Selection | null) => void
}

/** A form from field descriptions. */
export const FieldForm = <T,>({ fields, thing, onChange }: { readonly fields: ReadonlyArray<Field<T>>; readonly thing: T; readonly onChange: (next: T) => void }) => (
  <div className="ed-fields">
    {fields
      .filter((f) => f.when === undefined || f.when(thing))
      .map((f) => {
        switch (f.type) {
          case "number":
            return (
              <label key={f.key} title={f.hint}>
                {f.label}
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={f.get(thing)}
                  onChange={(e) => onChange(f.set(thing, clamp(Number(e.target.value), f.min, f.max)))}
                />
              </label>
            )
          case "choice":
            return (
              <label key={f.key} title={f.hint}>
                {f.label}
                <select value={f.get(thing)} onChange={(e) => onChange(f.set(thing, e.target.value))}>
                  {f.choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )
          case "check":
            return (
              <label key={f.key} className="ed-check" title={f.hint}>
                <input type="checkbox" checked={f.get(thing)} onChange={(e) => onChange(f.set(thing, e.target.checked))} /> {f.label}
              </label>
            )
          case "text":
            return (
              <label key={f.key} title={f.hint} className="ed-field-wide">
                {f.label}
                <input value={f.get(thing)} maxLength={f.maxLength} onChange={(e) => onChange(f.set(thing, e.target.value))} />
                <span className="ed-count">
                  {f.get(thing).length}/{f.maxLength}
                </span>
              </label>
            )
        }
      })}
  </div>
)

const cellText = (c: { readonly x: number; readonly y: number }) => `(${c.x}, ${c.y})`

const AimButton = ({ aim, want, onAim, children }: { readonly aim: Aim; readonly want: Exclude<Aim, null>; readonly onAim: (aim: Aim) => void; readonly children: string }) => (
  <button type="button" className={aim === want ? "ed-aim ed-aim-on" : "ed-aim"} aria-pressed={aim === want} onClick={() => onAim(aim === want ? null : want)}>
    {aim === want ? "Готово" : children}
  </button>
)

const ITEM_CHOICES: ReadonlyArray<ItemKind> = ["crystal", "wood", "apple", "fish", "key", "campfire", "carrot", "egg"]

const EnemyPanel = ({ level, index, aim, onAim, onChange }: Omit<InspectorProps, "selection" | "onSelect"> & { readonly index: number }) => {
  const enemy = (level.enemies ?? [])[index]
  if (enemy === undefined) return null
  const route = enemy.route ?? []
  return (
    <>
      <FieldForm fields={ENEMY_FIELDS} thing={enemy} onChange={(next) => onChange((l) => setEnemy(l, index, next))} />
      <h3>Маршрут</h3>
      {route.length === 0 ? (
        <p className="ed-note">Маршруту немає. Натисни «Прокласти маршрут» і клацай по стежці клітинки, куди ворог іде по черзі.</p>
      ) : (
        <p className="ed-route">
          {route.map((c, i) => (
            <span key={`${i}-${c.x}-${c.y}`} className="ed-route-point">
              {i + 1}. {cellText(c)}
            </span>
          ))}
        </p>
      )}
      <div className="ed-row">
        <AimButton aim={aim} want="route" onAim={onAim}>
          Прокласти маршрут
        </AimButton>
        <button type="button" disabled={route.length === 0} onClick={() => onChange((l) => dropRoutePoint(l, index))}>
          Без останньої точки
        </button>
        <button type="button" disabled={route.length === 0} onClick={() => onChange((l) => clearRoute(l, index))}>
          Стерти маршрут
        </button>
      </div>
      {aim === "route" && <p className="ed-note ed-aim-note">Клацай клітинки по черзі, права кнопка прибирає останню. Ворог обходить їх по колу.</p>}
    </>
  )
}

const CellPanel = ({ level, x, y, aim, onAim, onChange, onSelect }: Omit<InspectorProps, "selection"> & { readonly x: number; readonly y: number }) => {
  const tile = tileAt(level.map, x, y)
  if (tile === "item") {
    const own = itemAtCell(level, x, y)
    return (
      <label>
        Що лежить
        <select value={own ?? ""} onChange={(e) => onChange((l) => setItemAt(l, x, y, e.target.value === "" ? null : (e.target.value as ItemKind)))}>
          <option value="">як у рівні ({ITEM_NAMES[level.scene?.item ?? "crystal"]})</option>
          {ITEM_CHOICES.map((k) => (
            <option key={k} value={k}>
              {ITEM_NAMES[k]}
            </option>
          ))}
        </select>
      </label>
    )
  }
  if (tile === "gate") {
    const link = linkOf(level, { x, y })
    return (
      <>
        <p className="ed-note">
          {link === undefined
            ? "Ці ворота відчиняються, коли увімкнено всі важелі мапи."
            : `Ці ворота відчиняють лише ${link.levers.length === 1 ? "важіль" : "важелі"} ${link.levers.map(cellText).join(", ")}.`}
        </p>
        <div className="ed-row">
          <AimButton aim={aim} want="link" onAim={onAim}>
            Вибрати важелі на мапі
          </AimButton>
          <button type="button" disabled={link === undefined} onClick={() => onChange((l) => unlinkGate(l, { x, y }))}>
            Усі важелі
          </button>
        </div>
        {aim === "link" && <p className="ed-note ed-aim-note">Клацай по важелях: клік пов'язує важіль із воротами, ще один — розв'язує.</p>}
      </>
    )
  }
  if (tile === "lever" || tile === "leverOn") {
    const gates = gatesOfLever(level, { x, y })
    return (
      <>
        <label className="ed-check">
          <input
            type="checkbox"
            checked={tile === "leverOn"}
            onChange={(e) =>
              onChange((l) => ({
                ...l,
                map: l.map.map((r, j) => (j === y ? `${r.slice(0, x)}${e.target.checked ? "l" : "L"}${r.slice(x + 1)}` : r))
              }))
            }
          />{" "}
          Увімкнений на початку
        </label>
        <p className="ed-note">
          {gates.length === 0 ? "Відчиняє ворота, що чекають на всі важелі." : `Відчиняє ворота ${gates.map(cellText).join(", ")}.`}
        </p>
        {gates.map((g) => (
          <button key={cellText(g)} type="button" onClick={() => onSelect({ kind: "cell", x: g.x, y: g.y })}>
            До воріт {cellText(g)}
          </button>
        ))}
      </>
    )
  }
  if (tile === "start")
    return (
      <label>
        Герой дивиться
        <select value={level.dir ?? "right"} onChange={(e) => onChange((l) => ({ ...l, dir: e.target.value as Direction }))}>
          {LOOKS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
    )
  if (tile === "trap") return <p className="ed-note">Пастка: герой може на неї ступити, і на цьому спроба закінчується.</p>
  if (tile === "finish") return <p className="ed-note">Мета. Що на ній стоїть, вибирають у картці «Сцена».</p>
  return <p className="ed-note">Склад: тут «віднести на склад» кладе те, що несе герой.</p>
}

const TITLES: Readonly<Record<string, string>> = {
  enemy: "Ворог",
  npc: "Людина",
  sprite: "Картинка",
  prop: "Будинок",
  item: "Предмет",
  gate: "Ворота",
  lever: "Важіль",
  leverOn: "Важіль",
  start: "Старт",
  finish: "Мета",
  trap: "Пастка",
  storehouse: "Склад"
}

const SpritePanel = ({ level, index, onChange }: { readonly level: Level; readonly index: number; readonly onChange: InspectorProps["onChange"] }) => {
  const packs = useLevelPacks(level)
  const sprite = (level.scene?.sprites ?? [])[index]
  if (sprite === undefined) return null
  const found = findSprite(packs, sprite.asset)
  const fields = spriteFields({ clips: Object.keys(found?.sprite.clips ?? {}), directional: found?.sprite.layout === "directions" })
  return (
    <>
      <p className="ed-brush">
        {found !== null && <Thumb pack={found.pack} sprite={found.sprite} box={28} />}
        <strong title={sprite.asset}>{found?.sprite.name ?? sprite.asset}</strong>
      </p>
      <FieldForm fields={fields} thing={sprite} onChange={(next) => onChange((l) => setSprite(l, index, next))} />
    </>
  )
}

/** Where the selected thing stands and the panel of its kind. */
export const Inspector = (props: InspectorProps) => {
  const { level, selection, onChange, onSelect } = props
  const where =
    selection.kind === "cell"
      ? { x: selection.x, y: selection.y }
      : selection.kind === "enemy"
        ? (level.enemies ?? [])[selection.index]
        : selection.kind === "npc"
          ? (level.scene?.npcs ?? [])[selection.index]
          : selection.kind === "sprite"
            ? (level.scene?.sprites ?? [])[selection.index]
            : (level.scene?.props ?? [])[selection.index]
  if (where === undefined) return null
  const title = TITLES[selection.kind === "cell" ? tileAt(level.map, selection.x, selection.y) : selection.kind] ?? ""
  return (
    <section className="ed-card ed-inspector" aria-label="Властивості вибраного">
      <h2>
        {title} <span className="ed-where">{cellText(where)}</span>
      </h2>
      {selection.kind === "enemy" && <EnemyPanel {...props} index={selection.index} />}
      {selection.kind === "npc" && (() => {
        const npc = (level.scene?.npcs ?? [])[selection.index]
        return npc === undefined ? null : <FieldForm fields={NPC_FIELDS} thing={npc} onChange={(next) => onChange((l) => setNpc(l, selection.index, next))} />
      })()}
      {selection.kind === "prop" && (() => {
        const prop = (level.scene?.props ?? [])[selection.index]
        return prop === undefined ? null : <FieldForm fields={PROP_FIELDS} thing={prop} onChange={(next) => onChange((l) => setProp(l, selection.index, next))} />
      })()}
      {selection.kind === "sprite" && <SpritePanel level={level} index={selection.index} onChange={onChange} />}
      {selection.kind === "cell" && <CellPanel {...props} x={selection.x} y={selection.y} />}
      <div className="ed-row">
        <button
          type="button"
          onClick={() => {
            onChange((l) => removeSelected(l, selection))
            onSelect(null)
          }}
        >
          {selection.kind === "cell" ? "Зробити стежкою" : "Прибрати"}
        </button>
        <button type="button" onClick={() => onSelect(null)}>
          Закрити
        </button>
      </div>
      {selection.kind !== "cell" && <p className="ed-note">Перетягни мишею, щоб пересунути. Delete прибирає, Esc закриває.</p>}
    </section>
  )
}
