import { StrictMode, useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { HERO_BLOCKS } from "../core/blocks.ts"
import { checkLevel, emptyMap, type Issue, MAP_LIMITS, type MapTile, plainRoute, resizeMap, setTile } from "../core/kit.ts"
import { paletteIssues } from "../core/solve.ts"
import { storyIssues } from "../core/story.ts"
import { type BlockName, type FinishKind, type Goal, type ItemKind, type Level, type NpcKind, type PropKind, type Scene, type Season } from "../core/level.ts"
import { AssetBrowser, Thumb } from "./editor/AssetBrowser.tsx"
import { type Brush, paint, erase } from "./editor/edit.ts"
import { useHistory } from "./editor/history.ts"
import { MapCanvas } from "./editor/MapCanvas.tsx"
import { clamp, Enemies, Export, MONSTERS } from "./editor/cards.tsx"
import { findSprite, SpritesCard, useLevelPacks } from "./editor/SpritesCard.tsx"
import type { Direction, EnemyKind } from "../core/world.ts"
import type { Tier } from "../core/xp.ts"
import { levels } from "../levels/index.ts"
import { chapterOf } from "../levels/chapters.ts"
import { type BlocksReport, EduBlocks } from "../ui/EduBlocks.tsx"
import { ENEMIES, ITEM_TILES, NPCS, PROPS } from "../ui/look.ts"
import bushTile from "../ui/sprites/bush.png"
import flagStrip from "../ui/sprites/flag.png"
import ninjaSheet from "../ui/sprites/ninja.png"
import pathSheet from "../ui/sprites/path-summer.png"
import "./demo.css"
import "./editor.css"

/**
 * Level editor: paint the map, place pictures from every asset pack (decor, tiles, houses, animals, the looks of
 * enemies, villagers, items and the goal), set the scene and the blocks, see what keeps the level from being played
 * or where its text and its field disagree, try it in the trainer and copy it into `src/levels/index.ts`. The left
 * button paints, the right button erases; Ctrl+Z undoes. The work is kept in this browser.
 */

const STORE = "eb-editor-level"
/** The largest step limit the editor offers. */
const MAX_STEP_LIMIT = 200

type Tool = MapTile | PropKind | "npc" | "enemy" | "erase"

const TILE_TOOLS: ReadonlyArray<{ readonly tool: MapTile; readonly name: string }> = [
  { tool: "floor", name: "Стежка" },
  { tool: "wall", name: "Стіна" },
  { tool: "item", name: "Предмет" },
  { tool: "trap", name: "Пастка" },
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

const OTHER_BLOCKS: ReadonlyArray<{ readonly name: BlockName; readonly text: string }> = [
  { name: "repeat", text: "повторити N" },
  { name: "repeatUntil", text: "повторити до" },
  { name: "forever", text: "завжди" },
  { name: "if", text: "якщо … то" },
  { name: "ifElse", text: "якщо … інакше" },
  { name: "not", text: "не" },
  { name: "and", text: "і" },
  { name: "or", text: "або" },
  { name: "counter", text: "лічильник" },
  { name: "procedure", text: "свій блок «мій блок»" }
]

const ALL_BLOCKS: ReadonlyArray<{ readonly name: BlockName; readonly text: string }> = [
  ...HERO_BLOCKS.map((b) => ({ name: b.name, text: b.text })),
  ...OTHER_BLOCKS
]

const SEASONS: ReadonlyArray<{ readonly id: Season; readonly name: string }> = [
  { id: "spring", name: "весна (дощ)" },
  { id: "summer", name: "літо" },
  { id: "autumn", name: "осінь (листопад)" },
  { id: "winter", name: "зима (сніг)" }
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

/** Every cell inside the border becomes floor; the start, the finish and the items stay. */
const openGlade = (map: Level["map"]): Level["map"] =>
  map.map((row, y) =>
    [...row].map((sign, x) => (y === 0 || x === 0 || y === map.length - 1 || x === row.length - 1 || sign !== "#" ? sign : ".")).join("")
  )

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
  if (tool === "trap") return <span className="ed-icon ed-icon-trap" aria-hidden="true" />
  if (tool === "erase") return <span className="ed-icon ed-icon-erase" aria-hidden="true" />
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

/** The checks of the level; whether the palette can pass it only once the map itself has no errors. */
const levelIssues = (level: Level): ReadonlyArray<Issue> => {
  const issues = checkLevel(level)
  return issues.some((i) => i.level === "error") ? issues : [...issues, ...paletteIssues(level)]
}

const Issues = ({ level }: { readonly level: Level }) => {
  const issues = [...levelIssues(level), ...storyIssues(level)]
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
const ERASE_TOOL: { readonly tool: Tool; readonly name: string } = { tool: "erase", name: "Гумка" }

/** The toolbar button that stands for a brush; pictures from the packs have none. */
const toolOf = (brush: Brush): Tool | null => {
  switch (brush.kind) {
    case "tile":
      return brush.tile
    case "prop":
      return brush.prop
    case "npc":
      return brush.look === undefined ? "npc" : null
    case "enemy":
      return brush.look === undefined ? "enemy" : null
    case "erase":
      return "erase"
    case "sprite":
      return null
  }
}

const brushOf = (tool: Tool, who: NpcKind, monster: EnemyKind): Brush => {
  if (tool === "erase") return { kind: "erase" }
  if (tool === "npc") return { kind: "npc", who }
  if (tool === "enemy") return { kind: "enemy", monster }
  if (tool === "house" || tool === "woodshed") return { kind: "prop", prop: tool }
  return { kind: "tile", tile: tool }
}

/** What the brush from the asset library puts on the map. */
const BrushNote = ({ brush, level }: { readonly brush: Brush; readonly level: Level }) => {
  const ref = brush.kind === "sprite" ? brush.asset : "look" in brush ? brush.look : undefined
  const packs = useLevelPacks({ ...level, scene: { ...level.scene, sprites: ref === undefined ? [] : [{ asset: ref, x: 0, y: 0 }] } })
  const found = ref === undefined ? null : findSprite(packs, ref)
  const what =
    brush.kind === "enemy"
      ? "ворога з таким виглядом (на стежку)"
      : brush.kind === "npc"
        ? "людину чи тварину, що стоїть (краще на стіну біля стежки)"
        : brush.kind === "sprite" && brush.tiles !== undefined
          ? `плитки ${brush.tiles[2]}×${brush.tiles[3]} від лівого верхнього кута клітинки`
          : "картинку на клітинку"
  return (
    <p className="ed-brush">
      {found !== null && <Thumb pack={found.pack} sprite={found.sprite} box={28} />}
      Пензель: <strong>{found?.sprite.name ?? ref}</strong> — {what}.
    </p>
  )
}

const Editor = () => {
  const history = useHistory<Level>(load)
  const level = history.value
  const setLevel = history.set
  const [brush, setBrush] = useState<Brush>({ kind: "tile", tile: "floor" })
  const [who, setWho] = useState<NpcKind>("grandpa")
  const [monster, setMonster] = useState<EnemyKind>("slime")
  const tool = toolOf(brush)
  const setTool = (next: Tool) => setBrush(brushOf(next, who, monster))
  const [playing, setPlaying] = useState(false)
  const [lastRun, setLastRun] = useState<BlocksReport | null>(null)
  const scene: Scene = level.scene ?? {}
  const width = level.map[0]?.length ?? 0
  const height = level.map.length
  const errors = useMemo(() => levelIssues(level).some((i) => i.level === "error"), [level])

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(level))
    } catch {
      // Private mode: the editor just forgets.
    }
  }, [level])

  const update = (patch: Partial<Level>) => setLevel((l) => ({ ...l, ...patch }))
  const updateScene = (patch: Partial<Scene>) => setLevel((l) => ({ ...l, scene: { ...l.scene, ...patch } }))

  const onCell = (x: number, y: number, erasing: boolean) => history.amend((l) => (erasing ? erase(l, x, y) : paint(l, brush, x, y)))

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
                {chapterOf(l.id)?.title ?? ""} · {l.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="demo-skin" onClick={() => setLevel(blank())}>
          Новий
        </button>
        <button type="button" className="demo-skin" onClick={history.undo} disabled={!history.canUndo} title="Ctrl+Z">
          ↶ Назад
        </button>
        <button type="button" className="demo-skin" onClick={history.redo} disabled={!history.canRedo} title="Ctrl+Shift+Z">
          ↷ Вперед
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
              {[...TILE_TOOLS, ...PROP_TOOLS, ERASE_TOOL].map((t) => (
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
                    if (found !== undefined) {
                      setWho(found.id)
                      setBrush({ kind: "npc", who: found.id })
                    }
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
                    if (found !== undefined) {
                      setMonster(found.id)
                      setBrush({ kind: "enemy", monster: found.id })
                    }
                  }}
                >
                  {MONSTERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </span>
              <button type="button" className="ed-tool" onClick={() => updateScene({ props: [], npcs: [], sprites: [] })}>
                Прибрати будинки, людей і картинки
              </button>
              <button type="button" className="ed-tool" onClick={() => update({ enemies: [] })}>
                Прибрати ворогів
              </button>
            </div>
            {brush.kind === "sprite" || ("look" in brush && brush.look !== undefined) ? <BrushNote brush={brush} level={level} /> : null}
            <MapCanvas level={level} brush={brush} onStroke={history.begin} onCell={onCell} />
            <p className="ed-note">
              <strong>Ліва кнопка</strong> малює, <strong>права</strong> прибирає те, що зверху: ворога, людину, картинку, хату, а
              предмет, пастку чи мету перетворює на стежку. Веди мишею, щоб малювати стежку, стіни чи плитки. Ctrl+Z скасовує.
              Стіни стають деревами й кущами, луг навколо малюється сам, на ньому теж можна ставити картинки. Хату ставлять дверима
              на клітинку, по якій клацнули. Людей краще ставити на стіну біля стежки. Ворогів ставлять на стежку, а налаштовують
              праворуч, у картці «Вороги».
            </p>
            <Issues level={level} />
          </section>
          <aside className="ed-lib">
            <AssetBrowser level={level} brush={brush} onBrush={setBrush} onLevel={setLevel} />
          </aside>
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
                  Кроків не більше
                  <input
                    type="number"
                    min={0}
                    max={MAX_STEP_LIMIT}
                    value={level.maxSteps ?? 0}
                    title="0 — без обмеження"
                    onChange={(e) => {
                      const n = clamp(Number(e.target.value), 0, MAX_STEP_LIMIT)
                      const { maxSteps: _, ...rest } = level
                      setLevel(n === 0 ? rest : { ...rest, maxSteps: n })
                    }}
                  />
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
                    onChange={(e) => updateScene({ theme: SEASONS.find((x) => x.id === e.target.value)?.id ?? "summer" })}
                  >
                    {SEASONS.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
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
            <SpritesCard level={level} onChange={setLevel} />
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
