"""Build the Bowl's welded tyrannosaur in metres, Y up and nose towards +Z.

Run the recipe inside Blender with --root . to export and render. Then run
python tools/blender/bowl-scrapasaurus.py --root . --sheet-only to lay out
the Blender views beside the generated welded reference and the pictures taken
in the game (BOWL-REX-LOOK, files .qa-dist/rex/game-*.png).

Round 7 (BOWL-REX-LOOK): the panels are photographed painted steel recoloured
into the reference's colours, each with a bare steel edge, rust and dents; the
shins are as thick as the reference's; the plinth and rails are gone; the
battery boxes sit down in tubs strapped to the ribs; the torn leads are thick,
bright copper and hidden until their box is out. The hook's eye stays at the
height the fight aims at (`eyePoint` in src/bowl/bowl-hook.js: 10.52 m).
"""
import argparse
import json
import math
import random
import struct
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=7, choices=[7])
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--skip-renders', action='store_true')
parser.add_argument('--sheet-only', action='store_true')
parser.add_argument('--clay-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
blend = root / 'art-build/bowl-scrapasaurus/scrapasaurus.blend'
output = root / 'public/assets/models/wasteland/bowl/scrapasaurus.glb'
sheet = root / 'docs/board/looks/bowl-rex/round-7.jpg'
evidence = root / '.qa-dist/rex'
if args.paths_only:
    print(json.dumps(dict(blend=[str(blend)], glb=[str(output)], evidence=[str(evidence/'clay.png')], summary=[str(sheet)])))
    raise SystemExit

if args.sheet_only:
    from io import BytesIO
    import subprocess
    from PIL import Image, ImageDraw, ImageFont
    photo_blob='77ba0483c7363b03ba8bb63352c23ae7794f9cf1'
    previous=subprocess.run(['git','cat-file','blob',photo_blob],cwd=root,capture_output=True)
    if previous.returncode==0:
        reference=Image.open(BytesIO(previous.stdout)).crop((0,60,560,375))
    else:
        reference=Image.open(root/'docs/board/looks/bowl-art-rex/round-6.jpg').crop((0,32,560,355))
    panels=[('Welded sculpture reference',reference)]
    for title,name in [('Round 7 beside the Titan','side'),('Tired, from behind','tired'),
                       ('Box in its tub, strapped to the ribs','closed'),('Box out: torn leads','socket')]:
        panels.append((title,Image.open(evidence/(name+'.png'))))
    # The fight's moments, taken in the game from the driver's seat (BOWL-REX-LOOK).
    for title,name in [('Game: out of the gate beside the truck','game-gate'),('Game: the tell, chest glowing','game-tell'),
                       ('Game: its fire on the orange','game-fire'),('Game: tired, steam and the beam','game-tired-near'),
                       ('Game: cable tight on the last box','game-pull-3'),
                       ('Game, looking back: down, the last box dragged','game-look-2.2')]:
        path=evidence/(name+'.png')
        if path.exists(): panels.append((title,Image.open(path)))
    columns=3; rows=(len(panels)+columns-1)//columns
    canvas=Image.new('RGB',(1680,355*rows),'#252927')
    draw=ImageDraw.Draw(canvas)
    font=ImageFont.truetype('arial.ttf',19)
    for i,(title,tile) in enumerate(panels):
        x=(i%columns)*560; y=(i//columns)*355
        draw.text((x+12,y+5),title,fill='#ede6d8',font=font)
        tile=tile.convert('RGB')
        scale=max(560/tile.width,323/tile.height)
        tile=tile.resize((round(tile.width*scale),round(tile.height*scale)))
        left=(tile.width-560)//2; top=(tile.height-323)//2
        canvas.paste(tile.crop((left,top,left+560,top+323)),(x,y+32))
    sheet.parent.mkdir(parents=True,exist_ok=True)
    for quality in (86,80,75,70,64):
        canvas.save(sheet,quality=quality,optimize=True)
        if sheet.stat().st_size<=500000: break
    raise SystemExit

import bpy
from mathutils import Vector, Matrix
from math import sin, cos, pi
sys.path.insert(0, str(Path(__file__).resolve().parent))
from photo_model import Photo

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rng = random.Random(553)
evidence.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)

# Scablands art keeps metal at .2 or less (docs/ART_LINE.md, "Placement and export"): the sheen comes from a low
# roughness, so painted steel catches the arena lights without drawing black where no sky is reflected.
def mat(name, color, metal=.2, rough=.5):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color,1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color,1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    return m

def glowing(m, color, strength):
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Emission Color'].default_value=(*color,1)
    bs.inputs['Emission Strength'].default_value=strength
    return m

oxide = mat('Pitted steel', (.13,.067,.039), .1, .8)
clay = mat('Unpainted clay', (.48,.48,.47),0)
paint = [mat(n,c,.2,.42) for n,c in [('Oxblood',(.39,.083,.053)),('Petrol blue',(.075,.175,.235)),('Mustard',(.51,.285,.074)),('Primer',(.19,.21,.19)),('Old ivory',(.54,.47,.32)),('Burnt umber',(.24,.11,.047))]]
iron = mat('Worn steel',(.235,.22,.18),.2,.45)
rubber = mat('Tyre rubber',(.031,.032,.028),.05,.85)
glass = mat('Dusty glazing',(.056,.102,.105),.1,.3)
hazard = mat('Industrial amber',(.93,.49,.028),.1,.5)
lamp = glowing(mat('Lit headlamp',(.95,.82,.49)),(1,.72,.28),2)
panels = mat('Welded painted panels',(1,1,1),.2,.4)
insulation = mat('Red lead insulation',(.42,.035,.025),.05,.55)
copper = glowing(mat('Bright torn copper',(.95,.5,.2),.2,.3),(1,.48,.12),4)

# Photographed surfaces (docs/ART_LINE.md, the method, step 4). The paint and rust come from photos already in the
# game: flaking paint over rust (`longhaul-rusted-paint`, `dam-rust`), deep rust (`oily-rust`) and milled plate
# (`plate-steel-mill`). Each photo's own flaking pattern is kept and only its paint is recoloured into the welded
# reference's colours. Every tile has a bare, bright steel edge and a dark weld seam, so a panel's border reads as cut
# and worn steel from the truck. A panel's UVs fill one tile, so the edge lands on the panel's own edge.
import numpy as np
textures = root/'public/assets/models/wasteland'
def photo_rgb(name):
    return Photo(textures/name).rgb().astype(np.float32)
flaking=[photo_rgb('cars/textures/longhaul-rusted-paint.jpg'), photo_rgb('scablands/textures/dam-rust.jpg')]
deep_rust=photo_rgb('cars/textures/oily-rust.jpg')
milled=photo_rgb('town/textures/plate-steel-mill.jpg')
grain=photo_rgb('cars/textures/faded-paint-rust.jpg').mean(axis=2)
tile_px=256
texture_rng=np.random.default_rng(707)
def crop(picture, size=tile_px):
    h,w=picture.shape[:2]
    span=int(texture_rng.integers(int(min(h,w)*.42),int(min(h,w)*.62)))
    y=int(texture_rng.integers(0,h-span)); x=int(texture_rng.integers(0,w-span))
    rows=(y+np.arange(size)*span/size).astype(int); cols=(x+np.arange(size)*span/size).astype(int)
    out=picture[rows][:,cols]
    for _ in range(int(texture_rng.integers(0,4))): out=np.rot90(out)
    return out.copy()

def paint_tile(colour, kind, wear=.5, edge=True):
    """One painted steel panel in sRGB 0-255: the photo's paint recoloured, its rust kept, a bare edge if asked."""
    source=crop(flaking[kind])
    r,g,b=source[...,0],source[...,1],source[...,2]
    lum=source.mean(axis=2)
    # Where the photo still has paint: pale yellow on the trailer, blue-grey on the dam plate.
    painted=np.clip((lum-88)/42,0,1) if kind==0 else np.clip((b-r+18)/26,0,1)
    painted=np.clip(painted*(1.55-wear*.6)+(.52-wear*.42),0,1)
    detail=lum/max(lum[painted>.5].mean() if (painted>.5).any() else lum.mean(),1)
    coat=np.asarray(colour,np.float32)*np.clip(.72+.42*(detail-1)+.28,.55,1.25)[...,None]
    rust=crop(deep_rust)*.82
    rgb=coat*painted[...,None]+rust*(1-painted[...,None])
    if edge:
        yy,xx=np.mgrid[0:tile_px,0:tile_px]
        border=np.minimum(np.minimum(xx,yy),np.minimum(tile_px-1-xx,tile_px-1-yy)).astype(np.float32)
        ragged=crop(grain[...,None])[...,0]
        width=5+8*np.clip((ragged-ragged.min())/max(np.ptp(ragged),1),0,1)
        steel=crop(milled)*1.12+6
        halo=np.clip(1-(border-width)/7,0,1)*(border>=width)
        rgb=rgb*(1-.55*halo[...,None])+rust*.7*.55*halo[...,None]
        bare=(border<width)[...,None]
        rgb=np.where(bare,steel,rgb)
        rgb=np.where((border<2.2)[...,None],rgb*.25,rgb)
    return np.clip(rgb,0,255)

# The reference's colours, a little greyed by sun and dust (sRGB).
palette=[(150,52,40),(166,74,56),(128,40,34),(54,88,110),(72,100,118),(48,74,86),(192,142,58),(176,128,62),
         (204,190,152),(186,170,128),(98,104,92),(84,92,86),(118,64,38),(66,104,98),(160,92,52),(140,136,126)]
atlas_tiles=4
atlas=np.zeros((tile_px*atlas_tiles,tile_px*atlas_tiles,3),np.float32)
for index,colour in enumerate(palette):
    y,x=divmod(index,atlas_tiles)
    atlas[y*tile_px:(y+1)*tile_px,x*tile_px:(x+1)*tile_px]=paint_tile(colour,index%2,wear=.2+.5*((index*.37)%1))

def image_from(name, rgb):
    h,w=rgb.shape[:2]
    image=bpy.data.images.new(name,width=w,height=h)
    rgba=np.ones((h,w,4),np.float32)
    rgba[...,:3]=rgb[::-1]/255
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    return image

def textured(m, image):
    node=m.node_tree.nodes.new('ShaderNodeTexImage'); node.image=image
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

textured(panels,image_from('Welded painted panels',atlas))
# Parts with their own colour (doors, brows, bonnets) wear one plain tile of the same photographed paint, no edge.
for m,colour,kind in zip(paint,[palette[0],palette[3],palette[6],palette[10],palette[8],palette[12]],[0,1,0,1,0,1]):
    textured(m,image_from(m.name+' photographed paint',paint_tile(colour,kind,.35,edge=False)))
textured(oxide,image_from('Pitted steel photographed rust',crop(deep_rust)*.62))
textured(iron,image_from('Worn steel photographed plate',np.clip(crop(milled)*.78,0,255)))
textured(hazard,image_from('Industrial amber photographed paint',paint_tile((236,172,32),0,.15,edge=False)))

def group(name, parent=None, origin=(0,0,0)):
    obj=bpy.data.objects.new(name,None)
    scene.collection.objects.link(obj)
    obj.parent=parent
    obj.location=origin
    return obj

asset=group('scrapasaurus-root')
body=group('thorax',asset)
tail=group('scrapasaurus-tail',body,(0,7,-2.6))
neck=group('folding-neck',body,(0,7.7,2.35))
jaw=group('scrapasaurus-jaw',neck,(0,1.65,2.05))
legs=group('crouching-haunches',asset)
def mesh(name, verts, faces, material, parent):
    data=bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces)
    data.materials.append(material)
    data.update()
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.parent=parent
    return obj

