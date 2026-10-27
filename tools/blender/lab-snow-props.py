"""Named objects and enlarged snow cutaways for LAB-LESSONS-SNOW.

blender -b --factory-startup --python tools/blender/lab-snow-props.py -- --root <lane>
Keeps only the runtime GLB, never a Blend file.
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
out = Path(args.root).resolve() / 'public/assets/models/lab/snow-lesson-props.glb'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(out)], 'evidence': [], 'summary': []}))
    raise SystemExit(0)

import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, rgb, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = .4
    return m

steel = material('Steel edges and bindings', (.42, .48, .5), .7)
ink = material('Dark base and printed names', (.035, .055, .065))
cream = material('Tape and paper wrappers', (.88, .81, .60))
blue = material('Blue skis and cold wax', (.08, .28, .60))
red = material('Skier jacket and warm wax', (.7, .12, .06))
teal = material('Medium wax', (.1, .53, .45))
snow = material('Sharp snow crystals', (.77, .9, .96))
water = material('Melt water', (.2, .65, .83))
skin = material('Face', (.64, .43, .28))
parent = None

def prop(name):
    global parent
    parent = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(parent)

def finish(obj, name, mat):
    obj.name = name
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj

def box(name, pos, size, mat, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, mat)
    if bevel:
        mod = obj.modifiers.new('Rounded edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def ball(name, pos, size, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=pos)
    obj = bpy.context.object
    obj.scale = size
    return finish(obj, name, mat)

def rod(name, a, b, radius, mat):
    from mathutils import Vector
    va, vb = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=(vb-va).length, location=(va+vb)/2)
    obj = bpy.context.object
    obj.rotation_euler = (vb-va).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, mat)

def text(label, pos, size, mat=ink):
    bpy.ops.object.text_add(location=(pos[0], -pos[1], pos[2]))
    obj = bpy.context.object
    obj.data.body = label
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    obj.data.size = size
    obj.data.extrude = .001
    obj.rotation_euler = (math.pi/2, 0, math.pi)
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object, label, mat)

def skis():
    for y in [-.11, .11]:
        box('Shaped ski with metal edge', (0, y, .025), (1.65, .11, .035), steel)
        box('Blue ski top', (0, y, .05), (1.61, .09, .026), blue)
        tip = box('Upturned ski tip', (.87, y, .10), (.22, .10, .035), blue)
        tip.rotation_euler.y = -.4
        for x in [-.12, .12]:
            box('Boot binding', (x, y, .09), (.10, .10, .07), ink)

prop('test-skis')
skis()
prop('skier')
skis()
for y in [-.11, .11]:
    box('Ski boot', (-.05, y, .15), (.26, .11, .14), ink)
    rod('Lower leg', (-.08, y, .21), (.10, y, .43), .065, ink)
    rod('Upper leg', (.10, y, .43), (-.16, y, .66), .075, ink)
ball('Red jacket', (-.02, 0, .82), (.2, .20, .27), red)
ball('Face', (.10, 0, 1.10), (.115, .12, .14), skin)
ball('Helmet', (.08, 0, 1.19), (.14, .14, .11), cream)
box('Goggles', (.20, 0, 1.12), (.035, .21, .07), ink)
for y in [-.22, .22]:
    rod('Sleeve', (.02, y, .94), (.27, y, .73), .06, red)
    ball('Glove', (.29, y, .72), (.06, .055, .06), ink)
    rod('Ski pole', (.29, y, .72), (-.2, y, .12), .012, steel)

for name, mat in [('hard', blue), ('medium', teal), ('soft', red)]:
    prop('wax-' + name)
    box('Rounded wax block', (0, 0, .07), (.7, .34, .14), mat, .035)
    box('Paper wrapper', (0, -.176, .07), (.58, .012, .12), cream, .004)
    text(name.upper() + ' WAX', (0, -.185, .072), .075)
    text(name.upper(), (0, -.05, .146), .105).rotation_euler = (0, 0, math.pi)

prop('landing-tape')
box('Tape housing', (0, 0, .05), (.25, .3, .1), ink)
box('Measuring tape', (2.25, 0, .015), (4.5, .13, .025), cream)
for i in range(61):
    box('Metre tick', (i*.072, 0, .031), (.008, .12 if i%5 == 0 else .06, .008), ink, 0)
prop('landing-platform')
box('Level landing table', (2.25, 0, -.03), (4.5, .7, .08), steel)
for x in [.2, 4.2]:
    for y in [-.25, .25]:
        rod('Landing table leg', (x, y, -.04), (x, y, -.4), .035, steel)
prop('wax-selector')
box('Selector housing', (0, 0, .06), (.9, .5, .12), steel)
text('WAX SELECTOR', (0, -.26, .07), .085, cream)
ball('Turn handle', (0, 0, .18), (.14, .14, .07), ink)
prop('selector-hand')
rod('Wax selector pointer', (0, 0, .025), (0, -.2, .025), .022, red)
prop('landing-flag')
rod('Flag pole', (0, 0, 0), (0, 0, 1), .018, steel)
box('Flag foot', (0, 0, .03), (.25, .22, .06), ink)
box('Red target pennant', (.17, 0, .87), (.34, .025, .22), red)
text('LAND HERE', (.17, -.02, .87), .043, cream)

prop('cold-cutaway')
box('Magnified snow sample', (0, 0, 0), (1.2, .55, .09), snow)
for i in range(13):
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=.09, radius2=0, depth=.23, location=(-.53+i*.085, 0, .14))
    finish(bpy.context.object, 'Sharp ice crystal', snow)
text('COLD: SHARP ICE', (0, -.29, .01), .105)
prop('wet-cutaway')
box('Wet snow sample', (0, 0, 0), (1.2, .55, .09), snow)
for i in range(9):
    ball('Melt water droplet', (-.5+i*.125, 0, .12), (.085, .16, .07), water)
text('WARM: MELT WATER', (0, -.29, .01), .085)
prop('scratched-base')
box('Soft ski base', (0, 0, 0), (1.3, .48, .1), ink)
for i in range(5):
    rod('Scratch through soft base', (-.5, -.17+i*.08, -.052), (.5, -.14+i*.08, -.052), .009, cream)
prop('hard-base')
box('Hard protected ski base', (0, 0, 0), (1.3, .48, .1), ink)
box('Hard wax protective layer', (0, 0, -.057), (1.3, .48, .014), blue, .004)
text('HARD WAX BASE', (0, -.25, .005), .08, cream)
prop('grooved-base')
for i in range(5):
    box('Base ridge leaves a water channel', (0, -.2+i*.1, 0), (1.3, .07, .1), ink)
for i in range(4):
    rod('Water escaping through groove', (-.6, -.15+i*.1, -.03), (.7, -.15+i*.1, -.03), .012, water)

out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True, export_extras=True)
print(f'Snow props: {out.stat().st_size} bytes')
