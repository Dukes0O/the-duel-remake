"""WW-ART-SEA first pieces. Photo measured parts, metres, X right, Y up."""
import argparse, json, math, sys
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--root',required=True)
parser.add_argument('--render-dir',default='.qa-dist/ww-art-sea')
parser.add_argument('--through',choices=['old-gear','gear-whole','harbour-wall','causeway','harbour-gate','harbour-ramp','causeway-arch'],default='causeway-arch')
parser.add_argument('--paths-only',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
root=Path(args.root).resolve(); textures=root/'public/assets/models/wasteland/scablands/textures'
glb=root/'public/assets/models/wasteland/scablands/sea-works.glb'
blend=root/'art-build/sea-works/sea-works.blend'
if args.paths_only:
 print(json.dumps({'blend':[str(blend)],'glb':[str(glb)]}))
 raise SystemExit(0)
import bpy, numpy as np
sys.path.insert(0,str(root/'tools/blender'))
from photo_model import Mesh,Photo,slab,trace,tidy,lathe,box
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; parent=bpy.data.objects.new('sea-works',None); scene.collection.objects.link(parent)
triangles={}
scaled_photos=[]
def finish(mesh,name,mats):
 o=mesh.finish(name,mats);o.parent=parent;o['part']=name;triangles[name]=mesh.triangles();return o
def photo(file):
 p=Photo(textures/file)
 return p
def blend_repeat_edges(p):
 """Blend the first/last 2 m of a 40 m photo in memory for exact joins."""
 rgb=p.rgb().astype(np.float32); n=max(1,round(p.w*.05)); edge=(rgb[:,:n].copy()+rgb[:,-n:][:,::-1].copy())*.5
 for i in range(n):
  t=i/max(1,n-1); rgb[:,i]=rgb[:,i]*(1-t)+edge[:,i]*t; rgb[:,-1-i]=rgb[:,-1-i]*(1-t)+edge[:,i]*t
 rgba=np.concatenate((rgb/255,np.ones((p.h,p.w,1),dtype=np.float32)),axis=2)[::-1].copy()
 image=bpy.data.images.new('sea-repeat-edge-photo',width=p.w,height=p.h,alpha=False)
 image.pixels.foreach_set(rgba.ravel());image.pack();p.image=image;p._rgb=rgb.astype(np.int16);p._material=None
def build_gear():
 p=photo('sea-old-gear.jpg'); m=Mesh(); solid=tidy(~p.sky([(5,5),(990,5),(5,990),(300,245),(700,245),(300,775),(700,775),(195,512),(830,512)],grey=20))
 loops=trace(solid,(40,20,990,1000),tolerance=1)
 def pos(x,y,d): return ((x-512)*7/930,(512-y)*7/930,d)
 slab(m,'gear-face',p,loops,pos,-.23,.23,wall_scale=.03)
 # The hub is turned and wears the photo's own hub, so nothing shows through it.
 scale=930/7
 stations=[(0.02,.82),(.1,.78),(.34,.62),(.48,.55)]
 lathe(m,'gear-face',(0,0,0),(0,0,1),(1,0,0),(0,1,0),stations,
       lambda i,d,r,a:p.uv(512+math.cos(a)*r*scale,512-math.sin(a)*r*scale),sides=24,
       cap_end=('gear-face',lambda a,f:p.uv(512+math.cos(a)*f*.55*scale,512-math.sin(a)*f*.55*scale)))
 p.bleed(solid);finish(m,'old-gear',{'gear-face':p.material()})
def build_new_gear():
 p=photo('sea-gear-section.jpg'); m=Mesh(); solid=tidy(~p.sky([(5,5),(p.w-5,5),(5,p.h-5),(p.w-5,p.h-5)],grey=20))
 # The photo shows a broader casting. Keep a measured 15-degree arc from its
 # centre, so this traced slab is one of 24 sections around a 7 m wheel.
 cx,cy=p.w/2,p.h*2.50
 yy,xx=np.ogrid[:p.h,:p.w]
 angle=np.arctan2(cy-yy,xx-cx)
 delta=np.angle(np.exp(1j*(angle-math.pi/2)))
 radius=np.hypot(xx-cx,cy-yy)*.00277
 solid &= (np.abs(delta)<=math.pi/24)&(radius>=2.50)&(radius<=3.5)
 loops=trace(solid,(20,20,p.w-20,p.h-20),tolerance=1)
 def pos(x,y,d): return ((x-cx)*.00277,(cy-y)*.00277,d)
 slab(m,'casting',p,loops,pos,-.18,.18,wall_scale=.025)
 section=finish(m,'gear-section',{'casting':p.material()})
 # The whole wheel is 24 of the same slice, turned about its centre, sharing one mesh.
 for i in range(24):
  ob=bpy.data.objects.new(f'gear-whole-section-{i+1:02d}',section.data)
  scene.collection.objects.link(ob)
  ob.parent=parent;ob.rotation_euler=(0,i*math.tau/24,0)
 # Six spokes reach from the turned boss out to the rim's inner edge.
 hp=photo('sea-gear-hub.png'); hs=tidy(~hp.sky([(8,8),(hp.w-8,8),(8,hp.h-8),(hp.w-8,hp.h-8)],grey=24))
 hc=(hp.w/2,hp.h/2)
 rows,cols=np.nonzero(hs)
 reach=np.hypot(cols-hc[0],rows-hc[1]).max()
 scale=2.62/reach
 hloops=trace(hs,(20,20,hp.w-20,hp.h-20),tolerance=2,min_area=200)
 def hpos(x,y,d): return ((x-hc[0])*scale,(hc[1]-y)*scale,d)
 hm=Mesh(); slab(hm,'spoked-hub',hp,hloops,hpos,-.20,.20,wall_scale=scale)
 lathe(hm,'spoked-hub',(0,0,0),(0,0,1),(1,0,0),(0,1,0),[(.02,.72),(.10,.68),(.26,.48)],
       lambda i,d,r,a:hp.uv(hc[0]+math.cos(a)*r/scale,hc[1]-math.sin(a)*r/scale),sides=24,
       cap_end=('spoked-hub',lambda a,f:hp.uv(hc[0]+math.cos(a)*f*.48/scale,hc[1]-math.sin(a)*f*.48/scale)))
 hp.bleed(hs)
 hp.image.scale(640,round(hp.image.size[1]*640/hp.image.size[0]));hp.image.pack()
 finish(hm,'gear-whole-hub',{'spoked-hub':hp.material()})
 triangles['gear-whole']=triangles['gear-section']*24+triangles['gear-whole-hub']
def build_wall():
 p=photo('sea-harbour-wall.jpg'); blend_repeat_edges(p); stone=photo('dam-gatehouse-stone.jpg'); m=Mesh(); H=6; L=40
 front=(0,55,p.w,300)
 box(m,-L/2,L/2,0,H,-1.5,1.5,{'+z':('wall',p,front),'-z':('wall',p,front), '+y':('stone',stone,(0,0,stone.w*80,stone.h*6)),'-y':('stone',stone,(0,0,stone.w*80,stone.h*6)), '+x':('wall',p,(0,55,80,300)), '-x':('wall',p,(0,55,80,300))})
 finish(m,'harbour-wall',{'wall':p.material(),'stone':stone.material()})
 coping=Mesh(); box(coping,-20.1,20.1,5.55,6.0,-1.6,1.6,{k:('stone',stone,(0,0,stone.w*80,stone.h*6)) for k in ['+x','-x','+y','-y','+z','-z']}); finish(coping,'harbour-coping',{'stone':stone.material()})
 rings=Mesh()
 for x in [-16,-9.6,-3.2,3.2,9.6,16]:
  lathe(rings,'ring',(x,2.4,1.56),(0,1,0),(1,0,0),(0,0,1),[(0,.08),(.34,.08),(.48,.07)],lambda i,d,r,a:p.uv(80,170),sides=12)
  lathe(rings,'ring',(x,1.95,1.61),(0,0,1),(1,0,0),(0,1,0),[(0,.055),(.12,.07),(.34,.07),(.47,.06)],lambda i,d,r,a:p.uv(80,170),sides=16)
 finish(rings,'harbour-rings',{'ring':p.material()})
def build_causeway():
 p=photo('sea-causeway.jpg'); blend_repeat_edges(p); m=Mesh(); L=40
 # trapezoid cross section extruded along length; long side carries the measured photo.
 verts=[(-11,0,-L/2),(11,0,-L/2),(4,4,-L/2),(-4,4,-L/2),(-11,0,L/2),(11,0,L/2),(4,4,L/2),(-4,4,L/2)]
 bottom_uv=[p.uv(0,320),p.uv(p.w,320),p.uv(p.w,205),p.uv(0,205)]
 # Real long sloped stone faces, with the dead-on photo fitted to each full 40 m run.
 m.face([verts[i] for i in (1,5,6,2)],bottom_uv,'stone',(1,0,0))
 m.face([verts[i] for i in (4,0,3,7)],bottom_uv,'stone',(-1,0,0))
 m.face([verts[i] for i in (3,7,6,2)],bottom_uv,'stone',(0,1,0))
 m.face([verts[i] for i in (0,1,2,3)],bottom_uv,'stone',(0,0,-1))
 m.face([verts[i] for i in (5,4,7,6)],bottom_uv,'stone',(0,0,1))
 m.face([verts[i] for i in (0,4,5,1)],bottom_uv,'stone',(0,-1,0))
 # sleepers/rails photo prop geometry, repeated at 0.65 m spacing.
 rail=photo('sea-rails.jpg')
 for z in np.arange(-19.5,20,.65):
  # One measured sleeper patch, 0.25 m along the line and 1.8 m across.
  box(m,-.9,.9,4.18,4.34,z-.13,z+.13,{k:('rail',rail,(52,16,82,145)) for k in ['+x','-x','+y','-y','+z','-z']})
 for x in [-.87,.87]:
  # The rail head is a narrow strip from the photographed rail, not edge UVs.
  box(m,x-.07,x+.07,4.36,4.55,-20,20,{k:('rail',rail,(0,34,rail.w,52)) for k in ['+x','-x','+y','-y','+z','-z']})
 finish(m,'causeway',{'stone':p.material(),'rail':rail.material()})
def build_harbour_gate():
 wall=photo('sea-harbour-wall.jpg'); p=photo('sea-harbour-gate.jpg')
 gate_sky=p.sky([(5,5),(p.w-5,5),(5,p.h-5),(p.w-5,p.h-5)],tolerance=20,grey=20); p.bleed(~gate_sky); scaled_photos.append(p)
 H=6; depth=1.5
 m=Mesh()
 frame_mats={'wall':wall.material(),'gate':p.material()}
 for x0,x1,texture_rect,side in [(-4,-3.72,(118,127,152,701),(0,55,wall.w*.075,300)),(3.72,4,(875,127,910,701),(wall.w*.925,55,wall.w,300))]:
  box(m,x0,x1,0,5.55,-depth,depth,{'+z':('gate',p,texture_rect),'-z':('gate',p,texture_rect),'+x':('wall',wall,side),'-x':('wall',wall,side),'+y':('wall',wall,side),'-y':('wall',wall,side)})
 lintel_side=(wall.w*.4625,55,wall.w*.5375,300)
 box(m,-3.72,3.72,5.15,5.55,-depth,depth,{'+z':('gate',p,(152,95,875,127)),'-z':('gate',p,(152,95,875,127)), '+x':('wall',wall,lintel_side),'-x':('wall',wall,lintel_side),'+y':('wall',wall,lintel_side),'-y':('wall',wall,lintel_side)})
 finish(m,'harbour-gate-frame',frame_mats)
 cap=Mesh(); top_course=(0,8,wall.w,46)
 box(cap,-4.1,4.1,5.55,H,-1.6,1.6,{k:('stone',wall,top_course) for k in ['+x','-x','+y','-y','+z','-z']})
 finish(cap,'harbour-gate-coping',{'stone':wall.material()})
 # Each slab's local origin is its real outer hinge; its photo crop ends at the meeting stile.
 crops=[('harbour-gate-left',(152,127,510,701),-3.72,1),('harbour-gate-right',(514,127,875,701),3.72,-1)]
 for name,(x0,y0,x1,y1),pivot,direction in crops:
  leaf=Mesh(); width=3.72; height=5.25
  if direction>0:
   def pos(x,y,d): return ((x-x0)*width/(x1-x0),(y1-y)*height/(y1-y0),d)
  else:
   def pos(x,y,d): return ((x-x1)*width/(x1-x0),(y1-y)*height/(y1-y0),d)
  slab(leaf,'steel',p,[[(x0,y0),(x1,y0),(x1,y1),(x0,y1)]],pos,-.10,.10,wall_scale=.006)
  # Three short barrel hinges are modelled at the pivot edge, not painted onto the leaf.
  for y in (.45,2.55,4.65):
   lathe(leaf,'steel',(0,y,.01),(0,1,0),(1,0,0),(0,0,1),[(0,.11),(.34,.11)],lambda i,d,r,a:p.uv(x0 if direction>0 else x1,y0),sides=12)
  ob=finish(leaf,name,{'steel':p.material()}); ob.location.x=pivot
def build_harbour_ramp():
 wall=photo('sea-harbour-wall.jpg'); stone=photo('dam-gatehouse-stone.jpg'); p=photo('sea-harbour-ramp.jpg')
 ramp_sky=p.sky([(5,5),(p.w-5,5),(5,p.h-5),(p.w-5,p.h-5)],tolerance=20,grey=20); p.bleed(~ramp_sky); scaled_photos.append(p)
 depth=1.5; face=(0,55,wall.w,300); stone_face=(0,0,stone.w,stone.h)
 m=Mesh()
 for x0,x1,front in [(-10,-4,(0,55,wall.w*.15,300)),(4,10,(wall.w*.85,55,wall.w,300))]:
  box(m,x0,x1,0,5.55,-depth,depth,{'+z':('wall',wall,front),'-z':('wall',wall,front),'+x':('wall',wall,front),'-x':('wall',wall,front),'+y':('wall',wall,front),'-y':('wall',wall,front)})
 lintel=(wall.w*.4,55,wall.w*.6,300)
 box(m,-4,4,5.15,5.55,-depth,depth,{k:('wall',wall,lintel) for k in ['+x','-x','+y','-y','+z','-z']})
 finish(m,'harbour-ramp-frame',{'wall':wall.material()})
 cap=Mesh(); top_course=(0,8,wall.w,46)
 box(cap,-10.1,10.1,5.55,6,-1.6,1.6,{k:('stone',wall,top_course) for k in ['+x','-x','+y','-y','+z','-z']})
 finish(cap,'harbour-ramp-coping',{'stone':wall.material()})
 # A solid eight-metre slipway falls 1.8 m toward the seaward (+Z) side.
 deck=Mesh(); x0,x1=-4,4; z0,z1=-8,8; y0,y1=.2,-1.6; thick=.24
 corners=[(x0,y0,z0),(x1,y0,z0),(x1,y1,z1),(x0,y1,z1)]
 uvs=[p.uv(410,258),p.uv(620,258),p.uv(730,520),p.uv(275,520)]
 deck.face(corners,uvs,'ramp',(0,1,0))
 underside=[(x0,y0-thick,z0),(x1,y0-thick,z0),(x1,y1-thick,z1),(x0,y1-thick,z1)]
 deck.face(underside,uvs,'wall',(0,-1,0))
 for a,b,c,d in [(corners[0],corners[3],underside[3],underside[0]),(corners[1],corners[2],underside[2],underside[1]),(corners[0],corners[1],underside[1],underside[0]),(corners[3],corners[2],underside[2],underside[3])]:
  deck.face([a,b,c,d],[wall.uv(0,205),wall.uv(wall.w,205),wall.uv(wall.w,300),wall.uv(0,300)],'wall',(0,0,1))
 finish(deck,'harbour-ramp',{'ramp':p.material(),'wall':wall.material()})
 # Short stone reveals line the passage, following the descending road surface.
 linings=Mesh()
 for x in (-4,4):
  band=(0 if x<0 else wall.w*.85,55,wall.w*.15 if x<0 else wall.w,270)
  linings.face([(x,0,-1.5),(x,5.15,-1.5),(x,5.15,1.5),(x,-.2,1.5)],
               [wall.uv(band[0],band[3]),wall.uv(band[0],band[1]),wall.uv(band[2],band[1]),wall.uv(band[2],band[3])],'stone',(1 if x<0 else -1,0,0))
 finish(linings,'harbour-ramp-reveals',{'stone':wall.material()})
def build_causeway_arch():
 p=photo('sea-causeway-arch.jpg'); rail=photo('sea-rails.jpg'); dark=photo('dam-wet-silt.jpg')
 cx=512; half=175; crown=405; spring=470; floor=545; top=64
 yy,xx=np.ogrid[:p.h,:p.w]
 t=np.clip((yy-crown)/(spring-crown),0,1)
 radius=np.where(yy<crown,0,half*np.sqrt(np.maximum(0,1-(1-t)**2)))
 radius=np.where(yy>spring,half,radius)
 opening=(yy>=crown)&(yy<=floor)&(np.abs(xx-cx)<=radius)
 solid=~p.sky([(8,8),(p.w-8,8),(8,p.h-8),(p.w-8,p.h-8)],tolerance=20,grey=20)
 solid &= ~opening
 solid[floor:,:]=False
 def vertical(y):
  if y>=crown:return (floor-y)*1.6/(floor-crown)
  return 1.6+(crown-y)*4.4/(crown-top)
 xscale=4/(2*half)
 def pos(x,y,d): return (d,vertical(y),(x-cx)*xscale)
 loops=trace(solid,(24,top,p.w-24,floor),tolerance=1.4,min_area=80)
 p.bleed(solid)
 scaled_photos.append(p)
 arch=Mesh(); slab(arch,'stone',p,loops,pos,-1.5,1.5,wall_scale=.011)
 finish(arch,'causeway-arch',{'stone':p.material()})
 # A dark stone barrel follows the opening through the full wall thickness.
 inner=Mesh(); profile=[(-2,0),(-2,.48),(-1.86,.92),(-1.55,1.27),(-1.02,1.52),(0,1.6),(1.02,1.52),(1.55,1.27),(1.86,.92),(2,.48),(2,0)]
 for (z0,y0),(z1,y1) in zip(profile,profile[1:]):
  inner.face([(-1.5,y0,z0),(1.5,y0,z0),(1.5,y1,z1),(-1.5,y1,z1)],
             [dark.uv(20,20),dark.uv(dark.w-20,20),dark.uv(dark.w-20,dark.h-20),dark.uv(20,dark.h-20)],'inside',(0,0,1))
 finish(inner,'causeway-arch-inside',{'inside':dark.material()})
 track=Mesh(); rail_crop=(0,34,rail.w,52); sleeper_crop=(52,16,82,145)
 for x in np.arange(-3.8,4.0,.65):
  box(track,x-.12,x+.12,0,.12,-1.25,1.25,{k:('rail',rail,sleeper_crop) for k in ['+x','-x','+y','-y','+z','-z']})
 for z in (-.87,.87):
  box(track,-4,4,.12,.27,z-.07,z+.07,{k:('rail',rail,rail_crop) for k in ['+x','-x','+y','-y','+z','-z']})
 finish(track,'causeway-arch-rails',{'rail':rail.material()})
steps=[('old-gear',build_gear),('gear-whole',build_new_gear),('harbour-wall',build_wall),('causeway',build_causeway),('harbour-gate',build_harbour_gate),('harbour-ramp',build_harbour_ramp),('causeway-arch',build_causeway_arch)]
for name,fn in steps:
 fn()
 if name==args.through: break
for p in scaled_photos:
 width,height=p.image.size; factor=768/max(width,height)
 p.image.scale(round(width*factor),round(height*factor)); p.image.pack()
glb.parent.mkdir(parents=True,exist_ok=True); bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_apply=True)
print('SEA_WORKS_PART_TRIANGLES',triangles)

