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
from photo_model import Mesh, Photo, lathe
from hull_model import View, occupancy, largest_part, carve_hull

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)
photos = {name: Photo(textures / f'rattler-{name}.jpg') for name in ('side', 'front', 'rear', 'top')}
side, front, rear, top = (photos[name] for name in ('side', 'front', 'rear', 'top'))
materials = {name: photo.material(.92) for name, photo in photos.items()}

# Measured on the photos, in pixels. Forward is +Z on a car.
LENGTH = 4.52
S = LENGTH / (1728 - 41)          # side: nose to tail
SIDE_NOSE, SIDE_GROUND = 41, 793
FRONT_S = (793 - 126) * S / (1153 - 98)   # the cab roof is the same height in every photo
FRONT_CX, FRONT_GROUND = 660, 1153
REAR_S = (793 - 126) * S / (1091 - 128)
REAR_CX, REAR_GROUND = 699.5, 1091
TOP_XS, TOP_CX = .00337, 510
TOP_ZS, TOP_NOSE = LENGTH / (1496 - 21), 21
FRONT_AXLE = LENGTH / 2 - (207 - SIDE_NOSE) * S
REAR_AXLE = LENGTH / 2 - (1501 - SIDE_NOSE) * S
FRONT_R, REAR_R = 142 * S, 190 * S
FRONT_X, FRONT_W = 487 * FRONT_S, 149 * FRONT_S
REAR_X, REAR_W = 530 * REAR_S, 255 * REAR_S
FRAME_Y = (SIDE_GROUND - 695) * S
BODY_X = .80

def side_pick(x, y, z):
    return SIDE_NOSE + (LENGTH / 2 - z) / S, SIDE_GROUND - y / S
def front_pick(x, y, z):
    return FRONT_CX + x / FRONT_S, FRONT_GROUND - y / FRONT_S
def rear_pick(x, y, z):
    return REAR_CX - x / REAR_S, REAR_GROUND - y / REAR_S
def top_pick(x, y, z):
    return TOP_CX - x / TOP_XS, TOP_NOSE + (LENGTH / 2 - z) / TOP_ZS

def frame_seeds(photo):
    """The grey studio shades across the frame, so sample it all the way round."""
    seeds = [(8, 8), (photo.w - 8, 8), (8, photo.h - 8), (photo.w - 8, photo.h - 8)]
    seeds.extend((x, 8) for x in range(80, photo.w - 8, 120))
    seeds.extend((x, photo.h - 9) for x in range(80, photo.w - 8, 120))
    seeds.extend((8, y) for y in range(80, photo.h - 8, 120))
    seeds.extend((photo.w - 9, y) for y in range(80, photo.h - 8, 120))
    return seeds
def lift(photo):
    # The studio is darker than a pale sky. Only the measuring copy is lifted.
    photo.rgb()
    photo._rgb = np.clip(photo._rgb + 25, 0, 255).astype(np.int16)
for photo in photos.values():
    lift(photo)
def above_ground(ground):
    def trim(mask):
        mask = mask.copy()
        mask[ground:, :] = False
        return mask
    return trim

side_a = View('side', side, frame_seeds(side), side_pick, (1, 0, 0), above_ground(SIDE_GROUND), grey=26, tolerance=40)
side_b = View('side', side, [(8, 8)], side_pick, (-1, 0, 0), None, grey=26, tolerance=40)
side_b.mask = side_a.mask
front_v = View('front', front, frame_seeds(front), front_pick, (0, 0, 1), above_ground(FRONT_GROUND), grey=26, tolerance=40)
rear_v = View('rear', rear, frame_seeds(rear), rear_pick, (0, 0, -1), above_ground(REAR_GROUND), grey=26, tolerance=40)
top_v = View('top', top, frame_seeds(top), top_pick, (0, 1, 0), None, grey=30, tolerance=45)

def ends_allow(x, y, z):
    return front_v.covers(x, y, z) | rear_v.covers(x, y, z)
BED_Z0, BED_Z1 = LENGTH / 2 - (1720 - SIDE_NOSE) * S, LENGTH / 2 - (1160 - SIDE_NOSE) * S
BED_FLOOR = (SIDE_GROUND - 395) * S
def clear(x, y, z):
    keep = y >= FRAME_Y
    for axle, radius, track, width in ((FRONT_AXLE, FRONT_R, FRONT_X, FRONT_W), (REAR_AXLE, REAR_R, REAR_X, REAR_W)):
        outer = np.abs(x) > track - width / 2 - .03
        keep &= ~(outer & ((z - axle) ** 2 + (y - radius) ** 2 < (radius + .04) ** 2))
    # Outside the body only a wing stands, close over its own wheel. The overhead photo's
    # tyres reach a little further than the side photo's, and would leave a loose panel.
    wing = np.zeros(x.shape, dtype=bool)
    for axle, radius, track, width in ((FRONT_AXLE, FRONT_R, FRONT_X, FRONT_W), (REAR_AXLE, REAR_R, REAR_X, REAR_W)):
        wing |= (z - axle) ** 2 + (y - radius) ** 2 < (radius + .24) ** 2
    keep &= (np.abs(x) < BODY_X) | wing
    # The bed is open: its floor sits below the rails.
    keep &= ~((np.abs(x) < .60) & (z > BED_Z0) & (z < BED_Z1) & (y > BED_FLOOR))
    return keep

