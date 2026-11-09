"""Build and inspect the Wasteland town funground from welded salvage."""
import json
import math
import subprocess
import sys
from pathlib import Path

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
root = Path(args[args.index('--root') + 1]).resolve() if '--root' in args else Path.cwd().resolve()
evidence = Path(args[args.index('--evidence') + 1]).resolve() if '--evidence' in args else root / '.evidence/2026-11-08/TOWN-ART-FUN/round-25'
out = root / 'public/assets/models/wasteland/town/fun.glb'
sheet = root / 'docs/board/looks/town-art-fun/round-25.jpg'
textures = root / 'public/assets/models/wasteland/town/textures'
if '--paths-only' in args:
    print(json.dumps({'blend': [], 'glb': [str(out)], 'evidence': [str(evidence)], 'summary': [str(sheet)]}))
    raise SystemExit(0)

import bpy
import numpy as np
from mathutils import Matrix, Vector

if '--review-only' in args:
    bpy.ops.import_scene.gltf(filepath=str(out))
    scene=bpy.context.scene
    family=bpy.data.objects.get('town-fun')
    if family is None: raise RuntimeError('exported GLB lost town-fun family root')
    tavern_root=bpy.data.objects.get('tavern')
    truck_root=bpy.data.objects.get('tavern:truck')
    if tavern_root is None or truck_root is None: raise RuntimeError('exported tavern or truck root is missing')
    def hide_tree(obj,value):
        obj.hide_render=value
        for child in obj.children: hide_tree(child,value)
    for child in family.children:
        if child != tavern_root: hide_tree(child,True)
    scene.render.engine='BLENDER_EEVEE_NEXT'; scene.eevee.taa_render_samples=24
    scene.render.resolution_x=640; scene.render.resolution_y=480; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
    scene.render.film_transparent=False; scene.view_settings.view_transform='Standard'
    world=bpy.data.worlds.new('Tavern review grey'); world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.43,.43,.43,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8; scene.world=world
    groundmat=bpy.data.materials.new('Tavern review ground'); groundmat.diffuse_color=(.43,.43,.43,1)
    groundmat.use_nodes=True; groundmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.43,.43,.43,1)
    bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.04)); bpy.context.object.name='Review ground'; bpy.context.object.data.materials.append(groundmat)
    def aim(obj,target):
        direction=Vector(target)-obj.location
        obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    def light(name,loc,power,size):
        data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
        obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); obj.location=loc; aim(obj,(0,0,1.6))
    light('soft studio key',(8,12,17),1800,12); light('soft studio fill',(-10,-6,12),1100,10)
    camera=bpy.data.objects.new('Tavern bounds camera',bpy.data.cameras.new('Tavern bounds camera'))
    scene.collection.objects.link(camera); scene.camera=camera; camera.data.type='ORTHO'
    evidence.mkdir(parents=True,exist_ok=True)
    textures=root/'public/assets/models/wasteland/town/textures'
    if '--coaster-only' in args:
        coaster_root=bpy.data.objects.get('scrap-coaster')
        train_root=bpy.data.objects.get('scrap-coaster:train')
        if coaster_root is None or train_root is None: raise RuntimeError('exported coaster or train is missing')
        for child in family.children: hide_tree(child,child!=coaster_root)
        hide_tree(coaster_root,False)
        for obj in scene.objects:
            if obj.type=='MESH' and obj.name!='Review ground':
                obj.hide_render=not obj.name.startswith('scrap-coaster:')
        scene.render.engine='BLENDER_EEVEE_NEXT'; scene.eevee.taa_render_samples=24
        scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'
        scene.render.image_settings.color_mode='RGB'; scene.render.film_transparent=False
        scene.view_settings.view_transform='Standard'
        world=bpy.data.worlds.new('Coaster review grey'); world.use_nodes=True
        world.node_tree.nodes['Background'].inputs['Color'].default_value=(.42,.42,.42,1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8; scene.world=world
        gm=bpy.data.materials.new('Coaster review ground'); gm.diffuse_color=(.42,.42,.42,1); gm.use_nodes=True
        gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.42,.42,.42,1)
        bpy.ops.mesh.primitive_plane_add(size=300,location=(0,0,-.035)); bpy.context.object.name='Review ground'; bpy.context.object.data.materials.append(gm)
        def aim_coaster(obj,target,world_up=(0,0,1)):
            direction=(Vector(target)-obj.location).normalized()
            up=Vector(world_up).normalized()
            right=direction.cross(up).normalized()
            screen_up=right.cross(direction).normalized()
            obj.rotation_euler=Matrix((right,screen_up,-direction)).transposed().to_quaternion().to_euler()
        for name,loc,power,size in [('key',(5,-12,18),2300,13),('fill',(-13,10,14),1200,11)]:
            ld=bpy.data.lights.new('Coaster '+name,'AREA'); ld.energy=power; ld.shape='DISK'; ld.size=size
            lo=bpy.data.objects.new('Coaster '+name,ld); scene.collection.objects.link(lo); lo.location=loc; aim_coaster(lo,(0,0,5.5))
        camera=bpy.data.objects.new('Coaster camera',bpy.data.cameras.new('Coaster camera')); scene.collection.objects.link(camera); scene.camera=camera; camera.data.type='ORTHO'
        evidence.mkdir(parents=True,exist_ok=True)
        views=[('side',(0,-1,0),'scrap-coaster-side.jpg',43),
               ('front',(-1,0,0),'scrap-coaster-front.jpg',13.2),
               ('rear',(1,0,0),'scrap-coaster-rear.jpg',13.2),
               ('above',(0,0,1),'scrap-coaster-top.jpg',43)]
        target=Vector((0,0,5.9))
        for name,direction,photo_name,ortho in views:
            direction=Vector(direction).normalized(); camera.location=target+direction*52
            aim_coaster(camera,target,(0,1,0) if name=='above' else (0,0,1))
            ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
            scene.render.resolution_x,scene.render.resolution_y=ref.size; bpy.data.images.remove(ref)
            camera.data.ortho_scale=ortho; scene.render.filepath=str(evidence/f'scrap-coaster-{name}-model.png')
            bpy.ops.render.render(write_still=True); print('rendered scrap-coaster',name)
        for name,direction,ortho in [('three-quarter-a',(-1,-1,.55),45),('three-quarter-b',(1,1,.55),45),
                                    ('mayor',(-1,-1,math.sqrt(2)),46)]:
            direction=Vector(direction).normalized(); camera.location=target+direction*58; aim_coaster(camera,target)
            scene.render.resolution_x,scene.render.resolution_y=1000,700; camera.data.ortho_scale=ortho
            scene.render.filepath=str(evidence/f'scrap-coaster-{name}.png'); bpy.ops.render.render(write_still=True)
            print('rendered scrap-coaster',name)
        raise SystemExit(0)
    if '--mud-pit-only' in args:
        pit_root=bpy.data.objects.get('mud-pit')
        if pit_root is None:raise RuntimeError('exported mud-pit building is missing')
        for child in family.children:hide_tree(child,child!=pit_root)
        hide_tree(pit_root,False)
        old_ground=bpy.data.objects.get('Review ground')
        if old_ground is not None:bpy.data.objects.remove(old_ground,do_unlink=True)
        ground_mesh=bpy.data.meshes.new('Review ground ring around the excavated pit')
        ground_verts=[];ground_faces=[]
        def ground_quad(x0,x1,y0,y1):
            n=len(ground_verts);ground_verts.extend(((x0,y0,-.04),(x1,y0,-.04),(x1,y1,-.04),(x0,y1,-.04)));ground_faces.append((n,n+1,n+2,n+3))
        ground_quad(-16,16,-16,-10.2);ground_quad(-16,16,10.2,16)
        ground_quad(-16,-10.2,-10.2,10.2);ground_quad(10.2,16,-10.2,10.2)
        ground_mesh.from_pydata(ground_verts,[],ground_faces);ground_mesh.materials.append(groundmat);ground_mesh.update()
        ground_obj=bpy.data.objects.new('Review ground',ground_mesh);scene.collection.objects.link(ground_obj)
        for obj in scene.objects:
            if obj.type=='MESH' and obj.name!='Review ground':obj.hide_render=not obj.name.startswith('mud-pit:')
        target=Vector((0,0,.8));camera.data.type='ORTHO';camera.data.lens=50
        scene.render.resolution_percentage=100
        for obj in scene.objects:
            if obj.type=='MESH':obj.hide_render=obj.name not in ('mud-pit:earth-bowl','Review ground')
        views=[('side',(1,0,0),'mud-pit-side.jpg'),('front',(0,1,0),'mud-pit-front.jpg'),
               ('rear',(0,-1,0),'mud-pit-rear.jpg'),('above',(0,0,1),'mud-pit-top.jpg')]
        for name,direction,photo_name in views:
            ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
            scene.render.resolution_x,scene.render.resolution_y=ref.size;bpy.data.images.remove(ref)
            direction=Vector(direction).normalized();camera.location=target+direction*42;aim(camera,target)
            camera.data.ortho_scale=23.5
            scene.render.filepath=str(evidence/f'mud-pit-{name}-model.png');bpy.ops.render.render(write_still=True)
            print('rendered mud-pit',name)
        for obj in scene.objects:
            if obj.type=='MESH':obj.hide_render=not (obj.name=='Review ground' or obj.name.startswith('mud-pit:'))
        scene.render.resolution_x,scene.render.resolution_y=1000,700
        target=Vector((0,-3.2,.8))
        for name,direction,ortho in [('three-quarter-a',(1,1,.72),32),('three-quarter-b',(-1,-1,.72),32),('mayor',(1,1,1),32)]:
            direction=Vector(direction).normalized();camera.location=target+direction*48;aim(camera,target)
            camera.data.ortho_scale=ortho
            scene.render.filepath=str(evidence/f'mud-pit-{name}.png');bpy.ops.render.render(write_still=True)
            print('rendered mud-pit',name)
        stand_root=Vector((0,-13,1.55))
        for obj in scene.objects:
            if obj.type=='MESH':obj.hide_render=not (obj.name=='Review ground' or obj.name.startswith('mud-pit:grandstand'))
        for name,direction,photo_name in [('stand-side',(1,0,0),'mud-pit-stand-side.jpg'),
                ('stand-front',(0,1,0),'mud-pit-stand-front.jpg'),
                ('stand-rear',(0,-1,0),'mud-pit-stand-rear.jpg'),('stand-above',(0,0,1),'mud-pit-stand-top.jpg')]:
            ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
            scene.render.resolution_x,scene.render.resolution_y=ref.size;bpy.data.images.remove(ref)
            direction=Vector(direction).normalized();camera.location=stand_root+direction*16;aim(camera,stand_root)
            camera.data.ortho_scale=5.5 if name=='stand-side' else 9.2
            scene.render.filepath=str(evidence/f'mud-pit-{name}-model.png');bpy.ops.render.render(write_still=True)
            print('rendered mud-pit',name)
        raise SystemExit(0)
    if '--stalls-only' in args:
        scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=24
        scene.render.resolution_percentage=100;scene.render.resolution_x=1024;scene.render.resolution_y=1024
        scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
        scene.view_settings.view_transform='Standard'
        camera.data.type='ORTHO';target=Vector((0,0,1.6))
        # Blender imports glTF Y-up as its native Z-up. Check one exported
        # stall piece before judging the family: its .68 m height must return
        # on Blender Z, which is exported Y, not on either horizontal axis.
        probe=bpy.data.objects.get('fun-stall-a:counter-kick')
        if probe is None: raise RuntimeError('exported stall lost counter-kick axis probe')
        probe_bounds=[probe.matrix_world @ Vector(c) for c in probe.bound_box]
        probe_size=[max(p[i] for p in probe_bounds)-min(p[i] for p in probe_bounds) for i in range(3)]
        if abs(probe_size[2]-.68)>.03 or abs(probe_size[1]-1.04)>.03 or probe_size[2]>=probe_size[1]:
            raise RuntimeError(f'counter-kick height is not exported Y: imported dimensions {probe_size}')
        print('EXPORTED Y-UP AXIS CHECK fun-stall-a:counter-kick',tuple(round(v,3) for v in probe_size))
        # The source named "side" is the broad facade/elevation view. Match
        # that exact view for silhouette; keep the true narrow profile too.
        views=[('side',(.15,1,.12)),('profile',(1,0,0)),('rear',(0,-1,0)),('above',(0,0,1))]
        for stall_id in ('fun-stall-a','fun-stall-b'):
            for obj in scene.objects:
                if obj.type not in ('CAMERA','LIGHT'):
                    obj.hide_render=not (obj.name=='Review ground' or obj.name.startswith(stall_id+':'))
            for name,direction in views:
                photo_view={'side':'side','rear':'rear','above':'top'}.get(name)
                if photo_view:
                    source=bpy.data.images.load(str(textures/f'{stall_id}-{photo_view}.jpg'),check_existing=True)
                    scene.render.resolution_x,scene.render.resolution_y=source.size
                    bpy.data.images.remove(source)
                else:
                    scene.render.resolution_x=1000;scene.render.resolution_y=1000
                camera.location=target+Vector(direction)*10
                camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
                camera.data.ortho_scale=(3.2 if name in ('side','rear') else 6.7) if photo_view else 4.3
                scene.render.filepath=str(evidence/f'{stall_id}-{name}-model.png');bpy.ops.render.render(write_still=True)
            scene.render.resolution_x=1000;scene.render.resolution_y=720
            for label,direction in [('three-left',(-1,-1,.65)),('three-right',(1,-1,.65)),('mayor',(1,1,1))]:
                camera.location=target+Vector(direction).normalized()*20
                aim(camera,target)
                camera.data.ortho_scale=7.3
                scene.render.filepath=str(evidence/f'{stall_id}-{label}.png');bpy.ops.render.render(write_still=True)
        raise SystemExit(0)
    if '--wreck-only' in args:
        wreck_root=bpy.data.objects.get('wreck-ring')
        if wreck_root is None: raise RuntimeError('exported wreck-ring is missing')
        for child in family.children: hide_tree(child,child!=wreck_root)
        hide_tree(wreck_root,False)
        for obj in scene.objects:
            if obj.type=='MESH' and obj.name!='Review ground':
                obj.hide_render=not obj.name.startswith('wreck-ring:')
        car_root=bpy.data.objects.get('wreck-ring:car-1')
        if car_root is None: raise RuntimeError('exported wreck-ring car-1 is missing')
        for child in wreck_root.children: hide_tree(child,True)
        hide_tree(car_root,False)
        car_target=car_root.matrix_world.translation+Vector((0,.48,0))
        match_views=[('match-side',(1,0,.03),'wreck-ring-shell-side.jpg',3.0),
                     ('match-front',(0,-1,.03),'wreck-ring-shell-front.jpg',2.7),
                     ('match-rear',(0,1,.03),'wreck-ring-shell-rear.jpg',2.7),
                     ('match-above',(0,0,1),'wreck-ring-shell-above.jpg',3.0)]
        for name,direction,photo_name,ortho in match_views:
            direction=Vector(direction).normalized()
            ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
            scene.render.resolution_x,scene.render.resolution_y=ref.size
            bpy.data.images.remove(ref)
            camera.location=car_target+direction*8; aim(camera,car_target); camera.data.ortho_scale=ortho
            scene.render.filepath=str(evidence/f'wreck-ring-{name}.png')
            bpy.ops.render.render(write_still=True)
            print(f'rendered wreck-ring {name}')
        hide_tree(wreck_root,False)
        scene.render.resolution_x,scene.render.resolution_y=1000,700
        ring_views=[('three-quarter-a',(1,1,.65),10.2),
                    ('three-quarter-b',(-1,-1,.65),10.2),
                    ('mayor',(1,1,1),10.2),
                    ('whole-above',(0,0,1),9.8)]
        target=Vector((0,0,.4))
        for name,direction,ortho in ring_views:
            if name=='whole-above':
                scene.render.resolution_x=900; scene.render.resolution_y=900
                ortho=9.6
            direction=Vector(direction).normalized()
            camera.location=target+direction*18; aim(camera,target); camera.data.ortho_scale=ortho
            scene.render.filepath=str(evidence/f'wreck-ring-{name}.png')
            bpy.ops.render.render(write_still=True)
            print(f'rendered wreck-ring {name}')
        raise SystemExit(0)
    if '--fountain-only' in args:
        fountain_root=bpy.data.objects.get('fountain')
        if fountain_root is None: raise RuntimeError('exported fountain is missing')
        for child in family.children: hide_tree(child,child!=fountain_root)
        hide_tree(fountain_root,False)
        # Several town buildings share world origin. Some helper meshes are
        # exported as siblings of their root, so hide by the named family too.
        for obj in scene.objects:
            if obj.type=='MESH' and obj.name!='Review ground':
                obj.hide_render=not obj.name.startswith('fountain:')
        target=Vector((0,0,.9))
        views=[('side',(1,0,.03),'fountain-side.jpg',6.8),('front',(0,1,0),'fountain-front.jpg',7.0),
               ('rear',(0,-1,0),'fountain-rear.jpg',7.0),('above',(0,0,1),'fountain-above.jpg',8.0),
               ('three-quarter-a',(1,.75,.65),None,8.0),('three-quarter-b',(-1,-.75,.65),None,8.0),
               ('mayor',(1,1,1),None,8.0)]
        for name,direction,photo_name,ortho in views:
            if photo_name:
                ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
                scene.render.resolution_x,scene.render.resolution_y=ref.size
                bpy.data.images.remove(ref)
            else:
                scene.render.resolution_x,scene.render.resolution_y=1000,700
            direction=Vector(direction).normalized()
            camera.location=target+direction*24; aim(camera,target); camera.data.ortho_scale=ortho
            scene.render.filepath=str(evidence/f'fountain-{name}.png')
            bpy.ops.render.render(write_still=True)
            print(f'rendered fountain {name}')
        raise SystemExit(0)
    if '--statue-only' in args:
        statue_root=bpy.data.objects.get('statue')
        if statue_root is None: raise RuntimeError('exported statue is missing')
        for child in family.children: hide_tree(child,child!=statue_root)
        hide_tree(statue_root,False)
        for obj in scene.objects:
            if obj.type=='MESH' and obj.name!='Review ground':
                obj.hide_render=not obj.name.startswith('statue:')
        scene.render.engine='BLENDER_EEVEE_NEXT'; scene.eevee.taa_render_samples=24
        scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'
        scene.render.image_settings.color_mode='RGB'; scene.render.film_transparent=False
        scene.view_settings.view_transform='Standard'
        world=bpy.data.worlds.new('Statue review grey'); world.use_nodes=True
        world.node_tree.nodes['Background'].inputs['Color'].default_value=(.42,.42,.42,1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8; scene.world=world
        gm=bpy.data.materials.new('Statue review ground'); gm.diffuse_color=(.42,.42,.42,1); gm.use_nodes=True
        gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.42,.42,.42,1)
        bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.035)); bpy.context.object.name='Review ground'; bpy.context.object.data.materials.append(gm)
        def aim_statue(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
        for name,loc,power,size in [('key',(7,-8,13),1600,9),('fill',(-7,6,9),900,8)]:
            ld=bpy.data.lights.new('Statue '+name,'AREA'); ld.energy=power; ld.shape='DISK'; ld.size=size
            lo=bpy.data.objects.new('Statue '+name,ld); scene.collection.objects.link(lo); lo.location=loc; aim_statue(lo,(0,0,2.7))
        camera=bpy.data.objects.new('Statue camera',bpy.data.cameras.new('Statue camera')); scene.collection.objects.link(camera); scene.camera=camera; camera.data.type='ORTHO'
        evidence.mkdir(parents=True,exist_ok=True)
        views=[('side',(1,0,0),'statue-side.jpg',6.0),('front',(0,1,0),'statue-front.jpg',6.0),
               ('rear',(0,-1,0),'statue-rear.jpg',6.0),('above',(0,0,1),'statue-above-r16.jpg',6.0),
               ('three-quarter-a',(1,-1,.65),None,7.2),('three-quarter-b',(-1,1,.65),None,7.2),
               ('mayor',(1,-1,1),None,7.2)]
        for name,direction,photo_name,ortho in views:
            target=Vector((0,-.15,2.8)); direction=Vector(direction).normalized()
            camera.location=target+direction*24; aim_statue(camera,target); camera.data.ortho_scale=ortho
            if photo_name:
                ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
                scene.render.resolution_x,scene.render.resolution_y=ref.size
                bpy.data.images.remove(ref)
            else:
                scene.render.resolution_x,scene.render.resolution_y=900,650
            scene.render.filepath=str(evidence/f'statue-{name}.png'); bpy.ops.render.render(write_still=True)
            print('rendered statue',name)
        raise SystemExit(0)
    truck_bounds=[]
    for obj in truck_root.children_recursive:
        if obj.type=='MESH':
            truck_bounds.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not truck_bounds: raise RuntimeError('exported truck has no visible geometry')
    truck_min=Vector(tuple(min(p[i] for p in truck_bounds) for i in range(3)))
    truck_max=Vector(tuple(max(p[i] for p in truck_bounds) for i in range(3)))
    truck_target=(truck_min+truck_max)*.5
    truck_size=max(truck_max-truck_min)
    truck_views=[
        ('truck-side',(0,1,.10),'tavern-truck-side.jpg'),
        ('truck-front',(1,0,.10),'tavern-truck-front.jpg'),
        ('truck-rear',(-1,0,.10),'tavern-truck-rear.jpg'),
        ('truck-top',(0,0,1),'tavern-truck-top.jpg'),
        ('truck-three-quarter-road',(-.65,-.65,.45),None),
        ('truck-three-quarter-rear',(.65,.65,.45),None),
    ]
    for name,direction,photo_name in truck_views:
        # Show only the truck for direct comparison with its photo.
        hide_tree(tavern_root,True)
        hide_tree(truck_root,False)
        direction=Vector(direction).normalized()
        camera.location=truck_target+direction*(truck_size*3.1)
        aim(camera,truck_target); camera.data.ortho_scale=truck_size*1.38
        model_path=evidence/f'{name}.png'
        scene.render.filepath=str(model_path); bpy.ops.render.render(write_still=True)
    for child in family.children:
        hide_tree(child,child!=tavern_root)
    hide_tree(tavern_root,False)
    hide_tree(truck_root,False)
    views=[
        ('side',(-1,0,.16),'tavern-side.jpg',False),
        ('front',(0,1,.16),'tavern-front.jpg',False),
        ('rear',(0,-1,.16),'tavern-rear.jpg',False),
        ('above',(0,0,1),'tavern-top.jpg',False),
        ('truck-wall',(0,1,.16),'tavern-front-with-truck.jpg',True),
        ('three-quarter-road',(-.65,1,.58),None,True),
        ('three-quarter-rear',(.65,-1,.58),None,True),
        ('mayor',(-.5,1,.95),None,True),
    ]
    for name,direction,photo_name,show_truck in views:
        hide_tree(truck_root,not show_truck)
        target=Vector((0,0,3.35)); direction=Vector(direction).normalized()
        camera.location=target+direction*30; aim(camera,target); camera.data.ortho_scale=11.5
        scene.render.filepath=str(evidence/f'tavern-{name}.png'); bpy.ops.render.render(write_still=True)
        print(f'rendered tavern {name}')
    wheel_root=bpy.data.objects.get('big-wheel')
    if wheel_root is None: raise RuntimeError('exported big-wheel is missing')
    for child in family.children: hide_tree(child,child!=wheel_root)
    hide_tree(wheel_root,False)
    wheel_views=[('side',(1,0,0),'big-wheel-side.jpg'),('front',(0,-1,0),'big-wheel-front.jpg'),
        ('rear',(0,1,0),'big-wheel-rear.jpg'),('above',(0,0,1),'big-wheel-top.jpg'),
        ('three-quarter-a',(1,-1,.65),None),('three-quarter-b',(-1,1,.65),None),
        ('mayor',(-1,-1,1),None)]
    for name,direction,_photo_name in wheel_views:
        direction=Vector(direction).normalized(); target=Vector((0,0,5.8))
        camera.location=target+direction*30; aim(camera,target); camera.data.ortho_scale=20
        scene.render.resolution_x=900; scene.render.resolution_y=600
        scene.render.filepath=str(evidence/f'big-wheel-{name}.png'); bpy.ops.render.render(write_still=True)
        print(f'rendered big wheel {name}')
    drive_root=bpy.data.objects.get('drive-in')
    if drive_root is None: raise RuntimeError('exported drive-in is missing')
    drive_tree={drive_root,*drive_root.children_recursive}
    for node in scene.objects:
        if node.type=='MESH' and node.name!='Review ground':
            node.hide_render=node not in drive_tree
    drive_centre=Vector((0,0,0))
    # The four matches show the billboard itself; the remaining views show the
    # curved parking rows and projector hut inside the full footprint.
    drive_views=[
        ('match-side',(1,0,0),'drive-in-side.jpg',True),
        ('match-front',(0,1,0),'drive-in-front.jpg',True),
        ('match-rear',(0,-1,0),'drive-in-rear.jpg',True),
        ('match-above',(0,0,1),'drive-in-above.jpg',True),
        ('three-quarter-road',(1,1,.48),None,False),
        ('three-quarter-yard',(-1,1,.48),None,False),
        ('mayor',(1,1,1),None,False),
    ]
    for name,direction,photo_name,screen_only in drive_views:
        for obj in drive_root.children_recursive:
            if obj.type=='MESH' and obj.name.startswith('drive-in:wreck-'):
                obj.hide_render=screen_only
        direction=Vector(direction).normalized()
        if photo_name:
            ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
            width,height=ref.size
            bpy.data.images.remove(ref)
            scene.render.resolution_x=width; scene.render.resolution_y=height
            ortho=9 if name=='match-side' else 23
        else:
            scene.render.resolution_x=1000; scene.render.resolution_y=700
            ortho=32
        target=Vector((0,8.75,3.7)) if name in ('match-side','match-above') else Vector((0,0,3.7))
        camera.location=target+direction*42; aim(camera,target); camera.data.ortho_scale=ortho
        scene.render.filepath=str(evidence/f'drive-in-{name}.png')
        bpy.ops.render.render(write_still=True)
        print(f'rendered drive-in {name}')
    fountain_root=bpy.data.objects.get('fountain')
    if fountain_root is None: raise RuntimeError('exported fountain is missing')
    for child in family.children: hide_tree(child,child!=fountain_root)
    hide_tree(fountain_root,False)
    fountain_target=Vector((0,0,.9))
    fountain_views=[
        ('side',(1,0,.03),'fountain-side.jpg',6.8),
        ('front',(0,1,0),'fountain-front.jpg',7.0),
        ('rear',(0,-1,0),'fountain-rear.jpg',7.0),
        ('above',(0,0,1),'fountain-above.jpg',8.0),
        ('three-quarter-a',(1,1,.65),None,8.0),
        ('three-quarter-b',(-1,-1,.65),None,8.0),
        ('mayor',(1,1,1),None,8.0),
    ]
    for name,direction,photo_name,ortho in fountain_views:
        direction=Vector(direction).normalized()
        if photo_name:
            ref=bpy.data.images.load(str(textures/photo_name),check_existing=True)
            width,height=ref.size
            bpy.data.images.remove(ref)
            scene.render.resolution_x=width; scene.render.resolution_y=height
        else:
            scene.render.resolution_x=1000; scene.render.resolution_y=700
        camera.location=fountain_target+direction*24; aim(camera,fountain_target); camera.data.ortho_scale=ortho
        scene.render.filepath=str(evidence/f'fountain-{name}.png')
        bpy.ops.render.render(write_still=True)
        print(f'rendered fountain {name}')
    raise SystemExit(0)

sys.path.insert(0, str(root / 'tools/blender'))
import town_base as town
import photo_carve
from photo_carve import carve_object, lift_if_dark
from photo_model import Mesh as PhotoMesh, Photo, lathe, slab, trace
from hull_model import tyre

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
tex = root / 'public/assets/models/wasteland/town/textures'
mat = town.make_materials({
    'galvanised-tin': tex / 'corrugated-tin.jpg',
    'rusted-steel': tex / 'rusted-steel.jpg',
    'weathered-plank': tex / 'bleached-plank.jpg',
    'cracked-concrete': tex / 'dirt.jpg',
    'faded-hand-paint': tex / 'paint-blue.jpg',
    'sand': tex / 'wet-brown-earth.jpg',
    'patched-canvas': tex / 'patched-canvas.jpg',
})
def flat_material(name, color, alpha=1.0, metallic=0.0):
    material=bpy.data.materials.new(name); material.diffuse_color=(*color,alpha); material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,alpha);shader.inputs['Roughness'].default_value=.84
    shader.inputs['Metallic'].default_value=metallic
    if alpha<1:
        shader.inputs['Alpha'].default_value=alpha;material.surface_render_method='DITHERED'
    return material

