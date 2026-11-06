"""Rattler photo-measured model, round 7.

Run with Blender 4.5: blender -b -t 4 --python-exit-code 1 --python tools/blender/rattler-photo.py -- --root .
The four measured reference photos are kept in .evidence/car-art-rattler/.
"""
import argparse, json, math, struct, sys
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);parser.add_argument('--paths-only',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(args.root).resolve()
out=root/'public/assets/models/wasteland/cars/rattler.glb';ev=root/'.evidence/car-art-rattler';evidence=ev;renders=root/'.qa-dist/rattler-photo';blend=root/'art-build/cars/rattler-photo.blend'
if args.paths_only: print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'evidence':[str(evidence)],'renders':[str(renders)]}));raise SystemExit(0)
import bpy, numpy as np
from mathutils import Vector
sys.path.insert(0,str(root/'tools/blender'))
from photo_model import Mesh,Photo,box,lathe,slab,tidy,trace
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.engine='BLENDER_EEVEE_NEXT'
ev.mkdir(parents=True,exist_ok=True);evidence.mkdir(parents=True,exist_ok=True);renders.mkdir(parents=True,exist_ok=True);out.parent.mkdir(parents=True,exist_ok=True)
side=Photo(ev/'side.jpg');front=Photo(ev/'front.jpg');rear=Photo(ev/'rear.jpg');top=Photo(ev/'top.jpg')
# Mask screenshots are saved for direct review. The slightly blue studio field needs grey=26.
masks={}
for name,p,seeds in [('side',side,[(8,8),(535,8),(535,710)]),('front',front,[(8,8),(535,8)]),('rear',rear,[(8,8),(535,8)]),('top',top,[(8,8),(535,8)])]:
    masks[name]=tidy(~p.sky(seeds,grey=26),2)
    im=bpy.data.images.new('Photo.sky mask '+name,p.w,p.h,alpha=False);a=masks[name][::-1].astype(np.float32);im.pixels.foreach_set(np.dstack((a,a,a,np.ones_like(a))).ravel());im.filepath_raw=str(renders/f'mask-{name}.png');im.file_format='PNG';im.save()
materials={k:p.material(.94) for k,p in [('side',side),('front',front),('rear',rear),('top',top)]}
mesh=Mesh()
# Pixel calibration: the wheel diameters measure 184 px (front) and 220 px (rear).
# Side view is 4.5 m overall across about 520 px; width views have their own scale.
S=.0086; V=.0060; CX=270; FLOOR=510
def side_world(px,py,d): return (d,(FLOOR-py)*V,(CX-px)*S)
def front_world(px,py,d): return ((px-front.w/2)*.0039,(FLOOR-py)*V,d)
def rear_world(px,py,d): return ((px-rear.w/2)*.0039,(FLOOR-py)*V,d)
# Closed body side panels are separately measured around the cab, exposed engine,
# front wings and plank bed. Each picture region is used once per panel face.
regions={'cab':(190,160,360,500),'engine_bay':(22,275,200,475),'front_wing':(22,365,135,510),'bed_side':(350,285,535,475)}
for name,rect in regions.items():
    loops=trace(masks['side'],rect,tolerance=2.0,min_area=90)
    if loops:
        slab(mesh,'side',side,loops,side_world,-.91,.91,wall_scale=S)
# Rear view cab and bed establish full width and close the shell ends.
for label,p,mask,fn,rect,z0,z1 in [('front',front,masks['front'],front_world,(80,150,460,500),1.43,1.49),('rear',rear,masks['rear'],rear_world,(80,150,460,500),-1.65,-1.59)]:
    loops=trace(mask,rect,tolerance=2.0,min_area=110)
    if loops: slab(mesh,label,p,loops,fn,z0,z1,wall_scale=.0039)
# The top photo covers the full vehicle plan; keep its different heights separate.
top_solid=masks['top']
def top_world(px,py,y): return ((px-top.w/2)*.0072,y,(410-py)*.0072)
for cap_name,rect,y0,y1 in [('cab roof',(185,235,350,435),1.98,2.03),
                            ('bonnet',(205,75,335,240),1.06,1.11),
                            ('plank bed floor',(205,435,345,675),.78,.83)]:
    cap_loops=trace(top_solid,rect,tolerance=2.2,min_area=80)
    if cap_loops:
        cap=Mesh();slab(cap,'top',top,cap_loops,top_world,y0,y1,wall_scale=.0039)
        cap.finish('Rattler '+cap_name+' photo-measured',materials)
