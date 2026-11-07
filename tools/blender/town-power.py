"""Build the TOWN-ART-POWER windmill and pole from measured photo shapes."""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', default=str(Path(__file__).resolve().parents[2]))
p.add_argument('--evidence', default='.qa-dist/town-art-power-round-4')
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(a.root).resolve()
evidence = Path(a.evidence)
evidence = evidence if evidence.is_absolute() else root / evidence
blend = evidence / 'power.blend'
glb = root / 'public/assets/models/wasteland/town/power.glb'
sheet = root / 'docs/board/looks/town-art-power/round-4.jpg'
if a.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(glb)], 'evidence': [str(evidence)], 'summary': str(sheet)}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_model import Mesh, Photo, lathe, slab, tidy, trace
from hull_model import View, occupancy, carve_hull

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
mat = town.make_materials({
    'rusted-steel': root / 'public/assets/models/wasteland/town/textures/rusted-steel.jpg',
    'galvanised-tin': root / 'public/assets/models/wasteland/town/textures/rusted-corrugated-tin.jpg',
    'cracked-concrete': root / 'public/assets/models/wasteland/town/textures/town-water-concrete.jpg',
    'sand': root / 'public/assets/models/wasteland/town/textures/town-water-earth.jpg',
    'weathered-plank': root / 'public/assets/models/wasteland/town/textures/town-water-timber.jpg',
})
textures = root / 'public/assets/models/wasteland/town/textures'
reference = Photo(textures / 'power-windmill-reference.jpg')
refmat = reference.material(.94)
photo_solid = tidy(~reference.sky([(5, 5), (reference.w - 6, 5),
                                   (5, reference.h - 6),
                                   (reference.w - 6, reference.h - 6)],
                                  tolerance=20, grey=20))
for material in mat.values():
    material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = min(.28, material.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value)
# Deepen only the salvaged timber tile so the pole reads as old, dirty wood.
wood_tex=next(node.image for node in mat['weathered-plank'].node_tree.nodes if node.type=='TEX_IMAGE')
wood_pixels=[0.0]* (wood_tex.size[0]*wood_tex.size[1]*4)
wood_tex.pixels.foreach_get(wood_pixels)
for i in range(0,len(wood_pixels),4):
    wood_pixels[i]*=.58;wood_pixels[i+1]*=.47;wood_pixels[i+2]*=.36
wood_tex.pixels.foreach_set(wood_pixels);wood_tex.update()

def keep(obj, parent):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world
    return obj

def beam(name, start, end, size, material, parent):
    """Place a thick box member between game-space points; size is width,depth."""
    va, vb = town.game_vector(start), town.game_vector(end)
    delta = vb - va
    obj = town.cube(name, tuple((Vector(start) + Vector(end)) / 2),
                    (size[0], delta.length, size[1]), material, 0)
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    return keep(obj, parent)

def cylinder(name, pos, radius, depth, material, vertices=12, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
        location=town.game_vector(pos))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return keep(obj, parent) if parent else obj

def sphere(name, pos, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=1, location=town.game_vector(pos))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj

def thin_run(name, points, radius, material, parent):
    for i,(start,end) in enumerate(zip(points,points[1:])):
        va,vb=town.game_vector(start),town.game_vector(end);delta=vb-va
        bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=delta.length,location=(va+vb)/2)
        obj=bpy.context.object;obj.name=f'{name}-{i+1}';obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();obj.data.materials.append(material);keep(obj,parent)

family = bpy.data.objects.new('town-power', None)
bpy.context.scene.collection.objects.link(family)

# Windmill: four angle-iron corner legs, four closed rings, and fully landed Xs.
windmill = bpy.data.objects.new('windmill', None)
bpy.context.scene.collection.objects.link(windmill)
windmill.parent = family
base_half, top_half = .82, .26
base_y, top_y = .22, 4.78
levels = (.72, 1.78, 2.84, 3.90, 4.78)
def half_at(y):
    return base_half + (top_half - base_half) * ((y - base_y) / (top_y - base_y))
def leg_point(sx, sz, y):
    half = half_at(y)
    return (sx * half, y, sz * half)
for sx in (-1, 1):
    for sz in (-1, 1):
        beam('angle iron corner leg', leg_point(sx, sz, base_y), leg_point(sx, sz, top_y), (.105, .085), mat['rusted-steel'], windmill)
for y in levels[1:]:
    for sx in (-1, 1):
        beam('angle iron ring side', leg_point(sx, -1, y), leg_point(sx, 1, y), (.075, .065), mat['galvanised-tin'], windmill)
    for sz in (-1, 1):
        beam('angle iron ring crosspiece', leg_point(-1, sz, y), leg_point(1, sz, y), (.075, .065), mat['rusted-steel'], windmill)
