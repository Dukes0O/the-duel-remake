"""Build the Everburn story vehicles and render private round-review views.

blender -b --python-exit-code 1 --python tools/blender/scablands-vehicles.py -- --root .
Metric units, +Y up, +Z forward. The GLB has one named empty root per vehicle.
"""
import argparse
import json
import math
import os
import sys
from datetime import date
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/scablands/vehicles.glb'
blend = root / 'art-build/scablands/vehicles.blend'
sheet = root / 'docs/board/looks/ww-art-vehicles/round-2.jpg'
evidence = root / '.evidence' / date.today().isoformat() / 'WW-ART-VEHICLES' / 'round-3'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(evidence)], 'summary': [str(sheet)]}))
    raise SystemExit(0)
import bpy
from mathutils import Vector

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x, scene.render.resolution_y = 1100, 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 88
scene.render.film_transparent = False
scene.world.color = (.035, .035, .032)

def mat(name, color, metallic=.45, rough=.72, emission=0):
    metallic = min(metallic, .18)
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic; bs.inputs['Roughness'].default_value = rough
    # Plain colours only. A noise texture wired into the colour is not written to the game's model file: the
    # exported material arrives white, and with a metal setting it draws black in the Scablands (no sky to reflect).
    if emission:
        bs.inputs['Emission Color'].default_value = (*color, 1); bs.inputs['Emission Strength'].default_value = emission
    return m

# Colours as first reviewed. Round 1 of EVERBURN-FURNACE-LOOK lightened them to answer a near-black furnace whose
# real cause was in the game (the scene tinted a shared material once for every part); round 2 put them back.
steel = mat('Welded soot-dark steel', (.105,.112,.105), .68, .82)
rust = mat('Layered iron oxide', (.20,.082,.040), .55, .92)
paint = mat('Faded ochre enamel, chipped to rust', (.30,.225,.10), .45, .84)
black = mat('Oiled iron and rubber', (.035,.039,.036), .26, .91)
scorch = mat('Scorched firebox plate', (.115,.058,.034), .3, .95)
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
        # Mesh coordinates are authored in the vehicle root's local frame.
        o.parent=parent
    return o
    return o

def cyl(name, loc, radius, depth, material, rot=(math.pi/2,0,0), vertices=16, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material)
    if parent:
        o.parent=parent
    return o

def root_empty(name, x):
    e=bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e); e.location=(x,0,0); return e

def wheelset(parent, x0, length, radius=.53, count=2):
    for side in (-.88,.88):
        for i in range(count):
            z=-length*.34 + i*(length*.68/max(1,count-1))
            cyl('Great iron wheel', (x0+side,.62,z), radius,.34,black,rot=(0,math.pi/2,0),parent=parent)
            cyl('Rusted wheel hub', (x0+side*1.19,.62,z), radius*.42,.07,rust,rot=(0,math.pi/2,0),parent=parent)
            cyl('Hub cap', (x0+side*1.24,.62,z), radius*.17,.08,steel,rot=(0,math.pi/2,0),parent=parent)

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
    # Uneven repair plates, bent corners and exposed weld beads break the factory symmetry.
    cube('Bent cab patch',(-width*.48,1.22,z-.58),(.46,.54,.12),rust,.018,parent)
    cube('Scabbed cab patch',(width*.51,1.54,z+.47),(.13,.34,.38),paint,.018,parent)
    for dz in (-.34,-.12,.11,.32):
        cube('Raised weld bead',(width*.515,1.40,z+dz),(.04,.035,.12),steel,.006,parent)

