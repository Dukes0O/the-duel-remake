"""WW-ART-RAIL small railway props and lost-property cargo.

Photos are the measured source for every outline.  All regular pieces use the
photo-model silhouette and its real, shallow thickness.  The toy car uses the
four-view hull method because its body curves in every direction.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.qa-dist/ww-art-rail-round-8')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
textures = root / 'public/assets/models/wasteland/rail/textures'
glb = root / 'public/assets/models/wasteland/rail/rail-props.glb'
blend = root / 'art-build/rail/rail-props.blend'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(root / 'tools/blender'))
from photo_model import Mesh, Photo, shrink, slab, tidy, trace
from hull_model import View, occupancy, largest_part, carve_hull
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
blend.parent.mkdir(parents=True, exist_ok=True)
render_dir.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
root_obj = bpy.data.objects.new('rail-props', None)
scene.collection.objects.link(root_obj)
parts = {}
triangles = {}

PROP_SPECS = [
    ('token-ring', 'token-ring.jpg', 'A brass single-line token on its cane and leather hoop.', 'height', .60, .055),
    ('hook-and-ladle', 'hook-and-ladle.jpg', "Old Tam's kitchen wall patch with token ring and ladle.", 'width', .60, .08),
    ('pim-mark', 'pim-mark.jpg', 'Scuffed white platform mark on a post.', 'height', 1.50, .06),
    ('brake-board', 'brake-board.jpg', 'Worn black-and-white hazard board on its post.', 'height', 2.00, .06),
    ('sand-drag', 'sand-drag.jpg', 'Photo-measured rails, sleepers, sand ridge and timber stop.', 'width', 15.0, .08),
    ('branch-post', 'branch-post.jpg', 'Salt-bleached lineside post and blank iron plate.', 'height', 2.00, .06),
    ('bare-lever', 'bare-lever.jpg', 'Rusted points lever with its frame and sand mound.', 'height', 1.20, .08),
    ('case-chalk', 'case-chalk.jpg', 'Open box of chalk sticks.', 'height', .34, .05),
    ('case-coffee', 'case-coffee.jpg', 'Old coffee tin.', 'height', .34, .05),
    ('case-magnet', 'case-magnet.jpg', 'Small horseshoe magnet with its paper tag.', 'height', .28, .05),
    ('case-punch', 'case-punch.jpg', 'Old ticket punch.', 'height', .29, .05),
    ('case-books', 'case-books.jpg', 'Two old sums books tied with string.', 'height', .30, .05),
    ('case-teeth', 'case-teeth.jpg', 'Jam jar of milk teeth with its lid.', 'height', .30, .05),
    ('case-gloves', 'case-gloves.jpg', 'Pair of old forge gloves.', 'height', .28, .05),
    ('case-megaphone', 'case-megaphone.jpg', 'Rolled paper megaphone.', 'height', .28, .05),
    ('case-umbrella', 'case-umbrella.jpg', 'The clean, furled black umbrella.', 'height', .82, .05),
    ('case-hollis', 'case-fourteen.jpg', 'Hollis’s battered suitcase with its number 14 label.', 'height', .30, .05),
]

def silhouette_prop(name, filename, description, axis, target, depth):
    photo = Photo(textures / filename)
    # Keep the original 1K reference on disk; the packed GLB needs smaller
    # pictures because these props are viewed from a car, not close up.
    photo.image.scale(768, max(1, round(photo.image_h * 768 / photo.image_w)))
    photo.image_w, photo.image_h = photo.image.size
    photo._rgb = None
    seeds = [(8, 8), (photo.w - 9, 8), (8, photo.h - 9), (photo.w - 9, photo.h - 9)]
    shadow_seeds = {
        'case-books': (500, 960),
        'case-teeth': (800, 970),
        'case-megaphone': (700, 980),
        'case-hollis': (500, 970),
    }
    if name in shadow_seeds:
        seeds.append(shadow_seeds[name])
    if name == 'token-ring':
        # The open centre between the leather hanger and brass token is sky.
        seeds.append((576, 350))
    if name in ('case-books', 'case-teeth', 'case-megaphone', 'case-hollis'):
        # The shadow seeds remove the connected pale fringe without cutting
        # the photographed object into a jagged outline.
        outline_shrink = 1
    else:
        outline_shrink = 1
    solid = shrink(tidy(~photo.sky(seeds, tolerance=20, grey=26), passes=2),
                   passes=outline_shrink)
    rows = np.minimum((np.arange(photo.image_h) * solid.shape[0] / photo.image_h).astype(int), solid.shape[0] - 1)
    cols = np.minimum((np.arange(photo.image_w) * solid.shape[1] / photo.image_w).astype(int), solid.shape[1] - 1)
    photo.bleed(solid[rows][:, cols], passes=18)
    loops = trace(solid, (0, 0, photo.w, photo.h), tolerance=1.7, min_area=16)
    points = [p for loop in loops for p in loop]
    if not points:
        raise ValueError(f'{name}: photo mask has no subject')
    x0 = min(p[0] for p in points); x1 = max(p[0] for p in points)
    y0 = min(p[1] for p in points); y1 = max(p[1] for p in points)
    span_x, span_y = x1 - x0, y1 - y0
    scale = target / (span_x if axis == 'width' else span_y)
    def to_world(px, py, d):
        return ((px - (x0 + x1) * .5) * scale,
                (y1 - py) * scale,
                d)
    mesh = Mesh()
    slab(mesh, name, photo, loops, to_world, -depth / 2, depth / 2,
         wall_scale=scale)
    obj = mesh.finish(name, {name: photo.material()})
    obj.parent = root_obj
    parts[name] = obj
    mesh.calc = None
    triangles[name] = mesh.triangles()
    return obj

for spec in PROP_SPECS:
    if spec[0] != 'sand-drag':
        silhouette_prop(*spec)

def sand_drag_box(mesh, name, center, size, photo, rect):
    """Make one thick, photo-textured block from a measured source rectangle."""
    x, y, z = center
    sx, sy, sz = size
    x0, x1 = x - sx / 2, x + sx / 2
    y0, y1 = y - sy / 2, y + sy / 2
    z0, z1 = z - sz / 2, z + sz / 2
    px0, py0, px1, py1 = rect
    uv = [photo.uv(px0, py0), photo.uv(px1, py0),
          photo.uv(px1, py1), photo.uv(px0, py1)]
    faces = (
        ([(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)], (0,0,1)),
        ([(x1,y0,z0),(x0,y0,z0),(x0,y1,z0),(x1,y1,z0)], (0,0,-1)),
        ([(x1,y0,z1),(x1,y0,z0),(x1,y1,z0),(x1,y1,z1)], (1,0,0)),
        ([(x0,y0,z0),(x0,y0,z1),(x0,y1,z1),(x0,y1,z0)], (-1,0,0)),
        ([(x0,y1,z1),(x1,y1,z1),(x1,y1,z0),(x0,y1,z0)], (0,1,0)),
        ([(x0,y0,z0),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1)], (0,-1,0)),
    )
    for points, normal in faces:
        mesh.face(points, uv, 'source', normal)

def build_sand_drag():
    """A 15 m feathered sand ridge with the photographed rail and timber stop."""
    photo = Photo(textures / 'sand-drag.jpg')
    material = photo.material()
    width, length = 8.0, 15.0
    x0, x1, z0, z1 = -width / 2, width / 2, -length / 2, length / 2

    def smooth(t):
        t = min(1, max(0, t))
        return t * t * (3 - 2 * t)

    def drift_height(x, z):
        # A rounded ridge rises from the far end, reaches 1.5 m, and feathers
        # back to the track. Its width tapers to zero at both sides.
        if z <= -1.5:
            along = smooth((z - z0) / (length * .40))
        else:
            along = (1 - smooth((z + 1.5) / (length * .60))) ** 1.15
        across = 1 - smooth((abs(x) - width * .29) / (width * .21))
        ripple = .035 * math.sin(x * 1.7 + z * .45) + .022 * math.sin(x * .8 - z * 1.1)
        return max(0.0, 1.5 * along * max(0.0, across) + ripple * along * across)

    sand = Mesh()
    nx, nz = 40, 64
    rows = []
    for i in range(nx + 1):
        row = []
        x = x0 + width * i / nx
        for j in range(nz + 1):
            z = z0 + length * j / nz
            height = drift_height(x, z)
            index = sand.vertex((x, height, z))
            # The measured sand region in the source image fills the terrain.
            uv = photo.uv(590 + (x - x0) / width * 420,
                          185 + (z - z0) / length * 135)
            row.append((index, uv))
        rows.append(row)
    for i in range(nx):
        for j in range(nz):
            a, ua = rows[i][j]
            b, ub = rows[i + 1][j]
            c, uc = rows[i + 1][j + 1]
            d, ud = rows[i][j + 1]
            sand.indexed((a,b,c,d), (ua,ub,uc,ud), 'source', (0,1,0), True)
    root = sand.finish('sand-drag', {'source': material})
    root.parent = root_obj
    parts['sand-drag'] = root
    components = [root]

    # The track ends against a heavy crosswise stop block at the front of the
    # ridge. Each member has true thickness and uses a measured picture crop.
    timber_rect = (826, 136, 875, 246)
    rail_rect = (350, 169, 540, 205)
    sleeper_rect = (290, 190, 420, 240)
    track = Mesh()
    for x in (-.72, .72):
        sand_drag_box(track, 'rail', (x,.12,4.0), (.10,.16,7.3), photo, rail_rect)
    track_obj = track.finish('sand-drag-rails', {'source': material})
    track_obj.parent = root
    components.append(track_obj)

    sleepers = Mesh()
    for z in (6.8,6.2,5.6,5.0,4.4,3.8,3.2,2.6,2.0,1.4,.8,.2):
        sand_drag_box(sleepers, 'sleeper', (0,.065,z), (1.75,.13,.22), photo, sleeper_rect)
    sleeper_obj = sleepers.finish('sand-drag-sleepers', {'source': material})
    sleeper_obj.parent = root
    components.append(sleeper_obj)

    stop = Mesh()
    sand_drag_box(stop, 'stop-block', (0,.25,-.02), (2.0,.50,.42), photo, timber_rect)
    stop_obj = stop.finish('sand-drag-stop-block', {'source': material})
    stop_obj.parent = root
    components.append(stop_obj)
    triangles['sand-drag-components'] = sum(tri.triangles() for tri in (sand, track, sleepers, stop))
    return root

build_sand_drag()

# The story's identifier is case-hollis; keep the source photograph filename.
# The label numeral is a small physical overlay on the blank tag in the photo.
suitcase = parts['case-hollis']
label = bpy.data.curves.new('case-hollis-number', 'FONT')
label.body = '14'
label.size = .052
label.align_x = 'CENTER'
label.align_y = 'CENTER'
label.extrude = .0007
label_obj = bpy.data.objects.new('case-hollis-number', label)
scene.collection.objects.link(label_obj)
label_obj.parent = suitcase
label_obj.location = town.game_vector((-.012, .145, .037))
label_obj.rotation_euler[0] = math.radians(90)
label_mat = bpy.data.materials.new('ink on luggage tag')
label_mat.diffuse_color = (.20, .12, .08, 1)
label_mat.use_nodes = True
label_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.20, .12, .08, 1)
label_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .95
label.materials.append(label_mat)

# The toy is the only all-around curved body.  Its body is measured in all four
# views; the wheels are true round parts at the photographed axle locations.
car_photos = {key: Photo(textures / f'case-tin-car-{key}.jpg')
              for key in ('side', 'front', 'rear', 'top')}
for photo in car_photos.values():
    photo.image.scale(768, max(1, round(photo.image_h * 768 / photo.image_w)))
    photo.image_w, photo.image_h = photo.image.size
    photo._rgb = None
def full_seeds(photo):
    return [(8, 8), (photo.w - 9, 8), (8, photo.h - 9), (photo.w - 9, photo.h - 9)]
car_views = []
side = View('side', car_photos['side'], full_seeds(car_photos['side']),
    lambda x,y,z: (18 + (x + .31) / .62 * 988, 479 - y / .27 * 410), (0,0,1))
front = View('front', car_photos['front'], full_seeds(car_photos['front']),
    lambda x,y,z: (512 + x / .28 * 930, 964 - y / .27 * 900), (0,0,1))
rear = View('rear', car_photos['rear'], full_seeds(car_photos['rear']),
    lambda x,y,z: (512 + x / .28 * 930, 964 - y / .27 * 900), (0,0,-1))
top = View('top', car_photos['top'], full_seeds(car_photos['top']),
    # The overhead photo's body is 450 pixels wide, while the side photo's
    # length is about 988 pixels. Photo horizontal is vehicle width (world Z),
    # and photo vertical is vehicle length (world X).
    lambda x,y,z: (512 + z / .28 * 450, 512 - x / .62 * 900), (0,1,0))
car_views.extend((side, front, rear, top))
car_bounds = ((-.31,.31),(0,.27),(-.14,.14))
car_solid, car_xs, car_ys, car_zs = occupancy(
    car_bounds, .012, [view.covers for view in car_views])
car_solid = largest_part(car_solid)
car_materials = {view.name: view.photo.material() for view in car_views}
car = carve_hull('case-tin-car', car_views, car_materials, car_solid,
                 car_xs, car_ys, car_zs, .012, 4200)
car.parent = root_obj
parts['case-tin-car'] = car
for x in (-.18, .18):
    for z in (-.125, .125):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.043, depth=.020,
            location=(x, -math.copysign(.132, z), .043), rotation=(math.pi/2, 0, 0))
        wheel = bpy.context.object
        wheel.name = 'case-tin-car-wheel'
        wheel.parent = car
        rubber = bpy.data.materials.new('worn black toy rubber')
        rubber.diffuse_color = (.045,.04,.035,1)
        rubber.use_nodes = True
        rubber.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.045,.04,.035,1)
        rubber.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .92
        wheel.data.materials.append(rubber)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.018, depth=.022,
            location=(x, -math.copysign(.132, z), .043), rotation=(math.pi/2, 0, 0))
        hub = bpy.context.object
        hub.name = 'case-tin-car-hub'
        hub.parent = car
        hubmat = bpy.data.materials.new('worn tin wheel hub')
        hubmat.diffuse_color = (.22,.19,.15,1); hubmat.use_nodes = True
        hubmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.22,.19,.15,1)
        hubmat.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = .25
        hubmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .8
        hub.data.materials.append(hubmat)

for item in parts.values():
    if item.type == 'MESH' and item.data.uv_layers:
        item.data.uv_layers[0].name = 'UVMap'
    item.parent = root_obj

def tri_count(obj):
    if obj.type != 'MESH': return 0
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)
for name, obj in parts.items(): triangles[name] = tri_count(obj)
triangles['case-tin-car-wheels'] = sum(tri_count(o) for o in bpy.data.objects
    if o.name.startswith(('case-tin-car-wheel','case-tin-car-hub')))
print('TRIANGLES=' + json.dumps(triangles, sort_keys=True))
print('TRIANGLES_TOTAL=' + str(sum(triangles.values())))
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)

# All review renders come from the exported GLB in a new, empty scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('flat overcast')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.83,.84,.86,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 1
sun = bpy.data.objects.new('overcast key', bpy.data.lights.new('overcast key','SUN'))
sun.data.energy = .55
sun.rotation_euler = (math.radians(35), 0, math.radians(25))
scene.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=2000, location=(0,0,-.015))
ground = bpy.context.object
ground.name = 'single neutral ground'
gm = bpy.data.materials.new('neutral ground')
gm.diffuse_color = (.58,.56,.52,1); gm.use_nodes = True
gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.58,.56,.52,1)
gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
ground.data.materials.append(gm)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera); scene.camera=camera
scene.render.resolution_x, scene.render.resolution_y = 900, 900
scene.render.resolution_percentage = 100

prop_ids = [row[0] for row in PROP_SPECS] + ['case-tin-car']
roots = {name: next(o for o in scene.objects if o.name == name) for name in prop_ids}

def belongs_to(obj, ancestor):
    while obj:
        if obj == ancestor: return True
        obj = obj.parent
    return False

groups = {name: [obj for obj in scene.objects
                 if belongs_to(obj, item) or obj.name.startswith(name + '-')]
          for name, item in roots.items()}
lineup = {}
first_row = [name for name in prop_ids[:9] if name != 'sand-drag']
second_row = prop_ids[9:]
for index, name in enumerate(first_row):
    lineup[name] = ((index - (len(first_row)-1)/2) * .86, 1.35)
for index, name in enumerate(second_row):
    lineup[name] = ((index - (len(second_row)-1)/2) * .82, -1.35)
# Give the 15 m drag room to read as a real site, behind and to the left of
# the two close rows of hand-sized props.
lineup['sand-drag'] = (-11.0, -6.0)

def cam(eye, target):
    eye_b, target_b = town.game_vector(eye), town.game_vector(target)
    camera.location = eye_b
    camera.rotation_euler = (target_b-eye_b).to_track_quat('-Z','Y').to_euler()

def render(name, subject, eye, target, ortho, size=(900,900), all_visible=False):
    visible = set(groups[subject]) if subject in groups else set()
    for obj in scene.objects:
        if obj not in (camera, sun, ground):
            obj.hide_render = not (all_visible or obj in visible)
    ground.hide_render = not all_visible
    scene.render.resolution_x, scene.render.resolution_y = size
    if subject == 'sand-drag':
        camera.data.type='PERSP'; camera.data.lens=38
    else:
        camera.data.type='ORTHO'; camera.data.ortho_scale=ortho
    cam(eye,target)
    scene.render.filepath=str(render_dir/f'{name}.png')
    bpy.ops.render.render(write_still=True)

for name in prop_ids:
    item=roots[name]
    item.location=(0,0,0)
    # Use conservative dimensions by prop family; the reference sets the shape.
    h = next((row[4] for row in PROP_SPECS if row[0] == name and row[3]=='height'), .60)
    if name == 'sand-drag': w=15
    elif name == 'hook-and-ladle': w=.60
    elif name == 'token-ring': w=.60
    elif name == 'case-tin-car': w=.62
    else: w=max(.32,h*.95)
    if name == 'sand-drag':
        render(name+'-dead-on',name,(0,1.5,18),(0,.75,0),None)
        render(name+'-quarter',name,(3,1.5,17.7),(0,.75,0),None)
    else:
        render(name+'-dead-on',name,(0,h*.52,4),(0,h*.52,0),max(w,h)*1.14)
        render(name+'-quarter',name,(w*.62,h*.58,3),(0,h*.48,0),max(w,h)*1.24)

for name,(x,z) in lineup.items():
    roots[name].location=(x,0,z)
    if name == 'sand-drag':
        roots[name].rotation_euler[2]=math.radians(90)
ground.hide_render=False
for members in groups.values():
    for obj in members: obj.hide_render=False
scene.render.resolution_x, scene.render.resolution_y = 1800, 700
camera.data.type='PERSP'; camera.data.lens=40
cam((-7.5,1.5,24),(-7.5,.9,-4.2))
scene.render.filepath=str(render_dir/'lineup.png')
bpy.ops.render.render(write_still=True)
