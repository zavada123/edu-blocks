"""Tiny Swords (Pixel Frog) as fully described asset packs: every picture, frame, animation, tile and UI part.

    python3 scripts/assets/tiny_swords.py --old "<…>/Tiny Swords (Update 010)" --out assets/tiny-swords
    python3 scripts/assets/tiny_swords.py --free "<…>/Tiny Swords (Free Pack)" --out <private>/tiny-swords-free

Two versions of the pack:

- Update 010 (`--old`), the version Pixel Frog publishes as "TS_old version_CC0 Licensed": public domain, so it lives
  in this repository (`assets/tiny-swords/`).
- Free Pack 2025 (`--free`): may be used in games but the files may not be shared, so it is written to a private folder
  (`EDU_BLOCKS_PRIVATE_ASSETS`, the repository edu-assets-private).

Both use the same sprite ids where they show the same thing (`character/warrior-blue`, `item/gold`, `prop/house-red`…)
and the same clip names (`idle`, `run`, `attack`…), so a game or an AI can switch packs without new ids.

Each sprite carries, besides what the engine reads (`file`, `size`, `frame`, `clips`): a Ukrainian `title` and `about`,
English `tags`, the `roles` it can play in a level, its team `color`, the way it `faces`, the `anchor` it stands on and
the `bounds` of its visible pixels in a frame (both measured from the picture), the cells it covers (`footprint`), the
`tiles` of a tileset with their edges, and the `parts` of a UI picture for 3- and 9-slice scaling. The animations are
read from the rows of each sheet: a clip's frames are the drawn cells of its row. The build also writes CATALOG.md (the same in words) and
preview sheets (`preview/<category>.png`) with every sprite labelled by its id.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable

from PIL import Image, ImageDraw

from common import Pack

CELL = 64
EDGE_BITS = {"N": 1, "E": 2, "S": 4, "W": 8}
COLOR_UK = {"blue": "синій", "red": "червоний", "yellow": "жовтий", "purple": "фіолетовий", "black": "чорний"}
# The same colours in the cases the descriptions need: «з синім пером», «у синьому шоломі», «у синій рясі», «синього кольору».
COLOR_WITH = {"blue": "синім", "red": "червоним", "yellow": "жовтим", "purple": "фіолетовим", "black": "чорним"}
COLOR_IN = {"blue": "синьому", "red": "червоному", "yellow": "жовтому", "purple": "фіолетовому", "black": "чорному"}
COLOR_IN_F = {"blue": "синій", "red": "червоній", "yellow": "жовтій", "purple": "фіолетовій", "black": "чорній"}
COLOR_OF = {"blue": "синього", "red": "червоного", "yellow": "жовтого", "purple": "фіолетового", "black": "чорного"}

# ── Measuring pictures ──────────────────────────────────────────────────────────────────────────────────────────────


def _load(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def cell_boxes(path: Path, frame: tuple[int, int] | None) -> list[tuple[int, int, int, int] | None]:
    """The box of visible pixels in each cell of the grid, row by row (None for an empty cell)."""
    im = _load(path)
    fw, fh = frame or im.size
    alpha = im.getchannel("A")
    boxes: list[tuple[int, int, int, int] | None] = []
    for y in range(0, im.height - fh + 1, fh):
        for x in range(0, im.width - fw + 1, fw):
            boxes.append(alpha.crop((x, y, x + fw, y + fh)).getbbox())
    return boxes


def union(boxes: Iterable[tuple[int, int, int, int] | None]) -> tuple[int, int, int, int] | None:
    real = [b for b in boxes if b is not None]
    if not real:
        return None
    return min(b[0] for b in real), min(b[1] for b in real), max(b[2] for b in real), max(b[3] for b in real)


def row_frames(path: Path, frame: tuple[int, int], row: int) -> list[int]:
    """Indices of the drawn frames of one row of a sheet, from its first frame to its last drawn one."""
    im = _load(path)
    columns = im.width // frame[0]
    boxes = cell_boxes(path, frame)[row * columns:(row + 1) * columns]
    last = max((i for i, b in enumerate(boxes) if b is not None), default=-1)
    return [row * columns + i for i in range(last + 1)]


def strip_frames(path: Path, frame: tuple[int, int]) -> list[int]:
    boxes = cell_boxes(path, frame)
    last = max((i for i, b in enumerate(boxes) if b is not None), default=-1)
    return list(range(last + 1))


def parts_of(path: Path, grid: int | None = None) -> list[dict[str, Any]]:
    """The pieces of a UI picture: cut by a grid of `grid` pixels, or found between fully transparent rows and columns."""
    im = _load(path)
    alpha = im.getchannel("A")
    if grid is not None:
        cols = [(x, x + grid) for x in range(0, im.width, grid)]
        rows = [(y, y + grid) for y in range(0, im.height, grid)]
    else:
        def runs(length: int, empty: Callable[[int], bool]) -> list[tuple[int, int]]:
            out: list[tuple[int, int]] = []
            start = None
            for i in range(length + 1):
                filled = i < length and not empty(i)
                if filled and start is None:
                    start = i
                if not filled and start is not None:
                    out.append((start, i))
                    start = None
            return out
        cols = runs(im.width, lambda x: alpha.crop((x, 0, x + 1, im.height)).getbbox() is None)
        rows = runs(im.height, lambda y: alpha.crop((0, y, im.width, y + 1)).getbbox() is None)
    names = _part_names(len(rows), len(cols))
    parts = []
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            if alpha.crop((x0, y0, x1, y1)).getbbox() is None:
                continue
            parts.append({"name": names(r, c), "rect": [x0, y0, x1 - x0, y1 - y0]})
    return parts


def _part_names(rows: int, cols: int) -> Callable[[int, int], str]:
    vertical = ("top", "middle", "bottom")
    horizontal = ("left", "center", "right")
    if rows == 3 and cols == 3:
        def nine(r: int, c: int) -> str:
            if r == 1 and c == 1:
                return "center"
            if r == 1:
                return horizontal[c]
            if c == 1:
                return vertical[r]
            return f"{vertical[r]}-{horizontal[c]}"
        return nine
    if rows == 1 and cols == 3:
        return lambda r, c: horizontal[c]
    if cols == 1 and rows == 3:
        return lambda r, c: vertical[r]
    return lambda r, c: f"r{r}c{c}"


# ── Tiles ──────────────────────────────────────────────────────────────────────────────────────────────────────────

# A 4×4 block of a Tiny Swords terrain: the 3×3 area, the column one tile wide, the row one tile tall and the single
# tile. Each position lists the sides on which the terrain ends there (its neighbour on that side is not the terrain).
BLOCK16: dict[tuple[int, int], str] = {
    (0, 0): "NW", (1, 0): "N", (2, 0): "NE", (3, 0): "NEW",
    (0, 1): "W", (1, 1): "", (2, 1): "E", (3, 1): "EW",
    (0, 2): "SW", (1, 2): "S", (2, 2): "SE", (3, 2): "SEW",
    (0, 3): "NSW", (1, 3): "NS", (2, 3): "NES", (3, 3): "NESW",
}
EDGE_UK = {"N": "верх", "E": "правий бік", "S": "низ", "W": "лівий бік"}


def _mask(edges: str) -> int:
    return sum(EDGE_BITS[e] for e in edges)


def tile(col: int, row: int, columns: int, terrain: str, role: str, about: str, **extra: Any) -> dict[str, Any]:
    return {"index": row * columns + col + 1, "col": col, "row": row, "terrain": terrain, "role": role, "about": about, **extra}


def block16(ox: int, oy: int, columns: int, terrain: str, what: str) -> list[dict[str, Any]]:
    """The 16 tiles of a terrain block, each with its edges and `mask` (N 1, E 2, S 4, W 8: sides where it ends)."""
    out = []
    for (x, y), edges in BLOCK16.items():
        sides = ", ".join(EDGE_UK[e] for e in "NESW" if e in edges)
        about = f"{what}: {'середина, з усіх боків той самий ґрунт' if not edges else 'край там, де ' + sides}"
        out.append(tile(ox + x, oy + y, columns, terrain, "edge" if edges else "fill", about,
                        edges="".join(e for e in "NESW" if e in edges), mask=_mask(edges)))
    return out


# ── Sprites ────────────────────────────────────────────────────────────────────────────────────────────────────────


@dataclass
class Clip:
    """An animation: by row of the sprite's sheet, by explicit frames, or a strip in a file of its own."""

    name: str
    about: str
    loop: bool = True
    row: int | None = None
    frames: list[int] | None = None
    file: Path | None = None
    frame: tuple[int, int] | None = None
    fps: int | None = None


