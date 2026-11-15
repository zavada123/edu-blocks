import { procedureTitle } from "../core/blocks.ts"

/**
 * «Створити блок»: the words of the window that makes or edits an own block, and the mutation it gives back. A block
 * is its name and its number parameters, the parameters after the name: «пройти (кроки)» is «пройти %s».
 */

export interface BlockDraft {
  readonly name: string
  readonly params: ReadonlyArray<string>
}

/** Parameters one block can have: more would not fit on a line of the palette. */
export const MAX_PARAMS = 3
/** Letters in a block's name or a parameter's name. */
export const MAX_NAME = 30

const listOf = (text: string | null): ReadonlyArray<string> => {
  try {
    const list: unknown = JSON.parse(text ?? "[]")
    return Array.isArray(list) ? list.map(String) : []
  } catch {
    return []
  }
}

/** The block a prototype's mutation describes. A new block has an empty name. */
export const draftOf = (mutation: { getAttribute(name: string): string | null }): BlockDraft => ({
  name: procedureTitle(mutation.getAttribute("proccode") ?? ""),
  params: listOf(mutation.getAttribute("argumentnames"))
})

/** The words of a block as Scratch keeps them: its name with a slot for each parameter. */
export const proccodeOfDraft = (draft: BlockDraft): string => [draft.name.trim(), ...draft.params.map(() => "%s")].join(" ")

/**
 * What is wrong with the block, in the words of the window, or null. `taken` are the words of the other blocks: two
 * blocks with the same words would be one block twice.
 */
export const draftError = (draft: BlockDraft, taken: ReadonlyArray<string>): string | null => {
  const name = draft.name.trim()
  if (name === "") return "Дай блоку назву: що він робить, наприклад «пройти»."
  if (name.includes("%")) return "Знак % у назві блоку не можна."
  if (name.length > MAX_NAME) return `Назва задовга: не більше ${MAX_NAME} літер.`
  const params = draft.params.map((p) => p.trim())
  if (params.some((p) => p === "")) return "Дай назву кожному параметру, наприклад «кроки»."
  if (params.some((p) => p.length > MAX_NAME)) return `Назва параметра задовга: не більше ${MAX_NAME} літер.`
  if (new Set(params).size < params.length) return "Два параметри з однаковою назвою: перейменуй один."
  if (taken.includes(proccodeOfDraft({ name, params }))) return "Блок з такою назвою вже є. Дай іншу назву або зміни той блок."
  return null
}

/**
 * The attributes of the new mutation. A parameter keeps its id when it stays at its place, so the calls already in
 * the program keep their values; a new one gets `newId()`.
 */
export const mutationOf = (
  draft: BlockDraft,
  oldIds: ReadonlyArray<string>,
  newId: () => string
): Readonly<Record<"proccode" | "argumentids" | "argumentnames" | "argumentdefaults" | "warp", string>> => {
  const params = draft.params.map((p) => p.trim())
  return {
    proccode: proccodeOfDraft({ name: draft.name, params }),
    argumentids: JSON.stringify(params.map((_, i) => oldIds[i] ?? newId())),
    argumentnames: JSON.stringify(params),
    argumentdefaults: JSON.stringify(params.map(() => "")),
    warp: "false"
  }
}

export const idsOf = (mutation: { getAttribute(name: string): string | null }): ReadonlyArray<string> => listOf(mutation.getAttribute("argumentids"))
