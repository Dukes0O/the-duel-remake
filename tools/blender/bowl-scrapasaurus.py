"""Build the Bowl's welded tyrannosaur in metres, Y up and nose towards +Z.

Run the recipe inside Blender with --root . to export and render. Then run
python tools/blender/bowl-scrapasaurus.py --root . --sheet-only to lay out
the Blender views with the earlier generated reference photograph.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=5, choices=[5])
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--skip-renders', action='store_true')
parser.add_argument('--sheet-only', action='store_true')
parser.add_argument('--clay-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
blend = root / 'art-build/bowl-scrapasaurus/scrapasaurus.blend'
output = root / 'public/assets/models/wasteland/bowl/scrapasaurus.glb'
sheet = root / 'docs/board/looks/bowl-art-rex/round-5.jpg'
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
        reference=Image.open(sheet).crop((0,32,560,355))
    panels=[('Welded sculpture reference',reference),('Clay silhouette',Image.open(evidence/'clay.png'))]
    for title,name in [('Standing beside the Titan','side'),('Three-quarter view','quarter'),('From the driver seat','driver'),('Tired ramp - 4.8 m wide, 22.7 degrees','tired'),('Open hip battery','above'),('Salvaged grille and spring teeth','detail'),('Crushed hip battery','crushed')]:
        panels.append((title,Image.open(evidence/(name+'.png'))))
    canvas=Image.new('RGB',(1680,1065),'#252927')
    draw=ImageDraw.Draw(canvas)
    font=ImageFont.truetype('arial.ttf',19)
    for i,(title,tile) in enumerate(panels):
        x=(i%3)*560; y=(i//3)*355
        draw.text((x+12,y+5),title,fill='#ede6d8',font=font)
        tile.thumbnail((560,323))
        canvas.paste(tile,(x+(560-tile.width)//2,y+32+(323-tile.height)//2))
    for quality in (86,80,75,70):
        canvas.save(sheet,quality=quality,optimize=True)
        if sheet.stat().st_size<=500000: break
    raise SystemExit

import bpy
from mathutils import Vector, Matrix
from math import sin, cos, pi

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rng = random.Random(553)
evidence.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)

def mat(name, color, metal=.45, rough=.62):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color,1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color,1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    return m

oxide = mat('Pitted steel', (.13,.067,.039))
clay = mat('Unpainted clay', (.48,.48,.47),0)
paint = [mat(n,c) for n,c in [('Oxblood',(.39,.083,.053)),('Petrol blue',(.075,.175,.235)),('Mustard',(.51,.285,.074)),('Primer',(.19,.21,.19)),('Old ivory',(.54,.47,.32)),('Burnt umber',(.24,.11,.047))]]
iron = mat('Worn steel',(.235,.22,.18))
rubber = mat('Tyre rubber',(.031,.032,.028),.07)
glass = mat('Dusty glazing',(.056,.102,.105))
hazard = mat('Industrial amber',(.93,.49,.028))
lamp = mat('Lit headlamp',(.95,.82,.49))
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(1,.72,.28,1)
lamp.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=2

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
    loft('Hind leg',[(s*1.79,8.5,-1.85,.49,.64),(s*1.83,7.75,-1.6,1.16,1.54),(s*1.93,6.55,-1.33,1.23,1.67),(s*1.91,5.24,-.79+.25*dz,.91,1.25),(s*1.9,4.16,-.32+dz,.67,.82),(s*1.91,3.57,-.71+dz,.57,.65),(s*1.93,2.47,-1.75+dz,.43,.55),(s*1.95,1.84,-2.04+dz,.36,.48),(s*1.97,.55,-1.68+dz,.34,.37)],legs,True)
    for digit in (-1,0,1):
        loft('Car-front toe',[(s*1.97,.49,-1.99+dz,.34,.34),(s*1.97+digit*.24,.46,-1.4+dz,.40,.31),(s*1.97+digit*.55,.32,-.68+dz,.33,.24),(s*1.97+digit*.81,.2,-.11+dz-.32*abs(digit),.08,.10)],legs)
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
for obj,sections,limb in forms:
    if 'toe' in obj.name or 'forelimb' in obj.name: continue
    verts=[]; faces=[]; indices=[]
    materials=[*paint,oxide,iron,glass]
    def patch(points,color):
        start=len(verts)
        verts.extend(points)
        faces.append(tuple(range(start,start+len(points))))
        indices.append(color)
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
            base=rng.choices(range(6),[3,2,1,2,1,4])[0]
            low=rng.uniform(.015,.085)
            high=rng.uniform(.90,.98)
            p=[skin(.015,low+.07),skin(.08,low),skin(.935,low+.03),skin(.986,.13+low),
               skin(.974,high-.055),skin(.90,high),skin(.10,high-.015),skin(.032,high-.12)]
            centre=skin(.48,.51,.065)
            for k in range(8): patch((p[k],p[(k+1)%8],centre),base)
            if i%3==j%3 and 'Counterweight' not in obj.name:
                patch([skin(t,u,.075) for t,u in ((.17,.49),(.73,.49),(.84,.79),(.22,.82))],8)
                patch([skin(t,u,.081) for t,u in ((.15,.38),(.36,.38),(.36,.41),(.15,.41))],7)
            for k in range(2):
                t=rng.uniform(.12,.76); u=rng.uniform(.14,.83)
                patch([skin(t,u,.084),skin(t+.13,u+.018,.084),skin(t+.035,u+.026,.084)],6)
    skin_obj=mesh(obj.name+' salvaged doors and hoods',verts,faces,materials[0],obj.parent)
    for m in materials[1:]: skin_obj.data.materials.append(m)
    for f,idx in zip(skin_obj.data.polygons,indices): f.material_index=idx

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
for s in (-1,1):
    solid('Ground rail',(s*1.84,.12,-1.18),(.16,.16,5.8),iron,asset)
    for z in (-2.82,-.15):
        tube('Bogie roller',(s*1.72,.38,z),(s*1.95,.38,z),.26,.26,rubber,asset)
solid('Low rail bogie',(0,.39,-1.42),(3.7,.26,3.42),oxide,asset)

# In the tired pose the folded tail plates open into a continuous drivable
# surface. The shoulder and hip decks meet it at exactly the same height.
bridge=group('folding-tail-deck',body,(0,9.44,-3.1))
bridge.scale=(.001,.001,.001)
def deck(name,z0,h0,z1,h1,width,parent):
    pts=[(-width/2,h0,z0),(width/2,h0,z0),(width/2,h1,z1),(-width/2,h1,z1)]
    return mesh(name,pts+[(x,y-.11,z) for x,y,z in pts],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],iron,parent)
deck('tired-tail-ramp',-13,-5.44,0,0,4.8,bridge)
deck('tired-flat-back',0,0,6.15,0,4.8,bridge)
for k in range(25):
    z=-12.8+k*.51; y=z*5.44/13
    solid('Ramp tread',(0,y+.012,z),(4.6,.032,.085),oxide,bridge)
boxes=[]
for index,z in enumerate((-2.9,-.22,2.56),1):
    whole=solid(f'battery-box-{index}-whole',(0,9.66,z),(1.48,.57,1.04),hazard,body)
    smashed=solid(f'battery-box-{index}-smashed',(0,9.49,z),(1.52,.22,1.07),oxide,body)
    # Buckled lid, torn edge and a sheared terminal remain after the strike.
    for v in smashed.data.vertices:
        if v.co.y>9.49: v.co.y+=.11*v.co.x-.065*(v.co.z-z)
    mesh('Torn hazard lid',[(-.65,9.55,z-.37),(-.12,9.67,z-.42),(.24,9.60,z-.26),
         (.05,9.59,z+.25),(-.49,9.62,z+.41)],[(0,1,2),(2,3,4),(4,0,2)],hazard,smashed)
    tube('Sheared battery terminal',(.46,9.60,z+.19),(.60,9.72,z+.24),.06,.041,iron,smashed)
    # Open parts nest inside the closed casing, so older game views that
    # control only the intact and crushed parts can still display this model.
    solid('Welded battery saddle',(0,8.95,z),(1.42,.91,.98),oxide,body)
    opened=solid(f'battery-box-{index}-open',(0,9.48,z),(1.26,.16,.91),hazard,body)
    for x in (-.52,0,.52):
        solid('Cell rib',(x,9.58,z),(.22,.15,.67),iron,opened)
        solid('Warning stripe',(x,9.951,z),(.14,.018,1.01),rubber,whole)
    for side in (-1,1):
        tube('Heavy cable',(side*.67,9.63,z),(side*.90,9.37,z+.23),.079,.079,rubber,whole)
    opened.scale=(0,0,0)
    boxes.append((whole,opened,smashed))

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
        (neck,'rotation_euler',(0,0,0),(.992,0,0)),(tail,'rotation_euler',(0,0,0),(-.14,0,0)),
        (bridge,'scale',(.001,.001,.001),(1,1,1))):
    clip(obj,'tired',channel,[(1,start),(25,end),(49,end)])
scene.frame_set(1)
scene.frame_end=49
# The pictured patina is baked into portable glTF colour maps. Broad oxide
# blooms, bright scratches and gritty speckles survive at different distances.
import numpy as np
size=160
yy,xx=np.mgrid[0:size,0:size]
noise=np.random.default_rng(111)
for index,m in enumerate([*paint,oxide,iron,hazard]):
    tint=np.asarray(m.diffuse_color[:3])
    phase=index*1.83
    wave=(np.sin(xx*.07+np.cos(yy*.046)*2+phase)+np.cos(yy*.11+np.sin(xx*.09))+np.sin(xx*.16+yy*.15))*.31
    grain=noise.normal(0,.105,(size,size))
    pits=np.clip((wave+grain-.30)*1.8,0,.93)[...,None]
    rgb=tint*(1+grain[...,None])*(1-pits)+np.array([.19,.074,.033])*pits
    for scratch in range(38):
        x,y=noise.integers(0,size,2)
        length=int(noise.integers(2,18))
        for k in range(length):
            rgb[(y+k//4)%size,(x+k)%size]=tint*.65+.13
    tex=bpy.data.images.new(m.name+' enamel wear',width=size,height=size)
    rgba=np.ones((size,size,4),dtype=np.float32)
    rgba[:,:,:3]=np.clip(rgb,0,1)**(1/2.2)
    tex.pixels.foreach_set(rgba.ravel())
    tex.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage'); node.image=tex
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for obj in asset.children_recursive:
    if obj.type!='MESH': continue
    uv=obj.data.uv_layers.new(name='Pressed sheet UV')
    for face in obj.data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]))
        u,v=[i for i in range(3) if i!=axis]
        for li in face.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[u]*.67,co[v]*.67)

bpy.ops.object.select_all(action='DESELECT')
for obj in [asset,*asset.children_recursive]: obj.select_set(True)
bpy.context.view_layer.objects.active=asset
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_yup=False,
    export_animation_mode='NLA_TRACKS',export_extras=True)
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
for whole,opened,smashed in boxes:
    smashed.hide_render=True
    for child in smashed.children_recursive: child.hide_render=True
    opened.hide_render=True
for obj in (legs,body,neck,tail,bridge):
    for track in obj.animation_data.nla_tracks: track.mute=track.name=='tired'
scene.frame_set(1)
render('side',(30,7,-2),(0,5.4,-2.3),24)
render('quarter',(21,10,15),(0,5.45,-2.1),25)
cam.data.type='PERSP'; cam.data.lens=26
render('driver',(15,2.25,15),(0,5.35,-1.5),28)
cam.data.type='ORTHO'
scene.frame_set(10)
render('detail',(8,11,14),(0,9.7,5.7),6.9)
for obj in (legs,body,neck,tail,bridge):
    for track in obj.animation_data.nla_tracks: track.mute=track.name!='tired'
whole,opened,_=boxes[0]
whole.hide_render=True
for child in whole.children_recursive: child.hide_render=True
opened.scale=(1,1,1)
opened.hide_render=False
scene.frame_set(30)
render('tired',(25,13,-18),(0,3,-4.6),28)
render('above',(33,36,-7),(0,3,-4.6),28)


opened.hide_render=True
for child in opened.children_recursive: child.hide_render=True
boxes[0][2].hide_render=False
for child in boxes[0][2].children_recursive: child.hide_render=False
render('crushed',(6,9,-9),(0,5.4,-2.6),6.7)
