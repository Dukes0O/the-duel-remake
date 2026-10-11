"""P4-KITS: adapt Kyle's selected CC0 donors into metric circuit props.

Run only in an isolated lane after the Director grants a heavy slot:
blender -b --disable-autoexec --python-exit-code 1 --python tools/blender/p4-kits.py -- --root . --round 1
Originals stay in the external art-library. This recipe never downloads.
No track placement, collision, race behavior or source .blend files are shipped.
"""
import argparse
import hashlib
import json
import math
import sys
import zipfile
from datetime import date
from pathlib import Path

GROUPS = {
    "paddock": ["start-gantry", "pit-garage", "pit-wall", "grandstand"],
    "safety": ["armco", "concrete-wall", "catch-fence", "tyre-wall",
               "braking-board-150", "braking-board-100", "braking-board-50", "marshal-post"],
    "harbour": ["lantern-tower", "shopfront-a", "shopfront-b", "neon-sign",
                "lantern-string", "harbour-boat"],
    "forest": ["ski-lodge", "chairlift-tower", "chairlift-cable", "chairlift-chair",
               "wooden-dock", "autumn-tree", "autumn-tree-golden", "autumn-tree-copper"],
    "snow": ["snow-pine", "snow-ground", "snow-rock", "plough-bank",
             "gallery", "summit-hut", "observatory"],
    "characters": ["snowman", "yeti"],
}
DONORS = {
    "start-gantry": ("p4-gp", "gantry"),
    "pit-garage": ("p4-kenney-racing", "garage"),
    "pit-wall": ("p4-kenney-racing", "wall"),
    "grandstand": ("p4-kenney-racing", "grandstand"),
    "armco": ("p4-kenney-racing", "armco"),
    "concrete-wall": ("p4-barrier", "barrier"),
    "catch-fence": ("p4-gp", "fence"),
    "tyre-wall": ("p4-gp", "tyres"),
    "marshal-post": ("p4-gp", "marshal"),
    "braking-board-150": ("p4-gp", "board"),
    "braking-board-100": ("p4-gp", "board"),
    "braking-board-50": ("p4-gp", "board"),
    "lantern-tower": ("p4-city", "tower"),
    "shopfront-a": ("p4-city", "shopA"),
    "shopfront-b": ("p4-city", "shopB"),
    "neon-sign": ("p4-neon", "sign"),
    "lantern-string": ("p4-neon", "lanterns"),
    "harbour-boat": ("p4-boats", "boat"),
    "ski-lodge": ("p4-ski", "lodge"),
    "chairlift-tower": ("p4-ski", "tower"),
    "chairlift-cable": ("p4-ski", "cable"),
    "chairlift-chair": ("p4-ski", "chair"),
    "wooden-dock": ("p4-boats", "dock"),
    "autumn-tree": ("p4-nature", "tree"),
    "autumn-tree-golden": ("p4-nature", "tree"),
    "autumn-tree-copper": ("p4-nature", "tree"),
    "snow-pine": ("p4-holiday", "pine"),
    "snow-ground": ("p4-holiday", "ground"),
    "snow-rock": ("p4-holiday", "rock"),
    "plough-bank": ("p4-holiday", "bank"),
    "gallery": ("p4-ski", "gallery"),
    "summit-hut": ("p4-ski", "hut"),
    "observatory": ("p4-dome", "dome"),
    "snowman": ("p4-holiday", "snowman"),
    "yeti": ("p4-monsters", "yeti"),
}
# Blender coordinates are X right, Y depth, Z up. Export converts once to glTF.
DIMENSIONS = {
    "start-gantry": (17.5, .48, 6.5), "pit-garage": (7, 8, 5.2),
    "pit-wall": (4, .55, 1.05), "grandstand": (12, 8, 8),
    "armco": (4, .32, .85), "concrete-wall": (4, .72, 1.05),
    "catch-fence": (4, .38, 3.7), "tyre-wall": (4, .9, 1.0),
    "marshal-post": (2.5, 2.2, 3.2),
    "braking-board-150": (1.05, .12, 1.75), "braking-board-100": (1.05, .12, 1.75),
    "braking-board-50": (1.05, .12, 1.75),
    "lantern-tower": (8, 8, 32), "shopfront-a": (6, 5, 8.8),
    "shopfront-b": (8, 5, 6.5), "neon-sign": (2.4, .35, 1.2),
    "lantern-string": (8, .55, 1.1), "harbour-boat": (2.4, 5.2, 3.0),
    "ski-lodge": (16, 11, 7), "chairlift-tower": (4, 1.5, 10),
    "chairlift-cable": (12, .18, .22), "chairlift-chair": (2.6, 1.3, 2.6),
    "wooden-dock": (3, 7, 1.1), "autumn-tree": (6.5, 6.0, 9),
    "autumn-tree-golden": (4.8, 4.5, 10.5), "autumn-tree-copper": (6.0, 5.2, 8),
    "snow-pine": (4, 4, 8.5), "snow-ground": (8, 8, .28),
    "snow-rock": (4.4, 3.5, 2.4), "plough-bank": (5, 1.6, 1.2),
    "summit-hut": (7, 6, 4.4), "observatory": (12, 12, 11),
    "snowman": (1.55, 1.0, 2.1),
}
PALETTE = {
    "plaster": ((.63, .57, .46), .91, 0),
    "stone": ((.36, .38, .37), .94, 0),
    "dark": ((.065, .072, .075), .88, .05),
    "steel": ((.28, .32, .33), .54, .72),
    "rust": ((.36, .13, .075), .83, .15),
    "wood": ((.28, .17, .095), .89, 0),
    "glass": ((.06, .12, .15), .27, .18),
    "pine": ((.08, .16, .12), .94, 0),
    "leaf": ((.53, .24, .065), .92, 0),
    "snow": ((.84, .88, .9), .96, 0),
    "carrot": ((.72, .25, .035), .82, 0),
}


ROUND_THREE = {"start-gantry", "pit-garage", "gallery", "yeti"}

ROUND_TWO = {
    "start-gantry", "pit-garage", "armco", "concrete-wall", "tyre-wall",
    "lantern-tower", "shopfront-a", "shopfront-b", "lantern-string",
    "autumn-tree", "autumn-tree-golden", "autumn-tree-copper", "wooden-dock",
    "gallery", "observatory", "yeti",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe_member(base, relative):
    path = (base / relative).resolve()
    if path == base or base not in path.parents:
        raise ValueError("Source member leaves the declared library")
    return path


def verify_sources(root):
    catalog = json.loads((root / "tools/art/catalog.json").read_text(encoding="utf-8"))
    records = {row["id"]: row for row in catalog["assets"]
               if row["id"].startswith("p4-") and row["status"] == "selected"}
    for identifier in sorted({source for source, key in DONORS.values()}):
        row = records[identifier]
        if row["license"] != "CC0-1.0":
            raise ValueError("Only selected, verified CC0 donors belong in this recipe")
        entry = row["p4Kits"]
        base = Path(entry["library"]).resolve()
        allowed = Path("C:/Users/kyleb/dev/art-library").resolve()
        if allowed not in base.parents:
            raise ValueError("Originals must stay in the designated external art library")
        for file in entry["files"]:
            original = safe_member(base, file["path"])
            if original.stat().st_size != file["bytes"] or digest(original) != file["sha256"]:
                raise ValueError("Original donor changed: " + str(original))
        archive = base / "source.zip"
        if archive.exists():
            with zipfile.ZipFile(archive) as bundle:
                for file in entry["files"]:
                    if file["path"].startswith("unpacked/"):
                        member = file["path"][len("unpacked/"):]
                        if bundle.read(member) != safe_member(base, file["path"]).read_bytes():
                            raise ValueError("Unpacked original differs from its archive: " + member)
    return records


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--round", type=int, choices=[1, 2, 3], required=True)
    parser.add_argument("--only", help="Comma-separated prop ids for a bounded repair")
    parser.add_argument("--skip-renders", action="store_true")
    parser.add_argument("--render-only", action="store_true")
    parser.add_argument("--paths-only", action="store_true")
    parser.add_argument("--inspect-only", action="store_true", help="Read selected donors; do not export or render")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    args.root = args.root.resolve()
    return args


def main():
    global bpy, bmesh, Vector, Matrix, Quaternion, np, RECORDS, ROOT, MATERIALS, SAMPLED_IMAGES
    args = arguments()
    ROOT = args.root
    out = ROOT / "public/assets/models/circuits/kits"
    evidence = ROOT / ".evidence" / date.today().isoformat() / "P4-KITS" / ("round-" + str(args.round))
    if args.paths_only:
        print(json.dumps({"runtime": str(out), "evidence": str(evidence)}))
        return
    RECORDS = verify_sources(ROOT)
    import bpy
    import bmesh
    import numpy as np
    from mathutils import Vector, Matrix, Quaternion
    # Modules imported in main remain explicit globals for the recipe helpers.
    globals().update(bpy=bpy, bmesh=bmesh, Vector=Vector, Matrix=Matrix, Quaternion=Quaternion, np=np)
    out.mkdir(parents=True, exist_ok=True)
    evidence.mkdir(parents=True, exist_ok=True)
    selection = set(args.only.split(",")) if args.only else (ROUND_THREE if args.round == 3 else ROUND_TWO if args.round == 2 else set(DONORS))
    if not selection <= set(DONORS):
        raise ValueError("Unknown kit piece")
    if args.inspect_only:
        for identifier in sorted(selection):
            reset()
            MATERIALS, SAMPLED_IMAGES = {}, {}
            inspect_donor(identifier)
        return
    if args.round == 3 and not args.render_only and not selection <= ROUND_THREE:
        raise ValueError("Passed round-two pieces must remain byte-exact")
    if args.round >= 2 and not args.render_only and not selection <= ROUND_TWO:
        raise ValueError("Passed round-one pieces must remain byte-exact")
    if args.render_only:
        if args.skip_renders:
            raise ValueError("Choose export-only or render-only, not both")
        for group, ids in GROUPS.items():
            if not selection.intersection(ids):
                continue
            for identifier in ids:
                if not (out / (identifier + ".glb")).is_file():
                    raise ValueError("Complete exported group required before rendering")
            render_group(group, ids, out, evidence, original=True)
            render_group(group, ids, out, evidence, original=False)
        return
    previous = json.loads((out / "manifest.json").read_text()) if (out / "manifest.json").exists() else {}
    pieces = {piece["id"]: piece for piece in previous.get("pieces", [])}
    for group, ids in GROUPS.items():
        for identifier in ids:
            if identifier not in selection:
                continue
            reset()
            MATERIALS, SAMPLED_IMAGES = {}, {}
            print("PREPARING " + identifier, flush=True)
            sources = build_piece(identifier)
            high = out / (identifier + ".glb")
            low = out / (identifier + "-lod.glb")
            export(high, identifier == "yeti")
            high_stats = stats()
            simplify(identifier)
            export(low, identifier == "yeti")
            low_stats = stats()
            pieces[identifier] = {
                "id": identifier, "group": group, "sources": sorted(sources),
                "high": high.name, "low": low.name,
                "highTriangles": high_stats["triangles"], "lowTriangles": low_stats["triangles"],
                "size": high_stats["size"], "bytes": high.stat().st_size + low.stat().st_size,
                "credits": [{"author": RECORDS[source]["author"],
                             "sourcePage": RECORDS[source]["sourcePage"], "license": "CC0-1.0"}
                            for source in sorted(sources)],
            }
            print("PREPARED " + identifier + " " + json.dumps(pieces[identifier]), flush=True)
    manifest = {
        "version": 1, "units": "metres", "up": "Y", "card": "P4-KITS",
        "recipe": "tools/blender/p4-kits.py", "round": args.round,
        "pieces": [pieces[identifier] for ids in GROUPS.values() for identifier in ids if identifier in pieces],
        "use": "Track cards place these local assets and choose LOD distance. No runtime network access.",
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    if not args.skip_renders:
        for group, ids in GROUPS.items():
            if not selection.intersection(ids):
                continue
            render_group(group, ids, out, evidence, original=True)
            render_group(group, ids, out, evidence, original=False)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30


def meshes():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def remove_editor_handles(imported):
    # Blender's importer creates editor-only bone handles. They are not donor
    # geometry and must never affect the metric fit or enter the runtime GLB.
    handles = {bone.custom_shape for obj in imported if obj.type == "ARMATURE"
               for bone in obj.pose.bones if bone.custom_shape}
    for obj in imported:
        if obj.type == "ARMATURE":
            for bone in obj.pose.bones:
                bone.custom_shape = None
    imported = [obj for obj in imported if obj not in handles]
    for handle in handles:
        bpy.data.objects.remove(handle, do_unlink=True)
    return imported


def donor(source, key):
    row = RECORDS[source]["p4Kits"]
    path = safe_member(Path(row["library"]).resolve(), row["inputs"][key])
    before = set(bpy.context.scene.objects)
    if path.suffix.lower() in [".glb", ".gltf"]:
        bpy.ops.import_scene.gltf(filepath=str(path), import_pack_images=True)
    elif path.suffix.lower() == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path), use_anim=False)
    else:
        raise ValueError("Unsupported donor format")
    imported = list(set(bpy.context.scene.objects) - before)
    imported = remove_editor_handles(imported)
    kept = []
    for obj in imported:
        if obj.type in ["CAMERA", "LIGHT"]:
            bpy.data.objects.remove(obj, do_unlink=True)
        else:
            kept.append(obj)
    return kept


