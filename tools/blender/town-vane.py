"""Build Mrs Vane's reclaiming company: Vane Reach and its town fittings.

Run with Blender:
  blender -b --python-exit-code 1 --python tools/blender/town-vane.py -- --root . --round 2

The tower dimensions follow the approved Vane Reach reference and are recorded
below as game metres, +Y up and road-facing -Z. The other pieces reuse its
white enamel, cobalt glass and worn concrete materials.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--round', type=int, choices=(1, 2, 3), default=2)
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
evidence = root / f'.evidence/2026-11-06/TOWN-ART-VANE/round-{a.round}'
out = root / 'public/assets/models/wasteland/town/vane.glb'
blend = root / 'art-build/town/vane.blend'
sheet = root / f'docs/board/looks/town-art-vane/round-{a.round}.jpg'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)
import bpy
from mathutils import Matrix, Vector

# The tower has a welded three-dimensional lattice, measured from the
# approved reference's front and side panels and repeating engineering bays:
#   crown tank diameter 26 m (0.37 x tower height); shell height 13.2 m (0.19 x)
#   support frame base span 36 m (0.51 x); upper span 20 m (0.28 x)
#   central service shaft 7.2 m wide; overall height 70 m (scale anchor).

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0

def material(name, color, roughness=.8, metallic=0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return mat

enamel = material('Vane / chalk white industrial enamel', (.75, .76, .73), .48, .08)
glass = material('Vane / cobalt blue structural glass', (.07, .24, .42), .28, .05)
blue = material('Vane / cobalt water-drop insignia', (.015, .16, .48), .36, .05)
steel = material('Vane / white zinc structural steel', (.48, .50, .49), .54, .15, .06)
dark = material('Vane / deep blue shadow metal', (.035, .055, .072), .48, .20)
concrete = material('Vane / pale poured plaza concrete', (.45, .45, .41), .92)
dust = material('Vane / windblown compacted dust', (.40, .34, .24), .98)
lamp_mat = material('Vane / beacon blue emissive', (.16, .48, 1.0), .25, 0, .9)

family = bpy.data.objects.new('town-vane', None)
bpy.context.collection.objects.link(family)
family.empty_display_type = 'PLAIN_AXES'

def game_point(point):
    """Town contract coordinates (+Y up) to Blender's native (+Z up)."""
    x, y, z = point
    return Vector((x, -z, y))

def parent_to(obj, parent):
    # Every building and part root sits at the town origin; keeping the
    # object's local transform avoids stale depsgraph matrix_world values when
    # parenting freshly-created Blender objects.
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)
    return obj

def building(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = 'CUBE'
    return parent_to(obj, family)

current = None
def assign_uv(mesh, vertices):
    layer = mesh.uv_layers.get('UVMap') or mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        pts = [vertices[mesh.loops[i].vertex_index] for i in poly.loop_indices]
        for loop_index, (x, y, z) in zip(poly.loop_indices, pts):
            # Per-face planar mapping, normalized to local spans. The materials
            # are solid/readable, and every GLB primitive still has real UV span.
            if len(pts) >= 3:
                n = poly.normal
            else:
                n = Vector((0, 0, 1))
            if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z):
                u, v = y, z
                us, vs = [q[1] for q in pts], [q[2] for q in pts]
            elif abs(n.y) >= abs(n.z):
                u, v = x, z
                us, vs = [q[0] for q in pts], [q[2] for q in pts]
            else:
                u, v = x, y
                us, vs = [q[0] for q in pts], [q[1] for q in pts]
            du = max(max(us) - min(us), .001)
            dv = max(max(vs) - min(vs), .001)
            layer.data[loop_index].uv = ((u - min(us)) / du, (v - min(vs)) / dv)

