"""Round 1: a portable jaw crusher for the Wasteland town plant family.

Builds the exported candidate and review renders from that GLB. Coordinates
use town_base's metre API: +Y up, front -Z.
"""
import argparse, hashlib, math, sys
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
from mathutils import Matrix, Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
from photo_model import Photo, Mesh as PhotoMesh, trace, slab, lathe, tidy
from photo_carve import carve_object, save_mask
from hull_model import tyre

bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tex=root/'public/assets/models/wasteland/town/textures'
mats=town.make_materials({'rusted-steel':tex/'faded-yellow-steel.jpg','galvanised-tin':tex/'rusted-corrugated-tin.jpg',
 'faded-hand-paint':tex/'yellow-green-paint.jpg','sand':tex/'wet-brown-earth.jpg','iron-dark':tex/'tire-rubber.jpg'})
for material in mats.values():
 material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=min(.29,material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
steel=mats['rusted-steel'];paint=mats['faded-hand-paint'];tin=mats['galvanised-tin'];dark=mats['iron-dark'];sand=mats['sand']
rootobj=bpy.data.objects.new('town-plants',None);bpy.context.collection.objects.link(rootobj)
crusher=bpy.data.objects.new('crusher',None);bpy.context.collection.objects.link(crusher);crusher.parent=rootobj
machine_yard=bpy.data.objects.new('machine-yard',None);bpy.context.collection.objects.link(machine_yard);machine_yard.parent=rootobj
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
 'side':{'start':30,'end':970,'ground':480},
 'side_front_on_left':True,
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
  # Exclude the overhead photo's view down the jaw throat: its ribbed roller
  # is already described by the side and end views, and otherwise extrudes
  # as a false plate above the open hopper.
  'top':[(250,185,330,335),(610,80,1024,545)],
 },
 # The hopper mouth is open. Remove the narrow false plate that the end/top
 # projections fused into its centre above the rim; the measured side and end
 # photos show clear space there.
 'keep':lambda x,y,z:~((np.abs(x)<.70)&(y>2.65)&(z>-2.65)&(z<-1.70)),
 'underside':(480-417)*(7.4/(970-30)),
 'grey':28,'tolerance':34,'bleed_tolerance':40,'voxel':.05,'target':6500,
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
# Rebuild the underbody from one measured side silhouette. The photo maps with
# its front on the left, so increasing photo X runs toward world -Z.
belt_parent=bpy.data.objects.new('crusher:belt',None);bpy.context.collection.objects.link(belt_parent);belt_parent.parent=crusher
side_photo=Photo(tex/'crusher-side.jpg')
rgb=side_photo.rgb()
spread=rgb.max(axis=2)-rgb.min(axis=2)
dark_pixels=(rgb.mean(axis=2)<165)|((spread>24)&(rgb.mean(axis=2)<208))
yy,xx=np.ogrid[:side_photo.h,:side_photo.w]
scale=7.4/(970-30);ground_px=480
def side_world(px,py,depth):
 return (depth,(ground_px-py)*scale,-3.7+(px-30)*scale)
# Dark pixels inside each photo rectangle preserve the lattice openings and
# capture each frame and its legs as a single trace from the same image.
belt_mask=dark_pixels.copy();belt_mask[:105,:]=False;belt_mask[420:,:]=False
belt_mask[:,:440]=False;belt_mask[:,976:]=False
upper=324-.356*(xx-448)-24;lower=414-.253*(xx-448)+24
between_rails=(yy>=upper)&(yy<=lower)
# The photo has one leg under the conveyor; the second box held the gravel fall and cone.
support_legs=((xx>=675)&(xx<=720)&(yy>=350)&(yy<=480))
belt_mask &= between_rails|support_legs
# The side reference has two hanging chain runs below the head pulley. They
# are not part of the conveyor frame or belt; gravel is rebuilt as separate
# stones below, so keep the trace clear of those chain pixels.
belt_mask &= ~((xx>=900)&(xx<=976)&(yy>=170)&(yy<=345))
belt_mask &= ~((xx>=780)&(yy>=300))   # the cone's top
belt_loops=trace(belt_mask,(438,100,980,422),tolerance=1.1,min_area=90)
belt_mesh=PhotoMesh()
slab(belt_mesh,'side',side_photo,belt_loops,side_world,-.35,-.27,wall_scale=scale)
frame=belt_mesh.finish('crusher:belt:side-frame',{'side':side_photo.material()});frame.parent=belt_parent
frame_far=frame.copy();frame_far.data=frame.data.copy();frame_far.name='crusher:belt:far-side-frame';bpy.context.collection.objects.link(frame_far);frame_far.parent=belt_parent;frame_far.location.x=.70
# One dark rubber plane follows the measured slope between the two open frames.
belt_pts=[side_world(448,329,d) for d in (-.31,.31)]+[side_world(950,157,d) for d in (-.31,.31)]+[side_world(950,174,d) for d in (-.31,.31)]+[side_world(448,346,d) for d in (-.31,.31)]
# side_world gives glTF axes (Y up); Blender's mesh data is Z up.
verts=[(x,-z,y) for x,y,z in belt_pts]
faces=[(0,2,4,6),(1,7,5,3),(0,1,3,2),(2,3,7,6),(6,7,5,4),(4,5,1,0)]
mesh=bpy.data.meshes.new('crusher rubber belt mesh');mesh.from_pydata(verts,[],faces);mesh.update()
uv_layer=mesh.uv_layers.new(name='UVMap')
for polygon in mesh.polygons:
 for loop_index in polygon.loop_indices:
  vertex=mesh.vertices[mesh.loops[loop_index].vertex_index].co
  uv_layer.data[loop_index].uv=((vertex.x+.31)/.62,(-vertex.y+3.7)/7.4)
rubber=bpy.data.objects.new('crusher:belt:rubber-surface',mesh);bpy.context.collection.objects.link(rubber);rubber.parent=belt_parent
rubber.data.materials.append(dark)
# The trailer is two traced copies of the same measured side frame. Four tyres
# use measured wheel centres; the axle and cross-members join the rails.
trailer_mask=dark_pixels.copy();trailer_mask[:364,:]=False;trailer_mask[447:,:]=False
trailer_mask[:,:30]=False;trailer_mask[:,610:]=False
for cx in (325,432): trailer_mask[(xx-cx)**2+(yy-437)**2 < 54**2]=False
trailer_loops=trace(trailer_mask,(22,360,620,450),tolerance=1.1,min_area=45)
trailer_mesh=PhotoMesh()
side_photo.bleed(belt_mask|trailer_mask)
slab(trailer_mesh,'side',side_photo,trailer_loops,side_world,-.52,-.44,wall_scale=scale)
rail=trailer_mesh.finish('crusher:trailer:near-frame',{'side':side_photo.material()});rail.parent=crusher
far=rail.copy();far.data=rail.data.copy();far.name='crusher:trailer:far-frame';bpy.context.collection.objects.link(far);far.parent=crusher;far.location.x=1.04
for px in (120,380,550):
 z=side_world(px,ground_px,0)[2]
 beam('crusher:trailer:cross-member',(-.48,.47,z),(.56,.47,z),.10,dark)
# The A-frame drawbar closes the open nose between both rails and meets the
# measured hitch point. The jack is fixed to the nose cross-member and reaches
# the ground; neither is a loose strip beside the trailer.
beam('crusher:trailer:drawbar-near',(-.48,.47,-3.00),(0,.47,-3.72),.09,dark)
beam('crusher:trailer:drawbar-far',(.56,.47,-3.00),(0,.47,-3.72),.09,dark)
beam('crusher:trailer:jack',(.04,.47,-2.82),(.04,.09,-2.82),.08,dark)
town.cube('crusher:trailer:jack-foot',(.04,.07,-2.82),(.28,.06,.22),dark,bevel=.01).parent=crusher
for cx in (325,432):
 axle_z=side_world(cx,ground_px,0)[2]
 beam('crusher:trailer:axle',(-.63,.29,axle_z),(.63,.29,axle_z),.09,dark)
front_photo=Photo(tex/'crusher-front.jpg')
wheel_side_photo=Photo(tex/'crusher-side.jpg')
for side,name in ((-.54,'near'),(.58,'far')):
 for cx,axle_name in ((325,'front-axle'),(432,'rear-axle')):
  wheel_mesh=PhotoMesh()
  tyre(wheel_mesh,'side',wheel_side_photo,cx,437,44,44*scale,.10,'tread',front_photo,512,48,603,720,sides=32)
  wheel=wheel_mesh.finish(f'crusher:trailer:{name}-tyre:{axle_name}',{'side':wheel_side_photo.material(),'tread':front_photo.material()})
  wheel.parent=crusher;wheel.location=town.game_vector((side,(ground_px-437)*scale,-3.7+(cx-30)*scale))
# The side wheels are the visual signature of this older jaw mechanism.  Their
# crank hubs sit on the housing; the rims have real thickness and open spokes.
# Flywheels are retained in the carved side and end views so their axes agree.
# Body details are already in the carve; do not leave detached ladders or pipes.
# The gravel cone wears only the measured pile crop from the overhead photograph.
over_photo=Photo(tex/'crusher-overhead.jpg')
over_rgb=over_photo.rgb();oy,ox=np.ogrid[:over_photo.h,:over_photo.w]
pile_mask=((ox-903)/112)**2+((oy-315)/126)**2<=1
over_photo.bleed(pile_mask)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.82,radius2=.035,depth=.62,location=town.game_vector((0,.31,side_world(950,ground_px,0)[2]-.55)))
gravel=bpy.context.object;gravel.name='crusher-gravel-cone';gravel.scale=(1.0,1.0,1.16);gravel.data.materials.append(over_photo.material())
uv_layer=gravel.data.uv_layers.active or gravel.data.uv_layers.new(name='Gravel crop UV')
for polygon in gravel.data.polygons:
 for loop_index in polygon.loop_indices:
  vert=gravel.data.vertices[gravel.data.loops[loop_index].vertex_index].co
  u=.92+(vert.x*.14);v=.62-(vert.y*.25)
  uv_layer.data[loop_index].uv=over_photo.uv(u*over_photo.w,v*over_photo.h)
gravel.parent=crusher;parts.append(gravel)
# A narrow falling stream follows the short arc from the head pulley to the
# cone. Separate low-poly stones replace the photo's flat chain silhouettes.
stone_materials=[]
for index,color in enumerate(((.24,.235,.215,1),(.31,.30,.275,1),(.37,.35,.31,1))):
 material=bpy.data.materials.new(f'crusher gravel stone {index+1}');material.diffuse_color=color;material.use_nodes=True
 bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=color;bsdf.inputs['Roughness'].default_value=.94
 stone_materials.append(material)
head=side_world(950,157,0)
cone_top=(0,.31+.62/2,side_world(950,ground_px,0)[2]-.55)
stone_count=38
for index in range(stone_count):
 t=(index+.5)/stone_count
 # A slight forward bend keeps the fall visibly curved while remaining narrow.
 x=.075*math.sin(t*math.pi)+.025*math.sin(index*2.17)
 y=head[1]+(cone_top[1]-head[1])*t
 z=head[2]+(cone_top[2]-head[2])*t+.12*math.sin(t*math.pi)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=town.game_vector((x,y,z)))
 stone=bpy.context.object;stone.name=f'crusher:gravel-fall:stone:{index+1:02d}'
 size=.045+(.018*((index*7)%5)/4)
 stone.scale=(size*1.25,size*.78,size)
 stone.rotation_euler=(index*.71,index*.43,index*.89)
 stone.data.materials.append(stone_materials[index%len(stone_materials)])
 stone.parent=crusher;parts.append(stone)

