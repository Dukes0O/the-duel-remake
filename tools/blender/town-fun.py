"""Build and inspect the Wasteland town funground from welded salvage."""
import json
import math
import subprocess
import sys
from pathlib import Path

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
root = Path(args[args.index('--root') + 1]).resolve() if '--root' in args else Path.cwd().resolve()
evidence = Path(args[args.index('--evidence') + 1]).resolve() if '--evidence' in args else root / '.evidence/2026-11-07/TOWN-ART-FUN/round-4'
out = root / 'public/assets/models/wasteland/town/fun.glb'
sheet = root / 'docs/board/looks/town-art-fun/round-4.jpg'
if '--paths-only' in args:
    print(json.dumps({'blend': [], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': [str(sheet)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

if '--review-only' in args:
    bpy.ops.import_scene.gltf(filepath=str(out))
    imported=bpy.data.objects.get('town-fun')
    if imported is None: raise RuntimeError('exported GLB lost town-fun family root')
    placements={'fountain':(-29,0,0),'tavern':(-15,0,0),'drive-in':(5,0,0),'wreck-ring':(35,0,0),
        'big-wheel':(-24,24,0),'scrap-coaster':(9,28,0),'mud-pit':(42,27,0),
        'fun-stall-a':(-37,-19,0),'fun-stall-b':(-29,-19,0),'statue':(-20,-19,0)}
    for obj in bpy.context.scene.objects:
        if obj.parent==imported and obj.name in placements: obj.location+=Vector(placements[obj.name])
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.eevee.taa_render_samples=24
    scene.render.resolution_x=900; scene.render.resolution_y=700; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
    world=bpy.data.worlds.new('Overcast daylight'); world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.56,.58,.60,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8; scene.world=world
    groundmat=bpy.data.materials.new('Review ground / dark packed earth'); groundmat.use_nodes=True
    groundmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.23,.20,.16,1)
    groundmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.96
    bpy.ops.mesh.primitive_plane_add(size=180,location=(0,0,-.08)); ground=bpy.context.object; ground.name='Review ground'; ground.data.materials.append(groundmat)
    def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    def area(name,location,power,size):
        data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
        obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); obj.location=location; aim(obj,(0,0,0))
    area('large north sky',(12,-22,34),3400,22); area('west sky',(-26,-4,24),2100,18)
    def camera(name,location,target,lens=52):
        data=bpy.data.cameras.new(name); obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj)
        obj.location=location; aim(obj,target); data.lens=lens; scene.camera=obj
    evidence.mkdir(parents=True,exist_ok=True)
    # Frame all ten built pieces individually at both promised elevations.
    # Imported GLB transforms are the review source, including the moving wheel.
    for object_id, (px, py, pz) in placements.items():
        root_obj=bpy.data.objects.get(object_id)
        members=[]
        def gather(parent):
            for child in parent.children:
                if child.type=='MESH': members.append(child)
                gather(child)
        if root_obj: gather(root_obj)
        corners=[obj.matrix_world @ Vector(corner) for obj in members for corner in obj.bound_box]
        if corners:
            lo=Vector((min(v.x for v in corners),min(v.y for v in corners),min(v.z for v in corners)))
            hi=Vector((max(v.x for v in corners),max(v.y for v in corners),max(v.z for v in corners)))
            centre=(lo+hi)*.5; span=max(hi-lo); height=hi.z-lo.z
        else:
            centre=Vector((px,py,pz+2)); span=4; height=4
        distance=max(span*1.7,7)
        for view, camera_pos, target_pos in (
            ('driver', (centre.x+span*.16,centre.y-distance,lo.z+height*.42), (centre.x,centre.y,lo.z+height*.42)),
            ('mayor', (centre.x+span*.62,centre.y-distance*.9,hi.z+max(span*.22,3)), (centre.x,centre.y,centre.z))):
            camera(f'{object_id} {view}', camera_pos, target_pos, 54)
            scene.render.resolution_x=640; scene.render.resolution_y=480
            scene.render.filepath=str(evidence/f'{object_id}-{view}.png')
            bpy.ops.render.render(write_still=True)
    camera('Fountain driver view',(placements['fountain'][0]+5,-8,2.2),(placements['fountain'][0],0,1.2),55)
    scene.render.filepath=str(evidence/'fountain-driver.png'); bpy.ops.render.render(write_still=True)
    camera('Fountain mayor view',(placements['fountain'][0]+7,-8,10),(placements['fountain'][0],0,0),55)
    scene.render.filepath=str(evidence/'fountain-above.png'); bpy.ops.render.render(write_still=True)
    camera('Mayor overview',(-8,-75,83),(2,0,13),46); scene.render.resolution_x=1600; scene.render.resolution_y=850
    scene.render.filepath=str(evidence/'family-above.png'); bpy.ops.render.render(write_still=True)
    camera('Driver overview',(0,-76,12),(0,0,5),34)
    scene.render.filepath=str(evidence/'family-driver.png'); bpy.ops.render.render(write_still=True)
    helper=root/'.qa-dist/town-fun-sheet.py'
    helper.write_text(r'''from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
root=Path.cwd(); e=root/'.evidence/2026-11-06/TOWN-ART-FUN/round-3'; dest=root/'docs/board/looks/town-art-fun/round-3.jpg'
photo=Image.open(root/'public/assets/models/wasteland/town/textures/fountain-front.jpg').convert('RGB')
page=Image.new('RGB',(1600,1390),(32,33,31)); draw=ImageDraw.Draw(page); fd=Path('C:/Windows/Fonts')
title=ImageFont.truetype(str(fd/'segoeuib.ttf'),34); label=ImageFont.truetype(str(fd/'segoeuib.ttf'),23); body=ImageFont.truetype(str(fd/'segoeui.ttf'),18)
draw.text((32,18),'WASTELAND TOWN FUN | ROUND 2',font=title,fill=(238,225,198)); draw.text((32,62),'Pressed bonnet basin, measured pipework, and full family evidence',font=body,fill=(207,196,174))
for i,(path,caption) in enumerate(((photo,'PHOTO REFERENCE'),(Image.open(e/'fountain-driver.png'),'IMPORTED GLB | DRIVER HEIGHT'))):
 x=32+i*768; draw.text((x,100),caption,font=label,fill=(220,178,117)); page.paste(ImageOps.fit(path.convert('RGB'),(748,530),method=Image.Resampling.LANCZOS),(x,134))
for i,(path,caption) in enumerate((('fountain-above.png','IMPORTED GLB | MAYOR VIEW'),('fountain-driver.png','IMPORTED GLB | FRONT DETAIL'))):
 x=32+i*768; draw.text((x,720),caption,font=label,fill=(220,178,117)); page.paste(ImageOps.fit(Image.open(e/path).convert('RGB'),(748,530),method=Image.Resampling.LANCZOS),(x,754))
draw.text((32,1320),'Reference crop and exported GLB views. Full family views are included below in the companion evidence set.',font=body,fill=(207,196,174))
dest.parent.mkdir(parents=True,exist_ok=True)
for quality in (82,76,70,64,58,54):
 page.save(dest,'JPEG',quality=quality,optimize=True,progressive=True)
 if dest.stat().st_size<=500000: break
if dest.stat().st_size>500000: raise RuntimeError(f'sheet exceeds 500 KB: {dest.stat().st_size}')
print(f'{dest} {dest.stat().st_size}')
''',encoding='utf-8')
    call=subprocess.run(['python',str(helper)],cwd=root,text=True,capture_output=True)
    print(call.stdout,end='')
    if call.returncode: raise RuntimeError(call.stderr)
    helper.unlink()
    raise SystemExit(0)

