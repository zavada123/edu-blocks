"""Shared helpers for turning an asset pack into a manifest the game engine reads.

A manifest lists sprites (with their frame grid and animation clips) and sounds. Each clip names frame indices in
row-major order of the sprite's grid: index = row * columns + column, where columns = image width / frame width.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from PIL import Image

DIRECTIONS = ("down", "up", "left", "right")

# Lowest and highest frame width, relative to the height, accepted when a strip's frame count has to be guessed.
MIN_FRAME_RATIO = 0.5
MAX_FRAME_RATIO = 2.0
MAX_GUESSED_FRAMES = 64


def slug(text: str) -> str:
    """'NinjaBlue 2' -> 'ninja-blue-2', 'spr_deco_cow' -> 'spr-deco-cow'."""
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", text)
    text = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1-\2", text)
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return re.sub(r"-+", "-", text)


def title(text: str) -> str:
    """'NinjaBlue' -> 'Ninja Blue'."""
    return slug(text).replace("-", " ").capitalize()


def size_of(path: Path) -> tuple[int, int]:
    with Image.open(path) as im:
        return im.size


def _column_is_clear(alpha: Image.Image, x: int) -> bool:
    return alpha.crop((x, 0, x + 1, alpha.height)).getbbox() is None


def guess_strip(path: Path) -> tuple[int, bool]:
    """Frames in a horizontal strip and whether that is a guess worth checking by eye.

    Square frames (width divisible by height) are certain. Otherwise every frame count whose frames are between half and
    twice as wide as high is tried, and the one whose frame borders are most often transparent wins.
    """
    with Image.open(path) as im:
        width, height = im.size
        if width < height * 1.2:
            return 1, False
        if width % height == 0:
            return width // height, False
        alpha = im.convert("RGBA").getchannel("A")
        best: tuple[float, float, int] | None = None
        for count in range(2, MAX_GUESSED_FRAMES + 1):
            if width % count != 0:
                continue
            frame_width = width // count
            if not MIN_FRAME_RATIO * height <= frame_width <= MAX_FRAME_RATIO * height:
                continue
            borders = [k * frame_width for k in range(1, count)]
            clear = sum(_column_is_clear(alpha, x) or _column_is_clear(alpha, x - 1) for x in borders) / len(borders)
            score = (clear, -abs(frame_width - height), count)
            if best is None or score > best:
                best = score
        if best is None:
            return 1, True
        return best[2], True


def gif_timing(path: Path) -> tuple[int, int] | None:
    """Frame count and frames per second of a preview GIF."""
    if not path.exists():
        return None
    with Image.open(path) as im:
        count = getattr(im, "n_frames", 1)
        duration = im.info.get("duration") or 100
    return count, max(1, round(1000 / duration))


def directional(rows: list[int], columns: int = 4) -> dict[str, list[int]]:
    """Frames of a sheet with one column per direction (down, up, left, right): the given rows, per direction."""
    return {d: [row * columns + c for row in rows] for c, d in enumerate(DIRECTIONS[:columns])}


def clip(frames: Any, fps: int, loop: bool, **extra: Any) -> dict[str, Any]:
    return {"frames": frames, "fps": fps, "loop": loop, **extra}


@dataclass
class Pack:
    """A manifest being built, with the files to copy next to it."""

    meta: dict[str, Any]
    out: Path
    sprites: list[dict[str, Any]] = field(default_factory=list)
    sounds: list[dict[str, Any]] = field(default_factory=list)
    copies: dict[str, Path] = field(default_factory=dict)
    ids: set[str] = field(default_factory=set)

    def file(self, source: Path, target: str) -> str:
        """Plans copying `source` to `target` (relative to the pack folder) and returns `target`."""
        if target.startswith("/") or ".." in target.split("/"):
            raise ValueError(f"{target} would land outside the pack folder")
        previous = self.copies.get(target)
        if previous is not None and previous != source:
            raise ValueError(f"two files want {target}: {previous} and {source}")
        self.copies[target] = source
        return target

    def unique(self, wanted: str) -> str:
        sprite_id, n = wanted, 2
        while sprite_id in self.ids:
            sprite_id, n = f"{wanted}-{n}", n + 1
        self.ids.add(sprite_id)
        return sprite_id

    def sprite(self, sprite_id: str, source: Path, target: str, category: str, name: str, **extra: Any) -> dict[str, Any]:
        width, height = size_of(source)
        entry: dict[str, Any] = {
            "id": self.unique(sprite_id),
            "file": self.file(source, target),
            "category": category,
            "name": name,
            "size": [width, height],
        }
        entry.update({k: v for k, v in extra.items() if v is not None})
        self.sprites.append(entry)
        return entry

    def strip(self, sprite_id: str, source: Path, target: str, category: str, name: str, *, fps: int, loop: bool,
              clip_name: str = "play", frames: int | None = None, **extra: Any) -> dict[str, Any]:
        """A horizontal strip: one row of equal frames played as one clip."""
        verify = False
        if frames is not None and size_of(source)[0] % frames != 0:
            raise ValueError(f"{source} is not {frames} equal frames wide")
        if frames is None:
            frames, verify = guess_strip(source)
        width, height = size_of(source)
        if frames <= 1:
            return self.sprite(sprite_id, source, target, category, name, **extra)
        return self.sprite(sprite_id, source, target, category, name, frame=[width // frames, height],
                           clips={clip_name: clip(list(range(frames)), fps, loop)}, verify=verify or None, **extra)

    def write(self) -> None:
        self.out.mkdir(parents=True, exist_ok=True)
        for target, source in sorted(self.copies.items()):
            dest = self.out / target
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, dest)
        manifest = {**self.meta, "sprites": sorted(self.sprites, key=lambda s: s["id"])}
        if self.sounds:
            manifest["sounds"] = sorted(self.sounds, key=lambda s: s["id"])
        text = json.dumps(manifest, ensure_ascii=False, indent=1)
        # Frame lists on one line keep the file readable.
        text = re.sub(r"\[\s+([-\d,\s]+?)\s+\]", lambda m: "[" + re.sub(r"\s+", "", m.group(1)).replace(",", ", ") + "]", text)
        (self.out / "manifest.json").write_text(text + "\n", encoding="utf-8")


def compose_strip(sources: list[Path], dest: Path) -> tuple[int, int]:
    """Joins pictures side by side, in order, into a strip of equal frames (the largest picture's size).

    Smaller pictures stand on the bottom edge of their frame, centred, so a growing plant keeps its roots in place.
    Returns the frame size.
    """
    images = [Image.open(p).convert("RGBA") for p in sources]
    width = max(im.width for im in images)
    height = max(im.height for im in images)
    strip = Image.new("RGBA", (width * len(images), height))
    for i, im in enumerate(images):
        strip.paste(im, (i * width + (width - im.width) // 2, height - im.height))
    dest.parent.mkdir(parents=True, exist_ok=True)
    strip.save(dest, optimize=True)
    return width, height


def to_ogg(source: Path, dest: Path) -> None:
    """A sound as Ogg Vorbis (about a tenth of a WAV)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(source), "-c:a", "libvorbis", "-q:a", "4", str(dest)],
                   check=True)
