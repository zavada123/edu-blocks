/** «Як це в Python»: the student's blocks as Python code under the editor, as a bridge from blocks to text. */
export interface PythonPeekProps {
    readonly open: boolean;
    /** The code of the blocks as they are now; shown only when open. */
    readonly source: string;
    readonly onToggle: () => void;
}
export declare const PythonPeek: ({ open, source, onToggle }: PythonPeekProps) => import("react").JSX.Element;
