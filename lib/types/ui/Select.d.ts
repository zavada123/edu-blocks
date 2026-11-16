import "./select.css";
export interface SelectOption<V extends string> {
    readonly value: V;
    readonly label: string;
    readonly disabled?: boolean;
}
export declare function Select<V extends string>(props: Readonly<{
    value: V;
    options: ReadonlyArray<SelectOption<V>>;
    onChange: (value: V) => void;
    /** Accessible name when no `<label>` wraps the control. */
    ariaLabel?: string;
    className?: string;
}>): import("react").JSX.Element;
