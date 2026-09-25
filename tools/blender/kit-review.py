"""Render a matched three-quarter Blender review of the real car and kit GLBs."""
import argparse
import json
from pathlib import Path
import sys

TARGET_LENGTHS = {'falcone_f42':4.80,'stuttgart_959s':4.80,
                  'falcone_heritage':4.80,'aurora_gt':4.80,
                  'dusthawk_rally':4.20,'banshee_muscle':5.10,
                  'viper_proto':4.90,'titan_monster':5.20,
                  'koenigsegg_jesko':4.95}

def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--car', default='falcone_f42', choices=TARGET_LENGTHS)
    parser.add_argument('--out', required=True)
    parser.add_argument('--paths-only', action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
    root=Path(args.root).resolve()
    output=Path(args.out).resolve()
    if not output.is_relative_to(root/'.evidence') or output.suffix.lower()!='.png':
        parser.error('review PNG must be under the requested root/.evidence')
    return args, root, output

if '--paths-only' in sys.argv:
    _,_,output=arguments()
    print(json.dumps({'blend':[],'glb':[],'evidence':[str(output)],'summary':[]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector


def main():
    args,root,output = arguments()
    car_file = root / 'public/assets/models/classics' / f'{args.car}.glb'
    if not car_file.exists():
        car_file = root / 'public/assets/models/unlocks' / f'{args.car}.glb'
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(car_file))
    car_meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not car_meshes:
        raise RuntimeError('Car GLB has no mesh')
    points = [obj.matrix_world @ Vector(corner) for obj in car_meshes for corner in obj.bound_box]
    lo = [min(p[axis] for p in points) for axis in range(3)]
    hi = [max(p[axis] for p in points) for axis in range(3)]
    print('CAR_BOUNDS', lo, hi)
    # Imported glTF is Blender Z-up. Match the actual target runtime length.
    center = Vector(((lo[0]+hi[0])/2, (lo[1]+hi[1])/2, lo[2]))
    scale = TARGET_LENGTHS[args.car] / max(.001, hi[1]-lo[1])
    for obj in bpy.context.scene.objects:
        if obj.parent is None:
            obj.location -= center
            obj.scale *= scale
    bpy.ops.import_scene.gltf(filepath=str(root / 'public/assets/models/wasteland/kits' / f'{args.car}.glb'))
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.hide_render = False
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.04))
    floor = bpy.context.object
    floor.name = 'neutral review floor'
    mat = bpy.data.materials.new('neutral grey')
    mat.diffuse_color = (.28,.28,.28,1)
    floor.data.materials.append(mat)
    bpy.ops.object.camera_add(location=(7,8,5))
    cam = bpy.context.object
    target = Vector((0,0,1.65 if args.car == 'titan_monster' else 1.0))
    cam.rotation_euler = (target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'
    cam.data.ortho_scale=10.5 if args.car == 'titan_monster' else 8.5
    bpy.context.scene.camera=cam
    for location, power, size in [((5,-4,9),1400,6),((-6,2,5),900,6)]:
        bpy.ops.object.light_add(type='AREA', location=location)
        lamp=bpy.context.object
        lamp.data.energy=power
        lamp.data.shape='DISK'
        lamp.data.size=size
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=24
    scene.render.resolution_x=960
    scene.render.resolution_y=540
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(output)
    scene.world.color=(.42,.42,.42)
    bpy.ops.render.render(write_still=True)


if __name__=='__main__':
    main()
