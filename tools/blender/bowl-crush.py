"""Build the Bowl's crushed-vehicle obstacles and render the one-round art sheet.

Run: blender -b --python tools/blender/bowl-crush.py -- --root .
Metres, +Y up, +Z forward. The root empty is the obstacle origin.
"""
import argparse
import math
import json
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--out', default='public/assets/models/wasteland/bowl/crush.glb')
p.add_argument('--render', default='', help='directory for the four uncompressed review views')
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(a.root).resolve()
out = root / a.out
if a.paths_only:
    print(json.dumps({'blend': [str(root / 'art-build/bowl-crush/bowl-crush.blend')], 'glb': [str(out)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

scene = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials,):
    for item in list(datablocks): datablocks.remove(item)

def mat(name, color, metallic=.25, rough=.82):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1)
    m.use_nodes = True; bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic; bs.inputs['Roughness'].default_value = rough
    noise = m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 5.5
    noise.inputs['Detail'].default_value = 3; noise.inputs['Roughness'].default_value = .78
    ramp = m.node_tree.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .22; ramp.color_ramp.elements[0].color = (color[0]*.48,color[1]*.44,color[2]*.42,1)
    ramp.color_ramp.elements[1].position = .79; ramp.color_ramp.elements[1].color = (min(color[0]*1.25+.10,1),min(color[1]*1.12+.07,1),min(color[2]*.95+.05,1),1)
    m.node_tree.links.new(noise.outputs['Fac'], ramp.inputs[0]); m.node_tree.links.new(ramp.outputs['Color'], bs.inputs['Base Color'])
    return m
RUST=mat('crush-rust-bloom',(.27,.105,.045)); STEEL=mat('crush-welded-steel',(.22,.24,.23),.68)
PAINT=mat('crush-faded-oxide-red',(.38,.15,.09),.25); GLASS=mat('crush-sooted-glass',(.045,.061,.060),.18)
RUBBER=mat('crush-cracked-rubber',(.055,.052,.046),.05); SOOT=mat('crush-fire-soot',(.075,.062,.048),.12)
EMBER=mat('crush-ember-glow',(.95,.24,.025),.05,.6)
objects=[]
def box(name, loc, scale, material, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('bent_edges','BEVEL'); mod.width=bevel; mod.segments=1
        o.modifiers.new('weighted_welds','WEIGHTED_NORMAL')
    objects.append(o); return o
def wheel(x,y,z,r=.39,depth=.18):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=r, depth=depth, location=(x,y,z), rotation=(0,math.pi/2,0))
    o=bpy.context.object; o.name='crush-wheel'; o.data.materials.append(RUBBER); objects.append(o)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=r*.43, depth=depth*1.08, location=(x*1.015,y,z), rotation=(0,math.pi/2,0))
    h=bpy.context.object; h.name='rusted-hub'; h.data.materials.append(RUST); objects.append(h)
def vehicle(kind, center, crushed=False, burnt=False, ident='vehicle'):
    x,y,z=center; length,width,height={'van':(4.8,1.9,2.1),'bus':(9.1,2.45,3.0),'rv':(6.6,2.35,2.85)}[kind]
    if crushed: height*=.53; y+=height*.38
    shell=SOOT if burnt else (PAINT if kind!='rv' else RUST)
    # Longitudinal body, imperfect upper panel and cab: deliberately battered slabs, not toy proportions.
    box(ident+'-lower-body',(x,y+height*.28,z),(width*.94,height*.48,length),shell,.08)
    if kind=='van':
        box(ident+'-cab-roof',(x,y+height*.69,z-length*.10),(width*.91,height*.35,length*.61),shell,.06)
        for s in (-1,1): box(ident+'-windshield',(x+s*width*.474,y+height*.71,z-length*.26),(.025,height*.22,length*.23),GLASS,.008)
        for s in (-1,1):
            for q in (-1,1): wheel(x+s*width*.47,y-height*.03,z+q*length*.31,.38)
        # peeled sliding door and exposed ribs
        box(ident+'-torn-door',(x-width*.51,y+height*.38,z+length*.10),(.045,height*.34,length*.42),RUST,.015)
    else:
        box(ident+'-roof',(x,y+height*.67,z),(width*.95,height*.28,length*.98),shell,.05)
        panes=5 if kind=='bus' else 3
        for s in (-1,1):
            for i in range(panes):
                zz=z-length*.38+i*(length*.76/max(1,panes-1))
                box(ident+'-dark-window',(x+s*width*.484,y+height*.60,zz),(.025,height*.19,length*.115 if kind=='bus' else length*.16),GLASS,.008)
                box(ident+'-window-frame',(x+s*width*.50,y+height*.60,zz-length*.066),(.035,height*.22,.025),STEEL,.004)
        for s in (-1,1):
            for q in (-1,1): wheel(x+s*width*.49,y-height*.04,z+q*length*.32,.43 if kind=='bus' else .4,.21)
        # axles and torn corrugated side strips
        for q in (-.26,.03,.27): box(ident+'-rib',(x-width*.49,y+height*.35,z+length*q),(.04,height*.34,.035),STEEL,.006)
    for s in (-1,1):
        for zz in (-length*.34,length*.34):
            box(ident+'-bumper',(x+s*width*.49,y+height*.19,z+zz),(.10,.16,.58),STEEL,.025)
    # Weld seams, rivets and irregular scrap patches catch light across the broad sides.
    for s in (-1,1):
        for i in range(7 if kind=='bus' else 4):
            zz=z-length*.39+i*length*.13
            box(ident+'-weld-plate',(x+s*width*.505,y+height*.35,zz),(.035,.12,.36 if kind=='bus' else .44),STEEL if i%3 else RUST,.012)
    if burnt:
        for i in range(9):
            xx=x+math.sin(i*3.7)*width*.27; zz=z-length*.38+i*length*.095
            flame=box(ident+'-fire',(xx,y+height*.93+(i%3)*.18,zz),(.17,.48+(i%2)*.22,.16),EMBER,.06)
            flame.rotation_euler[2]=math.sin(i)*.18
        box(ident+'-charred-roof',(x,y+height*.77,z),(width*.82,.08,length*.83),SOOT,.04)
    return length,width,height

# Four original shapes arranged for inspection: a crushed van, intact bus, RV and burning stacked buses.
root_empty=bpy.data.objects.new('bowl-crush',None); scene.collection.objects.link(root_empty)
vehicle('van',(-4.7,0,0),True,False,'van-crushed')
vehicle('bus',(0,0,0),False,False,'bus-whole')
vehicle('rv',(4.8,0,0),False,False,'rv-whole')
vehicle('bus',(0,0,7.0),True,True,'bus-fire-lower')
vehicle('bus',(0,1.35,7.2),True,True,'bus-fire-upper')
for o in objects: o.parent=root_empty
root_empty.location=(0,0,0)

def assign(works):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in works: obj.select_set(True)
    bpy.context.view_layer.objects.active=works[0]
    bpy.ops.object.join(); merged=bpy.context.object
    merged.name='bowl-crush-obstacles'; merged.parent=root_empty
    return merged
assign(objects)
if a.render:
    dest=Path(a.render); dest.mkdir(parents=True,exist_ok=True)
    world=bpy.data.worlds.new('bowl-review-world'); scene.world=world; world.color=(.17,.18,.19)
    scene.render.engine='BLENDER_EEVEE_NEXT'; scene.eevee.taa_render_samples=24
    scene.render.resolution_x=900; scene.render.resolution_y=620; scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'; scene.view_settings.exposure=0; scene.view_settings.gamma=1
    def aim(obj, point): obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.light_add(type='AREA',location=(1,9,-6)); key=bpy.context.object; key.data.energy=2400; key.data.shape='DISK'; key.data.size=9; aim(key,(0,1,3.5))
    bpy.ops.object.light_add(type='AREA',location=(-8,5,8)); fill=bpy.context.object; fill.data.energy=1150; fill.data.size=7; aim(fill,(0,1,3))
    bpy.ops.object.camera_add(location=(24,16,9)); cam=bpy.context.object; cam.data.lens=35; aim(cam,(0,1.2,3)); scene.camera=cam
    scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
    for name, loc, target, lens in [('overview',(24,16,9),(0,1.1,3),35),('crushed-van',(-13,7,1),(-4.7,.5,0),38),('whole-bus',(14,8,1),(0,1.3,0),38),('burning-stack',(13,9,8),(0,1.2,7),38)]:
        cam.location=loc; cam.data.lens=lens; aim(cam,target); scene.render.filepath=str(dest/(name+'.png')); bpy.ops.render.render(write_still=True)
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=False,export_apply=True)
print(f'BOWL-ART-CRUSH wrote {out} ({out.stat().st_size} bytes)')
