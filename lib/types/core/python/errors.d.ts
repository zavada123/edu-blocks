/**
 * A mistake in a student's Python program, with the line it is on. Every message is in Ukrainian and says what to
 * change, not only what is wrong: the students are 9 to 12 years old.
 */
export declare class PyError extends Error {
    /** 1-based line of the program. */
    readonly line: number;
    constructor(message: string, 
    /** 1-based line of the program. */
    line: number);
}
/** The closest known name, when it is close enough to be a typo; the same name in other letter case first. */
export declare const closest: (name: string, known: Iterable<string>) => string | null;
