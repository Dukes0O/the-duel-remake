"""Build editable, original game assets in Blender without external add-ons.

Run: blender --background --python tools/blender/build_assets.py -- --output public/assets/models
Optional: --render produces a studio preview PNG. Blender 4.x or newer.
The runtime coordinate system is metres, +Z forward and +Y up. to_blender
converts it to Blender's Z-up convention so exported glTF retains +Z forward.
"""

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector, Euler


def to_blender(point):
    x, y, z = point
    return x, -z, y


def material(name, color, metal=0.0, roughness=0.5, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs and metal > 0.2:
        shader.inputs["Coat Weight"].default_value = 0.65
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    mat.diffuse_color = (*color, 1)
    return mat


def mesh(name, vertices, faces, mat, collection, bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata([to_blender(v) for v in vertices], [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    if bevel:
        modifier = obj.modifiers.new("Small manufactured edge radii", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def box(name, size, pos, mat, collection, rotation=(0, 0, 0), bevel=0.01):
    sx, sy, sz = [n / 2 for n in size]
    rotation_matrix = Euler(rotation, "XYZ").to_matrix()
    vertices = [tuple(rotation_matrix @ Vector((x, y, z)) + Vector(pos))
                for x, y, z in [(-sx, -sy, -sz), (sx, -sy, -sz),
                                 (sx, sy, -sz), (-sx, sy, -sz),
                                 (-sx, -sy, sz), (sx, -sy, sz),
                                 (sx, sy, sz), (-sx, sy, sz)]]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (2, 3, 7, 6), (0, 4, 7, 3), (1, 2, 6, 5)]
    return mesh(name, vertices, faces, mat, collection, bevel)


def cylinder(name, radius, length, pos, mat, collection, axis="x", segments=32):
    vertices = []
    for end in [-length / 2, length / 2]:
        for i in range(segments):
            angle = i * 2 * math.pi / segments
            a, b = math.cos(angle) * radius, math.sin(angle) * radius
            coord = (end, a, b) if axis == "x" else (a, b, end)
            vertices.append(tuple(Vector(pos) + Vector(coord)))
    faces = [tuple(reversed(range(segments))), tuple(range(segments, 2 * segments))]
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((i, j, j + segments, i + segments))
    return mesh(name, vertices, faces, mat, collection, 0.004)


def loft(name, sections, mat, collection):
    vertices, faces = [], []
    for z, width, base, shoulder, crown, roof_width in sections:
        vertices += [(x, y, z) for x, y in [
            (-width * 0.86, base), (-width, base + 0.13), (-width, shoulder),
            (-roof_width, crown), (roof_width, crown), (width, shoulder),
            (width, base + 0.13), (width * 0.86, base)]]
    for section in range(len(sections) - 1):
        for i in range(8):
            a, b = section * 8 + i, section * 8 + (i + 1) % 8
            faces.append((a, a + 8, b + 8, b))
    faces.append(tuple(range(8)))
    last = (len(sections) - 1) * 8
    faces.append(tuple(reversed(range(last, last + 8))))
    return mesh(name, vertices, faces, mat, collection, 0.012)


def build_car(mats):
    collection = bpy.data.collections.new("Cinder GT — original coupe")
    bpy.context.scene.collection.children.link(collection)
    red, dark, glass, alloy, tire = [mats[k] for k in ["red", "dark", "glass", "alloy", "tire"]]
    loft("Sculpted body shell", [
        (-2.33, .95, .35, .88, .97, .86), (-2.06, 1.08, .29, .99, 1.03, .87),
        (-1.37, 1.10, .28, .98, 1.07, .85), (-.35, 1.02, .26, .9, .98, .77),
        (.8, 1.0, .27, .83, .93, .75), (1.38, 1.07, .28, .84, .88, .87),
        (1.96, .99, .35, .63, .72, .84), (2.36, .9, .42, .55, .61, .79)], red, collection)
    loft("Tinted wraparound cabin", [
        (-1.25, .86, .93, .99, 1.03, .79), (-.58, .81, .95, 1.23, 1.49, .64),
        (.21, .8, .93, 1.2, 1.44, .65), (1.09, .81, .89, .92, .94, .76)], glass, collection)
    box("Painted roof", (1.32, .035, .75), (0, 1.474, -.195), red, collection, (.055, 0, 0))
    box("Underbody", (1.85, .12, 4.24), (0, .3, 0), dark, collection)
    box("Front splitter", (1.92, .075, .26), (0, .375, 2.25), dark, collection)
    box("Rear tail panel", (1.83, .285, .037), (0, .785, -2.335), dark, collection)
    for side in [-1, 1]:
        for axle in [-1, 1]:
            pos = (side * 1.04, .44, axle * 1.39)
            cylinder(f"Wheel_{side}_{axle}_tire", .43, .34, pos, tire, collection)
            face = side * 1.222
            cylinder(f"Wheel_{side}_{axle}_rim", .31, .024, (face, .44, axle * 1.39), dark, collection)
            cylinder(f"Wheel_{side}_{axle}_hub", .085, .045, (face + side * .02, .44, axle * 1.39), alloy, collection)
            for spoke in range(5):
                angle = spoke * math.tau / 5
                box(f"Alloy spoke_{side}_{axle}_{spoke}", (.044, .275, .055),
                    (face + side * .025, .44 + math.cos(angle) * .155, axle * 1.39 + math.sin(angle) * .155),
                    alloy, collection, (angle, 0, 0), .006)
        box(f"Rocker skirt_{side}", (.095, .16, 2), (side * 1.015, .37, -.02), red, collection)
        box(f"Front pillar_{side}", (.07, .05, 1.02), (side * .728, 1.19, .645), red, collection, (.535, side * .105, 0))
        box(f"Rear pillar_{side}", (.11, .065, .9), (side * .735, 1.2, -.925), red, collection, (-.59, -side * .1, 0))
        box(f"Mirror arm_{side}", (.18, .06, .08), (side * .94, 1.03, .57), dark, collection)
        box(f"Mirror housing_{side}", (.19, .135, .27), (side * 1.075, 1.07, .56), red, collection)
        box(f"Side intake_{side}", (.025, .29, .51), (side * 1.072, .68, -.86), dark, collection)
        for slat in range(4):
            box(f"Intake slat_{side}_{slat}", (.036, .021, .47), (side * 1.09, .565 + slat * .07, -.86), alloy, collection)
        box(f"Lamp recess_{side}", (.58, .16, .065), (side * .568, .521, 2.339), dark, collection)
        box(f"Headlight_{side}", (.415, .079, .016), (side * .559, .531, 2.38), mats["headlight"], collection)
        cylinder(f"Exhaust_{side}", .079, .25, (side * .65, .39, -2.29), alloy, collection, "z")
        cylinder(f"Exhaust bore_{side}", .058, .02, (side * .65, .39, -2.43), dark, collection, "z")
        box(f"Wing strut_{side}", (.065, .16, .25), (side * .76, 1.094, -2.026), dark, collection, (-.22, 0, 0))
    for i, x in enumerate([-.76, -.49, .49, .76]):
        cylinder(f"Tail light surround_{i}", .123, .029, (x, .785, -2.36), alloy, collection, "z")
        cylinder(f"BrakeLight_{i}", .09, .03, (x, .785, -2.39), mats["taillight"], collection, "z")
    for i in range(8):
        box(f"Engine louver_{i}", (1.43 - i * .021, .028, .07), (0, 1.065 + i * .049, -1.26 + i * .085), dark, collection, (-.24, 0, 0))
    box("Rear aero wing", (2.08, .075, .27), (0, 1.19, -2.058), red, collection, (-.07, 0, 0))
    return collection


def build_station(mats):
    collection = bpy.data.collections.new("Mojave service station — modular building")
    bpy.context.scene.collection.children.link(collection)
    stucco, rust, dark = [mats[k] for k in ["stucco", "rust", "dark"]]
    box("Concrete apron", (17, .18, 13), (0, -.09, 0), mats["concrete"], collection, bevel=.035)
    box("Station main shell", (11, 3.4, 5), (0, 1.7, -3), stucco, collection, bevel=.06)
    box("Flat roof parapet", (11.35, .34, 5.35), (0, 3.4, -3), rust, collection)
    box("Roof cap", (11.45, .09, 5.45), (0, 3.62, -3), mats["concrete"], collection)
    box("Glazed storefront", (6.8, 2.46, .075), (-.8, 1.42, -.46), mats["glass"], collection)
    for x in [-4.2, -2.7, -1.2, .3, 1.8, 2.6]:
        box(f"Storefront mullion_{x}", (.066, 2.5, .11), (x, 1.42, -.407), dark, collection)
    box("Window transom", (6.9, .075, .12), (-.8, 2.45, -.4), dark, collection)
    box("Service door", (1.28, 2.38, .09), (4.1, 1.27, -.43), dark, collection)
    box("Red facade stripe", (11.05, .26, .1), (0, 2.96, -.43), rust, collection)
    box("Pump canopy", (12.5, .29, 5.6), (0, 3.43, 2.6), rust, collection, bevel=.035)
    box("Canopy soffit", (12.28, .075, 5.4), (0, 3.255, 2.6), stucco, collection)
    for side in [-1, 1]:
        box(f"Canopy post_{side}", (.21, 3.27, .21), (side * 5.3, 1.63, 4.9), rust, collection)
        box(f"Pump island_{side}", (2.15, .16, 1.45), (side * 3.15, .08, 2.45), mats["concrete"], collection, bevel=.075)
        box(f"Pump pedestal_{side}", (.72, 1.0, .57), (side * 3.15, .68, 2.45), rust, collection, bevel=.05)
        box(f"Pump upper shell_{side}", (.89, .95, .65), (side * 3.15, 1.58, 2.45), stucco, collection, bevel=.095)
        box(f"Pump display_{side}", (.58, .28, .02), (side * 3.15, 1.72, 2.789), dark, collection)
        box(f"Pump display digits_{side}", (.43, .11, .026), (side * 3.15, 1.72, 2.81), mats["headlight"], collection)
        box(f"Fuel nozzle_{side}", (.055, .39, .11), (side * 3.15 + .48, 1.39, 2.53), dark, collection)
        for light in [-1, 1]:
            box(f"Canopy fixture_{side}_{light}", (.2, .03, .95), (side * 3.3, 3.2, 2.5 + light * 1.3), mats["headlight"], collection)
    return collection


def export_collection(collection, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = collection.objects[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False,
                              export_lights=False, export_extras=True)


def studio_render(path, building):
    for obj in building.objects:
        obj.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.012))
    ground = bpy.context.object
    ground.name = "Studio floor — not exported"
    ground.data.materials.append(material("Studio floor", (.10, .115, .135), roughness=.42))
    for pos, energy, size in [((3, -3, 6), 1800, 6), ((-4, 0, 3), 1500, 5), ((0, 4, 5), 2000, 4)]:
        bpy.ops.object.light_add(type="AREA", location=pos)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size = energy, "DISK", size
        light.rotation_euler = (Vector((0, 0, .8)) - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=(5.4, 7.2, 3.2))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, .74)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 55
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1600, 1000, 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.world.color = (.18, .18, .18)
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="public/assets/models")
    parser.add_argument("--render", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    mats = {
        "red": material("Vermilion enamel", (.75, .026, .018), .46, .26),
        "dark": material("Graphite trim", (.013, .019, .028), .25, .46),
        "glass": material("Petroleum blue tinted glass", (.025, .05, .067), .55, .12),
        "alloy": material("Brushed alloy", (.51, .54, .58), .9, .24),
        "tire": material("Tire rubber", (.014, .018, .024), 0, .86),
        "taillight": material("Brake lens", (.8, .012, .007), .1, .24, 1.5),
        "headlight": material("Warm headlight", (1, .82, .51), .05, .2, 2.5),
        "stucco": material("Warm cream stucco", (.61, .52, .39), 0, .9),
        "rust": material("Oxidized red paint", (.36, .075, .035), .25, .72),
        "concrete": material("Desert concrete", (.31, .29, .26), 0, .94),
    }
    car = build_car(mats)
    building = build_station(mats)
    export_collection(car, output / "cinder-gt.glb")
    export_collection(building, output / "desert-service-station.glb")
    # Separate the two editable collections in the authoring file after export.
    for obj in building.objects:
        obj.location.x += 15
    bpy.ops.wm.save_as_mainfile(filepath=str(output / "redline-assets.blend"))
    if args.render:
        studio_render(output / "cinder-gt-preview.png", building)
    print(f"ASSET_BUILD_OK {output}")


if __name__ == "__main__":
    main()
