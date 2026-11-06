"""Build four original Scablands work trucks and render from their GLB.

Coordinates are metres, +Y up, front -Z. The candidate is always exported
before a fresh empty Blender scene imports it for review renders.
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
output = (root / '.qa-dist/art-candidates' / f'town-trucks-1{args.candidate_suffix}.glb'
          if args.export_only else root / 'public/assets/models/wasteland/town/trucks-1.glb')
blend = root / 'art-build/town-trucks-1.blend'
evidence = root / '.evidence/town-art-trucks-1'
textures = root / 'public/assets/models/wasteland/town/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(output)], 'evidence': [str(evidence)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('bright overcast truck reference')
scene.world.color = (.48, .49, .50)

# Use the shared material factory for its palette, then use standalone image
# nodes. Blender node maths cannot repeat one cell of an atlas in exported glTF.
shared = town.make_materials({
    'rusted-steel': textures / 'rusted-steel.jpg',
    'galvanised-tin': textures / 'tin.jpg',
    'weathered-plank': textures / 'timber.jpg',
    'patched-canvas': textures / 'patched-canvas.jpg',
})
base_colors={
    'rusted-steel':(.12,.045,.024,1), 'galvanised-tin':(.24,.27,.25,1),
    'weathered-plank':(.15,.10,.055,1), 'patched-canvas':(.30,.23,.15,1),
    'dirty-glass':(.045,.065,.065,1), 'iron-dark':(.045,.048,.045,1),
}
for material in shared.values():
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = min(.29, bsdf.inputs['Metallic'].default_value)
    color=base_colors.get(material.name.removeprefix('Town / '),material.diffuse_color)
    material.diffuse_color=color
materials = dict(shared)

paint_rust = materials['rusted-steel']
tin = materials['galvanised-tin']
dark_metal = materials['iron-dark']
glass = materials['dirty-glass']
wood = materials['weathered-plank']
canvas = materials['patched-canvas']
lamp = bpy.data.materials.new('Aged amber lamp lens')
lamp.use_nodes=True
lamp.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.62,.59,.48,1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=0
lamp.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.38
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.18,.15,.10,1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.35
for name, mat in materials.items():
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Metallic'].default_value = min(.29, bsdf.inputs['Metallic'].default_value)

def game_vector(p):
    return Vector((p[0], -p[2], p[1]))

def box(name, center, size, material, bevel=.025):
    return town.cube(name, center, size, material, bevel)

def cylinder(name, center, radius, depth, material, axis='Y', vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                         location=game_vector(center))
    obj = bpy.context.object
    obj.name = name
    if axis == 'X': obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Z': obj.rotation_euler[0] = math.pi / 2
    obj.data.materials.append(material)
    bevel = obj.modifiers.new('rolled metal edge', 'BEVEL')
    bevel.width = .018
    bevel.segments = 1
    obj.modifiers.new('weighted panel normals', 'WEIGHTED_NORMAL')
    return obj

def pipe(name, points, radius, material):
    before = set(bpy.context.scene.objects)
    town.pipe_run(name, points, radius, material)
    created = list(set(bpy.context.scene.objects) - before)
    if not created:
        raise RuntimeError(f'{name}: expected pipe geometry')
    return created[0] if len(created)==1 else created

def pivot(name, center):
    obj=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(obj)
    obj.location=game_vector(center)
    return obj

def parent_keep_world(obj, parent):
    obj.location -= parent.location
    obj.parent=parent
    obj.matrix_parent_inverse.identity()

def export_glb(path):
    """Keep the integration town_base export contract, including embedded JPEGs."""
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,
        export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=80)

# Use the shared entry point. This adapter supplies the current integration
# branch's JPEG settings while this lane's older town_base still writes PNG.
town.export_glb=export_glb

def merge_static_meshes(root_obj):
    """Keep named pivots while batching repeated panels and hardware by material."""
    parents=[root_obj]+[obj for obj in root_obj.children_recursive if obj.type=='EMPTY']
    for parent in parents:
        if parent.name.endswith(':lamp'):
            continue
        groups={}
        for child in list(parent.children):
            if child.type=='MESH' and len(child.data.materials)==1:
                groups.setdefault(child.data.materials[0].name,[]).append(child)
        for material_name,objects in groups.items():
            if len(objects)<2:
                continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects: obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.convert(target='MESH')
            bpy.ops.object.join()
            bpy.context.object.name=parent.name+':batched-'+material_name.replace(' ','-')
            if ':spin-' not in parent.name:
                decimate=bpy.context.object.modifiers.new('truck detail budget reduction','DECIMATE')
                decimate.ratio=.45 if material_name.endswith('/ photo paint') else .20

# All four trucks use the same measured photo and hull pipeline. The fire engine
# below remains the approved model; the three other silhouettes use the tables.
from photo_model import Photo, Mesh as PhotoMesh, lathe, trace, slab
from hull_model import View, occupancy, largest_part, carve_hull
import numpy as np

# Measured on the photos, in pixels.
SIDE_S = 7.40 / (1690 - 85)     # bumper to tail, 7.4 m
SIDE_FRONT, SIDE_GROUND = 85, 779
END_S = 2.65 / (967 - 117)      # ground to cab roof in the front photo, the same 2.65 m as the side
FRONT_CX, FRONT_GROUND = 763, 967
REAR_CX, REAR_GROUND = 767, 966
TOP_CX, TOP_FRONT, TOP_REAR = 511, 76, 1500
TRUCK_W = (1156 - 370) * END_S  # bumper end to bumper end
TOP_XS = TRUCK_W / (826 - 196)
LENGTH = 7.40
Z0 = -3.70
WHEEL_R = 113 * SIDE_S
FRONT_AXLE = Z0 + (325 - SIDE_FRONT) * SIDE_S
REAR_AXLE = Z0 + (1325 - SIDE_FRONT) * SIDE_S
TRACK_X = 326 * END_S           # from the middle of the truck to the middle of a tyre
TYRE_HALF = 51 * END_S
CHASSIS_Y = (SIDE_GROUND - 690) * SIDE_S  # the underside of the frame

side_photo = Photo(textures / 'fire-engine-side.jpg')
front_photo = Photo(textures / 'fire-engine-front.jpg')
rear_photo = Photo(textures / 'fire-engine-rear.jpg')
top_photo = Photo(textures / 'fire-engine-overhead.jpg')

def side_pick(x, y, z):
    return SIDE_FRONT + (z - Z0) / SIDE_S, SIDE_GROUND - y / SIDE_S
def front_pick(x, y, z):
    return FRONT_CX - x / END_S, FRONT_GROUND - y / END_S
def rear_pick(x, y, z):
    return REAR_CX + x / END_S, REAR_GROUND - y / END_S
def top_pick(x, y, z):
    return TOP_CX + x / TOP_XS, TOP_FRONT + (z - Z0) * (TOP_REAR - TOP_FRONT) / LENGTH

def trim_side(mask):
    """The ground shadow, roof mirror and water cannon are not part of the body."""
    mask = mask.copy()
    mask[SIDE_GROUND:, :] = False
    mask[:204, :700] = False
    mask[:188, 840:1020] = False
    return mask
def trim_end(ground):
    def trim(mask):
        mask = mask.copy()
        mask[ground:, :] = False
        return mask
    return trim

left = View('side', side_photo, [(20, 20), (1750, 860), (20, 850)], side_pick, (-1, 0, 0), trim_side)
right = View('side', side_photo, [(20, 20)], side_pick, (1, 0, 0), trim_side)
right.mask = left.mask
front = View('front', front_photo, [(20, 20), (20, 1000), (1510, 1000)], front_pick, (0, 0, -1), trim_end(FRONT_GROUND))
rear = View('rear', rear_photo, [(20, 20), (20, 1000), (1510, 1000)], rear_pick, (0, 0, 1), trim_end(REAR_GROUND))
top = View('overhead', top_photo, [(20, 20), (1000, 20), (20, 1510), (1000, 1510)], top_pick, (0, 1, 0))

def ends_allow(x, y, z):
    # The two ends are one silhouette: either photo may show a part the other hides.
    return front.covers(x, y, z) | rear.covers(x, y, z)
def clear_of_wheels(x, y, z):
    # Above the frame only, with room cut for each wheel to turn in its arch.
    keep = y >= CHASSIS_Y
    outer = np.abs(x) > TRACK_X - TYRE_HALF - .04
    for axle in (FRONT_AXLE, REAR_AXLE):
        keep &= ~(outer & ((z - axle) ** 2 + (y - WHEEL_R) ** 2 < (WHEEL_R + .05) ** 2))
    return keep

VOXEL = .03
solid, xs, ys, zs = occupancy(((-TRUCK_W / 2 - .05, TRUCK_W / 2 + .05), (0, 2.95), (Z0 - .05, Z0 + LENGTH + .05)),
    VOXEL, [left.covers, top.covers, ends_allow], clear_of_wheels)
solid = largest_part(solid)

# The photo's own colours replace its background, so it cannot show on an edge.
# A wider colour match also takes in the soft ground shadow round the subject.
def body_only(view, photo, seeds):
    return view.mask & ~photo.sky(seeds, tolerance=70, grey=30)
side_photo.bleed(body_only(left, side_photo, [(20, 20), (1750, 860), (20, 850)]))
front_photo.bleed(body_only(front, front_photo, [(20, 20), (20, 1000), (1510, 1000)]))
rear_photo.bleed(body_only(rear, rear_photo, [(20, 20), (20, 1000), (1510, 1000)]))
top_photo.bleed(body_only(top, top_photo, [(20, 20), (1000, 20), (20, 1510), (1000, 1510)]))
fire_materials = {'side': side_photo.material(), 'front': front_photo.material(),
                  'rear': rear_photo.material(), 'overhead': top_photo.material()}

TRUCKS={}
fire_root = pivot('fire-truck', (0, 0, 0)); TRUCKS['fire-truck'] = fire_root
def world_of(obj):
    place = Vector((0, 0, 0))
    while obj:
        place += obj.location
        obj = obj.parent
    return place
def attach(obj, parent, gltf_point=(0, 0, 0)):
    """Put obj at a world point under parent, whatever parent's own parents are."""
    obj.parent = parent
    obj.matrix_parent_inverse.identity()
    obj.location = game_vector(gltf_point) - world_of(parent)

