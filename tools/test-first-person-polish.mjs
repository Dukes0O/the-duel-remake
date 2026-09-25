import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const generator = join(root, 'tools/blender/first-person-gear.py');
const baseline = join(root, 'public/assets/models/wasteland/first-person/hands/rook.glb');
const testOutput = join(root, 'art-build/first-person-p1/test-proof');
const candidate = process.env.GFX_FIRST_PERSON_P1_CANDIDATE || join(testOutput, 'hands/rook.glb');
const sourcePath = join(root, 'tools/blender/first-person-p1-source.json');
const baselineHashes = {
  cinder: 'e3ca7401c0d12c164b2568a81bf911f5a1e77734746d20bdb19c84f28e846b59',
  dune: '9344e2bef5b742ec867197d5d2e3232d9db216e8368df21d56ce7df852af5120',
  jax: 'fbaf1c018b48ec60b44ed24140dcd85405407a91ee5036e1f9c15cd1389a9c18',
  nell: '1fb7cab26828c990da56e7f3b15ea01ebfa3780c17adb9343b8746077cf5c309',
  odessa: '37ac48919164bb802cae0e86f17d73100bea55fe012c76b5e8627dda0a1d3656',
  rook: '34de29dd6a2fb446cd9b8ac2f48ba5ffa3a0171ce40a331eb427763cd702c02c',
  tusk: 'd341b0ed8851ec3dfd38bffb84dfa878f2ad32d34adffd145190081e802e8044',
  wren: 'ec6c7c21e546a668ff9aa90a3b1911b648463d1f1a36a0bd996a8ce97e414593',
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
let candidateBuild;
function ensureCandidate() {
  if (process.env.GFX_FIRST_PERSON_P1_CANDIDATE) return;
  if (!candidateBuild) {
    const blender = process.env.BLENDER_BIN ||
      'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
    const baselineBefore = Object.fromEntries(Object.keys(baselineHashes).map(crew => [crew,
      sha256(readFileSync(join(root, `public/assets/models/wasteland/first-person/hands/${crew}.glb`)))]));
    const result = spawnSync(blender, ['-b', '--python-exit-code', '1', '--python', generator,
      '--', '--root', root, '--round', '1', '--p1-rook', '--output-dir', testOutput, '--skip-renders'],
    {cwd: root, encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024});
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
    assert.ok(existsSync(candidate), 'isolated Blender run did not export Rook hands');
    for (const [crew, before] of Object.entries(baselineBefore))
      assert.equal(sha256(readFileSync(join(root,
        `public/assets/models/wasteland/first-person/hands/${crew}.glb`))), before,
      `${crew} production bytes changed during the isolated candidate build`);
    candidateBuild = true;
  }
}

function source() {
  assert.ok(existsSync(sourcePath), 'Rook hand proof needs committed, reviewable anatomy input');
  const data = JSON.parse(readFileSync(sourcePath, 'utf8'));
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.units, 'metres');
  assert.equal(data.frame, 'camera-local-x-right-y-up-negative-z-forward');
  assert.ok(data.reference?.path && data.reference?.sha256 && data.reference?.crop);
  assert.equal(sha256(readFileSync(join(root, data.reference.path))), data.reference.sha256,
    'source landmarks must identify the unchanged Rook reference');
  assert.equal(data.atlas?.size, 1024);
  assert.ok(data.atlas.paddingPixels >= 8);
  for (const side of ['R', 'L']) {
    const marks = data.hands?.[side]?.landmarks;
    assert.ok(marks, `${side} hand landmarks missing`);
    for (const name of ['wrist', 'palm', 'thumbRoot', 'thumbWeb', 'thumbTip'])
      assert.ok(Array.isArray(marks[name]) && marks[name].length === 3 &&
        marks[name].every(Number.isFinite), `${side} ${name} needs a finite 3D landmark`);
    for (const digit of ['index', 'middle', 'ring', 'pinky']) {
      assert.ok(Array.isArray(marks.knuckles?.[digit]) && marks.knuckles[digit].every(Number.isFinite));
      assert.ok(Array.isArray(marks.fingertips?.[digit]) && marks.fingertips[digit].every(Number.isFinite));
      const length = Math.hypot(...marks.knuckles[digit].map((value, axis) =>
        value - marks.fingertips[digit][axis]));
      assert.ok(length >= .045 && length <= .105, `${side} ${digit} length left the approved grip envelope`);
    }
    for (const digit of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      const stations = marks.distalStations?.[digit];
      assert.ok(Array.isArray(stations) && stations.length === 2 &&
        stations.every(point => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite)),
      `${side} ${digit} needs two actual terminal centerline stations`);
      const localLength = distance(stations[0], stations[1]);
      assert.ok(localLength >= .006 && localLength <= .015,
        `${side} ${digit} terminal tangent must cover the approved 6–15 mm pad`);
      const end = digit === 'thumb' ? marks.thumbTip : marks.fingertips[digit];
      assert.ok(distance(stations[1], end) <= .003, `${side} ${digit} distal station misses its fingertip`);
    }
    const thumbLength = Math.hypot(...marks.thumbRoot.map((value, axis) => value - marks.thumbTip[axis]));
    assert.ok(thumbLength >= .035 && thumbLength <= .075, `${side} thumb left the approved grip envelope`);
    const grip = side === 'R' ? [.14, -.24, -.55] : [.14, -.24, -.89];
    assert.ok(Math.hypot(...marks.palm.map((value, axis) => value - grip[axis])) < .16,
      `${side} palm landmark no longer describes the unchanged RPG grip`);
  }
  return data;
}

