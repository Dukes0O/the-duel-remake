"""Make the study-only Big Bess GLB. Paint in the source-photo coordinate system."""
import argparse
from io import BytesIO
import json
from pathlib import Path
import struct

import numpy as np
from PIL import Image, ImageDraw


# Channel G is linear roughness and B is metalness in glTF. Rust stays matte.
# Polygon coordinates refer to the original side (1400 x 700) and front
# (820 x 749) photos. The drawn masks are reduced after painting to soften edges.
MASKS = {
    'side': [
        ((0, 143, 3), [(94, 361), (238, 328), (368, 328), (366, 428), (107, 435)]),
        ((0, 61, 0), [(201, 265), (265, 257), (252, 318), (194, 322)]),
        ((0, 54, 0), [(284, 258), (351, 255), (350, 311), (277, 314)]),
        ((0, 143, 3), [(463, 312), (527, 293), (557, 305), (572, 373), (485, 388)]),
        ((0, 154, 4), [(623, 318), (889, 286), (901, 346), (622, 387)]),
    ],
    'front': [
        ((0, 154, 4), [(233, 352), (350, 330), (477, 330), (579, 347), (570, 367), (243, 369)]),
        ((0, 53, 0), [(276, 248), (397, 241), (396, 311), (266, 315)]),
        ((0, 53, 0), [(423, 242), (539, 245), (551, 315), (423, 310)]),
        ((0, 109, 84), [(130, 487), (168, 482), (173, 466), (184, 453), (220, 444), (595, 443),
                         (637, 453), (644, 467), (638, 478), (623, 473), (612, 461), (224, 462),
                         (199, 468), (195, 486), (187, 498), (133, 500)]),
    ],
}


def read_glb(path):
    data = path.read_bytes()
    magic, version, length, n, tag = struct.unpack_from('<4sIII4s', data)
    if (magic, version, length, tag) != (b'glTF', 2, len(data), b'JSON'):
        raise ValueError(f'Unexpected glTF header in {path}')
    gltf = json.loads(data[20:20 + n])
    size, tag = struct.unpack_from('<I4s', data, 20 + n)
    if tag != b'BIN\0':
        raise ValueError('Expected embedded images and geometry')
    return gltf, bytearray(data[28 + n:28 + n + size])


def embed_maps(source, dest):
    gltf, binary = read_glb(source)
    base_size = source.stat().st_size
    for view, areas in MASKS.items():
        name = 'Photo / big-bess-' + view
        material = next(m for m in gltf['materials'] if m['name'] == name)
        pbr = material['pbrMetallicRoughness']
        ref = gltf['textures'][pbr['baseColorTexture']['index']]
        offset = gltf['bufferViews'][gltf['images'][ref['source']]['bufferView']]
        start = offset.get('byteOffset', 0)
        size = Image.open(BytesIO(binary[start:start + offset['byteLength']])).size
        mask = Image.new('RGB', size, (0, 230, 0))
        paint = ImageDraw.Draw(mask)
        for channels, points in areas:
            paint.polygon(points, fill=channels)
        mask = mask.resize(tuple((n + 2) // 4 for n in size), Image.Resampling.LANCZOS)
        stream = BytesIO()
        mask.save(stream, 'PNG', optimize=True)
        png = stream.getvalue()
        # Align each glTF bufferView to four bytes.
        binary.extend(b'\0' * (-len(binary) % 4))
        gltf['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(png)})
        binary.extend(png)
        gltf['images'].append({'name': view + '-roughness-metalness', 'mimeType': 'image/png',
                               'bufferView': len(gltf['bufferViews']) - 1})
        texture = {**ref, 'source': len(gltf['images']) - 1}
        gltf['textures'].append(texture)
        pbr.update(roughnessFactor=1, metallicFactor=1, metallicRoughnessTexture={'index': len(gltf['textures']) - 1})
        print(view, mask.size, 'packed bytes', len(png))
    gltf['buffers'][0]['byteLength'] = len(binary)
    binary.extend(b'\0' * (-len(binary) % 4))
    header = json.dumps(gltf, separators=(',', ':')).encode()
    header += b' ' * (-len(header) % 4)
    dest.write_bytes(struct.pack('<4sIII4s', b'glTF', 2, 28 + len(header) + len(binary), len(header), b'JSON')
                     + header + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
    print('GLB bytes', base_size, 'to', dest.stat().st_size)


def paint_road(output):
    """Two dry wheel tracks through the gate, in metres. G holds their dusty shoulders."""
    metres = (np.arange(512) + .5) / 512 * 48 - 24
    x, y = np.meshgrid(metres, metres[::-1])
    centre = -.65 + .16 * (y + 4.8) + .38 * np.sin((y + 4.8) / 4.2)
    rng = np.random.default_rng(18)
    grain = rng.uniform(.63, 1, x.shape)
    # Broken impressions where the approach changes from dust to hardpack.
    # Separate left/right variation avoids a pair of ruler-straight rails.
    bursts = Image.fromarray(rng.integers(15, 255, (45, 32), dtype=np.uint8))
    bursts = np.asarray(bursts.resize((512, 512), Image.Resampling.BICUBIC)) / 255
    grain *= np.clip((bursts - .21) * 1.6, 0, 1)
    sway = .09 * np.sin(y * 2.36) + .035 * np.sin(y * 8.3)
    distance = np.abs(np.abs(x - centre - sway) - 1.09)
    wear = np.exp(-(distance / .51) ** 4) * grain
    shoulders = np.exp(-((distance - .65) / .24) ** 2) * grain
    fade = np.clip((24 - np.abs(y)) / 5, 0, 1)
    rgb = np.stack((wear * fade, shoulders * fade, np.zeros_like(wear)), axis=2)
    Image.fromarray(np.uint8(255 * rgb)).save(output / 'gate-road-mask.png', optimize=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='Evidence directory')
    out = parser.parse_args().output
    out.mkdir(parents=True, exist_ok=True)
    embed_maps(Path('public/assets/models/wasteland/scablands/big-bess.glb'), out / 'big-bess-trial.glb')
    paint_road(out)
