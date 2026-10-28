"""Ardennes-only beech, metric High/LOD pair: original trunk and limbs, crown of leaf cards.

Each crown is clusters of small crossed cut-out cards (alpha test, no blending) carrying a spray of real
beech leaves, so the outline is ragged and light shows through. The leaf photographs are ambientCG LeafSet024
(CC0). Step one makes the spray tiles:
  python tools/art/ardennes-leaf-sprite.py --source <LeafSet024 1K-JPG folder> --out <tile folder>
Step two exports the pair:
Blender -b -t 4 --disable-autoexec --python-exit-code 1 --python tools/blender/ardennes-beech.py -- --root <lane> --leaf-dir <tile folder>
--paths-only uses Python stdlib and never imports Blender or writes files.
"""
import argparse
import hashlib
import json
import math
import random
import struct
import sys
from pathlib import Path

IDENTIFIER = "ardennes-beech"
BUDGETS = (684, 240)
# Where each leaf cluster sits on the limb ends: (x, y, z, rx, ry, rz) in metres.
CLUSTERS = [(-1.65, -.3, 4.55, 2.05, 1.45, 1.25), (1.2, .25, 4.75, 2.3, 1.5, 1.25),
            (.2, 1.2, 5.1, 2.1, 1.6, 1.1), (-.35, -1.2, 4.7, 2, 1.5, 1.0),
            (-2, 1.1, 4.05, 1.6, 1.2, .85), (2.05, -1.05, 4.2, 1.7, 1.3, .95), (0, 0, 5.5, 1.9, 1.4, .75)]
# Crossed card pairs per cluster (High, LOD) and card edge length in metres (the LOD cards are larger).
PAIRS = (10, 6)
CARD_SIZE = ((1.5, 2.2), (1.9, 2.7))
LOWEST_CARD = 2.7
LEAF_TILES = ("leaf-spray-256.png", "leaf-spray-128.png")
LEAF_SOURCE = {"id": "LeafSet024", "url": "https://ambientcg.com/a/LeafSet024", "download": "LeafSet024_1K-JPG.zip",
               "licence": "CC0 1.0 (https://docs.ambientcg.com/license/)",
               "zipBytes": 4744373, "zipSha256": "5038f0dfb53647b2eed16adb9043f530f82a4fde3321f91ae59df74ba2f7ace1"}
LEAF_MATERIALS = ("summer beech leaves", "dark beech leaf underside")
LEAF_FACTOR = [.62, .72, .52, 1]
UNDERSIDE_FACTOR = [.38, .46, .34, 1]


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--model", choices=[IDENTIFIER], default=IDENTIFIER)
    parser.add_argument("--leaf-dir", type=Path)
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


def leaf_material(name, image):
    result = material(name, (1, 1, 1))
    result.use_backface_culling = False
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .82
    texture = result.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    texture.extension = "CLIP"
    result.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    result.node_tree.links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    return result


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


def leaf_cluster(index, cluster, low, leaves, underside):
    """One cluster: crossed card pairs scattered through an ellipsoid shell on a limb end."""
    x, y, z, rx, ry, rz = cluster
    rng = random.Random(1989 + index * 97 + (7 if low else 0))
    centre = Vector((x, y, z))
    vertices, faces, uvs, material_index, normals = [], [], [], [], []
    size_low, size_high = CARD_SIZE[int(low)]
    for _ in range(PAIRS[int(low)]):
        direction = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1) * .8))
        direction.normalize()
        reach = .55 + .45 * rng.random() ** (1 / 3)
        middle = centre + Vector((direction.x * rx, direction.y * ry, direction.z * rz)) * reach
        size = rng.uniform(size_low, size_high)
        # Beech leaves lie in layers, so most cards lean well over from upright.
        tilt, yaw = math.radians(rng.uniform(20, 80)), rng.uniform(0, math.tau)
        up = Vector((math.sin(tilt) * math.cos(yaw), math.sin(tilt) * math.sin(yaw), math.cos(tilt)))
        side = up.cross(Vector((0, 0, 1)))
        if side.length < .05:
            side = Vector((1, 0, 0))
        side.normalize()
        along = [side, up.cross(side).normalized()]
        # Keep the trunk showing below the leaves.
        middle.z = max(middle.z, LOWEST_CARD + size * .5 * (abs(up.z) + max(abs(axis.z) for axis in along)))
        lower = middle.z < z - .15 * rz
        flip = rng.random() < .5
        for axis in along:
            first = len(vertices)
            for u, v in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
                point = middle + axis * (u * size * .5) + up * (v * size * .5)
                vertices.append(tuple(point))
                outward = point - centre
                outward = Vector((outward.x / rx, outward.y / ry, outward.z / rz)).normalized()
                normals.append(tuple((outward * .75 + Vector((0, 0, .25))).normalized()))
                uvs.append((((1 - u) if flip else u) * .5 + .5, v * .5 + .5))
            faces.append((first, first + 1, first + 2, first + 3))
            material_index.append(int(lower))
    mesh = bpy.data.meshes.new("leaf-card-cluster-" + str(index))
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(leaves)
    mesh.materials.append(underside)
    layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        polygon.material_index = material_index[polygon.index]
        for loop_index in polygon.loop_indices:
            layer.data[loop_index].uv = uvs[mesh.loops[loop_index].vertex_index]
    mesh.normals_split_custom_set_from_vertices(normals)
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def build(low, tile):
    bark = material("smooth grey beech bark", (.15, .15, .14))
    image = bpy.data.images.load(str(tile))
    image.colorspace_settings.name = "sRGB"
    image.alpha_mode = "STRAIGHT"
    image.pack()
    leaves = leaf_material(LEAF_MATERIALS[0], image)
    underside = leaf_material(LEAF_MATERIALS[1], image)
    limb("visible smooth trunk", (0, 0, 0), (0, 0, 3.25), .23, 6 if low else 10, bark)
    for i, end in enumerate([(-1.5, -.3, 4.2), (1.55, .6, 4.4), (.1, 1.45, 4.6)]):
        a = (0, 0, 2.25 + i * .12)
        limb("forked limb " + str(i), a, end, .11, 4 if low else 6, bark)
        if not low:
            limb("secondary fork " + str(i), (end[0] * .65, end[1] * .65, 3.6),
                 (end[0] * .7 - .5, end[1] + .75, end[2] + .2), .055, 6, bark)
    crowns = [leaf_cluster(i, cluster, low, leaves, underside) for i, cluster in enumerate(CLUSTERS)]
    bpy.context.view_layer.update()
    crown_points = [obj.matrix_world @ vertex.co for obj in crowns for vertex in obj.data.vertices]
    crown_min = [min(point[i] for point in crown_points) for i in range(3)]
    crown_max = [max(point[i] for point in crown_points) for i in range(3)]
    crown_size = [crown_max[0]-crown_min[0], crown_max[2]-crown_min[2], crown_max[1]-crown_min[1]]
    cards = sum(len(obj.data.polygons) for obj in crowns)
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
    return obj, crown_size, crown_min[2], cards


