"""Build the stranded ships and lighthouse, then review the exported GLB."""
import argparse
import math
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--round', type=int, default=1)
parser.add_argument('--paths-only', action='store_true')
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
if args.paths_only:
    print(json.dumps({'blend': [str(root / 'art-build/wasteland-ships/ships.blend')],
                      'glb': [str(out)], 'evidence': [str(raw)], 'summary': [str(sheet)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import town_base as town

missing = [str(p) for p in [*inputs.values(), *photos.values()] if not p.is_file()]
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
stone_photo = photo_material('Lighthouse / projected local stonework', photos['lighthouse-stone-photo'])
pilot_photo = photo_material('Pilot boat / projected workboat photograph', photos['pilot-boat-photo'])
rust = materials['rusted-steel']
steel = materials['galvanised-tin']
iron = materials['iron-dark']
wood = materials['weathered-plank']
paint = materials['faded-hand-paint']
glass = materials['dirty-glass']
sand = materials['sand']
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

def torus(name,center,major,minor,material,part,axis='Y'):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=24,minor_segments=8,location=gv(center))
    o=bpy.context.object
    if axis=='X': o.rotation_euler[1]=math.pi/2
    o.data.materials.append(material)
    return attach(o,name,part)

def photo_hull(name, root, dimensions, material, side_label, hull_color=None):
    length,width,deck,keel=dimensions
    # Closed ship section: full submerged keel for the later floating scene.
    stations=[(-.50,.42),(-.43,.82),(-.30,1.0),(.20,1.0),(.40,.96),(.48,.82),(.50,.56)]
    rings=[]
    for t,breadth in stations:
        x=t*length
        top=deck-(abs(t)**4)*1.4
        ring=[(x,top,-width*breadth*.44),(x,top,width*breadth*.44),
              (x,deck-2.2,width*breadth*.40),(x,deck-4.7,width*breadth*.25),(x,keel,0)]
        rings.append(ring)
    verts=[gv(v) for ring in rings for v in ring]
    faces=[]; material_ids=[]
    for i in range(len(rings)-1):
        for j in range(4):
            faces.append((i*5+j,i*5+(j+1)%5,(i+1)*5+(j+1)%5,(i+1)*5+j))
            material_ids.append(0 if j in (0,1) else 1)
    faces.extend([tuple(range(4,-1,-1)),tuple((len(rings)-1)*5+j for j in range(5))]); material_ids.extend((1,1))
    mesh=bpy.data.meshes.new(name+' welded hull'); mesh.from_pydata(verts,[],faces); mesh.materials.append(material); mesh.materials.append(rust); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj['part']=root.name
    uv=mesh.uv_layers.new(name='Photo projection UV')
    for poly,mi in zip(mesh.polygons,material_ids):
        poly.material_index=mi
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index
            station=vi//5; section=vi%5
            co=rings[station][section]
            # One camera-like side projection shared by both long plates.
            u=(co[0]/length)+.5
            v=min(1,max(0,(co[1]-keel)/(deck-keel)))
            if section==0: v=min(1,v+.06)
            uv.data[li].uv=(u,v)
    parent(obj,root)
    # Deck is a real thick deck plate at the map's 5 m walkway datum.
    deck_mesh=cube(name+'-weather-deck',(0,deck-.18,0),(length*.83,.36,width*.72),steel,root.name,.12)
    parent(deck_mesh,root)
    # Patch plates sit over the photo paint and catch daylight on their raised seams.
    for index,(x,y,w,h) in enumerate(((-24,deck-2.2,4.8,2.1),(-12,deck-5.1,5.4,1.5),(6,deck-3.7,5.8,2.4),(25,deck-1.9,4.5,2.0))):
        for side in (-1,1):
            plate=cube(f'{name}-renewal-patch-{index}-{side}',(x,y,side*width*.444),(w,h,.055),steel,root.name,.025)
            parent(plate,root)
            for k in range(5):
                rivet=cylinder(f'{name}-patch-rivet-{index}-{side}-{k}',(x-w*.4+k*w*.2,y-h*.38,side*(width*.444+.04)),.045,.07,iron,root.name,8,'Z')
                parent(rivet,root)
    # Text on the bow, in large, readable weathered paint.
    label=bpy.data.curves.new(name+' painted bow name','FONT'); label.body=side_label; label.size=1.28; label.extrude=.012; label.bevel_depth=.008
    for side in (-1,1):
        obj=bpy.data.objects.new(name+' bow name '+str(side),label); scene.collection.objects.link(obj)
        obj.location=gv((length*.30,deck-2.05,side*(width*.448)))
        obj.rotation_euler=(math.pi/2 if side>0 else -math.pi/2,0,0)
        label.materials.clear(); label.materials.append(paint)
        obj['part']=root.name; parent(obj,root)
    # Three genuinely walkable deck levels with narrow ladders between them.
    for level,height in enumerate((deck,deck+3.2,deck+6.3)):
        for side in (-1,1):
            walkway=cube(f'{name}-walkway-{level}-{side}',(0,height,-side*width*.16),(length*.66,.20,width*.15),wood,root.name,.05)
            parent(walkway,root)
            rail(f'{name}-guardrail-{level}-{side}',(-length*.28,height+.85,-side*width*.24),(length*.28,height+.85,-side*width*.24),.055,iron,root.name)
    for side in (-1,1):
        for low,high,x in ((-1.8,deck,-length*.13),(deck,deck+3.2,-length*.05),(deck+3.2,deck+6.3,length*.02)):
            z=side*width*.29
            for dx in (-.35,.35): beam(f'{name}-ladder-rail-{side}-{low}-{dx}',(x+dx,low,z),(x+dx,high,z),.065,steel,root.name)
            for k in range(1,round((high-low)/.34)):
                y=low+k*.34; beam(f'{name}-ladder-rung-{side}-{low}-{k}',(x-.35,y,z),(x+.35,y,z),.055,iron,root.name)
    # A chart room with a tall door and glazing, distinct from the decks.
    cabin=cube(name+'-chart-room',(0,deck+3.8,0),(8,4.1,5.4),wood,root.name,.20); parent(cabin,root)
    roof=cube(name+'-chart-room-roof',(0,deck+6.0,0),(9,.28,6.1),rust,root.name,.10); parent(roof,root)
    for side in (-1,1):
        for i in range(5):
            win=cube(f'{name}-chart-window-{side}-{i}',(-3.1+i*1.55,deck+4.0,side*2.72),(1.05,1.0,.08),glass,root.name,.05); parent(win,root)
    door=cube(name+'-chart-door',(4.05,deck+3.55,-1.1),(.10,2.4,1.0),iron,root.name,.05); parent(door,root)
    return

ships=[
    ('ship-good-hope',(-45,-415),'GOOD HOPE',72,16,5.0,-8.3,0.12),
    ('ship-marigold',(45,-440),'MARIGOLD',67,15,5.0,-8.8,-0.09),
    ('ship-patience',(5,-470),'PATIENCE',74,16,5.0,-9.1,0.07),
]
roots={}
for ident,loc,label,length,width,deck,keel,lean in ships:
    r=root_obj(ident,(loc[0],0,loc[1]),ident); roots[ident]=r
    photo_hull(ident+' hull',r,(length,width,deck,keel),hull_photo,label)
    # Distinct cargo-deck clutter, kept low and joined to the ship.
    for i,x in enumerate((-20,-10,8,20)):
        crate=cube(f'{ident}-cargo-{i}',(x,deck+.55,(-1)**i*2.6),(3,1.1,2.2),rust if i%2 else steel,ident,.12); parent(crate,r)
    # Each anchor chain has its own named detachable part and rests on the bed.
    for side in (-1,1):
        cr=root_obj(f'{ident}:anchor-chain:{side}',(loc[0],-1.5,loc[1]),f'{ident}:anchor-chain')
        for i in range(15):
            x=length*.43+i*.48; z=side*(width*.52+i*.12)
            link=torus(f'{ident}-anchor-link-{side}-{i}',(x,-1.8,z),.21,.045,iron,f'{ident}:anchor-chain','Z'); parent(link,cr)
        anchor=cylinder(f'{ident}-anchor-{side}',(length*.43+7,-1.9,side*(width*.52+2)),.34,.12,rust,f'{ident}:anchor-chain',12)
        parent(anchor,cr)
    # Slightly different lean about each grounded centre line.
    r.rotation_euler[2]=lean
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

# Patience's mast, platform and bell: 14 m above the main deck.
pat=roots['ship-patience']; mastx=7; mastz=8; platform_y=19
mast_root=root_obj('ship-patience:mast',(0,0,0),'ship-patience:mast'); parent(mast_root,pat)
bell_root=root_obj('ship-patience:bell',(0,0,0),'ship-patience:bell'); parent(bell_root,mast_root)
for dx in (-.72,.72):
    beamobj=beam(f'patience-mast-leg-{dx}',(mastx+dx,5,mastz),(mastx+dx,platform_y+1,mastz),.15,steel,'ship-patience:mast'); parent(beamobj,mast_root)
    cross=beam(f'patience-mast-crossbar-{dx}',(mastx+dx,9,mastz),(mastx-dx,9,mastz),.10,iron,'ship-patience:mast'); parent(cross,mast_root)
platform=cube('ship-patience:mast-platform',(mastx,platform_y,mastz),(3.3,.26,3.3),steel,'ship-patience:mast',.08); parent(platform,mast_root)
for side in (-1,1):
    rail_obj=beam(f'patience-mast-platform-rail-{side}',(mastx-1.65,platform_y+1,mastz+side*1.5),(mastx+1.65,platform_y+1,mastz+side*1.5),.07,iron,'ship-patience:mast'); parent(rail_obj,mast_root)
for level in range(1,42):
    y=5+level*.34
    rung=beam(f'patience-mast-ladder-rung-{level}',(mastx-.72,y,mastz),(mastx+.72,y,mastz),.055,iron,'ship-patience:mast'); parent(rung,mast_root)
for dx in (-.72,.72):
    side=beam(f'patience-mast-ladder-side-{dx}',(mastx+dx,5,mastz),(mastx+dx,platform_y,mastz),.065,steel,'ship-patience:mast'); parent(side,mast_root)
bell=cylinder('patience-bell-metal',(mastx,platform_y+1.15,mastz),.42,.7,steel,'ship-patience:bell',24)
clapper=beam('patience-bell-clapper',(mastx,platform_y+.72,mastz),(mastx,platform_y+.26,mastz),.10,iron,'ship-patience:bell')
for o in (bell,clapper): parent(o,bell_root)

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
        vi=mesh.loops[li].vertex_index; level=vi//N; i=vi%N; x,y,z=math.cos(i*2*math.pi/N),math.sin(i*2*math.pi/N), level
        angle=i*2*math.pi/N
        if math.sin(angle)<-.62:
            uv.data[li].uv=(.5+(x*5.8)/12.0,.02+z*.94)
            poly.material_index=0
        else:
            uv.data[li].uv=(.5+x*.46,.04+z*.90)
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
boat=root_obj('pilot-boat',(230,-2,-430),'pilot-boat')
boat_dims=(12.2,3.9,2.5,-1.2)
photo_hull('pilot-boat-floatable-hull',boat,(12.2,3.9,2.5,-1.2),pilot_photo,'PILOT BOAT')
boat_hull=bpy.data.objects.get('pilot-boat-floatable-hull')
# The hull projection crop uses the workboat profile; a pale upper strake keeps its shape readable.
for side in (-1,1):
    upper=cube(f'pilot-boat-sheer-strake-{side}',(0,1.7,side*1.62),(10.2,.20,.12),steel,'pilot-boat',.05); parent(upper,boat)
    for i in range(7):
        win=cube(f'pilot-boat-cabin-window-{side}-{i}',(-1.8+i*.6,3.25,side*1.72),(.42,.5,.09),glass,'pilot-boat',.06); parent(win,boat)
cabin=cube('pilot-boat-pilot-house',(0,2.65,0),(5.7,2.2,3.2),wood,'pilot-boat',.18); parent(cabin,boat)
roof=cube('pilot-boat-cabin-roof',(0,3.83,0),(6.2,.25,3.5),steel,'pilot-boat',.1); parent(roof,boat)
for x in (-3.0,3.0):
    beam(f'pilot-boat-rail-{x}',(x,2.1,-1.72),(x,3.5,-1.72),.09,steel,'pilot-boat')
# A heavy 14 m trailer with eight complete road wheels and spring packs.
trailer_hitch=root_obj('pilot-boat:hitch',(0,0,0),'pilot-boat:hitch'); parent(trailer_hitch,boat)
for z in (-1.45,1.45): beam(f'pilot-trailer-long-rail-{z}',(-8,.3,z),(7,.3,z),.28,rust,'pilot-boat')
for x in (-6,-2,2,6): beam(f'pilot-trailer-crossmember-{x}',(x,.18,-1.55),(x,.18,1.55),.22,steel,'pilot-boat')
hitch=beam('pilot-trailer-hitch',(7,.48,0),(11,.5,0),.24,steel,'pilot-boat:hitch'); parent(hitch,trailer_hitch)
for side in (-1,1):
    for i,x in enumerate((-4,-1,2,5)):
        z=side*1.72
        tor=torus(f'pilot-trailer-road-tyre-{side}-{i}',(x,-.62,z),.72,.24,iron,'pilot-boat','Z')
        for k in range(16):
            a=k*2*math.pi/16
            lug=cube(f'pilot-tyre-lug-{side}-{i}-{k}',(x+.88*math.cos(a),-.62+.88*math.sin(a),z),(.23,.18,.55),iron,'pilot-boat',.04)
        hub=cylinder(f'pilot-wheel-hub-{side}-{i}',(x,-.62,z+side*.24),.30,.15,steel,'pilot-boat',20,'Z')
        for spring in range(3):
            beam(f'pilot-leaf-spring-{side}-{i}-{spring}',(x-1,-.05-spring*.10,z),(x+1,-.05-spring*.10,z),.10,rust,'pilot-boat',.08)

# Low sandy approach merges into the buried hulls instead of a raised display base.
for index,(x,z,rx,rz) in enumerate(((-45,-415,53,19),(45,-440,51,20),(5,-470,55,22),(170,-395,14,12),(230,-430,20,15))):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=gv((x,-2.45,z)))
    mound=bpy.context.object; mound.name=f'ship-place-spread-sand-{index}'; mound.scale=(rx,.42,rz); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); mound.data.materials.append(sand)

# One export root holds every named story place while preserving map coordinates.
world_root=root_obj('wasteland-ships-root',(0,0,0),'wasteland-ships')
for child in list(scene.objects):
    if child is not world_root and child.parent is None:
        parent(child,world_root)

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
    light_obj.location=gv((50,150,-180)); data.energy=36000; data.shape='DISK'; data.size=110

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
    bpy.ops.mesh.primitive_plane_add(size=1200, location=gv((0,-2.95,-440)))
    review_ground=bpy.context.object; review_ground.name='review-only mid-tone lake bed'
    review_material=bpy.data.materials.new('Review ground / neutral lake-bed earth'); review_material.diffuse_color=(.34,.31,.26,1)
    review_material.use_nodes=True; review_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.34,.31,.26,1)
    review_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
    review_ground.data.materials.append(review_material)
    # Render view and light objects are created only after GLB import.
    add_lighting()
    targets=[((-5,8,-423),(-45,5,-415),18),((170,16,-425),(170,12,-395),80),((245,9,-465),(230,0,-430),90)]
    view_sizes=((1600,320),(512,1024),(1536,512))
    for index,(loc,target,lens) in enumerate(targets):
        cam=camera(f'review-camera-{index}',loc,target,lens)
        scene.render.resolution_x,scene.render.resolution_y=view_sizes[index]
        scene.camera=cam; scene.render.filepath=str(raw/f'model-{index}.jpg'); bpy.ops.render.render(write_still=True)
    # Context at car height, 40 m away, and a top-down map view.
    for index,(loc,target,lens) in enumerate((((-5,8,-423),(-45,5,-415),18),((115,155,-445),(90,0,-440),45),((180,35,-455),(170,11,-395),46))):
        scene.render.resolution_x,scene.render.resolution_y=(1200,600)
        if index==2:
            scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.055,.085,1)
            scene.world.node_tree.nodes['Background'].inputs[1].default_value=.16
            for obj in scene.objects:
                if obj.type=='LIGHT': obj.data.energy=5500
        cam=camera(f'context-camera-{index}',loc,target,lens); scene.camera=cam; scene.render.filepath=str(raw/f'context-{index}.jpg'); bpy.ops.render.render(write_still=True)
    print(f'GLB: {out} ({out.stat().st_size} bytes)')
    print(f'Triangles: {sum(len(p.vertices) for o in bpy.data.objects if o.type=="MESH" for p in [o.data])}')

# A real +Y-up, metre-scale scene, with one named root per story place.
scene.camera=None
render_imported_review()
