"""Private fitting of Kyle's approved rigid tanker donors.

Decode original GLTF world triangles without welding or substituting topology.
Record exact source-world to fitted-world affine maps. Never write originals or
runtime assets. Run with Blender -b --disable-autoexec --python-exit-code 1.
"""
import argparse
import hashlib
import json
import math
import struct
import sys
import zipfile
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

RECIPE_ROOT = Path(__file__).resolve().parents[2]
APPROVED = RECIPE_ROOT / "tools/art/tanker-fit.json"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate(root, fit):
    approved = json.loads(APPROVED.read_text(encoding="utf-8"))
    for field in ("version", "card", "sourcePicks", "sources", "rig", "outputs"):
        if fit.get(field) != approved[field]:
            raise ValueError("Approved picked source binding changed: " + field)
    catalog = json.loads((root / "tools/art/catalog.json").read_text(encoding="utf-8"))
    records = {row["id"]: row for row in catalog["assets"]}
    paths = {}
    for source in fit["sources"]:
        record = records[source["catalogId"]]
        if (record["author"], record["sourcePage"], record["license"]) != (
                source["author"], source["sourcePage"], "CC0-1.0"):
            raise ValueError("Original CC0 source metadata changed")
        library = Path(record["library"])
        picks = [pick for pick in fit["sourcePicks"] if pick["catalogId"] == record["id"]]
        files = source["files"] + [{"path": pick["path"], "sha256": pick["sha256"]}
                                  for pick in picks]
        for pin in files:
            path = library / pin["path"]
            data = path.read_bytes()
            if sha(data) != pin["sha256"] or ("bytes" in pin and len(data) != pin["bytes"]):
                raise ValueError("Original source SHA/bytes changed: " + str(path))
            if not any(file["path"] == pin["path"] and file["sha256"] == pin["sha256"]
                       for file in record["files"]):
                raise ValueError("Original catalogue source binding changed: " + pin["path"])
        licence = (library / "unpacked/License.txt").read_text(encoding="utf-8-sig")
        if "Creative Commons Zero, CC0" not in licence:
            raise ValueError("Original embedded CC0 licence missing")
        with zipfile.ZipFile(library / "source.zip") as archive:
            for pin in files:
                if pin["path"].startswith("unpacked/"):
                    member = pin["path"][len("unpacked/"):]
                    if archive.read(member) != (library / pin["path"]).read_bytes():
                        raise ValueError("Original source ZIP member changed: " + member)
        for pick in picks:
            paths[pick["role"]] = library / pick["path"]
    donor = json.loads((root / "tools/art/tanker-valve-source.json").read_text(encoding="utf-8"))
    valve = next(pick for pick in fit["sourcePicks"] if pick["role"] == "valve")
    if donor["catalogId"] != valve["catalogId"] or donor["source"]["model"] != {
            "path": valve["path"], "triangles": valve["triangles"]}:
        raise ValueError("Approved valve source binding changed")
    return paths


def glb(path):
    data = path.read_bytes()
    if data[:4] != b"glTF" or struct.unpack_from("<II", data, 4) != (2, len(data)):
        raise ValueError("Invalid original GLB")
    offset, document, binary = 12, None, None
    while offset < len(data):
        length, kind = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8:offset + 8 + length]
        if kind == 0x4E4F534A:
            document = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = chunk
        offset += length + 8
    if document is None or binary is None:
        raise ValueError("Missing original native geometry")
    return document, binary


def identity():
    return [[float(r == c) for c in range(4)] for r in range(4)]


def multiply(a, b):
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def point(matrix, value):
    return tuple(sum(matrix[r][c] * value[c] for c in range(3)) + matrix[r][3]
                 for r in range(3))


def node_matrix(node):
    if "matrix" in node:
        return [[node["matrix"][c * 4 + r] for c in range(4)] for r in range(4)]
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    scale = node.get("scale", [1, 1, 1])
    result = [
        [1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w), 0],
        [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w), 0],
        [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y), 0],
        [0, 0, 0, 1],
    ]
    for r in range(3):
        for c in range(3):
            result[r][c] *= scale[c]
        result[r][3] = node.get("translation", [0, 0, 0])[r]
    return result


