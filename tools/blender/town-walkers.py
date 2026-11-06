"""Build the compact Wasteland town walker family and review views.

Run: blender -b --python tools/blender/town-walkers.py -- --root . --render .evidence/DATE/TOWN-ART-WALKERS
Game coordinates are metres, X right, Y up, front -Z. Blender stays Z-up.
"""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
out=root/'public/assets/models/wasteland/town/walkers.glb';blend=root/'art-build/town/walkers.blend'
render=Path(a.render);render=render if render.is_absolute() else root/render
if a.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'evidence':[str(render)] if a.render else []}));raise SystemExit(0)

import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;out.parent.mkdir(parents=True,exist_ok=True);blend.parent.mkdir(parents=True,exist_ok=True)
texture_dir=root/'public/assets/models/wasteland/town/textures'
materials=town.make_materials({
    'patched-canvas':str(texture_dir/'canvas-patched-cream.jpg'),
    # People need cloth at this slot; the wood tile would make coats look like timber.
    'weathered-plank':str(texture_dir/'patched-canvas.jpg'),
    'rusted-steel':str(texture_dir/'red-oxide.jpg'),
    'galvanised-tin':str(texture_dir/'rusted-corrugated-tin.jpg'),
    'faded-hand-paint':str(texture_dir/'faded-yellow-steel.jpg'),
    'iron-dark':str(texture_dir/'machine-wear.jpg'),
    'sand':str(texture_dir/'wet-brown-earth.jpg'),
})
import numpy as np
texture_tint={'patched-canvas':(.47,.41,.34),'weathered-plank':(.54,.46,.36),'rusted-steel':(.56,.38,.27),
              'galvanised-tin':(.62,.60,.55),'faded-hand-paint':(.57,.50,.38),'iron-dark':(.68,.66,.60),'sand':(.62,.55,.44)}
seen=set()
for mat_name,mat in materials.items():
    image=next((node.image for node in mat.node_tree.nodes if node.type=='TEX_IMAGE' and node.image),None)
    if image and image.name not in seen:
        image.scale(192,192);seen.add(image.name)
        px=np.empty(192*192*4,dtype=np.float32);image.pixels.foreach_get(px);px=px.reshape((192,192,4))
        px[:,:,:3]*=np.array(texture_tint.get(mat_name,(.60,.57,.52)),dtype=np.float32)[None,None,:]
        image.pixels.foreach_set(px.ravel());image.pack()
white=bpy.data.images.load(str(texture_dir/'container-white.jpg'),check_existing=False);white.scale(192,192)
white.filepath_raw=str(texture_dir/'container-white.jpg');white.file_format='JPEG'
white_mat=bpy.data.materials.new('Town walker / faded white workwear');white_mat.diffuse_color=(.72,.70,.63,1);white_mat.use_nodes=True
white_bs=white_mat.node_tree.nodes.get('Principled BSDF');white_bs.inputs['Metallic'].default_value=0;white_bs.inputs['Roughness'].default_value=.92
white_tex=white_mat.node_tree.nodes.new('ShaderNodeTexImage');white_tex.image=white;white_tex.extension='REPEAT'
white_mat.node_tree.links.new(white_tex.outputs['Color'],white_bs.inputs['Base Color'])
white.pack();materials['container-white']=white_mat
blue=bpy.data.images.load(str(texture_dir/'paint-blue.jpg'),check_existing=False);blue.scale(192,192);blue.pack()
blue_mat=bpy.data.materials.new('Town walker / chipped blue paint');blue_mat.diffuse_color=(.22,.34,.39,1);blue_mat.use_nodes=True
blue_bs=blue_mat.node_tree.nodes.get('Principled BSDF');blue_bs.inputs['Metallic'].default_value=0;blue_bs.inputs['Roughness'].default_value=.9
blue_tex=blue_mat.node_tree.nodes.new('ShaderNodeTexImage');blue_tex.image=blue;blue_tex.extension='REPEAT'
blue_mat.node_tree.links.new(blue_tex.outputs['Color'],blue_bs.inputs['Base Color']);materials['paint-blue']=blue_mat
skin_mat=bpy.data.materials.new('Town walker / sunlit skin');skin_mat.diffuse_color=(.31,.22,.16,1);skin_mat.use_nodes=True
skin_bs=skin_mat.node_tree.nodes.get('Principled BSDF');skin_bs.inputs['Base Color'].default_value=(.31,.22,.16,1);skin_bs.inputs['Roughness'].default_value=.9;materials['walker-skin']=skin_mat
face_mat=bpy.data.materials.new('Town walker / dark face detail');face_mat.diffuse_color=(.035,.024,.018,1);face_mat.use_nodes=True
face_bs=face_mat.node_tree.nodes.get('Principled BSDF');face_bs.inputs['Base Color'].default_value=(.035,.024,.018,1);face_bs.inputs['Roughness'].default_value=.96;materials['walker-face-detail']=face_mat
for m in materials.values():
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=min(bs.inputs['Metallic'].default_value,.29)

