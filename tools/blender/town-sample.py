"""Round 3 proof for shared Scablands town construction and materials."""
import argparse, json, math, sys
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--candidate',action='store_true');p.add_argument('--paths-only',action='store_true')
p.add_argument('--tin-photo',default='C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d503a008-f319-4f8c-8e2b-9e16908bde89.png');p.add_argument('--sand-photo',default='C:/Users/kyleb/.codex/generated_images/01a1ad6e-43d4-7433-8e9f-43e20e0258d9/exec-d7c1cbbb-f80e-4027-a01a-224d0467927c.png')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve();out=root/('.qa-dist/town-sample/sample.glb' if a.candidate else 'public/assets/models/wasteland/town/sample.glb');blend=root/'art-build/town/sample.blend'
if a.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'atlas':[str(root/'art-build/town/town-wear-atlas.png')],
                      'evidence':[str(root/a.render)] if a.render else []}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
tin_photo=Path(a.tin_photo);sand_photo=Path(a.sand_photo)
for source in (tin_photo,sand_photo):
    if not source.exists():raise FileNotFoundError(f'material reference missing: {source}; pass --tin-photo and --sand-photo')
materials=town.make_materials({'galvanised-tin':tin_photo,'rusted-steel':tin_photo,'sand':sand_photo});objects=[]
def box(name,loc,size,mat,bevel=.02):
    obj=town.cube(name,loc,size,mat,bevel);objects.append(obj);return obj
def shack(prefix,origin,w,d,h,workshop=False,angle=0,seed=0):
    x,y,z=origin;start=set(bpy.context.scene.objects)
    box(prefix+'-raised-floor',(x,y+.18,z),(w+.2,.25,d+.2),materials['weathered-plank'])
    box(prefix+'-collision-footprint',(x,y+.07,z),(w,.10,d),materials['cracked-concrete'],0)
    for sx in (-1,1):
        for sz in (-1,1):
            town.beam(prefix+'-corner-post',(x+sx*(w/2-.1),y+.2,z+sz*(d/2-.1)),(x+sx*(w/2-.1),y+h,z+sz*(d/2-.1)),.12,materials['weathered-plank'])
    # The street side is local -Z in every town art card.
    box(prefix+'-front-plank-wall',(x,y+.82,z-d/2),(w,1.15,.12),materials['weathered-plank'])
    town.corrugated_sheet(prefix+'-front-tin',(x,y+2.18,z-d/2),w,1.55,materials,bent=.07)
    for side in (-1,1):
        box(prefix+f'-side-plank-{side}',(x+side*w/2,y+.82,z),(.12,1.15,d),materials['weathered-plank'])
        town.corrugated_sheet(prefix+f'-side-tin-{side}',(x+side*w/2,y+2.18,z),d,1.55,materials,bent=side*.03,turn=math.pi/2)
    variation=town.building_variation(seed)
    town.varied_roof(prefix+'-varied-roof',(x,y+h+.08,z),w,d,materials,variation)
    for side in (-1,1):
        rib_count=max(5,round(w/.27))
        for rib in range(rib_count):
            rx=x-w*.51+rib*w/max(1,rib_count-1)
            town.beam(prefix+f'-roof-rib-{side}-{rib}',(rx,y+h+.01,z),(rx,y+h-.34,z+side*d*.47),.028,materials['iron-dark'])
        town.beam(prefix+f'-wire-tie-{side}',(x-w*.45,y+h+.17,z+side*d*.42),(x+w*.45,y+h+.17,z+side*d*.42),.025,materials['iron-dark'])
    # Pressed old car door with glass, handle, welds, and visibly torn repair strips.
    box(prefix+'-car-door',(x-.28,y+.95,z-d/2-.11),(.82,1.6,.10),materials['rusted-steel'])
    box(prefix+'-car-door-glass',(x-.28,y+1.72,z-d/2-.17),(.48,.34,.03),materials['dirty-glass'],.02)
    box(prefix+'-car-door-handle',(x+.04,y+1.03,z-d/2-.17),(.16,.055,.035),materials['galvanised-tin'],.012)
    town.rivet_strip(prefix+'-door-rivets',(x-.66,y+.34,z-d/2-.16),4,.20,materials['iron-dark'])
    town.weld_seam(prefix+'-lap-weld',(x-w*.43,y+1.95,z-d/2-.14),(x+w*.42,y+1.95,z-d/2-.14),materials['rusted-steel'])
    town.scaffold_bay(prefix+'-repair-scaffold',(x+w/2+.45,y,z-d*.1),.8,d*.72,h*.66,materials)
    if workshop:
        box(prefix+'-wide-open-bay',(x,y+1.15,z-d/2-.11),(1.5,1.35,.09),materials['iron-dark'])
        town.pipe_run(prefix+'-roof-pipe',[(x-w*.48,y+3.1,z-d*.5),(x-w*.48,y+3.55,z-d*.5),(x+w*.32,y+3.55,z-d*.5)],.07,materials['rusted-steel'])
        town.sandbag_row(prefix+'-sandbags',(x-w*.35,y+.35,z-d/2-.55),5,materials)
    else:
        town.hand_painted_sign(prefix+'-sign',(x+.62,y+2.55,z-d/2-.17),'SOLDER',materials)
        town.washing_line(prefix+'-washing-line',(x-w*.35,y+3.5,z-d*.55),(x+w*.35,y+3.2,z-d*.55),materials)
        # Lean-to salvaged from bent tin and a stove pipe patched at its elbow.
        town.beam(prefix+'-lean-post-a',(x-w*.54,y+.1,z-d*.40),(x-w*.54,y+1.85,z-d*.40),.075,materials['weathered-plank'])
        town.beam(prefix+'-lean-post-b',(x-w*.98,y+.1,z-d*.42),(x-w*.98,y+1.30,z-d*.42),.075,materials['rusted-steel'])
        lean=box(prefix+'-lean-to',(x-w*.76,y+1.62,z-d*.40),(w*.58,.07,d*.68),materials['galvanised-tin']);lean.rotation_euler[0]=-.16
        town.pipe_run(prefix+'-stovepipe',[(x-w*.34,y+2.5,z-d*.37),(x-w*.34,y+3.75,z-d*.37),(x-w*.10,y+3.98,z-d*.37)],.065,materials['iron-dark'])
    town.drum(prefix+'-drum',(x-w*.36,y+.65,z-d*.48),materials)
    town.tyre_stack(prefix+'-tyre-stack',(x+w*.34,y+.22,z-d*.35),materials,2)
    members=list(set(bpy.context.scene.objects)-start)
    rootobj=bpy.data.objects.new(prefix+'-root',None);bpy.context.collection.objects.link(rootobj)
    for obj in members:
        if obj.parent is None:obj.parent=rootobj
    rootobj.rotation_euler[2]=angle
    return rootobj