def inspect_donor(identifier):
    """Bounded source inspection for a planned adaptation; no file mutation."""
    source, key = DONORS[identifier]
    objects = donor(source, key)
    report = {"id": identifier, "objects": [], "bones": []}
    for obj in objects:
        if obj.type == "ARMATURE":
            report["bones"] = [{"name": bone.name, "head": list(bone.head_local),
                                "tail": list(bone.tail_local)} for bone in obj.data.bones]
        if obj.type != "MESH":
            continue
        low, high = bounds([obj])
        obj.data.calc_loop_triangles()
        colors = {}
        for polygon in obj.data.polygons:
            color = tuple(round(float(c), 2) for c in original_color(obj, polygon))
            row = colors.setdefault(str(color), {"faces": 0, "min": [1e9] * 3, "max": [-1e9] * 3})
            row["faces"] += 1
            for index in polygon.vertices:
                point = obj.matrix_world @ obj.data.vertices[index].co
                for axis in range(3):
                    row["min"][axis] = min(row["min"][axis], round(point[axis], 4))
                    row["max"][axis] = max(row["max"][axis], round(point[axis], 4))
        report["objects"].append({"name": obj.name, "vertices": len(obj.data.vertices),
            "triangles": len(obj.data.loop_triangles), "min": list(low), "max": list(high),
            "materials": [mat.name for mat in obj.data.materials if mat],
            "colors": dict(sorted(colors.items(), key=lambda item: -item[1]["faces"])[:24]),
            "groups": [group.name for group in obj.vertex_groups]})
    print("DONOR " + json.dumps(report), flush=True)


def bounds(objects):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH"
              for corner in obj.bound_box]
    if not points:
        raise ValueError("A donor must contain actual mesh geometry")
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    return low, high


def flatten(objects):
    mesh_objects = [obj for obj in objects if obj.type == "MESH"]
    for obj in objects:
        if obj.type != "MESH":
            continue
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        obj.data = obj.data.copy()
        obj.data.transform(world)
    for obj in list(objects):
        if obj.type == "EMPTY" and not obj.children:
            bpy.data.objects.remove(obj, do_unlink=True)
    return mesh_objects


def fit(objects, size=None):
    low, high = bounds(objects)
    current = high - low
    scale = Vector(tuple(size[i] / max(current[i], .00001) for i in range(3))) if size else Vector((1, 1, 1))
    center = Vector(((low.x + high.x) * .5, (low.y + high.y) * .5, low.z))
    transform = Matrix.Diagonal((*scale, 1)) @ Matrix.Translation(-center)
    for obj in objects:
        if obj.type == "MESH":
            obj.data.transform(transform @ obj.matrix_world)
            obj.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.update()


def move(objects, offset):
    for obj in objects:
        obj.data.transform(Matrix.Translation(Vector(offset)))


def origin_at_center(obj):
    low, high = bounds([obj])
    center = (low + high) * .5
    obj.data.transform(Matrix.Translation(-center))
    obj.location = center


def separate_loose(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
    bm.to_mesh(obj.data)
    bm.free()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return list(bpy.context.selected_objects)


def merge(objects, name):
    objects = [obj for obj in objects if obj.type == "MESH"]
    if not objects:
        raise ValueError("Required donor part is missing: " + name)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = name
    return result


def material(key, emission=0):
    cache_key = key + "-" + str(emission)
    if cache_key in MATERIALS:
        return MATERIALS[cache_key]
    color, roughness, metal = PALETTE[key]
    result = bpy.data.materials.new("P4 worn " + cache_key)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Base Color"].default_value = (*color, 1)
    if emission:
        shader.inputs["Emission Color"].default_value = (1, .57, .2, 1)
        shader.inputs["Emission Strength"].default_value = emission
    # Small deterministic tiled surface grain is baked into each exported image.
    # No procedural Blender-only shader is relied on at runtime.
    n = 128
    y, x = np.mgrid[0:n, 0:n].astype(float) / n
    phase = int(hashlib.sha256(key.encode()).hexdigest()[:8], 16) / 0xffffffff
    fine = np.sin(x * 155.0 + y * 289.0 + phase * 9) * .025
    dirt = (np.cos(x * math.tau * 3 + phase) * np.sin(y * math.tau * 5) + 1) * .055
    grain = .9 + fine - dirt
    if key == "wood":
        grain += np.sin(x * math.tau * 24 + np.sin(y * math.tau) * .7) * .08
    if key in ["snow", "glass"]:
        grain = .98 + fine * .2
    pixels = np.ones((n, n, 4), dtype=np.float32)
    for channel in range(3):
        pixels[:, :, channel] = np.clip(color[channel] * grain, 0, 1)
    image = bpy.data.images.new("P4 " + key + " baked grain", width=n, height=n, alpha=False)
    image.pixels.foreach_set(pixels.reshape(-1))
    image.pack()
    texture = result.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.extension = "REPEAT"
    result.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    MATERIALS[cache_key] = result
    return result


def held_material(name, color, roughness=.86, metal=0, emission=0, pattern="grain"):
    """Baked round-two surfaces; existing passed-piece materials are untouched."""
    cache = "round-two-" + name
    if cache in MATERIALS:
        return MATERIALS[cache]
    result = bpy.data.materials.new(cache)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Base Color"].default_value = (*color, 1)
    n = 128
    y, x = np.mgrid[0:n, 0:n].astype(float) / n
    phase = int(hashlib.sha256(name.encode()).hexdigest()[:8], 16) / 0xffffffff
    grain = .89 + .035 * np.sin(x * 251 + y * 157 + phase * 31)
    grain -= .13 * (np.sin(x * 21 + phase * 7) * np.cos(y * 17) + 1) / 2
    grain -= .07 * (np.cos(x * 71 + np.sin(y * 9) * 3) > .88)
    if pattern == "wood":
        grain += .10 * np.sin(x * 163 + np.sin(y * 17) * 1.2)
    if pattern == "leaf":
        grain = .83 + .16 * np.sin(x * 79 + y * 107) * np.sin(x * 137 - y * 61)
        grain += .12 * (np.sin(x * 59 + y * 31) > .8)
    if pattern == "stripe":
        grain *= np.where((x * 8).astype(int) % 2 == 0, 1, .36)
    if pattern == "paper":
        grain = .90 + .06 * np.sin(x * 251 + y * 173)
        grain -= .10 * (np.cos(x * math.tau * 12) > .94)
    pixels = np.ones((n, n, 4), dtype=np.float32)
    pixels[:, :, :3] = np.clip(np.array(color)[None, None, :] * grain[:, :, None], 0, 1)
    image = bpy.data.images.new(cache + " baked surface", width=n, height=n, alpha=False)
    image.pixels.foreach_set(pixels.reshape(-1)); image.pack()
    texture = result.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image; texture.extension = "REPEAT"
    result.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    if emission:
        result.node_tree.links.new(texture.outputs["Color"], shader.inputs["Emission Color"])
        shader.inputs["Emission Strength"].default_value = emission
    MATERIALS[cache] = result
    return result


def finish_held(obj, assigned, grain_scale=1.7):
    """Keep material boundaries and bake grime into an exported vertex channel."""
    if not isinstance(assigned, list):
        assigned = [assigned] * len(obj.data.polygons)
    unique = list(dict.fromkeys(assigned))
    obj.data.materials.clear()
    for mat in unique:
        obj.data.materials.append(mat)
    # Adding a corner layer can reallocate Blender's mesh CustomData. Create
    # both layers first, then acquire their live RNA references for writing.
    if not obj.data.uv_layers.active:
        obj.data.uv_layers.new(name="Baked surface")
    if not obj.data.color_attributes.get("Wear"):
        obj.data.color_attributes.new(name="Wear", type="BYTE_COLOR", domain="CORNER")
    uv = obj.data.uv_layers.active
    wear = obj.data.color_attributes["Wear"]
    obj.data.color_attributes.active_color = wear
    low, high = bounds([obj]); span = max(.1, high.z - low.z)
    for polygon, mat in zip(obj.data.polygons, assigned):
        polygon.material_index = unique.index(mat)
        axis = max(range(3), key=lambda i: abs(polygon.normal[i]))
        plane = [i for i in range(3) if i != axis]
        for loop in polygon.loop_indices:
            point = obj.data.vertices[obj.data.loops[loop].vertex_index].co
            uv.data[loop].uv = (point[plane[0]] / grain_scale, point[plane[1]] / grain_scale)
            height = max(0, min(1, (point.z - low.z) / span))
            dirt = .68 + .29 * min(1, height * 5)
            dirt += .03 * math.sin(point.x * 19 + point.y * 23 + point.z * 29)
            wear.data[loop].color = (dirt, dirt * .995, dirt * .97, 1)
    obj.data.update()


def detail_block(name, size, center, mat, distant=True):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object; obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    finish_held(obj, mat)
    obj["p4PreserveSurface"] = True
    if not distant:
        obj["p4LodOmit"] = True
    return obj


def leaf_envelope(identifier, lobe_index, centre, radii, count, colors):
    """Closed broad leaves break the donor lobe silhouette without alpha cards."""
    vertices, faces, assigned = [], [], []
    palette = [held_material(identifier + "-leaf-cluster-" + str(index), color, .98, pattern="leaf")
               for index, color in enumerate(colors)]
    for index in range(count):
        vertical = 1 - 2 * (index + .5) / count
        angle = index * math.pi * (3 - math.sqrt(5)) + lobe_index * .71
        radial = math.sqrt(max(0, 1 - vertical * vertical))
        normal = Vector((math.cos(angle) * radial, math.sin(angle) * radial, vertical))
        depth = .78 + .20 * ((index * 37) % 101) / 100
        point = centre + Vector((normal.x * radii.x, normal.y * radii.y, normal.z * radii.z)) * depth
        across = normal.cross(Vector((0, 0, 1)))
        if across.length < .001:
            across = Vector((1, 0, 0))
        across.normalize()
        along = normal.cross(across).normalized()
        twist = .65 * math.sin(index * 1.73 + lobe_index)
        axis_a = across * math.cos(twist) + along * math.sin(twist)
        axis_b = -across * math.sin(twist) + along * math.cos(twist)
        length, width = .46 + .17 * (index % 5) / 4, .30 + .13 * (index % 7) / 6
        base = len(vertices)
        vertices.extend([point + axis_a * length * .5, point + axis_b * width * .5,
                         point - axis_a * length * .5, point - axis_b * width * .5,
                         point + normal * .012, point - normal * .012])
        for corner in range(4):
            following = (corner + 1) % 4
            faces.extend([(base + corner, base + following, base + 4),
                          (base + following, base + corner, base + 5)])
            assigned.extend([palette[(index + lobe_index) % 3], palette[(index + lobe_index + 1) % 3]])
    mesh = bpy.data.meshes.new(identifier + " broad leaf clusters")
    mesh.from_pydata(vertices, [], faces); mesh.update()
    obj = bpy.data.objects.new(identifier + "-leaf-envelope-" + str(lobe_index + 1), mesh)
    bpy.context.collection.objects.link(obj)
    finish_held(obj, assigned, grain_scale=.18)
    obj["p4WholeLeafVertices"] = 6
    return obj


def prepare_tree(objects, identifier):
    """Three ordinary assets with distinct branch/canopy proportions."""
    parts = []
    for obj in objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True); bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.separate(type="MATERIAL"); bpy.ops.object.mode_set(mode="OBJECT")
        parts.extend(list(bpy.context.selected_objects))
    trunk, foliage = [], []
    for obj in parts:
        used = {obj.data.materials[face.material_index].name.lower() for face in obj.data.polygons}
        if any("wood" in name for name in used):
            trunk.append(obj)
        else:
            foliage.extend(separate_loose(obj))
    if not trunk or len(foliage) < 2:
        raise ValueError("Inspected donor trunk and distinct canopy lobes are required")
    parts = trunk + foliage
    fit(parts)
    low, high = bounds(parts)
    height = {"autumn-tree": 9, "autumn-tree-golden": 10.5, "autumn-tree-copper": 8}[identifier]
    scale = height / (high.z - low.z)
    spread = {"autumn-tree": 1.12, "autumn-tree-golden": .76, "autumn-tree-copper": 1.25}[identifier]
    transform = Matrix.Diagonal((scale * spread, scale * spread, scale, 1))
    for obj in parts:
        obj.data.transform(transform)
    wood = held_material("tree-weathered-bark", (.25, .21, .16), .98, pattern="wood")
    for obj in trunk:
        obj.name = identifier + "-trunk-and-branches"
        finish_held(obj, wood, grain_scale=.32); obj["p4LodRatio"] = .58
    colors = {"autumn-tree": [(.50, .20, .055), (.69, .33, .075), (.37, .14, .045)],
              "autumn-tree-golden": [(.74, .53, .10), (.59, .40, .075), (.82, .64, .19)],
              "autumn-tree-copper": [(.51, .28, .12), (.34, .20, .09), (.67, .39, .14)]}[identifier]
    foliage.sort(key=lambda obj: sum(bounds([obj])[i].z for i in [0, 1]))
    for index, obj in enumerate(foliage):
        low, high = bounds([obj]); centre = (low + high) * .5
        envelope = (high - low) * .5
        shrink = {"autumn-tree": .58, "autumn-tree-golden": .52, "autumn-tree-copper": .48}[identifier]
        for vertex in obj.data.vertices:
            vertex.co = centre + (vertex.co - centre) * shrink
        obj.name = identifier + "-canopy-lobe-" + str(index + 1)
        leaf = held_material(identifier + "-leaves-" + str(index % 3), colors[index % 3], .98, pattern="leaf")
        finish_held(obj, leaf, grain_scale=.36)
        obj["p4LodRatio"] = .58
        leaf_envelope(identifier, index, centre, envelope, 720 // len(foliage), colors)
    fit(meshes())
    return meshes()


def prepare_lantern_string(objects):
    """Spread original lamps along a cable without flattening the paper globes."""
    parts = []
    for obj in objects:
        parts.extend(separate_loose(obj))
    retained = []
    for obj in parts:
        low, high = bounds([obj]); size = high - low; centre = (low + high) * .5
        name = obj.data.materials[obj.data.polygons[0].material_index].name.lower()
        # Ground-support poles belong to the original freestanding display.
        if size.z > 1.25 and size.x < .16 and size.y < .16:
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        if size.x > 1.8:
            for vertex in obj.data.vertices:
                vertex.co.x *= 8 / 2.76
        else:
            target = Vector((centre.x * 8 / 2.76, centre.y, centre.z))
            for vertex in obj.data.vertices:
                vertex.co = target + (vertex.co - centre) * 1.10
        if name in ["amber", "paint", "neon"]:
            amber = name == "amber"
            mat = held_material("lantern-amber" if amber else "lantern-red",
                                (.95, .43, .055) if amber else (.87, .075, .025),
                                .76, emission=2.8, pattern="paper")
            obj["p4LodRatio"] = .58
        else:
            mat = held_material("lantern-wire-and-ribs", (.065, .06, .052), .85, .12)
            obj["p4LodRatio"] = .55
        finish_held(obj, mat, grain_scale=.35)
        obj.name = "lantern-string-" + name
        retained.append(obj)
    if not retained:
        raise ValueError("Original lanterns are missing")
    fit(retained)
    return retained


def prepare_harbour_building(objects, identifier):
    wall_colors = {"shopfront-a": (.25, .46, .42), "shopfront-b": (.61, .31, .20),
                   "lantern-tower": (.49, .43, .30)}
    wall = held_material(identifier + "-faded-plaster", wall_colors[identifier], .95)
    trim = held_material("harbour-worn-cream-trim", (.73, .68, .54), .94)
    roof = held_material("harbour-weathered-roof", (.24, .27, .26), .91, .08)
    dark = held_material("harbour-unlit-pane", (.055, .071, .069), .7)
    amber = held_material("harbour-warm-amber-pane", (.94, .48, .16), .57, emission=1.65)
    cream = held_material("harbour-warm-cream-pane", (.96, .76, .42), .57, emission=1.2)
    height = DIMENSIONS[identifier][2]
    for obj in objects:
        assigned = []
        for polygon in obj.data.polygons:
            color = original_color(obj, polygon)
            centre = polygon.center
            if max(color) < .35 and .18 * height < centre.z < .88 * height:
                pane = (round(centre.x / 1.6) + round(centre.y / 1.6) + round(centre.z / 1.7)) % 5
                mat = dark if pane == 0 else amber if pane < 3 else cream
            elif max(color) < .35:
                mat = dark
            elif abs(polygon.normal.z) > .65:
                mat = roof if polygon.normal.z > 0 else dark
            elif min(color) > .68:
                mat = trim
            else:
                mat = wall
            assigned.append(mat)
        finish_held(obj, assigned, grain_scale=1.8)
        obj.name = identifier + "-original-structure"
        if identifier == "lantern-tower":
            obj["p4LodRatio"] = .65
        else:
            obj["p4PlanarLod"] = True
    if identifier == "lantern-tower":
        for side in [-1, 1]:
            detail_block("tower-crown-lit-front-back", (6.5, .06, 1.45), (0, side * 4.04, 30.25), amber)
            detail_block("tower-crown-lit-sides", (.06, 6.5, 1.45), (side * 4.04, 0, 30.25), cream)
            for offset in [-2.1, 0, 2.1]:
                detail_block("tower-crown-mullion", (.15, .10, 1.55), (offset, side * 4.10, 30.25), dark)
                detail_block("tower-crown-side-mullion", (.10, .15, 1.55), (side * 4.10, offset, 30.25), dark)
        canopy = flatten(donor("p4-city", "awning"))
        fit(canopy, (9.1, 9.1, 1.05))
        for obj in canopy:
            finish_held(obj, roof); obj["p4PlanarLod"] = True
        move(canopy, (0, 0, 31.6))
        return meshes()
    width = 4.6 if identifier == "shopfront-a" else 6.3
    awning = flatten(donor("p4-city", "awning"))
    fit(awning, (width, 1.25, .48))
    canvas = held_material(identifier + "-striped-awning", (.69, .57, .36), .96, pattern="stripe")
    for obj in awning:
        finish_held(obj, canvas, grain_scale=width); obj["p4PlanarLod"] = True
    move(awning, (0, -2.65, 2.35))
    detail_block("shop-recessed-entry", (1.2, .04, 2.05), (0, -2.525, 1.045), dark)
    for side in [-1, 1]:
        detail_block("shop-door-jamb", (.12, .20, 2.15), (side * .66, -2.59, 1.075), trim)
        shutter = held_material(identifier + "-shutter-wood", (.21, .32, .28), .94, pattern="wood")
        detail_block("shop-shutter", (.83, .10, 1.65), (side * 1.63, -2.59, 1.18), shutter)
        for index in range(8):
            detail_block("shop-shutter-louvre", (.79, .065, .065),
                         (side * 1.63, -2.68, .48 + index * .19), trim, distant=index % 2 == 0)
    label("PORT SUPPLY" if identifier.endswith("a") else "CAFE", (0, -2.70, 3.04), .35, "shop-sign")
    return meshes()


def near_edge_detail(obj, width=.035):
    """Real near-view edge bevel; the distant mesh retains the structural shell."""
    source = obj.data.copy(); source.name = obj.name + " distant structural shell"
    obj["p4LodMesh"] = source.name
    bpy.context.view_layer.objects.active = obj
    bevel = obj.modifiers.new("Worn concrete edges", "BEVEL")
    bevel.width = width; bevel.segments = 2; bevel.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=bevel.name)


