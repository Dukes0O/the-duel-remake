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
evidence = root / '.evidence/2026-11-07/TOWN-ART-SAFETY/round-5'
guard_evidence = root / '.evidence/2026-11-07/TOWN-ART-SAFETY/round-8'
glb = root / 'public/assets/models/wasteland/town/safety.glb'
blend = root / 'art-build/town/safety.blend'
sheet = root / 'docs/board/looks/town-art-safety/round-5.jpg'
guard_sheet = root / 'docs/board/looks/town-art-safety/round-8.jpg'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(guard_evidence)],'summary':str(guard_sheet)}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Mesh as PhotoMesh, Photo, lathe, slab as photo_slab, trace as photo_trace
from photo_carve import carve_object, lift_if_dark
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

# Scrap gate across the road, measured and traced from individual photos.
b=building('gate-scrap',(2,1))
gate_photo_root=tex
front=Photo(gate_photo_root/'town-safety-gate-front.jpg')
def measured_mask(photo):
    lift_if_dark(photo)  # brightens only the measuring copy, not its source image
    return ~photo.sky([(8,8),(photo.w-9,8),(8,photo.h-9),(photo.w-9,photo.h-9)],tolerance=46,grey=72)
front_solid=measured_mask(front)
def gate_world(px,py,d,z_offset=0): return ((px-511.5)*(13.4/967),(645-py)*(5.5/617),-3.2+z_offset+d)
def traced_gate_piece(name,photo,solid,crop,to_world,depth):
    loops=photo_trace(solid,crop,tolerance=1.9,min_area=20)
    if not loops: raise RuntimeError(f'{name}: no photo contours in {crop}')
    mesh=PhotoMesh();photo_slab(mesh,'photo',photo,loops,to_world,-depth/2,depth/2)
    obj=mesh.finish(name,{'photo':photo.material()});attach(obj);return obj
for suffix,crop in [('left',(20,22,146,648)),('right',(876,22,1004,648))]:
    traced_gate_piece(f'gate-scrap:tower-{suffix}-road',front,front_solid,crop,gate_world,.26)
    traced_gate_piece(f'gate-scrap:tower-{suffix}-inside',front,front_solid,crop,
                      lambda px,py,d:gate_world(px,py,d,1.4),.26)
traced_gate_piece('gate-scrap:lintel-road',front,front_solid,(128,202,899,256),gate_world,.36)
traced_gate_piece('gate-scrap:lintel-inside',front,front_solid,(128,202,899,256),
                  lambda px,py,d:gate_world(px,py,d,1.4),.36)
# Depth ties connect both traced lattice faces, keeping real open space inside.
for x in (-6.45,-5.35,5.35,6.45):
    for y in (0.12,1.45,2.78,4.12,5.38):
        beam('gate-scrap:tower-depth-tie',(x,y,-3.2),(x,y,-1.8),.12,materials['rusted-steel'])
for y in (.28,1.6,2.92,4.25):
    beam('gate-scrap:tower-depth-cross-brace',(-6.45,y,-3.2),(-5.35,y+1.0,-1.8),.095,materials['galvanised-tin'])
    beam('gate-scrap:tower-depth-cross-brace',(5.35,y,-1.8),(6.45,y+1.0,-3.2),.095,materials['galvanised-tin'])
for x in (-5.2,5.2):
    beam('gate-scrap:lintel-depth-tie',(x,3.72,-3.2),(x,3.72,-1.8),.16,materials['rusted-steel'])
door=bpy.data.objects.new('gate-scrap:door',None);bpy.context.collection.objects.link(door);door.location=town.game_vector((-5.0,0,-3.2));attach(door)
for face,photo,crop,z,flip in (
    ('road',Photo(gate_photo_root/'town-safety-gate-front.jpg'),(145,286,881,644),-3.34,False),
    ('town',Photo(gate_photo_root/'town-safety-gate-rear.jpg'),(144,285,882,645),-3.06,True),
):
    solid=measured_mask(photo);loops=photo_trace(solid,crop,tolerance=1.7,min_area=20)
    if not loops: raise RuntimeError(f'gate door {face}: no photo patchwork contours')
    def door_world(px,py,d,photo=photo,z=z,flip=flip):
        x0,x1,ground,roof=(145,881,644,286) if face=='road' else (144,882,645,285)
        dx=x1-px if flip else px-x0
        return (-5.0+dx*(10.0/(x1-x0)),(ground-py)*(3.45/(ground-roof)),z+d)
    mesh=PhotoMesh();photo_slab(mesh,'photo',photo,loops,door_world,-.07,.07)
    leaf=mesh.finish('gate-scrap:door-'+face,{'photo':photo.material()});attach(leaf,door)
