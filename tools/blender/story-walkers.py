"""Dress the shipped fighter rig from the Walkers' measured photographic turnarounds.

blender -b -t 4 --python-exit-code 1 --python tools/blender/story-walkers.py -- --root .
"""
import argparse
import math
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
models = args.root.resolve() / 'public/assets/models/wasteland'
town = models / 'town'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(models / 'test-fighter.glb'))
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
rig.animation_data_clear()
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
bpy.ops.import_scene.gltf(filepath=str(town / 'walkers.glb'))
rig.name = 'Gate company rig'

# Coordinates measured on the 190 x 256 front turnarounds. Each pair in a
# leg or sleeve is the inside and outside edge at that row. Angled cuffs,
# uneven hems and the opening between a pair of boots stay in the geometry.
# The three Dace crops are sampled at their native 256 x 512 resolution,
# with a virtual 190 x 256 frame for measuring the same anatomical points.
# name: photo centre, crown, chin, sole, head/scarf widths at six levels,
# torso half-widths, arm extents, and the boots/trousers under that garment.
STYLES = {
 'coat': (97,4,36,250, [3,10,13,13,11,6],
    [(37,7),(41,14),(47,25),(57,27),(72,24),(89,24),(106,27),(121,31),(143,34)],
    [(47,17,22),(54,20,29),(70,23,34),(89,27,40),(108,32,46),(121,35,46),(131,37,45),(140,39,41)],
    [(133,1,26),(157,3,27),(183,7,26),(205,7,29),(216,9,29),(226,12,27),(232,13,26),(238,13,28),(245,12,31),(250,14,30)]),
 'child': (95,6,45,248,[3,12,16,17,13,7],
    [(43,8),(48,15),(54,20),(62,25),(75,24),(92,24),(111,28),(126,30),(130,29)],
    [(55,17,24),(64,20,29),(80,24,36),(97,29,43),(112,33,48),(124,38,51),(131,41,51),(141,44,47)],
    [(123,1,23),(136,1,25),(149,2,27),(161,5,26),(170,8,23),(186,12,25),(201,13,28),(216,15,28),(222,15,32),(237,16,34),(246,16,37),(248,20,34)]),
 'teen': (95.5,2,32,242,[3,10,14,14,9,5],
    [(31,5),(36,9),(41,17),(46,22),(54,24),(66,23),(79,24),(91,22),(109,23),(122,23)],
    [(46,16,22),(53,19,27),(64,21,30),(76,22,34),(81,24,31),(86,24,29),(103,25,31),(117,26,31),(128,26,32),(136,27,31),(139,28,30)],
    [(114,0,21),(129,0,22),(147,1,22),(162,2,21),(176,4,21),(191,3,22),(206,4,21),(218,5,22),(224,7,19),(230,6,20),(236,6,23),(241,7,25),(242,9,23)]),
 'poncho': (94,5,40,250,[4,11,24,23,13,7],
    [(38,8),(43,18),(49,26),(62,34),(78,39),(93,43),(103,45),(110,36),(125,35),(141,33),(153,32),(164,30)],
    [(52,21,27),(66,26,33),(85,30,39),(99,33,45),(110,33,43),(121,32,42),(133,32,41),(141,33,36)],
    [(124,1,24),(149,2,26),(166,4,27),(178,7,27),(192,9,29),(206,10,32),(218,14,30),(228,14,29),(235,15,30),(245,15,35),(250,17,37)]),
 'leather': (94,4,39,250,[6,11,14,13,10,6],
    [(38,6),(44,14),(49,23),(56,26),(67,22),(83,22),(96,21),(109,25),(125,30),(144,34),(161,34),(181,37),(183,36)],
    [(51,18,25),(62,20,31),(77,21,36),(88,24,40),(95,27,43),(102,32,41),(110,34,47),(119,37,50),(132,40,52),(141,41,48),(144,43,47)],
    [(125,1,25),(149,4,29),(169,7,31),(181,10,34),(197,12,37),(209,14,40),(216,17,40),(228,19,38),(235,21,39),(246,21,44),(250,23,45)]),
 'green': (94.5,4,32,250,[2,7,9,9,7,4],
    [(31,5),(37,8),(41,15),(46,19),(55,23),(68,21),(84,19),(103,19),(112,20),(119,21)],
    [(47,15,20),(55,16,24),(70,19,28),(83,21,31),(98,24,34),(113,27,36),(121,29,34),(133,30,36),(140,32,35)],
    [(111,0,19),(129,0,21),(144,1,22),(162,3,22),(177,5,22),(193,6,24),(209,9,25),(223,10,25),(230,12,23),(235,14,23),(244,13,26),(249,15,27),(250,18,24)]),
 'overalls': (94.5,4,37,249,[3,10,14,14,11,6],
    [(35,6),(40,11),(46,19),(52,24),(64,24),(79,21),(94,21),(108,25),(123,27),(137,26)],
    [(48,16,23),(58,20,28),(73,23,33),(84,24,38),(91,27,40),(103,33,43),(114,37,46),(124,39,48),(134,44,47)],
    [(122,0,25),(139,1,27),(154,3,27),(171,5,26),(186,7,29),(199,8,31),(212,11,30),(226,14,30),(233,15,28),(240,15,29),(247,15,34),(249,18,33)]),
 'blue': (94.5,4,32,250,[3,9,10,10,8,5],
    [(31,5),(38,10),(45,16),(52,20),(67,19),(83,17),(97,17),(112,19),(132,21),(152,23),(171,24),(175,23)],
    [(47,15,18),(56,16,23),(72,18,26),(86,21,29),(95,22,31),(107,26,32),(119,27,33),(130,26,34),(142,29,32)],
    [(127,1,20),(150,4,22),(171,6,23),(184,8,23),(201,9,25),(217,11,24),(230,13,25),(236,13,24),(244,13,28),(250,14,28)]),
}
PEOPLE = [('rell','walker-d','coat'), ('dace','story-dace','teen'),
          ('walker-kid-a','walker-kid-a','child'), ('walker-a','walker-a','coat'),
          ('walker-b','walker-b','poncho'),('walker-c','walker-c','leather'),
          ('walker-vane','walker-vane','overalls'),('walker-e','walker-e','blue'),
          ('walker-f','walker-f','poncho'),('walker-g','walker-g','leather'),
          ('walker-h','walker-h','green')]
