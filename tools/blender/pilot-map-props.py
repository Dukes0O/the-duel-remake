# Art for the pilot's map (MAP-ART, docs/PILOT_MAP.md sections 5 and 6): the five
# signs of the secret courses, readable from 60 m up and nearly invisible from a
# car, and The Table (a red-rock mesa with a steel fire lookout, a 1950s bush plane
# wreck, a dirt strip and the logbook). Original models built from primitives; the
# recipe is the source. No third-party model, texture or photograph was used.
# Metres, glTF +Y up, +Z forward. One GLB each in public/assets/models/pilot-map/:
#   sign-logging-arrows     dirt track patch, five painted arrows pointing +Z;
#                           origin at the middle of the patch on the ground
#   sign-start-grid         worn asphalt with a painted 2 x 6 start grid facing +Z;
#                           origin at the middle of the front line, on the ground
#   sign-fire-pits          ring of eight camp-fire pits (radius 9 m), coals lit;
#                           origin at the ring centre; empties flame_0..7 and
#                           smoke_0..7 where the game's fire and smoke effects go
#   sign-chalk-line         harbour wall top with a chalk start line across it,
#                           the wall runs along Z; origin at the line, on the wall top
#   sign-lighthouse-window  the top of a lighthouse seen from above: gallery, copper
#                           roof and a lit window in the roof facing up; origin at
#                           the gallery floor centre; empty window_light on the pane
#   table-mesa              the mesa; origin at the middle of the flat top (y = 0),
#                           the cliff drops 110 m and the rubble apron meets the desert
#                           at the empty ground_level (y = -165); empties
#                           lookout_spot, wreck_spot, strip_a, strip_b on the top;
#                           UVs and the game's own red-sandstone picture (public/assets/
#                           textures/red-sandstone.png, scaled to 1024 and embedded as a
#                           JPEG), tinted per vertex; three spires and a fin stand off it
#   table-lookout           steel fire lookout tower; origin at the ground under it;
#                           empty logbook_spot on the table in the cab
#   table-plane-wreck       1950s bush plane on its belly; origin on the ground
#                           under the fuselage centre; nose toward -Z; the tail
#                           number N4471K is on the fin and the rear fuselage; one baked
#                           2048 picture (dust and rust in seams and low surfaces, bare
#                           metal on edges), glass and the number stay flat
#   table-logbook           the bush pilot's logbook open on its last page; origin
#                           at the middle of its underside; empty page_centre
# Run: blender -b --factory-startup --python tools/blender/pilot-map-props.py -- --root . [--only NAMES] [--render DIR]
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--only', default='')
parser.add_argument('--render', default='')
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(options.root).resolve()
NAMES = ['sign-logging-arrows', 'sign-start-grid', 'sign-fire-pits', 'sign-chalk-line', 'sign-lighthouse-window',
         'table-mesa', 'table-lookout', 'table-plane-wreck', 'table-logbook']
OUT = root / 'public/assets/models/pilot-map'
BLEND = root / 'art-build/pilot-map'
if options.paths_only:
    print(json.dumps({'blend': [str(BLEND / f'{n}.blend') for n in NAMES], 'glb': [str(OUT / f'{n}.glb') for n in NAMES], 'json': []}))
    sys.exit(0)

import bpy, bmesh, random
from mathutils import Vector, noise

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, colour, metal=0.0, rough=0.7, emit=None, strength=2.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*colour, 1); b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m

def mats():
    return {
        # ground and stone
        'dirt': material('track_dirt', (0.23, 0.15, 0.09), 0.0, 0.97),
        'rut': material('wheel_rut', (0.15, 0.10, 0.065), 0.0, 0.98),
        'asphalt': material('old_asphalt', (0.085, 0.085, 0.09), 0.0, 0.92),
        'asphalt_pale': material('sunbleached_asphalt', (0.17, 0.165, 0.16), 0.0, 0.92),
        'concrete': material('harbour_concrete', (0.30, 0.295, 0.28), 0.0, 0.95),
        'concrete_stain': material('wet_stain', (0.13, 0.135, 0.13), 0.0, 0.8),
        'stone': material('weathered_stone', (0.34, 0.31, 0.27), 0.0, 0.95),
        'stone_dark': material('burnt_stone', (0.11, 0.10, 0.095), 0.0, 0.95),
        'ash': material('ash', (0.30, 0.29, 0.28), 0.0, 1.0),
        'char': material('charred_wood', (0.025, 0.02, 0.018), 0.0, 0.95),
        'coal': material('glowing_coal', (0.30, 0.05, 0.01), 0.0, 0.6, emit=(1.0, 0.32, 0.04), strength=6.0),
        # paint and chalk
        'paint': material('faded_white_paint', (0.66, 0.65, 0.58), 0.0, 0.9),
        'paint_yellow': material('faded_yellow_paint', (0.62, 0.50, 0.14), 0.0, 0.9),
        'chalk': material('chalk', (0.78, 0.77, 0.72), 0.0, 1.0),
        # metal
        'steel': material('rusted_steel', (0.27, 0.15, 0.09), 0.7, 0.72),
        'steel_grey': material('weathered_grey_steel', (0.25, 0.26, 0.26), 0.8, 0.6),
        'steel_green': material('faded_lookout_green', (0.15, 0.22, 0.17), 0.3, 0.75),
        'wood': material('grey_timber', (0.30, 0.25, 0.19), 0.0, 0.9),
        'wood_dark': material('dark_timber', (0.13, 0.10, 0.075), 0.0, 0.92),
        'copper': material('patinated_copper', (0.16, 0.34, 0.27), 0.5, 0.55),
        'brass': material('old_brass', (0.42, 0.30, 0.08), 0.9, 0.45),
        'glass': material('dusty_glass', (0.05, 0.07, 0.08), 0.0, 0.12),
        'lit_glass': material('lit_window', (0.95, 0.72, 0.30), 0.0, 0.2, emit=(1.0, 0.72, 0.28), strength=9.0),
        # the Table
        'rock_cap': material('mesa_caprock', (0.19, 0.085, 0.055), 0.0, 0.97),
        'rock_red': material('mesa_red', (0.40, 0.125, 0.07), 0.0, 0.97),
        'rock_orange': material('mesa_orange', (0.53, 0.20, 0.09), 0.0, 0.97),
        'rock_ochre': material('mesa_ochre', (0.60, 0.34, 0.16), 0.0, 0.97),
        'rock_buff': material('mesa_buff', (0.66, 0.48, 0.31), 0.0, 0.97),
        'rock_brown': material('mesa_talus', (0.36, 0.19, 0.115), 0.0, 0.98),
        'top_soil': material('mesa_top_soil', (0.47, 0.28, 0.17), 0.0, 0.98),
        'scrub': material('dry_scrub', (0.33, 0.30, 0.16), 0.0, 0.95),
        # the plane
        'skin': material('faded_cream_skin', (0.52, 0.48, 0.37), 0.15, 0.85),
        'skin_dirt': material('dust_on_skin', (0.40, 0.33, 0.23), 0.0, 0.95),
        'skin_burn': material('scorch_on_skin', (0.17, 0.14, 0.11), 0.0, 0.9),
        'rust_dark': material('dark_rust', (0.16, 0.08, 0.05), 0.5, 0.85),
        'rust_orange': material('orange_rust', (0.42, 0.18, 0.06), 0.4, 0.85),
        'trim': material('faded_orange_trim', (0.46, 0.15, 0.06), 0.15, 0.85),
        'bare': material('bare_aluminium', (0.55, 0.56, 0.57), 0.9, 0.38),
        'rubber': material('perished_rubber', (0.035, 0.035, 0.035), 0.0, 0.9),
        'number': material('tail_number_paint', (0.09, 0.075, 0.07), 0.0, 0.8),
        # the logbook
        'leather': material('worn_leather', (0.15, 0.075, 0.045), 0.0, 0.7),
        'page': material('aged_page', (0.52, 0.44, 0.28), 0.0, 0.92),
        'ink': material('pencil_lines', (0.10, 0.10, 0.11), 0.0, 0.9),
        'pencil': material('pencil_yellow', (0.65, 0.48, 0.07), 0.0, 0.5),
        'graphite': material('graphite', (0.05, 0.05, 0.055), 0.2, 0.4),
        'ribbon': material('ribbon_red', (0.35, 0.04, 0.03), 0.0, 0.8),
    }

# ---- primitives (Blender is Z-up and the exporter maps Blender -Y to glTF +Z) ----------------

def link(ob):
    bpy.context.scene.collection.objects.link(ob); return ob

def mesh_obj(name, mat, verts, faces):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); link(ob)
    for mm in (mat if isinstance(mat, (list, tuple)) else [mat]): me.materials.append(mm)
    return ob

def box(name, mat, size, loc, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 1
        bpy.ops.object.modifier_apply(modifier='bevel')
    return ob

def cyl(name, mat, r, depth, loc, rot=(0, 0, 0), verts=12, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.active_object; ob.name = name; ob.data.materials.append(mat); return ob

def tube(name, mat, points, radius, res=0):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = radius; cu.bevel_resolution = res; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points): p.co = (*co, 1)
    ob = bpy.data.objects.new(name, cu); link(ob)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat); return ob