def photo_crop_material(name, source_path, crop):
    """Pack a useful photo crop as a real material swatch in the GLB."""
    source=bpy.data.images.load(str(source_path),check_existing=True)
    sw,sh=source.size
    source_pixels=np.empty(sw*sh*4,dtype=np.float32);source.pixels.foreach_get(source_pixels)
    source_pixels=source_pixels.reshape((sh,sw,4))
    x0,y0,x1,y1=crop
    # Blender's image buffer starts at the bottom row; crop coordinates in the
    # recipe are read from the photographed image's top-left origin.
    pixels=source_pixels[sh-y1:sh-y0,x0:x1,:3].copy()
    bpy.data.images.remove(source)
    height,width=pixels.shape[:2]
    image=bpy.data.images.new(name+' photo crop',width=width,height=height,alpha=False)
    rgba=np.ones((height,width,4),dtype=np.float32);rgba[:,:,:3]=pixels
    image.pixels.foreach_set(rgba.ravel());image.pack()
    material=bpy.data.materials.new(name);material.use_nodes=True
    material.node_tree.nodes.clear()
    texture=material.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image
    texture.interpolation='Linear';texture.extension='REPEAT'
    shader=material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Roughness'].default_value=.91
    output=material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color'])
    material.node_tree.links.new(shader.outputs[0],output.inputs['Surface'])
    return material

