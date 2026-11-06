"""WW-ART-WHITES: the works platform, salt pan and loose salt heap.

Rebuild with Blender 4.5: blender -b --python tools/blender/rail-whites.py -- --root <repo>
All measurements use the photo_model kit in glTF metres, X right, Y up, Z toward camera.
"""
import argparse
import json
import math
import struct
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--through', choices=('works-platform', 'salt-pan', 'salt-heap', 'dead-conveyor',
                                          'canteen', 'school-hut', 'pay-office', 'vane-fence'),
                    default='vane-fence')
parser.add_argument('--render-dir', default='.qa-dist/ww-art-whites')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
recipe = root / 'tools/blender/rail-whites.py'
blend = root / 'art-build/rail/whites.blend'
glb = root / 'public/assets/models/wasteland/rail/whites.glb'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
textures = root / 'public/assets/models/wasteland/rail/textures'

if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)]}))
    sys.exit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(recipe.parent))
import town_base as town
from photo_model import Mesh, Photo, box, lathe, slab, tidy, trace

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)

platform_side = Photo(textures / 'whites-platform-side.jpg', frame=(1024, 341))
platform_end = Photo(textures / 'whites-platform-end.jpg', frame=(1024, 683))
clock_photo = Photo(textures / 'whites-clock.jpg')
salt_wall = Photo(textures / 'whites-salt-wall.jpg', frame=(1024, 341))
salt_crust = Photo(textures / 'whites-cracked-salt.jpg')

def fitted_photo(path, max_dimension=1024):
    photo = Photo(path)
    width, height = photo.image.size
    scale = min(1.0, max_dimension / max(width, height))
    width = max(1, round(width * scale))
    height = max(1, round(height * scale))
    if (width, height) != tuple(photo.image.size):
        photo.image.scale(width, height)
    photo.image_w = photo.w = width
    photo.image_h = photo.h = height
    photo._rgb = None
    return photo

conveyor_photo = fitted_photo(textures / 'dead-conveyor-side.jpg')
hut_photos = {
    'canteen': (fitted_photo(textures / 'canteen-side.jpg'), fitted_photo(textures / 'canteen-end.jpg')),
    'school-hut': (fitted_photo(textures / 'school-hut-side.jpg'), fitted_photo(textures / 'school-hut-end.jpg')),
    'pay-office': (fitted_photo(textures / 'pay-office-side.jpg'), fitted_photo(textures / 'pay-office-end.jpg')),
}
fence_photo = fitted_photo(textures / 'vane-fence-side.jpg')
sign_photo = fitted_photo(textures / 'vane-sign.jpg')

# The kit supplies a photo-backed, non-metallic salt surface for the pan crust
# and the heap's cut faces. Its tiled UV scale is two metres per repeat.
town.PALETTE['sand'] = ((.91, .91, .89), 0)
surface_material = town.make_materials({'sand': textures / 'whites-cracked-salt.jpg'})['sand']

objects = {}
stage_order = ('works-platform', 'salt-pan', 'salt-heap', 'dead-conveyor',
               'canteen', 'school-hut', 'pay-office', 'vane-fence')
last_stage = stage_order.index(args.through)

def photo_rect(name, photo, rect):
    return (name, photo, rect)

