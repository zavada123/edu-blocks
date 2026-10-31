"""Ninja Adventure (Pixel-boy, CC0): characters, monsters, bosses, animals, items, effects, tilesets, UI and sounds."""

from __future__ import annotations

from pathlib import Path

from common import DIRECTIONS, Pack, clip, directional, gif_timing, guess_strip, size_of, slug, title, to_ogg

META = {
    "id": "ninja-adventure",
    "title": "Ninja Adventure",
    "author": "Pixel-boy, AAA",
    "source": "https://pixel-boy.itch.io/ninja-adventure-asset-pack",
    "license": {"name": "CC0 1.0", "url": "https://creativecommons.org/publicdomain/zero/1.0/", "redistribute": "yes"},
    "cell": 16,
}

WALK_FPS = 8
IDLE_FPS = 4
ATTACK_FPS = 12
FX_FPS = 12

ITEM_GROUPS = {"Food": "food", "Object": "object", "Other": "object", "Potion": "potion", "Projectile": "projectile",
               "Resource": "resource", "Scroll": "scroll", "Tool": "tool", "Treasure": "treasure", "Action": "action"}
LOOPING_FX = {"Projectile", "Particle", "Magic"}
# Strips whose frame count cannot be read from the size: checked by eye. 1 = a single picture.
FX_FRAMES = {"Magic/Shield": 6, "Arrow.png": 1, "BigKunai.png": 1, "Kunai.png": 1, "BigShuriken.png": 2}
SKIP_NAMES = ("Preview", "AllPreview", "WeaponPreview")


def _skip(path: Path) -> bool:
    return any(path.stem.startswith(s) for s in SKIP_NAMES) or path.suffix != ".png"


def _portrait(pack: Pack, path: Path, owner_id: str, name: str) -> str:
    variant = slug(path.stem.replace("Faceset", "")) if path.stem != "Faceset" else ""
    pid = f"{owner_id}{'-' + variant if variant else ''}-portrait"
    return pack.sprite(pid, path, slug_path(path, pack), "portrait", f"{name} (portrait)")["id"]


def slug_path(path: Path, pack: Pack) -> str:
    rel = path.relative_to(pack.meta["_root"])
    return "/".join([*(slug(p) for p in rel.parent.parts), slug(rel.stem) + rel.suffix.lower()])


def characters(pack: Pack, root: Path) -> None:
    """Sheets 64×112: a column per direction; rows 0–3 walk, 4 attack, 5 jump, 6: dead, item, special 1, special 2."""
    for folder in sorted((root / "Actor/Character").iterdir()):
        if not folder.is_dir():
            continue
        cid, name = f"character/{slug(folder.name)}", title(folder.name)
        portrait = None
        if (folder / "Faceset.png").exists():
            portrait = _portrait(pack, folder / "Faceset.png", cid, name)
        for sheet in sorted(folder.glob("*.png")):
            if sheet.stem not in ("SpriteSheet",) and size_of(sheet) != (64, 112):
                continue
            width, height = size_of(sheet)
            rows = height // 16
            clips = {
                "idle": clip(directional([0]), IDLE_FPS, True),
                "walk": clip(directional(list(range(min(4, rows)))), WALK_FPS, True),
            }
            if rows >= 7:
                clips |= {
                    "attack": clip(directional([4]), ATTACK_FPS, False),
                    "jump": clip(directional([5]), WALK_FPS, False),
                    "dead": clip([24], 1, False),
                    "item": clip([25], 1, False),
                    "special1": clip([26], 1, False),
                    "special2": clip([27], 1, False),
                }
            sid = cid if sheet.stem == "SpriteSheet" else f"{cid}-{slug(sheet.stem)}"
            pack.sprite(sid, sheet, slug_path(sheet, pack), "character", name, frame=[16, 16], layout="directions",
                        clips=clips, portrait=portrait, verify=True if rows < 7 else None)
    shadow = root / "Actor/Character/Shadow.png"
    pack.sprite("effect/character-shadow", shadow, slug_path(shadow, pack), "effect", "Shadow under a character")


