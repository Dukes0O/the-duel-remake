"""Round 8 Rattler, measured from four full-size generated photographs.

Run with Blender 4.5: blender -b -t 4 --python-exit-code 1 --python tools/blender/rattler-photo.py -- --root .
Photo coordinates and model coordinates are glTF metres: X right, Y up, +Z forward.
"""
import argparse
import json
import math
import struct
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.qa-dist/rattler-photo')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
script = root / 'tools/blender/rattler-photo.py'
blend = root / 'art-build/cars/rattler-photo.blend'
glb = root / 'public/assets/models/wasteland/cars/rattler.glb'
textures = root / 'public/assets/models/wasteland/cars/textures'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [], 'renders': [str(render_dir)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(script.parent))
from photo_model import Mesh, Photo, box, lathe, slab, tidy, trace

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)
photos = {name: Photo(textures / f'rattler-{name}.jpg') for name in ('side', 'front', 'rear', 'top')}
side, front, rear, top = (photos[name] for name in ('side', 'front', 'rear', 'top'))
materials = {name: photo.material(.92) for name, photo in photos.items()}
for material in materials.values():
    material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0

def save_mask(name, mask):
    image = bpy.data.images.new('Rattler mask ' + name, mask.shape[1], mask.shape[0], alpha=False)
    grey = mask[::-1].astype(np.float32)
    image.pixels.foreach_set(np.dstack((grey, grey, grey, np.ones_like(grey))).ravel())
    image.filepath_raw = str(render_dir / ('mask-' + name + '.png'))
    image.file_format = 'PNG'
    image.save()

def photo_mask(name, photo, seeds):
    # The pale studio backdrop is darker than the rail-photo sample. Lift only
    # the detector's in-memory pixels to the neutral seed range; the image used
    # by materials remains the untouched generated photograph.
    photo._rgb = np.clip(photo.rgb() + 25, 0, 255).astype(np.int16)
    mask = tidy(~photo.sky(seeds, grey=26), 2)
    save_mask(name, mask)
    return mask

# The grey studio is slightly blue. The kit's 26-grey flood limit keeps it
# connected while preserving dark windows and genuine shadow detail.
side_solid = photo_mask('side', side, [(8, 8), (side.w - 8, 8), (8, side.h - 8), (side.w - 8, side.h - 8)])
front_solid = photo_mask('front', front, [(8, 8), (front.w - 8, 8), (8, front.h - 8), (front.w - 8, front.h - 8)])
rear_solid = photo_mask('rear', rear, [(8, 8), (rear.w - 8, 8), (8, rear.h - 8), (rear.w - 8, rear.h - 8)])
top_solid = photo_mask('top', top, [(8, 8), (top.w - 8, 8), (8, top.h - 8), (top.w - 8, top.h - 8)])

