"""Build the three original accessories permitted by HELI-ART-SRC.

Source only until the Director grants an export slot. Future invocation:
blender -b --factory-startup -t 4 --disable-autoexec --python-exit-code 1 \
  --python tools/blender/heli-accessories.py -- --root <integration lane>

No donor, download, helicopter, renderer, cable line, .blend or render output.
Game coordinates are metres, +Y up and +Z front. Convert once for glTF.
"""
import argparse
import json
import math
import sys
from pathlib import Path


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--paths-only", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:]
                             if "--" in sys.argv else sys.argv[1:])
    args.root = args.root.resolve()
    return args


def game_point(point):
    return Vector((point[0], -point[2], point[1]))


def root_node(name):
    node = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(node)
    node["source"] = "Original HELI-ART-SRC Blender recipe"
    node["units"] = "metres"
    return node


def material(name, values):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = values["color"]
    shader.inputs["Metallic"].default_value = values["metallic"]
    shader.inputs["Roughness"].default_value = values["roughness"]
    return result


def finish(obj, name, parent, surface, bevel=0, smooth=False):
    obj.name = name
    obj.parent = parent
    obj.data.materials.append(surface)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Small finished edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons:
        face.use_smooth = smooth
    return obj


def box(name, parent, surface, center, size, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=game_point(center))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    return finish(obj, name, parent, surface, bevel=bevel)


def mesh(name, parent, surface, points, faces, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata([game_point(point) for point in points], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, parent, surface, smooth=smooth)


def tube(name, parent, surface, points, radius, sides=10, closed=False):
    """A real capped metal/rubber tube, without an external mesh or texture."""
    centers = [Vector(point) for point in points]
    vertices, faces = [], []
    previous = None
    count = len(centers)
    for index, center in enumerate(centers):
        before = centers[(index - 1) % count] if closed or index else center
        after = centers[(index + 1) % count] if closed or index < count - 1 else center
        tangent = (after - before).normalized()
        reference = previous if previous is not None else Vector((0, 0, 1))
        normal = reference - tangent * reference.dot(tangent)
        if normal.length < 1e-8 or abs(normal.normalized().dot(tangent)) > .99:
            reference = Vector((0, 1, 0)) if abs(tangent.z) > .9 else Vector((0, 0, 1))
            normal = reference - tangent * reference.dot(tangent)
        normal.normalize()
        side = tangent.cross(normal).normalized()
        previous = normal
        for ring in range(sides):
            angle = math.tau * ring / sides
            vertices.append(center + radius * (math.cos(angle) * normal + math.sin(angle) * side))
    for index in range(count if closed else count - 1):
        following = (index + 1) % count
        for ring in range(sides):
            a = index * sides + ring
            b = index * sides + (ring + 1) % sides
            c = following * sides + (ring + 1) % sides
            d = following * sides + ring
            faces.append((a, b, c, d))
    if not closed:
        faces += [tuple(range(sides - 1, -1, -1)),
                  tuple((count - 1) * sides + ring for ring in range(sides))]
    return mesh(name, parent, surface, vertices, faces, smooth=True)


def curved_hose(name, parent, surface, points, radius):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 8
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    curve.use_fill_caps = True
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for control, point in zip(spline.bezier_points, points):
        control.co = game_point(point)
        control.handle_left_type = control.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    curve.materials.append(surface)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def paint_rectangle(name, parent, surface, x0, x1, z0, z1):
    # Winding faces upward. All paint is top y=0, with the slab below it.
    return mesh(name, parent, surface,
                [(x0, 0, z0), (x0, 0, z1), (x1, 0, z1), (x1, 0, z0)], [(0, 1, 2, 3)])


def cargo_hook(settings, surfaces):
    parent = root_node(settings["node"])
    eye = [(math.sin(math.tau * i / 40) * .028,
            -.039 + math.cos(math.tau * i / 40) * .03, 0) for i in range(40)]
    tube("attachment_eye", parent, surfaces["bright-steel"], eye, .009, closed=True)
    tube("swivel", parent, surfaces["steel"],
         [(0, -.06, 0), (0, -.095, 0), (-.018, -.14, 0), (-.03, -.17, 0)], .023, sides=12)
    arc = []
    for i in range(49):
        angle = math.radians(35 + i * 290 / 48)
        arc.append((.09 * math.cos(angle), -.267 + .108 * math.sin(angle), 0))
    tube("forged_hook", parent, surfaces["steel"], arc, .025, sides=12)
    tube("safety_latch", parent, surfaces["safety-orange"],
         [(.076, -.205, 0), (.082, -.26, 0), (.076, -.329, 0)], .007, sides=8)
    # Fit the original complete hook uniformly; attachment top stays exactly zero.
    meshes = [obj for obj in parent.children if obj.type == "MESH"]
    vertices = [vertex.co for obj in meshes for vertex in obj.data.vertices]
    low, high = min(v.z for v in vertices), max(v.z for v in vertices)
    scale = settings["heightM"] / (high - low)
    for obj in meshes:
        for vertex in obj.data.vertices:
            vertex.co.x *= scale
            vertex.co.y *= scale
            vertex.co.z = (vertex.co.z - high) * scale
        obj.data.update()
    return parent


def helipad(settings, surfaces):
    parent = root_node(settings["node"])
    depth, rise = settings["slabThicknessM"], settings["paintRiseM"]
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=settings["diameterM"] / 2,
                                        depth=depth, location=(0, 0, -rise - depth / 2))
    finish(bpy.context.object, "pad_base", parent, surfaces["concrete"], bevel=.018)
    h = settings["h"]
    half_width, half_length, stroke = h["widthM"] / 2, h["lengthM"] / 2, h["strokeM"]
    paint_rectangle("paint_H_left", parent, surfaces["white-paint"],
                    -half_width, -half_width + stroke, -half_length, half_length)
    paint_rectangle("paint_H_right", parent, surfaces["white-paint"],
                    half_width - stroke, half_width, -half_length, half_length)
    paint_rectangle("paint_H_bridge", parent, surfaces["white-paint"],
                    -half_width + stroke, half_width - stroke, -stroke / 2, stroke / 2)
    radius, width = settings["ring"]["radiusM"], settings["ring"]["strokeM"]
    vertices, faces = [], []
    for i in range(96):
        angle = math.tau * i / 96
        for r in [radius - width / 2, radius + width / 2]:
            vertices.append((r * math.cos(angle), 0, r * math.sin(angle)))
    for i in range(96):
        a, b = i * 2, ((i + 1) % 96) * 2
        faces.append((a, b, b + 1, a + 1))
    mesh("paint_ring", parent, surfaces["yellow-paint"], vertices, faces)
    return parent


