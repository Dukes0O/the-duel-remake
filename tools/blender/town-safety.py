"""Build the town's safety structures from welded steel, timber and salvaged tin."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--reference', default=r'C:/Users/kyleb/.codex/generated_images/01a1b133-66d4-72f1-99e8-b49f9c090c93/exec-a09fd17d-45d5-4f90-a98a-13420165421a.png')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
evidence = root / '.evidence/2026-11-06/TOWN-ART-SAFETY/round-2'
glb = root / 'public/assets/models/wasteland/town/safety.glb'
blend = root / 'art-build/town/safety.blend'
sheet = root / 'docs/board/looks/town-art-safety/round-2.jpg'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)],'summary':str(sheet)}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

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
door=bpy.data.objects.new('gate-scrap:door',None);bpy.context.collection.objects.link(door);door.location=town.game_vector((0,2.25,-3.25));attach(door)
for i in range(8):
    x=-2.6+i*.74
    cube(f'gate-scrap-door-plank-{i+1}',(x,0,0),(.68,3.4,.13),materials['rusted-steel'],.035,door)
for y in (-1.15,1.15): beam('gate-scrap-door-crossbar',(-2.7,y,-.08),(2.7,y,-.08),.13,materials['iron-dark'],door)
for x in (-2.3,2.3):
    pipe('gate-scrap-door-hinge',(x,-1.55,-.22),(x,1.55,-.22),.09,materials['iron-dark'],door)

# Guard post: low sandbag berm, bolted tin roof and a contained steel brazier.
b=building('guard-post',(2,1))
for i in range(10):
    x=-5.7+i*1.27
    for row in range(2):
        z=-2.0+row*.45
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=6,radius=1,location=town.game_vector((x+(row%2)*.25,.34+row*.30,z)))
        sack=bpy.context.object;sack.name=f'guard-post-sandbag-{i+1}-{row+1}';sack.scale=(.62,.22,.25);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);sack.data.materials.append(materials['patched-canvas']);attach(sack)
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
    cam.location=town.game_vector(location);aim(cam,town.game_vector(target));cam.data.type='ORTHO';cam.data.ortho_scale=ortho;scene.camera=cam
    scene.render.filepath=str(render_dir/f'{name}.png')
    scene.render.resolution_x=900;scene.render.resolution_y=720
    bpy.ops.render.render(write_still=True)

# Hide other model parts so the comparison views have the same subject and scale.
watch=next(obj for obj in scene.objects if obj.name=='watchtower')
for obj in scene.objects:
    obj.hide_render = not (obj==watch or obj.parent==watch or obj in watch.children_recursive)
ground=bpy.data.materials.new('Plain dusty ground')
ground.diffuse_color=(.31,.27,.21,1);ground.use_nodes=True
ground.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.31,.27,.21,1)
ground.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
bpy.ops.mesh.primitive_plane_add(size=36,location=(0,0,-.015))
plane=bpy.context.object;plane.name='neutral dusty ground';plane.data.materials.append(ground)
for name,loc,target,scale in (
    ('watchtower-above',(20,28,-20),(0,4.8,0),12.2),
    ('watchtower-driver-seat',(15,7,-19),(0,4.6,0),12.2),
):
    # Keep one large area light for overcast, readable surface color.
    if not any(o.type=='LIGHT' for o in scene.objects):
        ld=bpy.data.lights.new('overcast softbox','AREA');ld.energy=2100;ld.size=14
        light=bpy.data.objects.new('overcast softbox',ld);scene.collection.objects.link(light);light.location=town.game_vector((2,18,-8));aim(light,town.game_vector((0,4,0)))
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
draw.text((28,18),'TOWN SAFETY | ROUND 1 | WATCHTOWER',font=title,fill=(239,226,201))
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

# Round two shows every member of the family from above and at driver height.
ids=['watchtower','gate-scrap','guard-post','searchlight','fire-station','clinic','hydrant',
     'fence-wood-straight','fence-wood-corner','fence-wood-end','fence-chain-straight',
     'fence-chain-corner','fence-chain-end','wall-scrap-straight','wall-scrap-corner',
     'wall-scrap-end','wall-steel-straight','wall-steel-corner','wall-steel-end']
by_name={obj.name:obj for obj in scene.objects}
next(obj for obj in scene.objects if obj.name=='neutral dusty ground').hide_render=True
captures=[]
for building_id in ids:
    root_obj=by_name[building_id];visible={root_obj,*root_obj.children_recursive}
    ancestor=root_obj.parent
    while ancestor is not None:visible.add(ancestor);ancestor=ancestor.parent
    for obj in scene.objects:
        if obj.type in {'MESH','EMPTY'}:obj.hide_render=(obj not in visible and obj.name!='neutral dusty ground')
    bpy.context.view_layer.update()
    corners=[obj.matrix_world @ Vector(corner) for obj in visible if obj.type=='MESH' for corner in obj.bound_box]
    lo=[min(v[i] for v in corners) for i in range(3)];hi=[max(v[i] for v in corners) for i in range(3)]
    center=Vector(tuple((lo[i]+hi[i])/2 for i in range(3)));span=max(hi[i]-lo[i] for i in range(3));size=max(span*1.35,1.5)
    views=[]
    for tag,direction in (('above',(1,1.2,-1)),('driver',(1,.35,-1))):
        data=bpy.data.cameras.new(f'{building_id}-{tag}');cam=bpy.data.objects.new(f'{building_id}-{tag}',data);scene.collection.objects.link(cam)
        cam.location=center+Vector(direction).normalized()*span*2.5;aim(cam,center);cam.data.type='ORTHO';cam.data.ortho_scale=size;scene.camera=cam
        scene.render.resolution_x=480;scene.render.resolution_y=360
        out=render_dir/f'{building_id}-{tag}.png';scene.render.filepath=str(out);bpy.ops.render.render(write_still=True);views.append(out)
    captures.append((building_id,views))
sheet_code=r'''from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import sys
reference=Path(sys.argv[1]);paths=[Path(p) for p in sys.argv[2:-1]];out=Path(sys.argv[-1]);page=Image.new('RGB',(1600,2240),(117,110,96));d=ImageDraw.Draw(page)
title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',24);label=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
d.text((30,20),'TOWN SAFETY | ROUND 2 | EXPORTED GLB',font=title,fill=(245,238,222))
ref=ImageOps.fit(Image.open(reference).convert('RGB'),(190,160),method=Image.Resampling.LANCZOS)
page.paste(ref,(1380,12));d.text((1380,174),'PHOTO TARGET',font=label,fill=(245,238,222))
for i in range(0,len(paths),2):
 x=24+(i//2%4)*394;y=72+(i//2//4)*430;name=paths[i].stem.rsplit('-',1)[0]
 d.rounded_rectangle((x,y,x+380,y+408),radius=8,fill=(151,143,126));d.text((x+10,y+8),name.upper(),font=title,fill=(38,36,31))
 for j,p in enumerate(paths[i:i+2]):
  im=ImageOps.fit(Image.open(p).convert('RGB'),(176,300),method=Image.Resampling.LANCZOS);page.paste(im,(x+10+j*184,y+54));d.text((x+10+j*184,y+360),('ABOVE' if j==0 else 'DRIVER'),font=label,fill=(38,36,31))
out.parent.mkdir(parents=True,exist_ok=True);page.save(out,format='JPEG',quality=82,optimize=True,progressive=True)
'''
subprocess.run(['python','-c',sheet_code,args.reference,*[str(path) for _,views in captures for path in views],str(sheet)],check=True)