# Each section has a centre, half-width and depth perpendicular to the spine.
# Smooth subdivided rings carry the volume continuously through the bent limbs.
forms=[]
def loft(name, sections, parent, limb=False):
    verts=[]
    for x,y,z,w,d in sections:
        for i in range(12):
            a=i*2*pi/12
            verts.append((x+w*cos(a),y if limb else y+d*sin(a),z+d*sin(a) if limb else z))
    faces=[tuple(reversed(range(12)))]
    for j in range(len(sections)-1):
        for k in range(12):
            a=12*j+k; b=12*j+(k+1)%12
            faces.append((a,b,b+12,a+12))
    faces.append(tuple(range(len(verts)-12,len(verts))))
    obj=mesh(name,verts,faces,oxide,parent)
    mod=obj.modifiers.new('Cast shell','SUBSURF'); mod.levels=2
    for f in obj.data.polygons: f.use_smooth=True
    forms.append((obj,sections,limb))
    return obj

loft('Deep ribcage',[(0,7,-3.8,1.35,1.25),(0,7,-2.8,2.35,1.85),(0,7.05,-1.4,2.7,2.25),(0,7.1,.7,2.55,2.25),(0,7.45,2.1,2.15,1.87),(0,7.9,3.2,1.32,1.25)],body)
loft('Counterweight',[(0,-1.65,-10,.09,.11),(0,-1.45,-8.9,.27,.24),(0,-1.35,-7.2,.53,.43),(0,-1.18,-5.2,.76,.67),(0,-.78,-3.2,1.12,.88),(0,-.35,-1.55,1.47,1.15),(0,0,.45,1.85,1.48)],tail)
loft('Sinewed neck',[(0,0,-.35,1.54,1.45),(0,.4,.48,1.37,1.32),(0,1.03,1.18,1.08,1.16),(0,1.85,1.64,.98,1.2),(0,2.2,2.53,1.12,1)],neck)
loft('Deep skull',[(0,2.08,1.65,.83,.84),(0,2.4,2.19,1.25,1.24),(0,2.65,2.9,1.4,1.19),(0,2.71,3.55,1.30,.89),(0,2.6,4.15,1.04,.67),(0,2.58,5.11,.91,.59),(0,2.54,5.42,.74,.48)],neck)
loft('Mandible',[(0,.19,-.2,.83,.48),(0,.08,.35,1.13,.49),(0,-.22,1.1,.94,.39),(0,-.48,1.95,.68,.27),(0,-.53,2.72,.62,.22),(0,-.45,3.02,.48,.19)],jaw)
for side in (-1,1):
    s=side
    dz=.65*s
    # Shins as thick as the welded reference's (BOWL-REX-LOOK): about two thirds of the thigh all the way down to
    # the ankle, still inside the fight's shin solid (1.48 m wide in rexSolids).
    loft('Hind leg',[(s*1.79,8.5,-1.85,.49,.64),(s*1.83,7.75,-1.6,1.16,1.54),(s*1.93,6.55,-1.33,1.23,1.67),(s*1.91,5.24,-.79+.25*dz,.98,1.3),(s*1.9,4.16,-.32+dz,.80,.95),(s*1.91,3.57,-.71+dz,.74,.86),(s*1.93,2.47,-1.75+dz,.66,.76),(s*1.95,1.84,-2.04+dz,.60,.68),(s*1.97,.55,-1.68+dz,.56,.56)],legs,True)
    for digit in (-1,0,1):
        loft('Car-front toe',[(s*1.97,.49,-1.99+dz,.42,.40),(s*1.97+digit*.26,.46,-1.4+dz,.46,.36),(s*1.97+digit*.58,.32,-.68+dz,.37,.27),(s*1.97+digit*.84,.2,-.11+dz-.32*abs(digit),.09,.11)],legs)
    loft('Little forelimb',[(s*1.6,7.45,2.02,.43,.44),(s*1.69,7,2.57,.34,.38),(s*1.66,6.42,2.3,.24,.24),(s*1.72,6.13,2.82,.15,.16),(s*1.73,5.94,3.10,.075,.085)],body,True)

