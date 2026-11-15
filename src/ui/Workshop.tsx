import { useEffect, useRef, useState } from "react"
import { type BlockDraft, draftError, MAX_NAME, MAX_PARAMS } from "./make-block.ts"

/**
 * The windows of «Майстерня» over the editor: the name of a new variable («Створити змінну»), a block with its
 * parameters («Створити блок» and «Змінити» on a «визначити»), and the editor's messages. scratch-blocks asks for
 * them through `prompt`, `alert`, `confirm` and `externalProcedureDefCallback`; the editor answers with these.
 */
export type Ask =
  | { readonly kind: "text"; readonly message: string; readonly value: string; readonly done: (text: string | null) => void }
  | { readonly kind: "alert"; readonly message: string; readonly done: () => void }
  | { readonly kind: "confirm"; readonly message: string; readonly done: (ok: boolean) => void }
  | {
      readonly kind: "block"
      readonly draft: BlockDraft
      /** The words of the other own blocks: the new one must differ. */
      readonly taken: ReadonlyArray<string>
      readonly done: (draft: BlockDraft | null) => void
    }
  /** «Записати в Книгу команд»: an own block goes to a page of the book (or takes the place of its old page). */
  | {
      readonly kind: "bookWrite"
      readonly name: string
      readonly params: ReadonlyArray<string>
      /** The page it goes to, from 1, and the pages of the book. */
      readonly page: number
      readonly size: number
      /** The block has a page already: this writes it again. */
      readonly again: boolean
      readonly done: (ok: boolean) => void
    }
  /** «Книга команд»: its pages, and what the student can do with each. */
  | {
      readonly kind: "book"
      readonly pages: ReadonlyArray<BookEntry>
      readonly size: number
      /** «Взяти на правку»: a copy of the page's «визначити» goes into the program. */
      readonly take: (proccode: string) => void
      /** «Вирвати сторінку». */
      readonly tear: (proccode: string) => void
      readonly done: () => void
    }

/** A page of the book as its window shows it. */
export interface BookEntry {
  readonly proccode: string
  readonly name: string
  readonly params: ReadonlyArray<string>
  /** The page as Python: its `def`. */
  readonly python: string
  /** The program calls the block of this page. */
  readonly called: boolean
  /** The program has its own «визначити» of this block: a copy taken for editing. */
  readonly defined: boolean
}

