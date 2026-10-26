"""HELI-LOGBOOK round 1: five texture variants for the current Kestrel One.

blender -b --factory-startup --python tools/blender/heli-logbook-paints.py -- --root . --originals <outside-repo> [--render .evidence/...]

Original design only. No brands, lettering, franchise symbols or donor art.
The current Blender recipe's paint_white/navy/red surfaces share a metre-based
side projection: u=(glTF z+6.8)/9.5, v=glTF y/3. These are material textures,
not substitute vehicle pictures. Existing glass, metal and rotor stay intact.
"""
import argparse, json, math, shutil, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--originals')
parser.add_argument('--render', default='')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
PAINT_IDS = ['rank-student', 'rank-private', 'rank-commercial', 'rank-mountain', 'rank-chief']
out = root / 'public/assets/heli/skins'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [], 'png': [str(out / f'{ident}.png') for ident in PAINT_IDS],
                     'evidence': [str(root / args.render / f'{ident}-{view}.png')
                                  for ident in PAINT_IDS for view in ['near', 'side']] if args.render else []}))
    raise SystemExit(0)
if not args.originals:
    parser.error('--originals is required outside --paths-only')
import bpy
import numpy as np
from mathutils import Vector

originals = Path(args.originals).resolve()
assert not originals.is_relative_to(root), 'Originals must be outside the repository'
originals.mkdir(parents=True, exist_ok=True)
out.mkdir(parents=True, exist_ok=True)
N = 1024
u, v = np.meshgrid((np.arange(N) + .5) / N, (np.arange(N) + .5) / N)
z, y = u * 9.5 - 6.8, v * 3
rng = np.random.default_rng(1964)
grain = rng.normal(0, .006, (N, N))
# Fine stable paint variation, panel-edge dirt, rubbed specks and vertical rain.
wear = .028 * np.sin(z * 31 + np.sin(y * 5)) + .009 * np.sin(y * 182)
seams = sum(np.exp(-((z - station) / .026) ** 2) for station in [-1, -.75, -.05, .15, .9])
dirt = seams * .07 + np.maximum(0, 1.1 - y) * .055
chips = (rng.random((N, N)) > .9988)

def colour(code):
    return np.array([int(code[i:i+2], 16) / 255 for i in (0, 2, 4)])

def polygon(points):
    inside = np.zeros((N, N), dtype=bool)
    for a, b in zip(points, points[1:] + points[:1]):
        inside ^= ((a[1] > y) != (b[1] > y)) & (z < (b[0]-a[0]) * (y-a[1]) / (b[1]-a[1] + 1e-15) + a[0])
    return inside

# A compact original kestrel silhouette, perched with folded wings, hooked
# beak, long tail, two feet. The chief's brush edge is intentionally uneven.
bird = polygon([( .49,1.12),(.64,1.25),(.64,1.42),(.69,1.51),(.80,1.53),(.89,1.49),(.97,1.46),
                (.87,1.44),(.83,1.35),(.84,1.24),(.79,1.14),(.70,1.11),(.63,1.05),(.48,.98),(.54,1.13)])
feet = ((abs(z-.69) < .012) | (abs(z-.76)<.012)) & (y>1.07)&(y<1.16)
branch = (y>1.06)&(y<1.075)&(z>.58)&(z<.85)

