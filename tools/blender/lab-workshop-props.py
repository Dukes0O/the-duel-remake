"""Named, handled workshop objects for LAB-LESSONS-WORKSHOP look round 2.

blender -b --factory-startup --python tools/blender/lab-workshop-props.py -- --root <lane>
Only the runtime GLB is kept; no .blend or render output is written.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/lab/workshop-lesson-props.glb'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(out)], 'evidence': [], 'summary': []}))
    raise SystemExit(0)

import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, colour, metallic=0, roughness=.55):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*colour, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*colour, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    return m

iron = material('Worn cast iron', (.10, .13, .14), .65)
steel = material('Brushed steel', (.44, .49, .51), .8, .34)
alu = material('Brushed aluminium', (.72, .76, .77), .8, .28)
carbon = material('Carbon fibre resin', (.045, .055, .06), .35, .32)
paper = material('Cream paper labels', (.84, .80, .64))
ink = material('Printed charcoal', (.045, .065, .06))
blue = material('Water jug blue', (.18, .43, .53), .05, .36)
paint = material('Paint tin enamel', (.25, .39, .29), .35)
red = material('Red screw cap', (.55, .12, .075), .1)
cloth = material('Salt sack canvas', (.65, .57, .39))
brass = material('Aged brass', (.58, .40, .13), .7)
glass = material('Clear jar glass', (.7, .86, .9), 0, .15)
glass.diffuse_color = (.7, .86, .9, .22)
glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value = .22
glass.surface_render_method = 'DITHERED'
parent = None

def prop(name):
    global parent
    parent = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(parent)
    return parent

def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.parent = parent
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Rounded manufactured edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def box(name, pos, size, mat, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o = bpy.context.object
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, mat, bevel)

def cyl(name, pos, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=pos)
    return finish(bpy.context.object, name, mat, .007)

def tube(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    line = curve.splines.new('POLY')
    line.points.add(len(points)-1)
    for p, co in zip(line.points, points):
        p.co = (*co, 1)
    o = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.data.materials.append(mat)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    return o

def text(label, pos, size, mat=ink, top=False):
    bpy.ops.object.text_add(location=pos)
    o = bpy.context.object
    o.data.body = label
    o.data.align_x = 'CENTER'
    o.data.align_y = 'CENTER'
    o.data.size = size
    o.data.extrude = .0008
    if not top:
        o.rotation_euler = (math.pi/2, 0, 0)
    o.parent = parent
    o.data.materials.append(mat)
    bpy.ops.object.convert(target='MESH')
    o.name = 'Stamped ' + label
    return o

prop('paint-tin')
cyl('Seamed enamel body', (0, 0, .22), .17, .4, paint)
for z in [.025, .405, .425]:
    cyl('Rolled steel rim', (0, 0, z), .178, .018, steel)
cyl('Recessed lid', (0, 0, .437), .15, .01, iron)
box('Paper brand label', (0, -.173, .23), (.28, .008, .19), paper, .005)
text('PAINT', (0, -.181, .25), .066)
text('BRUSH ON', (0, -.181, .185), .026)
tube('Wire carrying bail', [(.185*math.cos(a), 0, .34+.23*math.sin(a)) for a in [i*math.pi/24 for i in range(25)]], .009, steel)

prop('zinc-can')
cyl('Spray can steel body', (0, 0, .24), .115, .43, alu)
cyl('Crimped bottom', (0, 0, .025), .12, .025, steel)
cyl('Shoulder', (0, 0, .46), .09, .04, steel)
cyl('Valve', (0, 0, .49), .025, .045, red)
box('Spray nozzle', (0, -.02, .52), (.055, .055, .035), red, .007)
box('Zinc paper label', (0, -.115, .26), (.19, .008, .25), paper, .005)
text('ZINC', (0, -.123, .30), .06)
text('STEEL COAT', (0, -.123, .22), .025)

prop('salt-bag')
bag = box('Soft canvas sack', (0, 0, .24), (.36, .22, .45), cloth, .065)
box('Folded stitched mouth', (0, 0, .475), (.33, .09, .035), cloth)
for x in [-.14, .14]:
    tube('Sewn seam', [(x, -.115, .06), (x, -.128, .36), (x*.8, -.055, .47)], .003, paper)
box('Salt paper label', (0, -.116, .24), (.26, .009, .2), paper, .006)
text('SALT', (0, -.125, .265), .065)
text('NaCl', (0, -.125, .195), .034)

prop('water-jug')
box('Moulded jug body', (0, 0, .22), (.32, .22, .4), blue, .07)
cyl('Narrow neck', (-.07, 0, .44), .06, .12, blue)
cyl('Ribbed screw cap', (-.07, 0, .51), .065, .04, red)
tube('Open carrying handle', [(.13, 0, .38), (.26, 0, .37), (.29, 0, .2), (.15, 0, .14)], .024, blue)
box('Jug label', (0, -.116, .22), (.24, .008, .17), paper, .004)
text('WATER', (0, -.125, .24), .049)
text('FRESH', (0, -.125, .18), .028)

prop('dry-air-jar')
cyl('Empty glass jar', (0, 0, .22), .14, .4, glass)
cyl('Sealed steel lid', (0, 0, .44), .15, .035, steel)
cyl('Dry steel nail', (0, 0, .16), .007, .26, steel)
cyl('Nail head', (0, 0, .29), .02, .01, steel)
box('Dry air label', (0, -.145, .20), (.23, .008, .15), paper, .004)
text('DRY AIR', (0, -.153, .22), .045)
text('NO WATER', (0, -.153, .165), .028)

for name, label, mat in [('steel-bar', 'STEEL', steel), ('aluminium-bar', 'ALUMINIUM', alu), ('carbon-bar', 'CARBON FIBRE', carbon)]:
    prop(name)
    box('Rectangular material sample', (0, 0, .07), (.65, .13, .14), mat, .009)
    text(label, (0, -.069, .075), .055, paper if mat != alu else ink)
    if mat == carbon:
        for i in range(18):
            tube('Woven carbon strand', [(-.31+i*.035, -.071, .015), (-.27+i*.035, -.071, .125)], .0016, steel)
    prop(name + '-stamp')
    text(label, (0, -.006, 0), .115, paper if mat != alu else ink)

prop('mass-weight')
cyl('Cast iron test mass', (0, 0, .16), .22, .27, iron)
cyl('Raised shoulder', (0, 0, .31), .15, .05, iron)
tube('Weight lifting eye', [(.11*math.cos(a), 0, .38+.11*math.sin(a)) for a in [i*math.pi/20 for i in range(21)]], .026, iron)
text('kg', (0, -.223, .16), .085, paper)

prop('control-stand')
box('Bolted base plate', (0, 0, .025), (.45, .4, .05), iron)
box('Instrument pedestal', (0, 0, .49), (.085, .085, .92), steel)
box('Control mounting plate', (0, 0, .97), (.43, .4, .06), iron)
for x in [-.17, .17]:
    for y in [-.14, .14]:
        cyl('Anchor bolt', (x, y, .06), .018, .02, steel)

for name, label in [('speed-wheel', 'SPEED'), ('radius-wheel', 'RADIUS'), ('thickness-wheel', 'THICKNESS'), ('heading-wheel', 'COMPASS')]:
    prop(name)
    cyl('Wheel hub', (0, 0, .035), .12, .07, iron)
    tube('Handwheel rim', [(.18*math.cos(i*math.pi/20), .18*math.sin(i*math.pi/20), .065) for i in range(41)], .023, brass)
    for a in [0, 2.094, 4.189]:
        tube('Spoke', [(0, 0, .06), (.17*math.cos(a), .17*math.sin(a), .06)], .012, steel)
    cyl('Turning grip', (.16, 0, .13), .035, .15, iron)
    text(label, (0, 0, .10), .045, paper, top=True)

prop('underbody-panel')
box('Pressed steel floor pan', (0, 0, .025), (.45, .3, .04), steel)
for x in [-.14, 0, .14]:
    box('Pressed strengthening rib', (x, 0, .052), (.03, .26, .025), iron, .008)
text('UNDERBODY', (0, -.155, .045), .042, paper)
prop('exhaust-pipe')
tube('Bent exhaust tube', [(-.23, 0, .08), (-.12, 0, .08), (-.08, .08, .08), (.16, .08, .08)], .035, steel)
cyl('Muffler', (.06, .08, .075), .07, .22, steel).rotation_euler[1] = math.pi/2
text('EXHAUST', (0, -.07, .065), .048, paper)
prop('armour-plate')
box('Steel armour plate', (0, 0, .03), (.4, .3, .055), steel, .025)
for x in [-.15, .15]:
    for y in [-.10, .10]:
        cyl('Bolt', (x, y, .065), .018, .02, iron)
text('ARMOUR', (0, -.155, .04), .05, paper)

# Permanent shelf tags are model parts, not extra floating numeric captions.
prop('supplies-table')
box('Steel work tray', (0, 0, 1.35), (2.7, .7, .06), steel)
for x in [-1.25, 1.25]:
    for y in [-.27, .27]:
        box('Tray leg', (x, y, .67), (.055, .055, 1.34), iron, .007)
for y in [-.35, .35]:
    box('Raised tray edge', (0, y, 1.4), (2.7, .025, .1), iron, .006)
for name, label in [('jar-dry-tag', 'DRY AIR: 0% RUST'), ('jar-fresh-tag', 'FRESH WATER'), ('jar-salt-tag', 'SALT WATER'), ('jar-zinc-tag', 'ZINC + SALT')]:
    prop(name)
    box('Shelf nameplate', (0, 0, 0), (.52, .015, .11), paper, .004)
    text(label, (0, -.012, 0), .047 if name == 'jar-dry-tag' else .065)

out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True, export_extras=True)
print(f'Workshop props: {out.stat().st_size} bytes')