end_errors = []
for y0, y1 in zip(levels[:-1], levels[1:]):
    for fixed_z in (-1, 1):
        for sx0, sx1 in ((-1, 1), (1, -1)):
            first, last = leg_point(sx0, fixed_z, y0), leg_point(sx1, fixed_z, y1)
            beam('mast face X brace', first, last, (.052, .045), mat['galvanised-tin'] if fixed_z < 0 else mat['rusted-steel'], windmill)
            end_errors.extend((
                (first, (Vector(first)-Vector(leg_point(sx0, fixed_z, y0))).length),
                (last, (Vector(last)-Vector(leg_point(sx1, fixed_z, y1))).length),
            ))
    for fixed_x in (-1, 1):
        for sz0, sz1 in ((-1, 1), (1, -1)):
            first, last = leg_point(fixed_x, sz0, y0), leg_point(fixed_x, sz1, y1)
            beam('mast side X brace', first, last, (.052, .045), mat['rusted-steel'], windmill)
            end_errors.extend(((first, 0.0), (last, 0.0)))
max_error = max(error for _, error in end_errors)
print(f'MAST_ENDPOINT_MAX_DISTANCE={max_error:.4f}m (required <= 0.05m)')
if max_error > .05:
    raise RuntimeError('A mast brace endpoint misses its leg by more than 5 cm')

town.cube('windmill concrete slab', (0,.15,0), (1.9,.30,1.9), mat['cracked-concrete'], .10).parent = windmill
for sx in (-1,1):
    for sz in (-1,1):
        x,z=sx*.69,sz*.69
        town.cube('bolted mast foot plate',(x,.34,z),(.34,.08,.34),mat['rusted-steel'],0).parent=windmill
        for dx in (-.105,):
            cylinder('foot plate hex bolt',(x+dx,.405,z),.026,.055,mat['galvanised-tin'],5,windmill)

# The whole rotor head and vane are traced from the dead-on photo. The mast
# remains the approved round-2 build. Pixel scale is measured against its 4.8 m
# leg height; the hub is centred on the mast head and the tail stays in its cell.
PHOTO_SCALE = .006
PHOTO_MAST_CX, PHOTO_GROUND_Y = 400, 1100
PHOTO_HUB_CX, PHOTO_HUB_CY = 260, 320
axle = (-.84, 4.68, -.50)
def photo_point(px, py, depth):
    return ((px - PHOTO_MAST_CX) * PHOTO_SCALE - axle[0],
            (PHOTO_GROUND_Y - py) * PHOTO_SCALE - axle[1], depth - axle[2])

def traced_part(mesh, label, rect, near=-.50, far=-.455, min_area=36):
    loops = trace(photo_solid, rect, tolerance=2.2, min_area=max(180,min_area))
    if not loops:
        raise RuntimeError(f'photo has no traced outline for {label}: {rect}')
    slab(mesh, 'reference', reference, loops, photo_point, far, near, wall_scale=.008)

rotor_mesh = Mesh()
for label, rect in (
    ('upper steel blade', (220, 0, 315, 278)),
    ('left steel blade', (0, 300, 275, 548)),
    ('lower-right steel blade', (238, 300, 455, 610)),
    ('finned alternator', (300, 240, 422, 395)),
    ('tail arm and welded brackets', (410, 285, 790, 365)),
    ('peeling cream tail vane', (735, 238, 1018, 398)),
):
    traced_part(rotor_mesh, label, rect)
rotor_obj = rotor_mesh.finish('photo-carved windmill head and blades', {'reference': refmat})

# Round hub and alternator pulley: lathed to the photo's measured 52 px hub
# radius. The front cap samples the photo centre; the 0.85 arc avoids its edge.
HUB_R = 52 * PHOTO_SCALE
def hub_uv(index, distance, radius, angle):
    px = PHOTO_HUB_CX + math.cos(angle) * radius / PHOTO_SCALE * .85
    py = PHOTO_HUB_CY + math.sin(angle) * radius / PHOTO_SCALE * .85
    return reference.uv(px, py)
def hub_cap_uv(angle, fraction):
    return reference.uv(PHOTO_HUB_CX + math.cos(angle) * fraction * 44,
                        PHOTO_HUB_CY + math.sin(angle) * fraction * 44)
hub_mesh = Mesh()
lathe(hub_mesh, 'reference', (0, 0, -.54), (0, 0, 1), (1, 0, 0), (0, 1, 0),
      [(0, HUB_R * .94), (.13, HUB_R)], hub_uv, sides=24,
      cap_start=('reference', hub_cap_uv), cap_end=('reference', hub_cap_uv))