pipe('gate-scrap:hinge-barrel',(-5.0,.08,-3.24),(-5.0,3.04,-3.24),.10,materials['iron-dark'])
beam('gate-scrap:hinge-top-pin',(-5.0,2.95,-3.24),(-4.7,2.95,-3.24),.13,materials['rusted-steel'])
beam('gate-scrap:hinge-bottom-pin',(-5.0,.16,-3.24),(-4.7,.16,-3.24),.13,materials['rusted-steel'])

# Guard post: compact 6 m by 4 m hut measured from the front and side grids.
# Every wall is a separate photo carve; the road wall is split around a door.
b=building('guard-post',(2,1))
wall_photos={'side':'guard-post-wall-side.jpg','front':'guard-post-wall-front.jpg',
             'rear':'guard-post-wall-rear.jpg','top':'guard-post-wall-top.jpg'}
def carved_wall(name,length):
    table={
        'photos':wall_photos,'length':length,'width':.38,'height':1.18,
        'side':{'start':18,'end':1006,'ground':278},
        'front':{'centre':443,'ground':1662,'top':292},
        'rear':{'centre':512,'ground':1393,'top':292},
        'top':{'front':28,'rear':996,'centre':170,'along':'x','x_scale':.38/89},
        'grey':26,'tolerance':38,'bleed_tolerance':34,'voxel':.055,'target':600,
        'mask_dir':str(guard_evidence/'masks'),
    }
    obj=carve_object(name,tex,table)
    # Photo axes (width,height,length) become Blender X,Z,Y, then town X,Y,Z.
    for vertex in obj.data.vertices:
        px,py,pz=vertex.co.copy()
        vertex.co=(py,-px,pz)
    # The long-wall photo is a low row of bags. Keep its measured length but
    # raise that carved profile to the waist-high 1.18 m end-photo scale.
    low=min(v.co.z for v in obj.data.vertices)
    high=max(v.co.z for v in obj.data.vertices)
    for vertex in obj.data.vertices:
        vertex.co.z=low+(vertex.co.z-low)*(1.18/(high-low))
    obj.data.update()
    return obj
def place_wall(name,length,center,turn=0):
    obj=carved_wall(name,length)
    obj.location=town.game_vector(center)
    obj.rotation_euler[2]=turn
    attach(obj)
    return obj
place_wall('guard-post:sandbag-wall',6.0,(0,.02,1.81))
place_wall('guard-post:sandbag-wall-left',4.0,(-2.81,.02,0),math.pi/2)
place_wall('guard-post:sandbag-wall-right',4.0,(2.81,.02,0),math.pi/2)
place_wall('guard-post:sandbag-wall-front-left',2.3,(-1.85,.02,-1.81))
place_wall('guard-post:sandbag-wall-front-right',2.3,(1.85,.02,-1.81))

# Posts follow all four sides and hold the pitched roof at its eaves.
for ix,x in enumerate((-2.91,0,2.91)):
    for iz,z in enumerate((-1.91,1.91)):
        if x == 0 and z < 0:
            continue
        beam(f'guard-post:timber-post-{ix+1}-{iz+1}',(x,.05,z),(x,2.35,z),.18,materials['weathered-plank'])
for x in (-2.91,-.70,.70,2.91):
    beam(f'guard-post:timber-door-post-{x}',(x,.05,-1.91),(x,2.35,-1.91),.17,materials['weathered-plank'])
for x in (-2.91,2.91):
    beam(f'guard-post:timber-side-mid-{x}',(x,.05,0),(x,2.35,0),.17,materials['weathered-plank'])