root_obj=bpy.data.objects.new('town-walkers',None);bpy.context.collection.objects.link(root_obj);root_obj.empty_display_type='PLAIN_AXES'
def part(parent,obj):
    world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world;return obj
def cube(name,c,size,mat,parent,bevel=.014):
    # Export-time bevel expansion more than doubles these tiny meshes. Keep
    # edges crisp here and spend the strict 450-triangle limit on silhouette.
    obj=town.cube(name,c,size,mat,0)
    if obj.data.uv_layers.active:obj.data.uv_layers.active.name='UVMap'
    return part(parent,obj)
def mesh(name,verts,faces,mat,parent):
    # Shape coordinates are local game-space (Z-up for town_base conversion).
    converted=[tuple(town.game_vector(v)) for v in verts]
    data=bpy.data.meshes.new(name+' mesh');data.from_pydata(converted,[],faces);data.materials.append(mat);data.update()
    uv=data.uv_layers.new(name='UVMap')
    for poly in data.polygons:
        for li in poly.loop_indices:
            v=converted[data.loops[li].vertex_index];uv.data[li].uv=(v[0]/.35,v[2]/.35)
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return part(parent,obj)
def tapered(name,center,low,high,mat,parent,sides=8):
    x,y,z=center;verts=[]
    for yy,wx,wz in ((y,low[0],low[1]),(y+high[2],high[0],high[1])):
        for i in range(sides):
            ang=2*math.pi*i/sides;verts.append((x+math.cos(ang)*wx/2,yy,z+math.sin(ang)*wz/2))
    faces=[]
    for i in range(sides):faces.append((i,(i+1)%sides,(i+1)%sides+sides,i+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range(sides,2*sides))])
    tris=sum(max(1,len(f)-2) for f in faces)
    return mesh(name,verts,faces,mat,parent),tris
def beam(name,a,b,width,depth,mat,parent):
    # Closed eight-corner bar: thin but real volume, with the same UV layer name.
    va=town.game_vector(a);vb=town.game_vector(b);axis=(vb-va).normalized();ref=Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0))
    side=axis.cross(ref).normalized()*width/2;up=axis.cross(side).normalized()*depth/2;verts=[]
    for end in (va,vb):verts.extend([tuple(end-side-up),tuple(end+side-up),tuple(end+side+up),tuple(end-side+up)])
    faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    data=bpy.data.meshes.new(name+' mesh');data.from_pydata(verts,[],faces);data.materials.append(mat);data.update();data.uv_layers.new(name='UVMap')
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return part(parent,obj)
def limb(name,a,b,width,depth,mat,parent):
    va=town.game_vector(a);vb=town.game_vector(b);axis=(vb-va).normalized();ref=Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0))
    side=axis.cross(ref).normalized();up=axis.cross(side).normalized();verts=[];faces=[];sides=6
    for endpoint in (va,vb):
        for i in range(sides):
            ang=2*math.pi*i/sides;verts.append(tuple(endpoint+side*math.cos(ang)*width/2+up*math.sin(ang)*depth/2))
    for i in range(sides):faces.append((i,(i+1)%sides,(i+1)%sides+sides,i+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range(sides,2*sides))])
    data=bpy.data.meshes.new(name+' low-poly rounded limb');data.from_pydata(verts,[],faces);data.materials.append(mat);data.uv_layers.new(name='UVMap');data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return part(parent,obj)