def mesh_obj(name, points, faces, mat, bevel=0):
    world_verts = [game_point(q) for q in points]
    center = Vector(tuple((min(v[i] for v in world_verts) + max(v[i] for v in world_verts)) * .5 for i in range(3)))
    verts = [v-center for v in world_verts]
    mesh = bpy.data.meshes.new(name + ' mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    mesh.update()
    assign_uv(mesh, verts)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = center
    if bevel:
        mod = obj.modifiers.new('small real edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        obj.modifiers.new('weighted steel normals', 'WEIGHTED_NORMAL')
    return parent_to(obj, current)

def box(name, center, size, mat, bevel=.025):
    x, y, z = center
    sx, sy, sz = (q / 2 for q in size)
    points = [(x+dx*sx, y+dy*sy, z+dz*sz) for dx,dy,dz in
              ((-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
               (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1))]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    return mesh_obj(name, points, faces, mat, bevel)

def sand_pile(name, center, width, depth, height):
    x,y,z=center
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,
        location=game_point((x,y+height/2,z)))
    obj=bpy.context.object;obj.name=name;obj.scale=(width/2,depth/2,height/2)
    obj.data.materials.append(dust)
    uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    for loop in obj.data.loops:
        v=obj.data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv=(math.atan2(v.y,v.x)/math.tau+.5,.5+math.asin(max(-1,min(1,v.z)))/math.pi)
    for face in obj.data.polygons: face.use_smooth=True
    return parent_to(obj,current)

def beam(name, a, b, width, mat, depth=None):
    """A connected, genuinely thick rectangular steel member."""
    va, vb = game_point(a), game_point(b)
    direction = vb - va
    obj = box(name, tuple((Vector(a)+Vector(b))*.5), (width, direction.length, depth or width), mat, 0)
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    return obj

def cylinder(name, center, radius, height, mat, sides=32, top_radius=None):
    x,y,z = center
    rt = radius if top_radius is None else top_radius
    points=[]
    for yy,rr in ((y-height/2,radius),(y+height/2,rt)):
        points.extend((x+rr*math.cos(i*math.tau/sides),yy,z+rr*math.sin(i*math.tau/sides)) for i in range(sides))
    faces=[tuple(reversed(range(sides))),tuple(range(sides,2*sides))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    return mesh_obj(name,points,faces,mat)

def torus(name, center, major, minor, mat, major_steps=28, minor_steps=8):
    x,y,z=center; points=[]; faces=[]
    for i in range(major_steps):
        a=math.tau*i/major_steps
        for j in range(minor_steps):
            b=math.tau*j/minor_steps
            r=major+minor*math.cos(b)
            points.append((x+r*math.cos(a), y+minor*math.sin(b), z+r*math.sin(a)))
    for i in range(major_steps):
        for j in range(minor_steps):
            a=i*minor_steps+j; b=i*minor_steps+(j+1)%minor_steps
            c=((i+1)%major_steps)*minor_steps+(j+1)%minor_steps; d=((i+1)%major_steps)*minor_steps+j
            faces.append((a,b,c,d))
    obj=mesh_obj(name,points,faces,mat)
    for face in obj.data.polygons: face.use_smooth=True
    return obj

def text(name, body, center, size, mat, rotation=0):
    font=bpy.data.curves.new(name+' lettering','FONT')
    # The road-facing surface points toward game -Z, which becomes Blender +Y.
    # Reverse the back-facing font mesh so it reads upright from the road side.
    font.body=body; font.size=size; font.resolution_u=2; font.extrude=.002; font.bevel_depth=0
    obj=bpy.data.objects.new(name,font); bpy.context.collection.objects.link(obj)
    obj.location=game_point(center)
    obj.rotation_euler=(math.pi/2,0,rotation)
    obj.scale.x=-1 # keep lettering readable from the road-facing side
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    bpy.ops.object.convert(target='MESH'); obj=bpy.context.object; obj.select_set(False)
    # Converted text gets a single shared UVMap with a useful range.
    if obj.type=='MESH':
        coords=[v.co for v in obj.data.vertices]
        assign_uv(obj.data,coords)
    return parent_to(obj,current)

def drop(name, center, height, mat):
    """Extruded blue drop mark, a real silhouette rather than a decal box."""
    x,y,z=center; w=height*.63
    # Outline: pointed crown, shoulders and a gently rounded lower bulb.
    outline=[(0,height*.50),(-w*.22,height*.13),(-w*.48,-height*.10),
             (-w*.50,-height*.28),(-w*.39,-height*.43),(-w*.20,-height*.50),
             (0,-height*.52),(w*.20,-height*.50),(w*.39,-height*.43),
             (w*.50,-height*.28),(w*.48,-height*.10),(w*.22,height*.13)]
    points=[(x+px,y+py,z+dz) for dz in (-.10,.10) for px,py in outline]
    n=len(outline); faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    return mesh_obj(name,points,faces,mat,.006)

def badge(name, x, y, z, width, height, parent):
    global current
    old=current; current=parent
    box(name+':sign', (x,y,z), (width,height,.18), enamel, .06)
    drop(name+':drop',(x,y+height*.06,z-.14),height*.64,blue)
    current=old

# ---------------------------------------------------------------------------
# First and most carefully measured piece: 70 m Vane Reach landmark.
# The photo's tower occupies about 77% of its image height. At 70 m overall,
# the principal 8.5 m steel bays, 34 m lower splay, 20 m upper body and 26 m
# crown tank preserve the narrow, tall reference silhouette.
# ---------------------------------------------------------------------------
current=building('vane-tower')
box('vane-tower:plaza',(0,.22,0),(46,.44,46),concrete,.12)
box('vane-tower:plaza-dust-south',(0,.24,-21.7),(45,.12,2.4),dust,.04)
box('vane-tower:plaza-dust-east',(21.8,.24,0),(2.2,.12,44),dust,.04)
for x in (-18,18):
    for z in (-18,18):
        box(f'vane-tower:footing-{x}-{z}',(x,.85,z),(3.0,1.3,3.0),concrete,.12)
        # Four tapered box-section legs splay outward from the crown support.
        beam(f'vane-tower:leg-{x}-{z}',(x,.95,z),(x*.55,51,z*.55),1.05,enamel,.84)
        # Exposed flange plates, gussets and visible fastening caps.
        box(f'vane-tower:base-shoe-{x}-{z}',(x,1.65,z),(1.8,.28,1.8),steel,.045)
for x in (-20.5,20.5):
    for z in (-20.5,20.5): sand_pile(f'vane-tower:plaza-sand-{x}-{z}',(x,.44,z),3.2,1.8,.24)

# Four structural faces, with real girders and repeating diagonal X braces.
for height in (9,17.5,26,34.5,43,51):
    spread=18-(height-1)*.155
    for sx in (-1,1):
        for sz in (-1,1):
            box(f'vane-tower:corner-girder-{height}-{sx}-{sz}',(sx*spread,height,sz*spread),(.55,.48,.55),steel,.025)
    for side in (-1,1):
        for zside in (-1,1):
            span=spread
            beam(f'vane-tower:face-x-beam-{height}-{side}-{zside}',(-span,height,zside*span),(span,height,zside*span),.42,steel,.38)
            beam(f'vane-tower:face-z-beam-{height}-{side}-{zside}',(side*span,height,-span),(side*span,height,span),.42,steel,.38)
for lo,hi in zip((1,9,17.5,26,34.5,43),(9,17.5,26,34.5,43,51)):
    for face in range(4):
        angle=face*math.pi/2
        spread0=18-(lo-1)*.155; spread1=18-(hi-1)*.155
        for cross in (0,1):
            if cross==0: a0=(-spread0,lo,-spread0); b0=(spread0,hi,-spread1)
            else: a0=(spread0,lo,-spread0); b0=(-spread1,hi,-spread1)
            # Rotate the south face around the tower's vertical axis.
            def rot(q): return (q[0]*math.cos(angle)+q[2]*math.sin(angle),q[1],-q[0]*math.sin(angle)+q[2]*math.cos(angle))
            beam(f'vane-tower:cross-brace-{lo}-{face}-{cross}',rot(a0),rot(b0),.30,steel,.24)

# Central blue-glass service lift and three projecting inspection galleries.
box('vane-tower:glass-shaft',(0,26,0),(7.2,49,7.2),glass,.16)
for y in range(4,50,4):
    for xside in (-1,1):
        beam(f'vane-tower:shaft-mullion-x-{y}-{xside}',(xside*3.62,y,-3.62),(xside*3.62,y,3.62),.12,steel)
    for zside in (-1,1):
        beam(f'vane-tower:shaft-mullion-z-{y}-{zside}',(-3.62,y,zside*3.62),(3.62,y,zside*3.62),.12,steel)
for y,spread in ((11,16),(27,13.2),(45,10)):
    box(f'vane-tower:inspection-deck-{y}',(0,y,0),(spread*1.36,.34,spread*1.36),steel,.04)
    for edge in (-1,1):
        beam(f'vane-tower:deck-rail-front-{y}-{edge}',(edge*spread*.65,y+1.08,-spread*.65),(edge*spread*.65,y+1.08,spread*.65),.10,enamel,.08)
        beam(f'vane-tower:deck-rail-side-{y}-{edge}',(-spread*.65,y+1.08,edge*spread*.65),(spread*.65,y+1.08,edge*spread*.65),.10,enamel,.08)

# Crown tank support ring, steel bowl, twelve welded vertical shell seams,
# maintenance catwalk and the upper white tank with the photo's blue drop.
cylinder('vane-tower:tank-support-bowl',(0,52.6,0),13.0,4.0,steel,48,9.0)
torus('vane-tower:tank-support-ring',(0,55.0,0),12.1,.36,enamel,36,8)
cylinder('vane-tower:crown-tank',(0,61.3,0),13.0,13.2,enamel,64)
for y in (55.0,56.2,59.0,62.0,65.2,67.5):
    torus(f'vane-tower:tank-rolled-seam-{y}',(0,y,0),13.02,.11,steel,36,6)
for i in range(24):
    angle=i*math.tau/24
    x,z=13.02*math.cos(angle),13.02*math.sin(angle)
    beam(f'vane-tower:tank-shell-weld-{i:02d}',(x,55.4,z),(x,67.3,z),.045,steel,.035)
# Separate front and rear crown insignia panels; the main road view sees front.
badge('vane-tower:front-logo',0,61.7,-13.08,8.0,8.4,current)
badge('vane-tower:rear-logo',0,61.7,13.08,8.0,8.4,current)
torus('vane-tower:catwalk-rail-lower',(0,55.4,0),13.9,.075,enamel,36,6)
torus('vane-tower:catwalk-rail-upper',(0,56.6,0),13.9,.075,enamel,36,6)
for i in range(36):
    angle=i*math.tau/36
    beam(f'vane-tower:catwalk-post-{i:02d}',(13.9*math.cos(angle),55.4,13.9*math.sin(angle)),(13.9*math.cos(angle),56.6,13.9*math.sin(angle)),.07,enamel,.07)
cylinder('vane-tower:roof-crown',(0,68.2,0),12.7,1.8,enamel,36,10.8)
cylinder('vane-tower:breather',(0,69.5,0),.9,.85,steel,16,.68)
for i in range(4):
    theta=i*math.pi/2
    beam(f'vane-tower:fill-pipe-{i}',(2.0*math.cos(theta),51.2,2.0*math.sin(theta)),(2.0*math.cos(theta),57.0,2.0*math.sin(theta)),.22,steel,.22)
# Broad access ladder and real cage rings on the back side, above the plaza.
for x in (-.55,.55): beam(f'vane-tower:ladder-rail-{x}',(x,.95,-3.75),(x,50.7,-3.75),.105,steel,.09)
for y in range(2,51,1): beam(f'vane-tower:ladder-rung-{y}',(-.55,y,-3.75),(.55,y,-3.75),.085,steel,.08)
for y in range(5,50,4):
    bpy.ops.mesh.primitive_torus_add(major_radius=.78,minor_radius=.045,major_segments=16,minor_segments=6,location=game_point((0,y,-3.75)))
    cage=bpy.context.object;cage.name=f'vane-tower:ladder-cage-{y}';cage.data.materials.append(steel);parent_to(cage,current)
# Beacon assembly is its own named movable/lightable node.
lamp=bpy.data.objects.new('vane-tower:lamp',None);bpy.context.collection.objects.link(lamp);parent_to(lamp,current)
old=current;current=lamp
cylinder('vane-tower:lamp:beacon-housing',(0,69.8,0),.58,.8,steel,20)
cylinder('vane-tower:lamp:blue-lens',(0,70.25,0),.43,.20,lamp_mat,20)
current=old

# Smaller sale points and hardware, kept compact within their 8 m grid cells.
current=building('vane-kiosk')
box('vane-kiosk:raised-slab',(0,.18,0),(7.0,.36,7.0),concrete,.10)
for x in (-2.55,2.55):
    for z in (-2.45,2.45): sand_pile(f'vane-kiosk:banked-sand-{x}-{z}',(x,.36,z),1.4,1.2,.18)
box('vane-kiosk:booth',(0,2.35,.25),(5.7,4.35,4.7),enamel,.10)
for x in (-2.65,2.65): box(f'vane-kiosk:lower-corner-wear-{x}',(x,.72,-2.12),(.32,.55,.045),dust,.01)
box('vane-kiosk:front-counter',(0,1.9,-2.18),(4.8,1.2,.18),steel,.04)
box('vane-kiosk:service-window',(0,3.35,-2.13),(3.65,1.25,.16),glass,.04)
for x in (-1.8,1.8): box(f'vane-kiosk:window-frame-{x}',(x,3.35,-2.25),(.13,1.5,.14),steel,.02)
for x in (-1.25,-.42,.42,1.25):
    cylinder(f'vane-kiosk:bottle-{x}',(x,2.85,-2.48),.18,.68,glass,12,.12)
badge('vane-kiosk:drop-sign',0,4.9,-2.17,3.4,1.2,current)
for x in (-2.7,2.7):
    beam(f'vane-kiosk:queue-post-front-{x}',(x,.2,-3.4),(x,1.15,-3.4),.12,steel,.12)
    beam(f'vane-kiosk:queue-post-rear-{x}',(x,.2,-1.3),(x,1.15,-1.3),.12,steel,.12)
    beam(f'vane-kiosk:queue-rail-{x}',(x,.96,-3.4),(x,.96,-1.3),.075,steel,.075)

current=building('vane-tank')
box('vane-tank:pad',(0,.18,0),(14.2,.36,14.2),concrete,.10)
for x in (-6.0,6.0):
    for z in (-6.0,6.0): sand_pile(f'vane-tank:banked-sand-{x}-{z}',(x,.36,z),2.0,1.5,.20)
cylinder('vane-tank:vertical-storage',(0,4.1,0),5.7,7.5,enamel,48)
for y in (.6,1.2,3.2,5.1,7.4): torus(f'vane-tank:rolled-band-{y}',(0,y,0),5.74,.12,steel,48,8)
cylinder('vane-tank:domed-lid',(0,7.95,0),5.65,1.0,enamel,48,4.8)
badge('vane-tank:logo',0,4.6,-5.78,3.4,3.6,current)
for x in (-1,1):
    beam(f'vane-tank:access-rail-{x}',(x*1.1,.5,-5.85),(x*1.1,7.9,-5.85),.09,steel,.09)
for y in range(1,8): beam(f'vane-tank:access-rung-{y}',(-1.1,y,-5.85),(1.1,y,-5.85),.075,steel,.07)

current=building('vane-depot')
box('vane-depot:loading-yard',(0,.12,0),(22.5,.24,14.5),concrete,.08)
for x in (-10,10):
    for z in (-6.1,6.1): sand_pile(f'vane-depot:yard-sand-{x}-{z}',(x,.24,z),2.2,1.5,.22)
for center,width,depth,height in (((-5.0,0,2.3),10.5,8.5,5.0),((5.0,0,2.3),9.5,8.5,5.0)):
    x,_,z=center
    box(f'vane-depot:shed-{x}',(x,height/2,z),(width,height,depth),enamel,.08)
    for side in (-1,1): box(f'vane-depot:sand-blast-corner-{x}-{side}',(x+side*(width/2-.18),.62,z-depth/2-.085),(.28,.72,.035),dust,.01)
    # Low pitched shallow roof with a raised ridge and thin drip edge.
    for side in (-1,1):
        panel=box(f'vane-depot:roof-{x}-{side}',(x,height+.18,z+side*depth*.24),(width+.35,.20,depth*.56),steel,.035)
        panel.rotation_euler.x=side*.10
    box(f'vane-depot:loading-door-{x}',(x,2.05,z-depth/2-.09),(3.8,3.4,.16),glass,.04)
    for side in (-1,1):
        box(f'vane-depot:door-jamb-{x}-{side}',(x+side*2.05,2.0,z-depth/2-.18),(.22,3.8,.24),steel,.025)
    for i in range(4):
        box(f'vane-depot:pallet-{x}-{i}',(x-2.7+i*1.8,.48,-4.7),(1.15,.82,.78),steel,.04)
# A true chain-wire loading bay fence: rails plus many thin vertical wires.
for z in (-6.8,6.8):
    for x in range(-10,12,4):
        beam(f'vane-depot:fence-post-{x}-{z}',(x,.12,z),(x,2.5,z),.12,steel,.12)
    beam(f'vane-depot:fence-rail-low-{z}',(-10,.55,z),(10,.55,z),.065,steel,.065)
    beam(f'vane-depot:fence-rail-high-{z}',(-10,2.45,z),(10,2.45,z),.065,steel,.065)
    for x in range(-10,11): beam(f'vane-depot:chain-link-{x}-{z}',(x,.65,z),(x,2.35,z),.022,dark,.018)
badge('vane-depot:yard-sign',0,3.1,-6.85,4.0,1.3,current)

current=building('vane-fence')
# Each fence option occupies exactly one 8 m cell and terminates at its edge.
def fence_run(prefix,a,b):
    dx=b[0]-a[0];dz=b[2]-a[2];length=math.hypot(dx,dz);steps=8
    for i in range(steps+1):
        t=i/steps;x=a[0]+dx*t;z=a[2]+dz*t
        beam(f'vane-fence:{prefix}:post-{i}',(x,.15,z),(x,2.25,z),.12,steel,.12)
    for y in (.65,2.05): beam(f'vane-fence:{prefix}:rail-{y}',(a[0],y,a[2]),(b[0],y,b[2]),.09,enamel,.08)
    for i in range(8):
        t=(i+.5)/8;x=a[0]+dx*t;z=a[2]+dz*t
        # wire panel is individually thin and remains contained in the cell
        beam(f'vane-fence:{prefix}:mesh-a-{i}',(x-.25,.68,z),(x+.25,2.0,z),.022,dark,.018)
        beam(f'vane-fence:{prefix}:mesh-b-{i}',(x+.25,.68,z),(x-.25,2.0,z),.022,dark,.018)
fence_run('straight',(-4,.15,0),(4,.15,0))
fence_run('end',(-4,.15,0),(4,.15,0))
fence_run('corner-a',(0,.15,0),(0,.15,-4))
fence_run('corner-b',(0,.15,0),(4,.15,0))

current=building('vane-billboard')
box('vane-billboard:footing',(0,.20,0),(7.0,.4,7.0),concrete,.10)
for x in (-2.55,2.55):
    for z in (-2.45,2.45): sand_pile(f'vane-billboard:banked-sand-{x}-{z}',(x,.4,z),1.4,1.2,.18)
for x in (-2.5,2.5):
    beam(f'vane-billboard:post-{x}',(x,.3,0),(x,7.0,0),.24,steel,.22)
box('vane-billboard:white-enamel-board',(0,5.3,0),(7.0,3.3,.26),enamel,.08)
drop('vane-billboard:blue-drop',(-2.3,5.45,-.17),2.3,blue)
text('vane-billboard:PURE','PURE.',(3.0,6.15,-.19),.80,blue)
text('vane-billboard:SAFE','SAFE.',(3.0,5.30,-.19),.80,blue)
text('vane-billboard:YOURS','YOURS.',(3.0,4.45,-.19),.80,blue)
for x in (-2.8,2.8):
    for z in (-.12,.12):
        for y in (4.0,6.6):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.055,location=game_point((x,y,z)))
            rivet=bpy.context.object;rivet.name=f'vane-billboard:rivet-{x}-{y}-{z}';rivet.scale=(1,.6,1);rivet.data.materials.append(steel);parent_to(rivet,current)

# Repeated angled stays, ladders and other linework remain physically thick.
# Batch fixed geometry by building and material; only the named lamp assembly
# remains separate for game lighting. This keeps the landmark inexpensive to draw.
BUILDING_IDS=('vane-kiosk','vane-tank','vane-depot','vane-fence','vane-billboard','vane-tower')
for building_id in BUILDING_IDS:
    owner=bpy.data.objects[building_id]
    groups={}
    for obj in list(owner.children):
        if obj.type!='MESH': continue
        for modifier in list(obj.modifiers):
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True);bpy.context.view_layer.objects.active=obj
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        material_name=obj.data.materials[0].name if obj.data.materials else 'unpainted'
        groups.setdefault(material_name,[]).append(obj)
    for material_name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1: bpy.ops.object.join()
        joined=bpy.context.view_layer.objects.active
        joined.name=f'{building_id}:mesh:{material_name}'
# Keep artwork construction repeatable and avoid cameras/lights in the GLB.
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    obj.select_set(obj.type in {'MESH','EMPTY'})
bpy.context.view_layer.objects.active=family

out.parent.mkdir(parents=True,exist_ok=True)
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
                          export_apply=True,export_materials='EXPORT',export_image_format='JPEG')
