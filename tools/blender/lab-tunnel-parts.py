"""Recognisable teaching parts, local metres; no Blend or render output.
blender -b --python tools/blender/lab-tunnel-parts.py -- --root .
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
target = Path(args.root).resolve() / 'public/assets/models/lab/tunnel-parts.glb'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(target)], 'json': []}))
    sys.exit(0)
import bpy
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, colour, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*colour, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*colour, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = .48
    return m

rubber = material('Tyre rubber', (.025, .028, .032))
steel = material('Machined steel', (.48, .53, .56), .8)
dark = material('Cast iron', (.13, .16, .18), .65)
red = material('Brake caliper', (.5, .065, .035), .3)
olive = material('Painted petrol can', (.25, .31, .12), .25)

def group(name):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    return o

def finish(o, name, mat, parent):
    o.name = name
    o.data.materials.append(mat)
    o.parent = parent
    return o

def block(name, size, at, mat, parent):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    o = bpy.context.object
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    b = o.modifiers.new('Rounded working edges', 'BEVEL')
    b.width = .04
    b.segments = 3
    bpy.ops.object.modifier_apply(modifier=b.name)
    return finish(o, name, mat, parent)

def cylinder(name, radius, depth, at, mat, parent):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=at)
    return finish(bpy.context.object, name, mat, parent)

# Vertical tyre in glTF: axle along local Z after the export conversion.
tyre = group('tyre')
bpy.ops.mesh.primitive_torus_add(major_radius=.56, minor_radius=.18, major_segments=64, minor_segments=16)
finish(bpy.context.object, 'Rubber sidewall', rubber, tyre)
cylinder('Alloy rim', .44, .26, (0, 0, 0), steel, tyre)
for i in range(36):
    a = i * math.tau / 36
    o = block('Tread block', (.13, .1, .28), (.7*math.cos(a), .7*math.sin(a), 0), rubber, tyre)
    o.rotation_euler.z = a
for i in range(5):
    a = i * math.tau / 5
    cylinder('Wheel bolt', .035, .3, (.24*math.cos(a), .24*math.sin(a), 0), dark, tyre)

brake = group('brake')
cylinder('Brake disc', .64, .09, (0, 0, 0), steel, brake)
cylinder('Disc hub', .23, .2, (0, 0, 0), dark, brake)
for ring in [.38, .51]:
    for i in range(20):
        a = i * math.tau / 20
        cylinder('Vent hole', .022, .095, (ring*math.cos(a), ring*math.sin(a), 0), dark, brake)
block('Brake caliper', (.25, .7, .26), (.53, 0, .03), red, brake)

spring = group('spring')
curve = bpy.data.curves.new('Coil spring helix', 'CURVE')
curve.dimensions = '3D'
curve.bevel_depth = .055
curve.bevel_resolution = 3
s = curve.splines.new('POLY')
s.points.add(384)
for i, p in enumerate(s.points):
    a = i/384 * math.tau*8
    p.co = (.29*math.cos(a), .29*math.sin(a), i/384*1.5-.75, 1)
o = bpy.data.objects.new('Steel coil', curve)
bpy.context.collection.objects.link(o)
o.parent = spring
curve.materials.append(red)
cylinder('Damper piston', .055, 1.55, (0, 0, 0), steel, spring)
for z in [-.8, .8]:
    cylinder('Spring seat', .39, .09, (0, 0, z), dark, spring)

wing = group('wing')
# Rounded leading edge and a thin trailing edge, with curved camber.
verts = []
for x in [-1.1, 1.1]:
    for i in range(17):
        t = i/16
        verts.append((x, -.48+t*.96, .10*math.sin(t*math.pi)))
faces = [(i, i+1, i+18, i+17) for i in range(16)]
mesh = bpy.data.meshes.new('Cambered wing')
mesh.from_pydata(verts, [], faces)
o = bpy.data.objects.new('Wing aerofoil', mesh)
bpy.context.collection.objects.link(o)
o.parent = wing
mesh.materials.append(dark)
solid = o.modifiers.new('Wing skin', 'SOLIDIFY')
solid.thickness = .045
for x in [-1.1, 1.1]:
    block('Wing endplate', (.04, 1.02, .4), (x, 0, .08), steel, wing)

can = group('can')
block('Jerry can body', (.8, .38, 1.05), (0, 0, 0), olive, can)
for tilt in [-.65, .65]:
    o = block('Pressed reinforcement', (.06, .035, .8), (0, -.205, 0), steel, can)
    o.rotation_euler.y = tilt
for x in [-.22, .22]:
    block('Handle upright', (.09, .12, .2), (x, 0, .62), olive, can)
block('Carrying handle', (.5, .12, .09), (0, 0, .72), olive, can)
cylinder('Fuel cap', .11, .08, (.27, 0, .56), dark, can)
level = group('fuel-level')
level.parent = can
level.location = (-.27, -.25, -.4)
cylinder('Petrol sight gauge', .035, .8, (0, 0, .4), red, level)
for z in [-.4, 0, .4]:
    block('Sight gauge tick', (.16, .035, .025), (-.27, -.25, z), steel, can)

scale = group('scale')
block('Weighing scale case', (1.35, 1.25, .3), (0, 0, .15), dark, scale)
block('Stainless weighing tray', (1.4, 1.28, .05), (0, 0, .32), steel, scale)
block('Scale readout bezel', (.72, .045, .22), (0, -.65, .15), rubber, scale)
for x in [-.5, .5]:
    for y in [-.45, .45]:
        block('Scale rubber foot', (.16, .16, .08), (x, y, -.035), rubber, scale)

stand = group('wing-stand')
block('Wing balance foot', (.5, 1.5, .08), (0, 0, .4), steel, stand)
for y in [-.6, .6]:
    block('Wing balance upright', (.08, .08, 1.18), (0, y, 1.02), steel, stand)
block('Wing support saddle', (.16, 1.4, .05), (0, 0, 1.62), dark, stand)
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_yup=True)
