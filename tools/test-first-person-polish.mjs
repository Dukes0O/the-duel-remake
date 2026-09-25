import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, mkdirSync, rmSync, writeFileSync, copyFileSync,
  symlinkSync, rmdirSync, lstatSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {inflateSync, deflateSync} from 'node:zlib';
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

function python(args, env = {}) {
  return spawnSync('python', [generator, '--', '--root', root, '--round', '1', ...args],
    {cwd: root, encoding: 'utf8', env: {...process.env, ...env}});
}

function syntheticTriptychPng() {
  const size=1254,raw=Buffer.alloc(size*(size*3+1));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const at=y*(size*3+1)+1+x*3;
    const panel=Math.floor(x/418);
    const grain=(Math.floor(x/11)+Math.floor(y/13))%17;
    const colors=[[42,86,87],[69,47,37],[158,137,105]][panel];
    for(let channel=0;channel<3;channel++)raw[at+channel]=colors[channel]+grain;
  }
  let crcTable=Array.from({length:256},(_,i)=>{
    for(let n=0;n<8;n++)i=(i&1)?0xedb88320^(i>>>1):i>>>1;
    return i>>>0;
  });
  const chunk=(name,bytes)=>{
    const type=Buffer.from(name),payload=Buffer.concat([type,bytes]);
    let crc=0xffffffff;
    for(const byte of payload)crc=crcTable[(crc^byte)&255]^(crc>>>8);
    const out=Buffer.alloc(payload.length+8);
    out.writeUInt32BE(bytes.length,0);payload.copy(out,4);
    out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);
    return out;
  };
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);
  ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

test('R3 selected material is explicit, hash-matched and confined before any build writes', () => {
  const base=join(root,'art-build/first-person-p1/test-r3-paint');
  const input=join(base,'triptych.png'), output=join(base,'candidate');
  mkdirSync(base,{recursive:true});
  writeFileSync(input,syntheticTriptychPng());
  const hash=sha256(readFileSync(input));
  const args=['--p1-rook','--output-dir',output,'--paths-only'];
  const absent=python([...args,'--p1-paint',input]);
  assert.notEqual(absent.status,0,'selected paint without a SHA must reject before writes');
  const mismatch=python([...args,'--p1-paint',input,'--p1-paint-sha256','0'.repeat(64)]);
  assert.notEqual(mismatch.status,0,'wrong selected paint hash must reject before writes');
  const publicInput=join(root,'public/assets/reference/wasteland-rpg.png');
  const unsafe=python([...args,'--p1-paint',publicInput,
    '--p1-paint-sha256',sha256(readFileSync(publicInput))]);
  assert.notEqual(unsafe.status,0,'selected paint cannot read from public runtime/reference paths');
  assert.equal(existsSync(output),false,'rejected selected paint cannot create output');
  const valid=python([...args,'--p1-paint',input,'--p1-paint-sha256',hash]);
  assert.equal(valid.status,0,valid.stderr||valid.stdout);
  assert.equal(existsSync(output),false,'paths-only selected paint cannot write');
});