test('all eight production hand assets keep their recorded baseline bytes during the proof', () => {
  for (const [crew, expected] of Object.entries(baselineHashes)) {
    const path = join(root, `public/assets/models/wasteland/first-person/hands/${crew}.glb`);
    assert.equal(sha256(readFileSync(path)), expected, `${crew} runtime hands changed during the isolated proof`);
  }
});

test('hand anatomy input is tied to the Rook reference and unchanged grip envelope', () => {
  source();
});

function python(args) {
  return spawnSync('python', [generator, '--', '--root', root, '--round', '1', ...args],
    {cwd: root, encoding: 'utf8'});
}

test('Rook proof path planning is Blender-free and cannot target public or outside the ignored art folder', () => {
  const output = join(root, 'art-build/first-person-p1/test-candidate');
  const before = existsSync(output);
  const planned = python(['--p1-rook', '--output-dir', output, '--paths-only']);
  assert.equal(planned.status, 0, planned.stderr || planned.stdout);
  const paths = JSON.parse(planned.stdout);
  assert.equal(paths.mode, 'p1-rook');
  assert.equal(resolve(paths.outputDir), output);
  const all = [paths.candidateGlb, paths.candidateBlend, paths.manifest,
    ...Object.values(paths.textures || {})];
  assert.equal(all.length, 6, 'candidate GLB, Blender source, manifest, and three maps need explicit paths');
  assert.ok(all.every(path => resolve(path).startsWith(output + '\\') || resolve(path).startsWith(output + '/')),
    'every candidate output must stay in its own ignored destination');
  assert.ok(paths.sourceJson?.endsWith('tools/blender/first-person-p1-source.json') ||
    paths.sourceJson?.endsWith('tools\\blender\\first-person-p1-source.json'));
  assert.equal(existsSync(output), before, 'dry path planning cannot write');
  for (const bad of [join(root, 'public/assets/models/wasteland/first-person'),
    resolve(root, '..', 'outside-first-person-p1')]) {
    const result = python(['--p1-rook', '--output-dir', bad, '--paths-only']);
    assert.notEqual(result.status, 0, `${bad} must be rejected before Blender or file writes`);
    assert.ok(!existsSync(join(bad, 'rook.glb')), 'rejected destination stayed untouched');
  }
});

async function loadHands(path) {
  assert.ok(existsSync(path), `missing hand proof ${path}`);
  const bytes = readFileSync(path);
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'TEST_EMBEDDED_TEXTURE', loadTexture: () => Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

function glbDocument(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) binary = chunk;
    offset += length + 8;
  }
  assert.ok(json && binary, 'candidate must be a self-contained GLB');
  for (const resource of [...(json.buffers || []), ...(json.images || [])])
    assert.ok(!resource.uri || resource.uri.startsWith('data:'), 'proof may not fetch external resources');
  for (const image of json.images || []) {
    const view = json.bufferViews[image.bufferView];
    const png = image.uri ? Buffer.from(image.uri.split(',')[1], 'base64') :
      binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1024);
    assert.equal(png.readUInt32BE(20), 1024);
  }
  return {json, binary};
}