# Batch plant, built as a separate town building so its rounds and budgets do
# not change the crusher that already passed this card. Long-side pixel x maps
# to plant Z; the silo is turned from its measured side-photo outline. The four
# batch-plant reference JPGs were generated with OpenAI image generation on
# 7 November 2026; no third-party images, brands or marks are used.
plant=bpy.data.objects.new('batch-plant',None);bpy.context.collection.objects.link(plant);plant.parent=rootobj
plant_parts=[]
side_photo=Photo(tex/'batch-plant-side.jpg')
front_photo=Photo(tex/'batch-plant-front.jpg')
rear_photo=Photo(tex/'batch-plant-rear.jpg')
top_photo=Photo(tex/'batch-plant-top.jpg')
PLANT_START,PLANT_END,PLANT_GROUND=80,945,482
PLANT_LENGTH=23.0
PLANT_SCALE=PLANT_LENGTH/(PLANT_END-PLANT_START)
PLANT_Z0=-PLANT_LENGTH/2
def plant_z(px): return PLANT_Z0+(px-PLANT_START)*PLANT_SCALE
def plant_side_world(px,py,depth): return (depth,(PLANT_GROUND-py)*PLANT_SCALE,plant_z(px))

def attach_piece(obj,parent=plant):
 obj.parent=parent;plant_parts.append(obj);return obj

# The silo is a true lathe. Its ring stations and UVs follow the side photo's
# vertical profile; the open lower hopper reaches the measured traced legs.
silo=bpy.data.objects.new('batch-plant:silo',None);bpy.context.collection.objects.link(silo);silo.parent=plant
SILO_CX=0.0
SILO_CZ=plant_z(168)
silo_mesh=PhotoMesh()
silo_profile=[(2.65,.17),(2.85,.28),(3.05,.48),(3.60,1.48),(4.15,1.86),
 (6.05,1.86),(8.30,1.86),(10.85,1.78),(11.20,1.68),(11.82,.38),(12.28,.20)]
def silo_uv(i,distance,radius,angle):
 px=168+math.cos(angle)*(radius/PLANT_SCALE)
 py=PLANT_GROUND-distance/PLANT_SCALE
 return side_photo.uv(px,py)
lathe(silo_mesh,'side',(SILO_CX,0,SILO_CZ),(0,1,0),(0,0,1),(1,0,0),silo_profile,
      silo_uv,sides=32,cap_start=('side',lambda angle,f:side_photo.uv(168+math.cos(angle)*f*55,380)),
      cap_end=('side',lambda angle,f:side_photo.uv(168+math.cos(angle)*f*63,30)))
silo_surface=silo_mesh.finish('batch-plant:silo-shell',{'side':side_photo.material()})
silo_surface.parent=silo;plant_parts.append(silo_surface)
silo_surface.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.08

# Trace both visible steel legs from the real side pixels, then repeat the
# same measured outline on the far face. Their feet are grounded.
leg_mask=~side_photo.sky([(8,8),(1015,8),(8,503),(1015,503)],tolerance=34)
leg_mask &= (side_photo.rgb().mean(axis=2)<195)
leg_mask[PLANT_GROUND:,:]=False
leg_loops=[]
for rect in ((77,265,119,486),(211,265,249,486)):
 leg_loops.extend(trace(leg_mask,rect,tolerance=1.0,min_area=22))
legs=PhotoMesh()
slab(legs,'side',side_photo,leg_loops,plant_side_world,-1.58,-1.40,wall_scale=PLANT_SCALE)
leg_near=legs.finish('batch-plant:silo:traced-legs-road',{'side':side_photo.material()});leg_near.parent=plant;plant_parts.append(leg_near)
legs_far=legs.finish('batch-plant:silo:traced-legs-far',{'side':side_photo.material()});legs_far.parent=plant;legs_far.location.x=3.0;plant_parts.append(legs_far)
for side in (-1,1):
 for zoff in (-1.52,1.52):
  leg=town.cube('batch-plant:silo:leg-foot',(side*1.48,.20,SILO_CZ+zoff),(.46,.40,.46),dark,bevel=.025)
  leg.parent=silo
  plant_parts.append(leg)

def outside_rect(width,height,rect):
 x0,y0,x1,y1=rect
 return [(0,0,width,y0),(0,y1,width,height),(0,y0,x0,y1),(x1,y0,width,y1)]

# Two broad open-top aggregate bins are one separate carve, kept clear of the
# silo and raised mixing tower. The end and plan photographs hold their width.
bin_table={
 'photos':{'side':'batch-plant-side.jpg','front':'batch-plant-front.jpg','rear':'batch-plant-rear.jpg','top':'batch-plant-top.jpg'},
 'length':10.4,'width':15.0,'height':5.0,
 'side':{'start':247,'end':635,'ground':PLANT_GROUND},
 'front':{'centre':512,'ground':900,'top':627},
 'rear':{'centre':512,'ground':900,'top':630},
 'top':{'front':237,'rear':635,'centre':263,'along':'x','x_scale':15.0/232},
 'cut':{
  'side':outside_rect(1024,512,(247,310,635,482)),
  'front':outside_rect(1024,900,(72,625,951,900)),
  'rear':outside_rect(1024,900,(78,625,949,900)),
  'top':outside_rect(1024,512,(237,183,635,375)),
 },
 'grey':29,'tolerance':34,'bleed_tolerance':38,'voxel':.12,'target':3200,
 'mask_dir':str(evidence/'masks') if a.render else None,
}
bins_group=bpy.data.objects.new('batch-plant:aggregate-bins',None);bpy.context.collection.objects.link(bins_group);bins_group.parent=plant
bins_body=carve_object('batch-plant:aggregate-bin-shells',tex,bin_table);bins_body.parent=bins_group
bins_group.location=town.game_vector((0,0,plant_z(442)))
plant_parts.append(bins_body)

# The mixing tower is carved from the same four photos. A measured keep cut
# removes its centre bay below the mixer, leaving a 4.6 m wide, 3.9 m high
# passage for a truck to drive through from the road side.
tower_length=8.2;tower_width=10.0;tower_height=10.5
tower_table={
 'photos':{'side':'batch-plant-side.jpg','front':'batch-plant-front.jpg','rear':'batch-plant-rear.jpg','top':'batch-plant-top.jpg'},
 'length':tower_length,'width':tower_width,'height':tower_height,
 'side':{'start':666,'end':945,'ground':PLANT_GROUND},
 'front':{'centre':512,'ground':900,'top':468,'top_height':tower_height},
 'rear':{'centre':512,'ground':900,'top':472,'top_height':tower_height},
 'top':{'front':635,'rear':995,'centre':255,'along':'x','x_scale':tower_width/260},
 'cut':{
  'side':outside_rect(1024,512,(666,82,945,482)),
  # Clean end photos omit the separately rebuilt silo, so their wall silhouettes
  # remain available to shape the tower and preserve the drive-under opening.
  'front':outside_rect(1024,900,(300,466,733,900)),
  'rear':outside_rect(1024,900,(300,468,735,900)),
  'top':outside_rect(1024,512,(635,135,1000,375)),
 },
 'keep':lambda x,y,z:~((abs(x)<2.30)&(y>.18)&(y<4.02)&(abs(z)<tower_length/2-.12)),
 'grey':29,'tolerance':34,'bleed_tolerance':38,'voxel':.105,'target':4800,
 'mask_dir':str(evidence/'masks') if a.render else None,
}
tower=bpy.data.objects.new('batch-plant:mixing-tower',None);bpy.context.collection.objects.link(tower);tower.parent=plant
tower_body=carve_object('batch-plant:mixing-tower-shell',tex,tower_table);tower_body.parent=tower
tower.location=town.game_vector((0,0,plant_z(805)))
plant_parts.append(tower_body)
# Keep-cut edges become real open frame supports, set outside the truck lane.
TOWER_CZ=plant_z(805)
for x in (-2.72,2.72):
 for z in (-3.55,3.55):
  post=town.beam('batch-plant:mixing-tower:bay-post',(x,.10,TOWER_CZ+z),(x,4.08,TOWER_CZ+z),.24,steel)
  attach_piece(post)
  foot=town.cube('batch-plant:mixing-tower:footing',(x,.12,TOWER_CZ+z),(.66,.24,.66),sand,bevel=.035)
  attach_piece(foot)

# The separate steel chute sits above the drive-under aperture and projects
# toward the road. Its trough bottom and two raised lips are distinct beams.
chute=bpy.data.objects.new('batch-plant:truck-chute',None)
bpy.context.collection.objects.link(chute);chute.parent=plant
chute_z=TOWER_CZ-2.0
for x in (-.72,0,.72):
 rail=town.beam('batch-plant:truck-chute:trough',(x,4.52,chute_z+1.7),(x,3.35,chute_z-3.2),.14,dark)
 attach_piece(rail,chute)
for x in (-.72,.72):
 side=town.beam('batch-plant:truck-chute:side-lip',(x,4.93,chute_z+1.7),(x,3.75,chute_z-3.2),.10,steel)
 attach_piece(side,chute)

# A short hooded outlet joins the lathed silo to the aggregate and mixer line.
transfer=town.beam('batch-plant:silo-transfer-pipe',(0,3.1,SILO_CZ+1.85),(0,3.1,-4.05),.22,dark)
attach_piece(transfer)

# A one-cell drilled wellhead. The side photo supplies the long open pump-jack
# frame and the moving beam; the front and rear photos set its cross-width.
# Side pixels 66..944 span the 6.2 m working length, and the measured ground
# line is y=649. The end photos put the outer feet at x=238..780, or 2.9 m.
wellhead=bpy.data.objects.new('wellhead',None);bpy.context.collection.objects.link(wellhead);wellhead.parent=rootobj
wellhead_parts=[]
well_side=Photo(tex/'wellhead-side.jpg')
well_front=Photo(tex/'wellhead-front.jpg')
well_rear=Photo(tex/'wellhead-rear.jpg')
well_top=Photo(tex/'wellhead-top.jpg')
WELL_START,WELL_END,WELL_GROUND=66,944,649
WELL_LENGTH=6.2
WELL_SCALE=WELL_LENGTH/(WELL_END-WELL_START)
WELL_Z0=-WELL_LENGTH/2
WELL_WIDTH=2.9
WELL_HALF=WELL_WIDTH/2
def well_z(px):return WELL_Z0+(px-WELL_START)*WELL_SCALE
def well_side_world(px,py,depth):
 y=(WELL_GROUND-py)*WELL_SCALE
 taper=max(.55,min(1.0,1.0-.45*y/((WELL_GROUND-204)*WELL_SCALE)))
 return (depth*taper,y,well_z(px))
def well_attach(obj,parent=wellhead):obj.parent=parent;wellhead_parts.append(obj);return obj
def well_beam(name,a,b,width,mat):
 obj=town.beam(name,a,b,width,mat)
 # The glTF exporter bakes bevel modifiers into every cube. Keep repeated
 # support bars flat-edged so the final exported count stays inside budget.
 for modifier in list(obj.modifiers):
  if modifier.type in {'BEVEL','WEIGHTED_NORMAL'}:obj.modifiers.remove(modifier)
 return well_attach(obj)

side_rgb=well_side.rgb()
# Remove the neutral studio-grey by colour everywhere, not only where it can
# flood in from an edge. This clears the grey caught inside the A-frame and
# along the beam beside the horse-head. Keep the image itself untouched.
studio_samples=np.concatenate((side_rgb[8:48,8:48].reshape(-1,3),
                               side_rgb[8:48,-48:-8].reshape(-1,3),
                               side_rgb[-48:-8,8:48].reshape(-1,3),
                               side_rgb[-48:-8,-48:-8].reshape(-1,3)))
studio_grey=np.median(studio_samples,axis=0)
studio_distance=np.abs(side_rgb-studio_grey).max(axis=2)
studio_chroma=side_rgb.max(axis=2)-side_rgb.min(axis=2)
side_background=(studio_distance<34)&(studio_chroma<20)
if a.render:
 save_mask(~side_background,evidence/'masks'/'wellhead-side-subject.png')
