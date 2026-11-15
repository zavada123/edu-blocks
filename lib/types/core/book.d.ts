import { type Program } from "./program.ts";
/**
 * «Книга команд»: own blocks the student keeps from day to day. A page is the «визначити» script of one own block, as
 * the editor keeps it (block id → block). A program calls a block of the book without defining it: before a run the
 * pages join the program (`withLibrary`), and a «визначити» of the same block in the program wins over its page, as a
 * copy taken for editing does.
 */
export type BookPage = Program;
/** Pages a new book has. */
export declare const BOOK_PAGES = 3;
/** The start of the ids the blocks of a page get in a run: `eb-book-2-…` is a block of the third page. */
export declare const BOOK_ID_PREFIX = "eb-book-";
/** The own blocks a program defines, by proccode («пройти %s»). */
export declare const definedBlocks: (program: Program) => ReadonlyArray<string>;
/** The own blocks a program calls, by proccode, each once. */
export declare const calledBlocks: (program: Program) => ReadonlyArray<string>;
/** A page as the book shows it: the proccode of its block, its words and its parameters. */
export interface PageInfo {
    readonly proccode: string;
    /** The words of the block without its slots: «пройти». */
    readonly name: string;
    readonly params: ReadonlyArray<string>;
    /** The ids of its parameters, as a call of the block names its slots. */
    readonly ids: ReadonlyArray<string>;
}
/** What a page holds, or null when it holds no «визначити» (stored data can be anything). */
export declare const pageInfo: (page: BookPage) => PageInfo | null;
/** The pages of a book that hold a block, each block once: what stored data keeps of a book. */
export declare const cleanBook: (book: ReadonlyArray<BookPage>) => ReadonlyArray<BookPage>;
/** The «визначити» script of one own block of a program, as a page: the hat and every block under and inside it. */
export declare const pageOf: (program: Program, proccode: string) => BookPage | null;
/** The book with `page`: it takes the place of the page of the same block, or a free page. Null when the book is full. */
export declare const writePage: (book: ReadonlyArray<BookPage>, page: BookPage, size: number) => ReadonlyArray<BookPage> | null;
/** The book without the page of a block. */
export declare const tearPage: (book: ReadonlyArray<BookPage>, proccode: string) => ReadonlyArray<BookPage>;
/** The pages a program uses from the book: those of blocks it calls and does not define itself. */
export declare const pagesUsed: (program: Program, book: ReadonlyArray<BookPage>) => ReadonlyArray<PageInfo>;
/**
 * The program with the pages of the book it does not define itself, ready to run. The blocks of a page get ids of their
 * own, so they never meet the ids of the program, and a variable of a page is the program's variable of that name.
 */
export declare const withLibrary: (program: Program, book: ReadonlyArray<BookPage> | undefined) => Program;