def read_glb(path):
    data = path.read_bytes()
    magic, version, total = struct.unpack_from("<III", data, 0)
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if magic != 0x46546C67 or version != 2 or total != len(data) or json_type != 0x4E4F534A:
        raise ValueError("Unexpected GLB layout: " + str(path))
    return json.loads(data[20:20 + json_length].decode("utf-8")), data[20 + json_length:]


def write_glb(path, document, rest):
    text = json.dumps(document, separators=(",", ":")).encode("utf-8")
    text += b" " * (-len(text) % 4)
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, 20 + len(text) + len(rest)) +
                     struct.pack("<II", len(text), 0x4E4F534A) + text + rest)


def cut_out_leaves(path):
    """Alpha test with a hard edge, never blending; the underside is the same photograph, darker. Both are
    toned down a little from the bright photograph so the crown sits among the dark firs."""
    document, rest = read_glb(path)
    found = set()
    for entry in document["materials"]:
        name = entry["name"].rsplit(".", 1)[0] if entry["name"].rsplit(".", 1)[-1].isdigit() else entry["name"]
        if name not in LEAF_MATERIALS:
            continue
        found.add(name)
        entry["alphaMode"], entry["alphaCutoff"], entry["doubleSided"] = "MASK", .5, True
        entry["pbrMetallicRoughness"]["baseColorFactor"] = UNDERSIDE_FACTOR if name == LEAF_MATERIALS[1] else LEAF_FACTOR
        entry["pbrMetallicRoughness"]["metallicFactor"] = 0
    if found != set(LEAF_MATERIALS):
        raise ValueError("Both leaf materials must be exported: " + str(sorted(found)))
    write_glb(path, document, rest)


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
    if args.leaf_dir is None:
        raise ValueError("--leaf-dir (the folder made by tools/art/ardennes-leaf-sprite.py) is required")
    previous = preserved_landmarks(args.root)
    global bpy, Vector
    import bpy
    from mathutils import Vector
    runtime.mkdir(parents=True, exist_ok=True)
    tiles = [args.leaf_dir / name for name in LEAF_TILES]
    record = {"id": IDENTIFIER, "original": True, "author": "The Duel project", "recipe": "tools/blender/ardennes-beech.py",
              "source": "Original procedural trunk, limbs and crossed leaf-card crowns. Leaf photographs from ambientCG "
                        "LeafSet024 (CC0), composed into spray tiles by tools/art/ardennes-leaf-sprite.py.",
              "texture": {**LEAF_SOURCE, "usedFiles": json.loads((args.leaf_dir / "sprite.json").read_text(encoding="utf-8"))["source"], "tiles": {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in tiles},
                          "alpha": "MASK at 0.5 (cut-out, no blending)"},
              "scaleVariants": [.9, 1, 1.1], "lobes": len(CLUSTERS), "files": []}
    for low in [False, True]:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        obj, crown_size, trunk_visible, cards = build(low, tiles[int(low)])
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
            raise ValueError("Beech has an invalid grounded pivot or narrow crown: " +
                             json.dumps({"size": size, "crown": crown_size, "lowestCard": trunk_visible, "base": minimum[2]}))
        path = runtime / files[int(low)]
        bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", export_yup=True,
                                  export_cameras=False, export_lights=False, export_animations=False)
        cut_out_leaves(path)
        record["lowCrownSize" if low else "crownSize"] = crown_size
        record["lowVisibleTrunk" if low else "visibleTrunk"] = trunk_visible
        record["lowTriangles" if low else "highTriangles"] = triangles
        record["lowLeafCards" if low else "leafCards"] = cards
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
