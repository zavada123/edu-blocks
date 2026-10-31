"""Tiny Swords (Pixel Frog): knights and goblins in four colours, buildings, resources, terrain, effects and UI.

The licence forbids redistributing the files, even changed, so the pack is written outside the repository like Tiny
Farm RPG and Village Top Down.

Units are side views facing right (mirror them for left). Each row of a unit sheet is one action; how many frames a row
has is read from the picture (the empty cells at the end of a row are not frames). Blue is the main look, the other
colours are variants.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from common import Pack, clip, slug, title

META = {
    "id": "tiny-swords",
    "title": "Tiny Swords",
    "author": "Pixel Frog",
    "source": "https://pixelfrog-assets.itch.io/tiny-swords",
    "license": {
        "name": "Pixel Frog licence",
        "url": "https://pixelfrog-assets.itch.io/tiny-swords",
        "redistribute": "no",
        "terms": "Personal and commercial projects, changes allowed, credit welcome but not required. The files must not "
                 "be redistributed, resold or repackaged, even changed.",
    },
    "cell": 64,
}

COLOURS = ("Blue", "Purple", "Red", "Yellow")
MIRROR = {"left": "right"}
UNIT_FPS = 10
# Unit sheets: (path under Factions, frame size, category, row names). Rows marked with "?" were named by eye.
UNITS = {
    "warrior": ("Knights/Troops/Warrior", 192, "character",
                ("idle", "run", "attack", "attack2", "attack-down", "attack-down2", "attack-up", "attack-up2")),
    "pawn": ("Knights/Troops/Pawn", 192, "character", ("idle", "run", "build", "chop", "carry-idle", "carry-run")),
    "archer": ("Knights/Troops/Archer", 192, "character",
               ("idle", "run", "shoot-up", "shoot-up-side", "shoot", "shoot-down-side", "shoot-down")),
    "goblin-torch": ("Goblins/Troops/Torch", 192, "enemy", ("idle", "run", "attack", "attack-down", "attack-up")),
    "goblin-tnt": ("Goblins/Troops/TNT", 192, "enemy", ("idle", "run", "throw")),
    "goblin-barrel": ("Goblins/Troops/Barrel", 128, "enemy",
                      ("hidden", "peek?", "open?", "run?", "rise?", "explode")),
}
LOOPING = {"idle", "run", "carry-idle", "carry-run", "hidden"}


def _row_lengths(path: Path, width: int, height: int) -> list[int]:
    """Frames in each row of a sheet: up to the last cell with something drawn in it."""
    with Image.open(path) as im:
        alpha = im.convert("RGBA").getchannel("A")
        lengths = []
        for row in range(im.height // height):
            filled = [c for c in range(im.width // width)
                      if alpha.crop((c * width, row * height, (c + 1) * width, (row + 1) * height)).getbbox()]
            lengths.append(max(filled) + 1 if filled else 0)
        return lengths


def _row_clips(path: Path, width: int, height: int, names: tuple[str, ...], fps: int,
               mirror: dict | None = None) -> tuple[dict, bool]:
    with Image.open(path) as im:
        columns = im.width // width
    clips, guessed = {}, False
    for row, (name, count) in enumerate(zip(names, _row_lengths(path, width, height))):
        guessed = guessed or name.endswith("?")
        name = name.rstrip("?")
        extra = {"mirror": mirror} if mirror else {}
        clips[name] = clip([row * columns + c for c in range(count)], fps, name in LOOPING, **extra)
    return clips, guessed


def _coloured(folder: Path, colour: str) -> Path:
    """The sheet of one colour, in its own folder or next to the others (names have typos: Archer_Purlple)."""
    inside = folder / colour
    found = sorted((inside if inside.is_dir() else folder).glob(f"*{colour[:3]}*.png"))
    if not found:
        raise FileNotFoundError(f"no {colour} picture in {folder}")
    return found[0]


def _units(pack: Pack, root: Path) -> None:
    factions = root / "Factions"
    for unit, (rel, size, category, rows) in UNITS.items():
        folder = factions / rel
        sheets = {c: _coloured(folder, c) for c in COLOURS}
        clips, guessed = _row_clips(sheets["Blue"], size, size, rows, UNIT_FPS, MIRROR)
        variants = {c.lower(): pack.file(sheets[c], f"units/{unit}/{c.lower()}.png") for c in COLOURS[1:]}
        pack.sprite(f"{category}/{unit}", sheets["Blue"], f"units/{unit}/blue.png", category, title(unit),
                    frame=[size, size], layout="side", clips=clips, variants=variants, verify=guessed or None)
    archer = factions / "Knights/Troops/Archer"
    parts = archer / "Archer + Bow"
    for layer, pattern, names in (("body", "Archer_{c}_(NoArms).png", ("idle?", "shoot?")),
                                  ("bow", "Archer_Bow_{c}.png", ("idle?", "shoot?"))):
        sheets = {c: parts / pattern.format(c=c) for c in COLOURS}
        clips, _ = _row_clips(sheets["Blue"], 192, 192, names, UNIT_FPS, MIRROR)
        variants = {c.lower(): pack.file(sheets[c], f"units/archer-parts/{layer}-{c.lower()}.png") for c in COLOURS[1:]}
        pack.sprite(f"character/archer-{layer}", sheets["Blue"], f"units/archer-parts/{layer}-blue.png", "character",
                    f"Archer {layer} (no arms)" if layer == "body" else "Archer bow", frame=[192, 192], layout="side",
                    layer=layer, group="archer-parts", clips=clips, variants=variants, verify=True)
    arrow = archer / "Arrow/Arrow.png"
    pack.sprite("weapon/arrow", arrow, "units/arrow.png", "weapon", "Arrow (flying, stuck)", frame=[64, 64],
                layout="grid")
    dead = factions / "Knights/Troops/Dead/Dead.png"
    clips, _ = _row_clips(dead, 128, 128, ("die?", "fade?"), 8)
    pack.sprite("effect/dead", dead, "units/dead.png", "effect", "Dead (skull)", frame=[128, 128], clips=clips,
                verify=True)
    dynamite = factions / "Goblins/Troops/TNT/Dynamite/Dynamite.png"
    pack.strip("weapon/dynamite", dynamite, "units/dynamite.png", "weapon", "Dynamite", fps=12, loop=True, frames=6)


def _buildings(pack: Pack, root: Path) -> None:
    knights = root / "Factions/Knights/Buildings"
    for kind in ("Castle", "House", "Tower"):
        folder = knights / kind
        looks = {c.lower(): folder / f"{kind}_{c}.png" for c in COLOURS[1:]}
        looks |= {s.lower(): folder / f"{kind}_{s}.png" for s in ("Construction", "Destroyed")}
        variants = {k: pack.file(p, f"buildings/{slug(kind)}-{k}.png") for k, p in looks.items()}
        pack.sprite(f"prop/{slug(kind)}", folder / f"{kind}_Blue.png", f"buildings/{slug(kind)}-blue.png", "prop",
                    kind, group="building", variants=variants)
    goblins = root / "Factions/Goblins/Buildings"
    house = goblins / "Wood_House"
    pack.sprite("prop/goblin-house", house / "Goblin_House.png", "buildings/goblin-house.png", "prop", "Goblin house",
                group="building",
                variants={"destroyed": pack.file(house / "Goblin_House_Destroyed.png",
                                                 "buildings/goblin-house-destroyed.png")})
    tower = goblins / "Wood_Tower"
    variants = {c.lower(): pack.file(tower / f"Wood_Tower_{c}.png", f"buildings/wood-tower-{c.lower()}.png")
                for c in COLOURS[1:]}
    variants |= {k: pack.file(tower / f"Wood_Tower_{n}.png", f"buildings/wood-tower-{k}.png")
                 for k, n in (("construction", "InConstruction"), ("destroyed", "Destroyed"))}
    pack.strip("prop/wood-tower", tower / "Wood_Tower_Blue.png", "buildings/wood-tower-blue.png", "prop",
               "Goblin wood tower", fps=8, loop=True, frames=4, group="building", variants=variants)


def _resources(pack: Pack, root: Path) -> None:
    res = root / "Resources"
    mine = res / "Gold Mine"
    pack.sprite("prop/gold-mine", mine / "GoldMine_Inactive.png", "resources/gold-mine.png", "prop", "Gold mine",
                variants={k: pack.file(mine / f"GoldMine_{n}.png", f"resources/gold-mine-{k}.png")
                          for k, n in (("active", "Active"), ("destroyed", "Destroyed"))})
    for letter, name in (("G", "gold"), ("M", "meat"), ("W", "wood")):
        folder = res / "Resources"
        spawn = pack.file(folder / f"{letter}_Spawn.png", f"resources/{name}-spawn.png")
        pack.sprite(f"item/{name}", folder / f"{letter}_Idle.png", f"resources/{name}.png", "item", title(name),
                    group="resource",
                    variants={"no-shadow": pack.file(folder / f"{letter}_Idle_(NoShadow).png",
                                                     f"resources/{name}-no-shadow.png")},
                    clips={"spawn": clip(list(range(7)), 10, False, file=spawn, frame=[128, 128], size=[896, 128])})
    sheep = res / "Sheep/HappySheep_All.png"
    clips, _ = _row_clips(sheep, 128, 128, ("idle", "bounce"), 8)
    clips["bounce"] = {**clips["bounce"], "loop": True}
    pack.sprite("animal/sheep", sheep, "resources/sheep.png", "animal", "Sheep", frame=[128, 128], layout="side",
                clips=clips)
    tree = res / "Trees/Tree.png"
    clips, _ = _row_clips(tree, 192, 192, ("idle", "hit", "stump"), 8)
    clips["idle"] = {**clips["idle"], "loop": True}
    pack.sprite("decor/tree", tree, "resources/tree.png", "decor", "Tree (sway, hit, stump)", frame=[192, 192],
                clips=clips)


def _terrain(pack: Pack, root: Path) -> None:
    ground = root / "Terrain"
    for rel, name in (("Ground/Tilemap_Flat.png", "Flat ground"), ("Ground/Tilemap_Elevation.png", "Cliffs"),
                      ("Bridge/Bridge_All.png", "Bridge"), ("Water/Water.png", "Water")):
        pack.sprite(f"tileset/{slug(Path(rel).stem)}", ground / rel, f"terrain/{slug(Path(rel).stem)}.png", "tileset",
                    name, frame=[64, 64], layout="grid")
    pack.sprite("decor/shadow", ground / "Ground/Shadows.png", "terrain/shadows.png", "decor", "Cliff shadow")
    pack.strip("terrain/foam", ground / "Water/Foam/Foam.png", "terrain/foam.png", "terrain", "Shore foam", fps=8,
               loop=True, frames=8)
    for n in range(1, 5):
        pack.strip(f"terrain/rocks-{n}", ground / f"Water/Rocks/Rocks_0{n}.png", f"terrain/rocks-{n}.png", "terrain",
                   f"Rocks in water {n}", fps=8, loop=True, frames=8)
    for picture in sorted((root / "Deco").glob("*.png")):
        pack.sprite(f"decor/deco-{picture.stem}", picture, f"deco/{picture.stem}.png", "decor", f"Decor {picture.stem}")


def _effects(pack: Pack, root: Path) -> None:
    fx = root / "Effects"
    pack.strip("effect/explosion", fx / "Explosion/Explosions.png", "effects/explosion.png", "effect", "Explosion",
               fps=12, loop=False, frames=9)
    pack.strip("effect/fire", fx / "Fire/Fire.png", "effects/fire.png", "effect", "Fire", fps=10, loop=True, frames=7)


def _ui(pack: Pack, root: Path) -> None:
    ui = root / "UI"
    icons = ui / "Icons"
    for picture in sorted(icons.glob("Regular_*.png")):
        n = picture.stem.split("_")[1]
        pack.sprite(f"ui/icon-{n}", picture, f"ui/icons/{n}.png", "ui", f"Icon {n}", group="icon",
                    variants={k: pack.file(icons / f"{s}_{n}.png", f"ui/icons/{n}-{k}.png")
                              for k, s in (("pressed", "Pressed"), ("disabled", "Disable"))})
    for folder in ("Banners", "Buttons", "Pointers", "Ribbons"):
        for picture in sorted((ui / folder).glob("*.png")):
            name = slug(picture.stem)
            pack.sprite(f"ui/{slug(folder)}-{name}", picture, f"ui/{slug(folder)}/{name}.png", "ui",
                        title(picture.stem), group=slug(folder).rstrip("s"))


def build(root: Path, out: Path) -> Pack:
    pack = Pack(meta=dict(META), out=out)
    _units(pack, root)
    _buildings(pack, root)
    _resources(pack, root)
    _terrain(pack, root)
    _effects(pack, root)
    _ui(pack, root)
    return pack
