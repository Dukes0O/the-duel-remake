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
import os
import sys
import time
from datetime import date
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--round', type=int, required=True)
p.add_argument('--crew', default='all')
p.add_argument('--skip-renders', action='store_true')
p.add_argument('--paths-only', action='store_true')
p.add_argument('--p1-rook', action='store_true')
p.add_argument('--p2-rook', action='store_true')
p.add_argument('--output-dir')
p.add_argument('--p1-paint')
p.add_argument('--p1-paint-sha256')
p.add_argument('--p2-paint')
p.add_argument('--p2-paint-sha256')
args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
if args.p1_rook and args.p2_rook:
    p.error('P1 and P2 Rook modes are mutually exclusive')
proof_mode = args.p1_rook or args.p2_rook
if args.p2_rook and (args.p1_paint or args.p1_paint_sha256):
    p.error('P2 Rook cannot use P1 paint arguments')
if not args.p2_rook and (args.p2_paint or args.p2_paint_sha256):
    p.error('P2 paint arguments require --p2-rook')
source_json = root / 'tools/blender/first-person-p1-source.json'
p2_source_json = root / 'tools/blender/first-person-p2-source.json'
p2_source = None
if args.p2_rook:
    p2_source = json.loads(p2_source_json.read_text(encoding='utf-8'))
    parent = p2_source.get('parentRecipe', {})
    if (parent.get('path') != 'tools/blender/first-person-p1-source.json' or
        hashlib.sha256(source_json.read_bytes()).hexdigest() != parent.get('sha256')):
        p.error('P2 parent P1 source hash does not match')
paint_input = None
paint_path = args.p2_paint if args.p2_rook else args.p1_paint
paint_hash = args.p2_paint_sha256 if args.p2_rook else args.p1_paint_sha256
if paint_path or paint_hash or args.p2_rook:
    if not proof_mode or not paint_path or not paint_hash:
        p.error('Rook paint requires a matching explicit path and SHA-256')
    paint_input = Path(paint_path).resolve()
    ignored_paint = (root / ('art-build/first-person-p2' if args.p2_rook else 'art-build/first-person-p1')).resolve()
    original_paint = (Path.home() / '.codex/generated_images').resolve()
    if ignored_paint not in paint_input.parents and original_paint not in paint_input.parents:
        p.error('Rook paint must be an ignored art source or original generated image')
    if not paint_input.is_file():
        p.error('Rook paint source is missing')
    paint_bytes = paint_input.read_bytes()
    if hashlib.sha256(paint_bytes).hexdigest() != paint_hash.lower():
        p.error('Rook paint source SHA-256 mismatch')
    if (paint_bytes[:8] != b'\x89PNG\r\n\x1a\n' or
        int.from_bytes(paint_bytes[16:20], 'big') != 1254 or
        int.from_bytes(paint_bytes[20:24], 'big') != 1254 or
        paint_bytes[25] not in (2, 6)):
        p.error('Rook paint must be a 1254-square RGB/RGBA PNG triptych')
if proof_mode:
    if not args.output_dir:
        p.error('Rook proof requires --output-dir')
    candidate_dir = Path(args.output_dir).resolve()
    allowed = (root / ('art-build/first-person-p2' if args.p2_rook else 'art-build/first-person-p1')).resolve()
    if candidate_dir == allowed or allowed not in candidate_dir.parents:
        p.error('Rook output must be a child of its ignored art-build family')
    evidence_override = os.environ.get('DUEL_EVIDENCE_DIR')
    if evidence_override:
        evidence_target = Path(evidence_override).resolve()
        evidence_home = (root / '.evidence').resolve()
        if (candidate_dir not in evidence_target.parents and
            evidence_home not in evidence_target.parents):
            p.error('P1 Rook evidence must remain under candidate output or ignored .evidence')
    planned = {
        'mode': 'p2-rook' if args.p2_rook else 'p1-rook', 'outputDir': str(candidate_dir),
        'sourceJson': str(p2_source_json if args.p2_rook else source_json),
        'candidateGlb': str(candidate_dir / 'hands/rook.glb'),
        'candidateBlend': str(candidate_dir / 'hands/rook.blend'),
        'textures': {label: str(candidate_dir / 'hands' / f'rook-{label}.png')
                     for label in ('color', 'surface', 'normal')},
        'manifest': str(candidate_dir / 'manifest.json')
    }
    if args.paths_only:
        print(json.dumps(planned))
        sys.exit(0)
elif args.output_dir:
    p.error('--output-dir is only valid with a Rook proof mode')
out = root / 'public/assets/models/wasteland/first-person'
blend_dir = root / 'art-build/first-person'
crew_names = ('rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk')
selected_names = [name for name in crew_names if args.crew in ('all', name)]
def tool_glb(name):
    return (root / 'public/assets/models/wasteland/first-person' if proof_mode else out) / f'{name}.glb'
def tool_blend(name):
    return blend_dir / f'{name}.blend'
def hands_glb(name):
    return out / 'hands' / f'{name}.glb'
def hands_blend(name):
    return blend_dir / 'hands' / f'{name}.blend'
def tool_texture(name, label):
    return blend_dir / f'{name}-{label}.png'
def hands_texture(name, label):
    return blend_dir / 'hands' / f'{name}-{label}.png'
shots = Path(os.environ.get('DUEL_EVIDENCE_DIR') or
    (candidate_dir / 'evidence' if proof_mode else root / '.evidence' / date.today().isoformat() / 'first-person' / f'round-{args.round}'))
if not shots.is_absolute():
    shots = root / shots
if args.paths_only:
    print(json.dumps({'blend': [str(tool_blend(name)) for name in ('rpg', 'wrench')]
                               + [str(hands_blend(name)) for name in selected_names],
                      'glb': [str(tool_glb(name)) for name in ('rpg', 'wrench')]
                             + [str(hands_glb(name)) for name in selected_names],
                      'textures': [str(tool_texture(name, label)) for name in ('rpg', 'wrench')
                                   for label in ('color', 'surface', 'normal')]
                                  + [str(hands_texture(name, label)) for name in selected_names
                                     for label in ('color', 'surface', 'normal')],
                      'evidence': [str(shots)]}))
    sys.exit(0)

