"""One-round, procedural Scablands folk cast. Blender Z-up; GLB export is Y-up.

Run: blender -b --python tools/blender/scablands-folk.py -- --root .
The output is a review candidate; WW-SCENE will wire it into the game.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--paths-only', action='store_true')
p.add_argument('--round', type=int, default=1)
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/folk.glb'
blend = root / 'art-build/scablands-folk.blend'
evidence = root / '.evidence/2026-11-05/WW-ART-FOLK'
sheet = root / 'docs/board/looks/ww-art-folk/round-1.jpg'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': [str(sheet)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1440
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.world = bpy.data.worlds.new('Scablands dust')
scene.world.color = (.055, .045, .035)

def mat(name, color, metal=0, rough=.86):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    s = m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value = (*color, 1)
    s.inputs['Metallic'].default_value = metal
    s.inputs['Roughness'].default_value = rough
    noise=m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=31
    noise.inputs['Detail'].default_value=3; noise.inputs['Roughness'].default_value=.82
    bump=m.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.24
    bump.inputs['Distance'].default_value=.025
    m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
    m.node_tree.links.new(bump.outputs['Normal'],s.inputs['Normal'])
    return m

cloth = mat('sun-faded canvas', (.26,.20,.14))
darkcloth = mat('soot-stained workwear', (.095,.09,.075))
rust = mat('welded rusted steel', (.30,.105,.045), .72)
iron = mat('bare dark iron', (.105,.12,.115), .82)
leather = mat('cracked brown leather', (.19,.095,.04), .05)
skin = mat('dust-worn skin', (.42,.27,.17), 0, .92)
grey = mat('Ash Men ash-grey cloth', (.19,.20,.19))
amber = mat('goggle amber glass', (.43,.19,.035), .22, .32)
bone = mat('bleached canvas', (.50,.43,.31))
green = mat('oxidised forge green', (.15,.19,.13), .12)

def box(name, loc, scale, material, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('hand-bent edges','BEVEL'); mod.width=bevel; mod.segments=1
        o.modifiers.new('weighted corner normals','WEIGHTED_NORMAL')
    return o

def orb(name, loc, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for f in o.data.polygons: f.use_smooth=True
    return o

def cylinder(name, loc, radius, depth, material, rot=None, vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc,
                                        rotation=rot or (0,0,0))
    o=bpy.context.object; o.name=name; o.data.materials.append(material)
    o.modifiers.new('weighted corner normals','WEIGHTED_NORMAL')
    return o

# Names and visual language follow the Tin Town/Everburn story. Positions are
# review staging only; the scene card will place individual actors later.
folk = [
 ('Auntie Solder','tintown-worker',green,leather,'grey-knot'),
 ('Moss','gas-hauler',darkcloth,leather,'cap'),
 ('Tin Town resident 1','townsfolk',cloth,leather,'wrap'),
 ('Tin Town resident 2','townsfolk',bone,darkcloth,'hood'),
 ('Tin Town resident 3','townsfolk',green,leather,'scarf'),
 ('Ash Man raider 1','ash-raider',grey,rust,'goggles'),
 ('Ash Man raider 2','ash-raider',darkcloth,rust,'goggles'),
]
all_objects=[]
for idx,(name,role,coat,gear,headwear) in enumerate(folk):
    x=(idx-3)*1.65
    prefix=name.lower().replace(' ','-')
    root_obj=bpy.data.objects.new(prefix+' root',None); scene.collection.objects.link(root_obj)
    # Legs and boots: practical, slightly mismatched salvage.
    for side,dx in [('L',-.15),('R',.15)]:
        box(prefix+' '+side+' boot',(x+dx,.12,.13),(.25,.43,.24),iron)
        box(prefix+' '+side+' trouser',(x+dx,.05,.55),(.24,.32,.66),coat)
        box(prefix+' '+side+' knee patch',(x+dx,-.12,.64),(.20,.035,.16),gear,.012)
    box(prefix+' oilskin coat',(x,0,1.18),(.65,.36,.76),coat,.065)
    box(prefix+' chest plate',(x,-.205,1.28),(.42,.055,.33),rust,.015)
    # Repairs are individually welded patches and rivets, intentionally rough.
    for j in range(3):
        box(prefix+f' coat patch {j}',(x-.20+j*.20,-.238,.98+(j%2)*.13),(.10,.025,.08),gear,.008)
        orb(prefix+f' rivet {j}',(x-.16+j*.16,-.272,1.30),(.025,.015,.025),iron)
    cylinder(prefix+' belt',(x,-.01,.86),.28,.075,leather,vertices=12)
    box(prefix+' buckle',(x,-.215,.86),(.12,.04,.09),rust,.01)
    # Arms angle down with visible sleeves, forearms, gloves and scrap cuffs.
    for side,dx in [('L',-.43),('R',.43)]:
        upper=orb(prefix+' '+side+' sleeve',(x+dx,.0,1.25),(.16,.19,.34),coat)
        upper.rotation_euler[1]=(-.12 if side=='L' else .12)
        orb(prefix+' '+side+' hand',(x+dx*1.12,-.015,.83),(.105,.12,.13),leather)
        box(prefix+' '+side+' wrist cuff',(x+dx*1.1,-.02,.96),(.21,.23,.09),iron,.015)
    orb(prefix+' head',(x,0,1.82),(.23,.22,.27),skin)
    cylinder(prefix+' neck',(x,0,1.57),.11,.20,skin,vertices=10)
    # Deep-set eyes and uneven brow lines give these adults a human read.
    for dx in (-.085,.085):
        orb(prefix+' eye socket',(x+dx,-.202,1.87),(.058,.024,.040),iron)
        orb(prefix+' eye',(x+dx,-.222,1.875),(.026,.014,.022),bone)
        box(prefix+' brow',(x+dx,-.217,1.925),(.105,.038,.028),darkcloth,.01)
    orb(prefix+' nose',(x,-.238,1.80),(.047,.064,.075),skin)
    box(prefix+' mouth',(x,-.213,1.72),(.115,.025,.025),leather,.008)
    # Individually readable silhouettes: scarf, cap, tied hair, or a patched hood.
    if headwear=='grey-knot':
        orb(prefix+' silver hair knot',(x,.04,2.09),(.24,.22,.12),bone)
        orb(prefix+' pinned knot',(x,.16,2.10),(.095,.09,.09),iron)
    elif headwear=='cap':
        box(prefix+' driver cap',(x,0,2.06),(.43,.38,.14),gear,.035)
    elif headwear=='goggles':
        box(prefix+' respirator',(x,-.205,1.77),(.28,.12,.15),iron,.025)
        for dx in (-.095,.095): cylinder(prefix+' amber goggle',(x+dx,-.226,1.92),.07,.035,amber,(math.pi/2,0,0),12)
        box(prefix+' ash hood',(x,0,2.02),(.48,.39,.15),grey,.04)
    else:
        box(prefix+' head wrap',(x,0,2.06),(.42,.36,.12),gear,.025)
        box(prefix+' scarf',(x,-.225,1.62),(.42,.08,.16),gear,.02)
    strap=box(prefix+' shoulder webbing',(x+.02,-.245,1.14),(.09,.035,.48),leather,.012)
    strap.rotation_euler[1]=-.31 if idx%2 else .31
    box(prefix+' tool roll',(x+.34,.04,1.12),(.18,.24,.31),gear,.025)
    for j in range(3):
        box(prefix+f' hem patch {j}',(x-.24+j*.20,-.192,.82),(.12,.025,.065),rust if j==1 else iron,.006)
    for j in range(4):
        orb(prefix+f' seam rivet {j}',(x-.27+j*.18,-.218,.72+(j%2)*.06),(.018,.012,.018),iron)
    # Welded shoulder scrap, asymmetrical on purpose.
    box(prefix+' shoulder scrap',(x-.39,-.02,1.42),(.25,.31,.19),rust,.025)
    for j in range(2):
        orb(prefix+f' shoulder bolt {j}',(x-.39,-.19,1.39+j*.07),(.026,.02,.026),iron)
    # Expose a compact raider-style deform rig with stable names for later use.
    arm=bpy.data.armatures.new(prefix+' raider rig')
    rig=bpy.data.objects.new(prefix+' armature',arm); scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig; rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bones=[('root',(x,0,0),(x,0,.15),None),('pelvis',(x,0,.94),(x,0,1.09),'root'),
           ('chest',(x,0,1.09),(x,0,1.47),'pelvis'),('neck',(x,0,1.47),(x,0,1.56),'chest'),
           ('head',(x,0,1.56),(x,0,1.8),'neck')]
    for side,suffix in [(-1,'L'),(1,'R')]:
        bones.extend([('thigh.'+suffix,(x+side*.108,0,.94),(x+side*.15,-.033,.56),'pelvis'),
            ('shin.'+suffix,(x+side*.15,-.033,.56),(x+side*.173,0,.20),'thigh.'+suffix),
            ('foot.'+suffix,(x+side*.173,0,.20),(x+side*.175,-.18,.06),'shin.'+suffix),
            ('upper_arm.'+suffix,(x+side*.235,0,1.425),(x+side*.279,-.014,1.18),'chest'),
            ('forearm.'+suffix,(x+side*.279,-.014,1.18),(x+side*.293,-.043,.95),'upper_arm.'+suffix)])
    for bn,head,tail,parent in bones:
        b=arm.edit_bones.new(bn); b.head=head; b.tail=tail
        if parent: b.parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT'); rig.select_set(False)
    rig.parent=root_obj
    for o in list(scene.objects):
        if o is rig or o is root_obj or o.name.startswith(prefix+' '):
            if o is not root_obj:
                o.parent=rig if o.type=='MESH' else root_obj
                if o.type=='MESH':
                    mod=o.modifiers.new('raider skin','ARMATURE'); mod.object=rig
                    label=o.name.lower()
                    suffix='L' if ' l ' in label or '.l' in label else 'R'
                    if any(k in label for k in ('head','hair','eye','brow','nose','mouth','goggle')): bone_name='head'
                    elif 'boot' in label: bone_name='foot.'+suffix
                    elif any(k in label for k in ('trouser','knee','hem')): bone_name='thigh.'+suffix
                    elif any(k in label for k in ('arm','sleeve','hand','wrist')): bone_name='upper_arm.'+suffix
                    else: bone_name='chest'
                    group=o.vertex_groups.new(name=bone_name); group.add(list(range(len(o.data.vertices))),1,'REPLACE')
            all_objects.append(o)

# Staged for a single Blender-rendered comparison sheet; additional six clean
# views stay private evidence and document the cast at full size.
def area(obj, energy, size):
    obj.data.energy=energy; obj.data.shape='DISK'; obj.data.size=size

bpy.ops.object.light_add(type='AREA',location=(0,-8,8)); area(bpy.context.object,1800,8)
bpy.ops.object.light_add(type='AREA',location=(4,3,5)); area(bpy.context.object,1000,6)
floor_mat=mat('dust-packed yard earth',(.085,.071,.052),0,.98)
bpy.ops.mesh.primitive_plane_add(size=30, location=(0,0,-.025)); ground=bpy.context.object
ground.name='dust ground'; ground.data.materials.append(floor_mat)
evidence.mkdir(parents=True,exist_ok=True); out.parent.mkdir(parents=True,exist_ok=True); blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
for view, location in [('front',(0,-16,4.4)),('side',(16,0,4.4)),('rear',(0,16,4.4))]:
    bpy.ops.object.camera_add(location=location); cam=bpy.context.object
    target=Vector((0,0,1.04))
    if view=='side':
        target=Vector((0,0,1.04)); cam.location=Vector((16,0,4.4))
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'; cam.data.ortho_scale=3.3 if view=='side' else 13.7; scene.camera=cam
    scene.render.filepath=str(evidence/f'folk-{view}.png')
    bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in scene.objects:
    if ob.type in {'MESH','ARMATURE','EMPTY'} and ob.name != 'dust ground': ob.select_set(True)
bpy.context.view_layer.objects.active=next(ob for ob in scene.objects if ob.type=='EMPTY')
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,
                          export_animations=False,export_apply=True)
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'triangles':sum(len(p.vertices)-2 for ob in scene.objects if ob.type=='MESH' for p in ob.data.polygons)}))
