import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const catalogPath = new URL('./art/catalog.json', import.meta.url);
assert.equal(existsSync(catalogPath), true, 'the governed art catalog exists');

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
assert.equal(catalog.version, 1);
assert.ok(Array.isArray(catalog.assets));
const ids = catalog.assets.map(asset => asset.id);
assert.equal(new Set(ids).size, ids.length, 'catalog IDs stay unique');

// Kyle picked Surface A and Props A on 26 September 2026 (EGG-03 art).
const candidates = [
  'polyhaven-brown-mud-02',
  'polyhaven-muddy-tracks',
  'quaternius-ultimate-nature-pack',
  'kenney-nature-kit',
  'polyhaven-boulder-01',
];
const selected = ['polyhaven-brown-mud-02', 'quaternius-ultimate-nature-pack'];
const phaseSix = catalog.assets.filter(asset => asset.card === 'EGG-03-P6');
assert.deepEqual(phaseSix.map(asset => asset.id), candidates,
  'the catalog keeps the five reviewed candidates in review order');
for (const asset of phaseSix) {
  assert.match(asset.sourcePage, /^https:\/\//);
  assert.equal(asset.license, 'CC0-1.0');
  assert.ok(['surface', 'props'].includes(asset.family));
  assert.ok(typeof asset.author === 'string' && asset.author.length > 0);
  if (selected.includes(asset.id)) {
    assert.equal(asset.status, 'selected', `${asset.id} is Kyle's pick`);
    assert.equal(asset.downloaded, true);
    assert.match(asset.decision, /Kyle/);
    assert.match(asset.library, /^C:\\Users\\kyleb\\dev\\art-library\\/,
      'sources live in the art library outside the repository');
    assert.ok(Array.isArray(asset.files) && asset.files.length > 0);
    for (const file of asset.files) {
      assert.match(file.sha256, /^[0-9a-f]{64}$/, `${file.path} has a checksum`);
      assert.ok(!file.path.includes(':') && !file.path.startsWith('/'),
        'file paths are relative to the library folder');
    }
    assert.ok(Array.isArray(asset.runtime) && asset.runtime.length > 0,
      'a selected source names what the game loads from it');
    for (const path of asset.runtime)
      assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} exists`);
  } else {
    assert.equal(asset.status, 'declined', `${asset.id} was not picked`);
    assert.equal(asset.downloaded, false);
  }
}

console.log(`Art sourcing: ${selected.length} selected and ${phaseSix.length - selected.length} declined EGG-03 sources checked.`);
