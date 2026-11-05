"""Build Bowl crush vehicles and render grounded art-review views.

Run: blender -b --python tools/blender/bowl-crush.py -- --root . --render .evidence/<date>/BOWL-ART-CRUSH/round-2
Metres, +Y up, +Z forward. Each obstacle has its own named mesh below one root.
"""
import argparse
import json
import math
import sys
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--out', default='public/assets/models/wasteland/bowl/crush.glb')
p.add_argument('--render', default='')
p.add_argument('--paths-only', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = Path(a.root).resolve()
out = root / a.out
if a.paths_only:
    print(json.dumps({'blend': [str(root / 'art-build/bowl-crush/bowl-crush.blend')], 'glb': [str(out)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in (bpy.data.materials, bpy.data.meshes, bpy.data.curves):
    for item in list(collection):
        if item.users == 0:
            collection.remove(item)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples = 32
scene.render.resolution_x = 1200
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.world = bpy.data.worlds.new('bowl-yard-night')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.20, .22, .23, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65

def material(name, color, metallic=.25, roughness=.82, wear=False):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bs = nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = roughness
    if wear:
        coordinates = nodes.new('ShaderNodeTexCoord')
        tex = nodes.new('ShaderNodeTexNoise')
        tex.inputs['Scale'].default_value = 3.4
        tex.inputs['Detail'].default_value = 4
        tex.inputs['Roughness'].default_value = .78
        tex.inputs['Distortion'].default_value = 1.8
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = .25
        ramp.color_ramp.elements[0].color = (.055, .047, .041, 1)
        ramp.color_ramp.elements[1].position = .77
        ramp.color_ramp.elements[1].color = (*color, 1)
        e = ramp.color_ramp.elements.new(.51)
        e.color = (.34, .13, .045, 1)
        links.new(coordinates.outputs['Generated'], tex.inputs['Vector'])
        links.new(ramp.outputs['Color'], bs.inputs['Base Color'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .16
        bump.inputs['Distance'].default_value = .07
        links.new(tex.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    return m

OXIDE = material('oxide paint under rust streaks', (.38, .17, .095), .36, .78, True)
STEEL = material('welded dark steel, scraped bare at edges', (.26, .29, .28), .72, .68, True)
RUST = material('deep red rust and flaking scale', (.30, .105, .039), .28, .93, True)
SOOT = material('black heat soot', (.035, .032, .029), .12, .97, True)
GLASS = material('empty black window cavities', (.012, .019, .02), .08, .48)
RUBBER = material('cracked salvaged rubber', (.036, .034, .031), .03, .98, True)
EMBER = material('hot ember core', (1.0, .19, .018), .04, .35)
FLAME = material('smoky orange flame', (.9, .105, .009), .02, .6)
DIRT = material('packed Bowl dirt', (.19, .14, .085), 0, 1)
dirt_nodes=DIRT.node_tree.nodes
dirt_noise=dirt_nodes.new('ShaderNodeTexNoise')
dirt_noise.inputs['Scale'].default_value=38
dirt_noise.inputs['Detail'].default_value=3
dirt_ramp=dirt_nodes.new('ShaderNodeValToRGB')
dirt_ramp.color_ramp.elements[0].color=(.095,.071,.045,1)
dirt_ramp.color_ramp.elements[1].color=(.25,.19,.12,1)
DIRT.node_tree.links.new(dirt_nodes.new('ShaderNodeTexCoord').outputs['Generated'],dirt_noise.inputs['Vector'])
DIRT.node_tree.links.new(dirt_noise.outputs['Fac'],dirt_ramp.inputs[0])
DIRT.node_tree.links.new(dirt_ramp.outputs['Color'],dirt_nodes.get('Principled BSDF').inputs['Base Color'])
objects = []
assemblies = []

def mesh_obj(name, verts, faces, mats, indices=None):
    mesh = bpy.data.meshes.new(name + '-mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.materials.clear()
    for m in mats:
        mesh.materials.append(m)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if indices:
        for poly, idx in zip(mesh.polygons, indices):
            poly.material_index = idx
    objects.append(obj)
    return obj

def plate(name, points, material=OXIDE, thickness=.045):
    # Irregular, folded sheet with a visible dark reverse edge.
    top = [tuple(point) for point in points]
    low = [(x, y-thickness, z) for x, y, z in top]
    n = len(top)
    faces = [tuple(range(n)), tuple(reversed(range(n)))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    return mesh_obj(name, top+low, faces, [material, STEEL], [0, 1]+[1]*n)

def beam(name, a, b, width, mat=STEEL, depth=None):
    d = Vector(b)-Vector(a)
    mid = (Vector(a)+Vector(b))*.5
    bpy.ops.mesh.primitive_cube_add(size=1, location=mid)
    o = bpy.context.object
    o.name = name
    o.dimensions = (width, d.length, depth or width)
    o.rotation_euler = d.to_track_quat('Y', 'Z').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    objects.append(o)
    return o

def solid(name, center, dimensions, mat, bevel=.04, rotation=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj=bpy.context.object
    obj.name=name
    obj.dimensions=dimensions
    obj.rotation_euler[1]=rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        edge=obj.modifiers.new('creased-sheet-edges','BEVEL')
        edge.width=bevel
        edge.segments=1
        obj.modifiers.new('welded-face-normals','WEIGHTED_NORMAL')
    objects.append(obj)
    return obj

def wheel(name, pos, radius=.40, angle=0):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius*.76, minor_radius=radius*.24,
                                    major_segments=16, minor_segments=6,
                                    location=pos, rotation=(0, math.pi/2+angle, 0))
    tire = bpy.context.object
    tire.name = name+'-split-sidewall'
    tire.data.materials.append(RUBBER)
    objects.append(tire)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius*.43, depth=.10,
                                        location=pos, rotation=(0, math.pi/2+angle, 0))
    hub = bpy.context.object
    hub.name = name+'-rusted-hub'
    hub.data.materials.append(RUST)
    objects.append(hub)

def vehicle(kind, ident, x, z, crushed=False, scorched=False, pitch=0):
    # Bodies are metres long. Nose points +Z. Shared outline cues differ by kind.
    first_object=len(objects)
    length, width, full_h = {'van':(4.8,1.95,2.05), 'bus':(8.9,2.48,3.12), 'rv':(6.5,2.34,2.92)}[kind]
    h = 1.05 if crushed else full_h
    yoke = pitch
    def P(px, py, pz):
        py0 = py + (abs(px)/width)*(.10 if crushed else 0)
        # crushed shoulders bow outward and the roof falls in alternating dips
        pz0 = pz + .08*math.sin(pz*2.3 + len(ident)) if crushed else pz
        return (x+px, py0, z+pz0)
    base = SOOT if scorched else OXIDE
    hull_top = .87 if crushed else full_h*.78
    solid(ident+'-continuous-lower-body', (x,(.36+hull_top)*.5,z),
          (width*.90,hull_top-.36,length*.92), SOOT if scorched else OXIDE, .09 if not crushed else .06)
    if not crushed:
        # The upper body closes the roofline; bus height and RV bluntness stay distinct.
        solid(ident+'-upper-coach-body',(x,(hull_top+full_h*.90)*.5,z),
              (width*.84,full_h*.90-hull_top,length*.91),base,.065,
              -.035 if kind=='van' else 0)
        solid(ident+'-roof-skin',(x,full_h*.92,z),(width*.87,.10,length*.91),base,.055)
        windshield_y=full_h*.66
        solid(ident+'-front-windshield',(x,windshield_y,z+length*.466),
              (width*.70,.50,.035),GLASS,.018,-.12 if kind=='van' else 0)
        solid(ident+'-rear-glass',(x,windshield_y,z-length*.466),
              (width*.55,.37,.035),GLASS,.014)
    else:
        # Crushed roofs lie at handle height; broad, buckled patches replace intact glass.
        for fold in range(3):
            along=-length*.31+fold*length*.28
            plate(ident+'-folded-roof-section', [P(-width*.44,.78,along),
                  P(-width*.12,.99,along+.11), P(width*.18,.82,along+.19),
                  P(width*.45,.74,along+.29)], SOOT if scorched else RUST, .055)
    # Chassis rails and crossmembers remain readable through missing floor panels.
    for s in (-1,1):
        beam(ident+'-exposed-chassis-rail', P(s*width*.38,.37,-length*.49),
             P(s*width*.38,.37,length*.48), .11, STEEL, .13)
    for q in (-.33,0,.33):
        beam(ident+'-crossmember', P(-width*.4,.36,length*q), P(width*.4,.36,length*q), .085, RUST, .10)
    # Lower side skin: bent, broken silhouettes instead of a clean rectangular shell.
    for side in (-1,1):
        bulge = .18 if crushed else .025
        top = .84 if crushed else full_h*.84
        pts = [P(side*width*.43,.42,-length*.48), P(side*width*.51,top*.78,-length*.32),
               P(side*(width*.50+bulge),top*.70,-length*.08), P(side*(width*.55+bulge),top*.64,length*.12),
               P(side*width*.47,top*.82,length*.32), P(side*width*.42,.42,length*.49)]
        plate(ident+'-folded-side-shell', pts, SOOT if scorched else OXIDE, .065)
        # Separate, uneven upper scraps leave the windows truly open and the side ribs exposed.
        if kind == 'bus':
            bays = 7
        elif kind == 'rv':
            bays = 3
        else:
            bays = 2
        for i in range(bays):
            along = -length*.36 + i*length*.72/bays
            bay = length*.72/bays*.64
            if crushed:
                continue
            yy = full_h*.47 + .07*math.sin(i*2.1+side)
            glass_len = bay*.75
            plate(ident+'-dark-empty-window', [P(side*width*.515,yy,-0.01+along),
                   P(side*width*.515,yy,along+glass_len), P(side*width*.515,yy+.35,along+glass_len*.92),
                   P(side*width*.515,yy+.30,along+.05)], GLASS, .018)
            # A broken frame and weld beads break up the repeated rhythm.
            for edge in (0,1):
                zz = along + (0 if edge == 0 else glass_len)
                beam(ident+'-hand-welded-window-post', P(side*width*.54,yy-.03,zz),
                     P(side*width*.52,yy+.38,zz+.035*math.sin(i*9)), .035, STEEL, .035)
        # Scattered seam patches and downward rust runs, each in different positions.
        for j, pos in enumerate((-.41, -.16, .21, .43)):
            zz = pos*length
            if (j+len(ident)) % 3:
                plate(ident+'-patch-weld-'+str(j), [P(side*(width*.53),top*.72,zz),
                      P(side*(width*.53),top*.72,zz+.25), P(side*(width*.53),top*.49,zz+.32),
                      P(side*(width*.53),top*.49,zz+.05)], RUST, .035)
    # Cab silhouette: van has a slanted one-box nose, bus a high long roof, RV a blunt coach body.
    if kind == 'van':
        plate(ident+'-collapsed-sloping-cab-roof', [P(-.91,h*.65,-length*.48), P(.85,h*.70,-length*.45),
              P(.80,h*.82,-length*.12), P(.38,h*.94,length*.05), P(-.74,h*.78,length*.02)],
              SOOT if scorched else OXIDE, .06)
    elif not crushed:
        plate(ident+'-roof-crown', [P(-width*.46,h*.91,-length*.48), P(width*.44,h*.91,-length*.47),
              P(width*.45,h*.94,length*.46), P(-width*.45,h*.94,length*.48)],
              SOOT if scorched else OXIDE, .055)
    else:
        # Roof is crushed to the door handles; folded high and low points make the collapse legible.
        for side in (-1,1):
            plate(ident+'-buckled-roof-fold', [P(side*.91,.76,-length*.44), P(side*.48,.92,-length*.28),
                  P(side*.30,.74,-length*.04), P(side*.83,.66,length*.12), P(side*.44,.89,length*.36)],
                  SOOT if scorched else RUST, .06)
    # Ragged holes and hanging strips catch light at the torn edges.
    for side in (-1,1):
        for k in range(3):
            zz = (-.36 + k*.31)*length
            beam(ident+'-hanging-torn-sill', P(side*width*.52,.34,zz), P(side*width*.54,.13,zz+.13), .038, STEEL, .025)
    # Tires sit on the ground when whole, but splay and fold under a crushed shell.
    for side in (-1,1):
        for fore in (-1,1):
            zz = z + fore*length*.34
            if crushed:
                px = x+side*(width*.60 + .20*(1 if fore == 1 else -.4))
                py = .34 if fore == 1 else .47
                wheel(ident+'-splayed-wheel', (px,py,zz), .40 if kind=='van' else .45, side*.28)
                beam(ident+'-bent-axle', (x+side*width*.28,.46,zz), (px,.38,zz+.16), .045, RUST, .05)
            else:
                wheel(ident+'-wheel', (x+side*(width*.49),.43,zz), .43 if kind!='van' else .39)
    # Bus doors, van sliding door and RV rear coach equipment identify the silhouette.
    if kind == 'van':
        plate(ident+'-sliding-door-rail', [P(-width*.54,.39,-length*.03), P(-width*.54,.39,length*.32),
              P(-width*.54,.43,length*.31), P(-width*.54,.43,-length*.03)], STEEL, .02)
    elif kind == 'bus':
        for side in (-1,1):
            beam(ident+'-folding-door-post', P(side*width*.52,.48,-length*.33), P(side*width*.52,full_h*.72 if not crushed else .76,-length*.33), .06, STEEL)
    else:
        for side in (-1,1):
            beam(ident+'-rear-ladder-rail', P(side*.76,.53,length*.45), P(side*.76,h*.84,length*.49), .055, STEEL)
    # Door-height bumper scraps and thick hand-laid weld beads.
    for side in (-1,1):
        for q in (-1,1):
            beam(ident+'-cut-bumper', P(side*width*.47,.28,q*length*.48),
                 P(side*width*.47,.24,q*length*.48+.32), .10, RUST, .16)
    part_objects=objects[first_object:]
    buckets={'body-shell':[],'broken-glass':[],'wheels':[],'welds-and-frame':[]}
    for obj in part_objects:
        label=obj.name.lower()
        if 'wheel' in label or 'hub' in label:
            buckets['wheels'].append(obj)
        elif 'window' in label or 'windshield' in label or 'glass' in label:
            buckets['broken-glass'].append(obj)
        elif 'body' in label or 'roof' in label or 'folded-side-shell' in label:
            buckets['body-shell'].append(obj)
        else:
            buckets['welds-and-frame'].append(obj)
    joined=[]
    for category,parts in buckets.items():
        if not parts:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts:
            obj.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]
        bpy.ops.object.join()
        obj=bpy.context.object
        obj.name=ident+'-'+category
        obj.data.name=ident+'-'+category+'-mesh'
        obj['part']=category
        joined.append(obj)
    objects[first_object:]=joined
    group=bpy.data.objects.new(ident+'-assembly',None)
    bpy.context.collection.objects.link(group)
    group.location=(x,.45,z)
    for obj in joined:
        obj.parent=group
        obj.matrix_parent_inverse=group.matrix_world.inverted()
    group.rotation_euler[0]=pitch
    assemblies.append(group)
    return h

# Bowl dirt, low scattered stones, and subtle tire-scuffed patches anchor the wrecks.
bpy.ops.mesh.primitive_plane_add(size=90, location=(0,-.09,0))
ground = bpy.context.object
ground.name = 'Bowl-flat-packed-dirt'
ground.data.materials.append(DIRT)
for node in ground.data.materials[0].node_tree.nodes:
    if node.type == 'TEX_NOISE':
        node.inputs['Scale'].default_value = 13

# Three original vehicle silhouettes in whole and collapsed forms, spaced like a crush lane.
vehicle('van','van-crushed',-7,0,True)
vehicle('bus','bus-crushed',0,0,True)
vehicle('rv','rv-crushed',7,0,True)
vehicle('van','van-whole',-7,5.3,False)
vehicle('bus','bus-whole',0,5.3,False)
vehicle('rv','rv-whole',7,5.3,False)

# The burning buses slump diagonally into a low heap. Their body panels are scorched;
# the flames curl from the cavities and ember bed instead of standing as orange bars.
vehicle('bus','fire-heap-lower',-1.5,11.3,True,True)
vehicle('bus','fire-heap-upper',1.4,11.8,True,True,.55)
for i in range(10):
    x = -2.6 + (i*17 % 49)/10
    z = 9.7 + (i*13 % 31)/10
    y = .08 + (i%3)*.025
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5,
       location=(x,y,z), scale=(.17+(i%3)*.035,.12,.20+(i%4)*.03))
    coal=bpy.context.object; coal.name='fire-heap-glowing-coal'; coal.data.materials.append(EMBER if i%4==0 else SOOT); objects.append(coal)
for i in range(8):
    x=-2.3+(i*17%42)/10
    z=10+(i*11%26)/10
    height=.85+(i%4)*.22
    radius=.18+(i%3)*.035
    verts=[]
    profile=((0,1.0),(.20,.86),(.47,.57),(.72,.39),(1.0,.20),(1.18,.02))
    lean=.12*math.sin(i*2.7)
    for ring,(rise,wide) in enumerate(profile):
        for side in range(7):
            angle=side*math.tau/7
            wav=1+.12*math.sin(side*4+i*1.7+ring)
            verts.append((x+lean*rise+math.cos(angle)*radius*wide*wav,
                          .12+rise*height,
                          z+math.sin(angle)*radius*.72*wide*wav))
    faces=[]
    for ring in range(len(profile)-1):
        for side in range(7):
            a0=ring*7+side; a1=ring*7+(side+1)%7
            b0=(ring+1)*7+side; b1=(ring+1)*7+(side+1)%7
            faces.append((a0,a1,b1,b0))
    faces.append(tuple(range((len(profile)-1)*7,len(profile)*7)))
    flame=mesh_obj('curling-flame-tongue',verts,faces,[FLAME if i%3 else EMBER])

root_empty = bpy.data.objects.new('bowl-crush', None)
scene.collection.objects.link(root_empty)
for obj in objects:
    obj.parent=root_empty
for group in assemblies:
    group.parent=root_empty
# Design coordinates are Y-up/+Z-forward. Blender renders Z-up, so rotate the
# obstacle assembly into Blender's world; glTF export converts it back to Y-up.
root_empty.rotation_euler[0]=math.pi/2
ground.parent=root_empty
for obj in objects:
    if obj.type=='MESH' and obj.data.validate(verbose=True):
        print('BOWL-ART-CRUSH cleaned unused mesh corners:',obj.name)

if a.render:
    dest=Path(a.render).resolve()
    dest.mkdir(parents=True,exist_ok=True)
    # Use the real Titan monster as a temporary review prop. It is excluded
    # from the obstacle export; it only gives Claude a trustworthy size cue.
    bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/unlocks/titan_monster.glb'))
    imported=[o for o in bpy.context.selected_objects if o.type=='MESH']
    if not imported:
        raise RuntimeError('Titan scale reference contains no mesh')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in imported:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=imported[0]
    bpy.ops.object.join()
    titan=bpy.context.object
    titan.name='review-only-Titan-scale-reference'
    bounds=[titan.matrix_world @ Vector(corner) for corner in titan.bound_box]
    height=max(v.z for v in bounds)-min(v.z for v in bounds)
    if height <= 0:
        raise RuntimeError('Titan scale reference has no height')
    titan.scale *= 3.8/height
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bounds=[titan.matrix_world @ Vector(corner) for corner in titan.bound_box]
    cx=(min(v.x for v in bounds)+max(v.x for v in bounds))*.5
    cz=(min(v.z for v in bounds)+max(v.z for v in bounds))*.5
    floor=min(v.z for v in bounds)
    titan.location.x += 11.2-cx
    titan.location.y += -0.2-cz
    titan.location.z -= floor
    def blender_point(point):
        x,y,z=point
        return (x,-z,y)
    def aim(obj, target):
        obj.rotation_euler=(Vector(blender_point(target))-obj.location).to_track_quat('-Z','Y').to_euler()
    def area(name, loc, energy, size, target):
        bpy.ops.object.light_add(type='AREA',location=blender_point(loc))
        light=bpy.context.object; light.name=name; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size; aim(light,target)
    area('warm stadium flood',(1,15,-2),7600,16,(0,1,5))
    area('cool steel rim',(-15,9,14),5200,12,(0,1,6))
    area('fire bounce',(1,5,14),1800,6,(0,.8,10))
    def render(name, location, target, lens, resolution=(1200,760)):
        bpy.ops.object.camera_add(location=blender_point(location))
        camera=bpy.context.object; camera.data.lens=lens; aim(camera,target); scene.camera=camera
        scene.render.resolution_x,scene.render.resolution_y=resolution
        scene.render.image_settings.file_format='PNG'
        scene.render.filepath=str(dest/(name+'.png'))
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(camera,do_unlink=True)
    # Low eye-line at 40 m, followed by a three-quarter crush view and a material/detail view.
    render('wide-40m',(-26,3.0,-25),(1.0,1.0,4.0),50)
    render('three-quarter',(15,7,-15),(0,.9,5.7),48)
    render('close-welds',(-14,3.3,-6.3),(-7,.55,0),57,(1200,760))
    render('fire-heap-close',(9,4,25),(0,.9,11),57,(1200,760))

out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in [root_empty]+assemblies+objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active=root_empty
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True)
print(f'BOWL-ART-CRUSH wrote {out} ({out.stat().st_size} bytes)')
