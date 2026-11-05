"""Build one original, metric airliner graveyard for the Scablands.

Run with Blender 4.5:
  blender -b --python-exit-code 1 --python tools/blender/scablands-boneyard.py -- --root .

Coordinates are metres, +Y up, with the drive-through direction along +Z.
"""
import argparse
import json
import math
import os
import sys
from datetime import date
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/boneyard.glb'
blend = root / 'art-build/scablands-boneyard/boneyard.blend'
evidence = Path(os.environ.get('DUEL_EVIDENCE_DIR') or
                root / '.evidence' / date.today().isoformat() / 'ww-art-boneyard' / 'round-1')
if not evidence.is_absolute():
    evidence = root / evidence
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)],
                      'evidence': [str(evidence)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
evidence.mkdir(parents=True, exist_ok=True)

def mat(name, color, metal=0.0, rough=.86, rust=False):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if rust:
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 5.4
        noise.inputs['Detail'].default_value = 3
        noise.inputs['Roughness'].default_value = .78
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = .28
        ramp.color_ramp.elements[0].color = (.075,.085,.082,1)
        ramp.color_ramp.elements[1].position = .72
        ramp.color_ramp.elements[1].color = (.37,.135,.047,1)
        mid = ramp.color_ramp.elements.new(.51)
        mid.color = (.19,.13,.09,1)
        links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
        links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .24
        bump.inputs['Distance'].default_value = .035
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    else:
        shader.inputs['Base Color'].default_value = (*color, 1)
    return m

steel = mat('Salt-pitted oxidised aircraft steel', (.25,.20,.14), .56, .88, True)
paint = mat('Faded service paint under rust', (.24,.28,.25), .28, .9, True)
dark = mat('Soot-dark interior steel', (.045,.052,.05), .32, .94)
glass = mat('Clouded cockpit glass', (.075,.105,.105), .48, .42)
rubber = mat('Engine pod burnt rubber', (.035,.038,.036), .04, .98)
earth = mat('Dry Scablands dirt', (.25,.17,.095), 0, 1)

root_obj = bpy.data.objects.new('Scablands Boneyard', None)
root_obj.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(root_obj)
objects=[]

def mesh_obj(name, verts, faces, material, loc=(0,0,0)):
    mesh=bpy.data.meshes.new(name+' mesh')
    mesh.from_pydata(verts, [], faces); mesh.materials.append(material); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.location=loc; obj.parent=root_obj; objects.append(obj)
    return obj

def box(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj=bpy.context.object; obj.name=name; obj.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material); obj.parent=root_obj; objects.append(obj)
    if bevel:
        mod=obj.modifiers.new('Bent sheet edges','BEVEL'); mod.width=bevel; mod.segments=1
        obj.modifiers.new('Worn corner normals','WEIGHTED_NORMAL')
    return obj

def cylinder(name, loc, radius, depth, material, vertices=16, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        end_fill_type='NGON', location=loc, rotation=rotation)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(material)
    obj.parent=root_obj; objects.append(obj); return obj

def beam(name, a, b, radius, material, vertices=8):
    v1,v2=Vector(a),Vector(b); d=v2-v1
    obj=cylinder(name,(v1+v2)/2,radius,d.length,material,vertices)
    obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=d.to_track_quat('Z','Y')
    return obj

def aircraft(label, center, yaw, damage):
    """38 m twin aisle wreck; 5.2 m clear interior and open ends."""
    base=Vector(center); ca,sa=math.cos(yaw),math.sin(yaw)
    def p(x,y,z): return (base.x+ca*x-sa*z, base.y+y, base.z+sa*x+ca*z)
    # Curved, segmented fuselage shell; lower belly partly buried, both ends open.
    rings=[(-18,2.45,.98),(-13,2.72,1.08),(-7,2.78,1.12),(2,2.8,1.13),(11,2.72,1.08),(16,2.52,.98)]
    n=24; verts=[]; faces=[]
    for z,rx,ry in rings:
        for j in range(n+1):
            a=math.pi*(.04+.92*j/n)
            verts.append(p(rx*math.cos(a),ry+ry*math.sin(a),z))
    for k in range(len(rings)-1):
        for j in range(n):
            # Leave uneven tears at the ends and roof: recognizable torn sheet edges.
            if (k==0 and j in (3,4,19)) or (k==4 and j in (8,9,10,21)):
                continue
            faces.append((k*(n+1)+j,k*(n+1)+j+1,(k+1)*(n+1)+j+1,(k+1)*(n+1)+j))
    hull=mesh_obj(label+' torn fuselage shell',verts,faces,steel)
    # Interior floor, cross ribs, broken longitudinal stringers.
    for z in range(-15,15,3):
        # Rib arches stop short of floor, leaving a wide unobstructed car path.
        for j in range(15):
            a=math.pi*.08+math.pi*.84*j/14
            q1=p(2.55*math.cos(a),.98+1.02*math.sin(a),z)
            q2=p(2.55*math.cos(a+math.pi*.84/14),.98+1.02*math.sin(a+math.pi*.84/14),z)
            beam(label+' exposed cabin rib',q1,q2,.045,paint,6)
    floorverts=[p(-2.55,.2,-16),p(2.55,.2,-16),p(2.55,.2,16),p(-2.55,.2,16)]
    mesh_obj(label+' open drive-through deck',floorverts,[(0,1,2,3)],dark)
    # Remains of window frames, deliberately sparse and asymmetric.
    for side in (-1,1):
        for z in range(-12,14,3):
            if (z*side+int(damage*10))%4==0: continue
            x=side*2.48
            beam(label+' torn window mullion',p(x,.95,z-.62),p(x,.95,z+.62),.045,paint,6)
        for z in (-14,13):
            beam(label+' lower side stringer',p(side*2.45,.38,z),p(side*2.6,.48,z+2),.095,steel,8)
    # Tailcone rises 6 m; forked remains are unmistakably an airliner tail.
    beam(label+' raised tail boom',p(0,1.3,7),p(0,6.1,18),.48,steel,16)
    box(label+' left vertical tail',p(-.38,4.6,15.7),(.72,3.6,4.6),paint,.12)
    box(label+' right vertical tail',p(.38,4.6,15.7),(.72,3.6,4.6),steel,.12)
    # Wing roots broken off; low ragged stubs form a pair of driveable ramps.
    for side in (-1,1):
        x0=side*2.35; x1=side*8.6
        rampverts=[p(x0,.82,-1.8),p(x1,.08,-2.8),p(x1,.08,5.6),p(x0,.82,3.9),
                   p(x0,.55,-1.8),p(x1,-.06,-2.8),p(x1,-.06,5.6),p(x0,.55,3.9)]
        rampfaces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
        mesh_obj(label+(' left low wing remnant' if side<0 else ' right low wing remnant'),rampverts,rampfaces,paint)
        # Folded spar and torn ribs make ramps read as heavy welded aircraft structure.
        for z in (-1.4,0,2,4.8):
            beam(label+' exposed wing spar',p(x0,.5,z),p(x1,-.02,z),.10,steel,8)
        for t in (.25,.56,.82):
            x=x0+(x1-x0)*t
            beam(label+' wing rib',p(x,.3,-1.2),p(x,-.03,4.7),.045,dark,6)
        # Engine pods lie beside the fuselage, detached and scorched.
        ex=side*4.2; ez=-2.7 if side<0 else 4.8
        pod=cylinder(label+' grounded engine pod',p(ex,.56,ez),.75,2.4,rubber,24)
        cylinder(label+' exposed engine intake rim',p(ex,.56,ez-1.21),.64,.12,steel,24)
        cylinder(label+' black turbine face',p(ex,.56,ez-1.29),.49,.025,dark,20)
        for blade in range(8):
            a=blade*math.tau/8
            beam(label+' bent turbine blade',p(ex,.56+.42*math.sin(a),ez-1.31+.42*math.cos(a)),
                 p(ex,.56+.17*math.sin(a+.18),ez-1.31+.17*math.cos(a+.18)),.025,steel,5)
    # Cockpit remnant and fractured windscreen at the nose.
    box(label+' cockpit crown',p(0,2.5,-17.2),(3.2,1.45,3.0),paint,.28)
    for x in (-.8,0,.8):
        beam(label+' cockpit glazing bar',p(x,2.2,-18.55),p(x*.85,3.0,-17.8),.055,glass,6)
    # Broken landing gear; one heavy leg still holds the tail end high.
    for x,z,h in ((-1.4,-5,.9),(1.4,-5,.5),(0,8,1.55)):
        beam(label+' buckled landing gear',p(x,.25,z),p(x*.9,-h,z+.35),.16,steel,10)
        cylinder(label+' torn tyre',p(x*.9,-h,z+.35),.44,.28,rubber,16,(0,math.pi/2,0))

# Three distinct wrecks in a row: one complete tunnel, one split-open shell, one tail-up.
aircraft('North wreck',(0,0,0),0,.23)
aircraft('East wreck',(27,0,4),-.19,.64)
aircraft('South wreck',(-27,0,-2),.14,.81)
# Scablands dirt pad and scattered plate scrap frame the silhouettes.
box('Boneyard dirt slab',(0,-.58,0),(78,.18,58),earth)
for i,(x,z,a) in enumerate(((-20,-19,.22),(15,-17,-.3),(32,10,.5),(-35,12,-.4),(19,22,.8),(-12,21,-.6))):
    obj=box('Loose rusted aircraft skin',(x,-.28,z),(2.8,.11,1.1),steel,.035); obj.rotation_euler[1]=a

bpy.context.view_layer.update()
triangles=sum(len(poly.vertices)-2 for obj in objects if obj.type=='MESH' for poly in obj.data.polygons)
print('boneyard authored triangle count:',triangles)
assert 5000 < triangles <= 45000, f'triangle budget exceeded or unexpectedly sparse: {triangles}'

# World setup for reproducible orthographic review angles.
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1200; scene.render.resolution_y=760; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
scene.render.resolution_percentage=70
scene.world=bpy.data.worlds.new('Scablands review world')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.22,.24,.26,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.52
sun_data=bpy.data.lights.new('Hard desert afternoon','SUN'); sun_data.energy=2.2
sun=bpy.data.objects.new('Hard desert afternoon',sun_data); scene.collection.objects.link(sun)
sun.rotation_euler=(math.radians(-66),math.radians(-24),math.radians(-31))
fill_data=bpy.data.lights.new('Open sky fill','AREA'); fill_data.energy=14000; fill_data.shape='DISK'; fill_data.size=42
fill=bpy.data.objects.new('Open sky fill',fill_data); scene.collection.objects.link(fill)
fill.location=(-5,38,-8); fill.rotation_euler=(math.radians(-90),0,0)
def point_camera(cam, target): cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def render_view(name, position, target, scale=75):
    data=bpy.data.cameras.new(name+' camera'); cam=bpy.data.objects.new(name+' camera',data)
    scene.collection.objects.link(cam); cam.location=position; data.type='ORTHO'; data.ortho_scale=scale
    point_camera(cam,target); scene.camera=cam
    scene.render.filepath=str(evidence/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True); bpy.data.cameras.remove(data)
render_view('quarter', (58,35,-67),(0,1,0),75)
render_view('drive-through', (0,3,-47),(0,2,0),26)
render_view('tail-and-wing', (0,34,39),(0,2,1),75)

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='DESELECT'); root_obj.select_set(True)
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,
                           export_yup=True,export_apply=False,export_cameras=False,export_lights=False,
                           export_materials='EXPORT',export_image_format='AUTO')
print('boneyard GLB bytes:',out.stat().st_size)
assert out.stat().st_size <= 2_000_000, 'GLB exceeds the 2 MB card budget'
