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
args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/rustwall'
blend_dir = root / 'art-build/rustwall'
def glb_path(kind):
    return out / f'{kind}.glb'
def blend_path(kind):
    return blend_dir / f'{kind}.blend'
def texture_path(name, label):
    return blend_dir / f'{name}-{label}.png'
shots = Path(os.environ.get('DUEL_EVIDENCE_DIR') or root / '.evidence' / date.today().isoformat() / 'rustwall' / f'round-{args.round}')
if not shots.is_absolute():
    shots = root / shots
if args.paths_only:
    print(json.dumps({'blend': [str(blend_path(kind)) for kind in ('wall', 'wash')],
                      'glb': [str(glb_path(kind)) for kind in ('wall', 'wash')],
                      'textures': [str(texture_path(name, label))
                                   for name in ('steel', 'hulks', 'details', 'rock')
                                   for label in (('color', 'surface', 'normal', 'emissive')
                                                 if name == 'details' else ('color', 'surface', 'normal'))],
                      'evidence': [str(shots)]}))
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
            pixels=pixels*(1-rust[:,:,None])+np.array((.25,.13,.06))*rust[:,:,None]
            edge=(xx<9)|(xx>247)|(yy<9)|(yy>247)
            pixels[edge]*=.54
            worn=((abs(xx-11)<1)|(abs(xx-245)<1)|(abs(yy-11)<1)|(abs(yy-245)<1))&(fine>.1)
            pixels[worn]=(.34,.33,.28)
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
        dy,dx = np.gradient(coarse*.12 + fine*.018)
        v = np.stack([-dx*3,-dy*3,np.ones_like(dx)],axis=-1)
        v /= np.linalg.norm(v,axis=-1,keepdims=True)
        normal[sl][:,:,:3] = v*.5+.5
        if name == 'details' and tile in [8,9]:
            emissive[sl][:,:,:3] = np.array(base)*(.6 if tile == 8 else 1)
    if name=='rock':
        # One continuous 1024 map for the complete rock, with winding strata.
        ry,rx=np.mgrid[:1024,:1024]
        ripple=np.sin(rx*.009)*13+np.sin(rx*.027+ry*.002)*4
        strata=np.sin((ry+ripple)*.075)*.026+np.sin((ry+ripple)*.022)*.027
        erosion=np.sin(rx*.038+np.sin(ry*.006)*.9)*.028
        grain=rng.uniform(-.045,.045,(1024,1024))
        rockheight=strata+erosion+grain
        color[:,:,:3]=np.array((.40,.31,.23))*(1+rockheight[:,:,None])
        bands=np.exp(-(np.sin((ry+ripple)*.038)/.055)**2)
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
    images = {}
    for label,pixels in [('color',color),('surface',orm),('normal',normal)]:
        image = bpy.data.images.new(f'{name}-{label}',1024,1024,alpha=True)
        if label != 'color': image.colorspace_settings.name = 'Non-Color'
        image.pixels.foreach_set(pixels.ravel())
        image.filepath_raw = str(texture_path(name, label))
        image.file_format = 'PNG'
        image.save(); image.pack(); images[label] = image
    if name == 'details':
        image = bpy.data.images.new('details-emissive',1024,1024,alpha=True)
        image.pixels.foreach_set(emissive.ravel())
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
    def build(self,name,mat):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(self.vertices,[],self.faces);mesh.update()
        uv=mesh.uv_layers.new(name='Authored material islands')
        for poly,coords in zip(mesh.polygons,self.uvs):
            for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=co
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


