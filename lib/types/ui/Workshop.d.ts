import { type BlockDraft } from "./make-block.ts";
/**
 * The windows of «Майстерня» over the editor: the name of a new variable («Створити змінну»), a block with its
 * parameters («Створити блок» and «Змінити» on a «визначити»), and the editor's messages. scratch-blocks asks for
 * them through `prompt`, `alert`, `confirm` and `externalProcedureDefCallback`; the editor answers with these.
 */
export type Ask = {
    readonly kind: "text";
    readonly message: string;
    readonly value: string;
    readonly done: (text: string | null) => void;
} | {
    readonly kind: "alert";
    readonly message: string;
    readonly done: () => void;
} | {
    readonly kind: "confirm";
    readonly message: string;
    readonly done: (ok: boolean) => void;
} | {
    readonly kind: "block";
    readonly draft: BlockDraft;
    /** The words of the other own blocks: the new one must differ. */
    readonly taken: ReadonlyArray<string>;
    readonly done: (draft: BlockDraft | null) => void;
}
/** «Записати в Книгу команд»: an own block goes to a page of the book (or takes the place of its old page). */
 | {
    readonly kind: "bookWrite";
    readonly name: string;
    readonly params: ReadonlyArray<string>;
    /** The page it goes to, from 1, and the pages of the book. */
    readonly page: number;
    readonly size: number;
    /** The block has a page already: this writes it again. */
    readonly again: boolean;
    readonly done: (ok: boolean) => void;
}
/** «Книга команд»: its pages, and what the student can do with each. */
 | {
    readonly kind: "book";
    readonly pages: ReadonlyArray<BookEntry>;
    readonly size: number;
    /** «Взяти на правку»: a copy of the page's «визначити» goes into the program. */
    readonly take: (proccode: string) => void;
    /** «Вирвати сторінку». */
    readonly tear: (proccode: string) => void;
    readonly done: () => void;
};
/** A page of the book as its window shows it. */
export interface BookEntry {
    readonly proccode: string;
    readonly name: string;
    readonly params: ReadonlyArray<string>;
    /** The page as Python: its `def`. */
    readonly python: string;
    /** The program calls the block of this page. */
    readonly called: boolean;
    /** The program has its own «визначити» of this block: a copy taken for editing. */
    readonly defined: boolean;
}
/** The window that asks `ask`; `onClose` takes it away after the answer. */
export declare const WorkshopDialog: ({ ask, onClose }: {
    readonly ask: Ask;
    readonly onClose: () => void;
}) => import("react").JSX.Element;
