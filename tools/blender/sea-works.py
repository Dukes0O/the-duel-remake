"""WW-ART-SEA first pieces. Photo measured parts, metres, X right, Y up."""
import argparse, math, sys
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--root',required=True)
parser.add_argument('--render-dir',default='.qa-dist/ww-art-sea')
parser.add_argument('--through',choices=['old-gear','gear-whole','harbour-wall','causeway'],default='causeway')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
root=Path(args.root).resolve(); textures=root/'public/assets/models/wasteland/scablands/textures'
glb=root/'public/assets/models/wasteland/scablands/sea-works.glb'
import bpy, numpy as np
sys.path.insert(0,str(root/'tools/blender'))
from photo_model import Mesh,Photo,slab,trace,tidy,lathe,box
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; parent=bpy.data.objects.new('sea-works',None); scene.collection.objects.link(parent)
triangles={}
def finish(mesh,name,mats):
 o=mesh.finish(name,mats);o.parent=parent;o['part']=name;triangles[name]=mesh.triangles();return o
def photo(file): return Photo(textures/file)
def build_gear():
 p=photo('sea-old-gear.jpg'); m=Mesh(); solid=tidy(~p.sky([(5,5),(990,5),(5,990),(300,245),(700,245),(300,775),(700,775)],grey=20))
 loops=trace(solid,(40,20,990,1000),tolerance=1)
 def pos(x,y,d): return ((x-512)*7/930,(512-y)*7/930,d)
 slab(m,'gear-face',p,loops,pos,-.23,.23,wall_scale=.03)
 # Photo-matched thick rim: dark edge rectangle rather than stretched face UVs.
 edge=photo('sea-old-gear-rim.jpg');
 # Hub is a true turned part with a compact image arc.
 stations=[(0.02,.82),(.1,.78),(.34,.62),(.48,.55)]
 lathe(m,'hub',(0,0,0),(0,0,1),(1,0,0),(0,1,0),stations,
       lambda i,d,r,a: edge.uv(512+math.cos(a)*r*350,512+math.sin(a)*r*350),sides=24)
 p.bleed(solid);finish(m,'old-gear',{'gear-face':p.material(),'hub':edge.material()})
def build_new_gear():
 p=photo('sea-gear-section.jpg'); m=Mesh(); solid=tidy(~p.sky([(5,5)],grey=20)); loops=trace(solid,(20,20,1000,1000),tolerance=1)
 def pos(x,y,d): return ((x-512)*7/930,(512-y)*7/930,d)
 slab(m,'casting',p,loops,pos,-.18,.18,wall_scale=.025)
 finish(m,'gear-section',{'casting':p.material()})
 # Whole is 24 linked duplicates of the same sector mesh around its centre.
 base=m.finish('section-instance',{'casting':p.material()}); base.parent=parent
 for i in range(24):
  ob=base if i==0 else base.copy(); ob.data=base.data; ob.name=f'gear-whole-section-{i+1:02d}';scene.collection.objects.link(ob);ob.parent=parent;ob.rotation_euler[2]=i*math.tau/24
 hubm=Mesh(); lathe(hubm,'hub',(0,0,0),(0,0,1),(1,0,0),(0,1,0),[(.05,.9),(.18,.76),(.44,.48)],lambda i,d,r,a:p.uv(512+math.cos(a)*r*250,512+math.sin(a)*r*250),sides=24);finish(hubm,'gear-whole-hub',{'hub':p.material()})
 triangles['gear-whole']=triangles.pop('gear-section')*24+triangles['gear-whole-hub']
def build_wall():
 p=photo('sea-harbour-wall.jpg'); m=Mesh(); H=6; L=40
 box(m,-L/2,L/2,0,H,-1.5,1.5,{'+z':('wall',p,(0,0,p.width,p.height)),'-z':('wall',p,(0,0,p.width,p.height)), '+y':('wall',p,(0,0,p.width,80)),'-y':('wall',p,(0,0,p.width,80)), '+x':('wall',p,(0,0,40,120)), '-x':('wall',p,(0,0,40,120))})
 finish(m,'harbour-wall',{'wall':p.material()})
 rings=Mesh()
 for x in [-16,-8,0,8,16]:
  lathe(rings,'ring',(x,4.2,1.57),(0,1,0),(1,0,0),(0,0,1),[(.12,.06),(.22,.055),(.28,.045)],lambda i,d,r,a:p.uv(60,80),sides=12)
 finish(rings,'harbour-rings',{'wall':p.material()})
def build_causeway():
 p=photo('sea-causeway.jpg'); m=Mesh(); L=40
 # trapezoid cross section extruded along length; long side carries the measured photo.
 verts=[(-4,0,-L/2),(4,0,-L/2),(4,0,L/2),(-4,0,L/2),(-4,4,-L/2),(4,4,-L/2),(4,4,L/2),(-4,4,L/2)]
 faces=[(0,1,5,4),(3,7,6,2),(4,5,6,7),(0,3,2,1)]
 for f in faces: m.face([verts[i] for i in f],[(0,0),(1,0),(1,1),(0,1)],'stone',(0,1,0))
 # sleepers/rails photo prop geometry, repeated at 0.65 m spacing.
 rail=photo('sea-rails.jpg')
 for z in np.arange(-19.5,20,.65):
  for x in [-.72,.72]:
   box(m,x-.055,x+.055,4.18,4.34,z-.13,z+.13,{'all':('rail',rail,(0,0,rail.width,rail.height))})
  for x in [-.72,.72]: box(m,x-.045,x+.045,4.36,4.55,-20,20,{'all':('rail',rail,(0,0,rail.width,rail.height))})
 finish(m,'causeway',{'stone':p.material(),'rail':rail.material()})
steps=[('old-gear',build_gear),('gear-whole',build_new_gear),('harbour-wall',build_wall),('causeway',build_causeway)]
for name,fn in steps:
 fn()
 if name==args.through: break
glb.parent.mkdir(parents=True,exist_ok=True); bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_apply=True)
print('SEA_WORKS_PART_TRIANGLES',triangles)