def bess(x):
    r=root_empty('Big Bess gas truck',x)
    cube('Bess ladder chassis',(0,.79,0),(2.15,.30,5.1),black,.04,r)
    cab(r,0,1.28,1.72)
    # Bulbous horizontal gas tank: broad, dented vessel with end caps and straps.
    cyl('Bulbous gas vessel',(0,1.74,-1.22),.97,3.25,paint,rot=(0,math.pi/2,0),vertices=24,parent=r)
    for z in (-2.53,-.98):
        cube('Tank retaining saddle',(0,1.70,z),(2.02,.12,.17),rust,.025,r)
    cyl('Fill cap',(0,2.72,-.35),.16,.16,steel,rot=(0,0,0),parent=r)
    for z in (-2.20,-1.78,-1.34,-.92):
        cyl('Forged tank band',(0,1.74,z),1.015,.075,steel,rot=(0,math.pi/2,0),vertices=24,parent=r)
    for side in (-1,1):
        for z in (-2.45,-.25): cube('Tank saddle gusset',(side*.72,1.27,z),(.12,.50,.38),steel,.025,r)
        for z in (-2.36,-1.88,-1.36,-.88,-.40):
            cyl('Tank band rivet',(side*.91,1.75,z),.043,.045,rust,rot=(0,math.pi/2,0),vertices=8,parent=r)
    # Pipework, hand wheel and a dented end shroud make the tank read as a working gas hauler.
    cyl('Tank draw pipe',(.48,2.56,-1.68),.09,1.3,rust,rot=(math.pi/2,0,0),vertices=10,parent=r)
    cyl('Valve wheel',(.48,2.59,-2.37),.25,.09,steel,rot=(math.pi/2,0,0),vertices=12,parent=r)
    cube('Dented tank end guard',(-.72,1.55,-2.95),(.34,.58,.70),steel,.035,r)
    cube('Lopsided tank scar',( .42,2.02,-1.94),(.62,.08,.38),paint,.025,r)
    for side in (-1,1):
        cube('Tank welded patch',(side*.72,1.94,-1.28),(.045,.48,.72),rust,.025,r)
        cube('Side running board',(side*1.12,.92,.26),(.22,.16,1.6),steel,.02,r)
    wheelset(r,0,5.1,.62,3)
    cube('Bumper',(0,.70,3.05),(2.5,.32,.25),steel,.04,r)
    return r

def smoke(x):
    """A scrap boiler on a six-wheel truck: a firebox with a barred fire door on each flank and at the rear, a
    banded drum on top, a steam dome and a tall crooked chimney. Model +X is the furnace's left."""
    r=root_empty("Old Smoke's rolling furnace",x)
    cube('Furnace armored chassis',(0,.88,0),(2.2,.42,5.6),black,.05,r)
    cab(r,0,1.42,1.9,1.2)
    cube('Scrap ram beam',(0,.78,2.86),(2.6,.46,.22),steel,.04,r)
    for xv in (-1.0,-.34,.34,1.0): cube('Ram tooth',(xv,.62,3.02),(.20,.62,.16),rust,.03,r)
    cube('Firebox riveted box',(0,1.60,-1.15),(2.5,1.25,3.0),scorch,.06,r)
    cube('Firebox soot-stained top deck',(0,2.25,-1.15),(2.56,.10,3.06),black,.02,r)
    cyl('Boiler drum',(0,2.38,-1.15),.92,3.02,steel,rot=(0,0,0),vertices=20,parent=r)
    for z in (-2.42,-1.58,-.72,.14):
        cyl('Drum band',(0,2.38,z),.955,.10,rust,rot=(0,0,0),vertices=20,parent=r)
    cyl('Drum rear cap',(0,2.38,-2.69),.74,.08,black,rot=(0,0,0),vertices=16,parent=r)
    for k in range(8):
        a=k*math.pi/4
        cyl('Drum cap bolt',(math.cos(a)*.60,2.38+math.sin(a)*.60,-2.74),.055,.05,rust,rot=(0,0,0),vertices=6,parent=r)
    cyl('Steam dome',(-.18,3.42,-1.95),.33,.46,paint,rot=(math.pi/2,0,0),vertices=14,parent=r)
    cyl('Steam dome cap',(-.18,3.70,-1.95),.20,.14,rust,rot=(math.pi/2,0,0),vertices=10,parent=r)
    for side in (-1,1):
        cyl('Drum steam pipe',(side*.72,3.06,-1.15),.065,2.7,rust,rot=(0,0,0),vertices=8,parent=r)
    # Tall crooked chimney with a flared crown, off-centre on the drum.
    cyl('Crooked furnace chimney',(.62,3.95,-1.18),.25,2.15,steel,rot=(math.pi/2,0,0),vertices=12,parent=r)
    cyl('Chimney rust collar',(.62,3.05,-1.18),.33,.22,rust,rot=(math.pi/2,0,0),vertices=12,parent=r)
    cyl('Chimney flared crown',(.62,5.02,-1.18),.36,.24,rust,rot=(math.pi/2,0,0),vertices=12,parent=r)
    cube('Chimney cap',(.62,5.22,-1.18),(.66,.08,.62),black,.02,r)
    # The rear fire door: three barred openings, each with a dark mouth and its own fire.
    cube('Rear door iron frame',(0,1.55,-2.66),(2.34,.98,.06),black,.02,r)
    cube('Rear door soot hood',(0,2.10,-2.80),(2.44,.09,.34),black,.02,r)
    cube('Rear soot stain',(0,2.36,-2.675),(1.5,.44,.03),black,.01,r)
    for i,xv in enumerate((-.74,0,.74),1):
        cube(f'old-smoke-vent-{i}',(xv,1.55,-2.695),(.64,.80,.02),steel,.008,r)
        cube(f'old-smoke-vent-{i}-mouth',(xv,1.55,-2.71),(.56,.72,.02),black,.004,r)
        cube(f'old-smoke-vent-{i}-glow',(xv,1.55,-2.73),(.50,.66,.02),glow,.004,r)
    for y in (1.36,1.74): cube('Rear door grate bar',(0,y,-2.76),(2.24,.05,.03),black,.006,r)
    for xv in (-1.11,-.37,.37,1.11): cube('Rear door post',(xv,1.55,-2.75),(.07,.92,.05),black,.008,r)
    for side in (-1,1):
        # A flank fire door, built the same way as the rear one.
        cube('Flank door iron frame',(side*1.29,1.55,-1.0),(.10,.98,2.34),black,.02,r)
        cube('Flank door soot hood',(side*1.43,2.10,-1.0),(.34,.09,2.44),black,.02,r)
        for i,zv in enumerate((-1.74,-1.0,-.26),1):
            cube(f'Flank vent {side} {i} rim',(side*1.345,1.55,zv),(.02,.80,.64),steel,.008,r)
            cube(f'Flank vent {side} {i} dark throat',(side*1.36,1.55,zv),(.02,.72,.56),black,.004,r)
            cube(f'Flank vent {side} {i} ember',(side*1.38,1.55,zv),(.02,.66,.50),glow,.004,r)
        for y in (1.36,1.74): cube('Flank door grate bar',(side*1.41,y,-1.0),(.03,.05,2.24),black,.006,r)
        for zv in (-2.11,-1.37,-.63,.11): cube('Flank door post',(side*1.40,1.55,zv),(.05,.92,.07),black,.008,r)
        # Six armour plates, two lost with each hit: a skirt over the wheels, a shoulder plate leaning on the
        # drum, and a shield on the rear corner.
        cube('Furnace side armor',(side*1.36,.80,-.95),(.08,.60,3.3),paint,.025,r)
        shoulder=cube('Hanging torn furnace plate',(side*.98,2.74,-1.15),(.07,.78,2.5),paint,.02,r)
        shoulder.rotation_euler.z=side*math.radians(38)
        cube('Furnace torn corner plate',(side*1.28,1.62,-2.84),(.34,1.20,.09),steel,.02,r)
        for z in (-2.3,-1.5,-.7,.1,.6): cyl('Skirt rivet',(side*1.41,.98,z),.04,.03,black,rot=(0,math.pi/2,0),vertices=6,parent=r)
    wheelset(r,0,5.2,.70,3)
    return r

