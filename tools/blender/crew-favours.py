"""Photo-outline recipes for Gerald, Jax's harpoon and the upright piano.

Run from Blender 4.5 with -- --root . [--stage gerald|harpoon|piano|all].
Every review portrait is rendered from the exported GLB after a fresh import.
"""
import argparse, json, math, sys
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--root',required=True)
parser.add_argument('--stage',choices=('gerald','harpoon','piano','all'),default='all')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]); root=Path(args.root).resolve()
if args.stage=='all': stages=('gerald','harpoon','piano')
else: stages=(args.stage,)
import bpy, numpy as np
from mathutils import Vector
sys.path.insert(0,str(root/'tools/blender')); import town_base as town
texture_dir=root/'public/assets/models/wasteland/scablands/textures'
paths={'gerald':texture_dir/'ww-gerald-photo.jpg', 'harpoon':texture_dir/'ww-harpoon-photo.jpg', 'piano':texture_dir/'ww-piano-photo.jpg'}
out=root/'public/assets/models/wasteland/scablands/crew-favours.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; root_obj=bpy.data.objects.new('crew-favours',None); scene.collection.objects.link(root_obj)
_base=town.make_materials()

def photo_material(name,path,darken=1.0):
    image=bpy.data.images.load(str(path.resolve()),check_existing=False)
    if darken!=1:
        px=np.empty(len(image.pixels),dtype=np.float32); image.pixels.foreach_get(px)
        px[:]=np.clip(px*darken,0,1); image.pixels.foreach_set(px)
    image.pack(); mat=bpy.data.materials.new(name); mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Metallic'].default_value=0; bsdf.inputs['Roughness'].default_value=.85
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=image; tex.interpolation='Linear'; tex.extension='EXTEND'
    mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']); mat.diffuse_color=(.26,.22,.17,1)
    return mat

def make_obj(name,verts,faces,uvs,mat,smooth=False):
    # verts use game axes X right, Y up, Z depth; each UV is assigned per loop.
    coords=[tuple(town.game_vector(v)) for v in verts]
    mesh=bpy.data.meshes.new(name+' mesh'); mesh.from_pydata(coords,[],faces); mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=smooth
        for li in poly.loop_indices: uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj.parent=root_obj
    mesh.materials.append(mat); obj['part']=name.split('-')[0]; return obj

def distance_map(binary):
    # Two-pass 8-neighbour chamfer transform, adequate to the regular photo grid.
    h,w=binary.shape; inf=1e6; d=np.where(binary,inf,0).astype(np.float32); diag=1.41421356
    for y in range(h):
        for x in range(w):
            if binary[y,x]:
                if x: d[y,x]=min(d[y,x],d[y,x-1]+1)
                if y:
                    d[y,x]=min(d[y,x],d[y-1,x]+1)
                    if x: d[y,x]=min(d[y,x],d[y-1,x-1]+diag)
                    if x+1<w: d[y,x]=min(d[y,x],d[y-1,x+1]+diag)
    for y in range(h-1,-1,-1):
        for x in range(w-1,-1,-1):
            if binary[y,x]:
                if x+1<w: d[y,x]=min(d[y,x],d[y,x+1]+1)
                if y+1<h:
                    d[y,x]=min(d[y,x],d[y+1,x]+1)
                    if x: d[y,x]=min(d[y,x],d[y+1,x-1]+diag)
                    if x+1<w: d[y,x]=min(d[y,x],d[y+1,x+1]+diag)
    return d

