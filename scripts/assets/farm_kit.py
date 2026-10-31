"""Farm kit: a farmer (with and without a hat), 19 crops, tall grass, farm objects, ground, fence and trees.

The pack came from the project owner without a licence file; the owner said its files may go into this repository.
Frame sizes and counts are in the file names: `<name>_<W>x<H>_<N>frames.png`.

- Farmer sheets are 32×32 frames, three per row, one row per direction: down, left, right, up. Idle is one column.
- A crop's growth strip goes from seed to ripe; its last frame is the withered plant (tomato: the last three).
- An icon strip holds looks of the harvest (colours or sizes), not an animation.
"""

from __future__ import annotations

import re
from pathlib import Path

from common import Pack, clip, title

META = {
    "id": "farm-kit",
    "title": "Farm kit 16x16",
    "author": "unknown (supplied by the project owner)",
    "source": "supplied by the project owner",
    "license": {
        "name": "Permission of the project owner",
        "url": "",
        "redistribute": "yes",
        "terms": "No licence file came with the pack; the project owner allowed putting the files in this repository.",
    },
    "cell": 16,
}

ROWS = ("down", "left", "right", "up")
FARMER_FPS = {"walk": 8, "hoe": 8, "shovel": 8, "water": 6}
FARMER_LOOPS = {"walk": True, "hoe": False, "shovel": False, "water": True}
GROW_FPS = 2
# Withered frames at the end of a growth strip.
WITHERED = {"tomato": 3}
# Strips where the split between growing and withered was judged by eye.
CHECK_BY_EYE = {"tomato", "corn", "wheat", "pepper"}
NAME = re.compile(r"_(\d+)x(\d+)(?:_(\d+)frames)?\.png$")


def _grid(path: Path) -> tuple[int, int, int]:
    match = NAME.search(path.name)
    if match is None:
        raise ValueError(f"{path.name} does not say its frame size")
    return int(match[1]), int(match[2]), int(match[3] or 1)


def _farmer(pack: Pack, root: Path, hat: bool) -> None:
    folder = root / "characters" / "males" / "male_01"
    look = "male_01_hat" if hat else "male_01"
    idle = folder / "idle" / f"{look}_idle_32x32.png"
    clips = {"idle": clip({d: [r] for r, d in enumerate(ROWS)}, 1, True)}
    for action, fps in FARMER_FPS.items():
        source = folder / action / f"{look}_{action}_32x32_3frames.png"
        target = pack.file(source, f"characters/farmer{'-hat' if hat else ''}/{action}.png")
        clips[action] = clip({d: [r * 3 + c for c in range(3)] for r, d in enumerate(ROWS)}, fps, FARMER_LOOPS[action],
                             file=target, frame=[32, 32], size=[96, 128])
    name = "Farmer with a hat" if hat else "Farmer"
    pack.sprite("character/farmer-hat" if hat else "character/farmer", idle,
                f"characters/farmer{'-hat' if hat else ''}/idle.png", "character", name,
                frame=[32, 32], layout="rows", clips=clips)


def _crop(pack: Pack, folder: Path) -> None:
    crop = folder.name
    growth = next((folder / "growth_basic").glob("*.png"))
    width, height, count = _grid(growth)
    withered = WITHERED.get(crop, 1)
    if crop == "tallgrass":
        pack.sprite("decor/tall-grass", growth, "decor/tall-grass.png", "decor", "Tall grass", frame=[width, height],
                    layout="grid", group="grass")
        return
    pack.sprite(f"crop/{crop}", growth, f"crops/{crop}.png", "crop", title(crop), frame=[width, height], layout="grid",
                clips={"grow": clip(list(range(count - withered)), GROW_FPS, False),
                       "withered": clip(list(range(count - withered, count)), GROW_FPS, False)},
                verify=True if crop in CHECK_BY_EYE else None)
    icon = next((folder / "icon").glob("*.png"))
    pack.sprite(f"item/{crop}", icon, f"items/{crop}.png", "item", title(crop), frame=[16, 16], layout="grid",
                group="food")


def build(root: Path, out: Path) -> Pack:
    pack = Pack(meta=dict(META), out=out)
    for hat in (False, True):
        _farmer(pack, root, hat)
    for folder in sorted(p for p in (root / "crops").iterdir() if p.is_dir()):
        _crop(pack, folder)
    tiles = root / "tiles"
    pack.sprite("tileset/ground", tiles / "ground_01_16x16.png", "tiles/ground.png", "tileset", "Grass and soil",
                frame=[16, 16], layout="grid")
    pack.sprite("tileset/fence", tiles / "fence_01_16x16.png", "tiles/fence.png", "tileset", "Fence",
                frame=[16, 16], layout="grid")
    pack.sprite("tileset/trees", tiles / "tree_01_16x16.png", "tiles/trees.png", "tileset", "Trees",
                frame=[16, 16], layout="grid")
    pack.sprite("tileset/objects", root / "objects" / "objects_01_16x16.png", "tiles/objects.png", "tileset",
                "Pots, crates, crop signs, mailboxes, lamps", frame=[16, 16], layout="grid")
    return pack
