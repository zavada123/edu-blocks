# Tiled maps

- `sunnyside-16px.tsx`: the 16 px tileset of [Sunnyside World](https://danieldiggle.itch.io/sunnyside) by Daniel Diggle for [Tiled](https://www.mapeditor.org/). It has three terrain brushes (Стежка, Рілля, Вода), taken from the autotiles of the pack's GameMaker project. The picture stays in `assets/sunnyside/` under the pack's licence: it may be shared only as part of educational material, with a link to the pack's page.
- `farm.tmj`: the farm mockup. The coop layers (`coop`, `coop-above`) have the property `upgrade` = `coop`, so they show only after the coop is bought.

To turn a map into a level, run `npm run tiled -- tiled/farm.tmj --name farmMockup > src/demo/farm-mockup.ts`. The layers and properties a map needs are listed under «Map from Tiled» in the main README.
