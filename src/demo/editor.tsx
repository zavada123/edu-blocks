import { StrictMode, useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { HERO_BLOCKS } from "../core/blocks.ts"
import { checkLevel, emptyMap, type Issue, MAP_LIMITS, type MapTile, plainRoute, resizeMap, setTile } from "../core/kit.ts"
import { paletteIssues } from "../core/solve.ts"
import { storyIssues } from "../core/story.ts"
import { type BlockName, type FinishKind, type Goal, type ItemKind, type Level, type NpcKind, type PropKind, type Scene, type Season } from "../core/level.ts"
import { AssetBrowser, Thumb } from "./editor/AssetBrowser.tsx"
import { type Brush, dragPaints, eraseWith, paint } from "./editor/edit.ts"
import { GroundCard } from "./editor/GroundCard.tsx"
import { useHistory } from "./editor/history.ts"
import { type CellBox, MapCanvas, type Marks, type PointerInfo } from "./editor/MapCanvas.tsx"
import { type Aim, Inspector } from "./editor/Inspector.tsx"
import { LayersCard } from "./editor/LayersCard.tsx"
import { type LayerId, layerOfBrush, layerOfSelection, type LayerState, NO_LAYERS, visibleScene } from "./editor/layers.ts"
import { addRoutePoint, cellOfSelection, dropRoutePoint, moveSelected, pick, removeSelected, type Selection, stillThere, tidyLinks, toggleLink } from "./editor/select.ts"
import { WorldMap } from "./editor/WorldMap.tsx"
import { copyPatch, type Patch, pastePatch, patchEmpty } from "./editor/stamp.ts"
import { boxCells, fillCells, fillsArea, pickBrush, type Shape } from "./editor/tools.ts"
import { fieldIssues, PEOPLE } from "./editor/fields.ts"
import { clamp, Enemies, Export, MONSTERS } from "./editor/cards.tsx"
import { findSprite, SpritesCard, useLevelPacks } from "./editor/SpritesCard.tsx"
import type { Cell, Direction, EnemyKind } from "../core/world.ts"
import type { Tier } from "../core/xp.ts"
import { levels } from "../levels/index.ts"
import { farmMockup } from "./farm-mockup.ts"
import { chapterOf } from "../levels/chapters.ts"
import { type BlocksReport, EduBlocks } from "../ui/EduBlocks.tsx"
import { ArtIcon } from "../ui/ArtIcon.tsx"
import { ENEMY_ART, FINISH_ART, GROUND_ART, HERO_ART, ITEM_ART, NPC_ART, OBSTACLE_ART, PROP_ART } from "../ui/art.ts"
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

type Tool = MapTile | PropKind | "npc" | "enemy" | "erase" | "select"

const TILE_TOOLS: ReadonlyArray<{ readonly tool: MapTile; readonly name: string }> = [
  { tool: "floor", name: "Стежка" },
  { tool: "wall", name: "Стіна" },
  { tool: "item", name: "Предмет" },
  { tool: "trap", name: "Пастка" },
  { tool: "finish", name: "Мета" },
  { tool: "storehouse", name: "Склад" },
  { tool: "lever", name: "Важіль" },
  { tool: "leverOn", name: "Важіль увімк." },
  { tool: "gate", name: "Ворота" },
  { tool: "start", name: "Старт" }
]

const PROP_TOOLS: ReadonlyArray<{ readonly tool: PropKind; readonly name: string }> = [
  { tool: "house", name: "Хата" },
  { tool: "woodshed", name: "Дровітня" },
  { tool: "appleTree", name: "Ялинка" }
]

const isPropTool = (tool: Tool): tool is PropKind => PROP_TOOLS.some((p) => p.tool === tool)


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
  ...HERO_BLOCKS.map((b) => ({ name: b.name, text: b.text.replace("[ITEM]", "‹річ›") })),
  ...OTHER_BLOCKS
]

