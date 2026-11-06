"""Build the first TOWN-ART-POWER asset: a 1x1 salvaged wind generator."""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', default=str(Path(__file__).resolve().parents[2]))
p.add_argument('--evidence', default='.evidence/2026-11-06/TOWN-ART-POWER/round-1')
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
evidence = Path(a.evidence)
evidence = evidence if evidence.is_absolute() else root / evidence
blend = evidence / 'power.blend'
glb = root / 'public/assets/models/wasteland/town/power.glb'
sheet = root / 'docs/board/looks/town-art-power/round-1.jpg'
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
})
for material in mat.values():
    material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = min(.28, material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)

def keep(o, parent):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    world = o.matrix_world.copy(); o.parent = parent; o.matrix_world = world
    return o

def beam(name, start, end, width, material, parent):
    va=town.game_vector(start);vb=town.game_vector(end);delta=vb-va
    obj=town.cube(name,tuple((Vector(start)+Vector(end))/2),(width,delta.length,width),material,0)
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return keep(obj,parent)

def cylinder(name, pos, radius, depth, material, vertices=20, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
        location=town.game_vector(pos))
    o = bpy.context.object; o.name = name; o.data.materials.append(material)
    return keep(o, parent) if parent else o

family = bpy.data.objects.new('town-power', None); bpy.context.scene.collection.objects.link(family)
rootmill = bpy.data.objects.new('windmill', None); bpy.context.scene.collection.objects.link(rootmill); rootmill.parent = family
rotor = bpy.data.objects.new('windmill:rotor', None); bpy.context.scene.collection.objects.link(rotor); rotor.parent = rootmill

# Four splayed, 5 m tower legs and real diagonal angle-iron cross bracing.
for x in (-.34, .34):
    for z in (-.34, .34):
        beam('mast leg', (x*3,.18,z*3), (x,.40,z), .095, mat['rusted-steel'], rootmill)
for y in (.72, 1.80, 2.92, 4.05):
    span = .34 + (4.6-y)*.145
    for side in (-1,1):
        beam('mast cross tie',(-span,y,side*span),(span,y,side*span),.065,mat['rusted-steel'],rootmill)
for y0,y1 in ((.55,1.55),(1.55,2.55),(2.55,3.55),(3.55,4.4)):
    s0=.34+(4.6-y0)*.145; s1=.34+(4.6-y1)*.145
    for side in (-1,1):
        beam('mast X brace',(-s0,y0,side*s0),(s1,y1,side*s1),.045,mat['galvanised-tin'],rootmill)
        beam('mast X brace',(s0,y0,side*s0),(-s1,y1,side*s1),.045,mat['rusted-steel'],rootmill)

# Foot plates, concrete anchor and bracket details keep the mast visibly planted.
town.cube('windmill footing',(0,.13,0),(1.15,.26,1.15),mat['cracked-concrete'],.08).parent=rootmill
for x in (-.52,.52):
    for z in (-.52,.52):
        town.cube('mast anchor plate',(x,.31,z),(.25,.07,.25),mat['rusted-steel'],.018).parent=rootmill
        cylinder('anchor bolt',(x,.36,z),.035,.12,mat['galvanised-tin'],12,rootmill)

# Head: salvage alternator housing, cooling ribs, axle and tail boom.
cylinder('rotor bearing',(0,4.48,0),.19,.42,mat['rusted-steel'],24,rootmill)
alternator=cylinder('alternator casing',(0,4.48,.32),.27,.62,mat['iron-dark'],24)
alternator.rotation_euler[0]=math.pi/2; keep(alternator,rootmill)
for z in (.18,.36,.54):
    bpy.ops.mesh.primitive_torus_add(major_radius=.255,minor_radius=.023,major_segments=8,minor_segments=4,
      location=town.game_vector((0,4.48,z)))
    bpy.context.object.name='alternator cooling rib'; bpy.context.object.data.materials.append(mat['galvanised-tin']); bpy.context.object.rotation_euler[0]=math.pi/2; keep(bpy.context.object,rootmill)
cylinder('rotor shaft',(0,4.48,-.10),.10,.32,mat['galvanised-tin'],16,rootmill)
beam('tail boom',(0,4.48,.54),(0,4.48,1.78),.075,mat['rusted-steel'],rootmill)
town.cube('tail vane',(0,4.48,1.83),(.55,.78,.055),mat['rusted-steel'],.035).parent=rootmill

# A single named movable rotor assembly. Three thin, tapered and slightly
# warped sheet blades meet at a bolted hub; front faces toward the road (-Z).
cylinder('hub',(0,4.48,-.32),.21,.16,mat['rusted-steel'],24,rotor)
cylinder('hub cap',(0,4.48,-.43),.11,.08,mat['galvanised-tin'],20,rotor)
for i in range(3):
    angle=math.tau*i/3
    direction=Vector((math.sin(angle),math.cos(angle),0))
    center=Vector((0,4.48,-.40))+direction*.76
    blade=town.cube('bent steel rotor blade',tuple(center),(.25,1.18,.075),mat['rusted-steel'],.035)
    blade.rotation_euler[1]=-angle
    keep(blade,rotor)
    # A dark rolled reinforcing edge is welded along one side of every blade.
    edge=Vector((math.cos(angle),-math.sin(angle),0))*.105
    beam('rolled blade edge',tuple(center-edge),tuple(center+direction*.57-edge),.035,mat['rusted-steel'],rotor)

# Flexible electrical lead runs down one face of the mast to the base.
town.pipe_run('generator cable',[(0,4.42,.60),(.19,4.15,.43),(.27,3.5,.43),(.28,2.4,.42),(.26,1.4,.40),(.17,.45,.38)],.025,mat['iron-dark'])
for o in [o for o in bpy.context.scene.objects if o.name.startswith('generator cable') and o.parent is None]: keep(o,rootmill)

# Save and export only model objects; presentation setup is created after GLB import.
evidence.mkdir(parents=True,exist_ok=True); blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend)); town.export_glb(glb)

# Every submitted view is rendered from a fresh scene importing the actual GLB.
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=900; scene.render.resolution_y=800; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='AgX'; scene.world=bpy.data.worlds.new('bright overcast sky'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.74,.78,.82,1); scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
lamp_data=bpy.data.lights.new('overcast key','AREA');lamp=bpy.data.objects.new('overcast key',lamp_data);scene.collection.objects.link(lamp);lamp.location=(2,5,8);lamp_data.energy=1800;lamp_data.size=8
groundmat=town.make_materials({'sand':root/'public/assets/models/wasteland/town/textures/town-water-earth.jpg'})['sand']
bpy.ops.mesh.primitive_plane_add(size=25,location=town.game_vector((0,-.04,0)));bpy.context.object.data.materials.append(groundmat)
evidence.mkdir(parents=True,exist_ok=True)
def aim2(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def draw(name,loc,target,lens):
    data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data);scene.collection.objects.link(cam);cam.location=loc;data.lens=lens;aim2(cam,target);scene.camera=cam;scene.render.filepath=str(evidence/(name+'.png'));bpy.ops.render.render(write_still=True)
draw('windmill-driver-seat',(3,10,2.5),(0,0,2.5),45)
draw('windmill-above-45',(7,8,8),(0,0,2.5),65)
