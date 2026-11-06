"""Build the stranded ships and lighthouse, then review the exported GLB."""
import argparse
import math
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--stage', choices=('patience', 'family'), default='patience')
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--compose-sheet', action='store_true')
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
photos['ships-hull-photo'] = tex / 'patience-hull-projection.jpg'
ship_photo_full=tex/'ships-hull-photo.jpg'
patience_paint_tile=tex/'patience-white-painted-steel.jpg'
if args.paths_only:
    print(json.dumps({'blend': [str(root / 'art-build/wasteland-ships/ships.blend')],
                      'glb': [str(out)], 'evidence': [str(raw)], 'summary': [str(sheet)]}))
    raise SystemExit(0)
if args.compose_sheet:
    from PIL import Image, ImageDraw, ImageFont
    source = root / 'public/assets/models/wasteland/scablands/textures/ships-hull-photo.jpg'
    panels = [Image.open(raw / name).convert('RGB') for name in
              ('reference.jpg', 'broadside.jpg', 'three-quarter.jpg', 'deck-aft.jpg')]
    canvas = Image.new('RGB', (2400, 1450), (91, 91, 87))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('arial.ttf', 24)
        title_font = ImageFont.truetype('arial.ttf', 28)
    except OSError:
        font = ImageFont.load_default()
        title_font = font
    draw.text((42, 20), f'WW-ART-SHIPS | Patience | round {args.round} | exported GLB reimport', fill=(245, 244, 236), font=title_font)
    frames = ((42, 84, 1150, 500), (1208, 84, 1150, 500),
              (42, 650, 1150, 740), (1208, 650, 1150, 740))
    labels = ('Photographic reference | side view', 'Patience | same side angle and scale',
              'Three-quarter from bow | car for scale', 'On deck at eye height | looking aft')
    for image, (x, y, w, h), label in zip(panels, frames, labels):
        draw.text((x, y - 34), label, fill=(238, 237, 228), font=font)
        image.thumbnail((w, h), Image.Resampling.LANCZOS)
        canvas.paste(image, (x + (w - image.width) // 2, y + (h - image.height) // 2))
    canvas.save(sheet, 'JPEG', quality=87, optimize=True, progressive=True)
    print(f'Sheet: {sheet} ({sheet.stat().st_size} bytes)')
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

missing = [str(p) for p in [*inputs.values(), *photos.values(), ship_photo_full, patience_paint_tile] if not p.is_file()]
if missing:
    raise FileNotFoundError('Ship source photographs are missing: ' + ', '.join(missing))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
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
upper_photo = photo_material('Ship upperworks / matching freighter photograph', ship_photo_full)
painted_white = photo_material('Patience / worn white painted steel tile', patience_paint_tile, metallic=0, roughness=.94)
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
name_paint=matte_material('Ship name / faded chalk paint',(.42,.36,.27))
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

def photo_box(name, center, dims, part, deck=5.0, roof=True):
    """A thick, tiered ship block with the same side photograph mapped on both sides."""
    x,y,z=center; lx,hy,wz=dims
    x0,x1=x-lx/2,x+lx/2; y0,y1=y-hy/2,y+hy/2; z0,z1=z-wz/2,z+wz/2
    corners=[(x0,y0,z0),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1),
             (x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)]
    faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    mesh=bpy.data.meshes.new(name+' thick photographic panels'); mesh.from_pydata([gv(v) for v in corners],[],faces)
    mesh.materials.append(upper_photo); mesh.materials.append(painted_white); mesh.update()
    uv=mesh.uv_layers.new(name='UVMap'); uv.active_render=True; mesh.uv_layers.active_index=0
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            px,py,pz=corners[mesh.loops[li].vertex_index]
            if poly.index in (2,4):
                u=min(.995,max(.005,(px+37.0)/74.0))
                row=min(120.0,max(0.0,(deck+7.2-py)*15.4))
                v=1.0-row/384.0
                poly.material_index=0
            else:
                # Off-camera end, roof and deck surfaces use close photographed paint.
                if poly.index in (0,1):
                    u=(px-x0)/2.5
                    v=(pz-z0)/2.5
                else:
                    u=(pz-z0)/2.5
                    v=(py-y0)/2.5
                if not roof and poly.index in (0,1):
                    poly.material_index=0
                    u=min(.995,max(.005,(px+37.0)/74.0))
                    row=min(120.0,max(0.0,(deck+7.2-py)*15.4))
                    v=1.0-row/384.0
                else:
                    poly.material_index=1
            uv.data[li].uv=(u,v)
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj['part']=part
    bevel=obj.modifiers.new('soft rolled superstructure seams','BEVEL'); bevel.width=.045; bevel.segments=2
    obj.modifiers.new('weighted panel normals','WEIGHTED_NORMAL')
    return obj

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
            u=.02 + ((co[0]/length)+.5)*.96
            # This source image is a hull-only crop with its deck edge at the top.
            # The white bridge, deck fittings and rigging are real geometry above it.
            v=.11 + min(1,max(0,(co[1]-keel)/(deck-keel)))*.73
            uv.data[li].uv=(u,v)
    parent(obj,root)
    # Deck is a real thick deck plate at the map's 5 m walkway datum.
    deck_mesh=cube(name+'-weather-deck',(0,deck-.18,0),(length*.96,.36,width*.94),rust,root.name,.12)
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
    # A chart room with a tall door and glazing, distinct from the decks.
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
    ('ship-patience',(5,-470),'PATIENCE',72,12.0,5.0,-12.2,0.07),
]
if args.stage == 'patience':
    ships=[ship for ship in ships if ship[0]=='ship-patience']
