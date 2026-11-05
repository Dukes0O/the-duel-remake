"""Build the original, rusted Bowl show stadium and its first art review sheet."""
import argparse, json, math, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
glb = root / 'public/assets/models/wasteland/bowl/stadium.glb'
blend = root / 'art-build/bowl/stadium.blend'
evidence = Path(args.render) if args.render else root / '.evidence/2026-11-04/bowl-art-stadium/round-1'
if not evidence.is_absolute(): evidence = root / evidence
sheet = root / 'docs/board/looks/bowl-art-stadium/round-1.jpg'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)], 'glb':[str(glb)], 'evidence':[str(evidence)], 'summary':[str(sheet)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
glb.parent.mkdir(parents=True, exist_ok=True); blend.parent.mkdir(parents=True, exist_ok=True)
evidence.mkdir(parents=True, exist_ok=True); sheet.parent.mkdir(parents=True, exist_ok=True)

# Authored in game metres (X across, Y up, Z downfield); export converts Blender Z-up.
def v(p): return (p[0], -p[2], p[1])
def mat(name, color, rough=.92, metallic=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metallic
    return m
concrete=mat('Bowl concrete - patched ash',(.29,.28,.25)); dirt=mat('Packed arena dirt',(.19,.12,.07))
steel=mat('Welded dark steel',(.105,.105,.095),.82,.62); rust=mat('Orange rust under chipped paint',(.31,.12,.045),.9,.24)
paint=mat('Faded oxide red paint',(.29,.12,.075),.9,.18); soot=mat('Soot black',(.035,.032,.028),.98)
amber=mat('Dirty amber lamps',(.8,.31,.045),.45,.12); flame=mat('Flame core',(.95,.22,.025),.45)
crowds=[mat('Crowd worn cloth %d'%i,c) for i,c in enumerate([(.19,.18,.15),(.27,.105,.055),(.10,.13,.13),(.35,.25,.14),(.22,.20,.18)])]
root_obj=bpy.data.objects.new('bowl-stadium',None); bpy.context.collection.objects.link(root_obj)
groups={}
def mesh_group(name, material):
    mesh=bpy.data.meshes.new(name); obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.parent=root_obj; obj.data.materials.append(material); groups[name]=[obj,[],[]]; return groups[name]
def box(name, material, center, size, rotation=0):
    group=groups.get(name) or mesh_group(name,material); obj,verts,faces=group
    cx,cy,cz=center; sx,sy,sz=[s/2 for s in size]; co=math.cos(rotation); si=math.sin(rotation); base=len(verts)
    for iz in (-1,1):
      for iy in (-1,1):
       for ix in (-1,1):
        x=ix*sx; z=iz*sz; verts.append(v((cx+x*co+z*si,cy+iy*sy,cz-x*si+z*co)))
    faces.extend([tuple(base+i for i in f) for f in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]])
def beam(name, material, a,b,width,depth=None):
    mid=tuple((x+y)/2 for x,y in zip(a,b)); d=Vector((b[0]-a[0],b[2]-a[2])); length=d.length
    box(name,material,mid,(width,depth or width,length),math.atan2(d.x,d.y))
def cylinder(name,material,center,radius,depth,sides=8):
    # A local mesh cylinder along game Y.
    group=groups.get(name) or mesh_group(name,material); obj,verts,faces=group; x,y,z=center; base=len(verts)
    for yy in (y-depth/2,y+depth/2):
      for k in range(sides):
       a=2*math.pi*k/sides; verts.append(v((x+radius*math.cos(a),yy,z+radius*math.sin(a))))
    faces.extend([tuple(base+i for i in (k,(k+1)%sides,sides+(k+1)%sides,sides+k)) for k in range(sides)])
    faces.extend([tuple(base+i for i in reversed(range(sides))),tuple(base+i for i in range(sides,2*sides))])
def finalize():
    for obj,verts,faces in groups.values():
      obj.data.from_pydata(verts,[],faces); obj.data.update()

# 94 m open-air arena: compacted dirt, a broken concrete retaining wall and four rising terraces.
box('bowl-dirt-floor',dirt,(0,0,0),(94,.55,74))
for side in (-1,1):
  x=side*37
  for row in range(14):
    y=2.1+row*1.05; z=side*(29+row*.69)
    box('bowl-concrete-terraces',concrete,(0,y,z),(76,.78,1.15))
    box('bowl-rusted-riser-joints',rust,(0,y-.42,z-side*.48),(76,.08,.09))
    # Sparse crowd figures in every row, with uneven gaps and five muted cloth materials.
    for col in range(76):
      if (col*7+row*11)%3==0: continue
      px=-36+col*.96+(.13 if row%2 else 0); pz=z-side*.3
      cloth=crowds[(row*3+col*7)%len(crowds)]
      cylinder('crowd-heads',cloth,(px,y+1.22,pz),.13, .24,6)
      box('crowd-coats',cloth,(px,y+.83,pz),(.29,.53,.22),((col%3)-1)*.1)
  # Sloped outer retaining bank, exposed welded railings and repair plates.
  for i in range(10):
    z=side*(19+i*2.65)
    beam('bowl-support-ribs',steel,(x,2.3,z),(x,19,z+side*2.65),.34)
    box('bowl-repair-plates',rust,(x,7+i*.85,z),(.12,1.6,1.9))
  for y in (16.1,17.0):
    beam('bowl-handrails',steel,(x,y,-37),(x,y,37),.16)

# Structural buttresses and scrap cladding break the concrete edge into heavy welded bays.
for i in range(21):
  z=-36+i*3.6
  for side in (-1,1):
    x=side*39
    box('bowl-rustwall-panels',paint,(x,4,z),(1.1,5.2,3.25),((i%3)-1)*.025)
    box('bowl-rustwall-buttresses',steel,(x-side*.6,6,z),(.48,8, .36))
    for y in (2.1,4.2,6.2):
      cylinder('bowl-rivet-heads',rust,(x+side*.58,y,z),.075,.035,6)

# Four welded ramp structures on the dirt, with ribbed steel faces, ramps and flame nozzles.
for idx,(x,z,angle) in enumerate([(-24,2,.15),(24,2,-.15),(-13,-21,-.12),(13,-21,.12)]):
  name='bowl-ramp-%d'%idx
  box(name+'-plate',steel,(x,.75,z),(8,1.1,10),angle)
  beam(name+'-left-rib',rust,(x-3.5,1.2,z-4),(x-1.5,4.2,z+4),.35)
  beam(name+'-right-rib',rust,(x+3.5,1.2,z-4),(x+1.5,4.2,z+4),.35)
  beam(name+'-crown',steel,(x-1.5,4.2,z+4),(x+1.5,4.2,z+4),.32)
  for rib in range(9): box(name+'-traction-ribs',rust,(x,1.3+rib*.27,z-3.6+rib*.82),(6.2,.13,.16),angle)
  # Paired flame jets in squat welded housings, a clear authored part for future wiring.
  for dx in (-2.2,2.2):
    box(name+'-flame-jet-housings',soot,(x+dx,.5,z-5.8),(1.15,.8,1.25))
    cylinder(name+'-flame-jet-nozzles',steel,(x+dx,1.0,z-5.8),.26,.46,10)
    cylinder(name+'-flame-jet-cores',flame,(x+dx,1.32,z-5.8),.18,.35,8)

# Floodlight towers with triangulated legs, service ladders, cross braces and clustered lamps.
for side,z in [(-1,-25),(-1,24),(1,-25),(1,24)]:
  x=side*42; label=f'bowl-floodlight-{side}-{z}'
  for dx in (-1.15,1.15): beam(label+'-legs',steel,(x+dx,0,z),(x+dx*.46,25,z),.28)
  for y in (3,8,13,18,23):
    beam(label+'-crossbars',rust,(x-1.05,y,z),(x+1.05,y,z),.2)
    beam(label+'-diagonals',steel,(x-1,y-2,z),(x+1,y,z),.13)
  beam(label+'-lamp-boom',steel,(x-2,25,z),(x+2,25,z),.33)
  for dx in (-1.5,-.5,.5,1.5): box(label+'-lamp-cans',amber,(x+dx,25,z-.35),(.4,.45,.6))
  beam(label+'-service-ladder',rust,(x+1.3,1,z),(x+1.3,22,z),.10)

# Oversized scoreboard frame above the end stand, supported by bolted scrap trusses.
for x in (-15,15):
  beam('bowl-scoreboard-supports',steel,(x,18,35),(x,31,35),.55)
  beam('bowl-scoreboard-diagonal-braces',rust,(x-4,20,35),(x,28,35),.32)
box('bowl-scoreboard-frame',steel,(0,28,35),(34,9,1.4))
box('bowl-scoreboard-dark-face',soot,(0,28,34.2),(32,7.2,.25))
for x in range(-14,15,2): box('bowl-scoreboard-rusted-ribs',rust,(x,28,34),(.11,7,.09))
for x in (-16,16): cylinder('bowl-scoreboard-bolts',rust,(x,31,34),.18,.12,8)

# Central podium: scarred concrete steps and a welded, unpainted top plate.
for i in range(3):
  box('bowl-podium-concrete',concrete,(0,.45+i*.42,-1),(5+i*2,.65,4+i*2))
box('bowl-podium-welded-cap',rust,(0,1.85,-1),(4.6,.18,3.6))
for x in (-1.8,1.8):
  cylinder('bowl-podium-posts',steel,(x,2.2,-1),.11,.68,8)
box('bowl-podium-rail',steel,(0,2.52,-1),(3.8,.15,.15))

finalize()
triangles=0
for obj,_,_ in groups.values(): obj.data.calc_loop_triangles(); triangles+=len(obj.data.loop_triangles)
assert 10000 < triangles <= 80000, f'{triangles} triangles exceeds the stadium target'
assert len(groups)<=80, f'{len(groups)} separate batches exceed the art draw budget'
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
root_obj.select_set(True)
for obj,_,_ in groups.values(): obj.select_set(True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

# Three clear views in the one authored round: overhead layout, low show-facing hero, and side structure.
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=1050; scene.render.resolution_y=700; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
world=bpy.data.worlds.new('Smoky night arena'); world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(.035,.038,.04,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35; scene.world=world
for name,location,power,size,color in [('Warm show flood',(-30,42,-28),8500,16,(1,.66,.4)),('Cold flood',(34,37,18),7200,13,(.48,.65,1)),('Rim',(0,25,-45),6000,11,(1,.32,.12))]:
  light=bpy.data.lights.new(name,'AREA'); light.energy=power; light.shape='DISK'; light.size=size; light.color=color
  ob=bpy.data.objects.new(name,light); bpy.context.collection.objects.link(ob); ob.location=v(location); ob.rotation_euler=(Vector(v((0,5,0)))-ob.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Bowl review camera'); cam=bpy.data.objects.new('Bowl review camera',camdata); bpy.context.collection.objects.link(cam); scene.camera=cam; camdata.sensor_fit='VERTICAL'; camdata.sensor_height=32
scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'; scene.view_settings.exposure=.8
views=[('overview',(86,88,-110),(0,8,0),58),('hero',(0,34,-69),(0,14,0),60),('structure',(82,27,8),(0,13,0),63)]
paths=[]
for name,position,target,fov in views:
  cam.location=v(position); cam.rotation_euler=(Vector(v(target))-cam.location).to_track_quat('-Z','Y').to_euler(); camdata.lens=32/(2*math.tan(math.radians(fov)/2))
  scene.render.filepath=str(evidence/f'{name}.png'); bpy.ops.render.render(write_still=True); paths.append(evidence/f'{name}.png')

# Compose labelled, equally sized Blender views into one review sheet; labels are deliberately factual.
tilew,tileh=480,320; sheet_img=bpy.data.images.new('Bowl art round 1 contact sheet',width=tilew*3,height=tileh+38,alpha=False)
canvas=np.zeros((tileh+38,tilew*3,4),dtype=np.float32); canvas[:,:,:3]=(.055,.06,.06); canvas[:,:,3]=1
glyph={'OVERVIEW':(12,),'HERO':(1,),'STRUCTURE':(2,)}
def write_label(text,x,y):
  # compact 3x5 bitmap font
  font={'A':['010','101','111','101','101'],'E':['111','100','110','100','111'],'H':['101','101','111','101','101'],'I':['111','010','010','010','111'],'O':['111','101','101','101','111'],'R':['110','101','110','101','101'],'S':['111','100','111','001','111'],'T':['111','010','010','010','010'],'U':['101','101','101','101','111'],'V':['101','101','101','101','010'],'W':['101','101','101','111','101']}
  for c in text:
    pat=font.get(c,['000']*5)
    for yy,row in enumerate(pat):
      for xx,pixel in enumerate(row):
       if pixel=='1': canvas[y+yy*2:y+(yy+1)*2,x+xx*2:x+(xx+1)*2,:3]=.9
    x+=8
for i,(name,path) in enumerate(zip(['OVERVIEW','HERO','STRUCTURE'],paths)):
  image=bpy.data.images.load(str(path),check_existing=False); w,h=image.size; px=np.empty(w*h*4,dtype=np.float32); image.pixels.foreach_get(px); data=px.reshape(h,w,4)[::-1]
  scale=min(tilew/w,tileh/h); nw,nh=round(w*scale),round(h*scale); sampled=data[(np.arange(nh)/scale).astype(int)[:,None],(np.arange(nw)/scale).astype(int)[None,:],:]
  ox=i*tilew+(tilew-nw)//2; oy=38+(tileh-nh)//2; canvas[oy:oy+nh,ox:ox+nw]=sampled; write_label(name,i*tilew+12,10); bpy.data.images.remove(image)
sheet_img.pixels.foreach_set(canvas.ravel()); sheet_img.filepath_raw=str(sheet); sheet_img.file_format='JPEG'; sheet_img.save(quality=83); bpy.data.images.remove(sheet_img)
print(json.dumps({'triangles':triangles,'draws':len(groups),'bytes':glb.stat().st_size,'sheetBytes':sheet.stat().st_size,'renders':[str(p) for p in paths]}))
