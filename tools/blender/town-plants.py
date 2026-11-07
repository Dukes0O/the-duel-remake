"""Round 1: a portable jaw crusher for the Wasteland town plant family.

Builds the exported candidate and review renders from that GLB. Coordinates
use town_base's metre API: +Y up, front -Z.
"""
import argparse, math, sys
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
from photo_model import Photo, Mesh as PhotoMesh, trace, slab, lathe
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
# The generated studio grey is below Photo.sky's 185 edge-seed threshold.
# Brighten a temporary RGB mask only, then restore the real photo pixels.
original_side_rgb=well_side._rgb
temporary_mask_rgb=np.clip(side_rgb.astype(np.int16)+46,0,255).astype(np.int16)
well_side._rgb=temporary_mask_rgb
side_sky=well_side.sky([(8,8),(1015,8),(8,674),(1015,674)],tolerance=28,grey=24)
well_side._rgb=original_side_rgb
yy,xx=np.ogrid[:well_side.h,:well_side.w]
# Paint-worn steel stays within the actual diagonal members; the center bays
# remain open. Separate rectangular bands preserve the measured cross-ties.
left_rail=(yy>=204)&(yy<=612)&(xx>=425+(612-yy)*.17)&(xx<=462+(612-yy)*.16)
right_rail=(yy>=204)&(yy<=612)&(xx>=644-(612-yy)*.19)&(xx<=687-(612-yy)*.14)
base_rail=(yy>=604)&(yy<=649)&(xx>=65)&(xx<=946)
frame_mask=(~side_sky)&(left_rail|right_rail|base_rail)
frame_loops=trace(frame_mask,(55,190,955,655),tolerance=2.8,min_area=75)
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
beam_loops=trace(beam_mask,(258,10,850,445),tolerance=2.4,min_area=90)
if not beam_loops:raise RuntimeError('wellhead beam trace is empty')
BEARING_Y=(WELL_GROUND-153)*WELL_SCALE
BEARING_Z=well_z(552)
beam_mesh=PhotoMesh();slab(beam_mesh,'side',well_side,beam_loops,well_side_world,-.20,.20,wall_scale=WELL_SCALE)
beam_mesh.verts=[(vertex[0],vertex[1]-BEARING_Y,vertex[2]-BEARING_Z) for vertex in beam_mesh.verts]
beam_obj=beam_mesh.finish('wellhead:beam-surface',{'side':well_side.material()})
beam_pivot=bpy.data.objects.new('wellhead:beam',None);bpy.context.collection.objects.link(beam_pivot)
beam_pivot.parent=wellhead;beam_pivot.location=town.game_vector((0,BEARING_Y,BEARING_Z));beam_obj.parent=beam_pivot
wellhead_parts.append(beam_obj)

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
      [(-.07,.60),(-.07,.67),(.07,.67),(.07,.60)],side_uv,sides=12)
hub_obj=hub.finish('wellhead:flywheel-rim',{'side':dark});well_attach(hub_obj)
hub_center=PhotoMesh()
lathe(hub_center,'side',(-.78,FLYWHEEL_Y,FLYWHEEL_Z),(1,0,0),(0,1,0),(0,0,1),
      [(-.10,.06),(.10,.06)],side_uv,sides=12,
      cap_start=('side',lambda a,f:well_side.uv(310+math.cos(a)*f*18,455+math.sin(a)*f*18)),
      cap_end=('side',lambda a,f:well_side.uv(310+math.cos(a)*f*18,455+math.sin(a)*f*18)))
hub_center_obj=hub_center.finish('wellhead:flywheel-hub',{'side':dark});well_attach(hub_center_obj)
for index in range(8):
 angle=index*math.pi/4
 end_y=FLYWHEEL_Y+math.sin(angle)*.58;end_z=FLYWHEEL_Z+math.cos(angle)*.58
 well_beam(f'wellhead:flywheel-spoke-{index+1}',(-.78,FLYWHEEL_Y,FLYWHEEL_Z),(-.78,end_y,end_z),.065,dark)
motor=PhotoMesh()
lathe(motor,'side',(0,.78,well_z(172)),(0,1,0),(1,0,0),(0,0,1),
      [(0,.24),(.08,.34),(.70,.34),(.80,.25)],
      lambda i,d,r,ang:well_side.uv(160+math.cos(ang)*r/WELL_SCALE,535-d/WELL_SCALE),sides=12,
      cap_start=('side',lambda a,f:well_side.uv(160+math.cos(a)*f*32,535)),
      cap_end=('side',lambda a,f:well_side.uv(160+math.cos(a)*f*32,470)))
motor_obj=motor.finish('wellhead:motor',{'side':well_side.material()});well_attach(motor_obj)
well_beam('wellhead:motor-stand',(0,.08,well_z(172)),(0,.92,well_z(172)),.14,dark)