roots={}
for ident,loc,label,length,width,deck,keel,lean in ships:
    r=root_obj(ident,(loc[0]+22,6,loc[1]),ident); roots[ident]=r
    photo_hull(ident+' hull',r,(length,width,deck,keel),hull_photo,label)
    if ident=='ship-patience':
        # The aft bridge is three real, walkable tiers. Its side faces share the
        # photo's x/y projection; the doors, window frames and rails have depth.
        for tier,center,dims in (
            ('aft-deckhouse',(-25.5,6.9,0),(23.0,3.4,9.3)),
            ('chart-room',(-23.0,9.75,0),(20.0,3.2,8.1)),
            ('wheelhouse',(-22.0,12.25,0),(13.0,2.0,6.9)),
            ('chart-room-roof',(-22.0,13.36,0),(14.2,.26,7.7)),
        ):
            cabin=photo_box('patience-'+tier,center,dims,ident+':upperworks',deck)
            parent(cabin,r)
        for side in (-1,1):
            z=side*4.12
            # The real window positions already live in the full ship photo.
            # Mapping both broad faces to that image avoids floating dark panes.
            for x in (-31,-26,-21,-16,-11):
                rail(f'patience-chart-balcony-{side}-{x}',(x,8.45,z),(x+4.2,8.45,z),.045,iron,ident)
                for postx in (x,x+2.1,x+4.2):
                    post=beam(f'patience-chart-balcony-post-{side}-{x}-{postx}',(postx,7.9,z),(postx,8.45,z),.045,steel,ident); parent(post,r)
            door=cube(f'patience-chart-door-{side}',(-13.0,9.3,side*4.15),(1.05,2.25,.11),rust,ident,.04); parent(door,r)
            for step in range(12):
                x=-10.3-step*.52; y=5.25+step*.28
                tread=cube(f'patience-chart-stair-{side}-{step}',(x,y,side*3.45),(.82,.14,1.5),steel,ident,.025); parent(tread,r)
            for railside in (-1,1):
                z=side*3.45+railside*.62
                rail(f'patience-chart-stair-handrail-{side}-{railside}',(-10.5,8.3,z),(-16.7,5.45,z),.055,iron,ident)
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
                stair=cube(f'patience-forecastle-step-{side}-{step}',(16.0+step*.43,5.12+step*.05,side*5.0),(.58,.13,2.2),steel,ident,.025); parent(stair,r)
        for i,x in enumerate((-3,7,17)):
            z=(-2.5,2.5,-2.5)[i]
            hatch=cube(f'patience-hatch-cover-{i}',(x,5.30,z),(6.4,.38,7.0),rust if i%2==0 else steel,ident,.12); parent(hatch,r)
            for side in (-1,1):
                coam=beam(f'patience-hatch-coaming-{i}-{side}',(x-3.25,5.28,z+side*3.7),(x+3.25,5.28,z+side*3.7),.18,rust,ident,.20); parent(coam,r)
                coam=beam(f'patience-hatch-coaming-end-{i}-{side}',(x+side*3.25,5.28,z-3.7),(x+side*3.25,5.28,z+3.7),.18,rust,ident,.20); parent(coam,r)
            for j in range(5):
                seam=beam(f'patience-hatch-seam-{i}-{j}',(x-2.7+j*1.35,5.50,z-3.2),(x-2.7+j*1.35,5.50,z+3.2),.035,iron,ident); parent(seam,r)
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
            pipe=torus(f'{ident}-hawsepipe-{side}',(length*.43,8.25,side*5.7),.48,.14,steel,f'{ident}:anchor-chain','X',20,8); parent(pipe,cr)
        for i in range(20):
            x=length*.43+i*.48
            y=8.15-min(10.15,i*1.27) if i<9 else -2.0
            z=side*(width*.45+min(1.8,i*.11))
            link=torus(f'{ident}-anchor-link-{side}-{i}',(x,y,z),.22,.055,iron,f'{ident}:anchor-chain','Z' if i%2 else 'X',10,6); parent(link,cr)
        anchor=cylinder(f'{ident}-anchor-{side}',(length*.43+11,-2.1,side*(width*.44+2.7)),.42,.18,rust,f'{ident}:anchor-chain',12)
        parent(anchor,cr)
    if ident=='ship-patience':
        # A visible stern shaft, four-blade wheel and hanging rudder complete the hull.
        shaft_root=root_obj('ship-patience:propeller',(0,0,0),'ship-patience:propeller'); parent(shaft_root,r)
        shaft=cylinder('patience-stern-propeller-shaft',(-35,-8.15,0),.32,7.2,steel,'ship-patience:propeller',24,'X'); parent(shaft,shaft_root)
        hub=cylinder('patience-propeller-hub',(-39,-8.15,0),.67,.9,iron,'ship-patience:propeller',20,'X'); parent(hub,shaft_root)
        for blade in range(4):
            a=blade*math.pi/2+.2
            start=(-39.2,-8.15+math.sin(a)*.38,math.cos(a)*.38)
            end=(-39.2,-8.15+math.sin(a)*1.38,math.cos(a)*1.38)
            propblade=beam(f'patience-propeller-blade-{blade}',start,end,.72,steel,'ship-patience:propeller',.18); parent(propblade,shaft_root)
        rudder=cube('patience-stern-rudder',(-34.4,-7.45,0),(1.0,4.4,3.8),rust,'ship-patience:rudder',.28); parent(rudder,r)
        stock=cylinder('patience-rudder-stock',(-34.2,-7.4,0),.28,4.8,steel,'ship-patience:rudder',18); parent(stock,r)
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
mast_root=root_obj('ship-patience:mast',(0,0,0),'ship-patience:mast'); parent(mast_root,pat)
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
ship_ground=matte_material('Patience / dead-sea ground matched to the lake bed',(.34,.31,.26),.97)
for index,(x,z,rx,rz) in enumerate(((-45,-415,53,19),(45,-440,51,20),(5,-470,55,22),(170,-395,14,12),(230,-430,20,15)) if args.stage == 'family' else ((27,-470,55,22),)):
    # Blender Z is map-up. A low, irregular radial heap fades into the bed
    # rather than ending as an oval slab at the hull.
    import random
    rng=random.Random(811+index)
    segments=48; rings=8; verts=[gv((x,-1.78,z))]; faces=[]
    for ring in range(1,rings+1):
        r=ring/rings
        for i in range(segments):
            a=2*math.pi*i/segments; wobble=1+rng.uniform(-.055,.055)
            rise=max(0,.62*math.sin(math.pi*r)**.82+rng.uniform(-.025,.025)*(1-r))
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
    global scene
    raw.mkdir(parents=True,exist_ok=True)
    # Export first, clear every authored mesh, then import the exact GLB being delivered.
    town.export_glb(out)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=1000; scene.render.resolution_y=700; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='JPEG'; scene.render.image_settings.quality=90; scene.render.film_transparent=False
    scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('mid-tone overcast') if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world.use_nodes=True; scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.53,.52,1); scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
    bpy.ops.import_scene.gltf(filepath=str(out))
    exported_objects=list(bpy.context.scene.objects)
    exported_meshes=[obj for obj in exported_objects if obj.type=='MESH']
    triangle_count=sum(len(poly.vertices)-2 for obj in exported_meshes for poly in obj.data.polygons)
    glb_bytes=out.stat().st_size
    # The side-by-side car is review-only. Place an existing game car at 4.5 m long.
    car_path=root/'public/assets/models/unlocks/viper_proto.glb'
    before_car=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(car_path))
    car_objects=list(set(scene.objects)-before_car)
    car_meshes=[obj for obj in car_objects if obj.type=='MESH']
    car_points=[obj.matrix_world @ Vector(corner) for obj in car_meshes for corner in obj.bound_box]
    low=Vector((min(p.x for p in car_points),min(p.y for p in car_points),min(p.z for p in car_points)))
    high=Vector((max(p.x for p in car_points),max(p.y for p in car_points),max(p.z for p in car_points)))
    center=(low+high)*.5
    source_length=max(high.x-low.x,high.y-low.y,high.z-low.z)
    car_scale=4.5/max(source_length,.01)
    car_target=gv((5.0,-.90,-456.0))
    car_transform=(Matrix.Translation(car_target) @ Matrix.Rotation(math.pi/2,4,'Z')
                   @ Matrix.Scale(car_scale,4) @ Matrix.Translation(-center))
    for obj in [obj for obj in car_objects if obj.parent not in car_objects]:
        obj.matrix_world=car_transform @ obj.matrix_world
    bpy.context.view_layer.update()
    for obj in car_objects:
        obj.hide_render=False
    placed_points=[obj.matrix_world @ Vector(corner) for obj in car_meshes for corner in obj.bound_box]
    car_dimensions=(max(p.x for p in placed_points)-min(p.x for p in placed_points),
                    max(p.y for p in placed_points)-min(p.y for p in placed_points),
                    max(p.z for p in placed_points)-min(p.z for p in placed_points))
    car_fit=Matrix.Translation(car_target) @ Matrix.Scale(4.5/max(car_dimensions),4) @ Matrix.Translation(-car_target)
    for obj in [obj for obj in car_objects if obj.parent not in car_objects]:
        obj.matrix_world=car_fit @ obj.matrix_world
    bpy.context.view_layer.update()
    placed_points=[obj.matrix_world @ Vector(corner) for obj in car_meshes for corner in obj.bound_box]
    car_dimensions=(max(p.x for p in placed_points)-min(p.x for p in placed_points),
                    max(p.y for p in placed_points)-min(p.y for p in placed_points),
                    max(p.z for p in placed_points)-min(p.z for p in placed_points))
    correction=4.5/max(car_dimensions)
    if abs(max(car_dimensions)-4.5)>.01:
        correction_matrix=(Matrix.Translation(car_target) @ Matrix.Scale(correction,4)
                           @ Matrix.Translation(-car_target))
        for obj in [obj for obj in car_objects if obj.parent not in car_objects]:
            obj.matrix_world=correction_matrix @ obj.matrix_world
        bpy.context.view_layer.update()
        placed_points=[obj.matrix_world @ Vector(corner) for obj in car_meshes for corner in obj.bound_box]
        car_dimensions=(max(p.x for p in placed_points)-min(p.x for p in placed_points),
                        max(p.y for p in placed_points)-min(p.y for p in placed_points),
                        max(p.z for p in placed_points)-min(p.z for p in placed_points))
    bpy.ops.mesh.primitive_plane_add(size=1200, location=gv((0,-2.0,-440)))
    review_ground=bpy.context.object; review_ground.name='review-only mid-tone lake bed'
    review_material=bpy.data.materials.new('Review ground / neutral lake-bed earth'); review_material.diffuse_color=(.34,.31,.26,1)
    review_material.use_nodes=True; review_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.34,.31,.26,1)
    review_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
    review_ground.data.materials.append(review_material)
    # Render view and light objects are created only after GLB import.
    add_lighting()
    # Preserve the source photograph unchanged; compare at the same broadside
    # angle and horizontal world scale, then show the ship on foot and at car height.
    import shutil
    shutil.copyfile(ship_photo_full,raw/'reference.jpg')
    for obj in car_objects:
        obj.hide_render=False
    for obj in exported_objects:
        if obj.type=='MESH': obj.hide_render=False
    side_cam=camera('review broadside', (29,9,-320), (29,9,-470), 50)
    side_cam.data.type='ORTHO'; side_cam.data.ortho_scale=82
    scene.camera=side_cam; scene.render.resolution_x,scene.render.resolution_y=(2048,900)
    scene.render.filepath=str(raw/'broadside.jpg'); bpy.ops.render.render(write_still=True)
    for obj in exported_objects:
        if obj.type=='MESH': obj.hide_render=False
    quarter_cam=camera('review bow three-quarter', (74,-1.15,-426), (27,5,-470), 25)
    scene.camera=quarter_cam; scene.render.resolution_x,scene.render.resolution_y=(1200,760)
    scene.render.filepath=str(raw/'three-quarter.jpg'); bpy.ops.render.render(write_still=True)
    for obj in car_objects:
        obj.hide_render=True
    deck_cam=camera('review deck looking aft', (39,12.75,-464), (-8,13.2,-470), 43)
    scene.camera=deck_cam; scene.render.resolution_x,scene.render.resolution_y=(1200,760)
    scene.render.filepath=str(raw/'deck-aft.jpg'); bpy.ops.render.render(write_still=True)
    print(json.dumps({'glb':str(out),'glb_bytes':glb_bytes,'triangles':triangle_count,
                      'materials_metallic_max':.28,'side_scale_metres':78,
                      'review_car_dimensions':car_dimensions,'views':3}))

# A real +Y-up, metre-scale scene, with one named root per story place.
scene.camera=None
render_imported_review()
