import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const library = resolve('C:/Users/kyleb/dev/art-library/kenney-factory-kit');
const modelPath = 'unpacked/Models/GLB format/pipe-large-valve.glb';
const pinned = [
  {path: 'source.zip', bytes: 4511890, sha256: '7e31fb2308e90304672bd15cd18fa9d9f02c03731a8cbc57a8e3e1c181dfb0a7'},
  {path: 'unpacked/License.txt', bytes: 700, sha256: '61e86565dd297e143ad631594980eda0a17fc81a4cd7c6d71acf2f5e0cad30b6'},
  {path: 'unpacked/Models/GLB format/Textures/colormap.png', bytes: 11813, sha256: '35d7bd6900dde0208429eeaec87fa17fbf024ed59f3f4eab54bc92802eba9dd7'},
  {path: modelPath, bytes: 42604, sha256: '57126374dce5b172e06d5d6f8cbaab97c9cffe3e5e726060eb14c50a5bd519b6'},
];
const failures = [];
let checks = 0;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => sha256(JSON.stringify(value));
function check(label, action) {
  checks++;
  try { action(); } catch (error) { failures.push(label + ': ' + error.message); }
}
function originalPath(path) {
  assert.equal(isAbsolute(path), false, 'member path must be relative');
  const target = resolve(library, path), rel = relative(library, target);
  assert.ok(rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep),
    'member must remain inside the external original library');
  return target;
}
function verifyPinned(bytes, expected) {
  assert.equal(bytes.length, expected.bytes, expected.path + ' has the original byte length');
  assert.equal(sha256(bytes), expected.sha256, expected.path + ' has the pinned original SHA-256');
}
function rights(bytes) {
  const text = bytes.toString('utf8');
  assert.ok(text.includes('Created/distributed by Kenney'), 'embedded rights identify the original author');
  assert.ok(text.includes('License: (Creative Commons Zero, CC0)'), 'actual embedded rights explicitly grant CC0');
  assert.ok(text.includes('creativecommons.org/publicdomain/zero/1.0/'), 'actual embedded rights identify CC0 1.0');
  assert.ok(text.includes('You can use this content for personal, educational, and commercial purposes.'),
    'actual embedded rights allow commercial use');
}
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value >>> 1 ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function zipMember(bytes, wanted) {
  assert.ok(bytes.length >= 22, 'complete ZIP directory required');
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  assert.ok(end >= Math.max(0, bytes.length - 65557), 'original archive has a valid ZIP directory');
  assert.equal(bytes.readUInt16LE(end + 4), 0, 'archive is a single volume');
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16), result;
  for (let index = 0; index < count; index++) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50, 'archive has an actual central directory entry');
    const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const name = bytes.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name === wanted) {
      assert.equal(result, undefined, 'archive member is unambiguous');
      assert.equal(bytes.readUInt16LE(offset + 8) & 1, 0, 'original member is unencrypted');
      const method = bytes.readUInt16LE(offset + 10), local = bytes.readUInt32LE(offset + 42);
      assert.ok(method === 0 || method === 8, 'original member uses supported ZIP compression');
      assert.equal(bytes.readUInt32LE(local), 0x04034b50, 'original member has its local header');
      const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
      const compressed = bytes.readUInt32LE(offset + 20);
      const encoded = bytes.subarray(start, start + compressed);
      assert.equal(encoded.length, compressed, 'actual original member payload is complete');
      const data = method === 8 ? inflateRawSync(encoded) : encoded;
      assert.equal(data.length, bytes.readUInt32LE(offset + 24), 'member has its declared original length');
      assert.equal(crc32(data), bytes.readUInt32LE(offset + 16), 'member passes actual ZIP CRC');
      result = {data, directoryOffset: offset};
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  assert.ok(result, 'exact original archive member exists: ' + wanted);
  return result;
}
function inspectGlb(bytes) {
  assert.ok(bytes.length >= 28, 'complete actual GLB required');
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', 'source is actual GLB');
  assert.equal(bytes.readUInt32LE(4), 2, 'source is glTF 2');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'actual GLB is complete');
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'actual GLB has its JSON chunk');
  const end = 20 + bytes.readUInt32LE(12), json = JSON.parse(bytes.toString('utf8', 20, end));
  assert.equal(bytes.readUInt32LE(end + 4), 0x004e4942, 'actual geometry has a binary chunk');
  const binaryStart = end + 8, binary = bytes.subarray(binaryStart, binaryStart + bytes.readUInt32LE(end));
  assert.equal(json.buffers.length, 1, 'geometry has one original buffer');
  assert.equal(json.buffers[0].uri, undefined, 'actual geometry does not fetch an external buffer');
  assert.ok(json.buffers[0].byteLength <= binary.length, 'geometry fits the original buffer');
  function accessor(id, components) {
    const data = json.accessors[id], view = json.bufferViews[data?.bufferView];
    assert.ok(data && view && !data.sparse, 'actual geometry accessor exists');
    assert.equal(view.buffer, 0, 'accessor reads the actual original binary');
    assert.equal(data.type, components === 3 ? 'VEC3' : 'SCALAR');
    const width = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[data.componentType];
    assert.ok(width, 'geometry has a supported binary component');
    const stride = view.byteStride || components * width;
    const start = (view.byteOffset || 0) + (data.byteOffset || 0);
    assert.ok(data.count > 0 && start + (data.count - 1) * stride + components * width <= binary.length,
      'actual geometry coordinates are inside the binary');
    const values = [];
    for (let index = 0; index < data.count; index++) {
      const row = [];
      for (let component = 0; component < components; component++) {
        const at = start + index * stride + component * width;
        row.push(data.componentType === 5126 ? binary.readFloatLE(at) : width === 1
          ? binary.readUInt8(at) : width === 2 ? binary.readUInt16LE(at) : binary.readUInt32LE(at));
      }
      values.push(components === 1 ? row[0] : row);
    }
    return {values, start, binaryStart};
  }
  assert.equal(json.meshes.length, 1, 'donor retains its original single valve mesh');
  assert.equal(json.meshes[0].name, 'pipe-large-valve', 'actual original names identify the valve');
  assert.equal(json.nodes[0].mesh, 0, 'actual original node selects valve geometry');
  let triangles = 0;
  const offsets = [];
  for (const primitive of json.meshes[0].primitives) {
    assert.equal(primitive.mode ?? 4, 4, 'actual original uses triangles');
    const positions = accessor(primitive.attributes.POSITION, 3), indices = accessor(primitive.indices, 1);
    assert.ok(positions.values.every(value => value.every(Number.isFinite)), 'actual source positions must be finite');
    assert.equal(indices.values.length % 3, 0, 'actual source triangles are complete');
    assert.ok(indices.values.every(value => Number.isInteger(value) && value >= 0 && value < positions.values.length),
      'actual triangle indices must name original vertices');
    triangles += indices.values.length / 3;
    offsets.push({position: binaryStart + positions.start, index: binaryStart + indices.start});
  }
  assert.equal(triangles, 456, 'actual original valve has exactly 456 triangles');
  assert.equal(json.images[0].uri, 'Textures/colormap.png', 'original material uses the retained source palette');
  assert.ok(!json.skins?.length && !json.animations?.length, 'original is a rigid source donor');
  return {triangles, offsets};
}

