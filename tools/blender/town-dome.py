"""Build the Scrapdome's exterior bowl and bus-body entrance for TOWN-ART-DOME."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--render', default='.evidence/2026-11-05/TOWN-ART-DOME/round-1')
parser.add_argument('--evidence', default='.qa-dist/town-dome')
parser.add_argument('--candidate', action='store_true')
parser.add_argument('--metal-photo', default='C:/Users/kyleb/.codex/generated_images/01a1ade1-d496-7da3-ba60-467216d92ab3/exec-ecafc309-412c-4b87-9b2e-e00b9133ab33.png')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / args.evidence / 'dome.glb'
blend = root / args.evidence / 'dome.blend'
render_dir = root / args.render
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(render_dir)]}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
if not Path(args.metal_photo).exists():
    raise FileNotFoundError(f'metal photo reference missing: {args.metal_photo}')
mat = town.make_materials({'rusted-steel': Path(args.metal_photo), 'galvanised-tin': Path(args.metal_photo),
                           'sand': root / 'public/assets/textures/rally-gravel.png'})
steel, bright, dark = mat['rusted-steel'], mat['galvanised-tin'], mat['iron-dark']
sand, glass, paint = mat['sand'], mat['dirty-glass'], mat['faded-hand-paint']

def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj

root_obj = empty('town-dome')
outer = empty('dome-outer', root_obj)
gate = empty('dome-gate', root_obj)

def game_mesh(name, vertices, faces, material, parent, origin=(0, 0, 0), rotation=0):
    mesh = bpy.data.meshes.new(name + ' formed steel')
    mesh.from_pydata([town.game_vector(v) for v in vertices], [], faces)
    mesh.materials.append(material)
    mesh.update()
    uv = mesh.uv_layers.new(name='2m salvaged panel texture')
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            x, y, z = vertices[mesh.loops[loop_index].vertex_index]
            uv.data[loop_index].uv = (x / 2, (z if abs(polygon.normal.y) > .5 else y) / 2)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = town.game_vector(origin)
    obj.rotation_euler[2] = -rotation
    obj.parent = parent
    return obj

def cube(name, pos, size, material, parent, bevel=0.04, rotation=0):
    obj = town.cube(name, pos, size, material, bevel)
    obj.rotation_euler[2] = -rotation
    obj.parent = parent
    return obj

def beam(name, a, b, width, material, parent):
    obj = town.beam(name, a, b, width, material)
    obj.parent = parent
    return obj

def cylinder(name, pos, radius, depth, material, parent, vertices=8, axis='Z'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=town.game_vector(pos))
    obj = bpy.context.object
    obj.name = name
    if axis == 'X':
        obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Y':
        obj.rotation_euler[0] = math.pi / 2
    obj.data.materials.append(material)
    obj.parent = parent
    return obj

def wreck(name, pos, rotation, parent, seed, detail=True):
    """A low-poly pressed car shell with folded hood, cabin glass and buried wheels."""
    x, y, z = pos
    # Local coordinates: length X, height Y, body width Z. Hood and boot sag;
    # the irregular roof and waist make the shell read as a crushed car, not a box.
    height_scale = 1.0 if detail else 1.8
    v = [(-2.35,.42,-.88), (2.30,.42,-.88), (2.48,.62,-.55), (2.31,.69,.78),
         (-2.28,.67,.86), (-2.50,.54,.48), (-1.22,.91,-.80), (1.05,.96,-.78),
         (1.28,.89,.77), (-1.10,.95,.83), (-.44,1.18,-.55), (.22,1.23,-.51),
         (.31,1.16,.55), (-.48,1.21,.60), (-2.35,.42,.88), (2.30,.42,.88)]
    v = [(vx,vy*height_scale,vz) for vx,vy,vz in v]
    f = [(0,1,2,3,4,5), (0,6,7,1), (1,7,8,3), (3,8,9,4),
         (4,9,6,0), (6,10,11,7), (7,11,12,8), (8,12,13,9),
         (9,13,10,6), (10,13,12,11)]
    body = game_mesh(name + ':body', v, f, steel if seed % 3 else bright, parent, pos, rotation)
    # Broken dark window apertures are framed by the higher folded cabin shell.
    if detail:
        pane = [(-1.13,.97,-.84), (-.48,1.19,-.62), (.24,1.20,-.54),
                (.94,.98,-.81)]
        game_mesh(name + ':broken-windscreen', pane, [(0,1,2,3)], glass, parent, pos, rotation)
    # Four low-sided tyres survive under the crushed shell.
    if detail:
        for wx in (-1.48, 1.38):
            for wz in (-.92, .92):
                wheel = cylinder(name + ':tyre', (x + wx*math.cos(rotation) + wz*math.sin(rotation),
                                  y+.38, z - wx*math.sin(rotation) + wz*math.cos(rotation)),
                                 .34, .16, dark, parent, 6, 'X')
                wheel.rotation_euler[1] = math.pi / 2
                wheel.rotation_euler[2] = -rotation
        if seed % 4 == 0:
            cube(name + ':welded-lap', (x-.15,y+1.24,z), (.62,.06,1.02), bright if seed%2 else steel,
                 parent, .015, rotation)

def hulk_bowl():
    # The hard-packed oval pad anchors the landmark and gives the inside bowl a floor.
    floor_vertices=[(0,-.16,0)]+[(111.0*math.cos(math.tau*i/64),-.16,78.5*math.sin(math.tau*i/64)) for i in range(64)]
    floor_faces=[(0,(i+1)%64+1,i+1) for i in range(64)]
    game_mesh('dome-outer:packed-ground-oval',floor_vertices,floor_faces,sand,outer)
    # Seven irregular tiers of wrecks rise from the ground to the 18 m rim.
    levels = [(77-i*2.7,52-i*1.9,count,0.0) for i,count in enumerate((64,58,50,44,38,32,26))]
    serial = 0
    rng = __import__('random').Random(1105)
    for tier, (rx, rz, count, base_y) in enumerate(levels):
        for i in range(count):
            angle = math.tau * i / count + (tier % 2) * math.pi/count
            # Leave a clear, deep opening for the gate; steel portal columns fill it.
            if tier == 0 and abs((angle + math.pi/2 + math.pi) % math.tau - math.pi) < .16:
                continue
            serial += 1
            px, pz = rx*math.cos(angle), rz*math.sin(angle)
            tangent = math.atan2(rz*math.cos(angle), -rx*math.sin(angle))
            wobble = rng.uniform(-.32,.32)
            wreck(f'dome-outer:hulk-{serial:03}', (px+2.0*math.cos(angle), base_y+tier*2.7+rng.uniform(-.08,.12),
                  pz+1.5*math.sin(angle)),
                  tangent+wobble, outer, serial, detail=(tier==0))
    # A steep, irregular salvage bank supports the stepped wreck tiers. It is
    # deliberately faceted and mostly hidden behind the car shells.
    ring_segments=56;bank_vertices=[];bank_faces=[]
    for tier in range(7):
        rx,rz=77-tier*2.7,52-tier*1.9
        for i in range(ring_segments):
            angle=math.tau*i/ring_segments
            waviness=math.sin(i*2.7+tier*1.6)*.48+math.sin(i*.71-tier)*.27
            bank_vertices.append(((rx+1.45+waviness)*math.cos(angle),tier*2.7,
                                  (rz+1.05+waviness)*math.sin(angle)))
    for tier in range(6):
        for i in range(ring_segments):
            angle=math.tau*(i+.5)/ring_segments
            if tier<4 and abs((angle+math.pi/2+math.pi) % math.tau-math.pi)<.13:
                continue
            a=tier*ring_segments+i;b=tier*ring_segments+(i+1)%ring_segments
            c=(tier+1)*ring_segments+(i+1)%ring_segments;d=(tier+1)*ring_segments+i
            bank_faces.append((a,d,c,b))
    game_mesh('dome-outer:rough-wreck-backing',bank_vertices,bank_faces,steel,outer)
    # Crushed-car Heap in the centre: overlapping bodies spiral into a high mound.
    for ring, (radius, count, level) in enumerate(((10,18,0),(7,13,4.5),(4,8,9.0))):
        for i in range(count):
            a = math.tau*i/count + ring*.31
            wreck(f'dome-outer:heap-{ring}-{i:02}', (radius*math.cos(a), level*1.12, radius*math.sin(a)),
                  a+math.pi/2, outer, 600+ring*30+i)
    # A packed-dirt race ring encircles the Heap, visible from above.
    # Broad eight-piece wedges avoid an expensive solid slab under the entire bowl.
    for i in range(12):
        a0, a1 = math.tau*i/12, math.tau*(i+1)/12
        verts=[]
        for y in (.015,-.16):
            for r,a in ((17,a0),(30,a0),(30,a1),(17,a1)):
                verts.append((r*math.cos(a),y,r*math.sin(a)))
        faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
        game_mesh(f'dome-outer:dirt-ring-{i:02}', verts, faces, sand, outer)
    # Scaffold grandstands rise unevenly above the wreck rim.
    for i in range(14):
        a=math.tau*i/14+.07
        rx,rz=75,50
        x,z=rx*math.cos(a),rz*math.sin(a)
        tang=math.atan2(rz*math.cos(a),-rx*math.sin(a))
        width=12 if i%3 else 16
        for side in (-1,1):
            dx,dz=math.cos(tang)*width*.42*side,math.sin(tang)*width*.42*side
            beam(f'dome-outer:stand-post-{i}-{side}',(x+dx,15.0,z+dz),(x+dx,21.7+(i%3)*.65,z+dz),.22,dark,outer)
        beam(f'dome-outer:stand-front-{i}',(x-math.sin(tang)*width/2,21.7+(i%3)*.65,z+math.cos(tang)*width/2),
             (x+math.sin(tang)*width/2,21.7+(i%3)*.65,z-math.cos(tang)*width/2),.18,steel,outer)
        beam(f'dome-outer:stand-deck-{i}',(x-math.sin(tang)*width/2,20.5,z+math.cos(tang)*width/2),
             (x+math.sin(tang)*width/2,20.5,z-math.cos(tang)*width/2),.30,bright,outer)
        for level in (16.5,19.3):
            beam(f'dome-outer:stand-brace-{i}-{level}',(x-width*.35,level,z),(x+width*.35,level+1.2,z),.10,steel,outer)
        # One torn roof awning patch per alternating stand.
        if i%2==0:
            awning=cube(f'dome-outer:awning-{i}',(x,22.7,z),(width*.92,.12,3.3),
                        paint if i%4==0 else steel,outer,.025,tang)
            awning.rotation_euler[0]=-.12 if i%4==0 else .10
    # Eight floodlight poles. Each emissive lamp assembly is an independently named child.
    emission=bpy.data.materials.new('Dome floodlight amber emissive'); emission.diffuse_color=(1,.39,.075,1); emission.use_nodes=True
    sh=emission.node_tree.nodes.get('Principled BSDF')
    sh.inputs['Emission Color'].default_value=(1,.26,.035,1); sh.inputs['Emission Strength'].default_value=3.0
    for i in range(8):
        a=math.tau*i/8+.15
        x,z=80*math.cos(a),55*math.sin(a)
        beam(f'dome-outer:mast-{i}',(x,15,z),(x+(.8 if i%2 else -.6),30+(i%3),z),.26,steel,outer)
        beam(f'dome-outer:mast-cross-{i}',(x-2.3,29+(i%3),z),(x+2.3,29+(i%3),z),.13,dark,outer)
        lamp=empty('dome-outer:lamp' if i==0 else f'dome-outer:lamp-{i}',outer)
        lamp.location=town.game_vector((x,29+(i%3),z))
        for j in range(3):
            cube(f'dome-outer:lamp-{i}-face-{j}',(x+(j-1)*.9,29+(i%3),z-.1),(.68,.52,.18),emission,lamp,.04)
    # Banners are real cloth panels with ragged notches, suspended between posts.
    for i in range(10):
        a=math.tau*i/10+.22
        x,z=74*math.cos(a),49*math.sin(a)
        tang=math.atan2(49*math.cos(a),-74*math.sin(a))
        beam(f'dome-outer:banner-wire-{i}',(x,20,z),(x+math.cos(tang)*5,20.4,z+math.sin(tang)*5),.045,dark,outer)
        cloth=[(-1.6,19.9,-.05),(1.8,20.1,.03),(1.6,16.1,.02),(.7,16.8,.04),(-.3,15.9,-.03),(-1.7,16.5,0)]
        vv=[(x+lx*math.cos(tang)-lz*math.sin(tang),yy,z+lx*math.sin(tang)+lz*math.cos(tang)) for lx,yy,lz in cloth]
        game_mesh(f'dome-outer:banner-{i}',vv,[(0,1,2,3,4,5)],paint if i%2 else bright,outer)

def bus(name, pos, tilt, parent):
    """A long, subtly bowed city-bus shell used as one half of the gate arch."""
    x,y,z=pos
    # curved bus profile, low-poly pressed side skins, rounded roof and underframe
    length=9.3; width=2.8; height=2.65
    v=[(-length/2,.18,-width/2),(length/2,.18,-width/2),(length/2,.18,width/2),(-length/2,.18,width/2),
       (-length/2+.3,height*.72,-width/2),(length/2-.2,height*.72,-width/2),
       (length/2-.2,height*.72,width/2),(-length/2+.3,height*.72,width/2),
       (-length/2+.5,height,-width*.36),(length/2-.45,height,-width*.36),
       (length/2-.45,height,width*.36),(-length/2+.5,height,width*.36)]
    faces=[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,9,8),(5,6,10,9),(6,7,11,10),(7,4,8,11),(8,9,10,11),(0,3,2,1)]
    start=set(bpy.context.scene.objects)
    shell=game_mesh(name+':bus-shell',v,faces,steel,parent,pos)
    # Seven separated window bays with heavy welded posts and deep green glass.
    for side in (-1,1):
        for i in range(6):
            bx=-3.45+i*1.13
            pane=[(bx,.93,side*(width/2+.012)),(bx+.82,.93,side*(width/2+.012)),
                  (bx+.82,1.82,side*(width/2+.012)),(bx,1.82,side*(width/2+.012))]
            game_mesh(name+f':window-{side}-{i}',pane,[(0,1,2,3)],glass,parent,pos)
    # Wheel arches and low poly wheel drums survive on the lower edge.
    for wx in (-3.1,3.1):
        for side in (-1,1):
            cylinder(name+':bus-wheel',(x+wx,y+.22,z+side*1.37),.52,.22,dark,parent,8,'X')
    # A banked vehicle body makes the pair climb from the pillars and meet above
    # the drive-through opening like a welded steel arch.
    for obj in set(bpy.context.scene.objects)-start:
        if obj.type == 'MESH':
            obj.rotation_euler[1] = tilt

hulk_bowl()

# Gate at the exact -Z road side. Two full bus bodies rise toward each other,
# leaving a 10.5 m wide, 7.5 m high clear vehicle path below the header.
for side in (-1,1):
    anchor_x, anchor_y = side*10.2, .1
    centre = (side*7.35, 4.45, -72)
    tilt = math.radians(-55 if side < 0 else -125)
    bus(f'dome-gate:bus-{side}',centre,tilt,gate)
    # Gate base ties the bus body into stacked crashed cars and welded shoes.
    for j in range(2):
        wreck(f'dome-gate:foot-hulk-{side}-{j}',(side*(9.7-j*2.5),.22,-72),0,gate,800+side*3+j)
    beam(f'dome-gate:bus-shoe-{side}',(anchor_x,.15,-72),(centre[0],2.1,-72),.42,steel,gate)
# Crossed plates and ribs stitch the bus roofs together above the opening.
for i in range(7):
    x=-5.8+i*1.93
    beam(f'dome-gate:arch-stitch-{i}',(x,8.1,-73),(x+(.5 if i%2 else -.45),9.0,-73),.21,bright,gate)
for side in (-1,1):
    for yy in (6.4,7.6,8.7):
        beam(f'dome-gate:arch-rib-{side}-{yy}',(side*5.8,yy,-73),(side*8.4,yy+.5,-73),.14,steel,gate)
# Hand-painted header hangs above the drive-through throat, facing the -Z road.
sign=cube('dome-gate:SCRAPDOME-painted-sign',(0,9.55,-74),(18.8,2.3,.42),paint,gate,.11)
beam('dome-gate:sign-top-weld',( -9.4,10.72,-74.28),(9.4,10.72,-74.28),.11,bright,gate)
font=bpy.data.curves.new('SCRAPDOME brush lettering','FONT');font.body='SCRAPDOME';font.size=1.32;font.extrude=.012
font.align_x='CENTER';font.align_y='CENTER'
text=bpy.data.objects.new('dome-gate:SCRAPDOME-lettering',font);bpy.context.collection.objects.link(text)
text.location=town.game_vector((0,9.55,-74.23));
text.rotation_euler=Matrix(((-1,0,0),(0,0,1),(0,1,0))).to_euler();font.materials.append(dark);text.parent=gate
# Ticket booth and battered sheet-metal awning to the road's right side.
cube('dome-gate:ticket-booth-core',(15.0,1.65,-69.0),(4.0,3.3,3.4),steel,gate,.16)
cube('dome-gate:ticket-window',(15.0,2.18,-70.78),(2.7,1.1,.12),glass,gate,.05)
cube('dome-gate:ticket-counter',(15.0,1.25,-70.98),(3.1,.18,.52),bright,gate,.04)
cube('dome-gate:ticket-awning',(15.0,3.55,-69.1),(5.2,.12,2.5),paint,gate,.06,-.11)
for side in (-1,1):
    beam(f'dome-gate:booth-awning-post-{side}',(15.0+side*2.35,.1,-69.0),(15.0+side*2.35,3.6,-69.0),.14,dark,gate)
for i in range(5):
    beam(f'dome-gate:ticket-bars-{i}',(13.8+i*.6,1.65,-70.88),(13.8+i*.6,2.72,-70.88),.055,bright,gate)
cube('dome-gate:booth-number-plate',(15.0,3.0,-70.82),(1.25,.42,.08),paint,gate,.04)
# Sand berms, weld scars and leaning guard rails at road level.
for side in (-1,1):
    beam(f'dome-gate:leaning-guard-{side}',(side*13,.12,-78),(side*11,.85,-70),.20,bright,gate)
    cube(f'dome-gate:sand-bank-{side}',(side*15,.18,-75),(4.8,.34,10),sand,gate,.14,side*.12)

# Shared outside scale lights: high clear overcast source, with a weak warm fill.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=820;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=.05
scene.world=bpy.data.worlds.new('Overcast desert daylight');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.68,.72,.76,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
def area(name, pos, target, energy, size, color):
    bpy.ops.object.light_add(type='AREA',location=town.game_vector(pos));light=bpy.context.object;light.name=name
    light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.data.color=color
    light.rotation_euler=(town.game_vector(target)-light.location).to_track_quat('-Z','Y').to_euler()
area('large soft daylight',(-35,145,-45),(0,0,0),18000,100,(1.0,.87,.71))
area('sky bounce',(75,90,20),(0,2,0),9000,95,(.67,.78,1.0))
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
render_dir.mkdir(parents=True,exist_ok=True)
def render_view(filename, location, target, lens, resolution=(1280,820)):
    scene.render.resolution_x,scene.render.resolution_y=resolution
    bpy.ops.object.camera_add(location=town.game_vector(location));camera=bpy.context.object;camera.data.lens=lens
    camera.rotation_euler=(town.game_vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=camera;scene.render.filepath=str(render_dir/filename);bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera,do_unlink=True)
render_view('dome-outer-above-45.png',(0,80,-80),(0,2,0),18)
render_view('dome-outer-driver-seat.png',(0,1.6,-105),(0,7.8,-73),38)
render_view('dome-gate-front.png',(0,2.2,-100),(0,8,-73),45)

# Join fixed scenery by building to avoid thousands of tiny scene nodes. Keep the
# independently named emissive lamp assembly and sign lettering as child parts.
def join_building_static(building):
    keep=set()
    pending=list(building.children)
    while pending:
        obj=pending.pop()
        if obj.name.startswith('dome-outer:lamp'):
            keep.add(obj)
        pending.extend(obj.children)
    def under_lamp(obj):
        while obj and obj != building:
            if obj.name.startswith('dome-outer:lamp'):
                return True
            obj=obj.parent
        return False
    candidates=[]
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or under_lamp(obj):
            continue
        parent_obj=obj.parent
        while parent_obj and parent_obj != building:
            parent_obj=parent_obj.parent
        if parent_obj == building:
            candidates.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in candidates:
        obj.select_set(True)
    if candidates:
        bpy.context.view_layer.objects.active=candidates[0]
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.join()
        joined=bpy.context.view_layer.objects.active
        joined.name=building.name+':fixed-salvage'
        joined.parent=building

join_building_static(outer)
join_building_static(gate)
# For inspection only: save the candidate model outside public/ until Claude approves it.
for obj in list(bpy.context.scene.objects):
    if obj.type in {'CAMERA','LIGHT'}:
        bpy.data.objects.remove(obj,do_unlink=True)
blend.parent.mkdir(parents=True,exist_ok=True);out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
                          export_apply=True,export_materials='EXPORT',export_image_format='JPEG')
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'blend':str(blend),'renders':str(render_dir)}))
