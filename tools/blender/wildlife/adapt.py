"""Adapt licensed North woods donors, retaining donor rigs and clips when present."""
import math
import hashlib
import json
from pathlib import Path


def build(species, output, c, cache):
    bpy, Vector = c.bpy, c.Vector
    source = json.loads((Path(__file__).parent / 'sources.json').read_text())[species]
    donor = cache / source['file']
    assert hashlib.sha256(donor.read_bytes()).hexdigest() == source['sha256'], 'licensed original changed'
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(donor))
    mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and len(o.data.materials))
    rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    for obj in bpy.context.scene.objects:
        if obj.animation_data:
            obj.animation_data.action = None
            for track in obj.animation_data.nla_tracks:
                track.mute = True
    bpy.context.scene.frame_set(1)
    if species == 'moose':
        import moose_donor
        moose_donor.build(mesh, rigs[0], output, c)
    elif rigs:
        animated_donor(species, mesh, rigs[0], output, c)
    else:
        static_donor(species, mesh, output, c)


def animated_donor(species, mesh, rig, output, c):
    bpy, Vector = c.bpy, c.Vector
    deer = species == 'white-tailed-deer'
    scale = .48 if deer else .38
    refine(mesh, c, 4100)
    # The donor's forward is Blender -Y. A parent changes units and orientation
    # without rewriting the authored bones, inverse binds or animation curves.
    attr = mesh.data.color_attributes.get('Coat') or mesh.data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    inv = mesh.matrix_world.inverted()
    groups = {g.index: g.name for g in mesh.vertex_groups}
    eye_vertices = {i for face in mesh.data.polygons
                    if 'eye' in mesh.data.materials[face.material_index].name.lower() for i in face.vertices}
    eye_centres = {}
    for side in (-1, 1):
        points = [mesh.matrix_world @ mesh.data.vertices[i].co for i in eye_vertices
                  if (mesh.matrix_world @ mesh.data.vertices[i].co).x * side > 0]
        if points:
            eye_centres[side] = sum(points, Vector()) / len(points)
    for v in mesh.data.vertices:
        p = mesh.matrix_world @ v.co
        weights = [(groups[g.group], g.weight) for g in v.groups]
        name = max(weights, key=lambda g: g[1])[0]
        material = next((f.material_index for f in mesh.data.polygons if v.index in f.vertices), 0)
        matname = mesh.data.materials[material].name.lower()
        # Narrow the donor's large ears around their attachment, and taper the
        # lower legs around their centre line without changing joint pivots.
        if name.startswith('Ear'):
            b = rig.data.bones['Ear1.L' if name.endswith('.L') else 'Ear1.R']
            centre = rig.matrix_world @ b.head_local
            p = centre + (p - centre) * (.72 if deer else .84)
            v.co = inv @ p
        elif 'LowerLeg' in name:
            centre = rig.matrix_world @ rig.data.bones[name].head_local
            p.x = centre.x + (p.x - centre.x) * (.83 if deer else .90)
            v.co = inv @ p
        if deer and name.startswith('Tail'):
            attachment = rig.matrix_world @ rig.data.bones['Tail1'].head_local
            p.z += max(0, p.y - attachment.y) * .38
            v.co = inv @ p
        if not deer and (name.startswith('Neck') or name.startswith('Torso')):
            # A wolf's chest and ruff are heavier than a fox's. The original
            # joint pivots and animation curves remain in their authored frame.
            p.x *= 1.23 if name.startswith('Neck') else 1.12
            v.co = inv @ p
        if deer:
            base = (.078, .061, .044)
            if name.startswith('Tail'):
                base = (.72, .69, .61) if p.z < attachment.z + .05 else (.070, .052, .034)
            elif name.startswith('Neck') and -2.03 < p.y < -1.77 and 2.90 < p.z < 3.30 and abs(p.x) < .24:
                base = (.62, .59, .51)
            elif name in ('Body', 'Back') or name.startswith('Torso'):
                if p.z < 1.80:
                    base = (.56, .53, .46)
            elif 'Leg' in name and abs(p.x) < .23:
                base = (.47, .44, .37)
            elif 'hoof' in matname:
                base = (.035, .028, .021)
        else:
            saddle = max(0, min(1, (p.z - 1.30) * 1.8)) if 'Torso' in name or name in ('Body', 'Back') else .15
            base = tuple(v * (1 - .66 * saddle) for v in (.115, .098, .075))
            if 'Leg' in name or name.startswith('Ear'):
                base = (.17, .115, .061)
            if (name.startswith('Neck') and p.z < 1.75) or (name in ('Body', 'Back') or name.startswith('Torso')) and p.z < 1.13:
                base = (.38, .35, .28)
            if name.startswith('Tail'):
                base = (.085, .075, .056)
        if 'eye' in matname:
            base = (.010, .008, .005)
            centre = eye_centres.get(1 if p.x > 0 else -1)
            if centre is not None:
                # Reduce the donor's large eye patch to a natural small eye.
                v.co = inv @ (centre + (p - centre) * .48)
        if 'nose' in matname:
            base = (.018, .013, .009)
        grain = .09 * math.sin(p.z * 145 + p.x * 63) + .045 * math.sin(p.y * 87 - p.z * 33)
        dirt = .75 if p.z < .25 else 1
        attr.data[v.index].color = tuple(max(.002, x * (1 + grain) * dirt) for x in base) + (1,)
    for face in mesh.data.polygons:
        face.material_index = 0
        face.use_smooth = True
    mesh.data.materials.clear()
    mesh.data.materials.append(c.material())
    if deer:
        antlers(mesh, rig, c)
    root = bpy.data.objects.new(species + ' metre frame', None)
    bpy.context.collection.objects.link(root)
    tops = [o for o in bpy.context.scene.objects if o.parent is None and o != root and o.type != 'MESH']
    for obj in tops:
        obj.parent = root
    root.rotation_euler.z = math.pi / 2
    root.scale = (scale, scale, scale * (1 if deer else 1.18))
    root.location.z = .01310753 * scale if deer else .01020265 * scale * 1.18
    bpy.context.view_layer.update()
    export(mesh, rig, output, c, root)


