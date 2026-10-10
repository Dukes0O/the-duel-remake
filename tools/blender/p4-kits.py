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
               "wooden-dock", "autumn-tree"],
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
    "lantern-tower": (8, 8, 28), "shopfront-a": (6, 5, 8.8),
    "shopfront-b": (8, 5, 6.5), "neon-sign": (2.4, .35, 1.2),
    "lantern-string": (8, .55, 1.1), "harbour-boat": (2.4, 5.2, 3.0),
    "ski-lodge": (16, 11, 7), "chairlift-tower": (4, 1.5, 10),
    "chairlift-cable": (12, .18, .22), "chairlift-chair": (2.6, 1.3, 2.6),
    "wooden-dock": (3, 7, 1.1), "autumn-tree": (6.5, 6.0, 9),
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
    selection = set(args.only.split(",")) if args.only else set(DONORS)
    if not selection <= set(DONORS):
        raise ValueError("Unknown kit piece")
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
    for obj in meshes():
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
        if identifier == "grandstand":
            # Coplanar colour subdivisions are distant detail. Tread planes,
            # outer roof corners and load-bearing supports remain intact.
            modifier.decimate_type = "DISSOLVE"
            modifier.angle_limit = .001
            modifier.delimit = set()
            modifier.use_dissolve_boundaries = False
        else:
            modifier.ratio = (.31 if identifier == "yeti" else
                              .70 if identifier in ["harbour-boat", "chairlift-tower"] else .36)
            modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        if identifier != "yeti":
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
            bm.to_mesh(obj.data)
            bm.free()
            obj.data.update()
    if identifier not in ["yeti", "grandstand", "plough-bank"]:
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
                    if identifier == "yeti":
                        blue = (rgb[:, 2] > rgb[:, 0] * 1.2) & (rgb[:, 2] > rgb[:, 1] * .92)
                        rgb[blue] = (.27, .31, .30)
                        bright = rgb.min(axis=1) > .7
                        rgb[bright] *= (.89, .90, .88)
                    else:
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
    style(steel, "start-gantry")
    return meshes()


def prepare_gallery(objects):
    # Keep the selected shelter's actual posts, crossbeams, roof and roof snow.
    # Drop parking slab/markings and ground snow, which would block the road.
    retained = []
    for obj in objects:
        low, high = bounds([obj])
        if high.z < .25:
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        name = obj.data.materials[0].name.lower() if obj.data.materials else ""
        if "snow" in name:
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            remove = [face for face in bm.faces if any(v.co.z < 3.20 for v in face.verts)]
            bmesh.ops.delete(bm, geom=remove, context="FACES")
            bm.to_mesh(obj.data)
            bm.free()
        retained.append(obj)
    for obj in retained:
        name = obj.data.materials[0].name.lower() if obj.data.materials else ""
        for vertex in obj.data.vertices:
            vertex.co.x *= 13 / 11
            vertex.co.y *= 6 / 5.4
            if "steel" in name:
                vertex.co.z = max(0, vertex.co.z - .15) * 1.56
            else:
                vertex.co.z += 1.75
    # Split original support members so interior parking posts, if present,
    # can be removed rather than concealed in the road.
    for obj in list(retained):
        if not obj.data.materials or "steel" not in obj.data.materials[0].name.lower():
            continue
        parts = separate_loose(obj)
        for part in parts:
            low, high = bounds([part])
            if low.z < 4.5 and low.x < 5.05 and high.x > -5.05:
                bpy.data.objects.remove(part, do_unlink=True)
    style(meshes(), "gallery")
    for obj in meshes():
        obj.name = "gallery-" + obj.name
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
    fit(objects, DIMENSIONS[identifier])
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
    if identifier == "observatory":
        # The selected 36k-triangle dome needs a useful near version too.
        for obj in objects:
            # The donor has split coincident vertices; weld its actual cover
            # before collapsing faces so the dome does not tear into islands.
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.0002)
            bm.to_mesh(obj.data)
            bm.free()
            obj.data.update()
            bpy.context.view_layer.objects.active = obj
            reduction = obj.modifiers.new("Dome near-detail budget", "DECIMATE")
            reduction.ratio = .21
            bpy.ops.object.modifier_apply(modifier=reduction.name)
            for mat in obj.data.materials:
                if "clear" in mat.name.lower():
                    mat.name = "weathered steel dome"
        fit(objects, DIMENSIONS[identifier])
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
    elif identifier in ["shopfront-a", "shopfront-b"]:
        width = 4.6 if identifier == "shopfront-a" else 6.3
        detail_donor("p4-city", "awning", (width, 1.1, .5), (0, -2.55, 2.25), identifier)
        label("MERCADO" if identifier.endswith("a") else "CAFE", (0, -2.62, 2.95), .38, "shop-sign")
    elif identifier == "lantern-tower":
        detail_donor("p4-neon", "lanterns", (7.2, .6, 1.1), (0, -4.15, 24.5), identifier)
        detail_donor("p4-city", "awning", (9.1, 9.1, 1.25), (0, 0, 27.6), identifier)
        sources.add("p4-neon")
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
    low, high = bounds(meshes())
    scale = 2.8 / (high.z - low.z)
    roots = [obj for obj in objects if obj.parent not in objects]
    transform = Matrix.Diagonal((scale, scale, scale, 1)) @ Matrix.Translation(Vector((0, 0, -low.z)))
    for obj in roots:
        obj.matrix_world = transform @ obj.matrix_world
    tinted_original(meshes(), "yeti")
    armature["preparedClips"] = "idle,roar,chest-beat,lope"
    armature["sourceClips"] = "Idle and Run retained; roar/chest-beat authored on the original 43-joint skin"


def render_group(group, ids, out, evidence, original=False):
    global MATERIALS, SAMPLED_IMAGES
    reset()
    MATERIALS, SAMPLED_IMAGES = {}, {}
    for index, identifier in enumerate(ids):
        if original:
            source, key = DONORS[identifier]
            objects = donor(source, key)
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
