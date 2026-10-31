import { type PythonMethod } from "../../core/python/api.ts";
/**
 * The code editor: CodeMirror with Python, four-space indents, hints for `hero.` and the lines the run marks — the
 * line the hero acts on now and the line of a mistake.
 */
/** What the page can do with the editor. */
export interface CodeEditorApi {
    /** Puts a line of code at the cursor, on a line of its own with the indent of the line it lands on. */
    readonly insert: (code: string) => void;
}
export declare const CodeEditor: ({ initial, methods, large, runLine, errorLine, onChange, onReady }: {
    /** The program the editor opens with. Later changes of it are not applied: the student's text stays. */
    readonly initial: string;
    readonly methods: ReadonlyArray<PythonMethod>;
    readonly large: boolean;
    readonly runLine: number | null;
    readonly errorLine: number | null;
    readonly onChange: (source: string) => void;
    readonly onReady: (api: CodeEditorApi, read: () => string) => void;
}) => import("react").JSX.Element;
