import { type Skin } from "./stage/draw.ts";
/** A hero walking towards the student: the first column of its sheet, four frames. */
export declare const HeroSprite: ({ skin, walking }: {
    readonly skin: Skin;
    readonly walking: boolean;
}) => import("react").JSX.Element;
/**
 * The choice of the hero, over the game: every hero with its look, name and a line about it. A hero that the hero
 * level has not opened yet shows as a shadow with the level it opens at.
 */
export declare const HeroPicker: ({ skin, heroLevel, onPick, onClose }: {
    readonly skin: Skin;
    readonly heroLevel: number;
    readonly onPick: (skin: Skin) => void;
    readonly onClose: () => void;
}) => import("react").JSX.Element;