side_sky=side_background
yy,xx=np.ogrid[:well_side.h,:well_side.w]
# Paint-worn steel stays within the actual diagonal members; the center bays
# remain open. Separate rectangular bands preserve the measured cross-ties.
left_rail=(yy>=204)&(yy<=612)&(xx>=425+(612-yy)*.17)&(xx<=462+(612-yy)*.16)
right_rail=(yy>=204)&(yy<=612)&(xx>=644-(612-yy)*.19)&(xx<=687-(612-yy)*.14)
base_rail=(yy>=604)&(yy<=649)&(xx>=65)&(xx<=946)
frame_mask=(~side_sky)&(left_rail|right_rail|base_rail)
frame_loops=trace(frame_mask,(55,190,955,655),tolerance=4.2,min_area=90)
if not frame_loops:raise RuntimeError('wellhead frame trace is empty')
for side_name,d0,d1 in (('road',-1.34,-1.20),('far',1.20,1.34)):
 frame_mesh=PhotoMesh();slab(frame_mesh,'side',well_side,frame_loops,well_side_world,d0,d1,wall_scale=WELL_SCALE)
 frame_obj=frame_mesh.finish(f'wellhead:frame-{side_name}',{'side':well_side.material()})
 well_attach(frame_obj)

# The beam and horsehead are their own traced slab, recentered at the measured
# bearing (photo pixel 552,153). Its parent origin is the actual rocking axis.
beam_region=(((yy>=18)&(yy<=232)&(xx>=263)&(xx<=846))|
             ((yy>=228)&(yy<=441)&(xx>=793)&(xx<=845))|
             ((yy>=205)&(yy<=428)&(xx>=294)&(xx<=365)))
beam_mask=(~side_sky)&beam_region
beam_loops=trace(beam_mask,(258,10,850,445),tolerance=4.4,min_area=110)
if not beam_loops:raise RuntimeError('wellhead beam trace is empty')
BEARING_Y=(WELL_GROUND-153)*WELL_SCALE
BEARING_Z=well_z(552)
beam_mesh=PhotoMesh();slab(beam_mesh,'side',well_side,beam_loops,well_side_world,-.20,.20,wall_scale=WELL_SCALE)
beam_mesh.verts=[(vertex[0],vertex[1]-BEARING_Y,vertex[2]-BEARING_Z) for vertex in beam_mesh.verts]
beam_obj=beam_mesh.finish('wellhead:beam-surface',{'side':well_side.material()})
beam_pivot=bpy.data.objects.new('wellhead:beam',None);bpy.context.collection.objects.link(beam_pivot)
beam_pivot.parent=wellhead;beam_pivot.location=town.game_vector((0,BEARING_Y,BEARING_Z));beam_obj.parent=beam_pivot
wellhead_parts.append(beam_obj)

# The motor is a compact, photo-traced housing. Turning a generic drum made
# its pale end cap dominate the side and front views; the silhouette and both
# broad faces now wear the actual motor in the side photograph.
motor_mask=(~side_background)&(xx>=82)&(xx<=182)&(yy>=448)&(yy<=556)
motor_loops=trace(motor_mask,(78,444,186,560),tolerance=4.0,min_area=75)
if not motor_loops:raise RuntimeError('wellhead motor trace is empty')
motor_mesh=PhotoMesh();slab(motor_mesh,'side',well_side,motor_loops,well_side_world,-.28,.28,wall_scale=WELL_SCALE)
motor_obj=motor_mesh.finish('wellhead:motor',{'side':well_side.material()});well_attach(motor_obj)

# Tie the two traced side frames at their feet, shoulders and bearing. These
# cross-members leave the A-frame's triangular openings clear.
for z_px,y_px,width in ((438,624,2.45),(563,416,2.05),(552,286,1.70),(508,207,1.44)):
 y=(WELL_GROUND-y_px)*WELL_SCALE;z=well_z(z_px)
 well_beam('wellhead:frame-cross-tie',( -width/2,y,z),(width/2,y,z),.105,steel)
# The side photograph's three inner crossbars run in the long profile plane.
# Build them on both faces; the matching cross-width ties join their ends.
for depth,face in ((-1.27,'road'),(1.27,'far')):
 for index,(px0,px1,py) in enumerate(((500,625,286),(465,660,416),(438,678,538))):
  y=(WELL_GROUND-py)*WELL_SCALE
  taper=max(.55,min(1.0,1.0-.45*y/((WELL_GROUND-204)*WELL_SCALE)))
  well_beam(f'wellhead:frame-profile-crossbar-{face}-{index+1}',
            (depth*taper,y,well_z(px0)),(depth*taper,y,well_z(px1)),.10,steel)
for z in (well_z(77),well_z(932)):
 well_beam('wellhead:base-cross-member',(-1.20,.17,z),(1.20,.17,z),.12,dark)

# The flywheel is a measured annulus with four spokes, not a floating hub ring.
# Its centre follows the side photograph's crank at pixels (310,455).
def side_uv(i,distance,radius,angle):
 return well_side.uv(310+math.cos(angle)*radius/WELL_SCALE,
                     455+math.sin(angle)*radius/WELL_SCALE)
hub=PhotoMesh()
FLYWHEEL_Y=(WELL_GROUND-455)*WELL_SCALE
FLYWHEEL_Z=well_z(310)
lathe(hub,'side',(-.78,FLYWHEEL_Y,FLYWHEEL_Z),(1,0,0),(0,1,0),(0,0,1),
      [(-.07,.60),(-.07,.67),(.07,.67),(.07,.60)],side_uv,sides=10)
hub_obj=hub.finish('wellhead:flywheel-rim',{'side':dark});well_attach(hub_obj)
hub_center=PhotoMesh()
lathe(hub_center,'side',(-.78,FLYWHEEL_Y,FLYWHEEL_Z),(1,0,0),(0,1,0),(0,0,1),
      [(-.10,.06),(.10,.06)],side_uv,sides=10,
      cap_start=('side',lambda a,f:well_side.uv(310+math.cos(a)*f*18,455+math.sin(a)*f*18)),
      cap_end=('side',lambda a,f:well_side.uv(310+math.cos(a)*f*18,455+math.sin(a)*f*18)))
hub_center_obj=hub_center.finish('wellhead:flywheel-hub',{'side':dark});well_attach(hub_center_obj)
for index in range(8):
 angle=index*math.pi/4
 end_y=FLYWHEEL_Y+math.sin(angle)*.58;end_z=FLYWHEEL_Z+math.cos(angle)*.58
 well_beam(f'wellhead:flywheel-spoke-{index+1}',(-.78,FLYWHEEL_Y,FLYWHEEL_Z),(-.78,end_y,end_z),.065,dark)
well_beam('wellhead:motor-stand',(0,.08,well_z(172)),(0,.92,well_z(172)),.14,dark)

# The casing and valve are turned profiles, not boxes. The casing reaches the
# ground and its crown joins the polished rod; a lathed handwheel and spokes
# sit beside its branch pipe.
CASING_Z=well_z(814)
casing=PhotoMesh()
lathe(casing,'side',(0,0,CASING_Z),(0,1,0),(1,0,0),(0,0,1),
      [(.06,.34),(.10,.39),(.18,.39),(.24,.30),(.98,.30),(1.07,.35),(1.13,.35),(1.18,.26)],
      lambda i,d,r,a:well_side.uv(814+math.sin(a)*r/WELL_SCALE,WELL_GROUND-d/WELL_SCALE),sides=12,
      cap_start=('side',lambda a,f:well_side.uv(814+math.cos(a)*f*44,630)),
      cap_end=('side',lambda a,f:well_side.uv(814+math.cos(a)*f*31,480)))
casing_obj=casing.finish('wellhead:casing',{'side':well_side.material()});well_attach(casing_obj)
valve=PhotoMesh()
lathe(valve,'side',(0,1.34,CASING_Z-.30),(0,0,1),(1,0,0),(0,1,0),
      [(-.20,.14),(-.15,.23),(-.07,.23),(.12,.16),(.25,.12),(.36,.12),(.42,.18),(.49,.18)],
      lambda i,d,r,a:well_side.uv(814+d/WELL_SCALE,WELL_GROUND-(1.34+math.sin(a)*r)/WELL_SCALE),sides=8)
valve_obj=valve.finish('wellhead:valve',{'side':well_side.material()});well_attach(valve_obj)
well_beam('wellhead:valve-stem',(-.18,1.40,well_z(880)),(-.56,1.40,well_z(894)),.07,dark)
wheel=PhotoMesh()
lathe(wheel,'side',(-.56,1.40,well_z(894)),(1,0,0),(0,1,0),(0,0,1),
      [(-.035,.18),(-.02,.24),(.02,.24),(.035,.18)],
      lambda i,d,r,a:well_side.uv(894+math.sin(a)*r/WELL_SCALE,446+math.cos(a)*r/WELL_SCALE),sides=8)
wheel_obj=wheel.finish('wellhead:valve-handwheel',{'side':well_side.material()});well_attach(wheel_obj)
for index in range(4):
 angle=index*math.pi/2
 y=1.40+math.cos(angle)*.205;z=well_z(894)+math.sin(angle)*.205
 well_beam(f'wellhead:valve-spoke-{index+1}',(-.56,1.40,well_z(894)),(-.56,y,z),.035,dark)

# The pale hand-painted 07 is physical ink over the casing, readable from the
# side. Its face points toward -X; the baseline follows the casing's height.
number_data=bpy.data.curves.new('wellhead hand-painted number','FONT')
number_data.body='07';number_data.size=.24;number_data.align_x='CENTER';number_data.align_y='CENTER'
number_data.extrude=.0015;number_data.resolution_u=3
number_obj=bpy.data.objects.new('wellhead:hand-painted-07',number_data);bpy.context.collection.objects.link(number_obj)
number_obj.location=town.game_vector((-.365,.74,CASING_Z))
number_obj.rotation_euler=Matrix(((0,0,-1),(-1,0,0),(0,1,0))).to_euler()
number_obj.parent=wellhead
number_mat=bpy.data.materials.new('worn cream hand paint');number_mat.diffuse_color=(.66,.58,.40,1);number_mat.use_nodes=True
number_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.66,.58,.40,1)
number_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.96
number_data.materials.append(number_mat)
bpy.ops.object.select_all(action='DESELECT');number_obj.select_set(True);bpy.context.view_layer.objects.active=number_obj
bpy.ops.object.convert(target='MESH');number_obj=bpy.context.object;number_obj.name='wellhead:hand-painted-07'
wellhead_parts.append(number_obj)

# End-view rails and feet follow the front and rear photo widths, keeping the
# model inside its 7 m usable footprint while joining the side-frame slabs.
for z,name,photo in ((-3.02,'front',well_front),(3.02,'rear',well_rear)):
 for x in (-1.17,1.17):
  well_beam(f'wellhead:{name}-foot',(x,.13,z-.22),(x,.13,z+.22),.16,dark)


# One-cell salvaged airliner radar. The front elevation sets the tower height
# and width on its own 100 px grid: the open face is about 7.1 m tall and
# 2.45 m wide (2.9:1). Two traced front faces carry its real openings; traced
# side-photo braces join them. The independently traced ladder and railing
# stay clear of the static tower masks. The front and rear dish skins turn as
# one vertical-axis lathe above the platform.
radar=bpy.data.objects.new('radar',None);bpy.context.collection.objects.link(radar);radar.parent=rootobj
radar_parts=[]
radar_side=Photo(tex/'radar-side.jpg');radar_front=Photo(tex/'radar-front.jpg')
radar_rear=Photo(tex/'radar-rear.jpg');radar_top=Photo(tex/'radar-above.jpg')
RADAR_GROUND=1490
RADAR_TOWER_TOP=805
RADAR_TOWER_HEIGHT=7.10
RADAR_Y_SCALE=RADAR_TOWER_HEIGHT/(RADAR_GROUND-RADAR_TOWER_TOP)
RADAR_FRONT_CENTRE=512
RADAR_FRONT_WIDTH=2.45
RADAR_FRONT_PIXELS=236
RADAR_FRONT_SCALE=RADAR_FRONT_WIDTH/RADAR_FRONT_PIXELS
RADAR_DEPTH=2.25
RADAR_SIDE_CENTRE=512
RADAR_SIDE_WIDTH=RADAR_DEPTH
RADAR_SIDE_PIXELS=236
RADAR_SIDE_SCALE=RADAR_SIDE_WIDTH/RADAR_SIDE_PIXELS
def radar_front_world(px,py,depth):
 return ((px-RADAR_FRONT_CENTRE)*RADAR_FRONT_SCALE,
         (RADAR_GROUND-py)*RADAR_Y_SCALE,depth)