def label(name, parent, surface, text, center, size):
    data = bpy.data.curves.new(name, "FONT")
    data.body = text
    data.align_x = "CENTER"
    data.size = size
    data.extrude = 0
    data.resolution_u = 3
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = game_point(center)
    obj.rotation_euler = (math.pi / 2, 0, 0)
    obj.parent = parent
    data.materials.append(surface)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    return obj


def fuel_pump(settings, surfaces):
    parent = root_node(settings["node"])
    box("pump_base", parent, surfaces["steel"], (0, .06, 0), settings["baseM"], bevel=.012)
    box("pump_cabinet", parent, surfaces["pump-paint"], (0, .795, 0), settings["cabinetM"], bevel=.025)
    box("meter_head", parent, surfaces["pump-paint"], (0, 1.62, 0), settings["meterM"], bevel=.025)
    box("display_window", parent, surfaces["display"], (0, 1.68, .298), (.61, .24, .012), bevel=.008)
    box("stainless_kick", parent, surfaces["bright-steel"], (0, .37, .255), (.47, .36, .012), bevel=.006)
    label("fuel_label", parent, surfaces["rubber"], "JET A", (0, 1.425, .305), .105)
    label("meter_digits", parent, surfaces["white-paint"], "0000.0", (0, 1.645, .31), .098)
    curved_hose("fuel_hose", parent, surfaces["rubber"],
                [(.31, 1.37, -.02), (.66, 1.35, .04), (.75, .8, .19),
                 (.68, .31, .33), (.48, .28, .35), (.41, .62, .34), (.44, 1.03, .31)],
                settings["hoseRadiusM"])
    box("nozzle_grip", parent, surfaces["rubber"], (.44, 1.08, .32), (.055, .19, .055), bevel=.01)
    curved_hose("nozzle_spout", parent, surfaces["bright-steel"],
                [(.44, 1.18, .32), (.44, 1.24, .37), (.44, 1.27, .47), (.44, 1.25, .57)], .012)
    tube("nozzle_trigger_guard", parent, surfaces["steel"],
         [(.44, 1.15, .35), (.44, 1.11, .41), (.44, 1.02, .39), (.44, 1.00, .35)], .005, sides=8)
    for index, (x, z) in enumerate([(-.36, -.26), (.36, -.26), (-.36, .26), (.36, .26)]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=.018, depth=.01,
                                            location=game_point((x, .12, z)))
        finish(bpy.context.object, "base_bolt_" + str(index + 1), parent, surfaces["bright-steel"])
    return parent