# Render from the exported file, in an empty scene.
from mathutils import Vector
render_dir=Path(args.render_dir); render_dir=render_dir if render_dir.is_absolute() else root/render_dir
render_dir.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
scene.world=bpy.data.worlds.new('flat overcast');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.82,.82,.82,1)
sun=bpy.data.objects.new('sun',bpy.data.lights.new('sun','SUN'));sun.data.energy=.6
sun.rotation_euler=(math.radians(50),0,math.radians(30));scene.collection.objects.link(sun)
camera=bpy.data.objects.new('camera',bpy.data.cameras.new('camera'));scene.collection.objects.link(camera);scene.camera=camera
meshes=[o for o in scene.objects if o.type=='MESH']
# Two more lengths of the wall and causeway, end to end, for the shots only.
extras=[]
for prefix,axis in (('harbour',0),('causeway',1)):
 selected=[o for o in meshes if (o.name in ('harbour-wall','harbour-coping','harbour-rings') if prefix=='harbour' else o.name=='causeway')]
 steps=(-30,30) if prefix=='harbour' and any(o.name.startswith('harbour-ramp-frame') for o in meshes) else ((-24,24) if prefix=='harbour' else (-40,40))
 for o in selected:
  for step in steps:
   c=o.copy();c.location[axis]+=step;scene.collection.objects.link(c);c.name=o.name+'-extra';extras.append(c)