sys.path.insert(0, str(root / 'tools/blender'))
import town_base as town
from photo_carve import carve_object
from photo_model import Mesh as PhotoMesh, Photo, slab, trace

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
tex = root / 'public/assets/models/wasteland/town/textures'
mat = town.make_materials({
    'galvanised-tin': tex / 'corrugated-tin.jpg',
    'rusted-steel': tex / 'rusted-steel.jpg',
    'weathered-plank': tex / 'bleached-plank.jpg',
    'cracked-concrete': tex / 'dirt.jpg',
    'faded-hand-paint': tex / 'paint-blue.jpg',
    'sand': tex / 'wet-brown-earth.jpg',
    'patched-canvas': tex / 'patched-canvas.jpg',
})
mat['tire'] = bpy.data.materials.new('Town Fun / worn rubber')
mat['tire'].use_nodes = True
mat['tire'].diffuse_color = (.045, .047, .042, 1)
bs = mat['tire'].node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value = (.045, .047, .042, 1)
bs.inputs['Roughness'].default_value = .94
mat['water'] = bpy.data.materials.new('Town Fun / brown-green water')
mat['water'].use_nodes = True
mat['water'].diffuse_color = (.035, .055, .04, 1)
mat['water'].node_tree.nodes.clear()
water_emit=mat['water'].node_tree.nodes.new('ShaderNodeEmission')
water_emit.inputs['Color'].default_value=(.035,.05,.04,1); water_emit.inputs['Strength'].default_value=.75
water_out=mat['water'].node_tree.nodes.new('ShaderNodeOutputMaterial')
mat['water'].node_tree.links.new(water_emit.outputs[0],water_out.inputs['Surface'])
mat['lamp'] = bpy.data.materials.new('Town Fun / cinema phosphor')
mat['lamp'].use_nodes = True
mat['lamp'].node_tree.nodes.clear()
emit = mat['lamp'].node_tree.nodes.new('ShaderNodeEmission')
emit.inputs['Color'].default_value = (.82, .52, .20, 1)
emit.inputs['Strength'].default_value = 1.8
outnode = mat['lamp'].node_tree.nodes.new('ShaderNodeOutputMaterial')
mat['lamp'].node_tree.links.new(emit.outputs[0], outnode.inputs['Surface'])
for material in bpy.data.materials:
    bs = material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
    if bs and bs.inputs.get('Metallic'):
        bs.inputs['Metallic'].default_value = min(float(bs.inputs['Metallic'].default_value), .29)