# The measured wheels are separate round parts centered at the two axles.
wheel_specs=[('front-left',80,.45,1.50,.91,.20),('front-right',80,.45,1.50,-.91,.20),('rear-left',458,.54,-1.02,.91,.28),('rear-right',458,.54,-1.02,-.91,.28)]
wheel_meshes=[]
for name,px,r,z,x,width in wheel_specs:
    wheel=Mesh()
    # Wheel centre inferred from side-photo face; +Z is the truck's front.
    wz=(CX-px)*S
    def tire_uv(i,d,rad,a,px=px,cy=FLOOR-r/V,r=r):
        # 0.85 arc contraction avoids outline pixels around the measured tire.
        arc=.85*math.degrees(math.asin(max(-1,min(1,math.sin(a)))))/90
        return side.uv(px+rad/V*arc,cy-rad/V*math.cos(a))
    lathe(wheel,'side',(x,r,wz),(1,0,0),(0,0,1),(0,1,0),[(-width/2,r*.82),(-width*.34,r), (width*.34,r),(width/2,r*.82)],tire_uv,sides=32,
          cap_start=('front',lambda a,f,px=px,cy=FLOOR-r/V,r=r:front.uv(front.w/2+math.cos(a)*f*r/.0039,cy-math.sin(a)*f*r/V)),
          cap_end=('front',lambda a,f,px=px,cy=FLOOR-r/V,r=r:front.uv(front.w/2+math.cos(a)*f*r/.0039,cy-math.sin(a)*f*r/V)))
    wheel_meshes.append((name,wheel))
# Hood, chassis rails, grille, headlights and short exhausts are measured picture rectangles.
blocks=Mesh()
def rect(photo,boxpx): return ('side',photo,boxpx)
box(blocks,-.73,.73,.72,1.13,1.48,2.05,{'+z':('front',front,(185,270,355,455)),'-z':('rear',rear,(185,270,355,455)),'+y':('top',top,(130,155,410,280)),'+x':rect(side,(90,300,150,400)),'-x':rect(side,(90,300,150,400))})
box(blocks,-.66,.66,.37,.49,-1.68,1.48,{'+y':('top',top,(115,380,420,620)),'+z':('front',front,(185,430,355,475)),'-z':('rear',rear,(185,430,355,475))})
mesh.verts.extend(blocks.verts);mesh.faces.extend(blocks.faces)
# Give each box face its source image material (the box kit uses named photo keys).
materials.update({'front':front.material(),'rear':rear.material(),'top':top.material()})
# Lathed grille lamps and exhaust ends; all arcs contract away from edge pixels.
for x in (-.64,.64):
    lathe(mesh,'front',(x,.76,1.51),(0,0,1),(1,0,0),(0,1,0),[(0,.13),(.10,.13)],lambda i,d,r,a:front.uv(front.w/2+math.cos(a)*r/.0039*.85,344-math.sin(a)*r/S*.85),sides=20,cap_start=('front',lambda a,f:front.uv(front.w/2+math.cos(a)*f*35,344-math.sin(a)*f*35)))
for x in (-.48,.48):
    lathe(mesh,'side',(x,.51,1.33),(0,1,0),(1,0,0),(0,0,1),[(0,.045),(.68,.045)],lambda i,d,r,a:side.uv(196+math.cos(a)*r/S*.85,370-d/S),sides=12)
# Materials by face key; the separate box keeps its named picture mapping.
materials.update({'front':front.material(),'rear':rear.material(),'top':top.material()})
car=bpy.data.objects.new('rattler',None);scene.collection.objects.link(car);car['vehicle_id']='rattler';car['units']='metres';car['forward']='+Z';car['up']='+Y'
body=mesh.finish('Rattler photo-measured shell',materials);body.parent=car
for name,wheel in wheel_meshes:
    obj=wheel.finish('wheel '+name,materials);obj.parent=car
# Eight contract sockets are explicit nodes in the exported hierarchy.
for key,loc in {'front':(0,.48,2.31),'rear':(0,.48,-1.69),'roof':(0,2.08,-.3),'hood':(0,1.30,.5),'left':(1.10,1.0,0),'right':(-1.10,1.0,0),'door':(1.0,1.0,-.12),'shield':(0,1.13,0)}.items():
    o=bpy.data.objects.new('vehicle-socket-'+key,None);scene.collection.objects.link(o);o.parent=car;o.location=loc
