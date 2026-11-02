import { type HeroId } from "../core/heroes.ts";
import { type Skin } from "./stage/draw.ts";
/** A hero walking towards the student: the first column of its sheet, four frames. */
export declare const HeroSprite: ({ skin, walking }: {
    readonly skin: Skin;
    readonly walking: boolean;
}) => import("react").JSX.Element;
/** The shop part of the choice: the coins the student has and how to buy. */
export interface HeroShop {
    readonly coins: number;
    readonly onBuy: (hero: HeroId) => void;
}
/**
 * The choice of the hero, over the game: every hero with its look, name and a line about it. A hero that the hero
 * level has not opened yet shows as a shadow with the level it opens at. With a shop, heroes with a price show it:
 * the student buys one with the coins and plays it at once. Without a shop those heroes are not offered.
 */
export declare const HeroPicker: ({ skin, heroLevel, owned, shop, onPick, onClose }: {
    readonly skin: Skin;
    readonly heroLevel: number;
    readonly owned: ReadonlyArray<HeroId>;
    readonly shop: HeroShop | null;
    readonly onPick: (skin: Skin) => void;
    readonly onClose: () => void;
}) => import("react").JSX.Element;
