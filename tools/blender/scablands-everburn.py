"""Build the Scablands gas well and render its capped and burning states."""
import argparse
import json
import math
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
flaking = material('everburn-ash-grey-paint', (.23,.245,.22), .48, .9)
ground = material('everburn-charred-gravel', (.105,.091,.068), .05, .98)
ember = material('everburn-embers', (.95,.24,.025), .05, .5, ((1,.09,.008),2.2))
flame_orange = material('everburn-flame-orange', (.62,.045,.006), 0, .35, ((1,.075,.004),1.8))
flame_gold = material('everburn-flame-core', (.9,.22,.012), 0, .28, ((1,.24,.008),2.5))
cap_mat = material('everburn-ash-men-cap', (.12,.13,.11), .76, .75)

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
    rotation = ((math.pi/2,0,0) if axis == 'Y' else
                ((0,math.pi/2,0) if axis == 'X' else (0,0,0)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(mat)
    bevel=obj.modifiers.new('forged-edge-wear','BEVEL'); bevel.width=.012; bevel.segments=1
    bpy.context.view_layer.objects.active=obj; bpy.ops.object.modifier_apply(modifier=bevel.name)
    return parent(obj,state)

def beam(name, start, end, radius, mat, state='shared', vertices=8):
    a,b=Vector(start),Vector(end); direction=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(a+b)/2)
    obj=bpy.context.object; obj.name=name; obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=direction.to_track_quat('Z','Y')
    obj.data.materials.append(mat)
    return parent(obj,state)

def torus(name, loc, major, minor, mat, state='shared'):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=24, minor_segments=6, location=loc)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(mat)
    return parent(obj,state)

# Scorched, uneven pad with cracked plates and a ring of old spill-rock.
cube('everburn-charred-ground-plinth',(0,.03,0),(5.6,.12,4.8),ground,.08)
for i in range(24):
    a=i*2.399
    x=2.0*math.cos(a); z=1.55*math.sin(a)
    pebble=cube(f'everburn-slag-{i:02d}',(x,.13,z),(.18+(i%3)*.05,.11,.14), rust if i%3 else steel,.025)
    pebble.rotation_euler[1]=a

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

# Heavy pipe elbows and flange plates, with actual fasteners and hand welds.
for side in (-1,1):
    cylinder(f'everburn-side-flange-{side}',(side*.73,.72,0),.25,.18,rust,16,'X')
    beam(f'everburn-side-pipe-{side}',(side*.72,.72,0),(side*1.18,.72,0),.12,steel)
    beam(f'everburn-riser-{side}',(side*1.15,.72,0),(side*1.15,1.12,0),.12,rust)
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

# Tall flare stack: battered guyed mast, welded collars, vent crown and soot hood.
cylinder('everburn-flare-stack',(0,2.63,0),.24,2.42,rust,16)
for y in (1.55,2.5,3.48):
    torus(f'everburn-stack-collar-{y}',(0,y,0),.255,.04,steel)
for side in (-1,1):
    beam(f'everburn-guywire-{side}',(side*.95,.17,side*.72),(0,3.45,0),.018,steel,'shared',6)
    cylinder(f'everburn-anchor-{side}',(side*.95,.17,side*.72),.11,.12,rust,10)
for i in range(8):
    a=i*math.tau/8
    beam(f'everburn-vent-tooth-{i}',(.22*math.cos(a),3.85,.22*math.sin(a)),(.38*math.cos(a),3.72,.38*math.sin(a)),.055,steel)
cylinder('everburn-vent-crown',(0,3.72,0),.34,.12,steel,16)

