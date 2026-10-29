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
CANDIDATE_BYTES = 151888
CANDIDATE_SHA256 = "834d024ab14cc4ec14e7402f28b3ec06df311748c8dd380bf26e306ad0e1705b"
CANDIDATE_RELATIVE = ".qa-dist/wild-beaver-3defc568/beaver-source-unfitted.glb"
SOURCE_VIEWS = (("plus-x", (1, 0, 0)), ("minus-x", (-1, 0, 0)),
                ("plus-z", (0, 0, 1)), ("minus-z", (0, 0, -1)),
                ("plus-y", (0, 1, 0)), ("minus-y", (0, -1, 0)))
ORIGINAL_PATH = Path("C:/Users/kyleb/dev/art-library/wild-north-woods/poly-beaver-original.glb")


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--model", choices=("beaver",), default="beaver")
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--paths-only", action="store_true")
    parser.add_argument("--view-only", action="store_true",
                        help="Inspect the pinned private candidate unchanged; do not generate or fit")
    parser.add_argument("--fit-only", action="store_true",
                        help="Fit the pinned existing candidate by root scale/translation only")
    parser.add_argument("--source-view", action="append", choices=tuple(name for name, _ in SOURCE_VIEWS),
                        help="Select an existing source view; repeat only with --view-only")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    if args.fit_only and (args.view_only or args.source_view):
        parser.error("--fit-only is exclusive with --view-only and --source-view")
    if args.source_view and not args.view_only:
        parser.error("--source-view requires --view-only")
    if args.source_view and len(set(args.source_view)) != len(args.source_view):
        parser.error("Duplicate --source-view is not allowed")
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


def view_plan(output, views=SOURCE_VIEWS):
    return {"blend": [], "glb": [], "json": [str(output / "inspection-manifest.json")],
            "atlas": [], "evidence": [str(output / (name + ".png")) for name, _ in views],
            "summary": []}


def fit_plan(output):
    return {"blend": [], "glb": [str(output / "beaver-source-fitted.glb")],
            "json": [str(output / "fit-manifest.json")], "atlas": [], "evidence": [], "summary": []}


