"""Blender -b -t 4 -P tools/blender/open-figures.py -- --root ."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
town = args.root.resolve() / 'public/assets/models/wasteland/town'
output = town / 'open-figures.glb'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(output)]}))
    sys.exit()

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(town / 'story-walkers.glb'))
scene = bpy.context.scene
rig = next(obj for obj in scene.objects if obj.type == 'ARMATURE')
donors = {'walker-g': 'odessa', 'walker-vane': 'moss', 'walker-b': 'tin-cook',
          'walker-e': 'tin-porter', 'walker-kid-a': 'tin-child'}
for obj in list(scene.objects):
    if obj.type == 'MESH':
        source = obj.name.removeprefix('skin-')
        if source in donors:
            obj.name = 'skin-' + donors[source]
        else:
            bpy.data.objects.remove(obj, do_unlink=True)

def finish(obj, name, bone, colour, action=''):
    obj.name = owner + '_' + (action or 'wear') + '_' + name
    mat = bpy.data.materials.get(colour) or bpy.data.materials.new(colour)
    mat.diffuse_color = (*palette[colour], 1)
    mat.roughness = .88
    obj.data.materials.append(mat)
    matrix = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    bpy.context.view_layer.update()
    obj.matrix_world = matrix
    return obj

palette = {'hide': (.17,.072,.032), 'soot': (.038,.042,.039), 'steel': (.18,.21,.20),
           'glass': (.027,.083,.071), 'canvas': (.33,.24,.125), 'rust': (.32,.12,.047),
           'rag': (.48,.37,.25), 'oil': (.078,.076,.055), 'denim': (.092,.14,.16)}

def oval(name, bone, pos, size, colour, action=''):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=pos)
    obj = bpy.context.object
    obj.scale = size
    bpy.context.view_layer.update()
    return finish(obj, name, bone, colour, action)

def rod(name, bone, a, b, radius, colour, action=''):
    delta = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=delta.length,
                                         location=(Vector(a)+Vector(b))*.5)
    obj = bpy.context.object
    obj.rotation_euler = delta.to_track_quat('Z','Y').to_euler()
    bpy.context.view_layer.update()
    return finish(obj,name,bone,colour,action)

def cloth(name, bone, rows, colour):
    # Three panels follow the body around both flanks, with a raised centre fold.
    points = [(x*w, y + abs(x)*.072, z + (.012 if x == 1 else 0))
              for z,w,y in rows for x in (-1,-.34,.28,1)]
    faces = [(i,i+1,i+5,i+4) for i in range(len(points)-4) if i%4 != 3]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    return finish(obj,name,bone,colour)

owner = 'odessa'
cloth('split-leather-apron','chest',[(1.39,.125,-.16),(1.2,.22,-.18),(.98,.225,-.17),(.68,.24,-.14)],'hide')
oval('raised-welding-hood','head',(0,-.063,1.80),(.174,.14,.115),'soot')
oval('green-lens','head',(0,-.18,1.82),(.116,.034,.048),'glass')
for side, x in [('L',-.34),('R',.34)]:
    oval('gauntlet'+side,'hand.'+side,(x,-.035,.935),(.062,.072,.104),'hide')
rod('torch','hand.R',(.33,-.04,.91),(.33,-.28,.94),.022,'steel','weld')
rod('billet','hand.L',(-.34,-.04,.92),(.25,-.04,.92),.054,'steel','carry')

owner = 'moss'
cloth('overall-bib','chest',[(1.37,.14,-.157),(1.18,.18,-.16),(.96,.196,-.158)],'denim')
oval('fuel-stain','chest',(.062,-.157,1.07),(.084,.017,.073),'oil')
oval('pocket-rag','pelvis',(.14,.13,.91),(.07,.036,.15),'rag')
rod('scrubbing-shaft','hand.R',(.34,.13,1.13),(.34,-.65,.28),.016,'canvas','scrub')
rod('brush-stock','hand.R',(.20,-.65,.28),(.48,-.65,.28),.042,'hide','scrub')
for i in range(10):
    rod('bristle'+str(i),'hand.R',(.21+i*.029,-.65,.27),(.21+i*.029,-.67,.20),.014,'rag','scrub')
bpy.ops.mesh.primitive_cone_add(vertices=18,radius1=.105,radius2=.138,depth=.22,end_fill_type='NOTHING',location=(.34,-.04,.62))
finish(bpy.context.object,'pail','hand.R','steel','carry-bucket')
for x in (.21,.47):
    rod('bail','hand.R',(x,-.04,.72),(.34,-.04,.93),.009,'soot','carry-bucket')

for owner in ('tin-cook','tin-porter','tin-child'):
    rod('ladle-stem','hand.R',(.33,-.04,.94),(.34,-.34,.84),.014,'hide','cook')
    oval('ladle-bowl','hand.R',(.34,-.35,.83),(.054,.068,.025),'steel','cook')
    oval('grain-sack','chest',(-.07,-.25,1.17),(.22,.16,.25),'canvas','haul-sack')
    oval('gathered-neck','chest',(-.13,-.25,1.41),(.065,.056,.069),'hide','haul-sack')
    if owner == 'tin-cook':
        oval('knotted-headwrap','head',(0,.014,1.77),(.153,.15,.082),'rust')
    elif owner == 'tin-porter':
        cloth('shoulder-pad','chest',[(1.45,.22,-.12),(1.37,.24,-.15),(1.31,.18,-.14)],'canvas')
    else:
        oval('wool-cap','head',(0,.006,1.76),(.164,.145,.11),'denim')

bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_animations=False)
