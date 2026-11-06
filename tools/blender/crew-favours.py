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
texture_dir=root/'public/assets/models/wasteland/scablands/textures'
harpoon_tex=texture_dir/'ww-harpoon-photo.jpg'
piano_tex=texture_dir/'ww-piano-photo.jpg'
lizard_tex=texture_dir/'ww-gerald-photo.jpg'
M=town.make_materials()

photo_images={}
def photo_material(name, path):
    key=str(path.resolve())
    if key not in photo_images:
        image=bpy.data.images.load(key,check_existing=False); image.pack(); photo_images[key]=image
    image=photo_images[key]
    material=bpy.data.materials.new(name); material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value=.08; bsdf.inputs['Roughness'].default_value=.9
    tex=material.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=image; tex.extension='EXTEND'
    material.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    return material

# Each source is the full photograph, sampled without repeating a small swatch.
M['weathered-plank']=photo_material('Harpoon / full photograph',harpoon_tex)
M['rusted-steel']=photo_material('Harpoon iron / full photograph',harpoon_tex)
M['sand']=photo_material('Gerald / full photograph',lizard_tex)
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
tapered('gerald-tapering-tail',(x,.11,z+.06),(x,.075,z+.19),.043,.005,M['sand'])
for sx in (-1,1):
    for sz in (-1,1):
        shoulder=(x+sx*.045,.040,z+sz*.035); hip=(x+sx*.12,.025,z+sz*.105)
        tapered(f'gerald-leg-upper-{sx}-{sz}',shoulder,hip,.012,.009,M['sand'])
        foot=(x+sx*.15,.012,z+sz*.13); tapered(f'gerald-leg-lower-{sx}-{sz}',hip,foot,.009,.006,M['sand'])
        for t in (-1,0,1): tapered(f'gerald-toe-{sx}-{sz}-{t}',foot,(foot[0]+sx*.045,.026,foot[2]+t*.022),.0045,.0015,M['sand'])
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

# Round 2 includes only the three individually judged props. Delete every
# unrelated Round 1 object, including Gerald's transport box.
for obj in list(scene.objects):
    if obj is root_obj or obj.name.startswith(('jax-harpoon','jax-shoe-shop','piano-upright')) or (obj.name.startswith('gerald-') and 'box' not in obj.name):
        continue
    bpy.data.objects.remove(obj,do_unlink=True)
# Rebuild the harpoon lying along the bench: a 2.5 m tapered oak pole, thumb-
# thin iron shank, and a forged flat head with a swept-back barb.
for obj in list(scene.objects):
    if obj.name.startswith(('jax-harpoon','jax-shoe-shop')): bpy.data.objects.remove(obj,do_unlink=True)
x=-8
# A measured, 16-sided lathe gives the oak pole its swelling grip and taper.
shaft_stations=[(-1.16,.027),(-.95,.032),(-.72,.039),(-.30,.045),(.18,.050),(.62,.047),(.98,.041),(1.16,.032)]
shaft_verts=[]; shaft_faces=[]; shaft_sides=16
for along,radius in shaft_stations:
    for side in range(shaft_sides):
        angle=2*math.pi*side/shaft_sides
        shaft_verts.append(tuple(town.game_vector((x+along,.12+radius*math.cos(angle),radius*math.sin(angle)))))
for row in range(len(shaft_stations)-1):
    for side in range(shaft_sides):
        a=row*shaft_sides+side; b=row*shaft_sides+(side+1)%shaft_sides
        shaft_faces.append((a,b,b+shaft_sides,a+shaft_sides))
shaft_mesh=bpy.data.meshes.new('jax measured oak pole lathe'); shaft_mesh.from_pydata(shaft_verts,[],shaft_faces); shaft_mesh.update()
shaft_uv=shaft_mesh.uv_layers.new(name='UVMap')
for poly in shaft_mesh.polygons:
    for li in poly.loop_indices:
        vi=shaft_mesh.loops[li].vertex_index; station=vi//shaft_sides; side=vi%shaft_sides
        angle=2*math.pi*side/shaft_sides
        shaft_uv.data[li].uv=(station/(len(shaft_stations)-1),.78+math.cos(angle)*.08)