def build_platform():
    mesh = Mesh()
    mats = {'side': platform_side.material(), 'end': platform_end.material(), 'clock': clock_photo.material()}

    # Side photo is measured across the 20 m platform. The deck is a full metre
    # high and four metres wide, with the canopy above its top.
    def X(px): return (px - 512) * (20 / 970)
    def Y(py): return 1.0 + (247 - py) * .014
    def point(px, py, depth): return (X(px), Y(py), depth)

    side_sky = platform_side.sky(
        [(5, 5), (1018, 5), (1018, 330), (5, 330), (125, 164), (285, 164),
         (462, 164), (652, 180), (790, 212), (930, 170)],
        tolerance=34, grey=26)
    side_solid = tidy(~side_sky, 1)
    mask_image = bpy.data.images.new('station side trace check', 1024, 341, alpha=False)
    mask_pixels = np.ones((341, 1024, 4), dtype=np.float32)
    mask_pixels[:, :, :3] = side_solid[::-1, :, None]
    mask_image.pixels.foreach_set(mask_pixels.ravel())
    mask_image.filepath_raw = str(render_dir / 'works-platform-mask.png')
    mask_image.file_format = 'PNG'
    mask_image.save()
    # The long timber deck and steps are closed, measured boxes with their own
    # photo rectangles on the visible faces.
    box(mesh, X(16), X(1008), 0, 1.0, -2.0, 2.0, {
        '+z': photo_rect('side', platform_side, (20, 260, 1004, 293)),
        '-z': photo_rect('side', platform_side, (20, 260, 1004, 293)),
        '+y': photo_rect('end', platform_end, (275, 365, 757, 432)),
        '-y': photo_rect('side', platform_side, (30, 270, 1000, 289)),
        '+x': photo_rect('side', platform_side, (20, 258, 1004, 293)),
        '-x': photo_rect('side', platform_side, (20, 258, 1004, 293)),
    })
    # Photo-traced timber piers support the low deck at regular intervals.
    for centre in (43, 179, 331, 485, 650, 825, 990):
        loops = trace(side_solid, (centre - 12, 278, centre + 13, 326),
                      tolerance=1.1, min_area=8)
        if loops:
            for z in (-1.48, 1.48):
                slab(mesh, 'side', platform_side, loops, point, z - .09, z + .09,
                     wall_scale=.014)
    platform_start = X(16)
    tread_depth, tread_rise = .32, 1 / 3
    for step in range(3):
        x0 = platform_start - tread_depth * (3 - step)
        x1 = x0 + tread_depth
        y0, y1 = step * tread_rise, (step + 1) * tread_rise
        box(mesh, x0, x1, y0, y1, -1.02, 1.02, {
            '+z': photo_rect('end', platform_end, (350, 535, 675, 590)),
            '-z': photo_rect('end', platform_end, (350, 535, 675, 590)),
            '+y': photo_rect('end', platform_end, (350, 545, 675, 570)),
            '-y': photo_rect('end', platform_end, (360, 580, 660, 602)),
            '+x': photo_rect('end', platform_end, (350, 575, 675, 612)),
            '-x': photo_rect('end', platform_end, (350, 575, 675, 612)),
        })

    # Two thick side stringers carry the treads back into the deck. Their
    # measured end-view projection follows the sloping rails in the photo.
    rail_profile = ((platform_start - .98, .02), (platform_start - .82, .02),
                    (platform_start + .04, .98), (platform_start - .12, .98))
    for zc in (-1.13, 1.13):
        half_z = .09
        front = [(x, y, zc + half_z) for x, y in rail_profile]
        back = [(x, y, zc - half_z) for x, y in rail_profile]
        uv = [platform_end.uv(340, 540), platform_end.uv(390, 540),
              platform_end.uv(635, 625), platform_end.uv(585, 625)]
        mesh.face(front, uv, 'end', (0, 0, 1))
        mesh.face(back, uv, 'end', (0, 0, -1))
        for i in range(4):
            j = (i + 1) % 4
            mesh.face((front[i], back[i], back[j], front[j]),
                      (uv[i], uv[i], uv[j], uv[j]), 'end')

    # Trace the actual canopy outline, then build a thin roof with air below it.
    roof = trace(side_solid, (14, 39, 525, 107), tolerance=1.2, min_area=40)
    for z in (-1.55, 1.55):
        slab(mesh, 'side', platform_side, roof, point, z - .045, z + .045, wall_scale=.014)
    # A shallow formed tin profile crosses the full canopy width. The thin
    # lower skin is separated from the top, leaving an open, readable underside.
    corrugations = 31
    z0, z1 = -1.55, 1.55
    def roof_height(z, underside=False):
        wave = .035 * math.cos(2 * math.pi * (z - z0) / .10)
        crown = .10 * (1 - abs(z) / 1.55)
        return 3.40 + crown + wave - (.07 if underside else 0)
    for i in range(corrugations):
        a = z0 + (z1 - z0) * i / corrugations
        b = z0 + (z1 - z0) * (i + 1) / corrugations
        za, zb = (a, b) if i % 2 == 0 else (b, a)
        for underside in (False, True):
            ya, yb = roof_height(za, underside), roof_height(zb, underside)
            px0, px1 = 18, 516
            py0, py1 = (83 if not underside else 98), (101 if not underside else 105)
            material = 'side'
            mesh.face(((X(px0), ya, a), (X(px1), ya, a),
                       (X(px1), yb, b), (X(px0), yb, b)),
                      (platform_side.uv(px0, py0), platform_side.uv(px1, py0),
                       platform_side.uv(px1, py1), platform_side.uv(px0, py1)),
                      material, (0, -1 if underside else 1, 0))
    # The near end of the canopy has a thin formed fascia. It closes the roof
    # edge in the station end view while the air below stays open.
    box(mesh, X(512) - .055, X(512) + .055, 3.34, 3.50, -1.55, 1.55, {
        '+x': photo_rect('end', platform_end, (320, 75, 700, 150)),
        '-x': photo_rect('end', platform_end, (320, 75, 700, 150)),
    })

    # The narrow iron supports and their curved knees are traced from separate
    # picture crops. Each front/back pair has real depth and meets the roof.
    post_centres = (40, 207, 375, 530)
    for index, centre in enumerate(post_centres):
        loops = trace(side_solid, (max(15, centre - 16), 78, min(522, centre + 17), 247),
                      tolerance=1.0, min_area=14)
        if not loops:
            raise RuntimeError(f'Canopy post {index} was not found in the station photo')
        for z in (-1.49, 1.49):
            slab(mesh, 'side', platform_side, loops, point, z - .055, z + .055,
                 wall_scale=.014)

    # Bench slats, legs and the blank name board use their own measured pieces.
    bench_x = X(291)
    for j in range(3):
        y = 1.08 + j * .16
        box(mesh, bench_x - 1.0, bench_x + 1.0, y, y + .065, -.37, .37, {
            '+z': photo_rect('side', platform_side, (224, 204, 357, 213)),
            '-z': photo_rect('side', platform_side, (224, 204, 357, 213)),
            '+y': photo_rect('side', platform_side, (224, 204, 357, 209)),
        })
    for x in (bench_x - .79, bench_x + .79):
        for z in (-.28, .28):
            box(mesh, x - .05, x + .05, 1.0, 1.38, z - .045, z + .045, {
                '+z': photo_rect('side', platform_side, (224, 214, 236, 236)),
                '-z': photo_rect('side', platform_side, (224, 214, 236, 236)),
            })

    # Side-by-side iron legs support the blank board on its narrow frame.
    sign_centre = X(678)
    sign_x0, sign_x1 = sign_centre - .9, sign_centre + .9
    sign_y0, sign_y1 = Y(188), Y(138)
    box(mesh, sign_x0, sign_x1, sign_y0, sign_y1, -.075, .075, {
        '+z': photo_rect('side', platform_side, (612, 138, 744, 188)),
        '-z': photo_rect('side', platform_side, (612, 138, 744, 188)),
    })
    for x in (sign_x0 + .07, sign_x1 - .07):
        box(mesh, x - .045, x + .045, 1.0, sign_y0 + .10, -.08, .08, {
            '+z': photo_rect('side', platform_side, (612, 188, 623, 253)),
            '-z': photo_rect('side', platform_side, (612, 188, 623, 253)),
        })

    # Transverse iron ties connect the two canopy rows. They meet the posts at
    # each measured frame and keep the open-sided roof stable from the end.
    for centre in post_centres:
        x = X(centre)
        box(mesh, x - .055, x + .055, 3.28, 3.39, -1.50, 1.50, {
            '+z': photo_rect('side', platform_side, (centre - 5, 100, centre + 5, 106)),
            '-z': photo_rect('side', platform_side, (centre - 5, 100, centre + 5, 106)),
            '+y': photo_rect('side', platform_side, (centre - 5, 92, centre + 5, 100)),
        })

    # A deep two-faced clock drum has a rolled iron rim on both sides. The
    # clock photo supplies the numerals only; neither face has hands.
    clock_x = X(868)
    clock_y = 3.25
    clock_z = 1.30
    radius = .82
    radius_px = 484
    centre_px = (512, 512)
    def clock_face(angle, fraction):
        return clock_photo.uv(centre_px[0] + math.cos(angle) * fraction * radius_px * .84,
                              centre_px[1] - math.sin(angle) * fraction * radius_px * .84)
    def clock_edge(index, distance, r, angle):
        # Keep the photograph square to both faces while mapping the edge to
        # its own narrow band from the same worn case photograph.
        return clock_photo.uv(centre_px[0] + math.cos(angle) * radius_px * .97,
                              centre_px[1] - math.sin(angle) * radius_px * .97)
    lathe(mesh, 'clock', (clock_x, clock_y, clock_z), (0, 0, 1), (1, 0, 0), (0, 1, 0),
          [(-.125, radius * .97), (-.105, radius), (.105, radius), (.125, radius * .97)], clock_edge, sides=64,
          cap_start=('clock', clock_face), cap_end=('clock', clock_face))
    # Raised iron beads protect both glass faces and make the quarter-metre
    # case read as a drum from the side.
    for sign in (-1, 1):
        z = .05 + sign * .128
        lathe(mesh, 'clock', (clock_x, clock_y, clock_z + sign * .078), (0, 0, 1), (1, 0, 0), (0, 1, 0),
              [(0, radius * .99), (.014, radius * .99)], clock_edge, sides=64)
    # A substantial post and two short brackets make the clock visible above
    # the platform from car height, with no extra face or hand over the dial.
    post_x = clock_x
    post_z = clock_z
    box(mesh, post_x - .09, post_x + .09, .10, 3.62, post_z - .10, post_z + .10, {
        '+z': photo_rect('side', platform_side, (854, 140, 876, 255)),
        '-z': photo_rect('side', platform_side, (854, 140, 876, 255)),
    })
    box(mesh, post_x - .11, post_x + .11, 3.48, 3.62, post_z - .30, post_z + .30, {
        '+z': photo_rect('side', platform_side, (858, 133, 876, 143)),
        '-z': photo_rect('side', platform_side, (858, 133, 876, 143)),
    })
    box(mesh, post_x - .25, post_x + .25, .10, .22, post_z - .24, post_z + .24, {
        '+z': photo_rect('side', platform_side, (850, 247, 890, 258)),
        '-z': photo_rect('side', platform_side, (850, 247, 890, 258)),
        '+y': photo_rect('side', platform_side, (850, 247, 890, 254)),
    })
    mesh.finish('works-platform', mats)
    objects['works-platform'] = mesh

