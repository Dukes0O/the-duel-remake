"""Tin Town's original walkable forge block. Dimensions are metres; Y is up.

blender -b --python-exit-code 1 --python tools/blender/scablands-tintown.py -- --root . --render .evidence/2026-11-04/WW-ART-TINTOWN
"""
import argparse
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--render', default='')
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/tintown.glb'
blend = root / 'art-build/scablands/tintown.blend'
if a.paths_only:
    import json
    print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'json':[],
                      'evidence':[str(root / a.render)] if a.render else []}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)

def material(name, color, metallic=0.0, rough=.92, noise_scale=5.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    n = m.node_tree.nodes
    bsdf = n.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    tex = n.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = noise_scale
    tex.inputs['Detail'].default_value = 3.0; tex.inputs['Roughness'].default_value = .78
    ramp = n.new('ShaderNodeValToRGB')
    dark = tuple(c * .48 for c in color) + (1,)
    light = tuple(min(.95, c * 1.20 + .025) for c in color) + (1,)
    ramp.color_ramp.elements[0].position = .22; ramp.color_ramp.elements[0].color = dark
    ramp.color_ramp.elements[1].position = .82; ramp.color_ramp.elements[1].color = light
    m.node_tree.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
    m.node_tree.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .20
    bump.inputs['Distance'].default_value = .035
    m.node_tree.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    m.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m

steel = material('Tin Town • pitted galvanized and rusted steel', (.24,.22,.18), .60, .88, 8)
rust = material('Tin Town • oxide scale', (.31,.105,.045), .22, .96, 11)
dark = material('Tin Town • soot black iron', (.075,.078,.07), .72, .82, 7)
wood = material('Tin Town • salvaged grey timber', (.24,.19,.13), 0, .98, 5)
ground = material('Tin Town • ash and crushed slag', (.16,.145,.12), 0, 1, 3)
cloth = material('Tin Town • patched washing cloth', (.36,.31,.22), 0, .99, 6)
paper = material('Tin Town • notice board paper', (.46,.36,.22), 0, .98, 8)
amber = material('Tin Town • forge lamp glass unlit', (.24,.105,.018), 0, .5, 4)
amber_on = material('Tin Town • forge lamp glass lit', (.42,.14,.018), 0, .35, 4)
for mat, strength in ((amber,0), (amber_on,2.4)):
    sh = mat.node_tree.nodes.get('Principled BSDF')
    sh.inputs['Emission Color'].default_value = (.95,.25,.025,1)
    sh.inputs['Emission Strength'].default_value = strength

root_obj = bpy.data.objects.new('tintown-root', None)
bpy.context.collection.objects.link(root_obj)
root_obj.empty_display_type = 'PLAIN_AXES'

def cube(name, loc, scale, mat, bevel=.025, parent=True):
    # Recipe points are glTF game metres (X, up-Y, forward-Z); Blender is
    # (X, up-Z, forward-minus-Y). Keep this conversion at the primitive edge.
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0],-loc[2],loc[1]))
    o=bpy.context.object; o.name=name; o.dimensions=(scale[0],scale[2],scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Battered softened edges','BEVEL'); mod.width=bevel; mod.segments=1
        mod2=o.modifiers.new('Welded corner normals','WEIGHTED_NORMAL')
    if parent: o.parent=root_obj
    return o

def beam(name, start, end, width, mat):
    p0=Vector((start[0],-start[2],start[1])); p1=Vector((end[0],-end[2],end[1])); d=p1-p0
    o=cube(name,((start[0]+end[0])/2,(start[1]+end[1])/2,(start[2]+end[2])/2),
           (width,d.length,width),mat,min(.025,width*.12))
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return o

def corrugated(name, center, width, height, mat, angle=0):
    # Thin, slightly warped sheet with hand-formed standing ribs and irregular hem.
    x,y,z=center
    o=cube(name,(x,y,z),(width,height,.045),mat,.012)
    o.rotation_euler[2]=angle
    count=max(3,int(width/.19))
    for i in range(count+1):
        xx=x-width/2+width*i/count
        rib=cube(name+'-fold-%02d'%i,(xx,y,z),(.018,height*.98,.022),dark if i%4==0 else mat,.006)
        rib.rotation_euler[2]=angle

# A single compact block. Three pedestrian alleys stay 2.2–2.7 m wide.
cube('walkable-ground-main-alley-collision',(0,.04,0),(2.45,.08,24),ground,0)
cube('walkable-ground-cross-alley-collision',(0,.045,0),(25,.09,2.35),ground,0)
cube('walkable-ground-forge-court-collision',(0,.05,-5.8),(6.2,.10,3.0),ground,0)
cube('slag-bed-under-town',(0,-.13,0),(28,.28,27),ground,.12)

# Uneven three-level scaffold rows leave the main lane and cross lane open.
shacks=[(-5.2,-8.6,0,5.5,4.8,3.8), (4.6,-8.8,0,5.8,5.0,4.0),
        (-5.0,-2.8,1,5.4,4.3,3.5),(4.8,-2.6,1,5.4,4.0,3.7),
        (-5.2,3.8,0,5.5,4.6,3.6),(4.9,4.0,0,5.8,4.8,3.8),
        (-5.4,9.2,1,5.2,4.6,3.4),(4.9,9.5,0,5.7,4.5,3.6)]
for idx,(x,z,level,w,d,h) in enumerate(shacks):
    base=.18+level*3.25
    # Four-legged, cross-braced scaffold with visibly mismatched timber and iron joints.
    for sx in (-1,1):
        for sz in (-1,1):
            px=x+sx*(w/2-.15); pz=z+sz*(d/2-.15)
            beam(f'scaffold-{idx}-post-{sx}-{sz}',(px,.15,pz),(px,base+h*.78,pz),.14,wood)
            cube(f'scaffold-{idx}-foot-{sx}-{sz}',(px,.23,pz),(.38,.16,.38),rust,.02)
    for yy in (base+.5,base+h*.76):
        beam(f'scaffold-{idx}-front-rail-{yy:.1f}',(x-w/2,yy,z-d/2),(x+w/2,yy,z-d/2),.12,dark)
        beam(f'scaffold-{idx}-side-rail-{yy:.1f}',(x+w/2,yy,z-d/2),(x+w/2,yy,z+d/2),.12,dark)
    beam(f'scaffold-{idx}-brace-a',(x-w/2,.5,z-d/2),(x+w/2,base+h*.76,z-d/2),.075,rust)
    beam(f'scaffold-{idx}-brace-b',(x+w/2,.5,z-d/2),(x-w/2,base+h*.76,z-d/2),.075,wood)
    cube(f'shack-{idx}-floor',(x,base,z),(w+.15,.22,d+.15),wood,.035)
    # Corrugated walls, patched roof plates and exposed rusty roof joists.
    corrugated(f'shack-{idx}-rear',(x,base+h*.475,z-d/2),w,h*.95,steel,.018*((idx%3)-1))
    corrugated(f'shack-{idx}-front',(x,base+h*.475,z+d/2),w,h*.95,rust if idx%3==0 else steel,.018*((idx%3)-1))
    for side in (-1,1):
        wallmat=steel if (idx+side)%3 else rust
        before=set(bpy.context.scene.objects)
        corrugated(f'shack-{idx}-side-{side}',(x+side*w/2,base+h*.475,z),d,h*.95,wallmat,.018)
        pivot=Vector((x+side*w/2,-z,base+h*.475))
        for obj in set(bpy.context.scene.objects)-before:
            obj.location=pivot+Vector((-(obj.location.y-pivot.y),obj.location.x-pivot.x,obj.location.z-pivot.z))
            obj.rotation_euler[2]+=math.pi/2
    for j in range(3):
        px=x-w*.38+j*w*.38
        beam(f'shack-{idx}-roof-rib-{j}',(px,base+h,z-d*.55),(px,base+h+.05,z+d*.55),.10,rust)
    for j in range(3):
        px=x+(j-1)*w*.32
        cube(f'shack-{idx}-roof-sheet-{j}',(px,base+h+.06,z),(w*.35,.07,d*1.1),steel,.015)
    # A rusty patch door and small deep-set opening.
    cube(f'shack-{idx}-door',(x,base+1.0,z-d/2-.035),(1.05,2,.08),rust,.02)
    cube(f'shack-{idx}-dark-window',(x+w*.27,base+2.2,z-d/2-.09),(.62,.72,.08),dark,.015)
    # Flat scrap plates cover door seams and corners like repairs.
    cube(f'shack-{idx}-door-patch',(x-.36,base+1.42,z-d/2-.09),(.20,.74,.035),steel,.008)

# Cold central forge and a massive soot-caked tapered chimney.
fx,fz=0,0.0
cube('forge-foundation-slag',(fx,.25,fz),(4.2,.42,2.7),dark,.08)
cube('forge-body-welded-steel',(fx,1.18,fz),(3.55,1.65,2.1),steel,.06)
for x in (-1.45,1.45):
    for z in (fz-1.0,fz+1.0): beam('forge-rib',(x,.48,z),(x,1.98,z),.12,rust)
cube('cold-forge-mouth-black',(0,1.02,fz-1.08),(1.52,.82,.06),dark,.015)
cube('forge-mouth-ash-bed',(0,.63,fz-1.12),(1.20,.12,.10),rust,.01)
for side in (-1,1):
    for k in range(3): cube(f'forge-flange-bolt-{side}-{k}',(side*1.84,.72+k*.42,fz-.82),(.1,.1,.10),dark,.025)
beam('chimney-lower-stack',(0,2.0,fz+.25),(0,6.1,fz+.25),.86,dark)
for y in (2.0,2.6,3.5,4.35,5.2,6.0):
    cube(f'chimney-rust-band-{y:.1f}',(0,y,fz+.25),(1.0,.11,1.0),rust,.025)
cube('chimney-mouth-lip',(0,6.12,fz+.25),(1.30,.25,1.30),steel,.04)
cube('chimney-dark-mouth',(0,6.26,fz+.25),(.72,.08,.72),dark,.015)
for z in (-.55,.55): beam('chimney-anchor-guy',(0,3.2,fz+.25),(z*2,.2,fz+.25+z),.045,rust)

# Lamps: every unit is named and has glass geometry in both states as children.
for i,(x,y,z) in enumerate([(-2.6,3.1,-7.5),(2.7,3.4,-5.1),(0,4.7,-1.8)],1):
    beam(f'forge-lamp-{i}-bracket',(x,y,z),(x*.83,y+.28,z),.09,dark)
    cube(f'forge-lamp-{i}-cage',(x*.83,y+.08,z),(.30,.43,.30),dark,.025)
    cube(f'forge-lamp-{i}-glass-unlit',(x*.83,y+.08,z-.02),(.16,.27,.16),amber,.025)
    cube(f'forge-lamp-{i}-glass-lit',(x*.83,y+.08,z-.02),(.14,.23,.14),amber_on,.022)

# Handrail notice board, chipped painted posts, rusted header and paper scraps.
for x in (-2.35,2.35):
    beam('notice-board-post',(x,.2,8.4),(x,2.95,8.4),.16,wood)
cube('notice-board-steel-frame',(0,2.45,8.37),(4.9,1.65,.20),dark,.045)
cube('notice-board-rusted-header',(0,3.25,8.26),(5.15,.24,.32),rust,.025)
cube('notice-board-paper',(0,2.46,8.24),(4.45,1.25,.075),paper,.01)
for i,(x,y,w,h) in enumerate([(-1.35,2.55,.84,.42),(-.25,2.57,.72,.50),(.85,2.54,.92,.34),(1.45,2.94,.62,.25),(-1.2,2.96,.54,.26)]):
    cube(f'notice-job-slip-{i+1}',(x,y,8.185),(w,h,.025),cloth if i%2 else paper,.004)
for x in (-1.6,-.7,.25,1.4): cube('notice-board-iron-fastener',(x,3.08,8.12),(.09,.09,.055),steel,.02)

# Washing lines cross only the side courts; draped patchwork is individually legible.
for idx,(x0,z0,x1,z1,y) in enumerate([(-7.7,-7.0,-3.6,-7.0,4.8),(3.4,-1.6,7.5,-1.6,4.2),(-7.4,6.0,-3.4,6.0,4.3)]):
    beam(f'washing-line-{idx+1}',(x0,y,z0),(x1,y+.28,z1),.026,dark)
    for j in range(4):
        t=(j+1)/5; x=x0+(x1-x0)*t; z=z0+(z1-z0)*t; yy=y+(y+.28-y)*t
        cube(f'washing-patch-{idx+1}-{j+1}',(x,yy-.34,z),(.54,.66,.045),cloth if (idx+j)%2 else rust,.012)
        cube(f'washing-peg-{idx+1}-{j+1}',(x,yy+.015,z),(.08,.16,.09),wood,.012)

# Scattered forged scrap, welded plates and low steps; no toy-bright paint.
for i,(x,z,s) in enumerate([(-1.8,-9.5,.7),(1.7,-9.1,.5),(-7.7,-4.3,.8),(7.6,3.0,.65),(-1.4,9.5,.55)]):
    o=cube(f'salvage-scrap-{i+1}',(x,.22,z),(s,.15,s*.62),rust if i%2 else steel,.025)
    o.rotation_euler[2]=.12*(i-2)

# Scene preview uses a smoky neutral world and soft overhead light; no added runtime lights.
if a.render:
    folder=root/a.render if not Path(a.render).is_absolute() else Path(a.render)
    folder.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
    scene.render.resolution_x=1100; scene.render.resolution_y=760; scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'; scene.view_settings.exposure=-.35
    scene.world=bpy.data.worlds.new('Scablands smoke haze'); scene.world.use_nodes=True
    bg=scene.world.node_tree.nodes['Background']; bg.inputs['Color'].default_value=(.12,.13,.13,1); bg.inputs['Strength'].default_value=.45
    for loc,power,size,color in [((8,-11,18),2600,10,(1,.73,.47)),((-12,-2,10),1700,12,(.58,.68,.73)),((0,8,13),1200,9,(.9,.51,.28))]:
        bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.data.energy=power; l.data.shape='DISK'; l.data.size=size; l.data.color=color
        l.rotation_euler=(Vector((0,2,0))-l.location).to_track_quat('-Z','Y').to_euler()
    cams=[('overview',(25,-34,25),(0,-1,2)),('alley',(10,-19,8),(0,1,2)),('forge',(11,-12,9),(0,-1,2))]
    for name,loc,target in cams:
        bpy.ops.object.camera_add(location=loc); cam=bpy.context.object; cam.data.lens=42
        cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler(); scene.camera=cam
        scene.render.filepath=str(folder/f'{name}.png'); bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam,do_unlink=True)