def cut_ellipse(mask, cx, cy, rx, ry):
    yy, xx = np.ogrid[:mask.shape[0], :mask.shape[1]]
    mask[((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1] = False

# Open wheel wells are measured around the tyres in each view. The tyres are
# fitted inside these openings, with a small visible clearance.
for cx, cy, rx, ry in ((221, 641, 188, 181), (1458, 610, 236, 223)):
    cut_ellipse(side_solid, cx, cy, rx, ry)
# Keep the side-photo engine opening open. Its measured outlines are filled by
# the V8 and pipes below, not by another flat panel over them.
side_solid[322:505, 350:590] = False
for cx, cy, rx, ry in ((260, 965, 228, 245), (1050, 965, 228, 245)):
    cut_ellipse(front_solid, cx, cy, rx, ry)
for cx, cy, rx, ry in ((190, 855, 276, 270), (1210, 855, 276, 270)):
    cut_ellipse(rear_solid, cx, cy, rx, ry)
for name, mask in (('side-openings', side_solid), ('front-openings', front_solid), ('rear-openings', rear_solid)):
    save_mask(name, mask)
side_solid[790:, :] = False

# Pixel calibration follows the wheel centres and the full bumper-to-tailgate span.
S = 4.52 / (side.w - 40)
SIDE_CX = side.w / 2
SIDE_GROUND = 790
SIDE_Y = 2.08 / (790 - 100)
def side_point(px, py, x): return (x, (SIDE_GROUND - py) * SIDE_Y, (SIDE_CX - px) * S)
def end_x(px, photo): return (px - photo.w / 2) * .00165
def front_point(px, py, z): return (end_x(px, front), max(0, (1140 - py) * .00188), z)
def rear_point(px, py, z): return (end_x(px, rear), max(0, (990 - py) * .00208), z)
def top_point(px, py, y): return ((px - top.w / 2) * 2.12 / 610, y, (780 - py) * .00302)

vehicle = bpy.data.objects.new('rattler', None)
bpy.context.collection.objects.link(vehicle)
vehicle['vehicle_id'] = 'rattler'
vehicle['units'] = 'metres'
vehicle['forward'] = '+Z'
vehicle['up'] = '+Y'
vehicle['round'] = 8

# One thick, measured side silhouette closes the cab, bonnet, wings and bed as
# a continuous volume. Its measured wheel arches and side-photo UVs prevent the
# intersecting, shredded panel strips from round 7.
body = Mesh()
body_loops = trace(side_solid, (28, 100, side.w - 20, 790), tolerance=1.1, min_area=130)
if not body_loops:
    raise RuntimeError('No closed Rattler body outline in the side photograph')
slab(body, 'side', side, body_loops, side_point, -.96, .96, wall_scale=SIDE_Y)
body_obj = body.finish('rattler body closed side shell', materials)
body_obj.parent = vehicle

# The photo-measured end skins meet the side shell and close the full body at
# both bumpers. Wheel openings remain real holes, not flat pictures.
for label, photo, mask, point, z0, z1, rect in (
    ('front', front, front_solid, front_point, 2.205, 2.265, (60, 70, front.w - 60, 1135)),
    ('rear', rear, rear_solid, rear_point, -2.265, -2.205, (60, 60, rear.w - 60, 995)),
):
    loops = trace(mask, rect, tolerance=1.4, min_area=160)
    if not loops:
        raise RuntimeError(f'No closed {label} body outline in its photograph')
    end = Mesh()
    slab(end, label, photo, loops, point, z0, z1, wall_scale=.0019)
    end.finish(f'rattler {label} closing shell', materials).parent = vehicle

# Separate, closed top volumes use only their matching overhead-photo regions.
for name, rect, y0, y1, area in (
    ('cab roof', (255, 400, 770, 940), 2.04, 2.09, 1600),
    ('plank bed top', (270, 905, 760, 1485), 1.35, 1.40, 1400),
):
    loops = trace(top_solid, rect, tolerance=1.6, min_area=area)
    if not loops:
        raise RuntimeError(f'No measured {name} outline in the overhead photograph')
    cap = Mesh()
    slab(cap, 'top', top, loops, top_point, y0, y1, wall_scale=.00302)
    cap.finish('rattler ' + name, materials).parent = vehicle

# Chassis rails and a compact V8 block are supported by the shell and keep the
# engine bay open and readable from three-quarter views.
frame = Mesh()
for x in (-.66, .66):
    box(frame, x - .07, x + .07, .28, .48, -1.93, 1.78,
        {'+y': ('side', side, (390, 730, 1420, 765)), '-y': ('side', side, (390, 730, 1420, 765)),
         '+z': ('front', front, (360, 880, 950, 1020)), '-z': ('rear', rear, (360, 770, 1050, 840))})
for z in (-1.5, -.35, .85, 1.6):
    box(frame, -.68, .68, .32, .42, z - .06, z + .06,
        {'+y': ('side', side, (510, 742, 1320, 770)), '-y': ('side', side, (510, 742, 1320, 770)),
         '+x': ('front', front, (400, 900, 910, 945)), '-x': ('front', front, (400, 900, 910, 945))})
frame.finish('rattler ladder chassis and crossmembers', materials).parent = vehicle

engine = Mesh()
box(engine, -.50, .50, .78, 1.19, .72, 1.68,
    {'+y': ('top', top, (405, 250, 630, 410)), '+z': ('front', front, (435, 520, 880, 840)),
     '-z': ('rear', rear, (440, 600, 900, 780)), '+x': ('side', side, (430, 420, 600, 560)),
     '-x': ('side', side, (430, 420, 600, 560))})
box(engine, -.39, .39, 1.20, 1.34, .86, 1.47,
    {'+y': ('top', top, (420, 305, 612, 390)), '+x': ('side', side, (460, 408, 590, 442)),
     '-x': ('side', side, (460, 408, 590, 442)), '+z': ('front', front, (480, 470, 830, 520))})

def cylinder_between(mesh, name, start, end, radius, photo_key, uv_rect, sides=16):
    start, end = Vector(start), Vector(end)
    axis = (end - start).normalized()
    e1 = axis.cross(Vector((0, 1, 0)))
    if e1.length < .01:
        e1 = axis.cross(Vector((1, 0, 0)))
    e1.normalize()
    e2 = axis.cross(e1).normalized()
    photo = photos[photo_key]
    x0, y0, x1, y1 = uv_rect
    uv = lambda i, d, r, a: photo.uv(x0 + (x1 - x0) * i, y0 + (y1 - y0) * (a % (2 * math.pi)) / (2 * math.pi))
    lathe(mesh, photo_key, start, axis, e1, e2, [(0, radius), ((end - start).length, radius)], uv, sides=sides)

# Round air filter, paired exhausts, grille bars, lamps and the hoop are lathed
# or thick photo parts. The arcs stay inside the photographed outline pixels.
cylinder_between(engine, 'air filter', (0, 1.34, 1.05), (0, 1.49, 1.05), .30, 'side', (380, 315, 560, 358), 32)
for side_sign in (-1, 1):
    cylinder_between(engine, 'exhaust', (side_sign * .48, .53, .24), (side_sign * .48, .53, 1.30), .055, 'side', (440, 600, 565, 635), 20)
for x in (-.60, -.45, -.30, -.15, 0, .15, .30, .45, .60):
    cylinder_between(engine, 'grille bar', (x, .48, 2.245), (x, 1.14, 2.245), .018, 'front', (566, 550, 592, 860), 10)
for x in (-.70, .70):
    cylinder_between(engine, 'headlight', (x, .82, 2.23), (x, .82, 2.27), .155, 'front', (410, 835, 525, 952), 28)
    cylinder_between(engine, 'roll hoop upright', (x, 1.35, -.12), (x, 2.04, -.12), .055, 'side', (1050, 100, 1130, 150), 14)
cylinder_between(engine, 'roll hoop crown', (-.70, 2.04, -.12), (.70, 2.04, -.12), .055, 'rear', (520, 82, 835, 135), 14)
engine.finish('rattler V8, exhaust, grille, lights and roll hoop', materials).parent = vehicle

# The four tyre meshes are independent, round, correctly grounded parts. Their
# centres sit just inside the measured fender edges; radial UV arcs avoid sky.
wheel_specs = (
    ('front-left', .45, 1.70, .91, .22, 221, 641),
    ('front-right', .45, 1.70, -.91, .22, 221, 641),
    ('rear-left', .54, -1.53, .91, .28, 1458, 610),
    ('rear-right', .54, -1.53, -.91, .28, 1458, 610),
)
wheel_nodes = {}
for name, radius, z, x, width, px, py in wheel_specs:
    wheel = Mesh()
    cy = py
    def radial(i, distance, r, angle, px=px, cy=cy, radius=radius):
        arc = .85 * math.degrees(math.asin(max(-1, min(1, math.sin(angle))))) / 90
        return side.uv(px + r / S * arc, cy - r / SIDE_Y * math.cos(angle))
    def cap_uv(angle, fraction, px=px, cy=cy, radius=radius):
        return side.uv(px + math.cos(angle) * fraction * radius / S * .85,
                       cy - math.sin(angle) * fraction * radius / SIDE_Y * .85)
    lathe(wheel, 'side', (x, radius, z), (1, 0, 0), (0, 0, 1), (0, 1, 0),
          [(-width / 2, radius * .83), (-width * .34, radius), (width * .34, radius), (width / 2, radius * .83)],
          radial, sides=40, cap_start=('side', cap_uv), cap_end=('side', cap_uv))
    wheel_obj = wheel.finish('rattler wheel ' + name, materials)
    wheel_obj.parent = vehicle
    wheel_nodes[name] = wheel_obj

# The sockets follow the shared vehicle contract exactly and remain named nodes.
socket_locations = {
    'front': (0, .48, 2.305), 'rear': (0, .48, -2.305), 'roof': (0, 2.16, -.24),
    'hood': (0, 1.43, .35), 'left': (1.10, 1.02, 0), 'right': (-1.10, 1.02, 0),
    'door': (1.06, 1.02, -.14), 'shield': (0, 1.12, 0),
}
for key, location in socket_locations.items():
    node = bpy.data.objects.new('vehicle-socket-' + key, None)
    bpy.context.collection.objects.link(node)
    node.parent = vehicle
    node.location = location

# Explicit upright check: the model is authored Y-up in Blender's transformed
# scene, then glTF's Y-up conversion is enabled. The mesh axis is round-tripped.
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='DESELECT')
vehicle.select_set(True)
for child in vehicle.children:
    child.select_set(True)
bpy.context.view_layer.objects.active = vehicle
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_yup=True, export_apply=True,
                           export_materials='EXPORT', export_image_format='JPEG', export_image_quality=88)