def prepare_observatory(objects):
    for obj in objects:
        names = " ".join(mat.name.lower() for mat in obj.data.materials if mat)
        if "stone" in names or "blue" in names:
            mat = held_material("observatory-dark-base", (.26, .29, .28), .89, .12)
        elif "chrome" in names:
            mat = held_material("observatory-silver-ribs", (.68, .72, .71), .56, .55)
        else:
            mat = held_material("observatory-white-cover", (.82, .83, .78), .72, .25)
        bm = bmesh.new(); bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.0002)
        bmesh.ops.dissolve_limit(bm, angle_limit=.002, verts=list(bm.verts),
                                 edges=list(bm.edges), delimit=set())
        bm.to_mesh(obj.data); bm.free(); obj.data.update()
        finish_held(obj, mat, grain_scale=2.0)
        obj.name = "observatory-" + ("ribs" if "chrome" in names else "base" if "stone" in names or "blue" in names else "cover")
        obj["p4DomeLod"] = True
    return objects


def prepare_tyres(objects):
    # Each of the six donor columns contains three complete authored tyres.
    if len(objects) != 1:
        raise ValueError("Selected tyre donor must contain its single original row mesh")
    original = objects[0]
    low, high = bounds(objects)
    width, layer_height = (high.x - low.x) / 6, (high.z - low.z) / 3
    columns = [[[] for _ in range(3)] for _ in range(6)]
    for face in original.data.polygons:
        points = [original.data.vertices[index].co for index in face.vertices]
        centre = sum((point for point in points), Vector()) / len(points)
        column = max(0, min(5, int((centre.x - low.x) / width)))
        left, right = low.x + column * width, low.x + (column + 1) * width
        if any(point.x < left - .0002 or point.x > right + .0002 for point in points):
            raise ValueError("A donor face crosses the measured tyre-column boundary")
        if max(point.z for point in points) - min(point.z for point in points) < .00001:
            level = round((centre.z - low.z) / layer_height)
            layer = level - 1 if face.normal.z > 0 else level
        else:
            layer = int((centre.z - low.z) / layer_height)
        if not 0 <= layer < 3:
            raise ValueError("A donor tyre face does not belong to a measured layer")
        columns[column][layer].append(face.index)
    if any(len(layer) != 128 for column in columns for layer in column):
        raise ValueError("Each original tyre must retain its 128 donor triangles")
    rubber = held_material("tyre-wall-scuffed-rubber", (.095, .094, .086), .98)
    for column in range(5):
        for layer in range(3):
            obj = original.copy(); obj.data = original.data.copy()
            bpy.context.collection.objects.link(obj)
            bm = bmesh.new(); bm.from_mesh(obj.data); bm.faces.ensure_lookup_table()
            retained = set(columns[column][layer])
            bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.index not in retained], context="FACES")
            bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if not vertex.link_faces], context="VERTS")
            # The donor exports split face corners. Connect coincident vertices
            # within this one tyre so the bevel can see its sidewall edges.
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            bm.to_mesh(obj.data); bm.free(); obj.data.update()
            fit([obj], (.79, .79, .30))
            move([obj], ((column - 2) * .80, 0, layer * .35))
            obj.name = "tyre-stack-" + str(column + 1) + "-layer-" + str(layer + 1)
            bpy.context.view_layer.objects.active = obj
            bevel = obj.modifiers.new("Rounded rubber sidewalls", "BEVEL")
            bevel.width = .018; bevel.segments = 2
            bevel.limit_method = "ANGLE"; bevel.angle_limit = .5
            bpy.ops.object.modifier_apply(modifier=bevel.name)
            finish_held(obj, rubber, grain_scale=.45)
            obj["p4RadialLod"] = 12
            obj["p4RadialRingCount"] = 6
    bpy.data.objects.remove(original, do_unlink=True)
    fit(meshes(), (4, .8, 1))
    return meshes()


def reduce_radial_shell(obj, sides):
    """Reduce angular samples in the fitted ellipse's original radial space."""
    low, high = bounds([obj]); centre = (low + high) * .5
    half = (high - low) * .5
    bm = bmesh.new(); bm.from_mesh(obj.data)
    radii = []
    for vertex in bm.verts:
        delta = vertex.co - centre
        radii.append(math.hypot(delta.x / half.x, delta.y / half.y))
    rings = []
    for radius in sorted(radii):
        if not rings or radius - rings[-1][0] > .003:
            rings.append([radius])
        else:
            rings[-1].append(radius)
    canonical = [sum(ring) / len(ring) for ring in rings]
    expected = int(obj.get("p4RadialRingCount", 2))
    if len(canonical) != expected:
        raise ValueError(f"Tyre must preserve all {expected} measured radial rings; found {len(canonical)}")
    for vertex, radius in zip(bm.verts, radii):
        delta = vertex.co - centre
        angle = round(math.atan2(delta.y / half.y, delta.x / half.x) * sides / math.tau) * math.tau / sides
        radius = min(canonical, key=lambda value: abs(value - radius))
        vertex.co.x = centre.x + radius * half.x * math.cos(angle)
        vertex.co.y = centre.y + radius * half.y * math.sin(angle)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.0002)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=.00001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data); bm.free(); obj.data.update()