# Each outfit uses one of the town's small photographic material tiles. The
# shared shape began from the photographed long-coat proportions; role pieces
# are added to that same connected, low-poly body instead of block figures.
specs=[
 ('walker-a','adult','dust-coat','hood','patched-canvas','weathered-plank'),
 ('walker-b','adult','overalls','cap','galvanised-tin','patched-canvas'),
 ('walker-c','adult','poncho','broad-hat','weathered-plank','faded-hand-paint'),
 ('walker-d','adult','long-coat','hood','rusted-steel','weathered-plank'),
 ('walker-e','adult','work-shirt','knit-cap','patched-canvas','faded-hand-paint'),
 ('walker-f','adult','dust-coat','wide-brim','weathered-plank','patched-canvas'),
 ('walker-g','adult','overalls','hardhat','galvanised-tin','faded-hand-paint'),
 ('walker-h','adult','shawl','wrap','faded-hand-paint','weathered-plank'),
 ('walker-kid-a','kid','short-coat','hood','patched-canvas','rusted-steel'),
 ('walker-kid-b','kid','overall-shorts','cap','faded-hand-paint','patched-canvas'),
 ('walker-guard','adult','reinforced-coat','helmet','galvanised-tin','rusted-steel'),
 ('walker-trader','adult','layered-coat','turban','weathered-plank','patched-canvas'),
 ('walker-vane','adult','white-overalls','bare-head','container-white','paint-blue'),
]

