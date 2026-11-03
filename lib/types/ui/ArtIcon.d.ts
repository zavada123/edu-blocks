export interface ArtIconProps {
    /** A sprite id of the art packs (see art.ts). */
    readonly id: string;
    /** The clip to play; by default the sprite stands still in its rest clip. */
    readonly clip?: string;
    readonly animate?: boolean;
    readonly className?: string;
    /** Size in CSS pixels; by default the CSS of `className` sizes it. */
    readonly size?: number;
}
export declare const ArtIcon: ({ id, clip, animate, className, size }: ArtIconProps) => import("react").JSX.Element;