function embeddedPng(document, name) {
  const image = document.json.images.find(item => item.name?.includes(name));
  assert.ok(image, `missing embedded ${name} map`);
  const view = document.json.bufferViews[image.bufferView];
  return image.uri ? Buffer.from(image.uri.split(',')[1], 'base64') :
    document.binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}

function decodeRgbaPng(png) {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(png[24], 8, 'atlas must use 8-bit color');
  assert.equal(png[25], 6, 'atlas must use RGBA');
  const compressed = [];
  for (let offset = 8; offset < png.length;) {
    const size = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') compressed.push(png.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const raw = inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(width * height * 4), stride = width * 4;
  let input = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[input++];
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - upLeft;
        const a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - upLeft);
        predictor = a <= b && a <= c ? left : b <= c ? up : upLeft;
      }
      assert.ok(filter >= 0 && filter <= 4, `unsupported PNG filter ${filter}`);
      pixels[y * stride + x] = (raw[input++] + predictor) & 255;
    }
  }
  return {width, height, data: pixels, pixel(x, y) {
    x = Math.max(0, Math.min(width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(height - 1, Math.floor(y)));
    return [...pixels.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)];
  }};
}

test('isolated manifest identifies exact inputs, exported GLB and embedded map pixels', () => {
  ensureCandidate();
  const manifestPath = resolve(candidate, '..', '..', 'manifest.json');
  assert.ok(existsSync(manifestPath), 'candidate needs its own build manifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.mode, 'p1-rook');
  const own = path => {
    const absolute = resolve(root, path);
    assert.ok(absolute.startsWith(testOutput + '\\') || absolute.startsWith(testOutput + '/'),
      `${path} escaped the isolated proof folder`);
    return absolute;
  };
  assert.equal(resolve(root, manifest.source.path), sourcePath);
  assert.equal(manifest.source.sha256, sha256(readFileSync(sourcePath)));
  const input = source();
  assert.equal(manifest.source.referenceSha256, input.reference.sha256);
  assert.equal(resolve(root, manifest.source.referencePath), resolve(root, input.reference.path));
  assert.equal(manifest.asset.sha256, sha256(readFileSync(candidate)));
  assert.equal(own(manifest.asset.path), candidate);
  assert.ok(Number.isFinite(manifest.asset.triangles) && manifest.asset.triangles > 0);
  assert.ok(Number.isFinite(manifest.asset.draws) && manifest.asset.draws > 0);
  const document = glbDocument(candidate);
  let textureBytes = 0;
  for (const kind of ['color', 'surface', 'normal']) {
    const entry = manifest.textures?.[kind];
    assert.ok(entry?.path && entry?.sha256, `${kind} lacks path/hash provenance`);
    const authored = readFileSync(own(entry.path));
    assert.equal(sha256(authored), entry.sha256, `${kind} authored map hash is stale`);
    const exported = embeddedPng(document, kind);
    assert.equal(sha256(decodeRgbaPng(exported).data), sha256(decodeRgbaPng(authored).data),
      `${kind} GLB pixels differ from the declared authored map`);
    textureBytes += authored.length;
  }
  assert.equal(manifest.asset.textureBytes, textureBytes);
});

test('actual baseline export maps glTF UV V to PNG rows through 1-v', async () => {
  // This baseline control settles the Blender-to-glTF convention before a
  // candidate assertion locates skin pixels. It uses decoded exported UVs and
  // embedded image bytes, rather than source atlas comments or metadata.
  const document = glbDocument(baseline), png = decodeRgbaPng(embeddedPng(document, 'color'));
  const hands = await loadHands(baseline), samples = [];
  hands.scene.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const {uv, skinIndex, skinWeight} = mesh.geometry.attributes;
    for (let vertex = 0; vertex < uv.count; vertex++) {
      const weightedTip = [0, 1, 2, 3].some(slot => {
        const bone = mesh.skeleton.bones[skinIndex.getComponent(vertex, slot)]?.name || '';
        return /finger_(?:thumb|index|middle|ring|pinky)_2_[LR]$/.test(bone) &&
          skinWeight.getComponent(vertex, slot) >= .7;
      });
      if (weightedTip && uv.getX(vertex) > .5 && uv.getX(vertex) < .75)
        samples.push([uv.getX(vertex) * 1024, uv.getY(vertex) * 1024]);
    }
  });
  assert.ok(samples.length >= 30, 'baseline needs enough actual distal skin samples to calibrate UV origin');
  const skin = png.pixel(640, 128);
  const colorDistance = point => Math.hypot(...point.slice(0, 3).map((value, channel) => value - skin[channel]));
  const direct = samples.reduce((sum, [x, y]) => sum + colorDistance(png.pixel(x, y)), 0) / samples.length;
  const inverted = samples.reduce((sum, [x, y]) => sum + colorDistance(png.pixel(x, 1024 - y)), 0) / samples.length;
  assert.ok(inverted < direct * .8,
    `actual exported UV y must address PNG rows through 1-v: direct=${direct.toFixed(1)}, inverted=${inverted.toFixed(1)}`);
});

