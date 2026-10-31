"""Farming crops 16x16 (josehzz, CC0): 20 crops, each with an icon and 5 growth stages.

The sheet is 12×10 cells of 16×16, two crops per row. For each crop, the first cell is its icon (the harvest) and the
next five go from fully grown to just planted, so the growth clip plays them right to left.
"""

from __future__ import annotations

from pathlib import Path

from common import Pack, clip, slug

META = {
    "id": "farming-crops",
    "title": "Farming crops 16x16",
    "author": "josehzz",
    "source": "https://opengameart.org/content/farming-crops-16x16",
    "license": {"name": "CC0 1.0", "url": "https://creativecommons.org/publicdomain/zero/1.0/", "redistribute": "yes"},
    "cell": 16,
}

CROPS = ("Turnip", "Rose", "Cucumber", "Tulip", "Tomato", "Melon", "Eggplant", "Lemon", "Pineapple", "Rice", "Wheat",
         "Grapes", "Strawberry", "Cassava", "Potato", "Coffee", "Orange", "Avocado", "Corn", "Sunflower")
COLUMNS = 12
STAGES = 5


def build(root: Path, out: Path) -> Pack:
    pack = Pack(meta=dict(META), out=out)
    sheet = root / "Crop_Spritesheet.png"
    target = pack.file(sheet, "crops.png")
    for n, name in enumerate(CROPS):
        first = (n // 2) * COLUMNS + (n % 2) * (STAGES + 1)
        stages = [first + STAGES - s for s in range(STAGES)]
        pack.sprite(f"crop/{slug(name)}", sheet, target, "crop", name, frame=[16, 16], layout="grid",
                    clips={"grow": clip(stages, 1, False), "icon": clip([first], 1, False)})
    return pack
