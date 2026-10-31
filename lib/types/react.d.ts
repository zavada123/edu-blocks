/** Entry `edu-blocks/react`: the editor component. Its styles are in `edu-blocks/style.css`, the block icons in `edu-blocks/blocks-media/`. */
export { EduBlocks } from "./ui/EduBlocks.tsx";
export type { BlocksReport, EduBlocksProps, HeroXp } from "./ui/EduBlocks.tsx";
export type { Skin } from "./ui/stage/Stage.tsx";
export { HEROES, heroOpen } from "./core/heroes.ts";
export type { Hero, HeroId } from "./core/heroes.ts";
/** Where the asset packs are (`<base><pack>/manifest.json`); `./packs/` by default. */
export { loadPack, loadPackList, setAssetBase } from "./ui/stage/packs.ts";
export type { PackInfo } from "./ui/stage/packs.ts";
