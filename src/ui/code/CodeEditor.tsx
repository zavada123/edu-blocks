import { autocompletion, closeBrackets, closeBracketsKeymap, type Completion, type CompletionContext } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { python } from "@codemirror/lang-python"
import { bracketMatching, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language"
import { EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import { useEffect, useRef } from "react"
import { HERO_NAME, type PythonMethod } from "../../core/python/api.ts"

/**
 * The code editor: CodeMirror with Python, four-space indents, hints for `hero.` and the lines the run marks — the
 * line the hero acts on now and the line of a mistake.
 */

/** What the page can do with the editor. */
export interface CodeEditorApi {
  /** Puts a line of code at the cursor, on a line of its own with the indent of the line it lands on. */
  readonly insert: (code: string) => void
}

interface Marks {
  readonly run: number | null
  readonly error: number | null
}

const setMarks = StateEffect.define<Marks>()

const runMark = Decoration.line({ class: "eb-code-run" })
const errorMark = Decoration.line({ class: "eb-code-error" })

const marksField = StateField.define<{ readonly marks: Marks; readonly set: DecorationSet }>({
  create: () => ({ marks: { run: null, error: null }, set: Decoration.none }),
  update(value, tr) {
    let marks = value.marks
    for (const e of tr.effects) if (e.is(setMarks)) marks = e.value
    if (marks === value.marks && !tr.docChanged) return value
    return { marks, set: decorate(tr.state, marks) }
  },
  provide: (field) => EditorView.decorations.from(field, (v) => v.set)
})

const decorate = (state: EditorState, marks: Marks): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>()
  const lines = [
    { n: marks.run, mark: runMark },
    { n: marks.error, mark: errorMark }
  ]
    .filter((l): l is { n: number; mark: Decoration } => l.n !== null && l.n >= 1 && l.n <= state.doc.lines)
    .sort((a, b) => a.n - b.n)
  for (const { n, mark } of lines) {
    const line = state.doc.line(n)
    builder.add(line.from, line.from, mark)
  }
  return builder.finish()
}

const KEYWORD_COMPLETIONS: ReadonlyArray<Completion> = [
  { label: "for", type: "keyword", apply: "for i in range(3):", detail: "повторити" },
  { label: "while", type: "keyword", apply: "while not ", detail: "повторювати, поки" },
  { label: "if", type: "keyword", detail: "якщо" },
  { label: "elif", type: "keyword", detail: "інакше якщо" },
  { label: "else", type: "keyword", apply: "else:", detail: "інакше" },
  { label: "def", type: "keyword", detail: "своя функція" },
  { label: "range", type: "function", apply: "range(", detail: "числа від 0" },
  { label: "print", type: "function", apply: "print(", detail: "показати" },
  { label: HERO_NAME, type: "variable", detail: "герой" }
]

/** Hints: the methods of the level after `hero.`, keywords and the hero elsewhere. */
const completions = (methods: ReadonlyArray<PythonMethod>) => (context: CompletionContext) => {
  const member = context.matchBefore(new RegExp(`\\b${HERO_NAME}\\.\\w*`))
  if (member !== null) {
    return {
      from: member.from + HERO_NAME.length + 1,
      options: methods.map((m) => ({ label: m.name, type: "method", apply: `${m.name}()`, detail: m.doc }))
    }
  }
  const word = context.matchBefore(/[\p{L}_][\p{L}\p{N}_]*/u)
  if (word === null || (word.from === word.to && !context.explicit)) return null
  return { from: word.from, options: KEYWORD_COMPLETIONS }
}

/** The colours of the code, from the tokens of the game screen (theme.css). */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.definitionKeyword, tags.moduleKeyword], color: "var(--eb-code-kw)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.propertyName], color: "var(--eb-code-fn)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--eb-code-num-lit)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--eb-code-str)" },
  { tag: tags.comment, color: "var(--eb-code-comment)", fontStyle: "italic" },
  { tag: tags.invalid, color: "var(--eb-bad-soft)" }
])