def prepare_garage(objects):
    concrete = held_material("garage-concrete", (.59, .58, .52))
    teal = held_material("garage-faded-teal", (.16, .36, .35))
    cream = held_material("garage-cream", (.73, .68, .53))
    dark = held_material("garage-interior", (.075, .078, .075))
    for obj in objects:
        assigned = []
        for polygon in obj.data.polygons:
            centre = polygon.center
            if 2.7 < centre.z < 3.25 and abs(polygon.normal.z) < .6:
                mat = teal
            elif polygon.normal.z > .5:
                mat = concrete
            else:
                mat = concrete if centre.z < 1.0 else cream
            assigned.append(mat)
        finish_held(obj, assigned)
        obj["p4PlanarLod"] = True
    # Open the donor's front bays; retain its columns, roof and side walls.
    for obj in objects:
        bm = bmesh.new(); bm.from_mesh(obj.data); bm.normal_update()
        covered = [face for face in bm.faces
                   if abs(face.calc_center_median().x) < 2.72 and
                   face.calc_center_median().y < -3.55 and
                   .18 < face.calc_center_median().z < 3.10]
        bmesh.ops.delete(bm, geom=covered, context="FACES")
        bm.to_mesh(obj.data); bm.free(); obj.data.update()
    # A dark back and ceiling, seven metres inside the actual open bay.
    detail_block("garage-dark-rear", (5.85, .10, 2.9), (0, 3.25, 1.48), dark)
    detail_block("garage-dark-ceiling", (5.85, 7.5, .08), (0, 0, 3.12), dark)
    floor = held_material("garage-oil-stained-floor", (.21, .23, .21), .98)
    detail_block("garage-worn-floor", (6.9, 7.8, .055), (0, 0, .03), floor)
    slat = held_material("garage-roller-grey", (.33, .39, .39), .73, .3)
    detail_block("garage-half-raised-roller", (5.80, .10, 1.45), (0, -3.87, 2.36), slat)
    for index in range(10):
        detail_block("garage-front-door-slat-" + str(index), (5.74, .07, .06),
                     (0, -3.94, 1.70 + index * .145), dark)
    for side in [-1, 1]:
        detail_block("garage-side-stripe", (.045, 7.6, .46), (side * 3.48, 0, 2.90), teal)
        detail_block("garage-front-team-stripe", (.57, .08, .46), (side * 3.12, -3.98, 2.90), teal)
        for index in range(4):
            detail_block("garage-near-door-fixing", (.045, .04, .08),
                         (side * 2.89, -3.96, .4 + index * .55), slat, distant=False)
    return meshes()


def prepare_armco(objects):
    steel = held_material("galvanised-grey", (.65, .68, .67), .67, .48)
    for obj in objects:
        # The inspected donor has two sloping flanges but a flat middle web.
        # Cut that actual web at mid-height and form its second corrugation.
        # Rear/post vertices stay exact; this is geometry, not a silver tint.
        bm = bmesh.new(); bm.from_mesh(obj.data)
        front = [vertex for vertex in bm.verts if vertex.co.y < -.05]
        if not front:
            raise ValueError("Inspected Armco front web is missing")
        middle = (min(vertex.co.z for vertex in front) + max(vertex.co.z for vertex in front)) * .5
        protected = {tuple(vertex.co) for vertex in bm.verts if vertex.co.y >= -.05}
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                              dist=.000001, plane_co=(0, 0, middle), plane_no=(0, 0, 1),
                              clear_outer=False, clear_inner=False)
        fold = [vertex for vertex in bm.verts if abs(vertex.co.z - middle) < .00001 and vertex.co.y < -.05]
        if len(fold) < 2:
            raise ValueError("Armco centre fold did not cross the donor front web")
        for vertex in fold:
            vertex.co.y = -.18
        if not protected <= {tuple(vertex.co) for vertex in bm.verts}:
            raise ValueError("Armco rear/post vertices changed while forming its W profile")
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(obj.data); bm.free(); obj.data.update()
        finish_held(obj, steel)
        obj["p4PlanarLod"] = True
    rust = held_material("armco-rusted-fixings", (.35, .20, .11), .85, .15)
    for x in [-1.55, 0, 1.55]:
        detail_block("armco-fixing", (.065, .028, .07), (x, -.175, .62), rust, distant=False)
    return meshes()


def prepare_concrete(objects):
    finish = held_material("barrier-cast-concrete", (.57, .59, .57), .94)
    for obj in objects:
        finish_held(obj, finish)
        obj["p4PlanarLod"] = True
    return objects


def original_color(obj, polygon):
    source = obj.data.materials[polygon.material_index] if obj.data.materials else None
    if source and source.use_nodes:
        textures = [node.image for node in source.node_tree.nodes
                    if node.type == "TEX_IMAGE" and node.image and node.image.size[0]]
        if textures and obj.data.uv_layers.active:
            image = textures[0]
            if image.name not in SAMPLED_IMAGES:
                SAMPLED_IMAGES[image.name] = np.array(image.pixels[:]).reshape(image.size[1], image.size[0], 4)
            uv = sum((obj.data.uv_layers.active.data[i].uv for i in polygon.loop_indices), Vector((0, 0))) / len(polygon.loop_indices)
            pixels = SAMPLED_IMAGES[image.name]
            return tuple(pixels[int((uv.y % 1) * (image.size[1] - 1)),
                                int((uv.x % 1) * (image.size[0] - 1)), :3])
        shader = source.node_tree.nodes.get("Principled BSDF")
        if shader:
            return tuple(shader.inputs["Base Color"].default_value[:3])
    return tuple(source.diffuse_color[:3]) if source else (.5, .5, .5)


def category(color, material_name, identifier):
    r, g, b = color
    name = material_name.lower()
    if "snow" in name or (identifier.startswith("snow-") or identifier == "plough-bank") and min(color) > .55:
        return "snow"
    if "steel" in name or "chrome" in name or identifier == "armco":
        return "steel"
    if "charcoal" in name or max(color) < .23:
        return "dark"
    if "glass" in name or "clear" in name or "blue" in name or b > r * 1.25 and b > g * 1.05:
        return "glass"
    if "spruce" in name or g > r * 1.22 and g > b * 1.08:
        return "pine"
    if identifier == "autumn-tree" and max(color) - min(color) > .12:
        return "wood" if max(color) < .3 else "leaf"
    if r > g * 1.4 and r > b * 1.5:
        return "carrot" if identifier == "snowman" and g > .16 else "rust"
    if r > b * 1.25 and g > b * 1.15 and max(color) - min(color) > .12:
        return "wood"
    if min(color) > .72:
        return "snow" if identifier == "snowman" else "plaster"
    return "stone"


def style(objects, identifier):
    for obj in objects:
        if obj.type != "MESH":
            continue
        old = list(obj.data.materials)
        keys = []
        for polygon in obj.data.polygons:
            name = old[polygon.material_index].name if old else ""
            keys.append(category(original_color(obj, polygon), name, identifier))
        used = sorted(set(keys))
        obj.data.materials.clear()
        for key in used:
            glow = .4 if key == "glass" and identifier in [
                "lantern-tower", "shopfront-a", "shopfront-b", "summit-hut", "observatory"] else 0
            obj.data.materials.append(material(key, glow))
        uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name="Surface grain")
        for polygon, key in zip(obj.data.polygons, keys):
            polygon.material_index = used.index(key)
            axis = max(range(3), key=lambda i: abs(polygon.normal[i]))
            plane = [i for i in range(3) if i != axis]
            for loop in polygon.loop_indices:
                point = obj.data.vertices[obj.data.loops[loop].vertex_index].co
                uv.data[loop].uv = (point[plane[0]] / 2.0, point[plane[1]] / 2.0)


def stats():
    count = 0
    for obj in meshes():
        obj.data.calc_loop_triangles()
        count += len(obj.data.loop_triangles)
    low, high = bounds(meshes())
    size = high - low
    return {"triangles": count, "size": [round(size.x, 5), round(size.z, 5), round(size.y, 5)]}


def export(path, animated=False):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type in ["MESH", "ARMATURE", "EMPTY"]:
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True, export_yup=True,
        export_animations=animated, export_animation_mode="ACTIONS",
        export_force_sampling=True, export_anim_single_armature=True,
        export_nla_strips=False, export_materials="EXPORT", export_cameras=False,
        export_lights=False, export_extras=True, export_image_format="AUTO",
        export_vertex_color="ACTIVE")


def projected_area(polygon):
    return abs(sum(a.x * b.y - b.x * a.y
                   for a, b in zip(polygon, polygon[1:] + polygon[:1]))) * .5


def clip_triangle(polygon, clip):
    """Exact convex intersection in the horizontal plane."""
    def cross2(a, b):
        return a.x * b.y - a.y * b.x
    orientation = cross2(clip[1] - clip[0], clip[2] - clip[0])
    sign = 1 if orientation >= 0 else -1
    for a, b in zip(clip, clip[1:] + clip[:1]):
        result = []
        if not polygon:
            return result
        def side(point):
            return sign * cross2(b - a, point - a)
        previous = polygon[-1]
        previous_side = side(previous)
        for current in polygon:
            current_side = side(current)
            if (previous_side >= 0) != (current_side >= 0):
                result.append(previous.lerp(current, previous_side / (previous_side - current_side)))
            if current_side >= 0:
                result.append(current)
            previous, previous_side = current, current_side
        polygon = result
    return polygon


def cull_bank_hidden_faces(bm):
    """Keep the exact visible donor surface; remove only proven hidden faces."""
    bm.normal_update()
    parts, seen = [], set()
    for vertex in bm.verts:
        if vertex in seen:
            continue
        pending, vertices = [vertex], set()
        seen.add(vertex)
        while pending:
            current = pending.pop()
            vertices.add(current)
            for edge in current.link_edges:
                adjacent = edge.other_vert(current)
                if adjacent not in seen:
                    seen.add(adjacent)
                    pending.append(adjacent)
        faces = {face for current in vertices for face in current.link_faces}
        edges = {edge for current in vertices for edge in current.link_edges}
        if any(len(edge.link_faces) != 2 for edge in edges):
            raise ValueError("Bank donor component must be closed")
        directed = {}
        for face in faces:
            if len(face.verts) != 3:
                raise ValueError("Bank proof requires the original triangle facets")
            for loop in face.loops:
                pair = (loop.vert, loop.link_loop_next.vert)
                directed[pair] = directed.get(pair, 0) + 1
        if any(count != 1 or directed.get((b, a)) != 1
               for (a, b), count in directed.items()):
            raise ValueError("Bank donor winding must be consistent")
        volume = sum(face.verts[0].co.dot(face.verts[1].co.cross(face.verts[2].co))
                     for face in faces) / 6
        if volume <= 0:
            raise ValueError("Bank donor normals must point outwards")
        floor = [face for face in faces if all(abs(v.co.z) < .00001 for v in face.verts)]
        top = [face for face in faces if face not in floor]
        if not floor or any(face.normal.z > -.99 for face in floor) or any(
                face.normal.z <= .00001 for face in top):
            raise ValueError("Bank proof requires a ground-based single-valued heightfield")
        parts.append((faces, floor, top))
    def height(face, point):
        normal, origin = face.normal, face.verts[0].co
        return origin.z - (normal.x * (point.x - origin.x) +
                           normal.y * (point.y - origin.y)) / normal.z
    remove, hidden = set(), 0
    for faces, floor, top in parts:
        remove.update(floor)
        for candidate in top:
            projection = [v.co.xy.copy() for v in candidate.verts]
            area = projected_area(projection)
            if area <= .00000001:
                continue  # No vertical or silhouette facet is discarded by guesswork.
            for other_faces, other_floor, covering_top in parts:
                if other_faces is faces:
                    continue
                covered, proven = 0.0, True
                for cover in covering_top:
                    polygon = clip_triangle(projection, [v.co.xy.copy() for v in cover.verts])
                    overlap = projected_area(polygon) if len(polygon) >= 3 else 0
                    if overlap <= .000000001:
                        continue
                    # Both heights are affine on this convex clipped polygon.
                    # Ordering at every vertex proves ordering everywhere in it.
                    if any(height(candidate, point) < -.000001 or
                           height(cover, point) - height(candidate, point) <= .000001
                           for point in polygon):
                        proven = False
                        break
                    covered += overlap
                if proven and abs(covered - area) <= max(.00000001, area * .00001):
                    remove.add(candidate)
                    hidden += 1
                    break
    print("BANK HIDDEN FACES base=" + str(len(remove) - hidden) +
          " buried=" + str(hidden), flush=True)
    bmesh.ops.delete(bm, geom=list(remove), context="FACES")


