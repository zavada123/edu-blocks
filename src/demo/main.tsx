import { StrictMode, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { coinsFor, levelCoins, walletOf } from "../core/coins.ts"
import {
  buyUpgrade,
  canBuyUpgrade,
  canStartDay,
  ESTATE_UPGRADES,
  estateDay,
  estateDays,
  estatePalette,
  type EstateState,
  NEW_ESTATE,
  upgradeCount,
  upgradesCost
} from "../core/estate.ts"
import { heroesCost, type HeroId } from "../core/heroes.ts"
import type { Program } from "../core/program.ts"
import { levels } from "../levels/index.ts"
import { pythonLevels } from "../levels/python-start.ts"
import { chapterOf, isFirstChapter } from "../levels/chapters.ts"
import { solutionProgram } from "../levels/solutions.ts"
import { type BlocksReport, EduBlocks } from "../ui/EduBlocks.tsx"
import { EduPython, type PythonReport } from "../ui/EduPython.tsx"
import type { Skin } from "../ui/stage/Stage.tsx"
import "./demo.css"
import { farmMockup } from "./farm-mockup.ts"
import { tilemapFor } from "../core/tilemap.ts"

// `?level=g4-if&solve` opens a level with its reference solution: for screenshots and for teachers.
const params = new URLSearchParams(location.search)
const showSolution = params.has("solve")

/** How the student programs: Scratch blocks or Python code. `?lang=python` opens Python. */
type Language = "blocks" | "python"

/** The value of the level choice that opens the estate instead of a level. `?level=estate` opens it. */
const ESTATE = "estate"

/** Levels of the demo that are not in the course: the farm mockup, with the coop bought so that it shows. */
const farmTiles = farmMockup.scene?.tilemap
const extraLevels = [
  ...pythonLevels,
  farmTiles === undefined ? farmMockup : { ...farmMockup, scene: { ...farmMockup.scene, tilemap: tilemapFor(farmTiles, new Set(["coop"])) } }
]

const firstLevel = [...levels, ...extraLevels].find((l) => l.id === params.get("level")) ?? levels[0]
if (!firstLevel) throw new Error("Немає жодного рівня")

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
  const [id, setId] = useState(params.get("level") === ESTATE ? ESTATE : firstLevel.id)
  const [best, setBest] = useState<Record<string, Best>>(() => load("eb-best-xp", {}))
  const [skin, setSkin] = useState<Skin>(() => load("eb-skin", "ninja"))
  const [language, setLanguage] = useState<Language>(() => (params.get("lang") === "python" ? "python" : load<Language>("eb-language", "blocks")))
  const [sources, setSources] = useState<Record<string, string>>(() => load("eb-python-sources", {}))
  const [owned, setOwned] = useState<ReadonlyArray<HeroId>>(() => load("eb-owned-heroes", []))
  // The estate: its upgrades and day, the coins of the best run of each day, and the routine.
  const [estate, setEstate] = useState<EstateState>(() => load("eb-estate", NEW_ESTATE))
  const [harvests, setHarvests] = useState<Record<string, number>>(() => load("eb-estate-harvests", {}))
  const [routine, setRoutine] = useState<Program | undefined>(() => load<Program | undefined>("eb-estate-program", undefined))
  const passed = levels.filter((l) => (best[l.id]?.stars ?? 0) > 0)
  // The game rebuilds the editor for a new level object, so the day stays the same object while it lasts.
  const palette = estatePalette(passed)
  const paletteKey = palette.join(" ")
  const day = useMemo(() => (id === ESTATE ? estateDay(estate, palette) : null), [id, estate, paletteKey])
  const level = day?.level ?? [...levels, ...extraLevels].find((l) => l.id === id) ?? firstLevel

  const total = Object.values(best).reduce((sum, b) => sum + b.xp, 0)
  // Coins come from the best stars of each level, less the heroes bought: nothing to store but the purchases.
  const stars = Object.fromEntries(Object.entries(best).map(([levelId, b]) => [levelId, b.stars]))
  const income = Object.values(harvests).reduce((sum, c) => sum + c, 0)
  const coins = walletOf({ earned: levelCoins(levels, stars), income, spent: heroesCost(owned) + upgradesCost(estate.upgrades) })
  const keepEstate = (next: EstateState) => {
    setEstate(next)
    save("eb-estate", next)
  }

  const pickLanguage = (next: Language) => {
    setLanguage(next)
    save("eb-language", next)
  }

  const onSourceChange = (source: string) => {
    const next = { ...sources, [day === null ? level.id : ESTATE]: source }
    setSources(next)
    save("eb-python-sources", next)
  }

  const onComplete = (report: BlocksReport | PythonReport) => {
    if (report.harvest !== null) {
      // A day of the estate pays its best run.
      const key = String(estate.day)
      if (report.coins <= (harvests[key] ?? 0)) return
      const nextHarvests = { ...harvests, [key]: report.coins }
      setHarvests(nextHarvests)
      save("eb-estate-harvests", nextHarvests)
      return
    }
    const old = best[report.levelId] ?? { stars: 0, xp: 0 }
    if (report.stars <= old.stars && report.xp <= old.xp) return
    const next = { ...best, [report.levelId]: { stars: Math.max(old.stars, report.stars), xp: Math.max(old.xp, report.xp) } }
    setBest(next)
    save("eb-best-xp", next)
  }

  // «Далі» opens the next level of the course; the last level has none.
  const course = [...pythonLevels, ...levels]
  const next = course[course.indexOf(level) + 1]
  const onNext =
    day !== null
      ? canStartDay(estate, passed.length)
        ? () => keepEstate({ ...estate, day: estate.day + 1 })
        : undefined
      : next === undefined
        ? undefined
        : () => setId(next.id)
  const navigation = {
    progress: stars,
    ...(onNext === undefined ? {} : { onNext }),
    // The hero's portrait in the bar opens the choice of the heroes the hero level has opened.
    onSkinChange: (s: Skin) => {
      setSkin(s)
      save("eb-skin", s)
    },
    coins: { total: coins, best: day === null ? coinsFor(level.tier ?? "intro", best[level.id]?.stars ?? 0) : (harvests[String(estate.day)] ?? 0) },
    ownedHeroes: owned,
    // The shop: the demo keeps the bought heroes in the browser.
    onBuyHero: (hero: HeroId) => {
      const next = [...owned, hero]
      setOwned(next)
      save("eb-owned-heroes", next)
    }
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
            {(language === "python" ? [...pythonLevels, ...levels] : levels).map((l) => (
              <option key={l.id} value={l.id}>
                {chapterOf(l.id)?.title ?? ""} · {l.title} {"★".repeat(best[l.id]?.stars ?? 0)}
              </option>
            ))}
            <option value={ESTATE}>Хутір</option>
            {extraLevels.filter((l) => l.language !== "python").map((l) => (
              <option key={l.id} value={l.id}>
                Макети · {l.title}
              </option>
            ))}
          </select>
        </label>
        <span className="demo-shop" role="group" aria-label="Як програмувати">
          {(["blocks", "python"] as const).map((l) => (
            <button key={l} type="button" className={l === language ? "demo-skin demo-skin-on" : "demo-skin"} aria-pressed={l === language} onClick={() => pickLanguage(l)}>
              {l === "blocks" ? "Блоки" : "Python"}
            </button>
          ))}
        </span>
      </header>
      {day !== null && (
        <EstateBar
          estate={estate}
          days={estateDays(passed.length)}
          coins={coins}
          onNewDay={canStartDay(estate, passed.length) ? () => keepEstate({ ...estate, day: estate.day + 1 }) : undefined}
          onBuy={(upgrade) => keepEstate({ ...estate, upgrades: buyUpgrade(estate.upgrades, upgrade) })}
        />
      )}
      <main className="demo-main">
        {language === "python" || level.language === "python" ? (
          <EduPython
            key={level.id}
            level={level}
            skin={skin}
            large={isFirstChapter(level.id)}
            xp={{ total, best: best[level.id]?.xp ?? 0 }}
            onComplete={onComplete}
            onSourceChange={onSourceChange}
            {...navigation}
            {...(sources[day === null ? level.id : ESTATE] === undefined ? {} : { source: sources[day === null ? level.id : ESTATE] })}
            {...(day === null ? {} : { estate: { day, best: harvests[String(estate.day)] ?? 0 } })}
          />
        ) : (
          <EduBlocks
            key={level.id}
            level={level}
            skin={skin}
            large={isFirstChapter(level.id)}
            xp={{ total, best: best[level.id]?.xp ?? 0 }}
            onComplete={onComplete}
            {...navigation}
            {...(day === null
              ? showSolution
                ? { program: solutionProgram(level.id) }
                : {}
              : {
                  estate: { day, best: harvests[String(estate.day)] ?? 0 },
                  ...(routine === undefined ? {} : { program: routine }),
                  // The routine stays for the next day.
                  onProgramChange: (program: Program) => {
                    setRoutine(program)
                    save("eb-estate-program", program)
                  }
                })}
          />
        )}
      </main>
    </div>
  )
}

