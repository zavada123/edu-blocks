import type { Issue } from "./kit.ts";
import type { Level } from "./level.ts";
/** Advice where the text of a level and its field disagree. */
export declare const storyIssues: (level: Level) => ReadonlyArray<Issue>;