test('candidate keeps exact sockets, clips, normalized skin and combined tool budgets', async () => {
  ensureCandidate();
  const {json} = glbDocument(candidate);
  assert.ok((json.materials || []).length === 1, 'Rook hand should keep one shared material');
  assert.equal((json.images || []).length, 3, 'one 1024 color/surface/normal set');
  const hands = await loadHands(candidate), handMeshes = [];
  hands.scene.traverse(node => {if (node.isMesh) handMeshes.push(node);});
  assert.ok(handMeshes.some(mesh => mesh.isSkinnedMesh), 'candidate needs actual bound skin');
  for (const socket of ['rpg-mount', 'wrench-mount'])
    assert.ok(hands.scene.getObjectByName(socket), `${socket} was removed`);
  const durations = {idle: 2, aim: 1, fire: .35, reload: 2.2, repair: 4,
    'wrench-idle': 2, 'aim-fire': .35, 'aim-reload': 2.2};
  assert.deepEqual(hands.animations.map(clip => clip.name).sort(), Object.keys(durations).sort());
  for (const clip of hands.animations)
    assert.ok(Math.abs(clip.duration - durations[clip.name]) < .02, `${clip.name} duration changed`);
  for (const mesh of handMeshes.filter(mesh => mesh.isSkinnedMesh)) {
    const weights = mesh.geometry.attributes.skinWeight, indices = mesh.geometry.attributes.skinIndex;
    assert.ok(weights && indices && mesh.skeleton?.bones.length);
    for (let vertex = 0; vertex < weights.count; vertex++) {
      let sum = 0;
      for (let component = 0; component < 4; component++) sum += weights.getComponent(vertex, component);
      assert.ok(Math.abs(sum - 1) < .001, 'candidate skin weights are not normalized');
    }
  }
  const counts = meshes => ({triangles: meshes.reduce((sum, mesh) =>
    sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0),
  draws: meshes.reduce((sum, mesh) => sum + (Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1), 0)});
  for (const tool of ['rpg', 'wrench']) {
    const loaded = await loadHands(join(root, `public/assets/models/wasteland/first-person/${tool}.glb`));
    const toolMeshes = []; loaded.scene.traverse(node => {if (node.isMesh) toolMeshes.push(node);});
    const combined = counts([...handMeshes, ...toolMeshes]);
    assert.ok(combined.triangles <= 8000, `${tool} plus hands exceeds 8,000 actual triangles`);
    assert.ok(combined.draws <= 3, `${tool} plus hands exceeds three actual draws`);
  }
});

const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));
const vertex = (position, index) => [position.getX(index), position.getY(index), position.getZ(index)];
const faces = geometry => {
  const index = geometry.index, count = index?.count ?? geometry.attributes.position.count;
  return Array.from({length: count / 3}, (_, face) => Array.from({length: 3}, (_, corner) =>
    index ? index.getX(face * 3 + corner) : face * 3 + corner));
};

