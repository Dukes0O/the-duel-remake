"""Original Ardennes-only beech, metric High/LOD pair with embedded original leaves.

Blender -b -t 4 --disable-autoexec --python-exit-code 1 --python tools/blender/ardennes-beech.py -- --root <lane>
--paths-only uses Python stdlib and never imports Blender or writes files.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

IDENTIFIER = "ardennes-beech"
BUDGETS = (684, 240)
LOBES = [(-1.65, -.3, 4.55, 2.05, 1.45, 1.25), (1.2, .25, 4.75, 2.3, 1.5, 1.25),
         (.2, 1.2, 5.1, 2.1, 1.6, 1.1), (-.35, -1.2, 4.7, 2, 1.5, 1.0),
         (-2, 1.1, 4.05, 1.6, 1.2, .85), (2.05, -1.05, 4.2, 1.7, 1.3, .95), (0, 0, 5.5, 1.9, 1.4, .75)]


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--model", choices=[IDENTIFIER], default=IDENTIFIER)
    parser.add_argument("--paths-only", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    args.root = args.root.resolve()
    return args


def material(name, colour):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.diffuse_color = (*colour, 1)
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*colour, 1)
    shader.inputs["Roughness"].default_value = .88
    return result


def leaf_texture(dark=False):
    # Original repeating leaf ovals and veins, generated pixels packed into the GLB.
    size = 128
    image = bpy.data.images.new("original-ardennes-summer-leaves" + ("-underside" if dark else ""), width=size, height=size, alpha=False)
    image.colorspace_settings.name = "sRGB"
    pixels = []
    for y in range(size):
        for x in range(size):
            cell_x, cell_y = x // 12, y // 10
            u, v = (x % 12 - 5.5) / 5.5, (y % 10 - 4.5) / 4.5
            tilt = .45 * math.sin(cell_x * 1.7 + cell_y * 2.3)
            a, b = u * math.cos(tilt) - v * math.sin(tilt), u * math.sin(tilt) + v * math.cos(tilt)
            leaf = a * a + b * b * .65 < .92
            noise = .5 + .5 * math.sin(x * 17.13 + y * 91.7)
            tone = .72 + .28 * noise if leaf else .43 + .12 * noise
            if leaf and abs(a) < .065:
                tone += .13
            shade = (.53, .67, .45) if dark else (1, 1, 1)
            pixels.extend((.31 * tone * shade[0], .58 * tone * shade[1], .16 * tone * shade[2], 1))
    image.pixels.foreach_set(pixels)
    image.update()
    image.file_format = "PNG"
    image.pack()
    return image


def limb(name, a, b, radius, sides, bark):
    vector = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius, radius2=radius * .48,
                                    depth=vector.length, location=(Vector(a) + Vector(b)) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = vector.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(bark)
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4


def crown(index, lobe, low, leaves, underside):
    x, y, z, rx, ry, rz = lobe
    segments, rings = (5, 3) if low else (8, 4)
    vertices = [(x, y, z - rz)]
    for ring in range(1, rings):
        theta = math.pi * ring / rings
        for arm in range(segments):
            angle = arm * math.tau / segments + .19 * index
            ripple = 1 + .14 * math.sin(arm * 2.7 + ring * 1.9 + index * 1.3)
            vertices.append((x + rx * math.sin(theta) * math.cos(angle) * ripple,
                             y + ry * math.sin(theta) * math.sin(angle) * ripple,
                             z - rz * math.cos(theta) + .10 * math.sin(arm * 1.7 + index)))
    top = len(vertices)
    vertices.append((x + .12 * math.sin(index), y, z + rz))
    faces = []
    for arm in range(segments):
        faces.append((0, 1 + (arm + 1) % segments, 1 + arm))
    for ring in range(rings - 2):
        start, next_start = 1 + ring * segments, 1 + (ring + 1) * segments
        for arm in range(segments):
            next_arm = (arm + 1) % segments
            faces.append((start + arm, start + next_arm, next_start + next_arm, next_start + arm))
    last = 1 + (rings - 2) * segments
    for arm in range(segments):
        faces.append((last + arm, last + (arm + 1) % segments, top))
    mesh = bpy.data.meshes.new("irregular-wide-beech-lobe-" + str(index))
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(leaves)
    mesh.materials.append(underside)
    uv = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        polygon.material_index = int(sum(vertices[i][2] for i in polygon.vertices) / len(polygon.vertices) < z - .2)
        for loop_index in polygon.loop_indices:
            vertex = vertices[mesh.loops[loop_index].vertex_index]
            uv.data[loop_index].uv = ((vertex[0] - x) / (rx * 2) + .5, (vertex[1] - y) / (ry * 2) + .5)
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def build(low):
    bark = material("smooth grey beech bark", (.38, .39, .35))
    leaves, underside = material("summer beech leaves", (1, 1, 1)), material("dark beech leaf underside", (1, 1, 1))
    for surface, dark in [(leaves, False), (underside, True)]:
        shader = surface.node_tree.nodes.get("Principled BSDF")
        texture = surface.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = leaf_texture(dark)
        surface.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    limb("visible smooth trunk", (0, 0, 0), (0, 0, 3.25), .23, 6 if low else 10, bark)
    for i, end in enumerate([(-1.5, -.3, 4.2), (1.55, .6, 4.4), (.1, 1.45, 4.6)]):
        a = (0, 0, 2.25 + i * .12)
        limb("forked limb " + str(i), a, end, .11, 4 if low else 6, bark)
        if not low:
            limb("secondary fork " + str(i), (end[0] * .65, end[1] * .65, 3.6),
                 (end[0] * .7 - .5, end[1] + .75, end[2] + .2), .055, 6, bark)
    crowns = [crown(i, lobe, low, leaves, underside) for i, lobe in enumerate(LOBES)]
    bpy.context.view_layer.update()
    crown_points = [obj.matrix_world @ vertex.co for obj in crowns for vertex in obj.data.vertices]
    crown_min = [min(point[i] for point in crown_points) for i in range(3)]
    crown_max = [max(point[i] for point in crown_points) for i in range(3)]
    crown_size = [crown_max[0]-crown_min[0], crown_max[2]-crown_min[2], crown_max[1]-crown_min[1]]
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = IDENTIFIER
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.update()
    return obj, crown_size, crown_min[2]


def preserved_landmarks(root):
    records = json.loads((root / "tools/art/ardennes-landmarks.json").read_text(encoding="utf-8"))["models"]
    result = {}
    for row in records:
        for entry in row["files"]:
            path = root / "public/assets/models/circuits/kits" / entry["path"]
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != entry["sha256"] or path.stat().st_size != entry["bytes"]:
                raise ValueError("Existing Ardennes landmark differs: " + str(path))
            result[str(path)] = digest
    return result


def main():
    args = arguments()
    runtime = args.root / "public/assets/models/circuits/kits"
    provenance = args.root / "tools/art/ardennes-beech.json"
    files = [IDENTIFIER + suffix + ".glb" for suffix in ["", "-lod"]]
    if args.paths_only:
        print(json.dumps({"runtime": str(runtime), "files": files, "provenance": str(provenance)}))
        return
    previous = preserved_landmarks(args.root)
    global bpy, Vector
    import bpy
    from mathutils import Vector
    runtime.mkdir(parents=True, exist_ok=True)
    record = {"id": IDENTIFIER, "original": True, "author": "The Duel project", "recipe": "tools/blender/ardennes-beech.py",
              "source": "Original procedural beech and embedded original leafy pixels. No external donor or texture.",
              "scaleVariants": [.9, 1, 1.1], "lobes": len(LOBES), "files": []}
    for low in [False, True]:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        obj, crown_size, trunk_visible = build(low)
        graph = bpy.context.evaluated_depsgraph_get()
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles = len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
        points = [obj.matrix_world @ Vector(point) for point in obj.bound_box]
        minimum = [min(point[i] for point in points) for i in range(3)]
        maximum = [max(point[i] for point in points) for i in range(3)]
        size = [maximum[0]-minimum[0], maximum[2]-minimum[2], maximum[1]-minimum[1]]
        if not 0 < triangles <= BUDGETS[int(low)]:
            raise ValueError("Beech exceeds unchanged per-tree triangle ceiling: " + str(triangles))
        if (not all(math.isfinite(value) for value in size + crown_size) or abs(minimum[2]) > .00001 or
                max(crown_size[0], crown_size[2]) <= crown_size[1] or trunk_visible < size[1] / 3):
            raise ValueError("Beech has an invalid grounded pivot or narrow crown")
        path = runtime / files[int(low)]
        bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", export_yup=True,
                                  export_cameras=False, export_lights=False, export_animations=False)
        record["lowCrownSize" if low else "crownSize"] = crown_size
        record["lowVisibleTrunk" if low else "visibleTrunk"] = trunk_visible
        record["lowTriangles" if low else "highTriangles"] = triangles
        record["lowSize" if low else "size"] = size
        record["files"].append({"path": path.name, "bytes": path.stat().st_size,
                                "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    if preserved_landmarks(args.root) != previous:
        raise ValueError("Existing landmark files changed during selected beech export")
    record["bytes"] = sum(entry["bytes"] for entry in record["files"])
    if record["bytes"] > 250000:
        raise ValueError("Beech High/LOD pair exceeds the existing original-kit 250 KB ceiling")
    provenance.write_text(json.dumps({"version": 1, "units": "metres", "up": "Y", "models": [record]}, indent=2) + "\n",
                          encoding="utf-8", newline="\n")
    print(json.dumps({"models": [record]}), flush=True)


if __name__ == "__main__":
    main()
