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
    'glasses_lens': ((0.88, 0.95, 0.97), 0.08),
    'eye': ((0.11, 0.075, 0.04), 0.4),
    'pupil': ((0.012, 0.009, 0.006), 0.35),
    'eye_glint': ((0.65, 0.62, 0.55), 0.2),
    'eye_white': ((0.48, 0.43, 0.35), 0.75),
    'lid': ((0.51, 0.32, 0.25), 0.9),
    'lid_shadow': ((0.38, 0.24, 0.19), 1.0),
    'lip': ((0.34, 0.19, 0.15), 0.95),
    'beard': ((0.16, 0.12, 0.095), 0.95),
    'canvas': ((0.22, 0.15, 0.085), 1.0),
    'canvas_seam': ((0.34, 0.25, 0.15), 1.0),
    'pencil': ((0.62, 0.36, 0.045), 0.85),
    'graphite': ((0.035, 0.03, 0.025), 0.9),
})

# A real clear lens, rather than an opaque block painted like glass.
lens = namespace['mat']('glasses_lens')
bsdf = lens.node_tree.nodes['Principled BSDF']
bsdf.inputs['Transmission Weight'].default_value = 1.0
bsdf.inputs['IOR'].default_value = 1.46
bsdf.inputs['Alpha'].default_value = 0.23
lens.surface_render_method = 'DITHERED'

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
    # Follow the actual scalp. The old ellipsoid dome read as a woollen cap.
    scalp = parts.new('close-cropped-hair', 'hair_grey', 'Head', smooth=True)
    me = rig.body.data
    for face in me.polygons:
        points = [me.vertices[i] for i in face.vertices]
        if not all(rig.vertex_region[v.index] == 'head' for v in points):
            continue
        centre = face.center
        front = centre.y < hc.y
        hairline = hc.z + hr.z * (0.56 if front else -0.18)
        if centre.z > hairline:
            verts = [scalp.verts.new(v.co + v.normal * 0.0025) for v in points]
            scalp.faces.new(verts)
    collar(parts, rig, 'cuff', width=0.025, off=0.008)
    waist_band(parts, rig, 'leather', z=1.04, width=0.033)
    for side, sign in [('l', 1), ('r', -1)]:
        cuff = parts.new('rolled-sleeve-' + side, 'cuff', 'lowerarm_' + side)
        band(cuff, rig, on_bone(rig, 'lowerarm_' + side, 0.045),
             rig.dir['lowerarm_' + side], 0.065, off=0.013, n=16)
    # Heavy canvas apron: the bib follows the chest; its skirt hangs freely.
    apron = parts.new('canvas-work-apron', 'canvas', 'spine_01', smooth=True)
    rows = []
    for row in range(9):
        z = 0.74 + row * 0.088
        width = 0.195 if z < 1.1 else 0.18 - (z - 1.1) * 0.19
        line = []
        for column in range(7):
            x = width * (column / 3 - 1)
            p, n = rig.cast((x, -1, max(z, 1.04)), (0, 1, 0))
            y = p.y - 0.022 if p is not None else -0.16
            if z < 1.04:
                y = -0.155 - 0.006 * math.cos(column * 2.1)
            line.append((x, y, z))
        rows.append(line)
    for row in range(8):
        for col in range(6):
            add_quad(apron, (rows[row][col], rows[row][col + 1], rows[row + 1][col + 1], rows[row + 1][col]), (0, -1, 0))
    bmesh.ops.remove_doubles(apron, verts=list(apron.verts), dist=0.0001)
    bmesh.ops.recalc_face_normals(apron, faces=list(apron.faces))
    seam = parts.new('apron-stitching-and-pocket', 'canvas_seam', 'spine_01')
    for edge in [0, 6]:
        add_ribbon(seam, [(Vector(row[edge]) + Vector((0, -0.003, 0)), Vector((0, -1, 0))) for row in rows], 0.008, side_axis=Vector((1, 0, 0)))
    p, n = rig.cast((0, -1, 1.34), (0, 1, 0))
    pocket_y = p.y - 0.04
    add_box(seam, (0.13, 0.009, 0.10), (0, pocket_y, 1.34), bevel=0.004)
    pencil = parts.new('pocket-pencil', 'pencil', 'spine_01')
    add_cyl(pencil, 0.005, 0.005, 0.115, (0.035, pocket_y - 0.008, 1.405), (0, -5, 0), segs=6)
    lead = parts.new('pencil-point', 'graphite', 'spine_01')
    add_cyl(lead, 0.005, 0, 0.018, (0.03, pocket_y - 0.008, 1.47), (0, -5, 0), segs=6)
    # Flat canvas neck straps leave the rolled shirt sleeves visible.
    for sign in [-1, 1]:
        strap(parts, rig, 'canvas_seam', [((sign * x, -1, z), (0, 1, 0)) for x, z in [(0.07, 1.44), (0.075, 1.51), (0.045, 1.56)]], 'spine_03', width=0.022, off=0.022, per=2)
    buttons = parts.new('shirt-buttons', 'glasses_frame', 'spine_03')
    for z in [1.17, 1.25, 1.33, 1.41, 1.49]:
        p, n = rig.cast((0, -1, z), (0, 1, 0))
        if p is not None:
            add_sphere(buttons, (0.004, 0.004, 0.004), p + n * 0.006, u=8, v=4)
    # Safety glasses rest above the brow, on the crown, never over the eyes.
    frames = parts.new('safety-glasses-frame', 'glasses_frame', 'Head')
    lenses = parts.new('safety-glasses-lenses', 'glasses_lens', 'Head')
    gy, gz = hc.y - hr.y * 0.72, hc.z + hr.z * 0.66
    for sign in [-1, 1]:
        centre = (hc.x + sign * 0.041, gy, gz)
        add_ring3d(frames, centre, (0, -0.79, 0.61), 0.022, 0.0024, segs=12, tsegs=4, squash=1.55)
        add_sphere(lenses, (0.032, 0.0017, 0.020), centre, (38, 0, 0), u=12, v=6)
        add_box(frames, (0.004, hr.y * 1.35, 0.004), (sign * (hr.x + 0.007), hc.y, gz - 0.008), (-12, 0, 0))
    add_box(frames, (0.023, 0.014, 0.009), (hc.x, gy, gz))
    # Fit the eye into the socket, not as a white bead above it. The iris
    # occupies most of the opening and disappears under the upper lid.
    eyes = parts.new('dark-irises', 'eye', 'Head', smooth=True)
    pupils = parts.new('pupils', 'pupil', 'Head', smooth=True)
    glints = parts.new('small-eye-catchlights', 'eye_glint', 'Head', smooth=True)
    whites = parts.new('warm-eye-corners', 'eye_white', 'Head', smooth=True)
    lids = parts.new('upper-and-smiling-lower-lids', 'lid', 'Head', smooth=True)
    shadows = parts.new('soft-upper-lid-crease', 'lid_shadow', 'Head', smooth=True)
    brows = parts.new('relaxed-eyebrows', 'hair_grey', 'Head', smooth=True)
    for sign in [-1, 1]:
        p, n = rig.cast((sign * 0.033, -1, hc.z - 0.009), (0, 1, 0))
        if p is None:
            continue
        def opening(mesh, width, offset):
            top, bottom = [], []
            for i in range(17):
                x = width * (-1 + i / 8)
                height = .0052 * math.sqrt(max(0, 1-(x/.0125)**2))
                if width < .012:
                    height = min(height, math.sqrt(max(0, width*width-x*x)))
                top.append(mesh.verts.new(p + Vector((x, offset, height))))
                bottom.append(mesh.verts.new(p + Vector((x, offset, -height*.7))))
            for i in range(16):
                mesh.faces.new([bottom[i], bottom[i+1], top[i+1], top[i]])
        opening(whites, .0125, -.002)
        opening(eyes, .009, -.0026)
        add_sphere(pupils, (.0026, .0003, .003), p + Vector((0, -.0031, 0)), u=12, v=6)
        add_sphere(glints, (.00065, .0002, .00065), p + Vector((-.0012, -.0035, .0015)), u=8, v=4)
        for upper in [True, False]:
            path = []
            for i in range(17):
                t = -1 + i / 8
                height = (0.0052 if upper else -0.00364) * math.sqrt(max(0, 1 - t*t))
                point = p + Vector((t * 0.0125, -0.004, height))
                path.append((point, Vector((0, -1, 0))))
            add_ribbon(lids, path, 0.0015 if upper else 0.0014, side_axis=Vector((0, 0, 1)))
            if upper:
                add_ribbon(shadows, [(v + Vector((0, 0.0008, 0.002)), n) for v, n in path],
                           0.0008, side_axis=Vector((0, 0, 1)))
        brow = []
        for i in range(9):
            t = -1 + i / 4
            point, normal = rig.cast((p.x + t * 0.014, -1, p.z + 0.019 + 0.003 * (1-t*t)), (0, 1, 0))
            if point is not None:
                brow.append((point + normal * 0.003, normal))
        add_ribbon(brows, brow, 0.003, side_axis=Vector((0, 0, 1)))
    # A small closed smile follows the existing mouth, with lifted corners.
    mouth = parts.new('gentle-closed-smile', 'lip', 'Head', smooth=True)
    path = []
    for i in range(25):
        t = -1 + i / 12
        p, n = rig.cast((t * 0.024, -1, hc.z - hr.z * 0.53 + 0.004 * t*t), (0, 1, 0))
        if p is not None:
            path.append((p + n * 0.0015, n))
    add_ribbon(mouth, path, 0.0016, side_axis=Vector((0, 0, 1)))
    # Stubble is painted into the skin below, with a continuous feathered
    # boundary. No separate coarse triangles create a saw-tooth beard edge.

