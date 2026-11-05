"""Render the Wasteland paint comparison using the production car models.

Run:
  blender -b -t 4 --factory-startup --python-exit-code 1 --python tools/blender/skin-waste-sheet.py -- --root . --work-dir .qa-dist/skin-waste --out docs/board/looks/skin-waste/round-1.jpg
The work directory holds temporary Blender renders. The retained sheet is JPEG.
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

PAINTS = (
    ('Rust Patina', 0x74462d, .48, .82, .05, .90),
    ('Salt Bleach', 0xb6ad91, .22, .91, .02, .95),
    ('Desert Sand', 0x9a7442, .18, .88, .04, .90),
    ('Boneyard Silver', 0x777a73, .72, .74, .08, .82),
    ('Scrap Patchwork', 0x65705d, .32, .86, .04, .92),
    ('Bowl Flame', 0xa63b20, .28, .78, .08, .86),
    ('Soot Black', 0x292a27, .16, .92, .02, .96),
    ('Hazard Stripe', 0xb18c29, .24, .84, .04, .90),
)
CARS = (
    ('Titan', 'public/assets/models/unlocks/titan_monster.glb'),
    ('Dusthawk Rally', 'public/assets/models/unlocks/dusthawk_rally.glb'),
    ('Bugatti Bolide', '.qa-dist/skin-waste/bugatti_bolide.glb'),
)

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--work-dir', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--compose-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
work = (root / args.work_dir).resolve()
out = (root / args.out).resolve()
if not work.is_relative_to(root / '.qa-dist'):
    parser.error('Temporary renders must stay under .qa-dist/.')
if not out.is_relative_to(root / 'docs/board/looks/skin-waste'):
    parser.error('The comparison sheet must stay under docs/board/looks/skin-waste/.')
if args.compose_only:
    from PIL import Image, ImageDraw, ImageFont
    width, row_height, header_height = 1500, 400, 58
    sheet = Image.new('RGB', (width, len(PAINTS) * (row_height + header_height)), '#e4dfd1')
    draw = ImageDraw.Draw(sheet)
    font_path = Path('C:/Windows/Fonts/arial.ttf')
    title_font = ImageFont.truetype(str(font_path), 28) if font_path.exists() else ImageFont.load_default()
    name_font = ImageFont.truetype(str(font_path), 19) if font_path.exists() else ImageFont.load_default()
    for index, (name, *_values) in enumerate(PAINTS):
        top = index * (row_height + header_height)
        draw.text((22, top + 12), name.upper(), font=title_font, fill='#292a27')
        draw.text((315, top + 22), 'TITAN', font=name_font, fill='#4c5048')
        draw.text((815, top + 22), 'DUSTHAWK RALLY', font=name_font, fill='#4c5048')
        draw.text((1195, top + 22), 'BUGATTI BOLIDE', font=name_font, fill='#4c5048')
        image = Image.open(work / f'paint-{index + 1}.png').convert('RGB')
        image.thumbnail((width, row_height), Image.Resampling.LANCZOS)
        sheet.paste(image, ((width - image.width) // 2, top + header_height))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=79, optimize=True)
    print(f'{out} {out.stat().st_size} bytes')
    raise SystemExit(0)

import bpy
from mathutils import Vector

def linear(channel):
    value = channel / 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4

def paint_material(material, color, metalness, roughness, clearcoat, clearcoat_roughness):
    if not material or not material.use_nodes:
        return False
    shader = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if not shader:
        return False
    shader.inputs['Base Color'].default_value = (linear((color >> 16) & 255), linear((color >> 8) & 255), linear(color & 255), 1)
    shader.inputs['Metallic'].default_value = metalness
    shader.inputs['Roughness'].default_value = roughness
    coat = shader.inputs.get('Coat Weight')
    if coat:
        coat.default_value = clearcoat
    coat_roughness = shader.inputs.get('Coat Roughness')
    if coat_roughness:
        coat_roughness.default_value = clearcoat_roughness
    return True

def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

work.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x, scene.render.resolution_y = 1500, 400
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('Dry studio')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.42, .40, .34, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .7

floor_mat = bpy.data.materials.new('Dusty neutral floor')
floor_mat.diffuse_color = (.28, .27, .23, 1)
floor_mat.use_nodes = True
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.28, .27, .23, 1)
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -.03))
bpy.context.object.name = 'Neutral studio floor'
bpy.context.object.data.materials.append(floor_mat)

car_paints = []
for column, (label, model_path) in enumerate(CARS):
    filepath = (root / model_path).resolve()
    if not filepath.exists():
        parser.error(f'Missing Blender review model: {filepath}')
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(filepath))
    objects = [obj for obj in bpy.context.scene.objects if obj not in before and obj.type == 'MESH']
    if not objects:
        parser.error(f'No car meshes in {filepath}')
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    center = (low + high) / 2
    footprint = max(high.x - low.x, high.y - low.y, .1)
    scale = min(3.55 / footprint, .9)
    offset = Vector((-5.1 + column * 5.1, 0, 0))
    painted = set()
    for obj in objects:
        obj.location = center + (obj.location - center) * scale + offset
        obj.scale *= scale
        for material in obj.data.materials:
            if material and any(word in material.name.casefold() for word in ('body', 'paint', 'lacquer')):
                painted.add(material.name)
    if not painted:
        parser.error(f'No painted body material found on {label}: {filepath}')
    bottom = min((obj.matrix_world @ Vector(corner)).z for obj in objects for corner in obj.bound_box)
    for obj in objects:
        obj.location.z -= bottom
    car_paints.append([material for material in bpy.data.materials if material.name in painted])

for name, location, energy, size in (
    ('Key', (0, -5, 12), 1800, 8), ('Fill', (7, 3, 8), 900, 7), ('Rim', (-8, 5, 9), 1200, 6)):
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    look_at(light, (0, 0, .5))
bpy.ops.object.camera_add(location=(0, -10, 13))
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 16.2
look_at(camera, (0, 0, .5))
scene.camera = camera
for index, (finish, color, metalness, roughness, clearcoat, clearcoat_roughness) in enumerate(PAINTS, 1):
    for materials in car_paints:
        for material in materials:
            paint_material(material, color, metalness, roughness, clearcoat, clearcoat_roughness)
    scene.render.filepath = str(work / f'paint-{index}.png')
    bpy.ops.render.render(write_still=True)

composer = shutil.which('python')
if not composer:
    parser.error('Python with Pillow is required to compose the Blender renders.')
subprocess.run([composer, str(Path(__file__).resolve()), '--compose-only', '--root', str(root), '--work-dir', str(work), '--out', str(out)], check=True)
