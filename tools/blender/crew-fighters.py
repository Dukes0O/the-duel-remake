"""Reproducible GFX-01 crew, projected from the approved three-view references.

blender -b --python tools/blender/crew-fighters.py -- --root REPO [--crew rook]
The original references are unchanged. Atlas processing was authorized by Kyle.
Blender Z up/-Y forward becomes glTF Y up/+Z forward exactly once at export.
"""
import argparse
import hashlib
import json
import math
import os
import sys
import time
from datetime import date
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--crew', default='all')
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--skip-renders', action='store_true')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/crew'
blend_dir = root / 'art-build/crew'
crew_names = ('rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk')
selected_names = [name for name in crew_names if args.crew in ('all', name)]
def glb_path(name):
    return out / f'{name}.glb'
def blend_path(name):
    return blend_dir / f'{name}.blend'
shots = Path(os.environ.get('DUEL_EVIDENCE_DIR') or root / '.evidence' / date.today().isoformat() / 'crew' / f'round-{args.round}')
if not shots.is_absolute():
    shots = root / shots
if args.paths_only:
    print(json.dumps({'blend': [str(blend_path(name)) for name in selected_names],
                      'glb': [str(glb_path(name)) for name in selected_names],
                      'evidence': [str(shots)]}))
    sys.exit(0)

import bpy
import numpy as np
from mathutils import Vector

out.mkdir(parents=True, exist_ok=True)
blend_dir.mkdir(parents=True, exist_ok=True)
shots.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0

# Crop centres in the original, full-resolution sheets. The figures' floor and
# crown pixels are recorded, so UV projection and evidence are reproducible.
CREW = {
    'rook': dict(sheet=1, centres=[112, 287, 441], floor=650, crown=62, height=1.83,
                 width=1.00, female=False, hair='rough', vest=True),
    'nell': dict(sheet=1, centres=[633, 776, 922], floor=650, crown=77, height=1.73,
                 width=.91, female=True, hair='curls', sleeveless=True, goggles=True),
    'jax': dict(sheet=1, centres=[1138, 1277, 1451], floor=650, crown=68, height=1.86,
                width=.98, female=False, hair='knot', coat=True),
    'odessa': dict(sheet=1, centres=[1660, 1810, 1970], floor=650, crown=76, height=1.77,
                   width=.98, female=True, hair='grey-knot', mechanic=True),
    'cinder': dict(sheet=2, centres=[111, 275, 439], floor=652, crown=44, height=1.76,
                   width=.91, female=True, hair='high-knot', sleeveless=True, respirator=True),
    'dune': dict(sheet=2, centres=[664, 795, 927], floor=652, crown=54, height=1.85,
                 width=.96, female=False, hair='hood', hood=True),
    'wren': dict(sheet=2, centres=[1130, 1266, 1390], floor=652, crown=70, height=1.65,
                 width=.88, female=True, hair='short', cropped=True, goggles=True),
    'tusk': dict(sheet=2, centres=[1608, 1792, 1942], floor=652, crown=37, height=1.94,
                 width=1.24, female=False, hair='bald', armor=True),
}
CLIPS = ['idle', 'walk', 'sprint', 'jump', 'knockdown', 'get-up',
         'aim', 'fire', 'reload', 'repair', 'enter', 'exit']

