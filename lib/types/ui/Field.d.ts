import { type World } from "../core/world.ts";
/** Hero looks. The app sells and picks them; the package only draws them. */
export type Skin = "robot" | "rover" | "bee";
export declare const Field: ({ world, skin }: {
    readonly world: World;
    readonly skin: Skin;
}) => import("react").JSX.Element;