const actual = new Map(pinned.map(expected => [expected.path, readFileSync(originalPath(expected.path))]));
for (const expected of pinned) check(expected.path + ' retained actual source bytes', () => verifyPinned(actual.get(expected.path), expected));
check('source library stays outside the repository', () => {
  const rel = relative(root, library);
  assert.ok(isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep), 'licensed originals must remain outside repository');
});
check('actual embedded CC0 rights allow commercial use', () => rights(actual.get('unpacked/License.txt')));
for (const expected of pinned.slice(1)) check(expected.path + ' original ZIP member equality and CRC', () => {
  const member = zipMember(actual.get('source.zip'), expected.path.slice('unpacked/'.length));
  assert.deepEqual(member.data, actual.get(expected.path), 'retained extracted bytes match the actual original archive');
});
check('actual valve geometry has 456 finite valid original triangles', () => inspectGlb(actual.get(modelPath)));
for (const expected of pinned) check(expected.path + ' altered bytes are rejected', () => {
  const corrupted = Buffer.from(actual.get(expected.path)); corrupted[Math.floor(corrupted.length / 2)] ^= 1;
  assert.throws(() => verifyPinned(corrupted, expected), /pinned original SHA-256/);
});
check('proprietary rights cannot masquerade as a CC0 donor', () => {
  const original = actual.get('unpacked/License.txt').toString('utf8');
  const restricted = Buffer.from(original.replace('License: (Creative Commons Zero, CC0)', 'License: All rights reserved'));
  assert.throws(() => rights(restricted), /explicitly grant CC0/);
});
check('noncommercial-only rights cannot qualify as this donor', () => {
  const original = actual.get('unpacked/License.txt').toString('utf8');
  assert.throws(() => rights(Buffer.from(original.replace('You can use this content for personal, educational, and commercial purposes.',
    'Personal and educational use only.'))), /allow commercial use/);
});
check('broken ZIP member CRC is rejected', () => {
  const archive = Buffer.from(actual.get('source.zip'));
  const {directoryOffset} = zipMember(archive, 'License.txt');
  archive.writeUInt32LE((archive.readUInt32LE(directoryOffset + 16) ^ 1) >>> 0, directoryOffset + 16);
  assert.throws(() => zipMember(archive, 'License.txt'), /actual ZIP CRC/);
});
check('truncated actual GLB cannot pass as original geometry', () => {
  assert.throws(() => inspectGlb(actual.get(modelPath).subarray(0, 200)), /actual GLB is complete/);
});
check('invalid original triangle indices are rejected', () => {
  const glb = Buffer.from(actual.get(modelPath));
  const measured = inspectGlb(glb); glb.writeUInt16LE(65535, measured.offsets[0].index);
  assert.throws(() => inspectGlb(glb), /indices must name original vertices/);
});
check('nonfinite original vertex coordinates are rejected', () => {
  const glb = Buffer.from(actual.get(modelPath));
  const measured = inspectGlb(glb); glb.writeFloatLE(NaN, measured.offsets[0].position);
  assert.throws(() => inspectGlb(glb), /source positions must be finite/);
});

