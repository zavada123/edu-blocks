import { describe, expect, test } from "vitest"
import { levels } from "../levels/index.ts"
import { solutions } from "../levels/solutions.ts"
import { buildProgram, type Step } from "./build.ts"
import { levelFields } from "./fields.ts"
import { judgeField, judgeProgram } from "./judge.ts"
import type { Level } from "./level.ts"
import { canContinue, continuedResult, isPiece, joinPrograms, joinSources, linesBefore, MAX_PIECES, pieceBlockId, piecesStars, scriptCount } from "./pieces.ts"
import { judgePython } from "./python/judge.ts"
import { solutionSource } from "./python/convert.ts"

const line: Level = {
  id: "t",
  title: "Тест",
  task: ["Дійди до прапорця."],
  map: ["#######", "#S...F#", "#######"],
  blocks: ["move", "repeat"],
  goals: [{ type: "finish" }]
}

/** The top-level steps cut at the given places: [a, b, c, d] cut at [1, 3] gives [a], [b, c], [d]. */
const cut = (steps: ReadonlyArray<Step>, at: ReadonlyArray<number>): ReadonlyArray<ReadonlyArray<Step>> => {
  const ends = [...at, steps.length]
  return ends.map((end, i) => steps.slice(i === 0 ? 0 : ends[i - 1], end))
}

/** The places to cut a solution of `n` top-level steps: one, two and three cuts where it is long enough. */
const cutsOf = (n: number): ReadonlyArray<ReadonlyArray<number>> =>
  [[1], [Math.floor(n / 2)], [1, n - 1], [1, Math.floor(n / 2), n - 1]].filter((c) => c.every((p, i) => p > 0 && p < n && (i === 0 || p > (c[i - 1] ?? 0))))