print('Exported',out,'bytes',out.stat().st_size)

# Render only the exported, re-imported GLB. No modelling-scene render is used
# for evidence or review, following the shared town asset pipeline.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.import_scene.gltf(filepath=str(out))
imported=[o for o in bpy.context.scene.objects if o.type in {'MESH','EMPTY'}]
mesh_objects=[o for o in imported if o.type=='MESH']
if not mesh_objects: raise RuntimeError('GLB re-import has no meshes')
for obj in mesh_objects:
    if not obj.data.uv_layers or obj.data.uv_layers[0].name!='UVMap':
        raise RuntimeError(f'{obj.name} lost UVMap in the exported GLB')

def view_box(objects):
    coords=[]
    for obj in objects:
        for corner in obj.bound_box:
            coords.append(obj.matrix_world @ Vector(corner))
    lo=Vector(tuple(min(p[i] for p in coords) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in coords) for i in range(3)))
    return lo,hi

BUILDING_IDS=('vane-kiosk','vane-tank','vane-depot','vane-fence','vane-billboard','vane-tower')
def isolate_building(selected):
    def descendants(obj):
        result=[obj]
        for child in obj.children: result.extend(descendants(child))
        return result
    for name in BUILDING_IDS:
        obj=bpy.data.objects.get(name)
        if obj:
            for part in descendants(obj): part.hide_render=(name!=selected)