hull = carve_hull('fire-truck:body', [left, right, front, rear, top], fire_materials,
                  solid, xs, ys, zs, VOXEL, 9000)
attach(hull, fire_root)

def disc_uv(photo, cx, cy, radius_px, spread=.92):
    """A round part's face wears the same round part in the photo."""
    return lambda a, f: photo.uv(cx - math.cos(a) * radius_px * f * spread, cy - math.sin(a) * radius_px * f * spread)
def tread_uv(photo, cx, cy, radius_px):
    """The tread wears the tyre's outer band in the photo, never the background."""
    return lambda index, distance, radius, angle: photo.uv(cx - math.cos(angle) * radius_px * .93,
                                                          cy - math.sin(angle) * radius_px * .93)

# Wheels are round parts on real axles. Each stands on the ground just inside its wing.
side_face = 113
for side_name, x in (('left', -TRACK_X), ('right', TRACK_X)):
    for axle_name, axle, cx in (('front', FRONT_AXLE, 325), ('rear', REAR_AXLE, 1325)):
        centre = (x, WHEEL_R, axle)
        suffix = axle_name + '-' + side_name
        steer = None
        if axle_name == 'front':
            steer = pivot('fire-truck:steer-' + suffix, (0, 0, 0))
            attach(steer, fire_root, centre)
        spin = pivot('fire-truck:spin-' + suffix, (0, 0, 0))
        attach(spin, steer or fire_root, centre)
        wheel = PhotoMesh()
        face = disc_uv(side_photo, cx, 665, side_face)
        lathe(wheel, 'side', (0, 0, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0),
              [(-TYRE_HALF, WHEEL_R * .90), (-TYRE_HALF * .8, WHEEL_R), (TYRE_HALF * .8, WHEEL_R), (TYRE_HALF, WHEEL_R * .90)],
              tread_uv(side_photo, cx, 665, side_face), sides=32,
              cap_start=('side', lambda a, f, face=face: face(a, f * .90)),
              cap_end=('side', lambda a, f, face=face: face(a, f * .90)))
        wheel_obj = wheel.finish('fire-truck:' + suffix, {'side': side_photo.material()})
        attach(wheel_obj, spin, centre)