def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]; bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = name; ob.data.name = name; return ob

def text(name, body, size, loc, rot, mat):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = 0.004
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    ob = bpy.data.objects.new(name, cu); link(ob)
    ob.location = loc; ob.rotation_euler = rot
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob = bpy.context.active_object
    ob.data.materials.clear(); ob.data.materials.append(mat); return ob

def empty(name, loc, rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); e.location = loc; e.rotation_euler = rot; link(e); return e

def smooth(ob, angle=50):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))

def rock(name, mat, loc, size, rng, squash=0.7, subdiv=1):
    """A low-poly boulder: an ico sphere with its points pushed about."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=1, location=loc)
    ob = bpy.context.active_object; ob.name = name
    for v in ob.data.vertices:
        k = 0.72 + rng.random() * 0.5
        v.co = Vector((v.co.x * size[0] * k, v.co.y * size[1] * k, v.co.z * size[2] * squash * k))
    ob.data.materials.append(mat); smooth(ob, 40); return ob

def weather(ob, base_name, alts, scale=0.6, lo=0.0, seed=0.0):
    """Patchy wear: where a noise passes `lo`, faces of the base material take one of the worn materials."""
    me = ob.data
    names = [mm.name for mm in me.materials if mm]
    if base_name not in names: return
    base = names.index(base_name)
    ids = []
    for a in alts:
        if a.name not in [mm.name for mm in me.materials if mm]: me.materials.append(a)
        ids.append([mm.name for mm in me.materials if mm].index(a.name))
    for pl in me.polygons:
        if pl.material_index != base: continue
        c = pl.center
        n = noise.noise(Vector((c.x * scale + seed, c.y * scale, c.z * scale)))
        if n > lo: pl.material_index = ids[min(len(ids) - 1, int((n - lo) * len(ids) / (1.0 - lo)))]

STONE_TILE = 22.0   # metres of rock per repeat of the sandstone picture

def sandstone_material(name='mesa_sandstone', size=1024):
    """The game's own weathered sandstone picture (public/assets/textures/red-sandstone.png), scaled down and
    stored as a JPEG inside the GLB, multiplied by a per-vertex tint so the strata read in different shades."""
    BLEND.mkdir(parents=True, exist_ok=True)
    src = bpy.data.images.load(str(root / 'public/assets/textures/red-sandstone.png'))
    src.scale(size, size)
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'JPEG'; scene.render.image_settings.quality = 82
    small = BLEND / 'red-sandstone-1024.jpg'
    src.save_render(str(small), scene=scene)
    bpy.data.images.remove(src)
    img = bpy.data.images.load(str(small)); img.name = 'red_sandstone'; img.colorspace_settings.name = 'sRGB'
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.extension = 'REPEAT'
    tint = nt.nodes.new('ShaderNodeVertexColor'); tint.layer_name = 'tint'
    mix = nt.nodes.new('ShaderNodeMixRGB'); mix.blend_type = 'MULTIPLY'; mix.inputs['Fac'].default_value = 1.0
    nt.links.new(tex.outputs['Color'], mix.inputs['Color1']); nt.links.new(tint.outputs['Color'], mix.inputs['Color2'])
    nt.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.97; bsdf.inputs['Metallic'].default_value = 0.0
    return mat

def triplanar_uv(ob, tile=STONE_TILE):
    """UVs by the face's main axis from world positions (the object's transform applied first)."""
    me = ob.data
    if not me.uv_layers: me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    for pl in me.polygons:
        n = pl.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for li in pl.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = ((v.x, v.y) if ax == 2 else (v.x, v.z) if ax == 1 else (v.y, v.z))
            uv[li].uv = (uv[li].uv[0] / tile, uv[li].uv[1] / tile)

def set_tint(ob, fn):
    """Per-corner colour tint: fn(polygon_centre) -> (r, g, b)."""
    me = ob.data
    layer = me.color_attributes.new('tint', 'BYTE_COLOR', 'CORNER')
    for pl in me.polygons:
        r, g, b = fn(pl.center)
        for li in pl.loop_indices: layer.data[li].color = (r, g, b, 1.0)

def apply_object(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def angular_block(name, mat, loc, size, rng):
    """A fallen block: a box with its corners pushed about and its edges chipped."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.transform_apply(scale=True)
    for v in ob.data.vertices:
        v.co = Vector((v.co.x * size[0] * (0.7 + rng.random() * 0.5), v.co.y * size[1] * (0.7 + rng.random() * 0.5), v.co.z * size[2] * (0.7 + rng.random() * 0.5)))
    ob.rotation_euler = (rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12), rng.uniform(0, 3.14))
    ob.data.materials.append(mat)
    mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = max(size) * 0.05; mod.segments = 1; mod.limit_method = 'ANGLE'
    bpy.ops.object.modifier_apply(modifier='bevel')
    return ob

def grid_surface(name, mat, sx, sy, nx, ny, height, z0=0.0):
    """A flat patch sx by sy (X by Y) with a height function height(x, y)."""
    verts = [(-sx / 2 + sx * i / nx, -sy / 2 + sy * j / ny, 0.0) for j in range(ny + 1) for i in range(nx + 1)]
    verts = [(x, y, z0 + height(x, y)) for x, y, _ in verts]
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i)
             for j in range(ny) for i in range(nx)]
    ob = mesh_obj(name, mat, verts, faces); smooth(ob, 60); return ob

def paint_cells(name, mat, inside, x0, x1, y0, y1, cell, z, wear, seed, base=None):
    """Paint as small worn cells: a cell is kept where inside(x, y) holds, and dropped
    where the worn-away noise is high. `base` gives the ground height under the paint."""
    rng = random.Random(seed); verts = []; faces = []
    nx = max(1, int(round((x1 - x0) / cell))); ny = max(1, int(round((y1 - y0) / cell))); dx = (x1 - x0) / nx; dy = (y1 - y0) / ny
    for j in range(ny):
        for i in range(nx):
            cx = x0 + (i + 0.5) * dx; cy = y0 + (j + 0.5) * dy
            if not inside(cx, cy): continue
            n = noise.noise(Vector((cx * 0.9 + seed, cy * 0.9, 0.5))) * 0.5 + 0.5
            if n > 1.0 - wear or rng.random() < wear * 0.28: continue
            k = len(verts)
            for (px, py) in ((cx - dx / 2, cy - dy / 2), (cx + dx / 2, cy - dy / 2), (cx + dx / 2, cy + dy / 2), (cx - dx / 2, cy + dy / 2)):
                zz = z + (base(px, py) if base else 0.0)
                verts.append((px + (rng.random() - 0.5) * dx * 0.18, py + (rng.random() - 0.5) * dy * 0.18, zz))
            faces.append((k, k + 1, k + 2, k + 3))
    return mesh_obj(name, mat, verts, faces)

def in_poly(x, y, pts):
    inside = False; j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]; xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
        j = i
    return inside

def loft(name, mat, stations, ring=12, caps=True, subdiv=1):
    """Stations (y, cx, cz, half_width, half_height, squareness) along Blender Y; a rounded-box ring each."""
    if subdiv > 1:
        dense = []
        for a_, b_ in zip(stations[:-1], stations[1:]):
            for q in range(subdiv): dense.append(tuple(a_[i] + (b_[i] - a_[i]) * q / subdiv for i in range(6)))
        dense.append(stations[-1]); stations = dense
    verts = []; faces = []
    for (y, cx, cz, w, h, sq) in stations:
        for k in range(ring):
            a = 2 * math.pi * k / ring; c = math.cos(a); s = math.sin(a)
            e = 2.0 / (2.0 + 2.0 * sq)
            px = w * math.copysign(abs(c) ** e, c); pz = h * math.copysign(abs(s) ** e, s)
            verts.append((cx + px, y, cz + pz))
    n = len(stations)
    for i in range(n - 1):
        for k in range(ring):
            a = i * ring + k; b = i * ring + (k + 1) % ring
            faces.append((a, b, b + ring, a + ring))
    if caps:
        faces.append(tuple(range(ring - 1, -1, -1))); faces.append(tuple((n - 1) * ring + k for k in range(ring)))
    ob = mesh_obj(name, mat, verts, faces); smooth(ob, 55); return ob

# ---- the five signs ------------------------------------------------------------------------

def build_logging_arrows(m):
    # Paint only: the old logging track is the game's own ground. Five arrows, one every 6.5 m, each 4.6 m
    # long, pointing +Z (Blender -Y), the paint dry and flaking with a dusty smear across them.
    flat = lambda x, y: 0.0
    parts = []
    for i in range(5):
        y0 = 15.0 - i * 7.5
        tip = lambda x, y, y0=y0: (y0 - 2.8) <= y <= (y0 - 1.1) and abs(x) < (y - (y0 - 2.8)) * 0.66
        shape = lambda x, y, y0=y0: (abs(x) < 0.33 and y0 - 1.1 <= y <= y0 + 2.6) or tip(x, y)
        parts.append(paint_cells(f'arrow{i}', m['paint'], shape, -1.5, 1.5, y0 - 2.9, y0 + 2.7, 0.11, 0.02, 0.40, 20 + i, base=flat))
    # Wheel scuffs where trucks drove over them.
    for k in range(7):
        sx = (-0.9 if k % 2 else 0.9) + (k % 3) * 0.05
        parts.append(paint_cells(f'scuff{k}', m['rut'], lambda x, y: abs(x - sx) < 0.2 and noise.noise(Vector((x * 4, y * 0.8, k))) > -0.2, sx - 0.3, sx + 0.3, -19.0 + k * 5.5, -15.0 + k * 5.5, 0.18, 0.024, 0.4, 90 + k, base=flat))
    return join('sign-logging-arrows', parts)

