"""Photo-carved soup kitchen and the rest of the town-food family."""
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
evidence = root / '.evidence/2026-11-06/town-art-food/round-4'
out = root / 'public/assets/models/wasteland/town/food.glb'
blend = root / 'art-build/town/food.blend'
sheet = root / 'docs/board/looks/town-art-food/round-4.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Photo
from hull_model import View, occupancy, largest_part, carve_hull

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

mat['dark-steel'] = mat['rusted-steel'].copy()
mat['dark-steel'].name = 'Town / soot-blackened cauldron steel'
pot_bsdf=mat['dark-steel'].node_tree.nodes.get('Principled BSDF')
pot_bsdf.inputs['Base Color'].default_value=(.24,.235,.22,1)
pot_bsdf.inputs['Roughness'].default_value=.86
pot_bsdf.inputs['Metallic'].default_value=.12
mat['fire'] = simple('Town / firelight', (.72, .255, .045), .72)
fire_bsdf=mat['fire'].node_tree.nodes.get('Principled BSDF')
if fire_bsdf.inputs.get('Emission Color'):
    fire_bsdf.inputs['Emission Color'].default_value=(.58,.105,.018,1)
    fire_bsdf.inputs['Emission Strength'].default_value=.8
mat['fire-yellow'] = simple('Town / flame yellow',(.95,.48,.06),.68)
yellow_bsdf=mat['fire-yellow'].node_tree.nodes.get('Principled BSDF')
if yellow_bsdf.inputs.get('Emission Color'):
    yellow_bsdf.inputs['Emission Color'].default_value=(1.0,.30,.018,1)
    yellow_bsdf.inputs['Emission Strength'].default_value=1.35
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
            if uv_mode == 'wall': uv.data[li].uv=(x/.20, y/2)
            elif uv_mode == 'canvas': uv.data[li].uv=(x/1.5, y/1.5)
            elif uv_mode == 'round': uv.data[li].uv=(math.atan2(z, x)/math.tau, y)
            else: uv.data[li].uv=(x/2, z/2) if uv_mode=='planar' else (x, z)
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
    return mesh_object(name,verts,faces,mat['galvanised-tin'],'wall')

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

# TOWN-ART-FOOD round 4: the kitchen's main body is the photo intersection.
# Hand measurements use a 4.1 m front, 3.2 m depth and 2.7 m roof height.
add_building('soup-kitchen',(30,0,-14))
photo_paths = {
    'front': textures / 'town-food-soup-front.jpg',
    'left': textures / 'town-food-soup-left.jpg',
    'rear': textures / 'town-food-soup-rear.jpg',
    'overhead': textures / 'town-food-soup-overhead.jpg',
}
photos = {name: Photo(path) for name, path in photo_paths.items()}
W, H = 712, 532
# The front photo faces the road (-Z). Its left edge is world +X, so this
# projection is reversed when read from the road. Keep the shelf contents on
# their photographed sides instead of mirroring the whole kitchen.
def front_pick(x, y, z): return ((2.05 - x) * W / 4.1, (2.7 - y) * H / 2.7)
def left_pick(x, y, z): return ((z + 1.6) * W / 3.2, (2.7 - y) * H / 2.7)
def rear_pick(x, y, z): return ((2.05 - x) * W / 4.1, (2.7 - y) * H / 2.7)
def overhead_pick(x, y, z): return ((x + 2.05) * W / 4.1, (1.6 - z) * H / 3.2)
seed_set = [(5, 5), (W - 6, 5), (5, H - 6), (W - 6, H - 6)]
views = [
    View('front', photos['front'], seed_set, front_pick, (0, 0, -1), grey=30, tolerance=24),
    View('left', photos['left'], seed_set, left_pick, (-1, 0, 0), grey=30, tolerance=24),
    View('rear', photos['rear'], seed_set, rear_pick, (0, 0, 1), grey=30, tolerance=24),
    View('overhead', photos['overhead'], seed_set, overhead_pick, (0, 1, 0), grey=30, tolerance=24),
]
for view in views:
    # Bleed only the studio background so JPEG filtering cannot paint it on edges.
    view.photo.bleed(view.mask, passes=10)
    # Keep the measured reference crops beside the recipe; the game model embeds
    # compact 256 px copies, matching the family's established texture budget.
    view.photo.image.scale(256, 192)
