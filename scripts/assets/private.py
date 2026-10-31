"""Packs whose licences forbid sharing the files: Tiny Farm RPG (Maeve) and Village Top Down (Pixeljad).

They can be used inside the game, but their pictures must not be put in this public repository. The script writes
them, with their manifests, to a folder outside the repository (see README in assets/).
"""

from __future__ import annotations

import re
from pathlib import Path

from common import Pack, clip, size_of, slug, title

FARM = {
    "id": "farm-rpg",
    "title": "Tiny Farm RPG (free)",
    "author": "Maeve Devs",
    "source": "https://maevedevs.itch.io/farm-rpg",
    "license": {
        "name": "Farm RPG asset pack licence",
        "url": "https://maevedevs.itch.io/farm-rpg",
        "redistribute": "no",
        "terms": "Any project, changes allowed. The files must not be resold or redistributed, even changed. "
                 "No crypto/NFT, no AI training. Credit: Maeve Devs.",
    },
    "cell": 16,
}

VILLAGE = {
    "id": "village-top-down",
    "title": "Village Top Down",
    "author": "Pixeljad (Jadson Holanda)",
    "source": "https://pixeljad.itch.io/villagetopdown",
    "license": {
        "name": "Pixeljad licence (itch.io: CC BY-ND 4.0)",
        "url": "https://pixeljad.itch.io/villagetopdown",
        "redistribute": "no",
        "terms": "Commercial and non-commercial projects, changes allowed. The files must not be distributed or sold "
                 "directly, even changed. Credit: Pixeljad (@pixeljad). No crypto/NFT.",
    },
    "cell": 16,
}

# Farm people and cows: rows are directions; the side row faces left (mirror it for right).
FARM_ROWS = {"Character": ("down", "up", "left"), "Cow": ("left", "down", "up")}
MIRROR = {"right": "left"}


def _rel(root: Path, path: Path) -> str:
    rel = path.relative_to(root)
    return "/".join([*(slug(p) for p in rel.parent.parts), slug(rel.stem.replace(" copiar", "")) + ".png"])


def _rows_clip(width: int, cell: int, rows: tuple[str, ...], fps: int) -> dict:
    columns = width // cell
    return clip({d: [r * columns + c for c in range(columns)] for r, d in enumerate(rows)}, fps, True, mirror=MIRROR)


def farm(root: Path, out: Path) -> Pack:
    pack = Pack(meta=dict(FARM), out=out)
    idle, walk = root / "Character/Idle.png", root / "Character/Walk.png"
    walk_target = pack.file(walk, _rel(root, walk))
    clips = {"idle": _rows_clip(size_of(idle)[0], 32, FARM_ROWS["Character"], 4),
             "walk": {**_rows_clip(size_of(walk)[0], 32, FARM_ROWS["Character"], 8), "file": walk_target,
                      "size": list(size_of(walk))}}
    pack.sprite("character/farmer", idle, _rel(root, idle), "character", "Farmer", frame=[32, 32], layout="rows",
                clips=clips, verify=True)
    for path in sorted((root / "Farm Animals").glob("*.png")):
        width, height = size_of(path)
        cell = 32 if "Cow" in path.stem else 16
        rows = height // cell
        clips = ({"walk": _rows_clip(width, cell, FARM_ROWS["Cow"], 6)} if "Cow" in path.stem
                 else {name: clip([r * (width // cell) + c for c in range(width // cell)], 6, True)
                       for r, name in enumerate(("idle", "walk", "peck")[:rows])})
        pack.sprite(f"animal/{slug(path.stem)}", path, _rel(root, path), "animal", title(path.stem), frame=[cell, cell],
                    layout="rows" if "Cow" in path.stem else "side", clips=clips, verify=True)
    for path in sorted((root / "Objects").glob("*.png")):
        name = path.stem.replace(" copiar", "")
        category = "crop" if "Crops" in name else "item" if name == "chest" else "prop"
        pack.sprite(f"{category}/{slug(name)}", path, _rel(root, path), category, title(name), frame=[16, 16], layout="grid")
    tiles = root / "Tileset/Tileset Grass Spring.png"
    pack.sprite("tileset/grass-spring", tiles, _rel(root, tiles), "tileset", "Grass spring", frame=[16, 16], layout="grid")
    return pack


VILLAGE_CATEGORY = (
    (re.compile(r"TILE|TERRAIN|DETAIL|PIT|STAIRS"), "tileset"),
    (re.compile(r"TREE"), "decor"),
    (re.compile(r"HOUSE|CHURCH|BRIDGE|FENCE"), "prop"),
)


def village(root: Path, out: Path) -> Pack:
    """Every picture comes twice, for day and for night: the night one is a `night` variant of the same sprite."""
    pack = Pack(meta=dict(VILLAGE), out=out)
    for day in sorted(root.glob("* - DAY.png")):
        name = day.stem.removesuffix(" - DAY")
        category = next((c for pattern, c in VILLAGE_CATEGORY if pattern.search(name)), "prop")
        night = day.with_name(f"{name} - NIGHT.png")
        width, height = size_of(day)
        grid = [16, 16] if category == "tileset" and (width > 16 or height > 16) else None
        pack.sprite(f"{category}/{slug(name)}", day, _rel(root, day), category, title(name), frame=grid,
                    layout="grid" if grid else None,
                    variants={"night": pack.file(night, _rel(root, night))} if night.exists() else None)
    return pack