awning_photo={
    'fun-stall-a':photo_crop_material('Hit-the-can / red and cream striped awning',tex/'fun-stall-a-side.jpg',(104,32,914,228)),
    'fun-stall-b':photo_crop_material('Sweets / yellow and red striped awning',tex/'fun-stall-b-side.jpg',(106,22,919,250)),
}
counter_photo={
    'fun-stall-a':photo_crop_material('Hit-the-can / weathered plank counter photo',tex/'fun-stall-a-front.jpg',(112,600,914,914)),
    'fun-stall-b':photo_crop_material('Sweets / painted plank counter photo',tex/'fun-stall-b-front.jpg',(112,592,912,914)),
}
mat['dirty-glass']=flat_material('Town Fun / soot-dulled jar glass',(.26,.32,.28),.55)
mat['letter-paint']=flat_material('Town Fun / old cream paint',(.57,.39,.19))
mat['red-paint']=flat_material('Town Fun / bruised red candy',(.46,.10,.06))
mat['ochre-paint']=flat_material('Town Fun / faded yellow candy',(.65,.38,.08))
mat['blue-paint']=flat_material('Town Fun / dull blue candy',(.10,.23,.27))
stall_source_photos=[]
for stall_id in ('fun-stall-a','fun-stall-b'):
    for view in ('side','front','rear','top'):
        photo=Photo(tex/f'{stall_id}-{view}.jpg')
        photo.image['credit']='OpenAI image generation; prompt and source retained in town-fun.py'
        stall_source_photos.append(photo)
mat['tire'] = bpy.data.materials.new('Town Fun / worn rubber')
mat['tire'].use_nodes = True
mat['tire'].diffuse_color = (.045, .047, .042, 1)
bs = mat['tire'].node_tree.nodes.get('Principled BSDF')
bs.inputs['Base Color'].default_value = (.045, .047, .042, 1)
bs.inputs['Roughness'].default_value = .94
mat['lamp'] = bpy.data.materials.new('Town Fun / cinema phosphor')
mat['lamp'].use_nodes = True
mat['lamp'].node_tree.nodes.clear()
emit = mat['lamp'].node_tree.nodes.new('ShaderNodeEmission')
emit.inputs['Color'].default_value = (.62, .36, .14, 1)
emit.inputs['Strength'].default_value = 1.0
outnode = mat['lamp'].node_tree.nodes.new('ShaderNodeOutputMaterial')
mat['lamp'].node_tree.links.new(emit.outputs[0], outnode.inputs['Surface'])
film_photo=Photo(tex/'drive-in-film-still.jpg')
film_material=bpy.data.materials.new('Drive-in / faded desert film still')
film_material.use_nodes=True
film_material.node_tree.nodes.clear()
film_texture=film_material.node_tree.nodes.new('ShaderNodeTexImage')
film_texture.image=film_photo.image
film_emission=film_material.node_tree.nodes.new('ShaderNodeEmission')
film_emission.inputs['Strength'].default_value=.24
film_output=film_material.node_tree.nodes.new('ShaderNodeOutputMaterial')
film_material.node_tree.links.new(film_texture.outputs['Color'],film_emission.inputs['Color'])
film_material.node_tree.links.new(film_emission.outputs[0],film_output.inputs['Surface'])
for material in bpy.data.materials:
    bs = material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
    if bs and bs.inputs.get('Metallic'):
        bs.inputs['Metallic'].default_value = min(float(bs.inputs['Metallic'].default_value), .29)

family = bpy.data.objects.new('town-fun', None)
bpy.context.collection.objects.link(family)
current = None

def local(p): return p
def keep(o, parent=None):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    world = o.matrix_world.copy(); o.parent = parent or current; o.matrix_world = world
    return o
def building_root(name, cells):
    global current
    current = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(current); current.parent = family
    current['footprint_cells'] = cells
    return current
def box(name, c, s, material='rusted-steel', bevel=.025, parent=None):
    return keep(town.cube(name, c, s, mat[material], bevel), parent)
def beam(name, a, b, width, material='rusted-steel', parent=None):
    return keep(town.beam(name, a, b, width, mat[material]), parent)
def cyl(name, c, radius, depth, material='rusted-steel', sides=16, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
        location=town.game_vector(c))
    o=bpy.context.object; o.name=name; o.data.materials.append(mat[material]);
    for f in o.data.polygons: f.use_smooth = len(f.vertices)>4
    return keep(o, parent)
def torus(name,c,major,minor,material='rusted-steel',parent=None,major_segments=10,minor_segments=5):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segments,
        minor_segments=minor_segments, location=town.game_vector(c))
    o=bpy.context.object; o.name=name; o.data.materials.append(mat[material]); return keep(o,parent)
def pipe(name, points, radius=.12, material='rusted-steel', parent=None):
    for i,(a,b) in enumerate(zip(points,points[1:])):
        va=town.game_vector(a); vb=town.game_vector(b); d=vb-va
        bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=radius,depth=d.length,location=(va+vb)*.5)
        o=bpy.context.object; o.name=f'{name}-{i+1}'; o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
        o.data.materials.append(mat[material]); keep(o,parent)
def wheel(name, c, radius, material='tire', parent=None):
    return torus(name,c,radius*.72,radius*.28,material,parent)
def car(name, center, scale=1.0, material='faded-hand-paint', parent=None):
    x,y,z=center; p=parent or current
    # A low, pressed shell with a raised cab and separate curved wheel rubber.
    box(name+':lower-shell',(x,y+.63*scale,z),(1.7*scale,.55*scale,3.75*scale),material,.14*scale,p)
    box(name+':cab-shell',(x,y+1.12*scale,z+.05*scale),(1.35*scale,.62*scale,1.75*scale),'rusted-steel',.17*scale,p)
    for side in (-1,1):
        for dz in (-1.18,1.18):
            wheel(name+f':tyre-{side}-{dz}',(x+side*.87*scale,y+.42*scale,z+dz*scale),.42*scale,'tire',p)
    # bent bumper and sill give the body a connected, automotive profile
    beam(name+':front-bumper',(x-.92*scale,y+.54*scale,z-1.92*scale),(x+.92*scale,y+.54*scale,z-1.92*scale),.12*scale,'galvanised-tin',p)
    beam(name+':rear-bumper',(x-.92*scale,y+.51*scale,z+1.92*scale),(x+.92*scale,y+.51*scale,z+1.92*scale),.12*scale,'rusted-steel',p)

# Photo-carved bonnet basin, hollowed above its floor. The four independent
# grids agree on a 5.8 m long basin; the end photos set its 4.0 m width.
building_root('fountain','1x1')
fountain_recipe={
    'photos':{'side':'fountain-side.jpg','front':'fountain-front.jpg',
              'rear':'fountain-rear.jpg','top':'fountain-above.jpg'},
    'length':5.8,'width':4.0,'height':1.25,
    'side':{'start':22,'end':988,'ground':632},
    'front':{'centre':512,'ground':660,'top':330},
    'rear':{'centre':512,'ground':602,'top':284},
    'top':{'front':40,'rear':700,'centre':512,'x_scale':4.0/835},
    # Clear the photographed exhausts and the inconsistent front-photo stand:
    # both are modeled separately or intentionally absent from the bonnet.
    'cut':{
        'side':[(588,140,988,466)],
        'front':[(130,90,380,332),(640,90,895,332)],
        'rear':[(218,105,402,304),(618,105,808,304)],
        'top':[(420,0,495,215),(530,0,605,215)],
    },
    # Leave a shallow floor and clear the volume above it for the water surface.
    'keep':lambda x,y,z: ~((abs(x)<1.70)&(abs(z)<1.65)&(y>.28)),
    'grey':26,'tolerance':38,'bleed_tolerance':48,
    'mask_dir':str(evidence/'masks'),'voxel':.055,'target':900,
}
fountain=carve_object('fountain:bonnet',tex,fountain_recipe)
keep(fountain)
# The voxel carve leaves a measured 27 mm gap; seat the bonnet on the ground.
fountain.location.z-=.027
bpy.context.view_layer.update()
side_photo=fountain_recipe['_photos']['side']
top_photo=fountain_recipe['_photos']['top']
if '--fountain-body-only' not in args:
    def fountain_sweep(mesh, points, radius, sides, uv_at, subdivisions=2, radius_at=None, material='side'):
        controls=[Vector(point) for point in points]
        path=[]
        for index in range(len(controls)-1):
            p0=controls[max(0,index-1)]; p1=controls[index]
            p2=controls[index+1]; p3=controls[min(len(controls)-1,index+2)]
            for step in range(subdivisions):
                t=step/subdivisions
                t2=t*t; t3=t2*t
                point=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)
                path.append((point,(index+t)/(len(controls)-1)))
        path.append((controls[-1],1.0))
        rings=[]
        for index,(centre,t) in enumerate(path):
            before=path[max(0,index-1)][0]
            after=path[min(len(path)-1,index+1)][0]
            tangent=(after-before).normalized()
            side=tangent.cross(Vector((1,0,0)))
            if side.length_squared<1e-8:
                side=tangent.cross(Vector((0,0,1)))
            side.normalize(); up=tangent.cross(side).normalized()
            ring=[]
            ring_radius=radius_at(t) if radius_at else radius
            for k in range(sides):
                angle=math.tau*k/sides
                direction=side*math.cos(angle)+up*math.sin(angle)
                ring.append((mesh.vertex(centre+direction*ring_radius),uv_at(t,angle)))
            rings.append(ring)
        for index,(left,right) in enumerate(zip(rings,rings[1:])):
            centre=(path[index][0]+path[index+1][0])*.5
            tangent=(path[index+1][0]-path[index][0]).normalized()
            for k in range(sides):
                a,ua=left[k]; b,ub=left[(k+1)%sides]
                c,uc=right[(k+1)%sides]; d,ud=right[k]
                midpoint=(Vector(mesh.verts[a])+Vector(mesh.verts[b])+Vector(mesh.verts[c])+Vector(mesh.verts[d]))*.25
                mesh.indexed((a,b,c,d),(ua,ub,uc,ud),material,midpoint-centre-tangent*.02,True)

    rear_edge=-2.40
    for side,x in (('left',-.68),('right',.68)):
        pipe_mesh=PhotoMesh()
        inward=.24 if side=='left' else -.24
        # Both rises share the same back-edge line and spacing across the width.
        # Each elbow bends forward over the pool, then turns its mouth down.
        path=[(x,.96,rear_edge),(x,1.28,rear_edge),(x,2.05,rear_edge),
              (x+inward*.12,2.42,rear_edge+.04),(x+inward*.42,2.64,rear_edge+.18),
              (x+inward*.82,2.68,rear_edge+.48),(x+inward,2.58,rear_edge+.72),
              (x+inward,2.34,rear_edge+.86),(x+inward,2.05,rear_edge+.86)]
        def pipe_uv(t,angle):
            return (angle/math.tau*1.5,t*2.2)
        fountain_sweep(pipe_mesh,path,.155,8,pipe_uv,subdivisions=2,
                       radius_at=lambda t:.155-.018*t,material='rust')
        # A stepped lathe flange rises directly from the bonnet's back rim.
        lathe(pipe_mesh,'rust',(x,.91,rear_edge),(0,1,0),(1,0,0),(0,0,1),
              [(0,.255),(.035,.255),(.055,.19),(.14,.19)],
              lambda i,d,r,a:(a/math.tau,d*2),sides=12)
        obj=pipe_mesh.finish(f'fountain:exhaust-{side}',{'rust':mat['rusted-steel']})
        keep(obj)

# A rounded surface uses the measured overhead water patch, sitting inside the
# hollow basin and touching its rim at the true waterline.
if '--fountain-body-only' not in args and '--fountain-no-water' not in args:
    water_mesh=PhotoMesh()
    water_outline=[(-1.62,.88,-1.65),(-1.42,.88,-1.82),(1.42,.88,-1.82),(1.62,.88,-1.65),
                   (1.62,.88,1.65),(1.42,.88,1.82),(-1.42,.88,1.82),(-1.62,.88,1.65)]
    def overhead_uv(point):
        x,_,z=point
        # Stay within the photographed pool. The top view also contains the
        # exhausts; sampling that area would print a second pair on the water.
        px=500+x*71
        py=500+z*60
        return top_photo.uv(px,py)
    water_mesh.face(water_outline,[overhead_uv(point) for point in water_outline],'water',(0,1,0))
    # Thin, partly transparent streams fall straight down. One small ring at
    # each impact suggests a ripple without turning the water into a solid rod.
    def stream_uv(t,angle):
        return (t,angle/math.tau)
    for x,z,mouth_y in ((-.44,-1.54,2.05),(.44,-1.54,2.05)):
        points=[(x,mouth_y,z),(x,1.52,z),(x,1.05,z),(x,.90,z)]
        fountain_sweep(water_mesh,points,.026,6,stream_uv,subdivisions=2,
                       radius_at=lambda t:.026*(1-.12*t),material='stream')
        radius=.16
        inner=radius-.018
        for k in range(12):
            a=math.tau*k/12; b=math.tau*(k+1)/12
            outer_a=(x+math.cos(a)*radius,.905,z+math.sin(a)*radius)
            inner_a=(x+math.cos(a)*inner,.905,z+math.sin(a)*inner)
            inner_b=(x+math.cos(b)*inner,.905,z+math.sin(b)*inner)
            outer_b=(x+math.cos(b)*radius,.905,z+math.sin(b)*radius)
            water_mesh.face((outer_a,inner_a,inner_b,outer_b),
                            ((0,0),(.5,0),(.5,1),(0,1)),
                            'stream',(0,1,0),True)
    stream_material=bpy.data.materials.new('Fountain / falling water')
    stream_material.use_nodes=True
    stream_bsdf=stream_material.node_tree.nodes.get('Principled BSDF')
    stream_bsdf.inputs['Base Color'].default_value=(.72,.88,1.0,1)
    stream_bsdf.inputs['Alpha'].default_value=.48
    stream_bsdf.inputs['Roughness'].default_value=.28
    stream_bsdf.inputs['Metallic'].default_value=0
    stream_material.diffuse_color=(.72,.88,1.0,.48)
    water=water_mesh.finish('fountain:water',{'water':top_photo.material(),'stream':stream_material})
    keep(water)
    water['emissive']=False