# Axles join the wheels under the frame.
axle_mesh = PhotoMesh()
for axle in (FRONT_AXLE, REAR_AXLE):
    lathe(axle_mesh, 'side', (0, WHEEL_R, axle), (1, 0, 0), (0, 0, 1), (0, 1, 0),
          [(-TRACK_X, .055), (TRACK_X, .055)], tread_uv(side_photo, 325, 665, 60), sides=12)
axle_obj = axle_mesh.finish('fire-truck:axles', {'side': side_photo.material()})
attach(axle_obj, fire_root)

# The water cannon stands on the roof and turns about its own post.
CANNON = (0, (SIDE_GROUND - 182) * SIDE_S, Z0 + (985 - SIDE_FRONT) * SIDE_S)
cannon = pivot('fire-truck:cannon', (0, 0, 0)); attach(cannon, fire_root, CANNON)
cannon_mesh = PhotoMesh()
def barrel_uv(index, distance, radius, angle):
    return side_photo.uv(985 + distance / SIDE_S, 163 - math.sin(angle) * radius * .7 / SIDE_S)
lathe(cannon_mesh, 'side', (0, .08, 0), (0, 0, 1), (1, 0, 0), (0, 1, 0),
      [(-.60, .035), (-.56, .055), (-.30, .045), (.05, .06), (.12, .035)], barrel_uv, sides=14)
