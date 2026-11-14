"""Autotiles of Ninja Adventure: which tile of a terrain block fits which neighbours.

Every terrain block of the pack's tilesets is laid out the same way, 10 tiles wide and 4 high: a rounded patch, a
column and a row one cell wide, a single cell, and the tiles with inner corners. `LAYOUT` describes that layout once;
`BLOCKS` says where each block lies and what it shows. A tile gets `edges` (the sides where its ground ends) and
`corners` (the inner corners: both sides go on, the diagonal does not), as text and as bits.

Run `python3 scripts/assets/ninja_terrain.py` to write the tiles into `assets/ninja-adventure/manifest.json` without
building the whole pack again; `ninja.py` adds the same tiles when it builds.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

EDGE_BITS = {"N": 1, "E": 2, "S": 4, "W": 8}
CORNER_BITS = {"NE": 1, "SE": 2, "SW": 4, "NW": 8}

# (edges, inner corners) of every tile of a block, row by row. Read off `tileset-floor.png` by sampling the tiles.
LAYOUT: tuple[tuple[str, ...], ...] = (
    ("NW/", "N/", "NE/", "NEW/", "NW/SE", "N/SE", "N/SW", "NE/SW", "N/SE SW", "/NE SW"),
    ("W/", "/", "E/", "EW/", "W/SE", "/SE", "/SW", "E/SW", "/SE SW", "/SE NW"),
    ("SW/", "S/", "SE/", "ESW/", "W/NE", "/NE", "/NW", "E/NW", "/NE NW", "/NE SW NW"),
    ("NSW/", "NS/", "NES/", "NESW/", "SW/NE", "S/NE", "S/NW", "ES/NW", "S/NE NW", "/SE SW NW"),
)


def _block(col: int, row: int, terrain: str, over: str, title: str) -> dict[str, Any]:
    return {"col": col, "row": row, "terrain": terrain, "over": over, "title": title}


def _fills(terrain: str, title: str, *cells: tuple[int, int]) -> dict[str, Any]:
    return {"terrain": terrain, "title": title, "cells": cells}


# Blocks: the top-left tile, the ground they draw and the ground they lie on.
BLOCKS: dict[str, list[dict[str, Any]]] = {
    "tileset/floor": [
        _block(0, 7, "path", "grass", "Стежка"),
        _block(11, 7, "path-dark", "grass-dark", "Стежка в темній траві"),
        _block(0, 0, "sand", "clay", "Пісок на глині"),
    ],
    "tileset/water": [_block(0, 6, "water", "grass", "Вода")],
}

# Whole cells of a ground: the plain one (`fill`) and then ones with grass tufts (`variant`), shown now and then.
FILLS: dict[str, list[dict[str, Any]]] = {
    "tileset/floor": [
        _fills("grass", "Трава", (0, 12), (1, 12), (2, 12), (3, 12), (4, 12), (2, 11), (3, 11)),
        _fills("grass-dark", "Темна трава", (11, 12), (12, 12), (13, 12), (14, 12), (15, 12)),
        _fills("clay", "Глина", (0, 5), (1, 5), (2, 5), (3, 5), (4, 5)),
    ],
}


def _tile(col: int, row: int, columns: int, terrain: str, role: str, about: str, edges: str = "", corners: str = "") -> dict[str, Any]:
    entry: dict[str, Any] = {"index": row * columns + col + 1, "col": col, "row": row, "terrain": terrain, "role": role, "about": about}
    entry["edges"] = edges
    entry["mask"] = sum(EDGE_BITS[c] for c in edges)
    if corners:
        entry["corners"] = corners
        entry["cornerMask"] = sum(CORNER_BITS[c] for c in corners.split())
    return entry


def terrain_tiles(sprite_id: str, columns: int) -> list[dict[str, Any]] | None:
    """The described tiles of a tileset of the pack, or None when it has no terrain blocks."""
    out: list[dict[str, Any]] = []
    for fill in FILLS.get(sprite_id, []):
        for i, (col, row) in enumerate(fill["cells"]):
            about = fill["title"] + ("" if i == 0 else f": варіант {i}")
            out.append(_tile(col, row, columns, fill["terrain"], "fill" if i == 0 else "variant", about))
    for block in BLOCKS.get(sprite_id, []):
        for r, line in enumerate(LAYOUT):
            for c, spec in enumerate(line):
                edges, corners = spec.split("/")
                role = "fill" if edges == "" and corners == "" else "edge"
                parts = ([f"краї {edges}"] if edges else []) + ([f"кути {corners}"] if corners else [])
                about = block["title"] + (": " + ", ".join(parts) if parts else "")
                tile = _tile(block["col"] + c, block["row"] + r, columns, block["terrain"], role, about, edges, corners)
                tile["over"] = block["over"]
                out.append(tile)
    return sorted(out, key=lambda t: t["index"]) or None


def patch(manifest: Path) -> None:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    for sprite in data["sprites"]:
        tiles = terrain_tiles(sprite["id"], sprite["size"][0] // 16)
        if tiles is not None:
            sprite["tiles"] = tiles
    text = json.dumps(data, ensure_ascii=False, indent=1)
    text = re.sub(r"\[\s+([-\d,\s]+?)\s+\]", lambda m: "[" + re.sub(r"\s+", "", m.group(1)).replace(",", ", ") + "]", text)
    manifest.write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    patch(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parents[2] / "assets/ninja-adventure/manifest.json")