def camera(name, eye, target, ortho, resolution, path, only=None, with_ground=True,
           projection='ORTHO', lens=50):
    if only: isolate_building(only)
    if not with_ground: review_ground.hide_render=True
    data=bpy.data.cameras.new(name); cam=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(cam)
    cam.location=eye; cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    data.type=projection
    if projection=='ORTHO': data.ortho_scale=ortho
    else: data.lens=lens
    bpy.context.scene.camera=cam
    scene=bpy.context.scene;scene.render.resolution_x=resolution[0];scene.render.resolution_y=resolution[1];scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True);bpy.data.cameras.remove(data)
    for obj in bpy.context.scene.objects: obj.hide_render=False

scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.world=bpy.data.worlds.new('bright neutral overcast world')
scene.world.use_nodes=True
scene.world.color=(.60,.60,.60)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.60,.60,.60,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
# Large bright overcast sources and pale neutral ground.
for loc,power,size in (((-55,-45,110),30000,42),((55,20,85),21000,35),((0,80,70),14000,30)):
    data=bpy.data.lights.new('large overcast softbox','AREA');light=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(light);light.location=loc;data.energy=power;data.shape='DISK';data.size=size
ground=bpy.data.materials.new('review ground / neutral midtone');ground.diffuse_color=(.35,.35,.33,1);ground.use_nodes=True;ground.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.35,.35,.33,1);ground.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.35));review_ground=bpy.context.object;review_ground.name='review ground';review_ground.data.materials.append(ground)
evidence.mkdir(parents=True,exist_ok=True)
# Whole-family angles. 6x6 cells cover 48 m: plaza at 46 m leaves the required
# half-metre clearance, and other building dimensions stay inside their cells.
lo,hi=view_box(mesh_objects)
camera('Vane Reach mayor detail',(59,59,108),(0,0,35),135,(1350,1000),evidence/'tower-mayor.png','vane-tower')
camera('Vane Reach driver front',(0,40,1.5),(0,0,30),95,(1350,1000),evidence/'tower-driver.png','vane-tower',False,'PERSP',20)
camera('Vane Reach photo matched front',(0,60,29),(0,0,35),110,(1350,1000),evidence/'tower-front-match.png','vane-tower',False)
camera('Vane kiosk',(12,14,10),(0,0,2.6),12,(900,680),evidence/'kiosk.png','vane-kiosk')
camera('Vane bulk tank',(19,22,16),(0,0,4),23,(900,680),evidence/'tank.png','vane-tank')
camera('Vane depot',(25,29,21),(0,0,3),35,(900,680),evidence/'depot.png','vane-depot')
camera('Vane fence',(12,15,10),(0,0,1),14,(900,680),evidence/'fence.png','vane-fence')
camera('Vane billboard',(14,16,10),(0,0,3.4),16,(900,680),evidence/'billboard.png','vane-billboard')
print('Re-import render complete; mesh count',len(mesh_objects),'bounds',tuple(lo),tuple(hi))
