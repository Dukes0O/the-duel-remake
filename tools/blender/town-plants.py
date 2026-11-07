"""Round 1: a portable jaw crusher for the Wasteland town plant family.

Builds the exported candidate and review renders from that GLB. Coordinates
use town_base's metre API: +Y up, front -Z.
"""
import argparse, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
glb=root/'public/assets/models/wasteland/town/plants.glb'
evidence=Path(a.render);evidence=evidence if evidence.is_absolute() else root/evidence
blend=root/'art-build/town/plants.blend'
if a.paths_only:
 import json;print(json.dumps({'blend':[str(blend)],'glb':[str(glb)],'evidence':[str(evidence)] if a.render else []}));raise SystemExit(0)
import bpy
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
from photo_model import Photo, Mesh as PhotoMesh, trace, slab
from photo_carve import carve_object, save_mask

bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tex=root/'public/assets/models/wasteland/town/textures'
mats=town.make_materials({'rusted-steel':tex/'faded-yellow-steel.jpg','galvanised-tin':tex/'rusted-corrugated-tin.jpg',
 'faded-hand-paint':tex/'yellow-green-paint.jpg','sand':tex/'wet-brown-earth.jpg','iron-dark':tex/'tire-rubber.jpg'})
for material in mats.values():
 material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=min(.29,material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
steel=mats['rusted-steel'];paint=mats['faded-hand-paint'];tin=mats['galvanised-tin'];dark=mats['iron-dark'];sand=mats['sand']
rootobj=bpy.data.objects.new('town-plants',None);bpy.context.collection.objects.link(rootobj)
crusher=bpy.data.objects.new('crusher',None);bpy.context.collection.objects.link(crusher);crusher.parent=rootobj
parts=[]
def beam(name,a,b,width,mat=steel,parent=crusher):
 o=town.beam(name,a,b,width,mat);o.parent=parent;parts.append(o);return o
def pipe(name,points,radius,mat=dark,parent=crusher):
 before=set(bpy.context.scene.objects);town.pipe_run(name,points,radius,mat)
 for o in set(bpy.context.scene.objects)-before:o.parent=parent;parts.append(o)

# Main hopper, jaw housing, frame and engine casing are one measured photo carve.
# Table values come from the existing 100 px grids. Background trapped inside the
# hopper mouth and below the chassis is removed with explicit measured cuts.
body_table={
 'photos':{'side':'crusher-side.jpg','front':'crusher-front.jpg','rear':'crusher-rear.jpg','top':'crusher-overhead.jpg'},
 'length':7.4,'width':2.42,'height':3.10,
 'side':{'start':30,'end':970,'ground':474},
 'front':{'centre':512,'ground':735,'top':62},
 'rear':{'centre':512,'ground':755,'top':76},
 'top':{'front':105,'rear':963,'centre':260,'along':'x','x_scale':2.42/320},
 'cut':{
  # Belt and gravel are separate photo-derived pieces; omit them from the body.
  'side':[(448,110,1024,440),(145,277,308,314),(55,490,970,568)],
  # The jaw is separately carved and moves around its measured hinge.
  'front':[(340,350,684,548)],
  'rear':[],
  # Remove the belt and gravel silhouettes from the overhead projection.
  'top':[(610,80,1024,545)],
 },
 'grey':28,'tolerance':34,'bleed_tolerance':40,'voxel':.05,'target':8500,
 'mask_dir':str(evidence/'masks') if a.render else None,
}
body=carve_object('crusher:body',tex,body_table);body.parent=crusher;parts.append(body)
# Photo-carved jaw plate is a separate moving node. Its origin is the measured
# eccentric pivot, so the town can rock it without moving its bearings.
jaw=bpy.data.objects.new('crusher:jaw',None);bpy.context.collection.objects.link(jaw);jaw.parent=crusher
jaw_pivot=town.game_vector((0,1.77,-.55))
def outside_rect(width,height,rect):
 x0,y0,x1,y1=rect
 return [(0,0,width,y0),(0,y1,width,height),(0,y0,x0,y1),(x1,y0,width,y1)]
jaw_table={**body_table,'target':1200,'voxel':.035,'mask_dir':None,
 'cut':{
  # Keep the jaw roll and cheek in each view, measured from the same grids.
  'side':outside_rect(1024,568,(206,292,390,424)),
  'front':outside_rect(1024,860,(340,330,685,568)),
  # The rear view has no exposed jaw; retain its broad central machine silhouette.
  'rear':outside_rect(1024,896,(340,260,685,625)),
  'top':outside_rect(1024,544,(260,145,510,405)),
 }}
jaw_mesh=carve_object('crusher:jaw-surface',tex,jaw_table)
for vertex in jaw_mesh.data.vertices:
 vertex.co.x-=jaw_pivot[0];vertex.co.y-=jaw_pivot[1];vertex.co.z-=jaw_pivot[2]
jaw_mesh.parent=jaw;jaw.location=jaw_pivot
# The conveyor is traced from the side photograph. The flood mask leaves the
# truss openings empty; slab adds thickness without closing those openings.
belt_parent=bpy.data.objects.new('crusher:belt',None);bpy.context.collection.objects.link(belt_parent);belt_parent.parent=crusher
side_photo=Photo(tex/'crusher-side.jpg')
rgb=side_photo.rgb()
spread=rgb.max(axis=2)-rgb.min(axis=2)
dark_pixels=(rgb.mean(axis=2)<155)|((spread>24)&(rgb.mean(axis=2)<205))
truss_mask=np.zeros((side_photo.h,side_photo.w),dtype=bool)
yy,xx=np.ogrid[:side_photo.h,:side_photo.w]
def photo_stroke(a,b,width=8):
 ax,ay=a;bx,by=b;dx,dy=bx-ax,by-ay
 amount=np.clip(((xx-ax)*dx+(yy-ay)*dy)/(dx*dx+dy*dy),0,1)
 distance=np.sqrt((xx-(ax+amount*dx))**2+(yy-(ay+amount*dy))**2)
 truss_mask[:] |= (distance<=width/2)&dark_pixels
# Parallel belt rails and the measured open triangular lattice.
photo_stroke((448,324),(950,145),12);photo_stroke((448,414),(950,287),12)
photo_stroke((448,344),(950,180),9);photo_stroke((448,395),(950,262),9)
for px in range(468,930,58):
 t=(px-448)/(950-448)
 upper=324+(145-324)*t;lower=414+(287-414)*t
 photo_stroke((px,upper),(px+58,lower),8)
 photo_stroke((px,lower),(px+58,upper-20),8)
# Belt-end drums and side plates, still cut from their exact photo pixels.
photo_stroke((448,324),(448,414),10);photo_stroke((950,145),(950,287),10)
if a.render:save_mask(truss_mask,evidence/'belt-mask.png')
# Bleed the measured steel edges across every removed backdrop pixel. The slab's
# edge UVs cannot then pick up the photo studio as a pale stripe.
side_photo.bleed(truss_mask)
truss_loops=trace(truss_mask,(448,105,970,418),tolerance=2.0,min_area=16)
truss_mesh=PhotoMesh()
def side_world(px,py,depth):
 scale=7.4/(970-30)
 return (depth,(482-py)*scale,-3.7+(px-30)*scale)
slab(truss_mesh,'side',side_photo,truss_loops,side_world,-.68,.68,wall_scale=7.4/(970-30))
truss=truss_mesh.finish('crusher:belt:photo-traced-lattice',{'side':side_photo.material()})
truss.parent=belt_parent
# Two narrow belt lips and cross rollers follow the measured photo slope.
for x in (-.70,.70):
 beam('crusher-belt-edge',(x,.50,-.18),(x,2.72,3.52),.055,dark,belt_parent)
for i in range(8):
 t=i/7;z=-.1+t*3.48;y=.58+t*2.12
 pipe('crusher-belt-roller',[(-.63,y,z),(.63,y,z)],.035,dark,belt_parent)
# The trestle has feet on the ground, and two braces tie it back into the body.
for z,y in ((1.25,1.35),(2.95,2.38)):
 for x in (-.66,.66):
  beam('crusher-belt-support',(x,.04,z),(x,y,z+.20),.11,steel,belt_parent)
 beam('crusher-belt-cross-brace',(-.66,.20,z+.12),(.66,.20,z+.12),.075,dark,belt_parent)
beam('crusher-belt-body-tie',(-.58,.98,-.12),(-.58,1.33,.78),.09,steel,belt_parent)
beam('crusher-belt-body-tie',(.58,.98,-.12),(.58,1.33,.78),.09,steel,belt_parent)
# The side wheels are the visual signature of this older jaw mechanism.  Their
# crank hubs sit on the housing; the rims have real thickness and open spokes.
# Flywheels are retained in the carved side and end views so their axes agree.
# Body details are already in the carve; do not leave detached ladders or pipes.
# The discharge chute is an open frame beneath the belt head. The gravel cone
# wears only the measured pile crop from the overhead photograph.
for x in (-.48,.48):
 beam('crusher-discharge-chute-side',(x,.78,2.25),(x,.40,2.82),.10,steel)
beam('crusher-discharge-chute-lip',(-.48,.40,2.82),(.48,.40,2.82),.10,steel)
over_photo=Photo(tex/'crusher-overhead.jpg')
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.82,radius2=.035,depth=.62,location=town.game_vector((0,.34,3.32)))
gravel=bpy.context.object;gravel.name='crusher-gravel-cone';gravel.scale=(1.0,1.0,1.16);gravel.data.materials.append(over_photo.material())
uv_layer=gravel.data.uv_layers.active or gravel.data.uv_layers.new(name='Gravel crop UV')
for polygon in gravel.data.polygons:
 for loop_index in polygon.loop_indices:
  vert=gravel.data.vertices[gravel.data.loops[loop_index].vertex_index].co
  u=.88+(vert.x*.10);v=.59-(vert.y*.32)
  uv_layer.data[loop_index].uv=over_photo.uv(u*over_photo.w,v*over_photo.h)
