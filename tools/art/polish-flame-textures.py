"""Fit verified Kenney CC0 particle sources into tiny runtime textures."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--library', default='C:/Users/kyleb/dev/art-library/kenney-particle-pack')
args = parser.parse_args()
root, library = Path(args.root), Path(args.library)
catalog_path = root / 'tools/art/catalog.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
prior = next((record for record in catalog['assets'] if record['id'] == 'kenney-particle-pack-flame'), None)
if prior:
    for file in prior['files']:
        actual = hashlib.sha256((library / file['path']).read_bytes()).hexdigest()
        assert actual == file['sha256'], 'Approved original changed: ' + file['path']
license_path = library / 'unpacked/License.txt'
assert 'Creative Commons Zero, CC0' in license_path.read_text(encoding='utf-8')
source = library / 'unpacked/PNG (Transparent)'
output = root / 'public/assets/textures'
output.mkdir(parents=True, exist_ok=True)
flames = ['flame_01.png', 'flame_02.png', 'flame_03.png', 'flame_04.png']
names = flames + ['smoke_03.png', 'scorch_01.png']

def fitted(name):
    image = Image.open(source / name).convert('RGBA')
    assert image.size == (512, 512)
    image = image.resize((120, 120), Image.Resampling.LANCZOS)
    tile = Image.new('RGBA', (128, 128))
    tile.paste(image, (4, 4))
    return tile

atlas = Image.new('RGBA', (512, 128))
for index, name in enumerate(flames):
    atlas.paste(fitted(name), (index * 128, 0))
atlas.save(output / 'flamethrower-tongues.png', optimize=True)
for name, target in [('smoke_03.png', 'flamethrower-smoke.png'), ('scorch_01.png', 'flamethrower-scorch.png')]:
    fitted(name).save(output / target, optimize=True)

def pin(path):
    data = path.read_bytes()
    return {'path': path.relative_to(library).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}

record = {'id': 'kenney-particle-pack-flame', 'card': 'POLISH-FLAME', 'family': 'effects',
    'sourcePage': 'https://kenney.nl/assets/particle-pack', 'author': 'Kenney Vleugels',
    'license': 'CC0-1.0', 'licenseEvidence': 'Official source page and downloaded original License.txt both grant Creative Commons Zero.',
    'status': 'selected', 'downloaded': True, 'checked': '2026-10-09',
    'library': str(library.resolve()),
    'downloadedFrom': 'https://kenney.nl/media/pages/assets/particle-pack/f8fe0f8cb8-1677578741/kenney_particle-pack.zip',
    'files': [pin(license_path), pin(library / 'source-page.html'), pin(library / 'kenney_particle-pack.zip')] + [pin(source / name) for name in names],
    'recipe': 'tools/art/polish-flame-textures.py',
    'fit': 'Four native wispy flame silhouettes and smoke/scorch reduced to 120 px in padded 128 px tiles; native RGBA preserved, runtime flame shading adds amber heat.',
    'runtime': ['public/assets/textures/flamethrower-' + name + '.png' for name in ['tongues', 'smoke', 'scorch']]}
catalog_path = root / 'tools/art/catalog.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
catalog['assets'] = [item for item in catalog['assets'] if item['id'] != record['id']] + [record]
catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
for name in record['runtime']:
    path = root / name
    print(name, path.stat().st_size, hashlib.sha256(path.read_bytes()).hexdigest())

# The main menu opens this existing credits page; keep prior audio text intact.
html_path = root / 'public/assets/audio/credits.html'
html = html_path.read_text(encoding='utf-8')
credit = '<h2 id="particle-flames">Flamethrower particles</h2><p><a href="https://kenney.nl/assets/particle-pack">Particle Pack</a> by <strong>Kenney Vleugels</strong>, released under <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>. Four wispy flame silhouettes, smoke and scorch are resized into small padded textures; the game adds amber shading and animation. No author endorsement is implied.</p>'
if 'id="particle-flames"' not in html:
    html = html.replace('<h2>Original sound design</h2>', credit + '<h2>Original sound design</h2>')
    html_path.write_text(html, encoding='utf-8', newline='\n')
credits_path = root / 'public/assets/audio/CREDITS.md'
credits = credits_path.read_text(encoding='utf-8')
if '## Flamethrower particles' not in credits:
    credits += '\n## Flamethrower particles\n\n[Particle Pack](https://kenney.nl/assets/particle-pack) by Kenney Vleugels. CC0 1.0. Four native wispy flame silhouettes, smoke and scorch are resized to padded 128 px tiles. The renderer adds amber shading and time-driven animation. Recipe: tools/art/polish-flame-textures.py. Original license and exact source hashes: tools/art/catalog.json, kenney-particle-pack-flame.\n'
    credits_path.write_text(credits, encoding='utf-8', newline='\n')
