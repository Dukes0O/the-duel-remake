"""Original R34 shell, in metres. No external meshes or image textures.

blender -b -t 2 --python tools/blender/cars/nissan-skyline-gtr-r34.py -- --root .
The single connected cage includes roof, pillars, bonnet and rounded flares.
Glass is a face region of that cage. Subdivide, then decimate before export.
"""
import argparse
import math
import sys
from pathlib import Path
import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat


paint = material('skyline_paint', (.011, .047, .262), .35, .32)
glass = material('skyline_glass', (.012, .023, .031), .15, .22)

# +Z in the game is -Y in Blender. Each ring runs from the underfloor up
# the right side, across the roof and back underneath the left side.
vertices, faces, materials = [], [], []
steps = 114
ring_size = 32


def profile(z):
    rear = max(0, min(1, (z + 1.48) / .80))
    front = max(0, min(1, (1.12 - z) / .61))
    cabin = min(rear, front)
    # Small crown, broad flat bonnet and a squared but rounded end plan.
    end = max(0, (abs(z) - 2.04) / .24)
    flare = max(math.exp(-((z - axle) / .46) ** 2) for axle in [1.32, -1.345])
    width = .903 + .060 * flare - .052 * end ** 2
    arch_dz = min(abs(z - axle) for axle in [1.32, -1.345])
    arch = .37 + math.sqrt(max(0, .403 ** 2 - arch_dz ** 2)) if arch_dz < .403 else .22
    low = max(.22, arch)
    belt = .842 + .018 * flare - .026 * end
    top = .879 + .366 * cabin
    bonnet_bulge = .022 * max(0, min(1, (z-.9)/.25, (2.25-z)/.23))
    roof_width = .77 - .125 * cabin
    # Side flank remains proud at the arches, recessed over the doors.
    half = [(.76, .205), (.88, max(.23, low)), (width-.008, low+.012),
            (width, max(low+.025, .38)), (width-.006, max(low+.035, .56)),
            (width-.012, max(low+.045, .70)), (width-.027, max(low+.05, .78)),
            (.83, belt), (.786, belt+.018),
            (roof_width+.032, top-.025), (roof_width, top-.008),
            (roof_width-.035, top+.004), (.49, top+.009),
            (.32, top+.014+bonnet_bulge), (.14, top+.017+bonnet_bulge),
            (0, top+.018+bonnet_bulge)]
    return half + [(-x, y) for x, y in half[::-1]]


for i in range(steps + 1):
    z = -2.28 + 4.56 * i / steps
    for x, y in profile(z):
        vertices.append((x, -z, y))
for i in range(steps):
    z = -2.28 + 4.56 * (i + .5) / steps
    for j in range(ring_size):
        faces.append((i*ring_size+j, i*ring_size+(j+1)%ring_size,
                      (i+1)*ring_size+(j+1)%ring_size, (i+1)*ring_size+j))
        # Side glazing ends before broad C pillars. A pillars and roof rails
        # are paint. A black B pillar is added by the detail builder.
        side_window = j in [8, 22] and -.97 < z < .94
        screen = j in range(10, 21) and (.61 < z < 1.04 or -1.39 < z < -.79)
        materials.append(1 if side_window or screen else 0)
faces.append(tuple(range(ring_size-1, -1, -1)))
faces.append(tuple(steps*ring_size+j for j in range(ring_size)))
materials.extend([0, 0])
mesh = bpy.data.meshes.new('Continuous stamped shell cage')
mesh.from_pydata(vertices, [], faces)
mesh.materials.append(paint)
mesh.materials.append(glass)
mesh.update()
body = bpy.data.objects.new('R34 continuous body roof and pillars', mesh)
bpy.context.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)
for poly, slot in zip(mesh.polygons, materials):
    poly.material_index = slot
    poly.use_smooth = True
# Recalculate outward normals on the closed cage.
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=.00001)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
sub = body.modifiers.new('Rounded stamped surfaces', 'SUBSURF')
sub.levels = 2
bpy.ops.object.modifier_apply(modifier=sub.name)
# Collapse mode does not honour material delimiters. Zero-weight border
# vertices protect the window outlines while the interiors lose triangles.
vertex_materials = [set() for _ in body.data.vertices]
for face in body.data.polygons:
    for index in face.vertices:
        vertex_materials[index].add(face.material_index)
boundary = [i for i, slots in enumerate(vertex_materials) if len(slots) > 1]
group = body.vertex_groups.new(name='Collapse interior only')
group.add(list(range(len(body.data.vertices))), 1.0, 'REPLACE')
group.add(boundary, 0.0, 'REPLACE')
decimate = body.modifiers.new('Runtime budget', 'DECIMATE')
decimate.ratio = .055
decimate.vertex_group = group.name
decimate.vertex_group_factor = 1.0
decimate.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=decimate.name)

# True recesses in the front bumper and upper grille, not black stickers on
# a solid cap. Rounded cutters leave painted bridges and wraparound corners.
def recess(name, location, scale, radius):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0], -location[2], location[1]))
    cutter = bpy.context.object
    cutter.name = name
    cutter.dimensions = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = cutter.modifiers.new('Rounded opening', 'BEVEL')
    bevel.width = radius
    bevel.segments = 3
    bpy.context.view_layer.objects.active = cutter
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    bpy.context.view_layer.objects.active = body
    boolean = body.modifiers.new(name, 'BOOLEAN')
    boolean.operation = 'DIFFERENCE'
    boolean.object = cutter
    bpy.ops.object.modifier_apply(modifier=boolean.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


recess('Large bumper intake', (0, .40, 2.28), (1.01, .26, .32), .033)
recess('Upper grille', (0, .746, 2.28), (.67, .135, .24), .018)
for side in [-1, 1]:
    recess('Corner duct', (side*.699, .36, 2.27), (.28, .125, .30), .018)
    recess('Swept headlight pocket', (side*.607, .766, 2.27), (.51, .142, .21), .035)
recess('Recessed tail lamp panel', (0, .715, -2.31), (1.65, .29, .16), .045)

bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
target = root / 'public/assets/models/unlocks/nissan_skyline_gtr_r34.glb'
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True)
print('Exported continuous shell:', target, 'polygons:', len(body.data.polygons))