/** The window that asks `ask`; `onClose` takes it away after the answer. */
export const WorkshopDialog = ({ ask, onClose }: { readonly ask: Ask; readonly onClose: () => void }) => {
  const cancel = () => {
    if (ask.kind === "text") ask.done(null)
    else if (ask.kind === "alert" || ask.kind === "book") ask.done()
    else if (ask.kind === "confirm" || ask.kind === "bookWrite") ask.done(false)
    else ask.done(null)
    onClose()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
  return (
    <div className="eb-picker-layer eb-workshop-layer" onClick={(e) => e.target === e.currentTarget && cancel()}>
      <div
        className={["eb-workshop eb-frame eb-parchment", ask.kind === "book" ? "eb-workshop-wide" : ""].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eb-workshop-title"
      >
        {ask.kind === "book" ? (
          <BookWindow ask={ask} onClose={onClose} />
        ) : ask.kind === "bookWrite" ? (
          <BookWriteForm ask={ask} onClose={onClose} onCancel={cancel} />
        ) : ask.kind === "block" ? (
          <BlockForm ask={ask} onClose={onClose} onCancel={cancel} />
        ) : ask.kind === "text" ? (
          <TextForm ask={ask} onClose={onClose} onCancel={cancel} />
        ) : (
          <>
            <h3 id="eb-workshop-title">{ask.kind === "alert" ? "Зверни увагу" : "Точно?"}</h3>
            <p className="eb-workshop-note">{ask.message}</p>
            <div className="eb-workshop-actions">
              {ask.kind === "confirm" && (
                <button type="button" className="eb-btn eb-btn-small" onClick={cancel}>
                  Ні
                </button>
              )}
              <button
                type="button"
                className="eb-btn eb-btn-small eb-btn-go"
                autoFocus
                onClick={() => {
                  if (ask.kind === "confirm") ask.done(true)
                  else ask.done()
                  onClose()
                }}
              >
                {ask.kind === "confirm" ? "Так" : "Зрозуміло"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const TextForm = ({ ask, onClose, onCancel }: { readonly ask: Extract<Ask, { kind: "text" }>; readonly onClose: () => void; readonly onCancel: () => void }) => {
  const [text, setText] = useState(ask.value)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim() === "") return
        ask.done(text.trim())
        onClose()
      }}
    >
      <h3 id="eb-workshop-title">{ask.message}</h3>
      <label className="eb-workshop-field">
        <span>Назва</span>
        <input autoFocus value={text} maxLength={MAX_NAME} placeholder="наприклад, ходки" onChange={(e) => setText(e.target.value)} />
      </label>
      <p className="eb-workshop-note">Назва каже, що лежить у змінній: «ходки», «дрова», а не «x».</p>
      <div className="eb-workshop-actions">
        <button type="button" className="eb-btn eb-btn-small" onClick={onCancel}>
          Скасувати
        </button>
        <button type="submit" className="eb-btn eb-btn-small eb-btn-go" disabled={text.trim() === ""}>
          Готово
        </button>
      </div>
    </form>
  )
}

const BlockForm = ({ ask, onClose, onCancel }: { readonly ask: Extract<Ask, { kind: "block" }>; readonly onClose: () => void; readonly onCancel: () => void }) => {
  const [draft, setDraft] = useState(ask.draft)
  const [tried, setTried] = useState(false)
  const lastParam = useRef<HTMLInputElement>(null)
  const [focusParam, setFocusParam] = useState(false)
  useEffect(() => {
    if (focusParam) lastParam.current?.focus()
    setFocusParam(false)
  }, [focusParam])
  const error = draftError(draft, ask.taken)
  const setParam = (i: number, name: string) => setDraft({ ...draft, params: draft.params.map((p, j) => (j === i ? name : p)) })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (error !== null) return
        ask.done({ name: draft.name.trim(), params: draft.params.map((p) => p.trim()) })
        onClose()
      }}
    >
      <h3 id="eb-workshop-title">{ask.draft.name === "" ? "Створити блок" : "Змінити блок"}</h3>
      <div className="eb-workshop-preview" aria-hidden="true">
        <span className="eb-workshop-block">
          {draft.name.trim() || "назва"}
          {draft.params.map((p, i) => (
            <span key={i} className="eb-workshop-param">
              {p.trim() || "?"}
            </span>
          ))}
        </span>
      </div>
      <label className="eb-workshop-field">
        <span>Назва блоку</span>
        <input autoFocus value={draft.name} maxLength={MAX_NAME} placeholder="наприклад, пройти" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>
      {draft.params.map((p, i) => (
        <div key={i} className="eb-workshop-field eb-workshop-param-row">
          <label>
            <span>Параметр {i + 1}: число</span>
            <input
              ref={i === draft.params.length - 1 ? lastParam : undefined}
              value={p}
              maxLength={MAX_NAME}
              placeholder="наприклад, кроки"
              onChange={(e) => setParam(i, e.target.value)}
            />
          </label>
          <button
            type="button"
            className="eb-btn eb-btn-small"
            aria-label={`Прибрати параметр ${p.trim() || i + 1}`}
            onClick={() => setDraft({ ...draft, params: draft.params.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="eb-workshop-add">
        <button
          type="button"
          className="eb-btn eb-btn-small"
          disabled={draft.params.length >= MAX_PARAMS}
          onClick={() => {
            setDraft({ ...draft, params: [...draft.params, ""] })
            setFocusParam(true)
          }}
        >
          + параметр-число
        </button>
      </div>
      <p className="eb-workshop-note">
        Параметр — це овал у «визначити». Перетягни його в будь-який блок усередині, наприклад у «повторити», і кожен виклик дасть своє число.
      </p>
      {tried && error !== null && (
        <p className="eb-workshop-error" role="alert">
          {error}
        </p>
      )}
      <div className="eb-workshop-actions">
        <button type="button" className="eb-btn eb-btn-small" onClick={onCancel}>
          Скасувати
        </button>
        <button type="submit" className="eb-btn eb-btn-small eb-btn-go">
          Готово
        </button>
      </div>
    </form>
  )
}

/** A block as the book shows it: its words and a slot for each parameter. */
const BlockChip = ({ name, params }: { readonly name: string; readonly params: ReadonlyArray<string> }) => (
  <span className="eb-workshop-block">
    {name}
    {params.map((p, i) => (
      <span key={i} className="eb-workshop-param">
        {p}
      </span>
    ))}
  </span>
)

const BookWriteForm = ({ ask, onClose, onCancel }: { readonly ask: Extract<Ask, { kind: "bookWrite" }>; readonly onClose: () => void; readonly onCancel: () => void }) => (
  <>
    <h3 id="eb-workshop-title">{ask.again ? "Записати нову версію?" : "Записати в Книгу команд?"}</h3>
    <div className="eb-workshop-preview" aria-hidden="true">
      <BlockChip name={ask.name} params={ask.params} />
    </div>
    <p className="eb-workshop-note">
      {ask.again
        ? `Сторінка ${ask.page} з ${ask.size} уже має цей блок. Нова версія замінить її для всіх наступних днів.`
        : `Сторінка ${ask.page} з ${ask.size}. Блок буде в палітрі щодня, у розділі «З книги», а «визначити» піде з програми в книгу.`}
    </p>
    <div className="eb-workshop-actions">
      <button type="button" className="eb-btn eb-btn-small" onClick={onCancel}>
        Скасувати
      </button>
      <button
        type="button"
        className="eb-btn eb-btn-small eb-btn-go"
        autoFocus
        onClick={() => {
          ask.done(true)
          onClose()
        }}
      >
        Записати
      </button>
    </div>
  </>
)

const BookWindow = ({ ask, onClose }: { readonly ask: Extract<Ask, { kind: "book" }>; readonly onClose: () => void }) => {
  const [chosen, setChosen] = useState(0)
  const page = ask.pages[chosen] ?? ask.pages[0]
  const close = () => {
    ask.done()
    onClose()
  }
  return (
    <>
      <h3 id="eb-workshop-title">Книга команд</h3>
      {page === undefined ? (
        <p className="eb-workshop-note">
          Книга порожня. Зроби свій блок у «Створити блок», потім правий клік на його «визначити» і «Записати в Книгу команд». Сторінок: {ask.size}.
        </p>
      ) : (
        <div className="eb-book">
          <ol className="eb-book-pages">
            {Array.from({ length: ask.size }, (_, i) => {
              const p = ask.pages[i]
              return (
                <li key={i}>
                  {p === undefined ? (
                    <span className="eb-book-empty">порожня сторінка</span>
                  ) : (
                    <button type="button" className={i === chosen ? "eb-book-page eb-book-chosen" : "eb-book-page"} aria-pressed={i === chosen} onClick={() => setChosen(i)}>
                      <BlockChip name={p.name} params={p.params} />
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
          <div className="eb-book-page-view">
            <h4>
              Сторінка {ask.pages.indexOf(page) + 1}: {page.name}
              {page.params.length === 0 ? "" : ` (${page.params.join(", ")})`}
            </h4>
            <pre className="eb-book-code">{page.python}</pre>
            <p className="eb-workshop-note">
              {page.defined
                ? "У програмі є копія цього блоку: поки вона там, програма бере її. Щоб оновити книгу, правий клік на «визначити» і «Записати в Книгу команд»."
                : page.called
                  ? "Програма викликає цей блок зі сторінки."
                  : "Програма зараз цей блок не викликає."}
            </p>
            <div className="eb-workshop-actions eb-book-actions">
              <button
                type="button"
                className="eb-btn eb-btn-small"
                disabled={page.defined}
                onClick={() => {
                  ask.take(page.proccode)
                  close()
                }}
              >
                Взяти на правку
              </button>
              <button
                type="button"
                className="eb-btn eb-btn-small"
                disabled={page.called}
                title={page.called ? "Програма викликає цей блок: спершу прибери виклики" : undefined}
                onClick={() => {
                  ask.tear(page.proccode)
                  close()
                }}
              >
                Вирвати сторінку
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="eb-workshop-actions">
        <span className="eb-workshop-note eb-book-count">
          Сторінок: {ask.pages.length} з {ask.size}
        </span>
        <button type="button" className="eb-btn eb-btn-small eb-btn-go" autoFocus onClick={close}>
          Закрити
        </button>
      </div>
    </>
  )
}