def fit_existing_candidate(root, output):
    # This branch never paints, imports into Blender, deforms or re-exports a mesh.
    candidate_path = root / CANDIDATE_RELATIVE
    original = ORIGINAL_PATH.read_bytes()
    candidate = candidate_path.read_bytes()
    if (len(original), hashlib.sha256(original).hexdigest()) != (ORIGINAL_BYTES, ORIGINAL_SHA256):
        raise ValueError("Approved licensed original changed before fitting")
    if (len(candidate), hashlib.sha256(candidate).hexdigest()) != (CANDIDATE_BYTES, CANDIDATE_SHA256):
        raise ValueError("The one verified private candidate changed before fitting")
    magic, version, total = struct.unpack_from("<4sII", candidate)
    json_size, json_type = struct.unpack_from("<II", candidate, 12)
    binary_size, binary_type = struct.unpack_from("<II", candidate, 20 + json_size)
    binary = candidate[28 + json_size:]
    if ((magic, version, total, json_type, binary_type) !=
            (b"glTF", 2, len(candidate), 0x4E4F534A, 0x004E4942) or len(binary) != binary_size):
        raise ValueError("Pinned candidate is not the expected complete two-chunk GLB")
    document = json.loads(candidate[20:20 + json_size])
    if (document["nodes"] != [{"name": "Geo_Beaver", "mesh": 0}] or
            document["scenes"][document.get("scene", 0)]["nodes"] != [0]):
        raise ValueError("Fit requires the actual single identity root node")
    primitive = document["meshes"][0]["primitives"][0]
    def accessor(index):
        item = document["accessors"][index]
        view = document["bufferViews"][item["bufferView"]]
        shape = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[item["type"]]
        fmt = "<" + {5123: "H", 5126: "f"}[item["componentType"]] * shape
        offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
        stride = view.get("byteStride", struct.calcsize(fmt))
        return [struct.unpack_from(fmt, binary, offset + index * stride) for index in range(item["count"])]
    positions = accessor(primitive["attributes"]["POSITION"])
    uv = accessor(primitive["attributes"]["TEXCOORD_0"])
    used = set(row[0] for row in accessor(primitive["indices"]))
    # Viewed underside confirms the dark lower-left UV region contains the four paws.
    paws = [index for index in used if uv[index][0] < .5 and uv[index][1] >= .5]
    if not paws:
        raise ValueError("Pinned source has no indexed paw region")
    paw_y = min(positions[index][1] for index in paws)
    paw_groups = []
    for side in (-1, 1):
        for front in (False, True):
            # z=20 lies in the measured empty gap between rear and front paw regions.
            group = [index for index in paws if positions[index][0] * side > 0 and
                     (positions[index][2] > 20) == front]
            if not group:
                raise ValueError("Pinned indexed source is missing a viewed paw group")
            paw_groups.append({"side": "left" if side < 0 else "right",
                               "end": "front" if front else "rear", "indexedVertices": len(group),
                               "sourceMinY": min(positions[index][1] for index in group)})
    if (paw_y != -18.33993911743164 or
            [group["sourceMinY"] for group in paw_groups] !=
            [-18.33993911743164, -18.159942626953125, -18.33993911743164, -18.159942626953125]):
        raise ValueError("Actual viewed paw datum changed")
    z_min, z_max = min(positions[index][2] for index in used), max(positions[index][2] for index in used)
    scale = 1.10 / (z_max - z_min)
    translation_y = -paw_y * scale
    min_paw_m = paw_y * scale + translation_y
    tail = [index for index in used if uv[index][0] >= .5 and uv[index][1] < .5]
    tail_min_m = min(positions[index][1] for index in tail) * scale + translation_y
    if (not math.isfinite(scale) or scale <= 0 or min_paw_m != 0 or not -.02 <= tail_min_m <= 0):
        raise ValueError("Approved paw pivot or 2 cm tail allowance cannot be met without deformation")
    for group in paw_groups:
        group["fittedMinYMetres"] = group["sourceMinY"] * scale + translation_y
    changed = copy.deepcopy(document)
    changed["nodes"][0]["scale"] = [scale, scale, scale]
    changed["nodes"][0]["translation"] = [0, translation_y, 0]
    # Same GLB JSON/chunk serialization as generation; copy the COMPLETE BIN, including padding.
    encoded = json.dumps(changed, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    encoded += b" " * (-len(encoded) % 4)
    size = 12 + 8 + len(encoded) + 8 + len(binary)
    fitted = (struct.pack("<4sII", b"glTF", 2, size) +
              struct.pack("<II", len(encoded), 0x4E4F534A) + encoded +
              struct.pack("<II", len(binary), 0x004E4942) + binary)
    restored = copy.deepcopy(changed)
    del restored["nodes"][0]["scale"]
    del restored["nodes"][0]["translation"]
    if restored != document or fitted[28 + len(encoded):] != binary:
        raise ValueError("Fit changed data outside the approved root transform")
    after_original = hashlib.sha256(ORIGINAL_PATH.read_bytes()).hexdigest()
    after_candidate = hashlib.sha256(candidate_path.read_bytes()).hexdigest()
    if after_original != ORIGINAL_SHA256 or after_candidate != CANDIDATE_SHA256:
        raise ValueError("An input source changed during private fitting")
    output.mkdir(parents=True, exist_ok=False)
    with (output / "beaver-source-fitted.glb").open("xb") as handle:
        handle.write(fitted)
    manifest = {"card": "WILD-ART-SRC", "kind": "PRIVATE ROOT-TRANSFORM FIT / NOT GAME",
                "author": "Poly by Google", "licence": "CC-BY-3.0",
                "source": "https://poly.pizza/m/fwtA7VLrXPr",
                "licenceUrl": "https://creativecommons.org/licenses/by/3.0/",
                "original": {"bytes": len(original), "sha256Before": ORIGINAL_SHA256, "sha256After": after_original},
                "candidate": {"path": str(candidate_path), "bytes": len(candidate),
                              "sha256Before": CANDIDATE_SHA256, "sha256After": after_candidate},
                "fitted": {"bytes": len(fitted), "sha256": hashlib.sha256(fitted).hexdigest()},
                "completeBinaryUnchanged": True, "binaryBytes": len(binary),
                "binarySha256": hashlib.sha256(binary).hexdigest(), "onlyRootScaleTranslationChanged": True,
                "rootNode": changed["nodes"][0], "targetLengthMetres": 1.10,
                "actualLengthMetres": (z_max - z_min) * scale, "sourceZBounds": [z_min, z_max],
                "axes": "+Y up / +Z head, unchanged donor pose", "sourcePawDatumY": paw_y,
                "minimumPawMetres": min_paw_m, "pawGroups": paw_groups,
                "allFourPawsCoplanar": False, "tailMinimumMetres": tail_min_m,
                "tailAllowanceMetres": .02, "triangles": 568, "vertices": 1122,
                "skins": 0, "clips": [], "runtimeInstalled": False, "artAccepted": False,
                "gamePlacementVerified": False, "otherDonors": "blocked; group round 1 waits"}
    with (output / "fit-manifest.json").open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    print(json.dumps(fit_plan(output)))


def inspect_source_views(root, output, views):
    # No config read or paint/export: inspect only the one structurally verified candidate.
    candidate_path = root / CANDIDATE_RELATIVE
    paths = {"original": ORIGINAL_PATH, "candidate": candidate_path}
    def receipts():
        result = {}
        for name, path in paths.items():
            data = path.read_bytes()
            result[name] = {"path": str(path), "bytes": len(data),
                            "sha256": hashlib.sha256(data).hexdigest()}
        return result
    before = receipts()
    if (before["original"]["bytes"], before["original"]["sha256"]) != (ORIGINAL_BYTES, ORIGINAL_SHA256):
        raise ValueError("Approved original changed before source inspection")
    if (before["candidate"]["bytes"], before["candidate"]["sha256"]) != (CANDIDATE_BYTES, CANDIDATE_SHA256):
        raise ValueError("The one verified private candidate changed before source inspection")
    # Import only after argument, containment, absence and complete input hash checks.
    import bpy
    from mathutils import Vector
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(candidate_path))
    imported = list(bpy.context.scene.objects)
    meshes = [obj for obj in imported if obj.type == "MESH"]
    if not meshes:
        raise ValueError("Actual imported candidate has no mesh")
    bpy.context.view_layer.update()
    def matrices():
        return [{"name": obj.name, "type": obj.type,
                 "matrixLocal": [list(row) for row in obj.matrix_local],
                 "matrixWorld": [list(row) for row in obj.matrix_world],
                 "materials": [slot.material.name if slot.material else None for slot in obj.material_slots]}
                for obj in imported]
    imported_before = matrices()
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    low = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    if any(not math.isfinite(value) for point in (low, high) for value in point):
        raise ValueError("Actual imported bounds must be finite")
    centre, span = (low + high) * .5, max(high - low)
    if span <= 0:
        raise ValueError("Actual imported source bounds are empty")
    output.mkdir(parents=True, exist_ok=False)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.threads_mode, scene.render.threads = "FIXED", 4
    scene.render.resolution_x, scene.render.resolution_y = 960, 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("source-inspection-neutral")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.35, .35, .35, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .8
    for name, offset, energy in (("key", (1, -1, 2), 600), ("fill", (-1, 1, 1), 300)):
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.shape, light.size = energy * span * span, "DISK", span * 2
        obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(obj)
        obj.location = centre + Vector(offset) * span
        obj.rotation_euler = (centre - obj.location).to_track_quat("-Z", "Y").to_euler()
    # A bounds floor is a diagnostic reference, not a claim that the feet are grounded.
    bpy.ops.mesh.primitive_plane_add(size=span * 3, location=(centre.x, centre.y, low.z))
    floor = bpy.context.object
    floor.name = "source-bounds-floor-not-fitted"
    floor_material = bpy.data.materials.new("source-neutral-floor")
    floor_material.diffuse_color = (.25, .25, .25, 1)
    floor.data.materials.append(floor_material)
    camera_data = bpy.data.cameras.new("source-inspection-camera")
    camera = bpy.data.objects.new("source-inspection-camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    aspect = (scene.render.resolution_x * scene.render.pixel_aspect_x /
              (scene.render.resolution_y * scene.render.pixel_aspect_y))
    # Landscape ortho_scale spans width; reserve the full donor span vertically too.
    camera_data.type, camera_data.ortho_scale = "ORTHO", span * 1.3 * max(1, aspect)
    camera_data.clip_start, camera_data.clip_end = span * .001, span * 10
    records = []
    error = None
    try:
        for name, source_axis in views:
            # Standard glTF +Y-up import maps source XYZ to Blender X,-Z,Y.
            direction = Vector((source_axis[0], -source_axis[2], source_axis[1]))
            camera.location = centre + direction * span * 3
            camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
            floor.hide_render = name == "minus-y"
            image = output / (name + ".png")
            scene.render.filepath = str(image)
            bpy.context.view_layer.update()
            bpy.ops.render.render(write_still=True)
            records.append({"view": name, "label": "SOURCE INSPECTION / UNFITTED / NOT GAME" +
                            (" / UNDERSIDE / FLOOR HIDDEN" if floor.hide_render else " / BOUNDS FLOOR"),
                            "sourceAxis": list(source_axis), "image": str(image),
                            "sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
                            "cameraBlender": list(camera.location), "targetBlender": list(centre),
                            "cameraMatrixWorld": [list(row) for row in camera.matrix_world],
                            "orthoScale": camera_data.ortho_scale, "floorHidden": floor.hide_render})
    except Exception as caught:
        error = str(caught)
        raise
    finally:
        after = receipts()
        imported_after = matrices()
        unchanged = after == before and imported_after == imported_before
        manifest = {"card": "WILD-ART-SRC", "kind": "SOURCE INSPECTION / UNFITTED / NOT GAME",
                    "sourceBefore": before, "sourceAfter": after, "sourceAndTransformsUnchanged": unchanged,
                    "importedBefore": imported_before, "importedAfter": imported_after,
                    "boundsBlender": {"min": list(low), "max": list(high), "centre": list(centre)},
                    "floorBlenderZ": low.z, "floorMeaning": "measured minimum, not a feet-grounding pass",
                    "axes": "source glTF +Y-up; imported Blender X,-Z,Y; donor units, not metres",
                    "render": {"engine": "CYCLES", "device": "CPU", "threads": 4, "samples": 48,
                               "resolution": [960, 600], "aspect": aspect, "viewTransform": "AgX"},
                    "views": records, "error": error, "unfitted": True, "axesVerified": False,
                    "groundingVerified": False, "artAccepted": False, "runtimeInstalled": False}
        with (output / "inspection-manifest.json").open("x", encoding="utf-8", newline="\n") as handle:
            json.dump(manifest, handle, indent=2)
            handle.write("\n")
        if not unchanged:
            raise ValueError("A source file or imported donor transform/material binding changed during inspection")
    print(json.dumps(view_plan(output, views)))


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
    views = tuple((name, dict(SOURCE_VIEWS)[name]) for name in args.source_view) if args.source_view else SOURCE_VIEWS
    if args.paths_only:
        print(json.dumps(fit_plan(output) if args.fit_only else
                         view_plan(output, views) if args.view_only else output_plan(output)))
        return
    if root != Path(__file__).resolve().parents[2]:
        raise ValueError("Actual adaptation must use this recipe's own checkout")
    if output.exists():
        raise ValueError("Use a new absent private output leaf; never overwrite a prior packet")
    if args.fit_only:
        fit_existing_candidate(root, output)
        return
    if args.view_only:
        inspect_source_views(root, output, views)
        return
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
