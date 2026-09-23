"""Deterministic finishing for selected, retained Wasteland imagegen originals.

Requires Pillow and NumPy in the local art environment. This is an authoring
tool, not a game dependency. Pass explicit source and output paths so the
generated originals stay untouched outside the repository.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


def edge_metrics(rgb):
    pixels = np.asarray(rgb, dtype=np.int16)
    return {
        "left_right": round(float(np.abs(pixels[:, 0] - pixels[:, -1]).mean()), 3),
        "top_bottom": round(float(np.abs(pixels[0] - pixels[-1]).mean()), 3),
        "neighbor_x": round(float(np.abs(pixels[:, 0] - pixels[:, 1]).mean()), 3),
        "neighbor_y": round(float(np.abs(pixels[0] - pixels[1]).mean()), 3),
    }


def pair_edges(pixels, axis, band):
    """Blend opposing edge pairs toward their shared color, tapering inward."""
    view = np.swapaxes(pixels, 0, axis)
    size = view.shape[0]
    for offset in range(band):
        weight = (1 + math.cos(math.pi * offset / band)) / 2
        first = view[offset].copy()
        last = view[size - 1 - offset].copy()
        middle = (first + last) / 2
        view[offset] = first * (1 - weight) + middle * weight
        view[size - 1 - offset] = last * (1 - weight) + middle * weight


def finish_tile(source, output, preview, band):
    with Image.open(source) as original:
        if original.width != original.height:
            raise ValueError("tile source must be square")
        tile = original.convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    before = edge_metrics(tile)
    pixels = np.asarray(tile, dtype=np.float32).copy()
    pair_edges(pixels, 1, band)
    pair_edges(pixels, 0, band)
    finished = Image.fromarray(np.rint(np.clip(pixels, 0, 255)).astype(np.uint8), "RGB")
    finished.save(output, "PNG", optimize=True)
    if preview:
        view = Image.new("RGB", (2048, 2048))
        for y in range(2):
            for x in range(2):
                view.paste(finished, (x * 1024, y * 1024))
        view.save(preview, "PNG", optimize=True)
    return {"source_size": [original.width, original.height], "output_size": [1024, 1024],
            "edge_before": before, "edge_after": edge_metrics(finished), "band_pixels": band}


def finish_muzzle(source, output, preview):
    with Image.open(source) as original:
        if original.width != original.height or original.width % 2:
            raise ValueError("2x2 sheet source must be an even square")
        side = original.width // 2
        source_image = original.convert("RGBA")
    result = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    clear_fractions = []
    for row in range(2):
        for column in range(2):
            cell = source_image.crop((column * side, row * side,
                                      (column + 1) * side, (row + 1) * side))
            pixels = np.asarray(cell, dtype=np.uint8).copy()
            distance = np.minimum.outer(np.minimum(np.arange(side), np.arange(side)[::-1]),
                                        np.minimum(np.arange(side), np.arange(side)[::-1]))
            feather = np.minimum(distance / 36, 1)
            pixels[:, :, 3] = np.rint(pixels[:, :, 3] * feather).astype(np.uint8)
            cell = Image.fromarray(pixels, "RGBA").resize((480, 480), Image.Resampling.LANCZOS)
            result.paste(cell, (column * 512 + 16, row * 512 + 16))
            clear_fractions.append(round(float((np.asarray(cell)[:, :, 3] == 0).mean()), 4))
    result.save(output, "PNG", optimize=True)
    if preview:
        canvas = Image.new("RGBA", (1024, 1024), (35, 36, 38, 255))
        canvas.alpha_composite(result)
        canvas.convert("RGB").save(preview, "PNG", optimize=True)
    return {"source_size": [original.width, original.height], "output_size": [1024, 1024],
            "grid": [2, 2], "per_cell_source_alpha_clear": clear_fractions,
            "outer_alpha_nonzero": [int((np.asarray(result)[:, 0, 3] > 0).sum()),
                                    int((np.asarray(result)[:, -1, 3] > 0).sum()),
                                    int((np.asarray(result)[0, :, 3] > 0).sum()),
                                    int((np.asarray(result)[-1, :, 3] > 0).sum())]}


def finish_flipbook(source, output, preview, effect):
    with Image.open(source) as original:
        if original.width != original.height:
            raise ValueError("8x8 sheet source must be square")
        source_image = original.convert("RGBA")
        side = original.width
    result = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
    for row in range(8):
        for column in range(8):
            bounds = tuple(round(position * side / 8) for position in
                           (column, row, column + 1, row + 1))
            cell = source_image.crop(bounds)
            pixels = np.asarray(cell, dtype=np.uint8).copy()
            y_distance = np.minimum(np.arange(cell.height), np.arange(cell.height)[::-1])
            x_distance = np.minimum(np.arange(cell.width), np.arange(cell.width)[::-1])
            feather = np.minimum(np.minimum.outer(y_distance, x_distance) / 10, 1)
            pixels[:, :, 3] = np.rint(pixels[:, :, 3] * feather).astype(np.uint8)
            cell = Image.fromarray(pixels, "RGBA").resize((240, 240), Image.Resampling.LANCZOS)
            if effect in {"explosion", "smoke"}:
                pixels = np.asarray(cell, dtype=np.uint8).copy()
                y = np.arange(240, dtype=np.float32)
                if effect == "explosion":
                    # The source's low horizontal dust/reflection mark reaches the cell floor.
                    vertical_mask = np.clip((220 - y) / 28, 0, 1) if row >= 3 else np.ones(240)
                    if row >= 4:
                        # Late source rows also carry the preceding row's shadow at their top.
                        vertical_mask *= np.clip((y - 64) / 16, 0, 1)
                else:
                    # Keep the plume and taper away its detached, faint ground shadow.
                    vertical_mask = np.clip((230 - y) / 16, 0, 1)
                pixels[:, :, 3] = np.rint(pixels[:, :, 3] * vertical_mask[:, None]).astype(np.uint8)
                cell = Image.fromarray(pixels, "RGBA")
            result.paste(cell, (column * 256 + 8, row * 256 + 8))
    result.save(output, "PNG", optimize=True)
    if preview:
        canvas = Image.new("RGBA", (2048, 2048), (35, 36, 38, 255))
        canvas.alpha_composite(result)
        canvas.convert("RGB").save(preview, "PNG", optimize=True)
    alpha = np.asarray(result)[:, :, 3]
    clear = (alpha == 0).reshape(8, 256, 8, 256).mean(axis=(1, 3))
    return {"source_size": [side, side], "output_size": [2048, 2048],
            "grid": [8, 8], "effect": effect,
            "minimum_cell_clear_fraction": round(float(clear.min()), 4),
            "outer_alpha_nonzero": [int((alpha[:, 0] > 0).sum()),
                                    int((alpha[:, -1] > 0).sum()),
                                    int((alpha[0, :] > 0).sum()),
                                    int((alpha[-1, :] > 0).sum())]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["tile", "muzzle", "flipbook"])
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--band", type=int, default=96, help="tile seam blend width in final pixels")
    parser.add_argument("--effect", choices=["fire", "explosion", "smoke"],
                        help="specific flipbook finishing; required for flipbooks")
    options = parser.parse_args()
    if not options.source.is_file():
        parser.error("source image does not exist")
    if options.output.exists():
        parser.error("output already exists; use a new filename or remove it explicitly")
    if options.kind == "tile" and not 16 <= options.band <= 192:
        parser.error("tile blend width must be 16 to 192 pixels")
    if options.kind == "flipbook" and options.effect is None:
        parser.error("--effect is required for flipbooks")
    options.output.parent.mkdir(parents=True, exist_ok=True)
    if options.preview:
        options.preview.parent.mkdir(parents=True, exist_ok=True)
    if options.kind == "tile":
        report = finish_tile(options.source, options.output, options.preview, options.band)
    elif options.kind == "muzzle":
        report = finish_muzzle(options.source, options.output, options.preview)
    else:
        report = finish_flipbook(options.source, options.output, options.preview, options.effect)
    report.update(source_sha256=hashlib.sha256(options.source.read_bytes()).hexdigest(),
                  output_bytes=options.output.stat().st_size)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
