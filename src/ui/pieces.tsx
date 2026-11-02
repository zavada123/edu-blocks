import { useCallback, useEffect, useRef, useState } from "react"
import { canContinue, continuedResult, piecesStars } from "../core/pieces.ts"
import type { Level } from "../core/level.ts"
import type { RunResult } from "../core/program.ts"
import type { World } from "../core/world.ts"

/**
 * The pieces of «Продовжити звідси» on the screen, the same for blocks and for Python. `T` is a piece: a block program
 * or a Python source. See `core/pieces.ts` for the rules.
 */

/** The pieces the student has run, and where the hero stood after them. */
export interface Done<T> {
  readonly pieces: ReadonlyArray<T>
  /** Frames of the joined run of these pieces: the screen plays only the frames after them. */
  readonly frames: number
  /** The world after these pieces: the field starts from it. */
  readonly world: World
  /** Blocks (or the size of the code) of these pieces together. */
  readonly blocks: number
}

/** Shown under a pass in more than one piece, when the pieces cost a star. */
export const JOIN_TIP = "Склади все в одну програму, і буде 3 зірки."

/**
 * The done pieces of this try. `ref` changes at once, before React draws, so an editor that loads a new piece can
 * tell that it is a piece. A new level starts with none.
 */
export const usePieces = <T,>(level: Level) => {
  const [done, setDoneState] = useState<Done<T> | null>(null)
  const ref = useRef<Done<T> | null>(null)
  const setDone = useCallback((next: Done<T> | null) => {
    ref.current = next
    setDoneState(next)
  }, [])
  useEffect(() => setDone(null), [level, setDone])
  return { done, ref, setDone }
}

/** How a run of the joined program shows and pays: the frames after the done pieces, the stars of all the pieces. */
export const gradePieces = <T,>(
  level: Level,
  full: RunResult,
  done: Done<T> | null,
  large: boolean,
  language: "blocks" | "python"
): { readonly full: RunResult; readonly shown: RunResult; readonly pieces: number; readonly canGoOn: boolean; readonly capped: boolean } => {
  const pieces = (done?.pieces.length ?? 0) + 1
  const stars = piecesStars(full.stars, pieces, large)
  const graded = stars === full.stars ? full : { ...full, stars }
  return {
    full: graded,
    shown: continuedResult(graded, done?.frames ?? 0),
    pieces,
    canGoOn: canContinue(level, graded, language, pieces),
    capped: graded.passed && stars < full.stars
  }
}

/** The pieces done, over the editor: what is behind the hero, and the ways back to one program. */
export const PiecesBar = ({
  done,
  unit,
  onJoin,
  onRestart
}: {
  readonly done: Done<unknown> | null
  /** The word for what `blocks` counts, for 1, 2 and 5: «блок», «блоки», «блоків». */
  readonly unit: readonly [string, string, string]
  /** Puts all the pieces into the editor as one program. */
  readonly onJoin: () => void
  /** Leaves the pieces and puts the hero back at the start. */
  readonly onRestart: () => void
}) =>
  done === null ? null : (
    <div className="eb-pieces" role="status">
      <p>
        <strong>Вже зроблено:</strong> {countOf(done.pieces.length, PIECE_FORMS)}, {countOf(done.blocks, unit)}. Герой продовжить звідси.
      </p>
      <div className="eb-pieces-actions">
        <button type="button" className="eb-btn eb-btn-small" onClick={onJoin} title="Усі шматки стануть однією програмою, а герой повернеться на старт">
          Зібрати в одну програму
        </button>
        <button type="button" className="eb-btn eb-btn-small" onClick={onRestart}>
          Почати спочатку
        </button>
      </div>
    </div>
  )

const PIECE_FORMS = ["шматок", "шматки", "шматків"] as const

/** «1 шматок», «2 шматки», «5 шматків». */
const countOf = (n: number, forms: readonly [string, string, string]): string => {
  const last = n % 10
  const tens = n % 100
  const form = last === 1 && tens !== 11 ? forms[0] : last >= 2 && last <= 4 && (tens < 12 || tens > 14) ? forms[1] : forms[2]
  return `${n} ${form}`
}
