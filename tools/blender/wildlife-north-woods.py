"""WILD-ART-SRC: private beaver colour adaptation from the licensed Poly original.

Source preparation only; fit, axes, grounding and art judgment are separate.
blender -b --disable-autoexec --threads 4 --python-exit-code 1 \
  --python tools/blender/wildlife-north-woods.py -- --root . --model beaver \
  --output-dir .qa-dist/wild-north-woods-beaver

--paths-only plans paths using the standard library, without source/config reads,
Blender imports, image generation or directory creation. No runtime installation.
"""
import argparse
import copy
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

ORIGINAL_SHA256 = "37e595b4916758e1c03ef816e4fa4f334e797fa90f095ccdd34832a522d097f1"
ORIGINAL_BYTES = 41468
ORIGINAL_PATH = Path("C:/Users/kyleb/dev/art-library/wild-north-woods/poly-beaver-original.glb")


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--model", choices=("beaver",), default="beaver")
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--paths-only", action="store_true")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    root = args.root.resolve()
    output = (root / args.output_dir).resolve()
    if ".." in args.output_dir.parts or not any(
            output.is_relative_to(root / private) and output != root / private
            for private in (".qa-dist", ".evidence")):
        raise ValueError("Output must be a named private child inside the supplied root")
    return args, root, output


def output_plan(output):
    return {"blend": [], "glb": [str(output / "beaver-source-unfitted.glb")],
            "json": [str(output / "manifest.json")],
            "atlas": [str(output / "beaver-colour.png")], "evidence": [], "summary": []}


def read_original(data):
    if len(data) != ORIGINAL_BYTES or hashlib.sha256(data).hexdigest() != ORIGINAL_SHA256:
        raise ValueError("Approved original beaver bytes/SHA256 changed")
    magic, version, size = struct.unpack_from("<4sII", data)
    json_size, json_type = struct.unpack_from("<II", data, 12)
    if (magic, version, size, json_type) != (b"glTF", 2, len(data), 0x4E4F534A):
        raise ValueError("Approved original must be a complete GLB2 container")
    document = json.loads(data[20:20 + json_size])
    binary_size, binary_type = struct.unpack_from("<II", data, 20 + json_size)
    binary = data[28 + json_size:]
    if binary_type != 0x004E4942 or len(binary) != binary_size:
        raise ValueError("Approved original must have one complete binary chunk")
    primitive = document["meshes"][0]["primitives"][0]
    if (len(document["meshes"]), len(document["materials"]), primitive["mode"],
            document["accessors"][primitive["indices"]]["count"],
            document["accessors"][primitive["attributes"]["POSITION"]]["count"]) != (1, 1, 4, 1704, 1122):
        raise ValueError("Approved 568-triangle/1122-vertex donor structure changed")
    if document.get("skins") or document.get("animations"):
        raise ValueError("This actual donor has no rig or clips")
    image = document["images"][0]
    image_view = document["bufferViews"][image["bufferView"]]
    if image["mimeType"] != "image/png" or image_view["byteOffset"] != 39312 or image_view["byteLength"] != 114:
        raise ValueError("Approved four-tile embedded atlas binding changed")
    if any(view["byteOffset"] >= image_view["byteOffset"] for index, view in
           enumerate(document["bufferViews"]) if index != image["bufferView"]):
        raise ValueError("Image replacement must not move any geometry view")
    return document, binary, image["bufferView"]


