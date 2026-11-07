"""Build the stranded ships and lighthouse, then review the exported GLB."""
import argparse
import math
import json
import sys
from pathlib import Path

# Patience funnel dimensions and pixel landmarks, read from
# .evidence/grid-funnel-{side,front,top}.png (generated source dimensions vary).
# Side (467x800): body ends x=62/430, ground y=780; 368 px = 3.5 m; top y=20.
# Front (667x800): centre x=333, ground y=780, top y=12; 768 px = 6 m.
# Top (800x571): front/rear x=30/773, centre y=286; width spans y=38..533.
# Patience upperworks dimensions and pixel landmarks, read from
# .qa-dist/grid-{side,front,rear,top}.png (each source crop is 768 x 512 px).
# Side: aft/front ends x=40/720, deck y=460. Front: centre x=384, deck y=460,
# roof y=140. Rear: centre x=384, deck y=476, roof y=130. Plan: bow/stern x=638/100, centre y=245;
# bridge-wing span y=54..436. Window and door boxes below are pixel rectangles
# read from those same grids, not estimated from the rendered mesh.
# Patience hull measurements from .qa-dist/grid-hull-{side,bow,stern,top}.png.
# Side: hull ends x=11/1011; midships deck y=45, keel y=155 (110 px = 8 m).
# Bow: 12 m beam spans x=10..645; centre=328; deck/keel y=20/431 (411 px = 8 m).
# Stern: 12 m beam spans x=70..680; centre=384; deck/keel y=41/450 (409 px = 8 m).
# Top: bow/stern y=0/1024; centre x=179; beam spans x=90..260 (170 px = 12 m).
HULL_LENGTH = 72.0
HULL_WIDTH = 12.0
HULL_HEIGHT = 8.0
HULL_SIDE = {'start': 11, 'end': 1011, 'ground': 155}
HULL_BOW = {'centre': 328, 'ground': 431, 'top': 20}
HULL_STERN = {'centre': 384, 'ground': 450, 'top': 41}
HULL_TOP = {'front': 0, 'rear': 1024, 'centre': 179, 'x_scale': 12.0 / 170}
UPPER_SCALE = .0244
UPPER_LENGTH = (720 - 40) * UPPER_SCALE
UPPER_DECK_WIDTH = (600 - 190) * UPPER_SCALE
UPPER_WING_WIDTH = (683 - 108) * UPPER_SCALE
UPPER_HEIGHT = (460 - 140) * UPPER_SCALE
UPPER_SIDE_START, UPPER_SIDE_END, UPPER_SIDE_GROUND = 720, 40, 460
UPPER_FRONT = {'centre': 384, 'ground': 460, 'top': 140, 'top_height': UPPER_HEIGHT}
UPPER_REAR = {'centre': 384, 'ground': 476, 'top': 130, 'top_height': UPPER_HEIGHT}
UPPER_TOP = {'front': 145, 'rear': 675, 'centre': 245, 'along': 'x',
             'x_scale': UPPER_WING_WIDTH / (436 - 54)}
UPPER_SIDE_SCALE = UPPER_LENGTH / (UPPER_SIDE_START - UPPER_SIDE_END)
UPPER_SIDE_WINDOWS = (
    (230, 268, 248, 300), (279, 265, 300, 300), (411, 258, 439, 300),
    (475, 255, 499, 292), (501, 255, 530, 293),
)
UPPER_SIDE_PORTHOLES = tuple((x - 9, 370, x + 9, 390)
                             for x in (197, 352, 434, 508, 553, 594, 672))
UPPER_SIDE_DOORS = ((500, 365, 531, 457), (310, 365, 338, 457))
UPPER_FRONT_BRIDGE_WINDOWS = tuple((x0, 164, x1, 202) for x0, x1 in (
    (202, 244), (246, 286), (288, 330), (332, 374), (376, 418),
    (420, 462), (464, 506), (508, 550), (552, 600),
))
UPPER_FRONT_WINDOWS = ((245, 245, 288, 270), (327, 245, 353, 271),
                       (511, 245, 557, 272))
UPPER_FRONT_PORTHOLES = tuple((x - 9, 369, x + 9, 389)
                              for x in (255, 327, 435, 533))
UPPER_FRONT_DOORS = ((363, 363, 399, 457),)
UPPER_REAR_PORTHOLES = tuple((x - 9, 370, x + 9, 390)
                             for x in (246, 302, 468, 518))
UPPER_REAR_DOORS = ((274, 370, 314, 458), (452, 370, 492, 458))

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--stage', choices=('patience', 'family'), default='patience')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--compose-sheet', action='store_true')
parser.add_argument('--render-view', choices=('whole', 'bow', 'dusk', 'above', 'comparison', 'deck', 'funnel'), default=None)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/scablands/ships.glb'
sheet = root / f'docs/board/looks/ww-art-ships/round-{args.round}.jpg'
raw = root / f'.qa-dist/ships-round-{args.round}'
tex = root / 'public/assets/models/wasteland/scablands/textures'
inputs = {
    'rusted-steel': tex / 'dam-rust.jpg',
    'galvanised-tin': tex / 'dam-steel.jpg',
    'weathered-plank': tex / 'dam-gatehouse-stone.jpg',
}
photos = {name: tex / f'{name}.jpg' for name in ('ships-hull-photo', 'lighthouse-stone-photo', 'pilot-boat-photo')}
ship_photo_full=tex/'ships-hull-photo.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(root / 'art-build/wasteland-ships/ships.blend')],
                      'glb': [str(out)], 'evidence': [str(raw)], 'summary': [str(sheet)]}))
    raise SystemExit(0)
if args.compose_sheet:
    from PIL import Image, ImageOps
    names = ('whole', 'bow', 'dusk', 'above', 'deck', 'funnel')
    images = {name: Image.open(raw / f'{name}.jpg').convert('RGB') for name in names}
    canvas = Image.new('RGB', (1600, 1800))
    layout = {'whole': (0, 0, 800, 600), 'bow': (800, 0, 800, 600),
              'dusk': (0, 600, 800, 600), 'above': (800, 600, 800, 600),
              'deck': (0, 1200, 800, 600), 'funnel': (800, 1200, 800, 600)}
    for name, (x, y, w, h) in layout.items():
        canvas.paste(ImageOps.fit(images[name], (w, h), Image.Resampling.LANCZOS), (x, y))
    canvas.save(sheet, 'JPEG', quality=83, optimize=True, progressive=True)
    print(f'Sheet: {sheet} ({sheet.stat().st_size} bytes; {canvas.width} x {canvas.height})')
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector, Matrix
if args.render_view:
    review_scene = root / f'.qa-dist/ships-round-{args.round}/review.blend'
    bpy.ops.wm.open_mainfile(filepath=str(review_scene))
    scene = bpy.context.scene
    scene.camera = bpy.data.objects[f'review-camera-{args.render_view}']
    reference_plane = bpy.data.objects['review-only side photograph']
    reference_plane.hide_render = args.render_view != 'comparison'
    if args.render_view == 'above':
        scene.camera.data.type = 'PERSP'
    if args.render_view == 'comparison':
        for obj in scene.objects:
            if obj.type == 'MESH':
                obj.hide_render = (obj != reference_plane and
                                   'ship-patience:upperworks' not in obj.name)
    if args.render_view == 'dusk':
        world = scene.world.node_tree.nodes.get('Background')
        world.inputs[0].default_value = (.025, .035, .06, 1)
        world.inputs[1].default_value = .40
        bpy.data.objects['review-softbox'].data.energy = 85000
        bpy.data.objects['review-fill'].data.energy = 60000
    scene.render.filepath = str(root / f'.qa-dist/ships-round-{args.round}/{args.render_view}.jpg')
    bpy.ops.render.render(write_still=True)
    print(f'Rendered {args.render_view}: {scene.render.filepath}')
    raise SystemExit(0)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town
from photo_carve import carve_object
from photo_model import Photo as DetailPhoto, Mesh as DetailMesh, trace, slab, lathe

missing = [str(p) for p in [*photos.values(), ship_photo_full,
                           tex / 'patience-hull-side.jpg', tex / 'patience-hull-bow.jpg',
                           tex / 'patience-hull-stern.jpg', tex / 'patience-hull-top.jpg'] if not p.is_file()]
if missing:
    raise FileNotFoundError('Ship source photographs are missing: ' + ', '.join(missing))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