def build_start_grid(m):
    rng = random.Random(3)
    flat = lambda x, y: 0.0
    # Paint only, on the game's own road: two columns of six slots, 2.6 m by 5.2 m, outlined 0.22 m wide,
    # a heavy line across the front (y = 0); the cars face +Z (Blender -Y).
    parts = []
    def slot(cx, row):
        y1 = 1.2 + row * 6.0; y0 = y1 - 5.2
        def shape(x, y, cx=cx, y0=y0, y1=y1):
            ix = abs(x - cx) <= 1.3; iy = y0 <= y <= y1
            return (abs(abs(x - cx) - 1.2) < 0.11 and iy) or (abs(y - y1) < 0.11 and ix) or (abs(y - y0) < 0.11 and ix)
        return paint_cells(f'slot{row}{cx}', m['paint'], shape, cx - 1.5, cx + 1.5, y0 - 0.1, y1 + 0.1, 0.12, 0.014, 0.40, 40 + row * 3 + int(cx), base=flat)
    for row in range(6):
        for cx in (-3.2, 3.2):
            parts.append(slot(cx, row))
    parts.append(paint_cells('front_line', m['paint'], lambda x, y: abs(y) < 0.30 and abs(x) < 7.2, -7.4, 7.4, -0.4, 0.4, 0.12, 0.014, 0.38, 77, base=flat))
    # Tyre rubber laid down by cars that stood on the line once.
    parts.append(paint_cells('rubber', m['asphalt'], lambda x, y: abs(abs(x) - 3.2) < 0.45 and y > -1.0 and noise.noise(Vector((x * 2, y, 3))) > -0.1, -4.0, 4.0, -1.0, 4.0, 0.2, 0.018, 0.4, 55, base=flat))
    return join('sign-start-grid', parts)

def build_fire_pits(m):
    rng = random.Random(21)
    ring_r = 9.0
    flat = lambda x, y: 0.0
    parts = []
    for i in range(8):
        a = 2 * math.pi * i / 8; cx = math.cos(a) * ring_r; cy = math.sin(a) * ring_r
        # trampled, blackened ground round each pit, the ash bed, charred logs, lit coals and a ring of stones.
        parts.append(paint_cells(f'scorch{i}', m['stone_dark'], lambda x, y, cx=cx, cy=cy: math.hypot(x - cx, y - cy) < 1.5 + 0.35 * noise.noise(Vector((x, y, i))), cx - 2.0, cx + 2.0, cy - 2.0, cy + 2.0, 0.22, 0.01, 0.30, 100 + i, base=flat))
        parts.append(cyl(f'ash{i}', m['ash'], 0.66, 0.05, (cx, cy, 0.03), verts=14))
        for k in range(4):
            la = rng.uniform(0, math.pi)
            parts.append(box(f'log{i}_{k}', m['char'], (0.95, 0.14, 0.13), (cx + rng.uniform(-0.14, 0.14), cy + rng.uniform(-0.14, 0.14), 0.13),
                             (rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), la), bevel=0.02))
        parts.append(cyl(f'coals{i}', m['coal'], 0.5, 0.05, (cx, cy, 0.14), verts=10))
        for k in range(12):
            sa = 2 * math.pi * k / 12 + rng.uniform(-0.1, 0.1)
            parts.append(rock(f'stone{i}_{k}', m['stone_dark'] if k % 3 == 0 else m['stone'], (cx + math.cos(sa) * 0.84, cy + math.sin(sa) * 0.84, 0.1),
                              (0.24, 0.21, 0.19), rng, 0.8, 1))
        empty(f'flame_{i}', (cx, cy, 0.3)); empty(f'smoke_{i}', (cx, cy, 0.7))
    return join('sign-fire-pits', parts)

def build_chalk_line(m):
    flat = lambda x, y: 0.0
    # Chalk only, on the harbour wall's top (the wall is the game's own): a start line across it at y = 0 and
    # two chevrons beyond it pointing back, the wrong way round; rubbed by boots and weather.
    parts = [paint_cells('chalk_line', m['chalk'], lambda x, y: abs(y) < 0.3, -1.5, 1.5, -0.34, 0.34, 0.08, 0.01, 0.30, 61, base=flat)]
    for k in range(3):
        y0 = 1.7 + k * 1.3
        shape = lambda x, y, y0=y0: abs(abs(x) - (y - y0) * 1.1) < 0.2 and -0.05 <= y - y0 <= 1.0
        parts.append(paint_cells(f'chevron{k}', m['chalk'], shape, -1.5, 1.5, y0 - 0.1, y0 + 1.1, 0.08, 0.01, 0.34, 70 + k, base=flat))
    parts.append(paint_cells('boot_scuffs', m['chalk'], lambda x, y: noise.noise(Vector((x * 2.2, y * 1.6, 9))) > 0.42, -1.4, 1.4, -2.0, 2.0, 0.12, 0.008, 0.55, 8, base=flat))
    return join('sign-chalk-line', parts)

def build_lighthouse_window(m):
    rng = random.Random(9)
    parts = []
    # The tower top: a round stone gallery (radius 2.5 m) with a low parapet and walkway.
    parts.append(cyl('gallery', m['stone'], 2.55, 0.4, (0, 0, -0.2), verts=40))
    parts.append(cyl('walkway', m['concrete'], 2.45, 0.05, (0, 0, 0.03), verts=40))
    for k in range(24):
        a = 2 * math.pi * k / 24
        parts.append(box(f'post{k}', m['steel_grey'], (0.05, 0.05, 1.0), (math.cos(a) * 2.4, math.sin(a) * 2.4, 0.55)))
    parts.append(tube('rail_top', m['steel_grey'], [(math.cos(2 * math.pi * k / 24) * 2.4, math.sin(2 * math.pi * k / 24) * 2.4, 1.05) for k in range(25)], 0.03))
    parts.append(tube('rail_mid', m['steel_grey'], [(math.cos(2 * math.pi * k / 24) * 2.4, math.sin(2 * math.pi * k / 24) * 2.4, 0.55) for k in range(25)], 0.02))
    # The lantern room's walls and its copper roof: a shallow cone with ribs.
    parts.append(cyl('lantern_wall', m['stone'], 1.55, 1.2, (0, 0, 0.6), verts=32))
    parts.append(cyl('roof', m['copper'], 1.85, 1.35, (0, 0, 1.9), verts=32, r2=0.25))
    for k in range(16):
        a = 2 * math.pi * k / 16
        parts.append(tube(f'rib{k}', m['copper'], [(math.cos(a) * 1.85, math.sin(a) * 1.85, 1.24), (math.cos(a) * 0.28, math.sin(a) * 0.28, 2.55)], 0.03))
    parts.append(cyl('ball', m['brass'], 0.2, 0.4, (0, 0, 2.75), verts=12))
    # The lit window in the roof, facing up: a frame set into the slope, glazing bars, glowing pane.
    wx, wy = 0.0, -0.95
    tilt = math.atan2(1.31, 1.6)   # the cone slope
    pane = box('window_pane', m['lit_glass'], (1.3, 1.15, 0.04), (wx, wy, 1.62), (-tilt * 0.55, 0, 0))
    parts.append(pane)
    for k in (-1, 0, 1):
        parts.append(box(f'bar_v{k}', m['brass'], (0.04, 0.95, 0.06), (wx + k * 0.43, wy, 1.65), (-tilt * 0.55, 0, 0)))
    for k in (-1, 0, 1):
        parts.append(box(f'bar_h{k}', m['brass'], (1.05, 0.04, 0.06), (wx, wy + k * 0.3, 1.62 - k * 0.3 * math.sin(tilt * 0.55) + 0.02), (-tilt * 0.55, 0, 0)))
    parts.append(box('frame', m['copper'], (1.2, 1.1, 0.05), (wx, wy, 1.585), (-tilt * 0.55, 0, 0)))
    # A door to the gallery and some pigeon-stain.
    parts.append(box('door', m['wood_dark'], (0.9, 0.12, 1.7), (0, 1.58, 0.9)))
    empty('window_light', (wx, wy, 1.7))
    return join('sign-lighthouse-window', parts)

# ---- The Table ----------------------------------------------------------------------------

MESA_TOP_R = (215.0, 178.0)    # radii of the flat top along X and Y (the top is about 400 m across)
MESA_H = 110.0                 # sheer sides
MESA_APRON = 55.0              # the talus slope below them
STRATA = ['rock_cap', 'rock_red', 'rock_orange', 'rock_ochre', 'rock_buff', 'rock_red', 'rock_orange']