palettes = {
    'rank-student': ('e3dfd5','df591c','df591c'),
    'rank-private': ('111e34','111e34','b6bdc1'),
    'rank-commercial': ('244733','ded4b9','ded4b9'),
    'rank-mountain': ('b32720','e4dfd1','e4dfd1'),
    'rank-chief': ('d8c9a6','b53729','b53729'),
}
textures = {}
for ident, (upper, lower, stripe) in palettes.items():
    rgb = np.broadcast_to(colour(upper), (N, N, 3)).copy()
    rgb[y<1.02] = colour(lower)
    rgb[(y>=1.02)&(y<1.11)] = colour(stripe)
    if ident == 'rank-student':
        # Three orange training bands wrapping around the tail boom.
        bands = ((z < -2.8) & (z > -4.75) & (np.mod(-z + y*.2, .62)<.24))
        rgb[bands] = colour('df591c')
    if ident == 'rank-mountain':
        bands = ((z < -2.9)&(z > -4.9)&(np.mod(-z,.74)<.22)) | ((y>1.17)&(y<1.24))
        rgb[bands] = colour('d9dfce')
    rgb *= np.clip(1 - dirt[...,None] + wear[...,None] + grain[...,None], .55, 1.1)
    rgb[chips & (seams>.25)] = colour('77756c')
    if ident in ['rank-commercial','rank-chief']:
        mask = bird | feet | branch
        if ident == 'rank-chief': mask &= np.sin(z*370 + y*43) + np.cos(y*270) > -1.85
        rgb[mask] = colour('d9c9a1' if ident == 'rank-commercial' else '823728')
        # A slim wing stroke and the eye keep the silhouette bird-like.
        wing = (abs(z-(.75 + (y-1.27)*.4))<.012)&(y>1.18)&(y<1.37)&bird
        rgb[wing] = colour('6e5536' if ident == 'rank-commercial' else 'cba97d')
    rgba = np.concatenate([np.clip(rgb,0,1), np.ones((N,N,1))], axis=2).astype(np.float32)
    image = bpy.data.images.new(ident, width=N, height=N, alpha=False)
    image.pixels.foreach_set(rgba.ravel())
    image.file_format='PNG'; image.filepath_raw=str(originals / f'{ident}.png'); image.save()
    shutil.copyfile(image.filepath_raw, out / f'{ident}.png')
    textures[ident] = image
    print(f'{ident}: 1024x1024 opaque PNG, {(out / (ident+".png")).stat().st_size} bytes')

if args.render:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/heli/kestrel-one.glb'))
    scene=bpy.context.scene
    paint=[]
    for ob in list(scene.objects):
        if ob.type != 'MESH': continue
        if not any(m and m.name in ['paint_white','paint_navy','paint_red'] for m in ob.data.materials): continue
        uv = ob.data.uv_layers.new(name='rank_projection')
        uv.active_render = True
        ob.data.uv_layers.active_index = len(ob.data.uv_layers) - 1
        for loop in ob.data.loops:
            co=ob.matrix_world @ ob.data.vertices[loop.vertex_index].co
            uv.data[loop.index].uv=((-co.y+6.8)/9.5,co.z/3)
        for m in ob.data.materials:
            if m and m.name in ['paint_white','paint_navy','paint_red'] and m not in paint:
                node=m.node_tree.nodes.new('ShaderNodeTexImage')
                m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
                paint.append(m)
    floor_mat=bpy.data.materials.new('pad asphalt'); floor_mat.diffuse_color=(.09,.09,.085,1)
    bpy.ops.mesh.primitive_plane_add(size=200)
    bpy.context.object.data.materials.append(floor_mat)
    world=bpy.data.worlds.new('overcast sky'); scene.world=world; world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.45,.55,.65,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
    light=bpy.data.lights.new('sun','SUN'); light.energy=3
    light_ob=bpy.data.objects.new('sun',light); scene.collection.objects.link(light_ob)
    light_ob.rotation_euler=(math.radians(35),math.radians(-20),math.radians(-35))
    camera=bpy.data.objects.new('camera',bpy.data.cameras.new('camera')); scene.collection.objects.link(camera); scene.camera=camera
    scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED'; scene.render.threads=4
    scene.render.resolution_x=840; scene.render.resolution_y=500; scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    folder=root/args.render; folder.mkdir(parents=True, exist_ok=True)
    for ident in palettes:
        image=bpy.data.images.load(str(out/f'{ident}.png'))
        for mat in paint:
            mat.node_tree.nodes.get('Image Texture').image=image
            shader=mat.node_tree.nodes['Principled BSDF']
            shader.inputs['Roughness'].default_value=.24 if ident=='rank-private' else .4
        for name,loc,target,lens in [('near',(-8,-9,3.8),(0,1.6,1.4),41),('side',(-12,1.8,2.5),(0,1.8,1.3),42)]:
            camera.location=loc; camera.rotation_euler=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y').to_euler(); camera.data.lens=lens
            scene.render.filepath=str(folder/f'{ident}-{name}.png'); bpy.ops.render.render(write_still=True)
