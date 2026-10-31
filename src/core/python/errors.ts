/**
 * A mistake in a student's Python program, with the line it is on. Every message is in Ukrainian and says what to
 * change, not only what is wrong: the students are 9 to 12 years old.
 */
export class PyError extends Error {
  constructor(
    message: string,
    /** 1-based line of the program. */
    readonly line: number
  ) {
    super(message)
    this.name = "PyError"
  }
}

/** Edit distance, a swap of two neighbouring letters counted as one edit: to suggest the name a student meant. */
const distance = (a: string, b: string): number => {
  const rows: Array<Array<number>> = [Array.from({ length: b.length + 1 }, (_, j) => j)]
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const up = rows[i - 1] ?? []
      let d = Math.min((up[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (up[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, (rows[i - 2]?.[j - 2] ?? 0) + 1)
      row[j] = d
    }
    rows.push(row)
  }
  return rows[a.length]?.[b.length] ?? 0
}

/** The closest known name, when it is close enough to be a typo; the same name in other letter case first. */
export const closest = (name: string, known: Iterable<string>): string | null => {
  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of known) {
    if (candidate.toLowerCase() === name.toLowerCase()) return candidate
    const d = distance(name, candidate)
    if (d < bestDistance) {
      best = candidate
      bestDistance = d
    }
  }
  return best !== null && bestDistance <= Math.max(1, Math.floor(name.length / 3)) ? best : null
}