def walker(spec):
    ident,age,outfit,hat,coat_name,trim_name=spec;child=age=='kid';height=1.30 if child else 1.70;scale=height/1.70
    body=bpy.data.objects.new(ident,None);bpy.context.collection.objects.link(body);part(root_obj,body);body['height_m']=height
    body.scale=(1,1,1.06)
    coat=materials[coat_name];trim=materials[trim_name];dark=materials['iron-dark'];skin=materials['walker-skin'];dust=materials['rusted-steel']
    # Grounded long legs, each a named pivot assembly for the town walk cycle.
    for side,label in ((-1,'leg-l'),(1,'leg-r')):
        pivot=bpy.data.objects.new(ident+':'+label,None);bpy.context.collection.objects.link(pivot);part(body,pivot)
        pivot.location=town.game_vector((side*.105*scale,.045*scale,0));pivot['swing_axis']='X'
        hip=.92*scale;ankle=.13*scale
        beam(ident+' '+label+' thigh',(side*.105*scale,.06*scale,0),(side*.105*scale,hip*.70,0),.13*scale,.15*scale,coat,pivot)
        beam(ident+' '+label+' shin',(side*.105*scale,hip*.60,0),(side*.105*scale,ankle,.015*scale),.09*scale,.11*scale,trim,pivot)
        cube(ident+' '+label+' boot',(side*.105*scale,.075*scale,-.045*scale),(.13*scale,.12*scale,.26*scale),dark,pivot,.012)
        # Trouser patch follows the same pivot and reads as stitched cloth.
        cube(ident+' '+label+' knee patch',(side*.105*scale,.55*scale,-.078*scale),(.07*scale,.08*scale,.018*scale),dust,pivot,.004)
    # Tapered torso and two connected sleeves preserve a human shoulder-to-leg silhouette.
    pelvis=cube(ident+' joined hip and waist',(0,.73*scale,0),(.34*scale,.22*scale,.24*scale),trim,body,.035)
    torso,tris=tapered(ident+' fitted torso',(0,.73*scale,0),(.34*scale,.27*scale),(.47*scale,.35*scale,.45*scale),coat,body,10)
    for side in (-1,1):
        limb(ident+' sleeve',(side*.22*scale,1.10*scale,0),(side*.235*scale,.62*scale,-.015*scale),.14*scale,.15*scale,coat,body)
        limb(ident+' hand',(side*.238*scale,.63*scale,-.015*scale),(side*.24*scale,.48*scale,-.015*scale),.072*scale,.09*scale,skin,body)
    # A real overlapping front panel and side tails make the long coat read at town scale.
    if outfit in ('dust-coat','long-coat','reinforced-coat','layered-coat'):
        cube(ident+' hanging front placket',(0,.59*scale,-.135*scale),(.17*scale,.74*scale,.026*scale),trim,body,.012)
        for side in (-1,1):
            panel=cube(ident+' split coat tail',(side*.14*scale,.34*scale,.025*scale),(.20*scale,.72*scale,.055*scale),coat,body,.012)
            panel.rotation_euler.x=side*.025
        # Three small closure tabs and irregular repair patches, not a painted noise map.
        if ident!='walker-trader':
            cube(ident+' visible mended patch',(-.14*scale,.75*scale,-.157*scale),(.085*scale,.11*scale,.018*scale),dust,body,.004)
    elif outfit=='poncho' or outfit=='shawl':
        panel=cube(ident+' broad shoulder drape',(0,.88*scale,-.12*scale),(.70*scale,.54*scale,.10*scale),coat,body,.02)
        panel.rotation_euler.x=-.05
        cube(ident+' drape hem stripe',(0,.61*scale,-.177*scale),(.63*scale,.045*scale,.018*scale),trim,body,.004)
    elif outfit in ('overalls','overall-shorts','white-overalls'):
        cube(ident+' bib',(0,.82*scale,-.164*scale),(.29*scale,.28*scale,.025*scale),trim,body,.008)
        for side in (-1,1):beam(ident+' overall strap',(side*.12*scale,1.16*scale,-.12*scale),(side*.12*scale,.94*scale,-.17*scale),.035*scale,.026*scale,trim,body)
        cube(ident+' bib pocket',(0,.79*scale,-.183*scale),(.14*scale,.10*scale,.012*scale),coat,body,.003)
    else:
        cube(ident+' work vest',(0,.84*scale,-.15*scale),(.42*scale,.43*scale,.06*scale),trim,body,.012)
    # Head, ears and nose are faceted enough to read as a person without a toy face.
    beam(ident+' neck',(0,1.12*scale,-.005*scale),(0,1.33*scale,-.005*scale),.105*scale,.11*scale,skin,body)
    cube(ident+' worn collar',(0,1.14*scale,-.008*scale),(.31*scale,.12*scale,.28*scale),trim,body,.025)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=town.game_vector((0,1.39*scale,0)))
    head=bpy.context.object;head.name=ident+' head';head.scale=(.105*scale,.095*scale,.12*scale);head.data.materials.append(skin)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if head.data.uv_layers.active:head.data.uv_layers.active.name='UVMap'
    part(body,head)
    for side in (-1,1):cube(ident+' eye',(side*.040*scale,1.405*scale,-.114*scale),(.020*scale,.018*scale,.012*scale),materials['walker-face-detail'],body,.003)
    cube(ident+' nose',(0,1.375*scale,-.115*scale),(.045*scale,.055*scale,.07*scale),skin,body,.014)
    # Distinct hats are broad, thin and physically grounded in the head silhouette.
    if hat in ('hood','turban'):
        hood,tris_hood=tapered(ident+' raised hood',(0,1.38*scale,.07*scale),(.30*scale,.31*scale),(.28*scale,.30*scale,.16*scale),trim,body,9)
        if hat=='hood':cube(ident+' hood brow',(0,1.48*scale,-.12*scale),(.25*scale,.075*scale,.09*scale),coat,body,.015)
    elif hat in ('broad-hat','wide-brim'):
        cube(ident+' hat crown',(0,1.52*scale,.005*scale),(.18*scale,.13*scale,.18*scale),trim,body,.025)
        cube(ident+' broad brim',(0,1.48*scale,0),(.38*scale,.035*scale,.32*scale),coat,body,.018)
    elif hat=='hardhat' or hat=='helmet':
        h,tris_hat=tapered(ident+' hard helmet',(0,1.49*scale,.005*scale),(.29*scale,.29*scale),(.30*scale,.30*scale,.15*scale),coat,body,8)
        cube(ident+' helmet rim',(0,1.445*scale,-.005*scale),(.36*scale,.035*scale,.32*scale),trim,body,.01)
        if hat=='helmet':cube(ident+' face shield',(0,1.34*scale,-.125*scale),(.18*scale,.12*scale,.018*scale),dark,body,.008)
    elif hat in ('cap','knit-cap'):
        cube(ident+' cap crown',(0,1.49*scale,.005*scale),(.23*scale,.13*scale,.24*scale),coat,body,.03)
        cube(ident+' cap peak',(0,1.45*scale,-.105*scale),(.22*scale,.025*scale,.15*scale),trim,body,.012)
    # Trader carries a connected, shoulder-wide stitched pack.
    if ident=='walker-trader':
        cube(ident+' pack main',(0,.99,.20),(.38,.55,.24),trim,body,.025)
        cube(ident+' pack flap',(0,1.25,.205),(.39,.12,.255),coat,body,.014)
        for side in (-1,1):beam(ident+' pack strap',(side*.14,1.24,.15),(side*.13,.83,.16),.035,.025,dark,body)
    # Vane's tiny blue drop is a crisp, readable mark on the white work suit.
    if ident=='walker-vane':
        cube(ident+' blue drop stem',(0,.91,-.182),(.035,.13,.018),materials['paint-blue'],body,.009)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=town.game_vector((0,.80,-.19)))
        drop=bpy.context.object;drop.name=ident+' blue drop';drop.scale=(.055,.07,.022);drop.data.materials.append(materials['paint-blue'])
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);part(body,drop)
    # The armature substitute required by the town runtime is the named pivot group;
    # keep the mesh descendants compact and leave all id roots under one family root.
    poly_count=0
    for ob in body.children_recursive:
        if ob.type=='MESH':poly_count+=sum(max(1,len(poly.vertices)-2) for poly in ob.data.polygons)
    if poly_count>450:raise RuntimeError(f'{ident} has {poly_count} triangles (limit 450)')
    body['triangle_count']=poly_count