# Isolated detail crops come from the measured side photograph, not painted panels.
mast_crop_path = tex / 'patience-bridge-mast-side.png'
source_image = bpy.data.images.load(str((tex / 'patience-upperworks-side.jpg').resolve()))
source_pixels = np.empty(source_image.size[0] * source_image.size[1] * 4, dtype=np.float32)
source_image.pixels.foreach_get(source_pixels)
source_pixels = source_pixels.reshape(source_image.size[1], source_image.size[0], 4)
def save_photo_crop(path, box):
    x0, y0, x1, y1 = box
    cut = source_pixels[source_image.size[1] - y1:source_image.size[1] - y0, x0:x1]
    image = bpy.data.images.new(path.stem, x1 - x0, y1 - y0, alpha=True)
    image.pixels.foreach_set(cut.ravel())
    image.filepath_raw = str(path)
    image.file_format = 'PNG'
    image.save()
    bpy.data.images.remove(image)
save_photo_crop(mast_crop_path, (405, 8, 490, 145))
bpy.data.images.remove(source_image)
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1000
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 90
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.world = bpy.data.worlds.new('Ship photo review overcast')
scene.world.color = (.32, .32, .32)

materials = town.make_materials(inputs)
for key in ('rusted-steel', 'galvanised-tin'):
    materials[key].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .28
    materials[key].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .88
materials['iron-dark'].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = .20

def photo_material(name, path, metallic=0, roughness=.9, emission=False):
    image = bpy.data.images.load(str(path.resolve()), check_existing=False)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    texnode = nodes.new('ShaderNodeTexImage')
    texnode.image = image
    texnode.interpolation = 'Linear'
    mat.node_tree.links.new(texnode.outputs['Color'], shader.inputs['Base Color'])
    if emission:
        shader.inputs['Emission Color'].default_value = (.95, .57, .16, 1)
        shader.inputs['Emission Strength'].default_value = 2.5
    mat.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    return mat

hull_photo = photo_material('Ship hull / projected freighter photograph', photos['ships-hull-photo'])
stone_photo = photo_material('Lighthouse / projected local stonework', photos['lighthouse-stone-photo'])
pilot_photo = photo_material('Pilot boat / projected workboat photograph', photos['pilot-boat-photo'])
rust = materials['rusted-steel']
steel = materials['galvanised-tin']
iron = materials['iron-dark']
wood = materials['weathered-plank']
paint = materials['faded-hand-paint']
glass = materials['dirty-glass']
sand = materials['sand']
def matte_material(name,color,roughness=.88):
    mat=bpy.data.materials.new(name); mat.diffuse_color=(*color,1); mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1); bsdf.inputs['Metallic'].default_value=0; bsdf.inputs['Roughness'].default_value=roughness
    return mat
name_paint=matte_material('Ship name / faded chalk paint',(.70,.66,.55))
boat_paint=matte_material('Pilot boat / maintained warm cream enamel',(.68,.66,.59))
lamp = bpy.data.materials.new('Lighthouse / lit Fresnel lantern')
lamp.use_nodes = True
lamp_nodes=lamp.node_tree.nodes; lamp_nodes.clear()
lamp_out=lamp_nodes.new('ShaderNodeOutputMaterial'); lamp_emission=lamp_nodes.new('ShaderNodeEmission')
lamp_emission.inputs['Color'].default_value=(1.0,.48,.12,1); lamp_emission.inputs['Strength'].default_value=5
lamp.node_tree.links.new(lamp_emission.outputs[0],lamp_out.inputs['Surface'])

def gv(point):
    return town.game_vector(point)

def attach(obj, name, part):
    obj.name = name
    obj['part'] = part
    return obj

def root_obj(name, location, part):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = gv(location)
    obj['part'] = part
    return obj

def parent(obj, root_obj_):
    obj.parent = root_obj_
    obj.matrix_parent_inverse = Matrix.Identity(4)
    return obj

def cube(name, center, dims, material, part, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=gv(center))
    o=bpy.context.object; o.dimensions=(dims[0],dims[2],dims[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
    uv.name='UVMap'
    for polygon in o.data.polygons:
        normal=polygon.normal
        for loop_index in polygon.loop_indices:
            vertex=o.data.vertices[o.data.loops[loop_index].vertex_index].co
            if abs(normal.x)>=abs(normal.y) and abs(normal.x)>=abs(normal.z):
                u,v=vertex.y,vertex.z
            elif abs(normal.y)>=abs(normal.z):
                u,v=vertex.x,vertex.z
            else:
                u,v=vertex.x,vertex.y
            uv.data[loop_index].uv=(u/2,v/2)
    if bevel:
        mod=o.modifiers.new('rolled plate edges','BEVEL'); mod.width=bevel; mod.segments=2
        o.modifiers.new('weighted worn normals','WEIGHTED_NORMAL')
    return attach(o,name,part)

def beam(name,a,b,width,material,part,depth=None):
    va,vb=gv(a),gv(b); d=vb-va
    bpy.ops.mesh.primitive_cube_add(size=1,location=(va+vb)*.5)
    o=bpy.context.object; o.dimensions=(width,depth or width,d.length)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(material)
    return attach(o,name,part)

def cylinder(name,center,radius,depth,material,part,vertices=24,axis='Y'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=gv(center))
    o=bpy.context.object
    if axis=='X': o.rotation_euler[1]=math.pi/2
    o.data.materials.append(material)
    return attach(o,name,part)

def rail(name,a,b,radius,material,part):
    va,vb=gv(a),gv(b); d=vb-va
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=d.length,location=(va+vb)*.5)
    o=bpy.context.object; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); o.data.materials.append(material)
    return attach(o,name,part)

def torus_local(name, center, major, minor, material, part, axis='Y', major_segments=24, minor_segments=8):
    o=torus(name,center,major,minor,material,part,axis,major_segments,minor_segments)
    return o

def torus(name,center,major,minor,material,part,axis='Y',major_segments=24,minor_segments=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=major_segments,minor_segments=minor_segments,location=gv(center))
    o=bpy.context.object
    if axis=='X': o.rotation_euler[1]=math.pi/2
    o.data.materials.append(material)
    return attach(o,name,part)