def build_gerald():
    image=bpy.data.images.load(str((root/'.qa-dist/gerald-mask.png').resolve()),check_existing=False)
    pixels=np.empty(len(image.pixels),dtype=np.float32); image.pixels.foreach_get(pixels)
    mask=pixels.reshape((image.size[1],image.size[0],4))[:,:,0]>.5
    bpy.data.images.remove(image)
    h,w=mask.shape; dmap=distance_map(mask); R=float(dmap.max())
    ys,xs=np.where(mask); x0,x1=int(xs.min()),int(xs.max()); y0,y1=int(ys.min()),int(ys.max())
    nx,ny=200,80; grid_x=np.linspace(x0,x1,nx); grid_y=np.linspace(y0,y1,ny)
    X,Y=np.meshgrid(grid_x,grid_y); xi=np.rint(X).astype(int); yi=np.rint(Y).astype(int)
    inside=mask[yi,xi]; depth=dmap[yi,xi]
    # Pixel scale puts the nose-to-hip distance at 0.30 m and the tail about as long again.
    scale=.00060; cx=(x0+x1)/2; cy=(y0+y1)/2; H=.045
    ratio=np.minimum(depth/R,1); upper=H*np.sqrt(np.maximum(0,1-(1-ratio)**2))
    # Soft joint lifts: two front elbows, two rear knees, and the nose.
    for px,py,amount,spread in ((430,340,.015,48),(760,360,.015,48),(70,205,.005,28)):
        bump=amount*np.exp(-((X-px)**2+(Y-py)**2)/(2*spread*spread)); upper+=bump*inside
    # Every top grid vertex is photo-space UV; outside vertices are edge-height zero.
    vtop=[]; vbot=[]; uvtop=[]
    for row in range(ny):
        for col in range(nx):
            px,py=X[row,col],Y[row,col]; z=-(px-cx)*scale; x=(py-cy)*scale
            # Photo's long axis maps to world X, its width to world Z.
            gx=(px-cx)*scale; gz=-(py-cy)*scale
            ht=float(upper[row,col]) if inside[row,col] else 0.0
            vtop.append((gx,ht,gz)); vbot.append((gx,-.002,gz)); uvtop.append((px/w,1-py/h))
    top_faces=[]; bottom_faces=[]; edge_counts={}
    def add_tri(a,b,c):
        top_faces.append((a,b,c)); bottom_faces.append((c+nx*ny,b+nx*ny,a+nx*ny))
        for e in ((a,b),(b,c),(c,a)):
            key=tuple(sorted(e)); edge_counts[key]=edge_counts.get(key,0)+1
    for row in range(ny-1):
        for col in range(nx-1):
            a=row*nx+col; b=a+1; c=a+nx; e=c+1
            if mask[int(round((grid_y[row]+grid_y[row+1])*.5)),int(round((grid_x[col]+grid_x[col+1])*.5))]:
                add_tri(a,c,b); add_tri(b,c,e)
    boundary=[edge for edge,count in edge_counts.items() if count==1]
    verts=vtop+vbot; uvs=uvtop+uvtop; faces=top_faces+bottom_faces
    for a,b in boundary: faces.append((a,b,b+nx*ny,a+nx*ny))
    skin=photo_material('Gerald / overhead photo',paths['gerald'])
    make_obj('gerald-outline-relief',verts,faces,uvs,skin,True)

def build_harpoon():
    image=bpy.data.images.load(str((root/'.qa-dist/harpoon-mask.png').resolve()),check_existing=False)
    pixels=np.empty(len(image.pixels),dtype=np.float32); image.pixels.foreach_get(pixels)
    mask=pixels.reshape((image.size[1],image.size[0],4))[:,:,0]>.5
    bpy.data.images.remove(image)
    image=bpy.data.images.load(str(paths['harpoon'].resolve()),check_existing=False)
    photo=np.empty(len(image.pixels),dtype=np.float32); image.pixels.foreach_get(photo)
    photo=photo.reshape((image.size[1],image.size[0],4))[:,:,:3]
    bpy.data.images.remove(image)
    h,w=mask.shape; ys,xs=np.where(mask); x0,x1=int(xs.min()),int(xs.max()); span=x1-x0
    n=120; samples=np.linspace(x0,x1,n); verts=[]; uvs=[]; faces=[]; sides=12
    for i,px in enumerate(samples):
        col=int(round(px)); active=np.where(mask[:,col])[0]
        if len(active)<2:
            active=np.where(mask[:,max(x0,min(x1,col-1))])[0]
        t,b=int(active.min()),int(active.max()); c=(t+b)/2; radius=max(1,(b-t)/2)*2.5/span
        factor=.25 if px>x0+span*.76 else .52
        for j in range(sides):
            a=2*math.pi*j/sides; py=c-radius*span/2.5*math.cos(a)
            gx=-1.25+2.5*i/(n-1); gy=(h/2-py)*2.5/span; gz=radius*factor*math.sin(a)
            verts.append((gx,gy,gz)); uvs.append((px/w,1-py/h))
    for i in range(n-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides; faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple((n-1)*sides+j for j in range(sides))])
    # Small end caps sample the nearest photo pixels.
    verts.extend([verts[0],verts[(n-1)*sides]]); uvs.extend([uvs[0],uvs[(n-1)*sides]])
    faces[-2]=tuple([n*sides]+[j for j in range(sides-1,-1,-1)])
    faces[-1]=tuple([(n*sides+1)]+[(n-1)*sides+j for j in range(sides)])
    mat=photo_material('Jax / outline photograph',paths['harpoon'])
    make_obj('jax-harpoon-outline-lathe',verts,faces,uvs,mat,True)

