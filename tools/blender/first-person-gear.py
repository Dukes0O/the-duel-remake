"""GFX-02 authored first-person hands and practical gear, Blender 4.5 LTS.

blender -b --python tools/blender/first-person-gear.py -- --root REPO --round 1
All design coordinates below are camera local: X right, Y up, forward -Z.
Only vertex/bone construction converts to Blender Z up; glTF converts once back.
Textures are authored padded procedural material islands, never projected figures.
"""
import argparse
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector, Matrix, Euler

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--round', type=int, required=True)
p.add_argument('--crew', default='all')
p.add_argument('--skip-renders', action='store_true')
args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/first-person'
shots = root / f'docs/board/looks/first-person/round-{args.round}'
out.mkdir(parents=True, exist_ok=True)
(out/'hands').mkdir(exist_ok=True)
shots.mkdir(parents=True, exist_ok=True)

CREW = {
    'rook': dict(sleeve=(.25,.32,.32),skin=(.52,.35,.24),leather=(.19,.14,.10),scale=1,roll=.65,sheet=1,crop=[0,40,510,675]),
    'nell': dict(sleeve=(.38,.20,.12),skin=(.31,.20,.14),leather=(.20,.13,.08),scale=.92,roll=.12,sheet=1,crop=[510,40,1012,675]),
    'jax': dict(sleeve=(.15,.15,.14),skin=(.51,.34,.24),leather=(.13,.105,.08),scale=1,roll=.9,sheet=1,crop=[1015,40,1517,675]),
    'odessa': dict(sleeve=(.48,.34,.15),skin=(.61,.44,.33),leather=(.20,.15,.10),scale=.98,roll=.50,sheet=1,crop=[1517,40,2067,675]),
    'cinder': dict(sleeve=(.115,.115,.105),skin=(.52,.35,.25),leather=(.12,.105,.085),scale=.93,roll=.08,sheet=2,crop=[0,20,510,680]),
    'dune': dict(sleeve=(.26,.29,.29),skin=(.48,.34,.25),leather=(.21,.18,.13),scale=1,roll=.73,sheet=2,crop=[510,20,1010,680]),
    'wren': dict(sleeve=(.47,.40,.27),skin=(.60,.43,.31),leather=(.19,.17,.12),scale=.88,roll=.45,sheet=2,crop=[1010,20,1490,680]),
    'tusk': dict(sleeve=(.25,.19,.14),skin=(.57,.38,.27),leather=(.24,.145,.09),scale=1.17,roll=.20,sheet=2,crop=[1490,20,2056,680]),
}
CLIPS = {'idle':2.,'aim':1.,'fire':.35,'reload':2.2,'repair':4.,
         'wrench-idle':2.,'aim-fire':.35,'aim-reload':2.2}
RPG_GRIP = Vector((.14,-.24,-.55))
WRENCH_GRIP = Vector((.21,-.24,-.58))

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def bv(v):
    return Vector((v[0],-v[2],v[1]))

def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=16
    scene.render.resolution_x=1280;scene.render.resolution_y=720
    scene.render.resolution_percentage=100;scene.render.fps=60
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX'
    scene.world=bpy.data.worlds.new('Neutral review world')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.22,.22,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    return scene

