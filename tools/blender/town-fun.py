"""TOWN-ART-FUN: build the big wheel from its measured photo outlines."""
import argparse, json, math, sys
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--root',required=True); p.add_argument('--render-dir',default='.evidence/2026-11-07/TOWN-ART-FUN/round-7'); p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]); root=Path(a.root).resolve(); textures=root/'public/assets/models/wasteland/town/textures'; out=root/'public/assets/models/wasteland/town/fun.glb'; render=root/a.render_dir
if a.paths_only:
 print(json.dumps({'blend':[],'glb':[str(out)],'evidence':[str(render)],'summary':str(root/'docs/board/looks/town-art-fun/round-7.jpg')})); raise SystemExit(0)
import bpy, numpy as np
from mathutils import Vector
sys.path.insert(0,str(root/'tools/blender'))
from photo_model import Mesh, Photo, trace, slab
from photo_carve import carve_object
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True); render.mkdir(parents=True,exist_ok=True)
baseline=root/'.qa-dist/fun-before.glb'
if baseline.exists():
 bpy.ops.import_scene.gltf(filepath=str(baseline))
 for existing in list(bpy.context.scene.objects):
  if existing.name=='big-wheel' or existing.name.startswith('big-wheel:'): bpy.data.objects.remove(existing,do_unlink=True)
family=bpy.data.objects.new('town-fun',None); bpy.context.collection.objects.link(family)
building=bpy.data.objects.new('big-wheel',None); bpy.context.collection.objects.link(building); building.parent=family
photo=Photo(textures/'big-wheel-side.jpg',frame=(256,171))
# Pixel measures normalized from the 1024 x 683 source: rim radius 77 px, centre (128,86).
SCALE=8.0/154.5; CX,CY=128,85.5; R=77.25; CENTER_Y=5.25
rgb=photo.rgb(); mask=(rgb.mean(axis=2)<133)
loops=trace(mask,(44,0,212,171),tolerance=1.0,min_area=30)
if not loops: raise RuntimeError('big wheel trace found no steel; inspect source mask')
def wheel_world(px,py,depth): return (depth,(px-CX)*SCALE, (CY-py)*SCALE)
wheel=bpy.data.objects.new('big-wheel:wheel',None); bpy.context.collection.objects.link(wheel); wheel.parent=building; wheel.location=(0,CENTER_Y,0)
for side,depth in enumerate((-.5,.5)):
 mesh=Mesh(); slab(mesh,'side',photo,loops,wheel_world,depth-.045,depth+.045)
 obj=mesh.finish(f'big-wheel:wheel-rim-{side+1}',{'side':photo.material()}); obj.parent=wheel; obj.location=(0,0,0)
# Truck axle ties the paired traced wheel faces at their true hub.
bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.28,depth=1.0,location=(0,CENTER_Y,0))
hub=bpy.context.object; hub.name='big-wheel:hub-axle'; hub.rotation_euler[1]=math.pi/2; hub.data.materials.append(town.make_materials()['rusted-steel']); hub.parent=building

# Seats are carved as a separate photo-built part, then hung at eight rim pivots.
seat=carve_object('big-wheel:seat-source',textures,{'photos':{'side':'big-wheel-seat-side.jpg','front':'big-wheel-seat-front.jpg','rear':'big-wheel-seat-rear.jpg','top':'big-wheel-seat-top.jpg'},'length':.72,'width':.62,'height':.92,'side':{'start':70,'end':950,'ground':900},'front':{'centre':341,'ground':980,'top':90},'rear':{'centre':341,'ground':980,'top':90},'top':{'front':60,'rear':980,'centre':341},'voxel':.04,'target':420,'grey':26,'tolerance':35,'mask_dir':str(render/'masks')})
seat.hide_render=True; seat.parent=building
for i in range(8):
 angle=2*math.pi*i/8; z=math.cos(angle)*R*SCALE; y=CENTER_Y+math.sin(angle)*R*SCALE
 chair=seat.copy(); chair.data=seat.data; bpy.context.collection.objects.link(chair); chair.name=f'big-wheel:seat-{i+1}'; chair.hide_render=False; chair.parent=wheel
 chair.location=(0,y-.52-CENTER_Y,z); chair.rotation_euler[0]=-angle

# Trace the two A-frame outlines from the existing single-object wheel reference;
# the wheel outline itself is kept out of these narrow measured leg crops.
ref=Photo(textures/'big-wheel.jpg',frame=(256,280)); rr=ref.rgb(); legmask=(rr.mean(axis=2)<130)
# Keep only the two lower A-frame struts, read from the reference's pixel silhouette.
yy,xx=np.indices(legmask.shape)
left_centre=114-(yy-134)*.18; right_centre=143+(yy-134)*.24
legmask &= (yy>=134)&(yy<=258)&((((xx-left_centre)**2)<8**2)|(((xx-right_centre)**2)<9**2))
legloops=trace(legmask,(75,130,195,260),tolerance=1.4,min_area=20)
def leg_world(px,py,d):
 # reference spans the 8m wheel, with ground row 829 and centre x 421.
 return (d,(258-py)*SCALE,(128-px)*SCALE)
legs=Mesh(); slab(legs,'side',ref,legloops,leg_world,-.38,.38)
legmat=ref.material(); legobj=legs.finish('big-wheel:a-frame',{'side':legmat}); legobj.parent=building

for obj in [wheel,hub,legobj,*[o for o in bpy.context.scene.objects if o.name.startswith('big-wheel:seat-')]]:
 if obj.type=='MESH':
  obj.parent=building if obj==legobj or obj==hub else wheel
 obj.location.z += 0

bpy.data.objects.remove(seat,do_unlink=True)

for im in bpy.data.images:
 if im.source=='FILE' and im.size[0]>128:
  im.scale(128,max(1,round(im.size[1]*128/im.size[0])))
town.export_glb(out)
# Read back and print world bounds for every exported mesh piece.
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(out))
for obj in bpy.context.scene.objects:
 if obj.type!='MESH' or not obj.name.startswith('big-wheel'): continue
 pts=[obj.matrix_world@Vector(c) for c in obj.bound_box]; bounds={'min':[round(min(v[i] for v in pts),3) for i in range(3)],'max':[round(max(v[i] for v in pts),3) for i in range(3)]}
 print('BOUNDS',obj.name,json.dumps(bounds))
 if bounds['min'][0]<-11.5 or bounds['max'][0]>11.5 or bounds['min'][2]<-11.5 or bounds['max'][2]>11.5: raise RuntimeError(f'{obj.name} leaves 3x3 footprint')
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size}))
