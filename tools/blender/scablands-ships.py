"""Build the stranded ships and lighthouse, then review the exported GLB."""
import argparse
import math
import json
import sys
from pathlib import Path

# Patience funnel dimensions and pixel landmarks, read from
# .evidence/grid-funnel-{side,front,top}.png (generated source dimensions vary).
# Side (467x800): body ends x=62/430, ground y=780; 368 px = 3.5 m; top y=20.
# Front (667x800): centre x=333, ground y=780, top y=12; 768 px = 6 m.
# Top (800x571): front/rear x=30/773, centre y=286; width spans y=38..533.
# Patience upperworks dimensions and pixel landmarks, read from
# .qa-dist/grid-{side,front,rear,top}.png (each source crop is 768 x 512 px).
# Side: aft/front ends x=40/720, deck y=460. Front: centre x=384, deck y=460,
# roof y=140. Rear: centre x=384, deck y=476, roof y=130. Plan: bow/stern x=638/100, centre y=245;
# bridge-wing span y=54..436. Window and door boxes below are pixel rectangles
# read from those same grids, not estimated from the rendered mesh.
# Hull stations are sampled along the outline in .qa-dist/grid-hull-top.png.
# The side grid sets the 8 m midships depth (deck y=45, keel y=155); bow and
# stern grids confirm that depth at the ends. Breadths are the measured top
# outline, normalized to the 12 m maximum beam in the top grid.
HULL_LENGTH = 72.0
HULL_WIDTH = 12.0
HULL_STATIONS = (
    (-.500, .14), (-.483, .28), (-.467, .42), (-.433, .65), (-.400, .79), (-.367, .88),
    (-.333, .94), (-.300, .975), (-.267, .992), (-.233, 1.0), (-.200, 1.0),
    (-.167, 1.0), (-.133, 1.0), (-.100, 1.0), (-.067, 1.0), (-.033, 1.0),
    (0.000, 1.0), (.033, 1.0), (.067, .998), (.100, .994), (.133, .988),
    (.167, .980), (.200, .970), (.233, .957), (.267, .940), (.300, .916),
    (.333, .885), (.367, .840), (.400, .775), (.433, .675), (.467, .505),
    (.500, .025),
)
UPPER_SCALE = .0244
UPPER_LENGTH = (720 - 40) * UPPER_SCALE
UPPER_DECK_WIDTH = (600 - 190) * UPPER_SCALE
UPPER_WING_WIDTH = (683 - 108) * UPPER_SCALE
UPPER_HEIGHT = (460 - 140) * UPPER_SCALE
UPPER_SIDE_START, UPPER_SIDE_END, UPPER_SIDE_GROUND = 720, 40, 460
UPPER_FRONT = {'centre': 384, 'ground': 460, 'top': 140, 'top_height': UPPER_HEIGHT}
UPPER_REAR = {'centre': 384, 'ground': 476, 'top': 130, 'top_height': UPPER_HEIGHT}
UPPER_TOP = {'front': 145, 'rear': 675, 'centre': 245, 'along': 'x',
             'x_scale': UPPER_WING_WIDTH / (436 - 54)}
UPPER_SIDE_SCALE = UPPER_LENGTH / (UPPER_SIDE_START - UPPER_SIDE_END)
UPPER_SIDE_WINDOWS = (
    (230, 268, 248, 300), (279, 265, 300, 300), (411, 258, 439, 300),
    (475, 255, 499, 292), (501, 255, 530, 293),
)
UPPER_SIDE_PORTHOLES = tuple((x - 9, 370, x + 9, 390)
                             for x in (197, 352, 434, 508, 553, 594, 672))
UPPER_SIDE_DOORS = ((500, 365, 531, 457), (310, 365, 338, 457))
UPPER_FRONT_BRIDGE_WINDOWS = tuple((x0, 164, x1, 202) for x0, x1 in (
    (202, 244), (246, 286), (288, 330), (332, 374), (376, 418),
    (420, 462), (464, 506), (508, 550), (552, 600),
))
UPPER_FRONT_WINDOWS = ((245, 245, 288, 270), (327, 245, 353, 271),
                       (511, 245, 557, 272))
UPPER_FRONT_PORTHOLES = tuple((x - 9, 369, x + 9, 389)
                              for x in (255, 327, 435, 533))
UPPER_FRONT_DOORS = ((363, 363, 399, 457),)
UPPER_REAR_PORTHOLES = tuple((x - 9, 370, x + 9, 390)
                             for x in (246, 302, 468, 518))
UPPER_REAR_DOORS = ((274, 370, 314, 458), (452, 370, 492, 458))

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--stage', choices=('patience', 'fleet', 'family'), default='patience')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--compose-sheet', action='store_true')
parser.add_argument('--render-view', choices=('whole', 'hope', 'marigold', 'patience', 'above', 'deck-good-hope', 'deck-marigold',
                                               'port-good-hope', 'starboard-good-hope', 'port-marigold', 'starboard-marigold',
                                               'port-patience', 'starboard-patience', 'lighthouse-road',
                                               'lighthouse-dusk', 'lighthouse-landing', 'lighthouse-above',
                                               'pilot-boat-road', 'pilot-boat-side', 'pilot-boat-above'), default=None)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/ships.glb'
sheet = root / f'docs/board/looks/ww-art-ships/round-{args.round}.jpg'
raw = root / f'.qa-dist/ships-round-{args.round}'
tex = root / 'public/assets/models/wasteland/scablands/textures'
inputs = {
    'rusted-steel': tex / 'dam-rust.jpg',
    'galvanised-tin': tex / 'dam-steel.jpg',
    'weathered-plank': tex / 'dam-gatehouse-stone.jpg',
}
photos = {name: tex / f'{name}.jpg' for name in ('lighthouse-stone-photo', 'pilot-boat-photo')}
# Strength of each of the beam's four lengths, from the lamp outwards.
BEAM_FADE = (1.0, .6, .32, .12)
if args.paths_only:
    print(json.dumps({'blend': [str(root / 'art-build/wasteland-ships/ships.blend')],
                      'glb': [str(out)], 'evidence': [str(raw)], 'summary': [str(sheet)]}))
    raise SystemExit(0)