def source_faces(path):
    doc, binary = glb(path)
    if doc.get("skins") or doc.get("animations"):
        raise ValueError("Picked rigid donor changed")

    def values(index):
        accessor = doc["accessors"][index]
        view = doc["bufferViews"][accessor["bufferView"]]
        kind, width = {5121: ("B", 1), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}[
            accessor["componentType"]]
        count = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[accessor["type"]]
        offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        stride = view.get("byteStride", width * count)
        return [struct.unpack_from("<" + kind * count, binary, offset + i * stride)
                for i in range(accessor["count"])]
    faces = []

    def visit(index, parent):
        node = doc["nodes"][index]
        world = multiply(parent, node_matrix(node))
        if "mesh" in node:
            for primitive in doc["meshes"][node["mesh"]]["primitives"]:
                if primitive.get("mode", 4) != 4:
                    raise ValueError("Original donor no longer has triangle topology")
                positions = values(primitive["attributes"]["POSITION"])
                indices = ([row[0] for row in values(primitive["indices"])]
                           if "indices" in primitive else range(len(positions)))
                for i in range(0, len(indices), 3):
                    face = tuple(point(world, positions[indices[i + j]]) for j in range(3))
                    faces.append((face, node.get("name", "")))
        for child in node.get("children", []):
            visit(child, world)
    for node in doc["scenes"][doc.get("scene", 0)]["nodes"]:
        visit(node, identity())
    return faces


def bounds(faces):
    vertices = [p for face, _ in faces for p in face]
    return ([min(p[i] for p in vertices) for i in range(3)],
            [max(p[i] for p in vertices) for i in range(3)])


def affine(scale=(1, 1, 1), location=(0, 0, 0), rotation=0):
    c, s = math.cos(rotation), math.sin(rotation)
    return [[c*scale[0], 0, s*scale[2], location[0]],
            [0, scale[1], 0, location[1]],
            [-s*scale[0], 0, c*scale[2], location[2]],
            [0, 0, 0, 1]]


def fitted_bounds(faces, matrix):
    return bounds([(tuple(point(matrix, p) for p in face), name) for face, name in faces])


def wear_atlas(seed):
    """Replacement faded paint, oxide, dust, glass and tire surfaces."""
    size = 512
    x, y = np.meshgrid(np.arange(size), np.arange(size))
    rng = np.random.default_rng(seed)
    grain = rng.uniform(-1, 1, (size, size))
    broad = (np.sin(x*.037 + np.sin(y*.024)*2) +
             np.cos(y*.043 + np.cos(x*.017)*3)) * .5
    rust = np.clip(broad + grain*.6, 0, 1)
    scratch = ((x*19 + y*3) % 137 < 2) * (grain > -.45)
    bases = [(.25, .27, .25), (.34, .32, .26), (.26, .23, .20),
             (.14, .15, .15), (.075, .071, .065), (.065, .09, .10),
             (.32, .13, .07), (.28, .24, .18)]
    pixels = np.ones((size, size, 4), dtype=np.float32)
    for band, base in enumerate(bases):
        mask = y // (size // 8) == band
        for channel, value in enumerate(base):
            oxide = [.39, .19, .075][channel]
            colour = value*(1 + grain*.16)*(1 - rust*.48) + oxide*rust*.48
            colour += scratch*.065 + np.sin(x*.015)*.025
            if band in (4, 5):
                colour = value*(1 + grain*.13) + scratch*.018
            pixels[:, :, channel][mask] = np.clip(colour[mask], .025, .56)
    image = bpy.data.images.new("tanker-worn-paint-oxide-dust", width=size, height=size)
    image.pixels.foreach_set(pixels.ravel())
    image.pack()
    materials = []
    for band, name in enumerate(["faded-steel-paint", "dusty-tank-steel", "burnt-salvage",
                                "oiled-drivetrain", "weathered-rubber", "dirty-cab-glass",
                                "rust-red-valve", "roof-tread-steel"]):
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Metallic"].default_value = 0 if band in (4, 5) else .48
        shader.inputs["Roughness"].default_value = .38 if band == 5 else .86
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = image
        material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
        materials.append(material)
    return materials


