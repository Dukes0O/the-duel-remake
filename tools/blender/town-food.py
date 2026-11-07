"""Photo-carved soup kitchen and the rest of the town-food family."""
import argparse
import json
import math
import random
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
evidence = root / '.evidence/2026-11-07/town-art-food/round-12'
out = root / 'public/assets/models/wasteland/town/food.glb'
blend = root / 'art-build/town/food.blend'
sheet = root / 'docs/board/looks/town-art-food/round-12.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Photo, Mesh as PhotoMesh, lathe as photo_lathe, trace, slab
from photo_carve import carve_object, lift_if_dark
from hull_model import tyre

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
textures = root / 'public/assets/models/wasteland/town/textures'
mat = town.make_materials({
    'weathered-plank': textures / 'town-food-plank.jpg',
    'rusted-steel': textures / 'town-food-steel.jpg',
    'patched-canvas': textures / 'town-food-canvas.jpg',
    'galvanised-tin': textures / 'town-food-corrugated.jpg',
    'cracked-concrete': textures / 'town-water-concrete.jpg',
    'sand': textures / 'town-water-earth.jpg',
})
# Town base darkens rusted steel for general utility work. This family uses
# the unfiltered food-specific photograph to keep worn red-brown oxide legible.
steel_photo = bpy.data.images.load(str(textures / 'town-food-steel.jpg'), check_existing=False)
steel_photo.scale(224, 224); steel_photo.file_format='JPEG'; steel_photo.pack()
mat['rusted-steel'].node_tree.nodes.get('Image Texture').image = steel_photo
mat['rusted-steel'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .22
# Compact utility swatches stay small. The source photographs below keep enough
# detail for their mapped pipework, boards, patched canvas and market structure.
for material in mat.values():
    image = material.node_tree.nodes.get('Image Texture').image
    image.scale(224, 224)
    image.pack()

def simple(name, color, roughness=.88, metallic=0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = min(metallic, .29)
    return m

mat['dark-steel'] = mat['rusted-steel'].copy()
mat['dark-steel'].name = 'Town / soot-blackened cauldron steel'
pot_bsdf=mat['dark-steel'].node_tree.nodes.get('Principled BSDF')
pot_bsdf.inputs['Base Color'].default_value=(.24,.235,.22,1)
pot_bsdf.inputs['Roughness'].default_value=.86
pot_bsdf.inputs['Metallic'].default_value=.12
mat['fire'] = simple('Town / firelight', (.72, .255, .045), .72)
fire_bsdf=mat['fire'].node_tree.nodes.get('Principled BSDF')
if fire_bsdf.inputs.get('Emission Color'):
    fire_bsdf.inputs['Emission Color'].default_value=(.58,.105,.018,1)
    fire_bsdf.inputs['Emission Strength'].default_value=.8
mat['fire-yellow'] = simple('Town / flame yellow',(.95,.48,.06),.68)
yellow_bsdf=mat['fire-yellow'].node_tree.nodes.get('Principled BSDF')
if yellow_bsdf.inputs.get('Emission Color'):
    yellow_bsdf.inputs['Emission Color'].default_value=(1.0,.30,.018,1)
    yellow_bsdf.inputs['Emission Strength'].default_value=1.35
mat['leaf'] = simple('Town / dusty greens', (.12, .205, .105), .94)
mat['fruit-red'] = simple('Town / bruised red fruit', (.38, .12, .075), .84)
mat['fruit-yellow'] = simple('Town / dried yellow fruit', (.47, .34, .12), .86)
mat['fruit-orange'] = simple('Town / dusty citrus orange',(.58,.245,.045),.88)
mat['crate'] = mat['weathered-plank']
mat['wire'] = simple('Town / dark wire', (.12, .13, .115), .78, .14)
mat['rubber'] = simple('Town / dusty tire rubber', (.075, .078, .071), .95)
mat['glass'] = simple('Town / dirty greenhouse glass', (.22, .28, .245), .32, .05)
mat['brick'] = mat['salvaged-brick']
mat['letter-paint'] = simple('Town / muted ochre hand lettering', (.42, .29, .15), .92)
mat['canteen-canvas'] = simple('Town / soot-dulled serving canvas', (.09, .055, .028), .96)

family = bpy.data.objects.new('town-food', None)
bpy.context.collection.objects.link(family)
export_objects = {family}
current = None
building_roots = {}

def add_building(name, location):
    global current
    current = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(current)
    current.parent = family
    current.location = town.game_vector(location)
    building_roots[name] = current

def keep(obj, parent=None):
    parent = parent or current
    obj.parent = parent
    obj.matrix_parent_inverse = Matrix.Identity(4)
    export_objects.add(obj)
    return obj

def box(name, center, size, material, bevel=.03):
    return keep(town.cube(name, center, size, material, bevel))

def beam(name, a, b, width, material):
    return keep(town.beam(name, a, b, width, material))

def cylinder(name, center, radius, depth, material, vertices=16, axis='Y'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=town.game_vector(center))
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(material)
    if axis == 'X': obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Z': obj.rotation_euler[0] = math.pi / 2
    for p in obj.data.polygons: p.use_smooth = len(p.vertices) > 4
    return keep(obj)

def sphere(name, center, scale, material, segments=10, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1,
                                        location=town.game_vector(center))
    obj=bpy.context.object; obj.name=name; obj.scale=(scale[0],scale[2],scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for p in obj.data.polygons: p.use_smooth=True
    return keep(obj)

def mesh_object(name, vertices, faces, material, uv_mode='planar'):
    mesh=bpy.data.meshes.new(name+' formed surface')
    mesh.from_pydata([town.game_vector(v) for v in vertices], [], faces); mesh.materials.append(material); mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            x,y,z=vertices[mesh.loops[li].vertex_index]
            if uv_mode == 'wall': uv.data[li].uv=(x/.20, y/2)
            elif uv_mode == 'canvas': uv.data[li].uv=(x/1.5, y/1.5)
            elif uv_mode == 'round': uv.data[li].uv=(math.atan2(z, x)/math.tau, y)
            else: uv.data[li].uv=(x/2, z/2) if uv_mode=='planar' else (x, z)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return keep(obj)

def tin_roof(name, x, y, z, width, depth, pitch=0):
    # Thin formed sheet panels, their 10 cm pressed ridges catch overcast light.
    count=max(8,round(width/.10)); dx=width/count; verts=[]; faces=[]
    for row, zz in enumerate((-depth/2, depth/2)):
        for i in range(count+1):
            xx=-width/2+i*dx
            ridge=.024 if i%2==0 else -.024
            verts.append((x+xx, y+math.tan(pitch)*zz+ridge, z+zz))
    for i in range(count): faces.append((i,i+1,count+2+i,count+1+i))
    obj=mesh_object(name,verts,faces,mat['galvanised-tin'])
    # Folded rolled edges and a second support rib make the sheet read as metal.
    beam(name+'-front-edge',(x-width/2,y,z-depth/2),(x+width/2,y,z-depth/2),.045,mat['rusted-steel'])
    return obj

def tin_wall(name, x, y, z, width, height):
    count=max(8,round(width/.10));dx=width/count;verts=[];faces=[]
    for yy in (y-height/2,y+height/2):
        for i in range(count+1):
            xx=x-width/2+i*dx;wave=.027 if i%2==0 else -.027
            verts.append((xx,yy,z+wave))
    front=len(verts)
    verts.extend((vx,vy,vz+.018) for vx,vy,vz in tuple(verts))
    for i in range(count):
        face=(i,i+1,count+2+i,count+1+i)
        faces.extend((face,tuple(reversed(tuple(k+front for k in face)))))
    return mesh_object(name,verts,faces,mat['galvanised-tin'],'wall')

def sign(name, center, text, width=1.3):
    x,y,z=center
    if name == 'shopfront-a':
        # This shop's large hand-painted board is a thin, independent slab.
        slab_verts=[(x-width/2,y-.24,z-.045),(x-width/2,y+.24,z-.045),
                    (x+width/2,y+.24,z-.045),(x+width/2,y-.24,z-.045),
                    (x-width/2,y-.24,z+.045),(x-width/2,y+.24,z+.045),
                    (x+width/2,y+.24,z+.045),(x+width/2,y-.24,z+.045)]
        slab_faces=[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
        board=mesh_object(name+':hand-painted-sign-slab',slab_verts,slab_faces,mat['weathered-plank'],'wall')
    else:
        board=box(name+':sign-board',(x,y,z),(width,.42,.085),mat['weathered-plank'],.025)
    font=bpy.data.curves.new(name+' hand lettering','FONT');font.body=text
    font.size=.31 if name == 'shopfront-a' else .23;font.extrude=0;font.resolution_u=4
    obj=bpy.data.objects.new(name+':sign-lettering',font);bpy.context.collection.objects.link(obj)
    obj.location=town.game_vector((x-width*.44,y-.105,z-.052))
    if name == 'shopfront-a':
        # Turn the lettering toward the road and undo the X reversal from the
        # 180-degree face turn so FOOD reads normally from the front.
        obj.rotation_euler=(0,math.pi,0);obj.scale.x=-1
    else:
        obj.rotation_euler=(-math.pi/2,0,0)
    font.materials.append(mat['letter-paint']); bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH');keep(bpy.context.object)
    return board

def ground_clutter(name,x,z,material=mat['sand']):
    # Low irregular packed dirt that stays in the marked building footprint.
    box(name+':dirt-foot',(x,.06,z),(2.5,.12,2.4),material,.12)

# TOWN-ART-FOOD round 6: the rear wall and every object in the bay are their
# own joined, measured pieces. The front reference is 4.1 m wide on a 712 px grid.
add_building('soup-kitchen',(30,0,-14))
W, H, S, FLOOR = 712, 532, 4.1/712, 510
front = Photo(textures / 'town-food-soup-front.jpg')
left = Photo(textures / 'town-food-soup-left.jpg')
overhead = Photo(textures / 'town-food-soup-overhead.jpg')
wall_photo = Photo(textures / 'soup-kitchen-wall.jpg')
front_mat, left_mat = front.material(.88), left.material(.9)
roof_mat, wall_mat = overhead.material(.88), wall_photo.material(.9)

def uv_box(mesh, name, bounds, photo, rect, material):
    x0,x1,y0,y1,z0,z1 = bounds
    px0,py0,px1,py1 = rect
    uvs = [photo.uv(px0,py1),photo.uv(px1,py1),photo.uv(px1,py0),photo.uv(px0,py0)]
    mesh.face(((x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0)),uvs,material,(0,0,-1))
    mesh.face(((x1,y0,z1),(x0,y0,z1),(x0,y1,z1),(x1,y1,z1)),uvs,material,(0,0,1))
    mesh.face(((x0,y0,z1),(x0,y0,z0),(x0,y1,z0),(x0,y1,z1)),uvs,material,(-1,0,0))
    mesh.face(((x1,y0,z0),(x1,y0,z1),(x1,y1,z1),(x1,y1,z0)),uvs,material,(1,0,0))
    edge=[photo.uv(px0,py0),photo.uv(px1,py0),photo.uv(px1,py0+4),photo.uv(px0,py0+4)]
    mesh.face(((x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)),edge,material,(0,1,0))
    mesh.face(((x0,y0,z1),(x1,y0,z1),(x1,y0,z0),(x0,y0,z0)),edge,material,(0,-1,0))
    return mesh.finish(name,{material: photo.material()})

# One full-frame, thick wall stands on the floor. Its face has no awning,
# shelf, pans or pot painted into it; the wall meets the roof and rear posts.
wall_mesh=PhotoMesh()
uv_box(wall_mesh,'soup-kitchen:full-rear-wall',(-2.05,2.05,0,2.72,1.48,1.62),
       wall_photo,(44,75,668,500),'wall')
keep(next(obj for obj in bpy.context.scene.objects if obj.name=='soup-kitchen:full-rear-wall'))

# Four posts stand on earth and end at the roof eaves. The rear pair meet the
# wall, and the front pair hold the canvas and roof's front edge.
for x in (-1.91,1.91):
    for z,label in ((-1.53,'front'),(1.52,'rear')):
        beam(f'soup-kitchen:{label}-post-{x}',(x,.04,z),(x,2.67,z),.13,mat['weathered-plank'])
    beam(f'soup-kitchen:side-rail-{x}',(x,2.34,-1.49),(x,2.68,1.50),.075,mat['rusted-steel'])

# A pitched two-panel roof rests on all four posts. Its upper face wears only
# the measured, clean tin from the overhead reference, never the awning.
roof=PhotoMesh()
for side,x0,x1,px0,px1 in ((-1,-2.18,0,94,360),(1,0,2.18,392,622)):
    y0,y1=(2.70,3.02) if side<0 else (3.02,2.70)
    z0,z1=-1.78,1.78
    roof.face(((x0,y0,z0),(x1,y1,z0),(x1,y1,z1),(x0,y0,z1)),
              (overhead.uv(px0,52),overhead.uv(px1,52),overhead.uv(px1,408),overhead.uv(px0,408)),
              'roof',(0,1,0))
    roof.face(((x0,y0-.07,z1),(x1,y1-.07,z1),(x1,y1-.07,z0),(x0,y0-.07,z0)),
              (overhead.uv(px0,408),overhead.uv(px1,408),overhead.uv(px1,52),overhead.uv(px0,52)),
              'roof',(0,-1,0))
    edge_x=x0 if side<0 else x1
    beam(f'soup-kitchen:roof-edge-{side}',(edge_x,2.70,-1.78),(edge_x,2.70,1.78),.07,mat['rusted-steel'])
    beam(f'soup-kitchen:roof-front-fascia-{side}',(x0,y0,z0),(x1,y1,z0),.05,mat['rusted-steel'])
    beam(f'soup-kitchen:roof-rear-fascia-{side}',(x0,y0,z1),(x1,y1,z1),.05,mat['rusted-steel'])
roof_obj=roof.finish('soup-kitchen:pitched-tin-roof',{'roof':roof_mat});keep(roof_obj)
beam('soup-kitchen:ridge-cap',(0,3.03,-1.82),(0,3.03,1.82),.08,mat['rusted-steel'])

# Trace the sagging front canvas from the full photo, then give it real depth.
front_sky=front.sky([(5,5),(W-6,5),(5,H-6),(W-6,H-6)],tolerance=24,grey=30)
awning_loops=trace(~front_sky,(32,58,680,132),tolerance=1.2,min_area=24)
def awning_world(px,py,d):
    return ((W/2-px)*S,(FLOOR-py)*2.72/FLOOR,-1.76-d)
awning=PhotoMesh();slab(awning,'front',front,awning_loops,awning_world,0,.055,wall_scale=S)
keep(awning.finish('soup-kitchen:sagging-traced-awning',{'front':front_mat}))
for x in (-1.72,1.72):
    beam(f'soup-kitchen:awning-tension-{x}',(x,2.66,-1.70),(x,2.18,-1.71),.045,mat['rusted-steel'])

# The side curtain follows its photographed outline and hangs from the same
# road-side post, down to within a few centimetres of the earth.
side_sky=left.sky([(5,5),(W-6,5),(5,H-6),(W-6,H-6)],tolerance=24,grey=30)
curtain_loops=trace(~side_sky,(135,92,435,500),tolerance=1.6,min_area=40)
def curtain_world(px,py,d):
    return (1.88+d,-.02+(492-py)*2.55/392,-1.48+(px-145)*1.78/290)
curtain=PhotoMesh();slab(curtain,'left',left,curtain_loops,curtain_world,0,.06,wall_scale=S)
keep(curtain.finish('soup-kitchen:side-canvas-curtain',{'left':left_mat}))

# A deep timber shelf touches the rear wall. Its top, front lip and ends all
# carry measured areas of the full kitchen photograph; the cans and pans below
# are separate photo-wearing lathes, not details painted onto the wall.
shelf=PhotoMesh()
uv_box(shelf,'soup-kitchen:deep-photo-shelf',(-1.48,1.48,1.28,1.36,1.08,1.48),
       front,(120,250,600,274),'shelf')
keep(next(obj for obj in bpy.context.scene.objects if obj.name=='soup-kitchen:deep-photo-shelf'))

def pictured_lathe(name,cx,cy,base_y,profile,sides=20):
    m=PhotoMesh()
    def picture_uv(index,distance,radius,angle):
        return front.uv(cx+math.cos(angle)*radius/S,cy-(distance-base_y)/S)
    photo_lathe(m,'front',((W/2-cx)*S,0,1.28),(0,1,0),(1,0,0),(0,0,1),profile,picture_uv,
                sides=sides,cap_start=('front',lambda a,f:front.uv(cx,cy)),cap_end=None)
    return keep(m.finish(name,{'front':front_mat}))

for i,(cx,py,rad) in enumerate(((228,250,.105),(273,250,.105),(320,250,.105))):
    by=1.36
    pictured_lathe(f'soup-kitchen:photo-can-{i+1}',cx,py,by,
                   [(by,.65*rad),(by+.025,.9*rad),(by+.22,.9*rad),(by+.245,.68*rad)],16)
for i,(cx,py) in enumerate(((398,250),(505,248))):
    by=1.36
    pictured_lathe(f'soup-kitchen:photo-pan-{i+1}',cx,py,by,
                   [(by,.10),(by+.025,.20),(by+.075,.22),(by+.09,.16)],20)

# The pot is open and turned from the measured outline in the front photo.
# Dark soup sits below its separate, real steel rim.
pot_mesh=PhotoMesh();pot_bottom=.43
def pot_uv(index,distance,radius,angle):
    return front.uv(355+math.cos(angle)*radius/S,438-(distance-pot_bottom)/S)
pot_stations=[(.43,.22),(.47,.31),(.57,.40),(.88,.43),(1.00,.41),(1.04,.44)]
photo_lathe(pot_mesh,'front',(0,0,0),(0,1,0),(1,0,0),(0,0,1),pot_stations,pot_uv,
            sides=32,cap_start=('front',lambda a,f:front.uv(355,438)),cap_end=None)
keep(pot_mesh.finish('soup-kitchen:open-photo-lathe-pot',{'front':front_mat}))
cylinder('soup-kitchen:dark-soup',(0,1.005,0),.355,.025,mat['dark-steel'],32)
bpy.ops.mesh.primitive_torus_add(major_radius=.425,minor_radius=.035,major_segments=32,minor_segments=8,
                                 location=town.game_vector((0,1.045,0)))
rim=bpy.context.object;rim.name='soup-kitchen:rolled-pot-rim';rim.data.materials.append(mat['dark-steel']);keep(rim)

# Four charred logs make a grounded ring. Ember stones and four separate bent
# flame blades fill the centre from the earth up to the pot's base.
def fire_log(name,a,b):
    va,vb=town.game_vector(a),town.game_vector(b);direction=vb-va
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.075,depth=direction.length,
                                        location=(va+vb)*.5)
    obj=bpy.context.object;obj.name=name;obj.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    obj.data.materials.append(mat['dark-steel'])
    bevel=obj.modifiers.new('charred rounded log edge','BEVEL');bevel.width=.018;bevel.segments=1
    return keep(obj)
for i,angle in enumerate((0,math.pi/2,math.pi,3*math.pi/2)):
    x,z=math.cos(angle)*.39,math.sin(angle)*.39
    fire_log(f'soup-kitchen:fire-log-{i+1}',(x-.28,.085,z-.13),(x+.28,.115,z+.13))
for i,(x,z) in enumerate(((-.20,-.16),(.17,-.13),(-.12,.20),(.20,.18),(0,0))):
    sphere(f'soup-kitchen:ember-{i+1}',(x,.14,z),(.05,.025,.05),mat['fire'],8,5)
def fire_blade(name,x,z,width,height,material,turn):
    points=[(-width/2,0),(width/2,0),(width*.30,height*.45),(width*.08,height),
            (width*.02,height*.62),(-width*.20,height*.38)]
    coords=[]
    for lateral,y in points:
        if turn=='x': coords.append((x+lateral,.16+y,z))
        else: coords.append((x,.16+y,z+lateral))
    return mesh_object(name,coords,[(0,1,2),(0,2,3),(0,3,4),(0,4,5)],material,'planar')
for i,(x,z,w,h,ma,turn) in enumerate(((-.13,-.08,.20,.36,mat['fire'],'x'),(.12,.02,.17,.43,mat['fire-yellow'],'z'),(.02,.12,.19,.32,mat['fire'],'x'),(.19,-.12,.13,.28,mat['fire-yellow'],'z'))):
    fire_blade(f'soup-kitchen:flame-blade-{i+1}',x,z,w,h,ma,turn)

# Two benches have four legs each, with their feet at the same earth plane.
for i,x in enumerate((-1.62,1.62)):
    z=-.18 if x<0 else .32
    box(f'soup-kitchen:bench-seat-{i+1}',(x,.49,z),(.62,.11,1.05),mat['weathered-plank'],.025)
    for dx in (-.23,.23):
        for dz in (-.39,.39):
            beam(f'soup-kitchen:bench-leg-{i+1}-{dx}-{dz}',(x+dx,.03,z+dz),(x+dx,.45,z+dz),.065,mat['rusted-steel'])

# The addressable lamp is one more pointed flame, kept inside the log ring.
lamp=fire_blade('soup-kitchen:lamp',0,-.1,.11,.24,mat['fire-yellow'],'x')
lamp['emissive']=True
lamp_bsdf=mat['fire-yellow'].node_tree.nodes.get('Principled BSDF')
if lamp_bsdf.inputs.get('Emission Color'):
    lamp_bsdf.inputs['Emission Color'].default_value=(1.0,.22,.025,1)
    lamp_bsdf.inputs['Emission Strength'].default_value=1.5
# Supporting food buildings use the same welded framing, separate materials and real-thickness parts.
add_building('greenhouse',(-16,0,-14))
ground_clutter('greenhouse',0,0)
for x in (-3.0,-1.0,1.0,3.0):
    beam(f'greenhouse:upright-{x}',(x,.12,-2.2),(x,2.35,-2.2),.065,mat['rusted-steel'])
    beam(f'greenhouse:back-post-{x}',(x,.12,2.2),(x,2.35,2.2),.065,mat['rusted-steel'])
    beam(f'greenhouse:roof-rafter-{x}',(x,2.35,-2.2),(x,2.70,0),.06,mat['weathered-plank'])
    beam(f'greenhouse:roof-rafter-back-{x}',(x,2.35,2.2),(x,2.70,0),.06,mat['weathered-plank'])
for y in (.15,1.15,2.3):
    for z in (-2.2,2.2): beam(f'greenhouse:long-rail-{y}-{z}',(-3.1,y,z),(3.1,y,z),.045,mat['rusted-steel'])
for i in range(6):
    z=-1.75+i*.70
    box(f'greenhouse:growing-bed-{i+1}',(0,.28,z),(5.75,.38,.48),mat['weathered-plank'],.09)
    for j in range(9):
        x=-2.55+j*.62
        sphere(f'greenhouse:leaf-{i+1}-{j+1}',(x,.62,z),(.20,.24,.20),mat['leaf'],8,5)
for z in (-2.15,0,2.15):
    panel=box(f'greenhouse:glazed-roof-panel-{z}',(0,2.43,z),(6.3,.045,.82),mat['glass'],.008)
    panel.rotation_euler[0]=.17 if z>0 else -.17
# One salvaged car windscreen, retained with its curved pressed-glass profile,
# replaces a missing roof sheet. The opening beside it lets warm air escape.
windshield_verts=[];windshield_faces=[]
for row,z in enumerate((-.64,.64)):
    for i in range(13):
        x=-1.0+2.0*i/12
        y=2.40+.11*(1-(x/.98)**2)+(0.012 if row else 0)
        windshield_verts.append((x,y,z))
for i in range(12): windshield_faces.append((i,i+1,14+i,13+i))
mesh_object('greenhouse:salvaged-windscreen',windshield_verts,windshield_faces,mat['glass'],'canvas')
for z in (-.66,.66): beam(f'greenhouse:windscreen-rim-{z}',(-1,2.40,z),(1,2.40,z),.045,mat['rusted-steel'])
for z in (-1.9,0,1.9): box(f'greenhouse:roof-patch-{z}',(2.65,2.49,z),(.72,.06,.8),mat['patched-canvas'],.02)
box('greenhouse:water-butt',(2.45,.57,1.55),(.52,1.04,.52),mat['rusted-steel'],.1)

add_building('goat-pen',(8,0,-14))
ground_clutter('goat-pen',0,0)
for x in (-1.9,0,1.9):
    for z in (-1.9,1.9): beam(f'goat-pen:post-{x}-{z}',(x,.1,z),(x,1.35,z),.13,mat['weathered-plank'])
for z in (-1.9,1.9):
    for y in (.40,.85,1.25): beam(f'goat-pen:rail-{z}-{y}',(-1.9,y,z),(1.9,y,z),.095,mat['weathered-plank'])
for x in (-1.9,1.9):
    for y in (.4,.85): beam(f'goat-pen:side-rail-{x}-{y}',(x,y,-1.9),(x,y,1.9),.09,mat['weathered-plank'])
# Pitched low shelter with salvaged roof plates, hay bedding and a trough.
beam('goat-pen:shelter-ridge',(-1.0,2.05,.72),(1.0,2.05,.72),.10,mat['rusted-steel'])
for side in (-1,1):
    p=box(f'goat-pen:shelter-roof-{side}',(0,1.86,.72+side*.45),(2.35,.08,1.08),mat['galvanised-tin'],.02)
    p.rotation_euler[0]=side*.30
box('goat-pen:shelter-back',(0,1.0,1.18),(2.1,1.8,.08),mat['weathered-plank'],.03)
box('goat-pen:hay-bale',(0,.22,.85),(1.3,.35,.75),mat['patched-canvas'],.10)
box('goat-pen:feed-trough',(0,.38,-1.10),(2.2,.52,.55),mat['rusted-steel'],.09)
for x in (-1.5,1.5): beam(f'goat-pen:gate-hinge-{x}',(x,.18,-1.91),(x,1.2,-1.91),.11,mat['iron-dark'])
beam('goat-pen:gate-upper',(-1.45,1.05,-1.91),(1.35,1.05,-1.91),.10,mat['weathered-plank'])
beam('goat-pen:gate-brace',(-1.35,.30,-1.91),(1.25,1.0,-1.91),.08,mat['rusted-steel'])

add_building('chicken-run',(20,0,-14))
ground_clutter('chicken-run',0,0)
for x in (-1.25,1.25):
    for z in (-1.25,1.25): beam(f'chicken-run:frame-post-{x}-{z}',(x,.12,z),(x,1.65,z),.085,mat['rusted-steel'])
for y in (.18,.58,1.0,1.42,1.62):
    for z in (-1.25,1.25): beam(f'chicken-run:wire-rail-{y}-{z}',(-1.25,y,z),(1.25,y,z),.028,mat['wire'])
    for x in (-1.25,1.25): beam(f'chicken-run:wire-rail-side-{y}-{x}',(x,y,-1.25),(x,y,1.25),.028,mat['wire'])
# A hatchback tailgate shell becomes the coop, with curved roof and a low egg box.
box('chicken-run:boot-shell',(0,.48,.42),(1.25,.72,.75),mat['rusted-steel'],.16)
box('chicken-run:boot-roof',(0,.96,.42),(1.1,.10,.68),mat['galvanised-tin'],.06)
box('chicken-run:coop-dark-opening',(0,.42,.035),(.68,.40,.035),mat['iron-dark'],.04)
for x in (-.4,.4): beam(f'chicken-run:boot-hinge-{x}',(x,.78,.06),(x,1.2,.06),.045,mat['rusted-steel'])
box('chicken-run:nest-box',(0,.32,-.90),(.98,.42,.48),mat['weathered-plank'],.055)
for x in (-.25,.25): sphere(f'chicken-run:egg-{x}',(x,.56,-.88),(.10,.07,.08),mat['faded-hand-paint'],8,5)
box('chicken-run:feed-tray',(0,.16,1.05),(.85,.19,.30),mat['galvanised-tin'],.045)

stall_front_photo=Photo(textures/'stall-front.jpg')
stall_side_photo=Photo(textures/'stall-side.jpg')
stall_rear_photo=Photo(textures/'stall-rear.jpg')
stall_front_b_photo=Photo(textures/'stall-front-b.jpg')
for photo in (stall_front_photo,stall_side_photo,stall_rear_photo,stall_front_b_photo):
    lift_if_dark(photo)

def photo_mask(photo, polygons):
    """Rasterize measured photo outlines before the shared trace/slab step."""
    mask=np.zeros((photo.h,photo.w),dtype=bool)
    for polygon in polygons:
        x0=max(0,int(min(p[0] for p in polygon)));x1=min(photo.w,int(max(p[0] for p in polygon))+1)
        y0=max(0,int(min(p[1] for p in polygon)));y1=min(photo.h,int(max(p[1] for p in polygon))+1)
        yy,xx=np.mgrid[y0:y1,x0:x1]
        hit=np.zeros(xx.shape,dtype=bool)
        for (ax,ay),(bx,by) in zip(polygon,polygon[1:]+polygon[:1]):
            crossing=((ay>yy)!=(by>yy)) & (xx < (bx-ax)*(yy-ay)/(by-ay+1e-12)+ax)
            hit ^= crossing
        mask[y0:y1,x0:x1]|=hit
    return mask

stall_front_pieces=[
    # Four open uprights, the narrow crown rail, counter apron and table braces.
    ('front-left-outer-post',[(42,70),(76,27),(105,40),(121,917),(80,922),(49,904)]),
    ('front-left-inner-post',[(96,106),(123,118),(125,917),(102,917)]),
    ('front-right-inner-post',[(896,110),(922,101),(922,918),(899,917)]),
    ('front-right-outer-post',[(927,36),(961,19),(984,908),(944,923)]),
    ('front-crown-rail',[(93,63),(930,57),(931,84),(95,95)]),
    ('counter-apron',[(69,523),(956,522),(957,579),(70,580)]),
    ('counter-left-brace',[(72,580),(135,580),(143,644),(86,644)]),
    ('counter-right-brace',[(881,580),(948,578),(937,645),(871,644)]),
]
stall_side_pieces=[
    # The side photo supplies depth rails, rear uprights and diagonal braces.
    ('side-front-post',[(204,51),(232,38),(258,970),(222,977)]),
    ('side-inner-front-post',[(239,111),(263,115),(267,970),(240,970)]),
    ('side-rear-post',[(633,225),(659,211),(683,970),(646,974)]),
    ('side-inner-rear-post',[(657,315),(681,315),(679,970),(655,970)]),
    ('side-canopy-rail',[(233,70),(252,67),(670,222),(658,247)]),
    ('side-counter-rail',[(243,597),(674,592),(677,619),(243,626)]),
    ('side-left-brace',[(248,619),(279,624),(326,685),(310,699)]),
    ('side-right-brace',[(674,619),(649,625),(594,688),(577,675)]),
]
stall_counter_mask=photo_mask(stall_side_photo,[
    [(257,595),(679,593),(685,616),(665,637),(282,641),(259,621)],
])
stall_awning_mask=photo_mask(stall_front_photo,[
    # The stitched tarp's real scalloped sag and torn lower edge are kept open below.
    [(44,74),(51,49),(71,23),(102,29),(152,42),(217,36),(285,53),(355,67),
     (441,78),(511,73),(590,65),(674,61),(748,43),(823,36),(897,34),(944,47),
     (974,82),(987,125),(966,154),(945,170),(917,180),(894,189),(864,190),(842,199),
     (815,197),(789,205),(760,204),(731,214),(700,213),(671,222),(641,217),(612,225),
     (580,220),(550,226),(520,219),(488,226),(457,219),(425,223),(394,212),(364,215),
     (332,204),(302,202),(274,190),(245,185),(216,174),(188,165),(161,154),(137,148),
     (116,136),(94,130),(75,116),(58,101)],
])
def market_stall(building, offset, kind):
    add_building(building,offset)
    def front_world(px,py,d):
        return ((px-512)*.00305,(920-py)*.00302,-1.10+d)
    for part_name,polygon in stall_front_pieces:
        front_frame=PhotoMesh()
        mask=photo_mask(stall_front_photo,[polygon])
        front_loops=trace(mask,(38,18,990,930),tolerance=2.0,min_area=20)
        slab(front_frame,'front',stall_front_photo,front_loops,front_world,0,.075,wall_scale=.00305)
        keep(front_frame.finish(f'{building}:photo-traced-{part_name}',{'front':stall_front_photo.material()}))

    def side_world(px,py,d):
        return (d,(975-py)*.00292,-1.10+(px-205)*.00455)
    for frame_x,side_label in ((-1.12,'left'),(1.12,'right')):
        def side_frame_world(px,py,d,frame_x=frame_x):
            return (frame_x+d,(975-py)*.00292,-1.10+(px-205)*.00455)
        for part_name,polygon in stall_side_pieces:
            side_frame=PhotoMesh()
            mask=photo_mask(stall_side_photo,[polygon])
            side_loops=trace(mask,(195,32,690,986),tolerance=1.8,min_area=18)
            slab(side_frame,'side',stall_side_photo,side_loops,side_frame_world,-.07,.07,wall_scale=.00455)
            keep(side_frame.finish(f'{building}:photo-traced-{side_label}-{part_name}',{'side':stall_side_photo.material()}))

    # A traced side-profile slab gives the counter its photographed depth and
    # a thick, closed top. Its front edge meets the apron and both support posts.
    counter=PhotoMesh()
    counter_loops=trace(stall_counter_mask,(250,588,691,647),tolerance=.8,min_area=20)
    slab(counter,'counter',stall_side_photo,counter_loops,side_world,-1.08,1.08,wall_scale=.00455)
    counter_obj=counter.finish(f'{building}:deep-photo-traced-counter',{'counter':stall_side_photo.material()})
    # Keep the plank grain and dark knots from the measured side photograph.
    keep(counter_obj)

    # The photographic front hem stays a thin, traced slab. A small mesh follows
    # its measured sag across the width and the side-photo pitch over the depth.
    awning_front=PhotoMesh()
    awning_loops=trace(stall_awning_mask,(38,18,992,232),tolerance=1.8,min_area=30)
    slab(awning_front,'canvas',stall_front_photo,awning_loops,front_world,0,.06,wall_scale=100000)
    keep(awning_front.finish(f'{building}:traced-front-awning-hem',{'canvas':stall_front_photo.material()}))
    awning=PhotoMesh()
    columns=[]
    for px in range(55,977,58):
        rows=np.flatnonzero(stall_awning_mask[:,px])
        if len(rows)<2: continue
        top,bottom=int(rows.min()),int(rows.max())
        profile=top+.64*(bottom-top)
        x=(px-512)*.00305
        profile_y=(920-profile)*.00302
        column=[]
        for depth_step in range(3):
            t=depth_step/2
            y=profile_y-.47*t
            z=-1.04+1.95*t
            # Spread the full measured canvas grain over the draped depth;
            # a nearly fixed photo row turns into long stripes underneath.
            py=min(stall_front_photo.h-1,int(72+105*t))
            uv=stall_front_photo.uv(px,py)
            column.append((awning.vertex((x,y,z)),uv))
        columns.append(column)
    for left,right in zip(columns,columns[1:]):
        for depth_step in range(2):
            a,ua=left[depth_step];b,ub=right[depth_step]
            c,uc=right[depth_step+1];d,ud=left[depth_step+1]
            top_points=[a,b,c,d];top_uvs=[ua,ub,uc,ud]
            awning.indexed(top_points,top_uvs,'canvas',(0,1,0))
            underside=[awning.vertex((awning.verts[index][0],awning.verts[index][1]-.018,awning.verts[index][2]))
                       for index in (a,b,c,d)]
            awning.indexed(list(reversed(underside)),list(reversed(top_uvs)),'canvas',(0,-1,0))
    keep(awning.finish(f'{building}:traced-sagging-patched-canvas-awning',{
        'canvas':stall_front_photo.material()}))

    if kind=='fruit':
        # Two deep plank crates and small photo-colored produce sit on the counter.
        colors=(mat['fruit-red'],mat['fruit-yellow'],mat['fruit-orange'])
        for crate_index,cx in enumerate((-.43,.43),1):
            cz=-.20
            box(f'{building}:fruit-crate-{crate_index}-base',(cx,1.17,cz),(.70,.12,.52),mat['weathered-plank'],.025)
            box(f'{building}:fruit-crate-{crate_index}-bed',(cx,1.31,cz),(.60,.16,.38),mat['crate'],.018)
            for side in (-1,1):
                box(f'{building}:fruit-crate-{crate_index}-long-board-{side}',
                    (cx,1.34,cz+side*.235),(.70,.20,.045),mat['weathered-plank'],.012)
                box(f'{building}:fruit-crate-{crate_index}-end-board-{side}',
                    (cx+side*.33,1.34,cz),(.045,.20,.52),mat['weathered-plank'],.012)
            for fruit_index in range(3):
                x=cx-.18+fruit_index*.18
                z=cz
                color=colors[(fruit_index+crate_index)%len(colors)]
                sphere(f'{building}:produce-{crate_index}-{fruit_index+1}',
                       (x,1.46,z),(.105,.12,.105),color,8,4)
    elif kind=='tools':
        # A wood rail hangs five distinct, rusted hand tools over the counter.
        beam(f'{building}:tool-rack',(-.78,1.84,-.48),(.78,1.84,-.48),.065,mat['weathered-plank'])
        for support_index,x in enumerate((-.78,.78),1):
            beam(f'{building}:tool-rack-support-{support_index}',(x,1.83,-.48),(x,2.38,-.48),.055,mat['rusted-steel'])
        for index,x in enumerate((-.62,-.31,0,.31,.62),1):
            beam(f'{building}:tool-hanger-{index}',(x,1.83,-.48),(x,1.75,-.48),.025,mat['rusted-steel'])
            beam(f'{building}:hanging-tool-{index}-handle',(x,1.28,-.48),(x,1.77,-.48),.045,mat['weathered-plank'])
            if index==2:
                beam(f'{building}:hanging-tool-{index}-hammer-head',(x-.12,1.68,-.48),(x+.12,1.68,-.48),.085,mat['rusted-steel'])
            elif index==3:
                beam(f'{building}:hanging-tool-{index}-pliers-left',(x-.07,1.70,-.48),(x,1.78,-.48),.035,mat['rusted-steel'])
                beam(f'{building}:hanging-tool-{index}-pliers-right',(x+.07,1.70,-.48),(x,1.78,-.48),.035,mat['rusted-steel'])
            else:
                beam(f'{building}:hanging-tool-{index}-spanner-jaw-left',(x-.08,1.68,-.48),(x-.03,1.78,-.48),.035,mat['rusted-steel'])
                beam(f'{building}:hanging-tool-{index}-spanner-jaw-right',(x+.08,1.68,-.48),(x+.03,1.78,-.48),.035,mat['rusted-steel'])
    else:
        for index,(x,y) in enumerate(((-.42,1.40),(.42,1.40),(0,1.68)),1):
            bpy.ops.mesh.primitive_torus_add(major_radius=.28,minor_radius=.07,
                major_segments=12,minor_segments=4,location=town.game_vector((x,y,-.20)))
            obj=bpy.context.object;obj.name=f'{building}:stacked-tyre-{index}'
            obj.rotation_euler[0]=math.pi/2
            obj.data.materials.append(mat['rubber']);keep(obj)

market_stall('stall-a',(20,0,2),'fruit')
market_stall('stall-b',(28,0,2),'tools')
market_stall('stall-c',(36,0,2),'tyres')

def shopfront(building, offset, label):
    add_building(building,offset)
    for x in (-1.12,1.12):
        beam(f'{building}:corner-post-{x}',(x,.12,-.68),(x,2.5,-.68),.10,mat['rusted-steel'])
        beam(f'{building}:rear-post-{x}',(x,.12,.72),(x,2.05,.72),.075,mat['weathered-plank'])
    for y in (.18,1.26,2.12):
        beam(f'{building}:back-wall-rail-{y}',(-1.1,y,.72),(1.1,y,.72),.07,mat['rusted-steel'])
    for i in range(4):
        box(f'{building}:patched-back-wall-{i+1}',(-.84+i*.56,1.26,.73),(.54,1.62,.045),mat['galvanised-tin'] if i%2 else mat['rusted-steel'],.015)
    tin_roof(f'{building}:roof',0,2.48,.02,2.75,2.0,.10)
    for x in (-.62,.62): beam(f'{building}:awning-arm-{x}',(x,2.2,-.60),(x,2.48,-.02),.05,mat['rusted-steel'])
    box(f'{building}:front-awning',(0,2.42,-.36),(2.45,.065,.80),mat['patched-canvas'],.025)
    box(f'{building}:serving-hatch',(0,1.5,.69),(1.18,.72,.08),mat['iron-dark'],.025)
    for x in (-.35,.35): beam(f'{building}:hatch-shutter-chain-{x}',(x,1.94,.70),(x,2.18,.16),.025,mat['rusted-steel'])
    sign(building,(0,2.12,-.72),label,1.85)
    box(f'{building}:counter',(0,.98,-.90),(2.0,.18,.55),mat['weathered-plank'],.035)
    if label=='FOOD':
        for i,x in enumerate((-.58,.08,.62),1):
            box(f'{building}:food-crate-{i}',(x,1.23,-.91),(.48,.32,.42),mat['weathered-plank'],.045)
            for j in range(3):
                sphere(f'{building}:root-veg-{i}-{j}',(x-.13+j*.13,1.44,-.90),(.09,.13,.09),mat['fruit-yellow'] if j%2 else mat['leaf'],8,5)
    elif label=='TOOLS':
        for i,x in enumerate((-.62,-.2,.25,.62),1):
            beam(f'{building}:hanging-tool-shaft-{i}',(x,1.55,.60),(x+.08,1.96,.60),.045,mat['weathered-plank'])
            beam(f'{building}:hanging-tool-head-{i}',(x-.10,1.90,.60),(x+.18,1.90,.60),.06,mat['rusted-steel'])
    else:
        for i,x in enumerate((-.55,.05,.61),1):
            cylinder(f'{building}:repair-pipe-{i}',(x,1.33,-.91),.11,.58,mat['rusted-steel'],12)
            bpy.ops.mesh.primitive_torus_add(major_segments=14,minor_segments=5,major_radius=.22,minor_radius=.06,location=town.game_vector((x,1.36,.62)))
            obj=bpy.context.object;obj.name=f'{building}:repair-tyre-{i}';obj.rotation_euler[0]=math.pi/2;obj.data.materials.append(mat['rubber']);keep(obj)

shopfront('shopfront-a',(20,0,12),'FOOD')
shopfront('shopfront-b',(28,0,12),'TOOLS')
shopfront('shopfront-c',(36,0,12),'FIX-IT')

# Bus canteen: keep the accepted side photo and measure the broad, boxy front
# from its grid. The road-side hatch is cut into the carved shell; its counter
# and sloping canvas are physical pieces attached at the wall.
add_building('canteen',(8,0,12))
CAN_LEN, CAN_H = 6.4, 3.0
CAN_START, CAN_END, CAN_GROUND, CAN_TOP = 84, 1116, 516, 83
CAN_SCALE = CAN_LEN / (CAN_END-CAN_START)
CAN_WHEEL_CENTRES = (300, 900)
CAN_WHEEL_PY, CAN_WHEEL_RPX = 430, 82
CAN_WHEEL_R = CAN_WHEEL_RPX * CAN_SCALE
CAN_AXLES = [(-CAN_LEN/2 + (px-CAN_START)*CAN_SCALE, px) for px in CAN_WHEEL_CENTRES]
CAN_FRONT_CENTRE, CAN_FRONT_LEFT, CAN_FRONT_RIGHT, CAN_FRONT_ROOF = 592, 418, 766, 95
CAN_FRONT_GROUND = 516
CAN_W = (CAN_FRONT_RIGHT-CAN_FRONT_LEFT) * CAN_H / (CAN_FRONT_GROUND-CAN_FRONT_ROOF)
CAN_TOP_CENTRE, CAN_TOP_SPAN = 348, 429
CAN_HATCH = (-1.24, 1.17, -1.02, 1.77, 1.02)
def canteen_keep(x, y, z):
    # Leave a true serving opening in the road-side skin, stopping at the inner
    # face so the opposite wall and the interior remain intact.
    wall_x, low_y, low_z, high_y, high_z = CAN_HATCH
    return ~((x < wall_x + .10) & (y >= low_y) & (y <= high_y) & (z >= low_z) & (z <= high_z))
canteen_table = {
    'photos': {'side':'town-food-canteen-side.jpg','front':'town-food-canteen-front.jpg',
               'rear':'town-food-canteen-rear.jpg','top':'town-food-canteen-top.jpg'},
    'length':CAN_LEN,'width':CAN_W,'height':CAN_H,
    'side':{'start':CAN_START,'end':CAN_END,'ground':CAN_GROUND},
    'front':{'centre':CAN_FRONT_CENTRE,'ground':CAN_FRONT_GROUND,'top':CAN_FRONT_ROOF},
    'rear':{'centre':CAN_FRONT_CENTRE,'ground':CAN_FRONT_GROUND,'top':CAN_FRONT_ROOF},
    'top':{'front':58,'rear':1988,'centre':CAN_TOP_CENTRE,'along':'x','x_scale':CAN_W/CAN_TOP_SPAN},
    'cut':{'front':[(398,190,424,275),(760,190,798,275)]},
    'wheels':[(z,CAN_WHEEL_R,CAN_W/2-.25) for z,_ in CAN_AXLES],
    'keep':canteen_keep,'underside':.08,'voxel':.045,'target':2200,
    'grey':26,'tolerance':38,'bleed_tolerance':44,
    'mask_dir':str(evidence/'canteen-masks'),
}
canteen_body=carve_object('canteen:body',textures,canteen_table)
keep(canteen_body)
canteen_side=canteen_table['_photos']['side']
canteen_front=canteen_table['_photos']['front']
for axle_index,(axle_z,side_px) in enumerate(CAN_AXLES,1):
    for hand in (-1,1):
        wheel_mesh=PhotoMesh()
        tyre(wheel_mesh,'side',canteen_side,side_px,CAN_WHEEL_PY,CAN_WHEEL_RPX,CAN_WHEEL_R,.17,
             'front',canteen_front,CAN_FRONT_CENTRE,34,478,514,sides=24)
        wheel=wheel_mesh.finish(f'canteen:wheel-{axle_index}-{"road" if hand<0 else "far"}',
                                {'side':canteen_side.material(),'front':canteen_front.material()})
        wheel.location=town.game_vector((hand*(CAN_W/2-.17),CAN_WHEEL_R,axle_z))
        keep(wheel)

# The counter begins at the inner face of the open hatch. Its outer lip meets
# the skin; the awning starts on that same wall and slopes away from it.
box('canteen:serving-recess',(-CAN_W/2+.055,1.47,0),(.08,.60,1.94),mat['iron-dark'],.015)
box('canteen:serving-counter',(-CAN_W/2-.13,1.12,0),(.34,.13,2.04),mat['weathered-plank'],.025)
awning_vertices=[]
for z in (-1.48,-.74,0,.74,1.48):
    for x in range(5):
        t=x/4
        y=2.05-.34*t + (.035 if x in (1,3) else 0) + (.018 if z in (-.74,.74) else 0)
        awning_vertices.append((-1.20 - .92*t,y,z))
awning_faces=[]
for row in range(4):
    for col in range(4):
        a=row*5+col
        awning_faces.append((a,a+1,a+6,a+5))
awning_obj=mesh_object('canteen:patched-serving-awning',awning_vertices,awning_faces,mat['canteen-canvas'])
for x in (.30,1.00):
    box(f'canteen:bench-{x}',(x,.48,0),(.38,.11,2.15),mat['weathered-plank'],.03)
    for z in (-.82,.82): beam(f'canteen:bench-leg-{x}-{z}',(x,.04,z),(x,.43,z),.055,mat['rusted-steel'])
for index,z in enumerate((-1.12,0,1.12),1):
    cylinder(f'canteen:road-stool-{index}-seat',(-2.43,.48,z),.25,.09,mat['weathered-plank'])
    for dx,dz in ((-.14,-.14),(.14,-.14),(-.14,.14),(.14,.14)):
        beam(f'canteen:road-stool-{index}-leg-{dx}-{dz}',(-2.43+dx,0,z+dz),
             (-2.43+dx,.44,z+dz),.045,mat['rusted-steel'])

# Market hall: keep the accepted patchwork roof, shorten the hall to its gable
# span, and build the open steel frame, store, floor and two real stall rows.
add_building('market-hall',(-18,0,14))
MARKET_LENGTH = 9.45
MARKET_PHOTO_LENGTH = 19.0     # side/top photos use the hall's original long-axis scale
MARKET_HEIGHT = 4.20                 # 136 px side-photo door = about 2 m
MARKET_WIDTH = 9.45                  # 1340 px gable span at the end-photo scale
FLOOR_HALF = MARKET_WIDTH / 2 - .50
MARKET_POST_Z = (-FLOOR_HALF, -1.95, .70, 3.25, FLOOR_HALF)
MARKET_EAVE = 3.18
MARKET_RIDGE = MARKET_HEIGHT - .10
print(f'market-hall measured plan: width={MARKET_WIDTH:.2f} m depth={MARKET_LENGTH:.2f} m')
if abs(MARKET_WIDTH-MARKET_LENGTH) > .25:
    raise RuntimeError('market hall depth must follow the measured gable span')
MARKET_SIDE = {'start': 52, 'end': 1363, 'ground': 387}
MARKET_FRONT = {'centre': 800, 'ground': 720, 'top': 125}
MARKET_REAR = {'centre': 800, 'ground': 720, 'top': 125}

def market_keep(x, y, z):
    # Keep the roof's full photo silhouette and narrow side-post traces. The
    # store is rebuilt as its own solid room below so a detached room cannot
    # become the photo carver's largest connected island.
    posts = np.zeros_like(x, dtype=bool)
    for post_z in MARKET_POST_Z:
        posts |= (np.abs(np.abs(x)-FLOOR_HALF) < .25) & (np.abs(z-post_z) < .24)
    in_short_plan = np.abs(z) < MARKET_LENGTH/2 + .08
    return ((y > 2.55) | posts) & in_short_plan

market_table = {
    'photos': {'side': 'market-hall-side.jpg', 'front': 'market-hall-front.jpg',
               'rear': 'market-hall-rear.jpg', 'top': 'market-hall-top.jpg'},
    'length': MARKET_PHOTO_LENGTH, 'width': MARKET_WIDTH, 'height': MARKET_HEIGHT,
    'side': MARKET_SIDE,
    # Both end photos state their own measured roof-top pixel row.
    'front': MARKET_FRONT, 'rear': MARKET_REAR,
    'top': {'front': 60, 'rear': 1290, 'centre': 450, 'along': 'x',
            'x_scale': MARKET_WIDTH / 780},
    'cut': {'side': [(115, 190, 1125, 386)],
            'front': [(145, 410, 950, 718)],
            'rear': [(520, 410, 1325, 718)]},
    'keep': market_keep, 'voxel': .06, 'target': 3600,
    'grey': 26, 'tolerance': 38, 'bleed_tolerance': 42,
    'mask_dir': str(evidence / 'market-masks'),
}
market_body = carve_object('market-hall:body', textures, market_table)
market_root = building_roots['market-hall']
market_body.parent = market_root
export_objects.add(market_body)
def market_box(name, center, size, material):
    return keep(town.cube(name, center, size, material, 0), market_root)

def market_beam(name, a, b, width, material):
    va=town.game_vector(a);vb=town.game_vector(b);delta=vb-va
    obj=town.cube(name,((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),
                  (width,delta.length,width),material,0)
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return keep(obj,market_root)

market_photos = market_table['_photos']
hall_world_front = -MARKET_LENGTH / 2
market_face_z = hall_world_front + .55
market_end_scale = MARKET_HEIGHT / (MARKET_FRONT['ground'] - MARKET_FRONT['top'])
stall_photo = Photo(textures / 'market-hall-front-stalls.jpg')
stall_photo_material = stall_photo.material(.9)

def photo_point(px, py, z):
    return ((MARKET_FRONT['centre'] - px) * market_end_scale,
            (MARKET_FRONT['ground'] - py) * market_end_scale, z)

def pictured_quad(mesh, px0, py0, px1, py1, z, material, normal=(0,0,-1)):
    # Front-face order keeps +X on the left side of the photograph.
    points = [photo_point(px0,py0,z), photo_point(px1,py0,z),
              photo_point(px1,py1,z), photo_point(px0,py1,z)]
    uvs = [stall_photo.uv(px0,py0), stall_photo.uv(px1,py0),
           stall_photo.uv(px1,py1), stall_photo.uv(px0,py1)]
    mesh.face(points, uvs, material, normal)

# Build three substantial stalls in each row, facing across a clear walkway.
# Each stall wears a distinct crop from the reference stalls photograph.
STALL_RECTS = ((145,292),(305,459),(473,628),(643,799),(815,962))
STALL_AWNING = (402, 455)
STALL_GOODS = (455, 566)
STALL_BASE = (566, 720)
market_box('market-hall:earth-floor',(0,.025,0),(MARKET_WIDTH+.30,.05,MARKET_LENGTH+.30),mat['sand'])

# Steel posts at the ends and middle bays on all four sides. Their caps overlap
# the carved eave so no column appears to stop short of the roof.
post_points = [(x,z) for x in (-FLOOR_HALF,FLOOR_HALF) for z in MARKET_POST_Z]
post_points.extend((x,z) for x in (-FLOOR_HALF,0,FLOOR_HALF) for z in (-FLOOR_HALF,FLOOR_HALF)
                   if abs(x) < FLOOR_HALF)
for index,(x,z) in enumerate(post_points,1):
    top=MARKET_RIDGE if abs(x)<.01 else MARKET_EAVE
    market_beam(f'market-hall:frame-post-{index}',(x,.05,z),(x,top,z),.12,mat['rusted-steel'])
    market_box(f'market-hall:post-foot-{index}',(x,.12,z),(.28,.14,.28),mat['rusted-steel'])
    market_box(f'market-hall:post-cap-{index}',(x,top-.04,z),(.27,.20,.27),mat['rusted-steel'])
for x,top in ((-FLOOR_HALF,MARKET_EAVE),(FLOOR_HALF,MARKET_EAVE),(0,MARKET_RIDGE)):
    market_beam(f'market-hall:side-beam-{x}',(x,top,-FLOOR_HALF),(x,top,FLOOR_HALF),.09,mat['rusted-steel'])
for z in MARKET_POST_Z:
    market_beam(f'market-hall:rafter-left-{z}',(-FLOOR_HALF,MARKET_EAVE,z),(0,MARKET_RIDGE,z),.09,mat['rusted-steel'])
    market_beam(f'market-hall:rafter-right-{z}',(0,MARKET_RIDGE,z),(FLOOR_HALF,MARKET_EAVE,z),.09,mat['rusted-steel'])

# A real one-bay room occupies the road-side corner of the roof.
market_box('market-hall:store-floor',(3.15,.09,-3.10),(2.15,.12,2.05),mat['cracked-concrete'])
for x in (2.12,4.18):
    market_box(f'market-hall:store-side-{x}',(x,1.55,-3.10),(.10,3.0,2.10),mat['galvanised-tin'])
for z in (-2.08,-4.14):
    market_box(f'market-hall:store-end-{z}',(3.15,1.55,z),(2.10,3.0,.10),mat['galvanised-tin'])
market_box('market-hall:store-door',(3.13,1.11,-4.18),(.95,2.12,.09),mat['weathered-plank'])
for x in (2.62,3.64): market_beam(f'market-hall:store-door-jamb-{x}',(x,.05,-4.10),(x,2.25,-4.10),.07,mat['rusted-steel'])
market_beam('market-hall:store-door-lintel',(2.62,2.25,-4.10),(3.64,2.25,-4.10),.07,mat['rusted-steel'])

for row, (x_center, facing) in enumerate(((-1.72,1),(1.72,-1)),1):
    for position, z_center in enumerate((-1.0,1.1,3.2),1):
        stall_index=(row-1)*3+position
        px0,px1=STALL_RECTS[(position+row-2)%len(STALL_RECTS)]
        stall_width=1.42; depth=1.10; height=2.25
        front_x=x_center+facing*depth/2
        back_x=x_center-facing*depth/2
        # Textured face crops carry each stall's own goods. Counters, side
        # cheeks, back shelves, support legs and awning are solid geometry.
        def stall_photo_panel(label, py0, py1, bottom, top_y):
            crop=PhotoMesh()
            points=[(front_x,bottom,z_center-stall_width/2),(front_x,bottom,z_center+stall_width/2),
                    (front_x,top_y,z_center+stall_width/2),(front_x,top_y,z_center-stall_width/2)]
            if facing < 0: points=list(reversed(points))
            crop.face(points,[stall_photo.uv(px0,py0),stall_photo.uv(px1,py0),
                              stall_photo.uv(px1,py1),stall_photo.uv(px0,py1)],
                      'photo',out=(facing,0,0))
            face=crop.finish(f'market-hall:stall-{stall_index}-{label}',{'photo':stall_photo_material})
            face.parent=market_root;export_objects.add(face)
        stall_photo_panel('goods-face',STALL_GOODS[0],STALL_GOODS[1],1.09,2.16)
        stall_photo_panel('base-face',STALL_BASE[0],STALL_BASE[1],.22,.97)
        market_box(f'market-hall:stall-{stall_index}-counter',(x_center,1.03,z_center),(depth+.14,.12,stall_width+.08),mat['weathered-plank'])
        market_box(f'market-hall:stall-{stall_index}-shelf',(back_x,1.52,z_center),( .12,.10,stall_width-.10),mat['weathered-plank'])
        for side,z in (('left',z_center-stall_width/2+.06),('right',z_center+stall_width/2-.06)):
            for end,x in (('front',front_x),('rear',back_x)):
                market_beam(f'market-hall:stall-{stall_index}-{side}-{end}-leg',(x,0,z),(x,2.12,z),.06,mat['rusted-steel'])
        # The canvas roof projects toward the central aisle and is carried by
        # rusted arms. A reverse facing ensures the opposite row mirrors it.
        awning_outer=x_center+facing*(depth/2+.78)
        awning_inner=front_x
        awning=market_box(f'market-hall:stall-{stall_index}-awning',
                   ((awning_outer+awning_inner)/2,2.20,z_center),(abs(awning_outer-awning_inner),.09,stall_width+.12),
                   mat['patched-canvas'])
        for side,z in (('left',z_center-stall_width/2+.08),('right',z_center+stall_width/2-.08)):
            market_beam(f'market-hall:stall-{stall_index}-{side}-awning-arm',
                 (front_x,2.17,z),(awning_outer,2.11,z),.045,mat['rusted-steel'])

# Normalize every picture coordinate layer before export: each mesh must be TEXCOORD_0 only.
for obj in export_objects:
    if obj.type == 'MESH' and obj.data.uv_layers:
        for layer in list(obj.data.uv_layers): layer.name = 'UVMap'
for material in bpy.data.materials:
    if material.use_nodes and material.node_tree.nodes.get('Principled BSDF'):
        bsdf=material.node_tree.nodes.get('Principled BSDF')
        if bsdf.inputs.get('Metallic'): bsdf.inputs['Metallic'].default_value=min(bsdf.inputs['Metallic'].default_value,.29)

# Keep source photographs intact on disk. Full-resolution baked images are
# reserved for the newly photo-mapped stalls and the market/soup hero views.
for photo in (front,left,overhead):
    photo.image.scale(256,192)
    photo.image.pack()
wall_photo.image.pack()
for photo in (*market_photos.values(), stall_photo, stall_front_photo, stall_side_photo,
              *canteen_table['_photos'].values()):
    if photo in (stall_front_photo, stall_side_photo, stall_photo):
        # These measured surfaces need the source grain, rust and cloth patches.
        pass
    else:
        ratio = photo.w / photo.h
        if ratio >= 1:
            size = (224, round(224 / ratio))
        else:
            size = (round(224 * ratio), 224)
        photo.image.scale(*size)
    photo.image.pack()

# Print and check every market piece in local game axes. Supports run from the
# floor to the eaves, stalls stand on the concrete/earth and awnings touch arms.
bpy.context.view_layer.update()
market_parts = [obj for obj in export_objects
                if obj.type == 'MESH' and obj.name.startswith('market-hall:')]
market_bounds = []
def market_world_bounds(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    xs = [point.x - market_root.location.x for point in corners]
    ys = [point.z - market_root.location.z for point in corners]
    zs = [-(point.y - market_root.location.y) for point in corners]
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)
market_bounds_by_name = {}
for obj in market_parts:
    min_x,max_x,min_y,max_y,min_z,max_z=market_world_bounds(obj)
    bounds = {'piece': obj.name,
              'x': [round(min_x,3),round(max_x,3)],
              'y': [round(min_y,3),round(max_y,3)],
              'z': [round(min_z,3),round(max_z,3)]}
    print('market-hall piece bounds:', json.dumps(bounds, sort_keys=True))
    if min_x < -11.5 or max_x > 11.5 or min_z < -11.5 or max_z > 11.5:
        raise RuntimeError(f"{obj.name} lies outside its 3x3 footprint")
    if min_y < -.10:
        raise RuntimeError(f"{obj.name} falls below the ground")
    if obj.name == 'market-hall:earth-floor' and abs(min_y) > .01:
        raise RuntimeError('market-hall floor does not touch the ground')
    if obj.name == 'market-hall:store-floor' and abs(min_y-.03) > .04:
        raise RuntimeError('market store floor does not join the hall floor')
    if 'stall-' in obj.name and obj.name.endswith('-leg'):
        if abs(min_y) > .01:
            raise RuntimeError(f"{obj.name} does not touch the hall floor")
    market_bounds.append(bounds)
    market_bounds_by_name[obj.name]=(min_x,max_x,min_y,max_y,min_z,max_z)

# Explicit pair checks for the important physical joins.
body_top=max(market_world_bounds(part)[3] for part in market_parts if part.name == 'market-hall:body')
def bounds_touch(a,b,axis_tolerance=.002):
    return all(max(a[axis*2],b[axis*2]) <= min(a[axis*2+1],b[axis*2+1])+axis_tolerance for axis in range(3))
floor_bounds=market_bounds_by_name['market-hall:earth-floor']
roof_bounds=market_bounds_by_name['market-hall:body']
if floor_bounds[0] > roof_bounds[0] or floor_bounds[1] < roof_bounds[1] or floor_bounds[4] > roof_bounds[4] or floor_bounds[5] < roof_bounds[5]:
    raise RuntimeError('market-hall earth floor does not cover the roof footprint')
for index in range(1,13):
    post=f'market-hall:frame-post-{index}'
    if not bounds_touch(market_bounds_by_name[post],floor_bounds):
        raise RuntimeError(f"{post} does not touch the floor")
for part in market_parts:
    if part.name.startswith('market-hall:store-') and part.name not in ('market-hall:store-floor','market-hall:store-door-lintel'):
        if not bounds_touch(market_bounds_by_name[part.name],floor_bounds):
            raise RuntimeError(f"{part.name} does not meet the hall floor")
for index in range(1,7):
    counter=market_bounds_by_name[f'market-hall:stall-{index}-counter']
    legs=[part for part in market_parts if part.name.startswith(f'market-hall:stall-{index}-') and part.name.endswith('-leg')]
    if len(legs)!=4 or any(not bounds_touch(market_bounds_by_name[part.name],counter) for part in legs):
        raise RuntimeError(f'market-hall stall {index} counter does not meet all four legs')
for obj in market_parts:
    if obj.name.startswith('market-hall:frame-post-'):
        mnx,mxx,mny,mxy,mnz,mxz=market_world_bounds(obj)
        target_top=MARKET_RIDGE if abs((mnx+mxx)/2)<.1 else MARKET_EAVE
        if mny > .10 or mxy < target_top-.05 or body_top < 3.8:
            raise RuntimeError(f"{obj.name} does not bridge ground and roof")
    if obj.name.endswith('-goods-face') or obj.name.endswith('-base-face'):
        index=obj.name.split('-')[2]
        counter=market_bounds_by_name[f'market-hall:stall-{index}-counter']
        if not bounds_touch(market_bounds_by_name[obj.name],counter):
            raise RuntimeError(f"{obj.name} does not touch its counter")
    if obj.name.startswith('market-hall:stall-') and obj.name.endswith('-awning'):
        index=obj.name.rsplit('-',2)[1]
        arms=[part for part in market_parts if part.name.startswith(f'market-hall:stall-{index}-') and part.name.endswith('-awning-arm')]
        if len(arms)!=2 or any(not bounds_touch(market_bounds_by_name[part.name],market_bounds_by_name[obj.name]) for part in arms):
            raise RuntimeError(f"{obj.name} is not joined to both awning arms")

# Print every canteen piece and verify the tyre and awning joins that matter to
# this round's front and road-side review.
bpy.context.view_layer.update()
canteen_root_obj=building_roots['canteen']
def canteen_world_bounds(obj):
    corners=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (min(p.x-canteen_root_obj.location.x for p in corners),
            max(p.x-canteen_root_obj.location.x for p in corners),
            min(p.z-canteen_root_obj.location.z for p in corners),
            max(p.z-canteen_root_obj.location.z for p in corners),
            min(-(p.y-canteen_root_obj.location.y) for p in corners),
            max(-(p.y-canteen_root_obj.location.y) for p in corners))
canteen_parts=[obj for obj in export_objects if obj.type=='MESH' and obj.name.startswith('canteen:')]
c_bounds={}
for obj in canteen_parts:
    bounds=canteen_world_bounds(obj);c_bounds[obj.name]=bounds
    print('canteen piece bounds:',json.dumps({'piece':obj.name,'x':[round(bounds[0],3),round(bounds[1],3)],
        'y':[round(bounds[2],3),round(bounds[3],3)],'z':[round(bounds[4],3),round(bounds[5],3)]},sort_keys=True))
body_bounds=c_bounds['canteen:body']
if abs(body_bounds[0]+CAN_W/2)>.12 or abs(body_bounds[1]-CAN_W/2)>.12:
    raise RuntimeError('canteen body width does not follow the measured front photo')
for obj in canteen_parts:
    if ':wheel-' in obj.name:
        bounds=c_bounds[obj.name]
        side=1 if '-far' in obj.name else -1
        outer=bounds[1] if side>0 else bounds[0]
        body_side=body_bounds[1] if side>0 else body_bounds[0]
        if abs(outer-body_side)>.12:
            raise RuntimeError(f'{obj.name} outer face does not sit flush with the body')
awning_bounds=c_bounds['canteen:patched-serving-awning']
if not (awning_bounds[0] <= body_bounds[0]+.02 and awning_bounds[1] > body_bounds[0] and
        awning_bounds[2] < body_bounds[3] and awning_bounds[3] > 1.7):
    raise RuntimeError('canteen awning does not touch the road-side wall above its hatch')
for index in range(1,4):
    feet=[c_bounds[obj.name] for obj in canteen_parts if obj.name.startswith(f'canteen:road-stool-{index}-leg-')]
    if len(feet)!=4 or any(abs(bounds[2])>.02 for bounds in feet):
        raise RuntimeError(f'canteen road stool {index} feet do not stand on the ground')

# Each 1 x 1 market stall prints its own piece bounds and stays within the
# town's 8 m cell with the required 0.5 m margin.  Every piece must meet the
# ground or another piece by its measured AABB; counts are per named building.
for stall_id in ('stall-a','stall-b','stall-c'):
    root_obj=building_roots[stall_id]
    parts=[obj for obj in export_objects if obj.type=='MESH' and obj.parent is root_obj]
    bounds_by_name={}
    triangles=0
    for obj in parts:
        corners=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        b=(min(p.x-root_obj.location.x for p in corners),max(p.x-root_obj.location.x for p in corners),
           min(p.z-root_obj.location.z for p in corners),max(p.z-root_obj.location.z for p in corners),
           min(-(p.y-root_obj.location.y) for p in corners),max(-(p.y-root_obj.location.y) for p in corners))
        bounds_by_name[obj.name]=b
        count=sum(len(poly.vertices)-2 for poly in obj.data.polygons)
        triangles+=count
        print('stall piece bounds:',json.dumps({'piece':obj.name,'x':[round(b[0],3),round(b[1],3)],
            'y':[round(b[2],3),round(b[3],3)],'z':[round(b[4],3),round(b[5],3)],'triangles':count},sort_keys=True))
        if b[0]<-3.5 or b[1]>3.5 or b[4]<-3.5 or b[5]>3.5 or b[2]<-.02:
            raise RuntimeError(f'{obj.name} lies outside the stall footprint or below ground: {b}')
        if 'post' in obj.name and abs(b[2])>.02:
            raise RuntimeError(f'{obj.name} does not reach the ground: {b}')
    if triangles>1800:
        raise RuntimeError(f'{stall_id} has {triangles} triangles; budget is 1800')
    for name,b in bounds_by_name.items():
        if abs(b[2])<=.02: continue
        joined=False
        for other_name,other in bounds_by_name.items():
            if other_name==name: continue
            overlap=all(max(b[axis*2],other[axis*2])<=min(b[axis*2+1],other[axis*2+1])+.025 for axis in range(3))
            if overlap: joined=True;break
        if not joined: raise RuntimeError(f'{name} does not touch ground or another stall piece')
    print(f'{stall_id} total triangles:',triangles)

out.parent.mkdir(parents=True,exist_ok=True)
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects: obj.select_set(True)
bpy.context.view_layer.objects.active=family
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
                          export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=82)

# Review only the exported model, imported back into an otherwise empty Blender scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out))
evidence.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=40
scene.render.resolution_x=900;scene.render.resolution_y=680;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('bright overcast review sky')
scene.world.color=(.72,.72,.72)
scene.render.film_transparent=False
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.255,.245,.225,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
def area(name, loc, power, size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((6,1,-1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('bright overcast key',(3,18,9),750,48);area('soft sky fill',(-8,16,5),650,44)
area('open aisle bounce',(0,8,5),450,8)
ground_material=simple('review ground / neutral',(.255,.245,.225),.94)
ground_nodes=ground_material.node_tree.nodes;ground_nodes.clear();ground_links=ground_material.node_tree.links
ground_output=ground_nodes.new('ShaderNodeOutputMaterial');ground_emission=ground_nodes.new('ShaderNodeEmission')
ground_emission.inputs['Color'].default_value=(.255,.245,.225,1);ground_emission.inputs['Strength'].default_value=.7
ground_links.new(ground_emission.outputs[0],ground_output.inputs['Surface'])
ground=town.cube('review ground',(5,-.16,0),(1000,.3,1000),ground_material,0)
def under(obj, ancestor):
    while obj:
        if obj == ancestor: return True
        obj = obj.parent
    return False
market_root = next(obj for obj in bpy.context.scene.objects if obj.name == 'market-hall')
for obj in scene.objects:
    if obj.type not in ('CAMERA','LIGHT') and obj.name != 'review ground' and not under(obj,market_root):
        obj.hide_render=True
next(obj for obj in scene.objects if obj.name == 'review ground').hide_render=True
members=[obj for obj in scene.objects if obj.type=='MESH' and under(obj,market_root)]
corners=[obj.matrix_world @ Vector(corner) for obj in members for corner in obj.bound_box]
lo=Vector((min(p.x for p in corners),min(p.y for p in corners),min(p.z for p in corners)))
hi=Vector((max(p.x for p in corners),max(p.y for p in corners),max(p.z for p in corners)))
target=(lo+hi)*.5
key=scene.objects['bright overcast key'];key.location=target+Vector((-5,9,12));key.data.energy=900;key.data.size=18
key.rotation_euler=(target-key.location).to_track_quat('-Z','Y').to_euler()
fill=scene.objects['soft sky fill'];fill.location=target+Vector((8,4,7));fill.data.energy=600;fill.data.size=24
fill.rotation_euler=(target-fill.location).to_track_quat('-Z','Y').to_euler()
aisle=scene.objects['open aisle bounce'];aisle.location=target+Vector((0,4,2));aisle.data.energy=450;aisle.data.size=7
aisle.rotation_euler=(target-aisle.location).to_track_quat('-Z','Y').to_euler()
ground_data=bpy.data.meshes.new('market hall review ground mesh')
ground_data.from_pydata(((lo.x-30,lo.y-30,lo.z-.08),(hi.x+30,lo.y-30,lo.z-.08),
                         (hi.x+30,hi.y+30,lo.z-.08),(lo.x-30,hi.y+30,lo.z-.08)),[],[(0,1,2,3)])
ground_data.materials.append(ground_material)
review_ground=bpy.data.objects.new('market hall review ground',ground_data);scene.collection.objects.link(review_ground)
def render_match(name, camera_loc, up, ortho, look_at=None):
    camera_data=bpy.data.cameras.new(name);camera_data.type='ORTHO';camera_data.ortho_scale=ortho
    camera=bpy.data.objects.new(name,camera_data);scene.collection.objects.link(camera);camera.location=camera_loc
    aim=look_at if look_at is not None else target
    direction=(aim-camera_loc).normalized();right=direction.cross(up).normalized()
    true_up=right.cross(direction).normalized()
    camera.rotation_euler=Matrix((right,true_up,-direction)).transposed().to_quaternion().to_euler();scene.camera=camera
    scene.render.filepath=str(evidence/(name+'.png'));bpy.ops.render.render(write_still=True)
render_match('model-front',target+Vector((0,18,0)),Vector((0,0,1)),13)
render_match('model-side',target+Vector((18,0,0)),Vector((0,0,1)),13)
render_match('model-rear',target+Vector((0,-18,0)),Vector((0,0,1)),13)
render_match('model-top',target+Vector((0,0,18)),Vector((0,1,0)),13)
render_match('market-three-left',target+Vector((-13,14,7)),Vector((0,0,1)),16)
render_match('market-three-right',target+Vector((13,14,7)),Vector((0,0,1)),16)
render_match('market-road',target+Vector((2,15,3)),Vector((0,0,1)),13)
render_match('market-mayor',target+Vector((0,19,13)),Vector((0,0,1)),16)
# Isolated references for each one-cell stall; the accepted market hall and
# canteen stay hidden so unrelated family geometry cannot enter this review.
for stall_id in ('stall-a','stall-b','stall-c'):
    stall_root=next(obj for obj in scene.objects if obj.name==stall_id)
    for obj in scene.objects:
        if obj.type not in ('CAMERA','LIGHT') and obj.name not in ('review ground','market hall review ground'):
            obj.hide_render=not under(obj,stall_root)
    members=[obj for obj in scene.objects if obj.type=='MESH' and under(obj,stall_root)]
    points=[obj.matrix_world @ Vector(corner) for obj in members for corner in obj.bound_box]
    lo_stall=Vector((min(p.x for p in points),min(p.y for p in points),min(p.z for p in points)))
    hi_stall=Vector((max(p.x for p in points),max(p.y for p in points),max(p.z for p in points)))
    target=(lo_stall+hi_stall)*.5
    scene.render.resolution_x=800;scene.render.resolution_y=640
    prefix=stall_id+'-'
    render_match(prefix+'front',target+Vector((0,8,0)),Vector((0,0,1)),4.2)
    render_match(prefix+'side',target+Vector((8,0,0)),Vector((0,0,1)),4.2)
    render_match(prefix+'rear',target+Vector((0,-8,0)),Vector((0,0,1)),4.2)
    render_match(prefix+'above',target+Vector((0,0,9)),Vector((0,1,0)),4.2)
    render_match(prefix+'three-left',target+Vector((-6,-7,4)),Vector((0,0,1)),5.2)
    render_match(prefix+'three-right',target+Vector((6,-7,4)),Vector((0,0,1)),5.2)
    render_match(prefix+'mayor',target+Vector((-12,-12,12)),Vector((0,0,1)),6.0)
# The mayor's view shows the three separately built market stalls together.
stall_roots=[next(obj for obj in scene.objects if obj.name==name)
             for name in ('stall-a','stall-b','stall-c')]
for obj in scene.objects:
    if obj.type not in ('CAMERA','LIGHT') and obj.name not in ('review ground','market hall review ground'):
        obj.hide_render=not any(under(obj,stall_root) for stall_root in stall_roots)
stall_members=[obj for obj in scene.objects if obj.type=='MESH' and
               any(under(obj,stall_root) for stall_root in stall_roots)]
stall_points=[obj.matrix_world @ Vector(corner) for obj in stall_members for corner in obj.bound_box]
stall_lo=Vector((min(p.x for p in stall_points),min(p.y for p in stall_points),min(p.z for p in stall_points)))
stall_hi=Vector((max(p.x for p in stall_points),max(p.y for p in stall_points),max(p.z for p in stall_points)))
target=(stall_lo+stall_hi)*.5
scene.render.resolution_x=1200;scene.render.resolution_y=850
render_match('stalls-three-quarter',target+Vector((-20,24,15)),Vector((0,0,1)),30)
render_match('stalls-mayor',target+Vector((-8,18,25)),Vector((0,0,1)),30)
canteen_root=next(obj for obj in scene.objects if obj.name=='canteen')
for obj in scene.objects:
    if obj.type not in ('CAMERA','LIGHT') and obj.name not in ('review ground','market hall review ground'):
        obj.hide_render=not under(obj,canteen_root)
c_members=[obj for obj in scene.objects if obj.type=='MESH' and under(obj,canteen_root)]
c_corners=[obj.matrix_world @ Vector(corner) for obj in c_members for corner in obj.bound_box]
c_lo=Vector((min(p.x for p in c_corners),min(p.y for p in c_corners),min(p.z for p in c_corners)))
c_hi=Vector((max(p.x for p in c_corners),max(p.y for p in c_corners),max(p.z for p in c_corners)))
target=(c_lo+c_hi)*.5
cground_data=bpy.data.meshes.new('canteen review ground mesh')
cground_data.from_pydata(((c_lo.x-20,c_lo.y-20,c_lo.z-.08),(c_hi.x+20,c_lo.y-20,c_lo.z-.08),
                          (c_hi.x+20,c_hi.y+20,c_lo.z-.08),(c_lo.x-20,c_hi.y+20,c_lo.z-.08)),[],[(0,1,2,3)])
cground_data.materials.append(ground_material)
cground=bpy.data.objects.new('canteen review ground',cground_data);scene.collection.objects.link(cground)
for light_name,offset,energy,size in (
    ('bright overcast key',Vector((-7,10,12)),850,14),
    ('soft sky fill',Vector((8,5,7)),650,18),
    ('open aisle bounce',Vector((0,4,2)),350,6)):
    light=scene.objects[light_name];light.location=target+offset;light.data.energy=energy;light.data.size=size
    light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
render_match('canteen-three-left',target+Vector((-8,9,5)),Vector((0,0,1)),9.5)
render_match('canteen-road',target+Vector((0,12,1)),Vector((0,0,1)),7)
scene.render.resolution_x=1200;scene.render.resolution_y=675
front_body=next(obj for obj in scene.objects if obj.name=='canteen:body')
front_corners=[front_body.matrix_world @ Vector(corner) for corner in front_body.bound_box]
front_target=sum(front_corners,Vector())/len(front_corners)
render_match('canteen-front',front_target+Vector((0,12,1)),Vector((0,0,1)),8.5,look_at=front_target)
scene.render.resolution_x=900;scene.render.resolution_y=680
render_match('canteen-side',target+Vector((12,0,3)),Vector((0,0,1)),8.5)
render_match('canteen-mayor',target+Vector((8,12,11)),Vector((0,0,1)),10.5)
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'sheet':str(sheet),
                  'evidence':str(evidence),'market_pieces':market_bounds}))