import bpy
import numpy as np
from mathutils import Vector, Matrix, Euler

if proof_mode:
    out = candidate_dir
    blend_dir = candidate_dir
    selected_names = ['rook']
    out.mkdir(parents=True, exist_ok=True)
else:
    out.mkdir(parents=True, exist_ok=True)
(out/'hands').mkdir(exist_ok=True)
blend_dir.mkdir(parents=True, exist_ok=True)
(blend_dir/'hands').mkdir(exist_ok=True)
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
    normal=np.ones_like(color);normal[:,:,0:2]=.5
    bases=[cfg['sleeve'],cfg['leather'],cfg['skin'],(.42,.38,.29),
           (.24,.27,.27),(.51,.29,.12),(.12,.105,.08),(.64,.58,.43),
           cfg['sleeve'],cfg['leather'],cfg['skin'],(.48,.46,.40),
           (.12,.14,.14),(.35,.21,.12),(.28,.27,.22),(.70,.63,.46)]
    if tool:
        bases[3]=(.13,.14,.14);bases[4]=(.075,.085,.085)
        bases[11]=(.34,.35,.33);bases[12]=(.018,.021,.020)
        bases[13]=(.23,.12,.055)
        bases[15]=(.53,.54,.51)
    else:
        bases[7]=tuple(min(.8,c*1.12+.02) for c in cfg['sleeve'])
        if proof_mode:
            # Exported glTF V directly addresses the saved PNG's bottom row.
            # Blender's image buffer is bottom-up, so the authored chart faces
            # sample buffer tiles 0/1/2/3 rather than the unused top row.
            bases[3]=(.56,.49,.36)  # padded beige wrist-wrap chart
            bases[14]=cfg['skin']  # preserve the prior protected top-row skin bytes
    yy,xx=np.mgrid[0:256,0:256]
    for tile,base in enumerate(bases):
        noise=rng.uniform(-1,1,(256,256))
        coarse=np.repeat(np.repeat(rng.uniform(-1,1,(16,16)),16,axis=0),16,axis=1)
        for _ in range(5):coarse=(coarse+np.roll(coarse,1,0)+np.roll(coarse,-1,0)+np.roll(coarse,1,1)+np.roll(coarse,-1,1))/5
        cloth=tile in ([0,8,7,12,15] if proof_mode else [0,8,7,15]) and not tool and name!='jax'
        grain=(np.sin(xx*2.7)*np.sin(yy*2.3))*.018 if cloth else 0
        variation=1+noise*.045+coarse*.13+grain
        if proof_mode and not tool and tile in (0,8,12):
            # Long shaded folds replace the evenly repeated bright sleeve dashes.
            valley=np.exp(-((xx-(86+28*np.sin(yy*.017)))/27)**2)
            variation=variation*(1-.16*valley)+.035*np.sin(yy*.022+xx*.013)
        if proof_mode and not tool and tile==13:
            panel=np.exp(-((xx-125-14*np.sin(yy*.012))/74)**4)
            variation*=1-.12*panel
        if proof_mode and not tool and tile==15:
            fibres=.025*np.sin(xx*.40+yy*.025)+.014*np.sin(xx*.91-yy*.019)
            weather=np.exp(-((yy-(96+24*np.sin(xx*.017)))/22)**2)
            variation=variation+fibres-.085*weather
        if tile in ([2,10,14] if proof_mode else [2,10]):variation=1+noise*.025+coarse*.065
        leather=tile in ([1,6,9,13] if proof_mode else [1,6,9])
        crease=np.zeros_like(noise)
        if leather:
            for row in [42,116,199]:crease+=np.exp(-((yy-row-np.sin(xx*.026+row)*11)/2.5)**2)
            variation-=crease*.12
        rgba=np.zeros((256,256,4),np.float32);rgba[:,:,:3]=np.array(base)[None,None,:]*variation[:,:,None];rgba[:,:,3]=1
        # Patina chips are localized clusters, not pale source-background streaks.
        worn=(coarse>.20)&(noise>.20)
        if tool or tile in ([3,4,5,11] if proof_mode else [3,4,5,11,12,13,14]):
            rgba[worn,:3]=np.array((.12,.13,.125) if tile in [0,8] else (.23,.15,.085))*(1+noise[worn,None]*.10)
            scratch=(noise>.94)&(coarse>.23)
            rgba[scratch,:3]=(.39,.40,.37)
            if tile==12:rgba[:,:,:3]=np.array(base)*(1+noise[:,:,None]*.02)
        if cloth and not (proof_mode and not tool and tile in (0,8,12)):
            seam=(abs(xx-16)<2)|(abs(xx-240)<2)
            stitch=seam&((yy%12)<5)
            rgba[stitch,:3]=np.array(base)*1.4
        y,x=divmod(tile,4);color[y*256:(y+1)*256,x*256:(x+1)*256]=np.clip(rgba,0,1)
        rough=.90 if cloth else (.82 if tile in ([1,2,6,9,10,13,14] if proof_mode else [1,2,6,9,10]) else .65)
        surface[y*256:(y+1)*256,x*256:(x+1)*256,1]=np.clip(rough+coarse*.13,.30,.98)
        surface[y*256:(y+1)*256,x*256:(x+1)*256,2]=.72 if tool and tile not in [1,6,9] else (.55 if tile in [3,11] else 0)
        height=noise*(.035 if cloth else .015)+grain*1.5-crease*.085
        if tile in ([2,10,14] if proof_mode else [2,10,12]):height*=.12
        dy,dx=np.gradient(height)
        vectors=np.stack([-dx*3,-dy*3,np.ones_like(dx)],axis=-1)
        vectors/=np.linalg.norm(vectors,axis=-1,keepdims=True)
        normal[y*256:(y+1)*256,x*256:(x+1)*256,:3]=vectors*.5+.5
    if proof_mode and name=='rook' and not tool and paint_input:
        authored=json.loads(source_json.read_text(encoding='utf-8'))
        source=bpy.data.images.load(str(paint_input),check_existing=False)
        source.colorspace_settings.name='Non-Color'
        source_pixels=np.empty(1254*1254*4,dtype=np.float32)
        source.pixels.foreach_get(source_pixels)
        source_pixels=np.flipud(source_pixels.reshape((1254,1254,4)))[:,:,:3]
        def box_filter(crop):
            scale=418/240
            horizontal=np.empty((418,240,3),dtype=np.float32)
            for column in range(240):
                left,right=column*scale,(column+1)*scale
                ids=np.arange(math.floor(left),math.ceil(right))
                weights=np.maximum(0,np.minimum(ids+1,right)-np.maximum(ids,left))/scale
                horizontal[:,column,:]=np.tensordot(crop[:,ids,:],weights,axes=(1,0))
            result=np.empty((240,240,3),dtype=np.float32)
            for row in range(240):
                top,bottom=row*scale,(row+1)*scale
                ids=np.arange(math.floor(top),math.ceil(bottom))
                weights=np.maximum(0,np.minimum(ids+1,bottom)-np.maximum(ids,top))/scale
                result[row,:,:]=np.tensordot(weights,horizontal[ids,:,:],axes=(0,0))
            return result
        for role,rect in authored['paintSource']['crops'].items():
            x0,y0,x1,y1=rect
            sample=box_filter(source_pixels[y0:y1,x0:x1,:])
            atlas_x={'cloth':8,'leather':264,'wrap':776}[role]
            # Blender's authored PNG buffer is written directly. Keep the
            # selected source's encoded channels; a transfer curve darkens it.
            dest=np.flipud(sample)
            color[8:248,atlas_x:atlas_x+240,:3]=dest
            luminance=np.mean(sample,axis=2)
            surface[8:248,atlas_x:atlas_x+240,1]=np.flipud(np.clip(
                {'cloth':.87,'leather':.78,'wrap':.92}[role]+(luminance-.35)*.12,.5,.98))
            height=np.flipud(luminance)
            dy,dx=np.gradient(height)
            vectors=np.stack([-dx*.65,-dy*.65,np.ones_like(dx)],axis=-1)
            vectors/=np.linalg.norm(vectors,axis=-1,keepdims=True)
            normal[8:248,atlas_x:atlas_x+240,:3]=vectors*.5+.5
        bpy.data.images.remove(source)
    images=[]
    for label,pixels in [('color',color),('surface',surface),('normal',normal)]:
        im=bpy.data.images.new(name+'-'+label,1024,1024,alpha=True)
        if label!='color':im.colorspace_settings.name='Non-Color'
        im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(folder/f'{name}-{label}.png');im.file_format='PNG';im.save();im.pack();images.append(im)
    mat=bpy.data.materials.new(name+' worn cloth leather and steel');mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
    c=nodes.new('ShaderNodeTexImage');c.image=images[0]
    s=nodes.new('ShaderNodeTexImage');s.image=images[1]
    split=nodes.new('ShaderNodeSeparateColor')
    links.new(c.outputs['Color'],bsdf.inputs['Base Color']);links.new(s.outputs['Color'],split.inputs['Color'])
    links.new(split.outputs['Green'],bsdf.inputs['Roughness']);links.new(split.outputs['Blue'],bsdf.inputs['Metallic'])
    n=nodes.new('ShaderNodeTexImage');n.image=images[2]
    normal_map=nodes.new('ShaderNodeNormalMap');normal_map.inputs['Strength'].default_value=.35
    links.new(n.outputs['Color'],normal_map.inputs['Color']);links.new(normal_map.outputs['Normal'],bsdf.inputs['Normal'])
    return mat