def photo_hull(name, root, dimensions, material, side_label, hull_color=None):
    length,width,deck,keel=dimensions
    # Closed ship section: full submerged keel for the later floating scene.
    # A narrow counter and sharp, flared bow grow into a full-length bilge.
    # The dense stations keep the long photographed plate following the hull,
    # instead of reading as a flat strip laid over a simple block.
    stations=[(-.50,.22),(-.485,.42),(-.46,.62),(-.43,.78),(-.39,.89),(-.34,.95),
              (-.28,.98),(-.20,1.0),(-.10,1.0),(0,.995),(.12,.99),(.23,.97),
              (.32,.94),(.39,.90),(.44,.84),(.475,.62),(.49,.34),(.50,.06)]
    rings=[]
    for t,breadth in stations:
        x=t*length
        top=deck + max(0,t)**4*4.0 - max(0,-t)**4*1.0
        # Crown the deck, flare the sheer at the bow, then roll the bilge in
        # through four real chine bands to the keel.
        flare=1.0 + max(0,t)*.22
        stem=max(0,(t-.34)/.16)
        offsets=[0,0,.12,.36,.78,1.42,2.25,1.42,.78,.36,.12]
        xs=[x-offset*stem for offset in offsets]
        ring=[(xs[0],top,-width*breadth*.47*flare),(xs[1],top,width*breadth*.47*flare),
              (xs[2],deck-1.0,width*breadth*.45*flare),(xs[3],deck-2.4,width*breadth*.40),
              (xs[4],deck-4.2,width*breadth*.31),(xs[5],deck-6.0,width*breadth*.19),
              (xs[6],keel,0),(xs[7],deck-6.0,-width*breadth*.19),(xs[8],deck-4.2,-width*breadth*.31),
              (xs[9],deck-2.4,-width*breadth*.40),(xs[10],deck-1.0,-width*breadth*.45*flare)]
        rings.append(ring)
    section_size=11
    verts=[gv(v) for ring in rings for v in ring]
    faces=[]; material_ids=[]
    for i in range(len(rings)-1):
        for j in range(section_size):
            faces.append((i*section_size+j,i*section_size+(j+1)%section_size,
                          (i+1)*section_size+(j+1)%section_size,(i+1)*section_size+j))
            photo_side=j in range(1,11)
            material_ids.append(1 if photo_side else (0 if j==0 else 2))
    faces.extend([tuple(range(section_size-1,-1,-1)),
                  tuple((len(rings)-1)*section_size+j for j in range(section_size))]); material_ids.extend((2,2))
    mesh=bpy.data.meshes.new(name+' welded hull'); mesh.from_pydata(verts,[],faces)
    mesh.materials.append(steel); mesh.materials.append(material); mesh.materials.append(rust); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj['part']=root.name
    uv=mesh.uv_layers.new(name='Photo projection UV')
    for poly,mi in zip(mesh.polygons,material_ids):
        poly.material_index=mi
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index
            station=vi//section_size; section=vi%section_size
            co=rings[station][section]
            # One camera-like side projection shared by both long plates.
            u=.03 + ((co[0]/length)+.5)*.90
            # This source image is a hull-only crop with its deck edge at the top.
            # The white bridge, deck fittings and rigging are real geometry above it.
            v=.11 + min(1,max(0,(co[1]-keel)/(deck-keel)))*.69
            uv.data[li].uv=(u,v)
    parent(obj,root)
    # Deck is a real thick deck plate at the map's 5 m walkway datum.
    deck_mesh=cube(name+'-weather-deck',(0,deck-.10,0),(length*.96,.36,width*.94),rust,root.name,.12)
    parent(deck_mesh,root)
    # The projection carries repair patches and seam wear; avoid floating
    # overlays that hide the hull's curve.
    # Text on the bow, in large, readable weathered paint.
    if side_label:
        label=bpy.data.curves.new(name+' painted bow name','FONT'); label.body=side_label; label.size=1.5; label.resolution_u=3; label.bevel_resolution=1; label.extrude=.008; label.bevel_depth=.004
        for side in (-1,1):
            obj=bpy.data.objects.new(name+' bow name '+str(side),label); scene.collection.objects.link(obj)
            obj.location=gv((length*.37,deck-2.05,side*(width*.448)))
            obj.rotation_euler=(math.pi/2 if side>0 else -math.pi/2,0,0)
            label.materials.clear(); label.materials.append(name_paint)
            obj['part']=root.name; parent(obj,root)
    if root.name == 'ship-patience':
        return
    # A single heavy working deck at the story datum, with a raised foredeck.
    # The source's upperworks are built as a chart room and mast, not repeated
    # floating slabs that make the hull read like a model ship.
    forecastle=cube(name+'-raised-forecastle',(length*.31,deck+.55,0),(length*.28,.34,width*.62),steel,root.name,.09)
    parent(forecastle,root)
    for side in (-1,1):
        rail(name+'-main-deck-rail',(-length*.40,deck+.92,side*width*.34),(length*.25,deck+.92,side*width*.34),.055,iron,root.name)
        for i in range(8):
            x=-length*.39+i*length*.08
            post=beam(f'{name}-rail-stanchion-{side}-{i}',(x,deck,side*width*.34),(x,deck+.92,side*width*.34),.07,steel,root.name)
            parent(post,root)
    for side in (-1,1):
        for low,high,x in ((-1.8,deck,-length*.13),):
            z=side*width*.29
            for dx in (-.35,.35): beam(f'{name}-ladder-rail-{side}-{low}-{dx}',(x+dx,low,z),(x+dx,high,z),.065,steel,root.name)
            for k in range(1,round((high-low)/.34)):
                y=low+k*.34; beam(f'{name}-ladder-rung-{side}-{low}-{k}',(x-.35,y,z),(x+.35,y,z),.055,iron,root.name)
    # This simple box remains for the other two ships. Patience now owns the
    # one photo-carved superstructure added below.
    if root.name != 'ship-patience':
        chart_x=-22
        cabin=cube(name+'-chart-room',(chart_x,deck+3.8,0),(8,4.1,5.4),steel,root.name,.20); parent(cabin,root)
        roof=cube(name+'-chart-room-roof',(chart_x,deck+6.0,0),(9,.28,6.1),rust,root.name,.10); parent(roof,root)
        for side in (-1,1):
            for i in range(5):
                win=cube(f'{name}-chart-window-{side}-{i}',(chart_x-3.1+i*1.55,deck+4.0,side*2.72),(1.05,1.0,.08),glass,root.name,.05); parent(win,root)
        door=cube(name+'-chart-door',(chart_x+4.05,deck+3.55,-1.1),(.10,2.4,1.0),iron,root.name,.05); parent(door,root)
    return

ships=[
    ('ship-good-hope',(-45,-415),'GOOD HOPE',72,16.5,5.0,-12.2,0.12),
    ('ship-marigold',(45,-440),'MARIGOLD',67,16.0,5.0,-12.0,-0.09),
    ('ship-patience',(5,-470),'PATIENCE',HULL_LENGTH,HULL_WIDTH,4.0,-4.0,0.07),
]
if args.stage == 'patience':
    ships=[ship for ship in ships if ship[0]=='ship-patience']