def texture_material(name, cfg, folder, tool=False):
    """16 isolated tiles, each inset by 8 px; woven cloth, grain and local wear."""
    seed=int(hashlib.sha256(name.encode()).hexdigest()[:8],16)
    rng=np.random.default_rng(seed)
    color=np.ones((1024,1024,4),np.float32)
    surface=np.ones_like(color)
    bases=[cfg['sleeve'],cfg['leather'],cfg['skin'],(.42,.38,.29),
           (.24,.27,.27),(.51,.29,.12),(.12,.105,.08),(.64,.58,.43),
           cfg['sleeve'],cfg['leather'],cfg['skin'],(.48,.46,.40),
           (.12,.14,.14),(.35,.21,.12),(.28,.27,.22),(.70,.63,.46)]
    if tool:
        bases[3]=(.13,.14,.14);bases[4]=(.075,.085,.085)
        bases[11]=(.34,.35,.33);bases[12]=(.018,.021,.020)
        bases[13]=(.23,.12,.055)
    yy,xx=np.mgrid[0:256,0:256]
    for tile,base in enumerate(bases):
        noise=rng.uniform(-1,1,(256,256))
        coarse=np.repeat(np.repeat(rng.uniform(-1,1,(16,16)),16,axis=0),16,axis=1)
        for _ in range(5):coarse=(coarse+np.roll(coarse,1,0)+np.roll(coarse,-1,0)+np.roll(coarse,1,1)+np.roll(coarse,-1,1))/5
        cloth=tile in [0,8,7,15] and not tool
        grain=(np.sin(xx*2.7)*np.sin(yy*2.3))*.018 if cloth else 0
        variation=1+noise*.045+coarse*.13+grain
        if tile in [2,10]:variation=1+noise*.025+coarse*.065
        rgba=np.zeros((256,256,4),np.float32);rgba[:,:,:3]=np.array(base)[None,None,:]*variation[:,:,None];rgba[:,:,3]=1
        # Patina chips are localized clusters, not pale source-background streaks.
        worn=(coarse>.20)&(noise>.20)
        if tool or tile in [3,4,5,11,12,13,14]:
            rgba[worn,:3]=np.array((.12,.13,.125) if tile in [0,8] else (.23,.15,.085))*(1+noise[worn,None]*.10)
            scratch=(noise>.94)&(coarse>.23)
            rgba[scratch,:3]=(.39,.40,.37)
            if tile==12:rgba[:,:,:3]=np.array(base)*(1+noise[:,:,None]*.02)
        if cloth:
            seam=(abs(xx-16)<2)|(abs(xx-240)<2)
            stitch=seam&((yy%12)<5)
            rgba[stitch,:3]=np.array(base)*1.4
        y,x=divmod(tile,4);color[y*256:(y+1)*256,x*256:(x+1)*256]=np.clip(rgba,0,1)
        rough=.90 if cloth else (.82 if tile in [1,2,6,9,10] else .65)
        surface[y*256:(y+1)*256,x*256:(x+1)*256,1]=np.clip(rough+coarse*.13,.30,.98)
        surface[y*256:(y+1)*256,x*256:(x+1)*256,2]=.72 if tool and tile not in [1,6,9] else (.55 if tile in [3,11] else 0)
    images=[]
    for label,pixels in [('color',color),('surface',surface)]:
        im=bpy.data.images.new(name+'-'+label,1024,1024,alpha=True)
        if label=='surface':im.colorspace_settings.name='Non-Color'
        im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(folder/f'{name}-{label}.png');im.file_format='PNG';im.save();im.pack();images.append(im)
    mat=bpy.data.materials.new(name+' worn cloth leather and steel');mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
    c=nodes.new('ShaderNodeTexImage');c.image=images[0]
    s=nodes.new('ShaderNodeTexImage');s.image=images[1]
    split=nodes.new('ShaderNodeSeparateColor')
    links.new(c.outputs['Color'],bsdf.inputs['Base Color']);links.new(s.outputs['Color'],split.inputs['Color'])
    links.new(split.outputs['Green'],bsdf.inputs['Roughness']);links.new(split.outputs['Blue'],bsdf.inputs['Metallic'])
    return mat