gravel.parent=crusher;parts.append(gravel)
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)
if a.render:
 # Render views by importing the exported file into a fresh scene, as required.
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb))
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1000;scene.render.resolution_y=720;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.world=bpy.data.worlds.new('mid-grey studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.34,.34,.34,1)
 bpy.ops.mesh.primitive_plane_add(size=2000,location=town.game_vector((0,-.14,0)));floor=bpy.context.object;floor.name='review-only ground'
 ground=bpy.data.materials.new('Review ground');ground.diffuse_color=(.34,.34,.34,1);ground.use_nodes=True
 ground.node_tree.nodes.clear();ground_out=ground.node_tree.nodes.new('ShaderNodeOutputMaterial')
 ground_emission=ground.node_tree.nodes.new('ShaderNodeEmission');ground_emission.inputs['Color'].default_value=(.34,.34,.34,1)
 ground.node_tree.links.new(ground_emission.outputs['Emission'],ground_out.inputs['Surface']);floor.data.materials.append(ground)
 bpy.ops.object.light_add(type='AREA',location=town.game_vector((4,14,-5)));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=14
 def camera(name,location,target,lens=45):
  data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data);scene.collection.objects.link(cam);cam.location=town.game_vector(location);cam.rotation_euler=(town.game_vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;return cam
 for name,loc,target,lens in [('side-photo-match',(14,1.55,0),(0,1.55,0),52),('front-three-quarter',(8,5,-9),(0,1.55,0),40),('rear-three-quarter',(-8,5,9),(0,1.55,0),40),('mayor-view',(32,60,-42),(0,1.4,0),220)]:
  cam=camera(name,loc,target,lens);scene.camera=cam;scene.render.filepath=str(evidence/(name+'.png'));evidence.mkdir(parents=True,exist_ok=True);bpy.ops.render.render(write_still=True)
