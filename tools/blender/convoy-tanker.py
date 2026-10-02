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

def _private_cli_plan():
    """Reject unsafe destinations and plan outputs without Blender or inputs."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--fit-config", required=True, type=Path)
    parser.add_argument("--seed", required=True, type=int)
    parser.add_argument("--validate-sources", action="store_true")
    parser.add_argument("--paths-only", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    # Source-validation fixtures may supply another catalogue root. Normal
    # exports still use the original lane boundary; plans use their requested root.
    root = (args.root if args.paths_only else Path(__file__).resolve().parents[2]).resolve()
    output = args.output_dir.resolve()
    if ".." in args.output_dir.parts or not any(
            output.is_relative_to(root / private)
            for private in (".qa-dist", ".evidence")):
        raise ValueError("Private output must stay inside its planning root or recipe lane's "
                         ".qa-dist or .evidence; outside and linked escapes are forbidden")
    if args.paths_only:
        # Native outputs are fixed by the approved recipe. No fit, catalogue,
        # licence, cache or destination read is needed to describe these paths.
        print(json.dumps({"blend": [], "glb": [str(output / "tanker.glb")],
                          "json": [str(output / "manifest.json")], "atlas": [],
                          "embeddedAtlas": ["tanker-local-wear-and-hazard-atlas", "tanker-dark-roof-and-warning-border"]}))
        raise SystemExit(0)


if __name__ == "__main__":
    _private_cli_plan()


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
                source_uvs = values(primitive["attributes"]["TEXCOORD_0"])
                indices = ([row[0] for row in values(primitive["indices"])]
                           if "indices" in primitive else range(len(positions)))
                for i in range(0, len(indices), 3):
                    face = tuple(point(world, positions[indices[i + j]]) for j in range(3))
                    name = node.get("name", "")
                    # Read original face regions as semantic labels only. The
                    # original UVs and source palette never enter fitted art.
                    u = source_uvs[indices[i]][0]
                    if name == "pipe-large-valve":
                        name += (":control" if abs(u-.84375) < .001 else
                                 ":flange" if abs(u-.09375) < .001 else ":pipe")
                    elif name == "body" and abs(u - .09375) < .001:
                        name += ":glass"
                    elif name == "body" and abs(u - .21875) < .001:
                        name += ":headlight"
                    elif name.startswith("wheel") and u > .4:
                        name += ":hub"
                    faces.append((face, name))
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


SURFACE_BANDS = 15


def wear_atlas(seed, tank_bands):
    """Seeded oxide, lower cab grime and painted target/boarding markings."""
    width, height = 1024, SURFACE_BANDS * 64
    x, y = np.meshgrid(np.arange(width), np.arange(height))
    rng = np.random.default_rng(seed)
    grain = rng.uniform(-1, 1, (height, width))
    patches = np.sin(x*.031 + np.sin(y*.041)*2) + np.cos(y*.052 + x*.009)
    rust = np.clip((patches - .85)*.9, 0, 1)
    scratch = ((x*17 + y*3) % 251 < 2) * (grain > -.3)
    dust = np.maximum(0, np.sin(x*.013-y*.017))*.035
    bases = [(.13,.17,.15), (.47,.48,.44), (.22,.20,.17), (.095,.10,.095),
             (.028,.030,.026), (.026,.060,.068), (.84,.085,.025), (.68,.49,.055),
             (.71,.64,.45), (.34,.36,.34), (.57,.54,.36), (.16,.18,.17),
             (.055,.063,.046), (.105,.115,.11), (.47,.48,.44)]
    pixels = np.ones((height, width, 4), dtype=np.float32)
    tank_red = np.zeros_like(x, dtype=bool)
    for center in tank_bands:
        tank_red |= abs(x/(width-1)-center) < .028
    for band, base in enumerate(bases):
        mask = y // 64 == band
        for channel, value in enumerate(base):
            oxide = [.34,.15,.055][channel]
            amount = .85 if band == 0 else .42 if band in (1,2,3,9,11,12,13,14) else .13
            colour = value*(1+grain*.10)*(1-rust*amount) + oxide*rust*amount
            colour += scratch*(.09 if band in (0,1,2,3,8,9,11,12,13,14) else .018) + dust
            if band == 1:
                red = [.46,.022,.009][channel]*(1+grain*.08)+scratch*.035
                colour = np.where(tank_red, red, colour)
            if band == 4:
                colour = value*(1+grain*.20) + dust*.35
            if band == 5:
                colour = value*(1+grain*.06) + scratch*.006 + dust*.20
            if band == 7:
                stripe = ((x+y*2)//48) % 2
                colour = np.where(stripe, base[channel], [.025,.028,.026][channel])
                colour = colour*(1-rust*.18)+scratch*.04+dust*.4
            pixels[:,:,channel][mask] = np.clip(colour[mask], .012, .88)
    image = bpy.data.images.new("tanker-local-wear-and-hazard-atlas", width=width, height=height)
    image.pixels.foreach_set(pixels.ravel()); image.pack()
    names = ["dark-worn-cab-paint", "light-dusty-tank-steel", "burnt-salvage",
             "oiled-drivetrain", "dark-weathered-rubber", "dirty-cab-glass",
             "hazard-red-controls", "black-yellow-hazard-paint", "bright-worn-flanges",
             "worn-steel-hubs", "dusty-headlight-glass", "dark-bumper-steel",
             "lower-cab-grime", "dark-boarding-steel-with-stripe-border", "tank-colour-port-caps"]
    # A complete plate texture keeps warning paint at its outer border.
    # The original native salvage faces and their affine fit stay unchanged.
    roof_x, roof_y = np.meshgrid(np.arange(512), np.arange(1024))
    roof_grain = rng.uniform(-1, 1, (1024, 512))
    roof_border = ((roof_x < 512*.07) | (roof_x > 512*.93) |
                   (roof_y < 1024*.045) | (roof_y > 1024*.955))
    roof_diagonal = ((roof_x + roof_y)//42) % 2
    roof_pixels = np.ones((1024, 512, 4), dtype=np.float32)
    for channel, steel in enumerate((.036, .044, .045)):
        middle = steel*(1+roof_grain*.08)
        warning = np.where(roof_diagonal, (.68,.49,.025)[channel], (.018,.022,.02)[channel])
        roof_pixels[:,:,channel] = np.where(roof_border, warning, middle)
    roof_image = bpy.data.images.new("tanker-dark-roof-and-warning-border", width=512, height=1024)
    roof_image.pixels.foreach_set(roof_pixels.ravel()); roof_image.pack()
    materials = []
    for band, name in enumerate(names):
        material = bpy.data.materials.new(name); material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Metallic"].default_value = 0 if band in (4,5,10) else .58
        shader.inputs["Roughness"].default_value = (.25 if band == 5 else .34 if band == 10
                                                  else .92 if band == 4 else .74)
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = roof_image if band == 13 else image
        material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
        materials.append(material)
    return materials


def closest_triangle_point(goal, a, b, c):
    """Closest point on an actual triangle, including its real edges."""
    ab, ac, ap = b-a, c-a, goal-a
    d1, d2 = ab.dot(ap), ac.dot(ap)
    if d1 <= 0 and d2 <= 0: return a
    bp = goal-b; d3, d4 = ab.dot(bp), ac.dot(bp)
    if d3 >= 0 and d4 <= d3: return b
    vc = d1*d4-d3*d2
    if vc <= 0 and d1 >= 0 and d3 <= 0: return a+ab*(d1/(d1-d3))
    cp = goal-c; d5, d6 = ab.dot(cp), ac.dot(cp)
    if d6 >= 0 and d5 <= d6: return c
    vb = d5*d2-d1*d6
    if vb <= 0 and d2 >= 0 and d6 <= 0: return a+ac*(d2/(d2-d6))
    va = d3*d6-d5*d4
    if va <= 0 and d4-d3 >= 0 and d5-d6 >= 0:
        return b+(c-b)*((d4-d3)/((d4-d3)+(d5-d6)))
    total = va+vb+vc
    return a+ab*(vb/total)+ac*(vc/total)


def valve_mount(tank_faces, tank_matrix, donor, side, z, vertical, longitudinal):
    """Put the genuine negative-X flange on an actual outer tank skin face."""
    goal = Vector((side*.94, 2.0, z)); candidates = []
    for index, (face, _) in enumerate(tank_faces):
        a,b,c = [Vector(point(tank_matrix, p)) for p in face]
        normal = (b-a).cross(c-a)
        if normal.length < 1e-9: continue
        normal.normalize()
        center = (a+b+c)/3
        if side*center.x < .65 or center.y < 1.5 or abs(normal.z) > .05 or abs(normal.x) < .7:
            continue
        if side*normal.x < 0: normal = -normal
        contact = closest_triangle_point(goal,a,b,c)
        candidates.append(((contact-goal).length,index,contact,normal))
    if not candidates: raise ValueError("Picked tank has no native outer skin mounting face")
    _,index,contact,normal = min(candidates,key=lambda row:row[0])
    up = Vector((0,1,0))-normal*normal.y; up.normalize()
    along = normal.cross(up)
    low,high = bounds(donor)
    port = Vector((low[0],(low[1]+high[1])/2,(low[2]+high[2])/2))
    # The actual extreme-X patch is centered at source Z zero; the separate
    # handwheel extends farther back and is not a mounting surface.
    patch = [p for face,_ in donor for p in face if abs(p[0]-low[0]) < 1e-6]
    port.y = (min(p[1] for p in patch)+max(p[1] for p in patch))/2
    port.z = (min(p[2] for p in patch)+max(p[2] for p in patch))/2
    # The source handwheel is in XY, while the pipe runs along X. Put the
    # complete pipe along the tank, with its negative-Z wheel facing outward.
    # Compensate the final assembly fit so the genuine .6 m wheel stays round.
    columns = [Vector((0,0,side))/longitudinal, Vector((0,1,0))/vertical,
               Vector((-side,0,0))*.46]
    location = contact-sum((columns[axis]*port[axis] for axis in range(3)),Vector())
    # A one-micrometre tangential offset keeps native vertices off a Float32
    # decimal-half boundary. The exact affine map remains in the manifest;
    # donor topology and the existing .002 m contact precision are unchanged.
    location.z += .000001/longitudinal
    contact.z += .000001/longitudinal
    matrix = [[columns[column][row] for column in range(3)]+[location[row]] for row in range(3)]
    matrix.append([0,0,0,1])
    return matrix,{"tankTriangle":index,"contact":list(contact),"normal":list(normal),"sourcePortX":low[0]}


def mesh_part(name, faces, matrix, materials, band):
    positions, triangles, bands, uvs = [], [], [], []
    low, high = fitted_bounds(faces, matrix)
    for face, source_name in faces:
        fitted = [point(matrix, p) for p in face]
        normal = (Vector(fitted[1]) - Vector(fitted[0])).cross(
            Vector(fitted[2]) - Vector(fitted[0]))
        normal.normalize()
        axes = ((0, 2) if abs(normal.y) > max(abs(normal.x), abs(normal.z))
                else (2, 1) if abs(normal.x) > abs(normal.z) else (0, 1))
        material_band = band
        if source_name.startswith("wheel"):
            material_band = 9 if source_name.endswith(":hub") else 4
        elif source_name.endswith(":glass"):
            material_band = 5
        elif source_name.endswith(":headlight"):
            material_band = 10
        elif name == "tanker-body" and (all(p[2] > 1.45 for p in face) or
                                       all(p[2] < -1.40 for p in face)) and sum(p[1] for p in face)/3 < .53:
            material_band = 7
        elif name == "tanker-body" and sum(p[2] for p in face)/3 > .35 and sum(p[1] for p in face)/3 < .72:
            material_band = 12
        elif band == 6:
            material_band = (6 if source_name.endswith(":control") else
                             8 if source_name.endswith(":flange") else 11)
        triangles.append(tuple(range(len(positions), len(positions) + 3)))
        bands.append(material_band)
        for p in fitted:
            # Blender Z-up converts back to game GLTF Y-up on export.
            positions.append((p[0], -p[2], p[1]))
            if name == "tanker-tank":
                u = (p[2]-low[2])/(high[2]-low[2])
                local_v = (p[1]-low[1])/(high[1]-low[1])
            elif name == "tanker-boarding-plate":
                u = (p[0]-low[0])/(high[0]-low[0])
                local_v = (p[2]-low[2])/(high[2]-low[2])
            else:
                u = (p[axes[0]]*.41) % 1
                local_v = (p[axes[1]]*.53) % 1
            v = local_v if name == "tanker-boarding-plate" else (material_band + .03 + local_v*.94)/SURFACE_BANDS
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
    tank_center_z = -1.700021
    tank_matrix = affine((4.15, 4.25, 4.4), (0, 1, tank_center_z), -math.pi/2)
    tank_low, tank_high = fitted_bounds(sources["tank"], tank_matrix)
    tank_bands = [(tank_center_z+offset-tank_low[2])/(tank_high[2]-tank_low[2])
                  for offset in (-.8, 0, .8)]
    materials = wear_atlas(seed, tank_bands)
    parts, lineage, native_builds = [], [], []

    def add(role, name, donor, matrix, band, subset=None):
        faces = sources[donor] if subset is None else subset
        obj = mesh_part(name, faces, matrix, materials, band)
        native_builds.append((obj, faces, matrix))
        pick = next(p for p in fit["sourcePicks"] if p["role"] == donor)
        parts.append({"role": role, "node": name})
        row = {"sourceKey": pick["catalogId"] + "/" + pick["path"], "node": name,
               "matrix": [matrix[r][c] for c in range(4) for r in range(4)]}
        if len(faces) != pick["triangles"]:
            row["trimmed"] = True
        lineage.append(row)
        return fitted_bounds(faces, matrix)

    body_low, body_high = add("body", "tanker-body", "body", affine((2, 2, 2.2)), 0)
    # Original tank brackets retain their reviewed contact with the native bed.
    tank_low, tank_high = add("tank", "tanker-tank", "tank", tank_matrix, 1)
    panel_faces = sources["armor-panel"]
    low, high = bounds(panel_faces)
    roof = [(face, name) for face, name in panel_faces
            if all(p[1] >= high[1] - .041 for p in face)]
    if not roof:
        raise ValueError("Approved container has no actual roof salvage")
    roof_low, roof_high = bounds(roof)
    plate_matrix = affine((3.75, .12, 2.15),
                          (0, tank_high[1]+.022-roof_low[1]*.12, tank_center_z))
    plate_low, plate_high = add("boarding-plate", "tanker-boarding-plate",
                               "armor-panel", plate_matrix, 13, roof)
    # The two .4 m glass housings and .08 m posts set the assembly's highest
    # point. Calculate the final fit before placing the complete native valves.
    target = fit["buildTargetsMetres"]
    vertical_fit = (target["height"]-.48)/plate_high[1]
    longitudinal_fit = target["length"]/(body_high[2]-body_low[2])
    mounts = []
    for index, offset in enumerate([-.8, 0, .8]):
        z = tank_center_z + offset
        side = -1 if index == 1 else 1
        matrix, mount = valve_mount(sources["tank"], tank_matrix, sources["valve"],
                                   side, z, vertical_fit, longitudinal_fit)
        mounts.append(mount)
        add("valve", "tanker-valve-" + str(index), "valve", matrix, 6)
        # Close both original ports with actual salvaged roof faces. The tank
        # colour prevents the two dark holes from competing with the wheel.
        for port_index, pipe_x in enumerate((-.5,.5)):
            cap = [[0,.03,0,pipe_x-roof_high[1]*.03],
                   [.92/(roof_high[0]-roof_low[0]),0,0,
                    .5-(roof_high[0]+roof_low[0])*.46/(roof_high[0]-roof_low[0])],
                   [0,0,.92/(roof_high[2]-roof_low[2]),
                    -(roof_high[2]+roof_low[2])*.46/(roof_high[2]-roof_low[2])],
                   [0,0,0,1]]
            add("port-cap", "tanker-valve-cap-"+str(index)+"-"+str(port_index),
                "armor-panel", multiply(matrix,cap), 14, roof)
    for side in (-1, 1):
        add("armor", "tanker-cab-door-" + str(side), "armor-door",
            affine((.38, 1.45, 1.35), (side*1.08, 1.22, 1.68)), 2)
    # A genuine roof salvage sheet follows the lower windscreen slope.
    windscreen = [[5.1,0,0,0], [0,0,.40,1.78],
                  [0,.10,-.176,2.52999], [0,0,0,1]]
    add("armor", "tanker-lower-windscreen-plate", "armor-panel", windscreen, 2, roof)
    add("armor", "tanker-rear-drivetrain", "armor-drivetrain",
        affine((1.65, 1, .30), (0, 1.03, -3.42)), 3)
    for side in (-1, 1):
        add("armor", "tanker-salvage-tyre-" + str(side), "armor-tyre",
            affine((.75, 1.3, 1.3), (side*1.280017, 1.270021, -1.289983)), 4)
        add("armor", "tanker-bed-skirt-" + str(side), "armor-panel",
            affine((.20, 1.8, 4.1), (side*1.29, .75, -1.29)), 2)
    # One native lamp material uses packed colour/emission strips. The dark
    # steel post never emits; only the dull amber glass lights when requested.
    lamp_material = bpy.data.materials.new("boarding-warning-lamp")
    lamp_material.use_nodes = True
    shader = lamp_material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .24
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Emission Color"].default_value = (1, .28, .025, 1)
    shader.inputs["Emission Strength"].default_value = 0
    for title, colours, socket in [
            ("tanker-beacon-glass-and-post", [(.075,.08,.075,1),(.18,.065,.004,1)], "Base Color"),
            ("tanker-beacon-glass-emission", [(0,0,0,1),(1,1,1,1)], "Emission Color")]:
        image = bpy.data.images.new(title,width=2,height=2)
        image.pixels.foreach_set([value for colour in colours for _ in range(2) for value in colour])
        image.pack()
        texture = lamp_material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = image; texture.interpolation = "Closest"
        lamp_material.node_tree.links.new(texture.outputs["Color"],shader.inputs[socket])
    for index, x in enumerate([plate_low[0]+.14, plate_high[0]-.14]):
        center_z = plate_high[2]-.12
        base = plate_high[1]-.005
        post_top = plate_high[1]+.08/vertical_fit
        glass_top = plate_high[1]+.48/vertical_fit
        vertices, triangles, regions = [], [], []
        def cylinder(bottom, top, radius, region):
            start = len(vertices)
            for height in (bottom,top):
                for segment in range(12):
                    angle = segment*math.tau/12
                    vertices.append((x+math.cos(angle)*radius,
                                     -center_z+math.sin(angle)*radius,height))
            vertices.extend([(x,-center_z,bottom),(x,-center_z,top)])
            for segment in range(12):
                following = (segment+1)%12
                triangles.extend([(start+segment,start+following,start+segment+12),
                                  (start+following,start+following+12,start+segment+12),
                                  (start+24,start+following,start+segment),
                                  (start+25,start+segment+12,start+following+12)])
                regions.extend([region]*4)
        cylinder(base,post_top,.055,.25)
        cylinder(post_top,glass_top,.12,.75)
        mesh = bpy.data.meshes.new("warning-lamp")
        mesh.from_pydata(vertices, [], triangles); mesh.update()
        mesh.materials.append(lamp_material)
        uv = mesh.uv_layers.new(name="beacon-glass-and-post")
        for polygon,region in zip(mesh.polygons,regions):
            for loop in polygon.loop_indices: uv.data[loop].uv = (.5,region)
        lamp = bpy.data.objects.new("tanker-warning-lamp-"+str(index),mesh)
        bpy.context.collection.objects.link(lamp)
        parts.append({"role":"warning-lamp","node":lamp.name})
    # Fit the complete rigid assembly together. The same affine map updates
    # every genuine donor and both authored lamps, preserving all contacts.
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    vertices = [vertex.co for obj in objects for vertex in obj.data.vertices]
    low = [min(v[axis] for v in vertices) for axis in range(3)]
    high = [max(v[axis] for v in vertices) for axis in range(3)]
    target = fit["buildTargetsMetres"]
    vertical = target["height"]/(high[2]-low[2])
    longitudinal = target["length"]/(high[1]-low[1])
    center_z = -(low[1]+high[1])/2
    final_matrix = affine((1,vertical,longitudinal),
                          (0,-low[2]*vertical,-center_z*longitudinal))
    native_objects = {obj for obj,_,_ in native_builds}
    for obj in objects:
        if obj in native_objects: continue
        for vertex in obj.data.vertices:
            fitted = point(final_matrix,(vertex.co.x,vertex.co.z,-vertex.co.y))
            vertex.co = (fitted[0],-fitted[2],fitted[1])
        obj.data.update()
    for (obj,faces,old),row in zip(native_builds,lineage):
        # Apply one composed affine map to original double-precision faces.
        # Re-transforming already rounded Blender vertices loses lineage at
        # decimal boundaries and gives avoidable repeated-rounding error.
        updated = multiply(final_matrix,old)
        row["matrix"] = [updated[axis][column] for column in range(4) for axis in range(4)]
        original_vertices = (p for face,_ in faces for p in face)
        for vertex,original in zip(obj.data.vertices,original_vertices):
            fitted = point(updated,original)
            vertex.co = (fitted[0],-fitted[2],fitted[1])
        obj.data.update()
    def final_bounds(low,high):
        return [list(point(final_matrix,low)),list(point(final_matrix,high))]
    body_low,body_high = final_bounds(body_low,body_high)
    tank_low,tank_high = final_bounds(tank_low,tank_high)
    plate_low,plate_high = final_bounds(plate_low,plate_high)
    for mount in mounts:
        mount["contact"] = list(point(final_matrix,mount["contact"]))
        normal = Vector((mount["normal"][0],mount["normal"][1]/vertical,
                         mount["normal"][2]/longitudinal)); normal.normalize()
        mount["normal"] = list(normal)
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
                "provenance": fit["sources"], "nativeValveMounts": mounts,
                "buildTargetsMetres": fit["buildTargetsMetres"],
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