def aim(pos,target):
    direction=(Vector(target)-Vector(pos)).normalized()
    up=Vector((0,1,0)) if abs(direction.y)<.995 else Vector((0,0,-1))
    right=direction.cross(up).normalized()
    return Matrix((right,right.cross(direction),-direction)).transposed().to_euler()

bpy.ops.object.camera_add()
cam=bpy.context.object
scene.camera=cam
cam.data.type='ORTHO'
scene.render.engine='BLENDER_WORKBENCH'
display=scene.display.shading
display.light='STUDIO'
display.studio_light='paint.sl'
display.color_type='MATERIAL'
display.show_shadows=True
display.show_cavity=True
display.cavity_type='WORLD'
display.background_type='WORLD'
scene.world=bpy.data.worlds.new('Daylight')
scene.world.color=(.43,.46,.47)
scene.render.resolution_x=780
scene.render.resolution_y=450
scene.render.resolution_percentage=100
def render(name,pos,target,span):
    cam.location=pos
    cam.rotation_euler=aim(pos,target)
    cam.data.ortho_scale=span
    scene.render.filepath=str(evidence/(name+'.png'))
    bpy.ops.render.render(write_still=True)

if not args.skip_renders:
    display.color_type='SINGLE'; display.single_color=(.64,.64,.61)
    render('clay',(30,8,5),(0,5.6,-2.5),24.5)
    display.color_type='MATERIAL'
