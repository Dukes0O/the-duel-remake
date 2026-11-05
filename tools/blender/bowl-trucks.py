"""Build five welded-steel rival-truck bolt-on sets for the Titan Monster."""
import argparse
import json
import math
import sys
from pathlib import Path

NAMES = ('rust-rhino', 'big-kettle', 'tin-lizard', 'old-bess', 'dragon-wagon')

def args():
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True)
    p.add_argument('--out', default='public/assets/models/wasteland/bowl/trucks.glb')
    p.add_argument('--render', default='')
    p.add_argument('--paths-only', action='store_true')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])

a = args()
root = Path(a.root).resolve()
out = (root / a.out).resolve()
native = root / 'art-build/bowl-trucks/bowl-trucks.blend'
if not (out.is_relative_to(root / 'public/assets/models/wasteland/bowl') or out.is_relative_to(root / '.qa-dist')):
    raise SystemExit('GLB output must stay in public/assets/models/wasteland/bowl or lane .qa-dist')
if a.paths_only:
    print(json.dumps({'blend': [str(native)], 'glb': [str(out)], 'json': []}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=.65, rough=.78):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = rough
    return m

steel = mat('Bowl dark pitted steel', (.12,.13,.12))
rust = mat('Bowl oxide and scale', (.34,.12,.045), .48)
red = mat('Bowl faded oxide red', (.42,.10,.045), .38)
yellow = mat('Bowl old hazard paint', (.58,.39,.09), .35)
soot = mat('Bowl soot black', (.035,.04,.035), .25)
names = []

def xyz(p):
    # Convert game-local metres (+Y up, +Z forward) into Blender Z-up.
    # The Titan roof socket is about 1.5 m above the chassis reference origin.
    return (p[0], -p[2], p[1] + 1.5)

def beam(name, p, q, width, material, depth=None):
    v1, v2 = Vector(xyz(p)), Vector(xyz(q))
    direction = v2-v1
    bpy.ops.mesh.primitive_cube_add(size=1, location=(v1+v2)/2)
    o=bpy.context.object; o.name=name
    o.dimensions=(width, depth or width, direction.length)
    o.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material); names.append(o)
    return o

def plate(name, center, size, material, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(center))
    o=bpy.context.object; o.name=name; o.dimensions=size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    mod=o.modifiers.new('soft cut steel edge','BEVEL'); mod.width=bevel; mod.segments=1
    o.modifiers.new('weighted shop normals','WEIGHTED_NORMAL')
    names.append(o); return o

def pipe(name, p, q, radius, material, vertices=10):
    v1,v2=Vector(xyz(p)),Vector(xyz(q)); d=v2-v1
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=d.length, location=(v1+v2)/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    o.data.materials.append(material); names.append(o); return o

def bolt(name, p, radius=.027):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=4, radius=radius, location=xyz(p))
    o=bpy.context.object; o.name=name; o.scale=(1,1,.5); o.data.materials.append(yellow); names.append(o)

def tag(index, part): return f'{NAMES[index]}-{part}'

# Sockets follow the Titan's wheelbase and roof line. Parts sit close to the
# shell; the show rigs look shop-built and heavy, with visible plate edges.
def horn(i, side):
    sx=side*.34
    beam(tag(i,'horn-root'),(sx,.99,1.35),(sx*1.12,1.13,1.67),.16,steel,.22)
    beam(tag(i,'horn-up'),(sx*1.12,1.13,1.67),(sx*1.22,1.50,1.92),.12,rust,.16)
    pipe(tag(i,'horn-tip'),(sx*1.22,1.50,1.92),(sx*1.25,1.58,1.99),.065,steel,8)