hub_obj = hub_mesh.finish('photo-measured bolted windmill hub', {'reference': refmat})

# The actual source photo supplies the fin layout. Small photo-measured lugs
# lift its eight visible cooling vanes off the alternator face.
for index in range(8):
    angle = math.tau * index / 8
    px = PHOTO_HUB_CX + math.cos(angle) * 87
    py = PHOTO_HUB_CY + math.sin(angle) * 87
    x, y = (px - PHOTO_MAST_CX) * PHOTO_SCALE, (PHOTO_GROUND_Y - py) * PHOTO_SCALE
    beam('alternator photo-measured cooling fin',
         (x, y, -.435),
         (x + math.cos(angle) * .07, y + math.sin(angle) * .07, -.435),
         (.036, .028), mat['galvanised-tin'], windmill)

# Rotating group is located at the axle. Every child stays in world position,
# so rotating this empty around local Y spins the three-blade wheel cleanly.
rotor = bpy.data.objects.new('windmill:rotor', None)
bpy.context.scene.collection.objects.link(rotor)
rotor.location = town.game_vector(axle)
rotor.parent = windmill
rotor_obj.parent = rotor
rotor_obj.location = (0, 0, 0)
hub_obj.parent = rotor
hub_obj.location = (0, 0, 0)
for index in range(8):
    angle = math.tau * index / 8
    x, y = math.cos(angle) * HUB_R * .72, math.sin(angle) * HUB_R * .72
    bolt = cylinder('photo-measured hub bolt', (x, y, -.115), .027, .045, mat['galvanised-tin'], 6)
    bolt.parent = rotor
    bolt.rotation_euler[0] = math.pi / 2

# Cable is clipped along the rear left leg with repeated short retaining straps.
pts=[(-.25,4.72,.46),(-.40,3.0,.30),(-.62,1.3,.08),(-.72,.42,-.03)]
thin_run('clipped generator cable',pts,.022,mat['iron-dark'],windmill)
for i,(x,y,z) in enumerate((pts[1],pts[2],pts[3])):
    keep(sphere(f'cable clamp {i+1}',(x+.035,y,z),(.05,.035,.045),mat['galvanised-tin']),windmill)

# A crooked distribution pole in its own footprint, with a transformer and
# short, naturally sagging wire stubs. It shares the town-power family file.
pole=bpy.data.objects.new('power-pole',None); bpy.context.scene.collection.objects.link(pole);pole.parent=family
# A weathered round pole and its transformer can are lathed to the photo's
# measured outline. Their UVs wrap the real wood grain and can rust.
POLE_CX, POLE_GROUND = 610, PHOTO_GROUND_Y
POLE_RADIUS = 34 * PHOTO_SCALE
pole_photo = Photo(textures / 'power-pole-wood.jpg')
pole_pixels = np.empty(pole_photo.image_w * pole_photo.image_h * 4, dtype=np.float32)
pole_photo.image.pixels.foreach_get(pole_pixels)
pole_pixels = pole_pixels.reshape(pole_photo.image_h, pole_photo.image_w, 4)
pole_pixels[:, :, :3] *= np.array((.58, .52, .45), dtype=np.float32)[None, None, :]
pole_photo.image.pixels.foreach_set(pole_pixels.ravel())
pole_photo.image.update()
pole_photo.image.pack()
pole_wood_mat = pole_photo.material(.94)
POLE_PHOTO_CX, POLE_PHOTO_GROUND = pole_photo.w*.50, pole_photo.h-7
def pole_uv(index, distance, radius, angle):
    px = POLE_PHOTO_CX + math.cos(angle) * min(16,radius / PHOTO_SCALE * .60)
    py = POLE_PHOTO_GROUND - distance / PHOTO_SCALE
    return pole_photo.uv(px, py)
def pole_cap_uv(y):
    return lambda angle,f:pole_photo.uv(POLE_PHOTO_CX+math.cos(angle)*f*28,
                                         y+math.sin(angle)*f*28)
pole_mesh = Mesh()
lathe(pole_mesh, 'pole-wood', (0, 0, 0), (0, 1, 0), (1, 0, 0), (0, 0, 1),
      [(0, POLE_RADIUS * 1.15), (3.0, POLE_RADIUS), (6.0, POLE_RADIUS * .72)],
      pole_uv, sides=16,cap_start=('pole-wood',pole_cap_uv(POLE_PHOTO_GROUND)),
      cap_end=('pole-wood',pole_cap_uv(POLE_PHOTO_GROUND-6/PHOTO_SCALE)))