if args.clay_only: raise SystemExit


def solid(name,center,size,material,parent):
    x,y,z=center
    verts=[(x+dx*size[0]/2,y+dy*size[1]/2,z+dz*size[2]/2)
           for dz in (-1,1) for dy in (-1,1) for dx in (-1,1)]
    return mesh(name,verts,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],material,parent)

def tube(name,a,b,r1,r2,material,parent,count=10):
    direction=(Vector(b)-Vector(a)).normalized()
    normal=direction.cross(Vector((0,0,1)) if abs(direction.z)<.9 else Vector((1,0,0))).normalized()
    second=direction.cross(normal)
    verts=[Vector(end)+r*(normal*cos(2*pi*i/count)+second*sin(2*pi*i/count))
           for end,r in ((a,r1),(b,r2)) for i in range(count)]
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]
    faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
    return mesh(name,verts,faces,material,parent)

# Folded door skins sit proud of the rust shell. Offset the seams from ring to
# ring and leave torn corners and patches of exposed primer between the hoods.
# Round 7: each panel is dented (a ring of points pushed in and out between its rim and its centre, drawn with flat
# faces so the dents catch the light) and its UVs fill one photographed tile, so the tile's bare steel edge and weld
# seam fall on the panel's own edge.
skinned=[]
# Tiles by colour family in the atlas: reds 0-2 and 14, blues 3-5 and 13, mustards 6-7, ivories 8-9, primers 10-11
# and 15, umber 12. The weights follow the reference: mostly red, blue and ivory, some mustard, little primer.
tile_weights=[4,3,3,3,3,2,2,2,3,2,1,1,2,1,2,1]
for obj,sections,limb in forms:
    if 'toe' in obj.name or 'forelimb' in obj.name: continue
    verts=[]; faces=[]; indices=[]; uvs=[]
    materials=[panels,oxide,iron,glass]
    def patch(points,material,coords):
        start=len(verts)
        verts.extend(points)
        faces.append(tuple(range(start,start+len(points))))
        indices.append(material)
        uvs.append(coords)
    for j,(a,b) in enumerate(zip(sections,sections[1:])):
        count=8 if 'skull' in obj.name.lower() or 'Mandible' in obj.name else 10
        for i in range(count):
            phase=(i+.21*(j%2))*2*pi/count
            angle=2*pi/count
            def skin(t,u,lift=.02):
                x,y,z,w,d=[v+(q-v)*t for v,q in zip(a,b)]
                c,s=cos(phase+u*angle),sin(phase+u*angle)
                return (x+(w+lift)*c, y if limb else y+(d+lift)*s,
                        z+(d+lift)*s if limb else z)
            tile=rng.choices(range(16),tile_weights)[0]
            ty,tx=divmod(tile,atlas_tiles)
            def tile_uv(t,u):
                # Panel rows run top to bottom of the picture, so v is flipped against Blender's upward v.
                return ((tx+min(max(u,0),1))/atlas_tiles, 1-(ty+min(max(t,0),1))/atlas_tiles)
            low=rng.uniform(.015,.085)
            high=rng.uniform(.90,.98)
            rim=[(.015,low+.07),(.08,low),(.935,low+.03),(.986,.13+low),
                 (.974,high-.055),(.90,high),(.10,high-.015),(.032,high-.12)]
            span_u=(min(u for _,u in rim),max(u for _,u in rim))
            def local(t,u):
                return ((t-.015)/.971,(u-span_u[0])/(span_u[1]-span_u[0]))
            p=[skin(t,u) for t,u in rim]
            dents=[(.5*t+.5*.48,.5*u+.5*.51,.035+rng.uniform(-.045,.06)) for t,u in rim]
            m=[skin(t,u,lift) for t,u,lift in dents]
            centre_tu=(.48,.51)
            centre=skin(*centre_tu,rng.uniform(.0,.08))
            for k in range(8):
                n=(k+1)%8
                patch((p[k],p[n],m[n],m[k]),0,[tile_uv(*local(*rim[k])),tile_uv(*local(*rim[n])),
                      tile_uv(*local(*dents[n][:2])),tile_uv(*local(*dents[k][:2]))])
                patch((m[k],m[n],centre),0,[tile_uv(*local(*dents[k][:2])),tile_uv(*local(*dents[n][:2])),
                      tile_uv(*local(*centre_tu))])
            if i%3==j%3 and 'Counterweight' not in obj.name:
                quad=((.17,.49),(.73,.49),(.84,.79),(.22,.82))
                patch([skin(t,u,.075) for t,u in quad],3,[(u,t) for t,u in quad])
                strip=((.15,.38),(.36,.38),(.36,.41),(.15,.41))
                patch([skin(t,u,.081) for t,u in strip],2,[(u*4,t*4) for t,u in strip])
            for k in range(2):
                t=rng.uniform(.12,.76); u=rng.uniform(.14,.83)
                sliver=((t,u),(t+.13,u+.018),(t+.035,u+.026))
                patch([skin(tt,uu,.084) for tt,uu in sliver],1,[(uu*3,tt*3) for tt,uu in sliver])
    skin_obj=mesh(obj.name+' salvaged doors and hoods',verts,faces,materials[0],obj.parent)
    for m in materials[1:]: skin_obj.data.materials.append(m)
    layer=skin_obj.data.uv_layers.new(name='Panel tile UV')
    for f,idx,coords in zip(skin_obj.data.polygons,indices,uvs):
        f.material_index=idx
        for li,uv in zip(f.loop_indices,coords): layer.data[li].uv=uv
    skinned.append(skin_obj)

