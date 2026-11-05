"""Build the open-roof Dead Mall shell and its first-round Blender review sheet.

Coordinates are metres, +Y up, +Z forward. The building is an open, half-buried
steel-and-concrete shell. Review renders and the candidate GLB are generated
outputs; the recipe is the source of truth.
"""
import argparse
import math
import sys
from pathlib import Path


p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--render', default='')
p.add_argument('--out', default='public/assets/models/wasteland/scablands/mall.glb')
p.add_argument('--paths-only', action='store_true')
p.add_argument('--no-build', action='store_true')
p.add_argument('--res', default='900,650')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(a.root).resolve()
out = root / a.out
evidence = Path(a.render).resolve() if a.render else root / '.evidence' / '2026-11-05' / 'WW-ART-MALL' / 'round-2'
if not evidence.is_absolute():
    evidence = root / evidence
if a.paths_only:
    import json
    print(json.dumps({'blend': [str(root / 'art-build/scablands-mall/mall.blend')], 'glb': [],
                      'json': [], 'evidence': [str(evidence)],
                      'summary': [str(root / 'docs/board/looks/ww-art-mall/round-1.jpg')]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

def mat(name, color, rough=.9, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metallic
    return m

concrete = mat('mall-concrete-salt-stained', (.30, .28, .23))
steel = mat('mall-dark-welded-steel-rust', (.20, .105, .055), .94, .35)
rust = mat('mall-rust-runoff', (.42, .16, .055), .97, .15)
glass = mat('mall-dirty-glass', (.13, .19, .18), .72, .1)
sand = mat('mall-sand-drift', (.49, .36, .20))
lampmat = mat('ash-men-lamp-hot-amber', (.95, .25, .025), .55)
lampmat.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (.9, .12, .01, 1)
lampmat.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1.5
signmat = mat('invented-shop-sign-enamel', (.13, .19, .17), .75, .2)

def box(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new('worn rolled edges', 'BEVEL'); mod.width = bevel; mod.segments = 1
        o.modifiers.new('weighted steel normals', 'WEIGHTED_NORMAL')
    return o

def beam(name, p1, p2, width, material):
    mid = (Vector(p1) + Vector(p2)) / 2
    delta = Vector(p2) - Vector(p1)
    o = box(name, mid, (width, delta.length, width), material, width * .12)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 1, 0)).rotation_difference(delta.normalized())
    return o

def cyl(name, loc, radius, depth, material, vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object; o.name = name; o.data.materials.append(material); return o

if not a.no_build:
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    root_obj = bpy.data.objects.new('scablands-mall', None); bpy.context.collection.objects.link(root_obj)
    # Half-buried mall shell: substantial walls frame a readable open atrium.
    box('mall-floor-foundation', (0, .25, 0), (30, .5, 22), concrete, .15)
    # Rear and side walls remain standing; the broken front and roof expose the atrium.
    box('half-buried-mall-rear-wall', (0, 4.1, 10.5), (29, 8.2, .8), concrete, .08)
    # A collapsed front entrance opens onto the atrium instead of sealing it off.
    for x in (-11, 11):
        box(f'half-buried-mall-front-wall-{x}', (x, 3.7, -10.5), (7, 7.4, .8), concrete, .08)
    beam('broken-entry-header',(-7,7.2,-10.5),(7,7.2,-10.5),.38,steel)
    for x in (-14.5, 14.5):
        box(f'half-buried-mall-sidewall-{x}', (x, 4, 0), (.9, 8, 21), concrete, .08)
    for x in (-13, -7, 0, 7, 13):
        for z in (-9.8, 9.8):
            box(f'mall-perimeter-pier-{x}-{z}', (x, 4.3, z), (1.3, 8.6, 1.35), steel, .1)
    # Roof steel is visibly welded into the standing shell, with a broad ragged opening.
    for x in (-13, -7, 1, 8, 13):
        beam(f'welded-roof-truss-{x}', (x, 7.8, -9), (x + .25, 7.1, 9), .28, steel)
    # Roof has fallen in; ragged edge plates remain above the walkable atrium.
    for x, z, sx, sz, angle in [(-10, -7, 7, 2, -.12), (10, 7, 6, 2.4, .18), (-5, 9, 5, 1.5, .09)]:
        o = box('collapsed-roof-slab-ragged', (x, 8.2, z), (sx, .38, sz), concrete, .05); o.rotation_euler[1] = angle
        # Torn steel edge and hanging reinforcing rods make each break read as damage.
        beam('torn-roof-steel-edge', (x-sx/2, 8, z-sz/2), (x+sx/2, 8.05, z-sz/2+.5), .13, rust)
    for x in (-14, -7, 0, 7, 14):
        beam(f'welded-fascia-girder-{x}', (x, 7.2, -10), (x + .4, 6.9, 10), .26, steel)
    # Broken shopfronts and invented, unbranded enamel signs.
    for i, (x, z, title) in enumerate([(-10, -5, 'TIN & THREAD'), (-2, -5, 'LAST LIGHT'), (7, -5, 'DRY GOODS'), (-10, 5, 'ASH MERCANTILE'), (8, 5, 'WATER / WIRE')]):
        # Distinct recessed storefront bays, with cracked lower shutters and jamb plates.
        box(f'shop-{i}-recessed-dark-interior', (x, 3.1, z + (.18 if z < 0 else -.18)), (5.7, 4.2, .16), steel)
        box(f'shop-{i}-sill', (x, 1.1, z), (6, .3, .4), steel, .04)
        for dx in (-2.7, 2.7): box(f'shop-{i}-jamb', (x+dx, 3.1, z), (.28, 4, .35), steel, .03)
        box(f'shop-{i}-dirty-window', (x, 3, z + (-.18 if z < 0 else .18)), (5, 3.4, .12), glass)
        box(f'shop-sign-{title.lower().replace(" ", "-")}', (x, 5.25, z), (5.8, .72, .22), signmat, .06)
        # Raised, original sign lettering, baked as simple legible mesh glyphs.
        bpy.ops.object.text_add(location=(x-2.35, 5.12, z-.14)); t=bpy.context.object; t.name=f'invented-sign-lettering-{i}'
        t.data.body=title; t.data.size=.35; t.data.extrude=.012; t.data.materials.append(concrete)
        t.rotation_euler[0]=math.pi/2
        for k in range(5):
            box(f'shop-{i}-bent-security-shutter-{k}', (x-2+k*.9, 1.8, z-.26 if z < 0 else z+.26), (.07, 1.2+(k%2)*.35, .09), rust, .015)
        # Salt, soot and rust run down the concrete in broken streaks, not a uniform tint.
        for k in range(3):
            sx=x-2.1+k*1.7
            box(f'shop-{i}-rust-runoff-streak-{k}', (sx, 3.4-k*.55, z-.43 if z < 0 else z+.43), (.08, 2.6-k*.4, .025), rust)
    # Stuck escalator, dark steel steps and side trusses, rising into the open atrium.
    for side in (-1, 1):
        beam('escalator-side-welded-truss', (side*1.45, .65, -3), (side*1.45, 3.2, 2.5), .17, steel)
        beam('escalator-rusted-handrail', (side*1.5, 1.45, -3), (side*1.5, 4, 2.5), .12, rust)
    for i in range(13):
        z = -2.8 + i*.39; y = .85 + i*.19
        box(f'escalator-stuck-step-{i+1:02}', (0, y, z), (2.65, .12, .34), steel, .035)
    box('escalator-drive-housing', (0, .55, -3.1), (3.25, .75, .65), rust, .08)
    # Sand drifts engulf the entrances and bury the lower shop fronts.
    for i, (x,z,sx,sy,sz) in enumerate([(-11,-8,7,1.1,3.6),(10,8,8,1.3,3.2),(0,-10,9,.8,2.2),(-13,3,4,1.2,3)]):
        o=box(f'sand-drift-{i+1}', (x, .62+sy*.18, z), (sx,sy,sz), sand, .28); o.rotation_euler[1]=(-.12 if i%2 else .1)
    # Ash Men's lamps: named steel cage, fuel bottle and amber lens assembly.
    for i, (x,z) in enumerate([(-13,-8),(13,8),(-5,1),(7,-1)]):
        cyl(f'ash-men-lamp-{i+1}-fuel-can', (x, 2.2, z), .28, 1.1, steel)
        beam(f'ash-men-lamp-{i+1}-post', (x,2.7,z), (x,4.5,z), .13, rust)
        box(f'ash-men-lamp-{i+1}-cage', (x,4.55,z), (.72,.62,.72), steel, .07)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=.22, location=(x,4.55,z))
        lamp=bpy.context.object; lamp.name=f'ash-men-lamp-{i+1}-amber-lens'; lamp.data.materials.append(lampmat)
    # A standing, five-foot silhouette at the entry gives the broken facade scale.
    px,pz=-18,-10
    cyl('entry-scale-person-body',(px,1.0,pz),.22,1.05,steel,8)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=.18,location=(px,1.62,pz))
    bpy.context.object.name='entry-scale-person-head'; bpy.context.object.data.materials.append(rust)
    for side in (-1,1):
        beam('entry-scale-person-leg',(px+side*.1,.65,pz),(px+side*.16,.05,pz+.12),.12,steel)
    # Empty named line marks the heist route and is intentionally non-rendering.
    curve=bpy.data.curves.new('heist-path-empty-named-line-data','CURVE'); curve.dimensions='3D'; curve.bevel_depth=0
    spline=curve.splines.new('POLY'); spline.points.add(5)
    for point, co in zip(spline.points, [(-12,0,-9),(-8,0,-7),(-4,0,-4),(0,0,-1),(4,0,3),(11,0,8)]): point.co=(*co,1)
    path=bpy.data.objects.new('heist-path-empty-named-line',curve); bpy.context.collection.objects.link(path)
    for obj in list(bpy.context.scene.objects):
        if obj != root_obj: obj.parent=root_obj
    # Review cameras and lights are excluded from export by selecting only mall children.
    (root/'art-build/scablands-mall').mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'art-build/scablands-mall/mall.blend'))
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in root_obj.children: obj.select_set(True)
    root_obj.select_set(True); bpy.context.view_layer.objects.active=root_obj
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='EXPORT', export_cameras=False)