def build_mesa(m):
    rng = random.Random(41)
    seg = 192; wall_rows = 44; talus_rows = 12; top_rings = 12; NU = 56   # NU: repeats of the picture round the butte
    sand = sandstone_material()
    # Strata of unequal thickness. Each band has a tint (the picture is multiplied by it) and a ledge amount: hard
    # layers stand out, soft ones recess, the caprock overhangs.
    bounds = [0.0, 0.06, 0.19, 0.28, 0.46, 0.57, 0.80, 1.0]
    push = [1.4, -1.0, 1.8, -2.4, 2.0, -1.4, 1.0]
    tints = [(0.40, 0.35, 0.33), (0.80, 0.58, 0.52), (1.00, 0.82, 0.70), (1.00, 0.95, 0.86), (0.96, 0.80, 0.66), (0.70, 0.50, 0.45), (0.86, 0.66, 0.56)]
    def periodic(t, f, z, s0=0.0): return noise.noise(Vector((math.cos(t) * f + s0, math.sin(t) * f + s0, z)))
    def edge(t): return 1.0 + 0.16 * periodic(t, 0.9, 0.3) + 0.12 * periodic(t, 2.1, 1.7) + 0.06 * periodic(t, 4.2, 2.9)
    def band_of(y):
        d = min(0.999, -y / MESA_H)
        for i in range(7):
            if bounds[i] <= d < bounds[i + 1]: return i
        return 6
    def ledge(y):
        d = min(0.999, -y / MESA_H); i = band_of(y); f = (d - bounds[i]) / (bounds[i + 1] - bounds[i]); j = min(6, i + 1)
        return push[i] + (push[j] - push[i]) * max(0.0, (f - 0.82) * 5.5)
    def gully(t, y):
        g = periodic(t, 15.0, y * 0.006, 5.0)
        return -17.0 * max(0.0, g) ** 1.2 * (0.25 + 0.75 * min(1.0, -y / MESA_H))
    def joints(t, y):     # vertical joints break the hard layers into blocks that stand out or have fallen away
        n = periodic(t, 30.0, y * 0.004, 2.0)      # continuous in height, so the joints run down through every layer
        return math.tanh(n * 2.0) * 3.0
    def ring_point(t, r_off, y, scale=1.0):
        e = edge(t)
        return (math.cos(t) * (MESA_TOP_R[0] * e * scale + r_off), math.sin(t) * (MESA_TOP_R[1] * e * scale + r_off), y)
    verts = []; faces = []; kind = []     # kind: 0 top, 1 wall, 2 scree
    top_rows = []
    for i in range(top_rings + 1):
        f = 1.0 - i / top_rings
        row = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            x, y, _ = ring_point(t, 0.0, 0.0, f if f > 0.001 else 0.001)
            rim = -2.2 * (f ** 10) - 2.5 * (f ** 24) * (0.5 + 0.5 * periodic(t, 20.0, 0.4))   # a broken, rounded lip
            z = noise.noise(Vector((x * 0.03, y * 0.03, 5.0))) * 0.7 + rim
            row.append(len(verts)); verts.append((x, y, z))
        top_rows.append(row)
    for i in range(top_rings):
        for k in range(seg):
            a_ = top_rows[i][k]; b_ = top_rows[i][(k + 1) % seg]; c_ = top_rows[i + 1][(k + 1) % seg]; d_ = top_rows[i + 1][k]
            faces.append((a_, d_, c_, b_)); kind.append(0)
    wall = [top_rows[0]]
    for j in range(1, wall_rows + 1):
        y = -MESA_H * j / wall_rows
        row = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            notch = max(0.0, periodic(t, 6.0, 1.3, 7.0) - 0.25) * 38.0 * max(0.0, 1.0 - j / 10.0)   # a slab has sheared off the rim
            off = ledge(y) + gully(t, y) + joints(t, y) + periodic(t, 7.0, y * 0.045) * 3.5 - notch \
                + periodic(t, 3.2, y * 0.01, 3.0) * 28.0 * (0.3 + 0.7 * j / wall_rows) + periodic(t, 1.8, y * 0.012, 3.0) * 11.0 * (j / wall_rows) \
                + periodic(t, 23.0, y * 0.11, 8.0) * 1.3
            x, yy, _ = ring_point(t, off, y)
            row.append(len(verts)); verts.append((x, yy, y))
        wall.append(row)
    for j in range(wall_rows):
        for k in range(seg):
            a_ = wall[j][k]; b_ = wall[j][(k + 1) % seg]; c_ = wall[j + 1][(k + 1) % seg]; d_ = wall[j + 1][k]
            faces.append((a_, d_, c_, b_)); kind.append(1)
    prev = wall[-1]
    for q in range(1, talus_rows + 1):
        y = -MESA_H - MESA_APRON * q / talus_rows
        row = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            chute = max(0.0, periodic(t, 15.0, 0.5, 5.0)) * 15.0 * (q / talus_rows)
            off = periodic(t, 7.0, y * 0.045) * 4.5 + periodic(t, 1.8, 0.7, 3.0) * 11.0 + q * (8.0 + periodic(t, 3.0, q * 0.4) * 5.0) + chute \
                + (rng.random() - 0.5) * 9.0 + periodic(t, 3.2, 0.2, 3.0) * 22.0 + periodic(t, 18.0, q * 0.7, 4.0) * 9.0 * (q / talus_rows)
            x, yy, _ = ring_point(t, off, y)
            row.append(len(verts)); verts.append((x, yy, y + (rng.random() - 0.5) * 5.0))
        for k in range(seg):
            a_ = prev[k]; b_ = prev[(k + 1) % seg]; c_ = row[(k + 1) % seg]; d_ = row[k]
            faces.append((a_, d_, c_, b_)); kind.append(2)
        prev = row
    mesa = mesh_obj('mesa', sand, verts, faces)
    smooth(mesa, 58)
    # UVs: the wall and apron wrap round the butte (NU repeats, seam handled per corner), the top is planar.
    me = mesa.data; me.uv_layers.new(name='UVMap'); uv = me.uv_layers.active.data
    for pl, kd in zip(me.polygons, kind):
        for li in pl.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            if kd == 0: uv[li].uv = (v.x / STONE_TILE, v.y / STONE_TILE)
            else:
                ang = math.atan2(v.y / MESA_TOP_R[1], v.x / MESA_TOP_R[0]) / (2 * math.pi)
                uv[li].uv = (ang * NU, v.z / STONE_TILE)
        if kd:
            ref = uv[pl.loop_indices[0]].uv[0]
            for li in pl.loop_indices:
                u, w = uv[li].uv
                while u - ref > NU / 2: u -= NU
                while u - ref < -NU / 2: u += NU
                uv[li].uv = (u, w)
    # Tints: the band's, with slow streaks and dark varnish where the chutes run.
    def tint_mesa(c, kd):
        if kd == 0: return (0.62, 0.50, 0.42)
        if kd == 2:
            sh = 0.62 + 0.25 * (noise.noise(Vector((c.x * 0.03, c.y * 0.03, 1.0))) * 0.5 + 0.5)
            return (sh, sh * 0.82, sh * 0.72)
        bi = band_of(c.z); r, g, b_ = tints[bi]
        t = math.atan2(c.y, c.x)
        n = noise.noise(Vector((math.cos(t) * 5.0, math.sin(t) * 5.0, c.z * 0.004 + bi)))
        k = 0.86 + 0.16 * n
        if gully(t, c.z) < -5.0: k *= 0.55; g *= 0.9
        return (min(1.0, r * k), min(1.0, g * k), min(1.0, b_ * k))
    layer = me.color_attributes.new('tint', 'BYTE_COLOR', 'CORNER')
    for pl, kd in zip(me.polygons, kind):
        col = tint_mesa(pl.center, kd)
        for li in pl.loop_indices: layer.data[li].color = (*col, 1.0)
    parts = [mesa]
    def finish(ob, tint, uvs=True):
        apply_object(ob)
        if uvs: triplanar_uv(ob)
        set_tint(ob, lambda c, tint=tint: tint)
        return ob
    # Fallen blocks round the foot (angular, some as big as a house) and scree in several sizes.
    for n in range(110):
        t = rng.uniform(0, 2 * math.pi); r = rng.uniform(1.03, 1.55)
        x = math.cos(t) * MESA_TOP_R[0] * edge(t) * r; y = math.sin(t) * MESA_TOP_R[1] * edge(t) * r
        sz = rng.uniform(3.0, 14.0) * (1.0 if n % 9 else 1.4)
        sh = rng.uniform(0.55, 0.95)
        parts.append(finish(angular_block(f'block{n}', sand, (x, y, -MESA_H - MESA_APRON * min(1.0, (r - 1.0) * 2.0) + sz * 0.3), (sz, sz * 0.85, sz * 0.7), rng), (sh, sh * 0.82, sh * 0.72)))
    for n in range(110):
        t = rng.uniform(0, 2 * math.pi); r = rng.uniform(1.0, 1.9)
        x = math.cos(t) * MESA_TOP_R[0] * edge(t) * r; y = math.sin(t) * MESA_TOP_R[1] * edge(t) * r
        zz = -MESA_H - MESA_APRON * min(1.0, (r - 1.0) * 1.6)
        sz = rng.uniform(0.6, 3.2); sh = rng.uniform(0.5, 0.95)
        parts.append(finish(rock(f'scree{n}', sand, (x, y, zz + sz * 0.15), (sz, sz, sz), rng, 0.6, 1), (sh, sh * 0.8, sh * 0.7)))
    # Rocks and dry scrub on the top.
    for n in range(80):
        t = rng.uniform(0, 2 * math.pi); r = math.sqrt(rng.random()) * 0.93
        x = math.cos(t) * MESA_TOP_R[0] * edge(t) * r; y = math.sin(t) * MESA_TOP_R[1] * edge(t) * r
        sz = rng.uniform(0.4, 1.8); sh = rng.uniform(0.55, 0.9)
        parts.append(finish(rock(f'stone{n}', sand, (x, y, 0.0), (sz, sz, sz), rng, 0.55, 1), (sh, sh * 0.8, sh * 0.7)))
    for n in range(50):
        t = rng.uniform(0, 2 * math.pi); r = math.sqrt(rng.random()) * 0.9
        x = math.cos(t) * MESA_TOP_R[0] * edge(t) * r; y = math.sin(t) * MESA_TOP_R[1] * edge(t) * r
        parts.append(finish(rock(f'scrub{n}', m['scrub'], (x, y, 0.1), (0.8, 0.8, 0.5), rng, 1.0, 1), (1.0, 1.0, 1.0), uvs=False))
    # Detached spires and a fin, the way a butte sheds them: stacked blocks that taper, each a little off the last.
    def spire(name, cx, cy, height, r0, lean, fin=False):
        """One tapering column, fluted and fractured: rings of an eight-sided shape, a little off the last."""
        rows = 16; ring = 10; base = -MESA_H - MESA_APRON; vs = []; fs = []
        for q in range(rows + 1):
            f = q / rows
            r = r0 * (1.0 - 0.5 * f ** 1.2) * (1.0 + 0.10 * noise.noise(Vector((f * 6.0, cx, 4.0)))) * (1.0 + 0.5 * max(0.0, 0.12 - f) / 0.12)
            ox = cx + lean * f * 12.0 + noise.noise(Vector((f * 4.0, cx, 1.0))) * 3.0; oy = cy + noise.noise(Vector((f * 4.0, cy, 2.0))) * 3.0
            for k in range(ring):
                a_ = 2 * math.pi * k / ring; kk = 0.78 + 0.34 * (noise.noise(Vector((math.cos(a_) * 2.0 + cx, math.sin(a_) * 2.0, f * 5.0))) * 0.5 + 0.5)
                vs.append((ox + math.cos(a_) * r * kk * (2.2 if fin else 1.0), oy + math.sin(a_) * r * kk, base + height * f))
        for q in range(rows):
            for k in range(ring):
                a2 = q * ring + k; b2 = q * ring + (k + 1) % ring
                fs.append((a2, b2, b2 + ring, a2 + ring))
        fs.append(tuple(range(ring - 1, -1, -1))); fs.append(tuple(rows * ring + k for k in range(ring)))
        ob = mesh_obj(name, sand, vs, fs); smooth(ob, 60)
        return [finish(ob, (0.78, 0.58, 0.5))]
    parts += spire('spire_a', -330.0, -250.0, 95.0, 19.0, 0.5)
    parts += spire('spire_b', -295.0, -305.0, 60.0, 12.0, -0.4)
    parts += spire('fin_c', 370.0, 110.0, 78.0, 13.0, 0.3, fin=True)
    mesh = join('table-mesa', parts)
    smooth(mesh, 58)
    empty('top_centre', (0, 0, 0))
    empty('lookout_spot', (-150.0, 6.0, 0.0))
    empty('wreck_spot', (118.0, -52.0, 0.0))
    empty('strip_a', (-60.0, -40.0, 0.0))
    empty('strip_b', (96.0, -40.0, 0.0))
    empty('ground_level', (0, 0, -MESA_H - MESA_APRON))
    return mesh

