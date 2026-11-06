"""Original water-family buildings for TOWN-ART-WATER.

Materials come from the shared town recipe's seeded 1K wear atlas. The source
recipe stays self-contained and needs no raster inputs.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--round', type=int, default=1)
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
if a.round != 1:
    p.error('this card submits round 1 only')
evidence = root / '.evidence/2026-11-05/town-art-water/round-1'
out = root / 'public/assets/models/wasteland/town/water.glb'
blend = root / 'art-build/town/water.blend'
sheet = root / 'docs/board/looks/town-art-water/round-1.jpg'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)
import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
materials = town.make_materials()
mat = materials
def solid(name, color, roughness=.88, metallic=0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color,1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color,1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return material
mat['dirty-water'] = solid('Town / dirty brown water',(.20,.105,.045),.34,.08)
mat['reservoir-water'] = solid('Town / dark reservoir water',(.055,.115,.105),.22,.14)
mat['filter-sand'] = solid('Town / pale filter sand',(.56,.44,.27),.92)
mat['clean-water'] = solid('Town / clean-water green enamel',(.20,.34,.29),.46,.18)
mat['chalk-stone'] = materials['cracked-concrete']
mat['well-stone-light'] = materials['salvaged-brick']
mat['sandbag-canvas'] = solid('Town / sandbag canvas',(.43,.35,.25),.96)
root_node = bpy.data.objects.new('town-water', None)
bpy.context.collection.objects.link(root_node)
building_roots = {}
export_objects = {root_node}

def add_root(name, location):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = town.game_vector(location)
    obj.parent = root_node
    building_roots[name] = obj
    return obj

def keep(obj, parent):
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world
    export_objects.add(obj)
    return obj

def box(name, center, size, material, bevel=.04, parent=None):
    obj = town.cube(name, center, size, material, bevel)
    return keep(obj, parent or current)

def beam(name, a, b, width, material, parent=None):
    return keep(town.beam(name, a, b, width, material), parent or current)

def cylinder(name, center, radius, depth, material, vertices=20, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=town.game_vector(center))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = len(poly.vertices) > 4
    return keep(obj, parent or current)

def low_cube(name, center, size, material, parent=None):
    w,h,d=size
    verts=[(-w/2,-d/2,-h/2),(w/2,-d/2,-h/2),(w/2,d/2,-h/2),(-w/2,d/2,-h/2),
           (-w/2,-d/2,h/2),(w/2,-d/2,h/2),(w/2,d/2,h/2),(-w/2,d/2,h/2)]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    mesh=bpy.data.meshes.new(name+' low-poly stone');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    obj.location=town.game_vector(center);obj.data.materials.append(material)
    return keep(obj,parent or current)

def low_sandbag(name, center, size, material, parent=None):
    w,h,d=size
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=1,location=town.game_vector(center))
    obj=bpy.context.object;obj.name=name;obj.scale=(w/2,d/2,h/2)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material)
    for poly in obj.data.polygons: poly.use_smooth=True
    return keep(obj,parent or current)

def torus(name, center, major, minor, material, parent=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6, major_radius=major,
                                    minor_radius=minor, location=town.game_vector(center))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return keep(obj, parent or current)

def tube(name, points, radius, material, parent=None):
    before = set(bpy.context.scene.objects)
    town.pipe_run(name, points, radius, material)
    parent_since(parent or current, before)

def parent_since(parent, before):
    for obj in list(set(bpy.context.scene.objects) - before):
        if obj.parent is None and obj is not parent:
            keep(obj, parent)

def local(name, x, y, z):
    """Translate building-local metres to world design coordinates."""
    ox, oy, oz = OFFSETS[name]
    return (ox+x, oy+y, oz+z)

OFFSETS = {
    'hand-well': (-10, 0, -12), 'standpipe': (-2, 0, -13),
    'water-tower': (15, 0, -9), 'pump-house': (6, 0, -10),
    'treatment-plant': (0, 0, 7), 'reservoir': (-20, 0, 8),
}

# Hand well: rough stone throat, timber tripod-like uprights, real crank and bucket.
current = add_root('hand-well', OFFSETS['hand-well'])
for layer in range(4):
    radius = 1.14-(layer%2)*.035
    count = 16
    for i in range(count):
        angle = math.tau*i/count + (layer%2)*.08
        size = (.57 + .04*((i+layer)%3),.30 + .03*((2*i+layer)%3),.42 + .04*((i+2*layer)%3))
        stone_mat = mat['well-stone-light'] if (i+2*layer)%5 == 0 else mat['chalk-stone']
        stone = box(f'hand-well:stone-{layer+1}-{i+1}',
            local('hand-well',math.cos(angle)*radius,.21+layer*.35 + .025*((i*7+layer)%3),math.sin(angle)*radius),
            (.54,.36,.45),stone_mat,.06)
        stone.rotation_euler[2] = -angle
cylinder('hand-well:dark-well-water', local('hand-well',0,.42,0), .70,.06,mat['dirty-water'])
for side in (-1,1):
    beam(f'hand-well:crank-post-{side}',local('hand-well',side*1.18,.08,-.38),
         local('hand-well',side*1.18,3.0,-.38),.19,mat['weathered-plank'])
beam('hand-well:crank-shaft',local('hand-well',-1.4,2.78,-.38),local('hand-well',1.4,2.78,-.38),.14,mat['rusted-steel'])
torus('hand-well:crank-wheel',local('hand-well',-1.47,2.78,-.38),.27,.065,mat['rusted-steel'])
bpy.data.objects['hand-well:crank-wheel'].rotation_euler[0] = math.pi/2
beam('hand-well:handle',local('hand-well',1.32,2.78,-.38),local('hand-well',1.32,2.24,-.38),.09,mat['weathered-plank'])
beam('hand-well:rope',local('hand-well',0,2.78,-.38),local('hand-well',0,1.10,-.38),.045,mat['patched-canvas'])
box('hand-well:bucket',local('hand-well',0,.76,-.38),(.43,.55,.43),mat['rusted-steel'],.07)
beam('hand-well:bucket-bail',local('hand-well',-.2,1.03,-.38),local('hand-well',.2,1.03,-.38),.035,mat['iron-dark'])

# Standpipe: service post with drip stain, hooked tap, buckets and a handled can queue.
current = add_root('standpipe', OFFSETS['standpipe'])
box('standpipe:concrete-foot',local('standpipe',0,.16,0),(1.35,.32,1.3),mat['cracked-concrete'])
box('standpipe:upright',local('standpipe',0,1.95,0),(.28,3.65,.28),mat['rusted-steel'],.07)
box('standpipe:dark-drip-stain',local('standpipe',-.20,1.15,-.17),(.16,1.95,.04),mat['iron-dark'],.01)
beam('standpipe:spout-arm',local('standpipe',0,2.76,0),local('standpipe',.76,2.76,0),.14,mat['galvanised-tin'])
tube('standpipe:downturned-spout',[local('standpipe',.76,2.76,0),local('standpipe',.76,2.30,0)],.06,mat['galvanised-tin'])
box('standpipe:brass-tap-nose',local('standpipe',.83,2.31,0),(.24,.16,.18),mat['faded-hand-paint'],.05)
beam('standpipe:tap-handle',local('standpipe',.40,2.77,.12),local('standpipe',.40,3.04,.12),.045,mat['rusted-steel'])
torus('standpipe:service-valve-wheel',local('standpipe',.19,2.77,.13),.22,.035,mat['faded-hand-paint'])
beam('standpipe:valve-spoke-a',local('standpipe',-.03,2.77,.13),local('standpipe',.41,2.77,.13),.035,mat['iron-dark'])
beam('standpipe:valve-spoke-b',local('standpipe',.19,2.55,.13),local('standpipe',.19,2.99,.13),.035,mat['iron-dark'])
box('standpipe:pipe-collar',local('standpipe',0,2.43,0),(.43,.16,.43),mat['galvanised-tin'],.04)
torus('standpipe:tap-nozzle',local('standpipe',.76,2.30,0),.09,.025,mat['galvanised-tin'])
for i,(x,z) in enumerate(((-1.15,-.6),(.15,-.88),(1.22,-.45))):
    box(f'standpipe:bucket-{i+1}',local('standpipe',x,.28,z),(.54,.56,.50),mat['galvanised-tin'],.06)
    torus(f'standpipe:bucket-handle-{i+1}',local('standpipe',x,.61,z),.19,.025,mat['iron-dark'])
box('standpipe:jerrycan-queue',local('standpipe',-.82,.43,-1.25),(.55,.78,.35),mat['faded-hand-paint'],.08)
box('standpipe:jerrycan-handle',local('standpipe',-.82,.84,-1.25),(.25,.09,.12),mat['iron-dark'],.03)

# Twelve-metre head tank on a braced welded four-leg tower, with three fill marks.
current = add_root('water-tower', OFFSETS['water-tower'])
for x in (-3.6,3.6):
    for z in (-3.6,3.6):
        beam(f'water-tower:leg-{x}-{z}',local('water-tower',x,.25,z),local('water-tower',x*.78,12.6,z*.78),.42,mat['rusted-steel'])
for y in (1.3,4.4,7.7,11.4):
    for side in (-1,1):
        beam(f'water-tower:brace-x-{y}-{side}',local('water-tower',-3.6,y,side*3.6),local('water-tower',3.6,y,side*3.6),.15,mat['iron-dark'])
        beam(f'water-tower:brace-z-{y}-{side}',local('water-tower',side*3.6,y,-3.6),local('water-tower',side*3.6,y,3.6),.15,mat['iron-dark'])
for side in (-1,1):
    beam(f'water-tower:cross-brace-{side}',local('water-tower',-3.6,.7,side*3.6),local('water-tower',3.6,8.0,side*3.6),.105,mat['rusted-steel'])
# Rolled tank shell approximated by a faceted cylinder and distinctly dented repair bands.
cylinder('water-tower:main-tank',local('water-tower',0,14.0,0),4.0,3.2,mat['galvanised-tin'],32)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=3.95,radius2=.55,depth=.85,
                               location=town.game_vector(local('water-tower',0,16.02,0)))
tank_roof=bpy.context.object;tank_roof.name='water-tower:weather-cap';tank_roof.data.materials.append(mat['galvanised-tin'])
keep(tank_roof,current)
torus('water-tower:cap-eave-seam',local('water-tower',0,15.60,0),3.95,.07,mat['rusted-steel'])
for y in (12.55,13.25,14.05,14.85,15.45):
    torus(f'water-tower:rolled-seam-{y}',local('water-tower',0,y,0),3.98,.085,mat['rusted-steel'])
for i,(y,color) in enumerate(((13.1,mat['iron-dark']),(14.0,mat['faded-hand-paint']),(14.9,mat['galvanised-tin']))):
    fill=box(f'water-tower:fill-{i+1}',local('water-tower',0,y,-4.02),(1.20,.46,.12),color,.06)
    fill['part'] = 'fill-level indicator'
box('water-tower:level-window',local('water-tower',0,14.0,-4.10),(.34,2.75,.12),mat['dirty-glass'],.05)
for level in (1,2,3):
    box(f'water-tower:rivets-{level}',local('water-tower',0,12.55+level*.75,-4.08),(6.6,.08,.08),mat['iron-dark'],.025)
beam('water-tower:ladder-side-left',local('water-tower',-2.8,.3,-4.12),local('water-tower',-2.8,12.6,-4.12),.07,mat['iron-dark'])
beam('water-tower:ladder-side-right',local('water-tower',-2.0,.3,-4.12),local('water-tower',-2.0,12.6,-4.12),.07,mat['iron-dark'])
for y in [i*.48+.5 for i in range(25)]: beam(f'water-tower:ladder-rung-{y:.2f}',local('water-tower',-2.8,y,-4.12),local('water-tower',-2.0,y,-4.12),.045,mat['galvanised-tin'])
tube('water-tower:outlet-pipe',[local('water-tower',0,12.5,-4.1),local('water-tower',0,8,-4.9),local('water-tower',0,.45,-5.2)],.16,mat['rusted-steel'])

# Salvage engine pump inside a squat corrugated shed; the flywheel is its own moving part.
current = add_root('pump-house', OFFSETS['pump-house'])
box('pump-house:raised-slab',local('pump-house',0,.16,0),(7.0,.3,6.4),mat['cracked-concrete'])
for x in (-3.0,3.0):
    for z in (-2.7,2.7): beam(f'pump-house:post-{x}-{z}',local('pump-house',x,.3,z),local('pump-house',x,3.8,z),.16,mat['rusted-steel'])
for side in (-1,1):
    before = set(bpy.context.scene.objects)
    tin=town.corrugated_sheet(f'pump-house:roof-sheet-{side}',local('pump-house',0,4.0,side*.95),6.7,3.7,mat,bent=side*.08,turn=0)
    tin.rotation_euler[0] = math.pi/2
    parent_since(current,before)
    beam(f'pump-house:roof-purlin-{side}',local('pump-house',-3.3,3.55,side*1.9),local('pump-house',3.3,3.55,side*1.9),.11,mat['weathered-plank'])
box('pump-house:engine-block',local('pump-house',-.75,1.18,0),(2.2,1.45,1.55),mat['rusted-steel'],.18)
for i in range(5):
    cylinder(f'pump-house:cooling-fin-{i+1}',local('pump-house',-.75,1.2,-.55+i*.27),.52,.09,mat['iron-dark'],16)
beam('pump-house:drive-shaft',local('pump-house',.35,1.30,-.5),local('pump-house',1.20,1.30,-.5),.14,mat['galvanised-tin'])
current_flywheel = torus('pump-house:flywheel',local('pump-house',1.25,1.30,-.5),.77,.105,mat['rusted-steel'])
current_flywheel.rotation_euler[0] = math.pi/2
for i in range(6):
    t=i*math.tau/6
    beam(f'pump-house:flywheel-spoke-{i+1}',local('pump-house',1.25,1.30,-.5),local('pump-house',1.25+math.cos(t)*.70,1.30+math.sin(t)*.70,-.5),.075,mat['galvanised-tin'])

# Close the back and sides while leaving the road-facing service side open.
before = set(bpy.context.scene.objects)
town.corrugated_sheet('pump-house:rear-wall',local('pump-house',0,2.05,2.75),6.2,3.45,mat,bent=.035)
parent_since(current,before)
for side in (-1,1):
    before = set(bpy.context.scene.objects)
    wall=town.corrugated_sheet(f'pump-house:side-wall-{side}',local('pump-house',side*3.0,2.05,.1),3.4,3.45,mat,bent=side*.025)
    wall.rotation_euler[2]=math.pi/2
    parent_since(current,before)
for part in [obj for obj in list(export_objects) if obj.name.startswith('pump-house:flywheel-spoke-')]:
    world = part.matrix_world.copy()
    part.parent = current_flywheel
    part.matrix_world = world
tube('pump-house:manifold', [local('pump-house',1.9,.75,1),local('pump-house',2.5,.75,1),local('pump-house',2.5,2.7,1)],.10,mat['galvanised-tin'])
cylinder('pump-house:exhaust',local('pump-house',-1.4,3.4,.4),.12,.95,mat['iron-dark'],12)
box('pump-house:salvage-door',local('pump-house',0,1.45,-3.12),(1.9,2.6,.12),mat['faded-hand-paint'],.04)
for i in range(8): box(f'pump-house:door-rivet-{i+1}',local('pump-house',-1.55+i%2*3.1,.55+(i//2)*.55,-3.20),(.10,.10,.06),mat['iron-dark'],.03)

# Treatment process: real stages laid left-to-right inside 31.5 x 23.5 m.
current = add_root('treatment-plant', OFFSETS['treatment-plant'])
plant_root = current

def stage_node(name):
    stage = bpy.data.objects.new(f'treatment-plant:{name}', None)
    bpy.context.collection.objects.link(stage)
    stage.parent = plant_root
    stage.matrix_parent_inverse = Matrix.Identity(4)
    return stage

current = stage_node('settle')
for x in (-14.2,14.2):
    for z in (-10.4,10.4): box(f'treatment-plant:footing-{x}-{z}',local('treatment-plant',x,.18,z),(.65,.36,.65),mat['salvaged-brick'])
# Settling basins: open concrete trough, visibly brown water and dividing baffles.
for i,x in enumerate((10.3,7.1)):
    box(f'treatment-plant:settle-floor-{i+1}',local('treatment-plant',x,.10,-2.0),(2.7,.20,7.6),mat['cracked-concrete'],.05)
    for side in (-1,1):
        box(f'treatment-plant:settle-long-wall-{i+1}-{side}',local('treatment-plant',x,.78,-2.0+side*3.65),(2.7,1.36,.30),mat['cracked-concrete'],.06)
        box(f'treatment-plant:settle-end-wall-{i+1}-{side}',local('treatment-plant',x+side*1.20,.78,-2.0),(.30,1.36,7.1),mat['cracked-concrete'],.06)
    box(f'treatment-plant:settle-water-{i+1}',local('treatment-plant',x,.72,-2.0),(2.25,.10,7.1),mat['dirty-water'],.02)
for z in (-5.5,-2.0,1.5): box(f'treatment-plant:settle-baffle-{z}',local('treatment-plant',8.7,1.12,z),(2.1,.48,.12),mat['cracked-concrete'],.03)
box('treatment-plant:settle-walkway',local('treatment-plant',8.7,1.9,-2.0),(6.9,.16,1.0),mat['weathered-plank'])
# Open sand filter bed: coarse sand fill, steel grate and real rim.
current = stage_node('filter')
box('treatment-plant:filter-floor',local('treatment-plant',1.8,.12,-2.0),(5.1,.24,7.4),mat['cracked-concrete'],.06)
for side in (-1,1):
    box(f'treatment-plant:filter-long-wall-{side}',local('treatment-plant',1.8+side*2.40,.77,-2.0),(.30,1.30,7.4),mat['rusted-steel'],.06)
    box(f'treatment-plant:filter-end-wall-{side}',local('treatment-plant',1.8,.77,-2.0+side*3.55),(5.1,1.30,.30),mat['rusted-steel'],.06)
box('treatment-plant:filter-sand',local('treatment-plant',1.8,1.25,-2.0),(4.45,.28,6.8),mat['filter-sand'],.06)
for i in range(8): beam(f'treatment-plant:filter-grate-{i+1}',local('treatment-plant',-.4,1.75,-5.1+i*.88),local('treatment-plant',4.0,1.75,-5.1+i*.88),.045,mat['iron-dark'])
# Riveted cylindrical boiler, banded and patched, with a high flue stack.
current = stage_node('boil')
cylinder('treatment-plant:boiler-shell',local('treatment-plant',-5.4,2.0,-2.0),2.25,3.6,mat['rusted-steel'],32)
for y in (.45,1.0,1.8,2.65,3.5): torus(f'treatment-plant:boiler-band-{y}',local('treatment-plant',-5.4,y,-2.0),2.27,.12,mat['galvanised-tin'])
for side in (-1,1):
    for row in range(4):
        theta=side*.52+row*math.pi/2
        beam(f'treatment-plant:boiler-patch-{side}-{row}',local('treatment-plant',-5.4+2.25*math.cos(theta),1.2+row*.48,-2.0+2.25*math.sin(theta)),local('treatment-plant',-5.4+2.25*math.cos(theta),1.2+row*.48,-1.7+2.25*math.sin(theta)),.14,mat['galvanised-tin'])
cylinder('treatment-plant:boiler-door',local('treatment-plant',-5.4,2.0,-4.29),.74,.12,mat['galvanised-tin'],24)
cylinder('treatment-plant:chimney',local('treatment-plant',-5.4,5.7,-2.0),.40,4.8,mat['iron-dark'],20)
torus('treatment-plant:chimney-collar',local('treatment-plant',-5.4,7.7,-2.0),.48,.10,mat['rusted-steel'])
# Covered clean tank with patchwork sloped canopy and bright handwheel tap.
current = stage_node('clean')
cylinder('treatment-plant:clean-tank',local('treatment-plant',-11.0,1.55,-2.0),2.5,2.9,mat['clean-water'],32)
for y in (.30,1.0,2.1,2.95): torus(f'treatment-plant:clean-tank-seam-{y}',local('treatment-plant',-11.0,y,-2.0),2.5,.09,mat['rusted-steel'])
for side in (-1,1):
    panel=box(f'treatment-plant:clean-cover-{side}',local('treatment-plant',-11.0,3.2,-2.0+side*.75),(5.7,.14,2.0),mat['galvanised-tin'],.04)
    panel.rotation_euler[0]=side*.16
beam('treatment-plant:clean-tap-post',local('treatment-plant',-13.7,1.45,-4.25),local('treatment-plant',-13.7,2.15,-4.25),.12,mat['galvanised-tin'])
beam('treatment-plant:clean-tap-spout',local('treatment-plant',-13.7,2.12,-4.25),local('treatment-plant',-14.3,2.12,-4.25),.10,mat['faded-hand-paint'])
for i in range(3):
    x=12.0-i*8.1
    tube(f'treatment-plant:process-pipe-{i+1}',[local('treatment-plant',x,2.25,2.3),local('treatment-plant',x,3.25,2.3),local('treatment-plant',x-8.1,3.25,2.3),local('treatment-plant',x-8.1,1.7,2.3)],.13,mat['rusted-steel'])
for i,x in enumerate((12.2,4.0,-4.2,-12.4)):
    current = plant_root
    beam(f'treatment-plant:pipe-saddle-{i}',local('treatment-plant',x,.25,2.3),local('treatment-plant',x,3.35,2.3),.065,mat['weathered-plank'])
for side in (-1,1):
    current = plant_root
    rx,rz=side*8.5,7.8
    for x in (-13,-4,5,13):
        beam(f'treatment-plant:roof-post-{side}-{x}',local('treatment-plant',x,.2,rz),local('treatment-plant',x,4.5,rz),.12,mat['weathered-plank'])
    # Two separate lean-to roof runs preserve daylight over each open process stage.
    for x in (-8.5,0.0,9.5):
        panel=box(f'treatment-plant:roof-salvage-{side}-{x}',local('treatment-plant',x,4.6,rz+side*.9),(8.8,.13,2.4),mat['galvanised-tin'],.04)
        panel.rotation_euler[0]=side*.18

# Lined reservoir basin, chunky uneven sandbag bank and dedicated water plane.
current = add_root('reservoir', OFFSETS['reservoir'])
box('reservoir:excavated-bed',local('reservoir',0,.15,0),(29,.28,27),mat['cracked-concrete'],.14)
box('reservoir:black-liner-floor',local('reservoir',0,.34,0),(25,.08,23),mat['iron-dark'],.08)
water = box('reservoir:water',local('reservoir',0,.56,0),(23,.035,21),mat['reservoir-water'],.01)
water['part'] = 'flat scoop surface'
for side in (-1,1):
    for i in range(35):
        x=-13.3+i*.78
        z=side*(13.4+(.08 if i%3==0 else 0))
        bag=low_sandbag(f'reservoir:sandbag-long-{side}-{i}',local('reservoir',x,.60,z),(1.2,.42,.58),mat['sandbag-canvas'])
        bag.rotation_euler[1]=(.035 if i%2 else -.04)
    for i in range(31):
        z=-12.1+i*.80;x=side*14.0
        bag=low_sandbag(f'reservoir:sandbag-end-{side}-{i}',local('reservoir',x,.60,z),(.58,.42,1.2),mat['sandbag-canvas'])
        bag.rotation_euler[2]=math.pi/2
for i in range(4):
    x=-1.2+i*.8
    beam(f'reservoir:pump-skid-{i}',local('reservoir',x,.75,-14.0),local('reservoir',x,1.0,-16.0),.13,mat['weathered-plank'])
box('reservoir:outlet-pump-body',local('reservoir',0,1.22,-14.7),(2.7,1.0,1.8),mat['rusted-steel'],.14)
for x in (-1.2,1.2): cylinder(f'reservoir:pump-gauge-{x}',local('reservoir',x,1.9,-14.72),.20,.14,mat['galvanised-tin'],16)
tube('reservoir:outlet-pipe',[local('reservoir',0,1.3,-14),local('reservoir',0,1.3,-11),local('reservoir',0,3.2,-11),local('reservoir',0,3.2,-8)],.18,mat['galvanised-tin'])

# Keep the authored family meshes intact. The earlier draft overlaid donor
# meshes at incompatible scales and deleted these fitted well, tank and pump
# shapes, leaving scattered parts that did not match the site reference.

# Mechanical child names are an explicit part of the card contract.
for obj in export_objects:
    if obj is root_node: continue
    if obj.parent is None: obj.parent = root_node
for name, root_obj in building_roots.items():
    root_obj.parent = root_node
    root_obj['footprint_cells'] = {'hand-well': '1x1', 'standpipe': '1x1','water-tower':'2x2',
        'pump-house':'2x2','treatment-plant':'4x3','reservoir':'4x4'}[name]

# Render-only sand staging pad and soft daylight. Neither enters the exported GLB.
ground = town.cube('render-only-sand-ground',(0,-.12,-1),(76,.20,66),mat['sand'],.02)
ground_mat = bpy.data.materials.new('render-only flat dusty ground')
ground_mat.diffuse_color = (.18,.17,.15,1)
ground_mat.use_nodes = True
ground_bsdf = ground_mat.node_tree.nodes.get('Principled BSDF')
ground_bsdf.inputs['Base Color'].default_value = (.18,.17,.15,1)
ground_bsdf.inputs['Roughness'].default_value = .96
ground.data.materials.clear(); ground.data.materials.append(ground_mat)
ground['render_only'] = True
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1200; scene.render.resolution_y = 780; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'; scene.render.film_transparent = False
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('bright overcast daylight')
scene.world.color = (.62,.62,.62)
light_data = bpy.data.lights.new('large overcast softbox', 'AREA'); light_data.energy = 24000; light_data.size = 44
light = bpy.data.objects.new('render-only soft daylight', light_data); bpy.context.collection.objects.link(light)
light.location = town.game_vector((-14,45,-12)); light.rotation_euler = (town.game_vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world.use_nodes = True; scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.70,.72,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
evidence.mkdir(parents=True, exist_ok=True)
def render_view(filename, location, target, lens=38):
    bpy.ops.object.camera_add(location=town.game_vector(location))
    camera = bpy.context.object; camera.data.lens = lens
    camera.rotation_euler = (town.game_vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera = camera; scene.render.filepath = str(evidence/filename); bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
render_view('above-45.png',(35,52,-46),(0,2,0),48)
render_view('driver-seat.png',(1,1.65,-31),(0,4,7),40)
centers = {
    'hand-well': (0,1.3,0, (7,7,-9), 48),
    'standpipe': (0,1.2,0, (1,5,-9), 48),
    'water-tower': (0,8,0, (15,23,-18), 30),
    'pump-house': (0,1.8,0, (9,7,-12), 38),
    'treatment-plant': (0,2,0, (0,28,-28), 35),
    'reservoir': (0,0,0, (18,22,-23), 42),
}
def set_tree_render(obj, visible):
    obj.hide_render = not visible
    for child in obj.children: set_tree_render(child, visible)
for ident, (tx,ty,tz, camera, lens) in centers.items():
    for name, building in building_roots.items(): set_tree_render(building, name == ident)
    ox,oy,oz = OFFSETS[ident]
    render_view(f'{ident}-detail.png',(ox+camera[0],oy+camera[1],oz+camera[2]),
                (ox+tx,oy+ty,oz+tz),lens)
for building in building_roots.values(): set_tree_render(building, True)
# Remove render-only meshes, camera and light before producing the single runtime family file.
bpy.data.objects.remove(ground,do_unlink=True)
bpy.data.objects.remove(light,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')

def descendants(parent):
    result=[]
    for child in parent.children:
        result.append(child)
        result.extend(descendants(child))
    return result

movable_names = {'water-tower:fill-1','water-tower:fill-2','water-tower:fill-3',
                 'pump-house:flywheel','reservoir:water'}
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH' or obj.parent is not None: continue
    family = obj.name.split(':')[0]
    if family in building_roots: keep(obj,building_roots[family])

def join_meshes(meshes, name):
    if len(meshes) < 2:
        if meshes: meshes[0].name = name
        return
    for obj in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True);bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers):
            if modifier.type == 'BEVEL' and max(obj.dimensions) >= 1.5:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            else:
                obj.modifiers.remove(modifier)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes: obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    bpy.context.view_layer.objects.active.name = name

for family, building in building_roots.items():
    all_meshes = [obj for obj in descendants(building) if obj.type == 'MESH']
    skipped = set()
    for obj in all_meshes:
        ancestor = obj
        while ancestor is not None and ancestor.name not in movable_names:
            ancestor = ancestor.parent
        if ancestor is not None:
            skipped.add(obj)
    stage_roots = [obj for obj in descendants(building) if obj.name in {
        'treatment-plant:settle','treatment-plant:filter','treatment-plant:boil','treatment-plant:clean'}]
    grouped = set()
    for stage in stage_roots:
        meshes = [obj for obj in descendants(stage) if obj.type == 'MESH' and obj not in skipped]
        join_meshes(meshes,f'{stage.name}:geometry')
        grouped.update(meshes)
    static = [obj for obj in all_meshes if obj not in skipped and obj not in grouped]
    join_meshes(static,f'{family}:structure')

blend.parent.mkdir(parents=True,exist_ok=True); out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)
