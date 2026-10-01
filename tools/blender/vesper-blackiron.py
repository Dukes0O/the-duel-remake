"""Private Vesper costume fit; preserve the current Odessa donor byte-for-byte.

blender -b --python-exit-code 1 --python tools/blender/vesper-blackiron.py -- \
  --root REPO --fit-config tools/art/vesper-fit.json --output-dir .qa-dist/vesper-art

Blender imports the genuine figure and produces its changed color/surface
atlases. Lossless material/image rebinding retains the donor's accessor bytes,
rig and twelve action tracks instead of resampling them through another export.
This leaf never installs a model, adds a crew identity or reveals Vesper.
"""
import argparse
import copy
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

SOURCE_PINS = (
    ("public/assets/models/wasteland/crew/odessa.glb", "364de3fd43de474eb4ef0fd12b859940f067549b02f2922b432d3a0c422170ca"),
    ("tools/blender/crew-fighters.py", "661eb808f94c338ba913b0fc8efdb9118d12984d0ba0669bc2e1de932d391857"),
    ("public/assets/reference/wasteland-crew-1.png", "af27e7925f95972c5ec842f5573640f2b8d36aece5429c0357325f7c28078058"),
    ("public/assets/reference/CREDITS.md", "1062f54070340b87c10ec40b1d528f17845d723ac313b446b9bd4d2ecae863ad"),
)
ACTIONS = ("idle", "walk", "sprint", "jump", "knockdown", "get-up",
           "aim", "fire", "reload", "repair", "enter", "exit")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def contained(root, value):
    path = Path(value)
    path = (root / path if not path.is_absolute() else path).resolve()
    try:
        local = path.relative_to(root)
    except ValueError:
        raise ValueError("Path must remain inside the supplied repository root")
    return path, local


def validate(root, config_path, output):
    # All source/output checks precede importing bpy or creating any output.
    output, local = contained(root, output)
    if len(local.parts) < 2 or local.parts[0] not in (".qa-dist", ".evidence"):
        raise ValueError("Output must be a named private .qa-dist/ or .evidence/ child")
    if output.exists():
        raise ValueError("Output must be a new absent private folder; an existing destination is refused")
    config_path, _ = contained(root, config_path)
    fit = json.loads(config_path.read_text(encoding="utf-8"))
    expected = [{"path": path, "sha256": sha} for path, sha in SOURCE_PINS]
    if fit.get("id") != "vesper" or fit.get("version") != 1:
        raise ValueError("Only the private Vesper costume contract is supported")
    if fit.get("source") != expected[0] or fit.get("provenance") != expected:
        raise ValueError("Source/provenance SHA-256 binding differs from the approved donor")
    for record in expected:
        source, _ = contained(root, record["path"])
        if not source.is_file() or digest(source.read_bytes()) != record["sha256"]:
            raise ValueError("Source checksum mismatch: " + record["path"])
    costume = fit["costume"]
    atlas = costume["atlas"]
    if atlas["size"] != [1024, 1024] or atlas["viewColumns"] != [0, 341, 683, 1024]:
        raise ValueError("Costume must retain the original 1024 three-view atlas layout")
    for role in ("blackenedSteel", "darkRed", "cloth", "leather", "wear"):
        color = costume["palette"][role]
        if len(color) != 3 or not all(isinstance(c, (int, float)) and math.isfinite(c) and 0 <= c <= 1 for c in color):
            raise ValueError("Invalid costume palette: " + role)
    for key in ("steelTorsoRows", "beltRows", "kneesRows", "redSleeveRows", "strapRows"):
        first, last = atlas[key]
        if not (0 <= first < last <= 1024):
            raise ValueError("Invalid costume atlas rows: " + key)
    if not (0 <= atlas["preserveFaceThroughRow"] < atlas["bootsStartRow"] < 1024):
        raise ValueError("Costume atlas must preserve the original face region")
    if not (0 < atlas["strapWidth"] < 30) or not isinstance(costume["seed"], int):
        raise ValueError("Invalid costume strap width or deterministic seed")
    return fit, output


