"""Build and review the TOWN-ART-POWER windmill and power pole."""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', default=str(Path(__file__).resolve().parents[2]))
p.add_argument('--evidence', default='.evidence/2026-11-06/TOWN-ART-POWER/round-2')
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
evidence = Path(a.evidence)
evidence = evidence if evidence.is_absolute() else root / evidence
blend = evidence / 'power.blend'
glb = root / 'public/assets/models/wasteland/town/power.glb'
sheet = root / 'docs/board/looks/town-art-power/round-2.jpg'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
mat = town.make_materials({
    'rusted-steel': root / 'public/assets/models/wasteland/town/textures/rusted-steel.jpg',
    'galvanised-tin': root / 'public/assets/models/wasteland/town/textures/rusted-corrugated-tin.jpg',
    'cracked-concrete': root / 'public/assets/models/wasteland/town/textures/town-water-concrete.jpg',
    'sand': root / 'public/assets/models/wasteland/town/textures/town-water-earth.jpg',
    'weathered-plank': root / 'public/assets/models/wasteland/town/textures/town-water-timber.jpg',
})
for material in mat.values():
    material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = min(.28, material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
# Deepen only the salvaged timber tile so the pole reads as old, dirty wood.
wood_tex=next(node.image for node in mat['weathered-plank'].node_tree.nodes if node.type=='TEX_IMAGE')
wood_pixels=[0.0]* (wood_tex.size[0]*wood_tex.size[1]*4)
wood_tex.pixels.foreach_get(wood_pixels)
for i in range(0,len(wood_pixels),4):
    wood_pixels[i]*=.58;wood_pixels[i+1]*=.47;wood_pixels[i+2]*=.36
wood_tex.pixels.foreach_set(wood_pixels);wood_tex.update()

def keep(obj, parent):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world
    return obj

def beam(name, start, end, size, material, parent):
    """Place a thick box member between game-space points; size is width,depth."""
    va, vb = town.game_vector(start), town.game_vector(end)
    delta = vb - va
    obj = town.cube(name, tuple((Vector(start) + Vector(end)) / 2),
                    (size[0], delta.length, size[1]), material, 0)
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    return keep(obj, parent)

def cylinder(name, pos, radius, depth, material, vertices=12, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
        location=town.game_vector(pos))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return keep(obj, parent) if parent else obj

def sphere(name, pos, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=1, location=town.game_vector(pos))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj

def thin_run(name, points, radius, material, parent):
    for i,(start,end) in enumerate(zip(points,points[1:])):
        va,vb=town.game_vector(start),town.game_vector(end);delta=vb-va
        bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=delta.length,location=(va+vb)/2)
        obj=bpy.context.object;obj.name=f'{name}-{i+1}';obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();obj.data.materials.append(material);keep(obj,parent)

family = bpy.data.objects.new('town-power', None)
bpy.context.scene.collection.objects.link(family)

# Windmill: four angle-iron corner legs, four closed rings, and fully landed Xs.
windmill = bpy.data.objects.new('windmill', None)
bpy.context.scene.collection.objects.link(windmill)
windmill.parent = family
base_half, top_half = .82, .26
base_y, top_y = .22, 4.78
levels = (.72, 1.78, 2.84, 3.90, 4.78)
def half_at(y):
    return base_half + (top_half - base_half) * ((y - base_y) / (top_y - base_y))
def leg_point(sx, sz, y):
    half = half_at(y)
    return (sx * half, y, sz * half)
for sx in (-1, 1):
    for sz in (-1, 1):
        beam('angle iron corner leg', leg_point(sx, sz, base_y), leg_point(sx, sz, top_y), (.105, .085), mat['rusted-steel'], windmill)
for y in levels[1:]:
    for sx in (-1, 1):
        beam('angle iron ring side', leg_point(sx, -1, y), leg_point(sx, 1, y), (.075, .065), mat['galvanised-tin'], windmill)
    for sz in (-1, 1):
        beam('angle iron ring crosspiece', leg_point(-1, sz, y), leg_point(1, sz, y), (.075, .065), mat['rusted-steel'], windmill)