# Per-part landmarks replace the broad world-space projection used in round 1.
# Head bottom is the chin/beard, not the neck scarf. These are source pixels.
LANDMARKS = {
    'rook': (116, 145, 80, 44, 77), 'nell': (640, 160, 62, 34, 98),
    'jax': (1136, 149, 78, 44, 77), 'odessa': (1660, 160, 72, 36, 96),
    'cinder': (111, 136, 79, 42, 79), 'dune': (660, 130, 79, 46, 78),
    'wren': (1132, 143, 72, 43, 95), 'tusk': (1617, 127, 104, 60, 40),
}
HEAD_SHAPES = {
    'rook': (1.04,.98), 'nell': (1.14,.83), 'jax': (1.02,.97),
    'odessa': (1.13,.84), 'cinder': (1.13,.83), 'dune': (1.02,.97),
    'wren': (1.15,.84), 'tusk': (1.16,1.08),
}


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
    # The same UV set has a surface map: cloth is dry, leather smoother, and
    # Tusk's plate regions reflect more strongly. Deterministic woven variation
    # is roughness only; it does not paint artificial highlights into albedo.
    yy,xx=np.indices((1024,1024))
    rough=np.full((1024,1024),.89,dtype=np.float32)
    rough[(yy>460)&(yy<560)]=.69
    rough[yy>870]=.70
    metal=np.zeros((1024,1024),dtype=np.float32)
    if name=='tusk':
        plated=(yy>210)&(yy<415)
        rough[plated]=.53;metal[plated]=.55
    rough+=.025*np.sin(xx*1.9+yy*.4)*np.sin(yy*2.1)
    surface=np.ones((1024,1024,4),dtype=np.float32)
    surface[:,:,1]=rough;surface[:,:,2]=metal
    finish=bpy.data.images.new(name+'-surface-atlas',width=1024,height=1024,alpha=False)
    finish.colorspace_settings.name='Non-Color'
    finish.pixels.foreach_set(surface[::-1].reshape(-1))
    finish.filepath_raw=str(out/f'{name}-surface.png');finish.file_format='PNG'
    finish.save();finish.pack()
    return image, finish, bounds, source_path