def read_glb(data):
    if data[:4] != b"glTF" or struct.unpack_from("<II", data, 4) != (2, len(data)):
        raise ValueError("Approved donor is not a complete GLB2")
    document = binary = None
    offset = 12
    while offset < len(data):
        length, kind = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8:offset + 8 + length]
        if kind == 0x4E4F534A:
            document = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = chunk
        offset += length + 8
    if document is None or binary is None or offset != len(data):
        raise ValueError("Approved donor needs actual JSON and embedded binary chunks")
    if len(document["buffers"]) != 1 or any(item.get("uri") for item in document["buffers"] + document["images"]):
        raise ValueError("Private costume requires embedded donor resources only")
    return document, binary


def view_bytes(document, binary, index):
    view = document["bufferViews"][index]
    start = view.get("byteOffset", 0)
    return binary[start:start + view["byteLength"]]


def accessor_hashes(document, binary):
    # Hash the exact bound bytes, including interleaved stride, for every
    # accessor. No geometry, animation, joint/weight or bind view is rewritten.
    return [{"index": index, "bufferView": accessor["bufferView"],
             "sha256": digest(view_bytes(document, binary, accessor["bufferView"]))}
            for index, accessor in enumerate(document["accessors"])]


def write_glb(document, binary):
    encoded = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    encoded += b" " * ((-len(encoded)) % 4)
    binary += b"\0" * ((-len(binary)) % 4)
    length = 12 + 8 + len(encoded) + 8 + len(binary)
    return struct.pack("<4sII", b"glTF", 2, length) + struct.pack("<II", len(encoded), 0x4E4F534A) + encoded + struct.pack("<II", len(binary), 0x004E4942) + binary


def write_new(path, data):
    """Every file belongs to this newly created export directory."""
    with path.open("xb") as target:
        target.write(data)