/** The estate over the game: the day, the days opened by passed levels, a new day and the upgrades for coins. */
const EstateBar = ({
  estate,
  days,
  coins,
  onNewDay,
  onBuy
}: {
  readonly estate: EstateState
  readonly days: number
  readonly coins: number
  readonly onNewDay: (() => void) | undefined
  readonly onBuy: (upgrade: (typeof ESTATE_UPGRADES)[number]["id"]) => void
}) => (
  <section className="demo-estate" aria-label="Хутір">
    <span>
      День {estate.day} з {days} · монет: {coins}
    </span>
    <button type="button" className="demo-skin" disabled={onNewDay === undefined} onClick={onNewDay} title="Пройди рівень, щоб відкрити ще день">
      Новий день
    </button>
    <span className="demo-shop" role="group" aria-label="Покращення">
      {ESTATE_UPGRADES.map((u) => {
        const count = upgradeCount(estate.upgrades, u.id)
        return (
          <button
            key={u.id}
            type="button"
            className="demo-skin"
            disabled={!canBuyUpgrade(u, estate.upgrades, coins)}
            title={u.about}
            onClick={() => onBuy(u.id)}
          >
            {u.name}
            {u.max > 1 ? ` ${count}/${u.max}` : count > 0 ? " ✓" : ""} · {u.price}
          </button>
        )
      })}
    </span>
  </section>
)

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
createRoot(rootEl).render(
  <StrictMode>
    <Demo />
  </StrictMode>
)
