"""Build four measured vehicles for the second Wasteland town-truck family.

Every body is carved from measured photo views and reviewed from an imported
GLB. Coordinates are metres, +Y up, front -Z.
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
parser.add_argument('--through', choices=('dozer','ambulance','vane-truck','vane-escort'), default='vane-escort')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
if args.candidate_suffix and (not args.candidate_suffix.startswith('-') or
        any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            for c in args.candidate_suffix)):
    parser.error('--candidate-suffix must start with a hyphen and contain only letters, digits and hyphens')
output = (root / '.qa-dist/art-candidates' / f'town-trucks-2{args.candidate_suffix}.glb'
          if args.export_only else root / 'public/assets/models/wasteland/town/trucks-2.glb')
blend = root / 'art-build/town-trucks-2.blend'
evidence = root / '.evidence/2026-11-07/TOWN-ART-TRUCKS-2/round-3'
textures = root / 'public/assets/models/wasteland/town/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(output)], 'evidence': [str(evidence)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Photo, Mesh as PhotoMesh, lathe
from hull_model import tyre, headlamp
from photo_carve import carve_object

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
FW, FH = front_photo.w, front_photo.h

# Measured from the four orthographic panels. The side silhouette covers
# 5.8 m end to end. The overhead body is 2.8 m wide; tire radius is 0.72 m.
LENGTH, WIDTH, HEIGHT = 5.8, 2.8, 3.25
Z0, SIDE_LEFT, SIDE_RIGHT = -2.9, 15, 750
SIDE_GROUND, SIDE_ROOF = 378, 21
SZ = LENGTH / (SIDE_RIGHT - SIDE_LEFT)
TOP_LEFT, TOP_RIGHT = 43, 741
TOP_CX, TOP_FRONT, TOP_REAR = 220, 56, 385
TZ = LENGTH / (TOP_RIGHT - TOP_LEFT)
FRONT_CX, FRONT_GROUND = 318, 470
FRONT_BLADE_LEFT, FRONT_BLADE_RIGHT = 17, 624
FRONT_BLADE_TOP = 265
FX = 3.05 / (FRONT_BLADE_RIGHT - FRONT_BLADE_LEFT)
FY = 1.24 / (FRONT_GROUND - FRONT_BLADE_TOP)
REAR_CX, REAR_GROUND = 304, 490

SIDE_S = SZ

WHEEL_R = (SIDE_GROUND - 296) * SIDE_S
WHEEL_Z = tuple(Z0 + (px - SIDE_LEFT) * SIDE_S for px in (286, 574))
TRACK_X = (FRONT_CX - 163) * HEIGHT / (FRONT_GROUND - 14)
TYRE_HALF = .20
WHEEL_PX = ((286, 296), (574, 296))
CHASSIS_Y = .62

def solid_material(name, color, roughness=.86, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = min(.3, metallic)
    return mat

lug_rubber = solid_material('Dozer / worn tread rubber', (.070, .072, .065), .98)
iron = solid_material('Dozer / dark welded iron', (.105, .094, .075), .9, .24)
bare_steel = solid_material('Dozer / rubbed cutting steel', (.36, .34, .29), .76, .28)
dozer_yellow = solid_material('Dozer / faded ochre lift arms', (.43, .32, .12), .82, .12)

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

def pipe_join(name, points, radius, material, parent, side_name=''):
    """Photo-measured thick tube members, parented to the named vehicle."""
    for i,(a,b) in enumerate(zip(points,points[1:])):
        va,vb=game_vector(a),game_vector(b); d=vb-va
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=d.length,location=(va+vb)*.5)
        obj=bpy.context.object; obj.name=f'{name}-{i+1}'
        obj.rotation_euler=d.to_track_quat('Z','Y').to_euler(); obj.data.materials.append(material)
        attach(obj,parent,tuple((a[k]+b[k])*.5 for k in range(3)))

family = pivot('town-trucks-2', (0, 0, 0))
dozer = pivot('dozer', (0, 0, 0))
attach(dozer, family)
body = carve_object('dozer:body', textures, {
    'photos': {'side': 'town-trucks-2-dozer-side.jpg',
               'front': 'town-trucks-2-dozer-front.jpg',
               'rear': 'town-trucks-2-dozer-rear.jpg',
               'top': 'town-trucks-2-dozer-overhead.jpg'},
    'length': LENGTH, 'width': WIDTH, 'height': HEIGHT,
    'side': {'start': SIDE_LEFT, 'end': SIDE_RIGHT, 'ground': SIDE_GROUND},
    'front': {'centre': FRONT_CX, 'ground': FRONT_GROUND, 'top': 14},
    'rear': {'centre': REAR_CX, 'ground': REAR_GROUND, 'top': 30},
    'top': {'front': TOP_LEFT, 'rear': TOP_RIGHT, 'centre': TOP_CX,
            'along': 'x', 'x_scale': WIDTH / (TOP_REAR - TOP_FRONT)},
    'underside': CHASSIS_Y,
    'wheels': [(axle, WHEEL_R, TRACK_X - TYRE_HALF) for axle in WHEEL_Z],
    'voxel': .035, 'target': 4200, 'tolerance': 25, 'bleed_tolerance': 25,
    'mask_dir': str(evidence / 'masks'),
})
attach(body, dozer)

# A curved, rolled steel blade is measured from the dedicated front photograph.
# It is its own movable part, with real depth and ribs welded across the back.
BLADE_CENTER = (0, .60, -1.95)
blade_root = pivot('dozer:blade', (0, 0, 0))
attach(blade_root, dozer, BLADE_CENTER)
blade_root.rotation_euler[0] = -.13
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
# They move with the blade and use broad, real sections that match the photo.
for side_sign, label in ((-1, 'left'), (1, 'right')):
    x = side_sign * .96
    a = beam(f'dozer:loader-arm-{label}', (x, .92, -1.14), (x, 1.05, -2.28), (.48, .34), dozer_yellow)
    attach(a, blade_root, (x, (.92 + 1.05) * .5, (-1.14 - 2.28) * .5))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.16,
                                         location=game_vector((x, 1.02, -1.14)))
    shoulder = bpy.context.object
    shoulder.name = f'dozer:loader-arm-pivot-{label}'
    shoulder.data.materials.append(iron)
    attach(shoulder, blade_root, (x, 1.02, -1.14))
    cyl = beam(f'dozer:blade-hydraulic-cylinder-{label}', (side_sign*.78, 1.02, -1.14),
               (side_sign*.78, 1.12, -2.16), .18, iron)
    attach(cyl, blade_root, (side_sign*.78, (1.02+1.12)*.5, (-1.14-2.16)*.5))
    ram = beam(f'dozer:blade-hydraulic-rod-{label}', (side_sign*.78, 1.12, -1.75),
               (side_sign*.78, 1.17, -2.30), .075, bare_steel)
    attach(ram, blade_root, (side_sign*.78, (1.12+1.17)*.5, (-1.75-2.30)*.5))

# The exhaust is a real upright pipe, beside the cab roof as in the source.
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=.075, depth=.88,
                                     location=game_vector((-.78, 2.55, .70)))
exhaust = bpy.context.object
exhaust.name = 'dozer:exhaust-stack'
exhaust.data.materials.append(iron)
exhaust_bevel = exhaust.modifiers.new('rolled exhaust lip', 'BEVEL')
exhaust_bevel.width = .025
exhaust_bevel.segments = 2
attach(exhaust, dozer, (-.78, 2.55, .70))

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
        end_scale = HEIGHT / (FRONT_GROUND - 14)
        tyre(wheel_mesh, 'side', side_photo, px, 296, wheel_r_px, WHEEL_R, TYRE_HALF,
             'front', front_photo, FRONT_CX - TRACK_X / end_scale,
             TYRE_HALF / end_scale * .9, FRONT_GROUND - WHEEL_R / end_scale,
             FRONT_GROUND - WHEEL_R * .08 / end_scale)
        face_uv = wheel_uv(px, 296, wheel_r_px)
        for face_sign in (-1, 1):
            outer, inner = face_sign * (TYRE_HALF+.002), face_sign * TYRE_HALF*.81
            lathe(wheel_mesh, 'side', (0,0,0), (1,0,0), (0,0,1), (0,1,0),
                  [(outer, WHEEL_R*.98), (inner, WHEEL_R*.98)],
                  lambda i,d,r,a: face_uv(a, r/WHEEL_R), sides=32,
                  cap_start=('side', lambda a,f: face_uv(a, f*.96)))
        wheel = wheel_mesh.finish(f'dozer:wheel-{suffix}',
                                  {'side': side_photo.material(), 'front': front_photo.material()})
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

# The cab's measured paired lamps use their own front-facing photo parts.
dozer_lamp_material = solid_material('Dozer / warm headlamp glass', (.9, .72, .34), .3, 0)
dozer_lamp_material.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (.9, .72, .34, 1)
dozer_lamp_material.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1.2
dozer_lamp_group = pivot('dozer:lamp', (0, 0, 0)); attach(dozer_lamp_group, dozer)
dozer_end_scale = HEIGHT / (FRONT_GROUND - 14)
for index, px in enumerate((238, 400)):
    py, radius_px = 163, 12
    lamp_mesh = PhotoMesh()
    headlamp(lamp_mesh, 'front', 'bulb', front_photo, px, py, radius_px,
             radius_px * dozer_end_scale, forward=-1)
    lamp_obj = lamp_mesh.finish(f'dozer:headlamp-{index+1}',
        {'front': front_photo.material(), 'bulb': dozer_lamp_material})
    attach(lamp_obj, dozer_lamp_group,
        ((FRONT_CX - px) * dozer_end_scale, (FRONT_GROUND - py) * dozer_end_scale, -1.12))

def build_photo_van(ident, size, anchors, colour):
    """One measured photo carve plus real wheels and forward-facing lamps."""
    length, width, height = size
    # All values are pixels read from photo_grid overlays. The top photograph
    # lies along image X, which is why the table says along='x'.
    measured = {
        'ambulance': {
            'side': {'start': 38, 'end': 884, 'ground': 477},
            'front': {'centre': 304, 'ground': 480, 'top': 82},
            'rear': {'centre': 354, 'ground': 480, 'top': 80},
            'top': {'front': 35, 'rear': 785, 'centre': 267, 'along': 'x', 'x_scale': width / 354},
            'wheels_px': [(165, 404, 73), (680, 404, 73)],
            'front_wheels': [(180, 455, 22), (433, 455, 22)],
            'lamps': [(180, 300, 20), (403, 300, 20)],
        },
        'vane-truck': {
            'side': {'start': 20, 'end': 609, 'ground': 490},
            'front': {'centre': 312, 'ground': 519, 'top': 105},
            'rear': {'centre': 312, 'ground': 519, 'top': 105},
            'top': {'front': 9, 'rear': 595, 'centre': 312, 'along': 'x', 'x_scale': width / 280},
            'wheels_px': [(116, 440, 49), (472, 440, 49)],
            'front_wheels': [(192, 484, 49), (432, 484, 49)],
            'lamps': [(190, 389, 20), (434, 389, 20)],
        },
        'vane-escort': {
            'side': {'start': 22, 'end': 610, 'ground': 486},
            'front': {'centre': 312, 'ground': 519, 'top': 190},
            'rear': {'centre': 312, 'ground': 519, 'top': 190},
            'top': {'front': 5, 'rear': 615, 'centre': 312, 'along': 'x', 'x_scale': width / 280},
            'wheels_px': [(129, 429, 56), (491, 429, 56)],
            'front_wheels': [(183, 466, 50), (441, 466, 50)],
            'lamps': [(193, 345, 18), (430, 345, 18)],
            'cut': {'side': [(285, 165, 405, 210)], 'front': [(267, 104, 360, 189)],
                    'rear': [(267, 104, 360, 189)], 'top': [(280, 248, 372, 367)]},
        },
    }[ident]
    s = measured['side']
    side_scale = length / (s['end'] - s['start'])
    tire_front_scale = height / abs(measured['front']['ground'] - measured['front']['top'])
    tyre_half, track = width * .10, abs(measured['front']['centre'] - measured['front_wheels'][0][0]) * tire_front_scale
    side_wheel_data = []
    for px, py, radius_px in measured['wheels_px']:
        radius = (s['ground'] - py) * side_scale
        axle = -length / 2 + (px - s['start']) * side_scale
        side_wheel_data.append((axle, radius, track - tyre_half))
    table = {
        'photos': {'side': f'town-trucks-2-{ident}-side.jpg',
                   'front': f'town-trucks-2-{ident}-front.jpg',
                   'rear': f'town-trucks-2-{ident}-rear.jpg',
                   'top': f'town-trucks-2-{ident}-overhead.jpg'},
        'length': length, 'width': width, 'height': height,
        'side': s, 'front': measured['front'], 'rear': measured['rear'],
        'top': measured['top'], 'wheels': side_wheel_data,
        'underside': .18, 'voxel': .035, 'target': 4300,
        'grey': 26, 'tolerance': 24, 'bleed_tolerance': 22,
        'mask_dir': str(evidence / 'masks'),
    }
    if 'cut' in measured:
        table['cut'] = measured['cut']
    body = carve_object(f'{ident}:body', textures, table)
    vehicle = pivot(ident, (0, 0, 0)); attach(vehicle, family)
    attach(body, vehicle)
    photos = table['_photos']
    side_photo, front_photo = photos['side'], photos['front']
    wheel_y = side_wheel_data[0][1]
    for axle_index, (side_measure, front_measure) in enumerate(zip(measured['wheels_px'], measured['front_wheels'])):
        px, py, radius_px = side_measure
        axle, radius, _ = side_wheel_data[axle_index]
        front_x, front_y, front_radius = front_measure
        for sign, flank in ((-1, 'left'), (1, 'right')):
            suffix = ('front' if axle_index == 0 else 'rear') + '-' + flank
            steer = pivot(f'{ident}:steer-{suffix}', (0, 0, 0)) if axle_index == 0 else None
            if steer: attach(steer, vehicle, (sign * track, wheel_y, axle))
            spin = pivot(f'{ident}:spin-{suffix}', (0, 0, 0))
            attach(spin, steer or vehicle, (sign * track, wheel_y, axle))
            wheel = PhotoMesh()
            end_half_px = tyre_half / tire_front_scale
            tyre(wheel, 'side', side_photo, px, py, radius_px, radius, tyre_half,
                 'front', front_photo,
                 front_x if sign < 0 else 2 * measured['front']['centre'] - front_x,
                 end_half_px, front_y + front_radius, front_y - front_radius)
            wheel_obj = wheel.finish(f'{ident}:wheel-{suffix}',
                                     {'side': side_photo.material(), 'front': front_photo.material()})
            attach(wheel_obj, spin, (sign * track, wheel_y, axle))
    lamp_mat = solid_material(f'{ident} / lamp glow', (.92, .82, .58), .3, 0)
    lamp_bsdf = lamp_mat.node_tree.nodes['Principled BSDF']
    lamp_bsdf.inputs['Emission Color'].default_value = (.92, .82, .58, 1)
    lamp_bsdf.inputs['Emission Strength'].default_value = 1.5
    lamp_group = pivot(f'{ident}:lamp', (0, 0, 0)); attach(lamp_group, vehicle)
    lamp_scale = height / abs(measured['front']['ground'] - measured['front']['top'])
    for i, (px, py, radius_px) in enumerate(measured['lamps']):
        x = (measured['front']['centre'] - px) * lamp_scale
        y = (measured['front']['ground'] - py) * lamp_scale
        lens = PhotoMesh()
        headlamp(lens, 'front', 'bulb', front_photo, px, py, radius_px,
                 radius_px * lamp_scale, forward=-1)
        obj = lens.finish(f'{ident}:headlamp-{i+1}',
                          {'front': front_photo.material(), 'bulb': lamp_mat})
        attach(obj, lamp_group, (x, y, -length / 2 - .02))
    if ident == 'ambulance':
        # Roof rack remains a separate named structure over the carved roof.
        rack_y = height + .18
        rack_x = width * .34
        rack_z = length * .32
        for x in (-rack_x, rack_x):
            pipe_join(f'{ident}:rack-rail', [(x, height-.03, -rack_z), (x, rack_y, -rack_z),
                (x, rack_y, rack_z), (x, height-.03, rack_z)], .035, iron, vehicle)
        for z in (-rack_z*.75, -rack_z*.25, rack_z*.25, rack_z*.75):
            crossbar = beam(f'{ident}:rack-crossbar', (-rack_x, rack_y, z), (rack_x, rack_y, z), .045, iron)
            attach(crossbar, vehicle, (0, rack_y, z))
    elif ident == 'vane-escort':
        lamp_mat_blue = solid_material('Vane escort / blue beacon', (.012, .12, .8), .3, 0)
        lamp_mat_blue.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (.012, .12, .8, 1)
        lamp_mat_blue.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 2.0
        beacon_y = height + .10
        for x in (-width*.30, width*.30):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.12,
                location=game_vector((x, beacon_y, -.05)))
            beacon = bpy.context.object; beacon.name = f'{ident}:lamp-blue-beacon'
            beacon.data.materials.append(lamp_mat_blue); attach(beacon, lamp_group, (x, beacon_y, -.05))
        gun_y = height + .18
        gun = beam(f'{ident}:roof-gun-barrel', (0, gun_y, .04), (0, gun_y, .72), .09, iron)
        attach(gun, vehicle, (0, gun_y, .38))
        mount = cube(f'{ident}:roof-gun-mount', (0, height+.08, -.05), (.48, .16, .36), iron, .04)
        attach(mount, vehicle, (0, height+.08, -.05))
    return vehicle

if args.through in ('ambulance', 'vane-truck', 'vane-escort'):
    build_photo_van('ambulance', (5.2, 2.2, 2.45), (), None)
if args.through in ('vane-truck', 'vane-escort'):
    build_photo_van('vane-truck', (6.2, 3.2, 4.3), (), None)
if args.through == 'vane-escort':
    build_photo_van('vane-escort', (5.1, 2.5, 2.85), (), None)


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

truck_sizes={'dozer':(5.8,2.8,3.25),'ambulance':(5.2,2.2,2.45),
             'vane-truck':(6.2,3.2,4.3),'vane-escort':(5.1,2.5,2.85)}
def show_only(ident):
    for name in truck_sizes:
        root_obj=bpy.data.objects.get(name)
        if root_obj:
            for obj in [root_obj,*root_obj.children_recursive]:
                obj.hide_render=(name != ident)
for ident,(length,width,height) in truck_sizes.items():
    if not bpy.data.objects.get(ident):
        continue
    show_only(ident)
    # Blender's orthographic scale is the frame width, not its height.
    side_scale=length/0.82
    end_scale=max(height,width)*1.10
    top_scale=length*1.10
    shot(f'{ident}-side',(-12,height*.52,0),(0,height*.52,0),side_scale,(1200,700))
    shot(f'{ident}-front',(0,height*.52,-12),(0,height*.52,0),end_scale,(820,820))
    shot(f'{ident}-rear',(0,height*.52,12),(0,height*.52,0),end_scale,(820,820))
    shot(f'{ident}-overhead',(0,14,0),(0,0,0),top_scale,(900,900))
    shot(f'{ident}-mayor',(8,height+7,-8),(0,height*.35,0),top_scale*1.35,(1200,780))
    shot(f'{ident}-driver',(8,height*.75,-9),(0,height*.42,0),side_scale*1.08,(1200,780))
    shot(f'{ident}-threequarter-front',(length*.88,height*.82,-length*.92),
         (0,height*.48,0),length*1.42,(1200,780))
    shot(f'{ident}-threequarter-rear',(length*.88,height*.82,length*.92),
         (0,height*.48,0),length*1.42,(1200,780))
    shot(f'{ident}-wheel-lamp-detail',(width*1.15,height*.72,-length*.72),
         (width*.34,height*.48,-length*.39),width*.90,(900,700))

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