# Keep semantic walkable collision volumes and the three selectable lamps as
# distinct nodes. Merge repeated wall, frame and scrap meshes by finish to keep
# the runtime GLB small and reduce draw overhead.
preserve = {'walkable-ground-main-alley-collision','walkable-ground-cross-alley-collision',
            'walkable-ground-forge-court-collision'}
preserve.update(o.name for o in bpy.context.scene.objects
                if o.type == 'MESH' and o.name.startswith('forge-lamp-'))
groups = {}
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH' or obj.name in preserve:
        continue
    # The subtle wall edge is already irregular; hundreds of modifier bevels
    # export as oversized face fans, so retain the welded sheet edges instead.
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    key = obj.data.materials[0].name if obj.data.materials else 'unpainted'
    groups.setdefault(key, []).append(obj)
for key, members in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in members: obj.select_set(True)
    active=members[0]; bpy.context.view_layer.objects.active=active
    bpy.ops.object.join(); active.name='tintown-surface-'+key.split('•')[-1].strip().replace(' ','-')
    active.parent=root_obj

bpy.ops.object.select_all(action='DESELECT'); root_obj.select_set(True)
for o in bpy.context.scene.objects:
    if o.type=='MESH': o.select_set(True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,
                          export_apply=True,export_cameras=False,export_lights=False)
import json, struct
blob=out.read_bytes(); json_length=struct.unpack_from('<I',blob,12)[0]
gltf=json.loads(blob[20:20+json_length])
triangles=sum(gltf['accessors'][primitive['indices']]['count']//3
              for mesh in gltf.get('meshes',[]) for primitive in mesh['primitives'])
print(f'Tin Town readback: {triangles} triangles, {out.stat().st_size} bytes')
assert triangles <= 60000, f'triangle budget exceeded: {triangles}'
assert out.stat().st_size <= 2500000, f'file budget exceeded: {out.stat().st_size}'