roots={}
for ident,loc,label,length,width,deck,keel,lean in ships:
    root_y = 0 if ident == 'ship-patience' else 6
    r=root_obj(ident,(loc[0]+22,root_y,loc[1]),ident); roots[ident]=r
    if ident == 'ship-patience':
        hull_table = {
            'photos': {'side':'patience-hull-side.jpg','front':'patience-hull-bow.jpg',
                       'rear':'patience-hull-stern.jpg','top':'patience-hull-top.jpg'},
            'length':HULL_LENGTH, 'width':HULL_WIDTH, 'height':HULL_HEIGHT,
            'forward':1, 'side_front_on_left':True,
            'side':HULL_SIDE, 'front':HULL_BOW, 'rear':HULL_STERN, 'top':HULL_TOP,
            'ends_split':0, 'front_favour':3, 'rear_favour':3, 'round':2.4,
            'grey':30, 'tolerance':42, 'bleed_tolerance':32,
            'voxel':.20, 'target':1500,
            'mask_dir':str(raw / 'masks'),
        }
        patience_hull = carve_object('ship-patience:hull', tex, hull_table)
        # photo_carve returns beam and length in the horizontal plane, with
        # length along local Y. Turn that axis to the ship's +X direction.
        patience_hull.data.transform(Matrix(((0,1,0),(-1,0,0),(0,0,1))).to_4x4())
        patience_hull.location = gv((0,-4,0))
        parent(patience_hull,r)
        hull_deck = cube('ship-patience:weather-deck',(0,3.88,0),(70,.24,10.8),rust,'ship-patience',.04)
        parent(hull_deck,r)
        # The high-side letters sit on the bow plating and face out on both sides.
        for side in (-1,1):
            label_curve=bpy.data.curves.new(f'Patience bow name {side}','FONT')
            label_curve.body='PATIENCE'; label_curve.size=1.65; label_curve.resolution_u=3
            label_curve.bevel_resolution=1; label_curve.extrude=.006
            name_obj=bpy.data.objects.new(f'Patience bow name {side}',label_curve)
            scene.collection.objects.link(name_obj)
            name_obj.location=gv((18.5,1.8,side*6.2))
            name_obj.rotation_euler=(math.pi/2,0,0) if side>0 else (math.pi/2,0,math.pi)
            label_curve.materials.append(name_paint); name_obj['part']='ship-patience'
            parent(name_obj,r)
    else:
        photo_hull(ident+' hull',r,(length,width,deck,keel),hull_photo,label)
    if ident=='ship-patience':
        # Dot's Diner pattern: one measured carve table, followed by a named
        # root and one fitted body. The bridge front points bowward (+X); its
        # aft edge is local x=-37, so the block centre is local x=-25.5.
        side_scale = UPPER_SCALE
        front_scale = UPPER_FRONT['top_height'] / (UPPER_FRONT['ground'] - UPPER_FRONT['top'])
        rear_scale = UPPER_REAR['top_height'] / (UPPER_REAR['ground'] - UPPER_REAR['top'])

        def side_boxes(rectangles):
            boxes = []
            for px0, py0, px1, py1 in rectangles:
                z0 = (UPPER_SIDE_START - px1) * side_scale - UPPER_LENGTH / 2
                z1 = (UPPER_SIDE_START - px0) * side_scale - UPPER_LENGTH / 2
                y0 = (UPPER_SIDE_GROUND - py1) * side_scale
                y1 = (UPPER_SIDE_GROUND - py0) * side_scale
                boxes.append((z0, z1, y0, y1))
            return boxes

        side_recesses = side_boxes((*UPPER_SIDE_WINDOWS, *UPPER_SIDE_PORTHOLES, *UPPER_SIDE_DOORS))
        front_recesses = []
        for px0, py0, px1, py1 in (*UPPER_FRONT_BRIDGE_WINDOWS, *UPPER_FRONT_WINDOWS,
                                   *UPPER_FRONT_PORTHOLES, *UPPER_FRONT_DOORS):
            front_recesses.append(((UPPER_FRONT['centre'] - px1) * front_scale,
                                   (UPPER_FRONT['centre'] - px0) * front_scale,
                                   (UPPER_FRONT['ground'] - py1) * front_scale,
                                   (UPPER_FRONT['ground'] - py0) * front_scale))
        rear_recesses = []
        for px0, py0, px1, py1 in (*UPPER_REAR_PORTHOLES, *UPPER_REAR_DOORS):
            rear_recesses.append(((px0 - UPPER_REAR['centre']) * rear_scale,
                                  (px1 - UPPER_REAR['centre']) * rear_scale,
                                  (UPPER_REAR['ground'] - py1) * rear_scale,
                                  (UPPER_REAR['ground'] - py0) * rear_scale))

        def keep_upperworks(x, y, z):
            # Window, porthole and door pockets stop 0.30 m inside each face.
            remove = np.zeros_like(y, dtype=bool)
            for z0, z1, y0, y1 in side_recesses:
                remove |= ((np.abs(x) >= UPPER_WING_WIDTH / 2 - .30) &
                           (z >= z0) & (z <= z1) & (y >= y0) & (y <= y1))
            for x0, x1, y0, y1 in front_recesses:
                remove |= ((z <= -UPPER_LENGTH / 2 + .30) & (x >= x0) & (x <= x1) &
                           (y >= y0) & (y <= y1))
            for x0, x1, y0, y1 in rear_recesses:
                remove |= ((z >= UPPER_LENGTH / 2 - .30) & (x >= x0) & (x <= x1) &
                           (y >= y0) & (y <= y1))
            return (y <= UPPER_HEIGHT) & ~remove

        # The front photo encloses pale background under both projecting wings.
        upper_table = {
            'photos': {'side': 'patience-upperworks-side.jpg',
                       'front': 'patience-upperworks-front.jpg',
                       'rear': 'patience-upperworks-rear.jpg',
                       'top': 'patience-upperworks-top.jpg'},
            'length': UPPER_LENGTH, 'width': UPPER_WING_WIDTH, 'height': UPPER_HEIGHT,
            'side_front_on_left': False,
            'side': {'start': UPPER_SIDE_START, 'end': UPPER_SIDE_END,
                     'ground': UPPER_SIDE_GROUND},
            'front': UPPER_FRONT, 'rear': UPPER_REAR, 'top': UPPER_TOP,
            'cut': {'front': [(108, 228, 157, 302), (611, 228, 661, 302)]},
            'keep': keep_upperworks,
            'grey': 26, 'tolerance': 34, 'bleed_tolerance': 24,
            'voxel': .10, 'target': 6500,
            'mask_dir': str(raw / 'masks'),
        }
        upperworks = carve_object('ship-patience:upperworks', tex, upper_table)
        # The projecting wings have no front-photo wrap on their sides or
        # undersides. Use the cabin side image on the long side faces and
        # painted steel below, so no foreground crop stretches into streaks.
        cabin_side_material = upper_table['_photos']['side'].material()
        side_photo_slot = len(upperworks.data.materials)
        upperworks.data.materials.append(cabin_side_material)
        steel_underwing_slot = len(upperworks.data.materials)
        upperworks.data.materials.append(steel)
        for polygon in upperworks.data.polygons:
            if abs(polygon.normal.x) > .85:
                polygon.material_index = side_photo_slot
            elif polygon.normal.z < -.85:
                polygon.material_index = steel_underwing_slot
        # The accommodation roof is exposed weather deck: one rust coat, while
        # the raised hatch and antenna forms stay as separate photo-carved geometry.
        roof_slot = len(upperworks.data.materials)
        upperworks.data.materials.append(rust)
        for polygon in upperworks.data.polygons:
            if polygon.normal.z > .9 and polygon.center.z >= UPPER_HEIGHT - .15:
                polygon.material_index = roof_slot
        # Darken the studio paint in material, then lay broken rust runoff over
        # the photo. The multiplier follows the yard's worn-steel treatment;
        # elongated noise and a restrained oxide tint follow the tanker streaks.
        for photo in upper_table['_photos'].values():
            photo_material = photo.material()
            nodes, links = photo_material.node_tree.nodes, photo_material.node_tree.links
            bsdf = nodes.get('Principled BSDF')
            texture = next(node for node in nodes if node.type == 'TEX_IMAGE')
            output = nodes.get('Material Output')
            darken = nodes.new('ShaderNodeMixRGB')
            darken.name = 'Worn cabin paint multiply'
            darken.blend_type = 'MULTIPLY'
            darken.inputs['Fac'].default_value = 1.0
            darken.inputs[2].default_value = (.62, .60, .56, 1)
            links.new(texture.outputs['Color'], darken.inputs[1])
            texcoord = nodes.new('ShaderNodeTexCoord')
            stretched = nodes.new('ShaderNodeVectorMath')
            stretched.operation = 'MULTIPLY'
            stretched.inputs[1].default_value = (16, 2, 4)
            links.new(texcoord.outputs['Generated'], stretched.inputs[0])
            noise = nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 3.0
            noise.inputs['Detail'].default_value = 2.0
            links.new(stretched.outputs['Vector'], noise.inputs['Vector'])
            ramp = nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.elements[0].position = .60
            ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
            ramp.color_ramp.elements[1].position = .74
            ramp.color_ramp.elements[1].color = (.19, .12, .075, 1)
            links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
            rust_layer = nodes.new('ShaderNodeMixRGB')
            rust_layer.name = 'Tanker-style broken rust runoff'
            rust_layer.blend_type = 'ADD'
            rust_layer.inputs['Fac'].default_value = .42
            links.new(darken.outputs['Color'], rust_layer.inputs[1])
            links.new(ramp.outputs['Color'], rust_layer.inputs[2])
            links.new(rust_layer.outputs['Color'], bsdf.inputs['Base Color'])
        upper_bounds = tuple(float(v) for v in upperworks.dimensions)
        upper_root = bpy.data.objects.new('ship-patience:upperworks-root', None)
        scene.collection.objects.link(upper_root)
        upper_root['part'] = 'ship-patience:upperworks'
        upper_root.parent = r
        upper_root.location = gv((-37 + UPPER_LENGTH / 2, deck, 0))
        upper_root.rotation_euler[2] = math.pi / 2
        parent(upperworks, upper_root)
        print('Patience upperworks carved bounds (Blender XYZ):', json.dumps(upper_bounds))

        # The measured oval funnel stands where the old photographed box stood.
        funnel_x = -37 + ((125 + 60) - 40) * UPPER_SCALE
        roof_y = deck + UPPER_HEIGHT
        funnel_table = {
            'photos': {'side': 'patience-funnel-side.jpg',
                       'front': 'patience-funnel-front.jpg',
                       'rear': 'patience-funnel-front.jpg',
                       'top': 'patience-funnel-top.jpg'},
            'length': 3.5, 'width': 2.5, 'height': 6.0,
            'side_front_on_left': True,
            'side': {'start': 62, 'end': 430, 'ground': 780},
            'front': {'centre': 333, 'ground': 780, 'top': 12, 'top_height': 6.0},
            'rear': {'centre': 333, 'ground': 780, 'top': 12, 'top_height': 6.0},
            'top': {'front': 30, 'rear': 773, 'centre': 286, 'along': 'x',
                    'x_scale': 2.5 / (533 - 38)},
            'round': 2.8, 'grey': 28, 'tolerance': 36, 'bleed_tolerance': 24,
            'voxel': .12, 'target': 4500,
            'mask_dir': str(raw / 'masks'),
        }
        patience_funnel = carve_object('ship-patience:funnel', tex, funnel_table)
        patience_funnel.data.transform(Matrix(((0,1,0),(-1,0,0),(0,0,1))).to_4x4())
        # The isolated side photo's silhouette is a little taller than the
        # specified six metres at the shared 3.5 m length scale.
        patience_funnel.scale.z = .83
        patience_funnel.location = gv((funnel_x, roof_y, 0))
        parent(patience_funnel, r)

        # Trace the bridge mast as a thin slab; explicit clear cells preserve its openings.
        mast_photo = DetailPhoto(mast_crop_path)
        mast_mask = ~mast_photo.sky([(3, 3), (81, 3), (3, 132), (81, 132)], tolerance=34, grey=34)
        for x0, y0, x1, y1 in ((35, 31, 56, 43), (37, 57, 63, 70),
                                (41, 83, 67, 97), (44, 108, 70, 122)):
            mast_mask[y0:y1, x0:x1] = False
        mast_loops = trace(mast_mask, (0, 0, mast_photo.w, mast_photo.h), tolerance=1.5, min_area=12)
        mast_mesh = DetailMesh()
        mast_x0, mast_y0 = 405, 8
        def mast_point(px, py, depth):
            return (-37 + (mast_x0 + px - 40) * UPPER_SCALE,
                    deck + (UPPER_SIDE_GROUND - (mast_y0 + py)) * UPPER_SCALE, depth)
        slab(mast_mesh, 'mast-photo', mast_photo, mast_loops, mast_point,
             -.45, .45, wall_scale=UPPER_SCALE)
        mast_obj = mast_mesh.finish('ship-patience:bridge-mast-lattice',
                                    {'mast-photo': mast_photo.material()})
        mast_obj['part'] = 'ship-patience:bridge-mast'
        parent(mast_obj, r)
        # Long, thin working rails follow both sheer lines and close around the bow.
        for side in (-1,1):
            z=side*width*.45
            rail(f'patience-main-railing-top-{side}',(-35,6.1,z),(35,6.1,z),.045,rust,ident)
            rail(f'patience-main-railing-mid-{side}',(-35,5.63,z),(35,5.63,z),.032,rust,ident)
            for i in range(29):
                x=-35+i*2.5
                post=beam(f'patience-rail-stanchion-{side}-{i}',(x,5.05,z),(x,6.1,z),.045,rust,ident); parent(post,r)
            for i in range(8):
                x=31+i*.68; z2=side*(width*.38-i*.38)
                if z2*side<.25: break
                post=beam(f'patience-bow-rail-stanchion-{side}-{i}',(x,5.0,z2),(x,6.1,z2),.065,steel,ident); parent(post,r)
                rail(f'patience-bow-rail-top-{side}-{i}',(x,6.1,z2),(x+.75,6.1,z2-side*.38),.055,steel,ident)
        rail('patience-stern-rail-top',(-35,6.1,-width*.45),(-35,6.1,width*.45),.045,rust,ident)
        for i in range(5):
            z=-width*.45+i*width*.225
            post=beam(f'patience-stern-rail-post-{i}',(-35,5.05,z),(-35,6.1,z),.045,rust,ident); parent(post,r)
        # Raised forecastle, with short stairs and a hatch forward of the windlass.
        forecastle=cube('patience-raised-forecastle',(26,5.54,0),(15,.42,11.0),rust,ident,.11); parent(forecastle,r)
        for side in (-1,1):
            for step in range(9):
                stair=cube(f'patience-forecastle-step-{side}-{step}',(16.0+step*.43,5.12+step*.05,side*5.0),(.58,.13,2.2),rust,ident,.025); parent(stair,r)
        for i,x in enumerate((-3,7,17)):
            z=(-2.5,2.5,-2.5)[i]
            hatch=cube(f'patience-hatch-cover-{i}',(x,5.30,z),(6.4,.38,7.0),rust,ident,.12); parent(hatch,r)
            for side in (-1,1):
                coam=beam(f'patience-hatch-coaming-{i}-{side}',(x-3.25,5.28,z+side*3.7),(x+3.25,5.28,z+side*3.7),.18,rust,ident,.20); parent(coam,r)
                coam=beam(f'patience-hatch-coaming-end-{i}-{side}',(x+side*3.25,5.28,z-3.7),(x+side*3.25,5.28,z+3.7),.18,rust,ident,.20); parent(coam,r)
            for j in range(5):
                seam=beam(f'patience-hatch-seam-{i}-{j}',(x-2.7+j*1.35,5.50,z-3.2),(x-2.7+j*1.35,5.50,z+3.2),.035,rust,ident); parent(seam,r)
        # Winches, vents, and bollards are connected to the deck with visible feet.
        for i,(x,z) in enumerate(((-6,-5.7),(12,5.7),(30,0))):
            base=cube(f'patience-winch-bed-{i}',(x,5.29,z),(3.0,.42,1.8),rust,ident,.12); parent(base,r)
            drum=cylinder(f'patience-winch-drum-{i}',(x,6.05,z),.52,1.8,iron,ident,20,'X'); parent(drum,r)
            for side in (-1,1):
                cheek=cylinder(f'patience-winch-cheek-{i}-{side}',(x,6.05,z+side*.94),.82,.20,steel,ident,24,'X'); parent(cheek,r)
                foot=beam(f'patience-winch-foot-{i}-{side}',(x-.95,5.55,z+side*.65),(x+.95,5.55,z+side*.65),.18,rust,ident,.22); parent(foot,r)
        for i,(x,z) in enumerate(((-27,-5.3),(-17,5.4),(2,5.4),(21,-5.4))):
            riser=cylinder(f'patience-vent-riser-{i}',(x,5.85,z),.42,1.3,rust,ident,20); parent(riser,r)
            cowl=cylinder(f'patience-vent-cowl-{i}',(x,6.55,z),.67,.18,steel,ident,20); parent(cowl,r)
            hood=beam(f'patience-vent-hood-{i}',(x,6.78,z),(x+.62,6.78,z),.16,rust,ident,.55); parent(hood,r)
        for side in (-1,1):
            for x in (-31,-12,8,29):
                bollard=cylinder(f'patience-bollard-{side}-{x}',(x,5.48,side*5.25),.20,.60,rust,ident,20); parent(bollard,r)
                cap=cylinder(f'patience-bollard-cap-{side}-{x}',(x,5.80,side*5.25),.28,.08,iron,ident,20); parent(cap,r)
        # Two braced cargo derricks stand on their own feet, with cables and hooks.
        for i,(x,z,lean_side) in enumerate(((-4,-2.2,-1),(15,2.2,1))):
            base=cube(f'patience-derrick-pedestal-{i}',(x,5.36,z),(3.2,.45,2.6),rust,ident,.1); parent(base,r)
            apex=(x+lean_side*2.0,15.2,z)
            for side in (-1,1):
                leg=beam(f'patience-derrick-leg-{i}-{side}',(x,5.5,z+side*.95),apex,.19,steel,ident,.16); parent(leg,r)
                brace=beam(f'patience-derrick-crossbrace-{i}-{side}',(x-1.2,7.8,z+side*.8),(x+lean_side*1.2,11.2,z+side*.6),.12,rust,ident,.12); parent(brace,r)
            boom=beam(f'patience-derrick-boom-{i}',(x,7.0,z),(x+lean_side*4.8,14.0,z),.24,steel,ident,.23); parent(boom,r)
            cable=rail(f'patience-derrick-hoist-cable-{i}',(x+lean_side*4.8,14.0,z),(x+lean_side*4.8,8.8,z),.035,iron,ident); parent(cable,r)
            hook=torus_local(f'patience-derrick-hook-{i}',(x+lean_side*4.8,8.55,z),.22,.055,iron,ident,'X',16,6); parent(hook,r)
    # Each anchor leaves a real bow hawsepipe, hangs to the bed, then trails away.
    for side in (-1,1):
        cr=root_obj(f'{ident}:anchor-chain:{side}',(loc[0]+22,0,loc[1]),f'{ident}:anchor-chain')
        if ident=='ship-patience':
            pipe=torus(f'{ident}-hawsepipe-{side}',(length*.43,3.2,side*5.7),.48,.14,steel,f'{ident}:anchor-chain','X',20,8); parent(pipe,cr)
            for i in range(20):
                x=length*.43+i*.48
                y=2.8-min(4.8,i*.60) if i<9 else -2.0
                z=side*(width*.45+min(1.8,i*.11))
                link=torus(f'{ident}-anchor-link-{side}-{i}',(x,y,z),.22,.055,iron,f'{ident}:anchor-chain','Z' if i%2 else 'X',8,4); parent(link,cr)
            anchor=cylinder(f'{ident}-anchor-{side}',(length*.43+11,-2.1,side*(width*.44+2.7)),.42,.18,rust,f'{ident}:anchor-chain',12)
            parent(anchor,cr)
    if ident=='ship-patience':
        # A visible stern shaft, four-blade wheel and hanging rudder complete the hull.
        shaft_root=root_obj('ship-patience:propeller',(0,0,0),'ship-patience:propeller'); parent(shaft_root,r)
        shaft=cylinder('patience-stern-propeller-shaft',(-35,-4.15,0),.32,7.2,steel,'ship-patience:propeller',24,'X'); parent(shaft,shaft_root)
        hub=cylinder('patience-propeller-hub',(-39,-4.15,0),.67,.9,iron,'ship-patience:propeller',20,'X'); parent(hub,shaft_root)
        for blade in range(4):
            a=blade*math.pi/2+.2
            start=(-39.2,-4.15+math.sin(a)*.38,math.cos(a)*.38)
            end=(-39.2,-4.15+math.sin(a)*1.38,math.cos(a)*1.38)
            propblade=beam(f'patience-propeller-blade-{blade}',start,end,.72,steel,'ship-patience:propeller',.18); parent(propblade,shaft_root)
        rudder=cube('patience-stern-rudder',(-34.4,-3.45,0),(1.0,4.4,3.8),rust,'ship-patience:rudder',.28); parent(rudder,r)
        stock=cylinder('patience-rudder-stock',(-34.2,-3.4,0),.28,4.8,steel,'ship-patience:rudder',18); parent(stock,r)
    # Slightly different lean about each grounded centre line.
    r.rotation_euler[2]=lean
    if ident == 'ship-patience':
        r.rotation_euler[0]=math.radians(4)
    if ident=='ship-marigold':
        # The missing half of the rail exposes the old working deck.
        for side in (-1,1):
            for i in range(5):
                x=-length*.29+i*length*.08
                if side<0 and i>2: continue
                rail_obj=beam(f'marigold-surviving-rail-{side}-{i}',(x,deck+.92,side*width*.34),(x+.05,deck+1.15,side*width*.34),.07,steel,ident)
                parent(rail_obj,r)
        # Exposed, removable 18 m propeller shaft at her stern.
        shaft_root=root_obj('ship-marigold:shaft',(0,0,0),'ship-marigold:shaft'); parent(shaft_root,r)
        shaft=cylinder('marigold-removable-18m-shaft',(-length*.47,deck-3.9,0),.22,18,steel,'ship-marigold:shaft',20,'X'); parent(shaft,shaft_root)
        prop=torus('ship-marigold-propeller-ring',(-length*.47,deck-3.9,0),1.45,.12,rust,'ship-marigold:shaft','X'); parent(prop,shaft_root)
        for blade in range(4):
            a=blade*math.pi/2
            b=beam(f'marigold-propeller-blade-{blade}',(-length*.47,deck-3.9,0),(-length*.47+math.cos(a)*1.4,deck-3.9+math.sin(a)*1.4,0),.34,steel,'ship-marigold:shaft',.10); parent(b,shaft_root)