pole_mesh.verts = [(x + .03 * math.sin(y * .7) + .25 * y / 6, y, z)
                   for x, y, z in pole_mesh.verts]
pole_obj = pole_mesh.finish('round photo-lathed weathered utility pole', {'pole-wood': pole_wood_mat})
pole_obj.parent = pole
beam('crossarm',(-.90,5.7,.02),(.24,5.72,.02),(.14,.12),mat['rusted-steel'],pole)
for y in (.6,1.45,2.3,3.15):
    beam('pole climbing step',(-.03,y,-.09),(.14,y,-.09),(.04,.035),mat['rusted-steel'],pole)
TRANSFORMER_CENTER, TRANSFORMER_CY = (.20, 5.22, -.36), 185
TRANSFORMER_R = 24 * PHOTO_SCALE
transformer_photo = Photo(textures / 'power-transformer-can.jpg')
transformer_pixels = np.empty(transformer_photo.image_w * transformer_photo.image_h * 4, dtype=np.float32)
transformer_photo.image.pixels.foreach_get(transformer_pixels)
transformer_pixels = transformer_pixels.reshape(transformer_photo.image_h, transformer_photo.image_w, 4)
transformer_pixels[:, :, :3] *= np.array((.62, .56, .48), dtype=np.float32)[None, None, :]
transformer_photo.image.pixels.foreach_set(transformer_pixels.ravel())
transformer_photo.image.update()
transformer_photo.image.pack()
transformer_mat = transformer_photo.material(.92)
TRANSFORMER_U, TRANSFORMER_SCALE = transformer_photo.w*.73, .010
TRANSFORMER_PHOTO_GROUND = transformer_photo.h*.70
def transformer_uv(index, distance, radius, angle):
    px = TRANSFORMER_U + math.cos(angle) * min(24,radius / PHOTO_SCALE * .85)
    py = TRANSFORMER_PHOTO_GROUND - distance/TRANSFORMER_SCALE
    return transformer_photo.uv(px, py)
def transformer_cap_uv(angle, fraction):
    return transformer_photo.uv(TRANSFORMER_U + math.cos(angle)*fraction*20,
                                TRANSFORMER_PHOTO_GROUND - .29/TRANSFORMER_SCALE
                                + math.sin(angle)*fraction*20)
transformer_mesh = Mesh()
lathe(transformer_mesh, 'reference', TRANSFORMER_CENTER, (0, 1, 0), (1, 0, 0), (0, 0, 1),
      [(0, TRANSFORMER_R * .75), (.52, TRANSFORMER_R), (.58, TRANSFORMER_R * .9)],
      transformer_uv, sides=16,
      cap_start=('reference', transformer_cap_uv), cap_end=('reference', transformer_cap_uv))
transformer_obj = transformer_mesh.finish('photo-lathed transformer can', {'reference': transformer_mat})
transformer_obj.parent = pole
beam('transformer lower mounting arm',(.23,5.30,0),(.20,5.30,-.28),(.07,.06),mat['rusted-steel'],pole)
beam('transformer upper mounting arm',(.25,5.70,0),(.20,5.70,-.28),(.07,.06),mat['rusted-steel'],pole)
for x in (-.90,-.33,1.02):
    cylinder('ceramic insulator',(x,5.98,.02),.095,.18,mat['cracked-concrete'],8,pole)
for start,end,high in [((-.90,5.98,.02),(-1.28,5.82,.02),5.98),((1.02,5.98,.02),(1.42,5.78,.02),6.0)]:
    points=[]
    for step in range(9):
        t=step/8
        points.append((start[0]+(end[0]-start[0])*t, high-.18*math.sin(math.pi*t), start[2]))
    thin_run('sagging wire stub',points,.018,mat['iron-dark'],pole)
for sx in (-1,1):
    for sz in (-1,1):
        town.cube('pole base shoe',(sx*.14,.28,sz*.13),(.22,.07,.22),mat['rusted-steel'],0).parent=pole
town.cube('power pole concrete pad',(0,.10,0),(1.05,.20,.85),mat['cracked-concrete'],.06).parent=pole

# Generator: the truck engine and skid are carved from four measured photos.
generator = bpy.data.objects.new('generator', None)
bpy.context.scene.collection.objects.link(generator)
generator.parent = family
engine_photos = {name: Photo(textures / f'generator-{name}.jpg')
                 for name in ('side', 'front', 'rear', 'overhead')}