def radar_side_world(px,py,depth):
 return (depth,(RADAR_GROUND-py)*RADAR_Y_SCALE,
         (px-RADAR_SIDE_CENTRE)*RADAR_SIDE_SCALE)
def radar_attach(obj,parent=radar):obj.parent=parent;radar_parts.append(obj);return obj
def radar_colour_mask(rgb):
 spread=rgb.max(axis=2)-rgb.min(axis=2);grey=rgb.mean(axis=2)
 raw=((spread>12)&(grey<205))|((grey<86)&(spread<14))
 # Rust texture otherwise breaks each bar into many polygons. A majority
 # filter joins its color flecks while keeping the large grey openings clear.
 padded=np.pad(raw.astype(np.uint8),1)
 votes=sum(padded[dy:dy+raw.shape[0],dx:dx+raw.shape[1]]
           for dy in range(3) for dx in range(3))
 return votes>=4

# The grey studio remains background even inside the lattice cells. Select
# only colored rust/steel and very dark steel pixels, then trace the open face
# from the photo. Avoid the photographed dish and keep the platform, ladder
# and railing out of the tower panel so those parts have their own geometry.
side_rgb=radar_side.rgb();side_mask=radar_colour_mask(side_rgb)
front_rgb=radar_front.rgb();front_mask=radar_colour_mask(front_rgb)
# Only the central tower and foot structure is baked into the two face slabs.
# The excluded neutral pixels are the photo's studio, including every opening
# inside the lattice, so there are no filled grey sheets behind the braces.
front_mask[:RADAR_TOWER_TOP,:]=False;front_mask[RADAR_GROUND:,:]=False
front_mask[:,:394]=False;front_mask[:,630:]=False
front_y,front_x=np.ogrid[:front_mask.shape[0],:front_mask.shape[1]]
# The straight central ladder is a separately traced face. Leave room for its
# rails and rungs instead of baking it into each copy of the tower.
ladder_cut=(front_x>=486)&(front_x<=538)&(front_y>=RADAR_TOWER_TOP)&(front_y<RADAR_GROUND)
front_mask &= ~ladder_cut
front_loops=trace(front_mask,(394,RADAR_TOWER_TOP,630,RADAR_GROUND),tolerance=26.0,min_area=120)
if not front_loops:raise RuntimeError('radar front lattice trace is empty')
for depth,label in ((-RADAR_DEPTH/2,'road'),(RADAR_DEPTH/2,'far')):
 frame=PhotoMesh();slab(frame,'photo',radar_front,front_loops,radar_front_world,depth-.045,depth+.045,wall_scale=RADAR_Y_SCALE)
 obj=frame.finish(f'radar:tower-end-frame-{label}',{'photo':radar_front.material()});radar_attach(obj)

# Measured on the side photo's 100 px grid, its three open X bays meet near
# y=1.2, 3.7 and 6.2 m. Real diagonal and cross beams join the front/back
# traced faces without putting a filled photo sheet across the open side.
for x,label in ((-RADAR_FRONT_WIDTH/2,'left'),(RADAR_FRONT_WIDTH/2,'right')):
 for index,(low,high) in enumerate(((.12,1.2),(1.2,3.7),(3.7,6.2),(6.2,7.08)),1):
  for z0,z1 in ((-RADAR_DEPTH/2,RADAR_DEPTH/2),(RADAR_DEPTH/2,-RADAR_DEPTH/2)):
   brace=town.beam(f'radar:side-x-brace-{label}-{index}',(x,low,z0),(x,high,z1),.075,steel)
   radar_attach(brace)
 for index,y in enumerate((.12,1.2,3.7,6.2,7.08),1):
  tie=town.beam(f'radar:side-tie-{label}-{index}',(x,y,-RADAR_DEPTH/2),(x,y,RADAR_DEPTH/2),.075,dark)
  radar_attach(tie)

# Thin platform and separately traced railing sit at the tower head. The deck
# is plain salvaged steel; the front and side rail profiles retain photo wear.
platform_y=(RADAR_GROUND-RADAR_TOWER_TOP)*RADAR_Y_SCALE
deck=town.cube('radar:platform-deck',(0,platform_y+.08,0),(3.70,.20,3.20),steel,.025)
radar_attach(deck)
rail_front_mask=radar_colour_mask(front_rgb)
rail_front_mask[:650,:]=False;rail_front_mask[790:,:]=False
rail_front_mask[:,:320]=False;rail_front_mask[:,704:]=False
# Keep reflector surfaces out of the photographed rail and head support.
rail_front_loops=trace(rail_front_mask,(320,650,704,790),tolerance=24.0,min_area=100)
if not rail_front_loops:raise RuntimeError('radar front platform railing trace is empty')
for depth,label in ((-1.56,'road'),(1.56,'far')):
 frame=PhotoMesh();slab(frame,'photo',radar_front,rail_front_loops,radar_front_world,depth-.025,depth+.025,wall_scale=RADAR_Y_SCALE)
 obj=frame.finish(f'radar:platform-railing-{label}',{'photo':radar_front.material()});radar_attach(obj)

# Ladder trace from the front photo, with its original openings between rungs.
ladder_mask=radar_colour_mask(front_rgb)
ladder_mask[:RADAR_TOWER_TOP,:]=False;ladder_mask[RADAR_GROUND:,:]=False
ladder_mask &= (front_x>=486)&(front_x<=538)
ladder_loops=trace(ladder_mask,(486,RADAR_TOWER_TOP,538,RADAR_GROUND),tolerance=24.0,min_area=30)
if not ladder_loops:raise RuntimeError('radar ladder trace is empty')
ladder_mesh=PhotoMesh();slab(ladder_mesh,'photo',radar_front,ladder_loops,radar_front_world,-1.25,-1.19,wall_scale=RADAR_Y_SCALE)
ladder_obj=ladder_mesh.finish('radar:ladder',{'photo':radar_front.material()});radar_attach(ladder_obj)

# The dish turns on a head over the platform. Its face is unchanged from the
# accepted round; the rear wears the grey plate photo and the red rim is gone.
RADAR_DISH_Y=9.70
turn=bpy.data.objects.new('radar:dish',None);bpy.context.collection.objects.link(turn);turn.parent=radar
turn.location=town.game_vector((0,RADAR_DISH_Y,0));radar_parts.append(turn)
def dish_uv(index,distance,radius,angle):
 fraction=min(.86,radius/1.58*.86)
 return radar_front.uv(512+292*fraction*math.cos(angle),320-292*fraction*math.sin(angle))
def rear_dish_uv(index,distance,radius,angle):
 fraction=min(.86,radius/1.58*.86)
 return radar_rear.uv(512+296*fraction*math.cos(angle),300-296*fraction*math.sin(angle))
dish=PhotoMesh()
lathe(dish,'photo',(0,0,0),(0,0,1),(1,0,0),(0,1,0),
      [(-.16,1.58),(-.11,1.50),(-.02,1.12),(.10,.72),(.20,.34),(.28,.14)],
      dish_uv,sides=20,cap_end=('photo',lambda angle,f:radar_front.uv(512+52*f*math.cos(angle),320-52*f*math.sin(angle))))
dish_obj=dish.finish('radar:dish-surface',{'photo':radar_front.material()});dish_obj.parent=turn;radar_parts.append(dish_obj)
# The rear skin wears the back photo, including its radial bracing; the drive
# motor sits behind it. Both skins and motor rotate together with the true centre.
rear_dish=PhotoMesh()
lathe(rear_dish,'photo',(0,0,.28),(0,0,1),(1,0,0),(0,1,0),
      [(-.16,1.58),(-.11,1.50),(-.02,1.12),(.10,.72),(.20,.34),(.28,.14)],
      rear_dish_uv,sides=20,cap_end=('photo',lambda angle,f:radar_rear.uv(512+52*f*math.cos(angle),300-52*f*math.sin(angle))))
rear_obj=rear_dish.finish('radar:dish-rear-surface',{'photo':radar_rear.material()});rear_obj.parent=turn;radar_parts.append(rear_obj)
motor=town.cube('radar:dish-drive-motor',(0,RADAR_DISH_Y,.46),(.44,.44,.40),dark,.025)
world=motor.matrix_world.copy();motor.parent=turn;motor.matrix_world=world;radar_parts.append(motor)
# A fixed bearing yoke joins the lattice at the dish's lower edge.
for x in (-.68,.68):
 radar_attach(town.beam('radar:turntable-bearing',(x,platform_y+.02,0),(x,RADAR_DISH_Y-.72,.08),.11,steel))
radar_attach(town.beam('radar:turntable-crossbar',(-.75,platform_y+.02,0),(.75,platform_y+.02,0),.13,steel))

# The small lattice and foot boxes read from their photographed edges at town
# scale; their bevel modifiers multiply the exported count without changing
# that silhouette. Keep the traced photo edges and budget the actual GLB.
for obj in bpy.context.scene.objects:
 if obj.type=='MESH' and obj.name.startswith('radar:'):
  for modifier in tuple(obj.modifiers):
   if modifier.type=='BEVEL':obj.modifiers.remove(modifier)

# Pump station, built from its four isolated orthographic photographs. The
# source photographs were generated with OpenAI image generation on 7 Nov 2026
# and are credited here; the fence panel has its own generated photo. The body
# photos contain no pipes or fence, so those remain real, separate geometry.
pump_station=bpy.data.objects.new('pump-station',None);bpy.context.collection.objects.link(pump_station);pump_station.parent=rootobj
pump_parts=[]
pump_side=Photo(tex/'pump-station-side.jpg')
pump_front=Photo(tex/'pump-station-front.jpg')
pump_rear=Photo(tex/'pump-station-rear.jpg')
pump_top=Photo(tex/'pump-station-top.jpg')
PUMP_LENGTH=9.0
PUMP_HEIGHT=5.75
PUMP_WIDTH=9.0
pump_table={
 'photos':{'side':'pump-station-side.jpg','front':'pump-station-front.jpg',
           'rear':'pump-station-rear.jpg','top':'pump-station-top.jpg'},
 'length':PUMP_LENGTH,'width':PUMP_WIDTH,'height':PUMP_HEIGHT,
 # Grid reads: side wall x=171..852, ground y=560; the two end walls are
 # 798px wide against 530px of wall height. The plan view is near square.
 'side':{'start':171,'end':852,'ground':560},
 'front':{'centre':512,'ground':605,'top':75},
 'rear':{'centre':512,'ground':600,'top':75},
 'top':{'front':123,'rear':900,'centre':512,'x_scale':PUMP_WIDTH/(902-121)},
 'grey':28,'tolerance':38,'bleed_tolerance':48,'voxel':.105,'target':2000,
 'mask_dir':str(evidence/'masks') if a.render else None,
}
pump_body=carve_object('pump-station:body',tex,pump_table)
pump_body.parent=pump_station;pump_parts.append(pump_body)

