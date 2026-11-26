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

def draped(name, bone, sections, colour, action='', pleat=0):
    # Offset elliptical cross-sections give cloth a changing centre of gravity.
    n = 32
    verts = []
    for x,y,z,w,d in sections:
        for i in range(n):
            angle = math.tau*i/n
            fold = 1 + pleat*math.cos(7*angle + z*2)
            verts.append((x+w*fold*math.cos(angle),y+d*fold*math.sin(angle),z))
    faces = [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i)
             for j in range(len(sections)-1) for i in range(n)]
    faces.extend([tuple(reversed(range(n))), tuple(range(len(verts)-n,len(verts)))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    for face in mesh.polygons:
        face.use_smooth = len(face.vertices)==4
    return finish(obj,name,bone,colour,action)

owner = 'odessa'
cloth('leather-apron','chest',[(1.40,.097,-.168),(1.30,.145,-.179),
      (1.19,.211,-.182),(1.145,.204,-.163),(1.12,.212,-.186),
      (.91,.228,-.191),(.70,.213,-.202),(.66,.183,-.205)],'hide')
for sign in (-1,1):
    rod('neck-strap','chest',(sign*.085,-.166,1.39),(sign*.101,-.045,1.53),.016,'oil')
draped('work-cap','head',[(0,0,1.733,.13,.123),(0,.004,1.762,.141,.131),
       (0,.014,1.813,.118,.109),(0,.02,1.832,.065,.061)],'denim')
oval('cap-peak','head',(0,-.105,1.744),(.121,.094,.014),'oil')
for side, x in [('L',-.34),('R',.34)]:
    bone = 'hand.'+side
    draped('gauntlet-cuff',bone,[(x,-.024,.957,.055,.052),(x,-.015,1.045,.071,.066)],'hide')
    oval('palm',bone,(x,-.03,.929),(.051,.039,.066),'hide')
    for i,length in enumerate((.050,.066,.070,.057)):
        oval('finger'+str(i),bone,(x+(i-1.5)*.023,-.042,.902-length/2),(.014,.023,length/2),'hide')
    oval('thumb',bone,(x*.86,-.059,.919),(.021,.028,.041),'hide')
rod('torch','hand.R',(.33,-.04,.91),(.33,-.28,.94),.022,'steel','weld')
rod('billet','hand.L',(-.34,-.04,.92),(.25,-.04,.92),.054,'steel','carry')

owner = 'moss'
cloth('overall-bib','chest',[(1.37,.14,-.157),(1.18,.18,-.16),(.96,.196,-.158)],'denim')
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
    # The filled belly drops down the back. The empty neck folds forward over
    # the left shoulder and is bound tight below its flared mouth.
    bag = [(-.19,.18,1.04,.052,.062),(-.20,.18,1.09,.147,.121),
           (-.218,.16,1.23,.157,.144),(-.232,.127,1.37,.142,.133),
           (-.23,.061,1.47,.111,.132),(-.216,-.024,1.52,.086,.114),
           (-.204,-.096,1.54,.044,.058),(-.202,-.113,1.56,.029,.033),
           (-.201,-.134,1.59,.059,.046)]
    draped('canvas-sack','chest',bag,'canvas','haul-sack',.092)
    draped('binding','chest',[(-.202,-.11,1.55,.033,.039),
           (-.202,-.114,1.562,.034,.038)],'hide','haul-sack')
    if owner == 'tin-cook':
        draped('linen-headwrap','head',[(0,0,1.716,.148,.147),(0,0,1.752,.156,.15),
               (0,.008,1.815,.14,.135),(0,.014,1.847,.099,.092)],'rag',pleat=.027)
    elif owner == 'tin-child':
        oval('wool-cap','head',(0,.006,1.76),(.164,.145,.11),'denim')

bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_animations=False)
