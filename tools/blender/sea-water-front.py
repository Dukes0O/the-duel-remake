"""A repeatable, segmented flood surge for the Sea Works end run."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--out', default='public/assets/models/wasteland/scablands/sea-water-front.glb')
parser.add_argument('--render-dir', default='')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = root / args.out
blend = root / 'art-build/sea-water-front/sea-water-front.blend'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
root_obj = bpy.data.objects.new('water-front', None)
scene.collection.objects.link(root_obj)
root_obj['scrollV'] = 0.18  # picture-heights per second; scroll the surge UV V only.
root_obj['segmentWidth'] = 60.0

def material(name, color, roughness=0.96, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, alpha)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        mat.surface_render_method = 'BLENDED'
    return mat

surge_mat = material('water-front-mud', (0.18, 0.135, 0.095))
spray_mat = material('water-front-spray', (0.24, 0.225, 0.195), alpha=0.62)

def repeat_photo(path):
    image = bpy.data.images.load(str(path), check_existing=False)
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgb = pixels.reshape((height, width, 4))[:, :, :3].copy()
    # Match the opposite edge bands and ease that match into the source pixels.
    # Both axes are blended in memory so the face can repeat across segments
    # and scroll vertically without exposing a hard tile line.
    for axis, size in ((1, width), (0, height)):
        data = rgb if axis == 1 else np.swapaxes(rgb, 0, 1)
        band = min(max(1, round(size * 0.06)), size // 2)
        first = data[:, :band].copy()
        last = data[:, -band:][:, ::-1].copy()
        matched = (first + last) * 0.5
        for i in range(band):
            t = 1.0 - i / max(1, band - 1)
            data[:, i] = first[:, i] * (1.0 - t) + matched[:, i] * t
            data[:, -1-i] = last[:, i] * (1.0 - t) + matched[:, i] * t
        if axis == 0:
            rgb = np.swapaxes(data, 0, 1)
    rgba = np.concatenate((rgb, np.ones((height, width, 1), dtype=np.float32)), axis=2)
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    image.filepath = str(path)
    return image

face_image = repeat_photo(root / 'public/assets/models/wasteland/scablands/textures/sea-water-front-face.jpg')
nodes = surge_mat.node_tree.nodes
bsdf = nodes.get('Principled BSDF')
tex = nodes.new('ShaderNodeTexImage'); tex.image = face_image; tex.extension = 'REPEAT'
surge_mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])

spray_source = bpy.data.images.load(
    str(root / 'public/assets/models/wasteland/scablands/textures/sea-water-front-spray.jpg'),
    check_existing=False)
spray_source.scale(512, 512)
sw, sh = spray_source.size
spray_pixels = np.empty(sw * sh * 4, dtype=np.float32)
spray_source.pixels.foreach_get(spray_pixels)
spray_rgb = spray_pixels.reshape((sh, sw, 4))[:, :, :3].copy()
spray_rgb *= np.array((0.88, 0.86, 0.82), dtype=np.float32)
lum = spray_pixels.reshape((sh, sw, 4))[:, :, :3] @ np.array((0.2126, 0.7152, 0.0722), dtype=np.float32)
t = np.clip((lum - 0.09) / 0.25, 0.0, 1.0)
alpha = (t * t * (3.0 - 2.0 * t) * 0.90).astype(np.float32)
spray_mat = material('water-front-spray', (0.24, 0.225, 0.195), alpha=0.62)
spray_mat.use_backface_culling = False
spray_bsdf = spray_mat.node_tree.nodes.get('Principled BSDF')
spray_image = bpy.data.images.new('sea-water-front-spray-alpha', width=sw, height=sh, alpha=True)
rgba = np.concatenate((spray_rgb, alpha[:, :, None]), axis=2)
spray_image.pixels.foreach_set(rgba.ravel())
spray_image.pack()
spray_tex = spray_mat.node_tree.nodes.new('ShaderNodeTexImage')
spray_tex.image = spray_image
spray_tex.extension = 'EXTEND'
spray_mat.node_tree.links.new(spray_tex.outputs['Color'], spray_bsdf.inputs['Base Color'])
spray_mat.node_tree.links.new(spray_tex.outputs['Alpha'], spray_bsdf.inputs['Alpha'])
spray_bsdf.inputs['Metallic'].default_value = 0.0

# The cross-section runs from the low front foam, up the steep face, over a
# forward-leaning broken crest, then down a long back slope and under the bed.
profile = [
    (0.00, -0.10), (0.10, -0.52), (0.28, -0.93), (0.50, -1.22),
    (0.78, -1.42), (1.10, -1.56), (1.55, -1.68), (2.05, -1.77),
    (2.65, -1.84), (3.35, -1.91), (4.10, -1.97), (4.90, -2.02),
    (5.70, -2.10), (6.45, -2.23), (7.10, -2.45), (7.65, -2.80),
    (8.12, -3.24), (8.48, -3.66), (8.73, -3.95), (8.93, -3.93),
    (9.08, -3.70), (9.18, -3.28), (9.12, -2.75), (8.93, -2.15),
    (8.55, -1.50), (8.05, -0.78), (7.45, 0.00), (6.65, 1.05),
    (5.65, 2.25), (4.45, 3.60), (3.20, 5.05), (2.00, 6.45),
    (1.00, 7.80), (0.25, 9.05), (0.00, 9.30),
]
nx = 160
verts, faces, uv_faces, material_ids = [], [], [], []
for ix in range(nx + 1):
    x = -30.0 + 60.0 * ix / nx
    phase = 2 * math.pi * x / 60.0
    # Integer-cycle harmonics make the silhouette and normals meet at both ends.
    for ip, (y0, z0) in enumerate(profile):
        face_weight = max(0.0, min(1.0, (y0 - 0.2) / 2.2)) * (1 if z0 < -1.35 else 0.25)
        crest_weight = math.exp(-((y0 - 8.65) / 1.2) ** 2)
        wave = (0.52 * math.sin(3 * phase + 0.28) +
                0.25 * math.sin(7 * phase + 1.1) +
                0.13 * math.sin(13 * phase + 2.0) +
                0.07 * math.sin(23 * phase + 0.7))
        y = y0 + wave * (0.12 + 0.42 * face_weight + 0.72 * crest_weight)
        z = z0 + (0.18 * math.sin(3 * phase + 0.6) +
                  0.11 * math.sin(8 * phase + 2.1) +
                  0.055 * math.sin(17 * phase + 0.1)) * (0.3 + face_weight + crest_weight)
        verts.append((x, max(0.0, y), z))

nprof = len(profile)
for ix in range(nx):
    for ip in range(nprof - 1):
        a = ix * nprof + ip
        b = (ix + 1) * nprof + ip
        faces.append((a, b, b + 1, a + 1))
        uv_faces.append(((ix / nx * 5.0, profile[ip][0] / 9.0),
                         ((ix + 1) / nx * 5.0, profile[ip][0] / 9.0),
                         ((ix + 1) / nx * 5.0, profile[ip + 1][0] / 9.0),
                         (ix / nx * 5.0, profile[ip + 1][0] / 9.0)))
        # The rising water face and broken lip wear the flow texture.
        material_ids.append(1 if ip < 23 else 0)

mesh = bpy.data.meshes.new('water-front-surge-mesh')
mesh.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)
mesh.materials.append(surge_mat)
mesh.materials.append(surge_mat)
mesh.update()
obj = bpy.data.objects.new('water-front:surge', mesh)
scene.collection.objects.link(obj)
obj.parent = root_obj
obj['segmentWidth'] = 60.0
uv = mesh.uv_layers.new(name='UVMap')
for poly, coords, mat_index in zip(mesh.polygons, uv_faces, material_ids):
    poly.material_index = mat_index
    poly.use_smooth = True
    for loop_index, coord in zip(poly.loop_indices, coords):
        uv.data[loop_index].uv = coord

# Crossed dirty spray cards run continuously along the crest and its leading foot.
spray_verts, spray_faces, spray_uvs = [], [], []
for x in range(-29, 30, 3):
    for y, z, height in ((8.75, -3.25, 2.35), (0.48, -1.08, 1.15)):
        for angle in (0.0, math.pi / 2):
            cx = float(x) + 0.4 * math.sin(x * 3.7 + y)
            cy = y + 0.13 * math.sin(x * 2.3)
            cz = z
            size = 1.0 + 0.22 * math.sin(x * 1.31 + y)
            width = (4.0 if y > 1 else 3.0) * size
            height *= size
            dx, dz = math.cos(angle) * width / 2, math.sin(angle) * width / 2
            base = len(spray_verts)
            spray_verts.extend(((cx-dx,cy-height/2,cz-dz),(cx+dx,cy-height/2,cz+dz),
                                (cx+dx,cy+height/2,cz+dz),(cx-dx,cy+height/2,cz-dz)))
            spray_faces.append((base,base+1,base+2,base+3))
            spray_uvs.append(((0,0),(1,0),(1,1),(0,1)))
sm = bpy.data.meshes.new('water-front-spray-mesh')
sm.from_pydata([(x, -z, y) for x, y, z in spray_verts], [], spray_faces); sm.materials.append(spray_mat); sm.update()
so = bpy.data.objects.new('water-front:spray', sm); scene.collection.objects.link(so); so.parent = root_obj
suv = sm.uv_layers.new(name='UVMap')
for poly, coords in zip(sm.polygons, spray_uvs):
    poly.use_smooth = True
    for li, coord in zip(poly.loop_indices, coords): suv.data[li].uv = coord

out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_apply=True, export_extras=True)
triangles = sum(len(p.vertices) - 2 for ob in scene.objects if ob.type == 'MESH' for p in ob.data.polygons)
print('SEA_WATER_FRONT_TRIANGLES', triangles)
print('SEA_WATER_FRONT_BYTES', out.stat().st_size)

if args.render_dir:
    render_dir = Path(args.render_dir)
    if not render_dir.is_absolute(): render_dir = root / render_dir
    render_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'Medium High Contrast'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new('pale overcast sky')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.66, 0.68, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    ground = bpy.data.materials.new('dry lake bed')
    ground.diffuse_color = (0.56, 0.51, 0.42, 1)
    ground.use_nodes = True
    ground.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.56, 0.51, 0.42, 1)
    ground.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
    bpy.ops.mesh.primitive_plane_add(size=2000, location=(0, 0, -0.06))
    bpy.context.object.name = 'review dry lake bed'
    bpy.context.object.data.materials.append(ground)
    sun = bpy.data.objects.new('flat overcast sun', bpy.data.lights.new('flat overcast sun', 'SUN'))
    sun.data.energy = 1.4
    sun.rotation_euler = (math.radians(35), math.radians(-25), math.radians(-20))
    scene.collection.objects.link(sun)
    camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = 'PERSP'

    segments = []
    def import_segment(offset):
        before = set(scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(out))
        imported = list(set(scene.objects) - before)
        candidates = [o for o in imported if o.name.startswith('water-front') and o.parent is None]
        # Imported glTF roots are top-level empties; translate along game X.
        if not candidates:
            candidates = [o for o in imported if o.type == 'EMPTY' and o.parent is None]
        if candidates:
            candidates[-1].location.x += offset
        segments.append((offset, imported))

    for offset in (-60.0, 0.0, 60.0): import_segment(offset)

    def review_shot(name, eye_game, target_game, size, lens):
        eye = Vector((eye_game[0], -eye_game[2], eye_game[1]))
        target = Vector((target_game[0], -target_game[2], target_game[1]))
        camera.location = eye
        camera.rotation_euler = (target-eye).to_track_quat('-Z', 'Y').to_euler()
        if name == 'water-front-profile':
            camera.data.type = 'ORTHO'
            camera.data.ortho_scale = lens
        else:
            camera.data.type = 'PERSP'
            camera.data.lens = lens
        scene.render.resolution_x, scene.render.resolution_y = size
        scene.render.filepath = str(render_dir / f'{name}.png')
        bpy.ops.render.render(write_still=True)

    review_shot('water-front-25m', (0, 1.55, -25), (0, 4.3, -2.4), (1600, 320), 7.0)
    review_shot('water-front-80m', (0, 1.55, -80), (0, 4.3, -2.4), (1600, 320), 12.0)
    for offset, imported in segments:
        if offset != 0:
            for ob in imported: ob.hide_render = True
    review_shot('water-front-profile', (-48, 4.5, 4.5), (0, 4.5, 4.5), (1600, 900), 28.0)