spec = dict(body='Male', inflate={'torso': 0.018, 'arms': 0.012, 'legs': 0.014, 'feet': 0.014},
            groups=[
                dict(name='skin', mat='skin_c', regions=['head', 'forearms', 'hands'], tris=2900),
                dict(name='work-shirt', mat='shirt', regions=['torso', 'arms'], tris=1000),
                dict(name='trousers', mat='denim', regions=['legs'], tris=650),
                dict(name='work-boots', mat='leather', regions=['feet'], tris=350)])
pose = dict(lean=(0, 0, 0), head=(0, 0, -3),
            arm_l=dict(hand=(0.31, -0.16, 1.13), pole=(0.8, 0.3, -0.2), curl=0.15,
                       shoulder=-0.1, hand_dir=(0.6, -0.3, 0.1)),
            arm_r=arm_down(-1, fwd=0.04, curl=0.18),
            leg_l=leg_stand(1, 0.015), leg_r=leg_stand(-1, 0.025, 0.025))
person = build_person(spec, pose, outfit)
transform_person(person, 0.99, 0)
clear_scene()
model = merge_pieces('Brian-workshop-teacher', person.pieces)
# Vertex colour is exported with the GLB: softly shaded skin and feathered
# stubble work in both renderers, without a procedural shader or extra texture.
skin = namespace['mat']('skin_c')
skin.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .82
base = (0.62, 0.42, 0.33)
iris_mesh = [me for me, key, _ in person.pieces if key == 'eye'][0]
eye_z = sum(v.co.z for v in iris_mesh.vertices) / len(iris_mesh.vertices)
eye_x = sum(v.co.x for v in iris_mesh.vertices) / len(iris_mesh.vertices)
front = min(v.co.y for me, key, _ in person.pieces if key == 'skin_c' for v in me.vertices if v.co.z > eye_z - .13)
def smoothstep(a, b, x):
    t = max(0, min(1, (x-a)/(b-a)))
    return t*t*(3-2*t)
