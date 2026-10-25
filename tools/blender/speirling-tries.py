"""Final selected Speirling, based on study 04. Recipe is the source.

blender -b -t 4 -P tools/blender/speirling-tries.py -- --root .
Then: python tools/blender/speirling-tries.py --root . --sheet
Blender -Y is forward; GLB +Z is forward. Units are metres.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', default='.')
parser.add_argument('--sheet', action='store_true')
parser.add_argument('--views', nargs='+', help='optional camera subset, for framing corrections')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = root / '.qa-dist/speirling-final'
runtime = root / 'public/assets/models/unlocks/mcmurtry_speirling.glb'
looks = root / 'docs/board/looks/speirling'
views = ('front-three-quarter', 'side', 'rear', 'rear-three-quarter', 'above')
studies = ('mcmurtry_speirling',)

if args.sheet:
    from PIL import Image, ImageDraw, ImageFont
    # Only synthetic renders enter the committed sheet. References stay local.
    cell_w, cell_h = 420, 284
    sheet = Image.new('RGB', (cell_w * 5, cell_h + 76), '#19212a')
    draw = ImageDraw.Draw(sheet)
    font_path = 'C:/Windows/Fonts/arial.ttf'
    font = ImageFont.truetype(font_path, 19)
    small = ImageFont.truetype(font_path, 16)
    draw.text((18, 10), 'McMurtry Speirling | final 04 | closed engine cover and corrected nose', font=font, fill='white')
    report = json.loads((out / 'summary.json').read_text())
    for col, view in enumerate(views):
        draw.text((col * cell_w + 14, 44), view.replace('-', ' ').title(), font=small, fill='#bccbd9')
    for row, name in enumerate(studies):
        for col, view in enumerate(views):
            im = Image.open(out / name / (view + '.png')).convert('RGB')
            im.thumbnail((cell_w, cell_h - 34))
            x, y = col * cell_w, 76 + row * cell_h
            sheet.paste(im, (x + (cell_w - im.width) // 2, y))
            label = f'{name} | {report[row]["triangles"]:,} tris' if col == 0 else name
            draw.text((x + 12, y + cell_h - 29), label, font=small, fill='white')
    looks.mkdir(parents=True, exist_ok=True)
    target = looks / 'blender-final.jpg'
    for quality in (88, 82, 76, 70, 64, 58):
        sheet.save(target, quality=quality, optimize=True)
        if target.stat().st_size <= 500000:
            break
    assert target.stat().st_size <= 500000
    print(target, target.stat().st_size)
    raise SystemExit(0)

import bpy
from mathutils import Vector


def material(name, color, metallic=0, roughness=.35, emission=0, alpha=1):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    if emission:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emission
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        p.inputs['Transmission Weight'].default_value = 0
        m.surface_render_method = 'DITHERED'
    return m


def mesh(name, verts, faces, mat, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in data.polygons:
        p.use_smooth = smooth
    return obj


def box(name, loc, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('soft edges', 'BEVEL')
        mod.width, mod.segments = bevel, 3
        obj.modifiers.new('normals', 'WEIGHTED_NORMAL')
    return obj


def tube(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth, curve.bevel_resolution = radius, 2
    curve.resolution_u = 1
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object


def ellipsoid(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=loc)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def join_wheel(parts, name, hub):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.context.scene.cursor.location = hub
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return obj


def ring(name, x, y, z, radius, thickness, mat, axis='X'):
    pts = []
    for i in range(49):
        a = 2 * math.pi * i / 48
        pts.append((x, y + radius * math.cos(a), z + radius * math.sin(a)) if axis == 'X'
                   else (x + radius * math.cos(a), y, z + radius * math.sin(a)))
    return tube(name, pts, thickness, mat)


def make_car():
    # Selected study 04: sealed loft and side-only wheel-arch openings.
    nx, ny = 48, 48
    fender, channel, rear_gain = .34, .020, .075
    verts, faces = [], []
    for j in range(ny + 1):
        y = -1.59 + 3.08 * j / ny
        width = .78 - .08 * math.exp(-((y - .05) / .49) ** 2)
        width -= .09 * math.exp(-((y + 1.6) / .15) ** 2)
        for i in range(nx + 1):
            u = -1 + 2 * i / nx
            x = u * width
            front = math.exp(-((y + .94) / .68) ** 4)
            rear = math.exp(-((y - .96) / .69) ** 4)
            peak = math.exp(-((abs(u) - .80) / .255) ** 2)
            z = .285 + (fender * front + (.32 + rear_gain) * rear + .12) * peak
            z += .09 * math.exp(-(u / .24) ** 2)
            z -= channel * math.exp(-((abs(u) - .42) / .14) ** 2)
            z -= .10 * math.exp(-((y + 1.59) / .17) ** 2)
            # Roll shoulders over to a low continuous sill.
            z -= .20 * max(0, (abs(u) - .89) / .11) ** 2
            verts.append((x, y, z))
    stride = nx + 1
    for j in range(ny):
        for i in range(nx):
            a = j * stride + i
            faces.append((a, a + 1, a + 1 + stride, a + stride))
    # A sealed manifold shell is needed for dependable wheel-arch booleans.
    perimeter = list(range(nx + 1))
    perimeter += [j * stride + nx for j in range(1, ny + 1)]
    perimeter += [ny * stride + i for i in range(nx - 1, -1, -1)]
    perimeter += [j * stride for j in range(ny - 1, 0, -1)]
    bottom = []
    for a in perimeter:
        bottom.append(len(verts))
        verts.append((verts[a][0], verts[a][1], .105))
    for k, a in enumerate(perimeter):
        n = (k + 1) % len(perimeter)
        faces.append((a, bottom[k], bottom[n], perimeter[n]))
    faces.append(tuple(reversed(bottom)))
    body = mesh('continuous_sculpted_body', verts, faces, paint)
    for side in (-1, 1):
        for y in (-.94, .98):
            bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=.306, depth=.40,
                                               location=(side * .80, y, .296), rotation=(0, math.pi / 2, 0))
            cutter = bpy.context.object
            bpy.context.view_layer.objects.active = body
            mod = body.modifiers.new('open wheel arch', 'BOOLEAN')
            mod.operation, mod.object = 'DIFFERENCE', cutter
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.data.objects.remove(cutter, do_unlink=True)
    box('carbon_floor', (0, -.02, .10), (1.52, 3.12, .065), carbon, .025)
    # W-shaped black nose mouth, edged with a continuous painted lip.
    lip = [(-.66, -1.595, .29), (-.50, -1.61, .33), (-.25, -1.62, .305),
           (0, -1.625, .33), (.25, -1.62, .305), (.50, -1.61, .33), (.66, -1.595, .29)]
    mesh('wide_W_nose_intake', lip + [(.64, -1.615, .145), (-.64, -1.615, .145)],
         [tuple(range(9))], black, False)
    tube('nose_painted_lip', lip, .018, paint)
    for side in (-1, 1):
        tube('vertical_daylight', [(side * .65, -1.619, .18), (side * .66, -1.607, .29)], .011, white)
        box('low_grime_sill', (side * .733, -.04, .144), (.035, 1.02, .05), grime, .01)
    # Low central glass teardrop: a lofted elliptical upper dome, not a sphere pod.
    sections = [(-.91, .035, .38, .40), (-.72, .17, .39, .62), (-.44, .245, .38, .87),
                (-.13, .26, .37, .985), (.19, .245, .36, 1.0), (.47, .205, .36, .86),
                (.66, .14, .37, .65), (.79, .035, .39, .46)]
    vv, ff = [], []
    for y, width, base, top in sections:
        for i in range(25):
            a = math.pi * i / 24
            vv.append((width * math.cos(a), y, base + (top - base) * math.sin(a)))
    for j in range(len(sections) - 1):
        for i in range(24):
            a = j * 25 + i
            ff.append((a, a + 1, a + 26, a + 25))
    canopy = mesh('brown_clear_canopy_and_door_glass', vv, ff, glass)
    mod = canopy.modifiers.new('glass smooth loft', 'SUBSURF')
    mod.levels = 2
    ellipsoid('seat_visible_through_glass', (0, .13, .52), (.14, .25, .20), black)
    for side in (-1, 1):
        tube('thin_canopy_sill', [(side * w, y, base + .006) for y, w, base, top in sections], .007, carbon)
        tube('door_glass_frame', [(side * .245 * math.cos(a), -.43, .38 + .49 * math.sin(a))
                                  for a in [math.pi * i / 24 for i in range(25)]], .005, carbon)
        tube('mirror_stalk', [(side * .27, -.38, .48), (side * .46, -.51, .58)], .009, carbon)
        ellipsoid('mirror', (side * .48, -.52, .59), (.081, .043, .034), paint)
        # Haunch-side inlet behind each door, sloping into the rear shoulder.
        inlet = [(side * .36, .37, .34), (side * .66, .40, .52),
                 (side * .68, .78, .52), (side * .40, .78, .32)]
        mesh('rear_haunch_side_intake', inlet, [(0, 1, 2, 3)], black, False)
        tube('inlet_upper_edge', inlet[:3], .013, paint)
    # Central rear spine narrows to a red diamond and sits between open tunnels.
    spine = [(-.15, 1.507, .52), (-.10, 1.507, .71), (0, 1.507, .79),
             (.10, 1.507, .71), (.15, 1.507, .52), (0, 1.53, .20)]
    mesh('rear_central_spine_panel', spine, [tuple(range(6))], paint, False)
    tube('spine_edge', spine + [spine[0]], .009, carbon)
    tube('spine_logo', [(-.025, 1.525, .69), (-.025, 1.527, .73), (0, 1.527, .71),
                        (.025, 1.527, .73), (.025, 1.525, .69)], .003, silver)
    tube('diamond_tail_light', [(0, 1.552, .24), (-.042, 1.552, .33), (0, 1.552, .39),
                              (.042, 1.552, .33), (0, 1.552, .24)], .009, red)
    # Closed painted engine cover, smoothly tapering into the narrow rear spine.
    # Its outboard edges leave the two deep rear channels open.
    cover_sections = ((.37, .22, .43, .89), (.53, .25, .43, .87),
                      (.75, .255, .44, .84), (.98, .23, .45, .81),
                      (1.24, .19, .46, .79), (1.50, .145, .49, .79))
    cv, cf = [], []
    for y, width, base, top in cover_sections:
        for i in range(17):
            a = math.pi * i / 16
            cv.append((width * math.cos(a), y, base + (top - base) * math.sin(a)))
    for j in range(len(cover_sections) - 1):
        for i in range(16):
            a = j * 17 + i
            cf.append((a, a + 1, a + 18, a + 17))
        cf.append((j * 17, (j + 1) * 17, (j + 1) * 17 + 16, j * 17 + 16))
    cf.extend((tuple(reversed(range(17))), tuple(range(85, 102))))
    cover = mesh('closed_painted_engine_cover', cv, cf, paint)
    mod = cover.modifiers.new('smooth engine cover', 'SUBSURF')
    mod.levels = 2
    # Thin solid fin: only the strip above the painted engine cover is exposed.
    fin_outline = [(0, .18, 1.0), (0, .64, .95), (0, 1.31, 1.035),
                   (0, 1.36, .79), (0, .75, .84), (0, .37, .89)]
    fin = mesh('thin_dorsal_fin', fin_outline, [tuple(range(6))], carbon, False)
    mod = fin.modifiers.new('four millimetre fin', 'SOLIDIFY')
    mod.thickness = .004
    for side in (-1, 1):
        # Hollow dark rectangular tunnel with a recessed radiator, no solid pod.
        box('rear_tunnel_inner_wall', (side * .19, 1.22, .49), (.025, .55, .30), carbon)
        box('rear_tunnel_outer_wall', (side * .56, 1.23, .48), (.025, .55, .33), carbon)
        box('radiator_backing', (side * .37, 1.40, .315), (.32, .035, .23), black, .007)
        for j in range(19):
            box('radiator_horizontal_mesh', (side * .37, 1.427, .22 + j * .0105), (.31, .008, .003), meshmetal)
        for j in range(8):
            box('radiator_vertical_mesh', (side * .37 - .14 + j * .04, 1.431, .315), (.002, .005, .21), meshmetal)
        # Rear outer faces have tall black recesses and stacked ring lamps.
        box('rear_lamp_recess', (side * .665, 1.50, .416), (.19, .025, .39), black, .06)
        for z in (.285, .55):
            ring('red_ring_tail_light', side * .665, 1.525, z, .023, .006, red, 'Y')
        tube('rear_haunch_rim', [(side * .56, 1.523, .24), (side * .755, 1.52, .25),
                                (side * .775, 1.50, .54), (side * .70, 1.49, .64),
                                (side * .57, 1.50, .63)], .011, paint)
        # Swan neck: up from shoulder, forward over wing, then down onto its top.
        tube('swan_neck_wing_mount', [(side * .58, .95, .64), (side * .61, .91, .96),
                                    (side * .61, 1.09, 1.13), (side * .61, 1.29, 1.13),
                                    (side * .61, 1.31, 1.07)], .017, carbon)
    box('rear_wing', (0, 1.31, 1.063), (1.60, .32, .032), carbon, .012)
    for side in (-1, 1):
        box('wing_endplate', (side * .796, 1.31, 1.045), (.016, .35, .135), carbon, .008)
    box('rear_diffuser', (0, 1.31, .12), (1.36, .48, .055), carbon, .018)
    for x in (-.60, -.39, -.18, .18, .39, .60):
        box('diffuser_strake', (x, 1.32, .095), (.012, .44, .17), carbon, .005)
    box('small_rear_plate', (0, 1.555, .17), (.28, .012, .065), plate, .008)
    # Each wheel is one mesh, with its own local hub origin and no parenting.
    for side, suffix in ((-1, 'l'), (1, 'r')):
        for y, axle in ((-.94, 'f'), (.98, 'r')):
            x, z = side * .67, .296
            parts = [ring('slick', x, y, z, .235, .057, rubber)]
            outer = side * .787
            parts.append(ring('rim', outer, y, z, .182, .011, silver))
            parts.append(ellipsoid('dark_brake_disc', (outer - side * .013, y, z), (.014, .16, .16), carbon))
            for i in range(12):
                a = i * 2 * math.pi / 12
                parts.append(tube('spoke', [(outer, y, z), (outer, y + .17 * math.cos(a + .10), z + .17 * math.sin(a + .10))], .009, meshmetal))
            parts.append(ellipsoid('hub', (outer, y, z), (.018, .033, .033), silver))
            join_wheel(parts, 'wheel_' + axle + suffix, (x, y, z))


summary = []
out.mkdir(parents=True, exist_ok=True)
for index, study in enumerate(studies):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    paint = material('metallic_blue_grey', (.16, .245, .29), .78, .25)
    carbon = material('satin_carbon', (.012, .016, .020), .25, .32)
    black = carbon
    rubber = material('slick_rubber', (.012, .013, .015), 0, .70)
    glass = material('brown_tinted_clear_glass', (.13, .105, .082), .1, .09, alpha=.70)
    silver = material('dark_machined_alloy', (.28, .31, .32), .85, .28)
    meshmetal = carbon
    red = material('red_tail_lamps', (1, .008, .015), .1, .2, 3)
    white = material('white_daylights', (.9, .96, 1), .1, .2, 2)
    grime = carbon
    plate = silver
    make_car()
    car = [o for o in scene.objects if o.type == 'MESH']
    # Apply modifiers once for triangle count and identical export/render geometry.
    for obj in car:
        bpy.context.view_layer.objects.active = obj
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    triangles = 0
    for obj in car:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    assert triangles < 50000, (study, triangles)
    bpy.context.view_layer.update()
    corners = [o.matrix_world @ Vector(v) for o in car for v in o.bound_box]
    dimensions = [max(p[i] for p in corners) - min(p[i] for p in corners) for i in range(3)]
    assert 1.55 < dimensions[0] < 1.7 and 3.1 < dimensions[1] < 3.3 and .95 < dimensions[2] < 1.2, dimensions
    for name in ('wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'):
        assert bpy.data.objects[name].type == 'MESH'
    # Ground-centre origin and batch static geometry, retaining wheel pivots.
    lo = [min(p[i] for p in corners) for i in range(3)]
    hi = [max(p[i] for p in corners) for i in range(3)]
    offset = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]))
    for obj in car:
        obj.location -= offset
    static = [o for o in car if not o.name.startswith('wheel_')]
    for mat in (paint, carbon, glass, red, white, silver):
        parts = [o for o in static if o.data.materials[0] == mat]
        if parts:
            static = [o for o in static if o not in parts]
            join_wheel(parts, 'body_' + mat.name, (0, 0, 0))
    dest = out / study
    dest.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(runtime), export_format='GLB',
                             use_selection=True, export_yup=True, export_cameras=False, export_lights=False)
    assert runtime.stat().st_size < 8000000
    summary.append({'name': study, 'triangles': triangles, 'dimensions_xyz_m': dimensions,
                    'wheels': {name: list(bpy.data.objects[name].location) for name in ('wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr')}})
    # Neutral studio; common fixed cameras, not auto-framed per candidate.
    floor_mat = material('studio_grey', (.13, .15, .17), 0, .8)
    box('studio_floor', (0, 0, -.035), (200, 200, .04), floor_mat)
    world = bpy.data.worlds.new('studio')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.38, .43, .50, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .45
    for loc, power, size in (((-3, -4, 6), 650, 4), ((4, 1, 5), 850, 3), ((-2, 4, 3), 550, 3)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy, light.data.size = power, size
        light.rotation_euler = (Vector((0, 0, .4)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    scene.camera = camera
    camera.data.type, camera.data.ortho_scale = 'ORTHO', 4.0
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.threads_mode, scene.render.threads = 'FIXED', 4
    scene.render.resolution_x, scene.render.resolution_y = 840, 520
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    positions = ((3.7, -5, 2.4), (6, 0, 1.45), (0, 6, 1.55), (-3.7, 5, 2.4), (0, .001, 7))
    for view, loc in zip(views, positions):
        if args.views and view not in args.views:
            continue
        camera.location = loc
        camera.rotation_euler = (Vector((0, 0, .48)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        if view == 'above':
            camera.rotation_euler.rotate_axis('Z', math.pi / 2)
        scene.render.filepath = str(dest / (view + '.png'))
        bpy.ops.render.render(write_still=True)
    (out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print('SPEIRLING_FINAL', json.dumps(summary))
