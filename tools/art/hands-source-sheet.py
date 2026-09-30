"""Inspect original hand sources and compose a shortlist; never export adaptations."""
import argparse
import json
import sys
from pathlib import Path

LIBRARY = Path(r"C:/Users/kyleb/dev/art-library")
SOURCES = [
    ("wriks-wrad-arms", "WRAD ARMS", LIBRARY / "wriks-wrad-arms/unpacked/arms.glb"),
    ("devmops-low-poly-arms", "DevMops Low Poly Arms", LIBRARY / "devmops-low-poly-arms/unpacked/arms_low_poly.blend"),
]


def arguments():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--sheet", action="store_true")
    parser.add_argument("--output", required=True)
    parser.add_argument("--current")
    parser.add_argument("--sources")
    return parser.parse_args(args)


def load_source(path):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.suffix == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(path))
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))
    # Resolve the supplied original texture, without modifying source files.
    for image in bpy.data.images:
        if image.source == "FILE" and not image.packed_file:
            filenames = [Path(image.filepath.replace("\\", "/")).name, image.name, image.name + ".png"]
            supplied = next((path.parent / name for name in filenames if (path.parent / name).is_file()), None)
            if supplied:
                image.filepath = str(supplied)
                image.reload()


def inspect_source(candidate_id, name, path):
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
        rendered_triangles = len(evaluated_mesh.loop_triangles)
        evaluated.to_mesh_clear()
        meshes.append({"name": obj.name, "triangles": len(obj.data.loop_triangles),
                       "evaluatedTriangles": rendered_triangles,
                       "rigged": any(m.type == "ARMATURE" for m in obj.modifiers),
                       "modifiers": [m.type for m in obj.modifiers],
                       "boundRig": next((m.object.name for m in obj.modifiers if m.type == "ARMATURE" and m.object), None),
                       "bounds": [list(obj.matrix_world @ Vector(c)) for c in obj.bound_box]})
    armatures = [{"name": obj.name, "bones": len(obj.data.bones),
                  "deformBones": sum(b.use_deform for b in obj.data.bones)}
                 for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    return {"id": candidate_id, "name": name, "sourceFile": str(path), "meshes": meshes,
            "armatures": armatures, "actions": [a.name for a in bpy.data.actions],
            "textures": [{"name": i.name, "width": i.size[0], "height": i.size[1]}
                         for i in bpy.data.images if i.type == "IMAGE"]}


def render_source(path, output):
    import bpy
    from mathutils import Vector
    scene = bpy.context.scene
    # A new camera and neutral lighting present the unmodified source pose.
    for obj in list(scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(obj, do_unlink=True)
    points = [obj.matrix_world @ Vector(c) for obj in scene.objects
              if obj.type == "MESH" and obj.data.polygons and not obj.hide_render for c in obj.bound_box]
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (low + high) / 2
    radius = (high - low).length / 2
    camera_data = bpy.data.cameras.new("Source comparison camera")
    camera = bpy.data.objects.new("Source comparison camera", camera_data)
    scene.collection.objects.link(camera)
    # Source orientation differs, but neither mesh nor rig is transformed.
    direction = Vector((0.4, -1.0, 0.65)).normalized()
    camera.location = center + direction * max(radius * 3.2, 1)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(radius * 2.35, 0.1)
    scene.camera = camera
    for name, offset, energy, size in [("Key", (2, -3, 4), 800, 4), ("Fill", (-3, -1, 2), 500, 5)]:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy * max(radius, 0.5) ** 2 / 4
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = center + Vector(offset) * max(radius, 0.5)
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    scene.world = bpy.data.worlds.new("Source neutral world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.27, 0.28, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 600
    scene.render.resolution_y = 450
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output.resolve())
    scene.view_settings.view_transform = "Standard"
    bpy.ops.render.render(write_still=True)


def compose_sheet(args):
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    fonts = Path(r"C:/Windows/Fonts")
    title_font = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 27)
    text_font = ImageFont.truetype(str(fonts / "segoeui.ttf"), 21)
    sheet = Image.new("RGB", (1560, 870), (24, 27, 29))
    draw = ImageDraw.Draw(sheet)
    draw.text((32, 24), "FIRST-PERSON HANDS - KYLE PICKS BEFORE ADAPTATION", font=title_font, fill="#f2dfaf")
    images = Path(args.sources)
    cards = [
        ("CURRENT - IN-GAME ROOK + RPG", Path(args.current), ["Current production hands and RPG", "Private memory-only first-person view", "Original assets; no game art replaced"]),
        ("A - WRAD ARMS / WRIKS", images / "wriks-wrad-arms.png", ["CC0; 1,196 arm triangles; 50 bones", "512 x 512 skin; no action clips", "Best starting anatomy and finger rig", "Needs gloves, sleeves and RPG motion"]),
        ("B - LOW POLY ARMS / DEVMOPS", images / "devmops-low-poly-arms.png", ["CC0; 1,040 paired tris; 48 deform bones", "128 x 128 skin; 257 control/rig bones", "Simple low-poly hands and forearms", "Needs finger grip, sleeves and motion"]),
    ]
    for index, (label, image, lines) in enumerate(cards):
        x = 32 + index * 508
        draw.rounded_rectangle((x, 82, x + 480, 810), 12, fill=(43, 47, 49))
        draw.text((x + 14, 99), label, font=text_font, fill="#fff1ca")
        content = ImageOps.contain(Image.open(image).convert("RGB"), (450, 480))
        sheet.paste(content, (x + 15 + (450 - content.width) // 2, 153 + (480 - content.height) // 2))
        for row, line in enumerate(lines):
            draw.text((x + 16, 644 + row * 34), line, font=text_font, fill="#ecece4")
    draw.text((32, 833), "Candidate images show the original source pose and textures. No adaptation has started. See review for checks and limits.", font=text_font, fill="#b9c0c0")
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, quality=88, optimize=True)
    if destination.stat().st_size > 500000:
        raise RuntimeError("Comparison sheet exceeds the 500 KB limit")


def main():
    args = arguments()
    if args.sheet:
        compose_sheet(args)
        return
    destination = Path(args.output)
    destination.mkdir(parents=True, exist_ok=True)
    report = []
    for candidate_id, name, path in SOURCES:
        load_source(path)
        report.append(inspect_source(candidate_id, name, path))
        if args.render:
            render_source(path, destination / (candidate_id + ".png"))
    (destination / "source-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
