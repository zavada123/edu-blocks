import { buildProgram } from "./build.ts"
import type { Level } from "./level.ts"
import type { Program } from "./program.ts"
import { toPython } from "./python/convert.ts"

/** The blocks a «Зламаний робот» level opens with, or null for a level without a broken program. */
export const brokenProgram = (level: Level): Program | null =>
  level.broken === undefined ? null : buildProgram(level.broken.steps, level.broken.definition)

/** The broken program of a level as Python code, or null for a level without one. */
export const brokenSource = (level: Level): string | null =>
  level.broken === undefined ? null : toPython(level, level.broken.steps, level.broken.definition).source