for x in (-2.91,0,2.91):
    for side in (-1,1):
        beam(f'guard-post:timber-rafter-{x}-{side}',(x,2.35,side*2.0),(x,3.35,0),.14,materials['weathered-plank'])
for z in (-1.91,0,1.91):
    y=2.35 if z else 3.35
    beam(f'guard-post:timber-purlin-{z}',(-3.0,y,z),(3.0,y,z),.19,materials['weathered-plank'])
for x in (-2.91,0,2.91):
    for side in (-1,1):
        beam(f'guard-post:timber-knee-{x}-{side}',(x,1.75,side*1.91),(x,2.34,side*1.42),.12,materials['weathered-plank'])

# Two slopes meet at the ridge. The straight-down image maps across both faces.
roof_photo=Photo(tex/'guard-post-top.jpg')
roof=PhotoMesh()
for side in (-1,1):
    pts=[(-3.30,3.38,0),(3.30,3.38,0),(3.30,2.35,side*2.30),(-3.30,2.35,side*2.30)]
    px0,px1=40,985
    py_ridge,py_eave=(210,810) if side==1 else (810,210)
    uvs=[roof_photo.uv(px0,py_ridge),roof_photo.uv(px1,py_ridge),roof_photo.uv(px1,py_eave),roof_photo.uv(px0,py_eave)]
    roof.face(pts,uvs,'photo',(0,1,0))
    underside=[(x,y-.035,z) for x,y,z in pts]
    roof.face(list(reversed(underside)),[(.02,.02),(.02,.98),(.98,.98),(.98,.02)],'tin',(0,-1,0))
roof_obj=roof.finish('guard-post:tin-roof',{'photo':roof_photo.material(),'tin':materials['galvanised-tin']})
attach(roof_obj)
for side in (-1,1):
    beam(f'guard-post:rusted-eave-{side}',(-3.30,2.35,side*2.30),(3.30,2.35,side*2.30),.045,materials['rusted-steel'])
beam('guard-post:ridge-cap',(-3.30,3.40,0),(3.30,3.40,0),.11,materials['rusted-steel'])

# The brazier stands inside, with its three feet planted on the ground.
brazier_photo=Photo(tex/'guard-post-brazier.jpg')
bowl=PhotoMesh()
uv_profile=lambda i,d,r,a:brazier_photo.uv(512+math.cos(a)*445*r/.61,340-min(1,d/.60)*220)
lathe(bowl,'photo',(0,.48,.72),(0,1,0),(1,0,0),(0,0,1),
      [(0,.34),(.10,.42),(.38,.54),(.55,.61),(.60,.58)],uv_profile,sides=32,
      cap_start=('iron',lambda a,f:(.5+.5*math.cos(a)*f,.5+.5*math.sin(a)*f)))
bowl_obj=bowl.finish('guard-post:brazier',{'photo':brazier_photo.material(),'iron':materials['iron-dark']});attach(bowl_obj)
for i,angle in enumerate((0,2*math.pi/3,4*math.pi/3)):
    foot_x=math.cos(angle)*.38;foot_z=.72+math.sin(angle)*.38
    beam(f'guard-post:brazier-foot-{i+1}',(foot_x,.05,foot_z),(foot_x*.92,.53,.72+math.sin(angle)*.52),.075,materials['rusted-steel'])

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