shaft=bpy.data.objects.new('jax-harpoon-oak-shaft',shaft_mesh); scene.collection.objects.link(shaft); shaft_mesh.materials.append(M['weathered-plank']); attach(shaft,shaft.name)
cyl('jax-harpoon-thick-iron-socket',(x-.91,.12,0),.060,.25,M['rusted-steel'],16,(1,0,0))
cyl('jax-harpoon-iron-shank',(x-.97,.12,0),.016,.34,M['rusted-steel'],16,(1,0,0))
head_game=[(x-1.25,.12,-.045),(x-.99,.17,-.045),(x-1.045,.255,-.045),(x-1.13,.17,-.045),(x-1.045,.035,-.045),(x-.99,.08,-.045)]
head_mesh=bpy.data.meshes.new('jax-harpoon forged flat barb'); head_mesh.from_pydata([tuple(town.game_vector(p)) for p in head_game],[],[(0,1,2,3,4,5)]); head_mesh.update()
head_uv=head_mesh.uv_layers.new(name='UVMap')
for loop in head_mesh.loops:
    point=head_game[loop.vertex_index]
    head_uv.data[loop.index].uv=(.83+max(0,min(1,(point[0]-x+1.25)/.30))*.17,.72+max(0,min(1,point[1]/.30))*.20)
head=bpy.data.objects.new('jax-harpoon-flat-barb',head_mesh); scene.collection.objects.link(head); head.data.materials.append(M['rusted-steel']); attach(head,head.name)
head.modifiers.new('forged plate thickness','SOLIDIFY').thickness=.008
edge=head.modifiers.new('rounded forged edge','BEVEL'); edge.width=.006; edge.segments=2
for i in range(6):
    bpy.ops.mesh.primitive_torus_add(major_radius=.036,minor_radius=.009,major_segments=12,minor_segments=6,location=town.game_vector((x-.82+i*.022,.12,0)))
    wrap=bpy.context.object; wrap.name=f'jax-harpoon-rope-raised-band-{i}'; wrap.rotation_euler[1]=math.pi/2; wrap.data.materials.append(M['patched-canvas']); attach(wrap,wrap.name)
# Piano proportions: 1.5 m wide, 1.3 m high, 0.6 m deep. Replace the solid
# box with rounded side panels and rails, leaving its action exposed.
for obj in list(scene.objects):
    if obj.name in ('piano-upright-case','piano-upright-open-frame'): bpy.data.objects.remove(obj,do_unlink=True)
shell=[]
for sx in (-1,1): shell.append(cube(f'piano-upright-shell-side-{sx}',(-4+sx*.68,.67,0),(.14,1.30,.60),M['weathered-plank'],.07))
for name,center,size in (
 ('piano-upright-shell-top',(-4,1.30,0),(1.5,.12,.60)),
 ('piano-upright-shell-bottom',(-4,.08,0),(1.5,.16,.60)),
 ('piano-upright-shell-back',(-4,.70,.25),(1.23,1.08,.08)),
 ('piano-upright-shell-lower-panel',(-4,.31,-.275),(1.24,.32,.05)),
 ('piano-upright-shell-key-shelf',(-4,.53,-.29),(1.28,.09,.16))):
    shell.append(cube(name,center,size,M['weathered-plank'],.045))
for obj in shell:
    bevel=next((m for m in obj.modifiers if m.type=='BEVEL'),None)
    if bevel: bevel.segments=3
for obj in scene.objects:
    if obj.name.startswith(('piano-upright-key-','piano-upright-string-')): obj.location.y+=.12
for obj in [o for o in scene.objects if o.name.startswith(('piano-upright-string-','piano-upright-action-rod-','piano-upright-hammer-head-','piano-upright-iron-caster-'))]:
    bpy.data.objects.remove(obj,do_unlink=True)
for sx in (-1,1):
    cube(f'piano-upright-square-foot-{sx}',(-4+sx*.66,.07,-.02),(.25,.14,.56),M['weathered-plank'],.035)
    for sz in (-.21,.21):
        cyl(f'piano-upright-caster-{sx}-{sz}',(-4+sx*.63,.025,sz),.045,.055,M['iron-dark'],12,(0,1,0))
for sx in (-1,1):
    cube(f'piano-upright-brass-pedal-{sx}',(-4+sx*.12,.045,-.26),(.045,.025,.13),M['galvanised-tin'],.01)