if any(o.name.startswith('causeway-arch') for o in meshes):
 for o in [o for o in meshes if o.name in ('harbour-wall','harbour-coping','harbour-rings')]:
  for step in (-25,25):
   c=o.copy();c.rotation_mode='XYZ';c.rotation_euler[2]=math.pi/2;c.location.y-=step
   scene.collection.objects.link(c);c.name=o.name+'-arch-extra';extras.append(c)
meshes=[o for o in scene.objects if o.type=='MESH']
def shot(name,prefixes,eye,target,size,ortho=None,lens=35):
 for o in meshes:o.hide_render=not any(o.name.startswith(p) for p in prefixes)
 scene.render.resolution_x,scene.render.resolution_y=size
 e=Vector((eye[0],-eye[2],eye[1]));t=Vector((target[0],-target[2],target[1]))
 camera.location=e;camera.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
 camera.data.type='ORTHO' if ortho else 'PERSP'
 if ortho:camera.data.ortho_scale=ortho
 else:camera.data.lens=lens
 scene.render.filepath=str(render_dir/f'{name}.png');bpy.ops.render.render(write_still=True)
shot('old-gear',['old-gear'],(0,0,20),(0,0,0),(800,800),ortho=7.6)
shot('old-gear-quarter',['old-gear'],(7,.5,9),(0,0,0),(800,800),lens=35)
shot('gear-section',['gear-section'],(0,3,10),(0,3,0),(800,800),ortho=1.6)
shot('gear-section-quarter',['gear-section'],(2.5,3.4,4.5),(0,3,0),(800,800),lens=35)
shot('gear-whole',['gear-whole'],(0,0,20),(0,0,0),(800,800),ortho=7.6)
shot('gear-whole-quarter',['gear-whole'],(7,.5,9),(0,0,0),(800,800),lens=35)
shot('harbour-wall',['harbour'],(0,3,60),(0,3,0),(1200,400),ortho=42)
shot('harbour-wall-quarter',['harbour'],(14,1.3,17),(0,3,-3),(1200,520),lens=28)
shot('causeway',['causeway'],(70,2.4,0),(0,2.4,0),(1000,420),ortho=26)
shot('causeway-quarter',['causeway'],(14,1.3,20),(0,3,-8),(1200,520),lens=28)
shot('causeway-top',['causeway'],(5,7,14),(0,4,-4),(1200,520),lens=35)
def gate_open(opened):
 for name,angle in (('harbour-gate-left',math.radians(-82)),('harbour-gate-right',math.radians(82))):
  ob=next((o for o in scene.objects if o.name.startswith(name)),None)
  if ob:
   ob.rotation_mode='XYZ'; ob.rotation_euler[2]=angle if opened else 0
 scene.view_layers.update()
shot('harbour-gate-shut',['harbour-gate'],(0,3,20),(0,3,0),(700,525),ortho=9)
gate_open(True);shot('harbour-gate-open',['harbour-gate'],(0,3,20),(0,3,0),(700,525),ortho=9);gate_open(False)
shot('harbour-gate-three-quarter',['harbour-gate','harbour-wall-extra'],(10,1.55,17),(0,2.6,0),(1200,700),lens=28)
shot('harbour-ramp-front',['harbour-ramp'],(0,1,20),(0,1,0),(700,394),ortho=22)
shot('harbour-ramp-three-quarter',['harbour-ramp','harbour-wall-extra'],(12,1.55,16),(0,.3,0),(1200,700),lens=28)
shot('causeway-arch-front',['causeway-arch'],(20,3,0),(0,3,0),(900,600),ortho=14.5)
shot('causeway-arch-three-quarter',['causeway-arch','harbour-wall-arch-extra'],(16,1.55,12),(0,1,0),(1200,700),lens=28)
