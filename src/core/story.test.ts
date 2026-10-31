import { describe, expect, test } from "vitest"
import type { Level } from "./level.ts"
import { storyIssues } from "./story.ts"

const base: Level = {
  id: "t",
  title: "Рівень",
  task: ["Збери кристали."],
  map: ["#####", "#S.c#", "#####"],
  blocks: ["move", "collect"],
  goals: [{ type: "crystals" }]
}

const texts = (level: Level) => storyIssues(level).map((i) => i.text)

describe("storyIssues", () => {
  test("a level whose text matches its field gets no advice", () => {
    expect(texts(base)).toEqual([])
  })

  test("a task that sends the hero home needs a house on the field", () => {
    const level: Level = { ...base, task: ["Віднеси дрова до хати."], scene: { item: "wood" } }
    expect(texts(level)).toEqual(["У тексті є хата чи дім, а на полі будинку немає"])
    const withHouse: Level = { ...level, scene: { item: "wood", props: [{ kind: "house", x: 0, y: -3 }] } }
    expect(texts(withHouse)).toEqual([])
    const withPicture: Level = { ...level, scene: { item: "wood", sprites: [{ asset: "tiny-swords:building/house", x: 1, y: -2 }] } }
    expect(texts(withPicture)).toEqual([])
  })

  test("the goal «home» without a house is named", () => {
    const level: Level = { ...base, map: ["#####", "#S.F#", "#####"], goals: [{ type: "finish" }], scene: { finish: "home" } }
    expect(texts(level)[0]).toMatch(/Мета «Дім», а будинку на полі немає/)
  })

  test("the items of the text and of the field differ", () => {
    const level: Level = { ...base, task: ["Візьми всі яблука."] }
    expect(texts(level)).toEqual(["У тексті «яблука», а на полі предмети — кристали"])
    expect(texts({ ...level, scene: { item: "apple" } })).toEqual([])
    // A picture from a pack makes the items look as the author wants.
    expect(texts({ ...level, scene: { itemLook: "ninja-adventure:item/apple" } })).toEqual([])
  })

  test("enemies, the bridge and the season of the text are on the field", () => {
    const level: Level = { ...base, task: ["Зимою по мосту ходить ворог. Збери кристали."] }
    expect(texts(level)).toEqual([
      "У тексті є вороги, а на полі їх немає",
      "У тексті є міст, а підлога рівня не «міст над водою»",
      "У тексті «зима», а пора року на полі — літо"
    ])
  })

  test("a stem inside another word does not count", () => {
    // «політ» has «літ» inside, «зарибнення» is not about fish on the field.
    expect(texts({ ...base, task: ["Політ над кристалами."] })).toEqual([])
  })
})
