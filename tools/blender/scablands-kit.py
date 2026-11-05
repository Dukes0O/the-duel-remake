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
parser.add_argument('--render', help='Render round-one inspection views into this evidence folder')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
ROOT = Path(args.root).resolve()
OUT = ROOT / '.qa-dist/WW-ART-KIT/kit.glb'
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
    b.inputs['Metallic'].default_value = metallic; b.inputs['Roughness'].default_value = rough
    if emission:
        b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emission
    noise = m.node_tree.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 5.0
    noise.inputs['Detail'].default_value = 3.0; noise.inputs['Roughness'].default_value = .8
    ramp = m.node_tree.nodes.new('ShaderNodeValToRGB')
    dark = tuple(c * .30 for c in color) + (1,); light = tuple(min(1, c * 1.35 + .025) for c in color) + (1,)
    ramp.color_ramp.elements[0].position = .24; ramp.color_ramp.elements[0].color = dark
    ramp.color_ramp.elements[1].position = .76; ramp.color_ramp.elements[1].color = light
    m.node_tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    m.node_tree.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    return m

RUST = mat('Scale rust over old mill steel', (.31,.105,.045), .72)
IRON = mat('Blackened forged iron', (.075,.083,.078), .82)
OXIDE = mat('Flaked oxide red', (.39,.12,.047), .48)
STONE = mat('Basalt dust and lichen', (.24,.235,.205), .05, .94)
PAINT = mat('Faded road paint', (.67,.49,.23), .25)
CREAM = mat('Old enamel lettering', (.79,.72,.54), .2)
CHAR = mat('Char and burned timber', (.045,.038,.033), .05, .96)
EMBER = mat('Low ember glow', (.95,.18,.018), .25,.5, .8)
CANVAS = mat('Smoke-stained signal cloth', (.56,.25,.09), .05,.96)

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

# Roadside basalt: fractured ledges and a scatter of sharp, squat blocks.
for i,(x,y,sx,sy,sz,rot) in enumerate([(-5,0,1.25,.8,.55,.2),(-4.1,.25,.75,.7,.42,-.3),
        (-5.5,.5,.62,.56,.75,.5),(-4.6,-.42,.55,.48,.32,.1)]):
    o=ico(f'basalt-rock-{i+1}',(x,y,sz*.46),(sx,sy,sz),STONE,2 if i==0 else 1); o.rotation_euler.z=rot
for i in range(4):
    x=-5.6+i*.55; beam(f'fractured-cliff-seam-{i+1}',(x,-.12,.12),(x+.22,.36,.18),.035,IRON)

# Bent, still-readable direction sign: galvanized post, old arrow plates and rivets.
sign_start=len(objects)
beam('sign-post',(0,0,0),(0,0,2.2),.09,IRON,.09)
beam('post-brace',(-.05,0,.28),(.03,0,1.72),.035,OXIDE)
cube('sign-upper-arrow',(.23,-.015,1.68),(.92,.075,.34),OXIDE,.018)
cube('sign-lower-arrow',(-.18,-.02,1.25),(.82,.075,.32),RUST,.018)
for z, direction, label in [(1.68,1,'ASH ROAD'),(1.25,-1,'WELL  6')]:
    tip=.23+direction*.50 if z>1.5 else -.18+direction*.45
    beam('arrow-head-'+str(z),(tip-direction*.16,-.06,z),(tip,-.06,z),.075,CREAM,.022)
    for xx in ((-.16,.52) if z>1.5 else (-.52,.16)):
        cyl('sign-face-rivet',(xx,-.064,z),.018,.018,IRON,8)
    # The letters stay as inspectable raised bars when no font file is available.
    for j in range(3): cube('worn-enamel-letter',( (-.12+j*.11 if z>1.5 else -.40+j*.11),-.067,z),(.055,.012,.13),CREAM,.004)
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

# Burnable barricade, intact and charred alternatives kept as named mesh assemblies.
def barricade(prefix, material, xoff):
    par=bpy.data.objects.new(prefix,None); scene.collection.objects.link(par); par.parent=root; objects.append(par)
    def part(o,n): o.name=n; o.parent=par; o.data.materials.append(material); objects.append(o)
    for i in range(5):
        y=-.66+i*.30
        bpy.ops.mesh.primitive_cube_add(size=1,location=(xoff,y,.52+(i%2)*.08)); o=bpy.context.object
        o.dimensions=(1.9,.24,.2); o.rotation_euler.y=(.035 if i%2 else -.025)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); part(o,prefix+'-salvage-slat')
    for x in (xoff-.72,xoff+.72):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(x,0,.62)); o=bpy.context.object
        o.dimensions=(.16,1.65,1.05); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); part(o,prefix+'-upright')
    for i in range(4):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=.035,location=(xoff-.55+i*.36,-.79,.57))
        part(bpy.context.object,prefix+'-weld-bead')
    return par
barricade('barricade-whole',RUST,0)
barricade('barricade-burnt',CHAR,2.45)
for i in range(4):
    beam('burnt-splinter',(1.8+i*.28,-.1,.3),(2.0+i*.3,-.12,.9+(i%2)*.25),.075,CHAR,.11)

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

# Side-job pennant: square timber, welded bracket, flapping triangular signal.
beam('job-flag-pole',(7,0,0),(7,0,2.65),.075,IRON)
beam('job-flag-bracket',(7,0,2.4),(7.7,0,2.4),.045,OXIDE)
verts=[(7.68,-.012,2.37),(8.45,-.012,2.24),(8.08,-.012,1.78),(7.68,.012,2.37),(8.45,.012,2.24),(8.08,.012,1.78)]
mesh=bpy.data.meshes.new('side-job-flag-mesh'); mesh.from_pydata(verts,[],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
flag=bpy.data.objects.new('side-job-flag-weathered-cloth',mesh); scene.collection.objects.link(flag); keep(flag,'side-job-flag-weathered-cloth',CANVAS)
cube('flag-stitch-strip',(7.72,-.03,2.25),(.07,.025,.32),CREAM,.005)

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
    views=[('kit-overview',(1.3,-15,9),(1.3,0,2.25),17),('kit-detail',(-1.4,-10,7.2),(-1.4,0,2.2),10),('kit-mast',(-2.35,-9,7.1),(-2.35,0,2.7),8)]
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
bpy.ops.object.select_all(action='SELECT'); bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,
                          export_apply=False,export_cameras=False,export_lights=False)
assert OUT.stat().st_size <= FILE_BUDGET, f'file budget exceeded: {OUT.stat().st_size}'
print('SCABLANDS_KIT_GLB_BYTES',OUT.stat().st_size,OUT)
if args.render: render_views(args.render)
