"""TOWN-ART-OUTPOSTS: roadside places carved from their own photographs.

Run with Blender 4.5:
  blender -b --python-exit-code 1 --python tools/blender/town-outposts.py -- --root .

Coordinates are game metres, +Y up, front toward -Z. Dot's measured photo
frame is 1448 x 1086 px. The recipe intentionally starts with this diner;
later buildings add their own views and measured tables below.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--paths-only', action='store_true')
p.add_argument('--render-dir', default='.qa-dist/town-outposts-round-1')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
out = root / 'public/assets/models/wasteland/town/outposts.glb'
blend = root / 'art-build/town/outposts.blend'
sheet = root / 'docs/board/looks/town-art-outposts/round-1.jpg'
ev = root / '.evidence/2026-11-06/TOWN-ART-OUTPOSTS'
render = Path(a.render_dir)
render = render if render.is_absolute() else root / render
textures = root / 'public/assets/models/wasteland/town/textures'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(ev)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
from photo_model import Mesh, Photo, box, lathe, slab, tidy, trace
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)
render.mkdir(parents=True, exist_ok=True)

side = Photo(textures / 'dot-diner-side.jpg', frame=(1448, 1086))
front = Photo(textures / 'dot-diner-front.jpg', frame=(1774, 887))
overhead = Photo(textures / 'dot-diner-overhead.jpg', frame=(2172, 724))
materials = {'side': side.material(), 'front': front.material(), 'overhead': overhead.material()}

# Flood masks and measured parts. Photo coordinates are top-left-origin pixels.
side_solid = tidy(~side.sky([(10, 12), (720, 12), (1435, 20), (80, 1040)], tolerance=43, grey=40))
front_solid = tidy(~front.sky([(12, 12), (880, 12), (1760, 12)], tolerance=44, grey=40))
top_solid = tidy(~overhead.sky([(10, 12), (1080, 12), (2160, 12)], tolerance=42, grey=40))

# Scale anchors from the side and top photographs: 1,420 px of body = 29.0 m;
# aircraft centreline is at y=590 px. The porch edge in the plan is 7.2 m out.
S = 29.0 / 1420.0
def X(px): return (724.0 - px) * S
def Y(py): return (785.0 - py) * S
def side_point(px, py, depth): return (X(px), Y(py), depth)

side_mesh = Mesh()

# MEASURED PARTS | side photo pixels -> game metres
# fuselage stations below sample the visible aircraft skin outline; radius is
# half the measured upper/lower silhouette height, checked against the round
# nose in the front photograph. Axis is X and cross-section is Y/Z.
axis_y = Y(590)
fuselage_outline = [
    (25, 710, 657), (60, 690, 648), (120, 638, 621), (205, 562, 591),
    (300, 492, 568), (400, 456, 559), (500, 449, 558), (605, 454, 560),
]
stations = []
for px, upper, lower in fuselage_outline:
    center_px = (upper + lower) * .5
    radius = (lower - upper) * S * .5
    stations.append((X(px), radius))
def fuselage_uv(index, distance, radius, angle):
    px = 724.0 - distance / S
    py = 590.0 - math.sin(angle) * radius / S
    return side.uv(max(0, min(side.w - 1, px)), max(0, min(side.h - 1, py)))
lathe(side_mesh, 'side', (0, axis_y, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0),
      stations, fuselage_uv, sides=28,
      cap_start=('front', lambda angle, f: front.uv(887 + math.cos(angle) * f * 310,
                                                     455 - math.sin(angle) * f * 295)),
      cap_end=('side', lambda angle, f: side.uv(590, 590 - math.sin(angle) * f * 117)))

# Bus side shell: traced from the photo's right-hand bus profile. Its front
# joins the measured aircraft station; rectangular glazing remains in the
# photo-backed cutout map. Slab depth is 4.3 m, centred on the road axis.
bus_loops = trace(side_solid, (420, 455, 1435, 760), tolerance=2.0, min_area=260)
def bus_near(px, py, depth): return side_point(px, py, depth)
def bus_far(px, py, depth): return ((px - 724.0) * S, Y(py), depth)
slab(side_mesh, 'side', side, bus_loops, bus_near, -2.03, -2.15)
slab(side_mesh, 'side', side, bus_loops, bus_far, 2.03, 2.15)

# Roof silhouette is traced from the vertical overhead photograph and placed
# as a shallow photo-backed skin; its footprint agrees with the 32 x 24 m plot.
roof_loops = trace(top_solid, (18, 132, 2055, 455), tolerance=2.0, min_area=220)
TOP_S = 29.0 / 1980.0
def roof_point(px, py, height):
    return ((1086.0 - px) * TOP_S, height, (py - 360.0) * TOP_S)
slab(side_mesh, 'overhead', overhead, roof_loops, roof_point, 4.2, 4.34)

# The readable sign uses its real painted-board outline, traced from the side
# photo rather than a computer font. Posts and porch boxes carry photo crops.
sign_loops = trace(front_solid, (550, 20, 1225, 192), tolerance=1.2, min_area=180)
def sign_point(px, py, depth):
    return ((887.0 - px) * .016, (108.0 - py) * .016 + 6.85, depth)
slab(side_mesh, 'front', front, sign_loops, sign_point, -4.62, -4.78)

# Measured display rectangles and boxes. The diner faces the road on -Z.
wood = ('side', side, (380, 725, 760, 780))
iron = ('front', front, (70, 680, 270, 850))
signpost_photo = ('side', side, (535, 306, 1070, 456))
box(side_mesh, X(345), X(1255), 0.30, 0.48, -7.0, -3.9,
    {'-z': wood, '+z': wood, '+y': wood, '-y': wood})
# Narrow porch apron and posts from the same photo palette.
for px in (365, 565, 760, 970, 1200):
    box(side_mesh, X(px)-.07, X(px)+.07, .42, 3.1, -6.75, -6.58,
        {'-z': wood, '+z': wood, '+x': wood, '-x': wood})
# Roof canopy slab follows the measured awning span and sits above tables.
box(side_mesh, X(360), X(1268), 3.05, 3.24, -7.25, -3.45,
    {'-z': ('side', side, (350, 468, 1255, 525)), '+z': wood, '+y': ('overhead', overhead, (325, 360, 1450, 435))})

# Four fixed outdoor tables and chairs are simple measured slab/box parts.
for i, px in enumerate((475, 670, 880, 1090)):
    cx = X(px)
    box(side_mesh, cx-.43, cx+.43, 1.05, 1.18, -6.20, -5.35,
        {'+y': wood})
    for dx in (-.34, .34):
        box(side_mesh, cx+dx-.025, cx+dx+.025, .50, 1.05, -6.12, -5.43,
            {'+z': iron, '-z': iron, '+x': iron, '-x': iron})

# Vintage pump: measured from the side photo; six faces carry its own photo crop.
box(side_mesh, X(70), X(119), .48, 1.95, -6.75, -5.98,
    {'-z': iron, '+z': iron, '+x': iron, '-x': iron, '+y': iron})
box(side_mesh, X(80), X(109), 1.55, 1.73, -6.80, -5.95,
    {'-z': ('front', front, (735, 350, 935, 495)), '+z': iron, '+x': iron, '-x': iron})

# Sign braces are solid posts extending from the porch roof to its back plate.
for px in (565, 1050):
    box(side_mesh, X(px)-.06, X(px)+.06, 3.25, 6.65, -4.83, -4.68,
        {'-z': signpost_photo, '+z': signpost_photo, '+x': signpost_photo, '-x': signpost_photo})

mesh_obj = side_mesh.finish('dot-diner:body', materials)
family = bpy.data.objects.new('town-outposts', None)
bpy.context.collection.objects.link(family)
family.empty_display_type = 'PLAIN_AXES'
diner = bpy.data.objects.new('dot-diner', None)
bpy.context.collection.objects.link(diner)
diner.empty_display_type = 'CUBE'
diner.parent = family
mesh_obj.parent = diner
from mathutils import Matrix
mesh_obj.matrix_parent_inverse = Matrix.Identity(4)

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)

# Read back the exported GLB in a clean scene, then render the mayor and road views.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('flat pale overcast')
scene.world.color = (.55, .55, .55)
scene.render.film_transparent = False

def area(name, loc, energy, size):
    data = bpy.data.lights.new(name, 'AREA'); data.energy = energy; data.shape = 'DISK'; data.size = size
    obj = bpy.data.objects.new(name, data); scene.collection.objects.link(obj); obj.location = loc
    obj.rotation_euler = (Vector((0, 2, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
area('large soft sky', (0, 22, -5), 3200, 18)
area('open fill', (-14, 14, 16), 1800, 15)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera); scene.camera = camera

def shot(name, eye, target, width, height, ortho=None, lens=40):
    scene.render.resolution_x, scene.render.resolution_y = width, height
    ev = Vector(eye); tv = Vector(target)
    camera.location = (ev.x, -ev.z, ev.y)
    camera.rotation_euler = (Vector((tv.x, -tv.z, tv.y)) - camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO' if ortho else 'PERSP'
    if ortho: camera.data.ortho_scale = ortho
    else: camera.data.lens = lens
    scene.render.filepath = str(render / f'{name}.png')
    bpy.ops.render.render(write_still=True)

shot('dot-diner-mayor', (7, 31, -38), (0, 2.8, 0), 1120, 760, ortho=35)
shot('dot-diner-driver', (0, 1.55, -25), (0, 2.3, 0), 1120, 760, ortho=28)
shot('dot-diner-side', (0, 6, 42), (0, 3, 0), 1120, 600, ortho=39)
shot('dot-diner-overhead', (0, 52, 0), (0, 0, 0), 1120, 600, ortho=37)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size, 'renders': [str(p) for p in render.glob('dot-diner-*.png')]}))
