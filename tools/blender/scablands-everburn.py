"""Build the Scablands gas well and render its capped and burning states."""
import argparse
import json
import math
import random
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--render', default='')
parser.add_argument('--out', default='public/assets/models/wasteland/scablands/everburn.glb')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(args.root).resolve()
out = root / args.out
blend = root / 'art-build/scablands-everburn/everburn.blend'
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)], 'json': []}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials, bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
    for item in list(datablocks):
        if item.users == 0:
            datablocks.remove(item)

def material(name, colour, metal=.0, rough=.8, emission=None):
    metal = min(metal, .2)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission[0], 1)
        shader.inputs['Emission Strength'].default_value = emission[1]
    return mat

steel = material('everburn-blackened-welded-steel', (.075,.082,.075), .7, .82)
rust = material('everburn-layered-iron-oxide', (.29,.105,.045), .38, .93)
flaking = material('everburn-ash-grey-paint', (.195,.2075,.18), .48, .9)
ground = material('everburn-charred-gravel', (.105,.091,.068), .05, .98)
ember = material('everburn-embers', (.95,.24,.025), .05, .5, ((1,.09,.008),2.2))
flame_outer = material('everburn-flame-orange', (.88,.055,.003), 0, .35, ((1,.055,.002),.7))
flame_inner = material('everburn-flame-yellow', (1,.34,.012), 0, .3, ((1,.28,.008),1.2))
flame_core = material('everburn-flame-core', (1,.84,.35), 0, .24, ((1,.62,.12),1.5))
cap_mat = material('everburn-ash-men-cap', (.12,.13,.11), .76, .75)

# The steel, rust, paint and cap were drawn through a noise node, which the exporter does not write: they arrived white.
# Each keeps one plain base colour (the ash-grey paint takes the middle of its old two-colour noise), metal at .2 or
# less, and the game draws the rust, runs and grain over them in code (SCABLANDS-LAND).

root_obj = bpy.data.objects.new('everburn-root', None)
bpy.context.collection.objects.link(root_obj)

def parent(obj, group):
    obj.parent = root_obj
    obj['state'] = group
    return obj