family = bpy.data.objects.new('town-fun', None)
bpy.context.collection.objects.link(family)
current = None

def local(p): return p
def keep(o, parent=None):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    world = o.matrix_world.copy(); o.parent = parent or current; o.matrix_world = world
    return o
def building_root(name, cells):
    global current
    current = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(current); current.parent = family
    current['footprint_cells'] = cells
    return current
def box(name, c, s, material='rusted-steel', bevel=.025, parent=None):
    return keep(town.cube(name, c, s, mat[material], bevel), parent)
def beam(name, a, b, width, material='rusted-steel', parent=None):
    return keep(town.beam(name, a, b, width, mat[material]), parent)
def cyl(name, c, radius, depth, material='rusted-steel', sides=16, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
        location=town.game_vector(c))
    o=bpy.context.object; o.name=name; o.data.materials.append(mat[material]);
    for f in o.data.polygons: f.use_smooth = len(f.vertices)>4
    return keep(o, parent)
def torus(name,c,major,minor,material='rusted-steel',parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=10,
        minor_segments=5, location=town.game_vector(c))
    o=bpy.context.object; o.name=name; o.data.materials.append(mat[material]); return keep(o,parent)
def pipe(name, points, radius=.12, material='rusted-steel', parent=None):
    for i,(a,b) in enumerate(zip(points,points[1:])):
        va=town.game_vector(a); vb=town.game_vector(b); d=vb-va
        bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=d.length,location=(va+vb)*.5)
        o=bpy.context.object; o.name=f'{name}-{i+1}'; o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
        o.data.materials.append(mat[material]); keep(o,parent)
def wheel(name, c, radius, material='tire', parent=None):
    return torus(name,c,radius*.72,radius*.28,material,parent)
def car(name, center, scale=1.0, material='faded-hand-paint', parent=None):
    x,y,z=center; p=parent or current
    # A low, pressed shell with a raised cab and separate curved wheel rubber.
    box(name+':lower-shell',(x,y+.63*scale,z),(1.7*scale,.55*scale,3.75*scale),material,.14*scale,p)
    box(name+':cab-shell',(x,y+1.12*scale,z+.05*scale),(1.35*scale,.62*scale,1.75*scale),'rusted-steel',.17*scale,p)
    for side in (-1,1):
        for dz in (-1.18,1.18):
            wheel(name+f':tyre-{side}-{dz}',(x+side*.87*scale,y+.42*scale,z+dz*scale),.42*scale,'tire',p)
    # bent bumper and sill give the body a connected, automotive profile
    beam(name+':front-bumper',(x-.92*scale,y+.54*scale,z-1.92*scale),(x+.92*scale,y+.54*scale,z-1.92*scale),.12*scale,'galvanised-tin',p)
    beam(name+':rear-bumper',(x-.92*scale,y+.51*scale,z+1.92*scale),(x+.92*scale,y+.51*scale,z+1.92*scale),.12*scale,'rusted-steel',p)

