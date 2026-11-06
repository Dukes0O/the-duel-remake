"""Photo-outline recipes for Gerald, Jax's harpoon and the upright piano.

Run from Blender 4.5 with -- --root . [--stage gerald|harpoon|piano|all].
Every review portrait is rendered from the exported GLB after a fresh import.
"""
import argparse, json, math, sys
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--root',required=True)
parser.add_argument('--stage',choices=('gerald','harpoon','piano','all'),default='all')
parser.add_argument('--paths-only',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]); root=Path(args.root).resolve()
out=root/'public/assets/models/wasteland/scablands/crew-favours.glb'
blend=root/'art-build/crew-favours/crew-favours.blend'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(out)]}))
    raise SystemExit(0)
all_stages=('gerald','harpoon','piano')
stages=all_stages if args.stage=='all' else all_stages[:all_stages.index(args.stage)+1]
import bpy, numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0,str(root/'tools/blender')); import town_base as town
texture_dir=root/'public/assets/models/wasteland/scablands/textures'
paths={'gerald':texture_dir/'ww-gerald-photo.jpg', 'gerald_side':texture_dir/'ww-gerald-side.jpg', 'harpoon':texture_dir/'ww-harpoon-photo.jpg', 'piano':texture_dir/'ww-piano-photo.jpg'}
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
    if bsdf.inputs.get('Specular IOR Level'): bsdf.inputs['Specular IOR Level'].default_value=0
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

def aim_camera(camera,target,up_hint):
    direction=(Vector(target)-camera.location).normalized()
    up_hint=Vector(up_hint).normalized(); right=direction.cross(up_hint).normalized()
    up=right.cross(direction).normalized(); back=-direction
    camera.rotation_euler=Matrix((right,up,back)).transposed().to_euler()

