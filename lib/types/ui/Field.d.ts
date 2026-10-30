import type { Scene } from "../core/level.ts";
import { type World } from "../core/world.ts";
/** Hero looks. The app sells and picks them; the package only draws them. */
export type Skin = "ninja" | "robot" | "rover" | "bee";
export declare const Field: ({ world, skin, scene }: {
    readonly world: World;
    readonly skin: Skin;
    readonly scene?: Scene | undefined;
}) => import("react").JSX.Element;
