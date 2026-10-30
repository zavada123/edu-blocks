import { StrictMode, useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { HERO_BLOCKS } from "../core/blocks.ts"
import { checkLevel, emptyMap, levelSource, MAP_LIMITS, type MapTile, plainRoute, resizeMap, setTile } from "../core/kit.ts"
import { type BlockName, type FinishKind, type Goal, type ItemKind, type Level, type NpcKind, type PropKind, type Scene, startWorld } from "../core/level.ts"
import { BOSS_HP, DEFAULT_HEARTS, DEFAULT_SIGHT, type Direction, type EnemyKind, type EnemySpec, type EnemyWalk, parseMap } from "../core/world.ts"
import type { Tier } from "../core/xp.ts"
import { levels } from "../levels/index.ts"
import { type BlocksReport, EduBlocks } from "../ui/EduBlocks.tsx"
import { Field } from "../ui/Field.tsx"
import { ENEMIES, ITEM_TILES, NPCS, PROPS } from "../ui/look.ts"
import { buildScenery } from "../ui/scenery.ts"
import bushTile from "../ui/sprites/bush.png"
import flagStrip from "../ui/sprites/flag.png"
import ninjaSheet from "../ui/sprites/ninja.png"
import pathSheet from "../ui/sprites/path-summer.png"
import "./demo.css"
import "./editor.css"

/**
 * Level editor: paint the map with the pack pictures, set the scene and the blocks, see what keeps the level from
 * being played, try it in the trainer and copy it into `src/levels/index.ts`. The work is kept in this browser.
 */

const STORE = "eb-editor-level"

type Tool = MapTile | PropKind | "npc" | "enemy"

const TILE_TOOLS: ReadonlyArray<{ readonly tool: MapTile; readonly name: string }> = [
  { tool: "floor", name: "Стежка" },
  { tool: "wall", name: "Стіна" },
  { tool: "item", name: "Предмет" },
  { tool: "finish", name: "Мета" },
  { tool: "start", name: "Старт" }
]

const PROP_TOOLS: ReadonlyArray<{ readonly tool: PropKind; readonly name: string }> = [
  { tool: "house", name: "Хата" },
  { tool: "woodshed", name: "Дровітня" }
]

const PEOPLE: ReadonlyArray<{ readonly id: NpcKind; readonly name: string }> = [
  { id: "grandpa", name: "Дід" },
  { id: "boy", name: "Хлопчик" },
  { id: "girl", name: "Дівчинка" },
  { id: "kid", name: "Малий у шубі" },
  { id: "villager", name: "Сусід" },
  { id: "hunter", name: "Мисливець" }
]

const MONSTERS: ReadonlyArray<{ readonly id: EnemyKind; readonly name: string }> = [
  { id: "slime", name: "Слиз" },
  { id: "spirit", name: "Сніговий дух" },
  { id: "goblin", name: "Гоблін" },
  { id: "skull", name: "Череп" },
  { id: "flame", name: "Вогник" },
  { id: "bear", name: "Ведмідь" },
  { id: "toad", name: "Жаба" }
]

const WALKS: ReadonlyArray<{ readonly id: EnemyWalk; readonly name: string }> = [
  { id: "stand", name: "стоїть" },
  { id: "across", name: "ходить ліворуч-праворуч" },
  { id: "updown", name: "ходить вгору-вниз" }
]

/** The most hit points and sight the editor offers. */
const MAX_HP = 9
const MAX_SIGHT = 12

const OTHER_BLOCKS: ReadonlyArray<{ readonly name: BlockName; readonly text: string }> = [
  { name: "repeat", text: "повторити N" },
  { name: "repeatUntil", text: "повторити до" },
  { name: "forever", text: "завжди" },
  { name: "if", text: "якщо … то" },
  { name: "ifElse", text: "якщо … інакше" },
  { name: "not", text: "не" },
  { name: "and", text: "і" },
  { name: "or", text: "або" }
]

const ALL_BLOCKS: ReadonlyArray<{ readonly name: BlockName; readonly text: string }> = [
  ...HERO_BLOCKS.map((b) => ({ name: b.name, text: b.text })),
  ...OTHER_BLOCKS
]

const ITEMS: ReadonlyArray<{ readonly id: ItemKind; readonly name: string }> = [
  { id: "crystal", name: "Кристали" },
  { id: "wood", name: "Дрова" },
  { id: "apple", name: "Яблука" },
  { id: "fish", name: "Риба" },
  { id: "key", name: "Ключ" },
  { id: "campfire", name: "Вогнища" }
]

const FINISHES: ReadonlyArray<{ readonly id: FinishKind; readonly name: string }> = [
  { id: "flag", name: "Прапорець" },
  { id: "well", name: "Криниця" },
  { id: "grandma", name: "Бабуся" },
  { id: "home", name: "Дім" }
]

const DIRECTIONS: ReadonlyArray<{ readonly id: Direction; readonly name: string }> = [
  { id: "right", name: "праворуч →" },
  { id: "down", name: "вниз ↓" },
  { id: "left", name: "ліворуч ←" },
  { id: "up", name: "вгору ↑" }
]

const blank = (): Level => ({
  id: "my-level",
  grade: 3,
  tier: "intro",
  title: "Новий рівень",
  task: ["Візьми всі предмети."],
  map: setTile(setTile(setTile(emptyMap(8, 5), 2, 1, "floor"), 3, 1, "floor"), 4, 1, "item"),
  blocks: ["move", "collect"],
  goals: [{ type: "crystals" }],
  stars: { three: 4, two: 6 },
  hint: "",
  scene: { theme: "summer", ground: "path", item: "crystal", finish: "flag", props: [] }
})

const load = (): Level => {
  try {
    const raw = localStorage.getItem(STORE)
    return raw === null ? blank() : (JSON.parse(raw) as Level)
  } catch {
    return blank()
  }
}

/** Optional fields left empty are dropped, so the code reads as the levels in the library. */
const tidy = (level: Level): Level => {
  const { hint, enemies, hearts, ...rest } = level
  return {
    ...rest,
    ...(hint === undefined || hint.trim() === "" ? {} : { hint }),
    ...(enemies === undefined || enemies.length === 0 ? {} : { enemies }),
    ...(hearts === undefined || enemies === undefined || enemies.length === 0 ? {} : { hearts })
  }
}

/** Every cell inside the border becomes floor; the start, the finish and the items stay. */
const openGlade = (map: Level["map"]): Level["map"] =>
  map.map((row, y) =>
    [...row].map((sign, x) => (y === 0 || x === 0 || y === map.length - 1 || x === row.length - 1 || sign !== "#" ? sign : ".")).join("")
  )

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))