def fountain_bounds(obj):
    points=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return [(min(p[i] for p in points),max(p[i] for p in points)) for i in range(3)]
fountain_pieces=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.name.startswith('fountain:')]
for piece in fountain_pieces:
    bounds=fountain_bounds(piece)
    game_bounds={'min':[round(bounds[0][0],3),round(bounds[2][0],3),round(-bounds[1][1],3)],
                 'max':[round(bounds[0][1],3),round(bounds[2][1],3),round(-bounds[1][0],3)]}
    print('FOUNTAIN BOUNDS',piece.name,json.dumps(game_bounds))
    if game_bounds['min'][0]<-3.5 or game_bounds['max'][0]>3.5 or game_bounds['min'][2]<-3.5 or game_bounds['max'][2]>3.5:
        raise RuntimeError(f'{piece.name} leaves the 1x1 footprint: {game_bounds}')
    if game_bounds['min'][1]<-.03:
        raise RuntimeError(f'{piece.name} extends below ground: {game_bounds}')
def fountain_touches(a,b,padding=.035):
    return all(a[i][0]<=b[i][1]+padding and b[i][0]<=a[i][1]+padding for i in range(3))
for piece in fountain_pieces:
    bounds=fountain_bounds(piece)
    grounded=bounds[2][0]<=.025
    touches=grounded or any(other is not piece and fountain_touches(bounds,fountain_bounds(other)) for other in fountain_pieces)
    print('FOUNTAIN CONTACT',piece.name,'grounded' if grounded else 'touches another piece' if touches else 'NO CONTACT')
    if not touches: raise RuntimeError(f'{piece.name} floats without contact')
# Round 5 rebuild: four independent measured photos, scaled from its two-metre door.
building_root('tavern','2x2')
tavern_root=current
tavern=carve_object('tavern:body',tex,{
    'photos':{'side':'tavern-side.jpg','front':'tavern-front.jpg',
              'rear':'tavern-rear.jpg','top':'tavern-top.jpg'},
    'length':6.2,'width':7.4,'height':6.9,
    'side':{'start':100,'end':540,'ground':535},
    'front':{'centre':320,'ground':530,'top':52},
    'rear':{'centre':327,'ground':522,'top':58},
    'top':{'front':45,'rear':515,'centre':320,'x_scale':7.4/520},
    'keep':lambda x,y,z: ~((abs(x)<.96)&(y<2.05)&(z < -6.2/2+.42)),
    'cut':{'front':[(235,380,410,535)]},
    'grey':26,'tolerance':40,'bleed_tolerance':48,
    'mask_dir':str(evidence/'masks'),'voxel':.045,'target':2700,
})
keep(tavern)
door_dark=bpy.data.materials.new('tavern dark doorway')
door_dark.diffuse_color=(.012,.010,.008,1)
door_dark.use_nodes=True
door_dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.012,.010,.008,1)
door_dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
mat['door-dark']=door_dark
box('tavern:doorway-interior',(0,1.03,-2.78),(1.82,2.0,.035),'door-dark',.005)
# The truck is a separate four-photo carve. Its nose overlaps the tavern's
# road-facing wall; the measured tyres reach the shared ground plane.
truck_root=bpy.data.objects.new('tavern:truck',None)
bpy.context.collection.objects.link(truck_root)
truck_root.parent=tavern_root
truck_root.location=town.game_vector((-1.65,0,-3.35))
truck=carve_object('tavern:truck-body',tex,{
    'photos':{'side':'tavern-truck-side.jpg','front':'tavern-truck-front.jpg',
              'rear':'tavern-truck-rear.jpg','top':'tavern-truck-top.jpg'},
    'length':5.5,'width':2.35,'height':2.7,
    'side':{'start':25,'end':785,'ground':465},
    'front':{'centre':244,'ground':482,'top':116},
    'rear':{'centre':247,'ground':490,'top':111},
    # The overhead reference lies across the frame: the bonnet is at x=45,
    # the tailgate at x=765, and the body centreline is y=280.
    'top':{'front':45,'rear':765,'centre':280,'along':'x','x_scale':2.35/(410-145)},
    # Rear of the cab is the front wall of an open timber load bed. Preserve
    # its floor while clearing the space between the side boards.
    'keep':lambda x,y,z: ~((abs(x)<.87)&(y>.78)&(y<2.8)&(z<-.28)&(z>-2.58)),
    'wheels':[(-1.56,.50,.72),(1.96,.50,.72)],
    'cut':{
        'side':[(0,465,809,541)],
        'front':[(0,482,485,541)],
        'rear':[(0,490,491,541)],
    },
    'forward':1,'side_front_on_left':True,
    'grey':26,'tolerance':42,'bleed_tolerance':50,
    'mask_dir':str(evidence/'masks'),'voxel':.035,'target':1500,
})
truck.parent=truck_root

# Four independent tyres wear the measured sidewall and end-view tread instead
# of retaining the photographed wheels as flat patches on the carved body.
_side_photo=Photo(tex/'tavern-truck-side.jpg')
_front_photo=Photo(tex/'tavern-truck-front.jpg')
_wheel_specs=((1.96,137,130),(1.96,137,350),(-1.56,622,142),(-1.56,622,350))
for _z,_side_px,_end_px in _wheel_specs:
    _x=-.72 if _end_px<240 else .72
    _centre=(_x,.50,_z)
    _wheel=PhotoMesh()
    tyre(_wheel,'side',_side_photo,_side_px,400,69,.50,.26,
         'front',_front_photo,_end_px,35,405,470,sides=14)
    _wheel_obj=_wheel.finish(f'tavern:truck-wheel-{_z}-{_x}',
        {'side':_side_photo.material(),'front':_front_photo.material()})
    keep(_wheel_obj,truck_root).location=town.game_vector(_centre)

def measured_bounds(obj):
    bpy.context.view_layer.update()
    points=[obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    return tuple((min(p[i] for p in points),max(p[i] for p in points)) for i in range(3))

# As in the photo, the truck lies along the road side of the tavern, seen side
# on from the road, with its nose driven into the tavern's corner.
import math as _math
truck_root.rotation_euler=(0,0,_math.pi/2)
_tavern=measured_bounds(tavern); _truck=measured_bounds(truck)
truck_root.location.x+=(_tavern[0][0]+1.0)-_truck[0][1]
truck_root.location.y+=(_tavern[1][1]-1.3)-(_truck[1][0]+_truck[1][1])/2

for label,obj in (('tavern',tavern),('truck',truck)):
    bounds=measured_bounds(obj)
    print(f'{label} bounds Blender XYZ:',json.dumps(bounds))
    if bounds[2][0] < -.035 or bounds[2][0] > .035:
        raise RuntimeError(f'{label} does not touch the ground: {bounds[2]}')
tavern_bounds=measured_bounds(tavern)
truck_bounds=measured_bounds(truck)
touches=all(truck_bounds[i][0] <= tavern_bounds[i][1]+.03 and tavern_bounds[i][0] <= truck_bounds[i][1]+.03 for i in range(3))
print('truck intersects tavern bounds:',touches)
if not touches:
    raise RuntimeError('tavern truck does not touch the tavern')
# The billboard face and open frame are traced separately from the generated
# orthographic views. The screen face is its own emissive, replaceable piece.
building_root('drive-in','4x3')
drive_photos={name:Photo(tex/f'drive-in-{name}.jpg') for name in ('front','rear','side')}
def edge_seeds(photo):
    return [(8,8),(photo.w-9,8),(8,photo.h-9),(photo.w-9,photo.h-9),
            *((x,8) for x in range(80,photo.w-8,120)),
            *((x,photo.h-9) for x in range(80,photo.w-8,120))]
for photo in drive_photos.values(): lift_if_dark(photo)
front_photo=drive_photos['front']; rear_photo=drive_photos['rear']; side_photo=drive_photos['side']
front_mask=~front_photo.sky(edge_seeds(front_photo),tolerance=32,grey=24)
rear_mask=~rear_photo.sky(edge_seeds(rear_photo),tolerance=32,grey=24)
# Grid-normalized billboard rectangle: its emissive panel sits inside the
# perimeter rails. Clearing it leaves the open frame and its braces.
def cut_display(mask):
    h,w=mask.shape
    mask[int(h*.16):int(h*.57),int(w*.12):int(w*.88)]=False
cut_display(front_mask)
side_mask=~side_photo.sky(edge_seeds(side_photo),tolerance=32,grey=24)
for photo,mask in ((front_photo,~front_photo.sky(edge_seeds(front_photo),tolerance=32,grey=24)),
                   (rear_photo,~rear_photo.sky(edge_seeds(rear_photo),tolerance=32,grey=24)),
                   (side_photo,side_mask)):
    photo.bleed(mask)
front_scale_x=18.0/(front_photo.w*.85)
front_ground=front_photo.h*.93
front_top=front_photo.h*.08
front_scale_y=7.8/(front_ground-front_top)
frame_mesh=PhotoMesh()
def front_point(px,py,depth):
    return ((px-front_photo.w/2)*front_scale_x,
            (front_ground-py)*front_scale_y,-8.75+depth)
frame_loops=trace(front_mask,(0,0,front_photo.w,front_photo.h),tolerance=1.3,min_area=28)
if not frame_loops: raise RuntimeError('drive-in front photo did not trace a frame')
slab(frame_mesh,'photo',front_photo,frame_loops,front_point,-.10,.10,wall_scale=.002)
front_frame=frame_mesh.finish('drive-in:traced-front-frame',{'photo':front_photo.material()})
keep(front_frame)
rear_mesh=PhotoMesh()
rear_scale_x=18.0/(rear_photo.w*.85)
rear_ground=rear_photo.h*.93
rear_scale_y=7.8/(rear_ground-rear_photo.h*.08)
def rear_point(px,py,depth):
    return ((px-rear_photo.w/2)*rear_scale_x,
            (rear_ground-py)*rear_scale_y,-8.48+depth)
rear_loops=trace(rear_mask,(0,0,rear_photo.w,rear_photo.h),tolerance=1.3,min_area=28)
if not rear_loops: raise RuntimeError('drive-in rear photo did not trace a frame')
slab(rear_mesh,'photo',rear_photo,rear_loops,rear_point,-.10,.10,wall_scale=.002)
rear_frame=rear_mesh.finish('drive-in:traced-rear-frame',{'photo':rear_photo.material()})
keep(rear_frame)
# The side photograph traces each end truss. Its narrow depth runs from the
# display face toward the rear braces; duplicate the measured profile at both ends.
side_bounds=np.where(side_mask)
side_x0,side_x1=int(side_bounds[1].min()),int(side_bounds[1].max())
side_y0,side_y1=int(side_bounds[0].min()),int(side_bounds[0].max())
side_ground=side_photo.h*.93
side_s=7.8/(side_ground-side_y0)
side_centre=(side_x0+side_x1)/2
side_loops=trace(side_mask,(side_x0,side_y0,side_x1+1,int(side_ground)),tolerance=1.4,min_area=24)
if not side_loops: raise RuntimeError('drive-in side photo did not trace a side truss')
for side_x in (-8.85,8.85):
    side_mesh=PhotoMesh()
    def side_point(px,py,depth,root_x=side_x):
        return (root_x+depth,(side_ground-py)*side_s,-9.0+(px-side_centre)*side_s)
    slab(side_mesh,'photo',side_photo,side_loops,side_point,-.30,.30,wall_scale=.002)
    side_obj=side_mesh.finish(f'drive-in:traced-side-truss-{side_x}',{'photo':side_photo.material()})
    keep(side_obj)
# A thin front-only film plane sits inside the traced face. Its panoramic crop
# keeps the car and sunset in view; the unsplit rear photo remains behind it.
screen_width=16.1; screen_height=3.78
screen_low=5.16-screen_height/2; screen_high=5.16+screen_height/2
screen_mesh=PhotoMesh()
screen_points=[(-screen_width/2,screen_low,-8.60),(screen_width/2,screen_low,-8.60),
               (screen_width/2,screen_high,-8.60),(-screen_width/2,screen_high,-8.60)]
screen_uv=[film_photo.uv(0,film_photo.h*.75),film_photo.uv(film_photo.w,film_photo.h*.75),
           film_photo.uv(film_photo.w,film_photo.h*.33),film_photo.uv(0,film_photo.h*.33)]
screen_mesh.face(screen_points,screen_uv,'film',out=(0,0,-1))
screen=screen_mesh.finish('drive-in:screen',{'film':film_material}); keep(screen)
screen['emissive']=True

# Wrecks follow the scrapyard recipe: trace each side photo and extrude it to
# the original 1.8 m width. Five cars keep their uncrushed roofs. Rows are
# curved toward the screen; the nose points toward negative Z in every case.
def make_drive_car(name, photo_name, x_center, z_center, kind):
    photo=Photo(tex/photo_name)
    if kind=='scrapyard':
        lift_if_dark(photo)
        mask=~photo.sky(edge_seeds(photo),tolerance=27,grey=26)
        side_bounds={'red':(10,20,2162,660),'brown':(10,45,2162,657),
                     'blue':(80,2,2092,690)}
        paint_id=photo_name.split('scrapyard-car-')[1].split('-side')[0]
        x0,top,x1,ground=side_bounds[paint_id]
        rgb=photo.rgb(); value=rgb.mean(axis=2); chroma=rgb.max(axis=2)-rgb.min(axis=2)
        mask[ground:,:]=False
        photo.bleed(mask&~((value>100)&(chroma<60)))
        loops=trace(mask,(x0,top,x1,ground),tolerance=6.0,min_area=100)
        height=.9; scale=height/(ground-top); length=(x1-x0)*scale; front='right'
        def point(px,py,depth):
            z=(x1-px)*scale-length/2
            return (x_center+depth,(ground-py)*scale,z_center+z)
    else:
        lift_if_dark(photo)
        rgb=photo.rgb()
        mask=~photo.sky(edge_seeds(photo),tolerance=27,grey=26)
        x0,x1,top,ground=25,1372,221,581
        mask[ground:,:]=False
        photo.bleed(mask)
        loops=trace(mask,(x0,top,x1,ground),tolerance=2.0,min_area=120)
        height=1.62; scale=height/(ground-top); length=(x1-x0)*scale; front='left'
        def point(px,py,depth):
            z=(px-x0)*scale-length/2
            return (x_center+depth,(ground-py)*scale,z_center+z)
    if not loops: raise RuntimeError(f'{name} side photo did not trace')
    # Use only the photographed car silhouette as the slab outline. Keep the
    # measured width, length and ground contact for each photo's own scale.
    silhouette=[max(loops,key=lambda loop:abs(sum(a[0]*b[1]-b[0]*a[1]
                  for a,b in zip(loop,loop[1:]+loop[:1]))))]
    mesh=PhotoMesh()
    slab(mesh,'photo',photo,silhouette,point,-.92,.92,wall_scale=.002)
    car=mesh.finish(name,{'photo':photo.material()}); keep(car)
    car['photo']=photo_name; car['front_direction']='-Z'
    return car

paintings=[('red','scrapyard-car-red-side.jpg'),('sedan','drive-in-rusty-sedan.jpg'),
           ('blue','scrapyard-car-blue-side.jpg'),('sedan','drive-in-rusty-sedan.jpg'),
           ('brown','scrapyard-car-brown-side.jpg'),
           ('sedan','drive-in-rusty-sedan.jpg'),('red','scrapyard-car-red-side.jpg'),
           ('sedan','drive-in-rusty-sedan.jpg'),('blue','scrapyard-car-blue-side.jpg'),
           ('sedan','drive-in-rusty-sedan.jpg')]
x_centres=(-9.4,-4.7,0,4.7,9.4)
for row,z_base in enumerate((.35,6.65),1):
    for col,x_center in enumerate(x_centres):
        label,photo_name=paintings[(row-1)*5+col]
        curve=(abs(x_center)/9.4)**2
        z_center=z_base+curve*1.0
        make_drive_car(f'drive-in:wreck-{row}-{col+1}',photo_name,x_center,z_center,
                       'sedan' if label=='sedan' else 'scrapyard')

# The little operator hut stands behind the second arc on short salvaged legs.
hut_shift=-.3
box('drive-in:projector-hut-platform',(0,2.3,10.2+hut_shift),(3.4,.18,1.9),'weathered-plank',.035)
for x in (-1.45,1.45):
    for z in (9.5,10.9):
        beam(f'drive-in:projector-hut-leg-{x}-{z}',(x,.05,z+hut_shift),(x,2.25,z+hut_shift),.12,'rusted-steel')
box('drive-in:projector-hut-body',(0,3.15,10.2+hut_shift),(3.1,1.55,1.65),'rusted-steel',.045)
box('drive-in:projector-hut-tin-patch',(0,3.72,9.36+hut_shift),(2.6,.42,.06),'galvanised-tin',.015)
box('drive-in:projector-hut-roof',(0,4.02,10.2+hut_shift),(3.55,.18,2.0),'patched-canvas',.025)
box('drive-in:projector-hut-lens',(0,3.15,9.31+hut_shift),(.42,.32,.08),'dirty-glass',.02)
box('drive-in:projector-hut-lamp',(1.3,3.95,10.1+hut_shift),(.18,.16,.18),'lamp',.01)

def drive_game_bounds(obj):
    points=[obj.matrix_world @ Vector(vertex.co) for vertex in obj.data.vertices]
    return [(min(p[axis] for p in points),max(p[axis] for p in points)) for axis in (0,2,1)]
drive_pieces=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.name.startswith('drive-in:')]
for piece in drive_pieces:
    bounds=drive_game_bounds(piece)
    bounds[2]=(-bounds[2][1],-bounds[2][0])
    report={'min':[round(bounds[0][0],3),round(bounds[1][0],3),round(bounds[2][0],3)],
            'max':[round(bounds[0][1],3),round(bounds[1][1],3),round(bounds[2][1],3)]}
    print('DRIVE-IN BOUNDS',piece.name,json.dumps(report))
    if bounds[0][0]<-15.0 or bounds[0][1]>15.0 or bounds[2][0]<-11.0 or bounds[2][1]>11.0:
        raise RuntimeError(f'{piece.name} leaves less than 0.5 m of clearance in the 4x3 footprint: {report}')
    if bounds[1][0]<-.06:
        raise RuntimeError(f'{piece.name} extends below ground: {report}')