def read_glb(path):
    raw = path.read_bytes()
    if raw[:4] != b'glTF':
        raise RuntimeError('Output is not a GLB')
    length = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20 + length].decode('utf-8').rstrip('\0 '))

gltf = read_glb(glb)
nodes = {node.get('name'): node for node in gltf.get('nodes', [])}
raw_glb = glb.read_bytes()
json_length = struct.unpack_from('<I', raw_glb, 12)[0]
bin_header = 20 + json_length
bin_length = struct.unpack_from('<I', raw_glb, bin_header)[0]
if raw_glb[bin_header + 4:bin_header + 8] != b'BIN\0':
    raise RuntimeError('GLB has no embedded binary geometry buffer')
binary = raw_glb[bin_header + 8:bin_header + 8 + bin_length]
required = {f'vehicle-socket-{key}' for key in socket_locations} | {f'rattler wheel {name}' for name, *_ in wheel_specs}
if not required.issubset(nodes):
    raise RuntimeError('GLB is missing vehicle contract nodes: ' + ', '.join(sorted(required - set(nodes))))
if len({nodes[name].get('mesh') for name in required if 'wheel ' in name}) != 4:
    raise RuntimeError('GLB lost separate wheel meshes')
triangle_count = 0
uv_ranges = []
for mesh_data in gltf.get('meshes', []):
    for primitive in mesh_data.get('primitives', []):
        attrs = primitive.get('attributes', {})
        uv_keys = [name for name in attrs if name.startswith('TEXCOORD_')]
        if uv_keys != ['TEXCOORD_0']:
            raise RuntimeError(f'{mesh_data["name"]} has UV attributes {uv_keys}')
        uv = gltf['accessors'][attrs['TEXCOORD_0']]
        view = gltf['bufferViews'][uv['bufferView']]
        start = view.get('byteOffset', 0) + uv.get('byteOffset', 0)
        stride = view.get('byteStride', 8)
        values = [struct.unpack_from('<ff', binary, start + index * stride) for index in range(uv['count'])]
        span = max(max(pair[axis] for pair in values) - min(pair[axis] for pair in values) for axis in range(2))
        if span < .01:
            raise RuntimeError(f'{mesh_data["name"]} UVs have no range')
        uv_ranges.append(span)
        if 'indices' in primitive:
            triangle_count += gltf['accessors'][primitive['indices']]['count'] // 3