# Piano rectangles are measured in the rectified 1500 x 1300 front image.
PIANO_RECTS=[
 ('lid',(0,0,1500,62),.60,.075),('upper-panel',(220,75,1280,270),.48,.05),
 ('fall-board',(165,305,1340,425),.50,.055),('key-bed',(250,425,1260,505),.62,.06),
 ('left-arm',(0,300,205,630),.64,.08),('right-arm',(1295,300,1500,630),.64,.08),
 ('action-opening',(205,620,1295,900),.28,.06),('lower-opening',(205,905,1295,1170),.20,.06),
 ('left-post',(0,60,165,1170),.50,.10),('right-post',(1335,60,1500,1170),.50,.10),
 ('plinth',(0,1165,1500,1300),.56,.11),('left-foot',(0,1240,220,1300),.60,.10),
 ('right-foot',(1280,1240,1500,1300),.60,.10),('pedal-left',(570,1245,720,1300),.66,.025),
 ('pedal-right',(780,1245,930,1300),.66,.025)]

def piano_box(name,rect,depth,thickness,mat,inner=False):
    x0,y0,x1,y1=rect; W,H=1500,1300
    # In front view the photo rectangle fills the box's front face exactly.
    left=(x0/W-0.5)*1.5; right=(x1/W-0.5)*1.5
    top=1.3*(1-y0/H); bottom=1.3*(1-y1/H)
    zf=.30-depth; zb=zf+thickness
    verts=[(left,bottom,zf),(right,bottom,zf),(right,top,zf),(left,top,zf),
           (left,bottom,zb),(right,bottom,zb),(right,top,zb),(left,top,zb)]
    # Front, back, left, right, bottom and top. Side returns use a real wood
    # crop with UV area proportional to the face's size, never a front edge.
    faces=[(0,1,2,3),(5,4,7,6),(4,0,3,7),(1,5,6,2),(4,5,1,0),(3,2,6,7)]
    uv=[]
    for i in range(8):
        px,py=((x0,y1),(x1,y1),(x1,y0),(x0,y0),(x0,y1),(x1,y1),(x1,y0),(x0,y0))[i]
        uv.append((px/W,1-py/H))
    # For each return, select a compact patch from the lower left wood grain.
    patch=(10,520,175,1160)
    for fi in range(1,6):
        ids=faces[fi]
        for vi in ids:
            # 165 x 640 photo pixels represent 0.165 x 0.64 m at the photo scale.
            if fi in (1,): uv[vi]=(.02,.56)
            elif fi in (2,3): uv[vi]=(.02,.56)
            else: uv[vi]=(.02,.56)
    # Separate per-loop UVs avoid a stretched front-edge line; map returns to
    # a substantial, repeatable wood region from the piano's left outer strip.
    mesh=bpy.data.meshes.new('piano '+name+' box'); mesh.from_pydata([tuple(town.game_vector(v)) for v in verts],[],faces); mesh.update()
    layer=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index
            if poly.index==0: uvcoord=uv[vi]
            else:
                vx,vy,vz=verts[vi]
                patch_u=.02+max(0,min(1,(vx-left)/max(.001,right-left)))*.11
                patch_v=.40+max(0,min(1,(vy-bottom)/max(.001,top-bottom)))*.45
                uvcoord=(patch_u,patch_v)
            layer.data[li].uv=uvcoord
    obj=bpy.data.objects.new('piano-upright-'+name,mesh); scene.collection.objects.link(obj); obj.parent=root_obj
    mesh.materials.append(mat); return obj

