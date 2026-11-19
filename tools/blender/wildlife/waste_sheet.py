"""WILD-ART-WASTE review: render each exported animal, then lay it beside its photographs.

Two steps, one file. Blender renders the views of the actual GLB:

  blender -b --factory-startup --python tools/blender/wildlife/waste_sheet.py -- --root . --round 1 --render goat chicken camp-dog

Plain Python then composes the sheet and prints the measured facts:

  python tools/blender/wildlife/waste_sheet.py --root . --round 1 --sheet goat chicken camp-dog

Close views fill the frame for judging shape and coat against the photograph.
Field views are 1:1 crops of what a 1920 x 1080 game frame would show: from
a car (the race camera's 54 degree view, 1.6 m up) at the stated distance,
and from the town's camera (48 degrees, 60 m up, looking down at 45 degrees).
Animals not yet passed are read from .qa-dist/wildlife-candidates (--candidate).
The photographs are fetched by waste_references.py and never enter the game.
"""
import argparse
import json
import math
import struct
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CELL = (498, 250)
FRAME_H = 1080
CAR_FOV, TOWN_FOV = 54, 48

# name: (clip, phase, kind, settings). Close: direction from the animal to the camera.
# Field: distance in metres and the animal's turn towards the camera in degrees.
FARM = [('side', 'Idle', 0, 'close', (0, -1, .10)), ('front', 'Walk', .30, 'close', (.72, -.70, .22)),
        ('rear', 'Idle', .50, 'close', (-.62, -.76, .30)), ('car-10', 'Idle', 0, 'car', (10, 20)),
        ('car-30', 'Walk', .30, 'car', (30, 20)), ('town-60', 'Idle', 0, 'town', (60, 35)),
        ('gait', 'Walk', .65, 'close', (0, -1, .10))]
VIEWS = {
    'goat': FARM, 'camp-dog': FARM,
    'chicken': [v if v[0] != 'rear' else ('rear', 'Idle', .63, 'close', (-.30, -.92, .25)) for v in FARM],
    'turkey-vulture': [('side', 'Idle', 0, 'close', (0, -1, .10)), ('front', 'Idle', .20, 'close', (.72, -.70, .22)),
                       ('below', 'Fly', .25, 'sky', (.10, -.25, -1)), ('soar', 'Fly', .60, 'sky', (.55, -.80, -.25)),
                       ('car-30', 'Idle', 0, 'car', (30, 20)), ('overhead', 'Fly', .25, 'overhead', (30, 25))],
    'desert-monitor': [('side', 'Idle', 0, 'close', (0, -1, .14)), ('front', 'Walk', .30, 'close', (.72, -.70, .30)),
                       ('top', 'Walk', .55, 'close', (0, -.12, 1)), ('car-10', 'Idle', 0, 'car', (10, 20)),
                       ('car-30', 'Walk', .30, 'car', (30, 20)), ('gait', 'Walk', .65, 'close', (0, -1, .14)),
                       ('rear', 'Idle', .50, 'close', (-.62, -.76, .34))],
    'scorpion': [('side', 'Idle', 0, 'close', (0, -1, .16)), ('front', 'Walk', .30, 'close', (.72, -.70, .40)),
                 ('top', 'Idle', .30, 'close', (0, -.12, 1)), ('car-5', 'Idle', 0, 'car', (5, 30)),
                 ('car-10', 'Walk', .30, 'car', (10, 30)), ('rear', 'Walk', .65, 'close', (-.62, -.76, .40))],
}
# Sheet rows: two rows of four cells per animal. 'photo' and 'photo2' are the references.
LAYOUT = {
    'farm': (('photo', 'side', 'front', 'rear'), ('car-10', 'car-30', 'town-60', 'gait')),
    'turkey-vulture': (('photo', 'side', 'front', 'photo2'), ('below', 'soar', 'car-30', 'overhead')),
    'desert-monitor': (('photo', 'side', 'front', 'top'), ('car-10', 'car-30', 'gait', 'rear')),
    'scorpion': (('photo', 'photo2', 'side', 'front'), ('top', 'car-5', 'car-10', 'rear')),
}
CAPTIONS = {'photo': 'Photograph', 'photo2': 'Photograph', 'side': 'Model: side, Idle', 'front': 'Model: front three-quarter',
            'rear': 'Model: rear three-quarter', 'gait': 'Model: side, Walk', 'top': 'Model: from above',
            'car-5': 'From a car at 5 m (1:1 crop of a 1080p frame)', 'car-10': 'From a car at 10 m (1:1 crop of a 1080p frame)',
            'car-30': 'From a car at 30 m (1:1 crop of a 1080p frame)', 'town-60': "Town camera, 60 m up (1:1 crop, 1080p)",
            'below': 'Model: Fly, from below', 'soar': 'Model: Fly, from the side', 'overhead': 'From a car: 25 m up, 30 m ahead (1:1 crop)'}


