"""Round 1 Summit finish furniture. Reuses the existing hut/dome separately.

blender -b --python tools/blender/summit-finish.py -- --root .
Local metres: X left of road, Y backwards, Z up. glTF converts once.
No external assets, generated blends, textures or render files are needed.
"""
import argparse
import math
import sys
import json
import subprocess
from pathlib import Path

args = argparse.ArgumentParser()
args.add_argument('--root', required=True)
args.add_argument('--paths-only', action='store_true')
options = args.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(options.root).resolve()
if options.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(root/'public/assets/models/circuits/kits'/('summit-finish'+suffix+'.glb')) for suffix in ['', '-lod']], 'json': []}))
    sys.exit(0)
import bpy
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, colour, roughness=1):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

wood = material('Weathered alpine timber', (.19, .13, .085))
iron = material('Oxidised iron straps', (.12, .14, .14), .8)
ivory = material('Aged canvas and faded pad paint', (.72, .73, .67))
black = material('Charcoal chequers', (.035, .043, .048))
red = material('Faded orange windsock', (.52, .19, .075))
snow = material('Snow caps', (.72, .79, .83))
track = material('Compressed footprint snow', (.30, .39, .44))

def block(name, size, point, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=point)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Worn edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj

def beam(name, start, end, width, mat):
    a, b = Vector(start), Vector(end)
    obj = block(name, (width, width, (b-a).length), (a+b)/2, mat, .018)
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return obj

for side in [-1, 1]:
    x = side * 9.5
    block('Gantry hewn upright', (.55, .6, 7.2), (x, 0, 3.6), wood, .055)
    for z in [.4, 5.9]:
        block('Forged post strap', (.59, .64, .16), (x, 0, z), iron, .015)
    beam('Gantry knee brace', (x, 0, 4.7), (x-side*2.1, 0, 6.7), .24, wood)
block('Timber lintel', (20.2, .7, .55), (0, 0, 6.95), wood, .05)
block('Snow on lintel', (20.3, .72, .12), (0, 0, 7.25), snow, .04)
for row in range(2):
    for col in range(24):
        block('Chequered fabric', (.72, .055, .55),
              ((col-11.5)*.72, -.39, 5.7+row*.55), ivory if (row+col)%2 else black)

# Last 200 m: narrow snow fence, with an open margin beside the road.
for side in [-1, 1]:
    for i in range(49):
        along = 4+i*4
        block('Snow fence upright', (.12, .14, 1.35), (side*11, along, .675), wood)
        if i < 48:
            for height in [.5, 1.05]:
                block('Snow fence rail', (.10, 4.02, .14), (side*11, along+2, height), wood)

# The real summit pad, in the final-straight frame (SUMMIT_PADS.summit).
pad_x, pad_y, pad_z = 80.02651454272215, 239.9632616834, 5.76
for x in [-2.6, 2.6]:
    block('Helipad H', (.65, 6, .025), (pad_x+x, pad_y, pad_z), ivory)
block('Helipad H crossbar', (5.2, .65, .025), (pad_x, pad_y, pad_z), ivory)
for i in range(48):
    angle = i*math.tau/48
    mark = block('Pad perimeter', (.22, 1.58, .025),
                 (pad_x+12*math.cos(angle), pad_y+12*math.sin(angle), pad_z), ivory)
    mark.rotation_euler.z = angle
beam('Windsock mast', (pad_x+15, pad_y, pad_z-.1), (pad_x+15, pad_y, pad_z+6), .12, iron)
for i in range(6):
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=.46-i*.045,
        radius2=.415-i*.045, depth=.48, location=(pad_x+15+i*.46, pad_y, pad_z+5.7-i*.08))
    obj=bpy.context.object
    obj.name='Windsock fabric'
    obj.rotation_euler.y=math.pi/2+.17
    obj.data.materials.append(red if i%2==0 else ivory)

# A single trail behind the observatory; its twelve paired prints are large.
for i in range(12):
    for side in [-1, 1]:
        x, y = -35+side*.48, 43+i*1.7+(side+1)*.36
        block('Yeti heel impression', (.48, .88, .025), (x,y,.13), track, .12)
        for toe in range(4):
            block('Yeti toe impression', (.095, .15, .025), (x+(toe-1.5)*.115,y-.51,.13), track, .04)

# Fit snow marks and fence feet to the existing rendered snow, rather than
# lifting the whole assembly onto a flat plane. No hillside edits are made.
grounded = [obj for obj in bpy.context.scene.objects
            if obj.name.startswith(('Yeti ', 'Snow fence '))]
queries = [[obj.location.y, obj.location.x] for obj in grounded]
sample = """
import {readFileSync} from 'node:fs';
import {Course} from './src/course.js';
import {SUMMIT_RUN} from './src/circuits/summit-run.js';
import {terrainGeometry} from './src/world-surfaces.js';
import {renderedGroundHeight} from './src/rendered-ground.js';
const c=new Course(SUMMIT_RUN,1989),g=terrainGeometry(c);
const rows=JSON.parse(readFileSync(0,'utf8'));
const base=renderedGroundHeight(c,{...c.worldAt(c.length-4,0),s:c.length-4,off:0});
console.log(JSON.stringify(rows.map(([back,off])=>{
  const s=c.length-back,p=c.worldAt(s,off);
  return renderedGroundHeight(c,{...p,s,off})-base;
})));
g.dispose();
"""
sampled = subprocess.run(['node', '--input-type=module', '-e', sample],
    input=json.dumps(queries), text=True, capture_output=True, cwd=root, check=True)
for obj, height in zip(grounded, json.loads(sampled.stdout)):
    if height is None or not math.isfinite(height):
        raise ValueError('Finish detail has no rendered ground')
    obj.location.z += height - (.105 if obj.name.startswith('Yeti ') else 0)
# Anchor four metres before the endpoint, inside the rendered terrain ribbon.
# The gantry itself still stands exactly at the finish.
for obj in bpy.context.scene.objects:
    obj.location.y -= 4

# Join by material, keeping the finish kit small in the browser.
for mat in [wood, iron, ivory, black, red, snow, track]:
    bpy.ops.object.select_all(action='DESELECT')
    objects=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.data.materials[0]==mat]
    for obj in objects: obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        objects[0].name=mat.name
output=root/'public/assets/models/circuits/kits'
for suffix in ['', '-lod']:
    bpy.ops.export_scene.gltf(filepath=str(output/('summit-finish'+suffix+'.glb')), export_format='GLB', export_yup=True)