def simplify(identifier):
    if identifier != "yeti" and stats()["triangles"] <= 100:
        # Tiny complete donor props are cheaper than broken structural faces.
        return
    before_low, before_high = bounds(meshes())
    for obj in list(meshes()):
        if obj.get("p4WholeLeafVertices"):
            stride = int(obj["p4WholeLeafVertices"])
            if stride != 6 or len(obj.data.vertices) % stride:
                raise ValueError("Whole-leaf LOD requires complete closed six-vertex leaves")
            bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
            bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if (vertex.index // stride) % 2], context="VERTS")
            bm.to_mesh(obj.data); bm.free(); obj.data.update()
            continue
        if obj.get("p4RadialLod"):
            reduce_radial_shell(obj, int(obj["p4RadialLod"]))
            continue
        if obj.get("p4LodMesh"):
            old = obj.data
            obj.data = bpy.data.meshes[obj["p4LodMesh"]]
            bpy.data.meshes.remove(old)
            continue
        if obj.get("p4LodOmit"):
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        if obj.get("p4PreserveSurface"):
            continue
        obj.data.calc_loop_triangles()
        if len(obj.data.loop_triangles) < 24:
            continue
        if identifier == "chairlift-chair" and all(
                mat and "steel" in mat.name for mat in obj.data.materials):
            # The inexpensive hanger/lower frame must survive the distant view.
            continue
        bpy.context.view_layer.objects.active = obj
        if identifier != "yeti":
            # Weld split face vertices inside this object only. Separate debris
            # and the original character skin must never be joined together.
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
            if identifier == "wooden-dock":
                bm.normal_update()
                # The lake-facing undersides are distant-only detail. Keep
                # every upward plank face, seam and vertical support face.
                bottom = [face for face in bm.faces if face.normal.z < -.25]
                bmesh.ops.delete(bm, geom=bottom, context="FACES")
                bmesh.ops.dissolve_limit(bm, angle_limit=.001, verts=list(bm.verts),
                                         edges=list(bm.edges), delimit=set())
                bm.to_mesh(obj.data); bm.free(); obj.data.update()
                continue
            if identifier == "plough-bank":
                cull_bank_hidden_faces(bm)
                bm.to_mesh(obj.data)
                bm.free()
                obj.data.update()
                continue
            if identifier == "grandstand":
                # Remove only the shallow inset on top of the donor roof.
                # Its outer corners define the retained roof plane.
                outline = [v for v in bm.verts if abs(v.co.x) > 5.9 and v.co.z > 7.4]
                front = min(v.co.y for v in outline)
                back = max(v.co.y for v in outline)
                front_z = max(v.co.z for v in outline if abs(v.co.y - front) < .001)
                back_z = max(v.co.z for v in outline if abs(v.co.y - back) < .001)
                for vertex in bm.verts:
                    if abs(vertex.co.x) < 5 and vertex.co.z > 7.4:
                        t = (vertex.co.y - front) / (back - front)
                        vertex.co.z = front_z + t * (back_z - front_z)
            bm.to_mesh(obj.data)
            bm.free()
            obj.data.update()
        modifier = obj.modifiers.new("Distant detail reduction", "DECIMATE")
        if obj.get("p4DomeLod"):
            modifier.decimate_type = "DISSOLVE"
            modifier.angle_limit = .055
            modifier.delimit = {"MATERIAL"}
            modifier.use_dissolve_boundaries = False
        elif obj.get("p4PlanarLod"):
            modifier.decimate_type = "DISSOLVE"
            modifier.angle_limit = .001
            modifier.delimit = {"MATERIAL"}
            modifier.use_dissolve_boundaries = False
        elif identifier == "grandstand":
            # Coplanar colour subdivisions are distant detail. Tread planes,
            # outer roof corners and load-bearing supports remain intact.
            modifier.decimate_type = "DISSOLVE"
            modifier.angle_limit = .001
            modifier.delimit = set()
            modifier.use_dissolve_boundaries = False
        else:
            modifier.ratio = obj.get("p4LodRatio", (.24 if identifier == "yeti" else
                              .70 if identifier in ["harbour-boat", "chairlift-tower"] else .36))
            modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        if identifier != "yeti":
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
            bm.to_mesh(obj.data)
            bm.free()
            obj.data.update()
    if identifier not in ROUND_TWO and identifier not in ["yeti", "grandstand", "plough-bank"]:
        # Retain the module mating envelope while simplifying interior detail.
        low, high = bounds(meshes())
        old_size, new_size = before_high - before_low, high - low
        scale = Vector(tuple(old_size[i] / max(new_size[i], .00001) for i in range(3)))
        transform = Matrix.Translation(before_low) @ Matrix.Diagonal((*scale, 1)) @ Matrix.Translation(-low)
        for obj in meshes():
            obj.data.transform(obj.matrix_world.inverted() @ transform @ obj.matrix_world)


def tinted_original(objects, identifier):
    """Keep a donor's one-material atlas for separately addressable debris/skin."""
    changed = {}
    for obj in objects:
        if obj.type != "MESH":
            continue
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            shader = mat.node_tree.nodes.get("Principled BSDF")
            if shader:
                shader.inputs["Roughness"].default_value = .9
                shader.inputs["Metallic"].default_value = 0
            for node in mat.node_tree.nodes:
                if node.type != "TEX_IMAGE" or not node.image:
                    continue
                source = node.image
                if source.name not in changed:
                    image = source.copy()
                    image.name = identifier + " restrained original atlas"
                    pixels = np.array(source.pixels[:], dtype=np.float32).reshape(-1, 4)
                    rgb = pixels[:, :3]
                    rgb *= (.91, .92, .91)
                    image.pixels.foreach_set(pixels.reshape(-1))
                    image.pack()
                    changed[source.name] = image
                node.image = changed[source.name]
        colors = obj.data.color_attributes.new(name="Wear", type="BYTE_COLOR", domain="CORNER")
        low, high = bounds([obj])
        span = max(high.z - low.z, .1)
        for polygon in obj.data.polygons:
            for loop in polygon.loop_indices:
                point = obj.data.vertices[obj.data.loops[loop].vertex_index].co
                height = min(1, max(0, (point.z - low.z) / span))
                dirt = .80 + .20 * min(1, height * 4)
                colors.data[loop].color = (dirt, dirt, dirt, 1)


def label(text, location, height, name):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = height
    curve.extrude = .001
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0, 0)
    obj.data.materials.append(material("dark"))
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def prepare_gantry(objects):
    accent = [obj for obj in objects if any("accent" in m.name.lower() for m in obj.data.materials)]
    if len(accent) != 1:
        raise ValueError("Selected gantry's original five-lamp mesh is missing")
    lamps = separate_loose(accent[0])
    if len(lamps) != 5:
        raise ValueError("Expected exactly five original countdown lamps")
    lamps.sort(key=lambda obj: sum(bounds([obj])[i].x for i in [0, 1]))
    for index, obj in enumerate(lamps, 1):
        fit([obj], (.72, .18, .72))
        move([obj], ((index - 3) * 1.4, -.42, 5.12))
        obj["p4PreserveSurface"] = True
        obj.name = "lamp-" + str(index)
        obj.data.materials.clear()
        lamp_material = bpy.data.materials.new("countdown lamp " + str(index))
        lamp_material.use_nodes = True
        shader = lamp_material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (.09, .005, .003, 1)
        shader.inputs["Roughness"].default_value = .28
        shader.inputs["Emission Color"].default_value = (1, .025, .006, 1)
        shader.inputs["Emission Strength"].default_value = .03
        obj.data.materials.append(lamp_material)
        for polygon in obj.data.polygons:
            polygon.material_index = 0
        origin_at_center(obj)
    steel = [obj for obj in meshes() if obj not in lamps]
    frame = held_material("gantry-weathered-blue", (.13, .24, .29), .79, .3)
    dark = held_material("gantry-lamp-housing", (.055, .059, .06), .73, .2)
    for obj in steel:
        finish_held(obj, frame)
        obj["p4PreserveSurface"] = True
    for index in range(1, 6):
        detail_block("lamp-housing-" + str(index), (.88, .34, .88),
                     ((index - 3) * 1.4, -.22, 5.48), dark)
    # Retain the donor frame and reinforce its actual 17.5 m clear span.
    for side in [-1, 1]:
        detail_block("gantry-reinforced-post", (.42, .60, 6.50), (side * 8.52, 0, 3.25), frame)
        detail_block("gantry-footing", (.72, .84, .28), (side * 8.52, 0, .14), dark)
    detail_block("gantry-reinforced-crossbeam", (17.5, .56, .42), (0, .03, 6.26), frame)
    banner = held_material("gantry-faded-banner", (.86, .81, .65))
    detail_block("gantry-series-banner", (13.2, .22, 1.20), (0, -.06, 7.10), banner)
    for x in [-4.4, 4.4]:
        detail_block("gantry-banner-mount", (.10, .16, .16), (x, -.06, 6.55), frame)
    front = label("THE DUEL", (0, -.183, 7.10), .94, "gantry-series-name-front")
    rear = label("THE DUEL", (0, .063, 7.10), .94, "gantry-series-name-rear")
    rear.rotation_euler = (math.pi / 2, 0, math.pi)
    for letters in [front, rear]:
        letters["p4LodRatio"] = .58
    return meshes()


def prepare_gallery(objects):
    """Adapt the selected shelter into a concrete, open-sided snow shed."""
    retained = []
    for obj in objects:
        low, high = bounds([obj])
        if high.z < .25:
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        name = obj.data.materials[0].name.lower() if obj.data.materials else ""
        if "snow" in name:
            bm = bmesh.new(); bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[face for face in bm.faces if any(vertex.co.z < 3.20 for vertex in face.verts)], context="FACES")
            bm.to_mesh(obj.data); bm.free()
        for vertex in obj.data.vertices:
            vertex.co.x *= 13 / 11
            vertex.co.y *= 6 / 5.4
            if "steel" in name:
                vertex.co.z = min(max(0, vertex.co.z - .15) * 1.56, 5.58 + .035 * vertex.co.y)
            else:
                original_height = vertex.co.z
                vertex.co.z = 5.72 + .035 * vertex.co.y
                if "snow" in name:
                    vertex.co.z += .12 + max(0, original_height - 3.20) * .25
        retained.append(obj)
    concrete = held_material("gallery-heavy-concrete", (.56, .58, .54), .96)
    snow = held_material("gallery-loaded-snow", (.87, .90, .91), .99)
    for obj in retained:
        name = obj.data.materials[0].name.lower() if obj.data.materials else ""
        if "steel" in name:
            for part in separate_loose(obj):
                low, high = bounds([part]); size = high - low
                if low.z < 4.5 and low.x < 5.05 and high.x > -5.05:
                    bpy.data.objects.remove(part, do_unlink=True)
                    continue
                if size.z > 1.5:
                    centre = (low + high) * .5
                    for vertex in part.data.vertices:
                        vertex.co.x = (1 if centre.x >= 0 else -1) * max(abs(centre.x), 5.7) + (vertex.co.x - centre.x) * 1.0 / max(size.x, .01)
                        vertex.co.y = centre.y + (vertex.co.y - centre.y) * .95 / max(size.y, .01)
                part.name = "gallery-concrete-pillar" if size.z > 1.5 else "gallery-concrete-crossbeam"
                finish_held(part, concrete)
                near_edge_detail(part)
        elif "snow" in name:
            obj.name = "gallery-roof-snow"
            finish_held(obj, snow); obj["p4PlanarLod"] = True
        else:
            # Retain the donor cover planes, flatten their gable into a shallow
            # slab, and expose its heavy fascia. The underside stays >4.5 m.
            bm = bmesh.new(); bm.from_mesh(obj.data)
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
            bm.normal_update()
            bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.normal.z <= .1], context="FACES")
            if not bm.faces:
                raise ValueError("Selected gallery roof has no upward cover planes")
            bm.to_mesh(obj.data); bm.free(); obj.data.update()
            bpy.context.view_layer.objects.active = obj
            thickness = obj.modifiers.new("Concrete slab 1.02 m", "SOLIDIFY")
            thickness.thickness = 1.02; thickness.offset = -1; thickness.use_even_offset = True
            bpy.ops.object.modifier_apply(modifier=thickness.name)
            obj.name = "gallery-heavy-concrete-roof"
            finish_held(obj, concrete)
            near_edge_detail(obj, .025)
    detail_block("gallery-solid-uphill-back", (.80, 6.0, 4.62), (6.10, 0, 2.31), concrete)
    # Fit additional copies of the donor snow into distinct roof heaps. These
    # use the selected shelter's real snow silhouette, not a new snow model.
    snow_cover = [obj for obj in meshes() if obj.name == "gallery-roof-snow"]
    for index, (x, y, lift, sx, sy) in enumerate([
            (2.1, -.5, .36, .65, .8), (-2.5, .6, .28, .55, .66), (5.4, -.2, .18, .22, .85)]):
        for donor_snow in snow_cover:
            copy = donor_snow.copy(); copy.data = donor_snow.data.copy()
            bpy.context.collection.objects.link(copy)
            bm=bmesh.new();bm.from_mesh(copy.data)
            bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=2,use_grid_fill=True)
            bm.to_mesh(copy.data);bm.free();copy.data.update()
            low, high = bounds([copy]); centre = (low + high) * .5
            hx=max(.1,(high.x-low.x)/2);hy=max(.1,(high.y-low.y)/2)
            for vertex in copy.data.vertices:
                rx=(vertex.co.x-centre.x)/hx;ry=(vertex.co.y-centre.y)/hy
                vertex.co.x = (vertex.co.x - centre.x) * sx + x
                vertex.co.y = (vertex.co.y - centre.y) * sy + y
                vertex.co.z += lift + .42*math.exp(-1.5*(rx*rx+ry*ry))
            copy.name = "gallery-donor-snow-heap-" + str(index)
            copy["p4PreserveSurface"] = True
    # A few irregular donor snow pieces overhang the uphill fascia; preserve
    # the valley-side road opening and original clearance throughout.
    for index, y in enumerate([-2.0, -.65, 1.1, 2.0]):
        if not snow_cover:
            raise ValueError("Gallery donor snow cover is missing")
        copy = snow_cover[0].copy(); copy.data = snow_cover[0].data.copy()
        bpy.context.collection.objects.link(copy)
        fit([copy], (.7 + .15 * (index % 2), .75, .65 + .10 * (index % 3)))
        move([copy], (6.2, y, 5.45))
        copy.name = "gallery-donor-snow-spill-" + str(index)
        copy["p4PreserveSurface"] = True

    return meshes()