evidence.mkdir(parents=True, exist_ok=True)
width, height = (int(v) for v in a.res.split(','))
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=width; scene.render.resolution_y=height
scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.world.color=(.055,.05,.043); scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'
def aim(o, target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Z').to_euler()
def camera(name, loc, target, lens=42):
    data=bpy.data.cameras.new(name); obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj)
    obj.location=loc; data.lens=lens; aim(obj,target); scene.camera=obj; return obj
ld=bpy.data.lights.new('late dusty skylight','AREA'); lo=bpy.data.objects.new(ld.name,ld); scene.collection.objects.link(lo); lo.location=(1,18,-3); ld.energy=2200; ld.shape='DISK'; ld.size=16; aim(lo,(0,0,0))
views=[('entrance-car-height',(-1.5,1.55,-42),(0,1.5,0),48),
       ('atrium-on-foot',(1.8,1.65,-8),(0,2.2,1),40),
       ('three-quarter',(-31,15,-34),(0,3.8,0),48),
       ('close-shopfront',(0,3.2,-21),(0,3.0,-5),58)]
for name,loc,target,lens in views:
    camera(name,loc,target,lens); scene.render.filepath=str(evidence/f'{name}.png'); bpy.ops.render.render(write_still=True)
# Replace round 1's sheet with one labeled comparison of both rounds.
sheet_path=root/'docs/board/looks/ww-art-mall/round-2.jpg'; sheet_path.parent.mkdir(parents=True,exist_ok=True)
old_path=root/'docs/board/looks/ww-art-mall/round-1.jpg'
canvas=bpy.data.images.new('mall round comparison sheet',width=1200,height=1000,alpha=False)
import numpy as np
arr=np.zeros((1000,1200,4),dtype=np.float32); arr[:,:,:3]=(.035,.035,.032); arr[:,:,3]=1
old=bpy.data.images.load(str(old_path),check_existing=False); oldpix=np.empty(old.size[0]*old.size[1]*4,dtype=np.float32); old.pixels.foreach_get(oldpix)
olddata=oldpix.reshape(old.size[1],old.size[0],4)[::-1]; oh,ow=olddata.shape[:2]
scale=min(1160/ow,300/oh); nw,nh=int(ow*scale),int(oh*scale)
oldtile=olddata[(np.arange(nh)/scale).astype(int)[:,None],(np.arange(nw)/scale).astype(int)[None,:],:]
arr[48:48+nh,20:20+nw,:]=oldtile; bpy.data.images.remove(old)
for i,(name,_,_,_) in enumerate(views):
    im=bpy.data.images.load(str(evidence/f'{name}.png'),check_existing=False); pix=np.empty(width*height*4,dtype=np.float32); im.pixels.foreach_get(pix)
    data=pix.reshape(height,width,4)[::-1]
    # Scale views uniformly and retain the ground line for scale.
    th,tw=300,570; ys=(np.arange(th)*height/th).astype(int); xs=(np.arange(tw)*width/tw).astype(int)
    tile=data[ys[:,None],xs[None,:],:]
    x=20+(i%2)*590; y=390+(i//2)*305
    arr[y:y+th,x:x+tw,:]=tile
    bpy.data.images.remove(im)
canvas.pixels.foreach_set(arr[::-1].ravel()); canvas.filepath_raw=str(sheet_path); canvas.file_format='JPEG'; canvas.save(quality=80)
if sheet_path.stat().st_size>500_000: raise RuntimeError(f'comparison sheet exceeds 500 KB: {sheet_path.stat().st_size}')
old_path.unlink()
print(f'WW-ART-MALL round 2: {out.stat().st_size} bytes; sheet {sheet_path.stat().st_size} bytes')
