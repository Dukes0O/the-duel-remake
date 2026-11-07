"""Build Mrs Vane, the still and spotless owner of the Sea Works."""
import argparse
import json
import struct
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--render-dir', default='')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/scablands/mrs-vane.glb'

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.view_settings.view_transform = 'Standard'
scene.render.resolution_x = 800
scene.render.resolution_y = 800

def material(name, color, roughness=0.88):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0
    return mat

coat = material('spotless warm white coat', (.91, .91, .87))
glove = material('clean white gloves', (.98, .97, .91))
skin = material('quiet natural skin', (.63, .44, .32))
hair = material('close pinned grey hair', (.38, .39, .37))
eye = material('dark calm eyes', (.12, .10, .09))
shoe = material('polished dark shoes', (.12, .11, .10))
paper = material('pale sealed envelope', (.96, .92, .79))

# Photo-grid measurements (each view's own pixel coordinates, origin top-left).
# The matched standing photos all represent 1.58 m: crown y=20, shoe soles y=850.
# At 830 px, scale is 0.0019036 m/px. Front: centre x=222, hips y=405,
# shoulders y=140, coat hem y=710. Side: centre x=220, hips y=405, shoulders
# y=135, hem y=710. Back: centre x=221, hips y=405, shoulders y=130, hem y=710.
# Overhead: crown y=230, shoe soles y=595, centre x=212, hips y=410,
# shoulders y=320; this view only paints top-facing surfaces and does not set height.

root_node = bpy.data.objects.new('mrs-vane', None)
scene.collection.objects.link(root_node)
root_node['height_m'] = 1.58
root_node['outfit'] = 'spotless white coat, closed skirt, white gloves'
root_node['triangle_budget'] = 9000

def parent(obj, owner=root_node):
    obj.parent = owner
    return obj

def ellipsoid(name, pos, scale, mat, segments=20, rings=12, owner=root_node):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return parent(obj, owner)

def link(name, start, end, radius, mat, verts=12, owner=root_node):
    a, b = Vector(start), Vector(end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=(b-a).length,
                                         location=(a+b)*.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    return parent(obj, owner)

def cube(name, pos, scale, mat, owner=root_node):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return parent(obj, owner)

# X is right, Y is up, and front is -Z, matching the town-walker rig.
# Mrs Vane stands straight and still, with a closed coat skirt and no visible legs above its hem.
upper = ellipsoid('mrs-vane:upper', (0, .99, 0), (.205, .29, .145), coat)
upper['piece'] = 'upper'
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.255, radius2=.165, depth=.66,
                                location=(0, .48, 0))
skirt = bpy.context.object
skirt.name = 'mrs-vane:coat-skirt'
skirt.data.materials.append(coat)
parent(skirt)
ellipsoid('mrs-vane:neck', (0, 1.27, 0), (.066, .08, .065), skin, 16, 10)
ellipsoid('mrs-vane:head', (0, 1.385, 0), (.108, .142, .105), skin, 24, 16)
ellipsoid('mrs-vane:pinned-hair', (0, 1.478, .006), (.113, .055, .108), hair, 20, 12)
ellipsoid('mrs-vane:hair-bun', (0, 1.43, .095), (.06, .05, .06), hair, 16, 10)
# A composed mouth and small eyes keep the face calm, never scowling.
ellipsoid('mrs-vane:eye-l', (-.039, 1.405, -.095), (.009, .008, .006), eye, 10, 6)
ellipsoid('mrs-vane:eye-r', (.039, 1.405, -.095), (.009, .008, .006), eye, 10, 6)
link('mrs-vane:quiet-mouth', (-.018, 1.348, -.099), (.018, 1.35, -.099), .003, hair, 6)

for side, x in (('l', -.18), ('r', .18)):
    shoulder = (x, 1.17, 0)
    elbow = (x * 1.2, .99, -.012)
    wrist = (x * 1.24, .83, -.035)
    ellipsoid(f'mrs-vane:shoulder-{side}', shoulder, (.073, .07, .072), coat, 14, 9)
    link(f'mrs-vane:arm-{side}', shoulder, elbow, .052, coat)
    link(f'mrs-vane:sleeve-{side}', elbow, wrist, .044, coat)
    ellipsoid(f'mrs-vane:glove-{side}', wrist, (.045, .045, .04), glove, 14, 9)

# Matching town-walker pivot names and origins let walking code drive her legs.
for side, x in (('l', -.095), ('r', .095)):
    pivot = bpy.data.objects.new(f'mrs-vane:leg-{side}', None)
    scene.collection.objects.link(pivot)
    pivot.parent = root_node
    pivot.location = (x, 0, .19)
    pivot['swing_axis'] = 'X'
    leg = link(f'mrs-vane:leg-{side}:lower', (x, .19, 0), (x, .075, 0), .046, skin, owner=pivot)
    leg['piece'] = f'leg-{side}'
    ellipsoid(f'mrs-vane:shoe-{side}', (x, .035, -.025), (.07, .035, .12), shoe, 14, 9, pivot)

# The letter is a distinct flat slab, held at her right side.
envelope = cube('mrs-vane:envelope', (.245, .81, -.065), (.11, .145, .014), paper)
envelope['piece'] = 'mrs-vane:envelope'
envelope.rotation_euler.x = -.10

for obj in root_node.children_recursive:
    if obj.type == 'MESH':
        obj.data.calc_loop_triangles()
triangles = sum(len(obj.data.loop_triangles) for obj in root_node.children_recursive if obj.type == 'MESH')
root_node['triangle_count'] = triangles
if triangles > 9000:
    raise RuntimeError(f'mrs-vane has {triangles} triangles, over 9000')

glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in [root_node, *root_node.children_recursive]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root_node
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                           export_yup=True, export_apply=True, export_materials='EXPORT')

raw = glb.read_bytes()
length = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20 + length].decode('utf-8').rstrip('\0 '))
nodes = gltf.get('nodes', [])
index = next(i for i, node in enumerate(nodes) if node.get('name') == 'mrs-vane')
stack, descendants = [index], []
while stack:
    node_index = stack.pop()
    descendants.append(node_index)
    stack.extend(nodes[node_index].get('children', []))
exported_triangles = sum(gltf['accessors'][primitive['indices']]['count'] // 3
    for node_index in descendants if nodes[node_index].get('mesh') is not None
    for primitive in gltf['meshes'][nodes[node_index]['mesh']]['primitives'])
if exported_triangles > 9000 or glb.stat().st_size > 1_500_000:
    raise RuntimeError(f'export budget exceeded: {exported_triangles} triangles, {glb.stat().st_size} bytes')
print(json.dumps({'glb': str(glb), 'bytes': glb.stat().st_size, 'triangles': exported_triangles}))
