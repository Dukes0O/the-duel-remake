"""Rebuild the neutral Rook control sculpt from committed explicit mesh data.

No runtime asset is written. Candidate rig, UV and paint work follows a reviewed
neutral silhouette and has a separate acceptance gate.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path


def arguments():
    raw = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--stage', choices=('neutral', 'candidate'), default='neutral')
    parser.add_argument('--source', default='tools/blender/rook-p2-source.json')
    parser.add_argument('--landmarks', default='tools/blender/rook-p2-landmarks.json')
    parser.add_argument('--output-dir', default='art-build/crew/rook-p2')
    parser.add_argument('--isolate', choices=('all', 'boots', 'torso', 'head'), default='all')
    parser.add_argument('--paths-only', action='store_true')
    parser.add_argument('--face-paint')
    parser.add_argument('--face-paint-sha256')
    parser.add_argument('--paint-calibration', default='tools/blender/rook-p2-paint-calibration.json')
    parser.add_argument('--garment-paint')
    parser.add_argument('--garment-paint-sha256')
    parser.add_argument('--garment-calibration', default='tools/blender/rook-p2-garment-calibration.json')
    return parser.parse_args(raw)


def within(path, directory):
    return path == directory or directory in path.parents


def plan(args):
    root = Path(args.root).resolve()
    output = (root / args.output_dir).resolve()
    if not any(within(output, root / ignored) for ignored in ('art-build', '.evidence')):
        raise ValueError('Rook review output must stay in ignored art-build or .evidence under --root')
    if output in (root / 'art-build', root / '.evidence'):
        raise ValueError('Choose a dedicated Rook review output directory')
    if args.stage == 'candidate':
        return {
            'blend': [str(output / 'rook-p2-candidate.blend')],
            'glb': [str(output / 'rook-p2-candidate.glb')],
            'textures': [str(output / f'rook-p2-{name}.png') for name in ('basecolor', 'surface', 'normal')],
            'evidence': [str(output / 'candidate-manifest.json'), str(output / 'blender-rook.json')],
        }
    boots = args.isolate == 'boots'
    torso = args.isolate == 'torso'
    head = args.isolate == 'head'
    views = ('front', 'side', 'three-quarter') if boots or torso or head else ('front', 'side', 'back')
    prefix = 'boot' if boots else 'torso' if torso else 'head' if head else 'neutral'
    stem = 'rook-p2-boots' if boots else 'rook-p2-torso' if torso else 'rook-p2-head' if head else 'rook-p2-neutral'
    manifest = 'boot-manifest.json' if boots else 'torso-manifest.json' if torso else 'head-manifest.json' if head else 'manifest.json'
    return {
        'blend': [str(output / f'{stem}.blend')],
        'glb': [],
        'textures': [],
        'evidence': [str(output / f'{prefix}-{view}.png') for view in views]
                    + [str(output / manifest)],
    }


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_paint(args):
    if not (args.face_paint or args.face_paint_sha256):
        return None
    if args.stage != 'candidate' or not args.face_paint or not args.face_paint_sha256:
        raise ValueError('Candidate face paint requires both source and SHA-256')
    root = Path(args.root).resolve()
    source = (root / args.face_paint).resolve()
    calibration_path = (root / args.paint_calibration).resolve()
    ignored = (root / 'art-build', root / '.evidence')
    if not any(within(source, folder) for folder in ignored) or source.suffix.lower() != '.png':
        raise ValueError('Face paint source must be an ignored local PNG')
    if not (within(calibration_path, root / 'tools' / 'blender') or
            any(within(calibration_path, folder) for folder in ignored)):
        raise ValueError('Paint calibration must be a local review input')
    if not re.fullmatch('[0-9a-f]{64}', args.face_paint_sha256) or sha(source) != args.face_paint_sha256:
        raise ValueError('Face paint source SHA-256 mismatch')
    output = (root / args.output_dir).resolve()
    if output == (root / 'art-build/crew/rook-p2').resolve():
        raise ValueError('Painted output must have its own review directory')
    data = json.loads(calibration_path.read_text(encoding='utf-8'))
    if data.get('version') != 1 or data.get('method') != 'piecewise-linear-landmark-bake':
        raise ValueError('Unsupported paint calibration')
    saved_source = data['source']
    target = data['target']
    if (root / saved_source['path']).resolve() != source or saved_source['sha256'] != args.face_paint_sha256:
        raise ValueError('Paint calibration source identity mismatch')
    if saved_source['size'] != [1254, 1254] or target['chart'] != 'face' or target['boundsPx'] != [16, 16, 244, 244]:
        raise ValueError('Paint calibration image size or chart changed')
    names = ('hairline', 'leftEye', 'rightEye', 'nose', 'mouth', 'chin')
    for side in (saved_source, target):
        points = side['landmarks']
        if set(points) != set(names) or any(not isinstance(points[name], list) or len(points[name]) != 2 or
                                           any(not isinstance(value, (int, float)) for value in points[name])
                                           for name in names):
            raise ValueError('Paint calibration landmarks are malformed')
        if not (points['hairline'][1] < points['leftEye'][1] == points['rightEye'][1] <
                points['nose'][1] < points['mouth'][1] < points['chin'][1]):
            raise ValueError('Paint calibration height landmarks are not ordered')
        if not points['leftEye'][0] < points['rightEye'][0]:
            raise ValueError('Paint calibration eye landmarks are not ordered')
    return {'source': source, 'calibration': calibration_path, 'data': data}


def validate_garment_paint(args):
    if not (args.garment_paint or args.garment_paint_sha256):
        return None
    if args.stage != 'candidate' or not args.garment_paint or not args.garment_paint_sha256:
        raise ValueError('Candidate garment paint requires source and SHA-256')
    root = Path(args.root).resolve()
    source = (root / args.garment_paint).resolve()
    calibration = (root / args.garment_calibration).resolve()
    ignored = (root / 'art-build', root / '.evidence')
    if not any(within(source, folder) for folder in ignored) or source.suffix.lower() != '.png':
        raise ValueError('Garment source must be an ignored local PNG')
    if not (within(calibration, root / 'tools' / 'blender') or
            any(within(calibration, folder) for folder in ignored)):
        raise ValueError('Garment calibration must be a local review JSON')
    if not re.fullmatch('[0-9a-f]{64}', args.garment_paint_sha256) or sha(source) != args.garment_paint_sha256:
        raise ValueError('Garment source SHA-256 mismatch')
    if (root / args.output_dir).resolve() == (root / 'art-build/crew/rook-p2').resolve():
        raise ValueError('Garment paint requires its own ignored review directory')
    data = json.loads(calibration.read_text(encoding='utf-8'))
    if data.get('version') != 1 or data.get('method') != 'quadrant-panel-bake':
        raise ValueError('Unsupported garment calibration')
    source_data = data['source']
    size = source_data['size']
    if ((root / source_data['path']).resolve() != source or
            source_data['sha256'] != args.garment_paint_sha256 or
            not isinstance(size, list) or len(size) != 2 or
            any(not isinstance(value, int) or value < 512 or value > 4096 for value in size) or
            size[0] != size[1]):
        raise ValueError('Garment calibration source identity changed')
    import struct
    header = source.read_bytes()[:24]
    if (not header.startswith(b'\x89PNG\r\n\x1a\n') or
            list(struct.unpack_from('>II', header, 16)) != size):
        raise ValueError('Garment source PNG dimensions changed')
    swatches = source_data['regions']
    if set(swatches) != {'shirt', 'canvas', 'trousers', 'leather'}:
        raise ValueError('Garment calibration needs four named swatches')
    roles = {'jacket', 'vest-left', 'vest-right', 'pockets', 'scarf', 'pack',
             'trousers', 'boots', 'gloves', 'straps'}
    if set(data['targets']) != roles:
        raise ValueError('Garment calibration target roles changed')

    def rectangle(rect, limit):
        return (isinstance(rect, list) and len(rect) == 4 and
                all(isinstance(number, int) for number in rect) and
                0 <= rect[0] < rect[2] <= limit and 0 <= rect[1] < rect[3] <= limit)

    for name, rect in swatches.items():
        if not rectangle(rect, size[0]):
            raise ValueError(f'Garment source region {name} is invalid')
    for left_name, left in swatches.items():
        for right_name, right in swatches.items():
            if left_name >= right_name:
                continue
            if min(left[2], right[2]) > max(left[0], right[0]) and min(left[3], right[3]) > max(left[1], right[1]):
                raise ValueError('Garment source regions overlap')
    labels = ('face', 'skin', 'straps', 'pockets', 'vest-left', 'vest-right',
              'scarf', 'trousers', 'boots', 'gloves', 'pack')
    bounds = {label: [16 + index % 4 * 252, 16 + index // 4 * 252,
                      244 + index % 4 * 252, 244 + index // 4 * 252]
              for index, label in enumerate(labels)}
    bounds['jacket'] = [520, 772, 1000, 1000]
    for role, target in data['targets'].items():
        if target['source'] not in swatches:
            raise ValueError(f'Unknown garment swatch for {role}')
        panels = target.get('panels', [bounds[role]])
        if not isinstance(panels, list) or not panels:
            raise ValueError(f'Garment {role} needs painted panels')
        chart = bounds[role]
        for panel in panels:
            if not rectangle(panel, 1024) or not (chart[0] <= panel[0] < panel[2] <= chart[2] and
                                                       chart[1] <= panel[1] < panel[3] <= chart[3]):
                raise ValueError(f'Garment {role} panel is outside its chart')
        for first in range(len(panels)):
            for second in range(first + 1, len(panels)):
                a, b = panels[first], panels[second]
                if max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3]) < 16:
                    raise ValueError(f'Garment {role} panels lack sixteen-pixel clearance')
    if data['targets']['trousers'].get('panels') != [[780, 276, 878, 488], [894, 276, 992, 488]]:
        raise ValueError('Garment trouser panels changed from reviewed UV contract')
    return {'source': source, 'calibration': calibration, 'data': data}


def write_png(path, pixels, width=1024, height=1024):
    """Write an opaque RGBA atlas without a build dependency."""
    import struct
    import zlib

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

    raw = b''.join(b'\0' + pixels[row * width * 4:(row + 1) * width * 4] for row in range(height))
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
                     + chunk(b'IDAT', zlib.compress(raw, 7)) + chunk(b'IEND', b''))


def read_png(path):
    """Read local 8-bit RGB/RGBA PNG pixels in image-top row order."""
    import struct
    import zlib

    blob = path.read_bytes()
    if not blob.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Paint source is not a PNG')
    offset, payload, width, height, channels = 8, bytearray(), None, None, None
    while offset < len(blob):
        length = struct.unpack_from('>I', blob, offset)[0]
        kind = blob[offset + 4:offset + 8]
        chunk = blob[offset + 8:offset + 8 + length]
        offset += 12 + length
        if kind == b'IHDR':
            width, height, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', chunk)
            if depth != 8 or color not in (2, 6) or compression or filtering or interlace:
                raise ValueError('Paint source requires non-interlaced 8-bit RGB/RGBA PNG')
            channels = 3 if color == 2 else 4
        elif kind == b'IDAT':
            payload.extend(chunk)
        elif kind == b'IEND':
            break
    if not width or not height or not payload:
        raise ValueError('Paint source PNG is incomplete')
    raw = zlib.decompress(payload)
    stride = width * channels
    pixels = bytearray(width * height * 4)
    previous = bytearray(stride)
    at = 0
    for y in range(height):
        mode = raw[at]
        scan = bytearray(raw[at + 1:at + 1 + stride])
        at += stride + 1
        for index in range(stride):
            left = scan[index - channels] if index >= channels else 0
            up = previous[index]
            upper_left = previous[index - channels] if index >= channels else 0
            if mode == 1:
                scan[index] = (scan[index] + left) & 255
            elif mode == 2:
                scan[index] = (scan[index] + up) & 255
            elif mode == 3:
                scan[index] = (scan[index] + (left + up) // 2) & 255
            elif mode == 4:
                estimate = left + up - upper_left
                neighbors = (left, up, upper_left)
                prediction = min(neighbors, key=lambda neighbor: abs(estimate - neighbor))
                scan[index] = (scan[index] + prediction) & 255
            elif mode != 0:
                raise ValueError('Unsupported PNG scanline filter')
        for x in range(width):
            source_at = x * channels
            target_at = (y * width + x) * 4
            pixels[target_at:target_at + 4] = scan[source_at:source_at + channels] + (b'\xff' if channels == 3 else b'')
        previous = scan
    return width, height, pixels


def bake_face_paint(basecolor_path, paint):
    source_width, source_height, source = read_png(paint['source'])
    if [source_width, source_height] != paint['data']['source']['size']:
        raise ValueError('Paint source dimensions changed')
    width, height, atlas = read_png(basecolor_path)
    if (width, height) != (1024, 1024):
        raise ValueError('Candidate atlas dimensions changed')
    original = paint['data']['source']['landmarks']
    target = paint['data']['target']['landmarks']
    order = ('hairline', 'leftEye', 'nose', 'mouth', 'chin')

    def source_y(y):
        for lower, upper in zip(order, order[1:]):
            lo, hi = target[lower][1], target[upper][1]
            if y <= hi:
                return original[lower][1] + (y - lo) * (original[upper][1] - original[lower][1]) / (hi - lo)
        lo, hi = target['mouth'][1], target['chin'][1]
        return original['chin'][1] + (y - hi) * (original['chin'][1] - original['mouth'][1]) / (hi - lo)

    x_scale = (original['rightEye'][0] - original['leftEye'][0]) / (target['rightEye'][0] - target['leftEye'][0])
    x_center = (original['rightEye'][0] + original['leftEye'][0]) / 2
    target_center = (target['rightEye'][0] + target['leftEye'][0]) / 2
    for y in range(16, 245):
        from_y = max(0, min(source_height - 1, source_y(y)))
        y0 = int(from_y)
        y1 = min(source_height - 1, y0 + 1)
        fy = from_y - y0
        for x in range(16, 245):
            from_x = max(0, min(source_width - 1, x_center + (x - target_center) * x_scale))
            x0 = int(from_x)
            x1 = min(source_width - 1, x0 + 1)
            fx = from_x - x0
            at = (y * width + x) * 4
            for channel in range(3):
                a = source[(y0 * source_width + x0) * 4 + channel]
                b = source[(y0 * source_width + x1) * 4 + channel]
                c = source[(y1 * source_width + x0) * 4 + channel]
                d = source[(y1 * source_width + x1) * 4 + channel]
                atlas[at + channel] = round((a * (1 - fx) + b * fx) * (1 - fy) +
                                            (c * (1 - fx) + d * fx) * fy)
    write_png(basecolor_path, atlas)


def bake_garment_paint(basecolor_path, paint, charts):
    """Transfer reviewed flat material swatches into named atlas panels."""
    source_width, source_height, source = read_png(paint['source'])
    if [source_width, source_height] != paint['data']['source']['size']:
        raise ValueError('Garment source dimensions changed')
    width, height, atlas = read_png(basecolor_path)
    if (width, height) != (1024, 1024):
        raise ValueError('Candidate atlas dimensions changed')
    regions = paint['data']['source']['regions']
    for role, target in paint['data']['targets'].items():
        crop = regions[target['source']]
        for panel in target.get('panels', [charts[role]['boundsPx']]):
            x0, y0, x1, y1 = panel
            for y in range(y0, y1 + 1):
                source_y = crop[1] + (y - y0) * (crop[3] - crop[1] - 1) / (y1 - y0)
                sy0 = int(source_y)
                sy1 = min(source_height - 1, sy0 + 1)
                fy = source_y - sy0
                for x in range(x0, x1 + 1):
                    source_x = crop[0] + (x - x0) * (crop[2] - crop[0] - 1) / (x1 - x0)
                    sx0 = int(source_x)
                    sx1 = min(source_width - 1, sx0 + 1)
                    fx = source_x - sx0
                    at = (y * width + x) * 4
                    for channel in range(3):
                        a = source[(sy0 * source_width + sx0) * 4 + channel]
                        b = source[(sy0 * source_width + sx1) * 4 + channel]
                        c = source[(sy1 * source_width + sx0) * 4 + channel]
                        d = source[(sy1 * source_width + sx1) * 4 + channel]
                        atlas[at + channel] = round((a * (1 - fx) + b * fx) * (1 - fy) +
                                                    (c * (1 - fx) + d * fx) * fy)
    write_png(basecolor_path, atlas)


def candidate_atlases(output):
    # Interiors have 16 px clearance; eight pixels of color bleed belong to
    # each neighbouring chart. Their positions are part of the paint recipe.
    labels = ('face', 'skin', 'straps', 'pockets', 'vest-left', 'vest-right',
              'scarf', 'trousers', 'boots', 'gloves', 'pack')
    charts = {}
    for index, label in enumerate(labels):
        column, row = index % 4, index // 4
        x0, y0 = 16 + column * 252, 16 + row * 252
        charts[label] = {'role': label, 'boundsPx': [x0, y0, x0 + 228, y0 + 228],
                         'areaPx': 228 * 228, 'seams': ['angle-bounded seam pack']}
    # The many hair clumps and the large sewn jacket need more paint area.
    charts['hair'] = {'role': 'hair', 'boundsPx': [16, 772, 496, 1000],
                      'areaPx': 480 * 228, 'seams': ['scalp root and clump underside']}
    charts['jacket'] = {'role': 'jacket', 'boundsPx': [520, 772, 1000, 1000],
                        'areaPx': 480 * 228, 'seams': ['rear torso, sleeve underside and shoulder']}
    colors = {
        'face': (147, 107, 82), 'skin': (134, 98, 75), 'hair': (49, 36, 31), 'jacket': (72, 99, 98),
        'vest-left': (150, 128, 96), 'vest-right': (148, 125, 93), 'scarf': (162, 139, 107),
        'trousers': (103, 88, 68), 'boots': (48, 39, 33), 'gloves': (55, 43, 35),
        'pack': (95, 77, 58), 'pockets': (137, 113, 81), 'straps': (65, 51, 38),
    }
    maps = {}
    for kind in ('basecolor', 'surface', 'normal'):
        pixels = bytearray([128, 128, 128, 255] if kind == 'basecolor' else
                           [255, 210, 0, 255] if kind == 'surface' else
                           [128, 128, 255, 255]) * (1024 * 1024)
        for label, chart in charts.items():
            x0, y0, x1, y1 = chart['boundsPx']
            for y in range(y0 - 8, y1 + 8):
                for x in range(x0 - 8, x1 + 8):
                    at = (y * 1024 + x) * 4
                    if kind == 'basecolor':
                        grain = ((x * 37 + y * 17 + (x * y) % 31) % 19) - 9
                        shade = .92 if label in ('jacket', 'trousers', 'vest-left', 'vest-right') and (x // 13 + y // 17) % 7 == 0 else 1
                        pixels[at:at + 4] = bytes(max(0, min(255, int(channel * shade + grain))) for channel in colors[label]) + b'\xff'
                    elif kind == 'surface':
                        rough = 195 if label in ('face', 'hair') else 164 if label in ('boots', 'gloves') else 219
                        pixels[at:at + 4] = bytes((255, rough, 0, 255))
                    else:
                        pixels[at:at + 4] = b'\x80\x80\xff\xff'
        path = output / f'rook-p2-{kind}.png'
        write_png(path, pixels)
        maps[kind] = path
    return charts, maps


def candidate_chart(role):
    if role in ('body-core', 'face'):
        return 'face'
    if role == 'skin':
        return 'skin'
    if role.startswith('vest'):
        return role
    if role.startswith('boot'):
        return 'boots'
    if role.startswith('hair'):
        return 'hair'
    if role in ('glove',):
        return 'gloves'
    if role in ('pocket',):
        return 'pockets'
    if role in ('strap', 'belt'):
        return 'straps'
    if role in ('jacket', 'trousers', 'scarf', 'pack'):
        return role
    return 'jacket'


def candidate_body_sections(item):
    """Separate face UV ownership without changing the connected source mesh."""
    if item['role'] != 'body-core':
        return [item]
    sections = []
    for label, keep_head in (('face', True), ('skin', False)):
        faces = [face for face in item['faces'] if
                 (sum(item['vertices'][index][2] for index in face) / len(face) >= 1.52 and
                  sum(item['vertices'][index][1] for index in face) / len(face) <= 0) == keep_head]
        used = sorted({index for face in faces for index in face})
        indices = {original: index for index, original in enumerate(used)}
        sections.append({'name': item['name'] + '-' + label, 'role': label, 'lod': 'near',
                         'vertices': [item['vertices'][index] for index in used],
                         'faces': [[indices[index] for index in face] for face in faces]})
    return sections


def candidate_face_uv(obj, chart):
    """One rear-seam cylindrical head island; the eyes-to-chin front is whole."""
    import math
    x0, y0, x1, y1 = chart['boundsPx']
    layer = obj.data.uv_layers['UV0']
    for polygon in obj.data.polygons:
        values = []
        for loop_index in polygon.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            angle = math.atan2(vertex.x, -vertex.y)
            front = math.pi / 4
            if abs(angle) <= front:
                u = .5 + .37 * angle / front
            else:
                u = .5 + math.copysign(.37 + .13 * (abs(angle) - front) / (math.pi - front), angle)
            values.append(u)
        for loop_index, u in zip(polygon.loop_indices, values):
            vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            v = max(0, min(1, (vertex.z - 1.52) / .31))
            layer.data[loop_index].uv = ((x0 + 8 + u * (x1 - x0 - 16)) / 1024,
                                         1 - (y0 + 8 + (1 - v) * (y1 - y0 - 16)) / 1024)
    layer.active = True
    layer.active_render = True


def candidate_jacket_uv(obj, chart):
    """Readable torso front/back and sleeve strips at authored garment seams."""
    import math
    x0, y0, x1, y1 = chart['boundsPx']
    cell_width = 104
    cell_left = [x0 + 8 + column * (cell_width + 16) for column in range(4)]
    top, bottom = y0 + 8, y1 - 8
    layer = obj.data.uv_layers['UV0']
    for polygon in obj.data.polygons:
        centre = polygon.center
        # The connected cloth crosses the armhole. UV seams may split a loop
        # across panels, but the exported mesh stays sewn at the same vertices.
        if abs(centre.x) > .205:
            panel = 2 if centre.x < 0 else 3
        else:
            panel = 0 if centre.y <= 0 else 1
        for loop_index in polygon.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            if panel in (0, 1):
                u = max(0, min(1, (vertex.x + .215) / .43))
                v = max(0, min(1, (vertex.z - 1.03) / .55))
            else:
                side = -1 if panel == 2 else 1
                angle = math.atan2(vertex.y - .025, abs(vertex.x) - .245)
                # The underside is the concealed cylindrical sleeve seam.
                u = .5 + angle / (2 * math.pi)
                v = max(0, min(1, (vertex.z - 1.07) / .39))
            layer.data[loop_index].uv = ((cell_left[panel] + 3 + u * (cell_width - 6)) / 1024,
                                         1 - (top + 3 + (1 - v) * (bottom - top - 6)) / 1024)
    layer.active = True
    layer.active_render = True


def candidate_trouser_uv(obj, chart):
    """Keep joined trouser front and back readable as two sewn paint panels."""
    x0, y0, _, y1 = chart['boundsPx']
    panels = ((x0 + 8, x0 + 106), (x0 + 122, x0 + 220))
    layer = obj.data.uv_layers['UV0']
    for polygon in obj.data.polygons:
        # The physical front faces negative Blender Y. Side seams may split
        # loop UVs, but the single connected pelvis/leg mesh stays unchanged.
        left, right = panels[0 if polygon.center.y <= 0 else 1]
        for loop_index in polygon.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            across = max(0, min(1, (vertex.x + .235) / .47))
            along = max(0, min(1, (vertex.z - .26) / .76))
            pixel_x = left + 3 + across * (right - left - 6)
            pixel_y = y1 - 11 - along * (y1 - y0 - 22)
            layer.data[loop_index].uv = (pixel_x / 1024, 1 - pixel_y / 1024)
    layer.active = True
    layer.active_render = True


def candidate_pack_islands(objects, chart, gap=16, face_filter=None, atlas_input=False):
    """Pack whole connected UV islands with measured texel bleed clearance."""
    x0, y0, x1, y1 = chart['boundsPx']
    width, height = x1 - x0 - 16, y1 - y0 - 16
    islands = []
    for obj in objects:
        mesh = obj.data
        layer = mesh.uv_layers['UV0']
        parent = list(range(len(mesh.polygons)))
        polygons = [polygon for polygon in mesh.polygons if face_filter is None or face_filter(polygon, mesh, layer)]

        def find(index):
            while parent[index] != index:
                parent[index] = parent[parent[index]]
                index = parent[index]
            return index

        edge_owner = {}
        for polygon in polygons:
            loops = list(polygon.loop_indices)
            for i, first in enumerate(loops):
                second = loops[(i + 1) % len(loops)]
                def key(loop):
                    point = layer.data[loop].uv
                    return (round(point.x, 5), round(point.y, 5))
                edge = tuple(sorted((key(first), key(second))))
                other = edge_owner.get(edge)
                if other is None:
                    edge_owner[edge] = polygon.index
                else:
                    parent[find(polygon.index)] = find(other)
        groups = {}
        for polygon in polygons:
            groups.setdefault(find(polygon.index), set()).update(polygon.loop_indices)
        for loops in groups.values():
            points = [layer.data[index].uv for index in loops]
            min_u, max_u = min(p.x for p in points), max(p.x for p in points)
            min_v, max_v = min(p.y for p in points), max(p.y for p in points)
            islands.append({'obj': obj, 'loops': loops, 'bounds': (min_u, min_v, max_u, max_v)})

    def try_pack(scale):
        rectangles = sorted(islands, key=lambda island: (island['bounds'][3] - island['bounds'][1]) * height,
                            reverse=True)
        x, y, row_height = x0 + 8, y0 + 8, 0
        placed = []
        for island in rectangles:
            lo_u, lo_v, hi_u, hi_v = island['bounds']
            w = max(.1, (hi_u - lo_u) * (1024 if atlas_input else width) * scale)
            h = max(.1, (hi_v - lo_v) * (1024 if atlas_input else height) * scale)
            if x + w > x1 - 8 + 1e-6:
                x, y, row_height = x0 + 8, y + row_height + gap, 0
            if y + h > y1 - 8 + 1e-6:
                return None
            placed.append((island, x, y))
            x += w + gap
            row_height = max(row_height, h)
        return placed

    low, high = 0, 1
    for _ in range(24):
        middle = (low + high) / 2
        if try_pack(middle) is None:
            high = middle
        else:
            low = middle
    placed = try_pack(low * .999)
    if not placed or low < .08:
        raise ValueError(f"Cannot fit authored {chart['role']} UV islands with {gap}px bleed room")
    for island, px, py in placed:
        lo_u, lo_v, _, _ = island['bounds']
        layer = island['obj'].data.uv_layers['UV0']
        for index in island['loops']:
            u, v = layer.data[index].uv
            layer.data[index].uv = ((px + (u - lo_u) * (1024 if atlas_input else width) * low * .999) / 1024,
                                     1 - (py + (v - lo_v) * (1024 if atlas_input else height) * low * .999) / 1024)
    return len(islands), round(low, 4)


def candidate_weight_groups(obj, rig, role):
    for bone in rig.data.bones:
        obj.vertex_groups.new(name=bone.name)
    jacket_faces = [0] * len(obj.data.vertices)
    sleeve_faces = [0] * len(obj.data.vertices)
    if role == 'jacket':
        # The sewn cloth has authored torso and sleeve faces. Coordinate-only
        # weights previously sent torso-side hem vertices to the forearm.
        for polygon in obj.data.polygons:
            sleeve = abs(polygon.center.x) > .205
            for index in polygon.vertices:
                jacket_faces[index] += 1
                sleeve_faces[index] += int(sleeve)
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        side = 'L' if x < 0 else 'R'
        weights = {}
        if role == 'jacket':
            sleeve_share = sleeve_faces[vertex.index] / jacket_faces[vertex.index]
            hem_to_armhole = min(1, max(0, (z - 1.06) / .019))
            arm = min(.85, max(0, (abs(x) - .14) / .20)) * (
                sleeve_share * (1 - hem_to_armhole) + hem_to_armhole)
            chest = min(1, max(0, (z - 1.01) / .2))
            weights = {'pelvis': (1 - arm) * (1 - chest), 'chest': (1 - arm) * chest,
                       ('forearm.' if z < 1.22 else 'upper_arm.') + side: arm}
        elif role in ('vest-left', 'vest-right', 'pocket', 'pack', 'strap', 'belt'):
            chest = min(1, max(0, (z - 1.01) / .2))
            weights = {'pelvis': 1 - chest, 'chest': chest}
        elif role in ('hair',):
            weights = {'head': 1}
        elif role == 'scarf':
            weights = {'neck': .7, 'head': .3}
        elif role == 'trousers':
            # Authored trousers reach beyond x=.20 at the cargo thigh. Bind
            # them by leg height, never by the generic hand/arm side rule.
            if z < .36:
                weights = {'shin.' + side: .9, 'thigh.' + side: .1}
            elif z < .64:
                knee = (z - .36) / .28
                weights = {'shin.' + side: .9 * (1 - knee),
                           'thigh.' + side: .1 + .8 * knee}
            elif z < .9:
                weights = {'thigh.' + side: .9, 'pelvis': .1}
            else:
                hip = min(1, (z - .9) / .15)
                weights = {'thigh.' + side: .9 * (1 - hip),
                           'pelvis': .1 + .9 * hip}
        elif z > 1.54 and abs(x) < .19:
            weights = {'head': min(1, max(0, (z - 1.48) / .12)), 'neck': max(0, 1 - min(1, (z - 1.48) / .12))}
        elif abs(x) > .20 and z > .79:
            if z < 1.0:
                weights = {'hand.' + side: .8, 'forearm.' + side: .2}
            elif z < 1.22:
                weights = {'forearm.' + side: .78, 'upper_arm.' + side: .22}
            else:
                weights = {'upper_arm.' + side: .88, 'chest': .12}
        elif z < .94:
            if z < .21:
                weights = {'foot.' + side: .8, 'shin.' + side: .2}
            elif z < .57:
                weights = {'shin.' + side: .8, 'thigh.' + side: .2}
            else:
                weights = {'thigh.' + side: .85, 'pelvis': .15}
        elif z < 1.22:
            chest = min(1, max(0, (z - 1.01) / .2))
            weights = {'pelvis': 1 - chest, 'chest': chest}
        else:
            weights = {'chest': 1}
        total = sum(weights.values())
        for name, weight in weights.items():
            if weight > 0:
                obj.vertex_groups[name].add([vertex.index], weight / total, 'REPLACE')


def build_candidate(args, paths, paint=None, garment_paint=None):
    import bpy
    from mathutils import Vector

    root = Path(args.root).resolve()
    source_path = (root / args.source).resolve()
    landmark_path = (root / args.landmarks).resolve()
    if not within(source_path, root / 'tools' / 'blender') or not within(landmark_path, root / 'tools' / 'blender'):
        raise ValueError('Candidate input must be committed Blender JSON')
    source = json.loads(source_path.read_text(encoding='utf-8'))
    landmarks = json.loads(landmark_path.read_text(encoding='utf-8'))
    reference = (root / landmarks['reference']['path']).resolve()
    if not within(reference, root / 'public' / 'assets' / 'reference') or sha(reference) != landmarks['reference']['sha256']:
        raise ValueError('Approved reference changed')
    donor = root / 'public/assets/models/wasteland/crew/rook.glb'
    output = Path(paths['glb'][0]).parent
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(donor))
    rig = next((obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'), None)
    clips = ('idle', 'walk', 'sprint', 'jump', 'knockdown', 'get-up',
             'aim', 'fire', 'reload', 'repair', 'enter', 'exit')
    if rig is None or {track.name for track in rig.animation_data.nla_tracks} != set(clips):
        raise ValueError('The local Rook animation donor lacks the exact twelve clips')
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
    charts, maps = candidate_atlases(output)
    if paint:
        bake_face_paint(maps['basecolor'], paint)
    if garment_paint:
        bake_garment_paint(maps['basecolor'], garment_paint, charts)
    material = bpy.data.materials.new('Rook P2 painted atlas')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    shader = nodes.get('Principled BSDF')
    def image_node(kind, colorspace):
        image = bpy.data.images.load(str(maps[kind]), check_existing=False)
        image.colorspace_settings.name = colorspace
        node = nodes.new('ShaderNodeTexImage')
        node.name = kind
        node.image = image
        return node
    color = image_node('basecolor', 'sRGB')
    links.new(color.outputs['Color'], shader.inputs['Base Color'])
    surface = image_node('surface', 'Non-Color')
    split = nodes.new('ShaderNodeSeparateColor')
    links.new(surface.outputs['Color'], split.inputs['Color'])
    links.new(split.outputs['Green'], shader.inputs['Roughness'])
    links.new(split.outputs['Blue'], shader.inputs['Metallic'])
    normal = image_node('normal', 'Non-Color')
    normal_map = nodes.new('ShaderNodeNormalMap')
    links.new(normal.outputs['Color'], normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'], shader.inputs['Normal'])
    parts = []
    chart_parts = {label: [] for label in charts}
    for source_item in source['meshes']:
        if source_item['lod'] != 'near':
            continue
        for item in candidate_body_sections(source_item):
            mesh = bpy.data.meshes.new(item['name'])
            mesh.from_pydata(item['vertices'], [], item['faces'])
            mesh.update()
            obj = bpy.data.objects.new(item['name'], mesh)
            bpy.context.scene.collection.objects.link(obj)
            mesh.materials.append(material)
            for polygon in mesh.polygons:
                polygon.use_smooth = True
            uv = mesh.uv_layers.new(name='UV0')
            mesh.uv_layers.active = uv
            mesh.uv_layers.active_index = 0
            chart_parts[candidate_chart(item['role'])].append(obj)
            candidate_weight_groups(obj, rig, item['role'])
            parts.append(obj)
    # Smart-project each authored role family *together* into its private chart.
    # The multi-object operation packs the two pockets and the scalp clumps as
    # distinct islands, instead of making every polygon reuse one box plane.
    for label, objects in chart_parts.items():
        if not objects:
            continue
        if label == 'face':
            for obj in objects:
                candidate_face_uv(obj, charts[label])
        elif label == 'jacket':
            for obj in objects:
                candidate_jacket_uv(obj, charts[label])
        elif label == 'trousers':
            for obj in objects:
                candidate_trouser_uv(obj, charts[label])
        else:
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = objects[0]
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.smart_project(island_margin=.28 if label in ('vest-left', 'vest-right') else
                                     .18 if label in ('hair', 'pockets') else .085)
            bpy.ops.object.mode_set(mode='OBJECT')
        x0, y0, x1, y1 = charts[label]['boundsPx']
        if label in ('vest-left', 'vest-right'):
            count, scale = candidate_pack_islands(objects, charts[label])
            charts[label]['seams'].append(f'{count} sewn UV islands packed at common scale {scale}')
        elif label == 'jacket':
            panel_width = 104
            for panel in range(4):
                left = x0 + 8 + panel * (panel_width + 16)
                panel_chart = {'role': f'jacket-panel-{panel}',
                               'boundsPx': [left, y0 + 8, left + panel_width, y1 - 8]}
                def in_panel(polygon, mesh, layer, start=left):
                    pixel_x = sum(layer.data[index].uv.x * 1024 for index in polygon.loop_indices) / len(polygon.loop_indices)
                    return start <= pixel_x <= start + panel_width
                count, scale = candidate_pack_islands(objects, panel_chart, face_filter=in_panel, atlas_input=True)
                charts[label]['seams'].append(f'panel {panel}: {count} islands at common scale {scale}')
        elif label not in ('face', 'jacket', 'trousers'):
            for obj in objects:
                layer = obj.data.uv_layers['UV0']
                layer.active = True
                layer.active_render = True
                for corner in layer.data:
                    u, v = corner.uv
                    corner.uv = ((x0 + 4 + u * (x1 - x0 - 8)) / 1024,
                                 1 - (y0 + 4 + v * (y1 - y0 - 8)) / 1024)
        area = 0
        for obj in objects:
            layer = obj.data.uv_layers['UV0']
            for poly in obj.data.polygons:
                points = [layer.data[index].uv for index in poly.loop_indices]
                for corner in range(1, len(points) - 1):
                    a, b, c = points[0], points[corner], points[corner + 1]
                    area += abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) * 1024 * 1024 / 2
        charts[label]['areaPx'] = round(area, 2)
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    near = bpy.context.view_layer.objects.active
    near.name = 'rook-near'
    near['lod'] = 'near'
    near.data.uv_layers.active = near.data.uv_layers['UV0']
    near.data.uv_layers.active_index = list(near.data.uv_layers).index(near.data.uv_layers['UV0'])
    near.data.calc_loop_triangles()
    near_triangles = len(near.data.loop_triangles)
    if near_triangles > 8000:
        raise ValueError(f'Near candidate exceeds 8000 triangles: {near_triangles}')
    far = near.copy()
    far.data = near.data.copy()
    far.name = 'rook-far'
    far['lod'] = 'far'
    bpy.context.scene.collection.objects.link(far)
    bpy.context.view_layer.objects.active = far
    decimate = far.modifiers.new('Reviewed distant silhouette', 'DECIMATE')
    decimate.ratio = min(1, 1850 / near_triangles)
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    far.data.calc_loop_triangles()
    far_triangles = len(far.data.loop_triangles)
    if far_triangles < 501 or far_triangles > 2000:
        raise ValueError(f'Far candidate outside 501..2000 triangles: {far_triangles}')
    for obj in (near, far):
        obj.parent = rig
        armature = obj.modifiers.new('Bound Rook skin', 'ARMATURE')
        armature.object = rig
    far.hide_render = True
    bpy.ops.object.select_all(action='DESELECT')
    for obj in (rig, near, far):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    glb = Path(paths['glb'][0])
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                              export_yup=True, export_animations=True,
                              export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                              export_skins=True, export_materials='EXPORT', export_extras=True)
    bpy.ops.wm.save_as_mainfile(filepath=paths['blend'][0])
    manifest = {
        'stage': 'candidate', 'sourceSha256': sha(source_path),
        'landmarksSha256': sha(landmark_path), 'referenceSha256': sha(reference),
        'animationDonor': {'path': donor.relative_to(root).as_posix(), 'sha256': sha(donor), 'clipNames': list(clips)},
        'outputs': {'blend': Path(paths['blend'][0]).relative_to(root).as_posix(),
                    'glb': glb.relative_to(root).as_posix(),
                    'textures': {kind: path.relative_to(root).as_posix() for kind, path in maps.items()}},
        'asset': {'sha256': sha(glb), 'nearTriangles': near_triangles, 'farTriangles': far_triangles,
                  'materials': 1, 'draws': 2, 'textureSize': [1024, 1024], 'clipNames': list(clips),
                  'uvChannel': 'UV0', 'charts': list(charts.values())},
    }
    if paint:
        manifest['paint'] = {'face': {
            'sourcePath': paint['source'].relative_to(root).as_posix(),
            'sourceSha256': sha(paint['source']),
            'calibrationPath': paint['calibration'].relative_to(root).as_posix(),
            'calibrationSha256': sha(paint['calibration']),
            'targetChartBoundsPx': paint['data']['target']['boundsPx'],
            'basecolorSha256': sha(maps['basecolor']),
            'method': paint['data']['method'],
        }}
    if garment_paint:
        manifest.setdefault('paint', {})['garments'] = {
            'sourcePath': garment_paint['source'].relative_to(root).as_posix(),
            'sourceSha256': sha(garment_paint['source']),
            'calibrationPath': garment_paint['calibration'].relative_to(root).as_posix(),
            'calibrationSha256': sha(garment_paint['calibration']),
            'basecolorSha256': sha(maps['basecolor']),
            'method': garment_paint['data']['method'],
            'roles': {role: target['source'] for role, target in garment_paint['data']['targets'].items()},
        }
    with Path(paths['evidence'][0]).open('w', encoding='utf-8', newline='\n') as target:
        target.write(json.dumps(manifest, indent=2) + '\n')
    # Review the exported GLB itself. These captures are not neutral-source
    # renders and use the same 5 m, 28 degree, 432x576 game review camera.
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    review_rig = next((obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'), None)
    if review_rig is None or review_rig.animation_data is None:
        raise ValueError('Exported candidate cannot be reopened with its rig')
    idle = next((strip.action for track in review_rig.animation_data.nla_tracks
                 for strip in track.strips if track.name == 'idle'), None)
    if idle is None:
        raise ValueError('Exported candidate lacks idle for review')
    review_rig.animation_data.action = idle
    for track in review_rig.animation_data.nla_tracks:
        track.mute = True
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and obj.get('lod') == 'far':
            obj.hide_render = True
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.render.resolution_x, scene.render.resolution_y = 432, 576
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world.color = (.25, .25, .25)
    camera_data = bpy.data.cameras.new('Five metre game review camera')
    camera = bpy.data.objects.new('Five metre game review camera', camera_data)
    scene.collection.objects.link(camera)
    camera_data.type = 'PERSP'
    camera_data.sensor_fit = 'VERTICAL'
    camera_data.sensor_height = 32
    import math
    camera_data.lens = 32 / (2 * math.tan(math.radians(28) / 2))
    camera.location = (0, -5, .96)
    camera.rotation_euler = (Vector((0, 0, .96)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.012))
    floor = bpy.context.object
    floor.name = 'Neutral review floor'
    floor_material = bpy.data.materials.new('Review neutral grey')
    floor_material.diffuse_color = (.22, .22, .22, 1)
    floor.data.materials.append(floor_material)
    for label, location, energy, size in [('Key', (-3, -4, 6), 500, 4),
                                          ('Fill', (3, -2, 3), 240, 5),
                                          ('Rim', (0, 3, 4), 350, 3)]:
        light_data = bpy.data.lights.new(label, 'AREA')
        light = bpy.data.objects.new(label, light_data)
        scene.collection.objects.link(light)
        light.location, light_data.energy, light_data.size = location, energy, size
        light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.frame_set(7)
    captures = []
    for view, yaw, camera_position in [('front', 0, (0, -5, .96)),
                                        ('side', math.pi / 2, (-5, 0, .96)),
                                        ('back', math.pi, (0, 5, .96))]:
        camera.location = camera_position
        camera.rotation_euler = (Vector((0, 0, .96)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        path = output / f'blender-rook-idle-{view}.png'
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        captures.append({'clip': 'idle', 'time': .25, 'view': view, 'yaw': yaw,
                         'path': path.relative_to(root).as_posix(), 'sha256': sha(path)})
    review_manifest = {
        'asset': {'path': glb.relative_to(root).as_posix(), 'sha256': sha(glb)},
        'reference': {'path': reference.relative_to(root).as_posix(), 'sha256': sha(reference),
                      'crops': [{'view': view, 'crop': landmarks['views'][view]['crop']}
                                for view in ('front', 'side', 'back')]},
        'camera': {'position': [0, .96, 5], 'target': [0, .96, 0],
                   'verticalFov': 28, 'width': 432, 'height': 576},
        'captures': captures,
    }
    with Path(paths['evidence'][1]).open('w', encoding='utf-8', newline='\n') as target:
        target.write(json.dumps(review_manifest, indent=2) + '\n')
    print(json.dumps({'stage': 'candidate', 'nearTriangles': near_triangles, 'farTriangles': far_triangles,
                      'glb': str(glb), 'sha256': manifest['asset']['sha256']}))


def build(args, paths):
    # This import belongs after --paths-only and all path validation.
    import bpy
    from mathutils import Vector

    root = Path(args.root).resolve()
    source_path = (root / args.source).resolve()
    landmark_path = (root / args.landmarks).resolve()
    if not within(source_path, root / 'tools' / 'blender') or not within(landmark_path, root / 'tools' / 'blender'):
        raise ValueError('Neutral input must be the committed Blender JSON under tools/blender')
    source = json.loads(source_path.read_text(encoding='utf-8'))
    landmarks = json.loads(landmark_path.read_text(encoding='utf-8'))
    reference = (root / landmarks['reference']['path']).resolve()
    if not within(reference, root / 'public' / 'assets' / 'reference'):
        raise ValueError('Landmark reference is outside the approved local reference folder')
    if sha(reference) != landmarks['reference']['sha256']:
        raise ValueError('Approved reference changed')
    if source['version'] != 1 or source['units'] != 'metres' or source['coordinates'] != 'blender-z-up' or source['height'] != 1.83:
        raise ValueError('Unsupported neutral source coordinates or height')
    if landmarks['version'] != 1 or landmarks['height'] != 1.83:
        raise ValueError('Unsupported Rook landmarks')

    output = Path(paths['blend'][0]).parent
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for item in source['meshes']:
        mesh = bpy.data.meshes.new(item['name'])
        mesh.from_pydata(item['vertices'], [], item['faces'])
        mesh.update()
        obj = bpy.data.objects.new(item['name'], mesh)
        bpy.context.scene.collection.objects.link(obj)
        obj['rookRole'] = item['role']
        obj['lod'] = item['lod']
        if item['lod'] == 'far' or args.isolate == 'boots' and not item['role'].startswith('boot'):
            obj.hide_render = True
            obj.hide_set(True)
        else:
            tone = {
                'body-core': .49, 'jacket': .36, 'vest-left': .56,
                'vest-right': .56, 'scarf': .53, 'trousers': .33,
                'boots': .23, 'boot-trim': .12, 'boot-lace': .06,
                'pack': .49, 'pocket': .54,
                'strap': .47, 'glove': .26, 'hair': .19, 'face': .22,
                'skin': .48,
            }.get(item['role'], .42)
            neutral = bpy.data.materials.get(f"Neutral {item['role']}")
            if neutral is None:
                neutral = bpy.data.materials.new(f"Neutral {item['role']}")
                neutral.diffuse_color = (tone, tone, tone, 1)
                neutral.use_nodes = True
                neutral.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (tone, tone, tone, 1)
                neutral.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .91
            obj.data.materials.append(neutral)
            for polygon in mesh.polygons:
                polygon.use_smooth = True

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.render.resolution_x = 500 if args.isolate in ('boots', 'torso', 'head') else 300
    scene.render.resolution_y = 500 if args.isolate in ('torso', 'head') else 300 if args.isolate == 'boots' else 761
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.world.color = (.62, .60, .56)
    camera_data = bpy.data.cameras.new('Reference scale orthographic camera')
    camera = bpy.data.objects.new('Reference scale orthographic camera', camera_data)
    scene.collection.objects.link(camera)
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = (300 / (761 / 2.37) if args.isolate == 'boots'
                               else 1.02 if args.isolate == 'torso' else .52 if args.isolate == 'head'
                               else 761 * 1.83 / 578)
    scene.camera = camera
    for name, position, power in [('Key', (-3, -4, 5), 650), ('Fill', (3, -2, 3), 340), ('Rim', (1, 4, 4), 480)]:
        light_data = bpy.data.lights.new(name, 'AREA')
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = position
        light_data.energy = power
        light_data.shape = 'DISK'
        light_data.size = 4
        light.rotation_euler = (Vector((0, 0, .9)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    # Rook's approved profile faces right: looking from -X puts model front
    # (-Y) at image right. +X would silently mirror the reference comparison.
    target_height = (.16 if args.isolate == 'boots' else 1.30 if args.isolate == 'torso'
                     else 1.62 if args.isolate == 'head'
                     else (641 - 761 / 2) * 1.83 / 578)
    views = [('front', (0, -6, target_height)), ('side', (-6, 0, target_height)),
             ('three-quarter', (-4, -5, target_height + .5))] if args.isolate == 'boots' else [
             ('front', (0, -6, target_height)), ('side', (-6, 0, target_height)),
             ('back', (0, 6, target_height))]
    if args.isolate in ('torso', 'head'):
        views = [('front', (0, -6, target_height)),
                 ('side', (-6, 0, target_height)),
                 ('three-quarter', (-4, -5, target_height))]
    prefix = 'boot' if args.isolate == 'boots' else 'torso' if args.isolate == 'torso' else 'head' if args.isolate == 'head' else 'neutral'
    for view, position in views:
        camera.location = position
        camera.rotation_euler = (Vector((0, 0, target_height)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(output / f'{prefix}-{view}.png')
        bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=paths['blend'][0])
    totals = {'near': 0, 'far': 0}
    for item in source['meshes']:
        totals[item['lod']] += sum(len(face) - 2 for face in item['faces'])
    manifest = {
        'task': 'GFX-01-P2', 'stage': 'neutral-boots' if args.isolate == 'boots' else 'neutral-torso' if args.isolate == 'torso' else 'neutral-head' if args.isolate == 'head' else 'neutral',
        'blender': bpy.app.version_string,
        'source': {'path': source_path.relative_to(root).as_posix(), 'sha256': sha(source_path)},
        'landmarks': {'path': landmark_path.relative_to(root).as_posix(), 'sha256': sha(landmark_path)},
        'reference': {'path': reference.relative_to(root).as_posix(), 'sha256': sha(reference)},
        'heightMetres': 1.83, 'controlTriangles': totals,
        'camera': {'kind': 'orthographic', 'scaleMetres': camera_data.ortho_scale,
                   'targetHeightMetres': target_height,
                   'renderPixels': [scene.render.resolution_x, scene.render.resolution_y],
                   'views': [view for view, _ in views],
                   'sideFrom': '-X', 'physicalFront': '-Y', 'profileFaces': 'right'},
        'glb': [], 'textures': [],
        'outputs': {path.name: sha(path) for path in (output / f'{prefix}-{view}.png' for view, _ in views)},
    }
    manifest_path = output / ('boot-manifest.json' if args.isolate == 'boots' else 'torso-manifest.json' if args.isolate == 'torso' else 'head-manifest.json' if args.isolate == 'head' else 'manifest.json')
    with manifest_path.open('w', encoding='utf-8', newline='\n') as target:
        target.write(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest))


def main():
    args = arguments()
    paths = plan(args)
    paint = validate_paint(args)
    garment_paint = validate_garment_paint(args)
    if args.paths_only:
        print(json.dumps(paths))
        return
    if args.stage == 'candidate':
        build_candidate(args, paths, paint, garment_paint)
    else:
        build(args, paths)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(2)