def buggy(x):
    r=root_empty('Thief buggy',x)
    cube('Buggy ladder rails',(0,.73,0),(1.32,.22,3.8),rust,.025,r)
    for side in (-1,1):
        for z in (-1.65,1.55):
            cyl('Narrow buggy wheel',(side*.80,.56,z),.53,.25,black,rot=(0,math.pi/2,0),parent=r)
            cyl('Bare hub',(side*.96,.56,z),.20,.05,rust,rot=(0,math.pi/2,0),parent=r)
        # An open cage of tubes: no sheet panel, with the seat and engine visible.
        for height in (.91,1.92): cube('Buggy side frame rail',(side*.58,height,0),(.07,.075,2.65),steel,.018,r)
        for z in (-1.30,0,1.30): cube('Buggy side frame upright',(side*.58,1.42,z),(.075,1.05,.075),rust,.018,r)
    cube('Driver seat',(0,1.0,-.05),(.68,.35,.7),black,.07,r)
    cube('Slanted hood plate',(0,1.04,1.08),(1.18,.17,1.0),paint,.035,r)
    cube('Patch welded to hood',(.26,1.14,1.04),(.38,.035,.41),rust,.01,r)
    cyl('Exposed engine block',(0,1.08,-.82),.40,.82,steel,rot=(math.pi/2,0,0),vertices=12,parent=r)
    cube('Rear scrap rack',(0,1.35,-1.55),(1.12,.54,.38),rust,.03,r)
    # A visibly light, incomplete cage with one missing panel and a salvaged front fork.
    cyl('Exposed exhaust stack',(.39,1.22,-1.0),.085,1.2,rust,rot=(0,0,0),vertices=8,parent=r)
    cube('Single bent windscreen rail',(0,1.96,.90),(1.05,.07,.07),rust,.015,r)
    cube('Skewed left fender',(-.84,.92,1.48),(.35,.10,.84),paint,.025,r)
    cube('Engine side guard',( .48,1.12,-.73),(.15,.58,.54),steel,.02,r)
    for side in (-1,1):
        cyl('Diagonal cage tube',(side*.58,1.05,-1.45),.055,2.1,rust,rot=(math.radians(24),0,0),vertices=8,parent=r)
    cyl('Engine drive pulley',(.28,1.10,-.92),.21,.09,rust,rot=(math.pi/2,0,0),vertices=12,parent=r)
    return r

