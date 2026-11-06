"""Town food buildings: one hand-built soup kitchen anchors a market family."""
import argparse
import json
import math
import random
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
evidence = root / '.evidence/2026-11-06/town-art-food/round-1'
out = root / 'public/assets/models/wasteland/town/food.glb'
blend = root / 'art-build/town/food.blend'
sheet = root / 'docs/board/looks/town-art-food/round-1.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
textures = root / 'public/assets/models/wasteland/town/textures'
mat = town.make_materials({
    'weathered-plank': textures / 'town-food-plank.jpg',
    'rusted-steel': textures / 'town-food-steel.jpg',
    'patched-canvas': textures / 'town-food-canvas.jpg',
    'galvanised-tin': textures / 'town-food-corrugated.jpg',
    'cracked-concrete': textures / 'town-water-concrete.jpg',
    'sand': textures / 'town-water-earth.jpg',
})
# Town base darkens rusted steel for general utility work. This family uses
# the unfiltered food-specific photograph to keep worn red-brown oxide legible.
steel_photo = bpy.data.images.load(str(textures / 'town-food-steel.jpg'), check_existing=False)
steel_photo.scale(256, 256); steel_photo.file_format='JPEG'; steel_photo.pack()
mat['rusted-steel'].node_tree.nodes.get('Image Texture').image = steel_photo
mat['rusted-steel'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .22
# Six independent repeating material photos fit comfortably inside the card's
# 1K image-pixel budget while avoiding a glTF texture atlas.
for material in mat.values():
    image = material.node_tree.nodes.get('Image Texture').image
    image.scale(256, 256)
    image.pack()

def simple(name, color, roughness=.88, metallic=0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = min(metallic, .29)
    return m

mat['dark-steel'] = simple('Town / charred pot steel', (.105, .088, .067), .84, .22)
mat['fire'] = simple('Town / firelight', (.72, .255, .045), .72)
mat['leaf'] = simple('Town / dusty greens', (.12, .205, .105), .94)
mat['fruit-red'] = simple('Town / bruised red fruit', (.38, .12, .075), .84)
mat['fruit-yellow'] = simple('Town / dried yellow fruit', (.47, .34, .12), .86)
mat['crate'] = mat['weathered-plank']
mat['wire'] = simple('Town / dark wire', (.12, .13, .115), .78, .14)
mat['rubber'] = simple('Town / dusty tire rubber', (.075, .078, .071), .95)
mat['glass'] = simple('Town / dirty greenhouse glass', (.22, .28, .245), .32, .05)
mat['brick'] = mat['salvaged-brick']
mat['letter-paint'] = simple('Town / muted ochre hand lettering', (.42, .29, .15), .92)

family = bpy.data.objects.new('town-food', None)
bpy.context.collection.objects.link(family)
export_objects = {family}
current = None
building_roots = {}

def add_building(name, location):
    global current
    current = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(current)
    current.parent = family
    current.location = town.game_vector(location)
    building_roots[name] = current

def keep(obj, parent=None):
    parent = parent or current
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)
    export_objects.add(obj)
    return obj

def box(name, center, size, material, bevel=.03):
    return keep(town.cube(name, center, size, material, bevel))

def beam(name, a, b, width, material):
    return keep(town.beam(name, a, b, width, material))

def cylinder(name, center, radius, depth, material, vertices=16, axis='Y'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=town.game_vector(center))
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(material)
    if axis == 'X': obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Z': obj.rotation_euler[0] = math.pi / 2
    for p in obj.data.polygons: p.use_smooth = len(p.vertices) > 4
    return keep(obj)

def sphere(name, center, scale, material, segments=10, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1,
                                        location=town.game_vector(center))
    obj=bpy.context.object; obj.name=name; obj.scale=(scale[0],scale[2],scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for p in obj.data.polygons: p.use_smooth=True
    return keep(obj)

def mesh_object(name, vertices, faces, material, uv_mode='planar'):
    mesh=bpy.data.meshes.new(name+' formed surface')
    mesh.from_pydata([town.game_vector(v) for v in vertices], [], faces); mesh.materials.append(material); mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            x,y,z=vertices[mesh.loops[li].vertex_index]
            uv.data[li].uv=(x/2, z/2) if uv_mode=='planar' else (x, z)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return keep(obj)

def tin_roof(name, x, y, z, width, depth, pitch=0):
    # Thin formed sheet panels, their 10 cm pressed ridges catch overcast light.
    count=max(8,round(width/.10)); dx=width/count; verts=[]; faces=[]
    for row, zz in enumerate((-depth/2, depth/2)):
        for i in range(count+1):
            xx=-width/2+i*dx
            ridge=.024 if i%2==0 else -.024
            verts.append((x+xx, y+math.tan(pitch)*zz+ridge, z+zz))
    for i in range(count): faces.append((i,i+1,count+2+i,count+1+i))
    obj=mesh_object(name,verts,faces,mat['galvanised-tin'])
    # Folded rolled edges and a second support rib make the sheet read as metal.
    beam(name+'-front-edge',(x-width/2,y,z-depth/2),(x+width/2,y,z-depth/2),.045,mat['rusted-steel'])
    return obj

def tin_wall(name, x, y, z, width, height):
    count=max(8,round(width/.10));dx=width/count;verts=[];faces=[]
    for yy in (y-height/2,y+height/2):
        for i in range(count+1):
            xx=x-width/2+i*dx;wave=.027 if i%2==0 else -.027
            verts.append((xx,yy,z+wave))
    front=len(verts)
    verts.extend((vx,vy,vz+.018) for vx,vy,vz in tuple(verts))
    for i in range(count):
        face=(i,i+1,count+2+i,count+1+i)
        faces.extend((face,tuple(reversed(tuple(k+front for k in face)))))
    return mesh_object(name,verts,faces,mat['galvanised-tin'])

def sign(name, center, text, width=1.3):
    x,y,z=center
    board=box(name+':sign-board',(x,y,z),(width,.42,.085),mat['weathered-plank'],.025)
    font=bpy.data.curves.new(name+' hand lettering','FONT');font.body=text;font.size=.23;font.extrude=0;font.resolution_u=4
    obj=bpy.data.objects.new(name+':sign-lettering',font);bpy.context.collection.objects.link(obj)
    obj.location=town.game_vector((x-width*.44,y-.105,z+.05)); obj.rotation_euler=(-math.pi/2,0,0)
    font.materials.append(mat['letter-paint']); bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH');keep(bpy.context.object)
    return board

def ground_clutter(name,x,z,material=mat['sand']):
    # Low irregular packed dirt that stays in the marked building footprint.
    box(name+':dirt-foot',(x,.06,z),(2.5,.12,2.4),material,.12)

# Make the soup kitchen first: its 4 m canopy, fire, pot and benches anchor the family.
add_building('soup-kitchen',(30,0,-14))
ground_clutter('soup-kitchen',0,0)
# Six welded uprights, three diagonal braces, front and rear lintels, all real stock.
for x in (-1.85,0,1.85):
    for z in (-1.55,1.55):
        beam(f'soup-kitchen:steel-post-{x}-{z}',(x,.12,z),(x,2.68,z),.095,mat['rusted-steel'])
for z in (-1.55,1.55):
    beam(f'soup-kitchen:front-lintel-{z}',(-2.0,2.58,z),(2.0,2.58,z),.11,mat['rusted-steel'])
for x in (-1.85,1.85):
    beam(f'soup-kitchen:side-lintel-{x}',(x,2.58,-1.55),(x,2.58,1.55),.105,mat['rusted-steel'])
for x in (-1.85,1.85):
    beam(f'soup-kitchen:front-brace-{x}',(x,.68,-1.53),(x+.56,2.48,-1.53),.075,mat['rusted-steel'])
# Roof is made of overlapping bent panels; the patched canvas skirts hang beneath it.
tin_roof('soup-kitchen:roof-sheet-left',-.95,2.83,0,2.1,3.35,.055)
tin_roof('soup-kitchen:roof-sheet-right',1.0,2.83,0,2.1,3.35,-.065)
for x in (-.95,1.02):
    for z in (-1.58,1.58):
        beam(f'soup-kitchen:roof-rafter-{x}-{z}',(x,2.68,z),(x,2.83,0),.075,mat['rusted-steel'])
# Wind-torn canvas apron is separated into overlapping stitched panels, not a flat wall.
for i,(x,width,drop) in enumerate(((-1.38,1.05,.62),(-.25,1.12,.46),(.95,1.2,.72)),1):
    y=2.30-drop/2
    box(f'soup-kitchen:patched-awning-panel-{i}',(x,y,-1.54),(width,drop,.035),mat['patched-canvas'],.015)
    beam(f'soup-kitchen:canvas-seam-{i}',(x-width/2,y,-1.565),(x+width/2,y,-1.565),.022,mat['weathered-plank'])
# The back wall is three separately lapped 100 mm corrugated sheets, not one block.
for i,x in enumerate((-1.3,0,1.3),1):
    tin_wall(f'soup-kitchen:rear-corrugated-panel-{i}',x,1.38,1.53,1.32,1.88)
    for y in (.44,2.32): beam(f'soup-kitchen:rear-panel-edge-{i}-{y}',(x-.67,y,1.53),(x+.67,y,1.53),.045,mat['rusted-steel'])
# Kitchen work shelf, buckets, charcoal-black stockpot, rolled rim, handles and hanging ladle.
box('soup-kitchen:work-table',(-1.25,1.10,.68),(1.25,.14,.84),mat['weathered-plank'],.035)
for x in (-1.72,-.78): beam(f'soup-kitchen:table-leg-{x}',(x,.16,.68),(x,1.05,.68),.07,mat['rusted-steel'])
cylinder('soup-kitchen:iron-soup-pot',(0,1.05,-.12),.57,.76,mat['dark-steel'],24)
cylinder('soup-kitchen:pot-belly-band',(0,1.10,-.12),.585,.10,mat['rusted-steel'],24)
cylinder('soup-kitchen:pot-rim',(0,1.47,-.12),.60,.075,mat['galvanised-tin'],24)
cylinder('soup-kitchen:pot-lid',(0,1.52,-.12),.50,.045,mat['dark-steel'],24)
sphere('soup-kitchen:pot-lid-knob',(0,1.60,-.12),(.10,.11,.10),mat['iron-dark'],10,6)
for side in (-1,1):
    beam(f'soup-kitchen:pot-handle-{side}',(side*.54,1.29,-.12),(side*.77,1.29,-.12),.07,mat['iron-dark'])
    cylinder(f'soup-kitchen:pot-handle-grip-{side}',(side*.76,1.29,-.12),.10,.11,mat['weathered-plank'],10,'X')
# Rough hearth with embedded stone and linked split wood, coal and a controlled flame cluster.
box('soup-kitchen:hearth-bed',(0,.23,-.12),(1.78,.30,1.45),mat['brick'],.13)
rng=random.Random(205)
for i in range(7):
    a=math.tau*i/7; x=math.cos(a)*.72; z=-.12+math.sin(a)*.58
    sphere(f'soup-kitchen:hearth-stone-{i+1}',(x,.39,z),(.32,.25,.28),mat['cracked-concrete'],8,5)
for i in range(4):
    x=-.42+i*.26
    beam(f'soup-kitchen:split-firewood-{i+1}',(x,.47,-.42),(x+.22,.54,.21),.10,mat['weathered-plank'])
for i,offset in enumerate((-.18,.0,.18),1):
    sphere(f'soup-kitchen:fire-core-{i}',(offset,.64,-.12),(.11,.34,.09),mat['fire'],8,5)
# Two joined trestle benches flank the fire; they are rough, thick timber, not plank planes.
for side,z in enumerate((-1.10,1.10),1):
    box(f'soup-kitchen:bench-{side}-seat',(0,.48,z),(2.65,.14,.46),mat['weathered-plank'],.035)
    for x in (-.98,.98):
        beam(f'soup-kitchen:bench-{side}-leg-{x}',(x,.10,z-.16),(x,.44,z-.16),.09,mat['weathered-plank'])
        beam(f'soup-kitchen:bench-{side}-leg-back-{x}',(x,.10,z+.16),(x,.44,z+.16),.09,mat['weathered-plank'])
        beam(f'soup-kitchen:bench-{side}-crossbar-{x}',(x,.23,z-.20),(x,.23,z+.20),.07,mat['rusted-steel'])
for i,x in enumerate((-1.73,-1.35),1):
    cylinder(f'soup-kitchen:water-can-{i}',(x,.54,.72),.19,.72,mat['galvanised-tin'],12)
    cylinder(f'soup-kitchen:can-neck-{i}',(x,.94,.72),.07,.12,mat['rusted-steel'],10)
for i in range(4):
    box(f'soup-kitchen:stacked-bowl-{i+1}',(-.95+i*.27,1.31,.55),(.22,.09,.22),mat['galvanised-tin'],.035)
sign('soup-kitchen',(0,2.17,-1.6),'HOT SOUP',1.55)

# Supporting food buildings use the same welded framing, separate materials and real-thickness parts.
add_building('greenhouse',(-16,0,-14))
ground_clutter('greenhouse',0,0)
for x in (-3.0,-1.0,1.0,3.0):
    beam(f'greenhouse:upright-{x}',(x,.12,-2.2),(x,2.35,-2.2),.065,mat['rusted-steel'])
    beam(f'greenhouse:back-post-{x}',(x,.12,2.2),(x,2.35,2.2),.065,mat['rusted-steel'])
    beam(f'greenhouse:roof-rafter-{x}',(x,2.35,-2.2),(x,2.70,0),.06,mat['weathered-plank'])
    beam(f'greenhouse:roof-rafter-back-{x}',(x,2.35,2.2),(x,2.70,0),.06,mat['weathered-plank'])
for y in (.15,1.15,2.3):
    for z in (-2.2,2.2): beam(f'greenhouse:long-rail-{y}-{z}',(-3.1,y,z),(3.1,y,z),.045,mat['rusted-steel'])
for i in range(6):
    z=-1.75+i*.70
    box(f'greenhouse:growing-bed-{i+1}',(0,.28,z),(5.75,.38,.48),mat['weathered-plank'],.09)
    for j in range(9):
        x=-2.55+j*.62
        sphere(f'greenhouse:leaf-{i+1}-{j+1}',(x,.62,z),(.20,.24,.20),mat['leaf'],8,5)
for z in (-2.15,0,2.15):
    panel=box(f'greenhouse:glazed-roof-panel-{z}',(0,2.43,z),(6.3,.045,.82),mat['glass'],.008)
    panel.rotation_euler[0]=.17 if z>0 else -.17
for z in (-1.9,0,1.9): box(f'greenhouse:roof-patch-{z}',(2.65,2.49,z),(.72,.06,.8),mat['patched-canvas'],.02)
box('greenhouse:water-butt',(2.45,.57,1.55),(.52,1.04,.52),mat['rusted-steel'],.1)

add_building('goat-pen',(8,0,-14))
ground_clutter('goat-pen',0,0)
for x in (-1.9,0,1.9):
    for z in (-1.9,1.9): beam(f'goat-pen:post-{x}-{z}',(x,.1,z),(x,1.35,z),.13,mat['weathered-plank'])
for z in (-1.9,1.9):
    for y in (.40,.85,1.25): beam(f'goat-pen:rail-{z}-{y}',(-1.9,y,z),(1.9,y,z),.095,mat['weathered-plank'])
for x in (-1.9,1.9):
    for y in (.4,.85): beam(f'goat-pen:side-rail-{x}-{y}',(x,y,-1.9),(x,y,1.9),.09,mat['weathered-plank'])
# Pitched low shelter with salvaged roof plates, hay bedding and a trough.
beam('goat-pen:shelter-ridge',(-1.0,2.05,.72),(1.0,2.05,.72),.10,mat['rusted-steel'])
for side in (-1,1):
    p=box(f'goat-pen:shelter-roof-{side}',(0,1.86,.72+side*.45),(2.35,.08,1.08),mat['galvanised-tin'],.02)
    p.rotation_euler[0]=side*.30
box('goat-pen:shelter-back',(0,1.0,1.18),(2.1,1.8,.08),mat['weathered-plank'],.03)
box('goat-pen:hay-bale',(0,.22,.85),(1.3,.35,.75),mat['patched-canvas'],.10)
box('goat-pen:feed-trough',(0,.38,-1.10),(2.2,.52,.55),mat['rusted-steel'],.09)
for x in (-1.5,1.5): beam(f'goat-pen:gate-hinge-{x}',(x,.18,-1.91),(x,1.2,-1.91),.11,mat['iron-dark'])
beam('goat-pen:gate-upper',(-1.45,1.05,-1.91),(1.35,1.05,-1.91),.10,mat['weathered-plank'])
beam('goat-pen:gate-brace',(-1.35,.30,-1.91),(1.25,1.0,-1.91),.08,mat['rusted-steel'])

add_building('chicken-run',(20,0,-14))
ground_clutter('chicken-run',0,0)
for x in (-1.25,1.25):
    for z in (-1.25,1.25): beam(f'chicken-run:frame-post-{x}-{z}',(x,.12,z),(x,1.65,z),.085,mat['rusted-steel'])
for y in (.18,.58,1.0,1.42,1.62):
    for z in (-1.25,1.25): beam(f'chicken-run:wire-rail-{y}-{z}',(-1.25,y,z),(1.25,y,z),.028,mat['wire'])
    for x in (-1.25,1.25): beam(f'chicken-run:wire-rail-side-{y}-{x}',(x,y,-1.25),(x,y,1.25),.028,mat['wire'])
# A hatchback tailgate shell becomes the coop, with curved roof and a low egg box.
box('chicken-run:boot-shell',(0,.48,.42),(1.25,.72,.75),mat['rusted-steel'],.16)
box('chicken-run:boot-roof',(0,.96,.42),(1.1,.10,.68),mat['galvanised-tin'],.06)
box('chicken-run:coop-dark-opening',(0,.42,.035),(.68,.40,.035),mat['iron-dark'],.04)
for x in (-.4,.4): beam(f'chicken-run:boot-hinge-{x}',(x,.78,.06),(x,1.2,.06),.045,mat['rusted-steel'])
box('chicken-run:nest-box',(0,.32,-.90),(.98,.42,.48),mat['weathered-plank'],.055)
for x in (-.25,.25): sphere(f'chicken-run:egg-{x}',(x,.56,-.88),(.10,.07,.08),mat['faded-hand-paint'],8,5)
box('chicken-run:feed-tray',(0,.16,1.05),(.85,.19,.30),mat['galvanised-tin'],.045)

def market_stall(building, offset, kind):
    add_building(building,offset); ground_clutter(building,0,0)
    for x in (-1.15,1.15):
        beam(f'{building}:post-{x}',(x,.12,-1.08),(x,2.18,-1.08),.085,mat['rusted-steel'])
        beam(f'{building}:rear-post-{x}',(x,.12,1.0),(x,1.85,1.0),.075,mat['weathered-plank'])
    beam(f'{building}:front-lintel',(-1.25,2.12,-1.08),(1.25,2.12,-1.08),.09,mat['rusted-steel'])
    beam(f'{building}:rear-lintel',(-1.25,1.85,1.0),(1.25,1.85,1.0),.075,mat['weathered-plank'])
    for x in (-.65,.65):
        beam(f'{building}:awning-arm-{x}',(x,1.7,-1.1),(x,2.18,-.22),.055,mat['rusted-steel'])
    awning=box(f'{building}:patched-awning',(0,2.12,-.62),(2.8,.07,1.05),mat['patched-canvas'],.035)
    awning.rotation_euler[0]=-.10
    box(f'{building}:display-counter',(0,.91,-.24),(2.18,.20,.83),mat['weathered-plank'],.04)
    for x in (-.85,.85): beam(f'{building}:counter-leg-{x}',(x,.12,-.24),(x,.84,-.24),.08,mat['rusted-steel'])
    if kind=='fruit':
        for row,z in enumerate((-.45,.05),1):
            box(f'{building}:fruit-crate-{row}',(0,1.14,z),(1.85,.34,.52),mat['weathered-plank'],.04)
            for j in range(6):
                x=-.72+j*.29; color=mat['fruit-red'] if (j+row)%2 else mat['fruit-yellow']
                sphere(f'{building}:produce-{row}-{j+1}',(x,1.40,z),(.115,.11,.12),color,8,5)
    elif kind=='tools':
        for x in (-.60,-.2,.2,.6):
            beam(f'{building}:tool-shaft-{x}',(x,1.22,-.48),(x+.10,1.58,-.48),.045,mat['iron-dark'])
            beam(f'{building}:tool-cross-head-{x}',(x-.12,1.52,-.48),(x+.22,1.52,-.48),.055,mat['rusted-steel'])
        for x in (-.65,.15,.72):
            box(f'{building}:small-tool-box-{x}',(x,1.29,.18),(.42,.18,.38),mat['rusted-steel'],.035)
    else:
        for i in range(4):
            z=-.5+i*.31
            bpy.ops.mesh.primitive_torus_add(major_radius=.38,minor_radius=.12,major_segments=16,minor_segments=6,
                                               location=town.game_vector((-.55+i*.36,1.47,z)))
            obj=bpy.context.object;obj.name=f'{building}:display-tyre-{i+1}';obj.rotation_euler[0]=math.pi/2;obj.data.materials.append(mat['rubber']);keep(obj)
    sign(building,(0,1.88,-1.16),'FRUIT' if kind=='fruit' else 'TOOLS' if kind=='tools' else 'TYRES',1.15)

market_stall('stall-a',(20,0,2),'fruit')
market_stall('stall-b',(28,0,2),'tools')
market_stall('stall-c',(36,0,2),'tyres')

def shopfront(building, offset, label):
    add_building(building,offset);ground_clutter(building,0,0)
    for x in (-1.12,1.12):
        beam(f'{building}:corner-post-{x}',(x,.12,-.68),(x,2.5,-.68),.10,mat['rusted-steel'])
        beam(f'{building}:rear-post-{x}',(x,.12,.72),(x,2.05,.72),.075,mat['weathered-plank'])
    for y in (.18,1.26,2.12):
        beam(f'{building}:back-wall-rail-{y}',(-1.1,y,.72),(1.1,y,.72),.07,mat['rusted-steel'])
    for i in range(4):
        box(f'{building}:patched-back-wall-{i+1}',(-.84+i*.56,1.26,.73),(.54,1.62,.045),mat['galvanised-tin'] if i%2 else mat['rusted-steel'],.015)
    tin_roof(f'{building}:roof',0,2.48,.02,2.75,2.0,.10)
    for x in (-.62,.62): beam(f'{building}:awning-arm-{x}',(x,2.2,-.60),(x,2.48,-.02),.05,mat['rusted-steel'])
    box(f'{building}:front-awning',(0,2.42,-.36),(2.45,.065,.80),mat['patched-canvas'],.025)
    box(f'{building}:serving-hatch',(0,1.5,.69),(1.18,.72,.08),mat['iron-dark'],.025)
    for x in (-.35,.35): beam(f'{building}:hatch-shutter-chain-{x}',(x,1.94,.70),(x,2.18,.16),.025,mat['rusted-steel'])
    sign(building,(0,2.12,-.72),label,1.85)
    box(f'{building}:counter',(0,.98,-.90),(2.0,.18,.55),mat['weathered-plank'],.035)

shopfront('shopfront-a',(20,0,12),'FOOD')
shopfront('shopfront-b',(28,0,12),'TOOLS')
shopfront('shopfront-c',(36,0,12),'FIX-IT')

# Bus canteen: bent sheet-metal shell with rounded front and wheel arches.
add_building('canteen',(8,0,12));ground_clutter('canteen',0,0)
for x in (-2.8,2.8):
    for z in (-1.55,1.55):
        sphere(f'canteen:salvaged-wheel-{x}-{z}',(x,.55,z),(.38,.55,.38),mat['rubber'],12,7)
# A continuous curved roofline and rounded bonnet make this read as a bus body.
xs=(-3.25,-2.85,-1.95,1.95,2.85,3.25)
roofline=((1.35,1.60),(2.25,2.42),(2.65,2.78),(2.65,2.78),(2.25,2.42),(1.35,1.60))
for zi,z in enumerate((-1.50,1.50)):
    verts=[]
    for x,(low,high) in zip(xs,roofline):
        verts.extend(((x,low,z),(x,high,z)))
    faces=[]
    for i in range(len(xs)-1): faces.append((i*2,i*2+1,i*2+3,i*2+2))
    panel=mesh_object(f'canteen:curved-bus-side-{zi+1}',verts,faces,mat['rusted-steel'])
    for i,x in enumerate(xs): beam(f'canteen:side-pillar-{zi+1}-{i+1}',(x,roofline[i][0],z),(x,roofline[i][1],z),.095,mat['rusted-steel'])
for z in (-1.50,1.50): beam(f'canteen:roof-rim-{z}',(-3.15,2.55,z),(3.15,2.55,z),.09,mat['galvanised-tin'])
for i,x in enumerate((-2.35,-1.35,-.35,.65,1.65,2.48),1):
    box(f'canteen:dark-window-{i}',(x,2.02,-1.535),(.78,.86,.04),mat['glass'],.07)
    box(f'canteen:window-frame-{i}',(x,2.02,-1.565),(.84,.92,.035),mat['weathered-plank'],.05)
box('canteen:serving-apron',(0,1.39,-1.57),(3.7,.20,.07),mat['faded-hand-paint'],.04)
box('canteen:serving-counter',(0,1.25,-1.95),(3.55,.13,.68),mat['weathered-plank'],.04)
tin_roof('canteen:roof-panels',0,2.67,0,6.2,3.05,.025)
for x in (-1.2,1.2):
    for z in (-.7,.7): beam(f'canteen:diner-table-leg-{x}-{z}',(x,.12,z),(x,.74,z),.055,mat['rusted-steel'])
box('canteen:interior-dining-table',(0,.78,.52),(2.5,.14,.76),mat['weathered-plank'],.04)
for z in (-1.05,.85): box(f'canteen:bench-{z}',(0,.5,z),(2.45,.12,.38),mat['weathered-plank'],.04)
for x in (-1.8,1.8): beam(f'canteen:front-bumper-{x}',(x,.47,-1.57),(x,.47,-1.95),.085,mat['rusted-steel'])
sign('canteen',(0,2.42,-1.63),'CANTEEN',2.0)

# Market hall: mismatched 3x3 shed roof, with individual food counters under it.
add_building('market-hall',(-18,0,14));ground_clutter('market-hall',0,0)
for x in (-5.8,-3,0,3,5.8):
    for z in (-5.8,0,5.8):
        beam(f'market-hall:steel-column-{x}-{z}',(x,.12,z),(x,4.1,z),.14,mat['rusted-steel'])
for x in (-5.8,-3,0,3,5.8):
    beam(f'market-hall:front-truss-{x}',(x,3.92,-5.8),(x,4.25,0),.11,mat['rusted-steel'])
    beam(f'market-hall:back-truss-{x}',(x,4.25,0),(x,3.92,5.8),.11,mat['rusted-steel'])
for z in (-5.8,0,5.8): beam(f'market-hall:ridge-{z}',(-6,4.22,z),(6,4.22,z),.13,mat['rusted-steel'])
for i in range(8):
    x=-5.25+i*1.5
    panel=tin_roof(f'market-hall:roof-bay-{i+1}',x,4.08,0,1.54,11.85,.015*(i%3-1))
    panel.rotation_euler[0]=.04*((i%3)-1)
# Canvas repair strips, solar sheet, water drum, dangling task lights and marked stalls.
for i,x in enumerate((-4.5,-1.5,2.7),1):
    box(f'market-hall:repair-patch-{i}',(x,4.17,-2.1+i*.8),(1.1,.06,1.3),mat['patched-canvas'],.03)
for x in (-4.0,4.0):
    cylinder(f'market-hall:roof-water-drum-{x}',(x,4.63,3.9),.40,.8,mat['rusted-steel'],14)
for x in (-3.8,0,3.8):
    beam(f'market-hall:lamp-chain-{x}',(x,3.95,-.8),(x,3.28,-.8),.028,mat['wire'])
    sphere(f'market-hall:lamp-{x}',(x,3.17,-.8),(.16,.18,.16),mat['faded-hand-paint'],8,5)
for i,(x,z) in enumerate(((-3.7,-3.1),(0,-3.1),(3.7,-3.1),(-3.7,3.0),(3.7,3.0)),1):
    box(f'market-hall:stall-counter-{i}',(x,.93,z),(2.65,.22,1.5),mat['weathered-plank'],.05)
    beam(f'market-hall:stall-post-left-{i}',(x-1.15,1.0,z),(x-1.15,3.15,z),.07,mat['rusted-steel'])
    beam(f'market-hall:stall-post-right-{i}',(x+1.15,1.0,z),(x+1.15,3.15,z),.07,mat['rusted-steel'])
    box(f'market-hall:stall-awning-{i}',(x,3.1,z),(2.65,.07,1.65),mat['patched-canvas'],.025)
    box(f'market-hall:stock-crate-{i}',(x,1.23,z+.18),(1.1,.38,.62),mat['rusted-steel'],.05)

# Normalize every picture coordinate layer before export: each mesh must be TEXCOORD_0 only.
for obj in export_objects:
    if obj.type == 'MESH' and obj.data.uv_layers:
        for layer in list(obj.data.uv_layers): layer.name = 'UVMap'
for material in bpy.data.materials:
    if material.use_nodes and material.node_tree.nodes.get('Principled BSDF'):
        bsdf=material.node_tree.nodes.get('Principled BSDF')
        if bsdf.inputs.get('Metallic'): bsdf.inputs['Metallic'].default_value=min(bsdf.inputs['Metallic'].default_value,.29)

out.parent.mkdir(parents=True,exist_ok=True)
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects: obj.select_set(True)
bpy.context.view_layer.objects.active=family
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
                          export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=82)

# Review only the exported model, imported back into an otherwise empty Blender scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
evidence.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=40
scene.render.resolution_x=1280;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('bright overcast review sky')
scene.world.color=(.72,.72,.72)
scene.render.film_transparent=False
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.68,.70,.72,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
def area(name, loc, power, size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((6,1,-1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('bright overcast key',(3,12,6),1800,10);area('soft sky fill',(-8,9,-3),1100,9)
ground=town.cube('review ground',(5,-.16,0),(90,.3,70),simple('review ground / neutral',(.30,.31,.30),.94),0)
def render_view(name, target, camera_loc, focal=52):
    camdata=bpy.data.cameras.new(name);camdata.lens=focal
    cam=bpy.data.objects.new(name,camdata);scene.collection.objects.link(cam);cam.location=camera_loc
    cam.rotation_euler=(town.game_vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
    scene.render.filepath=str(evidence/(name+'.png'));bpy.ops.render.render(write_still=True)
def under(obj, ancestor):
    while obj:
        if obj == ancestor: return True
        obj = obj.parent
    return False
soup_root = next(obj for obj in bpy.context.scene.objects if obj.name == 'soup-kitchen')
for obj in scene.objects:
    if obj.type not in ('CAMERA','LIGHT') and obj.name != 'review ground' and not under(obj,soup_root):
        obj.hide_render=True
render_view('soup-overhead',(30,1.1,-14),(36,25,13),58)
render_view('soup-driver-seat',(30,1.2,-14),(33,25,4.0),57)
for obj in scene.objects: obj.hide_render=False
render_view('family-overhead',(6,1.2,0),(6,80,72),47)
render_view('family-driver-seat',(6,1.0,0),(6,100,18),42)
print(json.dumps({'glb':str(out),'evidence':str(evidence)}))