class Geometry:
    def __init__(self):self.vertices=[];self.faces=[];self.uvs=[];self.weights=[]
    def vertex(self,co,weights):
        self.vertices.append(bv(co));self.weights.append(weights);return len(self.vertices)-1
    def face(self,indices,tile,uv=None):
        self.faces.append(indices)
        if uv is None:uv=[(0,0),(1,0),(1,1),(0,1)][:len(indices)]
        if proof_mode and tile in (0,1,2,3):
            # The declared skin chart is itself inset 8px from the 256px tile.
            # Keep terminal seam vertices another 8px inside that chart.
            uv=[(.1+.8*u,.1+.8*v) for u,v in uv]
        tx,ty=tile%4,tile//4
        self.uvs.append([((tx+.04+u*.92)/4,(ty+.04+v*.92)/4) for u,v in uv])
    def loft(self,centres,radii,tile,bones,segments=12,axes=None,closed=True,warp=None,displace=None,ring_angles=None,
             cap_tile=None,cap_start=None,cap_end=None):
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
            angles=ring_angles(i,rx,ry) if ring_angles else [j*math.tau/segments for j in range(segments)]
            if len(angles)!=segments:raise ValueError('loft ring angle count changed')
            for j,theta in enumerate(angles):
                factor=warp(i,theta) if warp else 1
                radial=a*(math.cos(theta)*rx)+b*(math.sin(theta)*ry)
                point=(c+radial)*factor
                if displace:
                    delta=displace(i,theta)
                    if radial.length:point+=radial.normalized()*delta
                ring.append(self.vertex(point,bones[i]))
            rings.append(ring)
        for i in range(len(rings)-1):
            first,last=0,len(rings)-1
            if isinstance(tile,list):
                first=i;last=i+1
                while first>0 and tile[first-1]==tile[i]:first-=1
                while last<len(tile) and tile[last]==tile[i]:last+=1
            v0=(i-first)/(last-first);v1=(i+1-first)/(last-first)
            for j in range(segments):
                self.face([rings[i][j],rings[i][(j+1)%segments],rings[i+1][(j+1)%segments],rings[i+1][j]],
                    tile[i] if isinstance(tile,list) else tile,[(j/segments,v0),((j+1)/segments,v0),((j+1)/segments,v1),(j/segments,v1)])
        close_first=closed if cap_start is None else cap_start
        close_last=closed if cap_end is None else cap_end
        if close_first or close_last:
            ends=[]
            if close_first:ends.append((rings[0],centres[0],bones[0],True))
            if close_last:ends.append((rings[-1],centres[-1],bones[-1],False))
            for ring,centre,weight,flip in ends:
                mid=self.vertex(centre,weight)
                for j in range(segments):
                    ids=[mid,ring[j],ring[(j+1)%segments]]
                    self.face(ids[::-1] if flip else ids,(cap_tile if cap_tile is not None else
                        (tile[0] if isinstance(tile,list) else tile)),[(.5,.5),(0,0),(1,0)])
        return rings
    def box(self,centre,size,tile,bone='base'):
        c=Vector(centre);s=Vector(size)/2
        ids=[self.vertex(c+Vector((x*s.x,y*s.y,z*s.z)),{bone:1}) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:self.face([ids[i] for i in face],tile)
    def wrist_wrap(self,start,end,bone,side):
        """Three closed, thin cloth turns; skin and digit topology stay separate."""
        start,end=Vector(start),Vector(end)
        tangent=(end-start).normalized()
        across=tangent.cross(Vector((0,1,0))).normalized()
        up=tangent.cross(across).normalized()
        segments=10
        for turn,(lo,hi) in enumerate(((.04,.55),(.50,.96))):
            rings=[]
            for layer in (0,1):
                layer_rings=[]
                for row in range(2):
                    ring=[]
                    for j in range(segments):
                        theta=j*math.tau/segments
                        t=lo+(hi-lo)*row + .012*math.sin(theta*2+turn+side*.7)
                        centre=start.lerp(end,t)
                        base=.046*(1-t)+.041*t
                        radius=base+(.0025 if layer==0 else .0005)+turn*.0012
                        # A slanted hem and an unequal tucked fold avoid three torus bands.
                        radius+=.0012*math.sin(theta*3+turn*1.7)
                        point=centre+across*(math.cos(theta)*radius)+up*(math.sin(theta)*radius*.83)
                        ring.append(self.vertex(point,{bone:1}))
                    layer_rings.append(ring)
                rings.append(layer_rings)
            for layer in (0,1):
                for row in range(1):
                    for j in range(segments):
                        nxt=(j+1)%segments
                        quad=[rings[layer][row][j],rings[layer][row][nxt],
                              rings[layer][row+1][nxt],rings[layer][row+1][j]]
                        if layer:quad.reverse()
                        self.face(quad,3,[(j/segments,row),(nxt/segments,row),
                                          (nxt/segments,row+1),(j/segments,row+1)])
            for row in (0,1):
                for j in range(segments):
                    nxt=(j+1)%segments
                    quad=[rings[0][row][j],rings[1][row][j],
                          rings[1][row][nxt],rings[0][row][nxt]]
                    if row==0:quad.reverse()
                    self.face(quad,3)
    def close_palm_web(self,grip,bone):
        from collections import Counter
        counts=Counter()
        for face in self.faces:
            for a,b in zip(face,face[1:]+face[:1]):
                counts[tuple(sorted((a,b)))]+=1
        edges=[edge for edge,count in counts.items() if count==1]
        neighbors={}
        for a,b in edges:
            neighbors.setdefault(a,[]).append(b)
            neighbors.setdefault(b,[]).append(a)
        visited=set();closed=0
        for initial in neighbors:
            if initial in visited:continue
            loop=[];current=initial;previous=None
            while current not in visited:
                visited.add(current);loop.append(current)
                nexts=[item for item in neighbors[current] if item!=previous]
                if not nexts:break
                previous,current=current,nexts[0]
            if current!=initial or len(loop)!=10:continue
            center=sum((self.vertices[item] for item in loop),Vector())/len(loop)
            if (center-bv(grip)).length>.15:continue
            # A shallow curved web, using only boundary edges with one face.
            center.y+=.004
            middle=len(self.vertices);self.vertices.append(center);self.weights.append({bone:1})
            for a,b in zip(loop,loop[1:]+loop[:1]):
                self.face([a,b,middle],1)
            closed+=1
        return closed
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
            g.box((.057*math.cos(a),.16+.057*math.sin(a),zc),(.012,.012,.012),15)
        # Narrow rubbed edge, confined to the collar rather than the whole tube.
        g.loft([(0,.16,zc+.010),(0,.16,zc+.012)],[.0555,.0555],15,[{'base':1}]*2,20,
            axes=((1,0,0),(0,1,0)),closed=False)
    for zc in [0,-.34]:
        g.box((0,.105,zc),(.07,.035,.065),4)
        g.loft([(0,-.09,zc),(0,-.065,zc+.006),(0,.05,zc),(0,.09,zc)],[(.027,.023),(.029,.025),(.025,.023),(.027,.025)],1,[{'base':1}]*4,12,axes=((1,0,0),(0,0,1)))
        for yy in [-.07,-.045,-.02,.005,.03,.055]:
            g.loft([(0,yy-.002,zc),(0,yy+.002,zc)],[.027,.027],6,[{'base':1}]*2,12,axes=((1,0,0),(0,0,1)),closed=False)
    # Open trigger guard and separate trigger, plus two open iron sights.
    for centre,size in [((0,.055,-.06),(.009,.018,.08)),((0,-.012,-.093),(.009,.012,.045)),((0,.023,-.11),(.009,.075,.009)),((0,.045,-.061),(.006,.05,.008))]:g.box(centre,size,4)
    for zc in [.07,-.53]:
        g.box((0,.217,zc),(.073,.012,.027),4)
        for x in [-.029,.029]:g.box((x,.249,zc),(.008,.07,.014),3)
        g.box((0,.284,zc),(.066,.008,.014),15)
    r.loft([(0,.16,z) for z in [-.58,-.565,-.52,-.40,-.35,-.24,-.20]],
        [.003,.014,.033,.032,.015,.014,.014],14,[{'rocket':1}]*7,16,axes=((1,0,0),(0,1,0)))
    for x in [-1,1]:r.box((x*.024,.16,-.22),(.041,.008,.09),4,'rocket')
    r.box((0,.16,-.22),(.008,.066,.09),4,'rocket')
    return g,r

def wrench_geometry():
    g=Geometry()
    # Extruded open adjustable jaw, rather than a closed block around the opening.
    outlines=[([(-.030,-.14),(.030,-.14),(.029,-.10),(.023,.02),(.018,.13),(.028,.205),
        (-.026,.205),(-.018,.12),(-.023,.015),(-.029,-.10)],0),
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
    for path in [[(-.060,.335,.017),(-.069,.311,.017),(-.073,.282,.017)],
                 [(.037,.354,.017),(.033,.298,.017),(-.026,.285,.017)]]:
        g.loft(path,[.0018]*3,15,[{'base':1}]*3,5)
    g.box((.004,.226,.020),(.060,.044,.012),12)
    for yy in [.247,.259,.271]:g.box((.036,yy,.022),(.020,.006,.010),11)
    g.loft([(-.020,.226,.035),(.020,.226,.035)],[.017,.017],11,[{'base':1}]*2,16,axes=((0,1,0),(0,0,1)))
    for x in [-.016,-.008,0,.008,.016]:g.loft([(x-.0015,.226,.035),(x+.0015,.226,.035)],[.019,.019],4,[{'base':1}]*2,12,axes=((0,1,0),(0,0,1)))
    g.loft([(0,y,0) for y in [-.10,-.08,.04,.06]],[(.032,.022),(.034,.024),(.032,.024),(.028,.022)],1,[{'base':1}]*4,16,axes=((1,0,0),(0,0,1)))
    for y in np.linspace(-.085,.045,9):g.loft([(0,y-.002,0),(0,y+.002,0)],[(.034,.025)]*2,6,[{'base':1}]*2,12,axes=((1,0,0),(0,0,1)),closed=False)
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
    offset=Vector((-.065 if side=='R' else .065,.045,-.070))
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
    cfg=dict(sleeve=(.24,.33,.33) if name=='rpg' else (.43,.29,.105),leather=(.23,.16,.10),skin=(.30,.28,.22))
    mat=texture_material(name,cfg,blend_dir,True)
    rig=armature(name+' rig',[('base',(0,0,0),None)]+([('rocket',(0,0,0),'base')] if name=='rpg' else []))
    if name=='rpg':
        g,r=rpg_geometry();objects=[g.build('rpg-body',mat,rig,bevel=.002),r.build('loaded-rocket',mat,rig)]
        actions={'reload':add_action(rig,'reload',2.2,lambda phase:rocket_pose(rig,phase))}
    else:objects=[wrench_geometry().build('wrench-body',mat,rig,bevel=.0025)];actions={}
    export(rig,objects,tool_glb(name))
    bpy.ops.wm.save_as_mainfile(filepath=str(tool_blend(name)))
    return {'id':name,'triangles':sum(triangles(o) for o in objects),'draws':len(objects),
        'seconds':time.perf_counter()-started,'files':{p.name:digest(p) for p in [tool_glb(name),tool_blend(name),
            tool_texture(name, 'color'),tool_texture(name, 'surface'),tool_texture(name, 'normal')]}}

def triangles(obj):
    obj.data.calc_loop_triangles();return len(obj.data.loop_triangles)

def hand_geometry(name,cfg):
    g=Geometry();definitions=[('root',(0,0,0),None),('rpg-mount',RPG_GRIP,'root'),('wrench-mount',WRENCH_GRIP,'root')]
    p1 = proof_mode and name == 'rook'
    anatomy = json.loads(source_json.read_text(encoding='utf-8')) if p1 else None
    for side,sign,grip in [('R',1,RPG_GRIP),('L',-1,RPG_GRIP+Vector((0,0,-.34)))]:
        hand='wrist_'+side;s=cfg['scale']
        wrist=grip+Vector((sign*.065,-.045,.070))
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
            fold=(.006 if i%2==0 else -.003)*math.sin(t*math.pi) if t<sleeve_end and not p1 else 0
            centres.append(centre);radii.append(((base+fold)*s,(base*.82+fold*.7)*s))
            w=min(1,.25+t*.95);weights.append({hand:w,'root':1-w})
            tiles.append(0 if t<=sleeve_end and sleeve_end else 2)
        centres.extend([grip+Vector((sign*.053,-.020,.030)),grip+Vector((sign*.050,.006,.003)),grip+Vector((sign*.043,.027,-.014))])
        radii.extend([(.046*s,.034*s),(.061*s,.033*s),(.055*s,.028*s)])
        weights.extend([{hand:1}]*3);tiles.extend([1,1,1])
        def sleeve_folds(i,theta):
            if not 1<=i<=len(samples) or not sleeve_end or samples[i-1]>=sleeve_end:return 1
            return 1+.105*math.sin(theta*3+i*.83)+.04*math.sin(theta*5-i*.4)
        def authored_fold(i,theta):
            if not 1<=i<=len(samples):return 0
            t=samples[i-1]
            if t>=sleeve_end:return 0
            rx,ry=radii[i]
            # Loft axis a is authoring +Y and b is +X. The authored source
            # azimuth is measured from +X toward +Y, so raw theta is not it.
            physical_angle=math.atan2(math.cos(theta)*rx,math.sin(theta)*ry)
            result=0
            for fold_path in anatomy['sleeveFoldPaths'][side]:
                stations=fold_path['stations']
                if t<stations[0][0]-.07 or t>stations[-1][0]+.07:continue
                if t<=stations[0][0]:angle=stations[0][1]
                elif t>=stations[-1][0]:angle=stations[-1][1]
                else:
                    lower,upper=next((a,b) for a,b in zip(stations,stations[1:]) if a[0]<=t<=b[0])
                    amount=(t-lower[0])/(upper[0]-lower[0])
                    angle=lower[1]+amount*(upper[1]-lower[1])
                angle=math.radians(angle)
                distance=math.atan2(math.sin(physical_angle-angle),
                    math.cos(physical_angle-angle))*.043
                width=fold_path['widthMetres']
                crest=fold_path['crestMetres']*math.exp(-(distance/(width*.46))**2)
                trough=fold_path['troughMetres']*math.exp(-((abs(distance)-width*.72)/(width*.30))**2)
                edge=min(1,(t-stations[0][0]+.07)/.07,(stations[-1][0]+.07-t)/.07)
                result+=(crest+trough)*max(0,edge)
            return result
        def p2_value(values,t):
            nodes=p2_source['sleeves']['axialNodes']
            if t<=nodes[0]:return values[0]
            if t>=nodes[-1]:return values[-1]
            for k in range(len(nodes)-1):
                if nodes[k]<=t<=nodes[k+1]:
                    u=(t-nodes[k])/(nodes[k+1]-nodes[k])
                    u=u*u*(3-2*u)
                    return values[k]*(1-u)+values[k+1]*u
            raise ValueError('sleeve axial station outside authored interval')
        def p2_physical(theta,rx,ry):
            return math.degrees(math.atan2(math.cos(theta)*rx,math.sin(theta)*ry))
        def p2_seams(t):
            spec=p2_source['sleeves'][side]
            nodes=p2_source['sleeves']['axialNodes']
            def linear(values):
                if t<=nodes[0]:return values[0]
                if t>=nodes[-1]:return values[-1]
                for k in range(len(nodes)-1):
                    if nodes[k]<=t<=nodes[k+1]:
                        u=(t-nodes[k])/(nodes[k+1]-nodes[k])
                        return values[k]*(1-u)+values[k+1]*u
                raise ValueError('sleeve seam station outside authored interval')
            return (linear(spec['lowerSeamDegrees']),
                    linear(spec['upperSeamDegrees']))
        def p2_angles(i,rx,ry):
            if i<4 or i>8:return [j*math.tau/20 for j in range(20)]
            t=samples[i-1];lower,upper=p2_seams(t)
            boundary=[lower-20,lower,lower+20,upper-20,upper,upper+20]
            def theta_from_physical(deg):
                alpha=math.radians(deg)
                return math.atan2(math.cos(alpha)/ry,math.sin(alpha)/rx)%math.tau
            required=sorted(theta_from_physical(angle) for angle in boundary)
            lengths=[(required[(k+1)%6]-required[k])%math.tau for k in range(6)]
            desired=[14*length/math.tau for length in lengths]
            counts=[math.floor(value) for value in desired]
            for k in sorted(range(6),key=lambda x:desired[x]-counts[x],reverse=True)[:14-sum(counts)]:
                counts[k]+=1
            angles=[]
            for k,theta in enumerate(required):
                angles.append(theta)
                angles.extend((theta+lengths[k]*j/(counts[k]+1))%math.tau
                              for j in range(1,counts[k]+1))
            return sorted(angles)
        def p2_displace(i,theta):
            if i<4 or i>8:return authored_fold(i,theta)
            t=samples[i-1];rx,ry=radii[i]
            alpha=p2_physical(theta,rx,ry)
            lower,upper=p2_seams(t)
            distance=(alpha-lower)%360
            span=(upper-lower)%360
            falloff=p2_source['sleeves']['angularFalloffDegrees']
            def ramp(value):
                u=max(0,min(1,value/falloff))
                return u*u*(3-2*u)
            outer=p2_value(p2_source['sleeves'][side]['outerOffsetsMetres'],t)
            inner=p2_value(p2_source['sleeves']['undersideOffsetsMetres'],t)
            if distance<=span:
                result=outer*ramp(min(distance,span-distance))
            else:
                result=inner*ramp(min(distance-span,360-distance))
            seam_distance=min(distance,abs(distance-span),360-distance)
            half_width=p2_source['sleeves']['seamHalfWidthDegrees']
            if seam_distance<half_width:
                result+=p2_source['sleeves']['seamRidgeMetres']*(1-seam_distance/half_width)
            return result
        palm_rings=g.loft(centres,radii,tiles,weights,20 if p1 else 16,
            axes=((0,1,0),(1,0,0)),warp=None if p1 else sleeve_folds,
            displace=p2_displace if args.p2_rook else (authored_fold if p1 else None),
            ring_angles=p2_angles if args.p2_rook else None,closed=not p1)
        if sleeve_end:
            cuff=elbow.lerp(wrist,sleeve_end)+Vector((sign*.015*math.sin(sleeve_end*math.pi),.012*math.sin(sleeve_end*math.pi),0))
            radius=(.079*(1-sleeve_end)+.035*sleeve_end+.009*math.sin(sleeve_end*math.pi))*s
            tangent=(wrist-elbow).normalized()
            cw=min(1,.25+sleeve_end*.95)
            if not p1:
                g.loft([cuff-tangent*.015,cuff-tangent*.010,cuff+tangent*.007,cuff+tangent*.014],
                    [(radius+.003,radius*.82+.003),(radius+.006,radius*.82+.005),
                     (radius+.006,radius*.82+.005),(radius+.003,radius*.82+.002)],
                    7,[{hand:cw,'root':1-cw}]*4,16,
                    axes=((0,1,0),(1,0,0)),closed=False,warp=lambda i,a:1+.065*math.sin(a*3+i*.4))
        # Fitted glove cuff has open ends over the continuous wrist.
        g.loft([wrist+Vector((0,0,.012)),wrist-Vector((0,0,.010))],
            [(.041*s,.037*s)]*2,9,[{hand:1}]*2,16,axes=((0,1,0),(1,0,0)),closed=False)
        if p1:
            clothing=anatomy['clothing'][side]
            g.wrist_wrap(clothing['sleeveHem'],clothing['gloveEdge'],hand,sign)
        for digit,yy,length in [('index',.040,1.),('middle',.013,1.06),('ring',-.014,.99),('pinky',-.040,.84)]:
            angles=[0,.38,.82,1.26,1.72,2.22,2.60,2.80]
            path=[grip+Vector((sign*(.038*math.cos(a)),yy*s,-.006-.035*math.sin(a)*length)) for a in angles]
            labels=[f'finger_{digit}_{i}_{side}' for i in range(3)]
            for i,label in enumerate(labels):definitions.append((label,path[i*2],hand if i==0 else labels[i-1]))
            ws=[{labels[min(2,i//2)]:1} for i in range(len(path))]
            ws[1]={labels[0]:.5,labels[1]:.5};ws[3]={labels[1]:.5,labels[2]:.5}
            rr=[.014*s,.015*s,.0135*s,.013*s,.0115*s,.0105*s,.009*s,.004*s]
            # Fingerless glove ends reveal small natural fingertips, as on crew sheets.
            if p1:
                marks=anatomy['hands'][side]['landmarks']
                end=Vector(marks['fingertips'][digit]);penultimate=Vector(marks['distalStations'][digit][0])
                path[-2:]=[penultimate,end]
                path.append(end+(end-penultimate).normalized()*.003)
                rr[-2:]=[.007*s,.004*s];rr.append(.0015*s)
                ws[-2:]=[{labels[2]:1},{labels[2]:1}];ws.append({labels[2]:1})
                finger_tiles=[1,1,1,1,2,2,2,2]
                finger_rings=g.loft(path,rr,finger_tiles,ws,12,cap_tile=2,cap_start=False)
                # Broad palm/finger bridge is actual shared indexed geometry,
                # not a coincident decorative tube. The transition has a
                # finite four-face web around the proximal finger socket.
                palm=palm_rings[-1]
                root_ring=finger_rings[0]
                offset={'index':0,'middle':4,'ring':8,'pinky':12}[digit]
                for j in range(12):
                    a=palm[offset+j//3];b=palm[(offset+(j+1)//3)%20]
                    quad=[a,b,root_ring[(j+1)%12],root_ring[j]]
                    g.face(quad if a!=b else [a,root_ring[(j+1)%12],root_ring[j]],1)
            else:
                g.loft(path,rr,[1,1,1,1,1 if name in ['jax','cinder'] else 2,1 if name in ['jax','cinder'] else 2,1 if name in ['jax','cinder'] else 2],ws,12)
        path=[grip+Vector((sign*.048,-.036,.028)),grip+Vector((sign*.046,-.017,.036)),grip+Vector((sign*.026,.008,.039)),grip+Vector((sign*.007,.021,.023)),grip+Vector((sign*.002,.020,.018))]
        labels=[f'finger_thumb_{i}_{side}' for i in range(3)]
        for i,label in enumerate(labels):definitions.append((label,path[i],hand if i==0 else labels[i-1]))
        if p1:
            marks=anatomy['hands'][side]['landmarks']
            thumb_end=Vector(marks['thumbTip']);thumb_prev=Vector(marks['distalStations']['thumb'][0])
            path[-2:]=[thumb_prev,thumb_end]
            path.append(thumb_end+(thumb_end-thumb_prev).normalized()*.003)
            thumb_rings=g.loft(path,[.022*s,.020*s,.017*s,.011*s,.005*s,.0015*s],
                [1,1,1,2,2],[{labels[min(i,2)]:1} for i in range(6)],12,
                cap_tile=2,cap_start=False)
            palm=palm_rings[-1];root_ring=thumb_rings[0]
            for j in range(12):
                a=palm[16+j//3];b=palm[(16+(j+1)//3)%20]
                quad=[a,b,root_ring[(j+1)%12],root_ring[j]]
                g.face(quad if a!=b else [a,root_ring[(j+1)%12],root_ring[j]],1)
        else:
            g.loft(path,[.022*s,.020*s,.017*s,.012*s,.006*s],[1,1,1 if name in ['jax','cinder'] else 2,1 if name in ['jax','cinder'] else 2],[{labels[min(i,2)]:1} for i in range(5)],12)
        # Thenar pad rounds the thumb root into the palm instead of a thin stem.
        pad=grip+Vector((sign*.052,-.025,.027))
        g.loft([pad+Vector((0,-.013,0)),pad,pad+Vector((0,.015,0))],
            [.013*s,.020*s,.009*s],1,[{hand:1}]*3,8)
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
        if p1:
            if g.close_palm_web(grip,hand)!=1:
                raise RuntimeError(f'{side} expected one bounded palm web opening')
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
            if bone.name.startswith('finger_') and bone.name.endswith('_L'):
                bone.rotation_euler.y=-.20*max(0,1-abs(p-.14)/.12)-.12*max(0,1-abs(p-.91)/.09)
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
    bpy.ops.import_scene.gltf(filepath=str(tool_glb(name)))
    new=list(set(bpy.data.objects)-before)
    roots=[obj for obj in new if obj.parent is None]
    rig=next(obj for obj in new if obj.type=='ARMATURE')
    return new,roots,rig

def build_hands(name,cfg):
    started=time.perf_counter();scene=fresh()
    mat=texture_material(name,cfg,blend_dir/'hands')
    g,definitions=hand_geometry(name,cfg);rig=armature(name+' first-person hands',definitions)
    mesh=g.build(name+' sleeves gloves fingers',mat,rig)
    if proof_mode:
        marks=json.loads(source_json.read_text(encoding='utf-8'))['hands']
        regions={}
        for side in ('R','L'):
            points=marks[side]['landmarks']
            for label,key in [('palm','palm'),('thumbWeb','thumbWeb'),('thumbTip','thumbTip')]:
                regions[f'{side}:{label}']={'center':points[key],
                    'radiusMetres':.015 if label=='palm' else (.023 if label=='thumbWeb' else .012)}
            for digit in ('index','middle','ring','pinky'):
                regions[f'{side}:{digit}Tip']={'center':points['fingertips'][digit],'radiusMetres':.013}
            regions[f'{side}:cuffSeam']={'center':points['wrist'],'radiusMetres':.035}
        mesh['handRegions']=regions
    actions={label:add_action(rig,label,duration,lambda phase,label=label:hands_pose(rig,label,phase),32 if label=='repair' else 16) for label,duration in CLIPS.items()}
    export(rig,[mesh],hands_glb(name))
    camera_lights(scene)
    imported={tool:import_tool(tool) for tool in ['rpg','wrench']}
    captures=[]
    if not args.skip_renders:
        samples=[('idle',.25,'rpg'),('wrench-idle',.25,'wrench')]
        if name=='rook':samples += [('aim',.25,'rpg'),('fire',.10,'rpg'),('reload',1.1,'rpg'),('reload',1.65,'rpg'),('aim-reload',1.1,'rpg')]
        if proof_mode and name=='rook':samples += [('repair',1.12,'wrench')]
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
    bpy.ops.wm.save_as_mainfile(filepath=str(hands_blend(name)))
    source=root/f'public/assets/reference/wasteland-crew-{cfg["sheet"]}.png'
    report=dict(id=name,triangles=triangles(mesh),draws=1,seconds=time.perf_counter()-started,clips=CLIPS,
        reference=dict(path=source.relative_to(root).as_posix(),sha256=digest(source),crop=cfg['crop']),
        files={p.name:digest(p) for p in [hands_glb(name),hands_blend(name),
            hands_texture(name, 'color'),hands_texture(name, 'surface'),hands_texture(name, 'normal')]},captures=captures)
    if proof_mode: report['regions']=regions
    (shots/f'blender-{name}.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8',newline='\n')
    print('HANDS_ASSET '+json.dumps({'id':name,'triangles':report['triangles'],'seconds':report['seconds']}),flush=True)
    return report

started=time.perf_counter()
tools=[] if proof_mode else [build_tool(name) for name in ['rpg','wrench']]
hands=[build_hands(name,CREW[name]) for name in selected_names]
if proof_mode:
    anatomy=json.loads(source_json.read_text(encoding='utf-8'))
    def rel(path):return Path(path).relative_to(root).as_posix()
    paths=[hands_texture('rook',kind) for kind in ('color','surface','normal')]
    textures={kind:{'path':rel(path),'sha256':digest(path)}
              for kind,path in zip(('color','surface','normal'),paths)}
    asset=hands_glb('rook')
    proof=dict(schemaVersion=1,mode='p2-rook' if args.p2_rook else 'p1-rook',
        source=dict(path=rel(p2_source_json if args.p2_rook else source_json),
            sha256=digest(p2_source_json if args.p2_rook else source_json),
            referencePath=anatomy['reference']['path'],
            referenceSha256=anatomy['reference']['sha256'],
            rpgArmReferencePath=anatomy['rpgArmReference']['path'],
            rpgArmReferenceSha256=anatomy['rpgArmReference']['sha256']),
        asset=dict(path=rel(asset),sha256=digest(asset),
            triangles=hands[0]['triangles'],draws=1,
            textureBytes=sum(path.stat().st_size for path in paths)),
        textures=textures,regions=hands[0]['regions'],
        charts=anatomy['atlas'],clips=CLIPS,
        sockets={'rpg-mount':list(RPG_GRIP),'wrench-mount':list(WRENCH_GRIP)},
        captures=hands[0]['captures'])
    if paint_input:
        paint_contract=anatomy['paintSource']
        proof['paintSource']=dict(path=str(paint_input),sha256=paint_hash.lower(),
            crops=paint_contract['crops'],method=paint_contract['method'],
            selectedArtwork=paint_hash.lower()==paint_contract['selectedSha256'])
    if args.p2_rook:
        proof['parentRecipe']=p2_source['parentRecipe']
        proof['sleeves']=p2_source['sleeves']
    (candidate_dir/'manifest.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8',newline='\n')
    review=dict(family='first-person-p2' if args.p2_rook else 'first-person-p1',round=args.round,
        scope='Blender source module at authored camera',candidateSha256=digest(asset),
        camera=dict(position=[0,0,0],target=[0,0,-1],verticalFov=72,near=.15,width=1280,height=720),
        references=dict(crew=anatomy['reference'],rpgArm=anatomy['rpgArmReference']),
        tools={name:dict(path=rel(tool_glb(name)),sha256=digest(tool_glb(name)))
               for name in ('rpg','wrench')},
        captures=[{**entry,'scope':'Blender source module'} for entry in hands[0]['captures']])
    (shots/'blender-manifest.json').write_text(json.dumps(review,indent=2)+'\n',
        encoding='utf-8',newline='\n')
    print('GFX-02-P2 ROOK PROOF COMPLETE' if args.p2_rook else 'GFX-02-P1 ROOK PROOF COMPLETE',flush=True)
    sys.exit(0)
manifest=dict(round=args.round,blender=bpy.app.version_string,seconds=time.perf_counter()-started,
    command='blender -b --python tools/blender/first-person-gear.py -- --root REPO --round '+str(args.round)+' --crew '+args.crew,
    scriptSha256=digest(__file__),axis='Camera-local glTF: +X right, +Y up, -Z forward. Identity camera attachment; socket axes identity in rest pose.',
    camera=dict(position=[0,0,0],target=[0,0,-1],verticalFov=72,near=.15,width=1280,height=720),
    materials='Authored padded 1024 islands for cloth, leather, skin and steel; seeded grain and localized wear. No reference image projection. Original sheets untouched.',
    tools=tools,hands=hands,toolReferences=[dict(path='public/assets/reference/wasteland-'+name+'.png',sha256=digest(root/'public/assets/reference'/('wasteland-'+name+'.png'))) for name in ['rpg','wrench']])
(shots/'blender-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
print('GFX-02 FIRST PERSON EXPORT COMPLETE',flush=True)
