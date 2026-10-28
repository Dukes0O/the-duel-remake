"""North woods original moose, shared rig and exported-model review helpers.

Coordinates are metres, +X forward, Z up; glTF uses Y up.
The other four species use licensed donors through adapt.py.
"""
import argparse
import json
import math
import sys
from pathlib import Path

IDS = ('white-tailed-deer', 'moose', 'black-bear', 'beaver', 'eastern-wolf')


def cli(species):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--paths-only', action='store_true')
    parser.add_argument('--cache', type=Path, default=Path('C:/Users/kyleb/dev/art-library/wild-north-woods'))
    parser.add_argument('--review', action='store_true', help='Render exported GLB, without rebuilding it')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    root = args.root.resolve()
    plan = {'blend': [], 'glb': [] if args.review else [str(root / 'public/assets/wildlife' / (species + '.glb'))],
            'evidence': [str(root / '.qa-dist/wildlife-round-1' / (species + '-' + view + '.png'))
                         for view in ('side', 'three-quarter', 'idle-25', 'idle-75', 'walk-25', 'walk-75')] if args.review else [],
            'json': [str(root / '.qa-dist/wildlife-round-1' / (species + '-inspection.json'))] if args.review else []}
    if args.paths_only:
        print(json.dumps(plan))
        return
    import bpy
    globals()['bpy'] = bpy
    from mathutils import Vector, Quaternion
    globals().update(Vector=Vector, Quaternion=Quaternion)
    if args.review:
        review(species, root)
    elif species != 'moose':
        import adapt
        adapt.build(species, Path(plan['glb'][0]), sys.modules[__name__], args.cache)
    else:
        build(species, Path(plan['glb'][0]))


def material():
    mat = bpy.data.materials.new('Natural coat | painted vertices')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    coat = nodes.new('ShaderNodeVertexColor')
    coat.layer_name = 'Coat'
    shader = nodes.get('Principled BSDF')
    mat.node_tree.links.new(coat.outputs['Color'], shader.inputs['Base Color'])
    shader.inputs['Roughness'].default_value = .94
    return mat


