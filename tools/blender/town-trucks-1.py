"""Build the four original Scablands work trucks and private look renders.

Example:
  blender -b --python-exit-code 1 --python tools/blender/town-trucks-1.py -- \
    --root .

Coordinates follow town_base: metres, +Y up, front -Z. Wheel proportions follow
the game's Titan Monster truck GLB; the wheel shapes are rebuilt from primitives.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--export-only', action='store_true', help='build the private GLB without review renders or a saved Blend')
parser.add_argument('--candidate-suffix', default='', help='unique suffix for a temporary private candidate export')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
if args.candidate_suffix and (not args.candidate_suffix.startswith('-') or
                              any(character not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' for character in args.candidate_suffix)):
    parser.error('--candidate-suffix must start with a hyphen and contain only letters, digits and hyphens')
output = root / '.qa-dist/art-candidates' / f'town-trucks-1{args.candidate_suffix}.glb'
blend = root / 'art-build/town/trucks-1.blend'
evidence = root / '.evidence/2026-11-05/TOWN-ART-TRUCKS-1'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(output)], 'evidence': [str(evidence)]}))
    raise SystemExit(0)

import bpy
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
MatrixIdentity = Matrix.Identity(4)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 64
scene.cycles.use_denoising = False
scene.render.resolution_x = 960
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('Bright overcast truck review')
scene.world.color = (.36, .38, .39)
materials = town.make_materials()
atlas = bpy.data.images.get('Scablands shared town wear atlas 1K')
atlas.scale(512, 512)
atlas.file_format = 'JPEG'
atlas.pack()
red = bpy.data.materials.new('Worn deep-red fire engine paint')
red.diffuse_color = (.34,.055,.025,1)
red.use_nodes = True
red.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.34,.055,.025,1)
red.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .12
red.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .88
rust = materials['rusted-steel']
tin = materials['galvanised-tin']
steel = materials['iron-dark']
glass = materials['dirty-glass']
rubber = bpy.data.materials.new('Deeply worn truck tyre rubber')
rubber.diffuse_color = (.035, .038, .034, 1)
rubber.use_nodes = True
rubber.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.035, .038, .034, 1)
rubber.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .93
lamp = bpy.data.materials.new('Aged amber lamp lens')
lamp.diffuse_color = (.48, .20, .035, 1)
lamp.use_nodes = True
lamp.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.58, .27, .055, 1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .38
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (.58, .27, .055, 1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = .8
cratewood = bpy.data.materials.new('Dark weathered crate timber')
cratewood.use_nodes = True
cratewood.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.20,.12,.065,1)
cratewood.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .94
canvas = bpy.data.materials.new('Sun-dulled sack canvas')
canvas.use_nodes = True
canvas.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.34,.25,.14,1)
canvas.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .96
olivepaint = bpy.data.materials.new('Faded olive truck paint')
olivepaint.use_nodes = True
olivepaint.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.075,.095,.045,1)
olivepaint.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .91
ochrepaint = bpy.data.materials.new('Dusty ochre truck paint')
ochrepaint.use_nodes = True
ochrepaint.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.16,.085,.025,1)
ochrepaint.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .92

def parent_keep_world(obj, parent):
    # Family empties only translate. Store each child in the parent's local
    # space without relying on Blender's unevaluated matrix_world during build.
    obj.location -= parent.location
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)

def box(name, x, y, z, width, depth, height, material, bevel=0):
    # town_base sizes are width, height, depth; its centers use game axes.
    if bevel < .10: bevel = 0
    obj = town.cube(name, (x, y, z), (width, height, depth), material, bevel)
    return obj

def cylinder(name, x, y, z, radius, depth, material, axis='Y', vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                         location=(x, -z, y))
    obj = bpy.context.object
    obj.name = name
    if axis == 'Y':
        obj.rotation_euler[0] = math.pi / 2
    elif axis == 'X':
        obj.rotation_euler[1] = math.pi / 2
    obj.data.materials.append(material)
    bevel_mod = obj.modifiers.new('rounded rolled edge', 'BEVEL')
    bevel_mod.width = .025
    bevel_mod.segments = 1
    obj.modifiers.new('weighted light normals', 'WEIGHTED_NORMAL')
    return obj

def pipe(name, a, b, radius, material):
    before = set(bpy.context.scene.objects)
    town.pipe_run(name, [a, b], radius, material)
    created = list(set(bpy.context.scene.objects) - before)
    if len(created) != 1:
        raise RuntimeError(f'{name} expected one pipe segment, created {len(created)}')
    return created[0]

def wheel_donor():
    donor = root / 'public/assets/models/unlocks/titan_monster.glb'
    bpy.ops.import_scene.gltf(filepath=str(donor))
    spin_roots = [bpy.data.objects.get(f'WheelSpin_{i}') for i in range(4)]
    assemblies = []
    for spin in spin_roots:
        if spin is None:
            raise RuntimeError('Titan donor wheel pivots changed; expected WheelSpin_0..3')
        center = spin.matrix_world.translation.copy()
        parts = []
        for obj in bpy.context.scene.objects:
            if obj.type != 'MESH' or obj.parent != spin:
                continue
            mesh = obj.data
            mats = list(mesh.materials)
            vertices = [tuple((obj.matrix_world @ v.co) - center) for v in mesh.vertices]
            faces = [tuple(poly.vertices) for poly in mesh.polygons]
            indices = [poly.material_index for poly in mesh.polygons]
            parts.append((vertices, faces, mats, indices))
        assemblies.append((center, parts))
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(('WheelSpin_', 'WheelPivot_', 'Node_')) or obj.name == 'titan_monster' or obj.type == 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
    return assemblies

donor_wheels = wheel_donor()
wheel_groups = [
    ('fire-truck', 0, 2.42, (-1.72, 1.72)),
    ('water-tanker', 1, 3.24, (-2.25, .95, 2.25)),
    ('supply-truck', 2, 2.42, (-1.78, 1.78)),
    ('tow-rig', 3, 2.42, (-1.85, 1.72)),
]
active_objects = []
truck_roots = {}
truck_center = {}

def wheel(name, side, z_front, y_height=.58, radius=.54):
    source_center, components = donor_wheels[len(active_objects) % len(donor_wheels)]
    donor_points = [v for part in components for v in part[0]]
    donor_radius = max(math.hypot(v[1], v[2]) for v in donor_points)
    donor_width = max(v[0] for v in donor_points) - min(v[0] for v in donor_points)
    fit = radius / donor_radius
    fitted_radius = donor_radius * fit
    fitted_width = donor_width * fit
    center = (truck_center[name.split(':')[0]][0] + side * .97, -z_front, y_height)
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = center
    bpy.ops.mesh.primitive_torus_add(major_segments=20, minor_segments=8,
                                     major_radius=fitted_radius*.70, minor_radius=fitted_radius*.30,
                                     location=center, rotation=(0, math.pi/2, 0))
    geometry=bpy.context.object;geometry.name=name+':Titan-profile rubber tyre'
    geometry.data.materials.append(rubber)
    for polygon in geometry.data.polygons: polygon.use_smooth=True
    parent_keep_world(geometry,pivot)
    sidewall=side
    bpy.ops.mesh.primitive_torus_add(major_segments=10,minor_segments=3,
        major_radius=fitted_radius*.63,minor_radius=.022,location=(center[0]+sidewall*fitted_width*.35,center[1],center[2]),rotation=(0,math.pi/2,0))
    ring=bpy.context.object;ring.name=name+':raised sidewall bead';ring.data.materials.append(rubber)
    for polygon in ring.data.polygons: polygon.use_smooth=True
    parent_keep_world(ring,pivot)
    # Road-grip blocks repeat around the full tyre. Dimensions come from the
    # Titan's tyre width and diameter, fitted down to a road-work truck scale.
    for block in range(8):
        angle=math.tau*block/8
        loc=(center[0],center[1]+math.cos(angle)*fitted_radius*.96,center[2]+math.sin(angle)*fitted_radius*.96)
        bpy.ops.mesh.primitive_cube_add(size=1,location=loc,rotation=(angle,0,0))
        lug=bpy.context.object;lug.name=name+':raised tread block'
        lug.dimensions=(fitted_width*.83,.052,.028)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        lug.data.materials.append(rubber);parent_keep_world(lug,pivot)
    for sidewall in (-1,1):
        hub_center=(center[0]+sidewall*fitted_width*.40,center[1],center[2])
        bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=fitted_radius*.43,depth=.075,
            location=hub_center,rotation=(0,math.pi/2,0))
        hub=bpy.context.object;hub.name=name+':pressed steel wheel dish';hub.data.materials.append(tin)
        parent_keep_world(hub,pivot)
        for bolt in range(2):
            angle=math.tau*bolt/2
            bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.022,depth=.025,
                location=(center[0]+sidewall*fitted_width*.48,center[1]+math.cos(angle)*fitted_radius*.28,center[2]+math.sin(angle)*fitted_radius*.28),rotation=(0,math.pi/2,0))
            nut=bpy.context.object;nut.name=name+':hub bolt';nut.data.materials.append(tin);parent_keep_world(nut,pivot)
    return pivot

def marker(name, location):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj

def part_group(name, origin):
    return marker(name, origin)

def make_truck(identifier, index, color, length=5.5, width=2.45, axles=None):
    x = index * 7.4
    root_obj = bpy.data.objects.new(identifier, None)
    bpy.context.collection.objects.link(root_obj)
    root_obj.location.x = x
    truck_roots[identifier] = root_obj
    truck_center[identifier] = (x, 0)
    made = []
    lamp_group = part_group(identifier + ':lamp', (x, 1.30, -2.65))
    parent_keep_world(lamp_group, root_obj)
    def add(obj):
        made.append(obj)
        return obj
    # Ladder chassis, crossmembers, axles, suspension leaves and exhaust.
    for side in (-1, 1):
        add(box(identifier + ':frame-rail', x + side * .66, .78, 0, .17, length - .2, .18, steel, .025))
        for z_axle in (axles or (-length*.31, length*.30)):
            add(cylinder(identifier + ':solid-axle', x + side * .83, .61, z_axle, .08, .34, rust, 'X', 12))
            for leaf in range(3):
                add(box(identifier + ':leaf-spring', x + side * .83, .39 + leaf * .045, z_axle,
                        .08, .92 - leaf * .12, .035, steel, .016))
    for zcross in (-length*.33, -length*.04, length*.31):
        add(box(identifier + ':crossmember', x, .74, zcross, 1.55, .15, .12, rust, .025))
    axle_positions = list(axles or (-length*.31, length*.30))
    for side in (-1, 1):
        for axle_index, z_axle in enumerate(axle_positions):
            axle_name = 'front' if axle_index == 0 else 'rear' if axle_index == len(axle_positions)-1 else 'middle'
            spin = wheel(f'{identifier}:spin-{axle_name}-{"left" if side < 0 else "right"}',
                         side, z_axle, radius=.53 if identifier != 'tow-rig' else .60)
            if z_axle < 0:
                steer = marker(f'{identifier}:steer-{axle_name}-{"left" if side < 0 else "right"}',
                               (x + side * .97, -z_axle, .58))
                parent_keep_world(spin, steer)
                made.append(steer)
            else:
                made.append(spin)
    # The cab is rounded, with a protruding hood, inset glass and real bumpers.
    add(box(identifier + ':lower-cab', x, 1.24, -.72, 2.08, 2.00, .74, color, .18))
    add(box(identifier + ':bonnet', x, 1.43, -1.91, 2.18, 1.08, .60, color, .19))
    add(box(identifier + ':cab-roof', x, 2.42, -.47, 2.02, 1.54, .18, color, .11))
    windshield=add(box(identifier + ':windshield', x, 2.00, -1.68, 1.72, .055, .72, glass, .065))
    windshield.rotation_euler[0]=math.radians(10)
    add(box(identifier + ':rear-window', x, 2.00, .25, 1.36, .055, .53, glass, .06))
    for side in (-1, 1):
        add(box(identifier + ':side-window', x + side * 1.025, 2.00, -.48, .05, .82, .60, glass, .055))
        add(box(identifier + ':window-pillar', x + side * 1.04, 2.00, -1.26, .11, .12, .91, rust, .025))
        add(box(identifier + ':door-weld-patch', x + side * 1.055, 1.30, -.37, .035, .75, .40, rust, .018))
        add(box(identifier + ':door-handle', x + side * 1.085, 1.45, -.42, .05, .18, .035, tin, .012))
        add(box(identifier + ':mirror-arm', x + side * 1.27, 1.96, -1.27, .08, .38, .055, steel, .02))
        add(box(identifier + ':side-mirror', x + side * 1.30, 2.08, -1.28, .13, .23, .28, rust, .025))
        # Uneven hammered fender lips sit outside the same source tyres.
        for z_axle in axle_positions:
            curve = bpy.data.curves.new(identifier + ' formed wheel arch', 'CURVE')
            curve.dimensions = '3D'; curve.resolution_u = 1; curve.bevel_depth = .075; curve.bevel_resolution = 1
            spline = curve.splines.new('POLY'); spline.points.add(16)
            for i, point in enumerate(spline.points):
                angle = math.pi * i / 16
                point.co = (x + side * 1.13, -z_axle + math.cos(angle) * .67, .58 + math.sin(angle) * .67, 1)
            fender = bpy.data.objects.new(identifier + ':formed-fender', curve); bpy.context.collection.objects.link(fender)
            fender.data.materials.append(color); made.append(fender)
    # Vertical slat grille, lamps and a battered transverse bumper.
    add(box(identifier + ':grille-recess', x, 1.20, -2.52, .91, .05, .69, steel, .035))
    for slat in range(9):
        add(box(identifier + ':grille-slat', x - .39 + slat * .097, 1.22, -2.565,
                .035, .035, .60, tin if slat % 3 else rust, .009))
    for side in (-1, 1):
        add(cylinder(identifier + ':headlamp-rim',x+side*.79,1.30,-2.59,.19,.09,rust,'Y',20))
        lens = cylinder(identifier + ':headlamp-' + ('left' if side < 0 else 'right'),
                         x+side*.79,1.30,-2.65,.13,.12,lamp,'Y',20)
        parent_keep_world(lens, lamp_group)
    add(box(identifier + ':front-bumper', x, .80, -2.76, 2.46, .26, .19, steel, .055))
    add(box(identifier + ':rear-bumper', x, .78, length*.52, 2.32, .22, .18, rust, .045))
    # Repair plates, exposed weld seams and bolts break up broad painted panels.
    for side in (-1, 1):
        for i, zpos in enumerate((-.80, .32, 1.31), 1):
            add(box(identifier + ':uneven-sill-patch', x + side * 1.09, .92, zpos, .05, .52, .25,
                    rust if i == 1 else tin, .025))
            for fastener in (-1, 1):
                add(cylinder(identifier + ':patch-bolt', x + side * 1.13, .94, zpos + fastener * .18,
                             .033, .025, steel, 'X', 10))
    for obj in made:
        parent_keep_world(obj, root_obj)
    active_objects.append(root_obj)
    return root_obj, made

truck_specs = [
    ('fire-truck', 0, red, 5.9, 2.45, (-1.68, 1.74)),
    ('water-tanker', 1, tin, 7.0, 2.52, (-2.15, .40, 2.24)),
    ('supply-truck', 2, olivepaint, 6.0, 2.48, (-1.80, 1.78)),
    ('tow-rig', 3, ochrepaint, 6.6, 2.58, (-1.90, 1.82)),
]
truck_parts = {}
for spec in truck_specs:
    ident, index, color, length, width, axles = spec
    truck_parts[ident] = make_truck(ident, index, color, length, width, axles)

def bed(name, index, z, length, material=steel):
    x = index * 7.4
    made = [box(name + ':flatbed-deck', x, 1.06, z, 2.18, length, .20, material, .045)]
    for side in (-1, 1):
        made.append(box(name + ':bed-rail', x + side * 1.0, 1.37, z, .08, length, .56, rust, .035))
        for zi in range(1, max(2, int(length * 2))):
            made.append(box(name + ':bed-stake', x + side * 1.0, 1.48, z - length*.48 + zi*.48,
                            .075, .08, .78, steel, .02))
    made.append(box(name + ':rear-crossbar', x, 1.30, z + length*.48, 2.04, .10, .44, tin, .025))
    return made

# Fire engine: elevated hose reels, a salvaged ladder and a roof-mounted water cannon.
fire, fire_objects = truck_parts['fire-truck']; fx = 0
fire_payload = [box('fire-truck:equipment-body', fx, 1.55, 1.03, 2.22, 2.78, 1.05, red, .14)]
fire_payload.extend([box('fire-truck:side-equipment-door', fx + s*1.14, 1.53, 1.10, .045, 1.98, .66, rust, .025) for s in (-1,1)])
for side in (-1, 1):
    reel = cylinder('fire-truck:hose-reel', fx + side*1.26, 1.84, .82, .47, .22, steel, 'X', 28)
    fire_payload.append(reel)
    for band in (-.12, .12):
        fire_payload.append(cylinder('fire-truck:reel-rim', fx + side*1.40, 1.84, .82, .43, .035, rust, 'X', 28))
    fire_payload.append(cylinder('fire-truck:coiled-hose', fx + side*1.405, 1.84, .82, .34, .035, red, 'X', 28))
for side in (-1,1):
    fire_payload.append(town.beam('fire-truck:roof-ladder-rail', (fx+side*.44,2.66,.05),(fx+side*.44,2.66,2.45),.075,steel))
for rung in range(12):
    z = .10 + rung*.20
    fire_payload.append(town.beam('fire-truck:ladder-rung',(fx-.44,2.66,z),(fx+.44,2.66,z),.045,tin))
fire_payload.extend([cylinder('fire-truck:roof-water-tank',fx,2.94,.65,.48,2.08,tin,'Y',32),
                     cylinder('fire-truck:tank-end-rim',fx,2.94,-.40,.51,.09,rust,'Y',32),
                     cylinder('fire-truck:tank-end-rim',fx,2.94,1.70,.51,.09,rust,'Y',32)])
cannon = part_group('fire-truck:cannon', (fx, .50, 2.70))
cannon_objects = [cylinder('fire-truck:cannon-base',fx,2.62,-.50,.23,.34,rust,'Y',16),
                  cylinder('fire-truck:cannon-barrel',fx,3.00,-.50,.13,1.14,steel,'Y',16),
                  cylinder('fire-truck:cannon-muzzle',fx,3.00,-1.07,.19,.16,tin,'Y',16)]
for obj in cannon_objects: parent_keep_world(obj,cannon)
fire_payload.append(cannon)
for obj in fire_payload: parent_keep_world(obj,fire)

# Water tanker: long riveted cylinder, saddles, valves, fill cap and visible drops.
tanker, tanker_objects = truck_parts['water-tanker']; tx=7.4
tanker_payload=bed('water-tanker',1,0,3.95,tin)
tanker_payload.extend([cylinder('water-tanker:horizontal-vessel',tx,1.91,.12,.91,3.82,tin,'Y',40),
                       cylinder('water-tanker:domed-front-head',tx,1.91,-1.74,.87,.14,rust,'Y',40),
                       cylinder('water-tanker:domed-rear-head',tx,1.91,1.98,.87,.14,rust,'Y',40)])
for side in (-1,1):
    for boltrow in range(8):
        z= -1.48+boltrow*.42
        tanker_payload.append(cylinder('water-tanker:body-rivet',tx+side*.84,1.91,z,.034,.035,steel,'X',10))
    tanker_payload.append(pipe('water-tanker:lower-drain-line',(tx+side*.78,.86,.58),(tx+side*.78,.42,1.42),.052,rust))
    tanker_payload.append(cylinder('water-tanker:valve-wheel',tx+side*.95,.68,1.44,.22,.10,steel,'X',20))
for xoff in (-1.18,1.10):
    tanker_payload.append(box('water-tanker:vessel-saddle',tx,1.20,xoff,2.15,.20,.16,steel,.04))
tanker_payload.extend([cylinder('water-tanker:fill-neck',tx,2.79,.12,.16,.42,rust,'X',20),
                       box('water-tanker:walkway',tx,2.57,.12,.72,2.80,.075,steel,.025)])
for obj in tanker_payload: parent_keep_world(obj,tanker)

# Supply flatbed: lashed frame, mixed crates, folded tarp and distinct sacks.
supply, supply_objects=truck_parts['supply-truck']; sx=14.8
load=part_group('supply-truck:load',(sx,0,0)); supply_payload=bed('supply-truck',2,.25,2.55,rust)
for cx,cz,wood,dep,hei in [(-.38,.48,.72,.64,.66),(.38,.48,.77,.64,.55),(-.38,1.12,.88,.60,.54),(.38,1.12,.61,.60,.65)]:
    obj=box('supply-truck:salvage-crate',sx+cx,1.58,cz,wood,dep,hei,cratewood,.055)
    supply_payload.append(obj)
    for rib in (-1,1):
        supply_payload.append(box('supply-truck:crate-cleat',sx+cx+rib*(wood/2-.08),1.59,cz,.055,dep*.94,hei*.82,rust,.018))
for i,(cx,cz) in enumerate([(-.78,.48),(.78,.48),(-.78,1.14),(.78,1.14)],1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=(sx+cx,-cz,1.72))
    sack=bpy.context.object;sack.name=f'supply-truck:lashed-burlap-sack-{i}';sack.scale=(.30,.36,.25);sack.data.materials.append(canvas);supply_payload.append(sack)
for side in (-1,1):
    supply_payload.append(pipe('supply-truck:crossed-load-tie',(sx+side*.94,1.98,.28),(sx-side*.94,1.98,1.43),.026,steel))
    supply_payload.append(pipe('supply-truck:load-tie',(sx+side*.94,1.98,1.43),(sx+side*.94,1.98,.28),.026,rust))
rolled= cylinder('supply-truck:rolled-canvas',sx-.64,1.91,1.10,.22,1.28,
                 canvas,'Y',20)
supply_payload.append(rolled)
for z in (.62,1.48):
    supply_payload.append(box('supply-truck:canvas-tie',sx-.64,2.13,z,.42,.06,.045,rust,.018))
for obj in supply_payload: parent_keep_world(obj,load)
parent_keep_world(load,supply)

# Tow rig: open rear frame and braced, crooked crane with a separately named hook.
tow, tow_objects=truck_parts['tow-rig']; wx=22.2
tow_payload=bed('tow-rig',3,1.10,2.60,steel)
for side in (-1,1):
    tow_payload.append(town.beam('tow-rig:crane-post',(wx+side*.72,1.37,.95),(wx+side*.72,3.72,.95),.15,rust))
    tow_payload.append(town.beam('tow-rig:crane-boom',(wx+side*.72,3.72,.95),(wx+side*.72,3.34,3.15),.16,steel))
    tow_payload.append(town.beam('tow-rig:crane-crossbrace',(wx+side*.72,2.00,.95),(wx+side*.72,3.55,2.55),.09,rust))
    tow_payload.append(box('tow-rig:crane-head-crossbar',wx,3.69,.95,1.58,.18,.20,tin,.04))
hook=part_group('tow-rig:hook',(wx,-3.06,1.35))
hook_parts=[pipe('tow-rig:lowered-hook-chain',(wx,3.39,3.07),(wx,1.75,3.07),.033,steel),
            cylinder('tow-rig:hook-swivel',wx,1.63,3.07,.12,.18,rust,'X',14)]
for obj in hook_parts: parent_keep_world(obj,hook)
# Curved C hook, made from a thick bent pipe so it remains a real forged shape.
curve=bpy.data.curves.new('tow-rig forged C hook','CURVE');curve.dimensions='3D';curve.bevel_depth=.075;curve.bevel_resolution=2
spline=curve.splines.new('POLY');spline.points.add(17)
for i,p in enumerate(spline.points):
    angle=math.radians(-72+i*18)
    p.co=(math.cos(angle)*.28,0,math.sin(angle)*.28,1)
hook_mesh=bpy.data.objects.new('tow-rig:forged-hook',curve);bpy.context.collection.objects.link(hook_mesh)
hook_mesh.location=(wx,-3.06,1.35);hook_mesh.data.materials.append(tin);parent_keep_world(hook_mesh,hook)
tow_payload.append(hook)
for obj in tow_payload: parent_keep_world(obj,tow)

# Keep wheel assemblies under their movable pivots and parent every truck part.
for identifier, root_obj in truck_roots.items():
    for obj in list(bpy.context.scene.objects):
        if obj is root_obj or obj.parent is not None:
            continue
        if obj in active_objects:
            continue
        # All unattached authored meshes belong to the truck whose X bay contains them.
        if abs(obj.location.x - root_obj.location.x) < 4.0 and obj not in (root_obj,):
            parent_keep_world(obj, root_obj)

family_root = bpy.data.objects.new('town-trucks-1', None)
bpy.context.collection.objects.link(family_root)
for root_obj in truck_roots.values():
    parent_keep_world(root_obj, family_root)

# White-gray sand staging ground, deliberately render-only.
floor_mat=bpy.data.materials.new('Neutral warm dry-earth studio')
floor_mat.diffuse_color=(.43,.39,.32,1);floor_mat.use_nodes=True
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.43,.39,.32,1)
floor_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
floor=box('render-only compacted sand',11.1,-.13,0,31,12,.20,floor_mat,.02)
floor.hide_render=False
for location, target, power, size in [((-4,4,9),(3,0,1),5200,8),
                                     ((17,-3,6),(12,0,1),2400,6),
                                     ((28,5,10),(22,0,1),3600,8)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light_obj=bpy.context.object;light_obj.data.energy=power;light_obj.data.shape='DISK';light_obj.data.size=size
    light_obj.rotation_euler=(Vector(target)-light_obj.location).to_track_quat('-Z','Y').to_euler()

def camera(name, location, target, lens=52):
    bpy.ops.object.camera_add(location=location)
    cam=bpy.context.object;cam.name=name;cam.data.lens=lens
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=cam
    return cam

def render_view(file_name, loc, target, lens=52):
    cam=camera('render-only '+file_name,loc,target,lens)
    scene.render.filepath=str(evidence/file_name)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True)

evidence.mkdir(parents=True,exist_ok=True)
def set_truck_render(root_obj, visible):
    # Empty visibility does not reliably cascade through glTF-style parenting.
    for obj in bpy.context.scene.objects:
        if obj.name == root_obj.name or obj.name.startswith(root_obj.name + ':'):
            obj.hide_render = not visible

if not args.export_only:
    for ident,index,_,length,_,_ in truck_specs:
        cx=index*7.4
        for other_id, other_root in truck_roots.items():
            set_truck_render(other_root, other_id == ident)
        # Reference view: truck-sized, front left, near level; matching image crop.
        render_view(f'{ident}-reference-angle.png',(cx+6.5,8.8,3.2),(cx,0,1.55),44)
        # Mayor's view: all roof equipment and open loads visible at 45 degrees.
        render_view(f'{ident}-above-45.png',(cx+5.7,7.0,8.0),(cx,0,1.1),48)
        # Driver-height read is a close working distance, but keep the cab and
        # front wheel in frame so their proportions can be judged together.
        render_view(f'{ident}-driver-seat.png',(cx+6.0,8.5,1.65),(cx,0,1.4),44)
for root_obj in truck_roots.values():
    set_truck_render(root_obj, True)

# Remove scene staging and camera/light objects before export. The receiver
# only sees four named roots and their meshes and named working parts.
for obj in list(bpy.context.scene.objects):
    if obj == floor or obj.type in ('CAMERA','LIGHT'):
        bpy.data.objects.remove(obj,do_unlink=True)
for ident, root_obj in truck_roots.items():
    # Explicit wheel pivot names mirror the game's steer/spin socket contract.
    pass

if not args.export_only:
    blend.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(output)
print(json.dumps({'glb':str(output),'bytes':output.stat().st_size,
                  'triangles':sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')*2,
                  'evidence':str(evidence)}))