def cube(name, loc, scale, mat, bevel=0, state='shared'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('worn-rounded-edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(mat)
    return parent(obj, state)

def cylinder(name, loc, radius, depth, mat, vertices=16, axis='Y', state='shared'):
    vertices=12 if name in ('everburn-well-casing','everburn-top-collar','everburn-bore-rim','everburn-flare-stack') else min(vertices,6)
    rotation = ((math.pi/2,0,0) if axis == 'Y' else
                ((0,math.pi/2,0) if axis == 'X' else (0,0,0)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(mat)
    bevel=obj.modifiers.new('forged-edge-wear','BEVEL'); bevel.width=.012; bevel.segments=1
    bpy.context.view_layer.objects.active=obj; bpy.ops.object.modifier_apply(modifier=bevel.name)
    return parent(obj,state)

def beam(name, start, end, radius, mat, state='shared', vertices=8):
    vertices=min(vertices,4)
    a,b=Vector(start),Vector(end); direction=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(a+b)/2)
    obj=bpy.context.object; obj.name=name; obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=direction.to_track_quat('Z','Y')
    obj.data.materials.append(mat)
    return parent(obj,state)

def torus(name, loc, major, minor, mat, state='shared'):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=10, minor_segments=4, location=loc)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(mat)
    return parent(obj,state)

# The base is buried in an irregular scar, not displayed on a square plinth.
cube('everburn-buried-well-footing',(0,-.06,0),(5.3,.18,4.7),ground,.08)
verts=[(0,.035,0)]; faces=[]; rng=random.Random(7319); segments=40
for i in range(segments):
    angle=math.tau*i/segments; radius=4.0+rng.uniform(-.35,.28)
    verts.append((radius*math.cos(angle),rng.uniform(.015,.065),radius*.73*math.sin(angle)))
for i in range(segments): faces.append((0,i+1,(i+1)%segments+1))
mesh=bpy.data.meshes.new('everburn-scorched-ground-mesh'); mesh.from_pydata(verts,[],faces)
scar=bpy.data.objects.new('everburn-scorched-ground-ragged-edge',mesh); bpy.context.collection.objects.link(scar); scar.data.materials.append(ground); parent(scar,'shared')
# Larger, mismatched wreckage: bent pipe, plate shards, and torn sheet edges.
for i in range(22):
    a=rng.uniform(0,math.tau); rad=rng.uniform(1.4,3.45)
    x,z=rad*math.cos(a),rad*.75*math.sin(a)
    if i%3==0:
        chunk=cylinder(f'everburn-slag-pipe-{i:02d}',(x,rng.uniform(.03,.13),z),rng.uniform(.08,.14),rng.uniform(.45,1.05),rust if i%2 else steel,8,'Z')
        chunk.rotation_euler[1]=rng.uniform(-.35,.35); chunk.rotation_euler[2]=a
    else:
        chunk=cube(f'everburn-slag-plate-{i:02d}',(x,rng.uniform(.025,.11),z),
                   (rng.uniform(.3,.9),rng.uniform(.06,.14),rng.uniform(.16,.5)),
                   flaking if i%4==0 else (rust if i%2 else steel),.025)
        chunk.rotation_euler[1]=rng.uniform(-.5,.5); chunk.rotation_euler[2]=a

# Large welded collar and well casing, oriented up the shared +Y axis.
cylinder('everburn-well-casing',(0,.74,0),.62,1.15,steel,24)
for i in range(12):
    a=i*math.tau/12
    x,z=.64*math.cos(a),.64*math.sin(a)
    cylinder(f'everburn-collar-weld-{i:02d}',(x,1.05,z),.085,.34,rust,8)
    cylinder(f'everburn-rivet-{i:02d}',(x,1.16,z),.039,.035,flaking,8)
cylinder('everburn-top-collar',(0,1.32,0),.77,.16,rust,24)
cylinder('everburn-bore-rim',(0,1.414,0),.57,.035,steel,24)
cylinder('everburn-bore-dark',(0,1.438,0),.49,.018,cap_mat,24)
# Raised collar flanges, visible weld beads, plate overlaps and long rust runs.
for y,radius in ((.38,.64),(.63,.64),(1.01,.64),(1.31,.79)):
    torus(f'everburn-casing-weld-bead-{y}',(0,y,0),radius,.025,rust)
for i in range(9):
    a=i*2.17+.3; x=.622*math.cos(a); z=.622*math.sin(a)
    streak=cube(f'everburn-rust-run-{i:02d}',(x,.52+(i%4)*.12,z),(.038,.25+(i%3)*.13,.018),rust,.008)
    streak.rotation_euler[1]=a

# Heavy pipe elbows and flange plates, with actual fasteners and hand welds.
for side in (-1,1):
    cylinder(f'everburn-side-flange-{side}',(side*.73,.72,0),.25,.18,rust,16,'X')
    beam(f'everburn-side-pipe-{side}',(side*.72,.72,0),(side*1.18,.72,0),.12,steel)
    beam(f'everburn-riser-{side}',(side*1.15,.72,0),(side*1.15,1.12,0),.12,rust)
    torus(f'everburn-riser-weld-{side}',(side*1.15,1.08,0),.13,.024,flaking)
    for j in range(6):
        a=j*math.tau/6
        x=side*.73; y=.72+.205*math.sin(a); z=.205*math.cos(a)
        cylinder(f'everburn-flange-bolt-{side}-{j}',(x,y,z),.034,.07,flaking,8,'X')

# Wheel valve, turned toward the approach, built from forged spokes and a thick rim.
beam('everburn-valve-stem',(0,.92,-.68),(0,.92,-1.02),.085,rust)
torus('everburn-hand-wheel',(0,.92,-1.08),.42,.055,flaking,'everburn-valve-wheel')
cylinder('everburn-valve-hub',(0,.92,-1.08),.13,.18,rust,12,'X','everburn-valve-wheel')
for i in range(8):
    a=i*math.tau/8
    beam(f'everburn-wheel-spoke-{i}',(0,.92,-1.08),(0,.92+.37*math.sin(a),-1.08+.37*math.cos(a)),.032,steel,'everburn-valve-wheel',6)

# Building-height flare tower with an access ladder, platforms and real guy wires.
cylinder('everburn-flare-stack',(0,4.68,0),.25,7.2,rust,20)
for y in (1.45,2.35,3.3,4.3,5.3,6.35,7.35,8.25):
    torus(f'everburn-stack-welded-collar-{y}',(0,y,0),.265,.043,steel)
    if y in (2.35,4.3,6.35,8.25):
        for i in range(12):
            a=i*math.tau/12
            cylinder(f'everburn-stack-flange-bolt-{y}-{i}',(.266*math.cos(a),y,.266*math.sin(a)),.025,.035,flaking,6)
for side in (-1,1):
    for front in (-1,1):
        beam(f'everburn-guywire-{side}-{front}',(side*2.8,.16,front*2.2),(0,8.15,0),.018,steel,'shared',6)
        cylinder(f'everburn-guy-anchor-{side}-{front}',(side*2.8,.16,front*2.2),.14,.14,rust,10)
        cube(f'everburn-guy-anchor-pad-{side}-{front}',(side*2.8,.045,front*2.2),(.42,.09,.34),flaking,.018)
for side in (-1,1):
    beam(f'everburn-ladder-rail-{side}',(side*.37,.3,-.36),(side*.37,8.1,-.36),.045,steel,'shared',8)
for y in [i*.34+.42 for i in range(23)]:
    beam(f'everburn-ladder-rung-{y:.2f}',(-.37,y,-.36),(.37,y,-.36),.027,rust,'shared',6)
for y in (2.6,5.1,7.6):
    cube(f'everburn-ladder-rest-platform-{y}',(0,y,-.32),(.92,.075,.68),flaking,.035)
    for side in (-1,1): beam(f'everburn-platform-brace-{y}-{side}',(side*.38,y-.55,-.35),(side*.38,y,-.35),.035,rust)
for i in range(8):
    a=i*math.tau/8
    beam(f'everburn-vent-tooth-{i}',(.22*math.cos(a),8.37,.22*math.sin(a)),(.42*math.cos(a),8.24,.42*math.sin(a)),.065,steel)
cylinder('everburn-vent-crown',(0,8.32,0),.36,.15,steel,20)

# The cap is an independently named state: a welded plate and chain dog, held
# above the bore for the burning render and selectable at the bore by WW-SCENE.
cube('everburn-cap-plate',(0,1.53,0),(1.14,.16,1.14),cap_mat,.06,'everburn-capped')
for i in range(4):
    x=(-1 if i%2 else 1)*.43; z=(-1 if i//2 else 1)*.43
    cylinder(f'everburn-cap-bolt-{i}',(x,1.62,z),.055,.05,rust,8,state='everburn-capped')
cube('everburn-cap-crossbar',(0,1.64,0),(.23,.2,1.38),rust,.04,'everburn-capped')
for side in (-1,1):
    cube(f'everburn-cap-overlap-clamp-{side}',(side*.51,1.50,0),(.18,.42,1.28),steel,.035,'everburn-capped')
    cylinder(f'everburn-cap-lock-bolt-{side}',(side*.55,1.52,-.51),.07,.11,rust,8,'X','everburn-capped')
beam('everburn-cap-chain',(0,1.56,-.57),(0,.48,-.83),.032,steel,'everburn-capped',8)

# Flame meshes are only present in the named burning state. Their uneven edges
# and incandescent core echo the existing arsenal flame colour, without a toy
# smooth cone or an external texture dependency.
def flame(name, base, height, width, mat, phase, lean=0):
    verts=[]; faces=[]; rings=9; sides=6
    for r in range(rings):
        t=r/(rings-1); wobble=(1-.70*t)*(1+.26*math.sin(t*math.pi))
        for s in range(sides):
            a=s*math.tau/sides
            wave=1+.24*math.sin(s*2.4+phase+r*.83)+.1*math.sin(s*4.1+r*.47)
            verts.append((base[0]+lean*t+math.cos(a)*width*wobble*wave,base[1]+height*t,base[2]+math.sin(a)*width*wobble*wave))
    for r in range(rings-1):
        for s in range(sides):
            i=r*sides+s; j=r*sides+(s+1)%sides
            faces.append((i,j,j+sides,i+sides))
    faces.append(tuple(range((rings-1)*sides,rings*sides)))
    mesh=bpy.data.meshes.new(name+'-mesh'); mesh.from_pydata(verts,[],faces); mesh.materials.append(mat)
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    return parent(obj,'everburn-burning')
flame('everburn-flame-outer',(0,8.38,0),4.2,.68,flame_outer,1.1)
flame('everburn-flame-yellow-interior',(0,8.42,0),3.5,.43,flame_inner,2.4,.1)
flame('everburn-flame-core',(0,8.43,0),2.5,.23,flame_core,3.3,-.06)
for i in range(7):
    a=i*2.399
    flame(f'everburn-ragged-flame-tongue-{i:02d}',(.18*math.cos(a),8.45,.18*math.sin(a)),
          2.0+(i%4)*.43,.15+(i%3)*.055,flame_inner if i%3 else flame_outer,1.2+i*.61,
          .35*math.sin(a))
for i in range(10):
    a=rng.uniform(0,math.tau); rad=rng.uniform(1.05,2.7)
    spark=cylinder(f'everburn-ground-ember-{i:02d}',(rad*math.cos(a),.1,rad*.75*math.sin(a)),.035+(i%4)*.012,.05,ember,6,state='everburn-burning')
    spark.rotation_euler[1]=a

# Small welded brackets visibly tie the wheel, flanges and stack foot together.
for side in (-1,1):
    cube(f'everburn-stack-foot-bracket-{side}',(side*.31,1.53,0),(.22,.18,.52),steel,.025)
    cylinder(f'everburn-stack-foot-rivet-{side}',(side*.4,1.57,-.235),.042,.04,flaking,8,'X')

# A plain, adult-height worker silhouette gives the long view honest scale.
person_x,person_z=3.2,-1.0
cylinder('everburn-scale-worker-boots',(person_x,.1,person_z),.16,.24,steel,8,'Y','shared')
for side in (-1,1):
    beam(f'everburn-scale-worker-leg-{side}',(person_x+side*.11,.18,person_z),(person_x+side*.12,.88,person_z),.065,flaking,'shared',8)
cube('everburn-scale-worker-coat',(person_x,1.10,person_z),(.48,.62,.30),rust,.08)
for side in (-1,1):
    beam(f'everburn-scale-worker-arm-{side}',(person_x+side*.20,1.29,person_z),(person_x+side*.34,.75,person_z-.05),.06,steel,'shared',8)
cylinder('everburn-scale-worker-head',(person_x,1.62,person_z),.13,.24,flaking,10,'Y')
cube('everburn-scale-worker-helmet',(person_x,1.77,person_z),(.34,.09,.30),rust,.035)
for obj in bpy.context.scene.objects:
    if obj.name.startswith('everburn-scale-worker-'): obj['review-only']=True

# Blender scenes use Z up. The source geometry follows the game's +Y up
# contract, so turn the single model root before saving, export, and review.
root_obj.rotation_euler[0] = math.pi / 2

# Collapse same-material hardware into a few selectable meshes. State groups
# stay separate so the capped and burning variants remain switchable.
reserved={'everburn-hand-wheel','everburn-cap-plate','everburn-flame-outer','everburn-flame-core','everburn-flare-stack'}
groups={}
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH' or obj.name in reserved or obj.get('review-only'): continue
    material_name=obj.data.materials[0].name if obj.data.materials else 'unpainted'
    key=(obj.get('state','shared'),material_name)
    groups.setdefault(key,[]).append(obj)
for (state,material_name),members in groups.items():
    if len(members)<2: continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in members: obj.select_set(True)
    active=members[0]; bpy.context.view_layer.objects.active=active
    bpy.ops.object.join()
    active['state']=state
    active.name=f'everburn-merged-{state}-{material_name}'

def state_render(folder):
    folder.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene
    scene.render.engine='BLENDER_EEVEE_NEXT'
    scene.eevee.taa_render_samples=24
    scene.render.resolution_x=960; scene.render.resolution_y=720; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
    scene.world.color=(.028,.028,.028)
    for loc,energy,size in [((7,-6,12),2100,7),((-6,2,8),1250,5)]:
        bpy.ops.object.light_add(type='AREA', location=loc); light=bpy.context.object; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size
        light.rotation_euler=(Vector((0,4,0))-light.location).to_track_quat('-Z','Y').to_euler()
    camera_data=bpy.data.cameras.new('everburn-review-camera'); camera=bpy.data.objects.new('everburn-review-camera',camera_data); scene.collection.objects.link(camera); scene.camera=camera
    camera_data.lens=38
    bpy.ops.mesh.primitive_plane_add(size=1200, location=(0,-.16,0))
    review_ground=bpy.context.object; review_ground.name='review-only-flat-ground'; review_ground.data.materials.append(ground)
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    for name,location,target,hide_cap,hide_fire in [
        ('40m-car-height',(8,-39,1.65),(0,0,4.6),True,False),
        ('three-quarter',(13,-15,14),(0,0,6.1),True,False),
        ('close-detail',(4,-6,3.2),(0,0,1.25),True,False),
        ('capped-three-quarter',(13,-15,14),(0,0,6.1),False,True)]:
        for obj in bpy.context.scene.objects:
            if obj.get('state')=='everburn-capped': obj.hide_render=hide_cap
            if obj.get('state')=='everburn-burning': obj.hide_render=hide_fire
        camera.location=location; focus=Vector(target)
        camera.rotation_euler=(focus-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.lens=50 if name=='40m-car-height' else (62 if 'close' in name else 38)
        scene.render.filepath=str(folder/f'everburn-{name}.png')
        bpy.ops.render.render(write_still=True)

out.parent.mkdir(parents=True,exist_ok=True); blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='SELECT')
for obj in bpy.context.scene.objects:
    if obj.get('review-only'): obj.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_apply=True,export_animations=False,use_selection=True)
if args.render:
    bpy.ops.mesh.primitive_plane_add(size=1200, location=(0,-.16,0))
    review_ground=bpy.context.object; review_ground.name='review-only-flat-ground'; review_ground.data.materials.append(ground)
    state_render((root/args.render).resolve())
print(f'Exported {out}')