photo_materials = {view.name: view.photo.material(.86) for view in views}
for photo_material in photo_materials.values():
    nodes=photo_material.node_tree.nodes;links=photo_material.node_tree.links
    texture=next(node for node in nodes if node.type=='TEX_IMAGE')
    bsdf=next(node for node in nodes if node.type=='BSDF_PRINCIPLED')
    if bsdf.inputs.get('Emission Color'):
        links.new(texture.outputs['Color'],bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value=.2
voxel = .055
def open_kitchen_bay(x, y, z):
    # Walk-in space from the front posts to the rear tin wall. Preserve the
    # measured wall at the back and the roof/awning above it.
    return ~((-1.74 < x) & (x < 1.74) & (.15 < y) & (y < 2.48) & (z < 1.43))

solid, xs, ys, zs = occupancy(((-2.05, 2.05), (0, 2.7), (-1.6, 1.6)), voxel,
                              [view.covers for view in views], open_kitchen_bay)
solid = largest_part(solid)
body = carve_hull('soup-kitchen:photo-carved-body', views, photo_materials,
                  solid, xs, ys, zs, voxel, 4200)
keep(body)

# The posts, benches, pot and fire stand inside the bay at real depth. Their
# simple geometry is separate from the photo-carved rear wall.
for x in (-1.82, 1.82):
    beam(f'soup-kitchen:front-post-{x}', (x,.08,-1.48), (x,2.58,-1.48), .12, mat['weathered-plank'])
    beam(f'soup-kitchen:rear-post-{x}', (x,.08,1.28), (x,2.50,1.28), .10, mat['weathered-plank'])
    beam(f'soup-kitchen:side-rail-{x}', (x,2.26,-1.43), (x,2.50,1.24), .075, mat['rusted-steel'])
# A shallow curved awning sheet shades the open bay while leaving the rear
# photo wall visible. The arc rises slightly toward the centre.
awning_verts=[]; awning_faces=[]; segments=12
for row, z in enumerate((-1.58,-.98)):
    for i in range(segments+1):
        x=-2.0+4.0*i/segments
        y=2.57 + .10*(1-(x/2.0)**2) + (0.02 if row else 0)
        awning_verts.append((x,y,z))
for i in range(segments): awning_faces.append((i,i+1,segments+2+i,segments+1+i))
mesh_object('soup-kitchen:curved-awning',awning_verts,awning_faces,mat['patched-canvas'],'canvas')
for x in (-1.70,1.70):
    # Two separate plank benches, clear of the central cooking space.
    box(f'soup-kitchen:bench-seat-{x}',(x,.72,-.42),(.58,.12,1.02),mat['weathered-plank'],.035)
    for z in (-.80,-.04):
        beam(f'soup-kitchen:bench-leg-{x}-{z}',(x,.12,z),(x,.67,z),.085,mat['rusted-steel'])
# Round soot-blackened cauldron with a rolled rim, on a low three-stone fire.
cylinder('soup-kitchen:pot-body',(0,.73,.0),.42,.48,mat['dark-steel'],24)
cylinder('soup-kitchen:pot-rim',(0,.98,.0),.45,.07,mat['dark-steel'],24)
for x in (-.24,0,.24):
    sphere(f'soup-kitchen:fire-stone-{x}',(x,.16,-.02),(.13,.10,.13),mat['sand'],8,5)

# A small dedicated emissive flame node remains individually addressable at night.
lamp = bpy.data.objects.new('soup-kitchen:lamp', None)
bpy.context.collection.objects.link(lamp); keep(lamp)
lamp.location = town.game_vector((0, .78, -.1))
lamp['emissive'] = True
flame = sphere('soup-kitchen:lamp-glow', (0, .78, -.1), (.18, .28, .18), mat['fire-yellow'], 10, 6)
flame.parent = lamp; flame.location = (0, 0, 0)
lamp_bsdf = mat['fire-yellow'].node_tree.nodes.get('Principled BSDF')
if lamp_bsdf.inputs.get('Emission Color'):
    lamp_bsdf.inputs['Emission Color'].default_value = (1.0, .22, .025, 1)
    lamp_bsdf.inputs['Emission Strength'].default_value = 1.5
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
    add_building(building,offset)
    for x in (-1.15,1.15):
        beam(f'{building}:post-{x}',(x,.12,-1.08),(x,2.18,-1.08),.085,mat['rusted-steel'])
        beam(f'{building}:rear-post-{x}',(x,.12,1.0),(x,1.85,1.0),.075,mat['weathered-plank'])
    beam(f'{building}:front-lintel',(-1.25,2.12,-1.08),(1.25,2.12,-1.08),.09,mat['rusted-steel'])
    beam(f'{building}:rear-lintel',(-1.25,1.85,1.0),(1.25,1.85,1.0),.075,mat['weathered-plank'])
    for x in (-.65,.65):
        beam(f'{building}:awning-arm-{x}',(x,1.7,-1.1),(x,2.18,-.22),.055,mat['rusted-steel'])
    awning_material={'fruit':'fruit-yellow','tools':'weathered-plank','tyres':'patched-canvas'}[kind]
    awning=box(f'{building}:patched-awning',(0,2.12,-.62),(2.8,.07,1.05),mat[awning_material],.035)
    awning.rotation_euler[0]=-.10
    box(f'{building}:display-counter',(0,.91,-.24),(2.18,.20,.83),mat['weathered-plank'],.04)
    for x in (-.85,.85): beam(f'{building}:counter-leg-{x}',(x,.12,-.24),(x,.84,-.24),.08,mat['rusted-steel'])
    if kind=='fruit':
        for row,z in enumerate((-.45,.05),1):
            crate=box(f'{building}:fruit-crate-{row}',(0,1.14,z),(1.85,.34,.52),mat['weathered-plank'],.04)
            crate.rotation_euler[2]=(-.12 if row==1 else .16)
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
            x=-.72+(i%2)*1.44
            y=.46+(i//2)*.52
            bpy.ops.mesh.primitive_torus_add(major_radius=.38,minor_radius=.12,major_segments=16,minor_segments=6,
                                               location=town.game_vector((x,y,.12)))
            obj=bpy.context.object;obj.name=f'{building}:stacked-tyre-{i+1}';obj.rotation_euler[0]=math.pi/2;obj.data.materials.append(mat['rubber']);keep(obj)
    sign(building,(0,1.88,-1.16),'FRUIT' if kind=='fruit' else 'TOOLS' if kind=='tools' else 'TYRES',1.15)

market_stall('stall-a',(20,0,2),'fruit')
market_stall('stall-b',(28,0,2),'tools')
market_stall('stall-c',(36,0,2),'tyres')

def shopfront(building, offset, label):
    add_building(building,offset)
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
    if label=='FOOD':
        for i,x in enumerate((-.58,.08,.62),1):
            box(f'{building}:food-crate-{i}',(x,1.23,-.91),(.48,.32,.42),mat['weathered-plank'],.045)
            for j in range(3):
                sphere(f'{building}:root-veg-{i}-{j}',(x-.13+j*.13,1.44,-.90),(.09,.13,.09),mat['fruit-yellow'] if j%2 else mat['leaf'],8,5)
    elif label=='TOOLS':
        for i,x in enumerate((-.62,-.2,.25,.62),1):
            beam(f'{building}:hanging-tool-shaft-{i}',(x,1.55,.60),(x+.08,1.96,.60),.045,mat['weathered-plank'])
            beam(f'{building}:hanging-tool-head-{i}',(x-.10,1.90,.60),(x+.18,1.90,.60),.06,mat['rusted-steel'])
    else:
        for i,x in enumerate((-.55,.05,.61),1):
            cylinder(f'{building}:repair-pipe-{i}',(x,1.33,-.91),.11,.58,mat['rusted-steel'],12)
            bpy.ops.mesh.primitive_torus_add(major_segments=14,minor_segments=5,major_radius=.22,minor_radius=.06,location=town.game_vector((x,1.36,.62)))
            obj=bpy.context.object;obj.name=f'{building}:repair-tyre-{i}';obj.rotation_euler[0]=math.pi/2;obj.data.materials.append(mat['rubber']);keep(obj)

shopfront('shopfront-a',(20,0,12),'FOOD')
shopfront('shopfront-b',(28,0,12),'TOOLS')
shopfront('shopfront-c',(36,0,12),'FIX-IT')

# Bus canteen: bent sheet-metal shell with rounded front and wheel arches.
add_building('canteen',(8,0,12))
# Salvage blocks lift the bus body; the removed wheels sit aside as spare stock.
for x in (-2.45,2.45):
    for z in (-1.25,1.25):
        box(f'canteen:axle-support-block-{x}-{z}',(x,.34,z),(.72,.38,.62),mat['cracked-concrete'],.06)
for x in (-3.25,3.25):
    for z in (-1.2,1.2):
        bpy.ops.mesh.primitive_torus_add(major_segments=18,minor_segments=7,major_radius=.43,minor_radius=.13,
                                         location=town.game_vector((x,.40,z)))
        tyre=bpy.context.object;tyre.name=f'canteen:spare-tyre-{x}-{z}';tyre.data.materials.append(mat['rubber']);keep(tyre)
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
# The bus has a real driver's end at -X: a broad split windscreen, destination
# board, lamps, grille and bumper. These marks make the salvaged vehicle read
# as a bus even when the diner counters are viewed from the road.
box('canteen:front-windscreen-left',(-3.285,2.08,-.48),(.045,.77,.78),mat['glass'],.045)
box('canteen:front-windscreen-right',(-3.285,2.08,.48),(.045,.77,.78),mat['glass'],.045)
beam('canteen:front-windscreen-divider',(-3.32,1.67,0),(-3.32,2.49,0),.06,mat['rusted-steel'])
box('canteen:destination-board',(-3.30,2.60,0),(.10,.22,.88),mat['weathered-plank'],.025)
box('canteen:front-grille',(-3.30,.98,0),(.06,.38,.66),mat['iron-dark'],.025)
for z in (-.98,.98):
    sphere(f'canteen:headlamp-{z}',(-3.34,1.15,z),(.10,.15,.16),mat['faded-hand-paint'],10,6)
    beam(f'canteen:front-bumper-arm-{z}',(-3.18,.53,z),(-3.50,.53,z),.10,mat['rusted-steel'])
for x in (-2.45,2.45):
    for z in (-1.48,1.48):
        bpy.ops.mesh.primitive_torus_add(major_segments=20,minor_segments=8,major_radius=.43,minor_radius=.15,
                                         location=town.game_vector((x,.58,z)))
        wheel=bpy.context.object;wheel.name=f'canteen:bus-wheel-{x}-{z}';wheel.data.materials.append(mat['rubber']);keep(wheel)
for i,x in enumerate((-2.35,-1.35,-.35,.65,1.65,2.48),1):
    box(f'canteen:dark-window-{i}',(x,2.02,-1.535),(.78,.86,.04),mat['glass'],.07)
    box(f'canteen:window-frame-{i}',(x,2.02,-1.565),(.84,.92,.035),mat['weathered-plank'],.05)
    box(f'canteen:far-side-window-{i}',(x,2.02,1.535),(.78,.86,.04),mat['glass'],.07)
    box(f'canteen:far-side-window-frame-{i}',(x,2.02,1.565),(.84,.92,.035),mat['weathered-plank'],.05)
box('canteen:serving-apron',(0,1.39,-1.57),(3.7,.20,.07),mat['faded-hand-paint'],.04)
box('canteen:serving-counter',(0,1.25,-1.95),(3.55,.13,.68),mat['weathered-plank'],.04)
tin_roof('canteen:roof-panels',0,2.67,0,6.2,3.05,.025)
for x in (-2.6,-1.3,0,1.3,2.6):
    beam(f'canteen:serving-awning-arm-{x}',(x,1.58,-1.55),(x,2.18,-2.10),.055,mat['rusted-steel'])
box('canteen:canvas-serving-awning',(0,2.16,-1.94),(5.6,.09,.82),mat['patched-canvas'],.06)
box('canteen:far-side-serving-apron',(0,1.39,1.57),(3.7,.20,.07),mat['faded-hand-paint'],.04)
box('canteen:far-side-serving-counter',(0,1.25,1.95),(3.55,.13,.68),mat['weathered-plank'],.04)
box('canteen:far-side-canvas-awning',(0,2.16,1.94),(5.6,.09,.82),mat['patched-canvas'],.06)
for x in (-1.2,1.2):
    for z in (-.7,.7): beam(f'canteen:diner-table-leg-{x}-{z}',(x,.12,z),(x,.74,z),.055,mat['rusted-steel'])
box('canteen:interior-dining-table',(0,.78,.52),(2.5,.14,.76),mat['weathered-plank'],.04)
for z in (-1.05,.85):
    box(f'canteen:bench-{z}',(0,.5,z),(2.45,.12,.38),mat['weathered-plank'],.04)
    for x in (-.82,.82): beam(f'canteen:stool-leg-{z}-{x}',(x,.10,z),(x,.44,z),.09,mat['rusted-steel'])
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
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('bright overcast review sky')
scene.world.color=(.72,.72,.72)
scene.render.film_transparent=False
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.255,.245,.225,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
def area(name, loc, power, size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((6,1,-1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('bright overcast key',(3,18,9),750,48);area('soft sky fill',(-8,16,5),650,44)
ground_material=simple('review ground / neutral',(.255,.245,.225),.94)
ground_nodes=ground_material.node_tree.nodes;ground_nodes.clear();ground_links=ground_material.node_tree.links
ground_output=ground_nodes.new('ShaderNodeOutputMaterial');ground_emission=ground_nodes.new('ShaderNodeEmission')
ground_emission.inputs['Color'].default_value=(.255,.245,.225,1);ground_emission.inputs['Strength'].default_value=.7
ground_links.new(ground_emission.outputs[0],ground_output.inputs['Surface'])
ground=town.cube('review ground',(5,-.16,0),(1000,.3,1000),ground_material,0)
def under(obj, ancestor):
    while obj:
        if obj == ancestor: return True
        obj = obj.parent
    return False
soup_root = next(obj for obj in bpy.context.scene.objects if obj.name == 'soup-kitchen')
for obj in scene.objects:
    if obj.type not in ('CAMERA','LIGHT') and obj.name != 'review ground' and not under(obj,soup_root):
        obj.hide_render=True
next(obj for obj in scene.objects if obj.name == 'review ground').hide_render=True
members=[obj for obj in scene.objects if obj.type=='MESH' and under(obj,soup_root)]
corners=[obj.matrix_world @ Vector(corner) for obj in members for corner in obj.bound_box]
lo=Vector((min(p.x for p in corners),min(p.y for p in corners),min(p.z for p in corners)))
hi=Vector((max(p.x for p in corners),max(p.y for p in corners),max(p.z for p in corners)))
target=(lo+hi)*.5
key=scene.objects['bright overcast key'];key.location=target+Vector((-4,7,8));key.data.energy=500;key.data.size=20
key.rotation_euler=(target-key.location).to_track_quat('-Z','Y').to_euler()
fill=scene.objects['soft sky fill'];fill.location=target+Vector((6,4,6));fill.data.energy=450;fill.data.size=24
fill.rotation_euler=(target-fill.location).to_track_quat('-Z','Y').to_euler()
ground_data=bpy.data.meshes.new('soup kitchen review ground mesh')
ground_data.from_pydata(((lo.x-30,lo.y-30,lo.z-.08),(hi.x+30,lo.y-30,lo.z-.08),
                         (hi.x+30,hi.y+30,lo.z-.08),(lo.x-30,hi.y+30,lo.z-.08)),[],[(0,1,2,3)])
ground_data.materials.append(ground_material)
review_ground=bpy.data.objects.new('soup kitchen review ground',ground_data);scene.collection.objects.link(review_ground)
def render_match(name, camera_loc, up):
    camera_data=bpy.data.cameras.new(name);camera_data.lens=52
    camera=bpy.data.objects.new(name,camera_data);scene.collection.objects.link(camera);camera.location=camera_loc
    direction=(target-camera_loc).normalized();right=direction.cross(up).normalized()
    true_up=right.cross(direction).normalized()
    camera.rotation_euler=Matrix((right,true_up,-direction)).transposed().to_quaternion().to_euler();scene.camera=camera
    scene.render.filepath=str(evidence/(name+'.png'));bpy.ops.render.render(write_still=True)
# The photo references and exported GLB use the same straight-on and overhead cameras.
render_match('soup-front-match',target+Vector((0,6.8,0)),Vector((0,0,1)))
render_match('soup-overhead-match',target+Vector((0,0,7.2)),Vector((0,-1,0)))
print(json.dumps({'glb':str(out),'evidence':str(evidence)}))