def post_uv(index, distance, radius, angle):
    return side_photo.uv(985 + math.cos(angle) * radius * .7 / SIDE_S, 182 - distance / SIDE_S)
lathe(cannon_mesh, 'side', (0, 0, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1),
      [(-.03, .075), (.05, .055), (.08, .045)], post_uv, sides=12)
cannon_obj = cannon_mesh.finish('fire-truck:cannon-barrel', {'side': side_photo.material()})
attach(cannon_obj, cannon, CANNON)

# Headlamps stand a little proud of the wings, and glow at night.
lamp_group = pivot('fire-truck:lamp', (0, 0, 0)); attach(lamp_group, fire_root)
for lamp_side, px in (('left', 1028), ('right', 504)):
    lens = PhotoMesh()
    x = (FRONT_CX - px) * END_S
    y = (FRONT_GROUND - 610) * END_S
    lathe(lens, 'lens', (0, 0, 0), (0, 0, 1), (1, 0, 0), (0, 1, 0), [(.02, .118), (-.012, .125)],
          lambda index, distance, radius, angle, px=px: front_photo.uv(px - math.cos(angle) * 46, 610 - math.sin(angle) * 46),
          sides=20, cap_end=('lens', disc_uv(front_photo, px, 610, 46, 1)))
    lens_obj = lens.finish('fire-truck:headlamp-' + lamp_side, {'lens': lamp})
    attach(lens_obj, lamp_group, (x, y, Z0 + (168 - SIDE_FRONT) * SIDE_S))

TRUCK_TABLES = {
    # Hand-measured from the side/end/top crops. Each row stores the pixel
    # landmarks first; metre values are derived below from the measured span.
    'water-tanker': dict(length=9.0,width=2.62,height=3.30,side=(24,1045,458,[190,705,858],370,82),
        front=(222,451,350),rear=(245,490,360),top=(50,895,257,330),dual=False,chassis_px=48,target=6800),
    'supply-truck': dict(length=8.2,width=2.55,height=3.00,side=(28,930,450,[185,665,790],365,78),
        front=(222,453,296),rear=(300,498,420),top=(50,900,255,320),dual=False,chassis_px=46,target=6800),
    'tow-rig': dict(length=8.2,width=2.55,height=2.95,side=(28,965,456,[180,690,830],400,84),
        front=(222,454,296),rear=(245,500,350),top=(50,900,255,320),dual=True,chassis_px=54,target=6000),
}

