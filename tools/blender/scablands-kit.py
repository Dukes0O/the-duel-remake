"""WW-ART-KIT: reusable Scablands props, authored as welded field salvage.

Run: blender -b --python tools/blender/scablands-kit.py -- --root . [--render DIR]
Blender Z-up coordinates export through glTF's Y-up conversion.
"""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--render', help='Render inspection views into this evidence folder')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
ROOT = Path(args.root).resolve()
OUT = ROOT / 'public/assets/models/wasteland/scablands/kit.glb'
TRIANGLE_BUDGET = 30000
FILE_BUDGET = 1_500_000
if args.paths_only:
    print(json.dumps({'blend': [str(ROOT/'art-build/scablands-kit.blend')], 'glb': [str(OUT)], 'evidence': []}))
    raise SystemExit(0)

import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, color, metallic=.55, rough=.78, emission=None):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*color, 1)
    # Plain base colour and little metal: the exporter writes no colour for a texture node, and the game draws
    # the rust, runs and grain in code (SCABLANDS-LAND; docs/ART_LINE.md, "A model that is black in the game").
    b.inputs['Metallic'].default_value = min(metallic, .2); b.inputs['Roughness'].default_value = rough
    if emission:
        b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emission
    return m

RUST = mat('Scale rust over old mill steel', (.15,.075,.045), .78)
IRON = mat('Blackened forged iron', (.045,.052,.050), .88)
OXIDE = mat('Flaked oxide red', (.29,.095,.042), .58)
STONE = mat('Scablands ochre dust', (.30,.22,.12), .05, .94)
BASALT = mat('Dark basalt with buried grit', (.045,.050,.049), .04, .97)
TAN_BASALT = mat('Ochre dust-stained basalt', (.16,.105,.055), .06, .96)
PLATE_STEEL = mat('Dark welded plate steel', (.072,.083,.080), .86, .82)
PAINT = mat('Faded road paint', (.67,.49,.23), .25)
CREAM = mat('Old enamel lettering', (.79,.72,.54), .2)
CHAR = mat('Sooted welded steel', (.042,.039,.033), .26, .96)
EMBER = mat('Low ember glow', (.95,.18,.018), .25,.5, .8)
CANVAS = mat('Smoke-stained signal cloth', (.56,.25,.09), .05,.96)
LAMP = mat('Amber industrial lamp glass', (.95,.37,.055), .12,.34,1.7)

root = bpy.data.objects.new('scablands-kit', None); scene.collection.objects.link(root)
objects=[]

def keep(obj, name, material, parent=root):
    obj.name=name; obj.data.materials.append(material); obj.parent=parent; objects.append(obj); return obj
