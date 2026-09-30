"""Inspect CC0 sources and the chosen salt-photo UV material. No game export.

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
SALT_PHOTO = "marina-salt-crystals-beach/salt-crystals-on-beach-textures.jpg"
SALT_SHA256 = "91911006c31d862527b7b3b98719512e6074ea80e7bbe483393eb925b9237b79"


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--sheet", action="store_true")
    parser.add_argument("--ground", action="store_true", help="Render the authorized mirrored salt material and its repeat control")
    parser.add_argument("--library", type=Path, default=DEFAULT_LIBRARY)
    parser.add_argument("--sources", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    if args.sheet and not args.sources:
        parser.error("--sheet needs --sources pointing to the inspection output")
    if not (args.inspect or args.render or args.sheet or args.ground):
        parser.error("Choose --inspect, --render, --sheet or --ground")
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


def salt_material(photo, mirrored, unlit):
    """Fold UVs in the shader. Never write or edit the source image pixels."""
    import bpy

    material = bpy.data.materials.new("CC0 salt photo: mirrored UV" if mirrored else "Original photo: ordinary repeat control")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    links = material.node_tree.links
    coordinates = nodes.new("ShaderNodeTexCoord")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    combine = nodes.new("ShaderNodeCombineXYZ")
    links.new(coordinates.outputs["UV"], separate.inputs["Vector"])
    for axis in ("X", "Y"):
        scale = nodes.new("ShaderNodeMath")
        scale.name = f"{axis}: four source-photo tiles"
        scale.operation = "MULTIPLY"
        scale.inputs[1].default_value = 4.0
        links.new(separate.outputs[axis], scale.inputs[0])
        output = scale.outputs[0]
        if mirrored:
            fold = nodes.new("ShaderNodeMath")
            fold.name = f"{axis}: mirrored repeat, period two"
            fold.operation = "PINGPONG"
            fold.inputs[1].default_value = 1.0
            links.new(output, fold.inputs[0])
            output = fold.outputs[0]
        links.new(output, combine.inputs[axis])
    image = nodes.new("ShaderNodeTexImage")
    image.image = bpy.data.images.load(str(photo), check_existing=True)
    image.image.colorspace_settings.name = "sRGB"
    image.interpolation = "Linear"
    # Mirrored UVs end at 0 or 1. Extend clamps to the actual edge texels;
    # Repeat would blend opposite source edges and introduce a thin seam.
    image.extension = "EXTEND" if mirrored else "REPEAT"
    links.new(combine.outputs["Vector"], image.inputs["Vector"])
    shader = nodes.new("ShaderNodeEmission" if unlit else "ShaderNodeBsdfPrincipled")
    if unlit:
        links.new(image.outputs["Color"], shader.inputs["Color"])
        shader.inputs["Strength"].default_value = 1.0
    else:
        links.new(image.outputs["Color"], shader.inputs["Base Color"])
        shader.inputs["Metallic"].default_value = 0.0
        shader.inputs["Roughness"].default_value = 1.0
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(shader.outputs[0], output.inputs["Surface"])
    return material


def render_salt_plane(photo, destination, mirrored, angled=False):
    import bpy
    from mathutils import Vector

    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Keep the original photo's aspect ratio. Physical texel scale is a review
    # setting, not a measured property of the photograph or a venue decision.
    tile_width = 3.0
    tile_height = tile_width * 1275 / 1920
    width, height = tile_width * 4, tile_height * 4
    bpy.ops.mesh.primitive_plane_add(size=2)
    plane = bpy.context.object
    plane.name = "4 by 4 photo tiles: one uninterrupted two-triangle plane"
    plane.scale = (width / 2, height / 2, 1)
    plane.data.materials.append(salt_material(photo, mirrored, unlit=not angled))
    if not angled:
        label_material = bpy.data.materials.new("Outside-plane diagnostic labels")
        label_material.use_nodes = True
        shader = label_material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (.9, .9, .9, 1)
        shader.inputs["Emission Color"].default_value = (.9, .9, .9, 1)
        shader.inputs["Emission Strength"].default_value = 1
        # Labels sit outside the plane, so no line can hide a material join.
        for index in range(4):
            positions = [(tile_width * (index + .5) - width / 2, -height / 2 - .45),
                         (-width / 2 - .45, tile_height * (index + .5) - height / 2)]
            for x, y in positions:
                bpy.ops.object.text_add(location=(x, y, .01))
                label = bpy.context.object
                label.name = "Outside tile number"
                label.data.body = str(index + 1)
                label.data.align_x = "CENTER"
                label.data.align_y = "CENTER"
                label.data.size = .27
                label.data.materials.append(label_material)
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("Salt material proof camera")
    camera = bpy.data.objects.new("Salt material proof camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (8, -10, 8) if angled else (0, 0, 12)
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = width * (1.55 if angled else 1.18)
    scene.camera = camera
    scene.world = bpy.data.worlds.new("Neutral salt-proof world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.08, .08, .08, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    if angled:
        light_data = bpy.data.lights.new("Neutral salt-proof area light", "AREA")
        light_data.energy = 1800
        light_data.size = 8
        light = bpy.data.objects.new("Neutral salt-proof area light", light_data)
        scene.collection.objects.link(light)
        light.location = (2, -3, 7)
        light.rotation_euler = (Vector((0, 0, 0)) - light.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(destination.resolve())
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    bpy.ops.render.render(write_still=True)
    return {"planeMetres": [width, height], "sourceCopies": [4, 4],
            "triangles": 2, "mirrored": mirrored, "imageExtension": "EXTEND" if mirrored else "REPEAT",
            "shader": "Principled: roughness 1, metal 0" if angled else "Emission: unlit join proof",
            "imagePixels": list(plane.data.materials[0].node_tree.nodes.get("Image Texture").image.size)}


def inspect_salt_material(args):
    photo = args.library / SALT_PHOTO
    before = checksum(photo)
    if before != SALT_SHA256:
        raise ValueError("Chosen original photo checksum differs; stop for provenance review")
    args.output.mkdir(parents=True, exist_ok=True)
    proofs = []
    for name, mirrored, angled in [("salt-repeat-control", False, False), ("salt-mirrored-4x4", True, False),
                                  ("salt-mirrored-angle", True, True)]:
        proofs.append({"render": name + ".png", **render_salt_plane(photo, args.output / (name + ".png"), mirrored, angled)})
    # A triangle-wave UV fold is continuous at each integer tile edge and
    # repeats after two source tiles. Check both properties without touching
    # any raster data. The genuine shader renders supply the visual check.
    fold = lambda value: 1.0 - abs(value % 2.0 - 1.0)
    seam_errors = [abs(fold(edge - 1e-5) - fold(edge + 1e-5)) for edge in range(5)]
    periodic_errors = [abs(fold(value) - fold(value + 2)) for value in [-2.3, -.5, 0, .1, .7, 1, 1.9, 3.7]]
    if max(seam_errors + periodic_errors) > 1e-12:
        raise RuntimeError("Mirrored UV continuity or period check failed")
    after = checksum(photo)
    if after != before:
        raise RuntimeError("Original photo bytes changed")
    report = {"source": str(photo), "sha256Before": before, "sha256After": after,
              "originalUnchanged": True, "bitmapTileable": False,
              "materialRepeat": "PingPong(U * 4, 1), PingPong(V * 4, 1); texture EXTEND; linear filtering",
              "repeatUnitSourceTiles": [2, 2], "maximumUvSeamError": max(seam_errors),
              "maximumUvPeriodError": max(periodic_errors), "proofs": proofs,
              "limitations": "Mirrored motifs; baked photographed light and wet glints; no normal, height or roughness maps; no venue/runtime export."}
    (args.output / "salt-material-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def compose_sheet(args):
    from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

    fonts = Path(r"C:/Windows/Fonts")
    heading = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 30)
    title = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 24)
    text = ImageFont.truetype(str(fonts / "segoeui.ttf"), 22)
    small = ImageFont.truetype(str(fonts / "segoeui.ttf"), 19)
    report = json.loads((args.sources / "source-inspection.json").read_text(encoding="utf-8"))
    counts = {entry["model"]: entry["triangles"] for entry in report}
    sheet = Image.new("RGB", (2100, 1650), (24, 27, 29))
    draw = ImageDraw.Draw(sheet)
    draw.text((32, 22), "SALT FLATS: THREE COMPLEMENTARY SOURCE GROUPS / ROUND 1", font=heading, fill="#f2dfaf")
    draw.text((32, 66), "Original model shapes and colours; model choices await Kyle. The CC0 salt photo is selected; its mirrored material is shown below.", font=text, fill="#c3cbca")
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
    draw.rounded_rectangle((32, 894, 2068, 1568), 12, fill=(45, 52, 45))
    draw.text((49, 910), "GROUND: KYLE SELECTED THE CC0 SALT PHOTO + MIRRORED UV MATERIAL", font=title, fill="#dcecb5")
    panels = [("Original photo: bitmap is not tileable", args.library / SALT_PHOTO),
              ("Control: ordinary 4 by 4 repeat", args.sources / "salt-repeat-control.png"),
              ("Chosen material: mirrored 4 by 4", args.sources / "salt-mirrored-4x4.png")]
    for index, (label, path) in enumerate(panels):
        x = 49 + index * 674
        draw.text((x, 962), label, font=text, fill="#eef1db")
        content = ImageOps.contain(Image.open(path).convert("RGB"), (636, 430))
        sheet.paste(content, (x + (636 - content.width) // 2, 1002 + (430 - content.height) // 2))
    ground_lines = [
        "Marina Shemesh / CC0 / free original 1920 x 1275 photo, unchanged. UVs reflect at tile edges; repeat unit is two by two photos.",
        "The material repeats continuously; the bitmap does not. Mirrored motifs and photographed glints remain visible. No PBR map set.",
        "The numbered proof plane shows all sixteen source-photo tiles without lines covering joins. No venue or game asset replaced.",
    ]
    for row, line in enumerate(ground_lines):
        draw.text((49, 1441 + row * 35), line, font=text, fill="#e7ece0")
    draw.text((32, 1600), "Source-only model comparison plus the authorized photo-material proof. White bowl, ramps, heat shimmer and venue/frame checks remain ARENA-06 work.", font=small, fill="#bbc4c4")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for quality in (87, 84, 81, 78, 75):
        sheet.save(args.output, quality=quality, optimize=True)
        if args.output.stat().st_size <= 500000:
            break
    else:
        raise RuntimeError("Comparison sheet exceeds 500 KB")


def main():
    args = arguments()
    if args.sheet:
        compose_sheet(args)
        return
    if args.ground:
        inspect_salt_material(args)
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
