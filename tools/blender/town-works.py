"""Build the town works family and its single review sheet.

All authored shapes use town_base's glTF-metre coordinates and shared material
atlas. Blender's scene is staged for the sheet only after the origin-centered
family GLB has been exported.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', action='store_true')
parser.add_argument('--assemble-sheet', action='store_true')
parser.add_argument('--tin-photo',default='C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d503a008-f319-4f8c-8e2b-9e16908bde89.png')
parser.add_argument('--sand-photo',default='C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d7c1cbbb-f80e-4027-a01a-224d0467927c.png')
parser.add_argument('--evidence', default='.evidence/2026-11-05/TOWN-ART-WORKS')
cli_args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
args = parser.parse_args(cli_args)
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/town/works.glb'
evidence = Path(args.evidence)
evidence = evidence if evidence.is_absolute() else root / evidence
sheet = root / 'docs/board/looks/town-art-works/round-1.jpg'
blend = root / 'art-build/town/works.blend'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)],
                      'evidence': [str(evidence)] if args.render else [],
                      'summary': [str(sheet)] if args.render else []}))
    raise SystemExit(0)

if args.assemble_sheet:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    cards=[
      ('test-pit','1x1 • pit and spoil'),('trench','1x1 • straight + corner'),
      ('valve-box','1x1 • hand valve'),('pipe-stack','1x1 • hollow pipe'),
      ('handcart','1x1 • salvage cart'),('barrow','1x1 • wheelbarrow'),
      ('flatbed','1x1 • flatbed + load'),('pile-salvage','1x1 • salvage'),
      ('pile-steel','1x1 • plate steel'),('pile-tin','1x1 • corrugated tin'),
      ('pile-timber','1x1 • logs'),('pile-brick','1x1 • brick'),
      ('pile-pipe','1x1 • pipe'),('pile-sand','1x1 • sand'),
      ('pile-clay','1x1 • clay'),('salvage-yard','3x3 • working yard'),
      ('warehouse','3x3 • tin warehouse'),('sawmill','3x2 • open saw'),
      ('kiln','2x2 • beehive kiln'),('old-ground','3x3 • burial ground')]
    tile_w,tile_h=390,230;sheet_w=4*tile_w;sheet_h=5*tile_h+250
    canvas=Image.new('RGB',(sheet_w,sheet_h),(32,33,30));draw=ImageDraw.Draw(canvas)
    fonts=Path('C:/Windows/Fonts')
    title_font=ImageFont.truetype(str(fonts/'segoeuib.ttf'),28)
    label_font=ImageFont.truetype(str(fonts/'segoeuib.ttf'),18)
    small_font=ImageFont.truetype(str(fonts/'segoeui.ttf'),15)
    ref=Path(r'C:\Users\kyleb\.codex\generated_images\01a1ade1-0982-71e1-aa64-05d7861ca612\exec-b3c8bc49-ee7c-4d51-ba70-a87b5401541f.png')
    photo=ImageOps.fit(Image.open(ref).convert('RGB'),(560,190),method=Image.Resampling.LANCZOS,centering=(.42,.48))
    canvas.paste(photo,(sheet_w-580,15))
    base_sheet=Image.open(root/'docs/board/looks/town-art-base/round-3.jpg').convert('RGB')
    scale_crop=base_sheet.crop((220,2380,760,2920))
    scale_guide=ImageOps.fit(scale_crop,(190,190),method=Image.Resampling.LANCZOS,centering=(.5,.5))
    canvas.paste(scale_guide,(760,15))
    draw.text((18,20),'SCABLANDS WORKS | ROUND 1',font=title_font,fill=(240,226,198))
    draw.text((18,62),'Separate building origins • bright overcast • 8 m grid basis',font=small_font,fill=(215,207,188))
    draw.text((18,108),'Photographic reference crop',font=small_font,fill=(220,174,115))
    draw.text((612,15),'SCALE',font=small_font,fill=(220,174,115))
    draw.text((612,38),'Car, person, 8 m grid',font=small_font,fill=(215,207,188))
    for i,(ident,label) in enumerate(cards):
        cx=(i%4)*tile_w;cy=230+(i//4)*tile_h
        draw.rectangle((cx,cy,cx+tile_w-4,cy+tile_h-4),fill=(39,40,36),outline=(107,93,70),width=2)
        draw.text((cx+8,cy+5),ident,font=label_font,fill=(236,202,156))
        draw.text((cx+8,cy+28),label,font=small_font,fill=(214,210,195))
        for view in ('above','driver'):
            path=evidence/f'{ident}-{view}.png'
            if not path.exists():raise FileNotFoundError(f'missing comparison view: {path}')
            with Image.open(path) as im:
                im=ImageOps.fit(im.convert('RGB'),(180,164),method=Image.Resampling.LANCZOS,centering=(.5,.5))
                canvas.paste(im,(cx+8+('above','driver').index(view)*186,cy+62))
        draw.text((cx+12,cy+48),'ABOVE 45°',font=small_font,fill=(232,215,188))
        draw.text((cx+198,cy+48),'DRIVER HEIGHT',font=small_font,fill=(232,215,188))
    draw.text((18,sheet_h-20),'Blender views • generated reference crop only • no new runtime texture',font=small_font,fill=(215,207,188))
    sheet.parent.mkdir(parents=True,exist_ok=True)
    for quality in (78,74,70,66,62,58,54):
        canvas.save(sheet,'JPEG',quality=quality,optimize=True,progressive=True)
        if sheet.stat().st_size<=500_000:break
    if sheet.stat().st_size>500_000:raise RuntimeError(f'comparison sheet is {sheet.stat().st_size} bytes')
    print(json.dumps({'sheet':str(sheet),'bytes':sheet.stat().st_size,'views':len(cards)*2}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
tin_photo=Path(args.tin_photo);sand_photo=Path(args.sand_photo)
for source in (tin_photo,sand_photo):
    if not source.exists():raise FileNotFoundError(f'material reference missing: {source}')
m = town.make_materials({'galvanised-tin':tin_photo,'rusted-steel':tin_photo,'sand':sand_photo})
# The shared atlas is opaque. Keep it as one 1K image, saved as JPEG so this
# family stays inside its 3 MB file budget.
atlas=bpy.data.images.get('Scablands shared town wear atlas 1K')
atlas_temp=root/'.qa-dist/town-works-atlas.jpg';atlas_temp.parent.mkdir(parents=True,exist_ok=True)
atlas.filepath_raw=str(atlas_temp);atlas.file_format='JPEG';atlas.save()
photo_atlas=bpy.data.images.load(str(atlas_temp),check_existing=False);photo_atlas.pack()
for material in m.values():
    for node in material.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image==atlas:node.image=photo_atlas
bpy.data.images.remove(atlas)
groups = {}

def game_loc(p):
    return town.game_vector(p)

def mesh_obj(obj, name, mat):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj

def box(name, center, size, material, bevel=.025):
    if min(size)<.16:bevel=0
    return town.cube(name, center, size, material, bevel)

def beam(name, a, b, width, material):
    obj=town.beam(name, a, b, width, material)
    # Fine structural bars do not need a bevel modifier. Keep their readable
    # square section and save triangles for the formed panels and larger parts.
    if width<.16:
        for modifier in list(obj.modifiers):obj.modifiers.remove(modifier)
    return obj

def cylinder(name, center, radius, depth, material, vertices=16, axis='Y'):
    # The town API uses Y-up; Blender's cylinder default is Z-up.
    bpy.ops.mesh.primitive_cylinder_add(vertices=min(vertices,12), radius=radius, depth=depth,
                                        location=game_loc(center))
    obj = bpy.context.object
    if axis == 'X': obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Z': obj.rotation_euler[0] = math.pi / 2
    return mesh_obj(obj, name, material)

def torus(name, center, major, minor, material, axis='Y'):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     major_segments=12, minor_segments=6,
                                     location=game_loc(center))
    obj = bpy.context.object
    if axis == 'X': obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Z': obj.rotation_euler[0] = math.pi / 2
    return mesh_obj(obj, name, material)

def sphere(name, center, scale, material, seg=16):
    seg=min(seg,12)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(6, seg // 2),
                                         radius=1, location=game_loc(center))
    obj = bpy.context.object
    obj.scale = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return mesh_obj(obj, name, material)

def mound(name, center, rx, rz, height, material, seed):
    import random
    rng=random.Random(seed);segments=16
    rings=[(0.04,.98),(height*.25,.80),(height*.57,.52),(height*.82,.20)]
    verts=[]
    for rise,ratio in rings:
        for i in range(segments):
            angle=math.tau*i/segments
            wobble=rng.uniform(.91,1.08)
            verts.append(game_loc((center[0]+math.cos(angle)*rx*ratio*wobble,
                                   center[1]+rise,center[2]+math.sin(angle)*rz*ratio*wobble)))
    faces=[]
    faces.append(tuple(reversed(range(segments))))
    for ring in range(len(rings)-1):
        a=ring*segments;b=(ring+1)*segments
        for i in range(segments):faces.append((a+i,a+(i+1)%segments,b+(i+1)%segments,b+i))
    tip=len(verts);verts.append(game_loc((center[0]+.06,center[1]+height,center[2]-.04)))
    last=(len(rings)-1)*segments
    for i in range(segments):faces.append((last+i,last+(i+1)%segments,tip))
    mesh=bpy.data.meshes.new(name+' rough heap');mesh.from_pydata(verts,[],faces);mesh.update()
    mesh.materials.append(material);uv=mesh.uv_layers.new(name='two metre surface scale')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(co.x/2,co.y/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    for poly in mesh.polygons:poly.use_smooth=False
    return obj

def corrugated(name, center, width, height, material, bent=0):
    # 10 cm pressed steel waves, modeled as a real profile, not a stripe texture.
    x, y, z = center
    count = max(7, round(width / .10)); dx = width / count
    verts=[]; faces=[]
    for row, yy in enumerate((-height/2, height/2)):
        for i in range(count + 1):
            xx=-width/2+i*dx
            wave=.034*(1 if i%2 == 0 else -1)
            if i > count-3 and row == 1: wave += .08
            verts.append((xx, wave, yy))
    front=len(verts); verts += [(a,b-.025,c) for a,b,c in tuple(verts)]
    for i in range(count):
        face=(i,i+1,count+2+i,count+1+i)
        faces.extend((face,tuple(v+front for v in reversed(face))))
    mesh=bpy.data.meshes.new(name+' pressed profile');mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='100 mm corrugations')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vx,_,vz=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(vx/2,vz/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    obj.location=game_loc((x,y,z));obj.data.materials.append(material)
    obj.rotation_euler[2]=bent
    return obj

def make_group(ident, builder):
    before=set(bpy.context.scene.objects)
    builder()
    parts=list(set(bpy.context.scene.objects)-before)
    parent=bpy.data.objects.new(ident,None);bpy.context.collection.objects.link(parent)
    parent.name=ident
    for obj in parts:
        if obj.parent is None:
            world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world
    groups[ident]=parent
    return parent

def join_primitive(name, center, dimensions, material, bevel=.025):
    return box(name, center, dimensions, material, bevel)

def plate_heap(name, center, count, dims, materials):
    x,y,z=center
    for i in range(count):
        angle=(i%3-1)*.055
        p=box(f'{name}-plate-{i+1}',(x+(i%2)*.045,y+i*.11,z+((i%3)-1)*.035),
              (dims[0]*(1-(i%3)*.055),.09,dims[1]*(1-(i%2)*.07)),
              materials[i%len(materials)],.035)
        p.rotation_euler[1]=angle

# Hand-dug test pit, its loose spoil berm and a graduated timber depth stick.
def build_pit():
    # A hand-cut oval with a broken raised lip and dark floor below the rim.
    segments=16;verts=[]
    for ring,(rx,rz,rise) in enumerate(((.98,.74,.10),(.61,.45,.025))):
        for i in range(segments):
            angle=math.tau*i/segments;wobble=1+.07*math.sin(i*2.3+ring)
            verts.append(game_loc((math.cos(angle)*rx*wobble,rise,math.sin(angle)*rz*wobble)))
    faces=[]
    for i in range(segments):faces.append((i,(i+1)%segments,segments+(i+1)%segments,segments+i))
    mesh=bpy.data.meshes.new('test pit scalloped cut bank');mesh.from_pydata(verts,[],faces);mesh.update()
    mesh.materials.append(m['sand']);mesh.uv_layers.new(name='earth lip')
    uv=mesh.uv_layers.active
    for poly in mesh.polygons:
        poly.use_smooth=False
        for li in poly.loop_indices:
            co=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(co.x/2,co.y/2)
    obj=bpy.data.objects.new('test-pit-cut-earth-lip',mesh);bpy.context.collection.objects.link(obj)
    box('test-pit-dark-floor',(0,.035,0),(1.15,.035,.84),m['iron-dark'],.18)
    mound('test-pit-spoil-mound',(1.05,.05,-.15),.72,.64,.42,m['sand'],221)
    for i in range(6):
        sphere(f'test-pit-spoil-clod-{i+1}',(1.0+(i%3)*.18,.18+(i%2)*.07,-.42+(i//3)*.22),
               (.17,.11,.13),m['cracked-concrete'],8)
    beam('test-pit-depth-stick',(-.38,.10,.30),(-.38,1.35,.30),.065,m['weathered-plank'])
    for i in range(6):
        beam(f'test-pit-depth-mark-{i+1}',(-.41,.25+i*.18,.30),(-.23,.25+i*.18,.30),.024,m['faded-hand-paint'])
make_group('test-pit',build_pit)

# Both trench pieces are movable parts under the shared trench building id.
def build_trench():
    def straight():
        for side in (-1,1):
            beam(f'trench-straight-cut-bank-{side}',(side*.52,.08,-2.8),(side*.52,.08,2.8),.13,m['cracked-concrete'])
        box('trench-straight-dark-cut',(0,-.04,0),(.90,.08,5.55),m['iron-dark'],.01)
        town.pipe_run('trench-straight-rusted-pipe',[(-.08,.04,-2.5),(-.08,.04,2.5)],.11,m['rusted-steel'])
        for i,z in enumerate((-2.1,-1.1,0,1.1,2.1)):
            box(f'trench-straight-plank-{i+1}',(0,.18,z),(1.55,.12,.25),m['weathered-plank'],.025)
    make_group('trench:straight',straight)
    def corner():
        for side in (-1,1):
            beam(f'trench-corner-bank-north-{side}',(side*.5,.08,-2.7),(side*.5,.08,0),.12,m['cracked-concrete'])
            beam(f'trench-corner-bank-east-{side}',(0,.08,side*.5),(2.7,.08,side*.5),.12,m['cracked-concrete'])
        box('trench-corner-cut-north',(0,-.03,-1.35),(.9,.08,2.8),m['iron-dark'],.01)
        box('trench-corner-cut-east',(1.35,-.03,0),(2.8,.08,.9),m['iron-dark'],.01)
        town.pipe_run('trench-corner-bent-pipe',[(-.08,.04,-2.4),(-.08,.04,0),(2.4,.04,0)],.11,m['rusted-steel'])
        for i,t in enumerate((-.9,-.2,.55,1.35,2.1)):
            pos=(0,.18,t) if t<0 else (t,.18,0)
            box(f'trench-corner-plank-{i+1}',pos,(1.5,.12,.25),m['weathered-plank'],.02)
    make_group('trench:corner',corner)
    root=bpy.data.objects.new('trench',None);bpy.context.collection.objects.link(root)
    for ident in ('trench:straight','trench:corner'):groups[ident].parent=root
    groups['trench']=root
make_group('trench-holder',build_trench)
# Remove the temporary holder; the actual named id is the root for the two parts.
bpy.data.objects.remove(groups.pop('trench-holder'),do_unlink=True)

def build_valve():
    box('valve-box-buried-concrete',(0,.25,0),(1.65,.55,1.3),m['cracked-concrete'])
    box('valve-box-rusty-lid',(0,.58,0),(1.45,.12,1.1),m['rusted-steel'],.05)
    for x in (-.58,.58):
        for z in (-.42,.42):sphere('valve-box-lid-bolt-'+str(x)+str(z),(x,.65,z),(.065,.06,.065),m['iron-dark'])
    cylinder('valve-box-riser',(0,.83,0),.13,.46,m['rusted-steel'])
    torus('valve-box-handwheel',(0,1.14,0),.28,.035,m['iron-dark'])
    beam('valve-box-wheel-spoke',(0,1.14,-.28),(0,1.14,.28),.028,m['iron-dark'])
    sphere('valve-box-handle',(0,1.17,0),(.07,.06,.07),m['rusted-steel'])
make_group('valve-box',build_valve)

def build_pipe_stack():
    for i in range(4):
        y=.18+(i//3)*.31;z=((i%3)-1)*.27
        # Long steel pipe and raised lips make the hollow end readable above.
        cylinder(f'pipe-stack-pipe-{i+1}',(0,y,z),.18,2.05,m['rusted-steel'],axis='X')
        torus(f'pipe-stack-rim-{i+1}',(-1.0,y,z),.18,.025,m['galvanised-tin'],axis='X')
        torus(f'pipe-stack-far-rim-{i+1}',(1.0,y,z),.18,.025,m['rusted-steel'],axis='X')
make_group('pipe-stack',build_pipe_stack)

def wheel(name,x,y,z,r=.43):
    torus(name,(x,y,z),r*.72,r*.28,m['iron-dark'],axis='X')
    cylinder(name+'-hub',(x,y,z),r*.30,.20,m['rusted-steel'],axis='X')
    for i in range(4):
        a=2*math.pi*i/4
        beam(name+f'-tread-{i+1}',(x,y+math.sin(a)*r*.93,z+math.cos(a)*r*.93),
             (x,y+math.sin(a)*r*.83,z+math.cos(a)*r*.83),.065,m['iron-dark'])

def build_handcart():
    box('handcart-plank-bed',(0,.64,-.18),(1.10,.16,1.15),m['weathered-plank'])
    for x in (-.52,.52):beam('handcart-side-rail-'+str(x),(x,.72,-.65),(x,.72,.25),.07,m['rusted-steel'])
    for x in (-.50,.50):beam('handcart-long-handle-'+str(x),(x,.62,.20),(x,.12,1.55),.085,m['rusted-steel'])
    wheel('handcart-single-axle-wheel',0,.46,-.18,.40)
    for i in range(3):box(f'handcart-scrap-load-{i+1}',((i-1)*.22,.86,-.15),(.42,.16,.38),m['rusted-steel'],.03)
make_group('handcart',build_handcart)

def build_barrow():
    # Tub is pressed and flared; legs and handles join at the axle.
    box('barrow-bowl-base',(0,.64,-.16),(.88,.13,1.13),m['rusted-steel'],.08)
    for side in (-1,1):
        box(f'barrow-bowl-flared-side-{side}',(side*.42,.81,-.14),(.13,.46,1.03),m['galvanised-tin'],.09)
        beam(f'barrow-handle-{side}',(side*.30,.60,.28),(side*.34,.22,1.65),.08,m['weathered-plank'])
        beam(f'barrow-leg-{side}',(side*.25,.48,-.45),(side*.34,.12,-.88),.07,m['rusted-steel'])
    wheel('barrow-front-wheel',0,.40,-.72,.42)
    for i in range(4):sphere(f'barrow-clay-load-{i+1}',((i%2)*.18-.09,.91,-.22+(i//2)*.20),(.22,.14,.21),m['cracked-concrete'],8)
make_group('barrow',build_barrow)

def build_flatbed():
    box('flatbed-chassis',(0,1.08,0),(2.5,.27,5.4),m['rusted-steel'])
    box('flatbed-worn-deck',(0,1.27,0),(2.62,.15,5.5),m['weathered-plank'])
    for x in (-1.30,1.30):
        for z in (-2.45,2.45):wheel(f'flatbed-wheel-{x}-{z}',x,.70,z,.62)
        beam(f'flatbed-side-stake-{x}-a',(x,.98,-2.55),(x,.98,2.55),.12,m['rusted-steel'])
        for z in (-2.2,-1.1,0,1.1,2.2):beam(f'flatbed-bed-bow-{x}-{z}',(x,1.35,z),(x,.88,z),.065,m['rusted-steel'])
    box('flatbed-headboard',(0,1.65,-2.62),(2.7,.70,.16),m['galvanised-tin'])
    box('flatbed-cab-firewall',(0,1.68,-3.15),(1.9,.90,.14),m['rusted-steel'],.08)
    for x in (-.55,.55):sphere(f'flatbed-cab-lamp-{x}',(x,1.90,-3.23),(.17,.16,.12),m['dirty-glass'])
make_group('flatbed',build_flatbed)
def build_flatbed_load():
    # Four strapped plates, a timber beam, wheels and salvaged tin form the load.
    plate_heap('flatbed-load-plate',(0,1.45,.2),5,(1.65,2.5),[m['rusted-steel'],m['galvanised-tin']])
    for z in (-.95,.0,.92):beam(f'flatbed-load-timber-{z}',(-.7,2.05,z),(.7,2.05,z),.13,m['weathered-plank'])
    for x in (-.66,.66):beam(f'flatbed-load-tie-down-{x}',(x,1.42,-1.25),(x,2.22,1.32),.025,m['iron-dark'])
make_group('flatbed:load',build_flatbed_load)

# The eight materials have deliberately different silhouettes and surface detail.
def stockpile(ident, kind):
    if kind=='salvage':
        for i in range(8):
            x=((i*5)%7-3)*.22;z=((i*3)%5-2)*.24;y=.12+(i%4)*.13
            p=box(f'{ident}-twisted-panel-{i+1}',(x,y,z),(.75,.16,.55),m['rusted-steel'] if i%2 else m['galvanised-tin'],.05)
            p.rotation_euler[1]=(i%3-1)*.23;p.rotation_euler[2]=(i%4-1.5)*.11
        for i in range(3):torus(f'{ident}-spare-tyre-{i+1}',(-.52,.22+i*.24,.15),.31,.11,m['iron-dark'],axis='Y')
    elif kind=='steel':
        plate_heap(ident,(0,.12,0),8,(2.7,2.4),[m['rusted-steel'],m['galvanised-tin']])
        for i in range(3):beam(f'{ident}-welded-strap-{i+1}',(-1.25,1.0,-.7+i*.7),(1.25,1.0,-.7+i*.7),.045,m['iron-dark'])
    elif kind=='tin':
        for i in range(9):
            p=corrugated(f'{ident}-sheet-{i+1}',((i%3-1)*.36,.13+(i//3)*.15,(i%2-.5)*.42),1.65,1.55,m['galvanised-tin'],bent=(i%3-1)*.10)
            p.rotation_euler[0]=math.pi/2+(i%3-1)*.06
    elif kind=='timber':
        for layer in range(4):
            y=.22+layer*.27
            for j in range(4):cylinder(f'{ident}-log-{layer}-{j}',((j%2)*.24-.12,y,(j-1.5)*.44),.16,2.4,m['weathered-plank'],axis='X',vertices=12)
    elif kind=='brick':
        for layer in range(4):
            for j in range(6):
                x=(j-2.5)*.34+(layer%2)*.16;z=((j%3)-1)*.45
                box(f'{ident}-brick-{layer}-{j}',(x,.15+layer*.17,z),(.31,.16,.19),m['salvaged-brick'],.02)
    elif kind=='pipe':
        for i in range(6):
            x=((i%3)-1)*.36;y=.17+(i//3)*.27;z=(i%2-.5)*.36
            cylinder(f'{ident}-open-pipe-{i+1}',(0,y,z),.18,2.8,m['rusted-steel'],axis='X')
            torus(f'{ident}-pipe-mouth-{i+1}',(-1.38,y,z),.18,.025,m['galvanised-tin'],axis='X')
    elif kind=='sand':
        # Distinct broad low sand bank, lumpy at its toe and wind-creased.
        mound(f'{ident}-main-ridge',(0,0,0),1.5,1.13,.95,m['sand'],342)
        for i in range(7):sphere(f'{ident}-wind-toe-{i+1}',(-.85+i*.28,.12,.72),(.27,.12,.19),m['sand'],8)
        for i in range(4):beam(f'{ident}-wind-scar-{i+1}',(-.8+i*.43,.78,-.62),(-.5+i*.43,.76,-.84),.018,m['cracked-concrete'])
    elif kind=='clay':
        mound(f'{ident}-clay-bank-a',(-.28,0,.12),.98,.76,.68,m['salvaged-brick'],451)
        mound(f'{ident}-clay-bank-b',(.44,0,-.32),.66,.53,.52,m['cracked-concrete'],452)
        for i in range(5):
            beam(f'{ident}-dry-seam-{i+1}',(-.7+i*.28,.42,-.34+i*.07),(-.36+i*.28,.42,-.60+i*.06),.022,m['iron-dark'])
make_group('pile-salvage',lambda:stockpile('pile-salvage','salvage'))
make_group('pile-steel',lambda:stockpile('pile-steel','steel'))
make_group('pile-tin',lambda:stockpile('pile-tin','tin'))
make_group('pile-timber',lambda:stockpile('pile-timber','timber'))
make_group('pile-brick',lambda:stockpile('pile-brick','brick'))
make_group('pile-pipe',lambda:stockpile('pile-pipe','pipe'))
make_group('pile-sand',lambda:stockpile('pile-sand','sand'))
make_group('pile-clay',lambda:stockpile('pile-clay','clay'))

def work_shed(prefix, width, depth, height, tin=True, door_width=3.6):
    # Welded frame and individually formed cladding, open in front for legibility.
    for x in (-width/2,width/2):
        for z in (-depth/2,depth/2):beam(f'{prefix}-column-{x}-{z}',(x,.1,z),(x,height,z),.18,m['rusted-steel'])
    for y in (height*.45,height):
        for z in (-depth/2,depth/2):beam(f'{prefix}-front-girt-{y}-{z}',(-width/2,y,z),(width/2,y,z),.12,m['rusted-steel'])
        for x in (-width/2,width/2):beam(f'{prefix}-side-girt-{y}-{x}',(x,y,-depth/2),(x,y,depth/2),.12,m['rusted-steel'])
    for side in (-1,1):
        for i in range(5):
            x=-width/2+(i+.5)*width/5
            if abs(x)>door_width/2 or side<0:
                corrugated(f'{prefix}-wall-sheet-{side}-{i}',(x,height*.60,side*depth/2),width/5-.025,height*.78,m['galvanised-tin'],(i%3-1)*.035)
        for i in range(7):
            z=-depth/2+(i+.5)*depth/7
            corrugated(f'{prefix}-side-sheet-{side}-{i}',(side*width/2,height*.60,z),depth/7-.02,height*.78,m['rusted-steel'],side*math.pi/2)
    # Roof is many pitched panels, overlapping and patched in a different metal.
    for side in (-1,1):
        panel=box(f'{prefix}-roof-plane-{side}',(0,height+.16,side*depth*.23),(width+1.0,.12,depth*.57),
                  m['galvanised-tin'] if side<0 else m['rusted-steel'],.05)
        panel.rotation_euler[0]=side*.17
    beam(f'{prefix}-roof-ridge',(-width*.56,height+.26,0),(width*.56,height+.26,0),.14,m['rusted-steel'])
    for i in range(8):beam(f'{prefix}-roof-purlin-{i}',(-width/2+i*width/7,height+.02,-depth*.48),(-width/2+i*width/7,height+.02,depth*.48),.09,m['iron-dark'])
    # Gable bracing and doorway frame show actual load paths.
    for side in (-1,1):beam(f'{prefix}-gable-brace-{side}',(side*width*.46,height*.52,-depth*.48),(0,height+.22,-depth*.48),.10,m['rusted-steel'])
    for x in (-door_width/2,door_width/2):beam(f'{prefix}-door-post-{x}',(x,.1,-depth/2-.09),(x,height*.88,-depth/2-.09),.12,m['rusted-steel'])
    return

def build_salvage_yard():
    work_shed('salvage-yard-gang-shed',7.2,5.0,3.6,door_width=3.8)
    # Three separated sorting bays, built from heavy salvaged beams.
    for bay,x in enumerate((-7.2,-2.8,2.0)):
        for z in (-4.2,-1.7):beam(f'salvage-yard-bay-{bay+1}-post-{z}',(x,.1,z),(x,1.65,z),.17,m['rusted-steel'])
        beam(f'salvage-yard-bay-{bay+1}-back',(x,1.5,-4.2),(x+3.2,1.5,-4.2),.15,m['rusted-steel'])
        for j in range(5):
            box(f'salvage-yard-bay-{bay+1}-sorted-stack-{j}',(x+.42+(j%2)*.25,.24+(j//2)*.22,-3.35),(.75,.18,.58),
                (m['rusted-steel'],m['galvanised-tin'],m['weathered-plank'])[bay%3],.035)
    # The hand-built hoist is a useful overhead landmark.
    beam('salvage-yard-crane-leg-left',(-10,.1,3.9),(-10,7.8,3.9),.26,m['rusted-steel'])
    beam('salvage-yard-crane-leg-right',(-6.4,.1,3.9),(-6.4,7.8,3.9),.26,m['rusted-steel'])
    beam('salvage-yard-crane-girder',(-10,7.8,3.9),(-6.4,7.8,3.9),.30,m['galvanised-tin'])
    beam('salvage-yard-crane-hook',(-8.2,7.8,3.9),(-8.2,5.1,3.9),.09,m['iron-dark'])
    torus('salvage-yard-crane-hook-loop',(-8.2,4.9,3.9),.22,.055,m['rusted-steel'],axis='Z')
    for i in range(3):
        town.drum(f'salvage-yard-oil-drum-{i+1}',(4.2+i*.68,.52,3.8),m)
    for i in range(4):
        p=box(f'salvage-yard-loose-sheet-{i+1}',(-5+i*.66,.20,5.5),(.55,.08,2.0),m['rusted-steel'],.04)
        p.rotation_euler[1]=(.08-i*.05)
    # Roof tank and angled vent make the roof useful from the mayor camera.
    cylinder('salvage-yard-water-tank',(0,4.15,0),.68,1.25,m['galvanised-tin'])
    town.pipe_run('salvage-yard-tank-feed',[(0,3.6,.7),(0,4.1,.7),(1.4,4.1,.7)],.075,m['rusted-steel'])
    corrugated('salvage-yard-patched-lean-to',(-7.5,1.7,-2.6),2.8,2.1,m['galvanised-tin'],.12)
    town.hand_painted_sign('salvage-yard-gang-sign',(0,2.4,-2.7),'WORKS',m)
make_group('salvage-yard',build_salvage_yard)

def build_warehouse():
    work_shed('warehouse-tin-hall',21.0,20.5,8.7,door_width=9.0)
    # Tall sliding cargo doors and roller rails on the road-facing gable.
    for side in (-1,1):
        door=box(f'warehouse-loading-door-leaf-{side}',(side*2.2,3.7,-10.38),(4.0,7.0,.16),m['rusted-steel'],.08)
        for i in range(7):beam(f'warehouse-door-rib-{side}-{i}',(side*2.2-1.7,1+i*.88,-10.49),(side*2.2+1.7,1+i*.88,-10.49),.045,m['galvanised-tin'])
    beam('warehouse-door-track',(-5.0,7.45,-10.55),(5.0,7.45,-10.55),.15,m['iron-dark'])
    for x in (-10.2,10.2):
        for z in (-9.8,9.8):beam(f'warehouse-corner-ragged-patch-{x}-{z}',(x,7.6,z),(x,8.4,z),.22,m['galvanised-tin'])
    # Roof vents, rain barrels and a patched skylight read at high zoom.
    for x,z in [(-6,-4),(4,3),(7,-5)]:
        box(f'warehouse-roof-repair-{x}-{z}',(x,8.85,z),(3.4,.10,2.4),m['galvanised-tin'],.12)
    for x in (-7,0,7):
        cylinder(f'warehouse-roof-vent-{x}',(x,9.55,1.0),.26,1.5,m['rusted-steel'])
        sphere(f'warehouse-vent-cap-{x}',(x,10.30,1.0),(.42,.12,.42),m['galvanised-tin'])
    for i in range(3):
        cylinder(f'warehouse-rain-barrel-{i+1}',(-9.0,1.0,5.4+i*1.15),.43,1.6,m['rusted-steel'])
    for side in (-1,1):
        beam(f'warehouse-ladder-rail-{side}',(side*.33,.1,-8.9),(side*.33,8.6,-8.9),.08,m['iron-dark'])
        for i in range(12):beam(f'warehouse-ladder-rung-{side}-{i}',(-.33,1+i*.62,-8.9),(.33,1+i*.62,-8.9),.06,m['rusted-steel'])
make_group('warehouse',build_warehouse)

def build_sawmill():
    # Open-sided roofed saw station with a real toothed blade and timber feed.
    for x in (-7.1,7.1):
        for z in (-4.0,4.0):beam(f'sawmill-post-{x}-{z}',(x,.1,z),(x,5.0,z),.20,m['weathered-plank'])
    for side in (1,):
        roof=box(f'sawmill-open-roof-{side}',(0,5.25,side*1.65),(14.5,.16,4.2),m['rusted-steel'],.07)
        roof.rotation_euler[0]=side*.12
    beam('sawmill-ridge',(-7.3,5.48,0),(7.3,5.48,0),.18,m['weathered-plank'])
    # Twin guide rails and roller bed.
    for x in (-.55,.55):beam(f'sawmill-log-rail-{x}',(x,.72,-6.5),(x,.72,3.4),.16,m['rusted-steel'])
    for z in (-5.7,-4.1,-2.5,-.9,.7,2.3):
        cylinder(f'sawmill-feed-roller-{z}',(0,.62,z),.14,1.3,m['iron-dark'],axis='X')
    cylinder('sawmill-circular-blade',(0,1.9,-.2),1.12,.10,m['rusted-steel'],vertices=40,axis='Z')
    torus('sawmill-blade-rim',(0,1.9,-.27),1.04,.06,m['galvanised-tin'],axis='Z')
    for i in range(28):
        a=2*math.pi*i/28
        beam(f'sawmill-blade-tooth-{i+1}',(math.sin(a)*1.10,1.9+math.cos(a)*1.10,-.28),
             (math.sin(a)*1.0,1.9+math.cos(a)*1.0,-.28),.055,m['iron-dark'])
    box('sawmill-engine-block',(2.0,1.0,-.4),(1.1,1.2,1.4),m['rusted-steel'],.09)
    for i in range(7):
        z=5.0+(i%3)*.42;y=.25+(i//3)*.30
        cylinder(f'sawmill-log-stack-{i+1}',(-4.5,y,z),.28,5.0,m['weathered-plank'],axis='X',vertices=12)
    sphere('sawmill-sawdust-heap',(4.8,.26,4.2),(1.35,.28,.92),m['sand'],20)
    for i in range(3):box(f'sawmill-offcut-{i+1}',(5.0+i*.25,.25,3.0),(.22,.18,1.6),m['weathered-plank'])
    # Low patched windbreak on only one side.
    for i in range(5):corrugated(f'sawmill-windbreak-sheet-{i}',(-7.05,1.45,-3.5+i*1.45),1.35,2.7,m['galvanised-tin'],(i%3-1)*.06)
make_group('sawmill',build_sawmill)

def build_kiln():
    # Beehive kiln assembled in fired brick courses with an arched fire mouth.
    # The packed earth/clay core closes the center so the top view reads as a
    # complete kiln mound instead of a hollow ring of loose bricks.
    sphere('kiln-fired-clay-core',(0,1.45,0),(1.88,1.48,1.86),m['salvaged-brick'],16)
    for layer in range(7):
        y=.22+layer*.31
        radius=2.18-layer*.17
        count=max(12,round(math.tau*radius/.48))
        for i in range(count):
            a=2*math.pi*i/count
            x=math.sin(a)*radius;z=math.cos(a)*radius
            if z < -1.55 and abs(x)<.85 and layer<4:continue
            brick=box(f'kiln-fired-brick-{layer}-{i}',(x,y,z),(math.tau*radius/count*.96,.29,.42),m['salvaged-brick'],0)
            brick.rotation_euler[2]=a
    for side in (-1,1):beam(f'kiln-mouth-jamb-{side}',(side*.68,.1,-2.18),(side*.68,1.55,-2.18),.18,m['cracked-concrete'])
    beam('kiln-arch-lintel',(-.68,1.55,-2.18),(.68,1.55,-2.18),.18,m['salvaged-brick'])
    box('kiln-black-fire-mouth',(0,.78,-2.10),(1.05,1.18,.10),m['iron-dark'],.16)
    box('kiln-iron-fire-door',(0,.77,-2.23),(.72,.85,.08),m['rusted-steel'],.10)
    for i in range(4):
        z=-.3+i*.48
        cylinder(f'kiln-chimney-course-{i}',(.05,3.4+i*.32,.42),.42-i*.035,.34,m['salvaged-brick'],vertices=16)
    cylinder('kiln-flue-dark',(0,4.2,.42),.19,.38,m['iron-dark'])
    for i in range(5):box(f'kiln-stacked-green-brick-{i}',(2.55,.18+(i//2)*.20,-.15+(i%2)*.35),(.62,.18,.32),m['salvaged-brick'],.02)
make_group('kiln',build_kiln)
def build_kiln_lamp():
    sphere('kiln-lamp-glass',(0,1.25,-2.45),(.22,.15,.13),m['faded-hand-paint'])
make_group('kiln:lamp',build_kiln_lamp)

def build_old_ground():
    # Quiet enclosure, scattered stones, plain markers and one weathered dead tree.
    for z in (-11,11):
        for i in range(9):
            x=-10+i*2.5
            box(f'old-ground-stone-wall-{z}-{i}',(x,.35,z),(2.35,.55,.38),m['cracked-concrete'],.10)
    for x in (-11,11):
        for i in range(9):
            z=-9.8+i*2.45
            box(f'old-ground-stone-wall-{x}-{i}',(x,.35,z),(.38,.55,2.35),m['cracked-concrete'],.10)
    for i in range(12):
        x=-7.5+(i%4)*4.7;z=-6.5+(i//4)*6.2
        marker=bpy.data.objects.new(f'old-ground:marker-{i+1}',None);bpy.context.collection.objects.link(marker)
        marker.location=game_loc((x,0,z))
        stone=box(f'old-ground-marker-stone-{i+1}',(x,.43,z),(.48,.86,.16),m['weathered-plank'],.08)
        world=stone.matrix_world.copy();stone.parent=marker;stone.matrix_world=world
        for side in (-1,1):
            foot=box(f'old-ground-marker-foot-{i+1}-{side}',(x+side*.23,.18,z),(.10,.22,.20),m['rusted-steel'],.035)
            world=foot.matrix_world.copy();foot.parent=marker;foot.matrix_world=world
        groups[f'old-ground:marker-{i+1}']=marker
    # A single bare, weather-bleached tree; limbs grow from the trunk.
    beam('old-ground-dead-tree-trunk',(-8,.2,6),(-8,5.0,6),.36,m['weathered-plank'])
    for i,(endx,endy,endz) in enumerate([(-10.1,3.4,6.2),(-6.2,4.2,5.7),(-9.0,3.0,4.7),(-7.2,3.7,7.4)]):
        beam(f'old-ground-dead-tree-limb-{i+1}',(-8,2.0+(i%2)*.35,6),
             (endx,endy,endz),.20,m['weathered-plank'])
    for i in range(12):
        sphere(f'old-ground-wild-grass-stone-{i+1}',(-9+(i%4)*5,.11,-7+(i//4)*6.5),(.25,.13,.22),m['cracked-concrete'],12)
make_group('old-ground',build_old_ground)

# Place each model root at its specified local ground-centered origin.  Child
# part origins remain meaningful for lights, movable loads and grave markers.
root_obj=bpy.data.objects.new('town-works',None);bpy.context.collection.objects.link(root_obj)
for ident,obj in list(groups.items()):
    if ident.startswith('old-ground:marker-') or ident.startswith('trench:') or ident=='kiln:lamp' or ident=='flatbed:load':
        continue
    if ident=='trench':
        obj.parent=root_obj
    else:
        obj.parent=root_obj
for ident in ('trench:straight','trench:corner','flatbed:load','kiln:lamp'):
    groups[ident].parent=root_obj
for i in range(1,13):groups[f'old-ground:marker-{i}'].parent=root_obj

# A single family material atlas (no external model image). Export before the
# render-only staging moves each family root to its thumbnail cell.
out.parent.mkdir(parents=True,exist_ok=True)
town.export_glb(out)

if args.render:
    evidence.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True
    scene.render.resolution_x=440;scene.render.resolution_y=320;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=.0
    scene.world=bpy.data.worlds.new('Bright overcast daylight');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.64,.67,.64,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
    for loc,power,size in [((14,24,32),12000,18),((-16,-10,22),8000,16)]:
        bpy.ops.object.light_add(type='AREA',location=game_loc(loc));light=bpy.context.object
        light.data.energy=power;light.data.shape='DISK';light.data.size=size
        light.rotation_euler=(game_loc((0,2,0))-light.location).to_track_quat('-Z','Z').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=600,location=game_loc((0,-.05,0)))
    ground=mesh_obj(bpy.context.object,'render-only compacted sand',m['sand'])
    # Ortho cameras keep both views comparable across families.
    bpy.ops.object.camera_add(location=game_loc((0,35,-42)));camera=bpy.context.object
    camera.rotation_euler=(game_loc((0,2,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=16
    scene.camera=camera
    # First set roots in a measured display grid. Regions scale by plot size,
    # with every compact prop large enough to inspect from the mayor's view.
    cards=[
      ('test-pit','1x1 • pit and spoil',7),('trench','1x1 • straight + corner',7),
      ('valve-box','1x1 • hand valve',7),('pipe-stack','1x1 • hollow pipe',7),
      ('handcart','1x1 • salvage cart',7),('barrow','1x1 • wheelbarrow',7),
      ('flatbed','1x1 • flatbed + load',7),('pile-salvage','1x1 • salvage',7),
      ('pile-steel','1x1 • plate steel',7),('pile-tin','1x1 • corrugated tin',7),
      ('pile-timber','1x1 • logs',7),('pile-brick','1x1 • brick',7),
      ('pile-pipe','1x1 • pipe',7),('pile-sand','1x1 • sand',7),
      ('pile-clay','1x1 • clay',7),('salvage-yard','3x3 • working yard',23),
      ('warehouse','3x3 • tin warehouse',23),('sawmill','3x2 • open saw',23),
      ('kiln','2x2 • beehive kiln',15),('old-ground','3x3 • burial ground',23)]
    # Hide child meshes first, then place each owner at the center of its cell.
    def hierarchy(obj):
        result=[obj];
        for child in obj.children:result.extend(hierarchy(child))
        return result
    owner={name:obj for name,obj in groups.items() if ':' not in name}
    for i,(ident,label,span) in enumerate(cards):
        obj=owner[ident]
        obj.location=game_loc(((i%5)*31,0,(i//5)*29))
    # Keep multipart elements aligned with their parent for display.
    groups['trench:straight'].location=owner['trench'].location
    groups['trench:corner'].location=game_loc((owner['trench'].location.x+3.5,0,-owner['trench'].location.z))
    groups['flatbed:load'].location=owner['flatbed'].location
    groups['kiln:lamp'].location=owner['kiln'].location
    for i in range(1,13):groups[f'old-ground:marker-{i}'].location=owner['old-ground'].location
    for ident in owner:
        for o in hierarchy(owner[ident]):o.hide_render=False
    # Rendering runs once per model in above and driver views, with a hard
    # clear between ids so no neighboring asset leaks into its crop.
    # Title and comparison sheet are assembled by system Python after Blender exits.
    scene.render.image_settings.file_format='PNG'
    for i,(ident,label,span) in enumerate(cards):
        obj=owner[ident]
        # For each render, hide all family roots then show one item in isolation.
        for item in owner.values():
            for o in hierarchy(item):o.hide_render=True
        for part_id,part in groups.items():
            if part_id.startswith('old-ground:marker-') or part_id in ('trench:straight','trench:corner','flatbed:load','kiln:lamp'):
                for o in hierarchy(part):o.hide_render=True
        for o in hierarchy(obj):o.hide_render=False
        for special in (['trench:straight','trench:corner'] if ident=='trench' else
                        ['flatbed:load'] if ident=='flatbed' else
                        ['kiln:lamp'] if ident=='kiln' else
                        [f'old-ground:marker-{n}' for n in range(1,13)] if ident=='old-ground' else []):
            for o in hierarchy(groups[special]):o.hide_render=False
        render_parts=hierarchy(obj)
        if ident=='trench':render_parts += hierarchy(groups['trench:straight'])+hierarchy(groups['trench:corner'])
        if ident=='flatbed':render_parts += hierarchy(groups['flatbed:load'])
        if ident=='kiln':render_parts += hierarchy(groups['kiln:lamp'])
        if ident=='old-ground':
            for n in range(1,13):render_parts += hierarchy(groups[f'old-ground:marker-{n}'])
        bounds=[o.matrix_world @ Vector(corner) for o in render_parts if o.type=='MESH' for corner in o.bound_box]
        if not bounds:continue
        center=Vector(((min(v.x for v in bounds)+max(v.x for v in bounds))/2,
                      (min(v.y for v in bounds)+max(v.y for v in bounds))/2,
                      (min(v.z for v in bounds)+max(v.z for v in bounds))/2))
        width=max(v.x for v in bounds)-min(v.x for v in bounds);depth=max(v.y for v in bounds)-min(v.y for v in bounds);height=max(v.z for v in bounds)-min(v.z for v in bounds)
        scale=max(width,depth,height*.9,3.0)*1.20
        camera.data.ortho_scale=scale
        scene.render.resolution_x=570;scene.render.resolution_y=520
        floor=min(v.z for v in bounds)
        for view in range(2):
            center_game=Vector((center.x,center.z,-center.y))
            floor_game=floor
            if view==0:
                camera_location=game_loc((center_game.x,center_game.y+scale*1.8,center_game.z))
                camera_target=game_loc(center_game)
            else:
                # Human-height camera at the road-facing (-Z game axis) side.
                camera_location=game_loc((center_game.x,floor_game+1.65,center_game.z-scale*1.25))
                camera_target=game_loc((center_game.x,floor_game+min(1.8,height*.25),center_game.z))
            camera.location=camera_location
            # Match the accepted town-sheet recipe's conversion and camera up axis.
            camera.rotation_euler=(camera_target-camera.location).to_track_quat('-Z','Y').to_euler()
            path=evidence/f'{ident}-{"above" if view==0 else "driver"}.png'
            scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    blend.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    import subprocess
    subprocess.run(['python',str(Path(__file__).resolve()),'--root',str(root),
                    '--evidence',str(evidence),'--assemble-sheet'],check=True)
    print(json.dumps({'sheet':str(sheet),'glb':str(out)}))