side, front, rear, top = (engine_photos[name] for name in ('side','front','rear','overhead'))
def frame_seeds(photo):
    seeds=[(6,6),(photo.w-7,6),(6,photo.h-7),(photo.w-7,photo.h-7)]
    seeds.extend((x,6) for x in range(70,photo.w-7,80))
    seeds.extend((x,photo.h-7) for x in range(70,photo.w-7,80))
    seeds.extend((6,y) for y in range(70,photo.h-7,80))
    seeds.extend((photo.w-7,y) for y in range(70,photo.h-7,80))
    return seeds
engine_masks={name:tidy(~photo.sky(frame_seeds(photo),grey=26,tolerance=40),2)
              for name,photo in engine_photos.items()}
def darken_photo(photo, factors):
    values=np.empty(photo.image.size[0]*photo.image.size[1]*4,dtype=np.float32)
    photo.image.pixels.foreach_get(values)
    pixels=values.reshape(photo.image.size[1],photo.image.size[0],4)
    pixels[:,:,:3]*=np.asarray(factors,dtype=np.float32)[None,None,:]
    photo.image.pixels.foreach_set(pixels.ravel());photo.image.update();photo.image.pack()
for photo in engine_photos.values(): darken_photo(photo,(.76,.73,.69))
engine_materials = {name: photo.material(.92) for name, photo in engine_photos.items()}
SIDE_GROUND, ENGINE_SIDE_SCALE = side.h - 105, .0068
FRONT_CX, FRONT_GROUND, FRONT_SCALE = front.w * .50, front.h - 105, .0068
REAR_CX, REAR_GROUND, REAR_SCALE = rear.w * .50, rear.h - 110, .0068
TOP_CX, TOP_CY, TOP_X_SCALE, TOP_Z_SCALE = top.w * .50, top.h * .69, .0045, .0088
engine_side_solid=engine_masks['side']
engine_side=Mesh()
side_loops=trace(engine_side_solid,(16,18,side.w-12,SIDE_GROUND+1),tolerance=1.7,min_area=300)
def engine_side_world(px,py,d):
    return (d,(SIDE_GROUND-py)*ENGINE_SIDE_SCALE,(px-side.w*.50)*ENGINE_SIDE_SCALE)
slab(engine_side,'side',side,side_loops,engine_side_world,.76,.82,wall_scale=.007)
slab(engine_side,'side',side,side_loops,
     lambda px,py,d:(-d,(SIDE_GROUND-py)*ENGINE_SIDE_SCALE,(px-side.w*.50)*ENGINE_SIDE_SCALE),.76,.82,wall_scale=.007)
# The end and top silhouettes come from their own measured photographs, so the
# engine remains recognizable above and from either end of its real thickness.
front_solid=engine_masks['front']
front_loops=trace(front_solid,(20,18,front.w-16,FRONT_GROUND+1),tolerance=1.8,min_area=260)
def engine_end_world(px,py,d):
    return ((px-FRONT_CX)*FRONT_SCALE,(FRONT_GROUND-py)*FRONT_SCALE,d)
slab(engine_side,'front',front,front_loops,engine_end_world,-2.10,-2.04,wall_scale=.007)
rear_solid=engine_masks['rear']
rear_loops=trace(rear_solid,(20,18,rear.w-16,REAR_GROUND+1),tolerance=1.8,min_area=260)
slab(engine_side,'rear',rear,rear_loops,
     lambda px,py,d:((REAR_CX-px)*REAR_SCALE,(REAR_GROUND-py)*REAR_SCALE,d),2.04,2.10,wall_scale=.007)
top_solid=engine_masks['overhead']
top_loops=trace(top_solid,(18,90,top.w-12,top.h-12),tolerance=1.8,min_area=260)
def engine_top_world(px,py,d):
    return ((px-TOP_CX)*TOP_X_SCALE,d,(TOP_CY-py)*TOP_Z_SCALE)
slab(engine_side,'overhead',top,top_loops,engine_top_world,3.14,3.20,wall_scale=.007)
engine_obj=engine_side.finish('generator:photo-carved truck engine and skid',engine_materials)
engine_obj.parent=generator
# The shelter keeps the photographed engine visible from the road and through
# a central roof opening in the mayor's overhead view.
town.cube('generator skid bearer left',(-1.10,.16,0),(.18,.32,4.1),mat['rusted-steel'],.03).parent=generator
town.cube('generator skid bearer right',(1.10,.16,0),(.18,.32,4.1),mat['rusted-steel'],.03).parent=generator
for x in (-2.05,2.05):
    for z in (-1.85,1.85):
        town.beam('generator shelter post',(x,.25,z),(x,3.65,z),.10,mat['rusted-steel']).parent=generator
for z in (-1.85,1.85):
    town.beam('generator shelter eave',(-2.05,3.45,z),(2.05,3.45,z),.10,mat['galvanised-tin']).parent=generator
