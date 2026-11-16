/** Entry `edu-blocks/react`: the editor component. Its styles are in `edu-blocks/style.css`, the block icons in `edu-blocks/blocks-media/`. */
export { EduBlocks } from "./ui/EduBlocks.tsx";
export type { BlocksReport, BookRun, EduBlocksProps, HeroXp } from "./ui/EduBlocks.tsx";
export type { BookPage } from "./core/book.ts";
export type { EstateRun, HeroCoins } from "./ui/Verdict.tsx";
export type { EstateDay, Harvest } from "./core/estate.ts";
export type { FarmHelperRun, FarmRun } from "./ui/Verdict.tsx";
export type { FarmReport } from "./core/farm.ts";
export type { Skin } from "./ui/stage/Stage.tsx";
export { canBuyHero, HEROES, heroesCost, heroOpen } from "./core/heroes.ts";
export type { Hero, HeroId } from "./core/heroes.ts";
/** Where the asset packs are (`<base><pack>/manifest.json`); `./packs/` by default. */
export { loadPack, loadPackList, setAssetBase } from "./ui/stage/packs.ts";
export type { PackInfo } from "./ui/stage/packs.ts";
