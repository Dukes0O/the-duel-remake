"""Bind the shipped photo-carved travellers to the shipped fighter skeleton.

blender -b -t 4 --python-exit-code 1 --python tools/blender/story-walkers.py -- --root .
"""
import argparse
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
import numpy as np
from mathutils import Matrix, Euler, Vector
from mathutils.kdtree import KDTree

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
models = args.root.resolve() / 'public/assets/models/wasteland'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(models / 'test-fighter.glb'))
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
reference = next(o for o in scene.objects if o.type == 'MESH' and o.vertex_groups)
rig.animation_data_clear()
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
rig.name = 'Gate company rig'
bpy.context.view_layer.update()

# Transfer the original figure's bind weights by anatomical position. Sitting,
# kneeling and a hand on a cart handle can use the very same joints as driving.
tree = KDTree(len(reference.data.vertices))
weights = []
for vertex in reference.data.vertices:
    tree.insert(reference.matrix_world @ vertex.co, vertex.index)
    weights.append([(reference.vertex_groups[g.group].name, g.weight)
                    for g in vertex.groups if g.weight > 0])
tree.balance()
bpy.data.objects.remove(reference, do_unlink=True)

bpy.ops.import_scene.gltf(filepath=str(models / 'town/walkers.glb'))
# Dace has his own original front, side and back photographs. All three
# crops are 256 x 512. The rear source is mirrored during preparation so
# the satchel stays on the same hip as the front. Feet line up at row 492.
sys.path.insert(0, str(Path(__file__).parent))
from photo_model import Photo, tidy
from hull_model import View, occupancy, largest_part, carve_hull

def carve_dace():
    half = .79
    metres_per_pixel = 2 * half / 483
    row = lambda y: 492 - y / metres_per_pixel
    views = []
    materials = {}
    for side, normal, pick in [
        ('front', (0,0,1), lambda x,y,z:(133.5 + x/metres_per_pixel, row(y))),
        ('side', (1,0,0), lambda x,y,z:(125 - z/metres_per_pixel, row(y))),
        ('back', (0,0,-1), lambda x,y,z:(130 - x/metres_per_pixel, row(y))),
    ]:
        key = 'story-dace-' + side
        photo = Photo(models / 'town/textures' / (key + '.jpg'))
        photo.image.name = key
        view = View(side, photo, [(8,8)], pick, normal, tolerance=30, grey=34)
        # Clear the studio's soft contact shadow and the light gap between
        # legs, which the edge flood cannot reach when both boots touch it.
        view.mask = tidy(photo.rgb().min(axis=2) < 207, 1)
        view.mask[493:,:] = False
        views.append(view)
        photo.bleed(view.mask, passes=8)
        materials[side] = photo.material()
    other_side = View.__new__(View)
    other_side.__dict__ = dict(views[1].__dict__, name='far-side', normal=np.array((-1,0,0)))
    views.append(other_side)
    materials['far-side'] = materials['side']
    views[0].favour = lambda p: 1.8 if p[1] > 1.29 else 1.25
    views[2].favour = lambda p: 1.45
    tests = [v.covers for v in views[:3]]
    bounds = ((-.30,.30),(-.002,1.60),(-.22,.24))
    filled,x,y,z = occupancy(bounds,.0075,tests)
    body = carve_hull('Dace in his mended overshirt', views, materials,
                      largest_part(filled), x,y,z,.0075,1250)
    actor = bpy.data.objects.new('dace', None)
    scene.collection.objects.link(actor)
    body.parent = actor

carve_dace()
# Rell wears the scarfed woman's patched coat. Only the trader's actual pack
# and bedroll transfer to her; the trader himself stays with his town family.
rell = bpy.data.objects['walker-d'].copy()
rell.name = 'rell'
scene.collection.objects.link(rell)
for part in [*bpy.data.objects['walker-d'].children_recursive,
             *bpy.data.objects['walker-trader'].children_recursive]:
    if part.type != 'MESH' or ('walker-d' not in part.name and 'pack ' not in part.name):
        continue
    shell = part.copy()
    scene.collection.objects.link(shell)
    matrix = part.matrix_world.copy()
    shell.parent = rell
    shell.matrix_world = matrix
# Two of the source photo pairs use the same outfit in different dyes.
# Change what each pair carries. The actual trader's canvas roll, slings and
# squash-sided pack keep these silhouettes in the same kit at twenty metres.
import math
for wearer,part_name,offset,tilt,size in [
    ('walker-f','walker-trader pack roll',(.11,.08,.21),(-7,23,17),1.38),
    ('walker-c','walker-trader pack main',(-.21,.01,-.18),(2,-16,-19),.84),
    ('walker-a','walker-trader pack roll',(-.08,.06,-.19),(2,64,-8),1.10),
]:
    donor = bpy.data.objects[part_name]
    copy = donor.copy()
    copy.name = wearer + ' ' + part_name
    scene.collection.objects.link(copy)
    copy.parent = bpy.data.objects[wearer]
    copy.matrix_local = donor.matrix_local.copy()
    copy.location += Vector(offset)
    copy.rotation_euler.rotate(Euler(tuple(math.radians(n) for n in tilt)))
    copy.scale *= size
bpy.context.view_layer.update()
names = ['rell', 'dace', 'walker-kid-a', 'walker-a', 'walker-b', 'walker-c', 'walker-vane',
         'walker-e', 'walker-f', 'walker-g', 'walker-h']