VOXEL = .018
solid, xs, ys, zs = occupancy(((-1.24, 1.24), (0, 2.1), (-LENGTH / 2 - .03, LENGTH / 2 + .03)),
                              VOXEL, [side_a.covers, top_v.covers, ends_allow], clear)
solid = largest_part(solid)

# The pale studio seen through the cab is painted as dark glass.
def dark_glass(photo, rect, factor):
    x0, y0, x1, y1 = rect
    pixels = np.empty(photo.image_w * photo.image_h * 4, dtype=np.float32)
    photo.image.pixels.foreach_get(pixels)
    array = pixels.reshape(photo.image_h, photo.image_w, 4)
    part = array[photo.image_h - y1:photo.image_h - y0, x0:x1, :3]
    pale = part.mean(axis=2) > .30
    part[pale] *= factor
    photo.image.pixels.foreach_set(array.ravel())
    photo.image.update()
    photo.image.pack()
dark_glass(side, (762, 215, 1036, 345), .22)
dark_glass(front, (340, 205, 976, 386), .34)
dark_glass(rear, (502, 222, 896, 340), .30)

# The studio's own colour must not show on an edge.
def body_only(view, photo, tolerance):
    return view.mask & ~photo.sky(frame_seeds(photo), tolerance=tolerance, grey=34)
bleeds = [(side, body_only(side_a, side, 60)), (front, body_only(front_v, front, 60)),
          (rear, body_only(rear_v, rear, 60)), (top, body_only(top_v, top, 60))]
for photo, mask in bleeds:
    photo.bleed(mask)

vehicle = bpy.data.objects.new('rattler', None)
bpy.context.collection.objects.link(vehicle)
vehicle['vehicle_id'] = 'rattler'
vehicle['units'] = 'metres'
vehicle['forward'] = '+Z'
vehicle['up'] = '+Y'

body = carve_hull('rattler body', [side_a, side_b, front_v, rear_v, top_v], materials, solid, xs, ys, zs, VOXEL, 19000)
body.parent = vehicle

def disc(cx, cy, radius_px):
    return lambda angle, fraction: side.uv(cx + math.cos(angle) * fraction * radius_px * .93,
                                           cy - math.sin(angle) * fraction * radius_px * .93)
def tread(cx, cy, radius_px):
    return lambda index, distance, radius, angle: side.uv(cx + math.cos(angle) * radius_px * .95,
                                                          cy - math.sin(angle) * radius_px * .95)
def head_on(photo, scale, cx, half, py0, py1):
    # A tyre's tread as the end photo shows it, running back and forth round the wheel.
    def uv(index, distance, radius, angle):
        wave = abs(((angle * 8 / (2 * math.pi)) % 2) - 1)
        return photo.uv(cx + max(-half, min(half, distance / scale)), py0 + (py1 - py0) * wave)
    return uv
wheel_specs = (
    ('front-left', FRONT_R, FRONT_AXLE, FRONT_X, FRONT_W, 207, 652, 142, 'front', head_on(front, FRONT_S, 172, 66, 960, 1130)),
    ('front-right', FRONT_R, FRONT_AXLE, -FRONT_X, FRONT_W, 207, 652, 142, 'front', head_on(front, FRONT_S, 172, 66, 960, 1130)),
    ('rear-left', REAR_R, REAR_AXLE, REAR_X, REAR_W, 1501, 599, 190, 'rear', head_on(rear, REAR_S, 170, 118, 860, 1075)),
    ('rear-right', REAR_R, REAR_AXLE, -REAR_X, REAR_W, 1501, 599, 190, 'rear', head_on(rear, REAR_S, 170, 118, 860, 1075)),
)
wheel_nodes = {}
for name, radius, z, x, width, px, py, radius_px, tread_view, tread_uv in wheel_specs:
    wheel = Mesh()
    face = disc(px, py, radius_px)
    lathe(wheel, tread_view, (x, radius, z), (1, 0, 0), (0, 0, 1), (0, 1, 0),
          [(-width / 2, radius * .975), (-width * .44, radius), (width * .44, radius), (width / 2, radius * .975)],
          tread_uv, sides=36,
          cap_start=('side', lambda a, f, face=face: face(a, f * 1.03)),
          cap_end=('side', lambda a, f, face=face: face(a, f * 1.03)))
    wheel_obj = wheel.finish('rattler wheel ' + name, {'side': materials['side'], tread_view: materials[tread_view]})
    wheel_obj.parent = vehicle
    wheel_nodes[name] = wheel_obj

