"""Rebuild the neutral Rook control sculpt from committed explicit mesh data.

No runtime asset is written. Candidate rig, UV and paint work follows a reviewed
neutral silhouette and has a separate acceptance gate.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path


def arguments():
    raw = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--stage', choices=('neutral',), default='neutral')
    parser.add_argument('--source', default='tools/blender/rook-p2-source.json')
    parser.add_argument('--landmarks', default='tools/blender/rook-p2-landmarks.json')
    parser.add_argument('--output-dir', default='art-build/crew/rook-p2')
    parser.add_argument('--isolate', choices=('all', 'boots', 'torso'), default='all')
    parser.add_argument('--paths-only', action='store_true')
    return parser.parse_args(raw)


def within(path, directory):
    return path == directory or directory in path.parents


def plan(args):
    root = Path(args.root).resolve()
    output = (root / args.output_dir).resolve()
    if not any(within(output, root / ignored) for ignored in ('art-build', '.evidence')):
        raise ValueError('Rook review output must stay in ignored art-build or .evidence under --root')
    if output in (root / 'art-build', root / '.evidence'):
        raise ValueError('Choose a dedicated Rook review output directory')
    boots = args.isolate == 'boots'
    torso = args.isolate == 'torso'
    views = ('front', 'side', 'three-quarter') if boots or torso else ('front', 'side', 'back')
    prefix = 'boot' if boots else 'torso' if torso else 'neutral'
    stem = 'rook-p2-boots' if boots else 'rook-p2-torso' if torso else 'rook-p2-neutral'
    manifest = 'boot-manifest.json' if boots else 'torso-manifest.json' if torso else 'manifest.json'
    return {
        'blend': [str(output / f'{stem}.blend')],
        'glb': [],
        'textures': [],
        'evidence': [str(output / f'{prefix}-{view}.png') for view in views]
                    + [str(output / manifest)],
    }


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(args, paths):
    # This import belongs after --paths-only and all path validation.
    import bpy
    from mathutils import Vector

    root = Path(args.root).resolve()
    source_path = (root / args.source).resolve()
    landmark_path = (root / args.landmarks).resolve()
    if not within(source_path, root / 'tools' / 'blender') or not within(landmark_path, root / 'tools' / 'blender'):
        raise ValueError('Neutral input must be the committed Blender JSON under tools/blender')
    source = json.loads(source_path.read_text(encoding='utf-8'))
    landmarks = json.loads(landmark_path.read_text(encoding='utf-8'))
    reference = (root / landmarks['reference']['path']).resolve()
    if not within(reference, root / 'public' / 'assets' / 'reference'):
        raise ValueError('Landmark reference is outside the approved local reference folder')
    if sha(reference) != landmarks['reference']['sha256']:
        raise ValueError('Approved reference changed')
    if source['version'] != 1 or source['units'] != 'metres' or source['coordinates'] != 'blender-z-up' or source['height'] != 1.83:
        raise ValueError('Unsupported neutral source coordinates or height')
    if landmarks['version'] != 1 or landmarks['height'] != 1.83:
        raise ValueError('Unsupported Rook landmarks')

    output = Path(paths['blend'][0]).parent
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for item in source['meshes']:
        mesh = bpy.data.meshes.new(item['name'])
        mesh.from_pydata(item['vertices'], [], item['faces'])
        mesh.update()
        obj = bpy.data.objects.new(item['name'], mesh)
        bpy.context.scene.collection.objects.link(obj)
        obj['rookRole'] = item['role']
        obj['lod'] = item['lod']
        if item['lod'] == 'far' or args.isolate == 'boots' and not item['role'].startswith('boot'):
            obj.hide_render = True
            obj.hide_set(True)
        else:
            tone = {
                'body-core': .49, 'jacket': .36, 'vest-left': .56,
                'vest-right': .56, 'scarf': .53, 'trousers': .33,
                'boots': .23, 'boot-trim': .12, 'boot-lace': .06,
                'pack': .49, 'pocket': .54,
                'strap': .47, 'glove': .26, 'hair': .19, 'face': .22,
                'skin': .48,
            }.get(item['role'], .42)
            neutral = bpy.data.materials.get(f"Neutral {item['role']}")
            if neutral is None:
                neutral = bpy.data.materials.new(f"Neutral {item['role']}")
                neutral.diffuse_color = (tone, tone, tone, 1)
                neutral.use_nodes = True
                neutral.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (tone, tone, tone, 1)
                neutral.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .91
            obj.data.materials.append(neutral)
            for polygon in mesh.polygons:
                polygon.use_smooth = True

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.render.resolution_x = 500 if args.isolate in ('boots', 'torso') else 300
    scene.render.resolution_y = 500 if args.isolate == 'torso' else 300 if args.isolate == 'boots' else 761
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.world.color = (.62, .60, .56)
    camera_data = bpy.data.cameras.new('Reference scale orthographic camera')
    camera = bpy.data.objects.new('Reference scale orthographic camera', camera_data)
    scene.collection.objects.link(camera)
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = (300 / (761 / 2.37) if args.isolate == 'boots'
                               else 1.02 if args.isolate == 'torso' else 761 * 1.83 / 578)
    scene.camera = camera
    for name, position, power in [('Key', (-3, -4, 5), 650), ('Fill', (3, -2, 3), 340), ('Rim', (1, 4, 4), 480)]:
        light_data = bpy.data.lights.new(name, 'AREA')
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = position
        light_data.energy = power
        light_data.shape = 'DISK'
        light_data.size = 4
        light.rotation_euler = (Vector((0, 0, .9)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    # Rook's approved profile faces right: looking from -X puts model front
    # (-Y) at image right. +X would silently mirror the reference comparison.
    target_height = (.16 if args.isolate == 'boots' else 1.30 if args.isolate == 'torso'
                     else (641 - 761 / 2) * 1.83 / 578)
    views = [('front', (0, -6, target_height)), ('side', (-6, 0, target_height)),
             ('three-quarter', (-4, -5, target_height + .5))] if args.isolate == 'boots' else [
             ('front', (0, -6, target_height)), ('side', (-6, 0, target_height)),
             ('back', (0, 6, target_height))]
    if args.isolate == 'torso':
        views = [('front', (0, -6, target_height)),
                 ('side', (-6, 0, target_height)),
                 ('three-quarter', (-4, -5, target_height))]
    prefix = 'boot' if args.isolate == 'boots' else 'torso' if args.isolate == 'torso' else 'neutral'
    for view, position in views:
        camera.location = position
        camera.rotation_euler = (Vector((0, 0, target_height)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(output / f'{prefix}-{view}.png')
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=paths['blend'][0])
    totals = {'near': 0, 'far': 0}
    for item in source['meshes']:
        totals[item['lod']] += sum(len(face) - 2 for face in item['faces'])
    manifest = {
        'task': 'GFX-01-P2', 'stage': 'neutral-boots' if args.isolate == 'boots' else 'neutral-torso' if args.isolate == 'torso' else 'neutral',
        'blender': bpy.app.version_string,
        'source': {'path': source_path.relative_to(root).as_posix(), 'sha256': sha(source_path)},
        'landmarks': {'path': landmark_path.relative_to(root).as_posix(), 'sha256': sha(landmark_path)},
        'reference': {'path': reference.relative_to(root).as_posix(), 'sha256': sha(reference)},
        'heightMetres': 1.83, 'controlTriangles': totals,
        'camera': {'kind': 'orthographic', 'scaleMetres': camera_data.ortho_scale,
                   'targetHeightMetres': target_height,
                   'renderPixels': [scene.render.resolution_x, scene.render.resolution_y],
                   'views': [view for view, _ in views],
                   'sideFrom': '-X', 'physicalFront': '-Y', 'profileFaces': 'right'},
        'glb': [], 'textures': [],
        'outputs': {path.name: sha(path) for path in (output / f'{prefix}-{view}.png' for view, _ in views)},
    }
    manifest_path = output / ('boot-manifest.json' if args.isolate == 'boots' else 'torso-manifest.json' if args.isolate == 'torso' else 'manifest.json')
    with manifest_path.open('w', encoding='utf-8', newline='\n') as target:
        target.write(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest))


def main():
    args = arguments()
    paths = plan(args)
    if args.paths_only:
        print(json.dumps(paths))
        return
    build(args, paths)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(2)