class Geometry:
    def __init__(self):self.vertices=[];self.faces=[];self.uvs=[];self.weights=[]
    def vertex(self,co,weights):
        self.vertices.append(bv(co));self.weights.append(weights);return len(self.vertices)-1
    def face(self,indices,tile,uv=None):
        self.faces.append(indices)
        if uv is None:uv=[(0,0),(1,0),(1,1),(0,1)][:len(indices)]
        tx,ty=tile%4,tile//4
        self.uvs.append([((tx+.04+u*.92)/4,(ty+.04+v*.92)/4) for u,v in uv])
    def loft(self,centres,radii,tile,bones,segments=12,axes=None,closed=True):
        rings=[]
        for i,(centre,radius) in enumerate(zip(centres,radii)):
            c=Vector(centre)
            if axes:a,b=map(Vector,axes)
            else:
                tangent=Vector(centres[min(i+1,len(centres)-1)])-Vector(centres[max(i-1,0)])
                tangent.normalize();a=tangent.cross(Vector((0,1,0)))
                if a.length<.01:a=tangent.cross(Vector((1,0,0)))
                a.normalize();b=tangent.cross(a).normalized()
            rx,ry=(radius,radius) if isinstance(radius,(float,int)) else radius
            ring=[]
            for j in range(segments):
                theta=j*math.tau/segments
                ring.append(self.vertex(c+a*(math.cos(theta)*rx)+b*(math.sin(theta)*ry),bones[i]))
            rings.append(ring)
        for i in range(len(rings)-1):
            for j in range(segments):
                self.face([rings[i][j],rings[i][(j+1)%segments],rings[i+1][(j+1)%segments],rings[i+1][j]],
                    tile[i] if isinstance(tile,list) else tile,[(j/segments,i/(len(rings)-1)),((j+1)/segments,i/(len(rings)-1)),((j+1)/segments,(i+1)/(len(rings)-1)),(j/segments,(i+1)/(len(rings)-1))])
        if closed:
            for ring,centre,weight,flip in [(rings[0],centres[0],bones[0],True),(rings[-1],centres[-1],bones[-1],False)]:
                mid=self.vertex(centre,weight)
                for j in range(segments):
                    ids=[mid,ring[j],ring[(j+1)%segments]]
                    self.face(ids[::-1] if flip else ids,tile[0] if isinstance(tile,list) else tile,[(.5,.5),(0,0),(1,0)])
    def box(self,centre,size,tile,bone='base'):
        c=Vector(centre);s=Vector(size)/2
        ids=[self.vertex(c+Vector((x*s.x,y*s.y,z*s.z)),{bone:1}) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:self.face([ids[i] for i in face],tile)
    def build(self,name,material,rig=None,bevel=0):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(self.vertices,[],self.faces);mesh.update()
        obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(material)
        uv=mesh.uv_layers.new(name='Padded authored material islands')
        for poly,coords in zip(mesh.polygons,self.uvs):
            poly.use_smooth=True
            for li,value in zip(poly.loop_indices,coords):uv.data[li].uv=value
        # Repair winding from the closed shells before export/shading.
        import bmesh
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        if rig:
            for bone in rig.data.bones:obj.vertex_groups.new(name=bone.name)
            for i,weights in enumerate(self.weights):
                for bone,w in weights.items():obj.vertex_groups[bone].add([i],w,'REPLACE')
            if bevel:
                bpy.context.view_layer.objects.active=obj;obj.select_set(True)
                edge=obj.modifiers.new('Small forged edge radii','BEVEL')
                edge.width=bevel;edge.segments=1;edge.limit_method='ANGLE';edge.angle_limit=.55
                bpy.ops.object.modifier_apply(modifier=edge.name)
                normal=obj.modifiers.new('Weighted forged face normals','WEIGHTED_NORMAL')
                normal.keep_sharp=True;normal.weight=50
                bpy.ops.object.modifier_apply(modifier=normal.name)
                obj.select_set(False)
            modifier=obj.modifiers.new('Bound deforming hands or gear','ARMATURE');modifier.object=rig
            obj.parent=rig
        return obj

def armature(name,definitions):
    data=bpy.data.armatures.new(name);rig=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for label,head,parent in definitions:
        bone=data.edit_bones.new(label);bone.head=bv(head);bone.tail=bone.head+Vector((0,0,.025))
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    for bone in rig.pose.bones:bone.rotation_mode='XYZ'
    rig.animation_data_create()
    return rig

def add_action(rig,label,duration,pose,steps=16):
    action=bpy.data.actions.new(label);rig.animation_data.action=action
    for i in range(steps+1):
        phase=i/steps;frame=1+duration*60*phase
        for bone in rig.pose.bones:bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
        pose(phase)
        for bone in rig.pose.bones:
            for prop in ['location','rotation_euler','scale']:bone.keyframe_insert(data_path=prop,frame=frame)
    track=rig.animation_data.nla_tracks.new();track.name=label;track.strips.new(label,1,action);track.mute=True
    return action

def export(rig,objects,path):
    rig.animation_data.action=None
    for bone in rig.pose.bones:bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
    bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [rig,*objects]:obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',
        export_force_sampling=True,export_skins=True,export_materials='EXPORT',export_extras=True)