const recordPath = join(root, 'tools/art/tanker-valve-source.json');
let record;
check('small retained source recipe exists', () => {
  assert.ok(existsSync(recordPath), 'verified valve donor recipe is missing');
  assert.ok(readFileSync(recordPath).length <= 6000, 'donor recipe stays small and inspectable');
  record = JSON.parse(readFileSync(recordPath, 'utf8'));
});
check('recipe preserves only the independently verified valve source', () => {
  assert.ok(record, 'verified valve donor recipe is missing');
  assert.equal(record.version, 1);
  assert.equal(record.card, 'ART-KEEP-VALVE-DONOR');
  assert.equal(record.catalogId, 'kenney-factory-kit');
  assert.equal(record.source.id, 'kenney-tanker-factory-valve');
  assert.equal(record.source.author, 'Kenney');
  assert.equal(record.source.sourcePage, 'https://kenney.nl/assets/factory-kit');
  assert.equal(record.source.license, 'CC0-1.0');
  assert.equal(resolve(record.source.library), library);
  assert.deepEqual(record.source.files, pinned, 'all four original source records remain exact');
  assert.deepEqual(record.source.model, {path: modelPath, triangles: 456});
  assert.deepEqual(record.runtime, [], 'source recipe cannot claim any installed runtime fitting');
  for (const key of ['sources', 'groups', 'comparison', 'adaptationAllowed'])
    assert.equal(record[key], undefined, 'closed articulated-trailer scope does not enter the new recipe');
});
const catalog = JSON.parse(readFileSync(join(root, 'tools/art/catalog.json'), 'utf8'));
const factory = catalog.assets.find(asset => asset.id === 'kenney-factory-kit');
check('existing Factory catalogue preserves the actual valve source file', () => {
  assert.ok(factory, 'existing Factory catalogue remains present');
  assert.deepEqual(factory.files.find(file => file.path === modelPath), pinned[3],
    'verified pipe-large-valve GLB donor record is missing from the existing catalogue');
});
check('existing Factory catalogue records actual valve inspection', () => {
  assert.deepEqual(factory.inspection.find(item => item.model === 'pipe-large-valve'),
    {model: 'pipe-large-valve', path: modelPath, triangles: 456, evaluatedTriangles: 456, armatures: 0, actions: []},
    'actual 456-triangle valve inspection is missing from the existing catalogue');
});
check('every other catalogue entry stays exactly as reviewed', () => {
  assert.equal(digest(catalog.assets.filter(asset => asset.id !== 'kenney-factory-kit')), '0f2d168ba64a3a99dd7ebe4ab409cd60e13681f96d7fe63d91fa01d7d689c367');
});
check('existing Factory provenance and other source uses stay exact', () => {
  const retained = structuredClone(factory);
  retained.files = retained.files.filter(file => file.path !== modelPath);
  retained.inspection = retained.inspection.filter(item => item.model !== 'pipe-large-valve');
  assert.equal(digest(retained), '1303f58ce92e36bffbcea1b4e345f9616b5d5d51b152ba759837ecd334b12706', 'keep all original Factory source, rights, files and inspection records');
});
for (const obsolete of ['tools/art/tanker-parts-source.json', 'tools/art/tanker-parts-inspect.py',
  'tools/art/tanker-parts-sheet.py', 'tools/test-tanker-parts-sources.mjs'])
  check('closed trailer-search artifact remains excluded: ' + obsolete, () => {
    assert.equal(existsSync(join(root, obsolete)), false, 'closed articulated-trailer acceptance is not imported or weakened');
  });
console.log('Tanker valve source: ' + checks + ' checks, ' + failures.length + ' failures.');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