def mesh_part(name, faces, matrix, materials, band):
    positions, triangles, bands, uvs = [], [], [], []
    for face, source_name in faces:
        fitted = [point(matrix, p) for p in face]
        normal = (Vector(fitted[1]) - Vector(fitted[0])).cross(
            Vector(fitted[2]) - Vector(fitted[0]))
        normal.normalize()
        axes = ((0, 2) if abs(normal.y) > max(abs(normal.x), abs(normal.z))
                else (2, 1) if abs(normal.x) > abs(normal.z) else (0, 1))
        material_band = 4 if source_name.startswith("wheel") else band
        triangles.append(tuple(range(len(positions), len(positions) + 3)))
        bands.append(material_band)
        for p in fitted:
            # Blender Z-up converts back to game GLTF Y-up on export.
            positions.append((p[0], -p[2], p[1]))
            u = (p[axes[0]]*.41) % 1
            v = ((p[axes[1]]*.29) % 1)*.115 + material_band/8 + .005
            uvs.append((u, v))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(positions, [], triangles)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    uv = mesh.uv_layers.new(name="worn-material-atlas")
    for face_index, polygon in enumerate(mesh.polygons):
        polygon.material_index = bands[face_index]
        polygon.use_smooth = band in (1, 6)
        for loop_index in polygon.loop_indices:
            uv.data[loop_index].uv = uvs[mesh.loops[loop_index].vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def build(output, fit, paths, seed):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sources = {role: source_faces(path) for role, path in paths.items()}
    for pick in fit["sourcePicks"]:
        if len(sources[pick["role"]]) != pick["triangles"]:
            raise ValueError("Original source triangle count changed: " + pick["model"])
    materials = wear_atlas(seed)
    parts, lineage = [], []

    def add(role, name, donor, matrix, band, subset=None):
        faces = sources[donor] if subset is None else subset
        mesh_part(name, faces, matrix, materials, band)
        pick = next(p for p in fit["sourcePicks"] if p["role"] == donor)
        parts.append({"role": role, "node": name})
        row = {"sourceKey": pick["catalogId"] + "/" + pick["path"], "node": name,
               "matrix": [matrix[r][c] for c in range(4) for r in range(4)]}
        if len(faces) != pick["triangles"]:
            row["trimmed"] = True
        lineage.append(row)
        return fitted_bounds(faces, matrix)

    body_low, body_high = add("body", "tanker-body", "body", affine((2, 2, 2.2)), 0)
    # Rotate the complete picked horizontal tank along the bed.
    tank_matrix = affine((4.15, 4.25, 4.4), (0, 1, -1.29), math.pi/2)
    tank_low, tank_high = add("tank", "tanker-tank", "tank", tank_matrix, 1)
    for index, z in enumerate([-2.45, -1.29, -.13]):
        side = -1 if index == 1 else 1
        matrix = affine((.46, .46, .46), (side*1.015, 1.78, z),
                        math.pi/2 if side > 0 else -math.pi/2)
        add("valve", "tanker-valve-" + str(index), "valve", matrix, 6)
    for side in (-1, 1):
        add("armor", "tanker-cab-door-" + str(side), "armor-door",
            affine((.38, 1.45, 1.35), (side*1.08, 1.22, 1.68)), 2)
    add("armor", "tanker-rear-drivetrain", "armor-drivetrain",
        affine((1.65, 1, .30), (0, 1.03, -3.42)), 3)
    for side in (-1, 1):
        add("armor", "tanker-salvage-tyre-" + str(side), "armor-tyre",
            affine((.75, 1.3, 1.3), (side*1.280017, 1.270021, -1.289983)), 4)
    panel_faces = sources["armor-panel"]
    low, high = bounds(panel_faces)
    roof = [(face, name) for face, name in panel_faces
            if all(p[1] >= high[1] - .041 for p in face)]
    if not roof:
        raise ValueError("Approved container has no actual roof salvage")
    plate_matrix = affine((3.75, .75, 2.15),
                          (0, tank_high[1] - (high[1] - .040)*.75, -1.29))
    plate_low, plate_high = add("boarding-plate", "tanker-boarding-plate",
                               "armor-panel", plate_matrix, 7, roof)
    # Compress genuine container shells into supported salvaged side skirts.
    for side in (-1, 1):
        add("armor", "tanker-bed-skirt-" + str(side), "armor-panel",
            affine((.20, 1.8, 4.1), (side*1.29, .75, -1.29)), 2)
    lamp_material = bpy.data.materials.new("boarding-warning-lamp")
    lamp_material.use_nodes = True
    shader = lamp_material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (.38, .115, .025, 1)
    shader.inputs["Roughness"].default_value = .42
    shader.inputs["Metallic"].default_value = .2
    shader.inputs["Emission Color"].default_value = (.7, .16, .015, 1)
    shader.inputs["Emission Strength"].default_value = 0
    for index, x in enumerate([-.52, .52]):
        # Small warning lamps are the only authored accessory geometry.
        vertices = []
        for height, radius in [(plate_high[1] - .010, .075),
                               (plate_high[1] + .080, .052)]:
            for segment in range(12):
                angle = segment*math.tau/12
                vertices.append((x + math.cos(angle)*radius,
                                 1.29 + math.sin(angle)*radius, height))
        vertices += [(x, 1.29, plate_high[1] - .010),
                     (x, 1.29, plate_high[1] + .080)]
        triangles = []
        for segment in range(12):
            following = (segment + 1) % 12
            triangles.extend([(segment, following, segment + 12),
                              (following, following + 12, segment + 12),
                              (24, following, segment),
                              (25, segment + 12, following + 12)])
        mesh = bpy.data.meshes.new("warning-lamp")
        mesh.from_pydata(vertices, [], triangles)
        mesh.update()
        mesh.materials.append(lamp_material)
        lamp = bpy.data.objects.new("tanker-warning-lamp-" + str(index), mesh)
        bpy.context.collection.objects.link(lamp)
        parts.append({"role": "warning-lamp", "node": lamp.name})
    output.mkdir(parents=True, exist_ok=True)
    model = output / fit["outputs"]["model"]
    bpy.ops.export_scene.gltf(filepath=str(model), export_format="GLB", export_yup=True,
                              export_animations=False, export_extras=True,
                              export_cameras=False, export_lights=False)
    document, _ = glb(model)
    triangles = sum(document["accessors"][p["indices"]]["count"]//3
                    for mesh in document["meshes"] for p in mesh["primitives"])
    draws = sum(len(mesh["primitives"]) for mesh in document["meshes"])
    manifest = {"card": fit["card"], "seed": seed, "parts": parts,
                "sourceInstances": lineage,
                "stats": {"triangles": triangles, "meshes": draws, "draws": draws,
                          "bytes": model.stat().st_size},
                "rig": fit["rig"], "sourceChoice": fit["sourceChoice"],
                "provenance": fit["sources"],
                "bounds": {"body": [body_low, body_high], "tank": [tank_low, tank_high],
                           "boardingPlate": [plate_low, plate_high]},
                "limits": {"nativeCountsAreNotFrameCost": True,
                           "privateCandidateNotApprovedRuntimeArt": True}}
    (output / fit["outputs"]["manifest"]).write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Private tanker native measurements:", json.dumps(manifest["stats"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--fit-config", required=True, type=Path)
    parser.add_argument("--seed", required=True, type=int)
    parser.add_argument("--validate-sources", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    fit = json.loads(args.fit_config.read_text(encoding="utf-8"))
    paths = validate(args.root.resolve(), fit)
    if args.validate_sources:
        print("Approved picked sources: original bytes, archives and embedded CC0 verified.")
        return
    output = args.output_dir.resolve()
    if not any(output.is_relative_to(RECIPE_ROOT/private) for private in (".qa-dist", ".evidence")):
        raise ValueError("Candidate output must stay in this lane's private .qa-dist or .evidence")
    build(output, fit, paths, args.seed)


if __name__ == "__main__":
    main()