def build_pan():
    walls = Mesh()
    wall_material = salt_wall.material()
    shader = wall_material.node_tree.nodes.get('Principled BSDF')
    image_node = next(node for node in wall_material.node_tree.nodes if node.type == 'TEX_IMAGE')
    shade = wall_material.node_tree.nodes.new('ShaderNodeMixRGB')
    shade.blend_type = 'MULTIPLY'
    shade.inputs[0].default_value = 1
    shade.inputs[2].default_value = (.70, .68, .63, 1)
    wall_material.node_tree.links.new(image_node.outputs['Color'], shade.inputs[1])
    wall_material.node_tree.links.new(shade.outputs[0], shader.inputs['Base Color'])
    wall_mats = {'wall': wall_material}
    # A 30 m square rim with 40 cm salt-crusted walls. The inset top remains
    # open so the cracked natural salt reads as a pan, not a white box.
    half = 15
    y0, y1 = 0, .4
    t = .40
    wall_rect = (0, 0, 1024, 341)
    for z in (-half + t / 2, half - t / 2):
        box(walls, -half, half, y0, y1, z - t / 2, z + t / 2, {
            '+z': ('wall', salt_wall, wall_rect), '-z': ('wall', salt_wall, wall_rect),
            '+y': ('wall', salt_wall, (0, 0, 1024, 140)),
        })
    for x in (-half + t / 2, half - t / 2):
        box(walls, x - t / 2, x + t / 2, y0, y1, -half, half, {
            '+x': ('wall', salt_wall, wall_rect), '-x': ('wall', salt_wall, wall_rect),
            '+y': ('wall', salt_wall, (0, 0, 1024, 140)),
        })
    walls.finish('salt-pan', wall_mats)
    objects['salt-pan'] = walls

    # Crust repeats at six metres, with neighbouring tiles quarter-turned.
    nx = nz = 80
    verts, faces = [], []
    for i in range(nx + 1):
        x = -half + 2 * half * i / nx
        for j in range(nz + 1):
            z = -half + 2 * half * j / nz
            lift = .014 * math.sin(x * .81 + z * .24) * math.sin(z * .63 - x * .12)
            verts.append((x, .405 + lift, z))
    for i in range(nx):
        for j in range(nz):
            a = i * (nz + 1) + j
            b, c, d = a + nz + 1, a + nz + 2, a + 1
            faces.append((a, d, c, b))
    mesh_data = bpy.data.meshes.new('salt pan cracked crust')
    mesh_data.from_pydata([town.game_vector(vertex) for vertex in verts], [], faces)
    uv_layer = mesh_data.uv_layers.new(name='UVMap')
    for poly in mesh_data.polygons:
        centre_x = sum(mesh_data.vertices[mesh_data.loops[i].vertex_index].co.x for i in poly.loop_indices) / len(poly.loop_indices)
        centre_z = sum(mesh_data.vertices[mesh_data.loops[i].vertex_index].co.y for i in poly.loop_indices) / len(poly.loop_indices)
        tile_x = math.floor((centre_x + half) / 6)
        tile_z = math.floor((centre_z + half) / 6)
        rotate = (tile_x + tile_z) % 2 == 1
        for loop_index in poly.loop_indices:
            vertex = mesh_data.vertices[mesh_data.loops[loop_index].vertex_index].co
            u = (vertex.x + half) / 6 - tile_x
            v = (vertex.y + half) / 6 - tile_z
            if rotate:
                u, v = 1 - v, u
            uv_layer.data[loop_index].uv = (u, v)
        poly.use_smooth = True
    mesh_data.materials.append(surface_material)
    mesh_data.update()
    crust = bpy.data.objects.new('salt-pan-crust', mesh_data)
    bpy.context.collection.objects.link(crust)