# Patience's mast, kingposts, platform and bell. With the ship root at +6 m,
# the main deck is y=11 and the platform is y=25.
pat=roots['ship-patience']; mastx=-15; mastz=6; platform_y=19
# The hand-built deck hardware remains at its former deck-relative heights.
# Move just those direct Patience parts down with the corrected deck line.
for obj in scene.objects:
    if (obj.parent == pat and obj.get('part') == 'ship-patience'
            and not obj.name.startswith(('Patience bow name', 'ship-patience:weather-deck'))):
        obj.location += gv((0,-1,0))
mast_root=root_obj('ship-patience:mast',(0,0,0),'ship-patience:mast'); parent(mast_root,pat)
mast_root.location = gv((0,-1,0))
bell_root=root_obj('ship-patience:bell',(0,0,0),'ship-patience:bell'); parent(bell_root,mast_root)
mast=cylinder('patience-mast-main-spar',(mastx,12.3,mastz),.38,14.6,steel,'ship-patience:mast',24); parent(mast,mast_root)
for dx in (-2.4,2.4):
    kingpost=beam(f'patience-mast-kingpost-{dx}',(mastx+dx,11.3,mastz),(mastx+dx,16.8,mastz),.18,steel,'ship-patience:mast',.16); parent(kingpost,mast_root)