def refine(mesh, c, budget):
    # Round the donor's deliberately faceted body while staying within budget.
    # Blender interpolates the existing vertex groups onto the refined mesh.
    bpy = c.bpy
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    # glTF splits vertices at sharp normals and material boundaries. Weld those
    # duplicates before subdivision, otherwise each face shrinks separately.
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.0000001)
    bpy.ops.object.mode_set(mode='OBJECT')
    subdiv = mesh.modifiers.new('Natural silhouette', 'SUBSURF')
    subdiv.levels = 1
    while mesh.modifiers.find(subdiv.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=subdiv.name)
    bpy.ops.object.modifier_apply(modifier=subdiv.name)
    mesh.data.calc_loop_triangles()
    decimate = mesh.modifiers.new('Wildlife triangle budget', 'DECIMATE')
    decimate.ratio = min(1, budget / len(mesh.data.loop_triangles))
    while mesh.modifiers.find(decimate.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=decimate.name)
    bpy.ops.object.modifier_apply(modifier=decimate.name)


def antlers(mesh, rig, c):
    """Add whitetail main beams and upward tines to the donor's head group."""
    bpy, Vector = c.bpy, c.Vector
    a = c.Animal('white-tailed-deer')
    # Coordinates in the donor's unscaled Blender world frame.
    for side in (-1, 1):
        beam = [(side * .12, -1.80, 4.02), (side * .30, -1.63, 4.30),
                (side * .53, -1.74, 4.51), (side * .62, -2.02, 4.58), (side * .55, -2.32, 4.63)]
        a.tube(beam[:2], [.050, .044], (.105, .073, .038), 'Head', 7)
        a.tube(beam[1:], [.044, .037, .024, .002], (.27, .21, .13), 'Head', 7)
        for base, tip in [(beam[1], (side * .26, -1.53, 4.65)),
                          (beam[2], (side * .56, -1.75, 4.94)),
                          (beam[3], (side * .70, -2.05, 4.96))]:
            a.tube([base, tip], [.030, .002], (.49, .41, .28), 'Head', 6)
    data = bpy.data.meshes.new('Whitetail antlers')
    # Use the donor mesh coordinates and transform so existing head weights fit.
    data.from_pydata([mesh.matrix_world.inverted() @ Vector(p) for p in a.verts], [], a.faces)
    obj = bpy.data.objects.new('Whitetail antlers', data)
    bpy.context.collection.objects.link(obj)
    obj.matrix_world = mesh.matrix_world.copy()
    obj.vertex_groups.new(name='Head').add(list(range(len(data.vertices))), 1, 'REPLACE')
    attr = data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for i, colour in enumerate(a.colours):
        attr.data[i].color = colour
    data.materials.append(mesh.data.materials[0])
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.join()