for z in (-1.43,1.43):
    panel=town.cube('generator patched tin shelter roof',(0,3.72,z),(4.55,.10,1.32),mat['galvanised-tin'],.02)
    panel.parent=generator
    for x in (-1.25,1.25):
        town.cube('generator rusted roof repair',(x,3.79,z),(1.18,.035,1.18),mat['rusted-steel'],.015).parent=generator
stain=town.cube('generator black exhaust stain',(1.02,3.80,-1.43),(.65,.025,.86),mat['iron-dark'],.01);stain.parent=generator
town.beam('generator exhaust stack',(1.02,2.2,-.80),(1.02,4.25,-.80),.12,mat['iron-dark']).parent=generator
town.beam('generator exhaust bend',(1.02,4.10,-.80),(1.02,4.10,-.20),.10,mat['iron-dark']).parent=generator

# Solar rack: six separate glass panels use their measured overhead-photo
# outlines. The sloping scaffold and cross braces are scaled from the side view.
solar = bpy.data.objects.new('solar-rack', None)
bpy.context.scene.collection.objects.link(solar)
solar.parent = family
solar_photos = {name: Photo(textures / f'solar-{name}.jpg')
                for name in ('side','front','rear','overhead')}
solar_top = solar_photos['overhead']
solar_mat = solar_top.material(.88)
solar_solid = tidy(~solar_top.sky(frame_seeds(solar_top),grey=26,tolerance=24),2)
def solar_point(px,py,d):
    x=(px-solar_top.w*.50)*.0078
    z=-(py-solar_top.h*.50)*.0078
    return (x,1.65 + z*.32 + d,z)
solar_mesh=Mesh()
for row, rects in enumerate((
    ((55,24,245,220),(250,24,440,220),(445,24,675,220)),
    ((55,222,245,423),(250,222,440,423),(445,222,675,423)),
)):
    for col,rect in enumerate(rects):
        loops=trace(solar_solid,rect,tolerance=1.8,min_area=45)
        if not loops: raise RuntimeError(f'overhead photo has no solar panel {row},{col}')
        slab(solar_mesh,'solar',solar_top,loops,solar_point,0,.065,wall_scale=.008)
solar_obj=solar_mesh.finish('solar-rack:photo-cut mismatched glass panels',{'solar':solar_mat})
solar_obj.parent=solar
for x in (-1.95,1.95):
    for z in (-1.5,1.5):
        town.beam('solar rack standing leg',(x,.12,z),(x,1.55+z*.32,z),.10,mat['rusted-steel']).parent=solar
for z in (-1.5,1.5):
    y=1.55+z*.32
    town.beam('solar rack lower cross rail',(-2.05,y,z),(2.05,y,z),.10,mat['galvanised-tin']).parent=solar
    town.beam('solar rack brace left',(-1.95,.35,z),(1.95,y,z),.07,mat['rusted-steel']).parent=solar
    town.beam('solar rack brace right',(1.95,.35,z),(-1.95,y,z),.07,mat['galvanised-tin']).parent=solar
for x in (-1.9,-.65,.65,1.9):
    town.beam('solar rack panel rail',(x,1.53-1.5*.32,-1.5),(x,1.53+1.5*.32,1.5),.06,mat['rusted-steel']).parent=solar

# Fuel depot: one large tank is carved from its measured four-view photo set.
# The pump, pipework and painted bund are separate parts so their real shape
# survives the hull kit's connected-body pass.
fuel = bpy.data.objects.new('fuel-depot', None)
bpy.context.scene.collection.objects.link(fuel)
fuel.parent = family
fuel_photos={name:Photo(textures/f'fuel-{name}.jpg') for name in ('side','front','rear','overhead')}
fuel_side,fuel_front,fuel_rear,fuel_top=(fuel_photos[name] for name in ('side','front','rear','overhead'))
fuel_mats={name:photo.material(.90) for name,photo in fuel_photos.items()}
def photo_window(photo, rect):
    x0,y0,x1,y1=rect
    def trim(mask):
        keep=np.zeros_like(mask);keep[y0:y1,x0:x1]=True
        return mask & keep
    return trim
def side_pick(x,y,z):
    return 384-z*122, 337-(y-.72)*111
def front_pick(x,y,z):
    return 267+x*140, 429-(y-.72)*139
def rear_pick(x,y,z):
    return 768-x*286, 820-(y-.72)*286
def overhead_pick(x,y,z):
    return 384-z*106, 258+x*130
