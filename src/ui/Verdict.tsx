import type { Level } from "../core/level.ts"
import type { FailReason, RunResult } from "../core/program.ts"
import { heroLevelOf, xpFor, xpGain } from "../core/xp.ts"

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
}

/** The hero's XP before the run, from the app: the result then shows the gain and the hero level. */
export interface HeroXp {
  /** All XP of the hero. */
  readonly total: number
  /** The best XP of this level so far. */
  readonly best: number
}

/** The XP of a run and what the hero gets of it. */
export const rewardOf = (level: Level, result: RunResult, firstTry: boolean, xp: HeroXp | undefined): { readonly runXp: number; readonly reward: Reward } => {
  const runXp = xpFor(level.tier ?? "intro", { stars: result.stars, firstTry })
  const gain = xpGain(runXp, xp?.best ?? 0)
  return { runXp, reward: { gain, firstTry, total: xp === undefined ? null : xp.total + gain } }
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

const CloseButton = ({ onClose }: { readonly onClose: () => void }) => (
  <button type="button" className="eb-verdict-close" onClick={onClose}>
    Зрозуміло
  </button>
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
      <div className="eb-xp-bar" role="img" aria-label={`Рівень героя ${hero.level}: ${reward.total} XP${hero.next === null ? "" : ` з ${hero.next}`}`}>
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

const HINTED: ReadonlySet<FailReason> = new Set(["crashed", "trapped", "tired", "defeated", "goalsNotMet"])

export const Verdict = ({
  level,
  result,
  reward,
  advice,
  language,
  onClose
}: {
  readonly level: Level
  readonly result: RunResult
  readonly reward: Reward
  readonly advice: ReadonlyArray<string>
  readonly language: Language
  readonly onClose: () => void
}) => {
  if (result.passed) {
    const size = language === "python" ? `Розмір програми: ${result.blocks}.` : `Блоків: ${result.blocks}.`
    return (
      <div className="eb-verdict eb-verdict-ok" role="status">
        <Stars count={result.stars} />
        <p>Рівень пройдено!{advice.length === 0 ? ` ${size}` : ""}</p>
        <Advice tips={advice} />
        <XpLine reward={reward} />
        <CloseButton onClose={onClose} />
      </div>
    )
  }
  const reason = result.reason ?? "goalsNotMet"
  return (
    <div className="eb-verdict eb-verdict-fail" role="status">
      <p>{failText(result, language)}</p>
      <Advice tips={advice} />
      {level.hint !== undefined && HINTED.has(reason) && <p className="eb-hint">Підказка: {level.hint}</p>}
      <CloseButton onClose={onClose} />
    </div>
  )
}
