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
                                               'port-patience', 'starboard-patience'), default=None)
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
        rotation = subject_root.matrix_world.to_3x3()
        forward = rotation @ Vector((1, 0, 0))
        outboard = rotation @ Vector((0, 1, 0))
        scene.camera.location = target + forward * 28.0 + outboard * (28.0 * side_sign)
        scene.camera.location.z = -1.2
        scene.camera.rotation_euler = (target - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera.data.lens = 20
    if args.render_view == 'whole':
        scene.camera.location = Vector((80, 350, 1.2))
        scene.camera.rotation_euler = (
            Vector((5, 440, 4)) - scene.camera.location
        ).to_track_quat('-Z', 'Y').to_euler()
        scene.camera.data.lens = 18
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

def photo_box(name, center, dims, side, bow, stern, top, part, crops):
    """A crisp photo-projected box; no carving, masks or rounded voxel walls."""
    obj = cube(name, center, dims, steel, part, 0)
    obj.data.materials.clear()
    mats = [side, bow, stern, top]
    for mat in mats:
        obj.data.materials.append(mat)
    uv = obj.data.uv_layers.active
    length, height, width = dims
    images=[next(n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE') for mat in mats]
    for poly in obj.data.polygons:
        n = poly.normal
        if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z):
            mat_index = 1 if n.x > 0 else 2
        elif abs(n.y) >= abs(n.z):
            mat_index = 0
        else:
            mat_index = 3
        poly.material_index = mat_index
        px0,py0,px1,py1=crops[mat_index]
        image_w,image_h=images[mat_index].size
        for li in poly.loop_indices:
            co = obj.data.vertices[obj.data.loops[li].vertex_index].co
            if mat_index == 0:
                across, up = (co.x / length + .5), (co.z / height + .5)
            elif mat_index in (1, 2):
                across, up = (co.y / width + .5), (co.z / height + .5)
            else:
                across, up = (co.y / width + .5), (1 - (co.x / length + .5))
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
        photo_crop_order=[photo_crops[v] for v in ('side','front','rear','top')]
        cabin_root=root_obj(ident+':upperworks',(0,0,0),ident+':upperworks')
        parent(cabin_root,r)
        cabin=photo_box(ident+':upperworks-block',(0,0,0),
                        (cabin_length,cabin_height,cabin_width),
                        photo_mats['side'],photo_mats['front'],photo_mats['rear'],
                        photo_mats['top'],ident+':upperworks',photo_crop_order)
        cabin.location=gv((22.0,deck+cabin_height*.5,0)); parent(cabin,cabin_root)
        roof=photo_box(ident+':upperworks-deck',(0,0,0),
                       (cabin_length+.8,.26,cabin_width+.6),photo_mats['side'],
                       photo_mats['front'],photo_mats['rear'],photo_mats['top'],
                       ident+':upperworks',photo_crop_order)
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
    # The lighthouse is a tapered, photo-projected tower, with access at all three story landings.
    light_root=root_obj('lighthouse',(170,0,-395),'lighthouse')
    N=48; verts=[]; faces=[]
    for level,(y,radius) in enumerate(((-2,5.6),(6,4.8),(14,4.0),(22,3.2),(25.3,3.0))):
        for i in range(N):
            a=i*2*math.pi/N
            verts.append(gv((math.cos(a)*radius,y,math.sin(a)*radius)))
    for level in range(4):
        for i in range(N): faces.append((level*N+i,level*N+(i+1)%N,(level+1)*N+(i+1)%N,(level+1)*N+i))
    mesh=bpy.data.meshes.new('lighthouse tapered masonry'); mesh.from_pydata(verts,[],faces); mesh.materials.append(stone_photo); mesh.materials.append(materials['weathered-plank']); mesh.update()
    tower=bpy.data.objects.new('lighthouse masonry tower',mesh); scene.collection.objects.link(tower); tower['part']='lighthouse'
    uv=mesh.uv_layers.new(name='Photographic front projection')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index; level=vi//N; i=vi%N; x,y=math.cos(i*2*math.pi/N),math.sin(i*2*math.pi/N)
            height=mesh.vertices[vi].co.z
            angle=i*2*math.pi/N
            if math.sin(angle)<-.62:
                uv.data[li].uv=(.5+(x*5.8)/12.0,.02+((height+2)/27.3)*.94)
                poly.material_index=0
            else:
                radius=((5.6,4.8,4.0,3.2,3.0)[level])
                uv.data[li].uv=(angle*radius,.04+height/2)
                poly.material_index=1
    parent(tower,light_root)
    for y,rad in ((8,4.9),(16,3.8),(24,3.05)):
        floor=cylinder(f'lighthouse-landing-{y}',(0,y,0),rad+.7,.28,steel,'lighthouse',48)
        parent(floor,light_root)
        for i in range(24):
            a=i*2*math.pi/24
            beam(f'lighthouse-landing-post-{y}-{i}',(math.cos(a)*(rad+.55),y,math.sin(a)*(rad+.55)),(math.cos(a)*(rad+.55),y+.9,math.sin(a)*(rad+.55)),.055,iron,'lighthouse')
    for i in range(66):
        y=-1.6+i*.38; a=-math.pi/2+i*.135; radius=4.8-(y+2)*.075
        x,z=math.cos(a)*radius,math.sin(a)*radius
        beam(f'lighthouse-spiral-stair-{i}',(x,y,z),(x+math.cos(a+.4)*1.0,y+.20,z+math.sin(a+.4)*1.0),.12,wood,'lighthouse',.8)
    door=cube('lighthouse:door',(0,0,-5.54),(1.8,2.8,.16),wood,'lighthouse',.1); parent(door,light_root)
    step=cube('lighthouse-swept-step',(0,-1.78,-6.1),(3.2,.25,1.1),steel,'lighthouse',.04); parent(step,light_root)
    # Bright drawings and a box on the requested interior landings.
    for i in range(5):
        board=cube(f'lighthouse-gate-drawing-{i}',(-1.8+i*.75,9.2,-4.25),(.58,.76,.04),paint,'lighthouse',.02); parent(board,light_root)
    letters=cube('lighthouse-box-of-letters',(1.6,17,-3.15),(1.05,.65,.72),wood,'lighthouse',.06); parent(letters,light_root)
    lamp_mesh=cylinder('lighthouse:lamp',(0,27.0,0),1.9,2.7,glass,'lighthouse:lamp',40)
    for poly in lamp_mesh.data.polygons: poly.use_smooth=True
    lamp_root=root_obj('lighthouse:lamp',(0,0,0),'lighthouse:lamp'); parent(lamp_root,light_root); parent(lamp_mesh,lamp_root)
    for i in range(8):
        a=i*math.pi/4
        b=beam(f'lighthouse-lantern-mullion-{i}',(math.cos(a)*1.9,25.6,math.sin(a)*1.9),(math.cos(a)*1.9,28.4,math.sin(a)*1.9),.08,iron,'lighthouse:lamp')
        parent(b,lamp_root)
    lightpart=root_obj('lighthouse:beam',(0,0,0),'lighthouse:beam'); parent(lightpart,light_root)
    beam_obj=cube('lighthouse rotating beam',(0,27.2,-5),(1.0,.16,44),lamp,'lighthouse:beam',.03); parent(beam_obj,lightpart)

    # The ridiculous forty-foot pilot boat remains a real, buoyant hull.
    boat=root_obj('pilot-boat',(230,-.8,-430),'pilot-boat')
    boat_dims=(12.2,3.9,2.5,-1.2)
    photo_hull('pilot-boat-floatable-hull',boat,(12.2,3.9,2.5,-1.2),pilot_photo,'')
    boat_hull=bpy.data.objects.get('pilot-boat-floatable-hull')
    # The hull projection crop uses the workboat profile; a pale upper strake keeps its shape readable.
    for side in (-1,1):
        upper=cube(f'pilot-boat-sheer-strake-{side}',(0,1.7,side*1.62),(10.2,.20,.12),steel,'pilot-boat',.05); parent(upper,boat)
        for i in range(7):
            win=cube(f'pilot-boat-cabin-window-{side}-{i}',(-1.8+i*.6,3.05,side*1.41),(.42,.55,.06),glass,'pilot-boat',.04); parent(win,boat)
    house_vertices=[(-2.6,1.65,-1.5),(2.6,1.65,-1.5),(2.6,1.65,1.5),(-2.6,1.65,1.5),
                    (-2.2,3.65,-1.32),(2.0,3.65,-1.32),(2.0,3.65,1.32),(-2.2,3.65,1.32)]
    house_faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    house_mesh=bpy.data.meshes.new('sloped pilot-house panels'); house_mesh.from_pydata([gv(v) for v in house_vertices],[],house_faces); house_mesh.materials.append(boat_paint); house_mesh.update()
    cabin=bpy.data.objects.new('pilot-boat-pilot-house',house_mesh); scene.collection.objects.link(cabin); cabin['part']='pilot-boat'; parent(cabin,boat)
    roof=cube('pilot-boat-cabin-roof',(0,3.72,0),(5.7,.25,3.0),steel,'pilot-boat',.1); parent(roof,boat)
    for side in (-1,1):
        beam(f'pilot-boat-rail-{side}',(-2.8,2.1,side*1.72),(3.8,2.1,side*1.72),.09,steel,'pilot-boat')
    windshield=cube('pilot-boat-forward-windscreen',(2.02,3.05,0),(.07,.78,2.25),glass,'pilot-boat',.06); parent(windshield,boat)
    # A heavy 14 m trailer with eight complete road wheels and spring packs.
    trailer_hitch=root_obj('pilot-boat:hitch',(0,0,0),'pilot-boat:hitch'); parent(trailer_hitch,boat)
    for z in (-1.45,1.45): beam(f'pilot-trailer-long-rail-{z}',(-8,.3,z),(7,.3,z),.28,rust,'pilot-boat')
    for x in (-6,-2,2,6): beam(f'pilot-trailer-crossmember-{x}',(x,.18,-1.55),(x,.18,1.55),.22,steel,'pilot-boat')
    hitch=beam('pilot-trailer-hitch',(7,.48,0),(11,.5,0),.24,steel,'pilot-boat:hitch'); parent(hitch,trailer_hitch)
    for side in (-1,1):
        for i,x in enumerate((-4,-1,2,5)):
            z=side*1.72
            tor=torus(f'pilot-trailer-road-tyre-{side}-{i}',(x,-.14,z),.72,.24,iron,'pilot-boat','Z')
            for k in range(8):
                a=k*2*math.pi/8
                lug=cube(f'pilot-tyre-lug-{side}-{i}-{k}',(x+.88*math.cos(a),-.14+.88*math.sin(a),z),(.23,.18,.55),iron,'pilot-boat',0)
            hub=cylinder(f'pilot-wheel-hub-{side}-{i}',(x,-.14,z+side*.24),.30,.15,steel,'pilot-boat',20,'Z')
            for spring in range(3):
                beam(f'pilot-leaf-spring-{side}-{i}-{spring}',(x-1,-.05-spring*.10,z),(x+1,-.05-spring*.10,z),.10,rust,'pilot-boat',.08)

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
                    x=center_x+v*(4.0 if mound_index==0 else 3.0)
                    z=side*(inner+8*u)
                    y=-2+1.4*(math.cos(math.pi*u/2)**1.4)*(math.cos(math.pi*v/2)**1.6)
                    verts.append(gv((x,y,z)))
            for ai in range(along_steps-1):
                for oi in range(out_steps-1):
                    a=start+ai*out_steps+oi; b=a+out_steps
                    faces.append((a,b,b+1,a+1) if side>0 else (a,a+1,b+1,b))
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
    segments=48; rings=8; verts=[gv((x,-1.78,z))]; faces=[]
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