test('actual exported web and five distal pads per hand have local curved skin surfaces', async () => {
  ensureCandidate();
  const data = source(), hands = await loadHands(candidate);
  const png = decodeRgbaPng(embeddedPng(glbDocument(candidate), 'color'));
  const meshes = [];
  hands.scene.traverse(node => {if (node.isSkinnedMesh) meshes.push(node);});
  assert.ok(meshes.length, 'candidate has no skinned hands');
  const skin = data.atlas.charts.skin.rect;
  const leather = data.atlas.charts.leather.rect;
  assert.ok(skin.length === 4, 'skin atlas chart needs measured image-top bounds');
  assert.ok(leather.length === 4, 'leather atlas chart needs measured image-top bounds');
  const middle = rect => png.pixel((rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2);
  const skinColor = middle(skin), leatherColor = middle(leather);
  const rgbDistance = (a, b) => Math.hypot(...a.slice(0, 3).map((value, channel) => value - b[channel]));
  assert.ok(rgbDistance(skinColor, leatherColor) >= 15,
    'painted skin and glove leather must read as distinct material charts');
  for (const side of ['R', 'L']) {
    const marks = data.hands[side].landmarks;
    const regions = [['thumbWeb', marks.thumbWeb, marks.palm, marks.thumbRoot],
      ['thumbTip', marks.thumbTip, ...marks.distalStations.thumb],
      ...['index', 'middle', 'ring', 'pinky'].map(name =>
        [`${name}Tip`, marks.fingertips[name], ...marks.distalStations[name]])];
    for (const [name, landmark, start, end] of regions) {
      const hits = [];
      for (const mesh of meshes) {
        const hint = mesh.userData.handRegions?.[`${side}:${name}`];
        if (!hint) continue;
        assert.ok(Array.isArray(hint.center) && hint.center.length === 3 &&
          hint.center.every(Number.isFinite), `${side}:${name} has an invalid region center`);
        assert.ok(distance(hint.center, landmark) <= .010,
          `${side}:${name} selector must follow the authored anatomy within 10 mm`);
        const radius = hint.radiusMetres;
        assert.ok(radius >= .005 && radius <= (name === 'thumbWeb' ? .025 : .015),
          `${side}:${name} selector is too broad to prove local geometry`);
        const geometry = mesh.geometry, position = geometry.attributes.position, uv = geometry.attributes.uv;
        assert.ok(uv, 'authored hand surface needs exported UV0');
        for (const corners of faces(geometry)) {
          const points = corners.map(index => vertex(position, index));
          const center = [0, 1, 2].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / 3);
          if (distance(center, hint.center) > radius) continue;
          const normal = new THREE.Vector3(...points[1]).sub(new THREE.Vector3(...points[0]))
            .cross(new THREE.Vector3(...points[2]).sub(new THREE.Vector3(...points[0]))).normalize();
          const mapped = corners.map(index => [uv.getX(index) * 1024, uv.getY(index) * 1024]);
          hits.push({center, normal, mapped, points});
        }
      }
      assert.ok(hits.length >= 6, `${side}:${name} has too few actual local faces`);
      if (name === 'thumbWeb') {
        const area = hits.reduce((sum, hit) => {
          const [a, b, c] = hit.points.map(point => new THREE.Vector3(...point));
          return sum + b.sub(a).cross(c.sub(a)).length() / 2;
        }, 0);
        assert.ok(area >= .00012, `${side} thumb web is only a pinched edge or tiny bridge`);
        continue;
      }
      const axis = new THREE.Vector3(...end).sub(new THREE.Vector3(...start)).normalize();
      const forward = hits.filter(hit => hit.normal.dot(axis) >= .3 && distance(hit.center, end) <= .010);
      assert.ok(forward.length >= 3, `${side}:${name} lacks a rounded outward-facing pad`);
      const axial = new Set(hits.flatMap(hit => hit.points.map(point =>
        Math.round(new THREE.Vector3(...point).sub(new THREE.Vector3(...end)).dot(axis) * 1000))));
      assert.ok(Math.max(...axial) - Math.min(...axial) >= 6,
        `${side}:${name} needs at least 6 mm of multi-ring taper, not a flat end cap`);
      for (const hit of forward) for (const [x, gltfY] of hit.mapped) {
        const y = 1024 - gltfY;
        assert.ok(x >= skin[0] + 8 && x <= skin[2] - 8 && y >= skin[1] + 8 && y <= skin[3] - 8,
          `${side}:${name} terminal face samples leather/outside the padded skin chart`);
        const color = png.pixel(x, y);
        assert.equal(color[3], 255, `${side}:${name} terminal skin is not opaque`);
        assert.ok(rgbDistance(color, skinColor) < rgbDistance(color, leatherColor),
          `${side}:${name} terminal pixels look like glove leather rather than skin`);
      }
    }
  }
});

