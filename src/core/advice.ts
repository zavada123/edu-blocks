import { opcodeOf } from "./blocks.ts"
import type { BlockName, ItemKind, Level } from "./level.ts"
import type { Frame, Program, RunResult } from "./program.ts"
import { applyAction, type Cell, cellKey, parseMap, wallAhead, type World } from "./world.ts"

/**
 * Advice after a run, made from what the hero did with this very program: what is missing («взяти», a turn,
 * more repeats) and what is extra (a «взяти» on an empty cell, turns that cancel out). The level `hint` stays
 * the general idea; the advice points at this program.
 *
 * Pure, so the browser and a server give the same advice.
 */

/** At most this many tips: more would be a lecture. */
export const MAX_ADVICE = 3

/** The item after «дійшов до …» and the word for it after «не взяв …», for one item and for several. */
const NOUNS: Readonly<Record<ItemKind, { readonly to: readonly [string, string]; readonly it: readonly [string, string] }>> = {
  crystal: { to: ["кристала", "кристалів"], it: ["його", "їх"] },
  wood: { to: ["дров", "дров"], it: ["їх", "їх"] },
  apple: { to: ["яблука", "яблук"], it: ["його", "їх"] },
  fish: { to: ["риби", "риби"], it: ["її", "її"] },
  key: { to: ["ключа", "ключів"], it: ["його", "їх"] },
  campfire: { to: ["вогнища", "вогнищ"], it: ["його", "їх"] }
}

const usedBlocks = (program: Program): ReadonlySet<string> => {
  const used = new Set<string>()
  for (const block of Object.values(program)) {
    if (typeof block === "object" && block !== null && "opcode" in block && typeof block.opcode === "string")
      used.add(block.opcode)
  }
  return used
}

const few = (n: number) => n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
const times = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "раз" : few(n) ? "рази" : "разів")
const steps = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "крок" : few(n) ? "кроки" : "кроків")

/** Fewest moves from a cell to the finish, or null when walls cut it off. */
const distanceToFinish = (world: World, from: Cell): number | null => {
  const finish = world.finish
  if (finish === null) return null
  const seen = new Set([cellKey(from.x, from.y)])
  let wave: ReadonlyArray<Cell> = [from]
  for (let d = 0; wave.length > 0; d++) {
    if (wave.some((c) => c.x === finish.x && c.y === finish.y)) return d
    const next: Array<Cell> = []
    for (const c of wave) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ] as const) {
        const x = c.x + dx
        const y = c.y + dy
        const key = cellKey(x, y)
        if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || seen.has(key)) continue
        seen.add(key)
        next.push({ x, y })
      }
    }
    wave = next
  }
  return null
}

/** Turns that undo each other (left then right) and three turns one way, which is one turn the other way. */
const wastedTurns = (frames: ReadonlyArray<Frame>): { readonly cancel: boolean; readonly triple: boolean } => {
  let cancel = false
  let triple = false
  frames.forEach((frame, i) => {
    const prev = frames[i - 1]?.action
    if ((frame.action === "turnLeft" && prev === "turnRight") || (frame.action === "turnRight" && prev === "turnLeft"))
      cancel = true
    if (frame.action !== "move" && frame.action !== "collect" && prev === frame.action && frames[i - 2]?.action === frame.action)
      triple = true
  })
  return { cancel, triple }
}

const crashAdvice = (level: Level, result: RunResult, has: (b: BlockName) => boolean): ReadonlyArray<string> => {
  const n = result.frames.length
  const before = result.frames[n - 2]?.world ?? parseMap(level.map, level.dir)
  const leftFree = !wallAhead(applyAction(before, "turnLeft").world)
  const rightFree = !wallAhead(applyAction(before, "turnRight").world)
  const where = `На ${n}-й дії герой урізався в перешкоду.`
  const turn =
    leftFree && !rightFree
      ? "Перед цим кроком треба повернути ліворуч ↺."
      : rightFree && !leftFree
        ? "Перед цим кроком треба повернути праворуч ↻."
        : leftFree && rightFree
          ? "Перед цим кроком треба повернути: подивись, куди веде стежка."
          : "Тут глухий кут: схоже, герой раніше пішов не туди."
  const tips = [`${where} ${turn}`]
  if (has("repeat")) tips.push("Якщо цей крок у «повторити», перевір число повторень: можливо, воно завелике.")
  return tips
}