def rpg_geometry():
    g=Geometry();r=Geometry()
    # Canonical upper-left reference: rear padded bell, weathered tube, two grips.
    z=[-.665,-.65,-.635,-.58,-.56,-.53,-.15,-.13,.15,.17,.195,.215]
    radius=[.060,.060,.050,.050,.055,.050,.050,.054,.050,.057,.059,.052]
    g.loft([(0,.16,v) for v in z],radius,[4,11,4,0,11,0,11,0,11,6,6],[{'base':1}]*len(z),24,axes=((1,0,0),(0,1,0)),closed=False)
    # Inner muzzle lip gives a genuine open bore instead of a flat end cap.
    g.loft([(0,.16,-.665),(0,.16,-.665),(0,.16,-.57)],[.064,.041,.041],12,[{'base':1}]*3,24,axes=((1,0,0),(0,1,0)),closed=False)
    g.loft([(0,.16,.215),(0,.16,.208),(0,.16,.04),(0,.16,-.05)],
        [.052,.040,.032,.027],12,[{'base':1}]*4,24,axes=((1,0,0),(0,1,0)),closed=False)
    for zc in [-.47,-.07,.12]:
        g.loft([(0,.16,zc-.012),(0,.16,zc+.012)],[.055,.055],3,[{'base':1}]*2,20,axes=((1,0,0),(0,1,0)),closed=False)
        for a in [0,math.pi/2,math.pi,math.pi*1.5]:
            g.box((.057*math.cos(a),.16+.057*math.sin(a),zc),(.012,.012,.012),11)
    for zc in [0,-.34]:
        g.box((0,.105,zc),(.07,.035,.065),4)
        g.loft([(0,-.09,zc),(0,-.065,zc+.006),(0,.05,zc),(0,.09,zc)],[(.027,.023),(.029,.025),(.025,.023),(.027,.025)],1,[{'base':1}]*4,12,axes=((1,0,0),(0,0,1)))
        for yy in [-.07,-.045,-.02,.005,.03,.055]:
            g.loft([(0,yy-.002,zc),(0,yy+.002,zc)],[.027,.027],6,[{'base':1}]*2,12,axes=((1,0,0),(0,0,1)))
    # Open trigger guard and separate trigger, plus two open iron sights.
    for centre,size in [((0,.055,-.06),(.009,.018,.08)),((0,-.012,-.093),(.009,.012,.045)),((0,.023,-.11),(.009,.075,.009)),((0,.045,-.061),(.006,.05,.008))]:g.box(centre,size,4)
    for zc in [.07,-.53]:
        g.box((0,.217,zc),(.073,.012,.027),4)
        for x in [-.029,.029]:g.box((x,.249,zc),(.008,.07,.014),4)
        g.box((0,.284,zc),(.066,.008,.014),11)
    r.loft([(0,.16,z) for z in [-.58,-.565,-.52,-.40,-.35,-.24,-.20]],
        [.003,.014,.033,.032,.015,.014,.014],14,[{'rocket':1}]*7,16,axes=((1,0,0),(0,1,0)))
    for x in [-1,1]:r.box((x*.024,.16,-.22),(.041,.008,.09),4,'rocket')
    r.box((0,.16,-.22),(.008,.066,.09),4,'rocket')
    return g,r