# Export vehicle hierarchy and validate its portable UVs, dimensions and polygon budget.
blend.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='DESELECT');car.select_set(True)
for o in list(car.children):o.select_set(True)
bpy.context.view_layer.objects.active=car;bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=False,export_apply=True)
raw=out.read_bytes();jl=int.from_bytes(raw[12:16],'little');gltf=json.loads(raw[20:20+jl].decode('utf-8').rstrip('\0 '));tri=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf.get('meshes',[]) for p in m['primitives'] if 'indices' in p)
readback={n.get('name'):n for n in gltf.get('nodes',[])}
socket_names={f'vehicle-socket-{key}' for key in ('front','rear','roof','hood','left','right','door','shield')}
wheel_names={f'wheel {name}' for name, *_ in wheel_specs}
if not socket_names.issubset(readback): raise RuntimeError(f'GLB socket readback missing: {sorted(socket_names-set(readback))}')
if not wheel_names.issubset(readback): raise RuntimeError(f'GLB wheel readback missing: {sorted(wheel_names-set(readback))}')
if len({readback[name].get('mesh') for name in wheel_names}) != 4: raise RuntimeError('GLB wheels are not four separate meshes')
for name in wheel_names:
    node=readback[name];primitive=gltf['meshes'][node['mesh']]['primitives'][0]
    bounds=gltf['accessors'][primitive['attributes']['POSITION']]
    diameter=bounds['max'][2]-bounds['min'][2]
    expected=.9 if 'front' in name else 1.08
    if abs(diameter-expected)>.015: raise RuntimeError(f'{name} exported diameter {diameter:.4f} m, expected {expected:.2f} m')
if tri>25000 or out.stat().st_size>8*1024*1024: raise RuntimeError(f'budget exceeded: {tri} triangles, {out.stat().st_size} bytes')
for m in gltf.get('meshes',[]):
    for prim in m['primitives']:
        uv=[k for k in prim['attributes'] if k.startswith('TEXCOORD_')]
        if uv!=['TEXCOORD_0']: raise RuntimeError(f'bad UV attributes {uv}')
for mat in gltf.get('materials',[]):
    if mat.get('pbrMetallicRoughness',{}).get('metallicFactor',0)>.3: raise RuntimeError('metallic over .3')
(renders/'manifest.json').write_text(json.dumps({'id':'rattler','dimensions_m':[2.12,4.52,2.08],'wheel_radius_m':[.45,.54],'triangles':tri,'bytes':out.stat().st_size,'sockets':sorted(socket_names),'wheels':sorted(wheel_names),'readback':'GLB nodes and wheel POSITION bounds checked'},indent=2)+'\n')
# Required review views come from a fresh scene containing only the exported GLB.
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=820;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard'
world=bpy.data.worlds.new('Flat pale photo review');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.72,.72,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8;scene.world=world
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(out));imported=[o for o in bpy.data.objects if o not in before]
roots=[o for o in imported if o.parent not in imported];carroot=bpy.data.objects.new('Imported Rattler GLB',None);scene.collection.objects.link(carroot);carroot.rotation_euler.x=-math.pi/2
for obj in roots:obj.parent=carroot
# Use the game's Cinder model as the 1.72 m scale reference.
person_before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/wasteland/crew/cinder.glb'))
person_parts=[o for o in bpy.data.objects if o not in person_before];person_roots=[o for o in person_parts if o.parent not in person_parts]
person_meshes=[o for o in person_parts if o.type=='MESH'];bounds=[o.matrix_world@Vector(c) for o in person_meshes for c in o.bound_box]
min_z=min(p.z for p in bounds);height=max(p.z for p in bounds)-min_z
person=bpy.data.objects.new('review-only 1.72 m Cinder scale',None);scene.collection.objects.link(person);person.rotation_euler.x=-math.pi/2;person.scale=(1.72/max(height,.001),)*3;person.location=(-1.8,-min_z*person.scale.x,0)
for obj in person_roots:obj.parent=person
floor_mat=bpy.data.materials.new('flat grey floor');floor_mat.diffuse_color=(.48,.48,.48,1);floor_mat.use_nodes=True;floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.48,.48,.48,1);floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
bpy.ops.mesh.primitive_plane_add(size=100,location=(0,-.02,0),rotation=(math.pi/2,0,0));bpy.context.object.data.materials.append(floor_mat)
def aim(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
for loc,power,size in [((-4,5,5),900,5),((4,4,-4),700,5),((0,6,1),450,6)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(0,.8,0))
views=[('photo-side',(-8,1.2,0),(0,.75,0),5.2),('photo-front',(0,1.2,7),(0,.75,0),5.0),('photo-rear',(0,1.2,-7),(0,.75,0),5.0),('photo-top',(0,8,0),(0,.75,0),5.0),('front-three-quarter',(-5,3,6),(0,.8,0),5.3),('rear-three-quarter',(5,3,-6),(0,.8,0),5.3),('beside-person',(-5,2.8,6),(-.5,.8,0),5.8)]
for name,loc,target,scale in views:
    for obj in person_parts:obj.hide_render=(name!='beside-person')
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=scale;aim(cam,target);scene.camera=cam;scene.render.filepath=str(renders/(name+'.png'));bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
print('Clean-scene GLB renders written:',', '.join(name for name,_,_,_ in views))
print(f'Rattler exported: {tri} triangles, {out.stat().st_size} bytes')