def build_heap():
    # Several offset heaps, shoulders and wind-cut gullies combine into one
    # irregular 16 m footprint. A soft falloff buries the edge below the pan.
    radius, height = 8.0, 5.0
    steps = 112
    def smoothstep(v): return v * v * (3 - 2 * v)
    def heap_height(x, z):
        components = (
            (3.75, -1.1, .35, 3.05, 2.55),
            (1.32, 2.55, -1.6, 2.0, 1.65),
            (1.16, -4.4, 1.9, 2.25, 1.20),
            (.82, .5, 3.15, 3.25, .63),
            (.60, 3.7, 2.7, 2.15, .72),
        )
        y = sum(a * math.exp(-(((x-cx)/sx)**2 + ((z-cz)/sz)**2) * 1.15)
                for a, cx, cz, sx, sz in components)
        # Narrow eroded channels cut down the facing slope; their curves do
        # not repeat around the mound like decorative radial grooves.
        for offset, width, depth in ((-1.0, .33, .72), (1.65, .27, .52), (3.1, .38, .45)):
            channel_x = offset + .22 * math.sin(z * .34 + offset)
            y -= depth * math.exp(-((x - channel_x) / width) ** 2) * math.exp(-(z / 6.0) ** 4)
        dist = math.hypot(x / 1.08, z)
        fade = 1 - smoothstep(min(1, max(0, (dist - 6.6) / 1.8)))
        wind_lump = 1 + .045 * math.sin(1.7*x + .8*z) * math.cos(.7*z - .25*x)
        return max(-.18, y * fade * wind_lump - .18)

    verts = []
    faces = []
    for i in range(steps + 1):
        x = -radius + 2 * radius * i / steps
        for j in range(steps + 1):
            z = -radius + 2 * radius * j / steps
            verts.append((x, heap_height(x, z), z))
    stride = steps + 1
    for i in range(steps):
        for j in range(steps):
            a = i * stride + j
            faces.append((a, a + 1, a + stride + 1, a + stride))

    mesh_data = bpy.data.meshes.new('wind-worn cracked salt heap')
    mesh_data.from_pydata([town.game_vector(vertex) for vertex in verts], [], faces)
    uv_layer = mesh_data.uv_layers.new(name='UVMap')
    for poly in mesh_data.polygons:
        for loop_index in poly.loop_indices:
            vertex = verts[mesh_data.loops[loop_index].vertex_index]
            uv_layer.data[loop_index].uv = (vertex[0] / 5, vertex[2] / 5)
        poly.use_smooth = True
    mesh_data.materials.append(surface_material)
    mesh_data.update()
    mound = bpy.data.objects.new('salt-heap', mesh_data)
    bpy.context.collection.objects.link(mound)

def photo_material(name, photo):
    return photo.material()