for s in (-1,1):
    for x,y,z,r,parent in ((s*3.03,7.18,-1.29,.89,legs),(s*1.91,7.55,2.12,.52,body)):
        tube('Sidewall',(x-s*.14,y,z),(x+s*.1,y,z),r,r,rubber,parent,24)
        tube('Wheel rim',(x+s*.09,y,z),(x+s*.13,y,z),r*.65,r*.63,iron,parent,16)
        for k in range(6):
            a=k*pi/3
            tube('Lug recess',(x+s*.13,y+r*.38*cos(a),z+r*.38*sin(a)),(x+s*.145,y+r*.38*cos(a),z+r*.38*sin(a)),r*.10,r*.10,rubber,parent,8)
    tube('Headlamp bezel',(s*1.17,2.91,3.07),(s*1.42,2.91,3.19),.33,.30,iron,neck)
    tube('Headlamp lens',(s*1.41,2.91,3.19),(s*1.46,2.91,3.21),.24,.21,lamp,neck)
    tube('Swept brow',(s*1.21,3.31,2.72),(s*1.30,3.02,3.67),.18,.13,paint[0],neck)
    tube('Nostril',(s*.83,2.77,4.76),(s*.93,2.79,4.8),.13,.14,rubber,neck)
    for i in range(9):
        z=3.12+i*.245
        x=s*(1.12-.042*i)
        tube('Leaf spring fang',(x,2.13,z),(x*.97,1.76-.09*(i%3==1),z-.08),.097,.014,paint[4],neck,7)
        tube('Bent exhaust tooth',(x*.78,-.17,1.12+i*.209),(x*.79,.11,1.13+i*.209),.072,.009,iron,jaw,7)
    dz=.65*s
    for digit in (-1,0,1):
        x=s*1.97+digit*.58
        solid('Crumpled car bonnet',(x,.43,-.78+dz),(.54,.17,.66),paint[(digit+2)%6],legs)
        solid('Chrome bumper',(x,.35,-.42+dz),(.56,.12,.09),iron,legs)
# A wrecked bus grille spans the snout. Rear-quarter doors with frames,
# recessed windows, handles and hinges can be picked out from truck height.
solid('Bus grille recess',(0,2.64,5.408),(1.37,.46,.09),rubber,neck)
for i in range(7):
    solid('Bent chrome grille bar',((i-3)*.181,2.64,5.464),(.055,.37,.045),iron,neck)
for side in (-1,1):
    s=side
    tube('Bent bus bumper',(s*.76,2.30,5.26),(s*.40,2.30,5.54),.09,.09,iron,neck)
    tube('Bent bus bumper',(s*.40,2.30,5.54),(0,2.33,5.56),.09,.09,iron,neck)
    # A complete salvage door stands above each shoulder. The original glass
    # and chrome waist trim sit inside a pinched, slightly twisted perimeter.
    corners=[(s*2.36,6.65,-.35),(s*2.41,6.57,1.08),(s*2.31,7.59,1.41),
             (s*1.98,8.39,.95),(s*2.03,8.48,-.21),(s*2.35,7.61,-.51)]
    mesh('Faded shoulder car door',corners,[(0,1,2,3,4,5)],paint[1],body)
    window=[(s*2.48,7.67,-.38),(s*2.42,7.67,1.25),(s*2.09,8.28,.89),(s*2.14,8.33,-.19)]
    mesh('Cracked door glazing',window,[(0,1,2,3)],glass,body)
    for i in range(4):
        tube('Salvaged window frame',window[i],window[(i+1)%4],.034,.034,iron,body,7)
    tube('Chrome waist trim',(s*2.54,7.60,-.44),(s*2.48,7.60,1.28),.038,.038,iron,body)
    solid('Salvaged door handle',(s*2.57,7.43,-.22),(.095,.084,.26),iron,body)
    for y in (6.82,7.13):
        solid('Exposed hinge',(s*2.52,y,1.12),(.11,.16,.13),oxide,body)
    dz=.65*s
    solid('Foot grille',(s*1.97,.39,-.34+dz),(.87,.22,.11),rubber,legs)
    for j in range(4):
        solid('Foot grille slat',(s*1.97+(j-1.5)*.16,.39,-.27+dz),(.047,.16,.042),iron,legs)
    for delta in (-.5,.5):
        tube('Foot headlamp',(s*1.97+delta,.43,-.39+dz),(s*1.97+delta,.43,-.29+dz),.12,.11,paint[4],legs)