ROLLS = {
 'rell': [('main',(0,0,0),(0,0,0),1),('roll',(0,0,0),(0,0,0),1)],
 'walker-a': [('roll',(-.08,.06,-.19),(2,64,-8),1.10)],
 'walker-f': [('roll',(.11,.08,.21),(-7,23,17),1.38)],
 'walker-c': [('main',(-.21,.01,-.18),(2,-16,-19),.84)],
}
atlas_width, row_height, pad = 1280, 256, 3
atlas_height = len(PEOPLE) * row_height
pixels = np.full((atlas_height,atlas_width,4),(.07,.047,.027,1), dtype=np.float32)
material = bpy.data.materials.new('Salt-stained travel clothes')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .91

def smoothstep(x):
    x = np.clip(x,0,1)
    return x*x*(3-2*x)

def load_photo(source, view):
    img = bpy.data.images.load(str(town / 'textures' / (source+'-'+view+'.jpg')))
    width,height = img.size
    rgba = np.empty((height,width,4),dtype=np.float32)
    img.pixels.foreach_get(rgba.ravel())
    rgb = rgba[::-1,:,:3].copy()
    # Replace stage pixels with the nearest garment colour on that scanline.
    # Feet and the gap between them get independent outlines in the geometry.
    bg = np.median(np.concatenate((rgb[:,:14],rgb[:,-14:]),axis=1),axis=1)[:,None,:]
    mask = np.linalg.norm(rgb-bg,axis=2) > (0.145 if source=='story-dace' else .123)
    for row,valid in enumerate(mask):
        valid = valid & np.roll(valid,1) & np.roll(valid,-1)
        xs = np.flatnonzero(valid)
        if not len(xs):
            continue
        px = np.arange(width)
        before = xs[np.clip(np.searchsorted(xs,px)-1,0,len(xs)-1)]
        after = xs[np.clip(np.searchsorted(xs,px),0,len(xs)-1)]
        near = np.where(px-before < after-px,before,after)
        rgb[row,~valid] = rgb[row,near[~valid]]
    return rgb

# The same trader's rear photograph shows the roll, rope cross and side
# buckles. Reserve its own panel beyond the last walker's shirt and leg UVs.
pack_x, pack_y = atlas_width-75, atlas_height-120
pack_crop = (64,14,124,119)
pack_photo = load_photo('walker-trader','back')
left,top,right,bottom = pack_crop
pixels[pack_y:pack_y+bottom-top,pack_x:pack_x+right-left,:3] = pack_photo[top:bottom,left:right][::-1]

