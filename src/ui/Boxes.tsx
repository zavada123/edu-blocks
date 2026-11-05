import type { Box } from "../core/python/boxes.ts"

const KIND_WORDS: Readonly<Record<Box["kind"], string>> = {
  int: "ціле число",
  float: "число з крапкою",
  str: "слова",
  bool: "так чи ні",
  list: "список"
}

/**
 * «Скриньки» under the code: the variables of the program at the moment the run shows, as boxes with a name. The kind
 * gives each box its look, so 5 and "5" differ at once. A new value pops in, so the student sees the old one go.
 */
export const Boxes = ({ boxes }: { readonly boxes: ReadonlyArray<Box> }) =>
  boxes.length === 0 ? null : (
    <section className="eb-boxes" aria-label="Скриньки: що лежить у змінних">
      <span className="eb-boxes-title" aria-hidden="true">
        Скриньки
      </span>
      <ul className="eb-boxes-list">
        {boxes.map((b) => (
          <li key={b.name} className={`eb-box eb-box-${b.kind}`}>
            <span className="eb-box-name">{b.name}</span>
            <span key={b.value} className="eb-box-value">
              {b.value}
            </span>
            <span className="eb-box-kind">{KIND_WORDS[b.kind]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
