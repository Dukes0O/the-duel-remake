"""Build the notice-board crew props as a single Y-up glTF asset.

Run with Blender 4.5:
  blender -b --python-exit-code 1 --python tools/blender/crew-favours.py -- --root .
"""
import argparse, json, math, sys
from pathlib import Path

parser=argparse.ArgumentParser(); parser.add_argument('--root',required=True); parser.add_argument('--paths-only',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]); root=Path(args.root).resolve()
out=root/'public/assets/models/wasteland/scablands/crew-favours.glb'
blend=root/'art-build/crew-favours/crew-favours.blend'
if args.paths_only: print(json.dumps({'blend':[str(blend)], 'glb':[str(out)]})); raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(root/'tools/blender')); import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; root_obj=bpy.data.objects.new('crew-favours',None); scene.collection.objects.link(root_obj)
M=town.make_materials()
def attach(o,name):
    o.name=name; o.parent=root_obj; o['part']=name.split('-')[0]; return o
def cube(n,c,s,m,b=.025): return attach(town.cube(n,c,s,m,b),n)
def beam(n,a,b,w,m): return attach(town.beam(n,a,b,w,m),n)
def cyl(n,c,r,d,m,verts=12,axis=(0,1,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d,location=town.game_vector(c)); o=bpy.context.object
    o.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler(); o.data.materials.append(m); return attach(o,n)
def sphere(n,c,s,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=town.game_vector(c)); o=bpy.context.object; o.scale=s; o.data.materials.append(m); return attach(o,n)
def label(n,c,text,mat,size=.22):
    f=bpy.data.curves.new(n,'FONT'); f.body=text; f.size=size; f.extrude=.001
    o=bpy.data.objects.new(n,f); scene.collection.objects.link(o); o.location=town.game_vector(c); o.rotation_euler=(-math.pi/2,0,0); f.materials.append(mat); return attach(o,n)

# Harpoon first: a continuous 2.5 m oak shaft, forged head, socket and hand-wound lashing.
x,z=-8,0
beam('jax-harpoon-oak-shaft',(x,.05,z),(x,2.15,z),.065,M['weathered-plank'])
cyl('jax-harpoon-socket',(x,.13,z),.092,.22,M['iron-dark'],12,(0,1,0))
beam('jax-harpoon-head',(x,.04,z),(x,.40,z),.052,M['rusted-steel'])
for side in (-1,1):
    beam(f'jax-harpoon-barb-{side}',(x,.18,z),(x+side*.13,.04,z),.034,M['rusted-steel'])
for i in range(7): beam(f'jax-harpoon-lashing-{i}',(x-.055,.33+i*.025,z),(x+.055,.33+i*.025,z),.012,M['patched-canvas'])
cube('jax-shoe-shop-sign',(x,.52,z+.24),(.78,.55,.055),M['weathered-plank'],.018); label('jax-shoe-shop-lettering',(x-.32,.55,z+.28),'SHOE REPAIR',M['faded-hand-paint'],.11)

# Upright piano: shaped case, open upper panel showing harp, keyboard, three legs and real rope runs.
x,z=-4,0
cube('piano-upright-case',(x,.83,z),(.72,1.48,.43),M['weathered-plank'],.075)
cube('piano-upright-open-frame',(x,.99,z-.23),(.57,.49,.06),M['rusted-steel'],.035)
for i in range(22):
    kx=x-.29+i*.0275; cube(f'piano-upright-key-{i:02}',(kx,.57,z-.255),(.026,.09,.035),M['dirty-glass'] if i%7 in (2,6) else M['faded-hand-paint'],.003)
for i in range(18): beam(f'piano-upright-string-{i:02}',(x-.25+i*.029,.99,z-.268),(x-.25+i*.029,1.35,z-.268),.006,M['galvanised-tin'])
for sx in (-1,1):
    beam(f'piano-upright-bed-rope-{sx}',(x+sx*.42,1.52,z-.35),(x+sx*.42,.02,z+.34),.026,M['patched-canvas'])
    for k in range(3): cube(f'piano-upright-iron-caster-{sx}-{k}',(x+sx*.28,.10,z-.13+k*.13),(.09,.12,.09),M['iron-dark'],.02)

# Remaining favours are compactly staged on the same neutral board for a legible overview.
# Regret: sourced car fragments represented by the named detached body parts, with a tree through its block.
x,z=0,0
cube('regret-door',(x,.58,z),(.95,.72,.07),M['rusted-steel'],.06)
cube('regret-door-faded-red',(x,.66,z-.045),(.84,.52,.02),M['faded-hand-paint'],.035)
cube('regret-bonnet',(x+1.35,.44,z),(.92,.12,.75),M['faded-hand-paint'],.12)
cube('regret-engine',(x+2.72,.42,z),(.68,.5,.52),M['iron-dark'],.10)
for i in range(4): cyl(f'regret-engine-cylinder-{i}',(x+2.48+i*.16,.72,z),.075,.18,M['rusted-steel'],10)
beam('regret-tree-trunk',(x+2.72,.63,z),(x+2.72,1.38,z),.075,M['weathered-plank'])
for i in range(6): sphere(f'regret-tree-leaf-{i}',(x+2.55+(i%3)*.15,1.23+(i//3)*.13,z),(.18,.14,.18),M['sand'])
cyl('regret-wheel',(x+3.85,.25,z),.36,.14,M['iron-dark'],24,(0,0,1))
cyl('regret-wheel-hub',(x+3.85,.25,z-.08),.105,.18,M['galvanised-tin'],16,(0,0,1))

# Damp dynamite crate: open slats reveal individually wrapped sticks and a hand-painted SMALL mark.
x,z=5,0
for xx in (-.28,.28):
    for zz in (-.22,.22): beam(f'dynamite-box-corner-{xx}-{zz}',(x+xx,.03,z+zz),(x+xx,.52,z+zz),.055,M['weathered-plank'])
for row in range(4):
    yy=.1+row*.105
    for zz in (-.23,.23): cube(f'dynamite-box-slat-{row}-{zz}',(x,yy,z+zz),(.64,.075,.045),M['weathered-plank'],.012)
for i in range(6):
    cyl(f'dynamite-wrapped-stick-{i}',(x-.2+(i%3)*.19,.24+(i//3)*.13,z),.052,.48,M['patched-canvas'],10,(1,0,0))
cube('dynamite-box-label',(x,.35,z+.255),(.39,.23,.018),M['faded-hand-paint'],.005); label('dynamite-box-small',(x-.15,.36,z+.27),'SMALL',M['rusted-steel'],.14)

# Open engine and stand: exposed four pistons, open bore face and exhaust with a nest.
x,z=8,0
cube('open-engine-block',(x,.60,z),(.85,.68,.60),M['rusted-steel'],.09)
for i in range(4):
    cx=x-.28+i*.185
    cyl(f'open-engine-cylinder-{i}',(cx,.99,z-.05),.088,.32,M['iron-dark'],16)
    cyl(f'open-engine-piston-{i}',(cx,1.02,z-.06),.056,.20,M['galvanised-tin'],12)
for sx in (-1,1): beam(f'open-engine-stand-{sx}',(x+sx*.48,.04,z),(x+sx*.35,.45,z),.075,M['iron-dark'])
cyl('open-engine-exhaust',(x+.57,.83,z+.18),.13,.58,M['rusted-steel'],16,(1,0,0))
for i in range(5): beam(f'open-engine-nest-twig-{i}',(x+.69,.78+i*.025,z+.12),(x+.69,.87+i*.025,z+.28),.018,M['weathered-plank'])
sphere('open-engine-nest',(x+.72,.88,z+.19),(.12,.07,.11),M['weathered-plank'])

# Wren's flag: real cloth plane on a slender pole and a small yellow knot.
x,z=11,0
beam('wren-flag-pole',(x,.03,z),(x,1.55,z),.027,M['iron-dark'])
verts=[(0,0,0),(.62,0,.05),(.60,0,.32),(.2,0,.28),(.12,0,.17)]
mesh=bpy.data.meshes.new('wren flag rag'); mesh.from_pydata(verts,[],[(0,1,2,3,4)]); mesh.update(); ob=bpy.data.objects.new('wren-flag-rag',mesh); scene.collection.objects.link(ob); ob.location=town.game_vector((x,.95,z)); ob.data.materials.append(M['patched-canvas']); attach(ob,'wren-flag-rag')
for v in mesh.vertices: v.co.x += .018*math.sin(v.co.x*10)
sphere('wren-flag-yellow-knot',(x+.08,1.26,z),(.07,.035,.06),M['faded-hand-paint'])

# Dune's graveyard airliner is reused as an existing model family on the same sheet; ladder and camp included.
air=root/'public/assets/models/wasteland/scablands/boneyard.glb'
if air.exists():
    before=set(scene.objects); bpy.ops.import_scene.gltf(filepath=str(air)); objs=set(scene.objects)-before
    planes=[o for o in objs if o.type=='MESH' and o.name.lower().startswith('east wreck')]
    for o in objs:
        if o not in planes: bpy.data.objects.remove(o,do_unlink=True)
    if planes:
        pts=[o.matrix_world @ Vector(c) for o in planes for c in o.bound_box]; mn=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts))); mx=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
        center=(mn+mx)*.5; scale=7/max(mx.x-mn.x,mx.z-mn.z,.01)
        for o in planes:
            o.name='dune-airliner-'+o.name; o.parent=root_obj; o.matrix_world.translation=(o.matrix_world.translation-center)*scale+Vector((15,2,0)); o.scale*=scale
        for i in range(5): beam(f'dune-fallen-ladder-rung-{i}',(14+i*.16,.04,-.85),(14+i*.16,.04,-.42),.025,M['weathered-plank'])
        for zz in (-.85,-.42): beam(f'dune-fallen-ladder-side-{zz}',(14,.04,zz),(14.64,.04,zz),.035,M['rusted-steel'])
        cube('dune-wing-camp-tarp',(15,2.1,.2),(1.0,.035,.8),M['patched-canvas'],.025)

# Gerald, original metric lizard, 30 cm nose to tail with four splayed connected limbs and toes.
x,z=20,0
def tapered(name,a,b,r1,r2,mat):
    va=town.game_vector(a); vb=town.game_vector(b); d=vb-va
    bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=r1,radius2=r2,depth=d.length,location=(va+vb)/2); o=bpy.context.object; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(mat); attach(o,name)
sphere('gerald-low-torso',(x,.12,z),(.078,.052,.095),M['sand'])
sphere('gerald-blunt-head',(x,.14,z-.115),(.061,.043,.058),M['sand'])
sphere('gerald-eye-left',(x-.05,.158,z-.145),(.012,.012,.012),M['iron-dark']); sphere('gerald-eye-right',(x+.05,.158,z-.145),(.012,.012,.012),M['iron-dark'])
tapered('gerald-tapering-tail',(x,.11,z+.06),(x,.075,z+.19),.043,.005,M['sand'])
for sx in (-1,1):
    for sz in (-1,1):
        shoulder=(x+sx*.045,.11,z+sz*.045); hip=(x+sx*.09,.065,z+sz*.105)
        tapered(f'gerald-leg-upper-{sx}-{sz}',shoulder,hip,.025,.018,M['sand'])
        foot=(x+sx*.115,.035,z+sz*.13); tapered(f'gerald-leg-lower-{sx}-{sz}',hip,foot,.019,.012,M['sand'])
        for t in (-1,0,1): tapered(f'gerald-toe-{sx}-{sz}-{t}',foot,(foot[0]+sx*.045,.026,foot[2]+t*.022),.009,.002,M['sand'])
cube('gerald-box',(x+1,.22,z),(.52,.38,.44),M['weathered-plank'],.045)
for sx in (-.13,.13):
    for sz in (-.14,.14): cyl(f'gerald-box-air-hole-{sx}-{sz}',(x+1+sx,.24,z+sz),.025,.012,M['iron-dark'],10,(0,1,0))

# Ash's too-small hat on a walker: battered brim, crown and true-thickness walker rails.
x,z=24,0
cyl('ash-hat-brim',(x,.85,z),.32,.06,M['faded-hand-paint'],20)
cyl('ash-hat-crown',(x,.98,z),.20,.24,M['faded-hand-paint'],16)
for sx in (-1,1):
    beam(f'ash-walker-front-{sx}',(x+sx*.32,.02,z-.25),(x+sx*.32,1.05,z-.25),.035,M['iron-dark'])
    beam(f'ash-walker-back-{sx}',(x+sx*.32,.02,z+.28),(x+sx*.32,.84,z+.28),.035,M['iron-dark'])
    beam(f'ash-walker-side-{sx}',(x+sx*.32,.84,z-.25),(x+sx*.32,.84,z+.28),.035,M['iron-dark'])

# Deterministic UV layer naming prevents joined parts from exporting extra TEXCOORD sets.
for obj in scene.objects:
    if obj.type=='MESH':
        if not obj.data.uv_layers: obj.data.uv_layers.new(name='UVMap')
        for layer in obj.data.uv_layers: layer.name='UVMap'
        obj.parent=root_obj if obj is not root_obj else None
out.parent.mkdir(parents=True,exist_ok=True); town.export_glb(out)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(out))
objs=list(bpy.context.scene.objects); meshes=[o for o in objs if o.type=='MESH']; tris=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
print(json.dumps({'triangles':tris,'bytes':out.stat().st_size,'meshes':len(meshes)}))
if tris>40000 or out.stat().st_size>2*1024*1024: raise RuntimeError('crew-favours exceeds card budget')

# The review is rendered only from the GLB reimport above, with fresh lights and ground.
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=2200; scene.render.resolution_y=920; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG'; scene.render.image_settings.quality=91
scene.view_settings.view_transform='AgX'; scene.world=bpy.data.worlds.new('Overcast crew favour review'); scene.world.color=(.56,.56,.55)
ground=bpy.data.materials.new('Review ground'); ground.diffuse_color=(.24,.25,.24,1)
bpy.ops.mesh.primitive_plane_add(size=70,location=(8,-.05,0)); bpy.context.object.name='review ground only'; bpy.context.object.data.materials.append(ground)
for location,power,size in (((8,32,15),18000,22),((-18,18,8),10000,18),((30,14,-15),8500,14)):
    bpy.ops.object.light_add(type='AREA',location=town.game_vector(location)); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    direction=town.game_vector((8,.6,0))-light.location; light.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=town.game_vector((8,10,-42))); cam=bpy.context.object
cam.data.type='ORTHO'; cam.data.ortho_scale=35; direction=town.game_vector((8,.55,0))-cam.location; cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler(); scene.camera=cam
ink=bpy.data.materials.new('Review label ink'); ink.diffuse_color=(.055,.06,.055,1); ink.use_nodes=True
ink.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.055,.06,.055,1)
for px,text_value in ((-8,'JAX / HARPOON'),(-4,'TUSK / PIANO'),(.7,'ROOK / REGRET'),(5,'NELL / SMALL'),(8,'ODESSA / ENGINE'),(11,'WREN / FLAG'),(15,'DUNE / AIRLINER'),(21,'GERALD'),(24,'ASH / HAT')):
    curve=bpy.data.curves.new('Review / '+text_value,'FONT'); curve.body=text_value; curve.size=.30; curve.extrude=.001
    obj=bpy.data.objects.new('review label / '+text_value,curve); scene.collection.objects.link(obj); obj.location=town.game_vector((px,.025,.7)); obj.rotation_euler=(-math.pi/2,0,0); curve.materials.append(ink)
review=root/'docs/board/looks/ww-art-crew/round-1.jpg'; review.parent.mkdir(parents=True,exist_ok=True)
scene.render.filepath=str(review); bpy.ops.render.render(write_still=True)
print('Review sheet:',review)