# Fire station: photo-carved body and two genuinely open drive-through bays.
b=building('fire-station',(3,2))
from photo_carve import carve_object, lift_if_dark, save_mask
photo_root=root/'public/assets/models/wasteland/town/textures'
station_table={
    'photos': {'side':'fire-station-side.jpg','front':'fire-station-front.jpg',
               'rear':'fire-station-rear.jpg','top':'fire-station-top.jpg'},
    # Door height gives the scale: a truck bay is 4.5 m clear under its lintel.
    'length':12.4,'width':20.8,'height':6.2,
    # Use the central 900 px so the measured side-wall scale matches the same door height as the ends.
    'side': {'start':320,'end':1220,'ground':805},
    'front': {'centre':768,'ground':760,'top':308},
    'rear': {'centre':768,'ground':730,'top':360},
    'top': {'front':226,'rear':793,'centre':768,'x_scale':20.8/(1505-27)},
    # Preserve both measured door frames and headers; cut only the clear openings.
    'keep': lambda x,y,z: ~(((x>=-6.5)&(x<=-1.15)|(x>=1.15)&(x<=6.5)) & (y>=0)&(y<=4.5)),
    'grey':26,'tolerance':32,'bleed_tolerance':42,'voxel':.09,'target':7800,
    'mask_dir':str(guard_evidence/'masks'),
}
station_body=carve_object('fire-station:body',photo_root,station_table)
station_body.parent=b
bay_floors=[]
bay_shadows=[]
for name,x in (('left',-3.825),('right',3.825)):
    bay_floors.append(cube(f'fire-station:bay-floor-{name}',(x,.09,0),(5.35,.12,12.0),materials['cracked-concrete'],.012))
    bay_shadows.append(cube(f'fire-station:bay-interior-shadow-{name}',(x,2.25,0),(5.2,4.2,.08),materials['iron-dark'],.008))

# Trace the hose-drying tower and hanging bell from the original station photo.
# The flood reaches through the open lattice, so the picture's grey studio stays open.
tower_photo=Photo(photo_root/'town-safety-fire-station.jpg')
lift_if_dark(tower_photo)
tower_sky=tower_photo.sky([(8,8),(1015,8)],tolerance=27,grey=38)
tower_mask=~tower_sky
tower_mask[475:,:]=False
tower_crop=(877,12,1015,475)
save_mask(tower_mask,evidence/'masks/fire-station-tower-mask.png')
tower_loops=photo_trace(tower_mask,tower_crop,tolerance=1.8,min_area=16)
if not tower_loops: raise RuntimeError('fire-station hose tower photo did not trace')
tower_mesh=PhotoMesh()
TOWER_SCALE=9.8/(475-20)
def tower_world(px,py,depth):
    return (10.2+(px-877)*(1.8/(1015-877)),(475-py)*TOWER_SCALE,-3.2+depth)
photo_slab(tower_mesh,'tower',tower_photo,tower_loops,tower_world,-.08,.08)
tower_obj=tower_mesh.finish('fire-station:hose-tower-and-bell',{'tower':tower_photo.material()})
tower_obj.parent=b

# Keep the measured, full-resolution JPGs in the texture folder; pack smaller
# copies in the family GLB so the completed safety family stays under 3 MiB.
for photo in station_table['_photos'].values():
    photo.image.scale(768,512)
    photo.image.update()
tower_photo.image.scale(512,256)
tower_photo.image.update()

def world_bounds(obj):
    bpy.context.view_layer.update()
    points=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    lo=tuple(min(point[i] for point in points) for i in range(3))
    hi=tuple(max(point[i] for point in points) for i in range(3))
    return lo,hi
station_pieces=(station_body,*bay_floors,*bay_shadows,tower_obj)
for piece in station_pieces:
    lo,hi=world_bounds(piece)
    print(f'PIECE BOUNDS {piece.name}: min={tuple(round(v,3) for v in lo)} max={tuple(round(v,3) for v in hi)}')
    if lo[2] < -.03: raise RuntimeError(f'{piece.name} is below the ground')
if abs(world_bounds(station_body)[0][2]) > .1 or abs(world_bounds(tower_obj)[0][2]) > .01:
    raise RuntimeError('fire station body and tower must touch the ground')
for floor_piece,shadow_piece in zip(bay_floors,bay_shadows):
    floor_top=world_bounds(floor_piece)[1][2]
    shadow_bottom=world_bounds(shadow_piece)[0][2]
    if abs(floor_top-shadow_bottom) > .01:
        raise RuntimeError(f'{shadow_piece.name} must meet its bay floor')
print('CONTACT CHECK: body and tower touch ground; both dark bay interiors meet their floors.')

# Clinic, clinic water tank and legible raised roof cross. The segmented roof
# carries patched tin, unevenly rusted seams and repairs into the mayor view.
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
for x in (-6.35,6.35):
    beam('clinic-roof-ragged-edge-seam',(x,4.92,-6.3),(x,4.92,6.3),.10,materials['rusted-steel'])
