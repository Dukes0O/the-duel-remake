"""Build the Scrapasaurus, a two-storey welded junk dinosaur for Bowl Night five.

Run with Blender:
  blender -b --python-exit-code 1 --python tools/blender/bowl-scrapasaurus.py -- --root . --round 2

The model is authored in metres with +Y up and +Z forward. Separate identity
transform nodes keep the jaw, tail and three battery boxes easy to animate or
swap. The round-two render writes private PNG views and replaces the old look
sheet with a compressed side-by-side comparison of rounds one and two.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=2)
parser.add_argument('--skip-renders', action='store_true')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
output = root / 'public/assets/models/wasteland/bowl/scrapasaurus.glb'
blend = root / 'art-build/bowl-scrapasaurus/scrapasaurus.blend'
evidence = root / '.evidence/2026-11-05/BOWL-ART-REX/round-2'
look_dir = root / 'docs/board/looks/bowl-art-rex'
previous_sheet = look_dir / 'round-1.jpg'
sheet = look_dir / 'round-1.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(output)],
                      'evidence': [str(evidence / f'{name}.png') for name in ('front', 'quarter', 'side-rest', 'side-bite', 'top')],
                      'summary': [str(sheet)]}))
    raise SystemExit(0)
if args.round != 2:
    parser.error('BOWL-ART-REX round two is the active review round')

import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
output.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
if not args.skip_renders:
    evidence.mkdir(parents=True, exist_ok=True)
    sheet.parent.mkdir(parents=True, exist_ok=True)

def mat(name, color, metallic=.45, roughness=.82, emission=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    noise = m.node_tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 28.0
    noise.inputs['Detail'].default_value = 3.0
    noise.inputs['Roughness'].default_value = .78
    bump = m.node_tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .16 if metallic > .3 else .08
    bump.inputs['Distance'].default_value = .045
    m.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    m.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    return m

steel = mat('Scrapasaurus · scale-pitted welded steel', (.105, .112, .108), .72, .9)
rust = mat('Scrapasaurus · red oxide and old paint', (.32, .105, .038), .38, .93)
paint = mat('Scrapasaurus · faded industrial ochre', (.48, .31, .085), .45, .88)
rubber = mat('Scrapasaurus · soot and tire rubber', (.025, .028, .027), .05, .98)
iron = mat('Scrapasaurus · chain and rail iron', (.17, .15, .125), .82, .78)
copper = mat('Scrapasaurus · battery terminals', (.42, .20, .075), .65, .72)
glass = mat('Scrapasaurus · dead headlamp glass', (.25, .16, .055), .25, .55, .12)
hazard = mat('Scrapasaurus · scraped hazard yellow', (.82, .43, .045), .38, .86)
cable = mat('Scrapasaurus · insulated battery cable', (.035, .36, .29), .12, .72)
MATS = [steel, rust, paint, rubber, iron, copper, glass, hazard, cable]

root_obj = bpy.data.objects.new('scrapasaurus-root', None)
bpy.context.collection.objects.link(root_obj)
root_obj.empty_display_type = 'PLAIN_AXES'
root_obj['units'] = 'metres'
root_obj['forward'] = '+Z'

def adopt(obj, name, material, parent=True):
    obj.name = name
    obj.data.materials.append(material)
    if parent:
        obj.parent = root_obj
    return obj

def bevel(obj, amount=.035, segments=1):
    mod = obj.modifiers.new('hammered and torn edges', 'BEVEL')
    mod.width = amount
    mod.segments = segments
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)

def cube(name, pos, size, material=steel, bevel_size=.025, parent=True):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    adopt(obj, name, material, parent)
    if bevel_size:
        bevel(obj, min(bevel_size, min(size) * .22))
    return obj

def cyl(name, pos, radius, depth, material=iron, axis='Y', vertices=12, parent=True):
    direction = {'X': (0, math.pi/2, 0), 'Y': (0, 0, 0), 'Z': (math.pi/2, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        location=pos, rotation=direction)
    obj = bpy.context.object
    return adopt(obj, name, material, parent)

def beam(name, a, b, width, material=iron, depth=None, vertices=8):
    a, b = Vector(a), Vector(b)
    delta = b - a
    obj = cyl(name, (a+b)*.5, width*.5, delta.length, material, 'Y', vertices)
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    return obj

def wheel(name, x, y, z, radius=.48, width=.28):
    tire = cyl(name+'-tire', (x, y, z), radius, width, rubber, 'X', 16)
    cyl(name+'-hub-rim', (x, y, z), radius*.54, width*1.05, rust, 'X', 12)
    cyl(name+'-hub-cap', (x + (width*.55 if x >= 0 else -width*.55), y, z), radius*.2, .025, iron, 'X', 10)
    return tire

def panel(name, pos, size, material=rust, rotation=(0,0,0)):
    obj = cube(name, pos, size, material, min(size)*.08)
    obj.rotation_euler = rotation
    return obj

def profile_prism(name, profile, width, material, pivot=(0,0,0)):
    """Extrude a side silhouette in the X direction around a named pivot."""
    px,py,pz=pivot
    vertices=[(sx*width*.5,y-py,z-pz) for sx in (-1,1) for y,z in profile]
    count=len(profile)
    faces=[tuple(range(count)),tuple(range(count,2*count))]
    faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
    mesh=bpy.data.meshes.new(name+'-mesh');mesh.from_pydata(vertices,[],faces);mesh.materials.append(material);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    obj.location=pivot;obj.parent=root_obj
    bevel(obj,.045,1)
    return obj

def plate_ribs(prefix, center, count, width, height, zspan, material=rust):
    x,y,z=center
    for i in range(count):
        t = i/max(1,count-1)-.5
        panel(f'{prefix}-corrugated-{i+1}', (x,y,z+t*zspan), (width,height,.11),
              material if i%3 else paint, (0,0,(i%2-.5)*.035))

# Rail bogie and two weathered rails, set up as a compact stage prop rather than a vehicle chassis.
for x in (-.68, .68):
    cube('rail-bogie-longitudinal-frame', (x,1.62,0), (.20,.20,7.4), iron, .04)
    for z in (-3.0,-1.5,0,1.5,3.0):
        beam('bogie-crossmember', (-.92,1.62,z), (.92,1.62,z), .16, rust)
    for z in (-2.8,-1.4,0,1.4,2.8):
        wheel('rail-wheel', x*1.12, 1.76, z, .30, .22)
    cyl('rail-bogie-axle', (x*1.12,1.76,0), .08, 1.8, iron, 'X', 10)
    cube('forged-rail', (x*1.12,1.44,0), (.18,.12,7.5), iron, .035)
    for z in (-3.2,-2.4,-1.2,0,1.2,2.4,3.2):
        cube('rail-sleeper', (0,1.35,z), (1.85,.10,.18), rust, .025)

# Lower storey: a heavy wreck body over the rail bogie. Four articulated
# haunches break the old ladder silhouette into a walking animal.
cube('lower-storey-main-girder', (0,1.28,0), (2.55,.48,8.1), steel, .08)
cube('deep-welded-ribcage', (0,2.30,-.25), (2.72,1.45,5.7), rust, .25)
for x in (-1.35,1.35):
    for z in (-2.0,1.65):
        knee_y = .94 if z < 0 else 1.02
        knee_z = z - .34 if z < 0 else z + .25
        foot_z = knee_z - .32 if z < 0 else knee_z + .30
        beam('scrapasaurus-heavy-thigh', (x*.76,2.05,z), (x,knee_y,knee_z), .82, steel, .62)
        beam('scrapasaurus-bent-shin', (x,knee_y,knee_z), (x*.96,.39,foot_z), .58, rust, .48)
        cube('scrapasaurus-broad-welded-foot', (x*.96,.24,foot_z+.10), (1.16,.38,1.22), iron, .16)
        for toe in (-1,1):
            cube('scrapasaurus-steel-toe', (x*.96+toe*.30,.17,foot_z+.56), (.34,.26,.46), paint, .08)
        beam('leg-piston', (x*.84,1.58,z-.2), (x*.98,.65,knee_z), .16, copper)
for x in (-1.28,1.28):
    beam('lower-storey-side-truss', (x,.98,-3.65), (x,2.65,2.85), .21, iron)
    beam('lower-storey-brace', (x,1.05,2.6), (x,2.35,-2.5), .16, rust)
    for z in (-2.8,-1.0,1.0,2.5):
        panel('lower-storey-crushed-door-skin', (x*1.015,1.72,z), (.13,1.02,1.25), rust if z%2 else paint,
              (0,0.03*(z%2),.08*(1 if x>0 else -1)))
        for yy in (1.38,1.55,1.72,1.89,2.06):
            cube('door-stamped-ridge', (x*1.09,yy,z), (.035,.025,1.12), iron, .008)
    for y in (1.0,2.55):
        beam('ribbed-steel-arch', (x,y,-3.8), (x,y,3.5), .16, steel)
    panel('long-salvaged-door-side-skin', (x*1.10,1.78,-.05), (.13,.92,7.05), rust)

# A recognizable lower-deck pair of crushed car shells and their torn rooflines.
for idx,z in enumerate((-1.65,1.15)):
    width=2.0 if idx==0 else 2.15
    cube(f'lower-car-{idx+1}-crushed-floor', (0,2.06,z), (width,.16,2.65), steel, .04)
    for x in (-width*.45,width*.45):
        beam('crumpled-car-window-pillar', (x,2.05,z-1.05), (x*.82,3.05,z-.68), .13, rust)
        beam('crumpled-car-window-pillar', (x*.82,3.05,z-.68), (x*.94,2.50,z+.52), .13, iron)
        panel('crushed-fender', (x,2.17,z+.83), (.22,.40,.83), paint,(.12,0,.06))
    panel('flattened-car-roof', (0,2.86,z-.06), (width*.82,.13,1.8), rust, (.04,0,.05))

# Upper deck: distinct shoulders and wreck panels follow the ribcage instead of
# leaving a bare, boxy gantry.
cube('upper-storey-deck-girder', (0,3.25,-.25), (2.25,.38,5.7), iron, .06)
for side in (-1,1):
    beam('thick-neck-main', (side*.56,2.75,1.55), (side*.48,4.20,3.95), .43, steel, .36)
    beam('thick-neck-brace', (side*.92,2.82,1.10), (side*.78,4.08,3.7), .19, rust)
    panel('crushed-hood-shoulder', (side*1.0,3.15,1.38), (.32,.82,1.62), paint, (side*.08,.05,side*.12))
for x in (-.98,.98):
    beam('upper-storey-upright', (x,2.65,-2.5), (x*.85,4.05,-2.35), .17, rust)
    beam('upper-storey-upright', (x,2.65,2.2), (x*.85,4.05,1.95), .17, steel)
    beam('upper-deck-cross-girder', (x,3.38,-3.0), (x,3.38,2.8), .14, iron)
    plate_ribs('upper-deck-wreck-skin', (x*1.03,3.73,-.1), 7, .12,.62,4.9, rust)
for z in (-2.45,-.65,1.15):
    cube('upper-crushed-cabin-roof', (0,4.02,z), (1.75,.14,1.58), paint if z<0 else rust, .05)
    for x in (-.8,.8):
        beam('upper-cabin-pillar', (x,3.68,z-.67), (x*.82,4.62,z-.45), .11, steel)
        beam('upper-cabin-pillar', (x*.82,4.62,z-.45), (x,3.88,z+.57), .11, rust)

# Three clearly separated back targets. Each has whole and smashed states;
# broad hazard bands and heavy cables replace the old face-like paired dots.
for index,z in enumerate((-1.35,.10,1.55),1):
    x = -.48 if index == 2 else .48
    whole = cube(f'battery-box-{index}-whole', (x,4.30,z), (.92,.72,1.05), paint if index==1 else rust, .075)
    whole['state'] = 'whole'
    whole['batteryIndex'] = index
    for dx in (-.27,.27):
        cyl(f'battery-{index}-terminal', (x+dx,4.68,z), .10,.12,copper,'Y',10)
    for yy in (4.38,4.55,4.72):
        cube(f'battery-{index}-fluting', (x,yy,z+.535), (.66,.035,.035), iron, .01)
    for stripe in (-1,1):
        band = cube(f'battery-{index}-hazard-band-{stripe}', (x+stripe*.20,4.32,z+.538), (.13,.56,.035), hazard, .012)
        band.rotation_euler[2] = stripe * -.18
    beam(f'battery-{index}-green-live-cable', (x-.27,4.48,z),(x-.75,4.15,z-.52),.105,cable)
    beam(f'battery-{index}-copper-return-cable', (x+.27,4.48,z),(x+.76,4.08,z+.40),.09,copper)
    smashed = cube(f'battery-box-{index}-smashed', (x,4.16,z), (1.00,.38,1.0), rust, .025)
    smashed.rotation_euler=(.11*(index%2),0,(-1 if index%2 else 1)*.18)
    smashed['state'] = 'smashed'
    smashed['batteryIndex'] = index
    for dx in (-.30,.30):
        beam(f'battery-{index}-torn-strap', (x+dx,4.40,z-.4),(x+dx*.6,4.64,z+.42),.045,iron)

# The skull is a broad, angular side profile assembled from welded car panels.
# Its long upper muzzle and deep, separate lower jaw create a readable bite.
profile_prism('scrap-head-skull',[(4.42,3.65),(5.42,3.78),(5.76,4.30),(5.72,4.93),
    (5.42,5.45),(5.16,6.35),(4.78,6.55),(4.68,5.78),(4.30,5.20)],2.20,steel)
profile_prism('long-welded-dinosaur-muzzle',[(4.70,4.78),(5.20,4.90),(5.15,6.38),
    (4.78,6.55),(4.62,5.88)],1.72,rust)
panel('forehead-armor', (0,5.50,4.63), (1.88,.22,1.02),paint,(-.08,0,0))
for x in (-.87,.87):
    cyl('headlamp-rim', (x*1.12,4.96,4.54),.31,.25,iron,'X',16)
    cyl('headlamp-glass', (x*1.26,4.96,4.54),.205,.05,glass,'X',16)
    beam('welded-brow', (x*.88,5.30,4.67),(x*.64,5.55,4.75),.15,steel)
jaw_pivot=(0,4.18,4.08)
jaw=profile_prism('scrapasaurus-jaw',[(4.18,4.08),(3.58,4.12),(3.28,5.58),
    (3.35,6.45),(3.66,6.20),(3.92,5.05),(4.10,4.35)],1.78,steel,jaw_pivot)
jaw['hinge']=[0,4.18,4.08]
for x in (-.72,.72):
    beam('upper-jaw-tooth',(x,4.67,5.08),(x,4.10,5.38),.16,paint)
    beam('upper-jaw-tooth',(x,4.64,5.70),(x,4.12,5.88),.14,iron)
    beam('lower-jaw-tooth',(x,3.86,5.20),(x,4.28,5.43),.15,iron)
    beam('lower-jaw-tooth',(x,3.78,5.78),(x,4.15,5.98),.13,paint)
for frame, angle in ((1,.14),(16,.55),(31,.14)):
    jaw.rotation_euler[0]=angle
    jaw.keyframe_insert(data_path='rotation_euler',frame=frame,group='Jaw opens and bites')

# Tail spine, articulated segmented sheet armor, and visible piston rods.
tail = bpy.data.objects.new('scrapasaurus-tail', None)
bpy.context.collection.objects.link(tail); tail.parent=root_obj
tail['pivot']=[0,2.75,-3.05]
tail.location=(0,2.75,-3.05)
tail.matrix_parent_inverse=root_obj.matrix_world.inverted()
for i in range(7):
    t=i/6
    z=-3.0-5.4*t
    y=3.05-1.30*t+math.sin(t*math.pi)*.75
    width=1.42*(1-t)+.10
    seg=cube(f'tail-welded-segment-{i+1}',(0,y,z),(width,.76*(1-t)+.08,.96),rust if i%2==0 else steel,.035)
    seg.parent=tail; seg.matrix_parent_inverse=tail.matrix_world.inverted()
    for x in (-width*.4,width*.4):
        fin=panel('tail-torn-fin',(x,y+.21,z),(width*.34,.09,.50*(1-t)+.12),paint,(0,0,(-1 if x<0 else 1)*.22))
        fin.parent=tail; fin.matrix_parent_inverse=tail.matrix_world.inverted()
    if i<6:
        link=beam('tail-spine-link',(0,y,z-.4),(0,y-.12,z-.72),.13,iron)
        link.parent=tail;link.matrix_parent_inverse=tail.matrix_world.inverted()
for frame, angle in ((1,-.24),(16,.28),(31,-.24)):
    tail.rotation_euler[1]=angle
    tail.keyframe_insert(data_path='rotation_euler',frame=frame,group='Tail sways')

# Jaw tendons and a clearly visible pair of forward fire-breath nozzles. The
# game supplies the flame effect.
for x in (-.7,.7):
    beam('jaw-tendon-cable',(x,3.85,4.12),(x*.82,4.27,4.55),.075,copper)
    beam('fire-breath-nozzle',(x*1.18,3.88,5.92),(x*1.18,3.88,6.54),.44,rust)
    cyl('fire-breath-nozzle-rim',(x*1.18,3.88,6.55),.30,.08,iron,'Z',16)
    cyl('nozzle-dark-mouth',(x*1.18,3.88,6.60),.215,.04,rubber,'Z',12)
for z in (-2.8,2.6):
    for x in (-1.0,1.0):
        cyl('exposed-shock-coil',(x,1.08,z),.18,.54,paint,'Z',12)
        beam('shock-link',(x,1.25,z),(x*.8,1.83,z),.10,iron)

# Sparse chipped patches and weld beads break the repeated flat panel surfaces.
rng=np.random.default_rng(7231)
for i in range(112):
    side = -1 if i%2 else 1
    z = rng.uniform(-3.0,2.6)
    y = rng.uniform(1.45,3.9)
    size = (rng.uniform(.035,.11),rng.uniform(.025,.075),rng.uniform(.035,.13))
    cube('flaked-orange-oxide-scar',(side*rng.uniform(1.30,1.38),y,z),size,
         rust if i%4 else paint,.008)
for i in range(52):
    x=rng.uniform(-1.15,1.15);z=rng.uniform(-3.5,3.0)
    cyl('round-weld-bead',(x,2.39,z),.025,.018,iron,'Y',8)

# Make all meshes child objects of one root, with identity transforms for named nodes.
# Tail children intentionally retain local pivots under the animated tail node.
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH' and obj.parent is None:
        obj.parent=root_obj
        obj.location=(0,0,0);obj.rotation_euler=(0,0,0);obj.scale=(1,1,1)
        # Geometry is already expressed in scene space; preserve it in mesh coordinates.
        obj.matrix_parent_inverse= root_obj.matrix_world.inverted()

scene=bpy.context.scene
scene.frame_start=1;scene.frame_end=31
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world=bpy.data.worlds.new('Bowl night studio')
scene.world.color=(.035,.035,.035)
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.035,.04,.04,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.55
scene.view_settings.view_transform='AgX'
for loc,energy,color,size in [((-8,13,9),2100,(1.0,.72,.46),9),((9,8,-8),1600,(.38,.55,.75),8),((2,11,-2),900,(1.0,.42,.16),6)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.color=color;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((0,2.5,0))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(20,9,20))
camera=bpy.context.object;scene.camera=camera
camera.data.lens=38

def aim(position,target):
    camera.location=position
    direction=(Vector(target)-camera.location).normalized()
    up_axis=Vector((0,1,0))
    right=direction.cross(up_axis)
    if right.length_squared<1e-8:
        up_axis=Vector((0,0,1));right=direction.cross(up_axis)
    right.normalize()
    up=right.cross(direction).normalized()
    camera.rotation_euler=Matrix((right,up,-direction)).transposed().to_euler()

views=[('front',(0,8,23),(0,2.5,-3.5),1),
       ('quarter',(24,12,18),(0,2.6,-4.0),1),
       ('side-rest',(30,7,-4.5),(0,2.5,-4.5),1),
       ('side-bite',(30,7,-4.5),(0,2.5,-4.5),16),
       ('top',(0,29,-4.0),(0,0,-4.0),16)]

reference_objects=set()
stage=None
if not args.skip_renders:
    # The Titan is an actual game model, used only as a scale reference.
    before=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/unlocks/titan_monster.glb'))
    reference_objects=set(scene.objects)-before
    bpy.context.view_layer.update()
    reference_meshes=[obj for obj in reference_objects if obj.type=='MESH']
    titan_to_y_up=Euler((-math.pi/2,0,0)).to_matrix()
    corners=[titan_to_y_up @ (obj.matrix_world @ Vector(corner)) for obj in reference_meshes for corner in obj.bound_box]
    min_y=min(point.y for point in corners); max_y=max(point.y for point in corners)
    min_x=min(point.x for point in corners); max_x=max(point.x for point in corners)
    min_z=min(point.z for point in corners); max_z=max(point.z for point in corners)
    scale=2.25/max(.01,max_y-min_y)
    anchor=bpy.data.objects.new('review-only-titan-anchor',None);scene.collection.objects.link(anchor)
    for obj in reference_objects:
        if obj.parent is None:
            world=obj.matrix_world.copy();obj.parent=anchor;obj.matrix_parent_inverse=anchor.matrix_world.inverted();obj.matrix_world=world
    anchor.rotation_euler=(-math.pi/2,0,0)
    anchor.scale=(scale,scale,scale)
    anchor.location=(4.7-(min_x+max_x)*.5*scale,-min_y*scale,-11.7-(min_z+max_z)*.5*scale)
    reference_objects.add(anchor)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,.06,-3), rotation=(-math.pi/2,0,0))
    stage=bpy.context.object;stage.name='review-only-flat-floor';stage.data.materials.append(rubber)

def load_pixels(path):
    image=bpy.data.images.load(str(path),check_existing=False)
    w,h=image.size;pix=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(pix)
    pixels=pix.reshape(h,w,4)[::-1].copy();bpy.data.images.remove(image)
    return pixels

def draw_label(pixels, text, x, y, color=(.83,.76,.61)):
    font={'R':('11110','10001','10001','11110','10100','10010','10001'),
          'O':('01110','10001','10001','10001','10001','10001','01110'),
          'U':('10001','10001','10001','10001','10001','10001','01110'),
          'N':('10001','11001','11001','10101','10011','10011','10001'),
          'D':('11110','10001','10001','10001','10001','10001','11110'),
          '1':('00100','01100','00100','00100','00100','00100','01110'),
          '2':('01110','10001','00001','00010','00100','01000','11111'),
          ' ':('00000','00000','00000','00000','00000','00000','00000')}
    cursor=x
    for char in text:
        glyph=font[char]
        for row,line in enumerate(glyph):
            for col,bit in enumerate(line):
                if bit=='1': pixels[y+row*3:y+row*3+2,cursor+col*3:cursor+col*3+2,:3]=color
        cursor+=18

if not args.skip_renders:
    if not previous_sheet.exists():
        raise RuntimeError(f'Round-one comparison sheet is missing: {previous_sheet}')
    old_sheet=load_pixels(previous_sheet)
    round2=[]
    for name,position,target,frame in views:
        scene.frame_set(frame)
        aim(position,target)
        scene.render.filepath=str(evidence/f'{name}.png')
        bpy.ops.render.render(write_still=True)
        round2.append(load_pixels(evidence/f'{name}.png'))
    tile_w,tile_h=560,315;label_h=30;gap=12
    panel_w=tile_w*2;panel_h=(tile_h+label_h+gap)*3
    sheet_pixels=np.zeros((panel_h+label_h,panel_w*2,4),dtype=np.float32)
    sheet_pixels[:,:,:3]=(.035,.040,.039);sheet_pixels[:,:,3]=1
    draw_label(sheet_pixels,'ROUND 1',18,9)
    draw_label(sheet_pixels,'ROUND 2',panel_w+18,9)
    old_h,old_w=old_sheet.shape[:2]
    old_scale=min(panel_w/old_w,panel_h/old_h)
    old_w2,old_h2=round(old_w*old_scale),round(old_h*old_scale)
    old_resized=old_sheet[(np.arange(old_h2)/old_scale).astype(int)[:,None],(np.arange(old_w2)/old_scale).astype(int)[None,:]]
    old_x=(panel_w-old_w2)//2;old_y=label_h+(panel_h-old_h2)//2
    sheet_pixels[old_y:old_y+old_h2,old_x:old_x+old_w2]=old_resized
    for i,pix in enumerate(round2):
        h,w=pix.shape[:2];scale=min(tile_w/w,tile_h/h)
        nw,nh=round(w*scale),round(h*scale)
        sampled=pix[(np.arange(nh)/scale).astype(int)[:,None],(np.arange(nw)/scale).astype(int)[None,:]]
        ox=panel_w+(i%2)*tile_w+(tile_w-nw)//2
        oy=label_h+(i//2)*(tile_h+label_h+gap)+label_h+(tile_h-nh)//2
        sheet_pixels[oy:oy+nh,ox:ox+nw]=sampled
    sheet_img=bpy.data.images.new('BOWL ART REX rounds one and two',width=panel_w*2,height=panel_h+label_h,alpha=True)
    sheet_img.pixels.foreach_set(sheet_pixels[::-1].ravel())
    scene.render.image_settings.file_format='JPEG'
    for quality in (82,76,70,64,58):
        scene.render.image_settings.quality=quality
        sheet_img.filepath_raw=str(sheet);sheet_img.file_format='JPEG';sheet_img.save()
        if sheet.stat().st_size<=500_000: break
    bpy.data.images.remove(sheet_img)
    if sheet.stat().st_size>500_000:
        raise RuntimeError(f'Comparison sheet exceeds 500 KB: {sheet.stat().st_size}')
    for obj in list(reference_objects):
        if obj.name in bpy.data.objects: bpy.data.objects.remove(obj,do_unlink=True)
    if stage and stage.name in bpy.data.objects: bpy.data.objects.remove(stage,do_unlink=True)

# Export only the asset hierarchy, not review lights or camera.
def under_asset_root(obj):
    current=obj
    while current:
        if current==root_obj: return True
        current=current.parent
    return False
asset_objects=[obj for obj in bpy.context.scene.objects if obj.type in {'MESH','EMPTY'} and under_asset_root(obj)]
bpy.ops.object.select_all(action='DESELECT')
for obj in asset_objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
    export_yup=False,export_animations=True,export_materials='EXPORT',export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

triangles=sum(sum(len(poly.vertices)-2 for poly in obj.data.polygons) for obj in asset_objects if obj.type=='MESH')
if not (1000 < triangles <= 60000):
    raise RuntimeError(f'Scrapasaurus triangle budget failed: {triangles}')
print('BOWL_SCRAPASAURUS_RESULT '+json.dumps({'triangles':triangles,'bytes':output.stat().st_size,
      'sheetBytes':sheet.stat().st_size if sheet.exists() else None,
      'nodes':len(asset_objects),'round':args.round,'views':[name for name,_,_,_ in views],
      'sheet':str(sheet) if not args.skip_renders else None}))