for y in (11.5,16.6):
    cross=beam(f'patience-mast-kingpost-crossbar-{y}',(mastx-2.4,y,mastz),(mastx+2.4,y,mastz),.14,rust,'ship-patience:mast',.14); parent(cross,mast_root)
for side in (-1,1):
    start=(mastx+side*2.4,15.2,mastz)
    end=(mastx+side*6.6,12.9,mastz)
    boom=beam(f'patience-mast-derrick-boom-{side}',start,end,.20,steel,'ship-patience:mast',.18); parent(boom,mast_root)
    stay=rail(f'patience-mast-derrick-stay-{side}',(mastx+side*2.4,16.8,mastz),end,.045,iron,'ship-patience:mast'); parent(stay,mast_root)
platform=cube('ship-patience:mast-platform',(mastx,platform_y,mastz),(2.0,.26,2.0),steel,'ship-patience:mast',.08); parent(platform,mast_root)
for side in (-1,1):
    rail_obj=beam(f'patience-mast-platform-rail-{side}',(mastx,platform_y+.9,mastz+side*1.0),(mastx,platform_y+.9,mastz-side*1.0),.06,iron,'ship-patience:mast'); parent(rail_obj,mast_root)
    rail_obj=beam(f'patience-mast-platform-end-{side}',(mastx-1.0,platform_y+.9,mastz+side*1.0),(mastx+1.0,platform_y+.9,mastz+side*1.0),.06,iron,'ship-patience:mast'); parent(rail_obj,mast_root)
for level in range(1,26):
    y=11+level*.31
    rung=beam(f'patience-mast-ladder-rung-{level}',(mastx-.26,y,mastz),(mastx+.26,y,mastz),.045,iron,'ship-patience:mast'); parent(rung,mast_root)
for dx in (-.26,.26):
    side=beam(f'patience-mast-ladder-side-{dx}',(mastx+dx,11.1,mastz),(mastx+dx,18.8,mastz),.055,steel,'ship-patience:mast'); parent(side,mast_root)
bell=cylinder('patience-bell-metal',(mastx,18.45,mastz),.38,.65,steel,'ship-patience:bell',24)
clapper=beam('patience-bell-clapper',(mastx,18.1,mastz),(mastx,17.65,mastz),.08,iron,'ship-patience:bell')
for o in (bell,clapper): parent(o,bell_root)