sources = {'rell':'walker-d', 'dace':'story-dace'}
# Keep each of the original three Dace photos at its full resolution. The
# older 190 x 256 crops fit two people across each of the remaining rows.
w,h,pad,columns = 190,256,3,8
tile_w,tile_h = w+2*pad,h+2*pad
atlas_w,atlas_h = tile_w*columns, tile_h*5 + 518
pixels = np.ones((atlas_h,atlas_w,4),dtype=np.float32)
photo_slot = {}
dyes = {'rell':(1.18,.70,.46), 'walker-kid-a':(1.29,1.00,.52)}
stock_slot = 0
for name in names:
    source = sources.get(name,name)
    sides = ['front','side','back'] if name == 'dace' else ['front','side','back','top']
    for side_index, side in enumerate(sides):
        key = source + '-' + side
        photo = bpy.data.images[key]
        width,height = photo.size
        if name == 'dace':
            left,bottom = side_index*(width+2*pad),5*tile_h
        else:
            left,bottom = stock_slot%columns*tile_w,stock_slot//columns*tile_h
            stock_slot += 1
        data = np.empty((height,width,4),dtype=np.float32)
        photo.pixels.foreach_get(data.ravel())
        if name in dyes and side != 'top':
            level = np.linspace(0,1,height)[:,None]
            band = np.clip((level-.43)/.1,0,1) * np.clip((.80-level)/.08,0,1)
            data[:,:,:3] *= 1 + band[:,:,None]*(np.array(dyes[name])-1)
        pixels[bottom:bottom+height+2*pad,left:left+width+2*pad] = np.pad(
            data, ((pad,pad),(pad,pad),(0,0)), mode='edge')
        photo_slot[key] = left+pad,bottom+pad,width,height
# Shared saddle-leather swatch for the small unphotographed fittings.
pixels[-24:,-24:,:3] = (.12,.065,.032)
leather_uv = ((atlas_w-12)/atlas_w, (atlas_h-12)/atlas_h)

with TemporaryDirectory() as directory:
    atlas = bpy.data.images.new('Salt-road clothes', atlas_w, atlas_h, alpha=False)
    atlas.pixels.foreach_set(np.ascontiguousarray(pixels).ravel())
    atlas.filepath_raw = str(Path(directory) / 'salt-road-clothes.jpg')
    atlas.file_format = 'JPEG'
    atlas.save()
    atlas.pack()

material = bpy.data.materials.new('Salt-stained travel clothes')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .91
sampler = material.node_tree.nodes.new('ShaderNodeTexImage')
sampler.image = atlas
material.node_tree.links.new(sampler.outputs['Color'], shader.inputs['Base Color'])

def bind_weights(point, is_pack):
    if is_pack:
        return [('chest', 1)]
    if point.z > 1.57:
        return [('head', 1)]
    totals = {}
    for _, index, distance in tree.find_n(point, 8):
        for bone, weight in weights[index]:
            totals[bone] = totals.get(bone, 0) + weight / max(distance, .009) ** 2
    largest = sorted(totals.items(), key=lambda entry: -entry[1])[:4]
    total = sum(weight for bone, weight in largest)
    return [(bone, weight / total) for bone, weight in largest]

outputs = []
for name in names:
    source = bpy.data.objects[name]
    parts = [o for o in source.children_recursive if o.type == 'MESH']
    local = source.matrix_world.inverted()
    bounds = [(local @ part.matrix_world @ v.co).z for part in parts for v in part.data.vertices]
    floor, stature = min(bounds), max(bounds) - min(bounds)
    baked = []
    for part in parts:
        # Bake the original long-coat hems, both feet and the trader's pack in
        # the same ground frame before binding; no pivot transform is applied twice.
        mesh = part.data.copy()
        transform = (Matrix.Scale(1.83 / stature, 4) @ Matrix.Translation((0, 0, -floor))
                     @ local @ part.matrix_world)
        mesh.transform(transform)
        skin = bpy.data.objects.new('Bound ' + part.name, mesh)
        scene.collection.objects.link(skin)
        groups = {b.name: skin.vertex_groups.new(name=b.name) for b in rig.data.bones}
        for v in mesh.vertices:
            for bone, weight in bind_weights(v.co, 'pack ' in part.name):
                groups[bone].add([v.index], weight, 'REPLACE')
        uv = mesh.uv_layers.active or mesh.uv_layers.new()
        for face in mesh.polygons:
            old_material = mesh.materials[face.material_index]
            photo = old_material.name.removeprefix('Photo / ')
            for index in face.loop_indices:
                u, v = uv.data[index].uv
                if photo in photo_slot:
                    x, y, width, height = photo_slot[photo]
                    uv.data[index].uv = ((x + u*width) / atlas_w, (y + v*height) / atlas_h)
                else:
                    uv.data[index].uv = leather_uv
            face.material_index = 0
        mesh.materials.clear()
        mesh.materials.append(material)
        baked.append(skin)
    bpy.ops.object.select_all(action='DESELECT')
    for skin in baked:
        skin.select_set(True)
    bpy.context.view_layer.objects.active = baked[0]
    bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = 'skin-' + name
    result.parent = rig
    modifier = result.modifiers.new('Gate company rig', 'ARMATURE')
    modifier.object = rig
    outputs.append(result)

bpy.ops.object.select_all(action='DESELECT')
for obj in [rig, *outputs]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(models / 'town/story-walkers.glb'), export_format='GLB',
                          use_selection=True, export_animations=False, export_yup=True,
                          export_image_format='JPEG', export_image_quality=89)
