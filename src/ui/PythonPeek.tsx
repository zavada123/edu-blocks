/** «Як це в Python»: the student's blocks as Python code under the editor, as a bridge from blocks to text. */
export interface PythonPeekProps {
  readonly open: boolean
  /** The code of the blocks as they are now; shown only when open. */
  readonly source: string
  readonly onToggle: () => void
}

export const PythonPeek = ({ open, source, onToggle }: PythonPeekProps) => (
  <div className="eb-peek">
    <button type="button" className="eb-peek-toggle" aria-expanded={open} onClick={onToggle}>
      {open ? "▾" : "▸"} Як це в Python
    </button>
    {open && (
      <pre className="eb-peek-code" aria-label="Програма в Python">
        <code>{source}</code>
      </pre>
    )}
  </div>
)
