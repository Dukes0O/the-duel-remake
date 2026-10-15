"""P4-ARDENNES original metric landmarks. No donors or downloads.

Blender -b --disable-autoexec --python-exit-code 1 --python tools/blender/ardennes-landmarks.py -- --root <lane>
Only the three owned High/LOD pairs and tools/art/ardennes-landmarks.json are written.
The game receives Y-up meshes with their ground pivot at zero.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

BUDGETS = {"stone-stream-bridge": (2500, 800), "forest-footbridge": (3500, 1000),
           "forest-timing-tower": (4000, 1200)}


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--paths-only", action="store_true")
    parser.add_argument("--model", choices=list(BUDGETS), help="Export only this existing High/LOD pair; preserve the others")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    args.root = args.root.resolve()
    return args


def material(name, colour, roughness=.86, metalness=0, glow=0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*colour, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*colour, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metalness
    if glow:
        shader.inputs["Emission Color"].default_value = (*colour, 1)
        shader.inputs["Emission Strength"].default_value = glow
    return result


def box(name, location, dimensions, surface):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(surface)
    return obj


def beam(name, a, b, width, surface):
    vector = Vector(b) - Vector(a)
    obj = box(name, (Vector(a) + Vector(b)) / 2, (width, width, vector.length), surface)
    obj.rotation_euler = vector.to_track_quat("Z", "Y").to_euler()
    return obj


def wedge(name, theta0, theta1, inner, outer, depth, surface):
    vertices = []
    for y in [-depth / 2, depth / 2]:
        for radius, theta in [(inner, theta0), (outer, theta0), (outer, theta1), (inner, theta1)]:
            vertices.append((radius * math.cos(theta), y, .25 + radius * math.sin(theta)))
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(surface)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)


def stone_bridge(low):
    stone = [material("weathered grey stone " + str(i), colour, roughness=.94) for i, colour in enumerate(
        [(.20, .22, .21), (.27, .29, .28), (.32, .33, .32), (.24, .26, .25)])]
    coping = material("dark worn coping", (.24, .25, .23))
    steps = 8 if low else 14
    for i in range(steps):
        wedge("arched voussoir " + str(i), i * math.pi / steps + .006, (i + 1) * math.pi / steps - .006,
              2.45, 3.18, 4.6, stone[i % 4])
    for side in [-1, 1]:
        box("stream pier", (side * 4.15, 0, 1.75), (2.1, 5.2, 3.5), stone[0])
        box("pier footing", (side * 4.15, 0, .18), (2.5, 5.5, .36), coping)
    box("bridge deck", (0, 0, 3.53), (12, 5.1, .5), stone[1])
    courses = 1 if low else 3
    columns = 6 if low else 12
    for side in [-1, 1]:
        for level in range(courses):
            for i in range(columns):
                width = 12 / columns
                box("individual parapet block", (-6 + width * (i + .5), side * 2.42,
                    3.95 + level * .24 / max(1, courses - 1)), (width - .035, .4, .25 if not low else .65), stone[(i + level) % 4])
        box("parapet coping", (0, side * 2.42, 4.52), (12.15, .52, .16), coping)
    if not low:
        for side in [-1, 1]:
            for i in range(10):
                box("pier masonry seam", (side * 4.15, -2.62, .5 + i * .29), (1.88, .055, .035), coping)


def footbridge(low):
    steel = material("oxidised green footbridge steel", (.13, .19, .16), .77, .6)
    timber = material("worn timber decking", (.28, .24, .18))
    concrete = material("weathered bridge footings", (.40, .40, .36))
    rail = material("galvanised rail edges", (.36, .40, .39), .65, .65)
    for side in [-1, 1]:
        for y in [-1.2, 1.2]:
            box("outside road pier", (side * 25, y, 3.45), (.55, .55, 6.9), steel)
            box("pier foundation", (side * 25, y, .15), (1.3, 1.3, .3), concrete)
        box("main girder", (0, side * 1.25, 6.75), (51, .25, .6), steel)
        box("handrail", (0, side * 1.27, 8.22), (51, .12, .12), rail)
        count = 10 if low else 26
        for i in range(count + 1):
            x = -25 + i * 50 / count
            box("rail upright", (x, side * 1.27, 7.64), (.1, .1, 1.1), steel)
        if not low:
            for i in range(25):
                x = -25 + i * 2
                beam("truss brace", (x, side * 1.26, 6.46), (x + 2, side * 1.26, 7.05), .08, steel)
    box("open walk deck", (0, 0, 7.02), (51, 2.5, .22), timber)
    for side in [-1, 1]:
        count = 8 if low else 20
        for i in range(count):
            height = 7 * (1 - (i + .5) / count)
            x = side * (25.5 + (i + .5) * 9 / count)
            box("outside fence stair tread", (x, 0, height), (9 / count, 2.2, .12), timber)
        for y in [-1.2, 1.2]:
            beam("stair stringer", (side * 25.5, y, 6.85), (side * 34.5, y, .06), .18, steel)
            beam("stair handrail", (side * 25.5, y, 8.2), (side * 34.5, y, 1.4), .1, rail)


def timing_tower(low):
    base = material("timing tower stone base", (.29, .30, .28))
    plaster = material("worn pale tower plaster", (.55, .54, .48))
    steel = material("dark tower framing", (.12, .15, .15), .8, .4)
    glass = material("blue grey timing room glazing", (.14, .24, .26), .42, .2)
    digit = material("timing display amber digits", (.85, .66, .30), .55, 0, .35)
    box("timing tower ground base", (0, 0, .25), (5.4, 5.4, .5), base)
    box("tower shaft", (0, 0, 6), (3.2, 3.8, 11), plaster)
    for z in [4.2, 8.2, 11.9]:
        box("projecting floor cornice", (0, 0, z), (4.2, 4.6, .3), base)
    box("timing room", (0, 0, 12.7), (5.8, 5.5, 1.5), glass)
    for x in [-2.9, 0, 2.9]:
        for y in [-2.76, 2.76]:
            box("timing room mullion", (x, y, 12.7), (.15, .15, 1.65), steel)
    box("overhanging timing roof", (0, 0, 13.7), (6.3, 6.1, .35), steel)
    box("roof aerial", (0, 0, 15), (.12, .12, 2.6), steel)
    for side in [-1, 1]:
        box("dark timing display", (0, side * 1.93, 9.85), (3.0, .12, 2.2), steel)
        for column in range(3):
            x = -.95 + column * .95
            for z in [9.25, 9.9, 10.55]:
                box("timing digit segment", (x, side * 2.01, z), (.50, .055, .08), digit)
            for dx in [-.26, .26]:
                for z in [9.57, 10.23]:
                    box("timing digit segment", (x + dx, side * 2.01, z), (.08, .055, .52), digit)
    if not low:
        for side in [-1, 1]:
            for z in [1.5, 2.4, 3.3, 5, 6, 7, 9, 10]:
                box("tower mortar joint", (0, side * 1.91, z), (3.0, .035, .035), base)


def stats():
    triangles = 0
    points = []
    graph = bpy.context.evaluated_depsgraph_get()
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
        evaluated.to_mesh_clear()
    low = [min(point[i] for point in points) for i in range(3)]
    high = [max(point[i] for point in points) for i in range(3)]
    # Blender Z-up becomes runtime Y-up; X and depth retain their extents.
    return triangles, [high[0] - low[0], high[2] - low[2], high[1] - low[1]]


def main():
    args = arguments()
    runtime = args.root / "public/assets/models/circuits/kits"
    provenance = args.root / "tools/art/ardennes-landmarks.json"
    selected = [args.model] if args.model else list(BUDGETS)
    if args.paths_only:
        print(json.dumps({"runtime": str(runtime), "files": [id + suffix + ".glb" for id in selected for suffix in ["", "-lod"]],
                          "provenance": str(provenance)}))
        return
    # A selected pair must not erase or silently replace another model's provenance.
    previous = None
    if args.model:
        previous = json.loads(provenance.read_text(encoding="utf-8"))
        if (previous.get("version") != 1 or previous.get("units") != "metres" or previous.get("up") != "Y" or
                [row.get("id") for row in previous.get("models", [])] != list(BUDGETS)):
            raise ValueError("Selected export needs the complete current measured provenance")
        for record in previous["models"]:
            if record["id"] == args.model:
                continue
            expected = [record["id"] + suffix + ".glb" for suffix in ["", "-lod"]]
            if [item.get("path") for item in record["files"]] != expected:
                raise ValueError("Invalid untouched model pair")
            for item in record["files"]:
                path = runtime / item["path"]
                if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
                    raise ValueError("Untouched model differs from its measured provenance: " + item["path"])
    global bpy, Vector
    import bpy
    from mathutils import Vector
    runtime.mkdir(parents=True, exist_ok=True)
    provenance.parent.mkdir(parents=True, exist_ok=True)
    records = []
    builders = {"stone-stream-bridge": stone_bridge, "forest-footbridge": footbridge, "forest-timing-tower": timing_tower}
    for identifier in selected:
        builder = builders[identifier]
        record = {"id": identifier, "original": True, "author": "The Duel project", "recipe": "tools/blender/ardennes-landmarks.py",
                  "source": "Original geometry authored for CIRCUITS.md section 5.5. No external model, texture or download.", "files": []}
        for low in [False, True]:
            bpy.ops.object.select_all(action="SELECT")
            bpy.ops.object.delete(use_global=False)
            builder(low)
            # Join this original model once. Materials remain separate draw groups,
            # while hundreds of individual bricks do not become runtime nodes.
            objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
            bpy.ops.object.select_all(action="DESELECT")
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            bpy.ops.object.join()
            bpy.context.object.name = identifier
            bpy.context.view_layer.update()
            triangles, size = stats()
            if triangles <= 0 or triangles > BUDGETS[identifier][int(low)]:
                raise ValueError(identifier + " exceeds its authored triangle budget: " + str(triangles))
            path = runtime / (identifier + ("-lod" if low else "") + ".glb")
            bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", export_yup=True,
                                     export_cameras=False, export_lights=False, export_animations=False)
            record["lowTriangles" if low else "highTriangles"] = triangles
            record["lowSize" if low else "size"] = size
            record["files"].append({"path": path.name, "bytes": path.stat().st_size,
                                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        record["bytes"] = sum(item["bytes"] for item in record["files"])
        if record["bytes"] > 250000:
            raise ValueError(identifier + " High/LOD pair exceeds 250 KB")
        records.append(record)
    if previous:
        replacements = {row["id"]: row for row in records}
        records = [replacements.get(row["id"], row) for row in previous["models"]]
    provenance.write_text(json.dumps({"version": 1, "units": "metres", "up": "Y", "models": records}, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"models": records}), flush=True)


if __name__ == "__main__":
    main()
