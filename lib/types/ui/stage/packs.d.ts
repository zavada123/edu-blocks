import { type AssetPack, type SpriteAsset } from "../../core/assets.ts";
/**
 * Asset packs for the field, loaded when a level needs them. A pack lives in `<base><pack id>/manifest.json`, next to
 * its pictures; the demo and the editor serve them from `./packs/` (see `assetPacks` in vite.shared.ts). A page that
 * keeps them elsewhere calls `setAssetBase` once. Until a pack has loaded, its pictures are just not drawn.
 */
/** A pack in the list the build writes to `<base>index.json`. */
export interface PackInfo {
    readonly id: string;
    readonly title: string;
    readonly author: string;
    readonly source: string;
    readonly license: AssetPack["license"];
    /** Served only from a private folder at build time: never published with the public demo. */
    readonly private?: boolean;
}
/** Where the pack folders are, ending with a slash. */
export declare const setAssetBase: (url: string) => void;
export declare const assetBase: () => string;
/** The URL of a file of a pack, as the manifest names it. */
export declare const packFile: (pack: string, file: string) => string;
/** Loads a pack once; resolves to null when there is no such pack. */
export declare const loadPack: (id: string) => Promise<AssetPack | null>;
/** The packs the build serves, from `<base>index.json`; empty when there is no list. */
export declare const loadPackList: () => Promise<ReadonlyArray<PackInfo>>;
export declare const loadedPack: (id: string) => AssetPack | null;
/** A sprite and its pack, by reference: null while the pack loads or when there is no such sprite. */
export declare const spriteOf: (ref: string) => {
    readonly pack: AssetPack;
    readonly sprite: SpriteAsset;
} | null;