def wrench_geometry():
    g=Geometry()
    # Extruded open adjustable jaw, rather than a closed block around the opening.
    outlines=[([(-.032,-.14),(.032,-.14),(.028,.205),(-.026,.205)],0),
        ([(-.025,.19),(.028,.19),(.048,.222),(.071,.258),(.076,.284),(.069,.342),(.061,.353),(.037,.354),(.033,.298),(-.026,.285),(-.039,.342),(-.060,.335),(-.069,.311),(-.073,.282),(-.065,.256),(-.044,.217)],11)]
    for outline,tile in outlines:
        # Retain the concave n-gon for Blender tessellation; no invalid fan fill.
        ids=[]
        for zz in [-.015,.015]:ids.append([g.vertex((x,y,zz),{'base':1}) for x,y in outline])
        for ring,points in [(ids[0][::-1],outline[::-1]),(ids[1],outline)]:
            g.faces.append(ring);g.uvs.append([((tile%4+.04+(x+.083)/.166*.92)/4,(tile//4+.04+(y+.14)/.512*.92)/4) for x,y in points])
        for i in range(len(outline)):g.face([ids[0][i],ids[0][(i+1)%len(outline)],ids[1][(i+1)%len(outline)],ids[1][i]],11)
    # Distinct sliding jaw and knurled worm wheel against the steel neck.
    g.box((.045,.287,-.002),(.049,.03,.043),11)
    g.box((.004,.226,.020),(.060,.044,.012),12)
    for yy in [.247,.259,.271]:g.box((.036,yy,.022),(.020,.006,.010),11)
    g.loft([(-.020,.226,.035),(.020,.226,.035)],[.017,.017],11,[{'base':1}]*2,16,axes=((0,1,0),(0,0,1)))
    for x in [-.016,-.008,0,.008,.016]:g.loft([(x-.0015,.226,.035),(x+.0015,.226,.035)],[.019,.019],4,[{'base':1}]*2,12,axes=((0,1,0),(0,0,1)))
    g.loft([(0,y,0) for y in [-.10,-.08,.04,.06]],[(.032,.022),(.034,.024),(.032,.024),(.028,.022)],1,[{'base':1}]*4,16,axes=((1,0,0),(0,0,1)))
    for y in np.linspace(-.085,.045,9):g.loft([(0,y-.002,0),(0,y+.002,0)],[(.034,.025)]*2,6,[{'base':1}]*2,12,axes=((1,0,0),(0,0,1)))
    # Open hanging ring, visible beyond the leather wrap.
    centres=[(.025*math.cos(a),-.145+.025*math.sin(a),0) for a in np.linspace(0,math.tau,17)]
    g.loft(centres,[.006]*17,11,[{'base':1}]*17,6)
    return g

def reload_hand_delta(phase):
    keys=[(0,(0,0,0)),(.18,(-.25,-.23,.19)),(.34,(-.24,-.12,.16)),
          (.55,(-.15,.10,-.08)),(.76,(0,.16,-.03)),(.88,(0,.10,-.08)),(1,(0,0,0))]
    for a,b in zip(keys,keys[1:]):
        if a[0]<=phase<=b[0]:return Vector(a[1]).lerp(Vector(b[1]),(phase-a[0])/(b[0]-a[0]))
    return Vector((0,0,0))

def grip_rotation(rig,side,rotation,delta):
    # Rotate around the actual grasp point rather than the wrist joint, so
    # fingers stay in contact with the handle/rocket while the wrist turns.
    offset=Vector((-.07 if side=='R' else .07,.065,-.095))
    q=Euler(rotation).to_matrix()
    bone=rig.pose.bones['wrist_'+side]
    bone.rotation_euler=rotation;bone.location=Vector(delta)+offset-q@offset

def rocket_pose(rig,phase):
    pb=rig.pose.bones['rocket']
    # The rocket's middle follows the same grip path as the support hand. At
    # .76 it is at the bore; it seats as the hand releases and returns to grip.
    if phase<=.76:pb.location=reload_hand_delta(phase)+Vector((0,-.16,.06))
    elif phase<.86:pb.location=Vector((0,0,.03))*(1-(phase-.76)/.10)
    else:pb.location=(0,0,0)
    pb.scale=(.0001 if phase<=.15 else min(1,(phase-.15)/.08),)*3

def build_tool(name):
    started=time.perf_counter();scene=fresh()
    cfg=dict(sleeve=(.24,.33,.33) if name=='rpg' else (.58,.36,.10),leather=(.20,.135,.08),skin=(.30,.28,.22))
    mat=texture_material(name,cfg,out,True)
    rig=armature(name+' rig',[('base',(0,0,0),None)]+([('rocket',(0,0,0),'base')] if name=='rpg' else []))
    if name=='rpg':
        g,r=rpg_geometry();objects=[g.build('rpg-body',mat,rig,bevel=.002),r.build('loaded-rocket',mat,rig)]
        actions={'reload':add_action(rig,'reload',2.2,lambda phase:rocket_pose(rig,phase))}
    else:objects=[wrench_geometry().build('wrench-body',mat,rig,bevel=.0025)];actions={}
    export(rig,objects,out/f'{name}.glb')
    bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{name}.blend'))
    return {'id':name,'triangles':sum(triangles(o) for o in objects),'draws':len(objects),
        'seconds':time.perf_counter()-started,'files':{p.name:digest(p) for p in [out/f'{name}.glb',out/f'{name}.blend',out/f'{name}-color.png',out/f'{name}-surface.png']}}

def triangles(obj):
    obj.data.calc_loop_triangles();return len(obj.data.loop_triangles)

def hand_geometry(name,cfg):
    g=Geometry();definitions=[('root',(0,0,0),None),('rpg-mount',RPG_GRIP,'root'),('wrench-mount',WRENCH_GRIP,'root')]
    for side,sign,grip in [('R',1,RPG_GRIP),('L',-1,RPG_GRIP+Vector((0,0,-.34)))]:
        hand='wrist_'+side;s=cfg['scale']
        wrist=grip+Vector((sign*.07,-.065,.095))
        definitions.append((hand,wrist,'root'))
        # A shaped forearm has a muscle belly, a tapered wrist and asymmetric
        # rolled folds. Several rings replace the previous long straight cone.
        elbow=Vector((sign*.35,-.43,-.27 if side=='R' else -.39))
        start=Vector((sign*.46,-.63,-.18 if side=='R' else -.28))
        sleeve_end={'rook':.82,'nell':0,'jax':.95,'odessa':.60,
                    'cinder':0,'dune':.84,'wren':.60,'tusk':0}[name]
        centres=[start];radii=[(.088*s,.076*s)];weights=[{'root':1}];tiles=[]
        samples=[0,.15,.28,.40,.52,.60,.69,.77,.82,.88,.94,1]
        for i,t in enumerate(samples):
            centre=elbow.lerp(wrist,t)+Vector((sign*.015*math.sin(t*math.pi),.012*math.sin(t*math.pi),0))
            base=.079*(1-t)+.035*t+.009*math.sin(t*math.pi)
            fold=(.006 if i%2==0 else -.003)*math.sin(t*math.pi) if t<sleeve_end else 0
            centres.append(centre);radii.append(((base+fold)*s,(base*.82+fold*.7)*s))
            w=min(1,.25+t*.95);weights.append({hand:w,'root':1-w})
            tiles.append(0 if t<=sleeve_end and sleeve_end else 2)
        centres.extend([grip+Vector((sign*.053,-.020,.030)),grip+Vector((sign*.050,.006,.003)),grip+Vector((sign*.043,.027,-.014))])
        radii.extend([(.046*s,.034*s),(.061*s,.033*s),(.055*s,.028*s)])
        weights.extend([{hand:1}]*3);tiles.extend([1,1,1])
        g.loft(centres,radii,tiles,weights,16,axes=((0,1,0),(1,0,0)))
        if sleeve_end:
            cuff=elbow.lerp(wrist,sleeve_end)+Vector((sign*.015*math.sin(sleeve_end*math.pi),.012*math.sin(sleeve_end*math.pi),0))
            radius=(.079*(1-sleeve_end)+.035*sleeve_end+.009*math.sin(sleeve_end*math.pi))*s
            tangent=(wrist-elbow).normalized()
            cw=min(1,.25+sleeve_end*.95)
            g.loft([cuff-tangent*.015,cuff-tangent*.010,cuff+tangent*.007,cuff+tangent*.014],
                [(radius+.008,radius*.82+.005),(radius+.012,radius*.82+.009),
                 (radius+.012,radius*.82+.009),(radius+.005,radius*.82+.004)],
                7 if name in ['rook','odessa','wren'] else 8,[{hand:cw,'root':1-cw}]*4,16,
                axes=((0,1,0),(1,0,0)),closed=False)
        # Fitted glove cuff has open ends over the continuous wrist.
        g.loft([wrist+Vector((0,0,.012)),wrist-Vector((0,0,.010))],
            [(.041*s,.037*s)]*2,9,[{hand:1}]*2,16,axes=((0,1,0),(1,0,0)),closed=False)
        for digit,yy,length in [('index',.040,1.),('middle',.013,1.06),('ring',-.014,.99),('pinky',-.040,.84)]:
            angles=[0,.38,.82,1.26,1.72,2.22,2.60]
            path=[grip+Vector((sign*(.038*math.cos(a)),yy*s,-.006-.035*math.sin(a)*length)) for a in angles]
            labels=[f'finger_{digit}_{i}_{side}' for i in range(3)]
            for i,label in enumerate(labels):definitions.append((label,path[i*2],hand if i==0 else labels[i-1]))
            ws=[{labels[min(2,i//2)]:1} for i in range(len(path))]
            rr=[.014*s,.015*s,.0135*s,.013*s,.0115*s,.0105*s,.009*s]
            # Fingerless glove ends reveal small natural fingertips, as on crew sheets.
            g.loft(path,rr,[1,1,1,1,2,2],ws,12)
        path=[grip+Vector((sign*.048,-.036,.028)),grip+Vector((sign*.046,-.017,.036)),grip+Vector((sign*.026,.008,.039)),grip+Vector((sign*.007,.026,.020))]
        labels=[f'finger_thumb_{i}_{side}' for i in range(3)]
        for i,label in enumerate(labels):definitions.append((label,path[i],hand if i==0 else labels[i-1]))
        g.loft(path,[.022*s,.020*s,.017*s,.012*s],[1,1,2],[{labels[min(i,2)]:1} for i in range(4)],12)
        # Raised stitched knuckle pads, not separate unbound mitten shapes.
        for yy in [.038,.012,-.015,-.04]:
            pad=grip+Vector((sign*.073,yy*s,-.001))
            g.loft([pad-Vector((sign*.006,0,0)),pad,pad+Vector((sign*.007,0,0))],
                [(.012*s,.018),(.014*s,.020),(.006*s,.012)],9,[{hand:1}]*3,8,axes=((0,1,0),(0,0,1)))
        if name=='tusk':
            g.box(wrist+Vector((sign*.042,.005,.01)),(.018,.078,.075),13,hand)
            for yy in [-.024,.026]:g.box(wrist+Vector((sign*.053,yy,.01)),(.009,.009,.065),11,hand)
        for yy in [-.048,.047]:
            seam=[grip+Vector((sign*.077,yy,.015)),grip+Vector((sign*.079,yy,-.003)),grip+Vector((sign*.064,yy,-.020))]
            g.loft(seam,[.0018]*3,7,[{hand:1}]*3,5)
        if name in ['nell','cinder']:
            for t in [.57,.69,.81]:
                at=elbow.lerp(wrist,t)+Vector((sign*.015*math.sin(t*math.pi),.012*math.sin(t*math.pi),0));tangent=(wrist-elbow).normalized()
                radius=(.079*(1-t)+.035*t+.009*math.sin(t*math.pi))*s
                wrap_weight=min(1,.25+t*.95)
                g.loft([at-tangent*.010,at+tangent*.010],[(radius+.004,radius*.83+.004)]*2,
                    6 if name=='cinder' else 1,[{hand:wrap_weight,'root':1-wrap_weight}]*2,16,
                    axes=((0,1,0),(1,0,0)),closed=False)
    return g,definitions

def hands_pose(rig,label,p):
    root_bone=rig.pose.bones['root'];wave=math.sin(p*math.tau)
    aimed=label in ['aim','aim-fire','aim-reload']
    # Both sight apertures are .009 m above the grip's camera height. Lower
    # the aimed assembly by that amount: sights on-axis, rear bell below it.
    root_bone.location=(-.14 if aimed else 0,-.009 if aimed else 0,-.045 if aimed else 0)
    if label in ['idle','aim','wrench-idle']:root_bone.location.y+=wave*.003
    if label in ['fire','aim-fire']:
        kick=max(0,math.sin(min(1,p*2.6)*math.pi))*(1-p)
        root_bone.location.z+=.065*kick;root_bone.rotation_euler.x=.075*kick
        rig.pose.bones['finger_index_0_R'].rotation_euler.y=.18*math.sin(p*math.pi)
    if label in ['reload','aim-reload']:
        # Support hand releases, retrieves below frame, then guides a new rocket.
        turn=min(1,max(0,(p-.08)/.18),max(0,(1-p)/.18))*math.pi/2
        grip_rotation(rig,'L',(turn,0,0),reload_hand_delta(p))
        for bone in rig.pose.bones:
            if bone.name.startswith('finger_') and bone.name.endswith('_L'):bone.rotation_euler.y=-.18*math.sin(p*math.pi)
    if label in ['repair','wrench-idle']:
        delta=WRENCH_GRIP-RPG_GRIP
        grip_rotation(rig,'R',(-.14,0,0),delta)
        rig.pose.bones['wrench-mount'].rotation_euler.x=-.14
        rig.pose.bones['wrist_L'].location=(-.32,-.36,.2)
        if label=='repair':
            stroke=math.sin(p*math.tau*4)
            rotation=(-.14+.06*stroke,0,.27*stroke)
            grip_rotation(rig,'R',rotation,delta+Vector((0,.027*stroke,0)))
            rig.pose.bones['wrench-mount'].rotation_euler=rotation
            rig.pose.bones['wrench-mount'].location.y+=.027*stroke
    for bone in rig.pose.bones:
        if bone.name.startswith('finger_') and 'index_0_R' not in bone.name:
            bone.rotation_euler.y+=.015*wave

def camera_lights(scene):
    bpy.ops.object.camera_add(location=(0,0,0));camera=bpy.context.object
    camera.rotation_euler=(Vector((0,1,0))).to_track_quat('-Z','Y').to_euler()
    camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32
    camera.data.lens=32/(2*math.tan(math.radians(72)/2));camera.data.clip_start=.15;camera.data.clip_end=100
    scene.camera=camera
    for label,where,energy,size in [('Key',(-2,2.5,2.5),220,3),('Fill',(2,1,1),100,3),('Rim',(0,-1,2),140,2)]:
        bpy.ops.object.light_add(type='AREA',location=where);light=bpy.context.object;light.name=label
        light.data.energy=energy;light.data.size=size
        light.rotation_euler=(Vector((0,.7,-.1))-light.location).to_track_quat('-Z','Y').to_euler()
    return camera

def import_tool(name):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(out/f'{name}.glb'))
    new=list(set(bpy.data.objects)-before)
    roots=[obj for obj in new if obj.parent is None]
    rig=next(obj for obj in new if obj.type=='ARMATURE')
    return new,roots,rig

def build_hands(name,cfg):
    started=time.perf_counter();scene=fresh()
    mat=texture_material(name,cfg,out/'hands')
    g,definitions=hand_geometry(name,cfg);rig=armature(name+' first-person hands',definitions)
    mesh=g.build(name+' sleeves gloves fingers',mat,rig)
    actions={label:add_action(rig,label,duration,lambda phase,label=label:hands_pose(rig,label,phase),32 if label=='repair' else 16) for label,duration in CLIPS.items()}
    export(rig,[mesh],out/'hands'/f'{name}.glb')
    camera_lights(scene)
    imported={tool:import_tool(tool) for tool in ['rpg','wrench']}
    captures=[]
    if not args.skip_renders:
        samples=[('idle',.25,'rpg'),('wrench-idle',.25,'wrench')]
        if name=='rook':samples += [('aim',.25,'rpg'),('fire',.10,'rpg'),('reload',1.1,'rpg'),('reload',1.65,'rpg'),('aim-reload',1.1,'rpg')]
        if name=='odessa':samples += [('repair',1.12,'wrench'),('repair',2.8,'wrench')]
        for clip,t,tool in samples:
            rig.animation_data.action=actions[clip];scene.frame_set(1,subframe=0)
            scene.frame_set(int(1+t*60),subframe=(t*60)%1);bpy.context.view_layer.update()
            for other,(objects,roots,toolrig) in imported.items():
                for obj in objects:obj.hide_render=other!=tool
                if other==tool:
                    if toolrig.animation_data:
                        toolrig.animation_data.action=None
                        for track in toolrig.animation_data.nla_tracks:track.mute=True
                    for bone in toolrig.pose.bones:bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
                    if other=='rpg' and clip in ['reload','aim-reload']:rocket_pose(toolrig,t/CLIPS[clip])
                    socket=rig.matrix_world@rig.pose.bones[other+'-mount'].matrix
                    # Imported glTF root has Blender axis basis; preserve that basis
                    # while placing its GLTF camera-local origin on the socket.
                    basis=Matrix.Rotation(-math.pi/2,4,'X')
                    for obj in roots:obj.matrix_world=socket@basis
            path=shots/f'blender-{name}-{clip}-{t:.2f}.png';scene.render.filepath=str(path)
            bpy.ops.render.render(write_still=True)
            captures.append(dict(path=path.relative_to(root).as_posix(),sha256=digest(path),crew=name,clip=clip,time=t,tool=tool))
    rig.animation_data.action=actions['idle'];scene.frame_set(16)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'hands'/f'{name}.blend'))
    source=root/f'public/assets/reference/wasteland-crew-{cfg["sheet"]}.png'
    report=dict(id=name,triangles=triangles(mesh),draws=1,seconds=time.perf_counter()-started,clips=CLIPS,
        reference=dict(path=source.relative_to(root).as_posix(),sha256=digest(source),crop=cfg['crop']),
        files={p.name:digest(p) for p in [out/'hands'/f'{name}.glb',out/'hands'/f'{name}.blend',out/'hands'/f'{name}-color.png',out/'hands'/f'{name}-surface.png']},captures=captures)
    (shots/f'blender-{name}.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8',newline='\n')
    print('HANDS_ASSET '+json.dumps({'id':name,'triangles':report['triangles'],'seconds':report['seconds']}),flush=True)
    return report

started=time.perf_counter()
tools=[build_tool(name) for name in ['rpg','wrench']]
hands=[build_hands(name,cfg) for name,cfg in CREW.items() if args.crew in ['all',name]]
manifest=dict(round=args.round,blender=bpy.app.version_string,seconds=time.perf_counter()-started,
    command='blender -b --python tools/blender/first-person-gear.py -- --root REPO --round '+str(args.round)+' --crew '+args.crew,
    scriptSha256=digest(__file__),axis='Camera-local glTF: +X right, +Y up, -Z forward. Identity camera attachment; socket axes identity in rest pose.',
    camera=dict(position=[0,0,0],target=[0,0,-1],verticalFov=72,near=.15,width=1280,height=720),
    materials='Authored padded 1024 islands for cloth, leather, skin and steel; seeded grain and localized wear. No reference image projection. Original sheets untouched.',
    tools=tools,hands=hands,toolReferences=[dict(path='public/assets/reference/wasteland-'+name+'.png',sha256=digest(root/'public/assets/reference'/('wasteland-'+name+'.png'))) for name in ['rpg','wrench']])
(shots/'blender-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
print('GFX-02 FIRST PERSON EXPORT COMPLETE',flush=True)
