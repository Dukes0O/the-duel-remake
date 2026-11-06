"""WW-ART-WHITES: the works platform, salt pan and loose salt heap.

Rebuild with Blender 4.5: blender -b --python tools/blender/rail-whites.py -- --root <repo>
All measurements use the photo_model kit in glTF metres, X right, Y up, Z toward camera.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--through', choices=('works-platform', 'salt-pan', 'salt-heap'), default='salt-heap')
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
from photo_model import Mesh, Photo, box, fill, inside, lathe, slab, tidy, trace

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)

platform_side = Photo(textures / 'whites-platform-side.jpg', frame=(1024, 341))
platform_end = Photo(textures / 'whites-platform-end.jpg', frame=(1024, 683))
clock_photo = Photo(textures / 'whites-clock.jpg')
salt_wall = Photo(textures / 'whites-salt-wall.jpg', frame=(1024, 341))
salt_crust = Photo(textures / 'whites-cracked-salt.jpg')
heap_photo = Photo(textures / 'whites-salt-heap.jpg', frame=(1024, 341))

# The kit supplies a photo-backed, non-metallic salt surface for the pan crust
# and the heap's cut faces. Its tiled UV scale is two metres per repeat.
town.PALETTE['sand'] = ((.91, .91, .89), 0)
surface_material = town.make_materials({'sand': textures / 'whites-cracked-salt.jpg'})['sand']

objects = {}
stage_order = ('works-platform', 'salt-pan', 'salt-heap')
last_stage = stage_order.index(args.through)

def photo_rect(name, photo, rect):
    return (name, photo, rect)

def build_platform():
    mesh = Mesh()
    mats = {'side': platform_side.material(), 'end': platform_end.material(), 'clock': clock_photo.material()}

    # Side photo is measured across the full platform. The deck is a full metre
    # high and four metres wide, with the canopy above its top.
    def X(px): return (px - 512) * (30 / 970)
    def Y(py): return .65 + (260 - py) * .014
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
        '+x': photo_rect('end', platform_end, (130, 535, 892, 652)),
        '-x': photo_rect('end', platform_end, (130, 535, 892, 652)),
    })
    # Photo-traced timber piers support the low deck at regular intervals.
    for centre in (43, 179, 331, 485, 650, 825, 990):
        loops = trace(side_solid, (centre - 12, 278, centre + 13, 326),
                      tolerance=1.1, min_area=8)
        if loops:
            for z in (-1.48, 1.48):
                slab(mesh, 'side', platform_side, loops, point, z - .09, z + .09,
                     wall_scale=.014)
    for step in range(3):
        x0, x1 = X(17 + step * 12), X(30 + step * 12)
        y0, y1 = .08 + step * .14, .22 + step * .14
        box(mesh, x0, x1, y0, y1, -1.54, 1.54, {
            '+z': photo_rect('side', platform_side, (18, 250, 80, 276)),
            '-z': photo_rect('side', platform_side, (18, 250, 80, 276)),
            '+y': photo_rect('end', platform_end, (220, 372, 810, 406)),
            '-y': photo_rect('side', platform_side, (20, 272, 80, 286)),
        })

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
        y = .94 + j * .16
        box(mesh, bench_x - 1.0, bench_x + 1.0, y, y + .065, -.37, .37, {
            '+z': photo_rect('side', platform_side, (224, 204, 357, 213)),
            '-z': photo_rect('side', platform_side, (224, 204, 357, 213)),
            '+y': photo_rect('side', platform_side, (224, 204, 357, 209)),
        })
    for x in (bench_x - .79, bench_x + .79):
        for z in (-.28, .28):
            box(mesh, x - .05, x + .05, .58, .97, z - .045, z + .045, {
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
        box(mesh, x - .045, x + .045, .65, sign_y0 + .10, -.08, .08, {
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

    # The station clock's case is a measured lathe with its dead-on face photo.
    # Its cap is the only face using this image; there are no hands in the source.
    clock_x = X(868)
    clock_y = 3.25
    radius = .82
    radius_px = 484
    centre_px = (512, 512)
    def clock_face(angle, fraction):
        return clock_photo.uv(centre_px[0] + math.cos(angle) * fraction * radius_px * .84,
                              centre_px[1] - math.sin(angle) * fraction * radius_px * .84)
    def clock_edge(index, distance, r, angle):
        return clock_photo.uv(centre_px[0] + math.cos(angle) * radius_px * .84,
                              centre_px[1] - math.sin(angle) * radius_px * .84)
    lathe(mesh, 'clock', (clock_x, clock_y, .05), (0, 0, 1), (1, 0, 0), (0, 1, 0),
          [(0, radius), (.105, radius), (.13, radius * .94)], clock_edge, sides=64,
          cap_start=('clock', clock_face), cap_end=('clock', clock_face))
    # A substantial post and two short brackets make the clock visible above
    # the platform from car height, with no extra face or hand over the dial.
    post_x = clock_x
    box(mesh, post_x - .09, post_x + .09, .62, 3.62, -.10, .10, {
        '+z': photo_rect('side', platform_side, (854, 140, 876, 255)),
        '-z': photo_rect('side', platform_side, (854, 140, 876, 255)),
    })
    box(mesh, post_x - .11, post_x + .11, 3.48, 3.62, -.30, .30, {
        '+z': photo_rect('side', platform_side, (858, 133, 876, 143)),
        '-z': photo_rect('side', platform_side, (858, 133, 876, 143)),
    })
    mesh.finish('works-platform', mats)
    objects['works-platform'] = mesh

def build_pan():
    walls = Mesh()
    wall_mats = {'wall': salt_wall.material()}
    # A 30 m square rim with 40 cm salt-crusted walls. The inset top remains
    # open so the cracked natural salt reads as a pan, not a white box.
    half = 15
    y0, y1 = 0, .4
    t = .38
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

    # A modestly uneven crust follows true-size two-metre texture repeats.
    nx = nz = 80
    verts, faces, uvs = [], [], []
    for i in range(nx + 1):
        x = -half + 2 * half * i / nx
        for j in range(nz + 1):
            z = -half + 2 * half * j / nz
            lift = .014 * math.sin(x * .81 + z * .24) * math.sin(z * .63 - x * .12)
            verts.append((x, .405 + lift, z))
            uvs.append((x / 2, z / 2))
    for i in range(nx):
        for j in range(nz):
            a = i * (nz + 1) + j
            b, c, d = a + nz + 1, a + nz + 2, a + 1
            faces.append((a, d, c, b))
    mesh_data = bpy.data.meshes.new('salt pan cracked crust')
    mesh_data.from_pydata([town.game_vector(vertex) for vertex in verts], [], faces)
    uv_layer = mesh_data.uv_layers.new(name='UVMap')
    for poly in mesh_data.polygons:
        for loop_index in poly.loop_indices:
            uv_layer.data[loop_index].uv = uvs[mesh_data.loops[loop_index].vertex_index]
        poly.use_smooth = True
    mesh_data.materials.append(surface_material)
    mesh_data.update()
    crust = bpy.data.objects.new('salt-pan-crust', mesh_data)
    bpy.context.collection.objects.link(crust)

def build_heap():
    mesh = Mesh()
    # Read the mound's broad, uneven side profile from its own photograph.
    # The same camera plane drives UVs, so the exported face keeps the measured
    # outline and the photo detail without tiled swatches.
    pixels = heap_photo.rgb().astype(np.float32)
    luminance = pixels.mean(axis=2)
    horizontal_kernel = np.ones(9, dtype=np.float32) / 9
    horizontal = np.stack([
        np.convolve(np.pad(luminance[y], (4, 4), mode='edge'), horizontal_kernel, mode='valid')
        for y in range(heap_photo.h)
    ])
    blurred = np.stack([
        np.convolve(np.pad(horizontal[:, x], (3, 3), mode='edge'),
                    np.ones(7, dtype=np.float32) / 7, mode='valid')
        for x in range(heap_photo.w)
    ], axis=1)
    baseline = 238
    background = np.median(blurred[20:55], axis=0)
    top_rows = np.full(heap_photo.w, baseline, dtype=np.float32)
    for x in range(heap_photo.w):
        foreground = np.flatnonzero(np.abs(blurred[55:baseline, x] - background[x]) > 10)
        if foreground.size:
            top_rows[x] = foreground[0] + 55
    raw_top_rows = top_rows.copy()
    for x in range(heap_photo.w):
        top_rows[x] = np.median(raw_top_rows[max(0, x - 15):min(heap_photo.w, x + 16)])

    # The mound spans about four-fifths of this 18 m photo frame, matching
    # the 14 m width named in its reference prompt.
    photo_width = 18.0
    metres_per_pixel = photo_width / heap_photo.w
    outline = [(0, baseline)]
    outline.extend((x, float(top_rows[x])) for x in range(0, heap_photo.w, 6))
    outline.append((heap_photo.w - 1, baseline))

    def place(px, py, depth):
        x = (px - heap_photo.w / 2) * metres_per_pixel
        y = (baseline - py) * metres_per_pixel
        return (x, y, depth)

    # Keep the measured photo projection on the front. Each rear outline sits
    # lower and narrower, so the cut edges form a sloped heap in quarter view.
    layers = []
    for depth, width_scale, height_scale in (
        (3.2, 1.0, 1.0), (1.2, .94, .82), (-.8, .82, .62),
        (-2.4, .67, .42), (-3.2, .55, .24),
    ):
        layer = []
        for px, py in outline:
            x = (px - heap_photo.w / 2) * metres_per_pixel * width_scale
            y = (baseline - py) * metres_per_pixel * height_scale
            layer.append(mesh.vertex((x, y, depth)))
        layers.append((depth, width_scale, height_scale, layer))

    for triangle in fill([outline]):
        points = [place(px, py, layers[0][0]) for px, py in triangle]
        mesh.face(points, [heap_photo.uv(px, py) for px, py in triangle],
                  'heap-photo', Vector((0, 0, 1)))
        back_points = []
        for px, py in triangle:
            x = (px - heap_photo.w / 2) * metres_per_pixel * layers[-1][1]
            y = (baseline - py) * metres_per_pixel * layers[-1][2]
            back_points.append((x, y, layers[-1][0]))
        back_uvs = [(point[0] / 2, point[1] / 2) for point in back_points]
        mesh.face(back_points, back_uvs, 'salt', Vector((0, 0, -1)))

    for near, far in zip(layers, layers[1:]):
        near_ring, far_ring = near[3], far[3]
        for edge_index, (a, b) in enumerate(zip(outline, outline[1:] + outline[:1])):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            if length == 0:
                continue
            nx, ny = -dy / length, dx / length
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            if not inside((mid[0] + nx * .6, mid[1] + ny * .6), [outline]):
                nx, ny = -nx, -ny
            outward = Vector(place(mid[0] - nx, mid[1] - ny, near[0])) - Vector(
                place(mid[0], mid[1], near[0]))
            next_index = (edge_index + 1) % len(outline)
            face_indices = (near_ring[edge_index], near_ring[next_index],
                            far_ring[next_index], far_ring[edge_index])
            salt_uvs = [(mesh.verts[index][2] / 2, mesh.verts[index][1] / 2)
                        for index in face_indices]
            mesh.indexed(face_indices, salt_uvs, 'salt', outward)
    mesh.finish('salt-heap', {'salt': surface_material, 'heap-photo': heap_photo.material()})
    objects['salt-heap'] = mesh

build_platform()
if last_stage >= 1:
    build_pan()
if last_stage >= 2:
    build_heap()

print('TRIANGLES=' + json.dumps({name: mesh.triangles() for name, mesh in objects.items()}))
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)

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
    shot('works-platform', 'side', (0, 2.1, 36), (0, 2.1, 0), 1400, 470, ortho=34)
    shot('works-platform', 'end', (9, 2.1, 0), (0, 2.1, 0), 850, 720, ortho=5.5)
    shot('works-platform', 'quarter', (8.6, 1.2, 15.0), (3.5, 2.1, 0), 1500, 650, lens=17)
if last_stage >= 1:
    shot('salt-pan', 'side', (0, 2.1, 37), (0, .35, 0), 1200, 520, ortho=33)
    shot('salt-pan', 'quarter', (10.6, 1.2, 10.6), (0, .35, 0), 1100, 720, lens=12)
    shot('salt-pan', 'top', (0, 30, 0), (0, .3, 0), 850, 850, ortho=33)
if last_stage >= 2:
    shot('salt-heap', 'side', (0, 2.4, 17), (0, 2.4, 0), 1536, 512, ortho=18)
    shot('salt-heap', 'quarter', (10.6, 1.2, 10.6), (0, 1.8, 0), 1100, 720, lens=28)