def build_conveyor():
    photo = conveyor_photo
    w, h = photo.w, photo.h
    sky = photo.sky(((4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5),
                     (360, int(.70*h)), (690, int(.64*h)), (1010, int(.58*h)),
                     (1320, int(.52*h)), (1640, int(.45*h))), tolerance=20, grey=26)
    solid = tidy(~sky, 1)
    x0, x1 = .012 * w, .988 * w
    top, bottom = .13 * h, .82 * h
    def point(px, py, depth):
        x = (px - x0) * (30 / (x1 - x0)) - 15
        y = (bottom - py) * (6 / (bottom - top))
        return (x, y, depth)
    loops = trace(solid, (int(x0), int(top), int(x1), int(bottom)), tolerance=2.4, min_area=14)
    if not loops:
        raise RuntimeError('Dead-conveyor outline did not trace from its side photo')
    mesh = Mesh()
    for depth in (-.50, .50):
        slab(mesh, 'photo', photo, loops, point, depth - .035, depth + .035, wall_scale=.006)
    # Short, exposed rollers bridge the two open side frames. Their positions
    # follow the conveyor slope and their surfaces sample the measured photo.
    def roller_uv(index, distance, radius, angle):
        return photo.uv((distance / 1.0 + 1) * .5 * w,
                        .55 * h - math.sin(angle) * radius * (h / 6))
    roller_count = 46
    for index in range(roller_count):
        x = -14.2 + 28.4 * index / (roller_count - 1)
        y = 1.0 + (x + 14.2) / 28.4 * 4.7
        lathe(mesh, 'photo', (x, y, 0), (0, 0, 1), (1, 0, 0), (0, 1, 0),
              [(-.50, .075), (.50, .075)], roller_uv, sides=8)
    mesh.finish('dead-conveyor', {'photo': photo_material('dead-conveyor', photo)})
    objects['dead-conveyor'] = mesh

HUTS = {
    'canteen': {
        'wall_top': .24, 'roof_cut': .205,
        'side_holes': ((.07,.40,.13,.81),(.20,.40,.26,.56),(.32,.40,.78,.56),(.86,.40,.91,.56)),
        'end_holes': ((.40,.40,.60,.85),),
        'roof': 'mono',
    },
    'school-hut': {
        'wall_top': .31, 'roof_cut': .275,
        'side_holes': ((.43,.39,.56,.84),(.15,.39,.28,.62),(.71,.39,.84,.62)),
        'end_holes': ((.40,.40,.60,.86),),
        'roof': 'gable',
    },
    'pay-office': {
        'wall_top': .30, 'roof_cut': .255,
        'side_holes': ((.78,.38,.90,.85),(.285,.38,.38,.65)),
        'end_holes': ((.40,.33,.60,.89),),
        'roof': 'mono',
    },
}

def cut_rectangles(mask, rects):
    h, w = mask.shape
    for x0, y0, x1, y1 in rects:
        left, right = int(x0 * w), int(x1 * w)
        top, bottom = int(y0 * h), int(y1 * h)
        mask[top:bottom, left:right] = False

def dark_face(mesh, vertices, normal):
    uv = ((0,0),(1,0),(1,1),(0,1))
    mesh.face(vertices, uv, 'inside', normal)