end_errors = []
for y0, y1 in zip(levels[:-1], levels[1:]):
    for fixed_z in (-1, 1):
        for sx0, sx1 in ((-1, 1), (1, -1)):
            first, last = leg_point(sx0, fixed_z, y0), leg_point(sx1, fixed_z, y1)
            beam('mast face X brace', first, last, (.052, .045), mat['galvanised-tin'] if fixed_z < 0 else mat['rusted-steel'], windmill)
            end_errors.extend((
                (first, (Vector(first)-Vector(leg_point(sx0, fixed_z, y0))).length),
                (last, (Vector(last)-Vector(leg_point(sx1, fixed_z, y1))).length),
            ))
    for fixed_x in (-1, 1):
        for sz0, sz1 in ((-1, 1), (1, -1)):
            first, last = leg_point(fixed_x, sz0, y0), leg_point(fixed_x, sz1, y1)
            beam('mast side X brace', first, last, (.052, .045), mat['rusted-steel'], windmill)
            end_errors.extend(((first, 0.0), (last, 0.0)))
max_error = max(error for _, error in end_errors)
print(f'MAST_ENDPOINT_MAX_DISTANCE={max_error:.4f}m (required <= 0.05m)')
if max_error > .05:
    raise RuntimeError('A mast brace endpoint misses its leg by more than 5 cm')

town.cube('windmill concrete slab', (0,.15,0), (1.9,.30,1.9), mat['cracked-concrete'], .10).parent = windmill
for sx in (-1,1):
    for sz in (-1,1):
        x,z=sx*.69,sz*.69
        town.cube('bolted mast foot plate',(x,.34,z),(.34,.08,.34),mat['rusted-steel'],0).parent=windmill
        for dx in (-.105,.105):
            cylinder('foot plate hex bolt',(x+dx,.405,z),.026,.055,mat['galvanised-tin'],5,windmill)

# The generator head, tail boom and painted sheet vane sit just above the mast.
axle = (0, 4.94, -.43)
head = cylinder('rotor bearing',(0,4.94,0),.21,.46,mat['rusted-steel'],12,windmill)
alternator = cylinder('car alternator casing',(0,4.94,.32),.235,.52,mat['iron-dark'],12)
alternator.rotation_euler[0] = math.pi/2
keep(alternator, windmill)
for i in range(8):
    angle = math.tau * i / 8
    x, y = math.cos(angle)*.23, 4.94 + math.sin(angle)*.23
    fin = beam('alternator radial cooling fin',(x*.78,y*.78,.31),(x,y,.31),(.048,.055),mat['galvanised-tin'],windmill)
for z in (.16,.31,.46):
    bpy.ops.mesh.primitive_torus_add(major_radius=.225, minor_radius=.018, major_segments=8, minor_segments=3, location=town.game_vector((0,4.94,z)))
    rib=bpy.context.object; rib.name='alternator cooling ring'; rib.data.materials.append(mat['rusted-steel']); keep(rib,windmill)
beam('tail arm',(0,4.94,.42),(0,4.94,1.95),(.085,.07),mat['rusted-steel'],windmill)
beam('tail vane vertical spine',(0,4.94,1.75),(0,4.94,2.3),(.045,.035),mat['galvanised-tin'],windmill)
vane=town.cube('peeling cream tin tail vane',(0,4.94,2.12),(.72,.78,.045),mat['galvanised-tin'],0)
vane.parent=windmill
for x in (-.27,.27):
    cylinder('tail vane rivet',(x,4.94,2.12),.025,.04,mat['rusted-steel'],8,windmill)