roots=[bess(-4.3),smoke(0),buggy(4.3)]
# A plain, human-shaped scale figure stands beside each subject in the review
# views. It is authored directly in Z-up and is never selected for export.
scale_figures=[]
for vehicle_x in (-4.3,0,4.3):
    px,py=vehicle_x+3.0,1.2; group=[]
    def human_box(name,location,size,material):
        bpy.ops.mesh.primitive_cube_add(size=1,location=location); o=bpy.context.object; o.name=name; o.dimensions=size
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); group.append(o)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.14,location=(px,py,1.67))
    head=bpy.context.object; head.name='Review scale person head'; head.data.materials.append(steel); group.append(head)
    human_box('Review scale person torso',(px,py,1.16),(.34,.24,.68),steel)
    human_box('Review scale person arms',(px,py,1.25),(.18,.82,.16),rust)
    for side in (-1,1): human_box('Review scale person leg',(px,py+side*.12,.43),(.18,.16,.76),black)
    scale_figures.append(group)
# Neutral display ground is used only in review renders, never exported.
ground=mat('Review ground',(.075,.078,.073),.05,.96)
floor=cube('Review floor',(0,-.04,0),(13,.08,9),ground,0)
def aim(obj, point): obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-3,9,5),1800,7),((4,6,-5),1100,6)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,(0,1,0))
scene.view_settings.view_transform='AgX'
blend.parent.mkdir(parents=True,exist_ok=True); glb.parent.mkdir(parents=True,exist_ok=True); sheet.parent.mkdir(parents=True,exist_ok=True)
evidence.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
# Render in Blender Z-up while leaving exported roots in the game's Y-up frame.
labels=('BIG BESS','OLD SMOKE','THIEF BUGGY')
view_files=[]
for root_obj in roots: root_obj.rotation_euler.x=math.pi/2
floor.rotation_euler.x=math.pi/2
scene.render.resolution_x,scene.render.resolution_y=1000,650
for idx,(label,root_obj) in enumerate(zip(labels,roots)):
    center_x=root_obj.location.x
    for figure_idx,group in enumerate(scale_figures):
        for figure in group: figure.hide_render=(figure_idx!=idx)
    for obj in bpy.data.objects:
        ancestor=obj
        while ancestor.parent and ancestor not in roots: ancestor=ancestor.parent
        owner=ancestor if ancestor in roots else None
        if owner: obj.hide_render=(owner is not root_obj)
    bpy.context.view_layer.update()
    bpy.ops.object.camera_add(); camera=bpy.context.object; camera.data.type='ORTHO'; scene.camera=camera
    for view,loc,point,scale in (
        ('side',(12,-.2,2.6),(0,0,1.7),8.8),
        ('three-quarter',(8,-8,5.0),(0,0,1.8),7.5),
        ('detail',(3,-4,2.7),(0,-.2,1.6),4.2)):
        camera.location=(center_x+loc[0],loc[1],loc[2]); aim(camera,(center_x+point[0],point[1],point[2])); camera.data.ortho_scale=scale
        scene.render.filepath=str(evidence/f'{idx+1}-{view}.jpg')
        bpy.ops.render.render(write_still=True)
        view_files.append(str(evidence/f'{idx+1}-{view}.jpg'))
    bpy.data.objects.remove(camera,do_unlink=True)
for obj in bpy.data.objects: obj.hide_render=False
for obj in bpy.context.selected_objects: obj.select_set(False)
for root_obj in roots: root_obj.rotation_euler.x=0
for obj in list(bpy.data.objects):
    parent=obj.parent
    while parent and parent not in roots: parent=parent.parent
    if obj in roots or parent in roots: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_apply=True,export_materials='EXPORT',export_extras=True,use_selection=True,
    export_yup=False)  # The parts are authored +Y up already; the exporter's own turn stood every vehicle on its nose.
if glb.stat().st_size > 1_500_000: raise RuntimeError(f'GLB budget exceeded: {glb.stat().st_size}')
# A separate comparison collage is assembled after Blender from the previous
# round plus the nine individual evidence renders.
print(json.dumps({'renders':view_files,'round3':str(sheet)}))