def finish_coat(mesh):
    """Bake unlit coat colour and fine directional fur into one embedded 1K map."""
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    for edge in mesh.data.edges:
        edge.use_edge_sharp = False
    for face in mesh.data.polygons:
        face.use_smooth = True
    mesh.data.normals_split_custom_set([(0, 0, 0)] * len(mesh.data.loops))
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(island_margin=.015)
    bpy.ops.object.mode_set(mode='OBJECT')
    mat = mesh.data.materials[0]
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    coord = nodes.new('ShaderNodeTexCoord')
    stretch = nodes.new('ShaderNodeVectorMath')
    stretch.operation = 'MULTIPLY'
    stretch.inputs[1].default_value = (30, 210, 210)
    links.new(coord.outputs['Generated'], stretch.inputs[0])
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 1
    noise.inputs['Detail'].default_value = 2
    links.new(stretch.outputs['Vector'], noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (.48, .48, .48, 1)
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    links.new(noise.outputs['Fac'], ramp.inputs[0])
    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 1
    links.new(next(n for n in nodes if n.type == 'VERTEX_COLOR').outputs['Color'], mix.inputs[1])
    links.new(ramp.outputs['Color'], mix.inputs[2])
    shader = nodes.get('Principled BSDF')
    links.new(mix.outputs[0], shader.inputs['Base Color'])
    image = bpy.data.images.new(mesh.name + ' natural coat', width=1024, height=1024)
    target = nodes.new('ShaderNodeTexImage')
    target.image = image
    nodes.active = target
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 1
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.use_pass_color = True
    scene.render.bake.margin = 8
    bpy.ops.object.bake(type='DIFFUSE', margin=8, margin_type='EXTEND')
    links.new(target.outputs['Color'], shader.inputs['Base Color'])
    # Colour is now in the map, so neutral vertex colours avoid multiplying it
    # twice in glTF. Remove the superseded procedural shader nodes.
    for value in mesh.data.color_attributes['Coat'].data:
        value.color = (1, 1, 1, 1)
    for attribute in list(mesh.data.color_attributes):
        if attribute.name != 'Coat':
            mesh.data.color_attributes.remove(attribute)
    mesh.data.color_attributes.active_color_index = 0
    for node in list(nodes):
        if node not in (target, shader, nodes.get('Material Output')):
            nodes.remove(node)
    image.pack()


class Animal:
    def __init__(self, species):
        self.species = species
        self.verts, self.faces, self.weights, self.colours = [], [], [], []
        self.bones = {}
        self.legs = []

    def bone(self, name, head, tail, parent=None):
        self.bones[name] = (head, tail, parent)

    def paint(self, p, base, region):
        x, y, z = p
        # Small coherent coat variation, deliberately free of baked lighting.
        grain = (math.sin(x * 89 + y * 31 + z * 17) * .025 +
                 math.sin(x * 23 - y * 47 + z * 63) * .018)
        colour = base
        if region == 'body':
            if self.species == 'eastern-wolf':
                saddle = max(0, min(1, (z - .73) * 5)) * max(0, 1 - abs(x + .05) / .85)
                colour = tuple(v * (1 - saddle * .50) for v in base)
            elif self.species in ('white-tailed-deer', 'moose') and z < self.belly + .08:
                colour = tuple(v * 1.18 for v in base)
        return tuple(max(.003, min(1, v * (1 + grain))) for v in colour) + (1,)

    def surface(self, vertices, faces, colour, weight, region='detail'):
        offset = len(self.verts)
        for p in vertices:
            self.verts.append(tuple(p))
            self.weights.append(weight(p) if callable(weight) else {weight: 1})
            self.colours.append(self.paint(p, colour, region))
        self.faces.extend(tuple(i + offset for i in face) for face in faces)

    def loft(self, sections, colour, weight, sides=12, region='detail'):
        """Cross sections (centre, lateral radius, vertical radius) along a spine.

        Cross-section planes follow the spine so necks and limbs taper naturally.
        The continuous rings form an anatomical outline instead of stacked balls.
        """
        vertices, faces = [], []
        for i, (centre, width, height) in enumerate(sections):
            tangent = Vector(sections[min(i + 1, len(sections) - 1)][0]) - Vector(sections[max(0, i - 1)][0])
            tangent.normalize()
            lateral = Vector((0, 1, 0))
            vertical = tangent.cross(lateral).normalized()
            for j in range(sides):
                a = 2 * math.pi * j / sides
                vertices.append(Vector(centre) + lateral * (math.cos(a) * width) + vertical * (math.sin(a) * height))
        for i in range(len(sections) - 1):
            for j in range(sides):
                a = i * sides + j
                b = i * sides + (j + 1) % sides
                faces.append((a, b, b + sides, a + sides))
        faces.extend([tuple(reversed(range(sides))), tuple((len(sections) - 1) * sides + j for j in range(sides))])
        self.surface(vertices, faces, colour, weight, region)

    def oval(self, centre, radii, colour, bone, rings=6, sides=12):
        x, y, z = centre
        rx, ry, rz = radii
        self.loft([((x + rx * math.cos(math.pi * i / rings), y, z),
                    max(.001, ry * math.sin(math.pi * i / rings)),
                    max(.001, rz * math.sin(math.pi * i / rings))) for i in range(rings + 1)], colour, bone, sides)

    def tube(self, points, radii, colour, bone, sides=8):
        self.loft([(p, r, r) for p, r in zip(points, radii)], colour, bone, sides)

    def ear(self, base, tip, width, colour, inner):
        x, y, z = base
        tx, ty, tz = tip
        vertices = [(x - width * .45, y, z), (x, y - width * .50, z + .03),
                    (tx, ty, tz), (x, y + width * .50, z + .03),
                    (x + .045, y, z + width * .5)]
        self.surface(vertices, [(0, 1, 2), (0, 2, 3), (1, 4, 2), (4, 3, 2), (0, 3, 4, 1)], colour, 'head')
        self.surface([(x + .047, y - width * .28, z + .05),
                      (tx + .006, ty, tz - .04), (x + .047, y + width * .28, z + .05)],
                     [(0, 1, 2)], inner, 'head')

    def leg(self, name, hip, knee, ankle, toe, radii, colour, foot, hind=False, cloven=False):
        upper, lower, paw = name + '.upper', name + '.lower', name + '.foot'
        self.bone(upper, hip, knee, 'spine')
        self.bone(lower, knee, ankle, upper)
        self.bone(paw, ankle, (toe[0] + .06, toe[1], toe[2]), lower)
        self.legs.append((name, hip, knee, ankle, toe, hind))
        h, k, a = Vector(hip), Vector(knee), Vector(ankle)
        # Interpolate joint weights within each segment; no loose rigid limb chunks.
        def skin(start, end, primary, next_bone):
            d = end - start
            def weights(p):
                t = max(0, min(1, (Vector(p) - start).dot(d) / d.length_squared))
                mix = max(0, (t - .70) / .30) * .5
                return {primary: 1 - mix, next_bone: mix}
            return weights
        self.loft([(hip, radii[0], radii[0] * 1.12),
                   (tuple(h.lerp(k, .45)), radii[0] * .82, radii[0]),
                   (knee, radii[1], radii[1])], colour, skin(h, k, upper, lower), 10)
        self.loft([(knee, radii[1] * 1.07, radii[1] * 1.07),
                   (tuple(k.lerp(a, .45)), radii[1] * .64, radii[1] * .74),
                   (ankle, radii[2], radii[2])], colour, skin(k, a, lower, paw), 10)
        # The pastern joins the ankle to the hoof. Without it the vertical
        # lower-leg cap ends above the hoof and leaves a visible air gap.
        self.loft([(ankle, radii[2], radii[2]),
                   ((toe[0], toe[1], .07), radii[2], radii[2])], colour, paw, 10)
        length = .075 if cloven else radii[2] * 1.8
        width = radii[2] * (1.15 if cloven else 1.6)
        self.oval((toe[0], toe[1], .045 if cloven else radii[2] * .55),
                  (length, width, .045 if cloven else radii[2] * .55), foot, paw, 4, 10)
        if cloven:
            # Thin visible cleft between the two forward hoof lobes.
            self.tube([(toe[0] + length * .35, toe[1], .075),
                       (toe[0] + length * .94, toe[1], .025)], [.006, .004], (.018, .014, .012), paw, 4)
        else:
            for offset in (-.6, 0, .6):
                self.oval((toe[0] + length * .65, toe[1] + offset * width, .025),
                          (length * .35, width * .29, .024), foot, paw, 3, 8)


def ungulate(a, moose):
    coat = (.16, .105, .068) if moose else (.29, .185, .105)
    dark = (.055, .041, .029)
    pale = (.52, .46, .35) if moose else (.71, .68, .57)
    a.belly = .97 if moose else .72
    # Rear to front: rump, barrel, withers and narrow brisket.
    profiles = [(-1.06, 1.40, .12, .25), (-.87, 1.46, .32, .46),
                (-.50, 1.43, .36, .43), (-.05, 1.47, .36, .46),
                (.39, 1.57, .35, .55), (.64, 1.59, .27, .52), (.79, 1.52, .14, .34)] if moose else [
                (-.82, 1.03, .09, .17), (-.65, 1.08, .22, .30),
                (-.32, 1.08, .255, .29), (.05, 1.10, .25, .31),
                (.36, 1.13, .22, .33), (.52, 1.14, .13, .24)]
    a.loft([((x, 0, z), w, h) for x, z, w, h in profiles], coat, 'spine', 16, 'body')
    neckbase = (.55, 0, 1.62) if moose else (.36, 0, 1.20)
    skull = (1.02, 0, 2.10) if moose else (.74, 0, 1.60)
    a.bone('neck', neckbase, skull, 'spine')
    a.bone('head', skull, (skull[0] + .37, 0, skull[2] - .1), 'neck')
    a.loft([(neckbase, .25 if moose else .18, .32 if moose else .23),
            ((.72, 0, 1.88) if moose else (.52, 0, 1.43), .19 if moose else .12, .29 if moose else .20),
            (skull, .17 if moose else .105, .22 if moose else .14)], coat, 'neck', 14)
    if moose:
        a.loft([((.94, 0, 2.15), .12, .16), ((1.13, 0, 2.08), .17, .22),
                ((1.34, 0, 1.93), .17, .20), ((1.52, 0, 1.86), .18, .17),
                ((1.61, 0, 1.86), .12, .12)], coat, 'head', 14)
        a.oval((1.57, 0, 1.88), (.095, .155, .11), dark, 'head')
        # Hanging bell, separated from the long muzzle.
        a.loft([((.94, 0, 1.89), .10, .11), ((.94, 0, 1.68), .075, .10),
                ((.90, 0, 1.53), .025, .035)], dark, 'head', 10)
    else:
        a.loft([((.68, 0, 1.63), .09, .12), ((.83, 0, 1.59), .11, .135),
                ((1.00, 0, 1.49), .068, .077), ((1.11, 0, 1.46), .054, .054)], coat, 'head', 14)
        a.oval((1.105, 0, 1.47), (.035, .057, .031), dark, 'head')
        a.loft([((.67, 0, 1.39), .070, .070), ((.53, 0, 1.23), .10, .10)], pale, 'neck', 10)
        a.oval((1.005, 0, 1.443), (.09, .058, .027), pale, 'head', 4)
    for side in (-1, 1):
        sy = side
        eye = (1.17, sy * .155, 2.13) if moose else (.855, sy * .101, 1.63)
        a.oval(eye, (.017 if moose else .012, .008, .012), (.012, .010, .007), 'head', 4, 8)
        base = (.96, sy * .13, 2.22) if moose else (.70, sy * .08, 1.71)
        tip = (.84, sy * .43, 2.51) if moose else (.65, sy * .23, 1.94)
        a.ear(base, tip, .23 if moose else .14, coat, (.23, .18, .14))
        if moose:
            # Broad thin palm with uneven outer edge and individual tines.
            a.tube([(.96, sy * .11, 2.26), (.85, sy * .35, 2.41), (.75, sy * .58, 2.48)], [.055, .045, .035], (.38, .31, .21), 'head')
            outline = [(.53, .47, 2.47), (.92, .43, 2.45), (1.08, .62, 2.55),
                       (1.04, .81, 2.64), (.87, .94, 2.69), (.62, 1.02, 2.70),
                       (.38, .92, 2.64), (.34, .66, 2.53)]
            top = [(x, sy * y, z) for x, y, z in outline]
            bottom = [(x, sy * y, z - .045) for x, y, z in outline]
            faces = [(i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i) for i in range(8)]
            faces += [tuple(range(8)), tuple(reversed(range(8, 16)))]
            a.surface(top + bottom, faces, (.40, .33, .23), 'head')
            for i in range(2, 7):
                p = Vector(top[i])
                end = p + Vector((.04, sy * .13, .18 + .025 * (i % 2)))
                a.tube([p, p.lerp(end, .6), end], [.032, .021, .003], (.50, .43, .30), 'head', 6)
        else:
            beam = [(.71, sy * .065, 1.74), (.64, sy * .16, 1.94),
                    (.72, sy * .28, 2.06), (.91, sy * .31, 2.10), (1.03, sy * .29, 2.14)]
            a.tube(beam, [.025, .024, .021, .013, .002], (.43, .35, .24), 'head', 7)
            for p, end in [(beam[1], (.58, sy * .15, 2.12)), (beam[2], (.70, sy * .28, 2.28)), (beam[3], (.92, sy * .34, 2.29))]:
                a.tube([p, end], [.017, .002], (.50, .42, .29), 'head', 6)
    for hind, x, z in [(True, -.78 if moose else -.58, 1.47 if moose else 1.11),
                        (False, .49 if moose else .34, 1.53 if moose else 1.15)]:
        for side in (-1, 1):
            y = side * (.245 if moose else .175)
            hip = (x, y, z)
            knee = (x + (.23 if hind else -.10), y, z * .52)
            ankle = (x - (.06 if hind else 0), y, .13)
            toe = (ankle[0] + .035, y, .045)
            a.leg(('rear' if hind else 'front') + ('.L' if side > 0 else '.R'), hip, knee, ankle, toe,
                  (.17 if hind else .115, .065, .042) if moose else (.12 if hind else .075, .042, .025),
                  coat, dark, hind, True)
    tailbase = (-1.00, 0, 1.51) if moose else (-.76, 0, 1.11)
    tailtip = (-1.14, 0, 1.32) if moose else (-.97, 0, 1.38)
    a.bone('tail', tailbase, tailtip, 'spine')
    a.loft([(tailbase, .06, .06), (tailtip, .075 if not moose else .045, .02)], coat, 'tail', 10)
    if not moose:
        a.loft([((-.79, 0, 1.13), .054, .025), ((-.93, 0, 1.34), .065, .018),
                ((-.97, 0, 1.38), .045, .008)], (.79, .77, .69), 'tail', 10)


def rig(a, mesh):
    armature = bpy.data.armatures.new(a.species + ' skeleton')
    obj = bpy.data.objects.new(a.species + ' rig', armature)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (head, tail, parent) in a.bones.items():
        bone = armature.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = armature.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for name in a.bones:
        group = mesh.vertex_groups.new(name=name)
        for index, weights in enumerate(a.weights):
            if weights.get(name, 0) > 0:
                group.add([index], weights[name], 'REPLACE')
    modifier = mesh.modifiers.new('Weighted wildlife skeleton', 'ARMATURE')
    modifier.object = obj
    mesh.parent = obj
    return obj


def rotate_world(obj, name, angle, axis=(0, 1, 0)):
    pose = obj.pose.bones[name]
    pose.rotation_mode = 'QUATERNION'
    local_axis = obj.data.bones[name].matrix_local.to_3x3().inverted() @ Vector(axis)
    pose.rotation_quaternion = Quaternion(local_axis, angle)
    pose.keyframe_insert('rotation_quaternion')


def animate(a, obj):
    scene = bpy.context.scene
    scene.render.fps = 30
    obj.animation_data_create()
    for clip, frames in [('Idle', 120), ('Walk', 48)]:
        obj.animation_data.action = None
        for bone in obj.pose.bones:
            bone.rotation_mode = 'QUATERNION'
            bone.rotation_quaternion = (1, 0, 0, 0)
            bone.scale = (1, 1, 1)
            bone.location = (0, 0, 0)
        for f in range(1, frames + 2, 2):
            scene.frame_set(f)
            t = (f - 1) / frames * math.tau
            if clip == 'Idle':
                rotate_world(obj, 'head', .12 * math.sin(t), (0, 0, 1))
                rotate_world(obj, 'neck', .025 * math.sin(t * 2))
                obj.pose.bones['spine'].scale = (1 + .012 * math.sin(t * 2), 1, 1 + .010 * math.sin(t * 2))
                obj.pose.bones['spine'].keyframe_insert('scale')
                rotate_world(obj, 'tail', .045 * math.sin(t), (0, 0, 1))
            else:
                # Diagonal pairs with a quarter-cycle offset give a four-beat walk.
                offsets = {'rear.L': 0, 'front.L': .25, 'rear.R': .50, 'front.R': .75}
                stride = .12 if a.species == 'beaver' else .38 if a.species == 'moose' else .25
                lift = .035 if a.species == 'beaver' else .10
                for name, hip, knee, ankle, toe, hind in a.legs:
                    phase = ((f - 1) / frames + offsets[name]) % 1
                    # Foot travels back on ground for 60% of the loop, then lifts.
                    if phase < .60:
                        dx = stride * (.5 - phase / .60)
                        dz = 0
                    else:
                        u = (phase - .60) / .40
                        dx = stride * (-.5 + u)
                        dz = lift * math.sin(math.pi * u)
                    h, k, old = Vector(hip), Vector(knee), Vector(ankle)
                    target = old + Vector((dx, 0, dz))
                    l1, l2 = (k - h).length, (old - k).length
                    delta = target - h
                    distance = min(delta.length, (l1 + l2) * .999)
                    alpha = math.acos(max(-1, min(1, (l1 * l1 + distance * distance - l2 * l2) / (2 * l1 * distance))))
                    theta = math.atan2(delta.x, -delta.z)
                    # Hind stifle bends forward, front elbow backward.
                    upper_angle = theta + (alpha if hind else -alpha)
                    new_knee = h + Vector((math.sin(upper_angle) * l1, 0, -math.cos(upper_angle) * l1))
                    lower_angle = math.atan2(target.x - new_knee.x, new_knee.z - target.z)
                    rest_upper = math.atan2(k.x - h.x, h.z - k.z)
                    rest_lower = math.atan2(old.x - k.x, k.z - old.z)
                    du, dl = upper_angle - rest_upper, lower_angle - rest_lower
                    rotate_world(obj, name + '.upper', -du)
                    rotate_world(obj, name + '.lower', -(dl - du))
                    rotate_world(obj, name + '.foot', dl)
                rotate_world(obj, 'head', .025 * math.sin(t * 2))
                rotate_world(obj, 'tail', .08 * math.sin(t), (0, 0, 1))
        action = obj.animation_data.action
        action.name = clip
        track = obj.animation_data.nla_tracks.new()
        track.name = clip
        track.strips.new(clip, 1, action)
        track.mute = True
        obj.animation_data.action = None
    for bone in obj.pose.bones:
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.scale = (1, 1, 1)
    scene.frame_set(1)
    return obj


def build(species, output):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    a = Animal(species)
    a.bone('root', (0, 0, 0), (0, 0, .2))
    a.bone('spine', (-.3, 0, .5), (.35, 0, .5), 'root')
    assert species == 'moose'
    ungulate(a, True)
    data = bpy.data.meshes.new(species + ' anatomy')
    data.from_pydata(a.verts, [], a.faces)
    data.update()
    mesh = bpy.data.objects.new(species, data)
    bpy.context.collection.objects.link(mesh)
    # Smooth curved anatomy; the low polygon silhouette remains visible.
    for face in data.polygons:
        face.use_smooth = True
    attr = data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for i, colour in enumerate(a.colours):
        attr.data[i].color = colour
    data.materials.append(material())
    finish_coat(mesh)
    obj = animate(a, rig(a, mesh))
    data.calc_loop_triangles()
    triangles = len(data.loop_triangles)
    assert triangles <= 5000, (species, triangles)
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True,
                              export_yup=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                              export_nla_strips=True, export_skins=True, export_all_vertex_colors=True,
                              export_force_sampling=True, export_anim_slide_to_zero=True,
                              export_extras=True, export_cameras=False, export_lights=False)
    print(json.dumps({'species': species, 'triangles': triangles, 'bones': len(a.bones),
                      'clips': ['Idle', 'Walk'], 'textures': 1, 'textureEdge': 1024, 'output': str(output)}))


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def review(species, root):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(root / 'public/assets/wildlife' / (species + '.glb')))
    scene = bpy.context.scene
    for obj in scene.objects:
        if obj.animation_data:
            obj.animation_data.action = None
            for track in obj.animation_data.nla_tracks:
                track.mute = True
    scene.frame_set(1)
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene.render.resolution_x, scene.render.resolution_y = 840, 380
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.world.color = (.23, .26, .23)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.008))
    ground = bpy.context.object
    mat = bpy.data.materials.new('Muted forest floor')
    mat.diffuse_color = (.10, .12, .095, 1)
    ground.data.materials.append(mat)
    for location, power, size, colour in [((1, -5, 8), 1400, 7, (.93, .96, 1)),
                                          ((-4, 3, 5), 950, 6, (.83, .90, 1))]:
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size, light.data.color = power, 'DISK', size, colour
        aim(light, (0, 0, .8))
    centre_z = {'white-tailed-deer': 1.08, 'moose': 1.35, 'black-bear': .64, 'beaver': .32, 'eastern-wolf': .73}[species]
    # A roadside camera at 14 m. Fixed lens shows genuine relative species sizes.
    for view, location in [('side', (0, -14, centre_z + 2.2)),
                            ('three-quarter', (7, -12.12, centre_z + 2.2))]:
        bpy.ops.object.camera_add(location=location)
        camera = bpy.context.object
        camera.data.type = 'PERSP'
        camera.data.lens = 55
        aim(camera, (0, 0, centre_z))
        scene.camera = camera
        output = root / '.qa-dist/wildlife-round-1' / (species + '-' + view + '.png')
        output.parent.mkdir(parents=True, exist_ok=True)
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        if view == 'side':
            side_camera = camera
    # Inspect both actual exported animation clips at six gait/idle phases.
    rigs = [obj for obj in scene.objects if obj.type == 'ARMATURE']
    assert len(rigs) == 1
    rig_obj = rigs[0]
    mesh = next(obj for obj in scene.objects if obj.type == 'MESH' and obj != ground)
    metrics = []
    for action in bpy.data.actions:
        if action.name not in ('Idle', 'Walk'):
            continue
        rig_obj.animation_data.action = action
        # Blender 4.5 action slots are selected explicitly after import.
        if action.slots:
            rig_obj.animation_data.action_slot = action.slots[0]
        bounds = []
        for factor in (0, .2, .4, .6, .8, 1):
            lo, hi = action.frame_range
            scene.frame_set(int(lo + (hi - lo) * factor))
            depsgraph = bpy.context.evaluated_depsgraph_get()
            evaluated = mesh.evaluated_get(depsgraph)
            verts = [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]
            assert all(math.isfinite(value) for p in verts for value in p)
            bounds.append({'frame': scene.frame_current,
                           'min': [min(p[i] for p in verts) for i in range(3)],
                           'max': [max(p[i] for p in verts) for i in range(3)]})
        metrics.append({'clip': action.name, 'bounds': bounds})
        scene.camera = side_camera
        scene.render.resolution_percentage = 50
        scene.cycles.samples = 8
        for factor in (.25, .75):
            scene.frame_set(int(lo + (hi - lo) * factor))
            scene.render.filepath = str(root / '.qa-dist/wildlife-round-1' /
                (species + '-' + action.name.lower() + '-' + str(int(factor * 100)) + '.png'))
            bpy.ops.render.render(write_still=True)
    manifest = root / '.qa-dist/wildlife-round-1' / (species + '-inspection.json')
    manifest.write_text(json.dumps(metrics, indent=2) + '\n', encoding='utf-8')
