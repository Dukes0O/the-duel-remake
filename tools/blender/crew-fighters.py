"""Reproducible GFX-01 crew, projected from the approved three-view references.

blender -b --python tools/blender/crew-fighters.py -- --root REPO [--crew rook]
The original references are unchanged. Atlas processing was authorized by Kyle.
Blender Z up/-Y forward becomes glTF Y up/+Z forward exactly once at export.
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
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--crew', default='all')
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--skip-renders', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/crew'
shots = root / f'docs/board/looks/crew/round-{args.round}'
out.mkdir(parents=True, exist_ok=True)
shots.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0

# Crop centres in the original, full-resolution sheets. The figures' floor and
# crown pixels are recorded, so UV projection and evidence are reproducible.
CREW = {
    'rook': dict(sheet=1, centres=[112, 287, 443], floor=650, crown=62, height=1.83,
                 width=1.00, female=False, hair='rough', vest=True),
    'nell': dict(sheet=1, centres=[633, 776, 925], floor=650, crown=77, height=1.73,
                 width=.91, female=True, hair='curls', sleeveless=True, goggles=True),
    'jax': dict(sheet=1, centres=[1143, 1277, 1442], floor=650, crown=68, height=1.86,
                width=.98, female=False, hair='knot', coat=True),
    'odessa': dict(sheet=1, centres=[1648, 1810, 1968], floor=650, crown=76, height=1.77,
                   width=.98, female=True, hair='grey-knot', mechanic=True),
    'cinder': dict(sheet=2, centres=[111, 275, 445], floor=652, crown=44, height=1.76,
                   width=.91, female=True, hair='high-knot', sleeveless=True, respirator=True),
    'dune': dict(sheet=2, centres=[640, 795, 933], floor=652, crown=54, height=1.85,
                 width=.96, female=False, hair='hood', hood=True),
    'wren': dict(sheet=2, centres=[1155, 1305, 1443], floor=652, crown=74, height=1.65,
                 width=.88, female=True, hair='short', cropped=True, goggles=True),
    'tusk': dict(sheet=2, centres=[1633, 1792, 1965], floor=652, crown=37, height=1.94,
                 width=1.24, female=False, hair='bald', armor=True),
}
CLIPS = ['idle', 'walk', 'sprint', 'jump', 'knockdown', 'get-up',
         'aim', 'fire', 'reload', 'repair', 'enter', 'exit']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atlas_for(name, cfg):
    source_path = root / f'public/assets/reference/wasteland-crew-{cfg["sheet"]}.png'
    source = bpy.data.images.load(str(source_path), check_existing=True)
    width, height = source.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    source.pixels.foreach_get(pixels)
    # Blender pixels start at the bottom, while crop coordinates use top-left.
    pixels = pixels.reshape(height, width, 4)[::-1]
    atlas = np.ones((1024, 1024, 4), dtype=np.float32)
    bounds = []
    for view, centre in enumerate(cfg['centres']):
        # Side silhouettes are narrower. Front/back share the same metric span.
        span = 244 if view != 1 else 194
        x0, x1 = max(0, centre-span//2), min(width, centre+span//2)
        y0, y1 = cfg['crown']-15, cfg['floor']+12
        crop = pixels[y0:y1, x0:x1].copy()
        # Extend edge colors into the neutral background. This avoids grey rims
        # on modeled silhouette edges without altering the source reference.
        for row in crop:
            bg = (row[0, :3] + row[-1, :3]) * .5
            valid = np.where(np.linalg.norm(row[:, :3]-bg, axis=1) > .095)[0]
            if len(valid) > 4:
                invalid = np.where(np.linalg.norm(row[:, :3]-bg, axis=1) <= .095)[0]
                nearest = valid[np.argmin(np.abs(invalid[:, None]-valid[None, :]), axis=1)]
                row[invalid, :3] = row[nearest, :3]
        left, right = round(view*1024/3), round((view+1)*1024/3)
        xx = np.linspace(0, crop.shape[1]-1, right-left)
        yy = np.linspace(0, crop.shape[0]-1, 1024)
        xi, yi = np.floor(xx).astype(int), np.floor(yy).astype(int)
        xj, yj = np.minimum(xi+1,crop.shape[1]-1), np.minimum(yi+1,crop.shape[0]-1)
        tx, ty = (xx-xi)[None,:,None], (yy-yi)[:,None,None]
        resized = (crop[yi[:,None],xi[None,:]]*(1-tx)+crop[yi[:,None],xj[None,:]]*tx)*(1-ty)
        resized += (crop[yj[:,None],xi[None,:]]*(1-tx)+crop[yj[:,None],xj[None,:]]*tx)*ty
        atlas[:,left:right] = resized
        bounds.append(dict(view=['front','side','back'][view], crop=[x0,y0,x1,y1],
                           atlas=[left,0,right,1024], centre=centre))
    image = bpy.data.images.new(name+'-reference-atlas', width=1024, height=1024, alpha=False)
    image.pixels.foreach_set(atlas[::-1].reshape(-1))
    image.filepath_raw = str(out / f'{name}-color.png')
    image.file_format = 'PNG'
    image.save()
    image.pack()
    return image, bounds, source_path


def build(name, cfg):
    started = time.perf_counter()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Each .blend retains only this crew, not orphaned packed textures/actions
    # from the previous iteration of the eight-asset generation process.
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.render.resolution_x = 432
    scene.render.resolution_y = 576
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.fps = 24
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'Medium High Contrast'
    scene.world.color = (.23,.23,.23)
    texture, crops, source = atlas_for(name,cfg)
    material = bpy.data.materials.new(name+' worn cloth leather and steel')
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .86
    node = material.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = texture
    material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    parts = []
    scale = cfg['height']/1.83
    wide = cfg['width']

    def finish(obj, label, bone, projection=None):
        obj.name = label
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        # Every component is shaped in a common body coordinate frame before
        # texturing and weighting. Projection remains attached during animation.
        for vertex in obj.data.vertices:
            vertex.co.x *= wide
            vertex.co *= scale
        obj.data.materials.clear()
        obj.data.materials.append(material)
        obj.data.update()
        uv = obj.data.uv_layers.new(name='ReferenceProjection')
        for polygon in obj.data.polygons:
            normal = polygon.normal
            view = projection if projection is not None else (1 if abs(normal.x) > abs(normal.y)*1.45 else (0 if normal.y < 0 else 2))
            crop = crops[view]
            x0,y0,x1,y1 = crop['crop']
            left,_,right,_ = crop['atlas']
            ppm = (cfg['floor']-cfg['crown'])/cfg['height']
            for index in polygon.loop_indices:
                co = obj.data.vertices[obj.data.loops[index].vertex_index].co
                if view == 1:
                    # Every reference side view faces right. Forward -Y must
                    # therefore project right, not mirror the profile.
                    pixel_x = crop['centre'] - co.y*ppm
                else:
                    arm = any(word in label.lower() for word in ['arm','sleeve','cuff','hand','finger','thumb'])
                    across = co.x * (.82 if arm else 1)
                    if 'hair' in label.lower(): across *= .75
                    pixel_x = crop['centre'] + across*ppm*(1 if view==0 else -1)
                pixel_y = cfg['floor']-co.z*ppm
                if 'hair' in label.lower(): pixel_y = max(cfg['crown']+14,pixel_y)
                u = max(.002,min(.998,(pixel_x-x0)/(x1-x0)))
                v = max(.002,min(.998,1-(pixel_y-y0)/(y1-y0)))
                uv.data[index].uv = ((left+u*(right-left))/1024,v)
            polygon.use_smooth = True
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
        parts.append(obj)
        return obj

    def surface(label, rings, bone, count=12, projection=None):
        vertices,faces=[],[]
        for level,(x,y,z,rx,ry) in enumerate(rings):
            for n in range(count):
                a=n*math.tau/count
                # Small alternating radial folds preserve tailored rather than
                # perfectly circular sleeve/trouser contours.
                fold=1+.025*math.sin(n*3+level*1.8)
                vertices.append((x+rx*math.cos(a)*fold,y+ry*math.sin(a)*fold,z))
        for level in range(len(rings)-1):
            for n in range(count):
                a=level*count+n;b=level*count+(n+1)%count
                faces.append((a,b,b+count,a+count))
        faces.extend([tuple(reversed(range(count))),tuple((len(rings)-1)*count+n for n in range(count))])
        mesh=bpy.data.meshes.new(label);mesh.from_pydata(vertices,[],faces);mesh.update()
        obj=bpy.data.objects.new(label,mesh);bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        return finish(obj,label,bone,projection)

    def ellipsoid(label,center,size,bone,segments=10,rings=6,projection=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=center)
        obj=bpy.context.object;obj.scale=size
        return finish(obj,label,bone,projection)

    def patch(label,center,size,bone,bevel=.008,projection=None):
        bpy.ops.mesh.primitive_cube_add(size=1,location=center)
        obj=bpy.context.object;obj.scale=size
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        mod=obj.modifiers.new('Soft tailored edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        return finish(obj,label,bone,projection)

    female=cfg['female']
    waist=.145 if female else .175
    shoulder=.218 if female else .237
    hem=1.08 if cfg.get('cropped') else .98
    surface('Tailored torso',[(0,0,hem,.178,.111),(0,0,1.10,waist,.105),
        (0,0,1.23,.183 if female else .204,.119),(0,-.006,1.34,.204 if female else .225,.124),
        (0,0,1.425,shoulder,.112),(0,0,1.46,.19,.095),(0,0,1.49,.083,.066)],'chest',16)
    surface('Pelvis and trouser seat',[(0,0,.84,.185,.113),(0,.004,.95,.196,.131),
        (0,0,1.035,.17,.107)],'pelvis',16)
    surface('Utility belt',[(0,0,.984,.199,.132),(0,0,1.025,.19,.12)],'pelvis')
    patch('Steel belt buckle',(0,-.137,1.005),(.06,.015,.04),'pelvis',.004,0)
    if cfg.get('cropped'):
        surface('Exposed midriff',[(0,0,1.02,.166,.104),(0,0,1.095,.148,.10)],'chest')
    for side,suffix in [(-1,'L'),(1,'R')]:
        x=side*.106
        surface('Thigh '+suffix,[(x,0,.96,.095,.111),(side*.118,0,.86,.103,.107),
            (side*.128,.003,.73,.088,.095),(side*.13,-.006,.60,.07,.077),
            (side*.13,-.013,.545,.071,.079)],'thigh.'+suffix,12)
        surface('Calf '+suffix,[(side*.13,-.013,.57,.072,.08),(side*.137,.014,.48,.077,.085),
            (side*.143,.018,.37,.065,.073),(side*.145,.012,.28,.058,.061),
            (side*.146,.005,.205,.06,.063)],'shin.'+suffix,12)
        # Angular toe box, defined instep and a flat sole instead of round feet.
        surface('Boot '+suffix,[(side*.146,-.048,.025,.074,.132),(side*.146,-.047,.068,.078,.135),
            (side*.146,-.057,.115,.071,.122),(side*.146,-.026,.165,.066,.089),
            (side*.146,.0,.255,.061,.065)],'foot.'+suffix,12)
        surface('Flat rubber sole '+suffix,[(side*.146,-.048,.008,.076,.132),
            (side*.146,-.048,.033,.078,.134)],'foot.'+suffix,12)
        patch('Flat cargo pocket '+suffix,(side*.195,-.006,.785),(.045,.115,.145),'thigh.'+suffix,.01)
        ellipsoid('Molded knee pad '+suffix,(side*.132,-.084,.568),(.064,.021,.074),'shin.'+suffix,10,6,0)
        sx=side*.235
        skin=cfg.get('sleeveless',False)
        surface(('Bare upper arm ' if skin else 'Sleeve ')+suffix,
            [(sx,0,1.43,.069,.077),(side*.257,0,1.35,.068 if skin else .077,.076),
             (side*.275,-.004,1.24,.054 if skin else .065,.063),
             (side*.279,-.014,1.17,.05 if skin else .06,.061)],'upper_arm.'+suffix,12)
        surface('Forearm '+suffix,[(side*.279,-.014,1.19,.053,.061),(side*.286,-.023,1.10,.055,.06),
             (side*.292,-.037,1.015,.043,.049),(side*.293,-.043,.953,.035,.039)],'forearm.'+suffix,12)
        if not skin:
            surface('Rolled cuff '+suffix,[(side*.282,-.022,1.12,.06,.063),
                (side*.286,-.023,1.075,.058,.063)],'forearm.'+suffix)
        surface('Gloved hand '+suffix,[(side*.293,-.043,.96,.037,.04),
            (side*.297,-.05,.91,.043,.035),(side*.298,-.05,.872,.038,.028)],'hand.'+suffix,10)
        for digit in range(4):
            ellipsoid('Finger '+suffix+str(digit),(side*(.272+digit*.016),-.054,.853+(digit%3)*.004),
                (.010,.023,.033),'hand.'+suffix,6,4)
        ellipsoid('Thumb '+suffix,(side*.26,-.07,.914),(.019,.025,.034),'hand.'+suffix,8,5)
        patch('Hip utility pouch '+suffix,(side*.184,-.068,.98),(.077,.049,.105),'pelvis',.009)
    # A continuous neck and deliberately tapered face, plus nose/ears and lips.
    surface('Neck',[(0,0,1.46,.063,.061),(0,0,1.56,.057,.058)],'neck',12)
    surface('Facial anatomy',[(0,-.018,1.567,.043,.039),(0,-.024,1.596,.064,.054),
        (0,-.015,1.63,.078,.068),(0,-.009,1.68,.087,.079),
        (0,-.001,1.73,.084,.079),(0,.005,1.777,.067,.064),
        (0,.009,1.795,.034,.039)],'head',20)
    ellipsoid('Nose bridge',(0,-.085,1.676),(.014,.018,.034),'head',10,6,0)
    ellipsoid('Nose tip',(0,-.105,1.658),(.020,.014,.013),'head',10,6,0)
    ellipsoid('Lower lip',(0,-.082,1.625),(.026,.009,.008),'head',10,4,0)
    for side in [-1,1]:
        ellipsoid('Ear '+str(side),(side*.085,.002,1.674),(.012,.018,.032),'head',8,6)
        ellipsoid('Cheek '+str(side),(side*.057,-.064,1.663),(.03,.015,.029),'head',8,6,0)
    hair=cfg['hair']
    if hair!='bald':
        if hair=='hood':
            # Open face: a back shell and side strips, not a closed sphere.
            surface('Hood back',[(0,.061,1.49,.11,.055),(0,.06,1.68,.107,.061),
                 (0,.027,1.81,.092,.072),(0,.008,1.836,.063,.059)],'head',14,2)
            for side in [-1,1]:
                ellipsoid('Hood edge '+str(side),(side*.082,-.02,1.694),(.025,.045,.127),'head',10,8)
        else:
            ellipsoid('Hair crown',(0,.017,1.781),(.09,.074,.044),'head',14,8)
            count=18 if hair in ['rough','curls','short'] else 9
            for n in range(count):
                a=n*2.399963
                rad=.074 if hair!='curls' else .084
                ellipsoid('Broken hair lock '+str(n),(math.cos(a)*rad,.014+math.sin(a)*.063,
                    1.765+.035*math.sin(n*1.7)),(.026,.026,.035),'head',6,4)
            if 'knot' in hair:
                ellipsoid('Tied hair',(0,.085 if hair!='high-knot' else .025,1.795),(.044,.044,.051),'head',10,6)
            if hair in ['rough','short']:
                for side in [-1,1]:
                    ellipsoid('Side hair '+str(side),(side*.08,.023,1.71),(.017,.058,.066),'head',8,6)
    if not female and hair!='hood':
        ellipsoid('Shaped beard',(0,-.041,1.603),(.067,.047,.043 if hair!='bald' else .071),'head',12,7,0)
    # Distinct layered clothing and silhouette details, with flat sewn panels.
    if cfg.get('vest'):
        for side in [-1,1]:
            patch('Open vest panel '+str(side),(side*.116,-.11,1.253),(.117,.023,.326),'chest',.012,0)
            for z in [1.31,1.115]:
                patch('Rectangular sewn pocket',(side*.115,-.133,z),(.081,.023,.086),'chest',.008,0)
    if cfg.get('coat'):
        for side,suffix in [(-1,'L'),(1,'R')]:
            surface('Long split coat '+suffix,[(side*.124,.052,1.02,.115,.105),
                (side*.15,.045,.85,.117,.116),(side*.172,.056,.64,.114,.124),
                (side*.19,.069,.46,.117,.12)],'thigh.'+suffix,12)
            patch('Coat lapel '+suffix,(side*.109,-.119,1.365),(.07,.022,.20),'chest',.008,0)
        # Distinct coiled grapple line on the back and wrist launcher.
        for n in range(3):
            surface('Coiled grapple rope '+str(n),[(.095,.139,1.14+n*.045,.085,.012),
                (.095,.143,1.17+n*.045,.087,.014)],'chest',14,2)
        patch('Wrist grapple housing',(-.29,-.085,1.07),(.06,.047,.16),'forearm.L',.01)
    if cfg.get('armor'):
        for side in [-1,1]:
            ellipsoid('Riveted layered pauldron '+str(side),(side*.242,0,1.425),(.119,.129,.086),'chest',12,6)
        patch('Rusted back plate',(0,.136,1.267),(.30,.033,.285),'chest',.012,2)
    if cfg.get('mechanic'):
        patch('Mechanic chest bib',(0,-.134,1.29),(.246,.018,.18),'chest',.007,0)
    if cfg.get('goggles') or cfg.get('respirator'):
        z=1.762 if cfg.get('goggles') else 1.485
        for side in [-1,1]:
            ellipsoid('Goggle or filter '+str(side),(side*.043,-.089,z),(.031,.018,.027),'head' if cfg.get('goggles') else 'neck',10,6,0)
    if name in ['rook','nell','cinder','dune','wren','tusk']:
        surface('Layered scarf',[(0,0,1.48,.092,.084),(0,-.004,1.514,.084,.077),
            (0,0,1.544,.074,.07)],'neck',14)
        ellipsoid('Scarf front folds',(0,-.092,1.455),(.09,.023,.064),'chest',12,6,0)
    if name=='dune':
        patch('Sniper supply pack',(0,.166,1.261),(.234,.096,.265),'chest',.024,2)
    if name=='nell':
        for side in [-1,1]:
            for n in range(2):
                surface('Demolition canister',[(side*(.065+n*.048),.14,1.16,.02,.022),
                    (side*(.065+n*.048),.14,1.32,.02,.022)],'chest',8,2)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    body=bpy.context.object;body.name=name+'-near';body['lod']='near'
    for polygon in body.data.polygons: polygon.material_index=0
    while len(body.data.materials)>1: body.data.materials.pop(index=1)
    body.data.calc_loop_triangles()
    if len(body.data.loop_triangles)>7800:
        mod=body.modifiers.new('Budgeted near topology','DECIMATE')
        mod.ratio=7700/len(body.data.loop_triangles)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    far=body.copy();far.data=body.data.copy();far.name=name+'-far';far['lod']='far'
    bpy.context.collection.objects.link(far)
    bpy.context.view_layer.objects.active=far
    far.data.calc_loop_triangles()
    mod=far.modifiers.new('Distant silhouette topology','DECIMATE')
    mod.ratio=min(1,1880/len(far.data.loop_triangles))
    bpy.ops.object.modifier_apply(modifier=mod.name)

    armature=bpy.data.armatures.new(name+' skeleton')
    rig=bpy.data.objects.new(name+' rig',armature);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(label,head,tail,parent=None):
        b=armature.edit_bones.new(label)
        b.head=Vector((head[0]*wide,head[1],head[2]))*scale
        b.tail=Vector((tail[0]*wide,tail[1],tail[2]))*scale
        if parent:b.parent=armature.edit_bones[parent]
    bone('root',(0,0,0),(0,0,.15))
    bone('pelvis',(0,0,.94),(0,0,1.09),'root')
    bone('chest',(0,0,1.09),(0,0,1.47),'pelvis')
    bone('neck',(0,0,1.47),(0,0,1.56),'chest')
    bone('head',(0,0,1.56),(0,0,1.8),'neck')
    for side,suffix in [(-1,'L'),(1,'R')]:
        bone('thigh.'+suffix,(side*.106,0,.94),(side*.13,-.013,.56),'pelvis')
        bone('shin.'+suffix,(side*.13,-.013,.56),(side*.146,0,.20),'thigh.'+suffix)
        bone('foot.'+suffix,(side*.146,0,.20),(side*.146,-.16,.06),'shin.'+suffix)
        bone('upper_arm.'+suffix,(side*.235,0,1.425),(side*.279,-.014,1.18),'chest')
        bone('forearm.'+suffix,(side*.279,-.014,1.18),(side*.293,-.043,.95),'upper_arm.'+suffix)
        bone('hand.'+suffix,(side*.293,-.043,.95),(side*.298,-.05,.82),'forearm.'+suffix)
    bpy.ops.object.mode_set(mode='OBJECT')
    for mesh in [body,far]:
        mesh.parent=rig
        mod=mesh.modifiers.new('Bound crew skin','ARMATURE');mod.object=rig
        # Blend the torso waist continuously across the bending joint.
        pelvis=mesh.vertex_groups.get('pelvis') or mesh.vertex_groups.new(name='pelvis')
        for vertex in mesh.data.vertices:
            for group in list(vertex.groups):
                if mesh.vertex_groups[group.group].name=='chest':
                    weight=max(0,min(1,(vertex.co.z/scale-1.01)/.19))
                    mesh.vertex_groups['chest'].add([vertex.index],weight,'REPLACE')
                    pelvis.add([vertex.index],1-weight,'REPLACE')
                    break
    rig.animation_data_create()
    for pb in rig.pose.bones:pb.rotation_mode='XYZ'
    actions={}
    for clip in CLIPS:
        duration={'idle':2,'walk':1,'sprint':.65,'jump':.8,'knockdown':1,
                  'get-up':1.2,'aim':1,'fire':.3,'reload':2.2,'repair':1.2,'enter':.8,'exit':.8}[clip]
        frames=[1+round(duration*24*i/8) for i in range(9)]
        action=bpy.data.actions.new(clip);rig.animation_data.action=action
        for i,frame in enumerate(frames):
            p=i/8;wave=math.sin(p*math.tau)
            for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
            def rot(label,x=0,y=0,z=0):rig.pose.bones[label].rotation_euler=(x,y,z)
            if clip=='idle':rot('chest',.012*wave);rot('head',0,.035*wave)
            elif clip in ['walk','sprint']:
                stride=.46 if clip=='walk' else .78
                rot('chest',-.04 if clip=='walk' else -.15,0,.035*wave)
                for side,suffix in [(-1,'L'),(1,'R')]:
                    leg=side*wave
                    rot('thigh.'+suffix,stride*leg)
                    rot('shin.'+suffix,-(.12+.48*max(0,-leg)))
                    rot('foot.'+suffix,.10+.18*max(0,leg))
                    rot('upper_arm.'+suffix,-side*stride*.7*wave)
                    rot('forearm.'+suffix,-.25 if clip=='walk' else -.85)
            elif clip=='jump':
                lift=math.sin(p*math.pi)
                rot('chest',-.12*lift)
                for suffix in ['L','R']:
                    rot('thigh.'+suffix,.45*lift);rot('shin.'+suffix,-.7*lift)
                    rot('upper_arm.'+suffix,-.4*lift);rot('forearm.'+suffix,-.5*lift)
            elif clip in ['knockdown','get-up']:
                fall=min(1,p*1.5) if clip=='knockdown' else 1-p
                rot('root',math.pi*.49*fall)
                rot('chest',-.14*fall)
                rot('upper_arm.L',-.2*fall,0,-.5*fall)
                rot('upper_arm.R',-.25*fall,0,.6*fall)
                rot('shin.L',-.25*fall);rot('shin.R',-.15*fall)
            elif clip in ['aim','fire','reload']:
                recoil=math.sin(p*math.pi)*.16 if clip=='fire' else .015*wave
                rot('upper_arm.R',-1.12-recoil,0,-.2)
                rot('forearm.R',-.60,0,-.1)
                rot('upper_arm.L',-.96,0,.22)
                rot('forearm.L',-.9,0,.15)
                rot('chest',-.03-recoil*.25,0,.06)
                if clip=='reload':
                    rot('upper_arm.L',-.5-.4*math.sin(p*math.pi),0,.3)
                    rot('forearm.L',-.4-1.0*math.sin(p*math.pi),0,.15)
                rot('head',.025*wave)
            elif clip=='repair':
                rot('chest',-.32)
                rot('upper_arm.R',-.85+.22*wave,0,-.1);rot('forearm.R',-.7-.2*wave)
                rot('upper_arm.L',-.65,0,.1);rot('forearm.L',-.5)
            elif clip in ['enter','exit']:
                t=p if clip=='enter' else 1-p
                rot('chest',-.28*math.sin(t*math.pi),0,-.16*t)
                rot('thigh.L',.65*math.sin(t*math.pi));rot('shin.L',-.95*math.sin(t*math.pi))
                rot('upper_arm.R',-.85*math.sin(t*math.pi),0,-.35*t)
                rot('forearm.R',-.6*math.sin(t*math.pi))
            for pb in rig.pose.bones:
                pb.keyframe_insert(data_path='rotation_euler',frame=frame)
                pb.keyframe_insert(data_path='location',frame=frame)
        # Grounded samples. Jump adds no root rise: simulation owns airHeight.
        for frame in frames:
            scene.frame_set(frame);bpy.context.view_layer.update()
            evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
            floor=min((evaluated.matrix_world@v.co).z for v in evaluated.data.vertices)
            rig.pose.bones['root'].location.y-=floor
            rig.pose.bones['root'].keyframe_insert(data_path='location',frame=frame)
        actions[clip]=action
        track=rig.animation_data.nla_tracks.new();track.name=clip
        track.strips.new(clip,1,action);track.mute=True
    rig.animation_data.action=None
    for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
    scene.frame_set(1);bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [rig,body,far]:obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(out/f'{name}.glb'),export_format='GLB',
        use_selection=True,export_yup=True,export_animations=True,
        export_animation_mode='NLA_TRACKS',export_force_sampling=True,
        export_skins=True,export_materials='EXPORT',export_extras=True)
    far.hide_render=True;far.hide_set(True)
    bpy.ops.object.camera_add(location=(0,-5,.96))
    camera=bpy.context.object;camera.name='Matched five metre crew camera'
    camera.data.type='PERSP';camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32
    camera.data.lens=32/(2*math.tan(math.radians(28)/2))
    camera.rotation_euler=(Vector((0,0,.96))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=camera
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012))
    floor=bpy.context.object;floor.name='Neutral review floor'
    floor_mat=bpy.data.materials.new('Review neutral grey');floor_mat.diffuse_color=(.22,.22,.22,1)
    floor.data.materials.append(floor_mat)
    for label,location,energy,size in [('Key',(-3,-4,6),500,4),('Fill',(3,-2,3),240,5),('Rim',(0,3,4),350,3)]:
        bpy.ops.object.light_add(type='AREA',location=location)
        light=bpy.context.object;light.name=label;light.data.energy=energy;light.data.size=size
        light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    rig.animation_data.action=actions['idle'];scene.frame_set(7)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{name}.blend'))
    captures=[]
    if not args.skip_renders:
        for view,yaw in [('front',0),('side',math.pi/2),('back',math.pi)]:
            rig.rotation_euler.z=yaw
            path=shots/f'blender-{name}-idle-{view}.png'
            scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
            captures.append(dict(path=path.relative_to(root).as_posix(),sha256=digest(path),
                                 view=view,clip='idle',time=.25,yaw=yaw))
    rig.rotation_euler.z=0
    bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{name}.blend'))
    counts={}
    for level,mesh in [('near',body),('far',far)]:
        mesh.data.calc_loop_triangles();counts[level]=len(mesh.data.loop_triangles)
    report=dict(crew=name,round=args.round,blender=bpy.app.version_string,seconds=time.perf_counter()-started,
        triangles=counts,materials=1,texture=[1024,1024],height=cfg['height'],clips=CLIPS,
        axis='Blender Z-up/-Y-forward; export_yup once to glTF Y-up/+Z-forward',
        reference=dict(path=source.relative_to(root).as_posix(),sha256=digest(source),crops=crops,
        process='Bilinear three-view crop atlas; deterministic horizontal neutral-background edge extension. Originals untouched.'),
        camera=dict(position=[0,.96,5],target=[0,.96,0],verticalFov=28,width=432,height=576,distanceMetres=5),
        files={p.name:digest(p) for p in [out/f'{name}.glb',out/f'{name}.blend',out/f'{name}-color.png']},
        captures=captures)
    (shots/f'blender-{name}.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('CREW_ASSET '+json.dumps(dict(crew=name,triangles=counts,seconds=report['seconds'])))
    return report


reports=[]
for crew,cfg in CREW.items():
    if args.crew in ['all',crew]:reports.append(build(crew,cfg))
(shots/'blender-manifest.json').write_text(json.dumps(dict(round=args.round,
    command='blender -b --python tools/blender/crew-fighters.py -- --root REPO --round '+str(args.round),
    scriptSha256=digest(Path(__file__)),assets=reports),indent=2)+'\n',encoding='utf-8')
print('GFX-01 CREW EXPORT COMPLETE')