# The piano has a distinct worn walnut finish, kept separate from the harpoon's oak.
piano_wood=photo_material('Piano / full front photograph',piano_tex)
for obj in scene.objects:
    if obj.name.startswith(('piano-upright-shell-','piano-upright-key-')):
        obj.data.materials.clear(); obj.data.materials.append(piano_wood)
        uv_layer=obj.data.uv_layers.active
        for poly in obj.data.polygons:
            for li in poly.loop_indices:
                vertex=obj.data.vertices[obj.data.loops[li].vertex_index].co
                v=Vector((obj.location.x+vertex.x,obj.location.y+vertex.y,obj.location.z+vertex.z))
                # Project the front from the photo camera; stretch adjacent wood across hidden faces.
                if abs(poly.normal.y)>.5:
                    uv_layer.data[li].uv=((v.x+4.75)/1.5, v.z/1.3)
                elif abs(poly.normal.x)>.5:
                    local_y=vertex.y
                    uv_layer.data[li].uv=(.025+max(0,min(1,(local_y+.30)/.60))*.11, v.z/1.3)
                else:
                    uv_layer.data[li].uv=(.24+max(0,min(1,(v.x+4.75)/1.5))*.52, .972)
# Gerald spans 30 cm nose to tail. Replace the disconnected sphere stack with
# one continuous tapered body, head and tail surface; feet overlap the body.
gerald=[o for o in scene.objects if o.name.startswith('gerald-') and o.type=='MESH']
for obj in gerald:
    if 'box' in obj.name: bpy.data.objects.remove(obj,do_unlink=True)
    elif obj.name in ('gerald-low-torso','gerald-blunt-head','gerald-tapering-tail'):
        bpy.data.objects.remove(obj,do_unlink=True)
body_stations=[(-.15,.003,.003,.078),(-.125,.012,.015,.080),(-.10,.024,.025,.082),(-.075,.034,.030,.082),(-.04,.043,.033,.080),(0,.047,.034,.078),(.035,.041,.030,.076),(.07,.028,.023,.072),(.10,.018,.015,.070),(.125,.010,.009,.068),(.145,.004,.004,.066),(.15,.001,.002,.065)]
verts=[]; faces=[]; rings=16
for zc,rx,ry,yc in body_stations:
    for j in range(rings):
        angle=2*math.pi*j/rings
        vertical=ry*math.sin(angle) if math.sin(angle)>0 else .004*math.sin(angle)
        verts.append(tuple(town.game_vector((20+rx*math.cos(angle),yc-.04+vertical,zc))))
for i in range(len(body_stations)-1):
    for j in range(rings):
        a=i*rings+j; b=i*rings+(j+1)%rings; c=(i+1)*rings+(j+1)%rings; d=(i+1)*rings+j
        faces.append((a,b,c,d))
body_mesh=bpy.data.meshes.new('gerald continuous skin from neck through tail'); body_mesh.from_pydata(verts,[],faces); body_mesh.update()
for polygon in body_mesh.polygons: polygon.use_smooth=True
uv=body_mesh.uv_layers.new(name='UVMap')
side_skin=photo_material('Gerald / side photo projection',lizard_tex)
top_skin=photo_material('Gerald / overhead photo projection',lizard_tex)
body_mesh.materials.append(side_skin); body_mesh.materials.append(top_skin)
for poly in body_mesh.polygons:
    for li in poly.loop_indices:
        vi=body_mesh.loops[li].vertex_index; station=vi//rings; side=vi%rings
        xw,yw,zw=verts[vi]
        u=(.15-yw)/.30
        if poly.normal.z>.45:
            poly.material_index=1
            uv.data[li].uv=(u,.06+max(0,min(1,(xw-19.95)/.10))*.43)
        else:
            poly.material_index=0
            uv.data[li].uv=(u,.57+max(0,min(1,(zw-.045)/.08))*.38)
