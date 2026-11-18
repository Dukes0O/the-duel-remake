"""Restore collapsed image coordinates in a Blender-exported Founding home family."""
import json
from pathlib import Path
import struct

import numpy as np


def local_matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix']).reshape(4, 4).T
    x, y, z, w = node.get('rotation', (0, 0, 0, 1))
    matrix = np.eye(4)
    matrix[:3, :3] = np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
        [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)],
    ]) * node.get('scale', (1, 1, 1))
    matrix[:3, 3] = node.get('translation', (0, 0, 0))
    return matrix


def uv_areas(triangles):
    ab = triangles[:, 1] - triangles[:, 0]
    ac = triangles[:, 2] - triangles[:, 0]
    return np.abs(ab[:, 0] * ac[:, 1] - ab[:, 1] * ac[:, 0])


def home_coordinates(attributes, indices, sampled, transform):
    """Find the tile coordinates on the actual world-space sheet."""
    faces = indices.reshape(-1, 3)
    positions = attributes['POSITION'] @ transform[:3, :3].T + transform[:3, 3]
    points = positions[faces]
    normals = np.cross(points[:, 1] - points[:, 0], points[:, 2] - points[:, 0])
    areas = np.linalg.norm(normals, axis=1)
    tile = attributes[sampled]
    corners = tile[faces]
    collapsed = (areas > 1e-7) & (uv_areas(corners) < .001 * areas)
    if not collapsed.any():
        return tile, 0

    # Blender joins pieces that have different UV-layer names. If the door
    # or repair patch still has its authored island in another layer, retain
    # it at its real scale. The house recipe uses one repeat per two metres.
    missing = collapsed.copy()
    for name, extra in attributes.items():
        if name.startswith('TEXCOORD_') and name != sampled:
            other = extra[faces]
            usable = missing & (uv_areas(other) >= .125 * areas)
            corners[usable] = other[usable]
            missing[usable] = False

    # Project the remaining sheets in game metres. Y is up and glTF V grows
    # downwards. The longitudinal coordinate follows Blender's home tile axes.
    axes = np.abs(normals).argmax(axis=1)
    for axis, (horizontal, vertical, u_sign, v_sign) in enumerate([
        (2, 1, -1, -1), (0, 2, 1, 1), (0, 1, 1, -1),
    ]):
        chosen = missing & (axes == axis)
        corners[chosen, :, 0] = points[chosen, :, horizontal] * (.5 * u_sign)
        corners[chosen, :, 1] = 1 + points[chosen, :, vertical] * (.5 * v_sign)

    # Hard edges and the original UV islands already split these vertices.
    # Check that both triangles agree at each shared vertex before writing.
    restored = tile.copy()
    restored[faces.reshape(-1)] = corners.reshape(-1, 2)
    if not np.array_equal(restored[faces], corners):
        raise ValueError('Split the UV seam on this home surface before export')
    return restored, int(collapsed.sum())


def restore_surfaces(source, destination):
    """Write only the sampled UVs in the accepted GLB or a fresh Blender export."""
    raw = Path(source).read_bytes()
    json_size = struct.unpack_from('<I', raw, 12)[0]
    model = json.loads(raw[20:20 + json_size])
    binary = 28 + json_size

    def accessor(index):
        a = model['accessors'][index]
        v = model['bufferViews'][a['bufferView']]
        dtype = {5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[a['componentType']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        assert 'byteStride' not in v, 'expected packed Blender home accessors'
        start = binary + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return start, np.frombuffer(raw, dtype, a['count'] * width, start).reshape(-1, width)

    # This family shares some accessors across primitives. Collect every
    # requested mapping against the original bytes before writing any of them.
    patches = {}
    corrected = 0
    def visit(index, parent):
        nonlocal corrected
        node = model['nodes'][index]
        matrix = parent @ local_matrix(node)
        if 'mesh' in node:
            for p in model['meshes'][node['mesh']]['primitives']:
                texture = model['materials'][p['material']]['pbrMetallicRoughness'].get('baseColorTexture')
                if not texture:
                    continue
                sampled = 'TEXCOORD_' + str(texture.get('texCoord', 0))
                uv_accessor = model['accessors'][p['attributes'][sampled]]
                assert not {'min', 'max'} & uv_accessor.keys(), 'home texture coordinates have bounds to update'
                attributes = {name: accessor(i)[1] for name, i in p['attributes'].items()}
                restored, count = home_coordinates(attributes, accessor(p['indices'])[1], sampled, matrix)
                offset, _ = accessor(p['attributes'][sampled])
                data = restored.tobytes()
                if offset in patches and patches[offset] != data:
                    raise ValueError('Split UV accessors shared by differently oriented home surfaces')
                patches[offset] = data
                corrected += count
        for child in node.get('children', ()):
            visit(child, matrix)

    for index in model['scenes'][model.get('scene', 0)]['nodes']:
        visit(index, np.eye(4))
    output = bytearray(raw)
    for offset, data in patches.items():
        output[offset:offset + len(data)] = data
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if corrected or destination.resolve() != Path(source).resolve():
        destination.write_bytes(output)
    return {'repaired_triangles': corrected, 'bytes': len(output)}