const Icon = ({ tool, item, who, monster }: { readonly tool: Tool; readonly item: ItemKind; readonly who: NpcKind; readonly monster: EnemyKind }) => {
  if (tool === "enemy")
    return <span className="ed-icon ed-icon-sheet" style={{ backgroundImage: `url(${ENEMIES[monster]})`, backgroundSize: "96px 96px" }} />
  if (tool === "npc")
    return (
      <span className="ed-icon ed-icon-sheet" style={{ backgroundImage: `url(${NPCS[who]})`, backgroundSize: "96px 168px" }} />
    )
  // Sheets show one 16×16 frame at 24 px: the hero looking down, the flag, the middle of the path.
  if (tool === "start")
    return (
      <span className="ed-icon ed-icon-sheet" style={{ backgroundImage: `url(${ninjaSheet})`, backgroundSize: "96px 168px" }} />
    )
  if (tool === "finish")
    return (
      <span className="ed-icon ed-icon-sheet" style={{ backgroundImage: `url(${flagStrip})`, backgroundSize: "96px 24px" }} />
    )
  if (tool === "floor")
    return (
      <span
        className="ed-icon ed-icon-sheet"
        style={{ backgroundImage: `url(${pathSheet})`, backgroundSize: "264px 144px", backgroundPosition: "-24px -24px" }}
      />
    )
  const href =
    tool === "wall"
      ? bushTile
      : tool === "item"
        ? ITEM_TILES[item]
        : tool === "house" || tool === "woodshed"
          ? PROPS[tool].href
          : null
  return href === null ? null : <img className="ed-icon" src={href} alt="" />
}