const itemAdvice = (level: Level, result: RunResult, has: (b: BlockName) => boolean): ReadonlyArray<string> => {
  const left = result.world.crystals
  if (!level.goals.some((g) => g.type === "crystals") || left.size === 0) return []
  const item = level.scene?.item ?? "crystal"
  const noun = NOUNS[item]
  const verb = item === "campfire" ? "запалив" : "взяв"
  const start = parseMap(level.map, level.dir)
  const visited = new Set([
    cellKey(start.hero.x, start.hero.y),
    ...result.frames.map((f) => cellKey(f.world.hero.x, f.world.hero.y))
  ])
  const missed = [...left].filter((key) => visited.has(key)).length
  const unreached = left.size - missed
  const tips: Array<string> = []
  const passed = `Герой дійшов до ${noun.to[missed === 1 ? 0 : 1]}, але не ${verb} ${noun.it[missed === 1 ? 0 : 1]}.`
  if (missed > 0 && !has("collect")) tips.push(`У програмі немає блока «взяти». ${passed}`)
  else if (missed > 0) tips.push(`${passed} Постав «взяти» одразу після кроку, яким він туди стає.`)
  if (unreached > 0) tips.push(`Ще ${unreached} — там, куди герой не дійшов: потрібно більше кроків або повторень.`)
  return tips
}

const finishAdvice = (level: Level, result: RunResult): ReadonlyArray<string> => {
  if (!level.goals.some((g) => g.type === "finish") || result.world.finish === null) return []
  const { x, y } = result.world.hero
  if (result.world.finish.x === x && result.world.finish.y === y) return []
  const d = distanceToFinish(result.world, { x, y })
  if (d === null) return []
  return [`Програма закінчилась, коли до мети лишалось ${d} ${steps(d)}. Додай дій або збільш число повторень.`]
}

/** What is extra in a program: a «взяти» on an empty cell, turns that cancel out. */
const extraAdvice = (level: Level, frames: ReadonlyArray<Frame>): ReadonlyArray<string> => {
  const tips: Array<string> = []
  const empty = frames.filter((f) => f.outcome === "nothingToCollect").length
  const canAsk = level.blocks.includes("if") && level.blocks.includes("onCrystal")
  if (empty > 0)
    tips.push(
      `«Взяти» ${empty} ${times(empty)} спрацював на порожній клітинці. ${canAsk ? "Прибери зайвий «взяти» або сховай його в «якщо тут щось є?»." : "Прибери зайвий «взяти»."}`
    )
  const turns = wastedTurns(frames)
  if (turns.cancel) tips.push("Поворот ліворуч і одразу праворуч гасять один одного: прибери обидва.")
  if (turns.triple) tips.push("Три повороти в один бік — це один поворот в інший бік.")
  return tips
}

export const adviseRun = (level: Level, program: Program, result: RunResult): ReadonlyArray<string> => {
  const used = usedBlocks(program)
  const has = (b: BlockName) => used.has(opcodeOf(b))
  const loops = has("repeat") || has("repeatUntil") || has("forever")
  if (result.passed) {
    if (level.stars === undefined || result.stars === 3) return []
    const tips = [`Блоків ${result.blocks}, а для трьох зірок досить ${level.stars.three}.`]
    if (!loops && level.blocks.includes("repeat")) tips.push("Знайди дії, що повторюються, і поклади їх у «повторити».")
    return [...tips, ...extraAdvice(level, result.frames)].slice(0, MAX_ADVICE)
  }
  switch (result.reason) {
    case "crashed":
      return [...crashAdvice(level, result, has), ...extraAdvice(level, result.frames)].slice(0, MAX_ADVICE)
    case "goalsNotMet":
      return [...itemAdvice(level, result, has), ...finishAdvice(level, result), ...extraAdvice(level, result.frames)].slice(
        0,
        MAX_ADVICE
      )
    case "tooLong":
      return has("repeatUntil") || has("forever")
        ? ["Герой ходить без кінця. Перевір умову в «повторити до»: чи стане вона колись правдою?"]
        : []
    default:
      return []
  }
}