def build_photo_truck(identifier, spec):
    """Carve a truck from its four measured pictures and attach real hardware."""
    side_file = {'water-tanker':'tanker','supply-truck':'supply','tow-rig':'tow'}[identifier]
    side_photo = Photo(textures / f'{side_file}-side.jpg')
    front_photo = Photo(textures / f'{side_file}-front.jpg')
    rear_photo = Photo(textures / f'{side_file}-rear.jpg')
    top_photo = Photo(textures / f'{side_file}-overhead.jpg')
    crane_photo = Photo(textures / 'tow-side.jpg') if identifier=='tow-rig' else None
    length,width,height = spec['length'],spec['width'],spec['height']
    front_px,rear_px,ground,axle_px,wheel_y,wheel_r_px = spec['side']
    side_scale = length/(rear_px-front_px)
    end_cx,end_ground,end_span=spec['front']
    end_scale=width/end_span
    rear_cx,rear_ground,rear_span=spec['rear']
    rear_scale=width/rear_span
    top_front,top_rear,top_mid,top_width=spec['top']
    top_scale=length/(top_rear-top_front)
    top_x_scale=width/top_width
    z0=-length/2
    wheel_r=wheel_r_px*side_scale
    axles=[z0+(px-front_px)*side_scale for px in axle_px]
    track=(end_span*.37)*end_scale
    tyre_half=width*.085
    ground_y=0.0
    chassis_y=spec['chassis_px']*side_scale

    def side_pick(x,y,z):
        return front_px+(z-z0)/side_scale, ground-y/side_scale
    def front_pick(x,y,z):
        return end_cx-x/end_scale, end_ground-y/end_scale
    def rear_pick(x,y,z):
        return rear_cx+x/rear_scale, rear_ground-y/rear_scale
    def top_pick(x,y,z):
        return top_front+(z-z0)/top_scale, top_mid-x/top_x_scale

    def trim_side(mask):
        mask=mask.copy(); mask[ground:,:]=False
        if identifier=='supply-truck':
            # Keep the cab and flatbed; the separate named load is built below.
            mask[:235,420:]=False
            mask[55:185,850:]=False
        if identifier=='tow-rig':
            mask[:275,430:]=False
        return mask
    def trim_end(row, supply=False):
        def trim(mask):
            mask=mask.copy();mask[row:,:]=False
            if supply: mask[:230,:]=False
            return mask
        return trim
    left=View('side',side_photo,[(5,5),(side_photo.w-6,5),(5,side_photo.h-6)],
        side_pick,(-1,0,0),trim_side)
    right=View('side',side_photo,[(5,5)],side_pick,(1,0,0),trim_side)
    right.mask=left.mask
    tow_lattice_mask=(~crane_photo.sky([(5,5),(crane_photo.w-6,5),(5,crane_photo.h-6)],
                                      tolerance=70,grey=30)
                      if identifier=='tow-rig' else None)
    front=View('front',front_photo,[(5,5),(front_photo.w-6,5),(5,front_photo.h-6)],
        front_pick,(0,0,-1),trim_end(end_ground,identifier=='supply-truck'))
    rear=View('rear',rear_photo,[(5,5),(rear_photo.w-6,5),(5,rear_photo.h-6)],
        rear_pick,(0,0,1),trim_end(rear_ground,identifier=='supply-truck'))
    top=View('overhead',top_photo,[(5,5),(top_photo.w-6,5),(5,top_photo.h-6),
        (top_photo.w-6,top_photo.h-6)],top_pick,(0,1,0))
    def ends_allow(x,y,z): return front.covers(x,y,z)|rear.covers(x,y,z)
    def clear_of_wheels(x,y,z):
        keep=y>=chassis_y
        outside=np.abs(x)>track-tyre_half-.04
        for axle in axles:
            keep &= ~(outside & ((z-axle)**2+(y-wheel_r)**2<(wheel_r+.055)**2))
        return keep
    voxel=.035
    hull_views=[left,right,front,rear,top]
    occupancy_views=[left.covers,top.covers,ends_allow]
    solid,xs,ys,zs=occupancy(((-width/2-.08,width/2+.08),(0,height),(z0-.08,-z0+.08)),
        voxel,occupancy_views,clear_of_wheels)
    solid=largest_part(solid)
    side_photo.bleed(left.mask & ~side_photo.sky([(5,5),(side_photo.w-6,5),(5,side_photo.h-6)],tolerance=70,grey=30))
    front_photo.bleed(front.mask & ~front_photo.sky([(5,5),(front_photo.w-6,5),(5,front_photo.h-6)],tolerance=70,grey=30))
    rear_photo.bleed(rear.mask & ~rear_photo.sky([(5,5),(rear_photo.w-6,5),(5,rear_photo.h-6)],tolerance=70,grey=30))
    top_photo.bleed(top.mask & ~top_photo.sky([(5,5),(top_photo.w-6,5),(5,top_photo.h-6),(top_photo.w-6,top_photo.h-6)],tolerance=70,grey=30))
    face_materials={'side':side_photo.material(),'front':front_photo.material(),
        'rear':rear_photo.material(),'overhead':top_photo.material()}
    root_obj=pivot(identifier,(0,0,0));TRUCKS[identifier]=root_obj
    body=carve_hull(identifier+':body',hull_views,face_materials,solid,xs,ys,zs,voxel,spec['target'])
    attach(body,root_obj)

    # Round wheels are measured from the photo and placed at ground height.
    for axle_index,axle in enumerate(axles):
        axle_tag='front' if axle_index==0 else f'rear-{axle_index}'
        cylinder(identifier+':axle-'+axle_tag,(0,wheel_r,axle),.07,track*2+tyre_half*2,dark_metal,'X',20)
        for side,label in ((-1,'left'),(1,'right')):
            x=side*track
            positions=[x]
            if axle_index>0 and spec['dual']:
                positions=[x-side*tyre_half*.72,x+side*tyre_half*.72]
            for dual_index,wheel_x in enumerate(positions):
                center=(wheel_x,wheel_r,axle)
                spin=pivot(f'{identifier}:spin-{axle_tag}-{label}'+(f'-dual-{dual_index}' if len(positions)>1 else ''),(0,0,0))
                if axle_index==0:
                    steer=pivot(f'{identifier}:steer-front-{label}',(0,0,0))
                    attach(steer,root_obj,center)
                    attach(spin,steer,center)
                else:
                    attach(spin,root_obj,center)
                wheel=PhotoMesh()
                face=disc_uv(side_photo,axle_px[axle_index],wheel_y,wheel_r_px,.84)
                tread=lambda index,distance,radius,angle,cx=axle_px[axle_index]: side_photo.uv(
                    cx-math.cos(angle)*wheel_r_px*.84,wheel_y-math.sin(angle)*wheel_r_px*.84)
                lathe(wheel,'side',(0,0,0),(1,0,0),(0,0,1),(0,1,0),
                    [(-tyre_half,wheel_r*.90),(-tyre_half*.8,wheel_r),
                     (tyre_half*.8,wheel_r),(tyre_half,wheel_r*.90)],tread,sides=32,
                    cap_start=('side',lambda a,f,face=face:face(a,f*.90)),
                    cap_end=('side',lambda a,f,face=face:face(a,f*.90)))
                tire=wheel.finish(f'{identifier}:wheel-{axle_tag}-{label}',{'side':side_photo.material()})
                attach(tire,spin,center)

    lamp_group=pivot(identifier+':lamp',(0,0,0));attach(lamp_group,root_obj)
    lamp_x=track*.82; lamp_y=max(.85,wheel_r*1.48); lamp_z=z0+.15
    for side,label in ((-1,'left'),(1,'right')):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.12,location=game_vector((side*lamp_x,lamp_y,lamp_z)))
        lens=bpy.context.object;lens.name=identifier+':headlamp-'+label;lens.data.materials.append(lamp);parent_keep_world(lens,lamp_group)

    if identifier=='supply-truck':
        # The loaded truck is carved from its own four measured views. Its
        # low limit leaves the photo-carved bed floor and rails visible below.
        load=pivot(identifier+':load',(0,0,0));attach(load,root_obj)
        loaded={view:Photo(textures/f'supply-load-{view}.jpg')
                for view in ('side','front','rear','overhead')}
        side_ground,side_front,side_rear=449,104,954
        load_scale=8.2/(side_rear-side_front)
        load_z0=-4.1
        def load_side_pick(x,y,z):
            return side_front+(z-load_z0)/load_scale, side_ground-y/load_scale
        def load_front_pick(x,y,z):
            return 222-x/.0105,397-y/.0105
        def load_rear_pick(x,y,z):
            return 300+x/.00955,402-y/.00955
        def load_top_pick(x,y,z):
            return 72+(z-load_z0)*762/8.2,230+x/.00948
        load_left=View('side',loaded['side'],[(5,5),(1078,5),(5,495)],
            load_side_pick,(-1,0,0))
        load_right=View('side',loaded['side'],[(5,5)],load_side_pick,(1,0,0))
        load_right.mask=load_left.mask
        load_front=View('front',loaded['front'],[(5,5),(438,5),(5,495)],
            load_front_pick,(0,0,-1))
        load_rear=View('rear',loaded['rear'],[(5,5),(594,5),(5,507)],
            load_rear_pick,(0,0,1))
        load_top=View('overhead',loaded['overhead'],[(5,5),(922,5),(5,507),(922,507)],
            load_top_pick,(0,1,0))
        side_seeds=[(5,5),(1078,5),(5,495)]
        front_seeds=[(5,5),(438,5),(5,495)]
        rear_seeds=[(5,5),(594,5),(5,507)]
        top_seeds=[(5,5),(922,5),(5,507),(922,507)]
        for view,mask,seeds in ((load_left,load_left.mask,side_seeds),
            (load_front,load_front.mask,front_seeds),(load_rear,load_rear.mask,rear_seeds),
            (load_top,load_top.mask,top_seeds)):
            view.photo.bleed(mask & ~view.photo.sky(seeds,tolerance=70,grey=30))
        def load_ends_allow(x,y,z):
            return load_front.covers(x,y,z)|load_rear.covers(x,y,z)
        voxel=.035
        load_solid,lxs,lys,lzs=occupancy(((-1.16,1.16),(1.53,3.85),(-.72,4.12)),voxel,
            [load_left.covers,load_top.covers,load_ends_allow])
        load_solid=largest_part(load_solid)
        load_materials={name:photo.material() for name,photo in loaded.items()}
        cargo=carve_hull(identifier+':load-carved',
            [load_left,load_right,load_front,load_rear,load_top],load_materials,
            load_solid,lxs,lys,lzs,voxel,2000)
        attach(cargo,load)
    elif identifier=='water-tanker':
        for side in (-1,1):
            pipe(identifier+':valve-drain',[(side*.78,1.1,.25),(side*.91,.67,.25),(side*.76,.67,1.1)],.035,dark_metal)
            cylinder(identifier+':valve-wheel',(side*.91,.68,1.1),.16,.06,paint_rust,'X',20)
            for drip in range(4):
                pipe(identifier+':tank-drip',[(side*.91,1.7,.4+drip*.9),(side*.91,1.45,.4+drip*.9)],.014,dark_metal)
    else:
        # Trace the side-photo lattice, retaining its open holes, then give the
        # sheet a real 14 cm thickness across the truck.
        tow_roi=(430,18,1006,292)
        # Save the original mask before background bleeding changes its pale
        # pixels; tracing the bled image would mistake its painted fill for steel.
        crane_mask=tow_lattice_mask.copy()
        crane_mask[38:178,962:986]=False  # the hoist line is a separate part
        loops=trace(crane_mask,tow_roi,tolerance=1.0,min_area=5)
        crane_mesh=PhotoMesh()
        def crane_world(px,py,d):
            return (d,(ground-py)*side_scale,z0+(px-front_px)*side_scale)
        slab(crane_mesh,'side',crane_photo,loops,crane_world,-.07,.07,
             wall_scale=side_scale)
        boom=crane_mesh.finish(identifier+':crane-boom',{'side':crane_photo.material()})
        attach(boom,root_obj)
        tip_px,tip_py=978,28
        tip_z=z0+(tip_px-front_px)*side_scale
        tip_y=(ground-tip_py)*side_scale
        hook_y=(ground-228)*side_scale
        hook=pivot(identifier+':hook',(0,0,0));attach(hook,root_obj,(0,hook_y,tip_z))
        cable=pipe(identifier+':hook-cable',[(0,tip_y,tip_z),(0,hook_y+.18,tip_z)],.014,dark_metal)
        for obj in cable if isinstance(cable,list) else [cable]: parent_keep_world(obj,hook)
        forged=pipe(identifier+':hook-forged',[(0,hook_y+.22,tip_z),(0,hook_y,tip_z),
            (0,hook_y-.16,tip_z),(.07,hook_y-.30,tip_z),(.18,hook_y-.27,tip_z),
            (.21,hook_y-.15,tip_z)],.035,tin)
        for obj in forged if isinstance(forged,list) else [forged]: parent_keep_world(obj,hook)
    return root_obj

