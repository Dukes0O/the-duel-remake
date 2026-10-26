"""Round 3 Summit finish furniture. Reuses the existing hut/dome separately.

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
warm = material('Warm lit window glass', (1, .57, .23), .32)
shader=warm.node_tree.nodes.get('Principled BSDF')
shader.inputs['Emission Color'].default_value=(1,.48,.16,1)
shader.inputs['Emission Strength'].default_value=2.5

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
        block('Chequered fabric', (.72, .055, .4),
              ((col-11.5)*.72, .39, 4.85+row*.4), ivory if (row+col)%2 else black)
block('Summit name board', (10.8,.16,1.8), (0,.37,6.65), wood, .035)
bpy.ops.object.text_add(location=(0,.47,6.65), rotation=(math.pi/2,0,math.pi))
letter=bpy.context.object
letter.name='SUMMIT painted lettering'
letter.data.body='SUMMIT'
letter.data.align_x='CENTER'
letter.data.align_y='CENTER'
letter.data.size=2.3
letter.data.extrude=.008
letter.data.materials.append(ivory)
bpy.ops.object.convert(target='MESH')
block('Gantry lamp housing', (.85,.6,.2), (0,.65,7.05), iron, .025)
block('Gantry lamp lens', (.68,.46,.055), (0,.65,6.93), warm)

# Last 200 m: narrow snow fence, with an open margin beside the road.
for side in [-1, 1]:
    for i in range(49):
        along = 4+i*4
        block('Snow fence upright', (.12, .14, 1.35), (side*8.4, along, .675), wood)
        if i < 48:
            for height in [.5, 1.05]:
                block('Snow fence rail', (.10, 4.02, .14), (side*8.4, along+2, height), wood)

for side,back in [(1,60),(-1,150)]:
    beam('Snow fence lamp post',(side*8.4,back,0),(side*8.4,back,3.4),.13,iron)
    block('Snow fence lamp hood',(.7,.7,.16),(side*8.4,back,3.48),iron,.025)
    block('Snow fence lamp lens',(.5,.5,.12),(side*8.4,back,3.35),warm)

# Low ploughed banks along the parking edges; the middle stays unobstructed.
for side in [-1,1]:
    vertices,faces=[],[]
    for row in range(39):
        along=4+row*3
        taper=min(1,row/3,(38-row)/3)
        for column in range(7):
            t=column/6
            height=max(0,taper)*(.64+.11*math.sin(row*.73))*math.sin(math.pi*t)
            vertices.append((side*(28.5+t*3.2),-along,-.025+height))
            if row and column:
                a=row*7+column
                faces.append((a-1,a,a-7,a-8) if side>0 else (a-8,a-7,a,a-1))
    mesh=bpy.data.meshes.new('Ploughed snow bank')
    mesh.from_pydata(vertices,[],faces);mesh.materials.append(snow)
    obj=bpy.data.objects.new('Low parking snow bank',mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons: polygon.use_smooth=True
beam('Parking lamp post',(24,-14,0),(24,-14,5.2),.16,iron)
block('Parking lamp hood',(.9,.8,.18),(24,-14,5.25),iron,.025)
block('Parking lamp lens',(.7,.6,.09),(24,-14,5.12),warm)

def window(name, size, point, anchor):
    frame=block(name+' timber frame',tuple(v+.14 if v>.1 else v+.025 for v in size),point,wood,.015)
    pane=block(name+' amber pane',size,point,warm)
    axis=0 if size[0]<.2 else 1
    direction=(-1 if point[0]>0 else 1) if axis==0 else 1
    frame.location[axis]-=direction*.10
    for obj in [frame,pane]: obj['groundAnchor']=anchor

# Roadside and approach-facing glazing on the reused buildings. Each window
# uses the building's own ground anchor, not an unrelated flat finish height.
for back in [12,16,20]:
    window('Hut roadside window',(.10,1.65,2.1),(10.95,back,2.65),[16,17])
for x in [14,20]:
    window('Hut approach window',(1.65,.10,2.1),(x,23.08,2.65),[16,17])
window('Observatory road window',(.10,3.4,1.65),(-9.73,16,2.0),[16,-17])
window('Observatory approach window',(3.4,.10,1.65),(-17,23.27,2.0),[16,-17])

# The working pad stays put. Its ground-fitted H/circle are drawn by the
# finish view; this recipe keeps the windsock and short marker-post path.
pad_x, pad_y = 80.02651454272215, 239.9632616834
mast=beam('Windsock mast', (pad_x+15,pad_y,0), (pad_x+15,pad_y,6), .12, iron)
mast['groundAnchor']=[pad_y,pad_x+15]
for i in range(6):
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=.46-i*.045,
        radius2=.415-i*.045, depth=.48, location=(pad_x+15+i*.46, pad_y, 5.7-i*.08))
    obj=bpy.context.object
    obj.name='Windsock fabric'
    obj.rotation_euler.y=math.pi/2+.17
    obj.data.materials.append(red if i%2==0 else ivory)
    obj['groundAnchor']=[pad_y,pad_x+15]
for i in range(6):
    back=28+i*7
    across=25+(pad_x-25)*(back-16)/(pad_y-16)
    for side in [-1,1]:
        for name,size,z,mat in [('Path marker stake',(.11,.11,.9),.45,wood),('Path marker reflector',(.13,.13,.18),.76,ivory)]:
            obj=block(name,size,(across+side*1.8,back,z),mat)
            obj['groundAnchor']=[back,across+side*1.8]

# A single trail behind the observatory; its twelve paired prints are large.
for i in range(12):
    for side in [-1, 1]:
        x, y = -28+side*.48, 8+i*1.5+(side+1)*.36
        block('Yeti heel impression', (.48, .88, .025), (x,y,.13), track, .12)
        for toe in range(4):
            block('Yeti toe impression', (.095, .15, .025), (x+(toe-1.5)*.115,y-.51,.13), track, .04)

# Fit snow marks and fence feet to the existing rendered snow, rather than
# lifting the whole assembly onto a flat plane. No hillside edits are made.
grounded = [obj for obj in bpy.context.scene.objects
            if obj.name.startswith(('Yeti ', 'Snow fence ')) or 'groundAnchor' in obj]
queries = [list(obj['groundAnchor']) if 'groundAnchor' in obj else [obj.location.y, obj.location.x] for obj in grounded]
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
for mat in [wood, iron, ivory, black, red, snow, track, warm]:
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
