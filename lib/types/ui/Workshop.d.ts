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
};
/** The window that asks `ask`; `onClose` takes it away after the answer. */
export declare const WorkshopDialog: ({ ask, onClose }: {
    readonly ask: Ask;
    readonly onClose: () => void;
}) => import("react").JSX.Element;
