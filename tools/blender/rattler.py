"""Original Rattler hot rod and one-round art review renders.

Run with Blender: blender -b --python-exit-code 1 --python tools/blender/rattler.py -- --root .
Model-local metres, +Y up, +Z forward. Review views stay in .evidence/.
"""
import argparse
import json
import math
import sys
from datetime import date
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/cars/rattler.glb'
blend = root / 'art-build/cars/rattler.blend'
sheet = root / 'docs/board/looks/car-art-rattler/round-2.jpg'
evidence = root / '.evidence' / date.today().isoformat() / 'CAR-ART-RATTLER' / 'round-2'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(evidence)], 'summary': [str(sheet)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x, scene.render.resolution_y = 1000, 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 90
scene.world.color = (.42, .40, .36)

def material(name, color, metallic=.45, roughness=.75):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    noise = mat.node_tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 7.0
    noise.inputs['Detail'].default_value = 3.0
    ramp = mat.node_tree.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .22
    ramp.color_ramp.elements[0].color = (*(c * .48 for c in color), 1)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (*(min(1, c * 1.45 + .025) for c in color), 1)
    mat.node_tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    mat.node_tree.links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
    return mat

steel = material('Sandblasted bare steel', (.43, .42, .38), .78, .74)
rust = material('Oxide in seams and welds', (.34, .105, .034), .52, .88)
patch = material('Faded oxide primer under bare steel', (.42, .22, .095), .58, .82)
black = material('Rubber and blackened iron', (.025, .027, .024), .12, .94)
engine = material('Dark iron engine', (.105, .11, .10), .68, .78)
seat = material('Cracked worn leather', (.11, .065, .035), .08, .95)

def cube(name, loc, size, mat, bevel=.025, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Small hammered edge', 'BEVEL'); mod.width = bevel; mod.segments = 1
        obj.modifiers.new('Welded face normals', 'WEIGHTED_NORMAL')
    obj.data.materials.append(mat)
    if parent: obj.parent = parent
    return obj

def cyl(name, loc, radius, depth, mat, rot=(math.pi/2, 0, 0), vertices=20, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(mat)
    if parent: obj.parent = parent
    return obj

def ellipsoid(name, loc, size, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=loc)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for face in obj.data.polygons: face.use_smooth = True
    obj.data.materials.append(mat)
    if parent: obj.parent = parent
    return obj

car = bpy.data.objects.new('Rattler chopped pickup hot rod', None)
bpy.context.collection.objects.link(car)
# 1.82 m wide, 4.25 m long and 1.78 m high. Front is +Z.
# Ladder frame and low cowl preserve a light, short wheelbase hot-rod stance.
cube('Twin rail ladder chassis', (0, .56, -.02), (1.48, .20, 3.84), engine, .035, car)
cube('Open floor pan', (0, .73, -.05), (1.30, .13, 2.92), steel, .025, car)
# A rounded, chopped cab shell replaces the old slab-sided box. Large bevels
# soften the hand-formed roof and shoulder while retaining a real panel thickness.
cab_shell = cube('Rounded chopped cab shell', (0, 1.20, -.58), (1.58, .78, 1.50), steel, .20, car)
cab_shell.modifiers['Small hammered edge'].segments = 8
cube('Cab lower rocker seam', (0, .91, -.58), (1.54, .10, 1.36), rust, .07, car)
# Narrow glazed slit at the cowl and open side window apertures read as a hot rod cab.
cube('Narrow slit windshield', (0, 1.47, .20), (1.13, .14, .035), black, .025, car)
cube('Slit lower steel lip', (0, 1.38, .22), (1.28, .055, .06), patch, .018, car)
# Curved roof cap follows the chopped cab rather than a flat slab.
roof = cube('Crowned chopped roof skin', (0, 1.62, -.61), (1.48, .16, 1.12), steel, .14, car)
roof.modifiers['Small hammered edge'].segments = 6
# Cut-down pillars frame large open side windows.
for side in (-1, 1):
    cube('Chopped A pillar', (side*.69, 1.48, .02), (.075, .47, .085), rust, .025, car)
    cube('Rear cab post', (side*.69, 1.48, -1.10), (.08, .47, .09), steel, .025, car)
    cube('Window lower rail', (side*.70, 1.12, -.58), (.09, .07, 1.18), patch, .025, car)
    cube('Door skin with rolled edge', (side*.755, 1.02, -.66), (.045, .29, .78), patch if side < 0 else steel, .06, car)
    window = cube('Open side window darkness', (side*.718, 1.42, -.53), (.028, .31, .88), black, .13, car)
    window.modifiers['Small hammered edge'].segments = 6
    cube('Door handle', (side*.79, 1.15, -.74), (.035, .035, .17), rust, .012, car)
    cube('Running board', (side*.88, .67, -.53), (.20, .12, .80), black, .015, car)
# Narrow front fenders, rear haunches and simple pickup bed sides.
for side in (-1, 1):
    # Open wheel arches keep the stance lean and avoid slab fenders.
    cube('Bed side', (side*.72, .99, -1.40), (.08, .42, .94), rust if side > 0 else patch, .025, car)
    for z in (-1.78, -1.36, -.94):
        cube('Bed side stake', (side*.73, 1.15, z), (.075, .62, .075), steel, .018, car)
cube('Bed floor slats', (0, .88, -1.41), (1.30, .09, .94), engine, .02, car)
cube('Tailgate', (0, 1.01, -1.89), (1.42, .42, .08), patch, .02, car)
# Oversized rear tyres, modest fronts, open rims and visible hubs. Centers meet ground at y=0.
for side in (-1, 1):
    for z, radius, width in ((1.22, .40, .25), (-1.28, .62, .34)):
        cyl('Deep lug tyre', (side*.88, radius, z), radius, width, black, rot=(0, math.pi/2, 0), vertices=32, parent=car)
        cyl('Stamped open wheel', (side*(.88+width*.49), radius, z), radius*.59, .035, engine, rot=(0, math.pi/2, 0), vertices=16, parent=car)
        cyl('Rusted hub boss', (side*(.91+width*.52), radius, z), radius*.19, .065, rust, rot=(0, math.pi/2, 0), vertices=12, parent=car)
# Exposed V engine, intake, belts, headers and short side pipes.
cube('Engine block', (0, 1.01, .82), (.73, .65, 1.02), engine, .06, car)
cube('Ribbed rocker cover left', (-.24, 1.40, .78), (.27, .12, .76), patch, .025, car)
cube('Ribbed rocker cover right', (.24, 1.40, .78), (.27, .12, .76), steel, .025, car)
cube('Carburettor and blower intake', (0, 1.52, .96), (.36, .22, .42), rust, .035, car)
cube('Air scoop mouth', (0, 1.66, 1.15), (.33, .08, .32), black, .02, car)
for side in (-1, 1):
    for y in (1.10, 1.22, 1.34):
        cyl('Exposed exhaust header tube', (side*.46, y, .72), .045, .72, steel, rot=(0, math.pi/2, 0), vertices=10, parent=car)
    cyl('Stub side pipe', (side*.78, .65, .60), .09, .52, rust, rot=(0, 0, math.pi/2), vertices=12, parent=car)
    cube('Pipe heat shield', (side*.80, .68, .57), (.06, .18, .34), steel, .02, car)
# Roll hoop behind the open cab, with cross brace and welded feet.
for side in (-1, 1):
    cyl('Roll hoop upright', (side*.54, 1.62, -.94), .055, 1.18, steel, rot=(math.pi/2, 0, 0), vertices=12, parent=car)
    cube('Hoop welded foot', (side*.54, 1.04, -.94), (.18, .12, .20), rust, .02, car)
cyl('Roll hoop crown', (0, 2.19, -.94), .055, 1.16, steel, rot=(0, math.pi/2, 0), vertices=12, parent=car)
cyl('Hoop diagonal brace', (0, 1.79, -1.07), .035, .88, patch, rot=(0, math.radians(45), 0), vertices=10, parent=car)
# Riveted repair plates, bolt heads, weld beads, and narrow raw-steel bumper bars.
for side in (-1, 1):
    cube('Hand-cut cab repair plate', (side*.80, 1.02, -.27), (.025, .22, .31), rust, .012, car)
    for y in (1.00, 1.18):
        for z in (-.39, -.17): cyl('Repair plate rivet', (side*.82, y, z), .025, .025, black, rot=(0, math.pi/2, 0), vertices=8, parent=car)
cube('Front raw steel bumper', (0, .57, 2.00), (1.82, .16, .13), steel, .025, car)
cube('Rear raw steel bumper', (0, .62, -1.99), (1.70, .15, .12), rust, .025, car)

# Human scale figure is review-only and is never part of the exported selection.
human = []
def person_cube(name, loc, size, mat):
    obj = cube(name, loc, size, mat, .01); human.append(obj); return obj
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=.13, location=(2.25, 1.68, 0))
head = bpy.context.object; head.name = 'Review scale person head'; head.data.materials.append(patch); human.append(head)
person_cube('Review scale person torso', (2.25, 1.19, 0), (.30, .62, .22), steel)
person_cube('Review scale person arms', (2.25, 1.23, 0), (.72, .14, .18), rust)
for z in (-.10, .10): person_cube('Review scale person leg', (2.25, .42, z), (.18, .76, .16), black)

ground = material('Review pale dusty ground', (.48, .47, .43), .02, .98)
floor = cube('Review floor', (0, -.04, 0), (8, .08, 8), ground, 0)
def aim(obj, point): obj.rotation_euler = (Vector(point)-obj.location).to_track_quat('-Z', 'Y').to_euler()
for loc, power, size in [((-4, 7, 4), 3600, 8), ((4, 5, -4), 2800, 7), ((0, 6, -1), 1800, 8)]:
    bpy.ops.object.light_add(type='AREA', location=loc); light=bpy.context.object
    light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light, (0, 1, 0))
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 1.4
blend.parent.mkdir(parents=True, exist_ok=True); glb.parent.mkdir(parents=True, exist_ok=True); evidence.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

# Render in Blender Z-up, then restore the model's game-local Y-up before export.
car.rotation_euler.x = math.pi/2
floor.rotation_euler.x = math.pi/2
for obj in human:
    x, y, z = obj.location
    obj.location = (x, -z, y)
    obj.rotation_euler.x += math.pi/2
bpy.context.view_layer.update()
bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera; camera.data.type='ORTHO'
renders=[]
views = (
    ('front-three-quarter', (6, -7, 4), (0, 0, 1.0), 5.4),
    ('rear-three-quarter', (-6, 7, 4), (0, 0, 1.0), 5.4),
    ('side', (9, 0, 2.8), (0, 0, 1.0), 4.9),
    ('top', (0, 0, 10), (0, 0, .7), 5.0),
    ('beside-person', (6, -7, 4), (0, 0, 1.0), 5.4),
)
scene.render.resolution_x, scene.render.resolution_y = 1000, 700
for name, direction, target, scale in views:
    for obj in human: obj.hide_render = (name != 'beside-person')
    camera.location = direction
    aim(camera, target)
    camera.data.ortho_scale = scale
    scene.render.filepath = str(evidence / f'{name}.jpg')
    bpy.ops.render.render(write_still=True)
    renders.append(str(evidence / f'{name}.jpg'))
human[0].hide_render = False
car.rotation_euler.x = 0; floor.rotation_euler.x = 0
for obj in bpy.context.selected_objects: obj.select_set(False)
for obj in list(bpy.data.objects): obj.select_set(False)
for obj in list(bpy.data.objects):
    parent = obj.parent
    while parent and parent is not car: parent = parent.parent
    if parent is car: obj.select_set(True)
bpy.context.view_layer.objects.active = car
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_apply=True, export_materials='EXPORT', export_extras=True, use_selection=True)
if glb.stat().st_size > 8_000_000: raise RuntimeError(f'GLB budget exceeded: {glb.stat().st_size}')
triangles = sum(len(poly.vertices)-2 for obj in bpy.data.objects if obj.type == 'MESH' and obj.parent is car for poly in obj.data.polygons)
if triangles > 25_000: raise RuntimeError(f'Triangle budget exceeded: {triangles}')
print(json.dumps({'renders': renders, 'model': str(glb), 'bytes': glb.stat().st_size, 'triangles': triangles, 'round1': str(sheet)}))
