"""Blender render of the staged Night 2 gate. Run with -- EVIDENCE [--draft]."""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('evidence', type=Path)
parser.add_argument('--draft', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
folder = args.evidence.resolve()
root = Path(__file__).resolve().parents[3]
pose = json.loads((folder / 'camera-and-cast.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 14 if args.draft else 72
scene.cycles.max_bounces = 4
scene.cycles.diffuse_bounces = 1
scene.cycles.glossy_bounces = 2
scene.cycles.sample_clamp_indirect = 1.5
scene.cycles.sample_clamp_direct = 4
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.seed = 18
scene.cycles.adaptive_threshold = .045
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_x, scene.render.resolution_y = pose['width'], pose['height']
scene.render.resolution_percentage = 50 if args.draft else 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'

def point(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

def from_game(xyz):
    x, y, z = xyz
    return x, -z, y

def ramp(tree, stops):
    node = tree.nodes.new('ShaderNodeValToRGB')
    elements = node.color_ramp.elements
    for i, (where, rgb) in enumerate(stops):
        item = elements[i] if i < 2 else elements.new(where)
        item.position, item.color = where, (*rgb, 1)
    return node

world = scene.world = bpy.data.worlds.new('Last light over the south road')
world.use_nodes = True
tree = world.node_tree
ambient = tree.nodes.get('Background')
ambient.inputs['Color'].default_value = (.52,.66,.89,1)
ambient.inputs['Strength'].default_value = .64
coords = tree.nodes.new('ShaderNodeTexCoord')
sky_axis = tree.nodes.new('ShaderNodeSeparateXYZ')
tree.links.new(coords.outputs['Generated'], sky_axis.inputs[0])
dusk = ramp(tree, [(0, (.46, .36, .31)), (.12, (.255, .31, .43)),
                   (.39, (.105, .165, .29)), (.83, (.041, .084, .145))])
tree.links.new(sky_axis.outputs['Z'], dusk.inputs['Fac'])
stretch = tree.nodes.new('ShaderNodeVectorMath')
stretch.operation = 'MULTIPLY'
stretch.inputs[1].default_value = (2.4, 3.7, 12)
tree.links.new(coords.outputs['Generated'], stretch.inputs[0])
cloud = tree.nodes.new('ShaderNodeTexNoise')
cloud.inputs['Scale'].default_value = 3.1
cloud.inputs['Detail'].default_value = 4
tree.links.new(stretch.outputs['Vector'], cloud.inputs['Vector'])
veil = ramp(tree, [(.26, (.64,.66,.73)), (.68,(1,.99,.97))])
tree.links.new(cloud.outputs['Fac'],veil.inputs['Fac'])
m = tree.nodes.new('ShaderNodeMixRGB')
m.blend_type = 'MULTIPLY'
m.inputs[0].default_value=.7
tree.links.new(dusk.outputs['Color'],m.inputs[1])
tree.links.new(veil.outputs['Color'],m.inputs[2])
visible = tree.nodes.new('ShaderNodeBackground')
tree.links.new(m.outputs[0],visible.inputs[0])
ray = tree.nodes.new('ShaderNodeLightPath')
mix = tree.nodes.new('ShaderNodeMixShader')
tree.links.new(ray.outputs['Is Camera Ray'],mix.inputs[0])
tree.links.new(ambient.outputs[0],mix.inputs[1])
tree.links.new(visible.outputs[0],mix.inputs[2])
tree.links.new(mix.outputs[0],tree.nodes.get('World Output').inputs['Surface'])

bpy.ops.import_scene.gltf(filepath=str(folder/'stage.glb'))
objects = [ob for ob in scene.objects if ob.type=='MESH']
labels = {label: n+1 for n,label in enumerate(pose['ids'])}
for ob in objects:
    ob.pass_index=labels[ob['plateGroup']]
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not shader:
        continue
    if mat.get('atlas'):
        picture=nodes.new('ShaderNodeTexImage')
        picture.image=bpy.data.images.load(str(folder/mat['atlas']),check_existing=True)
        links.new(picture.outputs['Color'],shader.inputs['Base Color'])
    if mat.name in ('lamp glass','warm lamps'):
        shader.inputs['Emission Color'].default_value = (1,.49,.16,1)
        camera_ray=nodes.new('ShaderNodeLightPath')
        emission=nodes.new('ShaderNodeMath')
        emission.operation='MULTIPLY_ADD'
        emission.inputs[1].default_value=6
        emission.inputs[2].default_value=.02
        links.new(camera_ray.outputs['Is Camera Ray'],emission.inputs[0])
        links.new(emission.outputs[0],shader.inputs['Emission Strength'])
    elif mat.name.startswith('Scablands '):
        colour=nodes.new('ShaderNodeTexImage')
        relief=nodes.new('ShaderNodeTexImage')
        textures=root/'public/assets/textures'
        photo='gravel-road' if mat.name=='Scablands gravel road' else 'hardpan'
        colour.image=bpy.data.images.load(str(textures/f'scablands-{photo}-colour.jpg'),check_existing=True)
        relief.image=bpy.data.images.load(str(textures/f'scablands-{photo}-relief.jpg'),check_existing=True)
        relief.image.colorspace_settings.name='Non-Color'
        tint=nodes.new('ShaderNodeMixRGB')
        tint.blend_type='MULTIPLY'
        tint.inputs[0].default_value=.79
        tint.inputs[2].default_value=(.58,.49,.40,1)
        links.new(colour.outputs[0],tint.inputs[1])
        links.new(tint.outputs[0],shader.inputs['Base Color'])
        bump=nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value=.24
        bump.inputs['Distance'].default_value=.026
        links.new(relief.outputs[0],bump.inputs['Height'])
        links.new(bump.outputs[0],shader.inputs['Normal'])
        # Match the game's depth haze over its sampled terrain. At the gate
        # the photographed gravel stays clear; the distant ridge takes sky.
        dist=nodes.new('ShaderNodeCameraData')
        haze=nodes.new('ShaderNodeMapRange')
        haze.interpolation_type='SMOOTHSTEP'
        haze.inputs['From Min'].default_value=50
        haze.inputs['From Max'].default_value=1400
        haze.inputs['To Max'].default_value=.88
        links.new(dist.outputs['View Distance'],haze.inputs['Value'])
        far=nodes.new('ShaderNodeEmission')
        far.inputs['Color'].default_value=(.39,.345,.33,1)
        atmosphere=nodes.new('ShaderNodeMixShader')
        links.new(haze.outputs['Result'],atmosphere.inputs[0])
        links.new(shader.outputs[0],atmosphere.inputs[1])
        links.new(far.outputs[0],atmosphere.inputs[2])
        output=nodes.get('Material Output').inputs['Surface']
        links.new(atmosphere.outputs[0],output)
        if mat.name=='Scablands coarse ground':
            centre_x,centre_z,width,depth=pose['nearHole']
            split=nodes.new('ShaderNodeSeparateXYZ')
            links.new(nodes.new('ShaderNodeNewGeometry').outputs['Position'],split.inputs[0])
            def near_axis(value,centre,extent):
                subtract=nodes.new('ShaderNodeMath');subtract.operation='SUBTRACT';subtract.inputs[1].default_value=centre
                absolute=nodes.new('ShaderNodeMath');absolute.operation='ABSOLUTE'
                inside=nodes.new('ShaderNodeMath');inside.operation='LESS_THAN';inside.inputs[1].default_value=extent
                links.new(value,subtract.inputs[0]);links.new(subtract.outputs[0],absolute.inputs[0]);links.new(absolute.outputs[0],inside.inputs[0])
                return inside.outputs[0]
            both=nodes.new('ShaderNodeMath');both.operation='MULTIPLY'
            links.new(near_axis(split.outputs['X'],centre_x,width),both.inputs[0]);links.new(near_axis(split.outputs['Y'],-centre_z,depth),both.inputs[1])
            hole=nodes.new('ShaderNodeMixShader');links.new(both.outputs[0],hole.inputs[0]);links.new(atmosphere.outputs[0],hole.inputs[1]);links.new(nodes.new('ShaderNodeBsdfTransparent').outputs[0],hole.inputs[2]);links.new(hole.outputs[0],output)
        if mat.name=='Scablands gravel road':
            # The game's second UV carries the transverse road coordinate, its wheel ruts and feathered berm.
            road_uv=nodes.new('ShaderNodeUVMap');road_uv.uv_map='UVMap.001'
            split=nodes.new('ShaderNodeSeparateXYZ');links.new(road_uv.outputs['UV'],split.inputs[0])
            absolute=nodes.new('ShaderNodeMath');absolute.operation='ABSOLUTE';links.new(split.outputs['X'],absolute.inputs[0])
            shade=ramp(mat.node_tree,[(0,(1,1,1)),(.32,(1,1,1)),(.4,(.65,.65,.65)),(.5,(1,1,1)),(1,(1,1,1))]);links.new(absolute.outputs[0],shade.inputs['Fac'])
            ruts=nodes.new('ShaderNodeMixRGB');ruts.blend_type='MULTIPLY';ruts.inputs[0].default_value=1;links.new(tint.outputs[0],ruts.inputs[1]);links.new(shade.outputs[0],ruts.inputs[2]);links.new(ruts.outputs[0],shader.inputs['Base Color'])
            wear=nodes.new('ShaderNodeMapRange');wear.interpolation_type='SMOOTHSTEP';wear.inputs['From Min'].default_value=1.09;wear.inputs['From Max'].default_value=1.2
            links.new(absolute.outputs[0],wear.inputs['Value']);edge=nodes.new('ShaderNodeMixShader');links.new(wear.outputs[0],edge.inputs[0]);links.new(atmosphere.outputs[0],edge.inputs[1]);links.new(nodes.new('ShaderNodeBsdfTransparent').outputs[0],edge.inputs[2]);links.new(edge.outputs[0],output)

    elif mat.name in ('girders','rusted drums','tin drums','faded blue drums','corrugated tin','shack sheet','chain'):
        # The game's shader wears the actual gate in world metres. Supply its
        # fine steel grain and chipped oxides with the existing town photograph.
        base=tuple(shader.inputs['Base Color'].default_value)
        coord=nodes.new('ShaderNodeTexCoord')
        scale=nodes.new('ShaderNodeVectorMath')
        scale.operation='SCALE'
        scale.inputs['Scale'].default_value=.7
        links.new(coord.outputs['Object'],scale.inputs[0])
        pic=nodes.new('ShaderNodeTexImage')
        pic.image=bpy.data.images.load(str(root/'public/assets/models/wasteland/town/textures/rusted-steel.jpg'),check_existing=True)
        pic.projection='BOX'
        pic.projection_blend=.18
        links.new(scale.outputs['Vector'],pic.inputs['Vector'])
        weather=nodes.new('ShaderNodeMixRGB')
        weather.blend_type='OVERLAY'
        weather.inputs[0].default_value=.79
        weather.inputs[1].default_value=base
        links.new(pic.outputs['Color'],weather.inputs[2])
        links.new(weather.outputs[0],shader.inputs['Base Color'])
        grain=nodes.new('ShaderNodeBump')
        grain.inputs['Distance'].default_value=.017
        grain.inputs['Strength'].default_value=.18
        links.new(pic.outputs[0],grain.inputs['Height'])
        links.new(grain.outputs[0],shader.inputs['Normal'])

def light(name, kind, location, colour, power, size):
    data=bpy.data.lights.new(name,kind)
    data.color=colour
    data.energy=power
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    obj.location=location
    if kind=='AREA':
        data.shape='DISK';data.size=size
    elif kind=='POINT':
        data.shadow_soft_size=size
    else:
        data.angle=math.radians(size)
    return obj

sun=light('Last cold light','SUN',(-30,18,8),(.82,.86,1),.92,12)
point(sun,(0,-6,0))
fill=light('Light from the blue sky above the travellers','AREA',(-5,3,10),(.65,.79,1),1000,14)
point(fill,(0,-5,.8))
for x in (-3.4,0,3.4):
    light('Gate bulb','POINT',(x,.23,5.36),(1,.57,.28),440,.21)
camera_spec=pose['camera']
bpy.ops.object.camera_add(location=from_game(camera_spec['eye']))
camera=scene.camera=bpy.context.object
point(camera,from_game(camera_spec['aim']))
camera.data.sensor_fit='VERTICAL'
camera.data.sensor_height=24
camera.data.lens=24/(2*math.tan(math.radians(camera_spec['verticalFov']/2)))
camera.data.clip_start=camera_spec['near']
camera.data.clip_end=camera_spec['far']

# Retain one exact silhouette ID per visible actor, cart or gate assembly for
# the review overlay. The RGB pass and IDs are produced in the same render.
scene.view_layers[0].use_pass_object_index=True
scene.use_nodes=True
nodes=scene.node_tree.nodes
layers=nodes.get('Render Layers')
identifier=nodes.new('CompositorNodeOutputFile')
identifier.base_path=str(folder)
identifier.file_slots[0].path='night-2-index-'
identifier.format.file_format='OPEN_EXR'
identifier.format.color_mode='BW'
identifier.format.color_depth='32'
scene.node_tree.links.new(layers.outputs['IndexOB'],identifier.inputs[0])
name='draft' if args.draft else 'base'
scene.render.filepath=str(folder/(name+'.png'))
bpy.ops.render.render(write_still=True)
plane=bpy.data.images.load(str(folder/'night-2-index-0001.exr'))
data=np.empty(len(plane.pixels),np.float32)
plane.pixels.foreach_get(data)
width,height=plane.size
packed=data.reshape(height,width,-1)[::-1,:,0]
np.save(folder/(name+'-ids.npy'),np.rint(packed).astype('uint8'))
(folder/'groups.json').write_text(json.dumps(labels,indent=2)+'\n')
