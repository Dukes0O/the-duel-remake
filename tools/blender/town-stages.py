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
    obj=t.cube(name,((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),(width,delta.length,depth),material,min(.025,width*.12,depth*.12))
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return obj

rectangular_beam=beam

OUT=Path(__file__).resolve().parents[2]/'public/assets/models/wasteland/town/stages.glb'
EVIDENCE=Path(__file__).resolve().parents[2]/'.evidence/2026-11-05/TOWN-ART-STAGES'
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
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=900;scene.render.resolution_y=620;scene.render.resolution_percentage=100
    scene.world.color=(.62,.62,.62)
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.75,.78,.82,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
    scene.view_settings.view_transform='AgX'
    family=bpy.data.objects.new('town-stages',None);scene.collection.objects.link(family);roots=[]
    def cube(n,c,s,m,bev=.025):return t.cube(n,c,s,m,bev)
    def beam(n,a,b,w,m):return t.beam(n,a,b,w,m)
    def scaffold(prefix,w,d,h,stage):
        start=set(scene.objects)
        # Each early stage tells a different point in the build sequence.
        if stage == 1:
          for side in (-1,1):
            beam(prefix+':foundation-trench',(-w*.40,.04,side*d*.40),(w*.40,.04,side*d*.40),.42,mats['iron-dark'])
          for x in (-w*.42,w*.42):
            for z in (-d*.42,d*.42):
              cube(prefix+':layout-peg',(x,.24,z),(.10,.48,.10),mats['weathered-plank'])
              beam(prefix+':layout-string',(x,.42,z),(-x,.42,-z),.018,mats['patched-canvas'])
        else:
          # Visible masonry pads lift every standard clear of the dirt.
          for x in (-w*.47,w*.47):
            for z in (-d*.47,d*.47):
              cube(prefix+':base-block',(x,.18,z),(.48,.36,.48),mats['cracked-concrete'],.035)
        # timber standards, steel ledgers, cross braces and real plank walkways
        for x in (-w*.47,w*.47):
          for z in (-d*.47,d*.47):beam(prefix+':post',(x,.08,z),(x,h,z),.13,mats['weathered-plank'])
        levels=[.75,h*.58,h*.92] if stage>=2 else [.75,h*.82]
        for y in levels:
          for z in (-d*.47,d*.47):beam(prefix+':ledger',( -w*.5,y,z),(w*.5,y,z),.09,mats['rusted-steel'])
          for x in (-w*.47,w*.47):beam(prefix+':side-ledger',(x,y,-d*.48),(x,y,d*.48),.08,mats['rusted-steel'])
        for z in (-d*.47,d*.47):beam(prefix+':cross-brace',(-w*.46,.15,z),(w*.46,h*.84,z),.065,mats['rusted-steel'])
        for x in (-w*.47,w*.47):beam(prefix+':side-brace',(x,.15,-d*.46),(x,h*.8,d*.46),.06,mats['rusted-steel'])
        for y in levels[:-1]:
          # A narrow work platform at the scaffold face leaves the interior
          # open; full-floor decks read as a roof slab at the mayor's camera.
          for plank in range(max(4,round(w/.45))):
            px=-w*.44+plank*.44
            cube(prefix+':walkway-plank',(px,y+.07,-d*.28),(.42,.12,.78),mats['weathered-plank'],.012)
        # exposed half-wall of pressed tin and rough infill varies by stage
        if stage>=3:
          for x in (-w*.25,w*.25):
            t.corrugated_sheet(prefix+':wall-panel',(x,h*.44,-d*.49),w*.42,h*.67,mats,bent=.025*(1 if x>0 else -1))
          beam(prefix+':ridge-pole',(-w*.48,h*.94,0),(w*.48,h*.94,0),.12,mats['rusted-steel'])
        if stage == 4:
          for x in (-w*.33,w*.33):
            sheet=t.corrugated_sheet(prefix+':removed-sheet',(x,.85,-d*.62),w*.28,1.5,mats,bent=.08,turn=.48)
            sheet.rotation_euler[0]=-.28
        # ladder, rope and bucket hoist distinguish the construction silhouette
        lx=w*.31;beam(prefix+':ladder-left',(lx,.1,-d*.58),(lx-.25,h*.78,-d*.58),.075,mats['weathered-plank']);beam(prefix+':ladder-right',(lx+.42,.1,-d*.58),(lx+.17,h*.78,-d*.58),.075,mats['weathered-plank'])
        for k in range(6):beam(prefix+':ladder-rung',(lx-.2+k*.003,.25+k*h*.085,-d*.58),(lx+.36+k*.003,.25+k*h*.085,-d*.58),.045,mats['weathered-plank'])
        beam(prefix+':hoist-arm',(-w*.45,h,-d*.35),(w*.45,h,-d*.35),.085,mats['rusted-steel']);t.pipe_run(prefix+':rope',[(w*.35,h,-d*.35),(w*.35,h*.38,-d*.35)],.015,mats['iron-dark'])
        bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.16,depth=.22,location=t.game_vector((w*.35,h*.35,-d*.35)));bpy.context.object.name=prefix+':bucket';bpy.context.object.data.materials.append(mats['galvanised-tin'])
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
    for n in range(1,5):
      w=d=8*n;h=2.4+1.05*n;root=bpy.data.objects.new(f'scaffold-{n}',None);scene.collection.objects.link(root);root.parent=family;roots.append(root)
      if n==2:scaffold_two_storey('scaffold-2',root)
      else:scaffold(f'scaffold-{n}',w-1.2,d-1.2,h,n)
    for n in range(1,5):
      prefix=f'rubble-{n}';root=bpy.data.objects.new(prefix,None);scene.collection.objects.link(root);root.parent=family;roots.append(root);rng=random.Random(880+n); span=2.2*n
      for k in range(22+12*n):
        x=rng.uniform(-span/2,span/2);z=rng.uniform(-span/2,span/2);y=rng.uniform(.12,.55+1.4*n/4);a=rng.uniform(.35,1.2);o=cube(prefix+':broken-member',(x,y,z),(a,rng.uniform(.12,.28),rng.uniform(.12,.35)),rng.choice([mats['weathered-plank'],mats['rusted-steel'],mats['galvanised-tin']]),.02);o.rotation_euler[0]=rng.uniform(-.7,.7);o.rotation_euler[2]=rng.uniform(-.9,.9);o.parent=root
      for k in range(7):beam(prefix+':bent-frame',(rng.uniform(-span*.4,span*.4),.2,rng.uniform(-span*.4,span*.4)),(rng.uniform(-span*.4,span*.4),rng.uniform(1,2.4),rng.uniform(-span*.4,span*.4)),.085,mats['rusted-steel']).parent=root
    for n in range(1,5):
      prefix=f'burnt-{n}';root=bpy.data.objects.new(prefix,None);scene.collection.objects.link(root);root.parent=family;roots.append(root);span=2.5*n;h=2.5+.8*n
      for x in (-span*.42,span*.42):
        for z in (-span*.42,span*.42):beam(prefix+':charred-post',(x,.08,z),(x,h*(.72 if x<0 else 1),z),.14,mats['iron-dark']).parent=root
      for y in (h*.36,h*.72):
        beam(prefix+':blackened-beam',(-span*.48,y,-span*.42),(span*.48,y*.92,span*.42),.13,mats['rusted-steel']).parent=root
      for x in (-span*.42,span*.42):beam(prefix+':broken-rafter',(x,h*.72,-span*.42),(x*.6,h*.5,span*.42),.11,mats['iron-dark']).parent=root
      ember=bpy.data.materials.new(prefix+' ember glow');ember.diffuse_color=(1,.12,.015,1);ember.use_nodes=True;bs=ember.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,.035,.002,1);bs.inputs['Emission Color'].default_value=(1,.035,.002,1);bs.inputs['Emission Strength'].default_value=2
      e=cube(prefix+':ember',(0,.12,0),(.34,.18,.34),ember,.03);e.parent=root;e.name=prefix+':ember'
    # under-cell street objects; separate emissive named children where specified
    def prop(id):
      r=bpy.data.objects.new(id,None);scene.collection.objects.link(r);r.parent=family;roots.append(r);return r
    r=prop('street-lamp');beam('street-lamp:post',(0,0,0),(0,4.2,0),.09,mats['rusted-steel']).parent=r;beam('street-lamp:arm',(0,4.0,0),(.65,4.15,0),.07,mats['rusted-steel']).parent=r
    em=bpy.data.materials.new('street lamp emission');em.use_nodes=True;em.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=3;em.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(1,.48,.12,1);cube('street-lamp:lamp',(.68,4.08,0),(.32,.14,.25),em).parent=r
    r=prop('barrel-fire');t.drum('barrel-fire:drum',(0,.48,0),mats);[setattr(o,'parent',r) for o in set(scene.objects) if o.name.startswith('barrel-fire:') and o.parent is None]; e=cube('barrel-fire:lamp',(0,1.1,0),(.36,.28,.36),em);e.parent=r
    for id,count in [('crate-stack',3),('barrels',3),('washing-line',1),('bench',1),('bin',1),('signpost',1),('sandbags',1),('junk-pile',1),('dead-tree',1)]:
      r=prop(id)
      if id=='crate-stack':
        for x,y,z in [(-.42,.4,0),(.42,.4,0),(0,1.15,0)]:cube(id+':crate',(x,y,z),(.78,.78,.78),mats['weathered-plank']).parent=r
      elif id=='barrels':
        for x in (-.42,.42):
          t.drum(id+':drum',(x,.48,0),mats)
          for o in set(scene.objects):
            if o.name.startswith(id+':drum') and o.parent is None:o.parent=r
      elif id=='washing-line':t.washing_line(id,(-1,2,0),(1,1.8,0),mats);[setattr(o,'parent',r) for o in set(scene.objects) if o is not r and o.name.startswith(id) and o.parent is None]
      elif id=='bench':
        cube(id+':seat',(0,.55,0),(1.5,.12,.48),mats['weathered-plank']).parent=r
        for x in (-.58,.58):beam(id+':leg',(x,.08,0),(x,.55,0),.09,mats['rusted-steel']).parent=r
        cube(id+':back',(0,.95,.2),(1.5,.7,.1),mats['weathered-plank']).parent=r
      elif id=='bin':cube(id+':body',(0,.55,0),(.72,1.1,.72),mats['rusted-steel']).parent=r;cube(id+':lid',(0,1.13,0),(.82,.1,.82),mats['galvanised-tin']).parent=r
      elif id=='signpost':
        beam(id+':post',(0,0,0),(0,2.4,0),.1,mats['rusted-steel']).parent=r
        for i in range(3):cube(id+':arrow',(0,1.0+i*.55,0),(.9,.28,.07),mats['galvanised-tin']).parent=r
      elif id=='sandbags':t.sandbag_row(id,( -.8,.2,0),5,mats);[setattr(o,'parent',r) for o in set(scene.objects) if o is not r and o.name.startswith(id) and o.parent is None]
      elif id=='junk-pile':
        rng=random.Random(55)
        for i in range(14):
          o=cube(id+':scrap',(rng.uniform(-.6,.6),rng.uniform(.15,.65),rng.uniform(-.5,.5)),(rng.uniform(.25,.8),.12,rng.uniform(.2,.6)),mats['rusted-steel'],.015);o.rotation_euler[2]=rng.uniform(-1,1);o.parent=r
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
    visible_root=next(obj for obj in scene.objects if obj.name=='scaffold-2')
    family_root=next(obj for obj in scene.objects if obj.name=='town-stages')
    for obj in scene.objects:
      ancestor=obj
      while ancestor.parent is not None and ancestor.parent is not family_root:ancestor=ancestor.parent
      obj.hide_render=(obj.type=='MESH' and ancestor is not visible_root)
    ground=bpy.data.materials.new('Plain mid-brown render dirt');ground.diffuse_color=(.20,.14,.085,1);ground.use_nodes=True
    ground.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.08,.05,.025,1)
    floor=t.cube('render-only plain brown dirt',(0,-.08,0),(300,.16,300),ground,0)
    bpy.ops.object.light_add(type='AREA',location=t.game_vector((0,15,-10)));bpy.context.object.data.energy=18000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=16
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    def render_view(name,location,target,lens):
      camera_location=t.game_vector(location);look_at=t.game_vector(target)
      bpy.ops.object.camera_add(location=camera_location);cam=bpy.context.object
      cam.rotation_euler=(look_at-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens
      scene.camera=cam;scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
      scene.render.image_settings.file_format='PNG';scene.render.filepath=str(EVIDENCE/name);bpy.ops.render.render(write_still=True)
      bpy.data.objects.remove(cam,do_unlink=True)
    render_view('low-eye-1_7m.png',(20,1.7,-24),(0,4,0),50)
    # 60 m range, 45 degree down angle; the longer lens keeps the cell large.
    render_view('mayor-45deg-60m.png',(30,46.4,-30),(0,4,0),68)
if __name__=='__main__':build()
