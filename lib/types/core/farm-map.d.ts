import type { PlacedSprite, TileMap } from "./level.ts";
export declare const GOBLIN_HUT_ART: string;
export declare const WATCH_TOWER_ART: string;
export declare const SHEEP_ART: string;
export declare const GOLD_MINE_ART: string;
export declare const BUILD_SITE_ART: string;
export declare const SECOND_BARN_ART: string;
export declare const MILL_ART: string;
export interface FarmLayout {
    /** The map of the day: `#` walls and the ring of paths. */
    readonly rows: ReadonlyArray<string>;
    /** The first column of the forest and the beds. */
    readonly first: number;
    readonly trees: number;
    /** The column of the right side of the ring, and the rows of the top and bottom paths. */
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
    readonly beds: boolean;
    /** The goblins come this day: their hut stands beyond the far corner. */
    readonly goblins: boolean;
    /** The watch tower, when it is built: the wall cell it stands on. */
    readonly tower: {
        readonly x: number;
        readonly y: number;
    } | null;
    /** The sheep pen: its sheep graze on the meadow left of the trough on the left path. */
    readonly pen: boolean;
    /** The gold mine under the bottom path, its mouth by the second cell of the path. */
    readonly mine: boolean;
    /** The build site on the right path, between the forest and the beds. */
    readonly site?: boolean;
    /** The second barn in the bottom-right corner, and the mill in the bottom-left one. */
    readonly barn?: boolean;
    readonly mill?: boolean;
}
export declare const farmLook: (layout: FarmLayout) => {
    readonly tilemap: TileMap;
    readonly sprites: ReadonlyArray<PlacedSprite>;
};
