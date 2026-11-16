import { coinGain, coinsFor } from "../core/coins.ts"
import { type EstateDay, FULL_DAY_COINS, type Harvest } from "../core/estate.ts"
import { amountText, type FarmReport, farmTips, HELPER_NAME, RESOURCE_NAMES, RESOURCES, totalOf } from "../core/farm.ts"
import { type BlockName, type Level, speaksTo } from "../core/level.ts"
import type { FailReason, Program, RunResult } from "../core/program.ts"
import { heroLevelOf, xpFor, xpGain } from "../core/xp.ts"
import { Coin } from "./Coin.tsx"

/** The result of a run for the student: stars, XP, what went wrong and what to try. Shared by blocks and Python. */

/** How the student programs the level: the words of the result depend on it. */
export type Language = "blocks" | "python"

const FAIL_TEXT: Readonly<Record<FailReason, string>> = {
  crashed: "Герой урізався в перешкоду.",
  trapped: "Герой ступив на пастку.",
  tired: "Герой утомився: кроки закінчились.",
  defeated: "Вороги забрали всі сердечка.",
  goalsNotMet: "Програма закінчилась, а завдання ще не виконане.",
  tooLong: "Програма працює задовго. Можливо, цикл ніколи не закінчується.",
  noStart: "Поклади нагору програми блок «коли натиснуто прапорець».",
  badProgram: "Програму не вдалося запустити."
}

const PYTHON_FAIL_TEXT: Partial<Record<FailReason, string>> = {
  noStart: "Програма порожня: напиши, що робити героєві, наприклад hero.move()."
}

/** The text of a failed run. A mistake in Python code names its line. */
export const failText = (result: RunResult, language: Language): string => {
  const reason = result.reason ?? "goalsNotMet"
  if (reason === "badProgram" && result.detail !== undefined) return result.line === undefined ? result.detail : `Рядок ${result.line}: ${result.detail}`
  return (language === "python" ? PYTHON_FAIL_TEXT[reason] : undefined) ?? FAIL_TEXT[reason]
}

/** What a passed run gave the hero, as it stood when the run ended. */
export interface Reward {
  readonly gain: number
  readonly firstTry: boolean
  /** The hero's XP after the run, when the app told it. */
  readonly total: number | null
  /** The coins the run added and the coins after it, when the app keeps coins. */
  readonly coins: { readonly gain: number; readonly total: number } | null
  /** On a day of the estate: what the run gathered. The result then shows it instead of stars and XP. */
  readonly harvest: Harvest | null
  /** On a working day of the farm: its report. The result then shows it instead of stars and XP. */
  readonly farm: FarmReport | null
}

/** A working day of the farm, from the app: which day it is (`farmDay`) and how much the worker carries. */
export interface FarmRun {
  readonly day: number
  readonly capacity: number
  /** Once «Хата помічника» stands: the helper's program, kept by the app like the worker's. */
  readonly helper?: FarmHelperRun
}

/** The helper of a farm day: its name and its program, in the language of the worker's. */
export interface FarmHelperRun {
  readonly name: string
  /** The helper's Python code, or none for a starter. */
  readonly source?: string
  /** The helper's blocks, or none for an empty program. */
  readonly program?: Program
  readonly onSourceChange?: (source: string) => void
  readonly onProgramChange?: (program: Program) => void
}

/** A day of the estate, from the app: the day (`estateDay`) and the coins of its best run so far. */
export interface EstateRun {
  readonly day: EstateDay
  /** The coins of the best run of this day: a run pays only the part above them, like a replayed level. */
  readonly best: number
}

/** The hero's XP before the run, from the app: the result then shows the gain and the hero level. */
export interface HeroXp {
  /** All XP of the hero. */
  readonly total: number
  /** The best XP of this level so far. */
  readonly best: number
}

/** The student's coins before the run, from the app: the result then shows the coins the run added. */
export interface HeroCoins {
  /** The coins the student has now. */
  readonly total: number
  /** The coins of the best run of this level so far (`coinsFor` of its stars). */
  readonly best: number
}