# The cap is an independently named state: a welded plate and chain dog, held
# above the bore for the burning render and selectable at the bore by WW-SCENE.
cube('everburn-cap-plate',(0,1.53,0),(1.14,.16,1.14),cap_mat,.06,'everburn-capped')
for i in range(4):
    x=(-1 if i%2 else 1)*.43; z=(-1 if i//2 else 1)*.43
    cylinder(f'everburn-cap-bolt-{i}',(x,1.62,z),.055,.05,rust,8,state='everburn-capped')
cube('everburn-cap-crossbar',(0,1.64,0),(.23,.2,1.38),rust,.04,'everburn-capped')
beam('everburn-cap-chain',(0,1.56,-.57),(0,.48,-.83),.028,steel,'everburn-capped',8)

# Flame meshes are only present in the named burning state. Their uneven edges
# and incandescent core echo the existing arsenal flame colour, without a toy
# smooth cone or an external texture dependency.
def flame(name, base, height, width, mat, phase):
    verts=[]; faces=[]; rings=12; sides=9
    for r in range(rings):
        t=r/(rings-1); wobble=1-.72*t
        for s in range(sides):
            a=s*math.tau/sides
            wave=1+.16*math.sin(s*2.4+phase+r*.83)
            verts.append((base[0]+math.cos(a)*width*wobble*wave,base[1]+height*t,base[2]+math.sin(a)*width*wobble*wave))
    for r in range(rings-1):
        for s in range(sides):
            i=r*sides+s; j=r*sides+(s+1)%sides
            faces.append((i,j,j+sides,i+sides))
    faces.append(tuple(range((rings-1)*sides,rings*sides)))
    mesh=bpy.data.meshes.new(name+'-mesh'); mesh.from_pydata(verts,[],faces); mesh.materials.append(mat)
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    return parent(obj,'everburn-burning')
flame('everburn-flame-outer',(0,3.78,0),3.2,.31,flame_orange,1.1)
flame('everburn-flame-core',(0,3.82,0),2.55,.17,flame_gold,2.4)
for i in range(14):
    a=i*2.399
    spark=cylinder(f'everburn-ground-ember-{i:02d}',(1.25*math.cos(a),.19,1.1*math.sin(a)),.045+(i%3)*.012,.05,ember,6,state='everburn-burning')
    spark.rotation_euler[1]=a

# Low fractured steel scraps around the base, dark deposits and rusty streak plates.
for i in range(18):
    a=i*2.399; rad=1.0+(i%4)*.13
    chunk=cube(f'everburn-scorch-flake-{i:02d}',(rad*math.cos(a),.16,rad*math.sin(a)),(.35,.07,.12),flaking if i%3==0 else rust,.018)
    chunk.rotation_euler[1]=a

# Blender scenes use Z up. The source geometry follows the game's +Y up
# contract, so turn the single model root before saving, export, and review.
root_obj.rotation_euler[0] = math.pi / 2

def state_render(folder):
    folder.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene
    scene.render.engine='BLENDER_EEVEE_NEXT'
    scene.eevee.taa_render_samples=24
    scene.render.resolution_x=720; scene.render.resolution_y=640; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
    scene.world.color=(.028,.028,.028)
    for loc,energy,size in [((4,-4,9),1450,5),((-4,3,5),950,4)]:
        bpy.ops.object.light_add(type='AREA', location=loc); light=bpy.context.object; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size
        light.rotation_euler=(Vector((0,2,0))-light.location).to_track_quat('-Z','Y').to_euler()
    camera_data=bpy.data.cameras.new('everburn-review-camera'); camera=bpy.data.objects.new('everburn-review-camera',camera_data); scene.collection.objects.link(camera); scene.camera=camera
    camera_data.lens=38
    for name,angle,hide_cap,hide_fire in [('three-quarter',.72,True,False),('capped',.55,False,True),('side',1.48,True,False)]:
        for obj in bpy.context.scene.objects:
            if obj.get('state')=='everburn-capped': obj.hide_render=hide_cap
            if obj.get('state')=='everburn-burning': obj.hide_render=hide_fire
        camera.location=(12*math.sin(angle),-12*math.cos(angle),7.0); target=Vector((0,0,3.0))
        camera.rotation_euler=(target- camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(folder/f'everburn-{name}.png')
        bpy.ops.render.render(write_still=True)

out.parent.mkdir(parents=True,exist_ok=True); blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_apply=True,export_animations=False)
if args.render:
    state_render((root/args.render).resolve())
print(f'Exported {out}')
