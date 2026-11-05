"""Build Scablands folk from the shipped crew body and raider rig.

Run: blender -b --python tools/blender/scablands-folk.py -- --root . --round 2
Blender Z-up; GLB export is Y-up. WW-SCENE wires the selected art later.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--paths-only', action='store_true')
p.add_argument('--round', type=int, default=2)
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/folk.glb'
blend = root / 'art-build/scablands-folk.blend'
evidence = root / '.evidence/2026-11-05/WW-ART-FOLK'
sheet = root / 'docs/board/looks/ww-art-folk/round-2.jpg'
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
rust = mat('salt-flats rusted salvage', (.31,.16,.078), .24, .88)
iron = mat('rustwall dark weathered steel', (.075,.09,.09), .55, .84)
leather = mat('cracked brown leather', (.19,.095,.04), .05)
grey = mat('Ash Men ash-grey cloth', (.12,.13,.13))
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

# Cast roles and costume materials follow the Tin Town and Ash Men story.
folk = [
 ('Auntie Solder','tintown-worker',green,leather,'grey-knot'),
 ('Moss','gas-hauler',darkcloth,leather,'cap'),
 ('Tin Town resident 1','townsfolk',cloth,leather,'wrap'),
 ('Tin Town resident 2','townsfolk',bone,darkcloth,'hood'),
 ('Tin Town resident 3','townsfolk',green,leather,'scarf'),
 ('Ash Man raider 1','ash-raider',grey,rust,'goggles'),
 ('Ash Man raider 2','ash-raider',darkcloth,rust,'goggles'),
]
# Replace the round-one block-built bodies with the actual shipped crew body
# and raider skeleton. All seven copies share its mesh and atlas; only salvage
# clothes and character-scale changes differ. This keeps the rig and budget.
cast_names=['auntie-solder','moss','tin-town-resident-1','tin-town-resident-2',
            'tin-town-resident-3','ash-man-raider-1','ash-man-raider-2']
for obj in list(scene.objects):
    if any(obj.name.startswith(prefix) for prefix in cast_names):
        bpy.data.objects.remove(obj,do_unlink=True)
source_start=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/wasteland/crew/rook.glb'))
source_objects=[obj for obj in scene.objects if obj not in source_start]
source_rig=next(obj for obj in source_objects if obj.type=='ARMATURE')
source_meshes=[obj for obj in source_objects if obj.type=='MESH' and obj.name.startswith('rook-near')]
# The shipped far LOD is scene-selected by runtime distance and must not overlap
# the near mesh in this static review/export. The tiny importer helper is not art.
for obj in source_objects:
    if obj is not source_rig and obj not in source_meshes:
        bpy.data.objects.remove(obj,do_unlink=True)
source_rig.name='shipped Rook comparison rig'
source_rig.location.x=-8.0
cast=[]
wardrobe={}
rig_roots={}
def add_wear(name,rig,material,loc,size,bone='chest',bevel=.02,rotation=0):
    obj=box(name,loc,size,material,bevel)
    obj.rotation_euler[1]=rotation
    # Costume pieces follow the actor root. The body keeps the crew skeleton;
    # rigid armor and tools stay put instead of being warped by a single bone.
    obj.parent=rig_roots[rig]
    obj.matrix_parent_inverse=rig_roots[rig].matrix_world.inverted()
    cast.append(obj)
    wardrobe.setdefault(rig,[]).append(obj)
    return obj
def add_canister(name,rig,loc):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.08,depth=.22,
                                        location=loc,rotation=(math.pi/2,0,0))
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(iron)
    bevel=obj.modifiers.new('worn canister rim','BEVEL'); bevel.width=.012; bevel.segments=1
    obj.parent=rig_roots[rig]; obj.matrix_parent_inverse=rig_roots[rig].matrix_world.inverted()
    cast.append(obj); wardrobe.setdefault(rig,[]).append(obj)
for idx,(name,role,coat,gear,headwear) in enumerate(folk):
    prefix=name.lower().replace(' ','-')
    x=(idx-3)*1.65
    root_obj=bpy.data.objects.new(prefix+' root',None); scene.collection.objects.link(root_obj)
    rig=source_rig.copy(); rig.data=source_rig.data; scene.collection.objects.link(rig)
    rig.name=prefix+' crew raider rig'; rig.location.x=0; rig.parent=root_obj
    root_obj.location.x=x
    root_obj.scale=(1.22,1,.90) if name=='Moss' else ((.88,1,1.12) if name=='Auntie Solder' else (1,1,1))
    rig_roots[rig]=root_obj
    cast.extend([root_obj,rig])
    for original in source_meshes:
        body=original.copy(); body.data=original.data
        scene.collection.objects.link(body); body.name=prefix+' '+original.name
        body.parent=rig; body.matrix_parent_inverse.identity()
        for modifier in body.modifiers:
            if modifier.type=='ARMATURE': modifier.object=rig
        cast.append(body)
    # Outfits are role-specific so the cast reads by silhouette first.
    if headwear=='grey-knot':
        add_wear(prefix+' raised welder visor',rig,iron,(x,-.06,2.06),(.22,.10,.075),'head',.014)
        add_wear(prefix+' mask glass',rig,amber,(x,-.115,2.06),(.14,.012,.022),'head',.003)
        add_wear(prefix+' heavy smith apron',rig,leather,(x,-.22,.63),(.44,.065,.68),'chest',.022)
        for j in range(5): add_wear(prefix+f' apron weld seam {j}',rig,rust,(x-.17+j*.085,-.258,.42),(.025,.014,.22),'chest',.003)
    elif headwear=='cap':
        add_canister(prefix+' gas filter canister',rig,(x+.25,-.15,1.28))
        for j in range(3): add_wear(prefix+f' filter rib {j}',rig,rust,(x+.25,-.273,1.24+j*.04),(.10,.01,.012),'chest',.003)
        add_wear(prefix+' hose sleeve',rig,leather,(x+.28,.01,1.12),(.06,.06,.32),'chest',.018,.28)
    elif role=='ash-raider':
        # Ash Men get long, split dust coats with uneven armour patches and ties.
        for side in (-1,1):
            add_wear(prefix+f' long coat panel {side}',rig,grey,(x+side*.21,-.13,.69),(.18,.07,.91),'chest',.012,side*.06)
            add_wear(prefix+f' trailing dust coat {side}',rig,grey,(x+side*.27,.16,.72),(.14,.08,.90),'chest',.01,side*.07)
            add_wear(prefix+f' torn coat hem {side}',rig,rust,(x+side*.21,.025,.23),(.13,.10,.12),'chest',.005)
        for j in range(3):
            add_wear(prefix+f' salvage coat plate {j}',rig,rust if j%2 else iron,
                     (x-.23+(j%2)*.46,-.19,.55+(j//2)*.29),(.14,.025,.19),'chest',.006,(-1 if j%2 else 1)*.08)
        add_wear(prefix+' soot scarf',rig,darkcloth,(x,-.24,1.53),(.38,.06,.14),'chest',.012)
        for side in (-1,1): add_wear(prefix+f' amber goggles {side}',rig,amber,(x+side*.085,-.24,1.77),(.09,.035,.065),'head',.02)
    elif name.startswith('Tin Town resident'):
        add_wear(prefix+' canvas shoulder wrap',rig,coat,(x+.24,-.18,1.25),(.12,.06,.48),'chest',.012,.12)
        add_wear(prefix+' tool roll',rig,leather,(x+.34,.04,1.04),(.18,.20,.28),'chest',.018)
    else:
        add_wear(prefix+' asymmetrical work vest',rig,gear,(x-.12,-.20,1.20),(.18,.05,.40),'chest',.018,.05)
    # Individual scorched/rusted plates and hanging ties make wear uneven.
    for j in range(2):
        add_wear(prefix+f' rust patch {j}',rig,rust if j==0 else iron,
                 (x-.18+j*.32,-.245,.75+j*.23),(.075,.018,.07),'chest',.004,.12-j*.22)
for rig,parts in wardrobe.items():
    # One wardrobe mesh per actor keeps the GLB compact and preserves its material slots.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    parts[0].name=rig.name.replace(' crew raider rig','')+' welded clothing'

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
# Three readable art views: full lineup at 40 m from car height, then a
# three-quarter and detail view of the named leads. A crew GLB is staged beside
# the cast for shape comparison, but is excluded from the folk export.
crew_objects=source_objects
views=[
    ('car-height-40m',(-1.5,-40,1.2),Vector((-1.5,0,1.05)),90,'row'),
    ('three-quarter',(2.85,-9,4.0),Vector((-4.15,0,1.05)),58,'leads'),
    ('close',(-.35,-4.8,2.25),Vector((-4.15,0,1.45)),72,'leads'),
]
renders=[]
for view,location,target,lens,kind in views:
    bpy.ops.object.camera_add(location=location); cam=bpy.context.object
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='PERSP'; cam.data.lens=lens; scene.camera=cam
    cam.data.dof.use_dof=False
    scene.render.resolution_x=1800 if kind=='row' else 1200
    scene.render.resolution_y=820
    scene.render.filepath=str(evidence/f'folk-{view}.png')
    bpy.ops.render.render(write_still=True)
    renders.append(scene.render.filepath)
# The same flattened JPG is the round comparison sheet; Blender's NumPy
# buffers keep the old evidence and the new renders together without a new tool.
import numpy as np
old=bpy.data.images.load(str(sheet.with_name('round-1.jpg')),check_existing=False)
tiles=[old,*[bpy.data.images.load(path,check_existing=False) for path in renders]]
canvas=bpy.data.images.new('WW-ART-FOLK rounds comparison',width=1600,height=410,alpha=False)
pixels=np.zeros((410,1600,4),dtype=np.float32); pixels[:,:,:3]=(.10,.105,.10); pixels[:,:,3]=1
def paste(image,x,y,w,h):
    iw,ih=image.size; src=np.empty(iw*ih*4,dtype=np.float32); image.pixels.foreach_get(src)
    src=src.reshape(ih,iw,4)[::-1]
    scale=min(w/iw,h/ih); nw,nh=max(1,round(iw*scale)),max(1,round(ih*scale))
    image.scale(nw,nh); dst=np.empty(nw*nh*4,dtype=np.float32); image.pixels.foreach_get(dst)
    dst=dst.reshape(nh,nw,4)[::-1]
    pixels[y+(h-nh)//2:y+(h-nh)//2+nh,x+(w-nw)//2:x+(w-nw)//2+nw]=dst
paste(tiles[0],12,80,520,310)
for i,tile in enumerate(tiles[1:]): paste(tile,544+i*350,80,340,310)
glyphs={
 'A':['01110','10001','10001','11111','10001','10001','10001'],
 'C':['01111','10000','10000','10000','10000','10000','01111'],
 'E':['11111','10000','10000','11110','10000','10000','11111'],
 'D':['11110','10001','10001','10001','10001','10001','11110'],
 'H':['10001','10001','10001','11111','10001','10001','10001'],
 'M':['10001','11011','10101','10101','10001','10001','10001'],
 'N':['10001','11001','10101','10011','10001','10001','10001'],
 'O':['01110','10001','10001','10001','10001','10001','01110'],
 'Q':['01110','10001','10001','10001','10101','10010','01101'],
 'R':['11110','10001','10001','11110','10100','10010','10001'],
 'S':['01111','10000','10000','01110','00001','00001','11110'],
 'T':['11111','00100','00100','00100','00100','00100','00100'],
 'U':['10001','10001','10001','10001','10001','10001','01110'],
 'V':['10001','10001','10001','10001','10001','01010','00100'],
 'W':['10001','10001','10001','10101','10101','11011','10001'],
 'L':['10000','10000','10000','10000','10000','10000','11111'],
 '1':['010','110','010','010','010','010','111'],
 '2':['11110','00001','00010','00100','01000','10000','11111'],
 '3':['11110','00001','00001','01110','00001','00001','11110'],
 '4':['10010','10010','10010','11111','00010','00010','00010'],
 '0':['01110','10001','10011','10101','11001','10001','01110'],
 ' ':['000']*7,
}
def label(text,x,y):
    for char in text:
        rows=glyphs.get(char,glyphs[' '])
        for gy,row in enumerate(rows):
            for gx,pixel in enumerate(row):
                if pixel=='1': pixels[y+gy*3:y+(gy+1)*3,x+gx*3:x+(gx+1)*3,:3]=(.88,.84,.74)
        x+=(len(rows[0])+1)*3
label('ROUND 1',24,18)
label('ROUND 2',544,18)
label('40M ROW',560,48)
label('THREE QUARTER',910,48)
label('CLOSE',1260,48)
canvas.pixels.foreach_set(pixels[::-1].reshape(-1))
canvas.filepath_raw=str(sheet); canvas.file_format='JPEG'; scene.render.image_settings.quality=76
canvas.save()
for image in tiles: bpy.data.images.remove(image)
bpy.data.images.remove(canvas)
bpy.ops.object.select_all(action='DESELECT')
for ob in scene.objects:
    if ob.type in {'MESH','ARMATURE','EMPTY'} and ob.name != 'dust ground' and ob not in crew_objects: ob.select_set(True)
bpy.context.view_layer.objects.active=next(ob for ob in scene.objects if ob.type=='EMPTY' and ob not in crew_objects)
# Keep enough texture resolution for game distance and trim redundant mesh
# detail while preserving the crew proportions and the full raider skeleton.
for image in list(bpy.data.images):
    if image.name.startswith('rook-color') and image.size[0]>512: image.scale(512,512)
    elif image.name.startswith('rook-surface') and image.size[0]>256: image.scale(256,256)
for ob in scene.objects:
    if ob.type=='MESH' and ob.name.endswith('rook-near'):
        decimate=ob.modifiers.new('compact crew fidelity','DECIMATE'); decimate.ratio=.58
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,
                          export_animations=False,export_apply=True)
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'triangles':sum(len(p.vertices)-2 for ob in scene.objects if ob.type=='MESH' for p in ob.data.polygons)}))
