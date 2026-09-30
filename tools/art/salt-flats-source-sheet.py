"""Inspect original CC0 sources and draw a source sheet. Never export game art.

Run inspection with Blender --disable-autoexec. Run --sheet with bundled Python.
Downloaded originals stay outside the repository. Output is review evidence only.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path


DEFAULT_LIBRARY = Path(r"C:/Users/kyleb/dev/art-library")
MODELS = [
    ("kenney-car-kit", "sedan", "unpacked/Models/GLB format/sedan.glb"),
    ("kenney-car-kit", "debris-door", "unpacked/Models/GLB format/debris-door.glb"),
    ("kenney-car-kit", "debris-drivetrain", "unpacked/Models/GLB format/debris-drivetrain.glb"),
    ("kenney-car-kit", "debris-tire", "unpacked/Models/GLB format/debris-tire.glb"),
    ("kenney-city-kit-industrial", "shipping-container-a", "unpacked/Models/GLB format/shipping-container-a.glb"),
    ("kenney-city-kit-industrial", "shipping-container-b", "unpacked/Models/GLB format/shipping-container-b.glb"),
    ("kenney-factory-kit", "crane", "unpacked/Models/GLB format/crane.glb"),
    ("kenney-factory-kit", "crane-magnet", "unpacked/Models/GLB format/crane-magnet.glb"),
    ("quaternius-public-transport", "Bus", "blend/Bus.blend"),
    ("quaternius-public-transport", "SchoolBus", "blend/SchoolBus.blend"),
]


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--sheet", action="store_true")
    parser.add_argument("--library", type=Path, default=DEFAULT_LIBRARY)
    parser.add_argument("--sources", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    if args.sheet and not args.sources:
        parser.error("--sheet needs --sources pointing to the inspection output")
    if not (args.inspect or args.render or args.sheet):
        parser.error("Choose --inspect, --render or --sheet")
    return args


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_original(path):
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.suffix == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(path), use_scripts=False)
    elif path.suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path))
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))


def inspect_original(pack, name, relative_path, path):
    import bpy
    from mathutils import Vector

    meshes = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or not obj.data.polygons:
            continue
        obj.data.calc_loop_triangles()
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        evaluated_mesh = evaluated.to_mesh()
        evaluated_mesh.calc_loop_triangles()
        evaluated_triangles = len(evaluated_mesh.loop_triangles)
        evaluated.to_mesh_clear()
        meshes.append({
            "name": obj.name,
            "triangles": len(obj.data.loop_triangles),
            "evaluatedTriangles": evaluated_triangles,
            "modifiers": [modifier.type for modifier in obj.modifiers],
            "materials": [material.name for material in obj.data.materials if material],
            "bounds": [list(obj.matrix_world @ Vector(corner)) for corner in obj.bound_box],
        })
    images = []
    for image in bpy.data.images:
        if image.type != "IMAGE":
            continue
        texture = Path(bpy.path.abspath(image.filepath))
        images.append({
            "name": image.name,
            "size": list(image.size),
            "packed": bool(image.packed_file),
            "file": str(texture) if texture.is_file() else None,
            "sha256": checksum(texture) if texture.is_file() else None,
        })
    return {
        "pack": pack,
        "model": name,
        "path": relative_path,
        "sha256": checksum(path),
        "bytes": path.stat().st_size,
        "triangles": sum(mesh["triangles"] for mesh in meshes),
        "evaluatedTriangles": sum(mesh["evaluatedTriangles"] for mesh in meshes),
        "meshes": meshes,
        "textures": images,
        "armatures": sum(obj.type == "ARMATURE" for obj in bpy.context.scene.objects),
        "actions": [action.name for action in bpy.data.actions],
        "materials": [{"name": material.name, "nodes": [
            {"type": node.type, "colour": list(node.inputs["Color"].default_value)}
            for node in material.node_tree.nodes if node.type == "BSDF_DIFFUSE"]}
            for material in bpy.data.materials if material.use_nodes],
        "preview": "original Blender shader colours copied to Workbench display" if path.suffix == ".blend" else "original glTF material EEVEE",
    }


def render_original(path, output):
    import bpy
    from mathutils import Vector

    scene = bpy.context.scene
    for obj in list(scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(obj, do_unlink=True)
    points = [obj.matrix_world @ Vector(corner) for obj in scene.objects
              if obj.type == "MESH" and obj.data.polygons for corner in obj.bound_box]
    if not points:
        raise ValueError(f"No original mesh in {path}")
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    center = (low + high) / 2
    radius = (high - low).length / 2
    camera_data = bpy.data.cameras.new("Original source camera")
    camera = bpy.data.objects.new("Original source camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = center + Vector((1.3, -1.8, 1.15)).normalized() * max(radius * 3.2, 1)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    # Account for the wide render aspect, without changing source model scale.
    camera_data.ortho_scale = max(radius * 3.4, 0.1)
    scene.camera = camera
    scene.world = bpy.data.worlds.new("Neutral source world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.27, 0.28, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    for name, offset, energy in [("Key", (2, -3, 4), 200), ("Fill", (-3, -1, 2), 120)]:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy * max(radius, 0.5) ** 2
        light_data.size = max(radius * 2, 0.5)
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = center + Vector(offset) * max(radius, 0.5)
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    # Legacy FBX drops these source shader colours. Native .blend keeps them.
    # Its old Diffuse BSDF imports with a zero shader Weight in Blender 4.5.
    # Workbench reads the literal source Color copied to the display field;
    # no colour is invented, shader node edited or source .blend saved.
    scene.render.engine = "BLENDER_WORKBENCH" if path.suffix == ".blend" else "BLENDER_EEVEE_NEXT"
    if path.suffix == ".blend":
        for material in bpy.data.materials:
            if not material.use_nodes:
                continue
            diffuse = next((node for node in material.node_tree.nodes if node.type == "BSDF_DIFFUSE"), None)
            if diffuse:
                material.diffuse_color = diffuse.inputs["Color"].default_value
        scene.display.shading.color_type = "MATERIAL"
        scene.display.shading.light = "STUDIO"
        scene.display.shading.background_type = "WORLD"
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
    scene.render.resolution_x = 600
    scene.render.resolution_y = 380
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output.resolve())
    scene.view_settings.view_transform = "Standard"
    bpy.ops.render.render(write_still=True)


def compose_sheet(args):
    from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

    fonts = Path(r"C:/Windows/Fonts")
    heading = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 30)
    title = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 24)
    text = ImageFont.truetype(str(fonts / "segoeui.ttf"), 22)
    small = ImageFont.truetype(str(fonts / "segoeui.ttf"), 19)
    report = json.loads((args.sources / "source-inspection.json").read_text(encoding="utf-8"))
    counts = {entry["model"]: entry["triangles"] for entry in report}
    sheet = Image.new("RGB", (2100, 1200), (24, 27, 29))
    draw = ImageDraw.Draw(sheet)
    draw.text((32, 22), "SALT FLATS: THREE COMPLEMENTARY SOURCE GROUPS / ROUND 1", font=heading, fill="#f2dfaf")
    draw.text((32, 66), "Original geometry and colours. Kyle picks before adaptation. Ground source is still open.", font=text, fill="#c3cbca")
    groups = [
        ("A: SALVAGE + TYRES", "Kenney Car Kit 3.1 / CC0", ["sedan", "debris-door", "debris-drivetrain", "debris-tire"],
         ["Existing loose parts suit piles and tyre walls.", "Needs rust, damage and cover layout.", "No finished wreck or scrap-pile mesh."]),
        ("B: CONTAINERS + CRANE", "Kenney Industrial 2.0 + Factory 3.0 / CC0", ["shipping-container-a", "shipping-container-b", "crane", "crane-magnet"],
         ["Existing jib crane, magnet and containers.", "Needs rust, scale and boundary layout.", "Pedestal crane; no ready ramp mesh."]),
        ("C: BUS CHOICE", "Quaternius Public Transport / CC0", ["Bus", "SchoolBus"],
         ["Two existing buses with complete silhouettes.", "Needs derelict treatment and scale matching.", "No tanker rig or trailer in inspected sources."]),
    ]
    for index, (label, licence, names, lines) in enumerate(groups):
        x = 32 + index * 688
        draw.rounded_rectangle((x, 116, x + 660, 866), 12, fill=(43, 47, 49))
        draw.text((x + 17, 132), label, font=title, fill="#fff1ca")
        draw.text((x + 17, 170), licence, font=small, fill="#d3d9d5")
        for image_index, name in enumerate(names):
            two_columns = len(names) == 4
            width = 310 if two_columns else 626
            row = image_index // 2 if two_columns else image_index
            left = x + 17 + (image_index % 2 * 320 if two_columns else 0)
            top = 215 + row * 236
            original = Image.open(args.sources / f"{name}.png").convert("RGB")
            if not two_columns:
                # Trim only the flat Workbench background, then keep the whole
                # source silhouette. A fill crop can hide wheels or the roof.
                background = Image.new("RGB", original.size, original.getpixel((0, 0)))
                difference = ImageChops.difference(original, background)
                bounds = difference.point(lambda value: 255 if value > 4 else 0).getbbox()
                if bounds:
                    left_edge, top_edge, right_edge, bottom_edge = bounds
                    original = original.crop((max(0, left_edge - 12), max(0, top_edge - 12),
                                              min(original.width, right_edge + 12), min(original.height, bottom_edge + 12)))
            image = ImageOps.contain(original, (width, 190))
            sheet.paste(image, (left + (width - image.width) // 2, top + (190 - image.height) // 2))
            label_name = name.replace("shipping-", "")
            draw.text((left + 5, top + 192), f"{label_name}: {counts[name]:,} triangles", font=small, fill="#e9ede5")
        for row, line in enumerate(lines):
            draw.text((x + 17, 736 + row * 36), line, font=text, fill="#ecece4")
    draw.rounded_rectangle((32, 894, 2068, 1122), 12, fill=(65, 47, 35))
    draw.text((49, 910), "GROUND GAP: NO READY CC0 TILEABLE SALT FOUND IN THE BOUNDED SEARCH", font=title, fill="#ffd89b")
    ground_lines = [
        "CC0 photo option: Marina Shemesh, Salt Crystals On Beach Textures. Real salt; not tileable; no PBR maps.",
        "Free ready texture option: cspykstra, Salt Flat Smooth on CGTrader. Seamless scanned salt; royalty-free, not CC0.",
        "Both need Kyle's direction. No ground file was downloaded or presented as a finished salt material.",
        "White bowl, two ramps, heat shimmer and the full venue still require ARENA-06. No adaptation has started.",
    ]
    for row, line in enumerate(ground_lines):
        draw.text((49, 956 + row * 34), line, font=text, fill="#f0e7da")
    draw.text((32, 1150), "Source-only: Kenney glTF materials; Quaternius native Blender shader colours shown in Workbench. Preview compatibility details, licences and hashes in review.", font=small, fill="#bbc4c4")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, quality=87, optimize=True)
    if args.output.stat().st_size > 500000:
        raise RuntimeError("Comparison sheet exceeds 500 KB")


def main():
    args = arguments()
    if args.sheet:
        compose_sheet(args)
        return
    args.output.mkdir(parents=True, exist_ok=True)
    report = []
    for pack, name, relative_path in MODELS:
        path = args.library / pack / relative_path
        load_original(path)
        report.append(inspect_original(pack, name, relative_path, path))
        if args.render:
            render_original(path, args.output / f"{name}.png")
    (args.output / "source-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