for x,z in ((-4.9,-4.8),(4.8,-2.5),(-3.9,4.9),(5.0,1.3)):
    patch=cube('clinic-roof-repair-plate',(x,4.96,z),(1.45,.08,.78),materials['red-paint'] if x<0 else materials['rusted-steel'],.035)
    patch.rotation_euler[1]=.08 if z>0 else -.05
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
photo_facade('clinic-photo-facade',photo_root/'town-safety-clinic.jpg',
             (60,190,970,820),-6.3,12.6,6.6,-6.72,parent=BUILDINGS['clinic'],floor_px=820)

# Save an editable scene recipe output; render views only after GLB round-trip.
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
glb.parent.mkdir(parents=True,exist_ok=True)
# The guard-wall source elevations are oversampled for the exported 6 m hut.
# Keep their carving inputs full resolution, then pack 512 x 1024 copies for
# runtime so the complete safety family stays within its 3 MB target.
for image in bpy.data.images:
    if image.name.startswith(('guard-post-wall-front','guard-post-wall-rear')) and image.size[0]*image.size[1] > 512*1024:
        image.scale(512,1024)
        image.pack()
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
def aim_z(obj, point):
    forward=(Vector(point)-obj.location).normalized()
    world_up=Vector((0,0,1))
    if abs(forward.dot(world_up))>.98: world_up=Vector((0,1,0))
    right=forward.cross(world_up).normalized()
    up=right.cross(forward).normalized()
    obj.rotation_euler=Matrix((right,up,-forward)).transposed().to_euler()
def render(name, view, location, target, ortho):
    cam_data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,cam_data);scene.collection.objects.link(cam)
    cam.location=Vector(location);aim(cam,Vector(target));cam.data.type='ORTHO';cam.data.ortho_scale=ortho;scene.camera=cam
    scene.render.filepath=str(render_dir/f'{name}.png')
    scene.render.resolution_x=900;scene.render.resolution_y=720
    bpy.ops.render.render(write_still=True)

# Round 5: render only the submitted fire station after GLB export/import.
station = next(obj for obj in scene.objects if obj.name == 'fire-station')
visible = {station, *station.children_recursive}
meshes = [obj for obj in visible if obj.type == 'MESH']
for obj in scene.objects:
    obj.hide_render = obj not in visible
bpy.context.view_layer.update()
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
lo = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
hi = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
size = hi - lo
center = (lo + hi) * .5
print(f'EXPORTED FIRE-STATION BOUNDS: min={tuple(round(v,3) for v in lo)} max={tuple(round(v,3) for v in hi)} size={tuple(round(v,3) for v in size)}')
if min(size) <= .001: raise RuntimeError('fire station has empty exported bounds')
# One ground check for each authored part; the hose tower also meets the body at its base edge.
for piece_name in ('fire-station:body', 'fire-station:bay-floor-left', 'fire-station:bay-floor-right', 'fire-station:bay-interior-shadow-left', 'fire-station:bay-interior-shadow-right', 'fire-station:hose-tower-and-bell'):
    piece = next((obj for obj in meshes if obj.name == piece_name), None)
    if piece is None: raise RuntimeError(f'missing exported piece {piece_name}')
    piece_points = [piece.matrix_world @ Vector(corner) for corner in piece.bound_box]
    piece_lo = tuple(min(point[i] for point in piece_points) for i in range(3))
    piece_hi = tuple(max(point[i] for point in piece_points) for i in range(3))
    print(f'EXPORTED PIECE BOUNDS {piece_name}: min={tuple(round(v,3) for v in piece_lo)} max={tuple(round(v,3) for v in piece_hi)}')
    if 'bay-interior-shadow' in piece_name:
        expected_base=.15
    elif 'bay-floor' in piece_name:
        expected_base=.03
    else:
        expected_base=0
    if abs(piece_lo[2]-expected_base) > .08: raise RuntimeError(f'{piece_name} misses its ground or adjoining floor after export')
print('EXPORTED CONTACT CHECK: body, both bay floors, both bay shadows and tower touch ground or their adjoining structure.')
scene.render.resolution_x = 960; scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = 0; scene.view_settings.gamma = 1
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.43,.45,.45,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
if not any(obj.type == 'LIGHT' for obj in scene.objects):
    ld=bpy.data.lights.new('station softbox','AREA');ld.energy=2300;ld.size=15
    light=bpy.data.objects.new('station softbox',ld);scene.collection.objects.link(light)
    light.location=center+Vector((10,-14,22));aim(light,center)