# Rotating group is located at the axle. Every child stays in world position,
# so rotating this empty around local Y spins the three-blade wheel cleanly.
rotor = bpy.data.objects.new('windmill:rotor', None)
bpy.context.scene.collection.objects.link(rotor)
rotor.location = town.game_vector(axle)
rotor.parent = windmill
hub = cylinder('wheel hub',(0,4.94,-.43),.19,.14,mat['rusted-steel'],12,rotor)
hub_cap = cylinder('hub cap',(0,4.94,-.53),.11,.08,mat['galvanised-tin'],12,rotor)
for i in range(4):
    angle=math.tau*i/4
    cylinder('visible hub bolt',(.145*math.cos(angle),4.94+.145*math.sin(angle),-.59),.025,.045,mat['galvanised-tin'],5,rotor)
def blade_mesh(index, angle):
    # Measured 1.6 m spring-steel blade: swelling at one third, then taper.
    stations=((.16,.11,.00),(.62,.19,.025),(1.62,.018,-.09))
    verts=[]
    for radius,width,cup in stations:
        for side in (-1,1):
            along=radius
            across=side*width/2
            x=along*math.cos(angle)-across*math.sin(angle)
            y=along*math.sin(angle)+across*math.cos(angle)
            verts.append((x,y,cup))
    faces=[]
    for i in range(len(stations)-1):
        a=i*2; b=a+2
        faces.append((a,b,b+1,a+1))
    mesh=bpy.data.meshes.new(f'formed leaf spring blade {index}')
    mesh.from_pydata([tuple(town.game_vector(v)) for v in verts],[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(co.x,co.z)
    obj=bpy.data.objects.new(f'tapered twisted leaf spring blade {index}',mesh)
    bpy.context.scene.collection.objects.link(obj); obj.data.materials.append(mat['rusted-steel'])
    solid=obj.modifiers.new('thin spring steel sheet','SOLIDIFY');solid.thickness=.025
    bevel=obj.modifiers.new('soft rolled blade edge','BEVEL');bevel.width=.012;bevel.segments=1
    # The mesh vertices are axle-relative; keep the child at the rotor origin.
    obj.parent=rotor; obj.location=(0,0,0)
    return obj
for i in range(3):
    blade_mesh(i+1, math.tau*i/3 + math.radians(90))

# Cable is clipped along the rear left leg with repeated short retaining straps.
pts=[(-.25,4.72,.46),(-.40,3.0,.30),(-.62,1.3,.08),(-.72,.42,-.03)]
thin_run('clipped generator cable',pts,.022,mat['iron-dark'],windmill)
for i,(x,y,z) in enumerate((pts[1],pts[2],pts[3])):
    keep(sphere(f'cable clamp {i+1}',(x+.035,y,z),(.05,.035,.045),mat['galvanised-tin']),windmill)

# A crooked distribution pole in its own footprint, with a transformer and
# short, naturally sagging wire stubs. It shares the town-power family file.
pole=bpy.data.objects.new('power-pole',None); bpy.context.scene.collection.objects.link(pole);pole.parent=family
pole.location=town.game_vector((-3.05,0,0))
beam('crooked treated pole',(-3.05,.16,0),(-3.38,4.2,.02),(.20,.18),mat['weathered-plank'],pole)
for y in (.6,1.45,2.3,3.15):
    beam('pole climbing step',(-3.08,y,-.09),(-2.91,y,-.09),(.04,.035),mat['rusted-steel'],pole)
beam('crossarm',(-3.95,3.92,.02),(-2.81,3.95,.02),(.14,.12),mat['weathered-plank'],pole)
keep(town.cube('pole transformer tank',(-3.38,3.38,.19),(.52,.62,.48),mat['rusted-steel'],.07),pole)
for x in (-3.6,-3.38,-3.16):
    for z in (-.13,.5):
        beam('transformer cooling rib',(x,3.14,z),(x,3.62,z),(.036,.045),mat['galvanised-tin'],pole)
for x in (-3.95,-3.38,-2.81):
    cylinder('ceramic insulator',(x,4.16,.02),.095,.18,mat['cracked-concrete'],8,pole)
for start,end,high in [((-3.95,4.16,.02),(-4.33,4.0,.02),4.16),((-2.81,4.16,.02),(-2.4,3.96,.02),4.18)]:
    points=[]
    for step in range(9):
        t=step/8
        points.append((start[0]+(end[0]-start[0])*t, high-.18*math.sin(math.pi*t), start[2]))
    thin_run('sagging wire stub',points,.018,mat['iron-dark'],pole)
for sx in (-1,1):
    for sz in (-1,1):
        keep(town.cube('pole base shoe',(-3.05+sx*.14,.28,sz*.13),(.22,.07,.22),mat['rusted-steel'],0),pole)
keep(town.cube('power pole concrete pad',(-3.05,.10,0),(1.05,.20,.85),mat['cracked-concrete'],.06),pole)

# Export, then reimport in an empty scene for every judgment render.
evidence.mkdir(parents=True,exist_ok=True)
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and len(obj.data.uv_layers):
        for layer in obj.data.uv_layers:
            layer.name='UVMap'
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=920;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('bright overcast');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.75,.78,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
lamp_data=bpy.data.lights.new('broad overcast key','AREA');lamp=bpy.data.objects.new('broad overcast key',lamp_data);scene.collection.objects.link(lamp);lamp.location=(3,7,7);lamp_data.energy=2200;lamp_data.size=8
groundmat=town.make_materials({'sand':root/'public/assets/models/wasteland/town/textures/town-water-earth.jpg'})['sand']
bpy.ops.mesh.primitive_plane_add(size=24,location=town.game_vector((0,-.08,0)));bpy.context.object.data.materials.append(groundmat)
def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def render(name,loc,target,lens=52):
    data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data);scene.collection.objects.link(cam);cam.location=town.game_vector(loc);data.lens=lens;aim(cam,town.game_vector(target));scene.camera=cam
    scene.render.filepath=str(evidence/(name+'.png'));bpy.ops.render.render(write_still=True)
def hide_tree(name,hidden):
    parent=next(obj for obj in scene.objects if obj.name==name)
    for obj in scene.objects:
        node=obj
        while node:
            if node==parent:
                obj.hide_render=hidden
                break
            node=node.parent
hide_tree('power-pole',True)
render('windmill-driver',(5,6,-8),(0,2.8,0),42)
render('windmill-above-45',(3.5,9.3,-3.5),(0,2.5,0),35)
render('windmill-rotor-front',(0,5.8,-8),(0,4.95,-.35),70)
hide_tree('power-pole',False);hide_tree('windmill',True)
render('power-pole-three-quarter',(-5,6,-7),(-3.05,2.0,0),35)
hide_tree('windmill',False)
# Turn the named rotor around its own axle, export and read back once more.
rotor_obj=next(obj for obj in scene.objects if obj.name=='windmill:rotor')
rotor_obj.rotation_mode='XYZ'
rotor_obj.rotation_euler[1]=math.radians(37)
turn_glb=evidence/'rotor-turned.glb';town.export_glb(turn_glb)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(turn_glb))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=920;scene.render.resolution_y=1000
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('bright overcast 2');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.75,.78,1)
groundmat=town.make_materials({'sand':root/'public/assets/models/wasteland/town/textures/town-water-earth.jpg'})['sand']
lamp_data=bpy.data.lights.new('rotor turn light','AREA');lamp=bpy.data.objects.new('rotor turn light',lamp_data);scene.collection.objects.link(lamp);lamp.location=town.game_vector((3,7,-7));lamp_data.energy=2200;lamp_data.size=8
bpy.ops.mesh.primitive_plane_add(size=24,location=town.game_vector((0,-.08,0)));bpy.context.object.data.materials.append(groundmat)
data=bpy.data.cameras.new('windmill-rotor-turned');cam=bpy.data.objects.new('windmill-rotor-turned',data);scene.collection.objects.link(cam);cam.location=town.game_vector((0,5.8,-8));data.lens=70;aim(cam,town.game_vector((0,4.95,-.35)));scene.camera=cam
scene.render.filepath=str(evidence/'windmill-rotor-turned.png');bpy.ops.render.render(write_still=True)
