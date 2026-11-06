"""Build the Scrapdome's exterior bowl and bus-body entrance for TOWN-ART-DOME."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--render', default='.evidence/2026-11-05/TOWN-ART-DOME/round-2')
parser.add_argument('--evidence', default='.qa-dist/town-dome')
parser.add_argument('--candidate', action='store_true')
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
from mathutils import Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
texdir = root / 'public/assets/models/wasteland/town/textures'
import numpy as np
# Pack the credited photo crops into one 1K image for the model. The entire
# bottom strip keeps the three rows of crushed cars at their natural aspect.
atlas=bpy.data.images.new('Dome photographic salvage atlas 1K',1024,1024,alpha=False)
atlas_pixels=np.zeros((1024,1024,4),dtype=np.float32);atlas_pixels[:,:,3]=1
sources=[('crushed-car-wall.jpg',(0,0,1024,256)),('scrapdome-sign.jpg',(0,256,1024,512)),
         ('bus-front.jpg',(0,512,256,768)),('bus-side.jpg',(256,512,512,768)),
         ('ticket-booth.jpg',(512,512,768,768)),('corrugated-tin.jpg',(768,512,1024,768)),
         ('dirt.jpg',(0,768,256,1024))]
for filename,(x0,y0,x1,y1) in sources:
    src=bpy.data.images.load(str((texdir/filename).resolve()),check_existing=False)
    src.scale(x1-x0,y1-y0);pixels=np.empty((x1-x0)*(y1-y0)*4,dtype=np.float32)
    src.pixels.foreach_get(pixels);atlas_pixels[y0:y1,x0:x1]=pixels.reshape((y1-y0,x1-x0,4))
    bpy.data.images.remove(src)
atlas.pixels.foreach_set(atlas_pixels.ravel());atlas.pack()

def atlas_material(name,color,cell=None,car_strip=False,wide_strip=False,metal=0):
    m=bpy.data.materials.new('Dome / '+name);m.diffuse_color=(*color,1);m.use_nodes=True
    nodes=m.node_tree.nodes;links=m.node_tree.links;bsdf=nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Metallic'].default_value=metal
    bsdf.inputs['Roughness'].default_value=.9
    if cell is not None or car_strip:
        tex=nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Linear';tex.extension='REPEAT'
        uv=nodes.new('ShaderNodeTexCoord').outputs['UV']
        if car_strip or wide_strip:
            scale=nodes.new('ShaderNodeVectorMath');scale.operation='MULTIPLY';scale.inputs[1].default_value=(1,.25,1)
            links.new(uv,scale.inputs[0]);mapped=scale.outputs['Vector']
            if wide_strip:
                offset=nodes.new('ShaderNodeVectorMath');offset.operation='ADD';offset.inputs[1].default_value=(0,.25,0)
                links.new(mapped,offset.inputs[0]);mapped=offset.outputs['Vector']
            links.new(mapped,tex.inputs['Vector'])
        else:
            sep=nodes.new('ShaderNodeSeparateXYZ');links.new(uv,sep.inputs[0]);parts=[]
            for axis in ('X','Y'):
                fract=nodes.new('ShaderNodeMath');fract.operation='FRACT';links.new(sep.outputs[axis],fract.inputs[0]);parts.append(fract.outputs[0])
            mulx=nodes.new('ShaderNodeMath');mulx.operation='MULTIPLY';mulx.inputs[1].default_value=.25;links.new(parts[0],mulx.inputs[0])
            muly=nodes.new('ShaderNodeMath');muly.operation='MULTIPLY';muly.inputs[1].default_value=.25;links.new(parts[1],muly.inputs[0])
            addx=nodes.new('ShaderNodeMath');addx.operation='ADD';addx.inputs[1].default_value=(cell%4)*.25;links.new(mulx.outputs[0],addx.inputs[0])
            addy=nodes.new('ShaderNodeMath');addy.operation='ADD';addy.inputs[1].default_value=(cell//4)*.25;links.new(muly.outputs[0],addy.inputs[0])
            combine=nodes.new('ShaderNodeCombineXYZ');links.new(addx.outputs[0],combine.inputs['X']);links.new(addy.outputs[0],combine.inputs['Y'])
            links.new(combine.outputs['Vector'],tex.inputs['Vector'])
        links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    return m

wall_photo=atlas_material('three rows of crushed cars',(0.3,.2,.15),car_strip=True)
bus_photo=atlas_material('bus front',(0.3,.2,.15),cell=8)
side_photo=atlas_material('bus side',(0.3,.2,.15),cell=9)
sign_photo=atlas_material('painted SCRAPDOME sign',(.68,.24,.055),wide_strip=True)
sign_paint=atlas_material('orange rust sign plate',(.68,.24,.055))
booth_photo=atlas_material('ticket booth',(0.3,.2,.15),cell=10)
tin_photo=atlas_material('corrugated tin',(0.3,.2,.15),cell=11)
dirt_photo=atlas_material('tire-marked dirt',(0.32,.25,.16),cell=12)
steel=atlas_material('dark rusted steel',(.22,.12,.075),metal=.35)
bright=atlas_material('worn galvanized steel',(.36,.37,.34),cell=11,metal=.42)
dark=atlas_material('dark iron',(.055,.06,.055),metal=.55)
sand=atlas_material('packed desert dirt',(.32,.25,.16),cell=12)
glass=atlas_material('broken dark glass',(.075,.105,.10),metal=.05)
paint=atlas_material('rust orange paint',(.39,.17,.08),cell=6)
car_paints=[]
for label, color in (('dusty red',(.34,.105,.075,1)),('faded blue',(.19,.29,.32,1)),
                     ('old cream',(.48,.43,.34,1)),('oxide brown',(.25,.105,.065,1)),
                     ('sun-bleached white',(.53,.50,.43,1))):
    m=bpy.data.materials.new('Dome car paint / '+label);m.diffuse_color=color;m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=color
    bsdf.inputs['Metallic'].default_value=.12;bsdf.inputs['Roughness'].default_value=.91
    car_paints.append(m)

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

def photo_panel(name, center, size, material, parent):
    """Project one cropped photo across a single front-facing salvage panel."""
    w,h=size
    verts=[(-w/2,-h/2,0),(w/2,-h/2,0),(w/2,h/2,0),(-w/2,h/2,0)]
    obj=game_mesh(name,verts,[(0,3,2,1)],material,parent,center)
    uv=obj.data.uv_layers.active
    for loop,coord in zip(uv.data,[(0,0),(0,1),(1,1),(1,0)]):loop.uv=coord
    return obj

def photo_car_wall(name='dome-outer:three-row-photo-car-wall',rx=106,rz=72,skip_front=True):
    """Curve the three-row photo strip around the 220 by 150 m outer bank."""
    n=96;height=10.35;verts=[];faces=[]
    for i in range(n):
        a=math.tau*i/n;noise=math.sin(i*2.1)*.24+math.sin(i*.53)*.18
        x=(rx+noise)*math.cos(a);z=(rz+noise)*math.sin(a)
        verts.extend(((x,.25,z),(x,height,z)))
    for i in range(n):
        a0=math.tau*i/n;a1=math.tau*(i+1)/n
        mid=(a0+a1)*.5
        if skip_front and abs((mid+math.pi/2+math.pi)%math.tau-math.pi)<.12:continue
        a=i*2;b=((i+1)%n)*2
        faces.extend(((a,b,b+1,a+1),(a+1,b+1,b,a)))
    mesh=bpy.data.meshes.new('three rows of real crushed cars / curved wall')
    mesh.from_pydata([town.game_vector(v) for v in verts],[],faces);mesh.materials.append(wall_photo);mesh.update()
    layer=mesh.uv_layers.new(name='photo strip / 12.5 repeats around dome')
    for poly_index,poly in enumerate(mesh.polygons):
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index;i=vi//2;top=vi%2
            layer.data[li].uv=(i/n*12.5,top)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.parent=outer
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

def wreck(name, pos, rotation, parent, seed, detail=True, variant=0):
    """A distinct low-poly wreck shape with a folded hood, cabin and buried wheels."""
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
    body = game_mesh(name + ':body', v, f, car_paints[seed % len(car_paints)], parent, pos, rotation)
    shapes=((1.0,1.0,1.0),(.84,.92,1.12),(1.12,.88,.92),(.94,1.14,.86),(1.08,1.0,1.08))
    body.scale=shapes[variant % len(shapes)]
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
    ground=game_mesh('dome-outer:packed-ground-oval',floor_vertices,floor_faces,dirt_photo,outer)
    uv=ground.data.uv_layers.active
    for poly in ground.data.polygons:
        for li in poly.loop_indices:
            x,y,z=floor_vertices[ground.data.loops[li].vertex_index]
            uv.data[li].uv=(x/222+.5,z/157+.5)
    photo_car_wall()
    photo_car_wall('dome-outer:inner-three-row-photo-wall',98,66,False)
    # Three rows of actual wrecks face outward around the curved perimeter.
    levels = [(106-i*1.0,72-i*.7,count,0.0) for i,count in enumerate((16,14,12))]
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
            wreck(f'dome-outer:hulk-{serial:03}', (px+2.0*math.cos(angle), 1.1+tier*3.45+rng.uniform(-.08,.12),
                  pz+1.5*math.sin(angle)),
                  tangent+wobble, outer, serial, detail=True, variant=serial%5)
    # A steep, irregular salvage bank supports the stepped wreck tiers. It is
    # deliberately faceted and mostly hidden behind the car shells.
    ring_segments=56;bank_vertices=[];bank_faces=[]
    for tier in range(4):
        rx,rz=99-tier*4.7,67-tier*3.2
        for i in range(ring_segments):
            angle=math.tau*i/ring_segments
            waviness=math.sin(i*2.7+tier*1.6)*.48+math.sin(i*.71-tier)*.27
            bank_vertices.append(((rx+1.45+waviness)*math.cos(angle),tier*3.45,
                                  (rz+1.05+waviness)*math.sin(angle)))
    for tier in range(3):
        for i in range(ring_segments):
            angle=math.tau*(i+.5)/ring_segments
            if tier<4 and abs((angle+math.pi/2+math.pi) % math.tau-math.pi)<.13:
                continue
            a=tier*ring_segments+i;b=tier*ring_segments+(i+1)%ring_segments
            c=(tier+1)*ring_segments+(i+1)%ring_segments;d=(tier+1)*ring_segments+i
            bank_faces.append((a,d,c,b))
    game_mesh('dome-outer:rough-wreck-backing',bank_vertices,bank_faces,steel,outer)
    # The Heap is a banked mound under a sloped mass of individual wrecks.
    mound=[];mound_faces=[];segments=32
    mound_rings=((25,0),(22,3.8),(18,7.3),(14,10.7),(10,14),(6,16.8),(1.5,18.0))
    for ri,(radius,level) in enumerate(mound_rings):
        for i in range(segments):
            a=math.tau*i/segments;wobble=math.sin(i*2.2+ri)*.9
            mound.append(((radius+wobble)*math.cos(a),level,(radius+wobble)*math.sin(a)))
    for ri in range(len(mound_rings)-1):
        for i in range(segments):
            a=ri*segments+i;b=ri*segments+(i+1)%segments
            c=(ri+1)*segments+(i+1)%segments;d=(ri+1)*segments+i
            mound_faces.append((a,b,c,d))
    game_mesh('dome-outer:heap-shaped-backing',mound,mound_faces,steel,outer)
    for ring, (radius, count, level) in enumerate(((22,14,4.0),(18,11,7.5),(14,9,10.9),(10,6,14.2),(6,4,17.0),(2.5,2,17.7))):
        for i in range(count):
            a = math.tau*i/count + ring*.31
            wreck(f'dome-outer:heap-{ring}-{i:02}', (radius*math.cos(a), level, radius*math.sin(a)),
                  a+math.pi/2, outer, 600+ring*30+i, variant=(ring+i)%5)
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
        rx,rz=103,70
        x,z=rx*math.cos(a),rz*math.sin(a)
        tang=math.atan2(rz*math.cos(a),-rx*math.sin(a))
        width=12 if i%3 else 16
        for side in (-1,1):
            dx,dz=math.cos(tang)*width*.42*side,math.sin(tang)*width*.42*side
            beam(f'dome-outer:stand-post-{i}-{side}',(x+dx,9.8,z+dz),(x+dx,21.7+(i%3)*.65,z+dz),.22,dark,outer)
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
    # Thin rail segments join the stand bays into a complete walkway guard.
    for i in range(32):
        a0=math.tau*i/32;a1=math.tau*(i+1)/32
        for y in (18.1,20.3):
            beam(f'dome-outer:walkway-rail-{i}-{y}',(102*math.cos(a0),y,69*math.sin(a0)),
                 (102*math.cos(a1),y,69*math.sin(a1)),.075,dark,outer)
        if i%2==0:
            beam(f'dome-outer:walkway-post-{i}',(102*math.cos(a0),17.8,69*math.sin(a0)),
                 (102*math.cos(a0),20.4,69*math.sin(a0)),.065,steel,outer)
    # Four lattice floodlight towers. Each independently named lamp can glow at night.
    emission=bpy.data.materials.new('Dome floodlight amber emissive'); emission.diffuse_color=(1,.39,.075,1); emission.use_nodes=True
    sh=emission.node_tree.nodes.get('Principled BSDF')
    sh.inputs['Emission Color'].default_value=(1,.26,.035,1); sh.inputs['Emission Strength'].default_value=3.0
    for i in range(4):
        a=math.tau*i/4+.15
        x,z=108*math.cos(a),74*math.sin(a)
        for side in (-1,1):
            beam(f'dome-outer:tower-leg-{i}-{side}',(x+side*1.5,18,z),(x+side*.85,33,z),.12,dark,outer)
        beam(f'dome-outer:mast-{i}',(x,18,z),(x,33,z),.13,steel,outer)
        for y in (21,25,29,33):
            beam(f'dome-outer:tower-rung-{i}-{y}',(x-1.35,y,z),(x+1.35,y,z),.085,steel,outer)
        beam(f'dome-outer:tower-cross-a-{i}',(x-1.4,20,z),(x+1.4,25,z),.065,steel,outer)
        beam(f'dome-outer:tower-cross-b-{i}',(x+1.4,20,z),(x-1.4,25,z),.065,steel,outer)
        beam(f'dome-outer:mast-cross-{i}',(x-2.3,32,z),(x+2.3,32,z),.13,dark,outer)
        lamp=empty('dome-outer:lamp' if i==0 else f'dome-outer:lamp-{i}',outer)
        lamp.location=town.game_vector((x,29+(i%3),z))
        for j in range(3):
            cube(f'dome-outer:lamp-{i}-face-{j}',(x+(j-1)*.9,29+(i%3),z-.1),(.68,.52,.18),emission,lamp,.04)
    # Banners are real cloth panels with ragged notches, suspended between posts.
    for i in range(10):
        a=math.tau*i/10+.22
        x,z=101*math.cos(a),68*math.sin(a)
        tang=math.atan2(68*math.cos(a),-101*math.sin(a))
        beam(f'dome-outer:banner-wire-{i}',(x,20,z),(x+math.cos(tang)*5,20.4,z+math.sin(tang)*5),.045,dark,outer)
        cloth=[(-1.6,19.9,-.05),(1.8,20.1,.03),(1.6,16.1,.02),(.7,16.8,.04),(-.3,15.9,-.03),(-1.7,16.5,0)]
        vv=[(x+lx*math.cos(tang)-lz*math.sin(tang),yy,z+lx*math.sin(tang)+lz*math.cos(tang)) for lx,yy,lz in cloth]
        game_mesh(f'dome-outer:banner-{i}',vv,[(0,1,2,3,4,5)],paint if i%2 else bright,outer)

hulk_bowl()

# Gate at the exact -Z road side: two whole city buses stand upright as piers,
# with front faces toward the approaching driver and a 12 m truck opening.
for side in (-1,1):
    x=side*8.2;z=-91.2
    cube(f'dome-gate:bus-{side}:body',(x,4.65,z),(4.3,9.3,2.8),car_paints[0],gate,.28,side*.045)
    photo_panel(f'dome-gate:bus-{side}:photo-front',(x,4.65,z-1.44),(4.0,8.95),bus_photo,gate)
    # The upper windscreen, broken panes and destination box identify each bus.
    cube(f'dome-gate:bus-{side}:windscreen',(x,7.55,z-1.43),(3.25,1.65,.08),glass,gate,.14)
    beam(f'dome-gate:bus-{side}:windscreen-post',(x,6.72,z-1.51),(x,8.38,z-1.51),.11,dark,gate)
    cube(f'dome-gate:bus-{side}:destination',(x,8.65,z-1.48),(2.45,.34,.09),dark,gate,.035)
    # A real pressed front has a deep grille, bumper and paired round lamps.
    cube(f'dome-gate:bus-{side}:grille',(x,2.15,z-1.49),(1.65,1.0,.10),dark,gate,.08)
    for j in range(7):
        beam(f'dome-gate:bus-{side}:grille-bar-{j}',(x-.68+j*.225,1.7,z-1.56),(x-.68+j*.225,2.6,z-1.56),.045,bright,gate)
    for lamp_side in (-1,1):
        cylinder(f'dome-gate:bus-{side}:headlamp',(x+lamp_side*1.38,2.55,z-1.55),.25,.10,bright,gate,12,'Y')
        cylinder(f'dome-gate:bus-{side}:wheel',(x+lamp_side*1.95,.48,z),.46,.36,dark,gate,12,'Y')
    beam(f'dome-gate:bus-{side}:bumper',(x-1.9,1.25,z-1.55),(x+1.9,1.25,z-1.55),.20,bright,gate)
    # Side windows and narrow folded sheet repairs make the standing bodies read as vehicles.
    for row in range(4):
        yy=3.2+row*1.05
        cube(f'dome-gate:bus-{side}:side-window-{row}',(x+side*2.18,yy,z),(0.08,.67,1.35),glass,gate,.06)
    for row in range(3):
        wreck(f'dome-gate:foot-hulk-{side}-{row}',(side*(8.0+row*.95),.18,-89-row*2.5),
              side*.09,gate,800+side*6+row,variant=row+1)
# Dark girders and cross-braces carry the sign plate above the drive-through.
for side in (-1,1):
    beam(f'dome-gate:bus-header-post-{side}',(side*10.4,8.9,-92),(side*10.4,13.2,-92),.24,dark,gate)
    beam(f'dome-gate:bus-header-cross-{side}',(side*5.8,8.4,-92),(side*10.5,11,-92),.14,steel,gate)
# Hand-painted header hangs above the drive-through throat, facing the -Z road.
sign=cube('dome-gate:SCRAPDOME-painted-sign',(0,11.0,-92),(18.8,4.7,.42),sign_paint,gate,.11)
photo_panel('dome-gate:SCRAPDOME-photo-face',(0,11.0,-92.25),(18.5,4.62),sign_photo,gate)
beam('dome-gate:sign-top-weld',( -9.4,13.32,-92.28),(9.4,13.32,-92.28),.11,bright,gate)
font=bpy.data.curves.new('hand-painted SCRAPDOME lettering','FONT');font.body='SCRAPDOME';font.size=2.15;font.extrude=.012
font.align_x='CENTER';font.align_y='CENTER'
text=bpy.data.objects.new('dome-gate:SCRAPDOME-lettering',font);bpy.context.collection.objects.link(text)
text.location=town.game_vector((0,11.0,-92.55));text.rotation_euler=Matrix(((-1,0,0),(0,0,1),(0,1,0))).to_euler()
font.materials.append(dark);text.parent=gate
# Uneven chips, rust streaks and fasteners keep the large painted plate from reading clean.
for i,(x,y,w,h) in enumerate(((-8.7,12.7,.24,.10),(-7.4,9.0,.14,.32),(-5.2,12.9,.20,.12),
                                (5.3,9.0,.13,.28),(7.6,12.8,.24,.11),(8.8,9.4,.16,.22),
                                (-8.6,10.1,.13,.30),(6.4,10.3,.22,.10))):
    cube(f'dome-gate:sign-rust-chip-{i}',(x,y,-92.48),(w,h,.035),steel,gate,.01,(i%3-1)*.10)
for i,x in enumerate((-8.8,-6.0,6.0,8.8)):
    for y in (8.9,13.1):cylinder(f'dome-gate:sign-rivet-{i}-{y}',(x,y,-92.48),.075,.09,dark,gate,10,'Y')
# Ticket booth and battered sheet-metal awning to the road's right side.
cube('dome-gate:ticket-booth-core',(15.0,1.65,-89.0),(4.0,3.3,3.4),steel,gate,.16)
photo_panel('dome-gate:ticket-booth-photo',(15.0,1.65,-90.72),(3.8,3.1),booth_photo,gate)
cube('dome-gate:ticket-window',(15.0,2.18,-90.78),(2.7,1.1,.12),glass,gate,.05)
cube('dome-gate:ticket-counter',(15.0,1.25,-90.98),(3.1,.18,.52),bright,gate,.04)
cube('dome-gate:ticket-awning',(15.0,3.55,-89.1),(5.2,.12,2.5),paint,gate,.06,-.11)
for side in (-1,1):
    beam(f'dome-gate:booth-awning-post-{side}',(15.0+side*2.35,.1,-89.0),(15.0+side*2.35,3.6,-89.0),.14,dark,gate)
for i in range(5):
    beam(f'dome-gate:ticket-bars-{i}',(13.8+i*.6,1.65,-90.88),(13.8+i*.6,2.72,-90.88),.055,bright,gate)
cube('dome-gate:booth-number-plate',(15.0,3.0,-90.82),(2.7,.72,.08),sign_paint,gate,.04)
ticket_font=bpy.data.curves.new('TICKETS brush board','FONT');ticket_font.body='TICKETS';ticket_font.size=.58;ticket_font.extrude=.004
ticket_font.align_x='CENTER';ticket_font.align_y='CENTER'
ticket_text=bpy.data.objects.new('dome-gate:TICKETS-lettering',ticket_font);bpy.context.collection.objects.link(ticket_text)
ticket_text.location=town.game_vector((15.0,3.0,-90.94));ticket_text.rotation_euler=Matrix(((-1,0,0),(0,0,1),(0,1,0))).to_euler()
ticket_font.materials.append(dark);ticket_text.parent=gate
# A small banked road skirt closes the space at the gate and carries dusty tire marks.
apron_vertices=[(-20,.01,-103.5),(20,.01,-103.5),(20,.01,-80.5),(-20,.01,-80.5)]
apron=game_mesh('dome-gate:banked-dirt-skirt',apron_vertices,[(0,1,2,3)],dirt_photo,gate)
apron_uv=apron.data.uv_layers.active
for poly in apron.data.polygons:
    for li in poly.loop_indices:
        x,y,z=apron_vertices[apron.data.loops[li].vertex_index]
        apron_uv.data[li].uv=(x/40+.5,(z+103.5)/23)
for track in (-1,1):
    points=[]
    for i in range(9):
        z=-103+i*2.7;x=track*(1.05+math.sin(i*.8)*.20);points.append((x,.035,z))
    for i,(a,b) in enumerate(zip(points,points[1:])):
        beam(f'dome-gate:tire-track-{track}-{i}',a,b,.075,dark,gate)
gate_origin=town.game_vector((0,0,-92))
gate.location=gate_origin
for child in list(gate.children):child.location-=gate_origin
# Sand berms, weld scars and leaning guard rails at road level.
for side in (-1,1):
    beam(f'dome-gate:leaning-guard-{side}',(side*13,.12,-98),(side*11,.85,-90),.20,bright,gate)
    cube(f'dome-gate:sand-bank-{side}',(side*15,.18,-95),(4.8,.34,10),sand,gate,.14,side*.12)

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
render_view('dome-outer-above-45.png',(0,178,-181),(0,8,0),35)
# The road is a camera-only continuation of the gate's dirt skirt. It puts
# ground under the 30 m approach view without enlarging the exported building.
preview_vertices=[(-20,0,-145),(20,0,-145),(20,0,-103.5),(-20,0,-103.5)]
preview_road=game_mesh('render-only dirt beyond the gate skirt',preview_vertices,[(0,3,2,1)],dirt_photo,None)
preview_uv=preview_road.data.uv_layers.active
for poly in preview_road.data.polygons:
    for li in poly.loop_indices:
        x,y,z=preview_vertices[preview_road.data.loops[li].vertex_index]
        preview_uv.data[li].uv=(x/40+.5,(z+145)/41.5)
preview_road.hide_render=False
render_view('dome-gate-road-30m.png',(0,1.7,-123),(0,2.0,-92),28)
preview_road.hide_render=True
render_view('dome-outer-side-40m.png',(0,9,112),(0,9,72),45)

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
# Save the editable Blender source and render candidate in ignored QA staging.
for obj in list(bpy.context.scene.objects):
    if obj.type in {'CAMERA','LIGHT'} or obj == preview_road:
        bpy.data.objects.remove(obj,do_unlink=True)
blend.parent.mkdir(parents=True,exist_ok=True);out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
                          export_apply=True,export_materials='EXPORT',export_image_format='JPEG')
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'blend':str(blend),'renders':str(render_dir)}))