# Photo-carved bonnet basin from measured side, end and plan grids.
building_root('fountain','1x1')
fountain=carve_object('fountain:bonnet',mat,{
    'photos':{'side':tex/'fountain-side.jpg','front':tex/'fountain-front.jpg',
              'rear':tex/'fountain-front.jpg','top':tex/'fountain-above.jpg'},
    'length':6.8,'width':6.8,'height':6.6,
    'side':{'start':130,'end':640,'ground':650},
    'front':{'centre':355,'ground':650,'top':40},
    'rear':{'centre':355,'ground':650,'top':40},
    'top':{'front':620,'rear':80,'centre':355},
    'mask_dir':str(evidence/'masks'),'voxel':.055,'target':1650,
})
keep(fountain)
water=cyl('fountain:water',(0,1.05,0),1.25,.025,'water',32)
water['emissive']=True
# Photo-carved tavern; the only supplied elevation is reused as measured input.
building_root('tavern','2x2')
tavern_photo=tex/'tavern.jpg'
tavern=carve_object('tavern:body',mat,{
    'photos':{'side':tavern_photo,'front':tavern_photo,'rear':tavern_photo,'top':tavern_photo},
    'length':14.0,'width':14.0,'height':9.2,
    'side':{'start':45,'end':885,'ground':590},
    'front':{'centre':460,'ground':590,'top':15},
    'rear':{'centre':460,'ground':590,'top':15},
    'top':{'front':50,'rear':590,'centre':460},
    'mask_dir':str(evidence/'masks'),'voxel':.08,'target':4600,
})
keep(tavern)
# Drive-in screen and rows of battered cars, aimed toward the road-facing screen.
building_root('drive-in','4x3')
for x in (-8,8):
    beam(f'drive-in:screen-leg-{x}',(x,.25,-10),(x,10,-10),.30,'weathered-plank')
for y in (1,9.4): beam(f'drive-in:screen-frame-{y}',(-9,y,-10),(9,y,-10),.28,'rusted-steel')
for x in range(-8,9,2): box(f'drive-in:screen-sheet-{x}',(x,5.1,-9.93),(1.9,7.6,.12),'galvanised-tin',.035)
box('drive-in:screen',(0,5.15,-9.82),(12.4,5.9,.045),'lamp',.005)
for row,z in enumerate((-4,1,6),1):
    for col,x in enumerate((-8,-4,0,4,8),1):
        car(f'drive-in:wreck-{row}-{col}',(x,.02,z),.72,('rusted-steel','faded-hand-paint','galvanised-tin')[(row+col)%3])
for x in (-10,10): beam(f'drive-in:perimeter-post-{x}',(x,.1,-9),(x,1.8,-9),.12,'rusted-steel')

# Four shell bumper cars inside a bank of real tyres, each a separately movable node.
building_root('wreck-ring','3x3')
for i in range(32):
    a=math.tau*i/32; x=8.2*math.cos(a); z=8.2*math.sin(a)
    wheel(f'wreck-ring:tyre-wall-{i+1}',(x,.72,z),.82,'tire')
    wheel(f'wreck-ring:upper-tyre-{i+1}',(x,1.72,z),.82,'tire')
for i,a in enumerate((.25,1.82,3.40,4.95),1):
    p=bpy.data.objects.new(f'wreck-ring:car-{i}',None); bpy.context.collection.objects.link(p); p.parent=current
    car(f'wreck-ring:bumper-car-{i}',(4.1*math.cos(a),.12,4.1*math.sin(a)),.76,('faded-hand-paint','galvanised-tin','rusted-steel','patched-canvas')[i-1],p)

# Big wheel: trace the open photo silhouette and its spokes as a slab on its true hub.
building_root('big-wheel','3x3')
for side in (-1,1):
    beam(f'big-wheel:A-frame-{side}-left',(-7.2,.3,0),(0,11.4,0),.32,'rusted-steel')
    beam(f'big-wheel:A-frame-{side}-right',(7.2,.3,0),(0,11.4,0),.32,'rusted-steel')
    beam(f'big-wheel:axle-{side}',(0,11.4,side*.72),(0,11.4,side*1.32),.48,'galvanised-tin')