def measured(parent):
    bpy.context.view_layer.update()
    nodes = [parent] + list(parent.children_recursive)
    meshes = [obj for obj in nodes if obj.type == "MESH"]
    vertices = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    # Blender (x,y,z) -> actual exported game (x,z,-y).
    game = [(v.x, v.z, -v.y) for v in vertices]
    low = [min(v[i] for v in game) for i in range(3)]
    high = [max(v[i] for v in game) for i in range(3)]
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    return {"min": low, "max": high, "sizeM": [high[i] - low[i] for i in range(3)],
            "triangles": triangles, "nodes": [obj.name for obj in nodes],
            "textures": len({node.image for obj in meshes for surface in obj.data.materials
                             if surface and surface.use_nodes for node in surface.node_tree.nodes
                             if node.type == "TEX_IMAGE" and node.image})}


def validate(identifier, settings, stats):
    if stats["triangles"] > settings["trianglesMax"] or stats["textures"]:
        raise ValueError("Accessory exceeds its declared mesh/texture budget: " + identifier)
    if identifier == "cargo-hook":
        if abs(stats["max"][1]) > 1e-6 or abs(stats["sizeM"][1] - settings["heightM"]) > 1e-6:
            raise ValueError("Hook must hang 0.4 m below its top attachment origin")
    elif identifier == "helipad":
        if any(abs(stats["sizeM"][axis] - settings["diameterM"]) > 1e-6 for axis in [0, 2]):
            raise ValueError("Actual pad must span 14 m in both horizontal directions")
        if abs(stats["max"][1]) > 1e-6 or stats["sizeM"][1] > settings["thicknessMaxM"]:
            raise ValueError("Pad needs its top at zero and thickness at most 0.15 m")
    elif abs(stats["min"][1]) > 1e-6:
        raise ValueError("Actual pump must sit at its base origin")
    missing = set(settings.get("parts", [])) - set(stats["nodes"])
    if missing:
        raise ValueError("Missing authored accessory parts: " + ", ".join(sorted(missing)))


def main():
    args = arguments()
    config_path = args.root / "tools/art/heli-accessories.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    paths = {"cargo-hook": "public/assets/heli/cargo-hook.glb",
             "helipad": "public/assets/heli/helipad.glb",
             "fuel-pump": "public/assets/heli/fuel-pump.glb"}
    if set(config["assets"]) != set(paths) or any(
            config["assets"][key]["path"] != path for key, path in paths.items()):
        raise ValueError("This recipe exports only the three settled accessory paths")
    outputs = [args.root / path for path in paths.values()]
    if args.paths_only:
        print(json.dumps({"blend": [], "glb": [str(path) for path in outputs],
                          "inputs": [str(config_path)], "textures": []}))
        return
    global bpy, Vector
    import bpy
    from mathutils import Vector
    factories = {"cargo-hook": cargo_hook, "helipad": helipad, "fuel-pump": fuel_pump}
    reports = []
    for identifier, settings in config["assets"].items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.render.threads_mode = "FIXED"
        bpy.context.scene.render.threads = 4
        surfaces = {name: material(name, values) for name, values in config["materials"].items()}
        parent = factories[identifier](settings, surfaces)
        stats = measured(parent)
        validate(identifier, settings, stats)
        path = args.root / settings["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.object.select_all(action="DESELECT")
        for obj in [parent] + list(parent.children_recursive):
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                                  export_yup=True, export_materials="EXPORT", export_animations=False,
                                  export_cameras=False, export_lights=False, export_extras=True)
        reports.append({"asset": identifier, "path": settings["path"], **stats})
    print(json.dumps({"card": "HELI-ART-SRC", "actualBlenderExports": reports,
                      "artAccepted": False, "helicopterIncluded": False}))


if __name__ == "__main__":
    main()