def fit_in_blender(root, fit, output, document, binary):
    import bpy
    import numpy as np

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.import_scene.gltf(filepath=str(root / fit["source"]["path"]), merge_vertices=False)
    # Blender creates an unskinned Icosphere for bone display. It is not a
    # donor body/LOD and never enters the lossless candidate container.
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"
              and any(modifier.type == "ARMATURE" for modifier in obj.modifiers)]
    rigs = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(meshes) != 2 or len(rigs) != 1 or len(rigs[0].data.bones) != 17:
        raise ValueError("Actual imported donor must retain two bound LODs and seventeen joints")
    if sorted(action["name"] for action in document["animations"]) != sorted(ACTIONS):
        raise ValueError("Actual donor must retain all twelve approved actions")

    material_indices = sorted({primitive["material"] for mesh in document["meshes"] for primitive in mesh["primitives"]})
    if len(material_indices) != 1:
        raise ValueError("Costume fit must retain one material/draw per visible donor LOD")
    original_material = document["materials"][material_indices[0]]["pbrMetallicRoughness"]
    color_index = document["textures"][original_material["baseColorTexture"]["index"]]["source"]
    surface_index = document["textures"][original_material["metallicRoughnessTexture"]["index"]]["source"]
    source_color = view_bytes(document, binary, document["images"][color_index]["bufferView"])
    input_path = output / "bound-donor-color.png"
    write_new(input_path, source_color)
    try:
        image = bpy.data.images.load(str(input_path), check_existing=False)
        if list(image.size) != [1024, 1024]:
            raise ValueError("Actual bound color atlas must be 1024 square")
        image.colorspace_settings.name = "Non-Color"
        pixels = np.empty(1024 * 1024 * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        original = pixels.reshape(1024, 1024, 4)[::-1].copy()
    finally:
        input_path.unlink()

    settings, palette = fit["costume"]["atlas"], fit["costume"]["palette"]
    yy, xx = np.indices((1024, 1024))
    rng = np.random.default_rng(fit["costume"]["seed"])
    variation = rng.uniform(-.018, .018, (1024, 1024)).astype(np.float32)
    luminance = np.clip(original[:, :, :3] @ np.array([.2126, .7152, .0722]), 0, 1)
    shade = np.clip(.58 + luminance * .74 + variation, .48, 1.16)
    cloth = yy >= settings["preserveFaceThroughRow"]
    steel = np.zeros((1024, 1024), dtype=bool)
    red = np.zeros_like(steel)
    for left, right in zip(settings["viewColumns"][:-1], settings["viewColumns"][1:]):
        local = (xx - left) / (right - left)
        inside = (xx >= left) & (xx < right)
        first, last = settings["steelTorsoRows"]
        steel |= inside & (yy >= first) & (yy < last) & ((local > .30) & (local < .70))
        # The original shoulder/sleeve and knee shapes remain; texture finishes
        # follow their existing projected islands, with no additional anatomy.
        steel |= inside & (yy >= first) & (yy < first + 70) & ((local < .22) | (local > .78))
        first, last = settings["kneesRows"]
        steel |= inside & (yy >= first) & (yy < last) & (((local > .30) & (local < .39)) | ((local > .61) & (local < .70)))
        first, last = settings["strapRows"]
        target = left + (right - left) * (.34 + (yy - first) / (last - first) * .28)
        red |= inside & (yy >= first) & (yy < last) & (np.abs(xx - target) <= settings["strapWidth"] / 2)
        first, last = settings["redSleeveRows"]
        red |= inside & (yy >= first) & (yy < last) & (local > .095) & (local < .195)
    steel &= cloth
    red &= cloth
    color = original.copy()
    color[cloth, :3] = np.asarray(palette["cloth"]) * shade[cloth, None]
    boots = yy >= settings["bootsStartRow"]
    first, last = settings["beltRows"]
    leather = boots | ((yy >= first) & (yy < last))
    color[leather, :3] = np.asarray(palette["leather"]) * shade[leather, None]
    color[steel, :3] = np.asarray(palette["blackenedSteel"]) * shade[steel, None]
    color[red, :3] = np.asarray(palette["darkRed"]) * shade[red, None]
    # Sparse deterministic rubbed scratches and dust are albedo detail, never
    # painted specular highlights. Real reflectance lives in the surface atlas.
    scratches = steel & ~red & (np.mod(xx * 19 + yy * 7, 241) < 2)
    color[scratches, :3] = np.asarray(palette["wear"]) * .63
    dust = np.clip((yy / 1024) ** 4 * .033, 0, .033)
    color[cloth, :3] += dust[cloth, None] * np.array([.67, .53, .36])
    color[:, :, :3] = np.clip(color[:, :, :3], 0, 1)
    color[:, :, 3] = 1

    surface = np.ones((1024, 1024, 4), dtype=np.float32)
    surface[:, :, 1] = .90 + variation
    surface[:, :, 2] = 0
    surface[steel, 1] = .64 + variation[steel]
    surface[steel, 2] = .72
    surface[red, 1] = .84 + variation[red]
    surface[red, 2] = .12
    surface[leather, 1] = .79 + variation[leather]
    surface[scratches, 1] = .76
    surface[scratches, 2] = .47

    fitted_images = {}
    for role, array in (("color", color), ("surface", surface)):
        fitted = bpy.data.images.new("Vesper blackiron " + role, width=1024, height=1024, alpha=False)
        fitted.colorspace_settings.name = "Non-Color"
        fitted.pixels.foreach_set(array[::-1].reshape(-1))
        fitted.filepath_raw = str(output / ("vesper-" + role + ".png"))
        fitted.file_format = "PNG"
        # Blender encodes the native atlas in memory; the only filesystem
        # writer opens create-new rather than overwriting an existing path.
        fitted.pack()
        write_new(Path(fitted.filepath_raw), bytes(fitted.packed_file.data))
        if role == "color":
            fitted.colorspace_settings.name = "sRGB"
        fitted_images[role] = fitted

    material = bpy.data.materials.new("Vesper worn blackened steel dark red cloth and leather")
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get("Principled BSDF")
    color_node = nodes.new("ShaderNodeTexImage"); color_node.image = fitted_images["color"]
    surface_node = nodes.new("ShaderNodeTexImage"); surface_node.image = fitted_images["surface"]
    channels = nodes.new("ShaderNodeSeparateColor")
    links.new(color_node.outputs["Color"], shader.inputs["Base Color"])
    links.new(surface_node.outputs["Color"], channels.inputs["Color"])
    links.new(channels.outputs["Green"], shader.inputs["Roughness"])
    links.new(channels.outputs["Blue"], shader.inputs["Metallic"])
    for mesh in meshes:
        mesh.data.materials[0] = material
    return {
        color_index: (output / "vesper-color.png").read_bytes(),
        surface_index: (output / "vesper-surface.png").read_bytes(),
    }, {"blenderVersion": bpy.app.version_string, "importedMeshes": len(meshes),
        "importedJoints": len(rigs[0].data.bones), "importedActions": sorted(a.name for a in bpy.data.actions),
        "costumePixels": {"blackenedSteel": int(np.count_nonzero(steel & ~red)),
                          "darkRed": int(np.count_nonzero(red)), "preservedFace": int(np.count_nonzero(~cloth))},
        "atlasHashes": {role: digest((output / ("vesper-" + role + ".png")).read_bytes()) for role in fitted_images}}


def export(root, fit, output):
    source_data = (root / fit["source"]["path"]).read_bytes()
    document, binary = read_glb(source_data)
    before = accessor_hashes(document, binary)
    # Output creation occurs only after every standard-library guard succeeded.
    output.mkdir(parents=True, exist_ok=False)
    images, native = fit_in_blender(root, fit, output, document, binary)
    candidate = copy.deepcopy(document)
    replacements = {document["images"][index]["bufferView"]: pixels for index, pixels in images.items()}
    packed = bytearray()
    for index, view in enumerate(candidate["bufferViews"]):
        packed.extend(b"\0" * ((-len(packed)) % 4))
        data = replacements.get(index, view_bytes(document, binary, index))
        view["byteOffset"], view["byteLength"] = len(packed), len(data)
        packed.extend(data)
    candidate["buffers"][0]["byteLength"] = len(packed)
    for index in images:
        candidate["images"][index]["name"] = "vesper-" + ("color" if index == document["textures"][document["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"] else "surface")
    indices = sorted({primitive["material"] for mesh in candidate["meshes"] for primitive in mesh["primitives"]})
    for index in indices:
        candidate["materials"][index]["name"] = "Vesper worn blackened steel dark red cloth and leather"
    after = accessor_hashes(candidate, bytes(packed))
    if after != before:
        raise ValueError("Lossless costume rebinding changed native accessor bytes")
    model = write_glb(candidate, bytes(packed))
    write_new(output / "vesper.glb", model)
    manifest = {"version": 1, "id": "vesper", "source": fit["source"], "provenance": fit["provenance"],
                "modelSha256": digest(model), "modelBytes": len(model), "recipe": "tools/blender/vesper-blackiron.py",
                "recipeSha256": digest(Path(__file__).read_bytes()), "fitSha256": digest(json.dumps(fit, sort_keys=True, separators=(",", ":")).encode()),
                "costume": {"blackenedSteel": {"materialIndices": indices}, "darkRed": {"materialIndices": indices}},
                "export": "Genuine Blender atlas fit; lossless donor material/image rebinding without accessor resampling",
                "sourceAccessorHashes": before, "candidateAccessorHashes": after, "nativeBlender": native,
                "sourceImageHashes": [digest(view_bytes(document, binary, image["bufferView"])) for image in document["images"]],
                "candidateImageHashes": [digest(view_bytes(candidate, bytes(packed), image["bufferView"])) for image in candidate["images"]],
                "geometryUnchanged": True, "rigAndActionsUnchanged": True, "privateOnly": True}
    write_new(output / "manifest.json", (json.dumps(manifest, indent=2) + "\n").encode("utf-8"))
    print("VESPER_PRIVATE_EXPORT " + json.dumps({"modelSha256": digest(model), "bytes": len(model), **native}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True)
    parser.add_argument("--fit-config", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--paths-only", action="store_true")
    parser.add_argument("--validate-sources", action="store_true")
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(arguments)
    root = Path(args.root).resolve()
    fit, output = validate(root, args.fit_config, args.output_dir)
    if args.paths_only:
        print(json.dumps({"model": str(output / "vesper.glb"), "manifest": str(output / "manifest.json")}))
    elif args.validate_sources:
        print(json.dumps({"id": fit["id"], "source": fit["source"], "provenance": fit["provenance"], "valid": True}))
    else:
        export(root, fit, output)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as error:
        print("VESPER_PRIVATE_REJECT: " + str(error), file=sys.stderr)
        raise SystemExit(1)
