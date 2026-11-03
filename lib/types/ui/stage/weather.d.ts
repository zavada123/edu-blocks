import type { Weather } from "../look.ts";
/**
 * Snow, rain and leaves over the field, drawn as small shapes: the art packs have no weather. Each drop has a fixed
 * place in a tile of the sky that falls and drifts in a loop, so the weather is the same at the same moment.
 */
type Ctx = CanvasRenderingContext2D;
interface View {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
export declare const drawWeather: (ctx: Ctx, weather: Weather, view: View, cell: number, now: number) => void;
export {};