# Axles join the wheels under the frame.
axles = Mesh()
for z, radius, track in ((FRONT_AXLE, FRONT_R, FRONT_X), (REAR_AXLE, REAR_R, REAR_X)):
    lathe(axles, 'side', (0, radius, z), (1, 0, 0), (0, 0, 1), (0, 1, 0), [(-track, .05), (track, .05)],
          tread(700, 690, 18), sides=10)
axles.finish('rattler axles', {'side': materials['side']}).parent = vehicle

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
    # A wheel has one primitive for its tread and one for its faces: measure both.
    parts = [gltf['accessors'][primitive['attributes']['POSITION']] for primitive in gltf['meshes'][node['mesh']]['primitives']]
    diameter = max(part['max'][1] for part in parts) - min(part['min'][1] for part in parts)
    if abs(diameter - 2 * radius) > .03:
        raise RuntimeError(f'{name} exported wheel diameter {diameter:.4f} m, expected {2 * radius:.3f}')
if 'rattler' not in nodes:
    raise RuntimeError('GLB lost its rattler root node')
print(f'GLB readback: {triangle_count} triangles, {glb.stat().st_size} bytes, {len(uv_ranges)} UV0 primitives')

# Every review image comes from a fresh scene containing only this exported GLB.
FRONT_R_OUT, REAR_R_OUT = FRONT_R, REAR_R
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
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
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
if height_z < 1.7 or height_z > 2.3 or length_y < 4.3 or width_x < 1.8:
    raise RuntimeError(f'Imported GLB axes or envelope are wrong: Blender extents X/Y/Z={width_x:.3f}/{length_y:.3f}/{height_z:.3f}')

floor_mat = bpy.data.materials.new('plain mid-grey floor')
floor_mat.use_nodes = True
floor_nodes = floor_mat.node_tree.nodes
floor_nodes.clear()
floor_out = floor_nodes.new('ShaderNodeOutputMaterial')
floor_emission = floor_nodes.new('ShaderNodeEmission')
floor_emission.inputs['Color'].default_value = (.42, .41, .39, 1)
floor_mat.node_tree.links.new(floor_emission.outputs['Emission'], floor_out.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=2000, location=(0, 0, -.015))
bpy.context.object.name = 'review floor'; bpy.context.object.data.materials.append(floor_mat)
bpy.ops.object.light_add(type='AREA', location=(-2, -1, 7))
light = bpy.context.object; light.name = 'single even studio light'; light.data.energy = 0; light.data.shape = 'DISK'; light.data.size = 9
light.rotation_euler = (Vector((0, 0, .7)) - light.location).to_track_quat('-Z', 'Y').to_euler()
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera); scene.camera = camera
def aim(eye, target, scale, name, size=(900, 640)):
    camera.location = eye
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'; camera.data.ortho_scale = scale
    camera.data.clip_start = .1; camera.data.clip_end = 5000
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = str(render_dir / (name + '.png'))
    bpy.ops.render.render(write_still=True)

# Blender imports the glTF Y-up asset upright as Z-up; no corrective root
# rotation is applied. These matched projections use +Z as the vehicle front.
aim((12, 0, 1.05), (0, 0, 1.05), 5.2, 'photo-side', (1000, 500))
aim((0, -9, 1.0), (0, 0, 1.0), 2.9, 'photo-front', (700, 700))
aim((0, 9, 1.0), (0, 0, 1.0), 2.9, 'photo-rear', (700, 700))
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
person.location = (1.75, 0, -person_min_z * person.scale.x)
for obj in person_parts:
    obj.parent = person
aim((7.5, -8.0, 3.1), (.45, 0, .95), 6.2, 'beside-person')

(render_dir / 'manifest.json').write_text(json.dumps({
    'id': 'rattler', 'dimensions_m': {'width': round(width_x, 3), 'length': round(length_y, 3), 'height': round(height_z, 3)},
    'wheel_radius_m': {'front': round(FRONT_R_OUT, 3), 'rear': round(REAR_R_OUT, 3)}, 'triangles': triangle_count, 'bytes': glb.stat().st_size,
    'sockets': sorted(socket_locations), 'wheels': sorted(wheel_nodes), 'readback': 'GLB nodes, UV0 and wheel POSITION bounds checked',
}, indent=2) + '\n')
print('Clean-scene GLB renders: photo-side, photo-front, photo-rear, photo-top, front-three-quarter, rear-three-quarter, beside-person')
