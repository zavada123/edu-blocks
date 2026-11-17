import { Fragment } from "react"
import { parseRich, type RichPart } from "./rich-text.ts"

/** One part of a marked text. Class names start with `rt-`; rich-text.css gives the look. */
const Part = ({ part }: { readonly part: RichPart }) => {
  switch (part.kind) {
    case "text":
      return <>{part.text}</>
    case "ui":
      return <strong className="rt-ui">{part.text}</strong>
    case "code":
      return <code className="rt-code">{part.text}</code>
    case "color":
      return <span className={`rt-color rt-${part.color}`}>{part.text}</span>
    case "keys":
      return (
        <span className="rt-keys">
          {part.keys.map((key, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="rt-plus">+</span>}
              <kbd className="rt-key">{key}</kbd>
            </Fragment>
          ))}
        </span>
      )
  }
}

/** Shows a task or hint text with its markup (see rich-text.ts). Never sets HTML. */
export const RichText = ({ text }: { readonly text: string }) => (
  <>
    {parseRich(text).map((part, i) => (
      <Part key={i} part={part} />
    ))}
  </>
)
