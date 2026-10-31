"""Sunnyside World (Daniel Diggle): side-view farm people, goblin, skeleton, animals, crops, tileset and UI.

Licence V1 allows sharing the files as part of an educational course with a link to the pack page. It does not allow
repackaging or reselling them, or training AI on them.
"""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

from common import Pack, clip, compose_strip, size_of, slug, title

META = {
    "id": "sunnyside",
    "title": "Sunnyside World",
    "author": "Daniel Diggle",
    "source": "https://danieldiggle.itch.io/sunnyside",
    "license": {
        "name": "Sunnyside World licence V1",
        "url": "https://danieldiggle.itch.io/sunnyside",
        "redistribute": "educational-with-link",
        "terms": "Free and commercial projects, changes allowed. Sharing only as part of tutorials or educational courses "
                 "with a link to https://danieldiggle.itch.io/sunnyside. No repackaging or reselling, no NFT, no AI training.",
    },
    "cell": 16,
}

FRAME = (96, 64)
FPS = 10
STRIP = re.compile(r"^(?P<name>.+?)_strip(?P<count>\d+)$")
SEQUENCE = re.compile(r"^(?P<name>.+?)_(?P<step>\d{2})$")
LOOPING = {"idle", "walk", "run", "swimming", "waiting", "carry", "doing", "hammering", "mining", "reeling"}
HUMAN_LAYERS = {"base": "body", "tools": "tool"}


def _rel(pack: Pack, path: Path) -> str:
    rel = path.relative_to(pack.meta["_root"])
    return "/".join([*(slug(p) for p in rel.parent.parts), slug(rel.stem) + ".png"])


def _action(name: str) -> str:
    return {"hamering": "hammering", "walking": "walk"}.get(name, name)


def _grid_clip(pack: Pack, path: Path, count: int, action: str) -> dict:
    width, height = size_of(path)
    columns, rows = width // FRAME[0], height // FRAME[1]
    frames = min(count, columns * rows)
    return clip(list(range(frames)), FPS, action in LOOPING, file=pack.file(path, _rel(pack, path)), frame=list(FRAME),
                size=[width, height], **({"verify": True} if frames != count else {}))


def humans(pack: Pack, root: Path) -> None:
    """Layered people: a body, one of six hair styles and a tool layer, drawn on top of each other."""
    layers: dict[str, dict[str, dict]] = defaultdict(dict)
    for path in sorted((root / "Characters/Human").rglob("*_strip*.png")):
        match = STRIP.match(path.stem)
        if match is None:
            continue
        layer, action = match["name"].split("_", 1)
        action = _action(action)
        layers[layer][action] = _grid_clip(pack, path, int(match["count"]), action)
    for layer, clips in sorted(layers.items()):
        kind = HUMAN_LAYERS.get(layer, "hair")
        first = clips.get("idle") or next(iter(clips.values()))
        pack.sprite(f"character/human-{slug(layer)}", root / _source_of(pack, first["file"]), first["file"], "character",
                    f"Villager layer: {title(layer).lower()}", frame=list(FRAME), layout="side", layer=kind, clips=clips)


def _source_of(pack: Pack, target: str) -> Path:
    return pack.copies[target].relative_to(pack.meta["_root"])


def monsters(pack: Pack, root: Path) -> None:
    for folder, prefix in (("Goblin", "spr_"), ("Skeleton", "skeleton_")):
        clips = {}
        for path in sorted((root / f"Characters/{folder}/PNG").glob("*.png")):
            match = STRIP.match(path.stem)
            if match is None:
                continue
            action = _action(match["name"].removeprefix(prefix))
            clips[action] = _grid_clip(pack, path, int(match["count"]), action)
        first = clips.get("idle") or next(iter(clips.values()))
        pack.sprite(f"enemy/{slug(folder)}", root / _source_of(pack, first["file"]), first["file"], "enemy", title(folder),
                    frame=list(FRAME), layout="side", clips=clips)


ELEMENT_CATEGORY = {"Animals": "animal", "Plants": "decor", "Other": "prop", "VFX": "effect"}


def elements(pack: Pack, root: Path) -> None:
    for path in sorted((root / "Elements").rglob("*.png")):
        group = path.relative_to(root / "Elements").parts[0]
        if group == "Crops":
            continue
        category = ELEMENT_CATEGORY[group]
        match = STRIP.match(path.stem)
        name = (match["name"] if match else path.stem).removeprefix("spr_deco_")
        eid = f"{category}/{slug(name)}"
        if match is None:
            pack.sprite(eid, path, _rel(pack, path), category, title(name))
            continue
        frames = int(match["count"])
        width, _ = size_of(path)
        pack.strip(eid, path, _rel(pack, path), category, title(name), fps=FPS, loop=True,
                   clip_name="walk" if category == "animal" else "play", frames=frames if width % frames == 0 else None)


def _sequences(folder: Path) -> tuple[dict[str, list[Path]], list[Path]]:
    """Pictures named name_00, name_01… grouped by name, and the pictures that are not part of such a group."""
    groups: dict[str, list[Path]] = defaultdict(list)
    single = []
    for path in sorted(folder.glob("*.png")):
        match = SEQUENCE.match(path.stem)
        (groups[match["name"]].append(path) if match else single.append(path))
    for name, paths in list(groups.items()):
        if len(paths) < 2:
            single.extend(paths)
            del groups[name]
    return groups, single


def crops(pack: Pack, root: Path) -> None:
    """Each crop's growth stages 00–05 joined into one strip: frame 0 is the seed, the last is ready to harvest."""
    work = pack.meta["_work"]
    groups, single = _sequences(root / "Elements/Crops")
    for name, paths in sorted(groups.items()):
        target = f"elements/crops/{slug(name)}.png"
        width, height = compose_strip(paths, work / target)
        pack.sprite(f"crop/{slug(name)}", work / target, target, "crop", title(name), frame=[width, height],
                    clips={"grow": clip(list(range(len(paths))), 1, False)})
    for path in single:
        pack.sprite(f"item/{slug(path.stem)}", path, _rel(pack, path), "item", title(path.stem), group="farm")


def tileset(pack: Pack, root: Path) -> None:
    for path in sorted((root / "Tileset").glob("*.png")):
        cell = 32 if "32px" in path.stem else 16
        name = path.stem.removeprefix("spr_tileset_sunnysideworld_")
        pack.sprite(f"tileset/{slug(name)}", path, _rel(pack, path), "tileset", title(name), frame=[cell, cell], layout="grid")


def ui(pack: Pack, root: Path) -> None:
    work = pack.meta["_work"]
    groups, single = _sequences(root / "UI")
    for name, paths in sorted(groups.items()):
        target = f"ui/{slug(name)}.png"
        width, height = compose_strip(paths, work / target)
        pack.sprite(f"ui/{slug(name)}", work / target, target, "ui", title(name), frame=[width, height],
                    clips={"states": clip(list(range(len(paths))), 1, False)})
    for path in single:
        pack.sprite(f"ui/{slug(path.stem)}", path, _rel(pack, path), "ui", title(path.stem))
    for path in sorted((root / "UI/9slice_box_white").glob("*.png")):
        pack.sprite(f"ui/{slug(path.stem)}", path, _rel(pack, path), "ui", title(path.stem), group="9slice")


def build(root: Path, out: Path, work: Path) -> Pack:
    pack = Pack(meta={**META, "_root": root, "_work": work}, out=out)
    humans(pack, root)
    monsters(pack, root)
    elements(pack, root)
    crops(pack, root)
    tileset(pack, root)
    ui(pack, root)
    del pack.meta["_root"], pack.meta["_work"]
    return pack
