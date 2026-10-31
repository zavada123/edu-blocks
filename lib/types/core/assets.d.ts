/**
 * Asset manifests: what each picture of a pack is (a tile, a character, an enemy, an item, an effect…), how it is cut
 * into frames and which animations it plays. The manifests live in `assets/<pack>/manifest.json` and are made by
 * `scripts/assets/build.py`; see `assets/README.md`.
 *
 * Frames are numbered across the sprite's grid row by row: index = row × columns + column, where
 * columns = picture width / frame width. A clip may use its own picture (`file`, `frame`, `size`), as when a pack
 * keeps each action in a file of its own. A directional clip lists frames per direction; a direction it lacks may be
 * drawn as another one mirrored (`mirror: { right: "left" }`).
 *
 * Pure data and arithmetic, no DOM, so the editor and the server can read manifests too.
 */
import type { Direction } from "./world.ts";
export type AssetCategory = "tileset" | "terrain" | "decor" | "prop" | "character" | "enemy" | "boss" | "animal" | "crop" | "item" | "weapon" | "effect" | "particle" | "portrait" | "ui" | "font";
/** Whether the files of a pack may be published: yes, only in educational material with a link, or not at all. */
export type Redistribute = "yes" | "educational-with-link" | "no";
export type Size = readonly [width: number, height: number];
export interface AssetClip {
    readonly frames: ReadonlyArray<number> | Readonly<Partial<Record<Direction, ReadonlyArray<number>>>>;
    /** Frames per second. */
    readonly fps: number;
    readonly loop: boolean;
    /** The clip's own picture, relative to the manifest; the sprite's picture when absent. */
    readonly file?: string;
    readonly frame?: Size;
    readonly size?: Size;
    /** Directions drawn as another direction flipped horizontally. */
    readonly mirror?: Readonly<Partial<Record<Direction, Direction>>>;
    /** The frame count was guessed from the picture and is worth a look. */
    readonly verify?: boolean;
}
export interface SpriteAsset {
    readonly id: string;
    readonly file: string;
    readonly category: AssetCategory;
    readonly name: string;
    readonly size: Size;
    /** One cell of the grid; the whole picture is one frame when absent. */
    readonly frame?: Size;
    /**
     * How the grid reads: `directions` (a column per direction: down, up, left, right), `side` (a side view facing one
     * way, flip it for the other), `rows` (a row per direction), `grid` (a tileset or a set of pictures).
     */
    readonly layout?: "directions" | "side" | "rows" | "grid";
    readonly group?: string;
    /** For layered characters: which layer this is (`body`, `hair`, `tool`). */
    readonly layer?: string;
    readonly clips?: Readonly<Record<string, AssetClip>>;
    /** Id of the sprite's portrait (a `portrait` sprite in the same pack). */
    readonly portrait?: string;
    /** Other looks of the same picture, as files: `{ night: "…" }`. */
    readonly variants?: Readonly<Record<string, string>>;
    readonly verify?: boolean;
}
export interface SoundAsset {
    readonly id: string;
    readonly file: string;
    readonly group: string;
    readonly name: string;
}
export interface AssetPack {
    readonly id: string;
    readonly title: string;
    readonly author: string;
    readonly source: string;
    readonly license: {
        readonly name: string;
        readonly url: string;
        readonly redistribute: Redistribute;
        readonly terms?: string;
    };
    /** Size of one field cell in the pack's pictures. */
    readonly cell: number;
    readonly sprites: ReadonlyArray<SpriteAsset>;
    readonly sounds?: ReadonlyArray<SoundAsset>;
}
/** Part of a picture to draw: `w`×`h` from (`sx`, `sy`) of `file`, flipped horizontally when `flip`. */
export interface FrameRect {
    readonly file: string;
    readonly sx: number;
    readonly sy: number;
    readonly w: number;
    readonly h: number;
    readonly flip: boolean;
}
/** The frames a clip plays facing `direction`, and whether to flip them. Empty when the clip has no such direction. */
export declare const clipFrames: (clip: AssetClip, direction?: Direction) => {
    readonly frames: ReadonlyArray<number>;
    readonly flip: boolean;
};
/** Where frame `index` of the sprite's grid (or the clip's own picture) is. */
export declare const frameRect: (sprite: SpriteAsset, index: number, clip?: AssetClip, flip?: boolean) => FrameRect;
/** Which of `count` frames shows `ms` milliseconds into a clip: looping, or holding the last frame. */
export declare const frameIndexAt: (count: number, fps: number, loop: boolean, ms: number) => number;
/** The frame to draw `ms` milliseconds into a clip, or null when the sprite has no such clip or direction. */
export declare const frameAt: (sprite: SpriteAsset, clipName: string, direction: Direction, ms: number) => FrameRect | null;
/** How long a clip plays once, in milliseconds. */
export declare const clipDuration: (clip: AssetClip, direction?: Direction) => number;
/** Every frame index a clip uses, over all directions. */
export declare const clipIndices: (clip: AssetClip) => ReadonlyArray<number>;
/** Mistakes in a manifest that would draw the wrong part of a picture or nothing. Picture sizes are checked by the caller. */
export declare const packProblems: (pack: AssetPack) => ReadonlyArray<string>;
