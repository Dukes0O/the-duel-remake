"""Sea wreck, round 1. Adapt the game's Sirena; no external art or dependencies.

node tools/blender/sirena-wreck-source.mjs
blender -b -t 4 --factory-startup --python tools/blender/sirena-wreck.py -- --render
python tools/blender/sirena-wreck.py --sheet-only

Outputs: embedded-texture runtime GLB; review PNGs/metrics in .qa-dist;
one <=500 KB comparison JPG. Never writes a .blend or changes player data.
Blender converts glTF +Y up/+Z forward to +Z up/-Y forward on import.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRATCH = ROOT / '.qa-dist/sirena-wreck'
LOOK = ROOT / 'docs/board/looks/sirena-wreck'
RUNTIME = ROOT / 'public/assets/models/sirena/sea-wreck.glb'
VIEWS = [
    ('Front three-quarter', (6, -9, 4.6)),
    ('Left side', (9, 0, 2.5)),
    ('Rear three-quarter', (-6, 9, 4.6)),
    ('Above', (.01, -1, 12)),
    ('Nose and crust detail', (3.8, -6, 3.7)),
]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--render', action='store_true')
parser.add_argument('--sheet-only', action='store_true')
parser.add_argument('--root', type=Path, default=ROOT)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
ROOT = args.root.resolve()
SCRATCH = ROOT / '.qa-dist/sirena-wreck'
LOOK = ROOT / 'docs/board/looks/sirena-wreck'
RUNTIME = ROOT / 'public/assets/models/sirena/sea-wreck.glb'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(RUNTIME)], 'json': []}))
    raise SystemExit()


def sheet():
    from PIL import Image, ImageDraw, ImageFont
    LOOK.mkdir(parents=True, exist_ok=True)
    im = Image.new('RGB', (1800, 1888), '#171c1c')
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
    title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 28)
    d.text((22, 12), 'FALCONE SIRENA / SEA WRECK / ROUND 1', font=title, fill='#eee8d9')
    d.text((22, 52), 'As raised: faded red, salt, rust, grey-green sediment. Original panels and wheel pivots.', font=font, fill='#b5c3ba')
    for i, (label, _) in enumerate(VIEWS):
        y = 92 + i * 286
        for col, variant in enumerate(['wreck', 'restored']):
            frame = Image.open(SCRATCH / f'{variant}-{i}.png').convert('RGB')
            im.paste(frame.resize((880, 253), Image.Resampling.LANCZOS), (15 + col * 900, y))
            d.text((25 + col * 900, y + 257), f'{label} / {"Sea wreck" if col == 0 else "Restored 1966"}', font=font, fill='#eee8d9')
    ref = Image.open(SCRATCH / 'raised-reference.png').convert('RGB')
    im.paste(ref.resize((880, 253), Image.Resampling.LANCZOS), (15, 1522))
    d.text((25, 1784), 'SIRENA-ART raised wreck / unchanged reference', font=font, fill='#eee8d9')
    stats = json.loads((SCRATCH / 'metrics.json').read_text())
    lines = [
        'Same car. Sixty years under the sea.',
        f'Source: {stats["sourceTriangles"]:,} triangles',
        f'Crust: +{stats["crustTriangles"]:,} / total: {stats["totalTriangles"]:,}',
        'Four separate spin pivots. Embedded paint textures.',
        'Race frame deferred: finish selection belongs to LAB-RESTORE-2.',
        'Studio renders only. Director look verdict pending.',
    ]
    for i, line in enumerate(lines):
        d.text((925, 1540 + i * 36), line, font=font, fill='#c5cbbf')
    d.text((22, 1845), 'Recipe: tools/blender/sirena-wreck.py | Original game art, no downloaded sources | One art round', font=font, fill='#acb8ad')
    target = LOOK / 'round-1.jpg'
    for quality in [88, 84, 80, 76, 70, 64]:
        im.save(target, quality=quality, optimize=True)
        if target.stat().st_size <= 500_000:
            break
    assert target.stat().st_size <= 500_000
    print(target, target.stat().st_size)


if args.sheet_only:
    sheet()
    raise SystemExit()

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

SCRATCH.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SCRATCH / 'source.glb'))
source = list(bpy.context.scene.objects)
meshes = [o for o in source if o.type == 'MESH']
source_triangles = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
rng = random.Random(196607)


def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .95
    return m


# Object-space triplanar atlas, baked directly into ordinary UVs and JPEGs.
# The same tide/noise field crosses the red paint, stripe and roundel, so they
# erode together. Six square projection tiles avoid stretched side markings.
TILE = 384
def noise(x, y, z, scale, seed):
    xyz = [v * scale + seed * .71 for v in (x, y, z)]
    base = [np.floor(v) for v in xyz]
    t = [v - b for v, b in zip(xyz, base)]
    t = [v * v * (3 - 2 * v) for v in t]
    result = np.zeros_like(x)
    for i in range(8):
        bits = [(i >> j) & 1 for j in range(3)]
        h = np.sin(sum((base[j] + bits[j]) * [127.1, 311.7, 74.7][j] for j in range(3)) + seed) * 43758.5453
        h -= np.floor(h)
        weight = np.ones_like(x)
        for j in range(3):
            weight *= t[j] if bits[j] else 1 - t[j]
        result += h * weight
    return result


def weather_texture(name, base_color):
    image = bpy.data.images.new(name, TILE * 3, TILE * 2, alpha=False)
    atlas = np.ones((TILE * 2, TILE * 3, 4), dtype=np.float32)
    u, v = np.meshgrid((np.arange(TILE) + .5) / TILE, (np.arange(TILE) + .5) / TILE)
    for tile in range(6):
        axis = tile % 3
        # x [-1.2,1.2], y [-2.4,2.4], z [0,1.2], Blender metres.
        a, b = [(1, 2), (0, 2), (0, 1)][axis]
        mins, spans = [-1.2, -2.4, 0], [2.4, 4.8, 1.2]
        coords = [np.full_like(u, mins[j] + spans[j] * (.85 if tile < 3 else .15)) for j in range(3)]
        coords[a], coords[b] = mins[a] + u * spans[a], mins[b] + v * spans[b]
        x, y, z = coords
        broad = noise(x, y, z, 3.8, 11)
        fine = noise(x, y, z, 48, 23)
        speck = noise(x, y, z, 170, 51)
        bloom = np.clip((broad * .72 + fine * .28 - .40) * 4.5, 0, .95)
        grime = np.clip((noise(x, y, z, 6, 38) - .41) * 3.4 + (1 - z / 1.2) * .20, 0, .85)
        color = np.broadcast_to(np.array(base_color), (*u.shape, 3)).copy()
        rust = np.stack([.24 + fine * .19, .105 + fine * .11, .049 + fine * .065], axis=-1)
        color = color * (1 - bloom[..., None]) + rust * bloom[..., None]
        green = np.stack([.17 + fine * .11, .20 + fine * .10, .16 + fine * .09], axis=-1)
        color = color * (1 - grime[..., None]) + green * grime[..., None]
        color *= (.77 + fine * .26 + speck * .12)[..., None]
        # Fine salt flecks and darker pinhole corrosion, never a flat noise wash.
        salt = np.clip((speck - .73) * 2, 0, .22)[..., None]
        color = color * (1 - salt) + np.array([.59, .58, .49]) * salt
        row, col = tile // 3, tile % 3
        atlas[row*TILE:(row+1)*TILE, col*TILE:(col+1)*TILE, :3] = color
    image.pixels.foreach_set(atlas.ravel())
    image.filepath_raw = str(SCRATCH / f'{name}.jpg')
    image.file_format = 'JPEG'
    image.save()
    image.pack()
    return image


textures = {}
for name, color in [('Lacquered body', (.43, .145, .13)), ('White livery', (.64, .61, .52)),
                    ('Dull chrome', (.32, .33, .29)), ('Door numeral', (.045, .044, .033)),
                    ('Tire rubber', (.055, .062, .052))]:
    textures[name] = weather_texture('sea-' + name.lower().replace(' ', '-'), color)

for obj in meshes:
    data = obj.data
    uv = data.uv_layers.active or data.uv_layers.new(name='Sea projection')
    for face in data.polygons:
        normal = obj.matrix_world.to_3x3() @ face.normal
        axis = max(range(3), key=lambda j: abs(normal[j]))
        tile = axis + (3 if normal[axis] < 0 else 0)
        a, b = [(1, 2), (0, 2), (0, 1)][axis]
        for li in face.loop_indices:
            p = obj.matrix_world @ data.vertices[data.loops[li].vertex_index].co
            values = [(p.x + 1.2)/2.4, (p.y + 2.4)/4.8, p.z/1.2]
            uv.data[li].uv = ((tile % 3 + min(.998, max(.002, values[a]))) / 3,
                              (tile // 3 + min(.998, max(.002, values[b]))) / 2)

for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    if m.name == 'Glass sheen':
        # The source sheen is unlit, so its imported graph need not contain a
        # Principled node. Replace that graph explicitly with transparent PBR.
        m.node_tree.nodes.clear()
        transparent = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        transparent.inputs['Alpha'].default_value = 0
        output = m.node_tree.nodes.new('ShaderNodeOutputMaterial')
        m.node_tree.links.new(transparent.outputs['BSDF'], output.inputs['Surface'])
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if not bsdf:
        continue
    if m.name in textures:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = textures[m.name]
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = .94
        bsdf.inputs['Metallic'].default_value = .035
        bsdf.inputs['Coat Weight'].default_value = 0
    if m.name == 'Glass sheen':
        for link in list(bsdf.inputs['Alpha'].links):
            m.node_tree.links.remove(link)
        bsdf.inputs['Alpha'].default_value = 0
    if m.name in ['Glass', 'Glass lamp covers']:
        for socket in ['Base Color', 'Alpha']:
            for link in list(bsdf.inputs[socket].links):
                m.node_tree.links.remove(link)
        bsdf.inputs['Base Color'].default_value = (.15, .19, .16, .30)
        bsdf.inputs['Alpha'].default_value = .30
        bsdf.inputs['Roughness'].default_value = .76
    if m.name == 'Headlamp lenses':
        bsdf.inputs['Emission Strength'].default_value = 0
        bsdf.inputs['Base Color'].default_value = (.34, .32, .23, 1)

shell = next(o for o in meshes if o.name == 'Lacquered body')
verts = [shell.matrix_world @ v.co for v in shell.data.vertices]
bvh = BVHTree.FromPolygons(verts, [list(p.vertices) for p in shell.data.polygons])
crust_mats = [material('Salt shell / ' + str(i), c) for i, c in enumerate([
    (.43, .42, .34), (.58, .56, .46), (.29, .32, .25), (.37, .30, .20), (.12, .14, .10)])]
vertices, faces, mat_ids = [], [], []


def polygon(points, mat_id):
    start = len(vertices)
    vertices.extend(points)
    faces.append(list(range(start, len(vertices))))
    mat_ids.append(mat_id)


def crown(p, n, r):
    # Irregular hollow calcareous volcano: six plates, recessed dark aperture.
    tangent = n.cross(Vector((0, 1, 0))).normalized()
    if tangent.length < .1:
        tangent = n.cross(Vector((1, 0, 0))).normalized()
    bitangent = n.cross(tangent)
    rings = []
    twist = rng.uniform(0, math.tau)
    for radius, height in [(r, -.002), (r * .56, r * .90), (r * .27, r * .79)]:
        rings.append([p + n * height + (tangent * math.cos(twist + i * math.tau/6) + bitangent * math.sin(twist + i * math.tau/6)) * radius * rng.uniform(.88, 1.12) for i in range(6)])
    for k in range(2):
        for i in range(6):
            j = (i + 1) % 6
            polygon([rings[k][i], rings[k][j], rings[k+1][j], rings[k+1][i]], rng.choice([0, 0, 1, 2]))
    polygon(list(reversed([q - n * r * .35 for q in rings[2]])), 4)


# Clusters anchored to actual car panels by rays, rather than floating spheres.
for i in range(65):
    side = -1 if i % 2 else 1
    y = rng.uniform(-2.05, 2.00)
    top = i % 3 == 0
    centre = Vector((rng.uniform(-.79, .79), y, 2)) if top else Vector((side*2, y, rng.uniform(.21, .64)))
    direction = Vector((0, 0, -1)) if top else Vector((-side, 0, 0))
    for j in range(rng.randint(3, 7)):
        start = centre + Vector((rng.uniform(-.10, .10) if top else 0, rng.uniform(-.13, .13), 0 if top else rng.uniform(-.06, .06)))
        p, n, _, _ = bvh.ray_cast(start, direction, 4)
        if p is not None and n.z > -.3:
            crown(p, n, rng.uniform(.009, .031))
            # A few small, fluted limpets/mussel shells among the barnacles.
            if j == 0:
                t = n.cross(Vector((0, 1, 0))).normalized()
                b = n.cross(t)
                r = rng.uniform(.018, .033)
                tip = p + n * r * .46
                for k in range(10):
                    a, c = k * math.tau/10, (k+1) * math.tau/10
                    polygon([tip, p + t*math.cos(a)*r + b*math.sin(a)*r*.65,
                             p + t*math.cos(c)*r + b*math.sin(c)*r*.65], k % 2)

# Dried kelp: narrow, twisted, tapered ribbons. Tips stay above the road and
# clear of the tyre envelope; restrained grey-olive/brown rather than bright green.
for side in [-1, 1]:
    anchors = [(side*.89, y, .24) for y in [-.77, -.58, -.36, -.10, .22, .39]]
    anchors += [(side*x, y, .22) for x in [.24, .37, .52] for y in [-2.15, 2.12]]
    for anchor in anchors:
        length = rng.uniform(.10, .19)
        points = []
        for k in range(7):
            t = k / 6
            width = (.009 + rng.random()*.008) * (1 - t*.9)
            p = Vector(anchor) + Vector((side*.035*t, math.sin(t*5)*.028, -length*t))
            offset = Vector((width*math.cos(t*4), width*math.sin(t*4), .002))
            points.append((p-offset, p+offset))
        for k in range(6):
            polygon([points[k][0], points[k+1][0], points[k+1][1], points[k][1]], 4 if k % 3 else 3)

mesh = bpy.data.meshes.new('Fitted marine crust')
mesh.from_pydata(vertices, [], faces)
mesh.update()
crust = bpy.data.objects.new('Sea wreck / barnacles shells and dried weed', mesh)
bpy.context.collection.objects.link(crust)
for m in crust_mats:
    mesh.materials.append(m)
for face, mi in zip(mesh.polygons, mat_ids):
    face.material_index = mi
for m in crust_mats:
    m.use_backface_culling = False
crust_triangles = sum(len(p.vertices)-2 for p in mesh.polygons)
assert crust_triangles <= source_triangles * .30
assert source_triangles + crust_triangles <= 73600 * 1.30

# All crust belongs to the body. Wheels remain untouched children of named
# steer/spin groups; no merge, transform application or baked wheel rotation.
car_root = next(o for o in source if o.name == 'falcone_sirena')
crust.parent = car_root
crust.matrix_parent_inverse = car_root.matrix_world.inverted()
bpy.ops.object.select_all(action='DESELECT')
for o in source + [crust]:
    o.select_set(True)
RUNTIME.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(RUNTIME), export_format='GLB', use_selection=True,
                          export_extras=False, export_animations=False, export_yup=True)

# Check the actual shipped bytes, including four independently addressable
# spin nodes and embedded images. Count instances, not only unique meshes.
import struct
with RUNTIME.open('rb') as f:
    f.read(12)
    size, _ = struct.unpack('<II', f.read(8))
    gltf = json.loads(f.read(size))
nodes = gltf['nodes']
spins = [n['name'] for n in nodes if n.get('name', '').startswith('spin-')]
assert len(spins) == 4 and len(set(spins)) == 4
for index, node in enumerate(nodes):
    if node.get('name', '').startswith('spin-'):
        parents = [n for n in nodes if index in n.get('children', [])]
        assert len(parents) == 1
        assert parents[0]['name'] == node['name'].replace('spin-', 'steer-')
assert len(gltf['images']) == 5
assert all('bufferView' in image for image in gltf['images'])
for m in gltf['materials']:
    if m.get('name') in ['Glass sheen', 'Glass', 'Glass lamp covers']:
        alpha = m['pbrMetallicRoughness']['baseColorFactor'][3]
        assert abs(alpha - (0 if m['name'] == 'Glass sheen' else .30)) < .001
triangles = sum(gltf['accessors'][p.get('indices', p['attributes']['POSITION'])]['count']//3
                for n in nodes if 'mesh' in n for p in gltf['meshes'][n['mesh']]['primitives'])
assert triangles == source_triangles + crust_triangles
stats = dict(sourceTriangles=source_triangles, crustTriangles=crust_triangles,
             totalTriangles=triangles, cardCap=95680, conservativeCrustCap=int(source_triangles*.30),
             spinNodes=spins, textures=len(gltf['images']), bytes=RUNTIME.stat().st_size)
(SCRATCH / 'metrics.json').write_text(json.dumps(stats, indent=2) + '\n')
print('SEA WRECK METRICS', json.dumps(stats), flush=True)


def render_model(path, prefix, reference=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    scene = bpy.context.scene
    objects = [o for o in scene.objects if o.type == 'MESH']
    corners = [o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
    low = Vector(tuple(min(v[j] for v in corners) for j in range(3)))
    high = Vector(tuple(max(v[j] for v in corners) for j in range(3)))
    centre = (low + high) * .5
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, low.z-.003))
    bpy.context.object.data.materials.append(material('Floor', (.12, .14, .14)))
    scene.world = bpy.data.worlds.new('Neutral daylight')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.52, .57, .60, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
    for loc, power, size in [((2,-4,7), 1600, 5), ((-5,-1,4), 1050, 5), ((1,6,5), 1900, 4)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy, light.data.size = power, size
        light.rotation_euler = (centre-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    scene.camera = camera
    camera.data.type = 'ORTHO'
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1056, 304
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    for i, (_, loc) in enumerate(VIEWS[:1] if reference else VIEWS):
        target = centre if i != 4 else Vector((.1,-1.30,.49))
        camera.location = Vector(loc)
        camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
        # Fit projected bounds to this very wide sheet tile, including the top
        # view's full length. The detail view deliberately frames only the nose.
        if i == 4:
            camera.data.ortho_scale = 4.9
        else:
            inverse = camera.rotation_euler.to_matrix().transposed()
            projected = [inverse @ (v-target) for v in corners]
            w = max(v.x for v in projected) - min(v.x for v in projected)
            h = max(v.y for v in projected) - min(v.y for v in projected)
            camera.data.ortho_scale = max(w, h * 1056 / 304) * 1.15
        scene.render.filepath = str(SCRATCH / ('raised-reference.png' if reference else f'{prefix}-{i}.png'))
        bpy.ops.render.render(write_still=True)


if args.render:
    render_model(RUNTIME, 'wreck')
    render_model(SCRATCH / 'source.glb', 'restored')
    render_model(ROOT / 'public/assets/models/sirena/wreck.glb', 'raised', reference=True)