def build_gerald():
    from photo_model import Photo, Mesh, trace, slab
    import numpy as np
    overhead=Photo(paths['gerald']); side=Photo(paths['gerald_side'])
    def read_mask(path):
        image=bpy.data.images.load(str(path.resolve()),check_existing=False)
        values=np.empty(len(image.pixels),dtype=np.float32); image.pixels.foreach_get(values)
        mask=values.reshape((image.size[1],image.size[0],4))[:,:,0]>.5
        bpy.data.images.remove(image); return mask
    overhead_mask=read_mask(texture_dir/'ww-gerald-overhead-mask.png')
    side_mask=read_mask(texture_dir/'ww-gerald-side-mask.png')
    if overhead_mask.shape!=(overhead.h,overhead.w) or side_mask.shape!=(side.h,side.w):
        raise RuntimeError('Gerald source and cutout mask dimensions differ')
    x0,x1=np.where(overhead_mask)[1].min(),np.where(overhead_mask)[1].max()
    centerline=238.0; station_px=np.linspace(x0,x1,40)
    row=np.arange(overhead.h)
    widths=[]
    for px in station_px:
        col=overhead_mask[:,int(round(px))]
        active=row[np.logical_and(col,np.abs(row-centerline)<70)]
        widths.append(max(2.,float(np.max(np.abs(active-centerline))) if len(active) else 2.))
    widths=np.convolve(np.pad(widths,(4,4),mode='edge'),np.ones(9)/9,mode='valid')
    nose_x=float(x0); hip_x=min(float(x1),nose_x+520); scale=.30/max(1.,hip_x-nose_x)
    side_x0,side_x1=np.where(side_mask)[1].min(),np.where(side_mask)[1].max()
    side_rows=np.arange(side.h); tops=[]; bottoms=[]
    for px in np.linspace(side_x0,side_x1,40):
        col=side_mask[:,int(round(px))]; active=side_rows[col]
        top=int(active.min()); belly=active[active<=top+180]
        tops.append(top); bottoms.append(int(belly.max()) if len(belly) else top+5)
    tops=np.convolve(np.pad(tops,(4,4),mode='edge'),np.ones(9)/9,mode='valid')
    bottoms=np.convolve(np.pad(bottoms,(4,4),mode='edge'),np.ones(9)/9,mode='valid')
    mesh=Mesh(); ring_count=12; rings=[]
    for i,px in enumerate(station_px):
        si=i/39*(len(tops)-1); lo=int(si); hi=min(lo+1,len(tops)-1); frac=si-lo
        top_px=float(tops[lo]*(1-frac)+tops[hi]*frac); bottom_px=float(bottoms[lo]*(1-frac)+bottoms[hi]*frac)
        base_y=.002; top_y=max(base_y+.01,(bottom_px-top_px)*scale)
        w=float(widths[i])*scale
        ring=[]
        for k in range(ring_count):
            a=2*math.pi*k/ring_count; sn=math.sin(a); co=math.cos(a)
            flatten=.08 if sn<-.72 else .5+.5*sn
            y=base_y+(top_y-base_y)*flatten; z=w*co; x=(px-nose_x)*scale
            ring.append((mesh.vertex((x,y,z)),x,y,z,px,a))
        rings.append(ring)
    overhead_mat=overhead.material(); side_mat=side.material()
    for i in range(len(rings)-1):
        for k in range(ring_count):
            aa=(k+.5)*2*math.pi/ring_count; use_top=math.sin(aa)>abs(math.cos(aa))
            material='overhead' if use_top else 'side'
            photo=overhead if use_top else side
            out=(0,math.sin(aa),math.cos(aa))
            a=rings[i][k]; b=rings[i][(k+1)%ring_count]; c=rings[i+1][(k+1)%ring_count]; d=rings[i+1][k]
            points=[mesh.verts[a[0]],mesh.verts[b[0]],mesh.verts[c[0]],mesh.verts[d[0]]]
            uvs=[]
            for v in (a,b,c,d):
                _,x,y,z,px,ang=v
                if use_top:
                    py=centerline+z/scale; uv=overhead.uv(px,py)
                else:
                    si=(px-nose_x)/max(1.,x1-nose_x)*(side_x1-side_x0)+side_x0
                    station=int(round((px-nose_x)/max(1.,x1-nose_x)*39)); bp=float(bottoms[station]); py=bp-y/scale
                    uv=side.uv(si,py)
                uvs.append(uv)
            mesh.face(points,uvs,material,out,True)
    for end_index,sign in ((0,-1),(-1,1)):
        ring=rings[end_index]; center=mesh.verts[ring[0][0]]
        for k in range(ring_count):
            a=ring[k]; b=ring[(k+1)%ring_count]
            uv0=overhead.uv(a[4],centerline+a[3]/scale); uv1=overhead.uv(b[4],centerline+b[3]/scale)
            mesh.face((center,mesh.verts[a[0]],mesh.verts[b[0]]),(overhead.uv(a[4],centerline),uv0,uv1),'overhead',(sign,0,0),False)
    bodymask=np.zeros_like(overhead_mask)
    for i,px in enumerate(station_px):
        col=int(round(px)); wpx=float(widths[i]); y0=max(0,int(centerline-wpx)); y1=min(overhead.h,int(centerline+wpx)+1); bodymask[y0:y1,col]=True
    legmask=overhead_mask & ~bodymask
    def leg_height(px,py):
        idx=np.clip((px-nose_x)/max(1.,x1-nose_x)*39,0,39); wpx=float(np.interp(idx,np.arange(40),widths)); distance=max(0.,abs(py-centerline)-wpx)
        return .045*math.sin(math.pi*min(distance/80.,1.))
    for name,rect in (('front-near',(80,0,420,238)),('rear-near',(400,0,800,238)),('front-far',(80,238,420,476)),('rear-far',(400,238,800,476))):
        loops=trace(legmask,rect,tolerance=1.2,min_area=20)
        if not loops: continue
        def leg_world(px,py,d): return ((px-nose_x)*scale,leg_height(px,py)+d,(py-centerline)*scale)
        slab(mesh,'overhead',overhead,loops,leg_world,0,.014,wall_scale=.006)
    obj=mesh.finish('gerald-body-and-bent-legs',{'overhead':overhead_mat,'side':side_mat}); obj.parent=root_obj; obj['part']='gerald'
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
            verts.append((gx,gy,gz)); photo_y=c+(py-c)*.86; uvs.append((px/w,1-photo_y/h))
    for i in range(n-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides; faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple((n-1)*sides+j for j in range(sides))])
    # Small end caps sample the nearest photo pixels.
    verts.extend([verts[0],verts[(n-1)*sides]]); uvs.extend([uvs[0],uvs[(n-1)*sides]])
    faces[-2]=tuple([n*sides]+[j for j in range(sides-1,-1,-1)])
    faces[-1]=tuple([(n*sides+1)]+[(n-1)*sides+j for j in range(sides)])
    mat=photo_material('Jax / outline photograph',paths['harpoon'])
    make_obj('jax-harpoon-outline-lathe',verts,faces,uvs,mat,False)

def build_piano():
    from photo_model import Photo, Mesh, trace, slab
    photo=Photo(paths['piano'])
    sky=photo.sky([(10,700),(1190,700),(1190,1030),(10,500)],tolerance=45,grey=26)
    sky[960:,:]=True
    loops=trace(~sky,(0,0,photo.w,photo.h),tolerance=1.6,min_area=40)
    if not loops: raise RuntimeError('piano photo mask found no solid outline')
    mesh=Mesh()
    def to_world(px,py,depth):
        return ((.5-px/photo.w)*1.5,(1-py/photo.h)*1.3,depth)
    slab(mesh,'piano photo',photo,loops,to_world,-.56,-.40,wall_scale=.001)
    obj=mesh.finish('piano-upright-photo-shell',{'piano photo':photo.material()}); obj.parent=root_obj; obj['part']='piano-upright'
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
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