def prepare_snowman(objects):
    parts = []
    for obj in objects:
        parts.extend(separate_loose(obj))
    _, overall = bounds(parts)
    hats, noses, body = [], [], []
    for part in parts:
        low, high = bounds([part])
        colors = [original_color(part, polygon) for polygon in part.data.polygons]
        orange = any(r > .4 and .13 < g < r * .8 and b < g * .6 for r, g, b in colors)
        if low.z > overall.z * .75 and high.x - low.x > .04:
            hats.append(part)
        elif orange and high.z < overall.z * .85:
            noses.append(part)
        else:
            body.append(part)
    hat = merge(hats, "hat")
    carrot = merge(noses, "carrot")
    snow = merge(body, "snow-body")
    objects = [hat, carrot, snow]
    fit(objects, DIMENSIONS["snowman"])
    tinted_original(objects, "snowman")
    for obj in objects:
        origin_at_center(obj)
    return objects


def detail_donor(source, key, size, offset, identifier):
    objects = flatten(donor(source, key))
    fit(objects, size)
    style(objects, identifier)
    move(objects, offset)
    return objects


def build_piece(identifier):
    source, key = DONORS[identifier]
    imported = donor(source, key)
    sources = {source}
    if identifier == "yeti":
        prepare_yeti(imported)
        return sources
    objects = flatten(imported)
    if identifier == "gallery":
        prepare_gallery(objects)
        return sources
    if identifier == "snowman":
        prepare_snowman(objects)
        return sources
    if identifier.startswith("autumn-tree"):
        prepare_tree(objects, identifier)
        return sources
    if identifier == "lantern-string":
        prepare_lantern_string(objects)
        return sources
    if identifier == "concrete-wall":
        for obj in objects:
            obj.data.transform(Matrix.Rotation(math.pi / 2, 4, "Z"))
    fit(objects, DIMENSIONS[identifier])
    if identifier in ["lantern-tower", "shopfront-a", "shopfront-b"]:
        prepare_harbour_building(objects, identifier)
        return sources
    if identifier == "pit-garage":
        prepare_garage(objects)
        return sources
    if identifier == "tyre-wall":
        prepare_tyres(objects)
        return sources
    if identifier == "armco":
        prepare_armco(objects)
        return sources
    if identifier == "concrete-wall":
        prepare_concrete(objects)
        return sources
    if identifier == "start-gantry":
        prepare_gantry(objects)
        return sources
    if identifier == "wooden-dock":
        # The donor is a timber ramp. Flatten its sloped deck into a lake dock;
        # retain the authored plank seams, side rails and support geometry.
        for obj in objects:
            for vertex in obj.data.vertices:
                if vertex.co.z > .15:
                    vertex.co.z = .90 + (vertex.co.z / 1.1) * .08
        fit(objects, DIMENSIONS[identifier])
        wood = held_material("dock-weathered-timber", (.40, .32, .23), pattern="wood")
        for obj in objects:
            finish_held(obj, wood, grain_scale=.45)
        return sources
    if identifier == "observatory":
        prepare_observatory(objects)
        return sources
    board_label = None
    if identifier.startswith("braking-board-"):
        panel = [obj for obj in objects if any(mat and mat.name.lower() == "white"
                 for mat in obj.data.materials)]
        if len(panel) != 1:
            raise ValueError("Original braking-board writing panel missing")
        low, high = bounds(panel)
        board_label = (((low.x + high.x) / 2, low.y - .006, (low.z + high.z) / 2),
                       min((high.z - low.z) * .70, (high.x - low.x) * .46))
    style(objects, identifier)
    for obj in objects:
        obj.name = identifier + "-" + obj.name
    if identifier == "pit-wall":
        detail_donor("p4-gp", "monitor", (.8, .5, .65), (0, .08, 1.03), identifier)
        sources.add("p4-gp")
    elif identifier == "neon-sign":
        text = label("LANTERN", (0, -.2, .6), .32, "neon-letters")
        text.data.materials.clear()
        text.data.materials.append(material("glass", 1.2))
    elif identifier.startswith("braking-board-"):
        position, height = board_label
        label(identifier.rsplit("-", 1)[1], position, height, "distance-" + identifier.rsplit("-", 1)[1])
    return sources


def action_curves(action):
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    result = []
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                result.extend(bag.fcurves)
    return result


def aim_bone(armature, name, head, tail):
    bone = armature.pose.bones[name]
    rest = bone.bone.matrix_local.to_quaternion()
    direction = (tail - head).normalized()
    rotation = (rest @ Vector((0, 1, 0))).rotation_difference(direction) @ rest
    matrix = rotation.to_matrix().to_4x4()
    matrix.translation = head
    bone.matrix = matrix
    bpy.context.view_layer.update()


def hand_target(armature, side, target, elbow_hint):
    upper = armature.pose.bones["UpperArm." + side]
    lower = armature.pose.bones["LowerArm." + side]
    shoulder = upper.head.copy()
    length_a, length_b = upper.length, lower.length
    axis = target - shoulder
    distance = min(axis.length, (length_a + length_b) * .985)
    if distance < .001:
        raise ValueError("Invalid hand target")
    axis.normalize()
    along = (length_a * length_a - length_b * length_b + distance * distance) / (2 * distance)
    across = math.sqrt(max(0, length_a * length_a - along * along))
    perpendicular = elbow_hint - shoulder
    perpendicular -= axis * perpendicular.dot(axis)
    if perpendicular.length < .001:
        perpendicular = axis.cross(Vector((0, 0, 1)))
    perpendicular.normalize()
    elbow = shoulder + axis * along + perpendicular * across
    aim_bone(armature, upper.name, shoulder, elbow)
    aim_bone(armature, lower.name, upper.tail.copy(), target)