def drive_overlap(a,b,padding=.025):
    return all(a[i][0]<=b[i][1]+padding and b[i][0]<=a[i][1]+padding for i in range(3))
for piece in drive_pieces:
    bounds=drive_game_bounds(piece); bounds[2]=(-bounds[2][1],-bounds[2][0])
    grounded=bounds[1][0]<=.025
    touches=grounded or any(other is not piece and drive_overlap(bounds,
        (lambda other_bounds: [other_bounds[0],other_bounds[1],(-other_bounds[2][1],-other_bounds[2][0])])(drive_game_bounds(other)))
        for other in drive_pieces)
    print('DRIVE-IN CONTACT',piece.name,'grounded' if grounded else 'touches another piece' if touches else 'NO CONTACT')
    if not touches: raise RuntimeError(f'{piece.name} is floating without contact')

# Wreck ring, round 19: two low courses of flat tyres around four bumper cars.
building_root('wreck-ring','3x3')
ring_root=current
ring_count=21
ring_radius=3.65
ring_side=Photo(tex/'wreck-ring-shell-side.jpg')
ring_end=Photo(tex/'wreck-ring-shell-front.jpg')
tyre_courses=((.175,0),(.525,math.pi/ring_count))
for course,(height,offset) in enumerate(tyre_courses,1):
    for i in range(ring_count):
        angle=math.tau*i/ring_count+offset
        x=ring_radius*math.cos(angle); z=ring_radius*math.sin(angle)
        tyre_mesh=PhotoMesh()
        tyre(tyre_mesh,'side',ring_side,337,397,36,.55,.175,'tread',ring_end,
             512,178,434,598,sides=16)
        tyre_obj=tyre_mesh.finish(f'wreck-ring:tyre-{course}-{i+1}',
                                  {'side':ring_side.material(),'tread':ring_end.material()})
        tyre_obj.location=town.game_vector((x,height,z))
        tyre_obj.rotation_euler[1]=math.pi/2
        keep(tyre_obj,ring_root)
        tyre_obj['part']='flat salvaged tyre with photo-worn tread'
# Dust covers the arena floor, with a darker worn centre.
cyl('wreck-ring:dusty-floor',(0,.05,0),ring_radius-.36,.10,'sand',48,ring_root)

# The same four generated shell photographs are measured at each view. The front
# is +Z as for a vehicle; each shell is carved once, then receives a rubber ring.
wreck_recipe={
    'photos':{'side':'wreck-ring-shell-side.jpg','front':'wreck-ring-shell-front.jpg',
              'rear':'wreck-ring-shell-rear.jpg','top':'wreck-ring-shell-above.jpg'},
    'length':1.70,'width':1.00,'height':.92,'forward':1,'round':2,
    'side':{'start':55,'end':963,'ground':454},
    'front':{'centre':512,'ground':590,'top':155},
    'rear':{'centre':512,'ground':590,'top':155},
    'top':{'front':104,'rear':600,'centre':512,'x_scale':1.00/820},
    'grey':8,'tolerance':30,'voxel':.07,'target':400,
    'mask_dir':str(root/'.qa-dist/wreck-ring-masks'),
}
car_slots=[(-1.25,0,.20),(0,-1.25,1.83),(1.25,0,-1.17),(0,1.25,3.02)]
for i,(x,z,turn) in enumerate(car_slots,1):
    car_root=bpy.data.objects.new(f'wreck-ring:car-{i}',None)
    bpy.context.collection.objects.link(car_root); car_root.parent=ring_root
    shell=carve_object(f'wreck-ring:car-{i}:shell',tex,wreck_recipe)
    keep(shell,car_root)
    # The bumper sits around the carved shell's perimeter, below its floor.
    bumper=torus(f'wreck-ring:car-{i}:bumper',(0,.12,0),.54,.12,'tire',car_root,16,6)
    bumper.scale=(1.0,1.5,1.0)
    box(f'wreck-ring:car-{i}:seat-cushion',(0,.31,-.23),(.38,.12,.36),'weathered-plank',0,car_root)
    box(f'wreck-ring:car-{i}:seat-back',(0,.49,-.42),(.38,.34,.10),'patched-canvas',0,car_root)
    steering_wheel=torus(f'wreck-ring:car-{i}:steering-wheel',(0,.66,.37),.14,.025,'rusted-steel',car_root,16,6)
    steering_wheel.rotation_euler[0]=math.pi/2
    beam(f'wreck-ring:car-{i}:steering-column',(0,.42,.21),(0,.64,.35),.035,'rusted-steel',car_root)
    car_root.location=town.game_vector((x,0,z)); car_root.rotation_euler[2]=turn
    shell['source']='four generated orthographic photos of one bumper-car shell'
    bumper['source']='continuous separate rubber bumper around the shell'

# Print every wreck-ring piece in game axes and prove it fits the 3x3 grid.
bpy.context.view_layer.update()
wreck_pieces=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('wreck-ring:')]
def wreck_bounds(obj):
    pts=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return ((min(p.x for p in pts),max(p.x for p in pts)),
            (min(p.z for p in pts),max(p.z for p in pts)),
            (min(p.y for p in pts),max(p.y for p in pts)))
def wreck_overlap(a,b,p=.04):
    return all(a[i][0]<=b[i][1]+p and b[i][0]<=a[i][1]+p for i in range(3))
for piece in wreck_pieces:
    b=wreck_bounds(piece)
    report={'x':list(map(lambda v:round(v,3),b[0])),
            'y':list(map(lambda v:round(v,3),b[1])),
            'z':list(map(lambda v:round(-v,3),reversed(b[2])))}
    print('WRECK-RING BOUNDS',piece.name,json.dumps(report))
    if b[0][0]<-11.5 or b[0][1]>11.5 or b[2][0]<-11.5 or b[2][1]>11.5 or b[1][0]<-.03:
        raise RuntimeError(f'{piece.name} leaves the 3x3 footprint or extends below ground: {report}')
    grounded=b[1][0]<=.04
    touches=grounded or any(other is not piece and wreck_overlap(b,wreck_bounds(other)) for other in wreck_pieces)
    print('WRECK-RING CONTACT',piece.name,'grounded' if grounded else 'touches another piece' if touches else 'NO CONTACT')
    if not touches: raise RuntimeError(f'{piece.name} is floating without contact')

# Big wheel: retain open photo-carved spokes, but make the two rims complete
# torus rings. The round-8 white box was studio background enclosed by the
# A-frame legs and crossbar, accidentally retained by the photo mask.
building_root('big-wheel','3x3')
wheel_photo=Photo(tex/'big-wheel-round8-side.png')
wheel_rgb=wheel_photo.rgb()
wheel_bg=np.median(np.concatenate((wheel_rgb[:24,:24].reshape(-1,3),wheel_rgb[:24,-24:].reshape(-1,3),wheel_rgb[-24:,:24].reshape(-1,3),wheel_rgb[-24:,-24:].reshape(-1,3))),axis=0)
wheel_mask=np.abs(wheel_rgb-wheel_bg).max(axis=2)>24
wheel_cx,wheel_cy,wheel_radius_px=768,438,430
# Grid measurement: wheel centre (768,438), outer radius 430 px, ground y=1012.
# The seat spans 120 px; at 1.4 m this gives 0.01167 m/px.
wheel_scale=1.4/120; wheel_radius=wheel_radius_px*wheel_scale
wheel_center_y=(1012-wheel_cy)*wheel_scale
# The support photo and seat silhouettes are separate pieces. Exclude their
# measured image regions from the disk mask; the spokes remain open at the hub.
yy,xx=np.indices(wheel_mask.shape)
wheel_rpx=np.sqrt((xx-wheel_cx)**2+(yy-wheel_cy)**2)
wheel_mask &= wheel_rpx < wheel_radius_px-5
wheel_mask &= np.abs(wheel_rpx-wheel_radius_px)>18
for x0,y0,x1,y1 in ((680,88,850,188),(392,190,536,318),(1000,190,1135,318),
                    (250,475,410,590),(1120,475,1285,590),(350,735,510,865),
                    (1030,735,1195,865),(680,900,850,1010)):
    wheel_mask[y0:y1,x0:x1]=False
# Remove the measured A-frame wedge from the wheel mask, including its crossbar.
support_region=(yy>405)&(yy<870)&(xx>625-(yy-405)*.29)&(xx<911+(yy-405)*.29)
wheel_mask &= ~support_region
wheel_loops=trace(wheel_mask,(330,0,1205,870),tolerance=1.0,min_area=35)
if not wheel_loops: raise RuntimeError('big-wheel side photo has no traced steel')
evidence.mkdir(parents=True,exist_ok=True)
def save_mask(name, mask):
    image=bpy.data.images.new(name,width=mask.shape[1],height=mask.shape[0],alpha=False)
    pixels=np.empty((mask.shape[0],mask.shape[1],4),dtype=np.float32)
    pixels[:,:,:3]=mask[::-1,:,None].astype(np.float32); pixels[:,:,3]=1
    image.pixels.foreach_set(pixels.ravel()); image.filepath_raw=str(evidence/name); image.file_format='PNG'; image.save()
    bpy.data.images.remove(image)
