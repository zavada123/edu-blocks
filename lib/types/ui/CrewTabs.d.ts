/** Whose program the editor holds on a farm day with a helper: the worker's or the helper's. */
export type CrewTab = "worker" | "helper";
export interface CrewTabsProps {
    readonly tab: CrewTab;
    /** The helper's name: «Тарас». */
    readonly helper: string;
    readonly disabled: boolean;
    readonly onPick: (tab: CrewTab) => void;
}
/**
 * Two programs over the editor: «Робітник · Тарас». Each worker runs its own program; a turn of the day goes to the
 * worker first, then to the helper.
 */
export declare const CrewTabs: ({ tab, helper, disabled, onPick }: CrewTabsProps) => import("react").JSX.Element;
