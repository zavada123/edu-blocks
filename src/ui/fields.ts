import { useEffect, useMemo, useState } from "react"
import { levelFields } from "../core/fields.ts"
import { type Level, startWorld } from "../core/level.ts"
import type { RunResult } from "../core/program.ts"

/**
 * The fields of a level on the screen: which one is shown and the runs of the last check on each. Blocks and Python
 * share it. A new level starts on its first field with no runs.
 */
export const useFields = (level: Level) => {
  const fields = useMemo(() => levelFields(level), [level])
  const [index, setIndex] = useState(0)
  const [runs, setRuns] = useState<ReadonlyArray<RunResult> | null>(null)
  useEffect(() => {
    setIndex(0)
    setRuns(null)
  }, [level])
  const field = fields[index] ?? fields[0] ?? level
  const start = useMemo(() => startWorld(field), [field])
  return { fields, index, setIndex, runs, setRuns, field, start }
}