ground_mat=bpy.data.materials.new('plain grey studio ground');ground_mat.diffuse_color=(.38,.39,.39,1);ground_mat.use_nodes=True
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.38,.39,.39,1)
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.96
bpy.ops.mesh.primitive_plane_add(size=1000,location=(center.x,center.y,lo.z-.035))
plane=bpy.context.object;plane.name='neutral grey ground';plane.data.materials.append(ground_mat)
span=max(size.x,size.y,size.z)
views={
 'side': (center+Vector((span*1.7,0,0)), center, max(size.y,size.z)*1.14),
 'front': (center+Vector((0,span*1.7,size.z*.5)), center, max(size.x,size.z)*1.14),
 'rear': (center+Vector((0,-span*1.7,size.z*.5)), center, max(size.x,size.z)*1.14),
 'above': (center+Vector((0,0,span*1.7)), center, max(size.x,size.y)*1.14),
 'three-quarter-left': (center+Vector((-span*1.45,span*1.2,span*1.5)), center, max(size.x,size.y)*1.36),
 'three-quarter-right': (center+Vector((span*1.45,span*1.2,span*1.5)), center, max(size.x,size.y)*1.36),
 'mayor': (center+Vector((span*1.1,span*1.2,span*1.1)), center, max(size.x,size.y)*1.55),
}
model_views={}
for name,(location,target,scale) in views.items():
    data=bpy.data.cameras.new('fire-station-'+name);cam=bpy.data.objects.new('fire-station-'+name,data);scene.collection.objects.link(cam)
    cam.location=location;aim_z(cam,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale;scene.camera=cam
    plane.hide_render=(name=='front' or name=='rear')
    path=render_dir/f'fire-station-{name}.png';scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True);model_views[name]=path
    bpy.data.objects.remove(cam,do_unlink=True);bpy.data.cameras.remove(data)
plane.hide_render=False

# A compact review sheet: four photo/model pairs at matching orthographic cameras,
# then both three-quarter views and the mayor's distant roof view.
import subprocess
sheet_code=r'''from PIL import Image, ImageDraw, ImageFont, ImageOps
from pathlib import Path
import sys
root=Path(sys.argv[1]);out=Path(sys.argv[2]);textures=root/'public/assets/models/wasteland/town/textures'
pairs=[('SIDE','fire-station-side.jpg','fire-station-side.png'),('FRONT','fire-station-front.jpg','fire-station-front.png'),('REAR','fire-station-rear.jpg','fire-station-rear.png'),('STRAIGHT DOWN','fire-station-top.jpg','fire-station-above.png')]
extras=[('THREE-QUARTER LEFT','fire-station-three-quarter-left.png'),('THREE-QUARTER RIGHT','fire-station-three-quarter-right.png'),("MAYOR'S VIEW","fire-station-mayor.png")]
W,H=1600,2640;page=Image.new('RGB',(W,H),(43,43,40));d=ImageDraw.Draw(page);fonts=Path('C:/Windows/Fonts')
title=ImageFont.truetype(str(fonts/'segoeuib.ttf'),25);label=ImageFont.truetype(str(fonts/'segoeuib.ttf'),17);small=ImageFont.truetype(str(fonts/'segoeui.ttf'),13)
d.text((24,14),'TOWN SAFETY | ROUND 5 | FIRE STATION',font=title,fill=(240,228,205))
def fit(path,box):
 im=Image.open(path).convert('RGB');im.thumbnail(box,Image.Resampling.LANCZOS)
 canvas=Image.new('RGB',box,(128,130,130));canvas.paste(im,((box[0]-im.width)//2,(box[1]-im.height)//2));return canvas
row_h=500
for i,(name,photo,model) in enumerate(pairs):
 y=50+i*row_h;d.rounded_rectangle((18,y,W-18,y+row_h-8),radius=8,fill=(78,76,69));d.text((34,y+7),name,font=label,fill=(240,194,125))
 d.text((35,y+31),'PHOTO',font=small,fill=(229,223,208));d.text((815,y+31),'EXPORTED MODEL | SAME ORTHOGRAPHIC CAMERA',font=small,fill=(229,223,208))
 page.paste(fit(textures/photo,(740,430)),(34,y+48));page.paste(fit(root/'.evidence/2026-11-07/TOWN-ART-SAFETY/round-5'/model,(740,430)),(815,y+48))
for i,(name,model) in enumerate(extras):
 x=18+i*528;y=2072;d.rounded_rectangle((x,y,x+510,y+500),radius=8,fill=(78,76,69));d.text((x+14,y+10),name,font=label,fill=(240,194,125))
 page.paste(fit(root/'.evidence/2026-11-07/TOWN-ART-SAFETY/round-5'/model,(480,450)),(x+15,y+38))
d.text((24,2586),'Two clear drive-through bays, open traced hose lattice and bell, patched roof photo from straight above.',font=small,fill=(232,226,210))
out.parent.mkdir(parents=True,exist_ok=True);page.save(out,'JPEG',quality=78,optimize=True,progressive=True)
'''
subprocess.run(['python','-c',sheet_code,str(root),str(guard_sheet)],check=True)


