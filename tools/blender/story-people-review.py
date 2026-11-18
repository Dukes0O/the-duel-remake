"""Render photographs of the actual posed meshes prepared by story-people-poses.mjs.
blender -b -t 4 --python-exit-code 1 --python tools/blender/story-people-review.py -- EVIDENCE_DIR
"""
import argparse
import json
import math
import sys
from pathlib import Path
NAMES = ('current-20m','gate-walkers-20m','gate-talk','travellers','actions','at-rest')
parser = argparse.ArgumentParser()
parser.add_argument('folder', nargs='?', type=Path)
parser.add_argument('views', nargs='*')
parser.add_argument('--out', type=Path)
parser.add_argument('--root', type=Path, default=Path.cwd())
parser.add_argument('--paths-only', action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
if not (args.out or args.folder):
    parser.error('Choose an evidence directory.')
root=args.root.resolve()
folder=(root/(args.out or args.folder)).resolve()
if not folder.is_relative_to(root/'.evidence'):
    parser.error('Review images belong under .evidence/.')
if set(args.views)-set(NAMES):
    parser.error('Unknown review view.')
if args.paths_only:
    print(json.dumps({'blend':[],'glb':[],'evidence':[str(folder/(n+'.jpg')) for n in (args.views or NAMES)],'summary':[]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = False
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 93
world = bpy.data.worlds.new('Evening skylight')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.34, .37, .46, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .7
bpy.ops.object.light_add(type='SUN')
sun = bpy.context.object
sun.rotation_euler = Vector((.9, .72, -.58)).to_track_quat('-Z', 'Y').to_euler()
sun.data.energy = 2.6
sun.data.angle = math.radians(5)
sun.data.color = (1, .77, .53)
bpy.ops.mesh.primitive_plane_add(size=600)
plane = bpy.context.object
sand = bpy.data.materials.new('Windblown salt and dust')
sand.use_nodes = True
nodes, links = sand.node_tree.nodes, sand.node_tree.links
shader = nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .98
coord = nodes.new('ShaderNodeTexCoord')
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 4.7
noise.inputs['Detail'].default_value = 3
links.new(coord.outputs['Object'], noise.inputs['Vector'])
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (.085, .066, .049, 1)
ramp.color_ramp.elements[1].color = (.38, .28, .195, 1)
links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
plane.data.materials.append(sand)
bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.sensor_fit = 'VERTICAL'
camera.data.sensor_height = 24
materials = {}

def payload(name):
    items = json.loads((folder / (name + '.json')).read_text())
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    for item in items:
        mesh = bpy.data.meshes.new(item['name'])
        indices = item['index']
        mesh.from_pydata(item['position'], [], list(zip(indices[::3], indices[1::3], indices[2::3])))
        if item['normal']:
            for face in mesh.polygons:
                face.use_smooth = True
            mesh.normals_split_custom_set_from_vertices(item['normal'])
        if item['uv']:
            uv = mesh.uv_layers.new()
            for loop in mesh.loops:
                uv.data[loop.index].uv = item['uv'][loop.vertex_index]
        key = (item.get('texture'), tuple(item['colour']), item['rough'], item['metal'], tuple(item.get('emissive') or ()))
        if key not in materials:
            material = bpy.data.materials.new(item['name'])
            material.use_nodes = True
            shader = material.node_tree.nodes.get('Principled BSDF')
            colour = tuple(item['colour']) + (1,)
            shader.inputs['Base Color'].default_value = colour
            shader.inputs['Roughness'].default_value = item['rough']
            shader.inputs['Metallic'].default_value = item['metal']
            if item.get('emissive'):
                shader.inputs['Emission Color'].default_value = tuple(item['emissive'])+(1,)
                shader.inputs['Emission Strength'].default_value = 1.2
            if item.get('texture'):
                tex = material.node_tree.nodes.new('ShaderNodeTexImage')
                tex.image = bpy.data.images.load(str(folder / item['texture']), check_existing=True)
                material.node_tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])
            materials[key] = material
        mesh.materials.append(materials[key])
        obj = bpy.data.objects.new(item['name'], mesh)
        collection.objects.link(obj)
    return collection

objects = {name:payload(name) for name in ['gate','current','gate-walkers','speaking','leads','actions','at-rest','camp']}

def shot(name, show, eye, target, fov):
    if args.views and name not in args.views:
        return
    for key, col in objects.items():
        col.hide_render = key not in show
    camera.location = eye
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.lens = camera.data.sensor_height / (2 * math.tan(math.radians(fov / 2)))
    scene.render.filepath = str(folder / (name + '.jpg'))
    bpy.ops.render.render(write_still=True)

# Blender looks towards +Y at the game gate. Rell stands at -0.4.
for key in ['current','gate-walkers']:
    shot(key + '-20m', ['gate', key], (0,-20.4,1.62), (0,-.4,1.62), 72)
shot('gate-talk', ['gate','speaking'], (.3,-3.9,1.62), (0,0,1.18), 72)
shot('travellers', ['leads'], (.08,-3.8,1.50), (0,0,1.06), 43)
shot('actions', ['actions'], (.1,-7.4,1.58), (0,0,1.0), 40)

shot('at-rest', ['camp','at-rest'], (.10,-3.36,1.38), (-.43,0,.68), 42)