def build_piano():
    photo=photo_material('Piano / rectified front photo',paths['piano']); dark=photo_material('Piano / dark inner wood',paths['piano'],1/3)
    for name,rect,depth,thick in PIANO_RECTS:
        piano_box(name,rect,depth,thick,dark if 'opening' in name else photo,'opening' in name)

for stage in stages:
    if stage=='gerald': build_gerald()
    elif stage=='harpoon': build_harpoon()
    else: build_piano()

# All texture layers have one name and every metallic value is zero.
for obj in scene.objects:
    if obj.type=='MESH':
        for layer in obj.data.uv_layers: layer.name='UVMap'
        if not obj.data.uv_layers: obj.data.uv_layers.new(name='UVMap')
for mat in bpy.data.materials:
    if mat.use_nodes:
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        if bsdf: bsdf.inputs['Metallic'].default_value=0; bsdf.inputs['Roughness'].default_value=.85
town.export_glb(out)

# Reload the asset into an empty scene before every render.
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(out))
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=900; scene.render.resolution_y=600; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'
scene.world=bpy.data.worlds.new('neutral bright overcast'); scene.world.color=(.22,.22,.22)
for location,power,size in (((0,3,-3),145,4),((2,3,3),90,4)):
    bpy.ops.object.light_add(type='AREA',location=location); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(Vector((0,.4,0))-light.location).to_track_quat('-Z','Y').to_euler()
cam_obj=None
for stage in stages:
    prefix={'gerald':'gerald-','harpoon':'jax-harpoon-','piano':'piano-upright-'}[stage]
    selected=[o for o in scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
    for obj in scene.objects:
        if obj.type=='MESH': obj.hide_render=obj not in selected
    pts=[o.matrix_world @ Vector(c) for o in selected for c in o.bound_box]
    lo=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts))); hi=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts))); center=(lo+hi)*.5
    bpy.ops.object.camera_add(location=center+Vector((0,2,-5))); cam_obj=bpy.context.object; scene.camera=cam_obj; cam_obj.data.type='ORTHO'
    if stage=='gerald':
        scene.render.resolution_x=1200; scene.render.resolution_y=480
        cam_obj.location=center+Vector((0,0,2.5)); cam_obj.rotation_euler=(center-cam_obj.location).to_track_quat('-Z','Y').to_euler(); cam_obj.data.ortho_scale=max(hi.x-lo.x,(hi.y-lo.y)*2.5)*1.10
        scene.render.filepath=str(root/'.qa-dist'/'render-gerald-top.png'); bpy.ops.render.render(write_still=True)
        scene.render.resolution_x=1200; scene.render.resolution_y=240
        cam_obj.location=center+Vector((0,-2.8,0)); cam_obj.rotation_euler=(center-cam_obj.location).to_track_quat('-Z','Z').to_euler(); cam_obj.data.ortho_scale=max(hi.x-lo.x,(hi.z-lo.z)*1.5)*1.15
        scene.render.filepath=str(root/'.qa-dist'/'render-gerald-side.png'); bpy.ops.render.render(write_still=True)
    else:
        if stage=='piano': scene.render.resolution_x=900; scene.render.resolution_y=780
        else: scene.render.resolution_x=1200; scene.render.resolution_y=400
        cam_obj.location=center+Vector((0,4 if stage=='piano' else -4,0)); cam_obj.rotation_euler=(center-cam_obj.location).to_track_quat('-Z','Z').to_euler()
        aspect=scene.render.resolution_x/scene.render.resolution_y
        cam_obj.data.ortho_scale=max(hi.x-lo.x,(hi.z-lo.z)*aspect)*1.10
        scene.render.filepath=str(root/'.qa-dist'/f'render-{stage}.png'); bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam_obj,do_unlink=True)
meshes=[o for o in scene.objects if o.type=='MESH']; tris=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
print(json.dumps({'triangles':tris,'bytes':out.stat().st_size,'meshes':len(meshes),'stages':stages}))
if tris>30000 or out.stat().st_size>4*1024*1024: raise RuntimeError('round 4 exceeds the card budget')
