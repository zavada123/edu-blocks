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

/** The window that asks `ask`; `onClose` takes it away after the answer. */
export const WorkshopDialog = ({ ask, onClose }: { readonly ask: Ask; readonly onClose: () => void }) => {
  const cancel = () => {
    if (ask.kind === "text") ask.done(null)
    else if (ask.kind === "alert") ask.done()
    else if (ask.kind === "confirm") ask.done(false)
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
      <div className="eb-workshop eb-frame eb-parchment" role="dialog" aria-modal="true" aria-labelledby="eb-workshop-title">
        {ask.kind === "block" ? (
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