tube('Furnace nozzle',(0,1.77,2.53),(0,1.64,3.49),.31,.24,iron,neck)
tube('Nozzle bore',(0,1.64,3.49),(0,1.63,3.51),.18,.18,rubber,neck)
# Round 7: no plinth, rails or bogie under the feet (BOWL-REX-LOOK). It stands on its own toes.

# The sockets belong to the spine. Each lift-out cartridge has a centre-local
# origin and carries the cage, cell and tow eye as a unit.
live_cell=glowing(mat('Charged amber enamel',(.96,.49,.035),.1,.4),(1,.38,.015),.65)

bare_steel=mat('Polished towing eye',(.62,.64,.6),.2,.22)

def tow_eye(name,parent):
    # A forged annulus with a through-hole across X is readable from both sides.
    radius=.272
    gauge=.060
    verts=[]
    faces=[]
    for i in range(28):
        a=2*pi*i/28
        for j in range(8):
            b=2*pi*j/8
            verts.append((gauge*sin(b),(radius+gauge*cos(b))*cos(a),(radius+gauge*cos(b))*sin(a)))
    for i in range(28):
        for j in range(8):
            k=i*8+j
            faces.append((k,i*8+(j+1)%8,((i+1)%28)*8+(j+1)%8,((i+1)%28)*8+j))
    eye=mesh(name,verts,faces,bare_steel,parent)
    eye.location.y=.66
    for face in eye.data.polygons: face.use_smooth=True
    solid('Forged eye foot',(0,.30,0),(.24,.22,.32),iron,parent)
    return eye

# Round 7 (BOWL-REX-LOOK, owed from round 6): each box sits down in a steel tub let into the back, held by four
# straps that run down the ribs and are bolted to them, with no post under it. The box's origin and its eye stay
# where the fight aims (eye 10.52 m standing, EYE_Z in src/bowl/bowl-hook.js); the case reaches down to the tub.
ribs=forms[0][1]
def rib_section(z):
    """The ribcage's centre height, half-width and half-depth at z (straight between the loft's sections)."""
    for a,b in zip(ribs,ribs[1:]):
        if a[2]<=z<=b[2]:
            t=(z-a[2])/(b[2]-a[2])
            return [p+(q-p)*t for p,q in zip(a,b)][1:2]+[p+(q-p)*t for p,q in zip(a,b)][3:]
    raise ValueError(z)