def wall():
    fresh();steel=material('steel');hulks=material('hulks');details=material('details')
    body,frames,wrecks,props,panel=Geometry(),Geometry(cap_tubes=False),Geometry(),Geometry(),Geometry()
    # Exact structural mass with a real empty 9 by 7 m passage all the way through.
    body.box((-107.25,17.5,4),(205.5,35,3),3)
    body.box((107.25,17.5,4),(205.5,35,3),3)
    body.box((0,21,4),(9,28,3),7)
    rng=np.random.default_rng(240923)
    # Thirty irregular bays; hulk stacks remain full human/vehicle scale.
    for bay in range(30):
        x=-203+bay*14
        if abs(x)<10:continue
        salvage=bay%3==1
        for row in range(6):
            yy=2.5+row*5.75
            if salvage and row>0:continue
            widths=[4.2,4.6,4.1]
            for col in range(3):
                cx=x+(col-1)*4.45;h=min(4.95+float(rng.uniform(-.3,.3)),2*yy,2*(35-yy))
                body.box((cx,yy,.38+float(rng.uniform(-.12,.12))),(widths[col],h,.35),int(rng.choice([0,1,2,4,8,9,10])))
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
                    car(wrecks,x+col*2.65+float(rng.uniform(-.5,.5)),yy+float(rng.uniform(-.45,.45)),.75+float(rng.uniform(-.3,.3)),int(rng.integers(0,7)),row+bay)
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
        for row in range(7):
            body.box((side*9.9,2.5+row*5,.54),(9.75,4.94,.42),[9,0,4,2,8,1,10][row])
        frames.tube((side*5.7,.3,-.02),(side*14,16.5,-.02),.13,5,4)
        frames.tube((side*14,17,-.02),(side*5.7,34.5,-.02),.13,5,4)
        frames.box((side*5.15,18,-.45),(1.3,36,1.5),6)
        frames.box((side*5.15,18,-1.25),(.28,36,.28),2)
        frames.tube((side*4.73,7,-1.05),(side*4.73,36,-1.05),.065,6)
    for row in range(5):body.box((0,10+row*5.5,1.65),(8.95,5.4,.45),[8,0,9,4,1][row])
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
    for yy in [8,13,19,25,31,34.5]:frames.box((0,yy,1.29),(8.9,.22,.3),5)
    for x in [-175,-119,-63,-21,21,77,133,189]:
        tower(frames,props,x,height=7 if abs(x)<80 else 5)
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
    objects=[body.build('wall-body',steel),frames.build('scaffold-steel',steel),wrecks.build('hulk-stacks',hulks),props.build('wall-details',details),panel.build('gate-panel',steel)]
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
    fresh();mat=material('rock');g=Geometry();rings=[]
    # 8 rings, 9 corners, 126 side triangles plus18 cap triangles =144.
    for row in range(8):
        y=[0,.13,.24,.38,.52,.67,.84,1][row];ring=[]
        for j in range(9):
            a=j*math.tau/9
            c,s=math.cos(a),math.sin(a)
            # Both exposed sides have staggered shelves and fractured ledges.
            ledge=[1,.84,.93,.70,.81,.64,.73,.55][row]
            width=ledge+.065*math.sin(j*2.7+row*.7)
            xx=math.copysign(abs(c)**.45,c)*width+.075*math.sin(row*1.7)
            zz=math.copysign(abs(s)**.23,s)*(.995-.025*math.sin(j+row)**2)
            yy=0 if row==0 else max(0,min(1,y*(.82+.17*(.5+.5*math.sin(j*2.2)))+.024*math.sin(row+j*1.7)))
            ring.append(g.vertex((max(-1,min(1,xx)),yy,zz)))
        rings.append(ring)
    for row in range(7):
        for j in range(9):
            k=(j+1)%9
            g.face([rings[row][j],rings[row][k],rings[row+1][k],rings[row+1][j]],0,
                   [(j/9,row/7),((j+1)/9,row/7),((j+1)/9,(row+1)/7),(j/9,(row+1)/7)],atlas=False)
    for ring,y in [(rings[0],0),(rings[-1],.90)]:
        mid=g.vertex((0,y,0))
        for j in range(9):g.face([mid,ring[j],ring[(j+1)%9]],2,[(.5,.5),(0,0),(1,0)])
    return [g.build('wash-rock-module',mat)]


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
(shots/'blender-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
print('RUSTWALL_RESULT '+json.dumps(dict(seconds=manifest['seconds'],budgets=budgets)))
