"""Builds the asset manifests and copies the pictures and sounds into place.

    python3 scripts/assets/build.py --ninja <dir> --sunnyside <dir> --crops <dir> --farm-kit <dir> --farm <dir> --village <dir> \
        --out assets --private-out <folder outside the repo> --work <temp dir>

Each --<pack> points at the unpacked pack folder (the one with LICENSE.txt, Sunnyside_World_Assets, and so on).
Needs Python 3.11+, Pillow and ffmpeg.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import crops
import farm_kit
import ninja
import private
import sunnyside


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for name in ("ninja", "sunnyside", "crops", "farm-kit", "farm", "village"):
        parser.add_argument(f"--{name}", type=Path)
    parser.add_argument("--out", type=Path, required=True, help="assets/ folder of the repository")
    parser.add_argument("--private-out", type=Path, help="folder outside the repository for packs that may not be shared")
    parser.add_argument("--work", type=Path, required=True, help="folder for converted sounds and joined strips")
    args = parser.parse_args()

    packs = []
    if args.ninja:
        packs.append(ninja.build(args.ninja, args.out / "ninja-adventure", args.work / "ninja-adventure"))
    if args.sunnyside:
        packs.append(sunnyside.build(args.sunnyside, args.out / "sunnyside", args.work / "sunnyside"))
    if args.crops:
        packs.append(crops.build(args.crops, args.out / "farming-crops"))
    if args.farm_kit:
        packs.append(farm_kit.build(args.farm_kit, args.out / "farm-kit"))
    if args.private_out:
        if args.farm:
            packs.append(private.farm(args.farm, args.private_out / "farm-rpg"))
        if args.village:
            packs.append(private.village(args.village, args.private_out / "village-top-down"))
    for pack in packs:
        pack.write()
        counts: dict[str, int] = {}
        for sprite in pack.sprites:
            counts[sprite["category"]] = counts.get(sprite["category"], 0) + 1
        animated = sum(1 for s in pack.sprites if s.get("clips"))
        print(pack.meta["id"], json.dumps(counts), f"animated={animated}", f"sounds={len(pack.sounds)}",
              f"verify={sum(1 for s in pack.sprites if s.get('verify'))}")


if __name__ == "__main__":
    main()
