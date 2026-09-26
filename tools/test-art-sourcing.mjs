import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const catalogPath = new URL('./art/catalog.json', import.meta.url);
const shortlistPath = new URL('../docs/board/looks/muddy-hollow/phase-6-source-shortlist.md', import.meta.url);
assert.equal(existsSync(catalogPath), true, 'the governed art catalog exists');
assert.equal(existsSync(shortlistPath), true, 'the phase-six shortlist exists');

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
assert.equal(catalog.version, 1);
assert.ok(Array.isArray(catalog.assets));
const ids = catalog.assets.map(asset => asset.id);
assert.equal(new Set(ids).size, ids.length, 'catalog IDs stay unique');

const required = [
  'polyhaven-brown-mud-02',
  'polyhaven-muddy-tracks',
  'quaternius-ultimate-nature-pack',
  'kenney-nature-kit',
  'polyhaven-boulder-01',
];
const phaseSix = catalog.assets.filter(asset => asset.card === 'EGG-03-P6');
assert.deepEqual(phaseSix.map(asset => asset.id), required,
  'the shortlist records the settled five candidates in review order');
for (const asset of phaseSix) {
  assert.match(asset.sourcePage, /^https:\/\//);
  assert.match(asset.previewImage, /^https:\/\//);
  assert.equal(asset.license, 'CC0-1.0');
  assert.equal(asset.status, 'candidate');
  assert.equal(asset.downloaded, false);
  assert.equal(asset.sha256, null,
    'a candidate has no checksum until Kyle selects and the source is downloaded');
  assert.ok(['surface', 'props'].includes(asset.family));
  assert.ok(typeof asset.author === 'string' && asset.author.length > 0);
  assert.ok(typeof asset.fit === 'string' && asset.fit.length > 0);
  assert.ok(typeof asset.risk === 'string' && asset.risk.length > 0);
}

const shortlist = readFileSync(shortlistPath, 'utf8');
for (const id of required) assert.match(shortlist, new RegExp(`\\b${id}\\b`));
assert.match(shortlist, /Decision needed from Kyle/);
assert.match(shortlist, /Recommended pair/);
assert.match(shortlist, /No adaptation or download has started/);

console.log(`Art sourcing: ${phaseSix.length} licensed EGG-03 phase-six candidates and one Kyle decision gate passed.`);