def build_lookout(m):
    rng = random.Random(17)
    parts = []
    base = 3.0; top = 1.75; height = 10.0
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    legs = []
    for (sx, sy) in corners:
        legs.append(tube(f'leg{sx}{sy}', m['steel'], [(sx * base, sy * base, 0.0), (sx * top, sy * top, height)], 0.09, 1))
        parts.append(cyl(f'footing{sx}{sy}', m['concrete'], 0.35, 0.3, (sx * base, sy * base, 0.1), verts=8))
    parts += legs
    levels = [0.0, 3.4, 6.7, height]
    def half(z): return base + (top - base) * z / height
    for z0, z1 in zip(levels[:-1], levels[1:]):
        for (sx, sy), (nx_, ny_) in zip(corners, corners[1:] + corners[:1]):
            h0 = half(z0); h1 = half(z1)
            parts.append(tube(f'brace_a{z0}{sx}{sy}', m['steel'], [(sx * h0, sy * h0, z0), (nx_ * h1, ny_ * h1, z1)], 0.028))
            parts.append(tube(f'brace_b{z0}{sx}{sy}', m['steel'], [(nx_ * h0, ny_ * h0, z0), (sx * h1, sy * h1, z1)], 0.028))
        for z in (z1,):
            h = half(z)
            parts.append(tube(f'strut{z}', m['steel'], [(-h, -h, z), (h, -h, z), (h, h, z), (-h, h, z), (-h, -h, z)], 0.05))
    # Landings and the stair: three flights climbing the faces, steps of grating.
    for zi, z in enumerate(levels[1:3]):
        h = half(z)
        parts.append(box(f'landing{zi}', m['steel_grey'], (1.3, 1.3, 0.06), (h - 0.6, -h + 0.55 if zi == 0 else h - 0.55, z)))
    steps = 14
    for flight, (z0, z1, face) in enumerate([(0.0, 3.4, 0), (3.4, 6.7, 1), (6.7, height, 2)]):
        for s in range(steps):
            z = z0 + (z1 - z0) * s / steps; f = s / steps
            h = half(z) + 0.05
            if face == 0: loc = (h - 1.0 + f * 0.0, -h + 0.0 + f * (2 * h - 1.2) * 0.0, z)
            if face == 0: loc = (-h + 0.3 + f * (2 * h - 1.0), -h - 0.08, z + 0.1)
            elif face == 1: loc = (h + 0.08, -h + 0.3 + f * (2 * h - 1.0), z + 0.1)
            else: loc = (h - 0.3 - f * (2 * h - 1.0), h + 0.08, z + 0.1)
            parts.append(box(f'step{flight}_{s}', m['steel_grey'], (0.34, 0.84, 0.035) if face != 1 else (0.84, 0.34, 0.035), loc))
        a = half(z0) + 0.1; b = half(z1) + 0.1
        if face == 0:
            parts.append(tube(f'handrail{flight}', m['steel'], [(-a + 0.3, -a - 0.45, z0 + 1.0), (a - 0.7, -b - 0.45, z1 + 1.0)], 0.022))
        elif face == 1:
            parts.append(tube(f'handrail{flight}', m['steel'], [(a + 0.45, -a + 0.3, z0 + 1.0), (b + 0.45, a - 0.7, z1 + 1.0)], 0.022))
        else:
            parts.append(tube(f'handrail{flight}', m['steel'], [(a - 0.3, a + 0.45, z0 + 1.0), (-b + 0.7, b + 0.45, z1 + 1.0)], 0.022))
    # The catwalk, 4.8 m square, with a rail; then the cab 3.6 m square with windows and a hip roof.
    parts.append(box('catwalk', m['steel_grey'], (4.8, 4.8, 0.08), (0, 0, height + 0.04)))
    for k in range(-6, 7):
        for side in ((k * 0.4, 2.38), (k * 0.4, -2.38), (2.38, k * 0.4), (-2.38, k * 0.4)):
            if abs(k) % 2 == 0: parts.append(box(f'rail_post{k}{side}', m['steel'], (0.04, 0.04, 1.0), (side[0], side[1], height + 0.55)))
    for pts in ([(-2.4, -2.4), (2.4, -2.4)], [(2.4, -2.4), (2.4, 2.4)], [(2.4, 2.4), (-2.4, 2.4)], [(-2.4, 2.4), (-2.4, -2.4)]):
        parts.append(tube('rail', m['steel'], [(pts[0][0], pts[0][1], height + 1.05), (pts[1][0], pts[1][1], height + 1.05)], 0.022))
        parts.append(tube('rail_mid', m['steel'], [(pts[0][0], pts[0][1], height + 0.55), (pts[1][0], pts[1][1], height + 0.55)], 0.016))
    cab = 1.8; cz = height + 0.08
    parts.append(box('cab_floor', m['wood_dark'], (2 * cab, 2 * cab, 0.1), (0, 0, cz)))
    for (px, py) in corners:
        parts.append(box(f'post{px}{py}', m['steel_green'], (0.12, 0.12, 2.1), (px * cab, py * cab, cz + 1.05)))
    for side in range(4):
        a = side * math.pi / 2; c, s = math.cos(a), math.sin(a)
        def w(u, z, du, dz, mat, thick=0.07):
            return box(f'wall{side}', mat, (du, thick, dz) if side % 2 == 0 else (thick, du, dz), (c * 0 + (u * s if side % 2 == 0 else cab * c * 1.0), (cab * (-1 if side == 0 else 1) if side % 2 == 0 else u * (-c)), z))
        sx = -1 if side == 0 else 1
        if side % 2 == 0:
            parts.append(box(f'sill{side}', m['steel_green'], (2 * cab, 0.07, 0.95), (0, sx * cab, cz + 0.55)))
            parts.append(box(f'header{side}', m['steel_green'], (2 * cab, 0.07, 0.25), (0, sx * cab, cz + 1.98)))
            for k in range(3):
                if side == 2 and k == 1: continue   # a window blown out on the north side
                parts.append(box(f'pane{side}{k}', m['glass'], (1.0, 0.03, 0.78), (-1.15 + k * 1.15, sx * cab, cz + 1.45)))
            for k in range(4):
                parts.append(box(f'mullion{side}{k}', m['steel_green'], (0.06, 0.09, 0.82), (-1.7 + k * 1.13, sx * cab, cz + 1.45)))
        else:
            sy = 1 if side == 1 else -1
            parts.append(box(f'sill{side}', m['steel_green'], (0.07, 2 * cab, 0.95), (sy * cab, 0, cz + 0.55)))
            parts.append(box(f'header{side}', m['steel_green'], (0.07, 2 * cab, 0.25), (sy * cab, 0, cz + 1.98)))
            for k in range(3):
                parts.append(box(f'pane{side}{k}', m['glass'], (0.03, 1.0, 0.78), (sy * cab, -1.15 + k * 1.15, cz + 1.45)))
            for k in range(4):
                parts.append(box(f'mullion{side}{k}', m['steel_green'], (0.09, 0.06, 0.82), (sy * cab, -1.7 + k * 1.13, cz + 1.45)))
    roof = cyl('roof', m['steel'], 2.9, 0.9, (0, 0, cz + 2.55), (0, 0, math.radians(45)), verts=4, r2=0.18)
    parts.append(roof)
    parts.append(tube('rod', m['steel_grey'], [(0, 0, cz + 3.0), (0, 0, cz + 4.2)], 0.018))
    # In the cab: a plank table with the logbook spot, a stool, a tin stove.
    parts.append(box('table_top', m['wood'], (1.1, 0.6, 0.05), (-0.7, -0.9, cz + 0.92)))
    for (tx, ty) in ((-1.2, -1.15), (-0.2, -1.15), (-1.2, -0.65), (-0.2, -0.65)):
        parts.append(box('table_leg', m['wood_dark'], (0.05, 0.05, 0.85), (tx, ty, cz + 0.5)))
    parts.append(cyl('stool', m['wood'], 0.18, 0.04, (0.5, -0.4, cz + 0.48), verts=10))
    parts.append(tube('stool_leg', m['wood_dark'], [(0.5, -0.4, cz + 0.05), (0.5, -0.4, cz + 0.48)], 0.03))
    parts.append(cyl('stove', m['steel_grey'], 0.22, 0.6, (1.1, 1.0, cz + 0.4), verts=10))
    parts.append(tube('stovepipe', m['steel_grey'], [(1.1, 1.0, cz + 0.7), (1.1, 1.0, cz + 2.3)], 0.05))
    empty('logbook_spot', (-0.7, -0.9, cz + 0.95))
    tower = join('table-lookout', parts)
    weather(tower, 'rusted_steel', [m['rust_dark'], m['rust_orange']], 0.9, -0.05, 1.0)
    weather(tower, 'faded_lookout_green', [m['rust_dark'], m['steel_grey']], 1.4, 0.25, 3.0)
    weather(tower, 'grey_timber', [m['wood_dark']], 1.5, 0.0, 2.0)
    return tower