def build_hut(name):
    side, end = hut_photos[name]
    cfg = HUTS[name]
    sw, sh = side.w, side.h
    ew, eh = end.w, end.h
    side_sky = side.sky(((4,4),(sw-5,4),(4,sh-5),(sw-5,sh-5)), tolerance=20, grey=26)
    side_solid = tidy(~side_sky, 1)
    side.bleed(side_solid)
    wall_mask = side_solid.copy()
    wall_mask[:int(cfg['wall_top'] * sh), :] = False
    cut_rectangles(wall_mask, cfg['side_holes'])
    side_bounds = (.025 * sw, cfg['wall_top'] * sh, .975 * sw, .89 * sh)
    def side_point(px, py, depth):
        x = (px - side_bounds[0]) * (8 / (side_bounds[2] - side_bounds[0])) - 4
        y = (side_bounds[3] - py) * (3.5 / (side_bounds[3] - side_bounds[1]))
        return (x, y, depth)
    side_loops = trace(wall_mask, (int(side_bounds[0]), int(side_bounds[1]),
                                   int(side_bounds[2]), int(side_bounds[3])),
                       tolerance=2.1, min_area=20)
    if not side_loops:
        raise RuntimeError(f'{name} side wall did not trace from its photo')

    # The roof remains a separate measured piece, leaving daylight under its
    # lifted edge rather than baking a dark stripe into a solid wall.
    roof_mask = side_solid.copy()
    roof_mask[int(cfg['roof_cut'] * sh):, :] = False
    roof_loops = trace(roof_mask, (int(.015 * sw), 0, int(.985 * sw), int(cfg['roof_cut'] * sh)),
                       tolerance=2.1, min_area=20)

    end_sky = end.sky(((4,4),(ew-5,4),(4,eh-5),(ew-5,eh-5)), tolerance=20, grey=26)
    end_wall = tidy(~end_sky, 1)
    end_wall[:int(.26 * eh), :] = False
    cut_rectangles(end_wall, cfg['end_holes'])
    end_bounds = (.08 * ew, .26 * eh, .92 * ew, .90 * eh)
    def end_point(px, py, depth):
        z = (px - (end_bounds[0] + end_bounds[2]) / 2) * (4.4 / (end_bounds[2] - end_bounds[0]))
        y = (end_bounds[3] - py) * (3.5 / (end_bounds[3] - end_bounds[1]))
        return (depth, y, z)
    end_loops = trace(end_wall, (int(end_bounds[0]), int(end_bounds[1]),
                                 int(end_bounds[2]), int(end_bounds[3])),
                      tolerance=2.1, min_area=20)
    if not end_loops:
        raise RuntimeError(f'{name} end wall did not trace from its photo')

    mesh = Mesh()
    for z0, z1 in ((1.96, 2.08), (-2.08, -1.96)):
        slab(mesh, 'side', side, side_loops, side_point, z0, z1, wall_scale=.006)
        if roof_loops:
            slab(mesh, 'side', side, roof_loops, side_point, z0 - .08, z1 + .08, wall_scale=.006)
    for x0, x1 in ((3.94,4.06),(-4.06,-3.94)):
        slab(mesh, 'end', end, end_loops, end_point, x0, x1, wall_scale=.006)

    # Broad roof sheets bridge the photo-traced eaves. School has a pitched
    # gable; the canteen and pay office use separate shallow shed roofs.
    # A narrow measured tin strip below the sky line paints the roof faces.
    roof_rect = (.08*sw, .205*sh, .92*sw, .245*sh)
    roof_uv = (side.uv(roof_rect[0],roof_rect[1]), side.uv(roof_rect[2],roof_rect[1]),
               side.uv(roof_rect[2],roof_rect[3]), side.uv(roof_rect[0],roof_rect[3]))
    if cfg['roof'] == 'gable':
        for za, zb, ya, yb in ((-2.30,0,3.28,3.58),(0,2.30,3.58,3.28)):
            top = ((-4.12,ya,za),(4.12,ya,za),(4.12,yb,zb),(-4.12,yb,zb))
            low = tuple((x,y-.075,z) for x,y,z in top)
            mesh.face(top, roof_uv, 'side', (0,1,0))
            mesh.face(tuple(reversed(low)), tuple(reversed(roof_uv)), 'side', (0,-1,0))
    else:
        roof = ((-4.12,3.30,-2.30),(4.12,3.30,-2.30),(4.12,3.48,2.30),(-4.12,3.48,2.30))
        lower = tuple((x,y-.075,z) for x,y,z in roof)
        mesh.face(roof, roof_uv, 'side', (0,1,0))
        mesh.face(tuple(reversed(lower)), tuple(reversed(roof_uv)), 'side', (0,-1,0))

    if name == 'school-hut':
        # The bell is measured from the end photograph: a narrow mounting
        # plate beneath the ridge, a flared 0.45 m bell and its clapper.
        px_per_m = .84 * ew / 4.4
        py_per_m = .64 * eh / 3.5
        bell_px, bell_py = .505 * ew, .275 * eh
        bell_x = 4.10
        def bell_uv(index, distance, radius, angle):
            px = bell_px + math.sin(angle) * radius * px_per_m
            py = bell_py + distance * py_per_m
            return end.uv(px, py)
        def bell_cap(angle, fraction):
            return end.uv(bell_px + math.sin(angle) * .20 * px_per_m,
                          bell_py + .39 * py_per_m)
        lathe(mesh, 'end', (bell_x, 3.28, 0), (0, -1, 0), (1, 0, 0), (0, 0, 1),
              ((0, .075), (.055, .10), (.14, .15), (.34, .23), (.40, .22)),
              bell_uv, sides=20, cap_end=('end', bell_cap))
        lathe(mesh, 'end', (bell_x, 2.80, 0), (0, -1, 0), (1, 0, 0), (0, 0, 1),
              ((0, .025), (.07, .025)), bell_uv, sides=12)

    # A matte dark interior plane sits behind the real openings, so a window
    # or doorway has visible depth without a painted black picture on its rim.
    for x0, y0, x1, y1 in cfg['side_holes']:
        xa = (x0 - .025) * 8 / .95 - 4
        xb = (x1 - .025) * 8 / .95 - 4
        ya = (side_bounds[3] - y1 * sh) * (3.5 / (side_bounds[3] - side_bounds[1]))
        yb = (side_bounds[3] - y0 * sh) * (3.5 / (side_bounds[3] - side_bounds[1]))
        dark_face(mesh, ((xa,ya,0),(xb,ya,0),(xb,yb,0),(xa,yb,0)), (0,0,1))
    for x0, y0, x1, y1 in cfg['end_holes']:
        za = (x0 - .5) * 4.4
        zb = (x1 - .5) * 4.4
        ya = (end_bounds[3] - y1 * eh) * (3.5 / (end_bounds[3] - end_bounds[1]))
        yb = (end_bounds[3] - y0 * eh) * (3.5 / (end_bounds[3] - end_bounds[1]))
        dark_face(mesh, ((0,ya,za),(0,ya,zb),(0,yb,zb),(0,yb,za)), (1,0,0))

    if name == 'pay-office':
        x0, y0, x1, y1 = cfg['side_holes'][1]
        xa, xb = (x0-.025)*8/.95-4, (x1-.025)*8/.95-4
        ya = (side_bounds[3] - y1*sh) * (3.5/(side_bounds[3]-side_bounds[1]))
        yb = (side_bounds[3] - y0*sh) * (3.5/(side_bounds[3]-side_bounds[1]))
        for i in range(4):
            x = xa + (xb-xa) * (i+1) / 5
            box(mesh, x-.018, x+.018, ya, yb, 2.03, 2.08,
                {'+z': ('side', side, (int(x0*sw),int(y0*sh),int(x1*sw),int(y1*sh)))})
        box(mesh, xa, xb, (ya+yb)/2-.018, (ya+yb)/2+.018, 2.03, 2.08,
            {'+z': ('side', side, (int(x0*sw),int(y0*sh),int(x1*sw),int(y1*sh)))})

    inside = bpy.data.materials.new(name + ' / dark interior')
    inside.use_nodes = True
    inside.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.012,.014,.014,1)
    inside.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    mesh.finish(name, {'side': side.material(), 'end': end.material(), 'inside': inside})
    objects[name] = mesh

