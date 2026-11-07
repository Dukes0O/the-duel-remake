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
evidence = root / '.evidence/2026-11-07/town-art-food/market-round-1'
out = root / 'public/assets/models/wasteland/town/food.glb'
blend = root / 'art-build/town/food.blend'
sheet = root / 'docs/board/looks/town-art-food/market-round-1.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Photo, Mesh as PhotoMesh, lathe as photo_lathe, trace, slab
from photo_carve import carve_object

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
steel_photo.scale(256, 256); steel_photo.file_format='JPEG'; steel_photo.pack()
mat['rusted-steel'].node_tree.nodes.get('Image Texture').image = steel_photo
mat['rusted-steel'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .22
# Six independent repeating material photos fit comfortably inside the card's
# 1K image-pixel budget while avoiding a glTF texture atlas.
for material in mat.values():
    image = material.node_tree.nodes.get('Image Texture').image
    image.scale(256, 256)
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
mat['crate'] = mat['weathered-plank']
mat['wire'] = simple('Town / dark wire', (.12, .13, .115), .78, .14)
mat['rubber'] = simple('Town / dusty tire rubber', (.075, .078, .071), .95)
mat['glass'] = simple('Town / dirty greenhouse glass', (.22, .28, .245), .32, .05)
mat['brick'] = mat['salvaged-brick']
mat['letter-paint'] = simple('Town / muted ochre hand lettering', (.42, .29, .15), .92)

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

def market_stall(building, offset, kind):
    add_building(building,offset)
    for x in (-1.15,1.15):
        beam(f'{building}:post-{x}',(x,.12,-1.08),(x,2.18,-1.08),.085,mat['rusted-steel'])
        beam(f'{building}:rear-post-{x}',(x,.12,1.0),(x,1.85,1.0),.075,mat['weathered-plank'])
    beam(f'{building}:front-lintel',(-1.25,2.12,-1.08),(1.25,2.12,-1.08),.09,mat['rusted-steel'])
    beam(f'{building}:rear-lintel',(-1.25,1.85,1.0),(1.25,1.85,1.0),.075,mat['weathered-plank'])
    for x in (-.65,.65):
        beam(f'{building}:awning-arm-{x}',(x,1.7,-1.1),(x,2.18,-.22),.055,mat['rusted-steel'])
    awning_material={'fruit':'fruit-yellow','tools':'weathered-plank','tyres':'patched-canvas'}[kind]
    if kind == 'fruit':
        # Fruit stall canvas sags between its rails rather than forming a box.
        verts=[];faces=[];n=10
        for row,z in enumerate((-.96,-.30)):
            for i in range(n+1):
                x=-1.4+2.8*i/n
                y=2.14-.10*(1-(x/1.4)**2)+(0.035 if row else 0)
                verts.append((x,y,z))
        for i in range(n): faces.append((i,i+1,n+2+i,n+1+i))
        awning=mesh_object(f'{building}:patched-awning',verts,faces,mat[awning_material],'canvas')
        beam(f'{building}:awning-front-hem',(-1.4,2.11,-.96),(1.4,2.11,-.96),.055,mat['rusted-steel'])
        for x in (-1.1,1.1):
            box(f'{building}:fruit-sack-{x}',(x,1.25,.42),(.62,.30,.45),mat['patched-canvas'],.07)
    else:
        awning=box(f'{building}:patched-awning',(0,2.12,-.62),(2.8,.07,1.05),mat[awning_material],.035)
        awning.rotation_euler[0]=-.10
    box(f'{building}:display-counter',(0,.91,-.24),(2.18,.20,.83),mat['weathered-plank'],.04)
    for x in (-.85,.85): beam(f'{building}:counter-leg-{x}',(x,.12,-.24),(x,.84,-.24),.08,mat['rusted-steel'])
    if kind=='fruit':
        for row,z in enumerate((-.45,.05),1):
            crate=box(f'{building}:fruit-crate-{row}',(0,1.14,z),(1.85,.34,.52),mat['weathered-plank'],.04)
            crate.rotation_euler[2]=(-.12 if row==1 else .16)
            for j in range(6):
                x=-.72+j*.29; color=mat['fruit-red'] if (j+row)%2 else mat['fruit-yellow']
                sphere(f'{building}:produce-{row}-{j+1}',(x,1.40,z),(.115,.11,.12),color,8,5)
    elif kind=='tools':
        for x in (-.60,-.2,.2,.6):
            beam(f'{building}:tool-shaft-{x}',(x,1.22,-.48),(x+.10,1.58,-.48),.045,mat['iron-dark'])
            beam(f'{building}:tool-cross-head-{x}',(x-.12,1.52,-.48),(x+.22,1.52,-.48),.055,mat['rusted-steel'])
        for x in (-.65,.15,.72):
            box(f'{building}:small-tool-box-{x}',(x,1.29,.18),(.42,.18,.38),mat['rusted-steel'],.035)
    else:
        for i in range(4):
            x=-.72+(i%2)*1.44
            y=.46+(i//2)*.52
            bpy.ops.mesh.primitive_torus_add(major_radius=.38,minor_radius=.12,major_segments=16,minor_segments=6,
                                               location=town.game_vector((x,y,.12)))
            obj=bpy.context.object;obj.name=f'{building}:stacked-tyre-{i+1}';obj.rotation_euler[0]=math.pi/2;obj.data.materials.append(mat['rubber']);keep(obj)
    sign(building,(0,1.88,-1.16),'FRUIT' if kind=='fruit' else 'TOOLS' if kind=='tools' else 'TYRES',1.15)

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

# Bus canteen: bent sheet-metal shell with rounded front and wheel arches.
add_building('canteen',(8,0,12))
# Four mounted wheels establish the real bus stance; keep their mesh light
# enough for the two-by-one town plot budget.
# A continuous curved roofline and rounded bonnet make this read as a bus body.
xs=(-3.25,-2.85,-1.95,1.95,2.85,3.25)
roofline=((1.35,1.60),(2.25,2.42),(2.65,2.78),(2.65,2.78),(2.25,2.42),(1.35,1.60))
for zi,z in enumerate((-1.50,1.50)):
    verts=[]
    for x,(low,high) in zip(xs,roofline):
        verts.extend(((x,low,z),(x,high,z)))
    faces=[]
    for i in range(len(xs)-1): faces.append((i*2,i*2+1,i*2+3,i*2+2))
    panel=mesh_object(f'canteen:curved-bus-side-{zi+1}',verts,faces,mat['rusted-steel'])
    for i,x in enumerate(xs): beam(f'canteen:side-pillar-{zi+1}-{i+1}',(x,roofline[i][0],z),(x,roofline[i][1],z),.095,mat['rusted-steel'])
for z in (-1.50,1.50): beam(f'canteen:roof-rim-{z}',(-3.15,2.55,z),(3.15,2.55,z),.09,mat['galvanised-tin'])
# The bus has a real driver's end at -X: a broad split windscreen, destination
# board, lamps, grille and bumper. These marks make the salvaged vehicle read
# as a bus even when the diner counters are viewed from the road.
box('canteen:front-windscreen-left',(-3.285,2.08,-.48),(.045,.77,.78),mat['glass'],.045)
box('canteen:front-windscreen-right',(-3.285,2.08,.48),(.045,.77,.78),mat['glass'],.045)
beam('canteen:front-windscreen-divider',(-3.32,1.67,0),(-3.32,2.49,0),.06,mat['rusted-steel'])
box('canteen:destination-board',(-3.30,2.60,0),(.10,.22,.88),mat['weathered-plank'],.025)
box('canteen:front-grille',(-3.30,.98,0),(.06,.38,.66),mat['iron-dark'],.025)
for z in (-.98,.98):
    sphere(f'canteen:headlamp-{z}',(-3.34,1.15,z),(.10,.15,.16),mat['faded-hand-paint'],10,6)
    beam(f'canteen:front-bumper-arm-{z}',(-3.18,.53,z),(-3.50,.53,z),.10,mat['rusted-steel'])
for x in (-2.45,2.45):
    for z in (-1.48,1.48):
        bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=6,major_radius=.43,minor_radius=.15,
                                         location=town.game_vector((x,.58,z)))
        wheel=bpy.context.object;wheel.name=f'canteen:bus-wheel-{x}-{z}';wheel.data.materials.append(mat['rubber']);keep(wheel)
for i,x in enumerate((-2.35,-1.35,-.35,.65,1.65,2.48),1):
    box(f'canteen:dark-window-{i}',(x,2.02,-1.535),(.78,.86,.04),mat['glass'],.07)
    box(f'canteen:window-frame-{i}',(x,2.02,-1.565),(.84,.92,.035),mat['weathered-plank'],.05)
    box(f'canteen:far-side-window-{i}',(x,2.02,1.535),(.78,.86,.04),mat['glass'],.07)
    box(f'canteen:far-side-window-frame-{i}',(x,2.02,1.565),(.84,.92,.035),mat['weathered-plank'],.05)
box('canteen:serving-apron',(0,1.39,-1.57),(3.7,.20,.07),mat['faded-hand-paint'],.04)
box('canteen:serving-counter',(0,1.25,-1.95),(3.55,.13,.68),mat['weathered-plank'],.04)
tin_roof('canteen:roof-panels',0,2.67,0,6.2,3.05,.025)
for x in (-2.6,-1.3,0,1.3,2.6):
    beam(f'canteen:serving-awning-arm-{x}',(x,1.58,-1.55),(x,2.18,-2.10),.055,mat['rusted-steel'])
box('canteen:canvas-serving-awning',(0,2.16,-1.94),(5.6,.09,.82),mat['patched-canvas'],.06)
box('canteen:far-side-serving-apron',(0,1.39,1.57),(3.7,.20,.07),mat['faded-hand-paint'],.04)
box('canteen:far-side-serving-counter',(0,1.25,1.95),(3.55,.13,.68),mat['weathered-plank'],.04)
box('canteen:far-side-canvas-awning',(0,2.16,1.94),(5.6,.09,.82),mat['patched-canvas'],.06)
for x in (-1.2,1.2):
    for z in (-.7,.7): beam(f'canteen:diner-table-leg-{x}-{z}',(x,.12,z),(x,.74,z),.055,mat['rusted-steel'])
box('canteen:interior-dining-table',(0,.78,.52),(2.5,.14,.76),mat['weathered-plank'],.04)
for z in (-1.05,.85):
    box(f'canteen:bench-{z}',(0,.5,z),(2.45,.12,.38),mat['weathered-plank'],.04)
    for x in (-.82,.82): beam(f'canteen:stool-leg-{z}-{x}',(x,.10,z),(x,.44,z),.09,mat['rusted-steel'])
for x in (-1.8,1.8): beam(f'canteen:front-bumper-{x}',(x,.47,-1.57),(x,.47,-1.95),.085,mat['rusted-steel'])
sign('canteen',(0,2.42,-1.63),'CANTEEN',2.0)

# Market hall: photo-carved roof and frame, with a measured open bay.
add_building('market-hall',(-18,0,14))
MARKET_LENGTH = 19.0
MARKET_HEIGHT = 4.20                 # 136 px side-photo door = about 2 m
MARKET_WIDTH = 9.45                  # 1340 px gable span at the end-photo scale
MARKET_SIDE = {'start': 52, 'end': 1363, 'ground': 387}
MARKET_FRONT = {'centre': 800, 'ground': 720, 'top': 125}
MARKET_REAR = {'centre': 800, 'ground': 720, 'top': 125}

def market_keep(x, y, z):
    # Remove the empty central bay but retain the five measured steel-post rows
    # and the attached rear storage room. This leaves a visible open hall.
    bay = ((np.abs(x) < MARKET_WIDTH / 2 - .32) & (y > .04) & (y < 2.12) &
           (np.abs(z) < MARKET_LENGTH / 2 - .22))
    posts = np.zeros_like(bay, dtype=bool)
    for post_z in (-9.0, -4.7, -.15, 4.45, 9.0):
        posts |= np.abs(z - post_z) < .31
    storage = ((x > MARKET_WIDTH / 2 - 2.05) & (z > MARKET_LENGTH / 2 - 3.8) &
               (y < 3.25))
    return ~bay | posts | storage

market_table = {
    'photos': {'side': 'market-hall-side.jpg', 'front': 'market-hall-front.jpg',
               'rear': 'market-hall-rear.jpg', 'top': 'market-hall-top.jpg'},
    'length': MARKET_LENGTH, 'width': MARKET_WIDTH, 'height': MARKET_HEIGHT,
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
market_photos = market_table['_photos']
hall_world_front = -MARKET_LENGTH / 2
market_face_z = hall_world_front + 1.15
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

# Each stall body wears its own awning and timber-front crops from the full photo.
# Each goods panel is a separate child, placed between those crop pieces.
STALL_RECTS = ((145,292),(305,459),(473,628),(643,799),(815,962))
STALL_AWNING = (402, 455)
STALL_GOODS = (455, 566)
STALL_BASE = (566, 720)
for index, (px0, px1) in enumerate(STALL_RECTS, 1):
    stall_mesh = PhotoMesh()
    pictured_quad(stall_mesh, px0, STALL_AWNING[0], px1, STALL_AWNING[1],
                  market_face_z, 'photo')
    pictured_quad(stall_mesh, px0, STALL_BASE[0], px1, STALL_BASE[1],
                  market_face_z, 'photo')
    stall_obj = stall_mesh.finish(f'market-hall:stall-{index}',
                                  {'photo': stall_photo_material})
    stall_obj.parent = market_root
    export_objects.add(stall_obj)

    goods_mesh = PhotoMesh()
    pictured_quad(goods_mesh, px0, STALL_GOODS[0], px1, STALL_GOODS[1],
                  market_face_z - .015, 'photo')
    goods_obj = goods_mesh.finish(f'market-hall:goods-{index}',
                                  {'photo': stall_photo_material})
    goods_obj.parent = market_root
    export_objects.add(goods_obj)

    stall_x0 = (MARKET_FRONT['centre'] - px1) * market_end_scale
    stall_x1 = (MARKET_FRONT['centre'] - px0) * market_end_scale
    stall_width = stall_x1 - stall_x0
    stall_mid_x = (stall_x0 + stall_x1) / 2
    rear_z = market_face_z + .72
    for side, x in (('left', stall_x0 + .04), ('right', stall_x1 - .04)):
        beam(f'market-hall:stall-{index}-{side}-front-post',
             (x,.03,market_face_z+.08),(x,2.20,market_face_z+.08),.07,mat['rusted-steel'])
        beam(f'market-hall:stall-{index}-{side}-rear-post',
             (x,.03,rear_z),(x,2.20,rear_z),.07,mat['rusted-steel'])
        beam(f'market-hall:stall-{index}-{side}-awning-arm',
             (x,2.18,market_face_z+.08),(x,2.08,rear_z),.045,mat['rusted-steel'])
    box(f'market-hall:stall-{index}-counter',
        (stall_mid_x,1.037,market_face_z+.40),(stall_width,.10,.72),mat['weathered-plank'],.025)
    box(f'market-hall:stall-{index}-awning',
        (stall_mid_x,2.13,market_face_z+.40),(stall_width+.06,.08,.78),mat['patched-canvas'],.025)

# Normalize every picture coordinate layer before export: each mesh must be TEXCOORD_0 only.
for obj in export_objects:
    if obj.type == 'MESH' and obj.data.uv_layers:
        for layer in list(obj.data.uv_layers): layer.name = 'UVMap'
for material in bpy.data.materials:
    if material.use_nodes and material.node_tree.nodes.get('Principled BSDF'):
        bsdf=material.node_tree.nodes.get('Principled BSDF')
        if bsdf.inputs.get('Metallic'): bsdf.inputs['Metallic'].default_value=min(bsdf.inputs['Metallic'].default_value,.29)

# Keep full-resolution source photos on disk; embed compact game copies only.
for photo in (front,left,overhead,wall_photo):
    photo.image.scale(256,192)
    photo.image.pack()
for photo in (*market_photos.values(), stall_photo):
    ratio = photo.w / photo.h
    if ratio >= 1:
        size = (256, round(256 / ratio))
    else:
        size = (round(256 * ratio), 256)
    photo.image.scale(*size)
    photo.image.pack()

# Print and check every market piece in local game axes. The photo goods touch
# the counter top; all stall bodies and the hall shell meet the ground.
bpy.context.view_layer.update()
market_parts = [obj for obj in export_objects
                if obj.type == 'MESH' and obj.name.startswith('market-hall:')]
market_bounds = []
for obj in market_parts:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    xs = [point.x - market_root.location.x for point in corners]
    ys = [point.z - market_root.location.z for point in corners]
    zs = [-(point.y - market_root.location.y) for point in corners]
    bounds = {'piece': obj.name,
              'x': [round(min(xs),3),round(max(xs),3)],
              'y': [round(min(ys),3),round(max(ys),3)],
              'z': [round(min(zs),3),round(max(zs),3)]}
    print('market-hall piece bounds:', json.dumps(bounds, sort_keys=True))
    if min(xs) < -11.5 or max(xs) > 11.5 or min(zs) < -11.5 or max(zs) > 11.5:
        raise RuntimeError(f"{obj.name} lies outside its 3x3 footprint")
    if min(ys) < -.10:
        raise RuntimeError(f"{obj.name} falls below the ground")
    if obj.name == 'market-hall:body' or obj.name in {
            f'market-hall:stall-{index}' for index in range(1,6)}:
        if min(ys) > .05:
            raise RuntimeError(f"{obj.name} does not touch the ground")
    if obj.name.startswith('market-hall:goods-'):
        counter_top = 1.037 + .05
        if abs(min(ys) - counter_top) > .025:
            raise RuntimeError(f"{obj.name} does not touch its stall counter")
    market_bounds.append(bounds)

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
ground_data=bpy.data.meshes.new('market hall review ground mesh')
ground_data.from_pydata(((lo.x-30,lo.y-30,lo.z-.08),(hi.x+30,lo.y-30,lo.z-.08),
                         (hi.x+30,hi.y+30,lo.z-.08),(lo.x-30,hi.y+30,lo.z-.08)),[],[(0,1,2,3)])
ground_data.materials.append(ground_material)
review_ground=bpy.data.objects.new('market hall review ground',ground_data);scene.collection.objects.link(review_ground)
def render_match(name, camera_loc, up, ortho):
    camera_data=bpy.data.cameras.new(name);camera_data.type='ORTHO';camera_data.ortho_scale=ortho
    camera=bpy.data.objects.new(name,camera_data);scene.collection.objects.link(camera);camera.location=camera_loc
    direction=(target-camera_loc).normalized();right=direction.cross(up).normalized()
    true_up=right.cross(direction).normalized()
    camera.rotation_euler=Matrix((right,true_up,-direction)).transposed().to_quaternion().to_euler();scene.camera=camera
    scene.render.filepath=str(evidence/(name+'.png'));bpy.ops.render.render(write_still=True)
render_match('model-front',target+Vector((0,25,2)),Vector((0,0,1)),8.8)
render_match('model-side',target+Vector((-30,0,2)),Vector((0,0,1)),24)
render_match('model-rear',target+Vector((0,-25,2)),Vector((0,0,1)),13.5)
render_match('model-top',target+Vector((0,0,28)),Vector((0,1,0)),24)
render_match('market-three-left',target+Vector((-16,19,8)),Vector((0,0,1)),18)
render_match('market-three-right',target+Vector((16,19,8)),Vector((0,0,1)),18)
render_match('market-road',target+Vector((3,18,3)),Vector((0,0,1)),11)
render_match('market-mayor',target+Vector((0,38,22)),Vector((0,0,1)),20)
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'sheet':str(sheet),
                  'evidence':str(evidence),'market_pieces':market_bounds}))
