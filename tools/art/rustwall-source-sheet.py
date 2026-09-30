"""Inspect original CC0 Rustwall source sets and compose a source review sheet."""
import argparse
import json
import sys
from pathlib import Path

LIBRARY = Path(r"C:/Users/kyleb/dev/art-library")
SOURCES = [
    ("kenney-car-kit", "sedan", LIBRARY / "kenney-car-kit/unpacked/Models/GLB format/sedan.glb"),
    ("kenney-car-kit", "debris-door", LIBRARY / "kenney-car-kit/unpacked/Models/GLB format/debris-door.glb"),
    ("kenney-car-kit", "debris-plate-a", LIBRARY / "kenney-car-kit/unpacked/Models/GLB format/debris-plate-a.glb"),
    ("kenney-car-kit", "debris-bumper", LIBRARY / "kenney-car-kit/unpacked/Models/GLB format/debris-bumper.glb"),
    ("kenney-city-kit-industrial", "water-tower", LIBRARY / "kenney-city-kit-industrial/unpacked/Models/GLB format/water-tower.glb"),
    ("kenney-city-kit-industrial", "shipping-container-a", LIBRARY / "kenney-city-kit-industrial/unpacked/Models/GLB format/shipping-container-a.glb"),
    ("kenney-city-kit-industrial", "chimney-large", LIBRARY / "kenney-city-kit-industrial/unpacked/Models/GLB format/chimney-large.glb"),
    ("quaternius-ultimate-nature-pack", "Rock_1", LIBRARY / "quaternius-ultimate-nature-pack/fbx/Rock_1.fbx"),
    ("quaternius-ultimate-nature-pack", "Rock_2", LIBRARY / "quaternius-ultimate-nature-pack/fbx/Rock_2.fbx"),
    ("quaternius-ultimate-nature-pack", "Rock_3", LIBRARY / "quaternius-ultimate-nature-pack/fbx/Rock_3.fbx"),
    ("quaternius-ultimate-nature-pack", "Rock_5", LIBRARY / "quaternius-ultimate-nature-pack/fbx/Rock_5.fbx"),
]


def parse_arguments():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--sheet", action="store_true")
    parser.add_argument("--output", required=True)
    parser.add_argument("--sources")
    parser.add_argument("--current")
    return parser.parse_args(args)


def load_original(path):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path))
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))


def inspect_original(candidate, name, path):
    import bpy
    meshes = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        obj.data.calc_loop_triangles()
        meshes.append({"name": obj.name, "triangles": len(obj.data.loop_triangles),
                       "materials": len(obj.data.materials),
                       "rigged": any(m.type == "ARMATURE" for m in obj.modifiers)})
    return {"candidate": candidate, "model": name, "sourceFile": str(path),
            "meshes": meshes, "triangles": sum(m["triangles"] for m in meshes),
            "armatures": sum(obj.type == "ARMATURE" for obj in bpy.context.scene.objects),
            "actions": [a.name for a in bpy.data.actions],
            "textures": [{"name": i.name, "width": i.size[0], "height": i.size[1]}
                         for i in bpy.data.images if i.type == "IMAGE"]}


def render_original(output, use_diffuse_preview=False):
    import bpy
    from mathutils import Vector
    scene = bpy.context.scene
    points = [obj.matrix_world @ Vector(c) for obj in scene.objects
              if obj.type == "MESH" and obj.data.polygons for c in obj.bound_box]
    if not points:
        raise ValueError("Source model has no mesh")
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (low + high) / 2
    radius = (high - low).length / 2
    data = bpy.data.cameras.new("Original source preview")
    camera = bpy.data.objects.new("Original source preview", data)
    scene.collection.objects.link(camera)
    camera.location = center + Vector((1.3, -1.8, 1.15)).normalized() * max(radius * 3.2, 1)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.type = "ORTHO"
    data.ortho_scale = max(radius * 2.25, 0.1)
    scene.camera = camera
    for name, offset, energy in [("Key", (2, -3, 4), 200), ("Fill", (-3, -1, 2), 120)]:
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy * max(radius, 0.5) ** 2
        light_data.size = max(radius * 2, 0.5)
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = center + Vector(offset) * max(radius, 0.5)
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    scene.world = bpy.data.worlds.new("Neutral source world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.27, 0.28, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    # The legacy nature FBX imports with shader alpha 0 despite diffuse alpha 1.
    # Workbench displays its unchanged native diffuse material; no material is edited.
    scene.render.engine = "BLENDER_WORKBENCH" if use_diffuse_preview else "BLENDER_EEVEE_NEXT"
    if use_diffuse_preview:
        scene.display.shading.color_type = "MATERIAL"
        scene.display.shading.light = "STUDIO"
        scene.display.shading.background_type = "WORLD"
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
    scene.render.resolution_x = 480
    scene.render.resolution_y = 360
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output.resolve())
    scene.view_settings.view_transform = "Standard"
    bpy.ops.render.render(write_still=True)