BOX_ORIGIN=9.86
CASE_TOP=.20
boxes=[]
for index,z in enumerate((-2.9,-.22,2.56),1):
    centre_y,half_w,half_d=rib_section(z)
    floor_y=centre_y+half_d+.10
    socket=group(f'battery-socket-{index}',body,(0,floor_y,z))
    solid('Black socket floor',(0,0,0),(1.62,.05,1.14),rubber,socket)
    # Tub walls reach down into the back so no gap shows where the ribs fall away.
    for side in (-1,1):
        solid('Tub side wall',(side*.87,-.16,0),(.1,.6,1.34),oxide,socket)
        solid('Tub end wall',(0,-.16,side*.62),(1.84,.6,.1),oxide,socket)
        solid('Worn tub rim',(side*.87,.15,0),(.14,.035,1.38),bare_steel,socket)
        solid('Worn tub rim',(0,.15,side*.62),(1.88,.035,.14),bare_steel,socket)
        # Straps follow the ribs from the rim down the flank and end on a bolted plate.
        for dz in (-.42,.42):
            cy,w,d=rib_section(z+dz)
            points=[(side*.93,.13,dz),(side*.98,-.15,dz)]
            for degrees in (72,58,44,30):
                a=math.radians(degrees)
                points.append((side*(w+.09)*cos(a),cy+(d+.09)*sin(a)-floor_y,dz))
            for start,end in zip(points,points[1:]):
                tube('Rib strap',start,end,.07,.07,iron,socket,8)
            x,y,_=points[-1]
            solid('Strap bolt plate',(x,y,dz),(.2,.32,.28),oxide,socket)
            for bolt in (-.08,.08):
                tube('Strap bolt',(x,y+bolt,dz),(x+side*.09,y+bolt,dz),.045,.04,bare_steel,socket,8)
    # The torn leads, shown only when the box is out (the fight scales this group up; the file parks it at zero).
    leads=group(f'battery-leads-{index}',socket)
    for side,material,reach in ((-1,insulation,1.15),(1,rubber,.55)):
        path=[(side*.32,.02,side*.18),(side*.4,.45,side*.2),(side*.72,.62,side*.24),(side*1.0,.42,side*.28)]
        if reach>1: path+=[(side*1.12,.0,side*.3),(side*1.2,-.55,side*.32)]
        for start,end in zip(path,path[1:]):
            tube('Thick torn lead',start,end,.11,.11,material,leads,10)
        end=Vector(path[-1]); before=Vector(path[-2])
        direction=(end-before).normalized()
        tube('Lead ferrule',end,end+direction*.12,.115,.09,bare_steel,leads,10)
        tip=end+direction*.12
        for k in range(7):
            a=k*2*pi/7
            spread=Vector((cos(a)*.13,sin(a)*.13,cos(a+1)*.13))
            tube('Bright frayed copper',tip,tip+direction*.32+spread,.03,.012,copper,leads,6)
        spark=group(f'battery-spark-{index}-'+('a' if side<0 else 'b'),leads,tuple(tip+direction*.3))
    box=group(f'battery-box-{index}',body,(0,BOX_ORIGIN,z))
    case_bottom=floor_y+.025-BOX_ORIGIN
    height=CASE_TOP-case_bottom
    middle=(CASE_TOP+case_bottom)/2
    whole=solid(f'battery-box-{index}-whole',(0,middle,0),(1.50,height,1.04),hazard,box)
    opened=solid(f'battery-box-{index}-open',(0,middle,0),(1.50,height,1.04),live_cell,box)
    low,high=case_bottom+.32,CASE_TOP-.06
    for state in (whole,opened):
        for side in (-1,1):
            # The stripes wrap the sides above the tub's rim, so they are visible from the floor.
            for k in (-1,1):
                z0=k*.33
                mesh('Black hazard slash',[(side*.756,low,z0-.11),(side*.756,low,z0+.03),
                    (side*.756,high,z0+.17),(side*.756,high,z0+.03)],[(0,1,2,3)],rubber,state)
            # A lightning sign between the stripes.
            mid=(low+high)/2; tall=(high-low)*.5
            bolt=[(.06,tall),(-.09,-.02*tall),(-.005,-.02*tall),(-.07,-tall),(.1,.12*tall),(.015,.12*tall)]
            mesh('Lightning sign',[(side*.757,mid+v,u*side) for u,v in bolt],[tuple(range(6))],rubber,state)
            tube('Lift handle',(side*.6,CASE_TOP-.26,-.53),(side*.6,CASE_TOP-.07,-.53),.043,.043,iron,state)
        tow_eye(f'towing-eye-{index}-'+('open' if state==opened else 'closed'),state)
    for side in (-1,1):
        for state,tip in ((whole,(side*.19,CASE_TOP+.045)),(opened,(side*1.14,CASE_TOP+.395))):
            heel=(side*.67,CASE_TOP+.025)
            a=(heel[0],heel[1],-.43); b=(tip[0],tip[1],-.43)
            c=(tip[0],tip[1],.43); d=(heel[0],heel[1],.43)
            for start,end in ((a,b),(b,c),(c,d),(d,a)):
                tube('Hinged battery cage',start,end,.038,.038,iron,state)
            for pos in (-.28,0,.28):
                tube('Cage crossbar',(heel[0],heel[1],pos),(tip[0],tip[1],pos),.028,.028,iron,state)
    boxes.append((box,whole,opened,socket,leads))

def hinge(pivot,name):
    # Bind the rigidly welded parts to a single hinge bone. The parent
    # remains an independent anchor so the tired posture can fold the neck
    # and lower the tail while the bite or sway clip plays.
    parts=list(pivot.children)
    bones=bpy.data.armatures.new(name)
    rig=bpy.data.objects.new(name,bones)
    scene.collection.objects.link(rig)
    rig.parent=pivot
    bpy.context.view_layer.objects.active=rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bone=bones.edit_bones.new(name+' hinge')
    bone.head=(0,0,0)
    bone.tail=(0,1,0)
    bpy.ops.object.mode_set(mode='OBJECT')
    for part in parts:
        part.parent=rig
        weights=part.vertex_groups.new(name=name+' hinge')
        weights.add(list(range(len(part.data.vertices))),1,'REPLACE')
        modifier=part.modifiers.new('Welded hinge','ARMATURE')
        modifier.object=rig
    joint=rig.pose.bones[name+' hinge']
    joint.rotation_mode='XYZ'
    return rig,joint

def clip(obj,name,channel,steps,target=None):
    target=target or obj
    for frame,value in steps:
        setattr(target,channel,value)
        target.keyframe_insert(data_path=channel,frame=frame)
    anim=obj.animation_data
    action=anim.action
    action.name=name+' '+obj.name
    track=anim.nla_tracks.new(); track.name=name
    track.strips.new(name,1,action)
    anim.action=None
    setattr(target,channel,steps[0][1])

jaw_rig,jaw_joint=hinge(jaw,'Jaw linkage')
tail_rig,tail_joint=hinge(tail,'Tail linkage')
clip(jaw_rig,'jaw-bite','rotation_euler',[(1,(0,0,0)),(9,(.18,0,0)),(16,(-.20,0,0)),(28,(0,0,0))],jaw_joint)
clip(tail_rig,'tail-swing','rotation_euler',[(1,(0,0,0)),(13,(0,.18,0)),(37,(0,-.18,0)),(49,(0,0,0))],tail_joint)
for obj,channel,start,end in ((legs,'scale',(1,1,1),(1,.49,1)),(body,'location',(0,0,0),(0,-4,0)),
        (neck,'rotation_euler',(0,0,0),(.992,0,0)),(tail,'rotation_euler',(0,0,0),(-.125,0,0))):
    clip(obj,'tired',channel,[(1,start),(25,end),(49,end)])
