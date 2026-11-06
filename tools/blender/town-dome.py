"""Build the Scrapdome's exterior bowl and bus-body entrance for TOWN-ART-DOME."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--render', default='.qa-dist/town-dome/round-5')
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
def photo_material(name, filename, color=(.32,.25,.18), metal=0):
    """One independently repeating, credited picture per material."""
    image=bpy.data.images.load(str((texdir/filename).resolve()),check_existing=False)
    image.pack()
    mat=bpy.data.materials.new('Dome / '+name);mat.diffuse_color=(1,1,1,1);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value=min(metal,.3);bsdf.inputs['Roughness'].default_value=.9
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    tex.interpolation='Linear';tex.extension='REPEAT'
    mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    return mat

wall_photo=photo_material('three rows of crushed cars','crushed-car-wall.jpg')
heap_photo=photo_material('wreck photograph around the Heap','heap-wrecks.jpg')
bus_front_left=photo_material('bus front left crop','bus-face-left.jpg',(.42,.15,.12))
bus_front_right=photo_material('bus front right crop','bus-face-right.jpg',(.42,.15,.12))
bus_side_left=photo_material('bus left side with two decks','bus-side-left.jpg',(.38,.14,.12))
bus_side_right=photo_material('bus right side with two decks','bus-side-right.jpg',(.38,.14,.12))
sign_photo=photo_material('brush painted Scrapdome sign','scrapdome-brush-sign.jpg',(.42,.24,.12))
sign_paint=photo_material('rusted sign plate','rusted-steel.jpg',(.3,.16,.10))
booth_photo=photo_material('ticket booth','ticket-booth.jpg')
tin_photo=photo_material('corrugated tin','corrugated-tin.jpg',(.33,.34,.31))
dirt_photo=photo_material('tire marked dirt','dirt.jpg',(.32,.25,.16))
steel=photo_material('dark rusted steel','rusted-steel.jpg',(.22,.12,.075),.22)
bright=photo_material('worn galvanized steel','corrugated-tin.jpg',(.36,.37,.34),.18)
dark=photo_material('dusty tyre rubber','tire-rubber.jpg',(.055,.06,.055))
sand=photo_material('packed desert dirt','dirt.jpg',(.32,.25,.16))
glass=photo_material('broken dark bus glass','broken-glass.jpg',(.075,.105,.10),.08)
paint=photo_material('faded red bus paint','bus-red-paint.jpg',(.39,.17,.12),.08)
car_paints=[photo_material('wreck paint / '+label,filename,color,.08) for label,filename,color in (
    ('faded red','bus-side-left.jpg',(.34,.105,.075)),('faded blue','heap-wrecks.jpg',(.19,.29,.32)),
    ('old cream','ticket-booth.jpg',(.48,.43,.34)),('oxide brown','rusted-steel.jpg',(.25,.105,.065)),
    ('sun bleached','crushed-car-wall.jpg',(.53,.50,.43)))]

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
    uv = mesh.uv_layers.new(name='UVMap')
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

def photo_side_panel(name,center,size,material,parent,side):
    w,h=size
    verts=[(0,-h/2,-w/2),(0,-h/2,w/2),(0,h/2,w/2),(0,h/2,-w/2)]
    obj=game_mesh(name,verts,[(0,1,2,3)],material,parent,center)
    uv=obj.data.uv_layers.active
    for loop,coord in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=coord
    obj.location.x += side*.012
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
    layer=mesh.uv_layers.new(name='UVMap')
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

def scaffold_tube(name,a,b,diameter,material,parent):
    """A six-sided round hollow-ended scaffold tube with a real measured diameter."""
    from mathutils import Vector
    va=town.game_vector(a);vb=town.game_vector(b);axis=(vb-va).normalized()
    across=axis.cross(Vector((0,1,0)))
    if across.length<.01:across=axis.cross(Vector((1,0,0)))
    across.normalize();up=axis.cross(across).normalized();radius=diameter/2
    ring=[(across*math.cos(math.tau*i/6)+up*math.sin(math.tau*i/6))*radius for i in range(6)]
    verts=[tuple(va+v) for v in ring]+[tuple(vb+v) for v in ring]
    faces=[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]
    mesh=bpy.data.meshes.new(name+' measured scaffold tube')
    mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.parent=parent
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

    return body

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
    # A photo-projected stack of wrecks fills the inter-car gaps, while the
    # individual shells in front give the wall its real layered relief.
    photo_car_wall('dome-outer:projected-stacked-wrecks',106,72,True)
    # One grounded row adds real relief in front of the photo's two and three
    # car stacks. The picture carries the upper tiers; no unsupported hulks float.
    levels = [(106,72,28,1.1)]
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
            wreck(f'dome-outer:hulk-{serial:03}', (px+2.0*math.cos(angle), base_y+rng.uniform(-.04,.04),
                  pz+1.5*math.sin(angle)),
                  tangent+wobble, outer, serial, detail=False, variant=serial%5)
    # The Heap is an uneven 18 m mound: its own stacked-wreck photograph wraps
    # around the support while ninety full-size car bodies overlap the slope.
    mound=[];mound_faces=[];segments=32
    mound_rings=((25,0),(22,3.8),(18,7.3),(14,10.7),(10,14),(6,16.8),(3,17.7),(1.5,18.0))
    for ri,(radius,level) in enumerate(mound_rings):
        for i in range(segments):
            a=math.tau*i/segments;wobble=math.sin(i*2.2+ri)*.9+math.sin(i*.67-ri*.4)*.28
            mound.append(((radius+wobble)*math.cos(a),level,(radius+wobble)*math.sin(a)))
    for ri in range(len(mound_rings)-1):
        for i in range(segments):
            a=ri*segments+i;b=ri*segments+(i+1)%segments
            c=(ri+1)*segments+(i+1)%segments;d=(ri+1)*segments+i
            mound_faces.append((a,b,c,d))
    mound_obj=game_mesh('dome-outer:heap-wreck-photo-mound',mound,mound_faces,heap_photo,outer)
    mound_uv=mound_obj.data.uv_layers.active
    for poly in mound_obj.data.polygons:
        for li in poly.loop_indices:
            vi=mound_obj.data.loops[li].vertex_index;ri=vi//segments;around=vi%segments
            mound_uv.data[li].uv=(around/segments*14,ri/(len(mound_rings)-1))
    heap_rings=((22,18,3.8),(18,16,7.3),(14,14,10.7),(10,12,14),(7,10,16),(4.5,8,17.1),(2.5,6,17.65),(1.2,6,17.9))
    rng=__import__('random').Random(5105);serial=0
    for ring,(radius,count,level) in enumerate(heap_rings):
        for i in range(count):
            serial+=1;a=math.tau*i/count+ring*.29
            jitter=rng.uniform(-.35,.35);r=radius+jitter
            rotation=a+math.pi/2+rng.uniform(-.22,.22)
            px,pz=r*math.cos(a),r*math.sin(a)
            body=wreck(f'dome-outer:heap-wreck-{serial:02}',(px,level-.72+rng.uniform(-.10,.12),pz),
                       rotation,outer,600+serial,detail=False,variant=serial%5)
            body.rotation_euler[0]+=rng.uniform(-.13,.13)
            body.rotation_euler[1]+=rng.uniform(-.10,.10)
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
    for i in range(8):
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
    # Scaffold tube guard rail: 100 mm members and 3 m post spacing around
    # the full oval rim. Each segment has a real six-sided circular section.
    rail_segments=72
    for i in range(rail_segments):
        a0=math.tau*i/rail_segments;a1=math.tau*(i+1)/rail_segments
        for y in (18.1,20.3):
            scaffold_tube(f'dome-outer:walkway-rail-{i}-{y}',
                (102*math.cos(a0),y,69*math.sin(a0)),
                (102*math.cos(a1),y,69*math.sin(a1)),.16,dark,outer)
        scaffold_tube(f'dome-outer:walkway-post-{i}',
            (102*math.cos(a0),17.8,69*math.sin(a0)),
            (102*math.cos(a0),20.4,69*math.sin(a0)),.14,steel,outer)
    # Three sturdier lattice floodlight towers. Each lamp can glow at night.
    emission=bpy.data.materials.new('Dome floodlight amber emissive'); emission.diffuse_color=(1,.39,.075,1); emission.use_nodes=True
    sh=emission.node_tree.nodes.get('Principled BSDF')
    sh.inputs['Emission Color'].default_value=(1,.26,.035,1); sh.inputs['Emission Strength'].default_value=3.0
    for i in range(3):
        a=math.tau*i/3+.15
        x,z=108*math.cos(a),74*math.sin(a)
        for side in (-1,1):
            beam(f'dome-outer:tower-leg-{i}-{side}',(x+side*1.5,18,z),(x+side*.85,33,z),.18,dark,outer)
        beam(f'dome-outer:mast-{i}',(x,18,z),(x,33,z),.20,steel,outer)
        for y in (21,25,29,33):
            beam(f'dome-outer:tower-rung-{i}-{y}',(x-1.35,y,z),(x+1.35,y,z),.12,steel,outer)
        beam(f'dome-outer:tower-cross-a-{i}',(x-1.4,20,z),(x+1.4,25,z),.10,steel,outer)
        beam(f'dome-outer:tower-cross-b-{i}',(x+1.4,20,z),(x-1.4,25,z),.10,steel,outer)
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

# Gate at the road side: horizontal 4.4 m double-deck buses face the approach.
for side in (-1,1):
    x=side*8.2;z=-91.2
    body=cube(f'dome-gate:bus-{side}:body',(x,2.2,z),(2.5,4.4,11.0),
              paint,gate,.42,side*.012)
    front=bus_front_left if side<0 else bus_front_right
    side_photo=bus_side_left if side<0 else bus_side_right
    photo_panel(f'dome-gate:bus-{side}:photo-front',(x,2.2,z-5.52),(2.5,4.4),front,gate)
    # Two decks of side windows remain visible from the road-facing side.
    for window_row,yy in enumerate((1.45,2.95)):
        for window_col,zz in enumerate((-3.7,-2.15,-.6,.95,2.5,4.0)):
            cube(f'dome-gate:bus-{side}:deck-{window_row}-window-{window_col}',
                 (x+side*1.27,yy,z+zz),(.075,.72,1.1),glass,gate,.08)
            if (window_row+window_col+side)%3==0:
                beam(f'dome-gate:bus-{side}:broken-glass-edge-{window_row}-{window_col}',
                     (x+side*1.32,yy-.32,z+zz-.45),(x+side*1.32,yy+.28,z+zz+.42),.035,bright,gate)
    # Deep radiator, honest bars, paired lamps and bumper across the exposed nose.
    cube(f'dome-gate:bus-{side}:radiator',(x,.85,z-5.58),(1.35,.82,.12),dark,gate,.08)
    for j in range(7):
        beam(f'dome-gate:bus-{side}:radiator-bar-{j}',(x-.56+j*.187,.45,z-5.66),
             (x-.56+j*.187,1.25,z-5.66),.035,bright,gate)
    for lamp_side in (-1,1):
        cylinder(f'dome-gate:bus-{side}:headlamp',(x+lamp_side*.84,1.35,z-5.62),.19,.10,bright,gate,12,'Y')
        cylinder(f'dome-gate:bus-{side}:wheel',(x+lamp_side*.72,.36,z-3.6),.34,.22,dark,gate,8,'X')
        cylinder(f'dome-gate:bus-{side}:wheel-rear',(x+lamp_side*.72,.36,z+3.6),.34,.22,dark,gate,8,'X')
    beam(f'dome-gate:bus-{side}:bumper',(x-1.18,.52,z-5.72),(x+1.18,.52,z-5.72),.14,bright,gate)
    # A narrow side photo keeps the two decks and their long bus proportions readable.
    photo_side_panel(f'dome-gate:bus-{side}:two-deck-side',(x+side*1.32,2.2,z),(11.0,4.4),side_photo,gate,side)
    for row in range(3):
        wreck(f'dome-gate:foot-hulk-{side}-{row}',(side*(8.0+row*.95),.18,-89-row*2.5),
              side*.09,gate,800+side*6+row,variant=row+1)
# Dark girders and cross-braces carry the sign plate above the drive-through.
for side in (-1,1):
    beam(f'dome-gate:bus-header-post-{side}',(side*10.4,8.9,-92),(side*10.4,13.2,-92),.24,dark,gate)
    beam(f'dome-gate:bus-header-cross-{side}',(side*5.8,8.4,-92),(side*10.5,11,-92),.14,steel,gate)
    # Braced towers, torn tarps and rails rise above both bus roofs.
    for dx in (-1.1,1.1):
        beam(f'dome-gate:sign-scaffold-upright-{side}-{dx}',
             (side*10.8+dx,8.8,-92.15),(side*10.8+dx,15.1,-92.15),.16,dark,gate)
    for y in (10.2,12.4,14.9):
        beam(f'dome-gate:sign-scaffold-rail-{side}-{y}',
             (side*9.55,y,-92.15),(side*12.05,y,-92.15),.14,steel,gate)
    beam(f'dome-gate:sign-scaffold-brace-{side}',
         (side*9.65,9.0,-92.15),(side*11.95,12.3,-92.15),.12,bright,gate)
    tarp=[(side*12.2,13.0,-92.8),(side*16.4,13.0,-92.8),
          (side*16.0,14.2,-91.1),(side*12.0,14.8,-91.2)]
    game_mesh(f'dome-gate:bus-top-tarp-{side}',tarp,[(0,1,2,3)],paint if side<0 else tin_photo,gate)
# Sagging bunting crosses the scaffold above the sign.
beam('dome-gate:bunting-cable',(-13.5,15.3,-91.8),(13.5,15.3,-91.8),.065,dark,gate)
for i in range(12):
    x=-12+i*2.15;y=15.18+(.35 if i%2 else 0)
    game_mesh(f'dome-gate:bunting-flag-{i:02}',
              [(x,y,-91.82),(x+1.35,y,-91.82),(x+.95,y-1.05,-91.78)],
              [(0,1,2)],paint if i%2 else bright,gate)
# Hand-painted header hangs above the drive-through throat, facing the -Z road.
sign=cube('dome-gate:SCRAPDOME-painted-sign',(0,11.0,-92),(13.6,4.7,.42),sign_photo,gate,.11)
# Fit the sign photograph to the broad road-facing face of the thick plate.
for poly in sign.data.polygons:
    if poly.normal.y>.98:
        for li in poly.loop_indices:
            vertex=sign.data.vertices[sign.data.loops[li].vertex_index].co
            sign.data.uv_layers.active.data[li].uv=((6.8-vertex.x)/13.6,(vertex.z+2.35)/4.7)
beam('dome-gate:sign-top-weld',( -9.4,13.32,-92.28),(9.4,13.32,-92.28),.11,bright,gate)
empty('dome-gate:SCRAPDOME-lettering',gate)
# Uneven chips, rust streaks and fasteners keep the large painted plate from reading clean.
for i,(x,y,w,h) in enumerate(((-8.7,12.7,.24,.10),(-7.4,9.0,.14,.32),(-5.2,12.9,.20,.12),
                                (5.3,9.0,.13,.28),(7.6,12.8,.24,.11),(8.8,9.4,.16,.22),
                                (-8.6,10.1,.13,.30),(6.4,10.3,.22,.10))):
    cube(f'dome-gate:sign-rust-chip-{i}',(x,y,-92.48),(w,h,.035),steel,gate,.01,(i%3-1)*.10)
for i,x in enumerate((-10.0,-7.0,7.0,10.0)):
    for y in (8.9,13.1):cylinder(f'dome-gate:sign-rivet-{i}-{y}',(x,y,-92.48),.075,.09,dark,gate,10,'Y')
for side in (-1,1):
    for link in range(10):
        y=10.4-link*.28;x=side*(9.0+link*.08);z=-92.3
        bpy.ops.mesh.primitive_torus_add(major_radius=.12,minor_radius=.035,major_segments=8,minor_segments=4,
            location=town.game_vector((x,y,z)),rotation=(math.pi/2,(link%2)*.28,0))
        obj=bpy.context.object;obj.name=f'dome-gate:sign-chain-{side}-{link}';obj.data.materials.append(dark);obj.parent=gate
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
empty('dome-gate:TICKETS-lettering',gate)
# The rectangular apron is removed. The scene's graded ground and tire ruts
# carry the dirt road to and through the gate.
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

# Join fixed scenery by building to avoid thousands of tiny scene nodes. Keep the
# independently named emissive lamp assembly and sign lettering as child parts.
def normalize_uv_layers(building):
    """Keep one shared UV layer name so Blender joins do not lose picture UVs."""
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        parent_obj=obj.parent
        while parent_obj and parent_obj != building:
            parent_obj=parent_obj.parent
        if parent_obj != building:
            continue
        layers=obj.data.uv_layers
        if not layers:
            continue
        active=layers.active or layers[0]
        for layer in list(layers):
            if layer != active:
                layers.remove(layer)
        active.name='UVMap'

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

normalize_uv_layers(outer)
normalize_uv_layers(gate)
join_building_static(outer)
join_building_static(gate)
# Save the editable Blender source and render candidate in ignored QA staging.
for obj in list(bpy.context.scene.objects):
    if obj.type in {'CAMERA','LIGHT'}:
        bpy.data.objects.remove(obj,do_unlink=True)
blend.parent.mkdir(parents=True,exist_ok=True);out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
                          export_apply=True,export_materials='EXPORT',export_image_format='JPEG')

# Judge exactly what the game receives: discard the authoring scene, import the
# exported GLB into an empty scene, then add only review cameras and daylight.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=820;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=.45
scene.world=bpy.data.worlds.new('Overcast desert daylight');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.34,.31,.27,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8

def area(name,pos,target,energy,size,color):
    bpy.ops.object.light_add(type='AREA',location=town.game_vector(pos));light=bpy.context.object
    light.name=name;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.data.color=color
    light.rotation_euler=(town.game_vector(target)-light.location).to_track_quat('-Z','Y').to_euler()
area('large soft daylight',(-35,145,-45),(0,0,0),18000,100,(1.0,.87,.71))
area('sky bounce',(75,90,20),(0,2,0),9000,95,(.67,.78,1.0))
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
render_dir.mkdir(parents=True,exist_ok=True)
# A plain sheet-only ground plane reaches the camera and sits beneath the gate.
ground_mat=bpy.data.materials.new('Review ground / mid grey brown')
ground_mat.diffuse_color=(.32,.29,.25,1);ground_mat.use_nodes=True
ground_bsdf=ground_mat.node_tree.nodes.get('Principled BSDF')
ground_bsdf.inputs['Base Color'].default_value=(.32,.29,.25,1)
ground_bsdf.inputs['Roughness'].default_value=.95
road_vertices=[(-250,.005,-280),(250,.005,-280),(250,.005,35),(-250,.005,35)]
road=game_mesh('review-only road ground',road_vertices,[(0,3,2,1)],ground_mat,None)
def render_view(filename,location,target,lens,resolution=(1280,820)):
    scene.render.resolution_x,scene.render.resolution_y=resolution
    bpy.ops.object.camera_add(location=town.game_vector(location));camera=bpy.context.object;camera.data.lens=lens
    camera.rotation_euler=(town.game_vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=camera;scene.render.filepath=str(render_dir/filename);bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera,do_unlink=True)
render_view('dome-gate-road-30m.png',(0,1.7,-123),(0,4.5,-92),30)
bpy.data.objects.remove(road,do_unlink=True)
render_view('dome-outer-above-45.png',(0,178,-181),(0,8,0),35)
render_view('dome-outer-side-40m.png',(0,8,112),(0,5,72),45)
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'blend':str(blend),'renders':str(render_dir),'render_source':'exported GLB re-imported into empty scene'}))