def source_panel(images, names):
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    panel = Image.new("RGB", (450, 420), (104, 110, 113))
    draw = ImageDraw.Draw(panel)
    font = ImageFont.truetype(r"C:/Windows/Fonts/segoeui.ttf", 17)
    for index, name in enumerate(names):
        image = ImageOps.contain(Image.open(images / (name + ".png")).convert("RGB"), (218, 185))
        x = index % 2 * 225
        y = index // 2 * 210
        panel.paste(image, (x + (225 - image.width) // 2, y + (185 - image.height) // 2))
        draw.text((x + 8, y + 188), name, font=font, fill="#f1f1e7")
    return panel


def compose_sheet(args):
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    fonts = Path(r"C:/Windows/Fonts")
    title_font = ImageFont.truetype(str(fonts / "segoeuib.ttf"), 29)
    text_font = ImageFont.truetype(str(fonts / "segoeui.ttf"), 20)
    sheet = Image.new("RGB", (2040, 915), (24, 27, 29))
    draw = ImageDraw.Draw(sheet)
    draw.text((32, 24), "RUSTWALL STARTING SETS - KYLE PICKS BEFORE ADAPTATION", font=title_font, fill="#f2dfaf")
    sources = Path(args.sources)
    current = ImageOps.contain(Image.open(args.current).convert("RGB"), (450, 420))
    cards = [
        ("CURRENT - IN-GAME RUSTWALL", current, ["Current production wall GLB", "Game renderer; private memory fixture", "Closed gate and salvage front view", "No game asset replaced"]),
        ("A - KENNEY CAR KIT", source_panel(sources, ["sedan", "debris-door", "debris-plate-a", "debris-bumper"]), ["CC0; car 2,032 tris; debris 40-116 each", "Original loose doors, plates and bumpers", "Best salvage set; see checked counts", "Needs crushed/scorched hulk treatment"]),
        ("B - KENNEY INDUSTRIAL", source_panel(sources, ["water-tower", "shipping-container-a", "chimney-large"]), ["CC0; tower 968 tris; container 402", "Chimney 218 tris; static original models", "Needs rust, reuse and scaffold layout", "No ready-made salvage wall"]),
        ("C - QUATERNIUS NATURE", source_panel(sources, ["Rock_1", "Rock_2", "Rock_3", "Rock_5"]), ["CC0; rocks 70-90 triangles each", "Four meshes from Muddy Hollow cache", "Best reuse path for canyon forms", "Needs desert strata and joined banks"]),
    ]
    for index, (label, image, lines) in enumerate(cards):
        x = 32 + index * 502
        draw.rounded_rectangle((x, 82, x + 478, 840), 12, fill=(43, 47, 49))
        draw.text((x + 14, 99), label, font=text_font, fill="#fff1ca")
        sheet.paste(image, (x + 14 + (450 - image.width) // 2, 155 + (420 - image.height) // 2))
        for row, line in enumerate(lines):
            draw.text((x + 16, 654 + row * 34), line, font=text_font, fill="#ecece4")
    draw.text((32, 871), "Original geometry and source colours; nature FBX uses native diffuse preview. See review for counts, licences and fitting gaps.", font=text_font, fill="#b9c0c0")
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, quality=87, optimize=True)
    if destination.stat().st_size > 500000:
        raise RuntimeError("Review JPG exceeds 500 KB")


def main():
    args = parse_arguments()
    if args.sheet:
        compose_sheet(args)
        return
    destination = Path(args.output).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    report = []
    for candidate, name, path in SOURCES:
        load_original(path)
        report.append(inspect_original(candidate, name, path))
        if args.render:
            render_original(destination / (name + ".png"), use_diffuse_preview=path.suffix == ".fbx")
    (destination / "source-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
