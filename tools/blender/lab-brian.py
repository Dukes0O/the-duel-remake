"""Brian, the Lab's workshop teacher. CC0 Quaternius adult anatomy; original outfit.

blender -b --factory-startup --python tools/blender/lab-brian.py -- --root .
    [--render .evidence/2026-10-26/LAB-LIFT-2/brian]
Metres, feet at origin, glTF +Y up and +Z forward. No saved Blender output.
The local CC0 source library is the same one used by rescue-people.py.
"""
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--render', default='')
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
destination = root / 'public/assets/models/lab/brian.glb'
if args.paths_only:
    print(json.dumps({'glb': [str(destination)], 'blend': [], 'json': []}))
    raise SystemExit

# Share the CC0 importer, anatomy posing and mesh kit, without running its batch.
source = (root / 'tools/blender/rescue-people.py').read_text(encoding='utf-8')
namespace = {'__name__': 'brian_mesh_kit'}
exec(compile(source.split('wanted = [n for n in NAMES')[0],
             'rescue-people.py', 'exec'), namespace)
globals().update({k: v for k, v in namespace.items() if not k.startswith('__')})
reset()
# Importer scratch is generated, never an input or a committed asset.
namespace['CACHE'] = root / '.qa-dist/lab-brian-base'
namespace['OUT'] = destination.parent

namespace['COLOURS'].update({
    'shirt': ((0.115, 0.18, 0.19), 0.94),
    'cuff': ((0.21, 0.28, 0.28), 0.94),
    'denim': ((0.055, 0.075, 0.09), 0.95),
    'leather': ((0.075, 0.047, 0.028), 0.9),
    'hair_grey': ((0.12, 0.105, 0.09), 0.95),
    'glasses_frame': ((0.07, 0.075, 0.065), 0.38),
    'glasses_lens': ((0.37, 0.44, 0.40), 0.2),
    'eye': ((0.045, 0.035, 0.025), 0.5),
})

BaseRig = namespace['Rig']
class TeacherRig(BaseRig):
    def __init__(self, arm, body):
        super().__init__(arm, body)
        names = {g.index: g.name for g in body.vertex_groups}
        for vertex in body.data.vertices:
            bone = names[max(vertex.groups, key=lambda g: g.weight).group]
            if bone.startswith('lowerarm'):
                self.vertex_region[vertex.index] = 'forearms'

namespace['Rig'] = TeacherRig

def outfit(parts, rig, spec):
    hc, hr = rig.head_metrics()
    hair(parts, rig, 'hair_grey', hc, hr)
    collar(parts, rig, 'cuff', width=0.025, off=0.008)
    waist_band(parts, rig, 'leather', z=1.04, width=0.033)
    for side, sign in [('l', 1), ('r', -1)]:
        cuff = parts.new('rolled-sleeve-' + side, 'cuff', 'lowerarm_' + side)
        band(cuff, rig, on_bone(rig, 'lowerarm_' + side, 0.045),
             rig.dir['lowerarm_' + side], 0.065, off=0.013, n=16)
    # A proper button-front work shirt with one stitched chest pocket.
    pocket = parts.new('shirt-pocket', 'cuff', 'spine_03')
    p, n = rig.cast((0.085, -1, 1.39), (0, 1, 0))
    add_box(pocket, (0.076, 0.012, 0.085), p + n * 0.008, bevel=0.004)
    buttons = parts.new('shirt-buttons', 'glasses_frame', 'spine_03')
    for z in [1.17, 1.25, 1.33, 1.41, 1.49]:
        p, n = rig.cast((0, -1, z), (0, 1, 0))
        if p is not None:
            add_sphere(buttons, (0.004, 0.004, 0.004), p + n * 0.006, u=8, v=4)
    # Safety glasses rest above the brow, on the crown, never over the eyes.
    frames = parts.new('safety-glasses-frame', 'glasses_frame', 'Head')
    lenses = parts.new('safety-glasses-lenses', 'glasses_lens', 'Head')
    gy, gz = hc.y - hr.y * 0.69, hc.z + hr.z * 0.73
    for sign in [-1, 1]:
        add_box(frames, (0.074, 0.017, 0.044), (hc.x + sign * 0.041, gy, gz), (38, 0, 0), bevel=0.009)
        add_box(lenses, (0.060, 0.019, 0.031), (hc.x + sign * 0.041, gy - 0.004, gz), (38, 0, 0), bevel=0.006)
        add_box(frames, (0.008, hr.y * 1.35, 0.009), (sign * (hr.x + 0.007), hc.y, gz - 0.008), (-12, 0, 0))
    add_box(frames, (0.023, 0.014, 0.009), (hc.x, gy, gz))
    # Small natural eyes and eyebrows, with no oversized cartoon features.
    eyes = parts.new('eyes', 'eye', 'Head', smooth=True)
    brows = parts.new('eyebrows', 'hair_grey', 'Head')
    for sign in [-1, 1]:
        p, n = rig.cast((sign * 0.033, -1, hc.z + 0.015), (0, 1, 0))
        if p is not None:
            add_sphere(eyes, (0.009, 0.004, 0.004), p + n * 0.003, u=10, v=6)
            add_box(brows, (0.027, 0.006, 0.004), p + n * 0.004 + Vector((0, 0, 0.018)))

spec = dict(body='Male', inflate={'torso': 0.018, 'arms': 0.012, 'legs': 0.014, 'feet': 0.014},
            groups=[
                dict(name='skin', mat='skin_c', regions=['head', 'forearms', 'hands'], tris=2900),
                dict(name='work-shirt', mat='shirt', regions=['torso', 'arms'], tris=1400),
                dict(name='trousers', mat='denim', regions=['legs'], tris=1100),
                dict(name='work-boots', mat='leather', regions=['feet'], tris=450)])
pose = dict(lean=(0, 0, 0), head=(0, 0, -3),
            arm_l=dict(hand=(0.31, -0.16, 1.13), pole=(0.8, 0.3, -0.2), curl=0.15,
                       shoulder=-0.1, hand_dir=(0.6, -0.3, 0.1)),
            arm_r=arm_down(-1, fwd=0.04, curl=0.18),
            leg_l=leg_stand(1, 0.015), leg_r=leg_stand(-1, 0.025, 0.025))
person = build_person(spec, pose, outfit)
transform_person(person, 0.99, 0)
clear_scene()
model = merge_pieces('Brian-workshop-teacher', person.pieces)
model['source'] = 'CC0 Quaternius Universal Base Characters; original Brian clothing and pose'
destination.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
print(f'Brian: {triangles()} triangles; {destination.stat().st_size} bytes')
if args.render:
    folder = (root / args.render).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    namespace['render_glb']('brian', folder)