def reshape_yeti(objects, armature):
    """Reshape the licensed weighted body and add opaque weighted shag clumps."""
    skin = [obj for obj in objects if obj.type == "MESH"]
    if len(skin) != 1:
        raise ValueError("Expected the selected original single Yeti skin")
    body = skin[0]
    source_colors = [original_color(body, face) for face in body.data.polygons]
    tongue = {face.index for face, color in zip(body.data.polygons, source_colors)
              if color[0] > .25 and color[2] > color[1] * 1.2 and color[0] > color[1] * 1.3}
    if not 200 <= len(tongue) <= 240:
        raise ValueError("Original tongue region no longer matches the inspected atlas")
    eye_vertices = set()
    for face, color in zip(body.data.polygons, source_colors):
        if (.50 < color[0] < .60 and .53 < color[1] < .61 and color[2] > .60):
            eye_vertices.update(face.vertices)
        if max(color) < .2:
            eye_vertices.update(index for index in face.vertices
                                if body.data.vertices[index].co.z > 2.11)
    groups = {group.index: group.name for group in body.vertex_groups}
    for vertex in body.data.vertices:
        point = vertex.co
        if vertex.index in eye_vertices:
            centre = Vector((.235 if point.x >= 0 else -.235, -.50, 2.29))
            point[:] = centre + (point - centre) * .42
        weights = {groups[item.group]: item.weight for item in vertex.groups}
        head = min(1, weights.get("Head", 0) + weights.get("Neck", 0) * .4)
        upper = min(1, weights.get("Torso", 0) + weights.get("Shoulder.L", 0) +
                    weights.get("Shoulder.R", 0))
        point.x *= 1 - .15 * head + .13 * upper
        point.z -= head * (.20 + max(0, point.z - 2.1) * .12)
        point.y -= head * .13
        back = max(0, min(1, (point.y + .02) / .55))
        point.z += upper * back * .18
        point.y += upper * back * .13
    body.data.update()
    # Remove the actual tongue faces; an atlas tint would leave its silhouette.
    bm = bmesh.new(); bm.from_mesh(body.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.index in tongue], context="FACES")
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if not vertex.link_faces], context="VERTS")
    bm.to_mesh(body.data); bm.free(); body.data.update()
    ivory = held_material("yeti-matted-ivory", (.77, .76, .67), .97, pattern="wood")
    face_mat = held_material("yeti-dark-face", (.31, .32, .30), .97)
    eyes = held_material("yeti-small-eyes", (.40, .38, .32), .44)
    black = held_material("yeti-eye-and-mouth-shadow", (.025, .026, .022), .94)
    assigned, candidates = [], []
    for polygon in body.data.polygons:
        color = original_color(body, polygon)
        point = polygon.center
        is_eye = .50 < color[0] < .60 and .53 < color[1] < .61 and color[2] > .60
        front_face = point.z > 1.70 and point.y < -.34 and abs(point.x) < .48
        if is_eye:
            mat = eyes
        elif max(color) < .2:
            mat = (black if not front_face or (1.76 < point.z < 1.84 and abs(point.x) < .27)
                   else face_mat)
        elif front_face and (color[2] > color[0] * 1.2 or color[0] > color[1] * 1.1):
            mat = face_mat
        else:
            mat = ivory
            if point.z > .33 and not front_face:
                candidates.append(polygon.index)
        assigned.append(mat)
    # Save anchor weights before replacing the source atlas/UV channels.
    anchors = []
    for index in sorted(candidates, key=lambda value: (value * 2654435761) % 4294967291):
        polygon = body.data.polygons[index]
        centre = polygon.center.copy()
        if any((centre - row[0]).length < .135 for row in anchors):
            continue
        weights = {}
        for vertex_index in polygon.vertices:
            for item in body.data.vertices[vertex_index].groups:
                name = groups[item.group]
                weights[name] = weights.get(name, 0) + item.weight / len(polygon.vertices)
        weights = dict(sorted(weights.items(), key=lambda item: -item[1])[:4])
        total = sum(weights.values())
        if total <= 0:
            raise ValueError("Fur anchor has no original skin weights")
        anchors.append((centre, polygon.normal.copy(), {name: value / total for name, value in weights.items()}))
        if len(anchors) == 112:
            break
    if len(anchors) < 90:
        raise ValueError("Insufficient weighted body surface for the planned shag silhouette")
    # Uneven cheek and brow tufts interrupt the donor face border. Existing
    # 112 body-fur anchors stay exact; only these head-weighted tufts are added.
    for index, (x, z) in enumerate([(-.42, 2.15), (.37, 2.19), (-.45, 1.99),
                                   (.40, 1.92), (-.32, 1.78), (.29, 1.76), (-.14, 2.22)]):
        anchors.append((Vector((x, -.48 - .015 * (index % 3), z)),
                        Vector((x * .25, -1, .10)).normalized(), {"Head": 1.0}))
    finish_held(body, assigned, grain_scale=.35)
    body["p4YetiBody"] = True
    vertices, faces, fur_weights = [], [], []
    for index, (centre, normal, weights) in enumerate(anchors):
        normal.normalize()
        across = normal.cross(Vector((0, 0, 1)))
        if across.length < .01:
            across = normal.cross(Vector((1, 0, 0)))
        across.normalize(); along = normal.cross(across).normalized()
        width = .065 + .02 * (index % 3)
        base = len(vertices)
        vertices.extend([centre + across * width,
                         centre - across * width * .65 + along * width * .65,
                         centre - across * width * .65 - along * width * .65,
                         centre + normal * .055 + Vector((0, 0, -.16 - .025 * (index % 3)))])
        faces.extend([(base, base + 1, base + 3), (base + 1, base + 2, base + 3),
                      (base + 2, base, base + 3), (base, base + 2, base + 1)])
        fur_weights.extend([weights] * 4)
    mesh = bpy.data.meshes.new("Yeti opaque weighted shag")
    mesh.from_pydata(vertices, [], faces); mesh.update()
    fur = bpy.data.objects.new("yeti-weighted-shag", mesh)
    bpy.context.collection.objects.link(fur)
    fur.parent = body.parent; fur.matrix_world = body.matrix_world.copy()
    for group in body.vertex_groups:
        fur.vertex_groups.new(name=group.name)
    for index, weights in enumerate(fur_weights):
        for name, value in weights.items():
            fur.vertex_groups[name].add([index], value, "REPLACE")
    modifier = fur.modifiers.new("Retained original 43-joint skin", "ARMATURE")
    modifier.object = armature
    finish_held(fur, ivory, grain_scale=.18)
    wear = fur.data.color_attributes["Wear"]
    for loop in fur.data.loops:
        tone = .98 if loop.vertex_index % 4 == 3 else .73
        wear.data[loop.index].color = (tone, tone * .995, tone * .96, 1)
    fur["p4PreserveSurface"] = True
    # Sculpt the continuous donor face in its posed coordinates. This avoids
    # rigid accessories: its retained triangles form the brow, nose and mouth.
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    posed = evaluated.to_mesh()
    positions = [vertex.co.copy() for vertex in posed.vertices]
    evaluated.to_mesh_clear()
    region = {i for face in body.data.polygons
              if body.data.materials[face.material_index] in [face_mat, eyes, black]
              for i in face.vertices if positions[i].z > 1.65 and positions[i].y < -.35}
    low = Vector(tuple(min(positions[i][axis] for i in region) for axis in range(3)))
    high = Vector(tuple(max(positions[i][axis] for i in region) for axis in range(3)))
    centre = (low + high) * .5; span = high.z - low.z
    matrices = {bone.name: body.matrix_world.inverted() @ armature.matrix_world @
                armature.pose.bones[bone.name].matrix @ bone.matrix_local.inverted() @
                armature.matrix_world.inverted() @ body.matrix_world
                for bone in armature.data.bones}
    eye_indices = {i for face in body.data.polygons
                   if body.data.materials[face.material_index] == eyes for i in face.vertices}
    for index in region:
        vertex = body.data.vertices[index]; point = positions[index].copy()
        x = point.x - centre.x; z = point.z - centre.z
        brow = math.exp(-((z - span * .20) / .065) ** 2) * math.exp(-(x / .43) ** 4)
        nose = math.exp(-((z + .025) / .105) ** 2 - (x / .14) ** 4)
        cheek = .18 * (abs(x) / max(.1, (high.x-low.x)/2)) ** 2
        point.y = low.y + .14 + cheek + .10 * (z / max(.1,span/2)) ** 2 - .18*brow - .16*nose
        if index in eye_indices:
            point.y -= .017
        weighted = Matrix(((0,0,0,0),)*4)
        total = sum(item.weight for item in vertex.groups)
        for item in vertex.groups:
            weighted += matrices[groups[item.group]] * (item.weight / total)
        vertex.co = weighted.inverted() @ point
    body.data.update()
    # Limit black to the narrow mouth and the original small pupils. Grey
    # sculpted cheeks and the brow replace the old all-black face plate.
    assigned = []
    for polygon in body.data.polygons:
        mat = body.data.materials[polygon.material_index]
        if mat == black and any(i in region for i in polygon.vertices):
            point = sum((positions[i] for i in polygon.vertices), Vector()) / len(polygon.vertices)
            mouth = abs(point.x-centre.x) < .27 and centre.z-span*.35 < point.z < centre.z-span*.22
            if not mouth: mat = face_mat
        assigned.append(mat)
    finish_held(body, assigned, grain_scale=.35)
    armature["shapeAdaptation"] = "Original weighted body reshaped; tongue faces removed; smaller eyes; " + str(len(anchors)) + " authored opaque weighted fur clumps"
    return fur


def author_walk_off(armature, idle):
    """Author the fifth clip with fixed stance targets on the retained rig.

    All targets and skin checks use the same metric fit as the finished asset.
    This flat-ground solve is evidence, not approval of native terrain contact.
    """
    armature.animation_data.action = idle
    bpy.context.scene.frame_set(int(idle.frame_range[0]))
    bpy.context.view_layer.update()
    low, high = bounds(meshes())
    scale = 2.8 / (high.z - low.z)
    fit_matrix = Matrix.Diagonal((scale, scale, scale, 1)) @ Matrix.Translation(Vector((0, 0, -low.z)))
    metric = fit_matrix @ armature.matrix_world
    inverse_metric = metric.inverted()
    baseline = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    initial = {bone.name: metric @ bone.matrix for bone in armature.pose.bones}
    body_mesh = next(obj for obj in meshes() if obj.get("p4YetiBody"))
    group_names = {group.index: group.name for group in body_mesh.vertex_groups}
    object_to_armature = armature.matrix_world.inverted() @ body_mesh.matrix_world
    rest_inverse = {bone.name: bone.matrix_local.inverted() for bone in armature.data.bones}
    # glTF exports the four strongest influences, normalized. Use precisely
    # those weights here, including the heel shared by Foot and LowerLeg.
    weighted = {}
    for vertex in body_mesh.data.vertices:
        weights = sorted([(group_names[item.group], item.weight) for item in vertex.groups],
                         key=lambda item: -item[1])[:4]
        total = sum(weight for _, weight in weights)
        if total <= 0:
            raise ValueError("Walk-off skin vertex has no weights")
        point = object_to_armature @ vertex.co
        weighted[vertex.index] = [(name, weight / total, rest_inverse[name] @ point)
                                  for name, weight in weights]

    def skin_point(index):
        point = Vector((0, 0, 0))
        for name, weight, rest_point in weighted[index]:
            point += (metric @ armature.pose.bones[name].matrix @ rest_point) * weight
        return point

    feet = {}
    for side in ["L", "R"]:
        foot_name, lower_name = "Foot." + side, "LowerLeg." + side
        eligible = [index for index, values in weighted.items()
                    if sum(weight for name, weight, _ in values if name in [foot_name, lower_name]) > .5
                    and skin_point(index).z < .32]
        if len(eligible) < 6:
            raise ValueError("Walk-off sole region missing: " + side)
        minimum = min(skin_point(index).z for index in eligible)
        sole = [index for index in eligible if skin_point(index).z <= minimum + .08]
        # The donor faces -Y. Rear/front bands select fixed vertex identities.
        front, rear = min(skin_point(i).y for i in sole), max(skin_point(i).y for i in sole)
        span = rear - front
        if span < .001:
            raise ValueError("Walk-off sole has no heel-to-toe extent")
        heel = min([i for i in sole if skin_point(i).y >= rear - span * .2], key=lambda i: skin_point(i).z)
        toe = min([i for i in sole if skin_point(i).y <= front + span * .2], key=lambda i: skin_point(i).z)
        if sum(weight for name, weight, _ in weighted[toe] if name == foot_name) < .999:
            raise ValueError("Walk-off toe must follow its original Foot controller")
        hip = initial["UpperLeg." + side].translation
        knee = initial[lower_name].translation
        ankle = initial[foot_name].translation
        feet[side] = dict(heel=heel, toe=toe, sole=eligible, start=skin_point(toe),
                          thigh=(knee - hip), shin=(ankle - knee),
                          knee_hint=(knee - hip), pitch=0.0)

    def set_metric(name, matrix):
        armature.pose.bones[name].matrix = inverse_metric @ matrix
        bpy.context.view_layer.update()

    def solve_leg(side, target, yaw, pitch):
        foot = feet[side]
        foot_name, upper_name, lower_name = "Foot." + side, "UpperLeg." + side, "LowerLeg." + side
        rotation = Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(pitch, 4, "X")
        foot_matrix = Matrix.Translation(target) @ rotation @ Matrix.Translation(-foot["start"]) @ initial[foot_name]
        set_metric(foot_name, foot_matrix)
        hip = (metric @ armature.pose.bones[upper_name].matrix).translation
        ankle = foot_matrix.translation
        axis = ankle - hip
        distance = axis.length
        length_a, length_b = foot["thigh"].length, foot["shin"].length
        if not abs(length_a - length_b) + .0001 < distance < length_a + length_b - .0001:
            raise ValueError(f"Walk-off unreachable {side} ankle: {distance:.5f}, lengths {length_a:.5f}/{length_b:.5f}")
        axis.normalize()
        along = (length_a * length_a - length_b * length_b + distance * distance) / (2 * distance)
        across = math.sqrt(max(0, length_a * length_a - along * along))
        hint = Matrix.Rotation(yaw, 3, "Z") @ foot["knee_hint"]
        perpendicular = hint - axis * hint.dot(axis)
        if perpendicular.length < .0001:
            perpendicular = Matrix.Rotation(yaw, 3, "Z") @ Vector((0, -1, 0))
            perpendicular -= axis * perpendicular.dot(axis)
        perpendicular.normalize()
        knee = hip + axis * along + perpendicular * across
        for name, original_direction, head, tail in [
                (upper_name, foot["thigh"], hip, knee),
                (lower_name, foot["shin"], knee, ankle)]:
            # Preserve the foot's axial turn before swinging each segment
            # toward its solved direction; direction-only aiming loses twist.
            turn = Matrix.Rotation(yaw, 3, "Z").to_quaternion()
            turned_direction = turn @ original_direction.normalized()
            rotation = turned_direction.rotation_difference((tail - head).normalized()) @ turn
            matrix = rotation.to_matrix().to_4x4() @ initial[name]
            matrix.translation = head
            set_metric(name, matrix)

    def place_foot(side, target, yaw):
        foot = feet[side]
        pitch = foot["pitch"]
        for _ in range(14):
            solve_leg(side, target, yaw, pitch)
            error = skin_point(foot["heel"]).z - target.z
            if abs(error) < .0002:
                break
            solve_leg(side, target, yaw, pitch + .002)
            derivative = (skin_point(foot["heel"]).z - target.z - error) / .002
            if abs(derivative) < .005:
                raise ValueError("Walk-off heel pitch solve is singular: " + side)
            pitch -= max(-.12, min(.12, error / derivative))
            if abs(pitch) > .8:
                raise ValueError("Walk-off heel pitch exceeds the foot limit: " + side)
        solve_leg(side, target, yaw, pitch)
        if abs(skin_point(foot["heel"]).z - target.z) > .001:
            raise ValueError("Walk-off weighted heel did not reach its target: " + side)
        if (skin_point(foot["toe"]) - target).length > .001:
            raise ValueError("Walk-off weighted toe did not reach its target: " + side)
        foot["pitch"] = pitch

    # Three short turning steps followed by eight alternating departure steps.
    # Swing intervals never overlap; both feet are planted between steps.
    root_start = initial["Root"].translation.copy()
    events = {"L": [], "R": []}
    for side, start, end, yaw, travel in [
            ("L", .10, .65, math.pi / 3, 0),
            ("R", .75, 1.30, math.pi * 2 / 3, 0),
            ("L", 1.40, 1.95, math.pi, 0)]:
        events[side].append((start, end, yaw, travel))
    for step in range(8):
        events["R" if step % 2 == 0 else "L"].append(
            (2.15 + step, 2.55 + step, math.pi, min(2.4, (step + 1) * .3)))

    def planted_target(side, yaw, travel):
        start = feet[side]["start"]
        point = root_start + Matrix.Rotation(yaw, 3, "Z") @ (start - root_start)
        point.y += travel
        point.z = 0
        return point

    def foot_target(side, time):
        previous = feet[side]["start"].copy()
        previous.z = 0
        previous_yaw = 0
        for start, end, yaw, travel in events[side]:
            destination = planted_target(side, yaw, travel)
            if time < start:
                return previous, previous_yaw, False
            if time <= end:
                phase = (time - start) / (end - start)
                blend = phase * phase * (3 - 2 * phase)
                point = previous.lerp(destination, blend)
                point.z = .10 * math.sin(math.pi * phase)
                return point, previous_yaw + (yaw - previous_yaw) * blend, True
            previous, previous_yaw = destination, yaw
        return previous, previous_yaw, False

    action = bpy.data.actions.new("walk-off")
    armature.animation_data.action = action
    metrics = dict(minSoleMetres=1e9, maxHeelErrorMetres=0, maxToeErrorMetres=0,
                   maxStanceToeDriftMetres=0, maxStanceHeelDriftMetres=0, samples=0)
    last_stance = {}
    first_root = None
    first_root_rotation = None
    for frame in range(1, 302, 2):
        time = (frame - 1) / 30
        # Solving updates the dependency graph. Detach the growing action so
        # it cannot reapply earlier keys at the scene's current frame.
        armature.animation_data.action = None
        for bone in armature.pose.bones:
            bone.rotation_mode = "QUATERNION"
            bone.matrix_basis = baseline[bone.name]
        bpy.context.view_layer.update()
        turn = min(1, time / 2)
        turn = turn * turn * (3 - 2 * turn)
        travel = max(0, (time - 2) / 8) * 2.4
        root_transform = (Matrix.Translation(Vector((0, travel, 0))) @ Matrix.Translation(root_start) @
                          Matrix.Rotation(math.pi * turn, 4, "Z") @ Matrix.Translation(-root_start))
        set_metric("Root", root_transform @ initial["Root"])
        actual_root_matrix = metric @ armature.pose.bones["Root"].matrix
        actual_root = actual_root_matrix.translation.copy()
        actual_rotation = actual_root_matrix.to_quaternion()
        if first_root is None:
            first_root = actual_root
            first_root_rotation = actual_rotation
        metrics["rootTravelMetres"] = (actual_root - first_root).length
        metrics["rootTurnRadians"] = first_root_rotation.rotation_difference(actual_rotation).angle
        lowered_body = root_transform @ initial["Body"]
        lowered_body.translation.z -= .08
        set_metric("Body", lowered_body)
        for side in ["L", "R"]:
            target, yaw, swinging = foot_target(side, time)
            place_foot(side, target, yaw)
            foot = feet[side]
            heel, toe = skin_point(foot["heel"]), skin_point(foot["toe"])
            sole_min = min(skin_point(index).z for index in foot["sole"])
            metrics["minSoleMetres"] = min(metrics["minSoleMetres"], sole_min)
            metrics["maxHeelErrorMetres"] = max(metrics["maxHeelErrorMetres"], abs(heel.z - target.z))
            metrics["maxToeErrorMetres"] = max(metrics["maxToeErrorMetres"], (toe - target).length)
            if not swinging and side in last_stance:
                metrics["maxStanceToeDriftMetres"] = max(metrics["maxStanceToeDriftMetres"], (toe - last_stance[side][0]).length)
                metrics["maxStanceHeelDriftMetres"] = max(metrics["maxStanceHeelDriftMetres"], (heel - last_stance[side][1]).length)
            if swinging:
                last_stance.pop(side, None)
            else:
                last_stance[side] = (toe, heel)
            if sole_min < -.015:
                lowest = min(foot["sole"], key=lambda index: skin_point(index).z)
                raise ValueError(f"Walk-off whole sole penetrates flat ground: {side} frame {frame} {sole_min:.5f}m; "
                                 f"vertex {lowest}, weights {[(name, weight) for name, weight, _ in weighted[lowest]]}, "
                                 f"heel {tuple(heel)}, toe {tuple(toe)}, yaw {yaw:.5f}, pitch {foot['pitch']:.5f}")
        metrics["samples"] += 1
        armature.animation_data.action = action
        for bone in armature.pose.bones:
            bone.keyframe_insert(data_path="location", frame=frame)
            bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
            bone.keyframe_insert(data_path="scale", frame=frame)
    for curve in action_curves(action):
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
    action.use_fake_user = True
    if abs(metrics["rootTravelMetres"] - 2.4) > .001 or abs(metrics["rootTurnRadians"] - math.pi) > .001:
        raise ValueError("Walk-off Root missed the 1 mm / .001 rad endpoint solve tolerance")
    print("P4_YETI_FLAT_GAIT " + json.dumps(metrics, sort_keys=True), flush=True)
    armature.animation_data.action = None
    for bone in armature.pose.bones:
        bone.matrix_basis = baseline[bone.name]
    bpy.context.view_layer.update()
    armature.animation_data.action = idle
    bpy.context.scene.frame_set(int(idle.frame_range[0]))
    bpy.context.view_layer.update()
    return action


