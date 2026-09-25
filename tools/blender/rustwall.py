"""EGG-02 metric Rustwall and collision-contained canyon module, Blender 4.5.

blender -b --python-exit-code 1 --python tools/blender/rustwall.py -- --root . --round 1
Design coordinates are glTF X right, Y up, front -Z. Convert exactly once.
Original reference guides silhouettes and palette; no image projection is used.
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

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--round', type=int, required=True)
p.add_argument('--skip-renders', action='store_true')
p.add_argument('--paths-only', action='store_true')
p.add_argument('--p2', action='store_true', help='Write new Rustwall P2 review evidence; leave older round paths stable')
p.add_argument('--p2-hulk-probe', action='store_true', help='Build only two offline welded-car proof hulks in ignored art-build')
p.add_argument('--p2-section-probe', action='store_true', help='Build only one offline macro facade section in ignored art-build')
p.add_argument('--p2-wheel-probe', action='store_true', help='Export one isolated cheap source-car tire measurement in ignored art-build')
p.add_argument('--p2-relief-probe', action='store_true', help='Export one offline source-car relief and atlas packing proof')
p.add_argument('--output-dir', help='Ignored isolated P2 QA output under art-build/rustwall-p2 only')
p.add_argument('--steel-paint', help='Explicit ignored P2 steel paint PNG input')
p.add_argument('--steel-paint-sha256', help='Required SHA-256 of explicit steel paint input')
args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
qa_root=(root / 'art-build/rustwall-p2').resolve()
steel_paint_path=None
if bool(args.steel_paint)!=bool(args.steel_paint_sha256):
    raise ValueError('--steel-paint and --steel-paint-sha256 are required together')
if args.steel_paint:
    if not args.p2:raise ValueError('--steel-paint is for P2 only')
    steel_paint_path=(root / args.steel_paint).resolve()
    if qa_root not in steel_paint_path.parents or steel_paint_path.suffix.lower()!='.png':
        raise ValueError('--steel-paint must be an ignored P2 art-build PNG')
    supplied=args.steel_paint_sha256.lower()
    if len(supplied)!=64 or any(ch not in '0123456789abcdef' for ch in supplied):
        raise ValueError('--steel-paint-sha256 must be 64 hexadecimal characters')
    if not steel_paint_path.is_file() or hashlib.sha256(steel_paint_path.read_bytes()).hexdigest()!=supplied:
        raise ValueError('--steel-paint source hash does not match')
if args.output_dir:
    if not (args.p2 or args.p2_relief_probe):raise ValueError('--output-dir is for isolated P2 QA only')
    requested=(root / args.output_dir).resolve()
    if requested == qa_root or qa_root not in requested.parents:
        raise ValueError('--output-dir must be a child of art-build/rustwall-p2')
    out=requested
else:out=root / 'public/assets/models/wasteland/rustwall'
blend_dir=out if args.output_dir else root / 'art-build/rustwall'
def glb_path(kind):
    return out / f'{kind}.glb'
def blend_path(kind):
    return blend_dir / f'{kind}.blend'
def texture_path(name, label):
    return blend_dir / f'{name}-{label}.png'
family = 'rustwall-p2' if args.p2 else 'rustwall'
shots = Path(os.environ.get('DUEL_EVIDENCE_DIR') or
             (out / 'evidence' if args.output_dir else
              root / '.evidence' / date.today().isoformat() / family / f'round-{args.round}'))
if not shots.is_absolute():
    shots = root / shots
if args.paths_only:
    if args.p2_hulk_probe:
        proof = root / 'art-build/rustwall-p2'
        print(json.dumps({'blend': [str(proof / 'hulk-probe.blend')],
                          'glb': [str(proof / 'hulk-probe.glb')],
                          'textures': [str(texture_path('hulks', label)) for label in ('color','surface','normal')],
                          'evidence': [str(proof / 'hulk-probe-front.png'),
                                       str(proof / 'hulk-probe-quarter.png'),str(proof / 'hulk-probe.json')]}))
        sys.exit(0)
    if args.p2_section_probe:
        proof = root / 'art-build/rustwall-p2'
        print(json.dumps({'blend': [str(proof / 'section-probe.blend')],
                          'glb': [str(proof / 'section-probe.glb')],
                          'textures': [str(texture_path(name, label)) for name in ('steel','hulks')
                                       for label in ('color','surface','normal')],
                          'evidence': [str(proof / 'section-probe-front.png'),
                                       str(proof / 'section-probe-quarter.png'),str(proof / 'section-probe.json')]}))
        sys.exit(0)
    if args.p2_wheel_probe:
        proof = root / 'art-build/rustwall-p2'
        print(json.dumps({'blend': [str(proof / 'wheel-probe.blend')],
                          'glb': [str(proof / 'wheel-probe.glb')],
                          'textures': [str(texture_path('hulks', label)) for label in ('color','surface','normal')],
                          'evidence': [str(proof / 'wheel-probe-front.png'),
                                       str(proof / 'wheel-probe-quarter.png'),str(proof / 'wheel-probe.json')]}))
        sys.exit(0)
    if args.p2_relief_probe:
        proof = out if args.output_dir else root / 'art-build/rustwall-p2'
        print(json.dumps({'blend': [str(proof / 'relief-probe.blend')],
                          'glb': [str(proof / 'relief-probe.glb')],
                          'textures': [str(texture_path('hulks', label)) for label in ('color','surface','normal')],
                          'evidence': [str(proof / name) for name in ('relief-probe.json','probe-relief-source.png',
                                       'relief-probe-front.png','relief-probe-quarter.png',
                                       'relief-probe-wall-scale.png',
                                       'probe-atlas-color.png','probe-atlas-surface.png','probe-atlas-normal.png')]}))
        sys.exit(0)
    print(json.dumps({'blend': [str(blend_path(kind)) for kind in ('wall', 'wash')],
                      'glb': [str(glb_path(kind)) for kind in ('wall', 'wash')],
                      'textures': [str(texture_path(name, label))
                                   for name in ('steel', 'hulks', 'details', 'rock')
                                   for label in (('color', 'surface', 'normal', 'emissive')
                                                 if name == 'details' else ('color', 'surface', 'normal'))],
                      'evidence': [str(shots)] +
                                  ([str(out / name) for name in ('wall-relief-source.png',
                                   'wall-atlas-color.png','wall-atlas-surface.png','wall-atlas-normal.png')]
                                   if args.output_dir else [])}))
    sys.exit(0)

import bpy
import bmesh
import numpy as np
from mathutils import Vector

out.mkdir(parents=True, exist_ok=True)
blend_dir.mkdir(parents=True, exist_ok=True)
shots.mkdir(parents=True, exist_ok=True)
started = time.perf_counter()


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def bv(v):
    return Vector((v[0], -v[2], v[1]))


def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new('Neutral warm grey review environment')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.26, .25, .23, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .6
    return scene


PALETTES = {
    'steel': [(.16,.21,.21),(.26,.28,.25),(.31,.17,.085),(.075,.09,.09),
              (.22,.29,.28),(.40,.25,.12),(.37,.38,.33),(.13,.15,.145),
              (.17,.22,.23),(.28,.20,.13),(.23,.25,.23),(.42,.34,.23),
              (.09,.11,.11),(.33,.26,.18),(.30,.34,.32),(.45,.43,.35)],
    'hulks': [(.19,.27,.25),(.31,.22,.13),(.31,.32,.27),(.07,.08,.075),
              (.30,.15,.095),(.18,.22,.24),(.40,.35,.22),(.12,.13,.12),
              (.045,.06,.063),(.20,.12,.075),(.12,.10,.08),(.33,.35,.33),
              (.08,.085,.08),(.35,.24,.15),(.38,.30,.20),(.51,.45,.31)],
    'details': [(.33,.28,.19),(.19,.27,.26),(.10,.11,.10),(.48,.32,.20),
                (.31,.22,.14),(.35,.31,.23),(.08,.095,.09),(.50,.44,.30),
                (.72,.22,.025),(.90,.54,.09),(.41,.36,.25),(.26,.18,.105),
                (.16,.20,.18),(.40,.34,.22),(.24,.26,.24),(.59,.53,.36)],
    'rock': [(.39,.28,.18),(.44,.32,.21),(.34,.25,.18),(.46,.35,.24)] * 4,
}


def p2_steel_paint_source():
    """Three full-height fields for the unused steel atlas quadrant."""
    if steel_paint_path is not None:
        image=bpy.data.images.load(str(steel_paint_path),check_existing=False)
        try:
            image.scale(216,232)
            raw=np.empty(216*232*4,np.float32)
            image.pixels.foreach_get(raw)
            return raw.reshape((232,216,4))
        finally:
            bpy.data.images.remove(image)
    # Clean-checkout test fixture. The approved trial PNG is an ignored input;
    # this fixed-seed field makes the packing/UV contract reproducible without it.
    seed=np.random.default_rng(240925)
    yy,xx=np.mgrid[:232,:216]
    grain=seed.uniform(-.018,.018,(232,216))
    vertical=np.sin(xx*.11+np.sin(yy*.043)*.8)*.025
    oxide=np.clip(np.sin(xx*.09+yy*.037)*.20+np.sin(yy*.06)*.10,0,.31)
    bases=np.array(((.26,.27,.25),(.27,.29,.23),(.31,.24,.19)))
    image=np.ones((232,216,4),np.float32)
    for part in range(3):
        region=slice(part*72,(part+1)*72)
        rgb=bases[part][None,None,:]*(1+grain[:,region,None]+vertical[:,region,None])
        image[:,region,:3]=rgb*(1-oxide[:,region,None])+np.array((.32,.18,.10))*oxide[:,region,None]
    return image


def material(name):
    rng = np.random.default_rng(int(hashlib.sha256(name.encode()).hexdigest()[:8], 16))
    color = np.ones((1024,1024,4), np.float32)
    orm = np.ones_like(color)
    normal = np.ones_like(color)
    normal[:,:,:2] = .5
    emissive = np.zeros_like(color)
    emissive[:,:,3] = 1
    yy, xx = np.mgrid[:256,:256]
    for tile, base in enumerate(PALETTES[name]):
        fine = rng.uniform(-1,1,(256,256))
        coarse = np.repeat(np.repeat(rng.uniform(-1,1,(32,32)),8,0),8,1)
        for _ in range(5):
            coarse = (coarse + np.roll(coarse,1,0) + np.roll(coarse,-1,0)
                      + np.roll(coarse,1,1) + np.roll(coarse,-1,1)) / 5
        pixels = np.array(base)[None,None,:] * (1 + coarse[:,:,None]*.16 + fine[:,:,None]*.018)
        if name in ['steel','hulks'] and tile not in [3,8,12]:
            # Continuous oxidation runs descend from chips and seams, rather
            # than a thresholded fine-noise checker scattered over every plate.
            flow=np.zeros_like(coarse)
            for _ in range(16):
                cx=rng.uniform(0,256);start=rng.uniform(20,255)
                width=rng.uniform(.8,4);length=rng.uniform(22,170)
                stream=np.exp(-((xx-cx-np.sin(yy*.019+cx)*.8)/width)**2)
                flow += stream*np.clip((start-yy)/12,0,1)*np.clip((yy-(start-length))/30,0,1)
            chip=np.maximum(0,np.sin(xx*.017+tile)+np.sin(yy*.021+tile*.7)-.5)*.15
            rust=np.clip(flow*.65+chip,0,.82)
            # Broad, irregular old paint survives between rubbed seams. Keep
            # soot dark and matte around the lower contact edges, while rust
            # follows cracks rather than a uniform speckle on every plate.
            paint=np.array((.29,.38,.34) if name=='hulks' else (.30,.34,.31))
            paintmask=np.clip((coarse+.18)*1.5,0,.65)
            if tile in [1,4,6,10,14]:
                pixels=pixels*(1-paintmask[:,:,None])+paint*paintmask[:,:,None]
            soot=np.clip((yy-205)/51,0,1)*np.clip((coarse+.45)*.38,0,.34)
            pixels=pixels*(1-rust[:,:,None])+np.array((.29,.14,.065))*rust[:,:,None]
            pixels*=1-soot[:,:,None]
            edge=(xx<9)|(xx>247)|(yy<9)|(yy>247)
            pixels[edge]*=.70
            worn=((abs(xx-11)<1)|(abs(xx-245)<1)|(abs(yy-11)<1)|(abs(yy-245)<1))&(fine>.1)
            pixels[worn]=(.29,.30,.27)
        if name == 'rock':
            strata = np.sin(yy*.115 + np.sin(xx*.025)*1.8)
            pixels *= (1 + strata[:,:,None]*.095)
        if name == 'details' and tile in [0,1,5,7]:
            weave = np.sin(xx*2.9)*np.sin(yy*2.4)*.025
            pixels *= 1 + weave[:,:,None]
        y,x = divmod(tile,4)
        sl = np.s_[y*256:(y+1)*256,x*256:(x+1)*256]
        color[sl][:,:,:3] = np.clip(pixels,0,1)
        orm[sl][:,:,1] = np.clip(.8+coarse*.12,.55,.98)
        orm[sl][:,:,2] = .58 if name in ['steel','hulks'] and tile not in [3,8,12] else 0
        if name in ['steel','hulks'] and tile not in [3,8,12]:
            orm[sl][:,:,1]=np.clip(.72+coarse*.10+rust*.23+soot*.23,.53,.98)
            orm[sl][:,:,2]=np.clip(.68-rust*.48-soot*.65,0,.68)
        dy,dx = np.gradient(coarse*.12 + fine*.018)
        v = np.stack([-dx*3,-dy*3,np.ones_like(dx)],axis=-1)
        v /= np.linalg.norm(v,axis=-1,keepdims=True)
        normal[sl][:,:,:3] = v*.5+.5
        if name == 'details' and tile in [8,9]:
            emissive[sl][:,:,:3] = np.array(base)*(.6 if tile == 8 else 1)
    if name=='rock':
        # One continuous 1024 map for the complete rock, with winding strata.
        ry,rx=np.mgrid[:1024,:1024]
        ripple=np.sin(rx*.009)*17+np.sin(rx*.027+ry*.002)*7+rx*.16
        phase=ry+ripple
        strata=np.sin(phase*.075)*.026+np.sin(phase*.022)*.037
        erosion=np.sin(rx*.038+np.sin(ry*.006)*.9)*.028
        grain=rng.uniform(-.045,.045,(1024,1024))
        rockheight=strata+erosion+grain
        weather=np.sin((phase+np.sin(rx*.011)*24)*.019)*.10 + np.sin((ry-rx*.31)*.047)*.055
        broad=np.sin(phase*.026)+.35*np.sin(phase*.071+rx*.006)
        oxide=np.clip((broad-.15)*.48,0,.50)
        chalk=np.clip((-broad-.18)*.40,0,.38)
        base=np.array((.36,.275,.215))[None,None,:]
        color[:,:,:3]=base*(1+rockheight[:,:,None]+weather[:,:,None])
        color[:,:,:3]=color[:,:,:3]*(1-oxide[:,:,None])+np.array((.40,.245,.145))*oxide[:,:,None]
        color[:,:,:3]=color[:,:,:3]*(1-chalk[:,:,None])+np.array((.46,.375,.29))*chalk[:,:,None]
        fracture=np.clip(.55+.35*np.sin(rx*.018+ry*.004)+.25*np.sin(rx*.042-ry*.011),.15,1)
        bands=np.exp(-(np.sin(phase*.038)/.065)**2)*fracture
        cracks=np.zeros((1024,1024))
        for _ in range(32):
            x0,y0=rng.uniform(0,1024,2);length=rng.uniform(22,140);slope=rng.uniform(-.7,.7)
            distance=rx-x0-(ry-y0)*slope-np.sin(ry*.05+x0)*1.4
            crack=np.exp(-(distance/rng.uniform(.6,1.5))**2)
            crack*=np.clip((ry-y0)/4,0,1)*np.clip((y0+length-ry)/8,0,1)
            cracks=np.maximum(cracks,crack)
        color[:,:,:3]*=1-bands[:,:,None]*.18-cracks[:,:,None]*.31
        grit=(np.sin(rx*.43+ry*.19)*np.sin(ry*.61-rx*.14))*.02
        color[:,:,:3]*=1+grit[:,:,None]
        rockheight-=cracks*.10+bands*.05
        orm[:,:,1]=.96;orm[:,:,2]=0
        dy,dx=np.gradient(rockheight)
        vectors=np.stack([-dx*4,-dy*4,np.ones_like(dx)],axis=-1)
        vectors/=np.linalg.norm(vectors,axis=-1,keepdims=True)
        normal[:,:,:3]=vectors*.5+.5
    atlas_size = 1024 if name == 'rock' else 512
    def atlas_pixels(pixels):
        if atlas_size == 1024: return pixels
        return pixels.reshape(512,2,512,2,4).mean(axis=(1,3)).astype(np.float32)
    images = {}
    paint=p2_steel_paint_source() if name=='steel' and args.p2 else None
    for label,pixels in [('color',color),('surface',orm),('normal',normal)]:
        atlas=atlas_pixels(pixels)
        if paint is not None:
            for part,x0 in enumerate((264,344,424)):
                patch=paint[:,part*72:(part+1)*72,:3]
                # Blender image pixels start at the bottom; exported PNG scan
                # lines start at the top. Raw y268..499 lands in the actual
                # unused PNG upper-right block, y12..243.
                target=atlas[268:500,x0:x0+72]
                if label=='color':
                    target[:,:,:3]=patch
                elif label=='surface':
                    grey=patch.mean(axis=2)
                    target[:,:,0]=1
                    target[:,:,1]=np.clip(.78+(grey-.28)*.43,.63,.92)
                    target[:,:,2]=np.clip(.40+(grey-.28)*.52,.18,.64)
                else:
                    grey=patch.mean(axis=2)
                    dy,dx=np.gradient(grey)
                    vec=np.stack((-dx*3.2,-dy*3.2,np.ones_like(dx)),axis=-1)
                    vec/=np.linalg.norm(vec,axis=-1,keepdims=True)
                    target[:,:,:3]=vec*.5+.5
                target[:,:,3]=1
        image = bpy.data.images.new(f'{name}-{label}',atlas_size,atlas_size,alpha=True)
        if label != 'color': image.colorspace_settings.name = 'Non-Color'
        image.pixels.foreach_set(atlas.ravel())
        image.filepath_raw = str(texture_path(name, label))
        image.file_format = 'PNG'
        image.save(); image.pack(); images[label] = image
    if name == 'details':
        image = bpy.data.images.new('details-emissive',atlas_size,atlas_size,alpha=True)
        image.pixels.foreach_set(atlas_pixels(emissive).ravel())
        image.filepath_raw = str(texture_path('details', 'emissive')); image.file_format = 'PNG'
        image.save(); image.pack(); images['emissive'] = image
    mat = bpy.data.materials.new(name + ' authored padded atlas')
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    texture = {}
    for label,image in images.items():
        texture[label] = nodes.new('ShaderNodeTexImage'); texture[label].image = image
    links.new(texture['color'].outputs['Color'],bsdf.inputs['Base Color'])
    split = nodes.new('ShaderNodeSeparateColor')
    links.new(texture['surface'].outputs['Color'],split.inputs['Color'])
    links.new(split.outputs['Green'],bsdf.inputs['Roughness'])
    links.new(split.outputs['Blue'],bsdf.inputs['Metallic'])
    n = nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value = .4
    links.new(texture['normal'].outputs['Color'],n.inputs['Color'])
    links.new(n.outputs['Normal'],bsdf.inputs['Normal'])
    if name == 'details':
        links.new(texture['emissive'].outputs['Color'],bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 1.4
    return mat


class Geometry:
    def __init__(self,cap_tubes=True): self.vertices=[]; self.faces=[]; self.uvs=[]; self.cap_tubes=cap_tubes
    def vertex(self, p):
        self.vertices.append(bv(p)); return len(self.vertices)-1
    def face(self, ids, tile, uv=None, atlas=True):
        self.faces.append(ids)
        if uv is None:
            uv = [(0,0),(1,0),(1,1),(0,1)][:len(ids)]
        x,y = tile%4,tile//4
        self.uvs.append([((x+.035+u*.93)/4,(y+.035+v*.93)/4) for u,v in uv] if atlas else uv)
    def box(self,c,s,tile):
        c,s = Vector(c),Vector(s)/2
        ids = [self.vertex(c+Vector((x*s.x,y*s.y,z*s.z))) for x,y,z in
               [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        for fi,f in enumerate([(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]):
            faceids=[ids[i] for i in f]
            # Front/back atlas V is world height, so oxidation runs downward.
            uv=[(0,0),(0,1),(1,1),(1,0)] if fi==0 else None
            self.face(faceids,tile,uv)
    def tube(self,a,b,r,tile,segments=6,r2=None):
        a,b = Vector(a),Vector(b); tangent=(b-a).normalized()
        u=tangent.cross(Vector((0,1,0)))
        if u.length < .01: u=tangent.cross(Vector((1,0,0)))
        u.normalize();v=tangent.cross(u).normalized();rings=[]
        for c,radius in [(a,r),(b,r if r2 is None else r2)]:
            rings.append([self.vertex(c+(u*math.cos(j*math.tau/segments)+v*math.sin(j*math.tau/segments))*radius) for j in range(segments)])
        for j in range(segments):
            k=(j+1)%segments
            self.face([rings[0][j],rings[0][k],rings[1][k],rings[1][j]],tile)
        caps=[(rings[0],a,True),(rings[1],b,False)] if self.cap_tubes or r>.3 else []
        for ring,c,flip in caps:
            mid=self.vertex(c)
            for j in range(segments):
                ids=[mid,ring[j],ring[(j+1)%segments]]
                self.face(ids[::-1] if flip else ids,tile,[(.5,.5),(0,0),(1,0)])
    def rivet(self,x,y,z):
        # Four visible cap facets; hidden underside is omitted inside the plate.
        ring=[self.vertex((x+dx*.075,y+dy*.075,z)) for dx,dy in [(-1,-1),(1,-1),(1,1),(-1,1)]]
        tip=self.vertex((x,y,z-.05))
        for j in range(4):self.face([ring[j],ring[(j+1)%4],tip],6,[(0,0),(1,0),(.5,1)])
    def profile(self,points,depth,tile):
        rings=[[self.vertex((x,y,z)) for x,y in points] for z in depth]
        n=len(points)
        for j in range(n):self.face([rings[0][j],rings[0][(j+1)%n],rings[1][(j+1)%n],rings[1][j]],tile)
        for ring in rings:
            for j in range(1,n-1):self.face([ring[0],ring[j],ring[j+1]],tile,[(0,0),(1,0),(1,1)])
    def cloth(self,x,y,z,w,h,tile):
        rows=[]
        for iy in range(7):
            row=[]
            for ix in range(5):
                u=ix/4;v=iy/6
                rag=([.18,1.6,.35,2.65,.75][ix]) if iy==6 else 0
                taper=1-.11*v
                row.append(self.vertex((x+(u-.5)*w*taper,y-v*h+rag,z+math.sin(u*math.tau*1.8+v*2)*(.4+v*.38)+v*.40)))
            rows.append(row)
        for iy in range(6):
            for ix in range(4):
                ids=[rows[iy][ix],rows[iy+1][ix],rows[iy+1][ix+1],rows[iy][ix+1]]
                self.face(ids,tile,[(ix/4,1-iy/6),(ix/4,1-(iy+1)/6),((ix+1)/4,1-(iy+1)/6),((ix+1)/4,1-iy/6)])
                # Give exposed ragged hems a real reverse face, with one draw.
                self.face(ids[::-1],tile,[(ix/4,1-iy/6),((ix+1)/4,1-iy/6),((ix+1)/4,1-(iy+1)/6),(ix/4,1-(iy+1)/6)])
        for ix in [0,2,3]:
            point=self.vertices[rows[-1][ix]]
            # A small split strip hangs below the uneven hem.
            tip=self.vertex((point.x+.07,point.z-.85,-point.y+.12))
            other=self.vertex((point.x+.13,point.z-.05,-point.y+.04))
            self.face([rows[-1][ix],tip,other],tile,[(0,0),(.1,.2),(.2,0)])
    def build(self,name,mat,recalculate_normals=True):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(self.vertices,[],self.faces);mesh.update()
        uv=mesh.uv_layers.new(name='Authored material islands')
        for poly,coords in zip(mesh.polygons,self.uvs):
            for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=co
        if recalculate_normals:
            bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
        return obj


def car(g,x,y,z,tile,variant):
    # Real 4.4 m wreck profile: crushed hood, cabin pillars and wheel silhouettes.
    start=len(g.vertices)
    pts=[(-2.2,.25),(-2.1,.85),(-1.1,.99),(-.65,1.52),(.65,1.43),(1.13,.91),(2.05,.76),(2.2,.27)]
    pts=[(x+a,y+b*(.84 if variant%3==0 else 1)) for a,b in pts]
    g.profile(pts,[z-.79,z+.79],tile)
    for side in [-1,1]:
        facez=z+side*.802
        for a,b in [(-.48,.02),(.15,.63)]:
            ids=[g.vertex((x+a,y+1.05,facez)),g.vertex((x+b,y+1.05,facez)),g.vertex((x+b-.04,y+1.33,facez)),g.vertex((x+a+.1,y+1.36,facez))]
            g.face(ids,8)
        if side == -1:
            for axle in [-1.43,1.42]:
                g.tube((x+axle,y+.36,z+side*.72),(x+axle,y+.36,z+side*.91),.36,12,6)
    g.box((x,y+.3,z-.825),(2.4,.14,.05),11)
    # Lean and squash the whole hulk coherently, including its windows/wheels.
    angle=math.sin(variant*4.2+x)*.17
    compression=.78+.18*(.5+.5*math.sin(variant*2.4))
    for i in range(start,len(g.vertices)):
        v=g.vertices[i];dx=v.x-x;dy=v.z-y
        g.vertices[i]=Vector((x+dx*math.cos(angle)-dy*math.sin(angle),v.y,
                              y+dx*math.sin(angle)+dy*math.cos(angle)*compression))


def welded_car_template(relative_path,body_target=750,trim_target=180,wheel_steps=8,
                        visible_wheels_only=False,normalized_height=2.35):
    """Read a production car only offline; return connected silhouette triangles in wall coordinates."""
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(root / relative_path))
    imported=set(bpy.data.objects)-before
    bpy.context.view_layer.update()
    body=next(obj for obj in imported if obj.type=='MESH' and obj.name=='Lacquered body')
    trim=next(obj for obj in imported if obj.type=='MESH' and obj.name=='Carbon and trim')
    glass=next(obj for obj in imported if obj.type=='MESH' and obj.name=='Glass')
    tires=sorted((obj for obj in imported if obj.type=='MESH' and obj.name.startswith('Tire rubber')),
                 key=lambda obj:obj.name)[:4]
    assert len(tires)==4,relative_path
    if args.p2_section_probe:
        dimensions=[]
        for tire in tires:
            cloud=[tire.matrix_world @ v.co for v in tire.data.vertices]
            dimensions.append([round(max(getattr(p,axis) for p in cloud)-min(getattr(p,axis) for p in cloud),3)
                               for axis in ('x','y','z')])
        print('RUSTWALL_P2_WHEEL_AXES '+json.dumps({'source':relative_path,'xyzSpans':dimensions}))
    def components(bm):
        remaining=set(bm.verts); count=0
        while remaining:
            count+=1; stack=[remaining.pop()]
            while stack:
                vertex=stack.pop()
                for edge in vertex.link_edges:
                    other=edge.other_vert(vertex)
                    if other in remaining:remaining.remove(other);stack.append(other)
        return count
    original_components=welded_components=0
    for obj in [body,trim,glass,*tires]:
        bm=bmesh.new();bm.from_mesh(obj.data)
        original_components+=components(bm)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        welded_components+=components(bm)
        bm.to_mesh(obj.data);obj.data.update();bm.free()
    points=[obj.matrix_world @ vertex.co for obj in [body,trim,glass,*tires]
            for vertex in obj.data.vertices]
    mid_x=(max(p.x for p in points)+min(p.x for p in points))/2
    mid_y=(max(p.y for p in points)+min(p.y for p in points))/2
    half_x=(max(p.x for p in points)-min(p.x for p in points))/2
    half_y=(max(p.y for p in points)-min(p.y for p in points))/2
    low_z=min(p.z for p in points);height=max(p.z for p in points)-low_z
    def normalized(point):
        return ((point.x-mid_x)/half_x*.5,(point.y-mid_y)/half_y*.5,
                (point.z-low_z)/height*normalized_height)
    triangles=[];counts={'bodyTriangles':0,'glassTriangles':0,'wheelTriangles':0}
    for obj,target,tile,label in [(body,body_target,0,'bodyTriangles'),(trim,trim_target,9,'bodyTriangles'),
                                  (glass,16,8,'glassTriangles')]:
        if target <= 0:continue
        modifier=obj.modifiers.new('Offline Rustwall silhouette','DECIMATE')
        modifier.ratio=min(1,target/max(1,len(obj.data.polygons)))
        evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh=bpy.data.meshes.new_from_object(evaluated);mesh.calc_loop_triangles()
        for face in mesh.loop_triangles:
            triangles.append((tile,tuple(normalized(obj.matrix_world @ mesh.vertices[index].co)
                                         for index in face.vertices)))
            counts[label]+=1
        bpy.data.meshes.remove(mesh)
    wheel_objects=sorted(tires,key=lambda obj:sum((obj.matrix_world @ vertex.co).x
                                                   for vertex in obj.data.vertices)/len(obj.data.vertices))[:2] \
        if visible_wheels_only else tires
    for obj in wheel_objects:
        tire_points=[obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        xs=[p.x for p in tire_points];ys=[p.y for p in tire_points];zs=[p.z for p in tire_points]
        x0,x1=min(xs),max(xs);cy=(min(ys)+max(ys))/2;cz=(min(zs)+max(zs))/2
        ry=(max(ys)-min(ys))/2;rz=(max(zs)-min(zs))/2
        def wheel_point(x,r,angle):
            return normalized(Vector((x,cy+ry*r*math.cos(angle),cz+rz*r*math.sin(angle))))
        for i in range(wheel_steps):
            a=i*math.tau/wheel_steps;b=(i+1)*math.tau/wheel_steps
            for x in [x0,x1]:
                oa,ob=wheel_point(x,1,a),wheel_point(x,1,b)
                ia,ib=wheel_point(x,.52,a),wheel_point(x,.52,b)
                # The two axle caps face opposite directions. Geometry
                # stamping reverses face order during axis mapping.
                cap=[(oa,ob,ib),(oa,ib,ia)] if x==x0 else [(oa,ib,ob),(oa,ia,ib)]
                triangles.extend((3,face) for face in cap);counts['wheelTriangles']+=2
            for radius in [1,.52]:
                a0,a1=wheel_point(x0,radius,a),wheel_point(x1,radius,a)
                b0,b1=wheel_point(x0,radius,b),wheel_point(x1,radius,b)
                triangles.extend([(3,(a0,a1,b1)),(3,(a0,b1,b0))]);counts['wheelTriangles']+=2
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    info=dict(path=relative_path,sha256=digest(root / relative_path),weldThresholdMetres=.0001,
              originalComponents=original_components,weldedComponents=welded_components,**counts)
    return triangles,info


def stamp_welded_car(g,template,x,y,z,length,width,height,lean=0,yaw=0,body_tile=0,
                     crush_spoiler=False):
    """Place one supported source-derived hulk; glass and tires use the same hulks atlas."""
    start=len(g.faces)
    for tile,triangle in template:
        placed=[]
        for side,along,up in triangle:
            px=x+along*length*math.cos(yaw)-side*width*math.sin(yaw)-up*lean
            pz=z+along*length*math.sin(yaw)+side*width*math.cos(yaw)
            pz+=.12*math.sin(along*9+side*5)
            fold=max(0,up-.95)*.58 if crush_spoiler and along<-.29 else 0
            py=y+max(0,(up-fold)*height+.055*math.sin(along*11+side*7))
            placed.append(g.vertex((px,py,pz)))
        g.face(list(reversed(placed)),body_tile if tile==0 else tile)
    return len(g.faces)-start


def tower(g,d,x,y=35,z=2,height=7,canopy=True):
    for xx in [-2.1,2.1]:
        for zz in [-2,2]:g.tube((x+xx,y,z+zz),(x+xx,y+height,z+zz),.13,6)
    for level in range(math.ceil(height/2)):
        lo=y+level*2;hi=min(y+height,lo+2)
        for zz in [-2,2]:
            g.tube((x-2.1,lo,z+zz),(x+2.1,hi,z+zz),.075,5)
            g.tube((x+2.1,lo,z+zz),(x-2.1,hi,z+zz),.075,5)
        for xx in [-2.1,2.1]:g.tube((x+xx,lo,z-2),(x+xx,hi,z+2),.07,5)
    g.box((x,y+height,z),(4.7,.22,4.6),7)
    for zz in [-2.1,2.1]:
        for yy in [.5,1.15]:g.tube((x-2.2,y+height+yy,z+zz),(x+2.2,y+height+yy,z+zz),.05,6)
    if canopy:
        for xx in [-2.3,2.3]:g.tube((x+xx,y+height,z-2.2),(x+xx,y+height+3,z-2.2),.06,5)
        # Sloping cloth roof with a raised ridge and irregular hems.
        ids=[d.vertex(v) for v in [(x-2.6,y+height+2.5,z-2.5),(x,y+height+3.1,z-2.5),(x+2.6,y+height+2.5,z-2.5),
                                   (x-2.6,y+height+2.4,z+2.5),(x,y+height+3,z+2.5),(x+2.6,y+height+2.4,z+2.5)]]
        d.face([ids[0],ids[1],ids[4],ids[3]],0);d.face([ids[1],ids[2],ids[5],ids[4]],0)


def guard(name,mat,position):
    g=Geometry()
    for side in [-1,1]:
        g.tube((side*.12,.10,0),(side*.11,.87,0),.10,2,6,r2=.12)
        g.box((side*.13,.08,-.07),(.20,.16,.34),2)
        g.tube((side*.24,1.35,0),(side*.34,.91,-.10),.09,4,6,r2=.065)
    g.tube((0,.79,0),(0,1.43,0),.20,4,8,r2=.24)
    g.tube((0,1.43,0),(0,1.51,0),.09,3,6)
    g.tube((0,1.51,0),(0,1.80,0),.12,3,8,r2=.10)
    g.box((0,1.55,-.10),(.26,.15,.16),2)
    g.box((-.24,1.32,0),(.18,.14,.31),14)
    g.box((.24,1.32,0),(.18,.14,.31),14)
    obj=g.build(name,mat);obj.location=bv(position)
    return obj


def p2_facade(body,frames,relief):
    """Twelve unequal sections, eight recessed source-car salvage fields."""
    high_paths=('public/assets/models/classics/falcone_f42.glb',
                'public/assets/models/unlocks/banshee_muscle.glb')
    high=[welded_car_template(path) for path in high_paths]
    cheap=[welded_car_template(path,body_target=150,trim_target=0,wheel_steps=6,
        visible_wheels_only=True,normalized_height=1.65) for path in high_paths]
    car_mesh=Geometry();placed=0
    widths_left=[31,38,32,37,34,33.5]
    widths_right=[35,31,40,32,36,31.5]
    sections=[];x=-210
    for width in widths_left:
        sections.append((x,x+width));x+=width
    assert abs(x+4.5)<.0001
    x=4.5
    for width in widths_right:
        sections.append((x,x+width));x+=width
    assert abs(x-210)<.0001
    relief_sections={0,1,3,5,6,8,10,11}
    crowns=[37.2,39.1,36.7,42.4,38.3,40.7,37.8,43.1,39.7,41.4,36.9,42.7]
    for index,(left,right) in enumerate(sections):
        width=right-left;center=(left+right)/2
        front=-2.05-.48*(index%5)-.17*math.sin(index*2.1)
        for edge in [left,right]:
            post=edge+(.72 if abs(edge)<5 else -.40 if edge==right else .40)
            frames.box((post,17.5,front-.72),(.95,35,1.5),6)
        if index in relief_sections:
            grid=[]
            for iy in range(9):
                row=[]
                for ix in range(9):
                    px=left+1.2+(width-2.4)*ix/8
                    py=.35+31.9*iy/8
                    pz=front+.75-.18*math.sin(ix*1.9+iy*.8+index)-.07*math.cos(iy*2.4)
                    row.append(relief.vertex((px,py,pz)))
                grid.append(row)
            for iy in range(8):
                for ix in range(8):
                    u0=260+247*ix/8;u1=260+247*(ix+1)/8
                    v0=132+247*iy/8;v1=132+247*(iy+1)/8
                    relief.face([grid[iy][ix],grid[iy+1][ix],grid[iy+1][ix+1],grid[iy][ix+1]],
                                0,[(u0/512,v0/512),(u0/512,v1/512),
                                   (u1/512,v1/512),(u1/512,v0/512)],atlas=False)
        for row in range(6):
            if index in relief_sections:continue
            y=2.88+row*5.78
            inset=.15+(.28 if (index+row)%3==0 else 0)
            face=front-inset
            left_end=left+.9;right_end=right-.9
            if right_end-left_end>3:
                panel_width=right_end-left_end
                # Irregular adjacent steel sheets retain broad painted regions.
                body.box(((left_end+right_end)/2,y,face),(panel_width,5.50,.36),
                         [9,3,6,9,3,9][(row+index)%6])
                frames.box(((left_end+right_end)/2,y+2.79,face-.22),
                           (panel_width+.2,.18,.38),9)
        if index in (2,4,7,9):
            # Two physically scaled full-height plates interrupt the former
            # six-color sheet bands. A narrow third mass remains broken iron.
            for plate_index,(x0,x1) in enumerate(((left+1.4,left+11.0),
                                                   (right-11.0,right-1.4))):
                plate_z=front-1.18-.18*plate_index
                frames.box(((x0+x1)/2,17.5,plate_z+.62),
                           (x1-x0,35,1.22),9 if plate_index else 3)
                atlas_x=(264,344,424)[(index+plate_index)%3]
                face=[frames.vertex((x0,0,plate_z-.012)),
                      frames.vertex((x0,35,plate_z-.012)),
                      frames.vertex((x1,35,plate_z-.012)),
                      frames.vertex((x1,0,plate_z-.012))]
                uv=[((atlas_x+71*(px-x0)/(x1-x0))/512,
                     (270+228*py/35)/512)
                    for px,py in ((x0,0),(x0,35),(x1,35),(x1,0))]
                frames.face(face,0,uv,atlas=False)
            center_gap=(left+11.5+right-11.5)/2
            gap_width=(right-left)-23.0
            for level,(low,top) in enumerate(((0,9.1),(10.0,19.6),(20.7,34.7))):
                frames.box((center_gap,(low+top)/2,front-1.0-.24*(level%2)),
                           (gap_width-.9,top-low,.9),[9,3,6][(index+level)%3])
        # Steel loads reach the ground in each section, including the upper crown.
        if index not in (5,6):
            frames.tube((left+1.3,.05,front-1.15),(right-1.5,30.8,front+.13),.24,6,6)
            frames.tube((right-1.4,.05,front-.75),(left+2.0,34.8,front+.45),.19,6,6)
        crown=crowns[index]
        # Separate uneven salvage ledges replace broad triangular roof sheets.
        for ledge,(a,b) in enumerate(((.04,.29),(.34,.62),(.67,.96))):
            top=35.3+(crown-35)*[.44,.78,.57][(ledge+index)%3]
            span=width*(b-a)
            frames.box((left+width*(a+b)/2,(35+top)/2,front+.15),
                       (span,top-35,.7),[2,5,9,13][(index+ledge)%4])
            frames.box((left+width*(a+b)/2,top+.10,front-.18),
                       (span+.28,.20,.94),6)
        if index in relief_sections:
            for x in (left+1.2,right-1.2):
                frames.box((x,16,front-.75),(.55,32,1.0),6)
            # Upper shelves transfer loads into vertical posts reaching y=0.
            if index not in (5,6):
                for y in (13.72,26.72):
                    frames.box((center,y,front-1.05),(width-2.6,.35,1.25),6)
                    frames.tube((left+1.2,.05,front-.82),(center,y,front-.95),.21,6,6)
            for row,y in enumerate((.05,1.62,13.9,27.0)):
                if index in (5,6) and row>=2:continue
                for col in range(3):
                    variant=(row+col+index)%2
                    cx=center+(col-1)*min(7.3,(width-6)/3)+.38*math.sin(row*1.9+index)
                    cz=front-1.95-.25*((row+col+index)%3)
                    stamp_welded_car(car_mesh,cheap[variant][0],cx,y,cz,
                                     5.35,2.25,1.05+.05*((row+col)%3),
                                     .04 if row%2 else -.04,
                                     [-.25,.11,.29][(row+col+index)%3],
                                     [0,4,5,2,13][(row+3*col+index)%5],
                                     (row+col+index)%4!=0)
                    placed+=1
            if index in (5,6):
                # A few complete bodies interrupt the baked car face. Each
                # short perch meets the bay's grounded side upright.
                for tier,(height_y,fraction) in enumerate(((9.2,.28),(20.1,.69),(28.0,.43))):
                    cx=left+width*fraction
                    side_post=left+1.2 if fraction<.5 else right-1.2
                    cz=front-2.30-.35*(tier%2)
                    frames.box(((cx+side_post)/2,height_y-.10,cz+.22),
                               (abs(cx-side_post)+.8,.23,1.15),6)
                    frames.box((side_post,height_y/2,cz+.35),(.42,height_y,1.05),6)
                    stamp_welded_car(car_mesh,high[(index+tier)%2][0],cx,height_y,cz,
                                     5.15,2.2,.98,-.07 if tier%2 else .09,
                                     [-.27,.18,.35][tier],[0,4,5][tier],True)
                    placed+=1
            if index==10:
                # Detailed cars break the upper line, supported by steel below.
                top_y=35.35
                frames.box((center,35.2,front-.8),(6.3,.36,1.8),6)
                stamp_welded_car(car_mesh,high[index%2][0],center,top_y,front-1.1,
                                 5.5,2.3,1.02,.04,.13,[0,4,5][index%3],True)
                placed+=1
        else:
            # Four detailed heroes anchor the quieter steel sections at ground.
            hero=index%2
            stamp_welded_car(car_mesh,high[hero][0],center,0,front-2.1,
                             5.5,2.3,1.03,.04,.12 if index%3==0 else -.08,
                             [0,4,5,2,13][index%5],index%3!=0)
            placed+=1
    # The central portal is a grounded, layered salvage mass rather than two
    # more identical shelf bays. Its irregular crown stays below the towers.
    for side in (-1,1):
        frames.box((side*15.4,20.7,-4.0),(1.35,41.4,2.1),6)
        frames.box((side*5.55,25.5,-4.15),(1.15,37.0,2.0),6)
        frames.tube((side*15.4,.15,-4.3),(side*13.0,24.0,-4.55),.44,6,6)
        frames.tube((side*13.0,19.0,-4.3),(side*10.7,37.0,-4.55),.38,6,6)
    # The plated bridge sits on the two existing full-height piers. Separate
    # tower tops leave open sky over the bridge rather than a single roof sign.
    # Short face spans keep the center plate visible in each actual projected
    # zone; the pieces share edges and still form one deep lintel.
    for bridge_index in range(6):
        frames.box(((bridge_index-2.5)*5.0,38.5,-3.7),
                   (5.02,7.0,3.5),3)
    frames.box((0,35.2,-5.25),(30.8,.44,1.1),6)
    frames.box((0,42.0,-5.30),(30.8,.38,1.0),6)
    for side in (-1,1):
        frames.box((side*10.1,38.5,-3.55),(8.1,7.0,3.6),3)
        frames.box((side*10.1,43.75,-3.55),(8.1,3.5,3.6),9)
        frames.box((side*10.1,45.4,-3.65),(9.2,.46,4.1),6)
        frames.box((side*7.3,42.2,-5.6),(.42,5.5,.55),6)
        frames.box((side*12.9,42.2,-5.6),(.42,5.5,.55),6)
    return car_mesh,[info for _,info in high],placed


def wall():
    fresh();steel=material('steel');hulks=material('hulks');details=material('details')
    body,frames,wrecks,props,panel=Geometry(),Geometry(cap_tubes=False),Geometry(),Geometry(),Geometry()
    relief_mesh=Geometry()
    relief_path=relief_hash=relief_snapshots=None
    if args.p2:
        proof_dir=out if args.output_dir else root / 'art-build/rustwall-p2'
        proof_dir.mkdir(parents=True,exist_ok=True)
        source_paths=('public/assets/models/classics/falcone_f42.glb',
                      'public/assets/models/unlocks/banshee_muscle.glb')
        cheap_templates=[welded_car_template(path,body_target=150,trim_target=0,wheel_steps=6,
                          visible_wheels_only=True,normalized_height=1.65) for path in source_paths]
        relief_path,relief_hash,relief_snapshots=p2_prepare_relief_atlas(
            hulks,cheap_templates,proof_dir,'wall')
    # Exact structural mass with a real empty 9 by 7 m passage all the way through.
    body.box((-107.25,17.5,4),(205.5,35,3),3)
    body.box((107.25,17.5,4),(205.5,35,3),3)
    body.box((0,21,4),(9,28,3),7)
    rng=np.random.default_rng(240923)
    p2_cars=p2_sources=p2_placed=None
    if args.p2:p2_cars,p2_sources,p2_placed=p2_facade(body,frames,relief_mesh)
    # Thirty irregular bays; hulk stacks remain full human/vehicle scale.
    for bay in range(0 if args.p2 else 30):
        x=-203+bay*14
        if abs(x)<10:continue
        salvage=bay%3==1
        for row in range(6):
            yy=2.5+row*5.75
            if salvage and row>0:continue
            widths=[4.2,4.6,4.1]
            for col in range(3):
                cx=x+(col-1)*4.45;h=min(4.95+float(rng.uniform(-.3,.3)),2*yy,2*(35-yy))
                facez=.20+float(rng.uniform(-.14,.08))
                region=[2,5,9,13,0,4][(bay//3+row//2)%6]
                if (bay+row+col)%3:
                    # Salvaged facing is cut, buckled and overlapped, rather
                    # than another rectangular tile in a regular grid.
                    half=widths[col]/2;low=yy-h/2;high=yy+h/2
                    outline=[(cx-half,low+.17),(cx-half-.08,high-.35),
                             (cx-half*.23,min(35,high+.09)),(cx+half*.64,high-.13),
                             (cx+half+.08,high-.48),(cx+half,low+.12)]
                    body.profile(outline,[facez,facez+.36],region if (bay+row+col)%5 else 10)
                else:
                    body.box((cx,yy,facez+.18),(widths[col],h,.36),region)
                for dx in [-1.86,1.86]:
                    for dy in [-h*.40,0,h*.40]:
                        frames.rivet(cx+dx,yy+dy,.11)
                if (bay+row+col)%4==0 and row>0:
                    # Irregular overlapping repair sheets break large clean fields.
                    panelx=cx-.2;panely=yy+.2
                    outline=[(panelx-2.0,panely-2.4),(panelx-2.1,panely+2.2),
                             (panelx+1.3,panely+2.5),(panelx+2.0,panely+1.65),
                             (panelx+1.98,panely-.4),(panelx+1.73,panely-.56),
                             (panelx+2.0,panely-.8),(panelx+1.95,panely-2.3)]
                    frames.profile(outline,[-.04,-.015],[8,9,2][row%3])
        if salvage:
            for row in range(9):
                yy=5.4+row*3.05
                for col in [-1,1]:
                    car(wrecks,x+col*2.65+float(rng.uniform(-.5,.5)),yy+float(rng.uniform(-.45,.45)),.25+float(rng.uniform(-.3,.3)),int(rng.integers(0,7)),row+bay)
                # Short bent crosspieces and crumpled scrap fill the gaps;
                # uninterrupted horizontal showroom platforms are removed.
                for col in [-1,1]:
                    frames.tube((x+col*2.9-2,yy+1.3,.8),(x+col*2.9+1.8,yy+1.8,.95),.12,5,4)
                    frames.profile([(x+col*2.6-2.1,yy+.85),(x+col*2.6-2.2,yy+1.8),
                                    (x+col*2.6-.6,yy+2.25),(x+col*2.6+1.8,yy+2.5),
                                    (x+col*2.6+2.05,yy+1.3)], [.40,2], [2,9,7][row%3])
        for dx in [-6.65,6.65]:
            frames.box((x+dx,17.5,-.08),(.32,35,.72),6)
        for lo in [0,11.6,23.2]:
            frames.tube((x-6.5,lo,.04),(x+6.5,min(35,lo+11.6),.04),.16,5,4)
    # Extra tall steel above the human-scale gate, rather than enlarged people.
    for side in [-1,1]:
        if args.p2:
            # Four staggered height bands make one massive vertical pier. The
            # deep side faces show in the oblique view; rear salvage stays inset.
            bands=((0,8,10.0,9.9,3),(8,16,9.7,9.75,9),
                   (16,25,9.3,9.6,3),(25,35,9.0,9.45,9))
            for low,top,width,cx,tile in bands:
                for strip in range(4):
                    strip_width=width/4
                    strip_x=side*cx+(strip-1.5)*strip_width
                    frames.box((strip_x,(low+top)/2,-3.25),
                               (strip_width+.025,top-low,3.3),tile)
                    # The visible front uses one continuous physical-height UV
                    # field, independent of these structural face divisions.
                    x0=strip_x-strip_width/2;x1=strip_x+strip_width/2
                    source_x0=-14.9 if side<0 else 4.9
                    atlas_x=264 if side<0 else 344
                    plate=[frames.vertex((x0,low,-4.918)),frames.vertex((x0,top,-4.918)),
                           frames.vertex((x1,top,-4.918)),frames.vertex((x1,low,-4.918))]
                    plate_uv=[((atlas_x+71*(px-source_x0)/10)/512,
                               (270+228*py/35)/512)
                              for px,py in ((x0,low),(x0,top),(x1,top),(x1,low))]
                    frames.face(plate,0,plate_uv,atlas=False)
            # Irregular continuous face straps interrupt the horizontal joints.
            frames.box((side*6.2,17.5,-5.02),(.78,35,.28),6)
            frames.box((side*12.8,17.5,-4.99),(.62,35,.22),2)
            frames.profile([(side*5.3,35),(side*5.6,40.5),
                            (side*8.1,42.3),(side*10.7,40.8),
                            (side*13.7,41.7),(side*14.1,35)],[-4.9,-1.6],3)
        else:
            for row in range(7):
                body.box((side*9.9,2.5+row*5,.54),(9.75,4.94,.42),[9,0,4,2,8,1,10][row])
        if not args.p2:
            frames.tube((side*5.7,.3,-.02),(side*14,16.5,-.02),.13,5,4)
            frames.tube((side*14,17,-.02),(side*5.7,34.5,-.02),.13,5,4)
        frames.box((side*5.15,18,-.45),(1.3,36,1.5),6)
        frames.box((side*5.15,18,-1.25),(.28,36,.28),2)
        frames.tube((side*4.73,7,-1.05),(side*4.73,36,-1.05),.065,6)
    for row in range(5):body.box((0,10+row*5.5,1.65),(8.95,5.4,.45),[8,0,9,4,1][row])
    if args.p2:
        # Deep sill and lintel join both piers above the moving gate panel.
        for strip in range(10):
            frames.box(((strip-4.5)*2.9,10,-3.28),(2.92,6.0,3.45),3)
            frames.box(((strip-4.5)*2.6,13.6,-4.7),(2.62,1.25,1.0),6)
            x0=(strip-5)*2.9;x1=x0+2.9
            face=[frames.vertex((x0,7,-5.025)),frames.vertex((x0,13,-5.025)),
                  frames.vertex((x1,13,-5.025)),frames.vertex((x1,7,-5.025))]
            uv=[((424+71*(py-7)/6)/512,(270+228*(px+14.5)/29)/512)
                for px,py in ((x0,7),(x0,13),(x1,13),(x1,7))]
            frames.face(face,0,uv,atlas=False)
    panel.box((0,3.5,-.40),(9,7,.62),0)
    for y in [0.3,2.35,4.65,6.7]:panel.box((0,y,-.77),(9,.18,.15),6)
    for x in [-4.25,-2.1,0,2.1,4.25]:
        panel.box((x,3.5,-.76),(.12,7,.1),2)
    frames.tube((-6,36.6,-.2),(6,36.6,-.2),.22,6,8)
    for x in [-5.15,5.15]:
        frames.tube((x-.6,36.6,-.2),(x+.6,36.6,-.2),.95,5,12)
        for offset in [-.68,.68]:
            frames.tube((x+offset-.06,36.6,-.2),(x+offset+.06,36.6,-.2),1.08,6,12)
        for dx in [-.19,.19]:
            frames.tube((x+dx,7.1,-1.43),(x+dx,36.4,-1.43),.045,3,5)
        for yy in [7.6,16,25,34.5]:
            frames.box((x,yy,-1.4),(1.8,.45,.45),6)
        frames.box((x,35.8,-.2),(2.5,1.0,2.7),7)
        frames.tube((x,33.5,-.2),(x,35.8,-1.6),.15,5,6)
    if not args.p2:
        for yy in [8,13,19,25,31,34.5]:frames.box((0,yy,1.29),(8.9,.22,.3),5)
    tower_positions=[-175,-119,-63,-21,21,77,133,189]
    tower_heights=[5.0,6.4,5.8,7.0,7.6,6.1,5.4,6.8] if args.p2 else [7 if abs(x)<80 else 5 for x in tower_positions]
    for x,tower_height in zip(tower_positions,tower_heights):
        tower(frames,props,x,height=tower_height)
        # The watch platforms need visible load paths into the wall, not
        # detached silhouettes perched above its top edge.
        frames.tube((x-2.2,35,1.3),(x-2.2,39.2,1.3),.12,5,6)
        frames.tube((x+2.2,35,1.3),(x+2.2,39.2,1.3),.12,5,6)
        frames.tube((x-3.4,33.8,1.5),(x-1.8,39.2,1.3),.085,5,5)
        frames.tube((x+3.4,33.8,1.5),(x+1.8,39.2,1.3),.085,5,5)
        if abs(x)<80:
            for side in [-1,1]:
                frames.tube((x+side*2.0,36,1.4),(x+side*7.5,.3,-.8),.13,5,6)
    # Uneven roof salvage interrupts the structural core's straight top line.
    for bay in range(0 if args.p2 else 30):
        x=-203+bay*14
        if abs(x)<10:continue
        rise=[.9,1.6,.55,2.1,1.2][bay%5]
        frames.profile([(x-5.8,34.95),(x-4.9,35.3+rise*.55),
                        (x-2.1,35.1+rise),(x+1.1,35.3+rise*.68),
                        (x+5.5,34.95)],[-.32,.16],[2,5,9,13][bay%4])
    # Open lattice cranes with visible hook/cable, never a solid silhouette block.
    for x,direction in [(-77,1),(91,-1)]:
        a=Vector((x,38,3));b=Vector((x+direction*18,51,3))
        for dz in [-.75,.75]:
            for dy in [-.55,.55]:frames.tube(a+Vector((0,dy,dz)),b+Vector((0,dy,dz)),.12,6)
        for i in range(10):
            q=a.lerp(b,i/10);r=a.lerp(b,(i+1)/10)
            for dz in [-.75,.75]:frames.tube(q+Vector((0,-.55,dz)),r+Vector((0,.55,dz)),.07,5)
        frames.tube(b,b-Vector((0,10,0)),.035,3)
        frames.tube(b-Vector((0,10,0)),b-Vector((.35,10.5,0)),.12,5)
    for x in [-147,-91,-35,35,105,161]:
        props.cloth(x,33,-.55,4.8,15,0 if x<0 else 1)
        frames.tube((x-2.8,33.3,-.6),(x+2.8,33.3,-.6),.06,6)
    for x in [-9,9,-24,24,-70,70]:
        props.tube((x,0,-2),(x,1.0,-2),.36,11,10)
        for yy in [.2,.8]:frames.tube((x,yy,-2),(x,yy+.07,-2),.38,6,10)
        props.profile([(x-.23,1),(x-.29,1.48),(x-.10,1.34),(x+.04,1.96),
                       (x+.12,1.48),(x+.24,1.65),(x+.20,1.06)],[-2.12,-1.9],8)
        props.profile([(x-.12,1),(x-.13,1.31),(x+.04,1.68),(x+.11,1.06)],[-2.14,-2.13],9)
    # Grounded practical clutter leaves the entire vehicle opening clear.
    for i in range(40):
        x=-202+i*10.3
        if abs(x)<7:continue
        h=.4+float(rng.uniform(0,.55));z=-1.4-float(rng.uniform(0,.9))
        props.box((x,h/2,z),(1.4+float(rng.uniform(0,1.2)),h,.65),11)
    # Low broken cars give the facing a salvage foot and human-scale depth.
    # They stay outside the full vehicle opening and use the existing hulk draw.
    for i in range(0 if args.p2 else 28):
        x=-198+i*14.65+float(rng.uniform(-1.0,1.0))
        if abs(x)<12:continue
        car(wrecks,x,-.22,-1.80-float(rng.uniform(0,.65)),
            int(rng.choice([0,1,2,4,5,6,9,13])),i+41)
    for side in [-1,1]:
        for i in range(4):
            x=side*(8.2+i*2.1);z=-2.8-float(rng.uniform(0,.8))
            h=.50+float(rng.uniform(0,.4))
            frames.profile([(x-.65,0),(x-.8,h*.8),(x-.3,h),(x+.7,h*.55),(x+.8,0)],[z,z+.7],9)
        # Hollow tire piles and a small axle stay outside the clear passage.
        for i in range(3):
            x=side*(14.5+i*.55)
            frames.tube((x,.35,-3.6),(x,.35,-3.3),.32,12,8)
    for x in [-42,49,-133,154]:
        tower(frames,props,x,height=9,canopy=False)
        for dx in [-.7,.7]:
            frames.box((x+dx,45,1.6),(1.2,.65,.85),7)
            props.box((x+dx,45,1.16),(1.03,.47,.02),9)
    # Railings and ladders establish the scale and usable wall-top walkway.
    for x in range(-207,208,6):
        frames.tube((x,35,-.35),(x,36.1,-.35),.045,6)
        if x<207:frames.tube((x,36.1,-.35),(x+6,36.1,-.35),.045,6)
    for x in [-18,18,-60,80]:
        for dx in [-.3,.3]:frames.tube((x+dx,0,-.9),(x+dx,35,-.9),.045,5)
        for yy in np.arange(.2,35,.4):frames.tube((x-.3,float(yy),-.95),(x+.3,float(yy),-.95),.035,6,4)
    hulk_object=(p2_cars.build('welded-car-hulks',hulks,recalculate_normals=False)
                 if args.p2 else wrecks.build('hulk-stacks',hulks))
    if args.p2:
        hulk_object['sources']=p2_sources
        hulk_object['placedHulks']=p2_placed
    steel_object=frames.build('scaffold-steel',steel)
    if args.p2:
        steel_object['steelPaintInput']='generated-source' if steel_paint_path else 'procedural-fixture'
        if steel_paint_path:
            steel_object['steelPaintSourcePath']=str(steel_paint_path.relative_to(root)).replace('\\','/')
            steel_object['steelPaintSourceSha256']=args.steel_paint_sha256.lower()
        steel_object['steelPaintAtlasRects']=[[264,12,335,243],[344,12,415,243],[424,12,495,243]]
    objects=[body.build('wall-body',steel),steel_object,hulk_object,
             props.build('wall-details',details),panel.build('gate-panel',steel)]
    if args.p2:
        relief_object=relief_mesh.build('source-car-relief',hulks,recalculate_normals=False)
        relief_object['sourceRenderPath']=str(relief_path.relative_to(root)).replace('\\','/')
        relief_object['sourceRenderSha256']=relief_hash
        relief_object['uvRegion']=[260,132,507,379]
        relief_object['sectionIndices']=[0,1,3,5,6,8,10,11]
        relief_object['atlasSnapshots']=relief_snapshots
        objects.append(relief_object)
    places=[(-6.8,0,-1.8),(6.8,0,-1.8),(-14,35,-.1),(14,35,-.1),(-57,35,0),(67,35,0),(-125,35,0),(150,35,0)]
    for i,pos in enumerate(places):objects.append(guard(f'guard-{i+1:02}',details,pos))
    # Torches separate from human bounds, and above a safely readable hand.
    torch=Geometry()
    for x,y,z in places:
        torch.tube((x+.34,y+.94,z-.1),(x+.34,y+2.15,z-.1),.035,2)
        torch.profile([(x+.23,y+2.05),(x+.20,y+2.38),(x+.32,y+2.29),
                       (x+.40,y+2.77),(x+.49,y+2.29),(x+.44,y+2.06)],[z-.16,z-.04],8)
    # Reuse detail material but merge torch triangles into the same draw object.
    t=torch.build('torch-props',details)
    bpy.ops.object.select_all(action='DESELECT');t.select_set(True);objects[3].select_set(True)
    bpy.context.view_layer.objects.active=objects[3];bpy.ops.object.join()
    return objects


def wash():
    fresh();mat=material('rock');g=Geometry();sections=[]
    # One joined eroded slope replaces a stack of polygonal columns. Nine
    # cross-sections and nine points across each section use 128 face triangles;
    # the two end fans add 16, preserving the 144-triangle instance budget.
    across=(-1,-.86,-.68,-.42,0,.42,.68,.86,1)
    heights=(0,.70,.88,.94,.91,.94,.88,.70,0)
    for station in range(9):
        z=-1+station*.25
        ridge=.90+.055*math.sin(station*1.91)+.035*math.sin(station*3.47)
        section=[]
        for j,(x,height) in enumerate(zip(across,heights)):
            shoulder=.045*math.sin(station*1.47+j*.83) if 0<j<8 else 0
            lateral=.028*math.sin(station*1.13+j*.75) if 0<j<8 else 0
            y=max(0,min(1,height*ridge/.90+shoulder)) if height else 0
            section.append(g.vertex((x+lateral,y,z)))
        sections.append(section)
    for station in range(8):
        for j in range(8):
            g.face([sections[station][j],sections[station][j+1],
                    sections[station+1][j+1],sections[station+1][j]],0,
                   [(station/8,j/8),(station/8,(j+1)/8),
                    ((station+1)/8,(j+1)/8),((station+1)/8,j/8)],atlas=False)
    for section in (sections[0],sections[-1]):
        center=g.vertex((0,0,-1 if section is sections[0] else 1))
        for j in range(8):
            g.face([center,section[j],section[j+1]],0,
                   [(.5,0),(j/8,.5),((j+1)/8,.5)],atlas=False)
    return [g.build('wash-eroded-bank',mat)]


def stats(objects):
    rows=[]
    for obj in objects:
        obj.data.calc_loop_triangles()
        rows.append(dict(name=obj.name,triangles=len(obj.data.loop_triangles),materialDraws=len(obj.data.materials)))
    return dict(triangles=sum(r['triangles'] for r in rows),materialDraws=sum(r['materialDraws'] for r in rows),meshes=rows)


def export(objects,kind):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(glb_path(kind)),export_format='GLB',use_selection=True,
        export_yup=True,export_animations=False,export_materials='EXPORT',export_extras=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path(kind)))


def stage():
    groundmat=bpy.data.materials.new('Review ground only');groundmat.diffuse_color=(.28,.27,.24,1)
    bpy.ops.mesh.primitive_plane_add(size=1500)
    plane=bpy.context.object;plane.name='REVIEW ONLY neutral ground';plane.data.materials.append(groundmat)
    for name,energy,size,pos in [('Key',180000,90,(-60,100,-80)),('Fill',60000,100,(70,55,-30))]:
        light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.shape='DISK';light.size=size
        obj=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(obj);obj.location=bv(pos)
        obj.rotation_euler=(bv((0,18,0))-obj.location).to_track_quat('-Z','Y').to_euler()
    sun=bpy.data.lights.new('Broad daylight','SUN');sun.energy=1.5;sun.angle=.08
    obj=bpy.data.objects.new('Broad daylight',sun);bpy.context.collection.objects.link(obj)
    obj.rotation_euler=(.45,-.35,-.45)
    camdata=bpy.data.cameras.new('Matched perspective');cam=bpy.data.objects.new('Matched perspective',camdata)
    bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam
    return cam


def p2_prepare_relief_atlas(hulk_material, templates, proof_dir, snapshot_prefix):
    """Render welded source cars offline, packing only the reserved hulk pixels."""
    preexisting=set(bpy.data.objects)
    source_geometry=Geometry();source_back=Geometry()
    source_back.box((0,16,1.7),(31.5,32.4,.24),3)
    for row in range(20):
        for col in range(6):
            template=templates[(row+col)%2][0]
            jitter=.36*math.sin(row*1.71+col*.87)+.15*math.cos(row*.67-col*2)
            x=-12.7+col*5.08+jitter
            y=.05+row*1.59+.08*math.sin(row*1.91+col)
            z=-.34*((row+col)%3)-.20*math.sin(row*.93-col*.7)
            yaw=[-.22,.13,-.08,.32,.03,-.30][(row*3+col)%6]
            stamp_welded_car(source_geometry,template,x,y,z,5.45,2.25,
                             1.04+.075*((row+2*col)%3),.05 if (row+col)%2 else -.06,
                             yaw,[0,4,5,2,13][(row+2*col)%5],(row+col)%5!=0)
            if (row*7+col*3)%11==0:
                source_back.box((x+1.5,y+.82,z+.36),(1.8,.48,.12),9)
    source_back.build('SOURCE ONLY soot-dark recess',hulk_material)
    source_geometry.build('SOURCE ONLY stacked welded cars',hulk_material,
                          recalculate_normals=False)
    source_camera=stage();source_camera.data.type='ORTHO';source_camera.data.ortho_scale=33
    source_camera.location=bv((0,15.7,-90))
    source_camera.rotation_euler=(bv((0,15.7,0))-source_camera.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT'
    scene.render.resolution_x=512;scene.render.resolution_y=512
    scene.render.dither_intensity=0.0
    scene.render.film_transparent=False
    source_path=proof_dir / f'{snapshot_prefix}-relief-source.png'
    scene.render.filepath=str(source_path);bpy.ops.render.render(write_still=True)
    source_hash=digest(source_path)
    source_image=bpy.data.images.load(str(source_path),check_existing=False)
    source_pixels=np.empty(512*512*4,dtype=np.float32)
    source_image.pixels.foreach_get(source_pixels)
    source_pixels=source_pixels.reshape(512,512,4)
    sample=np.linspace(0,511,248).round().astype(int)
    painted=source_pixels[np.ix_(sample,sample)].copy()
    luminance=np.mean(painted[:,:,:3],axis=2)
    dy,dx=np.gradient(luminance)
    vectors=np.stack([-dx*2,-dy*2,np.ones_like(dx)],axis=2)
    vectors/=np.linalg.norm(vectors,axis=2,keepdims=True)
    snapshots={}
    for label in ('color','surface','normal'):
        image=bpy.data.images[f'hulks-{label}']
        # material() packed the initial palette. Discard that pack before
        # editing, or glTF embeds stale bytes despite the new disk PNG.
        if image.packed_file:image.unpack(method='REMOVE')
        pixels=np.empty(512*512*4,dtype=np.float32);image.pixels.foreach_get(pixels)
        pixels=pixels.reshape(512,512,4)
        if label=='color':pixels[132:380,260:508,:3]=painted[:,:,:3]
        elif label=='surface':
            pixels[132:380,260:508,1]=.83
            pixels[132:380,260:508,2]=.18
        else:pixels[132:380,260:508,:3]=vectors*.5+.5
        image.pixels.foreach_set(pixels.ravel());image.update();image.save()
        encoded=Path(image.filepath_raw).read_bytes()
        snapshot=proof_dir / f'{snapshot_prefix}-atlas-{label}.png'
        snapshot.write_bytes(encoded)
        snapshots[label]={'path':str(snapshot.relative_to(root)).replace('\\','/'),
                          'sha256':digest(snapshot)}
        image.pack(data=encoded,data_len=len(encoded))
    for obj in set(bpy.data.objects)-preexisting:bpy.data.objects.remove(obj,do_unlink=True)
    scene.render.engine='CYCLES';scene.render.resolution_x=1280;scene.render.resolution_y=720
    return source_path,source_hash,snapshots


if args.p2_relief_probe:
    fresh();hulk_material=material('hulks')
    proof_dir=out if args.output_dir else root / 'art-build/rustwall-p2'
    proof_dir.mkdir(parents=True,exist_ok=True)
    paths=('public/assets/models/classics/falcone_f42.glb',
           'public/assets/models/unlocks/banshee_muscle.glb')
    templates=[welded_car_template(path,body_target=150,trim_target=0,wheel_steps=6,
               visible_wheels_only=True,normalized_height=1.65) for path in paths]
    source_path,source_hash,snapshots=p2_prepare_relief_atlas(hulk_material,templates,proof_dir,'probe')
    scene=bpy.context.scene
    source_camera=stage();source_camera.data.type='ORTHO'
    # The final probe contains a shallow irregular relief and genuine front
    # cars sharing the same re-packed hulks material and one authored UV set.
    relief_geometry=Geometry()
    grid=[]
    for iy in range(9):
        row=[]
        for ix in range(9):
            x=-14+ix*3.5;y=.2+iy*3.85
            z=-5.2-.20*math.sin(ix*1.9+iy*.8)-.08*math.cos(iy*2.4)
            row.append(relief_geometry.vertex((x,y,z)))
        grid.append(row)
    for iy in range(8):
        for ix in range(8):
            ids=[grid[iy][ix],grid[iy+1][ix],grid[iy+1][ix+1],grid[iy][ix+1]]
            x0=260+(247*ix/8);x1=260+(247*(ix+1)/8)
            y0=132+(247*iy/8);y1=132+(247*(iy+1)/8)
            relief_geometry.face(ids,0,[(x0/512,y0/512),(x0/512,y1/512),
                                        (x1/512,y1/512),(x1/512,y0/512)],atlas=False)
    relief=relief_geometry.build('source-car-relief',hulk_material,recalculate_normals=False)
    relief['sourceRenderPath']=str(source_path.relative_to(root)).replace('\\','/')
    relief['sourceRenderSha256']=source_hash
    relief['uvRegion']=[260,132,507,379]
    relief['atlasSnapshots']=snapshots
    car_geometry=Geometry()
    for col in range(2):
        stamp_welded_car(car_geometry,templates[col][0],-3+col*6,.07,-5.7,5.35,2.25,
                         1.05,.04,0,[0,4][col],col==1)
    cars=car_geometry.build('welded-car-hulks',hulk_material,recalculate_normals=False)
    cars['sources']=[info for _,info in templates];cars['placedHulks']=2
    steel_material=material('steel')
    steel_geometry=Geometry(cap_tubes=False)
    for x in (-14.6,14.6):
        steel_geometry.box((x,16,-5.65),(.9,32.2,1.45),6)
        steel_geometry.tube((x,.05,-6.7),(x-(2.6 if x>0 else -2.6),25,-5.05),.28,6,6)
    steel_geometry.box((0,31.9,-5.75),(30.2,.7,1.2),6)
    steel_geometry.box((0,.35,-5.85),(30.2,.7,1.5),6)
    steel=steel_geometry.build('relief-probe-grounded-steel',steel_material)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in (relief,cars,steel):obj.select_set(True)
    bpy.context.view_layer.objects.active=relief
    glb=proof_dir / 'relief-probe.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
                              export_yup=True,export_animations=False,export_materials='EXPORT',export_extras=True)
    for label,position,target,scale in [('front',(0,15,-70),(0,15,-5),37),
                                         ('quarter',(31,18,-53),(0,15,-5),37),
                                         ('wall-scale',(0,17,-110),(0,16,-5),100)]:
        source_camera.location=bv(position)
        source_camera.rotation_euler=(bv(target)-source_camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.resolution_x=960;scene.render.resolution_y=720
        source_camera.data.ortho_scale=scale
        scene.render.filepath=str(proof_dir / f'relief-probe-{label}.png')
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(proof_dir / 'relief-probe.blend'))
    manifest={'sources':[{'path':path,'sha256':digest(root/path)} for path in paths],
              'sourceRenderPath':str(source_path.relative_to(root)).replace('\\','/'),
              'sourceRenderSha256':source_hash,'uvRegion':[260,132,507,379],
              'atlasSnapshots':snapshots,
              'reliefTriangles':len(relief.data.polygons)*2,
              'carTriangles':sum(len(poly.vertices)-2 for poly in cars.data.polygons),
              'glbSha256':digest(glb)}
    (proof_dir/'relief-probe.json').write_text(json.dumps(manifest,indent=2)+'\n',
                                               encoding='utf-8',newline='\n')
    print('RUSTWALL_P2_RELIEF_PROBE '+json.dumps(manifest));sys.exit(0)

if args.p2_wheel_probe:
    fresh();hulk_material=material('hulks')
    proof_dir=root / 'art-build/rustwall-p2';proof_dir.mkdir(parents=True,exist_ok=True)
    template,source=welded_car_template('public/assets/models/classics/falcone_f42.glb',
        body_target=150,trim_target=0,wheel_steps=6,visible_wheels_only=True,
        normalized_height=1.65)
    proof=Geometry()
    stamp_welded_car(proof,template,0,.07,-5.15,5.35,2.25,1.05,.04,0,0)
    model=proof.build('welded-car-hulks',hulk_material,recalculate_normals=False)
    model['sources']=[source];model['placedHulks']=1
    assert len(model.data.uv_layers)==1 and model.data.uv_layers[0].name=='Authored material islands'
    bpy.ops.object.select_all(action='DESELECT');model.select_set(True)
    bpy.context.view_layer.objects.active=model
    glb=proof_dir / 'wheel-probe.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
                              export_yup=True,export_animations=False,export_materials='EXPORT',export_extras=True)
    camera=stage();bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'
    for label,position,target in [('front',(0,1.3,-15),(0,1,-5.15)),
                                  ('quarter',(6,3,-13),(0,1,-5.15))]:
        camera.location=bv(position)
        camera.rotation_euler=(bv(target)-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32
        camera.data.lens=32/(2*math.tan(math.radians(37)/2))
        bpy.context.scene.render.filepath=str(proof_dir / f'wheel-probe-{label}.png')
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(proof_dir / 'wheel-probe.blend'))
    manifest={'source':source,'placedHulks':1,'triangles':sum(len(poly.vertices)-2 for poly in model.data.polygons),
              'glbSha256':digest(glb),'uvLayer':'Authored material islands',
              'stamp':dict(x=0,y=.07,z=-5.15,length=5.35,width=2.25,heightScale=1.05,
                           lean=.04,yaw=0,bodyTile=0)}
    (proof_dir / 'wheel-probe.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('RUSTWALL_P2_WHEEL_PROBE '+json.dumps(manifest))
    sys.exit(0)

if args.p2_section_probe:
    fresh();steel_material=material('steel');hulk_material=material('hulks')
    proof_dir=root / 'art-build/rustwall-p2';proof_dir.mkdir(parents=True,exist_ok=True)
    paths=('public/assets/models/classics/falcone_f42.glb',
           'public/assets/models/unlocks/banshee_muscle.glb')
    sources=[welded_car_template(path) for path in paths]
    sources.extend(welded_car_template(path,body_target=150,trim_target=0,wheel_steps=6,
                                       visible_wheels_only=True,normalized_height=1.65)
                   for path in paths)
    mass=Geometry();supports=Geometry(cap_tubes=False);cars=Geometry()
    # A framed, inset car-stack bay and a subdivided steel sheet bay.
    mass.box((0,17.5,3.0),(34,35,2),3)
    for x in [-17,-3,17]:supports.box((x,17.5,-4.1),(.75,35,.9),6)
    for row in range(7):
        y=2.45+row*4.25
        mass.box((7,y,-2.8),(19,4.1,.55),[4,9,2,5,8,13,1][row])
        supports.box((7,y+2.08,-3.18),(19,.18,.22),6)
    for row in range(3):
        y=22.3+row*4.6
        mass.box((-10,y,-2.8+.35*(row%2)),(12.6,4.4,.64),[2,9,5][row])
        supports.box((-10,y+2.23,-3.35),(13,.22,.36),6)
    for row in (0,5,10):
        y=row*1.65
        supports.box((-10,y,-3.4),(13,.36,.8),[2,6,9][row%3])
    brace_pairs=[((-16.3,0,-5.2),(-4.0,34,-4.0)),
                 ((-3.7,0,-5.2),(-16.1,34,-4.0)),
                 ((16.3,0,-5.2),(6,32,-3.7))]
    for base,top in brace_pairs:
        supports.tube(base,top,.32,6,8)
        supports.tube((base[0],base[1],base[2]+.65),
                      (top[0],top[1],top[2]+.65),.18,6,6)
    mass.box((-10,36,-2.6),(13,2.0,3),9)
    placements=[]
    for row in range(12):
        for col in range(2):
            source_index=2+(row+col)%2
            x=-13.0+col*5.6+(row%3-1)*.35
            y=row*1.65+.07
            z=-5.15-.18*((row+col)%3)
            height=1.05+.05*((row+col)%3)
            yaw=0 if (row+2*col)%5 else (-.32 if col else .27)
            body_tile=[0,4,5,2,13][(row+3*col)%5]
            crush=source_index==2 and (row+col)%4!=0
            placements.append((source_index,x,y,z,5.35,2.25,height,
                               (-.06 if row%2 else .04),yaw,body_tile,crush))
    # A detailed recognizable car at the grounded foot marks vehicle scale.
    placements.append((0,10,0,-5.25,5.5,2.3,1.06,.04,.12,0,False))
    for source_index,x,y,z,length,width,height,lean,yaw,body_tile,crush in placements:
        stamp_welded_car(cars,sources[source_index][0],x,y,z,length,width,height,lean,yaw,body_tile,crush)
    models=[mass.build('p2-section-mass',steel_material),
            supports.build('p2-section-supports',steel_material),
            cars.build('welded-car-hulks',hulk_material,recalculate_normals=False)]
    models[2]['sources']=[entry for _,entry in sources]
    models[2]['placedHulks']=len(placements)
    assert len(models[2].data.uv_layers)==1 and models[2].data.uv_layers[0].name=='Authored material islands'
    bpy.ops.object.select_all(action='DESELECT')
    for obj in models:obj.select_set(True)
    bpy.context.view_layer.objects.active=models[0]
    glb=proof_dir / 'section-probe.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
                              export_yup=True,export_animations=False,export_materials='EXPORT',export_extras=True)
    camera=stage();bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'
    for label,position,target in [('front',(0,19,-79),(0,17,0)),
                                  ('quarter',(35,21,-65),(0,17,0))]:
        camera.location=bv(position)
        camera.rotation_euler=(bv(target)-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32
        camera.data.lens=32/(2*math.tan(math.radians(37)/2))
        bpy.context.scene.render.filepath=str(proof_dir / f'section-probe-{label}.png')
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(proof_dir / 'section-probe.blend'))
    probe_manifest={'sources':[entry for _,entry in sources],
                    'placements':[dict(sourceIndex=i,x=x,y=y,z=z,length=length,width=width,
                                       heightScale=height,lean=lean,yaw=yaw,bodyTile=tile,crushSpoiler=crush)
                                  for i,x,y,z,length,width,height,lean,yaw,tile,crush in placements],
                    'bracePairs':brace_pairs,'trianglesByObject':{obj.name:sum(len(poly.vertices)-2 for poly in obj.data.polygons)
                                                                    for obj in models},
                    'glbSha256':digest(glb),'uvLayer':'Authored material islands'}
    (proof_dir / 'section-probe.json').write_text(json.dumps(probe_manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('RUSTWALL_P2_SECTION_PROBE '+json.dumps(probe_manifest))
    sys.exit(0)

if args.p2_hulk_probe:
    fresh();hulk_material=material('hulks');proof_dir=root / 'art-build/rustwall-p2'
    proof_dir.mkdir(parents=True,exist_ok=True)
    sources=[welded_car_template(path) for path in (
        'public/assets/models/classics/falcone_f42.glb',
        'public/assets/models/unlocks/banshee_muscle.glb')]
    proof=Geometry()
    for index,(template,_) in enumerate(sources):
        stamp_welded_car(proof,template,-4.0+8.0*index,0,-.15,5.4,2.2,.98,
                         -.06 if index else .05)
    model=proof.build('welded-car-hulks',hulk_material)
    model['sources']=[entry for _,entry in sources]
    model['placedHulks']=2
    assert len(model.data.uv_layers)==1 and model.data.uv_layers[0].name=='Authored material islands'
    bpy.ops.object.select_all(action='DESELECT');model.select_set(True)
    bpy.context.view_layer.objects.active=model
    glb=proof_dir / 'hulk-probe.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
                              export_yup=True,export_animations=False,export_materials='EXPORT',export_extras=True)
    camera=stage()
    bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'
    bpy.context.scene.render.resolution_x=1280;bpy.context.scene.render.resolution_y=720
    bpy.context.scene.render.resolution_percentage=100
    for label,position,target in [('front',(0,5,-22),(0,1,0)),
                                  ('quarter',(12,7,-19),(0,1,0))]:
        camera.location=bv(position)
        camera.rotation_euler=(bv(target)-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32
        camera.data.lens=32/(2*math.tan(math.radians(40)/2))
        bpy.context.scene.render.filepath=str(proof_dir / f'hulk-probe-{label}.png')
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(proof_dir / 'hulk-probe.blend'))
    probe_manifest={'sources':[entry for _,entry in sources],
                    'placedHulks':2,'triangles':sum(len(template) for template,_ in sources),
                    'glbSha256':digest(glb),'uvLayer':'Authored material islands',
                    'renderFrontSha256':digest(proof_dir / 'hulk-probe-front.png'),
                    'renderQuarterSha256':digest(proof_dir / 'hulk-probe-quarter.png')}
    (proof_dir / 'hulk-probe.json').write_text(json.dumps(probe_manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('RUSTWALL_P2_HULK_PROBE '+json.dumps(probe_manifest))
    sys.exit(0)


def shot(id,kind,position,target,fov,gate=0,crop=None,scale=None):
    return dict(id=id,kind=kind,cameraSpace='wash-module' if kind=='wash' else 'gate-local',
                camera=dict(position=position,target=target,verticalFov=fov,near=.1,width=1280,height=720),
                gateOpen=gate,moduleScale=scale,referenceCrop=crop)


captures=[
    shot('front','wall',[0,21,-95],[0,19,0],32,crop=[0,422,865,1024]),
    shot('depth','wall',[65,25,-90],[0,17,3],38,crop=[865,422,1536,1024]),
    shot('driver-approach','wall',[0,1.4,-90],[0,17,0],60,crop=[0,0,1536,422]),
    shot('open-gate','wall',[0,21,-95],[0,19,0],32,gate=1,crop=[0,422,865,1024]),
    shot('full-span','wall',[0,60,-320],[0,17,0],45,crop=[0,0,1536,422]),
    shot('wash-module','wash',[18,9,-26],[0,9,0],42,scale=[3.2,19,4.5]),
]
if args.p2:captures[-1]['comparisonScope']='source-module-vs-runtime-bank'
assets={};budgets={}
for kind,builder in [('wall',wall),('wash',wash)]:
    objects=builder();budgets[kind]=stats(objects)
    if kind=='wall':
        assert budgets[kind]['triangles']<=60000 and budgets[kind]['materialDraws']<=24,budgets[kind]
    else:assert budgets[kind]['triangles']==144
    export(objects,kind)
    assets[kind]=dict(path=glb_path(kind).relative_to(root).as_posix(),sha256=digest(glb_path(kind)))
    if args.skip_renders:continue
    camera=stage()
    for capture in captures:
        if capture['kind']!=kind:continue
        if kind=='wall':bpy.data.objects['gate-panel'].location=bv((0,7.25*capture['gateOpen'],0))
        else:objects[0].scale=(3.2,4.5,19)
        spec=capture['camera'];camera.location=bv(spec['position'])
        camera.rotation_euler=(bv(spec['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32
        camera.data.lens=32/(2*math.tan(math.radians(spec['verticalFov'])/2))
        camera.data.clip_start=spec['near'];camera.data.clip_end=2000
        path=shots/f"blender-{capture['id']}.png"
        bpy.context.scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
        capture['path']=path.relative_to(root).as_posix();capture['sha256']=digest(path)

reference='public/assets/reference/rustwall-gate.png'
manifest=dict(round=args.round,blender=bpy.app.version_string,seconds=time.perf_counter()-started,
              reference=dict(path=reference,sha256=digest(root/reference)),assets=assets,captures=captures,budgets=budgets,
              source=dict(path='tools/blender/rustwall.py',sha256=digest(Path(__file__))),
              dimensions=dict(coreWidth=420,coreHeight=35,gateWidth=9,gateHeight=7,gateLift=7.25,guardHeight=1.8),
              wash=dict(prototypeTriangles=144,observedBanks=179,observedTriangles=25776,
                        normalizedBounds=[[-1,0,-1],[1,1,1]],referenceNote='No wash close-up in reference; isolated module is a geometry review, actual course placement is captured separately.'))
if args.p2:
    context_path='public/assets/reference/wasteland-art-direction.png'
    manifest['phase']='EGG-02-P2'
    manifest['contextReference']=dict(path=context_path,sha256=digest(root/context_path),
                                      crop=[1010,15,1470,310],scope='environment-context')
(shots/'blender-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
print('RUSTWALL_RESULT '+json.dumps(dict(seconds=manifest['seconds'],budgets=budgets)))
