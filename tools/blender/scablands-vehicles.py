"""Build the Everburn story vehicles and their first review sheet.

blender -b --python-exit-code 1 --python tools/blender/scablands-vehicles.py -- --root .
Metric units, +Y up, +Z forward. The GLB has one named empty root per vehicle.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/scablands/vehicles.glb'
blend = root / 'art-build/scablands/vehicles.blend'
sheet = root / 'docs/board/looks/ww-art-vehicles/round-1.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [], 'summary': [str(sheet)]}))
    raise SystemExit(0)
if sheet.exists():
    raise SystemExit('round-1.jpg already exists; review rounds are immutable')

import bpy
from mathutils import Vector

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x, scene.render.resolution_y = 1800, 850
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 88
scene.render.film_transparent = False
scene.world.color = (.035, .035, .032)

def mat(name, color, metallic=.45, rough=.72, emission=0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic; bs.inputs['Roughness'].default_value = rough
    if emission:
        bs.inputs['Emission Color'].default_value = (*color, 1); bs.inputs['Emission Strength'].default_value = emission
    return m

steel = mat('Welded soot-dark steel', (.105,.112,.105), .68, .82)
rust = mat('Layered iron oxide', (.31,.115,.048), .55, .92)
paint = mat('Faded ochre enamel over rust', (.37,.28,.12), .45, .84)
black = mat('Oiled iron and rubber', (.035,.039,.036), .26, .91)
glass = mat('Dusty cab glass', (.09,.14,.14), .35, .42)
glow = mat('Vent glow look', (.95,.19,.025), .05, .44, 2.0)
warm = mat('Firebox ember', (.72,.24,.025), .15, .65, .5)

def cube(name, loc, scale, material, bevel=.025, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name
    o.dimensions=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('Hammered softened edges','BEVEL'); mod.width=bevel; mod.segments=1
        o.modifiers.new('Weld normals','WEIGHTED_NORMAL')
    o.data.materials.append(material)
    if parent:
        o.parent=parent; o.matrix_parent_inverse=parent.matrix_world.inverted()
    return o

def cyl(name, loc, radius, depth, material, rot=(math.pi/2,0,0), vertices=16, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material)
    if parent:
        o.parent=parent; o.matrix_parent_inverse=parent.matrix_world.inverted()
    return o

def root_empty(name, x):
    e=bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e); e.location=(x,0,0); return e

def wheelset(parent, x0, length, radius=.53, count=2):
    for side in (-.88,.88):
        for i in range(count):
            z=-length*.34 + i*(length*.68/max(1,count-1))
            cyl('Great iron wheel', (x0+side,.62,z), radius,.34,black,parent=parent)
            cyl('Rusted wheel hub', (x0+side*1.19,.62,z), radius*.42,.07,rust,parent=parent)
            cyl('Hub cap', (x0+side*1.24,.62,z), radius*.17,.08,steel,parent=parent)

def cab(parent, x, z, width=1.65, height=1.15):
    cube('Cab lower shell',(x,1.42,z),(width,1.0,1.85),rust,.07,parent)
    cube('Cab roof plate',(x,2.05,z-.12),(width+.12,.14,1.8),steel,.025,parent)
    cube('Windshield grime glass',(x,1.83,z+.79),(width*.78,.43,.055),glass,.01,parent)
    for side in (-1,1):
        cube('Door plate',(x+side*width*.49,1.40,z-.05),(.08,.76,1.12),paint,.02,parent)
        for zz in (z-.40,z+.37): cube('Door weld seam',(x+side*(width*.5+.012),1.42,zz),(.018,.025,.68),steel,.004,parent)
    # rivets and mismatched patches
    for side in (-1,1):
        for zz in (z-.50,z+.48): cyl('Door rivet',(x+side*(width*.51),1.55,zz),.035,.035,black,parent=parent)

def bess(x):
    r=root_empty('Big Bess gas truck',x)
    cube('Bess ladder chassis',(0,.79,0),(2.15,.30,5.1),black,.04,r)
    cab(r,0,1.28,1.72)
    # Bulbous horizontal gas tank: broad, dented vessel with end caps and straps.
    cyl('Bulbous gas vessel',(0,1.74,-1.22),.97,3.25,paint,rot=(0,math.pi/2,0),vertices=24,parent=r)
    for z in (-2.53,-.98):
        cube('Tank retaining saddle',(0,1.70,z),(2.02,.12,.17),rust,.025,r)
    cyl('Fill cap',(0,2.72,-.35),.16,.16,steel,rot=(0,0,0),parent=r)
    for side in (-1,1):
        cube('Tank welded patch',(side*.72,1.94,-1.28),(.045,.48,.72),rust,.025,r)
        cube('Side running board',(side*1.12,.92,.26),(.22,.16,1.6),steel,.02,r)
    wheelset(r,0,5.1,.62,3)
    cube('Bumper',(0,.70,3.05),(2.5,.32,.25),steel,.04,r)
    return r

def smoke(x):
    r=root_empty("Old Smoke's rolling furnace",x)
    cube('Furnace armored chassis',(0,.88,0),(2.2,.42,5.2),black,.05,r)
    cab(r,0,1.40,1.9,1.2)
    cube('Boiler furnace body',(0,1.65,-1.25),(2.75,1.55,2.8),rust,.12,r)
    cube('Boiler front iron door',(0,1.55,.19),(1.65,1.0,.12),steel,.07,r)
    cube('Firebox dark mouth',(0,1.40,.27),(1.03,.50,.05),black,.01,r)
    cube('Ember grate',(0,1.37,.31),(.64,.12,.035),warm,.005,r)
    # Three individually addressable vents, with a dark mouth and separate glow insert.
    for i,xv in enumerate((-.82,0,.82),1):
        cube(f'old-smoke-vent-{i}',(xv,2.03,-2.72),(.48,.57,.13),steel,.045,r)
        cube(f'old-smoke-vent-{i}-mouth',(xv,2.03,-2.635),(.31,.35,.035),black,.01,r)
        cube(f'old-smoke-vent-{i}-glow',(xv,2.03,-2.61),(.22,.24,.025),glow,.01,r)
        for dx in (-.20,.20): cyl('Vent bolt',(xv+dx,2.03,-2.60),.035,.025,rust,rot=(math.pi/2,0,0),parent=r)
    # Tall crooked chimney and rain hood.
    cyl('Crooked furnace chimney',(.62,3.25,-1.18),.24,2.55,steel,rot=(0,0,0),vertices=12,parent=r)
    cyl('Chimney rust collar',(.62,2.44,-1.18),.30,.18,rust,rot=(0,0,0),vertices=12,parent=r)
    cube('Chimney cap',(.62,4.52,-1.18),(.62,.12,.58),rust,.02,r)
    for side in (-1,1):
        cube('Furnace side armor',(side*1.40,1.55,-1.0),(.08,1.22,2.3),paint,.025,r)
        for y in (1.12,1.52,1.92): cube('Armor weld bead',(side*1.45,y,-1.0),(.025,.035,2.05),steel,.006,r)
    wheelset(r,0,5.2,.70,3)
    return r

def buggy(x):
    r=root_empty('Thief buggy',x)
    cube('Buggy ladder rails',(0,.73,0),(1.32,.22,3.8),rust,.025,r)
    for side in (-1,1):
        for z in (-1.65,1.55):
            cyl('Narrow buggy wheel',(side*.80,.56,z),.53,.25,black,parent=r)
            cyl('Bare hub',(side*.96,.56,z),.20,.05,rust,parent=r)
        cube('Exposed tube frame',(side*.58,1.43,0),(.07,1.42,2.65),steel,.02,r)
    cube('Driver seat',(0,1.0,-.05),(.68,.35,.7),black,.07,r)
    cube('Slanted hood plate',(0,1.04,1.08),(1.18,.17,1.0),paint,.035,r)
    cube('Patch welded to hood',(.26,1.14,1.04),(.38,.035,.41),rust,.01,r)
    cyl('Exposed engine block',(0,1.08,-.82),.40,.82,steel,rot=(math.pi/2,0,0),vertices=12,parent=r)
    cube('Rear scrap rack',(0,1.35,-1.55),(1.12,.54,.38),rust,.03,r)
    return r

roots=[bess(-4.3),smoke(0),buggy(4.3)]
# Review stage, neutral dark ground and three large forms with labels.
ground=mat('Review ground',(.075,.078,.073),.05,.96)
cube('Review floor',(0,-.04,0),(13,.08,9),ground,0)
for idx,label in enumerate(('BIG BESS','OLD SMOKE','THIEF BUGGY')):
    bpy.ops.object.text_add(location=(-5.3+idx*4.3,.02,-3.4),rotation=(math.pi/2,0,0))
    t=bpy.context.object; t.name='Review label: '+label; t.data.body=label; t.data.size=.43
    t.data.materials.append(paint)

def aim(obj, point): obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(10,7.2,11)); camera=bpy.context.object; aim(camera,(0,1.6,0)); camera.data.type='ORTHO'; camera.data.ortho_scale=14.5; scene.camera=camera
for loc,power,size in [((-3,9,5),1800,7),((4,6,-5),1100,6)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,(0,1,0))
scene.view_settings.view_transform='AgX'
blend.parent.mkdir(parents=True,exist_ok=True); glb.parent.mkdir(parents=True,exist_ok=True); sheet.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
scene.render.filepath=str(sheet)
bpy.ops.render.render(write_still=True)
for obj in bpy.context.selected_objects: obj.select_set(False)
for obj in list(bpy.data.objects):
    parent=obj.parent
    while parent and parent not in roots: parent=parent.parent
    if obj in roots or parent in roots: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_apply=True,export_materials='EXPORT',export_extras=True,use_selection=True)
if glb.stat().st_size > 1_500_000: raise RuntimeError(f'GLB budget exceeded: {glb.stat().st_size}')
if sheet.stat().st_size > 500_000: raise RuntimeError(f'Review sheet budget exceeded: {sheet.stat().st_size}')