def build(name, cfg):
    started = time.perf_counter()
    # A fresh database, not merely deleted scene objects: packed images and
    # animation datablocks from another crew must never enter this .blend.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.world = bpy.data.worlds.new('Neutral crew review world')
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
    texture, surface_texture, crops, source = atlas_for(name,cfg)
    material = bpy.data.materials.new(name+' worn cloth leather and steel')
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .86
    node = material.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = texture
    material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    surface_node=material.node_tree.nodes.new('ShaderNodeTexImage');surface_node.image=surface_texture
    channels=material.node_tree.nodes.new('ShaderNodeSeparateColor')
    material.node_tree.links.new(surface_node.outputs['Color'],channels.inputs['Color'])
    material.node_tree.links.new(channels.outputs['Green'],shader.inputs['Roughness'])
    material.node_tree.links.new(channels.outputs['Blue'],shader.inputs['Metallic'])
    parts = []
    scale = cfg['height']/1.83
    wide = cfg['width']
    face_x, chin, arm_x, leg_x, head_top = LANDMARKS[name]
    photo_height = cfg['floor']-cfg['crown']

    def part_pixel(co, label, bone, view):
        """Each body island maps to its own photographed part, never a neighbor.

        Front/back projections meet along the rear side seam. Side photos are
        retained as references but are no longer stretched across front faces.
        In particular Tusk's left-facing profile cannot mirror his face here.
        """
        x,y,z=co.x/scale/wide,co.y/scale,co.z/scale
        side=-1 if x<0 else 1
        center=cfg['centres'][view]
        flip=1 if view==0 else -1
        low=label.lower()
        pixel_y=cfg['floor']-(z/1.83)*photo_height
        if 'hood' in low:
            pixel_x=center+side*(36+min(1,abs(x)/.12)*7)*flip
            pixel_y=cfg['crown']+max(12,min(112,(1.83-z)*350))
            return pixel_x,pixel_y
        if any(word in low for word in ['boot','sole']):
            # Padded interior boot island. Both boots share the photographed
            # left boot; neither can sample grey beside the toe/heel outline.
            pixel_x=cfg['centres'][0]-leg_x-12+max(-1,min(1,(abs(x)-.175)/.09))*7
            pixel_y=cfg['floor']-19-max(0,min(1,z/.255))*74
            return pixel_x,pixel_y
        if any(word in low for word in ['hand','finger','thumb']):
            pixel_x=cfg['centres'][0]-arm_x+max(-1,min(1,(abs(x)-.294)/.045))*5
            pixel_y=cfg['crown']+(.20+(1.45-z)/.62*.32)*photo_height
            return pixel_x,pixel_y
        if bone=='head':
            head_center=face_x if view==0 else center
            pixel_x=head_center+max(-1,min(1,x/.091))*29*flip
            crown=head_top+(12 if name=='tusk' and view==2 else 0)
            pixel_y=chin-(z-1.565)/.237*(chin-crown)
            if 'hair' in low:
                # A dedicated hair island prevents ears, eyes and background
                # from being repeated across the hair silhouette.
                pixel_x=head_center+max(-1,min(1,x/.09))*18
                pixel_y=cfg['crown']+12+max(0,min(1,(1.81-z)/.12))*12
            return pixel_x,pixel_y
        if any(word in low for word in ['arm','sleeve','cuff','hand','finger','thumb']):
            local_center=side*(.255 if z>1.30 else .28 if z>1.1 else .294)
            half=10 if z>1.19 else 8
            offset=max(-1,min(1,(x-local_center)/(.075 if z>1.18 else .055)))
            shoulder_to_wrist=max(.66,min(1,1-(z-.99)*.74))
            pixel_x=center+side*arm_x*shoulder_to_wrist*flip+offset*half*flip
            # Photo shoulders are ~21%, fingers ~51% down the standing body.
            pixel_y=cfg['crown']+(.20+(1.45-z)/.62*.32)*photo_height
            return pixel_x,pixel_y
        if any(word in low for word in ['thigh','calf','trouser leg','boot','sole','knee']):
            local_center=side*(.115 if z>.8 else .15 if z>.5 else .17)
            offset=max(-1,min(1,(x-local_center)/(.11 if z>.5 else .09)))
            half=22 if z>.30 else 21
            spread=leg_x+(12 if z<.3 else 0)
            pixel_x=center+side*spread*flip+offset*half*flip
            pixel_y=cfg['crown']+(.48+(.96-z)/.96*.52)*photo_height
            return pixel_x,pixel_y
        # Torso panels keep the recognizable tailored reference. Tight lateral
        # limits keep side-facing polygons inside cloth rather than grey gaps.
        across=max(-.205,min(.205,x))
        pixel_x=center+across*(photo_height/1.83)*flip
        return pixel_x,pixel_y

    def finish(obj, label, bone, projection=None):
        obj.name = label
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        # Every component is shaped in a common body coordinate frame before
        # texturing and weighting. Projection remains attached during animation.
        logical=[]
        for vertex in obj.data.vertices:
            vertex.co.x *= wide
            vertex.co *= scale
            logical.append(vertex.co.copy())
            if bone=='head' and 'hood' not in label.lower():
                head_width,head_height=HEAD_SHAPES[name]
                vertex.co.x*=head_width
                vertex.co.z=1.68*scale+(vertex.co.z-1.68*scale)*head_height
        obj.data.materials.clear()
        obj.data.materials.append(material)
        obj.data.update()
        uv = obj.data.uv_layers.new(name='ReferenceProjection')
        for polygon in obj.data.polygons:
            normal = polygon.normal
            view = 2 if projection==2 or (projection is None and normal.y>.20) else 0
            if any(word in label.lower() for word in ['boot','sole','hand','finger','thumb']):view=0
            crop = crops[view]
            x0,y0,x1,y1 = crop['crop']
            left,_,right,_ = crop['atlas']
            for index in polygon.loop_indices:
                co = logical[obj.data.loops[index].vertex_index]
                pixel_x,pixel_y=part_pixel(co,label,bone,view)
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
        # The anatomy is authored both ankle-up and shoulder-down. Preserve
        # outward normals in either direction before choosing front/back UVs.
        if rings[-1][2] < rings[0][2]: faces=[tuple(reversed(face)) for face in faces]
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
    shoulder=.224 if female else .243
    hem=1.08 if cfg.get('cropped') else .98
    surface('Tailored torso',[(0,0,hem,.178,.111),(0,0,1.10,waist,.105),
        (0,0,1.23,.183 if female else .204,.119),(0,-.006,1.34,.204 if female else .225,.124),
        (0,0,1.40,shoulder,.115),(0,0,1.435,.216,.105),
        (0,0,1.466,.16,.084),(0,0,1.49,.083,.066)],'chest',20)
    surface('Pelvis and trouser seat',[(0,0,.84,.185,.113),(0,.004,.95,.196,.131),
        (0,0,1.035,.17,.107)],'pelvis',16)
    surface('Utility belt',[(0,0,.984,.199,.132),(0,0,1.025,.19,.12)],'pelvis')
    patch('Steel belt buckle',(0,-.137,1.005),(.06,.015,.04),'pelvis',.004,0)
    if cfg.get('cropped'):
        surface('Exposed midriff',[(0,0,1.02,.166,.104),(0,0,1.095,.148,.10)],'chest')
    for side,suffix in [(-1,'L'),(1,'R')]:
        x=side*.108
        leg=surface('Continuous trouser leg '+suffix,[(x,0,.96,.105,.12),
            (side*.12,.006,.88,.114,.122),(side*.138,0,.77,.108,.107),
            (side*.148,-.022,.64,.084,.085),(side*.15,-.033,.56,.077,.08),
            (side*.157,-.015,.49,.083,.094),(side*.166,.007,.4,.081,.093),
            (side*.171,.008,.31,.063,.075),(side*.173,.004,.23,.062,.067)],'thigh.'+suffix,16)
        shin=leg.vertex_groups.new(name='shin.'+suffix)
        for vertex in leg.data.vertices:
            w=max(0,min(1,(.64-vertex.co.z/scale)/.13))
            leg.vertex_groups['thigh.'+suffix].add([vertex.index],1-w,'REPLACE')
            shin.add([vertex.index],w,'REPLACE')
        # Angular toe box, defined instep and a flat sole instead of round feet.
        surface('Boot '+suffix,[(side*.175,-.052,.025,.086,.156),(side*.175,-.052,.068,.088,.157),
            (side*.174,-.056,.108,.085,.145),(side*.174,-.024,.165,.074,.095),
            (side*.173,.0,.255,.065,.068)],'foot.'+suffix,16)
        surface('Flat rubber sole '+suffix,[(side*.175,-.052,.008,.089,.156),
            (side*.175,-.052,.033,.092,.159)],'foot.'+suffix,16)
        patch('Flat cargo pocket '+suffix,(side*.195,-.006,.785),(.045,.115,.145),'thigh.'+suffix,.01)
        ellipsoid('Molded knee pad '+suffix,(side*.15,-.108,.568),(.064,.021,.074),'shin.'+suffix,10,6,0)
        sx=side*.235
        skin=cfg.get('sleeveless',False)
        arm=surface(('Continuous bare arm ' if skin else 'Continuous sleeve ')+suffix,
            [(side*.20,0,1.475,.025,.041),(sx,0,1.45,.067,.077),
             (side*.252,0,1.405,.080,.087),(side*.264,-.003,1.32,.073 if skin else .081,.078),
             (side*.279,-.011,1.23,.055 if skin else .067,.065),
             (side*.281,-.017,1.175,.051 if skin else .059,.061),
             (side*.286,-.024,1.10,.060,.065),(side*.292,-.037,1.015,.046,.051),
             (side*.293,-.043,.953,.035,.039)],'upper_arm.'+suffix,16)
        forearm=arm.vertex_groups.new(name='forearm.'+suffix)
        for vertex in arm.data.vertices:
            w=max(0,min(1,(1.245-vertex.co.z/scale)/.115))
            arm.vertex_groups['upper_arm.'+suffix].add([vertex.index],1-w,'REPLACE')
            forearm.add([vertex.index],w,'REPLACE')
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
            # Thin cloth follows an open face arc and falls onto the shoulders.
            vertices,faces=[],[]
            for row,y in enumerate([-.091,-.042,.035,.084]):
                for n in range(21):
                    a=-.22*math.pi+n/20*1.44*math.pi
                    rx=.111 if row<2 else .102
                    rz=.143 if row<2 else .132
                    vertices.append((rx*math.cos(a),y,1.681+rz*math.sin(a)-.01*row))
            for row in range(3):
                for n in range(20):
                    a=row*21+n;faces.append((a,a+1,a+22,a+21))
            mesh=bpy.data.meshes.new('Draped open hood');mesh.from_pydata(vertices,[],faces);mesh.update()
            hood=bpy.data.objects.new('Draped cloth hood',mesh);bpy.context.collection.objects.link(hood)
            bpy.context.view_layer.objects.active=hood;hood.select_set(True)
            solid=hood.modifiers.new('Cloth edge thickness','SOLIDIFY');solid.thickness=.004
            bpy.ops.object.modifier_apply(modifier=solid.name)
            finish(hood,'Draped cloth hood','head')
        else:
            surface('Fitted hair crown',[(0,.013,1.737,.087,.075),(0,.015,1.776,.088,.075),
                (0,.019,1.802,.057,.05),(0,.021,1.811,.017,.018)],'head',18)
            count=15 if hair in ['rough','curls','short'] else 7
            for n in range(count):
                a=n*2.399963
                rad=.078 if hair!='curls' else .084
                ellipsoid('Broken hair lock '+str(n),(math.cos(a)*rad,.014+math.sin(a)*.063,
                    1.755+.025*math.sin(n*1.7)),(.017,.024,.035),'head',6,4)
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
        vertices,faces=[],[]
        for row,(z,rx,ry) in enumerate([(1.02,.188,.116),(.9,.21,.131),(.72,.234,.146),(.52,.249,.156),(.43,.255,.16)]):
            for n in range(21):
                a=-2.78+n/20*5.56
                fold=1+.035*math.sin(a*7+row*.6)
                vertices.append((rx*math.sin(a)*fold,ry*math.cos(a)*fold,z+(.024*math.sin(a*5) if row==4 else 0)))
        for row in range(4):
            for n in range(20):
                a=row*21+n;faces.append((a,a+21,a+22,a+1))
        mesh=bpy.data.meshes.new('Split coat cloth');mesh.from_pydata(vertices,[],faces);mesh.update()
        coat=bpy.data.objects.new('Open articulated coat tails',mesh);bpy.context.collection.objects.link(coat)
        bpy.context.view_layer.objects.active=coat;coat.select_set(True)
        solid=coat.modifiers.new('Coat hem thickness','SOLIDIFY');solid.thickness=.006
        bpy.ops.object.modifier_apply(modifier=solid.name)
        finish(coat,'Open articulated coat tails','pelvis')
        for suffix in ['L','R']:coat.vertex_groups.new(name='thigh.'+suffix)
        for vertex in coat.data.vertices:
            w=max(0,min(.8,(.98-vertex.co.z/scale)/.5))
            suffix='L' if vertex.co.x<0 else 'R'
            coat.vertex_groups['pelvis'].add([vertex.index],1-w,'REPLACE')
            coat.vertex_groups['thigh.'+suffix].add([vertex.index],w,'REPLACE')
        for side,suffix in [(-1,'L'),(1,'R')]:
            patch('Coat lapel '+suffix,(side*.109,-.119,1.365),(.07,.022,.20),'chest',.008,0)
        # Distinct coiled grapple line on the back and wrist launcher.
        for n in range(3):
            surface('Coiled grapple rope '+str(n),[(.095,.139,1.14+n*.045,.085,.012),
                (.095,.143,1.17+n*.045,.087,.014)],'chest',14,2)
        patch('Wrist grapple housing',(-.29,-.085,1.07),(.06,.047,.16),'forearm.L',.01)
    if cfg.get('armor'):
        for side in [-1,1]:
            for layer in range(3):
                vertices,faces=[],[]
                for row,y in enumerate([-.118,0,.118]):
                    for n in range(7):
                        a=n/6*math.pi*.52
                        vertices.append((side*(.20+.117*math.sin(a)+layer*.008),y,
                            1.42+.105*math.cos(a)-layer*.027-(.015 if row!=1 else 0)))
                for row in range(2):
                    for n in range(6):
                        a=row*7+n;faces.append((a,a+1,a+8,a+7))
                mesh=bpy.data.meshes.new('Curved deltoid plate');mesh.from_pydata(vertices,[],faces);mesh.update()
                plate=bpy.data.objects.new('Curved layered pauldron',mesh);bpy.context.collection.objects.link(plate)
                bpy.context.view_layer.objects.active=plate;plate.select_set(True)
                solid=plate.modifiers.new('Steel plate thickness','SOLIDIFY');solid.thickness=.007
                bpy.ops.object.modifier_apply(modifier=solid.name)
                finish(plate,'Curved pauldron plate '+str(side)+str(layer),'chest')
                for polygon in plate.data.polygons: polygon.use_smooth=False
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
        bone('thigh.'+suffix,(side*.108,0,.94),(side*.15,-.033,.56),'pelvis')
        bone('shin.'+suffix,(side*.15,-.033,.56),(side*.173,0,.20),'thigh.'+suffix)
        bone('foot.'+suffix,(side*.173,0,.20),(side*.175,-.18,.06),'shin.'+suffix)
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
    ground_samples=[]
    support_indices={}
    for vertex in body.data.vertices:
        for group in vertex.groups:
            if group.weight>.65:
                support_indices.setdefault(body.vertex_groups[group.group].name,[]).append(vertex.index)

    def support_heights():
        bpy.context.view_layer.update()
        evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        return {group:min((evaluated.matrix_world@evaluated.data.vertices[index].co).z for index in indices)
                for group,indices in support_indices.items()}

    def plant_recovery_hands():
        # Offline pose authoring only. Find shoulder pitch that makes each hand
        # share the body/leg support plane. The exported keys contain the result;
        # no simulation or runtime camera/offset correction is involved.
        heights=support_heights()
        floor=min(value for group,value in heights.items()
                  if not any(word in group for word in ['arm','hand']))
        for suffix in ['L','R']:
            pb=rig.pose.bones['upper_arm.'+suffix]
            def distance(angle):
                pb.rotation_euler.x=angle;bpy.context.view_layer.update()
                evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
                height=min((evaluated.matrix_world@evaluated.data.vertices[index].co).z
                           for index in support_indices['hand.'+suffix])
                return abs(height-(floor+.006))
            best=min([-.1*i for i in range(-8,19)],key=distance)
            best=min([best+(i-5)*.012 for i in range(11)],key=distance)
            pb.rotation_euler.x=best

    def plant_sole(suffix):
        """Bake ankle pitch with a level, downward-facing sole at this key."""
        indices=support_indices['foot.'+suffix]
        sole=[index for index in indices if body.data.vertices[index].co.z<.04*scale]
        pb=rig.pose.bones['foot.'+suffix];authored=pb.rotation_euler.x
        def error(angle):
            pb.rotation_euler.x=angle;bpy.context.view_layer.update()
            evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
            zs=[evaluated.data.vertices[index].co.z for index in sole]
            boot=[evaluated.data.vertices[index].co.z for index in indices]
            return max(zs)-min(zs)+max(0,sum(zs)/len(zs)-sum(boot)/len(boot))*5+.002*abs(angle-authored)
        best=min([i*.1 for i in range(-25,26)],key=error)
        best=min([best+(i-5)*.012 for i in range(11)],key=error)
        pb.rotation_euler.x=best
    for clip in CLIPS:
        duration={'idle':2,'walk':1,'sprint':.65,'jump':.8,'knockdown':1,
                  'get-up':1.2,'aim':1,'fire':.3,'reload':2.2,'repair':1.2,'enter':.8,'exit':.8}[clip]
        frames=[1+round(duration*24*i/8) for i in range(9)]
        action=bpy.data.actions.new(clip);rig.animation_data.action=action
        for i,frame in enumerate(frames):
            p=i/8;wave=math.sin(p*math.tau)
            for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
            def rot(label,x=0,y=0,z=0):rig.pose.bones[label].rotation_euler=(x,y,z)
            if clip=='idle':
                rot('chest',.012*wave);rot('head',0,.035*wave)
                rot('thigh.L',.035);rot('shin.L',-.07)
                rot('thigh.R',.02);rot('shin.R',-.04)
            elif clip in ['walk','sprint']:
                stride=.46 if clip=='walk' else .78
                rot('chest',-.04 if clip=='walk' else -.15,0,.035*wave)
                for side,suffix in [(-1,'L'),(1,'R')]:
                    leg=side*wave
                    rot('thigh.'+suffix,stride*leg)
                    rot('shin.'+suffix,-(.08+.72*max(0,-leg)))
                    rot('foot.'+suffix,.04+.22*max(0,leg)-.10*max(0,-leg))
                    rot('upper_arm.'+suffix,-side*stride*.7*wave)
                    rot('forearm.'+suffix,-.25 if clip=='walk' else -.85)
                rig.pose.bones['pelvis'].location.x=.018*wave
                rot('pelvis',0,.025*wave,-.04*wave)
            elif clip=='jump':
                lift=math.sin(p*math.pi)
                rot('chest',-.12*lift)
                for suffix in ['L','R']:
                    rot('thigh.'+suffix,.45*lift);rot('shin.'+suffix,-.7*lift)
                    rot('upper_arm.'+suffix,-.4*lift);rot('forearm.'+suffix,-.5*lift)
            elif clip=='knockdown':
                fall=min(1,p*1.5)
                rot('root',math.pi*.49*fall);rot('chest',-.05*fall)
                rot('upper_arm.L',-.19*fall,0,-.55*fall)
                rot('upper_arm.R',-.19*fall,0,.62*fall)
                rot('shin.L',-.08*fall);rot('shin.R',-.04*fall)
                rot('foot.L',1.0*fall);rot('foot.R',1.0*fall)
            elif clip=='get-up':
                # Prone -> palms and knee -> one planted boot -> crouch -> rise.
                # Each row is an authored support phase, not one diagonal lift.
                stages=[
                    (1.54,-.05,0,-.08,0,-.04,1.0,-.19,0),
                    (1.50,-.10,.1,-.3,.08,-.2,.95,-.3,-.15),
                    (1.38,-.30,.5,-1.0,.25,-.6,.85,-.6,-.3),
                    (1.10,.20,-.9,-1.9,.5,-1.3,.6,-.9,-.3),
                    (.90,.25,-.8,-2.0,.8,-1.2,.4,-.9,-.15),
                    (.55,.15,-.4,-1.4,.6,-1.0,.3,-.7,-.4),
                    (.20,.05,.2,-.5,.2,-.5,.08,-.4,-.3),
                    (.05,0,.1,-.2,.1,-.2,.02,-.1,-.1),
                    (0,0,0,0,0,0,0,0,0)]
                root_pitch,chest_pitch,thigh_l,knee_l,thigh_r,knee_r,ankle,arm,elbow=stages[i]
                rot('root',root_pitch);rot('chest',chest_pitch)
                rot('thigh.L',thigh_l);rot('shin.L',knee_l)
                rot('thigh.R',thigh_r);rot('shin.R',knee_r)
                for suffix in ['L','R']:
                    rot('foot.'+suffix,ankle)
                    rot('upper_arm.'+suffix,arm,0,-.35 if suffix=='L' else .4)
                    rot('forearm.'+suffix,elbow)
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
                rot('chest',-.32+.045*wave)
                rot('thigh.L',.12);rot('shin.L',-.25)
                rot('head',.12)
                rot('upper_arm.R',-.85+.22*wave,0,-.1);rot('forearm.R',-.7-.2*wave)
                rot('upper_arm.L',-.65,0,.1);rot('forearm.L',-.5)
            elif clip in ['enter','exit']:
                t=p if clip=='enter' else 1-p
                crouch=math.sin(t*math.pi*.75)
                rot('chest',-.5*crouch,0,-.25*t)
                rot('thigh.L',.8*crouch);rot('shin.L',-1.15*crouch)
                rot('thigh.R',.36*crouch);rot('shin.R',-.58*crouch)
                rot('upper_arm.R',-1.12*crouch,0,-.45*t)
                rot('forearm.R',-.45*crouch)
                rot('upper_arm.L',-.5*crouch,0,.2*t)
            for pb in rig.pose.bones:
                pb.keyframe_insert(data_path='rotation_euler',frame=frame)
                pb.keyframe_insert(data_path='location',frame=frame)
        # Grounded samples. Jump adds no root rise: simulation owns airHeight.
        for frame in frames:
            scene.frame_set(frame);bpy.context.view_layer.update()
            if clip=='get-up' and frame>=frames[3]:
                sides=['L','R'] if frame>=frames[6] else ['R']
                for suffix in sides:
                    plant_sole(suffix)
                    rig.pose.bones['foot.'+suffix].keyframe_insert(data_path='rotation_euler',frame=frame)
            if clip=='get-up' and frame<=frames[4]:
                plant_recovery_hands()
                for suffix in ['L','R']:
                    rig.pose.bones['upper_arm.'+suffix].keyframe_insert(data_path='rotation_euler',frame=frame)
                bpy.context.view_layer.update()
            evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
            floor=min((evaluated.matrix_world@v.co).z for v in evaluated.data.vertices)
            rig.pose.bones['root'].location.y-=floor
            rig.pose.bones['root'].keyframe_insert(data_path='location',frame=frame)
            if (clip=='knockdown' and frame==frames[-1]) or (clip=='get-up' and frame in frames[::2]):
                ground_samples.append(dict(clip=clip,time=(frame-1)/24,
                    minimumWorldHeightByWeightedRegion={group:round(height,5) for group,height in support_heights().items()},
                    method='Minimum deformed vertex world Z, vertices with region weight >0.65; metres.'))
        actions[clip]=action
        track=rig.animation_data.nla_tracks.new();track.name=clip
        track.strips.new(clip,1,action);track.mute=True
    rig.animation_data.action=None
    for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
    scene.frame_set(1);bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [rig,body,far]:obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(glb_path(name)),export_format='GLB',
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
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path(name)))
    captures=[]
    if not args.skip_renders:
        for view,yaw in [('front',0),('side',-math.pi/2 if name=='tusk' else math.pi/2),('back',math.pi)]:
            rig.rotation_euler.z=yaw
            path=shots/f'blender-{name}-idle-{view}.png'
            scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
            captures.append(dict(path=path.relative_to(root).as_posix(),sha256=digest(path),
                                 view=view,clip='idle',time=.25,yaw=yaw))
        if name=='rook':
            for clip,sample_time in [('knockdown',1),('get-up',.3),('get-up',.6),('get-up',.9)]:
                rig.animation_data.action=actions[clip];scene.frame_set(round(sample_time*24)+1)
                rig.rotation_euler.z=math.pi/2;bpy.context.view_layer.update()
                evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
                points=[evaluated.matrix_world@v.co for v in evaluated.data.vertices]
                target=Vector(((min(v.x for v in points)+max(v.x for v in points))/2,0,
                    max(.55,(min(v.z for v in points)+max(v.z for v in points))/2)))
                camera.location=target+Vector((0,-6,0))
                camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
                path=shots/f'blender-{name}-{clip}-{sample_time:.2f}-support.png'
                scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
                captures.append(dict(path=path.relative_to(root).as_posix(),sha256=digest(path),
                    view='side-support',clip=clip,time=sample_time,yaw=math.pi/2,
                    cameraBlenderPosition=list(camera.location),cameraBlenderTarget=list(target),distanceMetres=6))
    rig.rotation_euler.z=0
    rig.animation_data.action=actions['idle'];scene.frame_set(7)
    camera.location=(0,-5,.96)
    camera.rotation_euler=(Vector((0,0,.96))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path(name)))
    counts={}
    for level,mesh in [('near',body),('far',far)]:
        mesh.data.calc_loop_triangles();counts[level]=len(mesh.data.loop_triangles)
    report=dict(crew=name,round=args.round,blender=bpy.app.version_string,seconds=time.perf_counter()-started,
        triangles=counts,materials=1,texture=[1024,1024],height=cfg['height'],clips=CLIPS,
        axis='Blender Z-up/-Y-forward; export_yup once to glTF Y-up/+Z-forward',
        reference=dict(path=source.relative_to(root).as_posix(),sha256=digest(source),crops=crops,
        process='Bilinear three-view crop atlas; deterministic horizontal neutral-background edge extension. Originals untouched.'),
        camera=dict(position=[0,.96,5],target=[0,.96,0],verticalFov=28,width=432,height=576,distanceMetres=5),
        files={p.name:digest(p) for p in [glb_path(name),blend_path(name),out/f'{name}-color.png',out/f'{name}-surface.png']},
        captures=captures,groundSupportSamples=ground_samples)
    (shots/f'blender-{name}.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('CREW_ASSET '+json.dumps(dict(crew=name,triangles=counts,seconds=report['seconds'])))
    return report


reports=[]
for crew in selected_names:
    reports.append(build(crew, CREW[crew]))
(shots/'blender-manifest.json').write_text(json.dumps(dict(round=args.round,
    command='blender -b --python tools/blender/crew-fighters.py -- --root REPO --round '+str(args.round),
    scriptSha256=digest(Path(__file__)),assets=reports),indent=2)+'\n',encoding='utf-8')
print('GFX-01 CREW EXPORT COMPLETE')
