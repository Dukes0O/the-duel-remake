"""Build the first measured vehicle in the second Wasteland town-truck family.

This first art round is the dozer. The card's other three vehicles follow only
after this photo-carved shape is judged. Every render is made from the exported
GLB imported into an empty scene. Coordinates are metres, +Y up, front -Z.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--export-only', action='store_true')
parser.add_argument('--candidate-suffix', default='')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
if args.candidate_suffix and (not args.candidate_suffix.startswith('-') or
        any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            for c in args.candidate_suffix)):
    parser.error('--candidate-suffix must start with a hyphen and contain only letters, digits and hyphens')
output = (root / '.qa-dist/art-candidates' / f'town-trucks-2{args.candidate_suffix}.glb'
          if args.export_only else root / 'public/assets/models/wasteland/town/trucks-2.glb')
blend = root / 'art-build/town-trucks-2.blend'
evidence = root / '.evidence/2026-11-06/TOWN-ART-TRUCKS-2/round-1'
textures = root / 'public/assets/models/wasteland/town/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(output)], 'evidence': [str(evidence)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Photo, Mesh as PhotoMesh, lathe
from hull_model import View, occupancy, largest_part, carve_hull

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1000
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('bright overcast light')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.82, .82, .80, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .8

side_photo = Photo(textures / 'town-trucks-2-dozer-side.jpg')
front_photo = Photo(textures / 'town-trucks-2-dozer-front.jpg')
rear_photo = Photo(textures / 'town-trucks-2-dozer-rear.jpg')
top_photo = Photo(textures / 'town-trucks-2-dozer-overhead.jpg')
SW, SH = side_photo.w, side_photo.h
FW, FH = front_photo.w, front_photo.h
RW, RH = rear_photo.w, rear_photo.h
TW, TH = top_photo.w, top_photo.h

# Measured from the four orthographic panels. The side silhouette covers
# 5.8 m end to end. The overhead body is 2.8 m wide; tire radius is 0.72 m.
LENGTH, WIDTH, HEIGHT = 5.8, 2.8, 3.25
Z0, SIDE_LEFT, SIDE_RIGHT = -2.9, 15, 750
SIDE_GROUND, SIDE_ROOF = 378, 21
SZ = LENGTH / (SIDE_RIGHT - SIDE_LEFT)
SY = HEIGHT / (SIDE_GROUND - SIDE_ROOF)
TOP_LEFT, TOP_RIGHT = 93, 879
TOP_CX, TOP_FRONT, TOP_REAR = 263, 67, 461
TX = WIDTH / (TOP_REAR - TOP_FRONT)
TZ = LENGTH / (TOP_RIGHT - TOP_LEFT)
FRONT_CX, FRONT_GROUND = 318, 470
FRONT_BLADE_LEFT, FRONT_BLADE_RIGHT = 17, 624
FRONT_BLADE_TOP = 265
FX = 3.05 / (FRONT_BLADE_RIGHT - FRONT_BLADE_LEFT)
FY = 1.24 / (FRONT_GROUND - FRONT_BLADE_TOP)
REAR_CX, REAR_GROUND = 304, 490
RX = WIDTH / 425
RY = HEIGHT / 460

def side_pick(x, y, z):
    return SIDE_LEFT + (z - Z0) / SZ, SIDE_GROUND - y / SY

def front_pick(x, y, z):
    return FRONT_CX - x / FX, FRONT_GROUND - y / FY

def rear_pick(x, y, z):
    return REAR_CX + x / RX, REAR_GROUND - y / RY

def top_pick(x, y, z):
    return TOP_LEFT + (z - Z0) / TZ, TOP_CX + x / TX

def trim_side(mask):
    mask = mask.copy()
    mask[SIDE_GROUND:, :] = False
    # The blade and lift hardware are real separate parts, not a photograph
    # baked into a solid silhouette. Keep the photo-carved cab and chassis.
    mask[:, :220] = False
    return mask

def trim_end(ground):
    def trim(mask):
        mask = mask.copy()
        mask[ground:, :] = False
        return mask
    return trim

side_seeds = [(5, 5), (SW - 6, 5), (5, SH - 6), (SW - 6, SH - 6)]
front_seeds = [(5, 5), (FW - 6, 5), (5, FH - 6), (FW - 6, FH - 6)]
rear_seeds = [(5, 5), (RW - 6, 5), (5, RH - 6), (RW - 6, RH - 6)]
top_seeds = [(5, 5), (TW - 6, 5), (5, TH - 6), (TW - 6, TH - 6)]
side = View('side', side_photo, side_seeds, side_pick, (-1, 0, 0), trim_side, grey=30, tolerance=26)
far_side = View('side', side_photo, [(5, 5)], side_pick, (1, 0, 0), trim_side, grey=30, tolerance=26)
far_side.mask = side.mask
front = View('front', front_photo, front_seeds, front_pick, (0, 0, -1), trim_end(FRONT_GROUND), grey=30, tolerance=26)
rear = View('rear', rear_photo, rear_seeds, rear_pick, (0, 0, 1), trim_end(REAR_GROUND), grey=30, tolerance=26)
overhead = View('overhead', top_photo, top_seeds, top_pick, (0, 1, 0), grey=30, tolerance=26)

WHEEL_R = .72
WHEEL_Z = (-.77, 1.54)
TRACK_X = 1.06
TYRE_HALF = .24
WHEEL_PX = ((286, 296), (574, 296))
CHASSIS_Y = .62

def clear_of_wheels(x, y, z):
    keep = (y >= CHASSIS_Y) & (z >= -1.10)
    outside = np.abs(x) > TRACK_X - TYRE_HALF - .04
    for axle in WHEEL_Z:
        keep &= ~(outside & ((z - axle) ** 2 + (y - WHEEL_R) ** 2 < (WHEEL_R + .06) ** 2))
    return keep

body_views = [side, far_side, front, rear, overhead]
solid, xs, ys, zs = occupancy(((-1.42, 1.42), (0, HEIGHT), (-1.18, 2.93)), .035,
                              [side.covers, overhead.covers,
                               lambda x, y, z: front.covers(x, y, z) | rear.covers(x, y, z)],
                              clear_of_wheels)
solid = largest_part(solid)

def body_only(view, photo, seeds):
    return view.mask & ~photo.sky(seeds, tolerance=55, grey=32)

side_photo.bleed(body_only(side, side_photo, side_seeds))
front_photo.bleed(body_only(front, front_photo, front_seeds))
rear_photo.bleed(body_only(rear, rear_photo, rear_seeds))
top_photo.bleed(body_only(overhead, top_photo, top_seeds))
photo_materials = {'side': side_photo.material(), 'front': front_photo.material(),
                   'rear': rear_photo.material(), 'overhead': top_photo.material()}

def solid_material(name, color, roughness=.86, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = min(.3, metallic)
    return mat

rubber = solid_material('Dozer / dusty black rubber', (.045, .047, .043), .96)
lug_rubber = solid_material('Dozer / worn tread rubber', (.070, .072, .065), .98)
iron = solid_material('Dozer / dark welded iron', (.105, .094, .075), .9, .24)
bare_steel = solid_material('Dozer / rubbed cutting steel', (.36, .34, .29), .76, .28)

def game_vector(point):
    return Vector((point[0], -point[2], point[1]))

def pivot(name, world):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = game_vector(world)
    return obj

def world_of(obj):
    total = Vector((0, 0, 0))
    while obj:
        total += obj.location
        obj = obj.parent
    return total

def attach(obj, parent, point=(0, 0, 0)):
    obj.parent = parent
    obj.matrix_parent_inverse.identity()
    obj.location = game_vector(point) - world_of(parent)

def cube(name, center, size, material, bevel=.02):
    obj = town.cube(name, center, size, material, bevel)
    return obj

def beam(name, a, b, size, material):
    a3, b3 = game_vector(a), game_vector(b)
    d = b3 - a3
    if isinstance(size, (int, float)):
        size = (size, size)
    obj = cube(name, tuple((a[i] + b[i]) * .5 for i in range(3)),
               (size[0], d.length, size[1]), material, min(.018, size[0] * .08))
    obj.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return obj

family = pivot('town-trucks-2', (0, 0, 0))
dozer = pivot('dozer', (0, 0, 0))
attach(dozer, family)
body = carve_hull('dozer:body', body_views, photo_materials, solid, xs, ys, zs, .035, 4200)
attach(body, dozer)

# A curved, rolled steel blade is measured from the dedicated front photograph.
# It is its own movable part, with real depth and ribs welded across the back.
BLADE_CENTER = (0, .60, -1.95)
blade_root = pivot('dozer:blade', (0, 0, 0))
attach(blade_root, dozer, BLADE_CENTER)
blade_mesh = bpy.data.meshes.new('dozer curved blade shell')
blade_verts, surface_faces, blade_uvs = [], [], []
segments, levels = 18, 5
for row in range(levels):
    t = row / (levels - 1)
    for i in range(segments + 1):
        u = i / segments
        x = (u - .5) * 3.05
        end_sweep = abs(u - .5) * 2
        y = (t - .5) * 1.20
        z = -.22 - .65 * (1 - t) - .22 * (1 - end_sweep) + .10 * end_sweep
        blade_verts.append((x, -z, y))
        # Photo measured from the front panel; curved tip pixels are avoided.
        px = 318 - x / FX
        py = 470 - (y + .60) / FY
        blade_uvs.append((px / FW, 1 - py / FH))
for row in range(levels - 1):
    for i in range(segments):
        a = row * (segments + 1) + i
        surface_faces.append((a, a + 1, a + segments + 2, a + segments + 1))
front_vertex_count = len(blade_verts)
back_verts = [(x, y - .08, z) for x, y, z in blade_verts]
blade_verts.extend(back_verts)
blade_uvs.extend(blade_uvs.copy())
blade_faces = list(surface_faces)
blade_faces.extend(tuple(index + front_vertex_count for index in reversed(face)) for face in surface_faces)
for i in range(segments):
    blade_faces.append((i, i+1, front_vertex_count+i+1, front_vertex_count+i))
    top = (levels-1)*(segments+1)+i
    blade_faces.append((top, front_vertex_count+top, front_vertex_count+top+1, top+1))
for row in range(levels-1):
    left = row*(segments+1)
    right = left+segments
    blade_faces.append((left, front_vertex_count+left, front_vertex_count+left+segments+1, left+segments+1))
    blade_faces.append((right, right+1, front_vertex_count+right+1, front_vertex_count+right))
blade_mesh.from_pydata(blade_verts, [], blade_faces)
blade_mesh.materials.append(front_photo.material())
blade_mesh.update()
uv = blade_mesh.uv_layers.new(name='UVMap')
for polygon in blade_mesh.polygons:
    polygon.use_smooth = True
    for loop_index in polygon.loop_indices:
        uv.data[loop_index].uv = blade_uvs[blade_mesh.loops[loop_index].vertex_index]
blade = bpy.data.objects.new('dozer:blade:curved-welded-face', blade_mesh)
bpy.context.collection.objects.link(blade)
attach(blade, blade_root, BLADE_CENTER)

def parent_at(obj, parent, point):
    attach(obj, parent, point)

# Reinforced back ribs, top roll and replaceable cutting edge. Each is a real
# thick member joined to the blade root, not a painted stripe.
for index, x in enumerate((-1.30, -.78, -.25, .25, .78, 1.30)):
    rib_center = (x, (.10 + 1.17) * .5, (-2.70 - 2.08) * .5)
    beam_obj = beam(f'dozer:blade:rear-rib-{index+1}',
                    (x, .10, -2.70), (x, 1.17, -2.08), .095, iron)
    parent_at(beam_obj, blade_root, rib_center)
edge = beam('dozer:blade:bolted-cutting-edge', (-1.57, .07, -2.84),
            (1.57, .07, -2.84), .13, bare_steel)
parent_at(edge, blade_root, (0, .07, -2.84))
for x in (-1.34, -1.02, -.68, -.34, 0, .34, .68, 1.02, 1.34):
    # A low-poly rounded bolt face sits proud of the steel lip.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=4, radius=.035,
                                         location=game_vector((x, .13, -2.91)))
    bolt = bpy.context.object
    bolt.name = 'dozer:blade:cutting-edge-bolt'
    bolt.scale = (1, .7, .55)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bolt.data.materials.append(iron)
    parent_at(bolt, blade_root, (x, .13, -2.91))

# Two heavy lift arms and hydraulic rams connect the chassis to the blade.
for side_sign, label in ((-1, 'left'), (1, 'right')):
    x = side_sign * .96
    a = beam(f'dozer:loader-arm-{label}', (x, .92, -1.14), (x, 1.05, -2.28), .20, iron)
    attach(a, dozer, (x, ( .92 + 1.05) * .5, (-1.14 - 2.28) * .5))
    shoulder = bpy.data.objects.new(f'dozer:loader-arm-pivot-{label}', bpy.data.meshes.new('shoulder'))
    bpy.context.collection.objects.link(shoulder)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.16,
                                         location=game_vector((x, 1.02, -1.14)))
    shoulder = bpy.context.object
    shoulder.name = f'dozer:loader-arm-pivot-{label}'
    shoulder.data.materials.append(iron)
    attach(shoulder, dozer, (x, 1.02, -1.14))
    cyl = beam(f'dozer:blade-hydraulic-cylinder-{label}', (side_sign*.78, 1.02, -1.14),
               (side_sign*.78, 1.12, -2.16), .115, iron)
    attach(cyl, dozer, (side_sign*.78, (1.02+1.12)*.5, (-1.14-2.16)*.5))
    ram = beam(f'dozer:blade-hydraulic-rod-{label}', (side_sign*.78, 1.12, -1.75),
               (side_sign*.78, 1.17, -2.30), .048, bare_steel)
    attach(ram, dozer, (side_sign*.78, (1.12+1.17)*.5, (-1.75-2.30)*.5))

# Chassis crossmembers and a deep belly pan make the machine read as heavy.
for z in (-1.02, .02, 1.20, 2.52):
    cross = beam(f'dozer:chassis-crossmember-{z:+.2f}', (-.98, .66, z),
                 (.98, .66, z), .12, iron)
    attach(cross, dozer, (0, .66, z))
belly = cube('dozer:belly-plate', (0, .58, .76), (1.88, .16, 2.55), iron, .03)
attach(belly, dozer, (0, .58, .76))
for side_sign, label in ((-1, 'left'), (1, 'right')):
    for step in range(3):
        y = .52 + step * .22
        foot = cube(f'dozer:cab-step-{label}-{step+1}', (side_sign*1.09, y, .25),
                    (.18, .055, .47), iron, .01)
        attach(foot, dozer, (side_sign*1.09, y, .25))

# Four grounded wheels use a photo-measured 720 mm radius. The sidewall photo
# follows the real circumference; raised chevrons give the tire actual relief.
def make_tread_blocks(name, width, radius, count=28, across=2):
    verts, faces = [], []
    arc_step = 2 * math.pi / count
    for i in range(count):
        for band in range(across):
            a = i * arc_step + (band - (across-1)/2) * .045
            radial = Vector((0, math.cos(a), math.sin(a)))
            tangent = Vector((0, -math.sin(a), math.cos(a)))
            center = radial * (radius + .005)
            half_width = width / (across*2) - .008
            half_length = radius * arc_step * .44
            half_height = .068
            # Small alternating skew across the tread forms a joined chevron.
            skew = (band - (across-1)/2) * .022
            base = len(verts)
            for sx, st, sr in ((-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                               (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)):
                p = center + Vector((sx * half_width, 0, 0)) + tangent * (st * half_length + skew) + radial * (sr * half_height)
                verts.append(tuple(p))
            faces.extend(tuple(base + k for k in face) for face in
                         ((0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(lug_rubber)
    mesh.update()
    uv = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            angle = (math.atan2(vertex.z, vertex.y) / (2 * math.pi)) % 1.0
            uv.data[loop_index].uv = (vertex.x / width + .5, angle)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj

def wheel_uv(px, py, radius_px):
    return lambda angle, factor: side_photo.uv(px + math.cos(angle) * radius_px * factor * .88,
                                                py - math.sin(angle) * radius_px * factor * .88)

wheel_x_px = (286, 574)
wheel_r_px = 83
for axle_name, axle, px in (('front', WHEEL_Z[0], wheel_x_px[0]), ('rear', WHEEL_Z[1], wheel_x_px[1])):
    for side_sign, side_name in ((-1, 'left'), (1, 'right')):
        suffix = f'{axle_name}-{side_name}'
        center = (side_sign * TRACK_X, WHEEL_R, axle)
        steer = pivot(f'dozer:steer-{suffix}', (0, 0, 0)) if axle_name == 'front' else None
        if steer:
            attach(steer, dozer, center)
        spin = pivot(f'dozer:spin-{suffix}', (0, 0, 0))
        attach(spin, steer or dozer, center)
        wheel_mesh = PhotoMesh()
        tread_uv = lambda index, distance, radius, angle: side_photo.uv(
            px + math.cos(angle) * wheel_r_px * .94, SIDE_GROUND - (wheel_r_px + distance / SY))
        lathe(wheel_mesh, 'rubber', (0,0,0), (1,0,0), (0,0,1), (0,1,0),
              [(-TYRE_HALF, WHEEL_R*.86), (-TYRE_HALF*.82, WHEEL_R),
               (TYRE_HALF*.82, WHEEL_R), (TYRE_HALF, WHEEL_R*.86)], tread_uv, sides=32)
        face_uv = wheel_uv(px, 296, wheel_r_px)
        for face_sign in (-1, 1):
            outer, inner = face_sign * (TYRE_HALF+.002), face_sign * TYRE_HALF*.81
            lathe(wheel_mesh, 'side', (0,0,0), (1,0,0), (0,0,1), (0,1,0),
                  [(outer, WHEEL_R*.98), (inner, WHEEL_R*.98)],
                  lambda i,d,r,a: face_uv(a, r/WHEEL_R), sides=32,
                  cap_start=('side', lambda a,f: face_uv(a, f*.96)))
        wheel = wheel_mesh.finish(f'dozer:wheel-{suffix}', {'rubber': rubber, 'side': side_photo.material()})
        attach(wheel, spin, center)
        blocks = make_tread_blocks(f'dozer:tread-{suffix}', TYRE_HALF*2, WHEEL_R)
        attach(blocks, spin, center)

        # A recessed hub and six bolts read as heavy wheel hardware.
        for face_sign in (-1, 1):
            depth = face_sign * (TYRE_HALF + .012)
            hub = PhotoMesh()
            lathe(hub, 'side', (0,0,0), (1,0,0), (0,0,1), (0,1,0),
                  [(depth, .30), (depth - face_sign*.045, .26),
                   (depth - face_sign*.05, .16)],
                  lambda i,d,r,a: face_uv(a, r/WHEEL_R), sides=24,
                  cap_end=('side', lambda a,f: face_uv(a, f*.26)))
            obj = hub.finish(f'dozer:hub-{suffix}', {'side': side_photo.material()})
            attach(obj, spin, center)

def export_glb(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', export_yup=True,
        export_apply=True, export_materials='EXPORT', export_image_format='JPEG', export_image_quality=80)

town.export_glb = export_glb
bpy.context.view_layer.objects.active = dozer
dozer.select_set(True)
blend.parent.mkdir(parents=True, exist_ok=True)
evidence.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(output)

# The review picture is intentionally from the GLB, not the authoring scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(output))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1100
scene.render.resolution_y = 720
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('overcast review')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.84,.84,.83,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .8
sun = bpy.data.objects.new('overcast sun', bpy.data.lights.new('overcast sun', 'SUN'))
scene.collection.objects.link(sun)
sun.data.energy = 1.1
sun.rotation_euler = (math.radians(35), 0, math.radians(20))
bpy.ops.mesh.primitive_plane_add(size=60, location=(0,0,-.03))
ground = bpy.context.object
ground.name = 'matte midtone ground'
mat = bpy.data.materials.new('matte midtone ground')
mat.diffuse_color = (.41,.40,.37,1); mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.41,.40,.37,1)
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
ground.data.materials.append(mat)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera)
scene.camera = camera

def shot(name, eye, target, ortho, size=(1100,720)):
    scene.render.resolution_x, scene.render.resolution_y = size
    camera.location = game_vector(eye)
    camera.rotation_euler = (game_vector(target) - camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = ortho
    scene.render.filepath = str(evidence / f'{name}.png')
    bpy.ops.render.render(write_still=True)

shot('side', (11,1.65,0), (0,1.65,0), 7.4, (1200,700))
shot('front', (0,1.65,-12), (0,1.65,-.1), 4.3, (820,820))
shot('rear', (0,1.65,12), (0,1.65,.1), 4.3, (820,820))
shot('mayor-overhead', (8,9,-8), (0,1.2,0), 10.0, (1200,780))
shot('overhead-topdown', (0,14,0), (0,0,0), 6.8, (1100,800))
shot('driver-height', (8,2.1,-9), (0,1.4,-.2), 8.0, (1200,780))

def object_triangles(obj):
    if obj.type != 'MESH':
        return 0
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)

print('DUEL_TOWN_TRUCKS_2=' + json.dumps({
    'glb': str(output), 'bytes': output.stat().st_size,
    'triangles': {obj.name: object_triangles(obj) for obj in bpy.data.objects if obj.type == 'MESH'},
    'evidence': str(evidence), 'dimensions': [WIDTH, LENGTH, HEIGHT],
}))