def animated_ninja(pack: Pack, root: Path) -> None:
    """The big animated ninja: 32×32 frames, one file per action; 4 columns = directions, rows = frames."""
    folder = root / "Actor/CharacterAnimated/NinjaGreen/Separate"
    clips, first = {}, None
    for part in sorted(folder.glob("*.png")):
        width, height = size_of(part)
        columns, rows = width // 32, height // 32
        target = pack.file(part, slug_path(part, pack))
        first = first or target
        fps = WALK_FPS if part.stem in ("Walk", "Swim", "Push", "Climb") else IDLE_FPS if part.stem == "Idle" else ATTACK_FPS
        loop = part.stem in ("Walk", "Idle", "Swim", "Push", "Climb")
        if columns == 4:
            frames = {d: [r * 4 + c for r in range(rows)] for c, d in enumerate(DIRECTIONS)}
        elif columns == 1:
            frames = list(range(rows))
        else:
            # Jump is 3×4: columns down, up, left (mirror left for right), rows are frames.
            frames = {d: [r * columns + c for r in range(rows)] for c, d in enumerate(DIRECTIONS[:columns])}
        clips[slug(part.stem)] = clip(frames, fps, loop, file=target, frame=[32, 32], size=[width, height],
                                      **({"mirror": {"right": "left"}} if columns == 3 else {}))
    idle = folder / "Idle.png"
    pack.sprite("character/ninja-green-animated", idle, slug_path(idle, pack), "character", "Ninja green (detailed, 32 px)",
                frame=[32, 32], layout="directions", clips=clips)
    for weapon in sorted((root / "Actor/CharacterAnimated/Weapon").glob("*.png")):
        # 64×64 frames drawn over the ninja's attack: a column per direction, 4 frames down the column.
        pack.sprite(f"weapon/swing-{slug(weapon.stem)}", weapon, slug_path(weapon, pack), "weapon",
                    f"{title(weapon.stem)} swing for the detailed ninja", frame=[64, 64], layout="directions",
                    clips={"swing": clip(directional([0, 1, 2, 3]), ATTACK_FPS, False)})


def monsters(pack: Pack, root: Path) -> None:
    """Sheets 64×64: a column per direction, 4 walk frames."""
    for folder in sorted((root / "Actor/Monster").iterdir()):
        if not folder.is_dir():
            continue
        mid, name = f"enemy/{slug(folder.name)}", title(folder.name)
        portrait = None
        if (folder / "Faceset.png").exists():
            portrait = _portrait(pack, folder / "Faceset.png", mid, name)
        for sheet in sorted(folder.glob("*.png")):
            if sheet.stem.startswith("Faceset") or _skip(sheet):
                continue
            sid = mid if sheet.stem in ("SpriteSheet", folder.name) else f"{mid}-{slug(sheet.stem)}"
            pack.sprite(sid, sheet, slug_path(sheet, pack), "enemy", name, frame=[16, 16], layout="directions",
                        clips={"idle": clip(directional([0]), IDLE_FPS, True),
                               "walk": clip(directional([0, 1, 2, 3]), WALK_FPS, True)},
                        portrait=portrait)


