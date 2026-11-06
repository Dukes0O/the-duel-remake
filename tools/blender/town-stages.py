"""Candidate Wasteland construction-stage, ruin and street props."""
import math
import json
import random
import sys
from pathlib import Path
if '--paths-only' in sys.argv:
    import argparse
    cli=[arg for arg in sys.argv[1:] if arg!='--']
    parser=argparse.ArgumentParser();parser.add_argument('--root',default=str(Path(__file__).resolve().parents[2]));parser.add_argument('--evidence',default='');parser.add_argument('--paths-only',action='store_true')
    args=parser.parse_args(cli);root=Path(args.root).resolve();evidence=Path(args.evidence).resolve() if args.evidence else root/'.evidence/2026-11-05/TOWN-ART-STAGES/art-build'
    print(json.dumps({'blend':[str(evidence/'stages.blend')],
      'glb':[str(root/'public/assets/models/wasteland/town/stages.glb')]}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import town_base as t

def photo_material(name, image_path, tint, metallic=0.0):
    """Use one repeating JPEG per material, with a restrained member tint."""
    image=bpy.data.images.load(str(image_path.resolve()),check_existing=True)
    image.pack()
    material=bpy.data.materials.new(name)
    material.diffuse_color=(*tint,1);material.use_nodes=True
    nodes=material.node_tree.nodes;links=material.node_tree.links
    bsdf=nodes.get('Principled BSDF');bsdf.inputs['Metallic'].default_value=min(.3,metallic);bsdf.inputs['Roughness'].default_value=.92
    texture=nodes.new('ShaderNodeTexImage');texture.image=image;texture.interpolation='Linear';texture.extension='REPEAT'
    uv=nodes.new('ShaderNodeTexCoord')
    multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=(*tint,1)
    links.new(uv.outputs['UV'],texture.inputs['Vector']);links.new(texture.outputs['Color'],multiply.inputs[1]);links.new(multiply.outputs['Color'],bsdf.inputs['Base Color'])
    return material

def beam(a,b,width,depth,material,name='timber member'):
    """Make a solid rectangular member between game-space metre points."""
    va=t.game_vector(a);vb=t.game_vector(b);delta=vb-va
    # town_base.cube takes game dimensions as width, height, depth. The long
    # member axis becomes Blender Z after conversion, so length is its height.
    obj=t.cube(name,((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),(width,delta.length,depth),material,0)
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return obj

rectangular_beam=beam

OUT=Path(__file__).resolve().parents[2]/'public/assets/models/wasteland/town/stages.glb'
EVIDENCE=Path(__file__).resolve().parents[2]/'.evidence/2026-11-06/TOWN-ART-STAGES/round-5'
ids=['scaffold-1','scaffold-2','scaffold-3','scaffold-4']+[f'rubble-{i}' for i in range(1,5)]+[f'burnt-{i}' for i in range(1,5)]+['street-lamp','barrel-fire','crate-stack','barrels','washing-line','bench','bin','signpost','sandbags','junk-pile','dead-tree']
def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def build():
    reset()
    texture_dir=OUT.parent/'textures'
    textures={
      'weathered-plank':('timber.jpg',(.68,.57,.43),0),
      'rusted-steel':('rusted-steel.jpg',(.78,.72,.65),.25),
      'galvanised-tin':('tin.jpg',(.30,.23,.17),.20),
      'iron-dark':('rusted-steel.jpg',(.39,.36,.32),.25),
      'salvaged-brick':('rubble.jpg',(.77,.72,.62),0),
      'cracked-concrete':('rubble.jpg',(.63,.59,.51),0),
      'patched-canvas':('timber.jpg',(.54,.47,.38),0),
      'faded-hand-paint':('rusted-steel.jpg',(.48,.37,.27),0),
      'sand':('rubble.jpg',(.53,.45,.35),0),
    }
    mats={key:photo_material('Town / '+key,texture_dir/filename,tint,metal)
          for key,(filename,tint,metal) in textures.items()}
    timber_variants=[photo_material(f'Town / scaffold timber {i+1}',texture_dir/'timber.jpg',tint)
                     for i,tint in enumerate(((.32,.25,.18),(.42,.32,.23),(.50,.39,.28),(.38,.30,.23)))]
    steel_variants=[photo_material(f'Town / scaffold steel {i+1}',texture_dir/'rusted-steel.jpg',tint,.25)
                    for i,tint in enumerate(((.54,.50,.45),(.70,.63,.54),(.82,.74,.62)))]
    tin_variants=[photo_material(f'Town / scaffold tin {i+1}',texture_dir/'tin.jpg',tint,.18)
                  for i,tint in enumerate(((.20,.15,.11),(.28,.21,.15),(.36,.27,.19)))]
    charred=photo_material('Town / charred timber',texture_dir/'charred-wood.jpg',(.07,.06,.055))
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=900;scene.render.resolution_y=620;scene.render.resolution_percentage=100
    scene.world.color=(.62,.62,.62)
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.75,.78,.82,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
    scene.view_settings.view_transform='AgX'
    family=bpy.data.objects.new('town-stages',None);scene.collection.objects.link(family);roots=[]
    def cube(n,c,s,m,bev=0):return t.cube(n,c,s,m,bev)
    def tin_panel(name,center,width,height,bent=0):
        start=set(scene.objects);panel=t.corrugated_sheet(name,center,width,height,mats,bent=bent)
        for obj in set(scene.objects)-start:
          if '-lap-rivet-' in obj.name:bpy.data.objects.remove(obj,do_unlink=True)
        return panel
    def beam(n,a,b,w,depth_or_material,material=None):
        if material is None:return rectangular_beam(a,b,w,w,depth_or_material,n)
        return rectangular_beam(a,b,w,depth_or_material,material,n)
    def scaffold(prefix,w,d,h,stage):
        """Four legible construction states built from fixed 3.5 m bays."""
        start=set(scene.objects);rng=random.Random(110+stage+int(w))
        bay=3.5; nx=max(1,min(9,round((w-1)/bay))); nz=max(1,min(9,round((d-1)/bay)))
        actual_w=nx*bay;actual_d=nz*bay;xs=[(i-(nx-1)/2)*bay for i in range(nx+1)];zs=[(i-(nz-1)/2)*bay for i in range(nz+1)]
        if stage==1:
          for x in xs:
            for z in zs:
              cube(prefix+':survey-peg',(x,.22,z),(.11,.44,.11),mats['weathered-plank'],.008)
          for z in (zs[0],zs[-1]):beam(prefix+':setting-string',(xs[0],.38,z),(xs[-1],.38,z),.018,mats['patched-canvas'])
          for x in (xs[0],xs[-1]):beam(prefix+':setting-string',(x,.38,zs[0]),(x,.38,zs[-1]),.018,mats['patched-canvas'])
          for i in range(16):
            x=rng.uniform(-actual_w*.48,actual_w*.48);z=rng.uniform(-actual_d*.48,actual_d*.48)
            beam(prefix+':timber-pile',(x,.1+i%3*.075,z),(x+rng.uniform(.8,2.2),.12+i%3*.075,z+rng.uniform(-.08,.08)),.20,.16,mats['weathered-plank'])
          for i in range(2):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=.35,location=t.game_vector((actual_w*.31+i*.42,.3,actual_d*.34)))
            o=bpy.context.object;o.name=prefix+':canvas-sack';o.scale=(1,.68,.8);o.data.materials.append(mats['patched-canvas'])
          cube(prefix+':wheelbarrow-tray',(actual_w*.32,.62,actual_d*.21),(1.25,.18,.8),mats['rusted-steel'],.04)
          for x in (actual_w*.32-.38,actual_w*.32+.38):beam(prefix+':wheelbarrow-leg',(x,.45,actual_d*.21),(x,.08,actual_d*.21),.07,.07,mats['rusted-steel'])
          bpy.ops.mesh.primitive_torus_add(major_radius=.22,minor_radius=.055,major_segments=16,minor_segments=6,location=t.game_vector((actual_w*.32,.24,actual_d*.21)))
          bpy.context.object.name=prefix+':wheelbarrow-wheel';bpy.context.object.data.materials.append(mats['iron-dark'])
        elif stage==2:
          # Visible cut trenches, discrete footings, spoil and a timber stack.
          for z in (zs[0],zs[-1]):
            cube(prefix+':open-foundation-trench',(0,.02,z),(actual_w,.12,.58),mats['iron-dark'],.008)
            for side in (-1,1):cube(prefix+':dug-spoil-bank',(0,.14,z+side*.48),(actual_w,.22,.30),mats['sand'],.04)
            for x in xs:
              cube(prefix+':stone-footing',(x,.22,z),(.72,.42,.72),mats['cracked-concrete'],.025)
              cube(prefix+':cut-in-footing',(x,.045,z),(.88,.035,.92),mats['iron-dark'],.008)
          for x in (xs[0],xs[-1]):cube(prefix+':side-trench',(x,.03,0),(.66,.08,actual_d),mats['sand'],.015)
          for i in range(26):
            x=rng.uniform(-actual_w*.52,actual_w*.52);z=rng.uniform(-actual_d*.52,actual_d*.52)
            cube(prefix+':spoil-heap',(x,.12+rng.random()*.17,z),(.35+rng.random()*.5,.18+rng.random()*.2,.28+rng.random()*.5),mats['salvaged-brick'],.015)
          for i in range(12):beam(prefix+':ready-timber',(-actual_w*.43+i*.22,.18,actual_d*.4),(-actual_w*.43+i*.22+2,.2,actual_d*.4),.20,.16,mats['weathered-plank'])
        else:
          # Repeated members never scale with footprint: 22 cm posts, 17 cm
          # beams and 10 cm braces in real 3.5 m bays.
          for x in xs:
            for z in zs:
              cube(prefix+':concrete-pad',(x,.18,z),(.58,.36,.58),mats['cracked-concrete'])
              beam(prefix+':timber-post',(x,.36,z),(x,6.3,z),.22,.22,random.choice(timber_variants))
              for y in (3.0,6.0):cube(prefix+':joint-plate',(x,y,z),(.3,.34,.3),mats['rusted-steel'])
          for y in (3.0,6.0):
            for z in zs:beam(prefix+':cross-beam',(xs[0],y,z),(xs[-1],y,z),.17,.20,random.choice(timber_variants))
            for x in xs:beam(prefix+':side-beam',(x,y,zs[0]),(x,y,zs[-1]),.17,.20,random.choice(timber_variants))
          for ix in range(nx):
            x0,x1=xs[ix],xs[ix+1]
            for z in (zs[0],zs[-1]):beam(prefix+':knee-brace',(x0,.3,z),(x0+1.05,1.45,z),.10,.12,mats['rusted-steel'])
            beam(prefix+':knee-brace',(x0,4.15,zs[0]),(x0+1.05,5.3,zs[0]),.10,.12,mats['rusted-steel'])
          # A coherent 3.5 m building bay sits within the scaffolded grid.
          inner_x=min(actual_w,3.5);inner_z=min(actual_d,3.5);ix0=-inner_x/2;ix1=inner_x/2;iz0=-inner_z/2;iz1=inner_z/2
          for x in (ix0,ix1):
            for z in (iz0,iz1):beam(prefix+':house-post',(x,.38,z),(x,5.8,z),.22,.22,random.choice(timber_variants))
          for y in (3.0,5.8):
            for z in (iz0,iz1):beam(prefix+':house-beam',(ix0,y,z),(ix1,y,z),.17,.20,random.choice(timber_variants))
            for x in (ix0,ix1):beam(prefix+':house-beam',(x,y,iz0),(x,y,iz1),.17,.20,random.choice(timber_variants))
          # plank scaffold along only the road side, with full-size standards
          face=zs[0]
          for x in (ix0-.35,ix1+.35):beam(prefix+':scaffold-standard',(x,.1,face-.72),(x,4.1,face-.72),.20,.20,mats['weathered-plank'])
          beam(prefix+':scaffold-ledger',(ix0-.35,2.3,face-.72),(ix1+.35,2.3,face-.72),.17,.20,mats['weathered-plank'])
          for i in range(6):cube(prefix+':scaffold-plank',(ix0-.25+i*.5,2.42,face-.72),(.48,.16,.78),random.choice(timber_variants),.01)
          # Real ladder and pulley hoist.
          for x in (ix1-.75,ix1-.15):beam(prefix+':ladder-rail',(x,.1,face-.08),(x-.22,3.45,face-.08),.10,.12,mats['weathered-plank'])
          for i in range(11):beam(prefix+':ladder-rung',(ix1-.88+i*.002,.3+i*.27,face-.12),(ix1-.34+i*.002,.3+i*.27,face-.12),.055,.07,mats['weathered-plank'])
          beam(prefix+':hoist-arm',(ix0,6.25,face),(ix0,6.25,face-2.5),.20,.22,mats['weathered-plank'])
          t.pipe_run(prefix+':hoist-rope',[(ix0,6.2,face-2.3),(ix0,3.0,face-2.3)],.025,mats['iron-dark'])
          bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.19,depth=.3,location=t.game_vector((ix0,2.75,face-2.3)))
          bucket=bpy.context.object;bucket.name=prefix+':hoist-bucket';bucket.data.materials.append(mats['galvanised-tin'])
          if stage==4:
            # Nearly done: clad all four perimeter walls with fixed-width
            # panels; every footprint keeps the same sheet and bay scale.
            for i in range(nx):
              cx=(xs[i]+xs[i+1])/2
              for z in (zs[0],zs[-1]):
                sheet=tin_panel(prefix+':corrugated-wall',(cx,3.2,z),bay,5.8,bent=.018*(i%2));sheet.data.materials.clear();sheet.data.materials.append(random.choice(tin_variants))
            for i in range(nz):
              cz=(zs[i]+zs[i+1])/2
              for x in (xs[0],xs[-1]):
                sheet=tin_panel(prefix+':corrugated-side-wall',(x,3.2,cz),bay,5.8,bent=.018*(i%2));sheet.rotation_euler[2]=math.pi/2;sheet.data.materials.clear();sheet.data.materials.append(random.choice(tin_variants))
            for ix in range(nx):
              for iz in range(nz):
                roof=cube(prefix+':patched-roof',((xs[ix]+xs[ix+1])/2,6.08,(zs[iz]+zs[iz+1])/2),(bay,.14,bay),tin_variants[(ix+iz)%len(tin_variants)],.012)
            # short lean-to scaffold remains on one side
            for x in (ix0-.25,ix1+.25):beam(prefix+':lean-to-standard',(x,.1,iz1+.55),(x,3.0,iz1+.55),.15,.15,mats['weathered-plank'])
            beam(prefix+':lean-to-ledger',(ix0-.25,2.1,iz1+.55),(ix1+.25,2.1,iz1+.55),.14,.16,mats['weathered-plank'])
            for i in range(4):cube(prefix+':lean-to-plank',(ix0-.1+i*.42,2.2,iz1+.55),(.4,.12,.65),mats['weathered-plank'],.008)
            for i in range(4):
              sheet=t.corrugated_sheet(prefix+':leaning-sheet',(ix1+1.0+i*.18,.95,iz1+.2),1.2,2.1,mats,bent=.06,turn=.3);sheet.rotation_euler[0]=-.38
          else:
            # Open frame roof joists and partial upper deck: structure stays legible.
            for i in range(5):beam(prefix+':roof-joist',(ix0,.16+5.85,iz0+i*inner_z/4),(ix1,.16+5.85,iz0+i*inner_z/4),.15,.18,mats['weathered-plank'])
        for o in set(scene.objects)-start:
          if o.parent is None:o.parent=root
    def scaffold_two_storey(prefix,root):
        """One 16 m cell: full timber structure, two decks and site clutter."""
        rng=random.Random(503)
        half=7.28
        wood=lambda label: rng.choice(timber_variants)
        steel=lambda label: rng.choice(steel_variants)
        tin=lambda label: rng.choice(tin_variants)
        def member(name,a,b,w,d,material):
            obj=rectangular_beam(a,b,w,d,material,name);obj.parent=root;return obj
        def plank(name,center,size,material,angle=0):
            obj=cube(name,center,size,material,.018);obj.rotation_euler[2]=angle;obj.parent=root;return obj

        # Four substantial posts on individual concrete bearing blocks.
        for ix,x in enumerate((-half,half)):
          for iz,z in enumerate((-half,half)):
            plank(f'{prefix}:concrete-block-{ix}-{iz}',(x,.20,z),(.58,.40,.58),mats['cracked-concrete'])
            member(f'{prefix}:corner-post-{ix}-{iz}',(x,.38,z),(x,8,z),.20,.20,wood('post'))
            # Dark strap plates, bolts and a bearing saddle make the joints read as joined pieces.
            for y in (2.86,5.86):
              plank(f'{prefix}:post-strap-{ix}-{iz}-{int(y)}',(x,y,z),(.28,.34,.26),steel('strap'))
              for dx in (-.085,.085):
                bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=.032,location=t.game_vector((x+dx,y,z-.145)))
                bolt=bpy.context.object;bolt.name=f'{prefix}:bolt-{ix}-{iz}-{int(y)}';bolt.data.materials.append(mats['iron-dark']);bolt.parent=root
        # Foundation work remains visible around the approved frame: a cut
        # trench, spare footing blocks and a low, uneven spoil pile.
        for x in (-5.6,5.6):
          trench=cube(f'{prefix}:foundation-trench-{x}',(x,.025,5.25),(.58,.05,3.6),mats['sand'],.02);trench.parent=root
        for i in range(5):
          block=cube(f'{prefix}:spare-foundation-block-{i}',(-5.6+i*.42,.22,6.55),(.38,.44,.42),mats['cracked-concrete'],.025);block.parent=root
        for i in range(14):
          x=-1.2+(i%5)*.48;z=6.3+(i//5)*.38;y=.12+(i%3)*.09
          spoil=cube(f'{prefix}:foundation-spoil-{i}',(x,y,z),(.34+(i%2)*.19,.16,.25+(i%3)*.08),mats['salvaged-brick'],.025)
          spoil.rotation_euler[2]=-.5+(i%4)*.28;spoil.parent=root

        # Mid-bay standards carry the long floor beams and make the 16 m
        # structure read as working scaffold rather than four isolated poles.
        for face,(x,z) in enumerate(((0,-half),(0,half),(-half,0),(half,0))):
          plank(f'{prefix}:mid-bay-block-{face}',(x,.20,z),(.52,.40,.52),mats['cracked-concrete'])
          member(f'{prefix}:mid-bay-post-{face}',(x,.38,z),(x,7.96,z),.20,.20,wood('mid-bay post'))
          for y in (2.86,5.86):
            plank(f'{prefix}:mid-bay-strap-{face}-{int(y)}',(x,y,z),(.27,.34,.25),steel('mid-bay strap'))

        # A complete perimeter frame at each storey and at the hoist head.
        for level in (3.0,6.0):
          for z in (-half,half):member(f'{prefix}:floor-beam-{level}-{z}',(-half,level,z),(half,level,z),.15,.20,steel('beam'))
          for x in (-half,half):member(f'{prefix}:side-beam-{level}-{x}',(x,level,-half),(x,level,half),.15,.20,steel('beam'))
          # Cross joists and full working decks, with 25 cm boards and open gaps.
          for j,z in enumerate([round(-half+1.82*i,2) for i in range(9)]):
            member(f'{prefix}:deck-joist-{level}-{j}',(-half+.10,level-.13,z),(half-.10,level-.13,z),.12,.16,wood('joist'))
          x=-half+.18;index=0
          while x < half-.1:
            length=rng.uniform(14.0,14.38)
            start=-length/2+rng.uniform(-.08,.08)
            member(f'{prefix}:deck-plank-{level}-{index}',(start,level+.025,x),(start+length,level+.025,x),.25,.075,wood('deck plank'))
            index+=1;x+=.30
        # Top tie beams hold the cantilever and stop the four standards reading as poles.
        for z in (-half,half):member(f'{prefix}:top-tie-{z}',(-half,7.9,z),(half,7.9,z),.15,.20,steel('top tie'))
        for x in (-half,half):member(f'{prefix}:top-side-tie-{x}',(x,7.9,-half),(x,7.9,half),.15,.20,steel('top side tie'))

        # Two braced faces, each with a true X in both storey bays.
        for face,z in enumerate((-half,half)):
          for floor,(low,high) in enumerate(((.35,2.85),(3.15,5.85),(6.15,7.75))):
            member(f'{prefix}:front-X-{face}-{floor}-a',(-half+.12,low,z),(half-.12,high,z),.10,.15,steel('brace'))
            member(f'{prefix}:front-X-{face}-{floor}-b',(half-.12,low,z),(-half+.12,high,z),.10,.15,steel('brace'))
        for face,x in enumerate((-half,half)):
          for floor,(low,high) in enumerate(((.35,2.85),(3.15,5.85),(6.15,7.75))):
            member(f'{prefix}:side-X-{face}-{floor}-a',(x,low,-half+.12),(x,high,half-.12),.10,.15,steel('brace'))
            member(f'{prefix}:side-X-{face}-{floor}-b',(x,low,half-.12),(x,high,-half+.12),.10,.15,steel('brace'))
        # Short guard rails are thick timber, not wire.
        for level in (3.65,6.65):
          for z in (-half,half):member(f'{prefix}:guard-rail-{level}-{z}',(-half,level,z),(half,level,z),.10,.14,wood('guard'))
          for x in (-half,half):member(f'{prefix}:side-guard-{level}-{x}',(x,level,-half),(x,level,half),.10,.14,wood('guard'))

        # One wall face is half-clad with uneven, overlapping corrugated sheets.
        for i,x in enumerate((-5.45,-2.75,0,.2,2.95,5.5)):
          sheet=t.corrugated_sheet(f'{prefix}:half-wall-tin-{i}',(x,4.5,-half+.06),2.7,3.0,mats,bent=.015*(i%2))
          sheet.parent=root;sheet.data.materials.clear();sheet.data.materials.append(tin('wall tin'))
        # A ground-to-first-deck ladder with substantial rails and closely spaced rungs.
        ladder_x=4.4;front=-half-.22
        for side in (0,1):
          member(f'{prefix}:ladder-rail-{side}',(ladder_x+side*.58,.08,front),(ladder_x-.20+side*.58,3.35,front),.10,.15,wood('ladder rail'))
        for rung in range(11):
          y=.30+rung*.28;offset=-.20*(y/3.35)
          member(f'{prefix}:ladder-rung-{rung}',(ladder_x+offset,y,front-.015),(ladder_x+.58+offset,y,front-.015),.065,.08,wood('ladder rung'))
        for y in (.22,3.12):
          member(f'{prefix}:ladder-tie-{y}',(ladder_x-.04,y,front+.03),(ladder_x+.62,y,front+.03),.07,.08,steel('ladder tie'))

        # Cantilever timber arm, triangular stay, pulley, rope and galvanized bucket.
        member(f'{prefix}:hoist-arm',(-2.4,8.08,-4.5),(-2.4,8.08,-7.65),.22,.26,wood('hoist arm'))
        member(f'{prefix}:hoist-stay',(-2.4,6.1,-4.6),(-2.4,8.05,-6.85),.14,.18,steel('hoist stay'))
        member(f'{prefix}:hoist-post',(-2.4,7.9,-4.6),(-2.4,8.4,-4.6),.20,.20,wood('hoist post'))
        pulley_center=t.game_vector((-2.4,8.12,-7.35))
        bpy.ops.mesh.primitive_torus_add(major_radius=.22,minor_radius=.055,major_segments=20,minor_segments=8,location=pulley_center)
        pulley=bpy.context.object;pulley.name=f'{prefix}:pulley-wheel';pulley.rotation_euler[0]=math.pi/2;pulley.data.materials.append(mats['rusted-steel']);pulley.parent=root
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.055,depth=.30,location=pulley_center)
        axle=bpy.context.object;axle.name=f'{prefix}:pulley-axle';axle.rotation_euler[0]=math.pi/2;axle.data.materials.append(mats['iron-dark']);axle.parent=root
        t.pipe_run(prefix+':hoist-rope',[(-2.4,8.12,-7.35),(-2.4,5.05,-7.35)],.025,mats['iron-dark'])
        for obj in set(scene.objects):
          if obj.name.startswith(prefix+':hoist-rope') and obj.parent is None:obj.parent=root
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.24,depth=.48,location=t.game_vector((-2.4,4.75,-7.35)))
        bucket=bpy.context.object;bucket.name=f'{prefix}:galvanized-bucket';bucket.data.materials.append(mats['galvanised-tin']);bucket.parent=root
        bpy.ops.mesh.primitive_torus_add(major_radius=.24,minor_radius=.035,major_segments=16,minor_segments=6,location=t.game_vector((-2.4,4.98,-7.35)))
        rim=bpy.context.object;rim.name=f'{prefix}:bucket-rim';rim.data.materials.append(mats['rusted-steel']);rim.parent=root
        for side in (-1,1):
          bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=.035,location=t.game_vector((-2.4+side*.18,5.02,-7.35)))
          lug=bpy.context.object;lug.name=f'{prefix}:bucket-lug-{side}';lug.data.materials.append(mats['rusted-steel']);lug.parent=root

        # One loose leaning sheet and only loose materials on the dirt, not a ground plate.
        leaning=t.corrugated_sheet(f'{prefix}:leaning-tin',(6.05,1.35,-1.7),2.35,2.7,mats,bent=.08,turn=.12)
        leaning.parent=root;leaning.rotation_euler[0]=-.42;leaning.data.materials.clear();leaning.data.materials.append(tin('leaning tin'))
        for i in range(7):
          x=-5.5+i*.33
          member(f'{prefix}:offcut-plank-{i}',(x,.12+i*.065,-7.58),(x+rng.uniform(1.4,2.8),.18+i*.065,-7.58+rng.uniform(-.25,.25)),.14,.075,wood('offcut'))
        for i in range(18):
          x=rng.uniform(3.8,6.7);z=rng.uniform(-7.6,-6.9);y=rng.uniform(.12,.36)
          chunk=cube(f'{prefix}:rubble-{i}',(x,y,z),(rng.uniform(.24,.62),rng.uniform(.12,.34),rng.uniform(.20,.55)),mats['salvaged-brick'],.025)
          chunk.rotation_euler[0]=rng.uniform(-.4,.4);chunk.rotation_euler[2]=rng.uniform(-.9,.9);chunk.parent=root
        for i in range(5):
          sheet=t.corrugated_sheet(f'{prefix}:tin-stack-{i}',(5.65,.10+i*.055,-7.48),2.6,.78,mats,bent=.01*i)
          sheet.rotation_euler[0]=math.pi/2;sheet.parent=root;sheet.data.materials.clear();sheet.data.materials.append(tin('stack tin'))
        for i in range(4):
          bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=t.game_vector((-6.5+i*.48,.31,-7.28)))
          sack=bpy.context.object;sack.name=f'{prefix}:dusty-sack-{i}';sack.scale=(.46,.25,.34);sack.data.materials.append(mats['patched-canvas']);sack.parent=root
        # The upper deck dominates the mayor's view. Darken it with uneven
        # site wear and break the regular plank grid with loose boards/tools.
        stainmat=photo_material(prefix+' / deck stain',texture_dir/'rusted-steel.jpg',(.32,.29,.25),.12)
        for i,(x,z,sx,sz) in enumerate(((-4.6,-3.9,1.8,.72),(-2.0,4.8,1.35,.62),(3.7,2.1,.9,.52))):
          stain=cube(f'{prefix}:deck-oil-stain-{i}',(x,6.061,z),(sx,.012,sz),stainmat,.025);stain.parent=root
        for i in range(8):
          x=-5.2+i*.47
          member(f'{prefix}:scattered-deck-plank-{i}',(x,6.11,4.6),(x+rng.uniform(.8,2.4),6.11,4.6+rng.uniform(-.3,.3)),.22,.08,wood('loose deck plank'))
        for i in range(4):
          member(f'{prefix}:tool-pile-{i}',(4.6+i*.16,6.14,3.8),(5.0+i*.12,6.14,4.0+i*.06),.07,.045,steel('hand tool'))
    for n in range(1,5):
      w=d=8*n-1;root=bpy.data.objects.new(f'scaffold-{n}',None);scene.collection.objects.link(root);root.parent=family;roots.append(root)
      scaffold(f'scaffold-{n}',w,d,6.3,n)
    for n in range(1,5):
      prefix=f'rubble-{n}';root=bpy.data.objects.new(prefix,None);scene.collection.objects.link(root);root.parent=family;roots.append(root);rng=random.Random(880+n); span=6.6*n
      for k in range(36+8*n):
        x=rng.uniform(-span/2,span/2);z=rng.uniform(-span/2,span/2);ridge=max(0,1-max(abs(x),abs(z))/(span*.56));y=.12+rng.random()*(.22+ridge*1.65);a=rng.uniform(.45,1.45)
        mat=rng.choice([mats['salvaged-brick'],mats['cracked-concrete'],mats['sand'],charred])
        o=cube(prefix+':broken-masonry',(x,y,z),(a,rng.uniform(.12,.38),rng.uniform(.12,.50)),mat)
        o.rotation_euler[0]=rng.uniform(-.7,.7);o.rotation_euler[2]=rng.uniform(-.9,.9);o.parent=root
      # Few readable structural remains rise above the rubble; dark timber is
      # mixed with rusted roof steel, rather than a pile of identical blocks.
      for k in range(10):rectangular_beam((rng.uniform(-span*.4,span*.4),.2,rng.uniform(-span*.4,span*.4)),(rng.uniform(-span*.4,span*.4),rng.uniform(1,3.6),rng.uniform(-span*.4,span*.4)),.18,.20,charred,prefix+':collapsed-rafter').parent=root
      for k in range(1):
        sheet=t.corrugated_sheet(prefix+':fallen-tin',(rng.uniform(-span*.3,span*.3),.42+k*.08,rng.uniform(-span*.3,span*.3)),rng.uniform(1.2,2.4),rng.uniform(.8,1.4),mats,bent=rng.uniform(-.18,.18),turn=rng.uniform(-.22,.22))
        sheet.rotation_euler[0]=math.pi/2+rng.uniform(-.28,.28);sheet.rotation_euler[2]=rng.uniform(-.8,.8);sheet.parent=root
    for n in range(1,5):
      prefix=f'burnt-{n}';root=bpy.data.objects.new(prefix,None);scene.collection.objects.link(root);root.parent=family;roots.append(root);span=8*n-1;h=6.6
      for x in (-span*.42,span*.42):
        for z in (-span*.42,span*.42):rectangular_beam((x,.08,z),(x,h*(.72 if x<0 else 1),z),.25,.25,charred,prefix+':charred-post').parent=root
      for y in (h*.36,h*.72):
        rectangular_beam((-span*.48,y,-span*.42),(span*.48,y*.92,span*.42),.16,.18,charred,prefix+':blackened-beam').parent=root
      for x in (-span*.42,span*.42):rectangular_beam((x,h*.72,-span*.42),(x*.6,h*.5,span*.42),.13,.15,charred,prefix+':broken-rafter').parent=root
      for i in range(3):
        x=-span*.28+i*span*.28
        rectangular_beam((x,h*.62,-span*.25),(x*.55,.22,span*.38),.14,.17,charred,prefix+':collapsed-charred-rafter').parent=root
      if n>1:
        sheet=t.corrugated_sheet(prefix+':scorched-tin',(span*.24,.9,-span*.44),span*.25,1.8,mats,bent=.14,turn=.10)
        sheet.rotation_euler[0]=-.22;sheet.parent=root
      for i in range(2):
        sheet=t.corrugated_sheet(prefix+':collapsed-roof-tin',(-.7+i*1.4,.66,span*.12),2.5,2.8,mats,bent=.18,turn=(-.24,.28)[i])
        sheet.rotation_euler[0]=math.pi/2+(-.15,.12)[i];sheet.parent=root
      rng=random.Random(410+n)
      for i in range(50+4*n):
        x=rng.uniform(-span*.42,span*.42);z=rng.uniform(-span*.42,span*.42);ridge=max(0,1-max(abs(x),abs(z))/(span*.52));y=.12+rng.random()*(.20+ridge*1.45)
        chunk=cube(prefix+':charcoal-and-brick',(x,y,z),(.30+rng.random()*.62,.20+rng.random()*.36,.26+rng.random()*.48),rng.choice((charred,mats['salvaged-brick'],mats['cracked-concrete'])))
        chunk.rotation_euler[2]=rng.uniform(-1,1);chunk.parent=root
      ember=bpy.data.materials.new(prefix+' ember glow');ember.diffuse_color=(1,.12,.015,1);ember.use_nodes=True;bs=ember.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,.035,.002,1);bs.inputs['Emission Color'].default_value=(1,.035,.002,1);bs.inputs['Emission Strength'].default_value=2
      e=cube(prefix+':ember',(0,.12,0),(.34,.18,.34),ember,.03);e.parent=root;e.name=prefix+':ember'
    # under-cell street objects; separate emissive named children where specified
    def prop(id):
      r=bpy.data.objects.new(id,None);scene.collection.objects.link(r);r.parent=family;roots.append(r);return r
    r=prop('street-lamp');beam('street-lamp:post',(0,0,0),(0,4.2,0),.09,mats['rusted-steel']).parent=r;beam('street-lamp:arm',(0,4.0,0),(.65,4.15,0),.07,mats['rusted-steel']).parent=r
    em=bpy.data.materials.new('street lamp emission');em.diffuse_color=(1,.28,.035,1);em.use_nodes=True
    embs=em.node_tree.nodes.get('Principled BSDF');embs.inputs['Base Color'].default_value=(1,.28,.035,1);embs.inputs['Emission Strength'].default_value=2.5;embs.inputs['Emission Color'].default_value=(1,.28,.035,1)
    cube('street-lamp:head-housing',(.7,4.15,0),(.46,.20,.34),mats['rusted-steel'],.035).parent=r
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.27,radius2=.20,depth=.14,location=t.game_vector((.7,4.0,0)))
    shade=bpy.context.object;shade.name='street-lamp:shade';shade.data.materials.append(mats['rusted-steel']);shade.parent=r
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.13,location=t.game_vector((.7,3.92,0)))
    lamp=bpy.context.object;lamp.name='street-lamp:lamp';lamp.data.materials.append(em);lamp.scale=(1,.65,1);lamp.parent=r
    r=prop('barrel-fire');t.drum('barrel-fire:drum',(0,.48,0),mats);[setattr(o,'parent',r) for o in set(scene.objects) if o.name.startswith('barrel-fire:') and o.parent is None]
    flame=bpy.data.materials.new('barrel fire amber emission');flame.diffuse_color=(.36,.035,.002,1);flame.use_nodes=True
    flame_bs=flame.node_tree.nodes.get('Principled BSDF');flame_bs.inputs['Base Color'].default_value=(.36,.035,.002,1);flame_bs.inputs['Emission Color'].default_value=(.36,.035,.002,1);flame_bs.inputs['Emission Strength'].default_value=.7
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.22,radius2=.015,depth=.62,location=t.game_vector((0,1.15,0)))
    e=bpy.context.object;e.name='barrel-fire:lamp';e.data.materials.append(flame);e.scale=(1,.9,.8);e.parent=r
    for side in (-1,1):
      bpy.ops.mesh.primitive_cone_add(vertices=9,radius1=.12,radius2=.008,depth=.38,location=t.game_vector((side*.14,1.13,.02)))
      tongue=bpy.context.object;tongue.name=f'barrel-fire:flame-tongue-{side}';tongue.data.materials.append(flame);tongue.rotation_euler[1]=side*.22;tongue.parent=r
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.11,location=t.game_vector((0,1.0,-.035)))
    core=bpy.context.object;core.name='barrel-fire:hot-core';core.data.materials.append(em);core.parent=r
    for id,count in [('crate-stack',3),('barrels',3),('washing-line',1),('bench',1),('bin',1),('signpost',1),('sandbags',1),('junk-pile',1),('dead-tree',1)]:
      r=prop(id)
      if id=='crate-stack':
        for x,y,z in [(-.42,.4,0),(.42,.4,0),(0,1.15,0)]:cube(id+':crate',(x,y,z),(.78,.78,.78),mats['weathered-plank']).parent=r
      elif id=='barrels':
        for x in (-.42,.42):
          t.drum(id+':drum',(x,.48,0),mats)
          for o in set(scene.objects):
            if o.name.startswith(id+':drum') and o.parent is None:o.parent=r
      elif id=='washing-line':
        beam(id+':post-left',(-1.05,0,0),(-1.05,2.2,0),.09,mats['weathered-plank']).parent=r
        beam(id+':post-right',(1.05,0,0),(1.05,2.0,0),.09,mats['weathered-plank']).parent=r
        t.washing_line(id,(-1,2,0),(1,1.8,0),mats);[setattr(o,'parent',r) for o in set(scene.objects) if o is not r and o.name.startswith(id) and o.parent is None]
      elif id=='bench':
        cube(id+':seat',(0,.55,0),(1.5,.12,.48),mats['weathered-plank']).parent=r
        for x in (-.58,.58):beam(id+':leg',(x,.08,0),(x,.55,0),.09,mats['rusted-steel']).parent=r
        cube(id+':back',(0,.95,.2),(1.5,.7,.1),mats['weathered-plank']).parent=r
      elif id=='bin':cube(id+':body',(0,.55,0),(.72,1.1,.72),mats['rusted-steel']).parent=r;cube(id+':lid',(0,1.13,0),(.82,.1,.82),mats['galvanised-tin']).parent=r
      elif id=='signpost':
        beam(id+':post',(0,0,0),(0,2.4,0),.1,mats['rusted-steel']).parent=r
        for i in range(3):cube(id+':arrow',(0,1.0+i*.55,0),(.9,.28,.07),mats['galvanised-tin']).parent=r
      elif id=='sandbags':
        for course in range(3):
          for i in range(4):
            x=-.85+(i+(course%2)*.5)*.48;y=.2+course*.30
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=1,location=t.game_vector((x,y,0)))
            sack=bpy.context.object;sack.name=f'{id}:course-{course+1}-bag-{i+1}';sack.scale=(.25,.16,.17);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);sack.data.materials.append(mats['patched-canvas']);sack.parent=r
        [setattr(o,'parent',r) for o in set(scene.objects) if o is not r and o.name.startswith(id) and o.parent is None]
      elif id=='junk-pile':
        rng=random.Random(55)
        for i in range(24):
          o=cube(id+':scrap',(rng.uniform(-.7,.7),rng.uniform(.18,.9),rng.uniform(-.58,.58)),(rng.uniform(.45,1.05),rng.uniform(.12,.30),rng.uniform(.35,.82)),random.choice(steel_variants),.015);o.rotation_euler[2]=rng.uniform(-1,1);o.parent=r
        bent=t.corrugated_sheet(id+':bent-salvage-sheet',(.18,.64,-.28),1.5,1.15,mats,bent=.16,turn=.18);bent.parent=r;bent.data.materials.clear();bent.data.materials.append(random.choice(tin_variants))
      else:
        beam(id+':trunk',(0,0,0),(.12,2.8,0),.25,mats['iron-dark']).parent=r
        for j in range(5):beam(id+':branch',(0,1+j*.28,0),((-.8 if j%2 else .8),1.5+j*.28,0),.11,mats['iron-dark']).parent=r
    # normalize every object into its declared child root and export GLB
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
      if o.type=='MESH' and o.parent is None:
        match=next((r for r in roots if o.name.startswith(r.name+':')),None)
        if match:o.parent=match
    # Keep each named building root, but join static mesh pieces within it by
    # material. Emissive parts keep their required names. This only changes
    # object packaging, not any other id's shape or surface.
    # Blender joins UV layers by name. Give every material mesh one shared
    # coordinate layer so the GLB carries texture coordinates as TEXCOORD_0.
    for obj in scene.objects:
      if obj.type=='MESH':
        if len(obj.data.uv_layers)==0:obj.data.uv_layers.new(name='UVMap')
        for layer in obj.data.uv_layers:layer.name='UVMap'
    for building in roots:
      merge_groups={}
      for obj in scene.objects:
        if obj.type!='MESH' or obj.parent is not building:continue
        if obj.name.endswith(':lamp') or obj.name.endswith(':ember'):continue
        signature=tuple(mat.name for mat in obj.data.materials)
        merge_groups.setdefault(signature,[]).append(obj)
      for signature,objects in merge_groups.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        bpy.context.view_layer.objects.active.name=f'{building.name}:members:{signature[0]}'
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_yup=True,
      export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=65,
      export_normals=False)
    # Fidelity images must come from the game deliverable, in an empty scene.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
    scene.world=bpy.data.worlds.new('Even overcast world');scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.72,.75,.77,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.72
    family_root=next(obj for obj in scene.objects if obj.name=='town-stages')
    ground=bpy.data.materials.new('Plain mid-brown render dirt');ground.diffuse_color=(.20,.14,.085,1);ground.use_nodes=True
    ground.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.08,.05,.025,1)
    floor=t.cube('render-only plain brown dirt',(0,-.08,0),(300,.16,300),ground,0)
    bpy.ops.object.light_add(type='AREA',location=t.game_vector((0,15,-10)));bpy.context.object.data.energy=18000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=16
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    def show_only(root_names):
      visible={next(obj for obj in scene.objects if obj.name==name) for name in root_names}
      for obj in scene.objects:
        if obj.type!='MESH':continue
        ancestor=obj
        while ancestor.parent is not None and ancestor.parent is not family_root:ancestor=ancestor.parent
        obj.hide_render=ancestor not in visible
    def render_view(name,location,target,lens):
      camera_location=t.game_vector(location);look_at=t.game_vector(target)
      bpy.ops.object.camera_add(location=camera_location);cam=bpy.context.object
      cam.rotation_euler=(look_at-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens
      scene.camera=cam;scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
      scene.render.image_settings.file_format='PNG';scene.render.filepath=str(EVIDENCE/name);bpy.ops.render.render(write_still=True)
      bpy.data.objects.remove(cam,do_unlink=True)
    for n in range(1,5):
      show_only({1:['scaffold-1'],2:['scaffold-2'],3:['scaffold-3'],4:['scaffold-4']}[n])
      scale=8*n;target_y=.5 if n<3 else 3.2
      render_view(f'stage-{n}-low.png',(scale*1.05,1.7,-scale*1.2),(0,target_y,0),50)
      render_view(f'stage-{n}-mayor.png',(30,46.4,-30),(0,target_y,0),280/n)
    show_only(['scaffold-4'])
    # 60 m range, 45 degree down angle; the longer lens keeps the cell large.
    render_view('mayor-45deg-60m.png',(30,46.4,-30),(0,4,0),42)
    show_only(['burnt-1'])
    render_view('burnt-ruin-low.png',(14,5,-18),(0,2.2,0),52)
    render_view('burnt-ruin-mayor.png',(30,46.4,-30),(0,3.2,0),280)
    for prop_id in ('street-lamp','barrel-fire','crate-stack','barrels','washing-line','bench','bin','signpost','sandbags','junk-pile','dead-tree'):
      show_only([prop_id])
      scale_figure=[]
      if prop_id=='street-lamp':
        figure_mat=bpy.data.materials.new('render-only scale figure');figure_mat.diffuse_color=(.18,.16,.13,1);figure_mat.use_nodes=True
        figure_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.18,.16,.13,1)
        fx=-.9
        scale_figure.append(t.cube('render-only person torso',(fx,1.05,0),(.34,.58,.24),figure_mat,.05))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.13,location=t.game_vector((fx,1.48,0)))
        scale_figure.append(bpy.context.object);scale_figure[-1].name='render-only person head';scale_figure[-1].data.materials.append(figure_mat)
        for side in (-1,1):
          scale_figure.append(rectangular_beam((fx+side*.1,.72,0),(fx+side*.13,.02,0),.10,.12,figure_mat,'render-only leg'))
          scale_figure.append(rectangular_beam((fx+side*.2,1.27,0),(fx+side*.33,.82,0),.075,.09,figure_mat,'render-only arm'))
      tall=prop_id in ('street-lamp','signpost','dead-tree')
      target_y={'street-lamp':2.1,'signpost':1.2,'dead-tree':1.4}.get(prop_id,1.0)
      camera=(5.2,4.4,-7.2) if prop_id=='street-lamp' else ((4.2,3.2,-5.4) if tall else (4.0,2.8,-5.2))
      render_view(f'{prop_id}.png',camera,(0,target_y,0),48 if prop_id=='street-lamp' else 56)
      render_view(f'{prop_id}-mayor.png',(30,46.4,-30),(0,target_y,0),400)
      for part in scale_figure:bpy.data.objects.remove(part,do_unlink=True)
if __name__=='__main__':build()