save_mask('big-wheel-wheel-mask.png',wheel_mask)
wheel_pivot=bpy.data.objects.new('big-wheel:wheel',None); bpy.context.collection.objects.link(wheel_pivot); wheel_pivot.parent=current
wheel_pivot.location=town.game_vector((0,wheel_center_y,0)); wheel_pivot.rotation_euler[0]=0
def wheel_point(px,py,depth): return (depth,(wheel_cy-py)*wheel_scale,(px-wheel_cx)*wheel_scale)
wheel_photo.bleed(wheel_mask)
def torus_rim(name,depth):
    mesh=PhotoMesh(); circumference=64; tube_steps=6; tube=.075
    for j in range(tube_steps):
        phi=math.tau*j/tube_steps; next_phi=math.tau*(j+1)/tube_steps
        for i in range(circumference):
            theta=math.tau*i/circumference; next_theta=math.tau*(i+1)/circumference
            indices=[]; uvs=[]
            for angle,section in ((theta,phi),(next_theta,phi),(next_theta,next_phi),(theta,next_phi)):
                radial=wheel_radius+tube*math.sin(section)
                px=wheel_cx+(radial/wheel_scale)*math.sin(angle)
                py=wheel_cy-(radial/wheel_scale)*math.cos(angle)
                indices.append(mesh.vertex((depth+tube*math.cos(section),
                    radial*math.cos(angle),radial*math.sin(angle))))
                uvs.append(wheel_photo.uv(px,py))
            mid=theta+math.pi/circumference
            mesh.indexed(indices,uvs,'wheel',(math.cos(mid)*math.cos(phi),
                math.sin(phi)*math.cos(mid),math.sin(mid)),True)
    obj=mesh.finish(name,{'wheel':wheel_photo.material()}); obj.parent=wheel_pivot
    obj.location=(0,0,0); return obj
for side,depth in enumerate((-.5,.5),1): torus_rim(f'big-wheel:complete-rim-{side}',depth)
hub_mesh=PhotoMesh()
lathe(hub_mesh,'wheel',(0,0,0),(1,0,0),(0,0,1),(0,1,0),[(-.58,.34),(.58,.34)],
    lambda i,d,r,a: wheel_photo.uv(768+math.cos(a)*24,438+math.sin(a)*24),sides=20)
hub=hub_mesh.finish('big-wheel:short-lathe-hub',{'wheel':wheel_photo.material()}); hub.parent=wheel_pivot
hub.location=town.game_vector((0,0,0))
for i in range(12):
    a=math.tau*i/12; y=wheel_center_y+math.cos(a)*wheel_radius; z=math.sin(a)*wheel_radius
    beam(f'big-wheel:rim-depth-tie-{i+1}',(-.5,y,z),(.5,y,z),.10,'rusted-steel',wheel_pivot)
for side in (-.46,.46):
    for i in range(12):
        angle=math.tau*i/12
        start=(side,wheel_center_y+.34*math.cos(angle),.34*math.sin(angle))
        end=(side,wheel_center_y+(wheel_radius-.10)*math.cos(angle),(wheel_radius-.10)*math.sin(angle))
        beam(f'big-wheel:spoke-{side}-{i+1}',start,end,.045,'rusted-steel')

# The seat is an individual carved/photo-traced piece at each rim pivot.
seat_photo=Photo(tex/'big-wheel-round8-seat-front.png')
seat_rgb=seat_photo.rgb(); seat_bg=np.median(np.concatenate((seat_rgb[:20,:20].reshape(-1,3),seat_rgb[:20,-20:].reshape(-1,3),seat_rgb[-20:,:20].reshape(-1,3),seat_rgb[-20:,-20:].reshape(-1,3))),axis=0)
seat_mask=np.abs(seat_rgb-seat_bg).max(axis=2)>24
seat_mask[:625,:]=False  # remove the generated hanging rods; build straight ones below
seat_mask[1000:,:]=False  # remove the enclosed pale background beneath the carriage
seat_loops=trace(seat_mask,(210,10,1100,1160),tolerance=12.0,min_area=600)
save_mask('big-wheel-seat-mask.png',seat_mask)
seat_photo.bleed(seat_mask)
seat_cx,seat_ground=656,1154; seat_scale=1.4/760
def seat_point(px,py,depth): return (depth,-(py-18)*seat_scale,(px-seat_cx)*seat_scale)
seat_mesh=PhotoMesh(); slab(seat_mesh,'seat',seat_photo,seat_loops,seat_point,-.31,.31,wall_scale=.003)
seat=seat_mesh.finish('big-wheel:seat-source',{'seat':seat_photo.material()})
for i in range(8):
    angle=math.tau*i/8; pivot_z=math.sin(angle)*wheel_radius; pivot_y=wheel_center_y+math.cos(angle)*wheel_radius
    chair=bpy.data.objects.new(f'big-wheel:seat-{i+1}',None); bpy.context.collection.objects.link(chair)
    chair.parent=current; chair.location=town.game_vector((0,pivot_y,pivot_z))
    # A level seat is deliberately not rotated with the wheel.
    copy=seat.copy(); copy.data=seat.data.copy(); bpy.context.collection.objects.link(copy)
    copy.name=f'big-wheel:seat-{i+1}-carriage'; copy.parent=chair; copy.location=(0,0,.50)
bpy.data.objects.remove(seat,do_unlink=True)

# Place the two straight hangers between each rim pivot and the measured seat.
bpy.context.view_layer.update()
for i in range(8):
    angle=math.tau*i/8; pivot_y=wheel_center_y+math.cos(angle)*wheel_radius; pivot_z=math.sin(angle)*wheel_radius
    for hanger,offset in enumerate((-.54,.54),1):
        beam(f'big-wheel:seat-{i+1}-hanger-{hanger}',
             (0,pivot_y-.03,pivot_z+offset),(0,pivot_y-1.18,pivot_z+offset),.055,'rusted-steel')

# Trace the supports from the same photograph using the same color key.
frame_mask=(np.abs(wheel_rgb-wheel_bg).max(axis=2)>24)&support_region
frame_opening=(yy>520)&(yy<1005)&(xx>665-(yy-735)*.35)&(xx<871+(yy-735)*.35)
frame_mask &= ~frame_opening
save_mask('big-wheel-frame-mask.png',frame_mask)
frame_loops=trace(frame_mask,(470,395,1065,1020),tolerance=1.2,min_area=50)
frame_photo=Photo(tex/'big-wheel-round8-side.png'); frame_scale=wheel_scale; frame_ground=1012; frame_cx=768
def frame_point(px,py,depth): return (depth,(frame_ground-py)*frame_scale,(px-frame_cx)*frame_scale)
frame_mesh=PhotoMesh(); slab(frame_mesh,'frame',frame_photo,frame_loops,frame_point,-.38,.38,wall_scale=.004)
frame_obj=frame_mesh.finish('big-wheel:traced-a-frame',{'frame':frame_photo.material()}); keep(frame_obj)

# Report every wheel piece in game axes (X, horizontal depth, Y up, Z horizontal).
wheel_pieces=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('big-wheel:')]
for piece in wheel_pieces:
    points=[piece.matrix_world @ Vector(corner) for corner in piece.bound_box]
    game_bounds={'min':[round(min(p[0] for p in points),3),round(min(p[2] for p in points),3),round(min(-p[1] for p in points),3)],
                 'max':[round(max(p[0] for p in points),3),round(max(p[2] for p in points),3),round(max(-p[1] for p in points),3)]}
    print('BIG-WHEEL BOUNDS',piece.name,json.dumps(game_bounds))
    if max(abs(game_bounds['min'][0]),abs(game_bounds['max'][0]),abs(game_bounds['min'][2]),abs(game_bounds['max'][2]))>11.5:
        raise RuntimeError(f'{piece.name} leaves the 3x3 footprint')
    if game_bounds['min'][1]<-.08 and piece.parent is None:
        raise RuntimeError(f'{piece.name} floats below the ground without a support parent')
for i in range(8):
    seat_obj=bpy.data.objects[f'big-wheel:seat-{i+1}-carriage']
    seat_points=[seat_obj.matrix_world @ Vector(corner) for corner in seat_obj.bound_box]
    seat_bounds=[(min(p[a] for p in seat_points),max(p[a] for p in seat_points)) for a in range(3)]
    game_seat={'min':[round(seat_bounds[0][0],3),round(seat_bounds[2][0],3),round(-seat_bounds[1][1],3)],
               'max':[round(seat_bounds[0][1],3),round(seat_bounds[2][1],3),round(-seat_bounds[1][0],3)]}
    rods=[bpy.data.objects[f'big-wheel:seat-{i+1}-hanger-{j}'] for j in (1,2)]
    def overlap(a,b): return all(a[k][0] <= b[k][1]+.025 and b[k][0] <= a[k][1]+.025 for k in range(3))
    hanger_bounds=[]
    for rod in rods:
        points=[rod.matrix_world @ Vector(corner) for corner in rod.bound_box]
        hanger_bounds.append([(min(p[a] for p in points),max(p[a] for p in points)) for a in range(3)])
    touching=any(overlap(seat_bounds,rb) for rb in hanger_bounds)
    print(f'BIG-WHEEL SEAT {i+1} BOUNDS',json.dumps(game_seat),'touches hanger:',touching)
    if not touching: raise RuntimeError(f'big wheel seat {i+1} misses its hangers')
# The coaster's two open scaffold faces are traced from one measured side photo.
# The grey studio is flood-masked, so the loop and lattice openings stay empty.
building_root('scrap-coaster','6x4')
coaster_photo=Photo(tex/'scrap-coaster-side.jpg')
coaster_photo.image['credit']='OpenAI ImageGen, 8 November 2026; original: C:/Users/kyleb/.codex/generated_images/01a1ba53-faf0-7211-958a-533c01f29a14/exec-0831b0c5-4bde-4064-bf5a-700eba73e097.png'
lift_if_dark(coaster_photo)
coaster_ground=320; coaster_start=12; coaster_end=1012
COASTER_SCALE=39.0/(coaster_end-coaster_start)
# The side photo's open scaffold cells do not all reach its frame. These
# measured neutral background patches seed each pocket so `trace` keeps the
# space between welded members open instead of turning it into a grey plate.
coaster_open_cells=[(251,216),(250,267),(272,239),(277,287),(337,196),(370,112),(371,167),
                    (376,231),(398,133),(399,76),(414,236),(449,186),(499,82),(504,226),
                    (514,169),(545,212),(760,170)]
coaster_mask=~coaster_photo.sky(photo_carve.edge_seeds(coaster_photo)+coaster_open_cells,
                               tolerance=22,grey=20)
coaster_mask[coaster_ground:,:]=False
# The main-body photo has an empty station; the separately carved train never
# enters either traced scaffold face.
photo_carve.save_mask(coaster_mask,evidence/'scrap-coaster-side-mask.png')
coaster_photo.bleed(coaster_mask)
coaster_loops=trace(coaster_mask,(8,8,1018,coaster_ground),tolerance=2.5,min_area=28)
if not coaster_loops: raise RuntimeError('scrap-coaster side silhouette did not trace')
def coaster_side_world(px,py,depth):
    return (-19.5+(px-coaster_start)*COASTER_SCALE,
            max(0,(coaster_ground-py)*COASTER_SCALE),depth-2.5)
for side,z in (('near',-.62),('far',.62)):
    face=PhotoMesh(); slab(face,'photo',coaster_photo,coaster_loops,coaster_side_world,z-.025,z+.025,wall_scale=COASTER_SCALE)
    obj=face.finish(f'scrap-coaster:scaffold-face-{side}',{'photo':coaster_photo.material()}); keep(obj)

# Station: a small timber deck, with steel legs and a short stair at the road end.
box('scrap-coaster:station-platform',(-17.0,2.55,-2.5),(6.0,.26,3.1),'weathered-plank',.04)
for x in (-19.6,-17.0,-14.4):
    for z in (-3.85,-1.15): beam(f'scrap-coaster:station-leg-{x}-{z}',(x,.04,z),(x,2.4,z),.16,'rusted-steel')
for step in range(5):
    x=-20.55+step*.34; y=.27+step*.36
    box(f'scrap-coaster:station-stair-{step+1}',(x,y,-2.5),(.44,.54,2.45),'weathered-plank',.025)

# Real twin rails sit over the traced side profiles. Cross ties connect the two
# 1.2 m separated scaffold faces; every support in the photo reaches grade.
track_pixels=[(12,247),(48,247),(88,247),(140,247),(192,246),(220,239),(250,219),(292,192),(338,160),
              (385,123),(430,87),(470,55),(505,35),(532,29),(552,41),(570,91),
              (585,150),(600,207),(615,245),(642,260),(675,263)]
for i in range(1,25):
    angle=math.pi/2+math.tau*i/24
    track_pixels.append((786+83*math.cos(angle),194+83*math.sin(angle)))
track_pixels.extend([(877,263),(916,263),(960,263),(1000,263)])
track=[]
for px,py in track_pixels:
    x=-19.5+(px-coaster_start)*COASTER_SCALE; y=max(.18,(coaster_ground-py)*COASTER_SCALE)
    track.append((x,y,-2.5))
for side,z in (('near',-2.5-.42),('far',-2.5+.42)):
    points=[(x,y,z) for x,y,_ in track]
    pipe(f'scrap-coaster:rail-{side}',points,.075,'galvanised-tin')
for i,(x,y,_) in enumerate(track[::2]):
    beam(f'scrap-coaster:cross-tie-{i+1}',(x,max(.06,y-.12),-3.0),(x,max(.06,y-.12),-2.0),.10,'rusted-steel')

train=bpy.data.objects.new('scrap-coaster:train',None);bpy.context.collection.objects.link(train);train.parent=current
train.location=town.game_vector((-17.0,2.85,-2.5))
cart_table={
    'photos':{'side':'scrap-coaster-cart-side.jpg','front':'scrap-coaster-cart-front.jpg',
              'rear':'scrap-coaster-cart-rear.jpg','top':'scrap-coaster-cart-top.jpg'},
    'length':1.55,'width':.82,'height':.88,
    # The cart's nose is on the right of the side photo; reversed pixel ends
    # keep the front and rear projections inside the same measured image.
    'side':{'start':969,'end':55,'ground':649},
    'front':{'centre':512,'ground':890,'top':73},
    'rear':{'centre':512,'ground':890,'top':73},
    'top':{'front':860,'rear':105,'centre':512},
    'forward':1,'side_front_on_left':False,
    'grey':20,'tolerance':30,'bleed_tolerance':34,'voxel':.035,'target':1800,
    'mask_dir':str(evidence/'scrap-coaster-cart-masks'),
}
first_cart=carve_object('scrap-coaster:train-cart-1',tex,cart_table)
for photo in cart_table['_photos'].values():
    photo.image['credit']='OpenAI ImageGen, 8 November 2026; original reference paths in textures/scrap-coaster-CREDITS.md'