def animals(pack: Pack, root: Path) -> None:
    """Side view, 2 frames in a row."""
    for folder in sorted((root / "Actor/Animal").iterdir()):
        if not folder.is_dir():
            continue
        aid, name = f"animal/{slug(folder.name)}", title(folder.name)
        for face in sorted(folder.glob("Faceset*.png")):
            _portrait(pack, face, aid, name)
        for sheet in sorted(folder.glob("SpriteShee*.png")):
            variant = slug(sheet.stem.replace("SpriteSheet", "").replace("SpriteShee", ""))
            width, height = size_of(sheet)
            pack.sprite(f"{aid}-{variant}" if variant else aid, sheet, slug_path(sheet, pack), "animal",
                        f"{name} {variant}".strip(), frame=[width // 2, height], layout="side",
                        clips={"idle": clip([0], 1, True), "walk": clip([0, 1], IDLE_FPS, True)})


def bosses(pack: Pack, root: Path) -> None:
    """One file per action, a strip each; frame counts and speed come from the pack's preview GIFs."""
    for folder in sorted((root / "Actor/Boss").iterdir()):
        bid, name = f"boss/{slug(folder.name)}", title(folder.name)
        portrait = _portrait(pack, folder / "Faceset.png", bid, name) if (folder / "Faceset.png").exists() else None
        clips, parts = {}, []
        for part in sorted(folder.glob("*.png")):
            if part.stem.startswith(("Faceset", "Preview")):
                continue
            if part.stem in ("Body1", "Body2", "BodyEnd", "Head", "Wing", "Sprite"):
                parts.append(part)
                continue
            width, height = size_of(part)
            timing = gif_timing(folder / f"{part.stem}Preview.gif") or gif_timing(folder / f"{part.stem}AttackPreview.gif")
            verify = False
            if timing is not None and width % timing[0] == 0:
                frames, fps = timing
            else:
                frames, verify = guess_strip(part)
                fps = ATTACK_FPS
            loop = part.stem.startswith(("Idle", "Walk", "AttackLoop"))
            clips[slug(part.stem)] = clip(list(range(frames)), fps, loop, file=pack.file(part, slug_path(part, pack)),
                                          frame=[width // frames, height], size=[width, height],
                                          **({"verify": True} if verify else {}))
        for part in parts:
            pid = bid if part.stem == "Sprite" else f"{bid}-{slug(part.stem)}"
            pack.sprite(pid, part, slug_path(part, pack), "boss", f"{name} {title(part.stem).lower()}",
                        clips=clips if part.stem == "Sprite" else None, portrait=portrait)
        if clips and not any(p.stem == "Sprite" for p in parts):
            main = clips.get("idle") or next(iter(clips.values()))
            pack.sprite(bid, pack.copies[main["file"]], main["file"], "boss", name, frame=main["frame"], clips=clips,
                        portrait=portrait)


def items(pack: Pack, root: Path) -> None:
    for path in sorted((root / "Items").rglob("*.png")):
        if _skip(path):
            continue
        rel = path.relative_to(root / "Items")
        if rel.parts[0] == "Weapons":
            weapon = rel.parts[1]
            suffix = "-in-hand" if path.stem == "SpriteInHand" else "" if path.stem == "Sprite" else f"-{slug(path.stem)}"
            pack.sprite(f"weapon/{slug(weapon)}{suffix}", path, slug_path(path, pack), "weapon",
                        f"{title(weapon)}{' in hand' if suffix == '-in-hand' else ''}")
            continue
        group = ITEM_GROUPS.get(rel.parts[0], slug(rel.parts[0]))
        width, height = size_of(path)
        if width >= height * 1.8:
            loop = "Coin" in path.stem
            pack.strip(f"item/{slug(path.stem)}", path, slug_path(path, pack), "item", title(path.stem),
                       fps=FX_FPS if loop else 1, loop=loop, clip_name="spin" if loop else "open", group=group)
        else:
            pack.sprite(f"item/{slug(path.stem)}", path, slug_path(path, pack), "item", title(path.stem), group=group)


def effects(pack: Pack, root: Path) -> None:
    for path in sorted((root / "FX").rglob("*.png")):
        if _skip(path):
            continue
        rel = path.relative_to(root / "FX")
        group = rel.parts[0]
        sub = [slug(p) for p in rel.parts[1:-1]]
        stem = slug(path.stem.replace("SpriteSheet", "")) or ""
        name_parts = sub + ([stem] if stem else [])
        if not name_parts:
            name_parts = [slug(path.stem)]
        category = "particle" if group == "Particle" else "effect"
        fid = f"{category}/{slug(group)}-{'-'.join(name_parts)}"
        if group == "Environment":
            pack.sprite(fid, path, slug_path(path, pack), category, title(path.stem), group="environment")
            continue
        pack.strip(fid, path, slug_path(path, pack), category, " ".join(title(p) for p in [group, *name_parts]),
                   fps=FX_FPS, loop=group in LOOPING_FX, group=slug(group), frames=FX_FRAMES.get(path.name if group ==
                   "Projectile" and not sub else "/".join(rel.parts[:-1])))


def backgrounds(pack: Pack, root: Path) -> None:
    for path in sorted((root / "Backgrounds/Tilesets").rglob("*.png")):
        pack.sprite(f"tileset/{slug(path.stem.replace('Tileset', '').replace('tileset_', '')) or 'tileset'}", path,
                    slug_path(path, pack), "tileset", title(path.stem), frame=[16, 16], layout="grid")
    for path in sorted((root / "Backgrounds/Animated").rglob("*.png")):
        if _skip(path):
            continue
        folder = path.parent.name
        stem = slug(path.stem)
        tid = f"terrain/{slug(folder)}" + ("" if stem in (slug(folder), "sprite-sheet") else f"-{stem}")
        pack.strip(tid, path, slug_path(path, pack), "terrain", f"{title(folder)} {title(path.stem).lower()}",
                   fps=IDLE_FPS * 2, loop=True)
    for path in sorted((root / "Backgrounds/Vehicles").glob("*.png")):
        pack.sprite(f"prop/{slug(path.stem)}", path, slug_path(path, pack), "prop", title(path.stem))


def ui(pack: Pack, root: Path) -> None:
    for path in sorted((root / "Ui").rglob("*.png")):
        if _skip(path) or path.stem == "Tuto":
            continue
        rel = path.relative_to(root / "Ui")
        group = slug(rel.parts[0])
        sub = [slug(p) for p in rel.parts[1:-1]]
        uid = f"ui/{group}-{'-'.join([*sub, slug(path.stem)])}"
        if group == "font":
            width, height = size_of(path)
            glyph = [8, 8] if "8x8" in path.stem else [24, 30]
            pack.sprite(uid, path, slug_path(path, pack), "font", title(path.stem), frame=glyph, layout="grid")
        elif group == "receptacle" and path.stem.startswith("Heart") and path.stem != "IconHeart":
            pack.strip(uid, path, slug_path(path, pack), "ui", title(path.stem), fps=1, loop=False, clip_name="states",
                       group=group)
        else:
            pack.sprite(uid, path, slug_path(path, pack), "ui", title(path.stem), group=group)


def sounds(pack: Pack, root: Path) -> None:
    """Sound effects and jingles, as Ogg. The music (60 MB) is left out of the repository."""
    work = pack.meta["_work"]
    for path in sorted((root / "Audio/Sounds").rglob("*.wav")) + sorted((root / "Audio/Jingles").rglob("*")):
        if path.suffix.lower() not in (".wav", ".ogg"):
            continue
        rel = path.relative_to(root / "Audio")
        group = slug(rel.parts[1]) if rel.parts[0] == "Sounds" else "jingle"
        target = "audio/" + "/".join(slug(p) for p in rel.parent.parts) + f"/{slug(path.stem)}.ogg"
        if path.suffix.lower() == ".wav":
            converted = work / target
            if not converted.exists():
                to_ogg(path, converted)
            source = converted
        else:
            source = path
        sid = pack.unique(f"sound/{group}-{slug(path.stem)}")
        pack.sounds.append({"id": sid, "file": pack.file(source, target), "group": group, "name": title(path.stem)})


def build(root: Path, out: Path, work: Path) -> Pack:
    pack = Pack(meta={**META, "_root": root, "_work": work}, out=out)
    characters(pack, root)
    animated_ninja(pack, root)
    monsters(pack, root)
    animals(pack, root)
    bosses(pack, root)
    items(pack, root)
    effects(pack, root)
    backgrounds(pack, root)
    ui(pack, root)
    sounds(pack, root)
    del pack.meta["_root"], pack.meta["_work"]
    return pack