def prepare_yeti(objects):
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise ValueError("Selected yeti must retain its actual armature")
    armature = armatures[0]
    if len(armature.data.bones) < 30:
        raise ValueError("Original yeti rig is incomplete")
    actions = list(bpy.data.actions)
    def find_original(name):
        matches = [a for a in actions if a.name == name or a.name.endswith("|" + name)]
        if len(matches) != 1:
            raise ValueError("Original yeti clip not found: " + name)
        return matches[0]
    idle, run = find_original("Idle"), find_original("Run")
    armature.animation_data_create()
    for track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(track)
    armature.animation_data.action = idle
    bpy.context.scene.frame_set(int(idle.frame_range[0]))
    bpy.context.view_layer.update()
    baseline = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    original_hands = {side: armature.pose.bones["LowerArm." + side].tail.copy() for side in ["L", "R"]}
    head_center = armature.pose.bones["Head"].head.copy()
    chest_center = armature.pose.bones["Torso"].head.copy()
    # Do not invent replacement motion for the verified native Idle/Run clips.
    # Remove only horizontal locomotion of the donor root if it has any.
    for curve in action_curves(run):
        if curve.data_path in ['pose.bones["Root"].location', 'pose.bones["Body"].location'] and curve.array_index < 2:
            start_value = curve.evaluate(run.frame_range[0])
            for point in curve.keyframe_points:
                point.co[1] = start_value
                point.handle_left[1] = start_value
                point.handle_right[1] = start_value
    idle.name, run.name = "idle", "lope"
    for action in actions:
        if action not in [idle, run]:
            bpy.data.actions.remove(action)
    for name in ["roar", "chest-beat"]:
        action = bpy.data.actions.new(name)
        armature.animation_data.action = action
        for frame in range(1, 92, 3):
            t = (frame - 1) / 90
            envelope = min(1, t / .18, (1 - t) / .18)
            envelope = max(0, envelope)
            for bone in armature.pose.bones:
                bone.rotation_mode = "QUATERNION"
                bone.matrix_basis = baseline[bone.name]
            head = armature.pose.bones["Head"]
            head.rotation_quaternion = head.rotation_quaternion @ Quaternion((1, 0, 0), -.24 * envelope)
            torso = armature.pose.bones["Torso"]
            torso.rotation_quaternion = torso.rotation_quaternion @ Quaternion((1, 0, 0), -.08 * envelope)
            bpy.context.view_layer.update()
            for side, sign in [("L", 1), ("R", -1)]:
                if name == "roar":
                    destination = Vector((sign * 1.12, chest_center.y - .45,
                                          head_center.z - .05 + .08 * math.sin(t * math.tau * 5)))
                else:
                    beat = .5 + .5 * math.sin(t * math.tau * 6 + (0 if side == "L" else math.pi))
                    destination = Vector((sign * .24, chest_center.y - .38 - beat * .27,
                                          chest_center.z + .30))
                target = original_hands[side].lerp(destination, envelope)
                hint = Vector((sign * 1.25, chest_center.y - .15, chest_center.z + .12))
                hand_target(armature, side, target, hint)
                for bone in armature.pose.bones:
                    if bone.name.endswith("." + side) and any(finger in bone.name for finger in ["Index", "Middle", "Pinky", "Thumb"]):
                        bone.rotation_quaternion = bone.rotation_quaternion @ Quaternion((1, 0, 0), .55 * envelope)
            for bone in armature.pose.bones:
                bone.keyframe_insert(data_path="location", frame=frame)
                bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
                bone.keyframe_insert(data_path="scale", frame=frame)
        action.use_fake_user = True
    armature.animation_data.action = idle
    bpy.context.scene.frame_set(int(idle.frame_range[0]))
    bpy.context.view_layer.update()
    fur = reshape_yeti(objects, armature)
    objects.append(fur)
    # The idle shape defines the asset fit before a new clip touches the rig.
    low, high = bounds(meshes())
    scale = 2.8 / (high.z - low.z)
    author_walk_off(armature, idle)
    roots = [obj for obj in objects if obj.parent not in objects]
    transform = Matrix.Diagonal((scale, scale, scale, 1)) @ Matrix.Translation(Vector((0, 0, -low.z)))
    for obj in roots:
        obj.matrix_world = transform @ obj.matrix_world
    armature["preparedClips"] = "idle,roar,chest-beat,lope,walk-off"
    armature["sourceClips"] = "Idle and in-place Run retained; roar/chest-beat authored; walk-off authored with fixed stance targets, weighted heel solve and 2.4 m metric root travel on the original 43-joint skin"


def render_group(group, ids, out, evidence, original=False):
    global MATERIALS, SAMPLED_IMAGES
    reset()
    MATERIALS, SAMPLED_IMAGES = {}, {}
    for index, identifier in enumerate(ids):
        if original:
            source, key = DONORS[identifier]
            objects = donor(source, key)
            if identifier in {"autumn-tree", "autumn-tree-golden", "autumn-tree-copper"}:
                # This FBX imports opaque diffuse colors with shader Alpha zero.
                # Repair opacity only in the original-source review render.
                materials = {mat for obj in objects if obj.type == "MESH"
                             for mat in obj.data.materials if mat}
                for mat in materials:
                    shaders = [node for node in mat.node_tree.nodes
                               if node.type == "BSDF_PRINCIPLED"] if mat.use_nodes else []
                    if len(shaders) != 1:
                        raise ValueError("Source tree requires one imported Principled shader")
                    alpha = shaders[0].inputs["Alpha"]
                    if alpha.is_linked or alpha.default_value != 0 or mat.diffuse_color[3] != 1:
                        raise ValueError("Source tree opacity differs from the inspected FBX import")
                    alpha.default_value = mat.diffuse_color[3]
                print("SOURCE OPACITY REPAIR " + identifier + " " + str(len(materials)), flush=True)
        else:
            before = set(bpy.context.scene.objects)
            bpy.ops.import_scene.gltf(filepath=str(out / (identifier + ".glb")))
            objects = remove_editor_handles(list(set(bpy.context.scene.objects) - before))
        # Compare characters in their real idle clip, not whichever action the
        # glTF importer happens to activate first. The browser samples 0.5 s.
        for armature in [obj for obj in objects if obj.type == "ARMATURE"]:
            armature.animation_data_create()
            for track in list(armature.animation_data.nla_tracks):
                armature.animation_data.nla_tracks.remove(track)
            idle = next((action for action in bpy.data.actions
                         if action.name.lower().split("|")[-1].split(".")[0] == "idle"), None)
            if idle is None:
                raise ValueError("Native idle clip required for character comparison")
            armature.animation_data.action = idle
            bpy.context.scene.frame_set(15)
        low, high = bounds(objects)
        size = high - low
        scale = 4.0 / max(size)
        anchor = Vector(((low.x + high.x) * .5, (low.y + high.y) * .5, low.z))
        placement = Vector(((index % 4) * 5.8, -(index // 4) * 6.3, 0))
        transform = Matrix.Translation(placement) @ Matrix.Diagonal((scale, scale, scale, 1)) @ Matrix.Translation(-anchor)
        for obj in objects:
            if obj.parent not in objects:
                obj.matrix_world = transform @ obj.matrix_world
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x, scene.render.resolution_y = 1400, 740
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("Neutral kit review")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.13, .15, .16, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .8
    low, high = bounds(meshes())
    center = (low + high) * .5
    radius = (high - low).length * .5
    bpy.ops.object.camera_add(location=center + Vector((.35, -1.7, 1.2)).normalized() * radius * 3.2)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(radius * 2.3, 6)
    scene.camera = camera
    for offset, energy in [((1, -2, 4), 1100), ((-2, 1, 2), 750)]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * radius)
        light = bpy.context.object
        light.data.energy = energy * radius * radius / 5
        light.data.size = radius * 2
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    scene.view_settings.view_transform = "Standard"
    scene.render.filepath = str(evidence / (group + ("-source.png" if original else "-blender.png")))
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