# The two proof buildings are on one sand pad with the required drawn 8 m grid.
town.cube('sample-sand-pad',(0,-.08,0),(40,.16,24),materials['sand'],.02)
for mark in (-16,-8,0,8,16):
    town.beam(f'8m-grid-x-{mark}',(-20,-.001,mark),(20,-.001,mark),.018,materials['cracked-concrete'])
    town.beam(f'8m-grid-z-{mark}',(mark,-.001,-12),(mark,-.001,12),.018,materials['cracked-concrete'])
sample_roots={
    'shack':shack('sample-1x1-shack',(-3.8,0,0),2.4,2.4,3.1,angle=math.radians(-4)),
    'workshop':shack('sample-3x2-workshop',(2.0,0,0),6.2,4.2,4.3,True,math.radians(3)),
}

# Render-only import of the actual, current in-game car for honest scale.
car_path=root/'public/assets/models/classics/stuttgart_959s.glb'
if not car_path.exists():raise FileNotFoundError(f'missing in-game scale car {car_path}')
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(car_path));car_objects=list(set(bpy.context.scene.objects)-before)
if not car_objects:raise RuntimeError('the in-game scale car did not import')
# Park it beyond the shack, on the same ground plane. Compute bounds from the
# imported meshes so the tyres sit on sand regardless of the donor origin.
car_meshes=[o for o in car_objects if o.type=='MESH']
if not car_meshes:raise RuntimeError('the in-game scale car has no mesh objects')
# Join the car's visible parts into one render-only mesh. Its donor hierarchy
# has separate wheel nodes, so moving a new parent can split those transforms.
bpy.ops.object.select_all(action='DESELECT')
for obj in car_meshes:obj.select_set(True)
bpy.context.view_layer.objects.active=car_meshes[0]
bpy.ops.object.join()
car= bpy.context.view_layer.objects.active
world=car.matrix_world.copy();car.parent=None;car.matrix_world=world
car_meshes=[car];car_objects=[car]
car_points=[o.matrix_world @ Vector(corner) for o in car_meshes for corner in o.bound_box]
car_bottom=min(v.z for v in car_points);car_center=(min(v.x for v in car_points)+max(v.x for v in car_points))/2
car_depth=(min(v.y for v in car_points)+max(v.y for v in car_points))/2
delta=Vector((-8.0-car_center,4.0-car_depth,-car_bottom))
world=car.matrix_world.copy();world.translation+=delta;car.matrix_world=world

