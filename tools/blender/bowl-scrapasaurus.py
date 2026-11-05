"""Build the Scrapasaurus, a two-storey welded junk dinosaur for Bowl Night five.

Run with Blender:
  blender -b --python-exit-code 1 --python tools/blender/bowl-scrapasaurus.py -- --root . --round 1

The model is authored in metres with +Y up and +Z forward. Separate identity
transform nodes keep the jaw, tail and three battery boxes easy to animate or
swap. The optional round render writes private PNG views and one JPG sheet.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--skip-renders', action='store_true')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
output = root / 'public/assets/models/wasteland/bowl/scrapasaurus.glb'
blend = root / 'art-build/bowl-scrapasaurus/scrapasaurus.blend'
evidence = root / '.evidence/2026-11-05/BOWL-ART-REX/round-1'
sheet = root / 'docs/board/looks/bowl-art-rex/round-1.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(output)],
                      'evidence': [str(evidence / f'{name}.png') for name in ('front', 'quarter', 'side', 'top')],
                      'summary': [str(sheet)]}))
    raise SystemExit(0)
if args.round != 1:
    parser.error('BOWL-ART-REX is limited to one review round in this lane run')

import bpy
import numpy as np
from mathutils import Vector

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
MATS = [steel, rust, paint, rubber, iron, copper, glass]

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

def plate_ribs(prefix, center, count, width, height, zspan, material=rust):
    x,y,z=center
    for i in range(count):
        t = i/max(1,count-1)-.5
        panel(f'{prefix}-corrugated-{i+1}', (x,y,z+t*zspan), (width,height,.11),
              material if i%3 else paint, (0,0,(i%2-.5)*.035))

# Rail bogie and two weathered rails, set up as a compact stage prop rather than a vehicle chassis.
for x in (-1.3, 1.3):
    cube('rail-bogie-longitudinal-frame', (x,.62,0), (.22,.32,10.8), iron, .04)
    for z in (-4.2,-2.1,0,2.1,4.2):
        beam('bogie-crossmember', (-1.7,.63,z), (1.7,.63,z), .19, rust)
    for z in (-4.3,-2.2,0,2.2,4.3):
        wheel('rail-wheel', x*1.12, .48, z, .48, .34)
    cyl('rail-bogie-axle', (x*1.12,.48,0), .105, 3.35, iron, 'X', 10)
    cube('forged-rail', (x*1.12,.08,0), (.25,.18,13.2), iron, .035)
    for z in (-5.4,-3.6,-1.8,0,1.8,3.6,5.4):
        cube('rail-sleeper', (0,-.04,z), (3.8,.14,.20), rust, .025)

# Lower storey: a battered wreck body over the main truss, with exposed ribs and salvaged car skins.
cube('lower-storey-main-girder', (0,1.28,0), (2.55,.48,8.1), steel, .08)
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

# A recognizable lower-deck pair of crushed car shells and their torn rooflines.
for idx,z in enumerate((-1.65,1.15)):
    width=2.0 if idx==0 else 2.15
    cube(f'lower-car-{idx+1}-crushed-floor', (0,2.06,z), (width,.16,2.65), steel, .04)
    for x in (-width*.45,width*.45):
        beam('crumpled-car-window-pillar', (x,2.05,z-1.05), (x*.82,3.05,z-.68), .13, rust)
        beam('crumpled-car-window-pillar', (x*.82,3.05,z-.68), (x*.94,2.50,z+.52), .13, iron)
        panel('crushed-fender', (x,2.17,z+.83), (.22,.40,.83), paint,(.12,0,.06))
    panel('flattened-car-roof', (0,2.86,z-.06), (width*.82,.13,1.8), rust, (.04,0,.05))

# Upper deck: stacked wreck sections form the high spine and shoulder, two distinct levels.
cube('upper-storey-deck-girder', (0,3.25,-.25), (2.25,.38,5.7), iron, .06)
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

# Three separately named battery boxes. Each has whole and smashed state meshes.
for index,z in enumerate((-1.65,0.0,1.65),1):
    x = -.48 if index == 2 else .48
    whole = cube(f'battery-box-{index}-whole', (x,4.57,z), (.78,.62,.98), paint if index==1 else rust, .065)
    whole['state'] = 'whole'
    whole['batteryIndex'] = index
    for dx in (-.2,.2):
        cyl(f'battery-{index}-terminal', (x+dx,4.90,z), .08,.08,copper,'Y',10)
    for yy in (4.38,4.55,4.72):
        cube(f'battery-{index}-fluting', (x,yy,z+.515), (.54,.035,.035), iron, .01)
    smashed = cube(f'battery-box-{index}-smashed', (x,4.48,z), (.89,.38,.93), rust, .025)
    smashed.rotation_euler=(.11*(index%2),0,(-1 if index%2 else 1)*.18)
    smashed['state'] = 'smashed'
    smashed['batteryIndex'] = index
    for dx in (-.22,.22):
        beam(f'battery-{index}-torn-strap', (x+dx,4.40,z-.4),(x+dx*.6,4.64,z+.42),.045,iron)

# Head, open jaw hinge, blunt welded teeth and lamp eyes.
for x in (-.68,.68):
    beam('neck-truss', (x,3.3,1.6),(x*1.15,4.15,4.15),.24,iron)
    beam('neck-diagonal', (x,3.55,2.0),(-x*.15,4.3,4.3),.15,rust)
cube('scrap-head-skull', (0,4.45,4.75), (1.62,1.02,2.0), steel,.18)
panel('forehead-armor', (0,4.93,5.10), (1.28,.19,1.08),rust,(-.08,0,0))
for x in (-.87,.87):
    cyl('headlamp-rim', (x,4.60,5.23),.23,.20,iron,'X',16)
    cyl('headlamp-glass', (x*1.13,4.60,5.23),.14,.035,glass,'X',16)
    beam('welded-brow', (x*.72,4.92,5.30),(x*.45,5.08,5.42),.095,rust)
for x in (-.54,-.27,0,.27,.54):
    beam('upper-jaw-tooth', (x,4.12,5.31),(x,3.94,5.61),.09,iron)
jaw = cube('scrapasaurus-jaw', (0,3.89,4.97), (1.48,.24,1.78), rust,.06)
jaw.rotation_euler[0]=math.radians(-15)
jaw['hinge'] = [0,4.06,4.20]
for x in (-.48,-.16,.16,.48):
    beam('lower-jaw-tooth', (x,4.01,5.42),(x,4.20,5.63),.08,paint)
for frame, angle in ((1,-.10),(16,.24),(31,-.10)):
    jaw.rotation_euler[0]=angle
    jaw.keyframe_insert(data_path='rotation_euler',frame=frame,group='Jaw opens and bites')

# Tail spine, articulated segmented sheet armor, and visible piston rods.
tail = bpy.data.objects.new('scrapasaurus-tail', None)
bpy.context.collection.objects.link(tail); tail.parent=root_obj
tail['pivot']=[0,3.55,-3.05]
tail.location=(0,3.55,-3.05)
tail.matrix_parent_inverse=root_obj.matrix_world.inverted()
for i in range(7):
    t=i/6
    z=-3.0-3.85*t
    y=3.48-1.55*t
    width=1.12*(1-t)+.18
    seg=cube(f'tail-welded-segment-{i+1}',(0,y,z),(width,.52*(1-t)+.15,.82),rust if i%2==0 else steel,.035)
    seg.parent=tail; seg.matrix_parent_inverse=tail.matrix_world.inverted()
    for x in (-width*.4,width*.4):
        fin=panel('tail-torn-fin',(x,y+.21,z),(width*.34,.09,.50*(1-t)+.12),paint,(0,0,(-1 if x<0 else 1)*.22))
        fin.parent=tail; fin.matrix_parent_inverse=tail.matrix_world.inverted()
    if i<6:
        link=beam('tail-spine-link',(0,y,z-.4),(0,y-.12,z-.72),.13,iron)
        link.parent=tail;link.matrix_parent_inverse=tail.matrix_world.inverted()
for frame, angle in ((1,-.08),(16,.12),(31,-.08)):
    tail.rotation_euler[1]=angle
    tail.keyframe_insert(data_path='rotation_euler',frame=frame,group='Tail sways')

# Railside jaw cable, coolant lines and two flame-breath exhaust muzzles (the game supplies the flame).
for x in (-.7,.7):
    beam('jaw-tendon-cable',(x,4.0,4.15),(x*.82,4.35,4.75),.055,iron)
    beam('fire-breath-nozzle',(x,3.70,3.55),(x,3.90,4.02),.19,rust)
    cyl('nozzle-dark-mouth',(x,3.90,4.04),.105,.025,rubber,'Z',12)
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
scene.view_settings.view_transform='AgX'
for loc,energy,color,size in [((-8,13,9),2100,(1.0,.72,.46),9),((9,8,-8),1600,(.38,.55,.75),8),((2,11,-2),900,(1.0,.42,.16),6)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.color=color;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((0,2.5,0))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(16,10,20))
camera=bpy.context.object;scene.camera=camera
camera.data.lens=52

def aim(position,target):
    camera.location=position
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()

views=[('front',(0,6.1,19),(0,2.6,.1)),
       ('quarter',(14,9,16),(0,2.7,.0)),
       ('side',(19,6.5,0),(0,2.5,0)),
       ('top',(0,22,-.5),(0,1.4,0))]
if not args.skip_renders:
    for name,position,target in views:
        aim(position,target)
        scene.render.filepath=str(evidence/f'{name}.png')
        bpy.ops.render.render(write_still=True)
    # Blender itself composes a four-view review sheet from the saved renders.
    tile_w,tile_h=560,315
    sheet_pixels=np.zeros((tile_h*2+72,tile_w*2,4),dtype=np.float32)
    sheet_pixels[:,:,:3]=(.055,.06,.06);sheet_pixels[:,:,3]=1
    for i,(name,_,_) in enumerate(views):
        image=bpy.data.images.load(str(evidence/f'{name}.png'),check_existing=False)
        w,h=image.size
        pix=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(pix)
        pix=pix.reshape(h,w,4)[::-1]
        scale=min(tile_w/w,tile_h/h)
        nw,nh=round(w*scale),round(h*scale)
        sampled=pix[(np.arange(nh)/scale).astype(int)[:,None],(np.arange(nw)/scale).astype(int)[None,:]]
        ox=(i%2)*tile_w+(tile_w-nw)//2
        oy=(i//2)*(tile_h+36)+36+(tile_h-nh)//2
        sheet_pixels[oy:oy+nh,ox:ox+nw]=sampled
        bpy.data.images.remove(image)
    sheet_img=bpy.data.images.new('BOWL ART REX round one · four views',width=tile_w*2,height=tile_h*2+72,alpha=True)
    sheet_img.pixels.foreach_set(sheet_pixels.ravel())
    scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=82
    sheet_img.filepath_raw=str(sheet);sheet_img.file_format='JPEG';sheet_img.save()
    bpy.data.images.remove(sheet_img)

# Export only the asset hierarchy, not review lights or camera.
asset_objects=[obj for obj in bpy.context.scene.objects if obj.type in {'MESH','EMPTY'} and (obj==root_obj or obj.parent is not None)]
bpy.ops.object.select_all(action='DESELECT')
for obj in asset_objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=True,export_materials='EXPORT',export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

triangles=sum(sum(len(poly.vertices)-2 for poly in obj.data.polygons) for obj in asset_objects if obj.type=='MESH')
if not (1000 < triangles <= 60000):
    raise RuntimeError(f'Scrapasaurus triangle budget failed: {triangles}')
print('BOWL_SCRAPASAURUS_RESULT '+json.dumps({'triangles':triangles,'bytes':output.stat().st_size,
      'nodes':len(asset_objects),'round':args.round,'views':[name for name,_,_ in views],
      'sheet':str(sheet) if not args.skip_renders else None}))
