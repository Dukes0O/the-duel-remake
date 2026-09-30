"""Inspect and render original CC0 tanker starting parts, without fitting or export.

Run with Blender --disable-autoexec. Original packs stay in the external art
library. Reports and neutral renders are disposable review evidence.
"""

import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

import bpy
from mathutils import Vector

MODELS = [
    ("kenney-car-kit", "truck-flat"),
    ("kenney-car-kit", "delivery-flat"),
    ("kenney-car-kit", "truck"),
    ("kenney-city-kit-industrial", "detail-tank-large"),
    ("kenney-city-kit-industrial", "detail-tank"),
    ("kenney-car-kit", "wheel-truck"),
    ("kenney-car-kit", "debris-door"),
    ("kenney-car-kit", "debris-drivetrain"),
    ("kenney-car-kit", "debris-tire"),
    ("kenney-city-kit-industrial", "shipping-container-a"),
]


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_originals(library):
    packs = []
    for pack in sorted({pack for pack, name in MODELS}):
        base = library / pack
        archive = base / "source.zip"
        license_file = base / "unpacked/License.txt"
        license_text = license_file.read_text(encoding="utf-8-sig")
        if "Creative Commons Zero, CC0" not in license_text:
            raise ValueError(f"Embedded CC0 license missing: {pack}")
        with zipfile.ZipFile(archive) as source_zip:
            names = ["License.txt"] + [
                f"Models/GLB format/{name}.glb"
                for model_pack, name in MODELS if model_pack == pack
            ]
            names.append("Models/GLB format/Textures/colormap.png")
            for relative in names:
                if (base / "unpacked" / relative).read_bytes() != source_zip.read(relative):
                    raise ValueError(f"Extracted bytes differ from original ZIP: {relative}")
        packs.append({
            "pack": pack,
            "sourceZipSha256": checksum(archive),
            "licenseSha256": checksum(license_file),
            "embeddedLicense": "CC0-1.0",
            "originalMembersVerified": names,
        })
    return packs


def inspect(pack, name, path):
    meshes = []
    points = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        obj.data.calc_loop_triangles()
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        evaluated_mesh = evaluated.to_mesh()
        evaluated_mesh.calc_loop_triangles()
        evaluated_triangles = len(evaluated_mesh.loop_triangles)
        evaluated.to_mesh_clear()
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
        meshes.append({
            "name": obj.name,
            "triangles": len(obj.data.loop_triangles),
            "evaluatedTriangles": evaluated_triangles,
            "materials": [material.name for material in obj.data.materials if material],
            "modifiers": [modifier.type for modifier in obj.modifiers],
            "uvLayers": len(obj.data.uv_layers),
        })
    if not points:
        raise ValueError(f"No geometry in {name}")
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return {
        "pack": pack,
        "model": name,
        "path": f"unpacked/Models/GLB format/{name}.glb",
        "sha256": checksum(path),
        "bytes": path.stat().st_size,
        "triangles": sum(mesh["triangles"] for mesh in meshes),
        "evaluatedTriangles": sum(mesh["evaluatedTriangles"] for mesh in meshes),
        "dimensions": list(high - low),
        "meshes": meshes,
        "armatures": sum(obj.type == "ARMATURE" for obj in bpy.context.scene.objects),
        "actions": [action.name for action in bpy.data.actions],
        "textures": [{
            "name": image.name,
            "size": list(image.size),
            "packed": bool(image.packed_file),
        } for image in bpy.data.images if image.type == "IMAGE"],
    }, (low + high) / 2, (high - low).length / 2


def render_original(center, radius, output):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 580
    scene.render.resolution_y = 320
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.world = bpy.data.worlds.new("Neutral source light")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.3, 0.3, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    bpy.ops.object.camera_add(location=center + Vector((1.3, -1.8, 1.15)).normalized() * max(radius * 3.2, 1))
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(radius * 3.2, 0.1)
    scene.camera = camera
    for offset, energy in [((2, -3, 4), 200), ((-3, -1, 2), 120)]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * max(radius, 0.5))
        light = bpy.context.object
        light.data.energy = energy * max(radius, 0.5) ** 2
        light.data.size = max(radius * 2, 0.5)
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    scene.view_settings.view_transform = "Standard"
    scene.render.filepath = str(output.resolve())
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--library", type=Path, default=Path("C:/Users/kyleb/dev/art-library"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    packs = verify_originals(args.library)
    # A downloaded third pack is recorded even though it supplies no trailer.
    toy = args.library / "kenney-toy-car-kit"
    toy_license = toy / "unpacked/License.txt"
    with zipfile.ZipFile(toy / "source.zip") as archive:
        if toy_license.read_bytes() != archive.read("License.txt"):
            raise ValueError("Toy Car Kit extracted license differs from original")
        if "Creative Commons Zero, CC0" not in toy_license.read_text(encoding="utf-8-sig"):
            raise ValueError("Toy Car Kit embedded CC0 license missing")
        toy_models = sorted(name for name in archive.namelist()
                            if name.startswith("Models/GLB format/") and name.endswith(".glb"))
        if any("trailer" in name.lower() or "tank" in name.lower() for name in toy_models):
            raise ValueError("Toy Car Kit inventory changed; re-review its trailer/tank suitability")
    rejected = [{
        "pack": "kenney-toy-car-kit",
        "sourceZipSha256": checksum(toy / "source.zip"),
        "licenseSha256": checksum(toy_license),
        "embeddedLicense": "CC0-1.0",
        "modelInventory": toy_models,
        "geometryInspected": False,
        "reason": "No tank or trailer model; toy proportions unsuitable for the settled gritty rig.",
    }]
    report = []
    for pack, name in MODELS:
        path = args.library / pack / f"unpacked/Models/GLB format/{name}.glb"
        before = checksum(path)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(path))
        item, center, radius = inspect(pack, name, path)
        if args.render:
            render_original(center, radius, output / f"{name}.png")
        if checksum(path) != before:
            raise RuntimeError(f"Original changed during inspection: {path}")
        report.append(item)
    (output / "source-inspection.json").write_text(
        json.dumps({"packs": packs, "models": report, "rejectedSources": rejected}, indent=2) + "\n", encoding="utf-8")
    print("Inspected unchanged original models:", len(report))
    for item in report:
        print(item["model"], item["triangles"], "triangles;", len(item["meshes"]), "meshes")


if __name__ == "__main__":
    main()
