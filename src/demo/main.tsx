import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { heroLevelOf } from "../core/xp.ts"
import { levels } from "../levels/index.ts"
import { chapterOf, isFirstChapter } from "../levels/chapters.ts"
import { solutionProgram } from "../levels/solutions.ts"
import { type BlocksReport, EduBlocks } from "../ui/EduBlocks.tsx"
import type { Skin } from "../ui/stage/Stage.tsx"
import "./demo.css"

// `?level=g4-if&solve` opens a level with its reference solution: for screenshots and for teachers.
const params = new URLSearchParams(location.search)
const showSolution = params.has("solve")

const firstLevel = levels.find((l) => l.id === params.get("level")) ?? levels[0]
if (!firstLevel) throw new Error("Немає жодного рівня")

/** Looks open at a hero level. In EduProstir the server counts the XP; the demo keeps it in the browser. */
const SKINS: ReadonlyArray<{ readonly id: Skin; readonly name: string; readonly heroLevel: number }> = [
  { id: "ninja", name: "Ніндзя", heroLevel: 1 },
  { id: "robot", name: "Робот", heroLevel: 2 },
  { id: "rover", name: "Ровер", heroLevel: 3 },
  { id: "bee", name: "Бджілка", heroLevel: 4 }
]

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode: the demo just forgets.
  }
}

interface Best {
  readonly stars: number
  readonly xp: number
}

/** Demo page: levels, XP for the best run of each level and hero looks that open with the hero level. */
const Demo = () => {
  const [id, setId] = useState(firstLevel.id)
  const [best, setBest] = useState<Record<string, Best>>(() => load("eb-best-xp", {}))
  const [skin, setSkin] = useState<Skin>(() => load("eb-skin", "ninja"))
  const level = levels.find((l) => l.id === id) ?? firstLevel

  const total = Object.values(best).reduce((sum, b) => sum + b.xp, 0)
  const hero = heroLevelOf(total)

  const onComplete = (report: BlocksReport) => {
    const old = best[report.levelId] ?? { stars: 0, xp: 0 }
    if (report.stars <= old.stars && report.xp <= old.xp) return
    const next = { ...best, [report.levelId]: { stars: Math.max(old.stars, report.stars), xp: Math.max(old.xp, report.xp) } }
    setBest(next)
    save("eb-best-xp", next)
  }

  const pick = (s: (typeof SKINS)[number]) => {
    if (hero.level < s.heroLevel) return
    setSkin(s.id)
    save("eb-skin", s.id)
  }

  return (
    <div className="demo">
      <header className="demo-head">
        <strong>Рік у селі</strong>
        <a className="demo-editor-link" href="./editor.html">
          Редактор рівнів
        </a>
        <label>
          <span className="demo-visually-hidden">Рівень</span>
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {chapterOf(l.id)?.title ?? ""} · {l.title} {"★".repeat(best[l.id]?.stars ?? 0)}
              </option>
            ))}
          </select>
        </label>
        <span className="demo-crystals" aria-label={`Рівень героя ${hero.level}, ${total} XP`}>
          Рівень {hero.level} · {total} XP
        </span>
        <span className="demo-shop">
          {SKINS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === skin ? "demo-skin demo-skin-on" : "demo-skin"}
              onClick={() => pick(s)}
              disabled={hero.level < s.heroLevel}
            >
              {s.name}
              {hero.level < s.heroLevel && ` · рівень ${s.heroLevel}`}
            </button>
          ))}
        </span>
      </header>
      <main className="demo-main">
        <EduBlocks
          key={level.id}
          level={level}
          skin={skin}
          large={isFirstChapter(level.id)}
          xp={{ total, best: best[level.id]?.xp ?? 0 }}
          onComplete={onComplete}
          {...(showSolution ? { program: solutionProgram(level.id) } : {})}
        />
      </main>
    </div>
  )
}

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
createRoot(rootEl).render(
  <StrictMode>
    <Demo />
  </StrictMode>
)