test('R3 selected triptych paints exported charts while retaining R2 skin pixels', () => {
  const base=join(root,'art-build/first-person-p1/test-r3-paint');
  const input=join(base,'triptych.png'), output=join(base,'painted');
  mkdirSync(base,{recursive:true});
  writeFileSync(input,syntheticTriptychPng());
  const hash=sha256(readFileSync(input));
  const blender=process.env.BLENDER_PATH || 'blender';
  const result=spawnSync(blender,['-b','--python-exit-code','1','--python',generator,
    '--','--root',root,'--round','1','--p1-rook','--output-dir',output,
    '--p1-paint',input,'--p1-paint-sha256',hash,'--skip-renders'],
  {cwd:root,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});
  assert.equal(result.status,0,result.stderr||result.stdout||result.error?.message);
  const manifest=JSON.parse(readFileSync(join(output,'manifest.json'),'utf8'));
  assert.equal(manifest.paintSource?.sha256,hash,
    'own-build manifest must name the actual selected fixture bytes');
  assert.equal(resolve(root,manifest.paintSource?.path),input);
  assert.equal(manifest.paintSource?.selectedArtwork,false,
    'synthetic fixture must not claim to be the reviewed real artwork');
  assert.equal(manifest.paintSource?.method,'box-filter-418-to-240');
  assert.deepEqual(manifest.paintSource?.crops,{
    cloth:[0,0,418,418],leather:[418,90,836,508],wrap:[836,250,1254,668],
  });
  const painted=decodeRgbaPng(embeddedPng(glbDocument(join(output,'hands/rook.glb')),'color'));
  const charts={cloth:[8,8,248,248],leather:[264,8,504,248],wrap:[776,8,1016,248]};
  const bases={cloth:[42,86,87],leather:[69,47,37],wrap:[158,137,105]};
  for(const [role,rect] of Object.entries(charts)) {
    const crop=manifest.paintSource.crops[role];
    for(const [dx,dy] of [[32,32],[120,120],[208,208]]) {
      const px=rect[0]+dx,py=rect[1]+dy;
      const sourceX=Math.floor(crop[0]+(dx+.5)*418/240);
      const sourceY=Math.floor(crop[1]+(dy+.5)*418/240);
      const grain=(Math.floor(sourceX/11)+Math.floor(sourceY/13))%17;
      const actual=painted.pixel(px,py);
      for(let channel=0;channel<3;channel++)
        assert.ok(Math.abs(actual[channel]-(bases[role][channel]+grain))<=6,
          `${role} exported pixel ${px},${py} does not follow selected source crop`);
      assert.equal(actual[3],255,`${role} embedded atlas must remain opaque`);
    }
  }
  const protectedSkin=Buffer.alloc(241*241*4);
  for(let y=8;y<=248;y++)for(let x=520;x<=760;x++)
    Buffer.from(painted.pixel(x,y)).copy(protectedSkin,((y-8)*241+x-520)*4);
  assert.equal(sha256(protectedSkin),
    '7eea2ce1afd880c2514cc24ec964cb6172becc2e8a72ccd97c7bbd449b7e8c7d',
    'selected cloth/leather/wrap paint cannot alter frozen R2 skin pixels');
  for(const crew of Object.keys(baselineHashes))
    assert.equal(sha256(readFileSync(join(root,
      `public/assets/models/wasteland/first-person/hands/${crew}.glb`))),
    baselineHashes[crew],`${crew} production hand changed during selected-paint proof`);
});

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