first_cart.parent=train; first_cart.rotation_euler[2]=math.pi/2; first_cart.location=(-1.58,0,0)
for i,offset in ((2,0),(3,1.58)):
    copy=first_cart.copy(); copy.data=first_cart.data
    copy.name=f'scrap-coaster:train-cart-{i}'; bpy.context.collection.objects.link(copy)
    copy.parent=train; copy.rotation_euler[2]=math.pi/2; copy.location=(offset,0,0)
for i,x in enumerate((-17.0-1.58,-17.0,-17.0+1.58),1):
    if i<3: beam(f'scrap-coaster:train-coupler-{i}',(x+.60,2.77,-2.5),(x+1.00,2.77,-2.5),.065,'rusted-steel',train)

# Print and check every coaster mesh in game metres. Its 6 by 4 footprint is
# 48 by 32 m; retain a half-metre margin and prove each piece meets a support.
coaster_pieces=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('scrap-coaster:')]
def coaster_bounds(obj):
    points=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    values=[(min(p[axis] for p in points),max(p[axis] for p in points)) for axis in range(3)]
    # Blender Z up; exported game coordinates are X, Y-up, Z.
    return (values[0],values[2],(-values[1][1],-values[1][0]))
def coaster_overlap(a,b):
    return all(a[i][0]<=b[i][1]+.055 and b[i][0]<=a[i][1]+.055 for i in range(3))
coaster_boxes={piece:coaster_bounds(piece) for piece in coaster_pieces}
for piece,bounds in coaster_boxes.items():
    game_bounds={'min':[round(v[0],3) for v in bounds],'max':[round(v[1],3) for v in bounds]}
    print('SCRAP-COASTER BOUNDS',piece.name,json.dumps(game_bounds))
    if bounds[0][0]<-23.5 or bounds[0][1]>23.5 or bounds[2][0]<-15.5 or bounds[2][1]>15.5:
        raise RuntimeError(f'{piece.name} leaves the 6x4 footprint: {game_bounds}')
    if bounds[1][0]<-.06: raise RuntimeError(f'{piece.name} extends below ground: {game_bounds}')
    grounded=bounds[1][0]<=.035
    touches=grounded or any(other is not piece and coaster_overlap(bounds,other_bounds)
                            for other,other_bounds in coaster_boxes.items())
    print('SCRAP-COASTER CONTACT',piece.name,'ground' if grounded else 'another piece' if touches else 'NO CONTACT')
    if not touches: raise RuntimeError(f'{piece.name} floats without support')
coaster_triangles=sum(sum(len(poly.vertices)-2 for poly in piece.data.polygons) for piece in coaster_pieces)
print('SCRAP-COASTER TRIANGLES',coaster_triangles)
if coaster_triangles>14000: raise RuntimeError(f'scrap-coaster has {coaster_triangles} triangles; limit 14000')
if bpy.data.objects.get('scrap-coaster:train') is None: raise RuntimeError('scrap-coaster:train moving part is missing')

# TOWN-ART-FUN round 24: keep the churned-mud photo, but set the rim at grade
# and carry the hollow 1.5 m below it. The stand has its own generated views.
building_root('mud-pit','4x4')
mud_photo=Photo(tex/'mud-pit-top.jpg')
mud_photo.image['credit']='OpenAI image generation; original: C:/Users/kyleb/.codex/generated_images/01a1b9e1-3291-7a32-876e-9f29d2981d3c/exec-fccfe036-6b86-43b2-8b88-60f7fd570883.png'
lift_if_dark(mud_photo)
mud_solid=~mud_photo.sky(photo_carve.edge_seeds(mud_photo),tolerance=34,grey=30)
mud_photo.bleed(mud_solid)
mud_mesh=bpy.data.meshes.new('mud-pit concave earth and churned-mud photo surface')
mud_verts=[];mud_uvs=[];mud_faces=[]
grid=48;outer=10.2;floor_edge=6.35;pit_depth=1.5
def mud_surface(x,z):
    d=max(abs(x),abs(z))
    if d<=floor_edge:y=-pit_depth
    else:y=-pit_depth+pit_depth*min(1,(d-floor_edge)/(outer-floor_edge))
    if floor_edge<d<outer:y=max(-pit_depth,y+.035*math.sin(x*.83)*math.sin(z*.67)*min(1,(outer-d)/.65))
    return y
for j in range(grid+1):
    z=-outer+2*outer*j/grid
    for i in range(grid+1):
        x=-outer+2*outer*i/grid
        y=mud_surface(x,z)
        mud_verts.append(tuple(town.game_vector((x,y,z))))
        mud_uvs.append(mud_photo.uv(512+x*(455/outer),512+z*(480/outer)))
for j in range(grid):
    for i in range(grid):
        k=j*(grid+1)+i;mud_faces.append((k,k+grid+1,k+grid+2,k+1))
mud_mesh.from_pydata(mud_verts,[],mud_faces);mud_mesh.materials.append(mud_photo.material());mud_mesh.update()
mud_uv=mud_mesh.uv_layers.new(name='UVMap')
for poly in mud_mesh.polygons:
    for li in poly.loop_indices:mud_uv.data[li].uv=mud_uvs[mud_mesh.loops[li].vertex_index]
mud_body=bpy.data.objects.new('mud-pit:earth-bowl',mud_mesh);bpy.context.collection.objects.link(mud_body);keep(mud_body)

# One small stand sits on the ground beside the north rim, facing into the pit.
stand_photos={view:Photo(tex/f'mud-pit-stand-{view}.jpg') for view in ('side','front','rear','top')}
stand_originals={
    'side':'exec-434a8c6a-382b-4ea4-acf4-7021d3610c3a.png',
    'front':'exec-e01a69d6-d5c3-4252-8f52-6dd5f9234c34.png',
    'rear':'exec-fbfecc9e-3f49-469c-86b3-11dbc4095349.png',
    'top':'exec-a3f3ed62-933e-434a-92c6-789f865a2a51.png',
}
for view,photo in stand_photos.items():
    photo.image['credit']='OpenAI image generation; original: C:/Users/kyleb/.codex/generated_images/01a1ba23-4765-7201-81ca-91ce2d743b83/'+stand_originals[view]
stand_side=stand_photos['side'];stand_front=stand_photos['front']
for photo in stand_photos.values():lift_if_dark(photo)
stand_center_z=13.0;stand_width=8.2;stand_height=3.15

# Trace three separate plank rows from the generated front photo. Staggering
# each narrow seat toward the back keeps the underside visibly open.
front_mask=~stand_front.sky([(8,8),(1245,8),(8,1245),(1245,1245),
    (600,550),(600,745),(600,960),(600,1080)],tolerance=38,grey=30)
front_mask[1170:,:]=False
row_bands=((790,890,-1.18),(598,690,0),(410,500,1.18))
for row_index,(y0,y1,z_offset) in enumerate(row_bands,1):
    loops=trace(front_mask,(85,y0,1170,y1),tolerance=2.0,min_area=70)
    if not loops:raise RuntimeError(f'mud-pit stand seat row {row_index} did not trace')
    seat_mesh=PhotoMesh()
    def seat_point(px,py,depth,z_offset=z_offset):
        x=-stand_width/2+(px-105)*(stand_width/(1145-105))
        y=max(0,(1170-py)*(stand_height/(1170-75)))
        return (x,y,stand_center_z+z_offset+depth)
    slab(seat_mesh,'front',stand_front,loops,seat_point,-.38,.38,wall_scale=.003)
    seat=seat_mesh.finish(f'mud-pit:grandstand-plank-row-{row_index}',{'front':stand_front.material()})
    keep(seat)

# Pipe scaffold stays open under every seat. Its stepped uprights, cross rails
# and alternating braces follow the three measured seat levels.
seat_levels=(.94,1.52,2.10)
seat_z=(stand_center_z-1.18,stand_center_z,stand_center_z+1.18)
support_z=(stand_center_z-2.35,*seat_z,stand_center_z+2.35)
support_y=(.72,*seat_levels,2.72)
for x in (-3.82,3.82):
    for i,(z,y) in enumerate(zip(support_z,support_y)):
        beam(f'mud-pit:grandstand-post-{x}-{i}',(x,.05,z),(x,y,z),.09,'rusted-steel')
    for i in range(len(support_z)-1):
        z0,z1=support_z[i],support_z[i+1];y0,y1=support_y[i],support_y[i+1]
        beam(f'mud-pit:grandstand-side-rail-low-{x}-{i}',(x,.28,z0),(x,.28,z1),.065,'rusted-steel')
        beam(f'mud-pit:grandstand-side-rail-high-{x}-{i}',(x,y0*.78,z0),(x,y1*.78,z1),.065,'rusted-steel')
        if i%2==0:beam(f'mud-pit:grandstand-side-brace-{x}-{i}',(x,.28,z0),(x,y1*.78,z1),.065,'rusted-steel')
        else:beam(f'mud-pit:grandstand-side-brace-{x}-{i}',(x,y0*.78,z0),(x,.28,z1),.065,'rusted-steel')
for i,(z,y) in enumerate(zip(support_z,support_y)):
    beam(f'mud-pit:grandstand-cross-rail-{i}',(-3.82,y,z),(3.82,y,z),.075,'rusted-steel')
    beam(f'mud-pit:grandstand-seat-ledger-{i}',(-3.82,max(.25,y-.13),z),(3.82,max(.25,y-.13),z),.065,'rusted-steel')

# Four edge tyres are the only pieces that rise above the level rim.
for i,(x,z) in enumerate(((0,-10.05),(0,10.05),(-10.05,0),(10.05,0)),1):
    torus(f'mud-pit:edge-tyre-{i}',(x,.18,z),.48,.18,'tire',parent=current,major_segments=16,minor_segments=6)

# TOWN-ART-FUN round 22: the stalls follow their own photographed canvas and
# counter planks. The GLB read-back above proves game Y remains height.
# Their source
# elevations and plan photos are kept in textures; pieces follow measured
# structural landmarks rather than projecting goods onto the stall body.
def stall_awning(name, x0, x1, back_z, front_z, material):
    # One sewn roof slopes down from the rear rail toward the road. The front
    # edge has eight soft scallops, shaped from the reference silhouette.
    nx=24; nz=8; verts=[];faces=[];uvs=[]
    for j in range(nz+1):
        v=j/nz; z=back_z+(front_z-back_z)*v
        for i in range(nx+1):
            u=i/nx; x=x0+(x1-x0)*u
            scallop=(.13*(.5-.5*math.cos(math.tau*8*u)) if j==nz else 0)
            sag=.085*math.sin(math.pi*v)+.025*math.sin(math.tau*4*u)
            y=2.92-.32*v-sag-scallop
            verts.append(tuple(town.game_vector((x,y,z))))
            uvs.append((u,v))
    for j in range(nz):
        for i in range(nx):
            k=j*(nx+1)+i;faces.append((k,k+1,k+nx+2,k+nx+1))
    mesh=bpy.data.meshes.new(name+' photo-striped roof cloth');mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    layer=mesh.uv_layers.new(name='Reference-photo canvas UV')
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vi=mesh.loops[loop_index].vertex_index;layer.data[loop_index].uv=uvs[vi]
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);keep(obj)
    # A short vertical valance makes the photo's scalloped edge visible from
    # the road, instead of showing only the thin edge of the roof plane.
    vverts=[];vfaces=[];vuvs=[]
    for i in range(nx+1):
        u=i/nx;x=x0+(x1-x0)*u
        top=2.60-.11*math.sin(math.pi*u*8)**2
        bottom=top-.24-.12*(.5-.5*math.cos(math.tau*8*u))
        vverts.extend((tuple(town.game_vector((x,top,front_z-.025))),
                       tuple(town.game_vector((x,bottom,front_z-.025)))))
        vuvs.extend(((u,.78),(u,1.0)))
    for i in range(nx):
        k=i*2;vfaces.append((k,k+2,k+3,k+1))
    valance_mesh=bpy.data.meshes.new(name+' scalloped photo valance');valance_mesh.from_pydata(vverts,[],vfaces)
    valance_mesh.materials.append(material);valance_mesh.update()
    valance_uv=valance_mesh.uv_layers.new(name='Reference-photo hem UV')
    for polygon in valance_mesh.polygons:
        for loop_index in polygon.loop_indices:
            vi=valance_mesh.loops[loop_index].vertex_index;valance_uv.data[loop_index].uv=vuvs[vi]
    valance=bpy.data.objects.new(name.replace('striped-awning-photo','scalloped-photo-hem'),valance_mesh)
    bpy.context.collection.objects.link(valance);return keep(valance)

def stall_counter_photo(name, material, width_scale):
    # The photo supplies the worn board pattern on the full-depth box front.
    verts=[tuple(town.game_vector(p)) for p in (
        (-2.13*width_scale,.36,-.635),(2.13*width_scale,.36,-.635),
        (2.13*width_scale,1.02,-.635),(-2.13*width_scale,1.02,-.635))]
    mesh=bpy.data.meshes.new(name+' photo-faced plank panel');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.materials.append(material);mesh.update()
    layer=mesh.uv_layers.new(name='Front-photo counter UV')
    for poly in mesh.polygons:
        for loop_index,uv in zip(poly.loop_indices,((0,0),(1,0),(1,1),(0,1))):layer.data[loop_index].uv=uv
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);return keep(obj)