def static_donor(species, mesh, output, c):
    bpy, Vector = c.bpy, c.Vector
    bear = species == 'black-bear'
    scale = .13 if bear else 1.10 / 111.62809753417969
    # Preserve geometry topology. Bake only the donor-space fit into vertices.
    points = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    floor = min(p.z for p in points) if bear else -18.33993911743164
    for v, p in zip(mesh.data.vertices, points):
        v.co = (-p.y * scale, p.x * scale, (p.z - floor) * scale)
        if not bear:
            x, y, z = v.co
            if x < -.16:
                v.co.y *= 1.65
            elif -.10 < x < .30 and z > .15:
                v.co.z += .025 * max(0, 1 - abs(x - .08) / .22)
    mesh.matrix_world.identity()
    a = c.Animal(species)
    a.bone('root', (0, 0, 0), (0, 0, .1))
    a.bone('spine', (-.25, 0, .6 if bear else .19), (.25, 0, .6 if bear else .19), 'root')
    a.bone('neck', (.48, 0, .95) if bear else (.22, 0, .22), (.75, 0, 1.0) if bear else (.35, 0, .25), 'spine')
    a.bone('head', (.75, 0, 1.0) if bear else (.35, 0, .25), (1.05, 0, .88) if bear else (.50, 0, .20), 'neck')
    a.bone('tail', (-.72, 0, .85) if bear else (-.13, 0, .12), (-.88, 0, .82) if bear else (-.50, 0, .02), 'spine')
    for hind, x in [(True, -.47 if bear else .015), (False, .54 if bear else .30)]:
        for side in (-1, 1):
            y = side * (.29 if bear else .115)
            hip = (x, y, .68 if bear else .19)
            knee = (x + (.12 if hind else -.035), y, .34 if bear else .085)
            ankle = (x, y, .095 if bear else .035)
            toe = (x + .05, y, .03)
            # The shared animation needs only bones and these measured pivots.
            name = ('rear' if hind else 'front') + ('.L' if side > 0 else '.R')
            a.bone(name + '.upper', hip, knee, 'spine')
            a.bone(name + '.lower', knee, ankle, name + '.upper')
            a.bone(name + '.foot', ankle, toe, name + '.lower')
            a.legs.append((name, hip, knee, ankle, toe, hind))
    old_material = mesh.data.materials[0]
    image = next(n.image for n in old_material.node_tree.nodes if n.type == 'TEX_IMAGE')
    pixels = list(image.pixels)
    width, height = image.size
    uv = mesh.data.uv_layers.active
    vertex_uv = {}
    for loop in mesh.data.loops:
        vertex_uv[loop.vertex_index] = uv.data[loop.index].uv.copy()
    attr = mesh.data.color_attributes.new(name='Coat', type='FLOAT_COLOR', domain='POINT')
    for v in mesh.data.vertices:
        x, y, z = v.co
        u, vv = vertex_uv[v.index]
        pixel = (min(height - 1, int(vv * height) % height) * width + min(width - 1, int(u * width) % width)) * 4
        # Darken the donor palette into the natural coat range before baking.
        base = tuple(q / 12.92 if q <= .04045 else ((q + .055) / 1.055) ** 2.4
                     for q in pixels[pixel:pixel + 3])
        donor_dark = max(base) < .015
        if not bear:
            base = (.052, .023, .010) if z > .10 else (.027, .016, .009)
            if x < -.16:
                # Crossed grooves on the paddle read as scales in the bake.
                ridge = abs(math.sin((x + y) * 210) * math.sin((x - y) * 210))
                base = tuple(q * (.65 + .55 * ridge) for q in (.014, .016, .015))
            if x > .43:
                base = (.022, .015, .009)
            if donor_dark and x > .34 and z > .20:
                base = (.006, .005, .003)
        # Retain the donor's anatomical palette masks, replace flat swatches
        # with restrained natural coat variation and mud on the lower limbs.
        grain = .12 * math.sin(x * 193 + y * 61 + z * 43) + .05 * math.sin(z * 251 - x * 47)
        base = tuple(max(.004, q * (.55 if bear else .80) * (1 + grain)) for q in base)
        attr.data[v.index].color = base + (1,)
        if not bear and x < -.16:
            weights = {'tail': 1}
        elif x > (.66 if bear else .34) and z > (.68 if bear else .17):
            weights = {'head': 1}
        elif z < (.52 if bear else .125):
            name = ('front' if x > (.08 if bear else .17) else 'rear') + ('.L' if y > 0 else '.R')
            upper = .48 if bear else .11
            lower = .18 if bear else .05
            if z < lower:
                weights = {name + '.foot': 1}
            else:
                t = max(0, min(1, (z - lower) / (upper - lower)))
                weights = {name + '.upper': t, name + '.lower': 1 - t}
        else:
            weights = {'spine': 1}
        a.weights.append(weights)
    mesh.data.materials.clear()
    mesh.data.materials.append(c.material())
    for face in mesh.data.polygons:
        face.use_smooth = True
    rig = c.animate(a, c.rig(a, mesh))
    refine(mesh, c, 3000 if bear else 2600)
    export(mesh, rig, output, c)


def export(mesh, rig, output, c, root=None):
    bpy = c.bpy
    c.finish_coat(mesh, rough_fur=output.stem == 'black-bear')
    if output.stem == 'black-bear':
        shader = mesh.data.materials[0].node_tree.nodes.get('Principled BSDF')
        shader.inputs['Roughness'].default_value = 1
        shader.inputs['Specular IOR Level'].default_value = .18
    mesh.data.calc_loop_triangles()
    triangles = len(mesh.data.loop_triangles)
    assert triangles <= 5000, triangles
    bpy.ops.object.select_all(action='DESELECT')
    # Include ancestors, but exclude the importer's bone-display Icospheres.
    for obj in (mesh, rig):
        while obj:
            obj.select_set(True)
            obj = obj.parent
    bpy.context.view_layer.objects.active = rig
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True,
        export_yup=True, export_animations=True, export_animation_mode='NLA_TRACKS',
        export_nla_strips=True, export_skins=True, export_all_vertex_colors=True,
        export_force_sampling=True, export_anim_slide_to_zero=True,
        export_extras=True, export_cameras=False, export_lights=False)
    print('WILDLIFE', output.name, triangles, 'triangles')