# Reload the asset into an empty scene before every render.
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(out))
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=900; scene.render.resolution_y=600; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'
scene.world=bpy.data.worlds.new('neutral bright overcast'); scene.world.color=(.68,.68,.68)
for location,power,size in (((0,3,-3),145,4),((2,3,3),90,4)):
    bpy.ops.object.light_add(type='AREA',location=location); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.name='round4 global overcast fill'
    light.rotation_euler=(Vector((0,.4,0))-light.location).to_track_quat('-Z','Y').to_euler()
cam_obj=None
for stage in stages:
    prefix={'gerald':'gerald-','harpoon':'jax-harpoon-','piano':'piano-upright-'}[stage]
    selected=[o for o in scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
    for light in [o for o in scene.objects if o.type=='LIGHT']:
        light.hide_render=stage=='harpoon' and light.name=='round4 global overcast fill'
        if light.name=='Harpoon flat front light': light.hide_render=stage!='harpoon'
    if stage=='harpoon' and not any(o.name=='Harpoon flat front light' for o in scene.objects):
        bpy.ops.object.light_add(type='AREA',location=(0,-10,0)); light=bpy.context.object; light.name='Harpoon flat front light'; light.data.energy=900; light.data.shape='DISK'; light.data.size=20
        light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Z').to_euler()
    for obj in scene.objects:
        if obj.type=='MESH': obj.hide_render=obj not in selected
    pts=[o.matrix_world @ Vector(c) for o in selected for c in o.bound_box]
    lo=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts))); hi=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts))); center=(lo+hi)*.5
    bpy.ops.object.camera_add(location=center+Vector((0,2,-5))); cam_obj=bpy.context.object; scene.camera=cam_obj; cam_obj.data.type='ORTHO'
    if stage=='gerald':
        scene.render.resolution_x=1200; scene.render.resolution_y=480
        cam_obj.location=center+Vector((0,0,2.5)); aim_camera(cam_obj,center,(0,1,0)); cam_obj.data.ortho_scale=max(hi.x-lo.x,(hi.y-lo.y)*2.5)*1.10
        scene.render.filepath=str(root/'.qa-dist'/'render-gerald-top.png'); bpy.ops.render.render(write_still=True)
        scene.render.resolution_x=1200; scene.render.resolution_y=240
        cam_obj.location=center+Vector((0,-2.8,0)); aim_camera(cam_obj,center,(0,0,1)); cam_obj.data.ortho_scale=max(hi.x-lo.x,(hi.z-lo.z)*5)*1.15
        scene.render.filepath=str(root/'.qa-dist'/'render-gerald-side.png'); bpy.ops.render.render(write_still=True)
        scene.render.resolution_x=1200; scene.render.resolution_y=800
        view_location=center+Vector((.45,.65,.40)); bpy.ops.object.camera_add(location=view_location)
        view=bpy.context.object; scene.camera=view; view.data.type='PERSP'; view.data.lens=50; aim_camera(view,center,(0,0,1))
        scene.render.filepath=str(root/'.qa-dist'/'render-gerald-threequarter.png'); bpy.ops.render.render(write_still=True); bpy.data.objects.remove(view,do_unlink=True)
    else:
        if stage=='piano': scene.render.resolution_x=900; scene.render.resolution_y=780
        else: scene.render.resolution_x=1200; scene.render.resolution_y=400
        cam_obj.location=center+Vector((0,4 if stage=='piano' else -4,0)); aim_camera(cam_obj,center,(0,0,1))
        aspect=scene.render.resolution_x/scene.render.resolution_y
        cam_obj.data.ortho_scale=max(hi.x-lo.x,(hi.z-lo.z)*aspect)*1.10
        scene.render.filepath=str(root/'.qa-dist'/f'render-{stage}.png'); bpy.ops.render.render(write_still=True)
    if stage=='piano':
        for side,offset in (('left',-1),('right',1)):
            bpy.ops.object.camera_add(location=center+Vector((offset*1.8,2.2,.65)))
            view=bpy.context.object; scene.camera=view; view.data.type='PERSP'; view.data.lens=50
            aim_camera(view,center,(0,0,1)); scene.render.resolution_x=900; scene.render.resolution_y=780
            scene.render.filepath=str(root/'.qa-dist'/f'render-piano-{side}-threequarter.png'); bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(view,do_unlink=True)
    bpy.data.objects.remove(cam_obj,do_unlink=True)
meshes=[o for o in scene.objects if o.type=='MESH']; tris=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
print(json.dumps({'triangles':tris,'bytes':out.stat().st_size,'meshes':len(meshes),'stages':stages}))
if tris>30000 or out.stat().st_size>4*1024*1024: raise RuntimeError('round 4 exceeds the card budget')
