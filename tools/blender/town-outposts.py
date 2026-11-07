"""TOWN-ART-OUTPOSTS round 4: Dot's Diner, measured and carved from four views.

Run with Blender 4.5:
  blender -b -t 4 --python-exit-code 1 --python tools/blender/town-outposts.py -- --root .
Photo pixels are read from the gridded references in docs/board/looks/town-art-outposts/round-2-review.md.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--paths-only', action='store_true')
p.add_argument('--render-dir', default='.evidence/2026-11-06/TOWN-ART-OUTPOSTS/round-6')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
out = root / 'public/assets/models/wasteland/town/outposts.glb'
blend = root / 'art-build/town/outposts.blend'
sheet = root / 'docs/board/looks/town-art-outposts/round-6.jpg'
render = Path(a.render_dir)
render = render if render.is_absolute() else root / render
textures = root / 'public/assets/models/wasteland/town/textures'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(render)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(root / 'tools/blender'))
from hull_model import tyre
from photo_model import Mesh, Photo, lathe, slab, trace
from photo_carve import carve_object
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
blend.parent.mkdir(parents=True, exist_ok=True)
render.mkdir(parents=True, exist_ok=True)

WALL = {'start': 15, 'end': 1012, 'ground': 555, 'roof': 328, 'underside': 23, 'join': 252,
        'front_wheel': (228, 523, 36), 'rear_wheel': (940, 522, 35)}
# Pixel measures from photo_grid.py overlays. The wall photo is the same diner
# with its porch and sign removed, because a carve wears whatever its photo shows
# and a porch in the side photo would be painted flat on both walls. The porch
# and the sign are their own pieces, wearing the full side and overhead photos.
# The roof photo is the same again from straight above, for the same reason.
SCALE = 16.4 / 996                      # metres per side-photo pixel: door, chairs and wheels agree
LENGTH = abs(WALL['end'] - WALL['start']) * SCALE
HEIGHT = (WALL['ground'] - WALL['roof']) * SCALE
REAR_S = HEIGHT / (1167 - 372)
WIDTH = (1030 - 198) * REAR_S
table = {
    'photos': {'side': 'dot-diner-wall.jpg', 'front': 'dot-diner-front.jpg',
               'rear': 'dot-diner-rear.jpg', 'top': 'dot-diner-roof.jpg'},
    'length': LENGTH, 'width': WIDTH, 'height': HEIGHT,
    'side': {'start': WALL['start'], 'end': WALL['end'], 'ground': WALL['ground']},
    'front': {'centre': 655, 'ground': 1120, 'top': 300},
    'rear': {'centre': 614, 'ground': 1167, 'top': 372},
    'top': {'front': 15, 'rear': 1000, 'centre': 176, 'along': 'x', 'x_scale': WIDTH / 177},
    # Both end photos show the porch on the other hand from the side photo.
    'front_x_flip': True,
    'cut': {
        'side': WALL.get('cut', []),
        # Mast; porch, lamp and pump beside the nose.
        'front': [(0, 0, 1312, 300), (0, 0, 258, 1199), (258, 540, 275, 640), (0, 1010, 320, 1199)],
        # Wing above the bus, its struts, and the porch beside it.
        'rear': [(0, 0, 1312, 372), (0, 372, 440, 392), (800, 372, 1312, 392), (0, 392, 400, 410), (860, 392, 1312, 410),
                 (1032, 400, 1312, 1199)],
    },
    'ends_split': -LENGTH / 2 + (WALL['join'] - WALL['start']) * SCALE,   # the aircraft nose ends and the bus begins
    'front_favour': 3,
    'underside': WALL['underside'] * SCALE,
    'wheels': [],
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 48, 'voxel': .07, 'target': 6500,
    'mask_dir': str(render / 'masks'),
}


def z_at(px):
    return -LENGTH / 2 + (px - WALL['start']) * SCALE


AXLES = [dict(z=z_at(w[0]), px=w[0], py=w[1], r_px=w[2], r=w[2] * SCALE) for w in (WALL['front_wheel'], WALL['rear_wheel'])]
for axle in AXLES:
    table['wheels'].append((axle['z'], axle['r'], WIDTH / 2 - .34))
body = carve_object('dot-diner:body', textures, table)

family = bpy.data.objects.new('town-outposts', None)
bpy.context.collection.objects.link(family)
family.empty_display_type = 'PLAIN_AXES'
diner = bpy.data.objects.new('dot-diner', None)
bpy.context.collection.objects.link(diner)
diner.empty_display_type = 'CUBE'
diner.parent = family
body.parent = diner

wall_photo = table['_photos']['side']
rear_photo = table['_photos']['rear']
for index, axle in enumerate(AXLES):
    for hand in (-1, 1):
        wheel = Mesh()
        tyre(wheel, 'side', wall_photo, axle['px'], axle['py'], axle['r_px'], axle['r'], .17,
             'rear', rear_photo, 246, 36, 1095, 1160)
        obj = wheel.finish(f"dot-diner:wheel-{index + 1}-{'road' if hand < 0 else 'far'}",
                           {'side': wall_photo.material(), 'rear': rear_photo.material()})
        obj.parent = diner
        obj.location = (hand * (WIDTH / 2 - .17), -axle['z'], axle['r'])

axles = Mesh()
for axle in AXLES:
    lathe(axles, 'side', (0, axle['r'], axle['z']), (1, 0, 0), (0, 0, 1), (0, 1, 0),
          [(-WIDTH / 2 + .34, .05), (WIDTH / 2 - .34, .05)], lambda i, d, r, a: wall_photo.uv(axle['px'], axle['py']), sides=10)
axles_obj = axles.finish('dot-diner:axles', {'side': wall_photo.material()})
axles_obj.parent = diner

# The wings and tail the bus still wears on its roof, traced from the rear photo so their holes stay open.
# This is a second copy of the photo: the carve has painted over everything outside the bus in the first.
tail_photo = Photo(textures / 'dot-diner-rear.jpg')
tail_mask = ~tail_photo.sky([(8, 8), (1303, 8), (8, 300), (1303, 300)], tolerance=30, grey=26)
tail_mask[372:, :] = False
tail_loops = trace(tail_mask, (70, 5, 1180, 372))
TAIL_Z = (LENGTH / 2 - 2.6)
def tail_world(px, py, d):
    return (-(px - 620) * REAR_S, (1167 - py) * REAR_S - .04, TAIL_Z + d)
tail = Mesh()
slab(tail, 'rear', tail_photo, tail_loops, tail_world, -.07, .07)
tail_obj = tail.finish('dot-diner:tail', {'rear': tail_photo.material()})
tail_obj.parent = diner

side = Photo(textures / 'dot-diner-side.jpg')
over = Photo(textures / 'dot-diner-overhead.jpg')


def px_z(px):
    """A pixel along the full side photo, which spans the same body as the wall photo."""
    return -LENGTH / 2 + (px - 15) * LENGTH / 996


def py_y(py):
    return (555 - py) * HEIGHT / 229


def photo_box(mesh, x0, x1, y0, y1, z0, z1, near, round_all=False):
    """A box whose long faces wear `near` (px0, py0, px1, py1) of the side photo.
    The other faces read a sliver of the same part, so no background reaches them."""
    px0, py0, px1, py1 = near
    uv = side.uv
    n = [uv(px0, py1), uv(px1, py1), uv(px1, py0), uv(px0, py0)]
    mesh.face([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], n, 'side', (-1, 0, 0))
    mesh.face([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], n, 'side', (1, 0, 0))
    edge = n if round_all else [uv(px0, py1), uv(px0 + 2, py1), uv(px0 + 2, py0), uv(px0, py0)]
    mesh.face([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], edge, 'side', (0, 0, -1))
    mesh.face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], edge, 'side', (0, 0, 1))
    t = [uv(px0, py0), uv(px0, py0 + 2), uv(px1, py0 + 2), uv(px1, py0)]
    mesh.face([(x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1)], t, 'side', (0, 1, 0))
    mesh.face([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], t, 'side', (0, -1, 0))


WALL_X = -WIDTH / 2 + .05       # the road side's wall
DECK_Z0, DECK_Z1 = px_z(268), px_z(925)
DECK_X = WALL_X - 2.3
DECK_Y = py_y(527)

porch = Mesh()
# Deck: its top is the overhead photo's boards, its edge the side photo's.
photo_box(porch, DECK_X, WALL_X, DECK_Y - .24, DECK_Y, DECK_Z0, DECK_Z1, (268, 527, 925, 544))
porch.face([(WALL_X, DECK_Y + .012, DECK_Z0), (DECK_X, DECK_Y + .012, DECK_Z0), (DECK_X, DECK_Y + .012, DECK_Z1), (WALL_X, DECK_Y + .012, DECK_Z1)],
           [over.uv(142, 232), over.uv(142, 298), over.uv(738, 298), over.uv(738, 232)], 'over', (0, 1, 0))
# Canopy: a sloping sheet of tin, the overhead photo above and the side photo's fascia at its edge.
c_near, c_far = py_y(347), py_y(370)
cz0, cz1 = px_z(258), px_z(935)
cx0, cx1 = WALL_X + .02, DECK_X - .16
porch.face([(cx0, c_near, cz0), (cx1, c_far, cz0), (cx1, c_far, cz1), (cx0, c_near, cz1)],
           [over.uv(186, 182), over.uv(186, 214), over.uv(725, 214), over.uv(725, 182)], 'over', (0, 1, 0))
porch.face([(cx1, c_far - .05, cz0), (cx0, c_near - .05, cz0), (cx0, c_near - .05, cz1), (cx1, c_far - .05, cz1)],
           [side.uv(300, 372), side.uv(300, 366), side.uv(900, 366), side.uv(900, 372)], 'side', (0, -1, 0))
porch.face([(cx1, c_far - .1, cz0), (cx1, c_far - .1, cz1), (cx1, c_far, cz1), (cx1, c_far, cz0)],
           [side.uv(258, 372), side.uv(935, 372), side.uv(935, 349), side.uv(258, 349)], 'side', (-1, 0, 0))
# Posts stand on the deck and meet the canopy, each wearing its own post from the photo.
for px in (282, 500, 766, 918):
    z = px_z(px)
    photo_box(porch, DECK_X + .02, DECK_X + .18, DECK_Y, c_far, z - .08, z + .08, (px - 4, 376, px + 4, 525))
# Rails between the posts, on the road side, leaving the steps open.
for px0, px1 in ((282, 500), (612, 766), (766, 918)):
    photo_box(porch, DECK_X + .05, DECK_X + .15, py_y(480), py_y(474), px_z(px0), px_z(px1), (px0, 474, px1, 480))
# Steps down to the ground, in the middle of the deck's road edge.
for w, py0, py1 in ((.42, 528, 538), (.84, 538, 548), (1.26, 548, 556)):
    photo_box(porch, DECK_X - w, DECK_X - w + .42, 0, py_y(py0), px_z(507), px_z(607), (507, py0, 607, py1))
# Pump, at the nose end of the deck.
pz = px_z(310)
photo_box(porch, DECK_X + .55, DECK_X + 1.15, DECK_Y, py_y(417), pz - .33, pz + .33, (291, 417, 330, 524), round_all=True)
porch_obj = porch.finish('dot-diner:porch', {'side': side.material(), 'over': over.material()})
porch_obj.parent = diner


# Simple, weathered salvage materials for what stands on the deck.
def material(name, color, metallic=0.0, roughness=.9):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = min(metallic, .3)
    shader.inputs['Roughness'].default_value = roughness
    return mat


rust = material('rusted steel', (.28, .095, .045), .25)
chair_red = material('chipped chair paint', (.42, .10, .07))
top_paint = material('worn table top', (.46, .41, .32))


def cube(name, center, size, mat):
    obj = town.cube('dot-diner:' + name, center, size, mat, .012)
    obj.parent = diner
    return obj


# Tables sit where the overhead photo's tables are printed on the deck.
for i, p in enumerate((250, 367, 557, 663)):
    tz = DECK_Z0 + (p - 142) / (738 - 142) * (DECK_Z1 - DECK_Z0)
    tx = WALL_X - 1.0
    cube(f'table-{i + 1}-top', (tx, DECK_Y + .74, tz), (.8, .05, .8), top_paint)
    cube(f'table-{i + 1}-leg', (tx, DECK_Y + .37, tz), (.09, .72, .09), rust)
    for hand in (-1, 1):
        cz = tz + hand * .66
        cube(f'chair-{i + 1}-{hand}-seat', (tx, DECK_Y + .46, cz), (.42, .05, .42), chair_red)
        cube(f'chair-{i + 1}-{hand}-back', (tx, DECK_Y + .72, cz + hand * .19), (.42, .46, .04), chair_red)
        for leg in (-1, 1):
            cube(f'chair-{i + 1}-{hand}-frame-{leg}', (tx + leg * .18, DECK_Y + .22, cz), (.04, .44, .36), rust)

# Sign: one thick slab on the roof, facing the road, with DOT'S reading correctly from both sides.
sign = Mesh()
sx0, sx1 = -.09, .09
sz0, sz1, sy0, sy1 = px_z(390), px_z(755), py_y(318), py_y(238)
face_uv = [side.uv(390, 318), side.uv(755, 318), side.uv(755, 238), side.uv(390, 238)]
sign.face([(sx0, sy0, sz0), (sx0, sy0, sz1), (sx0, sy1, sz1), (sx0, sy1, sz0)], face_uv, 'sign', (-1, 0, 0))
sign.face([(sx1, sy0, sz1), (sx1, sy0, sz0), (sx1, sy1, sz0), (sx1, sy1, sz1)], face_uv, 'sign', (1, 0, 0))
strip = [side.uv(390, 240), side.uv(390, 238), side.uv(755, 238), side.uv(755, 240)]
sign.face([(sx1, sy1, sz0), (sx0, sy1, sz0), (sx0, sy1, sz1), (sx1, sy1, sz1)], strip, 'sign', (0, 1, 0))
sign.face([(sx0, sy0, sz0), (sx1, sy0, sz0), (sx1, sy0, sz1), (sx0, sy0, sz1)], strip, 'sign', (0, -1, 0))
end_uv = [side.uv(390, 318), side.uv(392, 318), side.uv(392, 238), side.uv(390, 238)]
sign.face([(sx1, sy0, sz0), (sx0, sy0, sz0), (sx0, sy1, sz0), (sx1, sy1, sz0)], end_uv, 'sign', (0, 0, -1))
sign.face([(sx0, sy0, sz1), (sx1, sy0, sz1), (sx1, sy1, sz1), (sx0, sy1, sz1)], end_uv, 'sign', (0, 0, 1))
sign_obj = sign.finish('dot-diner:sign-slab', {'sign': side.material()})
sign_obj.parent = diner
# Posts run from the roof up behind the slab: the side photo's two tall posts and two short feet.
for i, (px, top_py) in enumerate(((407, 225), (677, 225), (538, 318), (735, 318))):
    foot = HEIGHT - .25
    cube(f'sign-post-{i + 1}', (sx1 + .05, (py_y(top_py) + foot) / 2, px_z(px)), (.1, py_y(top_py) - foot, .1), rust)


# Plane-school: the clean side and overhead photographs remove the slide from
# the fuselage carve. The source photo's doorway is 56 px wide; treating that
# salvaged opening as a 1.0 m door sets this object's scale and length.
SCHOOL_START, SCHOOL_END, SCHOOL_GROUND = 18, 1940, 700
SCHOOL_DOOR_WIDTH_PX = 100
SCHOOL_SCALE = 1.0 / SCHOOL_DOOR_WIDTH_PX  # door width fixes the side-photo scale
SCHOOL_LENGTH = (SCHOOL_END - SCHOOL_START) * SCHOOL_SCALE
SCHOOL_HEIGHT = (SCHOOL_GROUND - 285) * SCHOOL_SCALE
# Each end is measured from its own clean grid. The fuselage edges, not the
# far-reaching wings, define the body centre and cross-section.
SCHOOL_FRONT = {'centre': 700, 'ground': 500, 'top': 340}
SCHOOL_REAR = {'centre': 700, 'ground': 505, 'top': 390}
SCHOOL_WIDTH = 228 * (SCHOOL_HEIGHT / (SCHOOL_FRONT['ground'] - SCHOOL_FRONT['top']))
school_table = {
    'photos': {'side': 'plane-school-side-wall.jpg', 'front': 'plane-school-front.jpg',
               'rear': 'plane-school-rear.jpg', 'top': 'plane-school-overhead-wall.jpg'},
    'length': SCHOOL_LENGTH, 'width': SCHOOL_WIDTH, 'height': SCHOOL_HEIGHT,
    'side': {'start': SCHOOL_START, 'end': SCHOOL_END, 'ground': SCHOOL_GROUND},
    'front': SCHOOL_FRONT, 'rear': SCHOOL_REAR,
    # The generated plan panel was 11.5% shorter and 16% narrower than the
    # side/end grids. Its clean photo is normalized to the shared door scale.
    'top': {'front': 60, 'rear': 1240, 'centre': 600, 'along': 'x', 'x_scale': SCHOOL_WIDTH / 1030},
    'cut': {'side': [(0, 600, 2200, 1023)]},
    'grey': 26, 'tolerance': 40, 'bleed_tolerance': 42,
    'voxel': .06, 'target': 7000,
    'mask_dir': str(render / 'masks'),
}
school_body = carve_object('plane-school:body', textures, school_table)
school = bpy.data.objects.new('plane-school', None)
bpy.context.collection.objects.link(school)
school.empty_display_type = 'CUBE'
school.parent = family
school_body.parent = school

# The slide is a separate panel assembly, wearing its unedited side-photo pixels.
school_side = Photo(textures / 'plane-school-side.jpg')
slide = Mesh()
def school_z(px):
    return -SCHOOL_LENGTH / 2 + (px - SCHOOL_START) * SCHOOL_SCALE
def school_y(py):
    return (SCHOOL_GROUND - py) * SCHOOL_SCALE
def slide_face(points, pixels, normal):
    slide.face(points, [school_side.uv(x, y) for x, y in pixels], 'side', normal)
# Full-width open chute runs from the real door sill to the ground. Its rear
# plane is dark so the carved opening remains visibly open behind it.
sx = SCHOOL_WIDTH * .72
zs = [school_z(790), school_z(1020)]
top_y, end_y = school_y(480), .06
slide_face([(-sx/2, top_y, zs[0]), (-sx/2, end_y, zs[1]),
            (-sx/2, end_y, zs[0]), (-sx/2, top_y, zs[0])],
           [(538, 470), (470, 735), (680, 735), (638, 470)], (-1, 0, 0))
slide_face([(sx/2, top_y, zs[0]), (sx/2, end_y, zs[1]),
            (sx/2, end_y, zs[0]), (sx/2, top_y, zs[0])],
           [(538, 470), (470, 735), (680, 735), (638, 470)], (1, 0, 0))
# Tread with side rails makes the slide read across the body, not as a flat wedge.
slide.face([(-sx/2, top_y, zs[0]), (sx/2, top_y, zs[0]),
           (sx/2, end_y, zs[1]), (-sx/2, end_y, zs[1])],
          [school_side.uv(538, 470), school_side.uv(638, 470),
           school_side.uv(680, 735), school_side.uv(470, 735)], 'side', (0, 1, 0))
slide_obj = slide.finish('plane-school:slide', {'side': school_side.material()})
slide_obj.parent = school

# The letters are separate raised pieces so both sides read correctly.
for hand in (-1, 1):
    curve = bpy.data.curves.new(f'plane-school:letters-{hand}', 'FONT')
    curve.body = 'SCHOOL'
    curve.size = .38
    curve.extrude = .018
    text_obj = bpy.data.objects.new(f'plane-school:letters-{hand}', curve)
    bpy.context.collection.objects.link(text_obj)
    text_obj.parent = school
    text_obj.rotation_euler = (math.pi / 2, 0, hand * math.pi / 2)
    text_obj.location = (hand * (SCHOOL_WIDTH / 2 + .04), 1.65, .0)

# Export and read the exact GLB back before making review views.
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.render.resolution_percentage = 100
scene.render.resolution_x, scene.render.resolution_y = 820, 600
scene.world = bpy.data.worlds.new('flat neutral studio')
scene.world.color = (.42, .42, .42)
scene.render.film_transparent = False
for node in bpy.data.objects:
    if node.name == 'dot-diner' or node.name.startswith('dot-diner:'):
        node.hide_render = True

def area(name, loc, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.shape, data.size = energy, 'DISK', size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 3, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

area('soft sky', (0, 25, -12), 3600, 20)
area('open fill', (-16, 14, 16), 1900, 15)
camera = bpy.data.objects.new('review camera', bpy.data.cameras.new('review camera'))
scene.collection.objects.link(camera)
scene.camera = camera

def shot(name, eye, target, ortho):
    camera.location = (eye[0], -eye[2], eye[1])
    camera.rotation_euler = (Vector((target[0], -target[2], target[1])) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = ortho
    scene.render.filepath = str(render / f'{name}.png')
    bpy.ops.render.render(write_still=True)

shot('model-side', (-44, 3, 0), (0, 2.6, 0), 14)
shot('model-front', (0, 2.6, -40), (0, 2.6, 0), 8)
shot('model-rear', (0, 2.6, 40), (0, 2.6, 0), 8)
shot('model-far', (44, 3, 0), (0, 2.6, 0), 14)
shot('model-above', (0, 58, 0), (-1, 1.8, 0), 14)
shot('model-road', (-24, 13, -22), (-1, 2, 0), 14)
shot('model-back', (24, 13, 22), (0, 2, 0), 14)
shot('model-mayor', (-42, 62, -42), (-1, 1.5, 0), 18)
print(json.dumps({'glb': str(out), 'bytes': out.stat().st_size,
                  'renders': [str(p) for p in sorted(render.glob('model-*.png'))]}))