def build_fence():
    photo = fence_photo
    w, h = photo.w, photo.h
    # Transparent photo panels preserve the very fine wire at car height.
    sky = photo.sky(((4,4),(w-5,4),(4,h-5),(w-5,h-5)), tolerance=20, grey=26)
    solid = tidy(~sky, 1)
    x0, x1 = .02*w, .98*w
    y0, y1 = .28*h, .72*h
    rgba = np.empty((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = photo.rgb().astype(np.float32) / 255
    alpha = solid.copy()
    # The clean sign is a separate, unmasked panel and keeps its exact lettering.
    alpha[int(.40*h):int(.55*h), int(.44*w):int(.57*w)] = False
    rgba[:, :, 3] = alpha.astype(np.float32)
    mesh_image = bpy.data.images.new('Vane fence wire with alpha', w, h, alpha=True)
    mesh_image.pixels.foreach_set(rgba[::-1].ravel())
    mesh_image.filepath_raw = str(textures / 'vane-fence-wire-alpha.png')
    mesh_image.file_format = 'PNG'
    mesh_image.save()
    mesh_image.pack()
    wire_mat = bpy.data.materials.new('Vane fence / photo wire mask')
    wire_mat.use_nodes = True
    wire_bsdf = wire_mat.node_tree.nodes['Principled BSDF']
    wire_bsdf.inputs['Metallic'].default_value = 0
    wire_bsdf.inputs['Roughness'].default_value = .9
    tex = wire_mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = mesh_image
    wire_mat.node_tree.links.new(tex.outputs['Color'], wire_bsdf.inputs['Base Color'])
    wire_mat.node_tree.links.new(tex.outputs['Alpha'], wire_bsdf.inputs['Alpha'])
    wire_mat.surface_render_method = 'DITHERED'
    wire_mat.use_transparency_overlap = False
    mesh = Mesh()
    iron = bpy.data.materials.new('Vane fence / narrow rusted iron posts')
    iron.diffuse_color = (.22,.16,.12,1)
    iron.use_nodes = True
    iron.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.22,.16,.12,1)
    iron.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = .2
    iron.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .85
    # Ten 8 cm posts, each bay is one thin photo panel on both sides.
    count = 10
    for i in range(count - 1):
        xa, xb = x0 + (x1-x0)*i/(count-1), x0 + (x1-x0)*(i+1)/(count-1)
        wx0, wx1 = -15 + 30*i/(count-1), -15 + 30*(i+1)/(count-1)
        ya, yb = (y1-y0)*0 + .04, 2.96
        uv = (photo.uv(xa,y1), photo.uv(xb,y1), photo.uv(xb,y0), photo.uv(xa,y0))
        quad = ((wx0,ya,.052),(wx1,ya,.052),(wx1,yb,.052),(wx0,yb,.052))
        mesh.face(quad, uv, 'wire', (0,0,1))
        mesh.face(tuple((x,y,-.052) for x,y,z in reversed(quad)), tuple(reversed(uv)), 'wire', (0,0,-1))
    post_width = .08
    for i in range(count):
        x = -15 + 30*i/(count-1)
        lathe(mesh, 'iron', (x,0,0), (0,1,0), (1,0,0), (0,0,1),
              ((0,post_width/2),(3,post_width/2)),
              lambda index, distance, radius, angle: (index/12, distance/3), sides=12)

    # A small clean photo sign carries the required exact words.
    sign_mat = sign_photo.material()
    box(mesh, -2.35, 2.35, 1.95, 3.02, -.085, .085, {
        '+z': ('sign', sign_photo, (0,0,w,h)),
        '-z': ('sign', sign_photo, (0,0,w,h)),
    })
    mesh.finish('vane-fence', {'wire': wire_mat, 'sign': sign_mat, 'iron': iron})
    objects['vane-fence'] = mesh

build_platform()
if last_stage >= 1:
    build_pan()
if last_stage >= 2:
    build_heap()
if last_stage >= 3:
    build_conveyor()
if last_stage >= 4:
    build_hut('canteen')
if last_stage >= 5:
    build_hut('school-hut')
if last_stage >= 6:
    build_hut('pay-office')
if last_stage >= 7:
    build_fence()

print('TRIANGLES=' + json.dumps({name: mesh.triangles() for name, mesh in objects.items()}))
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)
if last_stage >= 7:
    # The shared exporter defaults to JPEG, which drops texture alpha. Re-export
    # with AUTO so the wire's RGBA PNG is embedded, then make the mask mode explicit.
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_yup=True,
                              export_apply=True, export_materials='EXPORT', export_image_format='AUTO')
    raw = glb.read_bytes()
    offset = 12
    json_bytes = b''
    chunks = []
    while offset < len(raw):
        length, kind = struct.unpack_from('<I4s', raw, offset)
        data = raw[offset+8:offset+8+length]
        chunks.append([kind, data])
        if kind == b'JSON':
            doc = json.loads(data.decode('utf-8').rstrip(' \t\r\n\0'))
            for material in doc.get('materials', []):
                if 'Vane fence / photo wire mask' in material.get('name', ''):
                    material['alphaMode'] = 'MASK'
                    material['alphaCutoff'] = .5
            json_bytes = json.dumps(doc, separators=(',', ':')).encode('utf-8')
            json_bytes += b' ' * ((-len(json_bytes)) % 4)
            chunks[-1][1] = json_bytes
        offset += 8 + length
    output = bytearray(struct.pack('<4sII', b'glTF', 2, 0))
    for kind, data in chunks:
        output.extend(struct.pack('<I4s', len(data), kind))
        output.extend(data)
    struct.pack_into('<I', output, 8, len(output))
    glb.write_bytes(output)