colours = model.data.color_attributes.new(name='Brian-skin', type='FLOAT_COLOR', domain='POINT')
skin_indices = {i for face in model.data.polygons if model.data.materials[face.material_index] == skin for i in face.vertices}
for v in model.data.vertices:
    if v.index not in skin_indices:
        colours.data[v.index].color = (1, 1, 1, 1)
        continue
    x, y, z = v.co
    beard = smoothstep(.035, .075, eye_z-z) * (1-smoothstep(.12, .155, eye_z-z))
    beard *= 1-smoothstep(front+.075, front+.15, y)
    # Leave the lip's immediate surround lighter, and soften every boundary.
    mouth_clear = math.exp(-((x-eye_x)/.027)**4 - ((z-(eye_z-.063))/.012)**4)
    beard *= 1-.75*mouth_clear
    cheek = math.exp(-((abs(x-eye_x)-.042)/.028)**2 - ((z-(eye_z-.035))/.032)**2)
    shade = 1 - .06*cheek
    stubble = (.09, .065, .05)
    amount = .72*beard if z > eye_z-.17 else 0
    colours.data[v.index].color = tuple(base[c]*shade*(1-amount) + stubble[c]*amount for c in range(3)) + (1,)
attribute = skin.node_tree.nodes.new('ShaderNodeVertexColor')
attribute.layer_name = 'Brian-skin'
skin.node_tree.links.new(attribute.outputs['Color'], skin.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
model['source'] = 'CC0 Quaternius Universal Base Characters; original Brian clothing and pose'
assert triangles() <= 8000, 'Brian exceeds the close-up character budget'
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
    namespace['reset']()
    bpy.ops.import_scene.gltf(filepath=str(destination))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new('review-world'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.25, .25, .25, 1)
    scene.view_settings.view_transform = 'AgX'
    for name, location, energy, size in [('key', (-2, -3, 4), 180, 3), ('fill', (2, -1, 2), 60, 2)]:
        light = bpy.data.lights.new(name, 'AREA'); light.energy = energy; light.shape = 'DISK'; light.size = size
        ob = bpy.data.objects.new(name, light); scene.collection.objects.link(ob); ob.location = location
        ob.rotation_euler = (Vector((0, 0, 1.5)) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new('review'); camera = bpy.data.objects.new('review', data)
    scene.collection.objects.link(camera); scene.camera = camera
    data.lens = 50
    for name, location, target in [('brian-close', (0, -.85, 1.66), (0, 0, 1.62)),
                                   ('brian-2m', (0, -2, 1.6), (0, 0, 1.6))]:
        camera.location = location
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(folder / (name + '.png'))
        bpy.ops.render.render(write_still=True)
