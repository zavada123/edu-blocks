import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { buildProgram } from "../core/build.ts"
import { levels } from "../levels/index.ts"
import { solutions } from "../levels/solutions.ts"
import { type BlocksReport, EduBlocks } from "../ui/EduBlocks.tsx"
import type { Skin } from "../ui/Field.tsx"
import "./demo.css"

// `?level=g4-if&solve` opens a level with its reference solution: for screenshots and for teachers.
const params = new URLSearchParams(location.search)
const showSolution = params.has("solve")

const firstLevel = levels.find((l) => l.id === params.get("level")) ?? levels[0]
if (!firstLevel) throw new Error("Немає жодного рівня")

/** Crystals for each new star. In EduProstir the server counts them; the demo keeps them in the browser. */
const CRYSTALS_PER_STAR = 10
const SKINS: ReadonlyArray<{ readonly id: Skin; readonly name: string; readonly price: number }> = [
  { id: "robot", name: "Робот", price: 0 },
  { id: "rover", name: "Ровер", price: 30 },
  { id: "bee", name: "Бджілка", price: 60 }
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

/** Demo page: levels, crystals for stars and a small shop of hero looks. */
const Demo = () => {
  const [id, setId] = useState(firstLevel.id)
  const [best, setBest] = useState<Record<string, number>>(() => load("eb-best", {}))
  const [owned, setOwned] = useState<ReadonlyArray<Skin>>(() => load("eb-owned", ["robot"]))
  const [skin, setSkin] = useState<Skin>(() => load("eb-skin", "robot"))
  const level = levels.find((l) => l.id === id) ?? firstLevel

  const spent = SKINS.filter((s) => owned.includes(s.id)).reduce((sum, s) => sum + s.price, 0)
  const crystals = Object.values(best).reduce((sum, stars) => sum + stars * CRYSTALS_PER_STAR, 0) - spent

  const onComplete = (report: BlocksReport) => {
    if (report.stars <= (best[report.levelId] ?? 0)) return
    const next = { ...best, [report.levelId]: report.stars }
    setBest(next)
    save("eb-best", next)
  }

  const pick = (s: (typeof SKINS)[number]) => {
    if (!owned.includes(s.id)) {
      if (crystals < s.price) return
      const next = [...owned, s.id]
      setOwned(next)
      save("eb-owned", next)
    }
    setSkin(s.id)
    save("eb-skin", s.id)
  }

  return (
    <div className="demo">
      <header className="demo-head">
        <strong>Програмуємо з роботом</strong>
        <label>
          <span className="demo-visually-hidden">Рівень</span>
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.grade} клас · {l.title} {"★".repeat(best[l.id] ?? 0)}
              </option>
            ))}
          </select>
        </label>
        <span className="demo-crystals" aria-label={`Кристалів: ${crystals}`}>
          💎 {crystals}
        </span>
        <span className="demo-shop">
          {SKINS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === skin ? "demo-skin demo-skin-on" : "demo-skin"}
              onClick={() => pick(s)}
              disabled={!owned.includes(s.id) && crystals < s.price}
            >
              {s.name}
              {!owned.includes(s.id) && ` · 💎${s.price}`}
            </button>
          ))}
        </span>
      </header>
      <main className="demo-main">
        <EduBlocks
          key={level.id}
          level={level}
          skin={skin}
          large={level.grade === 3}
          onComplete={onComplete}
          {...(showSolution ? { program: buildProgram(solutions[level.id] ?? []) } : {})}
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
