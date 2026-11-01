import type { Level, LevelField } from "./level.ts"
import type { RunResult } from "./program.ts"

/**
 * Levels with more than one field. The same program runs on each field, and the level passes only when every field
 * passes: a student who learned the steps of one map by heart has to think in loops and questions instead.
 */

/** Fields a level can have, its own map included. More would make a run long to watch. */
export const MAX_FIELDS = 4

/** A field as a level of its own: the same blocks, goals and stars on the field's map. */
const fieldLevel = (level: Level, field: LevelField): Level => {
  const { fields: _fields, enemies: _enemies, dir, maxSteps, scene, ...rest } = level
  const fieldDir = field.dir ?? dir
  const fieldSteps = field.maxSteps ?? maxSteps
  const fieldScene = field.scene ?? scene
  return {
    ...rest,
    map: field.map,
    ...(fieldDir === undefined ? {} : { dir: fieldDir }),
    ...(fieldSteps === undefined ? {} : { maxSteps: fieldSteps }),
    ...(fieldScene === undefined ? {} : { scene: fieldScene }),
    ...(field.enemies === undefined ? {} : { enemies: field.enemies })
  }
}

/** The fields of a level as levels, its own map first. A level without `fields` has one field: itself. */
export const levelFields = (level: Level): ReadonlyArray<Level> => {
  const extra = level.fields ?? []
  if (extra.length === 0) return [level]
  const { fields: _fields, ...first } = level
  return [first, ...extra.slice(0, MAX_FIELDS - 1).map((f) => fieldLevel(level, f))]
}

/** How many fields a level has, its own map included. */
export const fieldCount = (level: Level): number => levelFields(level).length

/**
 * One grade from the runs of every field, in field order. The program passes when every field passes; the frames are
 * those of the first field that failed, or of the first field when all passed. With more than one field the result
 * names the field its frames are from (`field`) and which fields passed (`fields`). One field gives its run as it is.
 */
export const combineFields = (results: ReadonlyArray<RunResult>): RunResult => {
  const first = results[0]
  if (first === undefined) throw new Error("combineFields needs the run of at least one field")
  if (results.length === 1) return first
  const fields = results.map((r) => r.passed)
  const failed = fields.indexOf(false)
  const field = failed === -1 ? 0 : failed
  const shown = results[field] ?? first
  return { ...shown, field, fields }
}
