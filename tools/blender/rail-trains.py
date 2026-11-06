"""Round 1 of WW-ART-RAIL: the works passenger engine and its salt drift.

Run with Blender 4.5: blender -b --python tools/blender/rail-trains.py -- --root <repo>
All authored dimensions use glTF metres, X along the track, Y up, Z across it.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render-dir', default='.qa-dist/ww-art-rail')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
recipe = root / 'tools/blender/rail-trains.py'
blend = root / 'art-build/rail/rail-trains.blend'
glb = root / 'public/assets/models/wasteland/rail/rail-trains.glb'
render_dir = Path(args.render_dir)
render_dir = render_dir if render_dir.is_absolute() else root / render_dir
textures = root / 'public/assets/models/wasteland/rail/textures'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': []}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(recipe.parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0

# Read the side photograph as a colour mask, then measure its top silhouette
# in 64 bins. The measured points drive the three main silhouette heights.
side_path = textures / '2-15-side.jpg'
side_image = bpy.data.images.load(str(side_path), check_existing=False)
side_width, side_height = side_image.size
pixels = np.empty(side_width * side_height * 4, dtype=np.float32)
side_image.pixels.foreach_get(pixels)
pixels = pixels.reshape((side_height, side_width, 4))[::-1, :, :3]
background_samples = np.concatenate((pixels[2:12, 30:90].reshape(-1, 3),
                                     pixels[2:12, side_width-90:side_width-30].reshape(-1, 3)))
background = np.median(background_samples, axis=0)
silhouette = np.max(np.abs(pixels - background[None, None, :]), axis=2) > .22
bins = 64
profile = []
for index in range(bins):
    x0 = int(side_width * index / bins)
    x1 = max(x0 + 1, int(side_width * (index + 1) / bins))
    band = silhouette[:int(side_height * .88), x0:x1]
    rows = np.flatnonzero(band.any(axis=1))
    profile.append(float(rows[0]) if len(rows) else float(side_height * .88))
valid = [p for p in profile if p < side_height * .75]
if len(valid) < 30:
    raise RuntimeError('side-photo colour mask found too little locomotive silhouette')
top_px = min(valid)
bottom_px = side_height * .90
photo_span = bottom_px - top_px
measured = []
for x in (-5.5, -4.0, -2.5, -1.0, 0.5, 2.0, 3.5, 5.0):
    idx = max(0, min(bins - 1, int((x + 5.5) / 11.0 * bins)))
    height = max(.25, min(4.0, 4.0 * (bottom_px - profile[idx]) / photo_span))
    measured.append((round(x, 3), round(height, 3)))
print('PHOTO_MASK=' + json.dumps({'resolution': [side_width, side_height], 'background': background.tolist(),
                                  'silhouette_bins': len(valid), 'top_px': top_px,
                                  'outline_metres': measured}))

def outline_height_at(x):
    at = max(0, min(bins - 1, round((x + 5.5) / 11.0 * (bins - 1))))
    return max(.25, min(4.0, 4.0 * (bottom_px - profile[at]) / photo_span))

cab_roof_y = max(3.30, min(3.72, outline_height_at(-4.0) - .16))
boiler_radius = max(.74, min(.96, outline_height_at(1.8) - 2.30))
dome_top_y = max(3.20, min(3.62, outline_height_at(1.1)))
tank_top_y = max(2.78, min(3.10, outline_height_at(-1.0) - .10))
bpy.data.images.remove(side_image)

def photo_material(label, filename, metallic=.12):
    image = bpy.data.images.load(str((textures / filename).resolve()), check_existing=False)
    factor = min(1.0, 1280 / image.size[0], 1280 / image.size[1])
    image.scale(round(image.size[0] * factor), round(image.size[1] * factor))
    image.pack()
    material = bpy.data.materials.new('2:15 / ' + label)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = min(metallic, .29)
    bsdf.inputs['Roughness'].default_value = .94
    tex = material.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Linear'
    tex.extension = 'REPEAT'
    material.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return material

side_mat = photo_material('side photograph, planar projected', '2-15-side.jpg', .10)
front_mat = photo_material('front photograph, planar projected', '2-15-front.jpg', .08)
rear_mat = photo_material('rear photograph, planar projected', '2-15-rear.jpg', .08)
salt_mat = town.make_materials({'sand': str(textures / 'packed-salt.jpg')})['sand']
side_mat.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = .10
cab_shadow = bpy.data.materials.new('2:15 / unlit dark cab interior')
cab_shadow.use_nodes = True
cab_shadow_bsdf = cab_shadow.node_tree.nodes.get('Principled BSDF')
cab_shadow_bsdf.inputs['Base Color'].default_value = (.012,.016,.016,1)
cab_shadow_bsdf.inputs['Metallic'].default_value = 0
cab_shadow_bsdf.inputs['Roughness'].default_value = 1

materials = [side_mat, front_mat, rear_mat]
engine_meshes = []
drift_meshes = []

def project_uv(point, view):
    x, y, z = point
    if view == 'end':
        return ((z + 1.48) / 2.96, y / 4.1)
    if view == 'top':
        idx = max(0, min(bins - 1, round((x + 5.5) / 11.0 * (bins - 1))))
        image_row = min(side_height - 1, profile[idx] + 13)
        return ((x + 5.5) / 11.0, 1.0 - image_row / side_height + (z + 1.45) / 2.9 * .035)
    return ((x + 5.5) / 11.0, y / 4.1)

def mesh_object(name, points, faces, material, view='side', owner='engine'):
    mesh = bpy.data.meshes.new(name + ' geometry')
    mesh.from_pydata([town.game_vector(p) for p in points], [], faces)
    projected = owner == 'engine' and material in (side_mat, front_mat, rear_mat)
    if projected:
        mesh.materials.clear()
        for photo in (side_mat, front_mat, rear_mat):
            mesh.materials.append(photo)
    else:
        mesh.materials.append(material)
    mesh.update()
    uv = mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        face_view = view
        if projected:
            p0, p1, p2 = (Vector(points[faces[poly.index][i]]) for i in range(3))
            normal = (p1-p0).cross(p2-p0).normalized()
            if abs(normal.x) >= abs(normal.y) and abs(normal.x) >= abs(normal.z):
                if normal.x >= 0:
                    poly.material_index = 1
                else:
                    poly.material_index = 2
                face_view = 'end'
            elif normal.y > .5:
                poly.material_index = 0
                face_view = 'top'
            else:
                poly.material_index = 0
                face_view = 'side'
        for li in poly.loop_indices:
            coord = points[mesh.loops[li].vertex_index]
            if face_view == 'salt':
                uv.data[li].uv = (coord[0] / 2.4, coord[2] / 2.4)
            else:
                uv.data[li].uv = project_uv(coord, face_view)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    (drift_meshes if owner == 'drift' else engine_meshes).append(obj)
    return obj

def box(name, center, size, material=side_mat, view='side'):
    x, y, z = center
    sx, sy, sz = (value / 2 for value in size)
    points = [(x-sx,y-sy,z-sz),(x+sx,y-sy,z-sz),(x+sx,y+sy,z-sz),(x-sx,y+sy,z-sz),
              (x-sx,y-sy,z+sz),(x+sx,y-sy,z+sz),(x+sx,y+sy,z+sz),(x-sx,y+sy,z+sz)]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    obj = mesh_object(name, points, faces, material, view)
    bevel_widths = {'deep cast frame':.075,'near running board':.045,'far running board':.045,
                    'water tank':.045,'tank top lip':.025,'cab side lower panel':.035,
                    'cab roof':.055,'cab back lower wall':.035,'front buffer beam':.04,
                    'rear buffer beam':.04}
    width = bevel_widths.get(name)
    if width:
        mod=obj.modifiers.new('small forged edge radius','BEVEL'); mod.width=width; mod.segments=2
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for polygon in obj.data.polygons: polygon.use_smooth=True
    return obj

def cylinder_x(name, x0, x1, center_y, center_z, radius, material=side_mat, sides=24, view='side'):
    points = []
    for x in (x0, x1):
        for i in range(sides):
            a = math.tau * i / sides
            points.append((x, center_y + math.sin(a) * radius, center_z + math.cos(a) * radius))
    faces = []
    for i in range(sides):
        j = (i + 1) % sides
        faces.append((i, j, sides + j, sides + i))
    faces.extend((tuple(reversed(range(sides))), tuple(range(sides, 2*sides))))
    obj=mesh_object(name, points, faces, material, view)
    for polygon in obj.data.polygons: polygon.use_smooth=True
    return obj

def cylinder_z(name, z0, z1, center_x, center_y, radius, material=side_mat, sides=24):
    points=[]
    for z in (z0,z1):
        for i in range(sides):
            a=math.tau*i/sides
            points.append((center_x+radius*math.cos(a),center_y+radius*math.sin(a),z))
    faces=[]
    for i in range(sides):
        j=(i+1)%sides
        faces.append((i,j,sides+j,sides+i))
    faces.extend((tuple(reversed(range(sides))),tuple(range(sides,2*sides))))
    obj=mesh_object(name,points,faces,material,'side')
    for polygon in obj.data.polygons: polygon.use_smooth=True
    return obj

def lathe_x(name, x0, x1, cy, cz, profile, material=side_mat, sides=32):
    points = []
    for x, radius in profile:
        for i in range(sides):
            a = math.tau * i / sides
            points.append((x, cy + radius * math.sin(a), cz + radius * math.cos(a)))
    faces = []
    for row in range(len(profile)-1):
        for i in range(sides):
            j = (i+1) % sides
            a, b = row*sides+i, row*sides+j
            faces.append((a,b,b+sides,a+sides))
    obj=mesh_object(name, points, faces, material, 'side')
    for polygon in obj.data.polygons: polygon.use_smooth=True
    return obj

def bar(name, a, b, width, material=side_mat):
    av, bv = Vector(a), Vector(b)
    direction = (bv-av).normalized()
    ref = Vector((0,0,1)) if abs(direction.z) < .88 else Vector((0,1,0))
    u = direction.cross(ref).normalized() * (width/2)
    v = direction.cross(u).normalized() * (width/2)
    points = [tuple(av-u-v),tuple(bv-u-v),tuple(bv+u-v),tuple(av+u-v),
              tuple(av-u+v),tuple(bv-u+v),tuple(bv+u+v),tuple(av+u+v)]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    return mesh_object(name, points, faces, material, 'side')

# Six axle pairs: twelve full wheels, six visible per side, each with a real
# web, rim, hub and ten spokes. The unusual 0-12-0 layout is this engine's
# original works design and follows the generated side photograph.
wheel_xs = (-3.25, -1.95, -.65, .65, 1.95, 3.25)
wheel_radius = .58
wheel_y = .70
for side in (-1, 1):
    z = side * .94
    for axle, x in enumerate(wheel_xs):
        segments = 32
        points = []
        # Thick disk with an open spoke web is assembled from a real rim and hub.
        for zz in (z-.12, z+.12):
            for radius in (wheel_radius, wheel_radius*.84, .20):
                for i in range(segments):
                    a = math.tau*i/segments
                    points.append((x + radius*math.cos(a), wheel_y + radius*math.sin(a), zz))
        faces = []
        for base in (0, segments*3):
            for i in range(segments):
                j=(i+1)%segments
                faces.append((base+i,base+j,base+segments+j,base+segments+i))
                faces.append((base+segments+i,base+segments+j,base+2*segments+j,base+2*segments+i))
        for i in range(segments):
            j=(i+1)%segments
            faces.append((i,j,segments*3+j,segments*3+i))
            faces.append((2*segments+i,2*segments+j,5*segments+j,5*segments+i))
        mesh_object(f'wheel {axle+1} side {side:+}',points,faces,side_mat,'side')
        cylinder_z(f'wheel {axle+1} hub {side:+}',z-.19,z+.19,x,wheel_y,.20,side_mat,20)
        for spoke in range(10):
            a=math.tau*spoke/10
            bar(f'wheel {axle+1} spoke {spoke+1} {side:+}',
                (x+.17*math.cos(a),wheel_y+.17*math.sin(a),z),
                (x+.68*math.cos(a),wheel_y+.68*math.sin(a),z),.095)
    # Coupling rods link each consecutive crank pin and stand proud of the webs.
    rod_z=z+side*.155
    for axle in range(2):
        bar(f'coupling rod {axle+1} {side:+}',
            (wheel_xs[axle]-.08,wheel_y+.15,rod_z),
            (wheel_xs[axle+1]+.08,wheel_y+.15,rod_z),.105)
    for x in wheel_xs:
        cylinder_z('crank boss',rod_z-.07,rod_z+.07,x,wheel_y+.15,.115,side_mat,16)

# Frame, running boards, buffers and two lengths of real track.
box('deep cast frame',(-.15,.84,0),(8.5,.38,1.45))
box('near running board',(-.15,1.43,-1.22),(8.85,.20,.30))
box('far running board',(-.15,1.43,1.22),(8.85,.20,.30))
box('front buffer beam',(5.02,1.04,0),(.30,.38,2.50),front_mat,'end')
box('rear buffer beam',(-5.10,1.04,0),(.30,.38,2.50),rear_mat,'end')
for x in (-5.25,5.15):
    for z in (-.95,.95):
        cylinder_x('thick buffer',x-.19,x+.19,1.04,z,.18,front_mat if x>0 else rear_mat,20,'end')
        cylinder_x('buffer head',x-.24,x+.24,1.04,z,.14,front_mat if x>0 else rear_mat,20,'end')
for z in (-.7175,.7175):
    box('rusted rail', (0,.14,z),(11.3,.16,.13))
for index in range(23):
    x=-5.45+index*.495
    box(f'old timber sleeper {index+1}',(x,.055,0),(.22,.11,2.35))

# Boiler and smokebox are turned solids with a round profile, 32 sided.
lathe_x('boiler shell',.12,3.88,2.30,0,
        [(.12,boiler_radius*.85),(.24,boiler_radius),(3.55,boiler_radius),(3.88,boiler_radius*.92)],side_mat,32)
lathe_x('smokebox',3.55,4.78,2.30,0,
        [(3.55,.87),(3.68,.97),(4.64,.97),(4.78,.88)],front_mat,32)
# Smokebox face is projected from its own front camera.
cylinder_x('smokebox front rim',4.75,4.88,2.30,0,.88,front_mat,32,'end')
cylinder_x('smokebox door',4.86,4.90,2.30,0,.77,front_mat,32,'end')
domed_radius = max(.34, min(.48, dome_top_y - 3.14))
lathe_x('domed steam dome',1.08,1.92,3.14,0,
        [(1.08,.06),(1.20,domed_radius*.70),(1.36,domed_radius),(1.62,domed_radius),(1.82,domed_radius*.72),(1.92,.08)],side_mat,24)
lathe_x('tall flared chimney',3.61,4.30,3.33,0,
        [(3.61,.24),(3.72,.30),(3.80,.24),(4.17,.24),(4.24,.39),(4.30,.42)],side_mat,24)
lathe_x('chimney cap',4.22,4.35,3.33,0,[(4.22,.38),(4.35,.39)],side_mat,24)

# Deep rectangular side tanks and the open driving cab, measured to the 4 m roofline.
for z in (-.98,.98):
    tank_mid=(1.55+tank_top_y)/2
    box('water tank',(-.82,tank_mid,z),(4.85,tank_top_y-1.55,.88))
    box('tank top lip',(-.82,tank_top_y,z),(4.92,.10,.94))
# Cab is an open shell with a dark rear interior and four thick roof posts.
for z in (-1.05,1.05):
    box('cab side lower panel',(-4.06,2.03,z),(2.12,.88,.14))
    for x in (-5.08,-3.05):
        box('cab window post',(x,2.91,z),(.18,1.12,.18))
    bar('cab side roof rail',(-5.17,cab_roof_y-.11,z),(-2.96,cab_roof_y-.11,z),.15)
    bar('cab side sill',(-5.17,2.44,z),(-2.96,2.44,z),.12)
box('cab back lower wall',(-5.12,2.02,0),(.18,.86,1.95),rear_mat,'end')
box('cab roof',(-4.05,cab_roof_y,0),(2.65,.18,2.52))
box('cab ceiling inner shadow',(-4.05,cab_roof_y-.13,0),(2.30,.045,2.18),cab_shadow)
# Interior fixtures and footplate remain visible through the missing glass.
box('cab floor',(-4.04,1.92,0),(2.15,.13,1.90),cab_shadow)
box('firebox front',(-2.86,2.12,0),(.18,.88,1.05),cab_shadow)
bar('reverser lever',(-4.78,2.02,-.58),(-4.55,2.86,-.58),.075)
bar('cab handbrake',(-3.77,2.04,.54),(-3.89,2.80,.54),.075)

# A few thick plumbing runs and brackets, all deliberately broad and tied to the shell.
for z in (-.80,.80):
    bar('side pipe',(.40,1.70,z),(3.70,1.70,z),.065)
    bar('side pipe drop',(3.70,1.70,z),(3.92,2.10,z),.065)
    for x in (-.20,1.35,2.95):
        bar('pipe saddle',(x,1.62,z),(x,1.81,z),.075)
bar('front coupling', (5.18,.79,0),(5.35,.79,0),.16,front_mat)
bar('rear coupling', (-5.34,.79,0),(-5.18,.79,0),.16,rear_mat)

# Smooth, asymmetric wind drift: buried to tank top on the near side and only
# the running board on the far side. Independent mesh lets the viewer hide it.
xs = [-6.5 + i*13/52 for i in range(53)]
zs = [-4.2 + i*8.4/24 for i in range(25)]
points=[]
for x in xs:
    for z in zs:
        along = .90 + .13*math.sin(x*1.15) + .055*math.sin(x*2.3+.6)
        if z <= -1.45:
            fade = max(0.0, min(1.0, (4.2 + z) / 2.75))
            peak = 3.05 * (fade * fade * (3.0 - 2.0 * fade))
        elif z <= 1.45:
            peak = 3.05 - (z + 1.45) / 2.9 * 1.60
        else:
            fade = max(0.0, min(1.0, (4.2 - z) / 2.75))
            peak = 1.45 * (fade * fade * (3.0 - 2.0 * fade))
        edge = max(0.0, 1.0 - (abs(x)/6.5)**5) * max(0.0, 1.0 - (abs(z)/4.2)**3)
        y = .015 + edge * max(0.0, (peak + along - .015))
        points.append((x,y,z))
faces=[]
row=len(zs)
for i in range(len(xs)-1):
    for j in range(len(zs)-1):
        a=i*row+j
        faces.append((a,a+row,a+row+1,a+1))
drift = mesh_object('the-2-15-drift',points,faces,salt_mat,'salt','drift')
for poly in drift.data.polygons: poly.use_smooth=True

def join_group(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object; obj.name=name
    if not obj.data.uv_layers or obj.data.uv_layers.active.name != 'UVMap':
        raise RuntimeError(name + ' lost its UVMap during join')
    return obj

engine = join_group(engine_meshes, 'the-2-15-engine')
drift = join_group(drift_meshes, 'the-2-15-drift')
# Separate named roots give the dug-out and buried states one engine and one
# removable drift. A player can toggle the drift node without changing geometry.

blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)
print(json.dumps({'glb':str(glb),'bytes':glb.stat().st_size,
                  'engine_triangles':sum(len(p.vertices)-2 for p in engine.data.polygons),
                  'drift_triangles':sum(len(p.vertices)-2 for p in drift.data.polygons)}))

# Review render comes only from a fresh scene reimporting the exported GLB.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1200; scene.render.resolution_y=820; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('flat bright overcast'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.79,.78,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.85
ground_mat=bpy.data.materials.new('render only pale salt ground'); ground_mat.use_nodes=True
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.56,.55,.51,1)
ground_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
bpy.ops.mesh.primitive_plane_add(size=120,location=(0,0,-.08)); plane=bpy.context.object
plane.name='render only ground'; plane.data.materials.append(ground_mat)
light_data=bpy.data.lights.new('soft overcast','AREA'); light_data.energy=21000; light_data.size=44
light=bpy.data.objects.new('soft overcast',light_data); scene.collection.objects.link(light)
light.location=(18,-32,40); light.rotation_euler=(Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
print('RENDER_READY=' + str(glb))

render_dir.mkdir(parents=True,exist_ok=True)
engine_node=next((o for o in scene.objects if o.name == 'the-2-15-engine'),None)
drift_node=next((o for o in scene.objects if o.name == 'the-2-15-drift'),None)
if engine_node is None or drift_node is None:
    raise RuntimeError('exported GLB is missing named engine or drift')
def camera_at(name, location, target, lens=50, ortho=None):
    bpy.ops.object.camera_add(location=location)
    camera=bpy.context.object; camera.name=name; camera.data.lens=lens
    if ortho is not None:
        camera.data.type='ORTHO'; camera.data.ortho_scale=ortho
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=camera
    return camera
def render(name, camera, width, height):
    scene.render.resolution_x=width; scene.render.resolution_y=height; scene.render.resolution_percentage=100
    scene.camera=camera; scene.render.filepath=str(render_dir/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera,do_unlink=True)
drift_node.hide_render=True
render('engine-side',camera_at('side photo camera',(0,-27,2.0),(0,0,2.0),ortho=12.3),1600,534)
render('engine-front',camera_at('front photo camera',(17,0,2.05),(0,0,2.05),ortho=4.55),720,720)
render('engine-rear',camera_at('rear photo camera',(-17,0,2.05),(0,0,2.05),ortho=4.55),720,720)
drift_node.hide_render=True
render('engine-three-quarter',camera_at('person height camera',(13,-16,1.65),(0,1.85,0),lens=48),1200,820)
drift_node.hide_render=False
render('engine-buried-three-quarter',camera_at('person height buried camera',(13,-16,1.65),(0,1.85,0),lens=48),1200,820)