# Two flanged water mains are turned profiles. Their ends pass through the
# photographed wall planes, remain inside the 2x2-cell compound, and are clear
# of the service gate. This is a lathe, rather than a box or a tube primitive.
pump_pipe_material=bpy.data.materials.new('Pump / worn dark steel')
pump_pipe_material.use_nodes=True
pump_pipe_bsdf=pump_pipe_material.node_tree.nodes['Principled BSDF']
pump_pipe_bsdf.inputs['Base Color'].default_value=(.14,.105,.075,1)
pump_pipe_bsdf.inputs['Metallic'].default_value=.22
pump_pipe_bsdf.inputs['Roughness'].default_value=.88
def pump_lathed_pipe(name,start_x,end_x,y,z,radius):
 mesh=PhotoMesh();length=end_x-start_x
 stations=[(0,radius*.78),(.05,radius),(.12,radius),(.20,radius*1.42),
           (.34,radius*1.42),(.40,radius), (length-.10,radius), (length,radius)]
 def uv(index,distance,r,angle):return (index/(len(stations)-1),angle/(2*math.pi))
 cap=lambda angle,f:(.5+math.cos(angle)*f*.5,.5+math.sin(angle)*f*.5)
 lathe(mesh,'pipe',(start_x,y,z),(1,0,0),(0,1,0),(0,0,1),stations,uv,
       sides=10,cap_start=('pipe',cap),cap_end=('pipe',cap))
 obj=mesh.finish(name,{'pipe':pump_pipe_material});obj.parent=pump_station;pump_parts.append(obj);return obj

pump_lathed_pipe('pump-station:inlet-pipe',4.12,6.10,.92,-1.85,.24)
pump_lathed_pipe('pump-station:outlet-pipe',4.12,6.10,1.55,1.85,.24)

# Trace one open chain-link panel from its own photograph. A coarse pixel mask
# keeps the diamond apertures open without carrying every stray wire splinter
# into the 2x2-cell triangle budget. Reused mesh data gives each fence panel
# the same true traced shape and photographic wear.
fence_photo=Photo(tex/'pump-station-fence.jpg')
fence_photo.rgb()  # Load and inspect the credited panel before tracing its open mesh.
# The source has hundreds of broken wire ends. Trace its broad panel shape on
# a low-resolution raster: three open diamond columns between the measured
# posts and rails. This keeps the fence open and inside budget.
trace_small=np.zeros((76,128),dtype=bool)
def fence_line(a,b):
 x0,y0=a;x1,y1=b;steps=max(abs(x1-x0),abs(y1-y0))
 for step in range(steps+1):
  x=round(x0+(x1-x0)*step/steps);y=round(y0+(y1-y0)*step/steps)
  if 0<=x<128 and 0<=y<76:trace_small[y,x]=True
trace_small[5:71,8:11]=True;trace_small[5:71,117:120]=True
trace_small[10:12,10:118]=True;trace_small[66:68,10:118]=True
for start in range(0,121,40):
 fence_line((start,18),(start+40,58))
 fence_line((start,58),(start+40,18))
fence_mask=np.repeat(np.repeat(trace_small,8,axis=0),8,axis=1)
fence_mask=np.pad(fence_mask,((0,fence_photo.h-fence_mask.shape[0]),(0,0)))
if a.render:save_mask(fence_mask,evidence/'masks'/'pump-station-fence-trace.png')
fence_loops=trace(fence_mask,(40,32,984,576),tolerance=14.0,min_area=80)
if not fence_loops:raise RuntimeError('pump-station fence trace is empty')
fence_photo.bleed(fence_mask)
FENCE_GROUND,FENCE_START,FENCE_END,FENCE_TOP=565,44,976,43
FENCE_SCALE=3.0/(FENCE_END-FENCE_START)
FENCE_CENTRE=(FENCE_START+FENCE_END)/2
def pump_fence_panel(label,centre,orientation,width=3.0):
 scale=FENCE_SCALE*width/3.0
 def panel_world(px,py,depth):
  across=(px-FENCE_CENTRE)*scale
  up=(FENCE_GROUND-py)*FENCE_SCALE
  if orientation=='front':return (centre+across,up,-6.05+depth)
  if orientation=='back':return (centre+across,up,6.05-depth)
  if orientation=='left':return (-6.05-depth,up,centre+across)
  return (6.05+depth,up,centre-across)
 mesh=PhotoMesh();slab(mesh,'photo',fence_photo,fence_loops,panel_world,-.045,.045,wall_scale=FENCE_SCALE)
 obj=mesh.finish(f'pump-station:fence-{label}',{'photo':fence_photo.material()})
 obj.parent=pump_station;pump_parts.append(obj);return obj

for centre in (-4.5,-1.5,1.5,4.5):pump_fence_panel(f'back-{centre:g}',centre,'back')
for centre in (-4.5,-1.5,1.5,4.5):
 pump_fence_panel(f'left-{centre:g}',centre,'left')
 pump_fence_panel(f'right-{centre:g}',centre,'right')
# Two shortened end panels leave a clear, three-metre-wide opening at the road.
pump_fence_panel('front-left-long',-4.5,'front')
pump_fence_panel('front-left-short',-2.25,'front',1.5)
pump_fence_panel('front-right-short',2.25,'front',1.5)
pump_fence_panel('front-right-long',4.5,'front')

# Machine yard: two photo-carved sheds, drums turned from a real circular
# profile, three repeated salvage piles, a photo-wearing dirt pad and one
# traced fence run. The 6 x 4 cell footprint is 48 x 32 m; all meshes keep a
# 0.5 m margin inside it.
yard_parts=[]
def yard_part(obj):
 obj.parent=machine_yard;yard_parts.append(obj);return obj

yard_ground=Photo(tex/'machine-yard-ground.jpg')
yard_slab=PhotoMesh()
x0,x1,z0,z1=-23.5,23.5,-15.5,15.5
yard_slab.face([(x0,.14,z0),(x1,.14,z0),(x1,.14,z1),(x0,.14,z1)],
 [yard_ground.uv(0,0),yard_ground.uv(yard_ground.w,0),yard_ground.uv(yard_ground.w,yard_ground.h),yard_ground.uv(0,yard_ground.h)],'ground',(0,1,0))
yard_slab.face([(x0,0,z1),(x1,0,z1),(x1,0,z0),(x0,0,z0)],
 [yard_ground.uv(0,0),yard_ground.uv(yard_ground.w,0),yard_ground.uv(yard_ground.w,yard_ground.h),yard_ground.uv(0,yard_ground.h)],'ground',(0,-1,0))
for points,uvs,outward in (
 ([(x0,0,z0),(x1,0,z0),(x1,.14,z0),(x0,.14,z0)],[(0,0),(1024,0),(1024,6),(0,6)],(0,0,-1)),
 ([(x1,0,z0),(x1,0,z1),(x1,.14,z1),(x1,.14,z0)],[(0,0),(1024,0),(1024,6),(0,6)],(1,0,0)),
 ([(x1,0,z1),(x0,0,z1),(x0,.14,z1),(x1,.14,z1)],[(0,0),(1024,0),(1024,6),(0,6)],(0,0,1)),
 ([(x0,0,z1),(x0,0,z0),(x0,.14,z0),(x0,.14,z1)],[(0,0),(1024,0),(1024,6),(0,6)],(-1,0,0))):
 yard_slab.face(points,[yard_ground.uv(*uv) for uv in uvs],'ground',outward)
yard_floor=yard_part(yard_slab.finish('machine-yard:dirt-yard',{'ground':yard_ground.material()}))

open_shed_table={
 'photos':{'side':'machine-yard-open-side.jpg','front':'machine-yard-open-front.jpg',
           'rear':'machine-yard-open-rear.jpg','top':'machine-yard-open-top.jpg'},
 'length':19.6,'width':11.1,'height':5.6,
 'side':{'start':20,'end':1000,'ground':313},
 'front':{'centre':512,'ground':477,'top':17},
 'rear':{'centre':512,'ground':481,'top':26},
 'top':{'front':32,'rear':993,'centre':391.5,'along':'x','x_scale':11.1/(664-119)},
 # Remove only the open bay: leave the roof above the eaves, side walls,
 # front frame, and the final metre of rear wall intact.
 'keep':lambda x,y,z:~((np.abs(x)<4.05)&(y<3.0)&(z>-9.8)&(z<8.8)),
 'grey':26,'tolerance':18,'bleed_tolerance':20,'voxel':.09,'target':4100,
 'mask_dir':str(evidence/'masks') if a.render else None,
}
open_body=carve_object('machine-yard:open-shed:body',tex,open_shed_table)
open_body.location=town.game_vector((-12,0,4.5));yard_part(open_body)

closed_shed_table={
 'photos':{'side':'machine-yard-shed-side.jpg','front':'machine-yard-shed-front.jpg',
           'rear':'machine-yard-shed-rear.jpg','top':'machine-yard-shed-top.jpg'},
 'length':10.0,'width':4.6,'height':4.0,
 'side':{'start':24,'end':1000,'ground':640},
 'front':{'centre':512,'ground':672,'top':58},
 'rear':{'centre':512,'ground':672,'top':58},
 'top':{'front':52,'rear':969,'centre':383,'along':'x','x_scale':4.6/(600-163)},
 'grey':26,'tolerance':22,'bleed_tolerance':26,'voxel':.075,'target':2800,
 'mask_dir':str(evidence/'masks') if a.render else None,
}
closed_body=carve_object('machine-yard:store-shed:body',tex,closed_shed_table)
closed_body.location=town.game_vector((11.4,0,5.0));yard_part(closed_body)

# One measured parts pile is carved once and repeated with turned orientations.
pile_table={
 'photos':{'side':'machine-yard-pile-side.jpg','front':'machine-yard-pile-front.jpg',
           'rear':'machine-yard-pile-rear.jpg','top':'machine-yard-pile-top.jpg'},
 'length':4.6,'width':3.8,'height':2.55,
 'side':{'start':30,'end':990,'ground':649},
 'front':{'centre':512,'ground':700,'top':110},
 'rear':{'centre':512,'ground':700,'top':120},
 'top':{'front':102,'rear':921,'centre':512},
 'grey':26,'tolerance':24,'bleed_tolerance':30,'voxel':.07,'target':520,
 'mask_dir':str(evidence/'masks') if a.render else None,
}
pile_body=carve_object('machine-yard:parts-pile-1',tex,pile_table)
pile_body.location=town.game_vector((-1.0,0,-7.0));yard_part(pile_body)
for index,(location,angle) in enumerate((((-1.3,0,-12.0),math.pi/2),((4.3,0,-7.6),-.3)),start=2):
 duplicate=pile_body.copy();duplicate.data=pile_body.data.copy();duplicate.name=f'machine-yard:parts-pile-{index}'
 bpy.context.collection.objects.link(duplicate);duplicate.parent=machine_yard
 duplicate.location=town.game_vector(location);duplicate.rotation_euler[2]=angle;yard_parts.append(duplicate)

# Four low-profile fuel drums. Each is a lathed steel barrel with rolled rims
# and two raised courses, not a cylinder primitive.
def yard_drum(index,x,z):
 mesh=PhotoMesh();stations=[(0,.43),(.045,.48),(.09,.46),(.25,.46),(.29,.49),(.36,.46),(.74,.46),(.80,.49),(.86,.46),(1.12,.46),(1.16,.49),(1.20,.43)]
 def drum_uv(i,d,r,angle):return (angle/(2*math.pi),d/1.2)
 lathe(mesh,'steel',(x,0,z),(0,1,0),(1,0,0),(0,0,1),stations,drum_uv,sides=16)
 drum=yard_part(mesh.finish(f'machine-yard:fuel-drum-{index}',{'steel':steel}))
 return drum
for index,position in enumerate(((-19,-8),(-17,-9.4),(-15.2,-8.6),(16,-8)),start=1):yard_drum(index,*position)