def home(root, candidate):
    return root / ('.qa-dist/wildlife-candidates' if candidate else 'public/assets/wildlife')


def evidence(root, round_number):
    return root / '.qa-dist/wild-art-waste' / ('round-' + str(round_number))


def glb_facts(path):
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20 + length])
    triangles = sum(gltf['accessors'][p['indices']]['count'] // 3 for mesh in gltf['meshes'] for p in mesh['primitives'])
    view = gltf['bufferViews'][gltf['images'][0]['bufferView']]
    start = 28 + length + view.get('byteOffset', 0)
    return {'triangles': triangles, 'bytes': len(data), 'clips': sorted(a['name'] for a in gltf.get('animations', [])),
            'map': struct.unpack_from('>I', data, start + 16)[0]}


# ------------------------------------------------------------------ Blender

def render(root, round_number, ids, candidate):
    import bpy
    from mathutils import Vector
    out = evidence(root, round_number)
    out.mkdir(parents=True, exist_ok=True)
    for species in ids:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        scene = bpy.context.scene
        bpy.ops.import_scene.gltf(filepath=str(home(root, candidate) / (species + '.glb')))
        rig = next(o for o in scene.objects if o.type == 'ARMATURE')
        mesh = next(o for o in scene.objects if o.type == 'MESH')
        top = rig
        while top.parent:
            top = top.parent
        # A turntable above the model's own root turns and lifts it for the field views.
        table = bpy.data.objects.new('Review turntable', None)
        scene.collection.objects.link(table)
        top.parent = table
        for track in rig.animation_data.nla_tracks:
            track.mute = True
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = 32
        scene.cycles.use_denoising = True
        scene.render.threads_mode = 'FIXED'
        scene.render.threads = 4
        scene.view_settings.view_transform = 'Standard'
        scene.render.image_settings.file_format = 'PNG'
        scene.render.resolution_x, scene.render.resolution_y = CELL
        world = bpy.data.worlds.new('Dusty sky')
        world.use_nodes = True
        world.node_tree.nodes['Background'].inputs[0].default_value = (.62, .70, .82, 1)
        world.node_tree.nodes['Background'].inputs[1].default_value = .25
        scene.world = world
        bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, -.004))
        ground = bpy.context.object
        dust = bpy.data.materials.new('Wasteland dust')
        dust.use_nodes = True
        nodes, links = dust.node_tree.nodes, dust.node_tree.links
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 900
        noise.inputs['Detail'].default_value = 6
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = (.215, .160, .105, 1)
        ramp.color_ramp.elements[1].color = (.330, .265, .185, 1)
        links.new(noise.outputs['Fac'], ramp.inputs[0])
        links.new(ramp.outputs['Color'], nodes['Principled BSDF'].inputs['Base Color'])
        nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
        ground.data.materials.append(dust)
        bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
        sun = bpy.context.object
        sun.data.energy, sun.data.angle = 2.7, math.radians(3)
        sun.rotation_euler = (math.radians(48), 0, math.radians(-28))
        bpy.ops.object.camera_add()
        camera = bpy.context.object
        camera.data.sensor_fit = 'VERTICAL'
        camera.data.clip_end = 2000
        scene.camera = camera

        def pose(clip, phase, turn=0, lift=0):
            action = bpy.data.actions.get(clip)
            assert action, (species, clip)
            rig.animation_data.action = action
            if action.slots:
                rig.animation_data.action_slot = action.slots[0]
            lo, hi = action.frame_range
            scene.frame_set(int(round(lo + (hi - lo) * phase)))
            table.rotation_euler.z = math.radians(turn)
            table.location.z = lift
            bpy.context.view_layer.update()
            evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
            points = [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]
            return (Vector([min(p[i] for p in points) for i in range(3)]), Vector([max(p[i] for p in points) for i in range(3)]))

        def look(location, target):
            camera.location = location
            camera.rotation_euler = (Vector(target) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()

        facts = glb_facts(home(root, candidate) / (species + '.glb'))
        lo, hi = pose('Idle', 0)
        facts['size'] = [round(hi[i] - lo[i], 3) for i in range(3)]
        facts['lowest'] = {}
        for clip in ('Idle', 'Walk', 'Fly'):
            if bpy.data.actions.get(clip):
                facts['lowest'][clip] = round(min(pose(clip, k / 12)[0].z for k in range(12)) * 1000, 1)
        for name, clip, phase, kind, setting in VIEWS[species]:
            # Seen from below against the sky, the ground still throws its light up at the bird.
            ground.visible_camera = kind not in ('sky', 'overhead')
            if kind in ('close', 'sky'):
                lo, hi = pose(clip, phase)
                centre = (lo + hi) / 2
                direction = Vector(setting).normalized()
                camera.data.angle_y = math.radians(16)
                # Fit the animal's box, as this camera sees it, into the frame.
                right = direction.cross(Vector((0, 0, 1)))
                right = right.normalized() if right.length > .05 else Vector((1, 0, 0))
                above = right.cross(direction).normalized()
                corners = [Vector((x, y, z)) - centre for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
                half_w = max(abs(corner.dot(right)) for corner in corners)
                half_h = max(abs(corner.dot(above)) for corner in corners)
                reach = max(half_h * 1.22, half_w * 1.14 * CELL[1] / CELL[0], .05)
                look(centre + direction * reach / math.tan(math.radians(8)), centre)
            else:
                distance, turn = setting
                crop = math.atan(math.tan(math.radians((TOWN_FOV if kind == 'town' else CAR_FOV) / 2)) * CELL[1] / FRAME_H)
                camera.data.angle_y = 2 * crop
                if kind == 'overhead':
                    lo, hi = pose(clip, phase, 90 - turn, 25)
                    centre = (lo + hi) / 2
                    look((0, -distance, 1.6), centre)
                elif kind == 'town':
                    lo, hi = pose(clip, phase, turn)
                    centre = (lo + hi) / 2
                    look(centre + Vector((0, -distance, distance)), centre)
                else:
                    lo, hi = pose(clip, phase, turn)
                    centre = (lo + hi) / 2
                    look((centre.x, centre.y - distance, 1.6), (centre.x, centre.y, max(centre.z, .25)))
            scene.render.filepath = str(out / (species + '-' + name + '.png'))
            bpy.ops.render.render(write_still=True)
        (out / (species + '-facts.json')).write_text(json.dumps(facts, indent=2) + '\n', encoding='utf-8')
        print('WASTE', species, json.dumps(facts))


# ------------------------------------------------------------------ sheet

def sheet(root, round_number, ids, candidate, title, draft):
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    refs = json.loads((HERE / 'waste-references.json').read_text(encoding='utf-8'))
    out = evidence(root, round_number)
    gap, label, head = 10, 26, 40
    block = head + 2 * (CELL[1] + label) + 14
    width = 4 * CELL[0] + 5 * gap
    page = Image.new('RGB', (width, 92 + len(ids) * block + 34), '#1b1a17')
    draw = ImageDraw.Draw(page)
    font = lambda size: ImageFont.truetype('C:/Windows/Fonts/arial.ttf', size)
    draw.text((gap, 12), f'WILD-ART-WASTE | ROUND {round_number} | {title}', font=font(34), fill='#efe7d7')
    draw.text((gap, 56), 'Actual GLB imports beside photographs of the real animal. Top row: close. Bottom row: what the player sees.',
              font=font(19), fill='#bdb6a6')
    credits, rows = [], []
    y = 92
    for species in ids:
        facts = json.loads((out / (species + '-facts.json')).read_text(encoding='utf-8'))
        rows.append({'species': species, **facts})
        size = facts['size']
        motion = 'Fly' if 'Fly' in facts['clips'] else 'Walk'
        extra = len(facts['clips']) - 2
        draw.text((gap, y + 6), f'{species.replace("-", " ").title()}  |  {facts["triangles"]:,} triangles  |  {facts["bytes"] / 1e6:.2f} MB  |  '
                  f'map {facts["map"]}  |  {size[0]:.2f} x {size[1]:.2f} x {size[2]:.2f} m  |  Idle, {motion}'
                  + (f' (+{extra} donor clips)' if extra > 0 else ''), font=font(23), fill='#efe7d7')
        photos = refs['photos'][species]
        for r, row in enumerate(LAYOUT.get(species, LAYOUT['farm'])):
            for col, name in enumerate(row):
                x, top = gap + col * (CELL[0] + gap), y + head + r * (CELL[1] + label)
                if name.startswith('photo'):
                    photo = photos[min(len(photos) - 1, 1 if name == 'photo2' else 0)]
                    source = Image.open(Path(refs['directory']) / photo['file']).convert('RGB')
                    l, t, rr, b = photo['crop']
                    source = source.crop((int(l * source.width), int(t * source.height), int(rr * source.width), int(b * source.height)))
                    cell = ImageOps.fit(source, CELL, Image.Resampling.LANCZOS, centering=(.5, .5)) \
                        if abs(source.width / source.height - CELL[0] / CELL[1]) < .7 else \
                        ImageOps.pad(source, CELL, Image.Resampling.LANCZOS, color='#1b1a17')
                    caption = f'Photograph: {photo["author"]}, {photo["licence"]}'
                    caption = caption if len(caption) < 60 else caption[:57] + '...'
                    credit = f'{photo["title"][5:]} ({photo["author"]}, {photo["licence"]})'
                    if credit not in credits:
                        credits.append(credit)
                else:
                    cell = Image.open(out / (species + '-' + name + '.png')).convert('RGB')
                    caption = CAPTIONS[name]
                page.paste(cell, (x, top))
                draw.text((x + 2, top + CELL[1] + 3), caption, font=font(17), fill='#bdb6a6')
        y += block
    draw.text((gap, page.height - 30), 'Photographs from Wikimedia Commons, public domain or CC0; credits in the review note. '
              'Goat from the CC0 Quaternius deer, dog from the CC0 Quaternius wolf; the rest are original recipes.',
              font=font(17), fill='#bdb6a6')
    # A draft is looked at and fixed first; only a submitted sheet is a round.
    output = out / 'draft.jpg' if draft else root / f'docs/board/looks/wild-art-waste/round-{round_number}.jpg'
    output.parent.mkdir(parents=True, exist_ok=True)
    for quality in (88, 84, 80, 76, 72, 68, 64, 60, 56):
        page.save(output, quality=quality, optimize=True, subsampling=2)
        if output.stat().st_size <= 500000:
            break
    assert output.stat().st_size <= 500000, output.stat().st_size
    print(json.dumps({'sheet': str(output), 'bytes': output.stat().st_size, 'models': rows, 'photographs': credits}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--round', type=int, default=1)
    parser.add_argument('--candidate', action='store_true')
    parser.add_argument('--title', default='CLAUDE REVIEW')
    parser.add_argument('--draft', action='store_true', help='Write the sheet beside the renders, not as a round')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--render', nargs='+', choices=sorted(VIEWS))
    mode.add_argument('--sheet', nargs='+', choices=sorted(VIEWS))
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    root = args.root.resolve()
    if args.render:
        render(root, args.round, args.render, args.candidate)
    else:
        sheet(root, args.round, args.sheet, args.candidate, args.title, args.draft)


if __name__ == '__main__':
    main()