body=bpy.data.objects.new('gerald-body-connected-head-tail',body_mesh); scene.collection.objects.link(body); attach(body,body.name)
body.modifiers.new('soft skin profile','SUBSURF').levels=1
# Five long, individually thick toes fan from each low splayed foot.
for obj in [o for o in scene.objects if o.name.startswith('gerald-toe-')]: bpy.data.objects.remove(obj,do_unlink=True)
for sx in (-1,1):
    for sz in (-1,1):
        foot=(20+sx*.15,.012,sz*.13)
        for toe in range(5):
            spread=(toe-2)*.018
            tapered(f'gerald-toe-{sx}-{sz}-{toe}',foot,(foot[0]+sx*(.055+abs(spread)*.45),.007,foot[2]+spread),.004,.0015,M['sand'])
# Salvaged iron remains dull in real-time rendering; keep every exported
# metallicFactor at or below the card's 0.3 ceiling.
for material in M.values():
    bsdf=material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
    if bsdf: bsdf.inputs['Metallic'].default_value=min(.3,bsdf.inputs['Metallic'].default_value)
# Deterministic UV layer naming prevents joined parts from exporting extra TEXCOORD sets.
for obj in scene.objects:
    if obj.type=='MESH':
        if not obj.data.uv_layers: obj.data.uv_layers.new(name='UVMap')
        for layer in obj.data.uv_layers: layer.name='UVMap'
        if obj.name.startswith('gerald-'):
            for polygon in obj.data.polygons: polygon.use_smooth=True
        obj.parent=root_obj if obj is not root_obj else None
out.parent.mkdir(parents=True,exist_ok=True); town.export_glb(out)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=str(out))
objs=list(bpy.context.scene.objects); meshes=[o for o in objs if o.type=='MESH']; tris=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
print(json.dumps({'triangles':tris,'bytes':out.stat().st_size,'meshes':len(meshes)}))
if tris>40000 or out.stat().st_size>2*1024*1024: raise RuntimeError('crew-favours exceeds card budget')

# Matched asset portraits are rendered from the exported GLB after reimport.
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=980; scene.render.resolution_y=560; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('Bright overcast crew prop review'); scene.world.color=(.58,.58,.57)
ground=bpy.data.materials.new('Review ground'); ground.diffuse_color=(.31,.32,.31,1)
bpy.ops.mesh.primitive_plane_add(size=70,location=(8,0,-.05)); plane=bpy.context.object; plane.name='review ground only'; plane.data.materials.append(ground)
for location,power,size in (((8,15,10),10500,10),((-18,10,8),7000,8),((30,8,-15),6500,7)):
    bpy.ops.object.light_add(type='AREA',location=location); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(Vector((8,.6,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,1,-5)); cam=bpy.context.object; cam.data.type='ORTHO'; scene.camera=cam
all_objects=list(scene.objects)
for obj in all_objects:
    if obj.name.startswith('review label /'): obj.hide_render=True
for part in ('jax-','piano-upright-','gerald-'):
    selected=[o for o in all_objects if o.type=='MESH' and o.name.startswith(part) and 'box' not in o.name]
    if not selected: raise RuntimeError('missing rendered part '+part)
    for obj in all_objects:
        if obj.type=='MESH' and obj is not plane: obj.hide_render=obj not in selected
    points=[o.matrix_world @ Vector(c) for o in selected for c in o.bound_box]
    lo=Vector((min(p.x for p in points),min(p.y for p in points),min(p.z for p in points)))
    hi=Vector((max(p.x for p in points),max(p.y for p in points),max(p.z for p in points)))
    center=(lo+hi)*.5
    if part=='jax-': cam.location=center+Vector((0,max(2.2,(hi.y-lo.y)*3),.08))
    elif part=='gerald-': cam.location=center+Vector((-max(1.2,(hi.x-lo.x)*4),0,0))
    else: cam.location=center+Vector((-1.0,max(2.2,(hi.y-lo.y)*3),2.2))
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=max(hi.x-lo.x,(hi.z-lo.z)*980/560,hi.y-lo.y)*1.13; scene.render.filepath=str(root/'.qa-dist'/('render-'+part.rstrip('-')+'.png'))
    bpy.ops.render.render(write_still=True)
    if part=='gerald-':
        cam.location=center+Vector((0,0,max(1.2,(hi.z-lo.z)*4)))
        cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.ortho_scale=max(hi.x-lo.x,(hi.y-lo.y)*980/560)*1.2
        scene.render.filepath=str(root/'.qa-dist'/'render-gerald-top.png')
        bpy.ops.render.render(write_still=True)
print('Rendered GLB portraits into .qa-dist for reference comparison.')