/** The XP and coins of a run and what the hero gets of them. */
export const rewardOf = (
  level: Level,
  result: RunResult,
  firstTry: boolean,
  xp: HeroXp | undefined,
  coins?: HeroCoins
): { readonly runXp: number; readonly runCoins: number; readonly reward: Reward } => {
  const tier = level.tier ?? "intro"
  const runXp = xpFor(tier, { stars: result.stars, firstTry })
  const gain = xpGain(runXp, xp?.best ?? 0)
  const runCoins = result.passed ? coinsFor(tier, result.stars) : 0
  const coinsGained = coinGain(runCoins, coins?.best ?? 0)
  return {
    runXp,
    runCoins,
    reward: {
      gain,
      firstTry,
      total: xp === undefined ? null : xp.total + gain,
      coins: coins === undefined ? null : { gain: coinsGained, total: coins.total + coinsGained },
      harvest: null,
      farm: null
    }
  }
}

/** The reward of a run on a day of the estate: no XP, the coins of the harvest above the best run of the day. */
export const harvestRewardOf = (
  harvest: Harvest,
  estate: EstateRun,
  firstTry: boolean,
  xp: HeroXp | undefined,
  coins: HeroCoins | undefined
): { readonly runXp: number; readonly runCoins: number; readonly reward: Reward } => {
  const gain = coinGain(harvest.coins, estate.best)
  return {
    runXp: 0,
    runCoins: harvest.coins,
    reward: { gain: 0, firstTry, total: xp?.total ?? null, coins: { gain, total: (coins?.total ?? 0) + gain }, harvest, farm: null }
  }
}

/** The reward of a working day of the farm: no XP and no coins, its yield goes to the barn when the app ends the day. */
export const farmRewardOf = (report: FarmReport, firstTry: boolean, xp: HeroXp | undefined): { readonly runXp: number; readonly runCoins: number; readonly reward: Reward } => ({
  runXp: 0,
  runCoins: 0,
  reward: { gain: 0, firstTry, total: xp?.total ?? null, coins: null, harvest: null, farm: report }
})

/** «3 гриби», «1 гарбуз», «5 ягнят». */
const countOf = (n: number, forms: readonly [string, string, string]): string => {
  const last = n % 10
  const tens = n % 100
  const form = last === 1 && tens !== 11 ? forms[0] : last >= 2 && last <= 4 && (tens < 12 || tens > 14) ? forms[1] : forms[2]
  return `${n} ${form}`
}