def cube(name, loc, scale, material, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('hammer-rounded damaged edges','BEVEL'); mod.width=bevel; mod.segments=1
        o.modifiers.new('weighted steel normals','WEIGHTED_NORMAL')
    return keep(o,name,material)
def beam(name,a,b,width,material,depth=None):
    a,b=Vector(a),Vector(b); mid=(a+b)/2
    bpy.ops.mesh.primitive_cube_add(size=1,location=mid); o=bpy.context.object
    o.dimensions=(width, depth or width, (b-a).length); o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return keep(o,name,material)
def cyl(name,loc,radius,depth,material,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    return keep(bpy.context.object,name,material)
def ico(name,loc,scale,material,subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=1,location=loc)
    o=bpy.context.object; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return keep(o,name,material)

# Scablands cliffs: half-buried basalt ledges, with ochre sand banked over the feet.
for i,(x,y,sx,sy,sz,rot) in enumerate([
        (-5.5,2.55,1.18,.90,2.35,.12),(-4.25,2.72,.84,.78,1.72,-.22),
        (-6.55,2.85,.88,.88,1.92,.31),(-5.05,3.18,1.05,.76,1.52,-.1),
        (-3.85,3.18,.70,.70,1.30,.18)]):
    o=ico(f'basalt-cliff-face-{i+1}',(x,y,sz*.42),(sx,sy,sz),BASALT,2 if i in (0,3) else 1); o.rotation_euler.z=rot
    if i in (0,2,3):
        beam(f'cliff-fracture-seam-{i+1}',(x-.35,y-.18,.36),(x+.28,y-.16,.72),.045,IRON)

# Roadside rocks: dark fractured basalt with an ochre bank hiding their lower edges.
for i,(x,y,sx,sy,sz,rot) in enumerate([(-5,0,1.25,.8,.55,.2),(-4.1,.25,.75,.7,.42,-.3),
        (-5.5,.5,.62,.56,.75,.5),(-4.6,-.42,.55,.48,.32,.1)]):
    o=ico(f'basalt-rock-{i+1}',(x,y,sz*.26),(sx,sy,sz),BASALT if i%2==0 else TAN_BASALT,2 if i==0 else 1); o.rotation_euler.z=rot
for i in range(4):
    x=-5.6+i*.55; beam(f'fractured-cliff-seam-{i+1}',(x,-.12,.12),(x+.22,.36,.18),.035,IRON)

# Bent direction sign with real painted words, chipped enamel, arrow plates and rivets.
sign_start=len(objects)
beam('sign-post',(0,0,0),(0,0,2.2),.09,IRON,.09)
beam('post-brace',(-.05,0,.28),(.03,0,1.72),.035,OXIDE)
cube('sign-upper-arrow',(.25,-.015,1.68),(1.48,.075,.38),OXIDE,.018)
cube('sign-lower-arrow',(-.15,-.02,1.20),(1.36,.075,.36),RUST,.018)
for z, direction, label, center in [(1.68,1,'ASH ROAD',.17),(1.20,-1,'WELL 6',-.20)]:
    tip=center+direction*.79
    beam('arrow-head-'+str(z),(tip-direction*.20,-.06,z),(tip,-.06,z),.075,CREAM,.022)
    for xx in (center-.58,center+.58): cyl('sign-face-rivet',(xx,-.064,z),.025,.018,IRON,8)
    curve=bpy.data.curves.new('painted sign lettering','FONT'); curve.body=label; curve.size=.185 if len(label)>6 else .22
    curve.extrude=.002; text=bpy.data.objects.new('sign-painted-'+label.lower().replace(' ','-'),curve)
    scene.collection.objects.link(text); text.location=(center-.49,-.069,z-.055); text.rotation_euler=(math.pi/2,0,0)
    bpy.ops.object.select_all(action='DESELECT'); text.select_set(True); bpy.context.view_layer.objects.active=text
    bpy.ops.object.convert(target='MESH'); text=bpy.context.object; keep(text,text.name,CREAM)
for o in objects[sign_start:]: o.location.x-=1.45

# Tall radio mast: four bolted legs, crossed braces, aerial and a scavenged dish.
mast_start=len(objects)
for sx in (-1,1):
    for sy in (-1,1): beam('mast-leg',(sx*.52,sy*.42,0),(sx*.12,sy*.12,5.1),.075,OXIDE,.065)
for z in (.25,.95,1.65,2.35,3.05,3.75,4.45,5.0):
    w=.52-(z/5.1)*.4
    for sx in (-1,1): beam('mast-rung',(sx*w,-w*.8,z),(-sx*w,w*.8,z),.035,IRON)
for level in range(7):
    z0=.25+level*.68; z1=z0+.68; w0=.52-z0/5.1*.4; w1=.52-z1/5.1*.4
    for sy in (-1,1): beam('crossed-mast-brace',(-w0,sy*w0,z0),(w1,sy*w1,z1),.028,RUST)
cyl('mast-antenna-collar',(0,0,5.0),.12,.16,IRON)
beam('mast-lightning-rod',(0,0,5.04),(0,0,5.72),.027,IRON)
for z in (3.5,4.1,4.7):
    beam('antenna-radial',(0,0,z),(.42,0,z+.12),.022,IRON)
cube('mast-warning-panel',(0,-.44,2.1),(.38,.035,.27),PAINT,.01)
for o in objects[mast_start:]: o.location.x-=2.35

# Burnable barricades: bowed welded sheet, pipe rails, tire ballast and cut spikes.
def barricade(prefix, plate_material, xoff, burnt=False):
    par=bpy.data.objects.new(prefix,None); scene.collection.objects.link(par); par.parent=root; objects.append(par)
    def part(o,n,material): o.name=n; o.parent=par; o.data.materials.append(material); objects.append(o)
    steel=CHAR if burnt else PLATE_STEEL
    for i in range(4):
        y=-.64+i*.39; z=.42+(i%2)*.27
        # Individual overlapping armor sheets are battered, dark and uneven.
        plate=cube(prefix+'-salvage-slat',(xoff,y,z),(1.52,.12,.38),steel,.035)
        plate.rotation_euler=(.02*(i%2),(-.16 if i%2 else .12),(.08 if i%2 else -.06))
        # Ragged cutouts and bent-up plate corners break the clean bench silhouette.
        for side in (-1,1):
            beam(prefix+'-torn-tab',(xoff+side*.61,y,z+.16),(xoff+side*.83,y+.04,z+.35),.075,OXIDE,.09)
        for j in range(3):
            cyl(prefix+'-plate-rivet',(xoff-.62+j*.62,y-.123,z),.027,.025,IRON,8)
        for j in range(2):
            beam(prefix+'-weld-seam',(xoff-.35+j*.72,y-.125,z-.13),(xoff-.14+j*.72,y-.125,z+.15),.035,CREAM if not burnt else IRON,.018)
    # Heavy pipe frame and a pair of chained scrap tyres hold the fence upright.
    for x in (xoff-.82,xoff+.82):
        beam(prefix+'-pipe-upright',(x,0,.07),(x,0,1.22),.105,IRON,.105)
    beam(prefix+'-top-pipe',(xoff-.92,0,1.10),(xoff+.92,0,1.10),.105,OXIDE,.105)
    for x in (xoff-.72,xoff+.72):
        bpy.ops.mesh.primitive_torus_add(major_radius=.34,minor_radius=.12,major_segments=12,minor_segments=6,location=(x,-.39,.36),rotation=(math.pi/2,0,0))
        part(bpy.context.object,prefix+'-ballast-tyre',IRON)
    for i in range(5):
        x=xoff-.74+i*.37
        beam(prefix+'-cut-spike',(x,0,1.12),(x+(.12 if i%2 else -.10),0,1.48),.065,OXIDE,.065)
    return par
barricade('barricade-whole',RUST,0)
barricade('barricade-burnt',CHAR,2.8,True)

# Roof-top ember pot, patched from a cut drum with hoop straps and punched vents.
cyl('ember-pot-drum',(5,0,.48),.43,.82,RUST,16)
cyl('ember-pot-lip',(5,0,.90),.47,.075,IRON,16)
cyl('ember-pot-rim',(5,0,.94),.38,.035,OXIDE,16)
for z in (.22,.69):
    bpy.ops.mesh.primitive_torus_add(major_radius=.44,minor_radius=.028,major_segments=16,minor_segments=6,location=(5,0,z))
    keep(bpy.context.object,'ember-pot-hoop',IRON)
for i in range(8):
    a=2*math.pi*i/8; cyl('pot-vent',(5+.434*math.cos(a),.434*math.sin(a),.48),.035,.025,CHAR,8)
for i in range(3): ico('visible-coal',(5+(i-1)*.14,0,.94),(.12,.10,.07),EMBER,1)
for x in (4.72,5.28): beam('pot-leg',(x,0,.07),(x,0,.22),.07,IRON)

# Side-job pennant: doubled cloth area, frayed and patched at the mast.
beam('job-flag-pole',(7,0,0),(7,0,2.65),.075,IRON)
beam('job-flag-bracket',(7,0,2.4),(8.1,0,2.4),.045,OXIDE)
verts=[(8.08,-.012,2.39),(9.62,-.012,2.12),(8.86,-.012,1.20),(8.08,.012,2.39),(9.62,.012,2.12),(8.86,.012,1.20)]
mesh=bpy.data.meshes.new('side-job-flag-mesh'); mesh.from_pydata(verts,[],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
flag=bpy.data.objects.new('side-job-flag-weathered-cloth',mesh); scene.collection.objects.link(flag); keep(flag,'side-job-flag-weathered-cloth',CANVAS)
cube('flag-stitch-strip',(8.18,-.03,2.23),(.09,.025,.38),CREAM,.005)

# Caged amber lamps on welded brackets make the planned route props visible.
for i,x in enumerate((-3.8,3.8,6.2)):
    beam(f'yard-lamp-post-{i+1}',(x,0,0),(x,0,3.15),.09,IRON,.09)
    beam(f'yard-lamp-arm-{i+1}',(x,0,2.95),(x+.48,0,2.95),.07,OXIDE,.07)
    cyl(f'yard-lamp-glass-{i+1}',(x+.48,-.025,2.78),.16,.28,LAMP,12)
    for angle in range(4):
        a=angle*math.pi/2
        beam(f'yard-lamp-guard-{i+1}',(x+.48+.20*math.cos(a),-.025+.20*math.sin(a),2.58),
             (x+.48+.20*math.cos(a),-.025+.20*math.sin(a),2.98),.025,IRON)
    beam(f'yard-lamp-top-hood-{i+1}',(x+.28,-.025,3.02),(x+.68,-.025,3.02),.045,IRON,.34)

# Review-only scale cue: the real Cinder crew model stands behind the props.
# It is visible in the Blender views but excluded from the kit export.
crew_model=ROOT/'public/assets/models/wasteland/crew/cinder.glb'
assert crew_model.exists(), f'missing scale-reference crew model: {crew_model}'
before_import=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(crew_model))
scale_objects=[o for o in scene.objects if o not in before_import]
scale_meshes=[o for o in scale_objects if o.type=='MESH']
corners=[o.matrix_world @ Vector(corner) for o in scale_meshes for corner in o.bound_box]
height=max(p.z for p in corners)-min(p.z for p in corners)
scale=1.72/max(.001,height)
for o in scale_objects:
    if o.parent is None:
        o.scale*=scale
        o.location.x+=1.1
        o.location.y+=1.9
        o.location.z-=min(p.z for p in corners)*scale

# Merge disconnected authored islands under named part objects for a tidy, inspectable GLB.
OUT.parent.mkdir(parents=True,exist_ok=True)
(ROOT/'art-build').mkdir(parents=True,exist_ok=True)
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active=root
scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=True
scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'
scene.world=bpy.data.worlds.new('overcast iron sky'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.23,.25,.27,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
for loc,power,size,color in [((2,-7,9),1700,7,(1,.82,.66)),((-7,3,5),900,6,(.63,.73,.83)),((7,5,7),1200,5,(1,.43,.19))]:
    bpy.ops.object.light_add(type='AREA',location=loc); lamp=bpy.context.object; lamp.data.energy=power; lamp.data.shape='DISK'; lamp.data.size=size; lamp.data.color=color
def render_views(folder):
    folder=Path(folder)
    if not folder.is_absolute(): folder=ROOT/folder
    folder.mkdir(parents=True,exist_ok=True)
    # Tight camera views of the prop families, against a neutral dusty floor.
    bpy.ops.mesh.primitive_plane_add(size=50,location=(0,0,-.03)); floor=bpy.context.object; floor.name='review-only ground'
    floor.data.materials.append(STONE); floor.hide_set(False)
    views=[('kit-overview',(1.8,-20,10),(1.8,.4,2.0),21),('kit-detail',(1.0,-13,7.2),(1.0,-.1,1.6),13),('kit-mast',(-2.35,-10,7.1),(-2.35,.8,2.6),10)]
    for name,loc,target,scale in views:
        bpy.ops.object.camera_add(location=loc); cam=bpy.context.object
        cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=scale; scene.camera=cam
        scene.render.resolution_x=1000; scene.render.resolution_y=700; scene.render.resolution_percentage=100
        scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(folder/f'{name}.png')
        bpy.ops.render.render(write_still=True); print('RENDERED',scene.render.filepath)

triangles=sum(len(p.vertices)-2 for o in objects if o.type=='MESH' for p in o.data.polygons)
print('SCABLANDS_KIT_TRIANGLES',triangles)
assert triangles <= TRIANGLE_BUDGET, f'triangle budget exceeded: {triangles}'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-build/scablands-kit.blend'))
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for o in objects: o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,
                          export_apply=False,export_cameras=False,export_lights=False)
assert OUT.stat().st_size <= FILE_BUDGET, f'file budget exceeded: {OUT.stat().st_size}'
print('SCABLANDS_KIT_GLB_BYTES',OUT.stat().st_size,OUT)
if args.render: render_views(args.render)