if args.stage == 'family':
    # The lighthouse is a tapered, photo-projected tower, with access at all three story landings.
    light_root=root_obj('lighthouse',(170,0,-395),'lighthouse')
    N=48; verts=[]; faces=[]
    for level,(y,radius) in enumerate(((-2,5.6),(6,4.8),(14,4.0),(22,3.2),(25.3,3.0))):
        for i in range(N):
            a=i*2*math.pi/N
            verts.append(gv((math.cos(a)*radius,y,math.sin(a)*radius)))
    for level in range(4):
        for i in range(N): faces.append((level*N+i,level*N+(i+1)%N,(level+1)*N+(i+1)%N,(level+1)*N+i))
    mesh=bpy.data.meshes.new('lighthouse tapered masonry'); mesh.from_pydata(verts,[],faces); mesh.materials.append(stone_photo); mesh.materials.append(materials['weathered-plank']); mesh.update()
    tower=bpy.data.objects.new('lighthouse masonry tower',mesh); scene.collection.objects.link(tower); tower['part']='lighthouse'
    uv=mesh.uv_layers.new(name='Photographic front projection')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index; level=vi//N; i=vi%N; x,y=math.cos(i*2*math.pi/N),math.sin(i*2*math.pi/N)
            height=mesh.vertices[vi].co.z
            angle=i*2*math.pi/N
            if math.sin(angle)<-.62:
                uv.data[li].uv=(.5+(x*5.8)/12.0,.02+((height+2)/27.3)*.94)
                poly.material_index=0
            else:
                radius=((5.6,4.8,4.0,3.2,3.0)[level])
                uv.data[li].uv=(angle*radius,.04+height/2)
                poly.material_index=1
    parent(tower,light_root)
    for y,rad in ((8,4.9),(16,3.8),(24,3.05)):
        floor=cylinder(f'lighthouse-landing-{y}',(0,y,0),rad+.7,.28,steel,'lighthouse',48)
        parent(floor,light_root)
        for i in range(24):
            a=i*2*math.pi/24
            beam(f'lighthouse-landing-post-{y}-{i}',(math.cos(a)*(rad+.55),y,math.sin(a)*(rad+.55)),(math.cos(a)*(rad+.55),y+.9,math.sin(a)*(rad+.55)),.055,iron,'lighthouse')
    for i in range(66):
        y=-1.6+i*.38; a=-math.pi/2+i*.135; radius=4.8-(y+2)*.075
        x,z=math.cos(a)*radius,math.sin(a)*radius
        beam(f'lighthouse-spiral-stair-{i}',(x,y,z),(x+math.cos(a+.4)*1.0,y+.20,z+math.sin(a+.4)*1.0),.12,wood,'lighthouse',.8)
    door=cube('lighthouse:door',(0,0,-5.54),(1.8,2.8,.16),wood,'lighthouse',.1); parent(door,light_root)
    step=cube('lighthouse-swept-step',(0,-1.78,-6.1),(3.2,.25,1.1),steel,'lighthouse',.04); parent(step,light_root)
    # Bright drawings and a box on the requested interior landings.
    for i in range(5):
        board=cube(f'lighthouse-gate-drawing-{i}',(-1.8+i*.75,9.2,-4.25),(.58,.76,.04),paint,'lighthouse',.02); parent(board,light_root)
    letters=cube('lighthouse-box-of-letters',(1.6,17,-3.15),(1.05,.65,.72),wood,'lighthouse',.06); parent(letters,light_root)
    lamp_mesh=cylinder('lighthouse:lamp',(0,27.0,0),1.9,2.7,glass,'lighthouse:lamp',40)
    for poly in lamp_mesh.data.polygons: poly.use_smooth=True
    lamp_root=root_obj('lighthouse:lamp',(0,0,0),'lighthouse:lamp'); parent(lamp_root,light_root); parent(lamp_mesh,lamp_root)
    for i in range(8):
        a=i*math.pi/4
        b=beam(f'lighthouse-lantern-mullion-{i}',(math.cos(a)*1.9,25.6,math.sin(a)*1.9),(math.cos(a)*1.9,28.4,math.sin(a)*1.9),.08,iron,'lighthouse:lamp')
        parent(b,lamp_root)
    lightpart=root_obj('lighthouse:beam',(0,0,0),'lighthouse:beam'); parent(lightpart,light_root)
    beam_obj=cube('lighthouse rotating beam',(0,27.2,-5),(1.0,.16,44),lamp,'lighthouse:beam',.03); parent(beam_obj,lightpart)

    # The ridiculous forty-foot pilot boat remains a real, buoyant hull.
    boat=root_obj('pilot-boat',(230,-.8,-430),'pilot-boat')
    boat_dims=(12.2,3.9,2.5,-1.2)
    photo_hull('pilot-boat-floatable-hull',boat,(12.2,3.9,2.5,-1.2),pilot_photo,'')
    boat_hull=bpy.data.objects.get('pilot-boat-floatable-hull')
    # The hull projection crop uses the workboat profile; a pale upper strake keeps its shape readable.
    for side in (-1,1):
        upper=cube(f'pilot-boat-sheer-strake-{side}',(0,1.7,side*1.62),(10.2,.20,.12),steel,'pilot-boat',.05); parent(upper,boat)
        for i in range(7):
            win=cube(f'pilot-boat-cabin-window-{side}-{i}',(-1.8+i*.6,3.05,side*1.41),(.42,.55,.06),glass,'pilot-boat',.04); parent(win,boat)
    house_vertices=[(-2.6,1.65,-1.5),(2.6,1.65,-1.5),(2.6,1.65,1.5),(-2.6,1.65,1.5),
                    (-2.2,3.65,-1.32),(2.0,3.65,-1.32),(2.0,3.65,1.32),(-2.2,3.65,1.32)]
    house_faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    house_mesh=bpy.data.meshes.new('sloped pilot-house panels'); house_mesh.from_pydata([gv(v) for v in house_vertices],[],house_faces); house_mesh.materials.append(boat_paint); house_mesh.update()
    cabin=bpy.data.objects.new('pilot-boat-pilot-house',house_mesh); scene.collection.objects.link(cabin); cabin['part']='pilot-boat'; parent(cabin,boat)
    roof=cube('pilot-boat-cabin-roof',(0,3.72,0),(5.7,.25,3.0),steel,'pilot-boat',.1); parent(roof,boat)
    for side in (-1,1):
        beam(f'pilot-boat-rail-{side}',(-2.8,2.1,side*1.72),(3.8,2.1,side*1.72),.09,steel,'pilot-boat')
    windshield=cube('pilot-boat-forward-windscreen',(2.02,3.05,0),(.07,.78,2.25),glass,'pilot-boat',.06); parent(windshield,boat)
    # A heavy 14 m trailer with eight complete road wheels and spring packs.
    trailer_hitch=root_obj('pilot-boat:hitch',(0,0,0),'pilot-boat:hitch'); parent(trailer_hitch,boat)
    for z in (-1.45,1.45): beam(f'pilot-trailer-long-rail-{z}',(-8,.3,z),(7,.3,z),.28,rust,'pilot-boat')
    for x in (-6,-2,2,6): beam(f'pilot-trailer-crossmember-{x}',(x,.18,-1.55),(x,.18,1.55),.22,steel,'pilot-boat')
    hitch=beam('pilot-trailer-hitch',(7,.48,0),(11,.5,0),.24,steel,'pilot-boat:hitch'); parent(hitch,trailer_hitch)
    for side in (-1,1):
        for i,x in enumerate((-4,-1,2,5)):
            z=side*1.72
            tor=torus(f'pilot-trailer-road-tyre-{side}-{i}',(x,-.14,z),.72,.24,iron,'pilot-boat','Z')
            for k in range(8):
                a=k*2*math.pi/8
                lug=cube(f'pilot-tyre-lug-{side}-{i}-{k}',(x+.88*math.cos(a),-.14+.88*math.sin(a),z),(.23,.18,.55),iron,'pilot-boat',0)
            hub=cylinder(f'pilot-wheel-hub-{side}-{i}',(x,-.14,z+side*.24),.30,.15,steel,'pilot-boat',20,'Z')
            for spring in range(3):
                beam(f'pilot-leaf-spring-{side}-{i}-{spring}',(x-1,-.05-spring*.10,z),(x+1,-.05-spring*.10,z),.10,rust,'pilot-boat',.08)

# Low sandy approach merges into the buried hulls instead of a raised display base.
ship_ground=sand
if args.stage == 'patience':
    # Side-specific phase-shifted wavelengths roughen the edge. The outer row
    # lies on the shared bed; the inner row overlaps the plating.
    rng = __import__('random').Random(10410)
    verts=[]; faces=[]; stations=145; rows=9
    for side in (-1, 1):
        base=len(verts)
        phases=[rng.uniform(0, 2*math.pi) for _ in range(6)]
        for i in range(stations):
            t=i/(stations-1); along=-36 + 72*t
            bow=max(0,(t-.70)/.30); stern=max(0,(.18-t)/.18)
            edge_noise=(.42*math.sin(t*2*math.pi*72/29+phases[0])
                        +.25*math.sin(t*2*math.pi*72/13+phases[1])
                        +.13*math.sin(t*2*math.pi*72/5.5+phases[2])
                        +.10*math.sin(t*2*math.pi*72/2.4+phases[3]))
            crest=-.70 + 1.05*bow + .22*stern + edge_noise
            if side < 0: crest += .60
            drift_width=6.0 + 5.0*bow - 2.1*stern + (3.0 if side < 0 else 0)
            for row in range(rows):
                u=row/(rows-1)
                lateral=side*(5.35 + drift_width*u + u*(
                    .55*math.sin(t*2*math.pi*72/21+phases[2])
                    +.28*math.sin(t*2*math.pi*72/7.5+phases[4])
                    +.16*math.sin(t*2*math.pi*72/3.2+phases[5])))
                along_wobble=u*(.8*math.sin(t*2*math.pi*72/27+phases[1])
                                +.35*math.sin(t*2*math.pi*72/8+phases[3]))
                ripple=.20*math.sin(t*2*math.pi*72/9+u*4+phases[4])
                y=-2 + (crest+2+ripple)*(math.cos(u*math.pi/2)**1.55)
                if row == rows-1: y=-2.0
                verts.append(gv((27+along+along_wobble,y,-470+lateral)))
        for i in range(stations-1):
            for row in range(rows-1):
                a=base+i*rows+row; b=a+rows
                faces.append((a,b,b+1,a+1) if side > 0 else (a,a+1,b+1,b))
    drift_mesh=bpy.data.meshes.new('ship-patience drifts mesh')
    drift_mesh.from_pydata(verts,[],faces); drift_mesh.materials.append(sand); drift_mesh.update()
    for polygon in drift_mesh.polygons: polygon.use_smooth=True
    drift=bpy.data.objects.new('ship-patience:drifts',drift_mesh); scene.collection.objects.link(drift)
    drift['part']='ship-patience:drifts'
for index,(x,z,rx,rz) in enumerate(((-45,-415,53,19),(45,-440,51,20),(5,-470,55,22),(170,-395,14,12),(230,-430,20,15)) if args.stage == 'family' else ()):
    # Blender Z is map-up. A low, irregular radial heap fades into the bed
    # rather than ending as an oval slab at the hull.
    import random
    rng=random.Random(811+index)
    segments=48; rings=8; verts=[gv((x,-1.78,z))]; faces=[]
    for ring in range(1,rings+1):
        r=ring/rings
        for i in range(segments):
            a=2*math.pi*i/segments; wobble=1+rng.uniform(-.055,.055)
            rise=max(0,.82*math.sin(math.pi*r)**.82+rng.uniform(-.06,.06)*(1-r))
            verts.append(gv((x+math.cos(a)*rx*r*wobble,-2.0+rise,z+math.sin(a)*rz*r*wobble)))
    for i in range(segments): faces.append((0,1+(i+1)%segments,1+i))
    for ring in range(rings-1):
        a0=1+ring*segments; a1=a0+segments
        for i in range(segments):
            j=(i+1)%segments; faces.append((a0+i,a0+j,a1+j,a1+i))
    mesh=bpy.data.meshes.new(f'ship-place-spread-sand-{index} mesh'); mesh.from_pydata(verts,[],faces); mesh.materials.append(ship_ground); mesh.update()
    mound=bpy.data.objects.new(f'ship-place-spread-sand-{index}',mesh); scene.collection.objects.link(mound)