@dataclass
class Builder:
    pack: Pack
    root: Path
    previews: list[tuple[str, dict[str, Any], Path]] = field(default_factory=list)

    def add(self, sprite_id: str, src: str, target: str, category: str, name: str, title: str, about: str,
            tags: list[str], roles: list[str], *, frame: tuple[int, int] | None = None,
            clips: list[Clip] | None = None, fps: int = 10, layout: str | None = None, faces: str | None = None,
            mirror: bool = False, **extra: Any) -> dict[str, Any]:
        source = self.root / src
        grid = frame
        clip_json: dict[str, Any] = {}
        boxes: list[tuple[int, int, int, int] | None] = []
        # The figure stands where its first clip (the one it plays at rest) touches the ground.
        rest: list[tuple[int, int, int, int] | None] = []
        for c in clips or []:
            if c.file is not None:
                own_frame = c.frame or grid
                frames = c.frames if c.frames is not None else strip_frames(c.file, own_frame)
                own_target = self.pack.file(c.file, target if c.file == source else _target_for(target, c.name))
                entry = {"frames": frames, "fps": c.fps or fps, "loop": c.loop, "file": own_target,
                         "frame": list(own_frame), "size": list(_load(c.file).size)}
                cb = cell_boxes(c.file, own_frame)
            else:
                assert grid is not None, f"{sprite_id}: a clip without its own file needs a frame grid"
                frames = c.frames if c.frames is not None else row_frames(source, grid, c.row or 0)
                entry = {"frames": frames, "fps": c.fps or fps, "loop": c.loop}
                cb = cell_boxes(source, grid)
            if not frames:
                raise ValueError(f"{sprite_id} {c.name}: no frames")
            if mirror:
                entry["mirror"] = {"left": "right"}
            entry["about"] = c.about
            boxes.extend(cb[i] for i in frames if i < len(cb))
            if not rest:
                rest = [cb[i] for i in frames if i < len(cb)]
            clip_json[c.name] = entry
        main_boxes = cell_boxes(source, grid)
        if not boxes:
            boxes = main_boxes
        bounds = union(boxes)
        standing = union(rest) or bounds
        info: dict[str, Any] = {"title": title, "about": about, "tags": tags, "roles": roles}
        if grid is not None:
            info["frame"] = list(grid)
            info["frameCount"] = sum(1 for b in main_boxes if b is not None)
        if layout:
            info["layout"] = layout
        if faces:
            info["faces"] = faces
        if bounds is not None:
            x0, y0, x1, y1 = bounds
            info["bounds"] = [x0, y0, x1 - x0, y1 - y0]
        if standing is not None:
            sx0, _, sx1, sy1 = standing
            info["anchor"] = [round((sx0 + sx1) / 2), sy1]
        if clip_json:
            info["clips"] = clip_json
        info.update({k: v for k, v in extra.items() if v is not None})
        entry = self.pack.sprite(sprite_id, source, target, category, name, **info)
        self.previews.append((category, entry, source))
        return entry


