import type { Issue } from "./kit.ts"
import type { FinishKind, ItemKind, Level, Season } from "./level.ts"
import { parseMap } from "./world.ts"

/**
 * Whether the words of a level match what the student sees: a task that sends the hero home needs a house on the
 * field, «firewood» needs firewood, not crystals. Only advice: the editor shows it next to the other checks.
 */

/** A word that starts with one of these stems, not in the middle of another word. */
const stems = (...list: ReadonlyArray<string>): RegExp => new RegExp(`(?:^|[^а-яіїєґ'’])(?:${list.join("|")})`, "i")

const ITEM_WORDS: Readonly<Record<ItemKind, RegExp>> = {
  crystal: stems("кристал"),
  wood: stems("дров", "поліно", "поліна"),
  apple: stems("яблук", "яблуч"),
  fish: stems("риб"),
  key: stems("ключ"),
  campfire: stems("вогнищ", "багатт")
}

const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
  crystal: "кристали",
  wood: "дрова",
  apple: "яблука",
  fish: "риба",
  key: "ключ",
  campfire: "вогнища"
}

const FINISH_WORDS: Readonly<Record<Exclude<FinishKind, "home">, RegExp>> = {
  well: stems("криниц"),
  grandma: stems("бабус", "бабц"),
  flag: stems("прапор")
}

const FINISH_NAMES: Readonly<Record<FinishKind, string>> = { flag: "прапорець", well: "криниця", grandma: "бабуся", home: "дім" }

const HOUSE_WORDS = stems("хат", "будин", "дім", "додому", "домівк", "хатин")
const ENEMY_WORDS = stems("ворог", "монстр", "слиз", "гоблін", "черепа", "череп ", "ведмед", "бос", "дух")
const BRIDGE_WORDS = stems("міст", "мост")

const SEASON_WORDS: Readonly<Record<Season, RegExp>> = {
  winter: stems("зим", "сніг", "снігу", "мороз"),
  spring: stems("весн", "дощ"),
  summer: stems("літо", "літа", "літн", "спек"),
  autumn: stems("осін", "осен", "листопад")
}

const SEASON_NAMES: Readonly<Record<Season, string>> = { winter: "зима", spring: "весна", summer: "літо", autumn: "осінь" }

/** Pack pictures that read as a house. */
const HOUSE_ASSET = /house|home|building|hut|cabin|barn|castle|tower|church/i

const hasHouse = (level: Level): boolean => {
  const scene = level.scene ?? {}
  return (
    (scene.props ?? []).some((p) => p.kind === "house") ||
    (scene.sprites ?? []).some((s) => HOUSE_ASSET.test(s.asset)) ||
    (scene.finish === "home" && scene.finishLook !== undefined && HOUSE_ASSET.test(scene.finishLook))
  )
}

/** Advice where the text of a level and its field disagree. */
export const storyIssues = (level: Level): ReadonlyArray<Issue> => {
  const text = [level.title, ...level.task, level.hint ?? ""].join(" ").toLowerCase()
  const scene = level.scene ?? {}
  const issues: Array<Issue> = []
  const warn = (t: string) => issues.push({ level: "warning", text: t })
  let world
  try {
    world = parseMap(level.map, level.dir)
  } catch {
    return []
  }
  const wantsFinish = level.goals.some((g) => g.type === "finish")

  const finish = scene.finish ?? "flag"
  if (finish === "home" && !hasHouse(level)) warn("Мета «Дім», а будинку на полі немає: постав «Хату» дверима на F або картинку будинку")
  else if (HOUSE_WORDS.test(text) && !hasHouse(level)) warn("У тексті є хата чи дім, а на полі будинку немає")

  if (world.totalCrystals > 0 && scene.itemLook === undefined) {
    const item = scene.item ?? "crystal"
    const named = (Object.keys(ITEM_WORDS) as ReadonlyArray<ItemKind>).filter((k) => ITEM_WORDS[k].test(text))
    if (named.length > 0 && !named.includes(item))
      warn(`У тексті ${named.map((k) => `«${ITEM_NAMES[k]}»`).join(", ")}, а на полі предмети — ${ITEM_NAMES[item]}`)
  }

  if (wantsFinish && world.finish !== null && scene.finishLook === undefined && finish !== "home") {
    const named = (Object.keys(FINISH_WORDS) as ReadonlyArray<Exclude<FinishKind, "home">>).filter((k) => FINISH_WORDS[k].test(text))
    if (named.length > 0 && !named.includes(finish))
      warn(`У тексті ${named.map((k) => `«${FINISH_NAMES[k]}»`).join(", ")}, а мета на полі — ${FINISH_NAMES[finish]}`)
  }

  if (ENEMY_WORDS.test(text) && (level.enemies ?? []).length === 0) warn("У тексті є вороги, а на полі їх немає")
  if (BRIDGE_WORDS.test(text) && scene.ground !== "bridge" && !(scene.sprites ?? []).some((s) => /bridge/i.test(s.asset)))
    warn("У тексті є міст, а підлога рівня не «міст над водою»")

  const theme = scene.theme ?? "summer"
  const seasons = (Object.keys(SEASON_WORDS) as ReadonlyArray<Season>).filter((k) => SEASON_WORDS[k].test(text))
  if (seasons.length > 0 && !seasons.includes(theme))
    warn(`У тексті ${seasons.map((k) => `«${SEASON_NAMES[k]}»`).join(", ")}, а пора року на полі — ${SEASON_NAMES[theme]}`)
  return issues
}
