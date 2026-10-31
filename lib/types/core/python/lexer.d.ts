/**
 * Splits a program into tokens, as Python does: names, numbers, texts, operators, and the line ends and indents
 * that make the blocks of Python. Inside brackets a line may go on to the next one.
 */
export type TokenKind = "name" | "keyword" | "number" | "string" | "op" | "newline" | "indent" | "dedent" | "eof";
export interface Token {
    readonly kind: TokenKind;
    readonly value: string;
    readonly line: number;
}
export declare const KEYWORDS: ReadonlySet<string>;
/** Python words this course does not use yet. A program with them gets a clear message, not a strange error. */
export declare const UNSUPPORTED: ReadonlySet<string>;
/** A program longer than this is refused before it runs. */
export declare const MAX_SOURCE_LENGTH = 20000;
export declare const tokenize: (source: string) => ReadonlyArray<Token>;