test('candidate evidence override cannot write outside ignored review folders', () => {
  const output = join(root, 'art-build/first-person-p1/test-paths');
  const args = ['--p1-rook', '--output-dir', output, '--paths-only'];
  for (const bad of [join(root, 'public/assets/models/wasteland/first-person'),
    resolve(root, '..', 'outside-first-person-evidence'), join(root, '.evidence')]) {
    const existed = existsSync(bad);
    const result = python(args, {DUEL_EVIDENCE_DIR: bad});
    assert.notEqual(result.status, 0, `${bad} evidence override must fail before writes`);
    assert.equal(existsSync(bad), existed, 'rejected evidence destination was created');
  }
  const inside = join(root, '.evidence/test-first-person-p1-paths');
  const existed = existsSync(inside);
  const accepted = python(args, {DUEL_EVIDENCE_DIR: inside});
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  assert.equal(existsSync(inside), existed, 'allowed evidence dry run still cannot write');
  const candidateEvidence = join(output, 'review');
  const candidateExisted = existsSync(candidateEvidence);
  const local = python(args, {DUEL_EVIDENCE_DIR: candidateEvidence});
  assert.equal(local.status, 0, local.stderr || local.stdout);
  assert.equal(existsSync(candidateEvidence), candidateExisted, 'candidate review dry run cannot write');
  const junction = join(root, 'art-build/first-person-p1/test-evidence-junction');
  assert.ok(!existsSync(junction), 'test-owned junction path is already occupied');
  symlinkSync(join(root, 'public/assets'), junction, 'junction');
  try {
    assert.ok(lstatSync(junction).isSymbolicLink(), 'fixture must be an actual junction');
    const escaped = python(args, {DUEL_EVIDENCE_DIR: join(junction, 'review')});
    assert.notEqual(escaped.status, 0, 'resolved junction into public assets must be rejected');
  } finally {rmdirSync(junction);}
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
  // The focused override names a frozen reviewed candidate; pair it with its
  // own manifest and maps. Ordinary clean-checkout runs still use test-proof.
  const candidateOutput = resolve(candidate, '..', '..');
  const allowed = join(root, 'art-build/first-person-p1');
  assert.ok(candidateOutput.startsWith(allowed + '\\') || candidateOutput.startsWith(allowed + '/'),
    'reviewed candidate must remain in the ignored first-person proof family');
  const manifestPath = join(candidateOutput, 'manifest.json');
  assert.ok(existsSync(manifestPath), 'candidate needs its own build manifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.mode, 'p1-rook');
  const own = path => {
    const absolute = resolve(root, path);
    assert.ok(absolute.startsWith(candidateOutput + '\\') || absolute.startsWith(candidateOutput + '/'),
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
const rgbDistance = (a, b) => Math.hypot(...a.slice(0, 3).map((value, channel) => value - b[channel]));
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

function weldedVertexIds(position, tolerance = .0001) {
  const parent = Array.from({length: position.count}, (_, index) => index);
  const find = index => {while (parent[index] !== index) {
    parent[index] = parent[parent[index]]; index = parent[index];
  } return index;};
  const union = (a, b) => {a = find(a); b = find(b); if (a !== b) parent[b] = a;};
  const cells = new Map(), key = (x, y, z) => `${x},${y},${z}`;
  for (let vertex = 0; vertex < position.count; vertex++) {
    const x = position.getX(vertex), y = position.getY(vertex), z = position.getZ(vertex);
    const cx = Math.floor(x / tolerance), cy = Math.floor(y / tolerance), cz = Math.floor(z / tolerance);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++)
      for (const other of cells.get(key(cx + dx, cy + dy, cz + dz)) || [])
        if (Math.hypot(x - position.getX(other), y - position.getY(other), z - position.getZ(other)) <= tolerance)
          union(vertex, other);
    const cell = key(cx, cy, cz); if (!cells.has(cell)) cells.set(cell, []); cells.get(cell).push(vertex);
  }
  return Array.from({length: position.count}, (_, index) => find(index));
}

test('welded palm-to-digit surface is manifold with no open digit/web boundary', async () => {
  ensureCandidate();
  const hands = await loadHands(candidate), anatomy = source(), meshes = [];
  hands.scene.traverse(node => {if (node.isSkinnedMesh) meshes.push(node);});
  assert.ok(meshes.length);
  for (const side of ['L', 'R']) {
    let checkedFaces = 0;
    for (const mesh of meshes) {
      const geometry = mesh.geometry, welded = weldedVertexIds(geometry.attributes.position);
      const connected = joinedSurfaceComponents(mesh);
      const indices = geometry.attributes.skinIndex, weights = geometry.attributes.skinWeight;
      const wristComponents = new Set();
      for (let vertex = 0; vertex < connected.length; vertex++) for (let slot = 0; slot < 4; slot++) {
        const bone = mesh.skeleton.bones[indices.getComponent(vertex, slot)]?.name;
        if (bone === `wrist_${side}` && weights.getComponent(vertex, slot) >= .25)
          wristComponents.add(connected[vertex]);
      }
      const incidence = new Map(), edgeVertices = new Map();
      for (const corners of faces(geometry)) {
        if (!wristComponents.has(connected[corners[0]])) continue;
        checkedFaces++;
        for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
          const first = welded[corners[a]], second = welded[corners[b]];
          assert.notEqual(first, second, `${side} has a collapsed triangle edge after seam weld`);
          const edge = first < second ? `${first}:${second}` : `${second}:${first}`;
          incidence.set(edge, (incidence.get(edge) || 0) + 1);
          if (!edgeVertices.has(edge)) edgeVertices.set(edge, [corners[a], corners[b]]);
        }
      }
      const wrist = anatomy.hands[side].landmarks.wrist;
      const palm = anatomy.hands[side].landmarks.palm;
      // The authored sleeve and cuff have intentional open rings proximal to
      // the wrist. Only the hand beyond the wrist-to-palm midpoint must close.
      // This line separates both observed 10-edge palm/web holes from all ten
      // independently classified garment rings on the frozen f478a564 export.
      const distalHandZ = (wrist[2] + palm[2]) / 2;
      const exposed = [...incidence].filter(([, count]) => count === 1).filter(([edge]) => {
        const [a, b] = edgeVertices.get(edge);
        const pa = vertex(geometry.attributes.position, a), pb = vertex(geometry.attributes.position, b);
        const middle = pa.map((value, axis) => (value + pb[axis]) / 2);
        return middle[2] < distalHandZ;
      });
      assert.equal(exposed.length, 0,
        `${side} distal digit/palm/web has ${exposed.length} open boundary edges past the wrist-to-palm midpoint`);
      const overfull = [...incidence].filter(([, count]) => count > 2);
      assert.equal(overfull.length, 0,
        `${side} hand has ${overfull.length} non-manifold shared edges (first ${overfull[0]?.join('=')})`);
    }
    assert.ok(checkedFaces >= 200, `${side} hand manifold check did not reach the actual palm and digits`);
  }
});

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

test('private review resolves only an existing ignored Rook hand GLB, never production or outside paths', async () => {
  const scenario = await import('./scenarios/first-person-polish.mjs');
  assert.equal(typeof scenario.validateFirstPersonCandidatePath, 'function');
  const privateDir = join(root, 'art-build/first-person-p1/test-private-review');
  const privatePath = join(privateDir, 'rook.glb');
  const outsideDir = join(root, 'art-build/first-person');
  const outsidePath = join(outsideDir, 'test-private-outside.glb');
  mkdirSync(privateDir, {recursive: true});
  mkdirSync(outsideDir, {recursive: true});
  const bytes = readFileSync(baseline);
  writeFileSync(privatePath, bytes);
  writeFileSync(outsidePath, bytes);
  const args = {root, productionPath: baseline};
  try {
    const selected = await scenario.validateFirstPersonCandidatePath({...args, candidatePath: privatePath});
    assert.equal(selected.absolute, privatePath);
    assert.equal(selected.sha256, sha256(bytes));
    for (const bad of [baseline, outsidePath, join(root, '..', 'outside-rook.glb'),
      join(root, 'art-build/first-person-p1/test-private-review/missing.glb')])
      await assert.rejects(() => scenario.validateFirstPersonCandidatePath({...args, candidatePath: bad}),
        /public|production|outside|missing|exist|ENOENT|ignored/i);
    const wrongExt = join(privateDir, 'rook.txt');
    writeFileSync(wrongExt, bytes);
    try {await assert.rejects(() => scenario.validateFirstPersonCandidatePath({...args, candidatePath: wrongExt}),
      /glb|extension|asset/i);} finally {rmSync(wrongExt, {force: true});}
  } finally {rmSync(privatePath, {force: true}); rmSync(outsidePath, {force: true});}
});

test('private review recognizes only the exact same-origin Rook hands request', async () => {
  const scenario = await import('./scenarios/first-person-polish.mjs');
  assert.equal(typeof scenario.rookAssetUrl, 'function');
  const origin = 'http://127.0.0.1:42371';
  const path = '/assets/models/wasteland/first-person/hands/rook.glb';
  assert.equal(scenario.rookAssetUrl(path, origin), true);
  assert.equal(scenario.rookAssetUrl(`${origin}${path}`, origin), true);
  for (const other of [`${path}?v=1`, `${path}#copy`, `${path}/extra`,
    '/assets/models/wasteland/first-person/hands/nell.glb',
    '/assets/models/wasteland/crew/rook.glb',
    `https://example.net${path}`, `http://127.0.0.1:42372${path}`])
    assert.equal(scenario.rookAssetUrl(other, origin), false, `${other} must not be substituted`);
});

test('private review verifies one real Rook substitution and all eight production hashes', async () => {
  const scenario = await import('./scenarios/first-person-polish.mjs');
  assert.equal(typeof scenario.verifyCandidateSwap, 'function');
  const origin = 'http://127.0.0.1:42371';
  const requestedUrl = `${origin}/assets/models/wasteland/first-person/hands/rook.glb`;
  const candidateBytes = readFileSync(baseline);
  const productionBefore = {...baselineHashes}, productionAfter = {...baselineHashes};
  const valid = {requestedUrl, origin, candidateBytes, productionBefore, productionAfter, swapCount: 1};
  assert.doesNotThrow(() => scenario.verifyCandidateSwap(valid));
  for (const swapCount of [0, 2])
    assert.throws(() => scenario.verifyCandidateSwap({...valid, swapCount}), /substitut|swap|count|once/i);
  assert.throws(() => scenario.verifyCandidateSwap({...valid,
    requestedUrl: `${origin}/assets/models/wasteland/first-person/hands/nell.glb`}), /rook|url|request/i);
  assert.throws(() => scenario.verifyCandidateSwap({...valid,
    candidateBytes: Buffer.from([1, 2, 3, 4])}), /glb|asset|magic|candidate/i);
  const changed = {...productionAfter, nell: '0'.repeat(64)};
  assert.throws(() => scenario.verifyCandidateSwap({...valid, productionAfter: changed}),
    /hash|production|baseline|changed/i);
  const incomplete = {...productionAfter}; delete incomplete.tusk;
  assert.throws(() => scenario.verifyCandidateSwap({...valid, productionAfter: incomplete}),
    /eight|missing|production|baseline|crew/i);
});

test('the actual browser fetch wrapper substitutes Rook once only after private memory setup', async () => {
  const scenario = await import('./scenarios/first-person-polish.mjs');
  assert.equal(typeof scenario.rookCandidateFetchInstallScript, 'function');
  const origin = 'http://127.0.0.1:42371';
  const bytes = Buffer.from([103, 108, 84, 70, 2, 0, 0, 0, 12, 0, 0, 0]);
  const script = scenario.rookCandidateFetchInstallScript(bytes.toString('base64'), origin);
  assert.equal(typeof script, 'string');
  const delegated = [];
  const original = async (input, init) => {delegated.push({input, init}); return {delegated: true};};
  class ResponseStub {
    constructor(body, init) {this.body = body; this.init = init;}
    async arrayBuffer() {return Uint8Array.from(this.body).buffer;}
  }
  const window = {location: {origin, href: `${origin}/qa.html`},
    __QA_MEMORY_STORAGE__: true, fetch: original};
  const globals = {window, Response: ResponseStub, URL, Uint8Array, atob, Buffer};
  runInNewContext(script, globals);
  const path = '/assets/models/wasteland/first-person/hands/rook.glb';
  const swapped = await window.fetch(path, {cache: 'no-store'});
  assert.deepEqual(Buffer.from(await swapped.arrayBuffer()), bytes, 'actual wrapper returned candidate bytes');
  assert.match(String(swapped.init?.headers?.['Content-Type'] ||
    swapped.init?.headers?.['content-type']), /model\/gltf-binary/i);
  assert.equal(window.__rookCandidateSwapCount, 1);
  for (const other of [`${path}?v=1`, `${path}/extra`,
    '/assets/models/wasteland/first-person/hands/nell.glb',
    '/assets/models/wasteland/crew/rook.glb', `https://example.net${path}`]) {
    const init = {signal: 'sentinel'};
    assert.equal((await window.fetch(other, init)).delegated, true);
    assert.deepEqual(delegated.at(-1), {input: other, init}, 'delegation preserves input and init');
  }
  const unsafe = {location: window.location, fetch: original};
  assert.throws(() => runInNewContext(script, {...globals, window: unsafe}), /memory|private|guard/i);
  assert.equal(unsafe.fetch, original, 'failed memory guard cannot replace fetch');
});

const reviewCamera = {position: [0, 0, 0], target: [0, 0, -1], verticalFov: 72,
  near: .15, width: 1280, height: 720};
const reviewSamples = [
  ['idle', .25, 'rpg'], ['aim', .25, 'rpg'], ['fire', .10, 'rpg'],
  ['reload', 1.10, 'rpg'], ['reload', 1.65, 'rpg'], ['aim-reload', 1.10, 'rpg'],
  ['wrench-idle', .25, 'wrench'], ['repair', 1.12, 'wrench'],
];
const clone = value => JSON.parse(JSON.stringify(value));

function reviewFixture() {
  const candidateSha256 = baselineHashes.rook;
  const crewRef = 'public/assets/reference/wasteland-crew-1.png';
  const rpgRef = 'public/assets/reference/wasteland-rpg.png';
  const reference = (path, crop) => ({path, sha256: sha256(readFileSync(join(root, path))), crop});
  const blender = {family: 'first-person-p1', round: 1,
    scope: 'Blender source module at authored camera', candidateSha256,
    camera: clone(reviewCamera), references: {
      crew: reference(crewRef, [0, 40, 510, 675]),
      rpgArm: reference(rpgRef, [790, 338, 1536, 1024]),
    }, tools: Object.fromEntries(['rpg', 'wrench'].map(tool => [tool, {
      path: `public/assets/models/wasteland/first-person/${tool}.glb`,
      sha256: sha256(readFileSync(join(root, `public/assets/models/wasteland/first-person/${tool}.glb`))),
    }])),
    captures: reviewSamples.map(([clip, time, tool], index) => ({
      path: `art-build/first-person-p1/candidate/evidence/blender-${index}.png`,
      sha256: String(index + 1).padStart(64, 'a'), clip, time, tool,
      scope: 'Blender source module',
    }))};
  const captures = {family: 'first-person-p1', round: 1,
    candidate: {path: 'art-build/first-person-p1/candidate/hands/rook.glb', sha256: candidateSha256},
    camera: clone(reviewCamera), productionBefore: {...baselineHashes}, productionAfter: {...baselineHashes},
    qualities: {high: {candidateRequests: 1}, performance: {candidateRequests: 1}},
    captures: reviewSamples.flatMap(([clip, time, tool], index) =>
      ['high', 'performance'].map((quality, qualityIndex) => ({
        path: `.evidence/first-person-p1/round-1/${quality}-${index}.png`,
        sha256: String(index * 2 + qualityIndex + 1).padStart(64, 'b'),
        clip, time, tool, quality, scope: 'game course',
      }))),
    orderedMotion: [], frameStatus: 'unmeasured'};
  return {captures, blender, round: 1, productionHashes: {...baselineHashes}};
}

test('first-person P1 sheet paths use a separate immutable family without writes', () => {
  const tool = join(root, 'tools/fidelity-sheet.mjs');
  const old = join(root, 'docs/board/looks/first-person/round-1.jpg');
  const oldHash = existsSync(old) ? sha256(readFileSync(old)) : null;
  const result = spawnSync(process.execPath, [tool, '--first-person-p1-round', '1', '--paths-only'],
    {cwd: root, encoding: 'utf8', timeout: 10000});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const plan = JSON.parse(result.stdout);
  assert.match(plan.directory.replaceAll('\\', '/'), /\/\.evidence\/[^/]+\/first-person-p1\/round-1$/);
  assert.equal(plan.output, join(plan.directory, 'sheet.png'));
  assert.equal(plan.manifest, join(plan.directory, 'sheet.json'));
  assert.equal(plan.summary, join(root, 'docs/board/looks/first-person-p1/round-1.jpg'));
  assert.equal(existsSync(plan.output), false, 'path planning cannot publish a sheet');
  assert.equal(existsSync(old) ? sha256(readFileSync(old)) : null, oldHash,
    'old first-person evidence remains immutable');
});

test('P1 sheet validator joins eight source poses with High and Performance using exact candidate provenance', async () => {
  const sheet = await import('./fidelity-sheet.mjs');
  assert.equal(typeof sheet.validateFirstPersonP1Sheet, 'function');
  const input = reviewFixture();
  const plan = sheet.validateFirstPersonP1Sheet(input);
  assert.equal(plan.rows.length, 8);
  assert.equal(plan.candidateSha256, baselineHashes.rook);
  assert.deepEqual(plan.camera, reviewCamera);
  assert.deepEqual(plan.productionHashes, baselineHashes);
  assert.deepEqual(plan.rows.map(row => [row.clip, row.time, row.tool]), reviewSamples);
  for (const row of plan.rows) {
    assert.equal(row.scope, 'Blender module vs game course');
    assert.deepEqual(row.columnLabels, ['REFERENCE', 'BLENDER MODULE', 'GAME HIGH', 'GAME PERF']);
    assert.ok(row.blender && row.high && row.performance && row.label);
    const expected = row.tool === 'rpg' ? input.blender.references.rpgArm : input.blender.references.crew;
    assert.equal(row.reference, expected.path);
    assert.deepEqual(row.crop, expected.crop);
  }
});

test('P1 sheet validator rejects mismatched candidate, camera, requests, ownership and pose/scope', async () => {
  const sheet = await import('./fidelity-sheet.mjs');
  const check = changes => {
    const input = reviewFixture();
    changes(input);
    assert.throws(() => sheet.validateFirstPersonP1Sheet(input));
  };
  check(input => {input.captures.candidate.sha256 = '0'.repeat(64);});
  check(input => {input.captures.candidate.path = 'public/assets/models/wasteland/first-person/hands/rook.glb';});
  check(input => {input.captures.camera.near = .20;});
  check(input => {input.captures.qualities.performance.candidateRequests = 0;});
  check(input => {input.captures.qualities.high.candidateRequests = 2;});
  check(input => {input.captures.productionAfter.nell = '0'.repeat(64);});
  check(input => {delete input.captures.productionAfter.wren;});
  check(input => {input.captures.captures.pop();});
  check(input => {input.captures.captures[0].scope = 'Blender source module';});
  check(input => {input.blender.captures[0].scope = 'game course';});
  check(input => {input.blender.captures[0].sha256 = null;});
  check(input => {input.captures.captures[0].sha256 = null;});
  check(input => {input.blender.references.rpgArm.sha256 = null;});
});

test('P1 sheet direct CLI reaches evidence validation after module initialization', () => {
  const fixtureRoot = join(root, 'art-build/first-person-p1/test-sheet-cli-root');
  const directory = join(fixtureRoot, 'evidence');
  const captures = join(directory, 'captures.json');
  mkdirSync(directory, {recursive: true});
  mkdirSync(join(fixtureRoot, 'tools'), {recursive: true});
  copyFileSync(join(root, 'tools/fidelity-sheet.mjs'), join(fixtureRoot, 'tools/fidelity-sheet.mjs'));
  writeFileSync(captures, '{}\n');
  try {
    const result = spawnSync(process.execPath,
      [join(fixtureRoot, 'tools/fidelity-sheet.mjs'), '--first-person-p1-round', '1'],
      {cwd: fixtureRoot, encoding: 'utf8', timeout: 10000,
        env: {...process.env, DUEL_EVIDENCE_DIR: directory}});
    assert.notEqual(result.status, 0, 'invalid evidence fixture must be rejected');
    assert.match(result.stderr, /First-person P1 family, round or source scope mismatch/i,
      'CLI must reject an invalid capture before reading any ignored Blender manifest');
    assert.doesNotMatch(result.stderr, /before initialization/i);
  } finally {rmSync(fixtureRoot, {recursive: true, force: true});}
});

test('Rook wrap covers the old exposed wrist with its own padded painted surface', async () => {
  ensureCandidate();
  const data = source();
  const wrap = data.atlas.charts.wrap?.rect;
  assert.deepEqual(wrap, [776, 8, 1016, 248], 'wrap needs its reviewed disjoint atlas chart');
  for (const side of ['R', 'L']) {
    const clothing = data.clothing?.[side];
    assert.ok(clothing, `${side} needs an authored sleeve-to-glove interval`);
    for (const key of ['sleeveHem', 'gloveEdge'])
      assert.ok(Array.isArray(clothing[key]) && clothing[key].length === 3 &&
        clothing[key].every(Number.isFinite), `${side} ${key} needs measured metre coordinates`);
    assert.equal(clothing.minWrapCoverage, .70);
    assert.deepEqual(clothing.wrapThicknessMetres, [.001, .004]);
  }
  const hands = await loadHands(candidate);
  const png = decodeRgbaPng(embeddedPng(glbDocument(candidate), 'color'));
  const skin = data.atlas.charts.skin.rect;
  const skinPixel = png.pixel(Math.round((skin[0] + skin[2]) / 2),
    Math.round((skin[1] + skin[3]) / 2));
  const wrapPixel = png.pixel(896, 128);
  assert.equal(wrapPixel[3], 255, 'wrap paint must be opaque');
  assert.ok(rgbDistance(wrapPixel, skinPixel) >= 15,
    'wrap must paint distinct beige cloth instead of borrowing skin pixels');
  const triangles = [];
  hands.scene.traverse(mesh => {
    if (!mesh.isSkinnedMesh || !mesh.geometry.attributes.uv) return;
    const {position, uv} = mesh.geometry.attributes;
    for (const corners of faces(mesh.geometry)) {
      const mapped = corners.map(index => [uv.getX(index) * 1024,
        (1 - uv.getY(index)) * 1024]);
      if (!mapped.every(([x, y]) => x >= wrap[0] + 8 && x <= wrap[2] - 8 &&
        y >= wrap[1] + 8 && y <= wrap[3] - 8)) continue;
      triangles.push({points: corners.map(index => vertex(position, index)), mesh});
    }
  });
  assert.ok(triangles.length >= 12, 'actual exported wrap cloth must occupy its own padded UV chart');
  for (const side of ['R', 'L']) {
    const {sleeveHem: start, gloveEdge: end} = data.clothing[side];
    const axis = end.map((value, i) => value - start[i]);
    const length = Math.hypot(...axis);
    assert.ok(length >= .035 && length <= .12,
      `${side} reviewed exposed wrist baseline must remain a local interval`);
    const covered = new Set();
    for (const triangle of triangles) {
      const sample = triangle.points.map(point => {
        const delta = point.map((value, i) => value - start[i]);
        const t = delta.reduce((sum, value, i) => sum + value * axis[i], 0) / (length * length);
        const radial = Math.hypot(...delta.map((value, i) => value - t * axis[i]));
        return {t, radial};
      });
      if (sample.some(({radial}) => radial > .065)) continue;
      const lo = Math.max(0, Math.min(...sample.map(item => item.t)));
      const hi = Math.min(1, Math.max(...sample.map(item => item.t)));
      for (let bin = 0; bin < 100; bin++) if ((bin + .5) / 100 >= lo && (bin + .5) / 100 <= hi)
        covered.add(bin);
    }
    assert.ok(covered.size >= 70,
      `${side} exported wrap covers ${covered.size}% of the frozen sleeve-to-glove interval`);
  }
});

test('R3 sleeves export localized diagonal cloth crests instead of circular ring bands', async () => {
  ensureCandidate();
  const paths=source().sleeveFoldPaths;
  for(const side of ['R','L']) {
    assert.equal(paths?.[side]?.length,3,`${side} needs three explicit, side-specific fold paths`);
    for(const fold of paths[side]) {
      assert.ok(['compression','tension'].includes(fold.kind));
      assert.equal(fold.stations?.length,3);
      assert.ok(fold.stations.every(([t,angle])=>Number.isFinite(t)&&t>=.3&&t<=.82&&
        Number.isFinite(angle)));
      assert.ok(Math.abs(fold.stations[0][1]-fold.stations[2][1])>=20,
        'a fold must progress diagonally instead of circling one sleeve ring');
      assert.ok(fold.widthMetres>=.020&&fold.widthMetres<=.055);
      assert.ok(fold.crestMetres>=.006&&fold.crestMetres<=.012);
      assert.ok(fold.troughMetres<=-.003&&fold.troughMetres>=-.006);
    }
  }
  const hands=await loadHands(candidate), rings=new Map();
  hands.scene.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const {position,uv}=mesh.geometry.attributes;
    for(let id=0;id<uv.count;id++) {
      const x=uv.getX(id)*1024,y=(1-uv.getY(id))*1024;
      if(x<9||x>247||y<9||y>247)continue;
      const row=Math.round(y);
      if(!rings.has(row))rings.set(row,[]);
      rings.get(row).push({point:vertex(position,id),u:(x-10)/236});
    }
  });
  const rows=[...rings].sort((a,b)=>a[0]-b[0]);
  assert.ok(rows.length>=10,'actual painted cloth needs axial sleeve rows');
  const knownT=[null,0,.15,.28,.40,.52,.60,.69,.77,.82];
  for(const side of ['R','L']) {
    const elbow=side==='R'?[.35,-.43,-.27]:[-.35,-.43,-.39];
    const wrist=side==='R'?[.205,-.285,-.48]:[.075,-.285,-.82];
    let proven=0;
    for(const fold of paths[side]) for(const [t,angle] of fold.stations) {
      const rowIndex=knownT.reduce((best,value,index)=>value===null?best:
        Math.abs(value-t)<Math.abs(knownT[best]-t)?index:best,1);
      const entries=rows[Math.round((rowIndex/9)*(rows.length-1))]?.[1]||[];
      const centre=elbow.map((value,axis)=>value+(wrist[axis]-value)*t);
      const otherElbow=side==='R'?[-.35,-.43,-.39]:[.35,-.43,-.27];
      const otherWrist=side==='R'?[.075,-.285,-.82]:[.205,-.285,-.48];
      const other=otherElbow.map((value,axis)=>value+(otherWrist[axis]-value)*t);
      const sidePoints=entries.filter(({point})=>distance(point,centre)<distance(point,other));
      const indexed=new Map();
      for(const item of sidePoints)indexed.set(Math.round(item.u*20)%20,item.point);
      if(indexed.size<18)continue;
      const ringCentre=[0,1].map(axis=>[...indexed.values()].reduce((sum,p)=>sum+p[axis],0)/indexed.size);
      const radial=j=>{
        const p=indexed.get((j+20)%20);
        return p?Math.hypot(p[0]-ringCentre[0],p[1]-ringCentre[1]):NaN;
      };
      const j=Math.round((((angle%360)+360)%360)/18)%20;
      const local=radial(j)-.5*(radial(j-2)+radial(j+2));
      if(Number.isFinite(local)&&local>=.0025)proven++;
    }
    assert.ok(proven>=4,`${side} exported sleeve has ${proven}/9 localized crests at authored stations`);
  }
});