const theme = (large: boolean): Extension =>
  EditorView.theme(
    {
      "&": { height: "100%", fontSize: large ? "19px" : "16px", background: "var(--eb-code-bg)", color: "var(--eb-code-fg)" },
      ".cm-scroller": { fontFamily: "var(--eb-font-code)", lineHeight: "1.6" },
      ".cm-content": { padding: "10px 0", caretColor: "var(--eb-gold)" },
      ".cm-cursor, .cm-dropCursor": { borderLeft: "3px solid var(--eb-gold)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { background: "rgb(127 208 240 / 0.28) !important" },
      ".cm-gutters": { background: "var(--eb-code-bg)", color: "var(--eb-code-num)", border: "none", paddingLeft: "6px" },
      ".cm-activeLine": { background: "rgb(255 255 255 / 0.04)" },
      ".cm-activeLineGutter": { background: "transparent", color: "var(--eb-code-fg)" },
      ".cm-matchingBracket": { background: "rgb(242 181 58 / 0.25)", outline: "none" },
      ".cm-tooltip": { background: "var(--eb-code-head)", color: "var(--eb-code-fg)", border: "2px solid var(--eb-edge)" },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": { background: "var(--eb-gold)", color: "var(--eb-edge)" },
      ".eb-code-run": { background: "var(--eb-code-run) !important", boxShadow: "inset 4px 0 0 var(--eb-gold)" },
      ".eb-code-error": { background: "var(--eb-code-error) !important", boxShadow: "inset 4px 0 0 var(--eb-bad)" }
    },
    { dark: true }
  )

export const CodeEditor = ({
  initial,
  methods,
  large,
  runLine,
  errorLine,
  onChange,
  onReady
}: {
  /** The program the editor opens with. Later changes of it are not applied: the student's text stays. */
  readonly initial: string
  readonly methods: ReadonlyArray<PythonMethod>
  readonly large: boolean
  readonly runLine: number | null
  readonly errorLine: number | null
  readonly onChange: (source: string) => void
  readonly onReady: (api: CodeEditorApi, read: () => string) => void
}) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // The text as the student left it, so a new editor (another palette or size) keeps it.
  const textRef = useRef(initial)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: textRef.current,
        extensions: [
          lineNumbers(),
          history(),
          highlightActiveLine(),
          bracketMatching(),
          closeBrackets(),
          indentOnInput(),
          indentUnit.of("    "),
          EditorState.tabSize.of(4),
          python(),
          syntaxHighlighting(highlight),
          autocompletion({ override: [completions(methods)], icons: false }),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          marksField,
          theme(large),
          EditorView.contentAttributes.of({ "aria-label": "Код програми на Python", spellcheck: "false", autocapitalize: "off", autocorrect: "off", tabindex: "0" }),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return
            textRef.current = u.state.doc.toString()
            onChangeRef.current(textRef.current)
          })
        ]
      })
    })
    viewRef.current = view
    onReadyRef.current({ insert: (code) => insertLine(view, code) }, () => view.state.doc.toString())
    return () => {
      viewRef.current = null
      view.destroy()
    }
  }, [methods, large])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setMarks.of({ run: runLine, error: errorLine }) })
  }, [runLine, errorLine])

  return <div className="eb-code" ref={hostRef} />
}

/** Puts `code` on the cursor's line when it is empty, or on a new line after it with the same indent. */
const insertLine = (view: EditorView, code: string) => {
  const { state } = view
  const line = state.doc.lineAt(state.selection.main.head)
  const indent = /^\s*/.exec(line.text)?.[0] ?? ""
  const opensBlock = line.text.trimEnd().endsWith(":")
  const blank = line.text.trim() === ""
  const text = blank ? `${indent}${code}` : `\n${indent}${opensBlock ? "    " : ""}${code}`
  const from = blank ? line.from : line.to
  view.dispatch({ changes: { from, to: line.to, insert: text }, selection: { anchor: from + text.length }, scrollIntoView: true })
  view.focus()
}