def build_fun_stall(name, sweets=False):
    stall_root=building_root(name,'1x1')
    width_scale=.53
    sx=lambda x:x*width_scale
    def stall_box(part,center,size,material,bevel=.025):
        # Small repeated stall boards stay crisp; bevel modifiers multiply
        # their exported triangle cost without changing the photo silhouette.
        return box(part,(sx(center[0]),center[1],center[2]),(size[0]*width_scale,size[1],size[2]),material,0)
    def stall_pipe(part,points,radius,material):
        return pipe(part,[(sx(x),y,z) for x,y,z in points],radius,material)
    # Four corner posts frame a 1.2 m stall. The canopy slopes from the 2.92 m
    # rear rail to the 2.60 m road-side rail, as in the photographed profile.
    front_z,back_z=-.60,.60
    for x in (-2.35,2.35):
        for z,top in ((front_z,2.60),(back_z,2.92)):
            stall_pipe(f'{name}:pipe-post-{x}-{z}',[(x,.05,z),(x,top,z)],.075,'rusted-steel')
    for y,z in ((2.92,back_z),(2.60,front_z),(1.02,front_z),(1.02,back_z)):
        stall_pipe(f'{name}:pipe-rail-{y}-{z}',[(-2.35,y,z),(2.35,y,z)],.065,'rusted-steel')
    for x in (-2.35,2.35):
        stall_pipe(f'{name}:awning-depth-rail-{x}',[(x,2.92,back_z),(x,2.60,front_z)],.06,'rusted-steel')
        stall_pipe(f'{name}:counter-depth-rail-{x}',[(x,1.02,front_z),(x,1.02,back_z)],.055,'rusted-steel')
        stall_pipe(f'{name}:base-depth-rail-{x}',[(x,.12,front_z),(x,.12,back_z)],.045,'rusted-steel')
    # A full-depth wooden counter box replaces the thin facade strip. The
    # upper face keeps the same weathered plank material as the front boards.
    stall_box(f'{name}:counter-kick',(0,.69,-.06),(4.45,.68,1.04),'weathered-plank',.035)
    if sweets:
        # Raised seams follow the red and yellow vertical boards in the photo.
        for i in range(10):
            x=-2.10+i*.467
            stall_box(f'{name}:painted-board-seam-{i}',(x,.69,-.646),(.025,.62,.025),'rusted-steel',0)
    else:
        # The hit-the-can photo has four broad horizontal weathered planks.
        for i in range(4):
            y=.36+i*.213
            stall_box(f'{name}:weathered-plank-seam-{i}',(0,y,-.646),(4.28,.025,.025),'rusted-steel',0)
    stall_counter_photo(f'{name}:counter-photo-face',counter_photo[name],width_scale)
    # Photo-mapped striped cloth replaces the false blue/grey patches.
    stall_awning(f'{name}:striped-awning-photo',sx(-2.34),sx(2.34),back_z,front_z,awning_photo[name])
    if not sweets:
        # A lower return shelf and a raised rear shelf carry the can target stack.
        stall_box(f'{name}:can-shelf-bracket-left',(-1.55,1.18,-.18),(.12,.7,.12),'rusted-steel',.02)
        stall_box(f'{name}:can-shelf-bracket-right',(1.55,1.18,-.18),(.12,.7,.12),'rusted-steel',.02)
        stall_box(f'{name}:can-shelf',(0,1.05,-.18),(3.35,.14,.70),'weathered-plank',.025)
        for row,count in enumerate((3,2,1)):
            for i in range(count):
                x=(i-(count-1)/2)*.68; y=1.29+row*.39; z=-.18
                cyl(f'{name}:stacked-tin-{row}-{i}',(sx(x),y,z),.245,.34,'galvanised-tin',12)
                cyl(f'{name}:can-lid-{row}-{i}',(sx(x),y+.18,z),.222,.035,'rusted-steel',8)
    else:
        # Sweets are individually jarred; colored candy pieces remain visible above the counter.
        for i,x in enumerate((-1.72,-.86,0,.86,1.72)):
            cyl(f'{name}:glass-jar-{i}',(sx(x),1.34,-.18),.245,.62,'dirty-glass',10)
            cyl(f'{name}:jar-candy-{i}',(sx(x),1.34,-.18),.205,.40,('red-paint','ochre-paint','red-paint','ochre-paint','red-paint')[i],12)
            cyl(f'{name}:jar-lid-{i}',(sx(x),1.68,-.18),.26,.09,'rusted-steel',8)
        stall_box(f'{name}:rear-sweets-shelf',(0,2.0,.26),(3.8,.13,.35),'weathered-plank',.025)
        for i,x in enumerate((-1.35,0,1.35)):
            cyl(f'{name}:shelf-sweets-jar-{i}',(sx(x),2.33,.26),.27,.53,'dirty-glass',10)
            cyl(f'{name}:shelf-candy-{i}',(sx(x),2.33,.26),.225,.37,('ochre-paint','red-paint','letter-paint')[i],8)
            cyl(f'{name}:shelf-lid-{i}',(sx(x),2.63,.26),.29,.08,'rusted-steel',8)
    # The supplied side elevation is about 0.85 as wide as it is tall. At the
    # 2.92 m roof height that puts the stall at roughly 2.5 m wide.
    return stall_root

stall_a=build_fun_stall('fun-stall-a',False)
stall_b=build_fun_stall('fun-stall-b',True)

def stall_bounds(obj):
    pts=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return [(min(p[i] for p in pts),max(p[i] for p in pts)) for i in range(3)]
def stall_touch(a,b,p=.035):
    return all(a[i][0]<=b[i][1]+p and b[i][0]<=a[i][1]+p for i in range(3))
for stall_name in ('fun-stall-a','fun-stall-b'):
    pieces=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and obj.name.startswith(stall_name+':')]
    for piece in pieces:
        b=stall_bounds(piece)
        gb={'min':[round(b[0][0],3),round(b[2][0],3),round(-b[1][1],3)],
            'max':[round(b[0][1],3),round(b[2][1],3),round(-b[1][0],3)]}
        print('STALL BOUNDS',piece.name,json.dumps(gb))
        if gb['min'][0]<-3.5 or gb['max'][0]>3.5 or gb['min'][2]<-3.5 or gb['max'][2]>3.5 or gb['min'][1]<-.03:
            raise RuntimeError(f'{piece.name} leaves its 1x1-cell footprint or ground: {gb}')
        if piece.data.uv_layers.active is None:
            piece.data.uv_layers.new(name='UVMap')
    for piece in pieces:
        b=stall_bounds(piece);grounded=b[2][0]<=.025
        touching=grounded or any(other is not piece and stall_touch(b,stall_bounds(other)) for other in pieces)
        print('STALL CONTACT',piece.name,'grounded' if grounded else 'touches another piece' if touching else 'NO CONTACT')
        if not touching: raise RuntimeError(f'{piece.name} floats without contact')
    depsgraph=bpy.context.evaluated_depsgraph_get()
    triangles=0
    for piece in pieces:
        evaluated=piece.evaluated_get(depsgraph);mesh=evaluated.to_mesh()
        triangles+=sum(len(poly.vertices)-2 for poly in mesh.polygons)
        evaluated.to_mesh_clear()
    print('STALL TRIANGLES',stall_name,triangles)
    if triangles>1800: raise RuntimeError(f'{stall_name} has {triangles} triangles (limit 1800)')

# Round 17: round the figure's cross-sections and favour the front/rear views
# on their respective halves. Keep the box-shaped plinth as a separate carve.
building_root('statue','1x1')
statue_root=current
class StatuePhoto(Photo):
    def sky(self, seeds, tolerance=20, grey=13):
        rgb=self.rgb()
        h,w=rgb.shape[:2]
        corners=np.concatenate((rgb[:48,:48].reshape(-1,3),rgb[:48,-48:].reshape(-1,3),
                                rgb[-48:,:48].reshape(-1,3),rgb[-48:,-48:].reshape(-1,3)))
        background=np.median(corners,axis=0)
        chroma=rgb.max(axis=2)-rgb.min(axis=2)
        return (np.max(np.abs(rgb-background),axis=2)<=24)&(chroma<=18)&(rgb.mean(axis=2)>=125)

photo_carve.Photo=StatuePhoto
plinth_top=.76
def statue_figure_keep(x,y,z):
    return y >= plinth_top
def statue_plinth_keep(x,y,z):
    return y <= plinth_top
statue_table={
    'photos':{'side':'statue-side.jpg','front':'statue-front.jpg',
              'rear':'statue-rear.jpg','top':'statue-above-r16.jpg'},
    'length':1.5,'width':1.8,'height':5.55,
    'side':{'start':285,'end':690,'ground':1515},
    'front':{'centre':512,'ground':1515,'top':22},
    'rear':{'centre':512,'ground':1515,'top':22,'top_height':5.55},
    # Grid landmarks on the straight-down view: plinth x=452..799, y=431..750.
    # Town front (-Z) is the top edge of the plan photo (front precedes rear).
    'top':{'front':431,'rear':750,'centre':625,'x_scale':1.8/347},
    'cut':{
        'front':[(375,1370,650,1515)],
    },
    'grey':26,'tolerance':34,'bleed_tolerance':28,
    'ends_split':0,'front_favour':3,'rear_favour':3,'round':2,
    'keep':statue_figure_keep,
    'voxel':.095,'target':900,
    'mask_dir':str(root/'.qa-dist/town-art-fun-round-17/figure-masks'),
}
statue_body=carve_object('statue:figure',textures,statue_table)
photo_carve.Photo=Photo
keep(statue_body,statue_root)
statue_body['source']='three generated orthographic photos and one straight-down render reference; round 17 rounded figure carve'
plinth_table={**statue_table,'keep':statue_plinth_keep,
    'mask_dir':str(root/'.qa-dist/town-art-fun-round-17/plinth-masks'),'target':550}
for key in ('ends_split','front_favour','rear_favour','round'):
    plinth_table.pop(key,None)
statue_plinth=carve_object('statue:plinth',textures,plinth_table)
keep(statue_plinth,statue_root)
statue_plinth['source']='separate square photo carve of the statue plinth'
statue_photo=statue_table['_photos']['front']
plaque_mesh=PhotoMesh()
plaque_loops=trace(
    ~statue_photo.sky([(8,8),(1015,8),(8,1510),(1015,1510)],tolerance=34,grey=26),
    (375,1370,650,1515))
slab(
    plaque_mesh,'front',statue_photo,plaque_loops,
    lambda px,py,d: ((px-512)*(.00372),(1515-py)*(.00372),-.75+d),-.045,.045)
plaque=plaque_mesh.finish('statue:blank-plaque',{'front':statue_photo.material()})
keep(plaque,statue_root)
plaque['blank']=True
statue_root.location.z=.05
bpy.context.view_layer.update()

def statue_bounds(obj):
    pts=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return [(min(p[i] for p in pts),max(p[i] for p in pts)) for i in range(3)]
statue_pieces=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('statue:')]
for piece in statue_pieces:
    b=statue_bounds(piece)
    gb={'min':[round(b[0][0],3),round(b[2][0],3),round(-b[1][1],3)],
        'max':[round(b[0][1],3),round(b[2][1],3),round(-b[1][0],3)]}
    print('STATUE BOUNDS',piece.name,json.dumps(gb))
    if gb['min'][0]<-3.5 or gb['max'][0]>3.5 or gb['min'][2]<-3.5 or gb['max'][2]>3.5 or gb['min'][1]<-.03:
        raise RuntimeError(f'{piece.name} leaves the 1x1 footprint or ground: {gb}')
def statue_touch(a,b,p=.04):
    return all(a[i][0]<=b[i][1]+p and b[i][0]<=a[i][1]+p for i in range(3))
for piece in statue_pieces:
    b=statue_bounds(piece)
    grounded=b[2][0]<=.025
    touches=grounded or any(o is not piece and statue_touch(b,statue_bounds(o)) for o in statue_pieces)
    print('STATUE CONTACT',piece.name,'grounded' if grounded else 'touches another piece' if touches else 'NO CONTACT')
    if not touches: raise RuntimeError(f'{piece.name} floats without contact')
statue_tris=sum(len(p.vertices)-2 for o in statue_pieces for p in o.data.polygons)
print('STATUE TRIANGLES',statue_tris)
if statue_tris>1800: raise RuntimeError(f'statue has {statue_tris} triangles (limit 1800)')

def mud_bounds(obj):
    pts=[obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return [(min(p[i] for p in pts),max(p[i] for p in pts)) for i in range(3)]
mud_pieces=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('mud-pit:')]
def mud_touch(a,b,p=.045):return all(a[i][0]<=b[i][1]+p and b[i][0]<=a[i][1]+p for i in range(3))
for piece in mud_pieces:
    b=mud_bounds(piece)
    gb={'min':[round(b[0][0],3),round(b[2][0],3),round(-b[1][1],3)],
        'max':[round(b[0][1],3),round(b[2][1],3),round(-b[1][0],3)]}
    print('MUD-PIT BOUNDS',piece.name,json.dumps(gb))
    if gb['min'][0]<-15.5 or gb['max'][0]>15.5 or gb['min'][2]<-15.5 or gb['max'][2]>15.5:
        raise RuntimeError(f'{piece.name} leaves the 4x4 footprint or extends below ground: {gb}')
    if piece.name=='mud-pit:earth-bowl':
        if gb['min'][1]<-1.52 or gb['min'][1]>-1.45 or abs(gb['max'][1])>.01:
            raise RuntimeError(f'mud-pit bowl must reach 1.5 m below grade and end at the grade-level rim: {gb}')
        print('MUD-PIT RIM',json.dumps({'Y':0,'hollow_floor_Y':gb['min'][1]}))
    elif gb['min'][1]<-.03:
        raise RuntimeError(f'{piece.name} extends below grade: {gb}')
    grounded=gb['min'][1]<=.025
    touches=grounded or any(other is not piece and mud_touch(b,mud_bounds(other)) for other in mud_pieces)
    print('MUD-PIT CONTACT',piece.name,'grounded' if grounded else 'touches another piece' if touches else 'NO CONTACT')
    if not touches:raise RuntimeError(f'{piece.name} floats without support')
mud_triangles=sum(len(poly.vertices)-2 for obj in mud_pieces for poly in obj.data.polygons)
print('MUD-PIT TRIANGLES',mud_triangles)
if mud_triangles>14000:raise RuntimeError(f'mud-pit has {mud_triangles} triangles; limit 14000')

# Assign every mesh the one shared picture-coordinate layer name before export.
for obj in bpy.data.objects:
    if obj.type=='MESH' and obj.data.uv_layers.active:
        obj.data.uv_layers.active.name='UVMap'
for image in bpy.data.images:
    if image.packed_file and image.size[0] > 256:
        image_name=Path(image.filepath).name
        if not image_name.startswith(('drive-in-','fountain-','statue-','mud-pit','scrap-coaster-')):
            image.scale(256,256)
        image.pack()
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
    export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=64)

import subprocess
blender=r'C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe'
if '--build-only' not in args:
    with (root/'.qa-dist/town-art-fun-review.log').open('w',encoding='utf-8') as log:
        result=subprocess.run([blender,'--background','--python',str(Path(__file__).resolve()),'--','--review-only','--wreck-only'],cwd=root,stdout=log,stderr=subprocess.STDOUT)
    if result.returncode: raise RuntimeError('imported-GLB wreck-ring render failed; see .qa-dist/town-art-fun-review.log')
print(json.dumps({'glb':str(out),'bytes':out.stat().st_size,'sheet':str(sheet)}))