if a.render:
    folder=Path(a.render);folder=folder if folder.is_absolute() else root/folder;folder.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.render.resolution_x=960;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=-.12
    scene.world=bpy.data.worlds.new('clear desert daylight');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.56,.58,.53,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.72
    for loc,power,size,color in [((7,-8,15),2700,8,(1,.93,.82)),((-7,-1,8),1700,9,(.88,.88,.82))]:
        bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.data.color=color
        light.rotation_euler=(Vector((0,2,0))-light.location).to_track_quat('-Z','Y').to_euler()
    # A small joined-proportion human marker and the real car carry scale.
    person_x,person_z=(9.0,-8.0)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=town.game_vector((person_x,.98,person_z)))
    person_body=bpy.context.object;person_body.name='scale-person-torso';person_body.scale=(.17,.11,.32);person_body.data.materials.append(materials['weathered-plank'])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.14,location=town.game_vector((person_x,1.48,person_z)))
    person_head=bpy.context.object;person_head.name='scale-person-head';person_head.data.materials.append(materials['faded-hand-paint'])
    person_objects=[person_body,person_head]
    for side in (-1,1):
        person_objects.append(town.beam(f'scale-person-arm-{side}',(person_x+side*.12,1.17,person_z),(person_x+side*.25,.70,person_z),.075,materials['weathered-plank']))
        person_objects.append(town.beam(f'scale-person-leg-{side}',(person_x+side*.07,.73,person_z),(person_x+side*.10,.12,person_z),.10,materials['iron-dark']))
    for o in car_objects:o.hide_render=False
    # Requested street of six distinct buildings, built from the same shared recipe.
    street=[]
    street_specs=[
        (-10,-4,2.3,2.5,3.0,-.08,'SOLDER', 'lean'),
        (-5.2,-4.2,2.8,2.4,3.8,.05,'WATER', 'tank'),
        (-.4,-4.0,2.4,2.7,3.1,-.04,'MENDER', 'awning'),
        (4.4,-4.3,3.0,2.5,4.1,.09,'WORKS', 'workshop'),
        (9.2,-4.0,2.3,2.7,3.2,-.06,'RADIO', 'mast'),
        (14.0,-4.2,2.7,2.5,3.6,.04,'COMMON', 'loft'),
    ]
    for i,(xx,zz,ww,dd,hh,ang,sign,style) in enumerate(street_specs):
        street_before=set(bpy.context.scene.objects)
        variation=town.building_variation(410+i)
        root_obj=shack(f'street-{i+1}',(xx,0,zz),ww,dd,hh,workshop=(style=='workshop'),angle=ang,seed=410+i)
        street.append(root_obj)
        # Give the demonstration street six readable silhouettes while keeping
        # every building on the same shared material and construction kit.
        if style=='tank':
            town.scaffold_bay(f'street-{i+1}-tank-stand',(xx+ww*.48,0,zz-dd*.1),.9,.8,1.8,materials)
            bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.55,depth=.9,location=town.game_vector((xx+ww*.48,2.25,zz-dd*.1)))
            bpy.context.object.name=f'street-{i+1}-rain-tank';bpy.context.object.data.materials.append(materials['galvanised-tin'])
        elif style=='awning':
            awning=town.cube(f'street-{i+1}-canvas-awning',(xx,2.7,zz+dd*.72),(ww*1.25,.12,.95),materials['patched-canvas'])
            awning.rotation_euler[0]=-.12
            town.beam(f'street-{i+1}-awning-brace-a',(xx-ww*.55,.1,zz+dd*.45),(xx-ww*.55,2.65,zz+dd*.45),.07,materials['rusted-steel'])
            town.beam(f'street-{i+1}-awning-brace-b',(xx+ww*.55,.1,zz+dd*.45),(xx+ww*.55,2.65,zz+dd*.45),.07,materials['rusted-steel'])
        elif style=='mast':
            town.beam(f'street-{i+1}-radio-mast',(xx+ww*.36,hh,zz-dd*.32),(xx+ww*.36,hh+2.5,zz-dd*.32),.06,materials['rusted-steel'])
            for level in (hh+.7,hh+1.4):
                town.beam(f'street-{i+1}-radio-crossbar-{level}',(xx+ww*.1,level,zz-dd*.32),(xx+ww*.62,level,zz-dd*.32),.045,materials['galvanised-tin'])
        elif style=='loft':
            town.scaffold_bay(f'street-{i+1}-loft',(xx-ww*.52,0,zz+dd*.22),1.0,.9,2.4,materials)
            town.washing_line(f'street-{i+1}-loft-line',(xx-ww*.7,3.0,zz+dd*.2),(xx+ww*.2,3.3,zz+dd*.2),materials)
        if variation['clutter']=='stack':
            town.tyre_stack(f'street-{i+1}-roof-tire-stack',(xx+ww*.42,hh+.25,zz-dd*.2),materials,2)
            town.drum(f'street-{i+1}-yard-drum',(xx-ww*.48,.55,zz-dd*.38),materials)
        elif variation['clutter']=='lean-to':
            town.beam(f'street-{i+1}-extra-lean-post',(xx+variation['lean_side']*ww*.56,.1,zz-dd*.2),
                      (xx+variation['lean_side']*ww*.88,1.6,zz-dd*.2),.07,materials['weathered-plank'])
            lean=box(f'street-{i+1}-extra-lean-sheet',(xx+variation['lean_side']*ww*.72,1.45,zz-dd*.2),
                     (ww*.48,.07,dd*.58),materials[variation['accent']]);lean.rotation_euler[0]=-.19
        if style!='workshop':
            town.hand_painted_sign(f'street-{i+1}-sign',(xx+ww*.26,2.8,zz-dd*.5-.18),sign,materials)
        for obj in set(bpy.context.scene.objects)-street_before:
            if obj is not root_obj and obj.parent is None:
                world=obj.matrix_world.copy();obj.parent=root_obj;obj.matrix_world=world
    street_objects={obj for obj in bpy.context.scene.objects if obj.name.startswith('street-')}
    # Camera views: a matched three-quarter and driver's-eye image per proof building.
    def render_view(path,loc,target,lens=48):
        bpy.ops.object.camera_add(location=town.game_vector(loc));cam=bpy.context.object;cam.data.lens=lens
        cam.rotation_euler=(town.game_vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
        scene.render.filepath=str(folder/path);bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)
    def move_car_to(gx,gz):
        points=[o.matrix_world @ Vector(corner) for o in car_meshes for corner in o.bound_box]
        bottom=min(v.z for v in points);center_x=(min(v.x for v in points)+max(v.x for v in points))/2
        depth_y=(min(v.y for v in points)+max(v.y for v in points))/2
        delta=Vector((gx-center_x,-gz-depth_y,-bottom))
        world=car.matrix_world.copy();world.translation+=delta;car.matrix_world=world
    def set_render_visibility(root_obj, visible):
        root_obj.hide_render=not visible
        pending=list(root_obj.children)
        while pending:
            obj=pending.pop();obj.hide_render=not visible;pending.extend(obj.children)
    for ident,(cx,cz,width,height) in [('shack',(-3.8,0,2.4,3.8)),('workshop',(2,0,6.2,4.8))]:
        for o in street_objects:o.hide_render=True
        for sample_id,sample_root in sample_roots.items():set_render_visibility(sample_root,sample_id==ident)
        for o in car_objects:o.hide_render=True
        for obj in person_objects:obj.hide_render=True
        car_x,car_z=(cx+width*2.25,cz-width*.55)
        move_car_to(car_x,car_z)
        above_lens=25 if width<3 else 34
        render_view(f'{ident}-above-45.png',(cx+width*2.1,height+width*1.7,cz-width*2.0),(cx+width*.45,1.4,cz-width*.1),above_lens)
        car_x,car_z=(cx+width*2.25,cz-width*.65)
        move_car_to(car_x,car_z)
        render_view(f'{ident}-driver-seat.png',(cx+width*.45,1.65,cz-width*2.6),(cx,min(height*.58,2.4),cz-width*.25),18)
        set_render_visibility(sample_roots[ident],True)
        for o in street_objects:o.hide_render=False
    # Full overhead street; all six silhouettes remain legible and spaced.
    for sample_root in sample_roots.values():set_render_visibility(sample_root,False)
    for o in street_objects:o.hide_render=False
    for o in car_objects:o.hide_render=False
    move_car_to(11.0,-8.0)
    for obj in person_objects:obj.hide_render=False
    render_view('street-six-overhead.png',(2,28,-22),(2,0,-4),33)
    # Actual Tin Town render is a view from its committed GLB, framed on shack 0.
    for o in street_objects:o.hide_render=True
    for o in car_objects:o.hide_render=True
    for sample_root in sample_roots.values():set_render_visibility(sample_root,True)
    for o in street_objects:
        bpy.data.objects.remove(o,do_unlink=True)
    for o in reversed(car_objects):
        if o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
    for obj in person_objects:bpy.data.objects.remove(obj,do_unlink=True)

# Save the editable recipe result and GLB with only the sample pair, never the
# imported car or the render-only six-building street.
blend.parent.mkdir(parents=True,exist_ok=True);out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend));town.export_glb(out)
