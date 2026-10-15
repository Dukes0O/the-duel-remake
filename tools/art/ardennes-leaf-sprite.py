"""Compose the Ardennes beech leaf-spray tiles from the real ambientCG LeafSet024 photographs.

Step one of the beech recipe (step two is tools/blender/ardennes-beech.py). Standard Python with Pillow:

  python tools/art/ardennes-leaf-sprite.py --source <folder holding LeafSet024_1K-JPG_Color.jpg and
      LeafSet024_1K-JPG_Opacity.jpg> --out <folder for the two tiles>

LeafSet024 is a CC0 photographed set of nine European beech leaves on a transparent background
(https://ambientcg.com/a/LeafSet024, download LeafSet024_1K-JPG.zip). The nine real leaves are cut
out of the 3 x 3 sheet and scattered, turned and shaded, into one spray tile with a cut-out edge.
No leaf shape is drawn here; only the arrangement is made. Same seed, same tile.
"""
import argparse
import hashlib
import json
import math
import random
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

SEED = 24
CELL = 1024 // 3
SOURCE_FILES = ("LeafSet024_1K-JPG_Color.jpg", "LeafSet024_1K-JPG_Opacity.jpg")
# Leaf spray: a ring of leaves turned outward from the middle, each overlapping its neighbours.
LEAVES = 27
HIGH_SIZE = 256


def cut_leaves(color, opacity):
    leaves = []
    for row in range(3):
        for column in range(3):
            box = (column * CELL, row * CELL, (column + 1) * CELL, (row + 1) * CELL)
            alpha = opacity.crop(box)
            # Pull the edge in so the pale photographic halo is not drawn.
            alpha = alpha.filter(ImageFilter.MinFilter(5)).point(lambda v: 255 if v > 128 else 0)
            bounds = alpha.getbbox()
            if not bounds:
                raise ValueError("No leaf in cell " + str((row, column)))
            leaf = color.crop(box).convert("RGB")
            leaf.putalpha(alpha)
            leaves.append(leaf.crop(bounds))
    return leaves


def compose(leaves, size):
    rng = random.Random(SEED)
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    centre = size / 2
    placed = []
    for index in range(LEAVES):
        leaf = leaves[index % len(leaves)].copy()
        # The leaf's own tip points up; turn it so the tip leads away from the middle, with some scatter.
        angle = rng.uniform(0, 360)
        radius = (0.05 + 0.27 * math.sqrt(rng.random())) * size
        scale = (0.16 + 0.05 * rng.random()) * size / max(leaf.size)
        leaf = leaf.resize((max(2, round(leaf.width * scale)), max(2, round(leaf.height * scale))), Image.Resampling.LANCZOS)
        shade = 0.78 + 0.30 * rng.random()
        leaf = Image.merge("RGBA", [leaf.getchannel(i).point(lambda v, s=shade: min(255, round(v * s))) for i in range(3)] + [leaf.getchannel("A")])
        # PIL turns counter-clockwise; leave the tip bearing within 35 degrees of "outward".
        turned = leaf.rotate(-(angle - 90) + rng.uniform(-35, 35), expand=True, resample=Image.Resampling.BICUBIC)
        x = centre + radius * math.cos(math.radians(angle)) - turned.width / 2
        y = centre + radius * math.sin(math.radians(angle)) - turned.height / 2
        x = min(max(x, 1), size - 1 - turned.width)
        y = min(max(y, 1), size - 1 - turned.height)
        placed.append((round(x), round(y), turned))
    for x, y, turned in placed:
        layer = Image.new("RGBA", tile.size, (0, 0, 0, 0))
        layer.paste(turned, (x, y), turned)
        tile = Image.alpha_composite(tile, layer)
    # Make alpha hard so the cut-out edge is crisp at every mip level; keep colour bleeding under the edge.
    alpha = tile.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    solid = tile.convert("RGB")
    background = Image.new("RGB", tile.size, (70, 100, 38))
    solid = Image.composite(solid, background, tile.getchannel("A").point(lambda v: 255 if v > 0 else 0))
    solid.putalpha(alpha)
    return solid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    color = Image.open(args.source / SOURCE_FILES[0])
    opacity = Image.open(args.source / SOURCE_FILES[1]).convert("L")
    if color.size != (1024, 1024) or opacity.size != (1024, 1024):
        raise ValueError("LeafSet024 1K source expected")
    leaves = cut_leaves(color, opacity)
    args.out.mkdir(parents=True, exist_ok=True)
    record = {"source": {name: hashlib.sha256((args.source / name).read_bytes()).hexdigest() for name in SOURCE_FILES},
              "leaves": len(leaves), "tiles": {}}
    high = compose(leaves, HIGH_SIZE)
    for name, tile in (("leaf-spray-256.png", high), ("leaf-spray-128.png", None)):
        if tile is None:
            tile = high.resize((128, 128), Image.Resampling.BOX)
            tile.putalpha(tile.getchannel("A").point(lambda v: 255 if v >= 128 else 0))
        path = args.out / name
        tile.save(path, optimize=True)
        record["tiles"][name] = {"bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    (args.out / "sprite.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