def sample(photo, x, y, dace):
    if dace:
        x = (x-29)*2
        y = (y+2)*512/254
    x = np.clip(x,0,photo.shape[1]-1.001)
    y = np.clip(y,0,photo.shape[0]-1.001)
    i,j = x.astype(int),y.astype(int)
    fx,fy = (x-i)[...,None],(y-j)[...,None]
    return ((1-fy)*((1-fx)*photo[j,i]+fx*photo[j,i+1])
           + fy*((1-fx)*photo[j+1,i]+fx*photo[j+1,i+1]))

def dace_depth():
    # Face and chest depth come from the teenager's independent profile.
    # Its nose faces image left. The front/rear photos alone paint the skin.
    img=bpy.data.images.load(str(town/'textures/story-dace-side.jpg'))
    width,height=img.size
    rgba=np.empty((height,width,4),dtype=np.float32)
    img.pixels.foreach_get(rgba.ravel())
    mask=rgba[::-1,:,:3].min(axis=2)<.75
    def profile(row,radius):
        native=int(np.clip((row+2)*height/254,0,height-1))
        span=np.flatnonzero(mask[native])
        if len(span)<2: return max(radius*.7,1.2),0
        # The measured centre of the shirt is x=126; 2 native pixels per
        # unit in the shared measuring frame. Preserve his nose and temples.
        return max(1.2,(span[-1]-span[0])/4), (126-(span[-1]+span[0])/2)/2
    return profile

def blend_joints(height, ordered):
    for (a,name_a),(b,name_b) in zip(ordered,ordered[1:]):
        if height < b:
            weight = float(smoothstep((height-a)/(b-a)))
            return [(name_a,1-weight),(name_b,weight)]
    return [(ordered[-1][1],1)]

