import { describe, expect, test } from "vitest"
import type { Level } from "../level.ts"
import { pythonMethodsOf } from "./api.ts"
import { judgePython } from "./judge.ts"
import { tokenize } from "./lexer.ts"
import { parse } from "./parser.ts"
import { programSize } from "./size.ts"

const level: Level = {
  id: "py-test",
  title: "Тест",
  task: [],
  map: ["#######", "#S..c.#", "#######"],
  blocks: ["move", "turnLeft", "turnRight", "collect", "wallAhead", "onCrystal", "counter"],
  goals: [{ type: "crystals" }]
}

/** What the program prints, run on a level the hero cannot finish by itself. */
const printed = (source: string): ReadonlyArray<string> => {
  const r = judgePython(level, source)
  expect(r.detail, source).toBeUndefined()
  return r.output ?? []
}

const error = (source: string, on: Level = level) => {
  const r = judgePython(on, source)
  expect(r.reason, source).toBe("badProgram")
  return { line: r.line, text: r.detail ?? "" }
}

describe("tokens", () => {
  test("indents and dedents follow the blocks", () => {
    const kinds = tokenize("if True:\n    x = 1\n\n    # comment\ny = 2").map((t) => t.kind)
    expect(kinds).toEqual(["keyword", "keyword", "op", "newline", "indent", "name", "op", "number", "newline", "dedent", "name", "op", "number", "newline", "eof"])
  })

  test("a line goes on inside brackets", () => {
    expect(parse("x = [1,\n  2,\n  3]\nprint(x)")).toHaveLength(2)
  })

  test("Ukrainian names are names", () => {
    expect(printed("кроки = 3\nprint(кроки * 2)")).toEqual(["6"])
  })
})

describe("the language", () => {
  test("numbers follow Python", () => {
    expect(printed("print(7 / 2, 7 // 2, -7 // 2, -7 % 3, 2 ** 10, True + 1)")).toEqual(["3.5 3 -4 2 1024 2"])
  })

  test("texts and lists", () => {
    expect(printed("a = [1, 'b']\na.append(3)\nprint(a, len(a), a[-1], 'b' in a, 'ab' * 2)")).toEqual(["[1, 'b', 3] 3 3 True abab"])
  })

  test("if, elif and else", () => {
    const src = "for n in [1, 5, 9]:\n    if n < 3:\n        print('мало')\n    elif n < 7:\n        print('середньо')\n    else:\n        print('багато')"
    expect(printed(src)).toEqual(["мало", "середньо", "багато"])
  })

  test("while with break and continue", () => {
    const src = "i = 0\nwhile True:\n    i += 1\n    if i % 2 == 0:\n        continue\n    if i > 5:\n        break\n    print(i)"
    expect(printed(src)).toEqual(["1", "3", "5"])
  })

  test("chained comparisons", () => {
    expect(printed("x = 5\nprint(1 < x <= 5, 1 < x < 3)")).toEqual(["True False"])
  })

  test("functions return values and call themselves", () => {
    expect(printed("def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\nprint(f(5))")).toEqual(["120"])
  })

  test("a function's variables are its own unless global", () => {
    const src = "x = 1\ndef a():\n    x = 2\ndef b():\n    global x\n    x = 3\na()\nprint(x)\nb()\nprint(x)"
    expect(printed(src)).toEqual(["1", "3"])
  })

  test("one-line blocks", () => {
    expect(printed("if True: print('так')\nfor i in range(2): print(i)")).toEqual(["так", "0", "1"])
  })

  test("min, max, sum, abs, str, int", () => {
    expect(printed("print(min(3, 1), max([2, 8]), sum([1, 2, 3]), abs(-4), str(5) + '!', int('42') + 1)")).toEqual(["1 8 6 4 5! 43"])
  })
})