# Reuse the town's credited chain-link reference, trace open diamonds and
# repeat the panel only along the yard's east side.
yard_fence_photo=Photo(tex/'pump-station-fence.jpg');yard_fence_photo.rgb()
yard_trace=np.zeros((76,128),dtype=bool)
def yard_fence_line(start,end):
 x0,y0=start;x1,y1=end;steps=max(abs(x1-x0),abs(y1-y0))
 for step in range(steps+1):
  x=round(x0+(x1-x0)*step/steps);y=round(y0+(y1-y0)*step/steps)
  if 0<=x<128 and 0<=y<76:yard_trace[y,x]=True
yard_trace[5:71,8:11]=True;yard_trace[5:71,117:120]=True
yard_trace[10:12,10:118]=True;yard_trace[66:68,10:118]=True
for start in range(0,121,40):
 yard_fence_line((start,18),(start+40,58));yard_fence_line((start,58),(start+40,18))
yard_mask=np.repeat(np.repeat(yard_trace,8,axis=0),8,axis=1)
yard_mask=np.pad(yard_mask,((0,yard_fence_photo.h-yard_mask.shape[0]),(0,0)))
yard_fence_loops=trace(yard_mask,(40,32,984,576),tolerance=14.0,min_area=80)
if not yard_fence_loops:raise RuntimeError('machine-yard fence trace is empty')
yard_fence_photo.bleed(yard_mask)
yard_fence_scale=3.0/(976-44);yard_fence_centre=(44+976)/2
for panel,centre in enumerate((-13.5,-10.5,-7.5,-4.5,-1.5,1.5,4.5,7.5,10.5,13.5)):
 def fence_world(px,py,depth,centre=centre):
  across=(px-yard_fence_centre)*yard_fence_scale
  up=(565-py)*yard_fence_scale
  return (23.2+depth,up,centre+across)
 mesh=PhotoMesh();slab(mesh,'photo',yard_fence_photo,yard_fence_loops,fence_world,-.035,.035,wall_scale=yard_fence_scale)
 fence=yard_part(mesh.finish(f'machine-yard:fence-panel-{panel+1}',{'photo':yard_fence_photo.material()}))


# Report every exported mesh piece's world bounds for the round review.
bpy.context.view_layer.update()
def owned_mesh(obj):
 parent=obj.parent
 while parent:
  if parent in (crusher,belt_parent,plant,wellhead,radar,turn,pump_station,machine_yard):return True
  parent=parent.parent
 return False
plant_bounds={}
wellhead_bounds={}
radar_bounds={}
pump_station_bounds={}
machine_yard_bounds={}
for obj in sorted((o for o in bpy.context.scene.objects if o.type=='MESH' and owned_mesh(o)),key=lambda o:o.name):
 corners=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
 # Convert Blender XYZ bounds back to the town's glTF XYZ (+Y up).
 corners=[(p.x,p.z,-p.y) for p in corners]
 low=[min(p[i] for p in corners) for i in range(3)];high=[max(p[i] for p in corners) for i in range(3)]
 print(f'PIECE BOUNDS {obj.name}: X[{low[0]:.3f},{high[0]:.3f}] Y[{low[1]:.3f},{high[1]:.3f}] Z[{low[2]:.3f},{high[2]:.3f}]')
 if obj.name.startswith('batch-plant'):
  plant_bounds[obj.name]=(low,high)
  if low[1]<-.08 or low[0]<-15.5 or high[0]>15.5 or low[2]<-15.5 or high[2]>15.5:
   raise RuntimeError(f'{obj.name} leaves the 4 x 4 footprint or ground plane: {low}, {high}')
 if obj.name.startswith('wellhead:'):
  wellhead_bounds[obj.name]=(low,high)
  if low[1]<-.08 or low[0]<-3.5 or high[0]>3.5 or low[2]<-3.5 or high[2]>3.5:
   raise RuntimeError(f'{obj.name} leaves the 1 x 1 footprint or ground plane: {low}, {high}')
 if obj.name.startswith('radar:'):
  radar_bounds[obj.name]=(low,high)
  if low[1]<-.08 or low[0]<-3.5 or high[0]>3.5 or low[2]<-3.5 or high[2]>3.5:
   raise RuntimeError(f'{obj.name} leaves the 1 x 1 footprint or ground plane: {low}, {high}')
 if obj.name.startswith('pump-station:'):
  pump_station_bounds[obj.name]=(low,high)
  if low[1]<-.08 or low[0]<-7.5 or high[0]>7.5 or low[2]<-7.5 or high[2]>7.5:
   raise RuntimeError(f'{obj.name} leaves the 2 x 2 footprint or ground plane: {low}, {high}')
 if obj.name.startswith('machine-yard:'):
  machine_yard_bounds[obj.name]=(low,high)
  if low[1]<-.08 or low[0]<-23.5 or high[0]>23.5 or low[2]<-15.5 or high[2]>15.5:
   raise RuntimeError(f'{obj.name} leaves the 6 x 4 footprint or ground plane: {low}, {high}')
for name,(low,high) in plant_bounds.items():
 grounded=low[1]<=.13
 touching=any(other!=name and all(plant_bounds[other][0][axis]<=high[axis]+.14 and
                                    plant_bounds[other][1][axis]>=low[axis]-.14 for axis in range(3))
              for other in plant_bounds)
 if not (grounded or touching):
  raise RuntimeError(f'{name} touches neither ground nor another batch plant piece: {low}, {high}')
for name,(low,high) in machine_yard_bounds.items():
 grounded=low[1]<=.16
 touching=any(other!=name and all(machine_yard_bounds[other][0][axis]<=high[axis]+.12 and
                                  machine_yard_bounds[other][1][axis]>=low[axis]-.12 for axis in range(3))
              for other in machine_yard_bounds)
 if not (grounded or touching):raise RuntimeError(f'{name} touches neither yard ground nor another piece: {low}, {high}')
 print(f'CONTACT CHECK {name}: {"ground" if grounded else "another piece"}')
machine_yard_triangles=sum(len(poly.vertices)-2 for obj in bpy.context.scene.objects
                           if obj.type=='MESH' and obj.name.startswith('machine-yard:')
                           for poly in obj.data.polygons)
print(f'MACHINE YARD TRIANGLES {machine_yard_triangles} (limit 14000)')
if machine_yard_triangles>14000:raise RuntimeError(f'machine-yard has {machine_yard_triangles} triangles; budget 14000')
for name,(low,high) in radar_bounds.items():
 grounded=low[1]<=.10
 touching=any(other!=name and all(radar_bounds[other][0][axis]<=high[axis]+.12 and
                                    radar_bounds[other][1][axis]>=low[axis]-.12 for axis in range(3))
              for other in radar_bounds)
 if not (grounded or touching):raise RuntimeError(f'{name} touches neither ground nor another radar piece: {low}, {high}')
 print(f'CONTACT CHECK {name}: {"ground" if grounded else "another piece"}')
for name,(low,high) in wellhead_bounds.items():
 grounded=low[1]<=.10
 touching=any(other!=name and all(wellhead_bounds[other][0][axis]<=high[axis]+.10 and
                                    wellhead_bounds[other][1][axis]>=low[axis]-.10 for axis in range(3))
              for other in wellhead_bounds)
 if not (grounded or touching):
  raise RuntimeError(f'{name} touches neither ground nor another wellhead piece: {low}, {high}')
 print(f'CONTACT CHECK {name}: {"ground" if grounded else "another piece"}')
for name,(low,high) in pump_station_bounds.items():
 grounded=low[1]<=.12
 touching=any(other!=name and all(pump_station_bounds[other][0][axis]<=high[axis]+.12 and
                                    pump_station_bounds[other][1][axis]>=low[axis]-.12 for axis in range(3))
              for other in pump_station_bounds)
 if not (grounded or touching):
  raise RuntimeError(f'{name} touches neither ground nor another pump-station piece: {low}, {high}')
 print(f'CONTACT CHECK {name}: {"ground" if grounded else "another piece"}')

# A one-cell ground conveyor is traced from its generated side photograph.
# The color threshold isolates the corroded frame, while the plain-grey sky
# remains open between the braces. Two copies sit on the belt's true sides.
# References: AI-generated by OpenAI ImageGen for TOWN-ART-PLANTS, 7 Nov 2026.
CONVEYOR_LENGTH, CONVEYOR_WIDTH, CONVEYOR_HEIGHT = 8.0, .82, .78
conveyor_photo=Photo(tex/'conveyor-side.jpg')
conveyor_rgb=conveyor_photo.rgb();conveyor_spread=conveyor_rgb.max(axis=2)-conveyor_rgb.min(axis=2)
conveyor_mask=((conveyor_spread>14)|(conveyor_rgb.mean(axis=2)<150))
conveyor_mask[:145,:]=False;conveyor_mask[265:,:]=False
conveyor_mask=tidy(conveyor_mask,2)
conveyor_loops=trace(conveyor_mask,(20,142,1004,264),tolerance=4.0,min_area=30)
if not conveyor_loops:raise RuntimeError('conveyor side frame trace is empty')
conveyor_photo.bleed(conveyor_mask)
def make_conveyor(identifier,with_drum=False):
 parent=bpy.data.objects.new(identifier,None);bpy.context.collection.objects.link(parent);parent.parent=rootobj
 local=[]
 def add(name,mesh,materials):
  obj=mesh.finish(f'{identifier}:{name}',materials);obj.parent=parent;local.append(obj);return obj
 # Side-frame photo X maps exactly across the 8 m module, photo Y to height.
 def side_world(px,py,depth):
  z=(px-512)*(CONVEYOR_LENGTH/984)
  y=max(0,(260-py)*(CONVEYOR_HEIGHT/118))
  return (depth,y,z)
 for hand in (-1,1):
  frame=PhotoMesh();slab(frame,'side',conveyor_photo,conveyor_loops,
      lambda px,py,d,h=hand:side_world(px,py,h*(CONVEYOR_WIDTH/2-.045)+d),-.035,.035,
      wall_scale=CONVEYOR_HEIGHT/118)
  add(f'frame-{"road" if hand<0 else "far"}',frame,{'side':conveyor_photo.material()})
 roller_mesh=PhotoMesh()
 for index in range(13):
  z=-3.6+index*.60
  lathe(roller_mesh,'photo',(0,.761,z),(1,0,0),(0,1,0),(0,0,1),
        [(-.31,.052),(-.28,.066),(.28,.066),(.31,.052)],
        lambda i,d,r,angle:(.1+angle/(2*math.pi)*.8,.72),sides=6)
 add('rollers',roller_mesh,{'photo':conveyor_photo.material()})
 beltmat=bpy.data.materials.new('Conveyor / worn black rubber');beltmat.use_nodes=True
 beltmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.035,.033,.029,1)
 beltmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
 belt=town.cube(f'{identifier}:belt',(0,.84,0),(.56,.026,8.0),beltmat);belt.parent=parent;local.append(belt)
 if with_drum:
  drum=PhotoMesh();lathe(drum,'photo',(0,.761,3.73),(1,0,0),(0,1,0),(0,0,1),
      [(-.33,.11),(-.30,.16),(.30,.16),(.33,.11)],
      lambda i,d,r,angle:(.25+angle/(2*math.pi)*.5,.3),sides=12)
  add('drum',drum,{'photo':conveyor_photo.material()})
 return parent,local
conveyor_root,conveyor_parts=make_conveyor('conveyor')
conveyor_end_root,conveyor_end_parts=make_conveyor('conveyor-end',True)

# Formwork variants use photo-traced timber and concrete surfaces. The source
# photographs were generated separately for this card by OpenAI ImageGen, 7 Nov 2026.
fw_side=Photo(tex/'formwork-side.jpg'); fw_top=Photo(tex/'formwork-top.jpg')
fw_rgb=fw_side.rgb(); fw_spread=fw_rgb.max(axis=2)-fw_rgb.min(axis=2)
# Limit the photo-derived silhouette to the measured continuous timber form.
# Weather grain inside the photo is not separate geometry.
fw_mask=np.zeros(fw_rgb.shape[:2],dtype=bool)
fw_mask[600:990,40:1000]=((fw_rgb[600:990,40:1000,0].astype(np.int16)-
                           fw_rgb[600:990,40:1000,2])>12) & (fw_rgb[600:990,40:1000].mean(axis=2)<220)