scene.frame_set(1)
scene.frame_end=49
# Every other part takes its photographed tile by projection onto its main face.
for obj in asset.children_recursive:
    if obj.type!='MESH' or obj in skinned: continue
    uv=obj.data.uv_layers.new(name='Pressed sheet UV')
    for face in obj.data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]))
        u,v=[i for i in range(3) if i!=axis]
        for li in face.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[u]*.67,co[v]*.67)
for obj in skinned: obj.data.uv_layers[0].name='Pressed sheet UV'

# Round 7: weld the fixed small parts under each parent into one object, so the game draws one mesh per parent and
# material instead of one per tube and plate (528 nodes before). Every part the fight or the view finds by name, every
# part with children, and every part bent by a rig keeps its own object.
def kept(obj):
    return (obj.name.startswith(('battery-','towing-eye-','scrapasaurus-')) or obj.name in ('thorax','folding-neck','crouching-haunches')
            or obj.modifiers or obj.children or obj.animation_data)
welds={}
for obj in asset.children_recursive:
    if obj.type=='MESH' and not kept(obj): welds.setdefault(obj.parent,[]).append(obj)
for parent,parts in welds.items():
    if len(parts)<2: continue
    with bpy.context.temp_override(active_object=parts[0],selected_editable_objects=parts,selected_objects=parts):
        bpy.ops.object.join()
    parts[0].name=f'{parent.name} welded parts'

bpy.ops.object.select_all(action='DESELECT')
for obj in [asset,*asset.children_recursive]: obj.select_set(True)
bpy.context.view_layer.objects.active=asset
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_yup=False,
    export_animation_mode='NLA_TRACKS',export_extras=True,export_image_format='JPEG',export_image_quality=84)
# Blender derives each child's local matrix from its parent's inverse.
# Export at unit scale, then park the three open nodes and the three torn
# lead groups in the GLB. The game reveals each with one scale change.
raw=output.read_bytes()
json_length=struct.unpack_from('<I',raw,12)[0]
manifest=json.loads(raw[20:20+json_length])
open_names={opened.name for _,_,opened,_,_ in boxes}|{leads.name for *_,leads in boxes}
for node in manifest['nodes']:
    if node.get('name') in open_names:
        node['scale']=[0,0,0]
encoded=json.dumps(manifest,separators=(',',':')).encode('utf8')
encoded+=b' '*((-len(encoded))%4)
tail_chunks=raw[20+json_length:]
output.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(tail_chunks))
                   +struct.pack('<I4s',len(encoded),b'JSON')+encoded+tail_chunks)
for _,_,opened,_,leads in boxes:
    opened.scale=(0,0,0)
    leads.scale=(0,0,0)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
if args.skip_renders: raise SystemExit

# Light the painted surface from both sides so a driver can read the parts.
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples=16
scene.view_settings.exposure=-.8
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.56,.63,.68,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
for loc,power,color in [((9,21,10),8200,(1,.92,.82)),((-9,11,5),5400,(.85,.90,1)),((0,15,-12),6600,(1,.85,.68))]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=bpy.context.object
    light.data.energy=power
    light.data.color=color
    light.data.shape='DISK'
    light.data.size=11
    light.rotation_euler=aim(loc,(0,5,-2))
# Review-only scale reference from the actual game's truck.
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/unlocks/titan_monster.glb'))
new=set(scene.objects)-before
anchor=group('review-only Titan')
for obj in new:
    if not obj.parent: obj.parent=anchor
anchor.rotation_euler.x=-pi/2
bpy.context.view_layer.update()
points=[obj.matrix_world@Vector(p) for obj in new if obj.type=='MESH' for p in obj.bound_box]
scale=2.25/(max(p.y for p in points)-min(p.y for p in points))
anchor.scale=(scale,)*3
anchor.location=(4,-min(p.y for p in points)*scale,-5.3)
solid('Studio floor',(0,-.14,0),(200,.22,200),mat('Concrete',(.38,.37,.33),0),None)
for obj in (legs,body,neck,tail):
    for track in obj.animation_data.nla_tracks: track.mute=track.name=='tired'
scene.frame_set(1)
render('side',(30,7,-2),(0,5.4,-2.3),24)
render('closed',(7,12.5,3),(0,9.5,-.22),4.6)
box,whole,opened,socket,leads=boxes[1]
parts=[box,*box.children_recursive]
for part in parts: part.hide_render=True
leads.scale=(1,1,1)
render('socket',(5.5,12,2.5),(0,9.3,-.22),4.2)
for part in parts: part.hide_render=False
leads.scale=(0,0,0)
# A muted track leaves its last values behind, so the tired view comes last.
for obj in (legs,body,neck,tail):
    for track in obj.animation_data.nla_tracks: track.mute=track.name!='tired'
scene.frame_set(30)
render('tired',(-18,13,-20),(0,3.5,-1),24)