for truck_id,truck_spec in TRUCK_TABLES.items():
    build_photo_truck(truck_id,truck_spec)

specs=(('fire-truck',7.5,(-2.45,2.23),'fire'),
       ('water-tanker',9.0,(-3.00,2.55),'tanker'),
       ('supply-truck',8.2,(-2.35,2.22),'supply'),
       ('tow-rig',8.2,(-2.15,1.95),'tow'))
for truck in TRUCKS.values(): merge_static_meshes(truck)

family=pivot('town-trucks-1',(0,0,0))
for truck in TRUCKS.values(): parent_keep_world(truck,family)

output.parent.mkdir(parents=True,exist_ok=True)
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(output)
def mesh_triangles(obj, depsgraph):
    evaluated=obj.evaluated_get(depsgraph)
    mesh=evaluated.to_mesh()
    count=sum(max(0, len(poly.vertices)-2) for poly in mesh.polygons)
    evaluated.to_mesh_clear()
    return count

truck_metrics={}
depsgraph=bpy.context.evaluated_depsgraph_get()
for identifier,_,_,_ in specs:
    photo_stem={'water-tanker':'tanker','supply-truck':'supply','tow-rig':'tow'}.get(identifier)
    truck_meshes=[obj for obj in bpy.context.scene.objects
                  if obj.type=='MESH' and obj.name.startswith(identifier)]
    truck_metrics[identifier]={
        'triangles':sum(mesh_triangles(obj,depsgraph) for obj in truck_meshes),
        'paintImage':('four measured Photo sources' if identifier=='fire-truck' else 'four measured Photo views'),
        'paintImageBytes':(sum((textures/f'fire-engine-{view}.jpg').stat().st_size for view in fire_materials)
                           if identifier=='fire-truck' else sum((textures/f'{photo_stem}-{view}.jpg').stat().st_size for view in ('side','front','rear','overhead'))),
        'paintImageDimensions':'four source views',
    }
