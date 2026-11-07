"""Build and inspect the Wasteland town funground from welded salvage."""
import json
import math
import subprocess
import sys
from pathlib import Path

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
root = Path(args[args.index('--root') + 1]).resolve() if '--root' in args else Path.cwd().resolve()
evidence = Path(args[args.index('--evidence') + 1]).resolve() if '--evidence' in args else root / '.evidence/2026-11-07/TOWN-ART-FUN/round-7'
out = root / 'public/assets/models/wasteland/town/fun.glb'
sheet = root / 'docs/board/looks/town-art-fun/round-7.jpg'
if '--paths-only' in args:
    print(json.dumps({'blend': [], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': [str(sheet)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector

if '--review-only' in args:
    bpy.ops.import_scene.gltf(filepath=str(out))
    scene=bpy.context.scene
    family=bpy.data.objects.get('town-fun')
    if family is None: raise RuntimeError('exported GLB lost town-fun family root')
    tavern_root=bpy.data.objects.get('tavern')
    truck_root=bpy.data.objects.get('tavern:truck')
    if tavern_root is None or truck_root is None: raise RuntimeError('exported tavern or truck root is missing')
    def hide_tree(obj,value):
        obj.hide_render=value
        for child in obj.children: hide_tree(child,value)
    for child in family.children:
        if child != tavern_root: hide_tree(child,True)
    scene.render.engine='BLENDER_EEVEE_NEXT'; scene.eevee.taa_render_samples=24
    scene.render.resolution_x=640; scene.render.resolution_y=480; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
    scene.render.film_transparent=False; scene.view_settings.view_transform='Standard'
    world=bpy.data.worlds.new('Tavern review grey'); world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.43,.43,.43,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8; scene.world=world
    groundmat=bpy.data.materials.new('Tavern review ground'); groundmat.diffuse_color=(.43,.43,.43,1)
    groundmat.use_nodes=True; groundmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.43,.43,.43,1)
    bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.04)); bpy.context.object.name='Review ground'; bpy.context.object.data.materials.append(groundmat)
    def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    def light(name,loc,power,size):
        data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
        obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); obj.location=loc; aim(obj,(0,0,3))
    light('soft studio key',(8,12,17),1800,12); light('soft studio fill',(-10,-6,12),1100,10)
    camera=bpy.data.objects.new('Tavern bounds camera',bpy.data.cameras.new('Tavern bounds camera'))
    scene.collection.objects.link(camera); scene.camera=camera; camera.data.type='ORTHO'
    evidence.mkdir(parents=True,exist_ok=True)
    textures=root/'public/assets/models/wasteland/town/textures'
    truck_bounds=[]
    for obj in truck_root.children_recursive:
        if obj.type=='MESH':
            truck_bounds.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not truck_bounds: raise RuntimeError('exported truck has no visible geometry')
    truck_min=Vector(tuple(min(p[i] for p in truck_bounds) for i in range(3)))
    truck_max=Vector(tuple(max(p[i] for p in truck_bounds) for i in range(3)))
    truck_target=(truck_min+truck_max)*.5
    truck_size=max(truck_max-truck_min)
    truck_views=[
        ('truck-side',(0,1,.10),'tavern-truck-side.jpg'),
        ('truck-front',(1,0,.10),'tavern-truck-front.jpg'),
        ('truck-rear',(-1,0,.10),'tavern-truck-rear.jpg'),
        ('truck-top',(0,0,1),'tavern-truck-top.jpg'),
        ('truck-three-quarter-road',(-.65,-.65,.45),None),
        ('truck-three-quarter-rear',(.65,.65,.45),None),
    ]
    for name,direction,photo_name in truck_views:
        # Show only the truck for direct comparison with its photo.
        hide_tree(tavern_root,True)
        hide_tree(truck_root,False)
        direction=Vector(direction).normalized()
        camera.location=truck_target+direction*(truck_size*3.1)
        aim(camera,truck_target); camera.data.ortho_scale=truck_size*1.38
        model_path=evidence/f'{name}.png'
        scene.render.filepath=str(model_path); bpy.ops.render.render(write_still=True)
    for child in family.children:
        hide_tree(child,child!=tavern_root)
    hide_tree(tavern_root,False)
    hide_tree(truck_root,False)
    views=[
        ('side',(-1,0,.16),'tavern-side.jpg',False),
        ('front',(0,1,.16),'tavern-front.jpg',False),
        ('rear',(0,-1,.16),'tavern-rear.jpg',False),
        ('above',(0,0,1),'tavern-top.jpg',False),
        ('truck-wall',(0,1,.16),'tavern-front-with-truck.jpg',True),
        ('three-quarter-road',(-.65,1,.58),None,True),
        ('three-quarter-rear',(.65,-1,.58),None,True),
        ('mayor',(-.5,1,.95),None,True),
    ]
    for name,direction,photo_name,show_truck in views:
        hide_tree(truck_root,not show_truck)
        target=Vector((0,0,3.35)); direction=Vector(direction).normalized()
        camera.location=target+direction*30; aim(camera,target); camera.data.ortho_scale=11.5
        scene.render.filepath=str(evidence/f'tavern-{name}.png'); bpy.ops.render.render(write_still=True)
        print(f'rendered tavern {name}')
    wheel_root=bpy.data.objects.get('big-wheel')
    if wheel_root is None: raise RuntimeError('exported big-wheel is missing')
    for child in family.children: hide_tree(child,child!=wheel_root)
    hide_tree(wheel_root,False)
    wheel_views=[('side',(1,0,0),'big-wheel-side.jpg'),('front',(0,-1,0),'big-wheel-front.jpg'),
        ('rear',(0,1,0),'big-wheel-rear.jpg'),('above',(0,0,1),'big-wheel-top.jpg'),
        ('three-quarter-a',(1,-1,.65),None),('three-quarter-b',(-1,1,.65),None),
        ('mayor',(-1,-1,1),None)]
    for name,direction,_photo_name in wheel_views:
        direction=Vector(direction).normalized(); target=Vector((0,0,5.1))
        camera.location=target+direction*32; aim(camera,target); camera.data.ortho_scale=12.5
        scene.render.resolution_x=720; scene.render.resolution_y=600
        scene.render.filepath=str(evidence/f'big-wheel-{name}.png'); bpy.ops.render.render(write_still=True)
        print(f'rendered big wheel {name}')
    raise SystemExit(0)