def _target_for(target: str, clip: str) -> str:
    """Where a clip's own picture goes: next to the sprite's, `blue-idle.png` → `blue-run.png`, `gold.png` → `gold-highlight.png`."""
    stem, ext = target.rsplit(".", 1)
    base = stem.removesuffix("idle") if stem.endswith("-idle") else f"{stem}-"
    return f"{base}{clip}.{ext}"


# ── Output: manifest, catalogue, previews ──────────────────────────────────────────────────────────────────────────

ROLE_UK = {
    "hero": "герой", "npc": "мешканець", "enemy": "ворог", "animal": "тварина", "collectible": "предмет, який беруть",
    "obstacle": "перешкода", "goal": "мета", "building": "будівля", "decor": "декор", "ground": "земля",
    "water": "вода", "cliff": "скеля", "bridge": "міст", "path": "стежка", "effect": "ефект", "projectile": "снаряд",
    "ui-panel": "панель", "ui-button": "кнопка", "ui-icon": "іконка", "ui-bar": "смужка", "cursor": "курсор",
    "portrait": "портрет", "shadow": "тінь", "weather": "погода",
}


def write_catalog(pack: Pack, out: Path, intro: str) -> None:
    lines = [f"# {pack.meta['title']}: каталог спрайтів", "", intro, "",
             f"Спрайтів: {len(pack.sprites)}. Клітинка поля: {pack.meta['cell']}×{pack.meta['cell']} пікселів.", ""]
    by_cat: dict[str, list[dict[str, Any]]] = {}
    for s in sorted(pack.sprites, key=lambda s: s["id"]):
        by_cat.setdefault(s["category"], []).append(s)
    for cat, sprites in by_cat.items():
        lines += [f"## {cat}", "", f"![{cat}](preview/{cat}.png)", "",
                  "| id | Назва | Що це | Розмір / кадр | Анімації | Ролі |", "| --- | --- | --- | --- | --- | --- |"]
        for s in sprites:
            size = f"{s['size'][0]}×{s['size'][1]}" + (f" / {s['frame'][0]}×{s['frame'][1]}" if "frame" in s else "")
            clips = ", ".join(f"`{n}` ({len(c['frames'])})" for n, c in (s.get("clips") or {}).items()) or "—"
            roles = ", ".join(s.get("roles", [])) or "—"
            lines.append(f"| `{s['id']}` | {s['title']} | {s['about']} | {size} | {clips} | {roles} |")
        lines.append("")
        for s in sprites:
            if "tiles" in s:
                lines += [f"### Плитки `{s['id']}`", "", "| № | Стовпець, рядок | Ґрунт | Роль | Краї | Опис |",
                          "| --- | --- | --- | --- | --- | --- |"]
                for t in s["tiles"]:
                    lines.append(f"| {t['index']} | {t['col']}, {t['row']} | {t['terrain']} | {t['role']} | "
                                 f"{t.get('edges', '') or '—'} | {t['about']} |")
                lines.append("")
    (out / "CATALOG.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def _icon(entry: dict[str, Any], source: Path, out: Path) -> Image.Image:
    clips = entry.get("clips") or {}
    first = next(iter(clips.values()), None)
    if first is not None and "file" in first:
        im = _load(out / first["file"])
        fw, fh = first["frame"]
        index = first["frames"][0]
    else:
        im = _load(source)
        fw, fh = entry.get("frame") or entry["size"]
        index = first["frames"][0] if first is not None else 0
    columns = max(1, im.width // fw)
    x, y = (index % columns) * fw, (index // columns) * fh
    return im.crop((x, y, x + fw, y + fh))


def write_previews(builder: Builder, out: Path) -> None:
    """One sheet per category: each sprite's first frame on a checker, labelled with its id."""
    width, label, pad, max_side = 1400, 12, 8, 192
    by_cat: dict[str, list[tuple[dict[str, Any], Path]]] = {}
    for cat, entry, source in builder.previews:
        by_cat.setdefault(cat, []).append((entry, source))
    (out / "preview").mkdir(parents=True, exist_ok=True)
    for cat, items in by_cat.items():
        placed = []
        x = y = row_h = 0
        for entry, source in sorted(items, key=lambda i: i[0]["id"]):
            icon = _icon(entry, source, out)
            k = min(1.0, max_side / max(icon.size))
            if k < 1:
                icon = icon.resize((max(1, int(icon.width * k)), max(1, int(icon.height * k))), Image.NEAREST)
            w = max(icon.width, 7 * len(entry["id"].split("/")[-1]))
            if x + w > width:
                x, y, row_h = 0, y + row_h + label + pad, 0
            placed.append((entry, icon, x, y))
            x += w + pad
            row_h = max(row_h, icon.height)
        sheet = Image.new("RGBA", (width, y + row_h + label + pad), (86, 140, 112, 255))
        draw = ImageDraw.Draw(sheet)
        for entry, icon, px, py in placed:
            sheet.alpha_composite(icon, (px, py + label))
            draw.text((px, py), entry["id"].split("/")[-1], fill=(255, 255, 255, 255))
        sheet.convert("RGB").save(out / "preview" / f"{cat}.png", optimize=True)


def _compact(out: Path) -> None:
    """Lists of words and small objects on one line, so the manifest reads sprite by sprite."""
    path = out / "manifest.json"
    text = path.read_text(encoding="utf-8")
    text = re.sub(r'\[\s+("[^"\n]*"(?:,\s+"[^"\n]*")*)\s+\]', lambda m: "[" + re.sub(r",\s+", ", ", m.group(1)) + "]", text)
    text = re.sub(r'\{\s+("[a-z]+": "[a-z]+")\s+\}', r"{\1}", text)
    path.write_text(text, encoding="utf-8")


def finish(builder: Builder, out: Path, intro: str) -> None:
    builder.pack.write()
    _compact(out)
    write_catalog(builder.pack, out, intro)
    write_previews(builder, out)
    counts: dict[str, int] = {}
    for s in builder.pack.sprites:
        counts[s["category"]] = counts.get(s["category"], 0) + 1
    print(builder.pack.meta["id"], len(builder.pack.sprites), json.dumps(counts))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--old", type=Path, help="the unpacked 'Tiny Swords (Update 010)' folder (CC0)")
    parser.add_argument("--free", type=Path, help="the unpacked 'Tiny Swords (Free Pack)' folder (not shareable)")
    parser.add_argument("--out", type=Path, required=True, help="the pack folder to write")
    args = parser.parse_args()
    if (args.old is None) == (args.free is None):
        parser.error("give exactly one of --old and --free")
    if args.old is not None:
        import tiny_swords_old
        tiny_swords_old.build(args.old, args.out)
    else:
        import tiny_swords_free
        tiny_swords_free.build(args.free, args.out)


if __name__ == "__main__":
    main()