for material in gltf.get('materials', []):
    if material.get('pbrMetallicRoughness', {}).get('metallicFactor', 0) > .3:
        raise RuntimeError(f'Material {material["name"]} exceeds metallic .3')
if triangle_count > 25000 or glb.stat().st_size > 8 * 1024 * 1024:
    raise RuntimeError(f'Budget exceeded: {triangle_count} triangles, {glb.stat().st_size} bytes')
for name, radius, *_ in wheel_specs:
    node = nodes['rattler wheel ' + name]
    primitive = gltf['meshes'][node['mesh']]['primitives'][0]
    bounds = gltf['accessors'][primitive['attributes']['POSITION']]
    diameter = bounds['max'][1] - bounds['min'][1]
    if abs(diameter - 2 * radius) > .015:
        raise RuntimeError(f'{name} exported wheel diameter {diameter:.4f} m, expected {2 * radius:.2f}')
if 'rattler' not in nodes:
    raise RuntimeError('GLB lost its rattler root node')
print(f'GLB readback: {triangle_count} triangles, {glb.stat().st_size} bytes, {len(uv_ranges)} UV0 primitives')

# Every review image comes from a fresh scene containing only this exported GLB.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 900
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('flat neutral overcast')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.30, .30, .30, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(glb))
imported = [obj for obj in bpy.data.objects if obj not in before]
car_meshes = [obj for obj in imported if obj.type == 'MESH']
if not car_meshes:
    raise RuntimeError('Fresh-scene import contained no car meshes')
