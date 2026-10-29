"""C5 round 1 original torii and stone lantern. No blend file is retained.
blender -b --python tools/blender/kogane/landmarks.py -- --root .
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def material(name, colour, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*colour, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*colour, 1)
    p.inputs['Roughness'].default_value = .78
    p.inputs['Emission Color'].default_value = (*colour, 1)
    p.inputs['Emission Strength'].default_value = glow
    return m


def box(name, location, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    return o


def cylinder(name, location, radius, height, mat, n):
    bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=radius,
                                  radius2=radius*.91, depth=height, location=location)
    bpy.context.object.name = name
    bpy.context.object.data.materials.append(mat)


def beam(name, width, depth, z, thickness, rise, mat, segments):
    # Continuous curved crossbeam with the ends lifted, as in reference 02.
    vertices = []
    for i in range(segments+1):
        x = width*(i/segments-.5)
        h = z+rise*(2*x/width)**2
        vertices.extend([(x,-depth/2,h), (x,depth/2,h),
                         (x,depth/2,h+thickness), (x,-depth/2,h+thickness)])
    faces = [(3,2,1,0), tuple(4*segments+j for j in range(4))]
    for i in range(segments):
        for j in range(4):
            faces.append((4*i+j,4*i+(j+1)%4,4*(i+1)+(j+1)%4,4*(i+1)+j))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    bpy.context.collection.objects.link(bpy.data.objects.new(name, mesh))


def torii(low, small=False):
    red = material('weathered vermilion lacquer', (.62,.065,.019))
    edge = material('charcoal roof cap', (.045,.052,.049))
    foot = material('dark water stained stone', (.13,.15,.14))
    gold = material('aged bronze plaque', (.39,.28,.10))
    n = 8 if low else 16
    for x in [-3.65,3.65]:
        cylinder('black post foot', (x,0,.35), .57,.7,foot,n)
        o = box('square post core', (x,0,3.65), (.74,.8,6.6),red)
        o.rotation_euler.y = -.025*math.copysign(1,x)
        for y in [-1.75,1.75]:
            cylinder('support foot',(x,y,.2),.35,.4,foot,n)
            cylinder('support post',(x,y,1.9),.23,3.5,red,n)
            box('support cap',(x,y,3.7),(.8,.7,.18),edge)
        box('low brace',(x,0,2.3),(.25,4,.25),red)
    box('lower tie beam',(0,0,5.45),(9,.5,.52),red)
    box('centre strut',(0,0,6.2),(.42,.55,1.2),red)
    beam('vermilion upper beam',10.4,.94,6.75,.48,.38,red,4 if low else 12)
    beam('curved dark roof',11,1.12,7.23,.20,.42,edge,4 if low else 12)
    box('unlettered bronze plaque',(0,-.49,6.3),(.7,.10,1.0),gold)
    if small:
        for o in bpy.context.scene.objects:
            if o.type == 'MESH':
                o.scale *= .45
                o.location *= .45


def lantern(low):
    stone = material('mottled volcanic stone',(.29,.31,.27))
    dark = material('lantern recess',(.055,.065,.054))
    light = material('warm lantern window',(.95,.48,.12),1.2)
    n = 6 if low else 12
    box('wide stone base',(0,0,.12),(.92,.92,.24),stone)
    box('stepped stone base',(0,0,.3),(.65,.65,.16),stone)
    cylinder('stone stem',(0,0,.87),.18,1.05,stone,n)
    box('lamp seat',(0,0,1.43),(.78,.78,.18),stone)
    box('dark lamp chamber',(0,0,1.8),(.55,.55,.62),dark)
    for side in [-1,1]:
        box('glowing window',(0,side*.281,1.8),(.31,.018,.34),light)
        box('glowing window',(side*.281,0,1.8),(.018,.31,.34),light)
        for x in [-.29,.29]:
            box('stone chamber corner',(x,side*.29,1.8),(.11,.11,.64),stone)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=.82, radius2=.23,
                                  depth=.37, location=(0,0,2.25), rotation=(0,0,math.pi/4))
    bpy.context.object.data.materials.append(stone)
    cylinder('roof finial',(0,0,2.57),.12,.28,stone,n)


def car_park(low):
    asphalt = material('worn car park asphalt',(.075,.085,.081))
    paint = material('faded parking paint',(.55,.56,.45))
    box('summit car park apron',(0,0,.035),(30,20,.07),asphalt)
    for x in [-12,-8,-4,0,4,8,12]:
        box('parking bay line',(x,5,.075),(.08,6,.015),paint)


args = argparse.ArgumentParser()
args.add_argument('--root', type=Path, required=True)
root = args.parse_args(sys.argv[sys.argv.index('--')+1:]).root.resolve()
records = []
for name, caps in [('torii',(1800,600)),('torii-small',(1800,600)),
                   ('stone-lantern',(700,250)),('kogane-car-park',(150,150))]:
    record = {'id':name,'budget':caps,'files':[]}
    for low in [False,True]:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        if name == 'kogane-car-park':
            car_park(low)
        elif name == 'stone-lantern':
            lantern(low)
        else:
            torii(low, name == 'torii-small')
        objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        o = bpy.context.object
        o.name = name
        o.data.calc_loop_triangles()
        triangles = len(o.data.loop_triangles)
        if triangles > caps[int(low)]:
            raise ValueError(f'{name} has {triangles} triangles')
        points = [o.matrix_world @ Vector(v) for v in o.bound_box]
        size = [max(v[i] for v in points)-min(v[i] for v in points) for i in [0,2,1]]
        path = root/'public/assets/models/circuits/kits'/(name+('-lod' if low else '')+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,
                              export_cameras=False,export_lights=False,export_animations=False)
        record['files'].append({'path':path.name,'triangles':triangles,'size':size,
                               'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    records.append(record)
(root/'tools/blender/kogane/landmarks.json').write_text(json.dumps({
    'round':1,'units':'metres','up':'Y','models':records},indent=2)+'\n',encoding='utf-8',newline='\n')