def noise(x, y, seed):
    value = ((x * 374761393) ^ (y * 668265263) ^ seed) & 0xFFFFFFFF
    value = ((value ^ (value >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((value ^ (value >> 16)) & 0xFFFF) / 32767.5 - 1


def paint_atlas(plan, path):
    # Import only after paths, approved inputs and parameters have been checked.
    import bpy
    size, padding, seed = plan["size"], plan["padding"], plan["seed"]
    pixels = [0.0] * (size * size * 4)
    tile_size = size // 2
    for y in range(size):
        for x in range(size):
            # Image-row coordinates: source PNG's top-left origin. Clamp detail
            # at each tile edge so its original palette role has padded bleed.
            tx, ty = x // tile_size, y // tile_size
            px = min(tile_size - 1 - padding, max(padding, x % tile_size))
            py = min(tile_size - 1 - padding, max(padding, y % tile_size))
            tile = plan["tiles"][ty * 2 + tx]
            broad = noise(px // 37, py // 43, seed) * .06
            if tile["detail"] == "fur":
                detail = .045 * noise(px // 3, py // 17, seed + 11) + .025 * math.sin(px * 1.7 + py * .17)
            elif tile["detail"] == "tail":
                detail = .035 * math.sin(px * .28 + py * .11) * math.sin(py * .31 - px * .08)
            else:
                detail = .01 * noise(px // 5, py // 5, seed + 23)
            factor = 1 + (broad + detail) * tile["strength"]
            # Blender pixels are bottom-up; no UV or image-role flip is applied.
            offset = ((size - 1 - y) * size + x) * 4
            pixels[offset:offset + 4] = [min(1, max(0, channel / 255 * factor))
                                          for channel in tile["colour"]] + [1.0]
    image = bpy.data.images.new("beaver-four-tile-colour", width=size, height=size, alpha=True)
    try:
        # These are encoded base-colour values, not a rendered/view-transformed
        # image. The unchanged glTF baseColorTexture remains sRGB at runtime.
        image.colorspace_settings.name = "Non-Color"
        image.pixels.foreach_set(pixels)
        image.file_format = "PNG"
        image.filepath_raw = str(path)
        image.save()
    finally:
        bpy.data.images.remove(image)


def adapt_container(document, binary, image_index, png):
    changed = copy.deepcopy(document)
    image_view = changed["bufferViews"][image_index]
    prefix = binary[:image_view["byteOffset"]]
    new_binary = prefix + png
    image_view["byteLength"] = len(png)
    changed["buffers"][0]["byteLength"] = len(new_binary)
    # Copy all original positions, normals, UVs, indices, material and sampler;
    # avoid a Blender geometry re-export that can reorder or split vertices.
    encoded = json.dumps(changed, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    encoded += b" " * (-len(encoded) % 4)
    new_binary += b"\0" * (-len(new_binary) % 4)
    size = 12 + 8 + len(encoded) + 8 + len(new_binary)
    data = (struct.pack("<4sII", b"glTF", 2, size) +
            struct.pack("<II", len(encoded), 0x4E4F534A) + encoded +
            struct.pack("<II", len(new_binary), 0x004E4942) + new_binary)
    return data, hashlib.sha256(prefix).hexdigest()


def main():
    args, root, output = arguments()
    if args.paths_only:
        print(json.dumps(output_plan(output)))
        return
    if root != Path(__file__).resolve().parents[2]:
        raise ValueError("Actual adaptation must use this recipe's own checkout")
    if output.exists():
        raise ValueError("Use a new absent private output leaf; never overwrite a prior packet")
    config = json.loads((root / "tools/art/wildlife-north-woods.json").read_text(encoding="utf-8"))
    beaver = next(row for row in config["models"] if row["id"] == "beaver")
    if (beaver["author"], beaver["licence"], beaver["original"]["file"], beaver["original"]["sha256"]) != (
            "Poly by Google", "CC-BY-3.0", ORIGINAL_PATH.name, ORIGINAL_SHA256):
        raise ValueError("Approved source/credit metadata changed")
    plan = beaver["adaptationPlan"]
    if plan["size"] != 512 or plan["padding"] != 16 or len(plan["tiles"]) != 4 or plan["seed"] != 1989:
        raise ValueError("Approved deterministic 512 four-tile paint parameters changed")
    if any(len(tile["colour"]) != 3 or any(type(c) is not int or c < 0 or c > 255 for c in tile["colour"])
           or tile["detail"] not in ("fur", "tail", "marks") or
           not isinstance(tile["strength"], (int, float)) or not 0 <= tile["strength"] <= 1
           for tile in plan["tiles"]):
        raise ValueError("Invalid bounded tile paint parameters")
    source = ORIGINAL_PATH.read_bytes()
    document, binary, image_index = read_original(source)
    # The licensed original is never opened for writing or copied into the repo.
    output.mkdir(parents=True, exist_ok=False)
    png_path = output / "beaver-colour.png"
    paint_atlas(plan, png_path)
    png = png_path.read_bytes()
    candidate, prefix_sha = adapt_container(document, binary, image_index, png)
    with (output / "beaver-source-unfitted.glb").open("xb") as target:
        target.write(candidate)
    manifest = {"card": "WILD-ART-SRC", "model": "beaver", "sourceSha256": ORIGINAL_SHA256,
                "author": beaver["author"], "source": beaver["source"], "licence": beaver["licence"],
                "licenceUrl": beaver["licenceUrl"], "adaptation": "512 colour atlas; original geometry and UVs",
                "candidateSha256": hashlib.sha256(candidate).hexdigest(), "geometryPrefixSha256": prefix_sha,
                "textureSha256": hashlib.sha256(png).hexdigest(), "triangles": 568, "vertices": 1122,
                "skins": 0, "clips": [], "unfitted": True, "axes": "unchanged donor coordinates; metric fit unverified",
                "artAccepted": False, "runtimeInstalled": False, "otherDonors": "blocked; not generated"}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output_plan(output)))


if __name__ == "__main__":
    main()