for spec in specs:walker(spec)

def set_camera(name,loc,target,lens=52):
    data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data);scene.collection.objects.link(cam);cam.location=town.game_vector(loc)
    direction=town.game_vector(target)-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();data.lens=lens;scene.camera=cam
def lighting():
    global scene
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
    world=bpy.data.worlds.new('plain overcast daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.46,.49,.51,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8;scene.world=world
    ld=bpy.data.lights.new('large overcast softbox','AREA');lo=bpy.data.objects.new('large overcast softbox',ld);scene.collection.objects.link(lo);lo.location=town.game_vector((0,3,-3));ld.energy=520;ld.size=5
    lo.rotation_euler=(Vector((0,0,0))-lo.location).to_track_quat('-Z','Y').to_euler()
def render_views():
    if not a.render:return
    lighting();render.mkdir(parents=True,exist_ok=True)
    # Export/import proof: review images must come from a fresh empty scene.
    town.export_glb(out);bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=str(out));scene=bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=24,location=(0,0,-.025));ground=bpy.context.object;ground.name='plain compacted dirt review floor'
    ground_mat=bpy.data.materials.new('review floor / neutral dirt');ground_mat.diffuse_color=(.20,.18,.15,1);ground_mat.use_nodes=True
    ground_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.20,.18,.15,1)
    ground_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.96;ground.data.materials.append(ground_mat)
    lighting()
    visible=[o for o in scene.objects if o.type=='MESH']
    for idx,o in enumerate(visible):
        o.hide_render=not o.name.startswith('walker-a ')
    target=(0,.86,0);set_camera('photo matched front three-quarter',(2.45,2.25,-3.25),target,55)
    scene.render.filepath=str(render/'walker-a-three-quarter.png');bpy.ops.render.render(write_still=True)
    for o in visible:o.hide_render=not o.name.startswith('walker-trader ')
    set_camera('trader three-quarter', (2.5,2.35,-3.3),(.1,.9,-.06),55)
    scene.render.filepath=str(render/'walker-trader-three-quarter.png');bpy.ops.render.render(write_still=True)
    for o in visible:o.hide_render=False
    for index,ident in enumerate(spec[0] for spec in specs):
        actor=next((o for o in scene.objects if o.name==ident),None)
        if actor:actor.location.x=(index-(len(specs)-1)/2)*.72
    set_camera('family overhead 45 degrees',(0,7.4,-6.2),(0,.5,0),30)
    scene.render.filepath=str(render/'family-overhead.png');bpy.ops.render.render(write_still=True)

town.export_glb(out)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
render_views()
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'blend':str(blend)}))