describe("the hero", () => {
  test("hero.move(n) makes n steps, each a frame", () => {
    const r = judgePython(level, "hero.move(3)\nhero.collect()")
    expect(r.passed).toBe(true)
    expect(r.frames.map((f) => f.action)).toEqual(["move", "move", "move", "collect"])
  })

  test("questions answer from the world", () => {
    const r = judgePython(level, "while not hero.item_here():\n    hero.move()\nhero.collect()")
    expect(r.passed).toBe(true)
  })

  test("a crash ends the run", () => {
    const r = judgePython(level, "hero.move(10)")
    expect(r.reason).toBe("crashed")
    expect(r.frames).toHaveLength(5)
  })

  test("the counter is shown on a level with «лічильник»", () => {
    const r = judgePython(level, "лічильник = 0\nfor i in range(3):\n    лічильник += 1\n    hero.move()")
    expect(r.frames.map((f) => f.counter)).toEqual(["1", "2", "3"])
  })

  test("the level opens only its methods", () => {
    expect(pythonMethodsOf(level.blocks).map((m) => m.name)).toEqual(["move", "turn_left", "turn_right", "collect", "wall_ahead", "item_here"])
    expect(error("hero.attack()").text).toContain("ще не відкрито")
  })

  test("an endless loop stops as too long", () => {
    expect(judgePython(level, "while True:\n    pass").reason).toBe("tooLong")
    expect(judgePython(level, "while True:\n    hero.turn_left()").reason).toBe("tooLong")
  })

  test("an empty program has no start", () => {
    expect(judgePython(level, "# тільки коментар\n").reason).toBe("noStart")
  })
})

describe("mistakes, in Ukrainian with the line", () => {
  test.each([
    ["hero.move()\nif hero.wall_ahead()\n    hero.turn_left()", 2, "двокрапка"],
    ["while True:\nhero.move()", 2, "зсунути вправо"],
    ["hero.move()\n    hero.move()", 2, "Зайвий відступ"],
    ["if True:\n        x = 1\n    y = 2", 3, "Відступ не збігається"],
    ["hero.move(", 1, "не закрита"],
    ["x = 'abc", 1, "не закрито"],
    ["if x = 1:\n    pass", 1, "=="],
    ["hero.jump()", 1, "Герой не вміє"],
    ["hero.mvoe()", 1, "hero.move()"],
    ["Hero.move()", 1, "hero"],
    ["hero.move", 1, "дужки"],
    ["x = true", 1, "True"],
    ["While True:\n    pass", 1, "пиши «while»"],
    ["hero.move()\nprint(кроки)", 2, "не знає імені «кроки»"],
    ["print('a' + 1)", 1, "str("],
    ["for i in 3:\n    pass", 1, "range(3)"],
    ["x = [1]\nprint(x[5])", 2, "немає елемента"],
    ["print(1 / 0)", 1, "нуль"],
    ["break", 1, "циклу"],
    ["return 1", 1, "функції"],
    ["if True:\n    pass\nelse if False:\n    pass", 3, "elif"],
    ["def f(a):\n    pass\nf()", 3, "чекає 1"],
    ["def f():\n    f()\nf()", 2, "забагато разів"],
    ["def f():\n    print(x)\n    x = 1\nf()", 2, "ще не має значення"],
    ["import math", 1, "import"],
    ["hero = 5", 1, "зайняте"],
    ["hero.move(1, 2)", 1, "одне число"],
    ["hero.turn_left(2)", 1, "нічого не приймає"]
  ])("%j", (source, line, text) => {
    const e = error(source)
    expect(e.line).toBe(line)
    expect(e.text).toContain(text)
  })

  test("the hero's steps before a mistake are kept for playback", () => {
    const r = judgePython(level, "hero.move()\nhero.move()\nprint(y)")
    expect(r.reason).toBe("badProgram")
    expect(r.frames).toHaveLength(2)
  })
})

describe("size for the stars", () => {
  test.each([
    ["hero.move()\nhero.move()", 2],
    ["for i in range(5):\n    hero.move()", 2],
    ["while not hero.wall_ahead():\n    hero.move()", 3],
    ["while True:\n    if hero.item_here():\n        hero.collect()\n    else:\n        hero.move()", 5],
    ["лічильник = 3\nfor i in range(лічильник):\n    hero.move()", 4],
    ["def обійти():\n    hero.turn_left()\nобійти()", 3],
    ["hero.move(3)", 1]
  ])("%j is %i", (source, size) => {
    expect(programSize(parse(source))).toBe(size)
  })
})