# Review images always come from the exported file imported into an empty scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('flat overcast')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.91, .92, .93, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .8
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = .45
sun.rotation_euler = (math.radians(48), 0, math.radians(32))
scene.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=180, location=(0, 0, -.04))
ground = bpy.context.object
ground.name = 'near-white ground'
ground_mat = bpy.data.materials.new('near-white ground')
ground_mat.diffuse_color = (.87, .88, .89, 1)
ground_mat.use_nodes = True
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.87, .88, .89, 1)
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
ground.data.materials.append(ground_mat)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera)
scene.camera = camera

def shot(piece, name, eye, target, width, height, ortho=None, lens=35):
    for obj in scene.objects:
        if obj.type == 'MESH' and obj.name != 'near-white ground':
            obj.hide_render = not obj.name.startswith(piece)
    scene.render.resolution_x, scene.render.resolution_y = width, height
    eye_v, target_v = town.game_vector(eye), town.game_vector(target)
    camera.location = eye_v
    camera.rotation_euler = (target_v - eye_v).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = ortho
    else:
        camera.data.type = 'PERSP'
        camera.data.lens = lens
    scene.render.filepath = str(render_dir / f'{piece}-{name}.png')
    bpy.ops.render.render(write_still=True)

if last_stage >= 0:
    shot('works-platform', 'side', (0, 2.1, 36), (0, 2.1, 0), 1024, 341, ortho=34)
    shot('works-platform', 'end', (9, 1.55, 0), (0, 1.55, 0), 1024, 683, ortho=6.8)
    shot('works-platform', 'quarter', (8.6, 1.2, 15.0), (0, 2.1, 0), 1500, 650, lens=20)
    shot('works-platform', 'quarter-back', (-8.6, 1.2, -15.0), (0, 2.1, 0), 1500, 650, lens=20)
if last_stage >= 1:
    shot('salt-pan', 'side', (0, 2.1, 37), (0, .35, 0), 1200, 520, ortho=33)
    shot('salt-pan', 'quarter', (16, 1.2, 16), (6, .35, 6), 1100, 720, lens=26)
    shot('salt-pan', 'top', (0, 30, 0), (0, .3, 0), 850, 850, ortho=33)
if last_stage >= 2:
    shot('salt-heap', 'side', (0, 2.4, 17), (0, 2.4, 0), 1536, 512, ortho=18)
    shot('salt-heap', 'quarter', (10.6, 1.2, 10.6), (0, 1.8, 0), 1100, 720, lens=28)
if last_stage >= 3:
    shot('dead-conveyor', 'side', (0, 3.1, 38), (0, 3.1, 0), 1500, 520, ortho=37)
    shot('dead-conveyor', 'quarter', (12, 1.3, 14), (0, 3.0, 0), 1200, 760, lens=18)
for hut in ('canteen', 'school-hut', 'pay-office'):
    if last_stage >= stage_order.index(hut):
        shot(hut, 'side', (0, 1.55, 15), (0, 1.75, 0), 1200, 620, lens=35)
        shot(hut, 'end', (10, 1.65, 0), (0, 1.65, 0), 900, 760, lens=35)
        shot(hut, 'quarter', (9, 1.25, 11), (0, 1.75, 0), 1200, 760, lens=28)
if last_stage >= 7:
    shot('vane-fence', 'side', (0, 1.5, 18), (0, 1.5, 0), 1500, 520, ortho=38)
    shot('vane-fence', 'quarter', (12, 1.3, 14), (0, 1.6, 0), 1200, 760, lens=20)

    # One family view on a shared near-white ground. The eight pieces sit in
    # two rows; each group is centered by its imported GLB bounds.
    names = ('works-platform', 'salt-pan', 'salt-heap', 'dead-conveyor',
             'canteen', 'school-hut', 'pay-office', 'vane-fence')
    for index, piece in enumerate(names):
        def belongs(obj):
            if obj.type != 'MESH':
                return False
            if piece == 'salt-pan':
                return obj.name.startswith(('salt-pan', 'salt pan cracked crust'))
            if piece == 'salt-heap':
                return obj.name.startswith(('salt-heap', 'wind-worn cracked salt heap'))
            return obj.name.startswith(piece)
        members = [obj for obj in scene.objects if belongs(obj)]
        bounds = [obj.matrix_world @ Vector(corner) for obj in members for corner in obj.bound_box]
        if not bounds:
            continue
        target_x = (-57, -19, 19, 57)[index % 4]
        target_y = -10 if index < 4 else 10
        dx = target_x - (min(p.x for p in bounds)+max(p.x for p in bounds))/2
        dy = target_y - (min(p.y for p in bounds)+max(p.y for p in bounds))/2
        dz = .02 - min(p.z for p in bounds)
        for obj in members:
            obj.location += Vector((dx, dy, dz))
            obj.hide_render = False
    scene.render.resolution_x, scene.render.resolution_y = 1800, 650
    camera.location = (0, -100, 62)
    camera.rotation_euler = (Vector((0,0,0)) - camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 158
    scene.render.filepath = str(render_dir / 'family-two-rows.png')
    bpy.ops.render.render(write_still=True)