def make_person(index, ident, source, style):
    cx,crown,chin,sole,head_width,torso,arm,leg = STYLES[style]
    metres = 1.83/(sole-crown)
    front,back = (load_photo(source,view) for view in ['front','back'])
    verts,faces,face_uv,weights = [],[],[],[]
    cursor = 0
    foot_uv = ((atlas_width-2)/atlas_width, .5/atlas_height)
    def piece(kind, rows, side, segments, width, tex_height, shape):
        nonlocal cursor
        rows = np.array(rows,dtype=float)
        ys,lows,highs = rows.T
        top,bottom = ys[0],ys[-1]
        # One continuous wrap, with the seam behind. Neither cheek can ever
        # receive the side photograph's second copy of the person's face.
        skirt = kind=='skirt'
        angles = np.linspace(0,math.tau,width)[None,:] if skirt else np.linspace(-math.pi,math.pi,width)[None,:]
        py = np.linspace(top,bottom,tex_height)[:,None]
        lo = np.interp(py,ys,lows)
        hi = np.interp(py,ys,highs)
        mid,radius = (lo+hi)/2, (hi-lo)/2
        dx = mid + np.sin(angles)*np.maximum(.25,radius-1.3)
        back_cx = 95 if style=='teen' else cx
        if style=='teen':
            # The mirrored rear panel's centreline is 1.8 virtual pixels left.
            back_cx = 93.4
        nearer = smoothstep(.5+np.cos(angles)*1.65)[...,None]
        data = (sample(front,cx+dx,py,ident=='dace')*nearer +
                sample(back,back_cx-dx,py,ident=='dace')*(1-nearer))
        if ident in ('rell','walker-kid-a') and kind!='head':
            # Travel colours belong to clothing, clear of hands and boots.
            dye = np.array((1.16,.71,.49) if ident=='rell' else (1.26,.99,.61))
            band = smoothstep((py-44)/10)*smoothstep((127-py)/14)
            if ident=='rell':
                neckline = smoothstep((np.abs(dx)-7)/5 + (py-55)/9)
                band = band*neckline
            data *= 1+band[...,None]*(dye-1)
        start_x, start_y = cursor+pad, index*row_height+pad
        cursor += width + 2*pad
        if cursor>atlas_width or tex_height+2*pad>row_height:
            raise ValueError('photographic panel does not fit the atlas')
        # Atlas array follows Blender (bottom to top), while the photos and
        # measurement sheets follow the usual top-to-bottom image convention.
        padded = np.pad(data[::-1],((pad,pad),(pad,pad),(0,0)),mode='edge')
        pixels[start_y-pad:start_y+tex_height+pad,start_x-pad:start_x+width+pad,:3] = padded
        def uv(t,row):
            return ((start_x+.5+t*(width-1))/atlas_width,
                    (start_y+.5+(bottom-row)/(bottom-top)*(tex_height-1))/atlas_height)
        start = len(verts)
        side_name = '.L' if side<0 else '.R'
        for y,low,high in rows:
            h = (sole-y)*metres
            middle,rad = (low+high)/2, (high-low)/2
            stride = segments+1 if skirt else segments
            for j in range(stride):
                if skirt:
                    opening = .13*float(smoothstep((y-137)/65))
                    a = opening+(math.tau-2*opening)*j/segments
                else:
                    a = -math.pi + math.tau*j/segments
                sin,cos = math.sin(a),math.cos(a)
                x = middle + rad*sin
                depth, shift = shape(y,rad)
                z = depth*cos + shift
                if kind=='head':
                    # Brow, bridge, nose and chin rise out of the same face.
                    nose = math.exp(-((y-(crown+(chin-crown)*.61))/((chin-crown)*.115))**2)
                    z += nose*2.4*max(cos,0)**25
                verts.append((x*metres,-z*metres,h))
                if kind=='arm':
                    groups=blend_joints(h,[(0,'hand'+side_name),(.89,'hand'+side_name),(1,'forearm'+side_name),(1.12,'forearm'+side_name),(1.23,'upper_arm'+side_name),(2,'upper_arm'+side_name)])
                elif kind=='leg':
                    groups=blend_joints(h,[(0,'foot'+side_name),(.13,'foot'+side_name),(.24,'shin'+side_name),(.49,'shin'+side_name),(.62,'thigh'+side_name),(2,'thigh'+side_name)])
                elif skirt:
                    # Below the hips the single coat falls over both thighs.
                    hip = float(smoothstep((h-.80)/.22))
                    below_knee = 1-float(smoothstep((h-.45)/.24))
                    right = float(smoothstep((x+6)/12))
                    thigh = (1-hip)*(1-below_knee)
                    shin = (1-hip)*below_knee
                    groups=[('pelvis',hip),('thigh.L',(1-right)*thigh),('thigh.R',right*thigh),
                            ('shin.L',(1-right)*shin),('shin.R',right*shin)]
                elif kind=='head':
                    groups=[('head',1)]
                elif kind=='neck':
                    groups=[('neck',1)]
                elif kind=='bag':
                    groups=[('pelvis',1)]
                else:
                    groups=blend_joints(h,[(0,'pelvis'),(1.00,'pelvis'),(1.2,'chest'),(2,'chest')])
                weights.append(groups)
        for k in range(len(rows)-1):
            for j in range(segments):
                n=j+1 if skirt else (j+1)%segments
                a=start+k*stride+j; b=start+k*stride+n
                faces.append((a,a+stride,b+stride,b))
                face_uv.append((uv(j/segments,ys[k]),uv(j/segments,ys[k+1]),
                      uv((j+1)/segments,ys[k+1]),uv((j+1)/segments,ys[k])))
        for k,rev in ([] if skirt else [(0,False),(len(rows)-1,True)]):
            loop=[start+k*segments+j for j in range(segments)]
            if rev: loop.reverse()
            faces.append(loop)
            face_uv.append([foot_uv if rev and kind=='leg' else uv((i%segments)/segments,ys[k]) for i in loop])
    def single(rows):
        return [(y,-width,width) for y,width in rows]
    def paired(rows, sign):
        return [(y,inner,outer) if sign>0 else (y,-outer,-inner) for y,inner,outer in rows]
    profile = dace_depth() if style=='teen' else None
    head_y = [crown,crown+(chin-crown)*.13,crown+(chin-crown)*.39,
              crown+(chin-crown)*.61,crown+(chin-crown)*.84,chin]
    piece('head',single(zip(head_y,head_width)),0,24,192,96,
          profile or (lambda y,r:(min(r*1.03,14.0),-.3)))
    piece('neck',single([(chin-5,5.2),(chin+1,5),(torso[0][0]+7,7)]),0,12,48,40,
          lambda y,r:(r*.85,0))
    piece('body',single(torso[:-1] if style=='coat' else torso),0,20,242,226,profile or (lambda y,r:(min(r*.63,16.2),0)))
    if style=='coat':
        # One flared skirt with a narrow, open front vent. Its hem shifts
        # together over bent knees; two independent tubes look like trousers.
        skirt=[(116,29.5),(125,32),(139,33.5),(151,35),(171,37),
               (186,38.5),(200,40.6),(206,40.8)]
        piece('skirt',single(skirt),0,28,169,132,
              lambda y,r:(min(16.5+(y-116)*.035,19.3),0))
    for sign in [-1,1]:
        piece('arm',paired(arm,sign),sign,14,113,172,
              lambda y,r:(r*(.87 if y<115 else .74),.65+.022*(y-55)))
        def boot_shape(y,r):
            toe = smoothstep((y-(sole-24))/18)
            return (r*.92+toe*5.0,-.3+toe*4.5)
        piece('leg',paired(leg,sign),sign,16,128,243,boot_shape)
    if style=='teen':
        bag = [(100,-18,-15),(104,-21,-12),(112,-22,-11),(122,-20,-12),(125,-18,-14)]
        piece('bag',bag,-1,12,66,64,lambda y,r:(r*.68,-7.5))
    mesh=bpy.data.meshes.new(ident+' tailored clothes')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    skin=bpy.data.objects.new('skin-'+ident,mesh)
    scene.collection.objects.link(skin)
    mesh.materials.append(material)
    uv=mesh.uv_layers.new(name='UVMap')
    for p,coords in zip(mesh.polygons,face_uv):
        p.use_smooth = len(p.vertices)==4
        for loop,coord in zip(p.loop_indices,coords):
            uv.data[loop].uv=coord
    groups = {b.name:skin.vertex_groups.new(name=b.name) for b in rig.data.bones}
    for i,group_weights in enumerate(weights):
        for bone,weight in group_weights:
            if weight: groups[bone].add([i],weight,'REPLACE')
    # Retain the shipped traveller's real pack and bedroll on their own straps.
    accessories=[]
    for part,offset,tilt,size in ROLLS.get(ident,[]):
        donor=bpy.data.objects['walker-trader pack '+part]
        pack=bpy.data.objects.new(ident+' '+part,donor.data.copy())
        scene.collection.objects.link(pack)
        matrix=donor.matrix_local.copy()
        matrix.translation += Vector(offset)
        matrix = Matrix.Scale(1.83/1.70,4) @ matrix @ Euler(tuple(math.radians(n) for n in tilt)).to_matrix().to_4x4() @ Matrix.Scale(size,4)
        # Map each copied piece before shifting/tilting it on this wearer.
        # Side edges receive canvas; the crossed rope stays centred on the back.
        original=[donor.matrix_local@v.co for v in pack.data.vertices]
        xs=[v.x for v in original]; zs=[v.z for v in original]
        x0,x1=min(xs),max(xs); z0,z1=min(zs),max(zs)
        crop=(69,19,116,36) if part=='roll' else (70,39,116,113)
        for loop in pack.data.loops:
            v=original[loop.vertex_index]
            along=(v.x-x0)/(x1-x0); up=(v.z-z0)/(z1-z0)
            u=crop[2]-along*(crop[2]-crop[0]); y=crop[3]-up*(crop[3]-crop[1])
            pack.data.uv_layers.active.data[loop.index].uv=(
                (pack_x+u-pack_crop[0])/atlas_width,(pack_y+pack_crop[3]-y)/atlas_height)
        pack.data.transform(matrix)
        pack.data.materials.clear()
        pack.data.materials.append(material)
        pack.vertex_groups.new(name='chest').add(list(range(len(pack.data.vertices))),1,'REPLACE')
        accessories.append(pack)
    if accessories:
        bpy.ops.object.select_all(action='DESELECT')
        for o in [skin,*accessories]: o.select_set(True)
        bpy.context.view_layer.objects.active=skin
        bpy.ops.object.join()
    skin.parent=rig
    skin.modifiers.new('Gate company rig','ARMATURE').object=rig
    return skin

outputs=[make_person(i,*spec) for i,spec in enumerate(PEOPLE)]
with TemporaryDirectory() as directory:
    atlas=bpy.data.images.new('Salt-road clothes',atlas_width,atlas_height,alpha=False)
    atlas.pixels.foreach_set(np.ascontiguousarray(pixels).ravel())
    atlas.filepath_raw=str(Path(directory)/'salt-road-clothes.jpg')
    atlas.file_format='JPEG'
    atlas.save()
    atlas.pack()
tex=material.node_tree.nodes.new('ShaderNodeTexImage')
tex.image=atlas
material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
bpy.ops.object.select_all(action='DESELECT')
for obj in [rig,*outputs]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(town/'story-walkers.glb'), export_format='GLB',
                          use_selection=True, export_animations=False, export_yup=True,
                          export_image_format='JPEG', export_image_quality=90)