sys.path.insert(0, str(root / 'tools/blender'))
import town_base as town
from photo_carve import carve_object, lift_if_dark
from photo_model import Mesh as PhotoMesh, Photo, slab, trace
from hull_model import tyre

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
fountain=carve_object('fountain:bonnet',tex,{
    'photos':{'side':'fountain-side.jpg','front':'fountain-front.jpg',
              'rear':'fountain-front.jpg','top':'fountain-above.jpg'},
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
# Round 5 rebuild: four independent measured photos, scaled from its two-metre door.
building_root('tavern','2x2')
tavern_root=current
tavern=carve_object('tavern:body',tex,{
    'photos':{'side':'tavern-side.jpg','front':'tavern-front.jpg',
              'rear':'tavern-rear.jpg','top':'tavern-top.jpg'},
    'length':6.2,'width':7.4,'height':6.9,
    'side':{'start':100,'end':540,'ground':535},
    'front':{'centre':320,'ground':530,'top':52},
    'rear':{'centre':327,'ground':522,'top':58},
    'top':{'front':45,'rear':515,'centre':320,'x_scale':7.4/520},
    'keep':lambda x,y,z: ~((abs(x)<.96)&(y<2.05)&(z < -6.2/2+.42)),
    'cut':{'front':[(235,380,410,535)]},
    'grey':26,'tolerance':40,'bleed_tolerance':48,
    'mask_dir':str(evidence/'masks'),'voxel':.045,'target':2700,
})
keep(tavern)
door_dark=bpy.data.materials.new('tavern dark doorway')
door_dark.diffuse_color=(.012,.010,.008,1)
door_dark.use_nodes=True
door_dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.012,.010,.008,1)
door_dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
mat['door-dark']=door_dark
box('tavern:doorway-interior',(0,1.03,-2.78),(1.82,2.0,.035),'door-dark',.005)
# The truck is a separate four-photo carve. Its nose overlaps the tavern's
# road-facing wall; the measured tyres reach the shared ground plane.
truck_root=bpy.data.objects.new('tavern:truck',None)
bpy.context.collection.objects.link(truck_root)
truck_root.parent=tavern_root
truck_root.location=town.game_vector((-1.65,0,-3.35))
truck=carve_object('tavern:truck-body',tex,{
    'photos':{'side':'tavern-truck-side.jpg','front':'tavern-truck-front.jpg',
              'rear':'tavern-truck-rear.jpg','top':'tavern-truck-top.jpg'},
    'length':5.5,'width':2.35,'height':2.7,
    'side':{'start':25,'end':785,'ground':465},
    'front':{'centre':244,'ground':482,'top':116},
    'rear':{'centre':247,'ground':490,'top':111},
    # The overhead reference lies across the frame: the bonnet is at x=45,
    # the tailgate at x=765, and the body centreline is y=280.
    'top':{'front':45,'rear':765,'centre':280,'along':'x','x_scale':2.35/(410-145)},
    # Rear of the cab is the front wall of an open timber load bed. Preserve
    # its floor while clearing the space between the side boards.
    'keep':lambda x,y,z: ~((abs(x)<.87)&(y>.78)&(y<2.8)&(z<-.28)&(z>-2.58)),
    'wheels':[(-1.56,.50,.72),(1.96,.50,.72)],
    'cut':{
        'side':[(0,465,809,541)],
        'front':[(0,482,485,541)],
        'rear':[(0,490,491,541)],
    },
    'forward':1,'side_front_on_left':True,
    'grey':26,'tolerance':42,'bleed_tolerance':50,
    'mask_dir':str(evidence/'masks'),'voxel':.035,'target':1500,
})
truck.parent=truck_root

# Four independent tyres wear the measured sidewall and end-view tread instead
# of retaining the photographed wheels as flat patches on the carved body.
_side_photo=Photo(tex/'tavern-truck-side.jpg')
_front_photo=Photo(tex/'tavern-truck-front.jpg')
_wheel_specs=((1.96,137,130),(1.96,137,350),(-1.56,622,142),(-1.56,622,350))
for _z,_side_px,_end_px in _wheel_specs:
    _x=-.72 if _end_px<240 else .72
    _centre=(_x,.50,_z)
    _wheel=PhotoMesh()
    tyre(_wheel,'side',_side_photo,_side_px,400,69,.50,.26,
         'front',_front_photo,_end_px,35,405,470,sides=14)
    _wheel_obj=_wheel.finish(f'tavern:truck-wheel-{_z}-{_x}',
        {'side':_side_photo.material(),'front':_front_photo.material()})
    keep(_wheel_obj,truck_root).location=town.game_vector(_centre)

def measured_bounds(obj):
    bpy.context.view_layer.update()
    points=[obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    return tuple((min(p[i] for p in points),max(p[i] for p in points)) for i in range(3))

# As in the photo, the truck lies along the road side of the tavern, seen side
# on from the road, with its nose driven into the tavern's corner.
import math as _math
truck_root.rotation_euler=(0,0,_math.pi/2)
_tavern=measured_bounds(tavern); _truck=measured_bounds(truck)
truck_root.location.x+=(_tavern[0][0]+1.0)-_truck[0][1]
truck_root.location.y+=(_tavern[1][1]-1.3)-(_truck[1][0]+_truck[1][1])/2

for label,obj in (('tavern',tavern),('truck',truck)):
    bounds=measured_bounds(obj)
    print(f'{label} bounds Blender XYZ:',json.dumps(bounds))
    if bounds[2][0] < -.035 or bounds[2][0] > .035:
        raise RuntimeError(f'{label} does not touch the ground: {bounds[2]}')
tavern_bounds=measured_bounds(tavern)
truck_bounds=measured_bounds(truck)
touches=all(truck_bounds[i][0] <= tavern_bounds[i][1]+.03 and tavern_bounds[i][0] <= truck_bounds[i][1]+.03 for i in range(3))
print('truck intersects tavern bounds:',touches)
if not touches:
    raise RuntimeError('tavern truck does not touch the tavern')
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

# Big wheel: paired photo-traced rims turn around the true axle; the seats are
# separate photo-carved parts carried around the rim.
building_root('big-wheel','3x3')
wheel_photo=Photo(tex/'big-wheel-side.jpg',frame=(256,171))
wheel_scale=8.0/154.5; wheel_cx,wheel_cy,wheel_radius=128,85.5,77.25; wheel_center_y=5.25
lift_if_dark(wheel_photo)
wheel_sky=wheel_photo.sky([(8,8),(1015,8),(8,675),(1015,675),
    (512,180),(800,342),(512,500),(220,342)],tolerance=25,grey=24)
wheel_mask=~wheel_sky
wheel_loops=trace(wheel_mask,(44,0,212,171),tolerance=1.0,min_area=30)
if not wheel_loops: raise RuntimeError('big-wheel side photo has no traced steel')
wheel_pivot=bpy.data.objects.new('big-wheel:wheel',None); bpy.context.collection.objects.link(wheel_pivot); wheel_pivot.parent=current
wheel_pivot.location=town.game_vector((0,wheel_center_y,0)); wheel_pivot.rotation_euler[0]=0
def wheel_point(px,py,depth): return (depth,(px-wheel_cx)*wheel_scale,(wheel_cy-py)*wheel_scale)
for side,depth in enumerate((-.5,.5),1):
    wheel_mesh=PhotoMesh(); slab(wheel_mesh,'wheel',wheel_photo,wheel_loops,wheel_point,depth-.045,depth+.045,wall_scale=.004)
    wheel_obj=wheel_mesh.finish(f'big-wheel:photo-traced-rim-{side}',{'wheel':wheel_photo.material()})
    wheel_obj.parent=wheel_pivot
    wheel_obj.location=(0,0,0)
cyl('big-wheel:truck-axle',(0,wheel_center_y,0),.28,1.0,'rusted-steel',20)

seat=carve_object('big-wheel:seat-source',tex,{
    'photos':{'side':'big-wheel-seat-side.jpg','front':'big-wheel-seat-front.jpg','rear':'big-wheel-seat-rear.jpg','top':'big-wheel-seat-top.jpg'},
    'length':.72,'width':.62,'height':.92,
    'side':{'start':70,'end':950,'ground':900},'front':{'centre':341,'ground':980,'top':90},
    'rear':{'centre':341,'ground':980,'top':90},'top':{'front':60,'rear':980,'centre':341},
    'voxel':.04,'target':350,'grey':26,'tolerance':35,'mask_dir':str(evidence/'masks')})
for i in range(8):
    angle=math.tau*i/8; z=math.cos(angle)*wheel_radius*wheel_scale; y=math.sin(angle)*wheel_radius*wheel_scale
    chair=seat.copy(); chair.data=seat.data; bpy.context.collection.objects.link(chair); chair.name=f'big-wheel:seat-{i+1}'
    chair.parent=wheel_pivot; chair.location=town.game_vector((0,y-.52,z)); chair.rotation_euler[0]=-angle
bpy.data.objects.remove(seat,do_unlink=True)

# Trace the isolated A-frame photo so no wheel, seat or studio panel enters the mask.
frame_photo=Photo(tex/'big-wheel-frame.jpg'); frame_rgb=frame_photo.rgb(); leg_mask=frame_rgb.mean(axis=2)<110
frame_scale=5.25/(918-14); frame_cx=654; frame_ground=918
leg_loops=trace(leg_mask,(80,10,1020,930),tolerance=1.5,min_area=120)
def frame_point(px,py,depth): return (depth,(frame_ground-py)*frame_scale,(px-frame_cx)*frame_scale)
frame_mesh=PhotoMesh(); slab(frame_mesh,'frame',frame_photo,leg_loops,frame_point,-.38,.38,wall_scale=.004)
frame_obj=frame_mesh.finish('big-wheel:traced-a-frame',{'frame':frame_photo.material()}); keep(frame_obj)

# Report every wheel piece in game axes (X, horizontal depth, Y up, Z horizontal).
wheel_pieces=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('big-wheel:')]
for piece in wheel_pieces:
    points=[piece.matrix_world @ Vector(corner) for corner in piece.bound_box]
    game_bounds={'min':[round(min(p[0] for p in points),3),round(min(p[2] for p in points),3),round(min(-p[1] for p in points),3)],
                 'max':[round(max(p[0] for p in points),3),round(max(p[2] for p in points),3),round(max(-p[1] for p in points),3)]}
    print('BIG-WHEEL BOUNDS',piece.name,json.dumps(game_bounds))
    if max(abs(game_bounds['min'][0]),abs(game_bounds['max'][0]),abs(game_bounds['min'][2]),abs(game_bounds['max'][2]))>11.5:
        raise RuntimeError(f'{piece.name} leaves the 3x3 footprint')
    if game_bounds['min'][1]<-.08 and piece.parent is None:
        raise RuntimeError(f'{piece.name} floats below the ground without a support parent')
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
if '--build-only' not in args:
    with (root/'.qa-dist/town-art-fun-review.log').open('w',encoding='utf-8') as log:
        result=subprocess.run([blender,'--background','--python',str(Path(__file__).resolve()),'--','--review-only'],cwd=root,stdout=log,stderr=subprocess.STDOUT)
    if result.returncode: raise RuntimeError('imported-GLB view render failed; see .qa-dist/town-art-fun-review.log')
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'sheet':str(sheet)}))