# The casing and valve are turned profiles, not boxes. The casing reaches the
# ground and its crown joins the polished rod; a lathed handwheel and spokes
# sit beside its branch pipe.
CASING_Z=well_z(814)
casing=PhotoMesh()
lathe(casing,'side',(0,0,CASING_Z),(0,1,0),(1,0,0),(0,0,1),
      [(.06,.34),(.10,.39),(.18,.39),(.24,.30),(.98,.30),(1.07,.35),(1.13,.35),(1.18,.26)],
      lambda i,d,r,a:well_side.uv(850+(math.cos(a)+math.sin(a))*r/(math.sqrt(2)*WELL_SCALE),WELL_GROUND-d/WELL_SCALE),sides=16,
      cap_start=('side',lambda a,f:well_side.uv(814+math.cos(a)*f*44,630)),
      cap_end=('side',lambda a,f:well_side.uv(814+math.cos(a)*f*31,480)))
casing_obj=casing.finish('wellhead:casing',{'side':well_side.material()});well_attach(casing_obj)
valve=PhotoMesh()
lathe(valve,'side',(0,.90,CASING_Z-.30),(0,0,1),(1,0,0),(0,1,0),
      [(-.20,.14),(-.15,.23),(-.07,.23),(.12,.16),(.25,.12),(.36,.12),(.42,.18),(.49,.18)],
      lambda i,d,r,a:well_side.uv(814+math.cos(a)*r/WELL_SCALE,WELL_GROUND-(.90+math.sin(a)*r)/WELL_SCALE),sides=12)
valve_obj=valve.finish('wellhead:valve',{'side':well_side.material()});well_attach(valve_obj)
well_beam('wellhead:valve-stem',(-.18,1.04,CASING_Z-.02),(-.56,1.04,CASING_Z-.02),.07,dark)
wheel=PhotoMesh()
lathe(wheel,'side',(-.56,1.04,CASING_Z-.02),(1,0,0),(0,1,0),(0,0,1),
      [(-.035,.18),(-.02,.24),(.02,.24),(.035,.18)],
      lambda i,d,r,a:well_side.uv(894+math.cos(a)*r/WELL_SCALE,446+math.sin(a)*r/WELL_SCALE),sides=12)
wheel_obj=wheel.finish('wellhead:valve-handwheel',{'side':well_side.material()});well_attach(wheel_obj)
for index in range(4):
 angle=index*math.pi/2
 y=1.04+math.sin(angle)*.205;z=CASING_Z-.02+math.cos(angle)*.205
 well_beam(f'wellhead:valve-spoke-{index+1}',(-.56,1.04,CASING_Z-.02),(-.56,y,z),.035,dark)

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


# Report every exported mesh piece's world bounds for the round review.
bpy.context.view_layer.update()
def owned_mesh(obj):
 parent=obj.parent
 while parent:
  if parent in (crusher,belt_parent,plant,wellhead):return True
  parent=parent.parent
 return False
plant_bounds={}
wellhead_bounds={}
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
for name,(low,high) in plant_bounds.items():
 grounded=low[1]<=.13
 touching=any(other!=name and all(plant_bounds[other][0][axis]<=high[axis]+.14 and
                                    plant_bounds[other][1][axis]>=low[axis]-.14 for axis in range(3))
              for other in plant_bounds)
 if not (grounded or touching):
  raise RuntimeError(f'{name} touches neither ground nor another batch plant piece: {low}, {high}')
 print(f'CONTACT CHECK {name}: {"ground" if grounded else "another piece"}')
for name,(low,high) in wellhead_bounds.items():
 grounded=low[1]<=.10
 touching=any(other!=name and all(wellhead_bounds[other][0][axis]<=high[axis]+.10 and
                                    wellhead_bounds[other][1][axis]>=low[axis]-.10 for axis in range(3))
              for other in wellhead_bounds)
 if not (grounded or touching):
  raise RuntimeError(f'{name} touches neither ground nor another wellhead piece: {low}, {high}')
 print(f'CONTACT CHECK {name}: {"ground" if grounded else "another piece"}')
for obj in sorted((obj for obj in bpy.context.scene.objects
                   if obj.type=='MESH' and obj.name.startswith('wellhead:')),key=lambda obj:obj.name):
 print(f'PIECE TRIANGLES {obj.name}: {sum(len(poly.vertices)-2 for poly in obj.data.polygons)}')
wellhead_triangles=sum(len(poly.vertices)-2 for obj in bpy.context.scene.objects
                        if obj.type=='MESH' and obj.name.startswith('wellhead:')
                        for poly in obj.data.polygons)
print(f'WELLHEAD TRIANGLES {wellhead_triangles}')
if wellhead_triangles>1800:raise RuntimeError(f'wellhead has {wellhead_triangles} triangles; budget 1800')
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
