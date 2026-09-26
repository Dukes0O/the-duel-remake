# Muddy Hollow rocks and logs (EGG-03 art, Kyle's Props A pick).
#
# Source: Quaternius Ultimate Nature Pack (CC0), the FBX files listed in
# SOURCES, kept outside the repository in the art library. This script
# imports each one, recolours it to sit in High Country, converts it to the
# game's Y-up metres with its base at y = 0, and writes the compact mesh file
# the game builds from, plus an editable .blend in ignored art-build. Run:
#   blender -b --factory-startup --python tools/blender/muddy-hollow-props.py -- --root .
import argparse, json, os, sys
from pathlib import Path

LIBRARY = r'C:\Users\kyleb\dev\art-library\quaternius-ultimate-nature-pack\fbx'
parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--source', default=LIBRARY)
parser.add_argument('--paths-only', action='store_true')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
OUT = root / 'src/generated/muddy-hollow-props.json'
NATIVE = root / 'art-build/muddy-hollow-props.blend'
if options.paths_only:
    print(json.dumps({'blend': [str(NATIVE)], 'glb': [], 'json': [str(OUT)]}))
    sys.exit(0)

import bpy, bmesh

SOURCES = ['Rock_1', 'Rock_2', 'Rock_3', 'Rock_5', 'Rock_Moss_1', 'Rock_Moss_2', 'WoodLog']
# Linear colours matched to the alpine granite and meadow; the pack's cool
# blue-grey rock and red-brown wood read as foreign beside the course.
RECOLOUR = {
    'Rock': [0.118, 0.112, 0.100],
    'Green': [0.075, 0.118, 0.042],
    'DarkGreen': [0.048, 0.078, 0.030],
    'Wood': [0.150, 0.092, 0.052],
    'LightWood': [0.300, 0.205, 0.120],
    'Mushroom_Top': [0.150, 0.110, 0.080],
    'Mushroom_Bottom': [0.330, 0.270, 0.210],
}


def material_colour(material):
    name = material.name.split('.')[0] if material else 'Rock'
    if name in RECOLOUR:
        return name, RECOLOUR[name]
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    return name, [round(c, 3) for c in bsdf.inputs['Base Color'].default_value[:3]]


def export_prop(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh = bmesh.new()
    mesh.from_mesh(ob.data)
    bmesh.ops.triangulate(mesh, faces=mesh.faces[:])
    xs = [v.co.x for v in mesh.verts]; ys = [v.co.y for v in mesh.verts]; zs = [v.co.z for v in mesh.verts]
    cx, cy, base = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    # Blender Z up to game Y up: (x, y, z) -> (x, z, -y), centred, base at 0.
    positions = []
    for v in mesh.verts:
        positions += [round(v.co.x - cx, 4), round(v.co.z - base, 4), round(-(v.co.y - cy), 4)]
    materials = [material_colour(m) for m in ob.data.materials] or [('Rock', RECOLOUR['Rock'])]
    groups = []
    for slot in range(len(materials)):
        faces = [f for f in mesh.faces if f.material_index == slot]
        if not faces:
            continue
        indices = [v.index for f in faces for v in f.verts]
        groups.append({'material': materials[slot][0], 'indices': indices})
    size = [round(max(xs) - min(xs), 4), round(max(zs) - min(zs), 4), round(max(ys) - min(ys), 4)]
    mesh.free()
    return {'size': size, 'positions': positions, 'groups': groups}, dict(materials)


def main():
    props, colours = {}, {}
    for name in SOURCES:
        props[name], used = export_prop(os.path.join(options.source, name + '.fbx'))
        colours.update(used)
    data = {
        'revision': 1,
        'source': 'Quaternius Ultimate Nature Pack, CC0 1.0 (tools/art/catalog.json)',
        'materials': {name: {'color': colour} for name, colour in sorted(colours.items())},
        'props': props,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as handle:
        json.dump(data, handle, separators=(',', ':'))
        handle.write('\n')
    # Keep an editable source of the last imported prop set for review.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for name in SOURCES:
        bpy.ops.import_scene.fbx(filepath=os.path.join(options.source, name + '.fbx'))
    NATIVE.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))
    print('wrote', OUT, OUT.stat().st_size, 'bytes')


main()