describe("joinPrograms", () => {
  test("pieces run one after another give the same run as the solution in one program", () => {
    let checked = 0
    for (const level of levels.filter((l) => levelFields(l).length === 1 && l.broken === undefined)) {
      const steps = solutions[level.id]
      if (steps === undefined || steps.length < 2 || level.blocks.includes("procedure") || level.blocks.includes("counter")) continue
      const whole = judgeField(level, buildProgram(steps))
      for (const at of cutsOf(steps.length)) {
        const pieces = cut(steps, at).map((p) => buildProgram(p))
        const joined = joinPrograms(pieces)
        expect(joined, level.id).not.toBeNull()
        const run = judgeField(level, joined ?? {})
        expect(run.passed, `${level.id} cut at ${at.join(",")}`).toBe(whole.passed)
        expect(run.frames.map((f) => f.action), level.id).toEqual(whole.frames.map((f) => f.action))
        expect(run.world, level.id).toEqual(whole.world)
        expect(run.blocks, level.id).toBe(whole.blocks)
        // Each shorter join is the start of the longer one: the screen can play just the new frames.
        for (let k = 1; k < pieces.length; k++) {
          const before = judgeField(level, joinPrograms(pieces.slice(0, k)) ?? {})
          if (before.reason !== "goalsNotMet") continue
          expect(run.frames.slice(0, before.frames.length), level.id).toEqual(before.frames)
        }
        checked++
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  test("joins loops and branches, not only single steps", () => {
    const joined = joinPrograms([buildProgram([{ repeat: 2, body: ["move"] }]), buildProgram(["move", "move"])])
    expect(judgeProgram(line, joined ?? {}).passed).toBe(true)
  })

  test("an empty piece adds nothing", () => {
    const joined = joinPrograms([buildProgram(["move", "move"]), buildProgram([]), buildProgram(["move", "move"])])
    expect(judgeProgram(line, joined ?? {}).passed).toBe(true)
  })

  test("leaves out blocks that are not under the start hat", () => {
    const piece = { ...buildProgram(["move"]), loose: { opcode: "hero_move", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true } }
    const joined = joinPrograms([piece, buildProgram(["move"])]) ?? {}
    expect(Object.keys(joined).some((id) => id.endsWith("loose"))).toBe(false)
    expect(judgeProgram(line, joined).blocks).toBe(2)
  })

  test("a piece with no start hat or two of them is not a piece", () => {
    const noHat = { a: { opcode: "hero_move", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true } }
    const one = buildProgram(["move"])
    const two = { ...one, ...Object.fromEntries(Object.entries(buildProgram(["move"])).map(([id, b]) => [`x${id}`, b])) }
    expect(isPiece(one)).toBe(true)
    expect(isPiece(noHat)).toBe(false)
    expect(isPiece(two)).toBe(false)
    expect([scriptCount(noHat), scriptCount(one), scriptCount(two)]).toEqual([0, 1, 2])
    expect(joinPrograms([one, noHat])).toBeNull()
  })
})

describe("pieceBlockId", () => {
  test("finds the editor's block of the new piece in the joined program", () => {
    const pieces = [buildProgram(["move"]), buildProgram(["move"])]
    const joined = joinPrograms(pieces) ?? {}
    const run = judgeProgram(line, joined)
    const second = run.frames[1]?.blockId ?? null
    expect(pieceBlockId(second, 1)).not.toBeNull()
    expect(Object.hasOwn(pieces[1] ?? {}, pieceBlockId(second, 1) ?? "")).toBe(true)
    expect(pieceBlockId(run.frames[0]?.blockId ?? null, 1)).toBeNull()
    expect(pieceBlockId(null, 0)).toBeNull()
  })
})

describe("joinSources", () => {
  test("Python pieces run one after another like one program", () => {
    expect(joinSources(["hero.move()", "hero.move()\n"])).toBe("hero.move()\nhero.move()\n")
    const pieces = ["for i in range(2):\n    hero.move()\n", "hero.move()\nhero.move()"]
    expect(judgePython(line, joinSources(pieces)).passed).toBe(true)
  })

  test("counts the lines of the earlier pieces", () => {
    expect(linesBefore([])).toBe(0)
    expect(linesBefore(["hero.move()"])).toBe(1)
    expect(linesBefore(["hero.move()\nhero.move()\n", "x = 1"])).toBe(3)
  })

  test("a solution cut into Python pieces still passes", () => {
    const level = levels.find((l) => l.id === "g3-steps")
    if (level === undefined) throw new Error("g3-steps is missing")
    const lines = solutionSource(level).split("\n")
    expect(judgePython(level, joinSources([lines.slice(0, 2).join("\n"), lines.slice(2).join("\n")])).passed).toBe(true)
  })
})

describe("canContinue", () => {
  const ended = judgeProgram(line, buildProgram(["move"]))
  test("only when the program ended before the goals", () => {
    expect(ended.reason).toBe("goalsNotMet")
    expect(canContinue(line, ended, "blocks", 1)).toBe(true)
    expect(canContinue(line, { ...ended, reason: "crashed" }, "blocks", 1)).toBe(false)
    expect(canContinue(line, { ...ended, reason: "trapped" }, "blocks", 1)).toBe(false)
    expect(canContinue(line, { ...ended, reason: "tooLong" }, "blocks", 1)).toBe(false)
  })
  test("not on levels that need one program, and not past the last piece", () => {
    expect(canContinue({ ...line, fields: [{ map: line.map }] }, ended, "blocks", 1)).toBe(false)
    expect(canContinue({ ...line, broken: { steps: ["move"] } }, ended, "blocks", 1)).toBe(false)
    expect(canContinue({ ...line, blocks: ["move", "procedure"] }, ended, "blocks", 1)).toBe(false)
    expect(canContinue({ ...line, blocks: ["move", "procedure"] }, ended, "python", 1)).toBe(true)
    expect(canContinue(line, ended, "blocks", MAX_PIECES)).toBe(false)
  })
})

describe("piecesStars and continuedResult", () => {
  test("more than one piece gives at most two stars, but not in the first chapter", () => {
    expect(piecesStars(3, 1, false)).toBe(3)
    expect(piecesStars(3, 2, false)).toBe(2)
    expect(piecesStars(1, 2, false)).toBe(1)
    expect(piecesStars(3, 2, true)).toBe(3)
  })
  test("plays only the frames after the earlier pieces", () => {
    const run = judgeProgram(line, buildProgram(["move", "move", "move", "move"]))
    expect(continuedResult(run, 0)).toBe(run)
    expect(continuedResult(run, 1).frames).toEqual(run.frames.slice(1))
    expect(continuedResult(run, 1).passed).toBe(true)
    expect(continuedResult(run, 99)).toBe(run)
  })
})