wheel_pivot=bpy.data.objects.new('big-wheel:wheel',None); bpy.context.collection.objects.link(wheel_pivot); wheel_pivot.parent=current
wheel_pivot.location=town.game_vector((0,11.4,0)); wheel_pivot.rotation_euler[1]=math.radians(18)
wheel_photo=Photo(tex/'big-wheel.jpg')
wheel_sky=wheel_photo.sky([(8,8),(891,8),(8,658),(891,658),
    (120,220),(190,125),(300,80),(515,80),(680,130),(790,220),
    (820,345),(770,460),(680,535),(545,580),(365,580),(230,545),(130,460)],tolerance=24,grey=20)
loops=trace(~wheel_sky,(45,10,890,650),tolerance=2.2,min_area=95)
def wheel_point(px,py,depth):
    return ((px-450)*.0228, (638-py)*.0228, depth)
wheel_mesh=PhotoMesh()
slab(wheel_mesh,'wheel',wheel_photo,loops,wheel_point,-.11,.11,wall_scale=.0228)
wheel_obj=wheel_mesh.finish('big-wheel:photo-traced-wheel',{'wheel':wheel_photo.material()})
keep(wheel_obj,wheel_pivot)
# Compact coaster: welded tower, inclined lead-in, broad loop, steep return drop, and movable train.
building_root('scrap-coaster','6x4')
for x in (-18,-12,-6,0,6,12,18):
    for z in (-10,0,10):
        h=4.0+3.0*(1-abs(x)/20)+2.5*(z==0)
        beam(f'scrap-coaster:scaffold-post-{x}-{z}',(x,.1,z),(x,h,z),.22,'rusted-steel')
        if abs(x)<18: beam(f'scrap-coaster:cross-brace-{x}-{z}',(x,.3,z),(x+6,h*.68,z),.11,'galvanised-tin')
        beam(f'scrap-coaster:bay-tie-{x}-{z}',(x,h*.53,-10),(x,h*.53,10),.12,'weathered-plank')
# Thick track rails: a high approach, a full loop, then a sharp falling return.
track=[(-20,2.5,0),(-15,4,0),(-10,7,0),(-6,12,0),(-3,13,0),(0,12,0)]
for i in range(1,17):
    a=math.pi*2*i/16; track.append((5+4.4*math.cos(a),7.2+4.4*math.sin(a),0))
track.extend([(10,11,0),(13,8,0),(16,3.2,0),(20,2.4,0)])
for rail in (-.46,.46):
    pts=[(x,y,z+rail) for x,y,z in track]
    pipe(f'scrap-coaster:track-rail-{rail}',pts,.10,'galvanised-tin')
for i,(x,y,z) in enumerate(track[::2]): beam(f'scrap-coaster:cross-tie-{i}',(x,y-.15,z-.55),(x,y-.15,z+.55),.12,'rusted-steel')
train=bpy.data.objects.new('scrap-coaster:train',None);bpy.context.collection.objects.link(train);train.parent=current
for i in range(3):
    car(f'scrap-coaster:salvage-car-{i+1}',(-15+i*1.35,4.3,0),.56,'faded-hand-paint',train)
    beam(f'scrap-coaster:coupler-{i}',(-14+i*1.35,4.0,0),(-13.6+i*1.35,4.0,0),.09,'rusted-steel',train)

# Sunken mud oval with sloped scarps and the one small timber viewing stand.
building_root('mud-pit','4x4')
for i in range(24):
    a=math.tau*i/24; x=13.1*math.cos(a);z=12.7*math.sin(a)
    beam(f'mud-pit:rim-post-{i}',(x,.2,z),(x*.92,2.2,z*.92),.20,'weathered-plank')
    if i%2==0: beam(f'mud-pit:scarp-brace-{i}',(x,.4,z),(x*.92,2.1,z*.92),.11,'rusted-steel')
for side in (-1,1):
    ramp=box(f'mud-pit:jump-ramp-{side}',(side*7,1.0,-4),(6.6,1.5,4.8),'sand',.2)
    ramp.rotation_euler[2]=side*.25
for x in (-2.0,0,2.0):
    beam(f'mud-pit:grandstand-leg-{x}',(x,1.0,-12),(x,3.0,-14),.12,'weathered-plank')
box('mud-pit:grandstand-bench',(0,3.05,-13),(5.6,.18,2.5),'weathered-plank',.05)
for y in (1.9,2.5): beam(f'mud-pit:grandstand-rail-{y}',(-2.5,y,-14),(2.5,y,-14),.09,'rusted-steel')
for i in range(4): box(f'mud-pit:tyre-chicane-{i}',(-5+i*3,.28,2.2),(.95,.55,.72),'tire',.05)