function joinedSurfaceComponents(mesh, tolerance = .0001) {
  const geometry = mesh.geometry, position = geometry.attributes.position;
  const parent = Array.from({length: position.count}, (_, index) => index);
  const find = index => {while (parent[index] !== index) {
    parent[index] = parent[parent[index]]; index = parent[index];
  } return index;};
  const union = (a, b) => {a = find(a); b = find(b); if (a !== b) parent[b] = a;};
  const index = geometry.index, count = index?.count ?? position.count;
  for (let item = 0; item < count; item += 3) {
    const a = index ? index.getX(item) : item;
    const b = index ? index.getX(item + 1) : item + 1;
    const c = index ? index.getX(item + 2) : item + 2;
    union(a, b); union(a, c);
  }
  // Export can duplicate a real shared vertex at a UV or material seam. Weld
  // positions within 0.1 mm in adjacent spatial cells before judging topology.
  const cells = new Map(), key = (x, y, z) => `${x},${y},${z}`;
  for (let vertex = 0; vertex < position.count; vertex++) {
    const x = position.getX(vertex), y = position.getY(vertex), z = position.getZ(vertex);
    const cx = Math.floor(x / tolerance), cy = Math.floor(y / tolerance), cz = Math.floor(z / tolerance);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (const other of cells.get(key(cx + dx, cy + dy, cz + dz)) || []) {
        const d = Math.hypot(x - position.getX(other), y - position.getY(other), z - position.getZ(other));
        if (d <= tolerance) union(vertex, other);
      }
    }
    const cell = key(cx, cy, cz); if (!cells.has(cell)) cells.set(cell, []); cells.get(cell).push(vertex);
  }
  return Array.from({length: position.count}, (_, vertex) => find(vertex));
}

test('Rook exported palm and all five digits on each side form one welded deforming surface', async () => {
  ensureCandidate();
  const hands = await loadHands(candidate);
  const skinned = [];
  hands.scene.traverse(node => {if (node.isSkinnedMesh) skinned.push(node);});
  assert.ok(skinned.length, 'proof needs an actual skinned hand mesh');
  for (const side of ['L', 'R']) {
    const digitRoots = ['thumb', 'index', 'middle', 'ring', 'pinky'].map(digit => `finger_${digit}_0_${side}`);
    const coverage = new Map();
    for (const mesh of skinned) {
      const components = joinedSurfaceComponents(mesh);
      const indices = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
      assert.ok(indices && weights, 'connected hand must retain skin');
      for (let vertex = 0; vertex < components.length; vertex++) for (let slot = 0; slot < 4; slot++) {
        if (weights.getComponent(vertex, slot) < .25) continue;
        const bone = mesh.skeleton.bones[indices.getComponent(vertex, slot)]?.name;
        if (!bone) continue;
        const id = `${mesh.uuid}:${components[vertex]}`;
        if (!coverage.has(bone)) coverage.set(bone, new Set());
        coverage.get(bone).add(id);
      }
    }
    const wrist = coverage.get(`wrist_${side}`) || new Set();
    assert.ok(wrist.size, `${side} wrist is not skinned`);
    for (const digit of digitRoots) {
      const surfaces = coverage.get(digit) || new Set();
      assert.ok(surfaces.size, `${digit} has no weighted geometry`);
      assert.ok([...surfaces].some(id => wrist.has(id)),
        `${digit} is a disconnected tube/shell rather than part of the ${side} palm`);
    }
  }
});