const SEASONS: ReadonlyArray<{ readonly id: Season; readonly name: string }> = [
  { id: "spring", name: "весна (дощ)" },
  { id: "summer", name: "літо" },
  { id: "autumn", name: "осінь (листопад)" },
  { id: "winter", name: "зима (сніг)" }
]

const ITEMS: ReadonlyArray<{ readonly id: ItemKind; readonly name: string }> = [
  { id: "crystal", name: "Золото" },
  { id: "wood", name: "Дрова" },
  { id: "apple", name: "Гриби" },
  { id: "fish", name: "М'ясо" },
  { id: "key", name: "Стріла" },
  { id: "campfire", name: "Вогнища" },
  { id: "carrot", name: "Гарбузи" },
  { id: "egg", name: "Ягнята" }
]

const FINISHES: ReadonlyArray<{ readonly id: FinishKind; readonly name: string }> = [
  { id: "flag", name: "Вказівник" },
  { id: "well", name: "Джерело" },
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
  if (tool === "trap") return <span className="ed-icon ed-icon-trap" aria-hidden="true" />
  if (tool === "erase") return <span className="ed-icon ed-icon-erase" aria-hidden="true" />
  if (tool === "select") return <span className="ed-icon ed-icon-select" aria-hidden="true">➚</span>
  const id =
    tool === "enemy"
      ? ENEMY_ART[monster]
      : tool === "npc"
        ? NPC_ART[who].id
        : tool === "start"
          ? HERO_ART.ninja
          : tool === "finish"
            ? (FINISH_ART.flag?.id ?? GROUND_ART)
            : tool === "floor"
              ? GROUND_ART
              : tool === "wall"
                ? OBSTACLE_ART.bush.id
                : tool === "item"
                  ? ITEM_ART[item].id
                  : isPropTool(tool)
                    ? PROP_ART[tool].id
                    : null
  return id === null ? null : <ArtIcon id={id} className="ed-icon" size={24} />
}

/** The checks of the level; whether the palette can pass it only once the map itself has no errors. */
const levelIssues = (level: Level): ReadonlyArray<Issue> => {
  const issues = checkLevel(level)
  return issues.some((i) => i.level === "error") ? issues : [...issues, ...paletteIssues(level)]
}

const Issues = ({ level }: { readonly level: Level }) => {
  const issues = [...levelIssues(level), ...fieldIssues(level), ...storyIssues(level)]
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
const SELECT_TOOL: { readonly tool: Tool; readonly name: string } = { tool: "select", name: "Вибір" }

const SHAPES: ReadonlyArray<{ readonly id: Shape; readonly name: string; readonly hint: string }> = [
  { id: "pen", name: "✎ Олівець", hint: "Малює клітинку під мишею, протяг малює далі" },
  { id: "box", name: "▭ Прямокутник", hint: "Протягни рамку: уся вона заповниться пензлем, права кнопка стирає рамку" },
  { id: "fill", name: "▧ Відро", hint: "Заливає зв'язану ділянку того самого знаку чи тієї самої землі" }
]

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
    case "select":
      return "select"
    case "sprite":
    case "ground":
      return null
  }
}