/** The map with the real field under it; a grid of cells on top takes the clicks. */
const MapCanvas = ({
  level,
  tool,
  onPaint
}: {
  readonly level: Level
  readonly tool: Tool
  readonly onPaint: (x: number, y: number) => void
}) => {
  const painting = useRef(false)
  const world = useMemo(() => startWorld(level), [level])
  const { view } = buildScenery(world)
  useEffect(() => {
    const stop = () => {
      painting.current = false
    }
    window.addEventListener("pointerup", stop)
    return () => window.removeEventListener("pointerup", stop)
  }, [])
  const dragPaints = tool !== "house" && tool !== "woodshed" && tool !== "start" && tool !== "finish" && tool !== "npc" && tool !== "enemy"
  return (
    <div className="ed-map" style={{ aspectRatio: `${view.width} / ${view.height}` }}>
      <Field world={world} skin="ninja" scene={level.scene} />
      <div
        className="ed-grid"
        style={{
          left: `${(-view.x / view.width) * 100}%`,
          top: `${(-view.y / view.height) * 100}%`,
          width: `${(world.width / view.width) * 100}%`,
          height: `${(world.height / view.height) * 100}%`,
          gridTemplateColumns: `repeat(${world.width}, 1fr)`
        }}
      >
        {Array.from({ length: world.width * world.height }, (_, i) => {
          const x = i % world.width
          const y = Math.floor(i / world.width)
          return (
            <button
              key={i}
              type="button"
              className="ed-cell"
              aria-label={`Клітинка ${x + 1}, ${y + 1}`}
              onPointerDown={(e) => {
                e.preventDefault()
                painting.current = dragPaints
                onPaint(x, y)
              }}
              onPointerEnter={() => {
                if (painting.current) onPaint(x, y)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const Issues = ({ level }: { readonly level: Level }) => {
  const issues = checkLevel(level)
  const route = plainRoute(level)
  return (
    <section className="ed-card" aria-live="polite">
      <h2>Перевірка</h2>
      {issues.length === 0 && <p className="ed-ok">Рівень можна грати, зауважень немає.</p>}
      <ul className="ed-issues">
        {issues.map((issue) => (
          <li key={issue.text} className={issue.level === "error" ? "ed-error" : "ed-warning"}>
            {issue.level === "error" ? "Помилка: " : "Порада: "}
            {issue.text}
          </li>
        ))}
      </ul>
      {route !== null && (
        <p className="ed-note">
          Простий розв'язок без циклів: {route.length} блоків. Межі зірок краще ставити за найкращим розв'язком: натисни
          «Спробувати» і склади його.
        </p>
      )}
    </section>
  )
}

/** The enemies on the map, each with its own settings. */
const Enemies = ({ level, onChange }: { readonly level: Level; readonly onChange: (patch: Partial<Level>) => void }) => {
  const enemies = level.enemies ?? []
  const set = (i: number, patch: Partial<EnemySpec>) =>
    onChange({ enemies: enemies.map((e, j) => (j === i ? { ...e, ...patch } : e)) })
  return (
    <section className="ed-card">
      <h2>Вороги</h2>
      <label>
        Сердечок у героя
        <input
          type="number"
          min={1}
          max={MAX_HP}
          value={level.hearts ?? DEFAULT_HEARTS}
          onChange={(e) => onChange({ hearts: clamp(Number(e.target.value), 1, MAX_HP) })}
        />
      </label>
      {enemies.length === 0 && <p className="ed-note">Вибери інструмент «Ворог» і клацни по стежці. Другий клік прибирає ворога.</p>}
      <ol className="ed-enemies">
        {enemies.map((e, i) => (
          <li key={`${e.x},${e.y}`}>
            <div className="ed-row">
              <span className="ed-icon ed-icon-sheet" style={{ backgroundImage: `url(${ENEMIES[e.kind]})`, backgroundSize: "96px 96px" }} />
              <strong>
                ({e.x}, {e.y})
              </strong>
              <select aria-label="Хто" value={e.kind} onChange={(ev) => set(i, { kind: ev.target.value as EnemyKind })}>
                {MONSTERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onChange({ enemies: enemies.filter((_, j) => j !== i) })}>
                Прибрати
              </button>
            </div>
            <div className="ed-row">
              <label>
                Поки героя не бачить
                <select value={e.walk ?? "stand"} onChange={(ev) => set(i, { walk: ev.target.value as EnemyWalk })}>
                  {WALKS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label title="За скільки клітинок ворог помічає героя й іде до нього. 0 — не йде, б'є лише впритул.">
                Бачить за X клітинок
                <input
                  type="number"
                  min={0}
                  max={MAX_SIGHT}
                  value={e.sight ?? DEFAULT_SIGHT}
                  onChange={(ev) => set(i, { sight: clamp(Number(ev.target.value), 0, MAX_SIGHT) })}
                />
              </label>
              <label>
                Ударів витримує
                <input
                  type="number"
                  min={1}
                  max={MAX_HP}
                  value={e.hp ?? (e.boss === true ? BOSS_HP : 1)}
                  onChange={(ev) => set(i, { hp: clamp(Number(ev.target.value), 1, MAX_HP) })}
                />
              </label>
              <label className="ed-check">
                <input type="checkbox" checked={e.boss === true} onChange={(ev) => set(i, { boss: ev.target.checked })} /> Бос
              </label>
            </div>
          </li>
        ))}
      </ol>
      <p className="ed-note">
        Ворог ходить після кожної дії героя. Коли герой ближче ніж X клітинок, ворог іде до нього, а впритул замахується і
        наступним ходом б'є: мінус сердечко. Бос більший, б'є навіть під ударами.
      </p>
    </section>
  )
}

const Export = ({ level, onImport }: { readonly level: Level; readonly onImport: (level: Level) => void }) => {
  const [format, setFormat] = useState<"ts" | "json">("ts")
  const [copied, setCopied] = useState(false)
  const [paste, setPaste] = useState("")
  const [error, setError] = useState("")
  const text = format === "ts" ? `${levelSource(tidy(level))},` : JSON.stringify(tidy(level), null, 2)
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false)
    )
  }
  const importLevel = () => {
    try {
      const parsed = JSON.parse(paste) as Level
      parseMap(parsed.map, parsed.dir)
      startWorld(parsed)
      onImport(parsed)
      setError("")
      setPaste("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Це не рівень")
    }
  }
  return (
    <section className="ed-card">
      <h2>Експорт</h2>
      <div className="ed-row">
        <label>
          <input type="radio" checked={format === "ts"} onChange={() => setFormat("ts")} /> Код для levels/index.ts
        </label>
        <label>
          <input type="radio" checked={format === "json"} onChange={() => setFormat("json")} /> JSON
        </label>
        <button type="button" onClick={copy}>
          {copied ? "Скопійовано" : "Копіювати"}
        </button>
      </div>
      <textarea className="ed-code" readOnly value={text} rows={10} onFocus={(e) => e.currentTarget.select()} />
      <h2>Імпорт JSON</h2>
      <textarea
        className="ed-code"
        value={paste}
        rows={3}
        placeholder="Встав JSON рівня"
        onChange={(e) => setPaste(e.target.value)}
      />
      <div className="ed-row">
        <button type="button" onClick={importLevel} disabled={paste.trim() === ""}>
          Відкрити
        </button>
        {error !== "" && <span className="ed-error">{error}</span>}
      </div>
    </section>
  )
}

const Editor = () => {
  const [level, setLevel] = useState<Level>(load)
  const [tool, setTool] = useState<Tool>("floor")
  const [who, setWho] = useState<NpcKind>("grandpa")
  const [monster, setMonster] = useState<EnemyKind>("slime")
  const [playing, setPlaying] = useState(false)
  const [lastRun, setLastRun] = useState<BlocksReport | null>(null)
  const scene: Scene = level.scene ?? {}
  const width = level.map[0]?.length ?? 0
  const height = level.map.length
  const errors = checkLevel(level).some((i) => i.level === "error")

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(level))
    } catch {
      // Private mode: the editor just forgets.
    }
  }, [level])

  const update = (patch: Partial<Level>) => setLevel((l) => ({ ...l, ...patch }))
  const updateScene = (patch: Partial<Scene>) => setLevel((l) => ({ ...l, scene: { ...l.scene, ...patch } }))

  const paint = (x: number, y: number) => {
    if (tool === "house" || tool === "woodshed") {
      const look = PROPS[tool]
      // The door of a house opens onto the clicked cell.
      const prop = { kind: tool, x: x - (tool === "house" ? 1.5 : 1), y: y - look.height }
      setLevel((l) => ({ ...l, scene: { ...l.scene, props: [...(l.scene?.props ?? []), prop] } }))
      return
    }
    if (tool === "npc") {
      // A second click on a villager takes them away.
      setLevel((l) => {
        const npcs = l.scene?.npcs ?? []
        const here = npcs.some((n) => n.x === x && n.y === y)
        return { ...l, scene: { ...l.scene, npcs: here ? npcs.filter((n) => n.x !== x || n.y !== y) : [...npcs, { who, x, y }] } }
      })
      return
    }
    if (tool === "enemy") {
      setLevel((l) => {
        const enemies = l.enemies ?? []
        const here = enemies.some((e) => e.x === x && e.y === y)
        return { ...l, enemies: here ? enemies.filter((e) => e.x !== x || e.y !== y) : [...enemies, { kind: monster, x, y }] }
      })
      return
    }
    setLevel((l) => ({ ...l, map: setTile(l.map, x, y, tool) }))
  }

  const toggle = <T,>(list: ReadonlyArray<T>, value: T, on: boolean): ReadonlyArray<T> =>
    on ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value)

  const goalOn = (type: Goal["type"]) => level.goals.some((g) => g.type === type)
  const setGoal = (type: Goal["type"], on: boolean) =>
    update({ goals: on ? [...level.goals.filter((g) => g.type !== type), { type }] : level.goals.filter((g) => g.type !== type) })

  return (
    <div className={playing ? "ed ed-playing" : "ed"}>
      <header className="demo-head">
        <strong>Редактор рівнів</strong>
        <a className="ed-link" href="./">
          ← До гри
        </a>
        <label>
          <span className="demo-visually-hidden">Відкрити рівень з бібліотеки</span>
          <select
            value=""
            onChange={(e) => {
              const found = levels.find((l) => l.id === e.target.value)
              if (found !== undefined) setLevel({ ...found, id: `${found.id}-copy` })
            }}
          >
            <option value="">Відкрити рівень з бібліотеки…</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.grade} клас · {l.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="demo-skin" onClick={() => setLevel(blank())}>
          Новий
        </button>
        <button
          type="button"
          className="demo-skin demo-skin-on"
          onClick={() => setPlaying((p) => !p)}
          disabled={!playing && errors}
        >
          {playing ? "← Редагувати" : "Спробувати ▶"}
        </button>
      </header>
      {playing ? (
        <main className="demo-main">
          {lastRun !== null && lastRun.passed && (
            <div className="ed-banner">
              Пройдено за {lastRun.blocks} блоків.{" "}
              <button
                type="button"
                onClick={() => {
                  update({ stars: { three: lastRun.blocks, two: lastRun.blocks + Math.max(2, Math.ceil(lastRun.blocks / 2)) } })
                  setPlaying(false)
                }}
              >
                Взяти це як межу трьох зірок
              </button>
            </div>
          )}
          <EduBlocks key={JSON.stringify(level)} level={level} onComplete={setLastRun} />
        </main>
      ) : (
        <main className="ed-main">
          <section className="ed-stage">
            <div className="ed-tools" role="toolbar" aria-label="Чим малювати">
              {[...TILE_TOOLS, ...PROP_TOOLS].map((t) => (
                <button
                  key={t.tool}
                  type="button"
                  className={tool === t.tool ? "ed-tool ed-tool-on" : "ed-tool"}
                  onClick={() => setTool(t.tool)}
                  aria-pressed={tool === t.tool}
                >
                  <Icon tool={t.tool} item={scene.item ?? "crystal"} who={who} monster={monster} />
                  {t.name}
                </button>
              ))}
              <span className={tool === "npc" ? "ed-tool ed-tool-on" : "ed-tool"}>
                <button type="button" className="ed-tool-plain" onClick={() => setTool("npc")} aria-pressed={tool === "npc"}>
                  <Icon tool="npc" item={scene.item ?? "crystal"} who={who} monster={monster} />
                  Людина
                </button>
                <select
                  aria-label="Хто"
                  value={who}
                  onChange={(e) => {
                    const found = PEOPLE.find((p) => p.id === e.target.value)
                    if (found !== undefined) setWho(found.id)
                    setTool("npc")
                  }}
                >
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </span>
              <span className={tool === "enemy" ? "ed-tool ed-tool-on" : "ed-tool"}>
                <button type="button" className="ed-tool-plain" onClick={() => setTool("enemy")} aria-pressed={tool === "enemy"}>
                  <Icon tool="enemy" item={scene.item ?? "crystal"} who={who} monster={monster} />
                  Ворог
                </button>
                <select
                  aria-label="Який ворог"
                  value={monster}
                  onChange={(e) => {
                    const found = MONSTERS.find((m) => m.id === e.target.value)
                    if (found !== undefined) setMonster(found.id)
                    setTool("enemy")
                  }}
                >
                  {MONSTERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </span>
              <button type="button" className="ed-tool" onClick={() => updateScene({ props: [], npcs: [] })}>
                Прибрати будинки й людей
              </button>
              <button type="button" className="ed-tool" onClick={() => update({ enemies: [] })}>
                Прибрати ворогів
              </button>
            </div>
            <MapCanvas level={level} tool={tool} onPaint={paint} />
            <p className="ed-note">
              Клацни або веди мишею по клітинках. Стіни стають деревами й кущами, луг навколо малюється сам. Хату ставлять дверима
              на клітинку, по якій клацнули. Людей краще ставити на стіну біля стежки, другий клік прибирає людину. Ворогів ставлять
              на стежку, а налаштовують праворуч, у картці «Вороги».
            </p>
            <Issues level={level} />
          </section>
          <aside className="ed-side">
            <section className="ed-card">
              <h2>Рівень</h2>
              <label>
                Назва
                <input value={level.title} onChange={(e) => update({ title: e.target.value })} />
              </label>
              <label>
                Ідентифікатор
                <input value={level.id} onChange={(e) => update({ id: e.target.value.replace(/[^\w-]/g, "") })} />
              </label>
              <div className="ed-row">
                <label>
                  Клас
                  <select value={level.grade} onChange={(e) => update({ grade: Number(e.target.value) as Level["grade"] })}>
                    {[3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Складність
                  <select value={level.tier ?? "intro"} onChange={(e) => update({ tier: e.target.value as Tier })}>
                    <option value="intro">знайомство</option>
                    <option value="practice">практика</option>
                    <option value="challenge">виклик</option>
                  </select>
                </label>
              </div>
              <label>
                Завдання (кожен рядок окремо)
                <textarea rows={3} value={level.task.join("\n")} onChange={(e) => update({ task: e.target.value.split("\n") })} />
              </label>
              <label>
                Підказка після невдачі
                <textarea rows={2} value={level.hint ?? ""} onChange={(e) => update({ hint: e.target.value })} />
              </label>
            </section>
            <section className="ed-card">
              <h2>Мапа</h2>
              <div className="ed-row">
                <label>
                  Ширина
                  <input
                    type="number"
                    min={MAP_LIMITS.min}
                    max={MAP_LIMITS.max}
                    value={width}
                    onChange={(e) => update({ map: resizeMap(level.map, Number(e.target.value), height) })}
                  />
                </label>
                <label>
                  Висота
                  <input
                    type="number"
                    min={MAP_LIMITS.min}
                    max={MAP_LIMITS.max}
                    value={height}
                    onChange={(e) => update({ map: resizeMap(level.map, width, Number(e.target.value)) })}
                  />
                </label>
                <label>
                  Герой дивиться
                  <select value={level.dir ?? "right"} onChange={(e) => update({ dir: e.target.value as Direction })}>
                    {DIRECTIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="button" onClick={() => update({ map: openGlade(level.map) })}>
                Галявина: усе всередині — вільне місце
              </button>
            </section>
            <section className="ed-card">
              <h2>Сцена</h2>
              <div className="ed-row">
                <label>
                  Пора року
                  <select
                    value={scene.theme ?? "summer"}
                    onChange={(e) => updateScene({ theme: e.target.value === "winter" ? "winter" : "summer" })}
                  >
                    <option value="summer">літо</option>
                    <option value="winter">зима</option>
                  </select>
                </label>
                <label>
                  Підлога
                  <select
                    value={scene.ground ?? "path"}
                    onChange={(e) =>
                      updateScene({ ground: e.target.value === "ice" ? "ice" : e.target.value === "bridge" ? "bridge" : "path" })
                    }
                  >
                    <option value="path">стежка</option>
                    <option value="ice">лід ставка</option>
                    <option value="bridge">міст над водою</option>
                  </select>
                </label>
              </div>
              <div className="ed-row">
                <label>
                  Предмети
                  <select value={scene.item ?? "crystal"} onChange={(e) => updateScene({ item: e.target.value as ItemKind })}>
                    {ITEMS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Мета
                  <select value={scene.finish ?? "flag"} onChange={(e) => updateScene({ finish: e.target.value as FinishKind })}>
                    {FINISHES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            <section className="ed-card">
              <h2>Що треба зробити</h2>
              <label className="ed-check">
                <input type="checkbox" checked={goalOn("crystals")} onChange={(e) => setGoal("crystals", e.target.checked)} />{" "}
                Зібрати всі предмети
              </label>
              <label className="ed-check">
                <input type="checkbox" checked={goalOn("finish")} onChange={(e) => setGoal("finish", e.target.checked)} /> Дійти
                до мети
              </label>
              <label className="ed-check">
                <input type="checkbox" checked={goalOn("enemies")} onChange={(e) => setGoal("enemies", e.target.checked)} />{" "}
                Перемогти всіх ворогів
              </label>
              <h2>Блоки в палітрі</h2>
              <div className="ed-blocks">
                {ALL_BLOCKS.map((b) => (
                  <label key={b.name} className="ed-check">
                    <input
                      type="checkbox"
                      checked={level.blocks.includes(b.name)}
                      onChange={(e) => update({ blocks: toggle(level.blocks, b.name, e.target.checked) })}
                    />{" "}
                    {b.text}
                  </label>
                ))}
              </div>
              <h2>Зірки</h2>
              <label className="ed-check">
                <input
                  type="checkbox"
                  checked={level.stars !== undefined}
                  onChange={(e) =>
                    setLevel(({ stars: _stars, ...rest }) => (e.target.checked ? { ...rest, stars: { three: 4, two: 6 } } : rest))
                  }
                />{" "}
                Рахувати блоки
              </label>
              {level.stars !== undefined && (
                <div className="ed-row">
                  <label>
                    ★★★ до блоків
                    <input
                      type="number"
                      min={1}
                      value={level.stars.three}
                      onChange={(e) => update({ stars: { three: Number(e.target.value), two: level.stars?.two ?? 0 } })}
                    />
                  </label>
                  <label>
                    ★★ до блоків
                    <input
                      type="number"
                      min={1}
                      value={level.stars.two}
                      onChange={(e) => update({ stars: { three: level.stars?.three ?? 0, two: Number(e.target.value) } })}
                    />
                  </label>
                </div>
              )}
            </section>
            <Enemies level={level} onChange={update} />
            <Export level={level} onImport={setLevel} />
          </aside>
        </main>
      )}
    </div>
  )
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
createRoot(rootEl).render(
  <StrictMode>
    <Editor />
  </StrictMode>
)