triangles=sum(item['triangles'] for item in truck_metrics.values())
if any(item['triangles']>12000 for item in truck_metrics.values()):
    raise RuntimeError('A truck exceeds the 12,000 triangle budget: '+json.dumps(truck_metrics))
if args.export_only:
    print(json.dumps({'glb':str(output),'bytes':output.stat().st_size,'triangles':triangles,
                      'trucks':truck_metrics}))
    raise SystemExit(0)

# Reopen the exported GLB in an empty Blender scene. Every review frame is from
# this imported deliverable, lit flat and rendered with the Standard transform.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'
scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='Standard'
scene.render.resolution_percentage=100; scene.render.resolution_x=900; scene.render.resolution_y=600
scene.world=bpy.data.worlds.new('flat pale overcast review'); scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(1,1,1,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=1
bpy.ops.import_scene.gltf(filepath=str(output))
# Blender is Z-up after import; the road plane lies in XY at Z=0.
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,0))
floor=bpy.context.object; floor.name='plain pale review ground'
floor_mat=bpy.data.materials.new('plain pale review ground'); floor_mat.use_nodes=True
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.38,.38,.38,1)
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.98
floor.data.materials.append(floor_mat)
for loc,power,size in []:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object
    light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(Vector((0,0,1.35))-light.location).to_track_quat('-Z','Y').to_euler()