for obj in car_meshes:
    obj.name = 'GLB ' + obj.name
body_bounds = [obj.matrix_world @ Vector(corner) for obj in car_meshes for corner in obj.bound_box]
min_z = min(point.z for point in body_bounds)
height_z = max(point.z for point in body_bounds) - min_z
width_x = max(point.x for point in body_bounds) - min(point.x for point in body_bounds)
length_y = max(point.y for point in body_bounds) - min(point.y for point in body_bounds)
if height_z < 1.9 or height_z > 2.2 or length_y < 4.3 or width_x < 1.8:
    raise RuntimeError(f'Imported GLB axes or envelope are wrong: Blender extents X/Y/Z={width_x:.3f}/{length_y:.3f}/{height_z:.3f}')

floor_mat = bpy.data.materials.new('plain mid-grey floor')
floor_mat.use_nodes = True
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.34, .34, .34, 1)
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.015))
bpy.context.object.name = 'review floor'; bpy.context.object.data.materials.append(floor_mat)
bpy.ops.object.light_add(type='AREA', location=(-2, -1, 7))
light = bpy.context.object; light.name = 'single even studio light'; light.data.energy = 850; light.data.shape = 'DISK'; light.data.size = 9
light.rotation_euler = (Vector((0, 0, .7)) - light.location).to_track_quat('-Z', 'Y').to_euler()
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera); scene.camera = camera
def aim(eye, target, scale, name, size=(900, 640)):
    camera.location = eye
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'; camera.data.ortho_scale = scale
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = str(render_dir / (name + '.png'))
    bpy.ops.render.render(write_still=True)

# Blender imports the glTF Y-up asset upright as Z-up; no corrective root
# rotation is applied. These matched projections use +Z as the vehicle front.
aim((-12, 0, 1.12), (0, 0, .95), 5.1, 'photo-side')
aim((0, -9, 1.12), (0, 0, .98), 2.9, 'photo-front', (700, 700))
aim((0, 9, 1.12), (0, 0, .98), 2.9, 'photo-rear', (700, 700))
aim((0, 0, 10), (0, 0, .95), 5.1, 'photo-top')
aim((5.8, -7.3, 3.1), (0, 0, .95), 5.5, 'front-three-quarter')
aim((5.8, 7.3, 3.1), (0, 0, .95), 5.5, 'rear-three-quarter')

# The scale figure is review-only and imported after the five pure car views.
person_before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(root / 'public/assets/models/wasteland/crew/cinder.glb'))
person_parts = [obj for obj in bpy.data.objects if obj not in person_before]
person_meshes = [obj for obj in person_parts if obj.type == 'MESH']
person_points = [obj.matrix_world @ Vector(corner) for obj in person_meshes for corner in obj.bound_box]
person_min_z = min(point.z for point in person_points)
person_height = max(point.z for point in person_points) - person_min_z
person = bpy.data.objects.new('review-only 1.72 m person', None); scene.collection.objects.link(person)
person.scale = (1.72 / person_height,) * 3
person.location = (-1.75, 0, -person_min_z * person.scale.x)
for obj in person_parts:
    obj.parent = person
aim((5.8, -7.3, 3.1), (-.45, 0, .95), 6.0, 'beside-person')

(render_dir / 'manifest.json').write_text(json.dumps({
    'id': 'rattler', 'dimensions_m': {'width': round(width_x, 3), 'length': round(length_y, 3), 'height': round(height_z, 3)},
    'wheel_radius_m': {'front': .45, 'rear': .54}, 'triangles': triangle_count, 'bytes': glb.stat().st_size,
    'sockets': sorted(socket_locations), 'wheels': sorted(wheel_nodes), 'readback': 'GLB nodes, UV0 and wheel POSITION bounds checked',
}, indent=2) + '\n')
print('Clean-scene GLB renders: photo-side, photo-front, photo-rear, photo-top, front-three-quarter, rear-three-quarter, beside-person')