/** What the hero gathered, as a sentence part: «3 гриби, 2 гарбузи і 1 ягня». */
export const harvestText = (harvest: Harvest): string => {
  const parts = [
    harvest.apple > 0 ? countOf(harvest.apple, ["гриб", "гриби", "грибів"]) : "",
    harvest.carrot > 0 ? countOf(harvest.carrot, ["гарбуз", "гарбузи", "гарбузів"]) : "",
    harvest.egg > 0 ? countOf(harvest.egg, ["ягня", "ягняти", "ягнят"]) : ""
  ].filter((p) => p !== "")
  if (parts.length === 0) return "нічого"
  return parts.length === 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} і ${parts.at(-1) ?? ""}`
}

/** The harvest of a day and its coins, in a passed or a failed run. */
const HarvestLine = ({ reward }: { readonly reward: Reward }) => {
  if (reward.harvest === null) return null
  const coins = reward.coins
  return (
    <>
      <p className="eb-harvest">
        Зібрано: <strong>{harvestText(reward.harvest)}</strong>.{reward.harvest.full ? ` Повний день: +${FULL_DAY_COINS}.` : ""}
      </p>
      {coins !== null &&
        (coins.gain > 0 ? (
          <p className="eb-coins-won">
            <Coin /> <strong>+{coins.gain} {coinWord(coins.gain)}</strong> · у тебе {coins.total}
          </p>
        ) : (
          <p className="eb-harvest-note">Це не більше, ніж найкращий запуск цього дня: монет не додано.</p>
        ))}
    </>
  )
}

/** The coins a passed run added, when the app keeps coins and the run beat the best one. */
const CoinLine = ({ reward }: { readonly reward: Reward }) =>
  reward.coins === null || reward.coins.gain === 0 ? null : (
    <p className="eb-coins-won">
      <Coin /> <strong>+{reward.coins.gain} {coinWord(reward.coins.gain)}</strong> · у тебе {reward.coins.total}
    </p>
  )

/** «монета», «монети» or «монет» for a number, as Ukrainian says it. */
export const coinWord = (n: number): string => {
  const last = n % 10
  const tens = n % 100
  if (last === 1 && tens !== 11) return "монета"
  if (last >= 2 && last <= 4 && (tens < 12 || tens > 14)) return "монети"
  return "монет"
}

const Stars = ({ count }: { readonly count: number }) => (
  <span className="eb-stars" aria-label={`Зірок: ${count} з 3`}>
    {[1, 2, 3].map((i) => (
      <span key={i} className={i <= count ? "eb-star eb-star-on" : "eb-star"}>
        ★
      </span>
    ))}
  </span>
)

/** The XP of a passed run and, when the app told the hero's XP, the bar to the next hero level. */
const XpLine = ({ reward }: { readonly reward: Reward }) => {
  const note = reward.gain === 0 ? "Це не краще за твій рекорд, XP не додано." : reward.firstTry ? "З першої спроби!" : ""
  if (reward.total === null)
    return (
      <p className="eb-xp">
        <strong>+{reward.gain} XP</strong> {note}
      </p>
    )
  const hero = heroLevelOf(reward.total)
  const up = reward.gain > 0 && heroLevelOf(reward.total - reward.gain).level < hero.level
  const share = hero.next === null ? 1 : (reward.total - hero.from) / (hero.next - hero.from)
  return (
    <div className="eb-xp">
      <p>
        <strong>+{reward.gain} XP</strong> {up ? `Новий рівень героя: ${hero.level}!` : note}
      </p>
      <div className="eb-bar" role="img" aria-label={`Рівень героя ${hero.level}: ${reward.total} XP${hero.next === null ? "" : ` з ${hero.next}`}`}>
        <span style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
      <p className="eb-xp-level">
        Рівень {hero.level} · {reward.total}
        {hero.next === null ? "" : ` / ${hero.next}`} XP
      </p>
    </div>
  )
}

/** What to change in this very program, from `adviseRun`. */
const Advice = ({ tips }: { readonly tips: ReadonlyArray<string> }) =>
  tips.length === 0 ? null : (
    <ul className="eb-advice">
      {tips.map((tip) => (
        <li key={tip}>{tip}</li>
      ))}
    </ul>
  )

/** On a level with several fields: which field the run failed on, before the reason. */
const fieldOf = (result: RunResult): string =>
  result.fields === undefined || result.field === undefined ? "" : `Поле ${result.field + 1} з ${result.fields.length}. `

/** On a level with several fields: the program passed them all. */
const allFields = (result: RunResult): string => (result.fields === undefined ? "" : `Програма пройшла всі ${result.fields.length} поля. `)

/** «Продовжити звідси» next to «Спробувати ще». */
const ContinueButton = ({ onContinue }: { readonly onContinue: () => void }) => (
  <button type="button" className="eb-btn eb-btn-go" onClick={onContinue} title="Герой лишиться тут, а ти допишеш наступний шматок програми">
    Продовжити звідси →
  </button>
)

const HINTED: ReadonlySet<FailReason> = new Set(["crashed", "trapped", "tired", "defeated", "goalsNotMet"])

/**
 * A ladder of hints (`Level.hints`): the student opens one more step at a time, from a nudge to a frame with gaps.
 * The step lives in the app, so it stays open across runs of the same level.
 */
const HintLadder = ({ hints, step, onMore }: { readonly hints: ReadonlyArray<string>; readonly step: number; readonly onMore: () => void }) => (
  <div className="eb-hint-ladder">
    {hints.slice(0, step).map((hint, i) =>
      hint.includes("\n") ? (
        <pre key={hint} className="eb-hint eb-hint-code" aria-label={`Підказка ${i + 1}`}>
          {hint}
        </pre>
      ) : (
        <p key={hint} className="eb-hint">
          Підказка {i + 1}: {hint}
        </p>
      )
    )}
    {step < hints.length && (
      <button type="button" className="eb-btn eb-btn-small" onClick={onMore}>
        {step === 0 ? "Підказка" : "Ще підказка"} ({step + 1} з {hints.length})
      </button>
    )}
  </div>
)

/** The result over the field: stars and XP for a pass, what went wrong and a hint for a fail. */
export const Verdict = ({
  level,
  result,
  reward,
  advice,
  language,
  onClose,
  onNext,
  onContinue,
  hintStep = 0,
  onHint,
  farmCapacity = 0
}: {
  readonly level: Level
  readonly result: RunResult
  readonly reward: Reward
  readonly advice: ReadonlyArray<string>
  readonly language: Language
  readonly onClose: () => void
  /** «Далі»: the app opens the next level. */
  readonly onNext: (() => void) | undefined
  /** «Продовжити звідси»: the hero stays, and the student writes the next piece (`canContinue`). */
  readonly onContinue?: (() => void) | undefined
  /** How many steps of `level.hints` are open. */
  readonly hintStep?: number
  /** Opens one more step of `level.hints`; without it the level's single `hint` is shown. */
  readonly onHint?: (() => void) | undefined
  /** On a working day of the farm: what the worker carries at once, for the tips of the report. */
  readonly farmCapacity?: number
}) => {
  if (reward.farm !== null)
    return <FarmVerdict report={reward.farm} capacity={farmCapacity} language={language} blocks={level.blocks} onClose={onClose} onNext={onNext} />
  if (reward.harvest !== null)
    return <HarvestVerdict result={result} reward={reward} language={language} onClose={onClose} onNext={onNext} onContinue={onContinue} />
  // A course level speaks of blocks: in Python it shows neither its ladder nor its gift.
  const own = speaksTo(level, language)
  if (result.passed) {
    const size = language === "python" ? `Розмір програми: ${result.blocks}.` : `Блоків: ${result.blocks}.`
    return (
      <div className="eb-verdict-layer">
        <div className="eb-verdict eb-verdict-ok eb-frame eb-parchment" role="dialog" aria-modal="false" aria-labelledby="eb-verdict-title">
          <Stars count={result.stars} />
          <h3 id="eb-verdict-title">Рівень пройдено!</h3>
          {advice.length === 0 ? (
            <p>
              {allFields(result)}
              {size}
            </p>
          ) : (
            <Advice tips={advice} />
          )}
          {own && level.gift !== undefined && (
            <p className="eb-gift">
              Новий предмет: <strong>{level.gift.name}</strong>. {level.gift.skill}
            </p>
          )}
          <XpLine reward={reward} />
          <CoinLine reward={reward} />
          <div className="eb-verdict-actions">
            <button type="button" className="eb-btn" onClick={onClose} autoFocus={onNext === undefined}>
              Ще раз
            </button>
            {onNext !== undefined && (
              <button type="button" className="eb-btn eb-btn-go" onClick={onNext} autoFocus>
                Далі →
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  const reason = result.reason ?? "goalsNotMet"
  return (
    <div className="eb-verdict-layer">
      <div className="eb-verdict eb-verdict-fail eb-frame eb-parchment" role="dialog" aria-modal="false" aria-labelledby="eb-verdict-title">
        <h3 id="eb-verdict-title">Ще не вийшло</h3>
        <p>
          {fieldOf(result)}
          {failText(result, language)}
        </p>
        <Advice tips={advice} />
        {own && level.hints !== undefined && onHint !== undefined ? (
          <HintLadder hints={level.hints} step={hintStep} onMore={onHint} />
        ) : (
          level.hint !== undefined && HINTED.has(reason) && <p className="eb-hint">Підказка: {level.hint}</p>
        )}
        <div className="eb-verdict-actions">
          {onContinue !== undefined && <ContinueButton onContinue={onContinue} />}
          <button type="button" className="eb-btn eb-btn-gold" onClick={onClose} autoFocus>
            Спробувати ще
          </button>
        </div>
      </div>
    </div>
  )
}

/** The result of a day of the estate: the harvest and its coins instead of stars and XP; «Далі» starts a new day. */
const HarvestVerdict = ({
  result,
  reward,
  language,
  onClose,
  onNext,
  onContinue
}: {
  readonly result: RunResult
  readonly reward: Reward
  readonly language: Language
  readonly onClose: () => void
  readonly onNext: (() => void) | undefined
  readonly onContinue: (() => void) | undefined
}) => (
  <div className="eb-verdict-layer">
    <div
      className={`eb-verdict ${result.passed ? "eb-verdict-ok" : "eb-verdict-fail"} eb-frame eb-parchment`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="eb-verdict-title"
    >
      <h3 id="eb-verdict-title">{result.passed ? "День завершено!" : "Зібрано не все"}</h3>
      {!result.passed && <p>{failText(result, language)}</p>}
      <HarvestLine reward={reward} />
      {!result.passed && <p className="eb-hint">Зміни програму і запусти ще раз: заплатять лише за те, що понад найкращий запуск.</p>}
      <div className="eb-verdict-actions">
        {!result.passed && onContinue !== undefined && <ContinueButton onContinue={onContinue} />}
        <button type="button" className={result.passed ? "eb-btn" : "eb-btn eb-btn-gold"} onClick={onClose} autoFocus={onNext === undefined}>
          {result.passed ? "Ще раз" : "Спробувати ще"}
        </button>
        {onNext !== undefined && (
          <button type="button" className="eb-btn eb-btn-go" onClick={onNext} autoFocus>
            Новий день →
          </button>
        )}
      </div>
    </div>
  </div>
)

/** The bars of the chart: what the barn held, sampled so that the chart has at most this many bars. */
const CHART_BARS = 24

const chartOf = (report: FarmReport): ReadonlyArray<number> => {
  const totals = report.byTurn.map(totalOf)
  if (totals.length === 0) return []
  const step = Math.max(1, Math.ceil(totals.length / CHART_BARS))
  return Array.from({ length: Math.ceil(totals.length / step) }, (_, i) => totals[Math.min(totals.length - 1, (i + 1) * step - 1)] ?? 0)
}

/** The report of a working day: what went to the barn, the turns spent for nothing, the chart and what to improve. */
/** «9 колод, 2 гарбузи»: what one worker brought to the barn. */
const crewYield = (report: FarmReport): string => {
  const brought = RESOURCES.filter((r) => report.stored[r] > 0).map((r) => amountText(r, report.stored[r]))
  return brought.length === 0 ? "нічого не приніс" : brought.join(", ")
}

const FarmVerdict = ({
  report,
  capacity,
  language,
  blocks,
  onClose,
  onNext
}: {
  readonly report: FarmReport
  readonly capacity: number
  readonly language: Language
  /** The palette of the day: the tips name only its commands. */
  readonly blocks: ReadonlyArray<BlockName>
  readonly onClose: () => void
  /** «Завершити день»: the app puts the yield in the barn and starts the next day. */
  readonly onNext: (() => void) | undefined
}) => {
  const bars = chartOf(report)
  const top = Math.max(1, ...bars)
  const tips = farmTips(report, capacity, language, blocks)
  const failed = report.stopped === "badProgram" || report.stopped === "noStart" || report.stopped === "tooLong"
  return (
    <div className="eb-verdict-layer">
      <div className="eb-verdict eb-verdict-ok eb-farm-report eb-frame eb-parchment" role="dialog" aria-modal="false" aria-labelledby="eb-verdict-title">
        <h3 id="eb-verdict-title">Звіт дня {report.day}</h3>
        {failed && <p>{report.detail === undefined ? FAIL_TEXT[report.stopped ?? "badProgram"] : report.line === undefined ? report.detail : `Рядок ${report.line}: ${report.detail}`}</p>}
        <dl className="eb-farm-tiles">
          {RESOURCES.filter((r) => r === "wood" || r === "pumpkin" || report.stored[r] > 0).map((r) => (
            <div key={r} className="eb-farm-tile">
              <dd>{report.stored[r]}</dd>
              <dt>{RESOURCE_NAMES[r]} у коморі</dt>
            </div>
          ))}
          <div className="eb-farm-tile">
            <dd>{report.idle}</dd>
            <dt>ходів дарма</dt>
          </div>
          <div className="eb-farm-tile">
            <dd>{totalOf(report.carried)}</dd>
            <dt>лишилось у руках</dt>
          </div>
          {report.goblins > 0 && (
            <div className="eb-farm-tile">
              <dd>
                {report.beaten} з {report.goblins}
              </dd>
              <dt>гоблінів прогнано</dt>
            </div>
          )}
        </dl>
        {bars.length > 0 && (
          <figure className="eb-farm-chart">
            <div className="eb-farm-bars" aria-hidden="true">
              {bars.map((b, i) => (
                <span key={i} style={{ height: `${Math.round((b / top) * 100)}%` }} />
              ))}
            </div>
            <figcaption>
              Усе в коморі за день: {totalOf(report.stored)} за {report.used} з {report.turns} ходів.
            </figcaption>
          </figure>
        )}
        {(report.workers ?? []).length > 1 && (
          <ul className="eb-farm-crew" aria-label="Що приніс кожен">
            {(report.workers ?? []).map((w, i) => (
              <li key={i}>
                <b>{i === 0 ? "Робітник" : HELPER_NAME}:</b> {crewYield(w)}
                {w.stopped === "crashed" && `, урізався в паркан і простояв до вечора`}
              </li>
            ))}
          </ul>
        )}
        {tips.map((t) => (
          <p key={t} className="eb-hint">
            {t}
          </p>
        ))}
        <div className="eb-verdict-actions">
          <button type="button" className={onNext === undefined ? "eb-btn eb-btn-gold" : "eb-btn"} onClick={onClose} autoFocus={onNext === undefined}>
            Змінити програму
          </button>
          {onNext !== undefined && (
            <button type="button" className="eb-btn eb-btn-go" onClick={onNext} autoFocus>
              Завершити день →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