all_roots=[bpy.data.objects.get(name) for name,_,_,_ in specs]
if any(root is None for root in all_roots): raise RuntimeError('exported GLB lost a truck root')
camera_data=bpy.data.cameras.new('round 10 review camera')
camera=bpy.data.objects.new('round 10 review camera',camera_data); scene.collection.objects.link(camera)
scene.camera=camera; camera.data.type='ORTHO'
evidence.mkdir(parents=True,exist_ok=True)
def render_view(identifier,name,location,target=(0,0,1.35),width=8.4,resolution=(900,600)):
    scene.render.resolution_x,scene.render.resolution_y=resolution
    camera.location=location
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=width
    scene.render.filepath=str(evidence/(identifier+'-'+name+'.png'))
    bpy.ops.render.render(write_still=True)

# Seven required checks for each new truck, plus the already passed fire engine.
for identifier,_,_,_ in specs:
    for other in all_roots:
        hidden=other.name!=identifier; other.hide_render=hidden
        for child in other.children_recursive: child.hide_render=hidden
    length=next(item[1] for item in specs if item[0]==identifier)
    width={'fire-truck':2.65,'water-tanker':2.62,'supply-truck':2.55,'tow-rig':2.55}[identifier]
    height={'fire-truck':2.95,'water-tanker':3.30,'supply-truck':3.55,'tow-rig':2.95}[identifier]
    target_y=min(height,2.0)
    render_view(identifier,'side',(-length*1.5,0,target_y),target=(0,0,target_y),width=length*1.18,resolution=(1000,500))
    render_view(identifier,'front',(0,width*4,target_y),target=(0,0,target_y),width=width*1.8,resolution=(720,720))
    render_view(identifier,'rear',(0,-width*4,target_y),target=(0,0,target_y),width=width*1.8,resolution=(720,720))
    render_view(identifier,'three-quarter-front',(-length*1.3,length*1.3,height*1.4),width=length*1.35,resolution=(900,630))
    render_view(identifier,'three-quarter-rear',(length*1.3,-length*1.3,height*1.4),width=length*1.35,resolution=(900,630))
    render_view(identifier,'mayor-height',(length*1.5,length*1.5,length*2.0),target=(0,0,0),width=length*1.65)
    # Round 9's driver-height side camera shows the entire truck at its ground
    # line, without the clipped view and pale band from the old angled camera.
    render_view(identifier,'road-view',(-length*1.5,0,1.9),target=(0,0,1.5),
                width=length*1.18,resolution=(1100,700))
print(json.dumps({'glb':str(output),'bytes':output.stat().st_size,'triangles':triangles,
                  'trucks':truck_metrics,'renderedFromImportedGlb':True,'viewTransform':'Standard',
                  'reviewViews':'seven per truck','evidence':str(evidence)}))