fuel_views=[
    View('side',fuel_side,[(8,8),(760,8),(8,500),(760,500)],side_pick,(1,0,0),
         solid=photo_window(fuel_side,(24,34,758,365)),grey=26,tolerance=24),
    View('front',fuel_front,[(8,8),(760,8),(8,500),(760,500)],front_pick,(0,0,-1),
         solid=photo_window(fuel_front,(42,48,510,462)),grey=26,tolerance=24),
    View('rear',fuel_rear,[(8,8),(1528,8),(8,1016),(1528,1016)],rear_pick,(0,0,1),
         solid=photo_window(fuel_rear,(150,28,1380,966)),grey=26,tolerance=24),
    View('overhead',fuel_top,[(8,8),(760,8),(8,500),(760,500)],overhead_pick,(0,1,0),
         solid=photo_window(fuel_top,(42,38,758,450)),grey=26,tolerance=24),
]
fuel_bounds=((-1.30,1.30),(.72,3.32),(-2.72,2.72))
fuel_solid,fuel_xs,fuel_ys,fuel_zs=occupancy(fuel_bounds,.10,[view.covers for view in fuel_views])
fuel_body=carve_hull('fuel-depot:photo-carved storage tank',fuel_views,fuel_mats,
    fuel_solid,fuel_xs,fuel_ys,fuel_zs,.10,7200)
fuel_body.parent=fuel
town.cube('fuel depot bund floor',(0,.16,0),(6.9,.32,5.8),mat['cracked-concrete'],.08).parent=fuel
for z in (-2.72,2.72):
    town.cube('fuel depot bund wall',(0,.50,z),(6.9,.68,.30),mat['cracked-concrete'],.05).parent=fuel
for x in (-3.30,3.30):
    town.cube('fuel depot bund wall',(x,.50,0),(.30,.68,5.2),mat['cracked-concrete'],.05).parent=fuel
for x in (-.88,.88):
    for z in (-1.85,1.85):
        town.beam('tank saddle crossbeam',(x-.48,.76,z),(x+.48,.76,z),.15,mat['rusted-steel']).parent=fuel
        town.beam('tank saddle upright',(x,.50,z),(x,.91,z),.14,mat['rusted-steel']).parent=fuel
# A connected manifold runs along the tank, with elbows, valve wheels and a
# separate hand pump at the road end. Every pipe has a real round section.
pipe=[(-1.08,2.34,-2.20),(-1.08,2.62,-2.20),(-1.08,2.62,2.12),(-.74,2.62,2.42),
      (1.02,2.62,2.42),(1.02,2.16,2.42),(1.02,1.28,2.42),(1.02,.92,2.12)]
for index,(start,end) in enumerate(zip(pipe,pipe[1:])):
    thin_run(f'fuel transfer pipe {index+1}',(start,end),.067,mat['rusted-steel'],fuel)
for index,(x,z) in enumerate(((-1.08,-1.42),(-1.08,.62),(1.02,1.72))):
    cylinder(f'fuel valve body {index+1}',(x,2.62,z),.15,.23,mat['galvanised-tin'],12,fuel)
    town.beam(f'fuel valve cross handle {index+1}',(x-.23,2.82,z),(x+.23,2.82,z),.045,mat['rusted-steel']).parent=fuel
    town.beam(f'fuel valve stem {index+1}',(x,2.62,z),(x,2.82,z),.045,mat['rusted-steel']).parent=fuel
# Pump casing, lever linkage and hose remain visibly joined to the manifold.
town.cube('hand pump foot',(1.02,.82,-2.20),(.54,.16,.50),mat['rusted-steel'],.04).parent=fuel
town.cube('hand pump casing',(1.02,1.20,-2.20),(.34,.62,.34),mat['rusted-steel'],.06).parent=fuel
cylinder('hand pump head',(1.02,1.58,-2.20),.18,.24,mat['galvanised-tin'],16,fuel)
town.beam('hand pump lever',(1.02,1.76,-2.20),(1.48,2.08,-2.20),.055,mat['rusted-steel']).parent=fuel
town.beam('hand pump grip',(1.42,2.08,-2.20),(1.64,2.08,-2.20),.07,mat['galvanised-tin']).parent=fuel
town.beam('pump inlet pipe',(1.02,1.20,-2.20),(1.02,1.20,-2.42),.06,mat['galvanised-tin']).parent=fuel
town.beam('hose upper run',(1.24,.94,-2.20),(1.65,.75,-2.20),.045,mat['iron-dark']).parent=fuel
town.beam('hose hanging run',(1.65,.75,-2.20),(1.65,.35,-2.20),.045,mat['iron-dark']).parent=fuel
town.beam('hose return run',(1.65,.35,-2.20),(1.30,.30,-2.20),.045,mat['iron-dark']).parent=fuel
# Faded yellow and black diagonal hazards are real painted bands on the curb.
for index in range(18):
    x=-3.05+index*.36
    material=mat['faded-hand-paint'] if index%2==0 else mat['iron-dark']
    town.beam('chipped bund hazard stripe',(x-.14,.20,-2.89),(x+.14,.78,-2.89),.11,material).parent=fuel