for i,n in enumerate(NAMES):
    start=len(names)
    if i==0: # Rust Rhino: twin forged, backward-swept plow horns.
        for s in (-1,1): horn(i,s)
        plate(tag(i,'grille-guard'),(0,.75,1.61),(.76,.18,.10),rust)
    elif i==1: # Big Kettle: squat riveted boiler with flanged lid and stack.
        plate(tag(i,'boiler-cradle'),(0,1.10,-.02),(.75,.16,.74),steel)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=xyz((0,1.40,.04)))
        o=bpy.context.object; o.name=tag(i,'boiler-shell'); o.scale=(.39,.35,.46); o.data.materials.append(rust); names.append(o)
        for z in (-.24,.24):
            pipe(tag(i,'boiler-band'),(-.37,1.39,z),(.37,1.39,z),.025,steel)
        pipe(tag(i,'smoke-stack'),(0,1.62,.19),(0,2.17,.19),.12,soot)
        plate(tag(i,'stack-cap'),(0,2.17,.19),(.28,.07,.27),yellow)
        for s in (-1,1):
            for k in range(3): bolt(tag(i,'boiler-rivet'),(s*.34,1.40,-.26+k*.25),.024)
    elif i==2: # Tin Lizard: segmented articulated tail over the rear socket.
        for j in range(5):
            z=-.75-.28*j; y=1.16+.065*j; w=.39-.048*j
            plate(tag(i,f'tail-segment-{j+1}'),(0,y,z),(w,.18,.31),rust if j%2 else steel,.04)
            beam(tag(i,'tail-spine'),(0,y+.13,z+.1),(0,y+.17,z-.1),.035,yellow)
        plate(tag(i,'tail-fin'),(0,1.52,-2.05),(.12,.42,.42),red,.03)
    elif i==3: # Old Bess: two salvaged pressure tanks, valve guards and straps.
        for s in (-1,1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.22, depth=.88, location=xyz((s*.31,1.37,-.08)), rotation=(math.pi/2,0,0))
            o=bpy.context.object; o.name=tag(i,'side-tank'); o.data.materials.append(yellow if s<0 else rust); names.append(o)
            for z in (-.47,.31):
                beam(tag(i,'tank-strap'),(s*.31,1.16,z),(s*.31,1.59,z),.045,steel,.48)
            pipe(tag(i,'tank-valve'),(s*.31,1.58,.36),(s*.31,1.76,.36),.035,steel)
            beam(tag(i,'tank-cage'),(s*.52,1.14,-.56),(s*.52,1.62,.42),.045,steel)
        plate(tag(i,'rear-step'),(0,1.08,-.62),(.92,.13,.25),steel)
    else: # Dragon Wagon: paired flared flame stacks, furnace throat and guard.
        for s in (-1,1):
            beam(tag(i,'stack-riser'),(s*.27,1.01,-.10),(s*.31,1.61,-.25),.12,steel,.15)
            beam(tag(i,'stack-neck'),(s*.31,1.61,-.25),(s*.34,2.08,-.29),.105,rust,.13)
            plate(tag(i,'flared-mouth'),(s*.34,2.09,-.29),(.25,.12,.23),soot,.025)
            for k in range(4): bolt(tag(i,'flange-rivet'),(s*.34+(k-1.5)*.04,1.60,-.25),.018)
        plate(tag(i,'heat-guard'),(0,1.04,-.18),(.67,.20,.18),yellow)
    # Shared bolt heads and weld tabs make the fittings read as fabricated.
    for s in (-1,1):
        for z in (-.55,.55):
            plate(tag(i,'mount-tab'),(s*.29,1.07,z),(.16,.11,.13),steel,.015)
            bolt(tag(i,'mount-bolt'),(s*.29,1.13,z),.025)
    for o in names[start:]:
        # Keep the boiler over the open rear bed and the tanks outside the cab.
        if i == 1:
            o.location.y += .9
            o.location.z += .45
        elif i == 3:
            o.location.x *= 1.55
            o.location.y += .75
            o.location.z += .2
        o['rival'] = n
        o['socket-set'] = 'titan_monster-roof-and-rear'

# One named root and separate, explicitly named groups for menu/game selection.
root_empty=bpy.data.objects.new('bowl-rival-trucks',None); bpy.context.collection.objects.link(root_empty)
for o in names:
    o.parent=root_empty

scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=960; scene.render.resolution_y=720; scene.render.resolution_percentage=100
scene.world.color=(.07,.07,.07)
for loc,power,size in [((6,-7,8),1500,6),((-6,-3,5),950,5),((0,5,7),1200,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc); lamp=bpy.context.object; lamp.data.energy=power; lamp.data.shape='DISK'; lamp.data.size=size

def camera(location,target,scale):
    bpy.ops.object.camera_add(location=location); c=bpy.context.object
    c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler()
    c.data.type='ORTHO'; c.data.ortho_scale=scale; scene.camera=c

out.parent.mkdir(parents=True,exist_ok=True)
native.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(native))
bpy.ops.object.select_all(action='DESELECT')
for o in [root_empty,*names]: o.select_set(True)
bpy.context.view_layer.objects.active=root_empty
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True, export_apply=True)

if a.render:
    render=Path(a.render).resolve()
    if not render.is_relative_to(root/'.evidence'):
        raise SystemExit('render output must stay under lane .evidence')
    render.mkdir(parents=True,exist_ok=True)
    # Use the shipped Titan body in the look renders so the socket fit can be judged.
    bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/unlocks/titan_monster.glb'))
    titan=[o for o in bpy.context.scene.objects if o.type=='MESH' and o not in names]
    for o in titan: o.hide_render=False
    # Hide other rivals to show each fitting in isolation, then capture three views.
    for rival in NAMES:
        group=[o for o in names if o.get('rival')==rival]
        for o in names: o.hide_render=o not in group
        for view,loc,target in [('front-three-quarter',(7,-9,5),(0,2.3,.2)),('side',(8,0,4),(0,2.3,.2)),('rear-three-quarter',(-7,8,5),(0,2.3,-.2))]:
            camera(loc,target,10.5)
            scene.render.filepath=str(render/f'{rival}-{view}.png')
            bpy.ops.render.render(write_still=True)
        for o in group: o.hide_render=False

print('GLB',out,'bytes',out.stat().st_size,'objects',len(names))