# One export root holds every named story place while preserving map coordinates.
world_root=root_obj('wasteland-ships-root',(0,0,0),'wasteland-ships')
for child in list(scene.objects):
    if child is not world_root and child.parent is None:
        parent(child,world_root)

def normalize_picture_coordinates():
    for obj in scene.objects:
        if obj.type != 'MESH':
            continue
        mesh = obj.data
        if not mesh.uv_layers:
            uv = mesh.uv_layers.new(name='UVMap')
            for loop in mesh.loops:
                co = mesh.vertices[loop.vertex_index].co
                uv.data[loop.index].uv = (co.x, co.y)
        primary = mesh.uv_layers.active or mesh.uv_layers[0]
        primary.name = 'UVMap'
        for layer in list(mesh.uv_layers):
            if layer != primary:
                mesh.uv_layers.remove(layer)
        mesh.uv_layers.active = primary
        primary.active_render = True

def merge_meshes_by_story_part():
    groups={}
    for obj in scene.objects:
        if obj.type!='MESH': continue
        part=obj.get('part','')
        groups.setdefault((part,obj.parent.name if obj.parent else ''),[]).append(obj)
    for (part,parent_name),objects in groups.items():
        if len(objects)<2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        active=objects[0]; bpy.context.view_layer.objects.active=active
        bpy.ops.object.join()
        active.name=(part or 'lake-bed')+' geometry'
        if part: active['part']=part

normalize_picture_coordinates()
merge_meshes_by_story_part()

# One neutral mid-tone floor supports review only; it is never exported.

def camera(name, location, target, lens=55):
    data=bpy.data.cameras.new(name); cam=bpy.data.objects.new(name,data); scene.collection.objects.link(cam)
    cam.location=gv(location); direction=gv(target)-cam.location; cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler(); data.lens=lens
    return cam

def add_lighting():
    world=bpy.data.worlds.new('bright overcast sky') if not bpy.data.worlds else bpy.data.worlds[0]
    world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.68,.70,1); world.node_tree.nodes['Background'].inputs[1].default_value=.8; scene.world=world
    data=bpy.data.lights.new('large overcast softbox','AREA'); light_obj=bpy.data.objects.new('large overcast softbox',data); scene.collection.objects.link(light_obj)
    light_obj.location=gv((95,110,-410)); data.energy=100000; data.shape='DISK'; data.size=120

def render_imported_review():
    # Export first, clear the authored scene, then import exactly the GLB under review.
    town.export_glb(out)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    review_scene = bpy.context.scene
    review_scene.render.engine = 'BLENDER_EEVEE_NEXT'
    review_scene.render.resolution_x, review_scene.render.resolution_y = (960, 600)
    review_scene.render.resolution_percentage = 100
    review_scene.render.image_settings.file_format = 'JPEG'
    review_scene.render.image_settings.quality = 88
    review_scene.render.film_transparent = False
    review_scene.view_settings.view_transform = 'Standard'
    review_scene.view_settings.look = 'Medium High Contrast'
    review_scene.view_settings.exposure = 0
    review_scene.view_settings.gamma = 1
    review_scene.world = bpy.data.worlds.new('flat overcast review sky')
    review_scene.world.use_nodes = True
    review_scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.48, .50, .52, 1)
    review_scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
    bpy.ops.import_scene.gltf(filepath=str(out))
    exported_objects = list(review_scene.objects)
    exported_meshes = [obj for obj in exported_objects if obj.type == 'MESH']
    triangle_count = sum(len(poly.vertices) - 2 for obj in exported_meshes for poly in obj.data.polygons)
    glb_bytes = out.stat().st_size

    bpy.ops.mesh.primitive_plane_add(size=1200, location=gv((0, -2.0, -440)))
    ground = bpy.context.object
    ground.name = 'review-only neutral lake bed'
    ground.data.materials.append(next(mat for mat in bpy.data.materials
                                      if mat.name.startswith('Town / sand')))

    def area(name, game_location, energy, size):
        data = bpy.data.lights.new(name, 'AREA')
        data.energy, data.shape, data.size = energy, 'DISK', size
        data.use_shadow = False
        obj = bpy.data.objects.new(name, data)
        review_scene.collection.objects.link(obj)
        obj.location = gv(game_location)
        obj.rotation_euler = (gv((0, 4, -465)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
        return obj

    key = area('review-softbox', (5, 44, -430), 44000, 55)
    fill = area('review-fill', (65, 26, -510), 26000, 45)

    def add_camera(name, eye, target, scale, resolution=(1000, 700)):
        data = bpy.data.cameras.new(name)
        cam = bpy.data.objects.new(name, data)
        review_scene.collection.objects.link(cam)
        cam.location = gv(eye)
        cam.rotation_euler = (gv(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        data.type = 'PERSP'
        if data.type == 'PERSP':
            data.lens = 35 if name in ('review-camera-whole', 'review-camera-dusk') else 45
        else:
            data.ortho_scale = scale
        review_scene.render.resolution_x, review_scene.render.resolution_y = resolution
        return cam

    add_camera('review-camera-whole', (27, 1.2, -590), (27, 10, -470), 96, (1200, 900))
    review_scene.objects['review-camera-whole'].data.lens = 35
    add_camera('review-camera-bow', (91, 1.2, -497), (46, 12, -470), 96, (1200, 900))
    review_scene.objects['review-camera-bow'].data.lens = 24
    add_camera('review-camera-dusk', (27, 1.2, -590), (27, 10, -470), 96, (1200, 900))
    review_scene.objects['review-camera-dusk'].data.lens = 35
    add_camera('review-camera-above', (27, 150, -470), (27, 6, -470), 98, (1200, 900))
    review_scene.objects['review-camera-above'].data.lens = 45
    add_camera('review-camera-comparison', (10.3, 15.2, -430), (10.3, 15.2, -470), 40, (1400, 600))
    # View (e): eye-level, on the centreline, 15 m ahead of the bridge face,
    # looking level aft so the bridge front and foredeck share the frame.
    add_camera('review-camera-deck', (22.4, 5.7, -470), (7.4, 5.7, -470), 35, (1200, 900))
    # View (f): from deck height, 15 m ahead of the funnel and aimed above its roof.
    add_camera('review-camera-funnel', (-21.5, 5.7, -470), (-6.5, 13.8, -470), 35, (1200, 900))
    review_scene.objects['review-camera-deck'].data.lens = 35
    review_scene.objects['review-camera-funnel'].data.lens = 35

    # A flat reference plane shares the comparison camera and the measured
    # 23 m horizontal scale; its photographed background remains visible.
    ref_image = bpy.data.images.load(str(tex / 'patience-upperworks-side.jpg'), check_existing=False)
    ref_mat = bpy.data.materials.new('Review-only measured side photograph')
    ref_mat.use_nodes = True
    ref_nodes = ref_mat.node_tree.nodes
    ref_nodes.clear()
    ref_out = ref_nodes.new('ShaderNodeOutputMaterial')
    ref_emission = ref_nodes.new('ShaderNodeEmission')
    ref_tex = ref_nodes.new('ShaderNodeTexImage')
    ref_tex.image = ref_image
    ref_mat.node_tree.links.new(ref_tex.outputs['Color'], ref_emission.inputs['Color'])
    ref_mat.node_tree.links.new(ref_emission.outputs[0], ref_out.inputs['Surface'])
    x0, x1 = 14.0, 30.6
    y0, y1 = 11.0, 22.0
    z = -475.0
    verts = [gv((x0,y0,z)), gv((x1,y0,z)), gv((x1,y1,z)), gv((x0,y1,z))]
    mesh = bpy.data.meshes.new('review photo comparison plane')
    mesh.from_pydata(verts, [], [(0,1,2,3)])
    mesh.materials.append(ref_mat)
    uv = mesh.uv_layers.new(name='UVMap')
    for li, coord in zip(mesh.polygons[0].loop_indices, ((0,0),(1,0),(1,1),(0,1))):
        uv.data[li].uv = coord
    plane = bpy.data.objects.new('review-only side photograph', mesh)
    review_scene.collection.objects.link(plane)

    raw.mkdir(parents=True, exist_ok=True)
    review_scene.camera = review_scene.objects['review-camera-whole']
    bpy.ops.wm.save_as_mainfile(filepath=str(raw / 'review.blend'))
    print(json.dumps({'glb': str(out), 'glb_bytes': glb_bytes,
                      'triangles': triangle_count, 'views_ready': 6,
                      'review_file': str(raw / 'review.blend')}))

# A real +Y-up, metre-scale scene, with one named root per story place.
scene.camera=None
render_imported_review()