def wear_nodes(nt, bsdf, base, bare):
    """Dust that gathers in crevices, panel seams and low surfaces, rust in the crevices, bare metal on the
    edges: a colour network feeding Base Color, to be baked into a picture."""
    nodes, links = nt.nodes, nt.links
    def node(kind, **values):
        nd = nodes.new(kind)
        for k, v in values.items(): setattr(nd, k, v)
        return nd
    def val(nd, name, v): nd.inputs[name].default_value = v
    def math_(op, a, b=None, clamp=False):
        nd = node('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, x in enumerate((a, b)):
            if x is None: continue
            if isinstance(x, (int, float)): nd.inputs[i].default_value = x
            else: links.new(x, nd.inputs[i])
        return nd.outputs[0]
    tc = node('ShaderNodeTexCoord'); sep = node('ShaderNodeSeparateXYZ'); links.new(tc.outputs['Object'], sep.inputs[0])
    ao = node('ShaderNodeAmbientOcclusion', samples=12); val(ao, 'Distance', 0.5)
    n1 = node('ShaderNodeTexNoise'); val(n1, 'Scale', 5.0); val(n1, 'Detail', 8.0); links.new(tc.outputs['Object'], n1.inputs['Vector'])
    n2 = node('ShaderNodeTexNoise'); val(n2, 'Scale', 13.0); val(n2, 'Detail', 6.0); links.new(tc.outputs['Object'], n2.inputs['Vector'])
    brick = node('ShaderNodeTexBrick'); links.new(tc.outputs['Object'], brick.inputs['Vector'])
    val(brick, 'Scale', 2.2); val(brick, 'Mortar Size', 0.03); val(brick, 'Mortar Smooth', 0.4)
    val(brick, 'Color1', (0, 0, 0, 1)); val(brick, 'Color2', (0, 0, 0, 1)); val(brick, 'Mortar', (1, 1, 1, 1))
    mortar = node('ShaderNodeRGBToBW'); links.new(brick.outputs['Color'], mortar.inputs[0])
    geo = node('ShaderNodeNewGeometry')
    crev = math_('SUBTRACT', 1.0, ao.outputs['AO'])
    low = math_('MULTIPLY', math_('SUBTRACT', 1.7, sep.outputs['Z']), 0.6, True)
    tail = math_('MULTIPLY', math_('MULTIPLY', math_('SUBTRACT', sep.outputs['Y'], 3.0), 2.0, True), math_('MULTIPLY', math_('SUBTRACT', sep.outputs['Z'], 1.2), 3.3, True))
    dust = math_('ADD', math_('MULTIPLY', crev, 1.5), math_('MULTIPLY', low, 0.35))
    dust = math_('ADD', dust, math_('MULTIPLY', mortar.outputs[0], 0.5))
    dust = math_('ADD', dust, math_('MULTIPLY', math_('SUBTRACT', n1.outputs['Fac'], 0.5), 0.6))
    dust = math_('MULTIPLY', dust, math_('SUBTRACT', 1.0, math_('MULTIPLY', tail, 0.75)), True)
    rust = math_('MULTIPLY', math_('MULTIPLY', math_('SUBTRACT', math_('MULTIPLY', crev, n2.outputs['Fac']), 0.12), 3.5, True), 0.85)
    edge = math_('MULTIPLY', math_('SUBTRACT', geo.outputs['Pointiness'], 0.52), 9.0, True)
    def mix(a, b, fac, strength):
        nd = node('ShaderNodeMixRGB', blend_type='MIX')
        links.new(fac if not strength else math_('MULTIPLY', fac, strength), nd.inputs['Fac'])
        if isinstance(a, tuple): nd.inputs['Color1'].default_value = (*a, 1)
        else: links.new(a, nd.inputs['Color1'])
        nd.inputs['Color2'].default_value = (*b, 1)
        return nd.outputs['Color']
    col = mix(base, (0.40, 0.32, 0.22), dust, 0.85)
    col = mix(col, (0.30, 0.12, 0.05), rust, 0.8)
    if bare: col = mix(col, (0.55, 0.56, 0.57), edge, 0.75)
    links.new(col, bsdf.inputs['Base Color'])

def bake_plane(ob, m, size=2048):
    """Smart-unwrap the airframe, bake the wear network of every material into one picture, then keep one
    baked material (plus the glass and the tail number, which stay flat so they stay clean)."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 16; scene.cycles.use_denoising = False
    names = [mm.name for mm in ob.data.materials]
    flat = ('dusty_glass', 'tail_number_paint')
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new('plane_bake', size, size, alpha=False)
    for mat in ob.data.materials:
        nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']; base = tuple(bsdf.inputs['Base Color'].default_value)[:3]
        if mat.name not in flat: wear_nodes(nt, bsdf, base, mat.name in ('faded_cream_skin', 'faded_orange_trim'))
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; nt.nodes.active = tex
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=8, use_clear=True)
    BLEND.mkdir(parents=True, exist_ok=True)
    scene.render.image_settings.file_format = 'JPEG'; scene.render.image_settings.quality = 86
    path = BLEND / 'plane-wear.jpg'; img.save_render(str(path), scene=scene)
    bpy.data.images.remove(img)
    img = bpy.data.images.load(str(path)); img.name = 'plane_wear'; img.colorspace_settings.name = 'sRGB'
    baked = bpy.data.materials.new('plane_baked'); baked.use_nodes = True
    nt = baked.node_tree; bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.82; bsdf.inputs['Metallic'].default_value = 0.08
    glass_i = names.index('dusty_glass'); number_i = names.index('tail_number_paint')
    number = ob.data.materials[number_i]; glass = ob.data.materials[glass_i]
    kind = [1 if pl.material_index == glass_i else 2 if pl.material_index == number_i else 0 for pl in ob.data.polygons]
    ob.data.materials.clear(); ob.data.materials.append(baked); ob.data.materials.append(glass); ob.data.materials.append(number)
    for pl, k in zip(ob.data.polygons, kind): pl.material_index = k

def build_plane_wreck(m):
    rng = random.Random(23)
    parts = []
    # All sizes in metres; the fuselage runs along Y with the nose toward -Y (glTF +Z reads from the tail).
    tilt = math.radians(7)   # nose down: the nose gear has folded
    belly = 0.24
    st = [(-3.6, 0, 0.05, 0.10, 0.12, 0.2), (-3.35, 0, 0.12, 0.45, 0.50, 0.4), (-2.95, 0, 0.30, 0.52, 0.58, 0.6),
          (-2.0, 0, 0.55, 0.62, 0.78, 0.8), (-0.9, 0, 0.72, 0.64, 0.92, 0.8), (0.4, 0, 0.80, 0.60, 0.88, 0.8),
          (1.8, 0, 0.88, 0.42, 0.62, 0.6), (3.2, 0, 1.08, 0.22, 0.38, 0.5), (4.4, 0, 1.28, 0.07, 0.17, 0.4)]
    fus = loft('fuselage', [m['skin']], st, ring=20, subdiv=3)
    # Dent the nose, tear the belly aft of the wing, and roll the whole body onto its side a touch.
    for v in fus.data.vertices:
        if v.co.y < -2.2:
            v.co.x += (rng.random() - 0.5) * 0.14; v.co.z += (rng.random() - 0.5) * 0.12 - 0.05
        if v.co.y < -3.0:
            v.co.z -= 0.14 * (1 + (v.co.y + 3.0) / 0.6)
            v.co.x += noise.noise(Vector((v.co.z * 5, v.co.y * 5, 1.0))) * 0.09
        if -3.0 <= v.co.y < -2.0:
            v.co.x *= 1.0 - 0.08 * math.sin((v.co.y + 3.0) * 3.0)
        v.co.x += math.sin(v.co.y * 0.5) * 0.02
    # Trim stripe: faces low on the sides take the orange; the stripe also runs under the windows.
    fus.data.materials.append(m['trim'])
    for p in fus.data.polygons:
        c = p.center
        if abs(c.x) > 0.30 and 0.46 < c.z < 0.62 and -2.3 < c.y < 4.2: p.material_index = 1
    parts.append(fus)
    # Windows, windscreen and the door; one pane missing.
    for side in (-1, 1):
        for k, (y, w) in enumerate(((-1.5, 0.55), (-0.7, 0.62), (0.1, 0.62), (0.9, 0.5))):
            if side == 1 and k == 2: continue
            parts.append(box(f'win{side}{k}', m['glass'], (0.03, w, 0.34), (side * (0.605 - abs(y) * 0.0 + (0.01 if k > 1 else 0.02)), y, 1.12)))
    parts.append(box('windscreen', m['glass'], (0.8, 0.05, 0.4), (0, -2.3, 1.2), (math.radians(-28), 0, 0)))
    # The engine: a cowling ring, the exhaust stubs and the bent propeller.
    parts.append(cyl('cowl', m['skin'], 0.52, 0.5, (0, -3.38, 0.32), (math.radians(90), 0, 0), verts=16))
    parts.append(cyl('spinner', m['bare'], 0.14, 0.34, (0, -3.78, 0.28), (math.radians(90), 0, 0), verts=10, r2=0.04))
    for k in range(2):
        a = math.radians(70 + k * 180)
        parts.append(box(f'blade{k}', m['steel_grey'], (0.12, 0.05, 1.0), (math.sin(a) * 0.5 * 0.9, -3.75 - 0.15 * k, 0.28 + math.cos(a) * 0.5 * 0.9), (math.radians(8 + 10 * k), 0, a)))
    # The high wing: left one whole to a crumpled tip, right one snapped at 3 m with the outer half lying on the ground.
    def wing(side, length, name, droop=0.0):
        n = 16; sts = []
        for i in range(n + 1):
            f = i / n; x = side * length * f
            chord = 1.75 - 0.5 * f
            sts.append((x, 0.0 - (0.15 * f), 1.92 - droop * f * f, chord * 0.5, 0.075 - 0.03 * f, 0.5))
        verts = []; faces = []; ring = 12
        for (x, y, z, w, h, sq) in sts:
            for k in range(ring):
                a = 2 * math.pi * k / ring; c, s = math.cos(a), math.sin(a)
                verts.append((x, y + w * c, z + h * s * (1.0 if s > 0 else 0.55)))
        for i in range(n):
            for k in range(ring):
                a = i * ring + k; b = i * ring + (k + 1) % ring
                faces.append((a, a + ring, b + ring, b))
        faces.append(tuple(range(ring))); faces.append(tuple((n * ring + k) for k in range(ring - 1, -1, -1)))
        ob = mesh_obj(name, [m['skin']], verts, faces); smooth(ob, 55)
        return ob
    left = wing(-1, 7.2, 'wing_l', 0.5)
    for v in left.data.vertices:
        v.co.z += noise.noise(Vector((v.co.x * 0.9, v.co.y * 2.0, 3.0))) * 0.05
        if v.co.x < -5.4: v.co.z += (rng.random() - 0.5) * 0.3; v.co.y += (rng.random() - 0.5) * 0.35
        if v.co.x < -6.6: v.co.z -= 0.25
    right = wing(1, 3.0, 'wing_r', 0.0)
    for v in right.data.vertices:
        if v.co.x > 2.6: v.co.z += (rng.random() - 0.5) * 0.35; v.co.y += (rng.random() - 0.5) * 0.3
    parts += [left, right]
    # The outer half of the right wing, fallen: a tapered slab lying on the ground to the right of the fuselage.
    outer = wing(1, 4.2, 'wing_fallen', 0.0)
    outer.rotation_euler = (math.radians(6), math.radians(-5), math.radians(24)); outer.location = (3.9, -1.0, -1.45)
    bpy.context.view_layer.objects.active = outer; outer.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True)
    parts.append(outer)
    # Struts, the folded gear and the wheels.
    parts.append(tube('strut_l', m['steel_grey'], [(-0.5, -0.5, 0.35), (-3.3, -0.55, 1.88)], 0.032))
    parts.append(tube('strut_r', m['steel_grey'], [(0.5, -0.5, 0.35), (2.7, -0.5, 1.84)], 0.032))
    parts.append(cyl('wheel_l', m['rubber'], 0.34, 0.2, (-1.95, -0.95, 0.16), (math.radians(80), math.radians(15), 0), verts=16))
    parts.append(cyl('wheel_r', m['rubber'], 0.34, 0.2, (1.9, -1.8, 0.2), (math.radians(70), math.radians(70), 0), verts=16))
    parts.append(tube('gear_l', m['steel_grey'], [(-0.45, -1.1, 0.55), (-0.85, -1.25, 0.28), (-1.5, -1.05, 0.12)], 0.045))
    parts.append(tube('gear_l_brace', m['steel_grey'], [(-0.6, -0.8, 0.5), (-1.1, -1.0, 0.16)], 0.025))
    parts.append(cyl('tailwheel', m['rubber'], 0.11, 0.07, (0, 3.1, 0.28), (0, math.radians(90), 0), verts=10))
    # The tail: a tailplane with one half bent down, the fin and rudder.
    tp_l = box('tailplane_l', m['skin'], (1.55, 0.7, 0.07), (-0.95, 3.7, 1.14), (0, math.radians(-4), math.radians(-3)), bevel=0.02)
    tp_r = box('tailplane_r', m['skin'], (1.55, 0.7, 0.07), (0.95, 3.7, 1.0), (math.radians(12), 0, math.radians(8)), bevel=0.02)
    fin = box('fin', m['skin'], (0.07, 1.0, 1.55), (0, 3.85, 1.95), (math.radians(-6), 0, 0), bevel=0.02)
    rudder = box('rudder', m['trim'], (0.06, 0.5, 1.5), (0.05, 4.4, 1.95), (math.radians(-4), 0, math.radians(7)), bevel=0.015)
    parts += [tp_l, tp_r, fin, rudder]
    # The tail number, N4471K, on both sides of the fin and the rear fuselage; letters dark and a little worn.
    for side in (-1, 1):
        rot = (math.radians(90), 0, math.radians(90 * side)) if side == 1 else (math.radians(90), 0, math.radians(-90))
        parts.append(text(f'number_fin{side}', 'N4471K', 0.19, (side * 0.066, 3.78, 2.05), rot, m['number']))
    for side in (-1, 1):
        rot = (math.radians(90), 0, math.radians(90 * side))
        parts.append(text(f'number_body{side}', 'N4471K', 0.34, (side * 0.37, 2.15, 0.95), rot, m['number']))
    # Scrapes, torn skin ribs showing through the belly, a dead pilot's door ajar.
    for k in range(5):
        parts.append(tube(f'rib{k}', m['steel_grey'], [(-0.34, 1.4 + k * 0.24, 0.18), (0.34, 1.4 + k * 0.24, 0.18)], 0.016))
    parts.append(box('door_open', m['skin'], (0.04, 0.8, 0.8), (0.9, -0.8, 0.9), (0, 0, math.radians(60))))
    joined = join('table-plane-wreck', parts)
    bake_plane(joined, m)
    # Lay it nose-down and settle the lowest point on the ground.
    joined.rotation_euler = (tilt, math.radians(6), math.radians(-8))
    bpy.ops.object.select_all(action='DESELECT'); joined.select_set(True); bpy.context.view_layer.objects.active = joined
    bpy.ops.object.transform_apply(rotation=True)
    low = min(v.co.z for v in joined.data.vertices)
    for v in joined.data.vertices: v.co.z -= low - 0.02
    return joined

def build_logbook(m):
    rng = random.Random(2)
    parts = []
    w, d, t = 0.15, 0.21, 0.012   # each half: 15 cm wide, 21 cm tall, 1.2 cm of pages
    # Two page blocks open flat, a leather cover under and a spine.
    parts.append(box('cover', m['leather'], (w * 2 + 0.014, d + 0.014, 0.006), (0, 0, 0.003), bevel=0.003))
    parts.append(box('page_block_l', m['page'], (w, d, t), (-w / 2 - 0.003, 0, 0.009 + t / 2 - 0.004), (0, math.radians(-1.5), 0), bevel=0.001))
    parts.append(box('page_block_r', m['page'], (w, d, t * 0.4), (w / 2 + 0.003, 0, 0.009 + t * 0.2 - 0.004), (0, math.radians(1.0), 0), bevel=0.001))
    parts.append(box('spine', m['leather'], (0.012, d + 0.014, 0.014), (0, 0, 0.012), bevel=0.004))
    # The last page, ruled lines for pencil entries (the text itself is drawn by the game as a card).
    top = 0.009 + t * 0.4 - 0.002
    for k in range(14):
        parts.append(box(f'line{k}', m['ink'], (w * 0.86, 0.0009, 0.0006), (w / 2 + 0.003, -d / 2 + 0.02 + k * (d - 0.04) / 13, top + 0.0007)))
    parts.append(box('margin', m['ribbon'], (0.0007, d - 0.03, 0.0006), (0.016, 0, top + 0.0008)))
    # A ribbon, a pencil with its point worn, a dog-eared corner.
    parts.append(box('ribbon', m['ribbon'], (0.006, 0.12, 0.0012), (-0.02, d / 2 + 0.05, 0.008), (0, 0, math.radians(6))))
    parts.append(cyl('pencil', m['pencil'], 0.0035, 0.17, (-0.12, -0.02, 0.0125), (0, math.radians(90), math.radians(82)), verts=6))
    parts.append(cyl('graphite', m['graphite'], 0.0016, 0.012, (-0.118, -0.103, 0.0125), (0, math.radians(90), math.radians(82)), verts=6, r2=0.0004))
    empty('page_centre', (w / 2 + 0.003, 0, top + 0.002))
    return join('table-logbook', parts)

BUILDERS = {'sign-logging-arrows': build_logging_arrows, 'sign-start-grid': build_start_grid, 'sign-fire-pits': build_fire_pits,
            'sign-chalk-line': build_chalk_line, 'sign-lighthouse-window': build_lighthouse_window, 'table-mesa': build_mesa,
            'table-lookout': build_lookout, 'table-plane-wreck': build_plane_wreck, 'table-logbook': build_logbook}
LIMITS = {'table-mesa': 46000, 'table-lookout': 9000, 'table-plane-wreck': 9000, 'sign-start-grid': 12000,
          'sign-logging-arrows': 12000, 'sign-chalk-line': 12000, 'sign-fire-pits': 14000, 'sign-lighthouse-window': 6000, 'table-logbook': 1500}

def triangles():
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')

selected = [n for n in NAMES if not options.only or n in options.only.split(',')]
OUT.mkdir(parents=True, exist_ok=True); BLEND.mkdir(parents=True, exist_ok=True)
for name in selected:
    reset(); m = mats(); BUILDERS[name](m)
    tri = triangles(); print(f'pilot-map-props: {name} {tri} triangles')
    assert tri <= LIMITS[name], f'{name} over budget: {tri}'
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND / f'{name}.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)

if options.render:
    # Review renders into one folder: every sign from the air (about 50 m up) and from a car's height,
    # and the Table's pieces. The sheet script puts them together (tools/art/pilot-map-sheet.py).
    folder = (root / options.render).resolve(); folder.mkdir(parents=True, exist_ok=True)
    ground_colour = {'sign-logging-arrows': (0.14, 0.10, 0.065), 'sign-start-grid': (0.075, 0.075, 0.08), 'sign-fire-pits': (0.13, 0.095, 0.05),
                     'sign-chalk-line': (0.17, 0.165, 0.155), 'sign-lighthouse-window': (0.03, 0.06, 0.09), 'table-mesa': (0.40, 0.24, 0.13),
                     'table-lookout': (0.40, 0.24, 0.13), 'table-plane-wreck': (0.40, 0.24, 0.13),
                     'table-logbook': (0.12, 0.08, 0.05)}
    # name: [(view, camera location, look-at, lens)]
    shots = {
        'sign-logging-arrows': [('air', (0, 22, 46), (0, 0, 0), 35), ('car', (4.0, 34, 1.25), (0, 0, 0), 35)],
        'sign-start-grid': [('air', (0, 24, 46), (0, 0, 0), 35), ('car', (3.0, 38, 1.25), (0, 0, 0), 35)],
        'sign-fire-pits': [('air', (0, 26, 44), (0, 0, 0), 35), ('car', (4.0, 34, 1.25), (0, 0, 0), 35)],
        'sign-chalk-line': [('air', (0, 22, 44), (0, 0, 0), 35), ('car', (2.0, 24, 1.25), (0, 0, 0), 35)],
        'sign-lighthouse-window': [('air', (0, 8, 40), (0, -0.6, 1.6), 35), ('car', (3.0, 25, 1.4), (0, 0, 1.6), 35)],
        'table-mesa': [('far', (560, -470, 120), (0, 0, -60), 40), ('butte', (950, -420, -110), (0, 0, -50), 35), ('cliff', (130, -330, -95), (30, -190, -70), 35), ('foot', (-430, -330, -105), (-250, -190, -125), 35)],
        'table-lookout': [('three-quarter', (14, -17, 9), (0, 0, 6.5), 40), ('cab', (1.4, 1.5, 11.6), (-0.7, -0.9, 10.95), 28)],
        'table-plane-wreck': [('three-quarter', (-9, -11, 5), (0, 0, 1), 40), ('side', (11, 0.5, 2.4), (0, 0.5, 1.2), 40), ('tail', (7.0, 5.0, 3.0), (0, 3.9, 2.3), 45), ('gear', (-4.4, -5.0, 1.7), (-1.2, -1.0, 0.4), 40)],
        'table-logbook': [('open', (0.1, -0.33, 0.28), (0.0, 0.0, 0.0), 40)],
    }
    for name in selected:
        for (view, loc, target, lens) in shots[name]:
            bpy.ops.wm.open_mainfile(filepath=str(BLEND / f'{name}.blend'))
            scene = bpy.context.scene
            size = 1500 if name == 'table-mesa' else 160 if name.startswith('sign') else 40
            if name not in ('table-mesa',):
                floor_z = {'table-mesa': -145}.get(name, 0.0)
                bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, floor_z - 0.03 if name != 'table-logbook' else -0.002))
                g = bpy.context.active_object; gm = bpy.data.materials.new('ground'); gm.use_nodes = True
                gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*ground_colour[name], 1)
                gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.97; g.data.materials.append(gm)
            else:
                bpy.ops.mesh.primitive_plane_add(size=6000, location=(0, 0, -165.05))
                g = bpy.context.active_object; gm = bpy.data.materials.new('ground'); gm.use_nodes = True
                gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.36, 0.22, 0.12, 1)
                gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.97; g.data.materials.append(gm)
            world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
            world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.50, 0.58, 0.70, 1)
            world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
            sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.0
            s = bpy.data.objects.new('sun', sun); scene.collection.objects.link(s)
            s.rotation_euler = (math.radians(52), math.radians(8), math.radians(-38))
            scene.render.image_settings.file_format = 'PNG'
            scene.render.engine = 'CYCLES'; scene.cycles.samples = 40; scene.cycles.device = 'CPU'; scene.cycles.use_denoising = True
            scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
            scene.render.resolution_x, scene.render.resolution_y = 640, 400; scene.view_settings.view_transform = 'AgX'
            cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); scene.collection.objects.link(cam); scene.camera = cam
            if view == 'cab':
                lamp = bpy.data.lights.new('cab', 'POINT'); lamp.energy = 350
                lo_ = bpy.data.objects.new('cab', lamp); scene.collection.objects.link(lo_); lo_.location = (0.2, 0.2, 12.9)
            cam.location = loc; cd.lens = lens; cd.clip_end = 8000
            cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
            folder_n = folder / name; folder_n.mkdir(parents=True, exist_ok=True)
            scene.render.filepath = str(folder_n / f'{view}.png'); bpy.ops.render.render(write_still=True)
