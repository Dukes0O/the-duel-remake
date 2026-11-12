"""Build one original, metric airliner graveyard for the Scablands.

Run with Blender 4.5:
  blender -b --python-exit-code 1 --python tools/blender/scablands-boneyard.py -- --root .

Coordinates are metres, +Y up, with the drive-through direction along +Z.
"""
import argparse
import json
import math
import os
import sys
from datetime import date
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=2)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/boneyard.glb'
blend = root / 'art-build/scablands-boneyard/boneyard.blend'
evidence = Path(os.environ.get('DUEL_EVIDENCE_DIR') or
                root / '.evidence' / date.today().isoformat() / 'ww-art-boneyard' / 'round-2')
if not evidence.is_absolute():
    evidence = root / evidence
if args.paths_only:
    print(json.dumps({'blend': [str(blend)], 'glb': [str(out)],
                      'evidence': [str(evidence)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
out.parent.mkdir(parents=True, exist_ok=True)
blend.parent.mkdir(parents=True, exist_ok=True)
evidence.mkdir(parents=True, exist_ok=True)

def mat(name, color, metal=0.0, rough=.86, rust=False):
    # One plain base colour and little metal: the exporter writes no colour for a texture node, and the game draws the
    # rust, runs and grain in code (SCABLANDS-LAND; docs/ART_LINE.md, "A model that is black in the game").
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value = min(metal, .2)
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Base Color'].default_value = (*color, 1)
    return m

# The aluminium and the enamel were two-colour noise: each takes the middle of its two colours.
steel = mat('Pitted grey aircraft aluminium', (.295,.325,.315), .56, .88)
paint = mat('Faded ivory aircraft enamel', (.47,.455,.40), .24, .86)
dark = mat('Soot-dark interior steel', (.045,.052,.05), .32, .94)
glass = mat('Clouded cockpit glass', (.075,.105,.105), .48, .42)
rubber = mat('Engine pod burnt rubber', (.035,.038,.036), .04, .98)
earth = mat('Dry Scablands dirt', (.25,.17,.095), 0, 1)
rust = mat('Rust limited to steel seams and repairs', (.25,.105,.038), .48, .94, True)
soot = mat('Old soot and fuel stains', (.045,.043,.039), .08, .98)

root_obj = bpy.data.objects.new('Scablands Boneyard', None)
root_obj.empty_display_type = 'PLAIN_AXES'
bpy.context.collection.objects.link(root_obj)
objects=[]

def mesh_obj(name, verts, faces, material, loc=(0,0,0)):
    mesh=bpy.data.meshes.new(name+' mesh')
    mesh.from_pydata(verts, [], faces); mesh.materials.append(material); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.location=loc; obj.parent=root_obj; objects.append(obj)
    return obj

def box(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj=bpy.context.object; obj.name=name; obj.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material); obj.parent=root_obj; objects.append(obj)
    if bevel:
        mod=obj.modifiers.new('Bent sheet edges','BEVEL'); mod.width=bevel; mod.segments=1
        obj.modifiers.new('Worn corner normals','WEIGHTED_NORMAL')
    return obj

def cylinder(name, loc, radius, depth, material, vertices=16, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        end_fill_type='NGON', location=loc, rotation=rotation)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(material)
    obj.parent=root_obj; objects.append(obj); return obj

def beam(name, a, b, radius, material, vertices=8):
    v1,v2=Vector(a),Vector(b); d=v2-v1
    obj=cylinder(name,(v1+v2)/2,radius,d.length,material,vertices)
    obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=d.to_track_quat('Z','Y')
    return obj

def aircraft(label, center, yaw, damage):
    """38 m airliner wreck; 5.1 m clear interior and open ends."""
    base=Vector(center); ca,sa=math.cos(yaw),math.sin(yaw)
    def p(x,y,z): return (base.x+ca*x-sa*z, base.y+y, base.z+sa*x+ca*z)
    # A circular tube with a clear cabin: sheet panels are broken into
    # unequal lengths and leave the ragged open ends and roof tears visible.
    rings=[(-18,2.60,1.53),(-16,2.73,1.62),(-12,2.79,1.66),(-7,2.80,1.67),
    (0,2.82,1.68),(8,2.79,1.66),(14,2.72,1.61),(17,2.58,1.52)]
    n=32; verts=[]; faces=[]
    for z,rx,ry in rings:
        for j in range(n):
            a=math.tau*j/n
            verts.append(p(rx*math.cos(a),ry+ry*math.sin(a),z))
    broken={(1,5),(1,6),(2,13),(2,14),(3,23),(4,7),(4,8),(5,18),(5,19)}
    for k in range(len(rings)-1):
        for j in range(n):
            if (k,j) in broken or (k in (0,6) and j in (2,3,12,13,20,21,28)):
                continue
            a=k*n+j; b=k*n+(j+1)%n; c=(k+1)*n+(j+1)%n; d=(k+1)*n+j
            faces.append((a,b,c,d))
    mesh_obj(label+' round torn fuselage shell',verts,faces,steel)
    # Curved ribs frame the entire tube. The bottom ends disappear into the
    # dirt; the deck sits on the ground so the tunnel has no floating floor.
    for z in range(-15,16,3):
        for j in range(n):
            a=math.tau*j/n; b=math.tau*(j+1)/n
            if (z in (-9,3,12) and j in (5,6,7,24,25)):
                continue
            beam(label+' curved cabin rib',p(2.58*math.cos(a),1.53+1.53*math.sin(a),z),
                 p(2.58*math.cos(b),1.53+1.53*math.sin(b),z),.052,paint,6)
    floorverts=[p(-2.55,.08,-16),p(2.55,.08,-16),p(2.55,.08,16),p(-2.55,.08,16)]
    mesh_obj(label+' open drive-through deck at ground',floorverts,[(0,1,2,3)],dark)
    # Remains of window frames, deliberately sparse and asymmetric.
    for side in (-1,1):
        for z in range(-12,14,3):
            if (z*side+int(damage*10))%4==0: continue
            x=side*2.58
            beam(label+' torn window mullion',p(x,.95,z-.62),p(x,.95,z+.62),.045,paint,6)
        for z in (-14,13):
            beam(label+' lower side stringer',p(side*2.45,.38,z),p(side*2.6,.48,z+2),.095,steel,8)
        # Uneven replacement panels and short weld beads break up the clean
        # tube surface. Their edges follow the fuselage curve rather than sit
        # as flat decals.
        for z0,span,ang in ((-10,2.6,0.02),(1.8,3.4,.08),(9.6,2.2,-.05)):
            a0=ang if side>0 else math.pi-ang
            pts=[]
            for z,da in ((z0,-.19),(z0, .17),(z0+span,.13),(z0+span,-.14)):
                aa=a0+da
                pts.append(p(2.835*math.cos(aa),1.68+1.695*math.sin(aa),z))
            mesh_obj(label+' hand-cut service patch',pts,[(0,1,2,3)],paint if z0!=1.8 else rust)
            for dz in (0,span):
                for t in range(1,5):
                    z=z0+dz; aa=a0-.19+.36*t/5
                    beam(label+' short patch weld',p(2.84*math.cos(aa),1.68+1.70*math.sin(aa),z),
                         p(2.84*math.cos(aa+.018),1.68+1.70*math.sin(aa+.018),z+.08),.026,rust,5)
    # A bent rear cone and swept fin make the landmark readable at distance.
    beam(label+' raised tail keel',p(0,1.0,9),p(0,3.0,18),.32,steel,16)
    fin=[p(0,2.5,12),p(0,7.0,16.5),p(0,6.35,18),p(0,1.9,17.4),p(0,1.5,14)]
    mesh_obj(label+' swept vertical tail fin',fin,[(0,1,2,3,4)],paint)
    for side in (-1,1):
        mesh_obj(label+' torn horizontal tailplane',
          [p(0,3.0,14),p(side*5.1,2.7,16.8),p(side*4.0,2.55,17.6),p(side*.5,2.9,15.3)],
          [(0,1,2,3)],paint)
        beam(label+' tailplane exposed spar',p(side*.5,2.8,15.4),p(side*4.7,2.55,17.1),.10,rust,8)
    # Broken, tapered low wings form broad ramps; loose flaps hang from torn
    # trailing edges. Weld seams, bent spars and split tips replace flat slabs.
    for side in (-1,1):
        x0=side*2.35; x1=side*10.0; x2=side*8.5
        wing=[p(x0,.88,-4.5),p(x1,.16,-3.9),p(x2,.12,4.9),p(side*6.2,.30,3.8),p(x0,.88,2.8)]
        mesh_obj(label+(' left tapered low wing' if side<0 else ' right tapered low wing'),wing,
                 [(0,1,2,3,4)],paint)
        # Broken tip skins and a dropped flap are separate bent plates.
        flap=[p(side*6.0,.10,3.6),p(side*8.3,-.16,4.35),p(side*8.8,-.95,5.05),p(side*6.2,-.65,4.65)]
        mesh_obj(label+' hanging split flap',flap,[(0,1,2,3)],steel)
        tip=[p(side*8.8,.12,4.1),p(side*10.5,.08,3.35),p(side*9.5,.02,2.2),p(side*8.1,.10,2.8)]
        mesh_obj(label+' torn tapered wingtip',tip,[(0,1,2,3)],rust)
        # Folded spars and short, welded ribs expose real structure underneath.
        for z in (-3.8,-1.2,1.4,3.8):
            beam(label+' exposed wing spar',p(x0,.55,z),p(side*9.0,.04,z*.72),.105,steel,8)
        for t in (.28,.55,.8):
            x=side*(2.35+7.3*t)
            beam(label+' welded wing rib',p(x,.3,-3.3),p(x,.0,3.7*(1-.2*t)),.052,dark,6)
        for z in (-2.8,-.4,2.1):
            beam(label+' visible repair weld',p(side*2.7,.91,z),p(side*5.4,.58,z+.18),.022,rust,5)
        # Detached, scorched engine pods remain in the yard.
        ex=side*4.2; ez=-2.7 if side<0 else 4.8
        pod=cylinder(label+' grounded engine pod',p(ex,.56,ez),.75,2.4,rubber,24)
        cylinder(label+' exposed engine intake rim',p(ex,.56,ez-1.21),.64,.12,steel,24)
        cylinder(label+' black turbine face',p(ex,.56,ez-1.29),.49,.025,dark,20)
        for blade in range(8):
            a=blade*math.tau/8
            beam(label+' bent turbine blade',p(ex,.56+.42*math.sin(a),ez-1.31+.42*math.cos(a)),
                 p(ex,.56+.17*math.sin(a+.18),ez-1.31+.17*math.cos(a+.18)),.025,steel,5)
    # Faded cockpit nose uses a sloped shell and sparse broken glazing bars.
    cockpit=[p(-1.5,1.65,-18),p(1.5,1.65,-18),p(1.2,2.9,-15.7),p(-1.2,2.9,-15.7)]
    mesh_obj(label+' sloped cockpit crown',cockpit,[(0,1,2,3)],paint)
    for x in (-.8,0,.8):
        beam(label+' broken cockpit glazing bar',p(x,1.75,-18.15),p(x*.82,2.8,-15.8),.055,glass,6)
    # Broken landing gear; one heavy leg still holds the tail end high.
    for x,z,h in ((-1.4,-5,.9),(1.4,-5,.5),(0,8,1.55)):
        beam(label+' buckled landing gear',p(x,.25,z),p(x*.9,-h,z+.35),.16,steel,10)
        cylinder(label+' torn tyre',p(x*.9,-h,z+.35),.44,.28,rubber,16,(0,math.pi/2,0))

# Three distinct wrecks in a row: one complete tunnel, one split-open shell, one tail-up.
aircraft('North wreck',(0,0,0),0,.23)
aircraft('East wreck',(27,0,4),-.19,.64)
aircraft('South wreck',(-27,0,-2),.14,.81)
# Low, continuous dirt pad removes the old floating ground slab. Field scrap
# uses larger, bent plates, torn gear and steel seams instead of tiny chips.
box('Level compacted Scablands dirt',(0,-.16,0),(180,.32,150),earth,.06)
for i,(x,z,a,sx,sz) in enumerate(((-20,-19,.22,5.4,3.2),(15,-17,-.3,4.6,2.7),
    (32,10,.5,5.8,3.1),(-35,12,-.4,4.8,3.7),(19,22,.8,5.2,2.8),(-12,21,-.6,4.3,2.9),
    (-43,-25,.45,6.2,3.5),(43,-23,-.2,5.5,3.0),(-48,27,-.7,4.8,3.4),(49,28,.3,6.0,3.8))):
    obj=box('Large bent aircraft skin scrap',(x,.08,z),(sx,.16,sz),steel,.06); obj.rotation_euler[1]=a
    beam('Scrap seam weld', (x-sx*.3,.18,z-.2),(x+sx*.3,.18,z+.3),.035,rust,6)

bpy.context.view_layer.update()
triangles=sum(len(poly.vertices)-2 for obj in objects if obj.type=='MESH' for poly in obj.data.polygons)
print('boneyard authored triangle count:',triangles)
assert 5000 < triangles <= 45000, f'triangle budget exceeded or unexpectedly sparse: {triangles}'

# World setup for reproducible close-to-ground review angles.
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1200; scene.render.resolution_y=760; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
scene.render.resolution_percentage=85
scene.world=bpy.data.worlds.new('Scablands review world')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.22,.24,.26,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.52
sun_data=bpy.data.lights.new('Hard desert afternoon','SUN'); sun_data.energy=2.2
sun=bpy.data.objects.new('Hard desert afternoon',sun_data); scene.collection.objects.link(sun)
sun.rotation_euler=(math.radians(-66),math.radians(-24),math.radians(-31))
fill_data=bpy.data.lights.new('Open sky fill','AREA'); fill_data.energy=14000; fill_data.shape='DISK'; fill_data.size=42
fill=bpy.data.objects.new('Open sky fill',fill_data); scene.collection.objects.link(fill)
fill.location=(-5,38,-8); fill.rotation_euler=(math.radians(-90),0,0)
scene.view_settings.view_transform='AgX'
def point_camera(cam, target):
    direction=(Vector(target)-cam.location).normalized()
    world_up=Vector((0,1,0))
    right=direction.cross(world_up).normalized()
    up=right.cross(direction).normalized()
    from mathutils import Matrix
    cam.rotation_euler=Matrix((right,up,-direction)).transposed().to_euler()
def render_view(name, position, target, scale=75):
    data=bpy.data.cameras.new(name+' camera'); cam=bpy.data.objects.new(name+' camera',data)
    scene.collection.objects.link(cam); cam.location=position; data.type='ORTHO'; data.ortho_scale=scale
    point_camera(cam,target); scene.camera=cam
    scene.render.filepath=str(evidence/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True); bpy.data.cameras.remove(data)

# Review-only yard car for scale. It is removed before the runtime export and
# Blender source save, so the deliverable stays the airliner graveyard.
review_objects=[]
before=set(bpy.data.objects)
box('Scale car chassis',(7,.74,-7),(4.0,.42,1.55),dark,.12)
box('Scale car hood',(7,.98,-8.05),(1.25,.35,1.38),steel,.10)
box('Scale car cabin',(7,1.34,-6.72),(1.42,.78,1.55),paint,.12)
box('Scale car windshield',(7,1.42,-7.48),(1.18,.48,.08),glass,.02)
box('Scale car rear glass',(7,1.42,-5.96),(1.18,.48,.08),glass,.02)
for x in (5.82,8.18):
    for z in (-8.05,-5.95):
        cylinder('Scale car worn tyre',(x,.53,z),.43,.22,rubber,20,(0,math.pi/2,0))
        cylinder('Scale car steel hub',(x+(.12 if x>7 else -.12),.53,z),.20,.025,steel,16,(0,math.pi/2,0))
review_objects=[obj for obj in bpy.data.objects if obj not in before]

# Verdict views: a car-height approach from about 40 m, three-quarter yard
# silhouette, cabin-height drive-through, and close hand-built wing detail.
render_view('approach-40m', (10,1.55,-40),(0,2.1,0),39)
render_view('three-quarter', (35,10,-37),(0,3.3,0),51)
render_view('drive-through-car-height', (0,1.45,-12),(0,1.55,12),11)
render_view('close-wing-repairs', (8.8,3.7,3.7),(5.2,.8,1.8),9)

# Keep the review scale prop out of both the saved recipe and the GLB.
for obj in review_objects:
    objects.remove(obj)
    bpy.data.objects.remove(obj,do_unlink=True)

# Consolidate small welded fragments within clearly named aircraft parts.
# This keeps the GLB compact without losing the fuselage, wings, tail, engines,
# cockpit, landing gear, ground and yard-scrap parts required by the card.
def part_key(name):
    lowered=name.lower()
    for prefix in ('north wreck','east wreck','south wreck'):
        if lowered.startswith(prefix):
            detail=lowered[len(prefix):]
            if 'wing' in detail or 'flap' in detail or 'spar' in detail:
                return prefix.title()+' wings'
            if 'tail' in detail or 'keel' in detail:
                return prefix.title()+' tail'
            if 'engine' in detail or 'turbine' in detail or 'intake' in detail:
                return prefix.title()+' engines'
            if 'cockpit' in detail or 'glazing' in detail:
                return prefix.title()+' cockpit'
            if 'gear' in detail or 'tyre' in detail:
                return prefix.title()+' landing gear'
            return prefix.title()+' fuselage'
    if 'ground' in lowered or 'dirt' in lowered:
        return 'Boneyard ground'
    return 'Boneyard field scrap'

groups={}
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH' or len(obj.data.materials)!=1:
        continue
    key=(part_key(obj.name),obj.data.materials[0])
    groups.setdefault(key,[]).append(obj)
for (part,material),batch in groups.items():
    if len(batch)<2:
        batch[0].name=part+' — '+material.name
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in batch: obj.select_set(True)
    bpy.context.view_layer.objects.active=batch[0]
    bpy.ops.object.join()
    batch[0].name=part+' — '+material.name
part_names={part_key(obj.name) for obj in bpy.context.scene.objects if obj.type=='MESH'}
for wreck in ('North Wreck','East Wreck','South Wreck'):
    for part in ('fuselage','wings','tail','engines','cockpit','landing gear'):
        assert wreck+' '+part in part_names, f'missing named part: {wreck} {part}'
objects=[root_obj]+[obj for obj in bpy.context.scene.objects if obj.type=='MESH']

bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action='DESELECT'); root_obj.select_set(True)
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,
                           export_yup=False,export_apply=False,export_cameras=False,export_lights=False,
                           export_materials='EXPORT',export_image_format='AUTO')
print('boneyard GLB bytes:',out.stat().st_size)
assert out.stat().st_size <= 2_000_000, 'GLB exceeds the 2 MB card budget'
