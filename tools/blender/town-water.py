"""Waterworks buildings built from real desert utility structures and photos."""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--round', type=int, default=4)
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
if a.round != 4:
    p.error('this card submits round 4 only')
evidence = root / '.evidence/2026-11-06/town-art-water/round-4'
out = root / 'public/assets/models/wasteland/town/water.glb'
blend = root / 'art-build/town/water.blend'
sheet = root / 'docs/board/looks/town-art-water/round-4.jpg'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)
import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
materials = town.make_materials({
    'weathered-plank': root / 'public/assets/models/wasteland/town/textures/town-water-timber.jpg',
    'galvanised-tin': root / 'public/assets/models/wasteland/town/textures/town-water-corrugated.jpg',
    'rusted-steel': root / 'public/assets/models/wasteland/town/textures/town-water-tin.jpg',
    'cracked-concrete': root / 'public/assets/models/wasteland/town/textures/town-water-concrete.jpg',
    'sand': root / 'public/assets/models/wasteland/town/textures/town-water-earth.jpg',
})
mat = materials
# Tower framing gets a separate darkened copy; the well keeps its round-3 wood.
dark_timber = mat['weathered-plank'].copy()
dark_timber.name = 'Town / dark structural water-tower timber'
dark_timber_image = mat['weathered-plank'].node_tree.nodes.get('Image Texture').image.copy()
dark_timber_image.name = 'Town tile / dark structural timber'
dark_timber_pixels = __import__('numpy').empty(len(dark_timber_image.pixels), dtype='float32')
dark_timber_image.pixels.foreach_get(dark_timber_pixels)
dark_timber_pixels[0::4] *= .56; dark_timber_pixels[1::4] *= .50; dark_timber_pixels[2::4] *= .43
dark_timber_image.pixels.foreach_set(dark_timber_pixels); dark_timber_image.pack()
dark_timber.node_tree.nodes.get('Image Texture').image = dark_timber_image
# Keep one sharp tin photo for both galvanized sheets and worn steel fittings.
rust_material = mat['rusted-steel']
rust_image = bpy.data.images.load(str(root / 'public/assets/models/wasteland/town/textures/town-water-tin.jpg'), check_existing=False)
rust_pixels = __import__('numpy').empty(len(rust_image.pixels), dtype='float32')
rust_image.pixels.foreach_get(rust_pixels)
rust_pixels[0::4] *= .62; rust_pixels[1::4] *= .43; rust_pixels[2::4] *= .30
rust_image.pixels.foreach_set(rust_pixels)
rust_image.file_format = 'JPEG'; rust_image.pack()
rust_nodes = rust_material.node_tree.nodes
rust_tex = rust_nodes.new('ShaderNodeTexImage'); rust_tex.image = rust_image; rust_tex.extension = 'REPEAT'
rust_bsdf = rust_nodes.get('Principled BSDF')
rust_material.node_tree.links.new(rust_tex.outputs['Color'], rust_bsdf.inputs['Base Color'])
rust_bsdf.inputs['Metallic'].default_value = .25

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
mat['reservoir-water'] = solid('Town / dark reservoir water',(.035,.065,.055),.18,.08)
water_image = bpy.data.images.load(str(root / 'public/assets/models/wasteland/town/textures/town-water.jpg'), check_existing=False)
water_image.scale(512,512)
water_pixels = __import__('numpy').empty(len(water_image.pixels), dtype='float32')
water_image.pixels.foreach_get(water_pixels)
water_pixels[0::4] *= .48; water_pixels[1::4] *= .47; water_pixels[2::4] *= .43
water_image.pixels.foreach_set(water_pixels)
water_image.file_format = 'JPEG'; water_image.pack()
water_nodes = mat['reservoir-water'].node_tree.nodes
water_tex = water_nodes.new('ShaderNodeTexImage'); water_tex.image = water_image; water_tex.extension = 'REPEAT'
mat['reservoir-water'].node_tree.links.new(water_tex.outputs['Color'], water_nodes.get('Principled BSDF').inputs['Base Color'])
mat['dirty-water'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .08
mat['filter-sand'] = solid('Town / pale filter sand',(.56,.44,.27),.92)
mat['clean-water'] = rust_material.copy()
mat['clean-water'].name='Town / faded painted steel with rust'
mat['clean-water'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.74
mat['chalk-stone'] = materials['cracked-concrete']
mat['well-stone-light'] = materials['salvaged-brick']
mat['sandbag-canvas'] = solid('Town / sandbag canvas',(.43,.35,.25),.96)
# The rendered game has no reliable environment reflections; keep metal subdued.
for material in bpy.data.materials:
    bsdf = material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
    if bsdf and bsdf.inputs.get('Metallic'):
        # Stay just below the 0.3 budget so glTF's float32 write cannot round
        # the value slightly over the test boundary.
        bsdf.inputs['Metallic'].default_value = min(bsdf.inputs['Metallic'].default_value, .29)
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
    # Bake local rotation and scale into vertices before parenting. This keeps
    # splayed braces, pitched roof sheets, and tilted parts stable in glTF.
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
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
beam('hand-well:crank-shaft',local('hand-well',-1.4,2.78,-.38),local('hand-well',1.4,2.78,-.38),.14,mat['weathered-plank'])
torus('hand-well:crank-wheel',local('hand-well',-1.47,2.78,-.38),.27,.065,mat['iron-dark'])
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
for i,x in enumerate((-1.18,-.52,.14),1):
    z=-1.26-(i%2)*.08
    box(f'standpipe:jerrycan-{i}',local('standpipe',x,.43,z),(.50,.76,.32),mat['faded-hand-paint'],.08)
    beam(f'standpipe:jerrycan-handle-left-{i}',local('standpipe',x-.12,.79,z),local('standpipe',x-.12,.97,z),.045,mat['iron-dark'])
    beam(f'standpipe:jerrycan-handle-right-{i}',local('standpipe',x+.12,.79,z),local('standpipe',x+.12,.97,z),.045,mat['iron-dark'])
    beam(f'standpipe:jerrycan-handle-top-{i}',local('standpipe',x-.12,.97,z),local('standpipe',x+.12,.97,z),.045,mat['iron-dark'])
    cylinder(f'standpipe:jerrycan-cap-{i}',local('standpipe',x+.12,.85,z),.08,.09,mat['rusted-steel'],10)

# Eight-metre timber legs carry a 3.5 m riveted steel tank above the yard.
current = add_root('water-tower', OFFSETS['water-tower'])
base_half, top_half = 2.85, 2.05
platform_y, roof_y = 8.0, 11.72
# Four heavy 280 mm square splayed timber posts.
for sx in (-1,1):
    for sz in (-1,1):
        beam(f'water-tower:leg-{sx}-{sz}',
             local('water-tower',sx*base_half,.10,sz*base_half),
             local('water-tower',sx*top_half,platform_y,sz*top_half),.28,dark_timber)
# Two complete X-braced storeys on all four faces.
for low, high in ((.24,4.0),(4.0,7.82)):
    for side in (-1,1):
        z=side*base_half
        beam(f'water-tower:brace-front-a-{low}',local('water-tower',-base_half,low,z),local('water-tower',base_half,high,z),.25,dark_timber)
        beam(f'water-tower:brace-front-b-{low}',local('water-tower',base_half,low,z),local('water-tower',-base_half,high,z),.25,dark_timber)
        x=side*base_half
        beam(f'water-tower:brace-side-a-{low}',local('water-tower',x,low,-base_half),local('water-tower',x,high,base_half),.25,dark_timber)
        beam(f'water-tower:brace-side-b-{low}',local('water-tower',x,low,base_half),local('water-tower',x,high,-base_half),.25,dark_timber)
# Plank deck and perimeter rail, joined to the four post heads.
for i in range(9):
    x=-2.15+i*.54
    box(f'water-tower:platform-plank-{i+1}',local('water-tower',x,platform_y,0),(.51,.30,5.5),dark_timber,.025)
for z in (-2.7,2.7):
    beam(f'water-tower:platform-girder-{z}',local('water-tower',-2.25,7.88,z),local('water-tower',2.25,7.88,z),.16,mat['rusted-steel'])
# Dark iron through-bolts make the timber joints read as load-bearing.
for y in (.35,3.94,4.12,7.72):
    for sx in (-1,1):
        box(f'water-tower:joint-bolt-front-{y}-{sx}',local('water-tower',sx*2.8,y,-2.99),(.10,.10,.05),mat['iron-dark'],.005)
        box(f'water-tower:joint-bolt-back-{y}-{sx}',local('water-tower',sx*2.8,y,2.99),(.10,.10,.05),mat['iron-dark'],.005)
# Riveted 3.5 m diameter cylindrical tank, 2.25 m high, with a low conical cap.
cylinder('water-tower:main-tank',local('water-tower',0,9.30,0),1.75,2.35,mat['rusted-steel'],40)
torus('water-tower:lower-tank-seam',local('water-tower',0,8.22,0),1.75,.055,mat['rusted-steel'])
torus('water-tower:upper-tank-seam',local('water-tower',0,10.37,0),1.75,.055,mat['rusted-steel'])
bpy.ops.mesh.primitive_cone_add(vertices=40,radius1=1.80,radius2=.08,depth=.92,location=town.game_vector(local('water-tower',0,10.93,0)))
roof=bpy.context.object;roof.name='water-tower:conical-roof';roof.data.materials.append(mat['rusted-steel']);keep(roof,current)
torus('water-tower:roof-eave-rim',local('water-tower',0,10.48,0),1.80,.07,mat['galvanised-tin'])
# Sparse real fasteners on each visible tank seam. Three per row keep the
# riveted construction readable without spending the tower budget on spheres.
for row,y in enumerate((8.35,9.05,9.75,10.35)):
    for i in range(3):
        angle=math.pi*.22+i*math.pi*.28
        for side in (-1,1):
            x=1.765*math.sin(angle); z=side*1.765*math.cos(angle)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=.027,location=town.game_vector(local('water-tower',x,y,z)))
            rivet=bpy.context.object;rivet.name=f'water-tower:rivet-{row}-{i}-{side}';rivet.scale=(1,1,.45);rivet.data.materials.append(mat['iron-dark']);keep(rivet,current)
# Three named fill indicators on the tank's road-facing wall.
for i,y in enumerate((8.72,9.42,10.12),1):
    fill=box(f'water-tower:fill-{i}',local('water-tower',0,y,-1.79),(.48,.11,.035),mat['faded-hand-paint'],.025)
    fill['part']='fill-level indicator'
box('water-tower:level-window',local('water-tower',0,9.30,-1.80),(.20,1.65,.04),mat['dirty-glass'],.025)
# The fixed ladder reaches from the ground, across the platform, and up the tank.
for x in (-.42,.42):
    beam(f'water-tower:ladder-lower-rail-{x}',local('water-tower',x,.10,-2.96),local('water-tower',x,8.30,-2.96),.065,mat['iron-dark'])
    beam(f'water-tower:ladder-transition-{x}',local('water-tower',x,8.30,-2.96),local('water-tower',x,8.68,-1.77),.065,mat['iron-dark'])
    beam(f'water-tower:ladder-upper-rail-{x}',local('water-tower',x,8.68,-1.77),local('water-tower',x,11.70,-1.77),.065,mat['iron-dark'])
for i in range(37):
    y=.30+i*.31
    z=-2.96 if y < 8.34 else -1.77
    beam(f'water-tower:ladder-rung-{i+1}',local('water-tower',-.42,y,z),local('water-tower',.42,y,z),.045,mat['iron-dark'])
# Downpipe starts at the tank outlet, follows the outside of a leg and reaches ground.
tube('water-tower:outlet-pipe',[local('water-tower',1.10,8.22,0),local('water-tower',2.50,7.95,0),local('water-tower',2.72,4.0,0),local('water-tower',2.90,.18,0)],.095,mat['iron-dark'])

# Salvage engine pump inside a squat corrugated shed; the flywheel is its own moving part.
current = add_root('pump-house', OFFSETS['pump-house'])
box('pump-house:raised-slab',local('pump-house',0,.16,0),(7.0,.3,6.4),mat['cracked-concrete'])
for x in (-3.0,3.0):
    for z in (-2.7,2.7): beam(f'pump-house:post-{x}-{z}',local('pump-house',x,.3,z),local('pump-house',x,3.8,z),.16,mat['rusted-steel'])
# One overhanging, fine-rib roof keeps the shed open and the engine visible.
before = set(bpy.context.scene.objects)
roof = town.corrugated_sheet('pump-house:overhanging-tin-roof',local('pump-house',0,4.0,0),7.5,7.0,mat,bent=.025)
roof.rotation_euler[0] = math.pi/2
parent_since(current,before)
for side in (-1,1):
    beam(f'pump-house:roof-purlin-{side}',local('pump-house',-3.4,3.65,side*2.65),local('pump-house',3.4,3.65,side*2.65),.15,dark_timber)
box('pump-house:engine-block',local('pump-house',-.75,1.18,-1.35),(2.2,1.45,1.55),mat['iron-dark'],.18)
for i in range(5):
    cylinder(f'pump-house:cooling-fin-{i+1}',local('pump-house',-.75,1.2,-1.90+i*.27),.52,.09,mat['iron-dark'],16)
beam('pump-house:drive-shaft',local('pump-house',.35,1.30,-1.85),local('pump-house',1.20,1.30,-1.85),.14,mat['galvanised-tin'])
current_flywheel = torus('pump-house:flywheel',local('pump-house',1.25,1.30,-1.85),.77,.105,mat['rusted-steel'])
current_flywheel.rotation_euler[0] = math.pi/2
for i in range(6):
    t=i*math.tau/6
    beam(f'pump-house:flywheel-spoke-{i+1}',local('pump-house',1.25,1.30,-1.85),local('pump-house',1.25+math.cos(t)*.70,1.30+math.sin(t)*.70,-1.85),.075,mat['galvanised-tin'])

# Four corrugated walls and a pitched, two-plane roof. The wide open doorway
# makes the diesel engine, flywheel and shaft readable from the road.
before = set(bpy.context.scene.objects)
town.corrugated_sheet('pump-house:rear-wall',local('pump-house',0,2.05,2.75),6.2,3.45,mat,bent=.035)
parent_since(current,before)
for side in (-1,1):
    before = set(bpy.context.scene.objects)
    wall=town.corrugated_sheet(f'pump-house:side-wall-{side}',local('pump-house',side*3.0,2.05,.1),3.4,3.45,mat,bent=side*.025)
    wall.rotation_euler[2]=math.pi/2
    parent_since(current,before)
beam('pump-house:door-header',local('pump-house',-1.25,3.85,-2.78),local('pump-house',1.25,3.85,-2.78),.18,mat['weathered-plank'])
for side in (-1,1):
    beam(f'pump-house:door-jamb-{side}',local('pump-house',side*1.25,.3,-2.78),local('pump-house',side*1.25,3.85,-2.78),.16,mat['weathered-plank'])
for part in [obj for obj in list(export_objects) if obj.name.startswith('pump-house:flywheel-spoke-')]:
    world = part.matrix_world.copy()
    part.parent = current_flywheel
    part.matrix_world = world
tube('pump-house:manifold', [local('pump-house',1.9,.75,1),local('pump-house',2.5,.75,1),local('pump-house',2.5,2.7,1)],.10,mat['galvanised-tin'])
cylinder('pump-house:exhaust',local('pump-house',-1.4,3.4,.4),.12,.95,mat['iron-dark'],12)
box('pump-house:engine-fuel-tank',local('pump-house',-.8,2.12,-1.10),(1.5,.45,.8),mat['faded-hand-paint'],.12)
# A low uneven sandbag course carries the pump shed above dusty runoff.
for i in range(7):
    for side in (-1,1):
        bag=low_sandbag(f'pump-house:base-sandbag-{i}-{side}',local('pump-house',-2.65+i*.88,.39,side*2.5),(.92,.50,.68),mat['sandbag-canvas'])
        bag.rotation_euler[1]=(.035 if i%2 else -.04)
for i in range(3):
    bag=low_sandbag(f'pump-house:front-sandbag-{i}',local('pump-house',-1.2+i*1.2,.38,-2.92),(.95,.48,.42),mat['sandbag-canvas'])
box('pump-house:engine-cylinder-head',local('pump-house',-.75,2.0,-1.45),(1.35,.42,1.15),mat['rusted-steel'],.10)
for i in range(3):
    tube(f'pump-house:engine-fuel-line-{i}',[local('pump-house',-.5+i*.38,2.18,-.9),local('pump-house',-.5+i*.38,2.48,-.55),local('pump-house',-.5+i*.38,2.15,-.2)],.035,mat['galvanised-tin'])

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
    tube(f'treatment-plant:process-pipe-{i+1}',[local('treatment-plant',x,2.25,2.3),local('treatment-plant',x,3.25,2.3),local('treatment-plant',x-8.1,3.25,2.3),local('treatment-plant',x-8.1,1.7,2.3)],.21,mat['rusted-steel'])
for i,x in enumerate((12.2,4.0,-4.2,-12.4)):
    current = plant_root
    beam(f'treatment-plant:pipe-saddle-{i}',local('treatment-plant',x,.25,2.3),local('treatment-plant',x,3.35,2.3),.065,mat['weathered-plank'])
for side in (-1,1):
    current = plant_root
    rx,rz=side*8.5,7.8
    for x in (-13,-4,5,13):
        beam(f'treatment-plant:roof-post-{side}-{x}',local('treatment-plant',x,.2,rz),local('treatment-plant',x,3.35,rz),.18,dark_timber)
    # Two separate lean-to roof runs preserve daylight over each open process stage.
    for x in (-8.5,0.0,9.5):
        panel=box(f'treatment-plant:roof-salvage-{side}-{x}',local('treatment-plant',x,3.48,rz+side*.9),(8.8,.20,2.4),mat['rusted-steel'],.04)
        panel.rotation_euler[0]=side*.18

# Dug reservoir: irregular outer bank, exposed sloping earth and low water.
current = add_root('reservoir', OFFSETS['reservoir'])
def bank_point(index, count, rx, rz, y, phase=0.0):
    angle=math.tau*index/count+phase
    wobble=1+.055*math.sin(3*angle+.4)+.032*math.sin(7*angle+1.1)+.018*math.sin(11*angle)
    return (rx*wobble*math.cos(angle),y+.045*math.sin(5*angle),rz*wobble*math.sin(angle))
def make_ring(name, rings, material):
    count=48; verts=[]; faces=[]
    for rx,rz,y,phase in rings:
        verts.extend(town.game_vector(bank_point(i,count,rx,rz,y,phase)) for i in range(count))
    for ring in range(len(rings)-1):
        for i in range(count):
            a=ring*count+i;b=ring*count+(i+1)%count
            c=(ring+1)*count+(i+1)%count;d=(ring+1)*count+i
            faces.append((d,c,b,a))
    mesh=bpy.data.meshes.new(name+' irregular sloped earth');mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        for loop in polygon.loop_indices:
            co=verts[mesh.loops[loop].vertex_index]
            uv.data[loop].uv=(co.x/2,co.y/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
    obj.location=town.game_vector(OFFSETS['reservoir'])
    return keep(obj,current)
make_ring('reservoir:eroded-outer-bank',[(14.5,13.8,.08,0),(13.7,13.0,.82,.025),(10.8,10.1,.30,.04)],mat['sand'])
count=48; water_verts=[town.game_vector((0,.30,0))]
water_verts.extend(town.game_vector(bank_point(i,count,10.75,10.0,.30,.04)) for i in range(count))
water_faces=[(0,1+(i+1)%count,1+i) for i in range(count)]
water_mesh=bpy.data.meshes.new('reservoir dark water irregular shore');water_mesh.from_pydata(water_verts,[],water_faces);water_mesh.update()
water_uv=water_mesh.uv_layers.new(name='UVMap')
for polygon in water_mesh.polygons:
    for loop in polygon.loop_indices:
        co=water_verts[water_mesh.loops[loop].vertex_index]
        water_uv.data[loop].uv=(co.x/2,co.y/2)
water_obj=bpy.data.objects.new('reservoir:water',water_mesh);bpy.context.collection.objects.link(water_obj);water_obj.data.materials.append(mat['reservoir-water']);water_obj.location=town.game_vector(OFFSETS['reservoir']);keep(water_obj,current)
water_obj['part']='flat scoop surface below the bank'
for i in range(48):
    x,y,z=bank_point(i,48,12.0,11.2,.49,.04)
    bag=low_sandbag(f'reservoir:sandbag-bank-{i+1}',local('reservoir',x,y,z),(.95,.42,.62),mat['sandbag-canvas'])
    bag.rotation_euler[1]=.08*math.sin(i*2.1);bag.rotation_euler[2]=math.tau*i/48
for i in range(4):
    x=-1.2+i*.8
    beam(f'reservoir:pump-skid-{i}',local('reservoir',x,.45,-12.5),local('reservoir',x,.62,-14.1),.13,mat['weathered-plank'])
box('reservoir:outlet-pump-body',local('reservoir',0,.82,-13.2),(2.7,1.0,1.8),mat['rusted-steel'],.14)
for x in (-1.2,1.2): cylinder(f'reservoir:pump-gauge-{x}',local('reservoir',x,1.50,-13.22),.20,.14,mat['galvanised-tin'],16)
tube('reservoir:outlet-pipe',[local('reservoir',0,.42,-9.7),local('reservoir',0,.62,-11.5),local('reservoir',0,.82,-12.4)],.20,mat['galvanised-tin'])

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
render_view('driver-seat.png',(1,1.65,-31),(15,8,-9),20)
centers = {
    'hand-well': (0,1.7,0, (7,7,-9), 48),
    'standpipe': (0,1.7,0, (1,5,-9), 38),
    'water-tower': (0,8,0, (15,23,-18), 30),
    'pump-house': (0,2.0,0, (9,8,-12), 32),
    'treatment-plant': (0,2.5,0, (0,28,-28), 46),
    'reservoir': (0,0,-2, (30,27,-34), 31),
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
        layers = obj.data.uv_layers
        if not layers:
            layer = layers.new(name='UVMap')
            for polygon in obj.data.polygons:
                for loop_index in polygon.loop_indices:
                    vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
                    layer.data[loop_index].uv = (vertex.x / 2, vertex.y / 2)
        else:
            active = layers.active or layers[0]
            for layer in list(layers):
                if layer != active: layers.remove(layer)
            active.name = 'UVMap'
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

# The review renders deliberately come from a fresh scene that imports the
# exported GLB. This catches glTF material and axis changes before submission.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1120; scene.render.resolution_y=760; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('plain bright overcast')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.76,.77,.77,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
ground_mat=bpy.data.materials.new('render only mid-brown ground'); ground_mat.diffuse_color=(.20,.17,.13,1); ground_mat.use_nodes=True
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.20,.17,.13,1)
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.96
bpy.ops.mesh.primitive_plane_add(size=170,location=(0,0,-.12)); ground=bpy.context.object; ground.name='render-only ground'; ground.data.materials.append(ground_mat)
light_data=bpy.data.lights.new('soft overcast','AREA'); light_data.energy=18000; light_data.size=48
light=bpy.data.objects.new('render-only overcast light',light_data); scene.collection.objects.link(light)
light.location=(24,-35,48); light.rotation_euler=(Vector((0,0,4))-light.location).to_track_quat('-Z','Y').to_euler()
roots={}
for obj in scene.objects:
    if obj.name in ('hand-well','standpipe','water-tower','pump-house','treatment-plant','reservoir'): roots[obj.name]=obj
def hide_tree(obj, hide):
    obj.hide_render=hide
    for child in obj.children: hide_tree(child,hide)
def render_camera(filename,position,target,lens=42):
    bpy.ops.object.camera_add(location=town.game_vector(position)); camera=bpy.context.object
    camera.data.lens=lens; camera.rotation_euler=(town.game_vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=camera; scene.render.filepath=str(evidence/filename); bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera,do_unlink=True)
for name,obj in roots.items(): hide_tree(obj,name!='water-tower')
render_camera('water-tower-photo-angle.png',
    (OFFSETS['water-tower'][0]+9,6.5,OFFSETS['water-tower'][2]-12),
    (OFFSETS['water-tower'][0],5.6,OFFSETS['water-tower'][2]),25)
for obj in roots.values(): hide_tree(obj,False)
scene.render.resolution_x=1700; scene.render.resolution_y=950
render_camera('site-mayor.png',(40,69,54),(-4,4,0),55)
scene.render.resolution_x=1120; scene.render.resolution_y=760
render_camera('site-road.png',(8,1.65,-28),(12,5,-9),30)
for ident,base,above_lens in [
 ('hand-well',OFFSETS['hand-well'],52),('standpipe',OFFSETS['standpipe'],52),
 ('water-tower',OFFSETS['water-tower'],47),('pump-house',OFFSETS['pump-house'],45),
 ('treatment-plant',OFFSETS['treatment-plant'],27),('reservoir',OFFSETS['reservoir'],32)]:
    for name,obj in roots.items(): hide_tree(obj,name!=ident)
    span=8 if ident in ('hand-well','standpipe') else 15 if ident in ('water-tower','pump-house') else 29
    if ident=='reservoir':
        render_camera(f'{ident}-mayor.png',(base[0]+30,base[1]+27,base[2]-34),(base[0],base[1],base[2]-2),31)
    else:
        render_camera(f'{ident}-mayor.png',(base[0]+span,base[1]+span*.9,base[2]-span),(base[0],base[1]+(5.3 if ident=='water-tower' else 2),base[2]),above_lens)
    render_camera(f'{ident}-road.png',(base[0]+.4,base[1]+1.7,base[2]-span),(base[0],base[1]+(4.8 if ident=='water-tower' else 2.2),base[2]),30 if span>12 else 43)
for obj in roots.values(): hide_tree(obj,False)