# Round 8: inspect only the exported gate after GLB round-trip.
gate=next(obj for obj in scene.objects if obj.name=='gate-scrap')
gate_visible={gate,*gate.children_recursive};gate_meshes=[obj for obj in gate_visible if obj.type=='MESH']
for obj in scene.objects: obj.hide_render=obj not in gate_visible and obj.name!='neutral grey ground' and obj.type not in ('LIGHT',)
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.resolution_x=1000;scene.render.resolution_y=680;scene.render.resolution_percentage=100
bpy.context.view_layer.update()
def bounds_of(objects):
    pts=[obj.matrix_world @ Vector(c) for obj in objects for c in obj.bound_box]
    if not pts: raise RuntimeError('empty gate piece group')
    game=[(p.x,p.z,-p.y) for p in pts]
    return {'min':[min(p[i] for p in game) for i in range(3)],'max':[max(p[i] for p in game) for i in range(3)]}
for obj in gate_meshes:
    box=bounds_of([obj]);lo,hi=box['min'],box['max']
    print(f'EXPORTED GATE PIECE {obj.name}:',json.dumps({k:[round(v,3) for v in vals] for k,vals in box.items()},sort_keys=True))
    if lo[0]<-7.5 or hi[0]>7.5 or lo[2]<-3.5 or hi[2]>3.5: raise RuntimeError(f'{obj.name} exceeds gate footprint with 0.5 m clearance')
    if lo[1]>.08:
        for other in gate_meshes:
            if other is obj: continue
            ob=bounds_of([other])
            if all(box['min'][axis]<=ob['max'][axis]+.12 and ob['min'][axis]<=box['max'][axis]+.12 for axis in range(3)): break
        else: raise RuntimeError(f'{obj.name} touches neither ground nor another gate piece')
required=('gate-scrap:tower-left-road','gate-scrap:tower-right-road','gate-scrap:lintel-road','gate-scrap:door-road','gate-scrap:door-town')
for name in required:
    if not any(obj.name==name for obj in gate_meshes): raise RuntimeError(f'missing exported gate piece {name}')
door_node=next(obj for obj in scene.objects if obj.name=='gate-scrap:door')
if not door_node.children: raise RuntimeError('hinged door has no exported geometry')
print('EXPORTED GATE CONTACT CHECK: every mesh touches ground or another piece inside the 2 by 1 footprint.')
points=[obj.matrix_world @ Vector(c) for obj in gate_meshes for c in obj.bound_box]
centre=Vector(tuple((min(p[i] for p in points)+max(p[i] for p in points))/2 for i in range(3)))
def gate_shot(name,offset,ortho):
    data=bpy.data.cameras.new('gate-scrap-'+name);cam=bpy.data.objects.new('gate-scrap-'+name,data);scene.collection.objects.link(cam)
    cam.location=centre+Vector(offset);aim_z(cam,centre);cam.data.type='ORTHO';cam.data.ortho_scale=ortho;scene.camera=cam
    scene.render.filepath=str(guard_evidence/f'gate-scrap-{name}.png');bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True);bpy.data.cameras.remove(data)
