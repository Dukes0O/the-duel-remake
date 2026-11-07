"""Build the town's safety structures from welded steel, timber and salvaged tin."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--reference', default='public/assets/models/wasteland/town/textures/town-safety-watchtower.jpg')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
evidence = root / '.evidence/2026-11-06/TOWN-ART-SAFETY/round-3'
glb = root / 'public/assets/models/wasteland/town/safety.glb'
blend = root / 'art-build/town/safety.blend'
sheet = root / 'docs/board/looks/town-art-safety/round-3.jpg'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)],'summary':str(sheet)}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Mesh as PhotoMesh, Photo, slab as photo_slab, trace as photo_trace
import numpy as np

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
tex = root / 'public/assets/models/wasteland/town/textures'
materials = town.make_materials({
    'weathered-plank': tex / 'town-water-timber.jpg',
    'galvanised-tin': tex / 'town-water-corrugated.jpg',
    'rusted-steel': tex / 'town-water-tin.jpg',
    'sand': tex / 'town-water-earth.jpg',
})
def pictured_material(name, image_path, tint, metallic=0):
    image = bpy.data.images.load(str(image_path.resolve()), check_existing=False)
    image.pack()
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*tint,1); mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*tint,1)
    bsdf.inputs['Metallic'].default_value = min(metallic,.29)
    bsdf.inputs['Roughness'].default_value = .88
    image_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    image_node.image = image; image_node.extension = 'REPEAT'
    mat.node_tree.links.new(image_node.outputs['Color'],bsdf.inputs['Base Color'])
    return mat
materials['red-paint'] = pictured_material('Town / faded red engine enamel', tex/'red-oxide.jpg', (.31,.105,.075), .12)
materials['container-white'] = pictured_material('Town / chalky clinic enamel', tex/'container-white.jpg', (.50,.48,.42), .05)
materials['broken-glass'] = pictured_material('Town / smoky broken window glass', tex/'broken-glass.jpg', (.09,.12,.11), .08)
for material in bpy.data.materials:
    bsdf = material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
    if bsdf and bsdf.inputs.get('Metallic'):
        bsdf.inputs['Metallic'].default_value = min(bsdf.inputs['Metallic'].default_value, .29)

family = bpy.data.objects.new('town-safety', None)
bpy.context.collection.objects.link(family)
family.empty_display_type = 'PLAIN_AXES'
active = None
BUILDINGS = {}

def attach(obj, parent=None):
    parent = parent or active
    if parent is not None:
        bpy.context.view_layer.update()
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return obj

def building(name, footprint=(1, 1)):
    global active
    active = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(active)
    active.parent = family
    active['footprint_cells'] = list(footprint)
    BUILDINGS[name] = active
    return active

def cube(name, center, size, mat, bevel=.025, parent=None):
    obj = town.cube(name, center, size, mat, bevel)
    for layer in obj.data.uv_layers:
        layer.name = 'UVMap'
    return attach(obj, parent)

def beam(name, a, b, width, mat, parent=None):
    va,vb=town.game_vector(a),town.game_vector(b)
    axis=(vb-va).normalized()
    reference=Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0))
    side=axis.cross(reference).normalized()*(width/2)
    up=axis.cross(side).normalized()*(width/2)
    vertices=[]
    for endpoint in (va,vb):
        vertices.extend((endpoint-side-up,endpoint+side-up,endpoint+side+up,endpoint-side+up))
    faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    mesh=bpy.data.meshes.new(name+' solid member');mesh.from_pydata(vertices,[],faces);mesh.update();mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            point=vertices[mesh.loops[loop_index].vertex_index]-va
            uv.data[loop_index].uv=(point.dot(axis)/2,point.dot(side.normalized())/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return attach(obj, parent)

def pipe(name, a, b, radius, mat, parent=None, sides=12):
    va, vb = town.game_vector(a), town.game_vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=(vb-va).length,
                                        location=(va+vb)*.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (vb-va).to_track_quat('Z','Y').to_euler()
    obj.data.materials.append(mat)
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    uv.name='UVMap'
    for polygon in obj.data.polygons:
        for loop_index in polygon.loop_indices:
            p = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = (p.x/2, p.z/2)
    return attach(obj, parent)

def tin(name, center, width, height, parent=None, turn=0):
    obj = town.corrugated_sheet(name, center, width, height, materials, turn=turn)
    for layer in obj.data.uv_layers:
        layer.name = 'UVMap'
    return attach(obj, parent)

def fasteners(name, points, mat=None):
    mat = mat or materials['iron-dark']
    for i, p in enumerate(points):
        cube(f'{name}-bolt-{i+1}', p, (.075,.075,.075), mat, .018)

def lamp(name, center, size=(.20,.24,.20)):
    mat = bpy.data.materials.new(name+' warm glass')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.38,.20,.075,1)
    bsdf.inputs['Emission Color'].default_value = (1,.32,.07,1)
    bsdf.inputs['Emission Strength'].default_value = 1.4
    bsdf.inputs['Roughness'].default_value = .54
    return cube(name, center, size, mat, .03)

# One-cell modular barriers. Their ends sit on the cell boundary so repeated
# pieces meet without gaps; all visible rails have physical thickness.
for family_name, material_name, height, post, slats in (
    ('fence-wood','weathered-plank',1.45,.11,3),
    ('fence-chain','iron-dark',1.8,.08,2),
    ('wall-scrap','rusted-steel',2.35,.18,0),
    ('wall-steel','galvanised-tin',3.0,.22,0),
):
    barrier_mat = materials[material_name]
    for form in ('straight','corner','end'):
        b = building(f'{family_name}-{form}')
        if form == 'corner':
            runs = [('x',-4,4,4),('z',-4,4,4)]
        elif form == 'end':
            runs = [('x',-4,0,0)]
        else:
            runs = [('x',-4,4,0)]
        for axis, lo, hi, fixed in runs:
            length = hi-lo
            positions = [lo, hi] if form == 'straight' else [lo, hi]
            for side in positions:
                if axis == 'x':
                    x,z = side,fixed
                    postname = f'{family_name}-{form}-upright'
                    cube(postname,(x,height/2,z),(post,height,.20 if family_name.startswith('wall-') else post),barrier_mat,.025)
                else:
                    x,z = fixed,side
                    cube(f'{family_name}-{form}-upright',(x,height/2,z),(.20 if family_name.startswith('wall-') else post,height,post),barrier_mat,.025)
            if family_name == 'fence-wood':
                for row in range(slats):
                    y=.30+row*.43
                    if axis == 'x': beam(f'{family_name}-{form}-rail-{row+1}',(lo,y,fixed),(hi,y,fixed),.14,barrier_mat)
                    else: beam(f'{family_name}-{form}-rail-{row+1}',(fixed,y,lo),(fixed,y,hi),.14,barrier_mat)
                if form == 'straight':
                    if axis == 'x': beam(f'{family_name}-{form}-leaning-brace',(lo+.25,.2,fixed),(lo+1.2,1.25,fixed),.075,materials['rusted-steel'])
                    else: beam(f'{family_name}-{form}-leaning-brace',(fixed,.2,lo+.25),(fixed,1.25,lo+1.2),.075,materials['rusted-steel'])
            elif family_name == 'fence-chain':
                for y in (.55,1.55):
                    if axis == 'x': pipe(f'{family_name}-{form}-top-rail',(lo,y,fixed),(hi,y,fixed),.045,barrier_mat)
                    else: pipe(f'{family_name}-{form}-top-rail',(fixed,y,lo),(fixed,y,hi),.045,barrier_mat)
                # A fine linked diamond is real, thin wire, joined to both rails.
                count = 27
                for i in range(count+1):
                    t=i/count; x=lo+length*t
                    y=.62+(1 if i%2 else -1)*.12
                    if axis=='x': pipe(f'{family_name}-{form}-mesh-wire',(x,.61,fixed),(x+(length/count*.5),1.48,fixed),.009,barrier_mat,sides=6)
                    else: pipe(f'{family_name}-{form}-mesh-wire',(fixed,.61,lo+length*t),(fixed,1.48,lo+length*t+length/count*.5),.009,barrier_mat,sides=6)
            else:
                # Irregular, overlapping cut plates with a visible cap rail.
                count=max(4,round(length/1.2))
                for i in range(count):
                    t=lo+(i+.5)*length/count
                    w=length/count+.035
                    if axis=='x':
                        cube(f'{family_name}-{form}-plate-{i+1}',(t,height*.48,fixed),(w,height*.86,.10),barrier_mat,.04)
                        beam(f'{family_name}-{form}-top-cap-{i+1}',(t-w*.48,height,fixed),(t+w*.48,height,fixed),.08,materials['iron-dark'])
                    else:
                        cube(f'{family_name}-{form}-plate-{i+1}',(fixed,height*.48,t),(.10,height*.86,w),barrier_mat,.04)
# A broad, braced timber watchtower: 7.6 m to the lookout deck, 9.1 m at roof.
b = building('watchtower')
b['footprint_cells']=[1,1]
for sx in (-.72,.72):
    for sz in (-.72,.72):
        x,z=sx,sz
        beam('watchtower-splayed-leg',(x*.94,0,z*.94),(x*.72,7.15,z*.72),.25,materials['weathered-plank'])
        cube('watchtower-foot',(x*.94,.16,z*.94),(.58,.32,.58),materials['weathered-plank'],.025)
        for y in (1.05,):
            cube('watchtower-bolted-collar',(x*(.78+y/7.55*.22),y,z*(.78+y/7.55*.22)),(.29,.12,.29),materials['rusted-steel'],0)
for y in (1.15,3.2,5.15,7.45):
    for edge in (-1,1):
        beam('watchtower-side-tie',(edge*.73,y,-.72),(edge*.73,y,.72),.095,materials['rusted-steel'])
        beam('watchtower-back-tie',(-.72,y,edge*.73),(.72,y,edge*.73),.095,materials['weathered-plank'])
for y0,y1 in ((1.15,3.2),(3.2,5.15),(5.15,7.35)):
    for z in (-.72,.72):
        x0 = -.72 if y0 != 3.2 else .72
        beam('watchtower-X-brace',(x0,y0,z),(-x0,y1,z),.075,materials['rusted-steel'])
# Ladder is attached to the road-facing side, with a real 300 mm rung pitch.
for x in (-.34,.34): pipe('watchtower-ladder-stile',(x,.04,-.88),(x,7.72,-.88),.045,materials['rusted-steel'],sides=8)
for i in range(12):
    y=.30+i*.64
    pipe(f'watchtower-ladder-rung-{i+1}',(-.34,y,-.88),(.34,y,-.88),.027,materials['iron-dark'],sides=6)
# Platform and open guard rails.
for i in range(3):
    z=-.65+i*.65
    cube(f'watchtower-deck-board-{i+1}',(0,7.58,z),(1.72,.12,.62),materials['weathered-plank'],0)
for sx in (-.82,.82):
    for sz in (-.82,.82):
        pipe('watchtower-rail-post',(sx,7.65,sz),(sx,8.65,sz),.045,materials['rusted-steel'])
for y in (8.02,8.58):
    beam('watchtower-platform-rail',(-.82,y,-.82),(.82,y,-.82),.045,materials['rusted-steel'])
    beam('watchtower-platform-rail',(-.82,y,.82),(.82,y,.82),.045,materials['rusted-steel'])
    beam('watchtower-side-rail',(-.82,y,-.82),(-.82,y,.82),.045,materials['rusted-steel'])
    beam('watchtower-side-rail',(.82,y,-.82),(.82,y,.82),.045,materials['rusted-steel'])
# Gabled roof with two rafters and four overlapping salvaged sheets. Each half
# falls from the ridge to a different eave and carries its own seam and bolts.
for sx in (-.66,.66):
    beam('watchtower-roof-rafter',(sx,8.68,-.82),(sx,9.14,0),.075,materials['weathered-plank'])
    beam('watchtower-roof-rafter',(sx,9.14,0),(sx,8.68,.82),.075,materials['weathered-plank'])
for side in (-1,1):
    for x in (-.48,.48):
        roofmat=materials['rusted-steel'] if side==1 and x>.0 else materials['galvanised-tin']
        panel=cube(f'watchtower-roof-patch-{side}-{x}',(x,8.93,side*.40),(1.02,.09,.95),roofmat,.025)
        panel.rotation_euler[0]=side*.36
        for px in (x,):
            cube('watchtower-roof-rivet',(px,8.94,side*.40),(.055,.055,.055),materials['iron-dark'],0)
beam('watchtower-roof-ridge',(-1.0,9.14,0),(1.0,9.14,0),.07,materials['rusted-steel'])
# Platform parapet lower panels, open front remains walkable.
tin('watchtower-torn-back-apron',(0,8.12,.79),1.42,.74)
tin('watchtower-left-apron',(-.79,8.12,0),1.38,.74,turn=math.pi/2)
tin('watchtower-right-apron',(.79,8.12,0),1.21,.74,turn=math.pi/2)
cube('watchtower-lookout-chair-seat',(.18,7.82,.25),(.42,.09,.42),materials['rusted-steel'],.035)
for x in (-.02,.38):
    for z in (.06,.44): beam('watchtower-chair-leg',(x,7.60,z),(x,7.86,z),.035,materials['iron-dark'])
beam('watchtower-chair-back',(.20,7.84,.45),(.20,8.38,.45),.055,materials['weathered-plank'])
lamp('watchtower:lamp',(0,8.52,.91),(.25,.24,.18))
pipe('watchtower-lamp-bracket',(.0,8.60,.84),(.0,8.45,1.13),.035,materials['rusted-steel'])
b.scale.z = .77

# Scrap gate across a road; its moving leaf is a separately named node.
b=building('gate-scrap',(2,1))
for x in (-6.7,6.7):
    beam('gate-scrap-tower-post',(x,0,-3.2),(x,5.5,-3.2),.38,materials['rusted-steel'])
    for y in (1.2,2.7,4.2): beam('gate-scrap-cross-tie',(x-.7,y,-3.2),(x+.7,y,-3.2),.16,materials['galvanised-tin'])
    tin('gate-scrap-tower-facing',(x,3.3,-3.39),1.5,2.9)
beam('gate-scrap-header',(-6.7,5.45,-3.2),(6.7,5.45,-3.2),.42,materials['rusted-steel'])
door=bpy.data.objects.new('gate-scrap:door',None);bpy.context.collection.objects.link(door);door.location=town.game_vector((-2.7,0,-3.25));attach(door)
for i in range(8):
    x=-2.6+i*.74
    cube(f'gate-scrap-door-plank-{i+1}',(x,2.25,-3.25),(.68,3.4,.13),materials['rusted-steel'],.035,door)
# Two donor-car door shells have window frames and handles; welded sheet fills
# the gaps. All children are placed at the gate before joining the hinge node.
for i,x in enumerate((-1.35,1.32)):
    cube(f'gate-scrap-car-door-{i+1}',(x,1.55,-3.39),(2.25,1.55,.12),materials['galvanised-tin'],.07,door)
    cube(f'gate-scrap-car-door-window-{i+1}',(x,2.78,-3.43),(1.34,.72,.045),materials['iron-dark'],.08,door)
    cube(f'gate-scrap-car-door-handle-{i+1}',(x+.72,1.62,-3.48),(.20,.08,.035),materials['rusted-steel'],.025,door)
for y in (1.10,3.40): beam('gate-scrap-door-crossbar',(-2.7,y,-3.38),(2.7,y,-3.38),.13,materials['iron-dark'],door)
for x in (-2.3,2.3):
    pipe('gate-scrap-door-hinge',(x,.70,-3.49),(x,3.80,-3.49),.09,materials['iron-dark'],door)

# Guard post: low sandbag berm, bolted tin roof and a contained steel brazier.
b=building('guard-post',(2,1))
for i in range(10):
    for row in range(3):
        x=-5.7+i*1.27+(row%2)*.26
        z=-2.05+row*.08
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=6,radius=1,location=town.game_vector((x,.30+row*.40,z)))
        sack=bpy.context.object;sack.name=f'guard-post-sandbag-{i+1}-{row+1}';sack.scale=(.62,.22,.28);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);sack.data.materials.append(materials['patched-canvas']);attach(sack)
for sx in (-5.8,5.8):
    for sz in (-2.2,2.2): beam('guard-post-roof-post',(sx,.65,sz),(sx,3.3,sz),.12,materials['weathered-plank'])
for i in range(5):
    z=-2.5+i*1.25
    panel=cube(f'guard-post-roof-sheet-{i+1}',(0,3.35,z),(12.5,.10,1.30),materials['galvanised-tin'],.025)
    panel.rotation_euler[0]=.06 if i%2 else -.07
for x in (-4,0,4): beam('guard-post-roof-rib',(x,3.18,-2.5),(x,3.18,2.5),.07,materials['rusted-steel'])
for side in (-1,1):
    tin(f'guard-post-side-windbreak-{side}',(side*5.8,1.65,0),4.1,1.8,turn=math.pi/2)
pipe('guard-post-brazier-leg-1',(-.45,.12,1.6),(-.45,.62,1.6),.045,materials['iron-dark'])
pipe('guard-post-brazier-leg-2',(.45,.12,1.6),(.45,.62,1.6),.045,materials['iron-dark'])
brazier=cube('guard-post-brazier',(0,.64,1.6),(1.0,.24,.72),materials['rusted-steel'],.09)

# Searchlight: bolted salvage head, trunnion and fully joined upright mast.
b=building('searchlight')
cube('searchlight-concrete-foot',(0,.18,0),(.72,.36,.72),materials['cracked-concrete'],.08)
pipe('searchlight-mast',(0,.36,0),(0,4.7,0),.10,materials['rusted-steel'])
for y in (.72,2.4,4.35): cube('searchlight-mast-collar',(0,y,0),(.29,.14,.29),materials['iron-dark'],.025)
beam('searchlight-yoke',(-.48,4.72,0),(.48,4.72,0),.10,materials['rusted-steel'])
head=cube('searchlight-spot-housing',(0,4.9,-.30),(.96,.62,.88),materials['galvanised-tin'],.11)
for x in (-.25,.25): pipe('searchlight-trunnion',(x,4.72,-.15),(x,5.13,-.15),.055,materials['iron-dark'])
beam_node=bpy.data.objects.new('searchlight:beam',None);bpy.context.collection.objects.link(beam_node);attach(beam_node)
for x in (-.28,.28):
    lens=lamp('searchlight:beam-lens',(x,4.92,-.75),(.31,.34,.10))
    attach(lens,beam_node)
    lens.rotation_euler[0]=math.pi/2
    cube('searchlight-lens-guard',(x,4.92,-.81),(.38,.42,.035),materials['iron-dark'],.025)
for i in range(6): pipe('searchlight-cooling-slot',(0,4.69+i*.075,.15),(0,4.69+i*.075,.23),.025,materials['iron-dark'],sides=8)

# Fire station at 3 x 2 cells: two real vehicle bays, raised hose tower and bell.
b=building('fire-station',(3,2))
for x in (-10.4,10.4):
    for z in (-6.4,6.4): cube('fire-station-corner-post',(x,3.3,z),(.42,6.6,.42),materials['rusted-steel'],.06)
for x in (-6,0,6):
    cube('fire-station-red-pier',(x,3.0,-6.5),(.55,6.0,.38),materials['red-paint'],.055)
    for y in (1.2,5.2): beam('fire-station-front-bay-beam',(x-.2,y,-6.65),(x+.2,y,-6.65),.14,materials['rusted-steel'])
for x in (-5.9,5.9):
    cube('fire-station-raised-bay-lintel',(x,6.1,-6.55),(11.4,.54,.50),materials['red-paint'],.08)
for x in (-5.7,5.7):
    for z in (-6.1,6.1): cube('fire-station-side-wall',(x,2.9,z),(.25,5.8,12.0),materials['red-paint'],.04)
for i in range(7):
    z=-6+i*2
    panel=cube(f'fire-station-roof-panel-{i+1}',(0,6.35,z),(21.3,.14,2.0),materials['galvanised-tin'],.035)
    panel.rotation_euler[0]=.055 if i%2 else -.055
for x in (-9.7,-5.9,0,5.9,9.7): beam('fire-station-roof-rafter',(x,6.1,-6.4),(x,6.1,6.4),.16,materials['weathered-plank'])
# Tower for drying canvas hoses; open steel lattice and hanging hose loops.
for sx in (7.6,9.5):
    for sz in (-5.6,-3.7):
        beam('fire-station-hose-tower-leg',(sx,6.3,sz),(sx,12.8,sz),.18,materials['rusted-steel'])
for y in (7.2,9.6,12.5):
    for z in (-5.6,-3.7): beam('fire-station-tower-rung',(7.6,y,z),(9.5,y,z),.10,materials['galvanised-tin'])
    for x in (7.6,9.5): beam('fire-station-tower-side-rail',(x,y,-5.6),(x,y,-3.7),.10,materials['rusted-steel'])
for x in (8.0,8.5,9.0):
    pipe(f'fire-station-hanging-hose-{x}',(x,12.0,-5.5),(x,8.1,-5.5),.065,materials['iron-dark'])
for x in (7.6,9.5):
    for z in (-5.6,-3.7): beam('fire-station-tower-diagonal',(x,7.2,z),(9.5 if x==7.6 else 7.6,9.6,z),.09,materials['rusted-steel'])
bell=pipe('fire-station-bell-neck',(8.55,12.8,-4.65),(8.55,13.15,-4.65),.10,materials['iron-dark'])
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.28,location=town.game_vector((8.55,13.1,-4.65)))
bobj=bpy.context.object;bobj.name='fire-station-bell';bobj.scale=(1,.65,1);bobj.data.materials.append(materials['rusted-steel']);attach(bobj)

# Clinic, clinic water tank and legible roof cross. Low roof hardware is visible
# in the mayor's overhead view and the faded paint keeps a working hospital cue.
b=building('clinic',(2,2))
for x in (-6.5,6.5):
    for z in (-6.5,6.5): cube('clinic-wall-post',(x,2.35,z),(.26,4.7,.26),materials['weathered-plank'],.04)
for sx in (-1,1):
    tin(f'clinic-white-tin-wall-{sx}',(sx*6.45,2.3,0),12.7,4.45,turn=math.pi/2)
for sz in (-1,1): tin(f'clinic-white-tin-wall-{sz}',(0,2.3,sz*6.45),12.7,4.45)
for i in range(6):
    z=-5+i*2
    panel=cube(f'clinic-roof-patch-{i+1}',(0,4.85,z),(13.5,.13,2.0),materials['container-white'],.03)
    panel.rotation_euler[0]=(-1 if i%2 else 1)*.035
for x in (-5.8,-2.0,2.0,5.8): beam('clinic-roof-rafter',(x,4.6,-6.1),(x,4.6,6.1),.12,materials['weathered-plank'])
# Red cross is physically raised, not paint printed on the roof texture.
cube('clinic-roof-red-cross-vertical',(0,5.08,0),(.78,.10,2.65),materials['red-paint'],.06)
cube('clinic-roof-red-cross-horizontal',(0,5.10,0),(2.65,.12,.78),materials['red-paint'],.06)
for x in (-4.6,4.6):
    pipe('clinic-tank-leg',(x,4.75,3.6),(x,6.5,3.6),.075,materials['rusted-steel'])
bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.88,depth=1.2,location=town.game_vector((0,6.25,3.6)))
tank=bpy.context.object;tank.name='clinic-water-tank';tank.data.materials.append(materials['rusted-steel']);attach(tank)
for y in (5.72,6.78):
    bpy.ops.mesh.primitive_torus_add(major_radius=.88,minor_radius=.045,major_segments=20,minor_segments=8,location=town.game_vector((0,y,3.6)))
    attach(bpy.context.object)
    bpy.context.object.name='clinic-tank-rolled-seam';bpy.context.object.data.materials.append(materials['iron-dark'])
for i in range(3):
    x=-.42+i*.42
    cube(f'clinic-front-window-{i+1}',(x,2.5,-6.60),(.65,1.05,.045),materials['broken-glass'],.035)
    beam('clinic-window-crossbar',(x-.28,2.5,-6.64),(x+.28,2.5,-6.64),.045,materials['rusted-steel'])

# Hydrant and hose reel fit in a quarter-cell footprint.
b=building('hydrant')
cube('hydrant-bolted-base',(0,.09,0),(.52,.18,.52),materials['rusted-steel'],.035)
pipe('hydrant-standpipe',(0,.18,0),(0,.96,0),.105,materials['rusted-steel'])
for y in (.3,.82):
    cube('hydrant-collar',(0,y,0),(.34,.10,.34),materials['galvanised-tin'],.025)
for x,z in ((-.2,0),(.2,0),(0,-.2),(0,.2)):
    pipe('hydrant-outlet-neck',(0,.58,0),(x,.58,z),.07,materials['rusted-steel'])
    cube('hydrant-outlet-cap',(x*1.16,.58,z*1.16),(.14,.14,.14),materials['iron-dark'],.025)
pipe('hydrant-hose-reel-axle',(.22,.72,.20),(.22,1.18,.20),.045,materials['iron-dark'])
for y in (.76,1.12):
    bpy.ops.mesh.primitive_torus_add(major_radius=.27,minor_radius=.035,major_segments=16,minor_segments=6,location=town.game_vector((.22,y,.20)))
    wheel=bpy.context.object;wheel.name='hydrant-hose-reel-side';wheel.rotation_euler[0]=math.pi/2;wheel.data.materials.append(materials['rusted-steel']);attach(wheel)
for i in range(4):
    angle=i*math.pi/2
    pipe('hydrant-reel-spoke',(.22,.94,.20),(.22+math.sin(angle)*.26,.94,.20+math.cos(angle)*.26),.025,materials['galvanised-tin'],sides=8)
pipe('hydrant-coiled-hose',(0,.94,.22),(.34,.94,.22),.06,materials['iron-dark'])

# Trace building fronts from their generated photo references. These shallow
# photo slabs keep the measured silhouette and holes while the side, roof,
# tower, tanks and opening depth stay real modeled geometry.
def photo_facade(name, image_path, crop, world_x, world_width, world_height, front_z,
                 holes=(), parent=None, floor_px=None):
    photo=Photo(image_path)
    x0,y0,x1,y1=crop
    seeds=[(3,3),(photo.w-4,3)]
    sky=photo.sky(seeds,tolerance=28,grey=42)
    solid=~sky
    clipped=np.zeros_like(solid)
    clipped[y0:y1,x0:x1]=solid[y0:y1,x0:x1]
    for hx0,hy0,hx1,hy1 in holes:
        clipped[hy0:hy1,hx0:hx1]=False
    loops=photo_trace(clipped,crop,tolerance=3.2,min_area=35)
    if not loops: raise RuntimeError(f'{name}: reference photo produced no traced facade')
    floor_px=floor_px if floor_px is not None else y1
    mesh=PhotoMesh()
    def to_world(px,py,depth):
        x=world_x+(px-x0)/(x1-x0)*world_width
        y=(floor_px-py)/(y1-y0)*world_height
        return (x,y,front_z+depth)
    photo_slab(mesh,'photo',photo,loops,to_world,0,.035)
    result=mesh.finish(name,{'photo':photo.material()})
    parent=parent or BUILDINGS[name.split('-photo-')[0]]
    return attach(result,parent)

photo_root=root/'public/assets/models/wasteland/town/textures'
photo_facade('fire-station-photo-facade',photo_root/'town-safety-fire-station.jpg',
             (20,188,934,465),-11.6,23.2,6.6,-6.72,
             holes=((220,320,478,459),(500,320,790,459)),parent=BUILDINGS['fire-station'],floor_px=464)
photo_facade('clinic-photo-facade',photo_root/'town-safety-clinic.jpg',
             (60,190,970,820),-6.3,12.6,6.6,-6.72,parent=BUILDINGS['clinic'],floor_px=820)
photo_facade('guard-post-photo-facade',photo_root/'town-safety-guard-post.jpg',
             (0,25,1024,500),-6.3,12.6,3.4,-2.43,parent=BUILDINGS['guard-post'],floor_px=500)
photo_facade('gate-scrap-photo-door',photo_root/'town-safety-gate.jpg',
             (245,155,780,508),-2.7,5.4,3.4,-3.52,parent=door,floor_px=508)

# Save an editable scene recipe output; render views only after GLB round-trip.
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
glb.parent.mkdir(parents=True,exist_ok=True)
town.export_glb(glb)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
render_dir=evidence
render_dir.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=900;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
world=bpy.data.worlds.new('bright overcast') if not bpy.data.worlds else bpy.data.worlds[0]
scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.48,.50,.49,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
def aim(obj, point): obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def render(name, view, location, target, ortho):
    cam_data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,cam_data);scene.collection.objects.link(cam)
    cam.location=Vector(location);aim(cam,Vector(target));cam.data.type='ORTHO';cam.data.ortho_scale=ortho;scene.camera=cam
    scene.render.filepath=str(render_dir/f'{name}.png')
    scene.render.resolution_x=900;scene.render.resolution_y=720
    bpy.ops.render.render(write_still=True)

# Hide other model parts so the comparison views have the same subject and scale.
watch=next(obj for obj in scene.objects if obj.name=='watchtower')
for obj in scene.objects:
    obj.hide_render = not (obj==watch or obj.parent==watch or obj in watch.children_recursive)
watch_meshes=[obj for obj in {watch,*watch.children_recursive} if obj.type=='MESH']
watch_corners=[obj.matrix_world @ Vector(corner) for obj in watch_meshes for corner in obj.bound_box]
watch_min=Vector(tuple(min(point[i] for point in watch_corners) for i in range(3)))
watch_max=Vector(tuple(max(point[i] for point in watch_corners) for i in range(3)))
watch_size=watch_max-watch_min
if min(watch_size) <= .0001: raise RuntimeError(f'watchtower has zero bounds: {watch_min} .. {watch_max}')
print(f'BOUNDS watchtower: min={tuple(round(v,3) for v in watch_min)} max={tuple(round(v,3) for v in watch_max)} size={tuple(round(v,3) for v in watch_size)}')
watch_center=(watch_min+watch_max)*.5
watch_frame=max(watch_size.x,watch_size.y,watch_size.z*1.25)*1.22
ground=bpy.data.materials.new('Plain dusty ground')
ground.diffuse_color=(.31,.27,.21,1);ground.use_nodes=True
ground.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.31,.27,.21,1)
ground.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
bpy.ops.mesh.primitive_plane_add(size=1000,location=(0,0,-.02))
plane=bpy.context.object;plane.name='neutral dusty ground';plane.data.materials.append(ground)
for name,loc,target,scale in (
    ('watchtower-above',watch_center+Vector((1,1,1.414)).normalized()*watch_frame*1.6,watch_center,watch_frame),
    ('watchtower-driver-seat',(watch_center.x,watch_max.y+watch_frame*1.8,1.55),watch_center,watch_frame),
):
    # Keep one large area light for overcast, readable surface color.
    if not any(o.type=='LIGHT' for o in scene.objects):
        ld=bpy.data.lights.new('overcast softbox','AREA');ld.energy=2100;ld.size=14
        light=bpy.data.objects.new('overcast softbox',ld);scene.collection.objects.link(light);light.location=(2,-12,18);aim(light,(0,0,3))
    render(name,'',loc,target,scale)

# One compact comparison sheet. Only its small reference crop is committed;
# the photographic source stays in Codex's generated-image store.
import subprocess
sheet_code = r'''from PIL import Image, ImageDraw, ImageFont, ImageOps
from pathlib import Path
import sys
reference, above_path, driver_path, out = map(Path, sys.argv[1:])
crop=ImageOps.fit(Image.open(reference).convert('RGB'),(430,570),method=Image.Resampling.LANCZOS,centering=(.5,.52))
above=Image.open(above_path).convert('RGB');driver=Image.open(driver_path).convert('RGB')
page=Image.new('RGB',(1280,900),(42,43,39));draw=ImageDraw.Draw(page)
fonts=Path('C:/Windows/Fonts');title=ImageFont.truetype(str(fonts/'segoeuib.ttf'),26);label=ImageFont.truetype(str(fonts/'segoeuib.ttf'),19);small=ImageFont.truetype(str(fonts/'segoeui.ttf'),16)
draw.text((28,18),'TOWN SAFETY | ROUND 3 | WATCHTOWER',font=title,fill=(239,226,201))
draw.text((28,55),'Welded frame, raised lookout, patched roof | exported GLB reimported to an empty scene',font=small,fill=(211,202,180))
for x,img,caption in ((28,crop,'PHOTOGRAPHIC TARGET'),(468,above,'EXPORTED GLB | 45° OVERHEAD'),(908,driver,'EXPORTED GLB | DRIVER VIEW')):
    draw.text((x,92),caption,font=label,fill=(231,189,126));page.paste(ImageOps.fit(img,(420,570),method=Image.Resampling.LANCZOS),(x,124))
draw.text((28,720),'Construction read: braced timber and steel legs, bolted collars, ladder, open rails, chair, worn tin roof.',font=small,fill=(234,226,206))
draw.text((28,752),'Surface gap: existing town textures are close; the photo has stronger board grain, bent seams and dirt variation.',font=small,fill=(234,226,206))
draw.text((28,784),'Other card nodes are included in safety.glb. No runtime texture was added.',font=small,fill=(234,226,206))
Path(out).parent.mkdir(parents=True,exist_ok=True);page.save(out,format='JPEG',quality=84,optimize=True,progressive=True)
'''
sheet.parent.mkdir(parents=True,exist_ok=True)
subprocess.run(['python','-c',sheet_code,args.reference,str(render_dir/'watchtower-above.png'),
                str(render_dir/'watchtower-driver-seat.png'),str(sheet)],check=True)

# Round three frames the family from the exported bounding boxes.
ids=['watchtower','fire-station','clinic','guard-post','gate-scrap','searchlight','hydrant']
by_name={obj.name:obj for obj in scene.objects}
next(obj for obj in scene.objects if obj.name=='neutral dusty ground').hide_render=True
ground_plane=next(obj for obj in scene.objects if obj.name=='neutral dusty ground')
captures={}
for building_id in ids:
    root_obj=by_name[building_id];visible={root_obj,*root_obj.children_recursive}
    ancestor=root_obj.parent
    while ancestor is not None:visible.add(ancestor);ancestor=ancestor.parent
    for obj in scene.objects:
        if obj.type in {'MESH','EMPTY'}:obj.hide_render=(obj not in visible and obj.name!='neutral dusty ground')
    bpy.context.view_layer.update()
    corners=[obj.matrix_world @ Vector(corner) for obj in visible if obj.type=='MESH' for corner in obj.bound_box]
    lo=[min(v[i] for v in corners) for i in range(3)];hi=[max(v[i] for v in corners) for i in range(3)]
    center=Vector(tuple((lo[i]+hi[i])/2 for i in range(3)));span=max(hi[i]-lo[i] for i in range(3));size=max(hi[0]-lo[0],hi[1]-lo[1],(hi[2]-lo[2])*1.25,1.5)*1.20
    print(f'BOUNDS {building_id}: min={tuple(round(v,3) for v in lo)} max={tuple(round(v,3) for v in hi)} size={tuple(round(hi[i]-lo[i],3) for i in range(3))}')
    views=[]
    for tag,direction in (('mayor',(1,1,1.414)),('driver',(0,1,0))):
        data=bpy.data.cameras.new(f'{building_id}-{tag}');cam=bpy.data.objects.new(f'{building_id}-{tag}',data);scene.collection.objects.link(cam)
        cam.location=(center+Vector(direction).normalized()*span*1.6 if tag=='mayor' else Vector((center.x,hi[1]+span*1.8,lo[2]+1.55)));aim(cam,center);cam.data.type='ORTHO';cam.data.ortho_scale=size;scene.camera=cam
        ground_plane.hide_render=(tag=='driver')
        scene.render.resolution_x=640;scene.render.resolution_y=480
        out=render_dir/f'{building_id}-{tag}.png';scene.render.filepath=str(out);bpy.ops.render.render(write_still=True);views.append(out)
        bpy.data.objects.remove(cam,do_unlink=True);bpy.data.cameras.remove(data)
        ground_plane.hide_render=False
    captures[building_id]=views
    if building_id=='gate-scrap':
        door=by_name['gate-scrap:door'];door.rotation_euler=(0,0,0)
        pivot=Vector((-2.7,3.25,0))
        swing=Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(78),4,'Z') @ Matrix.Translation(-pivot)
        leaf_parts=[obj for obj in scene.objects if obj.type=='MESH' and
                    (obj.name.startswith('gate-scrap-door-') or obj.name.startswith('gate-scrap-car-door-') or obj.name.startswith('gate-scrap-photo-door'))]
        print(f'GATE OPEN POSE: rotating {len(leaf_parts)} exported leaf meshes around hinge {tuple(pivot)}')
        for obj in leaf_parts:obj.matrix_world=swing @ obj.matrix_world
        bpy.context.view_layer.update()
        visible={root_obj,*root_obj.children_recursive}
        for obj in scene.objects:obj.hide_render=(obj not in visible and obj.name!='neutral dusty ground')
        bpy.context.view_layer.update()
        lo=[min((obj.matrix_world @ Vector(corner))[i] for obj in visible if obj.type=='MESH' for corner in obj.bound_box) for i in range(3)]
        hi=[max((obj.matrix_world @ Vector(corner))[i] for obj in visible if obj.type=='MESH' for corner in obj.bound_box) for i in range(3)]
        center=Vector(tuple((lo[i]+hi[i])/2 for i in range(3)));span=max(hi[i]-lo[i] for i in range(3))
        data=bpy.data.cameras.new('gate-scrap-open');cam=bpy.data.objects.new('gate-scrap-open',data);scene.collection.objects.link(cam)
        open_size=max(hi[0]-lo[0],hi[1]-lo[1],(hi[2]-lo[2])*1.25,1.5)*1.20
        cam.location=center+Vector((1,1,1.414)).normalized()*span*1.6;aim(cam,center);cam.data.type='ORTHO';cam.data.ortho_scale=open_size;scene.camera=cam
        ground_plane.hide_render=True
        scene.render.filepath=str(render_dir/'gate-scrap-open.png');bpy.ops.render.render(write_still=True)
        ground_plane.hide_render=False
        captures['gate-scrap-open']=[render_dir/'gate-scrap-open.png']
        bpy.data.objects.remove(cam,do_unlink=True);bpy.data.cameras.remove(data)

# Show three straight modules meeting at cell edges, one joined run per tier.
for kind in ('fence-wood','fence-chain','wall-scrap','wall-steel'):
    root_obj=by_name[f'{kind}-straight'];visible=set()
    for index in range(3):
        for original in {root_obj,*root_obj.children_recursive}:
            if index==0:copy=original
            else:
                copy=original.copy()
                if original.data:copy.data=original.data.copy()
                scene.collection.objects.link(copy)
                copy.parent=None
                copy.matrix_world=original.matrix_world.copy()
                copy.matrix_world.translation.x+=8*index
            visible.add(copy)
    for obj in scene.objects:obj.hide_render=(obj not in visible and obj.name!='neutral dusty ground')
    bpy.context.view_layer.update()
    corners=[obj.matrix_world @ Vector(corner) for obj in visible if obj.type=='MESH' for corner in obj.bound_box]
    lo=[min(v[i] for v in corners) for i in range(3)];hi=[max(v[i] for v in corners) for i in range(3)]
    center=Vector(tuple((lo[i]+hi[i])/2 for i in range(3)));span=max(hi[i]-lo[i] for i in range(3))
    print(f'BOUNDS {kind}-joined-run: min={tuple(round(v,3) for v in lo)} max={tuple(round(v,3) for v in hi)} size={tuple(round(hi[i]-lo[i],3) for i in range(3))}')
    data=bpy.data.cameras.new(f'{kind}-joined-run');cam=bpy.data.objects.new(f'{kind}-joined-run',data);scene.collection.objects.link(cam)
    cam.location=center+Vector((0,1,.2)).normalized()*span*1.5;aim(cam,center);cam.data.type='ORTHO';cam.data.ortho_scale=3.8;scene.camera=cam
    scene.render.resolution_x=1280;scene.render.resolution_y=200
    ground_plane.hide_render=True
    scene.render.filepath=str(render_dir/f'{kind}-joined-run.png');bpy.ops.render.render(write_still=True)
    ground_plane.hide_render=False
    captures[kind+'-joined-run']=[render_dir/f'{kind}-joined-run.png']
    bpy.data.objects.remove(cam,do_unlink=True);bpy.data.cameras.remove(data)
sheet_code=r'''from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import sys
args=sys.argv[1:-1];out=Path(sys.argv[-1]);page=Image.new('RGB',(1600,2820),(47,46,42));d=ImageDraw.Draw(page)
title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',22);label=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',15);small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',13)
d.text((24,16),'TOWN SAFETY | ROUND 3 | EXPORTED GLB',font=title,fill=(245,238,222))
def place(path,box):
 im=Image.open(path).convert('RGB');im.thumbnail(box,Image.Resampling.LANCZOS)
 x=(box[0]-im.width)//2;y=(box[1]-im.height)//2
 return im,x,y
for i in range(5):
 y=58+i*305;x=22;d.rounded_rectangle((x,y,x+1556,y+285),radius=8,fill=(88,83,73));name,path1,path2,photo=args[i*4:i*4+4]
 d.text((x+12,y+8),name.upper().replace('-',' '),font=label,fill=(238,195,137))
 for col,(caption,path) in enumerate((('PHOTO TARGET',photo),('MAYOR / ROOF',path1),('DRIVER / ROAD',path2))):
  px=x+12+col*510;d.text((px,y+35),caption,font=small,fill=(238,230,210))
  im,ix,iy=place(path,(490,220));page.paste(im,(px+ix,y+54+iy))
items=list(zip(args[20::2],args[21::2]));small_items=[item for item in items if 'joined-run' not in item[0]];runs=[item for item in items if 'joined-run' in item[0]]
for i in range(0,len(small_items),2):
 for column,(name,path) in enumerate(small_items[i:i+2]):
  y=1590+(i//2)*170;x=22+column*790
  d.rounded_rectangle((x,y,x+770,y+154),radius=8,fill=(88,83,73));d.text((x+12,y+8),name.replace('-',' ').upper(),font=label,fill=(238,195,137))
  im,ix,iy=place(path,(740,115));page.paste(im,(x+12+ix,y+32+iy))
for index,(name,path) in enumerate(runs):
 y=2100+index*175
 d.rounded_rectangle((22,y,1578,y+160),radius=8,fill=(88,83,73));d.text((34,y+8),name.replace('-',' ').upper(),font=label,fill=(238,195,137))
 im,ix,iy=place(path,(1520,118));page.paste(im,(30+ix,y+34+iy))
out.parent.mkdir(parents=True,exist_ok=True);page.save(out,format='JPEG',quality=80,optimize=True,progressive=True)
'''
sheet_args=[]
photo_paths={'watchtower':root/args.reference,'fire-station':root/'public/assets/models/wasteland/town/textures/town-safety-fire-station.jpg',
 'clinic':root/'public/assets/models/wasteland/town/textures/town-safety-clinic.jpg','guard-post':root/'public/assets/models/wasteland/town/textures/town-safety-guard-post.jpg',
 'gate-scrap':root/'public/assets/models/wasteland/town/textures/town-safety-gate.jpg'}
for building_id in ids[:5]:sheet_args.extend([building_id,str(captures[building_id][0]),str(captures[building_id][1]),str(photo_paths[building_id])])
for kind in ('searchlight','hydrant','gate-scrap-open','fence-wood-joined-run','fence-chain-joined-run','wall-scrap-joined-run','wall-steel-joined-run'):
 actual=kind.replace('-joined-run','')+'-joined-run' if '-joined-run' in kind else kind
 path=captures[actual][0] if actual in captures else captures[kind][0]
 sheet_args.extend([kind,path])
subprocess.run(['python','-c',sheet_code,*sheet_args,str(sheet)],check=True)