# Two roadside stalls: one hand-painted can target range, one patched sweets counter.
for stall in ('fun-stall-a','fun-stall-b'):
    building_root(stall,'1x1')
    if stall.endswith('a'):
        for x in (-2.3,2.3): beam(f'{stall}:lean-post-{x}',(x,.15,-2),(x+.15,3.4,-2),.12,'weathered-plank')
        for i in range(3): box(f'{stall}:hit-can-{i}',(-1.35+i*.6,.28,-.4),(.28,.38,.28),'galvanised-tin',.025)
        beam(f'{stall}:throw-line',(-2.5,.04,1.4),(2.5,.04,1.4),.08,'rusted-steel')
        for x in (-1.5,0,1.5): box(f'{stall}:hand-painted-target-{x}',(x,1.4,-.15),(.8,.7,.05),'faded-hand-paint',.03)
    else:
        for x in (-2.4,2.4): beam(f'{stall}:awning-post-{x}',(x,.15,-2),(x,3.6,-2),.12,'rusted-steel')
        for x in (-1.6,0,1.6):
            box(f'{stall}:sweets-crate-{x}',(x,1.25,-.8),(1.25,.75,.8),'weathered-plank',.04)
            for i in range(4): cyl(f'{stall}:jar-{x}-{i}',(x-.42+i*.28,1.86,-.8),.10,.28,'galvanised-tin',12)
        for i in range(5): box(f'{stall}:patchwork-awning-{i}',(i*.9-1.8,3.45,-.65),(1.0,.10,2.8),'patched-canvas',.01)

# First Wasteland scrap portrait: joined steel limbs with one raised arm and a blank plaque.
building_root('statue','1x1')
box('statue:plinth',(0,.48,.15),(2.8,.85,2.5),'cracked-concrete',.12)
for i in range(4): box(f'statue:plinth-patch-{i}',(i*.55-1.0,.94,-.9),(.48,.08,.08),'galvanised-tin',.01)
cyl('statue:waist-hub',(0,2.0,0),.58,.5,'rusted-steel',12)
beam('statue:torso',(-.08,1.95,0),(.12,4.15,0),.52,'rusted-steel')
cyl('statue:head',(.10,4.66,0),.62,.68,'galvanised-tin',12)
beam('statue:neck',(.10,4.3,0),(.1,4.4,0),.25,'rusted-steel')
for s in (-1,1):
    beam(f'statue:leg-{s}',(-.12,2.05,0),(s*.48,1.08,-.02),.29,'rusted-steel')
    box(f'statue:boot-{s}',(s*.50,.96,-.18),(.52,.2,.62),'galvanised-tin',.05)
beam('statue:lower-arm-left',(-.28,3.55,0),(-1.0,2.7,0),.24,'rusted-steel')
beam('statue:lower-arm-right',(.35,3.65,0),(1.15,4.55,0),.24,'rusted-steel')
beam('statue:raised-forearm',(1.15,4.55,0),(1.25,5.55,0),.20,'galvanised-tin')
for i in range(4): beam(f'statue:raised-finger-{i}',(1.25+i*.06,5.45,0),(1.22+i*.08,5.82,0),.07,'rusted-steel')
box('statue:blank-plaque',(0,1.58,-1.18),(1.25,.8,.10),'weathered-plank',.04)

# Assign every mesh the one shared picture-coordinate layer name before export.
for obj in bpy.data.objects:
    if obj.type=='MESH' and obj.data.uv_layers.active:
        obj.data.uv_layers.active.name='UVMap'
for image in bpy.data.images:
    if image.packed_file and image.size[0] > 256:
        image.scale(256,256)
        image.pack()
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
    export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=64)

import subprocess
blender=r'C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe'
with (root/'.qa-dist/town-art-fun-review.log').open('w',encoding='utf-8') as log:
    result=subprocess.run([blender,'--background','--python',str(Path(__file__).resolve()),'--','--review-only'],cwd=root,stdout=log,stderr=subprocess.STDOUT)
if result.returncode: raise RuntimeError('imported-GLB view render failed; see .qa-dist/town-art-fun-review.log')
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'sheet':str(sheet),'sheet_bytes':sheet.stat().st_size}))
