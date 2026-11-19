"""Offline A/B stage. Run with blender -b -t 4 --python-exit-code 1 --python this_file -- OUTPUT."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFont


repo = Path.cwd()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
parser.add_argument('--draft', action='store_true', help='Low-resolution composition proof')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
out = args.output.resolve()


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def import_gltf(path):
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.context.selected_objects if obj.parent is None]


def sun(scene):
    data = bpy.data.lights.new('Low sun', 'SUN')
    data.energy = 1.10
    data.angle = math.radians(3)
    data.color = (1.0, .75, .51)
    lamp = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(lamp)
    lamp.location = (-20, -25, 9)
    aim(lamp, (0, 0, 0))
    fill = bpy.data.lights.new('Cool sky fill', 'AREA')
    fill.energy, fill.shape, fill.size = 1700, 'DISK', 22
    fill.color = (.53, .70, 1)
    dome = bpy.data.objects.new(fill.name, fill)
    scene.collection.objects.link(dome)
    dome.location = (8, -9, 12)
    aim(dome, (0, -3, 1))


def world(scene):
    scene.world = bpy.data.worlds.new('Dusk light')
    scene.world.use_nodes = True
    tree = scene.world.node_tree
    radiance = tree.nodes.get('Background')
    env = tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(str(repo / 'public/assets/textures/sunset-lighting.hdr'), check_existing=True)
    tree.links.new(env.outputs['Color'], radiance.inputs['Color'])
    radiance.inputs['Strength'].default_value = .45

    # Keep the photo's reflections. The camera instead sees an evening sky
    # free of the racetrack, buildings and trees in the lighting photograph.
    coords = tree.nodes.new('ShaderNodeTexCoord')
    axis = tree.nodes.new('ShaderNodeSeparateXYZ')
    tree.links.new(coords.outputs['Generated'], axis.inputs[0])
    ramp = tree.nodes.new('ShaderNodeValToRGB')
    for element, position, color in zip(ramp.color_ramp.elements, (0, .45),
                                        ((.49, .32, .22, 1), (.065, .14, .27, 1))):
        element.position = position
        element.color = color
    tree.links.new(axis.outputs['Z'], ramp.inputs['Fac'])
    visible = tree.nodes.new('ShaderNodeBackground')
    tree.links.new(ramp.outputs['Color'], visible.inputs['Color'])
    ray = tree.nodes.new('ShaderNodeLightPath')
    mix = tree.nodes.new('ShaderNodeMixShader')
    tree.links.new(ray.outputs['Is Camera Ray'], mix.inputs[0])
    tree.links.new(radiance.outputs[0], mix.inputs[1])
    tree.links.new(visible.outputs[0], mix.inputs[2])
    tree.links.new(mix.outputs[0], tree.nodes.get('World Output').inputs['Surface'])


def ground(worn):
    bpy.ops.mesh.primitive_plane_add(size=1200, location=(0, 0, -.002))
    mat = bpy.data.materials.new('Compacted gravel')
    mat.use_nodes = True
    bpy.context.object.data.materials.append(mat)
    tree = mat.node_tree
    bsdf = tree.nodes.get('Principled BSDF')
    texcoord = tree.nodes.new('ShaderNodeTexCoord')
    scale = tree.nodes.new('ShaderNodeVectorMath')
    scale.operation = 'SCALE'
    scale.inputs['Scale'].default_value = 270
    tree.links.new(texcoord.outputs['UV'], scale.inputs[0])
    photo = tree.nodes.new('ShaderNodeTexImage')
    photo.image = bpy.data.images.load(str(repo / 'public/assets/textures/scablands-gravel-road-colour.jpg'))
    tree.links.new(scale.outputs[0], photo.inputs['Vector'])
    tint = tree.nodes.new('ShaderNodeMixRGB')
    tint.blend_type = 'MULTIPLY'
    tint.inputs[0].default_value = .83
    tint.inputs[2].default_value = (.43, .28, .19, 1)
    tree.links.new(photo.outputs['Color'], tint.inputs[1])
    tree.links.new(tint.outputs[0], bsdf.inputs['Base Color'])
    relief = tree.nodes.new('ShaderNodeTexImage')
    relief.image = bpy.data.images.load(str(repo / 'public/assets/textures/scablands-gravel-road-relief.jpg'))
    relief.image.colorspace_settings.name = 'Non-Color'
    tree.links.new(scale.outputs[0], relief.inputs['Vector'])
    bump = tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .22
    bump.inputs['Distance'].default_value = .022
    tree.links.new(relief.outputs['Color'], bump.inputs['Height'])
    tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = .9
    if worn:
        # The metre-space mask covers 48 m around the gate on a 1,200 m plane.
        place = tree.nodes.new('ShaderNodeVectorMath')
        place.operation = 'MULTIPLY_ADD'
        place.inputs[1].default_value = (25, 25, 1)
        place.inputs[2].default_value = (-12, -12, 0)
        tree.links.new(texcoord.outputs['UV'], place.inputs[0])
        mask = tree.nodes.new('ShaderNodeTexImage')
        mask.image = bpy.data.images.load(str(out / 'gate-road-mask.png'))
        mask.image.colorspace_settings.name = 'Non-Color'
        mask.extension = 'CLIP'
        tree.links.new(place.outputs['Vector'], mask.inputs['Vector'])
        channels = tree.nodes.new('ShaderNodeSeparateColor')
        tree.links.new(mask.outputs['Color'], channels.inputs[0])
        packed = tree.nodes.new('ShaderNodeMixRGB')
        packed.blend_type = 'SCREEN'
        packed.inputs[2].default_value = (.13, .079, .040, 1)
        tree.links.new(channels.outputs['Red'], packed.inputs[0])
        tree.links.new(tint.outputs[0], packed.inputs[1])
        lip = tree.nodes.new('ShaderNodeMixRGB')
        lip.blend_type = 'MULTIPLY'
        lip.inputs[2].default_value = (.53, .48, .4, 1)
        tree.links.new(channels.outputs['Green'], lip.inputs[0])
        tree.links.new(packed.outputs[0], lip.inputs[1])
        tree.links.new(lip.outputs[0], bsdf.inputs['Base Color'])
        # One shallow rubber-width displacement in the normal, at no mesh cost.
        rut = tree.nodes.new('ShaderNodeBump')
        rut.invert = True
        rut.inputs['Distance'].default_value = .028
        tree.links.new(channels.outputs['Red'], rut.inputs['Height'])
        tree.links.new(bump.outputs['Normal'], rut.inputs['Normal'])
        tree.links.new(rut.outputs['Normal'], bsdf.inputs['Normal'])


def gate_sign():
    # Recreate the browser canvas sign for Blender. Its colors, stroke,
    # dimensions and copy are taken from src/world/tin-town-gate.js.
    face = Image.new('RGB', (1024, 220), '#a8a69c')
    brush = ImageDraw.Draw(face)
    brush.rectangle((3, 3, 1020, 216), outline='#5a3a24', width=14)
    font = bpy.utils.system_resource('DATAFILES', path='fonts/bfont.woff2')
    for name in ('DejaVuSansCondensed-Bold.ttf', 'arialbd.ttf', font):
        try:
            lettering = ImageFont.truetype(name, 146)
            break
        except OSError:
            continue
    else:
        raise RuntimeError('Install DejaVu Sans Condensed Bold or Arial Bold for the sign lettering')
    brush.text((512, 109), 'TIN TOWN', font=lettering, fill='#2a211a', anchor='mm')
    # Three's canvas map is flipped in the browser. A glTF exported without
    # the map retains the opposite V, so restore that flip for both faces.
    face.transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(out / 'gate-sign.png')
    mat = bpy.data.materials['tin sign']
    tree = mat.node_tree
    photo = tree.nodes.new('ShaderNodeTexImage')
    photo.image = bpy.data.images.load(str(out / 'gate-sign.png'))
    tree.links.new(photo.outputs['Color'], tree.nodes.get('Principled BSDF').inputs['Base Color'])


def build_stage(maps, light):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 20 if args.draft else 140
    scene.cycles.seed = 18
    scene.cycles.adaptive_threshold = .025
    scene.cycles.use_denoising = False
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 4
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 576
    scene.render.resolution_percentage = 50 if args.draft else 100
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 92
    scene.render.film_transparent = False
    world(scene)
    sun(scene)
    ground(light)
    import_gltf(out / 'gate.glb')
    gate_sign()
    # Stage the truck south of the gate, in front of the sign, coming
    # toward the camera. It is static and at the exported model's true scale.
    truck = out / 'big-bess-trial.glb' if maps else repo / 'public/assets/models/wasteland/scablands/big-bess.glb'
    for part in import_gltf(truck):
        part.location.x -= .65
        part.location.y -= 4.8
        part.rotation_euler.z += math.radians(-12)
    # Match tintArt('boneyard') on the truck's body, glass and tyres.
    parts = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name.startswith('Big Bess')]
    mats = {material for obj in parts for material in obj.data.materials if material}
    if len(mats) != 6:
        raise RuntimeError(f'Expected six truck materials, found {len(mats)}')
    for material in mats:
        tree = material.node_tree
        color = tree.nodes.get('Principled BSDF').inputs['Base Color']
        if color.is_linked:
            prior = color.links[0].from_socket
            multiply = tree.nodes.new('ShaderNodeMixRGB')
            multiply.blend_type = 'MULTIPLY'
            multiply.inputs[0].default_value = 1
            multiply.inputs[2].default_value = (.84, .84, .84, 1)
            tree.links.new(prior, multiply.inputs[1])
            tree.links.new(multiply.outputs[0], color)
        else:
            rgba = list(color.default_value)
            color.default_value = [v * .84 for v in rgba[:3]] + [rgba[3]]
    town = repo / 'public/assets/models/wasteland/scablands/tintown.glb'
    for part in import_gltf(town):
        # The game places the gate at land.at('tin-town', -25, 62).
        part.location.x += 25
        part.location.y += 62
    for obj in bpy.context.scene.objects:
        if obj.name.startswith('walkable-ground-'):
            obj.hide_render = True
    if light:
        data = bpy.data.lights.new('Gate practical', 'POINT')
        data.energy = 1600
        data.color = (1, .46, .16)
        data.shadow_soft_size = .36
        practical = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(practical)
        practical.location = (0, -.25, 5.5)
    camera = bpy.data.cameras.new('Matched camera')
    scene.camera = bpy.data.objects.new(camera.name, camera)
    scene.collection.objects.link(scene.camera)
    return scene


CAMERAS = {'cab': ((8.4, -14.4, 2.45), (-.35, -5.3, 1.92), 41),
           'road': ((-6, -26.5, 1.6), (1.65, 0, 2.9), 19.45),
           'glass': ((-3.4, -11.35, 2.85), (-.9, -7.35, 2.12), 45)}
for label, maps, light, views in [('stock', False, False, ('road', 'cab', 'glass')),
                                  ('paint', True, False, ('glass', 'cab')),
                                  ('trial', True, True, ('road', 'cab'))]:
    scene = build_stage(maps, light)
    for view in views:
        position, target, focal = CAMERAS[view]
        scene.camera.location = position
        scene.camera.data.lens = focal
        aim(scene.camera, target)
        prefix = 'draft-' if args.draft else ''
        scene.render.filepath = str(out / f'{prefix}{label}-{view}.jpg')
        bpy.ops.render.render(write_still=True)