fw_mask[fw_mask.shape[0]-1,:]=False
fw_mask=tidy(fw_mask,4)
fw_candidates=trace(fw_mask,(40,600,1000,990),tolerance=10.0,min_area=500)
fw_loops=sorted(fw_candidates,key=lambda loop:abs(sum(a[0]*b[1]-b[0]*a[1]
  for a,b in zip(loop,loop[1:]+loop[:1]))),reverse=True)[:1]
if not fw_loops: raise RuntimeError('formwork side photo trace is empty')
fw_profile_top=min(py for loop in fw_loops for _,py in loop)
fw_profile_ground=max(py for loop in fw_loops for _,py in loop)
if fw_profile_ground<=fw_profile_top: raise RuntimeError('formwork side photo profile has no height')
fw_side.bleed(fw_mask)
fw_top_rgb=fw_top.rgb()
form_roots=[]; form_pieces={}
def make_formwork(identifier,width,depth):
 parent=bpy.data.objects.new(identifier,None);bpy.context.collection.objects.link(parent);parent.parent=rootobj
 pieces=[]
 def add(name,mesh,materials):
  obj=mesh.finish(f'{identifier}:{name}',materials);obj.parent=parent;pieces.append(obj);return obj
 board_h=1.7; board_t=.22; inner_x=width-2*board_t; inner_z=depth-2*board_t
 # Trace and extrude the weathered photographed side profile as real timber walls.
 for hand in (-1,1):
  mesh=PhotoMesh()
  def side_world(px,py,d,h=hand):
   z=(px-520)*(depth/960); y=max(0,(fw_profile_ground-py)*(board_h/(fw_profile_ground-fw_profile_top)))
   return (h*(width/2-board_t/2)+d,y,z)
  slab(mesh,'photo',fw_side,fw_loops,side_world,-.11,.11,
    wall_scale=board_h/(fw_profile_ground-fw_profile_top))
  add('timber-wall-'+str(hand),mesh,{'photo':fw_side.material()})
 # Close the end walls with the same measured profile, rotated across the footprint.
 for hand in (-1,1):
  mesh=PhotoMesh()
  def end_world(px,py,d,h=hand):
   x=(px-520)*(width/960); y=max(0,(fw_profile_ground-py)*(board_h/(fw_profile_ground-fw_profile_top)))
   return (x,y,h*(depth/2-board_t/2)+d)
  slab(mesh,'photo',fw_side,fw_loops,end_world,-.11,.11,
    wall_scale=board_h/(fw_profile_ground-fw_profile_top))
  add('end-wall-'+str(hand),mesh,{'photo':fw_side.material()})
 # Each concrete state uses only its own clean interior crop. Map that crop
 # across small ground tiles, so every tile repeats real wet or set concrete
 # rather than stretching the whole two-state overhead photo over one slab.
 for label,crop,roughness in (
   ('wet',(185,250,455,760),.28),('set',(565,180,825,850),.92)):
  px0,py0,px1,py1=crop
  mesh=PhotoMesh();tile=2.25;surface_y=.93
  x=-inner_x/2
  while x<inner_x/2-1e-5:
   x1=min(x+tile,inner_x/2)
   z=-inner_z/2
   while z<inner_z/2-1e-5:
    z1=min(z+tile,inner_z/2)
    # A partial edge tile uses the same photo patch at its full scale.
    u0,v0=fw_top.uv(px0,py0);u1,v1=fw_top.uv(px1,py1)
    mesh.face(((x,surface_y,z),(x,surface_y,z1),(x1,surface_y,z1),(x1,surface_y,z)),
      ((u0,v0),(u0,v1),(u1,v1),(u1,v0)),'photo',(0,1,0))
    z=z1
   x=x1
  # The concrete is a shallow solid with a tiled photographed top and plain
  # sides hidden behind the form walls.
  add(label,mesh,{'photo':fw_top.material()})
  mat=fw_top.material(roughness=.9).copy();mat.name=f'Formwork {label} concrete'
  mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=roughness
  mesh_obj=next(obj for obj in pieces if obj.name==f'{identifier}:{label}')
  mesh_obj.data.materials.clear();mesh_obj.data.materials.append(mat)
 # Four short bars sit just inside the form corners, from the slab surface up.
 rebar=PhotoMesh()
 for x in (-width*.43,width*.43):
  for z in (-depth*.43,depth*.43):
   lathe(rebar,'photo',(x,surface_y,z),(0,1,0),(1,0,0),(0,0,1),
    [(0,.025),(.58,.025),(.60,.03)],
    lambda i,d,r,angle:(.15+angle/(2*math.pi)*.72,.42),sides=6)
 add('steel-stakes',rebar,{'photo':fw_side.material()})
 # Corner posts close the joints. Timber braces run diagonally across all four
 # walls, matching the deep boxed form in the side photograph.
 for sx in (-1,1):
  for sz in (-1,1):
   post=town.cube(f'{identifier}:corner-post-{sx}-{sz}',
     (sx*(width/2-board_t/2),board_h*.5,sz*(depth/2-board_t/2)),
     (.34,board_h,.34),mats['weathered-plank'],.018)
   post.parent=parent;pieces.append(post)
   for along_x in (True,False):
    if along_x:
     a=(sx*(width/2-.27),.10,sz*(depth/2-.52))
     b=(sx*(width/2-.27),board_h*.78,sz*(depth/2-.12))
    else:
     a=(sx*(width/2-.52),.10,sz*(depth/2-.27))
     b=(sx*(width/2-.12),board_h*.78,sz*(depth/2-.27))
    brace=town.beam(f'{identifier}:corner-brace-{sx}-{sz}-'+('x' if along_x else 'z'),
      a,b,.16,mats['weathered-plank'])
    brace.parent=parent;pieces.append(brace)
 form_roots.append(parent);form_pieces[identifier]=pieces
for identifier,width,depth in (('formwork-1',6.8,6.8),('formwork-2',6.8,14.8),
                               ('formwork-3',14.8,6.8),('formwork-4',14.8,14.8)):
 make_formwork(identifier,width,depth)
for identifier in form_pieces:
 meshes=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.name.startswith(identifier+':')]
 limit=1800 if identifier=='formwork-1' else 5000
 triangles=sum(len(poly.vertices)-2 for obj in meshes for poly in obj.data.polygons)
 print(f'{identifier.upper()} TRIANGLES {triangles} (limit {limit})')
 if triangles>limit: raise RuntimeError(f'{identifier} has {triangles} triangles; budget {limit}')
 for obj in meshes:
  points=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
  low=(min(p.x for p in points),min(p.z for p in points),-max(p.y for p in points))
  high=(max(p.x for p in points),max(p.z for p in points),-min(p.y for p in points))
  print(f'FORMWORK PIECE BOUNDS {obj.name}: X[{low[0]:.3f},{high[0]:.3f}] Y[{low[1]:.3f},{high[1]:.3f}] Z[{low[2]:.3f},{high[2]:.3f}]')
  if low[1]<-.02: raise RuntimeError(f'{obj.name} falls below ground: {low}')
  grounded=low[1]<=.03
  touching=any(other is not obj and all(
   min((other.matrix_world @ Vector(corner))[axis] for corner in other.bound_box)<=max(p[axis] for p in points)+.08 and
   max((other.matrix_world @ Vector(corner))[axis] for corner in other.bound_box)>=min(p[axis] for p in points)-.08
   for axis in range(3)) for other in meshes)
  if not (grounded or touching): raise RuntimeError(f'{obj.name} touches neither ground nor another formwork piece')
  print(f'CONTACT CHECK {obj.name}: {"ground" if grounded else "another piece"}')