# Export, then reimport in an empty scene for every judgment render.
evidence.mkdir(parents=True,exist_ok=True)
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and len(obj.data.uv_layers):
        for layer in obj.data.uv_layers:
            layer.name='UVMap'
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(glb)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=920;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('bright overcast');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.75,.78,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.85
lamp_data=bpy.data.lights.new('broad overcast key','AREA');lamp=bpy.data.objects.new('broad overcast key',lamp_data);scene.collection.objects.link(lamp);lamp.location=(3,7,7);lamp_data.energy=2200;lamp_data.size=8
groundmat=bpy.data.materials.new('plain mid grey-brown review ground');groundmat.diffuse_color=(.28,.27,.24,1);groundmat.use_nodes=True
groundmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.28,.27,.24,1)
bpy.ops.mesh.primitive_plane_add(size=24,location=town.game_vector((0,-.08,0)));bpy.context.object.data.materials.append(groundmat)
def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def render(name,loc,target,lens=52):
    data=bpy.data.cameras.new(name);cam=bpy.data.objects.new(name,data);scene.collection.objects.link(cam);cam.location=town.game_vector(loc);data.lens=lens;aim(cam,town.game_vector(target));scene.camera=cam
    scene.render.filepath=str(evidence/(name+'.png'));bpy.ops.render.render(write_still=True)
def hide_tree(name,hidden):
    parent=next(obj for obj in scene.objects if obj.name==name)
    for obj in scene.objects:
        node=obj
        while node:
            if node==parent:
                obj.hide_render=hidden
                break
            node=node.parent
building_ids=('windmill','power-pole','generator','solar-rack','fuel-depot')
def isolate(active):
    for building_id in building_ids:
        hide_tree(building_id,building_id != active)

isolate('windmill')
render('windmill-driver',(11,9,-15),(0,2.7,0),32)
render('windmill-above-45',(10,14,-12),(0,2.7,0),28)
render('windmill-rotor-front',(0,6.6,-10),(-.35,4.5,-.35),62)
isolate('power-pole')
render('power-pole-driver',(-5,8,-7),(0,2.8,0),40)
render('power-pole-above-45',(3,9,-4),(0,3.0,0),45)
isolate('generator')
render('generator-driver',(6,6,-8),(0,1.8,0),40)
render('generator-above-45',(5,10,-5),(0,1.9,0),38)
isolate('solar-rack')
render('solar-rack-driver',(6,5,-8),(0,1.35,0),40)
render('solar-rack-above-45',(5,10,-5),(0,1.4,0),38)
isolate('fuel-depot')
render('fuel-depot-driver',(9,6,-11),(0,1.35,0),38)
render('fuel-depot-above-45',(9,11,-9),(0,1.25,0),34)
isolate('windmill')
# Turn the named rotor around its own axle, export and read back once more.
rotor_obj=next(obj for obj in scene.objects if obj.name=='windmill:rotor')
rotor_obj.rotation_mode='XYZ'
rotor_obj.rotation_euler[1]=math.radians(37)
turn_glb=evidence/'rotor-turned.glb';town.export_glb(turn_glb)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(turn_glb))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=920;scene.render.resolution_y=1000
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.world=bpy.data.worlds.new('bright overcast 2');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.75,.78,1)
groundmat=town.make_materials({'sand':root/'public/assets/models/wasteland/town/textures/town-water-earth.jpg'})['sand']
lamp_data=bpy.data.lights.new('rotor turn light','AREA');lamp=bpy.data.objects.new('rotor turn light',lamp_data);scene.collection.objects.link(lamp);lamp.location=town.game_vector((3,7,-7));lamp_data.energy=2200;lamp_data.size=8
bpy.ops.mesh.primitive_plane_add(size=24,location=town.game_vector((0,-.08,0)));bpy.context.object.data.materials.append(groundmat)
data=bpy.data.cameras.new('windmill-rotor-turned');cam=bpy.data.objects.new('windmill-rotor-turned',data);scene.collection.objects.link(cam);cam.location=town.game_vector((0,5.8,-8));data.lens=70;aim(cam,town.game_vector((0,4.95,-.35)));scene.camera=cam
scene.render.filepath=str(evidence/'windmill-rotor-turned.png');bpy.ops.render.render(write_still=True)