if args.compose_sheet:
    from PIL import Image, ImageOps
    names = ('whole', 'hope', 'marigold', 'above', 'deck-good-hope', 'deck-marigold')
    images = {name: Image.open(raw / f'{name}.jpg').convert('RGB') for name in names}
    canvas = Image.new('RGB', (1600, 1800))
    layout = {'whole': (0, 0, 800, 600), 'hope': (800, 0, 800, 600),
              'marigold': (0, 600, 800, 600), 'above': (800, 600, 800, 600),
              'deck-good-hope': (0, 1200, 800, 600), 'deck-marigold': (800, 1200, 800, 600)}
    for name, (x, y, w, h) in layout.items():
        canvas.paste(ImageOps.fit(images[name], (w, h), Image.Resampling.LANCZOS), (x, y))
    canvas.save(sheet, 'JPEG', quality=83, optimize=True, progressive=True)
    print(f'Sheet: {sheet} ({sheet.stat().st_size} bytes; {canvas.width} x {canvas.height})')
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector, Matrix, Quaternion
if args.render_view:
    review_scene = root / f'.qa-dist/ships-round-{args.round}/review.blend'
    bpy.ops.wm.open_mainfile(filepath=str(review_scene))
    scene = bpy.context.scene
    camera_view = args.render_view
    if camera_view.startswith('pilot-boat-'):
        camera_view = 'whole'
    if camera_view.startswith(('port-', 'starboard-')):
        camera_view = {'good-hope':'hope','marigold':'marigold','patience':'patience'}[camera_view.split('-',1)[1]]
    scene.camera = bpy.data.objects[f'review-camera-{camera_view}']
    def set_tree_visibility(name, visible):
        root_obj = scene.objects.get(name)
        if root_obj is None:
            return
        stack = [root_obj]
        while stack:
            obj = stack.pop()
            obj.hide_render = not visible
            stack.extend(obj.children)
    set_tree_visibility('lighthouse', False)
    set_tree_visibility('pilot-boat', False)
    if args.render_view.startswith('pilot-boat-'):
        set_tree_visibility('pilot-boat', True)
        for name in ('ship-patience', 'ship-good-hope', 'ship-marigold'):
            set_tree_visibility(name, False)
        for obj in scene.objects:
            if obj.name == 'lake-bed geometry': obj.hide_render = True
        target = Vector((230, 430, 1.1))
        if args.render_view == 'pilot-boat-road':
            scene.camera.location = Vector((247.9, 445, -1.2))
            scene.camera.data.lens = 38
        elif args.render_view == 'pilot-boat-side':
            scene.camera.location = Vector((230, 452, -1.2))
            scene.camera.data.lens = 45
        else:
            scene.camera.location = Vector((251, 451, 22.3))
            scene.camera.data.lens = 38
        scene.camera.rotation_euler = (target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.resolution_x, scene.render.resolution_y = 1200, 900
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(root / f'.qa-dist/check-pilot-boat-{args.render_view.removeprefix("pilot-boat-")}.png')
        bpy.ops.render.render(write_still=True)
        print(f'Rendered {args.render_view}: {scene.render.filepath}')
        raise SystemExit(0)
    if args.render_view.startswith('lighthouse-'):
        set_tree_visibility('lighthouse', True)
        for name in ('ship-patience', 'ship-good-hope', 'ship-marigold'):
            set_tree_visibility(name, False)
        for obj in scene.objects:
            if obj.name.startswith(('pilot-boat', 'ship-patience', 'ship-good-hope', 'ship-marigold')):
                obj.hide_render = True
            if obj.name == 'lake-bed geometry':
                obj.hide_render = True
        for mat in bpy.data.materials:
            if mat.name.startswith('Lighthouse / soft translucent beam ') and mat.use_nodes:
                shader = mat.node_tree.nodes.get('Principled BSDF')
                fade = BEAM_FADE[int(mat.name.rsplit(' ', 1)[1].split('.')[0])]
                if shader:
                    shader.inputs['Alpha'].default_value = (.18 if args.render_view == 'lighthouse-dusk' else .045) * fade
                    shader.inputs['Emission Strength'].default_value = (.42 if args.render_view == 'lighthouse-dusk' else .06) * fade
        if args.render_view == 'lighthouse-dusk':
            for light_obj in scene.objects:
                if light_obj.type == 'LIGHT' and light_obj.data.type == 'SUN':
                    light_obj.data.energy = 1.5
                    light_obj.data.color = (1.0, .43, .22)
            scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.025, .035, .075, 1)
            scene.world.node_tree.nodes['Background'].inputs[1].default_value = .70
            glow_data = bpy.data.lights.new('lighthouse warm lantern bounce', 'POINT')
            glow_data.energy = 9000; glow_data.color = (1.0, .40, .12); glow_data.shadow_soft_size = 2.0
            glow_obj = bpy.data.objects.new('lighthouse warm lantern bounce', glow_data)
            scene.collection.objects.link(glow_obj); glow_obj.location = Vector((170, 395, 27))
    if args.render_view.startswith(('port-', 'starboard-')):
        side, ship_name = args.render_view.split('-', 1)
        subject_name = {'good-hope': 'ship-good-hope', 'marigold': 'ship-marigold',
                        'patience': 'ship-patience'}[ship_name]
        for name in ('ship-patience', 'ship-good-hope', 'ship-marigold'):
            set_tree_visibility(name, name == subject_name)
        subject = scene.objects[subject_name]
        rotation = subject.matrix_world.to_3x3()
        bow = subject.matrix_world @ Vector((22.0, 0.0, 2.8))
        forward = rotation @ Vector((1, 0, 0))
        outboard = rotation @ Vector((0, -1 if side == 'starboard' else 1, 0))
        scene.camera.location = bow + forward * 28.3 + outboard * 28.3
        scene.camera.location.z = -1.2
        scene.camera.rotation_euler = (bow - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera.data.lens = 35
    close_subject = {
        'hope': 'ship-good-hope',
        'marigold': 'ship-marigold',
        'patience': 'ship-patience',
    }.get(args.render_view)
    if close_subject:
        for name in ('ship-patience', 'ship-good-hope', 'ship-marigold'):
            set_tree_visibility(name, name == close_subject)
        # Put the car-height camera 40 m out from the photographed bow name,
        # looking back across the stem and along the side plating.
        subject_root = scene.objects.get(close_subject)
        t = .367
        _, breadth = min(HULL_STATIONS, key=lambda station: abs(station[0] - t))
        side_sign = -1
        local_point = Vector((72.0 * t, side_sign * (12.0 * breadth * .5 + .025), -2.35))
        target = subject_root.matrix_world @ local_point
        target.z += 12.0
        rotation = subject_root.matrix_world.to_3x3()
        forward = rotation @ Vector((1, 0, 0))
        outboard = rotation @ Vector((0, 1, 0))
        scene.camera.location = target + forward * 28.0 + outboard * (28.0 * side_sign)
        scene.camera.location.z = -1.2
        scene.camera.rotation_euler = (target - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera.data.lens = 27
    if args.render_view == 'whole':
        scene.camera.location = Vector((80, 330, 1.2))
        scene.camera.rotation_euler = (
            Vector((5, 440, 60)) - scene.camera.location
        ).to_track_quat('-Z', 'Y').to_euler()
        scene.camera.data.lens = 20
    if args.render_view == 'above':
        scene.camera.data.type = 'PERSP'
        scene.camera.data.lens = 18
    if args.render_view == 'whole':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(root / '.qa-dist/check-fleet.png')
    elif args.render_view == 'hope':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(root / '.qa-dist/check-good-hope.png')
    elif args.render_view == 'marigold':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(root / '.qa-dist/check-marigold.png')
    elif args.render_view == 'patience':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(root / '.qa-dist/check-patience.png')
    elif args.render_view == 'above':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(root / '.qa-dist/check-ships-above.png')
    elif args.render_view.startswith(('port-', 'starboard-')):
        side, ship_name = args.render_view.split('-', 1)
        scene.render.image_settings.file_format = 'PNG'
        scene.render.resolution_x, scene.render.resolution_y = 1200, 900
        scene.render.filepath = str(root / f'.qa-dist/check-{ship_name}-{side}.png')
    elif args.render_view == 'deck-good-hope':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.resolution_x, scene.render.resolution_y = 1200, 900
        scene.render.filepath = str(root / '.qa-dist/check-good-hope-deck.png')
    elif args.render_view.startswith('lighthouse-'):
        scene.render.image_settings.file_format = 'PNG'
        if args.render_view in ('lighthouse-landing', 'lighthouse-above'): scene.render.resolution_x, scene.render.resolution_y = 900, 900
        else: scene.render.resolution_x, scene.render.resolution_y = 900, 1200
        scene.render.filepath = str(root / f'.qa-dist/check-{args.render_view}.png')
    else:
        scene.render.filepath = str(root / f'.qa-dist/ships-round-{args.round}/{args.render_view}.jpg')
    bpy.ops.render.render(write_still=True)
    print(f'Rendered {args.render_view}: {scene.render.filepath}')
    raise SystemExit(0)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_carve import carve_object
from photo_model import Photo as DetailPhoto, Mesh as DetailMesh, trace, slab, lathe

missing = [str(p) for p in [*photos.values(),
                           tex / 'patience-hull-side.jpg', tex / 'patience-hull-bow.jpg',
                           tex / 'patience-hull-stern.jpg', tex / 'patience-hull-top.jpg',
                           *[tex / f'{ship}-upperworks-{view}.jpg'
                             for ship in ('good-hope','marigold')
                             for view in ('side','bow','stern','top')]] if not p.is_file()]
if missing:
    raise FileNotFoundError('Ship source photographs are missing: ' + ', '.join(missing))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
# Isolated detail crops come from the measured side photograph, not painted panels.
mast_crop_path = tex / 'patience-bridge-mast-side.png'
source_image = bpy.data.images.load(str((tex / 'patience-upperworks-side.jpg').resolve()))
source_pixels = np.empty(source_image.size[0] * source_image.size[1] * 4, dtype=np.float32)
source_image.pixels.foreach_get(source_pixels)
source_pixels = source_pixels.reshape(source_image.size[1], source_image.size[0], 4)
def save_photo_crop(path, box):
    x0, y0, x1, y1 = box
    cut = source_pixels[source_image.size[1] - y1:source_image.size[1] - y0, x0:x1]
    image = bpy.data.images.new(path.stem, x1 - x0, y1 - y0, alpha=True)
    image.pixels.foreach_set(cut.ravel())
    image.filepath_raw = str(path)
    image.file_format = 'PNG'
    image.save()
    bpy.data.images.remove(image)
save_photo_crop(mast_crop_path, (405, 8, 490, 145))
bpy.data.images.remove(source_image)
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1000
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 90
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.world = bpy.data.worlds.new('Ship photo review overcast')
scene.world.color = (.32, .32, .32)

materials = town.make_materials(inputs)
for key in ('rusted-steel', 'galvanised-tin'):
    materials[key].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .28
    materials[key].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .88
materials['iron-dark'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .20

def photo_material(name, path, metallic=0, roughness=.9, emission=False):
    image = bpy.data.images.load(str(path.resolve()), check_existing=False)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    texnode = nodes.new('ShaderNodeTexImage')
    texnode.image = image
    texnode.interpolation = 'Linear'
    mat.node_tree.links.new(texnode.outputs['Color'], shader.inputs['Base Color'])
    if emission:
        shader.inputs['Emission Color'].default_value = (.95, .57, .16, 1)
        shader.inputs['Emission Strength'].default_value = 2.5
    mat.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    return mat

def retone_photo_material(mat):
    """Make a material-owned faded copy; leave its credited source photo intact."""
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    texture = next((node for node in nodes if node.type == 'TEX_IMAGE'), None)
    shader = next((node for node in nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if texture is None or shader is None or mat.get('marigold_material_grade'):
        return
    source = texture.image
    if not source.get('marigold_material_grade'):
        pixels = np.empty(source.size[0] * source.size[1] * 4, dtype=np.float32)
        source.pixels.foreach_get(pixels)
        pixels = pixels.reshape(source.size[1], source.size[0], 4)
        rgb = pixels[:, :, :3].copy()
        luminance = rgb @ np.array((.299, .587, .114), dtype=np.float32)
        chalk = np.stack((luminance * 1.03, luminance * .92, luminance * .76), axis=-1)
        pixels[:, :, :3] = np.clip((chalk * .72 + rgb * .28) * .78, 0, 1)
        source.pixels.foreach_set(pixels.ravel())
        source.update()
        source.pack()
        source['marigold_material_grade'] = 'chalky ochre with retained rust color variation'
    base = shader.inputs['Base Color']
    for link in list(base.links):
        links.remove(link)
    # The GLB exporter keeps the image map but drops Blender-only color nodes.
    # This per-material copy therefore carries the same grade in the GLB.
    base.default_value = (1, 1, 1, 1)
    links.new(texture.outputs['Color'], base)
    shader.inputs['Roughness'].default_value = .94
    mat['marigold_material_grade'] = 'chalky ochre with retained rust color variation'

def faired_hull(name, root, length, width, deck, keel, photo_prefix, label):
    """Build the three sister hulls from one measured table of ship stations."""
    section = []
    deck_heights = []
    for t, breadth_factor in HULL_STATIONS:
        sheer = 2.0 * max(0.0, t) ** 2.1
        edge_y = deck - keel + sheer
        half = width * breadth_factor * .5
        bilge_radius = 1.5
        bottom_half = max(.05, half - bilge_radius)
        ring = [(0.0, -bottom_half + 2 * bottom_half * i / 16)
                for i in range(17)]
        # A measured 1.5 m quarter-round bilge joins the flat bottom to the
        # straight side. The forward stations flare through their table widths.
        for step in range(1, 9):
            angle = -math.pi / 2 + (math.pi / 2) * step / 8
            y = bilge_radius + bilge_radius * math.sin(angle)
            z = bottom_half + bilge_radius * math.cos(angle)
            ring.append((y, z))
        for step in range(1, 7):
            ring.append((bilge_radius + (edge_y - bilge_radius) * step / 6, half))
        ring.extend(((edge_y + .30, half), (edge_y + .70, half),
                     (edge_y + 1.0, half), (edge_y + 1.0, half - .18),
                     (edge_y - .25, half - .18)))
        starboard_path = ring[17:]
        # This cross-section span is the open deck; the inset deck plate is a
        # separate named part that follows the same measured outline.
        deck_start = len(ring) - 1
        for step in range(1, 17):
            ring.append((edge_y - .25, (half - .18) * (1 - 2 * step / 16)))
        deck_end = len(ring) - 1
        # Mirror the inside and outside plating around the flat keel.
        ring.extend((y, -z) for y, z in reversed(starboard_path))
        section.append(ring)
        deck_heights.append(edge_y)

    section_size = len(section[0])
    verts = []
    for station_index, ((t, breadth_factor), ring) in enumerate(zip(HULL_STATIONS, section)):
        station_x = t * length
        edge_y = deck_heights[station_index]
        for y, z in ring:
            rake = 0.0
            if t > .30:
                rake = -3.5 * max(0.0, 1 - y / edge_y) * min(1.0, (t - .30) / .20)
            elif t < -.40:
                rake = 1.6 * max(0.0, 1 - y / edge_y) * min(1.0, (-.40 - t) / .10)
            verts.append(gv((station_x + rake, y, z)))

    faces, material_ids = [], []
    for i in range(len(section) - 1):
        for j in range(section_size):
            if deck_start <= j < deck_end:
                continue
            a, b = i * section_size + j, i * section_size + (j + 1) % section_size
            faces.append((a, b, (i + 1) * section_size + (j + 1) % section_size,
                          (i + 1) * section_size + j))
            y0, z0 = section[i][j]
            y1, z1 = section[i][(j + 1) % section_size]
            above_deck = min(y0, y1) >= deck_heights[i] - .01
            material_ids.append(3 if above_deck else 0)
    # Carry the side plating around the stems; the end-board photos read pale.
    faces.append(tuple(range(section_size - 1, -1, -1)))
    material_ids.append(4)
    faces.append(tuple((len(section) - 1) * section_size + j for j in range(section_size)))
    material_ids.append(4)

    mesh = bpy.data.meshes.new(name + ' station-faired hull')
    mesh.from_pydata(verts, [], faces)
    side_mat = photo_material(name + ' hull / side photograph', tex / f'{photo_prefix}-hull-side.jpg')
    bow_mat = photo_material(name + ' hull / bow photograph', tex / f'{photo_prefix}-hull-bow.jpg')
    stern_mat = photo_material(name + ' hull / stern photograph', tex / f'{photo_prefix}-hull-stern.jpg')
    for material in (side_mat, bow_mat, stern_mat, rust):
        mesh.materials.append(material)
    side_image = next(node.image for node in side_mat.node_tree.nodes if node.type == 'TEX_IMAGE')
    uv = mesh.uv_layers.new(name='Station hull photo projection')
    for poly, material_index in zip(mesh.polygons, material_ids):
        poly.material_index = 0 if material_index == 4 else material_index
        for loop_index in poly.loop_indices:
            vi = mesh.loops[loop_index].vertex_index
            station_index, section_index = divmod(vi, section_size)
            t = HULL_STATIONS[station_index][0]
            y, z = section[station_index][section_index]
            edge_y = deck_heights[station_index]
            if material_index == 4:
                u_center = .08 if station_index == 0 else .92
                uv.data[loop_index].uv = (u_center + .035 * z / width,
                                          1 - min(1.0, max(0.0, y / edge_y)))
            elif material_index == 0:
                # Source side photographs show the bow at the left edge.
                row = 155 - 110 * min(1.0, max(0.0, y / edge_y))
                longitudinal = (.035 if station_index == 0 else .965 if station_index == len(section)-1 else 1-(t+.5))
                # The upper bow flare reaches the pale studio edge of the side
                # photo. Keep its side-plating projection on the darker painted
                # hull, matching the adjacent station rather than sampling sky.
                if t > .367:
                    longitudinal = max(longitudinal, .12)
                uv.data[loop_index].uv = (longitudinal, 1 - row / side_image.size[1])
            elif material_index == 1:
                # Bow grid: 12 m beam x=10..645, centre=328; deck/keel y=20/431.
                image_x = min(645, max(10, 328 + z * (635 / 12)))
                image_y = min(431, max(45, 431 - (411 / 8) * y))
                uv.data[loop_index].uv = (image_x / 656, 1 - image_y / 437)
            elif material_index == 2:
                # Stern grid: 12 m beam x=70..680, centre=384; deck/keel y=41/450.
                image_x = min(680, max(70, 384 + z * (610 / 12)))
                image_y = min(450, max(70, 450 - (409 / 8) * y))
                uv.data[loop_index].uv = (image_x / 768, 1 - image_y / 464)
            else:
                uv.data[loop_index].uv = (.5 + z / width, min(1.0, y / (deck - keel + 2.0)))
    mesh.update()
    hull = bpy.data.objects.new(name + ':hull', mesh)
    scene.collection.objects.link(hull)
    hull['part'] = name + ':hull'
    hull.location = gv((0, keel, 0))
    parent(hull, root)

    deck_plate(root, name + ':weather-deck', length, width, deck)
    if label:
        for side in (-1, 1):
            t = .30
            _, factor = min(HULL_STATIONS, key=lambda station: abs(station[0] - t))
            label_obj = bpy.data.curves.new(name + ' bow name', 'FONT')
            label_obj.body = label
            label_obj.align_x = 'CENTER'
            label_obj.size = 1.45; label_obj.resolution_u = 3
            label_obj.bevel_resolution = 1; label_obj.extrude = .006
            obj = bpy.data.objects.new(name + ' bow name ' + str(side), label_obj)
            scene.collection.objects.link(obj)
            obj.location = gv((length * t, deck - 1.65,
                               side * (width * factor * .5 + .025)))
            # One rule for both sides: the lettering's face points outward
            # (normal n), its up is the world up, and it reads along up x n,
            # which is left to right for someone standing outside the hull.
            # No mirrored scale and no reversed string.
            normal = gv((0, 0, side)).normalized()
            up = Vector((0, 0, 1))
            reading = up.cross(normal)
            obj.rotation_mode = 'QUATERNION'
            obj.rotation_quaternion = Matrix((reading, up, normal)).transposed().to_quaternion()
            label_obj.materials.append(name_paint)
            obj = wrap_name_on_hull(obj, length, width, side)
            obj['part'] = name
            parent(obj, root)
    return hull

def hull_half_breadth(x, length, width):
    """Half-breadth at the deck edge, interpolated between hull stations."""
    t = x / length
    stations = sorted(HULL_STATIONS)
    if t <= stations[0][0]:
        return width * stations[0][1] * .5
    for (t0, f0), (t1, f1) in zip(stations, stations[1:]):
        if t <= t1:
            return width * (f0 + (f1 - f0) * (t - t0) / (t1 - t0)) * .5
    return width * stations[-1][1] * .5

def wrap_name_on_hull(obj, length, width, side, gap=.05):
    """Turn the flat lettering into a mesh lying on the curved side plating.

    The hull widens aft of the name, so a flat sheet of letters sinks into
    the plating at one end. Each vertex is moved out to the hull's side at
    its own position along the ship, keeping the letters' thickness."""
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
    if not mesh.materials:
        mesh.materials.append(name_paint)
    loc = obj.location.copy()
    rot = obj.rotation_quaternion.to_matrix()
    inv = rot.transposed()
    for v in mesh.vertices:
        p = loc + rot @ v.co
        # Root-local Blender (bx, by, bz) is game (bx, bz, -by): side is -by.
        x = p.x
        p.y = -side * (hull_half_breadth(x, length, width) + gap + v.co.z)
        v.co = inv @ (p - loc)
    mesh.update()
    name = obj.name
    curve = obj.data
    bpy.data.objects.remove(obj)
    bpy.data.curves.remove(curve)
    wrapped = bpy.data.objects.new(name, mesh)
    mesh.name = name
    scene.collection.objects.link(wrapped)
    wrapped.location = loc
    wrapped.rotation_mode = 'QUATERNION'
    wrapped.rotation_quaternion = rot.to_quaternion()
    return wrapped

def correct_end_face_photos(obj, table):
    """Force the dead-on bow and stern references onto their matching faces."""
    forward = table.get('forward', -1)
    flip = -1 if table.get('front_x_flip') else 1
    front_sign = -forward * -1 * flip
    end_scale = {
        key: table[key].get('scale', table[key].get('top_height', table['height']) /
                            abs(table[key]['ground'] - table[key]['top']))
        for key in ('front', 'rear')
    }
    front_photo, rear_photo = table['_photos']['front'], table['_photos']['rear']
    uv_layer = obj.data.uv_layers.active
    for polygon in obj.data.polygons:
        if polygon.normal.y > .70:
            # The GLB exporter deduplicates the two side-view slots, so front
            # and rear are slots 1 and 2 after the side slot at index 0.
            material_index, view, photo = 1, table['front'], front_photo
            scale = end_scale['front']
            for loop_index in polygon.loop_indices:
                point = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
                px = view['centre'] + front_sign * point.x / scale
                py = view['ground'] - point.z / scale
                uv_layer.data[loop_index].uv = photo.uv(px, py)
        elif polygon.normal.y < -.70:
            material_index, view, photo = 2, table['rear'], rear_photo
            scale = end_scale['rear']
            for loop_index in polygon.loop_indices:
                point = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
                px = view['centre'] - front_sign * point.x / scale
                py = view['ground'] - point.z / scale
                uv_layer.data[loop_index].uv = photo.uv(px, py)
        else:
            continue
        polygon.material_index = material_index

stone_photo = photo_material('Lighthouse / projected local stonework', photos['lighthouse-stone-photo'])
stone_shader = stone_photo.node_tree.nodes.get('Principled BSDF')
stone_shader.inputs['Roughness'].default_value = .94
stone_image = stone_photo.node_tree.nodes.get('Image Texture').image
# Ashlar laid block by block: each block takes its colour from a block-sized
# patch of the reference tower's plain masonry, so the wall has the photo's
# range of stone and salt without repeating the photo. The grain is noise.
# The tile is 4 m wide and 2 m (five 0.4 m courses) high and wraps in both
# directions, so its seams always fall on mortar lines.
stone_w, stone_h = stone_image.size
source_pixels = np.asarray(stone_image.pixels[:], dtype=np.float32).reshape((stone_h, stone_w, 4))[::-1]
# Plain masonry left of the door and below the lowest window, read top-down;
# the photo shows about 38 px per metre.
masonry = source_pixels[int(stone_h*.70):int(stone_h*.87), int(stone_w*.14):int(stone_w*.47), :3]
PHOTO_PX_PER_M = 38.0
TILE_PX_W, TILE_PX_H, COURSES = 512, 256, 5
stone_rng = np.random.default_rng(1957)
def periodic_noise(h, w, cells):
    """Smooth noise that wraps at the tile's edges, from a coarse random grid."""
    grid = stone_rng.standard_normal((cells[0], cells[1])).astype(np.float32)
    gy = np.arange(h)*cells[0]/h; gx = np.arange(w)*cells[1]/w
    y0 = np.floor(gy).astype(int); x0 = np.floor(gx).astype(int)
    ty = (gy-y0)[:, None]; tx = (gx-x0)[None, :]
    ty = ty*ty*(3-2*ty); tx = tx*tx*(3-2*tx)
    y1 = (y0+1) % cells[0]; x1 = (x0+1) % cells[1]
    a = grid[y0][:, x0]; b = grid[y0][:, x1]; c = grid[y1][:, x0]; d = grid[y1][:, x1]
    return (a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty
grain = sum(periodic_noise(TILE_PX_H, TILE_PX_W, (cy, cx))*wt
            for cy, cx, wt in ((10, 20, .45), (32, 64, .35), (85, 170, .25), (256, 512, .18)))
tile_pixels = np.zeros((TILE_PX_H, TILE_PX_W, 4), dtype=np.float32); tile_pixels[:, :, 3] = 1
mortar = np.array((.50, .46, .39), dtype=np.float32)
course_edges = [round(k*TILE_PX_H/COURSES) for k in range(COURSES+1)]
px_per_m = TILE_PX_W/4.0
for course in range(COURSES):
    y0, y1 = course_edges[course], course_edges[course+1]
    start = int(stone_rng.integers(0, TILE_PX_W))
    lengths = []
    while sum(lengths) < TILE_PX_W - .5*px_per_m:
        lengths.append(int(px_per_m*stone_rng.uniform(.4, 1.5)))
    lengths[-1] += TILE_PX_W - sum(lengths)
    x = start
    for length in lengths:
        mh, mw = masonry.shape[:2]
        ph = int(.4*PHOTO_PX_PER_M); pw = max(4, int(length/px_per_m*PHOTO_PX_PER_M))
        sy = int(stone_rng.integers(0, mh-ph)); sx = int(stone_rng.integers(0, mw-pw))
        # One block in eight is deliberately out of the local stone range.
        variation = stone_rng.uniform(.68, .82) if stone_rng.random() < .125 else stone_rng.uniform(.9, 1.08)
        base = masonry[sy:sy+ph, sx:sx+pw].reshape(-1, 3).mean(axis=0) * variation
        # Each block weathers a little darker towards its foot and its worn arrises.
        yy = np.linspace(-1, 1, y1-y0)[:, None]; xx = np.linspace(-1, 1, length)[None, :]
        edge = np.clip(1-np.maximum(np.abs(yy)**6, np.abs(xx)**10), 0, 1)
        tone = (.84+.16*edge)*(1.0-.06*np.clip(yy, 0, 1))
        cols = (np.arange(x, x+length)) % TILE_PX_W
        block_grain = grain[y0:y1][:, cols]
        tile_pixels[y0:y1, cols, :3] = base*(tone*(1+.16*block_grain))[:, :, None]
        tile_pixels[y0:y1, cols[:3], :3] = mortar
        x += length
    tile_pixels[y0:y0+3, :, :3] = mortar
# Salt runs down from the joints in faint, broken streaks that wrap with the tile.
cols = np.arange(TILE_PX_W)
streak = np.zeros(TILE_PX_W, dtype=np.float32)
for period, weight in ((1, .5), (3, .3), (7, .25), (13, .2), (29, .15)):
    streak += weight*np.sin(2*np.pi*period*cols/TILE_PX_W + stone_rng.uniform(0, 2*np.pi))
streak = np.clip((streak-.35)*.55, 0, .28)
fade = np.clip(.5+periodic_noise(TILE_PX_H, TILE_PX_W, (6, 40))*.9, 0, 1)
salt = np.array((.80, .78, .72), dtype=np.float32)
tile_pixels[:, :, :3] = tile_pixels[:, :, :3]*(1-(streak[None, :]*fade)[:, :, None]) + salt*(streak[None, :]*fade)[:, :, None]
tile_pixels[:, :, :3] = np.clip(tile_pixels[:, :, :3], 0, 1)
tile_w, tile_h = TILE_PX_W, TILE_PX_H
stone_tile = bpy.data.images.new('Lighthouse laid ashlar tile', width=tile_w, height=tile_h, alpha=False)
stone_tile.pixels[:] = tile_pixels[::-1].reshape(-1)
stone_tile.pack()
stone_photo.node_tree.nodes.get('Image Texture').image = stone_tile
STONE_TILE_M = (4.0, 2.0)
def stone_course_uv(angle, y, mid_y, band_radius):
    """U wraps a whole number of tiles round each 2 m band; each band is offset."""
    band = int(math.floor((mid_y + 2) / STONE_TILE_M[1]))
    tiles = max(1, round(2*math.pi*band_radius/STONE_TILE_M[0]))
    offset = (band*0.618034) % 1.0
    return (angle/(2*math.pi)*tiles + offset, (y + 2)/STONE_TILE_M[1])
pilot_photo = photo_material('Pilot boat / projected workboat photograph', photos['pilot-boat-photo'])
rust = materials['rusted-steel']
steel = materials['galvanised-tin']
iron = materials['iron-dark']
wood = materials['weathered-plank']
paint = materials['faded-hand-paint']
glass = materials['dirty-glass']
sand = materials['sand']
def matte_material(name,color,roughness=.88):
    mat=bpy.data.materials.new(name); mat.diffuse_color=(*color,1); mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1); bsdf.inputs['Metallic'].default_value=0; bsdf.inputs['Roughness'].default_value=roughness
    return mat
name_paint=matte_material('Ship name / faded chalk paint',(.70,.66,.55))
boat_paint=matte_material('Pilot boat / maintained warm cream enamel',(.68,.66,.59))
lamp = bpy.data.materials.new('Lighthouse / lit Fresnel lantern')
lamp.use_nodes = True
lamp_nodes=lamp.node_tree.nodes; lamp_nodes.clear()
lamp_out=lamp_nodes.new('ShaderNodeOutputMaterial'); lamp_emission=lamp_nodes.new('ShaderNodeEmission')
lamp_emission.inputs['Color'].default_value=(1.0,.48,.12,1); lamp_emission.inputs['Strength'].default_value=5
lamp.node_tree.links.new(lamp_emission.outputs[0],lamp_out.inputs['Surface'])

def gv(point):
    return town.game_vector(point)

def attach(obj, name, part):
    obj.name = name
    obj['part'] = part
    return obj

def root_obj(name, location, part):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = gv(location)
    obj['part'] = part
    return obj

def parent(obj, root_obj_):
    obj.parent = root_obj_
    obj.matrix_parent_inverse = Matrix.Identity(4)
    return obj

def cube(name, center, dims, material, part, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=gv(center))
    o=bpy.context.object; o.dimensions=(dims[0],dims[2],dims[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
    uv.name='UVMap'
    for polygon in o.data.polygons:
        normal=polygon.normal
        for loop_index in polygon.loop_indices:
            vertex=o.data.vertices[o.data.loops[loop_index].vertex_index].co
            if abs(normal.x)>=abs(normal.y) and abs(normal.x)>=abs(normal.z):
                u,v=vertex.y,vertex.z
            elif abs(normal.y)>=abs(normal.z):
                u,v=vertex.x,vertex.z
            else:
                u,v=vertex.x,vertex.y
            uv.data[loop_index].uv=(u/2,v/2)
    if bevel:
        mod=o.modifiers.new('rolled plate edges','BEVEL'); mod.width=bevel; mod.segments=2
        o.modifiers.new('weighted worn normals','WEIGHTED_NORMAL')
    return attach(o,name,part)

def photo_box(name, center, dims, side, bow, stern, top, part, crops,
              rusted_edges=False):
    """A crisp photo-projected box; no carving, masks or rounded voxel walls."""
    obj = cube(name, center, dims, steel, part, 0)
    obj.data.materials.clear()
    mats = [side, bow, stern, top]
    if rusted_edges:
        mats.append(rust)
    for mat in mats:
        obj.data.materials.append(mat)
    uv = obj.data.uv_layers.active
    length, height, width = dims
    images=[next(n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE') for mat in mats[:4]]
    for poly in obj.data.polygons:
        n = poly.normal
        roof_deck = name.endswith(':upperworks-deck')
        if rusted_edges and roof_deck and abs(n.z) < .9:
            poly.material_index = 4
            continue
        if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z):
            # Each end wall keeps its own photo (windows, rails, ladders).
            mat_index = 1 if n.x > 0 else 2
        elif roof_deck and abs(n.z) >= abs(n.x) and abs(n.z) >= abs(n.y):
            mat_index = 0
        elif abs(n.y) >= abs(n.z):
            mat_index = 0
        else:
            mat_index = 3
        poly.material_index = mat_index
        px0,py0,px1,py1=crops[mat_index]
        image_w,image_h=images[mat_index].size
        for li in poly.loop_indices:
            co = obj.data.vertices[obj.data.loops[li].vertex_index].co
            if mat_index in (1, 2):
                # Trim 7% off each side and the top of the end photo, where
                # its crop meets white sky or background.
                across = .07 + .86 * (co.y / width + .5)
                up = .93 * (co.z / height + .5)
            elif mat_index == 0:
                across, up = (co.x / length + .5), (co.z / height + .5)
            elif mat_index in (1, 2):
                across, up = (co.y / width + .5), (co.z / height + .5)
            else:
                across, up = (co.y / width + .5), (1 - (co.x / length + .5))
            if roof_deck and abs(n.z) >= abs(n.x) and abs(n.z) >= abs(n.y):
                across = .5 + .2 * (co.x / length + .5)
                up = .55 + .1 * (co.y / width + .5)
            px=px0+across*(px1-px0)
            py=py1-up*(py1-py0)
            uv.data[li].uv=(px/image_w,1-py/image_h)
    return obj

def beam(name,a,b,width,material,part,depth=None):
    va,vb=gv(a),gv(b); d=vb-va
    bpy.ops.mesh.primitive_cube_add(size=1,location=(va+vb)*.5)
    o=bpy.context.object; o.dimensions=(width,depth or width,d.length)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(material)
    return attach(o,name,part)

def cylinder(name,center,radius,depth,material,part,vertices=24,axis='Y'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=gv(center))
    o=bpy.context.object
    if axis=='X': o.rotation_euler[1]=math.pi/2
    o.data.materials.append(material)
    return attach(o,name,part)

def rail(name,a,b,radius,material,part):
    va,vb=gv(a),gv(b); d=vb-va
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=d.length,location=(va+vb)*.5)
    o=bpy.context.object; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(material)
    return attach(o,name,part)

def torus_local(name, center, major, minor, material, part, axis='Y', major_segments=24, minor_segments=8):
    o=torus(name,center,major,minor,material,part,axis,major_segments,minor_segments)
    return o

def torus(name,center,major,minor,material,part,axis='Y',major_segments=24,minor_segments=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=major_segments,minor_segments=minor_segments,location=gv(center))
    o=bpy.context.object
    if axis=='X': o.rotation_euler[1]=math.pi/2
    o.data.materials.append(material)
    return attach(o,name,part)

def photo_hull(name, root, dimensions, material, side_label, hull_color=None):
    length,width,deck,keel=dimensions
    # Closed ship section: full submerged keel for the later floating scene.
    # A narrow counter and sharp, flared bow grow into a full-length bilge.
    # The dense stations keep the long photographed plate following the hull,
    # instead of reading as a flat strip laid over a simple block.
    stations=[(-.50,.22),(-.485,.42),(-.46,.62),(-.43,.78),(-.39,.89),(-.34,.95),
              (-.28,.98),(-.20,1.0),(-.10,1.0),(0,.995),(.12,.99),(.23,.97),
              (.32,.94),(.39,.90),(.44,.84),(.475,.62),(.49,.34),(.50,.06)]
    rings=[]
    for t,breadth in stations:
        x=t*length
        top=deck + max(0,t)**4*4.0 - max(0,-t)**4*1.0
        # Crown the deck, flare the sheer at the bow, then roll the bilge in
        # through four real chine bands to the keel.
        flare=1.0 + max(0,t)*.22
        stem=max(0,(t-.34)/.16)
        offsets=[0,0,.12,.36,.78,1.42,2.25,1.42,.78,.36,.12]
        xs=[x-offset*stem for offset in offsets]
        ring=[(xs[0],top,-width*breadth*.47*flare),(xs[1],top,width*breadth*.47*flare),
              (xs[2],deck-1.0,width*breadth*.45*flare),(xs[3],deck-2.4,width*breadth*.40),
              (xs[4],deck-4.2,width*breadth*.31),(xs[5],deck-6.0,width*breadth*.19),
              (xs[6],keel,0),(xs[7],deck-6.0,-width*breadth*.19),(xs[8],deck-4.2,-width*breadth*.31),
              (xs[9],deck-2.4,-width*breadth*.40),(xs[10],deck-1.0,-width*breadth*.45*flare)]
        rings.append(ring)
    section_size=11
    verts=[gv(v) for ring in rings for v in ring]
    faces=[]; material_ids=[]
    for i in range(len(rings)-1):
        for j in range(section_size):
            faces.append((i*section_size+j,i*section_size+(j+1)%section_size,
                          (i+1)*section_size+(j+1)%section_size,(i+1)*section_size+j))
            photo_side=j in range(1,11)
            material_ids.append(1 if photo_side else (0 if j==0 else 2))
    faces.extend([tuple(range(section_size-1,-1,-1)),
                  tuple((len(rings)-1)*section_size+j for j in range(section_size))]); material_ids.extend((2,2))
    mesh=bpy.data.meshes.new(name+' welded hull'); mesh.from_pydata(verts,[],faces)
    mesh.materials.append(steel); mesh.materials.append(material); mesh.materials.append(rust); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj['part']=root.name
    uv=mesh.uv_layers.new(name='Photo projection UV')
    for poly,mi in zip(mesh.polygons,material_ids):
        poly.material_index=mi
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index
            station=vi//section_size; section=vi%section_size
            co=rings[station][section]
            # One camera-like side projection shared by both long plates.
            u=.03 + ((co[0]/length)+.5)*.90
            # This source image is a hull-only crop with its deck edge at the top.
            # The white bridge, deck fittings and rigging are real geometry above it.
            v=.11 + min(1,max(0,(co[1]-keel)/(deck-keel)))*.69
            uv.data[li].uv=(u,v)
    parent(obj,root)
    # Fill the hull's sampled top outline, inset 0.3 m from the plating. A
    # rectangle bridges the bow and stern taper and reads as a shelf.
    deck_plate(root, name+'-weather-deck', length, width, deck)
    # The projection carries repair patches and seam wear; avoid floating
    # overlays that hide the hull's curve.
    # Text on the bow, in large, readable weathered paint.
    if side_label:
        label=bpy.data.curves.new(name+' painted bow name','FONT'); label.body=side_label; label.size=1.5; label.resolution_u=3; label.bevel_resolution=1; label.extrude=.008; label.bevel_depth=.004
        for side in (-1,1):
            obj=bpy.data.objects.new(name+' bow name '+str(side),label); scene.collection.objects.link(obj)
            obj.location=gv((length*.37,deck-2.05,side*(width*.448)))
            obj.rotation_euler=(math.pi/2 if side>0 else -math.pi/2,0,0)
            label.materials.clear(); label.materials.append(name_paint)
            obj['part']=root.name; parent(obj,root)
    if root.name == 'ship-patience':
        return
    # A single heavy working deck at the story datum, with a raised foredeck.
    # The source's upperworks are built as a chart room and mast, not repeated
    # floating slabs that make the hull read like a model ship.
    forecastle=cube(name+'-raised-forecastle',(length*.31,deck+.55,0),(length*.28,.34,width*.62),steel,root.name,.09)
    parent(forecastle,root)
    for side in (-1,1):
        if root.name == 'ship-marigold' and side < 0:
            continue
        rail(name+'-main-deck-rail',(-length*.40,deck+.92,side*width*.29),(length*.25,deck+.92,side*width*.29),.055,iron,root.name)
        for i in range(8):
            x=-length*.39+i*length*.08
            post=beam(f'{name}-rail-stanchion-{side}-{i}',(x,deck,side*width*.29),(x,deck+.92,side*width*.29),.07,steel,root.name)
            parent(post,root)
    for side in (-1,1):
        for low,high,x in ((-1.8,deck,-length*.13),):
            z=side*width*.29
            for dx in (-.35,.35): beam(f'{name}-ladder-rail-{side}-{low}-{dx}',(x+dx,low,z),(x+dx,high,z),.065,steel,root.name)
            for k in range(1,round((high-low)/.34)):
                y=low+k*.34; beam(f'{name}-ladder-rung-{side}-{low}-{k}',(x-.35,y,z),(x+.35,y,z),.055,iron,root.name)
    # This simple box remains for the other two ships. Patience now owns the
    # one photo-carved superstructure added below.
    if root.name != 'ship-patience':
        chart_x=-22
        cabin=cube(name+'-chart-room',(chart_x,deck+3.8,0),(8,4.1,5.4),steel,root.name,.20); parent(cabin,root)
        roof=cube(name+'-chart-room-roof',(chart_x,deck+6.0,0),(9,.28,6.1),rust,root.name,.10); parent(roof,root)
        for side in (-1,1):
            for i in range(5):
                win=cube(f'{name}-chart-window-{side}-{i}',(chart_x-3.1+i*1.55,deck+4.0,side*2.72),(1.05,1.0,.08),glass,root.name,.05); parent(win,root)
        door=cube(name+'-chart-door',(chart_x+4.05,deck+3.55,-1.1),(.10,2.4,1.0),iron,root.name,.05); parent(door,root)
    return

def deck_plate(root, name, length, width, deck):
    left=[]; right=[]
    for t,breadth in HULL_STATIONS[1:-1]:
        x=t*length
        half=width*breadth*.5-.38
        sheer=2.0*max(0.0,t)**2.1
        rake=3.5*max(0.0,1-(deck+sheer+4.0)/10.0)*min(1.0,max(0.0,(t-.30)/.20))
        left.append((x+rake,deck+sheer-.25,-half))
        right.append((x+rake,deck+sheer-.25,half))
    verts=[gv(point) for pair in zip(left,right) for point in pair]
    faces=[]
    for index in range(len(left)-1):
        faces.append((2*index,2*index+1,2*index+3,2*index+2))
    mesh=bpy.data.meshes.new(name+' hull-outline plate mesh')
    mesh.from_pydata(verts,[],faces); mesh.materials.append(rust); mesh.update()
    plate=bpy.data.objects.new(name,mesh); scene.collection.objects.link(plate)
    plate['part']=root.name+':deck'; parent(plate,root)
    return plate

ships=[
    ('ship-patience',(5,-470),'PATIENCE',HULL_LENGTH,HULL_WIDTH,4.0,-4.0,0.07),
    ('ship-good-hope',(-45,-415),'GOOD HOPE',72.0,12.0,4.0,-4.0,0.0),
    ('ship-marigold',(45,-440),'MARIGOLD',72.0,12.0,4.0,-4.0,0.0),
]
if args.stage == 'patience':
    ships=[ship for ship in ships if ship[0]=='ship-patience']
roots={}
shared_hull_mesh = None
for ident,loc,label,length,width,deck,keel,lean in ships:
    r=root_obj(ident,(loc[0],0,loc[1]),ident); roots[ident]=r
    photo_prefix = ident.replace('ship-', '')
    shared_hull_mesh = faired_hull(ident, r, length, width, deck, keel,
                                    photo_prefix, label)
    if ident != 'ship-patience':
        for obj in list(scene.objects):
            if obj.parent==r and any(key in obj.name for key in (
                'chart-room','chart-window','chart-door')):
                bpy.data.objects.remove(obj,do_unlink=True)
        def sister_cabin_table(ship):
            prefix='good-hope' if ship=='ship-good-hope' else 'marigold'
            if prefix=='good-hope':
                # Side and stern measurements are from the earlier grids;
                # the bow uses the new dead-on round-13 end photograph.
                # Side (640x427): body x=31..589, deck y=411, bridge roof y=96.
                # Bow (1448x1086): centre=700, deck=1050, cabin roof=232.
                # Stern: centre=320, deck=624, roof=105.
                # Plan (427x640): bow/stern y=52/621, centre x=213; beam x=112..313.
                length_px=(31,589); ground=411
                front=(700,1050,232); rear=(320,624,105)
                top=(52,621,213,9.0/(313-112))
                cabin_length=14.0; cabin_width=9.0; cabin_height=9.0
            else:
                # Grid measurements from .qa-dist/grid-marigold-*.png.
                # Side (640x213): body x=12..624, deck y=205, bridge roof y=43.
                # Bow (640x352): centre=320, deck=337, roof=83. Stern (640x320):
                # centre=320, deck=301, roof=65. Plan (581x640): bow/stern
                # y=51/610, centre x=290; beam x=160..420.
                length_px=(12,624); ground=205
                front=(320,337,83); rear=(320,301,65)
                top=(51,610,290,10.0/(420-160))
                cabin_length=15.0; cabin_width=10.0; cabin_height=6.0
            table = {
                'photos': {'side':f'{prefix}-upperworks-side.jpg',
                           'front':('good-hope-upperworks-bow-round13.png'
                                    if prefix=='good-hope' else f'{prefix}-upperworks-bow.jpg'),
                           'rear':f'{prefix}-upperworks-stern.jpg',
                           'top':f'{prefix}-upperworks-top.jpg'},
                'length':cabin_length,'width':cabin_width,'height':cabin_height,
                'forward':-1,'side_front_on_left':True,
                'side':{'start':length_px[0],'end':length_px[1],'ground':ground},
                'front':{'centre':front[0],'ground':front[1],'top':front[2],
                         'top_height':cabin_height},
                'rear':{'centre':rear[0],'ground':rear[1],'top':rear[2],
                        'top_height':cabin_height},
                'top':{'front':top[0],'rear':top[1],'centre':top[2],
                       'x_scale':top[3]},
                # The end photos show open bridge-wing bays beside the cabin.
                'cut': ({'front':[(0,175,95,315),(545,175,640,315)],
                         'rear':[(0,145,75,250),(565,145,640,250)]}
                        if prefix=='marigold' else {}),
                'grey':26,'tolerance':36,'bleed_tolerance':24,
                'voxel':.14,'target':2600,
                'mask_dir':str(raw/'masks'/prefix),
            }
            if prefix == 'good-hope':
                # Let the dead-on end photos own the rounded corners instead
                # of dragging the long side projection around the bow.
                table.update({'ends_split':0.0,'front_favour':10,'rear_favour':3})
            return table
        table=sister_cabin_table(ident)
        cabin_length, cabin_width, cabin_height = table['length'], table['width'], table['height']
        prefix='good-hope' if ident=='ship-good-hope' else 'marigold'
        photo_mats={view:photo_material(f'{ident} upperworks / {view}',tex/file)
                    for view,file in table['photos'].items()}
        photo_crops=({'side':(31,96,589,411),'front':(270,225,1180,1050),
                      'rear':(38,95,602,624),'top':(34,14,400,624)}
                     if prefix=='good-hope' else
                     {'side':(12,43,624,205),'front':(80,45,560,337),
                      'rear':(55,45,585,301),'top':(116,0,466,633)})
        block_photo_crops = dict(photo_crops)
        if prefix == 'marigold':
            # The side and bow photos include bright sky above the cabin wall.
            # Start each projection on the painted wall, at its own scale.
            block_photo_crops['side'] = (12, 74, 624, 205)
            block_photo_crops['front'] = (80, 116, 560, 337)
            block_photo_crops['rear'] = (55, 96, 585, 301)
        photo_crop_order=[photo_crops[v] for v in ('side','front','rear','top')]
        block_photo_crop_order=[block_photo_crops[v] for v in ('side','front','rear','top')]
        cabin_root=root_obj(ident+':upperworks',(0,0,0),ident+':upperworks')
        parent(cabin_root,r)
        cabin=photo_box(ident+':upperworks-block',(0,0,0),
                        (cabin_length,cabin_height,cabin_width),
                        photo_mats['side'],photo_mats['front'],photo_mats['rear'],
                        photo_mats['top'],ident+':upperworks',block_photo_crop_order)
        cabin.location=gv((22.0,deck+cabin_height*.5,0)); parent(cabin,cabin_root)
        roof=photo_box(ident+':upperworks-deck',(0,0,0),
                       (cabin_length+.8,.26,cabin_width+.6),photo_mats['side'],
                       photo_mats['front'],photo_mats['rear'],photo_mats['top'],
                       ident+':upperworks',photo_crop_order,
                       rusted_edges=(prefix=='marigold'))
        roof.location=gv((22.0,deck+cabin_height-.10,0)); parent(roof,cabin_root)
        # Straight bridge wings continue the deck to the measured cabin width.
        for side in (-1,1):
            wing=photo_box(f'{ident}:bridge-wing-{side}',(0,0,0),
                           (3.2,.22,2.0),photo_mats['side'],photo_mats['front'],
                           photo_mats['rear'],photo_mats['top'],ident+':upperworks',photo_crop_order)
            wing.location=gv((22.0,deck+cabin_height*.58,side*(cabin_width*.5+.55)))
            parent(wing,cabin_root)
        if args.stage != 'fleet' and ident=='ship-good-hope':
            funnel=cylinder('good-hope-rusted-funnel',(18.5,13.1,0),1.05,4.2,rust,ident,16)
            parent(funnel,r)
            cap=cylinder('good-hope-funnel-cap',(18.5,15.25,0),1.18,.20,iron,ident,16)
            parent(cap,r)
        if ident=='ship-good-hope':
            mast=cylinder('good-hope-short-mast',(22,14.6,-6.5),.09,3.2,steel,ident,8)
            parent(mast,r)
            for side in (-1,1):
                stay=beam(f'good-hope-mast-stay-{side}',(22,13.0,-6.5),(22,16.0,-6.5+side*1.6),.045,iron,ident)
                parent(stay,r)
        elif args.stage != 'fleet':
            if ident == 'ship-marigold':
                # Narrow rusted angle steel hides the white photo edge at the
                # forward cabin corners and roof perimeter without changing
                # either cabin end's own photograph.
                for side in (-1, 1):
                    corner = cube(f'marigold-cabin-forward-corner-{side}',
                                  (22.0 + cabin_length * .5 - .02, deck + cabin_height * .5,
                                   side * (cabin_width * .5 - .05)),
                                  (.14, cabin_height, .36), rust,
                                  ident + ':upperworks', .025)
                    parent(corner, cabin_root)
                roof_y = deck + cabin_height - .28
                for fore in (-1, 1):
                    header = cube(f'marigold-cabin-roof-header-{fore}',
                                  (22.0 + fore * (cabin_length * .5 - .05), roof_y, 0),
                                  (.40, .55, cabin_width), rust,
                                  ident + ':upperworks', .025)
                    parent(header, cabin_root)
                for side in (-1, 1):
                    edge = cube(f'marigold-cabin-roof-edge-{side}',
                                (22.0, roof_y, side * (cabin_width * .5 - .05)),
                                (cabin_length + .8, .55, .36), rust,
                                ident + ':upperworks', .025)
                    parent(edge, cabin_root)
                for fore in (-1, 1):
                    edge = cube(f'marigold-cabin-roof-end-{fore}',
                                (22.0 + fore * (cabin_length * .5 - .05), roof_y, 0),
                                (.36, .55, cabin_width + .6), rust,
                                ident + ':upperworks', .025)
                    parent(edge, cabin_root)
            funnel=cylinder('marigold-weathered-funnel',(18.5,10.9,0),.95,3.0,rust,ident,16)
            parent(funnel,r)
            cap=cylinder('marigold-funnel-cap',(18.5,12.45,0),1.05,.18,iron,ident,16)
            parent(cap,r)
    if ident=='ship-patience':
        # Dot's Diner pattern: one measured carve table, followed by a named
        # root and one fitted body. The bridge front points bowward (+X); its
        # aft edge is local x=-37, so the block centre is local x=-25.5.
        side_scale = UPPER_SCALE
        front_scale = UPPER_FRONT['top_height'] / (UPPER_FRONT['ground'] - UPPER_FRONT['top'])
        rear_scale = UPPER_REAR['top_height'] / (UPPER_REAR['ground'] - UPPER_REAR['top'])

        def side_boxes(rectangles):
            boxes = []
            for px0, py0, px1, py1 in rectangles:
                z0 = (UPPER_SIDE_START - px1) * side_scale - UPPER_LENGTH / 2
                z1 = (UPPER_SIDE_START - px0) * side_scale - UPPER_LENGTH / 2
                y0 = (UPPER_SIDE_GROUND - py1) * side_scale
                y1 = (UPPER_SIDE_GROUND - py0) * side_scale
                boxes.append((z0, z1, y0, y1))
            return boxes

        side_recesses = side_boxes((*UPPER_SIDE_WINDOWS, *UPPER_SIDE_PORTHOLES, *UPPER_SIDE_DOORS))
        front_recesses = []
        for px0, py0, px1, py1 in (*UPPER_FRONT_BRIDGE_WINDOWS, *UPPER_FRONT_WINDOWS,
                                   *UPPER_FRONT_PORTHOLES, *UPPER_FRONT_DOORS):
            front_recesses.append(((UPPER_FRONT['centre'] - px1) * front_scale,
                                   (UPPER_FRONT['centre'] - px0) * front_scale,
                                   (UPPER_FRONT['ground'] - py1) * front_scale,
                                   (UPPER_FRONT['ground'] - py0) * front_scale))
        rear_recesses = []
        for px0, py0, px1, py1 in (*UPPER_REAR_PORTHOLES, *UPPER_REAR_DOORS):
            rear_recesses.append(((px0 - UPPER_REAR['centre']) * rear_scale,
                                  (px1 - UPPER_REAR['centre']) * rear_scale,
                                  (UPPER_REAR['ground'] - py1) * rear_scale,
                                  (UPPER_REAR['ground'] - py0) * rear_scale))

        def keep_upperworks(x, y, z):
            # Window, porthole and door pockets stop 0.30 m inside each face.
            remove = np.zeros_like(y, dtype=bool)
            for z0, z1, y0, y1 in side_recesses:
                remove |= ((np.abs(x) >= UPPER_WING_WIDTH / 2 - .30) &
                           (z >= z0) & (z <= z1) & (y >= y0) & (y <= y1))
            for x0, x1, y0, y1 in front_recesses:
                remove |= ((z <= -UPPER_LENGTH / 2 + .30) & (x >= x0) & (x <= x1) &
                           (y >= y0) & (y <= y1))
            for x0, x1, y0, y1 in rear_recesses:
                remove |= ((z >= UPPER_LENGTH / 2 - .30) & (x >= x0) & (x <= x1) &
                           (y >= y0) & (y <= y1))
            return (y <= UPPER_HEIGHT) & ~remove

        # The front photo encloses pale background under both projecting wings.
        upper_table = {
            'photos': {'side': 'patience-upperworks-side.jpg',
                       'front': 'patience-upperworks-front.jpg',
                       'rear': 'patience-upperworks-rear.jpg',
                       'top': 'patience-upperworks-top.jpg'},
            'length': UPPER_LENGTH, 'width': UPPER_WING_WIDTH, 'height': UPPER_HEIGHT,
            'side_front_on_left': False,
            'side': {'start': UPPER_SIDE_START, 'end': UPPER_SIDE_END,
                     'ground': UPPER_SIDE_GROUND},
            'front': UPPER_FRONT, 'rear': UPPER_REAR, 'top': UPPER_TOP,
            'cut': {'front': [(108, 228, 157, 302), (611, 228, 661, 302)]},
            'keep': keep_upperworks,
            'grey': 26, 'tolerance': 34, 'bleed_tolerance': 24,
            'voxel': .12, 'target': 2600,
            'mask_dir': str(raw / 'masks'),
        }
        upperworks = carve_object('ship-patience:upperworks', tex, upper_table)
        # The projecting wings have no front-photo wrap on their sides or
        # undersides. Use the cabin side image on the long side faces and
        # painted steel below, so no foreground crop stretches into streaks.
        cabin_side_material = upper_table['_photos']['side'].material()
        side_photo_slot = len(upperworks.data.materials)
        upperworks.data.materials.append(cabin_side_material)
        steel_underwing_slot = len(upperworks.data.materials)
        upperworks.data.materials.append(steel)
        for polygon in upperworks.data.polygons:
            if abs(polygon.normal.x) > .85:
                polygon.material_index = side_photo_slot
            elif polygon.normal.z < -.85:
                polygon.material_index = steel_underwing_slot
        # The accommodation roof is exposed weather deck: one rust coat, while
        # the raised hatch and antenna forms stay as separate photo-carved geometry.
        roof_slot = len(upperworks.data.materials)
        upperworks.data.materials.append(rust)
        for polygon in upperworks.data.polygons:
            if polygon.normal.z > .9 and polygon.center.z >= UPPER_HEIGHT - .15:
                polygon.material_index = roof_slot
        # Darken the studio paint in material, then lay broken rust runoff over
        # the photo. The multiplier follows the yard's worn-steel treatment;
        # elongated noise and a restrained oxide tint follow the tanker streaks.
        for photo in upper_table['_photos'].values():
            carved_photo_material = photo.material()
            nodes, links = carved_photo_material.node_tree.nodes, carved_photo_material.node_tree.links
            bsdf = nodes.get('Principled BSDF')
            texture = next(node for node in nodes if node.type == 'TEX_IMAGE')
            output = nodes.get('Material Output')
            darken = nodes.new('ShaderNodeMixRGB')
            darken.name = 'Worn cabin paint multiply'
            darken.blend_type = 'MULTIPLY'
            darken.inputs['Fac'].default_value = 1.0
            darken.inputs[2].default_value = (.62, .60, .56, 1)
            links.new(texture.outputs['Color'], darken.inputs[1])
            texcoord = nodes.new('ShaderNodeTexCoord')
            stretched = nodes.new('ShaderNodeVectorMath')
            stretched.operation = 'MULTIPLY'
            stretched.inputs[1].default_value = (16, 2, 4)
            links.new(texcoord.outputs['Generated'], stretched.inputs[0])
            noise = nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 3.0
            noise.inputs['Detail'].default_value = 2.0
            links.new(stretched.outputs['Vector'], noise.inputs['Vector'])
            ramp = nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.elements[0].position = .60
            ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
            ramp.color_ramp.elements[1].position = .74
            ramp.color_ramp.elements[1].color = (.19, .12, .075, 1)
            links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
            rust_layer = nodes.new('ShaderNodeMixRGB')
            rust_layer.name = 'Tanker-style broken rust runoff'
            rust_layer.blend_type = 'ADD'
            rust_layer.inputs['Fac'].default_value = .42
            links.new(darken.outputs['Color'], rust_layer.inputs[1])
            links.new(ramp.outputs['Color'], rust_layer.inputs[2])
            links.new(rust_layer.outputs['Color'], bsdf.inputs['Base Color'])
        upper_bounds = tuple(float(v) for v in upperworks.dimensions)
        upper_root = bpy.data.objects.new('ship-patience:upperworks-root', None)
        scene.collection.objects.link(upper_root)
        upper_root['part'] = 'ship-patience:upperworks'
        upper_root.parent = r
        upper_root.location = gv((-37 + UPPER_LENGTH / 2, deck, 0))
        upper_root.rotation_euler[2] = math.pi / 2
        parent(upperworks, upper_root)
        print('Patience upperworks carved bounds (Blender XYZ):', json.dumps(upper_bounds))

        # The measured oval funnel stands where the old photographed box stood.
        funnel_x = -37 + ((125 + 60) - 40) * UPPER_SCALE
        roof_y = deck + UPPER_HEIGHT
        funnel_table = {
            'photos': {'side': 'patience-funnel-side.jpg',
                       'front': 'patience-funnel-front.jpg',
                       'rear': 'patience-funnel-front.jpg',
                       'top': 'patience-funnel-top.jpg'},
            'length': 3.5, 'width': 2.5, 'height': 6.0,
            'side_front_on_left': True,
            'side': {'start': 62, 'end': 430, 'ground': 780},
            'front': {'centre': 333, 'ground': 780, 'top': 12, 'top_height': 6.0},
            'rear': {'centre': 333, 'ground': 780, 'top': 12, 'top_height': 6.0},
            'top': {'front': 30, 'rear': 773, 'centre': 286, 'along': 'x',
                    'x_scale': 2.5 / (533 - 38)},
            'round': 2.8, 'grey': 28, 'tolerance': 36, 'bleed_tolerance': 24,
            'voxel': .16, 'target': 900,
            'mask_dir': str(raw / 'masks'),
        }
        patience_funnel = carve_object('ship-patience:funnel', tex, funnel_table)
        patience_funnel.data.transform(Matrix(((0,1,0),(-1,0,0),(0,0,1))).to_4x4())
        # The isolated side photo's silhouette is a little taller than the
        # specified six metres at the shared 3.5 m length scale.
        patience_funnel.scale.z = .83
        patience_funnel.location = gv((funnel_x, roof_y, 0))
        parent(patience_funnel, r)

        # Trace the bridge mast as a thin slab; explicit clear cells preserve its openings.
        mast_photo = DetailPhoto(mast_crop_path)
        mast_mask = ~mast_photo.sky([(3, 3), (81, 3), (3, 132), (81, 132)], tolerance=34, grey=34)
        for x0, y0, x1, y1 in ((35, 31, 56, 43), (37, 57, 63, 70),
                                (41, 83, 67, 97), (44, 108, 70, 122)):
            mast_mask[y0:y1, x0:x1] = False
        mast_loops = trace(mast_mask, (0, 0, mast_photo.w, mast_photo.h), tolerance=1.5, min_area=12)
        mast_mesh = DetailMesh()
        mast_x0, mast_y0 = 405, 8
        def mast_point(px, py, depth):
            return (-37 + (mast_x0 + px - 40) * UPPER_SCALE,
                    deck + (UPPER_SIDE_GROUND - (mast_y0 + py)) * UPPER_SCALE, depth)
        slab(mast_mesh, 'mast-photo', mast_photo, mast_loops, mast_point,
             -.45, .45, wall_scale=UPPER_SCALE)
        mast_obj = mast_mesh.finish('ship-patience:bridge-mast-lattice',
                                    {'mast-photo': mast_photo.material()})
        mast_obj['part'] = 'ship-patience:bridge-mast'
        parent(mast_obj, r)
        # Long, thin working rails follow both sheer lines and close around the bow.
        for side in (-1,1):
            z=side*width*.39
            rail(f'patience-main-railing-top-{side}',(-28,6.1,z),(28,6.1,z),.045,rust,ident)
            rail(f'patience-main-railing-mid-{side}',(-28,5.63,z),(28,5.63,z),.032,rust,ident)
            for i in range(29):
                x=-28+i*2.0
                post=beam(f'patience-rail-stanchion-{side}-{i}',(x,5.05,z),(x,6.1,z),.045,rust,ident); parent(post,r)
            for i in range(8):
                x=30+i*.58; z2=side*(width*.34-i*.34)
                if z2*side<.25: break
                post=beam(f'patience-bow-rail-stanchion-{side}-{i}',(x,5.0,z2),(x,6.1,z2),.065,steel,ident); parent(post,r)
                rail(f'patience-bow-rail-top-{side}-{i}',(x,6.1,z2),(x+.75,6.1,z2-side*.38),.055,steel,ident)
        rail('patience-stern-rail-top',(-28,6.1,-width*.39),(-28,6.1,width*.39),.045,rust,ident)
        for i in range(5):
            z=-width*.39+i*width*.195
            post=beam(f'patience-stern-rail-post-{i}',(-28,5.05,z),(-28,6.1,z),.045,rust,ident); parent(post,r)
        # Raised forecastle, with short stairs and a hatch forward of the windlass.
        forecastle=cube('patience-raised-forecastle',(26,5.54,0),(15,.42,9.2),rust,ident,.11); parent(forecastle,r)
        for side in (-1,1):
            for step in range(9):
                stair=cube(f'patience-forecastle-step-{side}-{step}',(16.0+step*.43,5.12+step*.05,side*3.5),(.58,.13,2.2),rust,ident,.025); parent(stair,r)
        for i,x in enumerate((-3,7,17)):
            z=(-2.5,2.5,-2.5)[i]
            hatch=cube(f'patience-hatch-cover-{i}',(x,5.30,z),(6.4,.38,7.0),rust,ident,.12); parent(hatch,r)
            for side in (-1,1):
                coam=beam(f'patience-hatch-coaming-{i}-{side}',(x-3.25,5.28,z+side*3.7),(x+3.25,5.28,z+side*3.7),.18,rust,ident,.20); parent(coam,r)
                coam=beam(f'patience-hatch-coaming-end-{i}-{side}',(x+side*3.25,5.28,z-3.7),(x+side*3.25,5.28,z+3.7),.18,rust,ident,.20); parent(coam,r)
            for j in range(5):
                seam=beam(f'patience-hatch-seam-{i}-{j}',(x-2.7+j*1.35,5.50,z-3.2),(x-2.7+j*1.35,5.50,z+3.2),.035,rust,ident); parent(seam,r)
        # Winches, vents, and bollards are connected to the deck with visible feet.
        for i,(x,z) in enumerate(((-6,-4.0),(12,4.0),(30,0))):
            base=cube(f'patience-winch-bed-{i}',(x,5.29,z),(3.0,.42,1.8),rust,ident,.12); parent(base,r)
            drum=cylinder(f'patience-winch-drum-{i}',(x,6.05,z),.52,1.8,iron,ident,20,'X'); parent(drum,r)
            for side in (-1,1):
                cheek=cylinder(f'patience-winch-cheek-{i}-{side}',(x,6.05,z+side*.94),.82,.20,steel,ident,24,'X'); parent(cheek,r)
                foot=beam(f'patience-winch-foot-{i}-{side}',(x-.95,5.55,z+side*.65),(x+.95,5.55,z+side*.65),.18,rust,ident,.22); parent(foot,r)
        for i,(x,z) in enumerate(((-27,-4.2),(-17,4.2),(2,4.2),(21,-4.2))):
            riser=cylinder(f'patience-vent-riser-{i}',(x,5.85,z),.42,1.3,rust,ident,20); parent(riser,r)
            cowl=cylinder(f'patience-vent-cowl-{i}',(x,6.55,z),.67,.18,steel,ident,20); parent(cowl,r)
            hood=beam(f'patience-vent-hood-{i}',(x,6.78,z),(x+.62,6.78,z),.16,rust,ident,.55); parent(hood,r)
        for side in (-1,1):
            for x in (-31,-12,8,29):
                bollard=cylinder(f'patience-bollard-{side}-{x}',(x,5.48,side*4.5),.20,.60,rust,ident,20); parent(bollard,r)
                cap=cylinder(f'patience-bollard-cap-{side}-{x}',(x,5.80,side*4.5),.28,.08,iron,ident,20); parent(cap,r)
        # Two braced cargo derricks stand on their own feet, with cables and hooks.
        for i,(x,z,lean_side) in enumerate(((-4,-2.2,-1),(15,2.2,1))):
            base=cube(f'patience-derrick-pedestal-{i}',(x,5.36,z),(3.2,.45,2.6),rust,ident,.1); parent(base,r)
            apex=(x+lean_side*2.0,15.2,z)
            for side in (-1,1):
                leg=beam(f'patience-derrick-leg-{i}-{side}',(x,5.5,z+side*.95),apex,.19,steel,ident,.16); parent(leg,r)
                brace=beam(f'patience-derrick-crossbrace-{i}-{side}',(x-1.2,7.8,z+side*.8),(x+lean_side*1.2,11.2,z+side*.6),.12,rust,ident,.12); parent(brace,r)
            boom=beam(f'patience-derrick-boom-{i}',(x,7.0,z),(x+lean_side*4.8,14.0,z),.24,steel,ident,.23); parent(boom,r)
            cable=rail(f'patience-derrick-hoist-cable-{i}',(x+lean_side*4.8,14.0,z),(x+lean_side*4.8,8.8,z),.035,iron,ident); parent(cable,r)
            hook=torus_local(f'patience-derrick-hook-{i}',(x+lean_side*4.8,8.55,z),.22,.055,iron,ident,'X',16,6); parent(hook,r)
    # Each anchor leaves a real bow hawsepipe, hangs to the bed, then trails away.
    for side in (-1,1):
        cr=root_obj(f'{ident}:anchor-chain:{side}',(0,0,0),f'{ident}:anchor-chain'); parent(cr,r)
        if ident=='ship-patience':
            pipe=torus(f'{ident}-hawsepipe-{side}',(length*.43,3.2,side*5.7),.48,.14,steel,f'{ident}:anchor-chain','X',20,8); parent(pipe,cr)
            for i in range(16):
                x=length*.43+i*.62
                y=2.8-min(4.8,i*.60) if i<9 else -2.0
                z=side*(width*.45+min(1.8,i*.11))
                link=torus(f'{ident}-anchor-link-{side}-{i}',(x,y,z),.22,.055,iron,f'{ident}:anchor-chain','Z' if i%2 else 'X',8,4); parent(link,cr)
            anchor=cylinder(f'{ident}-anchor-{side}',(length*.43+11,-2.1,side*(width*.44+2.7)),.42,.18,rust,f'{ident}:anchor-chain',12)
            parent(anchor,cr)
        else:
            pipe=torus(f'{ident}-hawsepipe-{side}',(length*.43,3.1,side*5.6),.42,.11,steel,f'{ident}:anchor-chain','X',12,4); parent(pipe,cr)
            for i in range(14):
                x=length*.43+i*.58
                y=2.7-min(4.7,i*.58) if i<9 else -2.0
                z=side*(width*.45+min(1.6,i*.12))
                link=torus(f'{ident}-anchor-link-{side}-{i}',(x,y,z),.19,.045,iron,f'{ident}:anchor-chain','Z' if i%2 else 'X',6,3); parent(link,cr)
            anchor=cylinder(f'{ident}-anchor-{side}',(length*.43+9,-2.1,side*(width*.44+2.4)),.34,.16,rust,f'{ident}:anchor-chain',10)
            parent(anchor,cr)
    if ident=='ship-patience':
        # A visible stern shaft, four-blade wheel and hanging rudder complete the hull.
        shaft_root=root_obj('ship-patience:propeller',(0,0,0),'ship-patience:propeller'); parent(shaft_root,r)
        shaft=cylinder('patience-stern-propeller-shaft',(-35,-4.15,0),.32,7.2,steel,'ship-patience:propeller',24,'X'); parent(shaft,shaft_root)
        hub=cylinder('patience-propeller-hub',(-39,-4.15,0),.67,.9,iron,'ship-patience:propeller',20,'X'); parent(hub,shaft_root)
        for blade in range(4):
            a=blade*math.pi/2+.2
            start=(-39.2,-4.15+math.sin(a)*.38,math.cos(a)*.38)
            end=(-39.2,-4.15+math.sin(a)*1.38,math.cos(a)*1.38)
            propblade=beam(f'patience-propeller-blade-{blade}',start,end,.72,steel,'ship-patience:propeller',.18); parent(propblade,shaft_root)
        rudder=cube('patience-stern-rudder',(-34.4,-3.45,0),(1.0,4.4,3.8),rust,'ship-patience:rudder',.28); parent(rudder,r)
        stock=cylinder('patience-rudder-stock',(-34.2,-3.4,0),.28,4.8,steel,'ship-patience:rudder',18); parent(stock,r)
    # Slightly different lean about each grounded centre line.
    if ident == 'ship-patience':
        r.rotation_euler[0]=math.radians(4)
        r.rotation_euler[2]=math.radians(90)
    if ident=='ship-good-hope':
        r.rotation_euler[0]=math.radians(4)
        # Blender Euler fields use radians; keep the half-metre slope in that unit.
        r.rotation_euler[1]=math.asin(.5/length)
        r.rotation_euler[2]=math.radians(270)
    if ident=='ship-marigold':
        r.rotation_euler[0]=math.radians(-6)
        r.rotation_euler[1]=-math.asin(1.0/length)
        r.rotation_euler[2]=math.radians(270)
        # The missing half of the rail exposes the old working deck.
        for i in range(5):
            x=-length*.29+i*length*.08
            rail_obj=beam(f'marigold-surviving-rail-{i}',(x,deck+.92,width*.29),(x+.05,deck+1.15,width*.29),.07,steel,ident)
            parent(rail_obj,r)
        # Exposed, removable 18 m propeller shaft at her stern.
        shaft_root=root_obj('ship-marigold:shaft',(0,0,0),'ship-marigold:shaft'); parent(shaft_root,r)
        shaft=cylinder('marigold-removable-18m-shaft',(-44,-1.55,0),.22,18,steel,'ship-marigold:shaft',16,'X'); parent(shaft,shaft_root)
        prop_root=root_obj('ship-marigold:propeller',(0,0,0),'ship-marigold:propeller'); parent(prop_root,r)
        hub=cylinder('marigold-propeller-hub',(-53,-1.55,0),.48,.9,iron,'ship-marigold:propeller',20,'X'); parent(hub,prop_root)
        for blade in range(4):
            a=blade*math.pi/2
            vertices=[]
            for radius,chord,sweep,twist in ((.34,.40,0,0),(1.12,.62,.10,.20),(1.75,.16,.28,.36)):
                cy=-1.55+math.sin(a+twist)*radius
                cz=math.cos(a+twist)*radius
                half_y=math.cos(a+twist)*chord*.5
                half_z=-math.sin(a+twist)*chord*.5
                vertices.extend(((-53+sweep,cy-half_y,cz-half_z),(-53+sweep,cy+half_y,cz+half_z)))
            faces=[(0,1,3,2),(2,3,5,4),(0,2,4),(1,5,3)]
            blade_mesh=bpy.data.meshes.new(f'marigold-propeller-blade-{blade} mesh')
            blade_mesh.from_pydata([gv(p) for p in vertices],[],faces); blade_mesh.materials.append(steel); blade_mesh.update()
            blade_obj=bpy.data.objects.new(f'marigold-propeller-blade-{blade}',blade_mesh); scene.collection.objects.link(blade_obj)
            blade_obj['part']='ship-marigold:propeller'; parent(blade_obj,prop_root)

# Patience's mast, kingposts, platform and bell. With the ship root at +6 m,
# the main deck is y=11 and the platform is y=25.
pat=roots['ship-patience']; mastx=-15; mastz=6; platform_y=19
# The hand-built deck hardware remains at its former deck-relative heights.
# Move just those direct Patience parts down with the corrected deck line.
for obj in scene.objects:
    if (obj.parent == pat and obj.get('part') == 'ship-patience'
            and not obj.name.startswith(('Patience bow name', 'ship-patience:weather-deck'))):
        obj.location += gv((0,-1,0))
mast_root=root_obj('ship-patience:mast',(0,0,0),'ship-patience:mast'); parent(mast_root,pat)
mast_root.location = gv((0,-1,0))
bell_root=root_obj('ship-patience:bell',(0,0,0),'ship-patience:bell'); parent(bell_root,mast_root)
mast=cylinder('patience-mast-main-spar',(mastx,12.3,mastz),.38,14.6,steel,'ship-patience:mast',24); parent(mast,mast_root)
for dx in (-2.4,2.4):
    kingpost=beam(f'patience-mast-kingpost-{dx}',(mastx+dx,11.3,mastz),(mastx+dx,16.8,mastz),.18,steel,'ship-patience:mast',.16); parent(kingpost,mast_root)
for y in (11.5,16.6):
    cross=beam(f'patience-mast-kingpost-crossbar-{y}',(mastx-2.4,y,mastz),(mastx+2.4,y,mastz),.14,rust,'ship-patience:mast',.14); parent(cross,mast_root)
for side in (-1,1):
    start=(mastx+side*2.4,15.2,mastz)
    end=(mastx+side*6.6,12.9,mastz)
    boom=beam(f'patience-mast-derrick-boom-{side}',start,end,.20,steel,'ship-patience:mast',.18); parent(boom,mast_root)
    stay=rail(f'patience-mast-derrick-stay-{side}',(mastx+side*2.4,16.8,mastz),end,.045,iron,'ship-patience:mast'); parent(stay,mast_root)
platform=cube('ship-patience:mast-platform',(mastx,platform_y,mastz),(2.0,.26,2.0),steel,'ship-patience:mast',.08); parent(platform,mast_root)
for side in (-1,1):
    rail_obj=beam(f'patience-mast-platform-rail-{side}',(mastx,platform_y+.9,mastz+side*1.0),(mastx,platform_y+.9,mastz-side*1.0),.06,iron,'ship-patience:mast'); parent(rail_obj,mast_root)
    rail_obj=beam(f'patience-mast-platform-end-{side}',(mastx-1.0,platform_y+.9,mastz+side*1.0),(mastx+1.0,platform_y+.9,mastz+side*1.0),.06,iron,'ship-patience:mast'); parent(rail_obj,mast_root)
for level in range(1,26):
    y=11+level*.31
    rung=beam(f'patience-mast-ladder-rung-{level}',(mastx-.26,y,mastz),(mastx+.26,y,mastz),.045,iron,'ship-patience:mast'); parent(rung,mast_root)
for dx in (-.26,.26):
    side=beam(f'patience-mast-ladder-side-{dx}',(mastx+dx,11.1,mastz),(mastx+dx,18.8,mastz),.055,steel,'ship-patience:mast'); parent(side,mast_root)
bell=cylinder('patience-bell-metal',(mastx,18.45,mastz),.38,.65,steel,'ship-patience:bell',24)
clapper=beam('patience-bell-clapper',(mastx,18.1,mastz),(mastx,17.65,mastz),.08,iron,'ship-patience:bell')
for o in (bell,clapper): parent(o,bell_root)

if args.stage == 'family':
    # Lighthouse profile measured from lighthouse-stone-photo.jpg on a 50 px grid.
    # The 1024 px tower height reads as about 27 m: radius is sampled at 15 heights.
    light_root=root_obj('lighthouse',(170,0,-395),'lighthouse')
    N=20
    LIGHT_PROFILE = ((-2.0, 5.25), (-1.0, 5.20), (0.0, 5.05), (2.0, 4.78),
                     (4.0, 4.51), (6.0, 4.25), (8.0, 4.03), (10.0, 3.82),
                     (12.0, 3.61), (14.0, 3.42), (16.0, 3.26), (18.0, 3.12),
                     (20.0, 3.00), (22.0, 2.90), (24.0, 2.82), (25.0, 2.78))
    profile_y = sorted(set([y for y, _ in LIGHT_PROFILE] + [-.1, .6, 8.5, 10.0, 16.5, 18.0, 23.3, 24.8]))
    def light_radius(y):
        for (ya, ra), (yb, rb) in zip(LIGHT_PROFILE, LIGHT_PROFILE[1:]):
            if ya <= y <= yb:
                t = (y - ya) / (yb - ya)
                return ra * (1-t) + rb * t
        return LIGHT_PROFILE[0][1] if y < -2 else LIGHT_PROFILE[-1][1]
    verts=[]; faces=[]; face_uv=[]; face_material=[]
    openings = ((-2.0, .6, 1.40), (8.5, 10.0, .88), (16.5, 18.0, .88), (23.3, 24.8, .82))
    # The tower is turned half a face so one face is centred on -Z. Each door
    # and window leaves that face out of both walls, so every opening is a
    # real hole exactly one face wide.
    def in_light_opening(y0, y1, angle):
        front_delta = abs((angle + math.pi/2 + math.pi) % (2*math.pi) - math.pi)
        for low, high, width in openings:
            if y0 >= low - 1e-5 and y1 <= high + 1e-5 and front_delta < math.pi/N*.5:
                return True
        return False
    def opening_width(y):
        return 2*light_radius(y)*math.sin(math.pi/N)
    for y in profile_y:
        radius=light_radius(y)
        for i in range(N):
            a=(i+.5)*2*math.pi/N
            verts.append(gv((math.cos(a)*radius,y,math.sin(a)*radius)))
    for row,(y0,y1) in enumerate(zip(profile_y,profile_y[1:])):
        for i in range(N):
            a0=(i+.5)*2*math.pi/N; a1=(i+1.5)*2*math.pi/N
            if in_light_opening(y0,y1,(a0+a1)/2): continue
            faces.append((row*N+i,(row+1)*N+i,(row+1)*N+(i+1)%N,row*N+(i+1)%N))
            mid=(y0+y1)/2; band_r=light_radius(math.floor((mid+2)/2)*2-1)
            face_uv.append((stone_course_uv(a0,y0,mid,band_r),stone_course_uv(a0,y1,mid,band_r),
                            stone_course_uv(a1,y1,mid,band_r),stone_course_uv(a1,y0,mid,band_r)))
            face_material.append(0)
    mesh=bpy.data.meshes.new('lighthouse measured profile masonry'); mesh.from_pydata(verts,[],faces); mesh.materials.append(stone_photo); mesh.update()
    tower=bpy.data.objects.new('lighthouse measured profile',mesh); scene.collection.objects.link(tower); tower['part']='lighthouse'
    uv=mesh.uv_layers.new(name='Cylindrical stone photo projection')
    for poly, coords, mat_index in zip(mesh.polygons,face_uv,face_material):
        poly.material_index=mat_index
        for li,coord in zip(poly.loop_indices,coords): uv.data[li].uv=coord
        poly.use_smooth=True
    parent(tower,light_root)
    # A separate, thin salt veil follows a coarse copy of the tower profile.
    # 16 sides x 11 rows stays below 400 triangles even before opening skips.
    salt_rows = sorted(set([-2.0, -1.0, -.2, .7, 2.0, 5.0, 8.0, 10.0, 13.0, 16.5, 18.0, 21.0, 23.3, 25.0]))
    salt_image = bpy.data.images.new('Lighthouse salt alpha runs', width=256, height=256, alpha=False)
    salt_pixels = np.zeros((256, 256, 4), dtype=np.float32)
    salt_pixels[:, :, :3] = .0
    salt_pixels[:, :, 3] = 1
    salt_rng = np.random.default_rng(887)
    xx = np.arange(256)[None, :]
    yy = np.arange(256)[:, None]
    # Tide band occupies the first metre with a broken, ragged upper edge.
    tide_edge = 9 + (salt_rng.random((1, 256)) * 4)
    tide = (yy < tide_edge).astype(np.float32) * .82
    # Fine hanging threads, strongest under sills/gallery courses, fade by 3-6 m.
    threads = np.zeros((256, 256), dtype=np.float32)
    for k in range(50):
        col = int(salt_rng.integers(0, 256)); width = 1
        top = int(salt_rng.choice([12, 40, 85, 168, 183, 235]))
        length = int(salt_rng.integers(28, 58))
        for d in range(length):
            c = (col + int(math.sin(d*.13+k)*1.2)) % 256
            threads[min(255, top+d), max(0,c-width):min(256,c+width+1)] = max(threads[min(255,top+d),max(0,c-width):min(256,c+width+1)].max(initial=0), .34*(1-d/length)**.7)
    alpha = np.maximum(tide, threads)
    alpha *= (.84 + .16*salt_rng.random((256,256)))
    salt_pixels[:, :, :3] = alpha[:, :, None]
    salt_image.pixels[:] = salt_pixels[::-1].reshape(-1); salt_image.pack()
    salt_mat = bpy.data.materials.new('Lighthouse / pale salt veil'); salt_mat.use_nodes=True
    salt_nodes=salt_mat.node_tree.nodes; salt_links=salt_mat.node_tree.links
    salt_shader=salt_nodes.get('Principled BSDF')
    salt_shader.inputs['Base Color'].default_value=(.88,.86,.78,1)
    salt_shader.inputs['Roughness'].default_value=.98
    salt_shader.inputs['Alpha'].default_value=.85
    salt_tex=salt_nodes.new('ShaderNodeTexImage'); salt_tex.image=salt_image
    salt_links.new(salt_tex.outputs['Color'], salt_shader.inputs['Alpha'])
    salt_mat.surface_render_method='DITHERED'
    salt_verts=[]; salt_faces=[]; salt_uv=[]
    SN=16
    for y in salt_rows:
        radius=light_radius(y)+.018
        for i in range(SN):
            a=(i+.5)*2*math.pi/SN
            salt_verts.append(gv((math.cos(a)*radius,y,math.sin(a)*radius)))
    for row,(y0,y1) in enumerate(zip(salt_rows,salt_rows[1:])):
        for i in range(SN):
            a0=(i+.5)*2*math.pi/SN; a1=(i+1.5)*2*math.pi/SN
            mid=(y0+y1)/2
            if in_light_opening(y0,y1,(a0+a1)/2): continue
            salt_faces.append((row*SN+i,(row+1)*SN+i,(row+1)*SN+(i+1)%SN,row*SN+(i+1)%SN))
            salt_uv.append(((i/SN,(y0+2)/27),(i/SN,(y1+2)/27),((i+1)/SN,(y1+2)/27),((i+1)/SN,(y0+2)/27)))
    salt_mesh=bpy.data.meshes.new('lighthouse separate salt veil mesh'); salt_mesh.from_pydata(salt_verts,[],salt_faces); salt_mesh.materials.append(salt_mat); salt_mesh.update()
    salt_obj=bpy.data.objects.new('lighthouse pale salt stains',salt_mesh); scene.collection.objects.link(salt_obj); salt_obj['part']='lighthouse'; salt_obj['triangles_budget']=400
    salt_uv_layer=salt_mesh.uv_layers.new(name='Salt opacity runs')
    for poly,coords in zip(salt_mesh.polygons,salt_uv):
        for li,coord in zip(poly.loop_indices,coords): salt_uv_layer.data[li].uv=coord
    parent(salt_obj,light_root)
    # Whitewashed inner face keeps every stair and landing detail behind stone.
    inner_stone = matte_material('Lighthouse / whitewashed inner stone',(.70,.68,.59),.96)
    inner_nodes=inner_stone.node_tree.nodes; inner_links=inner_stone.node_tree.links
    inner_shader=inner_nodes.get('Principled BSDF')
    whitewash_pixels=tile_pixels.copy()
    whitewash_pixels[:,:,:3]=whitewash_pixels[:,:,:3]*.48+np.array((.84,.82,.75),dtype=np.float32)*.52
    whitewash_pixels=whitewash_pixels[::2,::2].copy()
    whitewash_tile=bpy.data.images.new('Lighthouse whitewashed stone tile',width=tile_w//2,height=tile_h//2,alpha=False)
    whitewash_tile.pixels[:]=whitewash_pixels[::-1].reshape(-1); whitewash_tile.pack()
    inner_nodes.clear()
    inner_out=inner_nodes.new('ShaderNodeOutputMaterial'); inner_shader=inner_nodes.new('ShaderNodeBsdfPrincipled')
    inner_texture=inner_nodes.new('ShaderNodeTexImage'); inner_texture.image=whitewash_tile
    inner_links.new(inner_texture.outputs['Color'],inner_shader.inputs['Base Color'])
    inner_links.new(inner_shader.outputs['BSDF'],inner_out.inputs['Surface'])
    inner_verts=[]; inner_faces=[]
    for y in profile_y:
        radius=light_radius(y)-.72
        for i in range(N):
            a=(i+.5)*2*math.pi/N
            inner_verts.append(gv((math.cos(a)*radius,y,math.sin(a)*radius)))
    inner_face_uv=[]
    for row in range(len(profile_y)-1):
        for i in range(N):
            y0,y1=profile_y[row],profile_y[row+1]
            a=(i+1)*2*math.pi/N
            if in_light_opening(y0,y1,a): continue
            j=(i+1)%N
            inner_faces.append((row*N+i,row*N+j,(row+1)*N+j,(row+1)*N+i))
            mid=(y0+y1)/2; band_r=light_radius(math.floor((mid+2)/2)*2-1)-.72
            a0,a1=(i+.5)*2*math.pi/N,(i+1.5)*2*math.pi/N
            inner_face_uv.append((stone_course_uv(a0,y0,mid,band_r),stone_course_uv(a1,y0,mid,band_r),
                                  stone_course_uv(a1,y1,mid,band_r),stone_course_uv(a0,y1,mid,band_r)))
    inner_mesh=bpy.data.meshes.new('lighthouse whitewashed inner face'); inner_mesh.from_pydata(inner_verts,[],inner_faces); inner_mesh.materials.append(inner_stone); inner_mesh.update()
    inner_uv=inner_mesh.uv_layers.new(name='Whitewashed stone courses')
    for poly,coords in zip(inner_mesh.polygons,inner_face_uv):
        for li,coord in zip(poly.loop_indices,coords): inner_uv.data[li].uv=coord
    inner_wall=bpy.data.objects.new('lighthouse whitewashed inner face',inner_mesh); scene.collection.objects.link(inner_wall); inner_wall['part']='lighthouse'; parent(inner_wall,light_root)
    # Slightly flared plinth and corbelled stone band under the gallery.
    for y, radius, depth in ((-1.75,5.34,.45),(24.65,3.04,.20),(24.90,3.25,.18),(25.12,3.48,.18)):
        band=cylinder(f'lighthouse-stone-course-{y}',(0,y,0),radius,depth,stone_photo,'lighthouse',10)
        parent(band,light_root)
    gallery_stone=matte_material('Lighthouse / aged gallery stone',(.30,.275,.235),.95)
    gallery=cylinder('lighthouse-gallery-deck',(0,25.42,0),3.62,.30,gallery_stone,'lighthouse',24)
    parent(gallery,light_root)
    for i in range(8):
        a=2*math.pi*i/8
        corbel=beam(f'lighthouse-gallery-corbels-{i}',(2.62*math.cos(a),25.05,2.62*math.sin(a)),(3.45*math.cos(a),25.23,3.45*math.sin(a)),.34,gallery_stone,'lighthouse',.28); parent(corbel,light_root)
    for i in range(12):
        a=2*math.pi*i/12; x,z=3.52*math.cos(a),3.52*math.sin(a)
        post=beam(f'lighthouse-gallery-rail-post-{i}',(x,25.55,z),(x,26.58,z),.055,iron,'lighthouse'); parent(post,light_root)
    for y in (25.62,26.48):
        for i in range(12):
            a=2*math.pi*i/12; b=a+2*math.pi/12
            rail_segment=beam(f'lighthouse-gallery-rail-{y}-{i}',(3.52*math.cos(a),y,3.52*math.sin(a)),
                 (3.52*math.cos(b),y,3.52*math.sin(b)),.045,iron,'lighthouse'); parent(rail_segment,light_root)
    # Glazed lantern room with iron mullions, domed cap and ventilator ball.
    lantern_glass=matte_material('Lighthouse / lantern glazing',(.42,.47,.42),.24)
    lantern_shader=lantern_glass.node_tree.nodes.get('Principled BSDF')
    lantern_shader.inputs['Alpha'].default_value=.18
    transmission_input=lantern_shader.inputs.get('Transmission Weight')
    if transmission_input: transmission_input.default_value=.62
    lantern_glass.surface_render_method='DITHERED'
    lantern=cylinder('lighthouse-lantern-glazing',(0,27.10,0),2.55,2.95,lantern_glass,'lighthouse:lamp',24)
    parent(lantern,light_root)
    cap_iron=matte_material('Lighthouse / dark painted iron cap',(.085,.095,.105),.84)
    cap=cylinder('lighthouse-lantern-roof-eave',(0,28.62,0),2.72,.18,cap_iron,'lighthouse',24); parent(cap,light_root)
    dome_verts=[]; dome_faces=[]; dome_segments=16; dome_rings=6
    dome_verts.append(gv((0,29.86,0)))
    for ring_index in range(1,dome_rings+1):
        theta=(math.pi/2)*ring_index/dome_rings
        radius=2.65*math.sin(theta); y=28.62+1.24*math.cos(theta)
        for i in range(dome_segments):
            a=2*math.pi*i/dome_segments; dome_verts.append(gv((radius*math.cos(a),y,radius*math.sin(a))))
    for i in range(dome_segments): dome_faces.append((0,1+i,1+(i+1)%dome_segments))
    for ring_index in range(dome_rings-1):
        start=1+ring_index*dome_segments; next_start=start+dome_segments
        for i in range(dome_segments):
            j=(i+1)%dome_segments; dome_faces.append((start+i,next_start+i,next_start+j,start+j))
    dome_faces.append(tuple(range(1+(dome_rings-1)*dome_segments,1+dome_rings*dome_segments)))
    dome_mesh=bpy.data.meshes.new('lighthouse iron dome'); dome_mesh.from_pydata(dome_verts,[],dome_faces); dome_mesh.materials.append(cap_iron); dome_mesh.update()
    dome=bpy.data.objects.new('lighthouse-lantern-domed-cap',dome_mesh); scene.collection.objects.link(dome); dome['part']='lighthouse'; parent(dome,light_root)
    ventilator=cylinder('lighthouse-ventilator-neck',(0,29.86,0),.26,.65,iron,'lighthouse',10); parent(ventilator,light_root)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=.42, location=gv((0,30.24,0)))
    vent_ball=bpy.context.object; vent_ball.name='lighthouse-ventilator-ball'; vent_ball.data.materials.append(iron); vent_ball['part']='lighthouse'; parent(vent_ball,light_root)
    # Dark, weathered recesses sit behind painted panes and the set-back door.
    recess=matte_material('Lighthouse / deep window shadow',(.055,.065,.062))
    frame_stone=matte_material('Lighthouse / darker reveal stone',(.27,.25,.21),.96)
    dark_glass=matte_material('Lighthouse / dark window glass',(.16,.21,.22),.22)
    dark_glass_shader=dark_glass.node_tree.nodes.get('Principled BSDF')
    if dark_glass_shader:
        dark_glass_shader.inputs['Metallic'].default_value=.12
        dark_glass_shader.inputs['Roughness'].default_value=.2
    for index,(low,high,_) in enumerate(openings):
        rad=light_radius((low+high)/2); width=opening_width((low+high)/2)
        if index == 0:
            # Set the door back, keep its surround in the tower's stone family.
            back=cube('lighthouse door recess',(0,-.7,-(rad-.62)),(width-.2,2.6,.05),recess,'lighthouse',0)
            # A painted board door, set back in the opening, on the step.
            door_paint=matte_material('Lighthouse / weathered door paint',(.15,.062,.04),.9)
            for board_index in range(4):
                bx=-.405+board_index*.27
                board=cube(f'lighthouse-door-board-{board_index}',(bx,-.85,-(rad-.42)),(.255,2.3,.07),door_paint,'lighthouse',.01); parent(board,light_root)
            for by in (-1.55,-.15):
                ledge=cube(f'lighthouse-door-ledge-{by}',(0,by,-(rad-.46)),(1.06,.14,.04),door_paint,'lighthouse',.01); parent(ledge,light_root)
            handle=cube('lighthouse-door-ring',(.36,-.8,-(rad-.37)),(.07,.12,.05),iron,'lighthouse',.02); parent(handle,light_root)
            parent(back,light_root)
            for side in (-1,1):
                surround=cube(f'lighthouse-door-reveal-{side}',(side*(width*.5-.12),-.75,-(rad-.36)),(.26,2.6,.76),frame_stone,'lighthouse',.035); parent(surround,light_root)
            head=cube('lighthouse-door-stone-head',(0,.48,-(rad-.36)),(width+.02,.26,.76),frame_stone,'lighthouse',.035); parent(head,light_root)
            continue
        for side in (-1,1):
            jamb=cube(f'lighthouse-window-{index}-jamb-{side}',(side*(width*.5-.06),(low+high)/2,-(rad-.36)),(.24,high-low,.76),frame_stone,'lighthouse',.02); parent(jamb,light_root)
        for y in (low+.08,high-.08):
            sill=cube(f'lighthouse-window-{index}-reveal-{y}',(0,y,-(rad-.36)),(width,.12,.76),frame_stone,'lighthouse',.02); parent(sill,light_root)
        pane=cube(f'lighthouse-window-{index}-glazed-pane',(0,(low+high)/2,-(rad-.20)),(width-.36,high-low-.30,.035),dark_glass,'lighthouse',.015); parent(pane,light_root)
        for side in (-1,1):
            painted=cube(f'lighthouse-window-{index}-painted-frame-{side}',(side*(width*.5-.20),(low+high)/2,-(rad-.07)),(.045,high-low-.18,.045),iron,'lighthouse',.01); parent(painted,light_root)
        for y in (low+.09,high-.09):
            painted=cube(f'lighthouse-window-{index}-painted-frame-{y}',(0,y,-(rad-.07)),(width-.40,.045,.045),iron,'lighthouse',.01); parent(painted,light_root)
    for y,rad in ((8,light_radius(8)),(16,light_radius(16)),(24,light_radius(24))):
        floor=cylinder(f'lighthouse-landing-{y}',(0,y,0),rad-.30,.22,inner_stone,'lighthouse',20)
        parent(floor,light_root)
        if y != 8:
            for i in range(4):
                a=i*2*math.pi/4+math.pi/4
                post=beam(f'lighthouse-landing-post-{y}-{i}',(math.cos(a)*(rad-.96),y+.03,math.sin(a)*(rad-.96)),(math.cos(a)*(rad-.96),y+.95,math.sin(a)*(rad-.96)),.035,iron,'lighthouse'); parent(post,light_root)
        if y != 8:
            handrail=torus_local(f'lighthouse-landing-handrail-{y}',(0,y+.68,0),rad-1.03,.045,iron,'lighthouse',axis='Y',major_segments=16,minor_segments=4); parent(handrail,light_root)
    for i in range(66):
        y=-1.6+i*.38; a=-math.pi/2+i*.135; radius=2.25
        x,z=math.cos(a)*radius,math.sin(a)*radius
        tread=beam(f'lighthouse-spiral-stair-{i}',(x,y,z),(x+math.cos(a+.4)*.45,y+.20,z+math.sin(a+.4)*.45),.12,wood,'lighthouse',.8); parent(tread,light_root)
    # A short handrail follows the first stair turn instead of circling the room.
    for i in range(23,29):
        y0=-1.6+i*.38+.86; y1=-1.6+(i+1)*.38+.86
        a0=-math.pi/2+i*.135; a1=-math.pi/2+(i+1)*.135
        stair_rail=beam(f'lighthouse-stair-handrail-{i}',(2.02*math.cos(a0),y0,2.02*math.sin(a0)),
                        (2.02*math.cos(a1),y1,2.02*math.sin(a1)),.055,iron,'lighthouse'); parent(stair_rail,light_root)
    step=cube('lighthouse-swept-step',(0,-1.86,-5.7),(2.2,.28,1.0),frame_stone,'lighthouse',.04); parent(step,light_root)
    # Dark backing makes the gaps read; narrow boards run from the window toward the camera.
    landing_woods=[matte_material(f'Lighthouse / worn landing boards {k}',c,.94)
                   for k,c in enumerate(((.30,.20,.11),(.24,.15,.08),(.34,.24,.14)))]
    gap_wood=matte_material('Lighthouse / dark board gaps',(.075,.052,.032),.98)
    board_bed=cube('lighthouse-landing-board-gap-backing',(0,8.115,-.05),(3.55,.025,5.35),gap_wood,'lighthouse')
    parent(board_bed,light_root)
    plank_verts=[]; plank_faces=[]; plank_materials=[]
    for i in range(18):
        x=-1.615+i*.19; start=len(plank_verts)
        plank_verts.extend(gv((px,8.17,pz)) for px,pz in ((x-.085,-2.65),(x+.085,-2.65),(x+.085,2.55),(x-.085,2.55)))
        plank_faces.append((start,start+1,start+2,start+3)); plank_materials.append((i*2)%3)
    plank_mesh=bpy.data.meshes.new('lighthouse narrow landing board strips'); plank_mesh.from_pydata(plank_verts,[],plank_faces); plank_mesh.update()
    for material in landing_woods: plank_mesh.materials.append(material)
    for poly,material_index in zip(plank_mesh.polygons,plank_materials): poly.material_index=material_index
    plank_obj=bpy.data.objects.new('lighthouse landing planks',plank_mesh); scene.collection.objects.link(plank_obj); plank_obj['part']='lighthouse'; parent(plank_obj,light_root)
    # The box of letters stands on the second landing, inside the room.
    letters=cube('lighthouse-box-of-letters',(.9,16.45,-1.6),(1.05,.65,.72),wood,'lighthouse',.06); parent(letters,light_root)
    warm_glow=bpy.data.materials.new('Lighthouse / warm landing glow'); warm_glow.use_nodes=True
    warm_nodes=warm_glow.node_tree.nodes; warm_nodes.clear()
    warm_out=warm_nodes.new('ShaderNodeOutputMaterial'); warm_emission=warm_nodes.new('ShaderNodeEmission')
    warm_emission.inputs['Color'].default_value=(1.0,.18,.035,1); warm_emission.inputs['Strength'].default_value=.9; warm_glow.node_tree.links.new(warm_emission.outputs[0],warm_out.inputs['Surface'])
    for y in (8,16,24):
        radius=light_radius(y)-.72
        x=1.95 if y == 8 else 2.72
        z=-math.sqrt(max(.1,radius*radius-x*x))+.08
        lamp_y=y+1.9 if y == 8 else y+1.15
        plate=cube(f'lighthouse-landing-sconce-back-{y}',(x,lamp_y,z),(.18,.28,.10),iron,'lighthouse',.03); parent(plate,light_root)
        globe=cube(f'lighthouse-landing-sconce-glow-{y}',(x,lamp_y,z+.12),(.12,.18,.11),warm_glow,'lighthouse',.045); parent(globe,light_root)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=5, ring_count=3, radius=.09, location=gv((x,lamp_y,z+.20)))
        bulb=bpy.context.object; bulb.name=f'lighthouse-landing-warm-bulb-{y}'; bulb.data.materials.append(warm_glow); bulb['part']='lighthouse'; parent(bulb,light_root)
        for poly in bulb.data.polygons: poly.use_smooth=True
        light_data=bpy.data.lights.new(f'lighthouse warm landing light {y}','POINT'); light_data.energy=350; light_data.color=(1.0,.39,.15); light_data.shadow_soft_size=.75
        light_obj=bpy.data.objects.new(f'lighthouse warm landing light {y}',light_data); scene.collection.objects.link(light_obj); light_obj.location=gv((x,lamp_y,z+.3)); parent(light_obj,light_root)
    crayon_red=matte_material('Lighthouse / crayon rust red',(.88,.12,.07),.92)
    crayon_blue=matte_material('Lighthouse / crayon sea blue',(.08,.42,.88),.92)
    crayon_yellow=matte_material('Lighthouse / crayon sun yellow',(1.0,.68,.05),.92)
    crayon_green=matte_material('Lighthouse / crayon leaf green',(.13,.68,.20),.92)
    # Cream paper pinned flat to the curved wall, with filled crayon pictures.
    paper=matte_material('Lighthouse / cream drawing paper',(.82,.73,.55),.92)
    paper_shadow=matte_material('Lighthouse / paper edge',(.30,.25,.18),.96)
    pin=matte_material('Lighthouse / drawing pins',(.18,.16,.13),.72)
    def paper_sheet(name,x,cy,width,height):
        rad=light_radius(cy)-.72
        z=-math.sqrt(max(.1,rad*rad-x*x))+.20
        board=cube(name,(x,cy,z),(width,height,.055),paper,'lighthouse',.025); parent(board,light_root)
        for dx,dy in ((-width*.5+.04,-height*.5+.04),(width*.5-.04,height*.5-.04)):
            curl=cube(f'{name}-curled-corner-{dx}-{dy}',(x+dx,cy+dy,z+.035),(.13,.13,.035),paper_shadow,'lighthouse',.018); parent(curl,light_root)
        tack=bpy.ops.mesh.primitive_uv_sphere_add(segments=6,ring_count=4,radius=.055,location=gv((x,cy+height*.5-.08,z+.07)))
        tack_obj=bpy.context.object; tack_obj.name=f'{name}-pin'; tack_obj.data.materials.append(pin); tack_obj['part']='lighthouse'; parent(tack_obj,light_root)
        return z
    def filled_picture(name,coords,color):
        verts=[gv((x,y,z)) for x,y,z in coords]
        mesh=bpy.data.meshes.new(name+' mesh'); mesh.from_pydata(verts,[],[tuple(range(len(verts)))]); mesh.materials.append(color); mesh.update()
        obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj['part']='lighthouse'; parent(obj,light_root)
    ship_paper_z=paper_sheet('lighthouse-drawing-paper-ship',-1.9,9.0,.9,1.12)
    house_paper_z=paper_sheet('lighthouse-drawing-paper-house',-.95,9.0,.9,1.12)
    sun_paper_z=paper_sheet('lighthouse-drawing-paper-sun',1.75,9.0,.9,1.12)
    filled_picture('lighthouse-drawing-filled-ship',[(-2.27,8.78,ship_paper_z+.06),(-1.53,8.78,ship_paper_z+.06),(-1.63,8.57,ship_paper_z+.06),(-2.17,8.57,ship_paper_z+.06)],crayon_red)
    filled_picture('lighthouse-drawing-filled-mast',[(-1.93,8.75,ship_paper_z+.075),(-1.86,8.75,ship_paper_z+.075),(-1.86,9.34,ship_paper_z+.075),(-1.93,9.34,ship_paper_z+.075)],crayon_blue)
    filled_picture('lighthouse-drawing-filled-sail',[(-1.89,8.83,ship_paper_z+.07),(-1.89,9.35,ship_paper_z+.07),(-1.63,8.87,ship_paper_z+.07)],crayon_yellow)
    filled_picture('lighthouse-drawing-filled-house',[(-1.27,8.72,house_paper_z+.06),(-.63,8.72,house_paper_z+.06),(-.63,9.08,house_paper_z+.06),(-1.27,9.08,house_paper_z+.06)],crayon_blue)
    filled_picture('lighthouse-drawing-filled-roof',[(-1.33,9.05,house_paper_z+.07),(-.95,9.36,house_paper_z+.07),(-.57,9.05,house_paper_z+.07)],crayon_red)
    sun_centre=(1.75,9.03,sun_paper_z+.065)
    filled_picture('lighthouse-drawing-filled-sun',[(sun_centre[0]+.2*math.cos(k*math.pi/6),sun_centre[1]+.2*math.sin(k*math.pi/6),sun_centre[2]) for k in range(12)],crayon_yellow)
    for k in range(8):
        a=k*math.pi/4; r0,r1=.26,.36
        filled_picture(f'lighthouse-drawing-sun-ray-{k}',[(sun_centre[0]+r0*math.cos(a-.12),sun_centre[1]+r0*math.sin(a-.12),sun_centre[2]),(sun_centre[0]+r1*math.cos(a),sun_centre[1]+r1*math.sin(a),sun_centre[2]),(sun_centre[0]+r0*math.cos(a+.12),sun_centre[1]+r0*math.sin(a+.12),sun_centre[2])],crayon_red)
    lamp_mesh=cylinder('lighthouse:lamp',(0,27.0,0),.62,1.65,lamp,'lighthouse:lamp',24)
    for poly in lamp_mesh.data.polygons: poly.use_smooth=True
    lamp_root=root_obj('lighthouse:lamp',(0,0,0),'lighthouse:lamp'); parent(lamp_root,light_root); parent(lamp_mesh,lamp_root)
    for i in range(8):
        a=i*math.pi/4
        b=beam(f'lighthouse-lantern-mullion-{i}',(math.cos(a)*2.55,25.65,math.sin(a)*2.55),(math.cos(a)*2.55,28.48,math.sin(a)*2.55),.08,iron,'lighthouse:lamp')
        parent(b,lamp_root)
    lightpart=root_obj('lighthouse:beam',(0,0,0),'lighthouse:beam'); parent(lightpart,light_root)
    beam_mat=bpy.data.materials.new('Lighthouse / soft translucent beam'); beam_mat.use_nodes=True
    beam_nodes=beam_mat.node_tree.nodes; beam_nodes.clear()
    beam_out=beam_nodes.new('ShaderNodeOutputMaterial'); beam_shader=beam_nodes.new('ShaderNodeBsdfPrincipled')
    beam_shader.inputs['Base Color'].default_value=(1.0,.69,.31,1); beam_shader.inputs['Emission Color'].default_value=(1.0,.57,.18,1); beam_shader.inputs['Emission Strength'].default_value=.5; beam_shader.inputs['Roughness'].default_value=.8
    beam_texcoord=beam_nodes.new('ShaderNodeTexCoord')
    beam_separate=beam_nodes.new('ShaderNodeSeparateXYZ')
    beam_nodes.new('ShaderNodeMapRange')
    beam_map=beam_nodes.get('Map Range')
    beam_map.inputs['From Min'].default_value=0.0; beam_map.inputs['From Max'].default_value=1.0
    beam_map.inputs['To Min'].default_value=0.0; beam_map.inputs['To Max'].default_value=.18
    beam_mat.node_tree.links.new(beam_texcoord.outputs['Generated'],beam_separate.inputs['Vector'])
    beam_mat.node_tree.links.new(beam_separate.outputs['Y'],beam_map.inputs['Value'])
    beam_mat.node_tree.links.new(beam_map.outputs['Result'],beam_shader.inputs['Alpha'])
    beam_mat.surface_render_method='DITHERED'; beam_mat.node_tree.links.new(beam_shader.outputs['BSDF'],beam_out.inputs['Surface'])
    # An open cone, 14 m long and 1.5 m across at its end, in four lengths that
    # each get fainter, so the light dies away instead of ending in a cap.
    for node in list(beam_nodes):
        if node.type in ('TEX_COORD','SEPARATE_XYZ','MAP_RANGE'): beam_nodes.remove(node)
    beam_shader.inputs['Alpha'].default_value=.18
    beam_verts=[]; beam_faces=[]; beam_sides=16; beam_rings=5
    for ring in range(beam_rings):
        t=ring/(beam_rings-1); z=-.55-13.45*t; radius=.12+.63*t
        for i in range(beam_sides):
            a=2*math.pi*i/beam_sides
            beam_verts.append(gv((radius*math.cos(a),27.5+radius*math.sin(a),z)))
    beam_mesh=bpy.data.meshes.new('lighthouse soft widening light shaft')
    for ring in range(beam_rings-1):
        for i in range(beam_sides):
            j=(i+1)%beam_sides
            beam_faces.append((ring*beam_sides+i,ring*beam_sides+j,(ring+1)*beam_sides+j,(ring+1)*beam_sides+i))
    beam_mesh.from_pydata(beam_verts,[],beam_faces)
    for ring in range(beam_rings-1):
        segment_mat=beam_mat if ring==0 else beam_mat.copy()
        segment_mat.name=f'Lighthouse / soft translucent beam {ring}'
        segment_mat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.18*BEAM_FADE[ring]
        beam_mesh.materials.append(segment_mat)
    for index,poly in enumerate(beam_mesh.polygons):
        poly.material_index=index//beam_sides; poly.use_smooth=True
    beam_mesh.update()
    beam_obj=bpy.data.objects.new('lighthouse rotating beam',beam_mesh); scene.collection.objects.link(beam_obj); beam_obj['part']='lighthouse:beam'; parent(beam_obj,lightpart)

    # Forty-foot pilot boat lofted from twelve measured stations. The vee
    # closes below the waterline and the bow flares above the chine.
    boat=root_obj('pilot-boat',(230,-.8,-430),'pilot-boat')
    boat_stripe=matte_material('Pilot boat / dark green boot stripe',(.035,.16,.105),.8)
    strap_yellow=matte_material('Pilot boat / bright yellow ratchet webbing',(.95,.62,.035),.72)
    deck_paint=matte_material('Pilot boat / grey non-slip deck',(.31,.33,.32),.95)
    photo=bpy.data.images.load(str(photos['pilot-boat-photo'].resolve()),check_existing=True)
    photo_w,photo_h=photo.size
    stations=((-0.50,.80),(-.44,.84),(-.36,.90),(-.27,.95),(-.16,.99),(-.04,1),(.10,1),(.22,.97),(.32,.90),(.40,.74),(.46,.48),(.50,.04))
    # Measured from the photo: the sheer rises about 0.55 m to the bow, and
    # the keel runs level to about 78% of the length, then the raked stem
    # climbs to the sheer. Each section is a deep vee with a hard chine.
    def boat_along(t): return max(0,min(1,t+.5))
    def boat_deck(t): return 2.34+.55*boat_along(t)**2
    def boat_keel(t):
        along=boat_along(t)
        if along<=.78: return .40
        return .40+(boat_deck(t)-.25-.40)*((along-.78)/.22)**1.25
    def boat_section(t,b):
        hw=1.92*b; K=boat_keel(t); D=boat_deck(t)-K
        return ((K,0),(K+.28*D,.62*hw),(K+.62*D,.92*hw),(boat_deck(t)-.24,1.02*hw),(boat_deck(t),1.05*hw))
    def hull_photo_uv(t,y):
        along=boat_along(t); px=10+1510*along
        sheer=345+(190-345)*along
        keel=470+30*along if along<=.80 else (494+(sheer+6-494)*((along-.80)/.20)**1.25)
        f=max(0,min(1,(y-boat_keel(t))/max(.05,boat_deck(t)-boat_keel(t))))
        py=keel+(sheer-keel)*f
        return (px/photo_w,1-py/photo_h)
    rings=[]
    for t,b in stations:
        sec=boat_section(t,b); x=t*12.2
        right=[(x,y,w) for y,w in sec]; left=[(x,y,-w) for y,w in reversed(sec[1:])]
        rings.append(right+left)
    verts=[gv(v) for ring in rings for v in ring]; faces=[]; uvs=[]
    for i in range(len(rings)-1):
        for j in range(9):
            a=i*9+j; b=i*9+(j+1)%9
            faces.append((a,b,b+9,a+9))
            def hull_uv(vertex_index):
                station_index=vertex_index//9; section_index=vertex_index%9
                yy=rings[station_index][section_index][1]
                return hull_photo_uv(stations[station_index][0],yy)
            uvs.append(tuple(hull_uv(index) for index in (a,b,b+9,a+9)))
    faces.extend((tuple(range(8,-1,-1)),tuple((len(rings)-1)*9+j for j in range(9))))
    hull_mesh=bpy.data.meshes.new('twelve-station deep vee hull'); hull_mesh.from_pydata(verts,[],faces); hull_mesh.materials.append(boat_paint); hull_mesh.materials.append(deck_paint); hull_mesh.materials.append(pilot_photo); hull_mesh.update()
    hull=bpy.data.objects.new('pilot-boat:floatable-hull',hull_mesh); scene.collection.objects.link(hull); hull['part']='pilot-boat'; parent(hull,boat)
    uv=hull_mesh.uv_layers.new(name='UVMap')
    for poly,coords in zip(hull_mesh.polygons,uvs):
        ring_face=poly.index < (len(stations)-1)*9
        side_face=ring_face and poly.index%9 in (0,1,2,3,5,6,7,8)
        poly.material_index=2 if side_face else (1 if ring_face and poly.index%9==4 else 0)
        for li,coord in zip(poly.loop_indices,coords): uv.data[li].uv=coord
    # Black rubbing strake follows the sheer; the photo itself carries the boot stripe.
    for side in (-1,1):
        for i in range(len(stations)-1):
            (t0,b0),(t1,b1)=stations[i],stations[i+1]
            beam(f'pilot-boat-black-rubbing-strake-{side}-{i}',(t0*12.2,boat_deck(t0)-.16,side*1.92*b0*1.04),(t1*12.2,boat_deck(t1)-.16,side*1.92*b1*1.04),.12,iron,'pilot-boat',.09)
    for name,y,width,material in (('transom-strake',2.18,.12,iron),('transom-boot-stripe',.95,.12,boat_stripe)):
        half=1.92*stations[0][1]*(1.04 if y>2 else .70)
        beam(f'pilot-boat-{name}',(-6.13,y,-half),(-6.13,y,half),width,material,'pilot-boat',.06)
    def hull_station_at(x):
        t=x/12.2
        for (ta,ba),(tb,bb) in zip(stations,stations[1:]):
            if ta<=t<=tb: return t,ba+(bb-ba)*(t-ta)/(tb-ta)
        return t,stations[-1][1]
    # Faceted house shell with a raked bow; dark recessed glazing is separate.
    house_vertices=[(-3.78,2.34,-1.30),(1.10,2.34,-1.30),(1.10,2.34,1.30),(-3.78,2.34,1.30),(-4.10,4.64,-1.18),(-.51,4.64,-1.18),(-.51,4.64,1.18),(-4.10,4.64,1.18)]
    # Bottom, roof and stern transom; both sides and the raked bow are built
    # around their window openings below.
    house_faces=((0,3,2,1),(4,5,6,7),(3,0,4,7))
    mesh=bpy.data.meshes.new('raked pilot house'); mesh.from_pydata([gv(v) for v in house_vertices],[],house_faces); mesh.materials.append(boat_paint); mesh.update()
    cabin=bpy.data.objects.new('pilot-boat-pilot-house',mesh); scene.collection.objects.link(cabin); cabin['part']='pilot-boat'; parent(cabin,boat)
    roof=cube('pilot-boat-pilot-house-roof',(-1.50,4.70,0),(5.5,.12,2.90),boat_paint,'pilot-boat',.035); parent(roof,boat)
    def front_x(y): return 1.10-(1.10+.51)*(y-2.34)/(4.64-2.34)
    # Side walls are tiled around five cutouts; glass is set 0.06 m behind the skin.
    window_x=(-3.30,-2.46,-1.62,-.78); win_w=.70; win_lo,win_hi=3.30,4.30
    for side in (-1,1):
        def house_side_z(y): return side*(1.30-.12*(y-2.34)/(4.64-2.34))
        x_edges=[-3.78]
        for x in window_x: x_edges.extend((x-win_w/2,x+win_w/2))
        x_edges.append(1.10)
        y_edges=(2.34,win_lo,win_hi,4.64)
        side_verts=[]; side_faces=[]
        for row in range(3):
            for col in range(len(x_edges)-1):
                if row==1 and col%2==1: continue
                start=len(side_verts); x0,x1=x_edges[col:col+2]; y0,y1=y_edges[row:row+2]
                side_verts.extend((gv((min(x0,front_x(y0)),y0,house_side_z(y0))),gv((min(x1,front_x(y0)),y0,house_side_z(y0))),gv((min(x1,front_x(y1)),y1,house_side_z(y1))),gv((min(x0,front_x(y1)),y1,house_side_z(y1)))))
                face=tuple(range(start,start+4))
                side_faces.append(face if side>0 else tuple(reversed(face)))
        side_mesh=bpy.data.meshes.new(f'pilot house windowed side {side}'); side_mesh.from_pydata(side_verts,[],side_faces); side_mesh.materials.append(boat_paint); side_mesh.update()
        side_obj=bpy.data.objects.new(f'pilot-boat-windowed-side-{side}',side_mesh); scene.collection.objects.link(side_obj); side_obj['part']='pilot-boat'; parent(side_obj,boat)
        for i,x in enumerate(window_x):
            pane=cube(f'pilot-boat-recessed-side-glass-{side}-{i}',(x,(win_lo+win_hi)/2,side*(abs(house_side_z((win_lo+win_hi)/2))-.06)),(win_w-.04,win_hi-win_lo-.04,.025),glass,'pilot-boat',.02); parent(pane,boat)
        # Rails stand 0.9 m above the rising deck, just inside the deck edge.
        def rail_point(x,h=.90):
            t,b=hull_station_at(x); return (x,boat_deck(t)+h,side*(1.92*b*1.05-.12))
        for x0,x1 in ((1.6,3.4),(3.4,4.8),(4.8,5.6),(-5.9,-4.9),(-4.9,-3.9)):
            rail(f'pilot-boat-rail-{side}-{x0}',rail_point(x0),rail_point(x1),.035,steel,'pilot-boat')
        for x in (-5.9,-4.9,-3.9,1.6,3.4,4.8,5.6):
            rail(f'pilot-boat-rail-post-{side}-{x}',rail_point(x,0),rail_point(x),.025,steel,'pilot-boat')
    # Cut three real openings through the steeply raked front face.
    front_centres=(-.80,0,.80); front_w=.70; front_lo,front_hi=3.30,4.30
    z_edges=[-1.30]
    for z in front_centres: z_edges.extend((z-front_w/2,z+front_w/2))
    z_edges.append(1.30)
    front_verts=[]; front_faces=[]; fy=(2.34,front_lo,front_hi,4.64)
    for row in range(3):
        for col in range(len(z_edges)-1):
            if row==1 and col%2==1: continue
            start=len(front_verts); z0,z1=z_edges[col:col+2]; y0,y1=fy[row:row+2]
            front_verts.extend((gv((front_x(y0),y0,z0)),gv((front_x(y0),y0,z1)),gv((front_x(y1),y1,z1)),gv((front_x(y1),y1,z0))))
            front_faces.append(tuple(reversed(range(start,start+4))))
    front_mesh=bpy.data.meshes.new('pilot house raked front with three openings'); front_mesh.from_pydata(front_verts,[],front_faces); front_mesh.materials.append(boat_paint); front_mesh.update()
    front_obj=bpy.data.objects.new('pilot-boat-windowed-raked-front',front_mesh); scene.collection.objects.link(front_obj); front_obj['part']='pilot-boat'; parent(front_obj,boat)
    for i,z in enumerate((-.80,0,.80)):
        pane=cube(f'pilot-boat-recessed-front-glass-{i}',(front_x(3.80)-.06,3.80,z),(.025,.96,.66),glass,'pilot-boat',.02); pane.rotation_euler[1]=math.radians(-35); parent(pane,boat)
    # Roof gear.
    rail('pilot-boat-mast',(-2.25,4.70,0),(-2.25,5.55,0),.035,steel,'pilot-boat')
    rail('pilot-boat-yardarm',(-2.66,5.26,0),(-1.84,5.26,0),.025,steel,'pilot-boat')
    cylinder('pilot-boat-radar-dome',(-2.25,5.62,0),.20,.18,boat_paint,'pilot-boat',16,'Y')
    cylinder('pilot-boat-searchlight',(-.95,4.80,.38),.12,.18,iron,'pilot-boat',16,'X')
    rail('pilot-boat-horn',(-1.0,4.86,-.38),(-.55,5.00,-.38),.045,steel,'pilot-boat')
    for side in (-1,1):
        rail(f'pilot-boat-roof-grab-rail-{side}',(-4.20,4.90,side*1.42),(1.20,4.90,side*1.42),.028,steel,'pilot-boat')
        for x in (-3.9,-1.5,.9): rail(f'pilot-boat-roof-grab-post-{side}-{x}',(x,4.70,side*1.38),(x,4.90,side*1.42),.022,steel,'pilot-boat')
        for slat in range(4):
            y=2.88+slat*.12
            beam(f'pilot-boat-aft-vent-grille-{side}-{slat}',(-3.72,y,side*1.34),(-3.12,y,side*1.34),.045,iron,'pilot-boat',.025)
    lightmat=matte_material('Pilot boat / warm deck light glass',(1.0,.67,.28),.25)
    for x in (-.15,1.00):
        lamp=cube(f'pilot-boat-deck-light-{x}',(x,4.83,0),(.24,.18,.34),lightmat,'pilot-boat',.035); parent(lamp,boat)
    for side in (-1,1): torus(f'pilot-boat-life-ring-{side}',(-4.8,2.65,side*.98),.28,.06,materials['faded-hand-paint'],'pilot-boat','Z',16,6)
    # The long, thin trailer frame sags slightly under its absurd load.
    for z in (-1.65,1.65):
        beam(f'pilot-trailer-ladder-rail-aft-{z}',(-7.0,0,z),(-.2,-.16,z),.13,rust,'pilot-boat',.12)
        beam(f'pilot-trailer-ladder-rail-forward-{z}',(-.2,-.16,z),(6.5,0,z),.13,rust,'pilot-boat',.12)
    for x in (-6,-3,0,3,6): beam(f'pilot-trailer-crossmember-{x}',(x,-.10,-1.65),(x,-.10,1.65),.14,steel,'pilot-boat',.12)
    for side in (-1,1):
        beam(f'pilot-trailer-a-frame-{side}',(6.2,0,side*1.6),(12.7,-.08,0),.12,rust,'pilot-boat',.11)
        beam(f'pilot-trailer-timber-bunk-{side}',(-5.5,.38,side*1.12),(5.6,.38,side*1.12),.20,wood,'pilot-boat',.16)
        for axle,x in enumerate((-4.2,0,4.2)):
            z=side*1.78; wheel_y=-.675
            tire=cylinder(f'pilot-trailer-solid-black-tyre-{side}-{axle}',(x,wheel_y,z),.525,.30,iron,'pilot-boat',24,'Y'); tire.rotation_euler[0]=math.pi/2
            rim=cylinder(f'pilot-trailer-steel-rim-{side}-{axle}',(x,wheel_y,z+side*.16),.32,.04,steel,'pilot-boat',20,'Y'); rim.rotation_euler[0]=math.pi/2
            hub=cylinder(f'pilot-trailer-hub-{side}-{axle}',(x,wheel_y,z+side*.19),.105,.06,steel,'pilot-boat',12,'Y'); hub.rotation_euler[0]=math.pi/2
            inner=cylinder(f'pilot-trailer-inner-solid-tyre-{side}-{axle}',(x,wheel_y,z-side*.34),.525,.28,iron,'pilot-boat',24,'Y'); inner.rotation_euler[0]=math.pi/2
            rail(f'pilot-trailer-axle-{side}-{axle}',(x,wheel_y,side*.85),(x,wheel_y,side*1.48),.085,steel,'pilot-boat')
            guard_verts=[]; guard_faces=[]; guard_segments=8
            for edge_z in (side*1.30,side*2.00):
                for step in range(guard_segments+1):
                    angle=math.radians(30+120*step/guard_segments)
                    guard_verts.append(gv((x+.65*math.cos(angle),wheel_y+.65*math.sin(angle),edge_z)))
            for step in range(guard_segments):
                a=step; b=step+guard_segments+1
                guard_faces.append((a,a+1,b+1,b))
            guard_mesh=bpy.data.meshes.new(f'pilot trailer mudguard mesh {side} {axle}'); guard_mesh.from_pydata(guard_verts,[],guard_faces); guard_mesh.materials.append(rust); guard_mesh.update()
            guard=bpy.data.objects.new(f'pilot-trailer-mudguard-{side}-{axle}',guard_mesh); scene.collection.objects.link(guard); guard['part']='pilot-boat'; parent(guard,boat)
    for support,x in enumerate((-4.4,-.5,3.8)):
        for layer in range(4):
            y=.55+layer*.30
            across=(layer%2)==0
            dims=(.42,.30,1.72) if across else (1.25,.30,.42)
            block=cube(f'pilot-trailer-cribbing-{support}-{layer}',(x,y,0),dims,wood,'pilot-boat',.025); parent(block,boat)
    body_lift=bpy.data.objects.new('pilot-boat-elevated-cradle',None); scene.collection.objects.link(body_lift); body_lift.location=(0,0,1.2); body_lift['part']='pilot-boat'; parent(body_lift,boat)
    for i,photo_x in enumerate((110,340,715)):
        along=(photo_x-10)/1510; x=(along-.5)*12.2
        t,b=hull_station_at(x); sec=boat_section(t,b)
        for side in (-1,1):
            path=[(x,.06,side*1.68)]+[(x,y+1.23,side*(w+.07)) for y,w in sec[1:]]+[(x,boat_deck(t)+1.23,0)]
            for k,(p0,p1) in enumerate(zip(path,path[1:])):
                beam(f'pilot-boat-yellow-strap-{i}-{side}-{k}',p0,p1,.05,strap_yellow,'pilot-boat',.02)
        box=cube(f'pilot-boat-strap-ratchet-{i}',(x,.18,-1.70),(.18,.09,.12),steel,'pilot-boat',.01); parent(box,boat)
    signmat=matte_material('Pilot boat / yellow oversize sign',(.95,.70,.035),.25)
    black=matte_material('Pilot boat / black sign letters',(.012,.014,.012),.25)
    sign=cube('pilot-trailer-wide-load-board',(7.1,2.08,0),(.14,.72,2.8),signmat,'pilot-boat',.025); parent(sign,boat)
    for z in (-1.08,1.08):
        beam(f'pilot-trailer-sign-frame-{z}',(7.12,.28,z),(7.12,2.55,z),.10,rust,'pilot-boat',.09)
    for z in (-1.08,1.08):
        bolt=cylinder(f'pilot-boat-sign-bolt-{z}',(7.22,2.12,z),.045,.045,steel,'pilot-boat',12,'X'); parent(bolt,boat)
    text_data=bpy.data.curves.new('WIDE LOAD black lettering','FONT'); text_data.body='WIDE LOAD'; text_data.size=.43; text_data.extrude=.004; text_data.resolution_u=1
    text_obj=bpy.data.objects.new('pilot-trailer-wide-load-lettering',text_data); scene.collection.objects.link(text_obj); text_obj.location=gv((7.19,1.94,0)); text_obj.rotation_euler=(math.pi/2,0,-math.pi/2); text_obj.data.materials.append(black); text_obj['part']='pilot-boat'; parent(text_obj,boat)
    orange=matte_material('Pilot boat / orange oversize flags',(.95,.19,.025),.45)
    for side in (-1,1):
        rail(f'pilot-boat-oversize-flag-staff-{side}',(5.52,boat_deck(.46)+1.22,side*1.78),(5.52,boat_deck(.46)+2.10,side*1.78),.025,steel,'pilot-boat')
        # Small triangular cloths are single-sided and point out from the bow.
        flag_mesh=bpy.data.meshes.new(f'oversize bow flag {side}')
        coords=[gv((5.52,boat_deck(.46)+2.06,side*1.78)),gv((5.52,boat_deck(.46)+1.58,side*1.78)),gv((5.52,boat_deck(.46)+1.78,side*2.42))]
        flag_mesh.from_pydata(coords,[],[(0,1,2)]); flag_mesh.materials.append(orange)
        flag=bpy.data.objects.new(f'pilot-boat-oversize-flag-{side}',flag_mesh); scene.collection.objects.link(flag); flag['part']='pilot-boat'; parent(flag,boat)
    trailer_hitch=root_obj('pilot-boat:hitch',(0,0,0),'pilot-boat:hitch'); parent(trailer_hitch,boat)
    hitch=beam('pilot-trailer-hitch-coupler',(12.5,-.08,0),(13.4,-.08,0),.16,steel,'pilot-boat:hitch'); parent(hitch,trailer_hitch)
    # A spare tyre and jerrycan make the towing rig look just barely roadworthy.
    spare=cylinder('pilot-trailer-chained-spare-tyre',(8.35,.35,.72),.48,.24,iron,'pilot-boat',16,'Y'); spare.rotation_euler[0]=math.pi/2
    rim=cylinder('pilot-trailer-spare-rim',(8.35,.35,.86),.24,.04,steel,'pilot-boat',12,'Y'); rim.rotation_euler[0]=math.pi/2
    torus('pilot-trailer-spare-chain-loop',(9.00,.26,.45),.12,.025,steel,'pilot-boat','Y',10,5)
    can=cube('pilot-trailer-jerrycan',(9.10,.44,-.48),(.52,.70,.34),matte_material('Pilot boat / faded jerrycan',(.39,.32,.13),.45),'pilot-boat',.04); parent(can,boat)
    for offset in (-.14,0,.14): beam(f'pilot-trailer-jerrycan-rib-{offset}',(8.84,.35+offset,-.66),(8.84,.35+offset,-.30),.025,steel,'pilot-boat',.02)
    # Move only boat body and fittings up; trailer remains low under the cribbing.
    for obj in list(boat.children):
        if obj is body_lift or obj.name.startswith(('pilot-trailer-', 'pilot-boat-yellow-strap-', 'pilot-boat-strap-ratchet-')) or obj.name == 'pilot-boat:hitch':
            continue
        obj.parent=body_lift; obj.matrix_parent_inverse=Matrix.Identity(4)
    # Strap tops follow the raised hull, while their lower ends stay on the frame.
    for obj in list(scene.objects):
        if obj.name.startswith('pilot-boat-yellow-strap-'):
            obj.parent=boat; obj.matrix_parent_inverse=Matrix.Identity(4)
    # Geometry helpers create world-scoped objects; keep every named fitting
    # under the boat root so the exported boat view carries its trailer along.
    for obj in list(scene.objects):
        if obj.name.startswith(('pilot-boat-', 'pilot-trailer-')) and obj.parent is None:
            parent(obj, boat)

# Separate heaps bank the bows and one quarter point on both sides. Each foot
# reaches 8 m onto the ground; the gaps expose the hull against a flat bed.
ship_ground=sand
for ident,_,_,length,width,_,_,_ in ships:
    if ident not in roots:
        continue
    ship_root=roots[ident]
    verts=[]; faces=[]
    for mound_index,t in enumerate((.43,.25)):
        station_t, breadth = min(HULL_STATIONS, key=lambda row: abs(row[0]-t))
        center_x=length*t
        inner=width*breadth*.5+.12
        for side in (-1,1):
            start=len(verts); along_steps=13; out_steps=9
            for ai in range(along_steps):
                v=-1+2*ai/(along_steps-1)
                for oi in range(out_steps):
                    u=oi/(out_steps-1)
                    # A heap banked against the plating: highest at the hull,
                    # sloping to the ground at its foot and at both ends.
                    x=center_x+v*(6.0 if mound_index==0 else 4.5)
                    z=side*(inner+8*u)
                    y=-2+1.4*(math.cos(math.pi*u/2)**1.4)*(math.cos(math.pi*v/2)**1.6)
                    verts.append(gv((x,y,z)))
            for ai in range(along_steps-1):
                for oi in range(out_steps-1):
                    a=start+ai*out_steps+oi; b=a+out_steps
                    faces.append((a,b,b+1,a+1) if side>0 else (a,a+1,b+1,b))
    # The ship leans, so a heap built in her own frame would lift its foot
    # off the ground on one side and bury it on the other. Measure each
    # heap's height from the real ground (y = -2, Blender z = -2) instead.
    bpy.context.view_layer.update()
    to_world=ship_root.matrix_world.copy(); to_local=to_world.inverted()
    for i,v in enumerate(verts):
        height=v.z+2.0
        w=to_world @ v
        w.z=-2.0+height
        verts[i]=to_local @ w
    # All of one ship's heaps form one part, `<ship>:drifts`.
    mesh=bpy.data.meshes.new(f'{ident} drifts mesh')
    mesh.from_pydata(verts,[],faces); mesh.validate(); mesh.materials.append(sand); mesh.update()
    for polygon in mesh.polygons: polygon.use_smooth=True
    mound=bpy.data.objects.new(f'{ident}:drifts',mesh)
    scene.collection.objects.link(mound); mound['part']=ident+':drifts'; parent(mound,ship_root)
for index,(x,z,rx,rz) in enumerate(((-45,-415,53,19),(45,-440,51,20),(5,-470,55,22),(170,-395,14,12),(230,-430,20,15)) if args.stage == 'family' else ()):
    # Blender Z is map-up. A low, irregular radial heap fades into the bed
    # rather than ending as an oval slab at the hull.
    import random
    rng=random.Random(811+index)
    segments=48; rings=8; verts=[gv((x,-2.0,z))]; faces=[]
    for ring in range(1,rings+1):
        r=ring/rings
        for i in range(segments):
            a=2*math.pi*i/segments; wobble=1+rng.uniform(-.055,.055)
            rise=max(0,.82*math.sin(math.pi*r)**.82+rng.uniform(-.06,.06)*(1-r))
            verts.append(gv((x+math.cos(a)*rx*r*wobble,-2.0+rise,z+math.sin(a)*rz*r*wobble)))
    for i in range(segments): faces.append((0,1+(i+1)%segments,1+i))
    for ring in range(rings-1):
        a0=1+ring*segments; a1=a0+segments
        for i in range(segments):
            j=(i+1)%segments; faces.append((a0+i,a0+j,a1+j,a1+i))
    mesh=bpy.data.meshes.new(f'ship-place-spread-sand-{index} mesh'); mesh.from_pydata(verts,[],faces); mesh.materials.append(ship_ground); mesh.update()
    mound=bpy.data.objects.new(f'ship-place-spread-sand-{index}',mesh); scene.collection.objects.link(mound)

# One export root holds every named story place while preserving map coordinates.
world_root=root_obj('wasteland-ships-root',(0,0,0),'wasteland-ships')
for child in list(scene.objects):
    if child is not world_root and child.parent is None:
        parent(child,world_root)

def normalize_picture_coordinates():
    for obj in scene.objects:
        if obj.type != 'MESH':
            continue
        mesh = obj.data
        if mesh.validate(verbose=False, clean_customdata=False):
            print(f'Repaired invalid mesh data before UV export: {obj.name}')
        mesh.update()
        if not mesh.uv_layers:
            uv = mesh.uv_layers.new(name='UVMap')
            for loop in mesh.loops:
                if loop.vertex_index >= len(mesh.vertices):
                    raise RuntimeError(
                        f'{obj.name} has invalid loop {loop.index} vertex '
                        f'{loop.vertex_index} for {len(mesh.vertices)} vertices'
                    )
                co = mesh.vertices[loop.vertex_index].co
                uv.data[loop.index].uv = (co.x, co.y)
        primary = mesh.uv_layers.active or mesh.uv_layers[0]
        primary.name = 'UVMap'
        for layer in list(mesh.uv_layers):
            if layer != primary:
                mesh.uv_layers.remove(layer)
        mesh.uv_layers.active = primary
        primary.active_render = True

def merge_meshes_by_story_part():
    groups={}
    for obj in scene.objects:
        if obj.type!='MESH': continue
        part=obj.get('part','')
        groups.setdefault((part,obj.parent.name if obj.parent else ''),[]).append(obj)
    for (part,parent_name),objects in groups.items():
        if len(objects)<2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        active=objects[0]; bpy.context.view_layer.objects.active=active
        bpy.ops.object.join()
        active.name=(part or 'lake-bed')+' geometry'
        if part: active['part']=part

def trim_patience_detail():
    # The round-12 silhouette is carried by the carved hull and upperworks.
    # Collapse only dense fittings, chains and sand after they have been joined
    # by story part, keeping the photo-carved surfaces at their own targets.
    ratios = {
        'ship-patience': .18,
        'ship-patience:anchor-chain': .38,
        'ship-patience:mast': .45,
        'ship-patience:propeller': .48,
        'ship-patience:rudder': .55,
        'ship-patience:bell': .55,
        'ship-good-hope': .42,
        'ship-good-hope:anchor-chain': .38,
        'ship-marigold': .42,
        'ship-marigold:anchor-chain': .38,
    }
    for obj in scene.objects:
        if obj.type != 'MESH':
            continue
        part = obj.get('part', '')
        ratio = ratios.get(part)
        if ratio is None:
            continue
        modifier = obj.modifiers.new('round-12 detail budget', 'DECIMATE')
        modifier.decimate_type = 'COLLAPSE'
        modifier.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)

normalize_picture_coordinates()
merge_meshes_by_story_part()
trim_patience_detail()

# One neutral mid-tone floor supports review only; it is never exported.

def camera(name, location, target, lens=55):
    data=bpy.data.cameras.new(name); cam=bpy.data.objects.new(name,data); scene.collection.objects.link(cam)
    cam.location=gv(location); direction=gv(target)-cam.location; cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler(); data.lens=lens
    return cam

def add_lighting():
    world=bpy.data.worlds.new('bright overcast sky') if not bpy.data.worlds else bpy.data.worlds[0]
    world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.70,1); world.node_tree.nodes['Background'].inputs[1].default_value=.8; scene.world=world
    data=bpy.data.lights.new('even daylight','SUN'); light_obj=bpy.data.objects.new('even daylight',data); scene.collection.objects.link(light_obj)
    light_obj.location=gv((20,70,-390)); data.energy=2.0; data.angle=math.radians(18)
    light_obj.rotation_euler=(gv((0,-2,-440))-light_obj.location).to_track_quat('-Z','Y').to_euler()

def render_imported_review():
    # Export first, clear the authored scene, then import exactly the GLB under review.
    # The distant review view needs no projection above 512 px, which keeps the
    # complete family within the packed GLB budget.
    for image in bpy.data.images:
        if image.source == 'FILE' and max(image.size) > 512:
            scale=512/max(image.size)
            image.scale(max(1,round(image.size[0]*scale)),
                        max(1,round(image.size[1]*scale)))
            image.pack()
    town.export_glb(out)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    review_scene = bpy.context.scene
    review_scene.render.engine = 'BLENDER_EEVEE_NEXT'
    review_scene.render.resolution_x, review_scene.render.resolution_y = (960, 600)
    review_scene.render.resolution_percentage = 100
    review_scene.render.image_settings.file_format = 'JPEG'
    review_scene.render.image_settings.quality = 88
    review_scene.render.film_transparent = False
    review_scene.view_settings.view_transform = 'Standard'
    review_scene.view_settings.look = 'Medium High Contrast'
    review_scene.view_settings.exposure = 0
    review_scene.view_settings.gamma = 1
    review_scene.world = bpy.data.worlds.new('flat overcast review sky')
    review_scene.world.use_nodes = True
    review_scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.48, .50, .52, 1)
    review_scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
    bpy.ops.import_scene.gltf(filepath=str(out))
    exported_objects = list(review_scene.objects)
    exported_meshes = [obj for obj in exported_objects if obj.type == 'MESH']
    triangle_count = sum(len(poly.vertices) - 2 for obj in exported_meshes for poly in obj.data.polygons)
    glb_bytes = out.stat().st_size

    bpy.ops.mesh.primitive_plane_add(size=1200, location=gv((0, -2.0, -440)))
    ground = bpy.context.object
    ground.name = 'review-only neutral lake bed'
    ground.data.materials.append(next(mat for mat in bpy.data.materials
                                      if mat.name.startswith('Town / sand')))

    sun_data = bpy.data.lights.new('even daylight', 'SUN')
    sun_data.energy, sun_data.angle = 2.0, math.radians(18)
    sun = bpy.data.objects.new('even daylight', sun_data)
    review_scene.collection.objects.link(sun)
    sun.location = gv((20, 70, -390))
    sun.rotation_euler = (gv((0, -2, -440)) - sun.location).to_track_quat('-Z', 'Y').to_euler()

    def add_camera(name, eye, target, scale, resolution=(1000, 700)):
        data = bpy.data.cameras.new(name)
        cam = bpy.data.objects.new(name, data)
        review_scene.collection.objects.link(cam)
        cam.location = gv(eye)
        cam.rotation_euler = (gv(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        data.type = 'PERSP'
        data.lens = 35
        review_scene.render.resolution_x, review_scene.render.resolution_y = resolution
        return cam

    add_camera('review-camera-whole', (-35, 1.2, -330), (5, 4, -440), 120, (1200, 900))
    review_scene.objects['review-camera-whole'].data.lens = 24
    add_camera('review-camera-hope', (-73, 1.2, -444), (-45, 4, -415), 18, (1200, 900))
    add_camera('review-camera-marigold', (70, 1.2, -470), (45, 4, -440), 18, (1200, 900))
    add_camera('review-camera-patience', (-23, 1.2, -500), (5, 4, -470), 18, (1200, 900))
    add_camera('review-camera-above', (5, 150, -440), (5, 3, -440), 150, (1200, 900))
    add_camera('review-camera-deck-good-hope', (-45, 5.7, -430), (-45, 8.5, -415), 32, (1200, 900))
    add_camera('review-camera-deck-marigold', (45, 5.7, -455), (45, 8.5, -440), 32, (1200, 900))
    add_camera('review-camera-lighthouse-road', (194, 1.2, -426), (170, 13, -395), 40, (900, 1200))
    add_camera('review-camera-lighthouse-dusk', (194, 1.2, -426), (170, 13, -395), 40, (900, 1200))
    # From the back of the first landing, across the boards to the drawings and window.
    landing_camera=add_camera('review-camera-lighthouse-landing', (170.4, 9.6, -393.1), (169.85, 9.05, -398.2), 14, (900, 900))
    landing_camera.data.lens=24
    above_camera=add_camera('review-camera-lighthouse-above',(192.5,40.3,-395),(170,13.5,-395),35,(900,900))
    above_camera.data.lens=35

    raw.mkdir(parents=True, exist_ok=True)
    review_scene.camera = review_scene.objects['review-camera-whole']
    bpy.ops.wm.save_as_mainfile(filepath=str(raw / 'review.blend'))
    print(json.dumps({'glb': str(out), 'glb_bytes': glb_bytes,
                      'triangles': triangle_count, 'views_ready': 6,
                      'review_file': str(raw / 'review.blend')}))

def write_ship_fit():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    records = []
    for ident in ('ship-patience', 'ship-good-hope', 'ship-marigold'):
        candidates = {
            'hull': bpy.data.objects.get(ident + ':hull'),
            'deck plate': next((obj for obj in scene.objects
                                if obj.get('part') == ident + ':deck'), None),
            'cabins': bpy.data.objects.get(ident + ':upperworks'),
        }
        if ident == 'ship-patience':
            candidates['hull'] = bpy.data.objects.get('ship-patience:hull')
            candidates['deck plate'] = next((obj for obj in scene.objects
                                             if obj.get('part') == ident + ':deck'), None)
        records.append(ident)
        for label, obj in candidates.items():
            if obj is None:
                records.append(f'  {label}: not present in this stage')
                continue
            evaluated = obj.evaluated_get(depsgraph)
            points = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
            game_points = [(p.x, p.z, -p.y) for p in points]
            minimum = tuple(min(p[i] for p in game_points) for i in range(3))
            maximum = tuple(max(p[i] for p in game_points) for i in range(3))
            records.append(f'  {label}: min={minimum!r} max={maximum!r}')
    fit_path = root / '.qa-dist/fit.txt'
    fit_path.write_text('\n'.join(records) + '\n', encoding='utf-8', newline='\n')
    print(f'Wrote evaluated ship bounds: {fit_path}')

# A real +Y-up, metre-scale scene, with one named root per story place.
scene.camera=None
write_ship_fit()
render_imported_review()