for piece_name,objects in (('conveyor',conveyor_parts),('conveyor-end',conveyor_end_parts)):
 bounds=[]
 for obj in objects:
  points=[obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
  low=tuple(round(min(v[i] for v in points),3) for i in range(3));high=tuple(round(max(v[i] for v in points),3) for i in range(3))
  game_low=(low[0],low[2],-high[1]);game_high=(high[0],high[2],-low[1])
  print(f'PIECE BOUNDS {obj.name}: game {game_low} .. {game_high}')
  grounded=low[2] <= .01
  touching=any(other is not obj and all(min((other.matrix_world @ v.co)[i] for v in other.data.vertices)<=high[i]+.04 and
      max((other.matrix_world @ v.co)[i] for v in other.data.vertices)>=low[i]-.04 for i in range(3)) for other in objects)
  if not (grounded or touching):raise RuntimeError(f'{obj.name} touches neither ground nor another conveyor piece')
  print(f'CONTACT CHECK {obj.name}: {"ground" if grounded else "another piece"}')
  bounds.extend(points)
 low=tuple(min(v[i] for v in bounds) for i in range(3));high=tuple(max(v[i] for v in bounds) for i in range(3))
 if high[0]-low[0]>.90 or high[1]-low[1]>8.01 or low[2]<-.01:raise RuntimeError(f'{piece_name} exceeds its 1 x 1 cell footprint: {low} .. {high}')
 triangles=sum(len(poly.vertices)-2 for obj in objects for poly in obj.data.polygons)
 print(f'{piece_name.upper()} TRIANGLES {triangles}')
 if triangles>1800:raise RuntimeError(f'{piece_name} has {triangles} triangles; budget 1800')
for obj in sorted((obj for obj in bpy.context.scene.objects
                   if obj.type=='MESH' and obj.name.startswith('wellhead:')),key=lambda obj:obj.name):
 print(f'PIECE TRIANGLES {obj.name}: {sum(len(poly.vertices)-2 for poly in obj.data.polygons)}')
wellhead_triangles=sum(len(poly.vertices)-2 for obj in bpy.context.scene.objects
                        if obj.type=='MESH' and obj.name.startswith('wellhead:')
                        for poly in obj.data.polygons)
print(f'WELLHEAD TRIANGLES {wellhead_triangles}')
if wellhead_triangles>1800:raise RuntimeError(f'wellhead has {wellhead_triangles} triangles; budget 1800')
radar_triangles=sum(len(poly.vertices)-2 for obj in bpy.context.scene.objects
                    if obj.type=='MESH' and obj.name.startswith('radar:') for poly in obj.data.polygons)
print(f'RADAR TRIANGLES {radar_triangles}')
for obj in sorted((obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.name.startswith('radar:')),key=lambda obj:obj.name):
 print(f'PIECE TRIANGLES {obj.name}: {sum(len(poly.vertices)-2 for poly in obj.data.polygons)}')
if radar_triangles>1800:raise RuntimeError(f'radar has {radar_triangles} triangles; budget 1800')
for obj in sorted((obj for obj in bpy.context.scene.objects
                   if obj.type=='MESH' and obj.name.startswith('pump-station:')),key=lambda obj:obj.name):
 print(f'PIECE TRIANGLES {obj.name}: {sum(len(poly.vertices)-2 for poly in obj.data.polygons)}')
pump_triangles=sum(len(poly.vertices)-2 for obj in bpy.context.scene.objects
                   if obj.type=='MESH' and obj.name.startswith('pump-station:')
                   for poly in obj.data.polygons)
print(f'PUMP STATION TRIANGLES {pump_triangles}')
if pump_triangles>5000:raise RuntimeError(f'pump-station has {pump_triangles} triangles; budget 5000')
# Several photo-carve calls open the same source again before their separate
# edge bleeds. Reuse only byte-identical final images; different bleeds stay
# distinct, so this reduces the GLB without changing any rendered pixels.
image_versions={};deduplicated=0
for material in bpy.data.materials:
 if not material.use_nodes:continue
 for node in material.node_tree.nodes:
  if node.type!='TEX_IMAGE' or not node.image:continue
  image=node.image;width,height=image.size
  pixels=np.empty(width*height*4,dtype=np.float32);image.pixels.foreach_get(pixels)
  key=(width,height,hashlib.sha256(pixels.tobytes()).digest())
  previous=image_versions.get(key)
  if previous is None:image_versions[key]=image
  elif previous!=image:node.image=previous;deduplicated+=1
print(f'IDENTICAL TEXTURE IMAGES REUSED {deduplicated}')
# Keep the family GLB within its 8 MB card budget. Full-resolution source
# photos stay in textures/; only the embedded copies are resampled slightly.
embedded_images={node.image for material in bpy.data.materials if material.use_nodes
                 for node in material.node_tree.nodes if node.type=='TEX_IMAGE' and node.image}
for image in embedded_images:
 width,height=image.size
 if max(width,height)>600:
  image.scale(max(1,round(width*.85)),max(1,round(height*.85)))
print(f'EMBEDDED PHOTO COPIES SCALED TO 85 PERCENT: {sum(max(image.size)>600 for image in embedded_images)}')
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
 bpy.ops.object.light_add(type='AREA',location=town.game_vector((4,14,-5)));bpy.context.object.data.energy=950;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=16
 bpy.ops.object.light_add(type='AREA',location=town.game_vector((-9,9,10)));bpy.context.object.data.energy=650;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=18
 def camera(name,location,target,lens=45):
  data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data);scene.collection.objects.link(cam);cam.location=town.game_vector(location);cam.rotation_euler=(town.game_vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;return cam
 for name,loc,target,lens in [('side-photo-match',(-14,1.55,0),(0,1.55,0),52),('front-three-quarter',(8,5,-9),(0,1.55,0),40),('rear-three-quarter',(-8,5,9),(0,1.55,0),40),('mayor-view',(32,60,-42),(0,1.4,0),220)]:
  cam=camera(name,loc,target,lens);scene.camera=cam;scene.render.filepath=str(evidence/(name+'.png'));evidence.mkdir(parents=True,exist_ok=True);bpy.ops.render.render(write_still=True)
 # Building-only renders use the generated photos' orthographic cameras.
 for node in scene.objects:
  if node.type=='MESH':node.hide_render=not (node.name.startswith('batch-plant') or node.name=='review-only ground')
 def ortho_shot(name,game_eye,game_target,scale,size,roll=0):
  scene.render.resolution_x,scene.render.resolution_y=size
  cam=camera('batch-plant-'+name,game_eye,game_target)
  cam.data.type='ORTHO';cam.data.ortho_scale=scale
  if roll:cam.rotation_euler.rotate_axis('Z',roll)
  scene.camera=cam;scene.render.filepath=str(evidence/('batch-plant-'+name+'.png'))
  bpy.ops.render.render(write_still=True)
 ortho_shot('side', (-30,6,0), (0,6,0),31,(1024,512))
 ortho_shot('front', (0,6,-32), (0,6,0),18,(1024,900))
 ortho_shot('rear', (0,6,32), (0,6,0),18,(1024,900))
 ortho_shot('above', (0,36,0), (0,0,0),31,(1024,512),-math.pi/2)
 camera_specs=[('three-quarter-road',(22,9,-20),(0,5,0),27),
               ('three-quarter-rear',(-20,9,20),(0,5,0),27),
               ('mayor',(-38,53,-38),(0,5,0),42)]
 for name,loc,target,scale in camera_specs:
  cam=camera('batch-plant-'+name,loc,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
  scene.camera=cam;scene.render.resolution_x,scene.render.resolution_y=1000,700
  scene.render.filepath=str(evidence/('batch-plant-'+name+'.png'));bpy.ops.render.render(write_still=True)
 for node in scene.objects:
  if node.type=='MESH':node.hide_render=not (node.name.startswith('wellhead:') or node.name=='review-only ground')
 def well_shot(name,eye,target,scale,size,roll=0):
  scene.render.resolution_x,scene.render.resolution_y=size
  cam=camera('wellhead-'+name,eye,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
  if roll:cam.rotation_euler.rotate_axis('Z',roll)
  scene.camera=cam;scene.render.filepath=str(evidence/('wellhead-'+name+'.png'))
  bpy.ops.render.render(write_still=True)
 well_shot('side',(-24,2.3,0),(0,2.3,0),7.4,(1024,683))
 well_shot('front',(0,2.3,-28),(0,2.3,0),5.0,(1024,936))
 well_shot('rear',(0,2.3,28),(0,2.3,0),5.0,(1024,936))
 well_shot('above',(0,30,0),(0,0,0),7.4,(1024,1024),-math.pi/2)
 well_shot('three-quarter-road',(12,8,-14),(0,2.2,0),7.2,(1000,750))
 well_shot('three-quarter-rear',(-12,8,14),(0,2.2,0),7.2,(1000,750))
 well_shot('mayor',(52,70,-52),(0,2.0,0),10.5,(1000,750))
 for node in scene.objects:
  if node.type=='MESH':node.hide_render=not (node.name.startswith('radar:') or node.name=='review-only ground')
 def radar_shot(name,eye,target,scale,size,roll=0):
  scene.render.resolution_x,scene.render.resolution_y=size
  cam=camera('radar-'+name,eye,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
  if roll:cam.rotation_euler.rotate_axis('Z',roll)
  scene.camera=cam;scene.render.filepath=str(evidence/('radar-'+name+'.png'))
  bpy.ops.render.render(write_still=True)
 radar_shot('side',(26,5.8,0),(0,5.8,0),13.0,(1024,1536))
 radar_shot('front',(0,5.8,-28),(0,5.8,0),13.0,(1024,1536))
 radar_shot('rear',(0,5.8,28),(0,5.8,0),13.0,(1024,1536))
 radar_shot('above',(0,28,0),(0,0,0),7.4,(1024,1024),-math.pi/2)
 radar_shot('three-quarter-road',(13,11,-15),(0,5.8,0),15.0,(1000,750))
 radar_shot('three-quarter-rear',(-13,11,15),(0,5.8,0),15.0,(1000,750))
 radar_shot('mayor',(46,67,-46),(0,5.8,0),16.0,(1000,750))
 for node in scene.objects:
  if node.type=='MESH':node.hide_render=not (node.name=='pump-station:body' or node.name=='review-only ground')
 def pump_shot(name,eye,target,scale,size,roll=0):
  scene.render.resolution_x,scene.render.resolution_y=size
  cam=camera('pump-station-'+name,eye,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
  if roll:cam.rotation_euler.rotate_axis('Z',roll)
  scene.camera=cam;scene.render.filepath=str(evidence/('pump-station-'+name+'.png'))
  bpy.ops.render.render(write_still=True)
 # These four renders match the bare-body photos at the same orthographic cameras.
 pump_shot('match-side',(24,2.875,0),(0,2.875,0),13.6,(1024,683))
 pump_shot('match-front',(0,2.875,-24),(0,2.875,0),11.2,(1024,683))
 pump_shot('match-rear',(0,2.875,24),(0,2.875,0),10.5,(1024,683))
 pump_shot('match-above',(0,28,0),(0,0,0),12.0,(1024,1024))
 for node in scene.objects:
  if node.type=='MESH':node.hide_render=not (node.name.startswith('pump-station:') or node.name=='review-only ground')
 pump_shot('three-quarter-road',(18,10,-22),(0,2.8,0),19.5,(1000,700))
 pump_shot('three-quarter-yard',(-18,10,22),(0,2.8,0),19.5,(1000,700))
 pump_shot('mayor',(36,56,-36),(0,2.8,0),22.0,(1000,700))
 for identifier in ('conveyor','conveyor-end'):
  for node in scene.objects:
   if node.type=='MESH':node.hide_render=not (node.name.startswith(identifier+':') or node.name=='review-only ground')
  for view,eye,target,scale,size in (
      ('side',(16,.42,0),(0,.42,0),9.6,(1024,341)),
      ('front',(0,.42,-18),(0,.42,0),3.8,(1024,341)),
      ('rear',(0,.42,18),(0,.42,0),3.8,(1024,341)),
      ('above',(0,20,0),(0,0,0),9.6,(1024,341))):
   cam=camera(identifier+'-'+view,eye,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
   scene.camera=cam;scene.render.resolution_x,scene.render.resolution_y=size
   scene.render.filepath=str(evidence/(identifier+'-'+view+'.png'));bpy.ops.render.render(write_still=True)
 for identifier,width,depth in (('formwork-1',6.8,6.8),('formwork-2',6.8,14.8),
                                ('formwork-3',14.8,6.8),('formwork-4',14.8,14.8)):
  for node in scene.objects:
   if node.type=='MESH':node.hide_render=not (node.name.startswith(identifier+':') or node.name=='review-only ground')
  span=max(width,depth)
  for view,eye,target,scale,size in (
    ('side',(span*1.7,.8,0),(0,.8,0),span*1.1,(1024,600)),
    ('front',(0,.8,-span*1.7),(0,.8,0),span*1.1,(1024,600)),
    ('rear',(0,.8,span*1.7),(0,.8,0),span*1.1,(1024,600)),
    ('above',(0,span*2,0),(0,0,0),span*1.35,(1024,800)),
    ('three-quarter-road',(span*1.3,span*.9,-span*1.3),(0,.8,0),span*2.15,(1000,750)),
    ('three-quarter-rear',(-span*1.3,span*.9,span*1.3),(0,.8,0),span*2.15,(1000,750)),
    ('mayor',(span*1.5,span*2,-span*1.5),(0,.8,0),span*2.5,(1000,750))):
   cam=camera(identifier+'-'+view,eye,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
   scene.camera=cam;scene.render.resolution_x,scene.render.resolution_y=size
   scene.render.filepath=str(evidence/(identifier+'-'+view+'.png'));bpy.ops.render.render(write_still=True)
  for view,eye,target,scale in (
      ('three-quarter-road',(11,6,-12),(0,.4,0),10),
      ('three-quarter-yard',(-11,6,12),(0,.4,0),10),
      ('mayor',(30,45,-30),(0,.4,0),16)):
   cam=camera(identifier+'-'+view,eye,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
   scene.camera=cam;scene.render.resolution_x,scene.render.resolution_y=1000,700
   scene.render.filepath=str(evidence/(identifier+'-'+view+'.png'));bpy.ops.render.render(write_still=True)
 # Isolate the machine yard after import from the exported GLB. The four body
 # matches use the same orthographic views as their source photos; the three
 # scene views show the full yard with its buildings and loose pieces.
 for node in scene.objects:
  if node.type=='MESH':node.hide_render=not (node.name=='machine-yard:open-shed:body' or node.name=='review-only ground')
 def yard_shot(name,eye,target,scale,size,roll=0):
  cam=camera('machine-yard-'+name,eye,target);cam.data.type='ORTHO';cam.data.ortho_scale=scale
  if roll:cam.rotation_euler.rotate_axis('Z',roll)
  scene.camera=cam;scene.render.resolution_x,scene.render.resolution_y=size
  scene.render.filepath=str(evidence/('machine-yard-'+name+'.png'));bpy.ops.render.render(write_still=True)
 yard_shot('match-side',(-42,2.8,4.5),(-12,2.8,4.5),20.5,(1024,341))
 yard_shot('match-front',(-12,2.8,-30),(-12,2.8,4.5),12.6,(1024,512))
 yard_shot('match-rear',(-12,2.8,39),(-12,2.8,4.5),12.6,(1024,508))
 yard_shot('match-above',( -12,35,4.5),(-12,0,4.5),20.8,(1024,781),-math.pi/2)
 for node in scene.objects:
  if node.type=='MESH':node.hide_render=not (node.name.startswith('machine-yard:') or node.name=='review-only ground')
 yard_shot('three-quarter-road',(29,24,-34),(0,1.6,0),54.0,(1000,700))
 yard_shot('three-quarter-yard',(-31,23,31),(0,1.6,0),54.0,(1000,700))
 yard_shot('mayor',(46,70,-48),(0,1.0,0),62.0,(1000,700))
