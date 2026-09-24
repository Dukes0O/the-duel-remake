"""Author and export the actual runtime landmarks in Blender (headless).

blender -b --python tools/build-course-landmarks.py -- --root PATH --revision 1
The .blend is editable source; baked mesh JSON is the browser's real geometry.
Preview renders are rebuildable review output, never runtime placeholders.
"""
import argparse
import json
import math
import os
import sys
from pathlib import Path

args = argparse.ArgumentParser()
args.add_argument('--root', required=True)
args.add_argument('--revision', type=int, default=1)
args.add_argument('--paths-only', action='store_true')
options = args.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(options.root).resolve()
destination = root / 'src/generated/course-landmarks.json'
native = root / 'art-build/course-landmarks.blend'
if options.paths_only:
    print(json.dumps({'blend': [str(native)], 'glb': [], 'json': [str(destination)]}))
    sys.exit(0)

import bpy
import bmesh
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 24
bpy.context.scene.render.resolution_x = 960
bpy.context.scene.render.resolution_y = 720
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.world.color = (.25, .3, .36)
bpy.context.scene.view_settings.view_transform = 'AgX'
materials = {}


def material(name, color, roughness=.7, metallic=0, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Emission Color'].default_value = (*color, 1)
    bsdf.inputs['Emission Strength'].default_value = emission
    materials[name] = {'color': list(color), 'roughness': roughness, 'metalness': metallic, 'emission': emission}
    return m


stone = material('weathered limestone', (.52, .49, .41))
lightstone = material('warm cut stone', (.73, .68, .52))
wood = material('aged cedar', (.24, .13, .064))
woodlight = material('cut timber edges', (.42, .25, .12))
roofmat = material('terracotta roof', (.48, .19, .08))
slate = material('slate roof', (.14, .19, .18))
steel = material('port steel', (.15, .25, .29), .4, .7)
black = material('window shadow', (.025, .055, .07), .28, .25)
sand = material('red sandstone', (.57, .30, .15))
white = material('ivory concrete', (.79, .80, .73), .6)
glass = material('blue glazing', (.17, .35, .41), .2, .45)
cyan = material('cyan strip', (.03, .65, .82), .3, .3, 2)
magenta = material('magenta strip', (.68, .04, .30), .3, .2, 2)
amber = material('amber lamp', (.95, .48, .1), .3, .1, 2)

assets = {}
current = None


def register(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    current.objects.link(obj)
    return obj


def box(name, size, position, mat, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = register(bpy.context.object, name, mat)
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('soft manufactured edges', 'BEVEL')
        modifier.width = min(bevel, min(size) * .15)
        modifier.segments = 1
    return obj


def beam(name, a, b, width, mat):
    delta = Vector(b) - Vector(a)
    obj = box(name, (width, width, delta.length), (Vector(a) + Vector(b)) * .5, mat, .015)
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    return obj


def mesh(name, vertices, faces, mat):
    geo = bpy.data.meshes.new(name)
    geo.from_pydata(vertices, [], faces)
    geo.update()
    # Closed authored pieces must face outward in the browser's one-sided PBR
    # materials as well as Blender's two-sided preview materials.
    bm = bmesh.new(); bm.from_mesh(geo)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(geo); bm.free()
    obj = bpy.data.objects.new(name, geo)
    current.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def roof(name, width, depth, eave, rise, mat):
    return mesh(name, [(-width/2,-depth/2,eave),(width/2,-depth/2,eave),(0,-depth/2,eave+rise),
                       (-width/2,depth/2,eave),(width/2,depth/2,eave),(0,depth/2,eave+rise)],
                [(0,1,2),(5,4,3),(0,3,4,1),(0,2,5,3),(2,1,4,5)], mat)


def rail(a, b, z, mat=wood):
    beam('handrail', (*a,z), (*b,z), .13, mat)
    length = (Vector(b) - Vector(a)).length
    for i in range(max(2,int(length/.65))+1):
        t = i/max(2,int(length/.65)); p = Vector(a).lerp(Vector(b),t)
        beam('baluster', (*p,z-1.05), (*p,z), .075, mat)


def arch(x, y, z, radius, depth, mat):
    # Freestanding stone arch ring, open in the middle rather than a dark decal.
    for i in range(12):
        a,b = i*math.pi/12,(i+1)*math.pi/12
        vertices=[(x+r*math.cos(t),y+dy,z+r*math.sin(t))
                  for dy in [-depth/2,depth/2] for r in [radius,radius+.35] for t in [a,b]]
        mesh('arch voussoir',vertices,[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],mat)


def lodge():
    box('stone foundation',(9,7,2.8),(0,0,1.4),stone)
    box('timber floor',(10,8,.35),(0,0,3),woodlight)
    box('enclosed watch room',(5,4,3),(0,1,4.65),wood)
    for x in [-4.4,0,4.4]:
        for y in [-3.3,3.3]: beam('lodge post',(x,y,3.2),(x,y,7.1),.32,woodlight)
    for x in [-4.4,4.4]:
        rail((x,-3.3),(x,3.3),4.3)
        beam('knee brace',(x,-3.3,5.8),(x,-1.9,7),.2,wood)
    rail((-4.4,-3.3),(4.4,-3.3),4.3)
    for x in [-1.7,0,1.7]:box('watch glazing',(1.2,.08,1.5),(x,-1.05,5.2),black)
    roof('large overhanging gable',11.5,9,7.1,2.4,slate)
    for y in [-4.5,4.5]:
        beam('gable edge',(-5.75,y,7.1),(0,y,9.5),.23,woodlight)
        beam('gable edge',(0,y,9.5),(5.75,y,7.1),.23,woodlight)
    if options.revision >= 2:
        for y in [-3.4,-2.2,-1,0.2,1.4,2.6,3.8]:
            beam('roof batten',(-5.65,y,7.19),(0,y,9.58),.075,wood)
            beam('roof batten',(0,y,9.58),(5.65,y,7.19),.075,wood)
        for row in range(5):
            for col in range(10):box('foundation block',(0.82,.08,.42),(-4.08+col*.9,-3.53,.3+row*.5),lightstone,.025)


def gallery():
    box('gallery foundation',(24,10,.6),(0,0,.3),stone)
    box('rock-side wall',(24,.9,9),(0,4.55,4.8),stone)
    box('gallery roof',(25,10.8,1.1),(0,0,9.8),stone)
    for x in [-11,-5.5,0,5.5,11]:
        beam('splayed buttress',(x,-4.6,.6),(x,-3.4,9.4),1.15,lightstone)
        box('buttress capital',(1.8,1.8,.6),(x,-3.4,9.15),lightstone)
    for x in [-8.25,-2.75,2.75,8.25]:
        box('warm recessed fixture',(1,.45,.15),(x,-.8,9.15),amber)
    if options.revision >= 2:
        for row in range(2):
            for x in range(-11,12,2):box('jointed fascia stone',(1.88,.13,.38),(x+(row%2)*.3,-5.44,9.58+row*.44),lightstone,.025)
        box('roof coping',(25.5,.5,.35),(0,-5.3,10.55),lightstone)


def pavilion():
    box('stone podium',(16,10,2),(0,0,1),stone)
    box('pavilion deck',(17,11,.35),(0,0,2.1),lightstone)
    box('recessed glazing',(13,.25,4),(0,2,4.4),black)
    for x in [-6,-2,2,6]:
        box('arcade pillar',(.65,.8,3.5),(x,-3.5,3.95),lightstone)
    for x in [-4,0,4]:arch(x,-3.5,5.65,1.65,.9,lightstone)
    roof('terracotta hip silhouette',17.6,11.6,7.65,2.25,roofmat)
    for x in [-7.7,7.7]:rail((x,-4.4),(x,4.4),3.45,lightstone)
    if options.revision >= 2:
        for y in [-5.5+i*.55 for i in range(21)]:
            for side in [-1,1]:beam('terracotta seam',(side*8.78,y,7.72),(0,y,9.97),.08,roofmat)
        for side in [-1,1]:box('cornice band',(18,.34,.26),(0,side*5.7,7.55),lightstone)


def tower():
    box('sandstone plinth',(11,9,1.4),(0,0,.7),sand)
    box('tower base',(7,6,5.5),(0,0,4),sand)
    box('stepped tower',(6,5,4),(0,0,8.6),sand)
    for z in [3.2,6.8,10.5]:box('stone ledge',(7.7,6.7,.35),(0,0,z),lightstone)
    for x in [-2.7,2.7]:
        for y in [-2.5,2.5]:beam('sunshade post',(x,y,10.6),(x,y,13.1),.26,wood)
    for x in [-3.5,-2.5,-1.5,-.5,.5,1.5,2.5,3.5]:beam('open pergola',(x,-3.6,13.15),(x,3.6,13.15),.22,woodlight)
    for z in [4.3,8.6]:
        for x in [-1.7,1.7]:box('deep narrow window',(.6,.09,1.4),(x,-3.02 if z<5 else -2.52,z),black)
    if options.revision >= 2:
        for i in range(7):box('stair tread',(1.5,1,.28),(-4.5,-3.6+i*.75,.2+i*.24),sand)
        for z in [1.5,2.4,4,5,7.2,8,9.4]:
            half,front=(3.48,-3.04) if z<6.8 else (2.98,-2.54)
            beam('masonry course',(-half,front,z),(half,front,z),.035,wood)


def gantry():
    for x in [-10,10]:
        box('concrete pier',(3.5,5,1.5),(x,0,.75),stone)
        for y in [-1.6,1.6]:beam('gantry leg',(x,y,1.5),(x,y,16),.5,steel)
        for z in [2,6,10]:
            beam('leg X brace',(x,-1.6,z),(x,1.6,z+4),.22,steel)
            beam('leg X brace',(x,1.6,z),(x,-1.6,z+4),.22,steel)
    for y in [-1.6,1.6]:
        for z in [13,16]:beam('long chord',(-12,y,z),(12,y,z),.42,steel)
        for i in range(8):beam('triangular truss',(-12+i*3,y,13 if i%2 else 16),(-9+i*3,y,16 if i%2 else 13),.2,steel)
        beam('cyan edge',(-11,y,12.85),(11,y,12.85),.09,cyan)
    for x in [-6,0,6]:
        beam('pendant cable',(x,0,13),(x,0,10.8),.07,steel)
        box('lamp shade',(1.3,.9,.4),(x,0,10.65),steel)
        box('lamp face',(1.1,.7,.08),(x,0,10.4),amber)
    if options.revision >= 2:
        box('operator cabin',(3.5,3.5,2.5),(7,0,14.3),steel)
        box('cabin glass',(2.8,.08,1.3),(7,-1.8,14.55),glass)
        beam('magenta leg',(-10,-1.85,2),(-10,-1.85,12.8),.1,magenta)


def skydeck():
    box('low foundation',(15,9,1.2),(0,0,.6),stone)
    for x in [-5,5]:beam('angled pavilion column',(x,2,1.2),(x,-.8,7.3),.45,steel)
    box('cantilever deck',(21,12,.5),(0,-.6,2.1),white)
    box('glazed central room',(9,5,4.8),(0,1,4.75),glass)
    mesh('wing roof',[(-12,-8,8.5),(12,-6,7.7),(9,6,7.5),(-8,6,8.3),(-12,-8,8.85),(12,-6,8.05),(9,6,7.85),(-8,6,8.65)],
         [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],white)
    rail((-10,-6),(10,-6),3.55,steel)
    for x in [-10,10]:rail((x,-6),(x,5),3.55,steel)
    if options.revision >= 2:
        for x in [-4,-2,0,2,4]:beam('glazing mullion',(x,-1.54,2.4),(x,-1.54,7.1),.08,steel)
        for x in [-8,8]:box('viewing bench',(3,.8,.4),(x,1,2.55),woodlight)


builders={'lodge':lodge,'gallery':gallery,'pavilion':pavilion,'tower':tower,'gantry':gantry,'skydeck':skydeck}
for name, build in builders.items():
    current=bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(current)
    build()
    assets[name]=current

# Export evaluated, bevelled triangles grouped by material. Each browser model
# uses the same local coordinates as its native Blender source, converted Z→Y.
export={'revision':options.revision,'materials':materials,'assets':{}}
depsgraph=bpy.context.evaluated_depsgraph_get()
for name, collection in assets.items():
    groups={}
    for obj in collection.objects:
        evaluated=obj.evaluated_get(depsgraph); geo=evaluated.to_mesh(); geo.calc_loop_triangles()
        mat=obj.data.materials[0].name
        group=groups.setdefault(mat,{'positions':[],'normals':[]})
        for triangle in geo.loop_triangles:
            for index in triangle.vertices:
                v=evaluated.matrix_world @ geo.vertices[index].co
                n=(evaluated.matrix_world.to_3x3() @ triangle.normal).normalized()
                group['positions'].extend(round(value,5) for value in (v.x,v.z,-v.y))
                group['normals'].extend(round(value,5) for value in (n.x,n.z,-n.y))
        evaluated.to_mesh_clear()
    export['assets'][name]=groups
destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(json.dumps(export,separators=(',',':')),encoding='utf-8')

# Render genuine Blender previews for iterative inspection; each collection can
# also be opened and edited separately in the retained native file.
bpy.ops.object.light_add(type='AREA',location=(12,-15,24))
key=bpy.context.object; key.data.energy=4000; key.data.shape='DISK'; key.data.size=12
key.rotation_euler=(Vector((0,0,5))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,20)); bpy.context.object.data.energy=2
bpy.context.object.rotation_euler=(.45,-.4,-.4)
bpy.ops.object.camera_add(location=(28,-34,24))
camera=bpy.context.object; camera.rotation_euler=(Vector((0,0,5))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=35
bpy.context.scene.camera=camera
review=root/'.qa-art'; review.mkdir(exist_ok=True)
for name, collection in assets.items():
    for other in assets.values():other.hide_render=other!=collection; other.hide_viewport=other!=collection
    bpy.context.scene.render.filepath=str(review/f'{name}-r{options.revision}.png')
    bpy.ops.render.render(write_still=True)
# Open the native source on the first model, not six overlapping landmarks.
# The named collections let an artist switch to any of the other five assets.
for name, collection in assets.items():collection.hide_render=name!='lodge';collection.hide_viewport=name!='lodge'
native.parent.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(native))
print('LANDMARK_EXPORT',destination,'triangles',sum(len(g['positions'])//9 for a in export['assets'].values() for g in a.values()))