guard_evidence.mkdir(parents=True,exist_ok=True)
gate_shot('side',(22,0,0),8.0);gate_shot('front',(0,24,0),13.0);gate_shot('rear',(0,-24,0),13.0);gate_shot('above',(0,0,25),13.0)
gate_shot('three-quarter-left',(-23,24,18),15.0);gate_shot('three-quarter-right',(23,24,18),15.0);gate_shot('mayor',(48,48,48),17.0)
door_node.rotation_euler[2]=math.radians(-78);bpy.context.view_layer.update();gate_shot('open-three-quarter',(-23,24,18),17.2)
import subprocess
gate_sheet=root/'docs/board/looks/town-art-safety/round-8.jpg'
sheet_code=r'''from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import sys
root=Path(sys.argv[1]);out=Path(sys.argv[2]);tex=root/'public/assets/models/wasteland/town/textures';ev=root/'.evidence/2026-11-07/TOWN-ART-SAFETY/round-8'
pairs=[('SIDE','town-safety-gate-side.jpg','gate-scrap-side.png'),('FRONT','town-safety-gate-front.jpg','gate-scrap-front.png'),('REAR','town-safety-gate-rear.jpg','gate-scrap-rear.png'),('STRAIGHT DOWN','town-safety-gate-top.jpg','gate-scrap-above.png')]
extras=[('THREE-QUARTER LEFT','gate-scrap-three-quarter-left.png'),('THREE-QUARTER RIGHT','gate-scrap-three-quarter-right.png'),("MAYOR'S VIEW",'gate-scrap-mayor.png')]
W,H=1600,2640;page=Image.new('RGB',(W,H),(43,43,40));d=ImageDraw.Draw(page);fonts=Path('C:/Windows/Fonts');title=ImageFont.truetype(str(fonts/'segoeuib.ttf'),25);label=ImageFont.truetype(str(fonts/'segoeuib.ttf'),17);small=ImageFont.truetype(str(fonts/'segoeui.ttf'),13)
d.text((24,14),'TOWN SAFETY | ROUND 8 | SCRAP ROAD GATE',font=title,fill=(240,228,205))
def fit(path,box):
 im=Image.open(path).convert('RGB');im.thumbnail(box,Image.Resampling.LANCZOS);canvas=Image.new('RGB',box,(128,130,130));canvas.paste(im,((box[0]-im.width)//2,(box[1]-im.height)//2));return canvas
for i,(name,photo,model) in enumerate(pairs):
 y=50+i*480;d.rounded_rectangle((18,y,W-18,y+472),radius=8,fill=(78,76,69));d.text((34,y+7),name,font=label,fill=(240,194,125));d.text((35,y+31),'PHOTO',font=small,fill=(229,223,208));d.text((815,y+31),'EXPORTED MODEL | MATCHED CAMERA',font=small,fill=(229,223,208));page.paste(fit(tex/photo,(740,410)),(34,y+48));page.paste(fit(ev/model,(740,410)),(815,y+48))
for i,(name,model) in enumerate(extras):
 x=18+i*528;y=1980;d.rounded_rectangle((x,y,x+510,y+510),radius=8,fill=(78,76,69));d.text((x+14,y+10),name,font=label,fill=(240,194,125));page.paste(fit(ev/model,(480,450)),(x+15,y+42))
d.text((24,2530),'Open traced steel lattices, full-width photo-traced car-door leaf, continuous road lintel.',font=small,fill=(232,226,210));out.parent.mkdir(parents=True,exist_ok=True)
for quality in (80,76,72,68,64,60):
 page.save(out,'JPEG',quality=quality,optimize=True,progressive=True)
 if out.stat().st_size<=500000:break
if out.stat().st_size>500000:raise RuntimeError(f'gate sheet exceeds 500 KB: {out.stat().st_size}')
print(f'GATE ROUND 8 SHEET: {out.stat().st_size} bytes')
'''
subprocess.run(['python','-c',sheet_code,str(root),str(gate_sheet)],check=True)