const brushOf = (tool: Tool, who: NpcKind, monster: EnemyKind): Brush => {
  if (tool === "erase") return { kind: "erase" }
  if (tool === "select") return { kind: "select" }
  if (tool === "npc") return { kind: "npc", who }
  if (tool === "enemy") return { kind: "enemy", monster }
  if (isPropTool(tool)) return { kind: "prop", prop: tool }
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
  /** The world map of the course in place of the level. */
  const [world, setWorld] = useState(false)
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

  const [rawSelection, setSelection] = useState<Selection | null>(null)
  const selection = stillThere(level, rawSelection)
  const [aim, setAim] = useState<Aim>(null)
  const [shape, setShape] = useState<Shape>("pen")
  const [layers, setLayers] = useState<LayerState>(NO_LAYERS)
  const [box, setBox] = useState<CellBox | null>(null)
  /** The stamp: on or off, and the piece it lays (null until a frame is drawn). It stays when another level opens. */
  const [stamp, setStamp] = useState<{ readonly on: boolean; readonly patch: Patch | null }>({ on: false, patch: null })
  /** What the press now under way does as the mouse moves on. */
  const press = useRef<
    | { readonly kind: "paint"; readonly drag: boolean }
    | { readonly kind: "move"; readonly selection: Selection; readonly base: Level; readonly from: Cell }
    | { readonly kind: "box" }
    | { readonly kind: "copy" }
    | null
  >(null)
  const open = (layer: LayerId) => !layers.locked.has(layer)
  const brushOpen = (b: Brush) => {
    const layer = layerOfBrush(b)
    return layer === null || open(layer)
  }
  /** One cell of a stroke, a box or a fill: the brush or the eraser, and the links of gates kept in order. */
  const apply = (l: Level, c: Cell, erasing: boolean): Level =>
    tidyLinks(erasing ? eraseWith(l, brush, c.x, c.y, open) : brushOpen(brush) ? paint(l, brush, c.x, c.y) : l)

  const pickAt = (cell: Cell) => {
    const found = pick(level, cell.x, cell.y)
    return found !== null && open(layerOfSelection(found, level.scene?.sprites)) ? found : null
  }

  const eyedrop = (cell: Cell) => {
    const next = pickBrush(level, cell.x, cell.y)
    if (next === null) return
    if (next.kind === "npc") setWho(next.who)
    if (next.kind === "enemy") setMonster(next.monster)
    setBrush(next)
  }

  const onDown = (cell: Cell, info: PointerInfo) => {
    press.current = null
    if (info.alt) return eyedrop(cell)
    if (aim === "route" && selection?.kind === "enemy") {
      const i = selection.index
      return history.set((l) => (info.erase ? dropRoutePoint(l, i) : addRoutePoint(l, i, cell)))
    }
    if (aim === "link" && selection?.kind === "cell") {
      const gate = { x: selection.x, y: selection.y }
      if (!info.erase) history.set((l) => toggleLink(l, gate, cell))
      return
    }
    if (stamp.on) {
      if (info.erase) return setStamp({ on: true, patch: null })
      if (stamp.patch === null) {
        press.current = { kind: "copy" }
        setBox({ x0: cell.x, y0: cell.y, x1: cell.x, y1: cell.y })
        return
      }
      const patch = stamp.patch
      return history.set((l) => tidyLinks(pastePatch(l, patch, cell.x, cell.y)))
    }
    if (brush.kind === "select" && !info.erase) {
      const found = pickAt(cell)
      setSelection(found)
      setAim(null)
      if (found !== null && found.kind !== "cell") {
        history.begin()
        press.current = { kind: "move", selection: found, base: level, from: cell }
      }
      return
    }
    if (shape === "box" && fillsArea(brush)) {
      press.current = { kind: "box" }
      setBox({ x0: cell.x, y0: cell.y, x1: cell.x, y1: cell.y })
      return
    }
    if (shape === "fill" && fillsArea(brush)) {
      const cells = fillCells(level, brush, cell.x, cell.y)
      return history.set((l) => cells.reduce((acc, c) => apply(acc, c, info.erase), l))
    }
    history.begin()
    press.current = { kind: "paint", drag: info.erase || dragPaints(brush) }
    history.amend((l) => apply(l, cell, info.erase))
  }

  const onDrag = (cell: Cell, info: PointerInfo) => {
    const p = press.current
    if (p === null) return
    if (p.kind === "move") history.amend(() => moveSelected(p.base, p.selection, cell, p.from))
    else if (p.kind === "box" || p.kind === "copy") setBox((b) => (b === null ? b : { ...b, x1: cell.x, y1: cell.y }))
    else if (p.drag) history.amend((l) => apply(l, cell, info.erase))
  }

  const onUp = (cell: Cell, info: PointerInfo) => {
    const p = press.current
    press.current = null
    if (p?.kind === "copy" && box !== null) {
      const patch = copyPatch(level, { ...box, x1: cell.x, y1: cell.y })
      setBox(null)
      setStamp({ on: true, patch: patchEmpty(patch) ? null : patch })
      return
    }
    if (p?.kind !== "box" || box === null) return
    const cells = boxCells({ ...box, x1: cell.x, y1: cell.y })
    setBox(null)
    history.set((l) => cells.reduce((acc, c) => apply(acc, c, info.erase), l))
  }

  // Delete takes the selected thing away, Esc stops picking cells and then closes the inspector.
  const keys = useRef({ selection, aim })
  keys.current = { selection, aim }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return
      const { selection: sel, aim: waiting } = keys.current
      if (e.key === "Escape") {
        if (waiting !== null) setAim(null)
        else setSelection(null)
      } else if ((e.key === "Delete" || e.key === "Backspace") && sel !== null) {
        history.set((l) => removeSelected(l, sel))
        setSelection(null)
        setAim(null)
      } else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [history.set])

  const marks: Marks = useMemo(() => {
    const enemies = level.enemies ?? []
    return {
      routes: enemies.flatMap((e, i) =>
        (e.route ?? []).length === 0 ? [] : [{ from: e, points: e.route ?? [], active: selection?.kind === "enemy" && selection.index === i }]
      ),
      links: (level.links ?? []).flatMap((l) =>
        l.levers.map((lever) => ({
          gate: l.gate,
          lever,
          active:
            selection?.kind === "cell" &&
            ((selection.x === l.gate.x && selection.y === l.gate.y) || (selection.x === lever.x && selection.y === lever.y))
        }))
      ),
      selected: selection === null ? null : cellOfSelection(level, selection),
      box,
      logic: layers.logicOnTop ? level.map : null
    }
  }, [level, selection, box, layers.logicOnTop])
  const shownScene = useMemo(() => visibleScene(scene, layers.hidden), [scene, layers.hidden])

  const toggle = <T,>(list: ReadonlyArray<T>, value: T, on: boolean): ReadonlyArray<T> =>
    on ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value)

  const goalOn = (type: Goal["type"]) => level.goals.some((g) => g.type === type)
  const setGoal = (type: Exclude<Goal["type"], "pick">, on: boolean) =>
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
              const found = [...levels, farmMockup].find((l) => l.id === e.target.value)
              if (found !== undefined) setLevel({ ...found, id: `${found.id}-copy` })
            }}
          >
            <option value="">Відкрити рівень з бібліотеки…</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {chapterOf(l.id)?.title ?? ""} · {l.title}
              </option>
            ))}
            <option value={farmMockup.id}>Макети · {farmMockup.title}</option>
          </select>
        </label>
        <button type="button" className="demo-skin" onClick={() => setLevel(blank())}>
          Новий
        </button>
        <button type="button" className={world ? "demo-skin demo-skin-on" : "demo-skin"} aria-pressed={world} onClick={() => setWorld((w) => !w)} disabled={playing}>
          {world ? "← До рівня" : "Мапа світу"}
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
      {world && !playing ? (
        <main className="demo-main">
          <WorldMap
            current={level.id}
            onOpen={(l) => {
              setLevel(l)
              setWorld(false)
            }}
          />
        </main>
      ) : playing ? (
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
              {[SELECT_TOOL, ...TILE_TOOLS, ...PROP_TOOLS, ERASE_TOOL].map((t) => (
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
            <div className="ed-shapes" role="radiogroup" aria-label="Як малює пензель">
              {SHAPES.map((sh) => (
                <button
                  key={sh.id}
                  type="button"
                  role="radio"
                  aria-checked={shape === sh.id}
                  className={shape === sh.id ? "ed-shape ed-shape-on" : "ed-shape"}
                  title={sh.hint}
                  disabled={!fillsArea(brush) && sh.id !== "pen"}
                  onClick={() => {
                    setShape(sh.id)
                    setStamp((st) => ({ ...st, on: false }))
                  }}
                >
                  {sh.name}
                </button>
              ))}
              <button
                type="button"
                className={stamp.on ? "ed-shape ed-shape-on" : "ed-shape"}
                aria-pressed={stamp.on}
                title="Протягни рамку, щоб скопіювати ділянку; клік ставить копію; права кнопка бере нову ділянку"
                onClick={() => setStamp((st) => ({ ...st, on: !st.on }))}
              >
                ⧉ Штамп
              </button>
              {stamp.on && (
                <span className="ed-note">
                  {stamp.patch === null
                    ? "Протягни рамку по мапі, щоб скопіювати ділянку."
                    : `Ділянка ${stamp.patch.width}×${stamp.patch.height}: клацни, куди поставити лівий верхній кут. Права кнопка бере нову, її можна ставити й на іншому рівні.`}
                </span>
              )}
              <span className="ed-note">Alt+клік — піпетка: бере пензель з клітинки.</span>
              {!brushOpen(brush) && <span className="ed-error">Шар цього пензля замкнено.</span>}
            </div>
            {brush.kind === "sprite" || ("look" in brush && brush.look !== undefined) ? <BrushNote brush={brush} level={level} /> : null}
            <MapCanvas
              level={level}
              brush={brush}
              scene={shownScene}
              hideEnemies={layers.hidden.has("objects")}
              marks={marks}
              onDown={onDown}
              onDrag={onDrag}
              onUp={onUp}
            />
            <p className="ed-note">
              <strong>«Вибір»</strong> відкриває властивості ворога, людини, картинки, важеля, воріт чи предмета і пересуває
              фігури протягом. <strong>Ліва кнопка</strong> малює, <strong>права</strong> прибирає те, що зверху: ворога, людину, картинку, хату, а
              предмет, пастку чи мету перетворює на стежку. Веди мишею, щоб малювати стежку, стіни чи плитки. Ctrl+Z скасовує.
              Стіни стають деревами й кущами, луг навколо малюється сам, на ньому теж можна ставити картинки. Хату ставлять дверима
              на клітинку, по якій клацнули. Людей краще ставити на стіну біля стежки. Ворогів ставлять на стежку, а налаштовують
              «Вибором».
            </p>
            <Issues level={level} />
          </section>
          <aside className="ed-lib">
            <AssetBrowser level={level} brush={brush} onBrush={setBrush} onLevel={setLevel} />
          </aside>
          <aside className="ed-side">
            {selection !== null && (
              <Inspector
                level={level}
                selection={selection}
                aim={aim}
                onAim={setAim}
                onChange={setLevel}
                onSelect={(next) => {
                  setSelection(next)
                  setAim(null)
                }}
              />
            )}
            <LayersCard level={level} brush={brush} state={layers} onChange={setLayers} />
            <GroundCard level={level} brush={brush} onBrush={setBrush} onChange={setLevel} />
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
              {scene.tilemap !== undefined && (
                <p className="ed-note">
                  Карта плиток з Tiled ({scene.tilemap.width}×{scene.tilemap.height}): тут її видно, а змінюють її в Tiled і
                  переносять командою <code>npm run tiled</code>. Мапа рівня каже, де герой може ходити.{" "}
                  <button type="button" onClick={() => setLevel(({ scene: { tilemap: _, ...rest } = {}, ...l }) => ({ ...l, scene: rest }))}>
                    Прибрати карту плиток
                  </button>
                </p>
              )}
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
            <Enemies
              level={level}
              onChange={update}
              onSelect={(index) => {
                setSelection({ kind: "enemy", index })
                setAim(null)
              }}
            />
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
